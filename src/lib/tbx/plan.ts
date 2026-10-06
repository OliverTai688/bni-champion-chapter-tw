// Spatial floor plan: types, seat geometry, templates and validation.
// Pure module: safe to import from Server Components, Client Components and Server Actions.
//
// Coordinate convention
// - Units are metres. The origin is the room's top-left corner, x grows right, y grows down.
// - `x, y` of every object is its CENTRE (for `row`: the centre of the row of chairs).
// - `rotation` is in degrees, clockwise on screen, around the object's centre.
// - `w` runs along the object's local x axis and `h` along its local y axis before rotation.

export type PlanObject =
  | { id: string; type: 'round'; x: number; y: number; r: number; seats: number; label: string; rotation?: number }
  | {
      id: string;
      type: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      seats: number;
      sides: 'one' | 'two' | 'around';
      label: string;
      rotation?: number;
    }
  | { id: string; type: 'row'; x: number; y: number; seats: number; spacing: number; label: string; rotation?: number }
  | { id: string; type: 'area'; x: number; y: number; w: number; h: number; capacity: number; label: string }
  | {
      id: string;
      type: 'fixed';
      kind: 'stage' | 'screen' | 'door' | 'pillar' | 'desk' | 'other';
      x: number;
      y: number;
      w: number;
      h: number;
      label: string;
      rotation?: number;
    };

/** seatId = `${objectId}:${index}` */
export interface PlanSeat {
  seatId: string;
  objectId: string;
  index: number;
  label: string;
  x: number;
  y: number;
}

export type PlanObjectType = PlanObject['type'];
export type FixedKind = Extract<PlanObject, { type: 'fixed' }>['kind'];
export type RectSides = Extract<PlanObject, { type: 'rect' }>['sides'];
export type TemplateKind = 'classroom' | 'theater' | 'rounds' | 'ushape' | 'square' | 'pods';
/** Stored in `VenueLayout.kind`. `custom` starts with only a stage and a door. */
export type LayoutKind = TemplateKind | 'custom';

/** Radius of a drawn chair. */
export const SEAT_RADIUS = 0.22;
/** Distance from a table edge to the centre of its chairs. */
export const CHAIR_GAP = 0.35;
/** Editor snap step. */
export const GRID_STEP = 0.25;
export const MAX_OBJECTS = 400;
export const MAX_SEATS_PER_OBJECT = 80;
export const MAX_TOTAL_SEATS = 2000;
export const MAX_LABEL_LENGTH = 40;
export const MAX_ROOM_M = 200;

export const LAYOUT_KIND_LABEL: Record<LayoutKind, string> = {
  classroom: '教室型',
  theater: '劇院型',
  rounds: '圓桌型',
  ushape: 'U 字型',
  square: '口字型',
  pods: '分組島型',
  custom: '自訂',
};

export const TEMPLATE_KINDS: TemplateKind[] = ['classroom', 'theater', 'rounds', 'ushape', 'square', 'pods'];
export const LAYOUT_KINDS: LayoutKind[] = [...TEMPLATE_KINDS, 'custom'];

export const FIXED_KIND_LABEL: Record<FixedKind, string> = {
  stage: '講台',
  screen: '投影幕',
  door: '門',
  pillar: '柱',
  desk: '報到台',
  other: '固定物',
};

export const OBJECT_TYPE_LABEL: Record<PlanObjectType, string> = {
  round: '圓桌',
  rect: '長桌',
  row: '排椅',
  area: '區域',
  fixed: '固定物',
};

export const RECT_SIDES_LABEL: Record<RectSides, string> = {
  one: '單側',
  two: '兩側',
  around: '四周',
};

export function layoutKindLabel(kind: string | null | undefined) {
  return LAYOUT_KIND_LABEL[(kind ?? 'custom') as LayoutKind] ?? '自訂';
}

/* ------------------------------------------------------------------ */
/* geometry                                                            */
/* ------------------------------------------------------------------ */

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function snapToGrid(value: number, step = GRID_STEP) {
  return round2(Math.round(value / step) * step);
}

function rotationOf(object: PlanObject) {
  return object.type === 'area' ? 0 : object.rotation ?? 0;
}

