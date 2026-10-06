'use server';

import { revalidatePath } from 'next/cache';
import { fail, isObjectId, ok, text, type ActionState } from '@/server/tbx/action';
import { getEventByKey } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { createEventSeatPlan, deleteEventSeatPlan, saveSeatAssignments } from '@/server/tbx/seat-plan';
import { requireLeader } from '@/server/tbx/viewer';

async function loadEvent(formData: FormData) {
  const event = await getEventByKey(text(formData, 'eventKey'));
  if (!event) throw new Error('找不到這場活動，請回到活動列表重新選擇。');
  return event;
}

function refresh(weekId: string) {
  revalidatePath(`/console/events/${weekId}`, 'layout');
  revalidatePath(`/e/${weekId}`, 'layout');
}

/** Snapshots the chosen venue layout into this event's seat plan. */
export async function createSeatPlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await loadEvent(formData);
    const layoutId = text(formData, 'layoutId');
    if (!isObjectId(layoutId)) throw new Error('請先選擇一個場地配置。');
    const plan = await createEventSeatPlan(event.id, layoutId);
    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'seat_plan_created',
      targetType: 'EventSeatPlan',
      targetId: plan.id,
      metadata: { layoutId, venueName: plan.venueName },
    });
    refresh(event.weekId);
    return ok('已建立座位表');
  } catch (error) {
    return fail(error);
  }
}

/** Stores `{ [seatId]: participationId }` after checking it against the plan and the event's people. */
export async function saveSeatAssignmentsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await loadEvent(formData);
    const payload = text(formData, 'assignments');
    if (!payload || payload.length > 200_000) throw new Error('沒有收到座位資料，請重新整理頁面後再試一次。');
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new Error('座位資料格式不正確，請重新整理頁面後再試一次。');
    }
    const result = await saveSeatAssignments(event.id, parsed);
    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'seat_plan_assignments_saved',
      targetType: 'EventSeatPlan',
      targetId: result.planId,
      metadata: { seated: result.seated, seats: result.seats },
    });
    refresh(event.weekId);
    return ok(`已儲存座位，${result.seated} 人入座`);
  } catch (error) {
    return fail(error);
  }
}

/** 「更換配置」: removes the plan and everyone's seat so another layout can be chosen. */
export async function discardSeatPlanAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await loadEvent(formData);
    const plan = await deleteEventSeatPlan(event.id);
    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'seat_plan_discarded',
      targetType: 'EventSeatPlan',
      targetId: plan.id,
      metadata: { venueName: plan.venueName },
    });
    refresh(event.weekId);
    return ok('已移除座位表，請重新選擇配置');
  } catch (error) {
    return fail(error);
  }
}
