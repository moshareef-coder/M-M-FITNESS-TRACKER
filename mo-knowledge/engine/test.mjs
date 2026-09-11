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

import { deriveTrainingAge, observedCapacity, THRESHOLDS, detectPlateau } from "./training-age.mjs";
import { resolveGoal, GOAL_PARAMS } from "./goal-engine.mjs";
import { coldStart1RM, prescribeLoad, patternFor, variantFactor, roundLoad } from "./load.mjs";
import { buildPlan } from "./plan.mjs";
import { conjunctiveWeek, chooseComparison, sharedSchedule, relativeScore, PRODUCTIVE_GAP } from "./pair.mjs";

import { normalizeFocus, mergePriority, focusFreshness, MUSCLE_GROUPS } from "./focus.mjs";
import { mobilityFor, pickBlock, moveSeconds, stripMobility, WARMUP_SECONDS, COOLDOWN_SECONDS, MOBILITY_GOAL_SECONDS, MOBILITY_CHILDREN, MIN_MOVES, MAX_MOVES } from "./mobility.mjs";
import { scoreAlternatives } from "./alternatives.mjs";
import { learnPreferences, applyPreferences, avoidNote, SOFT_AT, HARD_AT } from "./preferences.mjs";
import { planPlateauResponse, applyRotateFallback, PLATEAU_RESPONSE } from "./plateau-response.mjs";
import { BODY_AREAS, EQUIPMENT_OPTIONS, normalizeLimits, applyLimits, limitsSummary, softenedNote } from "./limits.mjs";
import { JOINTS, JOINT_LOAD, defaultJointLoad } from "./joint-load.mjs";
import { joinPlanToActual, calibrateExercise, calibrate, PUSH_COMPOUND, PUSH_ISOLATION, BACK_OFF } from "./calibrate.mjs";
import { mapGoal, generateFromPayload, toWorkout, focusDayIndex, nextDayIndex } from "./adapter.mjs";
import { buildMuscleIndex, muscleRecoveryStates, mainGroupsForDay, dayIsFresh, skipFreshDays, FRESH_HOURS, RECOVERY_HOURS, MIN_CREDIT_SETS } from "./recovery.mjs";

import { TRAININGS } from "../../knowledge/exercise-library/index.mjs";
import { MUSCLE_PIECES } from "../../knowledge/anatomy/muscle-detail.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const TREE = JSON.parse(readFileSync(join(here, "../goals/goal-tree.json"), "utf8"));

/* ---- shared library helpers for the new test sections below ---- */
const WEIGHT_LIB = TRAININGS.find((t) => t.id === "weight-training");
const CALI_LIB = TRAININGS.find((t) => t.id === "calisthenics");
const flattenExercises = (lib) => lib.categories.flatMap((c) => c.exercises);
const WEIGHT_EXERCISES = flattenExercises(WEIGHT_LIB);
const CALI_EXERCISES = flattenExercises(CALI_LIB);
const LIBRARY_POOL = [...WEIGHT_EXERCISES, ...CALI_EXERCISES];

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

/* =========================================================================
 * focus.mjs
 * ========================================================================= */

test("normalizeFocus accepts group keys directly", () => {
  const r = normalizeFocus(["chest", "glutes"]);
  assert.deepEqual(r, ["chest", "glutes"]);
});

test("normalizeFocus accepts muscle piece names and translates them to groups", () => {
  assert.ok(MUSCLE_PIECES.deltoids, "expected deltoids in MUSCLE_PIECES");
  assert.ok(MUSCLE_PIECES.gluteusMaximus, "expected gluteusMaximus in MUSCLE_PIECES");
  const r = normalizeFocus(["deltoids", "gluteusMaximus"]);
  assert.deepEqual(r, ["shoulders", "glutes"]);
});

test("normalizeFocus accepts a comma separated string", () => {
  const r = normalizeFocus("chest, glutes");
  assert.deepEqual(r, ["chest", "glutes"]);
});

test("normalizeFocus drops junk it does not recognise", () => {
  const r = normalizeFocus(["chest", "banana", "123", ""]);
  assert.deepEqual(r, ["chest"]);
});

test("normalizeFocus caps at four groups", () => {
  const five = ["chest", "shoulders", "traps", "lats", "biceps"];
  const r = normalizeFocus(five);
  assert.equal(r.length, 4);
  assert.deepEqual(r, five.slice(0, 4));
});

test("mergePriority puts the user's own focus ahead of the goal's priority", () => {
  const r = mergePriority({ goalPriority: ["quads"], userFocus: ["chest"] });
  assert.equal(r.priority[0], "chest");
  assert.ok(r.priority.includes("quads"));
});

test("mergePriority caps the combined list at five", () => {
  const r = mergePriority({ goalPriority: ["quads", "hamstrings", "calves"], userFocus: ["chest", "shoulders", "traps", "lats"] });
  assert.ok(r.priority.length <= 5, `priority was ${r.priority.length} long`);
});

test("mergePriority drops a group present in revealed.avoid and says so in why", () => {
  const r = mergePriority({ goalPriority: [], userFocus: ["chest", "quads"], revealed: { avoid: ["chest"] } });
  assert.ok(!r.priority.includes("chest"));
  assert.ok(r.priority.includes("quads"));
  assert.ok(r.why.some((w) => w.includes("chest")), `why was: ${r.why.join(" | ")}`);
});

test("focusFreshness flags a pick older than sixty days as stale", () => {
  const chosenAt = new Date(Date.now() - 65 * 86400000);
  const r = focusFreshness({ chosenAt });
  assert.equal(r.stale, true);
  assert.equal(r.ageDays, 65);
});

/* =========================================================================
 * alternatives.mjs
 * ========================================================================= */

const BARBELL_BENCH = WEIGHT_EXERCISES.find((e) => e.name === "Barbell Bench Press");

test("scoreAlternatives for a barbell exercise returns ranked, same primary group entries", () => {
  const results = scoreAlternatives({ exercise: BARBELL_BENCH, pool: WEIGHT_EXERCISES, level: "intermediate", count: 20 });
  assert.ok(results.length > 1);
  const byName = new Map(WEIGHT_EXERCISES.map((e) => [e.name, e]));
  for (const r of results) {
    assert.equal(typeof r.name, "string");
    assert.equal(typeof r.why, "string");
    assert.equal(typeof r.score, "number");
    const ex = byName.get(r.name);
    assert.ok(ex && ex.primary.some((g) => BARBELL_BENCH.primary.includes(g)), `${r.name} does not share a primary group with Barbell Bench Press`);
  }
  for (let i = 1; i < results.length; i++) {
    assert.ok(results[i - 1].score >= results[i].score, `results were not sorted by score descending at index ${i}`);
  }
});

test("scoreAlternatives with equipment bodyweight only returns only bodyweight entries", () => {
  const results = scoreAlternatives({ exercise: BARBELL_BENCH, pool: WEIGHT_EXERCISES, equipment: ["bodyweight"], count: 20 });
  assert.ok(results.length > 0);
  for (const r of results) assert.equal(r.equipment, "bodyweight");
});

