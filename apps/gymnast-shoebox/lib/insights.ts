// Individual Consistency analytics.
//
// Pure, dependency-free transforms that turn a gymnast's competitions into the
// row shape a multi-series line chart consumes.
//
// The load-bearing rule from the product plan: scores are not comparable across
// competitive groups, so the chart only ever shows ONE group at a time. The
// group is defined by (Level, Division): Level always partitions (a Level 3
// score is not comparable to a Level 6 score), and Division sub-partitions
// within a level when a gym uses divisions (4D1 vs 5D2). A level with no
// divisions is graphed whole.

export type ScoreItem = {
  apparatus: string;
  value: number | null;
};

export type CompetitionRow = {
  id: string;
  name: string;
  start_date: string | null;
  level: string | null;
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

export type GroupOption = {
  value: string;
  count: number;
  /** Latest competition date in this group, for most-recent-first ordering. */
  latest: string | null;
};

/** Label for competitions with no level recorded. */
export const UNSPECIFIED_LEVEL = 'Unspecified';
/** Label for competitions within a level that have no division. */
export const NO_DIVISION = 'No division';

/** The level bucket a competition belongs to, normalizing blanks. */
export function levelKey(comp: Pick<CompetitionRow, 'level'>): string {
  const l = comp.level?.trim();
  return l ? l : UNSPECIFIED_LEVEL;
}

/** The division bucket a competition belongs to, normalizing blanks. */
export function divisionKey(comp: Pick<CompetitionRow, 'division'>): string {
  const d = comp.division?.trim();
  return d ? d : NO_DIVISION;
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

function tally(
  competitions: CompetitionRow[],
  keyOf: (c: CompetitionRow) => string
): GroupOption[] {
  const map = new Map<string, GroupOption>();
  for (const comp of competitions) {
    const value = keyOf(comp);
    const existing = map.get(value);
    if (existing) {
      existing.count += 1;
      if (compareDateAsc(existing.latest, comp.start_date) < 0) {
        existing.latest = comp.start_date;
      }
    } else {
      map.set(value, { value, count: 1, latest: comp.start_date });
    }
  }
  // Most recent first, so the filter defaults to the current group.
  return [...map.values()].sort((a, b) => {
    const byDate = compareDateAsc(b.latest, a.latest);
    if (byDate !== 0) return byDate;
    return a.value.localeCompare(b.value, undefined, { numeric: true });
  });
}

/** Distinct levels present, most-recent first. */
export function listLevels(competitions: CompetitionRow[]): GroupOption[] {
  return tally(competitions, levelKey);
}

/** Distinct division buckets within one level, most-recent first. */
export function listDivisions(
  competitions: CompetitionRow[],
  level: string
): GroupOption[] {
  return tally(
    competitions.filter((c) => levelKey(c) === level),
    divisionKey
  );
}

/**
 * Whether a level actually uses divisions — i.e. any bucket other than the
 * synthetic "No division". Drives whether the UI shows a Division filter.
 */
export function levelHasDivisions(divisions: GroupOption[]): boolean {
  return divisions.some((d) => d.value !== NO_DIVISION);
}

/**
 * Rows for the line chart within one competitive group, oldest to newest. Pass
 * `division = null` to include the whole level (used when the level has no
 * divisions); pass a division bucket to restrict to it. Two divisions are never
 * combined.
 */
export function buildSeries(
  competitions: CompetitionRow[],
  level: string,
  division: string | null,
  apparatusIds: string[]
): ChartRow[] {
  const inGroup = competitions.filter(
    (c) =>
      levelKey(c) === level &&
      (division === null || divisionKey(c) === division)
  );
  const sorted = [...inGroup].sort((a, b) =>
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
 * given rows. Lets the chart draw only lines that carry data.
 */
export function apparatusWithData(
  rows: ChartRow[],
  apparatusIds: string[]
): string[] {
  return apparatusIds.filter((id) =>
    rows.some((r) => typeof r[id] === 'number')
  );
}
