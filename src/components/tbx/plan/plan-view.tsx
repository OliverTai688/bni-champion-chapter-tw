// Floor plan renderer. No 'use client' on purpose: these components have no hooks,
// so they render inside Server Components and can also be reused by the client editors.
import type { KeyboardEvent, ReactNode } from 'react';
import { STATUS_LABEL } from '@/lib/tbx/labels';
import { SEAT_RADIUS, bodyHalfSize, deriveSeats, type PlanObject } from '@/lib/tbx/plan';
import { ROLE_STYLE, roleSummary, type MeetingRole } from '@/lib/tbx/roles';
import { cn } from '@/lib/utils';
import type { SeatPlanViewData, SeatPlanViewSeat } from '@/server/tbx/seat-plan';

/** Space around the room inside the viewBox, in metres. */
export const PLAN_PAD = 0.3;
const ROOM_FILL = '#161a20';
const GRID_STROKE = 'rgba(255, 255, 255, 0.045)';
/** Smallest size, in CSS pixels, at which a name is drawn on the plan. */
const NAME_MIN_PX = 10;
const LABEL_MIN_PX = 9;
/** Widest plan we force (with horizontal scrolling) to keep inline names readable. */
const NAME_MAX_WIDTH_PX = 1280;

export type SeatTone =
  | 'empty'
  | 'expected'
  | 'present'
  | 'late'
  | 'substitute'
  | 'substitute-pending'
  | 'absent'
  | 'guest';

export interface CanvasSeat {
  seatId: string;
  label: string;
  x: number;
  y: number;
  tone: SeatTone;
  /** Drawn on the seat when names are shown inline. */
  name: string | null;
  /** Tooltip (`<title>`), also the accessible name of a clickable seat. */
  title: string;
  /** Gold ring: "this is the seat you are looking for" or the current selection. */
  ring?: boolean;
  /** Meeting roles of the person on the seat; drawn as small tags when the canvas has `showRoles`. */
  roles?: MeetingRole[];
}

/** Most role tags drawn on one seat; a person with more gets a "+" tag. */
const MAX_ROLE_TAGS = 3;

