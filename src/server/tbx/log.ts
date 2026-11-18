import 'server-only';

import type { OperationActorRole, Prisma } from '@prisma/client';
import { after } from 'next/server';
import { prisma } from '@/server/db/prisma';

/**
 * Records an operation in the audit trail. Inside a request the write runs
 * after the response is sent, so the user never waits on it; outside one
 * (scripts) it is awaited.
 */
export async function logOperation(input: {
  sessionId?: string | null;
  actorRole: OperationActorRole;
  actorName?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const write = async () => {
    try {
      await prisma.operationLog.create({
        data: {
          sessionId: input.sessionId ?? undefined,
          actorRole: input.actorRole,
          actorName: input.actorName ?? undefined,
          action: input.action,
          targetType: input.targetType,
          targetId: input.targetId ?? undefined,
          reason: input.reason ?? undefined,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      // Logging must never break the user's action.
      console.error('[tbx] failed to write operation log', error);
    }
  };

  try {
    after(write);
  } catch {
    await write();
  }
}
