/* The five minute floor on every stretch block, asserted.
     node --test mo-knowledge/engine/mobility-floor.test.mjs */
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickBlock, mobilityFor, COOLDOWN_SECONDS, WARMUP_SECONDS, RAMPED_WARMUP_SECONDS } from "./mobility.mjs";

const secs = (moves) => moves.reduce((n, m) => n + (Number(m.seconds) || 0) * (m.perSide ? 2 : 1), 0);

test("a cool-down aimed at one group still reaches the floor", () => {
  const b = pickBlock({ kind: "static", groups: ["lats"], budgetSec: COOLDOWN_SECONDS, stopAtCoverage: true, minSec: COOLDOWN_SECONDS });
  assert.ok(secs(b) >= COOLDOWN_SECONDS, `got ${secs(b)}s`);
});

test("without the floor the same block stops short, which is the bug", () => {
  const b = pickBlock({ kind: "static", groups: ["lats"], budgetSec: COOLDOWN_SECONDS, stopAtCoverage: true });
  assert.ok(secs(b) < COOLDOWN_SECONDS, "if this fails the floor is no longer needed");
});

test("mobilityFor's cool-down and warm up fill their budgets", () => {
  for (const day of [
    { name: "Pull day", mainGroups: ["lats", "biceps"], worked: ["lats", "biceps", "forearms"], mainPatterns: ["pull"], allPatterns: ["pull"] },
    { name: "Leg day", mainGroups: ["quads", "glutes"], worked: ["quads", "glutes", "hamstrings"], mainPatterns: ["squat", "hinge"], allPatterns: ["squat", "hinge"] },
  ]) {
    const r = mobilityFor(day, { level: "beginner", hurts: [], missing: [] });
    assert.ok(secs(r.cooldown) >= COOLDOWN_SECONDS, `${day.name} cool-down ${secs(r.cooldown)}s`);
    assert.ok(secs(r.warmup) >= WARMUP_SECONDS, `${day.name} warm up ${secs(r.warmup)}s`);
  }
});

test("a ramped day keeps its shorter warm up, filled to that budget", () => {
  const day = { name: "Push day", mainGroups: ["chest"], worked: ["chest", "triceps"], mainPatterns: ["push"], allPatterns: ["push"], rampSets: [{}] };
  const r = mobilityFor(day, { level: "beginner", hurts: [], missing: [] });
  assert.ok(secs(r.warmup) >= RAMPED_WARMUP_SECONDS, `ramped warm up ${secs(r.warmup)}s`);
});
