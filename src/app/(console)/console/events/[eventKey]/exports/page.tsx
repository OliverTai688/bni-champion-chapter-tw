import { leaderGuard } from '@/components/tbx/leader-guard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/tbx/ui';
import { prisma } from '@/server/db/prisma';
import { getEventByKey } from '@/server/tbx/events';

export default async function ExportsPage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  const denied = await leaderGuard();
  if (denied) return denied;
  const event = await getEventByKey(eventKey);
  if (!event) notFound();

  const key = encodeURIComponent(event.weekId);
  const [polls, legacySeatMaps] = await Promise.all([
    prisma.livePoll.findMany({ where: { sessionId: event.id }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, status: true } }),
    prisma.seatMap.count({ where: { sessionId: event.id } }),
  ]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card title="出席">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-tb-muted">出席與代理名單，含 PALMS 代碼（P 出席、L 遲到、A 缺席、M 病假、S 代理），可對照 BNI Connect 登錄。</p>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/v1/events/${key}/attendance.csv`} className="tb-btn tb-btn-gold">
              下載出席 CSV
            </a>
            {legacySeatMaps > 0 ? (
              <a href={`/api/admin/events/${key}/attendance-export`} className="tb-btn">
                下載座位出席 Excel（格狀排座）
              </a>
            ) : null}
          </div>
        </div>
      </Card>

      <Card title="長冠軍之星">
        {polls.length === 0 ? (
          <p className="text-sm text-tb-muted">這場活動還沒有投票。</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {polls.map((poll) => (
              <li key={poll.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">{poll.title}</span>
                <a href={`/api/admin/events/${key}/polls/${poll.id}/export`} className="tb-btn tb-btn-sm">
                  下載結果 CSV
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="區間出席報表">
        <form action="/api/admin/attendance/range-export" method="get" className="flex flex-wrap items-end gap-3">
          <label className="tb-label" htmlFor="range-from">
            從
            <input id="range-from" name="from" type="date" className="tb-input" required />
          </label>
          <label className="tb-label" htmlFor="range-to">
            到
            <input id="range-to" name="to" type="date" className="tb-input" defaultValue={event.weekId.slice(0, 10)} required />
          </label>
          <button type="submit" className="tb-btn">
            下載 Excel
          </button>
        </form>
        <p className="mt-3 text-xs text-tb-faint">依每場例會的格狀座位表與出席紀錄計算。</p>
      </Card>

      <Card title="列印與 PDF">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-tb-muted">從資料庫讀取這場活動已儲存的版本，列印日期一定和這場活動相同。開啟後可選「另存為 PDF」。</p>
          <div className="flex flex-wrap gap-2">
            {legacySeatMaps > 0 ? (
              <>
                <a href={`/print/events/${key}`} target="_blank" rel="noreferrer" className="tb-btn">
                  列印座位表
                </a>
                <a href={`/print/events/${key}?view=attendance`} target="_blank" rel="noreferrer" className="tb-btn">
                  列印出席報表
                </a>
              </>
            ) : (
              <Link href={`/console/events/${key}/seating`} className="tb-btn">
                先建立座位表
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
