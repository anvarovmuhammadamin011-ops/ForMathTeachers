import fs from 'node:fs/promises';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { config, ensureRuntimeDirs } from '../config.js';
import { assertAiConfigured } from './ai/client.js';
import { extractQuestions, generateOptions, independentSolve, shuffleOptions, type AiPage, type IndependentAnswer } from './ai/solver.js';
import type { AiQuestion } from './ai/schemas.js';
import { evaluateVerification, resolveCorrectIndex } from './verify/engine.js';
import { validateOptions } from './verify/math.js';
import { extractPdfText, ocrPage, renderPages } from './pdf/extract.js';
import type { JobStatus } from '@prisma/client';
import { sweepExpiredAttempts } from './attemptService.js';

const STAGE_PROGRESS: Record<JobStatus, number> = {
  QUEUED: 0,
  READING: 8,
  EXTRACTING: 22,
  SOLVING: 50,
  VERIFYING: 78,
  BUILDING: 92,
  COMPLETED: 100,
  FAILED: 100,
};

async function setJob(
  jobId: string,
  data: { status?: JobStatus; progress?: number; errorMessage?: string | null; pageCount?: number },
) {
  await prisma.pDFProcessingJob.update({
    where: { id: jobId },
    data: {
      ...data,
      ...(data.status ? { progress: data.progress ?? STAGE_PROGRESS[data.status] } : {}),
    },
  });
}

function cleanMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 900 ? `${message.slice(0, 900)}…` : message;
}

const PAGE_IMAGE_PREFIX = 'pages';

export async function enqueueProcessing(testId: string) {
  await prisma.pDFProcessingJob.updateMany({
    where: { testId },
    data: { status: 'QUEUED', progress: 0, errorMessage: null },
  });
  kickProcessor();
}

