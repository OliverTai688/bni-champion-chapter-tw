import { hasLeaderAccess } from '@/server/auth/access';
import { toAdminSeatingWorkspaceDTO, toPublicSeatMapSummaryDTO } from '@/application/seating/mappers';
import { normalizeSaveSeatingDraftRequest } from '@/application/seating/save-draft';
import { findLatestSeatMapByWeekId, saveSeatingDraft } from '@/server/repositories/seating-workspace-repository';

function unauthorized() {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Google sign-in or admin access is required for this operation.',
    },
    { status: 401 },
  );
}

async function hasAdminAccess() {
  return hasLeaderAccess();
}

export async function GET(request: Request, context: RouteContext<'/api/seats/[weekId]'>) {
  const { weekId } = await context.params;
  // Names and seats of unpublished events are not public; the public pages read /e/<key>.
  if (!(await hasAdminAccess())) return unauthorized();
  const view = new URL(request.url).searchParams.get('view') === 'public' ? 'public' : 'admin';

  const seatMap = await findLatestSeatMapByWeekId(weekId);
  if (!seatMap) {
    return Response.json(
      {
        error: 'seat_map_not_found',
        message: `No persisted seat map found for weekId ${weekId}.`,
      },
      { status: 404 },
    );
  }

  return Response.json(view === 'admin'
    ? toAdminSeatingWorkspaceDTO(seatMap)
    : toPublicSeatMapSummaryDTO(seatMap));
}

export async function PATCH(request: Request, context: RouteContext<'/api/seats/[weekId]'>) {
  const { weekId } = await context.params;
  if (!(await hasAdminAccess())) return unauthorized();

  try {
    const draft = normalizeSaveSeatingDraftRequest(await request.json());
    if (draft.week.id !== weekId) {
      return Response.json(
        {
          error: 'week_id_mismatch',
          message: `Route weekId ${weekId} does not match body weekId ${draft.week.id}.`,
        },
        { status: 400 },
      );
    }

    const result = await saveSeatingDraft(draft);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      {
        error: 'invalid_seating_draft',
        message: error instanceof Error ? error.message : 'Unable to save seating draft.',
      },
      { status: 400 },
    );
  }
}
