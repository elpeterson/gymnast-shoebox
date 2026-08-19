import { describe, it, expect } from 'vitest';
import {
  listLevels,
  listDivisions,
  levelHasDivisions,
  buildSeries,
  apparatusWithData,
  levelKey,
  divisionKey,
  UNSPECIFIED_LEVEL,
  NO_DIVISION,
  type CompetitionRow,
} from '../insights';

function comp(
  id: string,
  level: string | null,
  division: string | null,
  start_date: string | null,
  scores: { apparatus: string; value: number | null }[] = []
): CompetitionRow {
  return { id, name: `Meet ${id}`, level, division, start_date, scores };
}

const MAG = ['floor_exercise', 'pommel_horse', 'vault'];

describe('key normalization', () => {
  it('maps blank level to Unspecified and blank division to No division', () => {
    expect(levelKey({ level: null })).toBe(UNSPECIFIED_LEVEL);
    expect(levelKey({ level: '  ' })).toBe(UNSPECIFIED_LEVEL);
    expect(divisionKey({ division: null })).toBe(NO_DIVISION);
    expect(divisionKey({ division: ' ' })).toBe(NO_DIVISION);
  });

  it('trims real values', () => {
    expect(levelKey({ level: ' 4 ' })).toBe('4');
    expect(divisionKey({ division: ' 1 ' })).toBe('1');
  });
});

describe('listLevels', () => {
  const competitions = [
    comp('a', '4', '1', '2025-01-10'),
    comp('b', '4', '2', '2025-03-10'),
    comp('c', '5', null, '2025-02-10'),
    comp('d', null, null, '2025-01-01'),
  ];

  it('returns distinct levels with counts', () => {
    const byName = Object.fromEntries(
      listLevels(competitions).map((l) => [l.value, l.count])
    );
    expect(byName).toEqual({ '4': 2, '5': 1, [UNSPECIFIED_LEVEL]: 1 });
  });

  it('orders levels most-recent first', () => {
    // level 4 latest = Mar, level 5 = Feb, Unspecified = Jan
    expect(listLevels(competitions).map((l) => l.value)).toEqual([
      '4',
      '5',
      UNSPECIFIED_LEVEL,
    ]);
  });
});

describe('listDivisions + levelHasDivisions', () => {
  const competitions = [
    comp('a', '4', '1', '2025-01-10'),
    comp('b', '4', '2', '2025-03-10'),
    comp('c', '5', null, '2025-02-10'),
    comp('e', '6', null, '2025-02-10'),
    comp('f', '6', '1', '2025-04-10'),
  ];

  it('lists only the divisions within the requested level', () => {
    expect(listDivisions(competitions, '4').map((d) => d.value)).toEqual([
      '2',
      '1',
    ]); // most-recent first (Mar before Jan)
  });

  it('reports a level with real divisions', () => {
    expect(levelHasDivisions(listDivisions(competitions, '4'))).toBe(true);
  });

  it('reports a level with no divisions', () => {
    const divs = listDivisions(competitions, '5');
    expect(divs.map((d) => d.value)).toEqual([NO_DIVISION]);
    expect(levelHasDivisions(divs)).toBe(false);
  });

  it('treats a level with mixed division/no-division as having divisions', () => {
    const divs = listDivisions(competitions, '6');
    expect(new Set(divs.map((d) => d.value))).toEqual(
      new Set(['1', NO_DIVISION])
    );
    expect(levelHasDivisions(divs)).toBe(true);
  });
});

describe('buildSeries', () => {
  const competitions = [
    comp('a', '4', '1', '2025-03-10', [
      { apparatus: 'floor_exercise', value: 9.5 },
      { apparatus: 'vault', value: 9.2 },
    ]),
    comp('b', '4', '1', '2025-01-10', [
      { apparatus: 'floor_exercise', value: 9.0 },
      { apparatus: 'vault', value: null },
    ]),
    comp('c', '4', '2', '2025-02-10', [
      { apparatus: 'floor_exercise', value: 8.5 },
    ]),
    comp('d', '5', null, '2025-02-15', [
      { apparatus: 'floor_exercise', value: 8.0 },
    ]),
  ];

  it('never mixes divisions within a level', () => {
    const rows = buildSeries(competitions, '4', '1', MAG);
    expect(rows.map((r) => r.competitionId)).toEqual(['b', 'a']); // chronological
    expect(rows.some((r) => r.competitionId === 'c')).toBe(false); // div 2 excluded
  });

  it('never mixes levels', () => {
    const rows = buildSeries(competitions, '4', '1', MAG);
    expect(rows.some((r) => r.competitionId === 'd')).toBe(false); // level 5 excluded
  });

  it('includes the whole level when division is null', () => {
    const rows = buildSeries(competitions, '4', null, MAG);
    // all three level-4 meets, both divisions, chronological
    expect(rows.map((r) => r.competitionId)).toEqual(['b', 'c', 'a']);
  });

  it('maps apparatus scores, null when absent', () => {
    const jan = buildSeries(competitions, '4', '1', MAG).find(
      (r) => r.competitionId === 'b'
    )!;
    expect(jan.floor_exercise).toBe(9.0);
    expect(jan.vault).toBeNull();
    expect(jan.pommel_horse).toBeNull();
  });

  it('drops non-finite values and tolerates missing scores array', () => {
    const bad = [
      comp('z', '4', '1', '2025-01-01', [
        { apparatus: 'floor_exercise', value: NaN as unknown as number },
      ]),
      { id: 'q', name: 'Q', level: '4', division: '1', start_date: null },
    ] as unknown as CompetitionRow[];
    expect(() => buildSeries(bad, '4', '1', MAG)).not.toThrow();
    expect(buildSeries(bad, '4', '1', MAG)[0].floor_exercise).toBeNull();
  });
});

describe('apparatusWithData', () => {
  it('returns only apparatus with at least one numeric score', () => {
    const rows = buildSeries(
      [
        comp('a', '4', '1', '2025-01-10', [
          { apparatus: 'floor_exercise', value: 9.0 },
          { apparatus: 'vault', value: null },
        ]),
      ],
      '4',
      '1',
      MAG
    );
    expect(apparatusWithData(rows, MAG)).toEqual(['floor_exercise']);
  });
});
