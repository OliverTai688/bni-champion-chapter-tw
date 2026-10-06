import { StatusChip } from '@/components/tbx/ui';
import { eventTypeLabel, formatEventDate, taipeiDateKey } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { listUpcomingEvents, upcomingThursdays } from '@/server/tbx/events';
import { getViewer } from '@/server/tbx/viewer';
import { LeaveForm } from '@/app/(public)/leave/leave-form';

export default async function MemberEventsPage() {
  const viewer = await getViewer();
  const me = viewer.member!;
  const upcoming = await listUpcomingEvents(8);
  const today = new Date(`${taipeiDateKey()}T00:00:00.000Z`);

  const [mineUpcoming, past] = await Promise.all([
    prisma.participation.findMany({ where: { memberId: me.id, sessionId: { in: upcoming.map((event) => event.id) } } }),
    prisma.participation.findMany({
      where: { memberId: me.id, session: { date: { lt: today } } },
      include: { session: { select: { title: true, date: true } } },
      orderBy: { session: { date: 'desc' } },
      take: 8,
    }),
  ]);
  const mineBySession = new Map(mineUpcoming.map((row) => [row.sessionId, row]));

  const known = new Set(upcoming.map((event) => event.weekId));
  const options = [
    ...upcoming.map((event) => ({ key: event.weekId, label: `${formatEventDate(event.date)} ${event.title}（${eventTypeLabel(event.eventType)}）` })),
    ...upcomingThursdays(5)
      .filter((date) => !known.has(date))
      .map((date) => ({ key: date, label: `${formatEventDate(new Date(`${date}T00:00:00.000Z`))} 每週例會（尚未建立）` })),
  ].sort((a, b) => a.key.localeCompare(b.key));

  return (
    <>
      <div>
        <div className="tb-eyebrow">活動</div>
        <h1 className="mt-1 text-2xl font-bold">活動與請假</h1>
        <p className="mt-1 text-sm text-tb-muted">不能出席時，在這裡登記請假或代理人。</p>
      </div>

      <section className="tb-card p-4">
        <LeaveForm events={options} members={[]} me={{ id: me.id, name: me.displayName }} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold">接下來的活動</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-tb-muted">目前沒有排定的活動。</p>
        ) : (
          <ul className="tb-card m-0 list-none p-0">
            {upcoming.map((event) => {
              const row = mineBySession.get(event.id);
              return (
                <li key={event.id} className="flex items-center gap-3 border-b border-tb-line px-4 py-3 last:border-b-0">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold">{event.title}</span>
                    <span className="block text-xs text-tb-muted">
                      {formatEventDate(event.date)}
                      {event.startsAt ? ` ${event.startsAt}` : ''}
                      {row?.status === 'substitute' ? ` · 代理人 ${row.substituteName}` : ''}
                    </span>
                  </span>
                  {row && row.status !== 'expected' ? (
                    <StatusChip status={row.status} substituteArrived={Boolean(row.substituteArrivedAt)} />
                  ) : (
                    <span className="tb-chip tb-chip-plain">會出席</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-bold">最近的出席</h2>
        {past.length === 0 ? (
          <p className="text-sm text-tb-muted">還沒有出席紀錄。</p>
        ) : (
          <ul className="tb-card m-0 list-none p-0">
            {past.map((row) => (
              <li key={row.id} className="flex items-center gap-3 border-b border-tb-line px-4 py-3 last:border-b-0">
                <span className="tb-mono w-20 text-tb-faint">{formatEventDate(row.session.date)}</span>
                <span className="min-w-0 flex-1 text-sm">{row.session.title}</span>
                {row.status === 'expected' ? (
                  <span className="tb-chip tb-chip-plain">未簽到</span>
                ) : (
                  <StatusChip status={row.status} substituteArrived={Boolean(row.substituteArrivedAt)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
