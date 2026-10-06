'use client';

import { CalendarDays, House, Sparkles, UserRound } from 'lucide-react';
import { NavLink } from '@/components/tbx/client';

const TABS = [
  { href: '/me', label: '今日', icon: House, exact: true },
  { href: '/me/events', label: '活動', icon: CalendarDays },
  { href: '/me/ai', label: 'AI', icon: Sparkles },
  { href: '/me/scorecard', label: '我的', icon: UserRound, match: '/me/scorecard' },
];

export function MemberTabBar() {
  return (
    <nav
      aria-label="會員選單"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-tb-line bg-tb-surf pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto flex max-w-[520px]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.href}
              href={tab.href}
              exact={tab.exact}
              className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-tb-faint no-underline aria-[current=page]:text-tb-gold"
            >
              <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
