// MeetScoresOnline JSON API client (read-only).
//
// The public MSO site talks to a set of `Ajax.ProjectsJson.<Entity>.aspx`
// endpoints that return structured JSON. Reading them directly is far more
// robust than scraping HTML, and — critically — the JSON carries the `level`
// and `div` (division) fields the score table does not, which feed the
// consistency graph's Level/Division dimension.
//
// This module is deliberately narrow: only read queries, only the ones the
// import needs, enforced by an allowlist. It never issues a write/account
// query even though those live on the same endpoints.

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

const BASE = 'https://www.meetscoresonline.com';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/** Entity endpoints we read from, and the query_name values allowed on each. */
const ENDPOINTS = {
  msoGymnast: {
    file: 'Ajax.ProjectsJson.msoGymnast.aspx',
    queries: ['lookup_gymnast'] as const,
  },
  msoMeet: {
    file: 'Ajax.ProjectsJson.msoMeet.aspx',
    queries: ['lookup_scores2', 'top_scores'] as const,
  },
} as const;

type Entity = keyof typeof ENDPOINTS;

/** A single result set inside the MSO response envelope. */
type MsoResult = {
  ProjectID?: string;
  QueryID?: string;
  error?: unknown;
  result: { row: Record<string, string>[] } | null;
};

type MsoEnvelope = { results?: MsoResult[]; error?: unknown };

/**
 * Issue one read query and return its rows. Throws on transport failure, a
 * disallowed query, or an error envelope. An empty result set returns `[]`.
 */
export async function msoQuery(
  entity: Entity,
  queryName: string,
  params: Record<string, string | number>
): Promise<Record<string, string>[]> {
  const endpoint = ENDPOINTS[entity];
  if (!(endpoint.queries as readonly string[]).includes(queryName)) {
    throw new Error(`Disallowed MSO query: ${entity}.${queryName}`);
  }

  const body = new URLSearchParams({
    query_name: queryName,
    stamp: '1',
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  });

  const res = await fetch(`${BASE}/${endpoint.file}?_cpn=999999`, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      Referer: `${BASE}/`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`MSO ${queryName} failed: HTTP ${res.status}`);
  }

  const json = (await res.json()) as MsoEnvelope;
  return extractRows(json);
}

/** Pull the first result set's rows from an envelope, surfacing errors. */
export function extractRows(
  json: MsoEnvelope
): Record<string, string>[] {
  if (json.error) throw new Error(`MSO error: ${String(json.error)}`);
  const first = json.results?.[0];
  if (!first) return [];
  if (first.error) throw new Error(`MSO query error: ${String(first.error)}`);
  return first.result?.row ?? [];
}

// ---------------------------------------------------------------------------
// Domain mapping (pure — unit tested against captured fixtures)
// ---------------------------------------------------------------------------

// Numbered apparatus slots are positional in Olympic order. Men's artistic
// (EventType ARTM) is the supported case; women's (ARTW) uses a different
// layout and is intentionally left to the existing free-text/scrape path.
const ARTM_SLOTS: Record<number, string> = {
  1: 'floor_exercise',
  2: 'pommel_horse',
  3: 'still_rings',
  4: 'vault',
  5: 'parallel_bars',
  6: 'high_bar',
};

/**
 * MSO packs a men's competitive category into the one `level` string, in a few
 * shapes. Split it into the separate level + division the app stores:
 *
 *   "4D1"  → level 4, division 1   (Development Program: level N, division 1/2)
 *   "10J"  → level 10, division J  (optional levels: Elite/Junior/Senior track)
 *   "6E"   → level 6, division E
 *   "10"   → level 10, no division (plain)
 *   "E","J6","SR","PL" → kept as the level, no division (elite/special codes)
 *
 * Note: MSO's separate `div` field is an *age group* ("Child B", "Jr"), not the
 * competitive division, so it is deliberately not used here.
 */
