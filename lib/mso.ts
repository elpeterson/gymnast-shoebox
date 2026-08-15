function dateOnly(value: string, fallbackYear?: string) {
  const withYear = /\b\d{4}\b/.test(value)
    ? value
    : fallbackYear
      ? `${value}, ${fallbackYear}`
      : value;
  const parsed = new Date(withYear);
  if (Number.isNaN(parsed.getTime())) return null;
  return [
    parsed.getUTCFullYear(),
    String(parsed.getUTCMonth() + 1).padStart(2, '0'),
    String(parsed.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function parseMsoDateRange(raw: string) {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned === 'Date TBD') return { startDate: null, endDate: null };

  const year = cleaned.match(/\b(20\d{2})\b/)?.[1];
  const parts = cleaned.split(/\s+-\s+/);
  if (parts.length === 1) {
    const date = dateOnly(parts[0], year);
    return { startDate: date, endDate: date };
  }

  return {
    startDate: dateOnly(parts[0], year),
    endDate: dateOnly(parts.at(-1) ?? '', year),
  };
}
