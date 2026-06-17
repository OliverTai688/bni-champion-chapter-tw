'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

export function AuthButton() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const userLabel = session?.user?.name ?? session?.user?.email ?? '已登入';

  if (loading) {
    return (
      <button
        disabled
        className="rounded-lg border border-foreground/15 bg-background/40 px-3 py-2 text-sm font-bold opacity-60"
      >
        檢查登入
      </button>
    );
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn('google')}
        className="rounded-lg border border-foreground/15 bg-background/40 px-3 py-2 text-sm font-bold hover:bg-foreground/[0.07]"
      >
        Google 登入
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[160px] truncate text-xs text-foreground/55">{userLabel}</span>
      <button
        onClick={() => signOut()}
        className="rounded-lg border border-foreground/15 bg-background/40 px-3 py-2 text-sm font-bold hover:bg-foreground/[0.07]"
      >
        登出
      </button>
    </div>
  );
}
