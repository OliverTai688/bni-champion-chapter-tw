'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Loader2, TriangleAlert } from 'lucide-react';

export type SeatMapIndexSession = {
  weekId: string;
  date: string;
  title: string;
  meetingLabel: string;
  latestSeatMap: {
    seatCount: number;
    assignmentCount: number;
  } | null;
};

type SourceKind = 'latest_event' | 'selected_event' | 'base_template' | 'named_template';

export type SeatTemplateOption = {
  id: string;
  name: string;
  description: string | null;
  sourceWeekId: string | null;
  seatCount: number;
  assignmentCount: number;
};

export function SeatMapCreatePanel({
  sessions,
  templates,
}: {
  sessions: SeatMapIndexSession[];
  templates: SeatTemplateOption[];
}) {
  const router = useRouter();
  const [targetDate, setTargetDate] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [sourceKind, setSourceKind] = useState<SourceKind>(templates[0] ? 'named_template' : 'latest_event');
  const [sourceWeekId, setSourceWeekId] = useState(sessions[0]?.weekId ?? '');
  const [sourceTemplateId, setSourceTemplateId] = useState(templates[0]?.id ?? '');
  const [registrationMode, setRegistrationMode] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  const selectedSource = useMemo(
    () => sessions.find((session) => session.weekId === sourceWeekId) ?? sessions[0] ?? null,
    [sessions, sourceWeekId],
  );

  async function createSeatMap() {
    setLoading(true);
    setMessage(null);
    setConflict(null);

    const response = await fetch('/api/seats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetDate,
        targetTitle,
        sourceKind,
        sourceWeekId: sourceKind === 'selected_event' ? sourceWeekId : undefined,
        sourceTemplateId: sourceKind === 'named_template' ? sourceTemplateId : undefined,
        confirmOverwrite,
        registrationMode,
      }),
    });
    const data = await response.json();
    setLoading(false);

    if (response.status === 409) {
      setConflict(data?.message ?? '此日期已存在。');
      setConfirmOverwrite(true);
      return;
    }

    if (!response.ok) {
      setMessage(data?.message ?? '建立座位表失敗。');
      return;
    }

    setMessage('已建立座位表，正在開啟編輯器。');
    router.push(data.editUrl);
    router.refresh();
  }

  return (
    <section className="mb-6 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-foreground/35">Create</div>
          <h2 className="mt-1 text-xl font-black">建立新的活動座位表</h2>
          <p className="mt-1 text-sm text-foreground/55">
            選擇日期與複製來源，建立後會進入該日期的座位編輯器。
          </p>
        </div>
        <button
          onClick={createSeatMap}
          disabled={loading || !targetDate}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-black text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
          {confirmOverwrite ? '確認覆蓋並建立版本' : '建立座位表'}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.8fr_1fr_1fr]">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">Target Date</span>
          <input
            type="date"
            value={targetDate}
            onChange={(event) => {
              setTargetDate(event.target.value);
              setConfirmOverwrite(false);
              setConflict(null);
            }}
            className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
          />
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">Optional Title</span>
          <input
            type="text"
            value={targetTitle}
            onChange={(event) => setTargetTitle(event.target.value)}
            placeholder="留空會自動產生，例如 115/06/18 座位表"
            className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
          />
        </label>

        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">Source</span>
          <select
            value={sourceKind}
            onChange={(event) => setSourceKind(event.target.value as SourceKind)}
            className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
          >
            {templates.length > 0 ? <option value="named_template">使用命名模板</option> : null}
            <option value="latest_event">複製最近一場活動</option>
            <option value="selected_event">手動選擇活動複製</option>
            <option value="base_template">使用基礎模板</option>
          </select>
        </label>
      </div>

      {sourceKind === 'selected_event' ? (
        <label className="mt-3 block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">Source Event</span>
          <select
            value={sourceWeekId}
            onChange={(event) => setSourceWeekId(event.target.value)}
            className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
          >
            {sessions.map((session) => (
              <option key={session.weekId} value={session.weekId}>
                {session.weekId} · {session.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {sourceKind === 'named_template' ? (
        <label className="mt-3 block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">Named Template</span>
          <select
            value={sourceTemplateId}
            onChange={(event) => setSourceTemplateId(event.target.value)}
            className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.assignmentCount}/{template.seatCount}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="mt-4 rounded-md border border-foreground/10 bg-background/60 px-4 py-3 text-sm text-foreground/60">
        {sourceKind === 'base_template' ? (
          <span>將使用目前程式內建的 BNI 基礎座位模板。</span>
        ) : sourceKind === 'named_template' ? (
          <span>
            命名模板：
            {templates.find((template) => template.id === sourceTemplateId)?.name ?? '尚未選擇模板'}
          </span>
        ) : (
          <span>
            複製來源：{selectedSource ? `${selectedSource.weekId} · ${selectedSource.title}` : '尚無可複製活動'}
            {selectedSource?.latestSeatMap
              ? ` · ${selectedSource.latestSeatMap.assignmentCount}/${selectedSource.latestSeatMap.seatCount} 已安排`
              : ''}
          </span>
        )}
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-foreground/10 bg-background/60 px-4 py-3">
        <input
          type="checkbox"
          checked={registrationMode}
          onChange={(event) => setRegistrationMode(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-emerald-600"
        />
        <span className="text-sm">
          <span className="font-black">來賓統計活動（攜伴人數）</span>
          <span className="mt-0.5 block text-foreground/55">
            公開頁會顯示「報名總人數」，每位到場成員可登記本人＋朋友的人數。不勾選則維持一般排座與報到。
          </span>
        </span>
      </label>

      {conflict ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-black">目標日期已存在</div>
            <p className="mt-1">{conflict} 再按一次會覆蓋該日期的草稿座位圖並建立新版本。</p>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className={`mt-3 text-sm font-medium ${message.includes('失敗') ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
