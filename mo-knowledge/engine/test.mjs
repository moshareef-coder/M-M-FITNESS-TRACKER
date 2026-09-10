/* Test suite for the engine, node's built in runner, no dependencies.
 *
 * node --test mo-knowledge/engine/
 *
 * Tests the public API: what each module exports, not how it is implemented
 * inside. Other agents are editing goal-engine.mjs and training-age.mjs in
 * parallel, keeping exported names and signatures stable, so that is the
 * contract this file relies on.
 *
 * Where a test fails because the engine looks wrong rather than the test
 * being wrong, the test stays in and is marked with a todo option instead of
 * being deleted or loosened, so the suite stays green and the gap stays on
 * record. See the report handed back alongside this file for the full list.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { deriveTrainingAge, observedCapacity, THRESHOLDS } from "./training-age.mjs";
import { resolveGoal, GOAL_PARAMS } from "./goal-engine.mjs";
import { coldStart1RM, prescribeLoad, patternFor, variantFactor, roundLoad } from "./load.mjs";
import { buildPlan } from "./plan.mjs";
import { conjunctiveWeek, chooseComparison, sharedSchedule, relativeScore, PRODUCTIVE_GAP } from "./pair.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const TREE = JSON.parse(readFileSync(join(here, "../goals/goal-tree.json"), "utf8"));

/* ---- shared helpers, matching demo.mjs ---- */

const day = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

/* A plausible log history: `n` sessions ending `endedDaysAgo` ago, roughly every
   other day, with the weight climbing if `climbing`. Same shape as demo.mjs. */
const history = ({ n, endedDaysAgo = 1, climbing = true, lifts = ["Bench Press", "Barbell Back Squat"] }) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const back = endedDaysAgo + (n - 1 - i) * 3;
    for (const name of lifts) {
      out.push({
        entry_date: day(-back), exercise_name: name, sets: 3, reps: 8,
        weight: (name === "Bench Press" ? 135 : 185) + (climbing ? Math.round(i / 3) * 5 : 0),
      });
    }
  }
  return out;
};

/* Logs where the weight climbs every single session, not just every few, for
   the stillLinear case. history()'s climbing formula only steps every third
   session, which is realistic but not what that test needs. */
const climbingEverySession = (n, endedDaysAgo = 1, step = 2) =>
  Array.from({ length: n }, (_, i) => ({
    entry_date: day(-(endedDaysAgo + (n - 1 - i) * step)),
    exercise_name: "Bench Press",
    weight: 135 + i * 5,
  }));

/* Logs that climb for the first `plateauAfter` sessions then hold flat, so
   linear progression has visibly stopped without the session count changing. */
const climbThenPlateau = (n, plateauAfter, endedDaysAgo = 1, step = 2) =>
  Array.from({ length: n }, (_, i) => ({
    entry_date: day(-(endedDaysAgo + (n - 1 - i) * step)),
    exercise_name: "Bench Press",
    weight: 135 + Math.min(i, plateauAfter) * 5,
  }));

/* Two blocks of history with a deliberate gap between them, for the
   restarting case: `before` sessions, a gap of `gapDays`, then `after`
   sessions ending `endedDaysAgo` ago. */
const historyWithGap = ({ before, after, gapDays, endedDaysAgo = 1, step = 3 }) => {
  const recent = history({ n: after, endedDaysAgo, lifts: ["Bench Press"] });
  const recentOldestBack = endedDaysAgo + (after - 1) * step;
  const older = history({ n: before, endedDaysAgo: recentOldestBack + gapDays, lifts: ["Bench Press"] });
  return older.concat(recent);
};

/* =========================================================================
 * training-age.mjs
 * ========================================================================= */

test("empty logs give beginner level, no confidence, and a one entry why", () => {
  const r = deriveTrainingAge({ logs: [] });
  assert.equal(r.level, "beginner");
  assert.equal(r.confidence, "none");
  assert.equal(r.why.length, 1);
});

test("six sessions is a beginner with low confidence", () => {
  const r = deriveTrainingAge({ logs: history({ n: 6 }) });
  assert.equal(r.level, "beginner");
  assert.equal(r.confidence, "low");
});

