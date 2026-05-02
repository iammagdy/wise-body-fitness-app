# Exercise loop animations

Drop short looping clips here to replace the generic animated
fallback on the workout screen.

Recommended format: MP4 (H.264) ~3–5 s, square 480×480, 200–500 KB.
WebM is also fine.

## Naming
- `<exercise-id>.mp4` — per-exercise loop (highest priority).
- `<sub-category-slug>.mp4` — fallback for any exercise in that
  sub-category. Slug rule: lowercase, non-alphanumerics → `-`.
  Example: `Pregnancy Safe` → `pregnancy-safe.mp4`.

## Registering a file
Files placed here are NOT auto-discovered. To make the workout
screen pick them up, also add the bare filename (without `.mp4`)
to `LOOP_MANIFEST` near the top of `src/App.tsx`. Example:

```ts
const LOOP_MANIFEST = new Set([
  "m1",                 // exercise id
  "pregnancy-safe",     // sub-category slug
]);
```

When the manifest has no entry for an exercise (or its
sub-category), the workout screen renders a tasteful animated
SVG generic loop so the screen never looks empty.
