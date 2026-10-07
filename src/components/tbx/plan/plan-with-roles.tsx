'use client';

import { useRef, useState, type FormEvent } from 'react';
import { PlanView } from '@/components/tbx/plan/plan-view';
import { ROLE_STYLE, buildRoleLegend, type MeetingRole } from '@/lib/tbx/roles';
import type { SeatPlanViewData } from '@/server/tbx/seat-plan';

/** Key for the role tags: one line per role with the people who hold it. */
export function RoleLegend({ seats }: { seats: ReadonlyArray<{ name: string | null; roles?: readonly MeetingRole[] }> }) {
  const entries = buildRoleLegend(seats);
  if (entries.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm" aria-label="會議角色">
      {entries.map((entry) => (
        <li key={`${entry.kind}:${entry.label}`} className="flex items-baseline gap-2">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center self-center rounded text-[11px] font-extrabold"
            style={ROLE_STYLE[entry.kind]}
            aria-hidden="true"
          >
            {entry.short}
          </span>
          <span className="w-16 shrink-0 font-semibold">{entry.label}</span>
          <span className="min-w-0 text-tb-muted">{entry.people.join('、')}</span>
        </li>
      ))}
    </ul>
  );
}

/** Floor plan with a switch that shows or hides everyone's meeting roles. */
export function PlanWithRoles({
  data,
  highlightParticipationId,
  showNames = false,
  defaultShowRoles = false,
}: {
  data: SeatPlanViewData;
  highlightParticipationId?: string | null;
  showNames?: boolean;
  defaultShowRoles?: boolean;
}) {
  const [showRoles, setShowRoles] = useState(defaultShowRoles);
  const hasRoles = data.seats.some((seat) => seat.roles.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {hasRoles ? (
        <label className="inline-flex min-h-[32px] items-center gap-2 self-start text-sm font-semibold text-tb-muted">
          <input type="checkbox" checked={showRoles} onChange={(event) => setShowRoles(event.target.checked)} />
          顯示會議角色
        </label>
      ) : null}
      <PlanView data={data} highlightParticipationId={highlightParticipationId} showNames={showNames} showRoles={showRoles} />
      {showRoles ? <RoleLegend seats={data.seats} /> : null}
    </div>
  );
}

/**
 * Public seat finder: type a name and the seat shows at once, without reloading the page.
 * `initialQuery` keeps shared `?q=` links working.
 */
export function SeatFinder({ data, initialQuery = '' }: { data: SeatPlanViewData; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  // "Not found" is only said after the button is pressed, never while someone is still typing.
  const [asked, setAsked] = useState(Boolean(initialQuery.trim()));
  const [showRoles, setShowRoles] = useState(false);
  const topRef = useRef<HTMLFormElement>(null);

  const needle = query.trim();
  const matches = needle
    ? data.seats.filter((seat) => seat.participationId && (seat.name?.includes(needle) || seat.substituteName?.includes(needle)))
    : [];
  const found = matches.find((seat) => seat.name === needle || seat.substituteName === needle) ?? (matches.length === 1 ? matches[0] : null);
  const hasRoles = data.seats.some((seat) => seat.roles.length > 0);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAsked(true);
    // Close the phone keyboard so the answer is not hidden behind it.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    topRef.current?.scrollIntoView({ block: 'start' });
  }

  return (
    <div className="flex flex-col gap-3">
      <form ref={topRef} onSubmit={onSubmit} className="flex scroll-mt-4 items-center gap-2" role="search">
        <label className="sr-only" htmlFor="seat-q">
          輸入姓名找座位
        </label>
        <input
          id="seat-q"
          name="q"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setAsked(false);
          }}
          placeholder="輸入姓名找座位"
          className="tb-input min-w-0 flex-1"
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" className="tb-btn tb-btn-gold shrink-0">
          找座位
        </button>
      </form>

      <div aria-live="polite">
        {found ? (
          <div className="tb-banner tb-banner-ok">
            <span className="min-w-0 flex-1 text-sm font-semibold">{found.substituteName ?? found.name} 的座位</span>
            <span className="tb-num text-[28px] font-bold leading-none text-tb-gold">{found.label}</span>
          </div>
        ) : matches.length > 1 ? (
          <div className="tb-banner">
            <span className="text-sm">
              <b>有 {matches.length} 位符合</b>，請輸入完整姓名：
              {matches
                .slice(0, 8)
                .map((seat) => `${seat.substituteName ?? seat.name}（${seat.label}）`)
                .join('、')}
              {matches.length > 8 ? '…' : ''}
            </span>
          </div>
        ) : needle && asked ? (
          <div className="tb-banner tb-banner-bad">
            <span className="text-sm">座位表上找不到「{needle}」。請確認姓名，或詢問報到台。</span>
          </div>
        ) : null}
      </div>

      {hasRoles ? (
        <label className="inline-flex min-h-[32px] items-center gap-2 self-start text-sm font-semibold text-tb-muted">
          <input type="checkbox" checked={showRoles} onChange={(event) => setShowRoles(event.target.checked)} />
          顯示會議角色
        </label>
      ) : null}
      <PlanView data={data} highlightParticipationId={found?.participationId ?? null} showNames showRoles={showRoles} />
      {showRoles ? <RoleLegend seats={data.seats} /> : null}
    </div>
  );
}
