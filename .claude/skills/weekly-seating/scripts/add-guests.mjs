// Creates the week's guest participations. Skips a guest that already exists.
// guests.json: [{ "name": "葉瑋庭", "industry": "廣告配音員", "host": "陳志誠", "referrer": "黃佳琪", "note": "賓1" }]
// host / referrer are member display names; referrer may be omitted (e.g. an outside referral, put it in note).
//
//   node .claude/skills/weekly-seating/scripts/add-guests.mjs --week=2026-11-12 --file=<scratchpad>/guests.json          # dry run
//   node .claude/skills/weekly-seating/scripts/add-guests.mjs --week=2026-11-12 --file=<scratchpad>/guests.json --write

import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { getSession, parseArgs, requireWeek, withPrisma } from './lib.mjs';

const args = parseArgs();
const weekId = requireWeek(args.week);
if (typeof args.file !== 'string') {
  console.error('Pass --file=path/to/guests.json');
  process.exit(1);
}
const guests = JSON.parse(fs.readFileSync(args.file, 'utf8'));

await withPrisma(async (prisma) => {
  const session = await getSession(prisma, weekId);
  const memberId = async (name) => {
    if (!name) return null;
    const m = await prisma.member.findUnique({ where: { displayName: name }, select: { id: true } });
    if (!m) throw new Error(`member ${name} not found`);
    return m.id;
  };

  const out = [];
  for (const g of guests) {
    const hostMemberId = await memberId(g.host);
    const invitedByMemberId = await memberId(g.referrer);
    const existing = await prisma.participation.findFirst({ where: { sessionId: session.id, kind: 'guest', displayName: g.name } });
    if (existing) {
      out.push({ name: g.name, result: 'exists', key: existing.key });
      continue;
    }
    if (!args.write) {
      out.push({ name: g.name, result: 'would create', host: g.host, referrer: g.referrer ?? null, note: g.note });
      continue;
    }
    const row = await prisma.participation.create({
      data: {
        sessionId: session.id, key: `g:${randomBytes(6).toString('hex')}`, kind: 'guest', displayName: g.name,
        guestIndustry: g.industry ?? null, guestCompany: g.company ?? null, hostMemberId, invitedByMemberId, note: g.note ?? null, status: 'expected',
      },
    });
    out.push({ name: g.name, result: 'created', key: row.key });
  }
  console.log(JSON.stringify({ mode: args.write ? 'write' : 'dry-run', weekId, guests: out }, null, 2));
});
