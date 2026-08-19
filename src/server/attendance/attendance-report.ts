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
 * Derives proxy and absence facts from a single event's seat map. Absence is
 * inferred by diffing the chapter's official member directory against the
 * names actually seated that week — there is no explicit "absent" record in
 * the data model, so a member whose name does not appear in any seat is
 * treated as absent, including members whose seat was covered by a proxy.
 */
export function buildEventAttendanceReport(dto: AdminSeatingWorkspaceDTO): EventAttendanceReport {
  const seats: AttendanceSeatEntry[] = dto.seats
    .filter((seat) => seat.assignment)
    .map((seat) => ({
      seatKey: seat.seatKey,
      zone: seat.zone,
      displayName: seat.assignment!.displayName,
      role: seat.assignment!.role,
      kind: seat.kind,
      status: seat.assignment!.status,
      isProxy: seat.kind === 'proxy' || seat.assignment!.role === '代理',
    }));

  const presentNameSet = new Set(seats.map((seat) => seat.displayName.trim()).filter(Boolean));
  const proxyEntries = seats.filter((seat) => seat.isProxy);
  const absentMembers = CHAPTER_MEMBER_DIRECTORY
    .filter((member) => !presentNameSet.has(member.name.trim()))
    .map((member) => ({ name: member.name, adminGroup: member.adminGroup }));

  return {
    weekId: dto.weekId,
    date: dto.date,
    title: dto.title,
    chapterName: dto.chapterName,
    meetingLabel: dto.meetingLabel,
    seats,
    presentNames: [...presentNameSet],
    proxyEntries,
    absentMembers,
    summary: {
      totalSeats: dto.summary.totalSeats,
      occupiedSeats: dto.summary.occupiedSeats,
      checkedInCount: dto.summary.checkedInCount,
      proxyCount: proxyEntries.length,
      absentCount: absentMembers.length,
    },
  };
}