test("scoreAlternatives honours exclude", () => {
  const results = scoreAlternatives({ exercise: BARBELL_BENCH, pool: WEIGHT_EXERCISES, exclude: ["Dumbbell Bench Press"], count: 20 });
  assert.ok(!results.some((r) => r.name === "Dumbbell Bench Press"));
});

test("scoreAlternatives dedupes results by name when the pool has the same name twice", () => {
  const pool = [
    { name: "Test Duplicate", primary: ["chest"], secondary: ["triceps"], equipment: "dumbbell", level: "beginner" },
    { name: "Test Duplicate", primary: ["chest"], secondary: ["triceps", "shoulders"], equipment: "dumbbell", level: "beginner" },
  ];
  const results = scoreAlternatives({ exercise: BARBELL_BENCH, pool, count: 10 });
  assert.equal(results.filter((r) => r.name === "Test Duplicate").length, 1);
});

/* =========================================================================
 * preferences.mjs
 * ========================================================================= */

test(`${HARD_AT} swaps away from one exercise is a hard avoid`, () => {
  const swaps = [day(-5), day(-15), day(-25)].map((d) => ({
    entry_date: d, planned_exercise: "Overhead Press", chosen_exercise: "Dumbbell Shoulder Press",
  }));
  const r = learnPreferences({ swaps });
  const entry = r.avoid.find((a) => a.name === "Overhead Press");
  assert.ok(entry, "expected Overhead Press in avoid");
  assert.equal(entry.strength, "hard");
  assert.equal(entry.count, HARD_AT);
});

test(`${SOFT_AT} swaps away from one exercise is a soft avoid`, () => {
  const swaps = [day(-5), day(-15)].map((d) => ({
    entry_date: d, planned_exercise: "Overhead Press", chosen_exercise: "Dumbbell Shoulder Press",
  }));
  const r = learnPreferences({ swaps });
  const entry = r.avoid.find((a) => a.name === "Overhead Press");
  assert.ok(entry, "expected Overhead Press in avoid");
  assert.equal(entry.strength, "soft");
  assert.equal(entry.count, SOFT_AT);
});

test("one swap away from an exercise is not enough to avoid it", () => {
  const swaps = [{ entry_date: day(-5), planned_exercise: "Overhead Press", chosen_exercise: "Dumbbell Shoulder Press" }];
  const r = learnPreferences({ swaps });
  assert.ok(!r.avoid.some((a) => a.name === "Overhead Press"));
});

test("planned but never logged twice is a soft skip avoid", () => {
  const plans = [day(-5), day(-12)].map((d) => ({
    entry_date: d, completed_at: d, exercises: [{ name: "Face Pull", sets: 3, reps: 15, targetWeight: 0 }],
  }));
  const r = learnPreferences({ plans, logs: [] });
  const entry = r.avoid.find((a) => a.name === "Face Pull");
  assert.ok(entry, "expected Face Pull in avoid");
  assert.equal(entry.reason, "skipped");
  assert.equal(entry.strength, "soft");
  assert.equal(entry.count, 2);
});

test("a swap is not double counted as a skip", () => {
  const dates = [day(-5), day(-15)];
  const swaps = dates.map((d) => ({ entry_date: d, planned_exercise: "Overhead Press", chosen_exercise: "Dumbbell Shoulder Press" }));
  const plans = dates.map((d) => ({ entry_date: d, completed_at: d, exercises: [{ name: "Overhead Press", sets: 3, reps: 8, targetWeight: 95 }] }));
  const r = learnPreferences({ swaps, plans, logs: [] });
  const entry = r.avoid.find((a) => a.name === "Overhead Press");
  assert.ok(entry, "expected Overhead Press in avoid");
  assert.equal(entry.count, 2, `count was ${entry.count}, the swap row should not also be counted as a missing log`);
  assert.equal(entry.strength, "soft");
});

test("equipmentBias detects a dumbbell skew", () => {
  const swaps = [day(-5), day(-15), day(-25)].map((d) => ({
    entry_date: d, planned_exercise: "Barbell Bench Press", chosen_exercise: "Dumbbell Bench Press",
  }));
  const r = learnPreferences({ swaps });
  assert.ok(r.equipmentBias);
  assert.equal(r.equipmentBias.equipment, "dumbbell");
  assert.ok(r.equipmentBias.ratio >= 0.6, `ratio was ${r.equipmentBias.ratio}`);
  assert.equal(r.equipmentBias.n, 3);
});

test("confidence rises with the number of revealed signals", () => {
  const swapsN = (n) => Array.from({ length: n }, (_, i) => ({
    entry_date: day(-(5 + i * 2)), planned_exercise: `Exercise ${i}`, chosen_exercise: `Alt ${i}`,
  }));
  assert.equal(learnPreferences({ swaps: [] }).confidence, "none");
  assert.equal(learnPreferences({ swaps: swapsN(3) }).confidence, "low");
  assert.equal(learnPreferences({ swaps: swapsN(8) }).confidence, "medium");
  assert.equal(learnPreferences({ swaps: swapsN(20) }).confidence, "high");
});

test("applyPreferences never empties a pool of one hard avoided exercise", () => {
  const pool = [{ name: "Overhead Press", equipment: "barbell" }];
  const prefs = { avoid: [{ name: "Overhead Press", strength: "hard" }], prefer: [], equipmentBias: null };
  const result = applyPreferences(pool, prefs);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Overhead Press");
});

test("applyPreferences removes a hard avoid and sinks a soft avoid to the end", () => {
  const pool = [{ name: "A", equipment: "barbell" }, { name: "B", equipment: "barbell" }, { name: "C", equipment: "barbell" }];
  const prefs = {
    avoid: [{ name: "A", strength: "hard" }, { name: "B", strength: "soft" }],
    prefer: [], equipmentBias: null,
  };
  const result = applyPreferences(pool, prefs).map((e) => e.name);
  assert.deepEqual(result, ["C", "B"]);
});

/* =========================================================================
 * plateau-response.mjs
 * ========================================================================= */

test("plateau response waits under four weeks flat", () => {
  const plateau = { lifts: [{ name: "Bench Press", sessions: 6, weeksFlat: 2, weightLb: 135 }] };
  const r = planPlateauResponse({ plateau, level: "intermediate" });
  assert.equal(r.responses[0].action, "wait");
});

test("plateau response waits for a beginner under eight weeks flat", () => {
  const plateau = { lifts: [{ name: "Bench Press", sessions: 5, weeksFlat: 6, weightLb: 95 }] };
  const r = planPlateauResponse({ plateau, level: "beginner" });
  assert.equal(r.responses[0].action, "wait");
});

test("plateau response deloads the lift when calibration says too heavy for it", () => {
  const plateau = { lifts: [{ name: "Squat", sessions: 10, weeksFlat: 10, weightLb: 225 }] };
  const calibration = { byExercise: { squat: { verdict: "too-heavy" } }, overall: null };
  const r = planPlateauResponse({ plateau, level: "intermediate", calibration });
  assert.equal(r.responses[0].action, "deload-lift");
});

