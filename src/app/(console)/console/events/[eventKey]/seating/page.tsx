import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, ConfirmSubmit, SubmitButton } from '@/components/tbx/client';
import { SeatAssigner, type AssignPerson } from '@/components/tbx/plan/seat-assigner';
import { Card, Empty } from '@/components/tbx/ui';
import { deriveSeats } from '@/lib/tbx/plan';
import { getEventByKey } from '@/server/tbx/events';
import { getAttendance } from '@/server/tbx/participation';
import { getEventSeatPlan, listLayoutOptions } from '@/server/tbx/seat-plan';
import { createSeatPlanAction, discardSeatPlanAction } from './actions';

export default async function EventSeatingPage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  const event = await getEventByKey(eventKey);
  if (!event) notFound();

  const legacyHref = `/seats/${encodeURIComponent(event.weekId)}`;
  const plan = await getEventSeatPlan(event.id);

  if (!plan) {
    const groups = await listLayoutOptions();
    return (
      <div className="flex flex-col gap-5">
        {groups.length === 0 ? (
          <Empty
            title="還沒有可以用的場地配置"
            hint="座位表要從場地庫的配置開始。先到場地庫建立場地並畫好配置，再回來這裡選用。"
            action={
              <Link href="/console/venues" className="tb-btn tb-btn-gold">
                前往場地庫
              </Link>
            }
          />
        ) : (
          <Card title="建立座位表" aside={<span>選一個場地配置開始</span>}>
            <ActionForm action={createSeatPlanAction} className="flex max-w-[520px] flex-col gap-3">
              <input type="hidden" name="eventKey" value={event.weekId} />
              <label className="tb-label" htmlFor="seat-plan-layout">
                場地配置
                <select id="seat-plan-layout" name="layoutId" className="tb-select" required defaultValue="">
                  <option value="" disabled>
                    請選擇
                  </option>
                  {groups.map((group) => (
                    <optgroup key={group.venueId} label={group.venueName}>
                      {group.layouts.map((layout) => (
                        <option key={layout.id} value={layout.id}>
                          {layout.name}（{layout.seatCount} 位）
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <p className="text-xs text-tb-faint">
                會把這個配置複製一份給這場活動，之後在場地庫修改配置不會影響這張座位表。找不到合適的配置可以到
                <Link href="/console/venues" className="mx-1 text-tb-gold">
                  場地庫
                </Link>
                新增。
              </p>
              <div>
                <SubmitButton pendingText="建立中…">建立座位表</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        )}
        <p className="text-sm text-tb-muted">
          每週例會目前使用的格狀排座仍然可以用：
          <Link href={legacyHref} className="ml-1 text-tb-gold">
            使用現行格狀排座
          </Link>
        </p>
      </div>
    );
  }

  const { rows } = await getAttendance(event.id);
  const people: AssignPerson[] = rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    kind: row.kind,
    status: row.status,
    substituteName: row.status === 'substitute' ? row.substituteName : null,
    substituteArrived: row.status === 'substitute' && Boolean(row.substituteArrivedAt),
  }));

  // Drop pairs that point at a seat or a person that no longer exists.
  const seatIds = new Set(deriveSeats(plan.objects).map((seat) => seat.seatId));
  const personIds = new Set(people.map((person) => person.id));
  const assignments: Record<string, string> = {};
  for (const [seatId, participationId] of Object.entries(plan.assignments)) {
    if (seatIds.has(seatId) && personIds.has(participationId)) assignments[seatId] = participationId;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="tb-eyebrow">場地配置</div>
          <p className="mt-0.5 text-sm">
            <span className="font-semibold">{plan.venueName ?? '未命名場地'}</span>
            <span className="tb-mono ml-3 text-tb-faint">
              {plan.widthM} × {plan.heightM} m・{seatIds.size} 位
            </span>
          </p>
        </div>
        <Link href={legacyHref} className="tb-btn tb-btn-quiet tb-btn-sm">
          使用現行格狀排座
        </Link>
        <ActionForm action={discardSeatPlanAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="eventKey" value={event.weekId} />
          <ConfirmSubmit confirmText="確定更換，目前排好的座位會清掉">更換配置</ConfirmSubmit>
        </ActionForm>
      </div>

      <SeatAssigner
        key={plan.id}
        eventKey={event.weekId}
        widthM={plan.widthM}
        heightM={plan.heightM}
        objects={plan.objects}
        initialAssignments={assignments}
        people={people}
      />
    </div>
  );
}
