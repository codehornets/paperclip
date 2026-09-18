# Sellhand Paperclip Bootstrap Report

Date: 2026-08-22
Status: Implemented and locally verified with documented broad-suite failures; committed revision is identified by the commit containing this report.
Tracker: `COD-904` — Bootstrap Sellhand control plane in Paperclip

## Baseline

- Starting branch: `dev`
- Starting commit: `3ff636bc4852dfc07fcab8ccfdb0b4fd22c1548c`
- Final branch: `feat/sellhand-control-plane-bootstrap`
- Final local commit: the `COD-904` commit containing this report; exact SHA is recorded in the delivery response and Git history.
- Paperclip version: `0.3.1`; server commit `3ff636bc`
- Node: `v26.7.0` (repository requires >=24.11)
- pnpm: `9.15.4`
- Hermes: `0.20.5` (`13f4cfeb`, Python 3.11.16)
- Timezone/currency/market/languages: America/Montreal; CAD; Greater Montréal; fr-CA and en-CA

## Location and identity

- Company package: `company-packages/sellhand/`
- Local Paperclip: `http://127.0.0.1:3210`
- Company name: Sellhand
- Local runtime identity: intentionally omitted from portable files; verified in ignored `.paperclip-local/sellhand/bootstrap-state.json`.
- Existing product repository: `https://github.com/codehornets/sellhand.git` at sibling `../sellhand`. The ignored local override maps product engineering agents to its absolute path after verifying the Git root and origin. The builder uses Hermes worktree mode so its assigned coding work does not edit the dirty main checkout directly.

## Files created

- 102+ isolated package files under `company-packages/sellhand/`: seven required governance/architecture reports; COMPANY/README and Paperclip sidecar; 14 agent definitions; seven team packages; 24 skills; eight projects and eight starter tasks; eight disabled routines; six restaurant fixtures plus finance/support fixtures; four BusinessOS schemas; registry/goals/project mapping; local/gateway examples; fixture/bootstrap/generation scripts; tests and task index.
- Root reproducibility wrappers: `scripts/bootstrap-sellhand-local.sh`, `scripts/validate-sellhand-package.sh`, `scripts/smoke-test-sellhand.sh`, `scripts/stop-sellhand-local.sh`.
- Root Make workflow and lifecycle helpers: `Makefile`, `scripts/clear-sellhand-local.sh`, and `scripts/reset-sellhand-local.sh`.
- Dated implementation plan: `doc/plans/2026-08-22-sellhand-control-plane-bootstrap.md`.
- Paperclip core/db/shared/server/ui files modified: none.

## Architectural decisions

1. Use an isolated `company-packages/sellhand/` full-company package; Paperclip has team/skill catalogs but no canonical in-repo full-company catalog.
2. Keep Paperclip as workforce control plane, Hermes as agent runtime, and Sellhand BusinessOS as business authority.
3. Use the built-in `hermes_local` adapter with `openai-codex/gpt-5.6-sol`, 900-second timeout, 30-turn limit, persisted sessions, timer disabled, assignment wake enabled only after import for six active agents, and max concurrency one.
4. Use a deterministic no-network fixture runner instead of a plugin/MCP service during bootstrap. It enforces fixture tenant, approval reference, policy decision, and idempotency.
5. Keep all routine schedules paused and triggers disabled; use `skip_if_active`, `skip_missed`, America/Montreal, and budget hard stops.
6. Work around current company-import fidelity gaps through supported APIs: goals are created and projects linked after import; local cwd/provider/model/status/permissions are applied and read back; reruns exclude issues to prevent duplicate routine creation.
7. Keep starter tasks in backlog during bootstrap so assignment wakeups are configured without causing immediate agent execution.

## Organization

Active and smoke-tested:

1. sellhand-ceo
2. product-engineering-lead
3. product-builder
4. qa-reliability-reviewer
5. growth-revenue-lead
6. restaurant-intelligence-agent

Paused future blueprint:

1. sales-outreach-operator
2. content-campaign-operator
3. restaurant-audit-onboarding-agent
4. menu-integration-operator
5. support-customer-success-agent
6. revenue-experiment-analyst
7. billing-finance-operations-agent
8. governance-knowledge-agent

Each agent has a strict reporting line, managed `AGENTS.md`, attached company skills, explicit permissions, budget, cwd override, bounded execution, disabled timer, and verified adapter configuration. Only the CEO can create agents. Company approval for new agents is required.

## Goals and projects

Six active company goals were created and read back. All eight projects were linked to exactly one goal through supported project APIs. Eight starter tasks remain safely staged in backlog and preserve their responsible-agent assignment and goal mapping in portable metadata.

Projects: sellhand-control-plane-foundation; sellhand-product-engineering; restaurant-acquisition-pipeline; restaurant-audit-and-onboarding; restaurant-growth-operations; support-and-customer-success; revenue-finance-and-analytics; governance-and-knowledge.

## Routines and skills

Eight routines were imported exactly once, read back paused, and verified with disabled schedule triggers in America/Montreal. A second bootstrap run preserved the count at eight.

Twenty-four required Sellhand skills were imported and attached by desired-skill references. Every skill contains invocation/input validation, tools/actions policy, procedure, structured output, acceptance/quality/evidence, failure/retry/escalation, and acceptable/unacceptable examples.

## Vertical slices

### A — Restaurant acquisition

Executed against fictional `marketplace-dependent-bistro`. Produced a structured profile, deterministic score and qualification, five-area digital audit, next action, en-CA and fr-CA drafts, pending human approval request, issue-correlated audit trail, and explicit `not_sent`. No external effect occurred.

