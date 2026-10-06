'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';
import { getGoogleIdentity } from '@/server/auth/access';
import { fail, text, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import { redeemMemberLoginLink } from '@/server/tbx/member-login';
import { MEMBER_COOKIE, MEMBER_COOKIE_MAX_AGE, createMemberToken } from '@/server/tbx/viewer';

function safeNext(value: string) {
  // Only same-site paths, never an absolute or protocol-relative URL.
  return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/me';
}

export async function googleSignInAction(formData: FormData) {
  await signIn('google', { redirectTo: safeNext(text(formData, 'next')) });
}

/** Second step of a login link: the member presses the button, so link previews cannot use it up. */
export async function redeemLoginLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const next = safeNext(text(formData, 'next'));
  try {
    const member = await redeemMemberLoginLink(text(formData, 'token'));
    const cookieStore = await cookies();
    cookieStore.set(MEMBER_COOKIE, createMemberToken(member.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MEMBER_COOKIE_MAX_AGE,
    });
    await logOperation({
      actorRole: 'member',
      actorName: member.displayName,
      action: 'member_login_link_used',
      targetType: 'Member',
      targetId: member.id,
    });
  } catch (error) {
    return fail(error);
  }
  redirect(next);
}

export async function clearMemberAction() {
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  if (await getGoogleIdentity()) {
    await signOut({ redirectTo: '/login' });
  }
  redirect('/login');
}
