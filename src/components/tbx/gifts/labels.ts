// Labels and client-safe types shared by the gift pages (console and stage).

export const WINNER_KIND_LABEL: Record<string, string> = {
  member: '會員',
  guest: '來賓',
  substitute: '代理人',
};

export function winnerKindLabel(kind: string | null | undefined) {
  return kind ? WINNER_KIND_LABEL[kind] ?? '其他' : '其他';
}

export function winnerKindChip(kind: string | null | undefined) {
  if (kind === 'guest') return 'tb-chip tb-chip-guest';
  if (kind === 'substitute') return 'tb-chip tb-chip-substitute';
  if (kind === 'member') return 'tb-chip';
  return 'tb-chip tb-chip-plain';
}

export const AWARD_METHOD_LABEL: Record<string, string> = {
  random: '隨機',
  manual: '指定',
};

/** A chapter member a gift can be credited to. */
export interface MemberOption {
  id: string;
  name: string;
}

/** A person who is checked in and can be handed a gift. */
export interface PersonOption {
  participationId: string;
  name: string;
  kind: 'member' | 'guest' | 'substitute';
  /** For substitutes: the member they stand in for. */
  represents: string | null;
}

export function personOptionLabel(person: PersonOption) {
  if (person.kind === 'substitute') return `${person.name}（代理 ${person.represents ?? '會員'}）`;
  return `${person.name}（${WINNER_KIND_LABEL[person.kind]}）`;
}

/** Result of a draw made from the stage page. */
export type StageDrawResult =
  | { ok: true; awardId: string; giftId: string; winnerName: string; winnerKind: string | null; poolSize: number }
  | { ok: false; message: string };

export interface StageGift {
  id: string;
  name: string;
  donor: string | null;
  quantity: number;
  remaining: number;
  winners: Array<{ awardId: string; name: string; kind: string | null }>;
}

export interface StageWinner {
  awardId: string;
  giftId: string;
  giftName: string;
  donor: string | null;
  winnerName: string;
  winnerKind: string | null;
  /** Already formatted in Taiwan time. */
  time: string;
}
