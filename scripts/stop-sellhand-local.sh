#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_root="${SELLHAND_PAPERCLIP_HOME:-$repo_root/.paperclip-local/sellhand}"
instance_id="${SELLHAND_PAPERCLIP_INSTANCE:-sellhand-local}"
pid_file="$runtime_root/dev-runner.pid"

node "$repo_root/company-packages/sellhand/scripts/runner-process.mjs" stop "$pid_file" "$repo_root" "$instance_id"
printf 'Isolated Sellhand state was preserved under %s\n' "$runtime_root"
