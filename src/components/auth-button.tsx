'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogIn, LogOut, ShieldCheck, UserCircle } from 'lucide-react';

export function AuthButton() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const userLabel = session?.user?.name ?? session?.user?.email ?? '已登入';

  if (loading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 rounded-lg border border-foreground/15 bg-background/40 px-3 py-2 text-sm font-bold opacity-60"
      >
        <UserCircle className="h-4 w-4" />
        檢查登入
      </button>
    );
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn('google')}
        className="inline-flex items-center gap-2 rounded-lg border border-foreground/15 bg-background/40 px-3 py-2 text-left text-sm font-bold hover:bg-foreground/[0.07]"
      >
        <LogIn className="h-4 w-4" />
        <span className="leading-tight">
          Google 登入
          <span className="block text-[10px] font-medium text-foreground/45">同步 MongoDB 草稿</span>
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5">
      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
      <span className="max-w-[160px] truncate text-xs font-medium text-foreground/70">{userLabel}</span>
      <button
        onClick={() => signOut()}
        className="inline-flex items-center gap-1 rounded-md border border-foreground/15 bg-background/40 px-2 py-1 text-xs font-bold hover:bg-foreground/[0.07]"
      >
        <LogOut className="h-3.5 w-3.5" />
        登出
      </button>
    </div>
  );
}
