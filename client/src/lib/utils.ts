import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}

export function initials(person: { firstName: string; lastName: string }): string {
  return `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
}

const dateFormatter = new Intl.DateTimeFormat('uz-UZ', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('uz-UZ', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function formatScore(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 daqiqa';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${rest} soniya`;
  if (rest === 0) return `${minutes} daqiqa`;
  return `${minutes} daq ${rest} son`;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function scoreTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'danger';
}

export const optionLabels = ['A', 'B', 'C', 'D'] as const;

export const testStatusLabels: Record<string, string> = {
  DRAFT: 'Qoralama',
  PROCESSING: 'Ishlanmoqda',
  READY: 'Tekshiruvda',
  PUBLISHED: 'Nashr qilingan',
};

export const jobStatusLabels: Record<string, string> = {
  QUEUED: 'Navbatda',
  READING: 'PDF yuklanmoqda',
  EXTRACTING: 'Savollar aniqlanmoqda',
  SOLVING: 'AI masalalarni yechmoqda',
  VERIFYING: 'Javoblar tekshirilmoqda',
  BUILDING: 'Test tayyorlanmoqda',
  COMPLETED: 'Tayyor',
  FAILED: 'Xatolik',
};

export const processingSteps = [
  { key: 'READING', label: 'PDF yuklanmoqda', icon: 'upload' },
  { key: 'EXTRACTING', label: 'Savollar aniqlanmoqda', icon: 'scan' },
  { key: 'SOLVING', label: 'AI masalalarni yechmoqda', icon: 'brain' },
  { key: 'VERIFYING', label: 'Javoblar tekshirilmoqda', icon: 'shield' },
  { key: 'BUILDING', label: 'Test tayyorlanmoqda', icon: 'check' },
] as const;

export function stepState(
  jobStatus: string | undefined,
  stepKey: string,
): 'done' | 'active' | 'waiting' | 'failed' {
  if (!jobStatus) return 'waiting';
  if (jobStatus === 'COMPLETED') return 'done';
  if (jobStatus === 'FAILED') return 'failed';
  const order = ['QUEUED', 'READING', 'EXTRACTING', 'SOLVING', 'VERIFYING', 'BUILDING'];
  const currentIndex = order.indexOf(jobStatus);
  const stepIndex = order.indexOf(stepKey);
  if (currentIndex > stepIndex) return 'done';
  if (currentIndex === stepIndex) return 'active';
  return 'waiting';
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
