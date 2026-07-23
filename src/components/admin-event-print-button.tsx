'use client';

import { Printer } from 'lucide-react';

export function AdminEventPrintButton({ weekId }: { weekId: string }) {
  const handlePrint = () => {
    window.open(`/seats/print?weekId=${encodeURIComponent(weekId)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handlePrint}
      type="button"
      className="inline-flex items-center gap-2 rounded-md border border-foreground/10 bg-background/70 px-3 py-2 text-xs font-black text-foreground/70 transition hover:bg-foreground/[0.06]"
    >
      <Printer className="h-4 w-4" />
      匯出出席 PDF
    </button>
  );
}
