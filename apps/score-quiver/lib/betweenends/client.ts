// Between Ends results API client (read-only).
//
// betweenends.com is a small, donation-funded site whose pages read a public
// JSON API on Heroku. This client is deliberately narrow and polite: only the
// five read paths the site itself uses (allowlisted), one request at a time
// with a minimum gap, conditional requests via ETag so an unchanged event
// costs a 304, and retries with backoff for Heroku's cold starts.
//
// Nothing here looks up an archer: the API can't. Archer views read the index
// the crawler builds from these calls.

import type {
  BeEventSummary,
  BeRankingEvent,
  BeRankingScores,
  BeTournament,
  BeTournamentDetail,
} from './types';

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

export const BE_API_BASE = 'https://resultsapi.herokuapp.com';

const USER_AGENT = 'ScoreQuiver/0.1 (+https://github.com/elpeterson/archers-shoebox)';

/** The only paths this client will request. */
const ALLOWED_PATHS = [
  /^\/tournaments\/$/,
  /^\/tournaments\/\d+$/,
  /^\/events$/,
  /^\/events\/\d+$/,
  /^\/events\/\d+\/scores$/,
];

export function isAllowedPath(path: string): boolean {
  return ALLOWED_PATHS.some((re) => re.test(path));
}

export type BeResponse<T> =
  | { status: 'ok'; data: T; etag: string | null }
  | { status: 'not-modified'; etag: string | null }
  | { status: 'not-found' };

export type ClientOptions = {
  fetch?: typeof fetch;
  /** Minimum gap between requests. Default 1000 ms. */
  minIntervalMs?: number;
  /** Attempts per request for network errors and 5xx. Default 3. */
  attempts?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createBeClient(options: ClientOptions = {}) {
  const doFetch = options.fetch ?? fetch;
  const minIntervalMs = options.minIntervalMs ?? 1000;
  const attempts = options.attempts ?? 3;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const sleep = options.sleep ?? realSleep;
  const now = options.now ?? Date.now;
  let nextSlot = 0;
  // Serialises requests so concurrent callers still respect the gap.
  let queue: Promise<unknown> = Promise.resolve();

  async function throttle() {
    const wait = nextSlot - now();
    if (wait > 0) await sleep(wait);
    nextSlot = now() + minIntervalMs;
  }

  async function request<T>(path: string, etag?: string | null): Promise<BeResponse<T>> {
    if (!isAllowedPath(path)) throw new Error(`Disallowed Between Ends path: ${path}`);
    const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': USER_AGENT };
    if (etag) headers['If-None-Match'] = etag;

    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await throttle();
      try {
        const res = await doFetch(`${BE_API_BASE}${path}`, {
          headers,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.status === 304) return { status: 'not-modified', etag: res.headers.get('etag') ?? etag ?? null };
        if (res.status === 404) return { status: 'not-found' };
        if (res.ok) return { status: 'ok', data: (await res.json()) as T, etag: res.headers.get('etag') };
        lastError = new Error(`Between Ends ${path} failed: HTTP ${res.status}`);
        if (res.status < 500) break;
      } catch (err) {
        lastError = err;
      }
      if (attempt < attempts) await sleep(2000 * attempt);
    }
    throw lastError;
  }

  function enqueue<T>(path: string, etag?: string | null): Promise<BeResponse<T>> {
    const run = queue.then(() => request<T>(path, etag));
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    tournaments: (etag?: string | null) => enqueue<BeTournament[]>('/tournaments/', etag),
    tournament: (id: number, etag?: string | null) =>
      enqueue<BeTournamentDetail>(`/tournaments/${intId(id)}`, etag),
    events: (etag?: string | null) => enqueue<BeEventSummary[]>('/events', etag),
    /** Ranking shape; check `etp` before trusting it for other event types. */
    event: (id: number, etag?: string | null) => enqueue<BeRankingEvent>(`/events/${intId(id)}`, etag),
    eventScores: (id: number, etag?: string | null) =>
      enqueue<BeRankingScores>(`/events/${intId(id)}/scores`, etag),
  };
}

export type BeClient = ReturnType<typeof createBeClient>;

function intId(id: number): number {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Invalid Between Ends id: ${id}`);
  return id;
}
