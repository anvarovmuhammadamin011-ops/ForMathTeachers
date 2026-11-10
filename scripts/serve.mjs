#!/usr/bin/env node
/**
 * MathTest AI — doimiy ishlaydigan server supervisor.
 *
 * Vazifasi:
 *   1. Lokal MongoDB (replica set) ishlamayotgan bo'lsa ishga tushiradi.
 *   2. Backend + frontend'ni bitta portda (standart 4000) ishga tushiradi.
 *   3. Jarayon yiqilsa avtomatik qayta ishga tushiradi.
 *   4. `--tunnel` bilan Cloudflare quick tunnel ochib, tekin public URL beradi.
 *
 * Buyruqlar:
 *   npm run serve          -> lokal server (http://localhost:4000)
 *   npm run serve:tunnel   -> lokal server + tekin public URL
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flags = new Set(process.argv.slice(2));
const wantTunnel = flags.has('--tunnel') || process.env.TUNNEL === '1';
const logsDir = path.join(root, 'logs');
const toolsDir = path.join(root, 'tools');
fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(toolsDir, { recursive: true });

const logFile = path.join(logsDir, 'server.log');
const publicUrlFile = path.join(root, '.public-url.txt');

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(logFile, `${line}\n`);
  } catch {
    /* log yozilmasa ham server ishlashda davom etadi */
  }
}

function loadBackendEnv() {
  const envFile = path.join(root, 'backend', '.env');
  if (!fs.existsSync(envFile)) return {};
  return dotenv.parse(fs.readFileSync(envFile));
}

const fileEnv = loadBackendEnv();
const mongoUri =
  process.env.MONGODB_URI ??
  fileEnv.MONGODB_URI ??
  'mongodb://127.0.0.1:27017/mathtest?replicaSet=rs0';
const port = Number(process.env.PORT ?? fileEnv.PORT ?? 4000);
const isLocalMongo = /(^|@|\/\/)(127\.0\.0\.1|localhost)(:|\/)/i.test(mongoUri);
const mongoPort = (() => {
  const match = mongoUri.match(/:\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost):(\d+)/i);
  return match ? Number(match[1]) : 27017;
})();

let mongoChild = null;
let mongoRestartTimer = null;
let backendChild = null;
let backendRestartTimer = null;
let tunnelChild = null;
let tunnelRestartTimer = null;
let shuttingDown = false;
let currentPublicUrl = '';

function isPortOpen(targetPort, host = '127.0.0.1', timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port: targetPort, host });
    const finish = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function waitForPort(targetPort, timeoutMs = 120_000, label = `port ${targetPort}`) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(targetPort)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${label} ${Math.round(timeoutMs / 1000)} soniya ichida ochilmadi.`);
}

function pipeWithPrefix(child, name) {
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue;
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim()) console.log(`[${name}] ${line}`);
      }
    });
    stream.on('end', () => {
      if (buffer.trim()) console.log(`[${name}] ${buffer}`);
    });
  }
}

function killTree(child) {
  if (!child || child.killed || !child.pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    } else {
      child.kill('SIGTERM');
    }
  } catch (error) {
    log(`Jarayonni to'xtatishda xato: ${error instanceof Error ? error.message : error}`);
  }
}

