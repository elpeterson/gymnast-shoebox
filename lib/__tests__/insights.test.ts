import { describe, it, expect } from 'vitest';
import {
  listDivisions,
  buildDivisionSeries,
  apparatusWithData,
  divisionKey,
  UNSPECIFIED_DIVISION,
  type CompetitionRow,
} from '../insights';

function comp(
  id: string,
  division: string | null,
  start_date: string | null,
  scores: { apparatus: string; value: number | null }[] = []
): CompetitionRow {
  return { id, name: `Meet ${id}`, division, start_date, scores };
}

const MAG = ['floor_exercise', 'pommel_horse', 'vault'];

describe('divisionKey', () => {
  it('normalizes null/blank to Unspecified', () => {
    expect(divisionKey({ division: null })).toBe(UNSPECIFIED_DIVISION);
    expect(divisionKey({ division: '   ' })).toBe(UNSPECIFIED_DIVISION);
  });

  it('trims real division values', () => {
    expect(divisionKey({ division: ' 4D1 ' })).toBe('4D1');
  });
});

describe('listDivisions', () => {
  const competitions: CompetitionRow[] = [
    comp('a', '4D1', '2025-01-10'),
    comp('b', '4D1', '2025-03-10'),
    comp('c', '5D2', '2025-02-10'),
    comp('d', null, '2025-01-01'),
  ];

  it('returns one entry per distinct division with counts', () => {
    const divs = listDivisions(competitions);
    const byName = Object.fromEntries(divs.map((d) => [d.division, d.count]));
    expect(byName).toEqual({ '4D1': 2, '5D2': 1, [UNSPECIFIED_DIVISION]: 1 });
  });

  it('orders divisions most-recent first', () => {
    // 4D1 latest = Mar, 5D2 latest = Feb, Unspecified latest = Jan
    expect(listDivisions(competitions).map((d) => d.division)).toEqual([
      '4D1',
      '5D2',
      UNSPECIFIED_DIVISION,
    ]);
  });

  it('surfaces an Unspecified bucket when a division is missing', () => {
    const divs = listDivisions([comp('x', null, '2025-01-01')]);
    expect(divs).toHaveLength(1);
    expect(divs[0].division).toBe(UNSPECIFIED_DIVISION);
  });
});

describe('buildDivisionSeries', () => {
  const competitions: CompetitionRow[] = [
    comp('a', '4D1', '2025-03-10', [
      { apparatus: 'floor_exercise', value: 9.5 },
      { apparatus: 'vault', value: 9.2 },
    ]),
    comp('b', '4D1', '2025-01-10', [
      { apparatus: 'floor_exercise', value: 9.0 },
      { apparatus: 'vault', value: null }, // not scored
    ]),
    comp('c', '5D2', '2025-02-10', [
      { apparatus: 'floor_exercise', value: 8.0 },
    ]),
  ];

  it('includes only competitions in the requested division', () => {
    const rows = buildDivisionSeries(competitions, '4D1', MAG);
    expect(rows.map((r) => r.competitionId)).toEqual(['b', 'a']); // chronological
    // The 5D2 meet must never appear alongside 4D1 data.
    expect(rows.some((r) => r.competitionId === 'c')).toBe(false);
  });

  it('orders rows oldest-to-newest by date', () => {
    const rows = buildDivisionSeries(competitions, '4D1', MAG);
    expect(rows.map((r) => r.date)).toEqual(['2025-01-10', '2025-03-10']);
  });

  it('maps each requested apparatus to its score, null when absent', () => {
    const rows = buildDivisionSeries(competitions, '4D1', MAG);
    const jan = rows.find((r) => r.competitionId === 'b')!;
    expect(jan.floor_exercise).toBe(9.0);
    expect(jan.vault).toBeNull(); // explicit null score
    expect(jan.pommel_horse).toBeNull(); // apparatus not present at all
  });

  it('never leaks a different division into the series', () => {
    const rows = buildDivisionSeries(competitions, '5D2', MAG);
    expect(rows).toHaveLength(1);
    expect(rows[0].competitionId).toBe('c');
    expect(rows[0].floor_exercise).toBe(8.0);
  });

  it('groups null-division competitions under Unspecified', () => {
    const withNull = [...competitions, comp('d', null, '2025-04-01', [
      { apparatus: 'vault', value: 9.9 },
    ])];
    const rows = buildDivisionSeries(withNull, UNSPECIFIED_DIVISION, MAG);
    expect(rows).toHaveLength(1);
    expect(rows[0].vault).toBe(9.9);
  });

  it('drops non-finite score values', () => {
    const bad = [
      comp('z', '4D1', '2025-01-01', [
        { apparatus: 'floor_exercise', value: NaN as unknown as number },
      ]),
    ];
    expect(buildDivisionSeries(bad, '4D1', MAG)[0].floor_exercise).toBeNull();
  });

  it('tolerates a competition with no scores array', () => {
    const missing = [
      { id: 'q', name: 'Q', division: '4D1', start_date: '2025-01-01' },
    ] as unknown as CompetitionRow[];
    expect(() => buildDivisionSeries(missing, '4D1', MAG)).not.toThrow();
  });
});

describe('apparatusWithData', () => {
  it('returns only apparatus that have at least one numeric score', () => {
    const rows = buildDivisionSeries(
      [
        comp('a', '4D1', '2025-01-10', [
          { apparatus: 'floor_exercise', value: 9.0 },
          { apparatus: 'vault', value: null },
        ]),
      ],
      '4D1',
      MAG
    );
    expect(apparatusWithData(rows, MAG)).toEqual(['floor_exercise']);
  });
});
