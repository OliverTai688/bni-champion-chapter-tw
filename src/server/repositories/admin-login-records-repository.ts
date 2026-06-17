import 'server-only';

import { prisma } from '@/server/db/prisma';

const GOOGLE_LOGIN_ACTION = 'google_login';

export interface AdminLoginRecordDTO {
  id: string;
  name: string | null;
  email: string | null;
  provider: string;
  createdAt: string;
}

function readMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

export async function recordGoogleLogin(user: { name?: string | null; email?: string | null }) {
  await prisma.operationLog.create({
    data: {
      actorRole: 'admin',
      actorName: user.name ?? user.email ?? 'google-user',
      action: GOOGLE_LOGIN_ACTION,
      targetType: 'AuthSession',
      metadata: {
        provider: 'google',
        name: user.name ?? null,
        email: user.email ?? null,
      },
    },
  });
}

export async function listGoogleLoginRecords(limit = 50): Promise<AdminLoginRecordDTO[]> {
  const records = await prisma.operationLog.findMany({
    where: {
      action: GOOGLE_LOGIN_ACTION,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    select: {
      id: true,
      actorName: true,
      metadata: true,
      createdAt: true,
    },
  });

  return records.map((record) => ({
    id: record.id,
    name: readMetadataString(record.metadata, 'name') ?? record.actorName,
    email: readMetadataString(record.metadata, 'email'),
    provider: readMetadataString(record.metadata, 'provider') ?? 'google',
    createdAt: record.createdAt.toISOString(),
  }));
}
