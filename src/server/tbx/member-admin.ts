import 'server-only';

import { Prisma, type OperationActorRole } from '@prisma/client';
import { LEADERSHIP_ROLES, taipeiDateKey } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { isObjectId, text } from '@/server/tbx/action';

// ---------------------------------------------------------------------------
// Shared small helpers
// ---------------------------------------------------------------------------

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Value of the group filter that means "no admin group". */

/** One Google account maps to one member: an e-mail already on another member is refused. */
async function assertEmailAvailable(email: string | null | undefined, memberId?: string) {
  if (!email) return;
  const other = await prisma.member.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, ...(memberId ? { id: { not: memberId } } : {}) },
    select: { displayName: true },
  });
  if (other) throw new Error(`這個 Email 已經登記在「${other.displayName}」的檔案，請確認後再儲存。`);
}

export const UNGROUPED = '__none__';

/** Start of a YYYY-MM-DD day in Taiwan time, or null when the text is not a real date. */
export function taipeiDayStart(dateKey: string): Date | null {
  if (!DATE_KEY.test(dateKey)) return null;
  const date = new Date(`${dateKey}T00:00:00.000+08:00`);
  if (Number.isNaN(date.getTime()) || taipeiDateKey(date) !== dateKey) return null;
  return date;
}

/** Last millisecond of a YYYY-MM-DD day in Taiwan time. */
export function taipeiDayEnd(dateKey: string): Date | null {
  const start = taipeiDayStart(dateKey);
  return start ? new Date(start.getTime() + 86_400_000 - 1) : null;
}

function splitList(value: string) {
  const seen = new Set<string>();
  for (const part of value.split(/[,，、;；\n]/)) {
    const item = part.trim();
    if (item) seen.add(item);
  }
  return [...seen];
}

function length(value: string) {
  return [...value].length;
}

function limited(formData: FormData, key: string, label: string, max: number) {
  const value = text(formData, key);
  if (length(value) > max) throw new Error(`${label}最多 ${max} 個字，目前 ${length(value)} 個字，請縮短後再儲存。`);
  return value ? value : null;
}

