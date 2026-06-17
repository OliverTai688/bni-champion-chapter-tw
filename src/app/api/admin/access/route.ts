import { cookies } from 'next/headers';
import { ADMIN_ACCESS_COOKIE, createAdminAccessToken, verifyAdminPassword } from '@/server/admin/admin-access';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!verifyAdminPassword(password)) {
    return Response.json(
      {
        error: 'invalid_admin_password',
        message: 'Admin password is incorrect.',
      },
      { status: 401 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_ACCESS_COOKIE, createAdminAccessToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_ACCESS_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return Response.json({ ok: true });
}
