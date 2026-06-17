import type { SeatingWorkspaceState } from '@/types/seating';

const STORAGE_PREFIX = 'bni-long-champion:seating-workspace';

export function getSeatingStorageKey(weekId: string) {
  return `${STORAGE_PREFIX}:${weekId}`;
}

export interface SeatingWorkspaceRepository {
  load(weekId: string): SeatingWorkspaceState | null;
  save(state: SeatingWorkspaceState): void;
  clear(weekId: string): void;
}

export const localSeatingWorkspaceRepository: SeatingWorkspaceRepository = {
  load(weekId) {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(getSeatingStorageKey(weekId));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as SeatingWorkspaceState;
    } catch {
      return null;
    }
  },

  save(state) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      getSeatingStorageKey(state.week.id),
      JSON.stringify({ ...state, updatedAt: new Date().toISOString() }),
    );
  },

  clear(weekId) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(getSeatingStorageKey(weekId));
  },
};
