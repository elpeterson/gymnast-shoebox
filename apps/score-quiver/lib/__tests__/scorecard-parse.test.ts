import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseScorecard } from '@/lib/scorecard/parse';
import type { TextItem } from '@/lib/scorecard/types';

// Fixtures are real Between Ends exports run through scripts/make-fixture.mjs,
// which swaps the archer's name for "Test Archer".
function fixture(name: string): TextItem[] {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8'),
  );
}

describe('parseScorecard: indoor (3 arrows x 10 ends, rounds side by side)', () => {
  it('reads the Aces Wild 600 card', () => {
    const card = parseScorecard(fixture('indoor-aces-wild'));
    expect(card.issues).toEqual([]);
    expect(card).toMatchObject({
      eventName: '2026 Aces Wild 600',
      venue: 'Ace Archers, Foxborough, MA',
      startDate: '2026-09-26',
      endDate: '2026-09-27',
      sessionLabel: 'Ace Archers Indoor Range, Saturday 9am',
      sessionDate: '2026-09-26',
      archerName: 'Test Archer',
      target: '5A',
      division: 'RU13W',
      arrowsPerEnd: 3,
      bonusLabels: ['10s', '9s'],
    });
    expect(card.rounds.map((r) => r.total)).toEqual([133, 136]);
    expect(card.rounds.map((r) => r.bonus)).toEqual([
      [0, 5],
      [1, 1],
    ]);
    expect(card.rounds[0].ends).toHaveLength(10);
    expect(card.rounds[0].ends[0]).toEqual({
      endNumber: 1,
      arrows: ['7', '5', 'M'],
      sum: 12,
      runningTotal: 12,
    });
    expect(card.rounds[1].ends[1].arrows).toEqual(['10', '7', '3']);
  });

  it('reads the Archers Cup card', () => {
    const card = parseScorecard(fixture('indoor-archers-cup'));
    expect(card.issues).toEqual([]);
    expect(card.startDate).toBe('2026-03-14');
    expect(card.sessionDate).toBe('2026-03-14');
    expect(card.rounds.map((r) => r.total)).toEqual([103, 104]);
  });

  it('uses the session date for postal events that span months', () => {
    const card = parseScorecard(fixture('indoor-joad-nationals'));
    expect(card.issues).toEqual([]);
    expect(card.eventName).toBe(
      '2026 USA Archery JOAD Indoor Nationals - Combined Results',
    );
    expect(card.startDate).toBe('2026-01-02');
    expect(card.endDate).toBe('2026-03-01');
    expect(card.sessionDate).toBe('2026-02-20');
    expect(card.division).toBe('BU13W');
    expect(card.rounds.map((r) => r.total)).toEqual([143, 165]);
    // An end of three misses still parses as three arrows.
    expect(card.rounds[1].ends[2].arrows).toEqual(['M', 'M', 'M']);
  });
});

describe('parseScorecard: outdoor (6 arrows x 6 ends, rounds stacked)', () => {
  it('reads a two-round card', () => {
    const card = parseScorecard(fixture('outdoor-spirit-of-ma'));
    expect(card.issues).toEqual([]);
    expect(card).toMatchObject({
      eventName: '2026 Spirit of Massachusetts Outdoor Classic',
      venue: 'Metrowest Family Outdoor Center, Hopkinton, MA',
      startDate: '2026-06-27',
      endDate: '2026-06-27',
      sessionDate: '2026-06-27',
      target: '30A',
      division: 'RU13W',
      arrowsPerEnd: 6,
      bonusLabels: ['Xs', '10s'],
    });
    expect(card.rounds.map((r) => r.total)).toEqual([103, 132]);
    expect(card.rounds[0].ends[3].arrows).toEqual(['10', '8', '6', '6', '3', 'M']);
  });

  it('reads a single-round card', () => {
    const card = parseScorecard(fixture('outdoor-noreaster'));
    expect(card.issues).toEqual([]);
    expect(card.eventName).toBe('2026 Noreaster');
    expect(card.target).toBe('27C');
    expect(card.rounds).toHaveLength(1);
    expect(card.rounds[0].total).toBe(203);
    expect(card.rounds[0].ends).toHaveLength(6);
  });
});

describe('parseScorecard: self-checks', () => {
  function tamper(items: TextItem[], from: TextItem, str: string): TextItem[] {
    return items.map((i) => (i === from ? { ...i, str } : i));
  }

  it('flags an arrow that disagrees with the printed end sum', () => {
    const items = fixture('outdoor-noreaster');
    // End 1, first arrow ("1") on the Noreaster card.
    // The grid header is the topmost "Rnd 1" (the summary block has one too).
    const header = Math.max(...items.filter((i) => i.str === 'Rnd 1').map((i) => i.y));
    const endRowY = header - 22;
    const arrow = items.find(
      (i) => Math.abs(i.y - endRowY) <= 3 && i.str === '1' && i.x > 110,
    )!;
    const card = parseScorecard(tamper(items, arrow, '9'));
    expect(card.issues.some((i) => i.level === 'error' && /end 1/.test(i.message))).toBe(
      true,
    );
  });

  it('flags an unreadable arrow value', () => {
    const items = fixture('outdoor-noreaster');
    const arrow = items.find((i) => i.str === 'M' && i.x > 290)!;
    const card = parseScorecard(tamper(items, arrow, '?'));
    expect(card.issues.some((i) => /reads "\?"/.test(i.message))).toBe(true);
  });

  it('warns (not errors) when a bonus column disagrees', () => {
    const items = fixture('indoor-aces-wild');
    const totals = items.filter((i) => i.str === 'Totals')[0];
    const nines = items.find(
      (i) => Math.abs(i.y - totals.y) <= 3 && i.x > 340 && i.x < 360,
    )!;
    const card = parseScorecard(tamper(items, nines, '4'));
    expect(card.issues).toEqual([
      { level: 'warning', message: 'Round 1: counted 5 9s but the card says 4.' },
    ]);
  });

  it('rejects something that is not a scorecard', () => {
    const card = parseScorecard([{ str: 'Invoice #123', x: 10, y: 10, page: 1 }]);
    expect(card.rounds).toEqual([]);
    expect(card.issues[0].level).toBe('error');
  });
});
