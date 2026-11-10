export type Role = 'TEACHER' | 'STUDENT';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: Role;
  schoolName: string | null;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  schoolName?: string | null;
}

export interface StudentClassroom {
  id: string;
  name: string;
  teacherName?: string;
}

export interface ClassroomSummary {
  id: string;
  name: string;
  joinCode: string;
  studentCount: number;
  testCount: number;
  createdAt: string;
}

export type TestStatus = 'DRAFT' | 'PROCESSING' | 'READY' | 'PUBLISHED';
export type JobStatus =
  | 'QUEUED'
  | 'READING'
  | 'EXTRACTING'
  | 'SOLVING'
  | 'VERIFYING'
  | 'BUILDING'
  | 'COMPLETED'
  | 'FAILED';
export type VerificationStatus = 'VERIFIED' | 'NEEDS_REVIEW';
export type ApprovalStatus = 'PENDING' | 'APPROVED';

export interface JobInfo {
  id?: string;
  status: JobStatus;
  progress: number;
  pageCount?: number;
  errorMessage: string | null;
}

export interface TestListItem {
  id: string;
  title: string;
  status: TestStatus;
  classroom: { id: string; name: string };
  durationMinutes: number;
  questionCount: number;
  approvedCount: number;
  verifiedCount: number;
  attemptCount: number;
  job: JobInfo | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface Question {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  solution: string;
  verificationStatus: VerificationStatus;
  verificationMethod: string | null;
  verificationNote: string | null;
  approvalStatus: ApprovalStatus;
  sourcePage: number;
  order: number;
  pageImageUrl: string | null;
  diagramBBox: { x: number; y: number; w: number; h: number } | null;
}

export interface TestDetail {
  test: {
    id: string;
    title: string;
    status: TestStatus;
    durationMinutes: number;
    classroom: { id: string; name: string };
    createdAt: string;
    publishedAt: string | null;
  };
  job: JobInfo | null;
  questions: Question[];
  classrooms: Array<{ id: string; name: string }>;
  summary: { total: number; verified: number; needsReview: number; approved: number };
}

export interface TeacherDashboard {
  stats: {
    totalTests: number;
    totalStudents: number;
    activeTests: number;
    averageScore: number;
  };
  recentTests: Array<{
    id: string;
    title: string;
    status: TestStatus;
    className: string;
    questionCount: number;
    createdAt: string;
    attemptCount: number;
  }>;
  classrooms: ClassroomSummary[];
}

export interface StudentTestItem {
  id: string;
  title: string;
  classroom: { id: string; name: string };
  teacherName: string;
  durationMinutes: number;
  questionCount: number;
  publishedAt: string | null;
  attempt: {
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED';
    scorePercentage: number;
    submittedAt: string | null;
    expiresAt: string;
  } | null;
}

export interface StudentDashboard {
  student: { firstName: string; lastName: string; username: string };
  classroom: { id: string; name: string; teacherName: string } | null;
  classrooms: StudentClassroom[];
  stats: {
    available: number;
    completed: number;
    averageScore: number;
    rank: number | null;
    totalStudents: number;
  };
  tests: StudentTestItem[];
  recentResults: Array<{
    attemptId: string;
    testTitle: string;
    className: string;
    scorePercentage: number;
    submittedAt: string | null;
  }>;
}

export interface AttemptQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  sourcePage: number;
  pageImageUrl: string | null;
  diagramBBox: { x: number; y: number; w: number; h: number } | null;
}

export interface AttemptData {
  id: string;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startedAt: string;
  expiresAt: string;
  durationMinutes: number;
  submittedAt: string | null;
  test: { id: string; title: string };
  answers: Array<{ questionId: string; selectedOption: number }>;
  questions: AttemptQuestion[];
}

export interface ResultData {
  attempt: {
    id: string;
    startedAt: string;
    submittedAt: string | null;
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    scorePercentage: number;
    timeSpentSeconds: number;
  };
  test: {
    id: string;
    title: string;
    classroom: { id: string; name: string };
    teacherName: string;
  };
  student: { id: string; firstName: string; lastName: string };
  questions: Array<{
    id: string;
    order: number;
    questionNumber: number;
    questionText: string;
    options: string[];
    correctAnswer: number;
    solution: string;
    sourcePage: number;
    selectedOption: number | null;
    isCorrect: boolean;
  }>;
}

export interface RankingRow {
  rank: number | null;
  studentId: string;
  studentName: string;
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
  timeSpentSeconds: number;
  submittedAt: string | null;
}

export interface OverallRankingRow {
  rank: number | null;
  studentId: string;
  studentName: string;
  testsCompleted: number;
  averageScore: number;
}

export interface ClassroomRanking {
  classroom: {
    id: string;
    name: string;
    teacherName: string;
    studentCount: number;
    totalTests: number;
  };
  rows: OverallRankingRow[];
}

export interface TestResults {
  test: {
    id: string;
    title: string;
    status: TestStatus;
    classroom: { id: string; name: string };
    durationMinutes: number;
    questionCount: number;
  };
  stats: {
    submissions: number;
    inProgress: number;
    averageScore: number;
    highestScore: number;
  };
  ranking: RankingRow[];
  attempts: Array<{
    id: string;
    studentName: string;
    username: string;
    status: 'IN_PROGRESS' | 'SUBMITTED';
    scorePercentage: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    timeSpentSeconds: number;
    startedAt: string;
    submittedAt: string | null;
    rank: number | null;
  }>;
}

export interface StudentResultsResponse {
  averageScore: number;
  results: Array<{
    attemptId: string;
    testId: string;
    testTitle: string;
    classroom: { id: string; name: string };
    teacherName: string;
    questionCount: number;
    correctCount: number;
    incorrectCount: number;
    unansweredCount: number;
    scorePercentage: number;
    timeSpentSeconds: number;
    submittedAt: string | null;
    rank: number | null;
  }>;
}
