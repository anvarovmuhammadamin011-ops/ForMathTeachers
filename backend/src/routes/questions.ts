import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, badRequest, conflict, notFound } from '../lib/errors.js';
import { parseBody } from '../lib/validation.js';
import { requireTeacher } from '../middleware/auth.js';
import { generateOptions, shuffleOptions } from '../services/ai/solver.js';
import { answersEquivalent, validateOptions } from '../services/verify/math.js';
import { config } from '../config.js';
import path from 'node:path';

async function ownedQuestion(teacherId: string, questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { test: true },
  });
  if (!question || question.test.teacherId !== teacherId) throw notFound('Savol topilmadi.');
  if (question.test.status === 'PUBLISHED') {
    throw conflict('Nashr qilingan testdagi savollarni tahrirlash mumkin emas.');
  }
  return question;
}

export const questionRouter = Router();

questionRouter.use(requireTeacher);

const updateQuestionSchema = z.object({
  questionText: z.string().trim().min(1, 'Savol matni bo‘sh bo‘lmasligi kerak.'),
  options: z.array(z.string().trim().min(1, 'Variant bo‘sh bo‘lmasligi kerak.')).length(4),
  correctAnswer: z.coerce.number().int().min(0).max(3),
  solution: z.string().optional(),
});

questionRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const question = await ownedQuestion(teacherId, req.params.id);
    const body = parseBody(updateQuestionSchema, req.body);

    const correctText = body.options[body.correctAnswer] ?? '';
    const validation = validateOptions(body.options, correctText);
    if (!validation.ok) {
      throw badRequest(`Variantlar yaroqsiz: ${validation.issues[0]}`);
    }
    // correctIndex haqiqatan ham to'g'ri variantga to'g'ri kelishini tekshiramiz
    const matches = body.options
      .map((option, index) => (answersEquivalent(option, correctText) ? index : -1))
      .filter((index) => index >= 0);
    if (matches.length !== 1) {
      throw badRequest('Faqat bitta variant to‘g‘ri javobga mos kelishi kerak.');
    }

    const updated = await prisma.question.update({
      where: { id: question.id },
      data: {
        questionText: body.questionText,
        options: body.options,
        correctAnswer: matches[0]!,
        solution: body.solution ?? question.solution,
        approvalStatus: 'PENDING',
        verificationStatus: 'NEEDS_REVIEW',
        verificationNote: 'O‘qituvchi tomonidan tahrirlandi — qayta tekshirish talab qilinadi.',
      },
    });

    res.json({
      question: {
        id: updated.id,
        options: updated.options,
        correctAnswer: updated.correctAnswer,
        approvalStatus: updated.approvalStatus,
        verificationStatus: updated.verificationStatus,
        verificationNote: updated.verificationNote,
      },
    });
  }),
);

questionRouter.post(
  '/:id/regenerate',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const question = await ownedQuestion(teacherId, req.params.id);

    let imagePath: string | null = null;
    if (question.pageImagePath) {
      imagePath = path.join(config.uploadsDir, question.pageImagePath.replace(/^\//, ''));
    }

    const generated = await generateOptions({
      questionText: question.questionText,
      solution: question.solution,
      correctAnswer: question.options[question.correctAnswer] ?? '',
      imagePath,
    });

    const expectedAnswer = question.options[question.correctAnswer] ?? '';
    const validation = validateOptions(generated.options, expectedAnswer);
    if (!validation.ok || validation.correctIndexes.length !== 1) {
      throw badRequest(
        'AI yangi variantlarni to‘g‘ri javobga moslab yarata olmadi. Qayta urinib ko‘ring.',
      );
    }
    generated.correctOptionIndex = validation.correctIndexes[0]!;

    const shuffled = shuffleOptions(generated.options, generated.correctOptionIndex);

    const updated = await prisma.question.update({
      where: { id: question.id },
      data: {
        options: shuffled.options,
        correctAnswer: shuffled.correctIndex,
        solution: generated.solution || question.solution,
        approvalStatus: 'PENDING',
        verificationStatus: 'NEEDS_REVIEW',
        verificationNote: 'Variantlar qayta yaratildi — tekshirib tasdiqlang.',
      },
    });

    res.json({
      options: updated.options,
      correctAnswer: updated.correctAnswer,
      solution: updated.solution,
    });
  }),
);

questionRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const question = await ownedQuestion(teacherId, req.params.id);
    await prisma.question.delete({ where: { id: question.id } });
    // Tartibni qayta tiklash
    const remaining = await prisma.question.findMany({
      where: { testId: question.testId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    await Promise.all(
      remaining.map((item, index) =>
        prisma.question.update({ where: { id: item.id }, data: { order: index + 1 } }),
      ),
    );
    res.json({ ok: true });
  }),
);

questionRouter.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const question = await ownedQuestion(teacherId, req.params.id);
    const correctText = question.options[question.correctAnswer];
    const validation = validateOptions(question.options, correctText ?? '');
    if (!validation.ok) {
      throw badRequest('Tasdiqlash uchun variantlar yaroqli bo‘lishi kerak.');
    }
    const updated = await prisma.question.update({
      where: { id: question.id },
      data: { approvalStatus: 'APPROVED' },
    });
    res.json({ ok: true, approvalStatus: updated.approvalStatus });
  }),
);

questionRouter.post(
  '/:id/unapprove',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const question = await ownedQuestion(teacherId, req.params.id);
    const updated = await prisma.question.update({
      where: { id: question.id },
      data: { approvalStatus: 'PENDING' },
    });
    res.json({ ok: true, approvalStatus: updated.approvalStatus });
  }),
);
