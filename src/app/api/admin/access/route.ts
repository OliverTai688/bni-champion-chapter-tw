import { cookies } from 'next/headers';
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_ACCESS_TTL_SECONDS,
  createAdminAccessToken,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from '@/server/admin/admin-access';

const FAILURE_DELAY_MS = 800;

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return Response.json(
      { error: 'admin_password_not_configured', message: '後台密碼尚未設定，請改用 Google 登入。' },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!verifyAdminPassword(password)) {
    // Slows down guessing without needing shared state.
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
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
    maxAge: ADMIN_ACCESS_TTL_SECONDS,
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
