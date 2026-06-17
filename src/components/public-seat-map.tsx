'use client';

import { CheckCircle2, Circle, MoveHorizontal } from 'lucide-react';
import type { PublicPollDTO, PublicSeatDTO } from '@/application/events/dto';

export function PublicSeatMap({
  seats,
  columns,
  activePoll,
  selectedOptionId,
  onSelectOption,
  attendanceEnabled = false,
  updatingSeatId,
  onAttendanceChange,
}: {
  seats: PublicSeatDTO[];
  columns: number;
  activePoll?: PublicPollDTO | null;
  selectedOptionId?: string | null;
  onSelectOption?: (optionId: string) => void;
  attendanceEnabled?: boolean;
  updatingSeatId?: string | null;
  onAttendanceChange?: (seatId: string, checkedIn: boolean) => void;
}) {
  const topSeats = seats.filter((seat) => seat.zone === 'top').sort((a, b) => a.position - b.position);
  const mainSeats = seats.filter((seat) => seat.zone !== 'top').sort((a, b) => a.position - b.position);
  const clickable = Boolean(activePoll && onSelectOption);

  // Keep each tile readable on phones (min 76px). On wide screens 1fr lets tiles
  // grow to fill; on narrow screens the min width forces horizontal scroll so the
  // spatial seat arrangement is preserved instead of being squeezed unreadable.
  const gridTemplate = `repeat(${columns}, minmax(76px, 1fr))`;

  return (
    <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/35">Seat Map</div>
          <h2 className="mt-1 text-lg font-black sm:text-xl">公開座位圖</h2>
        </div>
        {activePoll ? (
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300">
            {activePoll.eligibility === 'public' ? '公開投票' : '現場代碼投票'}
          </span>
        ) : null}
      </div>

      <SeatLegend />

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <div className="min-w-fit">
          {topSeats.length > 0 ? (
            <div
              className="mb-3 grid gap-2"
              style={{ gridTemplateColumns: `repeat(${Math.min(topSeats.length, columns)}, minmax(76px, 1fr))` }}
            >
              {topSeats.map((seat) => (
                <SeatTile
                  key={seat.id}
                  seat={seat}
                  selected={seat.pollOptionId === selectedOptionId}
                  clickable={clickable && Boolean(seat.pollOptionId)}
                  onClick={seat.pollOptionId && onSelectOption ? () => onSelectOption(seat.pollOptionId ?? '') : undefined}
                  attendanceEnabled={attendanceEnabled}
                  updating={updatingSeatId === seat.id}
                  onAttendanceChange={onAttendanceChange}
                />
              ))}
            </div>
          ) : null}

          <div className="grid gap-2" style={{ gridTemplateColumns: gridTemplate }}>
            {mainSeats.map((seat) => (
              <SeatTile
                key={seat.id}
                seat={seat}
                selected={seat.pollOptionId === selectedOptionId}
                clickable={clickable && Boolean(seat.pollOptionId)}
                onClick={seat.pollOptionId && onSelectOption ? () => onSelectOption(seat.pollOptionId ?? '') : undefined}
                attendanceEnabled={attendanceEnabled}
                updating={updatingSeatId === seat.id}
                onAttendanceChange={onAttendanceChange}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-foreground/35 sm:hidden">
        <MoveHorizontal className="h-3.5 w-3.5" />
        左右滑動可查看完整座位圖
      </p>
    </section>
  );
}

function SeatLegend() {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-foreground/50">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border border-emerald-500/45 bg-emerald-500/30" />
        已抵達
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border border-foreground/20 bg-background" />
        已安排
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-foreground/25 bg-background/40" />
        空位
      </span>
    </div>
  );
}

function SeatTile({
  seat,
  selected,
  clickable,
  onClick,
  attendanceEnabled,
  updating,
  onAttendanceChange,
}: {
  seat: PublicSeatDTO;
  selected: boolean;
  clickable: boolean;
  onClick?: () => void;
  attendanceEnabled: boolean;
  updating: boolean;
  onAttendanceChange?: (seatId: string, checkedIn: boolean) => void;
}) {
  const occupied = Boolean(seat.occupantName);
  const checkedIn = seat.attendanceStatus === 'checked_in';
  const content = (
    <>
      <div className="flex items-center justify-between gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-foreground/35">
        <span>{seat.zone === 'top' ? 'TOP' : seat.seatKey.replace('main-', '')}</span>
        {occupied ? (
          <span className={`inline-flex shrink-0 items-center gap-0.5 ${checkedIn ? 'text-emerald-600 dark:text-emerald-300' : 'text-foreground/35'}`}>
            {checkedIn ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            {checkedIn ? '到' : '未到'}
          </span>
        ) : (
          <span>{seat.label}</span>
        )}
      </div>
      <div className="mt-2 truncate text-sm font-black text-foreground/85">
        {seat.occupantName ?? '空位'}
      </div>
      <div className="mt-1 truncate text-[11px] font-medium text-foreground/45">
        {seat.role ?? seat.kind}
      </div>
      {attendanceEnabled && occupied && onAttendanceChange ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAttendanceChange(seat.id, !checkedIn);
          }}
          disabled={updating}
          className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
            checkedIn
              ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-foreground text-background hover:opacity-90'
          }`}
        >
          {updating ? '更新中' : checkedIn ? '取消抵達' : '抵達'}
        </button>
      ) : null}
    </>
  );

  const className = `flex min-h-[92px] flex-col rounded-lg border p-2.5 text-left transition ${
    selected
      ? 'border-emerald-500 bg-emerald-500/15 shadow-[0_0_0_2px_rgba(16,185,129,0.18)]'
      : checkedIn
        ? 'border-emerald-500/45 bg-emerald-500/10'
        : occupied
          ? 'border-foreground/15 bg-background/80'
        : 'border-dashed border-foreground/15 bg-background/35 opacity-55'
  } ${clickable ? 'cursor-pointer hover:border-emerald-500/70 hover:bg-emerald-500/10' : ''}`;

  if (clickable) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
