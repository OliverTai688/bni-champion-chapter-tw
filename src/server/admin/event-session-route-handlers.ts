import 'server-only';

import { hasLeaderAccess } from '@/server/auth/access';
import {
  createAdminEventSessionFromCurrentTemplate,
  listAdminEventSessions,
} from '@/server/repositories/admin-event-sessions-repository';

async function hasAdminAccess() {
  return hasLeaderAccess();
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
