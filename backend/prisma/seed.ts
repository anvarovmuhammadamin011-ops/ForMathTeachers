/**
 * Demo ma'lumotlar: o'qituvchi Odinaxon Qodirjonova, 8-A sinf, 14 o'quvchi va tayyor demo test.
 * Akkauntlar oldindan yaratiladi — tizimda ro'yxatdan o'tish yo'q.
 *
 *   npm run seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { loadRootEnv } from '../src/lib/loadEnv.js';

loadRootEnv();

const prisma = new PrismaClient();

const DEMO_TEST_TITLE = 'Demo: 8-sinf algebra';
const DEMO_CLASSROOM = { name: '8-A', joinCode: '8A2026' };

const LEGACY_TEACHER_USERNAME = 'oqituvchi';
const LEGACY_STUDENT_USERNAME = 'oquvchi';

const DEMO_TEACHER = {
  firstName: 'Odinaxon',
  lastName: 'Qodirjonova',
  username: 'qodirjonovaodinaxon',
  password: 'odinaxon1999',
  schoolName: '25-son umumta’lim maktabi',
};

type DemoStudent = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
};

const DEMO_STUDENTS: DemoStudent[] = [
  {
    firstName: 'Ibrohim',
    lastName: 'Ummatullayev',
    username: 'ummatullayevibrohim',
    password: 'ibrohim2026',
  },
  {
    firstName: 'Abdulvohid',
    lastName: 'Ikromjonov',
    username: 'ikromjonovabdulvohid',
    password: 'abdulvohid2026',
  },
  {
    firstName: 'Muhammad Yusuf',
    lastName: 'Dilimjonov',
    username: 'dilimjonovmuhammadyusuf',
    password: 'muhammadyusuf2026',
  },
  {
    firstName: 'Fayzulloh',
    lastName: 'Abdulazizov',
    username: 'abdulazizovfayzulloh',
    password: 'fayzulloh2026',
  },
  {
    firstName: 'Murodil',
    lastName: 'Mamurjonov',
    username: 'mamurjonovmurodil',
    password: 'murodil2026',
  },
  {
    firstName: 'Bobur',
    lastName: 'Xursanboyev',
    username: 'xursanboyevbobur',
    password: 'bobur2026',
  },
  {
    firstName: 'Muhammadamin',
    lastName: 'Anvarov',
    username: 'anvarovmuhammadamin',
    password: 'muhammadamin2026',
  },
  {
    firstName: 'Sadullo',
    lastName: 'Toxtasinov',
    username: 'toxtasinovsadullo',
    password: 'sadullo2026',
  },
  {
    firstName: 'Abror',
    lastName: 'Abdullayev',
    username: 'abdullayevabror',
    password: 'abror2026',
  },
  {
    firstName: 'Muhammadjon',
    lastName: 'Polatov',
    username: 'polatovmuhammadjon',
    password: 'muhammadjon2026',
  },
  {
    firstName: 'Xusanboy',
    lastName: 'Xasanboy',
    username: 'xasanboyxusanboy',
    password: 'xusanboy2026',
  },
  {
    firstName: 'Axmadillo',
    lastName: 'Vasiyev',
    username: 'vasiyevaxmadillo',
    password: 'axmadillo2026',
  },
  {
    firstName: 'Saidbek',
    lastName: 'Kimsanboyev',
    username: 'kimsanboyevsaidbek',
    password: 'saidbek2026',
  },
  {
    firstName: 'Yangi',
    lastName: 'O‘quvchi',
    username: 'yangi.oquvchi',
    password: 'yangi2026',
  },
];

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

async function migrateLegacyTeacher(keepId: string) {
  const legacy = await prisma.user.findUnique({ where: { username: LEGACY_TEACHER_USERNAME } });
  if (!legacy || legacy.id === keepId) return;

  await prisma.$transaction(async (tx) => {
    const targetClassrooms = await tx.classroom.findMany({
      where: { teacherId: keepId },
      select: { name: true },
    });
    const takenNames = new Set(targetClassrooms.map((classroom) => classroom.name.toLowerCase()));
    const legacyClassrooms = await tx.classroom.findMany({ where: { teacherId: legacy.id } });

    for (const classroom of legacyClassrooms) {
      if (takenNames.has(classroom.name.toLowerCase())) {
        await tx.classroom.delete({ where: { id: classroom.id } });
      } else {
        await tx.classroom.update({
          where: { id: classroom.id },
          data: { teacherId: keepId },
        });
      }
    }

    await tx.test.updateMany({
      where: { teacherId: legacy.id },
      data: { teacherId: keepId },
    });
    await tx.session.deleteMany({ where: { userId: legacy.id } });
    await tx.user.delete({ where: { id: legacy.id } });
  });
}

async function ensureTeacher() {
  const passwordHash = await bcrypt.hash(DEMO_TEACHER.password, 12);
  const data = {
    firstName: DEMO_TEACHER.firstName,
    lastName: DEMO_TEACHER.lastName,
    username: DEMO_TEACHER.username,
    passwordHash,
    role: 'TEACHER' as const,
    schoolName: DEMO_TEACHER.schoolName,
  };

  const existing = await prisma.user.findUnique({
    where: { username: DEMO_TEACHER.username },
  });
  if (existing) {
    const teacher = await prisma.user.update({ where: { id: existing.id }, data });
    await migrateLegacyTeacher(teacher.id);
    return teacher;
  }

  const legacy = await prisma.user.findUnique({
    where: { username: LEGACY_TEACHER_USERNAME },
  });
  if (legacy && legacy.role === 'TEACHER') {
    return prisma.user.update({ where: { id: legacy.id }, data });
  }

  return prisma.user.create({ data });
}

async function ensureStudents() {
  const legacy = await prisma.user.findUnique({
    where: { username: LEGACY_STUDENT_USERNAME },
  });

  if (legacy && legacy.role === 'STUDENT') {
    const target = DEMO_STUDENTS.find((student) => student.username === 'anvarovmuhammadamin');
    const conflict = target
      ? await prisma.user.findUnique({ where: { username: target.username } })
      : null;

    if (target && !conflict) {
      await prisma.user.update({
        where: { id: legacy.id },
        data: {
          firstName: target.firstName,
          lastName: target.lastName,
          username: target.username,
        },
      });
    } else {
      await prisma.session.deleteMany({ where: { userId: legacy.id } });
      await prisma.user.delete({ where: { id: legacy.id } });
    }
  }

  const passwordHashes = await Promise.all(
    DEMO_STUDENTS.map((student) => bcrypt.hash(student.password, 12)),
  );

  const students = [];
  for (let index = 0; index < DEMO_STUDENTS.length; index += 1) {
    const student = DEMO_STUDENTS[index]!;
    const passwordHash = passwordHashes[index]!;
    const user = await prisma.user.upsert({
      where: { username: student.username },
      update: {
        firstName: student.firstName,
        lastName: student.lastName,
        passwordHash,
        role: 'STUDENT',
      },
      create: {
        firstName: student.firstName,
        lastName: student.lastName,
        username: student.username,
        passwordHash,
        role: 'STUDENT',
      },
    });
    students.push(user);
  }

  return students;
}

async function ensureDemoTest(teacherId: string, classroomId: string) {
  let test = await prisma.test.findFirst({
    where: { teacherId, title: DEMO_TEST_TITLE },
  });

  if (!test) {
    test = await prisma.test.create({
      data: {
        title: DEMO_TEST_TITLE,
        teacherId,
        classroomId,
        durationMinutes: 20,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  } else if (test.classroomId !== classroomId) {
    test = await prisma.test.update({
      where: { id: test.id },
      data: { classroomId },
    });
  }

  const existingQuestions = await prisma.question.count({ where: { testId: test.id } });
  if (existingQuestions === 0) {
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

  return test;
}

async function main() {
  const teacher = await ensureTeacher();
  const students = await ensureStudents();

  const classroom = await prisma.classroom.upsert({
    where: { joinCode: DEMO_CLASSROOM.joinCode },
    update: { name: DEMO_CLASSROOM.name, teacherId: teacher.id },
    create: {
      name: DEMO_CLASSROOM.name,
      teacherId: teacher.id,
      joinCode: DEMO_CLASSROOM.joinCode,
    },
  });

  for (const student of students) {
    await prisma.classroomStudent.upsert({
      where: {
        classroomId_studentId: { classroomId: classroom.id, studentId: student.id },
      },
      update: {},
      create: { classroomId: classroom.id, studentId: student.id },
    });
  }

  await ensureDemoTest(teacher.id, classroom.id);

  // Eski demo sessiyalarni yopamiz — yangi login/parol bilan qayta kiriladi.
  await prisma.session.deleteMany({
    where: { userId: { in: [teacher.id, ...students.map((student) => student.id)] } },
  });

  console.log('\nDemo ma’lumotlar tayyor:');
  console.log(`  O‘qituvchi: ${DEMO_TEACHER.username} / ${DEMO_TEACHER.password}`);
  console.log(`  O‘quvchilar: ${DEMO_STUDENTS.length} ta`);
  for (const student of DEMO_STUDENTS) {
    console.log(
      `    - ${student.lastName} ${student.firstName}: ${student.username} / ${student.password}`,
    );
  }
  console.log(`  Sinf kodi:  ${DEMO_CLASSROOM.joinCode}`);
  console.log(`  Demo test:  ${DEMO_TEST_TITLE}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
