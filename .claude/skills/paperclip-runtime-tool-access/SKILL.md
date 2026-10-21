---
name: paperclip-runtime-tool-access
description: Use when Paperclip runtime MCP tools 422 on task-less runs.
category: agent-orchestration
---

# Paperclip runtime connection tools exist only for task-bound runs

The runtime-tools MCP endpoint (`/mcp/runtime-tools`) rejects every call, MCP `initialize` included, from a heartbeat run that has no task. Never mint runtime connection tools for a run without an issue/task id, even when a responsible user is present.

- `createAdapterRuntimeToolAccess` in `server/src/services/heartbeat/run-preparation.ts` takes `issueId` and returns `undefined` when it is null. The check runs after the `responsibleUserId` check.
- `server/src/services/heartbeat/runtime-execution.ts` passes `issueId: issueRef?.id ?? null` and logs "runtime connection tools could not be delivered" only when `issueRef` exists. Task-less runs (Run now, timer runs) must not log that warning.
- Regression symptom: the Codex MCP worker dies at startup with `HTTP 422: Connection requests require a task-bound heartbeat run`. Check this first if it reappears.
- Regression test: "offers runtime connection tools only to task-bound runs" in `server/src/services/heartbeat/run-preparation.test.ts`.
- Do not widen the `0.160.0` codex-cli pin to silence the observability warning "not the qualified 0.160.0 release". That line is expected when a different codex-cli is installed, and it only skips the observability export.
