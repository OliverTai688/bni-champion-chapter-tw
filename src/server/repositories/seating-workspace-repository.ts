import 'server-only';

import { Prisma } from '@prisma/client';
import type { NormalizedSeatingDraft } from '@/application/seating/save-draft';
import { prisma } from '@/server/db/prisma';

const DRAFT_SOURCE = 'browser-draft';
const LAYOUT_KIND = 'bni-weekly-grid';
const DRAFT_PUBLIC_SLUG_PREFIX = '__draft__';

function draftPublicSlug(weekId: string) {
  return `${DRAFT_PUBLIC_SLUG_PREFIX}${weekId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export async function findLatestSeatMapByWeekId(weekId: string) {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId },
    include: {
      seatMaps: {
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        take: 1,
        include: {
          session: true,
          seats: {
            orderBy: [{ zone: 'asc' }, { position: 'asc' }],
            include: {
              assignments: {
                where: {
                  status: {
                    not: 'released',
                  },
                },
                orderBy: { updatedAt: 'desc' },
              },
            },
          },
          assignments: true,
          revisions: {
            orderBy: { version: 'desc' },
            take: 5,
          },
        },
      },
    },
  });

  return session?.seatMaps[0] ?? null;
}

function seatKind(seat: { isGuest: boolean; isHost?: boolean; isSound?: boolean; isDuty?: boolean; role?: string } | null) {
  if (!seat) return 'empty';
  if (seat.isGuest) return 'guest';
  if (seat.isHost) return 'host';
  if (seat.isSound) return 'sound';
  if (seat.isDuty) return 'duty';
  if (seat.role === '代理') return 'proxy';
  return 'member';
}

function assignmentRole(seat: { isGuest: boolean; isHost?: boolean; isSound?: boolean; isDuty?: boolean; role?: string } | null) {
  if (!seat) return null;
  return seat.role ?? (seat.isSound ? '音控' : seat.isDuty ? '值日生' : seat.isHost ? '執事' : seat.isGuest ? '來賓' : '會員');
}

function collectMemberNames(draft: NormalizedSeatingDraft) {
  return new Set([
    ...draft.topRoles.map((seat) => seat.name),
    ...draft.items.filter((seat): seat is NonNullable<typeof seat> => Boolean(seat)).map((seat) => seat.name),
    ...draft.memberRoster,
  ].map((name) => name.trim()).filter(Boolean));
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function saveSeatingDraft(draft: NormalizedSeatingDraft) {
  const session = await prisma.meetingSession.upsert({
    where: { weekId: draft.week.id },
    create: {
      weekId: draft.week.id,
      date: new Date(draft.week.date),
      title: draft.week.title,
      chapterName: draft.week.chapterName,
      meetingLabel: draft.week.meetingLabel,
      source: draft.week.source,
      status: 'draft',
      publicSlug: draftPublicSlug(draft.week.id),
      metadata: {
        savedFrom: 'seating-workspace',
      },
    },
    update: {
      date: new Date(draft.week.date),
      title: draft.week.title,
      chapterName: draft.week.chapterName,
      meetingLabel: draft.week.meetingLabel,
      source: draft.week.source,
    },
  });

  const memberIds = new Map<string, string>();
  for (const displayName of collectMemberNames(draft)) {
    const member = await prisma.member.upsert({
      where: { displayName },
      create: {
        displayName,
        roles: [],
        metadata: { savedFrom: 'seating-workspace' },
      },
      update: {
        isActive: true,
      },
      select: { id: true, displayName: true },
    });
    memberIds.set(member.displayName, member.id);
  }

  const existingDraft = await prisma.seatMap.findFirst({
    where: {
      sessionId: session.id,
      source: DRAFT_SOURCE,
      layoutKind: LAYOUT_KIND,
    },
    include: {
      revisions: {
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  const nextVersion = (existingDraft?.revisions[0]?.version ?? 0) + 1;
  const seatMap = existingDraft
    ? await prisma.seatMap.update({
        where: { id: existingDraft.id },
        data: {
          title: draft.week.title,
          version: nextVersion,
          topRoles: toJsonValue(draft.topRoles),
          memberRoster: draft.memberRoster,
          heroes: draft.heroes,
          industryChains: toJsonValue(draft.industryChains),
          status: 'draft',
        },
      })
    : await prisma.seatMap.create({
        data: {
          sessionId: session.id,
          title: draft.week.title,
          version: nextVersion,
          status: 'draft',
          layoutKind: LAYOUT_KIND,
          topRoles: toJsonValue(draft.topRoles),
          memberRoster: draft.memberRoster,
          heroes: draft.heroes,
          industryChains: toJsonValue(draft.industryChains),
          source: DRAFT_SOURCE,
        },
      });

  await prisma.seatAssignment.deleteMany({ where: { seatMapId: seatMap.id } });
  await prisma.seat.deleteMany({ where: { seatMapId: seatMap.id } });

  const createdSeatIds = new Map<number, string>();

  for (let index = 0; index < draft.topRoles.length; index++) {
    const seat = draft.topRoles[index];
    const createdSeat = await prisma.seat.create({
      data: {
        seatMapId: seatMap.id,
        seatKey: `top-${index}`,
        row: null,
        col: index,
        zone: 'top',
        position: index,
        kind: 'host_team',
        label: seat.role ?? null,
        metadata: toJsonValue(seat),
      },
      select: { id: true },
    });
    await prisma.seatAssignment.create({
      data: {
        seatMapId: seatMap.id,
        seatId: createdSeat.id,
        memberId: memberIds.get(seat.name.trim()),
        displayName: seat.name,
        role: seat.role ?? null,
        status: 'assigned',
        source: DRAFT_SOURCE,
      },
    });
  }

  for (let index = 0; index < draft.items.length; index++) {
    const seat = draft.items[index];
    const row = Math.floor(index / 4);
    const col = index % 4;
    const createdSeat = await prisma.seat.create({
      data: {
        seatMapId: seatMap.id,
        seatKey: `main-${row}-${col}`,
        row,
        col,
        zone: 'main',
        position: index,
        kind: seatKind(seat),
        label: seat?.guestNumber ?? seat?.role ?? null,
        metadata: toJsonValue(seat),
      },
      select: { id: true },
    });
    createdSeatIds.set(index, createdSeat.id);

    if (seat) {
      await prisma.seatAssignment.create({
        data: {
          seatMapId: seatMap.id,
          seatId: createdSeat.id,
          memberId: memberIds.get(seat.name.trim()),
          displayName: seat.name,
          role: assignmentRole(seat),
          guestNumber: seat.guestNumber ?? null,
          hostFor: seat.hostFor ?? null,
          status: 'assigned',
          source: DRAFT_SOURCE,
        },
      });
    }
  }

  await prisma.seatMapRevision.create({
    data: {
      seatMapId: seatMap.id,
      version: nextVersion,
      snapshot: toJsonValue({
        week: draft.week,
        topRoles: draft.topRoles,
        items: draft.items,
        memberRoster: draft.memberRoster,
        heroes: draft.heroes,
        industryChains: draft.industryChains,
        updatedAt: draft.updatedAt,
      }),
      validationSummary: draft.validationSummary ? toJsonValue(draft.validationSummary) : undefined,
      createdBy: 'seating-workspace',
      reason: draft.reason,
    },
  });

  await prisma.operationLog.create({
    data: {
      sessionId: session.id,
      actorRole: 'admin',
      actorName: 'seating-workspace',
      action: 'seating_draft_saved',
      targetType: 'SeatMap',
      targetId: seatMap.id,
      reason: draft.reason,
      metadata: toJsonValue({
        version: nextVersion,
        occupiedSeats: draft.items.filter(Boolean).length,
        totalSeats: draft.items.length + draft.topRoles.length,
      }),
    },
  });

  return {
    seatMapId: seatMap.id,
    version: nextVersion,
    savedAt: new Date().toISOString(),
    totalSeats: createdSeatIds.size + draft.topRoles.length,
    assignedSeats: draft.items.filter(Boolean).length + draft.topRoles.length,
  };
}
