# Sellhand Control Plane Architecture

## Decision

Use a portable full-company package plus a deterministic fixture runner. No Paperclip core modification is required.

## Boundaries

`Paperclip control plane → Hermes runtime → proposed BusinessOS actions → policy/approval → BusinessOS command execution → outcome evidence`.

Paperclip owns companies, goals, projects, issues, agents, org chart, budgets, routines, approvals, reviews, and audit lineage. Hermes owns reasoning, research, drafting, coding, analysis, and bounded tool use. BusinessOS owns tenant isolation, domain objects, policies, workflows, commands, integrations, and outcomes. External systems remain outside bootstrap.

## Extension points

The package uses Agent Companies markdown, `.paperclip.yaml`, managed instructions, company skills, projects/tasks, disabled routine triggers, import preview/apply APIs, and built-in `hermes_local`. A remote `hermes_gateway` example is provided but inactive.

## BusinessOS boundary

The fixture runner validates typed work requests, proposals, commands, and outcomes. It enforces organization context, approval references, idempotency, and fixture-only policy. Agents never receive direct production database credentials.

## Upgrade and rollback

Validate the package against the checked-out importer before each Paperclip upgrade. Preview imports before apply. Roll back through supported company deletion and isolated runtime cleanup; never patch the DB. Portable Git metadata points to `https://github.com/codehornets/sellhand.git`, but local cwd is supplied only by ignored override.
