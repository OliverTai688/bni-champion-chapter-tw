import 'server-only';

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { validateSeatingWorkspace, getSeatCoordinate } from '@/lib/seating-validation';
import { deriveSeats } from '@/lib/tbx/plan';
import { LEADERSHIP_ROLES, STATUS_LABEL } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { findLatestSeatMapByWeekId, saveSeatingDraft } from '@/server/repositories/seating-workspace-repository';
import { loadSeatingEditorState } from '@/server/seating/seating-page-state';
import { getEventByKey, listEvents } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { getAttendance } from '@/server/tbx/participation';
import { getEventSeatPlan, saveSeatAssignments } from '@/server/tbx/seat-plan';
import type { IndustryChain, SeatData } from '@/types/seating';

export const GRID_COLUMNS = 4;
const MAX_GRID_SEATS = 400;

export class AiInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

let cachedRules: string | null = null;
/** The chapter's seating rule book (docs/rule.md). */
export function seatingRules() {
  if (cachedRules === null) {
    try {
      cachedRules = readFileSync(path.join(process.cwd(), 'docs', 'rule.md'), 'utf8');
    } catch {
      cachedRules = '';
    }
  }
  return cachedRules;
}

export const SEAT_TYPES = ['member', 'guest', 'host', 'proxy', 'sound', 'duty'] as const;
export type SeatType = (typeof SEAT_TYPES)[number];

export interface AiSeat {
  name: string;
  type: SeatType;
  guestNumber?: string;
  hostFor?: string;
  note?: string;
}

function seatTypeOf(seat: SeatData): SeatType {
  if (seat.isGuest) return 'guest';
  if (seat.isHost) return 'host';
  if (seat.isSound) return 'sound';
  if (seat.isDuty) return 'duty';
  if (seat.role === '代理') return 'proxy';
  return 'member';
}

function toAiSeat(seat: SeatData | null): AiSeat | null {
  if (!seat?.name?.trim()) return null;
  const type = seatTypeOf(seat);
  return {
    name: seat.name.trim(),
    type,
    ...(seat.guestNumber ? { guestNumber: seat.guestNumber } : {}),
    ...(seat.hostFor ? { hostFor: seat.hostFor } : {}),
  };
}

function requireWeekly(weekId: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekId)) {
    throw new AiInputError('這場活動不是每週例會，沒有格狀座位表。請改用 seat-plan（平面座位表）。', 409);
  }
}

async function loadEvent(eventKey: string) {
  const event = await getEventByKey(eventKey);
  if (!event) throw new AiInputError(`找不到活動 ${eventKey}。先呼叫 list_events 取得 eventKey。`, 404);
  return event;
}

export async function listAiEvents() {
  const events = await listEvents();
  const ids = events.map((event) => event.id);
  const [grids, plans] = await Promise.all([
    prisma.seatMap.findMany({ where: { sessionId: { in: ids } }, select: { sessionId: true, version: true } }),
    prisma.eventSeatPlan.findMany({ where: { sessionId: { in: ids } }, select: { sessionId: true } }),
  ]);
  const gridVersion = new Map<string, number>();
  for (const grid of grids) gridVersion.set(grid.sessionId, Math.max(gridVersion.get(grid.sessionId) ?? 0, grid.version));
  const planIds = new Set(plans.map((plan) => plan.sessionId));
  return events.map((event) => ({
    eventKey: event.weekId,
    date: event.date.toISOString().slice(0, 10),
    title: event.title,
    eventType: event.eventType ?? 'weekly_meeting',
    status: event.status,
    publicStatus: event.publicStatus,
    gridSeatMap: gridVersion.has(event.id) ? { version: gridVersion.get(event.id) } : null,
    seatPlan: planIds.has(event.id),
  }));
}

