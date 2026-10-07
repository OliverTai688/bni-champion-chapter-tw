'use client';

import { useState } from 'react';
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
