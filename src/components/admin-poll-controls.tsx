'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Download, KeyRound, Loader2, Radio, RefreshCw, SquareCheckBig, Trophy, Vote } from 'lucide-react';

type PollMode = 'code_required' | 'public';

type AdminPoll = {
  id: string;
  title: string;
  status: string;
  eligibility: string;
  resultVisibility?: string;
  optionCount: number;
  voteCount: number;
  createdAt: string;
  closesAt?: string | null;
  highestVoteCount?: number;
  isTie?: boolean;
  winners?: AdminPollResult[];
  results?: AdminPollResult[];
};

type AdminPollResult = {
  id: string;
  label: string;
  publicDescription: string | null;
  position: number;
  voteCount: number;
  seat: {
    seatKey?: string | null;
    zone?: string | null;
    row?: number | null;
    col?: number | null;
    seatKind?: string | null;
  };
};

export function AdminPollControls({ weekId }: { weekId: string }) {
  const pollEndpoint = `/admin/api/events/${weekId}/polls`;
  const [mode, setMode] = useState<PollMode>('code_required');
  const [polls, setPolls] = useState<AdminPoll[]>([]);
  const [voteCode, setVoteCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [closingPollId, setClosingPollId] = useState<string | null>(null);

  async function loadPolls() {
    setRefreshing(true);
    await fetch(pollEndpoint)
      .then(async (response) => response.ok ? response.json() : { polls: [] })
      .then((data) => setPolls(data.polls ?? []))
      .catch(() => setPolls([]));
    setRefreshing(false);
  }

  useEffect(() => {
    let active = true;
    fetch(pollEndpoint)
      .then(async (response) => response.ok ? response.json() : { polls: [] })
      .then((data) => {
        if (active) setPolls(data.polls ?? []);
      })
      .catch(() => {
        if (active) setPolls([]);
      });

    return () => {
      active = false;
    };
  }, [pollEndpoint]);

  async function createPoll() {
    setLoading(true);
    setMessage(null);
    setVoteCode(null);

    const response = await fetch(pollEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eligibility: mode }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data?.message ?? '建立投票失敗。');
      return;
    }

    setVoteCode(data.voteCode ?? null);
    setMessage(`已建立 ${data.title}，候選人 ${data.candidateCount} 位。`);
    setPolls((current) => [
      {
        id: data.pollId,
        title: data.title,
        status: 'open',
        eligibility: data.eligibility,
        optionCount: data.candidateCount,
        voteCount: 0,
        createdAt: new Date().toISOString(),
        results: [],
        winners: [],
        highestVoteCount: 0,
        isTie: false,
      },
      ...current,
    ]);
  }

  async function closePoll(poll: AdminPoll) {
    const shouldClose = window.confirm(`確定結束「${poll.title}」投票？結束後公開頁將不能再投票。`);
    if (!shouldClose) return;

    setClosingPollId(poll.id);
    setMessage(null);

    const response = await fetch(`${pollEndpoint}/${poll.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    });
    const data = await response.json();
    setClosingPollId(null);

    if (!response.ok) {
      setMessage(data?.message ?? '結束投票失敗。');
      return;
    }

    setPolls((current) => current.map((item) => item.id === poll.id ? data.poll : item));
    const winners = data.poll?.winners?.map((winner: AdminPollResult) => winner.label).join('、') || '尚無票數';
    setMessage(`已結束投票。最高票：${winners}。`);
  }

  return (
    <section className="mt-8 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-foreground/35">Poll Admin</div>
          <h2 className="mt-1 text-xl font-black">長冠軍之星投票</h2>
          <p className="mt-1 text-sm text-foreground/55">
            從目前座位圖建立候選名單，公開頁可依座位位置點選投票。
          </p>
        </div>
        <button
          onClick={createPoll}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-black text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Vote className="h-4 w-4" />}
          建立並開放投票
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ModeButton
          active={mode === 'code_required'}
          icon={<KeyRound className="h-4 w-4" />}
          title="現場代碼"
          description="產生代碼，公告後輸入才能投票。"
          onClick={() => setMode('code_required')}
        />
        <ModeButton
          active={mode === 'public'}
          icon={<Radio className="h-4 w-4" />}
          title="公開投票"
          description="任何人可直接點座位候選投票。"
          onClick={() => setMode('public')}
        />
      </div>

      {voteCode ? (
        <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">現場代碼</div>
          <div className="mt-1 text-3xl font-black tracking-[0.2em] text-emerald-800 dark:text-emerald-200">{voteCode}</div>
          <p className="mt-1 text-xs text-foreground/55">代碼只顯示這一次；若忘記請重新建立投票。</p>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm font-medium text-foreground/65">{message}</p> : null}

      <div className="mt-5 flex justify-end">
        <button
          onClick={loadPolls}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border border-foreground/10 px-3 py-2 text-xs font-black text-foreground/70 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          更新票況
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {polls.length > 0 ? polls.map((poll) => (
          <PollPanel
            key={poll.id}
            poll={poll}
            closing={closingPollId === poll.id}
            onClose={() => closePoll(poll)}
            exportHref={`${pollEndpoint}/${poll.id}/export`}
          />
        )) : (
          <div className="rounded-md border border-foreground/10 px-4 py-6 text-sm text-foreground/45">尚未建立投票。</div>
        )}
      </div>
    </section>
  );
}

function PollPanel({
  poll,
  closing,
  onClose,
  exportHref,
}: {
  poll: AdminPoll;
  closing: boolean;
  onClose: () => void;
  exportHref: string;
}) {
  const results = poll.results ?? [];
  const topResults = results.slice(0, 8);
  const winners = poll.winners ?? [];
  const winnerText = winners.length > 0 ? winners.map((winner) => winner.label).join('、') : '尚無';
  const isClosed = poll.status === 'closed' || poll.status === 'archived';

  return (
    <div className="rounded-md border border-foreground/10 bg-background/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black">{poll.title}</h3>
            <span className="rounded-full border border-foreground/10 px-2 py-0.5 text-xs font-black text-foreground/55">
              {poll.status} · {poll.eligibility}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground/55">
            {poll.optionCount} 候選 / {poll.voteCount} 票
            {poll.closesAt ? ` / 已於 ${new Date(poll.closesAt).toLocaleString('zh-TW')} 結束` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref}
            className="inline-flex items-center gap-2 rounded-md border border-foreground/10 px-3 py-2 text-xs font-black text-foreground/70"
          >
            <Download className="h-4 w-4" />
            匯出 CSV
          </a>
          <button
            onClick={onClose}
            disabled={isClosed || closing}
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-xs font-black text-background disabled:cursor-not-allowed disabled:opacity-45"
          >
            {closing ? <Loader2 className="h-4 w-4 animate-spin" /> : <SquareCheckBig className="h-4 w-4" />}
            結束投票
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-foreground/10 bg-foreground/[0.03] p-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-foreground/40">
            <Trophy className="h-4 w-4" />
            Leading
          </div>
          <div className="mt-2 text-xl font-black">{winnerText}</div>
          <p className="mt-1 text-xs text-foreground/50">
            最高 {poll.highestVoteCount ?? 0} 票{poll.isTie ? ' · 目前平手' : ''}
          </p>
        </div>

        <div className="divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {topResults.length > 0 ? topResults.map((result, index) => (
            <div key={result.id} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-3 py-2 text-sm">
              <div className="font-black text-foreground/40">#{index + 1}</div>
              <div className="min-w-0">
                <div className="truncate font-black">{result.label}</div>
                <div className="truncate text-xs text-foreground/45">
                  {result.seat?.seatKey ?? 'seat'} · {result.publicDescription ?? '候選人'}
                </div>
              </div>
              <div className="font-black">{result.voteCount} 票</div>
            </div>
          )) : (
            <div className="px-3 py-5 text-sm text-foreground/45">尚無投票資料，點擊更新票況即可重新讀取。</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border p-3 text-left transition ${
        active ? 'border-emerald-500 bg-emerald-500/10' : 'border-foreground/10 bg-background/60 hover:bg-foreground/[0.05]'
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-black">
        {icon}
        {title}
      </div>
      <p className="mt-1 text-xs text-foreground/50">{description}</p>
    </button>
  );
}
