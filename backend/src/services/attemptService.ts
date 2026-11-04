import { prisma } from '../db.js';
import { ApiError, badRequest, conflict, forbidden, notFound } from '../lib/errors.js';

export function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function assertClassroomAccess(studentId: string, classroomId: string) {
  const membership = await prisma.classroomStudent.findUnique({
    where: { classroomId_studentId: { classroomId, studentId } },
  });
  if (!membership) throw forbidden('Bu sinf testlariga kirish huquqingiz yo‘q.');
}

export async function startAttempt(studentId: string, testId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      questions: { where: { approvalStatus: 'APPROVED' }, select: { id: true } },
    },
  });
  if (!test) throw notFound('Test topilmadi.');
  if (test.status !== 'PUBLISHED') {
    throw badRequest('Bu test hali nashr qilinmagan.');
  }
  await assertClassroomAccess(studentId, test.classroomId);
  if (test.questions.length === 0) {
    throw badRequest('Testda tasdiqlangan savollar yo‘q.');
  }

  const existing = await prisma.testAttempt.findUnique({
    where: { testId_studentId: { testId, studentId } },
  });
  if (existing) {
    if (existing.status === 'SUBMITTED') {
      throw conflict('Siz bu testni allaqachon topshirgansiz.');
    }
    if (existing.expiresAt.getTime() <= Date.now()) {
      await gradeAttempt(existing.id);
      throw conflict('Test vaqti tugagan. Natijangiz saqlandi.');
    }
    return existing;
  }

  const expiresAt = new Date(Date.now() + test.durationMinutes * 60 * 1000);
  try {
    return await prisma.testAttempt.create({
      data: { testId, studentId, expiresAt },
    });
  } catch {
    // Parallel so'rov natijasida yaratilgan bo'lishi mumkin.
    const fallback = await prisma.testAttempt.findUnique({
      where: { testId_studentId: { testId, studentId } },
    });
    if (!fallback) throw conflict('Testni boshlashda xatolik. Qayta urinib ko‘ring.');
    return fallback;
  }
}

export async function gradeAttempt(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        include: {
          questions: {
            where: { approvalStatus: 'APPROVED' },
            orderBy: { order: 'asc' },
            select: { id: true, correctAnswer: true },
          },
        },
      },
      answers: true,
    },
  });
  if (!attempt) throw notFound('Urinish topilmadi.');
  if (attempt.status === 'SUBMITTED') return attempt;

  const questions = attempt.test.questions;
  const total = questions.length;
  const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  let correct = 0;
  let answered = 0;

  const updates: Array<{ id: string; isCorrect: boolean }> = [];
  for (const question of questions) {
    const answer = answerMap.get(question.id);
    if (!answer || answer.selectedOption === null) continue;
    answered += 1;
    const isCorrect = answer.selectedOption === question.correctAnswer;
    if (isCorrect) correct += 1;
    if (answer.isCorrect !== isCorrect) {
      updates.push({ id: answer.id, isCorrect });
    }
  }

  const incorrect = answered - correct;
  const unanswered = total - answered;
  const score = total === 0 ? 0 : roundScore((correct / total) * 100);
  const endTime = attempt.expiresAt.getTime() < Date.now() ? attempt.expiresAt : new Date();
  const timeSpentSeconds = Math.max(
    0,
    Math.round((endTime.getTime() - attempt.startedAt.getTime()) / 1000),
  );

  await prisma.$transaction(async (tx) => {
    for (const update of updates) {
      await tx.studentAnswer.update({
        where: { id: update.id },
        data: { isCorrect: update.isCorrect },
      });
    }
    await tx.testAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        correctCount: correct,
        incorrectCount: incorrect,
        unansweredCount: unanswered,
        scorePercentage: score,
        timeSpentSeconds,
      },
    });
  });

  return { ...attempt, status: 'SUBMITTED' as const, correctCount: correct, scorePercentage: score };
}

export async function sweepExpiredAttempts() {
  const expired = await prisma.testAttempt.findMany({
    where: { status: 'IN_PROGRESS', expiresAt: { lt: new Date() } },
    select: { id: true },
    take: 50,
  });
  for (const attempt of expired) {
    try {
      await gradeAttempt(attempt.id);
    } catch (error) {
      console.error('[attempt:sweep]', attempt.id, (error as Error).message);
    }
  }
}

