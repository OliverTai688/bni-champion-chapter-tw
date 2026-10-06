'use server';

import { revalidatePath } from 'next/cache';
import type { StageDrawResult } from '@/components/tbx/gifts/labels';
import { isObjectId } from '@/server/tbx/action';
import { getEventByKey } from '@/server/tbx/events';
import { drawGift, redrawAward, type DrawResult, type GiftActor } from '@/server/tbx/gifts';
import { requireLeader } from '@/server/tbx/viewer';

/**
 * The stage is a public page, so these actions accept the minimum: which gift
 * to draw or which result to redraw. The winner is always picked on the server.
 */
async function stageScope(eventKey: string, leaderName: string | null) {
  const event = typeof eventKey === 'string' && eventKey ? await getEventByKey(eventKey) : null;
  if (!event) throw new Error('找不到這場活動，請重新整理頁面。');
  const actor: GiftActor = { actorName: leaderName, sessionId: event.id };
  return { event, actor };
}

function refresh(weekId: string) {
  const key = encodeURIComponent(weekId);
  revalidatePath(`/e/${key}/lottery`);
  revalidatePath(`/console/events/${key}/gifts`);
  revalidatePath('/console/gifts');
}

function toResult(result: DrawResult): StageDrawResult {
  return {
    ok: true,
    awardId: result.award.id,
    giftId: result.gift.id,
    winnerName: result.award.winnerName,
    winnerKind: result.award.winnerKind,
    poolSize: result.poolSize,
  };
}

function toFailure(error: unknown): StageDrawResult {
  const message = error instanceof Error && error.message ? error.message : '抽獎沒有成功，請再按一次。';
  return { ok: false, message };
}

export async function stageDrawAction(eventKey: string, giftId: string): Promise<StageDrawResult> {
  try {
    const viewer = await requireLeader();
    if (typeof giftId !== 'string' || !isObjectId(giftId)) throw new Error('找不到這份禮物，請重新整理頁面。');
    const { event, actor } = await stageScope(eventKey, viewer.leaderName);
    const result = await drawGift(giftId, actor);
    refresh(event.weekId);
    return toResult(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function stageRedrawAction(eventKey: string, awardId: string): Promise<StageDrawResult> {
  try {
    const viewer = await requireLeader();
    if (typeof awardId !== 'string' || !isObjectId(awardId)) throw new Error('找不到這筆得獎紀錄，請重新整理頁面。');
    const { event, actor } = await stageScope(eventKey, viewer.leaderName);
    const result = await redrawAward(awardId, actor);
    refresh(event.weekId);
    return toResult(result);
  } catch (error) {
    return toFailure(error);
  }
}
