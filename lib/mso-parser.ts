const APPARATUS_MAP: Record<string, string> = {
  Floor: 'floor_exercise',
  'Floor Exercise': 'floor_exercise',
  Pommel: 'pommel_horse',
  'Pommel Horse': 'pommel_horse',
  Rings: 'still_rings',
  'Still Rings': 'still_rings',
  Vault: 'vault',
  PBars: 'parallel_bars',
  'P Bars': 'parallel_bars',
  'Parallel Bars': 'parallel_bars',
  HiBar: 'high_bar',
  'High Bar': 'high_bar',
  'Horizontal Bar': 'high_bar',
  Beam: 'balance_beam',
  Bars: 'uneven_bars',
  'Uneven Bars': 'uneven_bars',
};

export type ParsedScore = {
  apparatus: string;
  value: number;
  place: number | null;
};

export type ParsedDates = {
  startDate: string | null;
  endDate: string | null;
};

export { APPARATUS_MAP };

export function parseScoreRow(
  eventLabel: string,
  scoreText: string,
  placeText: string,
): ParsedScore | null {
  const value = parseFloat(scoreText);
  const place = parseInt(placeText.replace('T', ''));
  const apparatus = APPARATUS_MAP[eventLabel];

  if (!apparatus || isNaN(value)) return null;

  return {
    apparatus,
    value,
    place: isNaN(place) ? null : place,
  };
}

export function parseMeetDates(dateStr: string): ParsedDates {
  try {
    const cleanDateStr = dateStr.replace(/\s+/g, ' ').trim();

    if (cleanDateStr.includes('-')) {
      const [start, end] = cleanDateStr.split('-').map((s) => s.trim());
      const startDate = new Date(start);
      const endDate = new Date(end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { startDate: null, endDate: null };
      }

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    } else {
      const date = new Date(cleanDateStr);
      if (isNaN(date.getTime())) return { startDate: null, endDate: null };
      const iso = date.toISOString();
      return { startDate: iso, endDate: iso };
    }
  } catch {
    return { startDate: null, endDate: null };
  }
}