test("plateau response uses the rep range for a strength goal with a short stall", () => {
  const plateau = { lifts: [{ name: "Deadlift", sessions: 8, weeksFlat: PLATEAU_RESPONSE.shortStallWeeks - 1, weightLb: 275 }] };
  const r = planPlateauResponse({ plateau, level: "intermediate", goal: { bubble: "get-stronger" } });
  assert.equal(r.responses[0].action, "rep-range");
});

test("plateau response rotates otherwise", () => {
  const plateau = { lifts: [{ name: "Leg Press", sessions: 10, weeksFlat: PLATEAU_RESPONSE.rotateFromWeeks, weightLb: 400 }] };
  const r = planPlateauResponse({ plateau, level: "intermediate" });
  assert.equal(r.responses[0].action, "rotate");
});

test("plateau response cuts volume in the summary for three or more stalls", () => {
  const plateau = { lifts: ["Bench Press", "Squat", "Row"].map((name) => ({ name, sessions: 10, weeksFlat: 10, weightLb: 200 })) };
  const r = planPlateauResponse({ plateau, level: "intermediate" });
  assert.equal(r.summary.action, "volume-cut");
  assert.ok(r.summary.say);
});

test("volume-cut is not emitted when calibration overall is back-off", () => {
  const plateau = { lifts: ["Bench Press", "Squat", "Row"].map((name) => ({ name, sessions: 10, weeksFlat: 10, weightLb: 200 })) };
  const calibration = { byExercise: {}, overall: "back-off" };
  const r = planPlateauResponse({ plateau, level: "intermediate", calibration });
  assert.notEqual(r.summary.action, "volume-cut");
});

test("every plateau response has a non empty say", () => {
  const plateau = { lifts: [
    { name: "Bench Press", sessions: 10, weeksFlat: PLATEAU_RESPONSE.rotateFromWeeks, weightLb: 200 },
    { name: "Squat", sessions: 10, weeksFlat: PLATEAU_RESPONSE.shortStallWeeks - 1, weightLb: 300 },
  ] };
  const r = planPlateauResponse({ plateau, level: "intermediate", goal: { bubble: "get-stronger" } });
  assert.ok(r.responses.length > 0);
  for (const resp of r.responses) assert.ok(typeof resp.say === "string" && resp.say.length > 0);
});

/* =========================================================================
 * limits.mjs and joint-load.mjs
 * ========================================================================= */

test("BODY_AREAS has eight entries with key, label and hint", () => {
  assert.equal(BODY_AREAS.length, 8);
  for (const a of BODY_AREAS) {
    assert.equal(typeof a.key, "string");
    assert.equal(typeof a.label, "string");
    assert.equal(typeof a.hint, "string");
  }
});

test("EQUIPMENT_OPTIONS has five entries including none", () => {
  assert.equal(EQUIPMENT_OPTIONS.length, 5);
  assert.ok(EQUIPMENT_OPTIONS.some((o) => o.key === "none"));
});

test("normalizeLimits accepts an object, drops unknown keys, and trims the note to 120", () => {
  const r = normalizeLimits({ hurts: ["shoulder", "bogus"], missing: ["barbell", "bogus"], note: "x".repeat(200), extra: "drop me" });
  assert.deepEqual(r.hurts, ["shoulder"]);
  assert.deepEqual(r.missing, ["barbell"]);
  assert.equal(r.note.length, 120);
});

test("normalizeLimits accepts the JSON string a jsonb column round trips as", () => {
  const r = normalizeLimits(JSON.stringify({ hurts: ["knee"] }));
  assert.deepEqual(r.hurts, ["knee"]);
});

test("normalizeLimits accepts null", () => {
  const r = normalizeLimits(null);
  assert.deepEqual(r, { hurts: [], missing: [], note: null });
});

test("applyLimits with hurts shoulder removes Overhead Press and Dip and keeps a safer press", () => {
  assert.ok(WEIGHT_EXERCISES.some((e) => e.name === "Overhead Press"));
  assert.ok(CALI_EXERCISES.some((e) => e.name === "Dip"));
  const r = applyLimits({ pool: LIBRARY_POOL, limits: { hurts: ["shoulder"], missing: [] } });
  const names = r.pool.map((e) => e.name);
  assert.ok(!names.includes("Overhead Press"), "Overhead Press should have been excluded");
  assert.ok(!names.includes("Dip"), "Dip should have been excluded");
  assert.ok(names.includes("Dumbbell Bench Press") || names.includes("Chest-Supported Row"), "expected a shoulder-safe press or row to remain");
});

test("applyLimits with missing barbell removes every barbell exercise", () => {
  const r = applyLimits({ pool: LIBRARY_POOL, limits: { hurts: [], missing: ["barbell"] } });
  assert.ok(r.pool.length > 0);
  assert.ok(r.pool.every((e) => e.equipment !== "barbell"));
});

test("applyLimits with missing none keeps only bodyweight", () => {
  const r = applyLimits({ pool: LIBRARY_POOL, limits: { hurts: [], missing: ["none"] } });
  assert.ok(r.pool.length > 0);
  assert.ok(r.pool.every((e) => (e.equipment || "bodyweight") === "bodyweight"));
});

test("applyLimits returns one softened entry rather than emptying the pool", () => {
  const pool = [{ name: "Overhead Press", primary: ["shoulders"], secondary: [], equipment: "barbell" }];
  const r = applyLimits({ pool, limits: { hurts: ["shoulder"], missing: [] } });
  assert.equal(r.pool.length, 1);
  assert.equal(r.pool[0].name, "Overhead Press");
  assert.ok(r.excluded.some((e) => e.name === "Overhead Press" && e.softened === true));
});

test("every weight-training and calisthenics exercise has an explicit JOINT_LOAD entry", () => {
  const missNames = LIBRARY_POOL
    .filter((ex) => !Object.prototype.hasOwnProperty.call(JOINT_LOAD, ex.name))
    .map((ex) => ex.name);
  assert.equal(missNames.length, 0, `missing joint-load entries for: ${missNames.join(", ")}`);
});

test("every JOINT_LOAD value is a subset of the eight joint keys", () => {
  const validKeys = new Set(JOINTS);
  for (const [name, joints] of Object.entries(JOINT_LOAD)) {
    for (const j of joints) assert.ok(validKeys.has(j), `${name} lists unknown joint "${j}"`);
  }
});

test("defaultJointLoad gives shoulder for a vertical push name and lowerback for a hinge name", () => {
  assert.ok(!Object.prototype.hasOwnProperty.call(JOINT_LOAD, "Overhead Cable Press"));
  const push = defaultJointLoad({ name: "Overhead Cable Press", primary: ["shoulders"] });
  assert.ok(push.includes("shoulder"), `push load was: ${push.join(", ")}`);

  assert.ok(!Object.prototype.hasOwnProperty.call(JOINT_LOAD, "Kettlebell Deadlift"));
  const hinge = defaultJointLoad({ name: "Kettlebell Deadlift", primary: ["hamstrings"] });
  assert.ok(hinge.includes("lowerback"), `hinge load was: ${hinge.join(", ")}`);
});

