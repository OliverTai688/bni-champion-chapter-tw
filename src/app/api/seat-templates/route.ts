import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from '@/server/admin/admin-access';
import { createSeatTemplateFromEvent, listSeatTemplates } from '@/server/repositories/admin-event-sessions-repository';

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
      message: 'Google sign-in or admin access is required for seat templates.',
    },
    { status: 401 },
  );
}

export async function GET() {
  if (!(await hasWriteAccess())) return unauthorized();
  return Response.json({ templates: await listSeatTemplates() });
}

export async function POST(request: Request) {
  if (!(await hasWriteAccess())) return unauthorized();

  try {
    const body = await request.json().catch(() => null);
    const template = await createSeatTemplateFromEvent({
      sourceWeekId: typeof body?.sourceWeekId === 'string' ? body.sourceWeekId : '',
      name: typeof body?.name === 'string' ? body.name : '',
      description: typeof body?.description === 'string' ? body.description : undefined,
    });

    return Response.json({ ok: true, template });
  } catch (error) {
    return Response.json(
      {
        error: 'invalid_seat_template',
        message: error instanceof Error ? error.message : 'Unable to save seat template.',
      },
      { status: 400 },
    );
  }
}
