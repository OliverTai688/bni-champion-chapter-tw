'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/server/db/prisma';
import { updateEventPublication } from '@/server/repositories/event-publication-repository';
import { fail, ok, optionalText, text, type ActionState } from '@/server/tbx/action';
import { buildEventKey, getEventByKey } from '@/server/tbx/events';
import { logOperation } from '@/server/tbx/log';
import { requireLeader } from '@/server/tbx/viewer';

const EVENT_TYPES = ['weekly_meeting', 'activity', 'training', 'social'];
const TYPE_LABEL: Record<string, string> = {
  weekly_meeting: '每週例會',
  activity: '活動',
  training: '培訓',
  social: '聯誼',
};

function readEventFields(formData: FormData) {
  const title = text(formData, 'title');
  const eventType = text(formData, 'eventType') || 'weekly_meeting';
  const startsAt = optionalText(formData, 'startsAt');
  if (!EVENT_TYPES.includes(eventType)) throw new Error('活動類型不正確。');
  if (startsAt && !/^\d{2}:\d{2}$/.test(startsAt)) throw new Error('開始時間請用 24 小時制，例如 07:00。');
  return { title, eventType, startsAt, location: optionalText(formData, 'location') };
}

export async function createEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let weekId = '';
  try {
    const viewer = await requireLeader();
    const date = text(formData, 'date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error('請選擇活動日期。');
    const fields = readEventFields(formData);

    const [year, month, day] = date.split('-');
    const title = fields.title || `${Number(year) - 1911}/${month}/${day} ${TYPE_LABEL[fields.eventType]}`;
    weekId = buildEventKey(date, title, fields.eventType);

    const existing = await prisma.meetingSession.findUnique({ where: { weekId }, select: { id: true } });
    if (existing) throw new Error(`${date} 已經有一場每週例會。請直接開啟那一場，或把類型改成其他活動。`);

    const created = await prisma.meetingSession.create({
      data: {
        weekId,
        date: new Date(`${date}T00:00:00.000Z`),
        title,
        chapterName: 'BNI 長冠軍分會',
        meetingLabel: TYPE_LABEL[fields.eventType],
        eventType: fields.eventType,
        location: fields.location,
        startsAt: fields.startsAt,
        source: 'console',
        status: 'scheduled',
        publicStatus: 'draft',
        publicSlug: `__draft__${weekId}`,
      },
    });
    await logOperation({
      sessionId: created.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'event_created',
      targetType: 'MeetingSession',
      targetId: created.id,
      metadata: { weekId, eventType: fields.eventType },
    });
    revalidatePath('/console/events');
  } catch (error) {
    return fail(error);
  }
  redirect(`/console/events/${encodeURIComponent(weekId)}`);
}

export async function updateEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await getEventByKey(text(formData, 'eventKey'));
    if (!event) throw new Error('找不到這場活動。');
    const fields = readEventFields(formData);
    if (!fields.title) throw new Error('請填寫活動名稱。');

    await prisma.meetingSession.update({
      where: { id: event.id },
      data: { title: fields.title, eventType: fields.eventType, location: fields.location, startsAt: fields.startsAt },
    });
    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: 'event_updated',
      targetType: 'MeetingSession',
      targetId: event.id,
    });
    revalidatePath('/console/events');
    revalidatePath(`/console/events/${event.weekId}`, 'layout');
    return ok('已更新活動');
  } catch (error) {
    return fail(error);
  }
}

/** Events are referenced by seats, votes and attendance, so they are archived instead of deleted. */
export async function setEventArchivedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await getEventByKey(text(formData, 'eventKey'));
    if (!event) throw new Error('找不到這場活動。');
    const archive = text(formData, 'archive') === '1';

    await prisma.meetingSession.update({
      where: { id: event.id },
      data: { status: archive ? 'archived' : 'scheduled' },
    });
    await logOperation({
      sessionId: event.id,
      actorRole: 'admin',
      actorName: viewer.leaderName,
      action: archive ? 'event_archived' : 'event_restored',
      targetType: 'MeetingSession',
      targetId: event.id,
    });
    revalidatePath('/console/events');
    return ok(archive ? '已封存活動' : '已還原活動');
  } catch (error) {
    return fail(error);
  }
}

export async function setEventPublishedAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const viewer = await requireLeader();
    const event = await getEventByKey(text(formData, 'eventKey'));
    if (!event) throw new Error('找不到這場活動。');
    const publish = text(formData, 'publish') === '1';

    await updateEventPublication(event.weekId, publish ? 'publish' : 'hide', viewer.leaderName ?? '領導團隊');
    revalidatePath(`/console/events/${event.weekId}`, 'layout');
    revalidatePath('/console/events');
    return ok(publish ? '已發布，公開頁可以使用了' : '已取消發布');
  } catch (error) {
    return fail(error);
  }
}
