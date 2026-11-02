/**
 * Lokal dev uchun embedded PostgreSQL (real Postgres 18) serverini ishga tushiradi.
 * Productionda bu skript kerak emas — DATABASE_URL ni tashqi PostgreSQL ga qarating.
 *
 *   npm run db:up
 */
import EmbeddedPostgres from 'embedded-postgres';
import net from 'node:net';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PG_PORT ?? 5433);
const DATABASE = 'mathtest';

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net
      .connect({ port, host: '127.0.0.1' })
      .once('connect', () => {
        socket.destroy();
        resolve(true);
      })
      .once('error', () => resolve(false));
    socket.setTimeout(800);
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  if (await isPortOpen(PORT)) {
    console.log(`[db] PostgreSQL allaqachon ${PORT}-portda ishlayapti.`);
    console.log(
      `[db] DATABASE_URL="postgresql://postgres:postgres@localhost:${PORT}/${DATABASE}?schema=public"`,
    );
    await new Promise(() => {});
  }

  const dataDir = path.join(__dirname, '..', '.pgdata');
  fs.mkdirSync(dataDir, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: true,
    // Windows'dagi tizim kodlashidan qat'i nazar UTF-8 saqlash uchun.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: (msg) => {
      if (process.env.PG_VERBOSE) console.log('[pg]', msg);
    },
    onError: (msg) => console.error('[pg:xato]', msg),
  });

  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    console.log('[db] Ma\'lumotlar klasteri yaratilmoqda...');
    await pg.initialise();
  }

  await pg.start();
  console.log(`[db] PostgreSQL ${PORT}-portda ishga tushdi.`);

  try {
    await pg.createDatabase(DATABASE);
    console.log(`[db] "${DATABASE}" bazasi yaratildi.`);
  } catch {
    console.log(`[db] "${DATABASE}" bazasi allaqachon mavjud.`);
  }

  console.log(
    `[db] DATABASE_URL="postgresql://postgres:postgres@localhost:${PORT}/${DATABASE}?schema=public"`,
  );

  const shutdown = async () => {
    console.log('\n[db] To\'xtatilmoqda...');
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGHUP', shutdown);

  // Jarayonni ochiq ushlab turamiz.
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('[db] Ishga tushirishda xato:', error);
  process.exit(1);
});
