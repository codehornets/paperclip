# Sellhand Autonomy Policy

## Levels

- L0 — Observe only.
- L1 — Analyze and draft.
- L2 — Execute internal, reversible, low-risk work.
- L3 — Bounded external/operational execution; disabled during bootstrap.
- L4 — Prepare high-impact action; explicit human approval is mandatory before execution.
- L5 — Broad autonomous execution; prohibited during bootstrap.

Only validated L0-L2 fixture workflows are enabled. All external communications, public publishing, campaigns/spend, prices, live menus, production deployment, financial effects, contracts, access control, destructive data work, sensitive PII, policy exceptions, and legal/tax/medical/regulated decisions require a human and remain non-executable here.

Agents propose typed BusinessCommands; they do not directly execute high-impact business actions. Missing tenant, policy, approval, idempotency, budget, or evidence context fails closed. L3 activation requires a board decision after reliability, false-positive, rollback, audit, and incident thresholds are documented. Budget hard stops pause work.
