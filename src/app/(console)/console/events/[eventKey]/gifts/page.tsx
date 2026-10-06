import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDown, ArrowUp, ExternalLink, Plus } from 'lucide-react';
import { ConfirmSubmit } from '@/components/tbx/client';
import { AssignAwardDialog, EditAwardDialog } from '@/components/tbx/gifts/award-dialogs';
import { AddGiftDialog, EditGiftDialog } from '@/components/tbx/gifts/gift-form';
import {
  AWARD_METHOD_LABEL,
  winnerKindChip,
  winnerKindLabel,
  type MemberOption,
  type PersonOption,
} from '@/components/tbx/gifts/labels';
import { PoolSettingsForm } from '@/components/tbx/gifts/pool-settings-form';
import { ConfirmButton, QuietForm, RowSubmit } from '@/components/tbx/gifts/row-actions';
import { Card, Empty, Stat } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import { getEventByKey, isEventPublic } from '@/server/tbx/events';
import { getLotteryPool, listGifts, type GiftAwardView, type GiftView } from '@/server/tbx/gifts';
import { listChapterMembers } from '@/server/tbx/members';
import { getViewer } from '@/server/tbx/viewer';
import {
  deleteAwardAction,
  deleteGiftAction,
  drawGiftAction,
  moveGiftAction,
  redrawAwardAction,
} from './actions';

function GiftStatus({ gift }: { gift: GiftView }) {
  const drawn = gift.awards.length;
  if (drawn === 0) return <span className="tb-chip tb-chip-gold">待抽</span>;
  if (drawn < gift.quantity) {
    return (
      <span className="tb-chip tb-chip-gold">
        已抽 {drawn}/{gift.quantity}
      </span>
    );
  }
  return (
    <span className="tb-chip tb-chip-present">
      已抽 {drawn}/{gift.quantity}
    </span>
  );
}

function awardMeta(award: GiftAwardView) {
  const parts = [AWARD_METHOD_LABEL[award.method] ?? award.method, formatDateTime(award.drawnAt)];
  if (award.method === 'random' && award.poolSize) parts.push(`抽獎池 ${award.poolSize} 人`);
  if (award.method === 'manual' && award.editedBy) parts.push(`${award.editedBy} 指定`);
  if (award.method === 'random' && award.editedBy) parts.push(`${award.editedBy} 改過`);
  return parts.join('・');
}

