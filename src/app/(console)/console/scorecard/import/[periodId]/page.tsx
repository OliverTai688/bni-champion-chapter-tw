import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CircleAlert, CircleCheck } from 'lucide-react';
import { ActionForm, ConfirmSubmit, SubmitButton } from '@/components/tbx/client';
import { KeepForm } from '@/components/tbx/scorecard/keep-form';
import { LeaderRequired } from '@/components/tbx/scorecard/leader-required';
import { Card, Empty, PageHeader, Stat } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import { formatScoreNumber } from '@/lib/tbx/scoring';
import { isObjectId } from '@/server/tbx/action';
import { getImportReview, type ReviewRow } from '@/server/tbx/scorecard';
import { isLeader } from '@/server/tbx/viewer';
import {
  confirmImportAction,
  discardPeriodAction,
  rematchAction,
  resetRowAction,
  saveMappingAction,
} from '../../actions';

function PalmsName({ row }: { row: ReviewRow }) {
  const rest = row.rawName.slice(row.palmsName.length).trim();
  return (
    <span className="flex flex-col">
      <span className="font-bold">{row.palmsName}</span>
      {rest ? <span className="text-xs text-tb-faint">{rest}</span> : null}
    </span>
  );
}

function rowDigest(row: ReviewRow) {
  const { counts } = row;
  return [
    `出席 ${counts.present}`,
    counts.absent > 0 ? `缺席 ${counts.absent}` : '',
    counts.substitute > 0 ? `代理 ${counts.substitute}` : '',
    `引薦 ${counts.referralsGivenInside + counts.referralsGivenOutside}`,
    `一對一 ${formatScoreNumber(counts.oneToOnes)}`,
  ]
    .filter(Boolean)
    .join('・');
}

