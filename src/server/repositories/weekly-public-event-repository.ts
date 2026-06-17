import 'server-only';

import { prisma } from '@/server/db/prisma';

const PUBLIC_EVENT_STATUSES = ['published', 'live', 'completed', 'archived'] as const;
const PUBLIC_POLL_STATUSES = ['open', 'closed'] as const;

export async function findPublicWeeklyEventBySlug(slug: string) {
  return prisma.meetingSession.findFirst({
    where: {
      publicSlug: slug,
      publicStatus: {
        in: [...PUBLIC_EVENT_STATUSES],
      },
    },
    include: {
      seatMaps: {
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        take: 1,
        include: {
          seats: {
            orderBy: [{ zone: 'asc' }, { position: 'asc' }],
            include: {
              assignments: {
                where: {
                  status: {
                    not: 'released',
                  },
                },
                select: {
                  memberId: true,
                  displayName: true,
                  role: true,
                  status: true,
                },
              },
            },
          },
          assignments: {
            select: {
              status: true,
            },
          },
        },
      },
      livePolls: {
        where: {
          status: {
            in: [...PUBLIC_POLL_STATUSES],
          },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          options: {
            where: {
              isActive: true,
            },
            orderBy: { position: 'asc' },
            select: {
              id: true,
              memberId: true,
              label: true,
              publicDescription: true,
              metadata: true,
            },
          },
          votes: {
            select: {
              optionId: true,
            },
          },
        },
      },
    },
  });
}

export async function updatePublicSeatAttendance(input: {
  slug: string;
  seatId: string;
  checkedIn: boolean;
}) {
  const session = await prisma.meetingSession.findFirst({
    where: {
      publicSlug: input.slug,
      publicStatus: {
        in: [...PUBLIC_EVENT_STATUSES],
      },
    },
    include: {
      seatMaps: {
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        take: 1,
        select: {
          id: true,
          seats: {
            where: { id: input.seatId },
            select: { id: true },
          },
        },
      },
    },
  });

  const seatMap = session?.seatMaps[0];
  const seat = seatMap?.seats[0];
  if (!session || !seatMap || !seat) {
    throw new Error('This seat is not available on the public event page.');
  }

  const updated = await prisma.seatAssignment.updateMany({
    where: {
      seatMapId: seatMap.id,
      seatId: seat.id,
      status: {
        in: ['assigned', 'checked_in'],
      },
    },
    data: {
      status: input.checkedIn ? 'checked_in' : 'assigned',
    },
  });

  if (updated.count === 0) {
    throw new Error('This seat does not have an active assignment.');
  }

  await prisma.operationLog.create({
    data: {
      sessionId: session.id,
      actorRole: 'staff',
      actorName: 'public-attendance',
      action: input.checkedIn ? 'public_attendance_checked_in' : 'public_attendance_unchecked',
      targetType: 'Seat',
      targetId: seat.id,
      metadata: {
        seatId: seat.id,
        checkedIn: input.checkedIn,
      },
    },
  });

  return findPublicWeeklyEventBySlug(input.slug);
}
