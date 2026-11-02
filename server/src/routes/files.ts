import path from 'node:path';
import fs from 'node:fs/promises';
import { Router } from 'express';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, forbidden, notFound } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

export const filesRouter = Router();

filesRouter.use(requireAuth);

filesRouter.get(
  '/*',
  asyncHandler(async (req, res) => {
    const raw = ((req.params as { 0?: string })[0] ?? '').replace(/\\/g, '/');
    const match = raw.match(/^pages\/([A-Za-z0-9_-]+)\/(page-\d+\.png)$/);
    if (!match) throw notFound();

    const [, jobId, fileName] = match;
    const job = await prisma.pDFProcessingJob.findUnique({
      where: { id: jobId! },
      include: { test: { select: { teacherId: true, classroomId: true } } },
    });
    if (!job) throw notFound('Fayl topilmadi.');

    const auth = req.auth!;
    if (auth.role === 'TEACHER') {
      if (job.test.teacherId !== auth.userId) throw forbidden();
    } else {
      const membership = await prisma.classroomStudent.findUnique({
        where: {
          classroomId_studentId: {
            classroomId: job.test.classroomId,
            studentId: auth.userId,
          },
        },
      });
      if (!membership) throw forbidden();
    }

    const filePath = path.resolve(config.uploadsDir, 'pages', jobId!, fileName!);
    try {
      const buffer = await fs.readFile(filePath);
      res.type('image/png');
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.send(buffer);
    } catch {
      throw notFound('Fayl topilmadi.');
    }
  }),
);
