import 'server-only';

import type { OperationActorRole, Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';

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
}