/* =========================================================================
 * calibrate.mjs
 * ========================================================================= */

test("joinPlanToActual skips plans with no completed_at", () => {
  const plans = [{ entry_date: day(-1), exercises: [{ name: "Bench Press", sets: 3, reps: 8, targetWeight: 135 }] }];
  const rows = joinPlanToActual({ plans, logs: [] });
  assert.equal(rows.length, 0);
});

test("calibrateExercise verdicts too-easy at the compound and isolation factors", () => {
  const compoundRows = [day(-1), day(-4)].map((d) => ({
    entry_date: d, exercise: "Bench Press",
    planned: { sets: 3, reps: 8, targetWeight: 135 }, actual: { sets: 3, reps: 8, weight: 135 },
  }));
  const compound = calibrateExercise(compoundRows);
  assert.equal(compound.verdict, "too-easy");
  assert.equal(compound.nextLoadFactor, PUSH_COMPOUND);

  const isolationRows = [day(-1), day(-4)].map((d) => ({
    entry_date: d, exercise: "Lateral Raise",
    planned: { sets: 3, reps: 12, targetWeight: 20 }, actual: { sets: 3, reps: 12, weight: 20 },
  }));
  const isolation = calibrateExercise(isolationRows);
  assert.equal(isolation.verdict, "too-easy");
  assert.equal(isolation.nextLoadFactor, PUSH_ISOLATION);
});

test("calibrateExercise verdicts too-heavy at the back-off factor", () => {
  const rows = [
    { entry_date: day(-1), exercise: "Squat", planned: { sets: 3, reps: 8, targetWeight: 225 }, actual: { sets: 2, reps: 8, weight: 225 } },
    { entry_date: day(-4), exercise: "Squat", planned: { sets: 3, reps: 8, targetWeight: 225 }, actual: { sets: 3, reps: 8, weight: 225 } },
  ];
  const r = calibrateExercise(rows);
  assert.equal(r.verdict, "too-heavy");
  assert.equal(r.nextLoadFactor, BACK_OFF);
});

test("calibrateExercise verdicts skipped with a swap suggested after two null sessions", () => {
  const rows = [day(-1), day(-4)].map((d) => ({ entry_date: d, exercise: "Face Pull", actual: null }));
  const r = calibrateExercise(rows);
  assert.equal(r.verdict, "skipped");
  assert.equal(r.swapSuggested, true);
});

test("calibrateExercise verdicts unknown with only one row", () => {
  const rows = [{ entry_date: day(-1), exercise: "Cable Curl", planned: { sets: 3, reps: 10, targetWeight: 30 }, actual: { sets: 3, reps: 10, weight: 30 } }];
  const r = calibrateExercise(rows);
  assert.equal(r.verdict, "unknown");
});

test("calibrate overall reads unknown with no data at all", () => {
  const r = calibrate({ plans: [], logs: [] });
  assert.equal(r.overall, "unknown");
});

test("calibrate overall reads push when enough lifts are too easy", () => {
  const dates = [day(-1), day(-4)];
  const plans = dates.map((d) => ({
    entry_date: d, completed_at: d,
    exercises: [{ name: "Squat", sets: 3, reps: 8, targetWeight: 225 }, { name: "Bench Press", sets: 3, reps: 8, targetWeight: 135 }],
  }));
  const logs = dates.flatMap((d) => ([
    { entry_date: d, exercise_name: "Squat", sets: 3, reps: 8, weight: 225 },
    { entry_date: d, exercise_name: "Bench Press", sets: 3, reps: 8, weight: 135 },
  ]));
  const r = calibrate({ plans, logs });
  assert.equal(r.overall, "push");
});

test("calibrate overall reads back-off when enough lifts are too heavy", () => {
  const dates = [day(-1), day(-4)];
  const plans = dates.map((d) => ({
    entry_date: d, completed_at: d,
    exercises: [{ name: "Squat", sets: 3, reps: 8, targetWeight: 225 }, { name: "Bench Press", sets: 3, reps: 8, targetWeight: 135 }],
  }));
  const logs = dates.flatMap((d) => ([
    { entry_date: d, exercise_name: "Squat", sets: 2, reps: 8, weight: 225 },
    { entry_date: d, exercise_name: "Bench Press", sets: 2, reps: 8, weight: 135 },
  ]));
  const r = calibrate({ plans, logs });
  assert.equal(r.overall, "back-off");
});

test("calibrate overall holds when there is not enough evidence either way", () => {
  const d = day(-1);
  const plans = [{ entry_date: d, completed_at: d, exercises: [{ name: "Row", sets: 3, reps: 8, targetWeight: 95 }] }];
  const logs = [{ entry_date: d, exercise_name: "Row", sets: 3, reps: 8, weight: 95 }];
  const r = calibrate({ plans, logs });
  assert.equal(r.overall, "hold");
});

/* =========================================================================
 * adapter.mjs
 * ========================================================================= */

test("mapGoal: a valid goal_bubble beats the legacy goal string", () => {
  const r = mapGoal({ goal: "Lose weight", goal_bubble: "get-stronger" });
  assert.equal(r.bubble, "get-stronger");
});

test("mapGoal: a valid goal_child beats a parsed detail", () => {
  const r = mapGoal({ goal_bubble: "lose-weight", goal_child: "lose-belly", goal_detail: "gain weight fast" });
  assert.equal(r.bubble, "lose-weight");
  assert.equal(r.child, "lose-belly");
});

test("mapGoal: amountLb and byDate are still parsed alongside a tile child", () => {
  const today = new Date();
  const r = mapGoal({ goal_bubble: "lose-weight", goal_child: "lose-a-number", goal_detail: "lose 20 pounds in 6 weeks", today });
  assert.equal(r.child, "lose-a-number");
  assert.equal(r.amountLb, 20);
  assert.ok(r.byDate instanceof Date);
});

test("mapGoal: invalid tile ids fall back to the legacy string", () => {
  const r = mapGoal({ goal_bubble: "not-a-real-bubble", goal_child: "nope", goal: "Lose weight" });
  assert.equal(r.bubble, "lose-weight");
});

test("toWorkout emits the full exercise shape with a numeric targetWeight, zero for bodyweight or unknown", () => {
  const plan = buildPlan({ goal: { bubble: "get-stronger", child: "strong-a-lift" }, person: { bodyWeightLb: null, sex: "Male", daysAsked: 3 }, logs: [] });
  const workout = toWorkout(plan, 0);
  assert.ok(workout.exercises.length > 0);
  for (const e of workout.exercises) {
    assert.equal(typeof e.name, "string");
    assert.equal(typeof e.sets, "number");
    assert.equal(typeof e.reps, "number");
    assert.equal(typeof e.targetWeight, "number");
    assert.equal(typeof e.note, "string");
    assert.ok(e.swap === null || typeof e.swap === "string");
    assert.ok(Array.isArray(e.alternatives));
  }
  assert.ok(workout.exercises.some((e) => e.targetWeight === 0), "expected at least one exercise with targetWeight 0 when weight is unknown");
});

