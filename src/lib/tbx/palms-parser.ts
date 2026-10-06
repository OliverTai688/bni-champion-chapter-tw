// Parser for the BNI Connect "PALMS 摘要報告" export.
// The file is named .xls but holds SpreadsheetML 2003 XML. Pure module: no I/O, no dependencies.

export const PALMS_COUNT_KEYS = [
  'present',
  'absent',
  'late',
  'medical',
  'substitute',
  'referralsGivenInside',
  'referralsGivenOutside',
  'referralsReceivedInside',
  'referralsReceivedOutside',
  'visitors',
  'oneToOnes',
  'tyfcb',
  'ceu',
] as const;

export type PalmsCountKey = (typeof PALMS_COUNT_KEYS)[number];
export type PalmsCounts = Record<PalmsCountKey, number>;

export const PALMS_COUNT_LABEL: Record<PalmsCountKey, string> = {
  present: '出席',
  absent: '缺席',
  late: '遲到',
  medical: '病假',
  substitute: '替代人',
  referralsGivenInside: '提供內部引薦',
  referralsGivenOutside: '提供外部引薦',
  referralsReceivedInside: '收到內部引薦',
  referralsReceivedOutside: '收到外部引薦',
  visitors: '來賓',
  oneToOnes: '一對一會面',
  tyfcb: '交易價值',
  ceu: '分會教育單位',
};

export interface PalmsParsedRow extends PalmsCounts {
  lastName: string;
  firstName: string;
  /** `姓氏` + `名字` exactly as exported, e.g. "王小明 Wang,Ming". */
  rawName: string;
}

export interface PalmsExtraRow extends PalmsCounts {
  /** `來賓` or `BNI`: rows the report adds below the members. */
  label: string;
}

export interface PalmsReport {
  title: string | null;
  chapterName: string | null;
  region: string | null;
  country: string | null;
  exportedBy: string | null;
  exportedAt: Date | null;
  /** Start of the first day of the period (Taiwan time). */
  from: Date;
  /** Start of the last day of the period (Taiwan time). */
  to: Date;
  rows: PalmsParsedRow[];
  extras: PalmsExtraRow[];
  /** The `總數` row, when the file has one. */
  totals: PalmsCounts | null;
  warnings: string[];
}

export interface PalmsChecksumLine {
  key: PalmsCountKey;
  label: string;
  sum: number;
  total: number;
  ok: boolean;
}

export class PalmsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PalmsParseError';
  }
}

// ---------------------------------------------------------------------------
// SpreadsheetML reading
// ---------------------------------------------------------------------------

interface SheetCell {
  type: string;
  text: string;
}

type SheetRow = Map<number, SheetCell>;

