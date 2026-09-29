// Between Ends scorecard parser.
//
// Between Ends exports scorecards with jsPDF, so every cell is its own text item
// with a real (x, y) position. Rather than reading the page as lines of text, we
// find each round's grid by its header row ("Rnd N ... Sum Total <bonus> <bonus>")
// and then read cells by column position. That one rule covers both layouts seen
// so far:
//   - indoor: landscape, 3 arrows x 10 ends, two rounds side by side
//   - outdoor: portrait, 6 arrows x 6 ends, rounds stacked vertically
//
// The card checks itself (arrows -> end sum -> running total -> round total), so
// the parser reports any disagreement as an error instead of guessing.

import { isDateLine, parseDateRange, resolveSessionDate } from './dates';
import type {
  ArrowValue,
  Issue,
  ParsedEnd,
  ParsedRound,
  ParsedScorecard,
  TextItem,
} from './types';

/** Cells on one printed row can differ by a point or two in y. */
const ROW_TOLERANCE = 3;
/** How far above a grid header its Name/Session/Target block sits. */
const META_HEIGHT = 80;

const ARROW_VALUES = new Set<string>([
  'X',
  '10',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
  '1',
  'M',
]);
const LABELS = new Set(['Name:', 'Session:', 'Target:', 'Class/Div:']);

export function arrowScore(value: ArrowValue): number {
  if (value === 'X') return 10;
  if (value === 'M') return 0;
  return Number(value);
}

type Column = { key: string; x: number };

type Grid = {
  page: number;
  roundNumber: number;
  headerY: number;
  xMin: number;
  xMax: number;
  columns: Column[];
  arrowsPerEnd: number;
  bonusLabels: [string, string];
};

const sameRow = (a: number, b: number) => Math.abs(a - b) <= ROW_TOLERANCE;

