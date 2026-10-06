import { AutoRefresh } from '@/components/tbx/client';
import { winnerKindChip, winnerKindLabel, type StageGift, type StageWinner } from '@/components/tbx/gifts/labels';

/**
 * Read-only view of the lottery for everyone who is not signed in as a leader
 * (the audience's phones). Refreshes itself; there is nothing to press.
 */
export function LotteryAudience({
  eventTitle,
  eventDate,
  gifts,
  winners,
  poolSize,
}: {
  eventTitle: string;
  eventDate: string;
  gifts: StageGift[];
  /** Newest first. */
  winners: StageWinner[];
  poolSize: number;
}) {
  const latest = winners[0] ?? null;
  const waiting = gifts.reduce((sum, gift) => sum + gift.remaining, 0);
  const total = gifts.reduce((sum, gift) => sum + gift.quantity, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col gap-5 px-4 py-6">
      <AutoRefresh seconds={5} />

      <header>
        <p className="tb-eyebrow">禮物抽獎・{eventDate}</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">{eventTitle}</h1>
      </header>

      {gifts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-tb-line px-6 py-10 text-center">
          <p className="text-base font-bold">這場活動還沒有禮物</p>
          <p className="max-w-[40ch] text-sm text-tb-muted">主持人加入禮物後，這一頁會自動更新，不用重新整理。</p>
        </div>
      ) : (
        <>
          <section className="tb-card" aria-label="最新結果">
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center" aria-live="polite">
              {latest ? (
                <>
                  <p className="tb-eyebrow">最新結果</p>
                  <p className="text-base text-tb-muted">
                    {latest.giftName}
                    {latest.donor ? `・${latest.donor} 提供` : ''}
                  </p>
                  <p className="max-w-full break-words font-black leading-none" style={{ fontSize: 'clamp(40px, 13vw, 120px)' }}>
                    {latest.winnerName}
                  </p>
                  <span className={winnerKindChip(latest.winnerKind)}>{winnerKindLabel(latest.winnerKind)}</span>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold">抽獎還沒開始</p>
                  <p className="max-w-[40ch] text-sm text-tb-muted">主持人開抽後，得主會自動出現在這裡。請看現場大螢幕。</p>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-t border-tb-line px-4 py-3 text-sm text-tb-muted">
              <span>
                抽獎池 <span className="tb-num text-lg font-semibold text-tb-text">{poolSize}</span> 人
              </span>
              <span>
                待抽 <span className="tb-num text-lg font-semibold text-tb-text">{waiting}</span> / {total} 份
              </span>
            </div>
          </section>

          <section className="tb-card" aria-label="得主名單">
            <div className="tb-card-head">
              <h2>得主名單</h2>
              <span className="tb-mono text-tb-faint">{winners.length}</span>
            </div>
            {winners.length === 0 ? (
              <p className="px-4 py-5 text-sm text-tb-faint">還沒有人中獎。</p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {winners.map((winner) => (
                  <li
                    key={winner.awardId}
                    className="flex min-h-[56px] items-center justify-between gap-3 border-b border-tb-line px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold">{winner.giftName}</p>
                      <p className="text-xs text-tb-muted">{winner.donor ? `${winner.donor} 提供` : '提供者未登記'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      <span className="text-base font-bold">{winner.winnerName}</span>
                      <span className="tb-mono text-tb-faint">{winner.time}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {waiting > 0 ? (
            <section className="tb-card" aria-label="待抽禮物">
              <div className="tb-card-head">
                <h2>待抽禮物</h2>
                <span className="tb-mono text-tb-faint">{waiting}</span>
              </div>
              <ul className="m-0 flex list-none flex-col p-0">
                {gifts
                  .filter((gift) => gift.remaining > 0)
                  .map((gift) => (
                    <li key={gift.id} className="flex items-center justify-between gap-3 border-b border-tb-line px-4 py-3 last:border-b-0">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold">{gift.name}</p>
                        <p className="text-xs text-tb-muted">{gift.donor ? `${gift.donor} 提供` : '提供者未登記'}</p>
                      </div>
                      <span className="tb-mono shrink-0 text-tb-faint">
                        {gift.quantity > 1 ? `剩 ${gift.remaining} / ${gift.quantity} 份` : '1 份'}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
