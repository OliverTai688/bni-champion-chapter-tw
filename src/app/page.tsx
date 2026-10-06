import Link from 'next/link';
import { CalendarCheck, ShieldCheck, UserRound } from 'lucide-react';
import { formatEventDate } from '@/lib/tbx/labels';
import { getFocusEvent } from '@/server/tbx/events';
import { getViewer } from '@/server/tbx/viewer';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [viewer, event] = await Promise.all([
    getViewer().catch(() => null),
    getFocusEvent({ publicOnly: true }).catch(() => null),
  ]);
  const key = event ? encodeURIComponent(event.weekId) : '';

  const doors = [
    {
      href: viewer?.member ? '/me' : '/login?next=/me',
      icon: UserRound,
      title: '會員區',
      hint: viewer?.member ? `${viewer.member.displayName}，看你的座位、簽到與燈號` : '看你的座位、簽到與燈號',
    },
    { href: '/leave', icon: CalendarCheck, title: '請假／代理登記', hint: '不能出席時先登記，幹部排座位就會看到' },
    { href: '/console', icon: ShieldCheck, title: '領導團隊中控', hint: '出席、座位、投票、禮物、綠燈會員' },
  ];

  return (
    <div className="tbx min-h-screen">
      <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-10">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tb-gold text-2xl font-black text-tb-gold-ink">冠</span>
          <div>
            <h1 className="text-[28px] font-bold leading-tight">長冠軍工具箱</h1>
            <p className="text-sm text-tb-muted">BNI 長冠軍分會</p>
          </div>
        </div>

        {event ? (
          <section className="tb-card flex flex-col gap-3 p-4">
            <div>
              <div className="tb-eyebrow">最近的活動</div>
              <h2 className="mt-1 text-xl font-bold">{event.title}</h2>
              <p className="text-sm text-tb-muted">
                {formatEventDate(event.date)}
                {event.startsAt ? ` ${event.startsAt}` : ''}
                {event.location ? ` · ${event.location}` : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Link href={`/e/${key}/check-in`} className="tb-btn tb-btn-gold tb-btn-lg">
                簽到
              </Link>
              <Link href={`/e/${key}`} className="tb-btn tb-btn-lg">
                座位
              </Link>
              <Link href={`/e/${key}/vote`} className="tb-btn tb-btn-lg">
                投票
              </Link>
              <Link href={`/e/${key}/lottery`} className="tb-btn tb-btn-lg">
                抽獎
              </Link>
            </div>
          </section>
        ) : null}

        <nav className="flex flex-col gap-3" aria-label="入口">
          {doors.map((door) => {
            const Icon = door.icon;
            return (
              <Link
                key={door.title}
                href={door.href}
                className="tb-card flex min-h-[76px] items-center gap-4 p-4 text-tb-text no-underline transition-colors hover:border-tb-gold"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tb-surf2 text-tb-gold">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-bold">{door.title}</span>
                  <span className="block text-sm text-tb-muted">{door.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
