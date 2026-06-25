#!/usr/bin/env node

// Toggle the guest-headcount registration mode on a single existing event.
//
// Usage:
//   node scripts/set-registration-mode.mjs <weekId> [on|off]
//   node scripts/set-registration-mode.mjs 2026-07-18        # enable (default)
//   node scripts/set-registration-mode.mjs 2026-07-18 off    # disable
//
// Only the named weekId is touched; metadata for every other event is left intact.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';

// Standalone node scripts don't get Next.js' .env loading, so do a minimal parse.
function loadEnv() {
  if (process.env.DATABASE_URL) return;
  for (const file of ['.env.local', '.env']) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}

loadEnv();

const weekId = process.argv[2];
const toggle = (process.argv[3] ?? 'on').toLowerCase();

if (!weekId) {
  console.error('Provide a weekId, e.g. node scripts/set-registration-mode.mjs 2026-07-18 on');
  process.exit(1);
}
if (toggle !== 'on' && toggle !== 'off') {
  console.error('Second argument must be "on" or "off".');
  process.exit(1);
}

const registrationMode = toggle === 'on';
const prisma = new PrismaClient();

try {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId },
    select: { id: true, weekId: true, title: true, metadata: true },
  });

  if (!session) {
    console.error(`No event found for weekId ${weekId}.`);
    process.exit(1);
  }

  const currentMetadata =
    session.metadata && typeof session.metadata === 'object' && !Array.isArray(session.metadata)
      ? session.metadata
      : {};

  await prisma.meetingSession.update({
    where: { id: session.id },
    data: { metadata: { ...currentMetadata, registrationMode } },
  });

  console.log(`✓ ${weekId} (${session.title}) registrationMode = ${registrationMode}`);
} finally {
  await prisma.$disconnect();
}
