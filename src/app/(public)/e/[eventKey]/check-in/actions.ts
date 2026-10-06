'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/prisma';
import { fail, isObjectId, ok, optionalText, text, type ActionState } from '@/server/tbx/action';
import { getPublicEventByKey, isEventToday, isPastStartTime } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { addGuest, checkIn, checkInSubstitute } from '@/server/tbx/participation';
import { getSeatPlanView } from '@/server/tbx/seat-plan';
import { isLeader } from '@/server/tbx/viewer';

async function loadEvent(formData: FormData) {
  const event = await getPublicEventByKey(text(formData, 'eventKey'));
  if (!event) throw new Error('這場活動尚未開放簽到。');
  // Self check-in only makes sense on the day. Leaders can check people in any time from the console.
  if (!isEventToday(event) && !(await isLeader())) throw new Error('活動當天才能簽到。需要補登請找幹部。');
  return event;
}

async function seatHint(sessionId: string, participationId: string) {
  const plan = await getSeatPlanView(sessionId).catch(() => null);
  const seat = plan?.seats.find((item) => item.participationId === participationId);
  return seat ? `你的座位：${seat.label}。` : '';
}

function done(weekId: string) {
  revalidatePath(`/e/${weekId}`, 'layout');
  revalidatePath(`/console/events/${weekId}`, 'layout');
}

/** A member, or a guest a leader registered in advance, taps their own name. */
export async function selfCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const event = await loadEvent(formData);
    const id = text(formData, 'participationId');
    if (!isObjectId(id)) throw new Error('請先選擇你的姓名。');
    const row = await prisma.participation.findUnique({ where: { id } });
    if (!row || row.sessionId !== event.id) throw new Error('找不到這筆名單，請重新選擇。');
    if (row.status === 'present' || row.status === 'late') return ok(`${row.displayName} 已經簽到過了。${await seatHint(event.id, row.id)}`);
    if (row.status !== 'expected') throw new Error('這位會員已登記請假或代理。本人到場請找幹部更改。');

    const late = row.kind === 'member' && isPastStartTime(event);
    await checkIn({ participationId: row.id, method: 'self', late });
    await logOperation({
      sessionId: event.id,
      actorRole: row.kind === 'member' ? 'member' : 'system',
      actorName: row.displayName,
      action: late ? 'self_check_in_late' : 'self_check_in',
      targetType: 'Participation',
      targetId: row.id,
    });
    done(event.weekId);
    return ok(`${row.displayName} 簽到完成${late ? '（遲到）' : ''}。${await seatHint(event.id, row.id)}`);
  } catch (error) {
    return fail(error);
  }
}

/** A substitute arrives and says which member they stand in for. */
export async function substituteCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const event = await loadEvent(formData);
    const id = text(formData, 'participationId');
    if (!isObjectId(id)) throw new Error('請選擇你代理的會員。');
    const row = await prisma.participation.findUnique({ where: { id } });
    if (!row || row.sessionId !== event.id || row.kind !== 'member') throw new Error('找不到這位會員，請重新選擇。');
    if (row.status === 'present' || row.status === 'late') throw new Error(`${row.displayName} 本人已經簽到，不需要代理。`);
    if (row.status === 'substitute' && row.substituteArrivedAt) return ok(`代理 ${row.displayName} 已經簽到過了。`);

    const name = optionalText(formData, 'substituteName') ?? row.substituteName;
    if (!name) throw new Error('請填寫你的姓名。');
    await checkInSubstitute({ participationId: row.id, substituteName: name, method: 'self' });
    await logOperation({
      sessionId: event.id,
      actorRole: 'system',
      actorName: name,
      action: 'substitute_check_in',
      targetType: 'Participation',
      targetId: row.id,
      metadata: { represents: row.displayName },
    });
    done(event.weekId);
    return ok(`${name} 簽到完成，代理 ${row.displayName}。${await seatHint(event.id, row.id)}`);
  } catch (error) {
    return fail(error);
  }
}

/** A walk-in guest registers and checks in at once. */
export async function guestCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const event = await loadEvent(formData);
    const displayName = text(formData, 'displayName');
    if (!displayName) throw new Error('請填寫你的姓名。');
    if (displayName.length > 40) throw new Error('姓名太長了。');
    const invitedBy = text(formData, 'invitedByMemberId');

    const guest = await addGuest({
      sessionId: event.id,
      displayName,
      guestIndustry: optionalText(formData, 'guestIndustry'),
      guestCompany: optionalText(formData, 'guestCompany'),
      invitedByMemberId: isObjectId(invitedBy) ? invitedBy : null,
      arrived: true,
      method: 'self',
    });
    await logOperation({
      sessionId: event.id,
      actorRole: 'system',
      actorName: displayName,
      action: 'guest_self_check_in',
      targetType: 'Participation',
      targetId: guest.id,
    });
    done(event.weekId);
    return ok(`${displayName}，歡迎！已完成來賓簽到。`);
  } catch (error) {
    return fail(error);
  }
}
