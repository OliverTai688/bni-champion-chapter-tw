'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { fail, isObjectId, ok, text, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import {
  createMember,
  parseMemberProfileForm,
  setMemberActive,
  setMemberCategory,
  updateMember,
} from '@/server/tbx/member-admin';
import { setMemberMentor } from '@/server/tbx/meeting-roles';
import { unbindLineAccount } from '@/server/tbx/member-identity';
import { LOGIN_LINK_TTL_DAYS, issueMemberLoginLink } from '@/server/tbx/member-login';
import { syncMemberDirectory } from '@/server/tbx/members';
import { requireLeader } from '@/server/tbx/viewer';

function revalidateMembers(memberId?: string) {
  revalidatePath('/console/members');
  if (memberId) revalidatePath(`/console/members/${memberId}`);
  // Role terms list member names and status.
  revalidatePath('/console/settings/roles');
}

export async function createMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const member = await createMember(parseMemberProfileForm(formData));
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'member_created',
      targetType: 'Member',
      targetId: member.id,
      metadata: { displayName: member.displayName },
    });
    revalidateMembers();
    return ok(`已新增會員「${member.displayName}」`);
  } catch (error) {
    return fail(error);
  }
}

export async function updateMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const memberId = text(formData, 'memberId');
    const { member, changed, previousName } = await updateMember(memberId, parseMemberProfileForm(formData));
    if (changed.length > 0) {
      await logOperation({
        actorRole: 'admin',
        actorName: viewer.leaderName,
        action: 'member_updated',
        targetType: 'Member',
        targetId: member.id,
        // Field names only: phone and email values stay out of the log.
        metadata: {
          displayName: member.displayName,
          changed,
          ...(previousName !== member.displayName ? { previousName } : {}),
        },
      });
    }
    revalidateMembers(member.id);
    return ok(changed.length > 0 ? `已儲存「${member.displayName}」的資料` : '資料沒有變動');
  } catch (error) {
    return fail(error);
  }
}

export async function setMemberActiveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const memberId = text(formData, 'memberId');
    const isActive = text(formData, 'active') === '1';
    const { member, activeTerms } = await setMemberActive(memberId, isActive);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: isActive ? 'member_restored' : 'member_deactivated',
      targetType: 'Member',
      targetId: member.id,
      metadata: { displayName: member.displayName },
    });
    revalidateMembers(member.id);
    if (isActive) return ok(`已恢復「${member.displayName}」`);
    return ok(
      activeTerms > 0
        ? `已停用「${member.displayName}」。這位會員還有 ${activeTerms} 個現任職位，記得到「設定 › 職位與任期」結束任期。`
        : `已停用「${member.displayName}」`,
    );
  } catch (error) {
    return fail(error);
  }
}

export async function setMemberCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const memberId = text(formData, 'memberId');
    const category = text(formData, 'category');
    if (category !== 'member' && category !== 'guest') throw new Error('分類不正確，請重新整理後再試。');
    const member = await setMemberCategory(memberId, category);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: category === 'member' ? 'member_categorized_member' : 'member_categorized_guest',
      targetType: 'Member',
      targetId: member.id,
      metadata: { displayName: member.displayName, category },
    });
    revalidateMembers(member.id);
    return ok(category === 'member' ? `已把「${member.displayName}」設為會員` : `已把「${member.displayName}」標記為非會員`);
  } catch (error) {
    return fail(error);
  }
}

/** Sets or clears a member's mentor; a member with a mentor is shown as 新會員 on seat plans. */
export async function setMemberMentorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const memberId = text(formData, 'memberId');
    if (!isObjectId(memberId)) throw new Error('會員編號不正確，請重新整理名冊後再試。');
    const mentorValue = text(formData, 'mentorId');
    if (mentorValue && !isObjectId(mentorValue)) throw new Error('導師編號不正確，請重新選擇。');
    const result = await setMemberMentor(memberId, mentorValue || null);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: result.mentorName ? 'member_mentor_set' : 'member_mentor_cleared',
      targetType: 'Member',
      targetId: memberId,
      metadata: { displayName: result.displayName, mentorName: result.mentorName },
    });
    revalidateMembers(memberId);
    revalidatePath('/console/events', 'layout');
    return ok(result.mentorName ? `已把 ${result.mentorName} 設為 ${result.displayName} 的導師` : `已取消 ${result.displayName} 的新會員標示`);
  } catch (error) {
    return fail(error);
  }
}

export async function syncMemberDirectoryAction(): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const { created, updated, deactivated } = await syncMemberDirectory();
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'member_directory_synced',
      targetType: 'Member',
      metadata: { created, updated, deactivated },
    });
    revalidateMembers();
    if (created === 0 && updated === 0 && deactivated === 0) {
      return ok('同步完成，名冊已經是最新的，沒有需要新增或更新的會員。');
    }
    return ok(`同步完成：新增 ${created} 位、更新 ${updated} 位${deactivated > 0 ? `、標記離會 ${deactivated} 位` : ''}。`);
  } catch (error) {
    return fail(error);
  }
}

export type LoginLinkState = { ok: boolean; message: string; link?: string } | null;

/** Leaders hand this link to a member who has no Google e-mail on file. Shown once. */
export async function issueLoginLinkAction(_prev: LoginLinkState, formData: FormData): Promise<LoginLinkState> {
  try {
    const viewer = await requireLeader();
    const memberId = text(formData, 'memberId');
    if (!isObjectId(memberId)) throw new Error('找不到這位會員。');
    const { token, displayName } = await issueMemberLoginLink(memberId, viewer.leaderName);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'member_login_link_issued',
      targetType: 'Member',
      targetId: memberId,
      metadata: { displayName },
    });
    const headerStore = await headers();
    const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost:3000';
    const proto = headerStore.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    return {
      ok: true,
      message: `已產生 ${displayName} 的登入連結，${LOGIN_LINK_TTL_DAYS} 天內有效，只能用一次。舊的連結已失效。`,
      link: `${proto}://${host}/login/link?t=${token}`,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function unbindLineAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const memberId = text(formData, 'memberId');
    if (!isObjectId(memberId)) throw new Error('找不到這位會員。');
    await unbindLineAccount(memberId);
    await logOperation({
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'member_line_unbound',
      targetType: 'Member',
      targetId: memberId,
    });
    revalidateMembers(memberId);
    return ok('已解除 LINE 綁定。本人下次用 LINE 登入時可以重新綁定。');
  } catch (error) {
    return fail(error);
  }
}
