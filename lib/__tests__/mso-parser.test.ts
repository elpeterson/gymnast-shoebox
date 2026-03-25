import { describe, it, expect } from 'vitest';
import { parseScoreRow, parseMeetDates, APPARATUS_MAP } from '../mso-parser';

describe('APPARATUS_MAP', () => {
  it('maps common MAG display names to db ids', () => {
    expect(APPARATUS_MAP['Floor']).toBe('floor_exercise');
    expect(APPARATUS_MAP['Floor Exercise']).toBe('floor_exercise');
    expect(APPARATUS_MAP['Pommel']).toBe('pommel_horse');
    expect(APPARATUS_MAP['Pommel Horse']).toBe('pommel_horse');
    expect(APPARATUS_MAP['Rings']).toBe('still_rings');
    expect(APPARATUS_MAP['Still Rings']).toBe('still_rings');
    expect(APPARATUS_MAP['Vault']).toBe('vault');
    expect(APPARATUS_MAP['PBars']).toBe('parallel_bars');
    expect(APPARATUS_MAP['P Bars']).toBe('parallel_bars');
    expect(APPARATUS_MAP['Parallel Bars']).toBe('parallel_bars');
    expect(APPARATUS_MAP['HiBar']).toBe('high_bar');
    expect(APPARATUS_MAP['High Bar']).toBe('high_bar');
    expect(APPARATUS_MAP['Horizontal Bar']).toBe('high_bar');
  });

  it('maps WAG display names to db ids', () => {
    expect(APPARATUS_MAP['Beam']).toBe('balance_beam');
    expect(APPARATUS_MAP['Bars']).toBe('uneven_bars');
    expect(APPARATUS_MAP['Uneven Bars']).toBe('uneven_bars');
  });
});

describe('parseScoreRow', () => {
  it('parses a valid score row with place', () => {
    const result = parseScoreRow('Floor', '13.650', '2');
    expect(result).toEqual({ apparatus: 'floor_exercise', value: 13.65, place: 2 });
  });

  it('parses a tied place (T prefix)', () => {
    const result = parseScoreRow('Vault', '14.300', 'T3');
    expect(result).toEqual({ apparatus: 'vault', value: 14.3, place: 3 });
  });

  it('returns null place when place text is empty', () => {
    const result = parseScoreRow('Rings', '13.800', '');
    expect(result).toEqual({ apparatus: 'still_rings', value: 13.8, place: null });
  });

  it('returns null for an unknown event label', () => {
    const result = parseScoreRow('Trampoline', '55.000', '1');
    expect(result).toBeNull();
  });

  it('returns null when score text is not a number', () => {
    const result = parseScoreRow('Floor', '', '1');
    expect(result).toBeNull();
  });

  it('returns null when score text is non-numeric string', () => {
    const result = parseScoreRow('Pommel', 'DNS', '1');
    expect(result).toBeNull();
  });

  it('handles alternate display names', () => {
    expect(parseScoreRow('HiBar', '14.000', '1')).toMatchObject({ apparatus: 'high_bar' });
    expect(parseScoreRow('PBars', '13.500', '1')).toMatchObject({ apparatus: 'parallel_bars' });
    expect(parseScoreRow('Beam', '12.900', '1')).toMatchObject({ apparatus: 'balance_beam' });
  });
});

describe('parseMeetDates', () => {
  it('parses a single date', () => {
    const result = parseMeetDates('March 1, 2025');
    expect(result.startDate).not.toBeNull();
    expect(result.endDate).toBe(result.startDate);
  });

  it('parses a date range', () => {
    const result = parseMeetDates('March 1, 2025 - March 2, 2025');
    expect(result.startDate).not.toBeNull();
    expect(result.endDate).not.toBeNull();
    expect(result.startDate).not.toBe(result.endDate);
  });

  it('returns null dates for an unparseable string', () => {
    const result = parseMeetDates('Date TBD');
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it('returns null dates for an empty string', () => {
    const result = parseMeetDates('');
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
  });

  it('normalises extra whitespace before parsing', () => {
    const result = parseMeetDates('  March  1,  2025  ');
    expect(result.startDate).not.toBeNull();
  });

  it('start date is before end date for a valid range', () => {
    const result = parseMeetDates('January 10, 2025 - January 12, 2025');
    expect(new Date(result.startDate!).getTime()).toBeLessThan(
      new Date(result.endDate!).getTime(),
    );
  });
});
