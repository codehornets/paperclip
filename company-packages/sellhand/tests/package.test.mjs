import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const requiredArtifacts = [
  "ARCHITECTURE.md",
  "FUNCTION_REGISTRY.md",
  "AUTONOMY_POLICY.md",
  "SECURITY_BOUNDARIES.md",
  "OPERATIONS_RUNBOOK.md",
  "BOOTSTRAP_REPORT.md",
  "NEXT_IMPLEMENTATION_BACKLOG.md",
  "COMPANY.md",
  ".paperclip.yaml",
];
const requiredSkills = [
  "sellhand-domain-context", "paperclip-work-protocol", "goal-to-project-planning",
  "product-requirements", "software-delivery", "qa-release-gate",
  "restaurant-lead-research", "prospect-qualification", "compliant-outreach",
  "restaurant-digital-audit", "restaurant-onboarding", "menu-data-onboarding",
  "integration-health-monitoring", "content-production", "campaign-planning",
  "campaign-monitoring", "customer-support-triage", "customer-success-health",
  "revenue-reporting", "experiment-recommendation", "billing-administration",
  "documentation-knowledge-management", "incident-escalation", "executive-operating-review",
];
const requiredAgents = [
  "sellhand-ceo", "product-engineering-lead", "product-builder", "qa-reliability-reviewer",
  "growth-revenue-lead", "restaurant-intelligence-agent", "sales-outreach-operator",
  "content-campaign-operator", "restaurant-audit-onboarding-agent", "menu-integration-operator",
  "support-customer-success-agent", "revenue-experiment-analyst",
  "billing-finance-operations-agent", "governance-knowledge-agent",
];
const requiredTeams = [
  "executive-and-governance", "product-and-engineering", "growth-and-revenue",
  "restaurant-operations", "customer-success-and-support", "data-and-finance",
  "knowledge-and-enablement",
];

test("portable package contains every required artifact, agent, and skill", () => {
  for (const artifact of requiredArtifacts) assert.ok(existsSync(join(root, artifact)), artifact);
  for (const slug of requiredTeams) assert.ok(existsSync(join(root, "teams", slug, "TEAM.md")), slug);
  for (const slug of requiredAgents) assert.ok(existsSync(join(root, "agents", slug, "AGENTS.md")), slug);
  for (const slug of requiredSkills) {
    const path = join(root, "skills", slug, "SKILL.md");
    assert.ok(existsSync(path), slug);
    const body = readFileSync(path, "utf8");
    for (const heading of ["Purpose", "Invocation Conditions", "Required Inputs", "Input Validation", "Allowed Tools", "Forbidden Actions", "Procedure", "Structured Output Contract", "Acceptance Criteria", "Quality Checks", "Evidence Requirements", "Failure Conditions", "Retry Policy", "Escalation Conditions", "Acceptable Output", "Unacceptable Output"]) {
      assert.match(body, new RegExp(`## ${heading}`), `${slug}: ${heading}`);
    }
  }
});

test("machine-readable function registry has owned measurable functions", () => {
  const registry = JSON.parse(readFileSync(join(root, "references", "function-registry.json"), "utf8"));
  assert.ok(registry.functions.length >= 70);
  const ids = new Set();
  for (const fn of registry.functions) {
    assert.ok(fn.function_id && !ids.has(fn.function_id));
    ids.add(fn.function_id);
    for (const key of ["business_outcome", "owning_team", "responsible_agent", "trigger", "inputs", "authoritative_source", "allowed_tools", "outputs", "acceptance_criteria", "kpi", "autonomy_level", "approval_requirement", "risk_level", "failure_conditions", "escalation_owner", "audit_evidence", "implementation_phase"]) {
      assert.ok(fn[key] !== undefined && fn[key] !== "", `${fn.function_id}.${key}`);
    }
  }
});

test("every portable project maps to a declared company goal", () => {
  const goals = JSON.parse(readFileSync(join(root, "references", "goals.json"), "utf8")).goals;
  const mapping = JSON.parse(readFileSync(join(root, "references", "project-goal-map.json"), "utf8"));
  const goalSlugs = new Set(goals.map((goal) => goal.slug));
  assert.equal(Object.keys(mapping).length, 8);
  for (const [projectSlug, goalSlug] of Object.entries(mapping)) {
    assert.ok(existsSync(join(root, "projects", projectSlug, "PROJECT.md")), projectSlug);
    assert.ok(goalSlugs.has(goalSlug), `${projectSlug} -> ${goalSlug}`);
  }
});

