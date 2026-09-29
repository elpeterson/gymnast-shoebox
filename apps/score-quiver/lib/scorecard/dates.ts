// Date helpers for Between Ends header text. Everything works on YYYY-MM-DD
// strings (never Date objects in local time) so a scorecard never shifts a day
// depending on the viewer's time zone.

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const DATE_PATTERN = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})/;

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function toUtc(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00Z`);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** True when the text looks like a Between Ends date line ("Sep 26, 2026 - Sep 27, 2026"). */
export function isDateLine(text: string): boolean {
  return DATE_PATTERN.test(text);
}

/** Parse "Aug 22, 2026" or "Jan 02, 2026 - Mar 01, 2026" into a start/end pair. */
export function parseDateRange(text: string): {
  start: string | null;
  end: string | null;
} {
  const found: string[] = [];
  for (const m of text.matchAll(new RegExp(DATE_PATTERN, 'g'))) {
    const month = MONTHS[m[1].toLowerCase()];
    if (!month) continue;
    found.push(iso(Number(m[3]), month, Number(m[2])));
  }
  if (found.length === 0) return { start: null, end: null };
  return { start: found[0], end: found[found.length - 1] };
}

/**
 * Work out which day the archer actually shot from the session label.
 *
 * Between Ends session labels come in two flavours:
 *   - "Massachusetts, Feb 20, 12:30pm"  -> an explicit month/day (postal events
 *     like JOAD Indoor Nationals span months, so this matters)
 *   - "Lower Soccer Field, Saturday 9am" -> a weekday within the event range
 *
 * Falls back to the event start date when neither resolves.
 */
export function resolveSessionDate(
  session: string | null,
  start: string | null,
  end: string | null,
): string | null {
  if (!start) return null;
  const last = end ?? start;

  if (session) {
    const explicit = session.match(/\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})\b/);
    const month = explicit ? MONTHS[explicit[1].toLowerCase()] : undefined;
    if (explicit && month) {
      const day = Number(explicit[2]);
      // Pick the year that lands inside the event range (ranges can cross New Year).
      for (const year of new Set([Number(start.slice(0, 4)), Number(last.slice(0, 4))])) {
        const candidate = iso(year, month, day);
        if (candidate >= start && candidate <= last) return candidate;
      }
      return iso(Number(start.slice(0, 4)), month, day);
    }

    const lower = session.toLowerCase();
    const weekday = WEEKDAYS.findIndex((d) => lower.includes(d));
    if (weekday >= 0) {
      for (let t = toUtc(start); t <= toUtc(last); t += 86_400_000) {
        if (new Date(t).getUTCDay() === weekday) return fromUtc(t);
      }
    }
  }

  return start;
}