export async function processJob(jobId: string): Promise<void> {
  const job = await prisma.pDFProcessingJob.findUnique({
    where: { id: jobId },
    include: { test: true },
  });
  if (!job) return;
  if (job.status === 'COMPLETED' || job.status === 'FAILED') return;

  ensureRuntimeDirs();
  const jobDir = path.join(config.uploadsDir, PAGE_IMAGE_PREFIX, job.id);

  try {
    assertAiConfigured();
    await prisma.test.update({
      where: { id: job.testId },
      data: { status: 'PROCESSING' },
    });
    await prisma.question.deleteMany({ where: { testId: job.testId } });
    await setJob(job.id, { status: 'READING', progress: 3, errorMessage: null });

    // 1) PDF ni o'qish
    const buffer = await fs.readFile(job.filePath);
    if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new Error('Yuklangan fayl haqiqiy PDF emas.');
    }
    const extracted = await extractPdfText(buffer);
    if (extracted.pageCount === 0) throw new Error('PDF sahifalari topilmadi.');
    await setJob(job.id, {
      status: 'READING',
      progress: 12,
      pageCount: extracted.pageCount,
    });

    // 2) Sahifalarni rasmga aylantirish (diagrammalar va OCR uchun)
    const allPageNumbers = extracted.pages.map((page) => page.pageNumber);
    const images = await renderPages(job.filePath, allPageNumbers, jobDir, 1.7);
    await setJob(job.id, { status: 'EXTRACTING', progress: 20 });

    // 3) Skanerlangan sahifalarni OCR qilish
    const aiPages: AiPage[] = [];
    for (let index = 0; index < extracted.pages.length; index += 1) {
      const page = extracted.pages[index]!;
      const imagePath = images.get(page.pageNumber) ?? null;
      const isScanned = page.text.replace(/\s/g, '').length < 50;
      const needsVision = isScanned || page.hasImages;
      let ocrText = '';
      if (isScanned && config.ocr.enabled) {
        if (imagePath) {
          await setJob(job.id, {
            status: 'EXTRACTING',
            progress: 20 + Math.round((index / Math.max(1, extracted.pages.length)) * 10),
          });
          ocrText = await ocrPage(imagePath);
        }
      }
      aiPages.push({
        pageNumber: page.pageNumber,
        text: page.text,
        imagePath,
        ocrText,
        needsVision,
        hasImages: page.hasImages,
      });
    }

    // 4) AI orqali savollarni ajratish
    await setJob(job.id, { status: 'EXTRACTING', progress: 30 });
    const extraction = await extractQuestions(aiPages, config.sendPageImages, (fraction) => {
      void setJob(job.id, {
        status: 'EXTRACTING',
        progress: 30 + Math.round(fraction * 18),
      });
    });

    const questions = extraction.questions;
    if (questions.length === 0) throw new Error('AI hech qanday savol aniqlay olmadi.');

    // 5) Har bir savol uchun variantlar va yechimni tayyorlash
    await setJob(job.id, { status: 'SOLVING', progress: 50 });
    interface Prepared {
      ai: AiQuestion;
      options: string[];
      correctIndex: number;
      correctText: string;
      solution: string;
      optionsValid: boolean;
      optionNote: string;
      pageImagePath: string | null;
      diagramBBox: Prisma.InputJsonValue | undefined;
    }

    const prepared: Prepared[] = [];
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index]!;
      const pageImage = images.get(question.sourcePage) ?? null;
      const relativeImage = pageImage
        ? `${PAGE_IMAGE_PREFIX}/${job.id}/page-${question.sourcePage}.png`
        : null;

      let options = question.options.map((option) => String(option).trim()).filter(Boolean);
      let solution = question.solution.trim();
      let correctHint = question.correctOptionIndex;
      let optionNote = '';

      let check = validateOptions(options, question.finalAnswer);
      if (options.length !== 4 || !check.ok || check.correctIndexes.length !== 1) {
        try {
          const regenerated = await generateOptions({
            questionText: question.questionText,
            solution,
            correctAnswer: question.finalAnswer,
            imagePath: pageImage,
          });
          const regeneratedCheck = validateOptions(
            regenerated.options,
            question.finalAnswer,
          );
          if (regeneratedCheck.correctIndexes.length === 1) {
            options = regenerated.options;
            correctHint = regeneratedCheck.correctIndexes[0]!;
            if (!solution) solution = regenerated.solution;
            optionNote = 'Variantlar AI tomonidan qayta yaratildi.';
            check = regeneratedCheck;
          } else {
            optionNote = 'Variantlarni avtomatik yaratib bo‘lmadi — qo‘lda tekshiring.';
          }
        } catch (error) {
          optionNote = `Variantlarni avtomatik yaratib bo‘lmadi: ${cleanMessage(error)}`;
        }
      }

      const resolved = resolveCorrectIndex(options, question.finalAnswer, correctHint);
      const correctIndex =
        check.correctIndexes.length === 1 ? check.correctIndexes[0]! : resolved.index;
      const correctText = options[correctIndex] ?? question.finalAnswer;
      const shuffled = shuffleOptions(options, correctIndex);

      let diagramBBox: Prisma.InputJsonValue | undefined;
      if (
        question.diagramBBox &&
        relativeImage &&
        question.diagramBBox.w > 0.01 &&
        question.diagramBBox.h > 0.01
      ) {
        diagramBBox = question.diagramBBox as Prisma.InputJsonValue;
      }

      prepared.push({
        ai: question,
        options: shuffled.options,
        correctIndex: shuffled.correctIndex,
        correctText,
        solution: solution || 'Yechim AI tomonidan keltirilmagan.',
        optionsValid: validateOptions(shuffled.options, correctText).ok,
        optionNote: [resolved.note, optionNote].filter(Boolean).join(' '),
        pageImagePath: relativeImage,
        diagramBBox,
      });

      if (index % 3 === 0) {
        await setJob(job.id, {
          status: 'SOLVING',
          progress: 50 + Math.round(((index + 1) / questions.length) * 20),
        });
      }
    }

    // 6) Mustaqil AI tekshiruvi
    await setJob(job.id, { status: 'VERIFYING', progress: 72 });
    const needsIndependent = prepared
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => item.options.length === 4 && item.correctText);
    const independent = await independentSolve(
      needsIndependent.map(({ item }, id) => ({
        id,
        text: item.ai.questionText,
      })),
    );
    const independentByIndex = new Map<number, IndependentAnswer>();
    needsIndependent.forEach(({ originalIndex }, id) => {
      const answer = independent.get(id);
      if (answer !== undefined) independentByIndex.set(originalIndex, answer);
    });

    // 7) Bazaga saqlash
    await setJob(job.id, { status: 'BUILDING', progress: 90 });
    const rows: Prisma.QuestionCreateManyInput[] = prepared.map((item, index) => {
      const independentAnswer = independentByIndex.get(index);
      let status: 'VERIFIED' | 'NEEDS_REVIEW' = 'NEEDS_REVIEW';
      let method = 'unverified';
      let note = '';

      if (!item.ai.readable) {
        note = 'Savol PDF da to‘liq o‘qilmadi. Iltimos, matnni tekshirib to‘ldiring.';
      } else if (!item.optionsValid) {
        note = `Variantlar yaroqli emas. ${item.optionNote}`.trim();
      } else {
        const outcome = evaluateVerification({
          questionText: item.ai.questionText,
          correctAnswer: item.correctText,
          options: item.options,
          correctIndex: item.correctIndex,
          independent: independentAnswer,
        });
        status = outcome.status;
        method = outcome.method;
        note = [outcome.note, item.optionNote].filter(Boolean).join(' ');
      }

      return {
        testId: job.testId,
        questionNumber: item.ai.questionNumber || index + 1,
        questionText: item.ai.questionText.trim(),
        options: item.options,
        correctAnswer: item.correctIndex,
        solution: item.solution,
        verificationStatus: status,
        verificationMethod: method,
        verificationNote: note || null,
        approvalStatus: 'PENDING',
        sourcePage: item.ai.sourcePage,
        order: index + 1,
        pageImagePath: item.pageImagePath,
        diagramBBox: item.diagramBBox,
      };
    });

    // AI ba'zan bir xil savolni takrorlashi mumkin — variantlari bilan bir xillarni olib tashlaymiz.
    const uniqueRows: Prisma.QuestionCreateManyInput[] = [];
    for (const row of rows) {
      const text = String(row.questionText).replace(/\s+/g, ' ').trim().toLowerCase();
      const duplicate = uniqueRows.some(
        (existing) =>
          String(existing.questionText).replace(/\s+/g, ' ').trim().toLowerCase() === text,
      );
      if (!duplicate) uniqueRows.push(row);
    }
    uniqueRows.forEach((row, index) => {
      row.order = index + 1;
    });

    await prisma.$transaction([
      prisma.question.createMany({ data: uniqueRows }),
      prisma.test.update({
        where: { id: job.testId },
        data: { status: 'READY' },
      }),
      prisma.pDFProcessingJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          errorMessage:
            extraction.warnings.length > 0
              ? `Ba'zi sahifalarni o‘qishda ogohlantirish: ${extraction.warnings[0]}`
              : null,
        },
      }),
    ]);

    console.log(
      `[ai] Test ${job.testId}: ${uniqueRows.length} savol tayyorlandi, ` +
        `${uniqueRows.filter((row) => row.verificationStatus === 'VERIFIED').length} tasdiqlangan.`,
    );
  } catch (error) {
    console.error('[ai:job] xato:', error);
    const message = cleanMessage(error);
    await prisma.$transaction([
      prisma.pDFProcessingJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', progress: 100, errorMessage: message },
      }),
      prisma.test.update({ where: { id: job.testId }, data: { status: 'DRAFT' } }),
    ]);
  }
}

let processorRunning = false;

async function runQueue() {
  if (processorRunning) return;
  processorRunning = true;
  try {
    for (;;) {
      const job = await prisma.pDFProcessingJob.findFirst({
        where: { status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (!job) break;
      await processJob(job.id);
    }
  } catch (error) {
    console.error('[ai:queue] xato:', error);
  } finally {
    processorRunning = false;
  }
}

export function kickProcessor() {
  if (processorRunning) return;
  setTimeout(() => {
    void runQueue();
  }, 50);
}

export async function startBackgroundWorkers() {
  // Server qayta ishga tushganda yarim qolgan ishlarni davom ettiramiz.
  await prisma.pDFProcessingJob.updateMany({
    where: { status: { in: ['READING', 'EXTRACTING', 'SOLVING', 'VERIFYING', 'BUILDING'] } },
    data: { status: 'QUEUED', progress: 0 },
  });
  kickProcessor();
  setInterval(() => kickProcessor(), 15_000).unref();
  setInterval(() => {
    void sweepExpiredAttempts().catch((error) =>
      console.error('[attempt:sweep] xato:', error),
    );
  }, 30_000).unref();
}
