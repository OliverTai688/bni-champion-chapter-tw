export interface PublicWeeklyEventDTO {
  slug: string;
  weekId: string;
  title: string;
  chapterName: string;
  meetingLabel: string;
  date: string;
  status: string;
  publicStatus: string;
  seatSummary: {
    totalSeats: number;
    occupiedSeats: number;
    emptySeats: number;
    assignedCount: number;
    checkedInCount: number;
    capacity: number;
  };
  occupancyByZone: Array<{
    zone: string;
    capacity: number;
    occupiedSeats: number;
    checkedInCount: number;
  }>;
  seatMap: {
    columns: number;
    seats: PublicSeatDTO[];
  };
  polls: PublicPollDTO[];
  updatedAt: string;
}

export interface PublicSeatDTO {
  id: string;
  seatKey: string;
  row: number | null;
  col: number | null;
  zone: string;
  position: number;
  kind: string;
  label: string | null;
  occupantName: string | null;
  role: string | null;
  attendanceStatus: string | null;
  pollOptionId: string | null;
}

export interface PublicPollDTO {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  eligibility: string;
  resultVisibility: string;
  opensAt: string | null;
  closesAt: string | null;
  options: Array<{
    id: string;
    label: string;
    publicDescription: string | null;
    seatId: string | null;
  }>;
  results: Array<{
    optionId: string;
    label: string;
    count: number;
  }> | null;
}
