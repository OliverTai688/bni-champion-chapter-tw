'use server';

import { revalidatePath } from 'next/cache';
import { taipeiDateKey } from '@/lib/tbx/labels';
import { fail, ok, text, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import {
  createRoleTerm,
  deleteRoleTerm,
  endRoleTermToday,
  parseRoleTermForm,
  updateRoleTerm,
} from '@/server/tbx/member-admin';
import { requireLeader } from '@/server/tbx/viewer';

function revalidateRoles(memberId: string) {
  revalidatePath('/console/settings/roles');
  revalidatePath('/console/members');
  revalidatePath(`/console/members/${memberId}`);
}

function termMetadata(term: { role: string; startsAt: Date; endsAt: Date | null }, memberName: string) {
  return {
    memberName,
    role: term.role,
    startsOn: taipeiDateKey(term.startsAt),
    endsOn: term.endsAt ? taipeiDateKey(term.endsAt) : null,
  };
}

export async function createRoleTermAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { term, memberName } = await createRoleTerm(parseRoleTermForm(formData));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'role_term_created',
      targetType: 'RoleTerm',
      targetId: term.id,
      metadata: termMetadata(term, memberName),
    });
    revalidateRoles(term.memberId);
    return ok(`已新增 ${memberName} 的「${term.role}」任期`);
  } catch (error) {
    return fail(error);
  }
}

export async function updateRoleTermAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { term, memberName } = await updateRoleTerm(text(formData, 'termId'), parseRoleTermForm(formData));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'role_term_updated',
      targetType: 'RoleTerm',
      targetId: term.id,
      metadata: termMetadata(term, memberName),
    });
    revalidateRoles(term.memberId);
    return ok(`已儲存 ${memberName} 的「${term.role}」任期`);
  } catch (error) {
    return fail(error);
  }
}

export async function endRoleTermAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { term, memberName } = await endRoleTermToday(text(formData, 'termId'));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'role_term_ended',
      targetType: 'RoleTerm',
      targetId: term.id,
      metadata: termMetadata(term, memberName),
    });
    revalidateRoles(term.memberId);
    return ok(`已結束 ${memberName} 的「${term.role}」任期`);
  } catch (error) {
    return fail(error);
  }
}

export async function deleteRoleTermAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { term, memberName } = await deleteRoleTerm(text(formData, 'termId'));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'role_term_deleted',
      targetType: 'RoleTerm',
      targetId: term.id,
      metadata: termMetadata(term, memberName),
    });
    revalidateRoles(term.memberId);
    return ok(`已刪除 ${memberName} 的「${term.role}」任期`);
  } catch (error) {
    return fail(error);
  }
}