export function parseMsoLevel(raw: string | undefined): {
  level: string | null;
  division: string | null;
} {
  const s = (raw ?? '').trim();
  if (!s) return { level: null, division: null };
  const dp = s.match(/^(\d+)[dD](\d+)$/);
  if (dp) return { level: dp[1], division: dp[2] };
  const track = s.match(/^(\d+)([EJS])$/);
  if (track) return { level: track[1], division: track[2] };
  return { level: s, division: null };
}

/** Convert MSO's UNIX_TIME (seconds) to an ISO `YYYY-MM-DD` date, or null. */
export function unixToIsoDate(unix: string | undefined): string | null {
  if (!unix) return null;
  const secs = Number(unix);
  if (!Number.isFinite(secs) || secs <= 0) return null;
  return new Date(secs * 1000).toISOString().slice(0, 10);
}

/**
 * Parse a numeric MSO score string. Empty, non-numeric, and exactly zero all
 * map to null: MSO uses `0.000000` to mean "not yet scored", and a real
 * gymnastics score is never 0, so a zero must not enter an average or a chart.
 */
function num(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

/** A gymnast's appearance at one meet, from `lookup_gymnast`. */
export type MsoMeetHistory = {
  meetId: string;
  meetName: string;
  level: string | null;
  division: string | null;
  monthYear: string | null;
};

/** Rows from `lookup_gymnast(p_gymnastid)` → one entry per meet competed. */
export function parseGymnastMeets(
  rows: Record<string, string>[]
): MsoMeetHistory[] {
  const seen = new Set<string>();
  const out: MsoMeetHistory[] = [];
  for (const r of rows) {
    const meetId = r.meetid?.trim();
    if (!meetId || seen.has(meetId)) continue;
    seen.add(meetId);
    const { level, division } = parseMsoLevel(r.level);
    out.push({
      meetId,
      meetName: r.meetname ?? '',
      level,
      division,
      monthYear: r.meetdate_monthyear?.trim() || null,
    });
  }
  return out;
}

export type MsoApparatusScore = {
  apparatus: string;
  value: number | null;
  place: number | null;
};

/** One gymnast's full result at a meet, from `lookup_scores2`. */
export type MsoMeetResult = {
  gymnastId: string;
  meetId: string;
  meetName: string;
  level: string | null;
  division: string | null;
  date: string | null;
  isMens: boolean;
  scores: MsoApparatusScore[];
  allAroundScore: number | null;
  allAroundPlace: number | null;
};

/** MSO encodes a tie place as e.g. "19=" or "T3"; strip the marker. */
function parsePlace(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseInt(value.replace(/[=T]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Extract one gymnast's result from a meet's `lookup_scores2` rows. Returns
 * null if the gymnast isn't in the meet. Only men's artistic (ARTM) slots are
 * mapped; other event types return an empty score list (caller should fall
 * back to the scrape path for those).
 */
export function parseMeetResult(
  rows: Record<string, string>[],
  gymnastId: string
): MsoMeetResult | null {
  const r = rows.find((row) => row.gymnastid === gymnastId);
  if (!r) return null;

  const isMens = r.EventType === 'ARTM';
  const scores: MsoApparatusScore[] = [];
  if (isMens) {
    for (let slot = 1; slot <= 6; slot++) {
      const apparatus = ARTM_SLOTS[slot];
      const value = num(r[`EventScore${slot}`]);
      const place = parsePlace(r[`EventPlace${slot}`]);
      // Keep only apparatus that were actually scored.
      if (value !== null) scores.push({ apparatus, value, place });
    }
  }

  const { level, division } = parseMsoLevel(r.level);
  return {
    gymnastId,
    meetId: r.meetid ?? '',
    meetName: r.MeetName ?? '',
    level,
    division,
    date: unixToIsoDate(r.UNIX_TIME),
    isMens,
    scores,
    allAroundScore: num(r.AAScore),
    allAroundPlace: parsePlace(r.AAPlace),
  };
}

export { ARTM_SLOTS };