export default async function EventGiftsPage({ params }: { params: Promise<{ eventKey: string }> }) {
  const { eventKey } = await params;
  const viewer = await getViewer();
  if (!viewer.leader) return null;

  const event = await getEventByKey(eventKey);
  if (!event) notFound();

  // The pool sync creates attendance rows (and seeds the roster on first use), so it runs before the other reads.
  const pool = await getLotteryPool(event.id);
  const [gifts, roster] = await Promise.all([listGifts(event.id), listChapterMembers()]);

  const members: MemberOption[] = roster.map((member) => ({ id: member.id, name: member.displayName }));
  const people: PersonOption[] = pool.present.map((person) => ({
    participationId: person.participationId,
    name: person.name,
    kind: person.kind,
    represents: person.represents,
  }));

  const key = encodeURIComponent(event.weekId);
  const published = isEventPublic(event.publicStatus);
  const totalUnits = gifts.reduce((sum, gift) => sum + gift.quantity, 0);
  const drawnUnits = gifts.reduce((sum, gift) => sum + gift.awards.length, 0);
  const waitingUnits = gifts.reduce((sum, gift) => sum + gift.remaining, 0);
  const missingDonor = gifts.filter((gift) => !gift.donorLabel).length;

  return (
    <div className="flex flex-col gap-5">
      <section className="tb-card" aria-label="禮物摘要">
        <div className="tb-card-body flex flex-wrap gap-y-4">
          <Stat value={totalUnits} label="禮物總份數" hint={`${gifts.length} 筆禮物`} />
          <Stat value={drawnUnits} total={totalUnits} label="已有得主" tone="ok" />
          <Stat value={waitingUnits} label="待抽" tone={waitingUnits > 0 ? 'gold' : undefined} />
          <Stat value={pool.size} label="抽獎池人數" hint={`在場 ${pool.present.length} 人`} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card
          title={`禮物（${gifts.length}）`}
          aside={
            <AddGiftDialog
              eventKey={event.weekId}
              members={members}
              className="tb-btn-gold tb-btn-sm"
              label={
                <>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  新增禮物
                </>
              }
            />
          }
          bodyClassName="flex flex-col"
        >
          {gifts.length === 0 ? (
            <div className="p-4">
              <Empty
                title="這場活動還沒有禮物"
                hint="先新增禮物並記下是誰提供的。提供者還不確定可以先留空，之後隨時能補。新增後就能在這裡或抽獎前台抽出得主。"
                action={<AddGiftDialog eventKey={event.weekId} members={members} label="新增第一份禮物" />}
              />
            </div>
          ) : (
            <>
              {missingDonor > 0 ? (
                <p className="border-b border-tb-line px-4 py-2 text-xs text-tb-muted">
                  有 {missingDonor} 筆禮物還沒登記提供者，按「編輯」可以補上。
                </p>
              ) : null}
              <ul className="m-0 flex list-none flex-col p-0">
                {gifts.map((gift, index) => (
                  <li key={gift.id} className="flex flex-col gap-3 border-b border-tb-line px-4 py-4 last:border-b-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="break-words text-base font-bold">{gift.name}</span>
                          <span className="tb-mono text-tb-faint">×{gift.quantity}</span>
                          <GiftStatus gift={gift} />
                        </div>
                        <p className="text-sm text-tb-muted">
                          提供者：{gift.donorLabel ?? <span className="text-tb-faint">未登記</span>}
                          {gift.donorMemberId ? <span className="ml-2 text-xs text-tb-faint">會員</span> : null}
                        </p>
                        {gift.note ? <p className="break-words text-sm text-tb-faint">備註：{gift.note}</p> : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <QuietForm action={moveGiftAction}>
                          <input type="hidden" name="eventKey" value={event.weekId} />
                          <input type="hidden" name="giftId" value={gift.id} />
                          <input type="hidden" name="direction" value="up" />
                          <RowSubmit disabled={index === 0} label={`上移 ${gift.name}`}>
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            上移
                          </RowSubmit>
                        </QuietForm>
                        <QuietForm action={moveGiftAction}>
                          <input type="hidden" name="eventKey" value={event.weekId} />
                          <input type="hidden" name="giftId" value={gift.id} />
                          <input type="hidden" name="direction" value="down" />
                          <RowSubmit disabled={index === gifts.length - 1} label={`下移 ${gift.name}`}>
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            下移
                          </RowSubmit>
                        </QuietForm>
                        <EditGiftDialog
                          eventKey={event.weekId}
                          members={members}
                          gift={{
                            id: gift.id,
                            name: gift.name,
                            quantity: gift.quantity,
                            donorMemberId: gift.donorMemberId,
                            donorName: gift.donorName,
                            donorLabel: gift.donorLabel,
                            note: gift.note,
                          }}
                        />
                        <QuietForm action={deleteGiftAction}>
                          <input type="hidden" name="eventKey" value={event.weekId} />
                          <input type="hidden" name="giftId" value={gift.id} />
                          <ConfirmSubmit confirmText={gift.awards.length > 0 ? '確定刪除（含得主紀錄）' : '確定刪除'}>刪除</ConfirmSubmit>
                        </QuietForm>
                      </div>
                    </div>

                    {gift.awards.length > 0 ? (
                      <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {gift.awards.map((award) => (
                          <li
                            key={award.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-tb-line bg-tb-surf2 px-3 py-2"
                          >
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-tb-muted">得主</span>
                                <span className="break-words text-base font-bold">{award.winnerName}</span>
                                <span className={winnerKindChip(award.winnerKind)}>{winnerKindLabel(award.winnerKind)}</span>
                              </div>
                              <p className="text-xs text-tb-muted">{awardMeta(award)}</p>
                              {award.note ? <p className="break-words text-xs text-tb-faint">備註：{award.note}</p> : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                              <EditAwardDialog
                                eventKey={event.weekId}
                                giftName={gift.name}
                                people={people}
                                award={{
                                  id: award.id,
                                  winnerParticipationId: award.winnerParticipationId,
                                  winnerName: award.winnerName,
                                  winnerKind: award.winnerKind,
                                  note: award.note,
                                }}
                              />
                              <QuietForm action={redrawAwardAction}>
                                <input type="hidden" name="eventKey" value={event.weekId} />
                                <input type="hidden" name="awardId" value={award.id} />
                                <ConfirmButton confirmText="確定重抽" className="tb-btn-outline">
                                  重抽
                                </ConfirmButton>
                              </QuietForm>
                              <QuietForm action={deleteAwardAction}>
                                <input type="hidden" name="eventKey" value={event.weekId} />
                                <input type="hidden" name="awardId" value={award.id} />
                                <ConfirmSubmit confirmText="確定移除">移除</ConfirmSubmit>
                              </QuietForm>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {gift.remaining > 0 ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <QuietForm action={drawGiftAction} showSuccess>
                          <input type="hidden" name="eventKey" value={event.weekId} />
                          <input type="hidden" name="giftId" value={gift.id} />
                          <ConfirmButton confirmText="確定抽出" className="tb-btn-gold" disabled={pool.size === 0}>
                            抽出{gift.quantity > 1 ? `（剩 ${gift.remaining} 份）` : ''}
                          </ConfirmButton>
                        </QuietForm>
                        <AssignAwardDialog eventKey={event.weekId} giftId={gift.id} giftName={gift.name} people={people} />
                        {pool.size === 0 ? <span className="text-xs text-tb-faint">抽獎池沒有人，暫時只能指定得主。</span> : null}
                      </div>
                    ) : null}

                    {gift.history.length > 0 ? (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-xs text-tb-muted">重抽紀錄（{gift.history.length}）</summary>
                        <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0">
                          {gift.history.map((award) => (
                            <li key={award.id} className="flex flex-wrap items-center gap-2 text-xs text-tb-muted">
                              <span className="font-bold text-tb-text line-through">{award.winnerName}</span>
                              <span>{winnerKindLabel(award.winnerKind)}</span>
                              <span>{awardMeta(award)}</span>
                              <span className="text-tb-faint">已重抽</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card title="抽獎前台">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-tb-muted">
                把前台投到大螢幕。用已登入領導團隊的裝置開啟才會出現「開抽」，其他人打開只能觀看結果。
              </p>
              {published ? (
                <div>
                  <Link href={`/e/${key}/lottery`} target="_blank" rel="noreferrer" className="tb-btn tb-btn-outline">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    開啟抽獎前台
                  </Link>
                </div>
              ) : (
                <>
                  <div>
                    <button type="button" className="tb-btn" disabled>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      開啟抽獎前台
                    </button>
                  </div>
                  <p className="tb-banner text-sm">
                    <span>
                      這場活動還沒發布，前台頁面現在打不開。請先到
                      <Link href={`/console/events/${key}`} className="mx-1 font-bold text-tb-gold">
                        中控
                      </Link>
                      發布活動。還沒發布時，仍然可以在這一頁抽出或指定得主。
                    </span>
                  </p>
                </>
              )}
            </div>
          </Card>

          <Card title="抽獎池" aside={<span className="tb-mono">{pool.size} 人可被抽到</span>}>
            <div className="flex flex-col gap-4">
              <div className="tb-table-wrap">
                <table className="tb-table">
                  <thead>
                    <tr>
                      <th scope="col">對象</th>
                      <th scope="col" className="num">
                        在場
                      </th>
                      <th scope="col" className="num">
                        抽獎池
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>會員</td>
                      <td className="num">{pool.presentCounts.member}</td>
                      <td className="num">{pool.poolCounts.member}</td>
                    </tr>
                    <tr>
                      <td>來賓</td>
                      <td className="num">{pool.presentCounts.guest}</td>
                      <td className="num">{pool.poolCounts.guest}</td>
                    </tr>
                    <tr>
                      <td>代理人</td>
                      <td className="num">{pool.presentCounts.substitute}</td>
                      <td className="num">{pool.poolCounts.substitute}</td>
                    </tr>
                    <tr>
                      <td className="font-bold">合計</td>
                      <td className="num font-bold">{pool.present.length}</td>
                      <td className="num font-bold">{pool.size}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-tb-faint">
                只有已簽到的人會進抽獎池。
                {pool.excludedWinners > 0 ? `目前有 ${pool.excludedWinners} 位已中獎的人被排除。` : ''}
                {pool.present.length === 0 ? (
                  <>
                    還沒有人簽到，請先到
                    <Link href={`/console/events/${key}/attendance`} className="mx-1 font-bold text-tb-gold">
                      出席與代理
                    </Link>
                    完成簽到。
                  </>
                ) : null}
              </p>
              <PoolSettingsForm eventKey={event.weekId} settings={pool.settings} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
