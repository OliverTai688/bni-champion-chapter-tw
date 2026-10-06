import 'server-only';

import { randomBytes, randomInt } from 'node:crypto';
import { Prisma, type Gift, type GiftAward, type Participation } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import { getEventByKey } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { getAttendance, presentPeople, type PresentPerson } from '@/server/tbx/participation';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type WinnerKind = PresentPerson['kind'];

export interface LotterySettings {
  includeMembers: boolean;
  includeGuests: boolean;
  includeSubstitutes: boolean;
  /** Leave out anyone who already holds a current award in this event. */
  excludeWinners: boolean;
}

export const DEFAULT_LOTTERY_SETTINGS: LotterySettings = {
  includeMembers: true,
  includeGuests: true,
  includeSubstitutes: true,
  excludeWinners: true,
};

export interface GiftAwardView {
  id: string;
  giftId: string;
  winnerParticipationId: string | null;
  winnerName: string;
  /** member | guest | substitute, or null for a name typed by a leader. */
  winnerKind: string | null;
  /** random | manual */
  method: string;
  /** awarded (current) | redrawn (history) */
  status: string;
  poolSize: number | null;
  note: string | null;
  editedBy: string | null;
  drawnAt: Date;
  updatedAt: Date;
}

export interface GiftView {
  id: string;
  sessionId: string;
  name: string;
  quantity: number;
  donorMemberId: string | null;
  /** Free-text donor (guest or company). Null when the donor is a member. */
  donorName: string | null;
  /** Name to display: the member's name or the free text. Null when nobody is recorded. */
  donorLabel: string | null;
  note: string | null;
  position: number;
  /** Current winners (`status: 'awarded'`), oldest first. */
  awards: GiftAwardView[];
  /** Results replaced by a redraw, oldest first. */
  history: GiftAwardView[];
  remaining: number;
}

export interface GiftLedgerRow extends GiftView {
  event: { id: string; weekId: string; title: string; date: Date } | null;
}

export interface LotteryPool {
  settings: LotterySettings;
  /** Everyone physically checked in, before the settings are applied. */
  present: PresentPerson[];
  /** People a draw can pick right now. */
  people: PresentPerson[];
  presentCounts: Record<WinnerKind, number>;
  poolCounts: Record<WinnerKind, number>;
  /** Present people left out because they already hold an award. */
  excludedWinners: number;
  size: number;
}

/** Who performed a change, and optionally which event the target must belong to. */
export interface GiftActor {
  actorName?: string | null;
  /** When set, the gift or award must belong to this event. */
  sessionId?: string;
}

export interface DrawResult {
  award: GiftAwardView;
  gift: { id: string; sessionId: string; name: string; quantity: number };
  poolSize: number;
}

/** What the stage page may show. Contains names only: no ids of people, no notes. */
export interface LotteryStageData {
  gifts: Array<{
    id: string;
    name: string;
    donor: string | null;
    quantity: number;
    remaining: number;
    winners: Array<{ awardId: string; name: string; kind: string | null }>;
  }>;
  /** Newest first. */
  winners: Array<{
    awardId: string;
    giftId: string;
    giftName: string;
    donor: string | null;
    winnerName: string;
    winnerKind: string | null;
    drawnAt: Date;
  }>;
  poolSize: number;
  /** Names for the rolling animation. Empty unless `includePoolNames` was requested. */
  poolNames: string[];
}

type Tx = Prisma.TransactionClient;
type Db = Tx | typeof prisma;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const MAX_QUANTITY = 99;
const MAX_NAME = 80;
const MAX_NOTE = 300;

const GIFT_NOT_FOUND = '找不到這份禮物，可能已經被刪除。請重新整理頁面。';
const AWARD_NOT_FOUND = '找不到這筆得獎紀錄，可能已經被移除。請重新整理頁面。';
const WRONG_EVENT = '這份禮物不屬於這場活動，請回到該活動的禮物頁再操作。';