test("twenty five sessions spread every three days ending yesterday is a novice", () => {
  const r = deriveTrainingAge({ logs: history({ n: 25 }) });
  assert.equal(r.level, "novice");
});

test("ninety sessions with a hundred day gap thirty sessions from the end resets to those thirty", () => {
  const logs = historyWithGap({ before: 60, after: 30, gapDays: 100 });
  const r = deriveTrainingAge({ logs });
  assert.equal(r.restarting, true);
  assert.equal(r.effectiveSessions, 30);
});

test("last session forty days ago counts as returning", () => {
  const r = deriveTrainingAge({ logs: history({ n: 5, endedDaysAgo: 40 }) });
  assert.equal(r.returning, true);
});

test("seventy sessions climbing every session stays linear and is held at novice", () => {
  const r = deriveTrainingAge({ logs: climbingEverySession(70) });
  assert.equal(r.stillLinear, true);
  assert.notEqual(r.level, "intermediate");
  assert.notEqual(r.level, "advanced");
});

test("observedCapacity is null under eight sessions and a number past it", () => {
  const low = deriveTrainingAge({ logs: history({ n: 5 }) });
  assert.equal(observedCapacity(low), null);
  const enough = deriveTrainingAge({ logs: history({ n: 20 }) });
  const cap = observedCapacity(enough);
  assert.equal(typeof cap, "number");
  assert.ok(cap > 0);
});

/* =========================================================================
 * goal-engine.mjs
 * ========================================================================= */

test("lose weight by date, twenty pounds in six weeks at 190, is not honest and offers a reachable number", () => {
  const r = resolveGoal({
    bubble: "lose-weight", child: "lose-by-date", amountLb: 20,
    byDate: new Date(Date.now() + 42 * 86400000), bodyWeightLb: 190,
  });
  assert.equal(r.timeline.honest, false);
  assert.ok(r.timeline.reachableLb >= 8 && r.timeline.reachableLb <= 13, `reachableLb was ${r.timeline.reachableLb}`);
  assert.ok(r.timeline.weeksNeeded >= 10);
  assert.ok(r.timeline.message.includes(String(r.timeline.reachableLb)));
});

