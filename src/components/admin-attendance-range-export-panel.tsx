'use client';

import { useState } from 'react';
import { CalendarRange, FileSpreadsheet, Loader2 } from 'lucide-react';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function AdminAttendanceRangeExportPanel() {
  const [from, setFrom] = useState(daysAgoIsoDate(84));
  const [to, setTo] = useState(todayIsoDate());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  const handleExport = async () => {
    if (!from || !to) {
      setMessage({ text: '請選擇起訖日期。', tone: 'error' });
      return;
    }
    if (from > to) {
      setMessage({ text: '起始日期不可晚於結束日期。', tone: 'error' });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/attendance/range-export?from=${from}&to=${to}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? '匯出出席統計失敗');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-summary-${from}_${to}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({ text: '已匯出區間出席統計 Excel。', tone: 'ok' });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : '匯出出席統計失敗', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-8">
      <div className="rounded-lg border border-foreground/10 bg-foreground/[0.03] px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-foreground/80">
              <CalendarRange className="h-4 w-4" />
              出席統計匯出
            </div>
            <p className="mt-1 text-xs text-foreground/55">
              選擇一段時間，匯出期間內每位正式會員擔任代理人與未出席的次數。
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-bold text-foreground/55">
            起始日期
            <input
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
              className="rounded-md border border-foreground/15 bg-background/70 px-3 py-2 text-xs font-bold text-foreground/80"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-foreground/55">
            結束日期
            <input
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              className="rounded-md border border-foreground/15 bg-background/70 px-3 py-2 text-xs font-bold text-foreground/80"
            />
          </label>
          <button
            onClick={handleExport}
            disabled={busy}
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-xs font-black text-background transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            匯出區間出席 Excel
          </button>
        </div>

        {message ? (
          <p className={`mt-3 text-xs font-medium ${message.tone === 'error' ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
            {message.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
