import { describe, expect, it } from 'vitest';
import {
  isDateLine,
  parseDateRange,
  resolveSessionDate,
} from '@/lib/scorecard/dates';

describe('parseDateRange', () => {
  it('parses a single day', () => {
    expect(parseDateRange('Aug 22, 2026')).toEqual({
      start: '2026-08-22',
      end: '2026-08-22',
    });
  });

  it('parses a range', () => {
    expect(parseDateRange('Jan 02, 2026 - Mar 01, 2026')).toEqual({
      start: '2026-01-02',
      end: '2026-03-01',
    });
  });

  it('returns nulls for non-dates', () => {
    expect(parseDateRange('Ace Archers, Foxborough, MA')).toEqual({
      start: null,
      end: null,
    });
    expect(isDateLine('Ace Archers, Foxborough, MA')).toBe(false);
  });

  it('can be called repeatedly (no shared regex state)', () => {
    expect(isDateLine('Sep 26, 2026')).toBe(true);
    expect(isDateLine('Sep 26, 2026')).toBe(true);
    expect(parseDateRange('Sep 26, 2026').start).toBe('2026-09-26');
  });
});

describe('resolveSessionDate', () => {
  it('uses an explicit month/day in the session label', () => {
    expect(
      resolveSessionDate('Massachusetts, Feb 20, 12:30pm', '2026-01-02', '2026-03-01'),
    ).toBe('2026-02-20');
  });

  it('picks the right year when the range crosses New Year', () => {
    expect(
      resolveSessionDate('Home range, Jan 3, 9am', '2025-12-15', '2026-01-15'),
    ).toBe('2026-01-03');
  });

  it('matches a weekday inside the event range', () => {
    // Sep 26, 2026 is a Saturday; Sep 27 a Sunday.
    expect(
      resolveSessionDate('Indoor Range, Sunday 1pm', '2026-09-26', '2026-09-27'),
    ).toBe('2026-09-27');
    expect(
      resolveSessionDate('Indoor Range, Saturday 9am', '2026-09-26', '2026-09-27'),
    ).toBe('2026-09-26');
  });

  it('falls back to the start date', () => {
    expect(resolveSessionDate('Main field', '2026-06-27', '2026-06-27')).toBe(
      '2026-06-27',
    );
    expect(resolveSessionDate(null, null, null)).toBeNull();
  });
});
