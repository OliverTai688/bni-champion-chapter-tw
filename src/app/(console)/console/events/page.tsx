import { leaderGuard } from '@/components/tbx/leader-guard';
import Link from 'next/link';
import { ActionForm, ConfirmSubmit } from '@/components/tbx/client';
import { Empty, PageHeader } from '@/components/tbx/ui';
import { eventTypeLabel, formatEventDate, taipeiDateKey } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { isEventPublic, upcomingThursdays } from '@/server/tbx/events';
import { setEventArchivedAction } from './actions';
import { CreateEventButton, EditEventButton } from './event-forms';

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const denied = await leaderGuard();
  if (denied) return denied;
  const showArchived = view === 'archived';

  const events = await prisma.meetingSession.findMany({
    where: showArchived ? { status: 'archived' } : { status: { not: 'archived' } },
    orderBy: { date: 'desc' },
    take: 150,
    include: { _count: { select: { participations: true, gifts: true, livePolls: true, seatMaps: true } }, seatPlan: { select: { id: true } } },
  });

  const today = taipeiDateKey();
  const nextThursday = upcomingThursdays(1)[0] ?? today;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="/console/events"
        title="活動"
        description="每週例會與其他活動。出席、座位、投票、禮物都掛在單一活動底下。"
        actions={
          <>
            <Link href={showArchived ? '/console/events' : '/console/events?view=archived'} className="tb-btn tb-btn-quiet">
              {showArchived ? '回到進行中的活動' : '已封存的活動'}
            </Link>
            <CreateEventButton defaultDate={nextThursday} />
          </>
        }
      />

      {events.length === 0 ? (
        <Empty
          title={showArchived ? '沒有封存的活動' : '還沒有任何活動'}
          hint={showArchived ? undefined : '先新增這週四的例會，接著就能登記出席、排座位、開投票。'}
        />
      ) : (
        <div className="tb-card tb-table-wrap">
          <table className="tb-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>活動</th>
                <th>類型</th>
                <th>公開頁</th>
                <th className="num">座位表</th>
                <th className="num">投票</th>
                <th className="num">禮物</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const key = encodeURIComponent(event.weekId);
                const isToday = event.date.toISOString().slice(0, 10) === today;
                return (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap">
                      <span className="tb-mono">{formatEventDate(event.date)}</span>
                      {isToday ? <span className="tb-chip tb-chip-gold ml-2">今天</span> : null}
                    </td>
                    <td>
                      <Link href={`/console/events/${key}`} className="font-bold text-tb-text no-underline hover:text-tb-gold">
                        {event.title}
                      </Link>
                      {event.location ? <div className="text-xs text-tb-muted">{event.location}</div> : null}
                    </td>
                    <td className="whitespace-nowrap text-tb-muted">{eventTypeLabel(event.eventType)}</td>
                    <td>
                      <span className={isEventPublic(event.publicStatus) ? 'tb-chip tb-chip-present' : 'tb-chip'}>
                        {isEventPublic(event.publicStatus) ? '已發布' : '未發布'}
                      </span>
                    </td>
                    <td className="num text-tb-muted">{event.seatPlan ? '平面' : event._count.seatMaps > 0 ? '格狀' : '—'}</td>
                    <td className="num">{event._count.livePolls || '—'}</td>
                    <td className="num">{event._count.gifts || '—'}</td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/console/events/${key}`} className="tb-btn tb-btn-sm">
                          開啟
                        </Link>
                        <EditEventButton event={event} />
                        <ActionForm action={setEventArchivedAction} quietSuccess>
                          <input type="hidden" name="eventKey" value={event.weekId} />
                          <input type="hidden" name="archive" value={showArchived ? '0' : '1'} />
                          {showArchived ? (
                            <button type="submit" className="tb-btn tb-btn-sm">
                              還原
                            </button>
                          ) : (
                            <ConfirmSubmit confirmText="確定封存">封存</ConfirmSubmit>
                          )}
                        </ActionForm>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
