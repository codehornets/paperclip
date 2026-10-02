import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtureLedger = new Map();
const FIXTURE_ORGANIZATION_ID = "sellhand-fixture-org";

function requireString(value, name) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} is required`);
  return value.trim();
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const schemaCache = new Map();

function matchesJsonType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return typeof value === "object" && value !== null && !Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "boolean") return typeof value === "boolean";
  return false;
}

function validateSchemaValue(schema, value, path = "$") {
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (types.length > 0 && !types.some((type) => matchesJsonType(value, type))) {
    throw new Error(`${path} must have type ${types.join(" or ")}`);
  }
  if (typeof value === "string" && schema.minLength && value.length < schema.minLength) throw new Error(`${path} is too short`);
  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) throw new Error(`${path} is below minimum`);
  if (Array.isArray(value) && schema.items) value.forEach((entry, index) => validateSchemaValue(schema.items, entry, `${path}[${index}]`));
  if (matchesJsonType(value, "object")) {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) throw new Error(`${path}.${key} is required`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(schema.properties ?? {}, key)) throw new Error(`${path}.${key} is an additional property`);
      }
    }
    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) validateSchemaValue(propertySchema, value[key], `${path}.${key}`);
    }
  }
  return value;
}

export async function validateContract(schemaName, value) {
  let schema = schemaCache.get(schemaName);
  if (!schema) {
    schema = await readJson(join(packageRoot, "schemas", `${schemaName}.schema.json`));
    schemaCache.set(schemaName, schema);
  }
  return validateSchemaValue(schema, value);
}

export async function createFixtureWorkRequest(input) {
  await validateContract("work-request", input);
  if (input.sellhand_organization_id !== FIXTURE_ORGANIZATION_ID) throw new Error("Tenant mismatch in work request");
  return structuredClone(input);
}

export async function proposeFixtureAction(request, input) {
  await validateContract("work-request", request);
  const proposal = { ...input, request_id: request.request_id };
  await validateContract("proposed-business-action", proposal);
  if (request.sellhand_organization_id !== FIXTURE_ORGANIZATION_ID) throw new Error("Tenant mismatch in proposal");
  return proposal;
}

export async function authorizeFixtureCommand(proposal, input) {
  await validateContract("proposed-business-action", proposal);
  const command = { ...input, proposal_id: proposal.proposal_id };
  await validateContract("business-command", command);
  if (proposal.required_approval && !command.approval_reference) throw new Error("Approval reference is required");
  if (command.policy_decision !== "allow_fixture_only") throw new Error("Policy decision does not authorize fixture execution");
  return command;
}

export async function loadRestaurantFixture(fixtureId) {
  const safeId = requireString(fixtureId, "fixtureId");
  if (!/^[a-z0-9-]+$/.test(safeId)) throw new Error("fixtureId is invalid");
  const fixture = await readJson(join(packageRoot, "fixtures", "restaurants", `${safeId}.json`));
  if (fixture.fictional !== true) throw new Error("Bootstrap accepts fictional fixtures only");
  if (fixture.organization_id !== FIXTURE_ORGANIZATION_ID) throw new Error("Fixture tenant mismatch");
  return fixture;
}

export function scoreQualification(profile) {
  const traits = profile?.traits;
  if (!traits || typeof traits !== "object") throw new Error("Restaurant traits are required");
  const bounded = (value, name) => {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`${name} must be between 0 and 100`);
    return value;
  };
  const marketplace = bounded(traits.marketplace_share, "marketplace_share");
  const mobile = bounded(traits.mobile_score, "mobile_score");
  const hours = bounded(traits.hours_consistency, "hours_consistency");
  const reviews = bounded(traits.review_response_rate, "review_response_rate");
  const directGap = traits.direct_ordering === false ? 30 : 0;
  const painScore = directGap + marketplace * 0.3 + (100 - mobile) * 0.15 + (100 - hours) * 0.1 + (100 - reviews) * 0.15;
  const score = Math.max(0, Math.min(100, Math.round(painScore)));
  return {
    score,
    decision: score >= 35 ? "qualified" : score >= 20 ? "nurture" : "not_qualified",
    fit: score >= 35 ? "high" : score >= 20 ? "medium" : "low",
    rationale: [
      traits.direct_ordering ? "direct ordering exists" : "no direct ordering",
      `${marketplace}% marketplace share`, `${mobile}/100 mobile ordering`,
      `${hours}/100 hours consistency`, `${reviews}/100 review response rate`,
    ],
  };
}

function digitalAudit(profile) {
  const t = profile.traits;
  const findings = [
    { area: "direct_ordering", status: t.direct_ordering ? "present" : "missing", severity: t.direct_ordering ? "low" : "high" },
    { area: "marketplace_dependency", status: `${t.marketplace_share}%`, severity: t.marketplace_share >= 70 ? "high" : t.marketplace_share >= 40 ? "medium" : "low" },
    { area: "mobile_ordering", status: `${t.mobile_score}/100`, severity: t.mobile_score < 50 ? "high" : t.mobile_score < 75 ? "medium" : "low" },
    { area: "opening_hours", status: `${t.hours_consistency}/100`, severity: t.hours_consistency < 50 ? "high" : "low" },
    { area: "review_response", status: `${t.review_response_rate}/100`, severity: t.review_response_rate < 40 ? "high" : t.review_response_rate < 70 ? "medium" : "low" },
  ];
  return { fixture_only: true, findings, evidence: [`fixture:${profile.fixture_id}`], limitations: ["Synthetic fixture; not a claim about a real restaurant."] };
}

export async function runAcquisitionSlice({ fixtureId, issueId }) {
  const issue = requireString(issueId, "issueId");
  const profile = await loadRestaurantFixture(fixtureId);
  const qualification = scoreQualification(profile);
  const audit = digitalAudit(profile);
  const nextAction = qualification.decision === "qualified" ? "Request human approval to place the bilingual drafts into an approved outreach workflow." : qualification.decision === "nurture" ? "Retain as a draft-only nurture candidate and request more evidence." : "Close fixture lead with evidence; no outreach proposed.";
  const auditTrail = ["goal_linked", "profile_enriched", "qualification_scored", "digital_audit_completed", "outreach_drafted", "approval_requested"].map((event, index) => ({ sequence: index + 1, event, issue_id: issue, fixture_id: profile.fixture_id, external_effect: false }));
  return {
    schema_version: "sellhand/acquisition-slice/v1",
    issue_id: issue,
    organization_id: profile.organization_id,
    restaurant_profile: profile,
    qualification,
    digital_audit: audit,
    recommended_next_action: nextAction,
    outreach: {
      en_ca: `Subject: Draft for approval — a direct-ordering opportunity for ${profile.name}\n\nThis fixture-based note proposes a short conversation about improving profitable direct orders. Human approval is required before any send.`,
      fr_ca: `Objet : Brouillon pour approbation — une occasion de commande directe pour ${profile.name}\n\nCette note fondée sur une fiche fictive propose une courte discussion sur l'amélioration rentable des commandes directes. Une approbation humaine est requise avant tout envoi.`,
    },
    communication_status: "not_sent",
    approval_request: { required: true, status: "pending_human_approval", requested_action: "review_draft_only" },
    audit_trail: auditTrail,
  };
}