function readPhone(formData: FormData) {
  const phone = limited(formData, 'phone', '電話', 30);
  if (phone && !/^[0-9+\-#()\s]+$/.test(phone)) {
    throw new Error('電話只能包含數字、空格與 + - # ( )，請修正後再儲存。');
  }
  return phone;
}

function readEmail(formData: FormData) {
  const email = limited(formData, 'email', 'Email', 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email 格式不正確，請確認有 @ 與網域（例如 name@example.com）。');
  }
  return email;
}

/**
 * Prisma on MongoDB: `{ field: null }` does not match documents where the field
 * was never written. Rows created by the older seat-map code have no `category`
 * or `adminGroup` key at all, so both cases have to be listed.
 */
const CATEGORY_UNSET: Prisma.MemberWhereInput = { OR: [{ category: null }, { category: { isSet: false } }] };
const GROUP_UNSET: Prisma.MemberWhereInput = {
  OR: [{ adminGroup: null }, { adminGroup: { isSet: false } }, { adminGroup: '' }],
};

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function nameConflictMessage(conflict: { displayName: string; category: string | null; isActive: boolean }) {
  const name = conflict.displayName;
  if (conflict.category !== 'member') {
    return `「${name}」已經在名單裡（來自座位表，還沒分類）。請到下方「未分類名單」把它設為會員，不用另外新增。`;
  }
  if (!conflict.isActive) {
    return `「${name}」已經在名冊裡，目前是停用狀態。請把狀態篩選切到「停用」後按「恢復」，或改用其他姓名。`;
  }
  return `名冊裡已經有一位「${name}」。姓名不能重複，請改用可區分的姓名（例如加上公司或英文名）。`;
}

function compareZh(a: string, b: string) {
  return a.localeCompare(b, 'zh-Hant', { numeric: true });
}

// ---------------------------------------------------------------------------
// Members (CON-13, CON-14)
// ---------------------------------------------------------------------------

export type MemberStatusFilter = 'active' | 'inactive' | 'all';

export interface MemberListFilter {
  q?: string;
  /** An admin group name, or `UNGROUPED`. */
  group?: string;
  status?: MemberStatusFilter;
}

export interface MemberProfileInput {
  displayName: string;
  adminGroup: string | null;
  roles: string[];
  industry: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  intro: string | null;
  targetCustomers: string | null;
  aliases: string[];
  joinedAt: Date | null;
  isActive: boolean;
  note: string | null;
}

/** Reads and validates the leadership member form. Throws a zh-TW message on bad input. */
export function parseMemberProfileForm(formData: FormData): MemberProfileInput {
  const displayName = text(formData, 'displayName');
  if (!displayName) throw new Error('請填寫會員姓名。');
  if (length(displayName) > 40) throw new Error('姓名最多 40 個字，請縮短後再儲存。');

  const roles = splitList(text(formData, 'roles'));
  if (roles.length > 12) throw new Error('角色標籤最多 12 個，請刪掉幾個後再儲存。');
  if (roles.some((role) => length(role) > 20)) throw new Error('每個角色標籤最多 20 個字。');

  const aliases = splitList(text(formData, 'aliases')).filter((alias) => alias !== displayName);
  if (aliases.length > 10) throw new Error('別名最多 10 個，請刪掉幾個後再儲存。');
  if (aliases.some((alias) => length(alias) > 40)) throw new Error('每個別名最多 40 個字。');

  const joinedText = text(formData, 'joinedAt');
  const joinedAt = joinedText ? taipeiDayStart(joinedText) : null;
  if (joinedText && !joinedAt) throw new Error('入會日期格式不正確，請用日期選擇器重新選一次。');

  return {
    displayName,
    adminGroup: limited(formData, 'adminGroup', '行政分組', 20),
    roles,
    industry: limited(formData, 'industry', '產業', 60),
    company: limited(formData, 'company', '公司', 80),
    phone: readPhone(formData),
    email: readEmail(formData),
    intro: limited(formData, 'intro', '自我介紹', 300),
    targetCustomers: limited(formData, 'targetCustomers', '目標客戶', 300),
    aliases,
    joinedAt,
    // The create form has no checkbox; a hidden `isActivePresent` marks forms that do.
    isActive: formData.get('isActivePresent') ? formData.get('isActive') === 'on' : true,
    note: limited(formData, 'note', '備註', 500),
  };
}

function activeTermWhere(now: Date): Prisma.RoleTermWhereInput {
  return { startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { isSet: false } }, { endsAt: { gte: now } }] };
}

