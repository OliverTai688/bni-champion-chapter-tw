// Marks a member as attending by proxy (代理) for one week, the same way the
// console does (participation status substitute + legacy attendanceOverrides).
// Use only for proxies the user named that did not register on the website.
// Without --proxy the placeholder 代理人 is stored; tell the user to fill it in.
//
//   node .claude/skills/weekly-seating/scripts/set-substitute.mjs --week=2026-11-12 --name=古又帆 --proxy=王小明          # dry run
//   node .claude/skills/weekly-seating/scripts/set-substitute.mjs --week=2026-11-12 --name=古又帆 --proxy=王小明 --write

import { ACTOR, getSession, parseArgs, requireWeek, withPrisma } from './lib.mjs';

const args = parseArgs();
const weekId = requireWeek(args.week);
const name = typeof args.name === 'string' ? args.name : null;
const proxyName = typeof args.proxy === 'string' && args.proxy.trim() ? args.proxy.trim() : '代理人';
if (!name) {
  console.error('Pass --name=<member display name>');
  process.exit(1);
}

await withPrisma(async (prisma) => {
  const session = await getSession(prisma, weekId);
  const member = await prisma.member.findUnique({ where: { displayName: name } });
  if (!member) throw new Error(`member ${name} not found`);
  const key = `m:${member.id}`;
  let row = await prisma.participation.findUnique({ where: { sessionId_key: { sessionId: session.id, key } } });

  const before = row ? { status: row.status, substituteName: row.substituteName } : null;
  if (row && !['expected', 'substitute'].includes(row.status)) {
    console.error(`${name} is ${row.status} for ${weekId}; not changed. Ask the user.`);
    process.exit(1);
  }
  if (!args.write) {
    console.log(JSON.stringify({ mode: 'dry-run', weekId, name, before, proxyName }, null, 2));
    return;
  }

  row ??= await prisma.participation.create({ data: { sessionId: session.id, key, kind: 'member', memberId: member.id, displayName: member.displayName } });
  const updated = await prisma.participation.update({
    where: { id: row.id },
    data: { status: 'substitute', substituteName: proxyName, substituteArrivedAt: null, checkedInAt: null, checkInMethod: null, intentSource: 'leader', intentAt: new Date() },
  });
  const fresh = await prisma.meetingSession.findUnique({ where: { id: session.id }, select: { metadata: true } });
  const metadata = { ...(fresh.metadata ?? {}) };
  metadata.attendanceOverrides = { ...(metadata.attendanceOverrides ?? {}), [member.displayName]: { status: 'proxy', proxyName } };
  await prisma.meetingSession.update({ where: { id: session.id }, data: { metadata } });
  await prisma.operationLog.create({
    data: {
      sessionId: session.id, actorRole: 'admin', actorName: ACTOR, action: 'intent_substitute', targetType: 'Participation', targetId: updated.id,
      reason: `使用者指示：${name} ${weekId} 由代理人出席`, metadata: { member: name, substituteName: proxyName },
    },
  });
  console.log(JSON.stringify({ mode: 'write', weekId, name, before, after: { status: updated.status, substituteName: updated.substituteName } }, null, 2));
});
