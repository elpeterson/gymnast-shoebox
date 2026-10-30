// Scoring analytics.
//
// Pure transforms over an event's arrows. The load-bearing rule (the archery
// twin of Gymnast Shoebox's Level/Division rule): raw scores are only
// comparable within one *setup* -- the same bow style, indoor/outdoor, distance
// and face. Everything that trends over time groups by `setupKey` first.
//
// Note that Between Ends lists each end's arrows sorted by value, not in the
// order they were shot, so nothing here looks at arrow position within an end.

import { bowStyleLabel } from './division';

export type Arrow = string; // 'X' | '10' .. '1' | 'M'

export type EventRow = {
  id: string;
  name: string;
  shot_on: string | null;
  start_date: string | null;
  bow_style: string | null;
  environment: string | null;
  distance_m: number | null;
  face_cm: number | null;
  arrows_per_end: number;
  rounds: {
    round_number: number;
    total: number;
    ends: { end_number: number; arrows: Arrow[] }[];
  }[];
};

export const ARROW_ORDER: Arrow[] = ['X', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'M'];

export function arrowValue(a: Arrow): number {
  if (a === 'X') return 10;
  if (a === 'M') return 0;
  return Number(a) || 0;
}

export type EventStats = {
  total: number;
  maxScore: number;
  arrowCount: number;
  /** Average points per arrow (0-10): the comparable-across-lengths number. */
  arrowAverage: number;
  /** Score as a fraction of the maximum possible (0-1). */
  percentOfMax: number;
  misses: number;
  hitRate: number;
  xs: number;
  /** 10s including Xs (World Archery convention). */
  tens: number;
  nines: number;
  endAverage: number;
  /** Standard deviation of end scores; lower is steadier. */
  endStdDev: number;
  bestEnd: number;
  worstEnd: number;
  roundTotals: number[];
  distribution: Record<Arrow, number>;
};

export function eventDate(e: Pick<EventRow, 'shot_on' | 'start_date'>): string | null {
  return e.shot_on ?? e.start_date;
}

export function computeEventStats(event: EventRow): EventStats {
  const rounds = [...event.rounds].sort((a, b) => a.round_number - b.round_number);
  const ends = rounds.flatMap((r) =>
    [...r.ends].sort((a, b) => a.end_number - b.end_number),
  );
  const arrows = ends.flatMap((e) => e.arrows);
  const endScores = ends.map((e) => e.arrows.reduce((s, a) => s + arrowValue(a), 0));

  const distribution = Object.fromEntries(ARROW_ORDER.map((a) => [a, 0])) as Record<
    Arrow,
    number
  >;
  for (const a of arrows) distribution[a] = (distribution[a] ?? 0) + 1;

  const total = endScores.reduce((s, v) => s + v, 0);
  const arrowCount = arrows.length;
  const maxScore = arrowCount * 10;
  const endAverage = endScores.length ? total / endScores.length : 0;
  const variance = endScores.length
    ? endScores.reduce((s, v) => s + (v - endAverage) ** 2, 0) / endScores.length
    : 0;

  return {
    total,
    maxScore,
    arrowCount,
    arrowAverage: arrowCount ? total / arrowCount : 0,
    percentOfMax: maxScore ? total / maxScore : 0,
    misses: distribution.M,
    hitRate: arrowCount ? (arrowCount - distribution.M) / arrowCount : 0,
    xs: distribution.X,
    tens: distribution.X + distribution['10'],
    nines: distribution['9'],
    endAverage,
    endStdDev: Math.sqrt(variance),
    bestEnd: endScores.length ? Math.max(...endScores) : 0,
    worstEnd: endScores.length ? Math.min(...endScores) : 0,
    roundTotals: rounds.map((r) =>
      r.ends.reduce((s, e) => s + e.arrows.reduce((t, a) => t + arrowValue(a), 0), 0),
    ),
    distribution,
  };
}

