import type {
  IndustryChain,
  MeetingWeek,
  SeatData,
  SeatingValidationSummary,
  SeatingWorkspaceState,
} from '@/types/seating';

export interface SaveSeatingDraftRequest {
  workspace: SeatingWorkspaceState;
  validationSummary?: SeatingValidationSummary;
  reason?: string;
}

export interface NormalizedSeatingDraft {
  week: MeetingWeek;
  topRoles: SeatData[];
  items: (SeatData | null)[];
  memberRoster: string[];
  heroes: string[];
  industryChains: IndustryChain[];
  updatedAt: string;
  validationSummary?: SeatingValidationSummary;
  reason: string;
}

export function normalizeSaveSeatingDraftRequest(body: unknown): NormalizedSeatingDraft {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object.');
  }

  const request = body as Partial<SaveSeatingDraftRequest>;
  const workspace = request.workspace;

  if (!workspace?.week?.id) {
    throw new Error('workspace.week.id is required.');
  }
  if (!Array.isArray(workspace.topRoles)) {
    throw new Error('workspace.topRoles must be an array.');
  }
  if (!Array.isArray(workspace.items)) {
    throw new Error('workspace.items must be an array.');
  }

  return {
    week: workspace.week,
    topRoles: workspace.topRoles,
    items: workspace.items,
    memberRoster: Array.isArray(workspace.memberRoster) ? workspace.memberRoster : [],
    heroes: Array.isArray(workspace.heroes) ? workspace.heroes : [],
    industryChains: Array.isArray(workspace.industryChains) ? workspace.industryChains : [],
    updatedAt: workspace.updatedAt ?? new Date().toISOString(),
    validationSummary: request.validationSummary,
    reason: request.reason?.trim() || 'Saved from seating workspace.',
  };
}
