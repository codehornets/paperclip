---
name: pnpm-workspace-build-order
description: Use for pnpm "Failed to create bin" warnings after a clone.
category: build-tooling
---

# pnpm workspace build order

When `pnpm i` warns `Failed to create bin`, the package's `bin` points into `dist/`, which only exists after a build. Build only those packages, then reinstall so pnpm can create the links:

    pnpm --filter <pkg-a> --filter <pkg-b> build && pnpm i

- Read the affected package names from the warning, and check each package.json `bin` field to confirm its target sits in `dist/`.
- Do not use a filter that pulls in dependents (`...pkg`). They rebuild for nothing, and in this repo that reached a release `cargo build` that took about 42 minutes.
- Before a long native build (cargo `--release`, etc.) inside a chain, ask whether the user needs it.
- Compiler warnings printed during a build (unused imports, dead code, "build inputs not recorded") are not install failures. Report them separately.
