import 'server-only';

import { prisma } from '@/server/db/prisma';
import { taipeiDateKey } from '@/lib/tbx/labels';

export const PUBLIC_EVENT_STATUSES = ['published', 'live', 'completed', 'archived'] as const;

/** An event key is the session's weekId (dates for weekly meetings) or its public slug. */
export async function getEventByKey(eventKey: string) {
  const key = decodeURIComponent(eventKey);
  const byWeekId = await prisma.meetingSession.findUnique({ where: { weekId: key } });
  if (byWeekId) return byWeekId;
  return prisma.meetingSession.findFirst({ where: { publicSlug: key } });
}

/** Public pages only resolve events a leader has published. */
export async function getPublicEventByKey(eventKey: string) {
  const event = await getEventByKey(eventKey);
  if (!event) return null;
  if (!(PUBLIC_EVENT_STATUSES as readonly string[]).includes(event.publicStatus)) return null;
  return event;
}

export function isEventPublic(publicStatus: string) {
  return (PUBLIC_EVENT_STATUSES as readonly string[]).includes(publicStatus);
}

export async function listEvents() {
  return prisma.meetingSession.findMany({
    where: { status: { not: 'archived' } },
    orderBy: { date: 'desc' },
    take: 120,
  });
}

/** The event leaders and members most likely care about now: today's, else the next one, else the latest. */
export async function getFocusEvent(options: { publicOnly?: boolean } = {}) {
  const todayKey = taipeiDateKey();
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const where = options.publicOnly ? { publicStatus: { in: [...PUBLIC_EVENT_STATUSES] } } : {};

  const upcoming = await prisma.meetingSession.findFirst({
    where: { ...where, status: { notIn: ['archived', 'canceled'] }, date: { gte: today } },
    orderBy: { date: 'asc' },
  });
  if (upcoming) return upcoming;

  return prisma.meetingSession.findFirst({
    where: { ...where, status: { notIn: ['archived', 'canceled'] } },
    orderBy: { date: 'desc' },
  });
}

export async function listUpcomingEvents(limit = 6, options: { publicOnly?: boolean } = {}) {
  const today = new Date(`${taipeiDateKey()}T00:00:00.000Z`);
  return prisma.meetingSession.findMany({
    where: {
      ...(options.publicOnly ? { publicStatus: { in: [...PUBLIC_EVENT_STATUSES] } } : {}),
      status: { notIn: ['archived', 'canceled'] },
      date: { gte: today },
    },
    orderBy: { date: 'asc' },
    take: limit,
  });
}

/** URL-safe key for new non-weekly events. */
export function buildEventKey(date: string, title: string, eventType: string) {
  if (eventType === 'weekly_meeting') return date;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 6);
  return [date, slug || eventType, suffix].filter(Boolean).join('-');
}

/**
 * Members can register leave for a Thursday before a leader has created the
 * event. Mirrors what /pre-leave did: create a draft shell for that date.
 */
export async function ensureWeeklyEvent(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || Number.isNaN(Date.parse(dateKey))) {
    throw new Error('活動日期格式不正確。');
  }
  const existing = await prisma.meetingSession.findUnique({ where: { weekId: dateKey } });
  if (existing) return existing;

  const [year, month, day] = dateKey.split('-');
  return prisma.meetingSession.create({
    data: {
      weekId: dateKey,
      date: new Date(`${dateKey}T00:00:00.000Z`),
      title: `${Number(year) - 1911}/${month}/${day} 例會`,
      chapterName: 'BNI 長冠軍分會',
      meetingLabel: '每週例會',
      eventType: 'weekly_meeting',
      startsAt: '07:00',
      source: 'generated',
      status: 'draft',
      publicStatus: 'draft',
      publicSlug: `__draft__${dateKey}`,
    },
  });
}

/** Next Thursdays (Taiwan time) as YYYY-MM-DD, starting today. */
export function upcomingThursdays(count = 5) {
  const result: string[] = [];
  const start = new Date(`${taipeiDateKey()}T00:00:00.000Z`);
  for (let offset = 0; offset < 60 && result.length < count; offset += 1) {
    const day = new Date(start.getTime() + offset * 86_400_000);
    if (day.getUTCDay() === 4) result.push(day.toISOString().slice(0, 10));
  }
  return result;
}

/** True when the event is today (Taiwan time) and its start time has passed. */
export function isPastStartTime(event: { date: Date; startsAt: string | null }, now: Date = new Date()) {
  if (!event.startsAt || !/^\d{1,2}:\d{2}$/.test(event.startsAt)) return false;
  if (event.date.toISOString().slice(0, 10) !== taipeiDateKey(now)) return false;
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  return time > event.startsAt.padStart(5, '0');
}

export function isEventToday(event: { date: Date }, now: Date = new Date()) {
  return event.date.toISOString().slice(0, 10) === taipeiDateKey(now);
}
