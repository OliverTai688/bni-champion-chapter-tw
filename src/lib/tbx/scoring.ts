// Traffic-light scoring for the 綠燈會員 scorecard. Pure module: safe on client and server.

export type Light = 'green' | 'yellow' | 'red' | 'grey';

export const LIGHTS: Light[] = ['green', 'yellow', 'red', 'grey'];

export const LIGHT_LABEL: Record<Light, string> = {
  green: '綠燈',
  yellow: '黃燈',
  red: '紅燈',
  grey: '灰燈',
};

export const LIGHT_SHORT: Record<Light, string> = { green: '綠', yellow: '黃', red: '紅', grey: '灰' };

/** Higher is better. Used to tell whether a light went down. */
export const LIGHT_RANK: Record<Light, number> = { green: 3, yellow: 2, red: 1, grey: 0 };

export const METRIC_KEYS = ['attendance', 'referrals', 'visitors', 'oneToOnes', 'ceu'] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export type MetricBasis = 'total' | 'perWeek';
export type MetricDirection = 'higher' | 'lower';

export interface ScoringTier {
  threshold: number;
  points: number;
}

export interface ScoringMetric {
  key: MetricKey;
  label: string;
  /** Most points this metric can give. */
  max: number;
  /** `total`: raw sum over the window. `perWeek`: raw sum divided by the meetings in the window. */
  basis: MetricBasis;
  /** `higher`: value ≥ threshold earns the tier. `lower`: value ≤ threshold earns the tier. */
  direction: MetricDirection;
  tiers: ScoringTier[];
}

export interface ScoringConfig {
  lights: { green: number; yellow: number; red: number };
  metrics: ScoringMetric[];
}

/** The PALMS numbers scoring reads. Structurally compatible with a `PalmsMemberRow`. */
export interface ScoringCounts {
  absent: number;
  substitute: number;
  referralsGivenInside: number;
  referralsGivenOutside: number;
  visitors: number;
  oneToOnes: number;
  ceu: number;
}

export const WINDOW_PERIODS = 6;

export const DEFAULT_RULE_NAME = '預設規則（示意，請依分會計分表調整）';

/** What each metric counts, and the unit used in hints. */
export const METRIC_INFO: Record<MetricKey, { label: string; unit: string; source: string; raw: (c: ScoringCounts) => number }> = {
  attendance: { label: '出席', unit: '次缺席', source: '缺席次數（病假與代理人不算缺席）', raw: (c) => c.absent },
  referrals: {
    label: '引薦',
    unit: '筆引薦',
    source: '提供內部引薦＋提供外部引薦',
    raw: (c) => c.referralsGivenInside + c.referralsGivenOutside,
  },
  visitors: { label: '來賓', unit: '位來賓', source: '邀請的來賓人數', raw: (c) => c.visitors },
  oneToOnes: { label: '一對一', unit: '次一對一', source: '一對一會面次數', raw: (c) => c.oneToOnes },
  ceu: { label: '教育 CEU', unit: '個 CEU', source: '分會教育單位', raw: (c) => c.ceu },
};

