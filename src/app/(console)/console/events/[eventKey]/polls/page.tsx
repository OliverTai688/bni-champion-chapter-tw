import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, ExternalLink, MessageSquareQuote, Trophy } from 'lucide-react';
import { ActionForm, AutoRefresh, ConfirmSubmit, SubmitButton } from '@/components/tbx/client';
import {
  POLL_ELIGIBILITY_LABEL,
  POLL_RESULT_VISIBILITY_LABEL,
  POLL_STATUS_LABEL,
  type PollStatusKey,
} from '@/components/tbx/polls/shared';
import { Card, Empty, Stat } from '@/components/tbx/ui';
import { formatDateTime, formatEventDate, formatTime } from '@/lib/tbx/labels';
import { cn } from '@/lib/utils';
import { getEventByKey, isEventPublic } from '@/server/tbx/events';
import { getAttendance } from '@/server/tbx/participation';
import { listPastStarWinners, listPollsForEvent, type PollSummary } from '@/server/tbx/polls';
import { closePollAction, deletePollAction, openPollAction, reopenPollAction } from './actions';
import { CreateStarPollPanel, EditPollButton, PlainSubmit } from './poll-forms';

export const metadata = { title: '長冠軍之星 | 長冠軍工具箱' };

const STATUS_CHIP: Record<PollStatusKey, string> = {
  draft: 'tb-chip tb-chip-gold',
  open: 'tb-chip tb-chip-present',
  closed: 'tb-chip tb-chip-plain',
  archived: 'tb-chip tb-chip-plain',
};

