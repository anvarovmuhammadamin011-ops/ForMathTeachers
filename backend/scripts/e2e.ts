/**
 * MathTest AI — HTTP darajasidagi end-to-end tekshiruv.
 *
 * Skript alohida vaqtinchalik server nusxasini ishga tushiradi, real
 * MongoDB bazasida izolyatsiyalangan test ma'lumotlarini yaratadi va
 * autentifikatsiya, test topshirish, baholash hamda reyting oqimini
 * tekshiradi. Oxirida yaratilgan ma'lumotlarni o'chiradi.
 *
 *   npm run e2e
 */
import type { AddressInfo } from 'node:net';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

type Json = Record<string, any>;
type Response = { status: number; data: Json };

const app = createApp();
const server = app.listen(0);
await new Promise<void>((resolve) => server.once('listening', () => resolve()));
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

let passed = 0;

function check(label: string, condition: boolean, details?: unknown): void {
  if (!condition) {
    console.error(`\n✗ ${label}`);
    if (details !== undefined) console.error(details);
    throw new Error(`Tekshiruv muvaffaqiyatsiz: ${label}`);
  }
  passed += 1;
  console.log(`✓ ${label}`);
}

function createClient() {
  let cookie = '';
  async function request(
    path: string,
    options: { method?: string; json?: unknown; body?: BodyInit } = {},
  ): Promise<Response> {
    const headers = new Headers();
    if (cookie) headers.set('Cookie', cookie);
    let body = options.body;
    if (options.json !== undefined) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(options.json);
    }
    const res = await fetch(`${base}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body,
    });
    const setCookies = res.headers.getSetCookie();
    if (setCookies.length > 0) {
      cookie = setCookies.map((item) => item.split(';')[0]).join('; ');
    }
    const text = await res.text();
    let data: Json = {};
    if (text) {
      try {
        data = JSON.parse(text) as Json;
      } catch {
        data = { raw: text };
      }
    }
    return { status: res.status, data };
  }
  return { request };
}

const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const password = 'E2ePassw0rd!';
const usernameBase = suffix.replace(/[^a-z0-9]/gi, '').slice(-8);
const teacherUsername = `e2e.teacher.${usernameBase}`;
const studentUsername = `e2e.student.${usernameBase}`;
const extraUsername = `e2e.extra.${usernameBase}`;
const joinCode = `E2E${usernameBase.slice(0, 5).toUpperCase()}`;

const teacherClient = createClient();
const studentClient = createClient();
const extraClient = createClient();

const createdUserIds: string[] = [];
let classroomId = '';

async function main() {
  console.log(`\nMathTest AI e2e — ${base}\n`);

  // 1. Health va autentifikatsiya chegaralari.
  const health = await teacherClient.request('/api/health');
  check('Health endpoint ishlaydi', health.status === 200 && health.data.database === true, health);

  const anonymousClasses = await teacherClient.request('/api/classes');
  check('Anonim foydalanuvchi sinflarga kira olmaydi', anonymousClasses.status === 401, anonymousClasses);

  // 2. Izolyatsiyalangan ma'lumotlarni tayyorlash (real baza).
  const passwordHash = await bcrypt.hash(password, 5);

  const teacher = await prisma.user.create({
    data: {
      firstName: 'E2E',
      lastName: 'O‘qituvchi',
      username: teacherUsername,
      passwordHash,
      role: 'TEACHER',
      schoolName: 'E2E maktabi',
    },
  });
  createdUserIds.push(teacher.id);

  const classroom = await prisma.classroom.create({
    data: {
      name: `E2E ${usernameBase}`,
      teacherId: teacher.id,
      joinCode,
    },
  });
  classroomId = classroom.id;

  const student = await prisma.user.create({
    data: {
      firstName: 'Aziza',
      lastName: 'Testova',
      username: studentUsername,
      passwordHash,
      role: 'STUDENT',
    },
  });
  createdUserIds.push(student.id);

  const extra = await prisma.user.create({
    data: {
      firstName: 'Bobur',
      lastName: 'Sinovov',
      username: extraUsername,
      passwordHash,
      role: 'STUDENT',
    },
  });
  createdUserIds.push(extra.id);

  await prisma.classroomStudent.createMany({
    data: [
      { classroomId: classroom.id, studentId: student.id },
      { classroomId: classroom.id, studentId: extra.id },
    ],
  });

  const test = await prisma.test.create({
    data: {
      title: `E2E algebra ${usernameBase}`,
      teacherId: teacher.id,
      classroomId: classroom.id,
      durationMinutes: 30,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      questions: {
        create: [
          {
            questionNumber: 1,
            questionText: '$2 + 2$ nechaga teng?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 1,
            solution: '$2 + 2 = 4$',
            verificationStatus: 'VERIFIED',
            verificationMethod: 'e2e',
            approvalStatus: 'APPROVED',
            sourcePage: 1,
            order: 1,
          },
          {
            questionNumber: 2,
            questionText: '$3x = 9$ tenglamada $x$ nechaga teng?',
            options: ['2', '3', '4', '5'],
            correctAnswer: 1,
            solution: '$x = 9 : 3 = 3$',
            verificationStatus: 'VERIFIED',
            verificationMethod: 'e2e',
            approvalStatus: 'APPROVED',
            sourcePage: 1,
            order: 2,
          },
          {
            questionNumber: 3,
            questionText: '$5 + 5$ nechaga teng?',
            options: ['9', '10', '11', '12'],
            correctAnswer: 1,
            solution: '$5 + 5 = 10$',
            verificationStatus: 'VERIFIED',
            verificationMethod: 'e2e',
            approvalStatus: 'APPROVED',
            sourcePage: 1,
            order: 3,
          },
          {
            questionNumber: 4,
            questionText: '$7 - 3$ nechaga teng?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 1,
            solution: '$7 - 3 = 4$',
            verificationStatus: 'VERIFIED',
            verificationMethod: 'e2e',
            approvalStatus: 'APPROVED',
            sourcePage: 1,
            order: 4,
          },
        ],
      },
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  const timeoutTest = await prisma.test.create({
    data: {
      title: `E2E vaqt ${usernameBase}`,
      teacherId: teacher.id,
      classroomId: classroom.id,
      durationMinutes: 5,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      questions: {
        create: [
          {
            questionNumber: 1,
            questionText: '$1 + 1$ nechaga teng?',
            options: ['2', '3', '4', '5'],
            correctAnswer: 0,
            solution: '$1 + 1 = 2$',
            verificationStatus: 'VERIFIED',
            verificationMethod: 'e2e',
            approvalStatus: 'APPROVED',
            sourcePage: 1,
            order: 1,
          },
        ],
      },
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  // 3. Login va rol chegaralari.
  const teacherLogin = await teacherClient.request('/api/auth/login', {
    method: 'POST',
    json: { username: teacherUsername, password },
  });
  check(
    'O‘qituvchi tizimga kiradi',
    teacherLogin.status === 200 && teacherLogin.data.user?.role === 'TEACHER',
    teacherLogin,
  );

  const studentLogin = await studentClient.request('/api/auth/login', {
    method: 'POST',
    json: { username: studentUsername, password },
  });
  check(
    'O‘quvchi tizimga kiradi',
    studentLogin.status === 200 && studentLogin.data.user?.role === 'STUDENT',
    studentLogin,
  );

  const extraLogin = await extraClient.request('/api/auth/login', {
    method: 'POST',
    json: { username: extraUsername, password },
  });
  check('Ikkinchi o‘quvchi tizimga kiradi', extraLogin.status === 200, extraLogin);

  const me = await studentClient.request('/api/auth/me');
  check(
    'Session cookie orqali /auth/me ishlaydi',
    me.status === 200 && me.data.user?.id === student.id,
    me,
  );

  const teacherStart = await teacherClient.request(`/api/tests/${test.id}/start`, {
    method: 'POST',
  });
  check('O‘qituvchi testni boshla olmaydi', teacherStart.status === 403, teacherStart);

  const studentCreateClass = await studentClient.request('/api/classes', {
    method: 'POST',
    json: { name: 'Ruxsatsiz sinf' },
  });
  check('O‘quvchi sinf yarata olmaydi', studentCreateClass.status === 403, studentCreateClass);

  // 4. O‘quvchi testni ko‘rishi va boshlashi.
  const studentTests = await studentClient.request('/api/student/tests');
  const available = (studentTests.data.available ?? []) as Json[];
  check(
    'O‘quvchi nashr qilingan testni ko‘radi',
    studentTests.status === 200 && available.some((item) => item.id === test.id),
    studentTests,
  );

  const start = await studentClient.request(`/api/tests/${test.id}/start`, { method: 'POST' });
  check('Test muvaffaqiyatli boshlanadi', start.status === 201 && start.data.attemptId, start);
  const attemptId = start.data.attemptId as string;
  check('Boshlash javobida expiresAt bor', Boolean(start.data.expiresAt), start);

  const startAgain = await studentClient.request(`/api/tests/${test.id}/start`, { method: 'POST' });
  check(
    'Qayta boshlash yangi urinish yaratmaydi',
    startAgain.status === 201 && startAgain.data.attemptId === attemptId,
    startAgain,
  );

  const attempt = await studentClient.request(`/api/attempts/${attemptId}`);
  const attemptQuestions = (attempt.data.questions ?? []) as Json[];
  check(
    'Faol urinish yuklanadi',
    attempt.status === 200 && attempt.data.status === 'IN_PROGRESS' && attemptQuestions.length === 4,
    attempt,
  );
  check(
    'Faol urinishda to‘g‘ri javob va yechim yashirilgan',
    attemptQuestions.every(
      (question) => !('correctAnswer' in question) && !('solution' in question),
    ),
    attemptQuestions,
  );

  const otherAttempt = await extraClient.request(`/api/attempts/${attemptId}`);
  check('Boshqa o‘quvchi urinishni ko‘ra olmaydi', otherAttempt.status === 403, otherAttempt);

  // 5. Javoblarni avtomatik saqlash (2 to‘g‘ri, 1 xato, 1 javobsiz).
  const q1 = test.questions[0]!;
  const q2 = test.questions[1]!;
  const q3 = test.questions[2]!;

  const save1 = await studentClient.request(`/api/attempts/${attemptId}/answers`, {
    method: 'PUT',
    json: { questionId: q1.id, selectedOption: 1 },
  });
  const save2 = await studentClient.request(`/api/attempts/${attemptId}/answers`, {
    method: 'PUT',
    json: { questionId: q2.id, selectedOption: 0 },
  });
  const save3 = await studentClient.request(`/api/attempts/${attemptId}/answers`, {
    method: 'PUT',
    json: { questionId: q3.id, selectedOption: 1 },
  });
  check(
    'Javoblar avtomatik saqlanadi',
    [save1, save2, save3].every((response) => response.status === 200 && response.data.ok === true),
    { save1, save2, save3 },
  );

  const savedAttempt = await studentClient.request(`/api/attempts/${attemptId}`);
  check(
    'Saqlangan javoblar qaytariladi',
    ((savedAttempt.data.answers ?? []) as Json[]).length === 3,
    savedAttempt,
  );

  const submit = await studentClient.request(`/api/attempts/${attemptId}/submit`, {
    method: 'POST',
  });
  check(
    'Test topshiriladi va baholanadi',
    submit.status === 200 &&
      submit.data.status === 'SUBMITTED' &&
      submit.data.correctCount === 2 &&
      submit.data.incorrectCount === 1 &&
      submit.data.unansweredCount === 1 &&
      submit.data.scorePercentage === 50,
    submit,
  );

  const submitAgain = await studentClient.request(`/api/attempts/${attemptId}/submit`, {
    method: 'POST',
  });
  check(
    'Takroriy topshirish idempotent',
    submitAgain.status === 200 && submitAgain.data.correctCount === 2,
    submitAgain,
  );

  const restartSubmitted = await studentClient.request(`/api/tests/${test.id}/start`, {
    method: 'POST',
  });
  check(
    'Topshirilgan testni qayta boshlab bo‘lmaydi',
    restartSubmitted.status === 409,
    restartSubmitted,
  );

  // 6. Natija faqat topshirilgandan keyin va faqat egasiga ko‘rinadi.
  const result = await studentClient.request(`/api/attempts/${attemptId}/result`);
  const resultQuestions = (result.data.questions ?? []) as Json[];
  check(
    'Natija to‘g‘ri javoblar bilan qaytadi',
    result.status === 200 &&
      resultQuestions.length === 4 &&
      resultQuestions.every((question) => 'correctAnswer' in question && 'solution' in question),
    result,
  );
  check(
    'Savollar bo‘yicha to‘g‘ri/xato holati to‘g‘ri',
    resultQuestions[0]?.isCorrect === true &&
      resultQuestions[1]?.isCorrect === false &&
      resultQuestions[3]?.selectedOption === null,
    resultQuestions,
  );

  const foreignResult = await extraClient.request(`/api/attempts/${attemptId}/result`);
  check('Boshqa o‘quvchi natijani ko‘ra olmaydi', foreignResult.status === 403, foreignResult);

  const teacherResult = await teacherClient.request(`/api/attempts/${attemptId}/result`);
  check('Test egasi o‘qituvchi natijani ko‘radi', teacherResult.status === 200, teacherResult);

  const studentResults = await studentClient.request('/api/student/results');
  const ownResult = ((studentResults.data.results ?? []) as Json[]).find(
    (item) => item.attemptId === attemptId,
  );
  check(
    'O‘quvchi natijalari ro‘yxatida urinish bor',
    Boolean(ownResult) && ownResult?.scorePercentage === 50 && ownResult?.rank === 1,
    studentResults,
  );

  const teacherResults = await teacherClient.request(`/api/tests/${test.id}/results`);
  const teacherRanking = (teacherResults.data.ranking ?? []) as Json[];
  check(
    'O‘qituvchi test natijalarini ko‘radi',
    teacherResults.status === 200 &&
      teacherResults.data.stats.submissions === 1 &&
      teacherRanking.length === 1 &&
      teacherRanking[0]?.rank === 1,
    teacherResults,
  );

  const studentTestResults = await studentClient.request(`/api/tests/${test.id}/results`);
  check(
    'O‘quvchi o‘qituvchi natijalar endpointiga kira olmaydi',
    studentTestResults.status === 403,
    studentTestResults,
  );

  // 7. Vaqt tugashi bilan avtomatik baholash.
  const timeoutStart = await extraClient.request(`/api/tests/${timeoutTest.id}/start`, {
    method: 'POST',
  });
  check('Ikkinchi o‘quvchi testni boshlaydi', timeoutStart.status === 201, timeoutStart);
  const timeoutAttemptId = timeoutStart.data.attemptId as string;

  await prisma.testAttempt.update({
    where: { id: timeoutAttemptId },
    data: { expiresAt: new Date(Date.now() - 5_000) },
  });

  const expiredAttempt = await extraClient.request(`/api/attempts/${timeoutAttemptId}`);
  check(
    'Muddati o‘tgan urinish avtomatik topshiriladi',
    expiredAttempt.status === 200 && expiredAttempt.data.status === 'SUBMITTED',
    expiredAttempt,
  );

  const expiredSave = await extraClient.request(
    `/api/attempts/${timeoutAttemptId}/answers`,
    {
      method: 'PUT',
      json: { questionId: timeoutTest.questions[0]!.id, selectedOption: 0 },
    },
  );
  check(
    'Muddati o‘tgan urinishga javob yozib bo‘lmaydi',
    expiredSave.status === 409,
    expiredSave,
  );

  const expiredResult = await extraClient.request(
    `/api/attempts/${timeoutAttemptId}/result`,
  );
  check(
    'Muddati o‘tgan urinish natijasi saqlangan',
    expiredResult.status === 200 &&
      expiredResult.data.attempt.scorePercentage === 0 &&
      expiredResult.data.attempt.unansweredCount === 1,
    expiredResult,
  );

  // 8. Reyting: teng natija + teng vaqt = bir xil o‘rin; tezroq = yuqori o‘rin.
  await prisma.testAttempt.update({
    where: { id: timeoutAttemptId },
    data: { scorePercentage: 0, correctCount: 0, incorrectCount: 0, unansweredCount: 1, timeSpentSeconds: 100 },
  });

  const tieUser = await prisma.user.create({
    data: {
      firstName: 'Dilnoza',
      lastName: 'Tengova',
      username: `e2e.tie.${usernameBase}`,
      passwordHash,
      role: 'STUDENT',
    },
  });
  createdUserIds.push(tieUser.id);
  await prisma.classroomStudent.create({
    data: { classroomId: classroom.id, studentId: tieUser.id },
  });
  await prisma.testAttempt.create({
    data: {
      testId: timeoutTest.id,
      studentId: tieUser.id,
      expiresAt: new Date(),
      submittedAt: new Date(),
      status: 'SUBMITTED',
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 1,
      scorePercentage: 0,
      timeSpentSeconds: 100,
    },
  });

  const fasterUser = await prisma.user.create({
    data: {
      firstName: 'Jasur',
      lastName: 'Tezov',
      username: `e2e.fast.${usernameBase}`,
      passwordHash,
      role: 'STUDENT',
    },
  });
  createdUserIds.push(fasterUser.id);
  await prisma.classroomStudent.create({
    data: { classroomId: classroom.id, studentId: fasterUser.id },
  });
  await prisma.testAttempt.create({
    data: {
      testId: timeoutTest.id,
      studentId: fasterUser.id,
      expiresAt: new Date(),
      submittedAt: new Date(),
      status: 'SUBMITTED',
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 1,
      scorePercentage: 0,
      timeSpentSeconds: 90,
    },
  });

  const tieResults = await teacherClient.request(`/api/tests/${timeoutTest.id}/results`);
  const tieRows = (tieResults.data.ranking ?? []) as Json[];
  const rowFor = (id: string) => tieRows.find((row) => row.studentId === id);
  check(
    'Tezroq topshirgan teng ballda yuqori turadi',
    rowFor(fasterUser.id)?.rank === 1,
    tieRows,
  );
  check(
    'Teng ball va teng vaqtda bir xil o‘rin beriladi',
    rowFor(extra.id)?.rank === 2 && rowFor(tieUser.id)?.rank === 2,
    tieRows,
  );

  const classRanking = await teacherClient.request(`/api/classes/${classroom.id}/ranking`);
  const classRows = (classRanking.data.rows ?? []) as Json[];
  const classRowFor = (id: string) => classRows.find((row) => row.studentId === id);
  check(
    'Umumiy reyting o‘rtacha foiz bo‘yicha hisoblanadi',
    classRanking.status === 200 &&
      classRowFor(student.id)?.averageScore === 50 &&
      classRowFor(student.id)?.rank === 1,
    classRanking,
  );
  check(
    'Umumiy reytingda teng o‘rtacha ballda tezroq yuqori turadi',
    classRowFor(fasterUser.id)?.rank === 2,
    classRows,
  );
  check(
    'Umumiy reytingda teng ball va teng vaqtda bir xil o‘rin beriladi',
    classRowFor(extra.id)?.rank === 3 && classRowFor(tieUser.id)?.rank === 3,
    classRows,
  );

  const studentRanking = await extraClient.request(
    `/api/student/ranking?classroomId=${classroom.id}`,
  );
  check(
    'O‘quvchi o‘z sinfi reytingini ko‘radi',
    studentRanking.status === 200 &&
      studentRanking.data.myStudentId === extra.id &&
      ((studentRanking.data.rows ?? []) as Json[]).length >= 4,
    studentRanking,
  );

  const otherClassRanking = await studentClient.request(
    `/api/student/ranking?classroomId=not-a-member`,
  );
  check(
    'O‘quvchi begona sinf reytingini ko‘ra olmaydi',
    otherClassRanking.status === 403,
    otherClassRanking,
  );

  console.log(`\nBarcha ${passed} ta tekshiruv muvaffaqiyatli o‘tdi.\n`);
}

try {
  await main();
} finally {
  const cleanup = async () => {
    if (classroomId) {
      await prisma.test.deleteMany({ where: { classroomId } }).catch(() => undefined);
      await prisma.classroom.delete({ where: { id: classroomId } }).catch(() => undefined);
    }
    if (createdUserIds.length > 0) {
      await prisma.user
        .deleteMany({ where: { id: { in: createdUserIds } } })
        .catch(() => undefined);
    }
  };
  await cleanup();
  await prisma.$disconnect().catch(() => undefined);
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
