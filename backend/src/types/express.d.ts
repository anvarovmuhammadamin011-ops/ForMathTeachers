import type { Role } from './domain.js';

export interface AuthContext {
  userId: string;
  role: Role;
  firstName: string;
  lastName: string;
  username: string;
  schoolName: string | null;
  sessionId: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
