/**
 * MongoDB connector'i Prisma enum'larni qo'llab-quvvatlamaydi.
 * Sxemada bu maydonlar `String` sifatida saqlanadi, ruxsat etilgan
 * qiymatlar esa shu yerda tiplangan — kodda literal xatolarni ushlash uchun.
 */

export type Role = 'TEACHER' | 'STUDENT';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  schoolName?: string | null;
}

export type TestStatus = 'DRAFT' | 'PROCESSING' | 'READY' | 'PUBLISHED';

export type VerificationStatus = 'VERIFIED' | 'NEEDS_REVIEW';

export type ApprovalStatus = 'PENDING' | 'APPROVED';

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED';

export type JobStatus =
  | 'QUEUED'
  | 'READING'
  | 'EXTRACTING'
  | 'SOLVING'
  | 'VERIFYING'
  | 'BUILDING'
  | 'COMPLETED'
  | 'FAILED';
