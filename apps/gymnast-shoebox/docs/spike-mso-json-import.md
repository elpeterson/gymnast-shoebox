# Spike: MSO JSON API import (identity + data equivalence)

**Branch:** `feat/mso-json-import-spike`
**Date:** 2026-08-18
**Question:** Can we upgrade the MSO import from HTML scraping to the documented
JSON API, and does the JSON API give us the `level` / `division` the scraper
drops? Gating unknown: does Shoebox's stored `mso_id` (the "Athlete ID" the
scraper uses) equal the JSON API's `gymnastid`?

All checks below were run live against meetscoresonline.com on 2026-08-18,
read-only.

## Finding 1 — `mso_id` IS `gymnastid` ✅ (the gate is clear)

The same numeric id resolves to the same athlete on both paths:

| Path | Call | Result |
|---|---|---|
| Scrape (current) | `GET Athlete.MyScores/539672` | page titled **"Elias Edwards Gymnast ZnZ Gym"**, 44 result links |
| JSON API (new) | `lookup_gymnast(p_gymnastid=539672)` | **Elias Edwards**, 44 meets, usagnum 1192423 |

So the value already stored in `gymnasts.mso_id` can be passed straight to the
JSON API as `p_gymnastid`. **No identity-resolution step is needed** — this was
the main risk and it's retired.

## Finding 2 — JSON API captures level + division; the scraper does not ✅

`lookup_scores2(p_meetid)` returns structured fields per gymnast per meet:

```
scored gymnast: Asher Corbett | level: J6 | div: Junior 16 | EventType: ARTM
slots FX/PH/SR/VT/PB/HB: 12.400 11.994 11.550 12.581 11.450 11.531
AA: 71.506  place 8
distinct (level,div) at this meet: (J6,Junior 16) (J7,Junior 17) (SR,Senior)
```

- `level` (`J6`) and `div` (`Junior 16`) come through cleanly — these are exactly
  the Level/Division dimension the consistency graph now filters on, and exactly
  what the current scrape (`app/actions/mso.ts`) throws away.
- Apparatus scores arrive as numbered slots `EventScore1..6` in Olympic order,
  keyed by `EventType` (`ARTM` = men). Start values in `FigStartVal1..6`.

## Finding 3 — behaviors to design around

- **`lookup_scores2` filters by meet, not by gymnast.** Passing `p_gymnastid`
  did not narrow the 95-row meet result; filter to the athlete client-side on
  `gymnastid`. (Athlete history across meets comes from `lookup_gymnast`, which
  returns one row per meet — matches the earlier consistency findings.)
- **Unscored meets return all-zero slots** (e.g. Edwards at meet 36935 before
  his session ran). `0.000000` / empty = "not scored", map to null (same rule
  the graph already uses).
- **Olympic-order slots are men's (ARTM).** Women's (ARTW) uses a different slot
  layout; keep the WAG path free-text / discipline-aware, consistent with the
  form change already shipped.

## Conclusion

The migration is viable and low-risk. Recommended next steps (implementation,
separate from this spike):

1. `lib/mso-api.ts` — typed, read-only client, hardcoded query allowlist
   (`lookup_gymnast`, `lookup_scores2`, `find_event`, `lookup_meet`,
   `top_scores`), real User-Agent, low rate.
2. JSON-based `fetchMsoMeetsApi` / `importMsoMeetApi` in `app/actions/mso.ts`
   that populate `level` + `division` and map slots -> apparatus ids.
3. Reconciliation vitest: same meet scraped vs JSON, diff scores/placements,
   from a captured fixture (offline).
4. Keep scrape as fallback; JSON becomes default. Drop organiser contact fields;
   store only hashed usagnum.
