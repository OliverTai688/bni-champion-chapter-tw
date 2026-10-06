import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { LightChange, MetricBar, TrendChart, lightColor } from '@/components/tbx/scorecard/charts';
import { Empty } from '@/components/tbx/ui';
import { LIGHT_LABEL, METRIC_INFO, formatScoreNumber, type MetricResult } from '@/lib/tbx/scoring';
import { getMemberScorecard } from '@/server/tbx/scorecard';
import { getViewer } from '@/server/tbx/viewer';

function Header({ name }: { name: string }) {
  return (
    <header>
      <div className="tb-eyebrow">我的燈號</div>
      <h1 className="mt-1 text-2xl font-bold leading-tight">{name}</h1>
    </header>
  );
}

function ProfileLink() {
  return (
    <Link href="/me/profile" className="tb-btn tb-btn-lg w-full">
      <UserRound className="h-5 w-5" aria-hidden="true" />
      查看我的會員資料
    </Link>
  );
}

function metricDetail(metric: MetricResult, periods: number) {
  const info = METRIC_INFO[metric.key];
  const parts = [`近 ${periods} 期 ${formatScoreNumber(metric.raw)} ${info.unit}`];
  if (metric.basis === 'perWeek') parts.push(`平均每週 ${formatScoreNumber(metric.value, 2)}`);
  if (metric.next) {
    parts.push(`再 ${metric.next.need} ${info.unit}（+${formatScoreNumber(metric.next.gain)} 分）`);
  } else if (metric.points >= metric.max) {
    parts.push('已經滿分');
  } else if (metric.direction === 'lower') {
    parts.push('數字越少分數越高');
  }
  return parts.join('・');
}

