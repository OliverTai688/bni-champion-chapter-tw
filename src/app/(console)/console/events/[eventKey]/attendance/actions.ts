'use server';

import type { ParticipationStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/prisma';
import { fail, isObjectId, ok, optionalText, text, type ActionState } from '@/server/tbx/action';
import { getEventByKey } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import {
  addGuest,
  checkIn,
  checkInSubstitute,
  removeGuest,
  setParticipationStatus,
  undoCheckIn,
  updateGuest,
} from '@/server/tbx/participation';
import { requireLeader } from '@/server/tbx/viewer';

const STATUSES: ParticipationStatus[] = ['expected', 'present', 'late', 'absent', 'medical', 'substitute'];

async function loadRow(formData: FormData) {
  const event = await getEventByKey(text(formData, 'eventKey'));
  if (!event) throw new Error('找不到這場活動。');
  const id = text(formData, 'participationId');
  if (!isObjectId(id)) throw new Error('出席紀錄編號不正確。');
  const row = await prisma.participation.findUnique({ where: { id } });
  if (!row || row.sessionId !== event.id) throw new Error('這筆出席紀錄不屬於這場活動。');
  return { event, row };
}

function refresh(weekId: string) {
  revalidatePath(`/console/events/${weekId}`, 'layout');
}

function memberIdOrNull(formData: FormData, key: string) {
  const value = text(formData, key);
  return isObjectId(value) ? value : null;
}

/** One-click row buttons: 簽到 / 遲到 / 代理人到 / 取消. */
export async function quickAttendanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, row } = await loadRow(formData);
    const intent = text(formData, 'intent');

    if (intent === 'present') await checkIn({ participationId: row.id, method: 'staff' });
    else if (intent === 'late') await checkIn({ participationId: row.id, method: 'staff', late: true });
    else if (intent === 'substitute_arrived') await checkInSubstitute({ participationId: row.id, method: 'staff' });
    else if (intent === 'undo') await undoCheckIn(row.id);
    else throw new Error('不支援的操作。');

    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: `attendance_${intent}`,
      targetType: 'Participation',
      targetId: row.id,
      metadata: { displayName: row.displayName },
    });
    refresh(event.weekId);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function updateParticipationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, row } = await loadRow(formData);
    const status = text(formData, 'status') as ParticipationStatus;
    if (!STATUSES.includes(status)) throw new Error('出席狀態不正確。');

    await setParticipationStatus({
      participationId: row.id,
      status,
      substituteName: optionalText(formData, 'substituteName'),
      substituteArrived: formData.get('substituteArrived') === 'on',
      note: optionalText(formData, 'note'),
    });
    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'attendance_updated',
      targetType: 'Participation',
      targetId: row.id,
      metadata: { displayName: row.displayName, status },
    });
    refresh(event.weekId);
    return ok('已更新出席');
  } catch (error) {
    return fail(error);
  }
}

export async function addGuestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await getEventByKey(text(formData, 'eventKey'));
    if (!event) throw new Error('找不到這場活動。');

    const guest = await addGuest({
      sessionId: event.id,
      displayName: text(formData, 'displayName'),
      guestIndustry: optionalText(formData, 'guestIndustry'),
      guestCompany: optionalText(formData, 'guestCompany'),
      hostMemberId: memberIdOrNull(formData, 'hostMemberId'),
      invitedByMemberId: memberIdOrNull(formData, 'invitedByMemberId'),
      note: optionalText(formData, 'note'),
      arrived: formData.get('arrived') === 'on',
      method: 'staff',
    });
    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'guest_added',
      targetType: 'Participation',
      targetId: guest.id,
      metadata: { displayName: guest.displayName },
    });
    refresh(event.weekId);
    return ok('已新增來賓');
  } catch (error) {
    return fail(error);
  }
}

export async function updateGuestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, row } = await loadRow(formData);
    await updateGuest({
      participationId: row.id,
      displayName: text(formData, 'displayName'),
      guestIndustry: optionalText(formData, 'guestIndustry'),
      guestCompany: optionalText(formData, 'guestCompany'),
      hostMemberId: memberIdOrNull(formData, 'hostMemberId'),
      invitedByMemberId: memberIdOrNull(formData, 'invitedByMemberId'),
      note: optionalText(formData, 'note'),
    });
    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'guest_updated',
      targetType: 'Participation',
      targetId: row.id,
    });
    refresh(event.weekId);
    return ok('已更新來賓');
  } catch (error) {
    return fail(error);
  }
}

export async function removeGuestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, row } = await loadRow(formData);
    await removeGuest(row.id);
    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'guest_removed',
      targetType: 'Participation',
      targetId: row.id,
      metadata: { displayName: row.displayName },
    });
    refresh(event.weekId);
    return ok('已移除來賓');
  } catch (error) {
    return fail(error);
  }
}
