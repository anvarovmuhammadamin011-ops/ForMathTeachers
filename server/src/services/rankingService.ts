import { prisma } from '../db.js';
import { notFound } from '../lib/errors.js';

export interface RankedRow {
  rank: number | null;
  studentId: string;
  studentName: string;
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
  timeSpentSeconds: number;
  submittedAt: string | null;
  testsCompleted?: number;
}

const EPSILON = 0.0001;

function competitionRanks<T>(
  sorted: T[],
  isTie: (a: T, b: T) => boolean,
): Array<{ item: T; rank: number }> {
  const result: Array<{ item: T; rank: number }> = [];
  let previousRank = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index]!;
    const previous = index > 0 ? sorted[index - 1]! : null;
    const rank = previous && isTie(previous, item) ? previousRank : index + 1;
    previousRank = rank;
    result.push({ item, rank });
  }
  return result;
}

export async function testRanking(testId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      questions: { where: { approvalStatus: 'APPROVED' }, select: { id: true } },
      classroom: { select: { id: true, name: true } },
    },
  });
  if (!test) throw notFound('Test topilmadi.');

  const attempts = await prisma.testAttempt.findMany({
    where: { testId, status: 'SUBMITTED' },
    include: { student: { select: { id: true, firstName: true, lastName: true } } },
  });

  const totalQuestions = test.questions.length;
  const sorted = [...attempts].sort(
    (a, b) =>
      b.scorePercentage - a.scorePercentage ||
      a.timeSpentSeconds - b.timeSpentSeconds ||
      (a.submittedAt?.getTime() ?? 0) - (b.submittedAt?.getTime() ?? 0),
  );

  const ranked = competitionRanks(
    sorted,
    (a, b) =>
      Math.abs(a.scorePercentage - b.scorePercentage) < EPSILON &&
      a.timeSpentSeconds === b.timeSpentSeconds,
  );

  const rows: RankedRow[] = ranked.map(({ item, rank }) => ({
    rank,
    studentId: item.student.id,
    studentName: `${item.student.firstName} ${item.student.lastName}`,
    correctCount: item.correctCount,
    totalQuestions,
    scorePercentage: item.scorePercentage,
    timeSpentSeconds: item.timeSpentSeconds,
    submittedAt: item.submittedAt?.toISOString() ?? null,
  }));

  return {
    test: { id: test.id, title: test.title, classroom: test.classroom, totalQuestions },
    rows,
  };
}

export interface OverallRow {
  rank: number | null;
  studentId: string;
  studentName: string;
  testsCompleted: number;
  averageScore: number;
}

export async function classroomRanking(classroomId: string) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    include: {
      teacher: { select: { firstName: true, lastName: true } },
      students: {
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
  if (!classroom) throw notFound('Sinf topilmadi.');

  const submittedAttempts = await prisma.testAttempt.findMany({
    where: {
      status: 'SUBMITTED',
      test: { classroomId },
    },
    select: {
      studentId: true,
      scorePercentage: true,
      correctCount: true,
      testId: true,
      timeSpentSeconds: true,
    },
  });

  const byStudent = new Map<
    string,
    { total: number; count: number; totalTimeSeconds: number; tests: Set<string> }
  >();
  for (const attempt of submittedAttempts) {
    const entry = byStudent.get(attempt.studentId) ?? {
      total: 0,
      count: 0,
      totalTimeSeconds: 0,
      tests: new Set<string>(),
    };
    entry.total += attempt.scorePercentage;
    entry.count += 1;
    entry.totalTimeSeconds += attempt.timeSpentSeconds;
    entry.tests.add(attempt.testId);
    byStudent.set(attempt.studentId, entry);
  }

  const allStudents = classroom.students.map((membership) => {
    const stats = byStudent.get(membership.studentId);
    const testsCompleted = stats?.tests.size ?? 0;
    const averageScore =
      stats && stats.count > 0 ? Math.round((stats.total / stats.count) * 10) / 10 : 0;
    return {
      studentId: membership.student.id,
      studentName: `${membership.student.firstName} ${membership.student.lastName}`,
      testsCompleted,
      averageScore,
      totalTimeSeconds: stats?.totalTimeSeconds ?? 0,
      hasResults: testsCompleted > 0,
    };
  });

  // Umumiy reyting: o'rtacha foiz bo'yicha; teng bo'lsa — umumiy vaqt kamroq
  // bo'lgan yuqori. Ikkalasi ham teng bo'lsa — bir xil o'rin.
  const withResults = allStudents
    .filter((student) => student.hasResults)
    .sort(
      (a, b) =>
        b.averageScore - a.averageScore || a.totalTimeSeconds - b.totalTimeSeconds,
    );
  const withoutResults = allStudents
    .filter((student) => !student.hasResults)
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  const ranked = competitionRanks(
    withResults,
    (a, b) =>
      Math.abs(a.averageScore - b.averageScore) < EPSILON &&
      a.totalTimeSeconds === b.totalTimeSeconds,
  ).map(({ item, rank }) => ({ ...item, rank }));

  const rows: OverallRow[] = [
    ...ranked.map((item) => ({
      rank: item.rank as number | null,
      studentId: item.studentId,
      studentName: item.studentName,
      testsCompleted: item.testsCompleted,
      averageScore: item.averageScore,
    })),
    ...withoutResults.map((item) => ({
      rank: null,
      studentId: item.studentId,
      studentName: item.studentName,
      testsCompleted: 0,
      averageScore: 0,
    })),
  ];

  return {
    classroom: {
      id: classroom.id,
      name: classroom.name,
      teacherName: `${classroom.teacher.firstName} ${classroom.teacher.lastName}`,
      studentCount: classroom.students.length,
      totalTests: await prisma.test.count({
        where: { classroomId, status: 'PUBLISHED' },
      }),
    },
    rows,
  };
}

export async function studentOverallStats(studentId: string, classroomId?: string) {
  const membership = classroomId
    ? await prisma.classroomStudent.findUnique({
        where: { classroomId_studentId: { classroomId, studentId } },
      })
    : await prisma.classroomStudent.findFirst({
        where: { studentId },
        orderBy: { joinedAt: 'asc' },
      });

  if (!membership) {
    return {
      classroom: null,
      averageScore: 0,
      testsCompleted: 0,
      rank: null,
      totalStudents: 0,
    };
  }

  const ranking = await classroomRanking(membership.classroomId);
  const own = ranking.rows.find((row) => row.studentId === studentId);
  return {
    classroom: ranking.classroom,
    averageScore: own?.averageScore ?? 0,
    testsCompleted: own?.testsCompleted ?? 0,
    rank: own?.rank ?? null,
    totalStudents: ranking.rows.filter((row) => row.rank !== null).length,
  };
}
