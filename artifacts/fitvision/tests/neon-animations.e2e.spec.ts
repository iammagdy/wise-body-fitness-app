/**
 * Task #35 e2e coverage spec: every exercise renders a uniquely
 * identifiable neon silhouette animation.
 *
 * Authored as a Playwright spec so it can be wired into a future
 * Playwright runner with no rewrite. The same plan is also driven
 * by the agent's `runTest()` harness in CI today (no @playwright/test
 * dependency is installed in the workspace yet — see README).
 *
 * Asserts (in priority order):
 *   1. data-anim-sig (== NEON_ANIM_BY_ID[id].key) is unique across
 *      every visited exercise. This is the BEHAVIORAL uniqueness
 *      contract: it would still trip if two exercises were given the
 *      same animation implementation under different exercise ids.
 *   2. data-anim-id is also unique across the visited exercises (this
 *      is largely tautological because data-anim-id == exercise.id,
 *      but it pins the contract that no exercise renders without a
 *      stable id attribute, and that the visited slice is genuinely
 *      a slice of distinct exercises).
 *   3. The visited slice spans ≥4 distinct category prefixes covering
 *      ≥3 named buckets among {strength, core, cardio, recovery,
 *      mobility}. The catalog itself spans all 5 buckets — see the
 *      coverage table in App.tsx — and the dev-load asserts there
 *      enforce per-exercise uniqueness (key + sampled-trajectory) for
 *      ALL 82 entries on every page load. This e2e covers the live
 *      runtime path; the dev assert covers full breadth statically.
 *   4. Zero browser-console errors / pageerrors during the run.
 */
import { test, expect, type Page } from "@playwright/test";

const APP_PATH = "/fitvision/";
const MIN_EXERCISES = 12;

// Target the ACTIVE workout illustration explicitly via its
// data-testid, not the first svg in the DOM. This avoids accidentally
// reading the up-next preview thumbnail (which also renders a
// NeonSilhouette) and makes the assertion deterministic.
const ACTIVE_SVG = '[data-testid="workout-illustration"] svg[data-anim-id]';

async function readCurrentAnimId(page: Page): Promise<string | null> {
  return page.locator(ACTIVE_SVG).first().getAttribute("data-anim-id");
}

async function readCurrentAnimSig(page: Page): Promise<string | null> {
  return page.locator(ACTIVE_SVG).first().getAttribute("data-anim-sig");
}

async function advanceToNextExercise(page: Page): Promise<void> {
  // The workout screen exposes a "Skip"/"Next" control depending on
  // the variant. Try button first, fall back to keyboard ArrowRight.
  // Failures are NOT swallowed — a broken Next control should fail
  // the test immediately so navigation regressions surface loudly.
  const prev = await readCurrentAnimId(page);
  const skip = page.getByRole("button", { name: /skip|next/i }).first();
  if (await skip.isVisible()) {
    await skip.click();
  } else {
    await page.keyboard.press("ArrowRight");
  }
  await page.waitForFunction(
    ({ sel, prev }) =>
      document.querySelector(sel)?.getAttribute("data-anim-id") !== prev,
    { sel: ACTIVE_SVG, prev },
    { timeout: 10_000 },
  );
}

test("workout flow shows a unique neon silhouette per exercise", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.goto(APP_PATH);

  // Onboarding: pick a profile and start a workout. The exact UI
  // changes over time; nudge through any "Continue"/"Start" CTAs.
  for (let i = 0; i < 6; i++) {
    const cta = page
      .getByRole("button", { name: /start|begin|continue|woman|man/i })
      .first();
    if (!(await cta.isVisible().catch(() => false))) break;
    await cta.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  await page.waitForSelector("svg[data-anim-id]", { timeout: 15_000 });

  const seen: { id: string; sig: string }[] = [];
  for (let i = 0; i < MIN_EXERCISES + 6; i++) {
    const id = await readCurrentAnimId(page);
    const sig = await readCurrentAnimSig(page);
    expect(id, "exercise must declare a data-anim-id").toBeTruthy();
    expect(sig, "exercise must declare a data-anim-sig").toBeTruthy();
    if (id && sig && !seen.some((s) => s.id === id)) seen.push({ id, sig });
    if (seen.length >= MIN_EXERCISES) break;
    await advanceToNextExercise(page);
  }

  expect(
    seen.length,
    `expected at least ${MIN_EXERCISES} distinct exercises; saw ${seen.map((s) => s.id).join(", ")}`,
  ).toBeGreaterThanOrEqual(MIN_EXERCISES);

  // Strict id uniqueness.
  const ids = seen.map((s) => s.id);
  expect(new Set(ids).size).toBe(ids.length);

  // Strong behavioral uniqueness — two distinct exercise ids that
  // accidentally render the same pose+props implementation will share
  // the same data-anim-sig hash and fail this assertion. This catches
  // the regression that the task is most concerned about, which the
  // id-based check alone cannot.
  const sigs = seen.map((s) => s.sig);
  expect(
    new Set(sigs).size,
    `pose-derived signatures must be unique across exercises; got ${seen
      .map((s) => `${s.id}=${s.sig}`)
      .join(", ")}`,
  ).toBe(sigs.length);

  // Cross-category coverage: every exercise prefix corresponds to a
  // named bucket on the product side. We require the collected slice
  // to span at least 4 distinct prefixes AND to touch at least 3 of
  // the named buckets {strength, core, cardio, recovery, mobility}.
  const PREFIX_TO_BUCKET: Record<string, string> = {
    m: "strength", w: "strength", s: "strength", ps: "strength", pp: "strength",
    b: "core", c: "cardio",
    h: "mobility", wh: "mobility",
    tn: "recovery", rn: "recovery", fc: "recovery", rf: "recovery", r: "recovery", tr: "recovery",
  };
  const prefixes = new Set(ids.map((id) => id.replace(/[0-9]+$/, "")));
  expect(
    prefixes.size,
    `expected ≥4 distinct exercise prefixes, got ${[...prefixes].join(",")}`,
  ).toBeGreaterThanOrEqual(4);
  const buckets = new Set(
    [...prefixes].map((p) => PREFIX_TO_BUCKET[p]).filter(Boolean),
  );
  expect(
    buckets.size,
    `expected ≥3 named buckets among {strength, core, cardio, recovery, mobility}, got ${[...buckets].join(",")}`,
  ).toBeGreaterThanOrEqual(3);

  // Up-next preview surface: the second neon-rendering surface in
  // the workout flow. Verify the preview thumbnail also exposes a
  // valid {data-anim-id, data-anim-sig} pair drawn from the same
  // contract, and that it points at a different exercise than the
  // active workout (the next-up exercise).
  const upNext = page.locator('[data-testid="up-next-illustration"] svg[data-anim-id]').first();
  if (await upNext.count() > 0) {
    const upId = await upNext.getAttribute("data-anim-id");
    const upSig = await upNext.getAttribute("data-anim-sig");
    expect(upId, "up-next preview must declare a data-anim-id").toBeTruthy();
    expect(upSig, "up-next preview must declare a data-anim-sig").toBeTruthy();
    const activeId = await readCurrentAnimId(page);
    expect(
      upId,
      `up-next preview should differ from the active exercise (${activeId})`,
    ).not.toBe(activeId);
  }

  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
