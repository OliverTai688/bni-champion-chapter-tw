import Link from 'next/link';
import { ArrowLeft, SlidersHorizontal, Upload } from 'lucide-react';
import { ActionForm, ConfirmSubmit, SubmitButton } from '@/components/tbx/client';
import { LeaderRequired } from '@/components/tbx/scorecard/leader-required';
import { Card, Empty, PageHeader } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import { listPalmsPeriods, type PeriodListItem } from '@/server/tbx/scorecard';
import { isLeader } from '@/server/tbx/viewer';
import { deletePeriodAction, importPalmsAction } from '../actions';

function StatusChips({ period }: { period: PeriodListItem }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {period.status === 'current' ? <span className="tb-chip tb-chip-present">採用中</span> : null}
      {period.status === 'draft' ? <span className="tb-chip tb-chip-gold">草稿・待確認</span> : null}
      {period.status === 'history' ? <span className="tb-chip">歷史版本</span> : null}
      {period.isPartial ? <span className="tb-chip tb-chip-late">期中</span> : null}
      {period.overlaps ? <span className="tb-chip tb-chip-absent">期間重疊</span> : null}
    </span>
  );
}

export default async function ScorecardImportPage() {
  if (!(await isLeader())) return <LeaderRequired />;

  const periods = await listPalmsPeriods();
  const drafts = periods.filter((period) => period.status === 'draft');
  const overlapping = periods.some((period) => period.overlaps);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="綠燈會員"
        title="匯入 PALMS"
        description="每一期從 BNI Connect 匯出「分會 PALMS 摘要報告」，上傳後系統會帶出期間、比對會員姓名、核對總數，確認後才會算進燈號。"
        actions={
          <>
            <Link href="/console/scorecard" className="tb-btn tb-btn-quiet">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              回燈號總覽
            </Link>
            <Link href="/console/scorecard/rules" className="tb-btn">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              計分規則
            </Link>
          </>
        }
      />

      <Card title="上傳這一期的檔案">
        <ActionForm action={importPalmsAction} className="flex flex-col gap-4">
          <label className="tb-label" htmlFor="palms-file">
            PALMS 摘要報告（.xls）
            <input
              id="palms-file"
              name="file"
              type="file"
              accept=".xls,.xml,application/vnd.ms-excel,text/xml,application/xml"
              required
              className="tb-input h-auto cursor-pointer py-2 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-tb-surf2 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-tb-text"
            />
          </label>
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-sm text-tb-muted">
            <li>BNI Connect → 報告 → 分會 PALMS 摘要報告，選好起訖日期後匯出。</li>
            <li>直接上傳下載到的檔案，不要先用 Excel 開啟另存。</li>
            <li>同一期間可以重複匯入（月中一次、月底一次），新檔確認後取代舊檔，舊檔留作歷史版本。</li>
          </ol>
          <div>
            <SubmitButton pendingText="讀取檔案中…">
              <Upload className="h-4 w-4" aria-hidden="true" />
              上傳並檢查
            </SubmitButton>
          </div>
        </ActionForm>
      </Card>

      {drafts.length > 0 ? (
        <div className="tb-banner">
          <p className="min-w-0 flex-1 text-sm">
            有 {drafts.length} 份上傳後還沒確認的草稿。草稿不會算進燈號，請打開檢查後按「確認匯入」，不需要的就刪除。
          </p>
          <Link href={`/console/scorecard/import/${drafts[0].id}`} className="tb-btn tb-btn-gold tb-btn-sm">
            檢查 {drafts[0].label} 的草稿
          </Link>
        </div>
      ) : null}

      {overlapping ? (
        <div className="tb-banner tb-banner-bad">
          <p className="text-sm">
            有採用中的期間日期互相重疊，重疊的數字會被重複計算。請保留一份，其餘重新匯入正確的日期範圍後刪除。
          </p>
        </div>
      ) : null}

      <Card title="已匯入的期間" aside={periods.length > 0 ? `共 ${periods.length} 份` : undefined} bodyClassName="p-0">
        {periods.length === 0 ? (
          <div className="p-4">
            <Empty title="還沒有匯入任何一期" hint="用上面的表單上傳第一份 PALMS 摘要報告。匯入滿 6 期後，燈號就是完整的近 6 期合計。" />
          </div>
        ) : (
          <div className="tb-table-wrap">
            <table className="tb-table">
              <thead>
                <tr>
                  <th scope="col">期間</th>
                  <th scope="col">版本</th>
                  <th scope="col">狀態</th>
                  <th scope="col" className="num">
                    會員
                  </th>
                  <th scope="col" className="num">
                    未對應
                  </th>
                  <th scope="col" className="num">
                    例會
                  </th>
                  <th scope="col">匯出時間</th>
                  <th scope="col">檔名</th>
                  <th scope="col">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => (
                  <tr key={period.id}>
                    <td>
                      <Link href={`/console/scorecard/import/${period.id}`} className="font-bold text-tb-text no-underline hover:underline">
                        {period.label}
                      </Link>
                      <div className="whitespace-nowrap text-xs text-tb-faint">{period.range}</div>
                    </td>
                    <td className="whitespace-nowrap">第 {period.version} 版</td>
                    <td>
                      <StatusChips period={period} />
                    </td>
                    <td className="num">{period.rowCount}</td>
                    <td className="num">
                      {period.unmatchedCount > 0 ? <span className="font-bold text-tb-gold">{period.unmatchedCount}</span> : 0}
                    </td>
                    <td className="num">{period.meetingCount}</td>
                    <td className="whitespace-nowrap text-tb-muted">{formatDateTime(period.exportedAt) || '沒有紀錄'}</td>
                    <td className="max-w-[220px] truncate text-xs text-tb-faint" title={period.fileName ?? undefined}>
                      {period.fileName ?? ''}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/console/scorecard/import/${period.id}`} className="tb-btn tb-btn-sm">
                          {period.status === 'draft' ? '檢查並確認' : '查看'}
                        </Link>
                        {period.isCurrent ? null : (
                          <ActionForm action={deletePeriodAction} className="flex flex-col items-end gap-1">
                            <input type="hidden" name="periodId" value={period.id} />
                            <ConfirmSubmit confirmText="確定刪除">刪除</ConfirmSubmit>
                          </ActionForm>
                        )}
                      </div>
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
