import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db.js';
import { aiConfigured, config, ensureRuntimeDirs } from '../config.js';
import { ApiError, asyncHandler, badRequest, conflict, notFound } from '../lib/errors.js';
import { parseBody } from '../lib/validation.js';
import { requireTeacher } from '../middleware/auth.js';
import { enqueueProcessing } from '../services/processor.js';
import { testRanking } from '../services/rankingService.js';
import { validateOptions } from '../services/verify/math.js';

export const testRouter = Router();

testRouter.use(requireTeacher);

ensureRuntimeDirs();

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(config.uploadsDir, 'pdfs'),
    filename: (_req, _file, callback) => {
      callback(null, `${crypto.randomUUID()}.pdf`);
    },
  }),
  limits: { fileSize: config.maxPdfMb * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/octet-stream' ||
      file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      callback(new ApiError(400, 'INVALID_PDF', 'Faqat PDF fayl yuklash mumkin.'));
      return;
    }
    callback(null, true);
  },
});

const createTestSchema = z.object({
  title: z.string().trim().min(2, 'Test nomini kiriting.').max(120, 'Test nomi juda uzun.'),
  classroomId: z.string().min(1, 'Sinfni tanlang.'),
  durationMinutes: z.coerce
    .number()
    .int('Vaqt butun soniyada bo‘lishi kerak.')
    .min(1, 'Test vaqti kamida 1 daqiqa.')
    .max(240, 'Test vaqti 240 daqiqadan oshmasligi kerak.'),
});

async function ownedClassroom(teacherId: string, classroomId: string) {
  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, teacherId },
  });
  if (!classroom) throw notFound('Sinf topilmadi.');
  return classroom;
}

async function ownedTest(teacherId: string, testId: string) {
  const test = await prisma.test.findFirst({
    where: { id: testId, teacherId },
    include: {
      classroom: { select: { id: true, name: true } },
      questions: { orderBy: { order: 'asc' } },
      pdfJob: true,
    },
  });
  if (!test) throw notFound('Test topilmadi.');
  return test;
}

function serializeQuestion(question: {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  solution: string;
  verificationStatus: string;
  verificationMethod: string | null;
  verificationNote: string | null;
  approvalStatus: string;
  sourcePage: number;
  order: number;
  pageImagePath: string | null;
  diagramBBox: unknown;
}) {
  return {
    id: question.id,
    questionNumber: question.questionNumber,
    questionText: question.questionText,
    options: question.options,
    correctAnswer: question.correctAnswer,
    solution: question.solution,
    verificationStatus: question.verificationStatus,
    verificationMethod: question.verificationMethod,
    verificationNote: question.verificationNote,
    approvalStatus: question.approvalStatus,
    sourcePage: question.sourcePage,
    order: question.order,
    pageImageUrl: question.pageImagePath
      ? `/api/files/${question.pageImagePath.replace(/\\/g, '/')}`
      : null,
    diagramBBox: question.diagramBBox,
  };
}

testRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const classroomId =
      typeof req.query.classroomId === 'string' ? req.query.classroomId : undefined;
    const tests = await prisma.test.findMany({
      where: { teacherId, ...(classroomId ? { classroomId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        classroom: { select: { id: true, name: true } },
        questions: { select: { approvalStatus: true, verificationStatus: true } },
        _count: { select: { attempts: true } },
        pdfJob: { select: { status: true, progress: true, errorMessage: true } },
      },
    });

    res.json({
      tests: tests.map((test) => ({
        id: test.id,
        title: test.title,
        status: test.status,
        classroom: test.classroom,
        durationMinutes: test.durationMinutes,
        questionCount: test.questions.length,
        approvedCount: test.questions.filter((question) => question.approvalStatus === 'APPROVED')
          .length,
        verifiedCount: test.questions.filter(
          (question) => question.verificationStatus === 'VERIFIED',
        ).length,
        attemptCount: test._count.attempts,
        job: test.pdfJob
          ? {
              status: test.pdfJob.status,
              progress: test.pdfJob.progress,
              errorMessage: test.pdfJob.errorMessage,
            }
          : null,
        createdAt: test.createdAt,
        publishedAt: test.publishedAt,
      })),
    });
  }),
);

