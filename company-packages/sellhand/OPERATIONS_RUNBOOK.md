# Sellhand Local Operations Runbook

## Start/bootstrap

Run `scripts/bootstrap-sellhand-local.sh`. Default URL is `http://127.0.0.1:3210`; isolated runtime state is under ignored `.paperclip-local/sellhand`. The script records the managed runner PID through Paperclip's service registry and prints cleanup commands.

In a linked Paperclip Git worktree, bootstrap creates the ignored `.paperclip/.env` marker now required by the development server. It stores no credentials and does not replace the dedicated Sellhand runtime home, instance, or port.

Fresh current-version instances may need to apply hundreds of migrations and build the plugin SDK before health becomes available. Bootstrap waits up to 900 seconds by default; set `SELLHAND_PAPERCLIP_STARTUP_TIMEOUT_SECONDS` to a positive integer when a slower machine needs a larger bound.

Convenience targets from the repository root: `make install`, `make setup`, `make run`, `make ensure`, `make clear`, and `make reset`. `make ensure` is the idempotent preflight for scheduled read-only reviews: it exits immediately when health is available and otherwise uses the supported bootstrap recovery. `clear` preserves the local database/configuration and removes only owned logs/artifacts. `reset` preserves configuration, secret keys, and the local Sellhand repository override while recreating database/runtime data and re-running bootstrap.

The machine-local repository mapping lives at `.paperclip-local/sellhand/local-overrides.json` (ignored by Git). On this workstation it points to the sibling `../sellhand` checkout and verifies the origin is `https://github.com/codehornets/sellhand.git`. Paperclip configures `product-engineering-lead`, `product-builder`, and `qa-reliability-reviewer` with that repository as their Hermes `cwd`; the builder additionally uses Hermes worktree mode so it does not edit the user's dirty main checkout directly.

## Verify

Run `scripts/validate-sellhand-package.sh` and `scripts/smoke-test-sellhand.sh`. Inspect health, company/agent/project/routine API readback, import preview warnings, adapter diagnostics, and fixture artifacts.

## Stop

Run `scripts/stop-sellhand-local.sh`. Do not kill the separate Sellhand proxy currently using port 3100. Bootstrap uses port 3210.

## Rollback

Delete the Sellhand company through supported CLI/API, stop the isolated runner, then remove only the verified ignored runtime root. Never patch PostgreSQL or use broad recursive deletion. Timers remain disabled; assignment wakeups are enabled; max concurrency is one; missed routine runs are skipped; one transient retry is allowed.
