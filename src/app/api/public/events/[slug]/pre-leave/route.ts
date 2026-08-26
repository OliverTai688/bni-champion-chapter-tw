import { prisma } from '@/server/db/prisma';
import { Prisma } from '@prisma/client';
import { toPublicWeeklyEventDTO } from '@/application/events/mappers';
import { findPublicWeeklyEventBySlug } from '@/server/repositories/weekly-public-event-repository';

const PUBLIC_EVENT_STATUSES = ['published', 'live', 'completed', 'archived'] as const;

export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => null);
  const memberName = typeof body?.memberName === 'string' ? body.memberName.trim() : '';
  const status = typeof body?.status === 'string' ? body.status : '';
  const proxyName = typeof body?.proxyName === 'string' ? body.proxyName.trim() : undefined;

  if (!memberName) {
    return Response.json(
      {
        error: 'invalid_payload',
        message: 'Member name is required.',
      },
      { status: 400 },
    );
  }

  if (!['present', 'absent', 'late', 'proxy'].includes(status)) {
    return Response.json(
      {
        error: 'invalid_payload',
        message: 'Invalid attendance status.',
      },
      { status: 400 },
    );
  }

  try {
    const session = await prisma.meetingSession.findFirst({
      where: {
        publicSlug: slug,
        publicStatus: {
          in: [...PUBLIC_EVENT_STATUSES],
        },
      },
      select: { id: true, metadata: true },
    });

    if (!session) {
      return Response.json(
        {
          error: 'public_event_not_found',
          message: 'This weekly public event is not published or does not exist.',
        },
        { status: 404 },
      );
    }

    const currentMetadata =
      session.metadata && typeof session.metadata === 'object'
        ? (session.metadata as Record<string, unknown>)
        : {};

    const currentOverrides = (currentMetadata.attendanceOverrides && typeof currentMetadata.attendanceOverrides === 'object')
      ? { ...(currentMetadata.attendanceOverrides as Record<string, unknown>) }
      : {};

    if (status === 'present') {
      // Revert override to default
      delete currentOverrides[memberName];
    } else {
      currentOverrides[memberName] = {
        status,
        proxyName: status === 'proxy' ? proxyName || '代理人' : undefined,
      };
    }

    const updatedMetadata = {
      ...currentMetadata,
      attendanceOverrides: currentOverrides,
    };

    await prisma.meetingSession.update({
      where: { id: session.id },
      data: {
        metadata: updatedMetadata as Prisma.InputJsonValue,
      },
    });

    await prisma.operationLog.create({
      data: {
        sessionId: session.id,
        actorRole: 'member',
        actorName: memberName,
        action: `member_pre_leave_${status}`,
        targetType: 'MeetingSession',
        targetId: session.id,
        metadata: {
          memberName,
          status,
          proxyName: status === 'proxy' ? proxyName : undefined,
        },
      },
    });

    // Fetch the updated event with seatMap loaded
    const event = await findPublicWeeklyEventBySlug(slug);
    if (!event) {
      return Response.json({ error: 'event_not_found' }, { status: 404 });
    }

    return Response.json(toPublicWeeklyEventDTO(event));
  } catch (error) {
    return Response.json(
      {
        error: 'pre_leave_failed',
        message: error instanceof Error ? error.message : 'Unable to register pre-leave.',
      },
      { status: 500 },
    );
  }
}
