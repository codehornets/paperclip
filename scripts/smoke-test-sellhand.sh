#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_base="${SELLHAND_PAPERCLIP_URL:-http://127.0.0.1:3210}"
runtime_root="${SELLHAND_PAPERCLIP_HOME:-$repo_root/.paperclip-local/sellhand}"
state_path="$runtime_root/bootstrap-state.json"
artifact_dir="$runtime_root/artifacts"

curl -fsS "$api_base/api/health" >/dev/null
node "$repo_root/company-packages/sellhand/scripts/fixture-runner.mjs" all "$artifact_dir"
node --test "$repo_root/company-packages/sellhand/tests/package.test.mjs"

node --input-type=module - "$state_path" "$artifact_dir" <<'JS'
import { readFile } from "node:fs/promises";
import { join } from "node:path";
const [statePath, artifactDir] = process.argv.slice(2);
const state = JSON.parse(await readFile(statePath, "utf8"));
const sliceA = JSON.parse(await readFile(join(artifactDir, "vertical-slice-a.json"), "utf8"));
const sliceB = JSON.parse(await readFile(join(artifactDir, "vertical-slice-b.json"), "utf8"));
if (state.company?.name !== "Sellhand") throw new Error("Sellhand company readback failed");
if (state.agents.length !== 14) throw new Error(`Expected 14 agents, got ${state.agents.length}`);
if (state.goals.length !== 6) throw new Error(`Expected 6 goals, got ${state.goals.length}`);
if (state.projects.length !== 8) throw new Error(`Expected 8 projects, got ${state.projects.length}`);
if (state.projects.some((project) => !Array.isArray(project.goalIds) || project.goalIds.length !== 1)) throw new Error("Every project must be linked to one company goal");
if (state.routines.length !== 8) throw new Error(`Expected 8 routines, got ${state.routines.length}`);
if (state.adapterTests.length !== 6) throw new Error(`Expected 6 Hermes adapter tests, got ${state.adapterTests.length}`);
for (const test of state.adapterTests) {
  if (test.result?.status === "fail") throw new Error(`${test.slug}: Hermes environment test failed`);
  if (!test.result?.checks?.some((check) => check.code === "hermes_version")) throw new Error(`${test.slug}: Hermes executable check missing`);
}
for (const entry of state.agents) {
  const agent = entry.detail;
  const slug = agent.urlKey;
  const active = agent.metadata?.bootstrapActive === true;
  const heartbeat = agent.runtimeConfig?.heartbeat ?? {};
  if (heartbeat.enabled !== false || heartbeat.intervalSec !== 0) throw new Error(`${agent.name}: timer not disabled`);
  if (active && heartbeat.wakeOnAssignment !== true) throw new Error(`${agent.name}: assignment wakeup not enabled`);
  if (!active && agent.status !== "paused") throw new Error(`${agent.name}: future agent not paused`);
  if (agent.adapterType !== "hermes_local") throw new Error(`${agent.name}: wrong adapter`);
  if (entry.configuration.adapterConfig?.provider !== "openai-codex" || entry.configuration.adapterConfig?.model !== "gpt-5.6-sol") throw new Error(`${agent.name}: Hermes provider/model not pinned`);
  if (!entry.instructions?.entryFile) throw new Error(`${agent.name}: managed instruction source missing`);
  if (!Array.isArray(entry.skills?.desiredSkills) || entry.skills.desiredSkills.length === 0) throw new Error(`${agent.name}: no attached skills`);
  if (["product-engineering-lead", "product-builder", "qa-reliability-reviewer"].includes(slug) && entry.configuration.adapterConfig?.cwd !== state.workspaceConfig.sellhandWorkspace) throw new Error(`${agent.name}: not configured for the Sellhand repository`);
}
if (state.issues.length !== 8 || state.issues.some((issue) => issue.status !== "backlog")) throw new Error("Starter tasks are not safely staged in backlog");
if (!state.issues.some((issue) => issue.identifier === state.acquisitionEvidence?.issue_id)) throw new Error("Acquisition evidence is not correlated to an imported issue");
if (state.acquisitionEvidence?.communication_status !== "not_sent" || state.acquisitionEvidence.audit_trail.some((entry) => entry.issue_id !== state.acquisitionEvidence.issue_id)) throw new Error("Acquisition issue audit trail is invalid");
if (state.acquisitionApproval?.status !== "pending" || state.acquisitionApproval.payload?.communicationStatus !== "not_sent" || state.acquisitionApproval.payload?.executionAuthorized !== "***REDACTED***") throw new Error("Pending non-execution approval evidence is invalid");
if (sliceA.communication_status !== "not_sent" || sliceA.audit_trail.some((e) => e.external_effect)) throw new Error("Acquisition safety assertion failed");
if (sliceB.builder === sliceB.reviewer || sliceB.qa.verdict !== "fixture_checks_passed" || sliceB.qa.independent_role !== false || sliceB.deployment_status !== "not_deployed") throw new Error("Product delivery assertion failed");
console.log(JSON.stringify({ companyId: state.company.id, agents: state.agents.length, goals: state.goals.length, projects: state.projects.length, routines: state.routines.length, hermesAdapterTests: state.adapterTests.length, verticalSliceA: "passed_not_sent", verticalSliceB: "passed_not_deployed" }, null, 2));
JS