function rotatePoint(lx: number, ly: number, degrees: number): [number, number] {
  if (!degrees) return [lx, ly];
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [lx * cos - ly * sin, lx * sin + ly * cos];
}

/** `count` positions spread evenly along a segment of `length` centred on 0. */
function spread(count: number, length: number) {
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) out.push(((i + 0.5) * length) / count - length / 2);
  return out;
}

/** Seat centres in the object's local frame (before rotation, relative to its centre). */
function localSeats(object: PlanObject): Array<[number, number]> {
  if (object.type === 'round') {
    const out: Array<[number, number]> = [];
    const radius = object.r + CHAIR_GAP;
    for (let i = 0; i < object.seats; i += 1) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / object.seats;
      out.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
    }
    return out;
  }

  if (object.type === 'rect') {
    const hw = object.w / 2;
    const hh = object.h / 2;
    const n = object.seats;
    // One side: chairs sit on the local bottom edge, so an unrotated table faces a stage at the top.
    if (object.sides === 'one') return spread(n, object.w).map((x) => [x, hh + CHAIR_GAP]);
    if (object.sides === 'two') {
      const top = Math.ceil(n / 2);
      return [
        ...spread(top, object.w).map((x): [number, number] => [x, -hh - CHAIR_GAP]),
        ...spread(n - top, object.w).map((x): [number, number] => [x, hh + CHAIR_GAP]),
      ];
    }
    // Around: walk the perimeter clockwise from the top-left corner at equal distances.
    const perimeter = 2 * (object.w + object.h);
    const out: Array<[number, number]> = [];
    for (let i = 0; i < n; i += 1) {
      const d = ((i + 0.5) * perimeter) / n;
      if (d < object.w) out.push([-hw + d, -hh - CHAIR_GAP]);
      else if (d < object.w + object.h) out.push([hw + CHAIR_GAP, -hh + (d - object.w)]);
      else if (d < 2 * object.w + object.h) out.push([hw - (d - object.w - object.h), hh + CHAIR_GAP]);
      else out.push([-hw - CHAIR_GAP, hh - (d - 2 * object.w - object.h)]);
    }
    return out;
  }

  if (object.type === 'row') {
    const out: Array<[number, number]> = [];
    for (let i = 0; i < object.seats; i += 1) out.push([(i - (object.seats - 1) / 2) * object.spacing, 0]);
    return out;
  }

  return [];
}

export function seatLabel(object: PlanObject, index: number) {
  return object.type === 'row' ? `${object.label}${index + 1}` : `${object.label}-${index + 1}`;
}

/** Absolute seat centres in metres. Areas and fixed objects have no seats. */
export function deriveSeats(objects: PlanObject[]): PlanSeat[] {
  const seats: PlanSeat[] = [];
  for (const object of objects) {
    const rotation = rotationOf(object);
    localSeats(object).forEach(([lx, ly], index) => {
      const [dx, dy] = rotatePoint(lx, ly, rotation);
      seats.push({
        seatId: `${object.id}:${index}`,
        objectId: object.id,
        index,
        label: seatLabel(object, index),
        x: round2(object.x + dx),
        y: round2(object.y + dy),
      });
    });
  }
  return seats;
}

/** Number of assignable seats (chairs). Area capacity is not counted, see `countAreaCapacity`. */
export function countSeats(objects: PlanObject[]): number {
  let total = 0;
  for (const object of objects) {
    if (object.type === 'round' || object.type === 'rect' || object.type === 'row') total += object.seats;
  }
  return total;
}

/** Sum of the standing / free-seating capacity of all areas. */
export function countAreaCapacity(objects: PlanObject[]): number {
  let total = 0;
  for (const object of objects) if (object.type === 'area') total += object.capacity;
  return total;
}

/**
 * True when the furniture overlaps: two chairs closer than a chair is wide, or a
 * chair sitting on another table. It means the room is too small for this many seats.
 */
