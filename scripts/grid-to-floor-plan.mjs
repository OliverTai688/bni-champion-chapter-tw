#!/usr/bin/env node

// Converts an event's grid seat map (SeatMap, 5 top roles + 4 columns) into the
// toolbox floor plan (EventSeatPlan).
//
// Room, front to back: head table with 5 chairs behind it, then two long tables running
// towards the back. 一排 / 二排 face each other across 長桌 A, 三排 / 四排 across
// 長桌 B. Grid column c becomes 排 c+1, grid row r becomes seat r+1 of that 排.
//
// Usage:
//   node scripts/grid-to-floor-plan.mjs --week=2026-10-08 --dry-run
//   node scripts/grid-to-floor-plan.mjs --week=2026-10-08 --write
//   node scripts/grid-to-floor-plan.mjs --week=2026-10-08 --write --replace

import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import ts from 'typescript';

const projectRoot = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const write = args.includes('--write');
const replace = args.includes('--replace');
const weekId = args.find((arg) => arg.startsWith('--week='))?.slice('--week='.length);

if ((!dryRun && !write) || !weekId || !/^\d{4}-\d{2}-\d{2}$/.test(weekId)) {
  console.error('Use --week=YYYY-MM-DD with --dry-run to preview or --write to store the floor plan.');
  process.exit(1);
}

function loadTsModule(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;

  const mod = new Module(absolutePath);
  mod.filename = absolutePath;
  mod.paths = Module._nodeModulePaths(path.dirname(absolutePath));
  mod._compile(transpiled, absolutePath);
  return mod.exports;
}

const { parsePlanObjects, deriveSeats, countSeats, isCrowded } = loadTsModule('src/lib/tbx/plan.ts');

const VENUE_NAME = '例會會場（兩長桌）';
const HEAD_SEATS = 5;
const LINE_COUNT = 4;
const MIN_SEATS_PER_LINE = 10;
const LINE_LABELS = ['一排', '二排', '三排', '四排'];

// Metres. Chairs are 0.6 m apart along a table, 0.35 m from its edge (CHAIR_GAP in plan.ts).
// The room is kept narrow so the plan with names fits a phone screen without sideways scrolling.
const ROOM_W = 4.8;
const SEAT_PITCH = 0.6;
const TABLE_DEPTH = 0.6;
const LINE_X = [0.55, 1.85, 2.95, 4.25];
const TABLE_X = [1.2, 3.6];
const HEAD_TABLE_Y = 1.25;
const FIRST_SEAT_Y = 2.9;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function buildObjects(seatsPerLine) {
  const tableLength = seatsPerLine * SEAT_PITCH;
  const centreY = round2(FIRST_SEAT_Y + ((seatsPerLine - 1) * SEAT_PITCH) / 2);
  const heightM = round2(FIRST_SEAT_Y + (seatsPerLine - 1) * SEAT_PITCH + 1.3);

  const objects = [
    // Rotated 180°: the head team sits behind the table, facing the room. Seat 1 is on the right of the drawing.
    { id: 'head', type: 'rect', x: ROOM_W / 2, y: HEAD_TABLE_Y, w: 4, h: TABLE_DEPTH, seats: HEAD_SEATS, sides: 'one', label: '主桌', rotation: 180 },
    { id: 'tableA', type: 'rect', x: TABLE_X[0], y: centreY, w: tableLength, h: TABLE_DEPTH, seats: 0, sides: 'two', label: 'A', rotation: 90 },
    { id: 'tableB', type: 'rect', x: TABLE_X[1], y: centreY, w: tableLength, h: TABLE_DEPTH, seats: 0, sides: 'two', label: 'B', rotation: 90 },
    // Rotated 90°: seat 1 is at the front, next to the head table.
    ...LINE_LABELS.map((label, index) => ({
      id: `line${index + 1}`,
      type: 'row',
      x: LINE_X[index],
      y: centreY,
      seats: seatsPerLine,
      spacing: SEAT_PITCH,
      label,
      rotation: 90,
    })),
  ];

  return { objects: parsePlanObjects(objects), widthM: ROOM_W, heightM };
}

