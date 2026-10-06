import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/tbx/client';
import { LightChip } from '@/components/tbx/scorecard/charts';
import { KeepForm } from '@/components/tbx/scorecard/keep-form';
import { LeaderRequired } from '@/components/tbx/scorecard/leader-required';
import { Card, PageHeader } from '@/components/tbx/ui';
import { formatDateTime } from '@/lib/tbx/labels';
import {
  METRIC_INFO,
  formatScoreNumber,
  maxScoreOf,
  sortTiers,
  type ScoringConfig,
  type ScoringMetric,
} from '@/lib/tbx/scoring';
import { listRules } from '@/server/tbx/scorecard';
import { isLeader } from '@/server/tbx/viewer';
import { activateRuleAction, saveRuleAction } from '../actions';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const EXTRA_TIER_SLOTS = 2;

function tierText(metric: ScoringMetric, threshold: number) {
  const basis = metric.basis === 'perWeek' ? '平均每週' : '合計';
  return `${basis} ${metric.direction === 'higher' ? '≥' : '≤'} ${formatScoreNumber(threshold, 2)}`;
}

function lightsText(config: ScoringConfig) {
  return `綠 ${config.lights.green}・黃 ${config.lights.yellow}・紅 ${config.lights.red}`;
}

export default async function ScorecardRulesPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await isLeader())) return <LeaderRequired />;

  const params = await searchParams;
  const savedParam = Array.isArray(params.saved) ? params.saved[0] : params.saved;
  const rules = await listRules();
  const active = rules.find((rule) => rule.isActive) ?? rules[0];
  const { config } = active;
  const maxScore = maxScoreOf(config);
  const justSaved = savedParam && Number(savedParam) === active.version;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="綠燈會員"
        title="計分規則"
        description="燈號由五個分項的得分加總決定。調整後會另存成新版本並立刻採用，舊版本保留在下方，可以隨時換回去。"
        actions={
          <Link href="/console/scorecard" className="tb-btn tb-btn-quiet">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            回燈號總覽
          </Link>
        }
      />

      {justSaved ? (
        <div className="tb-banner tb-banner-ok" role="status">
          <p className="text-sm">已另存為第 {active.version} 版並開始採用，所有期間的燈號已依這一版重算。</p>
        </div>
      ) : null}

      {active.isPlaceholder ? (
        <div className="tb-banner">
          <p className="text-sm">
            目前是系統內建的示意規則。分會現行的計分表還沒有提供，下面的級距只是常見的「五項各 20 分、70 分綠燈」寫法，請依分會計分表調整後另存新版本。
          </p>
        </div>
      ) : null}

      <Card
        title={`目前採用：第 ${active.version} 版`}
        aside={
          <>
            <span>{active.name}</span>
            <span>・建立於 {formatDateTime(active.createdAt)}</span>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-2">
              <LightChip light="green" /> {config.lights.green} 分以上
            </span>
            <span className="flex items-center gap-2">
              <LightChip light="yellow" /> {config.lights.yellow} 分以上、未滿 {config.lights.green} 分
            </span>
            <span className="flex items-center gap-2">
              <LightChip light="red" /> {config.lights.red} 分以上、未滿 {config.lights.yellow} 分
            </span>
            <span className="flex items-center gap-2">
              <LightChip light="grey" /> 未滿 {config.lights.red} 分
            </span>
            <span className="text-tb-faint">滿分 {maxScore} 分</span>
          </div>
          <div className="tb-table-wrap rounded-lg border border-tb-line">
            <table className="tb-table">
              <thead>
                <tr>
                  <th scope="col">分項</th>
                  <th scope="col">算什麼</th>
                  <th scope="col" className="num">
                    滿分
                  </th>
                  <th scope="col">級距</th>
                </tr>
              </thead>
              <tbody>
                {config.metrics.map((metric) => (
                  <tr key={metric.key}>
                    <td className="whitespace-nowrap font-bold">{metric.label}</td>
                    <td className="text-tb-muted">
                      {METRIC_INFO[metric.key].source}
                      <div className="text-xs text-tb-faint">
                        {metric.basis === 'perWeek' ? '近 6 期合計 ÷ 例會次數' : '近 6 期合計'}・
                        {metric.direction === 'higher' ? '數字越高分數越高' : '數字越低分數越高'}
                      </div>
                    </td>
                    <td className="num">{formatScoreNumber(metric.max)}</td>
                    <td>
                      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                        {sortTiers(metric.tiers, metric.direction)
                          .reverse()
                          .map((tier) => (
                            <li key={tier.threshold} className="tb-chip tb-chip-plain">
                              {tierText(metric, tier.threshold)} → {formatScoreNumber(tier.points)} 分
                            </li>
                          ))}
                        <li className="tb-chip tb-chip-plain">其餘 0 分</li>
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-tb-faint">
            計算範圍是選定期間加上前面最多 5 期（近 6 期）。會員只計入自己有 PALMS 資料的期間，所以新會員的「平均每週」只除以入會後的例會次數。
          </p>
        </div>
      </Card>

      <Card title="調整後另存新版本" aside={`會存成第 ${rules[0].version + 1} 版`}>
        <KeepForm
          key={active.id}
          action={saveRuleAction}
          className="flex flex-col gap-6"
          submitLabel={`另存為第 ${rules[0].version + 1} 版並採用`}
          pendingText="儲存中…"
          footer={<span className="text-xs text-tb-muted">儲存後所有期間的燈號會依新版本重算。</span>}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="tb-label" htmlFor="rule-name">
              規則名稱
              <input
                id="rule-name"
                name="name"
                className="tb-input"
                required
                maxLength={60}
                defaultValue={active.isPlaceholder ? '' : active.name}
                placeholder="例如：2026 下半年分會計分表"
              />
            </label>
            <label className="tb-label" htmlFor="rule-note">
              備註（選填）
              <input id="rule-note" name="note" className="tb-input" maxLength={200} placeholder="例如：依 10 月領導團隊會議決議" />
            </label>
          </div>

          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-2 p-0 text-sm font-bold">燈號門檻（總分達到幾分）</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="tb-label" htmlFor="lights-green">
                綠燈：幾分以上
                <input id="lights-green" name="lights.green" type="number" step="any" min={0} className="tb-input" required defaultValue={config.lights.green} />
              </label>
              <label className="tb-label" htmlFor="lights-yellow">
                黃燈：幾分以上
                <input id="lights-yellow" name="lights.yellow" type="number" step="any" min={0} className="tb-input" required defaultValue={config.lights.yellow} />
              </label>
              <label className="tb-label" htmlFor="lights-red">
                紅燈：幾分以上（再低就是灰燈）
                <input id="lights-red" name="lights.red" type="number" step="any" min={0} className="tb-input" required defaultValue={config.lights.red} />
              </label>
            </div>
          </fieldset>

          <div className="grid gap-4 xl:grid-cols-2">
            {config.metrics.map((metric) => {
              const tiers = sortTiers(metric.tiers, metric.direction).reverse();
              const slots = tiers.length + EXTRA_TIER_SLOTS;
              const id = `metric-${metric.key}`;
              return (
                <fieldset key={metric.key} className="m-0 flex flex-col gap-3 rounded-xl border border-tb-line p-4">
                  <legend className="px-1 text-sm font-bold">{METRIC_INFO[metric.key].label}</legend>
                  <p className="text-xs text-tb-muted">計算來源：{METRIC_INFO[metric.key].source}</p>
                  <input type="hidden" name={`m.${metric.key}.slots`} value={slots} />
                  <div className="grid grid-cols-2 gap-3">
                    <label className="tb-label" htmlFor={`${id}-label`}>
                      顯示名稱
                      <input id={`${id}-label`} name={`m.${metric.key}.label`} className="tb-input" required maxLength={12} defaultValue={metric.label} />
                    </label>
                    <label className="tb-label" htmlFor={`${id}-max`}>
                      滿分
                      <input id={`${id}-max`} name={`m.${metric.key}.max`} type="number" step="any" min={0} className="tb-input" required defaultValue={metric.max} />
                    </label>
                    <label className="tb-label" htmlFor={`${id}-basis`}>
                      用哪個數字比
                      <select id={`${id}-basis`} name={`m.${metric.key}.basis`} className="tb-select" defaultValue={metric.basis}>
                        <option value="total">近 6 期合計</option>
                        <option value="perWeek">平均每週（合計 ÷ 例會次數）</option>
                      </select>
                    </label>
                    <label className="tb-label" htmlFor={`${id}-direction`}>
                      怎麼算達標
                      <select id={`${id}-direction`} name={`m.${metric.key}.direction`} className="tb-select" defaultValue={metric.direction}>
                        <option value="higher">數字 ≥ 門檻就得分</option>
                        <option value="lower">數字 ≤ 門檻就得分</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2 text-xs font-semibold text-tb-faint">
                      <span>級距</span>
                      <span>門檻</span>
                      <span>得分</span>
                    </div>
                    {Array.from({ length: slots }, (_unused, index) => {
                      const tier = tiers[index];
                      return (
                        <div key={index} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-2">
                          <span className="tb-num text-base text-tb-muted">{index + 1}</span>
                          <label className="sr-only" htmlFor={`${id}-t${index}-threshold`}>
                            {metric.label}第 {index + 1} 個級距的門檻
                          </label>
                          <input
                            id={`${id}-t${index}-threshold`}
                            name={`m.${metric.key}.t.${index}.threshold`}
                            type="number"
                            step="any"
                            min={0}
                            className="tb-input"
                            defaultValue={tier ? tier.threshold : ''}
                            placeholder={tier ? undefined : '不用就留空'}
                          />
                          <label className="sr-only" htmlFor={`${id}-t${index}-points`}>
                            {metric.label}第 {index + 1} 個級距的得分
                          </label>
                          <input
                            id={`${id}-t${index}-points`}
                            name={`m.${metric.key}.t.${index}.points`}
                            type="number"
                            step="any"
                            min={0}
                            className="tb-input"
                            defaultValue={tier ? tier.points : ''}
                            placeholder={tier ? undefined : '不用就留空'}
                          />
                        </div>
                      );
                    })}
                    <p className="text-xs text-tb-faint">
                      達到多個級距時取分數最高的那一個；一個都沒達到是 0 分。順序不用自己排，儲存時會整理。
                    </p>
                  </div>
                </fieldset>
              );
            })}
          </div>
        </KeepForm>
      </Card>

      <Card title="所有版本" aside={`共 ${rules.length} 版`} bodyClassName="p-0">
        <div className="tb-table-wrap">
          <table className="tb-table">
            <thead>
              <tr>
                <th scope="col">版本</th>
                <th scope="col">名稱</th>
                <th scope="col">燈號門檻</th>
                <th scope="col">建立時間</th>
                <th scope="col">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td className="whitespace-nowrap">
                    <span className="font-bold">第 {rule.version} 版</span>
                    {rule.isActive ? <span className="ml-2 tb-chip tb-chip-present">採用中</span> : null}
                  </td>
                  <td>
                    {rule.name}
                    {rule.note ? <div className="text-xs text-tb-faint">{rule.note}</div> : null}
                  </td>
                  <td className="whitespace-nowrap text-tb-muted">{lightsText(rule.config)}</td>
                  <td className="whitespace-nowrap text-tb-muted">{formatDateTime(rule.createdAt)}</td>
                  <td>
                    {rule.isActive ? null : (
                      <ActionForm action={activateRuleAction} className="flex flex-col items-end gap-1">
                        <input type="hidden" name="ruleId" value={rule.id} />
                        <SubmitButton className="tb-btn-sm tb-btn-outline" pendingText="切換中…">
                          改用這一版
                        </SubmitButton>
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
