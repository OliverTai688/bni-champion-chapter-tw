import type { MeetingWeek, SeatingLayout, SeatingWorkspaceState } from '@/types/seating';
import { DEFAULT_INDUSTRY_CHAINS } from '@/lib/industry-chains';
import { LAYOUT_0611, ROSTER_0611 } from '@/lib/layout-0611';

export const CURRENT_MEETING_WEEK: MeetingWeek = {
  id: '2026-06-11',
  date: '2026-06-11',
  title: '115/06/11 座位表',
  chapterName: 'BNI 長冠軍分會',
  meetingLabel: '每週例會排座',
  source: 'seed',
};

export const CURRENT_SEATING_LAYOUT: SeatingLayout = LAYOUT_0611;
export const CURRENT_SEATING_HEROES = ROSTER_0611.heroes;
export const CURRENT_SEATING_MEMBER_ROSTER = ROSTER_0611.members;

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
