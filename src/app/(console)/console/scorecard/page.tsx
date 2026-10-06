import Form from 'next/form';
import Link from 'next/link';
import { SlidersHorizontal, TrendingDown, Upload } from 'lucide-react';
import { LightBar, LightChange, LightChip, LightColumns, Sparkline } from '@/components/tbx/scorecard/charts';
import { LeaderRequired } from '@/components/tbx/scorecard/leader-required';
import { Card, Empty, PageHeader } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import {
  LIGHTS,
  LIGHT_LABEL,
  METRIC_INFO,
  formatScoreNumber,
  maxScoreOf,
  type Light,
  type MetricResult,
} from '@/lib/tbx/scoring';
import { isObjectId } from '@/server/tbx/action';
import { getScorecardOverview, listPalmsPeriods, type OverviewMember } from '@/server/tbx/scorecard';
import { isLeader } from '@/server/tbx/viewer';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type SortKey = 'score-desc' | 'score-asc' | 'name';

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function readLight(value: string): Light | 'all' {
  return (LIGHTS as string[]).includes(value) ? (value as Light) : 'all';
}

function readSort(value: string): SortKey {
  return value === 'score-asc' || value === 'name' ? value : 'score-desc';
}

function metricTitle(metric: MetricResult, periods: number) {
  const info = METRIC_INFO[metric.key];
  const raw = `近 ${periods} 期 ${formatScoreNumber(metric.raw)} ${info.unit}`;
  return metric.basis === 'perWeek' ? `${raw}，平均每週 ${formatScoreNumber(metric.value, 2)}` : raw;
}

