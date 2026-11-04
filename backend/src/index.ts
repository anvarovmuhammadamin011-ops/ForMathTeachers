import { createApp } from './app.js';
import { config, ensureRuntimeDirs } from './config.js';
import { startBackgroundWorkers } from './services/processor.js';
import { terminateOcr } from './services/pdf/extract.js';
import { prisma, pingDatabase } from './db.js';
import { aiConfigured } from './config.js';

async function waitForDatabaseAndStartWorkers() {
  let attempts = 0;
  for (;;) {
    try {
      await pingDatabase();
      await startBackgroundWorkers();
      console.log('  Baza ulanishi tayyor, fon vazifalari ishga tushdi.\n');
      return;
    } catch (error) {
      attempts += 1;
      if (attempts === 1 || attempts % 10 === 0) {
        console.error(
          `[server] Bazaga ulanib bo‘lmadi (urinish ${attempts}). 5 soniyadan keyin qayta urinamiz.`,
          error instanceof Error ? error.message : error,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function main() {
  ensureRuntimeDirs();
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`\n  MathTest AI serveri ishga tushdi: http://localhost:${config.port}`);
    console.log(`  Muhit: ${config.isProduction ? 'production' : 'development'}`);
    console.log(`  AI: ${aiConfigured ? `${config.ai.model} (sozlangan)` : 'SOZLANMAGAN — AI_API_KEY kiriting'}`);
    console.log(`  OCR: ${config.ocr.enabled ? 'yoqilgan' : 'o‘chirilgan'}\n`);
  });

  void waitForDatabaseAndStartWorkers();

  const shutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} — to‘xtatilmoqda...`);
    server.close();
    await terminateOcr().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(async (error) => {
  console.error('[server] Ishga tushirishda xato:', error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
