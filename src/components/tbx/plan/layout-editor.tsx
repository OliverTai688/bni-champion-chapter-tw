'use client';

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Minus, Plus, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { saveLayoutAction } from '@/app/(console)/console/venues/actions';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { PLAN_PAD, PlanObjectShape, RoomBackdrop, ScaleBar, planMetrics } from '@/components/tbx/plan/plan-view';
import { TwoStepButton } from '@/components/tbx/plan/two-step';
import {
  FIXED_KIND_LABEL,
  GRID_STEP,
  MAX_LABEL_LENGTH,
  MAX_OBJECTS,
  MAX_SEATS_PER_OBJECT,
  OBJECT_TYPE_LABEL,
  RECT_SIDES_LABEL,
  SEAT_RADIUS,
  clampToRoom,
  countAreaCapacity,
  countSeats,
  deriveSeats,
  localHalfSize,
  rowLetter,
  snapToGrid,
  type FixedKind,
  type PlanObject,
  type PlanSeat,
  type RectSides,
} from '@/lib/tbx/plan';

type PaletteKey = 'round' | 'rect' | 'row' | 'area' | FixedKind;

const PALETTE: Array<{ key: PaletteKey; label: string }> = [
  { key: 'round', label: '圓桌' },
  { key: 'rect', label: '長桌' },
  { key: 'row', label: '排椅' },
  { key: 'area', label: '區域' },
];

const FIXED_PALETTE: Array<{ key: FixedKind; label: string }> = [
  { key: 'stage', label: '講台' },
  { key: 'screen', label: '投影幕' },
  { key: 'door', label: '門' },
  { key: 'pillar', label: '柱' },
  { key: 'desk', label: '報到台' },
];

const FIXED_SIZE: Record<FixedKind, { w: number; h: number }> = {
  stage: { w: 4, h: 1.2 },
  screen: { w: 3, h: 0.2 },
  door: { w: 1.2, h: 0.3 },
  pillar: { w: 0.6, h: 0.6 },
  desk: { w: 1.8, h: 0.6 },
  other: { w: 1, h: 1 },
};

const ROTATIONS = Array.from({ length: 24 }, (_, index) => index * 15);
const ZOOMS = [1, 1.5, 2];

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function newId(taken: Set<string>) {
  let id = '';
  do {
    id = `o${Math.random().toString(36).slice(2, 8)}`;
  } while (taken.has(id));
  return id;
}

function firstFree(taken: Set<string>, make: (index: number) => string) {
  for (let index = 0; index < 1000; index += 1) {
    const label = make(index);
    if (!taken.has(label)) return label;
  }
  return make(0);
}

function rotationOf(object: PlanObject) {
  return object.type === 'area' ? 0 : object.rotation ?? 0;
}

function describe(object: PlanObject) {
  const type = object.type === 'fixed' ? FIXED_KIND_LABEL[object.kind] : OBJECT_TYPE_LABEL[object.type];
  return object.label && object.label !== type ? `${type}　${object.label}` : type;
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  integer,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  integer?: boolean;
  onCommit: (value: number) => void;
}) {
  // While the field has focus it shows exactly what was typed; valid numbers are applied right away.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="tb-label" htmlFor={id}>
      {label}
      <input
        id={id}
        type="number"
        inputMode={integer ? 'numeric' : 'decimal'}
        className="tb-input"
        min={min}
        max={max}
        step={step}
        value={draft ?? String(value)}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = Number(raw);
          if (raw.trim() === '' || !Number.isFinite(parsed)) return;
          onCommit(clampNumber(integer ? Math.round(parsed) : parsed, min, max));
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  );
}

