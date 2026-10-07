import Link from 'next/link';
import { GridView } from '@/components/tbx/grid/grid-view';
import { PlanView } from '@/components/tbx/plan/plan-view';
import { Empty, RoleChips, StatusChip } from '@/components/tbx/ui';
import { formatEventDate } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { getFocusEvent, isEventPublic, isEventToday } from '@/server/tbx/events';
import { getMeetingRoles } from '@/server/tbx/meeting-roles';
import { getAttendance } from '@/server/tbx/participation';
import { getGridSeatView } from '@/server/tbx/grid-seat-map';
import { getSeatPlanView } from '@/server/tbx/seat-plan';
import { getViewer } from '@/server/tbx/viewer';
import { MemberCheckInButton } from './check-in-button';

export default async function MemberTodayPage() {
  const viewer = await getViewer();
  const me = viewer.member!;
  const event = await getFocusEvent();

  if (!event) {
    return (
      <>
        <Header name={me.displayName} leader={viewer.leader} />
        <Empty title="目前沒有排定的活動" hint="幹部建立下一場例會後，這裡會顯示你的座位與簽到。" />
      </>
    );
  }

  const key = encodeURIComponent(event.weekId);
  const [{ rows }, plan, grid, openPoll] = await Promise.all([
    getAttendance(event.id),
    getSeatPlanView(event.id),
    getGridSeatView(event.weekId, event.id),
    prisma.livePoll.findFirst({ where: { sessionId: event.id, status: 'open' }, select: { id: true } }),
  ]);
  const mine = rows.find((row) => row.memberId === me.id) ?? null;
  const myRoles = mine ? (await getMeetingRoles(event.id)).get(mine.id)?.filter((role) => role.kind !== 'substitute') : undefined;
  const today = isEventToday(event);
  const published = isEventPublic(event.publicStatus);

  let seatLabel = plan?.seats.find((seat) => seat.participationId === mine?.id)?.label ?? null;
  const gridSeat = !plan && grid ? [...grid.top, ...grid.main].find((seat) => (mine && seat.participationId === mine.id) || seat.name === me.displayName) ?? null : null;
  if (!seatLabel && gridSeat) seatLabel = gridSeat.zone === 'top' ? gridSeat.badge ?? '主持團' : gridSeat.label;

  const guests = rows.filter((row) => row.kind === 'guest');

  return (
    <>
      <Header name={me.displayName} leader={viewer.leader} />

      <section className="tb-card flex flex-col gap-4 p-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="tb-eyebrow">{today ? '今天' : '下一場'}</div>
            <h2 className="mt-1 text-xl font-bold">{event.title}</h2>
            <p className="text-sm text-tb-muted">
              {formatEventDate(event.date)}
              {event.startsAt ? ` ${event.startsAt}` : ''}
              {event.location ? ` · ${event.location}` : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-tb-faint">你的座位</div>
            <div className="tb-num text-[40px] font-bold text-tb-gold">{seatLabel ?? '—'}</div>
          </div>
        </div>

        {mine ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-tb-muted">目前狀態</span>
            <span className="flex items-center gap-2">
              {mine.status === 'substitute' ? <span className="font-semibold text-tb-sub">{mine.substituteName}</span> : null}
              <StatusChip status={mine.status} substituteArrived={Boolean(mine.substituteArrivedAt)} />
            </span>
          </div>
        ) : null}

        {myRoles?.length ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-tb-muted">本場角色</span>
            <RoleChips roles={myRoles} className="justify-end" />
          </div>
        ) : null}

        {plan ? <PlanView data={plan} highlightParticipationId={mine?.id ?? null} showNames={false} /> : null}
        {!plan && grid ? <GridView data={grid} highlightName={me.displayName} showStatus={false} /> : null}

        {today && mine?.status === 'expected' ? <MemberCheckInButton eventKey={event.weekId} /> : null}
        {!today && mine ? (
          <Link href="/me/events" className="tb-btn tb-btn-lg">
            這場要請假或找代理
          </Link>
        ) : null}
        {published ? (
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/e/${key}/vote`} className="tb-btn">
              長冠軍之星{openPoll ? '・投票中' : ''}
            </Link>
            <Link href={`/e/${key}/lottery`} className="tb-btn">
              禮物抽獎
            </Link>
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">這一場的來賓</h2>
          <span className="text-xs text-tb-muted">{guests.length} 位</span>
        </div>
        {guests.length === 0 ? (
          <p className="text-sm text-tb-muted">還沒有登記的來賓。</p>
        ) : (
          <ul className="tb-card m-0 list-none p-0">
            {guests.map((guest) => (
              <li key={guest.id} className="flex items-center gap-3 border-b border-tb-line px-4 py-3 last:border-b-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tb-surf2 text-sm font-bold">
                  {guest.displayName.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{guest.displayName}</span>
                  <span className="block text-xs text-tb-muted">{[guest.guestIndustry, guest.guestCompany].filter(Boolean).join(' · ') || '產業未填'}</span>
                </span>
                <StatusChip status={guest.status} guest />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Header({ name, leader }: { name: string; leader: boolean }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <div className="tb-eyebrow">長冠軍工具箱</div>
        <h1 className="mt-1 text-2xl font-bold">{name}，你好</h1>
      </div>
      {leader ? (
        <Link href="/console" className="tb-btn tb-btn-outline tb-btn-sm">
          進入領導團隊中控
        </Link>
      ) : null}
    </div>
  );
}