testRouter.post(
  '/',
  upload.single('pdf'),
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const file = req.file;
    const cleanup = async () => {
      if (file) await fs.unlink(file.path).catch(() => undefined);
    };

    try {
      if (!file) throw badRequest('PDF faylni yuklang.');
      const body = parseBody(createTestSchema, req.body);
      await ownedClassroom(teacherId, body.classroomId);
      if (!aiConfigured) {
        throw new ApiError(
          503,
          'AI_NOT_CONFIGURED',
          'AI xizmati sozlanmagan. backend/.env faylida AI_API_KEY ni kiriting — usiz PDF konvertatsiyasi ishlamaydi.',
        );
      }

      const header = Buffer.alloc(5);
      const handle = await fs.open(file.path, 'r');
      try {
        await handle.read(header, 0, 5, 0);
      } finally {
        await handle.close();
      }
      if (header.toString('latin1') !== '%PDF-') {
        throw new ApiError(400, 'INVALID_PDF', 'Yuklangan fayl haqiqiy PDF emas.');
      }

      const { test, job } = await prisma.$transaction(async (tx) => {
        const createdTest = await tx.test.create({
          data: {
            title: body.title,
            teacherId,
            classroomId: body.classroomId,
            durationMinutes: body.durationMinutes,
            status: 'DRAFT',
          },
        });
        const createdJob = await tx.pDFProcessingJob.create({
          data: {
            teacherId,
            testId: createdTest.id,
            filePath: file.path,
            status: 'QUEUED',
          },
        });
        return { test: createdTest, job: createdJob };
      });

      enqueueProcessing(test.id);
      res.status(201).json({ testId: test.id, jobId: job.id });
    } catch (error) {
      await cleanup();
      throw error;
    }
  }),
);

testRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const test = await ownedTest(teacherId, req.params.id);
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true },
    });
    res.json({
      test: {
        id: test.id,
        title: test.title,
        status: test.status,
        durationMinutes: test.durationMinutes,
        classroom: test.classroom,
        createdAt: test.createdAt,
        publishedAt: test.publishedAt,
      },
      job: test.pdfJob
        ? {
            id: test.pdfJob.id,
            status: test.pdfJob.status,
            progress: test.pdfJob.progress,
            pageCount: test.pdfJob.pageCount,
            errorMessage: test.pdfJob.errorMessage,
          }
        : null,
      questions: test.questions.map(serializeQuestion),
      classrooms,
      summary: {
        total: test.questions.length,
        verified: test.questions.filter((q) => q.verificationStatus === 'VERIFIED').length,
        needsReview: test.questions.filter((q) => q.verificationStatus === 'NEEDS_REVIEW').length,
        approved: test.questions.filter((q) => q.approvalStatus === 'APPROVED').length,
      },
    });
  }),
);

testRouter.get(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const test = await prisma.test.findFirst({
      where: { id: req.params.id, teacherId },
      include: {
        pdfJob: true,
        questions: {
          select: { verificationStatus: true, approvalStatus: true },
        },
      },
    });
    if (!test) throw notFound('Test topilmadi.');
    res.json({
      status: test.status,
      job: test.pdfJob
        ? {
            status: test.pdfJob.status,
            progress: test.pdfJob.progress,
            pageCount: test.pdfJob.pageCount,
            errorMessage: test.pdfJob.errorMessage,
          }
        : null,
      summary: {
        total: test.questions.length,
        verified: test.questions.filter((q) => q.verificationStatus === 'VERIFIED').length,
        needsReview: test.questions.filter((q) => q.verificationStatus === 'NEEDS_REVIEW').length,
        approved: test.questions.filter((q) => q.approvalStatus === 'APPROVED').length,
      },
    });
  }),
);