export default async function ScorecardOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isLeader())) return <LeaderRequired />;

  const params = await searchParams;
  const requestedPeriod = first(params.period);
  const light = readLight(first(params.light));
  const dropOnly = first(params.drop) === '1';
  const q = first(params.q);
  const sort = readSort(first(params.sort));

  const overview = await getScorecardOverview(isObjectId(requestedPeriod) ? requestedPeriod : null);

  if (!overview) {
    const drafts = (await listPalmsPeriods()).filter((period) => period.status === 'draft');
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          eyebrow="綠燈會員"
          title="燈號總覽"
          description="匯入每一期的 PALMS 摘要報告後，這裡會算出每位會員的綠、黃、紅、灰燈，並保留逐期的變化。"
        />
        {drafts.length > 0 ? (
          <Empty
            title={`有 ${drafts.length} 份 PALMS 草稿還沒確認`}
            hint="草稿要先檢查會員對名與總數，按「確認匯入」之後才會算出燈號。"
            action={
              <Link href={`/console/scorecard/import/${drafts[0].id}`} className="tb-btn tb-btn-gold">
                檢查 {drafts[0].label} 的草稿
              </Link>
            }
          />
        ) : (
          <Empty
            title="還沒有匯入 PALMS"
            hint="從 BNI Connect 匯出這一期的「分會 PALMS 摘要報告」（.xls），上傳後就會算出燈號。"
            action={
              <Link href="/console/scorecard/import" className="tb-btn tb-btn-gold">
                <Upload className="h-4 w-4" aria-hidden="true" />
                匯入第一份 PALMS
              </Link>
            }
          />
        )}
        <div>
          <Link href="/console/scorecard/rules" className="tb-btn tb-btn-quiet">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            先看計分規則
          </Link>
        </div>
      </div>
    );
  }

  const { selected, window, rule } = overview;
  const maxScore = maxScoreOf(rule.config);
  const needle = q.normalize('NFKC').toLowerCase();
  const droppedCount = overview.members.filter((member) => member.dropped).length;

  const visible = overview.members
    .filter((member) => (light === 'all' ? true : member.light === light))
    .filter((member) => (dropOnly ? member.dropped : true))
    .filter((member) => (needle ? member.name.normalize('NFKC').toLowerCase().includes(needle) : true))
    .sort((a: OverviewMember, b: OverviewMember) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'zh-Hant');
      const diff = sort === 'score-asc' ? a.score - b.score : b.score - a.score;
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'zh-Hant');
    });

  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const current: Record<string, string> = {
      period: selected.id,
      light: light === 'all' ? '' : light,
      drop: dropOnly ? '1' : '',
      q,
      sort: sort === 'score-desc' ? '' : sort,
    };
    for (const [key, value] of Object.entries({ ...current, ...changes })) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/console/scorecard?${query}` : '/console/scorecard';
  };

  const filtered = light !== 'all' || dropOnly || Boolean(q);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="綠燈會員"
        title="燈號總覽"
        description={`${selected.label}，${overview.members.length} 位會員。燈號用近 ${window.size} 期的合計計算，表格同時列出當期數字。`}
        actions={
          <>
            <Link href="/console/scorecard/rules" className="tb-btn">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              計分規則
            </Link>
            <Link href="/console/scorecard/import" className="tb-btn tb-btn-outline">
              <Upload className="h-4 w-4" aria-hidden="true" />
              匯入 PALMS
            </Link>
          </>
        }
      />

      {rule.isPlaceholder ? (
        <div className="tb-banner">
          <p className="min-w-0 flex-1 text-sm">
            目前用的是系統內建的示意規則，級距還沒有對過分會現行計分表，燈號僅供參考。拿到計分表後請到計分規則調整並另存新版本。
          </p>
          <Link href="/console/scorecard/rules" className="tb-btn tb-btn-gold tb-btn-sm">
            調整計分規則
          </Link>
        </div>
      ) : null}

      {overview.unmatchedCount > 0 ? (
        <div className="tb-banner">
          <p className="min-w-0 flex-1 text-sm">
            這一期的 PALMS 有 {overview.unmatchedCount} 列還沒對應到名冊會員，這幾列沒有列入燈號。
          </p>
          <Link href={`/console/scorecard/import/${selected.id}`} className="tb-btn tb-btn-gold tb-btn-sm">
            去對應姓名
          </Link>
        </div>
      ) : null}

      <Card title="計算範圍">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <Form action="/console/scorecard" className="flex flex-wrap items-end gap-2">
            <label className="tb-label min-w-[220px]" htmlFor="scorecard-period">
              看哪一期
              <select id="scorecard-period" name="period" className="tb-select" defaultValue={selected.id} key={selected.id}>
                {overview.periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.label}
                    {period.isPartial ? '（期中）' : ''}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="tb-btn">
              切換期間
            </button>
          </Form>
          <div className="flex flex-col gap-1.5 text-sm text-tb-muted">
            <span className="flex flex-wrap items-center gap-2">
              <span className={window.periodsUsed < window.size ? 'tb-chip tb-chip-gold' : 'tb-chip tb-chip-present'}>
                資料 {window.periodsUsed} / {window.size} 期
              </span>
              {selected.isPartial ? <span className="tb-chip tb-chip-late">本期為期中數字</span> : null}
              <span className="tb-chip tb-chip-plain">規則第 {rule.version} 版</span>
            </span>
            <span>
              {window.periodsUsed > 1 ? `${window.firstLabel} 到 ${window.lastLabel}` : window.lastLabel}，共 {window.weeks} 次例會。
              {window.periodsUsed < window.size ? `還不滿 ${window.size} 期，先用現有的 ${window.periodsUsed} 期計算。` : ''}
            </span>
            <span className="text-xs text-tb-faint">
              本期 PALMS 匯出於 {formatDateTime(selected.exportedAt) || '時間不明'}・第 {selected.version} 版
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="分會燈號分布" aside={`${selected.label}・${overview.members.length} 位`}>
          <LightBar distribution={overview.distribution} />
        </Card>
        <Card title="逐期變化" aside="每一柱是以該期為結尾的近 6 期燈號，點柱子切換期間">
          <LightColumns
            columns={overview.series.map((point) => ({
              key: point.periodId,
              href: hrefWith({ period: point.periodId }),
              label: point.label,
              short: point.short,
              note: point.isPartial ? '期中' : point.periodsUsed < window.size ? `${point.periodsUsed}/${window.size} 期` : undefined,
              distribution: point.distribution,
              total: point.total,
              selected: point.selected,
            }))}
          />
        </Card>
      </div>

      <Card
        title="會員燈號"
        aside={filtered ? `符合條件 ${visible.length} / ${overview.members.length} 位` : `${overview.members.length} 位`}
        bodyClassName="flex flex-col"
      >
        <div className="flex flex-col gap-3 px-4 pt-3">
          <nav className="tb-tabs" aria-label="依燈號篩選">
            <Link href={hrefWith({ light: null })} className="tb-tab" aria-current={light === 'all' ? 'page' : undefined}>
              全部 {overview.members.length}
            </Link>
            {LIGHTS.map((item) => (
              <Link key={item} href={hrefWith({ light: item })} className="tb-tab" aria-current={light === item ? 'page' : undefined}>
                {LIGHT_LABEL[item]} {overview.distribution[item]}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-3 pb-3">
            <Form action="/console/scorecard" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="period" value={selected.id} />
              {light !== 'all' ? <input type="hidden" name="light" value={light} /> : null}
              {dropOnly ? <input type="hidden" name="drop" value="1" /> : null}
              <label className="tb-label w-[180px]" htmlFor="scorecard-q">
                找會員
                <input id="scorecard-q" name="q" type="search" className="tb-input" defaultValue={q} placeholder="輸入姓名" key={`q-${q}`} />
              </label>
              <label className="tb-label w-[150px]" htmlFor="scorecard-sort">
                排序
                <select id="scorecard-sort" name="sort" className="tb-select" defaultValue={sort} key={`sort-${sort}`}>
                  <option value="score-desc">分數高到低</option>
                  <option value="score-asc">分數低到高</option>
                  <option value="name">姓名</option>
                </select>
              </label>
              <button type="submit" className="tb-btn">
                套用
              </button>
              {filtered ? (
                <Link href={hrefWith({ light: null, drop: null, q: null })} className="tb-btn tb-btn-quiet">
                  清除篩選
                </Link>
              ) : null}
            </Form>
            <Link
              href={hrefWith({ drop: dropOnly ? null : '1' })}
              className={dropOnly ? 'tb-btn tb-btn-outline' : 'tb-btn'}
            >
              <TrendingDown className="h-4 w-4" aria-hidden="true" />
              {dropOnly ? '正在只看燈號下降' : `只看燈號下降（${droppedCount}）`}
            </Link>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-4 pt-0">
            <Empty
              title={dropOnly && !q && light === 'all' ? '這一期沒有人燈號下降' : '沒有符合條件的會員'}
              hint={
                overview.previousLabel
                  ? '換一個燈號、清掉搜尋字，或按「清除篩選」看全部會員。'
                  : '「燈號下降」要有上一期才比得出來。再匯入一期之後就會出現變化。'
              }
              action={
                <Link href={hrefWith({ light: null, drop: null, q: null })} className="tb-btn">
                  看全部會員
                </Link>
              }
            />
          </div>
        ) : (
          <div className="tb-table-wrap border-t border-tb-line">
            <table className="tb-table">
              <thead>
                <tr>
                  <th scope="col" rowSpan={2}>
                    會員
                  </th>
                  <th scope="colgroup" colSpan={6} className="border-l border-tb-line">
                    當期數字（{selected.short}）
                  </th>
                  <th scope="colgroup" colSpan={5} className="border-l border-tb-line">
                    近 {window.periodsUsed} 期得分（每項滿分見規則）
                  </th>
                  <th scope="col" rowSpan={2} className="num border-l border-tb-line">
                    分數
                  </th>
                  <th scope="col" rowSpan={2}>
                    燈號
                  </th>
                  <th scope="col" rowSpan={2}>
                    上期 → 本期
                  </th>
                  <th scope="col" rowSpan={2}>
                    分數走勢
                  </th>
                </tr>
                <tr>
                  <th scope="col" className="num border-l border-tb-line">
                    缺席
                  </th>
                  <th scope="col" className="num">
                    代理
                  </th>
                  <th scope="col" className="num">
                    引薦
                  </th>
                  <th scope="col" className="num">
                    來賓
                  </th>
                  <th scope="col" className="num">
                    一對一
                  </th>
                  <th scope="col" className="num">
                    CEU
                  </th>
                  {rule.config.metrics.map((metric, index) => (
                    <th key={metric.key} scope="col" className={index === 0 ? 'num border-l border-tb-line' : 'num'}>
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => (
                  <tr key={member.memberId}>
                    <td className="whitespace-nowrap">
                      <Link href={`/console/members/${member.memberId}`} className="font-bold text-tb-text no-underline hover:underline">
                        {member.name}
                      </Link>
                      {member.periodsWithData < window.periodsUsed ? (
                        <div className="text-[11px] text-tb-faint">資料 {member.periodsWithData} 期</div>
                      ) : null}
                    </td>
                    <td className={member.current.absent > 0 ? 'num border-l border-tb-line font-bold text-tb-bad' : 'num border-l border-tb-line'}>
                      {member.current.absent}
                    </td>
                    <td className="num">{member.current.substitute}</td>
                    <td className="num">{member.current.referrals}</td>
                    <td className="num">{member.current.visitors}</td>
                    <td className="num">{formatScoreNumber(member.current.oneToOnes)}</td>
                    <td className="num">{member.current.ceu}</td>
                    {member.metrics.map((metric, index) => (
                      <td
                        key={metric.key}
                        className={index === 0 ? 'num border-l border-tb-line' : 'num'}
                        title={metricTitle(metric, member.periodsWithData)}
                      >
                        <span className={metric.points >= metric.max ? 'text-tb-ok' : metric.points <= 0 ? 'text-tb-faint' : undefined}>
                          {formatScoreNumber(metric.points)}
                        </span>
                      </td>
                    ))}
                    <td className="num border-l border-tb-line">
                      <span className="tb-num text-xl font-semibold">{formatScoreNumber(member.score)}</span>
                    </td>
                    <td>
                      <LightChip light={member.light} />
                    </td>
                    <td>
                      <LightChange from={member.previousLight} to={member.light} />
                      {member.previousScore !== null ? (
                        <div className="whitespace-nowrap text-[11px] text-tb-faint">
                          {formatScoreNumber(member.previousScore)} → {formatScoreNumber(member.score)} 分
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <Sparkline points={member.trend} max={maxScore} />
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
