#!/usr/bin/env node
// POC stand-in for the database: turn a folder of cached Between Ends API
// responses into one JSON file per archer, shaped like the planned be_* tables
// (docs/between-ends-api.md). The archer page reads these files instead of the
// API, the same way it will read Supabase once the crawler exists.
//
// Usage: node scripts/build-archer-store.mjs <cache-dir> <out-dir> <membership-number>...
//
// Cache files are named like the discovery scan writes them:
//   tournaments_<id>.json, events_<id>.json, events_<id>_scores.json
// Output (<out-dir>/<number>.json) holds real people's results: keep it out of
// git (data/ is ignored).

import fs from 'node:fs';
import path from 'node:path';

const [cacheDir, outDir, ...wanted] = process.argv.slice(2);
if (!cacheDir || !outDir || wanted.length === 0) {
  console.error('usage: build-archer-store.mjs <cache-dir> <out-dir> <membership-number>...');
  process.exit(1);
}

// Mirrors normaliseAlt in lib/betweenends/entries.ts.
const normaliseAlt = (raw) => (raw ?? '').replace(/\D/g, '') || null;
const nameKey = (first, last) => `${(first ?? '').trim().toLowerCase()}|${(last ?? '').trim().toLowerCase()}`;
const read = (file) => {
  const p = path.join(cacheDir, file);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
};

const targets = new Set(wanted.map(normaliseAlt).filter(Boolean));
const stores = new Map(
  [...targets].map((id) => [id, { archer_id: id, built_at: new Date().toISOString(), tournaments: {}, events: {}, entries: [], match_rows: [] }]),
);

const tournamentFiles = fs.readdirSync(cacheDir).filter((f) => /^tournaments_\d+\.json$/.test(f));
let scanned = 0;

for (const file of tournamentFiles) {
  const t = read(file);
  if (!t?.events) continue;
  scanned++;
  const tournament = {
    id: t.id,
    name: t.tournament_name,
    location: t.location,
    start_date: t.start_date,
    end_date: t.end_date,
    updated_at: t.updated_at,
  };
  // Per archer in this tournament: ranking aids and name, for linking brackets.
  const found = new Map();

  for (const ev of t.events) {
    if (ev.event_type !== 'RankingEvent' && ev.event_type !== 'CombinedRankingEvent') continue;
    const e = read(`events_${ev.id}.json`);
    if (!e?.rps) continue;
    const scores = read(`events_${ev.id}_scores.json`);
    const divisionOf = new Map();
    for (const g of e.cgs ?? []) for (const a of g?.ars ?? []) divisionOf.set(a.aid, g.nm);

    for (const a of Object.values(e.rps)) {
      const id = normaliseAlt(a.alt);
      const store = id && stores.get(id);
      if (!store) continue;
      store.tournaments[t.id] = tournament;
      store.events[ev.id] = {
        id: ev.id,
        tournament_id: t.id,
        type: ev.event_type,
        name: ev.event_name,
        rounds: e.rds,
        ends_per_round: e.epr,
        arrows_per_end: e.ape,
        scoring_rule: e.srl,
        has_scores: !!scores,
      };
      // Division peers' totals, so the page can rank without the whole event.
      const peers = (e.cgs ?? [])
        .find((g) => g?.ars?.some((x) => x.aid === a.aid))
        ?.ars?.map((x) => ({ aid: x.aid, arrows: scores?.ars?.[String(x.aid)] ?? '', round_totals: e.rps[String(x.aid)]?.rtl ?? '' }));
      store.entries.push({
        event_id: ev.id,
        aid: a.aid,
        alt_raw: a.alt,
        alt_norm: id,
        first_name: (a.fnm ?? '').trim(),
        last_name: (a.lnm ?? '').trim(),
        team: (a.tm ?? '').trim(),
        division_code: (a.cnd ?? '').trim().toUpperCase(),
        division_name: divisionOf.get(a.aid) ?? null,
        targets: a.tgt ?? [],
        session_labels: (a.tnl ?? []).map((s) => e.tnl?.[String(s)]?.nm).filter(Boolean),
        arrows: scores?.ars?.[String(a.aid)] ?? null,
        round_totals: a.rtl ?? '',
        division_peers: scores ? peers ?? [] : null,
      });
      const f = found.get(id) ?? { aids: new Set(), names: new Set() };
      f.aids.add(a.aid);
      f.names.add(nameKey(a.fnm, a.lnm));
      found.set(id, f);
    }
  }

  if (found.size === 0) continue;
  for (const ev of t.events) {
    if (ev.event_type !== 'MatchEvent') continue;
    const e = read(`events_${ev.id}.json`);
    for (const g of e?.mgs ?? []) {
      for (const m of g.mrs ?? []) {
        for (const [id, f] of found) {
          const byAid = f.aids.has(m.aid) && f.names.has(nameKey(m.fnm, m.lnm));
          const byName = !byAid && f.names.has(nameKey(m.fnm, m.lnm));
          if (!byAid && !byName) continue;
          const store = stores.get(id);
          store.events[ev.id] ??= { id: ev.id, tournament_id: t.id, type: ev.event_type, name: ev.event_name };
          const opponent = g.mrs.find((o) => o.mrid !== m.mrid && Math.floor(o.mnm / 2) === Math.floor(m.mnm / 2));
          store.match_rows.push({
            event_id: ev.id,
            bracket: g.nm,
            mrid: m.mrid,
            match_no: m.mnm,
            rank: m.rnk,
            status: m.sts,
            set_score: m.fsc,
            opponent_team: opponent?.tm ?? null,
            linked_by: byAid ? 'aid' : 'name',
          });
        }
      }
    }
  }
}

fs.mkdirSync(outDir, { recursive: true });
for (const [id, store] of stores) {
  fs.writeFileSync(path.join(outDir, `${id}.json`), JSON.stringify(store));
  console.log(
    `${id}: ${Object.keys(store.tournaments).length} tournaments, ${store.entries.length} ranking entries, ${store.match_rows.length} match rows`,
  );
}
console.log(`scanned ${scanned} cached tournaments`);
