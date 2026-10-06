#!/usr/bin/env node
// Read-only release check: required environment variables (names only, never
// values) and the state of the database the app will run against.
//
//   DATABASE_URL=... node scripts/release-preflight.mjs
//
// It never writes. Schema changes go through `pnpm run prisma:push`.

import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const REQUIRED = ['DATABASE_URL', 'AUTH_SECRET', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'];
const RECOMMENDED = ['ADMIN_PASSWORD', 'AUTH_ALLOWED_EMAILS', 'AUTH_LINE_ID', 'AUTH_LINE_SECRET'];

const report = { env: {}, database: {}, problems: [], notes: [] };

for (const name of [...REQUIRED, ...RECOMMENDED]) {
  report.env[name] = process.env[name] ? 'set' : 'missing';
}
for (const name of REQUIRED) if (!process.env[name]) report.problems.push(`${name} is not set`);
if (!process.env.ADMIN_PASSWORD) report.notes.push('ADMIN_PASSWORD not set: password login to /console is off (Google/LINE leaders only).');
if (!process.env.AUTH_LINE_ID) report.notes.push('LINE login not configured: the LINE button is hidden.');

if (process.env.DATABASE_URL) {
  const prisma = new PrismaClient();
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    const collections = await prisma.$runCommandRaw({ listCollections: 1, nameOnly: true });
    const names = new Set((collections?.cursor?.firstBatch ?? []).map((item) => item.name));
    const expected = ['MeetingSession', 'Member', 'SeatMap', 'Participation', 'MemberLoginLink', 'ApiToken', 'MemberIdentity'];
    report.database.collections = Object.fromEntries(expected.map((name) => [name, names.has(name)]));
    const missing = expected.filter((name) => !names.has(name));
    if (missing.length) report.problems.push(`collections missing (run prisma db push): ${missing.join(', ')}`);

    const count = async (model, where) => (names.has(model[0].toUpperCase() + model.slice(1)) ? prisma[model].count({ where }) : null);
    report.database.counts = {
      events: await count('meetingSession'),
      gridSeatMaps: await count('seatMap'),
      members: await count('member', { category: 'member', isActive: true }),
      membersUnclassified: await count('member', { isActive: true, category: null }),
      membersWithEmail: await count('member', { category: 'member', isActive: true, email: { not: null } }),
      roleTerms: await count('roleTerm'),
      participations: await count('participation'),
      lineBindings: names.has('MemberIdentity') ? await prisma.memberIdentity.count({ where: { provider: 'line' } }) : null,
      apiTokens: names.has('ApiToken') ? await prisma.apiToken.count() : null,
    };
    if (report.database.counts.members === 0) {
      report.notes.push('No classified chapter members yet: open /console/members and press 從靜態名冊同步 once after deploy.');
    }
    if (report.database.counts.roleTerms === 0) {
      report.notes.push('No role terms: leaders can only use the admin password or AUTH_ALLOWED_EMAILS until terms are added in /console/settings/roles.');
    }
  } catch (error) {
    report.problems.push(`database: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  } finally {
    await prisma.$disconnect();
  }
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.problems.length ? 1 : 0);
