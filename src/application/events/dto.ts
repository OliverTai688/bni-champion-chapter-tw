export interface PublicWeeklyEventDTO {
  slug: string;
  weekId: string;
  title: string;
  chapterName: string;
  meetingLabel: string;
  date: string;
  status: string;
  publicStatus: string;
  // When true this event runs as a guest-headcount registration page: each
  // checked-in seat carries a party size and the public summary shows a total.
  registrationMode: boolean;
  seatSummary: {
    totalSeats: number;
    occupiedSeats: number;
    emptySeats: number;
    assignedCount: number;
    checkedInCount: number;
    capacity: number;
    // Sum of party sizes (本人 + 朋友) across checked-in seats only.
    totalHeadcount: number;
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
  // Party size for this seat (本人 + 朋友); always >= 1, only meaningful when checked in.
  headcount: number;
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
