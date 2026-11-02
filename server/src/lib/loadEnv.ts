import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

/**
 * Kanonik `.env` fayl loyiha ildizida joylashgan. Skriptlar `server/`
 * ichidan ham, loyiha ildizidan ham ishga tushirilishi mumkin.
 */
export function loadRootEnv(): string | null {
  const candidates = [
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