/** Identity of a comparable group: bow style + indoor/outdoor + distance + face. */
export function setupKey(e: Pick<EventRow, 'bow_style' | 'environment' | 'distance_m' | 'face_cm'>): string {
  return [e.bow_style ?? '?', e.environment ?? '?', e.distance_m ?? '?', e.face_cm ?? '?'].join('|');
}

export function setupLabel(
  e: Pick<EventRow, 'bow_style' | 'environment' | 'distance_m' | 'face_cm'>,
): string {
  const where = e.environment === 'indoor' ? 'Indoor' : e.environment === 'outdoor' ? 'Outdoor' : '';
  const dist = e.distance_m != null ? `${Number(e.distance_m)}m` : 'distance?';
  const face = e.face_cm != null ? `${e.face_cm}cm` : 'face?';
  return `${bowStyleLabel(e.bow_style)} · ${where} ${dist} · ${face}`.replace(/\s+/g, ' ');
}

export type SetupGroup = { key: string; label: string; count: number; latest: string | null };

/** Setups the archer has shot, most recently used first. */
export function setupGroups(events: EventRow[]): SetupGroup[] {
  const groups = new Map<string, SetupGroup>();
  for (const e of events) {
    const key = setupKey(e);
    const date = eventDate(e);
    const g = groups.get(key) ?? { key, label: setupLabel(e), count: 0, latest: null };
    g.count += 1;
    if (date && (!g.latest || date > g.latest)) g.latest = date;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => (b.latest ?? '').localeCompare(a.latest ?? ''));
}

export type TrendPoint = {
  eventId: string;
  name: string;
  date: string | null;
  total: number;
  maxScore: number;
  arrowAverage: number;
  percentOfMax: number;
  hitRate: number;
  endStdDev: number;
  /** True when this event set a new best arrow average for its setup. */
  personalBest: boolean;
  roundTotals: number[];
  rings: RingShares;
};

export const RINGS = ['gold', 'red', 'blue', 'black', 'white', 'miss'] as const;
export type Ring = (typeof RINGS)[number];
export type RingShares = Record<Ring, number>;

const RING_OF: Record<Arrow, Ring> = {
  X: 'gold', '10': 'gold', '9': 'gold',
  '8': 'red', '7': 'red',
  '6': 'blue', '5': 'blue',
  '4': 'black', '3': 'black',
  '2': 'white', '1': 'white',
  M: 'miss',
};

/** Fraction of arrows landing in each target color (sums to 1). */
export function ringShares(distribution: Record<Arrow, number>): RingShares {
  const shares = Object.fromEntries(RINGS.map((r) => [r, 0])) as RingShares;
  let total = 0;
  for (const [value, count] of Object.entries(distribution)) {
    const ring = RING_OF[value];
    if (!ring) continue;
    shares[ring] += count;
    total += count;
  }
  if (total) for (const r of RINGS) shares[r] /= total;
  return shares;
}

/** Chronological trend for one setup, with personal bests flagged as they happened. */
export function trendForSetup(events: EventRow[], key: string): TrendPoint[] {
  const inSetup = events
    .filter((e) => setupKey(e) === key)
    .sort((a, b) => (eventDate(a) ?? '').localeCompare(eventDate(b) ?? ''));

  let best = -Infinity;
  return inSetup.map((e) => {
    const s = computeEventStats(e);
    const personalBest = s.arrowAverage > best;
    if (personalBest) best = s.arrowAverage;
    return {
      eventId: e.id,
      name: e.name,
      date: eventDate(e),
      total: s.total,
      maxScore: s.maxScore,
      arrowAverage: s.arrowAverage,
      percentOfMax: s.percentOfMax,
      hitRate: s.hitRate,
      endStdDev: s.endStdDev,
      personalBest,
      roundTotals: s.roundTotals,
      rings: ringShares(s.distribution),
    };
  });
}
