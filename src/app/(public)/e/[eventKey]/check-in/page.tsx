import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatEventDate } from '@/lib/tbx/labels';
import { getPublicEventByKey, isEventToday } from '@/server/tbx/events';
import { getAttendance } from '@/server/tbx/participation';
import { getViewer } from '@/server/tbx/viewer';
import { CheckInClient, type CheckInPerson } from './check-in-client';

export const metadata: Metadata = { title: '簽到 | 長冠軍工具箱' };

export default async function CheckInPage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  const event = await getPublicEventByKey(eventKey);
  if (!event) notFound();

  const [{ rows, summary }, viewer] = await Promise.all([getAttendance(event.id), getViewer()]);
  const toPerson = (row: (typeof rows)[number]): CheckInPerson => ({
    id: row.id,
    name: row.displayName,
    state:
      row.status === 'present' || row.status === 'late'
        ? 'arrived'
        : row.status === 'substitute'
          ? row.substituteArrivedAt
            ? 'arrived'
            : 'substitute'
          : row.status === 'expected'
            ? 'expected'
            : 'away',
    substituteName: row.status === 'substitute' ? row.substituteName : null,
  });

  const members = rows.filter((row) => row.kind === 'member');
  const mine = viewer.member ? members.find((row) => row.memberId === viewer.member!.id) ?? null : null;
  const key = encodeURIComponent(event.weekId);
  const today = isEventToday(event);

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-4 py-8">
      <div>
        <div className="tb-eyebrow">簽到</div>
        <h1 className="mt-1 text-2xl font-bold">{event.title}</h1>
        <p className="mt-1 text-sm text-tb-muted">
          {formatEventDate(event.date)}
          {event.startsAt ? ` ${event.startsAt} 開始` : ''}
          {event.location ? ` · ${event.location}` : ''} · 現場 {summary.inRoom} 人
        </p>
      </div>

      {!today && !viewer.leader ? (
        <div className="tb-banner">
          <p className="text-sm">活動當天才能簽到。要請假或找代理，請用請假登記。</p>
          <Link href={`/leave?event=${key}`} className="tb-btn">
            請假／代理登記
          </Link>
        </div>
      ) : (
        <CheckInClient
          eventKey={event.weekId}
          members={members.map(toPerson)}
          guests={rows.filter((row) => row.kind === 'guest').map(toPerson)}
          inviters={members.map((row) => ({ id: row.memberId ?? '', name: row.displayName })).filter((item) => item.id)}
          myParticipationId={mine && mine.status === 'expected' ? mine.id : null}
        />
      )}

      <div className="flex justify-between text-sm">
        <Link href={`/e/${key}`} className="text-tb-muted">
          活動頁
        </Link>
        <Link href={`/e/${key}/vote`} className="text-tb-muted">
          長冠軍之星投票
        </Link>
      </div>
    </main>
  );
}
