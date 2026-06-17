import 'server-only';

import { cookies } from 'next/headers';
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from '@/server/admin/admin-access';
import {
  createAdminEventSessionFromCurrentTemplate,
  listAdminEventSessions,
} from '@/server/repositories/admin-event-sessions-repository';

async function hasAdminAccess() {
  const cookieStore = await cookies();
  return verifyAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value);
}

function unauthorized() {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Admin password is required for event management.',
    },
    { status: 401 },
  );
}

export async function handleAdminEventSessionsGET() {
  if (!await hasAdminAccess()) return unauthorized();
  return Response.json({ sessions: await listAdminEventSessions() });
}

export async function handleAdminEventSessionsPOST(request: Request) {
  if (!await hasAdminAccess()) return unauthorized();

  try {
    const body = await request.json().catch(() => null);
    const date = typeof body?.date === 'string' ? body.date : '';
    const title = typeof body?.title === 'string' ? body.title : undefined;
    const meetingLabel = typeof body?.meetingLabel === 'string' ? body.meetingLabel : undefined;
    const result = await createAdminEventSessionFromCurrentTemplate({ date, title, meetingLabel });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      {
        error: 'invalid_event_session',
        message: error instanceof Error ? error.message : 'Unable to create event session.',
      },
      { status: 400 },
    );
  }
}
