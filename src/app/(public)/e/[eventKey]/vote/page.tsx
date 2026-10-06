import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import { AutoRefresh } from '@/components/tbx/client';
import { STAR_POLL_TITLE } from '@/components/tbx/polls/shared';
import { Card, Empty } from '@/components/tbx/ui';
import { formatEventDate } from '@/lib/tbx/labels';
import { cn } from '@/lib/utils';
import { getPublicEventByKey } from '@/server/tbx/events';
import { getPublicPollState, VOTE_TOKEN_COOKIE, type PublicPollResults } from '@/server/tbx/polls';
import { getViewer } from '@/server/tbx/viewer';
import { VoteCodeForm, VoteWall } from './vote-client';

export const metadata = {
  title: '長冠軍之星投票',
  description: '點一位會員，投給這次表現最亮眼的夥伴。',
};

function PublicResults({ results, live }: { results: PublicPollResults; live?: boolean }) {
  return (
    <Card title={live ? '目前票數' : '投票結果'} aside={`共 ${results.totalVotes} 票`}>
      {results.rows.length === 0 ? (
        <p className="text-sm text-tb-muted">{live ? '還沒有人投票。' : '這場投票沒有人投票。'}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {!live && results.winners.length > 0 ? (
            <div className="tb-banner tb-banner-ok">
              <Trophy className="h-5 w-5 shrink-0 text-tb-ok" aria-hidden="true" />
              <p className="min-w-0 text-base font-bold">
                {results.isTie ? '同票最高：' : '本次長冠軍之星：'}
                {results.winners.join('、')}
              </p>
            </div>
          ) : null}
          <ol className="flex flex-col gap-2">
            {results.rows.map((row) => {
              const leading = row.voteCount === results.highestVoteCount;
              return (
                <li key={row.optionId} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_2rem] items-center gap-2">
                  <span className={cn('truncate font-semibold', leading && 'text-tb-ok')}>{row.label}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-tb-surf2" aria-hidden="true">
                    <span
                      className={cn('block h-full rounded-full', leading ? 'bg-tb-ok' : 'bg-tb-wall')}
                      style={{ width: `${Math.max(4, Math.round((row.voteCount / results.highestVoteCount) * 100))}%` }}
                    />
                  </span>
                  <span className="tb-num text-right text-xl font-semibold">
                    {row.voteCount}
                    <span className="sr-only"> 票</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Card>
  );
}

export default async function EventVotePage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  const event = await getPublicEventByKey(eventKey);
  if (!event) notFound();

  const cookieStore = await cookies();
  const viewer = await getViewer();
  const state = await getPublicPollState(event.id, cookieStore.get(VOTE_TOKEN_COOKIE)?.value, viewer.member?.id ?? null);
  const { poll } = state;
  const key = encodeURIComponent(event.weekId);

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-4 py-6">
      <header className="flex flex-col gap-1">
        <Link href={`/e/${key}`} className="tb-eyebrow inline-flex min-h-[44px] items-center gap-1 self-start no-underline hover:text-tb-text">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {event.title}・{formatEventDate(event.date)}
        </Link>
        <h1 className="text-2xl font-bold leading-tight">{poll?.title ?? STAR_POLL_TITLE}</h1>
        {poll?.description ? <p className="text-sm text-tb-muted">{poll.description}</p> : null}
      </header>

      {!poll ? (
        <>
          <AutoRefresh seconds={10} />
          <Empty title="投票還沒開始" hint="主持人開放投票後，候選人會自動出現在這一頁，不用重新整理。" />
        </>
      ) : poll.status === 'closed' ? (
        <>
          <AutoRefresh seconds={15} />
          <div className="tb-banner">
            <p className="font-semibold">
              投票已經結束，謝謝你的參與。
              {state.myVote?.label ? `你投給了 ${state.myVote.label}。` : ''}
            </p>
          </div>
          {state.results ? (
            <PublicResults results={state.results} />
          ) : (
            <p className="text-sm text-tb-muted">結果會由主持人在現場公布。</p>
          )}
        </>
      ) : state.needsCode ? (
        <Card title="輸入投票碼">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-tb-muted">請輸入主持人在現場公布的投票碼，確認後就能選一位會員投票。</p>
            <VoteCodeForm eventKey={event.weekId} pollId={poll.id} />
          </div>
        </Card>
      ) : (
        <>
          <VoteWall
            eventKey={event.weekId}
            pollId={poll.id}
            candidates={state.candidates}
            arrivedCount={state.arrivedCount}
            myVote={state.myVote}
            voterName={viewer.member?.displayName ?? null}
          />
          {state.results ? <PublicResults results={state.results} live /> : null}
        </>
      )}
    </main>
  );
}
