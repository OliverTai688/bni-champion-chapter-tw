'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { Archive, Eye, EyeOff, Link2, Loader2, Send } from 'lucide-react';
import type { AdminEventPublicationDTO, PublicEventPublishAction } from '@/application/events/publication';

type RequestState = 'idle' | 'loading' | 'saving' | 'error';

export function EventPublicationControls({ weekId, embedded = false }: { weekId: string; embedded?: boolean }) {
  const { status } = useSession();
  const [publication, setPublication] = useState<AdminEventPublicationDTO | null>(null);
  const [requestState, setRequestState] = useState<RequestState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const shellClassName = embedded ? 'mb-6 no-print' : 'mx-auto mb-6 max-w-6xl px-6 no-print';

  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;
    fetch(`/api/admin/events/${weekId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('讀取公開頁設定失敗');
        return response.json() as Promise<AdminEventPublicationDTO>;
      })
      .then((data) => {
        if (cancelled) return;
        setPublication(data);
        setMessage(null);
        setRequestState('idle');
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : '讀取公開頁設定失敗');
        setRequestState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [status, weekId]);

  async function runAction(action: PublicEventPublishAction) {
    setRequestState('saving');
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/events/${weekId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? '更新公開頁失敗');

      setPublication(data);
      setMessage(action === 'publish' ? '公開頁已發布。' : '公開頁設定已更新。');
      setRequestState('idle');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '更新公開頁失敗');
      setRequestState('error');
    }
  }

  if (status === 'loading') {
    return (
      <section className={shellClassName}>
        <div className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-foreground/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          檢查公開頁權限
        </div>
      </section>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <section className={shellClassName}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <div>
            <div className="text-sm font-black text-foreground/80">管理者公開頁</div>
            <p className="text-xs text-foreground/55">登入後可產生本週公開連結並發布檢視頁。</p>
          </div>
          <button
            onClick={() => signIn('google')}
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-xs font-black text-background"
          >
            <Send className="h-3.5 w-3.5" />
            Google 登入
          </button>
        </div>
      </section>
    );
  }

  const busy = requestState === 'loading' || requestState === 'saving';
  const publicUrl = publication?.publicUrl ?? null;
  const absolutePublicUrl = typeof window !== 'undefined' && publicUrl ? `${window.location.origin}${publicUrl}` : publicUrl;

  return (
    <section className={shellClassName}>
      <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-black text-foreground/80">管理者公開頁</div>
            <p className="mt-1 text-xs text-foreground/55">
              產生本週分享連結，發布後會開放匿名統計檢視；投票功能會在後續 batch 接上。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton busy={busy} icon={<Link2 className="h-3.5 w-3.5" />} label="產生連結" onClick={() => runAction('generate_slug')} />
            <ActionButton busy={busy} icon={<Eye className="h-3.5 w-3.5" />} label="發布" onClick={() => runAction('publish')} primary />
            <ActionButton busy={busy} icon={<EyeOff className="h-3.5 w-3.5" />} label="隱藏" onClick={() => runAction('hide')} />
            <ActionButton busy={busy} icon={<Archive className="h-3.5 w-3.5" />} label="封存" onClick={() => runAction('archive')} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full border border-foreground/10 bg-background/70 px-3 py-1 font-black text-foreground/60">
            狀態：{publication?.publicStatus ?? '讀取中'}
          </span>
          {absolutePublicUrl ? (
            <Link href={publicUrl ?? '#'} className="font-bold text-emerald-700 underline decoration-emerald-500/40 underline-offset-4 dark:text-emerald-300">
              {absolutePublicUrl}
            </Link>
          ) : (
            <span className="text-foreground/45">尚未產生公開連結</span>
          )}
        </div>

        {message ? (
          <p className={`mt-3 text-xs font-medium ${requestState === 'error' ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function ActionButton({
  busy,
  icon,
  label,
  onClick,
  primary = false,
}: {
  busy: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
        primary
          ? 'bg-foreground text-background hover:opacity-90'
          : 'border border-foreground/15 bg-background/60 text-foreground/70 hover:bg-foreground/[0.06]'
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}
