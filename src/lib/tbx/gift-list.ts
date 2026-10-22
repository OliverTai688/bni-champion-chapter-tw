// Parses a pasted LINE 接龍 gift list ("12. 睿紳 x紅酒 1瓶") into gift rows.
// Pure module: used by the console bulk import and scripts/import-gift-list.mjs.

export interface GiftListMember {
  /** Database id when known (console), or null (script resolves later). */
  id: string | null;
  displayName: string;
  aliases?: string[];
}

export interface ParsedGift {
  line: number;
  raw: string;
  name: string;
  /** Matched chapter member, or null when the donor is free text. */
  donorMemberId: string | null;
  donorMemberName: string | null;
  /** Free-text donor when no member matched (e.g. an English nickname). */
  donorName: string | null;
  note: string | null;
}

/** Nicknames used in the chapter's LINE group that are not in the roster aliases. */
export const GIFT_DONOR_NICKNAMES: Record<string, string> = {
  Mecco: '張媁淇',
  Mina: '陳宜均',
};

const NUMBERED = /^\s*(\d{1,3})\s*[.、．)]\s*(.+?)\s*$/;
// "9/3抽", "-9/17抽": an earlier draw date written after the item.
const DRAW_NOTE = /\s*[-－]?\s*(\d{1,2}\/\d{1,2})\s*抽\s*$/;

function givenName(displayName: string) {
  // Chinese names are surname + given name; two-character given names are what the group uses.
  return displayName.length >= 3 ? displayName.slice(-2) : null;
}

function buildDonorIndex(members: GiftListMember[], formerNames: string[]) {
  const index: Array<{ key: string; member: GiftListMember | null; label: string }> = [];
  const add = (key: string | null | undefined, member: GiftListMember | null, label: string) => {
    const value = key?.trim();
    if (value && !index.some((entry) => entry.key === value)) index.push({ key: value, member, label });
  };
  for (const member of members) {
    add(member.displayName, member, member.displayName);
    for (const alias of member.aliases ?? []) add(alias, member, member.displayName);
  }
  for (const [nickname, fullName] of Object.entries(GIFT_DONOR_NICKNAMES)) {
    const member = members.find((item) => item.displayName === fullName) ?? null;
    add(nickname, member, fullName);
  }
  for (const member of members) add(givenName(member.displayName), member, member.displayName);
  // Former members keep their full name as free text.
  for (const name of formerNames) {
    add(name, null, name);
    add(givenName(name), null, name);
  }
  // Longest key first so "又帆" never shadows a longer match.
  return index.sort((a, b) => b.key.length - a.key.length);
}

/**
 * One numbered line = one gift to draw. Unnumbered lines (titles like 禮品贊助接龍) are skipped.
 * The donor is the name at the start of the line; everything after it is the gift name.
 */
export function parseGiftList(text: string, members: GiftListMember[], formerNames: string[] = []): ParsedGift[] {
  const index = buildDonorIndex(members, formerNames);
  const out: ParsedGift[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const match = rawLine.match(NUMBERED);
    if (!match) continue;
    let body = match[2].trim();

    let note: string | null = null;
    const drawNote = body.match(DRAW_NOTE);
    if (drawNote) {
      note = `清單註記：${drawNote[1]}抽`;
      body = body.slice(0, drawNote.index).trim();
    }

    let donorMemberId: string | null = null;
    let donorMemberName: string | null = null;
    let donorName: string | null = null;
    const hit = index.find((entry) => body.startsWith(entry.key));
    if (hit) {
      if (hit.member) {
        donorMemberId = hit.member.id;
        donorMemberName = hit.member.displayName;
      } else {
        donorName = hit.label;
      }
      body = body.slice(hit.key.length);
    } else {
      // Unknown donor: an English nickname or a single word before the first space.
      const free = body.match(/^([A-Za-z][A-Za-z.'-]*|\S+?)(?=[\s:：])/);
      if (free) {
        donorName = free[1];
        body = body.slice(free[1].length);
      }
    }

    const name = body.replace(/^[\s:：,，、-]+/, '').trim();
    out.push({
      line: Number(match[1]),
      raw: match[2].trim(),
      name: name || match[2].trim(),
      donorMemberId,
      donorMemberName,
      donorName,
      note,
    });
  }
  return out;
}
