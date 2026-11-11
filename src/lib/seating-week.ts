import type { MeetingWeek, SeatingLayout, SeatingWorkspaceState } from '@/types/seating';
import { DEFAULT_INDUSTRY_CHAINS } from '@/lib/industry-chains';
import { LAYOUT_1112, ROSTER_1112 } from '@/lib/layout-1112';

export const CURRENT_MEETING_WEEK: MeetingWeek = {
  id: '2026-11-12',
  date: '2026-11-12',
  title: '115/11/12 座位表',
  chapterName: 'BNI 長冠軍分會',
  meetingLabel: '每週例會排座',
  source: 'seed',
};

export const CURRENT_SEATING_LAYOUT: SeatingLayout = LAYOUT_1112;
export const CURRENT_SEATING_HEROES = ROSTER_1112.heroes;
export const CURRENT_SEATING_MEMBER_ROSTER = ROSTER_1112.members;

export function createWorkspaceState(
  week: MeetingWeek,
  layout: SeatingLayout,
  heroes: string[],
  memberRoster = CURRENT_SEATING_MEMBER_ROSTER,
): SeatingWorkspaceState {
  return {
    week,
    topRoles: layout.topRoles,
    items: layout.mainGrid.flat(),
    memberRoster,
    heroes,
    industryChains: DEFAULT_INDUSTRY_CHAINS,
    updatedAt: new Date().toISOString(),
  };
}

export function getDefaultWorkspaceState(): SeatingWorkspaceState {
  return createWorkspaceState(CURRENT_MEETING_WEEK, CURRENT_SEATING_LAYOUT, CURRENT_SEATING_HEROES);
}
