import type { PublicPollDTO, PublicWeeklyEventDTO } from './dto';

type PublicSeatRecord = {
  id: string;
  seatKey: string;
  row: number | null;
  col: number | null;
  zone: string;
  position: number;
  kind: string;
  label: string | null;
  capacity: number;
  assignments: Array<{
    displayName: string;
    role: string | null;
    status: string;
  }>;
};

type PublicSeatMapRecord = {
  updatedAt: Date;
  seats: PublicSeatRecord[];
  assignments: Array<{
    status: string;
  }>;
};

type PublicPollRecord = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  eligibility: string;
  resultVisibility: string;
  opensAt: Date | null;
  closesAt: Date | null;
  options: Array<{
    id: string;
    label: string;
    publicDescription: string | null;
    metadata: unknown;
  }>;
  votes: Array<{
    optionId: string;
  }>;
};

type PublicWeeklyEventRecord = {
  publicSlug: string | null;
  weekId: string;
  title: string;
  chapterName: string;
  meetingLabel: string;
  date: Date;
  status: string;
  publicStatus: string;
  updatedAt: Date;
  seatMaps: PublicSeatMapRecord[];
  livePolls: PublicPollRecord[];
};

function buildSeatSummary(seatMap: PublicSeatMapRecord | undefined): PublicWeeklyEventDTO['seatSummary'] {
  if (!seatMap) {
    return {
      totalSeats: 0,
      occupiedSeats: 0,
      emptySeats: 0,
      assignedCount: 0,
      checkedInCount: 0,
      capacity: 0,
    };
  }

  const totalSeats = seatMap.seats.length;
  const occupiedSeats = seatMap.seats.filter((seat) => seat.assignments.length > 0).length;

  return {
    totalSeats,
    occupiedSeats,
    emptySeats: totalSeats - occupiedSeats,
    assignedCount: seatMap.assignments.filter((assignment) => assignment.status === 'assigned').length,
    checkedInCount: seatMap.assignments.filter((assignment) => assignment.status === 'checked_in').length,
    capacity: seatMap.seats.reduce((sum, seat) => sum + seat.capacity, 0),
  };
}

function buildOccupancyByZone(seatMap: PublicSeatMapRecord | undefined): PublicWeeklyEventDTO['occupancyByZone'] {
  if (!seatMap) return [];

  const zones = new Map<string, { zone: string; capacity: number; occupiedSeats: number; checkedInCount: number }>();

  for (const seat of seatMap.seats) {
    const zone = zones.get(seat.zone) ?? {
      zone: seat.zone,
      capacity: 0,
      occupiedSeats: 0,
      checkedInCount: 0,
    };
    zone.capacity += seat.capacity;
    if (seat.assignments.length > 0) zone.occupiedSeats += 1;
    zone.checkedInCount += seat.assignments.filter((assignment) => assignment.status === 'checked_in').length;
    zones.set(seat.zone, zone);
  }

  return [...zones.values()].sort((a, b) => a.zone.localeCompare(b.zone));
}

function readMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

function buildOptionSeatIndex(polls: PublicPollRecord[]) {
  const options = new Map<string, string>();
  const openPoll = polls.find((poll) => poll.status === 'open');
  for (const option of openPoll?.options ?? []) {
    const seatId = readMetadataString(option.metadata, 'seatId');
    if (seatId) options.set(seatId, option.id);
  }
  return options;
}

function buildSeatMap(record: PublicWeeklyEventRecord, seatMap: PublicSeatMapRecord | undefined): PublicWeeklyEventDTO['seatMap'] {
  if (!seatMap) return { columns: 4, seats: [] };

  const optionSeatIndex = buildOptionSeatIndex(record.livePolls);
  const mainCols = seatMap.seats
    .filter((seat) => seat.zone === 'main' && seat.col !== null)
    .map((seat) => seat.col ?? 0);
  const columns = Math.max(5, ...mainCols.map((col) => col + 1));

  return {
    columns,
    seats: seatMap.seats.map((seat) => {
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
        occupantName: assignment?.displayName ?? null,
        role: assignment?.role ?? null,
        attendanceStatus: assignment?.status ?? null,
        pollOptionId: optionSeatIndex.get(seat.id) ?? null,
      };
    }),
  };
}

function shouldShowResults(poll: PublicPollRecord) {
  if (poll.resultVisibility === 'live_public') return true;
  return poll.resultVisibility === 'after_closed' && poll.status === 'closed';
}

function toPublicPollDTO(poll: PublicPollRecord): PublicPollDTO {
  const counts = new Map<string, number>();
  for (const vote of poll.votes) {
    counts.set(vote.optionId, (counts.get(vote.optionId) ?? 0) + 1);
  }

  return {
    id: poll.id,
    title: poll.title,
    description: poll.description,
    type: poll.type,
    status: poll.status,
    eligibility: poll.eligibility,
    resultVisibility: poll.resultVisibility,
    opensAt: poll.opensAt?.toISOString() ?? null,
    closesAt: poll.closesAt?.toISOString() ?? null,
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      publicDescription: option.publicDescription,
      seatId: readMetadataString(option.metadata, 'seatId'),
    })),
    results: shouldShowResults(poll)
      ? poll.options.map((option) => ({
          optionId: option.id,
          label: option.label,
          count: counts.get(option.id) ?? 0,
        }))
      : null,
  };
}

export function toPublicWeeklyEventDTO(record: PublicWeeklyEventRecord): PublicWeeklyEventDTO {
  const seatMap = record.seatMaps[0];

  return {
    slug: record.publicSlug ?? '',
    weekId: record.weekId,
    title: record.title,
    chapterName: record.chapterName,
    meetingLabel: record.meetingLabel,
    date: record.date.toISOString(),
    status: record.status,
    publicStatus: record.publicStatus,
    seatSummary: buildSeatSummary(seatMap),
    occupancyByZone: buildOccupancyByZone(seatMap),
    seatMap: buildSeatMap(record, seatMap),
    polls: record.livePolls.map(toPublicPollDTO),
    updatedAt: (seatMap?.updatedAt ?? record.updatedAt).toISOString(),
  };
}