/** Everything an assistant needs to arrange seats for one event. No phone numbers or e-mail. */
export async function getSeatingContext(eventKey: string) {
  const event = await loadEvent(eventKey);
  const now = new Date();
  const [{ rows, summary }, members, terms, editor, plan] = await Promise.all([
    getAttendance(event.id),
    prisma.member.findMany({
      where: { category: 'member', isActive: true },
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true, adminGroup: true, industry: true, company: true, targetCustomers: true, aliases: true },
    }),
    prisma.roleTerm.findMany({
      where: { startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { isSet: false } }, { endsAt: { gte: now } }] },
      select: { memberId: true, role: true },
    }),
    /^\d{4}-\d{2}-\d{2}$/.test(event.weekId) ? loadSeatingEditorState(event.weekId) : null,
    getEventSeatPlan(event.id),
  ]);

  const rolesByMember = new Map<string, string[]>();
  for (const term of terms) rolesByMember.set(term.memberId, [...(rolesByMember.get(term.memberId) ?? []), term.role]);
  const memberNameById = new Map(members.map((member) => [member.id, member.displayName]));

  const grid =
    editor && editor.loadedFrom === 'database'
      ? {
          version: (await findLatestSeatMapByWeekId(event.weekId))?.version ?? null,
          updatedAt: editor.updatedAt ?? null,
          columns: GRID_COLUMNS,
          topRoles: editor.layout.topRoles.map((seat) => ({ role: seat.role ?? '', name: seat.name })),
          rows: chunk(editor.layout.mainGrid.flat().map(toAiSeat), GRID_COLUMNS),
          heroes: editor.heroes,
          industryChains: editor.industryChains,
          validation: validateSeatingWorkspace({
            topRoles: editor.layout.topRoles,
            items: editor.layout.mainGrid.flat(),
            industryChains: editor.industryChains,
          }),
        }
      : null;

  return {
    event: {
      eventKey: event.weekId,
      date: event.date.toISOString().slice(0, 10),
      title: event.title,
      eventType: event.eventType ?? 'weekly_meeting',
      startsAt: event.startsAt,
      location: event.location,
    },
    howTo: [
      '每週例會用格狀座位表（grid）：topRoles 是主持團 5 人，rows 每列 4 格（欄 0-1 第一張長桌、欄 2-3 第二張長桌），null 表示空位。',
      '用 validate_seating 檢查，再用 save_seating 寫入；寫入時帶 baseVersion，避免覆蓋別人剛存的版本。',
      '排座規則見 rules；主持團、音控、值日生人選以本次資料（grid.topRoles、出席名單）為準，規則書中的人名可能已過時。',
      'attendance 是出席與代理的唯一資料來源：status=absent/medical 的會員不要排座；status=substitute 的會員由代理人坐，座位用 type=proxy、name=代理人姓名。',
      '非例會活動用平面座位表（seatPlan）：用 save_seat_plan 傳 { seatId: participationId }。',
    ],
    rules: seatingRules(),
    members: members.map((member) => ({
      name: member.displayName,
      adminGroup: member.adminGroup,
      industry: member.industry,
      company: member.company,
      targetCustomers: member.targetCustomers,
      leadershipRoles: (rolesByMember.get(member.id) ?? []).filter((role) => (LEADERSHIP_ROLES as readonly string[]).includes(role)),
      aliases: member.aliases,
    })),
    attendance: {
      summary,
      people: rows.map((row) => ({
        participationId: row.id,
        kind: row.kind,
        name: row.displayName,
        status: row.status,
        statusLabel: STATUS_LABEL[row.status],
        substituteName: row.status === 'substitute' ? row.substituteName : null,
        guestIndustry: row.kind === 'guest' ? row.guestIndustry : null,
        guestCompany: row.kind === 'guest' ? row.guestCompany : null,
        hostMember: row.hostMemberId ? memberNameById.get(row.hostMemberId) ?? null : null,
        invitedBy: row.invitedByMemberId ? memberNameById.get(row.invitedByMemberId) ?? null : null,
      })),
    },
    grid,
    seatPlan: plan
      ? {
          venueName: plan.venueName,
          widthM: plan.widthM,
          heightM: plan.heightM,
          seats: deriveSeats(plan.objects).map((seat) => ({ seatId: seat.seatId, label: seat.label, x: seat.x, y: seat.y })),
          assignments: plan.assignments,
          updatedAt: plan.updatedAt.toISOString(),
        }
      : null,
  };
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface GridArrangementInput {
  topRoles?: Array<{ role: string; name: string }>;
  rows?: Array<Array<AiSeat | null>>;
  seats?: Array<AiSeat | null>;
  heroes?: string[];
  industryChains?: IndustryChain[];
  baseVersion?: number;
  reason?: string;
  force?: boolean;
}