export function isCrowded(objects: PlanObject[]): boolean {
  const seats = deriveSeats(objects);
  const limit = (SEAT_RADIUS * 2) ** 2;
  for (let i = 0; i < seats.length; i += 1) {
    for (let j = i + 1; j < seats.length; j += 1) {
      const dx = seats[i].x - seats[j].x;
      const dy = seats[i].y - seats[j].y;
      if (dx * dx + dy * dy < limit - 1e-6) return true;
    }
  }
  for (const table of objects) {
    if (table.type !== 'round' && table.type !== 'rect') continue;
    for (const seat of seats) {
      if (seat.objectId === table.id) continue;
      const [lx, ly] = rotatePoint(seat.x - table.x, seat.y - table.y, -rotationOf(table));
      if (table.type === 'round') {
        if (lx * lx + ly * ly < table.r * table.r) return true;
      } else if (Math.abs(lx) < table.w / 2 && Math.abs(ly) < table.h / 2) {
        return true;
      }
    }
  }
  return false;
}

/** Half width / half height of the object's body in its local frame (no chairs). */
export function bodyHalfSize(object: PlanObject): { hw: number; hh: number } {
  if (object.type === 'round') return { hw: object.r, hh: object.r };
  if (object.type === 'row') {
    return { hw: (Math.max(object.seats, 1) - 1) * object.spacing * 0.5 + SEAT_RADIUS, hh: SEAT_RADIUS };
  }
  return { hw: object.w / 2, hh: object.h / 2 };
}

/** Half width / half height of the object including its chairs, in its local frame (before rotation). */
export function localHalfSize(object: PlanObject): { hw: number; hh: number } {
  let { hw, hh } = bodyHalfSize(object);
  const chairs = CHAIR_GAP + SEAT_RADIUS;
  if (object.type === 'round' && object.seats > 0) {
    hw += chairs;
    hh += chairs;
  } else if (object.type === 'rect' && object.seats > 0) {
    hh += chairs;
    if (object.sides === 'around') hw += chairs;
  }
  return { hw, hh };
}

