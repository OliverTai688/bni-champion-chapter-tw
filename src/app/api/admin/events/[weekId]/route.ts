import { getLeaderAccess } from '@/server/auth/access';
import { normalizePublishAction } from '@/application/events/publication';
import { getEventPublicationByWeekId, updateEventPublication } from '@/server/repositories/event-publication-repository';

function unauthorized() {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Google sign-in is required for admin event publication.',
    },
    { status: 401 },
  );
}

export async function GET(_request: Request, context: RouteContext<'/api/admin/events/[weekId]'>) {
  const access = await getLeaderAccess();
  if (!access) return unauthorized();

  const { weekId } = await context.params;
  const publication = await getEventPublicationByWeekId(weekId);
  if (!publication) {
    return Response.json(
      {
        error: 'event_not_found',
        message: `No meeting session found for weekId ${weekId}.`,
      },
      { status: 404 },
    );
  }

  return Response.json(publication);
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/events/[weekId]'>) {
  const access = await getLeaderAccess();
  if (!access) return unauthorized();

  const { weekId } = await context.params;

  try {
    const body = await request.json();
    const action = normalizePublishAction(body?.action);
    const publication = await updateEventPublication(weekId, action, access.name);
    if (!publication) {
      return Response.json(
        {
          error: 'event_not_found',
          message: `No meeting session found for weekId ${weekId}.`,
        },
        { status: 404 },
      );
    }

    return Response.json(publication);
  } catch (error) {
    return Response.json(
      {
        error: 'invalid_publication_action',
        message: error instanceof Error ? error.message : 'Unable to update publication.',
      },
      { status: 400 },
    );
  }
}
