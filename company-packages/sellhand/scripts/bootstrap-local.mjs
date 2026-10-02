import { chmod, readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { runAcquisitionSlice } from "./fixture-runner.mjs";
import { loadWorkspaceConfig } from "./local-workspace-config.mjs";

const packageRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repoRoot = resolve(packageRoot, "../..");
const apiBase = (process.argv[2] ?? "http://127.0.0.1:3210").replace(/\/$/, "");
const runtimeRoot = resolve(process.env.SELLHAND_PAPERCLIP_HOME ?? resolve(repoRoot, ".paperclip-local/sellhand"));
const instanceId = process.env.SELLHAND_PAPERCLIP_INSTANCE ?? "sellhand-local";
const statePath = resolve(runtimeRoot, "bootstrap-state.json");
const localOverridePath = resolve(runtimeRoot, "local-overrides.json");
const ownershipPath = resolve(runtimeRoot, "instance-owner.json");
const execFileAsync = promisify(execFile);

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} failed (${response.status}): ${text}`);
  return body;
}

async function testHermesEnvironment(companyId, adapterConfig, attempts = 3) {
  let result;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    result = await request(`/api/companies/${companyId}/adapters/hermes_local/test-environment`, {
      method: "POST",
      body: JSON.stringify({ adapterConfig }),
    });
    if (result.status === "fail" || result.checks?.some((check) => check.code === "hermes_version")) return result;
    if (attempt < attempts) await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }
  return result;
}

async function collectPortableFiles(directory, base = directory, files = {}) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".artifacts", "tests", "scripts", "schemas", "fixtures"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collectPortableFiles(path, base, files);
    else if (entry.name.endsWith(".md") || entry.name === ".paperclip.yaml" || entry.name.endsWith(".yml")) {
      files[relative(base, path).replaceAll("\\", "/")] = await readFile(path, "utf8");
    }
  }
  return files;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function assertVerifiedState(verified) {
  if (verified.company?.name !== "Sellhand") throw new Error("Sellhand company readback failed");
  if (verified.agents.length !== 14) throw new Error(`Expected 14 agents, got ${verified.agents.length}`);
  if (verified.goals.length !== 6) throw new Error(`Expected 6 goals, got ${verified.goals.length}`);
  if (verified.projects.length !== 8) throw new Error(`Expected 8 projects, got ${verified.projects.length}`);
  if (verified.issues.length !== 8) throw new Error(`Expected 8 starter tasks, got ${verified.issues.length}`);
  if (verified.routines.length !== 8) throw new Error(`Expected 8 routines, got ${verified.routines.length}`);
  if (verified.adapterTests.length !== 6) throw new Error(`Expected 6 Hermes adapter tests, got ${verified.adapterTests.length}`);
  if (verified.adapterTests.some((test) => test.result?.status === "fail")) throw new Error("A Hermes adapter environment test failed");
  if (verified.adapterTests.some((test) => !test.result?.checks?.some((check) => check.code === "hermes_version"))) throw new Error("A Hermes executable check did not succeed after retries");
  if (verified.activeRuns.length !== 0) throw new Error(`Expected zero active heartbeat runs, got ${verified.activeRuns.length}`);
  if (verified.projects.some((project) => !Array.isArray(project.goalIds) || project.goalIds.length !== 1)) throw new Error("Every project must link to exactly one goal");
  if (verified.issues.some((issue) => issue.status !== "backlog")) throw new Error("Every starter task must remain in backlog during bootstrap");
  if (verified.routines.some((routine) => routine.status !== "paused" || routine.triggers?.some((trigger) => trigger.enabled))) throw new Error("Every routine and trigger must remain disabled");
  for (const entry of verified.agents) {
    const agent = entry.detail;
    const active = agent.metadata?.bootstrapActive === true;
    const heartbeat = agent.runtimeConfig?.heartbeat ?? {};
    if (heartbeat.enabled !== false || heartbeat.intervalSec !== 0) throw new Error(`${agent.name}: timer heartbeat is not disabled`);
    if (active && (agent.status !== "idle" || heartbeat.wakeOnAssignment !== true)) throw new Error(`${agent.name}: active assignment state is invalid`);
    if (!active && (agent.status !== "paused" || heartbeat.wakeOnAssignment !== false)) throw new Error(`${agent.name}: inactive blueprint state is invalid`);
    if (entry.configuration.adapterType !== "hermes_local") throw new Error(`${agent.name}: wrong adapter`);
    if (!entry.instructions?.entryFile || !entry.skills?.desiredSkills?.length) throw new Error(`${agent.name}: instructions or skills missing`);
  }
  const workspaceSignatures = new Set();
  for (const project of verified.projects) {
    for (const workspace of project.workspaces ?? []) {
      const signature = JSON.stringify([project.id, workspace.repoUrl, workspace.repoRef, workspace.name]);
      if (workspaceSignatures.has(signature)) throw new Error(`Duplicate project workspace detected for ${project.name}`);
      workspaceSignatures.add(signature);
    }
  }
  if (verified.acquisitionApproval?.status !== "pending" || verified.acquisitionEvidence?.communication_status !== "not_sent") throw new Error("Acquisition evidence approval state is invalid");
}

async function main() {
  const ownership = JSON.parse(await readFile(ownershipPath, "utf8"));
  if (ownership.repoRoot !== repoRoot || ownership.instanceId !== instanceId || ownership.apiBaseUrl !== apiBase) {
    throw new Error(`Sellhand instance ownership marker does not match this repository/API: ${ownershipPath}`);
  }
  const workspaceConfig = await loadWorkspaceConfig({ repoRoot, overridePath: localOverridePath });
  const [{ stdout: sellhandGitRoot }, { stdout: sellhandRemote }] = await Promise.all([
    execFileAsync("git", ["-C", workspaceConfig.sellhandWorkspace, "rev-parse", "--show-toplevel"]),
    execFileAsync("git", ["-C", workspaceConfig.sellhandWorkspace, "remote", "get-url", "origin"]),
  ]);
  if (resolve(sellhandGitRoot.trim()) !== workspaceConfig.sellhandWorkspace) {
    throw new Error(`Configured Sellhand workspace is not the repository root: ${workspaceConfig.sellhandWorkspace}`);
  }
  if (sellhandRemote.trim() !== workspaceConfig.expectedSellhandRemote) {
    throw new Error(`Configured Sellhand workspace has unexpected origin: ${sellhandRemote.trim()}`);
  }
  const health = await request("/api/health");
  if (health.status !== "ok") throw new Error("Paperclip health is not ok");
  const expectedInstanceRoot = resolve(runtimeRoot, "instances", instanceId);
  if (!resolve(health.databaseBackup?.backupDir ?? "/").startsWith(`${expectedInstanceRoot}/`)) {
    throw new Error("Healthy Paperclip endpoint is not the owned Sellhand local instance");
  }
  const files = await collectPortableFiles(packageRoot);
  if (!files["COMPANY.md"] || !files[".paperclip.yaml"]) throw new Error("Portable package is incomplete");
  const companies = await request("/api/companies");
  let priorCompanyId = null;
  try {
    priorCompanyId = JSON.parse(await readFile(statePath, "utf8")).company?.id ?? null;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const existing = priorCompanyId ? companies.find((company) => company.id === priorCompanyId) ?? null : null;
  if (priorCompanyId && !existing) throw new Error(`Previously bootstrapped Sellhand company is missing: ${priorCompanyId}`);
  if (!priorCompanyId && companies.some((company) => company.name === "Sellhand")) {
    throw new Error("Refusing name-only adoption of an existing Sellhand company without a matching bootstrap state file");
  }
  const target = existing ? { mode: "existing_company", companyId: existing.id } : { mode: "new_company", newCompanyName: "Sellhand" };
  const source = { type: "inline", rootPath: "sellhand", files, expectedFileCount: Object.keys(files).length };
  // Recurring tasks currently import as new routines even when the target already
  // has the same portable task. Keep first import complete and make reruns
  // idempotent by excluding issue/routine creation for an existing company.
  const basePayload = { source, include: { company: true, agents: true, projects: !existing, issues: !existing, skills: true }, target, agents: "all", collisionStrategy: existing ? "replace" : "rename" };
  const preview = await request("/api/companies/import/preview", { method: "POST", body: JSON.stringify(basePayload) });
  if (preview.errors?.length) throw new Error(`Import preview errors: ${preview.errors.join("; ")}`);
  const imported = await request("/api/companies/import", { method: "POST", body: JSON.stringify({ ...basePayload, pauseAutomations: true }) });
  const companyId = imported.company.id;

  const goalDefinitions = JSON.parse(await readFile(join(packageRoot, "references/goals.json"), "utf8")).goals;
  const projectGoalMap = JSON.parse(await readFile(join(packageRoot, "references/project-goal-map.json"), "utf8"));
  const currentGoals = await request(`/api/companies/${companyId}/goals`);
  const goalBySlug = new Map();
  for (const definition of goalDefinitions) {
    let goal = currentGoals.find((entry) => entry.title === definition.title);
    if (!goal) goal = await request(`/api/companies/${companyId}/goals`, { method: "POST", body: JSON.stringify({ title: definition.title, description: definition.description, level: "company", status: "active" }) });
    goalBySlug.set(definition.slug, goal);
  }

  const projects = await request(`/api/companies/${companyId}/projects`);
  for (const project of projects) {
    const goalSlug = projectGoalMap[project.urlKey ?? slugify(project.name)];
    const goal = goalBySlug.get(goalSlug);
    if (goal && !(project.goalIds ?? []).includes(goal.id)) await request(`/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ goalIds: [goal.id] }) });
  }

  const agents = await request(`/api/companies/${companyId}/agents`);
  const activeSlugs = new Set(["sellhand-ceo", "product-engineering-lead", "product-builder", "qa-reliability-reviewer", "growth-revenue-lead", "restaurant-intelligence-agent"]);
  const adapterTests = [];
  for (const agent of agents) {
    const slug = agent.urlKey ?? slugify(agent.name);
    const active = activeSlugs.has(slug);
    const cwd = workspaceConfig.cwdByAgent[slug] ?? packageRoot;
    const adapterConfig = { ...(agent.adapterConfig ?? {}), cwd, provider: "openai-codex", model: "gpt-5.6-sol", timeoutSec: 900, graceSec: 15, maxTurnsPerRun: 30, persistSession: true, quiet: true, ...(slug === "product-builder" ? { worktreeMode: true, toolsets: "terminal,file" } : {}) };
    const runtimeConfig = { ...(agent.runtimeConfig ?? {}), heartbeat: { ...(agent.runtimeConfig?.heartbeat ?? {}), enabled: false, intervalSec: 0, cooldownSec: 30, wakeOnAssignment: active, wakeOnOnDemand: active, wakeOnAutomation: false, maxConcurrentRuns: 1 } };
    await request(`/api/agents/${agent.id}`, { method: "PATCH", body: JSON.stringify({ adapterType: "hermes_local", adapterConfig, replaceAdapterConfig: true, runtimeConfig, status: active ? "idle" : "paused" }) });
    await request(`/api/agents/${agent.id}/permissions`, { method: "PATCH", body: JSON.stringify({ canCreateAgents: slug === "sellhand-ceo", canCreateSkills: slug === "sellhand-ceo" || slug === "governance-knowledge-agent", canAssignTasks: slug === "sellhand-ceo" || slug.endsWith("lead") }) });
    if (active) {
      const result = await testHermesEnvironment(companyId, adapterConfig);
      adapterTests.push({ agentId: agent.id, slug, result });
    }
  }

  const importedIssues = await request(`/api/companies/${companyId}/issues`);
  const acquisitionIssue = importedIssues.find((issue) => issue.title === "Restaurant Acquisition Pipeline starter objective");
  if (!acquisitionIssue) throw new Error("Restaurant acquisition starter issue is missing");
  const acquisitionEvidence = await runAcquisitionSlice({
    fixtureId: "marketplace-dependent-bistro",
    issueId: acquisitionIssue.identifier,
  });
  const evidenceMarker = `sellhand-acquisition-evidence:${acquisitionIssue.identifier}:v1`;
  const approvals = await request(`/api/companies/${companyId}/approvals`);
  let acquisitionApproval = approvals.find((approval) => approval.payload?.bootstrapKey === evidenceMarker);
  if (!acquisitionApproval) {
    const requester = agents.find((agent) => (agent.urlKey ?? slugify(agent.name)) === "restaurant-intelligence-agent");
    acquisitionApproval = await request(`/api/companies/${companyId}/approvals`, {
      method: "POST",
      body: JSON.stringify({
        type: "request_board_approval",
        requestedByAgentId: requester?.id ?? null,
        issueIds: [acquisitionIssue.id],
        payload: {
          bootstrapKey: evidenceMarker,
          action: "review_bilingual_outreach_drafts",
          executionAuthorized: false,
          communicationStatus: "not_sent",
          fixtureOnly: true,
          fixtureId: acquisitionEvidence.restaurant_profile.fixture_id,
          qualification: acquisitionEvidence.qualification,
          digitalAudit: acquisitionEvidence.digital_audit,
          outreach: acquisitionEvidence.outreach,
          auditTrail: acquisitionEvidence.audit_trail,
        },
      }),
    });
  }
  const artifactDir = resolve(runtimeRoot, "artifacts");
  await mkdir(artifactDir, { recursive: true });
  const acquisitionArtifactPath = resolve(artifactDir, "vertical-slice-a.json");
  await writeFile(acquisitionArtifactPath, `${JSON.stringify(acquisitionEvidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(acquisitionArtifactPath, 0o600);

  const runs = await request(`/api/companies/${companyId}/heartbeat-runs`);
  const verified = {
    generatedAt: new Date().toISOString(), apiBase, workspaceConfig, health, preview: { warnings: preview.warnings, plan: preview.plan }, imported,
    company: (await request("/api/companies")).find((entry) => entry.id === companyId),
    goals: await request(`/api/companies/${companyId}/goals`),
    projects: await request(`/api/companies/${companyId}/projects`),
    agents: await Promise.all((await request(`/api/companies/${companyId}/agents`)).map(async (agent) => ({ detail: await request(`/api/agents/${agent.id}`), configuration: await request(`/api/agents/${agent.id}/configuration`), instructions: await request(`/api/agents/${agent.id}/instructions-bundle`), skills: await request(`/api/agents/${agent.id}/skills`) }))),
    issues: await request(`/api/companies/${companyId}/issues`),
    acquisitionEvidence,
    acquisitionApproval,
    routines: await request(`/api/companies/${companyId}/routines`),
    adapterTests,
    activeRuns: runs.filter((run) => run.status === "queued" || run.status === "running"),
  };
  assertVerifiedState(verified);
  await mkdir(resolve(statePath, ".."), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(verified, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(statePath, 0o600);
  console.log(JSON.stringify({ companyId, companyName: verified.company?.name, counts: { agents: verified.agents.length, goals: verified.goals.length, projects: verified.projects.length, routines: verified.routines.length }, previewWarnings: preview.warnings, adapterTests: adapterTests.length, statePath }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
