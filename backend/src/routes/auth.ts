import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, conflict, unauthorized } from '../lib/errors.js';
import { parseBody } from '../lib/validation.js';
import { rateLimit } from '../lib/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createSession,
  destroySession,
  login,
  normalizeUsername,
  publicUser,
  sessionCookieOptions,
  generateJoinCode,
  getUserSessions,
} from '../services/authService.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username ni kiriting.'),
  password: z.string().min(1, 'Parolni kiriting.'),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req.body);
    const key = `login:${req.ip}:${normalizeUsername(body.username)}`;
    if (!rateLimit(key, 12, 15 * 60 * 1000)) {
      throw conflict('Juda ko‘p urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring.');
    }
    const user = await login(body.username, body.password);
    const { token, expiresAt } = await createSession(user.id);
    res.cookie(config.sessionCookie, token, sessionCookieOptions(expiresAt ?? new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000)));
    res.json({ user: publicUser(user) });
  })),

authRouter.post(
  '/login/permanent',
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req.body);
    const key = `login:${req.ip}:${normalizeUsername(body.username)}`;
    if (!rateLimit(key, 12, 15 * 60 * 1000)) {
      throw conflict('Juda ko‘p urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring.');
    }
    const user = await login(body.username, body.password);
    const { token, expiresAt } = await createSession(user.id, { isPermanent: true });
    res.cookie(config.sessionCookie, token, sessionCookieOptions(expiresAt ?? new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000)));
    res.json({ user: publicUser(user), permanent: true });
  })),


authRouter.get(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sessions = await getUserSessions(req.auth!.userId);
    res.json({ sessions });
  })),

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    if (req.auth) await destroySession(req.auth.sessionId);
    res.clearCookie(config.sessionCookie, { path: '/' });
    res.json({ ok: true });
  })),

authRouter.delete(
  '/sessions',
  requireAuth,
  asyncHandler(async (req, res) => {
    await destroySession(req.auth!.sessionId, { permanentOnly: true });
    res.clearCookie(config.sessionCookie, { path: '/' });
    res.json({ ok: true, permanentDestroyed: true });
  })),

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth!;
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) throw unauthorized();

    const classrooms =
      user.role === 'STUDENT'
        ? await prisma.classroomStudent.findMany({
            where: { studentId: user.id },
            include: {
              classroom: { include: { teacher: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { joinedAt: 'asc' },
          })
        : [];

    res.json({
      user: publicUser(user),
      classrooms: classrooms.map((membership) => ({
        id: membership.classroom.id,
        name: membership.classroom.name,
        teacherName: `${membership.classroom.teacher.firstName} ${membership.classroom.teacher.lastName}`,
      })),
    });
  }),
);
