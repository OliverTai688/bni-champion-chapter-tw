import 'server-only';

import { CHAPTER_MEMBER_DIRECTORY } from '@/lib/chapter-members';
import type { AdminSeatingWorkspaceDTO } from '@/application/seating/dto';

const STATUS_LABELS: Record<string, string> = {
  assigned: '已安排',
  checked_in: '已抵達',
  absent: '未出席',
  canceled: '已取消',
  released: '已釋出',
  reserved: '保留',
  late: '遲到',
};

export function attendanceStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export interface AttendanceSeatEntry {
  seatKey: string;
  zone: string;
  displayName: string;
  role: string | null;
  kind: string;
  status: string;
  isProxy: boolean;
}

export interface EventAttendanceReport {
  weekId: string;
  date: string;
  title: string;
  chapterName: string;
  meetingLabel: string;
  seats: AttendanceSeatEntry[];
  presentNames: string[];
  proxyEntries: AttendanceSeatEntry[];
  proxyMemberNames: string[];
  absentMembers: { name: string; adminGroup?: string }[];
  summary: {
    totalSeats: number;
    occupiedSeats: number;
    checkedInCount: number;
    proxyCount: number;
    absentCount: number;
  };
}

/**
 * Derives proxy and absence facts from a single event's seat map and metadata overrides.
 * Attendance is resolved using seat map assignments merged with admin/member overrides.
 */
export function buildEventAttendanceReport(dto: AdminSeatingWorkspaceDTO): EventAttendanceReport {
  const overrides = (dto.metadata && typeof dto.metadata === 'object' && 'attendanceOverrides' in dto.metadata)
    ? (dto.metadata.attendanceOverrides as Record<string, { status: string; proxyName?: string }>)
    : {};

  const seats: AttendanceSeatEntry[] = [];
  const presentNameSet = new Set<string>();
  const proxyEntries: AttendanceSeatEntry[] = [];
  const proxyMemberNames: string[] = [];

  // Build map of member names to seat assignments for quick lookup
  const memberToSeatMap = new Map<string, typeof dto.seats[number]>();
  for (const seat of dto.seats) {
    if (seat.assignment) {
      memberToSeatMap.set(seat.assignment.displayName.trim(), seat);
    }
  }

  // 1. Process physical seats in the seat map
  for (const seat of dto.seats) {
    if (!seat.assignment) continue;
    const occupantName = seat.assignment.displayName.trim();
    const override = overrides[occupantName] || overrides[seat.assignment.displayName];

    let displayName = seat.assignment.displayName;
    let role = seat.assignment.role;
    let status = seat.assignment.status;
    let kind = seat.kind;
    let isProxy = seat.kind === 'proxy' || seat.assignment.role === '代理';

    if (override) {
      if (override.status === 'absent') {
        status = 'absent';
      } else if (override.status === 'late') {
        status = 'late';
        presentNameSet.add(occupantName);
      } else if (override.status === 'present') {
        status = 'checked_in';
        presentNameSet.add(occupantName);
      } else if (override.status === 'proxy') {
        isProxy = true;
        kind = 'proxy';
        role = '代理';
        displayName = override.proxyName || `代理人 (${seat.assignment.displayName})`;
        status = 'checked_in';
        proxyMemberNames.push(occupantName);
      }
    } else {
      if (isProxy) {
        presentNameSet.add(occupantName);
      } else {
        presentNameSet.add(occupantName);
      }
    }

    const entry: AttendanceSeatEntry = {
      seatKey: seat.seatKey,
      zone: seat.zone,
      displayName,
      role,
      kind,
      status,
      isProxy,
    };
    seats.push(entry);

    if (isProxy) {
      proxyEntries.push(entry);
    }
  }

  // 2. Process non-seated members who have overrides (e.g. registered proxy or leave in advance)
  for (const member of CHAPTER_MEMBER_DIRECTORY) {
    const trimmed = member.name.trim();
    if (memberToSeatMap.has(trimmed)) continue;

    const override = overrides[member.name] || overrides[trimmed];
    if (override) {
      if (override.status === 'present') {
        presentNameSet.add(trimmed);
      } else if (override.status === 'late') {
        presentNameSet.add(trimmed);
      } else if (override.status === 'proxy') {
        proxyMemberNames.push(trimmed);
        const proxyName = override.proxyName || '代理人';
        const virtualEntry: AttendanceSeatEntry = {
          seatKey: '無',
          zone: '無',
          displayName: `${proxyName} (代表 ${member.name})`,
          role: '代理',
          kind: 'proxy',
          status: 'checked_in',
          isProxy: true,
        };
        seats.push(virtualEntry);
        proxyEntries.push(virtualEntry);
      }
    }
  }

  // 3. Build absent list
  const absentMembers = CHAPTER_MEMBER_DIRECTORY
    .filter((member) => {
      const trimmed = member.name.trim();
      return !presentNameSet.has(trimmed) && !proxyMemberNames.includes(trimmed);
    })
    .map((member) => ({ name: member.name, adminGroup: member.adminGroup }));

  const checkedInCount = seats.filter((s) => s.status === 'checked_in' || s.status === 'late').length;

  return {
    weekId: dto.weekId,
    date: dto.date,
    title: dto.title,
    chapterName: dto.chapterName,
    meetingLabel: dto.meetingLabel,
    seats,
    presentNames: [...presentNameSet],
    proxyEntries,
    proxyMemberNames,
    absentMembers,
    summary: {
      totalSeats: dto.summary.totalSeats,
      occupiedSeats: seats.length,
      checkedInCount,
      proxyCount: proxyEntries.length,
      absentCount: absentMembers.length,
    },
  };
}
