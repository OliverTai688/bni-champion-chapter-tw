import 'server-only';

import type { SeatData, SeatingLayout } from '@/types/seating';
import {
  CURRENT_MEETING_WEEK,
  CURRENT_SEATING_HEROES,
  CURRENT_SEATING_LAYOUT,
  CURRENT_SEATING_MEMBER_ROSTER,
} from '@/lib/seating-week';
import { toAdminSeatingWorkspaceDTO } from '@/application/seating/mappers';
import { findLatestSeatMapByWeekId } from '@/server/repositories/seating-workspace-repository';

function isSeatData(value: unknown): value is SeatData {
  return Boolean(value && typeof value === 'object' && typeof (value as SeatData).name === 'string');
}

function toSeatDataFromSeat(seat: ReturnType<typeof toAdminSeatingWorkspaceDTO>['seats'][number]) {
  if (isSeatData(seat.metadata)) return seat.metadata;
  if (!seat.assignment) return null;

  return {
    id: seat.seatKey,
    name: seat.assignment.displayName,
    isGuest: seat.kind === 'guest',
    guestNumber: seat.assignment.guestNumber ?? undefined,
    isHost: seat.kind === 'host',
    hostFor: seat.assignment.hostFor ?? undefined,
    isSound: seat.kind === 'sound',
    isDuty: seat.kind === 'duty',
    role: seat.assignment.role ?? undefined,
  };
}

export async function loadSeatingEditorState(weekId: string) {
  if (weekId === CURRENT_MEETING_WEEK.id) {
    return {
      week: CURRENT_MEETING_WEEK,
      layout: CURRENT_SEATING_LAYOUT,
      heroes: CURRENT_SEATING_HEROES,
      memberRoster: CURRENT_SEATING_MEMBER_ROSTER,
      loadedFrom: 'seed' as const,
    };
  }

  const seatMap = await findLatestSeatMapByWeekId(weekId);
  if (!seatMap) return null;

  const dto = toAdminSeatingWorkspaceDTO(seatMap);
  const topRoles = Array.isArray(dto.seatMap.topRoles)
    ? dto.seatMap.topRoles.filter(isSeatData)
    : [];
  const mainSeats = dto.seats
    .filter((seat) => seat.zone === 'main')
    .sort((a, b) => a.position - b.position)
    .map(toSeatDataFromSeat);
  const layout: SeatingLayout = {
    topRoles,
    mainGrid: [mainSeats],
    sidebar: [],
  };

  return {
    week: {
      id: dto.weekId,
      date: dto.date.slice(0, 10),
      title: dto.title,
      chapterName: dto.chapterName,
      meetingLabel: dto.meetingLabel,
      source: 'draft' as const,
    },
    layout,
    heroes: dto.seatMap.heroes,
    memberRoster: dto.seatMap.memberRoster,
    loadedFrom: 'database' as const,
  };
}
