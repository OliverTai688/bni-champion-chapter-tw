'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Minus, Plus, UsersRound, X } from 'lucide-react';
import type { PublicSeatDTO, PublicWeeklyEventDTO } from '@/application/events/dto';
import { PublicSeatMap } from '@/components/public-seat-map';

// Recompute the summary/zone counters locally so optimistic toggles update the
// whole panel instantly; the 5s poll later reconciles with the server truth.
function applyAttendance(
  event: PublicWeeklyEventDTO,
  seatId: string,
  checkedIn: boolean,
  headcount?: number,
): PublicWeeklyEventDTO {
  const seats = event.seatMap.seats.map((seat) => {
    if (seat.id !== seatId) return seat;
    // Party size only applies while checked in; reset to 1 on un-check.
    const nextHeadcount = checkedIn ? Math.max(1, headcount ?? seat.headcount) : 1;
    return { ...seat, attendanceStatus: checkedIn ? 'checked_in' : 'assigned', headcount: nextHeadcount };
  });
  const checkedInSeats = seats.filter((seat) => seat.attendanceStatus === 'checked_in');

  return {
    ...event,
    seatSummary: {
      ...event.seatSummary,
      checkedInCount: checkedInSeats.length,
      totalHeadcount: checkedInSeats.reduce((sum, seat) => sum + Math.max(1, seat.headcount), 0),
    },
    occupancyByZone: event.occupancyByZone.map((zone) => ({
      ...zone,
      checkedInCount: checkedInSeats.filter((seat) => seat.zone === zone.zone).length,
    })),
    seatMap: { ...event.seatMap, seats },
  };
}

