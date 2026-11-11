// Publishes the week's public event page (same writes as updateEventPublication
// 'publish' in src/server/repositories/event-publication-repository.ts).
//
//   node .claude/skills/weekly-seating/scripts/publish-event.mjs --week=2026-11-12          # dry run
//   node .claude/skills/weekly-seating/scripts/publish-event.mjs --week=2026-11-12 --write

import { randomBytes } from 'node:crypto';
import { ACTOR, getSession, parseArgs, requireWeek, withPrisma } from './lib.mjs';

const args = parseArgs();
const weekId = requireWeek(args.week);

await withPrisma(async (prisma) => {
  const session = await getSession(prisma, weekId);
  const current = session.publicSlug && !session.publicSlug.startsWith('__draft__') ? session.publicSlug : null;
  if (!args.write) {
    console.log(JSON.stringify({ mode: 'dry-run', weekId, title: session.title, publicSlug: current, publicStatus: session.publicStatus }, null, 2));
    return;
  }

  let slug = current;
  for (let i = 0; !slug && i < 5; i++) {
    const candidate = `${weekId}-${randomBytes(3).toString('hex')}`;
    if (!(await prisma.meetingSession.findUnique({ where: { publicSlug: candidate } }))) slug = candidate;
  }
  if (!slug) throw new Error('Could not generate a unique slug');

  const updated = await prisma.meetingSession.update({
    where: { id: session.id },
    data: { publicSlug: slug, publicStatus: 'published', publicConfig: { route: `/e/${slug}`, lastAction: 'publish' } },
  });
  await prisma.operationLog.create({
    data: {
      sessionId: session.id, actorRole: 'admin', actorName: ACTOR, action: 'public_event_publish',
      targetType: 'MeetingSession', targetId: session.id, metadata: { publicStatus: 'published', hasPublicSlug: true },
    },
  });
  console.log(JSON.stringify({ mode: 'write', weekId, title: updated.title, publicSlug: updated.publicSlug, publicStatus: updated.publicStatus }, null, 2));
});