testRouter.post(
  '/:id/retry',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const test = await ownedTest(teacherId, req.params.id);
    if (test.status === 'PUBLISHED') throw conflict('Nashr qilingan testni qayta ishga tushirib bo‘lmaydi.');
    if (!test.pdfJob) throw badRequest('Bu test uchun PDF yuklanmagan.');
    if (!['FAILED', 'COMPLETED'].includes(test.pdfJob.status)) {
      throw conflict('PDF qayta ishlanmoqda. Birozdan so‘ng qayta urinib ko‘ring.');
    }
    if (!aiConfigured) {
      throw new ApiError(503, 'AI_NOT_CONFIGURED', 'AI_API_KEY sozlanmagan.');
    }
    await enqueueProcessing(test.id);
    res.json({ ok: true });
  }),
);

testRouter.patch(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const body = parseBody(
      z.object({ classroomId: z.string().optional() }),
      req.body ?? {},
    );
    const test = await ownedTest(teacherId, req.params.id);
    if (test.status === 'PUBLISHED') throw conflict('Test allaqachon nashr qilingan.');

    if (body.classroomId && body.classroomId !== test.classroomId) {
      await ownedClassroom(teacherId, body.classroomId);
    }

    const approved = test.questions.filter(
      (question) => question.approvalStatus === 'APPROVED',
    );
    if (approved.length === 0) {
      throw badRequest('Nashr qilish uchun kamida bitta savolni tasdiqlang.');
    }

    for (const question of approved) {
      const correctText = question.options[question.correctAnswer];
      const validation = validateOptions(question.options, correctText ?? '');
      if (!question.questionText.trim() || !validation.ok || correctText === undefined) {
        throw badRequest(
          `Savol ${question.questionNumber}: to‘g‘ri javob kaliti yaroqli emas. ${
            validation.issues[0] ?? 'Variantlarni tekshiring.'
          }`,
        );
      }
    }

    const updated = await prisma.test.update({
      where: { id: test.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        ...(body.classroomId ? { classroomId: body.classroomId } : {}),
      },
      include: { classroom: { select: { id: true, name: true } } },
    });

    res.json({
      test: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        classroom: updated.classroom,
        publishedAt: updated.publishedAt,
      },
      approvedCount: approved.length,
    });
  }),
);

testRouter.get(
  '/:id/results',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const test = await ownedTest(teacherId, req.params.id);
    const ranking = await testRanking(test.id);
    const attempts = await prisma.testAttempt.findMany({
      where: { testId: test.id },
      include: {
        student: { select: { firstName: true, lastName: true, username: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    const submitted = attempts.filter((attempt) => attempt.status === 'SUBMITTED');
    const totalScore = submitted.reduce((sum, attempt) => sum + attempt.scorePercentage, 0);
    res.json({
      test: {
        id: test.id,
        title: test.title,
        status: test.status,
        classroom: test.classroom,
        durationMinutes: test.durationMinutes,
        questionCount: test.questions.filter((q) => q.approvalStatus === 'APPROVED').length,
      },
      stats: {
        submissions: submitted.length,
        inProgress: attempts.length - submitted.length,
        averageScore:
          submitted.length > 0 ? Math.round((totalScore / submitted.length) * 10) / 10 : 0,
        highestScore:
          submitted.length > 0
            ? Math.max(...submitted.map((attempt) => attempt.scorePercentage))
            : 0,
      },
      ranking: ranking.rows,
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        studentName: `${attempt.student.firstName} ${attempt.student.lastName}`,
        username: attempt.student.username,
        status: attempt.status,
        scorePercentage: attempt.scorePercentage,
        correctCount: attempt.correctCount,
        incorrectCount: attempt.incorrectCount,
        unansweredCount: attempt.unansweredCount,
        timeSpentSeconds: attempt.timeSpentSeconds,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        rank: ranking.rows.find((row) => row.studentId === attempt.studentId)?.rank ?? null,
      })),
    });
  }),
);

testRouter.get(
  '/:id/ranking',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    await ownedTest(teacherId, req.params.id);
    res.json(await testRanking(req.params.id));
  }),
);
