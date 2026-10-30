// Shapes shared by the Between Ends scorecard parser, the import UI and the
// save action. Everything here is plain data so it can cross the server-action
// boundary unchanged.

/** One positioned run of text from a PDF page (pdf.js text item, flattened). */
export type TextItem = {
  str: string;
  x: number;
  y: number;
  page: number;
};

/** Arrow values exactly as printed on the card. */
export type ArrowValue =
  | 'X'
  | '10'
  | '9'
  | '8'
  | '7'
  | '6'
  | '5'
  | '4'
  | '3'
  | '2'
  | '1'
  | 'M';

export type ParsedEnd = {
  endNumber: number;
  arrows: ArrowValue[];
  /** The printed end sum (checked against the arrows). */
  sum: number;
  /** The printed running total (checked against the sums). */
  runningTotal: number;
};

export type ParsedRound = {
  roundNumber: number;
  ends: ParsedEnd[];
  total: number;
  /** Printed bonus-column totals, in the order of `bonusLabels`. */
  bonus: [number, number];
};

export type Issue = { level: 'error' | 'warning'; message: string };

export type ParsedScorecard = {
  eventName: string;
  venue: string | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  sessionLabel: string | null;
  /** Best guess at the day actually shot, derived from the session label. */
  sessionDate: string | null; // YYYY-MM-DD
  archerName: string | null;
  target: string | null;
  division: string | null;
  arrowsPerEnd: number;
  /** Bonus column headings, e.g. ['10s', '9s'] indoor or ['Xs', '10s'] outdoor. */
  bonusLabels: [string, string];
  rounds: ParsedRound[];
  issues: Issue[];
};
