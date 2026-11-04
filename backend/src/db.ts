import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/** MongoDB ulanishini tekshiradi (Prisma `$queryRaw` MongoDB’da ishlamaydi). */
export async function pingDatabase(): Promise<void> {
  await prisma.$runCommandRaw({ ping: 1 });
}
