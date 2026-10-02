#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_base="${SELLHAND_PAPERCLIP_URL:-http://127.0.0.1:3210}"

if curl -fsS --max-time 3 "$api_base/api/health" >/dev/null 2>&1; then
  printf 'Sellhand Paperclip read path is healthy at %s.\n' "$api_base"
  exit 0
fi

printf 'Sellhand Paperclip read path is unavailable at %s; running the idempotent bootstrap recovery.\n' "$api_base"
"$repo_root/scripts/bootstrap-sellhand-local.sh"
curl -fsS --max-time 3 "$api_base/api/health" >/dev/null
printf 'Sellhand Paperclip read path recovered at %s.\n' "$api_base"
