'use server';

import { revalidatePath } from 'next/cache';
import { fail, intValue, isObjectId, ok, optionalText, text, type ActionState } from '@/server/tbx/action';
import { getEventByKey } from '@/server/tbx/events';
import {
  assignAward,
  createGift,
  deleteAward,
  deleteGift,
  drawGift,
  moveGift,
  redrawAward,
  saveLotterySettings,
  updateAward,
  updateGift,
  type GiftActor,
  type GiftInput,
} from '@/server/tbx/gifts';
import { requireLeader } from '@/server/tbx/viewer';

/** Resolves the event named by the form and scopes every change to it. */
async function eventScope(formData: FormData, leaderName: string | null) {
  const eventKey = text(formData, 'eventKey');
  const event = eventKey ? await getEventByKey(eventKey) : null;
  if (!event) throw new Error('找不到這場活動，請重新整理頁面。');
  const actor: GiftActor = { actorName: leaderName, sessionId: event.id };
  return { event, actor };
}

function refresh(weekId: string) {
  const key = encodeURIComponent(weekId);
  revalidatePath(`/console/events/${key}/gifts`);
  revalidatePath(`/e/${key}/lottery`);
  revalidatePath('/console/gifts');
}

function idField(formData: FormData, key: string, message: string) {
  const value = text(formData, key);
  if (!isObjectId(value)) throw new Error(message);
  return value;
}

const GIFT_ID_ERROR = '找不到這份禮物，請重新整理頁面。';
const AWARD_ID_ERROR = '找不到這筆得獎紀錄，請重新整理頁面。';

function giftInput(formData: FormData): GiftInput {
  const name = text(formData, 'name');
  if (!name) throw new Error('請填寫禮物名稱。');
  const base = { name, quantity: intValue(formData, 'quantity', 1), note: optionalText(formData, 'note') };

  if (text(formData, 'donorMode') === 'member') {
    const donorMemberId = text(formData, 'donorMemberId');
    if (!isObjectId(donorMemberId)) throw new Error('請選擇提供禮物的會員；提供者不是會員時請改選「其他」。');
    return { ...base, donorMemberId, donorName: null };
  }
  return { ...base, donorMemberId: null, donorName: optionalText(formData, 'donorName') };
}

/** Value of the "keep the current winner" option in the edit dialog. */
const KEEP_WINNER = 'keep';

function winnerInput(formData: FormData, options: { allowKeep?: boolean } = {}) {
  if (text(formData, 'winnerMode') === 'present') {
    const participationId = text(formData, 'participationId');
    if (options.allowKeep && participationId === KEEP_WINNER) return { participationId: null, winnerName: null };
    if (!isObjectId(participationId)) throw new Error('請從名單選一位得主；得主不在名單上時請改選「其他」並填姓名。');
    return { participationId, winnerName: null };
  }
  const winnerName = text(formData, 'winnerName');
  if (!winnerName) throw new Error('請填寫得主姓名。');
  return { participationId: null, winnerName };
}

export async function createGiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    const gift = await createGift({ sessionId: event.id, ...giftInput(formData) }, actor);
    refresh(event.weekId);
    return ok(`已新增禮物「${gift.name}」`);
  } catch (error) {
    return fail(error);
  }
}

export async function updateGiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    const giftId = idField(formData, 'giftId', GIFT_ID_ERROR);
    await updateGift({ giftId, ...giftInput(formData) }, actor);
    refresh(event.weekId);
    return ok('已儲存禮物');
  } catch (error) {
    return fail(error);
  }
}

export async function deleteGiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    await deleteGift(idField(formData, 'giftId', GIFT_ID_ERROR), actor);
    refresh(event.weekId);
    return ok('已刪除禮物');
  } catch (error) {
    return fail(error);
  }
}

export async function moveGiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    const direction = text(formData, 'direction') === 'up' ? 'up' : 'down';
    await moveGift(idField(formData, 'giftId', GIFT_ID_ERROR), direction, actor);
    refresh(event.weekId);
    return ok(direction === 'up' ? '已上移' : '已下移');
  } catch (error) {
    return fail(error);
  }
}

export async function drawGiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    const result = await drawGift(idField(formData, 'giftId', GIFT_ID_ERROR), actor);
    refresh(event.weekId);
    return ok(`抽出：${result.award.winnerName}（抽獎池 ${result.poolSize} 人）`);
  } catch (error) {
    return fail(error);
  }
}

export async function redrawAwardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    const result = await redrawAward(idField(formData, 'awardId', AWARD_ID_ERROR), actor);
    refresh(event.weekId);
    return ok(`重抽結果：${result.award.winnerName}`);
  } catch (error) {
    return fail(error);
  }
}

export async function assignAwardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    const giftId = idField(formData, 'giftId', GIFT_ID_ERROR);
    const award = await assignAward({ giftId, ...winnerInput(formData), note: optionalText(formData, 'note') }, actor);
    refresh(event.weekId);
    return ok(`已指定得主：${award.winnerName}`);
  } catch (error) {
    return fail(error);
  }
}

export async function updateAwardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    const awardId = idField(formData, 'awardId', AWARD_ID_ERROR);
    const award = await updateAward(
      { awardId, ...winnerInput(formData, { allowKeep: true }), note: optionalText(formData, 'note') },
      actor,
    );
    refresh(event.weekId);
    return ok(`已儲存，得主：${award.winnerName}`);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteAwardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    await deleteAward(idField(formData, 'awardId', AWARD_ID_ERROR), actor);
    refresh(event.weekId);
    return ok('已移除得主');
  } catch (error) {
    return fail(error);
  }
}

export async function saveLotterySettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { event, actor } = await eventScope(formData, viewer.leaderName);
    const checked = (key: string) => formData.get(key) === 'on';
    await saveLotterySettings(
      event.id,
      {
        includeMembers: checked('includeMembers'),
        includeGuests: checked('includeGuests'),
        includeSubstitutes: checked('includeSubstitutes'),
        excludeWinners: checked('excludeWinners'),
      },
      actor,
    );
    refresh(event.weekId);
    return ok('已儲存抽獎池設定');
  } catch (error) {
    return fail(error);
  }
}
