# Sellhand Company Package

Portable Agent Companies package for Sellhand. Canonical configuration contains no runtime IDs, credentials, secret values, or machine paths.

- Validate: `scripts/validate-sellhand-package.sh`
- Bootstrap an isolated local instance: `scripts/bootstrap-sellhand-local.sh`
- Smoke test: `scripts/smoke-test-sellhand.sh`
- Stop: `scripts/stop-sellhand-local.sh`

## Make commands

- `make install` — install pinned dependencies.
- `make setup` — install dependencies and bootstrap Sellhand.
- `make run` — start or refresh the local Sellhand Paperclip instance.
- `make ensure` — health-check the local read path and run the idempotent bootstrap recovery only when it is unavailable; scheduled read-only reviews should use this as their preflight.
- `make clear` — stop Sellhand and remove generated logs/artifacts while preserving its database and configuration.
- `make reset` — stop Sellhand, remove its local database/runtime data while preserving configuration/secrets/repository mapping, then bootstrap a fresh company.

Machine-local state and overrides are written under ignored `.paperclip-local/sellhand/`. The existing Sellhand product repository is `codehornets/sellhand`; this bootstrap records its portable Git URL but does not edit or execute that repository.

When run from a linked Paperclip Git worktree, bootstrap creates the ignored `.paperclip/.env` marker required by current Paperclip development servers. The marker contains no credentials; the isolated home, instance, and port continue to come from the bootstrap environment.
