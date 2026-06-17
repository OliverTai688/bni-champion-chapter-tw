'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Send } from 'lucide-react';
import type { PublicWeeklyEventDTO } from '@/application/events/dto';
import { PublicSeatMap } from '@/components/public-seat-map';

type VoteState = 'idle' | 'accessing' | 'ready' | 'submitting' | 'submitted' | 'error';

export function PublicVoteClient({ event }: { event: PublicWeeklyEventDTO }) {
  const poll = event.polls.find((item) => item.status === 'open') ?? null;
  const [code, setCode] = useState('');
  const [token, setToken] = useState<string | null>(poll?.eligibility === 'public' ? 'public-pending' : null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [state, setState] = useState<VoteState>(poll?.eligibility === 'public' ? 'ready' : 'idle');
  const [message, setMessage] = useState<string | null>(null);

  const selectedLabel = useMemo(() => {
    return poll?.options.find((option) => option.id === selectedOptionId)?.label ?? null;
  }, [poll, selectedOptionId]);

  if (!poll) {
    return (
      <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 text-sm text-foreground/55">
        目前沒有開放中的投票。
      </div>
    );
  }

  async function requestAccess() {
    if (!poll) return;
    setState('accessing');
    setMessage(null);

    const response = await fetch(`/api/public/events/${event.slug}/polls/${poll.id}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    if (!response.ok) {
      setState('error');
      setMessage(data?.message ?? '代碼驗證失敗。');
      return;
    }

    setToken(data.token);
    setState('ready');
    setMessage('代碼已確認，請點選座位圖上的候選人。');
  }

  async function submitVote() {
    if (!poll || !selectedOptionId) return;

    setState('submitting');
    setMessage(null);

    const response = await fetch(`/api/public/events/${event.slug}/polls/${poll.id}/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId: selectedOptionId, token }),
    });
    const data = await response.json();
    if (!response.ok) {
      setState('error');
      setMessage(data?.message ?? '投票送出失敗。');
      return;
    }

    setState('submitted');
    setMessage(`已送出給 ${selectedLabel ?? '候選人'}。`);
  }

  const needsCode = poll.eligibility === 'code_required' && state !== 'ready' && state !== 'submitted' && !token;
  const busy = state === 'accessing' || state === 'submitting';
  const canSelect = state === 'ready' || poll.eligibility === 'public';
  const submitDisabled = busy || state === 'submitted' || !selectedOptionId || (poll.eligibility === 'code_required' && !token);

  return (
    <>
      <div className="grid gap-5 pb-24 lg:grid-cols-[0.9fr_1.4fr] lg:pb-0">
        <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/35">Vote</div>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{poll.title}</h1>
          <p className="mt-3 text-sm leading-6 text-foreground/55">
            {poll.description ?? '請依照現場規則選擇本週候選人。'}
          </p>

          {needsCode ? (
            <div className="mt-5 space-y-3">
              <label className="block text-xs font-black uppercase tracking-[0.2em] text-foreground/40">
                現場代碼
              </label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="text"
                autoCapitalize="characters"
                className="w-full rounded-xl border border-foreground/15 bg-background px-3 py-3 text-base uppercase outline-none transition focus:border-foreground/40"
                placeholder="輸入現場公布代碼"
              />
              <button
                onClick={requestAccess}
                disabled={busy || code.trim().length === 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-black text-background transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                驗證代碼
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {poll.eligibility === 'public' ? '公開投票：可直接點選座位候選人。' : '代碼已確認，可以投票。'}
            </div>
          )}

          {/* Desktop submit block; on mobile the sticky bottom bar handles submit. */}
          <div className="mt-5 hidden space-y-3 lg:block">
            <div className="rounded-xl border border-foreground/10 bg-background/70 px-3 py-3 text-sm">
              目前選擇：<span className="font-black">{selectedLabel ?? '尚未選擇'}</span>
            </div>
            <button
              onClick={submitVote}
              disabled={submitDisabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-black text-background transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state === 'submitted' ? <CheckCircle2 className="h-4 w-4" /> : busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {state === 'submitted' ? '已完成投票' : '送出投票'}
            </button>
            {message ? (
              <p className={`text-sm font-medium ${state === 'error' ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                {message}
              </p>
            ) : null}
          </div>
        </section>

        <PublicSeatMap
          seats={event.seatMap.seats}
          columns={event.seatMap.columns}
          activePoll={poll}
          selectedOptionId={selectedOptionId}
          onSelectOption={canSelect ? setSelectedOptionId : undefined}
        />
      </div>

      {/* Mobile sticky submit bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/10 bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        {message ? (
          <p className={`mb-2 text-xs font-bold ${state === 'error' ? 'text-red-600 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
            {message}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            <div className="text-[11px] font-bold text-foreground/45">目前選擇</div>
            <div className="truncate font-black">{selectedLabel ?? '尚未選擇'}</div>
          </div>
          <button
            onClick={submitVote}
            disabled={submitDisabled}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-black text-background transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === 'submitted' ? <CheckCircle2 className="h-4 w-4" /> : busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {state === 'submitted' ? '已完成' : '送出'}
          </button>
        </div>
      </div>
    </>
  );
}
