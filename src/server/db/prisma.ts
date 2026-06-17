import 'server-only';

import { PrismaClient } from '@prisma/client';

function normalizeMongoDatabaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) return;

  try {
    const url = new URL(value);
    const appName = url.searchParams.get('appName');
    if (!appName?.includes('?')) return;

    const [normalizedAppName, nestedQuery] = appName.split('?', 2);
    url.searchParams.set('appName', normalizedAppName);

    const nestedParams = new URLSearchParams(nestedQuery);
    for (const [key, nestedValue] of nestedParams) {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, nestedValue);
      }
    }

    process.env.DATABASE_URL = url.toString();
    console.warn('[prisma] normalized DATABASE_URL query parameters');
  } catch {
    console.error('[prisma] DATABASE_URL is not a valid URL');
  }
}

normalizeMongoDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