/** Chapter members for the leadership roster, each with the roles whose term covers today. */
export async function listMembersForAdmin(filter: MemberListFilter = {}) {
  const and: Prisma.MemberWhereInput[] = [{ category: 'member' }];
  const status = filter.status ?? 'active';
  if (status === 'active') and.push({ isActive: true });
  if (status === 'inactive') and.push({ isActive: false });

  const group = filter.group?.trim();
  if (group === UNGROUPED) and.push(GROUP_UNSET);
  else if (group) and.push({ adminGroup: group });

  const q = filter.q?.trim();
  if (q) {
    and.push({
      OR: [
        { displayName: { contains: q, mode: 'insensitive' } },
        { industry: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { aliases: { has: q } },
        { roles: { has: q } },
      ],
    });
  }

  const members = await prisma.member.findMany({
    where: { AND: and },
    include: { roleTerms: { where: activeTermWhere(new Date()), select: { id: true, role: true } } },
  });

  return members
    .map(({ roleTerms, ...member }) => ({ ...member, activeRoles: roleTerms.map((term) => term.role) }))
    .sort((a, b) => {
      if (Boolean(a.adminGroup) !== Boolean(b.adminGroup)) return a.adminGroup ? -1 : 1;
      return compareZh(a.adminGroup ?? '', b.adminGroup ?? '') || compareZh(a.displayName, b.displayName);
    });
}

export type AdminMemberRow = Awaited<ReturnType<typeof listMembersForAdmin>>[number];

/** Totals for the roster header and the distinct admin groups for the filter. */
export async function getMemberRosterMeta() {
  const rows = await prisma.member.findMany({
    where: { category: 'member' },
    select: { adminGroup: true, isActive: true },
  });
  const groups = [...new Set(rows.map((row) => row.adminGroup?.trim()).filter((group): group is string => Boolean(group)))].sort(
    compareZh,
  );
  const active = rows.filter((row) => row.isActive).length;
  return { groups, active, inactive: rows.length - active, total: rows.length };
}

/** Names the seat-map code created that nobody has classified yet. */
export async function listUncategorizedMembers() {
  const rows = await prisma.member.findMany({
    where: { AND: [{ isActive: true }, CATEGORY_UNSET] },
    select: {
      id: true,
      displayName: true,
      createdAt: true,
      _count: { select: { assignments: true, participations: true } },
    },
  });
  return rows
    .map((row) => ({
      id: row.id,
      displayName: row.displayName,
      createdAt: row.createdAt,
      seatCount: row._count.assignments,
      eventCount: row._count.participations,
    }))
    .sort((a, b) => compareZh(a.displayName, b.displayName));
}

export async function createMember(input: MemberProfileInput) {
  const conflict = await prisma.member.findUnique({ where: { displayName: input.displayName } });
  if (conflict) throw new Error(nameConflictMessage(conflict));
  try {
    await assertEmailAvailable(input.email);
    return await prisma.member.create({ data: { ...input, category: 'member' } });
  } catch (error) {
    if (isUniqueConflict(error)) throw new Error(`名冊裡已經有一位「${input.displayName}」，姓名不能重複。`);
    throw error;
  }
}

/** Updates a member's profile. Returns the saved row and the names of the fields that changed. */
export async function updateMember(memberId: string, input: MemberProfileInput) {
  if (!isObjectId(memberId)) throw new Error('會員編號不正確，請重新整理名冊後再試。');
  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) throw new Error('找不到這位會員，可能已經被移除。請重新整理名冊。');

  if (existing.displayName !== input.displayName) {
    const conflict = await prisma.member.findUnique({ where: { displayName: input.displayName } });
    if (conflict && conflict.id !== memberId) throw new Error(nameConflictMessage(conflict));
  }

  const changed = (Object.keys(input) as Array<keyof MemberProfileInput>).filter((key) => {
    const before = existing[key];
    const after = input[key];
    if (before instanceof Date || after instanceof Date) {
      return (before instanceof Date ? before.getTime() : null) !== (after instanceof Date ? after.getTime() : null);
    }
    if (Array.isArray(before) || Array.isArray(after)) return JSON.stringify(before ?? []) !== JSON.stringify(after ?? []);
    return (before ?? null) !== (after ?? null);
  });

  try {
    await assertEmailAvailable(input.email, memberId);
    const member = await prisma.member.update({ where: { id: memberId }, data: input });
    return { member, changed, previousName: existing.displayName };
  } catch (error) {
    if (isUniqueConflict(error)) throw new Error(`名冊裡已經有一位「${input.displayName}」，姓名不能重複。`);
    throw error;
  }
}

/** Soft switch only: members are referenced by seats, votes and attendance, so rows are never deleted. */
export async function setMemberActive(memberId: string, isActive: boolean) {
  if (!isObjectId(memberId)) throw new Error('會員編號不正確，請重新整理名冊後再試。');
  const existing = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!existing) throw new Error('找不到這位會員，請重新整理名冊。');
  const member = await prisma.member.update({ where: { id: memberId }, data: { isActive } });
  const activeTerms = isActive ? 0 : await prisma.roleTerm.count({ where: { memberId, ...activeTermWhere(new Date()) } });
  return { member, activeTerms };
}

export type MemberCategory = 'member' | 'guest';

/** Classifies a seat-map name: `member` joins the roster, `guest` removes it from the uncategorized list. */
export async function setMemberCategory(memberId: string, category: MemberCategory) {
  if (!isObjectId(memberId)) throw new Error('名單編號不正確，請重新整理後再試。');
  if (category !== 'member' && category !== 'guest') throw new Error('分類不正確，請重新整理後再試。');
  const existing = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
  if (!existing) throw new Error('找不到這筆名單，請重新整理。');
  return prisma.member.update({ where: { id: memberId }, data: { category } });
}

const RECENT_EVENT_LIMIT = 12;

