'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/auth';
import { getGoogleIdentity, getLineIdentity } from '@/server/auth/access';
import { fail, isObjectId, text, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import { bindLineAccount } from '@/server/tbx/member-identity';
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
  if ((await getGoogleIdentity()) || (await getLineIdentity())) {
    await signOut({ redirectTo: '/login' });
  }
  redirect('/login');
}

export async function lineSignInAction(formData: FormData) {
  await signIn('line', { redirectTo: `/login?via=line&next=${encodeURIComponent(safeNext(text(formData, 'next')))}` });
}

/** First LINE login: the member picks their own name. The LINE id comes from the session, never the form. */
export async function bindLineAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const next = safeNext(text(formData, 'next'));
  try {
    const line = await getLineIdentity();
    if (!line) throw new Error('LINE 登入已過期，請重新用 LINE 登入。');
    const memberId = text(formData, 'memberId');
    if (!isObjectId(memberId)) throw new Error('請先選擇你的姓名。');
    const member = await bindLineAccount({ subject: line.subject, lineName: line.name, memberId });
    await logOperation({
      actorRole: 'member',
      actorName: member.displayName,
      action: 'member_line_bound',
      targetType: 'Member',
      targetId: member.id,
      metadata: { lineName: line.name },
    });
  } catch (error) {
    return fail(error);
  }
  redirect(next);
}
