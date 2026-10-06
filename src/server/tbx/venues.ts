import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import {
  LAYOUT_KINDS,
  MAX_ROOM_M,
  baseFixtures,
  buildTemplate,
  countSeats,
  parsePlanObjects,
  readPlanObjects,
  type LayoutKind,
  type PlanObject,
} from '@/lib/tbx/plan';

export interface VenueLayoutView {
  id: string;
  venueId: string;
  name: string;
  kind: string;
  seatCount: number;
  objects: PlanObject[];
  updatedAt: Date;
}

export interface VenueView {
  id: string;
  name: string;
  address: string | null;
  widthM: number;
  heightM: number;
  note: string | null;
  layouts: VenueLayoutView[];
}

export interface VenueInput {
  name: string;
  address: string | null;
  widthM: number;
  heightM: number;
  note: string | null;
}

const MIN_ROOM_M = 3;
const MAX_LAYOUTS_PER_VENUE = 30;

function toJson(objects: PlanObject[]) {
  return objects as unknown as Prisma.InputJsonValue;
}

type VenueRecord = Prisma.VenueGetPayload<{ include: { layouts: true } }>;

function toView(venue: VenueRecord): VenueView {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    widthM: venue.widthM,
    heightM: venue.heightM,
    note: venue.note,
    layouts: [...venue.layouts]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((layout) => ({
        id: layout.id,
        venueId: layout.venueId,
        name: layout.name,
        kind: layout.kind,
        seatCount: layout.seatCount,
        objects: readPlanObjects(layout.objects),
        updatedAt: layout.updatedAt,
      })),
  };
}

export async function listVenues(): Promise<VenueView[]> {
  const venues = await prisma.venue.findMany({ include: { layouts: true }, orderBy: { createdAt: 'asc' }, take: 200 });
  return venues.map(toView);
}

export async function getVenue(venueId: string): Promise<VenueView | null> {
  const venue = await prisma.venue.findUnique({ where: { id: venueId }, include: { layouts: true } });
  return venue ? toView(venue) : null;
}

/** Checks the venue form. Throws an Error with a zh-TW message. */
export function validateVenueInput(input: {
  name: string;
  address: string | null;
  widthM: number;
  heightM: number;
  note: string | null;
}): VenueInput {
  const name = input.name.trim();
  if (!name) throw new Error('請填寫場地名稱。');
  if (name.length > 60) throw new Error('場地名稱最多 60 個字。');
  if (input.address && input.address.length > 120) throw new Error('地址最多 120 個字。');
  if (input.note && input.note.length > 300) throw new Error('備註最多 300 個字。');
  for (const [label, value] of [
    ['寬度', input.widthM],
    ['深度', input.heightM],
  ] as const) {
    if (!Number.isFinite(value)) throw new Error(`請填寫場地${label}（公尺）。`);
    if (value < MIN_ROOM_M || value > MAX_ROOM_M) {
      throw new Error(`場地${label}請填 ${MIN_ROOM_M} 到 ${MAX_ROOM_M} 公尺之間。`);
    }
  }
  return {
    name,
    address: input.address?.trim() || null,
    widthM: Math.round(input.widthM * 100) / 100,
    heightM: Math.round(input.heightM * 100) / 100,
    note: input.note?.trim() || null,
  };
}

export function validateLayoutName(value: string) {
  const name = value.trim();
  if (!name) throw new Error('請填寫配置名稱。');
  if (name.length > 40) throw new Error('配置名稱最多 40 個字。');
  return name;
}

export async function createVenue(input: VenueInput) {
  return prisma.venue.create({ data: input });
}

async function requireVenue(venueId: string) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { id: true, name: true } });
  if (!venue) throw new Error('找不到這個場地，可能已經被刪除，請回到場地列表。');
  return venue;
}

export async function updateVenue(venueId: string, input: VenueInput) {
  await requireVenue(venueId);
  return prisma.venue.update({ where: { id: venueId }, data: input });
}

/** Removes the venue and its layouts. Event seat plans are snapshots and stay untouched. */
export async function deleteVenue(venueId: string) {
  const venue = await requireVenue(venueId);
  await prisma.venueLayout.deleteMany({ where: { venueId } });
  await prisma.venue.delete({ where: { id: venueId } });
  return venue;
}

