import 'server-only';

import { prisma } from '@/server/db/prisma';
import { toAdminSeatingWorkspaceDTO } from '@/application/seating/mappers';
import { CHAPTER_MEMBER_DIRECTORY } from '@/lib/chapter-members';
import { buildEventAttendanceReport } from './attendance-report';

function isoDateOnly(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('Date must use YYYY-MM-DD format.');
  return match[0];
}

async function listSeatMapsInRange(fromDate: string, toDate: string) {
  const sessions = await prisma.meetingSession.findMany({
    where: {
      date: {
        gte: new Date(`${fromDate}T00:00:00.000Z`),
        lte: new Date(`${toDate}T23:59:59.999Z`),
      },
    },
    orderBy: { date: 'asc' },
    include: {
      seatMaps: {
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        take: 1,
        include: {
          session: true,
          seats: {
            orderBy: [{ zone: 'asc' }, { position: 'asc' }],
            include: {
              assignments: {
                where: { status: { not: 'released' } },
                orderBy: { updatedAt: 'desc' },
              },
            },
          },
          assignments: true,
          revisions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  return sessions
    .map((session) => session.seatMaps[0])
    .filter((seatMap): seatMap is NonNullable<typeof seatMap> => Boolean(seatMap));
}

export interface RangeAttendanceSummaryRow {
  name: string;
  adminGroup?: string;
  totalEvents: number;
  presentCount: number;
  proxyCount: number;
  absentCount: number;
}

export interface RangeAttendanceEventDetail {
  weekId: string;
  title: string;
  date: string;
  proxies: string[];
  absentees: string[];
}

export interface RangeAttendanceReport {
  from: string;
  to: string;
  events: { weekId: string; title: string; date: string }[];
  rows: RangeAttendanceSummaryRow[];
  eventDetails: RangeAttendanceEventDetail[];
}

/**
 * Aggregates proxy and absence counts per official chapter member across all
 * events whose date falls within [from, to]. A member's weekly outcome is
 * classified as exactly one of: proxyCount (they personally sat in a proxy
 * seat that week), presentCount (they were seated normally), or absentCount
 * (their name did not appear in any seat that week — see
 * buildEventAttendanceReport for how absence is derived).
 */
export async function buildRangeAttendanceReport(fromInput: string, toInput: string): Promise<RangeAttendanceReport> {
  const from = isoDateOnly(fromInput);
  const to = isoDateOnly(toInput);
  if (from > to) throw new Error('起始日期不可晚於結束日期。');

  const seatMaps = await listSeatMapsInRange(from, to);
  const eventReports = seatMaps.map((seatMap) => buildEventAttendanceReport(toAdminSeatingWorkspaceDTO(seatMap)));

  const counters = new Map<string, RangeAttendanceSummaryRow>();
  for (const member of CHAPTER_MEMBER_DIRECTORY) {
    counters.set(member.name, {
      name: member.name,
      adminGroup: member.adminGroup,
      totalEvents: 0,
      presentCount: 0,
      proxyCount: 0,
      absentCount: 0,
    });
  }

  for (const report of eventReports) {
    const proxyNameSet = new Set(report.proxyEntries.map((entry) => entry.displayName.trim()));
    const presentNameSet = new Set(report.presentNames.map((name) => name.trim()));

    for (const member of CHAPTER_MEMBER_DIRECTORY) {
      const row = counters.get(member.name)!;
      const trimmedName = member.name.trim();
      row.totalEvents += 1;
      if (proxyNameSet.has(trimmedName)) {
        row.proxyCount += 1;
      } else if (presentNameSet.has(trimmedName)) {
        row.presentCount += 1;
      } else {
        row.absentCount += 1;
      }
    }
  }

  return {
    from,
    to,
    events: eventReports.map((report) => ({ weekId: report.weekId, title: report.title, date: report.date })),
    rows: [...counters.values()],
    eventDetails: eventReports.map((report) => ({
      weekId: report.weekId,
      title: report.title,
      date: report.date,
      proxies: report.proxyEntries.map((entry) => entry.displayName),
      absentees: report.absentMembers.map((member) => member.name),
    })),
  };
}
