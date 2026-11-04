import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadRootEnv } from './lib/loadEnv.js';

// Kanonik `.env` fayli `backend/.env` da joylashgan.
loadRootEnv();

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** Backend loyihasining ildiz papkasi (`backend/`). */
export const backendRoot = path.resolve(moduleDir, '..');

function int(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const isProduction = process.env.NODE_ENV === 'production';

const sessionSecret = process.env.SESSION_SECRET ?? '';
if (isProduction && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET production uchun kamida 32 belgidan iborat bo‘lishi kerak.');
}

export const config = {
  isProduction,
  port: int(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  sessionSecret: sessionSecret || 'mathtest-ai-dev-secret-do-not-use-in-production',
  sessionCookie: 'mathtest_session',
  sessionDays: 7,
  uploadsDir: path.join(backendRoot, 'uploads'),
  ai: {
    apiKey: process.env.AI_API_KEY?.trim() ?? '',
    baseUrl: (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.AI_MODEL?.trim() || 'gpt-4o',
    visionModel: process.env.AI_VISION_MODEL?.trim() || process.env.AI_MODEL?.trim() || 'gpt-4o',
    timeoutMs: int(process.env.AI_TIMEOUT_MS, 180_000),
  },
  ocr: {
    enabled: bool(process.env.OCR_ENABLED, true),
    language: process.env.OCR_LANGUAGE ?? 'eng',
  },
  sendPageImages: bool(process.env.AI_SEND_PAGE_IMAGES, true),
  maxPdfMb: int(process.env.MAX_PDF_MB, 30),
} as const;

export const aiConfigured = config.ai.apiKey.length > 0;

export function ensureRuntimeDirs() {
  for (const dir of [config.uploadsDir, path.join(config.uploadsDir, 'pdfs'), path.join(config.uploadsDir, 'pages')]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