function layoutName(seatsPerLine) {
  return `四排兩長桌（每排 ${seatsPerLine} 位）`;
}

function seatIdFor(seat) {
  // Top roles are stored left to right; the rotated head table numbers its chairs right to left.
  if (seat.zone === 'top') return seat.col !== null && seat.col < HEAD_SEATS ? `head:${HEAD_SEATS - 1 - seat.col}` : null;
  if (seat.zone === 'main' && seat.row !== null && seat.col !== null && seat.col < LINE_COUNT) {
    return `line${seat.col + 1}:${seat.row}`;
  }
  return null;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const session = await prisma.meetingSession.findUnique({
      where: { weekId },
      include: {
        seatMaps: {
          orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
          take: 1,
          include: { seats: { orderBy: { position: 'asc' }, include: { assignments: true } } },
        },
        seatPlan: { select: { id: true, venueName: true } },
      },
    });
    if (!session) throw new Error(`No MeetingSession for ${weekId}. Seed or create the event first.`);
    const seatMap = session.seatMaps[0];
    if (!seatMap) throw new Error(`MeetingSession ${weekId} has no grid seat map to convert.`);

    const mainRows = seatMap.seats.filter((seat) => seat.zone === 'main' && seat.row !== null).map((seat) => seat.row);
    const seatsPerLine = Math.max(MIN_SEATS_PER_LINE, ...mainRows.map((row) => row + 1));
    const { objects, widthM, heightM } = buildObjects(seatsPerLine);
    if (isCrowded(objects)) throw new Error('The generated floor plan has overlapping furniture.');
    const planSeats = new Map(deriveSeats(objects).map((seat) => [seat.seatId, seat]));

    const occupied = seatMap.seats
      .map((seat) => ({ seat, assignment: seat.assignments[0] ?? null }))
      .filter((entry) => entry.assignment);

    const members = await prisma.member.findMany({
      where: { category: 'member', isActive: true },
      select: { id: true, displayName: true },
    });
    const participations = await prisma.participation.findMany({
      where: { sessionId: session.id },
      select: { id: true, key: true, kind: true, displayName: true },
    });
    const missingMembers = members.filter((member) => !participations.some((row) => row.key === `m:${member.id}`));

    const preview = {
      mode: dryRun ? 'dry-run' : 'write',
      weekId,
      title: session.title,
      source: { seatMapSource: seatMap.source, version: seatMap.version, occupiedSeats: occupied.length },
      venue: { name: VENUE_NAME, layout: layoutName(seatsPerLine), widthM, heightM, seatCount: countSeats(objects) },
      existingPlan: session.seatPlan ? session.seatPlan.venueName ?? 'unnamed' : null,
      participationsToCreate: missingMembers.length,
    };

    if (session.seatPlan && !replace && write) {
      throw new Error(`${weekId} already has a floor plan (${preview.existingPlan}). Re-run with --replace to overwrite it.`);
    }

    if (write) {
      // Same key convention as ensureParticipations() in src/server/tbx/participation.ts.
      for (const member of missingMembers) {
        const created = await prisma.participation.create({
          data: {
            sessionId: session.id,
            key: `m:${member.id}`,
            kind: 'member',
            memberId: member.id,
            displayName: member.displayName,
          },
          select: { id: true, key: true, kind: true, displayName: true },
        });
        participations.push(created);
      }
    }

    const memberIdByName = new Map(members.map((member) => [member.displayName.trim(), member.id]));
    const participationByKey = new Map(participations.map((row) => [row.key, row]));
    const guestByName = new Map(
      participations.filter((row) => row.kind === 'guest').map((row) => [row.displayName.trim(), row]),
    );

    const assignments = {};
    const seated = [];
    const unmatched = [];
    // 值日 / 音控 move from the seat to the person (Participation.roles), so they follow later seat changes.
    const duties = [];
    for (const { seat, assignment } of occupied) {
      const name = assignment.displayName.trim();
      const seatId = seatIdFor(seat);
      const target = seatId ? planSeats.get(seatId) : null;
      if (!target) {
        unmatched.push({ seatKey: seat.seatKey, name, reason: 'no matching seat on the floor plan' });
        continue;
      }
      const memberId = seat.kind === 'guest' ? null : memberIdByName.get(name);
      const row = memberId ? participationByKey.get(`m:${memberId}`) : guestByName.get(name);
      if (!row) {
        // In a dry run member rows may not exist yet; they are created on --write.
        if (dryRun && memberId) seated.push({ seatKey: seat.seatKey, name, to: target.label });
        else unmatched.push({ seatKey: seat.seatKey, name, reason: 'not on the event attendance list' });
        continue;
      }
      if (Object.values(assignments).includes(row.id)) {
        unmatched.push({ seatKey: seat.seatKey, name, reason: 'already seated elsewhere' });
        continue;
      }
      assignments[seatId] = row.id;
      seated.push({ seatKey: seat.seatKey, name, to: target.label });

      const meta = seat.metadata && typeof seat.metadata === 'object' ? seat.metadata : {};
      const roles = [
        ...(seat.kind === 'duty' || meta.isDuty === true ? ['duty'] : []),
        ...(seat.kind === 'sound' || meta.isSound === true ? ['sound'] : []),
      ];
      if (roles.length > 0 && row.kind === 'member') duties.push({ participationId: row.id, name, roles });
    }

    // Same key order as the console seat editor (plan seat order), so the editor does not open as "尚未儲存".
    const ordered = Object.fromEntries([...planSeats.keys()].filter((id) => assignments[id]).map((id) => [id, assignments[id]]));

    preview.duties = duties.map((entry) => `${entry.name}: ${entry.roles.join(', ')}`);
    preview.seated = seated.length;
    preview.unmatched = unmatched;
    preview.seatMapping = seated.map((entry) => `${entry.seatKey} ${entry.name} -> ${entry.to}`);

    if (dryRun) {
      console.log(JSON.stringify(preview, null, 2));
      return;
    }

    const venue =
      (await prisma.venue.findFirst({ where: { name: VENUE_NAME } })) ??
      (await prisma.venue.create({
        data: { name: VENUE_NAME, widthM, heightM, note: '由格狀排座轉換：主桌 5 席，一二排夾長桌 A，三四排夾長桌 B。' },
      }));
    const layout =
      (await prisma.venueLayout.findFirst({ where: { venueId: venue.id, name: layoutName(seatsPerLine) } })) ??
      (await prisma.venueLayout.create({
        data: { venueId: venue.id, name: layoutName(seatsPerLine), kind: 'custom', objects, seatCount: countSeats(objects) },
      }));

    if (session.seatPlan) await prisma.eventSeatPlan.delete({ where: { id: session.seatPlan.id } });
    const plan = await prisma.eventSeatPlan.create({
      data: {
        sessionId: session.id,
        layoutId: layout.id,
        venueName: `${venue.name}・${layout.name}`,
        widthM,
        heightM,
        objects,
        assignments: ordered,
      },
    });

    for (const entry of duties) {
      await prisma.participation.update({ where: { id: entry.participationId }, data: { roles: entry.roles } });
    }

    await prisma.operationLog.create({
      data: {
        sessionId: session.id,
        actorRole: 'import',
        actorName: 'grid-to-floor-plan',
        action: 'seat_plan_converted_from_grid',
        targetType: 'EventSeatPlan',
        targetId: plan.id,
        reason: `Converted grid seat map v${seatMap.version} into a floor plan.`,
        metadata: {
          seatMapId: seatMap.id,
          layoutId: layout.id,
          seated: seated.length,
          unmatched: unmatched.length,
          replacedExistingPlan: Boolean(session.seatPlan),
        },
      },
    });

    console.log(JSON.stringify({ ...preview, ids: { venueId: venue.id, layoutId: layout.id, planId: plan.id } }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, name: error.name, message: error.message }, null, 2));
  process.exit(1);
});