export function LayoutEditor({
  layoutId,
  widthM,
  heightM,
  initialObjects,
}: {
  layoutId: string;
  widthM: number;
  heightM: number;
  initialObjects: PlanObject[];
}) {
  const [objects, setObjects] = useState<PlanObject[]>(initialObjects);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialObjects));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    objX: number;
    objY: number;
    moved: boolean;
  } | null>(null);
  const submittedRef = useRef(savedJson);

  const json = useMemo(() => JSON.stringify(objects), [objects]);
  const dirty = json !== savedJson;
  const selected = objects.find((object) => object.id === selectedId) ?? null;
  const seatCount = countSeats(objects);
  const areaCapacity = countAreaCapacity(objects);
  const full = objects.length >= MAX_OBJECTS;

  const seatsByObject = useMemo(() => {
    const map = new Map<string, PlanSeat[]>();
    for (const seat of deriveSeats(objects)) {
      const list = map.get(seat.objectId);
      if (list) list.push(seat);
      else map.set(seat.objectId, [seat]);
    }
    return map;
  }, [objects]);

  const { viewW, viewH, labelFont } = planMetrics(widthM, heightM);

  function patchObject(id: string, change: (object: PlanObject) => PlanObject) {
    setObjects((current) => current.map((object) => (object.id === id ? clampToRoom(change(object), widthM, heightM) : object)));
  }

  function removeObject(id: string) {
    setObjects((current) => current.filter((object) => object.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }

  function addObject(key: PaletteKey) {
    if (full) return;
    const ids = new Set(objects.map((object) => object.id));
    const labels = new Set(objects.map((object) => object.label));
    const id = newId(ids);
    // New objects appear near the middle; each one a little further so they do not stack exactly.
    const shift = (objects.length % 6) * 0.5;
    const x = snapToGrid(widthM / 2 + shift - 1);
    const y = snapToGrid(heightM / 2 + shift - 1);

    let created: PlanObject;
    if (key === 'round') {
      created = { id, type: 'round', x, y, r: 0.9, seats: 10, label: firstFree(labels, (i) => `${i + 1}桌`), rotation: 0 };
    } else if (key === 'rect') {
      created = {
        id,
        type: 'rect',
        x,
        y,
        w: 1.8,
        h: 0.75,
        seats: 6,
        sides: 'two',
        label: firstFree(labels, (i) => `${i + 1}桌`),
        rotation: 0,
      };
    } else if (key === 'row') {
      created = { id, type: 'row', x, y, seats: 8, spacing: 0.6, label: firstFree(labels, rowLetter), rotation: 0 };
    } else if (key === 'area') {
      created = { id, type: 'area', x, y, w: 4, h: 3, capacity: 20, label: firstFree(labels, (i) => `區域${i + 1}`) };
    } else {
      created = { id, type: 'fixed', kind: key, x, y, ...FIXED_SIZE[key], label: FIXED_KIND_LABEL[key], rotation: 0 };
    }

    const placed = clampToRoom(created, widthM, heightM);
    // Areas go underneath so the tables inside them stay clickable.
    setObjects((current) => (placed.type === 'area' ? [placed, ...current] : [...current, placed]));
    setSelectedId(id);
  }

  function toMetres(event: { clientX: number; clientY: number }) {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function onObjectPointerDown(event: ReactPointerEvent<SVGGElement>, object: PlanObject) {
    if (event.button !== 0) return;
    event.stopPropagation();
    setSelectedId(object.id);
    canvasRef.current?.focus({ preventScroll: true });
    const point = toMetres(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: object.id,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      objX: object.x,
      objY: object.y,
      moved: false,
    };
  }

  function onObjectPointerMove(event: ReactPointerEvent<SVGGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = toMetres(event);
    if (!point) return;
    // A plain click must not move anything: dragging starts after 0.1 m of travel.
    if (!drag.moved && Math.hypot(point.x - drag.startX, point.y - drag.startY) < 0.1) return;
    drag.moved = true;
    const x = snapToGrid(drag.objX + point.x - drag.startX);
    const y = snapToGrid(drag.objY + point.y - drag.startY);
    patchObject(drag.id, (object) => (object.x === x && object.y === y ? object : { ...object, x, y }));
  }

  function onObjectPointerEnd(event: ReactPointerEvent<SVGGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  // Bound to the canvas element only, so typing in the inspector never moves or deletes anything.
  function onCanvasKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!selected) return;
    const step = event.shiftKey ? 1 : GRID_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      patchObject(selected.id, (object) => ({ ...object, x: snapToGrid(object.x + move[0]), y: snapToGrid(object.y + move[1]) }));
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeObject(selected.id);
    } else if (event.key === 'Escape') {
      setSelectedId(null);
    }
  }

  const field = (name: string) => `plan-${selected?.id ?? 'none'}-${name}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="加入物件">
          <span className="text-xs font-semibold text-tb-muted">加入</span>
          {PALETTE.map((item) => (
            <button key={item.key} type="button" className="tb-btn tb-btn-sm" disabled={full} onClick={() => addObject(item.key)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
            </button>
          ))}
          <span className="ml-1 text-xs font-semibold text-tb-muted">固定物</span>
          {FIXED_PALETTE.map((item) => (
            <button key={item.key} type="button" className="tb-btn tb-btn-sm" disabled={full} onClick={() => addObject(item.key)}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {item.label}
            </button>
          ))}
          <span className="flex-1" />
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
            <span className="tb-mono w-10 text-center text-tb-muted">{Math.round(zoom * 100)}%</span>
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

        <div
          ref={canvasRef}
          tabIndex={0}
          role="group"
          aria-label="配置平面圖。點選物件後可拖曳，方向鍵微調位置，Delete 鍵刪除。"
          className="max-h-[78vh] overflow-auto rounded-xl border border-tb-line"
          onKeyDown={onCanvasKeyDown}
        >
          <svg
            ref={svgRef}
            viewBox={`${-PLAN_PAD} ${-PLAN_PAD} ${viewW} ${viewH}`}
            style={{ display: 'block', width: `${zoom * 100}%`, minWidth: 520 * zoom, height: 'auto', userSelect: 'none' }}
            onPointerDown={() => setSelectedId(null)}
          >
            <RoomBackdrop widthM={widthM} heightM={heightM} />
            {objects.map((object) => {
              const { hw, hh } = localHalfSize(object);
              const hitW = Math.max(hw, 0.3);
              const hitH = Math.max(hh, 0.3);
              return (
                <g
                  key={object.id}
                  style={{ cursor: 'move', touchAction: 'none' }}
                  onPointerDown={(event) => onObjectPointerDown(event, object)}
                  onPointerMove={onObjectPointerMove}
                  onPointerUp={onObjectPointerEnd}
                  onPointerCancel={onObjectPointerEnd}
                >
                  <title>{describe(object)}</title>
                  <rect
                    x={-hitW}
                    y={-hitH}
                    width={hitW * 2}
                    height={hitH * 2}
                    fill="transparent"
                    transform={`translate(${object.x} ${object.y}) rotate(${rotationOf(object)})`}
                  />
                  <PlanObjectShape object={object} heightM={heightM} labelFont={labelFont} />
                  {(seatsByObject.get(object.id) ?? []).map((seat) => (
                    <circle
                      key={seat.seatId}
                      cx={seat.x}
                      cy={seat.y}
                      r={SEAT_RADIUS}
                      fill="var(--tb-surf2)"
                      stroke="var(--tb-muted)"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              );
            })}
            {selected ? (
              <rect
                x={-Math.max(localHalfSize(selected).hw, 0.3) - 0.1}
                y={-Math.max(localHalfSize(selected).hh, 0.3) - 0.1}
                width={Math.max(localHalfSize(selected).hw, 0.3) * 2 + 0.2}
                height={Math.max(localHalfSize(selected).hh, 0.3) * 2 + 0.2}
                rx={0.12}
                fill="none"
                stroke="var(--tb-gold)"
                strokeWidth={2}
                strokeDasharray="6 4"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
                transform={`translate(${selected.x} ${selected.y}) rotate(${rotationOf(selected)})`}
              />
            ) : null}
            <ScaleBar widthM={widthM} heightM={heightM} labelFont={labelFont} />
          </svg>
        </div>
        <p className="text-xs text-tb-faint">
          點物件後拖曳移動，會吸附到 0.25 公尺格線並留在牆內。點一下平面圖後可用方向鍵微調（按住 Shift 一次移 1 公尺）、Delete 鍵刪除。格線一格是 1 公尺。
        </p>
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <div className="tb-card">
          <div className="tb-card-body flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="tb-num text-[28px] font-semibold">{seatCount}</span>
              <span className="text-sm text-tb-muted">個座位</span>
              {areaCapacity > 0 ? <span className="text-xs text-tb-faint">另有區域可容納 {areaCapacity} 人</span> : null}
              {dirty ? <span className="tb-chip tb-chip-gold">尚未儲存</span> : <span className="tb-chip tb-chip-plain">已儲存</span>}
            </div>
            <div
              onSubmit={() => {
                submittedRef.current = json;
              }}
            >
              <ActionForm
                action={saveLayoutAction}
                className="flex flex-col gap-2"
                onSuccess={() => setSavedJson(submittedRef.current)}
              >
                <input type="hidden" name="layoutId" value={layoutId} />
                <input type="hidden" name="objects" value={json} />
                <SubmitButton disabled={!dirty} pendingText="儲存中…">
                  儲存配置
                </SubmitButton>
              </ActionForm>
            </div>
            {dirty ? (
              <div>
                <TwoStepButton
                  confirmText="確定放棄修改"
                  onConfirm={() => {
                    setObjects(JSON.parse(savedJson) as PlanObject[]);
                    setSelectedId(null);
                  }}
                >
                  放棄未儲存的修改
                </TwoStepButton>
              </div>
            ) : null}
            {full ? <p className="tb-form-error">已達 {MAX_OBJECTS} 個物件的上限，要再加請先刪除一些。</p> : null}
          </div>
        </div>

        <div className="tb-card">
          <div className="tb-card-head">
            <h2>物件設定</h2>
          </div>
          <div className="tb-card-body flex flex-col gap-3">
            <label className="tb-label" htmlFor="plan-object-picker">
              選取的物件
              <select
                id="plan-object-picker"
                className="tb-select"
                value={selectedId ?? ''}
                onChange={(event) => setSelectedId(event.target.value || null)}
              >
                <option value="">（未選取）</option>
                {objects.map((object) => (
                  <option key={object.id} value={object.id}>
                    {describe(object)}
                  </option>
                ))}
              </select>
            </label>

            {!selected ? (
              <p className="text-sm text-tb-muted">在平面圖上點一個物件，或從上面的選單選一個，就可以改名稱、座位數、尺寸和角度。</p>
            ) : (
              <div key={selected.id} className="flex flex-col gap-3">
                <label className="tb-label" htmlFor={field('label')}>
                  名稱（座位編號會用它開頭）
                  <input
                    id={field('label')}
                    className="tb-input"
                    value={selected.label}
                    maxLength={MAX_LABEL_LENGTH}
                    onChange={(event) => patchObject(selected.id, (object) => ({ ...object, label: event.target.value }))}
                  />
                </label>

                {selected.type === 'fixed' ? (
                  <label className="tb-label" htmlFor={field('kind')}>
                    種類
                    <select
                      id={field('kind')}
                      className="tb-select"
                      value={selected.kind}
                      onChange={(event) =>
                        patchObject(selected.id, (object) =>
                          object.type === 'fixed' ? { ...object, kind: event.target.value as FixedKind } : object,
                        )
                      }
                    >
                      {(Object.keys(FIXED_KIND_LABEL) as FixedKind[]).map((kind) => (
                        <option key={kind} value={kind}>
                          {FIXED_KIND_LABEL[kind]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {selected.type === 'round' || selected.type === 'rect' || selected.type === 'row' ? (
                  <NumberField
                    id={field('seats')}
                    label="座位數"
                    value={selected.seats}
                    min={selected.type === 'row' ? 1 : 0}
                    max={MAX_SEATS_PER_OBJECT}
                    step={1}
                    integer
                    onCommit={(seats) =>
                      patchObject(selected.id, (object) =>
                        object.type === 'round' || object.type === 'rect' || object.type === 'row' ? { ...object, seats } : object,
                      )
                    }
                  />
                ) : null}

                {selected.type === 'area' ? (
                  <NumberField
                    id={field('capacity')}
                    label="可容納人數（不排座位）"
                    value={selected.capacity}
                    min={0}
                    max={5000}
                    step={1}
                    integer
                    onCommit={(capacity) =>
                      patchObject(selected.id, (object) => (object.type === 'area' ? { ...object, capacity } : object))
                    }
                  />
                ) : null}

                {selected.type === 'rect' ? (
                  <label className="tb-label" htmlFor={field('sides')}>
                    座位排在
                    <select
                      id={field('sides')}
                      className="tb-select"
                      value={selected.sides}
                      onChange={(event) =>
                        patchObject(selected.id, (object) =>
                          object.type === 'rect' ? { ...object, sides: event.target.value as RectSides } : object,
                        )
                      }
                    >
                      {(Object.keys(RECT_SIDES_LABEL) as RectSides[]).map((sides) => (
                        <option key={sides} value={sides}>
                          {RECT_SIDES_LABEL[sides]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {selected.type === 'round' ? (
                  <NumberField
                    id={field('r')}
                    label="桌面半徑（公尺）"
                    value={selected.r}
                    min={0.3}
                    max={10}
                    step={0.05}
                    onCommit={(r) => patchObject(selected.id, (object) => (object.type === 'round' ? { ...object, r } : object))}
                  />
                ) : null}

                {selected.type === 'row' ? (
                  <NumberField
                    id={field('spacing')}
                    label="椅距（公尺）"
                    value={selected.spacing}
                    min={0.4}
                    max={5}
                    step={0.05}
                    onCommit={(spacing) =>
                      patchObject(selected.id, (object) => (object.type === 'row' ? { ...object, spacing } : object))
                    }
                  />
                ) : null}

                {selected.type === 'rect' || selected.type === 'area' || selected.type === 'fixed' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      id={field('w')}
                      label="寬（公尺）"
                      value={selected.w}
                      min={0.2}
                      max={Math.max(widthM, heightM)}
                      step={0.05}
                      onCommit={(w) =>
                        patchObject(selected.id, (object) =>
                          object.type === 'rect' || object.type === 'area' || object.type === 'fixed' ? { ...object, w } : object,
                        )
                      }
                    />
                    <NumberField
                      id={field('h')}
                      label="深（公尺）"
                      value={selected.h}
                      min={0.2}
                      max={Math.max(widthM, heightM)}
                      step={0.05}
                      onCommit={(h) =>
                        patchObject(selected.id, (object) =>
                          object.type === 'rect' || object.type === 'area' || object.type === 'fixed' ? { ...object, h } : object,
                        )
                      }
                    />
                  </div>
                ) : null}

                {selected.type !== 'area' ? (
                  <div className="flex items-end gap-2">
                    <label className="tb-label flex-1" htmlFor={field('rotation')}>
                      角度
                      <select
                        id={field('rotation')}
                        className="tb-select"
                        value={ROTATIONS.includes(rotationOf(selected)) ? rotationOf(selected) : 0}
                        onChange={(event) =>
                          patchObject(selected.id, (object) =>
                            object.type === 'area' ? object : { ...object, rotation: Number(event.target.value) },
                          )
                        }
                      >
                        {ROTATIONS.map((degrees) => (
                          <option key={degrees} value={degrees}>
                            {degrees}°
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="tb-btn"
                      aria-label="逆時針轉 15 度"
                      onClick={() =>
                        patchObject(selected.id, (object) =>
                          object.type === 'area' ? object : { ...object, rotation: (rotationOf(object) + 345) % 360 },
                        )
                      }
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="tb-btn"
                      aria-label="順時針轉 15 度"
                      onClick={() =>
                        patchObject(selected.id, (object) =>
                          object.type === 'area' ? object : { ...object, rotation: (rotationOf(object) + 15) % 360 },
                        )
                      }
                    >
                      <RotateCw className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    id={field('x')}
                    label="中心 X（公尺）"
                    value={selected.x}
                    min={0}
                    max={widthM}
                    step={GRID_STEP}
                    onCommit={(x) => patchObject(selected.id, (object) => ({ ...object, x }))}
                  />
                  <NumberField
                    id={field('y')}
                    label="中心 Y（公尺）"
                    value={selected.y}
                    min={0}
                    max={heightM}
                    step={GRID_STEP}
                    onCommit={(y) => patchObject(selected.id, (object) => ({ ...object, y }))}
                  />
                </div>

                <div>
                  <button type="button" className="tb-btn tb-btn-danger tb-btn-sm" onClick={() => removeObject(selected.id)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    刪除這個物件
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
