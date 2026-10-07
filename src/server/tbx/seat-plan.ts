import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import type { ParticipationStatusKey } from '@/lib/tbx/labels';
import { deriveSeats, readPlanObjects, type PlanObject } from '@/lib/tbx/plan';
import type { MeetingRole } from '@/lib/tbx/roles';
import { getMeetingRoles } from '@/server/tbx/meeting-roles';

export interface SeatPlanViewSeat {
  seatId: string;
  label: string;
  x: number;
  y: number;
  participationId: string | null;
  name: string | null;
  kind: 'member' | 'guest' | null;
  status: ParticipationStatusKey | null;
  substituteName: string | null;
  substituteArrived: boolean;
  /** Meeting roles of whoever sits here (主席, 值日, 導師…). Empty for an empty seat. */
  roles: MeetingRole[];
}

export interface SeatPlanViewData {
  venueName: string | null;
  widthM: number;
  heightM: number;
  objects: PlanObject[];
  seats: SeatPlanViewSeat[];
}

/** `{ [seatId]: participationId }` */
export type SeatAssignments = Record<string, string>;

export interface EventSeatPlanData {
  id: string;
  layoutId: string | null;
  venueName: string | null;
  widthM: number;
  heightM: number;
  objects: PlanObject[];
  assignments: SeatAssignments;
  updatedAt: Date;
}

export interface LayoutOptionGroup {
  venueId: string;
  venueName: string;
  layouts: Array<{ id: string; name: string; seatCount: number }>;
}

/** Reads `EventSeatPlan.assignments` defensively: anything that is not a string pair is dropped. */
export function readAssignments(value: unknown): SeatAssignments {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: SeatAssignments = {};
  for (const [seatId, participationId] of Object.entries(value as Record<string, unknown>)) {
    if (typeof participationId === 'string' && participationId) out[seatId] = participationId;
  }
  return out;
}

export async function getEventSeatPlan(sessionId: string): Promise<EventSeatPlanData | null> {
  const plan = await prisma.eventSeatPlan.findUnique({ where: { sessionId } });
  if (!plan) return null;
  return {
    id: plan.id,
    layoutId: plan.layoutId,
    venueName: plan.venueName,
    widthM: plan.widthM,
    heightM: plan.heightM,
    objects: readPlanObjects(plan.objects),
    assignments: readAssignments(plan.assignments),
    updatedAt: plan.updatedAt,
  };
}

/**
 * The event's floor plan joined with the current attendance of whoever sits on
 * each seat. Returns `null` when the event has no EventSeatPlan.
 * Only display fields are returned, so the result is safe for public pages.
 */
export async function getSeatPlanView(sessionId: string): Promise<SeatPlanViewData | null> {
  const plan = await getEventSeatPlan(sessionId);
  if (!plan) return null;

  const seated = [...new Set(Object.values(plan.assignments))];
  const rows = seated.length
    ? await prisma.participation.findMany({
        where: { sessionId, id: { in: seated } },
        select: {
          id: true,
          kind: true,
          displayName: true,
          status: true,
          substituteName: true,
          substituteArrivedAt: true,
        },
      })
    : [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const rolesById = seated.length ? await getMeetingRoles(sessionId) : new Map<string, MeetingRole[]>();

  const seats: SeatPlanViewSeat[] = deriveSeats(plan.objects).map((seat) => {
    const participationId = plan.assignments[seat.seatId];
    const row = participationId ? byId.get(participationId) : undefined;
    return {
      seatId: seat.seatId,
      label: seat.label,
      x: seat.x,
      y: seat.y,
      participationId: row?.id ?? null,
      name: row?.displayName ?? null,
      kind: row?.kind ?? null,
      status: row?.status ?? null,
      substituteName: row?.status === 'substitute' ? row.substituteName : null,
      substituteArrived: row?.status === 'substitute' && Boolean(row.substituteArrivedAt),
      roles: row ? rolesById.get(row.id) ?? [] : [],
    };
  });

  return {
    venueName: plan.venueName,
    widthM: plan.widthM,
    heightM: plan.heightM,
    objects: plan.objects,
    seats,
  };
}

/** Venue layouts a leader can start an event seat plan from, grouped by venue. */
export async function listLayoutOptions(): Promise<LayoutOptionGroup[]> {
  const venues = await prisma.venue.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      layouts: { select: { id: true, name: true, seatCount: true, createdAt: true } },
    },
    take: 200,
  });
  return venues
    .filter((venue) => venue.layouts.length > 0)
    .map((venue) => ({
      venueId: venue.id,
      venueName: venue.name,
      layouts: [...venue.layouts]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((layout) => ({ id: layout.id, name: layout.name, seatCount: layout.seatCount })),
    }));
}

