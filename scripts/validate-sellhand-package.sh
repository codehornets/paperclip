#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
package_root="$repo_root/company-packages/sellhand"
api_base="${SELLHAND_PAPERCLIP_URL:-http://127.0.0.1:3210}"

node --check "$package_root/scripts/generate-package.mjs"
node --check "$package_root/scripts/fixture-runner.mjs"
node --check "$package_root/scripts/bootstrap-local.mjs"
node --check "$package_root/scripts/local-workspace-config.mjs"
node --check "$package_root/scripts/runner-process.mjs"
node --check "$package_root/scripts/clear-local-state.mjs"
node --test "$package_root/tests/package.test.mjs"

node --input-type=module - "$package_root" <<'JS'
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
const root = process.argv[2];
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".artifacts"].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path); else files.push(path);
  }
}
await walk(root);
for (const path of files) {
  const body = await readFile(path, "utf8");
  if (/\b(git reset --hard|git push --force|COMMIT_FORMAT_SKIP|psql\b|DROP\s+(TABLE|DATABASE)|rm\s+-rf\s+["']?\/)/i.test(body)) {
    throw new Error(`Unsafe command pattern in ${path}`);
  }
  if ((path.endsWith(".md") || path.endsWith(".yaml")) && /\/home\/anga\//.test(body)) {
    throw new Error(`Machine-specific path in portable file ${path}`);
  }
}
console.log(`Static safety scan passed for ${files.length} files.`);
JS

if curl -fsS "$api_base/api/health" >/dev/null 2>&1; then
  pnpm --dir "$repo_root" paperclipai company import "$package_root" --dry-run --yes --paperclip-url "$api_base" --json >/dev/null
  printf 'Paperclip import preview passed at %s.\n' "$api_base"
else
  printf 'Local structural validation passed; import preview skipped because %s is not healthy.\n' "$api_base"
fi