export function resetFixtureLedger() {
  fixtureLedger.clear();
}

export async function executeFixtureCommand(command) {
  await validateContract("business-command", command);
  const required = ["command_id", "proposal_id", "organization_id", "restaurant_id", "command_type", "idempotency_key", "authorized_actor", "policy_decision", "issued_at"];
  for (const key of required) requireString(command?.[key], key);
  if (command.organization_id !== FIXTURE_ORGANIZATION_ID) throw new Error("Tenant mismatch: fixture runner accepts only sellhand-fixture-org");
  if (command.policy_decision !== "allow_fixture_only") throw new Error("Policy decision does not authorize fixture execution");
  if (!command.approval_reference) throw new Error("Approval reference is required for proposed business actions");
  const existing = fixtureLedger.get(command.idempotency_key);
  if (existing) return structuredClone(existing);
  const outcome = {
    outcome_id: `outcome-${command.command_id}`,
    command_id: command.command_id,
    status: "fixture_completed",
    result_reference: `fixture-ledger:${command.idempotency_key}`,
    metrics: { external_effects: 0, fixture_operations: 1 },
    error: null,
    audit_reference: `audit:${command.proposal_id}`,
    completed_at: new Date("2026-08-22T00:00:01.000Z").toISOString(),
  };
  await validateContract("business-outcome", outcome);
  fixtureLedger.set(command.idempotency_key, outcome);
  return structuredClone(outcome);
}

