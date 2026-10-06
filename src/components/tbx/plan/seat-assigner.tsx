'use client';

import { useMemo, useRef, useState } from 'react';
import { Minus, Plus, Search, Wand2 } from 'lucide-react';
import { saveSeatAssignmentsAction } from '@/app/(console)/console/events/[eventKey]/seating/actions';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { PlanCanvas, type CanvasSeat, type SeatTone } from '@/components/tbx/plan/plan-view';
import { TwoStepButton } from '@/components/tbx/plan/two-step';
import { StatusChip } from '@/components/tbx/ui';
import { STATUS_LABEL, type ParticipationStatusKey } from '@/lib/tbx/labels';
import { deriveSeats, type PlanObject } from '@/lib/tbx/plan';
import { cn } from '@/lib/utils';

export interface AssignPerson {
  id: string;
  displayName: string;
  kind: 'member' | 'guest';
  status: ParticipationStatusKey;
  substituteName: string | null;
  substituteArrived: boolean;
}

type Assignments = Record<string, string>;
type KindFilter = 'all' | 'member' | 'guest';

/** 0 = fit the whole plan in the panel; 1 = names at a readable size (the plan may scroll). */
const ZOOMS = [0, 1, 1.5, 2];

const KIND_FILTERS: Array<{ key: KindFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'member', label: '會員' },
  { key: 'guest', label: '來賓' },
];

function onLeave(person: AssignPerson) {
  return person.status === 'absent' || person.status === 'medical';
}

function toneOf(person: AssignPerson): SeatTone {
  if (onLeave(person)) return 'absent';
  if (person.status === 'substitute') return person.substituteArrived ? 'substitute' : 'substitute-pending';
  if (person.status === 'present' || person.status === 'late') return person.kind === 'guest' ? 'guest' : person.status;
  return 'expected';
}

function stateText(person: AssignPerson) {
  if (person.status === 'substitute') {
    return `代理${person.substituteName ? `：${person.substituteName}` : ''}，${person.substituteArrived ? '已到' : '未到'}`;
  }
  const base = STATUS_LABEL[person.status];
  return person.kind === 'guest' ? `來賓，${base}` : base;
}

