'use server';

import { revalidatePath } from 'next/cache';
import type { CreatePollState, PollResultVisibilityKey } from '@/components/tbx/polls/shared';
import { fail, ok, optionalText, text, type ActionState } from '@/server/tbx/action';
import { getEventByKey } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { closePoll, createStarPoll, deletePoll, openPoll, reopenPoll, updatePoll } from '@/server/tbx/polls';
import { requireLeader } from '@/server/tbx/viewer';

async function loadEvent(formData: FormData) {
  const eventKey = text(formData, 'eventKey');
  const event = eventKey ? await getEventByKey(eventKey) : null;
  if (!event) throw new Error('找不到這場活動，請回活動列表重新進入。');
  return event;
}

function revalidateEvent(weekId: string) {
  const key = encodeURIComponent(weekId);
  revalidatePath(`/console/events/${key}/polls`);
  revalidatePath(`/console/events/${key}`);
  revalidatePath(`/e/${key}/vote`);
}

export async function createStarPollAction(_prev: CreatePollState, formData: FormData): Promise<CreatePollState> {
  try {
    const viewer = await requireLeader();
    const event = await loadEvent(formData);
    const eligibility = text(formData, 'eligibility') === 'code_required' ? 'code_required' : 'public';

    const result = await createStarPoll({
      sessionId: event.id,
      eligibility,
      code: eligibility === 'code_required' ? optionalText(formData, 'code') : null,
      openNow: formData.get('openNow') === 'on',
    });

    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'live_poll_created',
      targetType: 'LivePoll',
      targetId: result.pollId,
      metadata: {
        title: result.title,
        eligibility: result.eligibility,
        candidateCount: result.candidateCount,
        hasVoteCode: Boolean(result.voteCode),
        status: result.status,
      },
    });
    revalidateEvent(event.weekId);

    const opened = result.status === 'open' ? '，已開放投票' : '，按「開放投票」後會員就能投票';
    return {
      ok: true,
      message: `已建立「${result.title}」，候選人 ${result.candidateCount} 位${opened}。`,
      voteCode: result.voteCode,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function updatePollAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await loadEvent(formData);
    const poll = await updatePoll({
      pollId: text(formData, 'pollId'),
      title: text(formData, 'title'),
      description: optionalText(formData, 'description'),
      resultVisibility: text(formData, 'resultVisibility') as PollResultVisibilityKey,
    });

    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'live_poll_updated',
      targetType: 'LivePoll',
      targetId: poll.id,
      metadata: { title: poll.title, resultVisibility: poll.resultVisibility },
    });
    revalidateEvent(event.weekId);
    return ok('已儲存投票設定');
  } catch (error) {
    return fail(error);
  }
}

export async function openPollAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await loadEvent(formData);
    const poll = await openPoll(text(formData, 'pollId'));

    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'live_poll_opened',
      targetType: 'LivePoll',
      targetId: poll.id,
    });
    revalidateEvent(event.weekId);
    return ok('已開放投票');
  } catch (error) {
    return fail(error);
  }
}

export async function closePollAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await loadEvent(formData);
    const result = await closePoll(text(formData, 'pollId'));

    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'live_poll_closed',
      targetType: 'LivePoll',
      targetId: result.id,
      metadata: {
        voteCount: result.voteCount,
        highestVoteCount: result.highestVoteCount,
        winnerOptionIds: result.winnerOptionIds,
        winnerLabels: result.winnerLabels,
        isTie: result.isTie,
      },
    });
    revalidateEvent(event.weekId);
    return ok(result.winnerLabels.length > 0 ? `已結束投票，最高票：${result.winnerLabels.join('、')}` : '已結束投票，沒有人投票');
  } catch (error) {
    return fail(error);
  }
}

export async function reopenPollAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await loadEvent(formData);
    const poll = await reopenPoll(text(formData, 'pollId'));

    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'live_poll_reopened',
      targetType: 'LivePoll',
      targetId: poll.id,
    });
    revalidateEvent(event.weekId);
    return ok('已重新開放投票');
  } catch (error) {
    return fail(error);
  }
}

export async function deletePollAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await loadEvent(formData);
    const poll = await deletePoll(text(formData, 'pollId'));

    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'live_poll_deleted',
      targetType: 'LivePoll',
      targetId: poll.id,
      metadata: { title: poll.title, status: poll.status, deletedVotes: poll.deletedVotes },
    });
    revalidateEvent(event.weekId);
    return ok('已刪除投票');
  } catch (error) {
    return fail(error);
  }
}
