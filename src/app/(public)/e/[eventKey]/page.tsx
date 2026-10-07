import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findGridSeat, GridView } from '@/components/tbx/grid/grid-view';
import { PlanWithRoles } from '@/components/tbx/plan/plan-with-roles';
import { Stat } from '@/components/tbx/ui';
import { eventTypeLabel, formatEventDate } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { getPublicEventByKey } from '@/server/tbx/events';
import { getAttendance } from '@/server/tbx/participation';
import { getGridSeatView } from '@/server/tbx/grid-seat-map';
import { getSeatPlanView } from '@/server/tbx/seat-plan';

export const metadata: Metadata = { title: '活動 | 長冠軍工具箱' };

export default async function PublicEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventKey: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { eventKey } = await params;
  const { q = '' } = await searchParams;
  const event = await getPublicEventByKey(eventKey);
  if (!event) notFound();

  const key = encodeURIComponent(event.weekId);
  const [{ summary }, plan, grid, openPoll, giftCount] = await Promise.all([
    getAttendance(event.id),
    getSeatPlanView(event.id),
    getGridSeatView(event.weekId, event.id),
    prisma.livePoll.findFirst({ where: { sessionId: event.id, status: 'open' }, select: { id: true } }),
    prisma.gift.count({ where: { sessionId: event.id } }),
  ]);

  const query = q.trim();
  const found = query && plan ? plan.seats.find((seat) => seat.name?.includes(query) || seat.substituteName?.includes(query)) ?? null : null;
  const gridFound = query && !plan && grid ? findGridSeat(grid, query) : null;
  const hasSeats = Boolean(plan || grid);

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-8">
      <div>
        <div className="tb-eyebrow">
          {event.chapterName} · {eventTypeLabel(event.eventType)}
        </div>
        <h1 className="mt-1 text-2xl font-bold">{event.title}</h1>
        <p className="mt-1 text-sm text-tb-muted">
          {formatEventDate(event.date)}
          {event.startsAt ? ` ${event.startsAt} 開始` : ''}
          {event.location ? ` · ${event.location}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link href={`/e/${key}/check-in`} className="tb-btn tb-btn-gold tb-btn-lg">
          簽到
        </Link>
        <Link href={`/e/${key}/vote`} className="tb-btn tb-btn-lg">
          長冠軍之星{openPoll ? '・投票中' : ''}
        </Link>
        <Link href={`/e/${key}/lottery`} className="tb-btn tb-btn-lg">
          禮物抽獎{giftCount ? `（${giftCount}）` : ''}
        </Link>
        <Link href={`/leave?event=${key}`} className="tb-btn tb-btn-lg">
          請假／代理
        </Link>
      </div>

      <div className="tb-card flex flex-wrap gap-y-4 p-4">
        <Stat value={summary.arrived} total={summary.members} label="會員已到" tone="ok" />
        <Stat value={summary.substitutesArrived} total={summary.substitutes} label="代理人已到" tone="sub" />
        <Stat value={summary.guestsArrived} total={summary.guests} label="來賓" tone="guest" />
        <Stat value={summary.inRoom} label="現場總人數" tone="gold" />
      </div>

      <section className="tb-card">
        <div className="tb-card-head">
          <h2>座位</h2>
          {hasSeats ? (
            <form action={`/e/${key}`} className="flex items-center gap-2">
              <label className="sr-only" htmlFor="seat-q">
                找座位
              </label>
              <input id="seat-q" name="q" defaultValue={query} placeholder="輸入姓名找座位" className="tb-input h-[34px] min-h-0 w-40" />
              <button type="submit" className="tb-btn tb-btn-sm">
                找座位
              </button>
            </form>
          ) : null}
        </div>
        <div className="tb-card-body flex flex-col gap-3">
          {plan ? (
            <>
              {query ? (
                <p className={found ? 'tb-form-ok' : 'tb-form-error'}>
                  {found ? `${found.substituteName ?? found.name} 的座位：${found.label}` : `座位表上找不到「${query}」。請確認姓名，或詢問報到台。`}
                </p>
              ) : null}
              <PlanWithRoles data={plan} highlightParticipationId={found?.participationId ?? null} showNames />
            </>
          ) : grid ? (
            <>
              {query ? (
                <p className={gridFound ? 'tb-form-ok' : 'tb-form-error'}>
                  {gridFound
                    ? `${gridFound.substituteName ?? gridFound.name} 的座位：${gridFound.zone === 'top' ? gridFound.badge ?? '主持團' : gridFound.label}`
                    : `座位表上找不到「${query}」。請確認姓名，或詢問報到台。`}
                </p>
              ) : null}
              <GridView data={grid} highlightName={gridFound ? gridFound.name : null} />
            </>
          ) : (
            <p className="text-sm text-tb-muted">座位表還在安排中，請稍後再來看。</p>
          )}
        </div>
      </section>
    </main>
  );
}
