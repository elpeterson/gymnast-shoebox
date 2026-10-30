import { describe, expect, it } from 'vitest';
import {
  archerIdFromParam,
  archerResults,
  toEventRow,
  type ArcherStore,
  type StoredEntry,
} from '@/lib/betweenends/store';

// Synthetic store; names and numbers are made up.
function entry(eventId: number, overrides: Partial<StoredEntry> = {}): StoredEntry {
  return {
    event_id: eventId,
    aid: 1,
    alt_raw: '123456',
    alt_norm: '123456',
    first_name: 'Alex',
    last_name: 'Sample',
    team: 'Example Archers',
    division_code: 'RU13W',
    division_name: 'Recurve U13 Women',
    targets: ['5B'],
    session_labels: [],
    arrows: 'T98T97987M76',
    round_totals: '',
    division_peers: [
      { aid: 1, arrows: 'T98T97987M76', round_totals: '' },
      { aid: 2, arrows: 'TTTTTTTTTTTT', round_totals: '' },
      { aid: 3, arrows: '111111111111', round_totals: '' },
    ],
    ...overrides,
  };
}

const store: ArcherStore = {
  archer_id: '123456',
  built_at: '2026-10-29T00:00:00Z',
  tournaments: {
    '1': { id: 1, name: 'Fall Shoot', location: 'X', start_date: '2026-10-23', end_date: '2026-10-25', updated_at: '' },
    '2': { id: 2, name: 'Spring Shoot', location: 'Y', start_date: '2026-04-04', end_date: '2026-04-04', updated_at: '' },
    '3': { id: 3, name: 'Field Day', location: 'Z', start_date: '2026-06-01', end_date: '2026-06-01', updated_at: '' },
  },
  events: {
    '10': { id: 10, tournament_id: 1, type: 'RankingEvent', name: 'Ranking Round', rounds: 2, ends_per_round: 2, arrows_per_end: 3, scoring_rule: 0 },
    '20': { id: 20, tournament_id: 2, type: 'RankingEvent', name: 'Ranking Round', rounds: 2, ends_per_round: 2, arrows_per_end: 3, scoring_rule: 0 },
    '30': { id: 30, tournament_id: 3, type: 'RankingEvent', name: 'Field', rounds: 2, ends_per_round: 2, arrows_per_end: 3, scoring_rule: 3 },
  },
  entries: [
    entry(20, { arrows: null, division_peers: null }),
    entry(10, { session_labels: ['Range, Saturday 9am'] }),
    entry(30, { arrows: '654321654321' }),
    entry(99),
  ],
  match_rows: [],
};

describe('archerIdFromParam', () => {
  it.each([
    ['123456', '123456'],
    ['%20123456C', '123456'],
    ['abc', null],
    ['%E0%A4%A', null],
    ['12345678901', null],
  ])('%j -> %j', (param, expected) => {
    expect(archerIdFromParam(param)).toBe(expected);
  });
});

describe('archerResults', () => {
  const results = archerResults(store);

  it('skips entries whose event is missing and sorts newest first', () => {
    expect(results.map((r) => r.event.id)).toEqual([10, 30, 20]);
  });

  it('resolves the day shot from the session label', () => {
    expect(results[0].shotOn).toBe('2026-10-24');
  });

  it('ranks within the division, ties sharing a place', () => {
    expect(results[0].rank).toEqual({ place: 2, of: 3 });
  });

  it('marks only complete 10-ring rounds comparable', () => {
    expect(results.map((r) => r.comparable)).toEqual([true, false, false]);
  });

  it('keeps results whose arrows were not stored', () => {
    expect(results[2]).toMatchObject({ decoded: null, rank: null });
  });
});

describe('toEventRow', () => {
  it('guesses the setup from the division and layout', () => {
    const row = toEventRow(archerResults(store)[0]);
    expect(row).toMatchObject({
      id: 'be-10-1',
      shot_on: '2026-10-24',
      bow_style: 'recurve',
      environment: 'indoor',
      distance_m: null,
      arrows_per_end: 3,
    });
    expect(row.rounds.map((r) => r.total)).toEqual([53, 37]);
  });
});
