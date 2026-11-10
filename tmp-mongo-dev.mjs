import { MongoMemoryReplSet } from 'mongodb-memory-server';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.MONGO_DEV_PORT ?? 27017);

// Data loyiha ichida saqlanadi — kompyuter qayta ishga tushganda ham
// seed ma'lumotlari yo'qolib ketmaydi. Papka avtomatik yaratiladi.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const dbPath = process.env.MONGO_DEV_DB_PATH ?? path.join(repoRoot, '.mongo-dev-data');
fs.mkdirSync(dbPath, { recursive: true });

// Agar 27017 allaqachan band bo'lsa (masalan, MongoDB allaqachan ishlayapti),
// qayta ishga tushirmasdan chiqamiz — shunda `npm run dev` yana ishga tushadi.
const isPortFree = (port) =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '127.0.0.1');
  });

if (!(await isPortFree(PORT))) {
  console.log(`[mongo-dev] ${PORT} porti band — MongoDB allaqachan ishlayapti, qayta ishga tushirilmaydi.`);
  process.exit(0);
}

const replSet = await MongoMemoryReplSet.create({
  binary: { version: '7.0.14' },
  replSet: {
    count: 1,
    name: 'rs0',
    dbName: 'mathtest',
    storageEngine: 'wiredTiger',
  },
  instanceOpts: [{ port: PORT, dbPath }],
});

console.log(`MONGO_URI=${replSet.getUri('mathtest')}`);
console.log(`MONGO_DB_PATH=${dbPath}`);

const shutdown = async () => {
  await replSet.stop({ doCleanup: false, force: true });
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await new Promise(() => {});
