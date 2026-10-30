// Decode Between Ends arrow strings.
//
// Each entry's arrows arrive as one string, one character per arrow, in
// round -> end order: "T98M75..." Arrows within an end are sorted, as on the
// PDF, so nothing here treats position within an end as shooting order.
// Characters past rounds x ends x arrows are shoot-off arrows.
//
// The character table mirrors `arrow_value_list` in betweenends.com's
// scoring.js. Score Quiver's own arrows are 'X' | '10'..'1' | 'M'; anything
// else (3-D 11/12/14, NFAA-style Xs worth 5 or 6) marks the entry non-standard
// so callers can keep it out of like-for-like stats.

import type { Arrow } from '@/lib/stats';

/** Not shot yet: the API pads unshot arrows with 'E'. */
export const NOT_SHOT = 'E';

const POINTS: Record<string, number> = {
  M: 0,
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  X: 10,
  W: 5,
  Y: 11,
  Z: 6,
  a: 11,
  b: 12,
  d: 14,
  E: 0,
  '!': 0,
};

const STANDARD = new Set(['M', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'X']);

/** Points for one arrow character, or null for a character the site doesn't know. */
export function arrowPoints(c: string): number | null {
  return c in POINTS ? POINTS[c] : null;
}

/** One arrow character as a Score Quiver arrow ('X', '10'..'1', 'M'). */
export function toArrow(c: string): Arrow {
  if (c === 'T') return '10';
  if (c === 'M' || c === '0' || c === '!') return 'M';
  if (c === 'X') return 'X';
  return String(POINTS[c] ?? 0);
}

export type Layout = {
  /** Rounds, ends per round, arrows per end (the event's rds / epr / ape). */
  rounds: number;
  endsPerRound: number;
  arrowsPerEnd: number;
};

export type DecodedRound = {
  round_number: number;
  total: number;
  /** True when every end of the round was shot. */
  complete: boolean;
  /** Ends with at least one arrow shot; unshot arrows are dropped. */
  ends: { end_number: number; arrows: Arrow[] }[];
};

export type DecodedArrows = {
  rounds: DecodedRound[];
  /** Sum of the round totals (overrides applied). Excludes shoot-off arrows. */
  total: number;
  shootOff: Arrow[];
  arrowsShot: number;
  scheduledArrows: number;
  complete: boolean;
  /** Every arrow fits Score Quiver's X/10..1/M scale. */
  standard: boolean;
  /** Characters outside the site's table (should never happen; worth logging). */
  unknown: string[];
};

/**
 * Split an arrow string into rounds and ends. `roundTotals` is the entry's
 * `rtl` ('|'-separated): a non-empty value replaces that round's arrow sum,
 * matching how betweenends.com ranks.
 */
export function decodeArrows(
  arrows: string | null | undefined,
  layout: Layout,
  roundTotals = '',
): DecodedArrows {
  const s = arrows ?? '';
  const perRound = layout.endsPerRound * layout.arrowsPerEnd;
  const scheduledArrows = layout.rounds * perRound;
  const overrides = roundTotals.split('|');
  const unknown = [...new Set([...s].filter((c) => arrowPoints(c) === null))];
  let standard = true;
  let arrowsShot = 0;

  const rounds: DecodedRound[] = [];
  for (let r = 0; r < layout.rounds; r++) {
    const ends: DecodedRound['ends'] = [];
    let sum = 0;
    let complete = true;
    for (let e = 0; e < layout.endsPerRound; e++) {
      const start = r * perRound + e * layout.arrowsPerEnd;
      const chars = [...s.slice(start, start + layout.arrowsPerEnd)];
      const shot = chars.filter((c) => c !== NOT_SHOT);
      if (shot.length < layout.arrowsPerEnd) complete = false;
      if (shot.length === 0) continue;
      for (const c of shot) {
        if (!STANDARD.has(c)) standard = false;
        sum += arrowPoints(c) ?? 0;
      }
      arrowsShot += shot.length;
      ends.push({ end_number: e + 1, arrows: shot.map(toArrow) });
    }
    const override = overrides[r]?.trim();
    const total = override && /^\d+$/.test(override) ? Number(override) : sum;
    rounds.push({ round_number: r + 1, total, complete, ends });
  }

  const shootOff = [...s.slice(scheduledArrows)].filter((c) => c !== NOT_SHOT).map(toArrow);
  return {
    rounds,
    total: rounds.reduce((acc, r) => acc + r.total, 0),
    shootOff,
    arrowsShot,
    scheduledArrows,
    complete: rounds.every((r) => r.complete),
    standard,
    unknown,
  };
}
