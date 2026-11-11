// Turns a former guest into a chapter member (新夥伴) and gives them a member
// participation for the week. Creates the Member row if it does not exist.
//
//   node .claude/skills/weekly-seating/scripts/promote-member.mjs --week=2026-11-12 --name=譚旭良 --industry=企業金融          # dry run
//   node .claude/skills/weekly-seating/scripts/promote-member.mjs --week=2026-11-12 --name=譚旭良 --industry=企業金融 --write

import { ACTOR, getSession, parseArgs, requireWeek, withPrisma } from './lib.mjs';

const args = parseArgs();
const weekId = requireWeek(args.week);
const name = typeof args.name === 'string' ? args.name.trim() : '';
const industry = typeof args.industry === 'string' ? args.industry.trim() : null;
if (!name) {
  console.error('Pass --name=<display name>');
  process.exit(1);
}

await withPrisma(async (prisma) => {
  const session = await getSession(prisma, weekId);
  const existing = await prisma.member.findUnique({ where: { displayName: name } });
  const before = existing ? { category: existing.category, roles: existing.roles, industry: existing.industry, isActive: existing.isActive } : null;
  if (!args.write) {
    console.log(JSON.stringify({ mode: 'dry-run', weekId, name, before, industry: industry ?? existing?.industry ?? null }, null, 2));
    return;
  }

  const data = { category: 'member', roles: ['會員'], industry: industry ?? existing?.industry ?? null, isActive: true };
  const member = existing
    ? await prisma.member.update({ where: { id: existing.id }, data })
    : await prisma.member.create({ data: { displayName: name, ...data } });
  await prisma.operationLog.create({
    data: {
      actorRole: 'admin', actorName: ACTOR, action: existing ? 'member_updated' : 'member_created', targetType: 'Member', targetId: member.id,
      reason: `${weekId} 新夥伴 ${name} 入會`, metadata: { before, after: { category: member.category, roles: member.roles, industry: member.industry } },
    },
  });
  const key = `m:${member.id}`;
  const part = (await prisma.participation.findUnique({ where: { sessionId_key: { sessionId: session.id, key } } }))
    ?? (await prisma.participation.create({ data: { sessionId: session.id, key, kind: 'member', memberId: member.id, displayName: member.displayName } }));
  console.log(JSON.stringify({ mode: 'write', weekId, memberId: member.id, before, participation: part.id }, null, 2));
});
