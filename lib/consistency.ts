// Individual Consistency analytics.
//
// Pure, dependency-free math over a gymnast's own scores. Given the apparatus
// scores a gymnast has posted across their competitions, we describe how tight
// their band is on each apparatus: the mean level, the spread, and a single
// normalized "consistency" read that is comparable across apparatus.
//
// Everything here is deterministic and unit-tested; the UI only renders what
// these functions return.

export type ScoreItem = {
  apparatus: string;
  value: number | null;
  start_value?: number | null;
  place?: number | null;
};

export type CompetitionWithScores = {
  id: string;
  name: string;
  start_date: string | null;
  scores: ScoreItem[];
};

export type ConsistencyPoint = {
  competitionId: string;
  competitionName: string;
  date: string | null;
  value: number;
};

export type ApparatusConsistency = {
  apparatus: string;
  points: ConsistencyPoint[];
  count: number;
  mean: number;
  stdDev: number;
  /** Coefficient of variation (stdDev / mean); 0 when mean <= 0. Lower is steadier. */
  cv: number;
  min: number;
  max: number;
  range: number;
  best: number;
  /** Fraction (0..1) of meets scoring within HIT_THRESHOLD of the season best. */
  hitRate: number;
  /**
   * 0..100 display score derived from the coefficient of variation. Higher is
   * more consistent. `null` when there are fewer than two data points, since a
   * single score tells us nothing about spread.
   */
  consistencyScore: number | null;
};

/** Within this margin of the season best, a routine counts as a "hit". */
export const HIT_THRESHOLD = 0.5;

/**
 * CV at or above which the display consistency score bottoms out at 0. A CV of
 * 0.05 (5% relative spread) is already quite inconsistent for a single
 * apparatus, so it anchors the low end of the 0..100 scale.
 */
export const CV_REFERENCE = 0.05;

/** Minimum data points before spread-based measures are meaningful. */
export const MIN_POINTS_FOR_SCORE = 2;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function round(n: number, dp = 3): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/**
 * Order points oldest-to-newest so a chart reads left-to-right in time. Points
 * with a missing date sort to the end while preserving their relative order.
 */
function byDateAscending(a: ConsistencyPoint, b: ConsistencyPoint): number {
  if (a.date === b.date) return 0;
  if (a.date === null) return 1;
  if (b.date === null) return -1;
  return a.date < b.date ? -1 : 1;
}

/**
 * Compute the consistency profile for one apparatus from an already-collected
 * list of scored points.
 */
export function summarizeApparatus(
  apparatus: string,
  rawPoints: ConsistencyPoint[]
): ApparatusConsistency {
  const points = [...rawPoints].sort(byDateAscending);
  const values = points.map((p) => p.value);
  const count = values.length;

  if (count === 0) {
    return {
      apparatus,
      points,
      count: 0,
      mean: 0,
      stdDev: 0,
      cv: 0,
      min: 0,
      max: 0,
      range: 0,
      best: 0,
      hitRate: 0,
      consistencyScore: null,
    };
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / count;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / count; // population
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const best = max;
  const hits = values.filter((v) => v >= best - HIT_THRESHOLD).length;
  const hitRate = hits / count;

  const consistencyScore =
    count < MIN_POINTS_FOR_SCORE
      ? null
      : round(clamp(100 * (1 - cv / CV_REFERENCE), 0, 100), 1);

  return {
    apparatus,
    points,
    count,
    mean: round(mean),
    stdDev: round(stdDev),
    cv: round(cv, 5),
    min: round(min),
    max: round(max),
    range: round(max - min),
    best: round(best),
    hitRate: round(hitRate, 3),
    consistencyScore,
  };
}

/**
 * Build a consistency profile for every apparatus in `apparatusIds` from a
 * gymnast's competitions. Only real, entered scores are counted; competitions
 * missing a value for an apparatus are simply skipped for that apparatus.
 *
 * Apparatus are returned in the order given, so callers control the layout
 * (e.g. Olympic order per discipline).
 */
export function computeConsistency(
  competitions: CompetitionWithScores[],
  apparatusIds: string[]
): ApparatusConsistency[] {
  const pointsByApparatus = new Map<string, ConsistencyPoint[]>();
  for (const id of apparatusIds) pointsByApparatus.set(id, []);

  for (const comp of competitions) {
    for (const score of comp.scores ?? []) {
      const bucket = pointsByApparatus.get(score.apparatus);
      if (!bucket) continue; // apparatus not requested for this discipline
      if (score.value === null || score.value === undefined) continue;
      if (!Number.isFinite(score.value)) continue;
      bucket.push({
        competitionId: comp.id,
        competitionName: comp.name,
        date: comp.start_date,
        value: score.value,
      });
    }
  }

  return apparatusIds.map((id) =>
    summarizeApparatus(id, pointsByApparatus.get(id) ?? [])
  );
}

/**
 * A short, human label for a consistency score, for use in the UI. Returns null
 * when there is no score yet (too few data points).
 */
export function consistencyLabel(score: number | null): string | null {
  if (score === null) return null;
  if (score >= 80) return 'Rock steady';
  if (score >= 60) return 'Consistent';
  if (score >= 40) return 'Variable';
  return 'Streaky';
}
