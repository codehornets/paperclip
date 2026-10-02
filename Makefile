SHELL := /bin/bash

.PHONY: install setup run ensure clear reset help

help:
	@printf '%s\n' \
	  'make install  Install pinned Paperclip dependencies' \
	  'make setup    Install dependencies and bootstrap Sellhand locally' \
	  'make run      Start/refresh the local Sellhand Paperclip instance' \
	  'make ensure   Recover the Sellhand read path only when health is unavailable' \
	  'make clear    Stop Sellhand and clear generated logs/artifacts only' \
	  'make reset    Stop Sellhand, reset its local data, and bootstrap again'

install:
	pnpm install --frozen-lockfile

setup: install
	./scripts/bootstrap-sellhand-local.sh

run:
	./scripts/bootstrap-sellhand-local.sh

ensure:
	./scripts/ensure-sellhand-read-path.sh

clear:
	./scripts/clear-sellhand-local.sh

reset:
	./scripts/reset-sellhand-local.sh
