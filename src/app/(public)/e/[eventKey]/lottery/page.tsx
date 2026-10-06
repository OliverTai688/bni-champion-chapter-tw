import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { StageWinner } from '@/components/tbx/gifts/labels';
import { LotteryAudience } from '@/components/tbx/gifts/lottery-audience';
import { LotteryStage } from '@/components/tbx/gifts/lottery-stage';
import { formatEventDate, formatTime } from '@/lib/tbx/labels';
import { getPublicEventByKey } from '@/server/tbx/events';
import { getLotteryStage, type LotteryStageData } from '@/server/tbx/gifts';
import { getViewer } from '@/server/tbx/viewer';

export const metadata: Metadata = {
  title: '禮物抽獎',
};

/**
 * Phones poll this page. A fresh result stays hidden from them for a moment so
 * it does not appear before the big screen finishes rolling the names.
 */
const AUDIENCE_REVEAL_DELAY_MS = 4000;

function toStageWinners(winners: LotteryStageData['winners']): StageWinner[] {
  return winners.map((winner) => ({
    awardId: winner.awardId,
    giftId: winner.giftId,
    giftName: winner.giftName,
    donor: winner.donor,
    winnerName: winner.winnerName,
    winnerKind: winner.winnerKind,
    time: formatTime(winner.drawnAt),
  }));
}

export default async function LotteryPage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  const event = await getPublicEventByKey(eventKey);
  if (!event) notFound();

  const viewer = await getViewer();
  const eventDate = formatEventDate(event.date);

  if (viewer.leader) {
    // Leaders run the draw: they get the pool names for the rolling animation.
    const data = await getLotteryStage(event.id, { includePoolNames: true, sync: true });
    return (
      <LotteryStage
        eventKey={event.weekId}
        eventTitle={event.title}
        eventDate={eventDate}
        gifts={data.gifts}
        winners={toStageWinners(data.winners)}
        poolSize={data.poolSize}
        poolNames={data.poolNames}
      />
    );
  }

  // Everyone else only watches: results and counts, no pool names.
  const data = await getLotteryStage(event.id, { hideNewerThanMs: AUDIENCE_REVEAL_DELAY_MS });
  return (
    <LotteryAudience
      eventTitle={event.title}
      eventDate={eventDate}
      gifts={data.gifts}
      winners={toStageWinners(data.winners)}
      poolSize={data.poolSize}
    />
  );
}