function readSeat(value: unknown, index: number): AiSeat | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.trim() ? { name: value.trim(), type: 'member' } : null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new AiInputError(`第 ${index + 1} 格的格式不正確：要是 null、姓名字串或 { name, type }。`);
  const seat = value as Record<string, unknown>;
  const name = typeof seat.name === 'string' ? seat.name.trim() : '';
  if (!name) return null;
  const type = (typeof seat.type === 'string' ? seat.type : 'member') as SeatType;
  if (!SEAT_TYPES.includes(type)) throw new AiInputError(`第 ${index + 1} 格 type「${String(seat.type)}」不正確，可用：${SEAT_TYPES.join(', ')}。`);
  return {
    name: name.slice(0, 40),
    type,
    guestNumber: typeof seat.guestNumber === 'string' ? seat.guestNumber.trim().slice(0, 10) : undefined,
    hostFor: typeof seat.hostFor === 'string' ? seat.hostFor.trim().slice(0, 10) : undefined,
  };
}

function toSeatData(seat: AiSeat | null, index: number, previous: Map<string, SeatData>): SeatData | null {
  if (!seat) return null;
  const before = previous.get(seat.name);
  const base: SeatData = { id: before?.id ?? `ai-${index}-${seat.name}`, name: seat.name, isGuest: false };
  if (seat.type === 'guest') return { ...base, isGuest: true, guestNumber: seat.guestNumber || '來賓' };
  if (seat.type === 'host') return { ...base, isHost: true, hostFor: seat.hostFor, role: before?.role && before.role !== '代理' ? before.role : undefined };
  if (seat.type === 'sound') return { ...base, isSound: true };
  if (seat.type === 'duty') return { ...base, isDuty: true };
  if (seat.type === 'proxy') return { ...base, role: '代理' };
  return { ...base, role: before?.role && before.role !== '代理' ? before.role : undefined };
}

/**
 * Turns an assistant's arrangement into the editor's workspace shape and checks it
 * against the chapter rules and today's attendance. Nothing is written.
 */