export function PublicAttendanceLivePanel({ initialEvent }: { initialEvent: PublicWeeklyEventDTO }) {
  const [event, setEvent] = useState(initialEvent);
  const [pendingSeatIds, setPendingSeatIds] = useState<Set<string>>(() => new Set());
  const [manageSeatId, setManageSeatId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const pendingRef = useRef(pendingSeatIds);

  useEffect(() => {
    pendingRef.current = pendingSeatIds;
  }, [pendingSeatIds]);

  const openPoll = useMemo(() => event.polls.find((poll) => poll.status === 'open') ?? null, [event.polls]);
  const manageSeat = manageSeatId ? event.seatMap.seats.find((seat) => seat.id === manageSeatId) ?? null : null;
  const checkedInRate = event.seatSummary.occupiedSeats > 0
    ? Math.round((event.seatSummary.checkedInCount / event.seatSummary.occupiedSeats) * 100)
    : 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      // Skip while a toggle is in flight so the poll never reverts an optimistic change.
      if (pendingRef.current.size > 0) return;
      void fetch(`/api/public/events/${event.slug}`, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error('讀取公開頁狀態失敗。');
          return response.json() as Promise<PublicWeeklyEventDTO>;
        })
        .then((next) => {
          if (pendingRef.current.size === 0) setEvent(next);
        })
        .catch(() => {});
    }, 5000);

    return () => window.clearInterval(timer);
  }, [event.slug]);

  useEffect(() => {
    if (!message || message.tone !== 'ok') return;
    const timer = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function updateAttendance(seatId: string, checkedIn: boolean, headcount?: number) {
    const previousSeat = event.seatMap.seats.find((seat) => seat.id === seatId);
    const previousStatus = previousSeat?.attendanceStatus ?? 'assigned';
    const previousHeadcount = previousSeat?.headcount ?? 1;

    // Optimistic: flip the seat and counters immediately.
    setEvent((current) => applyAttendance(current, seatId, checkedIn, headcount));
    setPendingSeatIds((current) => new Set(current).add(seatId));
    setMessage(null);

    try {
      const response = await fetch(`/api/public/events/${event.slug}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, checkedIn, headcount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message ?? '更新抵達狀態失敗。');

      setMessage({ text: checkedIn ? '已更新報名。' : '已取消抵達。', tone: 'ok' });
    } catch (error) {
      // Roll back just this seat to its previous status and party size.
      setEvent((current) =>
        applyAttendance(current, seatId, previousStatus === 'checked_in', previousHeadcount),
      );
      setMessage({ text: error instanceof Error ? error.message : '更新抵達狀態失敗。', tone: 'error' });
    } finally {
      setPendingSeatIds((current) => {
        const next = new Set(current);
        next.delete(seatId);
        return next;
      });
    }
  }

  function changeHeadcount(seatId: string, headcount: number) {
    // Adjusting party size keeps the seat checked in; clamp to a sane minimum.
    updateAttendance(seatId, true, Math.max(1, headcount));
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

          {event.registrationMode ? (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-3">
              <div>
                <div className="text-xs font-bold text-foreground/45">報名總人數（含攜伴）</div>
                <div className="mt-0.5 text-[11px] font-medium text-foreground/40">已抵達 {event.seatSummary.checkedInCount} 席 · 含本人與朋友</div>
              </div>
              <div className="text-3xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">
                {event.seatSummary.totalHeadcount}
              </div>
            </div>
          ) : null}

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
          registrationMode={event.registrationMode}
          pendingSeatIds={pendingSeatIds}
          onAttendanceChange={updateAttendance}
          onManageSeat={setManageSeatId}
        />
      </div>

      {manageSeat && manageSeat.attendanceStatus === 'checked_in' ? (
        <SeatManageDialog
          seat={manageSeat}
          updating={pendingSeatIds.has(manageSeat.id)}
          onHeadcountChange={(headcount) => changeHeadcount(manageSeat.id, headcount)}
          onCancelAttendance={() => {
            updateAttendance(manageSeat.id, false);
            setManageSeatId(null);
          }}
          onClose={() => setManageSeatId(null)}
        />
      ) : null}

      {message ? (
        <div
          className={`fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-lg backdrop-blur sm:left-auto sm:right-6 sm:mx-0 ${
            message.tone === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          }`}
        >
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
      <div className={`text-2xl font-black tabular-nums ${accent ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>{value}</div>
      <div className="mt-1 text-xs font-bold text-foreground/45">{label}</div>
    </div>
  );
}

// Deliberate management popup so party-size changes and the destructive
// cancel-attendance action can't be triggered by an accidental tap on the list.
function SeatManageDialog({
  seat,
  updating,
  onHeadcountChange,
  onCancelAttendance,
  onClose,
}: {
  seat: PublicSeatDTO;
  updating: boolean;
  onHeadcountChange: (headcount: number) => void;
  onCancelAttendance: () => void;
  onClose: () => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const headcount = Math.max(1, seat.headcount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/35">報名管理</div>
            <h3 className="mt-1 text-lg font-black">{seat.occupantName}</h3>
            <p className="text-xs font-medium text-foreground/45">{seat.role ?? seat.kind} · 已抵達</p>
          </div>
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className="rounded-md p-1 text-foreground/40 transition hover:bg-foreground/5 hover:text-foreground/70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
          <div className="text-xs font-bold text-foreground/50">出席人數（本人＋朋友）</div>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="減少人數"
              onClick={() => onHeadcountChange(headcount - 1)}
              disabled={updating || headcount <= 1}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-foreground/15 bg-background text-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="text-4xl font-black tabular-nums">{headcount}</div>
              <div className="text-xs font-bold text-foreground/40">人</div>
            </div>
            <button
              type="button"
              aria-label="增加人數"
              onClick={() => onHeadcountChange(headcount + 1)}
              disabled={updating}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-300"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          {confirmCancel ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-sm font-bold text-red-700 dark:text-red-300">確定要取消「{seat.occupantName}」的抵達？</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  disabled={updating}
                  className="rounded-md border border-foreground/15 px-3 py-2 text-sm font-black text-foreground/70 transition hover:bg-foreground/5 disabled:opacity-50"
                >
                  返回
                </button>
                <button
                  type="button"
                  onClick={onCancelAttendance}
                  disabled={updating}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  確定取消抵達
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              disabled={updating}
              className="w-full rounded-md border border-red-500/25 px-3 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-500/5 disabled:opacity-50 dark:text-red-300"
            >
              取消抵達
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-md bg-foreground px-3 py-2.5 text-sm font-black text-background transition hover:opacity-90"
        >
          完成
        </button>
      </div>
    </div>
  );
}
