import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Avval tizimga kiring.') =>
  new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Bu amal uchun ruxsat yo‘q.') =>
  new ApiError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Ma’lumot topilmadi.') =>
  new ApiError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new ApiError(409, 'CONFLICT', message);

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function zodMessage(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Kiritilgan ma’lumotlar noto‘g‘ri.';
  return first.message;
}
