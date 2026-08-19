'use client';

import { useState } from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

export function AdminEventExcelExportButton({ weekId }: { weekId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/events/${encodeURIComponent(weekId)}/attendance-export`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? '匯出出席 Excel 失敗');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${weekId}-attendance.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯出出席 Excel 失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleExport}
        disabled={busy}
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-foreground/10 bg-background/70 px-3 py-2 text-xs font-black text-foreground/70 transition hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
        匯出出席 Excel
      </button>
      {error ? <span className="text-[11px] font-medium text-red-600 dark:text-red-300">{error}</span> : null}
    </div>
  );
}