function isKnown(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function assertId(value: string, message: string) {
  if (!OBJECT_ID.test(value)) throw new Error(message);
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toAwardView(award: GiftAward): GiftAwardView {
  return {
    id: award.id,
    giftId: award.giftId,
    winnerParticipationId: award.winnerParticipationId,
    winnerName: award.winnerName,
    winnerKind: award.winnerKind,
    method: award.method,
    status: award.status,
    poolSize: award.poolSize,
    note: award.note,
    editedBy: award.editedBy,
    drawnAt: award.drawnAt,
    updatedAt: award.updatedAt,
  };
}

function toGiftView(gift: Gift & { awards: GiftAward[] }, memberNames: Map<string, string>): GiftView {
  const sorted = [...gift.awards].sort((a, b) => a.drawnAt.getTime() - b.drawnAt.getTime());
  const awards = sorted.filter((award) => award.status === 'awarded').map(toAwardView);
  const history = sorted.filter((award) => award.status !== 'awarded').map(toAwardView);
  const donorLabel = gift.donorMemberId
    ? memberNames.get(gift.donorMemberId) ?? '（已不在名冊的會員）'
    : clean(gift.donorName);
  return {
    id: gift.id,
    sessionId: gift.sessionId,
    name: gift.name,
    quantity: gift.quantity,
    donorMemberId: gift.donorMemberId,
    donorName: gift.donorName,
    donorLabel,
    note: gift.note,
    position: gift.position,
    awards,
    history,
    remaining: Math.max(0, gift.quantity - awards.length),
  };
}

async function loadMemberNames(gifts: Array<{ donorMemberId: string | null }>) {
  const ids = [...new Set(gifts.map((gift) => gift.donorMemberId).filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map<string, string>();
  const members = await prisma.member.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } });
  return new Map(members.map((member) => [member.id, member.displayName]));
}

function sortGifts<T extends { position: number; createdAt: Date }>(gifts: T[]) {
  return [...gifts].sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime());
}

/** Loads a gift and checks it belongs to the expected event when one is given. */
async function loadGift(giftId: string, actor: GiftActor) {
  assertId(giftId, GIFT_NOT_FOUND);
  const gift = await prisma.gift.findUnique({ where: { id: giftId } });
  if (!gift) throw new Error(GIFT_NOT_FOUND);
  if (actor.sessionId && gift.sessionId !== actor.sessionId) throw new Error(WRONG_EVENT);
  return gift;
}

async function loadAward(awardId: string, actor: GiftActor) {
  assertId(awardId, AWARD_NOT_FOUND);
  const award = await prisma.giftAward.findUnique({ where: { id: awardId } });
  if (!award) throw new Error(AWARD_NOT_FOUND);
  const gift = await prisma.gift.findUnique({ where: { id: award.giftId } });
  if (!gift) throw new Error(GIFT_NOT_FOUND);
  if (actor.sessionId && gift.sessionId !== actor.sessionId) throw new Error(WRONG_EVENT);
  return { award, gift };
}

/**
 * Runs `fn` in a transaction that first touches the gift document. Two draws
 * for the same gift then conflict on that write, so the quantity check cannot
 * be passed twice at the same moment.
 */
async function withGiftLock<T>(giftId: string, fn: (tx: Tx, gift: Gift) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        let gift: Gift;
        try {
          gift = await tx.gift.update({ where: { id: giftId }, data: { updatedAt: new Date() } });
        } catch (error) {
          if (isKnown(error, 'P2025')) throw new Error(GIFT_NOT_FOUND);
          throw error;
        }
        return fn(tx, gift);
      });
    } catch (error) {
      if (!isKnown(error, 'P2034')) throw error;
      if (attempt >= 2) throw new Error('同一時間有其他人在操作這份禮物，請再按一次。');
    }
  }
}

/* ------------------------------------------------------------------ */
/* Gifts                                                               */
/* ------------------------------------------------------------------ */

export interface GiftInput {
  name: string;
  quantity: number;
  /** A chapter member. Wins over `donorName` when both are given. */
  donorMemberId?: string | null;
  /** Free text for a guest or a company. */
  donorName?: string | null;
  note?: string | null;
}

async function normalizeGiftInput(input: GiftInput) {
  const name = input.name.trim();
  if (!name) throw new Error('請填寫禮物名稱。');
  if (name.length > MAX_NAME) throw new Error(`禮物名稱請控制在 ${MAX_NAME} 個字以內。`);

  const quantity = Math.trunc(Number(input.quantity));
  if (!Number.isFinite(quantity) || quantity < 1) throw new Error('數量至少是 1。');
  if (quantity > MAX_QUANTITY) throw new Error(`數量最多 ${MAX_QUANTITY}，更多請拆成多筆禮物。`);

  const note = clean(input.note);
  if (note && note.length > MAX_NOTE) throw new Error(`備註請控制在 ${MAX_NOTE} 個字以內。`);

  const donorMemberId = clean(input.donorMemberId);
  if (donorMemberId) {
    assertId(donorMemberId, '提供者的會員資料不正確，請重新選擇。');
    const member = await prisma.member.findUnique({ where: { id: donorMemberId }, select: { id: true, displayName: true } });
    if (!member) throw new Error('找不到這位會員，請重新選擇提供者。');
    return { name, quantity, note, donorMemberId: member.id, donorName: null, donorLabel: member.displayName };
  }

  const donorName = clean(input.donorName);
  if (donorName && donorName.length > MAX_NAME) throw new Error(`提供者名稱請控制在 ${MAX_NAME} 個字以內。`);
  return { name, quantity, note, donorMemberId: null, donorName, donorLabel: donorName };
}