export function SeatAssigner({
  eventKey,
  widthM,
  heightM,
  objects,
  initialAssignments,
  people,
}: {
  eventKey: string;
  widthM: number;
  heightM: number;
  objects: PlanObject[];
  initialAssignments: Assignments;
  people: AssignPerson[];
}) {
  const [assignments, setAssignments] = useState<Assignments>(initialAssignments);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialAssignments));
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [showNames, setShowNames] = useState(true);
  const [zoom, setZoom] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const submittedRef = useRef(savedJson);

  const seats = useMemo(() => deriveSeats(objects), [objects]);
  const seatById = useMemo(() => new Map(seats.map((seat) => [seat.seatId, seat])), [seats]);
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);

  // The attendance list can change while this page is open (a guest removed, for example):
  // only pairs whose seat and person both still exist count.
  const clean = useMemo(() => {
    const out: Assignments = {};
    const seen = new Set<string>();
    for (const seat of seats) {
      const personId = assignments[seat.seatId];
      if (!personId || !personById.has(personId) || seen.has(personId)) continue;
      seen.add(personId);
      out[seat.seatId] = personId;
    }
    return out;
  }, [assignments, seats, personById]);

  const seatByPerson = useMemo(() => {
    const map = new Map<string, string>();
    for (const [seatId, personId] of Object.entries(clean)) map.set(personId, seatId);
    return map;
  }, [clean]);

  const json = useMemo(() => JSON.stringify(clean), [clean]);
  const dirty = json !== savedJson;

  const seatedCount = seatByPerson.size;
  const emptySeats = seats.length - seatedCount;
  const unseated = people.filter((person) => !seatByPerson.has(person.id));
  const unseatedComing = unseated.filter((person) => !onLeave(person));
  const selectedPerson = selectedPersonId ? personById.get(selectedPersonId) ?? null : null;
  const selectedSeat = selectedSeatId ? seatById.get(selectedSeatId) ?? null : null;
  const selectedPersonSeat = selectedPerson ? seatById.get(seatByPerson.get(selectedPerson.id) ?? '') ?? null : null;

  function clearSelection() {
    setSelectedPersonId(null);
    setSelectedSeatId(null);
  }

  /** Seats the person. If someone already sits there and the person had a seat, the two swap. */
  function place(personId: string, seatId: string) {
    setAssignments(() => {
      const next = { ...clean };
      const occupant = next[seatId];
      const from = seatByPerson.get(personId);
      if (from) delete next[from];
      if (occupant && occupant !== personId && from) next[from] = occupant;
      next[seatId] = personId;
      return next;
    });
    setNotice(null);
    clearSelection();
  }

  function unseat(personId: string) {
    const seatId = seatByPerson.get(personId);
    if (!seatId) return;
    setAssignments(() => {
      const next = { ...clean };
      delete next[seatId];
      return next;
    });
    setNotice(null);
    clearSelection();
  }

  function onSeatClick(seatId: string) {
    const occupant = clean[seatId] ?? null;
    if (selectedPersonId && personById.has(selectedPersonId)) {
      if (occupant === selectedPersonId) clearSelection();
      else place(selectedPersonId, seatId);
      return;
    }
    if (occupant) {
      setSelectedPersonId(occupant);
      setSelectedSeatId(seatId);
      return;
    }
    setSelectedSeatId((current) => (current === seatId ? null : seatId));
  }

  function onPersonClick(personId: string) {
    if (selectedSeatId && !selectedPersonId && !clean[selectedSeatId]) {
      place(personId, selectedSeatId);
      return;
    }
    if (selectedPersonId === personId) {
      clearSelection();
      return;
    }
    setSelectedPersonId(personId);
    setSelectedSeatId(seatByPerson.get(personId) ?? null);
  }

  function autoFill() {
    const queue = [
      ...unseatedComing.filter((person) => person.kind === 'member'),
      ...unseatedComing.filter((person) => person.kind === 'guest'),
    ];
    const next = { ...clean };
    let placed = 0;
    for (const seat of seats) {
      if (placed >= queue.length) break;
      if (next[seat.seatId]) continue;
      next[seat.seatId] = queue[placed].id;
      placed += 1;
    }
    setAssignments(next);
    clearSelection();
    const left = queue.length - placed;
    if (queue.length === 0) setNotice('沒有需要排入的人：未排座的人都已請假，或大家都有座位了。');
    else if (left > 0) setNotice(`已排入 ${placed} 人，座位不夠，還有 ${left} 人沒有位子。記得按「儲存座位」。`);
    else setNotice(`已排入 ${placed} 人。確認後記得按「儲存座位」。`);
  }

  const canvasSeats: CanvasSeat[] = seats.map((seat) => {
    const person = personById.get(clean[seat.seatId] ?? '');
    const ring = seat.seatId === selectedSeatId || (Boolean(person) && person!.id === selectedPersonId);
    if (!person) {
      return { seatId: seat.seatId, label: seat.label, x: seat.x, y: seat.y, tone: 'empty', name: null, title: `${seat.label} 空位`, ring };
    }
    return {
      seatId: seat.seatId,
      label: seat.label,
      x: seat.x,
      y: seat.y,
      tone: toneOf(person),
      name: person.status === 'substitute' && person.substituteName ? person.substituteName : person.displayName,
      title: `${seat.label} ${person.displayName}（${stateText(person)}）`,
      ring,
    };
  });

  const needle = query.trim().toLowerCase();
  const matches = (person: AssignPerson) =>
    (kindFilter === 'all' || person.kind === kindFilter) &&
    (!needle ||
      person.displayName.toLowerCase().includes(needle) ||
      (person.substituteName ?? '').toLowerCase().includes(needle));
  const listUnseated = unseated.filter(matches);
  const listSeated = people.filter((person) => seatByPerson.has(person.id)).filter(matches);

  const leaveSeated = people.filter((person) => onLeave(person) && seatByPerson.has(person.id));
  const substitutes = people.filter((person) => person.status === 'substitute' && seatByPerson.has(person.id));

  function personRow(person: AssignPerson) {
    const seat = seatById.get(seatByPerson.get(person.id) ?? '');
    const active = person.id === selectedPersonId;
    return (
      <li key={person.id}>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onPersonClick(person.id)}
          className={cn(
            'flex min-h-[44px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left',
            active ? 'border-tb-gold bg-tb-gold-soft' : 'border-tb-line bg-tb-surf hover:bg-tb-surf2',
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-tb-text">{person.displayName}</span>
            {person.status === 'substitute' && person.substituteName ? (
              <span className="block truncate text-xs text-tb-sub">代理人：{person.substituteName}</span>
            ) : null}
          </span>
          <StatusChip status={person.status} substituteArrived={person.substituteArrived} guest={person.kind === 'guest'} />
          <span className={cn('tb-mono w-14 shrink-0 text-right', seat ? 'text-tb-muted' : 'text-tb-faint')}>
            {seat ? seat.label : '未排'}
          </span>
        </button>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="text-sm">
          <span className="tb-num text-[26px] font-semibold">{seatedCount}</span>
          <span className="text-tb-faint"> / {seats.length} 個座位已排</span>
        </span>
        <span className="text-sm text-tb-muted">未排座 {unseatedComing.length} 人</span>
        {dirty ? <span className="tb-chip tb-chip-gold">尚未儲存</span> : <span className="tb-chip tb-chip-plain">已儲存</span>}
        <span className="flex-1" />
        <div
          onSubmit={() => {
            submittedRef.current = json;
          }}
        >
          <ActionForm
            action={saveSeatAssignmentsAction}
            className="flex flex-wrap items-center gap-3"
            onSuccess={() => {
              setSavedJson(submittedRef.current);
              setNotice(null);
            }}
          >
            <input type="hidden" name="eventKey" value={eventKey} />
            <input type="hidden" name="assignments" value={json} />
            <SubmitButton disabled={!dirty} pendingText="儲存中…">
              儲存座位
            </SubmitButton>
          </ActionForm>
        </div>
      </div>

      {unseatedComing.length > emptySeats ? (
        <div className="tb-banner tb-banner-bad" role="status">
          <span className="text-sm">
            <b>座位不夠</b>：還有 {unseatedComing.length} 人未排座，只剩 {emptySeats} 個空位。可以到場地庫加座位後按「更換配置」重排。
          </span>
        </div>
      ) : null}

      {leaveSeated.length > 0 || substitutes.length > 0 ? (
        <div className="tb-banner" role="status">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {leaveSeated.length > 0 ? (
              <div className="flex flex-col gap-1">
                <b className="text-sm">{leaveSeated.length} 位已請假的人還排在座位上</b>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {leaveSeated.map((person) => (
                    <li key={person.id} className="inline-flex items-center gap-2 rounded-lg border border-tb-line bg-tb-surf px-2 py-1 text-xs">
                      <span>
                        {person.displayName}（{STATUS_LABEL[person.status]}）・{seatById.get(seatByPerson.get(person.id) ?? '')?.label}
                      </span>
                      <button type="button" className="tb-btn tb-btn-sm" onClick={() => unseat(person.id)}>
                        移出座位
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {substitutes.length > 0 ? (
              <p className="text-sm text-tb-muted">
                <b className="text-tb-text">{substitutes.length} 位由代理人出席</b>，座位上顯示代理人姓名：
                {substitutes
                  .map(
                    (person) =>
                      `${person.displayName} → ${person.substituteName ?? '代理人'}（${seatById.get(seatByPerson.get(person.id) ?? '')?.label ?? ''}）`,
                  )
                  .join('、')}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-h-[44px] flex-wrap items-center gap-2 rounded-lg border border-tb-line bg-tb-surf px-3 py-2 text-sm" aria-live="polite">
            {selectedPerson ? (
              <>
                <span className="min-w-0 flex-1">
                  正在安排 <b>{selectedPerson.displayName}</b>
                  {selectedPersonSeat ? `（目前在 ${selectedPersonSeat.label}）：點另一個座位可以換位。` : '：點平面圖上的座位讓他入座。'}
                </span>
                {selectedPersonSeat ? (
                  <button type="button" className="tb-btn tb-btn-sm" onClick={() => unseat(selectedPerson.id)}>
                    移出座位
                  </button>
                ) : null}
                <button type="button" className="tb-btn tb-btn-quiet tb-btn-sm" onClick={clearSelection}>
                  取消選取
                </button>
              </>
            ) : selectedSeat ? (
              <>
                <span className="min-w-0 flex-1">
                  已選空位 <b className="tb-mono">{selectedSeat.label}</b>：點右邊名單上的人讓他入座。
                </span>
                <button type="button" className="tb-btn tb-btn-quiet tb-btn-sm" onClick={clearSelection}>
                  取消選取
                </button>
              </>
            ) : (
              <span className="text-tb-muted">先點名單上的人，再點座位。點已有人的座位可以換位或移出。</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="tb-btn tb-btn-outline tb-btn-sm" onClick={autoFill} disabled={emptySeats === 0}>
              <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
              自動排入未排座的人
            </button>
            <TwoStepButton
              confirmText="確定清空"
              disabled={seatedCount === 0}
              onConfirm={() => {
                setAssignments({});
                setNotice('已清空座位。按「儲存座位」後才會生效。');
                clearSelection();
              }}
            >
              清空座位
            </TwoStepButton>
            <span className="flex-1" />
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-tb-muted" htmlFor="seat-assign-names">
              <input
                id="seat-assign-names"
                type="checkbox"
                checked={showNames}
                onChange={(event) => setShowNames(event.target.checked)}
              />
              在座位上顯示姓名
            </label>
            <span className="inline-flex items-center gap-1">
              <button
                type="button"
                className="tb-btn tb-btn-sm"
                aria-label="縮小平面圖"
                disabled={zoom === ZOOMS[0]}
                onClick={() => setZoom((current) => ZOOMS[Math.max(0, ZOOMS.indexOf(current) - 1)])}
              >
                <Minus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <span className="tb-mono w-10 text-center text-tb-muted">{zoom === 0 ? '全圖' : `${Math.round(zoom * 100)}%`}</span>
              <button
                type="button"
                className="tb-btn tb-btn-sm"
                aria-label="放大平面圖"
                disabled={zoom === ZOOMS[ZOOMS.length - 1]}
                onClick={() => setZoom((current) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(current) + 1)])}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          </div>
          {notice ? (
            <p role="status" className="text-sm text-tb-muted">
              {notice}
            </p>
          ) : null}

          <PlanCanvas
            widthM={widthM}
            heightM={heightM}
            objects={objects}
            seats={canvasSeats}
            names={showNames ? 'always' : 'none'}
            zoom={zoom === 0 ? 1 : zoom}
            fit={zoom === 0}
            onSeatClick={onSeatClick}
            className="max-h-[78vh] rounded-xl border border-tb-line"
            ariaLabel="座位平面圖，點座位安排入座"
          />

          <div className="flex flex-wrap gap-2" aria-label="顏色說明">
            <span className="tb-chip tb-chip-present">已簽到</span>
            <span className="tb-chip tb-chip-late">遲到</span>
            <span className="tb-chip tb-chip-substitute">代理</span>
            <span className="tb-chip tb-chip-guest">來賓已到</span>
            <span className="tb-chip tb-chip-absent">請假（虛線）</span>
            <span className="tb-chip">未到</span>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          <label className="tb-label" htmlFor="seat-assign-search">
            搜尋姓名
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tb-faint" aria-hidden="true" />
              <input
                id="seat-assign-search"
                type="search"
                className="tb-input"
                style={{ paddingLeft: 34 }}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="會員、來賓或代理人"
              />
            </span>
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="名單篩選">
            {KIND_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={kindFilter === item.key}
                className={cn('tb-btn tb-btn-sm', kindFilter === item.key && 'tb-btn-outline')}
                onClick={() => setKindFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex max-h-[78vh] flex-col gap-3 overflow-y-auto pr-1">
            <section className="flex flex-col gap-2" aria-label="未排座">
              <h3 className="tb-eyebrow">未排座（{listUnseated.length}）</h3>
              {listUnseated.length > 0 ? (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{listUnseated.map(personRow)}</ul>
              ) : (
                <p className="text-sm text-tb-muted">{needle || kindFilter !== 'all' ? '沒有符合條件的人。' : '每個人都有座位了。'}</p>
              )}
            </section>
            <section className="flex flex-col gap-2" aria-label="已排座">
              <h3 className="tb-eyebrow">已排座（{listSeated.length}）</h3>
              {listSeated.length > 0 ? (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{listSeated.map(personRow)}</ul>
              ) : (
                <p className="text-sm text-tb-muted">{needle || kindFilter !== 'all' ? '沒有符合條件的人。' : '還沒有人入座。'}</p>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