Evidence: ignored `.paperclip-local/sellhand/artifacts/vertical-slice-a.json`; reproducible through `fixture-runner.mjs` and package tests.

### B — Product delivery

Implemented fixture opening-hours normalization with builder/reviewer role labels, three passing deterministic checks, branch/files/risks/rollback output, and explicit `not_merged`/`not_deployed` states. This is a fixture contract demonstration; a separately executed `qa-reliability-reviewer` run was not demonstrated and no independent-QA claim is made.

Evidence: ignored `.paperclip-local/sellhand/artifacts/vertical-slice-b.json`; production code and test are `company-packages/sellhand/scripts/fixture-runner.mjs` and `company-packages/sellhand/tests/package.test.mjs`.

## Verification

- Dependency install: passed (`pnpm install --frozen-lockfile`); pre-build plugin SDK bin warnings were environmental and resolved by normal build preparation.
- Baseline Hermes adapter tests: 71/71 passed.
- Baseline team catalog validation/tests: 4 teams validated; 10/10 passed.
- Baseline targeted company portability tests: 83 passed, one skipped; the CLI import/export E2E suite timed out while Corepack attempted a network download. This was classified environment-related and predates Sellhand files.
- Local Paperclip health/UI/company API: passed on loopback port 3210 with embedded PostgreSQL and isolated runtime root.
- Package validation/import preview: passed; 102 files passed static safety scan; preview errors zero.
- Real company import and API readback: passed; 14 agents, 6 goals, 8 projects, 8 routines, 8 backlog tasks, 24 package skills; idempotent rerun retained eight routines.
- Hermes environment diagnostics: six active agents found Hermes 0.20.5 and the executable; OAuth is not reported as an environment API key, so diagnostics remain warning-level.
- Hermes actual model smoke: passed with exact output `SELLHAND_HERMES_SMOKE_OK` using `openai-codex/gpt-5.6-sol` and a one-turn/90-second bound.
- Fixture/package tests: 14/14 passed, including schema-validated BusinessOS contracts, fixture expectations, repository mapping, isolated process ownership, runtime override propagation, fail-closed adapter diagnostics, and Make lifecycle targets.
- Typecheck (`pnpm -r typecheck`): passed (exit 0 across all workspace packages).
- Unit tests (`pnpm test:run`): attempted for 39 minutes but did not complete; multiple existing server workspace/heartbeat suites reported failures (including `heartbeat-accepted-plan-workspace-refresh.test.ts`) and the run was terminated. Sellhand-focused tests pass 14/14, and no Paperclip core files changed.
- Build (`pnpm build`): passed (exit 0; UI emitted only the existing chunk-size advisory).
- Browser E2E/design-token gates: not run because no UI or browser-flow code changed. Real import/API/bootstrap smoke provides the relevant end-to-end slice.

## Pre-existing/environment failures

1. Baseline `company-import-export-e2e.test.ts` timed out waiting for its ephemeral server because its child process attempted to download pnpm through Corepack; the other 83 selected tests passed and one was skipped.
2. `pnpm install` warned that plugin SDK bin targets did not exist before SDK build; install completed and later package preparation built the SDK.
3. The broad `pnpm test:run` remained in existing server workspace/heartbeat suites for 39 minutes and reported failures unrelated to the isolated Sellhand package before termination; targeted Sellhand tests, repository typecheck, and build pass.

## Security review

- No secret values or `.env` files are present or committed.
- Static scan rejects dangerous git/history/direct-DB/destructive-root command patterns and machine-specific paths in portable markdown/YAML.
- Fixture runner has no network code and fails closed on non-fixture tenant, missing approval, or denied policy.
- Scripts quote paths, bind loopback, use a contained ignored runtime, record/verify the runner process before stopping it, and never invoke SQL.
- Timers and routine triggers are disabled; starter tasks are backlog; final company has zero heartbeat runs.
- Prompt/source instructions are treated as untrusted data; skills prohibit live PII, external effects, credential discovery, and policy bypass.
- Independent review: initial and follow-up reviews identified process ownership, instance ownership, runtime override propagation, adapter diagnostic handling, schema validation, fixture expectations, bootstrap assertions, duplicate workspaces, and overstated QA evidence. The implementation/reproducibility blockers were corrected and regression-tested. Product slice B is now explicitly scoped as a fixture demonstration; a truly independent reviewer-run artifact remains future work and is not claimed.

## Known limitations

1. No live CRM, public-source restaurant research, external sending, BusinessOS network command service, payments, ads, Gmail, POS, or production integration is implemented.
2. Current Paperclip company portability does not import goals/project-goal links or machine cwd; deterministic supported-API post-configuration is required.
3. Re-importing recurring tasks into an existing company creates duplicate routines in this Paperclip version; reruns therefore exclude issues/routines after the first import.
4. The existing local `codehornets/sellhand` checkout has pre-existing modified/untracked files. It is now configured as the product agents' repository, but implementation must use the builder's worktree mode and preserve the main checkout.
5. Hermes environment diagnostics warn about no environment API key because this installation uses OpenAI Codex OAuth; the bounded actual model smoke passed.

## Rollback

1. Stop the isolated runner with `scripts/stop-sellhand-local.sh`.
2. Delete Sellhand through the supported board/company-delete API or CLI.
3. Verify the contained path, then remove only ignored `.paperclip-local/sellhand` state.
4. Revert local commits normally if source rollback is needed. Do not reset hard, force-push, rewrite history, or patch PostgreSQL.

## Exact next action

Run the Sellhand repository's documented context/typecheck/test/build baseline in a clean builder-created worktree, preserving the dirty main checkout, before assigning the first implementation issue.
