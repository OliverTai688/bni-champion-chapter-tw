import Link from 'next/link';
import { LIGHTS, LIGHT_LABEL, LIGHT_SHORT, formatScoreNumber, type Light, type MetricResult } from '@/lib/tbx/scoring';
import { cn } from '@/lib/utils';

// Light colours: green = tb-ok, yellow = tb-gold, red = tb-bad, grey = tb-faint.
// Every use also prints the label, colour never carries the meaning alone.
const LIGHT_VAR: Record<Light, string> = {
  green: 'var(--tb-ok)',
  yellow: 'var(--tb-gold)',
  red: 'var(--tb-bad)',
  grey: 'var(--tb-faint)',
};

const LIGHT_BG: Record<Light, string> = {
  green: 'bg-tb-ok',
  yellow: 'bg-tb-gold',
  red: 'bg-tb-bad',
  grey: 'bg-tb-faint',
};

const LIGHT_TEXT: Record<Light, string> = {
  green: 'text-tb-ok',
  yellow: 'text-tb-gold',
  red: 'text-tb-bad',
  grey: 'text-tb-faint',
};

const LIGHT_SOFT: Record<Light, string> = {
  green: 'var(--tb-ok-soft)',
  yellow: 'var(--tb-gold-soft)',
  red: 'var(--tb-bad-soft)',
  grey: 'var(--tb-surf2)',
};

export function lightColor(light: Light) {
  return LIGHT_VAR[light];
}

export function LightChip({ light, className }: { light: Light; className?: string }) {
  return (
    <span className={cn('tb-chip', className)} style={{ background: LIGHT_SOFT[light], color: LIGHT_VAR[light] }}>
      {LIGHT_LABEL[light]}
    </span>
  );
}

/** "綠 → 黃" with both ends coloured and named. */
export function LightChange({ from, to }: { from: Light | null; to: Light }) {
  if (!from) return <span className="text-xs text-tb-faint">第一期</span>;
  if (from === to) return <span className="text-xs text-tb-faint">維持{LIGHT_SHORT[to]}燈</span>;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold">
      <span className={LIGHT_TEXT[from]}>{LIGHT_SHORT[from]}</span>
      <span className="text-tb-faint" aria-hidden="true">
        →
      </span>
      <span className="sr-only">變成</span>
      <span className={LIGHT_TEXT[to]}>{LIGHT_SHORT[to]}</span>
    </span>
  );
}

function distributionText(distribution: Record<Light, number>) {
  return LIGHTS.map((light) => `${LIGHT_LABEL[light]} ${distribution[light]} 位`).join('、');
}