/**
 * Placeholder rule. The chapter's official table has not been provided, so these tiers
 * only follow the commonly seen "five metrics × 20 points, 70 = green" shape.
 */
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  lights: { green: 70, yellow: 50, red: 30 },
  metrics: [
    {
      key: 'attendance',
      label: '出席',
      max: 20,
      basis: 'total',
      direction: 'lower',
      // Stored easiest → hardest, like every other metric: up to 3 absences still earn something.
      tiers: [
        { threshold: 3, points: 5 },
        { threshold: 2, points: 10 },
        { threshold: 1, points: 15 },
        { threshold: 0, points: 20 },
      ],
    },
    {
      key: 'referrals',
      label: '引薦',
      max: 20,
      basis: 'perWeek',
      direction: 'higher',
      tiers: [
        { threshold: 0.5, points: 5 },
        { threshold: 0.75, points: 10 },
        { threshold: 1, points: 15 },
        { threshold: 1.25, points: 20 },
      ],
    },
    {
      key: 'visitors',
      label: '來賓',
      max: 20,
      basis: 'total',
      direction: 'higher',
      tiers: [
        { threshold: 1, points: 5 },
        { threshold: 2, points: 10 },
        { threshold: 3, points: 15 },
        { threshold: 4, points: 20 },
      ],
    },
    {
      key: 'oneToOnes',
      label: '一對一',
      max: 20,
      basis: 'perWeek',
      direction: 'higher',
      tiers: [
        { threshold: 0.25, points: 5 },
        { threshold: 0.5, points: 10 },
        { threshold: 0.75, points: 15 },
        { threshold: 1, points: 20 },
      ],
    },
    {
      key: 'ceu',
      label: '教育 CEU',
      max: 20,
      basis: 'perWeek',
      direction: 'higher',
      tiers: [
        { threshold: 0.25, points: 5 },
        { threshold: 0.5, points: 10 },
        { threshold: 0.75, points: 15 },
        { threshold: 1, points: 20 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Config reading and validation
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Tiers in the order they are evaluated and shown: easiest first. */
export function sortTiers(tiers: ScoringTier[], direction: MetricDirection) {
  return [...tiers].sort((a, b) => (direction === 'higher' ? a.threshold - b.threshold : b.threshold - a.threshold));
}

/** Reads a stored `ScoringRule.config`. Unknown or broken parts fall back to the default rule. */
export function normalizeScoringConfig(input: unknown): ScoringConfig {
  const source = isRecord(input) ? input : {};
  const lights = isRecord(source.lights) ? source.lights : {};
  const metricsInput = Array.isArray(source.metrics) ? source.metrics : [];

  const metrics = DEFAULT_SCORING_CONFIG.metrics.map((fallback) => {
    const stored = metricsInput.find((item) => isRecord(item) && item.key === fallback.key);
    if (!isRecord(stored)) return { ...fallback, tiers: fallback.tiers.map((tier) => ({ ...tier })) };

    const direction: MetricDirection = stored.direction === 'lower' ? 'lower' : stored.direction === 'higher' ? 'higher' : fallback.direction;
    const basis: MetricBasis = stored.basis === 'perWeek' ? 'perWeek' : stored.basis === 'total' ? 'total' : fallback.basis;
    const tiers = (Array.isArray(stored.tiers) ? stored.tiers : [])
      .filter(isRecord)
      .map((tier) => ({ threshold: finite(tier.threshold, NaN), points: finite(tier.points, NaN) }))
      .filter((tier) => Number.isFinite(tier.threshold) && Number.isFinite(tier.points));

    return {
      key: fallback.key,
      label: typeof stored.label === 'string' && stored.label.trim() ? stored.label.trim() : fallback.label,
      max: Math.max(0, finite(stored.max, fallback.max)),
      basis,
      direction,
      tiers: sortTiers(tiers.length > 0 ? tiers : fallback.tiers, direction),
    };
  });

  return {
    lights: {
      green: finite(lights.green, DEFAULT_SCORING_CONFIG.lights.green),
      yellow: finite(lights.yellow, DEFAULT_SCORING_CONFIG.lights.yellow),
      red: finite(lights.red, DEFAULT_SCORING_CONFIG.lights.red),
    },
    metrics,
  };
}

/** Human-readable problems with a config (zh-TW). Empty when the config can be saved. */
export function validateScoringConfig(config: ScoringConfig): string[] {
  const errors: string[] = [];
  const { green, yellow, red } = config.lights;
  const maxScore = maxScoreOf(config);

  if (!(green > yellow && yellow > red && red >= 0)) {
    errors.push('燈號門檻要由高到低：綠燈 > 黃燈 > 紅燈，而且不能是負數。');
  }
  if (green > maxScore) {
    errors.push(`綠燈門檻 ${green} 分超過五項滿分合計 ${maxScore} 分，沒有人能拿到綠燈。`);
  }

  for (const metric of config.metrics) {
    if (!(metric.max > 0)) errors.push(`「${metric.label}」的滿分要大於 0。`);
    if (metric.tiers.length === 0) {
      errors.push(`「${metric.label}」至少要有一個級距。`);
      continue;
    }
    const sorted = sortTiers(metric.tiers, metric.direction);
    const seen = new Set<number>();
    for (let index = 0; index < sorted.length; index += 1) {
      const tier = sorted[index];
      if (tier.threshold < 0) errors.push(`「${metric.label}」的門檻不能是負數。`);
      if (seen.has(tier.threshold)) errors.push(`「${metric.label}」有重複的門檻 ${tier.threshold}。`);
      seen.add(tier.threshold);
      if (tier.points < 0 || tier.points > metric.max) {
        errors.push(`「${metric.label}」門檻 ${tier.threshold} 的分數要在 0 到 ${metric.max} 之間。`);
      }
      if (index > 0 && tier.points < sorted[index - 1].points) {
        errors.push(
          metric.direction === 'higher'
            ? `「${metric.label}」的門檻越高，分數不能越低（門檻 ${tier.threshold}）。`
            : `「${metric.label}」的門檻越低，分數不能越低（門檻 ${tier.threshold}）。`,
        );
      }
    }
  }

  return [...new Set(errors)];
}

export function maxScoreOf(config: ScoringConfig) {
  return config.metrics.reduce((sum, metric) => sum + metric.max, 0);
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface MetricNextStep {
  /** Points gained by reaching the next tier. */
  gain: number;
  /** Threshold of that tier, in the metric's own basis. */
  threshold: number;
  /** How many more raw units (referrals, visitors…) are needed inside the window. */
  need: number;
}

export interface MetricResult {
  key: MetricKey;
  label: string;
  max: number;
  basis: MetricBasis;
  direction: MetricDirection;
  /** Raw sum over the window. */
  raw: number;
  /** Value compared with the tiers (`raw`, or `raw / weeks`). */
  value: number;
  points: number;
  /** Next better tier for `higher` metrics. `null` when already at the top or when it cannot be improved by doing more. */
  next: MetricNextStep | null;
}

export interface ScoreResult {
  score: number;
  light: Light;
  maxScore: number;
  metrics: MetricResult[];
}

export function lightForScore(lights: ScoringConfig['lights'], score: number): Light {
  if (score >= lights.green) return 'green';
  if (score >= lights.yellow) return 'yellow';
  if (score >= lights.red) return 'red';
  return 'grey';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const EPSILON = 1e-9;

export function scoreMetric(metric: ScoringMetric, raw: number, weeks: number): MetricResult {
  const value = metric.basis === 'perWeek' ? (weeks > 0 ? raw / weeks : 0) : raw;
  const tiers = sortTiers(metric.tiers, metric.direction);

  // Tiers are sorted easiest → hardest, so the last one met is the best one earned.
  let points = 0;
  let reached = -1;
  tiers.forEach((tier, index) => {
    const met = metric.direction === 'higher' ? value + EPSILON >= tier.threshold : value - EPSILON <= tier.threshold;
    if (met) {
      points = tier.points;
      reached = index;
    }
  });
  points = clamp(points, 0, metric.max);

  let next: MetricNextStep | null = null;
  if (metric.direction === 'higher') {
    const upcoming = tiers.slice(reached + 1).find((tier) => clamp(tier.points, 0, metric.max) > points);
    if (upcoming && (metric.basis === 'total' || weeks > 0)) {
      const target = metric.basis === 'perWeek' ? upcoming.threshold * weeks : upcoming.threshold;
      next = {
        gain: clamp(upcoming.points, 0, metric.max) - points,
        threshold: upcoming.threshold,
        need: Math.max(1, Math.ceil(target - raw - EPSILON)),
      };
    }
  }

  return { key: metric.key, label: metric.label, max: metric.max, basis: metric.basis, direction: metric.direction, raw, value, points, next };
}

export function scoreMember(config: ScoringConfig, counts: ScoringCounts, weeks: number): ScoreResult {
  const metrics = config.metrics.map((metric) => scoreMetric(metric, METRIC_INFO[metric.key].raw(counts), weeks));
  const score = Math.round(metrics.reduce((sum, metric) => sum + metric.points, 0) * 10) / 10;
  return { score, light: lightForScore(config.lights, score), maxScore: maxScoreOf(config), metrics };
}

/** The next better light and how many points it is away. `null` when already green. */
export function nextLightTarget(config: ScoringConfig, score: number): { light: Light; need: number } | null {
  const steps: Array<{ light: Light; at: number }> = [
    { light: 'red', at: config.lights.red },
    { light: 'yellow', at: config.lights.yellow },
    { light: 'green', at: config.lights.green },
  ];
  const target = steps.find((step) => score < step.at);
  return target ? { light: target.light, need: Math.round((target.at - score) * 10) / 10 } : null;
}

/** The metric where the fewest extra actions buy the most points. */
export function cheapestImprovement(result: ScoreResult): (MetricResult & { next: MetricNextStep }) | null {
  let best: (MetricResult & { next: MetricNextStep }) | null = null;
  for (const metric of result.metrics) {
    if (!metric.next) continue;
    const candidate = metric as MetricResult & { next: MetricNextStep };
    if (!best) {
      best = candidate;
      continue;
    }
    const ratio = candidate.next.gain / candidate.next.need;
    const bestRatio = best.next.gain / best.next.need;
    if (ratio > bestRatio + EPSILON || (Math.abs(ratio - bestRatio) <= EPSILON && candidate.next.need < best.next.need)) {
      best = candidate;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Rolling window ("近 6 期")
// ---------------------------------------------------------------------------

export interface WindowPeriodInput<Row extends ScoringCounts & { memberId: string } = ScoringCounts & { memberId: string }> {
  id: string;
  meetingCount: number;
  rows: Row[];
}

export interface MemberWindowScore<Row> {
  memberId: string;
  /** The member's row in the period the window ends at. */
  current: Row;
  /** Periods in the window where this member has PALMS data. */
  periodsWithData: number;
  /** Meetings in those periods. Per-week metrics divide by this. */
  weeks: number;
  totals: ScoringCounts;
  result: ScoreResult;
}

export interface WindowScores<Row> {
  /** Periods the window actually covers (1 to `size`). */
  periodsUsed: number;
  size: number;
  /** Meetings in the whole window. */
  weeks: number;
  members: Map<string, MemberWindowScore<Row>>;
  distribution: Record<Light, number>;
}

function emptyScoringCounts(): ScoringCounts {
  return { absent: 0, substitute: 0, referralsGivenInside: 0, referralsGivenOutside: 0, visitors: 0, oneToOnes: 0, ceu: 0 };
}

function addCounts(target: ScoringCounts, row: ScoringCounts) {
  target.absent += row.absent;
  target.substitute += row.substitute;
  target.referralsGivenInside += row.referralsGivenInside;
  target.referralsGivenOutside += row.referralsGivenOutside;
  target.visitors += row.visitors;
  target.oneToOnes += row.oneToOnes;
  target.ceu += row.ceu;
}

/**
 * Scores every member who appears in `periods[endIndex]`, using that period plus up to
 * `size - 1` periods before it. `periods` must be ordered oldest → newest.
 * A member's per-week metrics only count the meetings of periods they have data for,
 * so someone who joined two periods ago is not measured against six.
 */
export function computeWindowScores<Row extends ScoringCounts & { memberId: string }>(
  config: ScoringConfig,
  periods: ReadonlyArray<WindowPeriodInput<Row>>,
  endIndex: number,
  size: number = WINDOW_PERIODS,
): WindowScores<Row> {
  const distribution: Record<Light, number> = { green: 0, yellow: 0, red: 0, grey: 0 };
  const members = new Map<string, MemberWindowScore<Row>>();
  const end = periods[endIndex];
  if (!end) return { periodsUsed: 0, size, weeks: 0, members, distribution };

  const windowPeriods = periods.slice(Math.max(0, endIndex - size + 1), endIndex + 1);
  const weeks = windowPeriods.reduce((sum, period) => sum + Math.max(0, period.meetingCount), 0);

  const accumulators = new Map<string, { current: Row; totals: ScoringCounts; periods: Set<string>; weeks: number }>();
  for (const row of end.rows) {
    if (!accumulators.has(row.memberId)) {
      accumulators.set(row.memberId, { current: row, totals: emptyScoringCounts(), periods: new Set(), weeks: 0 });
    }
  }

  for (const period of windowPeriods) {
    for (const row of period.rows) {
      const accumulator = accumulators.get(row.memberId);
      if (!accumulator) continue;
      addCounts(accumulator.totals, row);
      if (!accumulator.periods.has(period.id)) {
        accumulator.periods.add(period.id);
        accumulator.weeks += Math.max(0, period.meetingCount);
      }
    }
  }

  for (const [memberId, accumulator] of accumulators) {
    const result = scoreMember(config, accumulator.totals, accumulator.weeks);
    distribution[result.light] += 1;
    members.set(memberId, {
      memberId,
      current: accumulator.current,
      periodsWithData: accumulator.periods.size,
      weeks: accumulator.weeks,
      totals: accumulator.totals,
      result,
    });
  }

  return { periodsUsed: windowPeriods.length, size, weeks, members, distribution };
}

/** "0.8" style number for per-week values and half one-to-ones. */
export function formatScoreNumber(value: number, digits = 1) {
  if (!Number.isFinite(value)) return '0';
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}
