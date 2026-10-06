import { leaderGuard } from '@/components/tbx/leader-guard';
import Link from 'next/link';
import { CalendarDays, Gift, LayoutGrid, Gauge, Sparkles, Star, UserCheck, Users } from 'lucide-react';
import { Card, Empty, PageHeader, Stat } from '@/components/tbx/ui';
import { eventTypeLabel, formatEventDate, taipeiDateKey } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { getFocusEvent, isEventPublic, listUpcomingEvents } from '@/server/tbx/events';
import { getAttendance } from '@/server/tbx/participation';
import { getViewer } from '@/server/tbx/viewer';

export default async function ConsoleHomePage() {
  const denied = await leaderGuard();
  if (denied) return denied;
  const [viewer, focus, upcoming, memberCount, latestPeriod, venueCount] = await Promise.all([
    getViewer(),
    getFocusEvent(),
    listUpcomingEvents(5),
    prisma.member.count({ where: { category: 'member', isActive: true } }),
    prisma.palmsPeriod.findFirst({ where: { isCurrent: true }, orderBy: { to: 'desc' } }),
    prisma.venue.count(),
  ]);

  const attendance = focus ? await getAttendance(focus.id) : null;
  const focusKey = focus ? encodeURIComponent(focus.weekId) : '';
  const isToday = focus ? focus.date.toISOString().slice(0, 10) === taipeiDateKey() : false;
  const isPast = focus ? focus.date.toISOString().slice(0, 10) < taipeiDateKey() : false;

  const tools = [
    { href: focus ? `/console/events/${focusKey}` : '/console/events', icon: CalendarDays, title: '例會中控', hint: '即時出席、待處理事項、公開頁' },
    { href: focus ? `/console/events/${focusKey}/attendance` : '/console/events', icon: UserCheck, title: '出席與代理', hint: '簽到、請假、代理人、來賓' },
    { href: focus ? `/console/events/${focusKey}/seating` : '/console/venues', icon: LayoutGrid, title: '座位表', hint: '依場地平面圖排座' },
    { href: focus ? `/console/events/${focusKey}/polls` : '/console/events', icon: Star, title: '長冠軍之星', hint: '開放投票、看結果與好話' },
    { href: focus ? `/console/events/${focusKey}/gifts` : '/console/gifts', icon: Gift, title: '禮物抽獎', hint: '加禮物、前台隨機抽、記錄得主' },
    { href: '/console/scorecard', icon: Gauge, title: '綠燈會員', hint: latestPeriod ? `最新資料到 ${formatEventDate(latestPeriod.to)}` : '匯入 PALMS 就能算出燈號' },
    { href: '/console/members', icon: Users, title: '會員名冊', hint: `${memberCount} 位在籍會員` },
    { href: '/console/venues', icon: LayoutGrid, title: '場地庫', hint: venueCount ? `${venueCount} 個場地` : '建立第一個場地配置' },
    { href: '/console/ai', icon: Sparkles, title: '商會 AI', hint: '尚未接上，先看規劃' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="領導團隊中控"
        title={`${viewer.leaderName ?? '領導團隊'}，你好`}
        description="先處理最近的一場活動，再看其他工具。"
        actions={
          <Link href="/console/events" className="tb-btn">
            所有活動
          </Link>
        }
      />

      {focus && attendance ? (
        <section className="tb-card flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="tb-eyebrow">{isToday ? '今天的活動' : isPast ? '最近一場活動' : '下一場活動'}</div>
              <h2 className="mt-1 text-xl font-bold">{focus.title}</h2>
              <p className="text-sm text-tb-muted">
                {formatEventDate(focus.date)}
                {focus.startsAt ? ` ${focus.startsAt}` : ''} · {eventTypeLabel(focus.eventType)}
                {focus.location ? ` · ${focus.location}` : ''} · {isEventPublic(focus.publicStatus) ? '已發布' : '未發布'}
              </p>
            </div>
            <Link href={`/console/events/${focusKey}`} className="tb-btn tb-btn-gold">
              進入例會中控
            </Link>
          </div>
          <div className="flex flex-wrap gap-y-4">
            <Stat value={attendance.summary.arrived} total={attendance.summary.members} label="會員已到" tone="ok" />
            <Stat value={attendance.summary.substitutes} label="代理" hint={`已到 ${attendance.summary.substitutesArrived}`} tone="sub" />
            <Stat value={attendance.summary.absent} label="請假" tone="bad" />
            <Stat value={attendance.summary.expected} label="未到" />
            <Stat value={attendance.summary.guestsArrived} total={attendance.summary.guests} label="來賓" tone="guest" />
          </div>
        </section>
      ) : (
        <Empty
          title="還沒有任何活動"
          hint="先新增這週的例會，出席、座位、投票和禮物都會掛在那場活動底下。"
          action={
            <Link href="/console/events" className="tb-btn tb-btn-gold">
              新增活動
            </Link>
          }
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold">工具</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.title}
                href={tool.href}
                className="tb-card flex items-center gap-4 p-4 text-tb-text no-underline transition-colors hover:border-tb-gold"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tb-surf2 text-tb-gold">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold">{tool.title}</span>
                  <span className="block text-xs text-tb-muted">{tool.hint}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <Card title="接下來的活動" bodyClassName="p-0">
        {upcoming.length === 0 ? (
          <p className="p-4 text-sm text-tb-muted">沒有排定的活動。</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {upcoming.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-3 border-b border-tb-line px-4 py-3 last:border-b-0">
                <span className="tb-mono w-24 text-tb-faint">{formatEventDate(event.date)}</span>
                <Link href={`/console/events/${encodeURIComponent(event.weekId)}`} className="flex-1 font-bold text-tb-text no-underline hover:text-tb-gold">
                  {event.title}
                </Link>
                <span className="text-xs text-tb-muted">{eventTypeLabel(event.eventType)}</span>
                <span className={isEventPublic(event.publicStatus) ? 'tb-chip tb-chip-present' : 'tb-chip'}>
                  {isEventPublic(event.publicStatus) ? '已發布' : '未發布'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
