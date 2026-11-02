import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, forbidden, notFound } from '../lib/errors.js';
import { requireStudent } from '../middleware/auth.js';
import { classroomRanking, studentOverallStats, testRanking } from '../services/rankingService.js';

export const studentRouter = Router();

studentRouter.use(requireStudent);

async function studentClassrooms(studentId: string) {
  const memberships = await prisma.classroomStudent.findMany({
    where: { studentId },
    include: {
      classroom: {
        include: { teacher: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });
  return memberships;
}

async function studentTests(studentId: string, classroomIds: string[]) {
  const tests = await prisma.test.findMany({
    where: { classroomId: { in: classroomIds }, status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    include: {
      classroom: { select: { id: true, name: true } },
      teacher: { select: { firstName: true, lastName: true } },
      questions: { where: { approvalStatus: 'APPROVED' }, select: { id: true } },
      attempts: {
        where: { studentId },
        select: {
          id: true,
          status: true,
          scorePercentage: true,
          submittedAt: true,
          expiresAt: true,
        },
      },
    },
  });

  return tests.map((test) => {
    const attempt = test.attempts[0] ?? null;
    return {
      id: test.id,
      title: test.title,
      classroom: test.classroom,
      teacherName: `${test.teacher.firstName} ${test.teacher.lastName}`,
      durationMinutes: test.durationMinutes,
      questionCount: test.questions.length,
      publishedAt: test.publishedAt,
      attempt: attempt
        ? {
            id: attempt.id,
            status: attempt.status,
            scorePercentage: attempt.scorePercentage,
            submittedAt: attempt.submittedAt,
            expiresAt: attempt.expiresAt,
          }
        : null,
    };
  });
}

studentRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const studentId = req.auth!.userId;
    const memberships = await studentClassrooms(studentId);
    if (memberships.length === 0) {
      res.json({
        student: {
          firstName: req.auth!.firstName,
          lastName: req.auth!.lastName,
          username: req.auth!.username,
        },
        classroom: null,
        classrooms: [],
        stats: { available: 0, completed: 0, averageScore: 0, rank: null, totalStudents: 0 },
        tests: [],
        recentResults: [],
      });
      return;
    }

    const classroomIds = memberships.map((membership) => membership.classroomId);
    const tests = await studentTests(studentId, classroomIds);
    const completed = tests.filter((test) => test.attempt?.status === 'SUBMITTED');
    const available = tests.filter((test) => test.attempt?.status !== 'SUBMITTED');
    const overall = await studentOverallStats(studentId, memberships[0]!.classroomId);

    const recentAttempts = await prisma.testAttempt.findMany({
      where: { studentId, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      take: 4,
      include: {
        test: { select: { id: true, title: true, classroom: { select: { name: true } } } },
      },
    });

    res.json({
      student: {
        firstName: req.auth!.firstName,
        lastName: req.auth!.lastName,
        username: req.auth!.username,
      },
      classroom: memberships[0]
        ? {
            id: memberships[0].classroom.id,
            name: memberships[0].classroom.name,
            teacherName: `${memberships[0].classroom.teacher.firstName} ${memberships[0].classroom.teacher.lastName}`,
          }
        : null,
      classrooms: memberships.map((membership) => ({
        id: membership.classroom.id,
        name: membership.classroom.name,
        teacherName: `${membership.classroom.teacher.firstName} ${membership.classroom.teacher.lastName}`,
      })),
      stats: {
        available: available.length,
        completed: completed.length,
        averageScore: overall.averageScore,
        rank: overall.rank,
        totalStudents: overall.totalStudents,
      },
      tests: available.slice(0, 6),
      recentResults: recentAttempts.map((attempt) => ({
        attemptId: attempt.id,
        testTitle: attempt.test.title,
        className: attempt.test.classroom.name,
        scorePercentage: attempt.scorePercentage,
        submittedAt: attempt.submittedAt,
      })),
    });
  }),
);

studentRouter.get(
  '/tests',
  asyncHandler(async (req, res) => {
    const studentId = req.auth!.userId;
    const memberships = await studentClassrooms(studentId);
    const classroomIds = memberships.map((membership) => membership.classroomId);
    const tests = await studentTests(studentId, classroomIds);
    res.json({
      available: tests.filter((test) => test.attempt?.status !== 'SUBMITTED'),
      completed: tests.filter((test) => test.attempt?.status === 'SUBMITTED'),
      classrooms: memberships.map((membership) => ({
        id: membership.classroom.id,
        name: membership.classroom.name,
      })),
    });
  }),
);

studentRouter.get(
  '/results',
  asyncHandler(async (req, res) => {
    const studentId = req.auth!.userId;
    const attempts = await prisma.testAttempt.findMany({
      where: { studentId, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' },
      include: {
        test: {
          include: {
            classroom: { select: { id: true, name: true } },
            teacher: { select: { firstName: true, lastName: true } },
            questions: { where: { approvalStatus: 'APPROVED' }, select: { id: true } },
          },
        },
      },
    });

    const rankings = new Map<string, number | null>();
    for (const testId of new Set(attempts.map((attempt) => attempt.testId))) {
      try {
        const ranking = await testRanking(testId);
        const own = ranking.rows.find((row) => row.studentId === studentId);
        rankings.set(testId, own?.rank ?? null);
      } catch {
        rankings.set(testId, null);
      }
    }

    const average =
      attempts.length > 0
        ? Math.round(
            (attempts.reduce((sum, attempt) => sum + attempt.scorePercentage, 0) / attempts.length) *
              10,
          ) / 10
        : 0;

    res.json({
      averageScore: average,
      results: attempts.map((attempt) => ({
        attemptId: attempt.id,
        testId: attempt.testId,
        testTitle: attempt.test.title,
        classroom: attempt.test.classroom,
        teacherName: `${attempt.test.teacher.firstName} ${attempt.test.teacher.lastName}`,
        questionCount: attempt.test.questions.length,
        correctCount: attempt.correctCount,
        incorrectCount: attempt.incorrectCount,
        unansweredCount: attempt.unansweredCount,
        scorePercentage: attempt.scorePercentage,
        timeSpentSeconds: attempt.timeSpentSeconds,
        submittedAt: attempt.submittedAt,
        rank: rankings.get(attempt.testId) ?? null,
      })),
    });
  }),
);

studentRouter.get(
  '/ranking',
  asyncHandler(async (req, res) => {
    const studentId = req.auth!.userId;
    const memberships = await studentClassrooms(studentId);
    if (memberships.length === 0) throw notFound('Siz hech qanday sinfga qo‘shilmagansiz.');
    const requested =
      typeof req.query.classroomId === 'string' ? req.query.classroomId : memberships[0]!.classroomId;
    const membership = memberships.find((item) => item.classroomId === requested);
    if (!membership) throw forbidden('Bu sinf reytingini ko‘rish huquqingiz yo‘q.');
    const ranking = await classroomRanking(requested);
    res.json({
      ...ranking,
      classrooms: memberships.map((item) => ({
        id: item.classroom.id,
        name: item.classroom.name,
      })),
      myStudentId: studentId,
    });
  }),
);
