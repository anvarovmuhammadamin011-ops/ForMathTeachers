import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, badRequest, conflict, unauthorized } from '../lib/errors.js';
import { parseBody } from '../lib/validation.js';
import { rateLimit } from '../lib/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import {
  assertUsernameFree,
  createSession,
  destroySession,
  hashPassword,
  login,
  normalizeUsername,
  publicUser,
  sessionCookieOptions,
} from '../services/authService.js';

export const authRouter = Router();

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username kamida 3 belgidan iborat bo‘lishi kerak.')
  .max(60, 'Username juda uzun.')
  .regex(
    /^[a-zA-Z0-9._@+-]+$/,
    'Username faqat harflar, raqamlar va . _ @ + - belgilaridan tashkil topsin.',
  );

const passwordSchema = z
  .string()
  .min(8, 'Parol kamida 8 belgidan iborat bo‘lishi kerak.')
  .max(72, 'Parol 72 belgidan oshmasligi kerak.');

const nameSchema = (label: string) =>
  z.string().trim().min(2, `${label} kamida 2 belgidan iborat bo‘lsin.`).max(50, `${label} juda uzun.`);

const teacherRegisterSchema = z.object({
  firstName: nameSchema('Ism'),
  lastName: nameSchema('Familiya'),
  username: usernameSchema,
  password: passwordSchema,
  schoolName: z.string().trim().min(2, 'Maktab nomini kiriting.').max(120, 'Maktab nomi juda uzun.'),
});

const studentRegisterSchema = z.object({
  firstName: nameSchema('Ism'),
  lastName: nameSchema('Familiya'),
  username: usernameSchema,
  password: passwordSchema,
  joinCode: z
    .string()
    .trim()
    .min(4, 'Sinf kodini kiriting.')
    .max(12, 'Sinf kodi noto‘g‘ri.')
    .transform((value) => value.toUpperCase()),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username ni kiriting.'),
  password: z.string().min(1, 'Parolni kiriting.'),
});

authRouter.post(
  '/register/teacher',
  asyncHandler(async (req, res) => {
    const body = parseBody(teacherRegisterSchema, req.body);
    const username = normalizeUsername(body.username);
    await assertUsernameFree(username);
    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        username,
        passwordHash,
        role: 'TEACHER',
        schoolName: body.schoolName,
      },
    });
    const { token, expiresAt } = await createSession(user.id);
    res.cookie(config.sessionCookie, token, sessionCookieOptions(expiresAt));
    res.status(201).json({ user: publicUser(user) });
  }),
);

authRouter.post(
  '/register/student',
  asyncHandler(async (req, res) => {
    const body = parseBody(studentRegisterSchema, req.body);
    const classroom = await prisma.classroom.findUnique({ where: { joinCode: body.joinCode } });
    if (!classroom) {
      throw badRequest('Sinf kodi noto‘g‘ri. O‘qituvchingizdan to‘g‘ri kodni so‘rang.');
    }
    const username = normalizeUsername(body.username);
    await assertUsernameFree(username);
    const passwordHash = await hashPassword(body.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName: body.firstName,
          lastName: body.lastName,
          username,
          passwordHash,
          role: 'STUDENT',
        },
      });
      await tx.classroomStudent.create({
        data: { classroomId: classroom.id, studentId: created.id },
      });
      return created;
    });

    const { token, expiresAt } = await createSession(user.id);
    res.cookie(config.sessionCookie, token, sessionCookieOptions(expiresAt));
    res.status(201).json({
      user: publicUser(user),
      classroom: { id: classroom.id, name: classroom.name },
    });
  }),
);

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
    res.cookie(config.sessionCookie, token, sessionCookieOptions(expiresAt));
    res.json({ user: publicUser(user) });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    if (req.auth) await destroySession(req.auth.sessionId);
    res.clearCookie(config.sessionCookie, { path: '/' });
    res.json({ ok: true });
  }),
);

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

authRouter.get(
  '/join-code/:code',
  asyncHandler(async (req, res) => {
    const code = String(req.params.code ?? '').trim().toUpperCase();
    const classroom = await prisma.classroom.findUnique({
      where: { joinCode: code },
      include: { teacher: { select: { firstName: true, lastName: true } } },
    });
    if (!classroom) throw badRequest('Bunday kodli sinf topilmadi.');
    res.json({
      classroom: {
        name: classroom.name,
        teacherName: `${classroom.teacher.firstName} ${classroom.teacher.lastName}`,
      },
    });
  }),
);
