import type { AdminSeatingWorkspaceDTO, PublicSeatMapSummaryDTO } from './dto';

type SeatRecord = {
  id: string;
  seatKey: string;
  row: number | null;
  col: number | null;
  zone: string;
  position: number;
  kind: string;
  label: string | null;
  capacity: number;
  metadata: unknown;
  assignments: Array<{
    id: string;
    displayName: string;
    role: string | null;
    guestNumber: string | null;
    hostFor: string | null;
    status: string;
    memberId: string | null;
  }>;
};

type SeatMapRecord = {
  id: string;
  title: string;
  version: number;
  status: string;
  layoutKind: string;
  topRoles: unknown;
  memberRoster: string[];
  heroes: string[];
  industryChains: unknown;
  updatedAt: Date;
  session: {
    weekId: string;
    date: Date;
    title: string;
    chapterName: string;
    meetingLabel: string;
    status: string;
  };
  seats: SeatRecord[];
  assignments: Array<{
    id: string;
    status: string;
  }>;
  revisions: Array<{
    id: string;
    version: number;
    reason: string | null;
    createdBy: string | null;
    createdAt: Date;
  }>;
};

function buildSummary(record: SeatMapRecord): PublicSeatMapSummaryDTO['summary'] {
  const occupiedSeats = record.seats.filter((seat) => seat.assignments.length > 0).length;
  const assignmentStatuses = record.assignments.map((assignment) => assignment.status);

  return {
    totalSeats: record.seats.length,
    occupiedSeats,
    emptySeats: record.seats.length - occupiedSeats,
    assignedCount: assignmentStatuses.filter((status) => status === 'assigned').length,
    checkedInCount: assignmentStatuses.filter((status) => status === 'checked_in').length,
    guestCount: record.seats.filter((seat) => seat.kind === 'guest').length,
    memberCount: record.seats.filter((seat) => seat.kind === 'member').length,
    proxyCount: record.seats.filter((seat) => seat.kind === 'proxy').length,
    hostTeamCount: record.seats.filter((seat) => seat.kind === 'host_team').length,
  };
}

function buildZones(record: SeatMapRecord): PublicSeatMapSummaryDTO['zones'] {
  const zones = new Map<string, { zone: string; totalSeats: number; occupiedSeats: number }>();

  for (const seat of record.seats) {
    const current = zones.get(seat.zone) ?? {
      zone: seat.zone,
      totalSeats: 0,
      occupiedSeats: 0,
    };
    current.totalSeats += 1;
    if (seat.assignments.length > 0) current.occupiedSeats += 1;
    zones.set(seat.zone, current);
  }

  return [...zones.values()].sort((a, b) => a.zone.localeCompare(b.zone));
}

export function toPublicSeatMapSummaryDTO(record: SeatMapRecord): PublicSeatMapSummaryDTO {
  return {
    weekId: record.session.weekId,
    title: record.session.title,
    chapterName: record.session.chapterName,
    meetingLabel: record.session.meetingLabel,
    date: record.session.date.toISOString(),
    status: record.session.status,
    seatMap: {
      id: record.id,
      title: record.title,
      status: record.status,
      layoutKind: record.layoutKind,
      version: record.version,
    },
    summary: buildSummary(record),
    zones: buildZones(record),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function toAdminSeatingWorkspaceDTO(record: SeatMapRecord): AdminSeatingWorkspaceDTO {
  return {
    ...toPublicSeatMapSummaryDTO(record),
    seatMap: {
      ...toPublicSeatMapSummaryDTO(record).seatMap,
      topRoles: record.topRoles,
      memberRoster: record.memberRoster,
      heroes: record.heroes,
      industryChains: record.industryChains,
    },
    seats: record.seats
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((seat) => {
        const assignment = seat.assignments[0] ?? null;
        return {
          id: seat.id,
          seatKey: seat.seatKey,
          row: seat.row,
          col: seat.col,
          zone: seat.zone,
          position: seat.position,
          kind: seat.kind,
          label: seat.label,
          capacity: seat.capacity,
          metadata: seat.metadata,
          assignment: assignment
            ? {
                id: assignment.id,
                displayName: assignment.displayName,
                role: assignment.role,
                guestNumber: assignment.guestNumber,
                hostFor: assignment.hostFor,
                status: assignment.status,
                memberId: assignment.memberId,
              }
            : null,
        };
      }),
    revisions: record.revisions.map((revision) => ({
      id: revision.id,
      version: revision.version,
      reason: revision.reason,
      createdBy: revision.createdBy,
      createdAt: revision.createdAt.toISOString(),
    })),
  };
}
