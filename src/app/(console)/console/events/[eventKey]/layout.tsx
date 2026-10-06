import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { NavLink } from '@/components/tbx/client';
import { eventTypeLabel, formatEventDate } from '@/lib/tbx/labels';
import { getEventByKey, isEventPublic } from '@/server/tbx/events';

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventKey: string }>;
}) {
  const { eventKey } = await params;
  const event = await getEventByKey(eventKey);
  if (!event) notFound();

  const base = `/console/events/${encodeURIComponent(event.weekId)}`;
  const tabs = [
    { href: base, label: '中控', exact: true },
    { href: `${base}/attendance`, label: '出席與代理' },
    { href: `${base}/seating`, label: '座位' },
    { href: `${base}/polls`, label: '長冠軍之星' },
    { href: `${base}/gifts`, label: '禮物' },
    { href: `${base}/exports`, label: '匯出' },
  ];
  const published = isEventPublic(event.publicStatus);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href="/console/events" className="tb-eyebrow no-underline hover:text-tb-text">
            活動 / {eventTypeLabel(event.eventType)}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold">{event.title}</span>
            <span className="tb-mono text-tb-faint">{formatEventDate(event.date)}</span>
            <span className={published ? 'tb-chip tb-chip-present' : 'tb-chip'}>{published ? '已發布' : '未發布'}</span>
          </div>
          {event.location ? <p className="mt-1 text-sm text-tb-muted">{event.location}</p> : null}
        </div>
        {published ? (
          <Link href={`/e/${encodeURIComponent(event.weekId)}`} className="tb-btn" target="_blank">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            公開頁
          </Link>
        ) : null}
      </div>
      <nav className="tb-tabs" aria-label="活動工具">
        {tabs.map((tab) => (
          <NavLink key={tab.href} href={tab.href} exact={tab.exact} className="tb-tab">
            {tab.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
