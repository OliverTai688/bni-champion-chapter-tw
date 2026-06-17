import 'server-only';

import { cookies } from 'next/headers';
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from '@/server/admin/admin-access';
import {
  closeAdminPoll,
  createStarPollForWeek,
  exportAdminPollCsv,
  listAdminPollsForWeek,
} from '@/server/repositories/live-poll-repository';

async function hasAdminAccess() {
  const cookieStore = await cookies();
  return verifyAdminAccessToken(cookieStore.get(ADMIN_ACCESS_COOKIE)?.value);
}

function unauthorized() {
  return Response.json(
    {
      error: 'unauthorized',
      message: 'Admin password is required for poll management.',
    },
    { status: 401 },
  );
}

export async function handleAdminPollsGET(weekId: string) {
  if (!await hasAdminAccess()) return unauthorized();

  return Response.json({ polls: await listAdminPollsForWeek(weekId) });
}

export async function handleAdminPollsPOST(request: Request, weekId: string) {
  if (!await hasAdminAccess()) return unauthorized();

  const body = await request.json().catch(() => null);
  const eligibility = body?.eligibility === 'public' ? 'public' : 'code_required';
  const result = await createStarPollForWeek(weekId, eligibility);

  if (!result) {
    return Response.json(
      {
        error: 'event_or_seat_map_not_found',
        message: 'Create or save a weekly seat map before opening a poll.',
      },
      { status: 404 },
    );
  }

  return Response.json(result);
}

export async function handleAdminPollPATCH(request: Request, weekId: string, pollId: string) {
  if (!await hasAdminAccess()) return unauthorized();

  const body = await request.json().catch(() => null);
  if (body?.status !== 'closed') {
    return Response.json(
      {
        error: 'unsupported_poll_update',
        message: 'Only closing a poll is supported right now.',
      },
      { status: 400 },
    );
  }

  const result = await closeAdminPoll(weekId, pollId);
  if (!result) {
    return Response.json(
      {
        error: 'poll_not_found',
        message: 'Poll was not found for this weekly event.',
      },
      { status: 404 },
    );
  }

  return Response.json({ poll: result });
}

export async function handleAdminPollExportGET(weekId: string, pollId: string) {
  if (!await hasAdminAccess()) return unauthorized();

  const result = await exportAdminPollCsv(weekId, pollId);
  if (!result) {
    return Response.json(
      {
        error: 'poll_not_found',
        message: 'Poll was not found for this weekly event.',
      },
      { status: 404 },
    );
  }

  return new Response(result.csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
    },
  });
}
