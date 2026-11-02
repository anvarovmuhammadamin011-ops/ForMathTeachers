import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Same-origin himoyasi: cookie SameSite=Lax + Origin tekshiruvi.
 * Brauzerdan kelgan mutatsion so'rovlar faqat ruxsat etilgan frontend manzilidan bo'ladi.
 */
export function originGuard(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING.has(req.method)) return next();
  const origin = req.headers.origin;
  if (!origin) return next(); // CLI/curl — cookie o'g'irlash xavfi yo'q
  const allowed = new Set([config.clientOrigin]);
  const host = req.headers.host;
  if (host) {
    allowed.add(`${req.protocol}://${host}`);
    allowed.add(`http://${host}`);
    allowed.add(`https://${host}`);
  }
  if (!allowed.has(origin)) {
    res.status(403).json({
      error: { code: 'ORIGIN_FORBIDDEN', message: 'So‘rov manzili ruxsat etilmagan.' },
    });
    return;
  }
  next();
}