export default async function MemberScorecardPage() {
  const viewer = await getViewer();
  const me = viewer.member;
  // The /me layout already redirects visitors without a member identity.
  if (!me) return null;

  const card = await getMemberScorecard(me.id);

  if (card.state === 'no-data') {
    return (
      <>
        <Header name={me.displayName} />
        <Empty title="燈號還沒有開始計算" hint="領導團隊匯入這一期的 PALMS 之後，你的燈號、五個分項和走勢就會出現在這裡。" />
        <ProfileLink />
      </>
    );
  }

  if (card.state === 'no-rows') {
    return (
      <>
        <Header name={me.displayName} />
        <Empty
          title="PALMS 裡還找不到你的資料"
          hint={`最新一期是 ${card.latestLabel}。可能是 PALMS 上的姓名和名冊不同，還沒有對應起來。請跟秘書財務或會員委員說一聲，對應好之後這裡就會顯示。`}
        />
        <ProfileLink />
      </>
    );
  }

  const { result, rule, nextTarget, cheapest } = card;
  const color = lightColor(result.light);
  const reachesTarget = Boolean(nextTarget && cheapest && cheapest.next.gain >= nextTarget.need);

  return (
    <>
      <Header name={me.displayName} />

      <section className="tb-card flex flex-col gap-4 p-4" aria-label="目前燈號">
        <div className="flex items-center gap-4">
          <span
            className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full"
            style={{ background: color, boxShadow: `0 0 0 6px var(--tb-surf2)` }}
            aria-hidden="true"
          >
            <span className="tb-num text-[30px] font-bold text-tb-gold-ink">{formatScoreNumber(result.score)}</span>
          </span>
          <div className="min-w-0">
            <div className="text-[28px] font-black leading-tight" style={{ color }}>
              {LIGHT_LABEL[result.light]}
            </div>
            <p className="text-sm text-tb-muted">
              {formatScoreNumber(result.score)} 分，滿分 {formatScoreNumber(result.maxScore)} 分
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={card.periodsWithData < card.windowSize ? 'tb-chip tb-chip-gold' : 'tb-chip tb-chip-present'}>
            資料 {card.periodsWithData} / {card.windowSize} 期
          </span>
          {card.period.isPartial ? <span className="tb-chip tb-chip-late">本期為期中數字</span> : null}
          <span className="text-tb-muted">算到 {card.period.label}</span>
        </div>

        {card.previousLight ? (
          <p className="flex flex-wrap items-center gap-2 text-sm text-tb-muted">
            上期到本期
            <LightChange from={card.previousLight} to={result.light} />
            {card.previousScore !== null ? (
              <span>
                {formatScoreNumber(card.previousScore)} → {formatScoreNumber(result.score)} 分
              </span>
            ) : null}
          </p>
        ) : null}

        {!card.isLatest ? (
          <p className="text-sm text-tb-gold">
            最新一期（{card.latestLabel}）的 PALMS 裡沒有你的資料，這裡顯示的是 {card.period.label} 的結果。
          </p>
        ) : null}
        {card.periodsWithData < card.windowSize ? (
          <p className="text-xs text-tb-faint">
            燈號看近 {card.windowSize} 期的合計。目前只有 {card.periodsWithData} 期資料，先用這幾期計算，之後每匯入一期會更準。
          </p>
        ) : null}
      </section>

      <section className="tb-banner flex-col !items-start gap-1.5" aria-label="下一步">
        {nextTarget ? (
          <p className="text-base font-bold">
            距離{LIGHT_LABEL[nextTarget.light]}還差 {formatScoreNumber(nextTarget.need)} 分
          </p>
        ) : (
          <p className="text-base font-bold">你現在是綠燈，繼續保持</p>
        )}
        {cheapest ? (
          <p className="text-sm text-tb-muted">
            {nextTarget ? '最省力的一步' : '還能再加分'}：再 {cheapest.next.need} {METRIC_INFO[cheapest.key].unit}，「{cheapest.label}」多拿{' '}
            {formatScoreNumber(cheapest.next.gain)} 分{reachesTarget && nextTarget ? `，就到${LIGHT_LABEL[nextTarget.light]}了` : ''}。
          </p>
        ) : nextTarget ? (
          <p className="text-sm text-tb-muted">能靠多做來加分的項目都滿分了。保持全勤，缺席紀錄移出近 {card.windowSize} 期後分數就會回來。</p>
        ) : (
          <p className="text-sm text-tb-muted">五個分項都拿到目前能拿的最高分。</p>
        )}
      </section>

      <section className="tb-card" aria-label="五個分項">
        <div className="tb-card-head">
          <h2>五個分項</h2>
          <span className="text-xs text-tb-muted">近 {card.periodsWithData} 期・{card.weeks} 次例會</span>
        </div>
        <div className="flex flex-col gap-5 p-4">
          {result.metrics.map((metric) => (
            <MetricBar key={metric.key} metric={metric} detail={metricDetail(metric, card.periodsWithData)} />
          ))}
        </div>
      </section>

      <section className="tb-card" aria-label="分數走勢">
        <div className="tb-card-head">
          <h2>分數走勢</h2>
          <span className="text-xs text-tb-muted">{card.trend.length} 期</span>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <TrendChart points={card.trend} max={result.maxScore} thresholds={rule.config.lights} />
          {card.trend.length < 2 ? (
            <p className="text-xs text-tb-faint">目前只有一期，下一期匯入後就能看到變化。</p>
          ) : (
            <p className="text-xs text-tb-faint">
              虛線是綠燈 {rule.config.lights.green}、黃燈 {rule.config.lights.yellow}、紅燈 {rule.config.lights.red} 分的門檻。
            </p>
          )}
        </div>
      </section>

      <section className="tb-card" aria-label="當期數字">
        <div className="tb-card-head">
          <h2>{card.period.label}的數字</h2>
          <span className="text-xs text-tb-muted">來自 PALMS</span>
        </div>
        <dl className="m-0 grid grid-cols-3 gap-y-4 p-4 text-center">
          {[
            ['出席', card.current.present],
            ['缺席', card.current.absent],
            ['代理', card.current.substitute],
            ['引薦', card.current.referrals],
            ['來賓', card.current.visitors],
            ['一對一', formatScoreNumber(card.current.oneToOnes)],
            ['CEU', card.current.ceu],
            ['遲到', card.current.late],
            ['病假', card.current.medical],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse gap-1">
              <dt className="text-xs text-tb-muted">{label}</dt>
              <dd className="tb-num m-0 text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {rule.isPlaceholder ? (
        <p className="text-xs text-tb-faint">
          目前使用的是示意計分規則，分會正式計分表上線後，分數與燈號可能會調整。
        </p>
      ) : null}

      <ProfileLink />
    </>
  );
}
