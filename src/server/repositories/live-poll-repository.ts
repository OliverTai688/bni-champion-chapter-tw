import 'server-only';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { prisma } from '@/server/db/prisma';

const STAR_POLL_TITLE = '長冠軍之星';
const TOKEN_TTL_MS = 1000 * 60 * 20;

function secret() {
  return process.env.AUTH_SECRET ?? 'local-live-poll-secret';
}

function hashValue(value: string) {
  return createHash('sha256').update(`${value}:${secret()}`).digest('hex');
}

function voteCodeHash(code: string) {
  return hashValue(`vote-code:${code.trim().toUpperCase()}`);
}

function tokenHash(token: string) {
  return hashValue(`vote-token:${token}`);
}

function generateVoteCode() {
  return randomBytes(3).toString('hex').toUpperCase();
}

function encodeVoteToken(payload: { pollId: string; nonce: string; exp: number }) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = hashValue(`signed-vote-token:${body}`);
  return `${body}.${signature}`;
}

function decodeVoteToken(token: string) {
  const [body, signature] = token.split('.');
  if (!body || !signature || hashValue(`signed-vote-token:${body}`) !== signature) {
    throw new Error('Invalid vote token.');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
    pollId?: unknown;
    nonce?: unknown;
    exp?: unknown;
  };

  if (typeof payload.pollId !== 'string' || typeof payload.nonce !== 'string' || typeof payload.exp !== 'number') {
    throw new Error('Invalid vote token payload.');
  }

  if (payload.exp < Date.now()) {
    throw new Error('Vote token expired.');
  }

  return {
    pollId: payload.pollId,
    nonce: payload.nonce,
    exp: payload.exp,
  };
}

function readSeatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return {};
  const data = metadata as Record<string, unknown>;
  return {
    guestNumber: typeof data.guestNumber === 'string' ? data.guestNumber : null,
    hostFor: typeof data.hostFor === 'string' ? data.hostFor : null,
  };
}

function readOptionMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return {};
  const data = metadata as Record<string, unknown>;
  return {
    seatKey: typeof data.seatKey === 'string' ? data.seatKey : null,
    zone: typeof data.zone === 'string' ? data.zone : null,
    row: typeof data.row === 'number' ? data.row : null,
    col: typeof data.col === 'number' ? data.col : null,
    seatKind: typeof data.seatKind === 'string' ? data.seatKind : null,
    guestNumber: typeof data.guestNumber === 'string' ? data.guestNumber : null,
    hostFor: typeof data.hostFor === 'string' ? data.hostFor : null,
  };
}

function rankPollOptions(options: Array<{
  id: string;
  label: string;
  publicDescription: string | null;
  position: number;
  isActive: boolean;
  metadata: unknown;
  votes: Array<{ id: string }>;
}>) {
  const ranked = options
    .map((option) => ({
      id: option.id,
      label: option.label,
      publicDescription: option.publicDescription,
      position: option.position,
      isActive: option.isActive,
      voteCount: option.votes.length,
      seat: readOptionMetadata(option.metadata),
    }))
    .sort((a, b) => b.voteCount - a.voteCount || a.position - b.position);

  const highestVoteCount = ranked[0]?.voteCount ?? 0;
  const winners = highestVoteCount > 0 ? ranked.filter((option) => option.voteCount === highestVoteCount) : [];

  return {
    ranked,
    highestVoteCount,
    winners,
    isTie: winners.length > 1,
  };
}

