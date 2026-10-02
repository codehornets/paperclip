#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
runtime_root="${SELLHAND_PAPERCLIP_HOME:-$repo_root/.paperclip-local/sellhand}"
instance_id="${SELLHAND_PAPERCLIP_INSTANCE:-sellhand-local}"

SELLHAND_PAPERCLIP_HOME="$runtime_root" SELLHAND_PAPERCLIP_INSTANCE="$instance_id" "$repo_root/scripts/stop-sellhand-local.sh"
node "$repo_root/company-packages/sellhand/scripts/clear-local-state.mjs" clear "$runtime_root" "$repo_root" "$instance_id"
