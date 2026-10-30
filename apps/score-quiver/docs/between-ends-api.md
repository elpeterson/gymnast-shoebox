# Between Ends results API: discovery

Findings from probing `resultsapi.herokuapp.com` (the JSON backend behind betweenends.com) on 2026-10-29, and what they mean for Score Quiver's archer view. The API is undocumented, so everything here comes from the live responses and the site's own front-end code (`index.html`, `tournament/:id`, `tournament/:id/event/:id`, `scoring/1.0.7/scoring.js`).

## TL;DR
- **Five read endpoints, no auth, open CORS** (`Access-Control-Allow-Origin: *`), weak ETags that return `304` on `If-None-Match`.
- **There is no archer endpoint and no search.** Query strings are ignored. The only way to find "every result for one archer" is to crawl tournaments → events → entries and build our own index.
- **`aid` is a per-event entry ID, not a person.** The cross-tournament key is `alt`, the archer's membership number (USA Archery style, usually 6 digits). It was filled on 95% of 1,100 sampled entries. Name + team + division is the fallback.
- **Arrows come as one string per entry** (`"T98M7…"`), one character per arrow, decoded by a fixed table. Every arrow is available, so all of Score Quiver's insights work from the API alone.
- **The membership number is the way in.** Every archer knows it, and it's what `alt` holds. PDF upload is a secondary path, for confirming a match or recovering results where `alt` was left blank.

## Endpoints

Base: `https://resultsapi.herokuapp.com`

| Endpoint | Returns | Size (today) | Notes |
|---|---|---|---|
| `GET /tournaments/` | Array of every tournament | ~465 KB, 1,560 rows (2017-12 → 2027-03) | No events inside. `updated_at` changes when results change, which makes it the crawl's change feed. |
| `GET /tournaments/:id` | One tournament + `events[]` | ~1 KB | The **only** place that links events to a tournament. |
| `GET /events` | Array of every event (id, type, name, display order) | ~447 KB, 3,532 rows | No `tournament_id`, so it can't replace the per-tournament call. |
| `GET /events/:id` | Event setup, archers (`rps`), divisions (`cgs`), sessions (`tnl`) | 2–25 KB | Shape depends on `event_type` (below). |
| `GET /events/:id/scores` | `{ "ars": { "<aid>": "<arrows>" } }` | 1–8 KB | Ranking: value is the arrow string. Match: value is `{avs, tb, sts}` keyed by match-row id. |

Probed and **404**: `/archers`, `/archers/:id`, `/events/:id/archers`, `/scores/:id`, `/tournaments/:id/events`, `/teams`.

Event types seen in `/events`: RankingEvent 2,369 · MatchEvent 495 · CustomPointsEvent 487 · CombinedRankingEvent 173 · SpecialEvent 8. The site routes Ranking to `/event/`, Match to `/matchevent/`, Special and CustomPoints to `/specialevent/`.

Quirk: the `id` field *inside* `/events/:id` is a different number from the URL id (e.g. `/events/6845` returns `"id": 4378`). Always key on the URL id.

## Data layout

### Tournament (`/tournaments/:id`)
```jsonc
{
  "id": 3793, "tournament_name": "2026 Quest Spooktacular",
  "location": "Quest Archery, Worcester, MA",
  "start_date": "2026-10-23", "end_date": "2026-10-25",
  "updated_at": "2026-10-25T19:45:23.038Z",
  "limg": "main_logo.png", "rimg": "...", "bimg": "...",   // logos/banner
  "msg": "...", "msg_link": "https://www.usarchery.org/events/...",
  "events": [{ "id": 6845, "display_order": 1, "event_type": "RankingEvent", "event_name": "Ranking Round", "msg": "", "msg_link": "" }]
}
```

