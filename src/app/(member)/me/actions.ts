'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/server/db/prisma';
import { fail, ok, text, type ActionState } from '@/server/tbx/action';
import { selfCheckIn } from '@/server/tbx/check-in-service';
import { getEventByKey, isEventToday } from '@/server/tbx/events';
import { ensureParticipations } from '@/server/tbx/participation';
import { requireMember } from '@/server/tbx/viewer';

/** The signed-in member checks themself in. The member id never comes from the form. */
export async function memberCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const [viewer, event] = await Promise.all([requireMember(), getEventByKey(text(formData, 'eventKey'))]);
    if (!event) throw new Error('找不到這場活動。');
    if (!isEventToday(event)) throw new Error('活動當天才能簽到。');

    const synced = await ensureParticipations(event.id);
    const key = `m:${viewer.member.id}`;
    const row =
      synced.rows.find((item) => item.key === key) ??
      (await prisma.participation.findUnique({ where: { sessionId_key: { sessionId: event.id, key } } }));
    if (!row) throw new Error('找不到你在這場活動的紀錄，請找幹部協助。');

    const result = await selfCheckIn({ event, row, method: 'self' });
    if (result.status === 'already') return ok('你已經簽到過了。');
    if (result.status === 'unavailable') throw new Error('你已登記請假或代理。本人到場請先到「活動」改回會出席。');
    revalidatePath('/me', 'layout');
    return ok(result.status === 'checked_in' && result.late ? '簽到完成（遲到）。' : '簽到完成。');
  } catch (error) {
    return fail(error);
  }
}
