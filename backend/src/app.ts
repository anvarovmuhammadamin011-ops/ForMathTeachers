import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { config, aiConfigured, backendRoot } from './config.js';
import { pingDatabase } from './db.js';
import { attachAuth } from './middleware/auth.js';
import { originGuard } from './middleware/origin.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { classroomRouter } from './routes/classrooms.js';
import { teacherRouter } from './routes/teacher.js';
import { testRouter } from './routes/tests.js';
import { questionRouter } from './routes/questions.js';
import { attemptRouter } from './routes/attempts.js';
import { studentRouter } from './routes/student.js';
import { filesRouter } from './routes/files.js';
import { asyncHandler } from './lib/errors.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: [config.clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(originGuard);
  app.use(attachAuth);

  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      let database = false;
      try {
        await pingDatabase();
        database = true;
      } catch {
        database = false;
      }
      res.status(database ? 200 : 503).json({
        ok: database,
        database,
        aiConfigured,
        aiModel: config.ai.model,
        ocrEnabled: config.ocr.enabled,
      });
    }),
  );

  app.use('/api/auth', authRouter);
  app.use('/api/files', filesRouter);
  app.use('/api', attemptRouter);
  app.use('/api/classes', classroomRouter);
  app.use('/api/teacher', teacherRouter);
  app.use('/api/tests', testRouter);
  app.use('/api/questions', questionRouter);
  app.use('/api/student', studentRouter);

  // Productionda frontendni shu serverdan tarqatish (ixtiyoriy).
  const frontendDist = path.resolve(backendRoot, '..', 'frontend', 'dist');
  if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
    app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}
