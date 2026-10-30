---
description: "Validate this repo's Claude Code setup: CLAUDE.md, settings and permissions, the guard hook, commands and agents. Read-only report."
---

# Validate Claude setup

Run every check below, read-only. Do not modify files. Never print an `.env` value or token; report only file and line.

## 1. CLAUDE.md
Exists at the repo root with sections: Where things live, Commands, Rules, Claude setup. Every path it names exists (`git ls-files` / `ls`); app paths are relative to `apps/gymnast-shoebox/`. Freshness: `git log -1 --format=%cs -- CLAUDE.md`; flag if older than the latest commit touching `apps/gymnast-shoebox/{app,lib,supabase}/` by more than 30 days.

## 2. Settings
1. `.claude/settings.json` parses (`jq . .claude/settings.json`).
2. `permissions.ask` has `Bash(git push:*)` and the `supabase`/`vercel` rules; `permissions.deny` has Read and Edit rules for `.env`, `.env.local`, `.env.*.local`.
3. `hooks.PreToolUse` registers `.claude/hooks/guard.sh` with matcher `Bash`.
4. `.claude/settings.local.json`, if present: gitignored (`git check-ignore -q`), contains no token-like strings (`eyJ`, `sk_`, `sb_secret_`, 32+ hex chars), and has no allow rule that defeats a shared ask rule (e.g. `Bash(git push:*)`) or refers to another project (MCP servers or paths outside this repo).

## 3. Guard hook
`.claude/hooks/guard.sh` exists and is executable. Feed it sample inputs with `jq -n --arg c '<cmd>' '{tool_name:"Bash",tool_input:{command:$c}}' | .claude/hooks/guard.sh` and confirm:
- asks: `git push --force`, `git reset --hard`, `rm -rf x`, `supabase db push`, `vercel --prod`, `cat .env.local`;
- passes (empty output): `git push -u gymnast-shoebox x`, `npm test`, `cat .env.example`, `git branch -d x`.

## 4. Commands and agents
Each `.claude/commands/*.md` and `.claude/agents/*.md` has YAML frontmatter on line 1 with a non-empty `description`; agents also have `name` matching the filename and a `tools` list. `security-reviewer` must not have Write or Edit.

## 5. Repo hygiene
`apps/gymnast-shoebox/.env.example` is tracked and lists every `process.env.*` name used under its `app/`, `lib/` and `proxy.ts`. No `.env*` file other than `.env.example` is tracked anywhere (`git ls-files '*.env*' '.env*'`).

## 6. Report

```
VALIDATION REPORT — gymnast-shoebox
CLAUDE.md:        <ok | issues>
Settings:         <ok | issues>
Guard hook:       <n/n cases as expected | failures>
Commands/agents:  <ok | issues>
Repo hygiene:     <ok | issues>
Recommended fixes:
  1. ...
```

Recommend fixes only; apply nothing.
