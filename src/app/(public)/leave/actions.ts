'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/prisma';
import { fail, isObjectId, ok, optionalText, text, type ActionState } from '@/server/tbx/action';
import { ensureWeeklyEvent, getEventByKey } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { registerIntent, type IntentChoice } from '@/server/tbx/participation';
import { getViewer } from '@/server/tbx/viewer';

const CHOICES: IntentChoice[] = ['present', 'absent', 'substitute'];

/**
 * Public leave / substitute registration. A signed-in member can only register
 * for themself; without an identity the form's member is used (same trust level
 * as the old /pre-leave page).
 */
export async function registerLeaveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await getViewer();
    const choice = text(formData, 'choice') as IntentChoice;
    if (!CHOICES.includes(choice)) throw new Error('請選擇會出席、找代理或請假。');

    const memberId = viewer.member?.id ?? text(formData, 'memberId');
    if (!isObjectId(memberId)) throw new Error('請選擇你的姓名。');
    const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, displayName: true, category: true, isActive: true } });
    if (!member || member.category !== 'member' || !member.isActive) throw new Error('找不到這位會員。');

    const eventKey = text(formData, 'eventKey');
    const event = /^\d{4}-\d{2}-\d{2}$/.test(eventKey) ? await ensureWeeklyEvent(eventKey) : await getEventByKey(eventKey);
    if (!event) throw new Error('找不到這場活動。');
    if (event.status === 'archived' || event.status === 'canceled') throw new Error('這場活動已經結束或取消。');

    const substituteName = optionalText(formData, 'substituteName');
    await registerIntent({ sessionId: event.id, memberId: member.id, choice, substituteName, source: viewer.member ? 'member' : 'leave_form' });
    await logOperation({
      sessionId: event.id,
      actorRole: 'member',
      actorName: member.displayName,
      action: `intent_${choice}`,
      targetType: 'Participation',
      metadata: { substituteName },
    });

    revalidatePath('/me', 'layout');
    revalidatePath(`/console/events/${event.weekId}`, 'layout');
    const label = choice === 'present' ? '會出席' : choice === 'absent' ? '請假' : `由 ${substituteName} 代理`;
    return ok(`已登記：${event.title} ${label}。幹部的出席表會直接看到。`);
  } catch (error) {
    return fail(error);
  }
}