export async function getAttemptForStudent(studentId: string, attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        include: {
          questions: {
            where: { approvalStatus: 'APPROVED' },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              questionNumber: true,
              questionText: true,
              options: true,
              sourcePage: true,
              pageImagePath: true,
              diagramBBox: true,
            },
          },
        },
      },
      answers: {
        select: { questionId: true, selectedOption: true },
      },
    },
  });
  if (!attempt) throw notFound('Test urinishi topilmadi.');
  if (attempt.studentId !== studentId) throw forbidden('Bu urinish sizga tegishli emas.');

  let current = attempt;
  if (attempt.status === 'IN_PROGRESS' && attempt.expiresAt.getTime() <= Date.now()) {
    await gradeAttempt(attempt.id);
    current = await prisma.testAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      include: {
        test: { include: { questions: { where: { approvalStatus: 'APPROVED' }, select: { id: true } } } },
        answers: true,
      },
    });
  }

  return {
    id: attempt.id,
    status: current.status,
    startedAt: attempt.startedAt,
    expiresAt: attempt.expiresAt,
    durationMinutes: attempt.test.durationMinutes,
    submittedAt: 'submittedAt' in current ? current.submittedAt : attempt.submittedAt,
    test: {
      id: attempt.test.id,
      title: attempt.test.title,
    },
    answers: attempt.answers
      .filter((answer) => answer.selectedOption !== null)
      .map((answer) => ({ questionId: answer.questionId, selectedOption: answer.selectedOption })),
    questions: attempt.test.questions.map((question) => ({
      id: question.id,
      questionNumber: question.questionNumber,
      questionText: question.questionText,
      options: question.options,
      sourcePage: question.sourcePage,
      pageImageUrl: question.pageImagePath
        ? `/api/files/${question.pageImagePath.replace(/\\/g, '/')}`
        : null,
      diagramBBox: question.diagramBBox,
    })),
  };
}

export async function saveAnswer(
  studentId: string,
  attemptId: string,
  questionId: string,
  selectedOption: number | null,
) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { test: { select: { id: true } } },
  });
  if (!attempt) throw notFound('Test urinishi topilmadi.');
  if (attempt.studentId !== studentId) throw forbidden('Bu urinish sizga tegishli emas.');
  if (attempt.status !== 'IN_PROGRESS') {
    throw conflict('Test yakunlangan. Javoblarni o‘zgartirish mumkin emas.');
  }
  if (attempt.expiresAt.getTime() <= Date.now()) {
    await gradeAttempt(attempt.id);
    throw conflict('Test vaqti tugadi. Javoblar avtomatik topshirildi.');
  }

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      testId: attempt.testId,
      approvalStatus: 'APPROVED',
    },
    select: { id: true, options: true },
  });
  if (!question) throw notFound('Savol topilmadi.');
  if (selectedOption !== null && (selectedOption < 0 || selectedOption > 3 || selectedOption >= question.options.length)) {
    throw badRequest('Variant noto‘g‘ri.');
  }

  await prisma.studentAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, selectedOption },
    update: { selectedOption },
  });
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function submitAttempt(studentId: string, attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw notFound('Test urinishi topilmadi.');
  if (attempt.studentId !== studentId) throw forbidden('Bu urinish sizga tegishli emas.');
  if (attempt.status === 'SUBMITTED') return attempt;
  await gradeAttempt(attempt.id);
  return prisma.testAttempt.findUniqueOrThrow({ where: { id: attempt.id } });
}

export async function getAttemptResult(user: { id: string; role: 'TEACHER' | 'STUDENT' }, attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        include: {
          teacher: { select: { firstName: true, lastName: true } },
          classroom: { select: { id: true, name: true } },
          questions: {
            where: { approvalStatus: 'APPROVED' },
            orderBy: { order: 'asc' },
          },
        },
      },
      student: { select: { id: true, firstName: true, lastName: true } },
      answers: true,
    },
  });
  if (!attempt) throw notFound('Natija topilmadi.');
  if (user.role === 'STUDENT' && attempt.studentId !== user.id) {
    throw forbidden('Bu natija sizga tegishli emas.');
  }
  if (user.role === 'TEACHER' && attempt.test.teacherId !== user.id) {
    throw forbidden('Bu natijani ko‘rish huquqingiz yo‘q.');
  }
  if (attempt.status !== 'SUBMITTED') {
    throw new ApiError(409, 'NOT_SUBMITTED', 'Test hali yakunlanmagan.');
  }

  const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  return {
    attempt: {
      id: attempt.id,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      expiresAt: attempt.expiresAt,
      status: attempt.status,
      totalQuestions: attempt.test.questions.length,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unansweredCount: attempt.unansweredCount,
      scorePercentage: attempt.scorePercentage,
      timeSpentSeconds: attempt.timeSpentSeconds,
    },
    test: {
      id: attempt.test.id,
      title: attempt.test.title,
      classroom: attempt.test.classroom,
      teacherName: `${attempt.test.teacher.firstName} ${attempt.test.teacher.lastName}`,
    },
    student: attempt.student,
    questions: attempt.test.questions.map((question) => {
      const answer = answerMap.get(question.id);
      return {
        id: question.id,
        order: question.order,
        questionNumber: question.questionNumber,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        solution: question.solution,
        sourcePage: question.sourcePage,
        selectedOption: answer?.selectedOption ?? null,
        isCorrect: answer?.isCorrect ?? false,
      };
    }),
  };
}