test("generateFromPayload never throws on an empty payload or a junk goal", () => {
  const r1 = generateFromPayload({});
  assert.ok(r1.workout.exercises.length >= 3 && r1.workout.exercises.length <= 6);
  for (const key of ["level", "confidence", "days", "dayName", "source", "goalSource", "focus", "limits"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(r1.meta, key), `meta missing ${key}`);
  }
  const r2 = generateFromPayload({ goal: "some junk goal that matches nothing at all" });
  assert.ok(r2.workout.exercises.length >= 3 && r2.workout.exercises.length <= 6);
});

test("focusDayIndex picks a push day when one exists and falls back to -1 otherwise", () => {
  const logs = climbThenPlateau(70, 20);
  const withPush = buildPlan({ goal: { bubble: "consistent", child: "keep-quitting" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 }, logs });
  const pushIndex = focusDayIndex(withPush, "push", { from: 0 });
  assert.ok(pushIndex >= 0);
  assert.ok(withPush.week[pushIndex].name.toLowerCase().includes("push"));

  const beginner = buildPlan({ goal: { bubble: "consistent", child: "keep-quitting" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 }, logs: [] });
  const noPush = focusDayIndex(beginner, "push", { from: 1 });
  assert.equal(noPush, -1);
});

test("a JSON string limits payload works and meta.limits.excludedCount is a number", () => {
  const r = generateFromPayload({ limits: JSON.stringify({ hurts: ["knee"] }) });
  assert.ok(r.meta.limits.hurts.includes("knee"));
  assert.equal(typeof r.meta.limits.excludedCount, "number");
});

/* =========================================================================
 * training-age.mjs: detectPlateau
 * ========================================================================= */

test("detectPlateau flags a lift flat for the window and not one still climbing", () => {
  const flat = detectPlateau({ logs: climbThenPlateau(70, 20) });
  assert.equal(flat.stalled, true);
  assert.ok(flat.lifts.some((l) => l.name === "Bench Press"));

  const climbing = detectPlateau({ logs: climbingEverySession(30) });
  assert.equal(climbing.stalled, false);
});

test("deriveTrainingAge returns a plateau field", () => {
  const r = deriveTrainingAge({ logs: history({ n: 20 }) });
  assert.ok(r.plateau);
  assert.equal(typeof r.plateau.stalled, "boolean");
  assert.ok(Array.isArray(r.plateau.lifts));
});

/* =========================================================================
 * a few more exported helpers on the same modules, still inside scope
 * ========================================================================= */

test("avoidNote names the exercise and how it was avoided, and leaves the door open", () => {
  const swapped = avoidNote({ name: "Overhead Press", count: 3, reason: "swapped" });
  assert.ok(swapped.includes("Overhead Press"));
  assert.ok(swapped.includes("swapped"));
  const skipped = avoidNote({ name: "Face Pull", count: 2, reason: "skipped" });
  assert.ok(skipped.includes("Face Pull"));
  assert.ok(skipped.toLowerCase().includes("logged"));
});

test("applyRotateFallback falls back to rep-range when rotation had nowhere to go", () => {
  const plateau = { lifts: [{ name: "Leg Press", sessions: 10, weeksFlat: PLATEAU_RESPONSE.rotateFromWeeks, weightLb: 400 }] };
  const result = planPlateauResponse({ plateau, level: "intermediate" });
  assert.equal(result.responses[0].action, "rotate");
  const fallenBack = applyRotateFallback(result, ["Leg Press"], { plateau });
  assert.equal(fallenBack.responses[0].action, "rep-range");
  assert.equal(fallenBack.responses[0].exercise, "Leg Press");
});

test("applyRotateFallback is a no-op when nothing named was actually rotating", () => {
  const plateau = { lifts: [{ name: "Bench Press", sessions: 6, weeksFlat: 2, weightLb: 135 }] };
  const result = planPlateauResponse({ plateau, level: "intermediate" });
  const unchanged = applyRotateFallback(result, ["Some Other Lift"], { plateau });
  assert.equal(unchanged.responses[0].action, result.responses[0].action);
});

test("limitsSummary explains a hurt joint and a missing equipment answer in plain sentences", () => {
  const hurt = limitsSummary({ hurts: ["shoulder"], missing: [] });
  assert.ok(hurt.length > 0);
  assert.ok(hurt[0].toLowerCase().includes("shoulder"));

  const bodyweightOnly = limitsSummary({ hurts: [], missing: ["none"] });
  assert.ok(bodyweightOnly.some((s) => s.toLowerCase().includes("bodyweight")));
});

test("softenedNote is null with nothing softened and names what was kept otherwise", () => {
  assert.equal(softenedNote([]), null);
  const note = softenedNote(["Overhead Press"]);
  assert.ok(note.includes("Overhead Press"));
});

test("nextDayIndex starts the week at zero with nothing to go on", () => {
  const plan = buildPlan({ goal: { bubble: "lose-weight", child: "lose-a-number" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 4 }, logs: [] });
  const i = nextDayIndex(plan, { logs: [], plans: [], today: new Date() });
  assert.equal(i, 0);
});

test("nextDayIndex moves to the day after the last one recorded", () => {
  const plan = buildPlan({ goal: { bubble: "lose-weight", child: "lose-a-number" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 4 }, logs: [] });
  const lastFocus = plan.week[0].name;
  const plans = [{ entry_date: day(-1), completed_at: day(-1), focus: lastFocus }];
  const i = nextDayIndex(plan, { logs: [], plans, today: new Date() });
  assert.equal(i, 1);
});

/* =========================================================================
 * a small second pass, edge cases worth locking down
 * ========================================================================= */

test("normalizeFocus drops a duplicate rather than counting it twice", () => {
  const r = normalizeFocus(["chest", "chest", "glutes"]);
  assert.deepEqual(r, ["chest", "glutes"]);
});

test("mergePriority with nothing asked and nothing from the goal spreads volume evenly and says so", () => {
  const r = mergePriority({});
  assert.deepEqual(r.priority, []);
  assert.ok(r.why.some((w) => w.toLowerCase().includes("evenly")));
});

test("scoreAlternatives respects the count limit", () => {
  const results = scoreAlternatives({ exercise: BARBELL_BENCH, pool: WEIGHT_EXERCISES, count: 2 });
  assert.ok(results.length <= 2);
});

test("scoreAlternatives with no exercise returns an empty list", () => {
  assert.deepEqual(scoreAlternatives({ exercise: null, pool: WEIGHT_EXERCISES }), []);
});

