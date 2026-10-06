'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  METRIC_KEYS,
  normalizeScoringConfig,
  sortTiers,
  validateScoringConfig,
  type MetricBasis,
  type MetricDirection,
  type ScoringConfig,
  type ScoringMetric,
  type ScoringTier,
} from '@/lib/tbx/scoring';
import { fail, isObjectId, ok, optionalText, text, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import {
  activateRule,
  applyRowDecisions,
  confirmPeriod,
  deletePeriod,
  getActiveRule,
  importPalmsFile,
  rematchPeriod,
  resetRowMatch,
  saveRuleVersion,
  type RowDecision,
} from '@/server/tbx/scorecard';
import { requireLeader } from '@/server/tbx/viewer';

const MAX_FILE_BYTES = 900 * 1024;

function revalidateScorecard() {
  revalidatePath('/console/scorecard', 'layout');
  revalidatePath('/me/scorecard');
}

function decodeUpload(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  // An old binary .xls starts with the OLE signature D0 CF 11 E0.
  if (bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new Error(
      '這個檔案是用 Excel 另存過的二進位格式，系統讀不到。請到 BNI Connect 重新匯出 PALMS 摘要報告，直接上傳下載到的檔案。',
    );
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer);
  return new TextDecoder('utf-8').decode(buffer);
}

function requirePeriodId(formData: FormData) {
  const periodId = text(formData, 'periodId');
  if (!isObjectId(periodId)) throw new Error('找不到這次匯入，請回到匯入頁重新選擇。');
  return periodId;
}

/** Step 1: parse the uploaded PALMS export and store it as a draft, then go to the review page. */
export async function importPalmsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let periodId = '';
  try {
    const viewer = await requireLeader();
    const file = formData.get('file');
    if (!file || typeof file === 'string' || file.size === 0) {
      throw new Error('請先選擇要上傳的 PALMS 檔案（從 BNI Connect 匯出的 .xls）。');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('檔案超過 900 KB。PALMS 摘要報告通常不到 100 KB，請確認選到的是摘要報告。');
    }

    const result = await importPalmsFile({
      fileName: file.name || 'palms.xls',
      content: decodeUpload(await file.arrayBuffer()),
      importedBy: viewer.leaderName,
    });
    periodId = result.periodId;

    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'palms_uploaded',
      targetType: 'PalmsPeriod',
      targetId: result.periodId,
      metadata: { label: result.label, version: result.version, members: result.memberCount, matched: result.matched },
    });
    revalidateScorecard();
  } catch (error) {
    return fail(error, '匯入失敗，請確認檔案後再試一次。');
  }
  redirect(`/console/scorecard/import/${periodId}`);
}

/** Step 2: save the choices for unmatched rows. Field `row:<rowId>` = member id, `new` or `skip`. */
export async function saveMappingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const periodId = requirePeriodId(formData);

    const decisions: RowDecision[] = [];
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith('row:') || typeof value !== 'string' || !value) continue;
      const rowId = key.slice(4);
      if (!isObjectId(rowId)) continue;
      if (value !== 'new' && value !== 'skip' && !isObjectId(value)) continue;
      decisions.push({ rowId, choice: value });
    }
    if (decisions.length === 0) throw new Error('還沒有選任何一列。請在下拉選單選擇要對應的會員、新增為會員或略過。');

    const result = await applyRowDecisions(periodId, decisions);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'palms_names_mapped',
      targetType: 'PalmsPeriod',
      targetId: periodId,
      metadata: result,
    });
    revalidateScorecard();
    revalidatePath('/console/members');

    const parts = [
      result.linked > 0 ? `已對應 ${result.linked} 位` : '',
      result.created > 0 ? `其中新增會員 ${result.created} 位` : '',
      result.skipped > 0 ? `略過 ${result.skipped} 列` : '',
    ].filter(Boolean);
    return ok(`${parts.join('，')}。${result.linked > 0 ? '對應結果已存成別名，下次匯入會自動套用。' : ''}`);
  } catch (error) {
    return fail(error);
  }
}

/** Undo a match or a skip so the row goes back to 待對應. */
export async function resetRowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const rowId = text(formData, 'rowId');
    if (!isObjectId(rowId)) throw new Error('找不到這一列，請重新整理頁面。');

    const result = await resetRowMatch(rowId);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'palms_name_unmapped',
      targetType: 'PalmsMemberRow',
      targetId: rowId,
      metadata: { periodId: result.periodId, rawName: result.rawName },
    });
    revalidateScorecard();
    return ok('已取消，這一列回到待對應。');
  } catch (error) {
    return fail(error);
  }
}

export async function rematchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const periodId = requirePeriodId(formData);
    const result = await rematchPeriod(periodId);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'palms_rematched',
      targetType: 'PalmsPeriod',
      targetId: periodId,
      metadata: result,
    });
    revalidateScorecard();
    return ok(result.linked > 0 ? `重新比對後多對上 ${result.linked} 位。` : '重新比對了，沒有新的對應。');
  } catch (error) {
    return fail(error);
  }
}

