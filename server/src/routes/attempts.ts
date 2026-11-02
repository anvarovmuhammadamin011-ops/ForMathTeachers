import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/errors.js';
import { parseBody } from '../lib/validation.js';
import { requireAuth, requireStudent } from '../middleware/auth.js';
import {
  getAttemptForStudent,
  getAttemptResult,
  saveAnswer,
  startAttempt,
  submitAttempt,
} from '../services/attemptService.js';

export const attemptRouter = Router();

const answerSchema = z.object({
  questionId: z.string().min(1),
  selectedOption: z.union([z.number().int().min(0).max(3), z.null()]),
});

attemptRouter.post(
  '/tests/:testId/start',
  requireStudent,
  asyncHandler(async (req, res) => {
    const attempt = await startAttempt(req.auth!.userId, req.params.testId);
    res.status(201).json({
      attemptId: attempt.id,
      expiresAt: attempt.expiresAt,
      startedAt: attempt.startedAt,
    });
  }),
);

attemptRouter.get(
  '/attempts/:id',
  requireStudent,
  asyncHandler(async (req, res) => {
    res.json(await getAttemptForStudent(req.auth!.userId, req.params.id));
  }),
);

attemptRouter.put(
  '/attempts/:id/answers',
  requireStudent,
  asyncHandler(async (req, res) => {
    const body = parseBody(answerSchema, req.body);
    const result = await saveAnswer(
      req.auth!.userId,
      req.params.id,
      body.questionId,
      body.selectedOption,
    );
    res.json(result);
  }),
);

attemptRouter.post(
  '/attempts/:id/submit',
  requireStudent,
  asyncHandler(async (req, res) => {
    const attempt = await submitAttempt(req.auth!.userId, req.params.id);
    res.json({
      attemptId: attempt.id,
      status: attempt.status,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unansweredCount: attempt.unansweredCount,
      scorePercentage: attempt.scorePercentage,
      timeSpentSeconds: attempt.timeSpentSeconds,
      submittedAt: attempt.submittedAt,
    });
  }),
);

attemptRouter.get(
  '/attempts/:id/result',
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    res.json(
      await getAttemptResult(
        { id: auth.userId, role: auth.role as 'TEACHER' | 'STUDENT' },
        req.params.id,
      ),
    );
  }),
);
