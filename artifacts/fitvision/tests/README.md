# FitVision tests

## `neon-animations.e2e.spec.ts`

End-to-end Playwright spec for **Task #35** — every exercise must render
a uniquely identifiable neon silhouette animation on the workout screen.

The spec drives the workout screen, advances through 12+ consecutive
exercises spanning at least 3 category prefixes, asserts each
`svg[data-anim-id]` is unique, and fails on any browser console error.

The workspace does not currently install `@playwright/test` as a shared
dependency, so this spec is wired through the agent `runTest()` harness
in CI. To run it locally with Playwright, install the runner once:

```sh
pnpm add -D -w @playwright/test
pnpm exec playwright install chromium
pnpm exec playwright test artifacts/fitvision/tests
```

The same invariants are also enforced statically at dev-load time by
the assertion block at the end of `src/App.tsx` (every exercise id must
have a `NEON_ANIM_BY_ID` entry, and every entry must have a unique
`(pose, props)` source signature).
