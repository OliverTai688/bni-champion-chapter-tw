// Copies last week's undrawn 長冠軍 gifts to this week (remaining quantity only).
// Refuses when the target week already has gifts.
//
//   node .claude/skills/weekly-seating/scripts/copy-gifts.mjs --from=2026-11-05 --to=2026-11-12          # dry run
//   node .claude/skills/weekly-seating/scripts/copy-gifts.mjs --from=2026-11-05 --to=2026-11-12 --write

import { ACTOR, getSession, parseArgs, requireWeek, withPrisma } from './lib.mjs';

const args = parseArgs();
const fromWeek = requireWeek(args.from, 'from');
const toWeek = requireWeek(args.to, 'to');

await withPrisma(async (prisma) => {
  const from = await getSession(prisma, fromWeek);
  const to = await getSession(prisma, toWeek);
  const already = await prisma.gift.count({ where: { sessionId: to.id } });
  if (already) {
    console.error(`${toWeek} already has ${already} gifts; nothing copied.`);
    process.exit(1);
  }

  const gifts = await prisma.gift.findMany({ where: { sessionId: from.id }, include: { awards: true }, orderBy: { position: 'asc' } });
  const plan = [];
  const skipped = [];
  for (const gift of gifts) {
    const awarded = gift.awards.filter((a) => a.status === 'awarded').length;
    const remaining = gift.quantity - awarded;
    if (remaining <= 0) skipped.push(`${gift.name} → ${gift.awards.map((a) => a.winnerName).join('、')}`);
    else plan.push({ gift, remaining });
  }
  // Notes like "9/3抽" mean it may have been drawn on paper before: tell the user, do not drop it.
  const flagged = plan.filter(({ gift }) => /抽/.test(gift.note ?? '')).map(({ gift }) => `${gift.name}（${gift.note}）`);

  if (args.write) {
    let position = 0;
    for (const { gift, remaining } of plan) {
      const created = await prisma.gift.create({
        data: { sessionId: to.id, name: gift.name, quantity: remaining, donorMemberId: gift.donorMemberId, donorName: gift.donorName, note: gift.note, position: position++ },
      });
      await prisma.operationLog.create({
        data: {
          sessionId: to.id, actorRole: 'admin', actorName: ACTOR, action: 'gift_created', targetType: 'Gift', targetId: created.id,
          reason: `沿用 ${fromWeek} 未抽出的禮物`,
          metadata: { name: created.name, quantity: created.quantity, donor: gift.donorName, note: created.note, copiedFromGiftId: gift.id },
        },
      });
    }
  }

  console.log(JSON.stringify({
    mode: args.write ? 'write' : 'dry-run',
    source: gifts.length,
    copy: plan.map(({ gift, remaining }) => `${gift.name} x${remaining}`),
    skippedDrawn: skipped,
    flaggedNotes: flagged,
  }, null, 2));
});