/** Half extents of the axis-aligned box around the object including its chairs, after rotation. */
export function objectHalfExtents(object: PlanObject): { hx: number; hy: number } {
  const { hw, hh } = localHalfSize(object);
  const rad = (rotationOf(object) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return { hx: hw * cos + hh * sin, hy: hw * sin + hh * cos };
}

/** Moves the object back inside the room. Objects larger than the room are centred. */
export function clampToRoom<T extends PlanObject>(object: T, widthM: number, heightM: number): T {
  const { hx, hy } = objectHalfExtents(object);
  const x = hx * 2 >= widthM ? widthM / 2 : clamp(object.x, hx, widthM - hx);
  const y = hy * 2 >= heightM ? heightM / 2 : clamp(object.y, hy, heightM - hy);
  if (x === object.x && y === object.y) return object;
  return { ...object, x: round2(x), y: round2(y) };
}

/* ------------------------------------------------------------------ */
/* validation                                                          */
/* ------------------------------------------------------------------ */

const ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const FIXED_KINDS: FixedKind[] = ['stage', 'screen', 'door', 'pillar', 'desk', 'other'];
const SIDES: RectSides[] = ['one', 'two', 'around'];

function readNumber(source: Record<string, unknown>, key: string, min: number, max: number, where: string) {
  const value = source[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${where} 的 ${key} 必須是數字。`);
  if (value < min || value > max) throw new Error(`${where} 的 ${key} 超出範圍（${min}–${max}）。`);
  return round2(value);
}

function readInt(source: Record<string, unknown>, key: string, min: number, max: number, where: string) {
  const value = readNumber(source, key, min, max, where);
  if (!Number.isInteger(value)) throw new Error(`${where} 的 ${key} 必須是整數。`);
  return value;
}

function readRotation(source: Record<string, unknown>, where: string) {
  if (source.rotation === undefined || source.rotation === null) return 0;
  const value = readNumber(source, 'rotation', -360, 360, where);
  return ((value % 360) + 360) % 360;
}

/**
 * Strict validation of a plan coming from a client. Throws an Error with a
 * zh-TW message. Returns a clean copy that only contains known fields.
 */
export function parsePlanObjects(input: unknown): PlanObject[] {
  if (!Array.isArray(input)) throw new Error('配置資料格式不正確，請重新整理頁面後再試一次。');
  if (input.length > MAX_OBJECTS) throw new Error(`一個配置最多 ${MAX_OBJECTS} 個物件，請刪除一些再儲存。`);

  const ids = new Set<string>();
  const objects: PlanObject[] = [];

  input.forEach((raw, position) => {
    const where = `第 ${position + 1} 個物件`;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${where} 的格式不正確。`);
    const source = raw as Record<string, unknown>;

    const id = source.id;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) throw new Error(`${where} 的編號不正確。`);
    if (ids.has(id)) throw new Error(`${where} 的編號重複。`);
    ids.add(id);

    const label = source.label;
    if (typeof label !== 'string') throw new Error(`${where} 缺少名稱。`);
    if (label.length > MAX_LABEL_LENGTH) throw new Error(`${where} 的名稱最多 ${MAX_LABEL_LENGTH} 個字。`);
    const cleanLabel = label.trim();

    const x = readNumber(source, 'x', -MAX_ROOM_M, MAX_ROOM_M * 2, where);
    const y = readNumber(source, 'y', -MAX_ROOM_M, MAX_ROOM_M * 2, where);

    switch (source.type) {
      case 'round':
        objects.push({
          id,
          type: 'round',
          x,
          y,
          r: readNumber(source, 'r', 0.2, 10, where),
          seats: readInt(source, 'seats', 0, MAX_SEATS_PER_OBJECT, where),
          label: cleanLabel,
          rotation: readRotation(source, where),
        });
        break;
      case 'rect': {
        if (!SIDES.includes(source.sides as RectSides)) throw new Error(`${where} 的座位方向不正確。`);
        objects.push({
          id,
          type: 'rect',
          x,
          y,
          w: readNumber(source, 'w', 0.2, MAX_ROOM_M, where),
          h: readNumber(source, 'h', 0.2, MAX_ROOM_M, where),
          seats: readInt(source, 'seats', 0, MAX_SEATS_PER_OBJECT, where),
          sides: source.sides as RectSides,
          label: cleanLabel,
          rotation: readRotation(source, where),
        });
        break;
      }
      case 'row':
        objects.push({
          id,
          type: 'row',
          x,
          y,
          seats: readInt(source, 'seats', 1, MAX_SEATS_PER_OBJECT, where),
          spacing: readNumber(source, 'spacing', 0.3, 5, where),
          label: cleanLabel,
          rotation: readRotation(source, where),
        });
        break;
      case 'area':
        objects.push({
          id,
          type: 'area',
          x,
          y,
          w: readNumber(source, 'w', 0.2, MAX_ROOM_M, where),
          h: readNumber(source, 'h', 0.2, MAX_ROOM_M, where),
          capacity: readInt(source, 'capacity', 0, 5000, where),
          label: cleanLabel,
        });
        break;
      case 'fixed': {
        if (!FIXED_KINDS.includes(source.kind as FixedKind)) throw new Error(`${where} 的固定物種類不正確。`);
        objects.push({
          id,
          type: 'fixed',
          kind: source.kind as FixedKind,
          x,
          y,
          w: readNumber(source, 'w', 0.1, MAX_ROOM_M, where),
          h: readNumber(source, 'h', 0.1, MAX_ROOM_M, where),
          label: cleanLabel,
          rotation: readRotation(source, where),
        });
        break;
      }
      default:
        throw new Error(`${where} 的種類不正確。`);
    }
  });

  if (countSeats(objects) > MAX_TOTAL_SEATS) {
    throw new Error(`一個配置最多 ${MAX_TOTAL_SEATS} 個座位，請減少座位後再儲存。`);
  }
  return objects;
}