test("portable configuration has no machine path, secret value, active timer, or L5 agent", () => {
  const yaml = readFileSync(join(root, ".paperclip.yaml"), "utf8");
  assert.doesNotMatch(yaml, /\/home\/|[A-Za-z]:\\/);
  assert.doesNotMatch(yaml, /(api[_-]?key|token|secret):\s+(?!ref|optional|null)[^\s#]+/i);
  assert.equal(yaml.split("\n").some((line) => line.trim() === "enabled: true"), false);
  assert.doesNotMatch(yaml, /autonomyLevel:\s*L5/);
});

test("fixture runner produces acquisition evidence without sending", async () => {
  const { runAcquisitionSlice } = await import("../scripts/fixture-runner.mjs");
  const output = await runAcquisitionSlice({ fixtureId: "marketplace-dependent-bistro", issueId: "SELL-ACQ-001" });
  assert.equal(output.issue_id, "SELL-ACQ-001");
  assert.equal(output.communication_status, "not_sent");
  assert.ok(output.qualification.score >= 0 && output.qualification.score <= 100);
  assert.match(output.outreach.en_ca, /approval/i);
  assert.match(output.outreach.fr_ca, /approbation/i);
  assert.ok(output.audit_trail.every((entry) => entry.issue_id === "SELL-ACQ-001"));
});

test("all restaurant fixtures satisfy their declared qualification fit", async () => {
  const { scoreQualification } = await import("../scripts/fixture-runner.mjs");
  const fixtureDir = join(root, "fixtures", "restaurants");
  for (const file of readdirSync(fixtureDir).filter((name) => name.endsWith(".json"))) {
    const fixture = JSON.parse(readFileSync(join(fixtureDir, file), "utf8"));
    assert.equal(scoreQualification(fixture).fit, fixture.expected.fit, file);
  }
});

test("fixture BusinessCommand runner enforces tenant, approval, and idempotency", async () => {
  const { executeFixtureCommand, resetFixtureLedger } = await import("../scripts/fixture-runner.mjs");
  resetFixtureLedger();
  const base = {
    command_id: "cmd-1", proposal_id: "proposal-1", organization_id: "sellhand-fixture-org",
    restaurant_id: "restaurant-marketplace-bistro", command_type: "generate_draft",
    idempotency_key: "stable-key", authorized_actor: "fixture-runner",
    approval_reference: "approval-fixture-1", policy_decision: "allow_fixture_only",
    issued_at: "2026-08-22T00:00:00.000Z",
  };
  const first = await executeFixtureCommand(base);
  const second = await executeFixtureCommand(base);
  assert.deepEqual(second, first);
  await assert.rejects(() => executeFixtureCommand({ ...base, command_id: "cmd-2", idempotency_key: "other", organization_id: "other-org" }), /tenant/i);
  await assert.rejects(() => executeFixtureCommand({ ...base, command_id: "cmd-3", idempotency_key: "third", approval_reference: null }), /approval/i);
});

test("BusinessOS fixture contracts execute the complete schema-validated chain", async () => {
  const { createFixtureWorkRequest, proposeFixtureAction, authorizeFixtureCommand, executeFixtureCommand, resetFixtureLedger } = await import("../scripts/fixture-runner.mjs");
  resetFixtureLedger();
  const request = await createFixtureWorkRequest({
    request_id: "request-1", paperclip_company_id: "paperclip-company-1", paperclip_issue_id: "issue-1",
    sellhand_organization_id: "sellhand-fixture-org", restaurant_id: "restaurant-marketplace-bistro",
    goal_id: "goal-1", requested_action: "generate_draft", risk_level: "medium", autonomy_level: "L1",
    input_refs: ["fixture:marketplace-dependent-bistro"], requested_by: "restaurant-intelligence-agent",
    created_at: "2026-08-22T00:00:00.000Z", idempotency_key: "request-key-1",
  });
  const proposal = await proposeFixtureAction(request, {
    proposal_id: "proposal-1", action_type: "generate_draft", target: "restaurant-marketplace-bistro",
    payload_reference: "fixture:marketplace-dependent-bistro", expected_outcome: "bilingual drafts",
    estimated_cost: 0, risk_level: "medium", required_approval: true,
    supporting_evidence: ["fixture:marketplace-dependent-bistro"], expires_at: "2026-08-23T00:00:00.000Z",
  });
  const command = await authorizeFixtureCommand(proposal, {
    command_id: "command-1", organization_id: "sellhand-fixture-org",
    restaurant_id: "restaurant-marketplace-bistro", command_type: "generate_draft",
    idempotency_key: "command-key-1", authorized_actor: "fixture-runner",
    approval_reference: "approval-1", policy_decision: "allow_fixture_only",
    issued_at: "2026-08-22T00:00:00.000Z",
  });
  const outcome = await executeFixtureCommand(command);
  assert.equal(outcome.status, "fixture_completed");
  await assert.rejects(() => createFixtureWorkRequest({ ...request, unexpected: true }), /additional property/i);
});

test("product delivery fixture labels distinct roles without claiming independent review", async () => {
  const { runProductDeliverySlice } = await import("../scripts/fixture-runner.mjs");
  const report = await runProductDeliverySlice({
    objectiveId: "objective-hours-normalization",
    implementationIssueId: "SELL-ENG-001",
    branch: "feat/sellhand-control-plane-bootstrap",
  });
  assert.equal(report.builder, "product-builder");
  assert.equal(report.reviewer, "qa-reliability-reviewer");
  assert.notEqual(report.builder, report.reviewer);
  assert.equal(report.deployment_status, "not_deployed");
  assert.equal(report.merge_status, "not_merged");
  assert.equal(report.qa.verdict, "fixture_checks_passed");
  assert.equal(report.qa.independent_role, false);
  assert.equal(report.evidence_status, "fixture_demo_only_not_independent_review");
  assert.ok(report.tests.every((entry) => entry.status === "passed"));
  assert.match(report.rollback, /revert/i);
});

test("local workspace config points product agents at the sibling Sellhand repository", async () => {
  const { resolveWorkspaceConfig } = await import("../scripts/local-workspace-config.mjs");
  const config = resolveWorkspaceConfig({
    repoRoot: "/workspace/paperclip",
    override: { sellhandWorkspace: "../sellhand" },
  });
  assert.equal(config.sellhandWorkspace, "/workspace/sellhand");
  assert.equal(config.cwdByAgent["product-engineering-lead"], "/workspace/sellhand");
  assert.equal(config.cwdByAgent["product-builder"], "/workspace/sellhand");
  assert.equal(config.cwdByAgent["qa-reliability-reviewer"], "/workspace/sellhand");
  assert.equal(config.cwdByAgent["sellhand-ceo"], "/workspace/paperclip/company-packages/sellhand");
});

test("runner process control uses a dedicated process group and verifies ownership", () => {
  const repoRoot = resolve(root, "../..");
  const bootstrap = readFileSync(join(repoRoot, "scripts/bootstrap-sellhand-local.sh"), "utf8");
  const stop = readFileSync(join(repoRoot, "scripts/stop-sellhand-local.sh"), "utf8");
  const runner = readFileSync(join(root, "scripts", "runner-process.mjs"), "utf8");
  assert.match(bootstrap, /setsid bash -c/);
  assert.match(bootstrap, /runner-process\.mjs.*record/);
  assert.match(stop, /runner-process\.mjs.*stop/);
  assert.doesNotMatch(stop, /pnpm dev:stop/);
  assert.match(runner, /snapshot\.startTicks !== recordValue\.startTicks/);
  assert.match(runner, /snapshot\.pgid !== recordValue\.pgid/);
});

test("runtime overrides and failed adapter diagnostics propagate fail closed", () => {
  const repoRoot = resolve(root, "../..");
  const bootstrapLocal = readFileSync(join(root, "scripts", "bootstrap-local.mjs"), "utf8");
  const smoke = readFileSync(join(repoRoot, "scripts", "smoke-test-sellhand.sh"), "utf8");
  assert.match(bootstrapLocal, /process\.env\.SELLHAND_PAPERCLIP_HOME/);
  assert.match(bootstrapLocal, /process\.env\.SELLHAND_PAPERCLIP_INSTANCE/);
  assert.match(smoke, /SELLHAND_PAPERCLIP_HOME/);
  assert.match(bootstrapLocal, /result\?\.status === "fail"/);
  assert.match(bootstrapLocal, /testHermesEnvironment/);
  assert.match(bootstrapLocal, /attempts = 3/);
  assert.match(bootstrapLocal, /A Hermes executable check did not succeed after retries/);
  assert.match(smoke, /result\?\.status === "fail"/);
});

test("Make targets expose safe Sellhand install, setup, run, ensure, clear, and reset workflows", () => {
  const repoRoot = resolve(root, "../..");
  const makefile = readFileSync(join(repoRoot, "Makefile"), "utf8");
  const bootstrap = readFileSync(join(repoRoot, "scripts", "bootstrap-sellhand-local.sh"), "utf8");
  const ensure = readFileSync(join(repoRoot, "scripts", "ensure-sellhand-read-path.sh"), "utf8");
  const generator = readFileSync(join(root, "scripts", "generate-package.mjs"), "utf8");
  for (const target of ["install", "setup", "run", "ensure", "clear", "reset"]) {
    assert.match(makefile, new RegExp(`^${target}:`, "m"), target);
  }
  assert.match(makefile, /scripts\/ensure-sellhand-read-path\.sh/);
  assert.match(ensure, /curl .*\/api\/health/);
  assert.match(ensure, /scripts\/bootstrap-sellhand-local\.sh/);
  assert.match(bootstrap, /\.paperclip\/\.env/);
  assert.match(bootstrap, /\[\[ -f "\$repo_root\/\.git"/);
  assert.match(bootstrap, /SELLHAND_PAPERCLIP_STARTUP_TIMEOUT_SECONDS:-900/);
  assert.match(bootstrap, /seq 1 "\$startup_timeout_seconds"/);
  assert.match(generator, /make ensure/);
  assert.match(makefile, /scripts\/clear-sellhand-local\.sh/);
  assert.match(makefile, /scripts\/reset-sellhand-local\.sh/);
});

test("starter routines are present and schedule triggers are disabled", () => {
  const names = readdirSync(join(root, "routines"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  assert.equal(names.length, 8);
  for (const name of names) {
    const body = readFileSync(join(root, "routines", name, "TASK.md"), "utf8");
    assert.match(body, /recurring:\s*true/);
  }
});