export async function createStarPollForWeek(weekId: string, eligibility: 'code_required' | 'public') {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId },
    include: {
      seatMaps: {
        orderBy: [{ version: 'desc' }, { updatedAt: 'desc' }],
        take: 1,
        include: {
          seats: {
            orderBy: [{ zone: 'asc' }, { position: 'asc' }],
            include: {
              assignments: {
                where: {
                  status: {
                    not: 'released',
                  },
                },
                orderBy: { updatedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const seatMap = session?.seatMaps[0];
  if (!session || !seatMap) return null;

  await prisma.livePoll.updateMany({
    where: {
      sessionId: session.id,
      title: STAR_POLL_TITLE,
      status: {
        in: ['draft', 'open'],
      },
    },
    data: {
      status: 'archived',
    },
  });

  const voteCode = eligibility === 'code_required' ? generateVoteCode() : null;
  const poll = await prisma.livePoll.create({
    data: {
      sessionId: session.id,
      title: STAR_POLL_TITLE,
      description: '依照座位圖選出本週長冠軍之星。',
      type: 'single_choice',
      status: 'open',
      eligibility,
      resultVisibility: 'after_closed',
      voteCodeHash: voteCode ? voteCodeHash(voteCode) : null,
      opensAt: new Date(),
      metadata: {
        source: 'admin',
        seatMapId: seatMap.id,
      },
    },
    select: {
      id: true,
    },
  });

  const candidateSeats = seatMap.seats.filter((seat) => {
    const assignment = seat.assignments[0];
    return assignment && seat.kind !== 'guest' && seat.kind !== 'empty';
  });

  for (let index = 0; index < candidateSeats.length; index++) {
    const seat = candidateSeats[index];
    const assignment = seat.assignments[0];
    if (!assignment) continue;

    const metadata = readSeatMetadata(seat.metadata);
    await prisma.livePollOption.create({
      data: {
        pollId: poll.id,
        memberId: assignment.memberId,
        label: assignment.displayName,
        publicDescription: assignment.role ?? seat.label,
        position: index,
        metadata: {
          seatId: seat.id,
          seatKey: seat.seatKey,
          zone: seat.zone,
          row: seat.row,
          col: seat.col,
          seatKind: seat.kind,
          guestNumber: metadata.guestNumber,
          hostFor: metadata.hostFor,
        },
      },
    });
  }

  await prisma.operationLog.create({
    data: {
      sessionId: session.id,
      actorRole: 'admin',
      actorName: 'admin',
      action: 'live_poll_created',
      targetType: 'LivePoll',
      targetId: poll.id,
      metadata: {
        title: STAR_POLL_TITLE,
        eligibility,
        candidateCount: candidateSeats.length,
        hasVoteCode: Boolean(voteCode),
      },
    },
  });

  return {
    pollId: poll.id,
    title: STAR_POLL_TITLE,
    eligibility,
    voteCode,
    candidateCount: candidateSeats.length,
  };
}

export async function listAdminPollsForWeek(weekId: string) {
  const session = await prisma.meetingSession.findUnique({
    where: { weekId },
    include: {
      livePolls: {
        orderBy: [{ createdAt: 'desc' }],
        include: {
          options: {
            orderBy: { position: 'asc' },
            include: {
              votes: {
                select: { id: true },
              },
            },
          },
          votes: {
            select: { id: true },
          },
        },
      },
    },
  });

  return (session?.livePolls ?? []).map((poll) => {
    const ranking = rankPollOptions(poll.options);
    return {
      id: poll.id,
      title: poll.title,
      status: poll.status,
      eligibility: poll.eligibility,
      resultVisibility: poll.resultVisibility,
      optionCount: poll.options.length,
      voteCount: poll.votes.length,
      createdAt: poll.createdAt.toISOString(),
      closesAt: poll.closesAt?.toISOString() ?? null,
      results: ranking.ranked,
      winners: ranking.winners,
      highestVoteCount: ranking.highestVoteCount,
      isTie: ranking.isTie,
    };
  });
}

export async function closeAdminPoll(weekId: string, pollId: string) {
  const poll = await prisma.livePoll.findFirst({
    where: {
      id: pollId,
      session: {
        weekId,
      },
    },
    include: {
      session: {
        select: {
          id: true,
        },
      },
      options: {
        orderBy: { position: 'asc' },
        include: {
          votes: {
            select: { id: true },
          },
        },
      },
      votes: {
        select: { id: true },
      },
    },
  });

  if (!poll) return null;
  const ranking = rankPollOptions(poll.options);
  const closedAt = new Date();

  const updatedPoll = await prisma.livePoll.update({
    where: { id: poll.id },
    data: {
      status: 'closed',
      closesAt: poll.closesAt ?? closedAt,
      metadata: {
        closedSummary: {
          closedAt: closedAt.toISOString(),
          voteCount: poll.votes.length,
          highestVoteCount: ranking.highestVoteCount,
          winnerOptionIds: ranking.winners.map((winner) => winner.id),
          winnerLabels: ranking.winners.map((winner) => winner.label),
          isTie: ranking.isTie,
        },
      },
    },
    include: {
      options: {
        orderBy: { position: 'asc' },
        include: {
          votes: {
            select: { id: true },
          },
        },
      },
      votes: {
        select: { id: true },
      },
    },
  });

  await prisma.operationLog.create({
    data: {
      sessionId: poll.session.id,
      actorRole: 'admin',
      actorName: 'admin',
      action: 'live_poll_closed',
      targetType: 'LivePoll',
      targetId: poll.id,
      metadata: {
        voteCount: poll.votes.length,
        highestVoteCount: ranking.highestVoteCount,
        winnerOptionIds: ranking.winners.map((winner) => winner.id),
        winnerLabels: ranking.winners.map((winner) => winner.label),
        isTie: ranking.isTie,
      },
    },
  });

  const updatedRanking = rankPollOptions(updatedPoll.options);
  return {
    id: updatedPoll.id,
    title: updatedPoll.title,
    status: updatedPoll.status,
    eligibility: updatedPoll.eligibility,
    resultVisibility: updatedPoll.resultVisibility,
    optionCount: updatedPoll.options.length,
    voteCount: updatedPoll.votes.length,
    createdAt: updatedPoll.createdAt.toISOString(),
    closesAt: updatedPoll.closesAt?.toISOString() ?? null,
    results: updatedRanking.ranked,
    winners: updatedRanking.winners,
    highestVoteCount: updatedRanking.highestVoteCount,
    isTie: updatedRanking.isTie,
  };
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(',');
}

export async function exportAdminPollCsv(weekId: string, pollId: string) {
  const poll = await prisma.livePoll.findFirst({
    where: {
      id: pollId,
      session: {
        weekId,
      },
    },
    include: {
      session: {
        select: {
          weekId: true,
          title: true,
          meetingLabel: true,
        },
      },
      options: {
        orderBy: { position: 'asc' },
        include: {
          votes: {
            orderBy: { submittedAt: 'asc' },
            select: {
              id: true,
              anonymousVoterHash: true,
              submittedAt: true,
            },
          },
        },
      },
    },
  });

  if (!poll) return null;

  const lines = [
    csvRow([
      'recordType',
      'weekId',
      'meetingTitle',
      'pollId',
      'pollTitle',
      'pollStatus',
      'optionId',
      'candidateName',
      'candidateDescription',
      'seatKey',
      'zone',
      'row',
      'col',
      'voteCount',
      'voteId',
      'anonymousVoterHash',
      'submittedAt',
    ]),
  ];

  for (const option of poll.options) {
    const metadata = readOptionMetadata(option.metadata);
    lines.push(csvRow([
      'summary',
      poll.session.weekId,
      poll.session.title,
      poll.id,
      poll.title,
      poll.status,
      option.id,
      option.label,
      option.publicDescription,
      metadata.seatKey,
      metadata.zone,
      metadata.row,
      metadata.col,
      option.votes.length,
      null,
      null,
      null,
    ]));

    for (const vote of option.votes) {
      lines.push(csvRow([
        'vote',
        poll.session.weekId,
        poll.session.title,
        poll.id,
        poll.title,
        poll.status,
        option.id,
        option.label,
        option.publicDescription,
        metadata.seatKey,
        metadata.zone,
        metadata.row,
        metadata.col,
        null,
        vote.id,
        vote.anonymousVoterHash,
        vote.submittedAt.toISOString(),
      ]));
    }
  }

  return {
    filename: `${weekId}-${poll.title}-poll-export.csv`,
    csv: `${lines.join('\n')}\n`,
  };
}

export async function createVoteAccessToken(slug: string, pollId: string, code: string | null) {
  const poll = await prisma.livePoll.findFirst({
    where: {
      id: pollId,
      status: 'open',
      session: {
        publicSlug: slug,
        publicStatus: {
          in: ['published', 'live', 'completed', 'archived'],
        },
      },
    },
    select: {
      id: true,
      eligibility: true,
      voteCodeHash: true,
    },
  });

  if (!poll) throw new Error('Poll is not open.');
  if (poll.eligibility === 'code_required' && (!code || voteCodeHash(code) !== poll.voteCodeHash)) {
    throw new Error('Vote code is incorrect.');
  }

  const token = encodeVoteToken({
    pollId: poll.id,
    nonce: randomUUID(),
    exp: Date.now() + TOKEN_TTL_MS,
  });

  return {
    token,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  };
}

export async function submitPublicVote(slug: string, pollId: string, optionId: string, token: string) {
  let activeToken = token;
  if (token === 'public-pending') {
    const access = await createVoteAccessToken(slug, pollId, null);
    activeToken = access.token;
  }

  const payload = decodeVoteToken(activeToken);
  if (payload.pollId !== pollId) throw new Error('Vote token does not match poll.');

  const option = await prisma.livePollOption.findFirst({
    where: {
      id: optionId,
      pollId,
      isActive: true,
      poll: {
        status: 'open',
        session: {
          publicSlug: slug,
          publicStatus: {
            in: ['published', 'live', 'completed', 'archived'],
          },
        },
      },
    },
    select: {
      id: true,
      pollId: true,
    },
  });

  if (!option) throw new Error('Vote option is not available.');

  await prisma.livePollVote.create({
    data: {
      pollId,
      optionId,
      tokenHash: tokenHash(activeToken),
      anonymousVoterHash: hashValue(payload.nonce),
      metadata: {
        source: 'public-weekly-page',
      },
    },
  });

  return {
    ok: true,
    submittedAt: new Date().toISOString(),
  };
}
