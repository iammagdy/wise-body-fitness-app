# Exercise loop animations

Drop short looping clips here to replace the generic animated
fallback on the workout screen.

Recommended format: MP4 (H.264) ~3–6 s. Per-exercise cartoon
demos are 9:16 720p ~1 MB. Sub-category fallbacks are 1:1 480×480.

## Naming and resolution order

The workout screen calls `loopSourceFor(exercise, gender)` and
picks the FIRST file that matches, in this order:

1. `<exercise-id>__<gender>.mp4` — per-exercise, per-gender
   stylized cartoon clip. `<gender>` is `man` or `woman`. This is
   the highest priority and is the format used by the pilot
   exercises.
   Examples: `m1__man.mp4`, `m1__woman.mp4`, `pp1__woman.mp4`.
2. `<exercise-id>.mp4` — per-exercise gender-neutral loop
   (legacy / non-pilot path).
3. `<sub-category-slug>.mp4` — fallback shared by every exercise
   in that sub-category. Slug rule: lowercase, non-alphanumerics
   → `-`. Example: `Pregnancy Safe` → `pregnancy-safe.mp4`.
4. No match → tasteful animated SVG illustration.

## Registering a file

Files placed here are NOT auto-discovered. Add the bare ID to
the right manifest near the top of `src/App.tsx`:

- Per-exercise gendered clips → add the exercise ID to
  `GENDERED_LOOP_MANIFEST`. Both the `__man.mp4` and `__woman.mp4`
  files are then resolved automatically.
- Per-exercise neutral clips and sub-category fallbacks → add the
  bare filename (without `.mp4`) to `LOOP_MANIFEST`.

```ts
const GENDERED_LOOP_MANIFEST = new Set([
  "m1",                 // ships m1__man.mp4 + m1__woman.mp4
]);

const LOOP_MANIFEST = new Set([
  "pregnancy-safe",     // sub-category slug
]);
```

When nothing matches the workout screen renders the animated SVG
illustration so the screen never looks empty. Reduced-motion
users always see the SVG, regardless of which clips are present.
