import { auth } from '@/auth';
import { toAdminSeatingWorkspaceDTO, toPublicSeatMapSummaryDTO } from '@/application/seating/mappers';
import { normalizeSaveSeatingDraftRequest } from '@/application/seating/save-draft';
import { findLatestSeatMapByWeekId, saveSeatingDraft } from '@/server/repositories/seating-workspace-repository';

function unauthorized() {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Google sign-in is required for this operation.',
    },
    { status: 401 },
  );
}

export async function GET(request: Request, context: RouteContext<'/api/seats/[weekId]'>) {
  const { weekId } = await context.params;
  const url = new URL(request.url);
  const view = url.searchParams.get('view') === 'admin' ? 'admin' : 'public';

  if (view === 'admin') {
    const session = await auth();
    if (!session?.user) return unauthorized();
  }

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
  const session = await auth();
  if (!session?.user) return unauthorized();

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