const TONE_STYLE: Record<SeatTone, { color: string; soft: string; solid: boolean; dashed: boolean }> = {
  empty: { color: 'var(--tb-wall)', soft: 'transparent', solid: false, dashed: false },
  expected: { color: 'var(--tb-muted)', soft: 'var(--tb-surf2)', solid: false, dashed: false },
  present: { color: 'var(--tb-ok)', soft: 'var(--tb-ok-soft)', solid: true, dashed: false },
  late: { color: 'var(--tb-late)', soft: 'var(--tb-late-soft)', solid: true, dashed: false },
  substitute: { color: 'var(--tb-sub)', soft: 'var(--tb-sub-soft)', solid: true, dashed: false },
  'substitute-pending': { color: 'var(--tb-sub)', soft: 'var(--tb-sub-soft)', solid: false, dashed: false },
  absent: { color: 'var(--tb-bad)', soft: 'transparent', solid: false, dashed: true },
  guest: { color: 'var(--tb-guest)', soft: 'var(--tb-guest-soft)', solid: true, dashed: false },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Rough text width in "full-width characters": CJK counts 1, Latin and digits about half. */
export function textUnits(value: string) {
  let units = 0;
  for (const char of value) units += char.charCodeAt(0) > 0x2e7f ? 1 : 0.56;
  return units;
}

function truncateUnits(value: string, maxUnits: number) {
  if (textUnits(value) <= maxUnits) return value;
  let out = '';
  let units = 0;
  for (const char of value) {
    const next = char.charCodeAt(0) > 0x2e7f ? 1 : 0.56;
    if (units + next > maxUnits - 0.6) break;
    out += char;
    units += next;
  }
  return `${out}…`;
}

/** Distance between the two closest seats, which decides how much room a name has. */
function nearestPitch(seats: Array<{ x: number; y: number }>) {
  let best = Infinity;
  for (let i = 0; i < seats.length; i += 1) {
    for (let j = i + 1; j < seats.length; j += 1) {
      const dx = seats[i].x - seats[j].x;
      const dy = seats[i].y - seats[j].y;
      const d = dx * dx + dy * dy;
      if (d < best) best = d;
    }
  }
  return Number.isFinite(best) ? Math.sqrt(best) : 0.8;
}

export interface PlanMetrics {
  viewW: number;
  viewH: number;
  /** Font size of object labels, in metres. */
  labelFont: number;
  /** Height reserved under the room for the scale bar, in metres. */
  barH: number;
}

export function planMetrics(widthM: number, heightM: number, withScaleBar = true): PlanMetrics {
  const viewW = widthM + PLAN_PAD * 2;
  const labelFont = clamp(viewW / 42, 0.3, 0.5);
  const barH = withScaleBar ? labelFont * 2.1 : 0;
  return { viewW, viewH: heightM + PLAN_PAD * 2 + barH, labelFont, barH };
}

/** Floor, 1 m grid and walls. */
export function RoomBackdrop({ widthM, heightM }: { widthM: number; heightM: number }) {
  let grid = '';
  for (let x = 1; x < widthM; x += 1) grid += `M${x} 0V${heightM}`;
  for (let y = 1; y < heightM; y += 1) grid += `M0 ${y}H${widthM}`;
  return (
    <g>
      <rect x={0} y={0} width={widthM} height={heightM} fill={ROOM_FILL} />
      {grid ? <path d={grid} stroke={GRID_STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" fill="none" /> : null}
      <rect
        x={0}
        y={0}
        width={widthM}
        height={heightM}
        fill="none"
        stroke="var(--tb-wall)"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

/** 0–2–4 m ruler under the room (1 m steps for small rooms, 5 m for very large ones). */
export function ScaleBar({ widthM, heightM, labelFont }: { widthM: number; heightM: number; labelFont: number }) {
  const step = widthM >= 40 ? 5 : widthM >= 6 ? 2 : 1;
  const y = heightM + PLAN_PAD + labelFont * 0.35;
  const tick = labelFont * 0.4;
  const font = labelFont * 0.8;
  return (
    <g aria-hidden="true">
      <path
        d={`M0 ${y + tick}V${y}H${step * 2}V${y + tick}M${step} ${y}V${y + tick}`}
        fill="none"
        stroke="var(--tb-faint)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      {[0, step, step * 2].map((value, index) => (
        <text
          key={value}
          x={value}
          y={y + tick + font * 0.95}
          fontSize={font}
          textAnchor={index === 0 ? 'start' : 'middle'}
          fill="var(--tb-faint)"
        >
          {index === 2 ? `${value} m` : value}
        </text>
      ))}
    </g>
  );
}

function objectRotation(object: PlanObject) {
  return object.type === 'area' ? 0 : object.rotation ?? 0;
}

/** Table, row guide, area or fixed object, without its chairs. */
export function PlanObjectShape({
  object,
  heightM,
  labelFont,
  showLabel = true,
}: {
  object: PlanObject;
  heightM: number;
  labelFont: number;
  showLabel?: boolean;
}) {
  const rotation = objectRotation(object);
  const { hw, hh } = bodyHalfSize(object);
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  // Body box after rotation: labels stay horizontal, so they are fitted against this box.
  const boxW = (hw * cos + hh * sin) * 2;
  const boxH = (hw * sin + hh * cos) * 2;

  let body: ReactNode = null;
  if (object.type === 'round') {
    body = <circle r={object.r} fill="var(--tb-surf2)" stroke="var(--tb-wall)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />;
  } else if (object.type === 'rect') {
    body = (
      <rect
        x={-hw}
        y={-hh}
        width={object.w}
        height={object.h}
        rx={Math.min(0.08, hh)}
        fill="var(--tb-surf2)"
        stroke="var(--tb-wall)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    );
  } else if (object.type === 'row') {
    body = <line x1={-hw} y1={0} x2={hw} y2={0} stroke="var(--tb-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />;
  } else if (object.type === 'area') {
    body = (
      <rect
        x={-hw}
        y={-hh}
        width={object.w}
        height={object.h}
        rx={0.12}
        fill="rgba(255, 255, 255, 0.03)"
        stroke="var(--tb-faint)"
        strokeWidth={1.5}
        strokeDasharray="6 5"
        vectorEffect="non-scaling-stroke"
      />
    );
  } else {
    const fill =
      object.kind === 'pillar'
        ? 'var(--tb-wall)'
        : object.kind === 'door'
          ? 'var(--tb-bg)'
          : object.kind === 'screen'
            ? 'var(--tb-muted)'
            : object.kind === 'other'
              ? 'transparent'
              : 'var(--tb-surf)';
    body = (
      <rect
        x={-hw}
        y={-hh}
        width={object.w}
        height={object.h}
        rx={object.kind === 'stage' ? 0.1 : 0.04}
        fill={fill}
        stroke={object.kind === 'door' ? 'var(--tb-text)' : 'var(--tb-wall)'}
        strokeWidth={object.kind === 'door' ? 2 : 1.5}
        vectorEffect="non-scaling-stroke"
      />
    );
  }

  let label: ReactNode = null;
  const caption = object.type === 'area' && object.capacity > 0 ? `${object.label}・${object.capacity} 人` : object.label;
  if (showLabel && caption) {
    const units = Math.max(textUnits(caption), 1);
    if (object.type === 'row') {
      // Rows have no body: the label sits just before the first chair, clear of the role tags on it.
      const offset = hw + labelFont;
      const lx = object.x - offset * Math.cos(rad);
      const ly = object.y - offset * Math.sin(rad);
      label = (
        <text x={lx} y={ly} fontSize={labelFont * 0.8} textAnchor="middle" dominantBaseline="central" fill="var(--tb-faint)" fontWeight={700}>
          {truncateUnits(caption, 4)}
        </text>
      );
    } else {
      const fitted = Math.min(labelFont, boxH * 0.8, (boxW * 0.92) / units);
      const inside = object.type !== 'fixed' || fitted >= labelFont * 0.7;
      if (inside) {
        label = (
          <text
            x={object.x}
            y={object.y}
            fontSize={Math.max(fitted, labelFont * 0.45)}
            textAnchor="middle"
            dominantBaseline="central"
            fill={object.type === 'fixed' || object.type === 'area' ? 'var(--tb-faint)' : 'var(--tb-muted)'}
            fontWeight={700}
          >
            {caption}
          </text>
        );
      } else {
        // Thin fixtures (doors, screens, pillars): the label goes beside them, towards the middle of the room.
        const font = labelFont * 0.8;
        const below = object.y < heightM / 2;
        label = (
          <text
            x={object.x}
            y={below ? object.y + boxH / 2 + font * 0.8 : object.y - boxH / 2 - font * 0.8}
            fontSize={font}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--tb-faint)"
            fontWeight={700}
          >
            {truncateUnits(caption, 8)}
          </text>
        );
      }
    }
  }

  return (
    <g>
      <g transform={`translate(${object.x} ${object.y}) rotate(${rotation})`}>{body}</g>
      {label}
    </g>
  );
}

export interface PlanCanvasProps {
  widthM: number;
  heightM: number;
  objects: PlanObject[];
  seats: CanvasSeat[];
  /**
   * `none`: coloured dots only. `auto`: names on the seats when they stay readable,
   * otherwise dots with the name in the tooltip. `always`: names on the seats, the
   * plan grows (and scrolls) as much as needed.
   */
  names?: 'none' | 'auto' | 'always';
  /** Thumbnail mode: no labels, no scale bar, no minimum width. */
  compact?: boolean;
  /** Multiplies the rendered width; the wrapper scrolls. */
  zoom?: number;
  /** Always fit the container width, even when that makes inline names small (the viewer has a zoom control). */
  fit?: boolean;
  /** Draw each person's meeting roles (主, 值, 音, 新, 導…) as tags on the seat. */
  showRoles?: boolean;
  className?: string;
  ariaLabel?: string;
  onSeatClick?: (seatId: string) => void;
}

export function PlanCanvas({
  widthM,
  heightM,
  objects,
  seats,
  names = 'none',
  compact = false,
  zoom = 1,
  fit = false,
  showRoles = false,
  className,
  ariaLabel,
  onSeatClick,
}: PlanCanvasProps) {
  const metrics = planMetrics(widthM, heightM, !compact);
  const { viewW, viewH } = metrics;
  const pitch = clamp(nearestPitch(seats), 0.3, 1.1);
  const nameFont = clamp(pitch * 0.3, 0.1, 0.3);
  const nameWidthPx = Math.ceil((NAME_MIN_PX / nameFont) * viewW);
  const inline = !compact && (names === 'always' || (names === 'auto' && nameWidthPx <= NAME_MAX_WIDTH_PX));
  // With names on the seats the plan is drawn larger, so object labels can be smaller in metres.
  const labelFont = inline ? clamp(nameFont * 1.5, 0.22, metrics.labelFont) : metrics.labelFont;
  const labelWidthPx = Math.min(Math.ceil((LABEL_MIN_PX / metrics.labelFont) * viewW), 900);
  const minWidth = compact ? undefined : Math.round((inline && !fit ? nameWidthPx : labelWidthPx) * zoom);

  const dotR = Math.min(SEAT_RADIUS, pitch * 0.42);
  const pillW = Math.min(pitch * 0.94, 1.3);
  const pillH = nameFont * 1.75;
  const nameBudget = (pillW * 0.9) / nameFont;

  // Role tags sit on the top-left corner of the name pill, or just above a dot.
  function roleTags(seat: CanvasSeat, left: number, top: number, tagH: number) {
    if (!showRoles || compact || !seat.roles?.length) return null;
    const tagW = tagH * 1.05;
    const gap = tagH * 0.12;
    const shown = seat.roles.slice(0, MAX_ROLE_TAGS);
    const more = seat.roles.length > MAX_ROLE_TAGS;
    return (
      <g aria-hidden="true">
        {shown.map((role, index) => {
          const style = ROLE_STYLE[role.kind];
          const x = left + index * (tagW + gap);
          const overflow = more && index === MAX_ROLE_TAGS - 1;
          return (
            <g key={`${role.kind}:${role.label}`}>
              <rect x={x} y={top} width={tagW} height={tagH} rx={tagH * 0.28} fill={overflow ? 'var(--tb-muted)' : style.background} />
              <text
                x={x + tagW / 2}
                y={top + tagH / 2}
                fontSize={tagH * 0.74}
                textAnchor="middle"
                dominantBaseline="central"
                fill={overflow ? 'var(--tb-bg)' : style.color}
                fontWeight={800}
              >
                {overflow ? '+' : role.short}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  const seatNodes = seats.map((seat) => {
    const tone = TONE_STYLE[seat.tone];
    const showName = inline && seat.name;
    let shape: ReactNode;

    if (showName) {
      const text = truncateUnits(seat.name!, Math.max(nameBudget * 1.5, 4.7));
      const squeeze = textUnits(text) > nameBudget;
      shape = (
        <>
          <rect x={-pillW / 2} y={-pillH / 2} width={pillW} height={pillH} rx={pillH * 0.3} fill="var(--tb-surf)" />
          <rect
            x={-pillW / 2}
            y={-pillH / 2}
            width={pillW}
            height={pillH}
            rx={pillH * 0.3}
            fill={tone.soft}
            stroke={tone.color}
            strokeWidth={tone.solid ? 2 : 1.5}
            strokeDasharray={tone.dashed ? '4 3' : undefined}
            vectorEffect="non-scaling-stroke"
          />
          <text
            fontSize={nameFont}
            textAnchor="middle"
            dominantBaseline="central"
            fill={seat.tone === 'absent' ? 'var(--tb-muted)' : 'var(--tb-text)'}
            fontWeight={600}
            textLength={squeeze ? pillW * 0.9 : undefined}
            lengthAdjust={squeeze ? 'spacingAndGlyphs' : undefined}
          >
            {text}
          </text>
          {seat.ring ? (
            <rect
              x={-pillW / 2 - 0.06}
              y={-pillH / 2 - 0.06}
              width={pillW + 0.12}
              height={pillH + 0.12}
              rx={pillH * 0.3 + 0.06}
              fill="none"
              stroke="var(--tb-gold)"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {roleTags(seat, -pillW / 2, -pillH / 2 - pillH * 0.46, pillH * 0.62)}
        </>
      );
    } else {
      shape = (
        <>
          {onSeatClick ? <circle r={pitch / 2} fill="transparent" /> : null}
          <circle
            r={dotR}
            fill={tone.solid ? tone.color : seat.tone === 'empty' || seat.tone === 'absent' ? ROOM_FILL : tone.soft}
            stroke={tone.color}
            strokeWidth={compact ? 1 : 1.5}
            strokeDasharray={tone.dashed ? '3 2.5' : undefined}
            vectorEffect="non-scaling-stroke"
          />
          {seat.ring ? (
            <circle r={dotR + 0.1} fill="none" stroke="var(--tb-gold)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          ) : null}
          {roleTags(seat, -dotR, -dotR - dotR * 0.7, dotR * 0.9)}
        </>
      );
    }

    const interactive = onSeatClick
      ? {
          role: 'button' as const,
          tabIndex: 0,
          'aria-label': seat.title,
          'aria-pressed': Boolean(seat.ring),
          style: { cursor: 'pointer' },
          onClick: () => onSeatClick(seat.seatId),
          onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSeatClick(seat.seatId);
            }
          },
        }
      : {};

    return (
      <g key={seat.seatId} transform={`translate(${seat.x} ${seat.y})`} {...interactive}>
        {compact ? null : <title>{seat.title}</title>}
        {shape}
      </g>
    );
  });

  // Ringed seats are drawn last so the gold ring is never covered by a neighbour.
  const ordered = [...seatNodes.filter((_, index) => !seats[index].ring), ...seatNodes.filter((_, index) => seats[index].ring)];

  return (
    <div className={cn(compact ? 'overflow-hidden' : 'overflow-auto', className)}>
      <svg
        viewBox={`${-PLAN_PAD} ${-PLAN_PAD} ${viewW} ${viewH}`}
        role={onSeatClick ? 'group' : 'img'}
        aria-label={ariaLabel ?? '座位平面圖'}
        style={{ display: 'block', width: `${100 * zoom}%`, minWidth, height: 'auto' }}
      >
        <RoomBackdrop widthM={widthM} heightM={heightM} />
        {objects.map((object) => (
          <PlanObjectShape key={object.id} object={object} heightM={heightM} labelFont={labelFont} showLabel={!compact} />
        ))}
        {ordered}
        {compact ? null : <ScaleBar widthM={widthM} heightM={heightM} labelFont={labelFont} />}
      </svg>
    </div>
  );
}

function seatTone(seat: SeatPlanViewSeat): SeatTone {
  if (!seat.participationId || !seat.status) return 'empty';
  if (seat.status === 'absent' || seat.status === 'medical') return 'absent';
  if (seat.status === 'substitute') return seat.substituteArrived ? 'substitute' : 'substitute-pending';
  if (seat.status === 'present' || seat.status === 'late') {
    if (seat.kind === 'guest') return 'guest';
    return seat.status;
  }
  return 'expected';
}

function seatTitle(seat: SeatPlanViewSeat, showNames: boolean) {
  if (!seat.participationId || !seat.status) return `${seat.label} 空位`;
  let state: string;
  if (seat.status === 'substitute') {
    const who = showNames && seat.substituteName ? `：${seat.substituteName}` : '';
    state = `代理${who}，${seat.substituteArrived ? '已到' : '未到'}`;
  } else if (seat.kind === 'guest') {
    state = seat.status === 'present' || seat.status === 'late' ? '來賓，已到' : `來賓，${STATUS_LABEL[seat.status]}`;
  } else {
    state = STATUS_LABEL[seat.status];
  }
  const roles = seat.roles.length ? `，${roleSummary(seat.roles)}` : '';
  return showNames && seat.name ? `${seat.label} ${seat.name}（${state}${roles}）` : `${seat.label}（${state}${roles}）`;
}

/**
 * Read-only floor plan of an event: room, fixed objects, tables and seats coloured by attendance.
 *
 * - Scales to the container width. A minimum width keeps labels readable; narrower containers scroll sideways.
 * - `showNames` (default off, so nothing personal leaks by accident): names are drawn on the seats when they
 *   stay readable (a substitute's name replaces the member's). On dense plans the seats fall back to coloured
 *   dots and the name is in the seat's tooltip.
 * - `highlightParticipationId`: that person's seat gets a gold ring.
 * - `showRoles`: meeting roles are drawn as one-character tags on the seats (see `RoleLegend` for the key).
 */
export function PlanView({
  data,
  highlightParticipationId,
  showNames = false,
  showRoles = false,
  className,
}: {
  data: SeatPlanViewData;
  highlightParticipationId?: string | null;
  showNames?: boolean;
  showRoles?: boolean;
  className?: string;
}) {
  const seats: CanvasSeat[] = data.seats.map((seat) => ({
    seatId: seat.seatId,
    label: seat.label,
    x: seat.x,
    y: seat.y,
    tone: seatTone(seat),
    name: showNames ? (seat.status === 'substitute' && seat.substituteName ? seat.substituteName : seat.name) : null,
    title: seatTitle(seat, showNames),
    ring: Boolean(highlightParticipationId) && seat.participationId === highlightParticipationId,
    roles: seat.roles,
  }));

  return (
    <PlanCanvas
      widthM={data.widthM}
      heightM={data.heightM}
      objects={data.objects}
      seats={seats}
      names={showNames ? 'auto' : 'none'}
      showRoles={showRoles}
      className={cn('rounded-xl', className)}
      ariaLabel={data.venueName ? `${data.venueName} 座位平面圖` : '座位平面圖'}
    />
  );
}

/** Small preview of a layout (no people, no labels) for lists. */
export function PlanThumb({
  widthM,
  heightM,
  objects,
  className,
}: {
  widthM: number;
  heightM: number;
  objects: PlanObject[];
  className?: string;
}) {
  const seats: CanvasSeat[] = deriveSeats(objects).map((seat) => ({
    seatId: seat.seatId,
    label: seat.label,
    x: seat.x,
    y: seat.y,
    tone: 'expected',
    name: null,
    title: seat.label,
  }));
  return (
    <PlanCanvas
      widthM={widthM}
      heightM={heightM}
      objects={objects}
      seats={seats}
      compact
      className={cn('rounded-lg', className)}
      ariaLabel="配置預覽"
    />
  );
}