test("calibrateExercise reads on-track when sets are met and reps land a little under target", () => {
  const rows = [day(-1), day(-4)].map((d) => ({
    entry_date: d, exercise: "Barbell Row",
    planned: { sets: 3, reps: 8, targetWeight: 135 },
    actual: { sets: 3, reps: 7, weight: 135 },
  }));
  const r = calibrateExercise(rows);
  assert.equal(r.verdict, "on-track");
  assert.equal(r.nextLoadFactor, 1);
});

test("applyLimits excluded entries carry a plain reason mentioning the joint", () => {
  const r = applyLimits({ pool: LIBRARY_POOL, limits: { hurts: ["shoulder"], missing: [] } });
  const overhead = r.excluded.find((e) => e.name === "Overhead Press");
  assert.ok(overhead);
  assert.ok(overhead.why.toLowerCase().includes("shoulder"));
  assert.equal(overhead.excluded, true);
});

test("generateFromPayload honours an explicit challenge_target for the day count", () => {
  const r = generateFromPayload({ goal_bubble: "lose-weight", challenge_target: 5 });
  assert.equal(r.meta.days, 5);
});

test("mapGoal with a completely empty payload falls back to the consistent bubble", () => {
  const r = mapGoal({});
  assert.equal(r.bubble, "consistent");
});

/* ---- recovery.mjs, the fix for regenerating into yesterday's muscles ---- */

const MUSCLE_INDEX = buildMuscleIndex(TRAININGS);

test("muscleRecoveryStates reads a real session from yesterday as hold, not ready", () => {
  const logs = [
    { entry_date: day(-1), exercise_name: "Barbell Bench Press", sets: 4, reps: 8, weight: 185 },
    { entry_date: day(-1), exercise_name: "Machine Shoulder Press", sets: 3, reps: 10, weight: 60 },
  ];
  /* A fixed clock, twelve hours after the session. `new Date()` here passed all
     morning and failed at 18:01, when "yesterday at six" fell out of the fresh
     window. A test that depends on the wall clock is not a test. */
  const noon = new Date(Date.parse(day(-1) + "T18:00:00") + 12 * 3600000);
  const states = muscleRecoveryStates({ logs, muscleIndex: MUSCLE_INDEX, today: noon });
  assert.equal(states.get("chest")?.state, "hold");
  assert.equal(states.get("shoulders")?.state, "hold");
});

test("muscleRecoveryStates ignores a light secondary touch below the credit floor", () => {
  // One set of an accessory triceps movement credits triceps 1 (primary) but
  // the chest it also lightly touches as a secondary at 0.5, under
  // MIN_CREDIT_SETS: chest should not read as trained today from this alone.
  const logs = [{ entry_date: day(-1), exercise_name: "Triceps Pushdown", sets: 1, reps: 12, weight: 30 }];
  const states = muscleRecoveryStates({ logs, muscleIndex: MUSCLE_INDEX, today: new Date() });
  assert.equal(states.get("chest"), undefined);
});

test("muscleRecoveryStates moves hold to ok to ready as hours pass, at the documented thresholds", () => {
  const logs = [{ entry_date: day(-1), exercise_name: "Barbell Bench Press", sets: 4, reps: 8, weight: 185 }];
  const held = muscleRecoveryStates({ logs, muscleIndex: MUSCLE_INDEX, today: new Date(Date.parse(day(-1) + "T18:00:00") + (FRESH_HOURS - 1) * 3600000) });
  assert.equal(held.get("chest").state, "hold");
  const ok = muscleRecoveryStates({ logs, muscleIndex: MUSCLE_INDEX, today: new Date(Date.parse(day(-1) + "T18:00:00") + (FRESH_HOURS + 1) * 3600000) });
  assert.equal(ok.get("chest").state, "ok");
  const ready = muscleRecoveryStates({ logs, muscleIndex: MUSCLE_INDEX, today: new Date(Date.parse(day(-1) + "T18:00:00") + (RECOVERY_HOURS + 1) * 3600000) });
  assert.equal(ready.get("chest").state, "ready");
});

test("mainGroupsForDay unions only the main-role slots, not the accessories", () => {
  const slots = [
    { pattern: "horizontalPush", groups: ["chest"], role: "main" },
    { pattern: "isolation", groups: ["triceps"], role: "accessory" },
  ];
  const groups = mainGroupsForDay(slots);
  assert.ok(groups.has("chest"));
  assert.ok(!groups.has("triceps"));
});

test("dayIsFresh is true only when a main group is held, an ok group does not block the day", () => {
  const states = new Map([["chest", { state: "hold" }], ["lats", { state: "ok" }]]);
  assert.equal(dayIsFresh(new Set(["chest"]), states), true);
  assert.equal(dayIsFresh(new Set(["lats"]), states), false);
  assert.equal(dayIsFresh(new Set(["quads"]), states), false);
});

test("skipFreshDays walks forward past a held day to the first fully rested one", () => {
  const states = new Map([["chest", { state: "hold" }], ["lats", { state: "ready" }], ["quads", { state: "ready" }]]);
  const dayGroups = [new Set(["chest"]), new Set(["lats"]), new Set(["quads"])];
  assert.equal(skipFreshDays(0, dayGroups, states), 1);
});

test("skipFreshDays never blocks generation: with every day fresh it returns the least-fresh one rather than nothing", () => {
  const states = new Map([["chest", { state: "hold" }], ["lats", { state: "hold" }]]);
  const dayGroups = [new Set(["chest"]), new Set(["chest", "lats"])];
  const i = skipFreshDays(0, dayGroups, states);
  assert.ok(i === 0 || i === 1);
});

test("nextDayIndex will not hand back yesterday's Push day just because the rotation wrapped there", () => {
  const history = [];
  for (let i = 0; i < 70; i++) {
    const back = 2 + (69 - i) * 3;
    history.push({ entry_date: day(-back), exercise_name: "Barbell Bench Press", sets: 3, reps: 8, weight: 135 + Math.round(i / 3) * 5 });
    history.push({ entry_date: day(-back), exercise_name: "Barbell Back Squat", sets: 3, reps: 8, weight: 185 + Math.round(i / 3) * 5 });
  }
  const yesterday = [
    { entry_date: day(-1), exercise_name: "Barbell Bench Press", sets: 4, reps: 8, weight: 225 },
    { entry_date: day(-1), exercise_name: "Machine Shoulder Press", sets: 3, reps: 10, weight: 60 },
  ];
  const logs = [...history, ...yesterday];
  const plan = buildPlan({ goal: { bubble: "get-stronger", child: "strong-a-lift" }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 3 }, logs });
  assert.equal(plan.week.map((d) => d.name).join(","), "Push day,Pull day,Leg day");
  // The last completed plan was Leg day, so naive rotation wraps to Push,
  // which is exactly the muscle group a real session hit yesterday.
  const plans = [{ entry_date: day(-1), focus: "Leg day", completed_at: day(-1) + "T18:00:00Z", exercises: [] }];
  /* Fixed clock, same reason as the recovery test above: twelve hours after
     yesterday's session, inside the fresh window whatever time it is now. */
  const noon = new Date(Date.parse(day(-1) + "T18:00:00") + 12 * 3600000);
  const idx = nextDayIndex(plan, { logs, plans, today: noon });
  assert.notEqual(plan.week[idx].name, "Push day");
});

