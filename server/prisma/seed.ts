/**
 * Demo ma'lumotlar (ixtiyoriy): o'qituvchi, o'quvchi, sinf va tayyor demo test.
 * Bu AI konvertatsiyasini taqlid qilmaydi — test bazaga real yoziladi va
 * o'quvchi oqimini AI kaliti bo'lmasa ham sinab ko'rish uchun xizmat qiladi.
 *
 *   npm run seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { loadRootEnv } from '../src/lib/loadEnv.js';

loadRootEnv();

const prisma = new PrismaClient();

const DEMO_TEST_TITLE = 'Demo: 8-sinf algebra';

async function main() {
  const passwordHash = await bcrypt.hash('teacher123', 12);
  const teacher = await prisma.user.upsert({
    where: { username: 'oqituvchi' },
    update: {},
    create: {
      firstName: 'Aziza',
      lastName: 'Karimova',
      username: 'oqituvchi',
      passwordHash,
      role: 'TEACHER',
      schoolName: '25-son umumta’lim maktabi',
    },
  });

  const classroom = await prisma.classroom.upsert({
    where: { joinCode: '8A2026' },
    update: {},
    create: {
      name: '8-A',
      teacherId: teacher.id,
      joinCode: '8A2026',
    },
  });

  const studentPassword = await bcrypt.hash('student123', 12);
  const student = await prisma.user.upsert({
    where: { username: 'oquvchi' },
    update: {},
    create: {
      firstName: 'Muhammadamin',
      lastName: 'Toshmatov',
      username: 'oquvchi',
      passwordHash: studentPassword,
      role: 'STUDENT',
    },
  });

  await prisma.classroomStudent.upsert({
    where: {
      classroomId_studentId: { classroomId: classroom.id, studentId: student.id },
    },
    update: {},
    create: { classroomId: classroom.id, studentId: student.id },
  });

  let test = await prisma.test.findFirst({
    where: { teacherId: teacher.id, title: DEMO_TEST_TITLE },
  });

  if (!test) {
    test = await prisma.test.create({
      data: {
        title: DEMO_TEST_TITLE,
        teacherId: teacher.id,
        classroomId: classroom.id,
        durationMinutes: 20,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  const questions = [
    {
      text: '$3x + 7 = 22$ tenglamani yeching.',
      options: ['4', '5', '6', '8'],
      correct: 1,
      solution: '$3x = 22 - 7$\n$3x = 15$\n$x = 5$',
    },
    {
      text: '$5x - 10 = 20$ tenglamani yeching.',
      options: ['4', '5', '6', '8'],
      correct: 2,
      solution: '$5x = 20 + 10 = 30$\n$x = 30 : 5 = 6$',
    },
    {
      text: '$x^2 - 5x + 6 = 0$ tenglamaning ildizlar to‘plamini toping.',
      options: ['{2, 3}', '{2}', '{3}', '{-2, -3}'],
      correct: 0,
      solution: 'Viyet teoremasiga ko‘ra $x_1 + x_2 = 5$, $x_1 \\cdot x_2 = 6$.\nDemak, $x_1 = 2$, $x_2 = 3$.\nJavob: $\\{2, 3\\}$.',
    },
    {
      text: '$2(x + 3) = 14$ tenglamani yeching.',
      options: ['2', '3', '4', '7'],
      correct: 2,
      solution: '$x + 3 = 14 : 2 = 7$\n$x = 7 - 3 = 4$',
    },
    {
      text: '$\\frac{1}{2}x + 3 = 7$ tenglamani yeching.',
      options: ['4', '6', '8', '10'],
      correct: 2,
      solution: '$\\frac{1}{2}x = 7 - 3 = 4$\n$x = 4 \\cdot 2 = 8$',
    },
    {
      text: 'To‘g‘ri to‘rtburchakning tomonlari $6$ sm va $4$ sm. Uning yuzini toping.',
      options: ['20 sm²', '24 sm²', '10 sm²', '12 sm²'],
      correct: 1,
      solution: '$S = a \\cdot b = 6 \\cdot 4 = 24$ sm².',
    },
  ];

  const existing = await prisma.question.count({ where: { testId: test.id } });
  if (existing === 0) {
    await prisma.question.createMany({
      data: questions.map((question, index) => ({
        testId: test!.id,
        questionNumber: index + 1,
        questionText: question.text,
        options: question.options,
        correctAnswer: question.correct,
        solution: question.solution,
        verificationStatus: 'VERIFIED',
        verificationMethod: 'seed_demo',
        verificationNote: 'Demo ma’lumot sifatida qo‘lda kiritilgan.',
        approvalStatus: 'APPROVED',
        sourcePage: 1,
        order: index + 1,
      })),
    });
  }

  console.log('\nDemo ma’lumotlar tayyor:');
  console.log('  O‘qituvchi: oqituvchi / teacher123');
  console.log('  O‘quvchi:   oquvchi / student123');
  console.log('  Sinf kodi:  8A2026');
  console.log(`  Demo test:  ${DEMO_TEST_TITLE}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