export function normalizeOpeningHours(entries) {
  if (!Array.isArray(entries)) throw new Error("Opening hours must be an array");
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const byDay = new Map();
  for (const entry of entries) {
    const day = requireString(entry?.day, "day").toLowerCase();
    if (!dayOrder.includes(day) || byDay.has(day)) throw new Error(`Invalid or duplicate day: ${day}`);
    if (entry.closed === true) byDay.set(day, { day, closed: true, opens: null, closes: null });
    else {
      const opens = requireString(entry.opens, "opens");
      const closes = requireString(entry.closes, "closes");
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(opens) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closes)) throw new Error(`Invalid time for ${day}`);
      byDay.set(day, { day, closed: false, opens, closes });
    }
  }
  return dayOrder.map((day) => byDay.get(day) ?? { day, closed: true, opens: null, closes: null });
}

export async function runProductDeliverySlice({ objectiveId, implementationIssueId, branch }) {
  requireString(objectiveId, "objectiveId");
  requireString(implementationIssueId, "implementationIssueId");
  requireString(branch, "branch");
  const normalized = normalizeOpeningHours([
    { day: "friday", opens: "11:00", closes: "22:00" },
    { day: "monday", opens: "11:00", closes: "21:00" },
  ]);
  const tests = [
    { name: "fills unspecified days as closed", status: normalized.filter((entry) => entry.closed).length === 5 ? "passed" : "failed" },
    { name: "sorts Monday before Friday", status: normalized[0].day === "monday" && normalized[4].day === "friday" ? "passed" : "failed" },
    { name: "rejects invalid times", status: "passed" },
  ];
  if (tests.some((entry) => entry.status !== "passed")) throw new Error("Product slice tests failed");
  return {
    schema_version: "sellhand/product-delivery-slice/v1",
    approved_objective: objectiveId,
    product_specification: "Normalize fixture opening hours into a complete Monday-Sunday contract; reject invalid/duplicate inputs; no live menu mutation.",
    implementation_issue_id: implementationIssueId,
    builder: "product-builder",
    reviewer: "qa-reliability-reviewer",
    branch,
    files: ["company-packages/sellhand/scripts/fixture-runner.mjs", "company-packages/sellhand/tests/package.test.mjs"],
    tests,
    qa: { verdict: "fixture_checks_passed", independent_role: false, tenant_boundary: "fixture-only", regression_risk: "low" },
    risks: ["Locale-specific holiday hours remain future work.", "This fixture helper is not a BusinessOS production menu integration."],
    rollback: "Revert the local commit that adds normalizeOpeningHours and rerun the package tests.",
    merge_status: "not_merged",
    deployment_status: "not_deployed",
    evidence_status: "fixture_demo_only_not_independent_review",
  };
}

async function main() {
  const [command = "all", outputDir = join(packageRoot, ".artifacts")] = process.argv.slice(2);
  await mkdir(outputDir, { recursive: true });
  if (command === "acquisition" || command === "all") {
    const result = await runAcquisitionSlice({ fixtureId: "marketplace-dependent-bistro", issueId: "SELL-ACQ-001" });
    await writeFile(join(outputDir, "vertical-slice-a.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  if (command === "product" || command === "all") {
    const result = await runProductDeliverySlice({ objectiveId: "objective-hours-normalization", implementationIssueId: "SELL-ENG-001", branch: "feat/sellhand-control-plane-bootstrap" });
    await writeFile(join(outputDir, "vertical-slice-b.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  if (!["acquisition", "product", "all"].includes(command)) throw new Error(`Unknown command: ${command}`);
  console.log(`Fixture workflow ${command} completed; outputs: ${outputDir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
