# Exercise loop animations — RETIRED

This directory used to ship per-exercise MP4 demonstration clips
(Tasks #26, #27, #29). Those clips have been removed in favor of the
**neon silhouette system** (Task #30): every exercise on the workout
screen is now rendered as a glowing humanoid SVG that's animated by
`requestAnimationFrame`, so loops are mathematically seamless and
the video-freeze bug is structurally impossible.

The retired runtime hooks (`LOOP_MANIFEST`, `GENDERED_LOOP_MANIFEST`,
`loopSourceFor`) have been deleted from `src/App.tsx`. The directory
itself is kept on disk only so a stale browser cache requesting an
old `loops/<id>.mp4` URL gets a clean 404 instead of a misroute.

If you ever want to bring back a real video clip for one specific
exercise, see git history (Task #29 plan) for the original wiring.
