import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, badRequest, notFound } from '../lib/errors.js';
import { parseBody } from '../lib/validation.js';
import { requireTeacher } from '../middleware/auth.js';
import { generateJoinCode } from '../services/authService.js';
import { classroomRanking } from '../services/rankingService.js';

export const classroomRouter = Router();

classroomRouter.use(requireTeacher);

const createClassroomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Sinf nomini kiriting.')
    .max(40, 'Sinf nomi juda uzun.')
    .regex(/^[0-9A-Za-zʻʼ‘’\-– .]+$/, 'Sinf nomida faqat harf, raqam va chiziqcha bo‘lishi mumkin.'),
});

async function uniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateJoinCode();
    const existing = await prisma.classroom.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw badRequest('Sinf kodi generatsiya qilishda xatolik. Qayta urinib ko‘ring.');
}

classroomRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { students: true, tests: true } },
      },
    });
    res.json({
      classrooms: classrooms.map((classroom) => ({
        id: classroom.id,
        name: classroom.name,
        joinCode: classroom.joinCode,
        studentCount: classroom._count.students,
        testCount: classroom._count.tests,
        createdAt: classroom.createdAt,
      })),
    });
  }),
);

classroomRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const body = parseBody(createClassroomSchema, req.body);
    // MongoDB connector'i `mode: 'insensitive'` ni qo'llab-quvvatlamaydi.
    // Sinf nomlarini ilova darajasida case-insensitive solishtiramiz.
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId },
      select: { name: true },
    });
    const normalizedName = body.name.trim().toLowerCase();
    const existing = classrooms.some(
      (classroom) => classroom.name.trim().toLowerCase() === normalizedName,
    );
    if (existing) throw badRequest('Sizda shu nomdagi sinf allaqachon bor.');

    const classroom = await prisma.classroom.create({
      data: { name: body.name, teacherId, joinCode: await uniqueJoinCode() },
    });
    res.status(201).json({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        joinCode: classroom.joinCode,
        studentCount: 0,
        testCount: 0,
        createdAt: classroom.createdAt,
      },
    });
  }),
);

classroomRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const classroom = await prisma.classroom.findFirst({
      where: { id: req.params.id, teacherId },
      include: {
        students: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, username: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        tests: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { questions: true, attempts: true } },
          },
        },
      },
    });
    if (!classroom) throw notFound('Sinf topilmadi.');

    const ranking = await classroomRanking(classroom.id);
    const rankByStudent = new Map(ranking.rows.map((row) => [row.studentId, row]));

    res.json({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        joinCode: classroom.joinCode,
        createdAt: classroom.createdAt,
      },
      students: classroom.students.map((membership) => {
        const rank = rankByStudent.get(membership.studentId);
        return {
          id: membership.student.id,
          firstName: membership.student.firstName,
          lastName: membership.student.lastName,
          username: membership.student.username,
          joinedAt: membership.joinedAt,
          averageScore: rank?.averageScore ?? 0,
          testsCompleted: rank?.testsCompleted ?? 0,
          rank: rank?.rank ?? null,
        };
      }),
      tests: classroom.tests.map((test) => ({
        id: test.id,
        title: test.title,
        status: test.status,
        durationMinutes: test.durationMinutes,
        questionCount: test._count.questions,
        attemptCount: test._count.attempts,
        createdAt: test.createdAt,
      })),
    });
  }),
);

classroomRouter.get(
  '/:id/ranking',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const classroom = await prisma.classroom.findFirst({
      where: { id: req.params.id, teacherId },
      select: { id: true },
    });
    if (!classroom) throw notFound('Sinf topilmadi.');
    res.json(await classroomRanking(classroom.id));
  }),
);
