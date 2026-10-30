# Gymnast Shoebox — Claude Context

Mobile-first app where parents record their gymnasts' meet scores (MAG and WAG), import history from MeetScoresOnline (MSO), and chart consistency per apparatus. Public repo: never commit secrets or real athletes' data.

## Where things live
- **Monorepo** (SQ-015, moving to `shoebox`): the app lives in `apps/gymnast-shoebox/`; app paths below are relative to it. Root holds `package.json` (npm workspaces, Turborepo), `turbo.json`, `.github/`, `.claude/`, `.releaserc`. Shared packages will go in `packages/`. `apps/score-quiver/` is the archery sibling (its own Supabase project and login; not deployed yet, see its README). Releases run per app from its folder with `semantic-release-monorepo` (only commits touching that folder count).
- **App:** Next.js 16 App Router. Pages in `app/(main)/` (dashboard, scores/new, competitions/[id]/edit, import, insights, account, about) and `app/(auth)/login/`. Auth callback `app/auth/callback/route.ts`. Session refresh and login redirects in `proxy.ts` (Next 16's middleware).
- **Server actions:** `app/actions/` (gymnast, mso, settings) and colocated `actions.ts` files. Every action is a public endpoint: treat its arguments as untrusted input.
- **Logic:** `lib/` holds pure, tested helpers: `mso-api.ts` (JSON API client, query allowlist), `mso-parser.ts` (scrape parsing, `msoResultsUrl`), `insights.ts`, `constants.ts`, `competitions.ts` (`insertCompetitionWithScores`), `redirect.ts` (`safeNextPath`), `settings.ts` (`parseSettingUpdate`). Supabase clients in `lib/supabase/`.
- **UI:** `components/` (feature components) and `components/ui/` (shadcn/ui, generated: change via the shadcn CLI, don't hand-edit).
- **Database:** Supabase Postgres. Schema, RLS and the `competitions_with_scores` view are in `supabase/migrations/`. Tables: `gymnasts`, `competitions`, `scores` (unique per competition + apparatus), `user_settings`.
- **Tests:** Vitest, `lib/__tests__/` with MSO fixtures in `lib/__tests__/fixtures/`.
- **CI/CD:** `.github/workflows/`: `ci.yml` (lint, typecheck, test, build on PRs and main), `release.yml` (semantic-release on main), `vercel-checks.yml`, `supabase-keepalive.yml` (stopgap until the backend is self-hosted). Vercel deploys from GitHub; production is gymnastshoebox.elpeterson.com.
- **Env:** `.env.example` lists the three variables. `.env.local` (in `apps/gymnast-shoebox/`) holds real values: never read or print it.

## Commands
Run from the repo root (Turbo runs each app's script): `npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run build` (needs the two `NEXT_PUBLIC_SUPABASE_*` vars; placeholders work, every route is dynamic). Supabase CLI commands run from `apps/gymnast-shoebox/`. `/ship` runs all checks and prepares a PR; `/validate-setup` checks this Claude setup.

## Rules
- **Security invariants.** Every table has RLS scoped to `auth.uid()`; keep it that way in any new migration. Server actions also filter by `user.id` and validate input (whitelists, helpers in `lib/`). Never fetch a client-supplied URL server-side without an origin allowlist. Redirect targets go through `safeNextPath`. Writes that span tables use a helper that leaves no partial rows.
- **Schema changes** go in a new timestamped file in `supabase/migrations/`; never edit an applied migration. Claude never runs `supabase db push`, `db reset` or `migration repair`: it writes the file and the user applies it.
- **MSO:** read-only. Only the queries allowlisted in `lib/mso-api.ts`. Prefer the JSON API; the HTML scrape is the WAG/legacy fallback. Test fixtures must not add real minors' names beyond what is already there.
- **Git:** conventional commits (semantic-release reads them: `feat` → minor, `fix` → patch). Work on a branch (`feat/`, `fix/`, `chore/`, `docs/`), one PR per concern, never commit to `main`. Claude commits locally; the user pushes and opens PRs (`git push` always asks).
- **Done means checked:** lint, typecheck, tests and build pass before a commit is called done. New logic gets a pure helper in `lib/` with tests.

## Claude setup (`.claude/`)
`settings.json` (shared permissions; `git push` asks, `.env` reads denied) · `hooks/guard.sh` (forces a prompt on force-push, hard reset, `rm -r`, Supabase writes, Vercel prod and `.env` access) · `commands/ship.md`, `commands/validate-setup.md` · `agents/security-reviewer.md` (read-only review of auth, RLS, actions and outbound fetches; use before merging anything that touches them). Machine-specific allows go in the gitignored `settings.local.json`.
