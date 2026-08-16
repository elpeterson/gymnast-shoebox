import { describe, it, expect } from 'vitest';
import {
  summarizeApparatus,
  computeConsistency,
  consistencyLabel,
  CV_REFERENCE,
  HIT_THRESHOLD,
  type CompetitionWithScores,
  type ConsistencyPoint,
} from '../consistency';

function point(
  value: number,
  date: string | null = null,
  id = 'c'
): ConsistencyPoint {
  return {
    competitionId: id,
    competitionName: id,
    date,
    value,
  };
}

describe('summarizeApparatus', () => {
  it('returns an empty, unscored profile when there are no points', () => {
    const r = summarizeApparatus('vault', []);
    expect(r.count).toBe(0);
    expect(r.mean).toBe(0);
    expect(r.consistencyScore).toBeNull();
  });

  it('computes mean, population std dev, and range', () => {
    // values 9.0, 9.5, 10.0 -> mean 9.5, population variance ~0.16667
    const r = summarizeApparatus('vault', [
      point(9.0),
      point(9.5),
      point(10.0),
    ]);
    expect(r.count).toBe(3);
    expect(r.mean).toBeCloseTo(9.5, 3);
    expect(r.stdDev).toBeCloseTo(0.408, 2);
    expect(r.min).toBe(9.0);
    expect(r.max).toBe(10.0);
    expect(r.range).toBe(1.0);
    expect(r.best).toBe(10.0);
  });

  it('leaves the consistency score null with a single data point', () => {
    const r = summarizeApparatus('beam', [point(9.4)]);
    expect(r.count).toBe(1);
    expect(r.consistencyScore).toBeNull();
    expect(r.stdDev).toBe(0);
  });

  it('gives a perfect 100 when every score is identical', () => {
    const r = summarizeApparatus('floor', [
      point(9.5),
      point(9.5),
      point(9.5),
    ]);
    expect(r.cv).toBe(0);
    expect(r.consistencyScore).toBe(100);
  });

  it('bottoms the score out at 0 at or beyond the reference CV', () => {
    // Construct values whose CV >= CV_REFERENCE around a mean of 10.
    const spread = 10 * CV_REFERENCE * 2; // CV ~= 2x reference -> clamps to 0
    const r = summarizeApparatus('bars', [
      point(10 - spread),
      point(10 + spread),
    ]);
    expect(r.cv).toBeGreaterThanOrEqual(CV_REFERENCE);
    expect(r.consistencyScore).toBe(0);
  });

  it('scores steadier data higher than streaky data', () => {
    const steady = summarizeApparatus('vault', [
      point(9.6),
      point(9.65),
      point(9.55),
    ]);
    const streaky = summarizeApparatus('vault', [
      point(8.5),
      point(9.8),
      point(9.0),
    ]);
    expect(steady.consistencyScore!).toBeGreaterThan(
      streaky.consistencyScore!
    );
  });

  it('computes hit rate against the season best within the threshold', () => {
    const best = 9.9;
    const r = summarizeApparatus('floor', [
      point(best),
      point(best - HIT_THRESHOLD + 0.01), // a hit
      point(best - HIT_THRESHOLD - 0.5), // a miss
    ]);
    expect(r.best).toBe(best);
    expect(r.hitRate).toBeCloseTo(2 / 3, 3);
  });

  it('orders points oldest-to-newest, dated before undated', () => {
    const r = summarizeApparatus('beam', [
      point(9.1, '2025-03-01', 'mar'),
      point(9.2, null, 'undated'),
      point(9.0, '2025-01-01', 'jan'),
    ]);
    expect(r.points.map((p) => p.competitionId)).toEqual([
      'jan',
      'mar',
      'undated',
    ]);
  });
});

describe('computeConsistency', () => {
  const competitions: CompetitionWithScores[] = [
    {
      id: 'c1',
      name: 'Meet 1',
      start_date: '2025-01-10',
      scores: [
        { apparatus: 'vault', value: 9.4 },
        { apparatus: 'high_bar', value: 8.9 },
      ],
    },
    {
      id: 'c2',
      name: 'Meet 2',
      start_date: '2025-02-10',
      scores: [
        { apparatus: 'vault', value: 9.6 },
        { apparatus: 'high_bar', value: null }, // not scored -> skipped
      ],
    },
    {
      id: 'c3',
      name: 'Meet 3',
      start_date: '2025-03-10',
      scores: [
        { apparatus: 'vault', value: 9.5 },
        { apparatus: 'pommel_horse', value: 9.0 },
      ],
    },
  ];

  it('returns one entry per requested apparatus, in order', () => {
    const ids = ['vault', 'high_bar', 'pommel_horse'];
    const result = computeConsistency(competitions, ids);
    expect(result.map((r) => r.apparatus)).toEqual(ids);
  });

  it('collects only entered scores for each apparatus', () => {
    const [vault, highBar, pommel] = computeConsistency(competitions, [
      'vault',
      'high_bar',
      'pommel_horse',
    ]);
    expect(vault.count).toBe(3);
    expect(highBar.count).toBe(1); // the null was skipped
    expect(pommel.count).toBe(1);
  });

  it('ignores apparatus that were not requested', () => {
    const result = computeConsistency(competitions, ['vault']);
    expect(result).toHaveLength(1);
    expect(result[0].apparatus).toBe('vault');
  });

  it('skips non-finite score values defensively', () => {
    const bad: CompetitionWithScores[] = [
      {
        id: 'x',
        name: 'X',
        start_date: '2025-01-01',
        scores: [{ apparatus: 'vault', value: NaN as unknown as number }],
      },
    ];
    expect(computeConsistency(bad, ['vault'])[0].count).toBe(0);
  });

  it('tolerates a competition with no scores array', () => {
    const missing = [
      { id: 'z', name: 'Z', start_date: null, scores: undefined },
    ] as unknown as CompetitionWithScores[];
    expect(() => computeConsistency(missing, ['vault'])).not.toThrow();
  });
});

describe('consistencyLabel', () => {
  it('returns null when there is no score', () => {
    expect(consistencyLabel(null)).toBeNull();
  });

  it('maps score bands to labels', () => {
    expect(consistencyLabel(95)).toBe('Rock steady');
    expect(consistencyLabel(65)).toBe('Consistent');
    expect(consistencyLabel(45)).toBe('Variable');
    expect(consistencyLabel(10)).toBe('Streaky');
  });
});
