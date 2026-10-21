pnpm install --reporter=append-only 2>&1 | rtk grep -ci 'Failed to create bin'
...
packages/paperclip-runner build:     Finished `release` profile [optimized] target(s) in 41m 47s
packages/paperclip-runner build: paperclip.runner-build-inputs not recorded: inputs changed while the build ran (digest 7d306c012c1d at start, 53be3d1f8d2b now); the next consumer rebuilds