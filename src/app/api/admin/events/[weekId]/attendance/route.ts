import { getLeaderAccess } from '@/server/auth/access';
import { prisma } from '@/server/db/prisma';
import { Prisma } from '@prisma/client';

function unauthorized() {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Google sign-in is required for admin operations.',
    },
    { status: 401 },
  );
}

export async function PATCH(request: Request, context: { params: Promise<{ weekId: string }> }) {
  const access = await getLeaderAccess();
  if (!access) return unauthorized();

  const { weekId } = await context.params;
  const body = await request.json().catch(() => null);
  const overrides = body?.attendanceOverrides;

  if (!overrides || typeof overrides !== 'object') {
    return Response.json(
      {
        error: 'invalid_payload',
        message: 'The attendanceOverrides object is required.',
      },
      { status: 400 },
    );
  }

  try {
    const meetingSession = await prisma.meetingSession.findUnique({
      where: { weekId },
      select: { id: true, metadata: true },
    });

    if (!meetingSession) {
      return Response.json(
        {
          error: 'event_not_found',
          message: `No meeting session found for weekId ${weekId}.`,
        },
        { status: 404 },
      );
    }

    const currentMetadata =
      meetingSession.metadata && typeof meetingSession.metadata === 'object'
        ? (meetingSession.metadata as Record<string, unknown>)
        : {};

    const updatedMetadata = {
      ...currentMetadata,
      attendanceOverrides: overrides,
    };

    await prisma.meetingSession.update({
      where: { id: meetingSession.id },
      data: {
        metadata: updatedMetadata as Prisma.InputJsonValue,
      },
    });

    await prisma.operationLog.create({
      data: {
        sessionId: meetingSession.id,
        actorRole: 'admin',
        actorName: access.name,
        action: 'admin_attendance_overrides_updated',
        targetType: 'MeetingSession',
        targetId: meetingSession.id,
        metadata: {
          overridesCount: Object.keys(overrides).length,
        },
      },
    });

    return Response.json({ success: true, metadata: updatedMetadata });
  } catch (error) {
    return Response.json(
      {
        error: 'database_error',
        message: error instanceof Error ? error.message : 'Unable to update attendance overrides.',
      },
      { status: 500 },
    );
  }
}
