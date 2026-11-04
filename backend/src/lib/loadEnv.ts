import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/**
 * Backendning kanonik `.env` fayli `backend/.env` da saqlanadi.
 * Skriptlar backend ichidan ham, monorepo ildizidan ham ishga tushirilishi mumkin,
 * shuning uchun avval modul joylashuvidan, keyin `process.cwd()` dan qidiramiz.
 */
export function loadRootEnv(): string | null {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot = path.resolve(moduleDir, '..', '..');

  const candidates = [
    path.join(backendRoot, '.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      return candidate;
    }
  }
  return null;
}
