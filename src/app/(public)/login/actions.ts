'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/server/db/prisma';
import { fail, isObjectId, text, type ActionState } from '@/server/tbx/action';
import { MEMBER_COOKIE, createMemberToken } from '@/server/tbx/viewer';

function safeNext(value: string) {
  // Only same-site paths, never an absolute or protocol-relative URL.
  return value.startsWith('/') && !value.startsWith('//') ? value : '/me';
}

export async function chooseMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const next = safeNext(text(formData, 'next'));
  try {
    const memberId = text(formData, 'memberId');
    if (!isObjectId(memberId)) throw new Error('請先選擇你的姓名。');
    const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, isActive: true, category: true } });
    if (!member || !member.isActive || member.category !== 'member') throw new Error('找不到這位會員，請重新選擇。');

    const cookieStore = await cookies();
    cookieStore.set(MEMBER_COOKIE, createMemberToken(member.id), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
    });
  } catch (error) {
    return fail(error);
  }
  redirect(next);
}

export async function clearMemberAction() {
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
  redirect('/login');
}
