export type SeatCategory =
  | 'host-team'
  | 'sound'
  | 'duty'
  | 'guest'
  | 'host'
  | 'member'
  | 'proxy';

export interface SeatData {
  id: string;
  name: string;
  isGuest: boolean;
  guestNumber?: string;   // e.g. "賓1"
  isHost?: boolean;        // 執事
  hostFor?: string;        // 該執事服務的賓號 e.g. "賓1"
  isSound?: boolean;       // 音控
  isDuty?: boolean;        // 值日生
  role?: string;           // 行業 / 職稱
}

export interface SeatingLayout {
  topRoles: SeatData[];
  mainGrid: (SeatData | null)[][];
  sidebar: SeatData[];
}

export interface MeetingWeek {
  id: string;                  // Stable id, e.g. "2026-05-21"
  date: string;                // ISO date
  title: string;               // UI title, e.g. "115/05/21 座位表"
  chapterName: string;         // BNI 長冠軍分會
  meetingLabel: string;        // Weekly context label
  source: 'seed' | 'draft' | 'generated';
}

export interface SeatingWorkspaceState {
  week: MeetingWeek;
  topRoles: SeatData[];
  items: (SeatData | null)[];
  memberRoster: string[];
  heroes: string[];
  industryChains: IndustryChain[];
  updatedAt: string;
}

export interface ChapterMember {
  name: string;
  adminGroup?: string;
  roles: string[];
  note?: string;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface SeatingValidationIssue {
  id: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  seatIndex?: number;
}

export interface SeatingValidationSummary {
  issues: SeatingValidationIssue[];
  counts: Record<ValidationSeverity, number>;
  score: number;
}

// --- Roster (規則編輯面板使用) ---

export interface HostTeamMember {
  role: string;   // 主席 / 副主席 / ...
  name: string;
}

export interface GuestPair {
  number: string;  // 賓1
  guestName: string;
  hostName: string;   // 對應執事
}

export interface Roster {
  hostTeam: HostTeamMember[];   // 主持團 (固定 5 位)
  sound: string;                 // 音控
  duty: string;                  // 值日生
  guests: GuestPair[];           // 來賓 + 執事
  members: string[];             // 一般成員 (依現有座位順序)
  proxies: string[];             // 代理人
  industryChains: IndustryChain[]; // 產業服務鍊分組
  heroes: string[];              // 本週英雄榜 (英1, 英2, ...)
}

// --- Industry chain (產業服務鍊) ---

export type IndustryChainGroup = 'A' | 'B' | 'C' | 'D';

export interface IndustryChain {
  id: string;                  // 'A1', 'A2', 'B1' ...
  group: IndustryChainGroup;   // 行政分群
  name: string;                // 產業鏈名稱，例：品牌主服務鍊
  members: string[];           // 預計組員姓名
  targetCustomers?: string;    // 共同目標客戶
  gap?: string;                // 產業缺口
  finalized?: boolean;         // 是否定案
  note?: string;               // 備註
}
