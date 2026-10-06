import 'server-only';

import type { PalmsMemberRow, PalmsPeriod, Prisma, ScoringRule } from '@prisma/client';
import {
  PALMS_COUNT_KEYS,
  checkPalmsTotals,
  countPalmsMeetings,
  palmsDisplayName,
  parsePalmsReport,
  type PalmsChecksumLine,
  type PalmsCounts,
  type PalmsExtraRow,
} from '@/lib/tbx/palms-parser';
import {
  DEFAULT_RULE_NAME,
  DEFAULT_SCORING_CONFIG,
  LIGHT_RANK,
  WINDOW_PERIODS,
  cheapestImprovement,
  computeWindowScores,
  nextLightTarget,
  normalizeScoringConfig,
  validateScoringConfig,
  type Light,
  type MemberWindowScore,
  type MetricNextStep,
  type MetricResult,
  type ScoreResult,
  type ScoringConfig,
  type WindowScores,
} from '@/lib/tbx/scoring';
import { prisma } from '@/server/db/prisma';
import { listChapterMembers, normalizeMemberName } from '@/server/tbx/members';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const SERIES_PERIODS = 12;

/** Rows not linked to a member. MongoDB keeps "null" and "field missing" apart, so match both. */
const UNMATCHED_ROW: Prisma.PalmsMemberRowWhereInput = {
  OR: [{ memberId: null }, { memberId: { isSet: false } }],
};