function groupRows(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextItem[][] = [];
  for (const item of sorted) {
    const row = rows[rows.length - 1];
    if (row && sameRow(row[0].y, item.y)) row.push(item);
    else rows.push([item]);
  }
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

function nearestColumn(columns: Column[], x: number): Column {
  return columns.reduce((best, c) =>
    Math.abs(c.x - x) < Math.abs(best.x - x) ? c : best,
  );
}

/** Find every round grid: a "Rnd N" cell with a "Sum" cell on the same row. */
function findGrids(items: TextItem[]): Grid[] {
  const headers = items.filter(
    (i) =>
      /^Rnd \d+$/.test(i.str) &&
      items.some(
        (s) => s.page === i.page && s.str === 'Sum' && sameRow(s.y, i.y) && s.x > i.x,
      ),
  );

  return headers.map((rnd) => {
    // Grids that share a header row (side-by-side) split the page between them.
    const neighbours = headers
      .filter((h) => h.page === rnd.page && sameRow(h.y, rnd.y) && h.x > rnd.x)
      .sort((a, b) => a.x - b.x);
    const xMin = rnd.x - 20;
    const xMax = neighbours.length ? neighbours[0].x - 20 : Infinity;

    const headerRow = items
      .filter(
        (i) =>
          i.page === rnd.page &&
          sameRow(i.y, rnd.y) &&
          i.x > rnd.x &&
          i.x < xMax,
      )
      .sort((a, b) => a.x - b.x);

    const columns: Column[] = [{ key: 'end', x: rnd.x }];
    let arrowsPerEnd = 0;
    const bonus: string[] = [];
    let seenTotal = false;
    for (const cell of headerRow) {
      if (/^\d+$/.test(cell.str) && !seenTotal && cell.str === String(arrowsPerEnd + 1)) {
        arrowsPerEnd += 1;
        columns.push({ key: `a${arrowsPerEnd}`, x: cell.x });
      } else if (cell.str === 'Sum') {
        columns.push({ key: 'sum', x: cell.x });
      } else if (cell.str === 'Total') {
        seenTotal = true;
        columns.push({ key: 'total', x: cell.x });
      } else if (seenTotal && bonus.length < 2) {
        columns.push({ key: `b${bonus.length}`, x: cell.x });
        bonus.push(cell.str);
      }
    }

    return {
      page: rnd.page,
      roundNumber: Number(rnd.str.slice(4)),
      headerY: rnd.y,
      xMin,
      xMax,
      columns,
      arrowsPerEnd,
      bonusLabels: [bonus[0] ?? '', bonus[1] ?? ''] as [string, string],
    };
  });
}

function readMeta(grid: Grid, items: TextItem[]) {
  const block = items.filter(
    (i) =>
      i.page === grid.page &&
      i.x >= grid.xMin &&
      i.x < grid.xMax &&
      i.y > grid.headerY + ROW_TOLERANCE &&
      i.y < grid.headerY + META_HEIGHT,
  );
  const label = (name: string) => block.find((i) => i.str === name);

  // "Name:" and "Session:" have their value to the right on the same row.
  const rightOf = (name: string) => {
    const l = label(name);
    if (!l) return null;
    const v = block
      .filter((i) => sameRow(i.y, l.y) && i.x > l.x && !LABELS.has(i.str))
      .sort((a, b) => a.x - b.x)[0];
    return v?.str.trim() || null;
  };

  // "Target:" and "Class/Div:" have their value on the row beneath.
  const below = (name: string) => {
    const l = label(name);
    if (!l) return null;
    const candidates = block.filter(
      (i) => i.y < l.y - ROW_TOLERANCE && !LABELS.has(i.str),
    );
    if (!candidates.length) return null;
    const topY = Math.max(...candidates.map((c) => c.y));
    const v = candidates
      .filter((c) => sameRow(c.y, topY))
      .sort((a, b) => Math.abs(a.x - l.x) - Math.abs(b.x - l.x))[0];
    return v?.str.trim() || null;
  };

  return {
    archerName: rightOf('Name:'),
    sessionLabel: rightOf('Session:'),
    target: below('Target:'),
    division: below('Class/Div:'),
  };
}

function readRound(grid: Grid, items: TextItem[], issues: Issue[]): ParsedRound {
  const label = `Round ${grid.roundNumber}`;
  const inGrid = items.filter(
    (i) =>
      i.page === grid.page &&
      i.x >= grid.xMin &&
      i.x < grid.xMax &&
      i.y < grid.headerY - ROW_TOLERANCE,
  );

  const totalsCell = inGrid
    .filter((i) => i.str === 'Totals')
    .sort((a, b) => b.y - a.y)[0];
  if (!totalsCell) {
    issues.push({ level: 'error', message: `${label}: no Totals row found.` });
  }
  const floorY = totalsCell ? totalsCell.y : -Infinity;

  const rows = groupRows(
    inGrid.filter((i) => i.y > floorY - ROW_TOLERANCE),
  );

  const ends: ParsedEnd[] = [];
  let total = 0;
  const bonus: [number, number] = [0, 0];

  for (const row of rows) {
    const cells: Record<string, string> = {};
    for (const item of row) {
      cells[nearestColumn(grid.columns, item.x).key] = item.str.trim();
    }

    if (row.some((i) => i.str === 'Totals')) {
      total = Number(cells.total);
      bonus[0] = Number(cells.b0 ?? 0);
      bonus[1] = Number(cells.b1 ?? 0);
      continue;
    }

    const endNumber = Number(cells.end);
    if (!Number.isInteger(endNumber)) continue;

    const arrows: ArrowValue[] = [];
    for (let a = 1; a <= grid.arrowsPerEnd; a++) {
      const raw = (cells[`a${a}`] ?? '').toUpperCase();
      if (!ARROW_VALUES.has(raw)) {
        issues.push({
          level: 'error',
          message: `${label}, end ${endNumber}: arrow ${a} reads "${raw}".`,
        });
        continue;
      }
      arrows.push(raw as ArrowValue);
    }

    ends.push({
      endNumber,
      arrows,
      sum: Number(cells.sum),
      runningTotal: Number(cells.total),
    });
  }

  return { roundNumber: grid.roundNumber, ends, total, bonus };
}

function bonusCount(label: string, arrows: ArrowValue[]): number | null {
  const l = label.toLowerCase();
  if (l === 'xs') return arrows.filter((a) => a === 'X').length;
  // World Archery convention: the 10s column includes Xs.
  if (l === '10s') return arrows.filter((a) => a === '10' || a === 'X').length;
  if (l === '9s') return arrows.filter((a) => a === '9').length;
  return null;
}

function checkRound(
  round: ParsedRound,
  arrowsPerEnd: number,
  bonusLabels: [string, string],
  issues: Issue[],
) {
  const label = `Round ${round.roundNumber}`;
  let running = 0;
  round.ends.forEach((end, i) => {
    if (end.endNumber !== i + 1) {
      issues.push({ level: 'error', message: `${label}: end ${i + 1} is missing.` });
    }
    if (end.arrows.length !== arrowsPerEnd) return; // already reported
    const sum = end.arrows.reduce((s, a) => s + arrowScore(a), 0);
    if (sum !== end.sum) {
      issues.push({
        level: 'error',
        message: `${label}, end ${end.endNumber}: arrows add to ${sum} but the card says ${end.sum}.`,
      });
    }
    running += end.sum;
    if (running !== end.runningTotal) {
      issues.push({
        level: 'error',
        message: `${label}, end ${end.endNumber}: running total should be ${running} but the card says ${end.runningTotal}.`,
      });
    }
  });

  if (running !== round.total) {
    issues.push({
      level: 'error',
      message: `${label}: ends add to ${running} but the card total is ${round.total}.`,
    });
  }

  const arrows = round.ends.flatMap((e) => e.arrows);
  bonusLabels.forEach((b, i) => {
    const counted = bonusCount(b, arrows);
    if (counted !== null && counted !== round.bonus[i]) {
      issues.push({
        level: 'warning',
        message: `${label}: counted ${counted} ${b} but the card says ${round.bonus[i]}.`,
      });
    }
  });
}

/** Header lines above the first grid: event name, venue, date range. */
function readHeader(items: TextItem[]) {
  const firstPage = items.filter((i) => i.page === items[0]?.page);
  const nameLabels = firstPage.filter((i) => i.str === 'Name:');
  const ceiling = nameLabels.length
    ? Math.max(...nameLabels.map((i) => i.y)) + ROW_TOLERANCE
    : -Infinity;
  const lines = groupRows(firstPage.filter((i) => i.y > ceiling)).map((row) =>
    row.map((i) => i.str.trim()).join(' ').trim(),
  );

  const dateLine = lines.find(isDateLine) ?? null;
  const rest = lines.filter((l) => l && l !== dateLine);
  const { start, end } = dateLine
    ? parseDateRange(dateLine)
    : { start: null, end: null };

  return {
    eventName: rest[0] ?? '',
    venue: rest[1] ?? null,
    startDate: start,
    endDate: end,
  };
}

export function parseScorecard(items: TextItem[]): ParsedScorecard {
  const issues: Issue[] = [];
  const cleaned = items.filter((i) => i.str.trim() !== '');
  const header = readHeader(cleaned);
  const grids = findGrids(cleaned);

  if (grids.length === 0) {
    issues.push({
      level: 'error',
      message: "This doesn't look like a Between Ends scorecard (no score grid found).",
    });
  }

  const arrowsPerEnd = grids[0]?.arrowsPerEnd ?? 0;
  const bonusLabels = grids[0]?.bonusLabels ?? ['', ''];
  if (grids.some((g) => g.arrowsPerEnd !== arrowsPerEnd)) {
    issues.push({
      level: 'error',
      message: 'Rounds on this card have different numbers of arrows per end.',
    });
  }

  const metas = grids.map((g) => readMeta(g, cleaned));
  const names = new Set(metas.map((m) => m.archerName).filter(Boolean));
  if (names.size > 1) {
    issues.push({
      level: 'error',
      message: `This file holds scorecards for more than one archer (${[...names].join(', ')}).`,
    });
  }
  const meta = metas[0] ?? {
    archerName: null,
    sessionLabel: null,
    target: null,
    division: null,
  };

  const rounds = grids
    .map((g) => readRound(g, cleaned, issues))
    .sort((a, b) => a.roundNumber - b.roundNumber);
  for (const r of rounds) checkRound(r, arrowsPerEnd, bonusLabels, issues);

  return {
    ...header,
    sessionLabel: meta.sessionLabel,
    sessionDate: resolveSessionDate(meta.sessionLabel, header.startDate, header.endDate),
    archerName: meta.archerName,
    target: meta.target,
    division: meta.division,
    arrowsPerEnd,
    bonusLabels,
    rounds,
    issues,
  };
}
