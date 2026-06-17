import { toPublicWeeklyEventDTO } from '@/application/events/mappers';
import { findPublicWeeklyEventBySlug } from '@/server/repositories/weekly-public-event-repository';

export async function GET(_request: Request, context: RouteContext<'/api/public/events/[slug]'>) {
  const { slug } = await context.params;
  const event = await findPublicWeeklyEventBySlug(slug);

  if (!event) {
    return Response.json(
      {
        error: 'public_event_not_found',
        message: 'This weekly public event is not published or does not exist.',
      },
      { status: 404 },
    );
  }

  return Response.json(toPublicWeeklyEventDTO(event));
}
