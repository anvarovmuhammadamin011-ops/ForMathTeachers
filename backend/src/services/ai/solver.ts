import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { loadImage, createCanvas } from '@napi-rs/canvas';
import { config } from '../../config.js';
import { chatCompletion, extractJsonObject, type ChatMessage } from './client.js';
import {
  EXTRACTION_SYSTEM,
  OPTIONS_SYSTEM,
  VERIFY_SYSTEM,
  extractionUserMessage,
  optionsUserMessage,
  verifyUserMessage,
} from './prompts.js';
import { aiQuestionSchema, type AiQuestion } from './schemas.js';

export interface AiPage {
  pageNumber: number;
  text: string;
  imagePath: string | null;
  ocrText: string;
  needsVision: boolean;
  hasImages: boolean;
}

export interface ExtractionResult {
  questions: AiQuestion[];
  warnings: string[];
}

async function imageDataUrl(imagePath: string, maxWidth = 1500): Promise<string> {
  const image = await loadImage(imagePath);
  const scale = Math.min(1, maxWidth / image.width);
  if (scale >= 1) {
    const buffer = await fs.readFile(imagePath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }
  const canvas = createCanvas(Math.round(image.width * scale), Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const jpeg = await canvas.encode('jpeg', 82);
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

function chunkPages(pages: AiPage[], sendImages: boolean): AiPage[][] {
  const chunks: AiPage[][] = [];
  let current: AiPage[] = [];
  let chars = 0;
  let images = 0;

  for (const page of pages) {
    const pageChars = page.text.length + page.ocrText.length;
    const imageNeeded = sendImages && page.imagePath && (page.needsVision || page.hasImages);
    if (
      current.length > 0 &&
      (current.length >= 4 || chars + pageChars > 13_000 || images + (imageNeeded ? 1 : 0) > 4)
    ) {
      chunks.push(current);
      current = [];
      chars = 0;
      images = 0;
    }
    current.push(page);
    chars += pageChars;
    if (imageNeeded) images += 1;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function extractChunk(
  chunk: AiPage[],
  sendImages: boolean,
  retry: boolean,
): Promise<AiQuestion[]> {
  const textBlocks = chunk.map((page) => ({
    page: page.pageNumber,
    text: page.text,
    hint: page.needsVision ? page.ocrText : '',
  }));
  const attachImages =
    sendImages && chunk.some((page) => page.imagePath && (page.needsVision || page.hasImages));
  const content: Array<
    { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'high' } }
  > = [
    {
      type: 'text',
      text: extractionUserMessage({
        pageNumbers: chunk.map((page) => page.pageNumber),
        textBlocks,
        imageCount: sendImages ? chunk.filter((page) => page.needsVision || page.hasImages).length : 0,
      }),
    },
  ];

  if (sendImages) {
    for (const page of chunk) {
      if (!page.imagePath) continue;
      if (!(page.needsVision || page.hasImages)) continue;
      content.push({ type: 'text', text: `PAGE ${page.pageNumber} IMAGE:` });
      content.push({
        type: 'image_url',
        image_url: { url: await imageDataUrl(page.imagePath), detail: 'high' },
      });
    }
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: EXTRACTION_SYSTEM },
    {
      role: 'user',
      content: content.length === 1 ? (content[0] as { text: string }).text : content,
    },
  ];
  if (retry) {
    messages.push({
      role: 'user',
      content:
        'Your previous response did not contain valid JSON questions. Re-read the pages and return ONLY the JSON object described in the system prompt, extracting every question.',
    });
  }

  const raw = await chatCompletion({
    messages,
    // Rasm yuborilganda AI_VISION_MODEL (bo'sh bo'lsa asosiy model) ishlatiladi.
    model: attachImages ? config.ai.visionModel : undefined,
    json: true,
  });
  const parsed = extractJsonObject<{ questions?: unknown[] }>(raw);
  const questions: AiQuestion[] = [];
  for (const candidate of parsed.questions ?? []) {
    const result = aiQuestionSchema.safeParse(candidate);
    if (result.success) {
      questions.push(result.data);
    } else {
      console.warn('[ai] savol sxemaga mos emas:', result.error.issues[0]?.message);
    }
  }
  return questions;
}

export async function extractQuestions(
  pages: AiPage[],
  sendImages: boolean,
  onProgress: (fraction: number) => void,
): Promise<ExtractionResult> {
  const chunks = chunkPages(pages, sendImages);
  const warnings: string[] = [];
  const all: AiQuestion[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]!;
    let questions: AiQuestion[] = [];
    try {
      questions = await extractChunk(chunk, sendImages, false);
      if (questions.length === 0 && chunk.some((page) => page.text.trim().length > 20)) {
        questions = await extractChunk(chunk, sendImages, true);
      }
    } catch (error) {
      const message = (error as Error).message;
      warnings.push(`${chunk.map((page) => page.pageNumber).join(', ')}-betlar: ${message}`);
    }

    for (const question of questions) {
      const key = `${question.sourcePage}:${question.questionText.replace(/\s+/g, '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(question);
    }
    onProgress((index + 1) / Math.max(1, chunks.length));
  }

  if (all.length === 0) {
    const detail = warnings.length > 0 ? ` Sabab: ${warnings[0]}` : '';
    throw new Error(
      `PDF ichidan savollar aniqlanmadi. PDF matematika savollaridan iborat ekanini tekshiring.${detail}`,
    );
  }

  // Sahifa va dastlabki tartib bo'yicha saralash
  all.sort((a, b) => a.sourcePage - b.sourcePage || a.questionNumber - b.questionNumber);
  return { questions: all, warnings };
}

export interface IndependentAnswer {
  finalAnswer: string;
  confidence: number;
  reasoning: string;
}

export async function independentSolve(
  items: Array<{ id: number; text: string }>,
): Promise<Map<number, IndependentAnswer>> {
  const result = new Map<number, IndependentAnswer>();
  const batches: Array<Array<{ id: number; text: string }>> = [];
  let current: Array<{ id: number; text: string }> = [];
  let size = 0;
  for (const item of items) {
    if (current.length > 0 && (current.length >= 6 || size + item.text.length > 12_000)) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.text.length;
  }
  if (current.length > 0) batches.push(current);

  for (const batch of batches) {
    try {
      const raw = await chatCompletion({
        messages: [
          { role: 'system', content: VERIFY_SYSTEM },
          { role: 'user', content: verifyUserMessage(batch) },
        ],
        json: true,
        temperature: 0,
      });
      const parsed = extractJsonObject<{
        answers?: Array<{ id?: number; finalAnswer?: string; confidence?: number; reasoning?: string }>;
      }>(raw);
      for (const answer of parsed.answers ?? []) {
        if (typeof answer.id !== 'number' || typeof answer.finalAnswer !== 'string') continue;
        result.set(answer.id, {
          finalAnswer: answer.finalAnswer,
          confidence: typeof answer.confidence === 'number' ? answer.confidence : 0.5,
          reasoning: answer.reasoning ?? '',
        });
      }
    } catch (error) {
      console.warn('[ai:verify] mustaqil tekshiruv amalga oshmadi:', (error as Error).message);
    }
  }
  return result;
}

export interface GeneratedOptions {
  options: string[];
  correctOptionIndex: number;
  solution: string;
}

export async function generateOptions(input: {
  questionText: string;
  solution: string;
  correctAnswer: string;
  imagePath?: string | null;
}): Promise<GeneratedOptions> {
  const content:
    | string
    | Array<
        { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'high' } }
      > = [
    {
      type: 'text',
      text: optionsUserMessage({
        questionText: input.questionText,
        solution: input.solution,
        correctAnswer: input.correctAnswer,
      }),
    },
  ];
  if (input.imagePath) {
    content.push({
      type: 'image_url',
      image_url: { url: await imageDataUrl(input.imagePath), detail: 'high' },
    });
  }

  const raw = await chatCompletion({
    messages: [
      { role: 'system', content: OPTIONS_SYSTEM },
      { role: 'user', content },
    ],
    model: input.imagePath ? config.ai.visionModel : undefined,
    json: true,
    temperature: 0.4,
  });
  const parsed = extractJsonObject<{
    options?: unknown;
    correctOptionIndex?: unknown;
    solution?: unknown;
  }>(raw);
  const options = Array.isArray(parsed.options)
    ? parsed.options.map((option) => String(option).trim())
    : [];
  if (options.length !== 4 || options.some((option) => !option)) {
    throw new Error('AI to‘rtta to‘g‘ri variant qaytarmadi.');
  }
  const hinted =
    typeof parsed.correctOptionIndex === 'number' &&
    parsed.correctOptionIndex >= 0 &&
    parsed.correctOptionIndex <= 3
      ? parsed.correctOptionIndex
      : 0;
  return {
    options,
    correctOptionIndex: hinted,
    solution: typeof parsed.solution === 'string' ? parsed.solution : input.solution,
  };
}

/** Variantlarni aralashtirib, to'g'ri javob indeksini qayta hisoblaydi. */
export function shuffleOptions(
  options: string[],
  correctIndex: number,
): { options: string[]; correctIndex: number } {
  const items = options.map((text, index) => ({ text, isCorrect: index === correctIndex }));
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return {
    options: items.map((item) => item.text),
    correctIndex: items.findIndex((item) => item.isCorrect),
  };
}
