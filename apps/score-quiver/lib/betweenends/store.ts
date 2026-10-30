// An archer's stored Between Ends history, and the transforms the archer page
// needs from it.
//
// Rows mirror the planned be_* tables (docs/between-ends-api.md). For the POC
// they come from per-archer JSON files written by
// scripts/build-archer-store.mjs; swapping `loadArcherStore` for a Supabase
// query is the only change the page should need. Pages never call the Between
// Ends API: the crawler is the only thing that does.

import { decodeArrows, type DecodedArrows } from './arrows';
import { normaliseAlt, TEN_RING_RULES } from './entries';
import { parseDivision } from '@/lib/division';
import { resolveSessionDate } from '@/lib/scorecard/dates';
import type { EventRow } from '@/lib/stats';

export type StoredTournament = {
  id: number;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  updated_at: string;
};

export type StoredEvent = {
  id: number;
  tournament_id: number;
  type: string;
  name: string;
  rounds?: number;
  ends_per_round?: number;
  arrows_per_end?: number;
  scoring_rule?: number;
  has_scores?: boolean;
};

export type StoredEntry = {
  event_id: number;
  aid: number;
  alt_raw: string;
  alt_norm: string;
  first_name: string;
  last_name: string;
  team: string;
  division_code: string;
  division_name: string | null;
  targets: string[];
  session_labels: string[];
  arrows: string | null;
  round_totals: string;
  /** Everyone in the same division group, for ranking; null when scores weren't stored. */
  division_peers: { aid: number; arrows: string; round_totals: string }[] | null;
};

export type StoredMatchRow = {
  event_id: number;
  bracket: string;
  mrid: number;
  match_no: number;
  rank: number;
  status: number;
  set_score: number;
  opponent_team: string | null;
  /** 'aid' when the bracket reuses the ranking entry id; 'name' when only the name matched. */
  linked_by: 'aid' | 'name';
};

export type ArcherStore = {
  archer_id: string;
  built_at: string;
  tournaments: Record<string, StoredTournament>;
  events: Record<string, StoredEvent>;
  entries: StoredEntry[];
  match_rows: StoredMatchRow[];
};

/** A membership number safe to use as a lookup key, or null. */
export function archerIdFromParam(param: string): string | null {
  let raw = param;
  try {
    raw = decodeURIComponent(param);
  } catch {
    return null;
  }
  const id = normaliseAlt(raw);
  return id && id.length <= 10 ? id : null;
}

/** POC loader: `data/archers/<id>.json`. Returns null when the archer isn't stored. */
export async function loadArcherStore(archerId: string): Promise<ArcherStore | null> {
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  if (!/^\d{1,10}$/.test(archerId)) return null;
  const dir = process.env.BE_STORE_DIR ?? path.join(process.cwd(), 'data', 'archers');
  try {
    return JSON.parse(await readFile(path.join(dir, `${archerId}.json`), 'utf8')) as ArcherStore;
  } catch {
    return null;
  }
}

export type ArcherResult = {
  /** `be-<event>-<aid>`: unique across the archer's history. */
  key: string;
  tournament: StoredTournament;
  event: StoredEvent;
  entry: StoredEntry;
  shotOn: string | null;
  decoded: DecodedArrows | null;
  /** Rank by total within the division group (ties share), and the group size. */
  rank: { place: number; of: number } | null;
  /** 10-ring, standard arrows, fully shot: fair to compare with other results. */
  comparable: boolean;
};

/** One result per stored ranking entry, newest first. */
export function archerResults(store: ArcherStore): ArcherResult[] {
  const results: ArcherResult[] = [];
  for (const entry of store.entries) {
    const event = store.events[String(entry.event_id)];
    const tournament = event && store.tournaments[String(event.tournament_id)];
    if (!event || !tournament) continue;
    const layout = {
      rounds: event.rounds ?? 0,
      endsPerRound: event.ends_per_round ?? 0,
      arrowsPerEnd: event.arrows_per_end ?? 0,
    };
    const decoded = entry.arrows == null ? null : decodeArrows(entry.arrows, layout, entry.round_totals);
    results.push({
      key: `be-${entry.event_id}-${entry.aid}`,
      tournament,
      event,
      entry,
      shotOn: resolveSessionDate(entry.session_labels[0] ?? null, tournament.start_date, tournament.end_date),
      decoded,
      rank: decoded ? divisionRank(entry, layout, decoded.total) : null,
      comparable:
        !!decoded && decoded.complete && decoded.standard && TEN_RING_RULES.has(event.scoring_rule ?? -1),
    });
  }
  return results.sort(
    (a, b) => (b.shotOn ?? '').localeCompare(a.shotOn ?? '') || b.event.id - a.event.id,
  );
}

function divisionRank(
  entry: StoredEntry,
  layout: Parameters<typeof decodeArrows>[1],
  total: number,
): ArcherResult['rank'] {
  const peers = entry.division_peers;
  if (!peers || peers.length === 0) return null;
  const totals = peers.map((p) => decodeArrows(p.arrows, layout, p.round_totals).total);
  return { place: 1 + totals.filter((t) => t > total).length, of: peers.length };
}

/**
 * A result as the stats code's EventRow. Between Ends doesn't record distance
 * or face, so the setup is bow style + indoor/outdoor, guessed from the layout
 * (3-arrow ends indoor, longer ends outdoor) until the crawler can do better.
 */
export function toEventRow(r: ArcherResult): EventRow {
  const arrowsPerEnd = r.event.arrows_per_end ?? 0;
  return {
    id: r.key,
    name: r.tournament.name,
    shot_on: r.shotOn,
    start_date: r.tournament.start_date,
    bow_style: parseDivision(r.entry.division_code).bowStyle,
    environment: arrowsPerEnd === 3 ? 'indoor' : 'outdoor',
    distance_m: null,
    face_cm: null,
    arrows_per_end: arrowsPerEnd,
    rounds: r.decoded?.rounds ?? [],
  };
}
