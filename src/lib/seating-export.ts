import type { IndustryChain, MeetingWeek, SeatData } from '@/types/seating';
import { buildPersonChainIndex } from '@/lib/industry-chains';

const COLUMN_COUNT = 4;

function csvCell(value: string | number | undefined) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function seatKind(seat: SeatData | null) {
  if (!seat) return '空位';
  if (seat.isGuest) return '來賓';
  if (seat.isHost) return '執事';
  if (seat.isSound) return '音控';
  if (seat.isDuty) return '值日生';
  if (seat.role === '代理') return '代理';
  return '會員';
}

export function buildSeatingCsv({
  week,
  topRoles,
  items,
  memberRoster,
  heroes,
  industryChains,
}: {
  week: MeetingWeek;
  topRoles: SeatData[];
  items: (SeatData | null)[];
  memberRoster: string[];
  heroes: string[];
  industryChains: IndustryChain[];
}) {
  const chainIndex = buildPersonChainIndex(industryChains);
  const rows: (string | number | undefined)[][] = [
    ['週次', week.title],
    ['分會', week.chapterName],
    ['本週固定出席成員', memberRoster.join('、')],
    ['英雄榜', heroes.join('、')],
    [],
    ['區塊', '列', '欄', '姓名', '角色', '賓號/服務賓號', '產業服務鍊'],
  ];

  for (const role of topRoles) {
    rows.push(['主持團', '', '', role.name, role.role, '', chainIndex.get(role.name.trim())?.join('、')]);
  }

  items.forEach((seat, index) => {
    const row = Math.floor(index / COLUMN_COUNT);
    const col = index % COLUMN_COUNT;
    rows.push([
      '主座位',
      row,
      col,
      seat?.name ?? '',
      seatKind(seat),
      seat?.guestNumber ?? seat?.hostFor ?? '',
      seat ? chainIndex.get(seat.name.trim())?.join('、') : '',
    ]);
  });

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadTextFile(filename: string, text: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
