#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_base="${SELLHAND_PAPERCLIP_URL:-http://127.0.0.1:3210}"
runtime_root="${SELLHAND_PAPERCLIP_HOME:-$repo_root/.paperclip-local/sellhand}"
instance_id="${SELLHAND_PAPERCLIP_INSTANCE:-sellhand-local}"
port="${SELLHAND_PAPERCLIP_PORT:-3210}"
startup_timeout_seconds="${SELLHAND_PAPERCLIP_STARTUP_TIMEOUT_SECONDS:-900}"
log_dir="$runtime_root/logs"
mkdir -p "$log_dir"
owner_file="$runtime_root/instance-owner.json"
server_healthy=false
if curl -fsS "$api_base/api/health" >/dev/null 2>&1; then server_healthy=true; fi

if [[ ! "$startup_timeout_seconds" =~ ^[1-9][0-9]*$ ]]; then
  printf 'SELLHAND_PAPERCLIP_STARTUP_TIMEOUT_SECONDS must be a positive integer.\n' >&2
  exit 1
fi

# Current Paperclip refuses to start from a linked Git worktree without the
# repo-local environment marker. This bootstrap already supplies an isolated
# home, instance, and port explicitly, so create only the ignored marker rather
# than cloning or seeding a second worktree instance.
if [[ -f "$repo_root/.git" && ! -e "$repo_root/.paperclip/.env" ]]; then
  mkdir -p "$repo_root/.paperclip"
  printf '# Managed by the Sellhand isolated bootstrap.\n' >"$repo_root/.paperclip/.env"
  chmod 600 "$repo_root/.paperclip/.env"
fi

node --input-type=module - "$owner_file" "$repo_root" "$instance_id" "$api_base" "$server_healthy" <<'JS'
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
const [ownerFile, repoRoot, instanceId, apiBaseUrl, serverHealthy] = process.argv.slice(2);
const expected = { schemaVersion: 1, repoRoot, instanceId, apiBaseUrl, companySlug: "sellhand" };
if (existsSync(ownerFile)) {
  const current = JSON.parse(readFileSync(ownerFile, "utf8"));
  for (const [key, value] of Object.entries(expected)) {
    if (current[key] !== value) throw new Error(`Sellhand instance owner mismatch for ${key}`);
  }
} else {
  if (serverHealthy === "true") throw new Error("Refusing to claim an already-running Paperclip endpoint without an ownership marker");
  writeFileSync(ownerFile, `${JSON.stringify(expected, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
}
chmodSync(ownerFile, 0o600);
JS

"$repo_root/scripts/validate-sellhand-package.sh"

if [[ "$server_healthy" != true ]]; then
  command -v setsid >/dev/null 2>&1 || {
    printf 'setsid is required to start the isolated Sellhand Paperclip runner safely.\n' >&2
    exit 1
  }
  setsid bash -c '
    cd "$1"
    exec env PAPERCLIP_HOME="$2" PAPERCLIP_INSTANCE_ID="$3" PORT="$4" pnpm dev:once
  ' _ "$repo_root" "$runtime_root" "$instance_id" "$port" >>"$log_dir/dev-runner.log" 2>&1 </dev/null &
  runner_pid=$!
  node "$repo_root/company-packages/sellhand/scripts/runner-process.mjs" record "$runtime_root/dev-runner.pid" "$runner_pid" "$repo_root" "$instance_id"
  ready=false
  for _attempt in $(seq 1 "$startup_timeout_seconds"); do
    if curl -fsS "$api_base/api/health" >/dev/null 2>&1; then ready=true; break; fi
    if ! kill -0 "$runner_pid" 2>/dev/null; then
      printf 'Paperclip runner exited before health became ready. See %s\n' "$log_dir/dev-runner.log" >&2
      exit 1
    fi
    sleep 1
  done
  if [[ "$ready" != true ]]; then
    printf 'Timed out after %s seconds waiting for %s. See %s\n' "$startup_timeout_seconds" "$api_base" "$log_dir/dev-runner.log" >&2
    exit 1
  fi
fi

SELLHAND_PAPERCLIP_HOME="$runtime_root" SELLHAND_PAPERCLIP_INSTANCE="$instance_id" node "$repo_root/company-packages/sellhand/scripts/bootstrap-local.mjs" "$api_base"
SELLHAND_PAPERCLIP_HOME="$runtime_root" SELLHAND_PAPERCLIP_INSTANCE="$instance_id" "$repo_root/scripts/smoke-test-sellhand.sh"

printf '\nRollback and cleanup:\n'
printf '  %q\n' "$repo_root/scripts/stop-sellhand-local.sh"
printf '  Delete the Sellhand company through the board or supported company-delete CLI before removing isolated runtime state.\n'
printf '  Runtime state: %s\n' "$runtime_root"
