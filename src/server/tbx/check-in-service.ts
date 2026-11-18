import 'server-only';

import { revalidatePath } from 'next/cache';
import type { MeetingSession, Participation } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { formatEventDate } from '@/lib/tbx/labels';
import { getFocusEvent, isEventToday, isPastStartTime } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { checkIn, ensureParticipations } from '@/server/tbx/participation';
import { getSeatPlanView } from '@/server/tbx/seat-plan';

/**
 * Self check-in, shared by the web check-in page and the LINE official account
 * (PRD-003 R3, ARC-008 §6), so both follow one set of rules and messages.
 */

/** How the person checked in. The web page keeps its historical value `self`. */
export type SelfCheckInMethod = 'self' | 'line_chat' | 'liff';

export type SelfCheckInResult =
  | { status: 'checked_in'; displayName: string; late: boolean; seatLabel: string | null; eventKey: string }
  | { status: 'already'; displayName: string; seatLabel: string | null; eventKey: string }
  | { status: 'unavailable'; displayName: string; eventKey: string }
  | { status: 'no_event_today'; next: { eventKey: string; date: Date } | null }
  | { status: 'not_on_roster' };

async function seatLabel(sessionId: string, participationId: string) {
  const plan = await getSeatPlanView(sessionId).catch(() => null);
  return plan?.seats.find((item) => item.participationId === participationId)?.label ?? null;
}

function revalidateEvent(weekId: string) {
  revalidatePath(`/e/${weekId}`, 'layout');
  revalidatePath(`/console/events/${weekId}`, 'layout');
}

/**
 * Checks one participation row in. The caller has already decided this row belongs to
 * the person and that the event may be checked into now.
 */
export async function selfCheckIn(input: {
  event: Pick<MeetingSession, 'id' | 'weekId' | 'date' | 'startsAt'>;
  row: Participation;
  method: SelfCheckInMethod;
}): Promise<SelfCheckInResult> {
  const { event, row, method } = input;
  // The seat does not depend on the check-in, so look it up while the check-in is written.
  const seat = seatLabel(event.id, row.id);
  if (row.status === 'present' || row.status === 'late') {
    return { status: 'already', displayName: row.displayName, seatLabel: await seat, eventKey: event.weekId };
  }
  if (row.status !== 'expected') {
    return { status: 'unavailable', displayName: row.displayName, eventKey: event.weekId };
  }

  const late = row.kind === 'member' && isPastStartTime(event);
  await checkIn({ participationId: row.id, method, late });
  await logOperation({
    sessionId: event.id,
    actorRole: row.kind === 'member' ? 'member' : 'system',
    actorName: row.displayName,
    action: late ? 'self_check_in_late' : 'self_check_in',
    targetType: 'Participation',
    targetId: row.id,
    metadata: { method },
  });
  revalidateEvent(event.weekId);
  return { status: 'checked_in', displayName: row.displayName, late, seatLabel: await seat, eventKey: event.weekId };
}

/**
 * A member checks into today's published event by who they are, not by picking a name.
 * Used where the caller already knows the member, such as a LINE account bound to them.
 */
export async function checkInMemberForToday(input: { memberId: string; method: SelfCheckInMethod }): Promise<SelfCheckInResult> {
  const event = await getFocusEvent({ publicOnly: true });
  if (!event || !isEventToday(event)) {
    const next = event && event.date > new Date() ? { eventKey: event.weekId, date: event.date } : null;
    return { status: 'no_event_today', next };
  }

  const key = `m:${input.memberId}`;
  let row = await prisma.participation.findUnique({ where: { sessionId_key: { sessionId: event.id, key } } });
  if (!row) {
    // Rows are created lazily the first time anyone opens the event's attendance.
    const { rows } = await ensureParticipations(event.id);
    row = rows.find((item) => item.key === key) ?? null;
  }
  if (!row) return { status: 'not_on_roster' };

  return selfCheckIn({ event, row, method: input.method });
}

/** The one wording of a check-in result, for the web page and LINE replies alike. */
export function describeCheckIn(result: SelfCheckInResult) {
  const seat = 'seatLabel' in result && result.seatLabel ? `你的座位：${result.seatLabel}。` : '';
  switch (result.status) {
    case 'checked_in':
      return `${result.displayName} 簽到完成${result.late ? '（遲到）' : ''}。${seat}`;
    case 'already':
      return `${result.displayName} 已經簽到過了。${seat}`;
    case 'unavailable':
      return '這位會員已登記請假或代理。本人到場請找幹部更改。';
    case 'no_event_today':
      return result.next ? `今天沒有例會。下一場是 ${formatEventDate(result.next.date)}。` : '今天沒有例會。';
    case 'not_on_roster':
      return '今天的名單上找不到你，請找幹部協助簽到。';
  }
}