test("lose a number, twenty pounds at 190 with no date, is honest and gives a target date", () => {
  const r = resolveGoal({ bubble: "lose-weight", child: "lose-a-number", amountLb: 20, bodyWeightLb: 190 });
  assert.equal(r.timeline.honest, true);
  assert.match(r.timeline.targetDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(r.timeline.weeksNeeded >= 10 && r.timeline.weeksNeeded <= 20);
});

test("build overall muscle, twenty pounds at 150 for a beginner, takes at least thirty weeks", () => {
  const r = resolveGoal({
    bubble: "build-muscle", child: "build-overall", amountLb: 20, bodyWeightLb: 150, level: "beginner",
  });
  assert.ok(r.timeline.weeksNeeded >= 30, `weeksNeeded was ${r.timeline.weeksNeeded}`);
});

test("abs with no body fat percent is an unknown timeline with no week count", () => {
  const r = resolveGoal({ bubble: "tone-lean-abs", child: "abs" });
  assert.equal(r.timeline.unknown, true);
  assert.ok(!/\d+\s*weeks?/i.test(r.timeline.message), `message should not name a number of weeks: ${r.timeline.message}`);
});

test("abs at 24 percent body fat, male, 190 lb, needs real weeks and real pounds", () => {
  const r = resolveGoal({ bubble: "tone-lean-abs", child: "abs", bodyFatPct: 24, sex: "Male", bodyWeightLb: 190 });
  assert.ok(r.timeline.lbToLose > 15, `lbToLose was ${r.timeline.lbToLose}`);
  assert.ok(r.timeline.weeks >= 12 && r.timeline.weeks <= 30, `weeks was ${r.timeline.weeks}`);
});

test("a first pull-up in six weeks is not honest, the known programme is sixteen", () => {
  const r = resolveGoal({ bubble: "do-a-thing", child: "first-pullup", byDate: new Date(Date.now() + 42 * 86400000) });
  assert.equal(r.timeline.honest, false);
});

test("an unknown bubble throws", () => {
  assert.throws(() => resolveGoal({ bubble: "not-a-real-bubble" }));
});

test("every bubble in GOAL_PARAMS resolves with no child and falls back to the default", () => {
  for (const bubble of Object.keys(GOAL_PARAMS)) {
    assert.doesNotThrow(() => {
      const r = resolveGoal({ bubble, child: undefined, bodyWeightLb: 180, sex: "Male", level: "beginner" });
      assert.equal(r.params, r.params); // resolved without throwing
    }, `bubble "${bubble}" should resolve with child undefined`);
  }
});

test("get stronger asks for fewer reps and more rest than lose weight", () => {
  const strong = resolveGoal({ bubble: "get-stronger", child: "strong-a-lift" });
  const lose = resolveGoal({ bubble: "lose-weight", child: "lose-a-number" });
  assert.ok(strong.params.repRange[0] < lose.params.repRange[0]);
  assert.ok(strong.params.restSec > lose.params.restSec);
});

/* =========================================================================
 * load.mjs
 * ========================================================================= */

test("allometric scaling gives a heavy beginner less than linear and a light one more", () => {
  const exercise = { name: "Bench Press" };
  const linear265 = 127 * (265 / 180);
  const linear140 = 127 * (140 / 180);
  const heavy = coldStart1RM({ exercise, bodyWeightLb: 265, sex: "Male", level: "beginner" });
  const light = coldStart1RM({ exercise, bodyWeightLb: 140, sex: "Male", level: "beginner" });
  assert.ok(heavy < linear265, `${heavy} should be under linear ${linear265}`);
  assert.ok(light > linear140, `${light} should be over linear ${linear140}`);
});

test("the squat to bench ratio is wider for women than for men at reference weights", () => {
  const squatEx = { name: "Barbell Back Squat" };
  const benchEx = { name: "Bench Press" };
  const maleRatio = coldStart1RM({ exercise: squatEx, bodyWeightLb: 180, sex: "Male", level: "beginner" })
    / coldStart1RM({ exercise: benchEx, bodyWeightLb: 180, sex: "Male", level: "beginner" });
  const femaleRatio = coldStart1RM({ exercise: squatEx, bodyWeightLb: 140, sex: "Female", level: "beginner" })
    / coldStart1RM({ exercise: benchEx, bodyWeightLb: 140, sex: "Female", level: "beginner" });
  assert.ok(femaleRatio > maleRatio, `female ratio ${femaleRatio} should exceed male ratio ${maleRatio}`);
});

test("patternFor sorts exercises into the right movement pattern", () => {
  assert.equal(patternFor("Lateral Raise"), "isolation");
  assert.equal(patternFor("Dumbbell Fly"), "isolation");
  assert.equal(patternFor("Romanian Deadlift"), "hinge");
  assert.equal(patternFor("Goblet Squat"), "squat");
  assert.equal(patternFor("Leg Press"), "squat");
  assert.equal(patternFor("Face Pull"), "isolation");
  assert.equal(patternFor("Pull-Up"), "verticalPull");
  assert.equal(patternFor("Barbell Row"), "horizontalPull");
  assert.equal(patternFor("Plank"), "core");
});

test("variantFactor discounts a goblet squat, boosts a leg press, and leaves a plain barbell alone", () => {
  assert.ok(variantFactor("Goblet Squat", "squat") < 0.5);
  assert.ok(variantFactor("Leg Press", "squat") > 1);
  assert.equal(variantFactor("Barbell Back Squat", "squat"), 1);
});

test("prescribeLoad gives no weight for bodyweight equipment", () => {
  const r = prescribeLoad({ exercise: { name: "Push-Up", equipment: "bodyweight" }, reps: 10 });
  assert.equal(r.weight, null);
  assert.equal(r.basis, "bodyweight");
});

test("prescribeLoad admits it does not know without bodyweight or logs", () => {
  const r = prescribeLoad({ exercise: { name: "Barbell Bench Press" }, reps: 8, bodyWeightLb: null, logs: [] });
  assert.equal(r.weight, null);
  assert.equal(r.basis, "unknown");
});

test("prescribeLoad uses the exact weight from an exact history match", () => {
  const logs = [{ entry_date: day(-2), exercise_name: "Bench Press", weight: 135 }];
  const r = prescribeLoad({ exercise: { name: "Bench Press" }, reps: 8, logs });
  assert.equal(r.weight, 135);
  assert.equal(r.basis, "your last session");
});

test("prescribeLoad starts light, roughly 0.55x, when the lifter is returning", () => {
  const logs = [{ entry_date: day(-2), exercise_name: "Bench Press", weight: 135 }];
  const rested = prescribeLoad({ exercise: { name: "Bench Press" }, reps: 8, logs, returning: false });
  const returning = prescribeLoad({ exercise: { name: "Bench Press" }, reps: 8, logs, returning: true });
  const ratio = returning.weight / rested.weight;
  assert.ok(Math.abs(ratio - 0.55) < 0.08, `ratio was ${ratio}`);
});

test("cold start loads for a 265 lb male beginner stay conservative", () => {
  const squat = prescribeLoad({
    exercise: { name: "Goblet Squat", equipment: "dumbbell" }, reps: 8,
    bodyWeightLb: 265, sex: "Male", level: "beginner", logs: [],
  });
  const raise = prescribeLoad({
    exercise: { name: "Lateral Raise", equipment: "dumbbell" }, reps: 8,
    bodyWeightLb: 265, sex: "Male", level: "beginner", logs: [],
  });
  assert.ok(squat.weight < 80, `goblet squat cold start was ${squat.weight}`);
  assert.ok(raise.weight < 30, `lateral raise cold start was ${raise.weight}`);
});

test("roundLoad rounds to the nearest quarter plate under forty and the nearest five above", () => {
  assert.equal(roundLoad(27), 27.5);
  assert.equal(roundLoad(143), 145);
});

/* =========================================================================
 * plan.mjs
 * ========================================================================= */

const PERSON = { bodyWeightLb: 180, sex: "Male", daysAsked: 4 };

for (const bubble of TREE.bubbles) {
  for (const child of bubble.children) {
    test(`buildPlan does not throw for ${bubble.id}/${child.id} and produces a sane week`, () => {
      const plan = buildPlan({ goal: { bubble: bubble.id, child: child.id }, person: PERSON, logs: [] });
      assert.equal(plan.week.length, plan.days);
      for (const d of plan.week) {
        assert.ok(d.exercises.length >= 3, `${bubble.id}/${child.id}: ${d.name} only had ${d.exercises.length} exercises`);
        const names = d.exercises.map((e) => e.name);
        assert.equal(new Set(names).size, names.length,
          `${bubble.id}/${child.id}: ${d.name} repeats an exercise name (${names.join(", ")})`);
        for (const e of d.exercises) {
          assert.ok(e.sets >= 2, `${bubble.id}/${child.id}: ${e.name} has ${e.sets} sets`);
          assert.ok(e.reps >= 1, `${bubble.id}/${child.id}: ${e.name} has ${e.reps} reps`);
          assert.ok(e.restSec > 0, `${bubble.id}/${child.id}: ${e.name} has ${e.restSec}s rest`);
          assert.ok(e.swap === null || typeof e.swap === "string",
            `${bubble.id}/${child.id}: ${e.name} has a swap of type ${typeof e.swap}`);
        }
      }
    });
  }
}

test("a beginner with three days gets a full body split", () => {
  const plan = buildPlan({ goal: { bubble: "consistent", child: "keep-quitting" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 }, logs: [] });
  for (const d of plan.week) assert.ok(d.name.startsWith("Full body"), `day was named "${d.name}"`);
});

test("a beginner with four days gets an upper lower split", () => {
  /* "consistent" caps out at three days, so this needs a goal whose maxDays
     actually allows four, or the day count gets clamped before the split
     ever sees a 4. */
  const plan = buildPlan({ goal: { bubble: "lose-weight", child: "lose-a-number" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 4 }, logs: [] });
  const names = plan.week.map((d) => d.name);
  assert.deepEqual(names, ["Upper body A", "Lower body A", "Upper body B", "Lower body B"]);
});

test("an intermediate with three days gets a push pull legs split", () => {
  const logs = climbThenPlateau(70, 20);
  const plan = buildPlan({ goal: { bubble: "consistent", child: "keep-quitting" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 }, logs });
  assert.equal(plan.level, "intermediate");
  const names = plan.week.map((d) => d.name);
  assert.deepEqual(names, ["Push day", "Pull day", "Leg day"]);
});

test("a beginner's lower or full body days always carry a hinge movement", () => {
  const plan = buildPlan({ goal: { bubble: "lose-weight", child: "lose-a-number" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 4 }, logs: [] });
  const lowerDays = plan.week.filter((d) => d.focus === "lower" || d.focus === "fullBody");
  assert.ok(lowerDays.length > 0);
  for (const d of lowerDays) {
    const hasHinge = d.exercises.some((e) => patternFor(e.name) === "hinge" || e.name === "Glute Bridge");
    assert.ok(hasHinge, `${d.name} had no hinge movement: ${d.exercises.map((e) => e.name).join(", ")}`);
  }
});

test("get stronger main lifts stay at six reps or fewer", () => {
  const plan = buildPlan({ goal: { bubble: "get-stronger", child: "strong-a-lift" }, person: PERSON, logs: [] });
  for (const d of plan.week) for (const e of d.exercises) assert.ok(e.reps <= 6, `${e.name} had ${e.reps} reps`);
});

test("lose weight lifts stay at eight reps or more", () => {
  const plan = buildPlan({ goal: { bubble: "lose-weight", child: "lose-a-number" }, person: PERSON, logs: [] });
  for (const d of plan.week) for (const e of d.exercises) assert.ok(e.reps >= 8, `${e.name} had ${e.reps} reps`);
});

test("asking for five days with logs showing about two a week keeps five days and shortens some", () => {
  const logs = history({ n: 10, climbing: false });
  const plan = buildPlan({
    goal: { bubble: "lose-weight", child: "lose-a-number" },
    person: { bodyWeightLb: 180, sex: "Male", daysAsked: 5 }, logs,
  });
  assert.equal(plan.days, Math.min(5, 5));
  assert.ok(plan.week.some((d) => d.short === true));
  const cap = observedCapacity(plan.trainingAge);
  assert.ok(plan.dayNotes.some((n) => n.includes(String(cap))), `dayNotes were: ${plan.dayNotes.join(" | ")}`);
});

test("returning after ninety sessions and a long layoff notes the time off and starts light", () => {
  const logs = history({ n: 90, endedDaysAgo: 122 });
  const plan = buildPlan({
    goal: { bubble: "get-back", child: "back-after-years" },
    person: { bodyWeightLb: 185, sex: "Male", daysAsked: 3 }, logs,
  });
  assert.equal(plan.trainingAge.returning, true);
  assert.ok(plan.dayNotes.some((n) => n.includes("off")), `dayNotes were: ${plan.dayNotes.join(" | ")}`);
  const withWeight = plan.week.flatMap((d) => d.exercises).find((e) => e.weight != null);
  assert.ok(withWeight, "expected at least one exercise with a numeric weight");
  assert.ok(withWeight.loadNote.includes("away"), `loadNote was: ${withWeight.loadNote}`);
});

test("no bodyweight logged means the plan says so", () => {
  const plan = buildPlan({ goal: { bubble: "feel-better", child: "energy" }, person: { sex: "Female", daysAsked: 3 }, logs: [] });
  assert.ok(plan.missing.some((m) => m.includes("bodyweight")), `missing was: ${plan.missing.join(" | ")}`);
});

test("a man with bench press history wanting to get stronger sees bench press in the week", () => {
  const logs = [{ entry_date: day(-1), exercise_name: "Barbell Bench Press", weight: 185 }];
  const plan = buildPlan({
    goal: { bubble: "get-stronger", child: "strong-a-lift" },
    person: { bodyWeightLb: 190, sex: "Male", daysAsked: 3 }, logs,
  });
  const allNames = plan.week.flatMap((d) => d.exercises.map((e) => e.name));
  assert.ok(allNames.includes("Barbell Bench Press"), `week had: ${allNames.join(", ")}`);
});

test("deload is not offered to a beginner but is offered to an intermediate", () => {
  const beginner = buildPlan({ goal: { bubble: "get-stronger", child: "strong-a-lift" }, person: PERSON, logs: [] });
  assert.equal(beginner.deload, null);
  const logs = climbThenPlateau(70, 20);
  const intermediate = buildPlan({ goal: { bubble: "get-stronger", child: "strong-a-lift" }, person: PERSON, logs });
  assert.notEqual(intermediate.deload, null);
});

/* =========================================================================
 * pair.mjs
 * ========================================================================= */

test("conjunctiveWeek waits on whoever has not hit their own target", () => {
  const r = conjunctiveWeek({ a: { name: "A", target: 3, done: 3 }, b: { name: "B", target: 4, done: 2 } });
  assert.equal(r.landed, false);
  assert.equal(r.carrying, "A");
  assert.ok(r.line.includes("Waiting on"), `line was: ${r.line}`);
});

test("conjunctiveWeek lands when both hit their own target", () => {
  const r = conjunctiveWeek({ a: { name: "A", target: 3, done: 3 }, b: { name: "B", target: 4, done: 4 } });
  assert.equal(r.landed, true);
  assert.equal(r.carrying, null);
});

test("chooseComparison prefers each person's own progress when both have it", () => {
  const r = chooseComparison({
    a: { name: "A", baselineLb: 100, currentLb: 110 },
    b: { name: "B", baselineLb: 80, currentLb: 90 },
  });
  assert.equal(r.kind, "own-progress");
});

test("chooseComparison falls back to a size adjusted score when the gap is moderate", () => {
  const r = chooseComparison({
    a: { name: "A", liftedLb: 200, bodyWeightLb: 190, sex: "Male" },
    b: { name: "B", liftedLb: 90, bodyWeightLb: 145, sex: "Female" },
  });
  assert.equal(r.kind, "size-adjusted");
  assert.ok(r.gap <= PRODUCTIVE_GAP.tooFar, `gap was ${r.gap}`);
});

test("chooseComparison falls back to effort when the gap is huge", () => {
  const r = chooseComparison({
    a: { name: "A", liftedLb: 320, bodyWeightLb: 190, sex: "Male" },
    b: { name: "B", liftedLb: 40, bodyWeightLb: 140, sex: "Female" },
  });
  assert.equal(r.kind, "effort");
});

test("chooseComparison falls back to effort when there is nothing to compare", () => {
  const r = chooseComparison({ a: { name: "A" }, b: { name: "B" } });
  assert.equal(r.kind, "effort");
});

test("sharedSchedule with no history splits three and four days sensibly", () => {
  const r = sharedSchedule({ aDays: 3, bDays: 4, aLogs: [], bLogs: [] });
  assert.equal(r.together.length, 3);
  assert.equal(r.bAlone.length, 1);
  const all = [...r.together, ...r.aAlone, ...r.bAlone];
  assert.equal(new Set(all).size, all.length, `a day appeared twice: ${all.join(", ")}`);
  const weekOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const indices = r.together.map((d) => weekOrder.indexOf(d));
  const sorted = [...indices].sort((a, b) => a - b);
  assert.deepEqual(indices, sorted, `together was not in calendar order: ${r.together.join(", ")}`);
});

test("relativeScore needs a bodyweight and scores a woman higher than a man at the same lift and bodyweight", () => {
  assert.equal(relativeScore({ liftedLb: 135, bodyWeightLb: null, sex: "Male" }), null);
  const female = relativeScore({ liftedLb: 135, bodyWeightLb: 150, sex: "Female" });
  const male = relativeScore({ liftedLb: 135, bodyWeightLb: 150, sex: "Male" });
  assert.ok(female > male, `female ${female} should exceed male ${male}`);
});