/** Everything the member file page shows. Null for malformed or unknown ids. */
export async function getMemberDetail(memberId: string) {
  if (!isObjectId(memberId)) return null;
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { roleTerms: { orderBy: { startsAt: 'desc' } } },
  });
  if (!member) return null;

  const now = new Date();
  const todayKey = taipeiDateKey(now);
  const [participations, starVotes] = await Promise.all([
    prisma.participation.findMany({
      where: { memberId, kind: 'member' },
      select: {
        id: true,
        status: true,
        substituteName: true,
        substituteArrivedAt: true,
        checkedInAt: true,
        session: { select: { id: true, weekId: true, title: true, date: true, status: true } },
      },
    }),
    prisma.livePollVote.count({ where: { option: { memberId } } }),
  ]);

  // Session dates are stored as UTC midnight of the event day, so the ISO date is the event's date key.
  const recent = participations
    .filter((row) => row.session.status !== 'canceled' && row.session.date.toISOString().slice(0, 10) <= todayKey)
    .sort((a, b) => b.session.date.getTime() - a.session.date.getTime())
    .slice(0, RECENT_EVENT_LIMIT);

  const counts = { present: 0, late: 0, substitute: 0, leave: 0, medical: 0, expected: 0 };
  for (const row of recent) {
    if (row.status === 'present') counts.present += 1;
    else if (row.status === 'late') counts.late += 1;
    else if (row.status === 'substitute') counts.substitute += 1;
    else if (row.status === 'absent') counts.leave += 1;
    else if (row.status === 'medical') {
      counts.leave += 1;
      counts.medical += 1;
    } else counts.expected += 1;
  }

  const { roleTerms, ...profile } = member;
  return {
    member: profile,
    currentTerms: roleTerms.filter((term) => roleTermPhase(term, now) === 'current'),
    upcomingTerms: roleTerms.filter((term) => roleTermPhase(term, now) === 'upcoming'),
    pastTerms: roleTerms.filter((term) => roleTermPhase(term, now) === 'past'),
    recent,
    counts,
    starVotes,
  };
}

export type MemberDetail = NonNullable<Awaited<ReturnType<typeof getMemberDetail>>>;

// ---------------------------------------------------------------------------
// Role terms (CON-17)
// ---------------------------------------------------------------------------

export type RoleTermPhase = 'current' | 'upcoming' | 'past';

/** Same rule `getViewer()` uses for `activeRoles`: the term covers this instant. */
export function roleTermPhase(term: { startsAt: Date; endsAt: Date | null }, now: Date = new Date()): RoleTermPhase {
  if (term.startsAt.getTime() > now.getTime()) return 'upcoming';
  if (term.endsAt && term.endsAt.getTime() < now.getTime()) return 'past';
  return 'current';
}

export interface RoleTermInput {
  memberId: string;
  role: string;
  /** YYYY-MM-DD, Taiwan time. The term starts at 00:00 that day. */
  startsOn: string;
  /** YYYY-MM-DD, Taiwan time. The term runs through the end of that day. Null = open-ended. */
  endsOn: string | null;
  note: string | null;
}

export function parseRoleTermForm(formData: FormData): RoleTermInput {
  const memberId = text(formData, 'memberId');
  if (!isObjectId(memberId)) throw new Error('請選擇會員。');

  // The dialog resolves the select and the "其他" free text into this one field.
  const role = text(formData, 'role');
  if (!role) throw new Error('請選擇職位。選「其他」的話，要填寫職位名稱。');
  if (length(role) > 30) throw new Error('職位名稱最多 30 個字。');

  const startsOn = text(formData, 'startsAt');
  if (!startsOn) throw new Error('請選擇任期開始日期。');
  if (!taipeiDayStart(startsOn)) throw new Error('開始日期格式不正確，請用日期選擇器重新選一次。');

  const endsOn = text(formData, 'endsAt') || null;
  if (endsOn && !taipeiDayStart(endsOn)) throw new Error('結束日期格式不正確，請用日期選擇器重新選一次。');
  if (endsOn && endsOn < startsOn) throw new Error('結束日期不能早於開始日期。沒有確定的結束日就留空。');

  return { memberId, role, startsOn, endsOn, note: limited(formData, 'note', '備註', 200) };
}

