#!/bin/bash
# PreToolUse guard: force a permission prompt for destructive or production-facing
# Bash commands, even when an allow rule would otherwise let them through.
input=$(cat)
[ "$(jq -r '.tool_name // ""' <<<"$input")" = "Bash" ] || exit 0
text=$(jq -r '.tool_input.command // ""' <<<"$input")

# git: force push, hard reset, forced clean, branch force-delete
pattern='git[[:space:]]+push[[:space:]].*(--force|-f([[:space:]]|$)|--mirror|--delete|:[^[:space:]])|git[[:space:]]+(reset[[:space:]]+--hard|clean[[:space:]]+-[a-zA-Z]*f|branch[[:space:]]+-D)'
# recursive delete
pattern+='|(^|[[:space:];&|])rm[[:space:]]+(-[a-zA-Z]*[rR]|--recursive)'
# Supabase writes to a linked project, Vercel production and env changes
pattern+='|supabase[[:space:]]+(db[[:space:]]+(push|reset)|migration[[:space:]]+(repair|up|squash)|projects[[:space:]]+delete|secrets[[:space:]]+(set|unset))'
pattern+='|vercel[[:space:]]+(.*--prod|deploy[[:space:]].*--prod|env[[:space:]]+(add|rm|pull)|remove|rm[[:space:]])'
# real env files (the example file is fine)
pattern+='|\.env(\.[a-z]+)?\.local|\.env([[:space:]"'\'';|&]|$)'

if grep -Eq -- "$pattern" <<<"$text"; then
  jq -n --arg r "Destructive, production or .env operation detected by .claude/hooks/guard.sh — confirm before it runs." \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
fi
exit 0
