'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus, Loader2, TableProperties } from 'lucide-react';
import { AdminPollControls } from '@/components/admin-poll-controls';

export type AdminEventSession = {
  weekId: string;
  date: string;
  title: string;
  chapterName: string;
  meetingLabel: string;
  publicStatus: string;
  publicSlug: string | null;
  latestSeatMap: {
    id: string;
    title: string;
    status: string;
    version: number;
    seatCount: number;
    assignmentCount: number;
    updatedAt: string;
  } | null;
  pollCount: number;
  openPollCount: number;
};

export function AdminEventSessionManager({
  initialSessions,
  initialWeekId,
}: {
  initialSessions: AdminEventSession[];
  initialWeekId: string;
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [selectedWeekId, setSelectedWeekId] = useState(initialWeekId);
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.weekId === selectedWeekId) ?? sessions[0] ?? null,
    [selectedWeekId, sessions],
  );

  async function createSession() {
    setCreating(true);
    setMessage(null);

    const response = await fetch('/admin/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, title }),
    });
    const data = await response.json();
    setCreating(false);

    if (!response.ok || !data.session) {
      setMessage(data?.message ?? '建立座位表失敗。');
      return;
    }

    setSessions((current) => {
      const next = current.filter((session) => session.weekId !== data.session.weekId);
      return [data.session, ...next].sort((a, b) => b.weekId.localeCompare(a.weekId));
    });
    setSelectedWeekId(data.session.weekId);
    setDate('');
    setTitle('');
    setMessage(`已建立 ${data.session.title}，請確認此日期後再建立投票。`);
  }

  return (
    <>
      <section className="mt-8 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-foreground/35">Event Seat Maps</div>
            <h2 className="mt-1 text-xl font-black">活動座位表</h2>
            <p className="mt-1 text-sm text-foreground/55">
              先選擇或建立日期，再針對該天座位表建立投票活動。
            </p>
          </div>
          <div className="rounded-md border border-foreground/10 bg-background/70 px-3 py-2 text-xs font-black text-foreground/55">
            {sessions.length} 天
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">Seat Map</span>
            <select
              value={selectedSession?.weekId ?? ''}
              onChange={(event) => setSelectedWeekId(event.target.value)}
              className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
            >
              {sessions.map((session) => (
                <option key={session.weekId} value={session.weekId}>
                  {session.weekId} · {session.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">New Date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
            />
          </label>

          <button
            onClick={createSession}
            disabled={creating || !date}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-black text-background disabled:cursor-not-allowed disabled:opacity-50 lg:self-end"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
            建立座位表
          </button>
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">Optional Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="留空會自動產生，例如 115/06/18 座位表"
            className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
          />
        </label>

        {selectedSession ? (
          <div className="mt-4 grid gap-3 rounded-md border border-foreground/10 bg-background/70 p-4 text-sm sm:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div className="flex min-w-0 items-center gap-2">
              <TableProperties className="h-4 w-4 shrink-0 text-foreground/35" />
              <div className="min-w-0">
                <div className="truncate font-black">{selectedSession.title}</div>
                <div className="truncate text-xs text-foreground/45">{selectedSession.weekId} · {selectedSession.meetingLabel}</div>
              </div>
            </div>
            <div className="text-foreground/60">
              {selectedSession.latestSeatMap
                ? `${selectedSession.latestSeatMap.assignmentCount}/${selectedSession.latestSeatMap.seatCount} 已安排`
                : '尚無座位圖'}
            </div>
            <div className="text-foreground/60">
              {selectedSession.openPollCount} 開放投票 / {selectedSession.pollCount} 總投票
            </div>
          </div>
        ) : null}

        {message ? <p className="mt-4 text-sm font-medium text-foreground/65">{message}</p> : null}
      </section>

      {selectedSession ? <AdminPollControls key={selectedSession.weekId} weekId={selectedSession.weekId} /> : null}
    </>
  );
}
