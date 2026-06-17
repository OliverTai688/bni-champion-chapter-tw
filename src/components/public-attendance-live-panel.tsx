'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, UsersRound } from 'lucide-react';
import type { PublicWeeklyEventDTO } from '@/application/events/dto';
import { PublicSeatMap } from '@/components/public-seat-map';

export function PublicAttendanceLivePanel({ initialEvent }: { initialEvent: PublicWeeklyEventDTO }) {
  const [event, setEvent] = useState(initialEvent);
  const [updatingSeatId, setUpdatingSeatId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  const openPoll = useMemo(() => event.polls.find((poll) => poll.status === 'open') ?? null, [event.polls]);
  const checkedInRate = event.seatSummary.occupiedSeats > 0
    ? Math.round((event.seatSummary.checkedInCount / event.seatSummary.occupiedSeats) * 100)
    : 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch(`/api/public/events/${event.slug}`, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error('讀取公開頁狀態失敗。');
          return response.json() as Promise<PublicWeeklyEventDTO>;
        })
        .then(setEvent)
        .catch(() => {});
    }, 5000);

    return () => window.clearInterval(timer);
  }, [event.slug]);

  useEffect(() => {
    if (!message || message.tone !== 'ok') return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function updateAttendance(seatId: string, checkedIn: boolean) {
    setUpdatingSeatId(seatId);
    setMessage(null);

    try {
      const response = await fetch(`/api/public/events/${event.slug}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, checkedIn }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? '更新抵達狀態失敗。');

      setEvent(data);
      setMessage({ text: checkedIn ? '已標記抵達，公開頁將同步更新。' : '已取消抵達標記。', tone: 'ok' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '更新抵達狀態失敗。', tone: 'error' });
    } finally {
      setUpdatingSeatId(null);
    }
  }

  return (
    <div className="contents">
      <div className="grid gap-3">
        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-foreground/35">
                <LiveDot />
                Live Summary
              </div>
              <h2 className="mt-1 text-lg font-black sm:text-xl">座位與出席</h2>
            </div>
            <UsersRound className="h-6 w-6 text-foreground/35" />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="總座位" value={event.seatSummary.totalSeats} />
            <Stat label="已安排" value={event.seatSummary.occupiedSeats} />
            <Stat label="已抵達" value={event.seatSummary.checkedInCount} accent />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-foreground/50">
              <span>整體報到率</span>
              <span>{checkedInRate}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                style={{ width: `${checkedInRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-foreground/70">
            <CheckCircle2 className="h-4 w-4" />
            區域狀態
          </div>
          <div className="space-y-3">
            {event.occupancyByZone.length > 0 ? event.occupancyByZone.map((zone) => (
              <div key={zone.zone}>
                <div className="mb-1 flex justify-between text-xs font-bold text-foreground/50">
                  <span>{zone.zone}</span>
                  <span>{zone.checkedInCount}/{zone.occupiedSeats} 已抵達</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                    style={{ width: `${zone.occupiedSeats > 0 ? Math.min(100, (zone.checkedInCount / zone.occupiedSeats) * 100) : 0}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-sm text-foreground/50">尚未發布座位統計。</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 lg:col-span-2 lg:mt-8">
        <PublicSeatMap
          seats={event.seatMap.seats}
          columns={event.seatMap.columns}
          activePoll={openPoll}
          attendanceEnabled
          updatingSeatId={updatingSeatId}
          onAttendanceChange={updateAttendance}
        />
      </div>

      {message ? (
        <div
          className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-lg backdrop-blur sm:left-auto sm:right-6 sm:mx-0 ${
            message.tone === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {updatingSeatId ? <Loader2 className="mr-1.5 inline h-4 w-4 animate-spin" /> : null}
          {message.text}
        </div>
      ) : null}
    </div>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? 'bg-emerald-500/10' : 'bg-background/70'}`}>
      <div className={`text-2xl font-black ${accent ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>{value}</div>
      <div className="mt-1 text-xs font-bold text-foreground/45">{label}</div>
    </div>
  );
}
