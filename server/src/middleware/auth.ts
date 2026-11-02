import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { currentUserFromToken } from '../services/authService.js';

export async function attachAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[config.sessionCookie] as string | undefined;
    const session = await currentUserFromToken(token);
    if (session) {
      req.auth = {
        userId: session.userId,
        role: session.user.role,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        username: session.user.username,
        schoolName: session.user.schoolName,
        sessionId: session.id,
      };
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    next(unauthorized());
    return;
  }
  next();
}

export function requireTeacher(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());
  if (req.auth.role !== 'TEACHER') {
    return next(forbidden('Bu amal faqat o‘qituvchilar uchun.'));
  }
  next();
}

export function requireStudent(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(unauthorized());
  if (req.auth.role !== 'STUDENT') {
    return next(forbidden('Bu amal faqat o‘quvchilar uchun.'));
  }
  next();
}