/** Step 3: this import becomes the one that counts for its period. */
export async function confirmImportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let periodId = '';
  try {
    const viewer = await requireLeader();
    periodId = requirePeriodId(formData);
    const period = await confirmPeriod(periodId);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'palms_confirmed',
      targetType: 'PalmsPeriod',
      targetId: periodId,
      metadata: { label: period.label, version: period.version },
    });
    revalidateScorecard();
  } catch (error) {
    return fail(error);
  }
  redirect(`/console/scorecard?period=${periodId}`);
}

async function removePeriod(formData: FormData) {
  const viewer = await requireLeader();
  const periodId = requirePeriodId(formData);
  const period = await deletePeriod(periodId);
  await logOperation({
    actorRole: 'admin',
    actorName: viewer.leaderName,
    action: 'palms_deleted',
    targetType: 'PalmsPeriod',
    targetId: periodId,
    metadata: { label: period.label, version: period.version, status: period.status },
  });
  revalidateScorecard();
  return period;
}

/** Delete from the list on the import page (stays on the page). */
export async function deletePeriodAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const period = await removePeriod(formData);
    return ok(`已刪除 ${period.label} 第 ${period.version} 版。`);
  } catch (error) {
    return fail(error);
  }
}

/** Delete from the review page, then go back to the import page. */
export async function discardPeriodAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await removePeriod(formData);
  } catch (error) {
    return fail(error);
  }
  redirect('/console/scorecard/import');
}

// ---------------------------------------------------------------------------
// Scoring rules
// ---------------------------------------------------------------------------

function numberField(formData: FormData, key: string, label: string) {
  const raw = text(formData, key);
  if (!raw) throw new Error(`請填寫「${label}」。`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`「${label}」要填數字。`);
  return value;
}

function readConfig(formData: FormData, base: ScoringConfig): ScoringConfig {
  const metrics: ScoringMetric[] = METRIC_KEYS.map((key) => {
    const fallback = base.metrics.find((metric) => metric.key === key)!;
    const label = text(formData, `m.${key}.label`) || fallback.label;
    const basis: MetricBasis = text(formData, `m.${key}.basis`) === 'perWeek' ? 'perWeek' : 'total';
    const direction: MetricDirection = text(formData, `m.${key}.direction`) === 'lower' ? 'lower' : 'higher';
    const max = numberField(formData, `m.${key}.max`, `${label}的滿分`);

    const slots = Math.min(20, Math.max(0, Number.parseInt(text(formData, `m.${key}.slots`), 10) || 0));
    const tiers: ScoringTier[] = [];
    for (let index = 0; index < slots; index += 1) {
      const threshold = text(formData, `m.${key}.t.${index}.threshold`);
      const points = text(formData, `m.${key}.t.${index}.points`);
      if (!threshold && !points) continue;
      if (!threshold || !points) throw new Error(`「${label}」第 ${index + 1} 個級距要同時填門檻和分數，不用的級距請兩格都留空。`);
      const tier = { threshold: Number(threshold), points: Number(points) };
      if (!Number.isFinite(tier.threshold) || !Number.isFinite(tier.points)) {
        throw new Error(`「${label}」第 ${index + 1} 個級距要填數字。`);
      }
      tiers.push(tier);
    }

    return { key, label, max, basis, direction, tiers: sortTiers(tiers, direction) };
  });

  return {
    lights: {
      green: numberField(formData, 'lights.green', '綠燈門檻'),
      yellow: numberField(formData, 'lights.yellow', '黃燈門檻'),
      red: numberField(formData, 'lights.red', '紅燈門檻'),
    },
    metrics,
  };
}

/** Saves the edited rule as a new version and switches to it. Earlier versions stay in the list. */
export async function saveRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let version = 0;
  try {
    const viewer = await requireLeader();
    const name = text(formData, 'name');
    if (!name) throw new Error('請填寫規則名稱，例如「2026 下半年計分表」。');

    const active = await getActiveRule();
    const config = normalizeScoringConfig(readConfig(formData, active.config));
    const errors = validateScoringConfig(config);
    if (errors.length > 0) throw new Error(errors.join(' '));

    const rule = await saveRuleVersion({ name, note: optionalText(formData, 'note'), config });
    version = rule.version;
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'scoring_rule_saved',
      targetType: 'ScoringRule',
      targetId: rule.id,
      metadata: { version: rule.version, name: rule.name },
    });
    revalidateScorecard();
  } catch (error) {
    return fail(error);
  }
  redirect(`/console/scorecard/rules?saved=${version}`);
}

export async function activateRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const ruleId = text(formData, 'ruleId');
    if (!isObjectId(ruleId)) throw new Error('找不到這個規則版本，請重新整理頁面。');

    const rule = await activateRule(ruleId);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'scoring_rule_activated',
      targetType: 'ScoringRule',
      targetId: rule.id,
      metadata: { version: rule.version, name: rule.name },
    });
    revalidateScorecard();
    return ok(`已改用第 ${rule.version} 版「${rule.name}」，所有燈號已依這個版本重算。`);
  } catch (error) {
    return fail(error);
  }
}