async function roleTermData(input: RoleTermInput, previousEndsAt: Date | null = null) {
  const member = await prisma.member.findUnique({ where: { id: input.memberId }, select: { id: true, displayName: true } });
  if (!member) throw new Error('找不到這位會員，請重新整理後再選一次。');

  const startsAt = taipeiDayStart(input.startsOn);
  if (!startsAt) throw new Error('開始日期格式不正確。');

  let endsAt: Date | null = null;
  if (input.endsOn) {
    // "結束任期" stores the exact moment. Keep it when the date was not changed,
    // otherwise saving the dialog would quietly extend the term to midnight.
    endsAt =
      previousEndsAt && taipeiDateKey(previousEndsAt) === input.endsOn && previousEndsAt.getTime() >= startsAt.getTime()
        ? previousEndsAt
        : taipeiDayEnd(input.endsOn);
    if (!endsAt) throw new Error('結束日期格式不正確。');
  }

  return {
    member,
    data: { memberId: input.memberId, role: input.role, startsAt, endsAt, note: input.note },
  };
}

/** All role terms, split by whether the term covers now. */
export async function listRoleTerms() {
  const terms = await prisma.roleTerm.findMany({
    include: { member: { select: { id: true, displayName: true, isActive: true } } },
    orderBy: [{ startsAt: 'desc' }],
  });
  const now = new Date();
  // Standard leadership roles first, in their usual order; custom roles after.
  const roleOrder = (role: string) => {
    const index = (LEADERSHIP_ROLES as readonly string[]).indexOf(role);
    return index === -1 ? LEADERSHIP_ROLES.length : index;
  };
  const current = terms
    .filter((term) => roleTermPhase(term, now) === 'current')
    .sort(
      (a, b) =>
        roleOrder(a.role) - roleOrder(b.role) ||
        compareZh(a.role, b.role) ||
        compareZh(a.member.displayName, b.member.displayName),
    );
  const upcoming = terms
    .filter((term) => roleTermPhase(term, now) === 'upcoming')
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = terms
    .filter((term) => roleTermPhase(term, now) === 'past')
    .sort((a, b) => (b.endsAt?.getTime() ?? 0) - (a.endsAt?.getTime() ?? 0));
  return { current, upcoming, past };
}

export type RoleTermRow = Awaited<ReturnType<typeof listRoleTerms>>['current'][number];

export async function createRoleTerm(input: RoleTermInput) {
  const { member, data } = await roleTermData(input);
  const term = await prisma.roleTerm.create({ data });
  return { term, memberName: member.displayName };
}

export async function updateRoleTerm(termId: string, input: RoleTermInput) {
  if (!isObjectId(termId)) throw new Error('任期編號不正確，請重新整理後再試。');
  const existing = await prisma.roleTerm.findUnique({ where: { id: termId } });
  if (!existing) throw new Error('找不到這筆任期，可能已經被刪除。請重新整理。');
  const { member, data } = await roleTermData(input, existing.endsAt);
  const term = await prisma.roleTerm.update({ where: { id: termId }, data });
  return { term, memberName: member.displayName };
}

export async function deleteRoleTerm(termId: string) {
  if (!isObjectId(termId)) throw new Error('任期編號不正確，請重新整理後再試。');
  const existing = await prisma.roleTerm.findUnique({
    where: { id: termId },
    include: { member: { select: { displayName: true } } },
  });
  if (!existing) throw new Error('找不到這筆任期，可能已經被刪除。請重新整理。');
  await prisma.roleTerm.delete({ where: { id: termId } });
  return { term: existing, memberName: existing.member.displayName };
}

/** Quick action: the term stops now, and its end date shows as today. */
export async function endRoleTermToday(termId: string) {
  if (!isObjectId(termId)) throw new Error('任期編號不正確，請重新整理後再試。');
  const existing = await prisma.roleTerm.findUnique({
    where: { id: termId },
    include: { member: { select: { displayName: true } } },
  });
  if (!existing) throw new Error('找不到這筆任期，可能已經被刪除。請重新整理。');

  const now = new Date();
  const phase = roleTermPhase(existing, now);
  if (phase === 'upcoming') throw new Error('這個任期還沒開始。要取消請直接刪除，或按「編輯」調整日期。');
  if (phase === 'past') throw new Error('這個任期已經結束了。要調整結束日期請按「編輯」。');

  const term = await prisma.roleTerm.update({ where: { id: termId }, data: { endsAt: now } });
  return { term, memberName: existing.member.displayName };
}

