import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { ApiError, conflict } from '../lib/errors.js';

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', config.sessionSecret).update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  return { token, session, expiresAt };
}

export async function destroySession(sessionId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.isProduction,
    path: '/',
    expires: expiresAt,
  };
}

export function publicUser(user: {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: Role;
  schoolName: string | null;
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    role: user.role,
    schoolName: user.schoolName,
  };
}

export function generateJoinCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return code;
}

export async function assertUsernameFree(username: string) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw conflict('Bu username allaqachon band. Boshqasini tanlang.');
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function login(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const user = await prisma.user.findUnique({ where: { username: normalized } });
  if (!user) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Username yoki parol noto‘g‘ri.');
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Username yoki parol noto‘g‘ri.');
  await prisma.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
  return user;
}

export async function currentUserFromToken(token: string | undefined) {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session;
}

