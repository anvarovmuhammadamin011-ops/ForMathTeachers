import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/errors.js';
import { requireTeacher } from '../middleware/auth.js';

export const teacherRouter = Router();

teacherRouter.use(requireTeacher);

teacherRouter.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const teacherId = req.auth!.userId;
    const [totalTests, memberships, activeTests, scoreAggregate, recentTests, classrooms] =
      await Promise.all([
        prisma.test.count({ where: { teacherId } }),
        prisma.classroomStudent.findMany({
          where: { classroom: { teacherId } },
          select: { studentId: true },
          distinct: ['studentId'],
        }),
        prisma.test.count({ where: { teacherId, status: 'PUBLISHED' } }),
        prisma.testAttempt.aggregate({
          where: { status: 'SUBMITTED', test: { teacherId } },
          _avg: { scorePercentage: true },
        }),
        prisma.test.findMany({
          where: { teacherId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            classroom: { select: { id: true, name: true } },
            questions: { select: { approvalStatus: true } },
            _count: { select: { attempts: true } },
          },
        }),
        prisma.classroom.findMany({
          where: { teacherId },
          orderBy: { createdAt: 'asc' },
          include: { _count: { select: { students: true, tests: true } } },
        }),
      ]);

    res.json({
      stats: {
        totalTests,
        totalStudents: memberships.length,
        activeTests,
        averageScore:
          scoreAggregate._avg.scorePercentage === null
            ? 0
            : Math.round(scoreAggregate._avg.scorePercentage * 10) / 10,
      },
      recentTests: recentTests.map((test) => ({
        id: test.id,
        title: test.title,
        status: test.status,
        className: test.classroom.name,
        questionCount: test.questions.filter((question) => question.approvalStatus === 'APPROVED')
          .length,
        createdAt: test.createdAt,
        attemptCount: test._count.attempts,
      })),
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
