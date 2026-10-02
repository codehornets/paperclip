# Sellhand Control Plane Bootstrap Implementation Plan

Date: 2026-08-22
Status: In progress
Branch: `feat/sellhand-control-plane-bootstrap`
Baseline commit: `3ff636bc4852dfc07fcab8ccfdb0b4fd22c1548c`

## Objective

Initialize Sellhand as a portable Agent Companies package, import it into an isolated local Paperclip instance, configure six assignment-driven Hermes agents, and prove two deterministic fixture-only workflows without changing Paperclip core or touching live Sellhand systems.

## Existing extension points

- Agent Companies `agentcompanies/v1` markdown packages with `.paperclip.yaml` fidelity sidecars.
- Company preview/import API and `paperclipai company import --dry-run`.
- Managed agent instruction bundles and company skills.
- Built-in `hermes_local` and prepared `hermes_gateway` adapters.
- Portable projects, starter tasks, recurring routines, budgets, permissions, and org-tree reporting.
- Plugin/MCP/tool services for later governed BusinessOS effects; fixture runner for bootstrap.

## Architectural boundary

Paperclip owns organizational intent, goals, projects, tasks, reviews, approvals, budgets, routines, and audit evidence. Hermes reasons and produces artifacts. Sellhand BusinessOS remains authoritative for tenant business objects, commands, workflows, integrations, and outcomes. Agents may propose typed actions; they do not access authoritative production databases or directly perform governed external effects.

## Portable package architecture

Use `company-packages/sellhand/` because the repository has team and skill catalogs but no canonical in-repository full-company catalog. Canonical files contain stable slugs, relative references, portable Git metadata, declarations, and disabled schedules only. Machine-local Paperclip state and working-directory overrides live under ignored `.paperclip-local/` and are applied after import through supported APIs.

## Agent organization

A strict tree rooted at `sellhand-ceo`; six bootstrap agents are active records with timer heartbeats disabled and assignment wakeups enabled. Eight future roles import paused and remain unscheduled. Builder and QA are separate agents. Only management roles may propose hiring; company-level approval for new agents remains enabled.

## Skills architecture

Twenty-four focused `SKILL.md` packages define input validation, allowed tools, forbidden actions, deterministic procedures, output contracts, evidence, quality gates, retries, escalation, and good/bad examples. Artifacts are attached or linked to originating work; vague open-ended marketing execution is prohibited.

## BusinessOS integration

Bootstrap uses a typed deterministic Node fixture runner rather than a network service. This is least invasive, requires no credentials, exercises tenant/idempotency/policy/approval contracts, and cannot accidentally reach live systems. A future external tool service or plugin may implement the same schemas after policy enforcement exists.

## Security and autonomy policy

L0-L2 only for validated internal fixture workflows. L3 disabled. L4 always requires explicit human approval. L5 prohibited. External communication, publishing, spend, price/menu changes, deployment, financial actions, contracts, access control, destructive operations, sensitive PII, and exceptions never execute during bootstrap. Scripts fail closed, quote paths, bind loopback, avoid direct DB access, and never print secrets.

## Bootstrap and import

1. Verify Node, pnpm, Hermes, package root, clean portable configuration, and server health.
2. Validate structure, schemas, references, scripts, and deterministic tests.
3. Preview import and surface warnings.
4. Import through the supported CLI/API with automations paused.
5. Apply ignored local cwd overrides through the agent API.
6. Verify company, org tree, agents, skills, goals/projects/tasks/routines, budgets, permissions, and heartbeat policies by reading them back.
7. Run adapter environment diagnostics and fixture smoke tests.
8. Print cleanup commands; never mutate PostgreSQL directly.

## Testing strategy

Follow red-green-refactor for the fixture runner and package validator. Run package tests, fixture workflow tests, shell syntax/security checks, import preview, real isolated import, API readback, Hermes adapter tests/diagnostics, then repository typecheck, unit tests, and build. Browser E2E is only required if relevant import/UI behavior is changed; no UI/core code is planned.

## Rollback

Stop the managed dev runner, delete the imported Sellhand company through the supported company API/CLI, and remove only the ignored isolated `.paperclip-local/sellhand` runtime directory after validating its containment. Revert local commits normally; never reset hard or rewrite history.

## Upstream upgrade strategy

Keep Sellhand isolated from Paperclip core. Pin and report the baseline Paperclip commit, validate against the current company bundle schema before upgrades, run preview import and deterministic checks after rebases, maintain adapter configuration in `.paperclip.yaml`, and document importer fidelity gaps in the package runbook. Core modifications require a separate ADR, focused tests, and upstream-compatible justification.

## Execution order

1. Package validator and fixture-runner tests (RED).
2. Canonical architecture, governance, registry, schemas, fixtures, agents, projects/tasks/routines, and skills.
3. Fixture runner and vertical slices (GREEN).
4. Bootstrap scripts, isolated import, supported post-import configuration, and API verification.
5. Independent security/QA review, broad verification, reports, and logical local commits.
