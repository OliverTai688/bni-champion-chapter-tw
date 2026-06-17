#!/usr/bin/env node

import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import ts from 'typescript';

const projectRoot = process.cwd();
const dryRun = process.argv.includes('--dry-run');
const write = process.argv.includes('--write');

if (!dryRun && !write) {
  console.error('Use --dry-run to preview or --write to upsert the current seed layout.');
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

function seatKind(seat) {
  if (!seat) return 'empty';
  if (seat.isGuest) return 'guest';
  if (seat.isHost) return 'host';
  if (seat.isSound) return 'sound';
  if (seat.isDuty) return 'duty';
  if (seat.role === '代理') return 'proxy';
  return 'member';
}

const { LAYOUT_0611, ROSTER_0611 } = loadTsModule('src/lib/layout-0611.ts');

const meetingSession = {
  weekId: '2026-06-11',
  date: '2026-06-11T00:00:00.000Z',
  title: '115/06/11 座位表',
  chapterName: 'BNI 長冠軍分會',
  meetingLabel: '每週例會排座',
  source: 'seed',
  status: 'draft',
};

const memberNames = new Set([
  ...ROSTER_0611.hostTeam.map((member) => member.name),
  ROSTER_0611.sound,
  ROSTER_0611.duty,
  ...ROSTER_0611.guests.flatMap((guest) => [guest.guestName, guest.hostName]),
  ...ROSTER_0611.members,
  ...ROSTER_0611.proxies,
].filter(Boolean));

const seats = [];
const assignments = [];

LAYOUT_0611.topRoles.forEach((seat, index) => {
  const seatKey = `top-${index}`;
  seats.push({
    seatKey,
    row: null,
    col: index,
    zone: 'top',
    position: index,
    kind: 'host_team',
    label: seat.role ?? null,
    metadata: seat,
  });
  assignments.push({
    seatKey,
    displayName: seat.name,
    role: seat.role ?? null,
    guestNumber: null,
    hostFor: null,
    status: 'assigned',
    source: 'seed',
  });
});

LAYOUT_0611.mainGrid.forEach((row, rowIndex) => {
  row.forEach((seat, colIndex) => {
    const position = rowIndex * row.length + colIndex;
    const seatKey = `main-${rowIndex}-${colIndex}`;
    seats.push({
      seatKey,
      row: rowIndex,
      col: colIndex,
      zone: 'main',
      position,
      kind: seatKind(seat),
      label: seat?.guestNumber ?? seat?.role ?? null,
      metadata: seat,
    });
    if (seat) {
      assignments.push({
        seatKey,
        displayName: seat.name,
        role: seat.role ?? (seat.isSound ? '音控' : seat.isDuty ? '值日生' : seat.isHost ? '執事' : seat.isGuest ? '來賓' : '會員'),
        guestNumber: seat.guestNumber ?? null,
        hostFor: seat.hostFor ?? null,
        status: 'assigned',
        source: 'seed',
      });
    }
  });
});

const seatMap = {
  title: meetingSession.title,
  version: 1,
  status: 'draft',
  layoutKind: 'bni-weekly-grid',
  topRoles: LAYOUT_0611.topRoles,
  memberRoster: ROSTER_0611.members,
  heroes: ROSTER_0611.heroes,
  industryChains: ROSTER_0611.industryChains,
  source: 'seed',
};

const revision = {
  version: 1,
  snapshot: {
    week: meetingSession,
    topRoles: LAYOUT_0611.topRoles,
    mainGrid: LAYOUT_0611.mainGrid,
    sidebar: LAYOUT_0611.sidebar,
    roster: ROSTER_0611,
  },
  validationSummary: null,
  createdBy: 'seed-current-layout',
  reason: 'Initial dry-run import preview for current seed layout.',
};

const preview = {
  mode: dryRun ? 'dry-run' : 'write',
  writes: {
    meetingSessions: 1,
    members: memberNames.size,
    seatMaps: 1,
    seats: seats.length,
    seatAssignments: assignments.length,
    seatMapRevisions: 1,
    operationLogs: 1,
  },
  meetingSession,
  seatMap,
  sampleSeats: seats.slice(0, 8),
  sampleAssignments: assignments.slice(0, 8),
  revisionSummary: {
    version: revision.version,
    snapshotKeys: Object.keys(revision.snapshot),
    reason: revision.reason,
  },
};

async function writeSeed() {
  const prisma = new PrismaClient();

  try {
    const session = await prisma.meetingSession.upsert({
      where: { weekId: meetingSession.weekId },
      create: {
        ...meetingSession,
        date: new Date(meetingSession.date),
      },
      update: {
        date: new Date(meetingSession.date),
        title: meetingSession.title,
        chapterName: meetingSession.chapterName,
        meetingLabel: meetingSession.meetingLabel,
        source: meetingSession.source,
        status: meetingSession.status,
      },
    });

    for (const displayName of memberNames) {
      await prisma.member.upsert({
        where: { displayName },
        create: {
          displayName,
          roles: [],
          metadata: { importedFrom: 'layout-0611' },
        },
        update: {
          isActive: true,
        },
      });
    }

    const oldSeatMaps = await prisma.seatMap.findMany({
      where: {
        sessionId: session.id,
        source: 'seed',
        layoutKind: seatMap.layoutKind,
      },
      select: { id: true },
    });

    for (const oldSeatMap of oldSeatMaps) {
      await prisma.seatAssignment.deleteMany({ where: { seatMapId: oldSeatMap.id } });
      await prisma.seatMapRevision.deleteMany({ where: { seatMapId: oldSeatMap.id } });
      await prisma.seat.deleteMany({ where: { seatMapId: oldSeatMap.id } });
      await prisma.seatMap.delete({ where: { id: oldSeatMap.id } });
    }

    const createdSeatMap = await prisma.seatMap.create({
      data: {
        sessionId: session.id,
        ...seatMap,
      },
    });

    const createdSeats = new Map();
    for (const seat of seats) {
      const createdSeat = await prisma.seat.create({
        data: {
          seatMapId: createdSeatMap.id,
          ...seat,
        },
      });
      createdSeats.set(seat.seatKey, createdSeat);
    }

    for (const assignment of assignments) {
      const targetSeat = createdSeats.get(assignment.seatKey);
      if (!targetSeat) continue;
      const member = await prisma.member.findUnique({
        where: { displayName: assignment.displayName },
        select: { id: true },
      });
      await prisma.seatAssignment.create({
        data: {
          seatMapId: createdSeatMap.id,
          seatId: targetSeat.id,
          memberId: member?.id,
          displayName: assignment.displayName,
          role: assignment.role,
          guestNumber: assignment.guestNumber,
          hostFor: assignment.hostFor,
          status: assignment.status,
          source: assignment.source,
        },
      });
    }

    await prisma.seatMapRevision.create({
      data: {
        seatMapId: createdSeatMap.id,
        ...revision,
        reason: 'Initial write import for current seed layout.',
      },
    });

    await prisma.operationLog.create({
      data: {
        sessionId: session.id,
        actorRole: 'import',
        actorName: 'seed-current-layout',
        action: 'seed_current_layout_imported',
        targetType: 'SeatMap',
        targetId: createdSeatMap.id,
        reason: 'Approved DATA-003 seed import.',
        metadata: preview.writes,
      },
    });

    return {
      ...preview,
      ids: {
        sessionId: session.id,
        seatMapId: createdSeatMap.id,
      },
      replacedSeatMaps: oldSeatMaps.length,
    };
  } finally {
    await prisma.$disconnect();
  }
}

if (dryRun) {
  console.log(JSON.stringify(preview, null, 2));
} else {
  writeSeed()
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, name: error.name, message: error.message }, null, 2));
      process.exit(1);
    });
}