/** Snapshots a venue layout into the event's seat plan with nobody seated yet. */
export async function createEventSeatPlan(sessionId: string, layoutId: string) {
  const existing = await prisma.eventSeatPlan.findUnique({ where: { sessionId }, select: { id: true } });
  if (existing) throw new Error('這場活動已經有座位表。要換配置請先按「更換配置」。');

  const layout = await prisma.venueLayout.findUnique({ where: { id: layoutId }, include: { venue: true } });
  if (!layout) throw new Error('找不到這個場地配置，可能已經被刪除，請重新選擇。');

  const objects = readPlanObjects(layout.objects);
  if (deriveSeats(objects).length === 0) {
    throw new Error('這個配置還沒有任何座位，請先到場地庫加入桌椅再建立座位表。');
  }

  try {
    return await prisma.eventSeatPlan.create({
      data: {
        sessionId,
        layoutId: layout.id,
        venueName: `${layout.venue.name}・${layout.name}`,
        widthM: layout.venue.widthM,
        heightM: layout.venue.heightM,
        objects: objects as unknown as Prisma.InputJsonValue,
        assignments: {},
      },
    });
  } catch (error) {
    // Two leaders pressing the button at the same time: the unique sessionId wins once.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('這場活動已經有座位表，請重新整理頁面。');
    }
    throw error;
  }
}

/**
 * Validates assignments posted by the seating editor against the plan's seat
 * ids and the event's participation ids, then stores them.
 */
export async function saveSeatAssignments(sessionId: string, input: unknown) {
  const plan = await getEventSeatPlan(sessionId);
  if (!plan) throw new Error('這場活動還沒有座位表，請先選擇場地配置。');
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('座位資料格式不正確，請重新整理頁面後再試一次。');
  }

  const entries = Object.entries(input as Record<string, unknown>);
  const seatLabels = new Map(deriveSeats(plan.objects).map((seat) => [seat.seatId, seat.label]));
  if (entries.length > seatLabels.size) throw new Error('座位資料比座位數還多，請重新整理頁面後再試一次。');

  const people = await prisma.participation.findMany({ where: { sessionId }, select: { id: true, displayName: true } });
  const nameById = new Map(people.map((row) => [row.id, row.displayName]));

  const assignments: SeatAssignments = {};
  const seenPeople = new Set<string>();
  for (const [seatId, participationId] of entries) {
    if (!seatLabels.has(seatId)) throw new Error('有座位不在目前的配置裡，請重新整理頁面後再排一次。');
    if (typeof participationId !== 'string' || !nameById.has(participationId)) {
      throw new Error(`座位 ${seatLabels.get(seatId)} 上的人已經不在這場活動的名單裡，請重新整理頁面後再排一次。`);
    }
    if (seenPeople.has(participationId)) {
      throw new Error(`${nameById.get(participationId)} 被排在兩個座位，請保留其中一個。`);
    }
    seenPeople.add(participationId);
    assignments[seatId] = participationId;
  }

  await prisma.eventSeatPlan.update({ where: { id: plan.id }, data: { assignments } });
  return { planId: plan.id, seated: seenPeople.size, seats: seatLabels.size };
}

/** Removes the event's seat plan together with its assignments. */
export async function deleteEventSeatPlan(sessionId: string) {
  const plan = await prisma.eventSeatPlan.findUnique({ where: { sessionId }, select: { id: true, venueName: true } });
  if (!plan) throw new Error('這場活動還沒有座位表。');
  await prisma.eventSeatPlan.delete({ where: { id: plan.id } });
  return plan;
}
