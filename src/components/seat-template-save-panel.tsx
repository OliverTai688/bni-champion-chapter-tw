'use client';

import { useState } from 'react';
import { BookmarkPlus, Loader2 } from 'lucide-react';

export function SeatTemplateSavePanel({
  weekId,
  defaultName,
}: {
  weekId: string;
  defaultName: string;
}) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveTemplate() {
    setSaving(true);
    setMessage(null);

    const response = await fetch('/api/seat-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceWeekId: weekId,
        name,
        description,
      }),
    });
    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setMessage(data?.message ?? '儲存模板失敗。');
      return;
    }

    setMessage(`已儲存模板：${data.template.name}`);
  }

  return (
    <section className="mb-6 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-foreground/35">Reusable Template</div>
          <h2 className="mt-1 text-xl font-black">儲存成命名模板</h2>
          <p className="mt-1 text-sm text-foreground/55">
            將此活動目前的最新座位圖保存為可重複使用的來源，之後建立新日期時可以直接選用。
          </p>
        </div>
        <button
          onClick={saveTemplate}
          disabled={saving || !name.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-black text-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkPlus className="h-4 w-4" />}
          儲存模板
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">Template Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
          />
        </label>
        <label className="block">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-foreground/40">Description</span>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="例如：每週例會標準版、招商日、來賓較多版本"
            className="mt-1 w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm font-bold"
          />
        </label>
      </div>

      {message ? (
        <p className={`mt-3 text-sm font-medium ${message.includes('失敗') ? 'text-red-600 dark:text-red-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
