import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Role } from '../types/domain.js';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { ApiError, conflict, unauthorized } from '../lib/errors.js';

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', config.sessionSecret).update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, options: { isPermanent?: boolean } = {}) {
  const token = crypto.randomBytes(32).toString('hex');
  const isPermanent = options.isPermanent ?? false;
  const expiresAt = isPermanent ? undefined : new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt, isPermanent },
  });
  return { token, session, expiresAt };
}

export async function destroySession(sessionId: string, options: { permanentOnly?: boolean } = {}) {
  const { permanentOnly = false } = options;
  if (permanentOnly) {
    await prisma.session.deleteMany({ where: { id: sessionId, isPermanent: true } });
  } else {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
}

export function sessionCookieOptions(expiresAt: Date | undefined) {
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
  role: Role | string;
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

export async function updateProfile(userId: string, payload: Record<string, unknown>) {
  const { firstName, lastName, username, schoolName } = payload as {
    firstName?: string;
    lastName?: string;
    username?: string;
    schoolName?: string | null;
  };
  if (username) {
    const normalized = normalizeUsername(username);
    const existing = await prisma.user.findUnique({ where: { username: normalized } });
    if (existing && existing.id !== userId) throw conflict('Bu username allaqachon band.');
  }
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(username !== undefined ? { username: normalizeUsername(username) } : {}),
      ...(schoolName !== undefined ? { schoolName } : {}),
    },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized('Foydalanuvchi topilmadi.');
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Joriy parol noto‘g‘ri.');
  if (newPassword.trim().length < 8) throw new ApiError(400, 'BAD_REQUEST', 'Yangi parol kamida 8 belgidan iborat bo‘lishi kerak.');
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  return { ok: true };
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
  // Permanent sessions never expire
  if (!session.isPermanent && session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session;
}

export async function getUserSessions(userId: string) {
  return prisma.session.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

