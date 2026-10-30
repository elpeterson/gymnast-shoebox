// Flatten a Between Ends ranking event into one row per entry.
//
// The identity rule: an entry's `aid` only means something inside its event.
// The person behind it is the membership number in `alt`, which organisers
// type by hand, so it arrives with stray spaces, letter suffixes or 'N/A'.
// `normaliseAlt` reduces it to digits; entries without one stay unlinked and
// are only ever matched to an archer by someone confirming it.

import { decodeArrows, type DecodedArrows } from './arrows';
import type { BeRankingEvent, BeRankingScores } from './types';

/**
 * Scoring rules (`srl`) shot on a 10-ring target face: WA indoor/outdoor, OAS,
 * Easton. Field, 3-D and NFAA rules score on other scales, so their totals
 * don't compare with Score Quiver's other events even when the arrow
 * characters look ordinary (a field round is all 1-6).
 */
export const TEN_RING_RULES: ReadonlySet<number> = new Set([0, 1, 2, 8, 10, 13, 17]);

/** Membership number reduced to digits, or null when there isn't one. */
export function normaliseAlt(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits === '' ? null : digits;
}

export type RankingEntry = {
  eventId: number;
  aid: number;
  /** Normalised membership number: the cross-tournament archer id. */
  archerId: string | null;
  altRaw: string;
  firstName: string;
  lastName: string;
  team: string;
  divisionCode: string;
  /** Name of the division group listing this entry, e.g. 'Recurve U13 (Bowman) Women'. */
  divisionName: string | null;
  targets: string[];
  /** Session labels, e.g. 'Quest Indoor Range, Saturday 9am'. */
  sessions: string[];
  arrowsPerEnd: number;
  scoringRule: number;
  /** 10-ring scoring with standard arrows: safe for like-for-like stats. */
  tenRing: boolean;
  arrows: string;
  decoded: DecodedArrows;
};

/**
 * One row per entry in `event`. `eventId` is the id the event was requested
 * by (the body's own `id` is a different, internal number).
 */
export function rankingEntries(
  eventId: number,
  event: BeRankingEvent,
  scores: BeRankingScores | null,
): RankingEntry[] {
  const divisionOf = new Map<number, string>();
  for (const group of event.cgs ?? []) {
    for (const { aid } of group?.ars ?? []) divisionOf.set(aid, group!.nm);
  }
  const layout = { rounds: event.rds, endsPerRound: event.epr, arrowsPerEnd: event.ape };

  return Object.values(event.rps ?? {}).map((e) => {
    const arrows = scores?.ars?.[String(e.aid)] ?? '';
    const decoded = decodeArrows(arrows, layout, e.rtl ?? '');
    return {
      eventId,
      aid: e.aid,
      archerId: normaliseAlt(e.alt),
      altRaw: e.alt ?? '',
      firstName: (e.fnm ?? '').trim(),
      lastName: (e.lnm ?? '').trim(),
      team: (e.tm ?? '').trim(),
      divisionCode: (e.cnd ?? '').trim().toUpperCase(),
      divisionName: divisionOf.get(e.aid) ?? null,
      targets: e.tgt ?? [],
      sessions: (e.tnl ?? []).map((id) => event.tnl?.[String(id)]?.nm).filter((nm): nm is string => !!nm),
      arrowsPerEnd: event.ape,
      scoringRule: event.srl,
      tenRing: TEN_RING_RULES.has(event.srl) && decoded.standard,
      arrows,
      decoded,
    };
  });
}
