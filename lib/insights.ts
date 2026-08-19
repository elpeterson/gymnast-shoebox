// Individual Consistency analytics.
//
// Pure, dependency-free transforms that turn a gymnast's competitions into the
// row shape a multi-series line chart consumes. The load-bearing rule from the
// product plan lives here: scores are partitioned by *division* and never
// mixed across divisions (a 4D1 score is not comparable to a 5D2 score), so the
// chart only ever renders one division at a time.

export type ScoreItem = {
  apparatus: string;
  value: number | null;
};

export type CompetitionRow = {
  id: string;
  name: string;
  start_date: string | null;
  division: string | null;
  scores: ScoreItem[];
};

/** One point in time on the chart: a date plus each apparatus's score. */
export type ChartRow = {
  competitionId: string;
  competitionName: string;
  date: string | null;
  /** Apparatus id -> score for this meet (null when not contested/entered). */
  [apparatusId: string]: string | number | null;
};

export type DivisionOption = {
  division: string;
  count: number;
  /** Latest competition date in this division, for sorting/most-recent default. */
  latest: string | null;
};

/** Label used for competitions that have no division recorded. */
export const UNSPECIFIED_DIVISION = 'Unspecified';

/** The division bucket a competition belongs to, normalizing blanks. */
export function divisionKey(comp: Pick<CompetitionRow, 'division'>): string {
  const d = comp.division?.trim();
  return d ? d : UNSPECIFIED_DIVISION;
}

/**
 * Compare two date strings ascending; nulls sort last. Dates are ISO
 * (`YYYY-MM-DD`) so lexical comparison is chronological.
 */
function compareDateAsc(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

/**
 * Distinct divisions present in the gymnast's competitions, most-recent first,
 * so the filter can default to the division they are currently competing in.
 */
export function listDivisions(competitions: CompetitionRow[]): DivisionOption[] {
  const map = new Map<string, DivisionOption>();

  for (const comp of competitions) {
    const key = divisionKey(comp);
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      if (compareDateAsc(existing.latest, comp.start_date) < 0) {
        existing.latest = comp.start_date;
      }
    } else {
      map.set(key, { division: key, count: 1, latest: comp.start_date });
    }
  }

  return [...map.values()].sort((a, b) => {
    // Most recent first; a division with any dated meet beats an all-undated one.
    const byDate = compareDateAsc(b.latest, a.latest);
    if (byDate !== 0) return byDate;
    return a.division.localeCompare(b.division);
  });
}

/**
 * Rows for the line chart, restricted to a single division and ordered oldest
 * to newest. Each row carries one competition's date and its score on every
 * requested apparatus (null where a score is missing), which is exactly the
 * shape a shared hover tooltip needs to list every event for a date.
 *
 * `apparatusIds` controls which apparatus (and their order) appear, so the
 * caller drives discipline-specific layout (MAG vs WAG).
 */
export function buildDivisionSeries(
  competitions: CompetitionRow[],
  division: string,
  apparatusIds: string[]
): ChartRow[] {
  const inDivision = competitions.filter((c) => divisionKey(c) === division);
  const sorted = [...inDivision].sort((a, b) =>
    compareDateAsc(a.start_date, b.start_date)
  );

  return sorted.map((comp) => {
    const row: ChartRow = {
      competitionId: comp.id,
      competitionName: comp.name,
      date: comp.start_date,
    };
    const byApparatus = new Map(
      (comp.scores ?? []).map((s) => [s.apparatus, s.value])
    );
    for (const id of apparatusIds) {
      const v = byApparatus.get(id);
      row[id] = v !== undefined && v !== null && Number.isFinite(v) ? v : null;
    }
    return row;
  });
}

/**
 * Of the requested apparatus, which actually have at least one score in the
 * given rows. Lets the chart draw only lines that carry data, so an apparatus
 * the gymnast never competed in this division isn't shown as a flat empty line.
 */
export function apparatusWithData(
  rows: ChartRow[],
  apparatusIds: string[]
): string[] {
  return apparatusIds.filter((id) =>
    rows.some((r) => typeof r[id] === 'number')
  );
}
