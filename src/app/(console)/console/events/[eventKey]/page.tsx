import { leaderGuard } from '@/components/tbx/leader-guard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AutoRefresh } from '@/components/tbx/client';
import { PlanView } from '@/components/tbx/plan/plan-view';
import { Card, Empty, Stat, StatusChip } from '@/components/tbx/ui';
import { formatTime } from '@/lib/tbx/labels';
import { prisma } from '@/server/db/prisma';
import { getEventByKey, isEventPublic } from '@/server/tbx/events';
import { getAttendance } from '@/server/tbx/participation';
import { getSeatPlanView } from '@/server/tbx/seat-plan';
import { PublishControls } from './publish-controls';

export default async function EventConsolePage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  const denied = await leaderGuard();
  if (denied) return denied;
  const event = await getEventByKey(eventKey);
  if (!event) notFound();

  const key = encodeURIComponent(event.weekId);
  const base = `/console/events/${key}`;
  const [{ rows, summary }, plan, giftCount, openPoll, legacySeatMaps] = await Promise.all([
    getAttendance(event.id),
    getSeatPlanView(event.id),
    prisma.gift.count({ where: { sessionId: event.id } }),
    prisma.livePoll.findFirst({ where: { sessionId: event.id, status: 'open' }, select: { id: true, title: true } }),
    prisma.seatMap.count({ where: { sessionId: event.id } }),
  ]);

  const published = isEventPublic(event.publicStatus);
  const members = rows.filter((row) => row.kind === 'member');
  const notArrived = members.filter((row) => row.status === 'expected');
  const substitutesWaiting = members.filter((row) => row.status === 'substitute' && !row.substituteArrivedAt);
  const guestsWaiting = rows.filter((row) => row.kind === 'guest' && row.status === 'expected');
  const seatedIds = new Set((plan?.seats ?? []).map((seat) => seat.participationId).filter(Boolean));
  const seatedButAway = plan ? members.filter((row) => (row.status === 'absent' || row.status === 'medical') && seatedIds.has(row.id)) : [];

  const recent = rows
    .map((row) => ({
      id: row.id,
      at: row.status === 'substitute' ? row.substituteArrivedAt : row.checkedInAt,
      name: row.status === 'substitute' ? row.substituteName ?? row.displayName : row.displayName,
      detail: row.status === 'substitute' ? `代理 ${row.displayName}` : row.kind === 'guest' ? '來賓' : row.status === 'late' ? '遲到' : '會員',
      status: row.status,
      guest: row.kind === 'guest',
      substituteArrived: Boolean(row.substituteArrivedAt),
    }))
    .filter((item) => item.at)
    .sort((a, b) => (b.at as Date).getTime() - (a.at as Date).getTime())
    .slice(0, 8);

  const todos: Array<{ tone: string; title: string; hint: string; href: string; action: string }> = [];
  if (!published) {
    todos.push({ tone: 'gold', title: '活動還沒發布', hint: '發布後，會員才能用公開頁簽到、投票與看抽獎。', href: '#publish', action: '前往發布' });
  }
  if (seatedButAway.length > 0) {
    todos.push({
      tone: 'gold',
      title: `${seatedButAway.length} 位請假的會員還在座位表上`,
      hint: seatedButAway.map((row) => row.displayName).join('、'),
      href: `${base}/seating`,
      action: '調整座位',
    });
  }
  if (substitutesWaiting.length > 0) {
    todos.push({
      tone: 'bad',
      title: `${substitutesWaiting.length} 位代理人還沒到`,
      hint: substitutesWaiting.map((row) => `${row.substituteName}（代理 ${row.displayName}）`).join('、'),
      href: `${base}/attendance?filter=substitute`,
      action: '查看',
    });
  }
  if (notArrived.length > 0) {
    todos.push({
      tone: 'late',
      title: `${notArrived.length} 位會員還沒簽到`,
      hint: notArrived.slice(0, 8).map((row) => row.displayName).join('、') + (notArrived.length > 8 ? ' 等' : ''),
      href: `${base}/attendance?filter=expected`,
      action: '查看',
    });
  }
  if (guestsWaiting.length > 0) {
    todos.push({
      tone: 'guest',
      title: `${guestsWaiting.length} 位來賓還沒到`,
      hint: guestsWaiting.map((row) => row.displayName).join('、'),
      href: `${base}/attendance`,
      action: '查看',
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh seconds={12} />

      <div className="tb-card flex flex-wrap gap-y-4 p-4">
        <Stat value={summary.arrived} total={summary.members} label="會員已到" hint={`其中遲到 ${summary.late}`} tone="ok" />
        <Stat value={summary.substitutes} label="代理" hint={`代理人已到 ${summary.substitutesArrived}`} tone="sub" />
        <Stat value={summary.absent} label="請假" tone="bad" />
        <Stat value={summary.expected} label="未到" />
        <Stat value={summary.guestsArrived} total={summary.guests} label="來賓" tone="guest" />
        <Stat value={summary.inRoom} label="現場總人數" tone="gold" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card
          title="會場平面"
          aside={
            <Link href={`${base}/seating`} className="tb-btn tb-btn-sm">
              編輯座位
            </Link>
          }
        >
          {plan ? (
            <PlanView data={plan} showNames />
          ) : (
            <Empty
              title="這場活動還沒有平面座位表"
              hint={
                legacySeatMaps > 0
                  ? '這場活動目前用的是格狀排座。要改用可以對應場地的平面座位表，到「座位」分頁選一個場地配置。'
                  : '到「座位」分頁選一個場地配置，就能在這裡看到即時的座位與出席狀態。'
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href={`${base}/seating`} className="tb-btn tb-btn-gold">
                    建立平面座位表
                  </Link>
                  {legacySeatMaps > 0 ? (
                    <Link href={`/seats/${key}`} className="tb-btn">
                      開啟格狀排座
                    </Link>
                  ) : null}
                </div>
              }
            />
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="待處理" aside={`${todos.length} 件`} bodyClassName="p-0">
            {todos.length === 0 ? (
              <p className="p-4 text-sm text-tb-muted">目前沒有需要處理的事。</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {todos.map((todo) => (
                  <li key={todo.title} className="flex items-center gap-3 border-b border-tb-line px-4 py-3 last:border-b-0">
                    <span className="w-[3px] self-stretch rounded" style={{ background: `var(--tb-${todo.tone})` }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{todo.title}</p>
                      <p className="text-xs text-tb-muted">{todo.hint}</p>
                    </div>
                    <Link href={todo.href} className="tb-btn tb-btn-sm">
                      {todo.action}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="最近簽到" aside="即時" bodyClassName="p-0">
            {recent.length === 0 ? (
              <p className="p-4 text-sm text-tb-muted">還沒有人簽到。</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {recent.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 border-b border-tb-line px-4 py-2.5 last:border-b-0">
                    <span className="tb-mono w-11 text-tb-faint">{formatTime(item.at)}</span>
                    <span className="min-w-0 flex-1 text-sm">
                      <b>{item.name}</b> <span className="text-tb-muted">{item.detail}</span>
                    </span>
                    <StatusChip status={item.status} substituteArrived={item.substituteArrived} guest={item.guest} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="公開頁與工具">
            <div id="publish" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-tb-muted">
                  {published ? '活動已發布。會員與來賓可以使用下面的公開頁。' : '活動尚未發布，公開頁目前打不開。'}
                </p>
                <PublishControls eventKey={event.weekId} published={published} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/e/${key}/check-in`} target="_blank" className="tb-btn" aria-disabled={!published}>
                  簽到頁
                </Link>
                <Link href={`/e/${key}`} target="_blank" className="tb-btn" aria-disabled={!published}>
                  活動公開頁
                </Link>
                <Link href={`${base}/polls`} className="tb-btn">
                  長冠軍之星{openPoll ? '・投票中' : ''}
                </Link>
                <Link href={`${base}/gifts`} className="tb-btn">
                  禮物 {giftCount} 份
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
