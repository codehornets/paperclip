import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";

const [mode, runtimeRootArg, repoRootArg, instanceId] = process.argv.slice(2);
if (!new Set(["clear", "reset"]).has(mode)) throw new Error("Mode must be clear or reset");
const runtimeRoot = resolve(runtimeRootArg);
const repoRoot = resolve(repoRootArg);
if (runtimeRoot === resolve("/") || runtimeRoot === repoRoot) throw new Error(`Refusing unsafe runtime root: ${runtimeRoot}`);
const ownerPath = resolve(runtimeRoot, "instance-owner.json");
if (!existsSync(ownerPath)) throw new Error(`Sellhand ownership marker is missing: ${ownerPath}`);
const owner = JSON.parse(readFileSync(ownerPath, "utf8"));
if (owner.repoRoot !== repoRoot || owner.instanceId !== instanceId || owner.companySlug !== "sellhand") throw new Error("Sellhand ownership marker does not match the requested runtime");

const instanceRoot = resolve(runtimeRoot, "instances", instanceId);
const targets = [
  resolve(runtimeRoot, "artifacts"),
  resolve(runtimeRoot, "logs"),
  resolve(instanceRoot, "logs"),
];
if (mode === "reset") {
  targets.push(
    resolve(runtimeRoot, "bootstrap-state.json"),
    resolve(instanceRoot, "db"),
    resolve(instanceRoot, "data", "storage"),
    resolve(instanceRoot, "data", "backups"),
    resolve(instanceRoot, "runtime-services"),
    resolve(instanceRoot, "runtime-service-logs"),
    resolve(instanceRoot, "workspaces"),
    resolve(instanceRoot, "projects"),
  );
}
for (const target of targets) {
  if (!target.startsWith(`${runtimeRoot}${sep}`)) throw new Error(`Refusing path outside runtime root: ${target}`);
  rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${target}`);
}
console.log(`${mode === "reset" ? "Reset" : "Cleared"} owned Sellhand local state under ${runtimeRoot}`);