test("nextDayIndex returns to Push day once the fresh window has genuinely passed", () => {
  const history = [];
  for (let i = 0; i < 70; i++) {
    const back = 2 + (69 - i) * 3;
    history.push({ entry_date: day(-back), exercise_name: "Barbell Bench Press", sets: 3, reps: 8, weight: 135 + Math.round(i / 3) * 5 });
    history.push({ entry_date: day(-back), exercise_name: "Barbell Back Squat", sets: 3, reps: 8, weight: 185 + Math.round(i / 3) * 5 });
  }
  const yesterday = [
    { entry_date: day(-1), exercise_name: "Barbell Bench Press", sets: 4, reps: 8, weight: 225 },
    { entry_date: day(-1), exercise_name: "Machine Shoulder Press", sets: 3, reps: 10, weight: 60 },
  ];
  const logs = [...history, ...yesterday];
  const plan = buildPlan({ goal: { bubble: "get-stronger", child: "strong-a-lift" }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 3 }, logs });
  const plans = [{ entry_date: day(-1), focus: "Leg day", completed_at: day(-1) + "T18:00:00Z", exercises: [] }];
  const later = new Date(Date.now() + (RECOVERY_HOURS + 2) * 3600000);
  const idx = nextDayIndex(plan, { logs, plans, today: later });
  assert.equal(plan.week[idx].name, "Push day");
});

test("nextDayIndex with no logs at all behaves exactly as the plain rotation did, nothing to skip", () => {
  const plan = buildPlan({ goal: { bubble: "lose-weight", child: "lose-a-number" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 }, logs: [] });
  const names = plan.week.map((d) => d.name);
  const plans = [{ entry_date: day(-1), focus: names[0], completed_at: day(-1) + "T18:00:00Z", exercises: [] }];
  const idx = nextDayIndex(plan, { logs: [], plans, today: new Date() });
  assert.equal(plan.week[idx].name, names[1]);
});

test("every day plan.mjs builds carries a mainGroups set the adapter can read", () => {
  const plan = buildPlan({ goal: { bubble: "get-stronger", child: "strong-a-lift" }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 4 }, logs: [] });
  for (const d of plan.week) {
    assert.ok(Array.isArray(d.mainGroups));
    assert.ok(d.mainGroups.length > 0);
  }
});

/* ---------- stretching: warm-up before, cool-down after, skippable ---------- */

const STRETCH_LIB = TRAININGS.find((t) => t.id === "stretching");
const STRETCH_ALL = STRETCH_LIB ? STRETCH_LIB.categories.flatMap((c) => c.exercises) : [];

test("the stretching library is registered, and every group has a dynamic and a static move", () => {
  assert.ok(STRETCH_LIB, "knowledge/exercise-library/stretching.mjs must be in TRAININGS");
  const kinds = new Set(STRETCH_LIB.categories.map((c) => c.key));
  for (const k of ["dynamic", "static", "mobility"]) assert.ok(kinds.has(k), `category ${k}`);
  for (const kind of ["dynamic", "static"]) {
    const covered = new Set(STRETCH_LIB.categories.find((c) => c.key === kind).exercises.flatMap((e) => e.primary));
    for (const g of MUSCLE_GROUPS) assert.ok(covered.has(g), `${kind} never covers ${g}`);
  }
});

test("every stretch has the fields mobility.mjs reads, and only muscle and joint keys the engine knows", () => {
  const joints = new Set(JOINTS);
  for (const c of STRETCH_LIB.categories) {
    for (const e of c.exercises) {
      assert.equal(e.kind, c.key, `${e.name} kind matches its category`);
      assert.ok(e.seconds >= 20 && e.seconds <= 60, `${e.name} seconds`);
      assert.equal(typeof e.perSide, "boolean", `${e.name} perSide`);
      assert.ok(e.cue && !/[–—]/.test(e.cue), `${e.name} has a cue with no dashes`);
      for (const g of [...e.primary, ...(e.secondary || [])]) assert.ok(MUSCLE_GROUPS.includes(g), `${e.name} group ${g}`);
      for (const j of e.avoidIf || []) assert.ok(joints.has(j), `${e.name} joint ${j}`);
    }
  }
});

test("no stretch shares a name with a lift, so the app can never credit a hold as a set", () => {
  const lifting = new Set(TRAININGS.filter((t) => t.id !== "stretching").flatMap((t) => t.categories.flatMap((c) => c.exercises.map((e) => e.name.toLowerCase()))));
  for (const e of STRETCH_ALL) assert.ok(!lifting.has(e.name.toLowerCase()), `${e.name} collides with another library`);
  const names = STRETCH_ALL.map((e) => e.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, "no duplicate stretch names");
});

test("MOBILITY_CHILDREN are real children in goal-tree.json", () => {
  const ids = new Set(TREE.bubbles.flatMap((b) => (b.children || []).map((c) => c.id)));
  for (const id of MOBILITY_CHILDREN) assert.ok(ids.has(id), id);
});

test("moveSeconds doubles a per side stretch and leaves a two sided one alone", () => {
  assert.equal(moveSeconds({ seconds: 30, perSide: true }), 60);
  assert.equal(moveSeconds({ seconds: 30, perSide: false }), 30);
});

test("pickBlock draws only from the kind asked for and covers the groups it was given", () => {
  const block = pickBlock({ kind: "dynamic", groups: ["quads", "hamstrings", "glutes"], budgetSec: WARMUP_SECONDS, level: "novice" });
  assert.ok(block.length >= MIN_MOVES && block.length <= MAX_MOVES);
  for (const m of block) assert.equal(m.kind, "dynamic");
  const byName = new Map(STRETCH_ALL.map((e) => [e.name, e]));
  const covered = new Set(block.flatMap((m) => byName.get(m.name).primary));
  for (const g of ["quads", "hamstrings", "glutes"]) assert.ok(covered.has(g), `covers ${g}`);
});

test("pickBlock respects the budget once the floor is met, and is deterministic", () => {
  const a = pickBlock({ kind: "static", groups: ["chest", "lats", "shoulders", "biceps", "triceps"], budgetSec: COOLDOWN_SECONDS, level: "intermediate" });
  const b = pickBlock({ kind: "static", groups: ["chest", "lats", "shoulders", "biceps", "triceps"], budgetSec: COOLDOWN_SECONDS, level: "intermediate" });
  assert.deepEqual(a, b);
  const spent = a.reduce((t, m) => t + moveSeconds(m), 0);
  /* The floor may overshoot, everything past it may not. */
  const floorSpent = a.slice(0, MIN_MOVES).reduce((t, m) => t + moveSeconds(m), 0);
  assert.ok(spent <= Math.max(COOLDOWN_SECONDS, floorSpent), `${spent}s against ${COOLDOWN_SECONDS}s`);
});

