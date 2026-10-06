import type { CSSProperties } from 'react';
import { STATUS_LABEL } from '@/lib/tbx/labels';
import type { GridSeat, GridSeatView } from '@/server/tbx/grid-seat-map';
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'late' | 'sub' | 'subPending' | 'away' | 'none';

function toneOf(seat: GridSeat): Tone {
  if (!seat.status) return 'none';
  if (seat.status === 'present') return 'ok';
  if (seat.status === 'late') return 'late';
  if (seat.status === 'substitute') return seat.substituteArrived ? 'sub' : 'subPending';
  if (seat.status === 'absent' || seat.status === 'medical') return 'away';
  return 'none';
}

const TONE_STYLE: Record<Tone, CSSProperties> = {
  ok: { borderColor: 'var(--tb-ok)', background: 'var(--tb-ok-soft)' },
  late: { borderColor: 'var(--tb-late)', background: 'var(--tb-late-soft)' },
  sub: { borderColor: 'var(--tb-sub)', background: 'var(--tb-sub-soft)' },
  subPending: { borderColor: 'var(--tb-sub)', borderStyle: 'dashed' },
  away: { borderColor: 'var(--tb-bad)', borderStyle: 'dashed', opacity: 0.6 },
  none: {},
};

const BADGE_CLASS: Partial<Record<GridSeat['tag'], string>> = {
  guest: 'tb-chip-guest',
  host: 'tb-chip-gold',
  proxy: 'tb-chip-substitute',
  host_team: 'tb-chip-gold',
};

function statusText(seat: GridSeat) {
  if (!seat.status) return null;
  if (seat.status === 'substitute') {
    return seat.substituteName ? `代理：${seat.substituteName}${seat.substituteArrived ? '・已到' : '・未到'}` : '代理';
  }
  if (seat.tag === 'guest' && seat.status === 'expected') return null;
  return STATUS_LABEL[seat.status];
}

function Tile({ seat, highlight, showStatus }: { seat: GridSeat; highlight: boolean; showStatus: boolean }) {
  if (!seat.name) {
    return (
      <div className="flex min-h-[64px] items-center justify-center rounded-lg border border-dashed border-tb-line text-xs text-tb-faint">
        {seat.label}
      </div>
    );
  }
  const tone = showStatus ? toneOf(seat) : 'none';
  const status = showStatus ? statusText(seat) : null;
  return (
    <div
      className={cn(
        'relative flex min-h-[64px] flex-col justify-center gap-0.5 rounded-lg border border-tb-line bg-tb-surf px-2 py-1.5',
        highlight && 'ring-2 ring-[var(--tb-gold)]',
      )}
      style={TONE_STYLE[tone]}
      aria-label={[seat.label, seat.badge, seat.name, status].filter(Boolean).join('，')}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="tb-mono text-[10px] text-tb-faint">{seat.zone === 'top' ? '' : seat.label}</span>
        {seat.badge ? <span className={cn('tb-chip px-1.5 py-0 text-[10px]', BADGE_CLASS[seat.tag])}>{seat.badge}</span> : null}
      </div>
      <span className="truncate text-sm font-semibold">{seat.name}</span>
      {status ? <span className="truncate text-[11px] text-tb-muted">{status}</span> : null}
    </div>
  );
}

/** Read-only weekly grid seat map in toolbox styling. Wide grids scroll sideways on phones. */
export function GridView({
  data,
  highlightName,
  showStatus = true,
}: {
  data: GridSeatView;
  highlightName?: string | null;
  showStatus?: boolean;
}) {
  const isHighlighted = (seat: GridSeat) =>
    Boolean(highlightName && (seat.name === highlightName || seat.substituteName === highlightName));

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-fit flex-col gap-3">
        {data.top.length > 0 ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${data.top.length}, minmax(84px, 1fr))` }}>
            {data.top.map((seat) => (
              <Tile key={seat.key} seat={seat} highlight={isHighlighted(seat)} showStatus={showStatus} />
            ))}
          </div>
        ) : null}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${data.columns}, minmax(84px, 1fr))` }}>
          {data.main.map((seat) => (
            <Tile key={seat.key} seat={seat} highlight={isHighlighted(seat)} showStatus={showStatus} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function findGridSeat(data: GridSeatView, query: string) {
  const value = query.trim();
  if (!value) return null;
  return [...data.top, ...data.main].find((seat) => seat.name?.includes(value) || seat.substituteName?.includes(value)) ?? null;
}
