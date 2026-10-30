// Raw shapes returned by the Between Ends results API
// (resultsapi.herokuapp.com). The API is undocumented: these types mirror the
// live responses, keeping the API's own abbreviated keys so a response can be
// typed without remapping. See docs/between-ends-api.md for what each key means.

export type BeEventType =
  | 'RankingEvent'
  | 'CombinedRankingEvent'
  | 'MatchEvent'
  | 'CustomPointsEvent'
  | 'SpecialEvent';

/** A row of `GET /tournaments/`. */
export type BeTournament = {
  id: number;
  tournament_name: string;
  location: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  /** Moves when the tournament's results change: the crawl's change feed. */
  updated_at: string;
  limg: string | null;
  rimg: string | null;
  bimg: string | null;
  msg: string;
  msg_link: string;
};

/** An event as listed by `GET /tournaments/:id` and `GET /events`. */
export type BeEventSummary = {
  id: number;
  display_order: number;
  event_type: BeEventType;
  event_name: string;
  msg: string;
  msg_link: string;
};

/** `GET /tournaments/:id`. The only place events are tied to a tournament. */
export type BeTournamentDetail = BeTournament & { events: BeEventSummary[] };

/** One entry in a ranking event (`rps[aid]`). */
export type BeRankingEntry = {
  /** Entry id, unique per event only. Scores are keyed by it. */
  aid: number;
  fnm: string;
  lnm: string;
  /** Membership number as typed by the organiser; may be blank or 'N/A'. */
  alt: string;
  /** Class/Div code, e.g. 'RU13W'. */
  cnd: string;
  tm: string;
  tgt: string[];
  /** Session ids (keys of the event's `tnl`). */
  tnl: number[];
  /** Round-total overrides, '|'-separated; empty when the arrows are the truth. */
  rtl: string;
  tbs: string;
  tb1?: number;
};

export type BeDivisionGroup = {
  nm: string;
  dor: number;
  /** Rank of the cut line; 0 means no cut. */
  cut: number;
  ars: { aid: number }[] | null;
};

/** `GET /events/:id` for a ranking event. */
export type BeRankingEvent = {
  /** Internal id: NOT the URL id. Key on the id you requested. */
  id: number;
  enm: string;
  etp: 'RankingEvent' | 'CombinedRankingEvent';
  dor: number;
  /** Rounds, ends per round, arrows per end. */
  rds: number;
  epr: number;
  ape: number;
  /** Scoring rule index (tie-breakers and valid arrows; see scoring.js). */
  srl: number;
  tnm: string;
  tdt: string;
  tlc: string;
  tnl: Record<string, { id: number; nm: string }>;
  nos: number;
  rps: Record<string, BeRankingEntry>;
  cgs: (BeDivisionGroup | null)[];
  hdn?: string;
  dld?: number;
  stb?: boolean;
  fita?: boolean;
  msg?: string;
  msg_link?: string;
};

/** `GET /events/:id/scores` for a ranking event: arrow string per `aid`. */
export type BeRankingScores = { ars: Record<string, string> };
