import { PrismaClient } from '@prisma/client';

declare const process: any;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const unsafeUnscopedClient = globalForPrisma.prisma ?? new PrismaClient();

if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  globalForPrisma.prisma = unsafeUnscopedClient;
}

export * from './scoped';
export * from '@prisma/client';
