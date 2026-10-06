'use client';

import { signIn } from 'next-auth/react';
import { useState, type FormEvent } from 'react';
import {
  CalendarDays,
  Gift,
  House,
  LayoutGrid,
  LockKeyhole,
  Settings,
  Sparkles,
  Gauge,
  Users,
} from 'lucide-react';
import { NavLink } from '@/components/tbx/client';

const ITEMS: Array<{ href: string; label: string; icon: typeof House; exact?: boolean; match?: string }> = [
  { href: '/console', label: '首頁', icon: House, exact: true },
  { href: '/console/events', label: '活動', icon: CalendarDays },
  { href: '/console/venues', label: '場地', icon: LayoutGrid },
  { href: '/console/scorecard', label: '綠燈', icon: Gauge },
  { href: '/console/gifts', label: '禮物', icon: Gift },
  { href: '/console/members', label: '會員', icon: Users },
  { href: '/console/ai', label: 'AI', icon: Sparkles },
  { href: '/console/settings/roles', label: '設定', icon: Settings, match: '/console/settings' },
];

export function ConsoleRail({ leaderName }: { leaderName: string | null }) {
  return (
    <nav
      aria-label="領導團隊工具"
      className="sticky top-0 z-20 flex items-center gap-1 overflow-x-auto border-b border-tb-line bg-tb-bg px-2 py-2 md:h-screen md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:px-0 md:py-4"
    >
      <NavLink
        href="/console"
        exact
        aria-label="長冠軍工具箱首頁"
        className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-tb-gold text-lg font-black text-tb-gold-ink no-underline md:mb-3 md:mr-0"
      >
        冠
      </NavLink>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.href}
            href={item.href}
            match={item.match}
            exact={item.exact}
            className="flex h-12 min-w-[56px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[10px] px-2 text-[11.5px] font-semibold text-tb-muted no-underline hover:text-tb-text aria-[current=page]:bg-tb-surf2 aria-[current=page]:text-tb-gold md:h-[58px] md:w-16"
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
      <div className="hidden md:block md:flex-1" />
      <a
        href="/me"
        className="ml-auto flex shrink-0 flex-col items-center gap-1 px-2 text-[11px] text-tb-muted no-underline hover:text-tb-text md:ml-0"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tb-surf2 text-sm font-bold text-tb-text ring-2 ring-tb-gold">
          {(leaderName ?? '幹').slice(0, 1)}
        </span>
        會員區
      </a>
    </nav>
  );
}

/** Shown instead of the console when the visitor has no leadership access. */
export function ConsoleGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch('/api/admin/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!response.ok) {
      setError('密碼不正確，請再試一次。');
      return;
    }
    window.location.reload();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 px-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-tb-gold text-tb-gold-ink">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold">領導團隊中控</h1>
          <p className="text-sm text-tb-muted">這一區只開放給當屆幹部。</p>
        </div>
      </div>
      <form onSubmit={submit} className="tb-card flex flex-col gap-3 p-4">
        <label className="tb-label" htmlFor="console-password">
          後台密碼
          <input
            id="console-password"
            type="password"
            className="tb-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="tb-form-error">{error}</p> : null}
        <button type="submit" className="tb-btn tb-btn-gold" disabled={loading || !password}>
          {loading ? '驗證中…' : '進入中控'}
        </button>
        <button type="button" className="tb-btn" onClick={() => signIn('google')}>
          用 Google 登入
        </button>
      </form>
      <a href="/me" className="text-center text-sm text-tb-muted">
        我是一般會員，前往會員區
      </a>
    </main>
  );
}
