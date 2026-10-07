import 'server-only';

import { prisma } from '@/server/db/prisma';
import { cleanDutyKeys, dutyRole, leaderRole, type MeetingRole } from '@/lib/tbx/roles';
import { findLatestSeatMapByWeekId } from '@/server/repositories/seating-workspace-repository';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Offices by member id: role terms covering the event day (主席, and custom ones such as 品牌成長),
 * plus the head team named on the weekly grid seat map, so the head table is labelled even before
 * anyone enters role terms.
 */
async function leadershipByMember(session: { weekId: string; date: Date }, memberIds: string[], idByName: Map<string, string>) {
  const out = new Map<string, string[]>();
  const dayEnd = new Date(session.date.getTime() + DAY_MS);
  const terms = await prisma.roleTerm.findMany({
    where: {
      memberId: { in: memberIds },
      startsAt: { lt: dayEnd },
      OR: [{ endsAt: null }, { endsAt: { isSet: false } }, { endsAt: { gte: session.date } }],
    },
    select: { memberId: true, role: true },
  });
  const add = (memberId: string, role: string) => {
    const roles = out.get(memberId) ?? [];
    // 財務秘書 on the seat map and 秘書財務 in role terms are the same office.
    const same = (a: string, b: string) => a === b || [...a].sort().join('') === [...b].sort().join('');
    if (!roles.some((existing) => same(existing, role))) out.set(memberId, [...roles, role]);
  };
  for (const term of terms) add(term.memberId, term.role);

  const seatMap = await findLatestSeatMapByWeekId(session.weekId).catch(() => null);
  for (const seat of seatMap?.seats ?? []) {
    const assignment = seat.assignments[0];
    if (seat.zone !== 'top' || !assignment?.role) continue;
    const memberId = assignment.memberId ?? idByName.get(assignment.displayName.trim());
    if (memberId) add(memberId, assignment.role);
  }
  return out;
}

/**
 * Every role a person holds at this event, keyed by participation id.
 *
 * - 主席 and the rest of the head team: role terms (see `leadershipByMember`).
 * - 值日 / 音控: `Participation.roles`, assigned per event.
 * - 新會員 / 導師: `Member.mentorId`; a member with a 導師 role term is a mentor even without a mentee.
 * - 來賓 / 執事: guest rows and their `hostMemberId`.
 * - 代理: attendance status.
 *
 * Only display text is returned, so the result is safe for public pages.
 */
export async function getMeetingRoles(sessionId: string): Promise<Map<string, MeetingRole[]>> {
  const out = new Map<string, MeetingRole[]>();
  const session = await prisma.meetingSession.findUnique({ where: { id: sessionId }, select: { weekId: true, date: true } });
  if (!session) return out;

  const rows = await prisma.participation.findMany({
    where: { sessionId },
    select: {
      id: true,
      kind: true,
      memberId: true,
      displayName: true,
      status: true,
      substituteName: true,
      hostMemberId: true,
      roles: true,
    },
  });
  const memberIds = rows.flatMap((row) => (row.kind === 'member' && row.memberId ? [row.memberId] : []));
  const idByName = new Map(rows.flatMap((row) => (row.kind === 'member' && row.memberId ? [[row.displayName.trim(), row.memberId] as const] : [])));

  const [leadership, members] = await Promise.all([
    leadershipByMember(session, memberIds, idByName),
    prisma.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, displayName: true, mentorId: true } }),
  ]);

  const nameById = new Map(members.map((member) => [member.id, member.displayName]));
  const mentorOf = new Map(members.flatMap((member) => (member.mentorId ? [[member.id, member.mentorId] as const] : [])));
  const mentees = new Map<string, string[]>();
  for (const [newcomerId, mentorId] of mentorOf) {
    mentees.set(mentorId, [...(mentees.get(mentorId) ?? []), nameById.get(newcomerId) ?? '']);
  }
  const missingMentors = [...mentorOf.values()].filter((id) => !nameById.has(id));
  if (missingMentors.length > 0) {
    const extra = await prisma.member.findMany({ where: { id: { in: missingMentors } }, select: { id: true, displayName: true } });
    for (const member of extra) nameById.set(member.id, member.displayName);
  }

  const guestsByHost = new Map<string, string[]>();
  for (const row of rows) {
    if (row.kind === 'guest' && row.hostMemberId) {
      guestsByHost.set(row.hostMemberId, [...(guestsByHost.get(row.hostMemberId) ?? []), row.displayName]);
    }
  }

  for (const row of rows) {
    const roles: MeetingRole[] = [];

    if (row.kind === 'guest') {
      const host = row.hostMemberId ? nameById.get(row.hostMemberId) : null;
      roles.push({ kind: 'guest', label: '來賓', short: '賓', detail: host ? `執事 ${host}` : undefined });
    } else if (row.memberId) {
      // A 導師 role term marks a standing mentor; it is shown once, together with any mentees below.
      const offices = leadership.get(row.memberId) ?? [];
      const standingMentor = offices.includes('導師');
      for (const role of offices) if (role !== '導師') roles.push(leaderRole(role));
      for (const key of cleanDutyKeys(row.roles)) roles.push(dutyRole(key));

      const mentorId = mentorOf.get(row.memberId);
      if (mentorId) {
        const mentor = nameById.get(mentorId);
        roles.push({ kind: 'newcomer', label: '新會員', short: '新', detail: mentor ? `導師 ${mentor}` : undefined });
      }
      const mentored = (mentees.get(row.memberId) ?? []).filter(Boolean);
      if (standingMentor || mentees.has(row.memberId)) {
        roles.push({ kind: 'mentor', label: '導師', short: '導', detail: mentored.length ? `帶 ${mentored.join('、')}` : undefined });
      }

      const hosted = guestsByHost.get(row.memberId);
      if (hosted) roles.push({ kind: 'host', label: '執事', short: '執', detail: `接待 ${hosted.join('、')}` });

      if (row.status === 'substitute') {
        roles.push({ kind: 'substitute', label: '代理', short: '代', detail: row.substituteName ?? undefined });
      }
    }

    if (roles.length > 0) out.set(row.id, roles);
  }

  return out;
}

/** Replaces the duties of one person at one event. */
export async function setEventDuties(participationId: string, keys: readonly unknown[]) {
  const row = await prisma.participation.findUnique({ where: { id: participationId }, select: { id: true, kind: true } });
  if (!row) throw new Error('找不到這筆出席紀錄。');
  if (row.kind !== 'member') throw new Error('只有會員可以擔任值日或音控。');
  const roles = cleanDutyKeys(keys);
  await prisma.participation.update({ where: { id: row.id }, data: { roles } });
  return roles;
}

/** Sets or clears the mentor of a member. A member with a mentor is shown as 新會員. */
export async function setMemberMentor(memberId: string, mentorId: string | null) {
  if (mentorId && mentorId === memberId) throw new Error('導師不能是自己。');
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, displayName: true } });
  if (!member) throw new Error('找不到這位會員，請重新整理名冊。');
  let mentorName: string | null = null;
  if (mentorId) {
    const mentor = await prisma.member.findUnique({ where: { id: mentorId }, select: { displayName: true, isActive: true, category: true } });
    if (!mentor || !mentor.isActive || mentor.category !== 'member') throw new Error('導師必須是在籍會員。');
    mentorName = mentor.displayName;
  }
  await prisma.member.update({ where: { id: memberId }, data: { mentorId } });
  return { displayName: member.displayName, mentorName };
}
