import 'server-only';

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import {
  STAR_POLL_TITLE,
  VOTE_COMMENT_MAX,
  countChars,
  type PollEligibilityKey,
  type PollResultVisibilityKey,
  type PollStatusKey,
} from '@/components/tbx/polls/shared';
import { prisma } from '@/server/db/prisma';
import { isObjectId } from '@/server/tbx/action';
import { listChapterMembers } from '@/server/tbx/members';
import { getAttendance } from '@/server/tbx/participation';
import { getViewer } from '@/server/tbx/viewer';

/** Cookie that keeps a visitor's vote token for the public vote page (/e/[eventKey]/vote). */
export const VOTE_TOKEN_COOKIE = 'tbx-star-vote';

/** Long enough that a voter can still change the vote while a poll stays open for days. */
export const VOTE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

// ---------------------------------------------------------------------------
// Hashing. Kept identical to src/server/repositories/live-poll-repository.ts so
// votes and codes written by either flow are interchangeable.
// ---------------------------------------------------------------------------

function secret() {
  return process.env.AUTH_SECRET ?? 'local-live-poll-secret';
}

function hashValue(value: string) {
  return createHash('sha256').update(`${value}:${secret()}`).digest('hex');
}

function voteCodeHash(code: string) {
  return hashValue(`vote-code:${code.trim().toUpperCase()}`);
}

function tokenHash(token: string) {
  return hashValue(`vote-token:${token}`);
}

