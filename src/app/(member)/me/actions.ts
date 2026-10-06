'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/prisma';
import { fail, ok, text, type ActionState } from '@/server/tbx/action';
import { getEventByKey, isEventToday, isPastStartTime } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { checkIn, ensureParticipations } from '@/server/tbx/participation';
import { requireMember } from '@/server/tbx/viewer';

/** The signed-in member checks themself in. The member id never comes from the form. */
export async function memberCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireMember();
    const event = await getEventByKey(text(formData, 'eventKey'));
    if (!event) throw new Error('找不到這場活動。');
    if (!isEventToday(event)) throw new Error('活動當天才能簽到。');

    await ensureParticipations(event.id);
    const row = await prisma.participation.findUnique({
      where: { sessionId_key: { sessionId: event.id, key: `m:${viewer.member.id}` } },
    });
    if (!row) throw new Error('找不到你在這場活動的紀錄，請找幹部協助。');
    if (row.status === 'present' || row.status === 'late') return ok('你已經簽到過了。');
    if (row.status !== 'expected') throw new Error('你已登記請假或代理。本人到場請先到「活動」改回會出席。');

    const late = isPastStartTime(event);
    await checkIn({ participationId: row.id, method: 'self', late });
    await logOperation({
      sessionId: event.id,
      actorRole: 'member',
      actorName: viewer.member.displayName,
      action: late ? 'self_check_in_late' : 'self_check_in',
      targetType: 'Participation',
      targetId: row.id,
    });
    revalidatePath('/me', 'layout');
    revalidatePath(`/console/events/${event.weekId}`, 'layout');
    return ok(late ? '簽到完成（遲到）。' : '簽到完成。');
  } catch (error) {
    return fail(error);
  }
}
