import 'server-only';

import { randomBytes } from 'node:crypto';
import { Prisma, type Participation, type ParticipationStatus } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { findLatestSeatMapByWeekId } from '@/server/repositories/seating-workspace-repository';
import { listChapterMembers } from '@/server/tbx/members';

type LegacyOverride = { status?: string; proxyName?: string };
type LegacyOverrides = Record<string, LegacyOverride>;

function readOverrides(metadata: unknown): LegacyOverrides {
  if (!metadata || typeof metadata !== 'object') return {};
  const value = (metadata as Record<string, unknown>).attendanceOverrides;
  if (!value || typeof value !== 'object') return {};
  return value as LegacyOverrides;
}

function memberKey(memberId: string) {
  return `m:${memberId}`;
}

function guestKey() {
  return `g:${randomBytes(6).toString('hex')}`;
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Makes sure every active chapter member has a Participation row for the event
 * and pulls in facts recorded by the older pages (pre-leave overrides stored in
 * session metadata, check-ins stored on seat assignments, guests on the seat map).
 *
 * Legacy facts only fill rows that are still untouched, so nothing a leader
 * changed on the new pages is overwritten.
 */
export async function ensureParticipations(sessionId: string) {
  const session = await prisma.meetingSession.findUnique({
    where: { id: sessionId },
    select: { id: true, weekId: true, metadata: true },
  });
  if (!session) return;

  const members = await listChapterMembers();
  const existing = await prisma.participation.findMany({ where: { sessionId } });
  const byKey = new Map(existing.map((row) => [row.key, row]));

  for (const member of members) {
    const key = memberKey(member.id);
    if (byKey.has(key)) continue;
    try {
      const created = await prisma.participation.create({
        data: { sessionId, key, kind: 'member', memberId: member.id, displayName: member.displayName },
      });
      byKey.set(key, created);
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
    }
  }

  const memberByName = new Map(members.map((member) => [member.displayName.trim(), member]));

  // 1. Pre-leave / admin overrides from the older attendance editor.
  const overrides = readOverrides(session.metadata);
  for (const [name, override] of Object.entries(overrides)) {
    const member = memberByName.get(name.trim());
    if (!member) continue;
    const row = byKey.get(memberKey(member.id));
    if (!row || row.status !== 'expected' || row.intentAt) continue;

    const next = legacyStatus(override.status);
    if (!next) continue;
    const updated = await prisma.participation.update({
      where: { id: row.id },
      data: {
        status: next,
        substituteName: next === 'substitute' ? override.proxyName ?? '代理人' : null,
        intentSource: 'legacy_override',
        intentAt: new Date(),
      },
    });
    byKey.set(updated.key, updated);
  }

  // 2. Check-ins and guests from the seat map.
  const seatMap = await findLatestSeatMapByWeekId(session.weekId).catch(() => null);
  if (seatMap) {
    const hostByGuestNumber = new Map<string, string>();
    for (const seat of seatMap.seats) {
      const assignment = seat.assignments[0];
      if (assignment?.hostFor && assignment.memberId) hostByGuestNumber.set(assignment.hostFor, assignment.memberId);
    }

    for (const seat of seatMap.seats) {
      const assignment = seat.assignments[0];
      if (!assignment) continue;

      if (seat.kind === 'guest') {
        const name = assignment.displayName.trim();
        if (!name) continue;
        const already = [...byKey.values()].find((row) => row.kind === 'guest' && row.displayName === name);
        if (already) {
          if (assignment.status === 'checked_in' && already.status === 'expected') {
            const updated = await prisma.participation.update({
              where: { id: already.id },
              data: { status: 'present', checkedInAt: new Date(), checkInMethod: 'legacy_seat' },
            });
            byKey.set(updated.key, updated);
          }
          continue;
        }
        const created = await prisma.participation.create({
          data: {
            sessionId,
            key: guestKey(),
            kind: 'guest',
            displayName: name,
            status: assignment.status === 'checked_in' ? 'present' : 'expected',
            checkedInAt: assignment.status === 'checked_in' ? new Date() : null,
            checkInMethod: assignment.status === 'checked_in' ? 'legacy_seat' : null,
            hostMemberId: assignment.guestNumber ? hostByGuestNumber.get(assignment.guestNumber) ?? null : null,
            note: assignment.guestNumber ?? null,
          },
        });
        byKey.set(created.key, created);
        continue;
      }

      if (assignment.status !== 'checked_in') continue;
      const member = assignment.memberId
        ? members.find((item) => item.id === assignment.memberId)
        : memberByName.get(assignment.displayName.trim());
      if (!member) continue;
      const row = byKey.get(memberKey(member.id));
      if (!row || row.status !== 'expected') continue;
      const updated = await prisma.participation.update({
        where: { id: row.id },
        data: { status: 'present', checkedInAt: new Date(), checkInMethod: 'legacy_seat' },
      });
      byKey.set(updated.key, updated);
    }
  }
}

function legacyStatus(value: string | undefined): ParticipationStatus | null {
  if (value === 'absent') return 'absent';
  if (value === 'proxy') return 'substitute';
  if (value === 'late') return 'late';
  if (value === 'present') return 'present';
  return null;
}

/**
 * Keeps the older pages (public seat map, Excel export) in step while both
 * generations of pages are live. Best effort: failures are logged, not thrown.
 */
async function mirrorToLegacy(row: Participation) {
  if (row.kind !== 'member') return;
  try {
    const session = await prisma.meetingSession.findUnique({
      where: { id: row.sessionId },
      select: { id: true, weekId: true, metadata: true },
    });
    if (!session) return;

    const metadata =
      session.metadata && typeof session.metadata === 'object' ? { ...(session.metadata as Record<string, unknown>) } : {};
    const overrides = { ...readOverrides(session.metadata) } as Record<string, LegacyOverride>;

    if (row.status === 'absent' || row.status === 'medical') {
      overrides[row.displayName] = { status: 'absent' };
    } else if (row.status === 'substitute') {
      overrides[row.displayName] = { status: 'proxy', proxyName: row.substituteName ?? '代理人' };
    } else if (row.status === 'late') {
      overrides[row.displayName] = { status: 'late' };
    } else {
      delete overrides[row.displayName];
    }

    await prisma.meetingSession.update({
      where: { id: session.id },
      data: { metadata: { ...metadata, attendanceOverrides: overrides } as Prisma.InputJsonValue },
    });

    if (row.memberId) {
      const seatMap = await findLatestSeatMapByWeekId(session.weekId).catch(() => null);
      const assignment = seatMap?.seats
        .flatMap((seat) => seat.assignments)
        .find((item) => item.memberId === row.memberId || item.displayName.trim() === row.displayName);
      if (assignment) {
        const checkedIn = row.status === 'present' || row.status === 'late';
        const nextStatus = checkedIn ? 'checked_in' : 'assigned';
        if (assignment.status !== nextStatus && (assignment.status === 'assigned' || assignment.status === 'checked_in')) {
          await prisma.seatAssignment.update({ where: { id: assignment.id }, data: { status: nextStatus } });
        }
      }
    }
  } catch (error) {
    console.error('[tbx] failed to mirror participation to legacy stores', error);
  }
}

export type IntentChoice = 'present' | 'absent' | 'substitute';

/** A member (or a leader on their behalf) says whether they will attend. */
export async function registerIntent(input: {
  sessionId: string;
  memberId: string;
  choice: IntentChoice;
  substituteName?: string | null;
  source: string;
}) {
  await ensureParticipations(input.sessionId);
  const row = await prisma.participation.findUnique({
    where: { sessionId_key: { sessionId: input.sessionId, key: memberKey(input.memberId) } },
  });
  if (!row) throw new Error('找不到這位會員在本場活動的紀錄。');
  if (input.choice === 'substitute' && !input.substituteName?.trim()) throw new Error('請填寫代理人姓名。');

  const status: ParticipationStatus =
    input.choice === 'absent' ? 'absent' : input.choice === 'substitute' ? 'substitute' : 'expected';

  const updated = await prisma.participation.update({
    where: { id: row.id },
    data: {
      status,
      substituteName: input.choice === 'substitute' ? input.substituteName!.trim() : null,
      substituteArrivedAt: null,
      checkedInAt: null,
      checkInMethod: null,
      intentSource: input.source,
      intentAt: new Date(),
    },
  });
  await mirrorToLegacy(updated);
  return updated;
}

/** Marks a member or guest as arrived. `late` records a late arrival. */
export async function checkIn(input: { participationId: string; method: string; late?: boolean }) {
  const row = await prisma.participation.findUnique({ where: { id: input.participationId } });
  if (!row) throw new Error('找不到這筆出席紀錄。');
  const updated = await prisma.participation.update({
    where: { id: row.id },
    data: {
      status: input.late ? 'late' : 'present',
      substituteName: null,
      substituteArrivedAt: null,
      checkedInAt: new Date(),
      checkInMethod: input.method,
    },
  });
  await mirrorToLegacy(updated);
  return updated;
}

/** The substitute of a member arrives. Registers the substitute first when none was named. */
export async function checkInSubstitute(input: { participationId: string; substituteName?: string | null; method: string }) {
  const row = await prisma.participation.findUnique({ where: { id: input.participationId } });
  if (!row || row.kind !== 'member') throw new Error('找不到這位會員的出席紀錄。');
  const name = input.substituteName?.trim() || row.substituteName;
  if (!name) throw new Error('請填寫代理人姓名。');
  const updated = await prisma.participation.update({
    where: { id: row.id },
    data: {
      status: 'substitute',
      substituteName: name,
      substituteArrivedAt: new Date(),
      checkInMethod: input.method,
      intentAt: row.intentAt ?? new Date(),
      intentSource: row.intentSource ?? input.method,
    },
  });
  await mirrorToLegacy(updated);
  return updated;
}

/** Back to "not arrived". Keeps a registered substitute or leave. */
export async function undoCheckIn(participationId: string) {
  const row = await prisma.participation.findUnique({ where: { id: participationId } });
  if (!row) throw new Error('找不到這筆出席紀錄。');
  const data: Prisma.ParticipationUpdateInput =
    row.status === 'substitute'
      ? { substituteArrivedAt: null }
      : { status: 'expected', checkedInAt: null, checkInMethod: null };
  const updated = await prisma.participation.update({ where: { id: row.id }, data });
  await mirrorToLegacy(updated);
  return updated;
}

/** Leader override of any field on the attendance table. */
export async function setParticipationStatus(input: {
  participationId: string;
  status: ParticipationStatus;
  substituteName?: string | null;
  substituteArrived?: boolean;
  note?: string | null;
}) {
  const row = await prisma.participation.findUnique({ where: { id: input.participationId } });
  if (!row) throw new Error('找不到這筆出席紀錄。');
  if (input.status === 'substitute' && row.kind !== 'member') throw new Error('只有會員可以登記代理人。');
  if (input.status === 'substitute' && !(input.substituteName ?? row.substituteName)?.trim()) {
    throw new Error('請填寫代理人姓名。');
  }

  const arrived = input.status === 'present' || input.status === 'late';
  const updated = await prisma.participation.update({
    where: { id: row.id },
    data: {
      status: input.status,
      substituteName: input.status === 'substitute' ? (input.substituteName ?? row.substituteName)!.trim() : null,
      substituteArrivedAt:
        input.status === 'substitute' ? (input.substituteArrived ? row.substituteArrivedAt ?? new Date() : null) : null,
      checkedInAt: arrived ? row.checkedInAt ?? new Date() : null,
      checkInMethod: arrived ? row.checkInMethod ?? 'staff' : null,
      intentAt: input.status === 'expected' ? null : row.intentAt ?? new Date(),
      intentSource: input.status === 'expected' ? null : row.intentSource ?? 'staff',
      note: input.note === undefined ? row.note : input.note,
    },
  });
  await mirrorToLegacy(updated);
  return updated;
}

export async function addGuest(input: {
  sessionId: string;
  displayName: string;
  guestIndustry?: string | null;
  guestCompany?: string | null;
  hostMemberId?: string | null;
  invitedByMemberId?: string | null;
  note?: string | null;
  arrived?: boolean;
  method?: string;
}) {
  const name = input.displayName.trim();
  if (!name) throw new Error('請填寫來賓姓名。');
  return prisma.participation.create({
    data: {
      sessionId: input.sessionId,
      key: guestKey(),
      kind: 'guest',
      displayName: name,
      guestIndustry: input.guestIndustry ?? null,
      guestCompany: input.guestCompany ?? null,
      hostMemberId: input.hostMemberId ?? null,
      invitedByMemberId: input.invitedByMemberId ?? null,
      note: input.note ?? null,
      status: input.arrived ? 'present' : 'expected',
      checkedInAt: input.arrived ? new Date() : null,
      checkInMethod: input.arrived ? input.method ?? 'self' : null,
    },
  });
}

export async function updateGuest(input: {
  participationId: string;
  displayName: string;
  guestIndustry?: string | null;
  guestCompany?: string | null;
  hostMemberId?: string | null;
  invitedByMemberId?: string | null;
  note?: string | null;
}) {
  const row = await prisma.participation.findUnique({ where: { id: input.participationId } });
  if (!row || row.kind !== 'guest') throw new Error('找不到這位來賓。');
  const name = input.displayName.trim();
  if (!name) throw new Error('請填寫來賓姓名。');
  return prisma.participation.update({
    where: { id: row.id },
    data: {
      displayName: name,
      guestIndustry: input.guestIndustry ?? null,
      guestCompany: input.guestCompany ?? null,
      hostMemberId: input.hostMemberId ?? null,
      invitedByMemberId: input.invitedByMemberId ?? null,
      note: input.note ?? null,
    },
  });
}

export async function removeGuest(participationId: string) {
  const row = await prisma.participation.findUnique({ where: { id: participationId } });
  if (!row || row.kind !== 'guest') throw new Error('找不到這位來賓。');
  await prisma.participation.delete({ where: { id: row.id } });
}

export interface AttendanceSummary {
  members: number;
  arrived: number;
  late: number;
  substitutes: number;
  substitutesArrived: number;
  absent: number;
  expected: number;
  guests: number;
  guestsArrived: number;
  /** Everyone physically in the room: members, substitutes and guests who checked in. */
  inRoom: number;
}

export function summarize(rows: Participation[]): AttendanceSummary {
  const summary: AttendanceSummary = {
    members: 0,
    arrived: 0,
    late: 0,
    substitutes: 0,
    substitutesArrived: 0,
    absent: 0,
    expected: 0,
    guests: 0,
    guestsArrived: 0,
    inRoom: 0,
  };

  for (const row of rows) {
    if (row.kind === 'guest') {
      summary.guests += 1;
      if (row.status === 'present' || row.status === 'late') summary.guestsArrived += 1;
      continue;
    }
    summary.members += 1;
    if (row.status === 'present') summary.arrived += 1;
    else if (row.status === 'late') {
      summary.arrived += 1;
      summary.late += 1;
    } else if (row.status === 'substitute') {
      summary.substitutes += 1;
      if (row.substituteArrivedAt) summary.substitutesArrived += 1;
    } else if (row.status === 'absent' || row.status === 'medical') summary.absent += 1;
    else summary.expected += 1;
  }

  summary.inRoom = summary.arrived + summary.substitutesArrived + summary.guestsArrived;
  return summary;
}

/** Loads the event's attendance after syncing legacy facts. */
export async function getAttendance(sessionId: string) {
  await ensureParticipations(sessionId);
  const rows = await prisma.participation.findMany({
    where: { sessionId },
    orderBy: [{ kind: 'asc' }, { displayName: 'asc' }],
  });
  return { rows, summary: summarize(rows) };
}

/** One person per row who is physically present: used by the vote and the lottery. */
export interface PresentPerson {
  participationId: string;
  name: string;
  kind: 'member' | 'guest' | 'substitute';
  memberId: string | null;
  /** For substitutes: the member they stand in for. */
  represents: string | null;
}

export function presentPeople(rows: Participation[]): PresentPerson[] {
  const people: PresentPerson[] = [];
  for (const row of rows) {
    if (row.kind === 'guest') {
      if (row.status === 'present' || row.status === 'late') {
        people.push({ participationId: row.id, name: row.displayName, kind: 'guest', memberId: null, represents: null });
      }
      continue;
    }
    if (row.status === 'present' || row.status === 'late') {
      people.push({ participationId: row.id, name: row.displayName, kind: 'member', memberId: row.memberId, represents: null });
    } else if (row.status === 'substitute' && row.substituteArrivedAt && row.substituteName) {
      people.push({
        participationId: row.id,
        name: row.substituteName,
        kind: 'substitute',
        memberId: null,
        represents: row.displayName,
      });
    }
  }
  return people;
}