export default async function ScorecardImportReviewPage({ params }: { params: Promise<{ periodId: string }> }) {
  if (!(await isLeader())) return <LeaderRequired />;

  const { periodId } = await params;
  if (!isObjectId(periodId)) notFound();
  const review = await getImportReview(periodId);
  if (!review) notFound();

  const { period, pending, skipped, matched, candidates, checksum } = review;
  const mismatches = checksum.filter((line) => !line.ok);
  const replaced = review.versions.find((version) => version.isCurrent) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="匯入 PALMS・檢查"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {period.label}
            <span className="tb-chip tb-chip-plain">第 {period.version} 版</span>
            {period.status === 'current' ? <span className="tb-chip tb-chip-present">採用中</span> : null}
            {period.status === 'draft' ? <span className="tb-chip tb-chip-gold">草稿・待確認</span> : null}
            {period.status === 'history' ? <span className="tb-chip">歷史版本</span> : null}
            {period.isPartial ? <span className="tb-chip tb-chip-late">期中</span> : null}
          </span>
        }
        description={`期間 ${period.range}。依序檢查會員對名與總數，沒問題就按最下面的「確認匯入」。`}
        actions={
          <Link href="/console/scorecard/import" className="tb-btn tb-btn-quiet">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            回匯入列表
          </Link>
        }
      />

      {period.isPartial ? (
        <div className="tb-banner">
          <p className="text-sm">
            這份檔案在期間結束前匯出（{formatDateTime(period.exportedAt)}），是期中數字。期間結束後請再匯出一次，新檔確認後會取代這一版。
          </p>
        </div>
      ) : null}

      {review.otherChapterName ? (
        <div className="tb-banner tb-banner-bad">
          <p className="text-sm">
            這份檔案的分會是「{period.chapterName}」，先前匯入的是「{review.otherChapterName}」。請確認沒有拿到別的分會的報告。
          </p>
        </div>
      ) : null}

      {review.warnings.length > 0 ? (
        <div className="tb-banner">
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm">
            {review.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Card title="檔案內容">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
            <Stat value={review.rows.length} label="檔案裡的會員" />
            <Stat value={period.meetingCount} label="這一期的例會次數" hint="取會員出席＋缺席＋遲到＋病假＋代理的最大值" />
            <Stat value={matched.length} label="已對應到名冊" tone="ok" />
            <Stat value={pending.length} label="待對應" tone={pending.length > 0 ? 'gold' : undefined} hint={skipped.length > 0 ? `另有 ${skipped.length} 列略過` : undefined} />
          </div>
          <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ['期間（從／至）', period.range],
              ['分會', period.chapterName ?? '檔案裡沒有'],
              ['匯出時間', formatDateTime(period.exportedAt) || '檔案裡沒有'],
              ['匯出者', period.exportedBy ?? '檔案裡沒有'],
              ['檔名', period.fileName ?? ''],
              ['上傳', `${period.importedBy ?? '領導團隊'}・${formatDateTime(period.createdAt)}`],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3 border-b border-tb-line py-1.5">
                <dt className="w-28 shrink-0 text-tb-faint">{label}</dt>
                <dd className="m-0 min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <Card
        title="會員對名"
        aside={
          <ActionForm action={rematchAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="periodId" value={period.id} />
            <SubmitButton className="tb-btn-sm tb-btn-outline" pendingText="比對中…">
              重新自動比對
            </SubmitButton>
          </ActionForm>
        }
      >
        <div className="flex flex-col gap-5">
          {pending.length === 0 ? (
            <div className="tb-banner tb-banner-ok">
              <CircleCheck className="h-5 w-5 shrink-0 text-tb-ok" aria-hidden="true" />
              <p className="text-sm">
                {skipped.length > 0
                  ? `除了略過的 ${skipped.length} 列，其餘 ${matched.length} 位都已對應到名冊。`
                  : `檔案裡的 ${matched.length} 位會員都已對應到名冊。`}
              </p>
            </div>
          ) : (
            <KeepForm
              action={saveMappingAction}
              className="flex flex-col gap-3"
              submitLabel="儲存對應"
              pendingText="儲存中…"
              footer={<span className="text-xs text-tb-muted">對應結果會存成該會員的別名，下次匯入自動套用。</span>}
            >
              <input type="hidden" name="periodId" value={period.id} />
              <p className="text-sm text-tb-muted">
                下面 {pending.length} 列的姓名在名冊裡找不到。常見原因是本名與常用名不同，或名冊還沒更新。
                {candidates.length > 0 ? `名冊中還沒對應的會員：${candidates.map((member) => member.displayName).join('、')}。` : ''}
              </p>
              <div className="tb-table-wrap rounded-lg border border-tb-line">
                <table className="tb-table">
                  <thead>
                    <tr>
                      <th scope="col">PALMS 上的姓名</th>
                      <th scope="col">這一期數字</th>
                      <th scope="col">對應到哪位會員</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <PalmsName row={row} />
                        </td>
                        <td className="whitespace-nowrap text-xs text-tb-muted">{rowDigest(row)}</td>
                        <td className="min-w-[220px]">
                          <label className="sr-only" htmlFor={`row-${row.id}`}>
                            {row.palmsName} 對應到哪位會員
                          </label>
                          <select id={`row-${row.id}`} name={`row:${row.id}`} className="tb-select" defaultValue="">
                            <option value="">先不處理</option>
                            {candidates.length > 0 ? (
                              <optgroup label="名冊中還沒對應的會員">
                                {candidates.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.displayName}
                                  </option>
                                ))}
                              </optgroup>
                            ) : null}
                            <optgroup label="其他">
                              <option value="new">新增為會員「{row.palmsName}」</option>
                              <option value="skip">略過，不列入燈號</option>
                            </optgroup>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </KeepForm>
          )}

          {skipped.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold">略過的列（不列入燈號）</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {skipped.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-tb-line px-3 py-2">
                    <span className="flex flex-wrap items-center gap-3">
                      <PalmsName row={row} />
                      <span className="text-xs text-tb-muted">{rowDigest(row)}</span>
                    </span>
                    <ActionForm action={resetRowAction} className="flex flex-wrap items-center gap-2" hideMessage>
                      <input type="hidden" name="rowId" value={row.id} />
                      <SubmitButton className="tb-btn-sm tb-btn-outline">重新對應</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="rounded-lg border border-tb-line">
            <summary className="cursor-pointer px-3 py-2.5 text-sm font-bold">已對應的 {matched.length} 位（點開檢查或取消對應）</summary>
            {matched.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-tb-muted">還沒有任何一列對應到名冊。</p>
            ) : (
              <div className="tb-table-wrap border-t border-tb-line">
                <table className="tb-table">
                  <thead>
                    <tr>
                      <th scope="col">PALMS 上的姓名</th>
                      <th scope="col">名冊會員</th>
                      <th scope="col">這一期數字</th>
                      <th scope="col">
                        <span className="sr-only">操作</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matched.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <PalmsName row={row} />
                        </td>
                        <td>
                          <Link href={`/console/members/${row.memberId}`} className="text-tb-text">
                            {row.memberName}
                          </Link>
                          {row.memberName !== row.palmsName ? <span className="ml-2 tb-chip tb-chip-plain">別名對應</span> : null}
                        </td>
                        <td className="whitespace-nowrap text-xs text-tb-muted">{rowDigest(row)}</td>
                        <td>
                          <ActionForm action={resetRowAction} className="flex flex-col items-end gap-1">
                            <input type="hidden" name="rowId" value={row.id} />
                            <ConfirmSubmit confirmText="確定取消">取消對應</ConfirmSubmit>
                          </ActionForm>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        </div>
      </Card>

      <Card title="總數核對" aside={review.hasTotals ? '各列加總 對 檔案的「總數」列' : undefined}>
        {!review.hasTotals ? (
          <Empty title="這份檔案沒有「總數」列" hint="無法自動核對是否完整。請人工比對會員人數後再確認，或重新匯出一次。" />
        ) : (
          <div className="flex flex-col gap-4">
            {mismatches.length === 0 ? (
              <div className="tb-banner tb-banner-ok">
                <CircleCheck className="h-5 w-5 shrink-0 text-tb-ok" aria-hidden="true" />
                <p className="text-sm">{checksum.length} 個欄位的加總都與「總數」列一致，檔案讀取完整。</p>
              </div>
            ) : (
              <div className="tb-banner tb-banner-bad">
                <CircleAlert className="h-5 w-5 shrink-0 text-tb-bad" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-sm">
                  有 {mismatches.length} 個欄位對不上：{mismatches.map((line) => line.label).join('、')}。檔案可能不完整或被改過，建議重新匯出後再匯入。
                </p>
              </div>
            )}
            <div className="tb-table-wrap">
              <table className="tb-table">
                <thead>
                  <tr>
                    <th scope="col">欄位</th>
                    <th scope="col" className="num">
                      各列加總
                    </th>
                    <th scope="col" className="num">
                      總數列
                    </th>
                    <th scope="col">結果</th>
                  </tr>
                </thead>
                <tbody>
                  {checksum.map((line) => (
                    <tr key={line.key}>
                      <td>{line.label}</td>
                      <td className="num">{formatScoreNumber(line.sum, 2)}</td>
                      <td className="num">{formatScoreNumber(line.total, 2)}</td>
                      <td>
                        {line.ok ? (
                          <span className="tb-chip tb-chip-present">一致</span>
                        ) : (
                          <span className="tb-chip tb-chip-absent">差 {formatScoreNumber(Math.abs(line.sum - line.total), 2)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-tb-faint">
              出席類欄位的總數只算會員；引薦、來賓、一對一、交易價值、CEU 的總數含檔案結尾的「來賓」「BNI」兩列。
            </p>
          </div>
        )}
      </Card>

      <Card title={period.isCurrent ? '這一版正在採用' : period.status === 'history' ? '改用這個版本' : '確認匯入'}>
        <div className="flex flex-col gap-4">
          {period.isCurrent ? (
            <>
              <p className="text-sm text-tb-muted">
                {period.label} 的燈號目前用這一版計算。要更正數字，請重新匯出同一期間的 PALMS 再上傳，新檔確認後會取代這一版。
              </p>
              <div>
                <Link href={`/console/scorecard?period=${period.id}`} className="tb-btn tb-btn-gold">
                  看這一期的燈號
                </Link>
              </div>
            </>
          ) : (
            <>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-tb-muted">
                <li>確認後，{period.label} 的燈號改用這一版計算。</li>
                {replaced ? <li>目前採用的第 {replaced.version} 版會保留成歷史版本，之後可以換回來。</li> : null}
                {pending.length > 0 ? (
                  <li className="text-tb-gold">還有 {pending.length} 列沒有對應。確認後這幾列不會有燈號，之後可以回到這一頁補對應。</li>
                ) : null}
                {mismatches.length > 0 ? <li className="text-tb-bad">總數核對有 {mismatches.length} 個欄位對不上，請先確認檔案是否完整。</li> : null}
              </ul>
              <div className="flex flex-wrap items-start gap-3">
                <ActionForm action={confirmImportAction} className="flex flex-col gap-2">
                  <input type="hidden" name="periodId" value={period.id} />
                  <SubmitButton pendingText="計算燈號中…">{period.status === 'history' ? '改用這個版本' : '確認匯入'}</SubmitButton>
                </ActionForm>
                <ActionForm action={discardPeriodAction} className="flex flex-col gap-2">
                  <input type="hidden" name="periodId" value={period.id} />
                  <ConfirmSubmit confirmText={period.status === 'history' ? '確定刪除這個版本' : '確定捨棄'}>
                    {period.status === 'history' ? '刪除這個版本' : '捨棄草稿'}
                  </ConfirmSubmit>
                </ActionForm>
              </div>
            </>
          )}

          {review.versions.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-tb-line pt-4">
              <h3 className="text-sm font-bold">同一期間的其他版本</h3>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
                {review.versions.map((version) => (
                  <li key={version.id} className="flex flex-wrap items-center gap-2">
                    <Link href={`/console/scorecard/import/${version.id}`} className="text-tb-text">
                      第 {version.version} 版
                    </Link>
                    {version.status === 'current' ? <span className="tb-chip tb-chip-present">採用中</span> : null}
                    {version.status === 'draft' ? <span className="tb-chip tb-chip-gold">草稿</span> : null}
                    {version.status === 'history' ? <span className="tb-chip">歷史版本</span> : null}
                    <span className="text-xs text-tb-faint">匯出 {formatDateTime(version.exportedAt) || '時間不明'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
