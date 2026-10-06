import Link from 'next/link';
import { Search } from 'lucide-react';
import { winnerKindLabel } from '@/components/tbx/gifts/labels';
import { Card, Empty, PageHeader, Stat } from '@/components/tbx/ui';
import { formatEventDate } from '@/lib/tbx/labels';
import { listGiftLedger, type GiftLedgerRow } from '@/server/tbx/gifts';
import { getViewer } from '@/server/tbx/viewer';

function LedgerStatus({ row }: { row: GiftLedgerRow }) {
  const drawn = row.awards.length;
  if (drawn === 0) return <span className="tb-chip tb-chip-gold">待抽</span>;
  return (
    <span className={drawn < row.quantity ? 'tb-chip tb-chip-gold' : 'tb-chip tb-chip-present'}>
      已抽 {drawn}/{row.quantity}
    </span>
  );
}

export default async function GiftLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; event?: string | string[] }>;
}) {
  const viewer = await getViewer();
  if (!viewer.leader) return null;

  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const eventKey = typeof params.event === 'string' ? params.event.trim() : '';
  const rows = await listGiftLedger({ q, eventKey });

  const filtered = Boolean(q || eventKey);
  const totalUnits = rows.reduce((sum, row) => sum + row.quantity, 0);
  const drawnUnits = rows.reduce((sum, row) => sum + row.awards.length, 0);
  const events = new Set(rows.map((row) => row.sessionId)).size;
  const missingDonor = rows.filter((row) => !row.donorLabel).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="禮物"
        title="禮物總帳"
        description="所有活動的禮物：誰提供、誰拿走。要修改提供者或得主，請點活動名稱到該場活動的禮物頁。"
      />

      <Card>
        <form method="get" action="/console/gifts" role="search" className="flex flex-wrap items-end gap-2">
          <label className="tb-label min-w-[200px] flex-1" htmlFor="ledger-q">
            搜尋
            <input
              id="ledger-q"
              name="q"
              type="search"
              className="tb-input"
              defaultValue={q}
              placeholder="禮物、提供者、得主或活動名稱"
              autoComplete="off"
            />
          </label>
          {eventKey ? <input type="hidden" name="event" value={eventKey} /> : null}
          <button type="submit" className="tb-btn">
            <Search className="h-4 w-4" aria-hidden="true" />
            搜尋
          </button>
          {filtered ? (
            <Link href="/console/gifts" className="tb-btn tb-btn-quiet">
              清除條件
            </Link>
          ) : null}
        </form>
      </Card>

      {rows.length === 0 ? (
        filtered ? (
          <Empty
            title="找不到符合的禮物"
            hint={q ? `沒有禮物、提供者、得主或活動名稱包含「${q}」。換個關鍵字，或清除條件看全部。` : '這場活動還沒有禮物。'}
            action={
              <Link href="/console/gifts" className="tb-btn">
                看全部禮物
              </Link>
            }
          />
        ) : (
          <Empty
            title="還沒有任何禮物紀錄"
            hint="到某一場活動的「禮物」分頁新增禮物並記下提供者，抽出得主後就會出現在這裡。"
            action={
              <Link href="/console/events" className="tb-btn tb-btn-gold">
                前往活動列表
              </Link>
            }
          />
        )
      ) : (
        <>
          <section className="tb-card" aria-label="總帳摘要">
            <div className="tb-card-body flex flex-wrap gap-y-4">
              <Stat value={totalUnits} label="禮物總份數" hint={`${rows.length} 筆・${events} 場活動`} />
              <Stat value={drawnUnits} total={totalUnits} label="已有得主" tone="ok" />
              <Stat value={totalUnits - drawnUnits} label="待抽" tone={totalUnits - drawnUnits > 0 ? 'gold' : undefined} />
              <Stat value={missingDonor} label="未登記提供者" tone={missingDonor > 0 ? 'gold' : undefined} />
            </div>
          </section>

          <Card title={filtered ? `符合的禮物（${rows.length}）` : `全部禮物（${rows.length}）`} bodyClassName="tb-table-wrap">
            <table className="tb-table">
              <thead>
                <tr>
                  <th scope="col">活動日期</th>
                  <th scope="col">活動</th>
                  <th scope="col">禮物</th>
                  <th scope="col">提供者</th>
                  <th scope="col">得主</th>
                  <th scope="col">狀態</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap">
                      {row.event ? <span className="tb-mono">{formatEventDate(row.event.date)}</span> : <span className="text-tb-faint">—</span>}
                    </td>
                    <td>
                      {row.event ? (
                        <Link
                          href={`/console/events/${encodeURIComponent(row.event.weekId)}/gifts`}
                          className="font-bold text-tb-text underline decoration-tb-wall underline-offset-4 hover:decoration-tb-gold"
                        >
                          {row.event.title}
                        </Link>
                      ) : (
                        <span className="text-tb-faint">活動已刪除</span>
                      )}
                    </td>
                    <td>
                      <span className="font-bold">{row.name}</span>
                      <span className="tb-mono ml-2 text-tb-faint">×{row.quantity}</span>
                      {row.note ? <p className="text-xs text-tb-faint">{row.note}</p> : null}
                    </td>
                    <td>{row.donorLabel ?? <span className="text-tb-faint">未登記</span>}</td>
                    <td>
                      {row.awards.length === 0 ? (
                        <span className="text-tb-faint">—</span>
                      ) : (
                        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                          {row.awards.map((award) => (
                            <li key={award.id}>
                              {award.winnerName}
                              <span className="ml-2 text-xs text-tb-faint">{winnerKindLabel(award.winnerKind)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      <LedgerStatus row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
