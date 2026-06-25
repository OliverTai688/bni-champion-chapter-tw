import { toPublicWeeklyEventDTO } from '@/application/events/mappers';
import { updatePublicSeatAttendance } from '@/server/repositories/weekly-public-event-repository';

export async function PATCH(request: Request, context: RouteContext<'/api/public/events/[slug]/attendance'>) {
  const { slug } = await context.params;
  const body = await request.json().catch(() => null);
  const seatId = typeof body?.seatId === 'string' ? body.seatId : '';
  const checkedIn = body?.checkedIn === true;
  const headcount = typeof body?.headcount === 'number' ? body.headcount : undefined;

  try {
    const event = await updatePublicSeatAttendance({ slug, seatId, checkedIn, headcount });
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
  } catch (error) {
    return Response.json(
      {
        error: 'attendance_update_failed',
        message: error instanceof Error ? error.message : 'Unable to update attendance.',
      },
      { status: 400 },
    );
  }
}
