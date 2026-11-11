// Opens the week's public 長冠軍之星 poll: every active member is a candidate, no
// vote code, open now, results after closed. Same writes as createStarPoll()
// in src/server/tbx/polls.ts plus the console's live_poll_created log.
// Refuses when the week already has a star poll or another open poll.
//
//   node .claude/skills/weekly-seating/scripts/open-star-poll.mjs --week=2026-11-12          # dry run
//   node .claude/skills/weekly-seating/scripts/open-star-poll.mjs --week=2026-11-12 --write

import { ACTOR, getSession, listChapterMembers, parseArgs, requireWeek, withPrisma } from './lib.mjs';

const STAR_POLL_TITLE = '長冠軍之星';
const args = parseArgs();
const weekId = requireWeek(args.week);

await withPrisma(async (prisma) => {
  const session = await getSession(prisma, weekId);
  const polls = await prisma.livePoll.findMany({ where: { sessionId: session.id }, select: { id: true, title: true, status: true, metadata: true } });
  const star = polls.find((p) => p.title === STAR_POLL_TITLE || p.metadata?.kind === 'star');
  if (star) {
    console.log(JSON.stringify({ weekId, exists: true, status: star.status, pollId: star.id }, null, 2));
    return;
  }
  const open = polls.find((p) => p.status === 'open');
  if (open) {
    console.error(`「${open.title}」is still open for ${weekId}; close it first.`);
    process.exit(1);
  }
  const members = await listChapterMembers(prisma);
  if (!members.length) throw new Error('No active members');

  if (!args.write) {
    console.log(JSON.stringify({ mode: 'dry-run', weekId, candidates: members.length }, null, 2));
    return;
  }

  const now = new Date();
  const poll = await prisma.livePoll.create({
    data: {
      sessionId: session.id,
      title: STAR_POLL_TITLE,
      description: '選出這次表現最亮眼的會員。',
      type: 'single_choice',
      status: 'open',
      eligibility: 'public',
      resultVisibility: 'after_closed',
      voteCodeHash: null,
      opensAt: now,
      metadata: { source: 'console', kind: 'star' },
    },
  });
  await prisma.livePollOption.createMany({
    data: members.map((m, i) => ({ pollId: poll.id, memberId: m.id, label: m.displayName, position: i })),
  });
  await prisma.operationLog.create({
    data: {
      sessionId: session.id, actorRole: 'admin', actorName: ACTOR, action: 'live_poll_created', targetType: 'LivePoll', targetId: poll.id,
      metadata: { title: STAR_POLL_TITLE, eligibility: 'public', candidateCount: members.length, hasVoteCode: false, status: 'open' },
    },
  });
  console.log(JSON.stringify({ mode: 'write', weekId, pollId: poll.id, candidates: members.length, vote: `/e/${weekId}/vote` }, null, 2));
});