export async function evaluateGridArrangement(eventKey: string, body: unknown) {
  const event = await loadEvent(eventKey);
  requireWeekly(event.weekId);
  if (!body || typeof body !== 'object') throw new AiInputError('請傳 JSON 物件。');
  const input = body as GridArrangementInput;

  const current = await loadSeatingEditorState(event.weekId);
  const currentTop = current?.layout.topRoles ?? [];
  const currentItems = current?.layout.mainGrid.flat() ?? [];

  const flat: unknown[] = Array.isArray(input.rows)
    ? input.rows.flatMap((row, rowIndex) => {
        if (!Array.isArray(row)) throw new AiInputError(`rows[${rowIndex}] 要是陣列。`);
        if (row.length > GRID_COLUMNS) throw new AiInputError(`rows[${rowIndex}] 超過 ${GRID_COLUMNS} 格。`);
        return [...row, ...Array(GRID_COLUMNS - row.length).fill(null)];
      })
    : Array.isArray(input.seats)
      ? input.seats
      : (() => {
          throw new AiInputError('請提供 rows（每列 4 格的二維陣列）或 seats（依列展開的一維陣列）。');
        })();
  if (flat.length > MAX_GRID_SEATS) throw new AiInputError(`座位數超過上限 ${MAX_GRID_SEATS}。`);
  const aiSeats = flat.map(readSeat);

  const previous = new Map<string, SeatData>();
  for (const seat of [...currentTop, ...currentItems]) if (seat?.name) previous.set(seat.name.trim(), seat);

  const topRoles: SeatData[] = Array.isArray(input.topRoles)
    ? input.topRoles.map((role, index) => {
        const name = typeof role?.name === 'string' ? role.name.trim() : '';
        const roleName = typeof role?.role === 'string' ? role.role.trim() : '';
        if (!roleName) throw new AiInputError(`topRoles[${index}] 缺少 role。`);
        return { id: `top-${roleName}`, name, role: roleName, isGuest: false };
      })
    : currentTop;
  const items = aiSeats.map((seat, index) => toSeatData(seat, index, previous));
  const industryChains = Array.isArray(input.industryChains) ? input.industryChains : current?.industryChains ?? [];
  const heroes = Array.isArray(input.heroes) ? input.heroes.filter((name): name is string => typeof name === 'string') : current?.heroes ?? [];

  const rules = validateSeatingWorkspace({ topRoles, items, industryChains });

  // Attendance-aware checks the editor rules do not cover.
  const { rows } = await getAttendance(event.id);
  const memberRows = rows.filter((row) => row.kind === 'member');
  const memberByName = new Map(memberRows.map((row) => [row.displayName, row]));
  const guestNames = new Set(rows.filter((row) => row.kind === 'guest').map((row) => row.displayName));
  const substituteNames = new Set(memberRows.filter((row) => row.status === 'substitute' && row.substituteName).map((row) => row.substituteName as string));
  const issues: Array<{ severity: 'error' | 'warning'; seat?: string; message: string }> = [];

  const seen = new Map<string, string>();
  const placed = [...topRoles.map((seat) => ({ seat, where: `主持團 ${seat.role}` })), ...items.map((seat, index) => ({ seat, where: getSeatCoordinate(index) }))];
  for (const { seat, where } of placed) {
    if (!seat?.name) continue;
    const name = seat.name.trim();
    if (seen.has(name)) issues.push({ severity: 'error', seat: where, message: `${name} 同時排在 ${seen.get(name)} 和 ${where}。` });
    seen.set(name, where);

    const member = memberByName.get(name);
    if (member && (member.status === 'absent' || member.status === 'medical')) {
      issues.push({ severity: 'warning', seat: where, message: `${name} 這週${STATUS_LABEL[member.status]}，不應排座。` });
    }
    if (member && member.status === 'substitute') {
      issues.push({ severity: 'warning', seat: where, message: `${name} 這週由 ${member.substituteName ?? '代理人'} 代理，座位應改為代理人（type=proxy）。` });
    }
    if (!member && !seat.isGuest && seat.role !== '代理' && !substituteNames.has(name)) {
      issues.push({ severity: 'warning', seat: where, message: `${name} 不在在籍會員名冊中，請確認姓名或改用正確的 type。` });
    }
    if (seat.isGuest && guestNames.size > 0 && !guestNames.has(name)) {
      issues.push({ severity: 'warning', seat: where, message: `來賓 ${name} 沒有在出席名單登記，記得到出席頁新增來賓。` });
    }
  }
  for (const row of memberRows) {
    if ((row.status === 'expected' || row.status === 'present' || row.status === 'late') && !seen.has(row.displayName)) {
      issues.push({ severity: 'warning', message: `${row.displayName} 會出席但沒有排到座位。` });
    }
    if (row.status === 'substitute' && row.substituteName && !seen.has(row.substituteName)) {
      issues.push({ severity: 'warning', message: `代理人 ${row.substituteName}（代理 ${row.displayName}）沒有排到座位。` });
    }
  }

  const ruleErrors = rules.issues.filter((issue) => issue.severity === 'error').length;
  const blocking = issues.filter((issue) => issue.severity === 'error').length;
  return {
    event,
    current,
    draft: { topRoles, items, heroes, industryChains },
    report: {
      ok: ruleErrors === 0 && blocking === 0,
      score: rules.score,
      ruleIssues: rules.issues.map((issue) => ({
        severity: issue.severity,
        title: issue.title,
        message: issue.message,
        seat: issue.seatIndex !== undefined ? getSeatCoordinate(issue.seatIndex) : undefined,
      })),
      attendanceIssues: issues,
      counts: { seats: items.length, occupied: items.filter(Boolean).length, ruleErrors, blocking },
    },
    input,
    rulesSummary: rules,
  };
}