interface Sheet {
  name: string;
  rows: SheetRow[];
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeXmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = Number.parseInt(body.slice(2), 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    if (body.startsWith('#')) {
      const code = Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function localName(name: string) {
  const index = name.indexOf(':');
  return (index >= 0 ? name.slice(index + 1) : name).toLowerCase();
}

function readAttributes(source: string) {
  const attributes: Record<string, string> = {};
  const pattern = /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    attributes[localName(match[1])] = decodeXmlEntities(match[2] ?? match[3] ?? '');
  }
  return attributes;
}

function positiveInt(value: string | undefined) {
  if (value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Reads every worksheet into rows of `column index → cell`, honouring `ss:Index` and `ss:MergeAcross`. */
function readSheets(input: string): Sheet[] {
  const xml = input
    .replace(/^﻿/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_whole, body: string) =>
      body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    );

  const sheets: Sheet[] = [];
  let sheet: Sheet | null = null;
  let row: SheetRow | null = null;
  let nextColumn = 1;
  let cellColumn = 0;
  let cell: SheetCell | null = null;
  let inData = false;
  let dataText = '';

  const tagPattern = /<(\/?)([A-Za-z_][\w.:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let position = 0;
  let match: RegExpExecArray | null;

  const closeCell = () => {
    if (row && cell) row.set(cellColumn, cell);
    cell = null;
  };
  const closeRow = () => {
    closeCell();
    if (sheet && row) sheet.rows.push(row);
    row = null;
  };

  while ((match = tagPattern.exec(xml))) {
    if (inData) dataText += xml.slice(position, match.index);
    position = tagPattern.lastIndex;

    const closing = match[1] === '/';
    const name = localName(match[2]);
    const selfClosing = match[4] === '/';

    if (name === 'worksheet') {
      if (closing) {
        closeRow();
        sheet = null;
      } else {
        sheet = { name: readAttributes(match[3]).name ?? '', rows: [] };
        sheets.push(sheet);
      }
      continue;
    }
    if (!sheet) continue;

    if (name === 'row') {
      if (closing) {
        closeRow();
        continue;
      }
      closeRow();
      // A row with ss:Index skips rows; pad so row numbers stay meaningful.
      const index = positiveInt(readAttributes(match[3]).index);
      while (index && sheet.rows.length < index - 1) sheet.rows.push(new Map());
      row = new Map();
      nextColumn = 1;
      if (selfClosing) closeRow();
      continue;
    }
    if (!row) continue;

    if (name === 'cell') {
      if (closing) {
        closeCell();
        continue;
      }
      closeCell();
      const attributes = readAttributes(match[3]);
      cellColumn = positiveInt(attributes.index) ?? nextColumn;
      const merge = Number.parseInt(attributes.mergeacross ?? '0', 10);
      nextColumn = cellColumn + (Number.isFinite(merge) && merge > 0 ? merge : 0) + 1;
      cell = { type: '', text: '' };
      if (selfClosing) closeCell();
      continue;
    }

    if (name === 'data' && cell) {
      if (closing) {
        cell.text = decodeXmlEntities(dataText).replace(/\r\n?/g, '\n').trim();
        inData = false;
        dataText = '';
        continue;
      }
      cell.type = readAttributes(match[3]).type ?? '';
      if (!selfClosing) {
        inData = true;
        dataText = '';
      }
    }
    // Any other tag inside <Data> is inline formatting (<B>, <Font>…): keep the text, drop the tag.
  }

  return sheets;
}

// ---------------------------------------------------------------------------
// Report interpretation
// ---------------------------------------------------------------------------

type ColumnKey = 'lastName' | 'firstName' | PalmsCountKey;

/** Header text → field. Matching ignores spaces, case and full-width forms. */
const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  lastName: ['姓氏', '姓', 'Last Name', 'Surname'],
  firstName: ['名字', '名', 'First Name', 'Given Name'],
  present: ['出席', 'P', 'Present'],
  absent: ['缺席', 'A', 'Absent'],
  late: ['遲到', 'L', 'Late'],
  medical: ['病假', 'M', 'Medical'],
  substitute: ['替代人', '代理人', 'S', 'Substitute'],
  referralsGivenInside: ['提供內部引薦', 'RGI'],
  referralsGivenOutside: ['提供外部引薦', 'RGO'],
  referralsReceivedInside: ['收到內部引薦', 'RRI'],
  referralsReceivedOutside: ['收到外部引薦', 'RRO'],
  visitors: ['來賓', 'V', 'Visitors'],
  oneToOnes: ['一對一會面', '一對一', '1-2-1', '1-2-1s', 'One-to-Ones'],
  tyfcb: ['交易價值', 'TYFCB'],
  ceu: ['分會教育單位', 'CEU', 'CEUs'],
};

const REQUIRED_COLUMNS: ColumnKey[] = [
  'lastName',
  'firstName',
  'present',
  'absent',
  'late',
  'medical',
  'substitute',
  'referralsGivenInside',
  'referralsGivenOutside',
  'visitors',
  'oneToOnes',
  'ceu',
];

const COLUMN_LABEL: Record<ColumnKey, string> = { lastName: '姓氏', firstName: '名字', ...PALMS_COUNT_LABEL };

const TOTAL_LABELS = ['總數', '總計', '合計', 'total', 'totals'];
const EXTRA_LABELS = ['來賓', 'bni', 'visitors'];

function compact(value: string) {
  return value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

const HEADER_LOOKUP = new Map<string, ColumnKey>(
  (Object.entries(HEADER_ALIASES) as Array<[ColumnKey, string[]]>).flatMap(([key, names]) =>
    names.map((name) => [compact(name), key] as [string, ColumnKey]),
  ),
);

function cellText(row: SheetRow | undefined, column: number | undefined) {
  if (!row || column === undefined) return '';
  return row.get(column)?.text ?? '';
}

function sortedCells(row: SheetRow) {
  return [...row.entries()].sort((a, b) => a[0] - b[0]);
}

function findHeader(rows: SheetRow[]) {
  for (let index = 0; index < rows.length; index += 1) {
    const columns = new Map<ColumnKey, number>();
    for (const [column, cell] of sortedCells(rows[index])) {
      const key = HEADER_LOOKUP.get(compact(cell.text));
      if (key && !columns.has(key)) columns.set(key, column);
    }
    if (columns.has('lastName') && columns.has('firstName') && columns.has('present')) {
      return { index, columns };
    }
  }
  return null;
}

/** PALMS timestamps carry no zone; BNI Connect exports them in the chapter's local time (Taiwan). */
export function parseTaipeiDateTime(value: string): Date | null {
  const text = value.trim();
  if (!text) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(text);
  const slash = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
  const match = iso ?? slash;
  if (!match) return null;

  const pad = (part: string | undefined, length = 2) => (part ?? '0').padStart(length, '0');
  const zone = iso?.[7] ?? '+08:00';
  const date = new Date(
    `${pad(match[1], 4)}-${pad(match[2])}-${pad(match[3])}T${pad(match[4])}:${pad(match[5])}:${pad(match[6])}${zone}`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function readNumber(cell: SheetCell | undefined) {
  if (!cell || !cell.text) return { value: 0, valid: true };
  const parsed = Number(cell.text.replace(/[,\s]/g, ''));
  return Number.isFinite(parsed) ? { value: parsed, valid: true } : { value: 0, valid: false };
}

function stripLabel(value: string) {
  return compact(value).replace(/[:：]+$/, '');
}

/** Value that follows a `從:` style label in the same row. */
function valueAfterLabel(row: SheetRow, labels: string[]) {
  const cells = sortedCells(row).filter(([, cell]) => cell.text !== '');
  if (cells.length < 2) return null;
  if (!labels.includes(stripLabel(cells[0][1].text))) return null;
  return cells[1][1];
}

export function emptyPalmsCounts(): PalmsCounts {
  return {
    present: 0,
    absent: 0,
    late: 0,
    medical: 0,
    substitute: 0,
    referralsGivenInside: 0,
    referralsGivenOutside: 0,
    referralsReceivedInside: 0,
    referralsReceivedOutside: 0,
    visitors: 0,
    oneToOnes: 0,
    tyfcb: 0,
    ceu: 0,
  };
}

export function sumPalmsCounts(rows: ReadonlyArray<Partial<PalmsCounts>>): PalmsCounts {
  const sum = emptyPalmsCounts();
  for (const row of rows) {
    for (const key of PALMS_COUNT_KEYS) sum[key] += Number(row[key] ?? 0) || 0;
  }
  return sum;
}

/** Meetings in the period: the largest P+A+L+M+S any member has. */
export function countPalmsMeetings(rows: ReadonlyArray<Partial<PalmsCounts>>) {
  let max = 0;
  for (const row of rows) {
    const meetings =
      (row.present ?? 0) + (row.absent ?? 0) + (row.late ?? 0) + (row.medical ?? 0) + (row.substitute ?? 0);
    if (meetings > max) max = meetings;
  }
  return Math.round(max);
}

const ATTENDANCE_KEYS: ReadonlySet<PalmsCountKey> = new Set(['present', 'absent', 'late', 'medical', 'substitute']);

/**
 * Compares column sums against the `總數` row.
 * In the real export the attendance columns of `總數` count members only (the `來賓` / `BNI`
 * rows repeat the meeting count there), while the activity columns include those two rows.
 * A column passes when the total equals either sum; `sum` reports the one that applies.
 */
export function checkPalmsTotals(
  rows: ReadonlyArray<Partial<PalmsCounts>>,
  extras: ReadonlyArray<Partial<PalmsCounts>>,
  totals: Partial<PalmsCounts> | null | undefined,
): PalmsChecksumLine[] {
  if (!totals) return [];
  const membersOnly = sumPalmsCounts(rows);
  const withExtras = sumPalmsCounts([...rows, ...extras]);
  const same = (a: number, b: number) => Math.abs(a - b) < 0.005;

  return PALMS_COUNT_KEYS.map((key) => {
    const total = Number(totals[key] ?? 0) || 0;
    const primary = ATTENDANCE_KEYS.has(key) ? membersOnly[key] : withExtras[key];
    const secondary = ATTENDANCE_KEYS.has(key) ? withExtras[key] : membersOnly[key];
    const ok = same(primary, total) || same(secondary, total);
    return {
      key,
      label: PALMS_COUNT_LABEL[key],
      sum: same(primary, total) || !ok ? primary : secondary,
      total,
      ok,
    };
  });
}

/** CJK part of a PALMS name: "王小明 Wang,Ming" → "王小明". */
export function palmsDisplayName(rawName: string) {
  return rawName.trim().split(/\s+/)[0] ?? '';
}

export function parsePalmsReport(input: string): PalmsReport {
  if (!/<[\w:]*Workbook\b/i.test(input)) {
    throw new PalmsParseError(
      '這個檔案不是 BNI Connect 匯出的 PALMS 報告。請到 BNI Connect 的「分會 PALMS 摘要報告」按匯出，直接上傳下載到的 .xls，不要用 Excel 另存。',
    );
  }

  const sheets = readSheets(input);
  let found: { sheet: Sheet; header: NonNullable<ReturnType<typeof findHeader>> } | null = null;
  for (const sheet of sheets) {
    const header = findHeader(sheet.rows);
    if (header) {
      found = { sheet, header };
      break;
    }
  }
  if (!found) {
    throw new PalmsParseError(
      '找不到 PALMS 的表頭（姓氏、名字、出席…）。請確認上傳的是「分會 PALMS 摘要報告」，不是其他報表。',
    );
  }

  const { sheet, header } = found;
  const missing = REQUIRED_COLUMNS.filter((key) => !header.columns.has(key));
  if (missing.length > 0) {
    throw new PalmsParseError(
      `PALMS 報告少了這些欄位：${missing.map((key) => COLUMN_LABEL[key]).join('、')}。請重新從 BNI Connect 匯出完整的摘要報告。`,
    );
  }

  // ---- metadata above the header ----
  const warnings: string[] = [];
  let title: string | null = null;
  let chapterName: string | null = null;
  let region: string | null = null;
  let country: string | null = null;
  let exportedBy: string | null = null;
  let exportedAt: Date | null = null;
  let from: Date | null = null;
  let to: Date | null = null;

  for (let index = 0; index < header.index; index += 1) {
    const row = sheet.rows[index];
    const cells = sortedCells(row).filter(([, cell]) => cell.text !== '');
    if (cells.length === 0) continue;

    if (!title && /palms/i.test(cells[0][1].text)) title = cells[0][1].text;

    const fromCell = valueAfterLabel(row, ['從', 'from']);
    if (fromCell) from = parseTaipeiDateTime(fromCell.text) ?? from;
    const toCell = valueAfterLabel(row, ['至', '到', 'to']);
    if (toCell) to = parseTaipeiDateTime(toCell.text) ?? to;
    const chapterCell = valueAfterLabel(row, ['分會', 'chapter']);
    if (chapterCell && cells.length === 2) chapterName = chapterCell.text || chapterName;

    // "營運使用者 / 營運在 / 國家 / 地區 / 分會" label row: values sit in the same columns of the next row.
    const labels = new Map(cells.map(([column, cell]) => [stripLabel(cell.text), column]));
    const exportedAtColumn = labels.get('營運在') ?? labels.get('runat');
    if (exportedAtColumn !== undefined) {
      const values = sheet.rows[index + 1];
      exportedAt = parseTaipeiDateTime(cellText(values, exportedAtColumn));
      exportedBy = cellText(values, labels.get('營運使用者') ?? labels.get('runby')) || null;
      country = cellText(values, labels.get('國家') ?? labels.get('country')) || null;
      region = cellText(values, labels.get('地區') ?? labels.get('region')) || null;
      chapterName = cellText(values, labels.get('分會') ?? labels.get('chapter')) || chapterName;
    }
  }

  if (!from || !to) {
    throw new PalmsParseError(
      '讀不到這份報告的期間（從／至）。請確認匯出時有選日期範圍，並直接上傳 BNI Connect 下載的原始檔。',
    );
  }
  if (to.getTime() < from.getTime()) {
    throw new PalmsParseError('這份報告的結束日期早於開始日期，請重新匯出。');
  }
  if (!exportedAt) warnings.push('檔案裡沒有匯出時間，無法判斷是不是期中匯出。');

  // ---- member rows ----
  const rows: PalmsParsedRow[] = [];
  const extras: PalmsExtraRow[] = [];
  let totals: PalmsCounts | null = null;
  const lastNameColumn = header.columns.get('lastName');
  const firstNameColumn = header.columns.get('firstName');

  for (let index = header.index + 1; index < sheet.rows.length; index += 1) {
    const row = sheet.rows[index];
    const lastName = cellText(row, lastNameColumn).replace(/\s+/g, ' ').trim();
    const firstName = cellText(row, firstNameColumn).replace(/\s+/g, ' ').trim();
    if (!lastName && !firstName) continue;

    const counts = emptyPalmsCounts();
    const invalid: string[] = [];
    for (const key of PALMS_COUNT_KEYS) {
      const column = header.columns.get(key);
      if (column === undefined) continue;
      const parsed = readNumber(row.get(column));
      counts[key] = parsed.value;
      if (!parsed.valid) invalid.push(PALMS_COUNT_LABEL[key]);
    }

    const label = compact(lastName);
    if (!firstName && TOTAL_LABELS.includes(label)) {
      totals = counts;
      continue;
    }
    if (!firstName && EXTRA_LABELS.includes(label)) {
      extras.push({ label: lastName, ...counts });
      continue;
    }

    if (invalid.length > 0) {
      warnings.push(`${lastName}${firstName} 的 ${invalid.join('、')} 不是數字，已當作 0。`);
    }
    rows.push({ lastName, firstName, rawName: `${lastName}${firstName}`, ...counts });
  }

  if (rows.length === 0) {
    throw new PalmsParseError('這份報告裡沒有任何會員資料。請確認匯出的期間與分會後再上傳。');
  }
  if (!totals) warnings.push('檔案裡沒有「總數」列，無法核對匯入是否完整。');

  return { title, chapterName, region, country, exportedBy, exportedAt, from, to, rows, extras, totals, warnings };
}