/** Gifts of one event in display order, with current winners, redraw history and the donor's name. */
export async function listGifts(sessionId: string): Promise<GiftView[]> {
  const gifts = await prisma.gift.findMany({ where: { sessionId }, include: { awards: true } });
  const memberNames = await loadMemberNames(gifts);
  return sortGifts(gifts).map((gift) => toGiftView(gift, memberNames));
}

export async function createGift(input: GiftInput & { sessionId: string }, actor: GiftActor = {}): Promise<Gift> {
  assertId(input.sessionId, '找不到這場活動，請重新整理頁面。');
  const data = await normalizeGiftInput(input);
  const last = await prisma.gift.findFirst({
    where: { sessionId: input.sessionId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  const gift = await prisma.gift.create({
    data: {
      sessionId: input.sessionId,
      name: data.name,
      quantity: data.quantity,
      donorMemberId: data.donorMemberId,
      donorName: data.donorName,
      note: data.note,
      position: (last?.position ?? -1) + 1,
    },
  });
  await logOperation({
    sessionId: gift.sessionId,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'gift_created',
    targetType: 'Gift',
    targetId: gift.id,
    metadata: { name: gift.name, quantity: gift.quantity, donor: data.donorLabel, note: gift.note },
  });
  return gift;
}

export async function updateGift(input: GiftInput & { giftId: string }, actor: GiftActor = {}): Promise<Gift> {
  const before = await loadGift(input.giftId, actor);
  const data = await normalizeGiftInput(input);
  const beforeDonor = (await loadMemberNames([before])).get(before.donorMemberId ?? '') ?? clean(before.donorName);

  const gift = await withGiftLock(before.id, async (tx) => {
    const awarded = await tx.giftAward.count({ where: { giftId: before.id, status: 'awarded' } });
    if (data.quantity < awarded) {
      throw new Error(`這份禮物已經有 ${awarded} 位得主，數量不能小於 ${awarded}。要減少請先移除得主。`);
    }
    return tx.gift.update({
      where: { id: before.id },
      data: {
        name: data.name,
        quantity: data.quantity,
        donorMemberId: data.donorMemberId,
        donorName: data.donorName,
        note: data.note,
      },
    });
  });

  await logOperation({
    sessionId: gift.sessionId,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'gift_updated',
    targetType: 'Gift',
    targetId: gift.id,
    metadata: {
      before: { name: before.name, quantity: before.quantity, donor: beforeDonor, note: before.note },
      after: { name: gift.name, quantity: gift.quantity, donor: data.donorLabel, note: gift.note },
    },
  });
  return gift;
}

/** Deletes the gift together with all of its awards (current and history). */
export async function deleteGift(giftId: string, actor: GiftActor = {}): Promise<void> {
  const gift = await loadGift(giftId, actor);
  const awards = await prisma.giftAward.findMany({ where: { giftId: gift.id } });
  await prisma.$transaction([
    prisma.giftAward.deleteMany({ where: { giftId: gift.id } }),
    prisma.gift.delete({ where: { id: gift.id } }),
  ]);
  await logOperation({
    sessionId: gift.sessionId,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'gift_deleted',
    targetType: 'Gift',
    targetId: gift.id,
    metadata: {
      name: gift.name,
      quantity: gift.quantity,
      donorMemberId: gift.donorMemberId,
      donorName: gift.donorName,
      removedAwards: awards.map((award) => ({ winnerName: award.winnerName, status: award.status, method: award.method })),
    },
  });
}

/** Swaps the gift with its neighbour and rewrites positions as 0..n-1. */
export async function moveGift(giftId: string, direction: 'up' | 'down', actor: GiftActor = {}): Promise<void> {
  const gift = await loadGift(giftId, actor);
  const ordered = sortGifts(
    await prisma.gift.findMany({ where: { sessionId: gift.sessionId }, select: { id: true, position: true, createdAt: true } }),
  );
  const from = ordered.findIndex((item) => item.id === gift.id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0) throw new Error(GIFT_NOT_FOUND);
  if (to < 0) throw new Error('這份禮物已經在最上面。');
  if (to >= ordered.length) throw new Error('這份禮物已經在最下面。');

  const next = [...ordered];
  [next[from], next[to]] = [next[to], next[from]];
  const changes = next
    .map((item, index) => ({ id: item.id, from: item.position, to: index }))
    .filter((item) => item.from !== item.to);
  if (changes.length > 0) {
    await prisma.$transaction(
      changes.map((item) => prisma.gift.update({ where: { id: item.id }, data: { position: item.to } })),
    );
  }
  await logOperation({
    sessionId: gift.sessionId,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'gift_moved',
    targetType: 'Gift',
    targetId: gift.id,
    metadata: { name: gift.name, direction, position: to },
  });
}

/* ------------------------------------------------------------------ */
/* Pool                                                                */
/* ------------------------------------------------------------------ */

export function readLotterySettings(metadata: unknown): LotterySettings {
  const raw =
    metadata && typeof metadata === 'object' ? ((metadata as Record<string, unknown>).lottery as Record<string, unknown> | undefined) : undefined;
  const pick = (key: keyof LotterySettings) =>
    raw && typeof raw === 'object' && typeof raw[key] === 'boolean' ? (raw[key] as boolean) : DEFAULT_LOTTERY_SETTINGS[key];
  return {
    includeMembers: pick('includeMembers'),
    includeGuests: pick('includeGuests'),
    includeSubstitutes: pick('includeSubstitutes'),
    excludeWinners: pick('excludeWinners'),
  };
}

/**
 * Saves the pool settings under `metadata.lottery`.
 *
 * The write is a single update pipeline that merges into whatever metadata the
 * document holds at that moment, so keys owned by other pages (for example
 * `attendanceOverrides`) are never replaced, even when they change concurrently.
 */
export async function saveLotterySettings(
  sessionId: string,
  input: Partial<LotterySettings>,
  actor: GiftActor = {},
): Promise<LotterySettings> {
  assertId(sessionId, '找不到這場活動，請重新整理頁面。');
  const session = await prisma.meetingSession.findUnique({ where: { id: sessionId }, select: { id: true, metadata: true } });
  if (!session) throw new Error('找不到這場活動，請重新整理頁面。');

  const before = readLotterySettings(session.metadata);
  const next: LotterySettings = {
    includeMembers: input.includeMembers ?? before.includeMembers,
    includeGuests: input.includeGuests ?? before.includeGuests,
    includeSubstitutes: input.includeSubstitutes ?? before.includeSubstitutes,
    excludeWinners: input.excludeWinners ?? before.excludeWinners,
  };
  if (!next.includeMembers && !next.includeGuests && !next.includeSubstitutes) {
    throw new Error('抽獎池至少要勾選一種對象（會員、來賓或代理人）。');
  }

  const result = (await prisma.$runCommandRaw({
    update: 'MeetingSession',
    updates: [
      {
        q: { _id: { $oid: session.id } },
        u: [
          {
            $set: {
              metadata: {
                $mergeObjects: [
                  { $cond: [{ $eq: [{ $type: '$metadata' }, 'object'] }, '$metadata', {}] },
                  { lottery: { $literal: { ...next } } },
                ],
              },
              updatedAt: '$$NOW',
            },
          },
        ],
      },
    ],
  })) as { n?: number; writeErrors?: unknown[] };
  if (!result.n || (result.writeErrors?.length ?? 0) > 0) {
    throw new Error('抽獎池設定沒有存成功，請再試一次。');
  }

  await logOperation({
    sessionId: session.id,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'lottery_settings_updated',
    targetType: 'MeetingSession',
    targetId: session.id,
    metadata: { before: { ...before }, after: { ...next } },
  });
  return next;
}

type WinnerRef = { winnerParticipationId: string | null; winnerKind: string | null; winnerName: string };

function personKey(participationId: string, kind: string | null) {
  return `${participationId}:${kind ?? ''}`;
}

/** True when `person` is the same individual as one of the recorded winners. */
function winnerMatcher(winners: WinnerRef[]) {
  const keys = new Set<string>();
  const names = new Set<string>();
  for (const winner of winners) {
    if (winner.winnerParticipationId) keys.add(personKey(winner.winnerParticipationId, winner.winnerKind));
    else names.add(winner.winnerName.trim());
  }
  return (person: PresentPerson) => keys.has(personKey(person.participationId, person.kind)) || names.has(person.name.trim());
}

function countByKind(people: PresentPerson[]): Record<WinnerKind, number> {
  const counts: Record<WinnerKind, number> = { member: 0, guest: 0, substitute: 0 };
  for (const person of people) counts[person.kind] += 1;
  return counts;
}

async function currentWinners(db: Db, sessionId: string): Promise<WinnerRef[]> {
  const gifts = await db.gift.findMany({ where: { sessionId }, select: { id: true } });
  if (gifts.length === 0) return [];
  return db.giftAward.findMany({
    where: { giftId: { in: gifts.map((gift) => gift.id) }, status: 'awarded' },
    select: { winnerParticipationId: true, winnerKind: true, winnerName: true },
  });
}

function buildPool(rows: Participation[], settings: LotterySettings, winners: WinnerRef[]): LotteryPool {
  const present = presentPeople(rows);
  const allowed = present.filter((person) => {
    if (person.kind === 'member') return settings.includeMembers;
    if (person.kind === 'guest') return settings.includeGuests;
    return settings.includeSubstitutes;
  });
  const alreadyWon = winnerMatcher(winners);
  const people = settings.excludeWinners ? allowed.filter((person) => !alreadyWon(person)) : allowed;
  return {
    settings,
    present,
    people,
    presentCounts: countByKind(present),
    poolCounts: countByKind(people),
    excludedWinners: allowed.length - people.length,
    size: people.length,
  };
}

async function loadRows(sessionId: string, sync: boolean) {
  if (sync) return (await getAttendance(sessionId)).rows;
  return prisma.participation.findMany({ where: { sessionId }, orderBy: [{ kind: 'asc' }, { displayName: 'asc' }] });
}

/**
 * The people a draw can pick from: everyone physically checked in, filtered by
 * the event's pool settings.
 *
 * `sync: false` skips the attendance sync (which writes) and only reads. Use it
 * on pages that poll, such as the audience view of the stage.
 */
export async function getLotteryPool(sessionId: string, options: { sync?: boolean } = {}): Promise<LotteryPool> {
  const session = await prisma.meetingSession.findUnique({ where: { id: sessionId }, select: { metadata: true } });
  if (!session) throw new Error('找不到這場活動，請重新整理頁面。');
  const rows = await loadRows(sessionId, options.sync ?? true);
  const winners = await currentWinners(prisma, sessionId);
  return buildPool(rows, readLotterySettings(session.metadata), winners);
}

/* ------------------------------------------------------------------ */
/* Awards                                                              */
/* ------------------------------------------------------------------ */

function fullMessage(gift: { quantity: number }) {
  return gift.quantity === 1
    ? '這份禮物已經有得主了。要換人請用「重抽」或「改得主」，要多抽請先把數量加大。'
    : `這份禮物的 ${gift.quantity} 份都已經有得主。要換人請用「重抽」或「改得主」，要多抽請先把數量加大。`;
}

function emptyPoolMessage(pool: LotteryPool) {
  if (pool.present.length === 0) return '抽獎池是空的：還沒有人簽到。請先到「出席與代理」完成簽到再抽。';
  return '抽獎池是空的：在場的人都已經中獎，或被抽獎池設定排除。請到禮物頁調整抽獎池設定。';
}

async function settingsFor(sessionId: string) {
  const session = await prisma.meetingSession.findUnique({ where: { id: sessionId }, select: { metadata: true } });
  return readLotterySettings(session?.metadata);
}

function pickRandom(people: PresentPerson[]) {
  return people[randomInt(people.length)];
}

function randomAwardData(giftId: string, winner: PresentPerson, poolSize: number) {
  return {
    giftId,
    winnerParticipationId: winner.participationId,
    winnerName: winner.name,
    winnerKind: winner.kind,
    method: 'random',
    status: 'awarded',
    poolSize,
    // A record of this draw. The pick itself comes from crypto.randomInt and cannot be replayed from it.
    seed: randomBytes(16).toString('hex'),
  };
}

/** Draws one winner for the gift at random from the current pool. */
export async function drawGift(giftId: string, actor: GiftActor = {}): Promise<DrawResult> {
  const found = await loadGift(giftId, actor);
  // Sync attendance before the transaction: it writes to other collections.
  const rows = await loadRows(found.sessionId, true);
  const settings = await settingsFor(found.sessionId);

  const { award, gift, poolSize } = await withGiftLock(found.id, async (tx, gift) => {
    const awarded = await tx.giftAward.count({ where: { giftId: gift.id, status: 'awarded' } });
    if (awarded >= gift.quantity) throw new Error(fullMessage(gift));

    const pool = buildPool(rows, settings, await currentWinners(tx, gift.sessionId));
    if (pool.size === 0) throw new Error(emptyPoolMessage(pool));

    const winner = pickRandom(pool.people);
    const award = await tx.giftAward.create({ data: randomAwardData(gift.id, winner, pool.size) });
    return { award, gift, poolSize: pool.size };
  });

  await logOperation({
    sessionId: gift.sessionId,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'gift_drawn',
    targetType: 'GiftAward',
    targetId: award.id,
    metadata: {
      giftId: gift.id,
      giftName: gift.name,
      winnerName: award.winnerName,
      winnerKind: award.winnerKind,
      poolSize,
      seed: award.seed,
      settings: { ...settings },
    },
  });
  return { award: toAwardView(award), gift: { id: gift.id, sessionId: gift.sessionId, name: gift.name, quantity: gift.quantity }, poolSize };
}

/**
 * Replaces a current award with a new random draw. The old award stays as
 * history (`status: 'redrawn'`). The previous winner, and anyone already
 * redrawn for this gift, is left out of the new draw.
 */
export async function redrawAward(awardId: string, actor: GiftActor = {}): Promise<DrawResult> {
  const found = await loadAward(awardId, actor);
  if (found.award.status !== 'awarded') throw new Error('這筆結果已經重抽過了，請重新整理頁面看最新得主。');
  const rows = await loadRows(found.gift.sessionId, true);
  const settings = await settingsFor(found.gift.sessionId);

  const { award, previous, gift, poolSize } = await withGiftLock(found.gift.id, async (tx, gift) => {
    const previous = await tx.giftAward.findUnique({ where: { id: found.award.id } });
    if (!previous) throw new Error(AWARD_NOT_FOUND);
    if (previous.status !== 'awarded') throw new Error('這筆結果已經重抽過了，請重新整理頁面看最新得主。');

    await tx.giftAward.update({ where: { id: previous.id }, data: { status: 'redrawn' } });

    const skipped = await tx.giftAward.findMany({
      where: { giftId: gift.id, status: 'redrawn' },
      select: { winnerParticipationId: true, winnerKind: true, winnerName: true },
    });
    const wasSkipped = winnerMatcher(skipped);
    const pool = buildPool(rows, settings, await currentWinners(tx, gift.sessionId));
    const candidates = pool.people.filter((person) => !wasSkipped(person));
    if (candidates.length === 0) {
      // Throwing rolls the transaction back, so the previous winner keeps the gift.
      throw new Error('抽獎池裡沒有其他人可以重抽，原得主維持不變。要換人請用「改得主」直接指定。');
    }

    const winner = pickRandom(candidates);
    const award = await tx.giftAward.create({ data: randomAwardData(gift.id, winner, candidates.length) });
    return { award, previous, gift, poolSize: candidates.length };
  });

  await logOperation({
    sessionId: gift.sessionId,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'gift_redrawn',
    targetType: 'GiftAward',
    targetId: award.id,
    metadata: {
      giftId: gift.id,
      giftName: gift.name,
      previousAwardId: previous.id,
      previousWinnerName: previous.winnerName,
      winnerName: award.winnerName,
      winnerKind: award.winnerKind,
      poolSize,
      seed: award.seed,
    },
  });
  return { award: toAwardView(award), gift: { id: gift.id, sessionId: gift.sessionId, name: gift.name, quantity: gift.quantity }, poolSize };
}

/** Resolves a winner chosen by a leader: a person of this event, or a typed name. */
async function resolveWinner(sessionId: string, input: { participationId?: string | null; winnerName?: string | null }) {
  const participationId = clean(input.participationId);
  if (participationId) {
    assertId(participationId, '得主資料不正確，請重新選擇。');
    const row = await prisma.participation.findUnique({ where: { id: participationId } });
    if (!row || row.sessionId !== sessionId) throw new Error('找不到這位出席者，請重新整理頁面後再選一次。');
    // A row stands for the substitute while the substitute is the one in the room.
    const person = presentPeople([row])[0];
    return person
      ? { winnerParticipationId: row.id, winnerName: person.name, winnerKind: person.kind as string }
      : { winnerParticipationId: row.id, winnerName: row.displayName, winnerKind: row.kind as string };
  }
  const winnerName = clean(input.winnerName);
  if (!winnerName) throw new Error('請選擇得主，或填寫得主姓名。');
  if (winnerName.length > MAX_NAME) throw new Error(`得主姓名請控制在 ${MAX_NAME} 個字以內。`);
  return { winnerParticipationId: null, winnerName, winnerKind: null };
}

/** A leader hands the gift to a specific person (`method: 'manual'`). */
export async function assignAward(
  input: { giftId: string; participationId?: string | null; winnerName?: string | null; note?: string | null },
  actor: GiftActor = {},
): Promise<GiftAwardView> {
  const found = await loadGift(input.giftId, actor);
  const winner = await resolveWinner(found.sessionId, input);
  const note = clean(input.note);
  if (note && note.length > MAX_NOTE) throw new Error(`備註請控制在 ${MAX_NOTE} 個字以內。`);

  const { award, gift } = await withGiftLock(found.id, async (tx, gift) => {
    const awarded = await tx.giftAward.count({ where: { giftId: gift.id, status: 'awarded' } });
    if (awarded >= gift.quantity) throw new Error(fullMessage(gift));
    const award = await tx.giftAward.create({
      data: { giftId: gift.id, ...winner, method: 'manual', status: 'awarded', note, editedBy: actor.actorName ?? null },
    });
    return { award, gift };
  });

  await logOperation({
    sessionId: gift.sessionId,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'gift_award_assigned',
    targetType: 'GiftAward',
    targetId: award.id,
    metadata: { giftId: gift.id, giftName: gift.name, winnerName: award.winnerName, winnerKind: award.winnerKind, note },
  });
  return toAwardView(award);
}

/**
 * Edits who took the gift, at any time. Pass `participationId` or `winnerName`
 * to change the winner; `note: null` clears the note and `undefined` keeps it.
 * The award stays current (`status: 'awarded'`) and `editedBy` is recorded.
 */
export async function updateAward(
  input: { awardId: string; participationId?: string | null; winnerName?: string | null; note?: string | null },
  actor: GiftActor = {},
): Promise<GiftAwardView> {
  const { award: before, gift } = await loadAward(input.awardId, actor);
  if (before.status !== 'awarded') throw new Error('這筆是重抽前的舊紀錄，不能修改。請修改目前的得主。');

  const participationId = clean(input.participationId);
  const winnerName = clean(input.winnerName);
  let winner: Awaited<ReturnType<typeof resolveWinner>> | null = null;
  if (participationId || winnerName) {
    const resolved = await resolveWinner(gift.sessionId, { participationId, winnerName });
    const unchanged =
      resolved.winnerParticipationId === before.winnerParticipationId &&
      resolved.winnerKind === before.winnerKind &&
      resolved.winnerName === before.winnerName;
    winner = unchanged ? null : resolved;
  }

  const note = input.note === undefined ? before.note : clean(input.note);
  if (note && note.length > MAX_NOTE) throw new Error(`備註請控制在 ${MAX_NOTE} 個字以內。`);
  if (!winner && note === before.note) throw new Error('內容沒有變動。請改得主或備註後再儲存。');

  let award: GiftAward;
  try {
    award = await prisma.giftAward.update({
      where: { id: before.id },
      data: { ...(winner ?? {}), note, status: 'awarded', editedBy: actor.actorName ?? '領導團隊' },
    });
  } catch (error) {
    if (isKnown(error, 'P2025')) throw new Error(AWARD_NOT_FOUND);
    throw error;
  }

  await logOperation({
    sessionId: gift.sessionId,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'gift_award_updated',
    targetType: 'GiftAward',
    targetId: award.id,
    metadata: {
      giftId: gift.id,
      giftName: gift.name,
      before: { winnerName: before.winnerName, winnerKind: before.winnerKind, note: before.note },
      after: { winnerName: award.winnerName, winnerKind: award.winnerKind, note: award.note },
    },
  });
  return toAwardView(award);
}

/** Removes an award record. The gift goes back to "waiting" when it was a current award. */
export async function deleteAward(awardId: string, actor: GiftActor = {}): Promise<void> {
  const { award, gift } = await loadAward(awardId, actor);
  try {
    await prisma.giftAward.delete({ where: { id: award.id } });
  } catch (error) {
    if (isKnown(error, 'P2025')) throw new Error(AWARD_NOT_FOUND);
    throw error;
  }
  await logOperation({
    sessionId: gift.sessionId,
    actorRole: 'admin',
    actorName: actor.actorName,
    action: 'gift_award_deleted',
    targetType: 'GiftAward',
    targetId: award.id,
    metadata: {
      giftId: gift.id,
      giftName: gift.name,
      winnerName: award.winnerName,
      winnerKind: award.winnerKind,
      method: award.method,
      status: award.status,
      drawnAt: award.drawnAt.toISOString(),
    },
  });
}

/* ------------------------------------------------------------------ */
/* Ledger and stage                                                    */
/* ------------------------------------------------------------------ */

/** Every gift across events, newest event first, for the ledger page. */
export async function listGiftLedger(options: { eventKey?: string | null; q?: string | null } = {}): Promise<GiftLedgerRow[]> {
  const eventKey = clean(options.eventKey);
  let sessionFilter: string | undefined;
  if (eventKey) {
    const event = await getEventByKey(eventKey);
    if (!event) return [];
    sessionFilter = event.id;
  }

  const gifts = await prisma.gift.findMany({
    where: sessionFilter ? { sessionId: sessionFilter } : {},
    include: { awards: true },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });
  if (gifts.length === 0) return [];

  const [memberNames, sessions] = await Promise.all([
    loadMemberNames(gifts),
    prisma.meetingSession.findMany({
      where: { id: { in: [...new Set(gifts.map((gift) => gift.sessionId))] } },
      select: { id: true, weekId: true, title: true, date: true },
    }),
  ]);
  const sessionById = new Map(sessions.map((session) => [session.id, session]));

  const rows: GiftLedgerRow[] = gifts.map((gift) => ({
    ...toGiftView(gift, memberNames),
    event: sessionById.get(gift.sessionId) ?? null,
  }));

  rows.sort((a, b) => {
    const byDate = (b.event?.date.getTime() ?? 0) - (a.event?.date.getTime() ?? 0);
    if (byDate !== 0) return byDate;
    if (a.sessionId !== b.sessionId) return a.sessionId < b.sessionId ? -1 : 1;
    return a.position - b.position;
  });

  const q = clean(options.q)?.toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    [
      row.name,
      row.donorLabel,
      row.note,
      row.event?.title,
      row.event?.weekId,
      ...row.awards.map((award) => award.winnerName),
      ...row.awards.map((award) => award.note),
    ].some((value) => value?.toLowerCase().includes(q)),
  );
}

/**
 * Data for the stage page (`/e/[eventKey]/lottery`).
 *
 * - `includePoolNames`: only for leaders, who need names for the rolling animation.
 * - `hideNewerThanMs`: hides results younger than this, so phones polling the page
 *   do not show the winner before the big screen finishes rolling.
 * - `sync`: see `getLotteryPool`.
 */
export async function getLotteryStage(
  sessionId: string,
  options: { includePoolNames?: boolean; hideNewerThanMs?: number; sync?: boolean } = {},
): Promise<LotteryStageData> {
  const [gifts, pool] = await Promise.all([
    listGifts(sessionId),
    getLotteryPool(sessionId, { sync: options.sync ?? false }),
  ]);
  const cutoff = options.hideNewerThanMs ? Date.now() - options.hideNewerThanMs : null;
  const visible = (award: GiftAwardView) => cutoff === null || award.drawnAt.getTime() <= cutoff;

  const stageGifts = gifts.map((gift) => {
    const winners = gift.awards.filter(visible);
    return {
      id: gift.id,
      name: gift.name,
      donor: gift.donorLabel,
      quantity: gift.quantity,
      remaining: Math.max(0, gift.quantity - winners.length),
      winners: winners.map((award) => ({ awardId: award.id, name: award.winnerName, kind: award.winnerKind })),
    };
  });

  const winners = gifts
    .flatMap((gift) =>
      gift.awards.filter(visible).map((award) => ({
        awardId: award.id,
        giftId: gift.id,
        giftName: gift.name,
        donor: gift.donorLabel,
        winnerName: award.winnerName,
        winnerKind: award.winnerKind,
        drawnAt: award.drawnAt,
      })),
    )
    .sort((a, b) => b.drawnAt.getTime() - a.drawnAt.getTime());

  return {
    gifts: stageGifts,
    winners,
    poolSize: pool.size,
    poolNames: options.includePoolNames ? [...new Set(pool.people.map((person) => person.name.trim()).filter(Boolean))] : [],
  };
}