function startMongo() {
  if (!isLocalMongo || shuttingDown) return;
  if (mongoChild) return;

  if (mongoRestartTimer) {
    clearTimeout(mongoRestartTimer);
    mongoRestartTimer = null;
  }

  log(`Lokal MongoDB ishga tushirilmoqda (port ${mongoPort})...`);
  mongoChild = spawn(process.execPath, [path.join(root, 'tmp-mongo-dev.mjs')], {
    cwd: root,
    env: { ...process.env, MONGO_DEV_PORT: String(mongoPort) },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  pipeWithPrefix(mongoChild, 'mongo');

  mongoChild.on('exit', (code) => {
    mongoChild = null;
    if (shuttingDown) return;
    log(`MongoDB jarayoni to'xtadi (code=${code ?? '?'}). 5 soniyadan keyin qayta tekshiriladi.`);
    mongoRestartTimer = setTimeout(startMongo, 5000);
  });
}

function startBackend() {
  if (shuttingDown) return;
  if (backendRestartTimer) {
    clearTimeout(backendRestartTimer);
    backendRestartTimer = null;
  }

  const entry = path.join(root, 'backend', 'dist', 'index.js');
  if (!fs.existsSync(entry)) {
    log('XATO: backend/dist/index.js topilmadi. Avval `npm run build` bajaring.');
    process.exit(1);
  }

  log(`Backend ishga tushirilmoqda: http://localhost:${port}`);
  backendChild = spawn(process.execPath, [entry], {
    cwd: path.join(root, 'backend'),
    env: {
      ...process.env,
      MONGODB_URI: mongoUri,
      PORT: String(port),
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  pipeWithPrefix(backendChild, 'backend');

  backendChild.on('exit', (code, signal) => {
    backendChild = null;
    if (shuttingDown) return;
    log(
      `Backend to'xtadi (code=${code ?? '?'}, signal=${signal ?? '-'}). 3 soniyadan keyin qayta ishga tushiriladi.`,
    );
    backendRestartTimer = setTimeout(startBackend, 3000);
  });
}

async function downloadCloudflared() {
  const exe =
    process.platform === 'win32'
      ? path.join(toolsDir, 'cloudflared.exe')
      : path.join(toolsDir, 'cloudflared');
  if (fs.existsSync(exe)) return exe;

  const url =
    process.platform === 'win32'
      ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
      : process.platform === 'darwin'
        ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz'
        : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';

  log('cloudflared topilmadi, yuklab olinmoqda (bir marta)...');
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`cloudflared yuklab olinmadi: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  if (process.platform === 'darwin' && url.endsWith('.tgz')) {
    throw new Error(
      'macOS uchun cloudflared\'ni qo\'lda o\'rnating: brew install cloudflared, so\'ng qayta urinib ko\'ring.',
    );
  }

  fs.writeFileSync(exe, buffer);
  if (process.platform !== 'win32') fs.chmodSync(exe, 0o755);
  log(`cloudflared tayyor: ${exe}`);
  return exe;
}

async function startTunnel() {
  if (shuttingDown) return;
  if (tunnelRestartTimer) {
    clearTimeout(tunnelRestartTimer);
    tunnelRestartTimer = null;
  }

  try {
    const exe = await downloadCloudflared();
    log('Cloudflare quick tunnel ochilmoqda...');
    tunnelChild = spawn(
      exe,
      ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'],
      {
        cwd: root,
        env: { ...process.env },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    const handleOutput = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[tunnel] ${text}`);
      const matches = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/gi);
      if (matches && matches.length > 0) {
        const url = matches[matches.length - 1];
        if (url !== currentPublicUrl) {
          currentPublicUrl = url;
          fs.writeFileSync(publicUrlFile, `${url}\n`, 'utf8');
          log(`PUBLIC URL: ${url}`);
        }
      }
    };
    tunnelChild.stdout?.on('data', handleOutput);
    tunnelChild.stderr?.on('data', handleOutput);

    tunnelChild.on('exit', (code) => {
      tunnelChild = null;
      if (shuttingDown) return;
      log(`Tunnel to'xtadi (code=${code ?? '?'}). 5 soniyadan keyin qayta ochiladi.`);
      tunnelRestartTimer = setTimeout(() => void startTunnel(), 5000);
    });
  } catch (error) {
    log(`Tunnel xatosi: ${error instanceof Error ? error.message : error}`);
    log('Server tunnelsiz ishlashda davom etadi. 15 soniyadan keyin qayta uriniladi.');
    tunnelRestartTimer = setTimeout(() => void startTunnel(), 15000);
  }
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`${signal} — to'xtatilmoqda...`);

  for (const timer of [mongoRestartTimer, backendRestartTimer, tunnelRestartTimer]) {
    if (timer) clearTimeout(timer);
  }
  killTree(tunnelChild);
  killTree(backendChild);
  killTree(mongoChild);

  setTimeout(() => process.exit(0), 2500);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

async function main() {
  log('=== MathTest AI supervisor ishga tushdi ===');

  if (!fs.existsSync(path.join(root, 'frontend', 'dist', 'index.html'))) {
    log("Ogohlantirish: frontend/dist topilmadi. UI uchun `npm run build` bajaring.");
  }

  if (await isPortOpen(port)) {
    log(`Port ${port} allaqachon band. Ehtimol server ishlayapti: http://localhost:${port}`);
    log('Ikkinchi nusxa ishga tushirilmadi.');
    process.exit(0);
  }

  if (isLocalMongo) {
    if (await isPortOpen(mongoPort)) {
      log(`MongoDB allaqachon ishlayapti (port ${mongoPort}).`);
    } else {
      startMongo();
      await waitForPort(mongoPort, 120_000, 'MongoDB');
      log(`MongoDB tayyor (port ${mongoPort}).`);
    }
  } else {
    log('MongoDB Atlas rejimi: lokal MongoDB ishga tushirilmaydi.');
  }

  startBackend();
  await waitForPort(port, 90_000, 'Backend');

  log(`Server tayyor: http://localhost:${port}`);
  log(`Boshqaruv paneli: http://localhost:${port}/kirish`);
  log(`Health: http://localhost:${port}/api/health`);

  if (wantTunnel) {
    void startTunnel();
  } else {
    log('Public URL kerak bo\'lsa: npm run serve:tunnel');
  }
}

main().catch((error) => {
  log(`Ishga tushirishda xato: ${error instanceof Error ? error.stack ?? error.message : error}`);
  shutdown('ERROR');
});
