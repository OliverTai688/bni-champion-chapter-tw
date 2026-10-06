'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { fail, isObjectId, ok, text, type ActionState } from '@/server/tbx/action';
import { getPublicEventByKey } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { castVote, isVoteTokenForPoll, issueVoteToken, VOTE_TOKEN_COOKIE, VOTE_TOKEN_TTL_MS } from '@/server/tbx/polls';
import { getViewer } from '@/server/tbx/viewer';

async function loadPublicEvent(formData: FormData) {
  const eventKey = text(formData, 'eventKey');
  const event = eventKey ? await getPublicEventByKey(eventKey) : null;
  if (!event) throw new Error('這場活動目前沒有公開，請向領導團隊確認投票連結。');
  return event;
}

function readPollId(formData: FormData) {
  const pollId = text(formData, 'pollId');
  if (!isObjectId(pollId)) throw new Error('找不到這場投票，請重新整理頁面。');
  return pollId;
}

async function rememberToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(VOTE_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/e',
    maxAge: Math.floor(VOTE_TOKEN_TTL_MS / 1000),
  });
}

/** Step for polls that need a vote code: checks the code and stores the vote token in a cookie. */
export async function enterVoteCodeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const event = await loadPublicEvent(formData);
    const pollId = readPollId(formData);

    const cookieStore = await cookies();
    if (!isVoteTokenForPoll(cookieStore.get(VOTE_TOKEN_COOKIE)?.value, pollId)) {
      const access = await issueVoteToken({ pollId, code: text(formData, 'code'), sessionId: event.id });
      await rememberToken(access.token);
    }

    revalidatePath(`/e/${encodeURIComponent(event.weekId)}/vote`);
    return ok('投票碼正確，請選一位會員。');
  } catch (error) {
    return fail(error);
  }
}

/** Casts the visitor's vote, or moves it to another candidate while the poll is open. */
export async function castVoteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const event = await loadPublicEvent(formData);
    const pollId = readPollId(formData);
    const optionId = text(formData, 'optionId');
    if (!isObjectId(optionId)) throw new Error('請先點選一位會員。');

    const cookieStore = await cookies();
    let token = cookieStore.get(VOTE_TOKEN_COOKIE)?.value ?? '';
    if (!isVoteTokenForPoll(token, pollId)) {
      // Polls without a vote code hand out the token on the first vote. Polls with a code refuse here.
      const access = await issueVoteToken({ pollId, sessionId: event.id });
      token = access.token;
      await rememberToken(token);
    }

    const viewer = await getViewer();
    const result = await castVote({
      pollId,
      optionId,
      token,
      comment: text(formData, 'comment'),
      voterMemberId: viewer.member?.id ?? null,
      sessionId: event.id,
    });

    // The vote is anonymous: the log records that a vote happened, not who voted or for whom.
    await logOperation({
      sessionId: event.id,
      actorRole: 'member',
      action: result.changed ? 'star_vote_changed' : 'star_vote_cast',
      targetType: 'LivePoll',
      targetId: pollId,
      metadata: { hasComment: result.hasComment },
    });

    revalidatePath(`/e/${encodeURIComponent(event.weekId)}/vote`);
    return ok(`已投給 ${result.label}`);
  } catch (error) {
    return fail(error);
  }
}
