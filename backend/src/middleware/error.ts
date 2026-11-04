import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { ApiError, zodMessage } from '../lib/errors.js';
import { ZodError } from 'zod';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Manzil topilmadi.' } });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: zodMessage(error), details: error.flatten() },
    });
    return;
  }

  if (error instanceof MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'PDF fayl hajmi juda katta.'
        : 'Fayl yuklashda xatolik yuz berdi.';
    res.status(400).json({ error: { code: 'UPLOAD_ERROR', message } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({
        error: { code: 'DUPLICATE', message: 'Bu ma’lumot allaqachon mavjud.' },
      });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ma’lumot topilmadi.' } });
      return;
    }
  }

  console.error('[server:xato]', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Serverda kutilmagan xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.',
    },
  });
}