export async function createLayoutFromTemplate(input: { venueId: string; name: string; kind: string; seats: number }) {
  const venue = await prisma.venue.findUnique({ where: { id: input.venueId }, include: { _count: { select: { layouts: true } } } });
  if (!venue) throw new Error('找不到這個場地，請回到場地列表重新選擇。');
  if (venue._count.layouts >= MAX_LAYOUTS_PER_VENUE) {
    throw new Error(`一個場地最多 ${MAX_LAYOUTS_PER_VENUE} 個配置，請先刪除不用的配置。`);
  }
  if (!LAYOUT_KINDS.includes(input.kind as LayoutKind)) throw new Error('請選擇配置類型。');
  const kind = input.kind as LayoutKind;

  let objects: PlanObject[];
  if (kind === 'custom') {
    objects = baseFixtures(venue.widthM, venue.heightM);
  } else {
    if (!Number.isFinite(input.seats) || input.seats < 1 || input.seats > 600) {
      throw new Error('座位數請填 1 到 600。');
    }
    objects = buildTemplate(kind, { widthM: venue.widthM, heightM: venue.heightM, seats: input.seats });
  }

  return prisma.venueLayout.create({
    data: {
      venueId: venue.id,
      name: validateLayoutName(input.name),
      kind,
      objects: toJson(objects),
      seatCount: countSeats(objects),
    },
  });
}

export async function duplicateLayout(layoutId: string) {
  const layout = await prisma.venueLayout.findUnique({ where: { id: layoutId } });
  if (!layout) throw new Error('找不到這個配置，可能已經被刪除。');
  const count = await prisma.venueLayout.count({ where: { venueId: layout.venueId } });
  if (count >= MAX_LAYOUTS_PER_VENUE) {
    throw new Error(`一個場地最多 ${MAX_LAYOUTS_PER_VENUE} 個配置，請先刪除不用的配置。`);
  }
  const objects = readPlanObjects(layout.objects);
  return prisma.venueLayout.create({
    data: {
      venueId: layout.venueId,
      name: `${layout.name}（複本）`.slice(0, 40),
      kind: layout.kind,
      objects: toJson(objects),
      seatCount: countSeats(objects),
    },
  });
}

export async function renameLayout(layoutId: string, name: string) {
  const layout = await prisma.venueLayout.findUnique({ where: { id: layoutId }, select: { id: true } });
  if (!layout) throw new Error('找不到這個配置，可能已經被刪除。');
  return prisma.venueLayout.update({ where: { id: layoutId }, data: { name: validateLayoutName(name) } });
}

export async function deleteLayout(layoutId: string) {
  const layout = await prisma.venueLayout.findUnique({ where: { id: layoutId }, select: { id: true, venueId: true, name: true } });
  if (!layout) throw new Error('找不到這個配置，可能已經被刪除。');
  await prisma.venueLayout.delete({ where: { id: layoutId } });
  return layout;
}

/** Parses the JSON string posted by the layout editor. Throws a zh-TW Error when the shape is wrong. */
export function parseObjectsPayload(payload: string): PlanObject[] {
  if (!payload) throw new Error('沒有收到配置資料，請重新整理頁面後再試一次。');
  if (payload.length > 400_000) throw new Error('配置資料太大，請減少物件後再儲存。');
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('配置資料格式不正確，請重新整理頁面後再試一次。');
  }
  return parsePlanObjects(parsed);
}

export async function saveLayoutObjects(layoutId: string, objects: PlanObject[]) {
  const layout = await prisma.venueLayout.findUnique({ where: { id: layoutId }, select: { id: true } });
  if (!layout) throw new Error('找不到這個配置，可能已經被刪除。');
  return prisma.venueLayout.update({
    where: { id: layoutId },
    data: { objects: toJson(objects), seatCount: countSeats(objects) },
  });
}

/** One-click starter: a 20 × 14 m room with a classroom layout. */
export async function createSampleVenue() {
  const venue = await prisma.venue.create({
    data: { name: '範例會議室', address: null, widthM: 20, heightM: 14, note: '範例場地，可以直接修改或刪除。' },
  });
  const objects = buildTemplate('classroom', { widthM: venue.widthM, heightM: venue.heightM, seats: 48 });
  await prisma.venueLayout.create({
    data: { venueId: venue.id, name: '教室型 48 位', kind: 'classroom', objects: toJson(objects), seatCount: countSeats(objects) },
  });
  return venue;
}
