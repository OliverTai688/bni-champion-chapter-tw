import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from '@/server/admin/admin-access';
import { createEventSeatMap, listAdminEventSessions, listSeatTemplates } from '@/server/repositories/admin-event-sessions-repository';
import type { SeatMapSourceKind } from '@/server/repositories/admin-event-sessions-repository';

async function hasWriteAccess() {
  const session = await auth();
  if (session?.user) return true;

  const cookieStore = await cookies();
  return verifyAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value);
}

function unauthorized() {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Google sign-in or admin access is required for this operation.',
    },
    { status: 401 },
  );
}

function sourceKind(value: unknown): SeatMapSourceKind {
  if (value === 'base_template' || value === 'latest_event' || value === 'selected_event' || value === 'named_template') return value;
  return 'latest_event';
}

export async function GET() {
  if (!(await hasWriteAccess())) return unauthorized();
  return Response.json({
    sessions: await listAdminEventSessions(),
    templates: await listSeatTemplates(),
  });
}

export async function POST(request: Request) {
  if (!(await hasWriteAccess())) return unauthorized();

  try {
    const body = await request.json().catch(() => null);
    const result = await createEventSeatMap({
      targetDate: typeof body?.targetDate === 'string' ? body.targetDate : '',
      targetTitle: typeof body?.targetTitle === 'string' ? body.targetTitle : undefined,
      meetingLabel: typeof body?.meetingLabel === 'string' ? body.meetingLabel : undefined,
      sourceKind: sourceKind(body?.sourceKind),
      sourceWeekId: typeof body?.sourceWeekId === 'string' ? body.sourceWeekId : undefined,
      sourceTemplateId: typeof body?.sourceTemplateId === 'string' ? body.sourceTemplateId : undefined,
      confirmOverwrite: body?.confirmOverwrite === true,
      registrationMode: body?.registrationMode === true,
    });

    if (result.conflict) {
      return Response.json(
        {
          error: 'event_date_exists',
          message: 'This event date already exists. Confirm overwrite to create a new version.',
          existing: result.existing,
        },
        { status: 409 },
      );
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      {
        error: 'invalid_event_seat_map',
        message: error instanceof Error ? error.message : 'Unable to create event seat map.',
      },
      { status: 400 },
    );
  }
}
