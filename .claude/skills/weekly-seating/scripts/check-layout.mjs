// Read-only check of src/lib/layout-MMDD.ts against the production roster and
// the week's participations. Exit code 1 when a hard rule fails.
//
//   node .claude/skills/weekly-seating/scripts/check-layout.mjs --week=2026-11-12

import { getSession, listChapterMembers, loadTsModule, parseArgs, requireWeek, withPrisma } from './lib.mjs';

const args = parseArgs();
const weekId = requireWeek(args.week);
const mmdd = weekId.slice(5).replace('-', '');
const mod = loadTsModule(`src/lib/layout-${mmdd}.ts`);
const layout = mod[`LAYOUT_${mmdd}`];
const roster = mod[`ROSTER_${mmdd}`];
if (!layout || !roster) {
  console.error(`src/lib/layout-${mmdd}.ts must export LAYOUT_${mmdd} and ROSTER_${mmdd}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const grid = layout.mainGrid;
const rows = grid.length;
const cols = Math.max(...grid.map((row) => row.length));
const at = (r, c) => grid[r]?.[c] ?? null;

await withPrisma(async (prisma) => {
  const session = await getSession(prisma, weekId);
  const members = await listChapterMembers(prisma);
  const memberNames = new Set(members.map((m) => m.displayName));
  const parts = await prisma.participation.findMany({ where: { sessionId: session.id } });

  // Every active member exactly once (top roles + grid); no unknown non-guest names.
  const seen = new Map();
  const place = (name, where) => seen.set(name, [...(seen.get(name) ?? []), where]);
  layout.topRoles.forEach((seat, i) => seat && place(seat.name, `top-${i}`));
  grid.forEach((row, r) => row.forEach((seat, c) => seat && !seat.isGuest && place(seat.name, `g-${r}-${c}`)));
  for (const [name, spots] of seen) {
    if (spots.length > 1) errors.push(`${name} seated ${spots.length} times: ${spots.join(', ')}`);
    if (!memberNames.has(name)) errors.push(`${name} (${spots.join(', ')}) is not an active member (category member, isActive)`);
  }
  for (const name of memberNames) if (!seen.has(name)) errors.push(`member ${name} has no seat`);

  // Guests: a participation each, 執事 directly behind (same column, next row) with matching hostFor.
  const guestParts = parts.filter((p) => p.kind === 'guest');
  grid.forEach((row, r) => row.forEach((seat, c) => {
    if (!seat?.isGuest) return;
    const host = at(r + 1, c);
    if (!host?.isHost || host.hostFor !== seat.guestNumber) {
      errors.push(`guest ${seat.name} (${seat.guestNumber}) at g-${r}-${c}: g-${r + 1}-${c} must be isHost with hostFor ${seat.guestNumber}`);
    }
    if (!guestParts.some((p) => p.displayName === seat.name)) warnings.push(`guest ${seat.name} has no guest participation yet`);
  }));
  for (const p of guestParts) {
    if (!grid.flat().some((s) => s?.isGuest && s.name === p.displayName)) warnings.push(`guest participation ${p.displayName} has no seat`);
  }

  // Proxies: seats marked 代理 should equal participations with status substitute.
  const proxySeats = new Set(grid.flat().filter((s) => s?.role === '代理').map((s) => s.name));
  const substitutes = new Set(parts.filter((p) => p.status === 'substitute').map((p) => p.displayName));
  for (const n of proxySeats) if (!substitutes.has(n)) warnings.push(`${n} is seated as 代理 but is not a substitute participation`);
  for (const n of substitutes) if (!proxySeats.has(n)) warnings.push(`${n} registered a substitute but is not seated as 代理`);
  const lastRow = grid.length - 1;
  grid.forEach((row, r) => row.forEach((seat) => {
    if (seat?.role === '代理' && r < lastRow - 1) warnings.push(`代理 ${seat.name} is at row ${r}; proxies go in the last rows`);
  }));

  // 攝影: middle aisle (column 1 = 二排 or 2 = 三排), back half, ahead of the proxy row.
  const photo = [];
  grid.forEach((row, r) => row.forEach((seat, c) => seat?.isPhoto && photo.push({ name: seat.name, r, c })));
  if (photo.length !== 1) warnings.push(`expected one isPhoto seat, found ${photo.length}`);
  for (const p of photo) {
    const proxyRow = grid[p.r].some((s) => s?.role === '代理');
    if (![1, 2].includes(p.c)) errors.push(`攝影 ${p.name} at g-${p.r}-${p.c}: must be column 1 or 2 (middle aisle)`);
    if (p.r < Math.ceil(rows / 2)) errors.push(`攝影 ${p.name} at row ${p.r}: must be in the back half (row >= ${Math.ceil(rows / 2)})`);
    if (proxyRow) errors.push(`攝影 ${p.name} shares the proxy row; move one row forward`);
  }

  // Duty roles present once each.
  for (const flag of ['isDuty', 'isSound']) {
    const n = grid.flat().filter((s) => s?.[flag]).length;
    if (n !== 1) warnings.push(`expected one ${flag} seat, found ${n}`);
  }

  // Heroes and roster names must be real members.
  for (const n of roster.heroes ?? []) if (!memberNames.has(n)) errors.push(`hero ${n} is not an active member`);

  console.log(JSON.stringify({
    weekId,
    grid: `${rows} rows x ${cols}`,
    seatedMembers: seen.size,
    activeMembers: memberNames.size,
    guests: guestParts.map((p) => p.displayName),
    substitutes: [...substitutes],
    photo,
    errors,
    warnings,
  }, null, 2));
  if (errors.length) process.exit(1);
});