export async function saveGridArrangement(eventKey: string, body: unknown, actor: string) {
  const evaluation = await evaluateGridArrangement(eventKey, body);
  const { event, current, draft, report, input, rulesSummary } = evaluation;

  if (report.counts.blocking > 0) throw new AiInputError('座位表有重複的人，沒有儲存。', 422, report);
  if (report.counts.ruleErrors > 0 && !input.force) {
    throw new AiInputError('座位表違反排座規則，沒有儲存。修正後再送，或確定要存就加上 "force": true。', 422, report);
  }

  const latest = await findLatestSeatMapByWeekId(event.weekId);
  if (typeof input.baseVersion === 'number' && latest && latest.version !== input.baseVersion) {
    throw new AiInputError(`座位表已經被更新為第 ${latest.version} 版（你是根據第 ${input.baseVersion} 版排的）。請重新讀取後再排。`, 409, {
      currentVersion: latest.version,
    });
  }

  const week = current?.week ?? {
    id: event.weekId,
    date: event.weekId,
    title: event.title,
    chapterName: event.chapterName,
    meetingLabel: event.meetingLabel,
    source: 'draft' as const,
  };
  const reason = `AI（${actor}）：${(input.reason ?? '').toString().trim().slice(0, 200) || '透過 API 更新座位'}`;
  const result = await saveSeatingDraft({
    week: { ...week, title: event.title },
    topRoles: draft.topRoles,
    items: draft.items,
    memberRoster: current?.memberRoster ?? [],
    heroes: draft.heroes,
    industryChains: draft.industryChains,
    updatedAt: new Date().toISOString(),
    validationSummary: rulesSummary,
    reason,
  });
  await logOperation({
    sessionId: event.id,
    actorRole: 'system',
    actorName: `AI：${actor}`,
    action: 'ai_seating_saved',
    targetType: 'SeatMap',
    metadata: { version: result.version, reason, score: report.score, forced: Boolean(input.force) },
  });
  return { saved: true, version: result.version, editorUrl: `/console/events/${encodeURIComponent(event.weekId)}/seating/grid`, report };
}

/** Spatial seat plan: `{ assignments: { [seatId]: participationId } }`. */
export async function saveAiSeatPlan(eventKey: string, body: unknown, actor: string) {
  const event = await loadEvent(eventKey);
  const assignments = body && typeof body === 'object' ? (body as { assignments?: unknown }).assignments : undefined;
  if (!assignments || typeof assignments !== 'object') throw new AiInputError('請傳 { "assignments": { "<seatId>": "<participationId>" } }。');
  try {
    const result = await saveSeatAssignments(event.id, assignments);
    await logOperation({
      sessionId: event.id,
      actorRole: 'system',
      actorName: `AI：${actor}`,
      action: 'ai_seat_plan_saved',
      targetType: 'EventSeatPlan',
      targetId: result.planId,
      metadata: { seated: result.seated, seats: result.seats },
    });
    return { saved: true, ...result };
  } catch (error) {
    throw new AiInputError(error instanceof Error ? error.message : '平面座位表儲存失敗。', 422);
  }
}
