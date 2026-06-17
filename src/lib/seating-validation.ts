import type {
  IndustryChain,
  SeatData,
  SeatingValidationIssue,
  SeatingValidationSummary,
  ValidationSeverity,
} from '@/types/seating';
import { buildPersonChainIndex } from '@/lib/industry-chains';

const COLUMN_COUNT = 4;
const TABLE_ONE_COLUMNS = new Set([0, 1]);
const TABLE_TWO_COLUMNS = new Set([2, 3]);
const EXPECTED_SOUND = { row: 1, col: 3 };
const EXPECTED_DUTY = { row: 0, col: 3 };

function rowOf(index: number) {
  return Math.floor(index / COLUMN_COUNT);
}

function colOf(index: number) {
  return index % COLUMN_COUNT;
}

function addIssue(
  issues: SeatingValidationIssue[],
  severity: ValidationSeverity,
  id: string,
  title: string,
  message: string,
  seatIndex?: number,
) {
  issues.push({ severity, id, title, message, seatIndex });
}

export function validateSeatingWorkspace({
  topRoles,
  items,
  industryChains,
}: {
  topRoles: SeatData[];
  items: (SeatData | null)[];
  industryChains: IndustryChain[];
}): SeatingValidationSummary {
  const issues: SeatingValidationIssue[] = [];
  const occupied = items.filter((seat): seat is SeatData => Boolean(seat));
  const rows = Math.ceil(items.length / COLUMN_COUNT);

  if (topRoles.length !== 5) {
    addIssue(issues, 'error', 'host-team-count', '主持團人數異常', '主持團應維持 5 個固定角色。');
  }

  for (const role of topRoles) {
    if (!role.name.trim()) {
      addIssue(issues, 'error', `host-team-empty-${role.role}`, '主持團姓名未填', `${role.role} 尚未填入姓名。`);
    }
  }

  const soundSeats = occupied.filter((seat) => seat.isSound);
  const dutySeats = occupied.filter((seat) => seat.isDuty);
  if (soundSeats.length !== 1) {
    addIssue(issues, 'error', 'sound-count', '音控標記異常', `目前找到 ${soundSeats.length} 個音控，應剛好 1 個。`);
  }
  if (dutySeats.length !== 1) {
    addIssue(issues, 'error', 'duty-count', '值日生標記異常', `目前找到 ${dutySeats.length} 個值日生，應剛好 1 個。`);
  }

  const soundIndex = items.findIndex((seat) => seat?.isSound);
  if (soundIndex >= 0 && (rowOf(soundIndex) !== EXPECTED_SOUND.row || colOf(soundIndex) !== EXPECTED_SOUND.col)) {
    addIssue(
      issues,
      'warning',
      'sound-position',
      '音控座位非規則位置',
      `目前基準指定音控在列 ${EXPECTED_SOUND.row}・欄 ${EXPECTED_SOUND.col}，請確認本週是否為特殊調整。`,
      soundIndex,
    );
  }

  const dutyIndex = items.findIndex((seat) => seat?.isDuty);
  if (dutyIndex >= 0 && (rowOf(dutyIndex) !== EXPECTED_DUTY.row || colOf(dutyIndex) !== EXPECTED_DUTY.col)) {
    addIssue(
      issues,
      'warning',
      'duty-position',
      '值日座位非規則位置',
      `目前基準指定值日生在列 ${EXPECTED_DUTY.row}・欄 ${EXPECTED_DUTY.col}，請確認本週是否為特殊調整。`,
      dutyIndex,
    );
  }

  if (dutyIndex >= 0) {
    const behindDuty = items[dutyIndex + COLUMN_COUNT];
    if (behindDuty?.isGuest) {
      addIssue(
        issues,
        'error',
        'guest-behind-duty',
        '來賓坐在值日正後方',
        '值日生正後方不可安排來賓。',
        dutyIndex + COLUMN_COUNT,
      );
    }
  }

  const guests = items
    .map((seat, index) => ({ seat, index }))
    .filter((entry): entry is { seat: SeatData; index: number } => Boolean(entry.seat?.isGuest));

  for (const { seat, index } of guests) {
    const host = items[index + COLUMN_COUNT];
    if (!host?.isHost || host.hostFor !== seat.guestNumber) {
      addIssue(
        issues,
        'error',
        `guest-host-${seat.guestNumber}`,
        '來賓與執事未上下對應',
        `${seat.guestNumber ?? seat.name} 的執事應坐在正後方同欄。`,
        index,
      );
    }
  }

  const guestRows = new Set(guests.map(({ index }) => rowOf(index)));
  for (const guestRow of guestRows) {
    if (guestRow > 4) {
      addIssue(
        issues,
        'warning',
        `guest-row-${guestRow}`,
        '來賓位置偏後',
        `第 ${guestRow + 1} 列仍有來賓，規則偏好來賓盡量靠前。`,
        guestRow * COLUMN_COUNT,
      );
    }
  }

  const proxySeats = items
    .map((seat, index) => ({ seat, index }))
    .filter((entry): entry is { seat: SeatData; index: number } => entry.seat?.role === '代理');
  const lastRow = rows - 1;
  for (const { seat, index } of proxySeats) {
    if (rowOf(index) !== lastRow) {
      addIssue(
        issues,
        'info',
        `proxy-row-${seat.name}-${index}`,
        '代理人未集中最後列',
        `${seat.name} 目前在第 ${rowOf(index) + 1} 列；若是本週代理坐一般席，請視為人工確認項。`,
        index,
      );
    }
  }

  const chainIndex = buildPersonChainIndex(industryChains);
  const groupTables = new Map<string, Set<number>>();
  items.forEach((seat, index) => {
    if (!seat) return;
    const groups = (chainIndex.get(seat.name.trim()) ?? []).map((id) => id[0]);
    for (const group of groups) {
      const table = TABLE_ONE_COLUMNS.has(colOf(index)) ? 1 : TABLE_TWO_COLUMNS.has(colOf(index)) ? 2 : 0;
      const set = groupTables.get(group) ?? new Set<number>();
      set.add(table);
      groupTables.set(group, set);
    }
  });

  for (const [group, tables] of groupTables) {
    if (tables.size > 1) {
      addIssue(
        issues,
        'info',
        `industry-group-split-${group}`,
        `${group} 組跨桌分布`,
        `${group} 組成員分布於兩張長桌；若有商務關係或當週任務考量，請人工確認。`,
      );
    }
  }

  const counts = issues.reduce<Record<ValidationSeverity, number>>(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { error: 0, warning: 0, info: 0 },
  );

  const score = Math.max(0, 100 - counts.error * 25 - counts.warning * 10 - counts.info * 3);

  return { issues, counts, score };
}

export function getSeatCoordinate(index?: number) {
  if (index === undefined) return '';
  return `列 ${rowOf(index)}・欄 ${colOf(index)}`;
}
