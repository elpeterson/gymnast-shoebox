import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  extractRows,
  parseGymnastMeets,
  parseMeetResult,
  ARTM_SLOTS,
} from '../mso-api';

function fixture(name: string) {
  return JSON.parse(
    readFileSync(join(__dirname, 'fixtures', name), 'utf-8')
  );
}

const gymnastEnvelope = fixture('lookup_gymnast.json');
const scoresEnvelope = fixture('lookup_scores2.json');

describe('extractRows', () => {
  it('pulls the first result set rows from a real envelope', () => {
    const rows = extractRows(gymnastEnvelope);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty('meetid');
  });

  it('returns [] when there are no results', () => {
    expect(extractRows({ results: [] })).toEqual([]);
    expect(extractRows({})).toEqual([]);
  });

  it('returns [] for a null result set', () => {
    expect(extractRows({ results: [{ result: null }] })).toEqual([]);
  });

  it('throws on an error envelope', () => {
    expect(() => extractRows({ error: 'boom' })).toThrow(/MSO error/);
    expect(() =>
      extractRows({ results: [{ error: 'bad', result: null }] })
    ).toThrow(/query error/);
  });
});

describe('parseGymnastMeets', () => {
  it('captures level and division per meet — the fields the scrape drops', () => {
    const meets = parseGymnastMeets(extractRows(gymnastEnvelope));
    expect(meets.length).toBeGreaterThan(0);
    const first = meets[0];
    expect(first.meetId).toBeTruthy();
    expect(first.level).toBe('J6');
    expect(first.division).toBe('Junior 16');
  });

  it('de-duplicates repeated meet ids', () => {
    const rows = [
      { meetid: '10', meetname: 'A', level: 'J6', div: 'Junior 16' },
      { meetid: '10', meetname: 'A', level: 'J6', div: 'Junior 16' },
      { meetid: '11', meetname: 'B', level: 'J7', div: 'Junior 17' },
    ];
    expect(parseGymnastMeets(rows).map((m) => m.meetId)).toEqual(['10', '11']);
  });

  it('normalizes blank level/division to null', () => {
    const meets = parseGymnastMeets([
      { meetid: '1', meetname: 'X', level: '  ', div: '' },
    ]);
    expect(meets[0].level).toBeNull();
    expect(meets[0].division).toBeNull();
  });
});

describe('parseMeetResult', () => {
  it('maps ARTM numbered slots to apparatus in Olympic order', () => {
    // The scored fixture row is gymnastid 1001.
    const result = parseMeetResult(extractRows(scoresEnvelope), '1001');
    expect(result).not.toBeNull();
    expect(result!.isMens).toBe(true);
    expect(result!.level).toBe('J6');
    expect(result!.division).toBe('Junior 16');

    const byApp = Object.fromEntries(
      result!.scores.map((s) => [s.apparatus, s.value])
    );
    // Every mapped apparatus is a real men's event id.
    for (const s of result!.scores) {
      expect(Object.values(ARTM_SLOTS)).toContain(s.apparatus);
    }
    expect(byApp.floor_exercise).toBeGreaterThan(0);
    expect(result!.allAroundScore).toBeGreaterThan(0);
  });

  it('returns null when the gymnast is not in the meet', () => {
    expect(parseMeetResult(extractRows(scoresEnvelope), 'nobody')).toBeNull();
  });

  it('treats unscored (all-zero) rows as having no apparatus scores', () => {
    // The unscored fixture row is gymnastid 1002.
    const result = parseMeetResult(extractRows(scoresEnvelope), '1002');
    expect(result).not.toBeNull();
    expect(result!.scores).toHaveLength(0);
    expect(result!.allAroundScore).toBeNull();
    // Level/division are still captured even when the meet isn't scored.
    expect(result!.level).toBe('J6');
  });

  it('parses tie place markers', () => {
    const rows = [
      {
        gymnastid: '5',
        meetid: '9',
        MeetName: 'M',
        EventType: 'ARTM',
        level: 'J6',
        div: 'Junior 16',
        EventScore1: '12.400000',
        EventPlace1: '19=',
        AAScore: '71.500000',
        AAPlace: 'T3',
      },
    ];
    const r = parseMeetResult(rows, '5')!;
    expect(r.scores[0].place).toBe(19);
    expect(r.allAroundPlace).toBe(3);
  });

  it('yields no apparatus scores for non-ARTM event types', () => {
    const rows = [
      {
        gymnastid: '7',
        meetid: '9',
        MeetName: 'W',
        EventType: 'ARTW',
        level: 'B',
        div: 'Child',
        EventScore1: '9.500000',
        AAScore: '38.000000',
      },
    ];
    const r = parseMeetResult(rows, '7')!;
    expect(r.isMens).toBe(false);
    expect(r.scores).toHaveLength(0);
  });
});
