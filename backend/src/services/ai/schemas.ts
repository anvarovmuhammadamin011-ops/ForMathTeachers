import { z } from 'zod';

export const diagramBBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

export const aiQuestionSchema = z.object({
  questionNumber: z.number().int().min(1).max(9999),
  questionText: z.string().min(1),
  sourcePage: z.number().int().min(1),
  readable: z.boolean(),
  solution: z.string().default(''),
  finalAnswer: z.string().default(''),
  answerType: z.enum(['numeric', 'expression', 'set', 'text']).default('text'),
  options: z.array(z.string()).default([]),
  correctOptionIndex: z.number().int().min(0).max(3).default(0),
  diagramBBox: diagramBBoxSchema.nullish(),
  notes: z.string().nullish(),
});

export const aiExtractionSchema = z.object({
  questions: z.array(z.unknown()).default([]),
});

export const aiVerificationSchema = z.object({
  answers: z.array(
    z.object({
      questionNumber: z.number().int(),
      finalAnswer: z.string(),
      confidence: z.number().min(0).max(1).default(0.5),
      reasoning: z.string().default(''),
    }),
  ),
});

export const aiOptionsSchema = z.object({
  options: z.array(z.string()).min(4).max(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  solution: z.string().default(''),
});

export type AiQuestion = z.infer<typeof aiQuestionSchema>;