/** One horizontal stacked bar with a legend that repeats every count as text. */
export function LightBar({ distribution }: { distribution: Record<Light, number> }) {
  const total = LIGHTS.reduce((sum, light) => sum + distribution[light], 0);
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-9 w-full gap-0.5 overflow-hidden rounded-lg bg-tb-surf2"
        role="img"
        aria-label={`燈號分布：${distributionText(distribution)}`}
      >
        {total > 0
          ? LIGHTS.filter((light) => distribution[light] > 0).map((light) => {
              const share = distribution[light] / total;
              return (
                <div
                  key={light}
                  className={cn('flex min-w-[6px] items-center justify-center', LIGHT_BG[light])}
                  style={{ width: `${share * 100}%` }}
                >
                  {share >= 0.08 ? (
                    <span className="tb-num text-base font-bold text-tb-gold-ink">{distribution[light]}</span>
                  ) : null}
                </div>
              );
            })
          : null}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-sm">
        {LIGHTS.map((light) => (
          <li key={light} className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', LIGHT_BG[light])} aria-hidden="true" />
            <span className="text-tb-muted">{LIGHT_LABEL[light]}</span>
            <span className="tb-num text-lg font-semibold text-tb-text">{distribution[light]}</span>
            <span className="text-xs text-tb-faint">{total > 0 ? `${Math.round((distribution[light] / total) * 100)}%` : '0%'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface LightColumn {
  key: string;
  href: string;
  label: string;
  short: string;
  note?: string;
  distribution: Record<Light, number>;
  total: number;
  selected: boolean;
}

/** Time series: one stacked column per period. Each column links to that period. */
export function LightColumns({ columns }: { columns: LightColumn[] }) {
  const peak = Math.max(1, ...columns.map((column) => column.total));
  const chartHeight = 150;

  return (
    <div className="overflow-x-auto">
      <ol className="m-0 flex min-w-min list-none items-end gap-2 p-0">
        {columns.map((column) => {
          const height = Math.max(4, Math.round((column.total / peak) * chartHeight));
          return (
            <li key={column.key} className="flex w-12 shrink-0 flex-col items-center gap-1.5 sm:w-14">
              <span className="tb-num text-sm font-semibold text-tb-muted">{column.total}</span>
              <Link
                href={column.href}
                aria-current={column.selected ? 'true' : undefined}
                aria-label={`${column.label}：${distributionText(column.distribution)}`}
                title={`${column.label}：${distributionText(column.distribution)}`}
                className={cn(
                  'flex w-full flex-col justify-end gap-0.5 overflow-hidden rounded-md no-underline',
                  column.selected ? 'ring-2 ring-tb-text ring-offset-2 ring-offset-tb-surf' : 'opacity-80 hover:opacity-100',
                )}
                style={{ height: chartHeight }}
              >
                <span className="flex w-full flex-col gap-0.5" style={{ height }}>
                  {LIGHTS.filter((light) => column.distribution[light] > 0).map((light) => {
                    const segment = (column.distribution[light] / Math.max(1, column.total)) * height;
                    return (
                      <span
                        key={light}
                        className={cn('flex w-full items-center justify-center', LIGHT_BG[light])}
                        style={{ flexGrow: column.distribution[light], flexBasis: 0, minHeight: 3 }}
                      >
                        {segment >= 16 ? (
                          <span className="tb-num text-[13px] font-bold text-tb-gold-ink">{column.distribution[light]}</span>
                        ) : null}
                      </span>
                    );
                  })}
                </span>
              </Link>
              <span className={cn('text-xs font-semibold', column.selected ? 'text-tb-text' : 'text-tb-muted')}>
                {column.short}
              </span>
              <span className="h-4 text-[11px] text-tb-faint">{column.note ?? ''}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export interface SparkPoint {
  label: string;
  score: number;
  light: Light;
}

/** Small score line for a table row. The last point takes the colour of its light. */
export function Sparkline({ points, max, width = 92, height = 28 }: { points: SparkPoint[]; max: number; width?: number; height?: number }) {
  if (points.length === 0) return <span className="text-xs text-tb-faint">沒有資料</span>;

  const pad = 4;
  const top = Math.max(1, max);
  const x = (index: number) => (points.length === 1 ? width - pad : pad + (index * (width - pad * 2)) / (points.length - 1));
  const y = (score: number) => height - pad - (Math.min(top, Math.max(0, score)) / top) * (height - pad * 2);
  const last = points[points.length - 1];
  const summary = points.map((point) => `${point.label} ${formatScoreNumber(point.score)} 分`).join('、');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`分數走勢：${summary}`}>
      <title>{summary}</title>
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} style={{ stroke: 'var(--tb-line)' }} strokeWidth={1} />
      {points.length > 1 ? (
        <polyline
          points={points.map((point, index) => `${x(index).toFixed(1)},${y(point.score).toFixed(1)}`).join(' ')}
          fill="none"
          style={{ stroke: 'var(--tb-muted)' }}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      <circle cx={x(points.length - 1)} cy={y(last.score)} r={3} style={{ fill: LIGHT_VAR[last.light] }} />
    </svg>
  );
}

/** Larger score trend with the light thresholds drawn in. Used on the member page. */
export function TrendChart({
  points,
  max,
  thresholds,
}: {
  points: Array<SparkPoint & { short: string }>;
  max: number;
  thresholds: { green: number; yellow: number; red: number };
}) {
  const width = 320;
  const height = 150;
  const left = 30;
  const right = 14;
  const topPad = 18;
  const bottom = 26;
  const top = Math.max(1, max);
  const x = (index: number) =>
    points.length === 1 ? (left + width - right) / 2 : left + (index * (width - left - right)) / (points.length - 1);
  const y = (score: number) => height - bottom - (Math.min(top, Math.max(0, score)) / top) * (height - bottom - topPad);
  const summary = points.map((point) => `${point.label} ${formatScoreNumber(point.score)} 分（${LIGHT_LABEL[point.light]}）`).join('、');
  const lines: Array<{ light: Light; at: number }> = [
    { light: 'green', at: thresholds.green },
    { light: 'yellow', at: thresholds.yellow },
    { light: 'red', at: thresholds.red },
  ];
  // With many periods, label every other one so the axis stays readable.
  const labelEvery = points.length > 6 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={`分數走勢：${summary}`}>
      <title>{summary}</title>
      {lines.map((line) => (
        <g key={line.light}>
          <line
            x1={left}
            x2={width - right}
            y1={y(line.at)}
            y2={y(line.at)}
            style={{ stroke: LIGHT_VAR[line.light] }}
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.7}
          />
          <text x={left - 5} y={y(line.at) + 3.5} textAnchor="end" fontSize={10} style={{ fill: LIGHT_VAR[line.light] }}>
            {line.at}
          </text>
        </g>
      ))}
      <line x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} style={{ stroke: 'var(--tb-line)' }} strokeWidth={1} />
      {points.length > 1 ? (
        <polyline
          points={points.map((point, index) => `${x(index).toFixed(1)},${y(point.score).toFixed(1)}`).join(' ')}
          fill="none"
          style={{ stroke: 'var(--tb-text)' }}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={x(index)} cy={y(point.score)} r={4.5} style={{ fill: LIGHT_VAR[point.light], stroke: 'var(--tb-surf)' }} strokeWidth={2} />
          {index === points.length - 1 || points.length <= 6 ? (
            <text x={x(index)} y={y(point.score) - 8} textAnchor="middle" fontSize={11} fontWeight={700} style={{ fill: 'var(--tb-text)' }}>
              {formatScoreNumber(point.score)}
            </text>
          ) : null}
          {(points.length - 1 - index) % labelEvery === 0 ? (
            <text x={x(index)} y={height - 8} textAnchor="middle" fontSize={10} style={{ fill: 'var(--tb-muted)' }}>
              {point.short}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

/** Points of one metric as a bar, with the raw number that produced them. */
export function MetricBar({ metric, detail }: { metric: MetricResult; detail: string }) {
  const share = metric.max > 0 ? Math.min(1, Math.max(0, metric.points / metric.max)) : 0;
  const full = metric.points >= metric.max;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-bold">{metric.label}</span>
        <span className="tb-num text-xl font-semibold">
          {formatScoreNumber(metric.points)}
          <span className="text-sm text-tb-faint"> / {formatScoreNumber(metric.max)}</span>
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-tb-surf2"
        role="meter"
        aria-label={`${metric.label}得分`}
        aria-valuemin={0}
        aria-valuemax={metric.max}
        aria-valuenow={metric.points}
      >
        <div className={cn('h-full rounded-full', full ? 'bg-tb-ok' : 'bg-tb-muted')} style={{ width: `${share * 100}%` }} />
      </div>
      <p className="text-xs text-tb-muted">{detail}</p>
    </div>
  );
}
