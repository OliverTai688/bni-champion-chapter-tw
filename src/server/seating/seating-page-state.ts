import 'server-only';

import type { IndustryChain, SeatData, SeatingLayout, SeatingWorkspaceState } from '@/types/seating';
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
  const base = isSeatData(seat.metadata) ? seat.metadata : null;
  if (!seat.assignment) return base;

  return {
    ...(base || {
      id: seat.seatKey,
      name: seat.assignment.displayName,
      isGuest: seat.kind === 'guest',
      guestNumber: seat.assignment.guestNumber ?? undefined,
      isHost: seat.kind === 'host',
      hostFor: seat.assignment.hostFor ?? undefined,
      isSound: seat.kind === 'sound',
      isDuty: seat.kind === 'duty',
      role: seat.assignment.role ?? undefined,
    }),
    attendanceStatus: seat.assignment.status,
  };
}

export async function loadSeatingEditorState(weekId: string) {
  const seatMap = await findLatestSeatMapByWeekId(weekId);

  if (!seatMap) {
    if (weekId === CURRENT_MEETING_WEEK.id) {
      return {
        week: CURRENT_MEETING_WEEK,
        layout: CURRENT_SEATING_LAYOUT,
        heroes: CURRENT_SEATING_HEROES,
        memberRoster: CURRENT_SEATING_MEMBER_ROSTER,
        industryChains: [] as IndustryChain[],
        updatedAt: undefined as string | undefined,
        loadedFrom: 'seed' as const,
      };
    }
    return null;
  }

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
    industryChains: Array.isArray(dto.seatMap.industryChains) ? (dto.seatMap.industryChains as IndustryChain[]) : [],
    updatedAt: seatMap.updatedAt.toISOString(),
    loadedFrom: 'database' as const,
  };
}

/** The saved seat map of one event in the shape the print view and the AI API use. */
export async function loadSeatingWorkspaceState(weekId: string): Promise<SeatingWorkspaceState | null> {
  const state = await loadSeatingEditorState(weekId);
  if (!state || state.loadedFrom !== 'database') return null;
  return {
    week: state.week,
    topRoles: state.layout.topRoles,
    items: state.layout.mainGrid.flat(),
    memberRoster: state.memberRoster,
    heroes: state.heroes,
    industryChains: state.industryChains,
    updatedAt: state.updatedAt ?? new Date().toISOString(),
  };
}
