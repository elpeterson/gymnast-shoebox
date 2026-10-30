---
description: "Check, commit and prepare a PR for the current work: lint, typecheck, tests and build must pass; conventional commit on a branch; the user pushes."
argument-hint: "[short description of the change]"
---

# Ship

Take the working tree to a commit that is ready for a PR. `$ARGUMENTS` is an optional description of the change.

## 1. Branch
If on `main`, stop and propose a branch name (`feat/`, `fix/`, `chore/`, `docs/` + kebab-case) based on the diff, then create it with `git checkout -b`. Never commit to `main`.

## 2. Checks (all must pass)
Run in order and stop at the first failure; report the failing output and offer to fix it:
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test`
4. `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=placeholder NEXT_TELEMETRY_DISABLED=1 npm run build`

## 3. Review the diff
Read `git diff` (staged and unstaged) and flag before committing:
- any secret, token, `.env` content or real athlete data;
- changes to auth, server actions, `proxy.ts`, outbound `fetch`, or `supabase/migrations/`. For these, recommend running the `security-reviewer` agent first and wait for the user's answer;
- new logic in `lib/` without a test.

## 4. Commit
Stage only files that belong to this change (never `.env*` other than `.env.example`). Write a conventional commit (`type(scope): summary`, body explaining why) that semantic-release will classify correctly: `feat` for user-visible features, `fix` for bugs, `chore`/`docs`/`ci`/`test`/`refactor` otherwise. Show the message and commit.

## 5. Hand off
Do not push. Print the exact command for the user:

```
! git push -u gymnast-shoebox <branch> && gh pr create --fill
```

and a two-line summary: what changed, and which checks passed.