test("a joint that hurts removes every stretch the library says to avoid for it", () => {
  const risky = STRETCH_ALL.filter((e) => (e.avoidIf || []).includes("knee")).map((e) => e.name);
  assert.ok(risky.length > 0, "the library marks at least one stretch as hard on a knee");
  for (const kind of ["dynamic", "static", "mobility"]) {
    const block = pickBlock({ kind, groups: MUSCLE_GROUPS, budgetSec: 3600, hurts: ["knee"], level: "advanced" });
    for (const m of block) assert.ok(!risky.includes(m.name), `${m.name} should have been avoided`);
  }
});

test("mobilityFor gives a normal day a dynamic warm-up and a static cool-down for what it worked", () => {
  const plan = buildPlan({ goal: { bubble: "build-muscle", child: null }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 4 }, logs: [] });
  for (const d of plan.week) {
    assert.ok(d.mobility, `${d.name} has mobility`);
    assert.ok(d.mobility.warmup.length >= MIN_MOVES, `${d.name} warm-up`);
    assert.ok(d.mobility.cooldown.length >= MIN_MOVES, `${d.name} cool-down`);
    for (const m of d.mobility.warmup) assert.equal(m.kind, "dynamic");
    for (const m of d.mobility.cooldown) assert.equal(m.kind, "static");
    assert.equal(d.mobility.mobilityGoal, false);
    assert.equal(d.totalMinutes, d.estimatedMinutes + Math.round(d.mobility.cooldownSeconds / 60));
    assert.ok(d.totalMinutes >= d.estimatedMinutes);
  }
});

test("the flexibility and mobility goal children get the ten minute block, mobility moves first", () => {
  for (const [bubble, child] of [["do-a-thing", "flexibility"], ["feel-better", "mobility"]]) {
    const plan = buildPlan({ goal: { bubble, child }, person: { bodyWeightLb: 160, sex: "Female", daysAsked: 3 }, logs: [] });
    assert.equal(plan.goal.childUsed, child, `${child} resolved`);
    for (const d of plan.week) {
      assert.equal(d.mobility.mobilityGoal, true, `${d.name} is a mobility goal day`);
      assert.ok(d.mobility.cooldownSeconds > COOLDOWN_SECONDS, `${d.name} cool-down is longer than the default`);
      assert.ok(d.mobility.cooldownSeconds <= MOBILITY_GOAL_SECONDS + 120, `${d.name} but not past ten minutes plus the floor`);
      assert.equal(d.mobility.cooldown[0].kind, "mobility", `${d.name} leads with a mobility move`);
    }
  }
});

test("toWorkout carries the two blocks and generateFromPayload reports them in meta", () => {
  const out = generateFromPayload({ goal: "Build muscle", current_weight: 190, sex: "Male", challenge_target: 4 }, { includePlan: true });
  assert.ok(Array.isArray(out.workout.warmup) && out.workout.warmup.length >= MIN_MOVES);
  assert.ok(Array.isArray(out.workout.cooldown) && out.workout.cooldown.length >= MIN_MOVES);
  for (const m of [...out.workout.warmup, ...out.workout.cooldown]) {
    assert.equal(typeof m.name, "string");
    assert.ok(m.seconds > 0);
    assert.equal(typeof m.perSide, "boolean");
    assert.ok(MUSCLE_GROUPS.includes(m.group));
  }
  assert.equal(out.meta.stretching.included, true);
  assert.ok(out.meta.stretching.warmupMinutes >= 1);
  assert.ok(out.meta.stretching.cooldownMinutes >= 1);
  assert.ok(out.meta.stretching.why.length >= 2);
  /* The five keys the app has always read are untouched. */
  for (const e of out.workout.exercises) for (const k of ["name", "sets", "reps", "targetWeight", "note"]) assert.ok(k in e);
});

test("skip_stretching strips the blocks and changes nothing else about the answer", () => {
  const payload = { goal: "Get stronger", current_weight: 200, sex: "Male", challenge_target: 3 };
  const today = new Date("2026-09-10T12:00:00");
  const on = generateFromPayload(payload, { today, includePlan: true });
  const off = generateFromPayload({ ...payload, skip_stretching: true }, { today, includePlan: true });
  assert.deepEqual(off.workout.warmup, []);
  assert.deepEqual(off.workout.cooldown, []);
  assert.equal(off.meta.stretching.included, false);
  assert.equal(off.meta.stretching.warmupMinutes, 0);
  assert.deepEqual(off.workout.exercises, on.workout.exercises);
  assert.equal(off.workout.focus, on.workout.focus);
  assert.deepEqual(JSON.stringify(off.plan), JSON.stringify(on.plan), "the plan underneath is byte for byte the same");
  const { stretching: a, ...restOn } = on.meta;
  const { stretching: b, ...restOff } = off.meta;
  assert.deepEqual(restOff, restOn);
  /* The other spelling a client might send. */
  const off2 = generateFromPayload({ ...payload, stretching: false }, { today });
  assert.deepEqual(off2.workout.warmup, []);
});

test("no equipment means no roller, band or bench in either block, and the plan says so", () => {
  const kit = new Set(STRETCH_ALL.filter((e) => !["none", "wall", "doorway", undefined, null, ""].includes(e.equipment)).map((e) => e.name));
  assert.ok(kit.size > 0, "the library has at least one stretch that needs kit");
  for (const [bubble, child] of [["consistent", null], ["feel-better", "mobility"]]) {
    const plan = buildPlan({ goal: { bubble, child }, person: { bodyWeightLb: 170, sex: "Female", daysAsked: 3 }, logs: [], limits: { hurts: [], missing: ["none"] } });
    for (const d of plan.week) {
      for (const m of [...d.mobility.warmup, ...d.mobility.cooldown]) assert.ok(!kit.has(m.name), `${d.name}: ${m.name} needs kit`);
      assert.ok(d.mobility.warmup.length >= MIN_MOVES && d.mobility.cooldown.length >= MIN_MOVES, `${d.name} still has both blocks`);
      assert.ok(d.mobility.why.some((w) => /no equipment/.test(w)), `${d.name} says why`);
    }
  }
  /* And with equipment, at least one block somewhere in a mobility week uses it,
     or the filter above is testing nothing. */
  const withKit = buildPlan({ goal: { bubble: "feel-better", child: "mobility" }, person: { bodyWeightLb: 170, sex: "Female", daysAsked: 3 }, logs: [] });
  assert.ok(withKit.week.some((d) => d.mobility.cooldown.some((m) => kit.has(m.name))), "a mobility week with equipment uses some");
});

test("stripMobility empties the two arrays and leaves every other key alone", () => {
  const w = { focus: "Push day", exercises: [{ name: "x" }], warmup: [{ name: "a" }], cooldown: [{ name: "b" }] };
  const s = stripMobility(w);
  assert.deepEqual(s, { focus: "Push day", exercises: [{ name: "x" }], warmup: [], cooldown: [] });
  assert.deepEqual(w.warmup, [{ name: "a" }], "input not mutated");
});
