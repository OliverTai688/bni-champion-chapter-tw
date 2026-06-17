export interface PublicSeatMapSummaryDTO {
  weekId: string;
  title: string;
  chapterName: string;
  meetingLabel: string;
  date: string;
  status: string;
  seatMap: {
    id: string;
    title: string;
    status: string;
    layoutKind: string;
    version: number;
  };
  summary: {
    totalSeats: number;
    occupiedSeats: number;
    emptySeats: number;
    assignedCount: number;
    checkedInCount: number;
    guestCount: number;
    memberCount: number;
    proxyCount: number;
    hostTeamCount: number;
  };
  zones: Array<{
    zone: string;
    totalSeats: number;
    occupiedSeats: number;
  }>;
  updatedAt: string;
}

export interface AdminSeatingWorkspaceDTO extends PublicSeatMapSummaryDTO {
  seatMap: PublicSeatMapSummaryDTO['seatMap'] & {
    topRoles: unknown;
    memberRoster: string[];
    heroes: string[];
    industryChains: unknown;
  };
  seats: Array<{
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
    assignment: {
      id: string;
      displayName: string;
      role: string | null;
      guestNumber: string | null;
      hostFor: string | null;
      status: string;
      memberId: string | null;
    } | null;
  }>;
  revisions: Array<{
    id: string;
    version: number;
    reason: string | null;
    createdBy: string | null;
    createdAt: string;
  }>;
}