/** Comparison key for names: ignores spaces, case and full-width forms. */
export function nameKey(value: string) {
  return value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

function taipeiParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(value);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function isWholeMonth(from: Date, to: Date) {
  const start = taipeiParts(from);
  const end = taipeiParts(to);
  const dayAfter = taipeiParts(new Date(to.getTime() + DAY_MS));
  return start.day === 1 && start.year === end.year && start.month === end.month && dayAfter.day === 1;
}

/** "2026/9/1 – 9/30" */
export function formatPeriodRange(from: Date, to: Date) {
  const start = taipeiParts(from);
  const end = taipeiParts(to);
  const endText = start.year === end.year ? `${end.month}/${end.day}` : `${end.year}/${end.month}/${end.day}`;
  return `${start.year}/${start.month}/${start.day} – ${endText}`;
}

/** "2026 年 9 月" for calendar months, otherwise the date range. */
export function formatPeriodLabel(from: Date, to: Date) {
  const start = taipeiParts(from);
  return isWholeMonth(from, to) ? `${start.year} 年 ${start.month} 月` : formatPeriodRange(from, to);
}

/** Short axis label: "9月", or "9/1" for periods that are not a calendar month. */
export function formatPeriodShort(from: Date, to: Date) {
  const start = taipeiParts(from);
  return isWholeMonth(from, to) ? `${start.month}月` : `${start.month}/${start.day}`;
}

export interface PeriodMeta {
  /** The `總數` row of the file. */
  total: PalmsCounts | null;
  /** The `來賓` and `BNI` rows of the file. */
  extras: PalmsExtraRow[];
  /** Set the first time a leader confirms the import. Tells a draft from a replaced version. */
  confirmedAt: string | null;
  /** PALMS names a leader chose to leave out. */
  skipped: string[];
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readCounts(value: unknown): PalmsCounts | null {
  if (!isRecord(value)) return null;
  const counts = {} as PalmsCounts;
  for (const key of PALMS_COUNT_KEYS) counts[key] = Number(value[key] ?? 0) || 0;
  return counts;
}

/** `PalmsPeriod.totals` holds the checksum row plus the small bits of import state the schema has no column for. */
export function readPeriodMeta(totals: Prisma.JsonValue | null | undefined): PeriodMeta {
  const source = isRecord(totals) ? totals : {};
  const extras = Array.isArray(source.extras)
    ? source.extras.flatMap((item) => {
        const counts = readCounts(item);
        return counts && isRecord(item) ? [{ label: String(item.label ?? ''), ...counts }] : [];
      })
    : [];
  return {
    total: readCounts(source.total),
    extras,
    confirmedAt: typeof source.confirmedAt === 'string' ? source.confirmedAt : null,
    skipped: Array.isArray(source.skipped) ? source.skipped.filter((item): item is string => typeof item === 'string') : [],
    warnings: Array.isArray(source.warnings) ? source.warnings.filter((item): item is string => typeof item === 'string') : [],
  };
}

function writePeriodMeta(meta: PeriodMeta): Prisma.InputJsonObject {
  return {
    total: meta.total ? { ...meta.total } : null,
    extras: meta.extras.map((extra) => ({ ...extra })),
    confirmedAt: meta.confirmedAt,
    skipped: [...new Set(meta.skipped)],
    warnings: meta.warnings,
  };
}

export type PeriodStatus = 'current' | 'draft' | 'history';

export interface PeriodSummary {
  id: string;
  label: string;
  range: string;
  short: string;
  from: Date;
  to: Date;
  chapterName: string | null;
  exportedAt: Date | null;
  exportedBy: string | null;
  isPartial: boolean;
  isCurrent: boolean;
  status: PeriodStatus;
  version: number;
  meetingCount: number;
  fileName: string | null;
  importedBy: string | null;
  createdAt: Date;
}

function summarizePeriod(period: PalmsPeriod): PeriodSummary {
  const meta = readPeriodMeta(period.totals);
  return {
    id: period.id,
    label: formatPeriodLabel(period.from, period.to),
    range: formatPeriodRange(period.from, period.to),
    short: formatPeriodShort(period.from, period.to),
    from: period.from,
    to: period.to,
    chapterName: period.chapterName,
    exportedAt: period.exportedAt,
    exportedBy: period.exportedBy,
    isPartial: period.isPartial,
    isCurrent: period.isCurrent,
    status: period.isCurrent ? 'current' : meta.confirmedAt ? 'history' : 'draft',
    version: period.version,
    meetingCount: period.meetingCount,
    fileName: period.fileName,
    importedBy: period.importedBy,
    createdAt: period.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Scoring rules
// ---------------------------------------------------------------------------

export interface RuleSummary {
  id: string;
  version: number;
  name: string;
  note: string | null;
  isActive: boolean;
  /** True while the chapter is still on the shipped placeholder tiers. */
  isPlaceholder: boolean;
  config: ScoringConfig;
  createdAt: Date;
}

function summarizeRule(rule: ScoringRule): RuleSummary {
  return {
    id: rule.id,
    version: rule.version,
    name: rule.name,
    note: rule.note,
    isActive: rule.isActive,
    isPlaceholder: rule.name === DEFAULT_RULE_NAME,
    config: normalizeScoringConfig(rule.config),
    createdAt: rule.createdAt,
  };
}

function configToJson(config: ScoringConfig): Prisma.InputJsonObject {
  return {
    lights: { ...config.lights },
    metrics: config.metrics.map((metric) => ({
      key: metric.key,
      label: metric.label,
      max: metric.max,
      basis: metric.basis,
      direction: metric.direction,
      tiers: metric.tiers.map((tier) => ({ threshold: tier.threshold, points: tier.points })),
    })),
  };
}

/** The rule lights are computed with. Creates the placeholder rule the first time. */
export async function getActiveRule(): Promise<RuleSummary> {
  const active = await prisma.scoringRule.findFirst({ where: { isActive: true }, orderBy: { version: 'desc' } });
  if (active) return summarizeRule(active);

  const latest = await prisma.scoringRule.findFirst({ orderBy: { version: 'desc' } });
  if (latest) {
    return summarizeRule(await prisma.scoringRule.update({ where: { id: latest.id }, data: { isActive: true } }));
  }

  try {
    const created = await prisma.scoringRule.create({
      data: {
        version: 1,
        name: DEFAULT_RULE_NAME,
        isActive: true,
        config: configToJson(DEFAULT_SCORING_CONFIG),
        note: '系統內建的示意規則。拿到分會現行計分表後，請到「計分規則」另存新版本。',
      },
    });
    return summarizeRule(created);
  } catch (error) {
    // Two requests can race to create version 1; the loser reads the winner's row.
    const existing = await prisma.scoringRule.findFirst({ orderBy: { version: 'desc' } });
    if (existing) return summarizeRule(existing);
    throw error;
  }
}

export async function listRules(): Promise<RuleSummary[]> {
  await getActiveRule();
  const rules = await prisma.scoringRule.findMany({ orderBy: { version: 'desc' } });
  return rules.map(summarizeRule);
}

/** Saves the config as a new version and makes it the active one. Older versions are kept. */
export async function saveRuleVersion(input: { name: string; note: string | null; config: ScoringConfig }) {
  const errors = validateScoringConfig(input.config);
  if (errors.length > 0) throw new Error(errors.join(' '));
  const name = input.name.trim();
  if (!name) throw new Error('請填寫規則名稱，例如「2026 下半年計分表」。');

  const latest = await prisma.scoringRule.findFirst({ orderBy: { version: 'desc' }, select: { version: true } });
  const version = (latest?.version ?? 0) + 1;
  const [, created] = await prisma.$transaction([
    prisma.scoringRule.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.scoringRule.create({
      data: { version, name, note: input.note, isActive: true, config: configToJson(input.config) },
    }),
  ]);
  return summarizeRule(created);
}

export async function activateRule(ruleId: string) {
  const rule = await prisma.scoringRule.findUnique({ where: { id: ruleId } });
  if (!rule) throw new Error('找不到這個規則版本，請重新整理頁面。');
  const [, updated] = await prisma.$transaction([
    prisma.scoringRule.updateMany({ where: { isActive: true, id: { not: ruleId } }, data: { isActive: false } }),
    prisma.scoringRule.update({ where: { id: ruleId }, data: { isActive: true } }),
  ]);
  return summarizeRule(updated);
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

type MemberLite = { id: string; displayName: string; aliases: string[] };

/** name key → member id. Keys that point at two different members are dropped. */
function buildMemberLookup(members: MemberLite[]) {
  const lookup = new Map<string, string>();
  const ambiguous = new Set<string>();
  const add = (key: string, memberId: string) => {
    if (!key || ambiguous.has(key)) return;
    const existing = lookup.get(key);
    if (existing && existing !== memberId) {
      lookup.delete(key);
      ambiguous.add(key);
      return;
    }
    lookup.set(key, memberId);
  };
  for (const member of members) add(nameKey(member.displayName), member.id);
  for (const member of members) for (const alias of member.aliases) add(nameKey(alias), member.id);
  return lookup;
}

function matchName(lookup: Map<string, string>, rawName: string) {
  return lookup.get(nameKey(palmsDisplayName(rawName))) ?? lookup.get(nameKey(rawName)) ?? null;
}

/** Parses a PALMS export and stores it as a draft period. Nothing counts toward lights until it is confirmed. */
export async function importPalmsFile(input: { fileName: string; content: string; importedBy: string | null }) {
  const report = parsePalmsReport(input.content);
  const members = await listChapterMembers();
  const lookup = buildMemberLookup(members);

  const taken = new Set<string>();
  const rows = report.rows.map((row) => {
    const normalized = normalizeMemberName(row.lastName, row.firstName);
    let memberId = lookup.get(nameKey(normalized)) ?? matchName(lookup, row.rawName);
    if (memberId && taken.has(memberId)) memberId = null;
    if (memberId) taken.add(memberId);

    // The schema keeps one-to-ones and TYFCB as floats; every other column is a whole number.
    return {
      memberId,
      rawName: row.rawName,
      present: Math.round(row.present),
      absent: Math.round(row.absent),
      late: Math.round(row.late),
      medical: Math.round(row.medical),
      substitute: Math.round(row.substitute),
      referralsGivenInside: Math.round(row.referralsGivenInside),
      referralsGivenOutside: Math.round(row.referralsGivenOutside),
      referralsReceivedInside: Math.round(row.referralsReceivedInside),
      referralsReceivedOutside: Math.round(row.referralsReceivedOutside),
      visitors: Math.round(row.visitors),
      oneToOnes: row.oneToOnes,
      tyfcb: row.tyfcb,
      ceu: Math.round(row.ceu),
    };
  });

  const siblings = await prisma.palmsPeriod.findMany({
    where: { from: report.from, to: report.to },
    select: { version: true },
  });
  const version = siblings.reduce((max, period) => Math.max(max, period.version), 0) + 1;

  // `to` is the start of the last day, so the period really ends a day later.
  const periodEnd = report.to.getTime() + DAY_MS;
  const isPartial = report.exportedAt ? report.exportedAt.getTime() < periodEnd : false;

  const meta: PeriodMeta = {
    total: report.totals,
    extras: report.extras,
    confirmedAt: null,
    skipped: [],
    warnings: report.warnings,
  };

  const period = await prisma.palmsPeriod.create({
    data: {
      from: report.from,
      to: report.to,
      chapterName: report.chapterName,
      exportedAt: report.exportedAt,
      exportedBy: report.exportedBy,
      isPartial,
      version,
      isCurrent: false,
      meetingCount: countPalmsMeetings(report.rows),
      fileName: input.fileName.slice(0, 200),
      totals: writePeriodMeta(meta),
      importedBy: input.importedBy,
      rows: { create: rows },
    },
    select: { id: true },
  });

  return {
    periodId: period.id,
    memberCount: rows.length,
    matched: rows.filter((row) => row.memberId).length,
    version,
    label: formatPeriodLabel(report.from, report.to),
  };
}

export interface ReviewRow {
  id: string;
  rawName: string;
  /** CJK part of the PALMS name. This is what gets saved as an alias. */
  palmsName: string;
  memberId: string | null;
  memberName: string | null;
  skipped: boolean;
  counts: PalmsCounts;
}

export interface ImportReview {
  period: PeriodSummary;
  rows: ReviewRow[];
  pending: ReviewRow[];
  skipped: ReviewRow[];
  matched: ReviewRow[];
  /** Chapter members with no row in this file: the choices for 「對應到哪位會員」. */
  candidates: Array<{ id: string; displayName: string }>;
  checksum: PalmsChecksumLine[];
  hasTotals: boolean;
  warnings: string[];
  /** Other imports of the same from/to. */
  versions: PeriodSummary[];
  /** Chapter name of earlier imports when it differs from this file. */
  otherChapterName: string | null;
}

function rowCounts(row: PalmsMemberRow): PalmsCounts {
  const counts = {} as PalmsCounts;
  for (const key of PALMS_COUNT_KEYS) counts[key] = row[key];
  return counts;
}

export async function getImportReview(periodId: string): Promise<ImportReview | null> {
  const period = await prisma.palmsPeriod.findUnique({
    where: { id: periodId },
    include: { rows: { include: { member: { select: { id: true, displayName: true } } } } },
  });
  if (!period) return null;

  const meta = readPeriodMeta(period.totals);
  const skippedKeys = new Set(meta.skipped.map(nameKey));
  const rows: ReviewRow[] = period.rows
    .map((row) => ({
      id: row.id,
      rawName: row.rawName,
      palmsName: palmsDisplayName(row.rawName),
      memberId: row.member ? row.member.id : null,
      memberName: row.member?.displayName ?? null,
      skipped: !row.member && skippedKeys.has(nameKey(row.rawName)),
      counts: rowCounts(row),
    }))
    .sort((a, b) => a.palmsName.localeCompare(b.palmsName, 'zh-Hant'));

  const members = await listChapterMembers();
  const matchedIds = new Set(rows.flatMap((row) => (row.memberId ? [row.memberId] : [])));
  const candidates = members
    .filter((member) => !matchedIds.has(member.id))
    .map((member) => ({ id: member.id, displayName: member.displayName }));

  const [versions, otherChapter] = await Promise.all([
    prisma.palmsPeriod.findMany({
      where: { from: period.from, to: period.to, id: { not: period.id } },
      orderBy: { version: 'desc' },
    }),
    period.chapterName
      ? prisma.palmsPeriod.findFirst({
          where: { isCurrent: true, chapterName: { not: period.chapterName }, id: { not: period.id } },
          orderBy: { from: 'desc' },
          select: { chapterName: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    period: summarizePeriod(period),
    rows,
    pending: rows.filter((row) => !row.memberId && !row.skipped),
    skipped: rows.filter((row) => !row.memberId && row.skipped),
    matched: rows.filter((row) => row.memberId),
    candidates,
    checksum: checkPalmsTotals(period.rows, meta.extras, meta.total),
    hasTotals: Boolean(meta.total),
    warnings: meta.warnings,
    versions: versions.map(summarizePeriod),
    otherChapterName: otherChapter?.chapterName ?? null,
  };
}

async function addAlias(member: MemberLite, alias: string, allMembers: MemberLite[]) {
  const key = nameKey(alias);
  if (!key || key === nameKey(member.displayName)) return;
  if (member.aliases.some((existing) => nameKey(existing) === key)) return;
  // An alias that is someone else's name would make the next import ambiguous.
  const clash = allMembers.some(
    (other) => other.id !== member.id && (nameKey(other.displayName) === key || other.aliases.some((item) => nameKey(item) === key)),
  );
  if (clash) return;
  member.aliases = [...member.aliases, alias];
  await prisma.member.update({ where: { id: member.id }, data: { aliases: member.aliases } });
}

export type RowDecision = { rowId: string; choice: string };

/**
 * Applies the leader's choices for unmatched rows.
 * `choice` is a member id, `new` (add the PALMS name as a chapter member) or `skip`.
 */
export async function applyRowDecisions(periodId: string, decisions: RowDecision[]) {
  const period = await prisma.palmsPeriod.findUnique({ where: { id: periodId }, include: { rows: true } });
  if (!period) throw new Error('找不到這次匯入，可能已經被刪除。請回到匯入頁重新上傳。');

  const meta = readPeriodMeta(period.totals);
  const skipped = new Map(meta.skipped.map((name) => [nameKey(name), name]));
  const members: MemberLite[] = (await listChapterMembers()).map((member) => ({
    id: member.id,
    displayName: member.displayName,
    aliases: member.aliases,
  }));
  const byId = new Map(members.map((member) => [member.id, member]));
  const taken = new Set(period.rows.flatMap((row) => (row.memberId ? [row.memberId] : [])));
  const result = { linked: 0, created: 0, skipped: 0 };

  for (const decision of decisions) {
    const row = period.rows.find((item) => item.id === decision.rowId);
    if (!row || row.memberId || !decision.choice) continue;
    const palmsName = palmsDisplayName(row.rawName);

    if (decision.choice === 'skip') {
      skipped.set(nameKey(row.rawName), row.rawName);
      result.skipped += 1;
      continue;
    }

    let member: MemberLite | undefined;
    if (decision.choice === 'new') {
      if (!palmsName) throw new Error(`「${row.rawName}」沒有可用的姓名，無法新增為會員。`);
      const sameName = members.find((item) => nameKey(item.displayName) === nameKey(palmsName));
      if (sameName) {
        member = sameName;
      } else {
        // displayName is unique across all Member rows, including names created from seat maps.
        const existing = await prisma.member.findUnique({ where: { displayName: palmsName } });
        const saved = existing
          ? await prisma.member.update({ where: { id: existing.id }, data: { category: 'member', isActive: true } })
          : await prisma.member.create({ data: { displayName: palmsName, category: 'member', isActive: true } });
        member = { id: saved.id, displayName: saved.displayName, aliases: saved.aliases };
        members.push(member);
        byId.set(member.id, member);
        result.created += 1;
      }
    } else {
      member = byId.get(decision.choice);
      if (!member) throw new Error(`「${palmsName}」要對應的會員不在名冊裡，請重新整理頁面後再選一次。`);
    }

    if (taken.has(member.id)) {
      throw new Error(`「${member.displayName}」在這份檔案裡已經對應到另一列，一位會員只能對應一列。`);
    }
    taken.add(member.id);

    await prisma.palmsMemberRow.update({ where: { id: row.id }, data: { memberId: member.id } });
    await addAlias(member, palmsName, members);
    // The same PALMS name in other imports is the same person: link those rows too.
    await prisma.palmsMemberRow.updateMany({
      where: { AND: [{ rawName: row.rawName }, { periodId: { not: period.id } }, UNMATCHED_ROW] },
      data: { memberId: member.id },
    });
    skipped.delete(nameKey(row.rawName));
    result.linked += 1;
  }

  await prisma.palmsPeriod.update({
    where: { id: period.id },
    data: { totals: writePeriodMeta({ ...meta, skipped: [...skipped.values()] }) },
  });
  return result;
}

/** Undoes a match, a skip, or both, and forgets the alias so the next import asks again. */
export async function resetRowMatch(rowId: string) {
  const row = await prisma.palmsMemberRow.findUnique({ where: { id: rowId }, include: { period: true, member: true } });
  if (!row) throw new Error('找不到這一列，請重新整理頁面。');

  if (row.member) {
    const aliasKey = nameKey(palmsDisplayName(row.rawName));
    const aliases = row.member.aliases.filter((alias) => nameKey(alias) !== aliasKey && nameKey(alias) !== nameKey(row.rawName));
    if (aliases.length !== row.member.aliases.length) {
      await prisma.member.update({ where: { id: row.member.id }, data: { aliases } });
    }
    await prisma.palmsMemberRow.update({ where: { id: row.id }, data: { memberId: null } });
  }

  const meta = readPeriodMeta(row.period.totals);
  const key = nameKey(row.rawName);
  if (meta.skipped.some((name) => nameKey(name) === key)) {
    await prisma.palmsPeriod.update({
      where: { id: row.periodId },
      data: { totals: writePeriodMeta({ ...meta, skipped: meta.skipped.filter((name) => nameKey(name) !== key) }) },
    });
  }
  return { periodId: row.periodId, rawName: row.rawName };
}

/** Runs name matching again for the rows still unmatched (after the roster or aliases changed). */
export async function rematchPeriod(periodId: string) {
  const period = await prisma.palmsPeriod.findUnique({ where: { id: periodId }, include: { rows: true } });
  if (!period) throw new Error('找不到這次匯入，可能已經被刪除。');

  const lookup = buildMemberLookup(await listChapterMembers());
  const taken = new Set(period.rows.flatMap((row) => (row.memberId ? [row.memberId] : [])));
  let linked = 0;
  for (const row of period.rows) {
    if (row.memberId) continue;
    const memberId = matchName(lookup, row.rawName);
    if (!memberId || taken.has(memberId)) continue;
    taken.add(memberId);
    await prisma.palmsMemberRow.update({ where: { id: row.id }, data: { memberId } });
    linked += 1;
  }
  return { linked };
}

/** Makes this import the one that counts for its from/to. Other versions stay as history. */
export async function confirmPeriod(periodId: string) {
  const period = await prisma.palmsPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new Error('找不到這次匯入，可能已經被刪除。請回到匯入頁重新上傳。');

  const meta = readPeriodMeta(period.totals);
  await prisma.$transaction([
    prisma.palmsPeriod.updateMany({
      where: { from: period.from, to: period.to, id: { not: period.id }, isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.palmsPeriod.update({
      where: { id: period.id },
      data: {
        isCurrent: true,
        totals: writePeriodMeta({ ...meta, confirmedAt: meta.confirmedAt ?? new Date().toISOString() }),
      },
    }),
  ]);
  return summarizePeriod({ ...period, isCurrent: true });
}

/** Deletes a draft or a replaced version together with its rows. The current version cannot be deleted here. */
export async function deletePeriod(periodId: string) {
  const period = await prisma.palmsPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new Error('這次匯入已經不存在。');
  if (period.isCurrent) {
    throw new Error('這是目前採用的版本，不能刪除。要更正數字請重新匯入同一期間的檔案，新檔確認後會取代它。');
  }
  await prisma.$transaction([
    prisma.palmsMemberRow.deleteMany({ where: { periodId } }),
    prisma.palmsPeriod.delete({ where: { id: periodId } }),
  ]);
  return summarizePeriod(period);
}

export interface PeriodListItem extends PeriodSummary {
  rowCount: number;
  unmatchedCount: number;
  /** A confirmed period whose dates overlap another confirmed period: its numbers would be counted twice. */
  overlaps: boolean;
}

export async function listPalmsPeriods(): Promise<PeriodListItem[]> {
  const periods = await prisma.palmsPeriod.findMany({
    orderBy: [{ from: 'desc' }, { to: 'desc' }, { version: 'desc' }],
    include: { rows: { select: { memberId: true } } },
  });

  const current = periods.filter((period) => period.isCurrent);
  const overlapping = new Set<string>();
  for (const a of current) {
    for (const b of current) {
      if (a.id !== b.id && a.from.getTime() <= b.to.getTime() && b.from.getTime() <= a.to.getTime()) overlapping.add(a.id);
    }
  }

  return periods.map((period) => ({
    ...summarizePeriod(period),
    rowCount: period.rows.length,
    unmatchedCount: period.rows.filter((row) => !row.memberId).length,
    overlaps: overlapping.has(period.id),
  }));
}

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

type ScoredRow = PalmsMemberRow & { memberId: string };

async function loadCurrentPeriods() {
  const periods = await prisma.palmsPeriod.findMany({
    where: { isCurrent: true },
    orderBy: [{ from: 'asc' }, { to: 'asc' }],
    include: { rows: true },
  });
  return periods.map((period) => ({
    period,
    summary: summarizePeriod(period),
    input: {
      id: period.id,
      meetingCount: period.meetingCount,
      rows: period.rows.filter((row): row is ScoredRow => Boolean(row.memberId)),
    },
    unmatchedCount: period.rows.filter((row) => !row.memberId).length,
  }));
}

export interface TrendPoint {
  periodId: string;
  label: string;
  short: string;
  score: number;
  light: Light;
}

export interface CurrentNumbers {
  present: number;
  absent: number;
  late: number;
  medical: number;
  substitute: number;
  referrals: number;
  visitors: number;
  oneToOnes: number;
  ceu: number;
}

function currentNumbers(row: PalmsMemberRow): CurrentNumbers {
  return {
    present: row.present,
    absent: row.absent,
    late: row.late,
    medical: row.medical,
    substitute: row.substitute,
    referrals: row.referralsGivenInside + row.referralsGivenOutside,
    visitors: row.visitors,
    oneToOnes: row.oneToOnes,
    ceu: row.ceu,
  };
}

export interface OverviewMember {
  memberId: string;
  name: string;
  current: CurrentNumbers;
  metrics: MetricResult[];
  score: number;
  light: Light;
  previousLight: Light | null;
  previousScore: number | null;
  /** The light is worse than in the previous period. */
  dropped: boolean;
  periodsWithData: number;
  trend: TrendPoint[];
}

export interface OverviewSeriesPoint {
  periodId: string;
  label: string;
  short: string;
  isPartial: boolean;
  periodsUsed: number;
  distribution: Record<Light, number>;
  total: number;
  selected: boolean;
}

export interface ScorecardOverview {
  rule: RuleSummary;
  /** Confirmed periods, newest first. */
  periods: PeriodSummary[];
  selected: PeriodSummary;
  window: { periodsUsed: number; size: number; weeks: number; firstLabel: string; lastLabel: string };
  distribution: Record<Light, number>;
  series: OverviewSeriesPoint[];
  members: OverviewMember[];
  unmatchedCount: number;
  previousLabel: string | null;
}

/** `null` when no import has been confirmed yet. */
export async function getScorecardOverview(periodId?: string | null): Promise<ScorecardOverview | null> {
  const loaded = await loadCurrentPeriods();
  if (loaded.length === 0) return null;

  const rule = await getActiveRule();
  const inputs = loaded.map((item) => item.input);
  const requested = periodId ? loaded.findIndex((item) => item.period.id === periodId) : -1;
  const selectedIndex = requested >= 0 ? requested : loaded.length - 1;

  // Each period is scored with the window that ends at it. Only the ones a chart or sparkline shows are needed.
  let seriesStart = Math.max(0, loaded.length - SERIES_PERIODS);
  if (selectedIndex < seriesStart) seriesStart = selectedIndex;
  const seriesEnd = Math.min(loaded.length - 1, seriesStart + SERIES_PERIODS - 1);
  const trendStart = Math.max(0, selectedIndex - SERIES_PERIODS + 1);

  const cache = new Map<number, WindowScores<ScoredRow>>();
  const scoresAt = (index: number) => {
    let scores = cache.get(index);
    if (!scores) {
      scores = computeWindowScores(rule.config, inputs, index, WINDOW_PERIODS);
      cache.set(index, scores);
    }
    return scores;
  };

  const selectedScores = scoresAt(selectedIndex);
  const previousScores = selectedIndex > 0 ? scoresAt(selectedIndex - 1) : null;

  const memberIds = [...selectedScores.members.keys()];
  const names = new Map(
    (await prisma.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, displayName: true } })).map(
      (member) => [member.id, member.displayName],
    ),
  );

  const members: OverviewMember[] = memberIds.map((memberId) => {
    const entry = selectedScores.members.get(memberId)!;
    const previous = previousScores?.members.get(memberId) ?? null;
    const trend: TrendPoint[] = [];
    for (let index = trendStart; index <= selectedIndex; index += 1) {
      const point = scoresAt(index).members.get(memberId);
      if (point) {
        trend.push({
          periodId: loaded[index].period.id,
          label: loaded[index].summary.label,
          short: loaded[index].summary.short,
          score: point.result.score,
          light: point.result.light,
        });
      }
    }
    return {
      memberId,
      name: names.get(memberId) ?? palmsDisplayName(entry.current.rawName),
      current: currentNumbers(entry.current),
      metrics: entry.result.metrics,
      score: entry.result.score,
      light: entry.result.light,
      previousLight: previous?.result.light ?? null,
      previousScore: previous?.result.score ?? null,
      dropped: previous ? LIGHT_RANK[entry.result.light] < LIGHT_RANK[previous.result.light] : false,
      periodsWithData: entry.periodsWithData,
      trend,
    };
  });

  const series: OverviewSeriesPoint[] = [];
  for (let index = seriesStart; index <= seriesEnd; index += 1) {
    const scores = scoresAt(index);
    series.push({
      periodId: loaded[index].period.id,
      label: loaded[index].summary.label,
      short: loaded[index].summary.short,
      isPartial: loaded[index].summary.isPartial,
      periodsUsed: scores.periodsUsed,
      distribution: scores.distribution,
      total: scores.members.size,
      selected: index === selectedIndex,
    });
  }

  const windowStart = Math.max(0, selectedIndex - WINDOW_PERIODS + 1);
  return {
    rule,
    periods: loaded.map((item) => item.summary).reverse(),
    selected: loaded[selectedIndex].summary,
    window: {
      periodsUsed: selectedScores.periodsUsed,
      size: WINDOW_PERIODS,
      weeks: selectedScores.weeks,
      firstLabel: loaded[windowStart].summary.label,
      lastLabel: loaded[selectedIndex].summary.label,
    },
    distribution: selectedScores.distribution,
    series,
    members,
    unmatchedCount: loaded[selectedIndex].unmatchedCount,
    previousLabel: selectedIndex > 0 ? loaded[selectedIndex - 1].summary.label : null,
  };
}

export type MemberScorecard =
  | { state: 'no-data' }
  | { state: 'no-rows'; latestLabel: string }
  | {
      state: 'ok';
      rule: RuleSummary;
      period: PeriodSummary;
      /** False when the newest confirmed period has no row for this member. */
      isLatest: boolean;
      latestLabel: string;
      result: ScoreResult;
      current: CurrentNumbers;
      periodsWithData: number;
      windowSize: number;
      weeks: number;
      previousLight: Light | null;
      previousScore: number | null;
      nextTarget: { light: Light; need: number } | null;
      cheapest: (MetricResult & { next: MetricNextStep }) | null;
      trend: TrendPoint[];
    };

/** One member's own light. Never returns anyone else's numbers. */
export async function getMemberScorecard(memberId: string): Promise<MemberScorecard> {
  const loaded = await loadCurrentPeriods();
  if (loaded.length === 0) return { state: 'no-data' };

  const latestLabel = loaded[loaded.length - 1].summary.label;
  let index = -1;
  for (let cursor = loaded.length - 1; cursor >= 0; cursor -= 1) {
    if (loaded[cursor].input.rows.some((row) => row.memberId === memberId)) {
      index = cursor;
      break;
    }
  }
  if (index < 0) return { state: 'no-rows', latestLabel };

  const rule = await getActiveRule();
  // Only this member's rows go into the calculation.
  const inputs = loaded.map((item) => ({
    id: item.input.id,
    meetingCount: item.input.meetingCount,
    rows: item.input.rows.filter((row) => row.memberId === memberId),
  }));

  const trend: TrendPoint[] = [];
  let entry: MemberWindowScore<ScoredRow> | null = null;
  let previous: MemberWindowScore<ScoredRow> | null = null;
  for (let cursor = Math.max(0, index - SERIES_PERIODS + 1); cursor <= index; cursor += 1) {
    const point = computeWindowScores(rule.config, inputs, cursor, WINDOW_PERIODS).members.get(memberId);
    if (!point) continue;
    trend.push({
      periodId: loaded[cursor].period.id,
      label: loaded[cursor].summary.label,
      short: loaded[cursor].summary.short,
      score: point.result.score,
      light: point.result.light,
    });
    if (cursor === index) entry = point;
    if (cursor === index - 1) previous = point;
  }
  if (!entry) return { state: 'no-rows', latestLabel };

  return {
    state: 'ok',
    rule,
    period: loaded[index].summary,
    isLatest: index === loaded.length - 1,
    latestLabel,
    result: entry.result,
    current: currentNumbers(entry.current),
    periodsWithData: entry.periodsWithData,
    windowSize: WINDOW_PERIODS,
    weeks: entry.weeks,
    previousLight: previous?.result.light ?? null,
    previousScore: previous?.result.score ?? null,
    nextTarget: nextLightTarget(rule.config, entry.result.score),
    cheapest: cheapestImprovement(entry.result),
    trend,
  };
}
