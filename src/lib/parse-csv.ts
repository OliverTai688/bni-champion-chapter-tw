import Papa from 'papaparse';
import { SeatData, SeatingLayout } from '../types/seating';

export function parseSeatingCSV(csvText: string): SeatingLayout {
  const { data } = Papa.parse(csvText, { skipEmptyLines: false }) as { data: string[][] };

  const layout: SeatingLayout = {
    topRoles: [],
    mainGrid: [],
    sidebar: [],
  };

  // --- Top Roles (主持團) ---
  // CSV row 2 (index 1) = role labels, row 3 (index 2) = names
  if (data[1] && data[2]) {
    const roles = ['活動協調', '財務秘書', '主席', '副主席', '教育協調'];
    roles.forEach((role) => {
      const colIndex = data[1].findIndex((cell) => cell.trim() === role);
      if (colIndex !== -1 && data[2][colIndex]) {
        layout.topRoles.push({
          id: `top-${role}`,
          name: data[2][colIndex].trim(),
          role,
          isGuest: false,
        });
      }
    });
  }

  // --- Main Grid ---
  // Seats are in CSV columns 3-6, rows 5-23 (idx 4-22).
  // Per-row metadata may live in col 8 or col 9 depending on the row;
  // we keep "industry-style" labels (生活/媒體/...) and the special row labels (音控/值日生).
  const SPECIAL_LABELS = new Set(['音控', '值日生', '教育', '生活', '媒體', '品牌', '工程', '汽修', '代理']);
  const PROXY_NAMES = new Set(['林塏秢', '程睿紳']);

  for (let r = 4; r <= 22; r++) {
    const row = data[r];
    if (!row) continue;

    // Pick the first non-empty label cell from col 8 or col 9
    const label = [row[8], row[9]]
      .map((c) => c?.trim())
      .find((c) => c && SPECIAL_LABELS.has(c));

    const gridRow: (SeatData | null)[] = [];
    for (let c = 3; c <= 6; c++) {
      const cell = row[c]?.trim();
      if (cell) {
        const guestMatch = cell.match(/賓(\d+)[\n\r]([\s\S]*)/) || cell.match(/賓(\d+)([\s\S]*)/);
        if (guestMatch) {
          gridRow.push({
            id: `seat-${r}-${c}`,
            name: guestMatch[2].trim(),
            isGuest: true,
            guestNumber: `賓${guestMatch[1]}`,
            role: label,
          });
        } else {
          gridRow.push({
            id: `seat-${r}-${c}`,
            name: cell,
            isGuest: false,
            role: PROXY_NAMES.has(cell) ? '代理' : label,
          });
        }
      } else {
        gridRow.push(null);
      }
    }

    if (gridRow.some((s) => s !== null)) {
      layout.mainGrid.push(gridRow);
    }
  }

  // --- Detect 執事 (host) ---
  // 規則：來賓正後方同欄的座位即為其執事。
  for (let r = 0; r < layout.mainGrid.length - 1; r++) {
    for (let c = 0; c < layout.mainGrid[r].length; c++) {
      const above = layout.mainGrid[r][c];
      const below = layout.mainGrid[r + 1][c];
      if (above?.isGuest && below && !below.isGuest) {
        below.isHost = true;
        below.hostFor = above.guestNumber;
      }
    }
  }

  // --- Detect 音控 / 值日生 ---
  // 規則 (依 0430 樣式)：被標 "音控" 那一列、最右邊的座位是音控本人；"值日生" 列同理。
  layout.mainGrid.forEach((gridRow) => {
    const lastSeat = [...gridRow].reverse().find((s) => s !== null) as SeatData | undefined;
    if (!lastSeat) return;
    const rowLabel = gridRow.find((s) => s?.role)?.role;
    if (rowLabel === '音控') lastSeat.isSound = true;
    if (rowLabel === '值日生') lastSeat.isDuty = true;
  });

  // Sidebar empty for now
  layout.sidebar = [];

  return layout;
}
