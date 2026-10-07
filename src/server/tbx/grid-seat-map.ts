import 'server-only';

import type { Participation } from '@prisma/client';
import { prisma } from '@/server/db/prisma';
import type { ParticipationStatusKey } from '@/lib/tbx/labels';
import { findLatestSeatMapByWeekId } from '@/server/repositories/seating-workspace-repository';

export type GridSeatTag = 'host_team' | 'sound' | 'duty' | 'guest' | 'host' | 'member' | 'proxy' | 'empty';

export interface GridSeat {
  key: string;
  zone: 'top' | 'main';
  row: number | null;
  col: number | null;
  /** Grid label such as A1 for main seats, the role for top seats. */
  label: string;
  tag: GridSeatTag;
  /** 主席, 賓1, 執·賓1, 代理, 音控… */
  badge: string | null;
  name: string | null;
  participationId: string | null;
  status: ParticipationStatusKey | null;
  substituteName: string | null;
  substituteArrived: boolean;
}

export interface GridSeatView {
  weekId: string;
  version: number;
  updatedAt: Date;
  columns: number;
  top: GridSeat[];
  main: GridSeat[];
}

const TAGS = new Set<GridSeatTag>(['host_team', 'sound', 'duty', 'guest', 'host', 'member', 'proxy', 'empty']);

function rowLetter(row: number) {
  return String.fromCharCode(65 + (row % 26));
}

function readMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * The weekly grid seat map (SeatMap, the format the chapter uses every week)
 * joined with today's attendance from Participation. Only display fields are
 * returned, so the result is safe for public pages.
 */
export async function getGridSeatView(weekId: string, sessionId: string): Promise<GridSeatView | null> {
  const seatMap = await findLatestSeatMapByWeekId(weekId).catch(() => null);
  if (!seatMap) return null;

  const rows: Participation[] = await prisma.participation.findMany({ where: { sessionId } });
  const byMemberId = new Map<string, Participation>();
  const memberByName = new Map<string, Participation>();
  const guestByName = new Map<string, Participation>();
  for (const row of rows) {
    if (row.kind === 'member') {
      if (row.memberId) byMemberId.set(row.memberId, row);
      memberByName.set(row.displayName.trim(), row);
    } else {
      guestByName.set(row.displayName.trim(), row);
    }
  }

  const toSeat = (seat: (typeof seatMap.seats)[number]): GridSeat => {
    const assignment = seat.assignments[0] ?? null;
    const meta = readMeta(seat.metadata);
    const zone = seat.zone === 'top' ? 'top' : 'main';
    const tag: GridSeatTag = TAGS.has(seat.kind as GridSeatTag) ? (seat.kind as GridSeatTag) : 'member';
    const name = assignment?.displayName?.trim() || null;

    let participation: Participation | undefined;
    if (assignment && name) {
      participation =
        tag === 'guest'
          ? guestByName.get(name)
          : (assignment.memberId ? byMemberId.get(assignment.memberId) : undefined) ?? memberByName.get(name);
    }

    const role = assignment?.role ?? (typeof meta.role === 'string' ? meta.role : null);
    let badge: string | null = null;
    if (zone === 'top') badge = role;
    else if (tag === 'guest') badge = assignment?.guestNumber ?? '來賓';
    else if (tag === 'host') badge = assignment?.hostFor ? `執·${assignment.hostFor}` : '執事';
    else if (tag === 'proxy') badge = '代理';
    else if (tag === 'sound') badge = meta.isDuty === true ? '值日・音控' : '音控';
    else if (tag === 'duty') badge = '值日生';

    const status = participation?.status ?? null;
    return {
      key: seat.seatKey,
      zone,
      row: seat.row,
      col: seat.col,
      label: zone === 'top' ? role ?? '主持團' : seat.row !== null && seat.col !== null ? `${rowLetter(seat.row)}${seat.col + 1}` : seat.seatKey,
      tag: name ? tag : 'empty',
      badge: name ? badge : null,
      name,
      participationId: participation?.id ?? null,
      status,
      substituteName: status === 'substitute' ? participation?.substituteName ?? null : null,
      substituteArrived: status === 'substitute' && Boolean(participation?.substituteArrivedAt),
    };
  };

  const top = seatMap.seats.filter((seat) => seat.zone === 'top').sort((a, b) => a.position - b.position).map(toSeat);
  const main = seatMap.seats.filter((seat) => seat.zone !== 'top').sort((a, b) => a.position - b.position).map(toSeat);
  const columns = Math.max(4, ...main.map((seat) => (seat.col ?? 0) + 1));

  return { weekId, version: seatMap.version, updatedAt: seatMap.updatedAt, columns, top, main };
}