/** Lenient read of JSON stored in the database: an invalid value becomes an empty plan. */
export function readPlanObjects(value: unknown): PlanObject[] {
  try {
    return parsePlanObjects(value);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* templates                                                           */
/* ------------------------------------------------------------------ */

interface TemplateOptions {
  widthM: number;
  heightM: number;
  seats: number;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A, B … Z, AA, AB … */
export function rowLetter(index: number): string {
  if (index < 26) return String.fromCharCode(65 + index);
  return `${rowLetter(Math.floor(index / 26) - 1)}${String.fromCharCode(65 + (index % 26))}`;
}

/** The stage at the top and a door on the bottom wall that every template starts with. */
export function baseFixtures(widthM: number, heightM: number): PlanObject[] {
  const stageH = Math.min(1.2, heightM * 0.2);
  return [
    {
      id: 'stage',
      type: 'fixed',
      kind: 'stage',
      x: round2(widthM / 2),
      y: round2(0.3 + stageH / 2),
      w: round2(clamp(widthM * 0.4, Math.min(2, widthM), 8)),
      h: round2(stageH),
      label: '講台',
      rotation: 0,
    },
    {
      id: 'door',
      type: 'fixed',
      kind: 'door',
      x: round2(clamp(widthM - 1.6, 0.6, Math.max(0.6, widthM - 0.6))),
      y: round2(heightM - 0.15),
      w: round2(Math.min(1.2, widthM)),
      h: 0.3,
      label: '入口',
      rotation: 0,
    },
  ];
}

/** Free floor below the stage, with a walkway kept along the walls. */
function usableBox(widthM: number, heightM: number): Box {
  const margin = Math.min(1, widthM * 0.08);
  const top = Math.min(2.6, heightM * 0.3);
  const bottom = Math.min(1, heightM * 0.1);
  return {
    left: margin,
    top,
    width: Math.max(1, widthM - margin * 2),
    height: Math.max(1, heightM - top - bottom),
  };
}

/**
 * Centres of `count` cells in a grid that fills the box; short last rows are centred.
 * The column count is the one that leaves the most room around a `footW` × `footH` footprint.
 */
function gridCentres(count: number, box: Box, footW: number, footH: number, maxPitchY: number): Array<[number, number]> {
  let cols = 1;
  let bestRoom = -1;
  for (let candidate = 1; candidate <= count; candidate += 1) {
    const candidateRows = Math.ceil(count / candidate);
    const room = Math.min(box.width / candidate / footW, box.height / candidateRows / footH);
    if (room > bestRoom + 1e-9) {
      bestRoom = room;
      cols = candidate;
    }
  }
  const rows = Math.ceil(count / cols);
  const pitchY = Math.min(box.height / rows, maxPitchY);
  const startY = box.top + (box.height - pitchY * rows) / 2;
  const out: Array<[number, number]> = [];
  for (let r = 0; r < rows; r += 1) {
    const inRow = Math.min(cols, count - r * cols);
    for (let c = 0; c < inRow; c += 1) {
      out.push([box.left + (box.width * (c + 0.5)) / inRow, startY + pitchY * (r + 0.5)]);
    }
  }
  return out;
}

/** Splits `total` into `parts` near-equal integers (earlier parts get the remainder). */
function splitEvenly(total: number, parts: number) {
  const base = Math.floor(total / parts);
  const extra = total % parts;
  return Array.from({ length: parts }, (_, index) => base + (index < extra ? 1 : 0));
}

function classroom(box: Box, seats: number): PlanObject[] {
  const perTable = 3;
  const tableW = 1.8;
  const tableH = 0.6;
  const aisle = 0.6;
  const tables = Math.ceil(seats / perTable);
  let cols = clamp(Math.floor((box.width + aisle) / (tableW + aisle)), 1, tables);
  const rows = Math.ceil(tables / cols);
  cols = Math.ceil(tables / rows);
  // Rows are spread over the free depth; in a room that is too small they get tighter instead of leaving the room.
  const span = Math.max(0, box.height - tableH - CHAIR_GAP - SEAT_RADIUS);
  const pitchY = rows > 1 ? Math.min(1.7, span / (rows - 1)) : 0;
  const out: PlanObject[] = [];
  let left = seats;
  for (let r = 0; r < rows && left > 0; r += 1) {
    const inRow = Math.min(cols, Math.ceil(left / perTable));
    for (let c = 0; c < inRow; c += 1) {
      const n = Math.min(perTable, left);
      left -= n;
      out.push({
        id: `t${out.length + 1}`,
        type: 'rect',
        x: round2(box.left + (box.width * (c + 0.5)) / cols + ((cols - inRow) * box.width) / cols / 2),
        y: round2(box.top + tableH / 2 + r * pitchY),
        w: tableW,
        h: tableH,
        seats: n,
        sides: 'one',
        label: `${rowLetter(r)}${c + 1}`,
        rotation: 0,
      });
    }
  }
  return out;
}

function theater(box: Box, widthM: number, seats: number): PlanObject[] {
  const spacing = 0.55;
  const maxFit = clamp(Math.floor(box.width / spacing), 1, MAX_SEATS_PER_OBJECT);
  const rowsFit = Math.max(1, Math.floor(box.height / 1));
  const perRow = Math.min(maxFit, Math.max(Math.ceil(seats / rowsFit), Math.min(maxFit, Math.ceil(Math.sqrt(seats * 2)))));
  const rows = Math.ceil(seats / perRow);
  const pitchY = rows > 1 ? Math.min(1.2, Math.max(0, box.height - 0.6) / (rows - 1)) : 0;
  const out: PlanObject[] = [];
  let left = seats;
  for (let r = 0; r < rows; r += 1) {
    const n = Math.min(perRow, left);
    left -= n;
    out.push({
      id: `r${r + 1}`,
      type: 'row',
      x: round2(widthM / 2),
      y: round2(box.top + 0.3 + r * pitchY),
      seats: n,
      spacing,
      label: rowLetter(r),
      rotation: 0,
    });
  }
  return out;
}

function rounds(box: Box, seats: number): PlanObject[] {
  const r = 0.9;
  const tables = Math.ceil(seats / 10);
  const foot = 2 * (r + CHAIR_GAP + SEAT_RADIUS);
  const centres = gridCentres(tables, box, foot + 0.4, foot + 0.4, foot + 1.2);
  const perTable = splitEvenly(seats, tables);
  return centres.map(([x, y], index) => ({
    id: `t${index + 1}`,
    type: 'round',
    x: round2(x),
    y: round2(y),
    r,
    seats: perTable[index],
    label: `${index + 1}桌`,
    rotation: 0,
  }));
}

function pods(box: Box, seats: number): PlanObject[] {
  const w = 1.6;
  const h = 1;
  const chairs = 2 * (CHAIR_GAP + SEAT_RADIUS);
  const count = Math.ceil(seats / 6);
  const centres = gridCentres(count, box, w + chairs + 0.4, h + chairs + 0.4, h + chairs + 1.2);
  const perPod = splitEvenly(seats, count);
  return centres.map(([x, y], index) => ({
    id: `t${index + 1}`,
    type: 'rect',
    x: round2(x),
    y: round2(y),
    w,
    h,
    seats: perPod[index],
    sides: 'around',
    label: `${index + 1}組`,
    rotation: 0,
  }));
}

const ARM_DEPTH = 0.75;
const ARM_PITCH = 0.65;
/** U-shape and hollow square stop here: each arm is one table of at most MAX_SEATS_PER_OBJECT seats. */
const MAX_ARM_TEMPLATE_SEATS = 160;

function arm(id: string, label: string, x: number, y: number, length: number, seats: number, rotation: number): PlanObject {
  return {
    id,
    type: 'rect',
    x: round2(x),
    y: round2(y),
    w: round2(length),
    h: ARM_DEPTH,
    seats,
    sides: 'one',
    label,
    rotation,
  };
}

/** U open towards the stage; chairs on the outside. Seats run left arm, bottom, right arm. */
function ushape(box: Box, widthM: number, requested: number): PlanObject[] {
  const seats = Math.min(requested, MAX_ARM_TEMPLATE_SEATS);
  const chairs = CHAIR_GAP + SEAT_RADIUS;
  const maxBottom = Math.max(1.8, box.width - chairs * 2);
  const maxSide = Math.max(1.2, box.height - ARM_DEPTH - chairs);
  const bottomSeats =
    seats < 3 ? seats : clamp(Math.round((seats * maxBottom) / (maxBottom + maxSide * 2)), 1, Math.min(seats, MAX_SEATS_PER_OBJECT));
  const rest = seats - bottomSeats;
  const leftSeats = Math.ceil(rest / 2);
  const rightSeats = rest - leftSeats;
  const bottomW = clamp(bottomSeats * ARM_PITCH, 1.8, maxBottom);
  const sideL = clamp(Math.max(leftSeats, 1) * ARM_PITCH, 1.2, maxSide);
  const top = box.top + Math.max(0, (box.height - (sideL + ARM_DEPTH + chairs)) / 2);
  const cx = widthM / 2;

  const out: PlanObject[] = [];
  if (leftSeats > 0) out.push(arm('a', 'A', cx - bottomW / 2 + ARM_DEPTH / 2, top + sideL / 2, sideL, leftSeats, 90));
  out.push(arm('b', 'B', cx, top + sideL + ARM_DEPTH / 2, bottomW, bottomSeats, 0));
  if (rightSeats > 0) out.push(arm('c', 'C', cx + bottomW / 2 - ARM_DEPTH / 2, top + sideL / 2, sideL, rightSeats, 270));
  return out;
}

/** Hollow square; chairs on the outside. Seats run top, left, bottom, right. */
function square(box: Box, widthM: number, requested: number): PlanObject[] {
  const seats = Math.min(requested, MAX_ARM_TEMPLATE_SEATS);
  const chairs = CHAIR_GAP + SEAT_RADIUS;
  const maxLong = Math.max(1.8, box.width - chairs * 2);
  const maxSide = Math.max(1.2, box.height - ARM_DEPTH * 2 - chairs * 2);
  let topSeats: number;
  let bottomSeats: number;
  if (seats < 6) {
    topSeats = Math.floor(seats / 2);
    bottomSeats = seats - topSeats;
  } else {
    topSeats = clamp(Math.round((seats * maxLong) / (2 * (maxLong + maxSide))), 1, Math.floor(seats / 2));
    bottomSeats = topSeats;
  }
  const rest = seats - topSeats - bottomSeats;
  const leftSeats = Math.ceil(rest / 2);
  const rightSeats = rest - leftSeats;
  const longW = clamp(Math.max(topSeats, bottomSeats) * ARM_PITCH, 1.8, maxLong);
  const sideL = clamp(Math.max(leftSeats, 1) * ARM_PITCH, 1.2, maxSide);
  const total = sideL + ARM_DEPTH * 2 + chairs * 2;
  const top = box.top + chairs + Math.max(0, (box.height - total) / 2);
  const cx = widthM / 2;
  const sideY = top + ARM_DEPTH + sideL / 2;

  const out: PlanObject[] = [];
  if (topSeats > 0) out.push(arm('a', 'A', cx, top + ARM_DEPTH / 2, longW, topSeats, 180));
  if (leftSeats > 0) out.push(arm('b', 'B', cx - longW / 2 + ARM_DEPTH / 2, sideY, sideL, leftSeats, 90));
  out.push(arm('c', 'C', cx, top + ARM_DEPTH + sideL + ARM_DEPTH / 2, longW, bottomSeats, 0));
  if (rightSeats > 0) out.push(arm('d', 'D', cx + longW / 2 - ARM_DEPTH / 2, sideY, sideL, rightSeats, 270));
  return out;
}

/**
 * Builds a starting layout: a stage at the top, a door on the bottom wall and
 * `seats` seats arranged in the requested style. Every object is kept inside
 * the room; when the room is too small for the request, tables end up tighter
 * than comfortable and the leader can adjust them in the editor.
 */
export function buildTemplate(kind: TemplateKind, opts: TemplateOptions): PlanObject[] {
  const widthM = clamp(Number.isFinite(opts.widthM) ? opts.widthM : 20, 3, MAX_ROOM_M);
  const heightM = clamp(Number.isFinite(opts.heightM) ? opts.heightM : 14, 3, MAX_ROOM_M);
  const seats = clamp(Math.round(Number.isFinite(opts.seats) ? opts.seats : 0), 1, 600);
  const box = usableBox(widthM, heightM);

  let furniture: PlanObject[];
  switch (kind) {
    case 'theater':
      furniture = theater(box, widthM, seats);
      break;
    case 'rounds':
      furniture = rounds(box, seats);
      break;
    case 'ushape':
      furniture = ushape(box, widthM, seats);
      break;
    case 'square':
      furniture = square(box, widthM, seats);
      break;
    case 'pods':
      furniture = pods(box, seats);
      break;
    case 'classroom':
    default:
      furniture = classroom(box, seats);
      break;
  }

  return [...baseFixtures(widthM, heightM), ...furniture.map((object) => clampToRoom(object, widthM, heightM))];
}