function generateVoteCode() {
  return randomBytes(3).toString('hex').toUpperCase();
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function encodeVoteToken(payload: { pollId: string; nonce: string; exp: number }) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hashValue(`signed-vote-token:${body}`)}`;
}

/** Returns the signed payload, or null when the token is missing, forged or malformed. */
function readVoteToken(token: string | null | undefined) {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature || !safeEqual(hashValue(`signed-vote-token:${body}`), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Record<string, unknown>;
    if (typeof payload.pollId !== 'string' || typeof payload.nonce !== 'string' || typeof payload.exp !== 'number') {
      return null;
    }
    return { pollId: payload.pollId, nonce: payload.nonce, exp: payload.exp, expired: payload.exp < Date.now() };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

export interface PollResultRow {
  optionId: string;
  label: string;
  memberId: string | null;
  position: number;
  isActive: boolean;
  voteCount: number;
}

/** A praise sentence left with a vote. Never carries who wrote it. */
export interface PollPraise {
  id: string;
  optionId: string;
  label: string;
  comment: string;
  submittedAt: string;
}

export interface PollSummary {
  id: string;
  title: string;
  description: string | null;
  status: PollStatusKey;
  eligibility: PollEligibilityKey;
  resultVisibility: PollResultVisibilityKey;
  hasVoteCode: boolean;
  optionCount: number;
  voteCount: number;
  createdAt: string;
  opensAt: string | null;
  closesAt: string | null;
  /** Every option, most votes first. */
  results: PollResultRow[];
  winners: PollResultRow[];
  highestVoteCount: number;
  isTie: boolean;
  /** Newest first. */
  praises: PollPraise[];
}

export interface PastStarWinner {
  pollId: string;
  eventKey: string;
  eventTitle: string;
  eventDate: string;
  closedAt: string | null;
  winners: string[];
  highestVoteCount: number;
  voteCount: number;
  isTie: boolean;
}

type OptionRow = { id: string; label: string; memberId: string | null; position: number; isActive: boolean };

function rankOptions(options: OptionRow[], votes: Array<{ optionId: string }>) {
  const counts = new Map<string, number>();
  for (const vote of votes) counts.set(vote.optionId, (counts.get(vote.optionId) ?? 0) + 1);

  const ranked: PollResultRow[] = options
    .map((option) => ({
      optionId: option.id,
      label: option.label,
      memberId: option.memberId,
      position: option.position,
      isActive: option.isActive,
      voteCount: counts.get(option.id) ?? 0,
    }))
    .sort((a, b) => b.voteCount - a.voteCount || a.position - b.position);

  const highestVoteCount = ranked[0]?.voteCount ?? 0;
  const winners = highestVoteCount > 0 ? ranked.filter((row) => row.voteCount === highestVoteCount) : [];
  return { ranked, highestVoteCount, winners, isTie: winners.length > 1 };
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function isStarPoll(poll: { title: string; metadata: unknown }) {
  return poll.title === STAR_POLL_TITLE || metadataRecord(poll.metadata).kind === 'star';
}

function assertId(value: string, what = '投票') {
  if (!isObjectId(value)) throw new Error(`找不到這個${what}，請重新整理頁面後再試一次。`);
}

// ---------------------------------------------------------------------------
// Leadership: read
// ---------------------------------------------------------------------------

/** Every poll of the event, newest first, with results and the praise list. */
export async function listPollsForEvent(sessionId: string): Promise<PollSummary[]> {
  const polls = await prisma.livePoll.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    include: {
      options: {
        orderBy: { position: 'asc' },
        select: { id: true, label: true, memberId: true, position: true, isActive: true },
      },
      votes: {
        orderBy: { submittedAt: 'desc' },
        select: { id: true, optionId: true, comment: true, submittedAt: true },
      },
    },
  });

  return polls.map((poll) => {
    const ranking = rankOptions(poll.options, poll.votes);
    const labelByOption = new Map(poll.options.map((option) => [option.id, option.label]));
    const praises: PollPraise[] = [];
    for (const vote of poll.votes) {
      const comment = vote.comment?.trim();
      if (!comment) continue;
      praises.push({
        id: vote.id,
        optionId: vote.optionId,
        label: labelByOption.get(vote.optionId) ?? '（已移除的候選人）',
        comment,
        submittedAt: vote.submittedAt.toISOString(),
      });
    }

    return {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      status: poll.status,
      eligibility: poll.eligibility,
      resultVisibility: poll.resultVisibility,
      hasVoteCode: Boolean(poll.voteCodeHash),
      optionCount: poll.options.length,
      voteCount: poll.votes.length,
      createdAt: poll.createdAt.toISOString(),
      opensAt: poll.opensAt?.toISOString() ?? null,
      closesAt: poll.closesAt?.toISOString() ?? null,
      results: ranking.ranked,
      winners: ranking.winners,
      highestVoteCount: ranking.highestVoteCount,
      isTie: ranking.isTie,
      praises,
    };
  });
}

/** Closed star polls across all events, most recently closed first. */
export async function listPastStarWinners(limit = 8): Promise<PastStarWinner[]> {
  const polls = await prisma.livePoll.findMany({
    where: { status: 'closed' },
    orderBy: [{ closesAt: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(limit * 3, 24),
    include: {
      session: { select: { weekId: true, title: true, date: true } },
      options: { select: { id: true, label: true, memberId: true, position: true, isActive: true } },
      votes: { select: { optionId: true } },
    },
  });

  return polls
    .filter(isStarPoll)
    .slice(0, limit)
    .map((poll) => {
      const ranking = rankOptions(poll.options, poll.votes);
      return {
        pollId: poll.id,
        eventKey: poll.session.weekId,
        eventTitle: poll.session.title,
        eventDate: poll.session.date.toISOString(),
        closedAt: poll.closesAt?.toISOString() ?? null,
        winners: ranking.winners.map((winner) => winner.label),
        highestVoteCount: ranking.highestVoteCount,
        voteCount: poll.votes.length,
        isTie: ranking.isTie,
      };
    });
}

// ---------------------------------------------------------------------------
// Leadership: write
// ---------------------------------------------------------------------------

async function assertNoOtherOpenPoll(sessionId: string, exceptPollId?: string) {
  const other = await prisma.livePoll.findFirst({
    where: { sessionId, status: 'open', ...(exceptPollId ? { id: { not: exceptPollId } } : {}) },
    select: { title: true },
  });
  if (other) throw new Error(`「${other.title}」還在投票中，請先結束它再開放另一場投票。`);
}

export interface CreateStarPollResult {
  pollId: string;
  title: string;
  status: PollStatusKey;
  eligibility: 'public' | 'code_required';
  /** Plain vote code. Only returned here; the database keeps a hash. */
  voteCode: string | null;
  candidateCount: number;
}

/**
 * Creates the weekly star poll with every active chapter member as a candidate.
 * The poll starts as a draft unless `openNow` is set.
 */
export async function createStarPoll(input: {
  sessionId: string;
  eligibility: 'public' | 'code_required';
  code?: string | null;
  openNow?: boolean;
}): Promise<CreateStarPollResult> {
  assertId(input.sessionId, '活動');
  const session = await prisma.meetingSession.findUnique({ where: { id: input.sessionId }, select: { id: true } });
  if (!session) throw new Error('找不到這場活動，請回活動列表重新進入。');

  const eligibility = input.eligibility === 'public' ? 'public' : 'code_required';
  let voteCode: string | null = null;
  if (eligibility === 'code_required') {
    const custom = input.code?.trim().toUpperCase() ?? '';
    if (custom && (custom.length < 4 || custom.length > 12 || /\s/.test(custom))) {
      throw new Error('投票碼請用 4 到 12 個字，不要有空白；留空會自動產生。');
    }
    voteCode = custom || generateVoteCode();
  }

  const members = await listChapterMembers();
  if (members.length === 0) throw new Error('會員名冊是空的，請先到名冊新增會員再建立投票。');
  if (input.openNow) await assertNoOtherOpenPoll(session.id);

  const poll = await prisma.livePoll.create({
    data: {
      sessionId: session.id,
      title: STAR_POLL_TITLE,
      description: '選出這次表現最亮眼的會員。',
      type: 'single_choice',
      status: input.openNow ? 'open' : 'draft',
      eligibility,
      resultVisibility: 'after_closed',
      voteCodeHash: voteCode ? voteCodeHash(voteCode) : null,
      opensAt: input.openNow ? new Date() : null,
      metadata: { source: 'console', kind: 'star' },
    },
    select: { id: true, status: true },
  });

  // listChapterMembers() is sorted by displayName, so `position` is stable for the same roster.
  await prisma.livePollOption.createMany({
    data: members.map((member, index) => ({
      pollId: poll.id,
      memberId: member.id,
      label: member.displayName,
      position: index,
    })),
  });

  return {
    pollId: poll.id,
    title: STAR_POLL_TITLE,
    status: poll.status,
    eligibility,
    voteCode,
    candidateCount: members.length,
  };
}

const RESULT_VISIBILITIES: PollResultVisibilityKey[] = ['hidden', 'after_closed', 'live_public', 'admin_only'];

export async function updatePoll(input: {
  pollId: string;
  title: string;
  description?: string | null;
  resultVisibility: PollResultVisibilityKey;
}) {
  assertId(input.pollId);
  const title = input.title.trim();
  if (!title) throw new Error('請填寫投票名稱。');
  if (countChars(title) > 40) throw new Error('投票名稱最多 40 個字。');
  const description = input.description?.trim() || null;
  if (description && countChars(description) > 200) throw new Error('說明最多 200 個字。');
  if (!RESULT_VISIBILITIES.includes(input.resultVisibility)) throw new Error('請選擇結果要怎麼公開。');

  const poll = await prisma.livePoll.findUnique({
    where: { id: input.pollId },
    select: { id: true, title: true, metadata: true },
  });
  if (!poll) throw new Error('找不到這場投票，可能已經被刪除。');

  // A renamed star poll must still count as one (past winners, public vote page).
  const metadata = metadataRecord(poll.metadata);
  if (isStarPoll(poll)) metadata.kind = 'star';

  return prisma.livePoll.update({
    where: { id: poll.id },
    data: {
      title,
      description,
      resultVisibility: input.resultVisibility,
      metadata: metadata as Prisma.InputJsonObject,
    },
    select: { id: true, sessionId: true, title: true, resultVisibility: true },
  });
}

/** Draft → open. */
export async function openPoll(pollId: string) {
  assertId(pollId);
  const poll = await prisma.livePoll.findUnique({
    where: { id: pollId },
    select: { id: true, sessionId: true, status: true, _count: { select: { options: true } } },
  });
  if (!poll) throw new Error('找不到這場投票，可能已經被刪除。');
  if (poll.status === 'open') throw new Error('這場投票已經開放了。');
  if (poll.status !== 'draft') throw new Error('已結束的投票請用「重新開放」。');
  if (poll._count.options === 0) throw new Error('這場投票沒有候選人，請刪除後重新建立。');
  await assertNoOtherOpenPoll(poll.sessionId, poll.id);

  return prisma.livePoll.update({
    where: { id: poll.id },
    data: { status: 'open', opensAt: new Date(), closesAt: null },
    select: { id: true, sessionId: true, title: true, status: true },
  });
}

/** Open → closed. Stores the winner summary the same way the older admin flow does. */
export async function closePoll(pollId: string) {
  assertId(pollId);
  const poll = await prisma.livePoll.findUnique({
    where: { id: pollId },
    include: {
      options: { select: { id: true, label: true, memberId: true, position: true, isActive: true } },
      votes: { select: { optionId: true } },
    },
  });
  if (!poll) throw new Error('找不到這場投票，可能已經被刪除。');
  if (poll.status !== 'open') throw new Error('這場投票目前沒有在進行。');

  const ranking = rankOptions(poll.options, poll.votes);
  const closedAt = new Date();
  const closedSummary = {
    closedAt: closedAt.toISOString(),
    voteCount: poll.votes.length,
    highestVoteCount: ranking.highestVoteCount,
    winnerOptionIds: ranking.winners.map((winner) => winner.optionId),
    winnerLabels: ranking.winners.map((winner) => winner.label),
    isTie: ranking.isTie,
  };

  await prisma.livePoll.update({
    where: { id: poll.id },
    data: {
      status: 'closed',
      closesAt: closedAt,
      metadata: { ...metadataRecord(poll.metadata), closedSummary } as Prisma.InputJsonObject,
    },
  });

  return { id: poll.id, sessionId: poll.sessionId, title: poll.title, ...closedSummary };
}

/** Closed → open again. Existing votes stay and voters can change them. */
export async function reopenPoll(pollId: string) {
  assertId(pollId);
  const poll = await prisma.livePoll.findUnique({
    where: { id: pollId },
    select: { id: true, sessionId: true, status: true, opensAt: true, metadata: true },
  });
  if (!poll) throw new Error('找不到這場投票，可能已經被刪除。');
  if (poll.status !== 'closed') throw new Error('只有已結束的投票可以重新開放。');
  await assertNoOtherOpenPoll(poll.sessionId, poll.id);

  const metadata = metadataRecord(poll.metadata);
  delete metadata.closedSummary;

  return prisma.livePoll.update({
    where: { id: poll.id },
    data: {
      status: 'open',
      closesAt: null,
      opensAt: poll.opensAt ?? new Date(),
      metadata: metadata as Prisma.InputJsonObject,
    },
    select: { id: true, sessionId: true, title: true, status: true },
  });
}

/** Removes the poll with its votes and options. */
export async function deletePoll(pollId: string) {
  assertId(pollId);
  const poll = await prisma.livePoll.findUnique({
    where: { id: pollId },
    select: { id: true, sessionId: true, title: true, status: true },
  });
  if (!poll) throw new Error('找不到這場投票，可能已經被刪除。');

  const votes = await prisma.livePollVote.deleteMany({ where: { pollId: poll.id } });
  await prisma.livePollOption.deleteMany({ where: { pollId: poll.id } });
  await prisma.livePoll.delete({ where: { id: poll.id } });

  return { ...poll, deletedVotes: votes.count };
}

// ---------------------------------------------------------------------------
// Public vote page
// ---------------------------------------------------------------------------

export interface PublicPollCandidate {
  optionId: string;
  label: string;
  /** Checked in (present or late) at this event. */
  arrived: boolean;
  /** The visitor's own member identity: cannot be voted for. */
  isSelf: boolean;
}

export interface PublicPollResults {
  totalVotes: number;
  /** Options that received at least one vote, most votes first. */
  rows: Array<{ optionId: string; label: string; voteCount: number }>;
  winners: string[];
  highestVoteCount: number;
  isTie: boolean;
}

export interface PublicPollState {
  /** The open star poll, else the most recently closed one, else null. */
  poll: {
    id: string;
    title: string;
    description: string | null;
    status: 'open' | 'closed';
    eligibility: PollEligibilityKey;
  } | null;
  /** The poll is open, needs a vote code and this visitor has not entered it yet. */
  needsCode: boolean;
  /** Active options of an open poll. Empty when the poll is closed. */
  candidates: PublicPollCandidate[];
  arrivedCount: number;
  myVote: { optionId: string; label: string; comment: string | null; submittedAt: string } | null;
  /** Only present when the poll's result visibility allows the public to see it right now. */
  results: PublicPollResults | null;
}

function resultsArePublic(status: 'open' | 'closed', visibility: PollResultVisibilityKey) {
  if (visibility === 'live_public') return true;
  return visibility === 'after_closed' && status === 'closed';
}

export async function getPublicPollState(
  sessionId: string,
  token?: string | null,
  viewerMemberId?: string | null,
): Promise<PublicPollState> {
  const empty: PublicPollState = { poll: null, needsCode: false, candidates: [], arrivedCount: 0, myVote: null, results: null };
  if (!isObjectId(sessionId)) return empty;

  const polls = (
    await prisma.livePoll.findMany({
      where: { sessionId, status: { in: ['open', 'closed'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        eligibility: true,
        resultVisibility: true,
        closesAt: true,
        updatedAt: true,
        metadata: true,
      },
    })
  ).filter(isStarPoll);

  const closedAt = (poll: (typeof polls)[number]) => (poll.closesAt ?? poll.updatedAt).getTime();
  const poll =
    polls.find((item) => item.status === 'open') ??
    polls.filter((item) => item.status === 'closed').sort((a, b) => closedAt(b) - closedAt(a))[0];
  if (!poll) return empty;

  const status = poll.status === 'open' ? 'open' : 'closed';
  const showResults = resultsArePublic(status, poll.resultVisibility);
  const payload = readVoteToken(token);
  const ownToken = payload && payload.pollId === poll.id ? token! : null;

  const [options, votes, ownVote] = await Promise.all([
    prisma.livePollOption.findMany({
      where: { pollId: poll.id },
      orderBy: { position: 'asc' },
      select: { id: true, label: true, memberId: true, position: true, isActive: true },
    }),
    showResults ? prisma.livePollVote.findMany({ where: { pollId: poll.id }, select: { optionId: true } }) : null,
    ownToken
      ? prisma.livePollVote.findUnique({
          where: { pollId_tokenHash: { pollId: poll.id, tokenHash: tokenHash(ownToken) } },
          select: { optionId: true, comment: true, submittedAt: true },
        })
      : null,
  ]);

  const labelByOption = new Map(options.map((option) => [option.id, option.label]));

  let candidates: PublicPollCandidate[] = [];
  let arrivedCount = 0;
  if (status === 'open') {
    const { rows } = await getAttendance(sessionId);
    const arrivedIds = new Set<string>();
    const arrivedNames = new Set<string>();
    for (const row of rows) {
      if (row.kind !== 'member' || (row.status !== 'present' && row.status !== 'late')) continue;
      if (row.memberId) arrivedIds.add(row.memberId);
      arrivedNames.add(row.displayName.trim());
    }

    candidates = options
      .filter((option) => option.isActive)
      .map((option) => ({
        optionId: option.id,
        label: option.label,
        arrived: option.memberId ? arrivedIds.has(option.memberId) : arrivedNames.has(option.label.trim()),
        isSelf: Boolean(viewerMemberId && option.memberId === viewerMemberId),
      }));
    arrivedCount = candidates.filter((candidate) => candidate.arrived).length;
  }

  let results: PublicPollResults | null = null;
  if (votes) {
    const ranking = rankOptions(options, votes);
    results = {
      totalVotes: votes.length,
      rows: ranking.ranked
        .filter((row) => row.voteCount > 0)
        .map((row) => ({ optionId: row.optionId, label: row.label, voteCount: row.voteCount })),
      winners: ranking.winners.map((winner) => winner.label),
      highestVoteCount: ranking.highestVoteCount,
      isTie: ranking.isTie,
    };
  }

  return {
    poll: { id: poll.id, title: poll.title, description: poll.description, status, eligibility: poll.eligibility },
    needsCode: status === 'open' && poll.eligibility === 'code_required' && !(ownToken && !payload?.expired),
    candidates,
    arrivedCount,
    myVote: ownVote
      ? {
          optionId: ownVote.optionId,
          label: labelByOption.get(ownVote.optionId) ?? '',
          comment: ownVote.comment,
          submittedAt: ownVote.submittedAt.toISOString(),
        }
      : null,
    results,
  };
}

/** True when the token is signed by us, belongs to the poll and has not expired. */
export function isVoteTokenForPoll(token: string | null | undefined, pollId: string) {
  const payload = readVoteToken(token);
  return Boolean(payload && payload.pollId === pollId && !payload.expired);
}

/**
 * Issues a vote token for an open poll. One token = one vote, so the caller
 * must keep it (cookie) and reuse it when the voter changes the vote.
 */
export async function issueVoteToken(input: { pollId: string; code?: string | null; sessionId?: string }) {
  assertId(input.pollId);
  const poll = await prisma.livePoll.findFirst({
    where: { id: input.pollId, ...(input.sessionId ? { sessionId: input.sessionId } : {}) },
    select: { id: true, status: true, eligibility: true, voteCodeHash: true },
  });
  if (!poll) throw new Error('找不到這場投票，請重新整理頁面。');
  if (poll.status !== 'open') throw new Error('投票目前沒有開放。');

  if (poll.eligibility === 'code_required') {
    const code = input.code?.trim() ?? '';
    if (!code) throw new Error('請輸入現場公布的投票碼。');
    if (!poll.voteCodeHash || !safeEqual(voteCodeHash(code), poll.voteCodeHash)) {
      throw new Error('投票碼不正確，請再確認一次現場公布的投票碼。');
    }
  }

  const exp = Date.now() + VOTE_TOKEN_TTL_MS;
  return {
    token: encodeVoteToken({ pollId: poll.id, nonce: randomUUID(), exp }),
    expiresAt: new Date(exp).toISOString(),
  };
}

/**
 * Casts or changes a vote. One vote per token; the same token may move its
 * vote to another candidate until the poll closes.
 *
 * `voterMemberId`: pass the visitor's member id (or null). When left out it is
 * read from the member cookie, so the "no self vote" rule cannot be skipped.
 */
export async function castVote(input: {
  pollId: string;
  optionId: string;
  token: string;
  comment?: string | null;
  voterMemberId?: string | null;
  sessionId?: string;
}) {
  assertId(input.pollId);
  assertId(input.optionId, '候選人');

  const comment = input.comment?.trim() || null;
  if (comment && countChars(comment) > VOTE_COMMENT_MAX) {
    throw new Error(`好話最多 ${VOTE_COMMENT_MAX} 個字，請縮短一點。`);
  }

  const payload = readVoteToken(input.token);
  if (!payload || payload.pollId !== input.pollId) throw new Error('投票憑證無效，請重新整理頁面後再投一次。');
  if (payload.expired) throw new Error('投票憑證已過期，請重新整理頁面後再投一次。');

  const poll = await prisma.livePoll.findFirst({
    where: { id: input.pollId, ...(input.sessionId ? { sessionId: input.sessionId } : {}) },
    select: { id: true, status: true, eligibility: true },
  });
  if (!poll) throw new Error('找不到這場投票，請重新整理頁面。');
  if (poll.status !== 'open') throw new Error('投票已經結束，無法再投票或改票。');

  const option = await prisma.livePollOption.findFirst({
    where: { id: input.optionId, pollId: poll.id, isActive: true },
    select: { id: true, label: true, memberId: true },
  });
  if (!option) throw new Error('這位候選人不在這場投票裡，請重新選擇。');

  const voterMemberId =
    input.voterMemberId === undefined ? (await getViewer()).member?.id ?? null : input.voterMemberId;
  if (poll.eligibility === 'signed_in_member' && !voterMemberId) {
    throw new Error('這場投票只開放會員，請先到登入頁選擇你的會員身份。');
  }
  if (voterMemberId && option.memberId === voterMemberId) throw new Error('不能投給自己');

  const hash = tokenHash(input.token);
  const where = { pollId_tokenHash: { pollId: poll.id, tokenHash: hash } };
  const existing = await prisma.livePollVote.findUnique({ where, select: { id: true } });
  const submittedAt = new Date();

  const change = () =>
    prisma.livePollVote.update({
      where,
      data: { optionId: option.id, comment, submittedAt, metadata: { source: 'tbx-vote-page', changed: true } },
    });

  let changed = Boolean(existing);
  if (existing) {
    await change();
  } else {
    try {
      await prisma.livePollVote.create({
        data: {
          pollId: poll.id,
          optionId: option.id,
          tokenHash: hash,
          anonymousVoterHash: hashValue(payload.nonce),
          comment,
          submittedAt,
          metadata: { source: 'tbx-vote-page' },
        },
      });
    } catch (error) {
      // Double tap: the first request already created the row.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      await change();
      changed = true;
    }
  }

  return { changed, optionId: option.id, label: option.label, hasComment: Boolean(comment), submittedAt: submittedAt.toISOString() };
}
