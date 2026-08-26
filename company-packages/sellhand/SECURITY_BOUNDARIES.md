# Security Boundaries

## Trust and authority

Paperclip board is the governance authority; agents have role-scoped instructions and conservative budgets. Hermes local runs are host processes and therefore receive only bounded workspaces and no live business credentials. BusinessOS independently authorizes every command.

## Boundaries

- Filesystem: canonical package uses relative paths; local override is ignored; coding agents use separate worktrees.
- Secrets: values never enter markdown/YAML/tasks/logs; future names are declarations bound through Paperclip secrets.
- Tenant: every request carries organization and restaurant context; mismatches fail closed.
- External actions: bootstrap has none; drafts explicitly say not sent/published/launched.
- Network: Paperclip binds loopback; fixture runner performs no network calls; remote gateway requires HTTPS except loopback.
- Approval: L4 requires a durable board approval reference and policy decision.
- Logging: redact credentials/PII; record correlation IDs, evidence refs, decisions, and outcomes.

## Threat review

Prompt injection is treated as untrusted source data; agents never follow source-page instructions. Tool output is schema-validated before use. Dependencies and plugins are supply-chain boundaries and require pinned provenance/review. Imported scripts are not executed automatically. Budgets, bounded timeouts, maximum turns, assignment wakeups, max concurrency one, and disabled timers mitigate runaway execution. Atomic checkout and strict reporting prevent duplicate/conflicting work. Restaurant context must never be reused across tenant IDs.

## Incident shutdown

Pause affected agents and routines, cancel queued/running work, revoke scoped bindings, preserve logs, identify the human incident owner, open an incident issue, and use supported cleanup. Never delete evidence or mutate DB rows directly.
