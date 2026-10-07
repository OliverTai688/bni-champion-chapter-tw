// Meeting roles shown on seat plans and attendance lists (safe on client and server).
// A person can hold several roles at once, e.g. 值日 and 音控.

export type MeetingRoleKind = 'leader' | 'duty' | 'sound' | 'host' | 'guest' | 'substitute' | 'newcomer' | 'mentor';

export interface MeetingRole {
  kind: MeetingRoleKind;
  /** Full name: 主席, 值日, 導師… */
  label: string;
  /** One character drawn on the seat. */
  short: string;
  /** Who the role relates to: the mentor of a newcomer, the guest of a host… */
  detail?: string;
}

/** Duties a leader assigns per event. Stored as keys in `Participation.roles`. */
export const EVENT_DUTIES = [
  { key: 'duty', label: '值日', short: '值' },
  { key: 'sound', label: '音控', short: '音' },
] as const;

export type EventDutyKey = (typeof EVENT_DUTIES)[number]['key'];

const DUTY_KEYS = new Set<string>(EVENT_DUTIES.map((duty) => duty.key));

/** Keeps known duty keys only, without duplicates, in display order. */
export function cleanDutyKeys(values: readonly unknown[]): EventDutyKey[] {
  const picked = new Set(values.filter((value): value is string => typeof value === 'string' && DUTY_KEYS.has(value)));
  return EVENT_DUTIES.map((duty) => duty.key).filter((key) => picked.has(key));
}

const LEADER_SHORT: Record<string, string> = {
  主席: '主',
  副主席: '副',
  秘書財務: '秘',
  財務秘書: '秘',
  來賓接待: '接',
  教育協調: '教',
  活動協調: '活',
  導師協調: '協',
  // 長, not 導: 導 is the tag of an ordinary 導師.
  導師長: '長',
  會員委員: '委',
  品牌成長: '品',
};

export function leaderRole(role: string): MeetingRole {
  return { kind: 'leader', label: role, short: LEADER_SHORT[role] ?? role.slice(0, 1) };
}

export function dutyRole(key: EventDutyKey): MeetingRole {
  const duty = EVENT_DUTIES.find((item) => item.key === key)!;
  return { kind: key, label: duty.label, short: duty.short };
}

export const ROLE_STYLE: Record<MeetingRoleKind, { background: string; color: string }> = {
  leader: { background: '#d9a845', color: '#1a1405' },
  duty: { background: '#4db6c4', color: '#06181b' },
  sound: { background: '#4db6c4', color: '#06181b' },
  host: { background: '#6fa9e6', color: '#07172a' },
  guest: { background: '#6fa9e6', color: '#07172a' },
  substitute: { background: '#a594ee', color: '#120c2e' },
  newcomer: { background: '#e792b5', color: '#2a0a18' },
  mentor: { background: '#e792b5', color: '#2a0a18' },
};

/** 值日、音控 */
export function roleSummary(roles: readonly MeetingRole[]) {
  return roles.map((role) => role.label).join('、');
}

export interface RoleLegendEntry {
  kind: MeetingRoleKind;
  label: string;
  short: string;
  /** 戴宇星, or 陳軾（導師 王柏詠） */
  people: string[];
}

/** One line per role that is actually present, in a stable order, for the legend under a plan. */
export function buildRoleLegend(seats: ReadonlyArray<{ name: string | null; roles?: readonly MeetingRole[] }>): RoleLegendEntry[] {
  const entries = new Map<string, RoleLegendEntry>();
  for (const seat of seats) {
    if (!seat.name || !seat.roles) continue;
    for (const role of seat.roles) {
      const key = `${role.kind}:${role.label}`;
      const entry = entries.get(key) ?? { kind: role.kind, label: role.label, short: role.short, people: [] };
      entry.people.push(role.detail ? `${seat.name}（${role.detail}）` : seat.name);
      entries.set(key, entry);
    }
  }
  const order: MeetingRoleKind[] = ['leader', 'duty', 'sound', 'newcomer', 'mentor', 'guest', 'host', 'substitute'];
  // Within the head team: 主席 first, then the usual order of offices.
  const offices = Object.keys(LEADER_SHORT);
  const rank = (entry: RoleLegendEntry) => {
    const office = entry.kind === 'leader' ? offices.indexOf(entry.label) : 0;
    return order.indexOf(entry.kind) * 100 + (office < 0 ? offices.length : office);
  };
  return [...entries.values()].sort((a, b) => rank(a) - rank(b));
}