### Ranking event (`/events/:id`), with the abbreviations decoded
| Key | Meaning | Example |
|---|---|---|
| `enm` / `etp` / `dor` | event name / type / display order | `"Ranking Round"`, `"RankingEvent"`, `1` |
| `tnm` / `tdt` / `tlc` | tournament name / date range (display string) / location | |
| `rds` / `epr` / `ape` | rounds / ends per round / arrows per end | `2`, `10`, `3` → 60 arrows |
| `srl` | scoring rule index (tie-breakers + valid arrows; table below) | `0` = WA indoor |
| `tnl` | sessions: `{ id: { id, nm } }`, where `nm` is the label Score Quiver already parses for the day shot | `"…, Saturday 9am"` |
| `nos` | number of sessions | |
| `rps` | **entries**, keyed by `aid` (below) | |
| `cgs` | **divisions**: `[{ nm, dor, cut, ars: [{aid}] }]` (an entry's division name comes from whichever group lists its `aid`) | `"Recurve Senior Men"` |
| `hdn` | 5 flags: hide avg, hide arrow count, hide scorecard, hide target, hide session | `"00000"` |
| `dld` | scorecard PDF download enabled | `1` |
| `stb`, `fita` | special tie-break, FITA flag | |

Entry (`rps[aid]`):
| Key | Meaning |
|---|---|
| `aid` | entry id, **unique per event** (scores are keyed by it) |
| `fnm`, `lnm` | first, last name |
| `alt` | **membership number**: the cross-event identity. Usually `999999`; also seen with a letter suffix, a leading space, `N/A`, or empty |
| `cnd` | division code, e.g. `CU21M`, `RU13W` (same as the card's Class/Div) |
| `tm` | team/club |
| `tgt` | target assignment(s), e.g. `["7B"]` |
| `tnl` | session id(s) |
| `rtl` | round-total overrides, `|`-separated (when set, they win over the arrow sum) |
| `tbs` | tie-break overrides |

### Scores (`/events/:id/scores`)
`ars[aid]` is one string, `rds × epr × ape` characters long. Characters past that length are shoot-off arrows. Arrows within an end are sorted, as on the PDF.

Arrow table (from `scoring.js`):
| Char | Value | Shown | | Char | Value | Shown |
|---|---|---|---|---|---|---|
| `M` `0` | 0 | M/0 | | `W` | 5 | X (NFAA) |
| `1`–`9` | 1–9 | | | `Y` | 11 | X |
| `T` | 10 | 10 | | `Z` | 6 | X (irregular NFAA) |
| `X` | 10 | X | | `a` `b` `d` | 11 `12` `14` | 3-D |
| `E` | — | not shot yet | | `!` | 0 | misc |

`srl` tie-breakers: 0 WA indoor (10s, 9s) · 1 WA outdoor (10+X, X) · 2 OAS ranking (10s) · 3 WA field (6s, 5s) · 4 IBO 3-D (11s) · 5 ASA 3-D (12s) · 6 NFAA indoor (Xs) · 8 WA indoor, no TB · 9 Lancaster (11s, 10s) · 10 OAS league · 12 NFAA field · 13 Easton scholarship (X, 10, 9) · 14 irregular NFAA · 15 ESDF 3-D · 16 WA 3-D · 17 WA outdoor (X, 10) · 18 IBO 4-H.

Ranking on the site: total desc → tie-break 1 → 2 → 3 → first name → last name, with equal values sharing a rank. `cut` > 0 marks the cut line.

### Match event (`/events/:id`, `etp: "MatchEvent"`)
`mgs[]` are brackets: `{ nm, str (size), srl, epm (ends/match), ape, met, ro, schm, mrs[], qrnk[] }`.
- `mrs[]`: match rows `{ mrid, mnm (match #), rnk, aid, fnm, lnm, tgt, tm, sts, fsc }`. `/scores` is keyed by **`mrid`**: `{ avs, tb, sts }`.
- `qrnk[]`: the seeding list, with each qualifier's full arrow string (`avs`), `qscr`, `qtb1`, `rnk`. It duplicates the ranking round, so it's useful as a cross-check.
- Match entries carry **no `alt`**: link them to a person through the same tournament's ranking entry (same `aid` range / name + team).

### Custom points event (`etp` absent)
A different shape: `{ data: [[{ cnd_name, column_label, scores: { aid: { points, rank, score } } }]], archers: { aid: { fname, lname, home_state } } }`. These are often team or school standings (OAS). `/scores` echoes the same body. Low value for an individual archer view; skip in MVP.

Not yet sampled: `CombinedRankingEvent`, `SpecialEvent`, outdoor ranking rounds with `X`, and a 3-D event.

## What this means for Score Quiver

### 1. We need our own index (a crawler)
There's no "archer → results" lookup, so the archer view reads from tables we fill:

```
be_tournaments(id, name, location, start_date, end_date, updated_at, etag, crawled_at)
be_events(id, tournament_id, type, name, rounds, ends_per_round, arrows_per_end,
          scoring_rule, sessions jsonb, etag, crawled_at)
be_entries(event_id, aid, alt_raw, alt_norm, first_name, last_name, team,
           division_code, division_name, targets text[], session_ids int[],
           arrows text, round_totals text, tiebreaks text, rank, total)
  primary key (event_id, aid);  index on alt_norm;  index on lower(last_name, first_name)
```

- **Backfill:** 1 + 1,560 tournament calls + ~2 × 3,500 event calls ≈ 8.6k requests. At 1 request a second that's about 2.5 hours, run once.
- **Incremental:** pull `/tournaments/` (one call), re-crawl only tournaments whose `updated_at` moved, and send `If-None-Match` so unchanged events cost a `304`. Tournaments in progress get polled more often.
- **Volume estimate:** about 55 entries per ranking event in the sample, so roughly 150–200k entries. That fits easily in Supabase free tier.
- **Where it runs:** a scheduled GitHub Action or Vercel cron writing with the service role. The `be_*` tables are public cache data: anyone can read, only the crawler writes, and none of it carries `user_id`. That's a deliberate exception to the "RLS by `auth.uid()`" rule, so it needs writing down in the migration.
- **Be a good neighbour:** Between Ends is a one-person, Ko-fi-supported Heroku app. Keep a ~1 req/s ceiling, set a descriptive `User-Agent` with a contact, and consider asking the maintainer before the backfill.

### 2. Identity: what is an "ArcherID"
- Primary: `alt_norm` (the USA Archery membership number) = `alt` trimmed, digits only (`"123456C"` → `123456`?). Whether the suffix is meaningful (club? a typo?) is an open question, so keep `alt_raw` too.
- Fallback when `alt` is blank or `N/A` (~5%): offer "possible matches" by normalised name + team + division age band, which the user confirms. Never merge them automatically.
- The MVP URL is `/archer/<alt>`: all tournaments, every score, trends, PBs, per-setup comparisons. This reuses `lib/stats.ts` and `lib/division.ts`.

### 3. Finding your ArcherID
Every archer knows their USA Archery membership number, and that number is what `alt` holds, so the number *is* the ArcherID.
1. **Primary: enter the membership number.** A lookup on `be_entries.alt_norm` goes straight to `/archer/<number>`.
2. **Fallback: upload a scorecard PDF** (existing parser) for entries where the organiser left `alt` blank, or to check that a number matches the right person. The card gives tournament name, event, name, division, target and session. Match tournament by name + date, then the entry by name + division + target, then read `alt`. The PDF is parsed in the browser and not stored in MVP.
3. **Unlinked results:** entries with a blank `alt` (~5%) show as "possible matches" on the archer page (same name + team + division age band) for the user to confirm. They're never merged automatically.
4. Name search, **post-MVP** (see privacy below).

### 4. Fit with the existing schema
Existing `archers/events/rounds/ends` stay as the logged-in, user-owned layer. Later, "claim archer" stores `archers.alt_id`. The archer view then merges API entries with any PDF or manual events, deduped on tournament + date + division. `events.source` gains `'betweenends_api'`. Converting an API entry to `rounds/ends` is a straight split of the arrow string by `epr × ape`.

### 5. Privacy (decide before shipping a public page)
Between Ends already publishes names and scores per tournament. A single page that **aggregates one person's full history by membership number** is new, and many of these archers are minors. Suggested MVP guardrails:
- Public lookup by ID only: no name search and no archer directory.
- `noindex` on archer pages.
- No membership number shown on the page.
- No storing PDFs without an account.

## Open questions
1. What do `alt` suffixes like `C` mean, and is the same person ever listed under two numbers?
2. Do `CombinedRankingEvent` / `SpecialEvent` carry `alt` and arrows? (Sample before the crawler handles them.)
3. Does `tournaments.updated_at` change on every score edit, or only on setup changes? This decides whether it's a reliable change feed.
4. Should we contact the Between Ends maintainer before the backfill? It's a courtesy, and they might offer a bulk export.
5. MVP privacy guardrails above: agree or adjust.

## Proposed next steps
1. `lib/betweenends/` holds a typed client (allowlisted paths only, ETag-aware, rate-limited) plus decoders (`decodeArrows`, `entryTotals`, `normaliseAlt`), tested against redacted fixtures.
2. A migration for the `be_*` tables with public-read RLS.
3. A crawler script, run locally first against ~20 tournaments.
4. An `/archer/[alt]` page built on the existing stats.
5. PDF → `alt` lookup on the import page.
