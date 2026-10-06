'use server';

import { revalidatePath } from 'next/cache';
import { fail, ok, type ActionState } from '@/server/tbx/action';
import { logOperation } from '@/server/tbx/log';
import { parseOwnProfileForm, updateOwnProfile } from '@/server/tbx/member-admin';
import { requireMember } from '@/server/tbx/viewer';

export async function updateMyProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    // The member id comes from the signed cookie only. Any id in the form is ignored.
    const viewer = await requireMember();
    const { changed } = await updateOwnProfile(viewer.member.id, parseOwnProfileForm(formData));
    if (changed.length === 0) return ok('資料沒有變動');

    await logOperation({
      actorRole: 'member',
      actorName: viewer.member.displayName,
      action: 'member_profile_updated',
      targetType: 'Member',
      targetId: viewer.member.id,
      // Field names only: phone and email values stay out of the log.
      metadata: { displayName: viewer.member.displayName, changed },
    });
    revalidatePath('/me/profile');
    revalidatePath('/console/members');
    revalidatePath(`/console/members/${viewer.member.id}`);
    return ok('已儲存你的商務檔案');
  } catch (error) {
    return fail(error);
  }
}