function ResultBars({ poll }: { poll: PollSummary }) {
  const voted = poll.results.filter((row) => row.voteCount > 0);
  if (voted.length === 0) {
    return (
      <p className="text-sm text-tb-muted">
        {poll.status === 'draft' ? '開放投票後，票數會即時顯示在這裡。' : '還沒有人投票。'}
      </p>
    );
  }

  const rest = poll.results.length - voted.length;
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        {voted.map((row, index) => {
          const leading = row.voteCount === poll.highestVoteCount;
          return (
            <li key={row.optionId} className="grid grid-cols-[1.5rem_minmax(0,7rem)_minmax(0,1fr)_2.5rem] items-center gap-2 sm:gap-3">
              <span className="tb-mono text-tb-faint">{index + 1}</span>
              <span className={cn('truncate font-semibold', leading && 'text-tb-ok')}>{row.label}</span>
              <span className="h-3 overflow-hidden rounded-full bg-tb-surf2" aria-hidden="true">
                <span
                  className={cn('block h-full rounded-full', leading ? 'bg-tb-ok' : 'bg-tb-wall')}
                  style={{ width: `${Math.max(4, Math.round((row.voteCount / poll.highestVoteCount) * 100))}%` }}
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
      {rest > 0 ? <p className="text-xs text-tb-faint">其餘 {rest} 位候選人目前 0 票。</p> : null}
    </div>
  );
}

function PraiseList({ poll }: { poll: PollSummary }) {
  if (poll.praises.length === 0) {
    return <p className="text-sm text-tb-muted">還沒有人留下好話。會員投票時可以選填一句。</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {poll.praises.map((praise) => (
        <li key={praise.id} className="rounded-lg border border-tb-line bg-tb-bg px-3 py-2">
          <p className="text-[15px] leading-snug">{praise.comment}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-tb-muted">
            <span>
              給 <strong className="text-tb-text">{praise.label}</strong>
            </span>
            <span className="tb-mono text-tb-faint">{formatTime(praise.submittedAt)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function PollCard({
  poll,
  eventKey,
  inRoom,
}: {
  poll: PollSummary;
  eventKey: string;
  inRoom: number;
}) {
  const exportHref = `/api/admin/events/${encodeURIComponent(eventKey)}/polls/${poll.id}/export`;
  const hidden = (
    <>
      <input type="hidden" name="eventKey" value={eventKey} />
      <input type="hidden" name="pollId" value={poll.id} />
    </>
  );

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {poll.title}
          <span className={STATUS_CHIP[poll.status]}>{POLL_STATUS_LABEL[poll.status]}</span>
        </span>
      }
      aside={
        <>
          <span className="tb-chip tb-chip-plain">{POLL_ELIGIBILITY_LABEL[poll.eligibility]}</span>
          <span>{POLL_RESULT_VISIBILITY_LABEL[poll.resultVisibility]}</span>
        </>
      }
      bodyClassName="tb-card-body flex flex-col gap-5"
    >
      {poll.description ? <p className="text-sm text-tb-muted">{poll.description}</p> : null}

      <div className="flex flex-wrap items-start gap-2">
        {poll.status === 'draft' ? (
          <ActionForm action={openPollAction} className="flex flex-col gap-1">
            {hidden}
            <SubmitButton pendingText="開放中…">開放投票</SubmitButton>
          </ActionForm>
        ) : null}
        {poll.status === 'open' ? (
          <ActionForm action={closePollAction} className="flex flex-col gap-1">
            {hidden}
            <SubmitButton pendingText="結束中…">結束投票</SubmitButton>
          </ActionForm>
        ) : null}
        {poll.status === 'closed' ? (
          <ActionForm action={reopenPollAction} className="flex flex-col gap-1">
            {hidden}
            <PlainSubmit>重新開放</PlainSubmit>
          </ActionForm>
        ) : null}
        <EditPollButton
          eventKey={eventKey}
          poll={{
            id: poll.id,
            title: poll.title,
            description: poll.description,
            resultVisibility: poll.resultVisibility,
          }}
        />
        <a href={exportHref} className="tb-btn tb-btn-sm" download>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          匯出 CSV
        </a>
        <ActionForm action={deletePollAction} className="flex flex-col gap-1">
          {hidden}
          <ConfirmSubmit confirmText="確定刪除，票數一併清除">刪除投票</ConfirmSubmit>
        </ActionForm>
      </div>

      <div className="flex flex-wrap gap-y-4">
        <Stat
          value={poll.voteCount}
          total={inRoom}
          label={`已投 ${poll.voteCount} 票 / 在場 ${inRoom} 人`}
          tone={poll.status === 'open' ? 'ok' : undefined}
        />
        <Stat value={poll.optionCount} label="候選人" />
        <Stat value={poll.praises.length} label="好話" />
      </div>
      {poll.opensAt ? (
        <p className="-mt-3 text-xs text-tb-faint">
          {formatDateTime(poll.opensAt)} 開放
          {poll.status === 'closed' && poll.closesAt ? `・${formatDateTime(poll.closesAt)} 結束` : ''}
        </p>
      ) : null}

      {poll.status === 'closed' && poll.winners.length > 0 ? (
        <div className="tb-banner tb-banner-ok">
          <Trophy className="h-5 w-5 text-tb-ok" aria-hidden="true" />
          <p className="font-semibold">
            {poll.isTie ? '同票最高：' : '得主：'}
            {poll.winners.map((winner) => winner.label).join('、')}（{poll.highestVoteCount} 票）
          </p>
        </div>
      ) : null}

      <section className="flex flex-col gap-3" aria-label="票數">
        <h3 className="text-sm font-bold">{poll.status === 'open' ? '即時票數' : '票數'}</h3>
        <ResultBars poll={poll} />
      </section>

      <section className="flex flex-col gap-3" aria-label="好話">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <MessageSquareQuote className="h-4 w-4 text-tb-muted" aria-hidden="true" />
          好話
          <span className="text-xs font-normal text-tb-faint">匿名，最新的在最上面</span>
        </h3>
        <PraiseList poll={poll} />
      </section>
    </Card>
  );
}

export default async function EventPollsPage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  const event = await getEventByKey(eventKey);
  if (!event) notFound();

  const [polls, attendance, pastWinners] = await Promise.all([
    listPollsForEvent(event.id),
    getAttendance(event.id),
    listPastStarWinners(8),
  ]);

  const published = isEventPublic(event.publicStatus);
  const votePath = `/e/${encodeURIComponent(event.weekId)}/vote`;
  const anyOpen = polls.some((poll) => poll.status === 'open');

  return (
    <div className="flex flex-col gap-5">
      <CreateStarPollPanel eventKey={event.weekId} hasPolls={polls.length > 0} />
      {anyOpen ? <AutoRefresh seconds={8} /> : null}

      <Card title="會員投票頁" aside={anyOpen ? <span className="tb-chip tb-chip-present">票數每 8 秒更新</span> : null}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <a href={votePath} target="_blank" rel="noreferrer" className="tb-btn">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              開啟投票頁
            </a>
            <span className="tb-mono break-all text-tb-muted">{votePath}</span>
          </div>
          {published ? (
            <p className="text-sm text-tb-muted">把這個連結投影或貼到群組，會員用手機打開就能投票。投票結束前可以改票。</p>
          ) : (
            <p className="tb-banner text-sm">
              這場活動還沒發布，會員現在打開投票頁會看到「找不到頁面」。請先發布活動，連結才會生效。
            </p>
          )}
        </div>
      </Card>

      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} eventKey={event.weekId} inRoom={attendance.summary.inRoom} />
      ))}

      <Card title="歷屆得主" aside="最近 8 場已結束的投票" bodyClassName={pastWinners.length > 0 ? '' : 'tb-card-body'}>
        {pastWinners.length === 0 ? (
          <Empty title="還沒有歷屆得主" hint="結束一場長冠軍之星投票後，得主會列在這裡。" />
        ) : (
          <div className="tb-table-wrap">
            <table className="tb-table">
              <thead>
                <tr>
                  <th scope="col">日期</th>
                  <th scope="col">活動</th>
                  <th scope="col">得主</th>
                  <th scope="col" className="num">
                    得票 / 總票數
                  </th>
                </tr>
              </thead>
              <tbody>
                {pastWinners.map((row) => (
                  <tr key={row.pollId}>
                    <td className="tb-mono whitespace-nowrap">{formatEventDate(row.eventDate)}</td>
                    <td>
                      <Link href={`/console/events/${encodeURIComponent(row.eventKey)}/polls`} className="hover:underline">
                        {row.eventTitle}
                      </Link>
                    </td>
                    <td className="font-semibold">
                      {row.winners.length > 0 ? row.winners.join('、') : <span className="font-normal text-tb-faint">沒有人投票</span>}
                      {row.isTie ? <span className="ml-2 tb-chip tb-chip-plain">同票</span> : null}
                    </td>
                    <td className="num">
                      {row.highestVoteCount} / {row.voteCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