// ---------------------------------------------------------------------------
// Operation log (CON-18)
// ---------------------------------------------------------------------------

export const AUDIT_PAGE_SIZE = 50;

export const ACTOR_ROLE_LABEL: Record<OperationActorRole, string> = {
  admin: '領導團隊',
  staff: '工作人員',
  member: '會員',
  system: '系統',
  import: '匯入',
};

export function isActorRole(value: string): value is OperationActorRole {
  return Object.prototype.hasOwnProperty.call(ACTOR_ROLE_LABEL, value);
}

export interface AuditFilter {
  page?: number;
  /** Matches when the action name contains this text (case-insensitive). */
  action?: string;
  actorRole?: string;
  /** YYYY-MM-DD, Taiwan time, inclusive. */
  from?: string;
  /** YYYY-MM-DD, Taiwan time, inclusive. */
  to?: string;
}

export async function listOperationLogs(filter: AuditFilter = {}) {
  const where: Prisma.OperationLogWhereInput = {};

  const action = filter.action?.trim();
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (filter.actorRole && isActorRole(filter.actorRole)) where.actorRole = filter.actorRole;

  const from = filter.from ? taipeiDayStart(filter.from) : null;
  const to = filter.to ? taipeiDayEnd(filter.to) : null;
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const total = await prisma.operationLog.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const requested = Number.isFinite(filter.page) ? Math.floor(filter.page as number) : 1;
  const page = Math.min(Math.max(1, requested), pageCount);

  const rows = await prisma.operationLog.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * AUDIT_PAGE_SIZE,
    take: AUDIT_PAGE_SIZE,
    include: { session: { select: { weekId: true, title: true } } },
  });

  return { rows, total, page, pageCount, pageSize: AUDIT_PAGE_SIZE };
}

export type OperationLogRow = Awaited<ReturnType<typeof listOperationLogs>>['rows'][number];

// ---------------------------------------------------------------------------
// The member's own business profile (MEM-05)
// ---------------------------------------------------------------------------

export interface OwnProfileInput {
  industry: string | null;
  company: string | null;
  intro: string | null;
  targetCustomers: string | null;
  phone: string | null;
  email: string | null;
}

export const OWN_PROFILE_TEXT_LIMIT = 300;

/** Only the six fields a member may edit. Anything else in the form (ids, names) is ignored. */
export function parseOwnProfileForm(formData: FormData): OwnProfileInput {
  return {
    industry: limited(formData, 'industry', '產業', 60),
    company: limited(formData, 'company', '公司', 80),
    intro: limited(formData, 'intro', '自我介紹', OWN_PROFILE_TEXT_LIMIT),
    targetCustomers: limited(formData, 'targetCustomers', '目標客戶', OWN_PROFILE_TEXT_LIMIT),
    phone: readPhone(formData),
    email: readEmail(formData),
  };
}

export async function getOwnProfile(memberId: string) {
  if (!isObjectId(memberId)) return null;
  return prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      displayName: true,
      adminGroup: true,
      industry: true,
      company: true,
      intro: true,
      targetCustomers: true,
      phone: true,
      email: true,
    },
  });
}

/** `memberId` must come from the verified viewer, never from the form. */
export async function updateOwnProfile(memberId: string, input: OwnProfileInput) {
  if (!isObjectId(memberId)) throw new Error('請先選擇你的會員身份。');
  const existing = await getOwnProfile(memberId);
  if (!existing) throw new Error('找不到你的會員資料，請重新選擇身份後再試。');

  const changed = (Object.keys(input) as Array<keyof OwnProfileInput>).filter(
    (key) => (existing[key] ?? null) !== (input[key] ?? null),
  );
  if (changed.includes('email')) await assertEmailAvailable(input.email, memberId);
  if (changed.length > 0) await prisma.member.update({ where: { id: memberId }, data: input });
  return { changed };
}
