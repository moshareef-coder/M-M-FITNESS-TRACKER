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

import { deriveTrainingAge, observedCapacity, THRESHOLDS, detectPlateau, earnedMovements, EARNED_DAYS } from "./training-age.mjs";
import { resolveGoal, GOAL_PARAMS, MAX_SECONDARY_GOALS, MOVEMENT_CLASSES, barredMovements, movementCautionNotes } from "./goal-engine.mjs";
import { sizeCeiling1RM, prescribeLoad, patternFor, variantFactor, roundLoad } from "./load.mjs";
import { buildPlan, estimateMinutes, sessionSeconds, noviceSessionCap, feelerSeconds, trainedWeeksBefore } from "./plan.mjs";
import { conjunctiveWeek, chooseComparison, sharedSchedule, relativeScore, PRODUCTIVE_GAP } from "./pair.mjs";

import { normalizeFocus, parseFocus, mergePriority, focusFreshness, MUSCLE_GROUPS, TIERS, TIER_COST, FOCUS_BUDGET } from "./focus.mjs";
import { mobilityFor, pickBlock, moveSeconds, stripMobility, WARMUP_SECONDS, RAMPED_WARMUP_SECONDS, COOLDOWN_SECONDS, MOBILITY_GOAL_SECONDS, MOBILITY_CHILDREN, MIN_MOVES, MAX_MOVES } from "./mobility.mjs";
import { scoreAlternatives } from "./alternatives.mjs";
import {
  learnPreferences, applyPreferences, avoidNote, openWeekBudget, heldBackNote, actedOn,
  SOFT_AT, HARD_AT, MAX_WEEK_SHARE, MIN_WEEK_MOVES,
} from "./preferences.mjs";
import { planPlateauResponse, applyRotateFallback, PLATEAU_RESPONSE } from "./plateau-response.mjs";
import { BODY_AREAS, EQUIPMENT_OPTIONS, normalizeLimits, applyLimits, limitsSummary, softenedNote } from "./limits.mjs";
import { JOINTS, JOINT_LOAD, defaultJointLoad } from "./joint-load.mjs";
import { joinPlanToActual, calibrateExercise, calibrate, stepFor, STEP_ISOLATION, STEP_COMPOUND, STEP_HEAVY } from "./calibrate.mjs";
import { mapGoal, generateFromPayload, toWorkout, focusDayIndex, nextDayIndex } from "./adapter.mjs";
import { clientGoals, clientGoalCases, CLIENT_FILE } from "./client-goals.mjs";
import { readStyles, normalizeStyles, cardioSessionFor, flowSessionFor, styleDayFor, mergeStyleLimits, FLOW_MINUTES_DEFAULT, FLOW_MINUTES_MAX } from "./styles.mjs";
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

/* No `level` is asserted anywhere below, and there is nothing left to assert:
   the beginner / novice / intermediate / advanced ladder is gone. What these
   check instead is that the measured numbers it was a lossy summary of are the
   ones being published. */
test("empty logs give no confidence, no sessions and a one entry why", () => {
  const r = deriveTrainingAge({ logs: [] });
  assert.equal(r.level, undefined, "the training level must not come back");
  assert.equal(r.confidence, "none");
  assert.equal(r.effectiveSessions, 0);
  assert.equal(r.why.length, 1);
});

test("six sessions is low confidence and counted", () => {
  const r = deriveTrainingAge({ logs: history({ n: 6 }) });
  assert.equal(r.confidence, "low");
  assert.equal(r.effectiveSessions, 6);
});

test("twenty five sessions are counted as twenty five, with no verdict attached", () => {
  const r = deriveTrainingAge({ logs: history({ n: 25 }) });
  assert.equal(r.effectiveSessions, 25);
  assert.equal(r.confidence, "medium");
  assert.equal(r.level, undefined);
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

test("seventy sessions climbing every session reads as still linear", () => {
  const r = deriveTrainingAge({ logs: climbingEverySession(70) });
  assert.equal(r.stillLinear, true);
});

/* =========================================================================
 * Earned access. The replacement for the level gate, and the thing the whole
 * change turns on.
 * ========================================================================= */

test("one logged day does not earn a movement and two do", () => {
  const rows = (dates) => dates.map((d) => ({ entry_date: d, exercise_name: "Barbell Snatch", weight: 95, reps: 3 }));
  assert.equal(earnedMovements({ logs: rows(["2026-09-01"]) }).has("barbell snatch"), false);
  assert.equal(earnedMovements({ logs: rows(["2026-09-01", "2026-09-04"]) }).has("barbell snatch"), true);
  assert.equal(EARNED_DAYS, 2);
});

test("three rows on one afternoon are one day, not three", () => {
  const logs = [1, 2, 3].map(() => ({ entry_date: "2026-09-01", exercise_name: "Muscle-Up", weight: 0, reps: 1 }));
  assert.equal(earnedMovements({ logs }).has("muscle-up"), false);
});

test("picking a movement by hand earns it the first time", () => {
  const swaps = [{ entry_date: "2026-09-01", planned_exercise: "Push-Up", chosen_exercise: "Weighted Dip", source: "searched" }];
  assert.equal(earnedMovements({ logs: [], swaps }).has("weighted dip"), true);
});

test("earning one movement earns nothing else", () => {
  const logs = ["2026-09-01", "2026-09-04"].map((d) => ({ entry_date: d, exercise_name: "Deadlift", weight: 225, reps: 5 }));
  const earned = earnedMovements({ logs });
  assert.equal(earned.size, 1);
  assert.equal(earned.has("romanian deadlift"), false);
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
    bubble: "build-muscle", child: "build-overall", amountLb: 20, bodyWeightLb: 150,
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
      const r = resolveGoal({ bubble, child: undefined, bodyWeightLb: 180, sex: "Male" });
      assert.equal(r.params, r.params); // resolved without throwing
    }, `bubble "${bubble}" should resolve with child undefined`);
  }
});

/* =========================================================================
 * The goals the CLIENT can send
 * -------------------------------------------------------------------------
 * Everything above and below reads mo-knowledge/goals/goal-tree.json, which is
 * the research and not the product. The picker in index.html is the product,
 * and on 2026-09-15 they disagreed: the picker offered `build-endurance` and
 * `move-better`, adapter.mjs validated neither, both fell through to the legacy
 * `goal` string ("Stay consistent" for both tiles) and both resolved to the
 * habit plan. 285 tests, a 10,421 run sweep and a fuzzer were all green, and
 * every one of them enumerated goals from the tree, so not one of them ever
 * built either goal. These are the tests that would have gone red on day one.
 * ========================================================================= */

test("every goal the picker offers is a bubble the adapter accepts", () => {
  for (const t of clientGoals()) {
    const mapped = mapGoal({ goal_bubble: t.id, goal_child: null, goal: t.legacy });
    assert.equal(mapped.bubble, t.id,
      `the picker offers "${t.title}" (${t.id}) and mapGoal resolved it to "${mapped.bubble}". `
      + `An unrecognised goal_bubble falls back to the legacy goal string silently, which is how `
      + `Build endurance and Move better both became Stay consistent in production.`);
  }
});

test("every goal the picker offers has its own parameters, not a neighbour's", () => {
  for (const t of clientGoals()) {
    assert.ok(GOAL_PARAMS[t.id], `the picker offers "${t.title}" (${t.id}) and GOAL_PARAMS has no entry for it`);
    const r = resolveGoal({ bubble: t.id });
    assert.ok(r.params.emphasis, `${t.id} resolved without an emphasis`);
  }
});

test("every goal the picker offers builds a plan, from the payload the app really sends", () => {
  for (const c of clientGoalCases()) {
    const out = generateFromPayload({
      goal_bubble: c.goal_bubble, goal_child: c.goal_child, goal: c.legacy,
      challenge_target: 4, current_weight: 180, sex: "Male", logs: [],
    }, { includePlan: true });
    assert.equal(out.meta.goals.primary.bubble, c.goal_bubble, `${c.id} resolved to a different goal`);
    assert.ok(out.plan.week.length, `${c.id} built no week`);
  }
});

/* The two goals the picker gained, and the numbers that say they are real
   rather than the habit plan wearing a new label. Named explicitly, because
   the generic tests above would pass if both simply resolved to something with
   an emphasis, and "it resolves" is not what either goal is for. */
test("Build endurance prescribes the endurance cardio and not the habit goal's", () => {
  const endurance = resolveGoal({ bubble: "build-endurance" }).params;
  const habit = resolveGoal({ bubble: "consistent" }).params;
  assert.equal(endurance.emphasis, "endurance");
  assert.deepEqual(endurance.cardio, { sessions: 3, minutes: 35, zone: "mixed" });
  assert.deepEqual(habit.cardio, { sessions: 1, minutes: 20, zone: "easy" });
});

test("Move better earns the ten minute mobility block with no child id", () => {
  /* The picker writes goal_child: null on every tile, so a block that can only
     be reached through a child id is a block nobody can reach. */
  const r = resolveGoal({ bubble: "move-better" });
  assert.equal(r.childUsed, "_default");
  assert.ok(MOBILITY_CHILDREN.includes(r.mobilityChild),
    `move-better resolved mobilityChild ${JSON.stringify(r.mobilityChild)}, so mobilityFor will not run the long block`);
  const day = { name: "Full body A", exercises: [{ name: "Goblet Squat", group: "quads" }], patterns: ["squat"], mainGroups: ["quads"] };
  const withGoal = mobilityFor(day, { goalChild: r.mobilityChild });
  const without = mobilityFor(day, { goalChild: resolveGoal({ bubble: "consistent" }).mobilityChild });
  assert.equal(withGoal.mobilityGoal, true);
  assert.equal(without.mobilityGoal, false);
  assert.ok(withGoal.cooldownSeconds > without.cooldownSeconds,
    `the mobility goal's cool-down is ${withGoal.cooldownSeconds}s against the ordinary ${without.cooldownSeconds}s`);
});

test("Move better and Build endurance as EXTRA goals are honoured, not dropped in silence", () => {
  /* normalizeSecondaryGoals dropped both before resolveGoal ever saw them, so
     meta.goals.ignored was empty and the contract's promise that every unused
     extra goal is named by reason was quietly false. */
  const r = resolveGoal({
    bubble: "build-muscle",
    secondary: [{ bubble: "build-endurance", child: null }, { bubble: "move-better", child: null }],
  });
  assert.equal(r.secondary.length, 2);
  assert.ok(r.secondary.find((x) => x.bubble === "build-endurance")?.cardio, "the endurance extra bought no cardio");
  assert.ok(r.secondary.find((x) => x.bubble === "move-better")?.mobility, "the mobility extra bought no block");
  const over = mapGoal({
    goal_bubble: "build-muscle",
    goal_secondary: [{ bubble: "build-endurance" }, { bubble: "move-better" }, { bubble: "consistent" }],
  });
  assert.equal(over.secondary.length, 3, "a third extra must survive mapGoal so resolveGoal can name it");
  const resolved = resolveGoal({ bubble: over.bubble, secondary: over.secondary });
  assert.equal(resolved.ignoredSecondary.length, 1);
  assert.ok(resolved.ignoredSecondary[0].why.includes("limit"));
});

test("the adapter's bubble table is the parameter table, so the two cannot drift", () => {
  /* It was a hand written mirror of goal-tree.json with a comment promising a
     drift check nobody wrote. This asserts the derivation instead: anything the
     engine has parameters for is accepted, and nothing else is. */
  for (const bubble of Object.keys(GOAL_PARAMS)) {
    assert.equal(mapGoal({ goal_bubble: bubble }).bubble, bubble, `${bubble} has parameters and mapGoal rejected it`);
    for (const child of Object.keys(GOAL_PARAMS[bubble])) {
      if (child === "_default") continue;
      assert.equal(mapGoal({ goal_bubble: bubble, goal_child: child }).child, child, `${bubble}/${child} was rejected`);
    }
  }
  assert.equal(mapGoal({ goal_bubble: "mobility", goal: "Stay consistent" }).bubble, "consistent");
});

test("the picker is read from index.html, and says so when it cannot be", () => {
  /* A gate that quietly checks nothing is worse than no gate, so the reader
     throws rather than returning an empty list. This pins that, because a
     silently empty list would make every test above pass. */
  assert.ok(clientGoals().length >= 4, `only ${clientGoals().length} tiles parsed out of ${CLIENT_FILE}`);
  assert.ok(clientGoals().every((t) => t.id && t.title), "a tile parsed with no id or no title");
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
  const heavy = sizeCeiling1RM({ exercise, bodyWeightLb: 265, sex: "Male" });
  const light = sizeCeiling1RM({ exercise, bodyWeightLb: 140, sex: "Male" });
  assert.ok(heavy < linear265, `${heavy} should be under linear ${linear265}`);
  assert.ok(light > linear140, `${light} should be over linear ${linear140}`);
});

test("the squat to bench ratio is wider for women than for men at reference weights", () => {
  const squatEx = { name: "Barbell Back Squat" };
  const benchEx = { name: "Bench Press" };
  const maleRatio = sizeCeiling1RM({ exercise: squatEx, bodyWeightLb: 180, sex: "Male" })
    / sizeCeiling1RM({ exercise: benchEx, bodyWeightLb: 180, sex: "Male" });
  const femaleRatio = sizeCeiling1RM({ exercise: squatEx, bodyWeightLb: 140, sex: "Female" })
    / sizeCeiling1RM({ exercise: benchEx, bodyWeightLb: 140, sex: "Female" });
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

/* Every exercise in the library, pinned.
 *
 * NAME_PATTERN is an ordered list where the first regex to match wins, so the
 * only thing keeping a specific movement away from the broad line whose word it
 * contains is where it sits in that list. Nobody had written that down, and the
 * audit of 2026-09-12 found nineteen exercises filed wrong because of it: "squat"
 * ate Split Squat so a lunge slot had one beginner option, "extension" ate Back
 * Extension, "pull through" sat in the isolation line so the one hinge a beginner
 * can do was not a hinge, "push up" ate Handstand Push-Up, and every incline and
 * decline press matched nothing and fell through to the isolation default, which
 * prices a movement at a fifth of a bench.
 *
 * Spot checks would not have caught any of that, because each one looks fine on
 * its own and only the pattern it lost to is wrong. So this walks the whole
 * library against a table written out by hand. It is deliberately tedious: a
 * reorder that re-prices somebody's incline press has to fail here rather than
 * ship, and a new library row has to be classified on purpose rather than
 * inherit the default in silence. */
const EXPECTED_PATTERN = {
  horizontalPush: [
    "Barbell Bench Press", "Bench Dip", "Close-Grip Bench Press",
    "Decline Barbell Press", "Decline Dumbbell Press", "Diamond Push-Up", "Dip",
    "Dumbbell Bench Press", "Incline Barbell Press", "Incline Dumbbell Press",
    "Incline Push-Up", "Landmine Press", "Machine Chest Press", "One-Arm Push-Up",
    "Pseudo Planche Push-Up", "Push-Up", "Wall Push-Up", "Weighted Dip",
  ],
  verticalPush: [
    "Arnold Press", "Cuban Press", "Dumbbell Shoulder Press", "Handstand Push-Up",
    "Machine Shoulder Press", "Military Press", "Overhead Press", "Push Press",
    "Seated Dumbbell Press",
  ],
  horizontalPull: [
    "Barbell Row", "Chest-Supported Row", "Dumbbell Row", "Inverted Row", "Pendlay Row",
    "Seated Cable Row", "T-Bar Row", "Upright Row",
  ],
  verticalPull: [
    "Archer Pull-Up", "Chin-Up", "Close-Grip Pulldown", "Lat Pulldown", "Muscle-Up",
    "Negative Pull-Up", "One-Arm Pull-Up", "Pull-Up", "Weighted Pull-Up",
  ],
  squat: [
    "Barbell Back Squat", "Bodyweight Squat", "Front Squat", "Goblet Squat", "Hack Squat",
    "Leg Press", "Pistol Squat", "Shrimp Squat", "Sissy Squat", "Zercher Squat",
  ],
  hinge: [
    "Back Extension", "Cable Pull-Through", "Deadlift", "Glute Bridge", "Good Morning",
    "Hip Thrust", "Romanian Deadlift", "Single-Leg Romanian Deadlift", "Stiff-Leg Deadlift",
    "Sumo Deadlift",
  ],
  lunge: [
    "Bulgarian Split Squat", "Curtsy Lunge", "Split Squat", "Step-Up", "Walking Lunge",
  ],
  carry: [
    "Farmer's Carry", "Suitcase Carry",
  ],
  core: [
    "Ab Wheel Rollout", "Bird Dog", "Cable Crunch", "Crunch", "Hanging Leg Raise",
    "Hanging Windshield Wiper", "Hollow Body Hold", "Human Flag", "L-Sit", "Pallof Press",
    "Plank", "Reverse Crunch", "Russian Twist", "Side Bend", "Side Plank", "Sit-Up", "Superman",
    "Toes-to-Bar", "Tuck L-Sit", "V-Sit", "V-Up", "Woodchopper",
  ],
  isolation: [
    "Barbell Curl", "Barbell Shrug", "Behind-the-Back Shrug", "Cable Curl", "Cable Fly",
    "Cable Kickback", "Cable Lateral Raise", "Concentration Curl", "Dead Hang",
    "Donkey Calf Raise", "Dumbbell Calf Raise", "Dumbbell Curl", "Dumbbell Shrug",
    "EZ-Bar Curl", "Face Pull", "Freestanding Handstand", "Frog Pump", "Front Lever",
    "Front Raise", "Full Planche",
    "Glute-Ham Raise", "Hammer Curl", "Incline Dumbbell Curl", "Lateral Raise", "Leg Curl",
    "Leg Extension", "Leg Press Calf Raise", "Low-to-High Cable Fly", "Nordic Curl",
    "Overhead Triceps Extension", "Pec Deck", "Planche Lean", "Plate Pinch", "Preacher Curl",
    "Rear Delt Fly", "Reverse Curl", "Reverse Hyperextension", "Reverse Pec Deck",
    "Reverse Wrist Curl", "Rope Pushdown", "Seated Calf Raise", "Single-Leg Calf Raise",
    "Skull Crusher", "Snatch-Grip High Pull", "Spider Curl", "Standing Calf Raise",
    "Straight-Arm Pulldown", "Triceps Kickback", "Triceps Pushdown", "Tuck Front Lever",
    "Tuck Planche", "Wall Handstand Hold", "Wrist Curl",
  ],
};

const EXPECTED_BY_NAME = new Map(
  Object.entries(EXPECTED_PATTERN).flatMap(([pattern, names]) => names.map((n) => [n, pattern])),
);

test("patternFor classifies every exercise in the library as the table says", () => {
  const wrong = [];
  for (const ex of LIBRARY_POOL) {
    const want = EXPECTED_BY_NAME.get(ex.name);
    if (want === undefined) continue;          // the coverage test below owns this case
    const got = patternFor(ex);
    if (got !== want) wrong.push(`${ex.name}: expected ${want}, got ${got}`);
  }
  assert.deepEqual(wrong, [], `\n  ${[...new Set(wrong)].join("\n  ")}\n`);
});

test("the expected-pattern table and the library cover each other exactly", () => {
  const inLibrary = new Set(LIBRARY_POOL.map((e) => e.name));
  const missing = [...inLibrary].filter((n) => !EXPECTED_BY_NAME.has(n));
  const stale = [...EXPECTED_BY_NAME.keys()].filter((n) => !inLibrary.has(n));
  assert.deepEqual(missing, [], `library exercises with no expected pattern: ${missing.join(", ")}`);
  assert.deepEqual(stale, [], `expected patterns for exercises no longer in the library: ${stale.join(", ")}`);
});

/* The order itself, stated as the rule rather than as nineteen outcomes, so the
   next person reading a failure knows which line moved and what it broke. Each
   pair is a name that contains another line's word: the specific one has to win.
   Bare strings, not library rows, because calibrate.mjs and fromHistory classify
   a logged name with no muscle groups attached and must get the same answer. */
test("NAME_PATTERN keeps the specific line ahead of the broad one whose word it contains", () => {
  assert.equal(patternFor("Split Squat"), "lunge");                  // not "squat"
  assert.equal(patternFor("Bulgarian Split Squat"), "lunge");
  assert.equal(patternFor("Leg Press"), "squat");                    // still a squat, though
  assert.equal(patternFor("Leg Press Calf Raise"), "isolation");     // not "leg press"
  assert.equal(patternFor("Cable Pull-Through"), "hinge");           // not a pull, not isolation
  assert.equal(patternFor("Back Extension"), "hinge");               // not "extension"
  assert.equal(patternFor("Reverse Hyperextension"), "isolation");   // but this one really is
  assert.equal(patternFor("Handstand Push-Up"), "verticalPush");     // not "push up"
  assert.equal(patternFor("Push Press"), "verticalPush");            // not "press"
  assert.equal(patternFor("Overhead Triceps Extension"), "isolation"); // not "overhead"
  assert.equal(patternFor("Overhead Press"), "verticalPush");        // this one is
  assert.equal(patternFor("Pallof Press"), "core");                  // a press only in name
  assert.equal(patternFor("Hanging Leg Raise"), "core");             // not "raise"
  assert.equal(patternFor("Lateral Raise"), "isolation");            // this one is
  assert.equal(patternFor("Straight-Arm Pulldown"), "isolation");    // one joint, not a pulldown
  assert.equal(patternFor("Muscle-Up"), "verticalPull");
});

/* The bug this reorder is paid for. An incline press is a bench press with the
   bench tilted, and it was priced as a curl: 0.20 of bench rather than 1.00,
   which told a 180 lb beginner to incline press about a fifth of what he should.
   Asserted as a relationship to the flat press rather than as a number, since
   the reference standards move and the relationship is the claim. */
/* Asserted on sizeCeiling1RM rather than on prescribeLoad now, because nothing
   is prescribed from size any more. The ratio table still exists and still has
   to be right: it is what stops an extrapolation from somebody's own logs coming
   back as an 870 lb leg press, and a table that prices an incline press as a
   curl would make that rail nonsense in the other direction. */
test("an incline press is priced against the bench, not against a curl", () => {
  const person = { bodyWeightLb: 180, sex: "Male" };
  const flat = sizeCeiling1RM({ exercise: { name: "Dumbbell Bench Press", equipment: "dumbbell" }, ...person });
  const incline = sizeCeiling1RM({ exercise: { name: "Incline Dumbbell Press", equipment: "dumbbell" }, ...person });
  const curl = sizeCeiling1RM({ exercise: { name: "Dumbbell Curl", equipment: "dumbbell" }, ...person });
  assert.ok(incline > curl * 2, `incline ${incline} vs curl ${curl}`);
  assert.ok(incline >= flat * 0.7, `incline ${incline} vs flat ${flat}`);
  assert.ok(incline <= flat, `incline ${incline} should not exceed flat ${flat}`);
});

/* The README listed "no hinge a beginner can be given" as a known limit of the
   library. It was never true; the one beginner hinge was filed as isolation. */
test("the library has a beginner hinge, and it is loadable", () => {
  const hinges = LIBRARY_POOL.filter((e) => patternFor(e) === "hinge" && e.level === "beginner");
  assert.ok(hinges.length > 0, "no beginner hinge in the library");
  assert.ok(hinges.some((e) => e.equipment !== "bodyweight"), `beginner hinges are all bodyweight: ${hinges.map((e) => e.name).join(", ")}`);
});

/* The lunge slot held exactly one beginner option, so a 4 day split put Step-Up
   on both leg days. Two is the difference between a repeat and a choice. */
test("the lunge slot has more than one beginner option", () => {
  const lunges = LIBRARY_POOL.filter((e) => patternFor(e) === "lunge" && e.level === "beginner");
  const names = new Set(lunges.map((e) => e.name));
  assert.ok(names.size > 1, `beginner lunges: ${[...names].join(", ")}`);
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

/* The change this file exists to pin. There is no cold start any more: a person
   with nothing on the record is given the reps and an instruction, and no
   number at all. The old version of this test asserted the guess was small
   ("under 80 lb on a goblet squat"), which was the engine grading its own
   homework: a guess nobody can check is not made acceptable by being a low one,
   and the same code told a woman who had not filled in her sex to pull 110 lb. */
test("nothing on the record means no weight, whatever we know about their size", () => {
  for (const sex of ["Male", "Female", null]) {
    for (const bw of [120, 180, 265]) {
      for (const name of ["Goblet Squat", "Lateral Raise", "Cable Pull-Through", "Barbell Bench Press"]) {
        const r = prescribeLoad({
          exercise: { name, equipment: "dumbbell" }, reps: 8, bodyWeightLb: bw, sex, logs: [],
        });
        assert.equal(r.weight, null, `${name} for a ${bw} lb ${sex} came back with ${r.weight}`);
        assert.equal(r.basis, "unknown");
      }
    }
  }
});

/* The bug removing the guess removed, kept as a test so it cannot come back in
   another form. `sex` is optional on the profile, the guess defaulted to the
   male reference table, and a woman who skipped it was handed a man's numbers
   on every lift in her week. The same two people now get the same card. */
test("a missing sex costs nobody a heavier prescription, because there is no prescription", () => {
  const ex = { name: "Barbell Bench Press", equipment: "barbell" };
  const stated = prescribeLoad({ exercise: ex, reps: 8, bodyWeightLb: 140, sex: "Female", logs: [] });
  const blank = prescribeLoad({ exercise: ex, reps: 8, bodyWeightLb: 140, sex: null, logs: [] });
  assert.deepEqual(stated, blank);
});

/* And what they get instead has to be worth reading, because a blank where a
   number was is the cost this change pays. Three things: what to do, how to
   know when they have it, and that they will not be asked again. */
test("the first session says what to do instead of a number", () => {
  const r = prescribeLoad({ exercise: { name: "Goblet Squat", equipment: "dumbbell" }, reps: 8, bodyWeightLb: 180, sex: "Male", logs: [] });
  assert.match(r.note, /two reps short/i);
  assert.match(r.note, /your number/i);
});

/* The fuzz run of 2026-09-12: one logged Goblet Squat at 200 lb turned into an
   870 lb Leg Press for a 180 lb man the engine itself called a beginner. Every
   assertion here is on the pounds that come out, never on a ratio or a factor,
   because the ratios were all doing what they were told and the number was still
   one nobody can lift. */
test("a load extrapolated from one row of a different lift is capped, and says so", () => {
  const logs = [{ entry_date: day(-4), exercise_name: "Goblet Squat", weight: 200, reps: 10 }];
  const r = prescribeLoad({
    exercise: { name: "Leg Press", equipment: "machine" }, reps: 10,
    bodyWeightLb: 180, sex: "Male", logs,
  });
  assert.equal(r.capped, true);
  assert.ok(r.weight < 500, `capped leg press was ${r.weight}`);
  assert.match(r.note, /guess/i);
});

test("three rows behind a guess buy it more room than one row does", () => {
  const at = (name, weight, d) => ({ entry_date: day(d), exercise_name: name, weight, reps: 10 });
  const person = { exercise: { name: "Leg Press", equipment: "machine" }, reps: 10, bodyWeightLb: 180, sex: "Male" };
  const one = prescribeLoad({ ...person, logs: [at("Goblet Squat", 200, -4)] });
  const three = prescribeLoad({ ...person, logs: [at("Goblet Squat", 200, -4), at("Goblet Squat", 200, -7), at("Goblet Squat", 200, -10)] });
  assert.equal(one.capped, true);
  assert.ok(three.weight > one.weight, `three rows ${three.weight} should beat one row ${one.weight}`);
});

test("an ordinary guess from a similar lift is not capped and does not gain a caveat", () => {
  const logs = [{ entry_date: day(-4), exercise_name: "Goblet Squat", weight: 50, reps: 10 }];
  const r = prescribeLoad({
    exercise: { name: "Barbell Back Squat", equipment: "barbell" }, reps: 10,
    bodyWeightLb: 180, sex: "Male", logs,
  });
  assert.equal(r.capped, false);
  assert.doesNotMatch(r.note, /held here/);
});

/* The audit of 2026-09-19. Every hinge was filed under one pattern ratio, so a
   logged Deadlift 3x8 at 315 prescribed a Romanian Deadlift at 300, a Good
   Morning at 300 and a Cable Pull-Through at 240, all under "a similar lift".
   Three rows behind the guess so the size ceiling does not bind and the ratio
   table is the only thing under test; every bound is in pounds off the
   prescription against the coaching range the table was built from. */
const threeRowsOf = (name, weight) =>
  [3, 6, 9].map((n) => ({ entry_date: day(-n), exercise_name: name, weight, reps: 8, sets: 3 }));
const guessFrom = (logs, name, bodyWeightLb = 180) =>
  prescribeLoad({ exercise: { name, equipment: "barbell" }, reps: 8, bodyWeightLb, sex: "Male", logs });

test("a hinge is priced as its own movement and never as the deadlift it was guessed from", () => {
  const logs = threeRowsOf("Deadlift", 315);
  const bounds = {
    "Romanian Deadlift": [0.6, 0.8], "Stiff-Leg Deadlift": [0.6, 0.8], "Good Morning": [0.3, 0.45],
    "Cable Pull-Through": [0.2, 0.4], "Hip Thrust": [0.85, 1.2], "Back Extension": [0.05, 0.25],
    "Kettlebell Swing": [0.15, 0.35], "Single-Leg Romanian Deadlift": [0.2, 0.4],
  };
  for (const [name, [lo, hi]] of Object.entries(bounds)) {
    const r = guessFrom(logs, name);
    assert.equal(r.basis, "a similar lift", `${name} was not guessed from the deadlift`);
    assert.equal(r.capped, false, `${name} hit the ceiling, so the ratio was not what priced it`);
    assert.ok(r.weight <= 315 * hi && r.weight >= 315 * lo, `${name} from a 315 deadlift came to ${r.weight}`);
  }
});

test("from a heavier deadlift the ceiling holds every hinge under its own ratio", () => {
  const logs = threeRowsOf("Deadlift", 405);
  const ratio = { "Romanian Deadlift": 0.8, "Good Morning": 0.45, "Cable Pull-Through": 0.4, "Hip Thrust": 1.2, "Back Extension": 0.25 };
  for (const [name, hi] of Object.entries(ratio)) {
    const r = guessFrom(logs, name);
    assert.ok(r.weight <= 405 * hi, `${name} from a 405 deadlift came to ${r.weight}`);
  }
  /* And the ceiling is a movement's ceiling: the Good Morning is held well
     under the 365 a deadlift-shaped ceiling used to hand back. */
  assert.ok(guessFrom(logs, "Good Morning").weight <= 160);
});

test("the other families carry their own ratios too", () => {
  const front = guessFrom(threeRowsOf("Barbell Back Squat", 315), "Front Squat");
  assert.ok(front.weight <= 315 * 0.8 && front.weight >= 315 * 0.6, `front squat from a 315 squat came to ${front.weight}`);
  const landmine = guessFrom(threeRowsOf("Barbell Bench Press", 225), "Landmine Press");
  assert.ok(landmine.weight <= 225 * 0.5, `landmine press from a 225 bench came to ${landmine.weight}`);
  const upright = guessFrom(threeRowsOf("Barbell Row", 185), "Upright Row");
  assert.ok(upright.weight <= 185 * 0.5, `upright row from a 185 row came to ${upright.weight}`);
  const supported = guessFrom(threeRowsOf("Barbell Row", 185), "Chest-Supported Row");
  assert.ok(supported.weight <= 185 * 0.8, `chest-supported row from a 185 row came to ${supported.weight}`);
});

test("single joint work is only ever priced from its own family", () => {
  /* A leg curl and a lateral raise are both "isolation" to patternFor, and one
     used to price the other. */
  const fromLegCurl = guessFrom(threeRowsOf("Leg Curl", 120), "Lateral Raise");
  assert.equal(fromLegCurl.basis, "unknown");
  assert.equal(fromLegCurl.weight, null);
  const hammer = guessFrom(threeRowsOf("Dumbbell Curl", 35), "Hammer Curl");
  assert.equal(hammer.basis, "a similar lift");
  assert.ok(hammer.weight >= 25 && hammer.weight <= 40, `hammer curl from a 35 curl came to ${hammer.weight}`);
});

test("the typo rail knows a good morning is not a deadlift", () => {
  const one = (name, weight) => [{ entry_date: day(-4), exercise_name: name, weight, reps: 8 }];
  const gm = prescribeLoad({ exercise: { name: "Good Morning", equipment: "barbell" }, reps: 8, bodyWeightLb: 180, sex: "Male", logs: one("Good Morning", 600) });
  assert.equal(gm.capped, true);
  assert.ok(gm.weight <= 180 * 2, `a 600 lb good morning row was handed back as ${gm.weight}`);
  /* The same row on the deadlift itself is under the four-times rail and is
     handed straight back: the rail tightens per movement and never loosens. */
  const dl = prescribeLoad({ exercise: { name: "Deadlift", equipment: "barbell" }, reps: 8, bodyWeightLb: 180, sex: "Male", logs: one("Deadlift", 600) });
  assert.equal(dl.weight, 600);
  assert.equal(dl.capped, false);
});

/* CONTRACT.md: targetWeight is a number the app does arithmetic on, 0 means
   bodyweight or unknown, never a string and never null. A log weight of 1e308 is
   valid JSON, overflows a pattern ratio to Infinity, and JSON.stringify writes
   Infinity as null. Asserted through JSON, because JSON is where it broke. */
test("a nonsense log weight can never put a non-finite number into the plan", () => {
  const cases = [1e308, Infinity, -Infinity, "not a number"];
  for (const weight of cases) {
    const logs = [{ entry_date: day(-4), exercise_name: "Goblet Squat", weight }];
    for (const name of ["Leg Press", "Goblet Squat"]) {
      const r = prescribeLoad({
        exercise: { name, equipment: "machine" }, reps: 10,
        bodyWeightLb: 180, sex: "Male", logs,
      });
      const targetWeight = JSON.parse(JSON.stringify({ targetWeight: r.weight ?? 0 })).targetWeight;
      assert.equal(typeof targetWeight, "number", `${name} from ${weight} gave ${targetWeight}`);
      assert.ok(Number.isFinite(targetWeight), `${name} from ${weight} gave ${targetWeight}`);
      assert.ok(targetWeight <= 1500, `${name} from ${weight} gave ${targetWeight}`);
    }
  }
});

/* The second half of the same fuzz run. The cap above only ever bounded a
   GUESS, on the argument that a logged row is a measurement. The session weight
   field has no max on it, so a logged 5000 lb Front Squat is a typo with a date
   attached, and the old no-human line of 1500 lb handed it straight back: 2,882
   cases came out above what anybody that size lifts. Every assertion here is in
   pounds off the prescription, not on a factor. */
test("a mistyped four figure log row never becomes a four figure prescription", () => {
  for (const weight of [5000, 99999, 1e15]) {
    const logs = [{ entry_date: day(-4), exercise_name: "Front Squat", weight, reps: 8 }];
    const r = prescribeLoad({
      exercise: { name: "Front Squat", equipment: "barbell" }, reps: 8,
      bodyWeightLb: 165, sex: "Male", logs,
    });
    /* Four times bodyweight is the rail, one number for everybody now that
       there is no training level to key it on, and it is a rail rather than a
       prescription: the note has to say so or the number is a lie. */
    assert.ok(r.weight <= 165 * 4, `${weight} lb logged gave ${r.weight}`);
    assert.equal(r.capped, true);
    assert.match(r.note, /ceiling, not a prescription/);
  }
});

test("the ceiling on a measured row is the person's size, not one flat number", () => {
  const logs = [{ entry_date: day(-4), exercise_name: "Leg Press", weight: 9000, reps: 8 }];
  const ex = { exercise: { name: "Leg Press", equipment: "machine" }, reps: 8, sex: "Male", logs };
  const small = prescribeLoad({ ...ex, bodyWeightLb: 120 });
  const big = prescribeLoad({ ...ex, bodyWeightLb: 240 });
  assert.ok(small.weight <= 120 * 4, `the 120 lb lifter got ${small.weight}`);
  assert.ok(big.weight <= 240 * 4, `the 240 lb lifter got ${big.weight}`);
  assert.ok(big.weight > small.weight, `${big.weight} should beat ${small.weight}`);
});

test("a real lifter's own logged weight is handed straight back, rail or no rail", () => {
  const logs = [{ entry_date: day(-4), exercise_name: "Barbell Back Squat", weight: 315, reps: 5 }];
  const r = prescribeLoad({
    exercise: { name: "Barbell Back Squat", equipment: "barbell" }, reps: 5,
    bodyWeightLb: 180, sex: "Male", logs,
  });
  assert.equal(r.weight, 315);
  assert.equal(r.capped, false);
});

/* A bodyweight outside the range a person lives in is a bad row, not a heavy
   person, and the allometric curve keeps climbing forever if you let it: a
   current_weight of 1e308 was producing a 2.7e206 lb Goblet Squat. The answer
   for a weight we do not believe is the answer for a weight we were never
   given, which is to omit the load. */
test("a bodyweight nobody has cannot become a starting weight", () => {
  for (const bodyWeightLb of [1e308, 1e-9, -200, "heavy", NaN, 40000]) {
    const r = prescribeLoad({
      exercise: { name: "Goblet Squat", equipment: "dumbbell" }, reps: 8,
      bodyWeightLb, sex: "Male", logs: [],
    });
    assert.equal(r.weight, null, `${bodyWeightLb} lb gave ${r.weight}`);
    assert.equal(r.basis, "unknown");
  }
});

test("the heaviest bodyweight the payload bound accepts still gets a liftable number", () => {
  const r = prescribeLoad({
    exercise: { name: "Leg Press", equipment: "machine" }, reps: 3,
    bodyWeightLb: 1500, sex: "Male", logs: [],
  });
  assert.ok(r.weight <= 1200, `1500 lb advanced got ${r.weight}`);
});

test("roundLoad refuses a non-finite weight rather than passing it on", () => {
  assert.equal(roundLoad(Infinity), null);
  assert.equal(roundLoad(NaN), null);
  assert.equal(roundLoad(1e308 * 10), null);
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

/* =========================================================================
 * Earned access, end to end through a built week
 * ========================================================================= */

test("a movement nobody has done and nobody asked for never appears", () => {
  const plan = buildPlan({
    goal: { bubble: "build-muscle", child: "build-overall" },
    person: { bodyWeightLb: 180, sex: "Male", daysAsked: 5 }, logs: [],
  });
  const byName = new Map(LIBRARY_POOL.map((e) => [e.name, e]));
  for (const d of plan.week) {
    for (const e of d.exercises) {
      const lib = byName.get(e.name);
      if (!lib) continue;
      assert.notEqual(lib.level, "advanced", `${e.name} is advanced and was never earned`);
    }
  }
});

test("doing a harder movement twice puts it back in the week", () => {
  /* Muscle-Up is advanced calisthenics, so nothing in the default pool can
     reach it. Two logged days of it, and it is a candidate again. The claim is
     about the POOL rather than about this one slot, so it is asserted as "the
     week can now contain it" against "the week could not before". */
  const days = [day(-3), day(-6)];
  const logs = days.map((d) => ({ entry_date: d, exercise_name: "Muscle-Up", sets: 3, reps: 3, weight: 0 }));
  const earned = earnedMovements({ logs });
  assert.equal(earned.has("muscle-up"), true);

  const one = earnedMovements({ logs: [logs[0]] });
  assert.equal(one.has("muscle-up"), false, "one day is not enough");
});

test("a week built from a long history is made of the lifts in that history", () => {
  const names = ["Barbell Bench Press", "Barbell Back Squat", "Barbell Row", "Overhead Press"];
  const logs = [];
  for (let i = 0; i < 30; i++) {
    for (const name of names) {
      logs.push({ entry_date: day(-2 - i * 3), exercise_name: name, sets: 3, reps: 5, weight: 185 });
    }
  }
  const plan = buildPlan({
    goal: { bubble: "get-stronger", child: "strong-a-lift" },
    person: { bodyWeightLb: 190, sex: "Male", daysAsked: 4 }, logs,
  });
  const inWeek = new Set(plan.week.flatMap((d) => d.exercises.map((e) => e.name)));
  const hit = names.filter((n) => inWeek.has(n)).length;
  assert.ok(hit >= 3, `only ${hit} of their own four lifts came back: ${[...inWeek].join(", ")}`);
  /* And those lifts carry a weight off the record rather than a guess. */
  for (const d of plan.week) {
    for (const e of d.exercises) {
      if (!names.includes(e.name)) continue;
      assert.ok(e.weight > 0, `${e.name} came back with no weight despite thirty sessions of it`);
      assert.equal(e.loadBasis, "your last session");
    }
  }
});

test("a brand new person gets no invented weight anywhere in the week", () => {
  for (const sex of ["Male", "Female", null]) {
    const plan = buildPlan({
      goal: { bubble: "build-muscle", child: "build-overall" },
      person: { bodyWeightLb: 180, sex, daysAsked: 4 }, logs: [],
    });
    for (const d of plan.week) {
      for (const e of d.exercises) {
        assert.equal(e.weight, null, `${e.name} was prescribed ${e.weight} lb with nothing on the record`);
        assert.ok(e.loadBasis === "unknown" || e.loadBasis === "bodyweight", `${e.name} basis ${e.loadBasis}`);
        /* And the day is still a session: sets, reps and rest are all there. */
        assert.ok(e.sets >= 2 && e.reps >= 1 && e.restSec > 0);
      }
    }
  }
});

test("the week a woman who never stated her sex gets is the week a man her size gets", () => {
  const week = (sex) => buildPlan({
    goal: { bubble: "build-muscle", child: "build-overall" },
    person: { bodyWeightLb: 140, sex, daysAsked: 4 }, logs: [],
  }).week.map((d) => d.exercises.map((e) => [e.name, e.sets, e.reps, e.weight]));
  assert.deepEqual(week(null), week("Female"));
  assert.deepEqual(week(null), week("Male"));
});

/* An entry_date the calendar cannot place used to make every span NaN, and
   JSON.stringify writes NaN as null, so the answer changed meaning on its way
   over the wire. Found by fuzzing 40,014 cases once meta.experience started
   publishing these numbers; the wrong number was there before and nothing
   downstream read it. */
test("a date nothing can parse never puts a NaN in the measured numbers", () => {
  const logs = [
    { entry_date: "2026-13-45", exercise_name: "Bench Press", sets: 3, reps: 8, weight: 135 },
    { entry_date: "not a date", exercise_name: "Bench Press", sets: 3, reps: 8, weight: 135 },
  ];
  const r = deriveTrainingAge({ logs });
  for (const k of ["sessions", "effectiveSessions", "sessionsPerWeek", "weeksTraining"]) {
    assert.ok(Number.isFinite(r[k]), `${k} is ${r[k]}`);
  }
  assert.equal(typeof r.returning, "boolean");
  assert.equal(JSON.parse(JSON.stringify(r)).weeksTraining, r.weeksTraining);
});

test("a beginner with four days gets an upper lower split", () => {
  /* "consistent" caps out at three days, so this needs a goal whose maxDays
     actually allows four, or the day count gets clamped before the split
     ever sees a 4. */
  const plan = buildPlan({ goal: { bubble: "lose-weight", child: "lose-a-number" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 4 }, logs: [] });
  const names = plan.week.map((d) => d.name);
  assert.deepEqual(names, ["Upper body A", "Lower body A", "Upper body B", "Lower body B"]);
});

/* Three days is full body for everybody now, and five is where Push / Pull /
   Legs lives. The split used to branch on the training level at three days:
   full body for a beginner or a novice, Push / Pull / Legs above that. In
   production that branch never fired, because the client sends 90 days of logs
   and the intermediate rung started at 60 sessions. So this test asserted a week
   nobody was ever given, and what it asserts now is that the day count alone
   decides, which is what volume-landmarks.md ties a split to. */
test("three days is a full body week however much history there is behind it", () => {
  const seasoned = buildPlan({ goal: { bubble: "consistent", child: "keep-quitting" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 }, logs: climbThenPlateau(70, 20) });
  const dayOne = buildPlan({ goal: { bubble: "consistent", child: "keep-quitting" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 }, logs: [] });
  const names = ["Full body A", "Full body B", "Full body C"];
  assert.deepEqual(seasoned.week.map((d) => d.name), names);
  assert.deepEqual(dayOne.week.map((d) => d.name), names);
});

test("a five day week is push pull legs and an upper lower on top", () => {
  const plan = buildPlan({ goal: { bubble: "build-muscle", child: "build-overall" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 5 }, logs: [] });
  assert.deepEqual(plan.week.map((d) => d.name), ["Push day", "Pull day", "Leg day", "Upper body", "Lower body"]);
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

/* ---- the three tiers, 2026-09-12 ---- */

test("a legacy focus_groups array still means every group at the middle tier", () => {
  const r = mergePriority({ userFocus: ["chest", "glutes"] });
  assert.deepEqual(r.tiers, { chest: TIERS.secondary, glutes: TIERS.secondary });
  assert.deepEqual(r.priority, ["chest", "glutes"]);
});

test("parseFocus reads the encoded tier, the tier words and the object map", () => {
  assert.deepEqual(parseFocus(["chest:3", "glutes:1"]).tiers, { chest: 3, glutes: 1 });
  assert.deepEqual(parseFocus(["chest=red", "glutes:green"]).tiers, { chest: 3, glutes: 1 });
  assert.deepEqual(parseFocus({ chest: 3, glutes: "green" }).tiers, { chest: 3, glutes: 1 });
  /* Pieces and heads carry a tier the same way whole groups do. */
  assert.deepEqual(parseFocus(["gluteusMaximus:3"]).tiers, { glutes: 3 });
  /* An unreadable tier on a real group is still a group they tapped. */
  assert.deepEqual(parseFocus(["chest:banana"]).tiers, { chest: TIERS.secondary });
});

test("the budget is spent highest tier first, and what did not fit is named", () => {
  /* Three reds is nine, the whole budget, so the yellow behind them misses. */
  const r = mergePriority({ userFocus: ["chest:3", "lats:3", "quads:3", "biceps:2"] });
  assert.deepEqual(r.priority, ["chest", "lats", "quads"]);
  assert.ok(r.why.some((w) => w.includes("biceps") && w.includes("did not fit")), r.why.join(" | "));
});

test("each tier moves weekly volume by a different amount", () => {
  const today = new Date("2026-09-12T12:00:00Z");
  /* A four day lose-a-number week, where the group is hit often enough that
     the rounding does not swallow the difference. This is the case the
     multipliers were chosen against; see TIER_MULTIPLIER in focus.mjs. */
  const base = { goal_bubble: "lose-weight", goal_child: "lose-a-number", challenge_target: 4, current_weight: 180, sex: "Male" };
  const setsFor = (focus_groups) => {
    const out = generateFromPayload({ ...base, focus_groups }, { today, includePlan: true });
    return out.plan.weeklyVolume.chest?.sets ?? 0;
  };
  const none = setsFor(null);
  const green = setsFor(["chest:1"]);
  const yellow = setsFor(["chest:2"]);
  const red = setsFor(["chest:3"]);
  assert.ok(green > none, `green ${green} against none ${none}`);
  assert.ok(yellow > green, `yellow ${yellow} against green ${green}`);
  assert.ok(red > yellow, `red ${red} against yellow ${yellow}`);
});

test("a tier never buys less than the tier below it, or than no focus at all", () => {
  const today = new Date("2026-09-12T12:00:00Z");
  /* build-a-part already prioritises arms, so a green tap on biceps is the
     case where a light preference could have UNDERCUT the goal's own 1.4x.
     The goal's claim is a floor: the sweep caught this one. */
  const base = { goal_bubble: "build-muscle", goal_child: "build-a-part", challenge_target: 5, current_weight: 180, sex: "Male" };
  const setsFor = (focus_groups) => {
    const out = generateFromPayload({ ...base, focus_groups }, { today, includePlan: true });
    return out.plan.weeklyVolume.biceps?.sets ?? 0;
  };
  assert.ok(setsFor(["biceps:1"]) >= setsFor(null), "green must not undercut the goal's own priority");
  const merged = mergePriority({ goalPriority: ["biceps"], userFocus: ["biceps:1"] });
  assert.equal(merged.tiers.biceps, TIERS.secondary);
  assert.ok(merged.why.some((w) => w.includes("never buys less")), merged.why.join(" | "));
});

test("the whole body at one level is no focus at all, and the plan says so", () => {
  const all = mergePriority({ userFocus: MUSCLE_GROUPS.map((g) => `${g}:3`) });
  assert.deepEqual(all.priority, [], "nothing is pushed ahead of anything else");
  assert.ok(all.notes.length === 1 && all.notes[0].includes("whole body"), all.notes.join(" | "));
  /* The picker's own "select my whole body" token takes the same path. */
  const token = mergePriority({ userFocus: ["all"] });
  assert.deepEqual(token.priority, []);
  assert.deepEqual(token.notes, all.notes);
  /* And the goal's own priority survives it: that was never the tap to flatten. */
  const withGoal = mergePriority({ goalPriority: ["quads"], userFocus: ["all"] });
  assert.deepEqual(withGoal.priority, ["quads"]);
});

test("an all red pick reaches the app as a note next to honest, not as a silent flattening", () => {
  const today = new Date("2026-09-12T12:00:00Z");
  const out = generateFromPayload({
    goal_bubble: "build-muscle", goal_child: "build-overall", challenge_target: 3,
    current_weight: 180, sex: "Male", focus_groups: MUSCLE_GROUPS.map((g) => `${g}:3`),
  }, { today, includePlan: true });
  assert.equal(out.meta.focus.requested.length, MUSCLE_GROUPS.length, "all fourteen were asked for");
  assert.ok(out.notes.some((n) => n.includes("whole body")), out.notes.join(" | "));
});

test("meta.focus carries the tier on both sides of the merge", () => {
  const today = new Date("2026-09-12T12:00:00Z");
  const out = generateFromPayload({
    goal_bubble: "build-muscle", goal_child: "build-overall", challenge_target: 3,
    current_weight: 180, sex: "Male", focus_groups: ["chest:3", "calves:1"],
  }, { today });
  assert.deepEqual(out.meta.focus.requestedTiers, { chest: 3, calves: 1 });
  assert.equal(out.meta.focus.tiers.chest, 3);
  assert.equal(out.meta.focus.tiers.calves, 1);
  for (const g of out.meta.focus.applied) assert.ok(out.meta.focus.tiers[g], `${g} applied with no tier`);
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
  const results = scoreAlternatives({ exercise: BARBELL_BENCH, pool: WEIGHT_EXERCISES, count: 20 });
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

/* ---- the week cap, added the day after this module went live ---- */

const manySwaps = (names, each) => names.flatMap((n, i) => Array.from({ length: each }, (_, k) => ({
  entry_date: day(-(3 + i * 7 + k * 2)), planned_exercise: n, chosen_exercise: `Alt ${n}`,
})));

test("the cap is a share of the week, so a two day week and a six day week are not the same feature", () => {
  const prefs = learnPreferences({ swaps: manySwaps(["A", "B", "C", "D"], HARD_AT) });
  assert.equal(openWeekBudget(prefs, { slots: 10 }).cap, Math.round(10 * MAX_WEEK_SHARE));
  assert.equal(openWeekBudget(prefs, { slots: 30 }).cap, Math.round(30 * MAX_WEEK_SHARE));
  assert.ok(openWeekBudget(prefs, { slots: 30 }).cap > openWeekBudget(prefs, { slots: 10 }).cap);
});

test("the smallest week is not frozen: the cap never falls below its floor", () => {
  const prefs = learnPreferences({ swaps: manySwaps(["A", "B", "C"], HARD_AT) });
  assert.equal(openWeekBudget(prefs, { slots: 1 }).cap, MIN_WEEK_MOVES);
  assert.equal(openWeekBudget(prefs, { slots: 0 }).cap, MIN_WEEK_MOVES);
});

test("nothing to act on opens no budget at all", () => {
  assert.equal(openWeekBudget(learnPreferences({ swaps: [] }), { slots: 15 }), null);
  assert.equal(openWeekBudget(null, { slots: 15 }), null);
});

test("without a budget applyPreferences is exactly what it was", () => {
  const pool = [{ name: "A", equipment: "barbell" }, { name: "B", equipment: "barbell" }, { name: "C", equipment: "barbell" }];
  const prefs = { avoid: [{ name: "A", strength: "hard" }], prefer: [{ name: "C" }], equipmentBias: null };
  assert.deepEqual(applyPreferences(pool, prefs).map((e) => e.name), ["C", "B"]);
});

test("the cap stops letting preferences in once the week has spent its moves", () => {
  /* Four hard avoids, each alone in its own slot, and a cap of two. The two
     loudest come out of the week and the other two stay, which is the whole
     point: a preference held back is a movement still on the card. */
  const prefs = learnPreferences({ swaps: manySwaps(["A", "B", "C", "D"], HARD_AT) });
  const budget = openWeekBudget(prefs, { slots: 6 });   // floor, so cap is MIN_WEEK_MOVES
  assert.equal(budget.cap, MIN_WEEK_MOVES);
  const heads = ["A", "B", "C", "D"].map((n) => applyPreferences(
    [{ name: n, equipment: "barbell" }, { name: `Alt ${n}`, equipment: "barbell" }], prefs, budget,
  )[0].name);
  const moved = heads.filter((h) => h.startsWith("Alt")).length;
  assert.equal(moved, MIN_WEEK_MOVES, `${moved} slots moved against a cap of ${MIN_WEEK_MOVES}`);
  assert.equal(budget.held.size, 4 - MIN_WEEK_MOVES);
});

test("when two preferences want the same slot the loudest one gets it", () => {
  /* Same three decisions each, so the raw counts tie and only recency can
     separate them. The recent one is honoured and the stale one is what the
     slot falls back to. */
  const swaps = [
    ...[2, 4, 6].map((d) => ({ entry_date: day(-d), planned_exercise: "Recent", chosen_exercise: "Alt Recent" })),
    ...[70, 80, 88].map((d) => ({ entry_date: day(-d), planned_exercise: "Stale", chosen_exercise: "Alt Stale" })),
  ];
  const prefs = learnPreferences({ swaps });
  assert.equal(prefs.avoid.find((a) => a.name === "Recent").count, HARD_AT);
  assert.equal(prefs.avoid.find((a) => a.name === "Stale").count, HARD_AT);
  assert.equal(prefs.avoid[0].name, "Recent", "the recent one should be first in the queue");

  const budget = { ...openWeekBudget(prefs, { slots: 3 }), cap: 1 };
  const got = applyPreferences([
    { name: "Recent", equipment: "barbell" }, { name: "Stale", equipment: "barbell" }, { name: "Other", equipment: "barbell" },
  ], prefs, budget).map((e) => e.name);
  assert.ok(!got.includes("Recent"), "the loud preference should have been honoured");
  assert.equal(got[0], "Stale", "the quiet one is what the slot falls back to");
  assert.deepEqual([...budget.held.values()].map((h) => h.name), ["Stale"]);
});

test("a preference held back is named out loud rather than left to be noticed", () => {
  const prefs = learnPreferences({ swaps: manySwaps(["Leg Press", "Barbell Curl"], HARD_AT) });
  const budget = { ...openWeekBudget(prefs, { slots: 3 }), cap: 1 };
  for (const n of ["Leg Press", "Barbell Curl"]) {
    applyPreferences([{ name: n, equipment: "machine" }, { name: "Other", equipment: "machine" }], prefs, budget);
  }
  const say = heldBackNote(budget);
  assert.ok(say, "expected a sentence for the preference that was held back");
  assert.ok(/still in here/.test(say), say);
  assert.ok(say.includes([...budget.held.values()][0].name), "the note has to name the movement");
  assert.equal(heldBackNote(null), null);
  assert.equal(heldBackNote(openWeekBudget(prefs, { slots: 40 })), null, "nothing held, nothing said");
});

test("a preference already honoured costs the week nothing the second time", () => {
  /* The easing in, and the only mechanism there is for it: this engine has no
     week counter. A preference that is no longer changing anything, because the
     replacement is now the lift they train, stops holding a place and the next
     one in the queue gets it. */
  const prefs = learnPreferences({ swaps: manySwaps(["A", "B"], HARD_AT) });
  const budget = { ...openWeekBudget(prefs, { slots: 3 }), cap: 1 };
  applyPreferences([{ name: "A", equipment: "barbell" }, { name: "Alt A", equipment: "barbell" }], prefs, budget);
  assert.equal(budget.active.size, 1);
  /* A second slot where the avoided lift was never the top candidate anyway. */
  const free = applyPreferences([{ name: "Alt A", equipment: "barbell" }, { name: "A", equipment: "barbell" }], prefs, budget);
  assert.equal(free[0].name, "Alt A");
  assert.equal(budget.active.size, 1, "a preference that changed nothing must not spend a place");
});

test("the equipment nudge is inside the cap, because it can move a movement", () => {
  /* It was outside it in the first version and a dumbbell skew alone turned
     three bodyweight movements into dumbbell ones under a cap that believed it
     had let two preferences through. */
  const prefs = learnPreferences({
    swaps: [1, 2, 3].map((d) => ({
      entry_date: day(-d * 5), planned_exercise: "Barbell Bench Press", chosen_exercise: "Dumbbell Bench Press",
    })),
  });
  assert.equal(prefs.equipmentBias.equipment, "dumbbell");
  const budget = { ...openWeekBudget(prefs, { slots: 3 }), cap: 0 };
  const pool = [{ name: "Push-Up", equipment: "none" }, { name: "Dumbbell Fly", equipment: "dumbbell" }];
  assert.equal(applyPreferences(pool, prefs, budget)[0].name, "Push-Up", "no room left, so the nudge waits too");
  assert.ok(!actedOn(budget).length);
});

test("actedOn names movements and never the equipment sentinel", () => {
  const prefs = learnPreferences({
    swaps: [1, 2, 3].map((d) => ({
      entry_date: day(-d * 5), planned_exercise: "Barbell Bench Press", chosen_exercise: "Dumbbell Bench Press",
    })),
  });
  const budget = openWeekBudget(prefs, { slots: 20 });
  applyPreferences([{ name: "Push-Up", equipment: "none" }, { name: "Dumbbell Fly", equipment: "dumbbell" }], prefs, budget);
  for (const n of actedOn(budget)) assert.ok(/^[A-Za-z]/.test(n), `actedOn returned ${JSON.stringify(n)}`);
  assert.equal(actedOn(null).length, 0);
});

test("one loud signal is never the thing that gets capped", () => {
  /* The cap exists for the person with eight preferences, not the person with
     one. A single hard avoid must still come out of the plan on any week. */
  const prefs = learnPreferences({ swaps: manySwaps(["Leg Press"], HARD_AT) });
  for (const slots of [6, 10, 15, 22, 26]) {
    const budget = openWeekBudget(prefs, { slots });
    const got = applyPreferences(
      [{ name: "Leg Press", equipment: "machine" }, { name: "Hack Squat", equipment: "machine" }], prefs, budget,
    );
    assert.equal(got[0].name, "Hack Squat", `a lone hard avoid was held back on a ${slots} slot week`);
    assert.equal(budget.held.size, 0);
  }
});

/* =========================================================================
 * plateau-response.mjs
 * ========================================================================= */

test("plateau response waits under four weeks flat", () => {
  const plateau = { lifts: [{ name: "Bench Press", sessions: 6, weeksFlat: 2, weightLb: 135 }] };
  const r = planPlateauResponse({ plateau, stillLinear: false, confidence: "high" });
  assert.equal(r.responses[0].action, "wait");
});

test("plateau response waits for a beginner under eight weeks flat", () => {
  const plateau = { lifts: [{ name: "Bench Press", sessions: 5, weeksFlat: 6, weightLb: 95 }] };
  const r = planPlateauResponse({ plateau, stillLinear: true, confidence: "high" });
  assert.equal(r.responses[0].action, "wait");
});

test("plateau response deloads the lift when calibration says too heavy for it", () => {
  const plateau = { lifts: [{ name: "Squat", sessions: 10, weeksFlat: 10, weightLb: 225 }] };
  const calibration = { byExercise: { squat: { verdict: "too-heavy" } }, overall: null };
  const r = planPlateauResponse({ plateau, stillLinear: false, confidence: "high", calibration });
  assert.equal(r.responses[0].action, "deload-lift");
});

test("plateau response uses the rep range for a strength goal with a short stall", () => {
  const plateau = { lifts: [{ name: "Deadlift", sessions: 8, weeksFlat: PLATEAU_RESPONSE.shortStallWeeks - 1, weightLb: 275 }] };
  const r = planPlateauResponse({ plateau, stillLinear: false, confidence: "high", goal: { bubble: "get-stronger" } });
  assert.equal(r.responses[0].action, "rep-range");
});

test("plateau response rotates otherwise", () => {
  const plateau = { lifts: [{ name: "Leg Press", sessions: 10, weeksFlat: PLATEAU_RESPONSE.rotateFromWeeks, weightLb: 400 }] };
  const r = planPlateauResponse({ plateau, stillLinear: false, confidence: "high" });
  assert.equal(r.responses[0].action, "rotate");
});

test("plateau response cuts volume in the summary for three or more stalls", () => {
  const plateau = { lifts: ["Bench Press", "Squat", "Row"].map((name) => ({ name, sessions: 10, weeksFlat: 10, weightLb: 200 })) };
  const r = planPlateauResponse({ plateau, stillLinear: false, confidence: "high" });
  assert.equal(r.summary.action, "volume-cut");
  assert.ok(r.summary.say);
});

test("volume-cut is not emitted when calibration overall is back-off", () => {
  const plateau = { lifts: ["Bench Press", "Squat", "Row"].map((name) => ({ name, sessions: 10, weeksFlat: 10, weightLb: 200 })) };
  const calibration = { byExercise: {}, overall: "back-off" };
  const r = planPlateauResponse({ plateau, stillLinear: false, confidence: "high", calibration });
  assert.notEqual(r.summary.action, "volume-cut");
});

test("every plateau response has a non empty say", () => {
  const plateau = { lifts: [
    { name: "Bench Press", sessions: 10, weeksFlat: PLATEAU_RESPONSE.rotateFromWeeks, weightLb: 200 },
    { name: "Squat", sessions: 10, weeksFlat: PLATEAU_RESPONSE.shortStallWeeks - 1, weightLb: 300 },
  ] };
  const r = planPlateauResponse({ plateau, stillLinear: false, confidence: "high", goal: { bubble: "get-stronger" } });
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

/* Asserted in pounds, never as a factor. The bug this replaces was a 1.025
   multiplier that a factor assertion passed happily while no curl in the product
   ever got heavier, so these check the weight a person is handed. */
const easyRows = (name, weight, reps = 10) => [day(-1), day(-4)].map((d) => ({
  entry_date: d, exercise: name,
  planned: { sets: 3, reps, targetWeight: weight }, actual: { sets: 3, reps, weight },
}));

/* What the person actually sees next session: the calibrated factor applied to
   the weight they are on and snapped to the rack, which is the whole round trip
   through load.mjs that the old percentage silently lost. */
const nextWeight = (rows, weight) => {
  const c = calibrateExercise(rows);
  return { verdict: c.verdict, weight: roundLoad(weight * c.nextLoadFactor) };
};

test("calibrateExercise moves an isolation lift by the step the research names, not by a percentage", () => {
  /* knowledge/principles/progressive-overload.md: "Typical jump is 2.5-10lb
     depending on the lift (small joints/isolation moves get smaller jumps than
     squat/deadlift/bench)." A 20 lb curl goes to 22.5, and the point is that it
     goes anywhere at all: under the old 1.025 it stayed at 20 forever. */
  for (const [name, from, to] of [
    ["Barbell Curl", 15, 17.5],
    ["Barbell Curl", 20, 22.5],
    ["Barbell Curl", 25, 27.5],
    ["Lateral Raise", 15, 17.5],
    ["Tricep Pushdown", 30, 32.5],
  ]) {
    const r = nextWeight(easyRows(name, from), from);
    assert.equal(r.verdict, "too-easy");
    assert.equal(r.weight, to, `${name} at ${from} should go to ${to}, got ${r.weight}`);
    assert.equal(r.weight - from, STEP_ISOLATION);
  }

  /* Above 40 lb the rack itself is on a 5 lb grid, so a 2.5 lb step would round
     back to where it started. The step follows the grid rather than vanishing
     into it, and 5 lb is still inside the range the research allows. */
  const heavy = nextWeight(easyRows("Cable Curl", 45), 45);
  assert.equal(heavy.weight, 50);
});

test("calibrateExercise moves a compound by its own larger step", () => {
  const bench = nextWeight(easyRows("Bench Press", 135, 8), 135);
  assert.equal(bench.verdict, "too-easy");
  assert.equal(bench.weight - 135, STEP_COMPOUND);

  const dl = nextWeight(easyRows("Deadlift", 225, 5), 225);
  assert.equal(dl.weight - 225, STEP_HEAVY);

  /* A small joint and a deadlift must not advance by the same number. */
  assert.ok(STEP_ISOLATION < STEP_COMPOUND && STEP_COMPOUND < STEP_HEAVY);
});

test("stepFor never hands a beginner a step that is a fifth of the lift", () => {
  /* 10 lb onto a 45 lb goblet squat is not progressive overload, it is a jump.
     The absolute step is the mechanism and the percentage is only a ceiling. */
  assert.equal(stepFor("Goblet Squat", 45), 5);
  assert.equal(stepFor("Back Squat", 225), STEP_HEAVY);
});

test("calibrateExercise leaves bodyweight work alone rather than adding 2.5 lb to nothing", () => {
  const rows = [day(-1), day(-4)].map((d) => ({
    entry_date: d, exercise: "Push-Up",
    planned: { sets: 3, reps: 12, targetWeight: 0 }, actual: { sets: 3, reps: 12, weight: 0 },
  }));
  const r = calibrateExercise(rows);
  assert.equal(r.verdict, "too-easy");
  assert.equal(r.nextLoadStep, 0);
  assert.equal(r.nextLoadFactor, 1);
  assert.equal(roundLoad(0 * r.nextLoadFactor), 0);
});

test("calibrateExercise verdicts too-heavy at the back-off factor", () => {
  const rows = [
    { entry_date: day(-1), exercise: "Squat", planned: { sets: 3, reps: 8, targetWeight: 225 }, actual: { sets: 2, reps: 8, weight: 225 } },
    { entry_date: day(-4), exercise: "Squat", planned: { sets: 3, reps: 8, targetWeight: 225 }, actual: { sets: 3, reps: 8, weight: 225 } },
  ];
  const r = calibrateExercise(rows);
  assert.equal(r.verdict, "too-heavy");
  assert.equal(roundLoad(225 * r.nextLoadFactor), 215);

  /* The back-off had the same disease as the push: 0.95 of a 25 lb curl is
     23.75, which rounds straight back to 25, so nothing came off the bar. */
  const curl = [
    { entry_date: day(-1), exercise: "Barbell Curl", planned: { sets: 3, reps: 10, targetWeight: 25 }, actual: { sets: 1, reps: 10, weight: 25 } },
    { entry_date: day(-4), exercise: "Barbell Curl", planned: { sets: 3, reps: 10, targetWeight: 25 }, actual: { sets: 3, reps: 10, weight: 25 } },
  ];
  const c = calibrateExercise(curl);
  assert.equal(c.verdict, "too-heavy");
  assert.equal(roundLoad(25 * c.nextLoadFactor), 22.5);
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
  for (const key of ["experience", "confidence", "days", "dayName", "source", "goalSource", "focus", "limits"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(r1.meta, key), `meta missing ${key}`);
  }
  const r2 = generateFromPayload({ goal: "some junk goal that matches nothing at all" });
  assert.ok(r2.workout.exercises.length >= 3 && r2.workout.exercises.length <= 6);
});

/* The edge function's payload bound slices `logs` and never looks inside a row,
   so the shape of every field in one is whatever the caller typed. The fuzz run
   of 2026-09-12 turned three of them into a 500 rather than a plan: a numeric
   exercise_name off `.toLowerCase`, a numeric entry_date off `.localeCompare`,
   and a current_weight of 1e-9 off a Date built from a rate of zero. `history`,
   `plans` and `swaps` already skipped a row they could not read, and this is the
   same answer rather than a fourth one. Asserted on the workout that comes back,
   because a degraded plan is the outcome and not-throwing is only half of it. */
test("a log row the engine cannot read is skipped, not fatal", () => {
  const good = { entry_date: "2026-09-08", exercise_name: "Barbell Bench Press", sets: 3, reps: 8, weight: 135 };
  const rows = {
    "a numeric name": { ...good, exercise_name: 42 },
    "a name that is an object": { ...good, exercise_name: { id: 3 } },
    "a numeric date": { ...good, entry_date: 20260908 },
    "no date at all": { ...good, entry_date: null },
  };
  for (const [what, row] of Object.entries(rows)) {
    /* Two rows of the same movement, because the date sort that broke only runs
       once a lift has been done more than once. */
    const r = generateFromPayload({ goal_bubble: "build-muscle", current_weight: 180, sex: "Male", logs: [row, { ...row }] });
    assert.ok(r.workout.exercises.length >= 3, `${what} gave ${r.workout.exercises.length} exercises`);
    for (const e of r.workout.exercises) {
      assert.equal(typeof e.targetWeight, "number", `${what}: ${e.name} targetWeight ${e.targetWeight}`);
      assert.ok(Number.isFinite(e.targetWeight), `${what}: ${e.name} targetWeight ${e.targetWeight}`);
    }
  }
  /* And the readable row beside an unreadable one still counts: skipping is not
     the same as throwing the history away. */
  const mixed = generateFromPayload({
    goal_bubble: "build-muscle", current_weight: 180, sex: "Male",
    logs: [{ ...good, exercise_name: 42 }, good],
  });
  const bench = mixed.workout.exercises.find((e) => e.name === "Barbell Bench Press");
  if (bench) assert.equal(bench.targetWeight, 135);
});

test("a bodyweight of almost nothing gives a plan instead of an invalid date", () => {
  const r = generateFromPayload({ goal: "Build muscle", goal_detail: "I want to lose 20 lb by June", current_weight: 1e-9 });
  assert.ok(r.workout.exercises.length >= 3);
  assert.ok(r.workout.exercises.every((e) => Number.isFinite(e.targetWeight)));
});

/* Same rows, one layer down, because deriveTrainingAge reads them first and is
   what actually threw. An unreadable row must change no measured number it is
   not genuinely part of. */
test("deriveTrainingAge reads past a row it cannot use", () => {
  const usable = Array.from({ length: 8 }, (_, i) => ({
    entry_date: `2026-08-${String(10 + i).padStart(2, "0")}`, exercise_name: "Barbell Bench Press", weight: 135, sets: 3, reps: 8,
  }));
  const clean = deriveTrainingAge({ logs: usable, today: new Date(2026, 8, 10) });
  const dirty = deriveTrainingAge({
    logs: [...usable, null, undefined, 42, "a row", { entry_date: 20260901, exercise_name: 7, weight: 100 }],
    today: new Date(2026, 8, 10),
  });
  assert.equal(dirty.sessions, clean.sessions + 1);   // the numeric date is a real day, once it is text
  assert.equal(dirty.effectiveSessions, clean.effectiveSessions + 1);
  assert.equal(dirty.stillLinear, clean.stillLinear);
  assert.equal(typeof dirty.plateau.stalled, "boolean");
});

test("focusDayIndex picks a push day when one exists and falls back to -1 otherwise", () => {
  const withPush = buildPlan({ goal: { bubble: "build-muscle", child: "build-overall" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 5 }, logs: [] });
  const pushIndex = focusDayIndex(withPush, "push", { from: 0 });
  assert.ok(pushIndex >= 0);
  assert.ok(withPush.week[pushIndex].name.toLowerCase().includes("push"));

  /* A three day week is full body, so there is no push day to find. */
  const fullBody = buildPlan({ goal: { bubble: "consistent", child: "keep-quitting" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 }, logs: [] });
  const noPush = focusDayIndex(fullBody, "push", { from: 1 });
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
  const result = planPlateauResponse({ plateau, stillLinear: false, confidence: "high" });
  assert.equal(result.responses[0].action, "rotate");
  const fallenBack = applyRotateFallback(result, ["Leg Press"], { plateau });
  assert.equal(fallenBack.responses[0].action, "rep-range");
  assert.equal(fallenBack.responses[0].exercise, "Leg Press");
});

test("applyRotateFallback is a no-op when nothing named was actually rotating", () => {
  const plateau = { lifts: [{ name: "Bench Press", sessions: 6, weeksFlat: 2, weightLb: 135 }] };
  const result = planPlateauResponse({ plateau, stillLinear: false, confidence: "high" });
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
  const plan = buildPlan({ goal: { bubble: "build-muscle", child: "build-overall" }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 5 }, logs });
  assert.equal(plan.week.map((d) => d.name).join(","), "Push day,Pull day,Leg day,Upper body,Lower body");
  // The last completed plan was the last day, so naive rotation wraps to Push,
  // which is exactly the muscle group a real session hit yesterday.
  const plans = [{ entry_date: day(-1), focus: "Lower body", completed_at: day(-1) + "T18:00:00Z", exercises: [] }];
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
  const plan = buildPlan({ goal: { bubble: "build-muscle", child: "build-overall" }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 5 }, logs });
  const plans = [{ entry_date: day(-1), focus: "Lower body", completed_at: day(-1) + "T18:00:00Z", exercises: [] }];
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
  const block = pickBlock({ kind: "dynamic", groups: ["quads", "hamstrings", "glutes"], budgetSec: WARMUP_SECONDS });
  assert.ok(block.length >= MIN_MOVES && block.length <= MAX_MOVES);
  for (const m of block) assert.equal(m.kind, "dynamic");
  const byName = new Map(STRETCH_ALL.map((e) => [e.name, e]));
  const covered = new Set(block.flatMap((m) => byName.get(m.name).primary));
  for (const g of ["quads", "hamstrings", "glutes"]) assert.ok(covered.has(g), `covers ${g}`);
});

test("pickBlock respects the budget once the floor is met, and is deterministic", () => {
  const a = pickBlock({ kind: "static", groups: ["chest", "lats", "shoulders", "biceps", "triceps"], budgetSec: COOLDOWN_SECONDS });
  const b = pickBlock({ kind: "static", groups: ["chest", "lats", "shoulders", "biceps", "triceps"], budgetSec: COOLDOWN_SECONDS });
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
    const block = pickBlock({ kind, groups: MUSCLE_GROUPS, budgetSec: 3600, hurts: ["knee"] });
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

/* ---- the warm-up prepares the movements, not just the muscles (research/13) ---- */

/* Enough dated sessions that training-age stops saying beginner, which is what
   puts the week on a push/pull/legs split instead of full body. Spread three a
   week so sessionsPerWeek reads honestly rather than as one huge block. */
function manySessions(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const back = 2 + Math.floor(i / 3) * 7 + (i % 3) * 2;
    for (const name of ["Barbell Bench Press", "Barbell Back Squat", "Lat Pulldown"]) {
      out.push({ entry_date: day(-back), exercise_name: name, sets: 3, reps: 8, weight: 135 + Math.round(i / 6) * 5 });
    }
  }
  return out;
}

test("every dynamic and mobility move declares which movement patterns it prepares", () => {
  const PATTERNS = ["squat", "hinge", "lunge", "horizontalPush", "verticalPush", "horizontalPull", "verticalPull", "core", "isolation"];
  const cov = {};
  for (const p of PATTERNS) cov[p] = 0;
  for (const c of STRETCH_LIB.categories) {
    for (const e of c.exercises) {
      if (c.key === "static") { assert.ok(!e.prepares, `${e.name} is static and must not declare prepares`); continue; }
      assert.ok(Array.isArray(e.prepares), `${e.name} declares prepares`);
      for (const p of e.prepares) assert.ok(PATTERNS.includes(p), `${e.name} pattern ${p}`);
      if (c.key === "dynamic") for (const p of e.prepares) cov[p]++;
    }
  }
  /* Three deep on every pattern, so a week never has to repeat a warm-up move
     and a limit can remove one without emptying the pattern. */
  for (const p of PATTERNS) assert.ok(cov[p] >= 3, `${p} is prepared by only ${cov[p]} dynamic moves`);
});

test("every day plan.mjs builds says which movement patterns it is made of", () => {
  const plan = buildPlan({ goal: { bubble: "get-stronger", child: null }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 3 }, logs: manySessions(80) });
  for (const d of plan.week) {
    assert.ok(Array.isArray(d.mainPatterns) && d.mainPatterns.length > 0, `${d.name} mainPatterns`);
    assert.ok(Array.isArray(d.allPatterns) && d.allPatterns.length >= d.mainPatterns.length, `${d.name} allPatterns`);
    for (const p of d.mainPatterns) assert.ok(d.allPatterns.includes(p), `${d.name}: ${p} is in allPatterns too`);
  }
});

test("a push day and a leg day do not get the same warm-up any more", () => {
  /* Five days rather than three, because three is a full body week now for
     everybody and this test is about what a push day's warm-up does that a leg
     day's does not. */
  const plan = buildPlan({ goal: { bubble: "build-muscle", child: "build-overall" }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 5 }, logs: manySessions(80) });
  const names = plan.week.slice(0, 3).map((d) => d.name);
  assert.deepEqual(names, ["Push day", "Pull day", "Leg day"], "the fixture really is a push/pull/legs split");
  const [push, pull, legs] = plan.week.slice(0, 3).map((d) => d.mobility.warmup.map((m) => m.name));
  const overlap = (a, b) => a.filter((n) => b.includes(n)).length;
  assert.ok(overlap(push, legs) <= 1, `push and legs share ${overlap(push, legs)} warm-up moves: ${push.join(", ")} vs ${legs.join(", ")}`);
  assert.ok(overlap(pull, legs) <= 2, `pull and legs share ${overlap(pull, legs)}`);
  /* And each day's warm-up actually serves that day's main movements. */
  for (const d of plan.week) {
    const wanted = new Set(d.mainPatterns);
    const served = d.mobility.warmup.filter((m) => (m.prepares || []).some((p) => wanted.has(p))).length;
    assert.ok(served >= 2, `${d.name}: only ${served} warm-up moves prepare ${[...wanted].join("/")}`);
  }
});

test("a leg day warm-up is not filled with arm moves once its own patterns are covered", () => {
  const plan = buildPlan({ goal: { bubble: "build-muscle", child: "build-overall" }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 5 }, logs: manySessions(80) });
  const legs = plan.week.find((d) => d.name === "Leg day");
  const UPPER_ONLY = ["verticalPush", "horizontalPush", "verticalPull", "horizontalPull"];
  for (const m of legs.mobility.warmup) {
    const prep = m.prepares || [];
    const upperOnly = prep.length > 0 && prep.every((p) => UPPER_ONLY.includes(p) || p === "isolation");
    assert.ok(!upperOnly, `${m.name} (${prep.join("/")}) is upper-body prep on a leg day`);
  }
});

test("avoid gives a genuinely different version of the same day, and never empties a slot", () => {
  const base = { goal_bubble: "build-muscle", challenge_target: 3, current_weight: 190, sex: "Male", logs: manySessions(80), focus: "Pull" };
  const today = new Date("2026-09-11T12:00:00");
  const first = generateFromPayload(base, { today });
  const names = first.workout.exercises.map((e) => e.name);
  assert.ok(names.length >= 3, "the first answer is a real day");

  /* Same day type, different exercises. This is the Regenerate on a plan you
     are looking at: "give me another back day", not "give me another day". */
  const second = generateFromPayload({ ...base, avoid: names }, { today });
  assert.equal(second.workout.focus, first.workout.focus, "same day type");
  const repeated = second.workout.exercises.filter((e) => names.includes(e.name));
  assert.equal(repeated.length, 0, `repeated ${repeated.map((e) => e.name).join(", ")}`);
  assert.ok(second.workout.exercises.length >= 3, "and it is still a full day");

  /* Accumulating walks the library rather than ping-ponging between two. */
  const seen = [...names];
  for (let i = 0; i < 3; i++) {
    const next = generateFromPayload({ ...base, avoid: [...seen] }, { today });
    for (const e of next.workout.exercises) {
      assert.ok(!seen.includes(e.name), `${e.name} came back after being avoided`);
      seen.push(e.name);
    }
  }

  /* Avoid the entire library and the slot keeps its best candidate rather than
     coming back empty: a hole in the week is worse than a repeat. */
  const everything = TRAININGS.flatMap((t) => t.categories.flatMap((c) => c.exercises.map((e) => e.name)));
  const cornered = generateFromPayload({ ...base, avoid: everything }, { today });
  assert.ok(cornered.workout.exercises.length >= 3, "still a day when everything is excluded");
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

/* ---------- audit of 2026-09-10: the sweep's findings, pinned ---------- */

test("asking for a focus never deletes that group's work from the week (time trim keeps priority accessories)", () => {
  /* The sweep's reproduction: get-stronger, 5 days, arms focus. Before the fix
     both arm lifts went to five sets, the day crossed the time tolerance, and
     the drop lever removed the triceps isolation on both upper days. */
  const base = { goal_bubble: "get-stronger", challenge_target: 5, current_weight: 180, sex: "Male" };
  const today = new Date("2026-09-10T12:00:00");
  const without = generateFromPayload(base, { today, includePlan: true });
  const withArms = generateFromPayload({ ...base, focus_groups: ["biceps", "triceps"] }, { today, includePlan: true });
  for (const g of ["biceps", "triceps"]) {
    const before = without.plan.weeklyVolume[g]?.sets ?? 0;
    const after = withArms.plan.weeklyVolume[g]?.sets ?? 0;
    assert.ok(after >= before, `${g}: ${before} sets without focus, ${after} with`);
    assert.ok(after > 0, `${g} still has work in the week`);
  }
  for (const d of withArms.plan.week) {
    for (const e of d.exercises) if (e.priority) assert.ok(e.sets >= 2, `${e.name} on ${d.name} kept its sets`);
  }
});

test("an exercise is credited to the slot's group it was chosen for, not its library row's first primary", () => {
  /* The sweep's reproduction: lose-weight, 2 days, glutes focus, 6 months of
     history gave a Push day reading chest three times because an incline press
     picked for the shoulders slot was recorded as chest. */
  const today = new Date("2026-09-10T12:00:00");
  const logs = [];
  for (let w = 26; w >= 1; w--) for (const n of ["Barbell Bench Press", "Lat Pulldown", "Barbell Back Squat"]) logs.push({ entry_date: day(-w * 7), exercise_name: n, sets: 3, reps: 8, weight: 135 });
  const out = generateFromPayload({ goal_bubble: "lose-weight", challenge_target: 2, sex: "Female", current_weight: 150, focus_groups: ["glutes"], logs }, { today, includePlan: true });
  for (const d of out.plan.week) {
    const counts = {};
    for (const e of d.exercises) counts[e.group] = (counts[e.group] || 0) + 1;
    for (const [g, n] of Object.entries(counts)) assert.ok(n <= 2, `${d.name} credits ${g} ${n} times: ${d.exercises.map((e) => e.name + "[" + e.group + "]").join(", ")}`);
  }
  /* And across every day the engine builds for a plain week, no group is
     credited three times on one day. */
  const plain = buildPlan({ goal: { bubble: "build-muscle", child: null }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 4 }, logs: [] });
  for (const d of plain.week) {
    const counts = {};
    for (const e of d.exercises) counts[e.group] = (counts[e.group] || 0) + 1;
    assert.ok(Math.max(...Object.values(counts)) <= 2, `${d.name}: ${JSON.stringify(counts)}`);
  }
});

test("a short bodyweight-only day still reaches the four exercise floor when the library allows it", () => {
  /* The sweep's reproduction: lose-weight, 5 days asked, 3 weeks of logs (so
     capacity shortens the tail days), no equipment. Before the fix the short
     leg day came back with two exercises because unfillable slots counted
     against the floor. */
  const today = new Date("2026-09-10T12:00:00");
  /* Three sessions a week for four weeks, on distinct dates: observedCapacity
     needs eight effective sessions before it will say anything, and then it
     says "about 3", which against five asked shortens the last two days. */
  const logs = [];
  for (let w = 4; w >= 1; w--) for (const s of [0, 2, 4]) {
    const date = day(-(w * 7 + s));
    for (const n of ["Bodyweight Squat", "Push-Up", "Inverted Row"]) logs.push({ entry_date: date, exercise_name: n, sets: 3, reps: 10, weight: 0 });
  }
  const out = generateFromPayload({ goal_bubble: "lose-weight", challenge_target: 5, sex: "Female", current_weight: 150, logs, limits: { hurts: [], missing: ["none"] } }, { today, includePlan: true });
  const shortDays = out.plan.week.filter((d) => d.short);
  assert.ok(shortDays.length > 0, "the scenario produces at least one short day");
  for (const d of out.plan.week) assert.ok(d.exercises.length >= 3, `${d.name} has ${d.exercises.length}`);
  /* "When the library allows it": a short day gets min(floor, what the full
     day could fill). A bodyweight leg day has fewer fillable slots than four,
     and that is the library's honest limit, not the floor failing. The same
     person with no shortening is the reference. */
  const full = generateFromPayload({ goal_bubble: "lose-weight", challenge_target: 5, sex: "Female", current_weight: 150, logs: [], limits: { hurts: [], missing: ["none"] } }, { today, includePlan: true });
  for (const d of shortDays) {
    const ref = full.plan.week.find((x) => x.focus === d.focus);
    const want = Math.min(4, ref.exercises.length);
    assert.equal(d.exercises.length, want, `${d.name} short day has ${d.exercises.length}, the full day fills ${ref.exercises.length}`);
  }
});

test("a day count the goal will not honour is said out loud in the notes", () => {
  const out = generateFromPayload({ goal_bubble: "build-muscle", challenge_target: 6, current_weight: 190, sex: "Male" }, { includePlan: true });
  assert.ok(out.meta.days < 6, "no goal allows six today, so this asks for the clamp");
  assert.ok(Array.isArray(out.notes));
  assert.ok(out.notes.some((n) => /asked for 6 days/.test(n)), out.notes.join(" | "));
  assert.deepEqual(out.notes, out.plan.dayNotes, "notes are the plan's own dayNotes, nothing filtered");
  const fine = generateFromPayload({ goal_bubble: "build-muscle", challenge_target: 4, current_weight: 190, sex: "Male" });
  assert.ok(!fine.notes.some((n) => /asked for/.test(n)), "an honoured count says nothing about it");
});

test("the rest the engine budgeted reaches the app on every exercise", () => {
  const out = generateFromPayload({ goal_bubble: "get-stronger", challenge_target: 3, current_weight: 200, sex: "Male" }, { includePlan: true });
  const day = out.plan.week.find((d) => d.name === out.workout.focus);
  for (const e of out.workout.exercises) {
    assert.ok(Number.isInteger(e.restSec) && e.restSec > 0, `${e.name} restSec ${e.restSec}`);
    const built = day.exercises.find((x) => x.name === e.name);
    if (built) assert.equal(e.restSec, built.restSec);
  }
  /* Strength rests are long, which is the whole point of sending the number. */
  assert.ok(out.workout.exercises.some((e) => e.restSec >= 120), "a strength day carries at least one long rest");
});

test("recovery reads the real end of a session when the rows carry a clock", () => {
  /* Same session, two clocks. Logged at 07:00 it is ready by 07:00 the next
     day plus 24h; logged at 22:00 it is still held at the same moment. The
     18:00 assumption only applies to rows with no timestamp at all. */
  const at = (h) => [
    { entry_date: day(-1), exercise_name: "Barbell Bench Press", sets: 4, reps: 8, weight: 185, created_at: day(-1) + `T${h}:00:00` },
    { entry_date: day(-1), exercise_name: "Machine Shoulder Press", sets: 3, reps: 10, weight: 60, created_at: day(-1) + `T${h}:30:00` },
  ];
  const probe = new Date(Date.parse(day(0) + "T09:00:00"));
  const morning = muscleRecoveryStates({ logs: at("07"), muscleIndex: MUSCLE_INDEX, today: probe });
  const night = muscleRecoveryStates({ logs: at("22"), muscleIndex: MUSCLE_INDEX, today: probe });
  assert.equal(morning.get("chest").state, "ok", "07:30 yesterday to 09:00 today is 25.5h");
  assert.equal(night.get("chest").state, "hold", "22:30 yesterday to 09:00 today is 10.5h");
  const bare = muscleRecoveryStates({ logs: at("07").map(({ created_at, ...l }) => l), muscleIndex: MUSCLE_INDEX, today: probe });
  assert.equal(bare.get("chest").state, "hold", "no clock: assumed 18:00, 15h ago");
});

test("stripMobility empties the two arrays and leaves every other key alone", () => {
  const w = { focus: "Push day", exercises: [{ name: "x" }], warmup: [{ name: "a" }], cooldown: [{ name: "b" }] };
  const s = stripMobility(w);
  assert.deepEqual(s, { focus: "Push day", exercises: [{ name: "x" }], warmup: [], cooldown: [] });
  assert.deepEqual(w.warmup, [{ name: "a" }], "input not mutated");
});

/* ------------------------------------------------------------------ *
 * More than one goal: one primary, up to two secondaries
 * ------------------------------------------------------------------ */

/* The test that protects everybody who already has a row in profiles. Every
   existing user has one bubble and one child and nothing else, and the plan
   they get has to be the plan they got yesterday, to the byte. */
test("a single bubble and child produce exactly the plan they always did", () => {
  const base = {
    goal_bubble: "build-muscle", goal_child: "build-a-part", challenge_target: 4,
    current_weight: 180, sex: "Male",
  };
  const today = new Date("2026-09-12T12:00:00Z");
  const plain = JSON.stringify(generateFromPayload(base, { today, includePlan: true }));
  /* Every way a client can fail to send a second goal, including the shapes a
     jsonb column round trips as and an entry the tree has never heard of. */
  for (const extra of [undefined, null, [], "[]", "not json", {}, [null], [{ bubble: "not-a-bubble" }], [{ child: "abs" }]]) {
    const out = generateFromPayload({ ...base, goal_secondary: extra }, { today, includePlan: true });
    assert.equal(JSON.stringify(out), plain, `goal_secondary: ${JSON.stringify(extra) ?? "undefined"}`);
  }
});

test("resolveGoal with no secondary returns the goal table's own parameters", () => {
  const r = resolveGoal({ bubble: "get-stronger", child: "strong-a-lift" });
  assert.deepEqual(r.params, { ...GOAL_PARAMS["get-stronger"]["strong-a-lift"], priority: [] });
  assert.deepEqual(r.secondary, []);
  assert.deepEqual(r.ignoredSecondary, []);
  assert.equal(r.mobilityChild, null);
});

test("a secondary goal adds priority muscles and moves no parameter", () => {
  const solo = resolveGoal({ bubble: "build-muscle", child: "build-overall" });
  const both = resolveGoal({
    bubble: "build-muscle", child: "build-overall",
    secondary: [{ bubble: "tone-lean-abs", child: "abs" }],
  });
  assert.deepEqual(both.params.repRange, solo.params.repRange);
  assert.equal(both.params.restSec, solo.params.restSec);
  assert.equal(both.params.setsFactor, solo.params.setsFactor);
  assert.equal(both.params.sessionMin, solo.params.sessionMin);
  assert.deepEqual(both.dayRange, solo.dayRange);
  assert.deepEqual(both.params.priority, ["abs", "obliques"]);
  assert.deepEqual(both.secondary[0].priority, ["abs", "obliques"]);
});

/* The uncomfortable one. Strength as a second goal cannot be honoured: the
   rep range and the rest are the primary's and strength has no priority
   groups, no mobility block and less cardio, so it buys nothing at all. */
test("a secondary that contributes nothing says so, in the plan's own notes", () => {
  const r = resolveGoal({
    bubble: "lose-weight", child: "lose-a-number",
    secondary: [{ bubble: "get-stronger", child: "strong-a-lift" }],
  });
  assert.deepEqual(r.params.repRange, GOAL_PARAMS["lose-weight"]["lose-a-number"].repRange);
  assert.deepEqual(r.secondary[0].effect, []);

  const plan = buildPlan({
    goal: { bubble: "lose-weight", child: "lose-a-number", secondary: [{ bubble: "get-stronger", child: "strong-a-lift" }] },
    person: { bodyWeightLb: 180, sex: "Male", daysAsked: 4 },
  });
  assert.ok(plan.dayNotes.some((n) => n.includes("changed nothing in this plan")), plan.dayNotes.join(" | "));
});

/* Mo's example, and the reason the single-select note in index.html was only
   half right: build muscle and touch my toes is a rep range plus ten minutes
   of hips and upper back, not two rep ranges. */
test("build muscle and touch my toes keeps the hypertrophy week and adds the mobility block", () => {
  const today = new Date("2026-09-12T12:00:00Z");
  const payload = {
    goal_bubble: "build-muscle", goal_child: "build-overall", challenge_target: 4,
    current_weight: 180, sex: "Male",
    goal_secondary: [{ bubble: "do-a-thing", child: "flexibility" }],
  };
  const out = generateFromPayload(payload, { today, includePlan: true });
  assert.equal(out.plan.goal.params.repRange[0], 6, "still the hypertrophy rep range");
  assert.equal(out.plan.goal.params.restSec, 90);
  assert.equal(out.plan.days, 4, "the day count is the primary's");
  assert.equal(out.meta.stretching.mobilityGoal, true);
  /* The block is budgeted at MOBILITY_GOAL_SECONDS and filled with whole
     moves, so it lands under the budget and well over the ordinary cool-down. */
  assert.ok(out.meta.stretching.cooldownMinutes > COOLDOWN_SECONDS / 60, out.meta.stretching.cooldownMinutes);
  assert.ok(out.meta.stretching.cooldownMinutes <= MOBILITY_GOAL_SECONDS / 60);
  /* Two things, not one: `flexibility` resolves to the health parameter set,
     which prescribes more easy cardio than hypertrophy does, so the cardio
     line rises too and the plan says both out loud. */
  assert.deepEqual(out.meta.goals.secondary[0].effect, [
    "3 cardio sessions a week of about 30 minutes",
    "a ten minute mobility block after the last set",
  ]);
});

test("cardio only ever rises for a secondary, never falls", () => {
  const up = resolveGoal({
    bubble: "build-muscle", child: "build-overall",
    secondary: [{ bubble: "do-a-thing", child: "run-5k" }],
  });
  assert.deepEqual(up.params.cardio, GOAL_PARAMS["do-a-thing"]["run-5k"].cardio);
  assert.equal(up.secondary[0].cardio, true);

  const down = resolveGoal({
    bubble: "do-a-thing", child: "run-5k",
    secondary: [{ bubble: "build-muscle", child: "build-overall" }],
  });
  assert.deepEqual(down.params.cardio, GOAL_PARAMS["do-a-thing"]["run-5k"].cardio);
  assert.equal(down.secondary[0].cardio, false);
});

test("past two extra goals the rest are named rather than quietly dropped", () => {
  const r = resolveGoal({
    bubble: "build-muscle", child: "build-overall",
    secondary: [
      { bubble: "tone-lean-abs", child: "abs" },
      { bubble: "do-a-thing", child: "flexibility" },
      { bubble: "feel-better", child: "pain" },
      /* The same goal twice is one goal, and it does not spend a slot. */
      { bubble: "tone-lean-abs", child: "abs" },
    ],
  });
  assert.equal(r.secondary.length, MAX_SECONDARY_GOALS);
  assert.equal(r.ignoredSecondary.length, 2);
  assert.ok(r.ignoredSecondary[0].why.includes(String(MAX_SECONDARY_GOALS)));
  assert.ok(r.ignoredSecondary[1].why.includes("same goal"));
});

test("the priority list a secondary feeds is capped at five groups", () => {
  const r = resolveGoal({
    bubble: "tone-lean-abs", child: "tone-part",
    secondary: [{ bubble: "feel-better", child: "pain" }],
  });
  assert.equal(r.params.priority.length, 5, "four plus five does not make nine");
  /* Nothing got in, so the goal is told it bought nothing rather than being
     listed as honoured. */
  assert.deepEqual(r.secondary[0].priority, []);
});

test("goal-engine's mobility children are mobility.mjs's mobility children", () => {
  /* Mirrored rather than imported, so this is the drift check. */
  for (const id of MOBILITY_CHILDREN) {
    const r = resolveGoal({ bubble: "build-muscle", child: "build-overall", secondary: [{ bubble: "do-a-thing", child: id }] });
    const viaFeelBetter = resolveGoal({ bubble: "build-muscle", child: "build-overall", secondary: [{ bubble: "feel-better", child: id }] });
    assert.ok(r.mobilityChild === id || viaFeelBetter.mobilityChild === id, `${id} reaches the block`);
  }
});

test("mapGoal takes the secondary list as an array, as a jsonb string, or not at all", () => {
  const asArray = mapGoal({ goal_bubble: "build-muscle", goal_child: "build-overall", goal_secondary: [{ bubble: "tone-lean-abs", child: "abs" }] });
  const asString = mapGoal({ goal_bubble: "build-muscle", goal_child: "build-overall", goal_secondary: JSON.stringify([{ bubble: "tone-lean-abs", child: "abs" }]) });
  assert.deepEqual(asArray.secondary, [{ bubble: "tone-lean-abs", child: "abs" }]);
  assert.deepEqual(asString, asArray);
  /* A child that does not belong to its bubble is dropped and the bubble
     stays, exactly as the primary tap behaves. */
  const wrongChild = mapGoal({ goal_bubble: "build-muscle", goal_secondary: [{ bubble: "tone-lean-abs", child: "first-pullup" }] });
  assert.deepEqual(wrongChild.secondary, [{ bubble: "tone-lean-abs", child: undefined }]);
  assert.ok(!("secondary" in mapGoal({ goal_bubble: "build-muscle" })), "no key at all when nothing survives");
});

test("meta.goals says which goal set the parameters and what the others bought", () => {
  const out = generateFromPayload({
    goal_bubble: "build-muscle", goal_child: "build-overall", challenge_target: 4, current_weight: 180,
    goal_secondary: [{ bubble: "tone-lean-abs", child: "abs" }, { bubble: "get-stronger", child: "strong-a-lift" }],
  }, { today: new Date("2026-09-12T12:00:00Z") });
  assert.deepEqual(out.meta.goals.primary, { bubble: "build-muscle", child: "build-overall", childUsed: "build-overall" });
  assert.equal(out.meta.goals.secondary.length, 2);
  assert.deepEqual(out.meta.goals.secondary[0].priority, ["abs", "obliques"]);
  assert.deepEqual(out.meta.goals.secondary[1].effect, [], "strength as a second goal buys nothing");
  assert.ok(out.meta.focus.applied.includes("abs"), "and the week really prioritises it");
  assert.ok(out.notes.some((n) => n.includes("changed nothing in this plan")));
});

/* The picker in index.html draws this budget as nine cells and works out what
   each tap spends from the tier number alone, because importing a three entry
   table would make the first paint wait on the engine. That mirror is correct
   only while cost IS the tier number, so this is the tripwire: if TIER_COST
   ever stops being the identity, this fails here rather than silently letting
   the picker promise a budget the plan does not honour. */
test("a tier costs its own number, which is what the picker mirrors", () => {
  for (const tier of [TIERS.main, TIERS.secondary, TIERS.light]) {
    assert.equal(TIER_COST[tier], tier, `tier ${tier} must cost ${tier}, index.html spends it that way`);
  }
  assert.equal(FOCUS_BUDGET, 9, "the picker draws exactly this many cells");
  // The old four-group cap, priced at the middle tier, is what the budget replaced.
  assert.equal(4 * TIER_COST[TIERS.secondary], 8, "four yellows fit");
  assert.ok(5 * TIER_COST[TIERS.secondary] > FOCUS_BUDGET, "five do not, same as the old cap");
});

/* ---------- audit of 2026-09-12: finding 1, the weekly target ---------- */

/* The history the sweep uses to reach the top two levels: enough sessions, and
   the weight climbing one step every six of them so nothing reads as a stall. */
function longHistory(weeks) {
  const names = ["Barbell Bench Press", "Barbell Back Squat", "Barbell Row", "Overhead Press",
    "Romanian Deadlift", "Lat Pulldown", "Dumbbell Curl", "Leg Press"];
  const logs = [];
  const total = weeks * 3;
  for (let s = 0; s < total; s++) {
    const back = Math.round((total - 1 - s) * (7 / 3));
    for (let k = 0; k < 4; k++) {
      logs.push({ entry_date: day(-back), exercise_name: names[(s * 4 + k) % names.length], sets: 3, reps: 8, weight: 100 + 5 * Math.floor(s / 6) });
    }
  }
  return logs;
}

test("a weekly target never asks for more sets than the split can physically deliver", () => {
  /* Finding 1. The target used to be the level's number whatever the split was,
     so a three day Push/Pull/Legs week asked 14 triceps sets of one slot that
     tops out at 6 and filed the gap as the plan falling short. 71% of every
     intermediate group and 78% of every advanced one landed under 0.8 of target
     and nothing anywhere overshot, which is a constant being subtracted rather
     than a measurement. */
  const today = new Date("2026-09-10T12:00:00");
  for (const [weeks, days] of [[26, 3], [26, 5], [78, 3], [78, 4], [78, 5]]) {
    const out = generateFromPayload(
      { goal_bubble: "build-muscle", challenge_target: days, current_weight: 195, sex: "Male", logs: longHistory(weeks) },
      { today, includePlan: true },
    );
    for (const [group, v] of Object.entries(out.plan.weeklyVolume)) {
      /* Six sets is the top of the per-session clamp, two on a short day, so
         this is the arithmetic ceiling of the week and not a preference. */
      let deliverable = 0;
      for (const d of out.plan.week) for (const e of d.exercises) if (e.group === group) deliverable += d.short ? 2 : 6;
      assert.ok(v.target <= deliverable, `${days}d ${group}: target ${v.target} over a ceiling of ${deliverable}`);
    }
  }
});

test("a group the split touches once a week says so instead of reporting a shortfall", () => {
  const today = new Date("2026-09-10T12:00:00");
  /* Five days rather than three. Three days is a full body week now, which hits
     every group three times and caps nobody, and that is the fix working rather
     than the test being satisfied: the shortfall this note exists to explain is
     a frequency problem, and a full body week does not have one. */
  const out = generateFromPayload(
    { goal_bubble: "build-muscle", challenge_target: 5, current_weight: 195, sex: "Male", logs: longHistory(78) },
    { today, includePlan: true },
  );
  assert.ok(out.meta.experience.sessions >= 40, "the history reaches the volume the finding is about");
  const capped = out.plan.volumeNotes.frequencyCapped;
  assert.ok(capped.length, "the five day split caps somebody");
  /* Whichever group it is rather than a named one. Which muscles land here moved
     when the volume base stopped being one number for all fourteen: a group now
     carries its own MEV and its own mid-MAV, so the gap between what the week
     asks for and what the split can deliver opens in different places. The
     finding is the shape, not the muscle. */
  const tri = capped.find((c) => c.sessions === 1);
  assert.ok(tri, `something is trained once a week: ${capped.map((c) => `${c.group}:${c.sessions}`).join(" ")}`);
  assert.ok(tri.wanted > tri.target, `the week wanted ${tri.wanted} and aims at ${tri.target}`);
  /* The ledger carries both numbers, so nothing downstream has to guess which
     of the two it is looking at. */
  assert.equal(out.plan.weeklyVolume[tri.group].target, tri.target);
  assert.equal(out.plan.weeklyVolume[tri.group].wanted, tri.wanted);
  /* And it reaches the person rather than only the ledger. */
  assert.ok(out.notes.some((n) => /top out below what the week/.test(n)), "a dayNote says it out loud");
  /* A capped group is not also reported as a shortfall the week could have
     closed: that was the double-counting the finding is about. The one way a
     group can honestly be both is the clock: since the costing of 2026-09-14
     an advanced push day of five lifts at six sets no longer pretends to fit
     61 minutes, so the ladder shaves the last accessory and that group ends
     under the split's own ceiling. Both are then true statements with
     different causes, and the invariant is that "both" only ever means the
     clock took it below what the split could deliver. */
  for (const u of out.plan.volumeNotes.under) {
    const cap = capped.find((c) => c.group === u.group);
    if (!cap) continue;
    assert.ok(u.planned < cap.target,
      `${u.group} is filed as both, so the clock must have taken it under the ${cap.target} the split delivers, not the split itself`);
  }
});

test("no weekly ask goes past the MRV in volume-landmarks.md, focus tiers included", () => {
  /* The focus-tier work left this open: an advanced base of 16 with a red focus
     asks for 28 weekly sets, past every MRV in the table, and the only reason
     nobody was prescribed 28 was the session clamp catching it on the way out.
     The ceiling is now explicit, so it holds whatever the clamp does. */
  const MRV = { chest: 22, lats: 25, shoulders: 24, quads: 20, hamstrings: 18, glutes: 18, biceps: 22, triceps: 20, calves: 22, abs: 20, obliques: 20 };
  const today = new Date("2026-09-10T12:00:00");
  for (const focus of [["chest:3", "triceps:3"], ["lats:3", "biceps:3"], ["quads:3", "glutes:3"]]) {
    for (const days of [2, 3, 4, 5]) {
      const out = generateFromPayload(
        { goal_bubble: "build-muscle", challenge_target: days, current_weight: 195, sex: "Male", logs: longHistory(78), focus_groups: focus },
        { today, includePlan: true },
      );
      for (const [group, v] of Object.entries(out.plan.weeklyVolume)) {
        if (!MRV[group]) continue;
        assert.ok(v.wanted <= MRV[group], `${days}d ${group}: asked for ${v.wanted}, MRV is ${MRV[group]}`);
        assert.ok(v.sets <= MRV[group], `${days}d ${group}: prescribed ${v.sets}, MRV is ${MRV[group]}`);
      }
    }
  }
});

test("the MRV ceiling never takes back the set a focus tier guarantees", () => {
  /* The ceiling caps the boosted week before the divide and sits outside the +1
     guarantee on purpose: an ask past what a week can recover from is a reason
     to stop adding, not a reason to make the colour mean nothing. */
  const today = new Date("2026-09-10T12:00:00");
  const base = { goal_bubble: "build-muscle", challenge_target: 4, current_weight: 195, sex: "Male", logs: longHistory(78) };
  const without = generateFromPayload(base, { today, includePlan: true });
  const withFocus = generateFromPayload({ ...base, focus_groups: ["hamstrings:3", "glutes:3"] }, { today, includePlan: true });
  for (const g of ["hamstrings", "glutes"]) {
    const before = without.plan.weeklyVolume[g]?.sets ?? 0;
    const after = withFocus.plan.weeklyVolume[g]?.sets ?? 0;
    assert.ok(after >= before, `${g}: ${before} sets without the focus, ${after} with, and 18 is its MRV`);
  }
});

/* Boundary audit of 2026-09-19. "Hamstrings/glutes" is one row in
   volume-landmarks.md (MRV 18) and the engine gave each half 18, so the pair
   could ask for 36: the abs/obliques 20+20 error again. The pair now shares
   the row. The bound allows the +1 a focus tier guarantees on each half,
   because that guarantee sits outside every ceiling on purpose. */
test("hamstrings and glutes share the one MRV row the research gives them", () => {
  const today = new Date("2026-09-10T12:00:00");
  for (const days of [3, 4, 5]) {
    for (const focus of [null, ["glutes:3"], ["hamstrings:3", "glutes:3"]]) {
      const out = generateFromPayload(
        { goal_bubble: "build-muscle", challenge_target: days, current_weight: 195, sex: "Male", logs: longHistory(78), ...(focus ? { focus_groups: focus } : {}) },
        { today, includePlan: true },
      );
      const v = out.plan.weeklyVolume;
      const asked = (v.hamstrings?.wanted ?? 0) + (v.glutes?.wanted ?? 0);
      const allowed = 18 + (focus ? focus.length : 0);
      assert.ok(asked <= allowed, `${days}d focus ${JSON.stringify(focus)}: the pair asks for ${asked} against a shared MRV of 18`);
    }
  }
});

/* Traps, forearms and lower back had no MRV row and were uncapped. Each now
   carries its smallest neighbouring row, and a red focus on a five day week is
   the one ask big enough to reach two of them. */
test("traps, forearms and lower back have a weekly ceiling", () => {
  const today = new Date("2026-09-10T12:00:00");
  const rows = { forearms: 22, lowerback: 18, traps: 24 };
  for (const [group, mrv] of Object.entries(rows)) {
    const out = generateFromPayload(
      { goal_bubble: "build-muscle", challenge_target: 5, current_weight: 195, sex: "Male", logs: longHistory(78), focus_groups: [`${group}:3`] },
      { today, includePlan: true },
    );
    const v = out.plan.weeklyVolume[group];
    assert.ok(v, `${group} is not trained on a five day week with a red focus on it`);
    assert.ok(v.wanted <= mrv, `${group} asks for ${v.wanted} against a ceiling of ${mrv}`);
  }
});

/* Safety audit of 2026-09-19. Zero logs, build muscle, four days, 45 minutes
   came to 72 hard sets and the same person at six months to 59; tone-lean-abs
   with six days asked came to 104, biggest day 27. Per muscle every week was
   inside MEV..MRV; nothing read the total. research/09: the first two weeks
   decide whether anybody is still here in twelve. */
const weekSets = (plan) => plan.week.reduce((t, d) => t + d.exercises.reduce((s, e) => s + e.sets, 0), 0);
const biggestDay = (plan) => Math.max(...plan.week.map((d) => d.exercises.reduce((s, e) => s + e.sets, 0)));

test("a first ever week is never bigger than the trained week for the same inputs", () => {
  const person = { bodyWeightLb: 180, sex: "Male", daysAsked: 4, sessionMinutes: 45 };
  const first = buildPlan({ goal: { bubble: "build-muscle" }, person, logs: [] });
  const trained = buildPlan({ goal: { bubble: "build-muscle" }, person, logs: longHistory(26) });
  assert.ok(weekSets(first) <= weekSets(trained), `first week ${weekSets(first)} sets, trained week ${weekSets(trained)}`);
  /* 14 is the cap and the floors (a main at three, an accessory at two) may
     hold a day one or two over it; 16 is the top of the coaching range. */
  assert.ok(biggestDay(first) <= 16, `biggest first-week day is ${biggestDay(first)} sets`);
  assert.ok(!trained.dayNotes.some((n) => /held to about \d+ hard sets/.test(n)), "the cap is never spoken to somebody it does not apply to");
});

test("six days of tone-lean-abs with no history is not 104 sets", () => {
  const person = { bodyWeightLb: 180, sex: "Male", daysAsked: 6 };
  const first = buildPlan({ goal: { bubble: "tone-lean-abs" }, person, logs: [] });
  const trained = buildPlan({ goal: { bubble: "tone-lean-abs" }, person, logs: longHistory(26) });
  assert.ok(weekSets(first) <= weekSets(trained), `first week ${weekSets(first)} sets, trained week ${weekSets(trained)}`);
  /* Five days of MEV-per-muscle is about 17 sets a day whatever the cap says,
     because a set under MEV does nothing for the muscle it came off. So the
     bound on the day is the trained day, and the 14 to 16 is asserted where
     it can hold, above with a clock. */
  assert.ok(biggestDay(first) <= biggestDay(trained), `biggest first-week day is ${biggestDay(first)} sets, trained ${biggestDay(trained)}`);
});

test("the novice cap climbs across the first three weeks and then leaves", () => {
  assert.equal(noviceSessionCap(0), 14);
  assert.ok(noviceSessionCap(4) > 14 && noviceSessionCap(4) < 20);
  assert.equal(noviceSessionCap(9), Infinity);
  assert.equal(noviceSessionCap(200), Infinity);
});

/* ------------------------------------------------------------------ *
 * A goal never prescribes what its own note warns against
 * ------------------------------------------------------------------ */

/* The four movements the goal-tree audit of 2026-09-12 found on the two goals
   whose notes point the other way. "pain" writes down bird dog and dead bug and
   was handed Crunch and Sit-Up; "back-postpartum" writes down pelvic floor
   first and was handed Russian Twist and Side Bend. Both because they prioritise
   abs and obliques and the library fills those slots with whatever ranks first. */
const CONTRADICTED = ["crunch", "sit-up", "russian twist", "side bend"];
const CAUTIONED_GOALS = [
  { bubble: "feel-better", child: "pain" },
  { bubble: "get-back", child: "back-postpartum" },
];

test("a goal that points away from loaded flexion and rotation never prescribes them", () => {
  const limitCases = [
    ["no limits", null],
    /* The case the fix has to survive, because it is the one with the fewest
       movements left: no cable, so no Pallof Press, and nothing to load. */
    ["bodyweight only", { missing: ["none"] }],
    ["no barbell", { missing: ["barbell"] }],
    ["no dumbbells or machines", { missing: ["dumbbell", "machine"] }],
    ["lower back hurts", { hurts: ["lowerback"] }],
    ["shoulder and wrist hurt", { hurts: ["shoulder", "wrist"] }],
  ];
  for (const goal of CAUTIONED_GOALS) {
    for (const days of [2, 3, 4, 5, 6]) {
      for (const [label, limits] of limitCases) {
        for (const logs of [[], longHistory(78)]) {
          const plan = buildPlan({
            goal, logs, limits,
            person: { daysAsked: days, bodyWeightLb: 160, sex: "Female" },
          });
          for (const d of plan.week) {
            for (const e of d.exercises) {
              assert.ok(!CONTRADICTED.includes(e.name.toLowerCase()),
                `${goal.child} ${days}d ${label}: ${e.name} on ${d.name}`);
              /* The swap offered is the same prescription one tap away, so it
                 has to obey the same bar. */
              assert.ok(!CONTRADICTED.includes(String(e.swap || "").toLowerCase()),
                `${goal.child} ${days}d ${label}: ${e.name} swaps to ${e.swap}`);
            }
          }
        }
      }
    }
  }
});

test("the two cautioned goals say what they leave out and whose call it is", () => {
  for (const goal of CAUTIONED_GOALS) {
    const plan = buildPlan({ goal, person: { daysAsked: 3, bodyWeightLb: 160 } });
    const notes = plan.dayNotes.join(" ");
    assert.ok(/holds position/.test(notes), `${goal.child} says what the core work does instead`);
    assert.ok(/clinician/.test(notes), `${goal.child} hands the judgement back to a clinician`);
    /* Non-clinical on purpose. The engine describes movements, never conditions. */
    assert.ok(!/diastasis|pelvic floor|injury|diagnos/i.test(notes), `${goal.child} makes no clinical claim`);
  }
});

test("a slot the bar empties is named rather than filled with the barred movement", () => {
  /* Cable only at beginner level is the case where it really happens: every abs
     movement the library offers on a cable is a crunch, and the Pallof Press
     that would fill the same core slot from the oblique side is intermediate.
     The slot goes, and the day says so. */
  const plan = buildPlan({
    goal: { bubble: "feel-better", child: "pain" },
    person: { daysAsked: 3, bodyWeightLb: 160 }, equipment: ["cable"],
  });
  const names = plan.week.flatMap((d) => d.exercises.map((e) => e.name.toLowerCase()));
  assert.ok(!names.includes("cable crunch"), "the barred movement did not come back as the fallback");
  assert.ok(plan.dayNotes.some((n) => /has no abs or obliques exercise in it/.test(n)), "the missing slot is said out loud");
  assert.ok(plan.dayNotes.some((n) => /Pallof Press/.test(n)), "and what would have filled it");
});

test("a goal with no movement bar is left exactly as it was", () => {
  /* The bar is per goal and data driven, so a goal that names no class must not
     pay for the mechanism existing. Crunches are still a fine answer for abs. */
  const plan = buildPlan({ goal: { bubble: "tone-lean-abs", child: "abs" }, person: { daysAsked: 3, bodyWeightLb: 160 } });
  assert.equal(barredMovements(plan.goal.params).size, 0);
  assert.deepEqual(movementCautionNotes(plan.goal.params), []);
});

test("the movement bar is a table any goal can name, not two exercises in an if", () => {
  const params = { avoidMovements: ["loadedRotation"] };
  const barred = barredMovements(params);
  for (const n of MOVEMENT_CLASSES.loadedRotation.names) assert.ok(barred.has(n.toLowerCase()));
  for (const n of MOVEMENT_CLASSES.loadedSpinalFlexion.names) assert.ok(!barred.has(n.toLowerCase()));
  /* A class nobody has heard of costs its own effect and never the plan, same
     rule as an unknown secondary goal. */
  assert.equal(barredMovements({ avoidMovements: ["nonsense"] }).size, 0);
  assert.deepEqual(movementCautionNotes({ avoidMovements: ["nonsense"] }), []);
  assert.equal(barredMovements(null).size, 0);
});

/* ------------------------------------------------------------------ *
 * strong-again routes to the returning cluster, strong-for-life does not
 * ------------------------------------------------------------------ */

test("get back to where I was is the returning plan, not the strength plan", () => {
  /* goal-tree.json's own entry for strong-again says "Route to the
     get-back-into-it bubble". The table had it as a byte-identical copy of
     strong-for-life instead, so the goal that should route elsewhere did not. */
  const again = resolveGoal({ bubble: "get-stronger", child: "strong-again" }).params;
  const years = resolveGoal({ bubble: "get-back", child: "back-after-years" }).params;
  assert.deepEqual(again, years, "strong-again is back-after-years");
  assert.equal(again.emphasis, "hypertrophy");
  assert.equal(again.setsFactor, 0.6);
});

test("for everyday life and get back to where I was are two different plans", () => {
  const life = resolveGoal({ bubble: "get-stronger", child: "strong-for-life" }).params;
  const again = resolveGoal({ bubble: "get-stronger", child: "strong-again" }).params;
  assert.notDeepEqual(life, again, "two goals that mean different things must not be one object");
  assert.equal(life.emphasis, "strength");
  assert.deepEqual(life.repRange, [5, 8]);
  /* And the difference reaches the week rather than stopping at the table. */
  const person = { daysAsked: 5, bodyWeightLb: 180, sex: "Male" };
  const lifeWeek = buildPlan({ goal: { bubble: "get-stronger", child: "strong-for-life" }, person });
  const againWeek = buildPlan({ goal: { bubble: "get-stronger", child: "strong-again" }, person });
  assert.notEqual(lifeWeek.days, againWeek.days, "the returning plan allows a fifth day and the strength one does not");
});

/* ------------------------------------------------------------------ *
 * One exercise is never two exercises
 * ------------------------------------------------------------------ */

test("no day prescribes the same exercise twice", () => {
  /* A 50,017 case fuzz run of 2026-09-12 found Dip at 3x8 in the chest slot and
     Dip again at 3x12 in the triceps slot on the same push day. Dip is
     primary ["chest", "triceps"], so it is a fair candidate for both, and on a
     bodyweight only week with a sore wrist the pool has nothing else left by
     the time the second slot is filled. The last-resort fallback was `pool[0]`,
     which did not care that the movement was already on the card. Not an exotic
     input: training at home with a sore wrist is the population the limits
     feature exists for. */
  const limitCases = [
    ["bodyweight, sore wrist", { hurts: ["wrist"], missing: ["none"] }],
    ["bodyweight, sore wrist and shoulder", { hurts: ["wrist", "shoulder"], missing: ["none"] }],
    ["bodyweight only", { missing: ["none"] }],
    ["no barbell or machine, sore elbow", { hurts: ["elbow"], missing: ["barbell", "machine"] }],
  ];
  for (const goal of [{ bubble: "build-muscle", child: "build-overall" }, { bubble: "get-stronger", child: "strong-a-lift" }, { bubble: "feel-better", child: "pain" }]) {
    for (const days of [2, 3, 4, 5, 6]) {
      for (const [label, limits] of limitCases) {
        for (const logs of [[], longHistory(78)]) {
          const plan = buildPlan({ goal, logs, limits, person: { daysAsked: days, bodyWeightLb: 170, sex: "Male" } });
          for (const d of plan.week) {
            const names = d.exercises.map((e) => e.name);
            assert.equal(new Set(names).size, names.length,
              `${goal.child} ${days}d ${label} ${d.name}: ${names.join(", ")}`);
          }
          /* CONTRACT.md promises three to six. Deduping must not quietly break
             that, and the adapter's borrow-from-the-next-day floor is what
             catches it, so it is checked here rather than assumed. */
          for (let i = 0; i < plan.week.length; i++) {
            assert.ok(toWorkout(plan, i).exercises.length >= 3,
              `${goal.child} ${days}d ${label} day ${i} fell under the floor`);
          }
        }
      }
    }
  }
});

test("a slot dropped to avoid a repeat says so rather than shipping a shorter day", () => {
  /* The fixture moved and the finding did not. The original was an "advanced"
     lifter, whose pool included every advanced calisthenics row; there is no
     such person any more, and a bodyweight-only week with a sore wrist now runs
     its accessory slots out of movements entirely rather than running them down
     to one repeat.
   *
     What still reaches the dedupe path is earned access putting the harder rows
     back: somebody who has actually done Dips, Push-Ups and Pull-Ups gets them,
     the push day's chest and triceps slots both want a Dip, and the choice
     between a short day and the same lift twice on one card is the one this note
     exists to make visible. Which is the case the 50,017 run found in the first
     place, arrived at by the route that can still produce it. */
  const day3 = (n) => day(-1 - n * 3);
  const bodyweightHistory = [];
  for (let i = 0; i < 40; i++) {
    for (const name of ["Dip", "Push-Up", "Pull-Up"]) {
      bodyweightHistory.push({ entry_date: day3(i), exercise_name: name, sets: 3, reps: 8, weight: 0 });
    }
  }
  const plan = buildPlan({
    goal: { bubble: "build-muscle", child: "build-overall" },
    person: { daysAsked: 4, bodyWeightLb: 170, sex: "Male" },
    logs: bodyweightHistory, limits: { hurts: ["wrist"], missing: ["none"] },
  });
  const said = plan.dayNotes.filter((n) => /is a slot short/.test(n));
  assert.ok(said.length, "the day that lost a slot is named");
  assert.ok(/not two exercises/.test(said[0]), "and why it was not filled with the repeat");
});

/* ------------------------------------------------------------------ *
 * How long you actually have (session_minutes)
 * ------------------------------------------------------------------ */

test("no session length means the goal decides, and the plan is the one it always was", () => {
  const args = {
    goal: { bubble: "get-stronger" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male" },
    logs: longHistory(78),
  };
  const base = buildPlan(args);
  /* Every shape a column, an old client or a slider can produce for "nothing
     was answered". All of them have to be the same plan, not a similar one. */
  for (const v of [null, undefined, 0, "", NaN, {}, "abc"]) {
    const plan = buildPlan({ ...args, person: { ...args.person, sessionMinutes: v } });
    assert.equal(plan.sessionBudget.source, "goal", `${String(v)} reached the budget`);
    assert.deepEqual(
      plan.week.map((d) => [d.minutes, d.estimatedMinutes, d.exercises.map((e) => [e.name, e.sets, e.restSec])]),
      base.week.map((d) => [d.minutes, d.estimatedMinutes, d.exercises.map((e) => [e.name, e.sets, e.restSec])]),
      `${String(v)} changed the week`);
    assert.deepEqual(plan.dayNotes, base.dayNotes, `${String(v)} changed what the plan said`);
  }
});

test("a stated session length replaces the goal's, and the week is costed against it", () => {
  const plan = buildPlan({
    goal: { bubble: "get-stronger" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male", sessionMinutes: 30 },
    logs: longHistory(78),
  });
  assert.equal(plan.sessionBudget.source, "asked");
  assert.equal(plan.sessionBudget.minutes, 30);
  /* 63 since 2026-09-12: the strength table's session length grew by the three
     minutes the ramp on a three rep main costs. goal-engine.mjs says why. */
  assert.equal(plan.sessionBudget.goalMinutes, 63, "the goal's own number is still reported");
  for (const d of plan.week) assert.equal(d.short ? Math.round(30 * 0.6) : 30, d.minutes);
});

test("a short answer takes sets off the mains before it touches the rest, and never below three", () => {
  const plan = buildPlan({
    goal: { bubble: "consistent", child: "no-time" },
    person: { daysAsked: 2, bodyWeightLb: 180, sex: "Male", sessionMinutes: 30 },
    logs: longHistory(78),
  });
  const day = plan.week[0];
  /* The clock is the whole visit now, cool-down included (plan.mjs overClock). */
  assert.ok(day.estimatedMinutes + Math.round(COOLDOWN_SECONDS / 60) <= 30 * 1.15, `${day.estimatedMinutes} against 30`);
  assert.ok(day.exercises.every((e) => e.sets >= 2), "nothing went under the accessory floor");
  /* This is the day the README's known limit was written about: four mains at
     six sets against a 25 minute goal. Under the flat thirty seconds a set the
     engine used to cost with, sets alone bought the 30 minutes and the rest was
     never touched. Costed honestly (setup, reps, transitions, logging and the
     cool-down), four mains at the floor of three sets with 75 seconds rest run
     to about 38 minutes, so the rest lever has to run after them. The claim
     that survives is the ORDER: rest is only shortened once every set that can
     come off has come off, so a compressed day has every main at the floor. */
  if (plan.volumeNotes.restCompressed.length) {
    assert.ok(day.exercises.every((e) => e.sets <= 3), "rest was only touched after the sets were at the floor");
    for (const r of plan.volumeNotes.restCompressed) assert.ok(r.toSec >= 45 && r.toSec < r.fromSec);
  }
});

test("shortening the rest to make the clock work is said out loud, every time", () => {
  const plan = buildPlan({
    goal: { bubble: "get-stronger" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male", sessionMinutes: 30 },
    logs: longHistory(78),
  });
  assert.ok(plan.volumeNotes.restCompressed.length, "a strength day at 30 minutes cannot be bought with sets alone");
  for (const r of plan.volumeNotes.restCompressed) {
    assert.ok(r.toSec < r.fromSec, "rest only ever comes down");
    assert.ok(r.toSec >= 45, "and never under 45 seconds");
    assert.ok(r.toSec >= Math.round(r.fromSec * 0.6) - 1, "and never past 40% off");
  }
  assert.ok(plan.dayNotes.some((n) => /rest between sets came down/.test(n)),
    "the plan says the rest came down rather than leaving it to be noticed");
});

test("a budget the engine cannot meet says the honest number instead of pretending", () => {
  const plan = buildPlan({
    goal: { bubble: "get-stronger" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male", sessionMinutes: 20 },
    logs: longHistory(78),
  });
  assert.ok(plan.volumeNotes.overBudget.length, "20 minutes of long-rest strength work does not exist");
  for (const o of plan.volumeNotes.overBudget) {
    assert.ok(/after the sets came down and the rest with them/.test(o.why),
      "and it says what was already tried");
  }
});

test("a longer answer buys sets and never passes the weekly ceiling", () => {
  const goal = { bubble: "build-muscle" };
  const person = { daysAsked: 4, bodyWeightLb: 180, sex: "Male" };
  const logs = longHistory(78);
  const base = buildPlan({ goal, person, logs });
  const long = buildPlan({ goal, person: { ...person, sessionMinutes: 90 }, logs });
  const total = (p) => p.week.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets, 0), 0);
  assert.ok(total(long) >= total(base), "more time is never less work");
  for (const [group, row] of Object.entries(long.weeklyVolume)) {
    assert.ok(row.sets <= row.target + 2 + 0.001, `${group} went past its weekly target plus the slack`);
  }
  for (const d of long.week) for (const e of d.exercises) assert.ok(e.sets <= 6, `${e.name} past the session clamp`);
});

test("a budget that cannot be spent is handed back rather than filled with junk sets", () => {
  const plan = buildPlan({
    goal: { bubble: "consistent", child: "no-time" },
    person: { daysAsked: 2, bodyWeightLb: 180, sex: "Male", sessionMinutes: 120 },
    logs: longHistory(78),
  });
  assert.ok(plan.dayNotes.some((n) => /the longest day here needs about/.test(n)),
    "the plan says the time could not be spent and why");
});

test("a session length outside the clamp is clamped and the clamp is spoken", () => {
  const tiny = buildPlan({
    goal: { bubble: "build-muscle" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male", sessionMinutes: 5 },
  });
  /* 25 since 2026-09-19: the floor is the smallest full day the engine really
     builds (four movements at two sets, the shortest rest, warm-up and
     cool-down), measured, and not the 15 the slider used to be allowed to send.
     The sentence is per day now and rides in `volumeNotes.overBudget`, so
     `fits` goes false with it. */
  assert.equal(tiny.sessionBudget.minutes, 25);
  assert.equal(tiny.sessionBudget.asked, 5);
  assert.ok(tiny.dayNotes.some((n) => /There is no session that short/.test(n)));
  assert.ok(tiny.volumeNotes.overBudget.length, "a plan built above what was asked lists its days as not fitting");
  const huge = buildPlan({
    goal: { bubble: "build-muscle" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male", sessionMinutes: 600 },
  });
  assert.equal(huge.sessionBudget.minutes, 120);
  assert.ok(huge.dayNotes.some((n) => /what a week can recover from/.test(n)));
});

test("asking for a focus still never costs that group its work, however tight the clock", () => {
  for (const minutes of [15, 20, 25, 30, 45]) {
    const plan = buildPlan({
      goal: { bubble: "get-stronger" },
      person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male", sessionMinutes: minutes },
      logs: longHistory(78),
      priorityOverride: { biceps: 3, triceps: 3 },
    });
    for (const d of plan.week) {
      const focused = d.exercises.filter((e) => e.focusTier >= 2);
      if (!focused.length) continue;
      const ceiling = Math.min(...focused.map((e) => e.sets));
      for (const e of d.exercises) {
        if (e.focusTier) continue;
        assert.ok(e.sets <= ceiling,
          `${minutes} min: ${e.name} at ${e.sets} sets over a focused lift at ${ceiling} on ${d.name}`);
      }
    }
  }
});

/* ---------------------------------------------------------------- *
 * What a longer session buys when it cannot buy sets
 * ---------------------------------------------------------------- */

test("every heavy main lift is ramped, with no clock involved", () => {
  const goal = { bubble: "get-stronger" };
  const person = { daysAsked: 4, bodyWeightLb: 180, sex: "Male" };
  const logs = longHistory(78);
  const base = buildPlan({ goal, person, logs });
  const long = buildPlan({ goal, person: { ...person, sessionMinutes: 90 }, logs });

  /* The bug this closes: an advanced lifter on a strength goal is already over
     the session length they asked for, so a surplus-gated ramp gave the person
     research/13 is describing exactly nothing. */
  assert.ok(base.week.every((d) => d.rampSets.length),
    "an advanced strength week ramps every day, with no session length sent at all");
  const ramps = long.week.flatMap((d) => d.rampSets || []);
  assert.ok(ramps.length, "and a stated clock does not take it away either");

  for (const r of ramps) {
    const day = long.week.find((d) => (d.rampSets || []).includes(r));
    const lift = day.exercises.find((e) => e.name === r.exercise);
    assert.ok(lift, `${r.exercise} is a lift on the day it ramps`);
    assert.ok(r.sets.length >= 1 && r.sets.length <= 4, "one to four rungs, research/13");
    for (const s of r.sets) {
      assert.ok(s.weight < lift.weight, `${r.exercise} ramps at ${s.weight} under a working ${lift.weight}`);
      assert.ok(s.restSec >= 45 && s.restSec <= 60, "the research's own rests");
    }
  }

  /* The whole point: zero volume. Not one hard set moved, not one weekly total,
     so nothing reaches recovery.mjs or the MRV ceiling through this door. */
  const sets = (p) => p.week.map((d) => d.exercises.map((e) => `${e.name}:${e.sets}`).join("|")).join("//");
  const longNoExtras = buildPlan({ goal, person: { ...person, sessionMinutes: 90 }, logs });
  assert.equal(sets(long), sets(longNoExtras), "the same input gives the same sets");
  for (const [group, row] of Object.entries(long.weeklyVolume)) {
    assert.ok(row.sets <= row.target + 2 + 0.001, `${group} past its weekly target plus the slack`);
  }
  /* And the ramp is not hiding in the day's own count of what it is doing. */
  for (const d of long.week) {
    for (const r of d.rampSets || []) {
      assert.ok(!d.exercises.some((e) => e.name === `${r.exercise} ramp`), "no ramp masquerading as a lift");
    }
  }
  assert.equal(base.volumeNotes.timeBought, undefined, "a plan with no stated clock has no ledger of what it spent");
});

test("what counts as heavy: mains yes, accessories never, bodyweight never", () => {
  const plan = buildPlan({
    goal: { bubble: "get-stronger" },
    person: { daysAsked: 4, bodyWeightLb: 180, sex: "Male" },
    logs: longHistory(78),
  });
  /* How many leading slots of each day type are mains, mirrored from plan.mjs
     SLOTS on purpose rather than imported: a check that borrows the thing it is
     checking agrees with it by construction. Same reason sweep.mjs writes out
     the volume ceiling. A full body day has four mains, an upper day three. */
  const MAIN_SLOTS = { fullBody: 4, push: 2, pull: 2, legs: 2, upper: 3, lower: 2 };
  for (const d of plan.week) {
    const ramped = new Set((d.rampSets || []).map((r) => r.exercise));
    assert.ok(ramped.size <= 2, `${d.name} ramps ${ramped.size} lifts; research/13 caps it at two`);
    /* research/13: "none for accessories and isolation". Mains lead the day, so
       anything past the day type's main slots must never carry a ramp. */
    const mains = MAIN_SLOTS[d.focus];
    assert.ok(mains, `${d.focus} is not in the mirrored slot table`);
    for (const e of d.exercises.slice(mains)) {
      assert.ok(!ramped.has(e.name), `${e.name} is an accessory on ${d.focus} and must not be ramped`);
    }
    for (const r of d.rampSets || []) {
      const lift = d.exercises.find((e) => e.name === r.exercise);
      assert.ok(lift.weight > 0, `${r.exercise} has no load to ramp and must not have one`);
    }
  }
  /* A bodyweight-only week has nothing loaded to ramp, and says nothing rather
     than inventing a regression ladder the library does not carry. */
  const bw = buildPlan({
    goal: { bubble: "get-stronger" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male" },
    limits: { missing: ["none"] },
  });
  for (const d of bw.week) {
    for (const r of d.rampSets || []) {
      const lift = d.exercises.find((e) => e.name === r.exercise);
      assert.ok(lift && lift.weight > 0, `${r.exercise} was ramped with no weight on it`);
    }
  }
});

test("a ramp is inside the session estimate, never bolted on after it", () => {
  const plan = buildPlan({
    goal: { bubble: "get-stronger" },
    person: { daysAsked: 4, bodyWeightLb: 180, sex: "Male" },
    logs: longHistory(78),
  });
  for (const d of plan.week) {
    /* The bug the WARMUP_MIN comment was written about: minutes the person
       spends that the number on the screen does not know about. A ramped day
       reserves the shorter general block plus the ramp, and the sum is what the
       estimate carries. */
    const rampSec = d.rampSets.reduce((t, r) => t + r.seconds, 0);
    /* The BUILT block, not the budgeted one, since 2026-09-19: the block fills
       to its budget and finishes the move it is on, and the app costs what was
       built. The budget is still the floor of what gets built. */
    const expected = Math.round((d.mobility.warmupSeconds + rampSec) / 60);
    assert.equal(d.prepMinutes, expected, `${d.name} reserves what it spends`);
    assert.ok(d.mobility.warmupSeconds >= (rampSec ? RAMPED_WARMUP_SECONDS : WARMUP_SECONDS), `${d.name}: the block is under its budget`);
    /* The exported costing rather than a copy of it, so a change to what a set
       costs is made in one place; the worked example on REP_SECONDS in plan.mjs
       is where a reader checks the arithmetic itself. */
    assert.equal(d.estimatedMinutes, Math.round(d.prepMinutes + sessionSeconds(d.exercises) / 60),
      `${d.name}: the estimate is the prep plus the work and nothing else`);
    assert.equal(d.estimatedMinutes, estimateMinutes(d.exercises, d.prepMinutes));
    /* totalMinutes adds the cool-down and must not add the ramp twice. */
    assert.equal(d.totalMinutes, d.estimatedMinutes + Math.round(d.mobility.cooldownSeconds / 60),
      `${d.name}: the ramp is counted once`);
  }
});

test("a ramped day gets the shorter general warm-up, and only a ramped day", () => {
  const plan = buildPlan({
    goal: { bubble: "get-stronger" },
    person: { daysAsked: 4, bodyWeightLb: 180, sex: "Male" },
    logs: longHistory(78),
  });
  for (const d of plan.week) {
    if (!d.rampSets.length) continue;
    /* Four minutes of general work plus about four of ramp is more preparation
       than the six it replaces, and more of it is specific, which is the whole
       argument. It must never come back longer than the unramped block. */
    assert.ok(d.mobility.warmupSeconds <= WARMUP_SECONDS,
      `${d.name} ramps and still got the full block`);
  }
});

test("ramp-up sets never reach what calibration counts as prescribed", () => {
  const goal = { bubble: "get-stronger" };
  const person = { daysAsked: 4, bodyWeightLb: 180, sex: "Male" };
  const logs = longHistory(78);
  const long = buildPlan({ goal, person: { ...person, sessionMinutes: 90 }, logs });
  let sawRamp = false;
  for (let i = 0; i < long.week.length; i++) {
    const w = toWorkout(long, i);
    if (w.rampSets) sawRamp = true;
    /* `exercises` is the array the app copies into `ai_workouts.exercises`, and
       that row is the only thing calibrate.mjs joins a log against. A ramp set
       in it would be read as work the person did not do. */
    const names = w.exercises.map((e) => e.name);
    assert.equal(new Set(names).size, names.length, "no duplicated rows");
    for (const r of w.rampSets || []) {
      const rows = w.exercises.filter((e) => e.name === r.exercise);
      assert.equal(rows.length, 1, `${r.exercise} appears once, as the working lift`);
      assert.equal(rows[0].sets, long.week[i].exercises.find((e) => e.name === r.exercise).sets,
        "the prescribed set count is the working count and nothing else");
    }
  }
  assert.ok(sawRamp, "the workout carries the ramp for the app to render separately");
});

test("extra time grows the cool-down and never the warm-up", () => {
  const goal = { bubble: "consistent", child: "no-time" };
  const person = { daysAsked: 3, bodyWeightLb: 180, sex: "Male" };
  const logs = longHistory(78);
  const base = buildPlan({ goal, person, logs });
  const long = buildPlan({ goal, person: { ...person, sessionMinutes: 120 }, logs });
  const grew = long.week.filter((d) => d.longCooldown);
  assert.ok(grew.length, "two hours against a no-time goal buys the ten minute block");
  for (let i = 0; i < long.week.length; i++) {
    /* research/13: McGowan 2015, Behm 2016 and Oliva 2026 all argue against a
       longer warm-up, so the minutes may only ever go to the block after. */
    assert.ok(long.week[i].mobility.warmupSeconds <= WARMUP_SECONDS + 60,
      "the warm-up stays at the six minutes the research asks for");
    if (long.week[i].longCooldown) {
      assert.ok(long.week[i].mobility.cooldownSeconds > base.week[i].mobility.cooldownSeconds,
        "the cool-down is what grew");
    }
  }
});

test("a shorter budget that later gets lighter gives the rest back and says so", () => {
  const goal = { bubble: "get-stronger" };
  /* 35 rather than 30 since the costing of 2026-09-14: at 30 the honest clock
     leaves a backed-off strength day of four mains no room at all, so there is
     nothing to repay into. At 35 the back-off frees enough to hand three of the
     four days their full rest back, which is the mechanism under test.
     40 since 2026-09-19, when the clock started reserving the built cool-down
     and allowing three minutes over rather than fifteen percent: at 35 the
     same backed-off day now repays to 0.8 of the interval and stops, and at
     40 three of the four days get the whole of it back. */
  const person = { daysAsked: 4, bodyWeightLb: 180, sex: "Male", sessionMinutes: 40 };
  /* A week the calibration backs off: everything prescribed, much less logged.
     The back-off takes sets off AFTER the clock compressed the rest, which is
     the only way a day can be both in debt and roomy at the same moment. */
  const names = ["Barbell Back Squat", "Barbell Bench Press", "Barbell Deadlift", "Barbell Row"];
  const logs = [];
  const plans = [];
  const today = new Date();
  for (let w = 0; w < 40; w++) {
    const day = new Date(today.getTime() - w * 3 * 86400000).toISOString().slice(0, 10);
    for (const n of names) logs.push({ entry_date: day, exercise_name: n, sets: 2, reps: 3, weight: 150 });
    plans.push({ entry_date: day, completed_at: day, exercises: names.map((n) => ({ name: n, sets: 5, reps: 5, targetWeight: 225 })) });
  }
  const plan = buildPlan({ goal, person, logs, plans, today });
  const repaid = (plan.volumeNotes.restCompressed || []).filter((r) => r.repaid);
  assert.ok(repaid.length, "a lighter week hands back the rest the clock took");
  for (const r of repaid) assert.equal(r.toSec, r.fromSec, "back to what the goal prescribes");
  assert.ok(plan.dayNotes.some((n) => /rest between sets is back to the full/.test(n)),
    "and the plan says so rather than leaving it to be noticed");
  /* The sentence that says rest is short must not survive its own repayment. */
  const stillShort = (plan.volumeNotes.restCompressed || []).filter((r) => !r.repaid);
  if (!stillShort.length) {
    assert.ok(!plan.dayNotes.some((n) => /rest between sets came down/.test(n)),
      "nothing tells them their rest is short when it is not");
  }
});

test("a stated session length that buys something says what it bought", () => {
  const plan = buildPlan({
    goal: { bubble: "consistent", child: "no-time" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male", sessionMinutes: 90 },
    logs: longHistory(78),
  });
  assert.ok(plan.volumeNotes.timeBought.length, "there was something to buy");
  const say = plan.dayNotes.find((n) => /It bought a ten minute/.test(n));
  assert.ok(say, "and the plan says what it was");
  assert.ok(/it is not logged/.test(say), "and that it does not count as a set");
  /* The ramp is no longer something spare minutes bought, so the sentence that
     describes it must not claim otherwise. */
  const rampSay = plan.dayNotes.find((n) => /ramp-up sets/.test(n));
  assert.ok(rampSay, "the ramp is explained");
  assert.ok(!/asked for/.test(rampSay), "and not as something the clock paid for");
  /* The refusal, when it still fires, must no longer recommend the thing the
     research says costs performance. */
  for (const n of plan.dayNotes) assert.ok(!/longer warm-up/.test(n), "no engine advice to warm up for longer");
});

test("each goal's session length covers the ramp it actually prescribes", () => {
  /* The staleness this closes: `sessionMin` was set for a session that opened
     cold, so the day the ramp shipped it was short by the ramp's cost and 517
     sweep days read as over budget with nothing a person would feel having
     changed. The fix has to stay DERIVED rather than drift into a magic number,
     so this asserts the derivation rather than the numbers: how many rungs a
     main earns comes off `repRange[0]` on the goal's own row, and what a day
     reserves for preparation must be the six minutes it always reserved plus
     exactly what those rungs cost. If somebody tunes a rep range and forgets the
     session length, this is what says so. */
  const extraFor = (reps) => (reps <= 5 ? 3 : reps <= 9 ? 1 : 0);
  for (const bubble of Object.keys(GOAL_PARAMS)) {
    for (const child of Object.keys(GOAL_PARAMS[bubble])) {
      const params = GOAL_PARAMS[bubble][child];
      if (!params || !Array.isArray(params.repRange)) continue;
      const plan = buildPlan({
        goal: { bubble, child: child === "_default" ? undefined : child },
        person: { daysAsked: 4, bodyWeightLb: 180, sex: "Male" },
        logs: [],
      });
      const want = extraFor(params.repRange[0]);
      for (const d of plan.week) {
        /* A day with nothing loaded to ramp reserves the plain six and that is
           correct; the claim is only that a day WITH a ramp reserves what the
           goal's rep range predicts. */
        if (!d.rampSets.length) { assert.equal(d.prepMinutes, 6, `${bubble}/${child} ${d.name}`); continue; }
        /* The FIRST main's ramp only, which is the mandatory part and the part
           `sessionMin` was derived from. The second main's rung is added later
           and only where the day already has room, so budgeting for it would be
           budgeting for something optional. */
        const mandatory = Math.round((240 + d.rampSets[0].seconds) / 60) - 6;
        assert.equal(mandatory, want,
          `${bubble}/${child} ${d.name}: reps ${params.repRange[0]} should cost ${want} extra minutes`);
      }
    }
  }
});

test("the one goal whose session length did not move, and why", () => {
  /* "I have no time" stays at 25 while every other length grew. The app's
     session-length chips are 20/30/45/60/90 and it suggests the nearest, ties to
     the shorter, so 25 suggests 20 and 26 would suggest 30. Growing it by the
     one minute the ramp costs would offer somebody who told us they have no time
     a session half again as long as the one they asked for. */
  const noTime = buildPlan({
    goal: { bubble: "consistent", child: "no-time" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male" },
    logs: [],
  });
  assert.equal(noTime.sessionBudget.goalMinutes, 25);

  /* And the check behind that reasoning, so the chips and the table cannot drift
     apart in silence: every goal length still suggests the chip it suggested
     before the ramp. index.html SESSION_LENGTHS, mirrored on purpose. */
  const CHIPS = [20, 30, 45, 60, 90];
  const nearest = (m) => CHIPS.reduce((best, c) => (Math.abs(c - m) < Math.abs(best - m) ? c : best), CHIPS[0]);
  const WAS = { 45: 46, 60: 61, 63: 60, 50: 51, 48: 45, 41: 40, 31: 30, 25: 25, 46: 45, 51: 50, 61: 60 };
  for (const [now, before] of [[46, 45], [61, 60], [63, 60], [51, 50], [48, 45], [41, 40], [31, 30], [25, 25]]) {
    assert.equal(nearest(now), nearest(before),
      `a session length of ${before} became ${now} and that changes the chip the app suggests`);
  }
  assert.ok(WAS, "kept so the mapping above reads as a table rather than a list");
});


/* ---- what somebody actually gets for the styles they ticked ----
 *
 * Every one of these asserts the WEEK, not the flag. `meta.styles.honoured` and
 * `resistance` were both correct for the whole time the bug was live: the
 * engine set honoured to false, computed resistance as false, wrote a sentence
 * saying the week was cardio only, and then handed back Push-Up, Lat Pulldown,
 * Machine Shoulder Press and an Inverted Row. A test on either flag would have
 * passed every day of it.
 */

const stylePayload = (train_styles, extra = {}) => ({
  goal_bubble: "lose-weight", days_per_week: 4, current_weight: 180, sex: "male",
  train_styles, ...extra,
});

test("somebody who ticked only Running gets a run, not a lifting day", async () => {
  const out = await generateFromPayload(stylePayload(["running"]));
  assert.equal(out.workout.exercises.length, 0, "a run has no sets and no reps, so nothing goes in exercises");
  assert.ok(out.workout.cardio, "the session itself comes back");
  assert.equal(out.workout.cardio.mode, "running", "and it is the mode they picked");
  assert.ok(out.workout.cardio.minutes > 0 && out.workout.cardio.cue, "with a length and a cue somebody can act on");
  /* The flag now measures the response rather than predicting it. */
  assert.equal(out.meta.styles.honoured, true);
  assert.equal(out.meta.styles.resistance, false);
  /* And the sentence on the response is the one that is true of it. */
  assert.match(out.meta.styles.note, /cardio only/);
  assert.ok(out.notes.includes(out.meta.styles.note), "it reaches the caller's notes, not only meta");
  /* The whole point, stated as the thing a person would notice. */
  assert.equal(out.meta.session.estimatedMinutes, out.workout.cardio.minutes,
    "the day is costed at the run's length, not the lifting day's");
  assert.equal(out.meta.stretching.warmupMinutes, 0, "and it does not claim a bench press warm-up");
});

test("every cardio mode a beginner can be given builds its own session", async () => {
  for (const [style, mode] of [["running", "running"], ["cycling", "cycling"], ["walking", "walking"], ["rowing", "rowing"], ["hiking", "hiking"]]) {
    const out = await generateFromPayload(stylePayload([style]));
    assert.equal(out.workout.exercises.length, 0, `${style} came back as lifting`);
    assert.equal(out.workout.cardio.mode, mode, `${style} should plan ${mode}`);
  }
});

test("a mode somebody ticked is built for them, and never substituted for another", async () => {
  /* Swimming and Classes are ticks on the onboarding sheet, and the library's
     only swim and only HIIT session are both tagged intermediate. Under the old
     person-level gate that meant a brand new user who ticked Swimming was told
     the week could not be built, and before the refusal note existed they were
     handed an Easy Spin on a stationary bike under their own word "swimming".
     The mode is a stated choice, so it is honoured with no history behind it.
     What is still refused is a mode the library does not know at all. */
  for (const style of ["swimming", "classes"]) {
    const out = await generateFromPayload(stylePayload([style]));
    assert.equal(out.meta.styles.honoured, true, `${style} is a mode the library has`);
    assert.ok(out.workout.cardio, `${style} came back without a session`);
    assert.equal(out.workout.exercises.length, 0, `${style} came back as lifting`);
  }

  /* Somebody with a long history gets the same session, because nothing about
     the choice depends on how long they have trained. */
  const swimmer = await generateFromPayload(stylePayload(["swimming"], { logs: manySessions(80) }));
  assert.equal(swimmer.workout.cardio?.mode, "swimming");

  /* And the hardest tier stays out, because a mode is not a difficulty: nobody
     ticked a box asking for Sprint Intervals. */
  for (const logs of [[], manySessions(80)]) {
    const runner = await generateFromPayload(stylePayload(["running"], { logs }));
    assert.notEqual(runner.workout.cardio?.name, "Sprint Intervals");
  }
});

test("a cardio day respects the session length they gave us", async () => {
  /* The library runs from a 20 minute row to a 60 minute walk and nothing was
     reading the clock, so somebody who said they have half an hour and ticked
     Walking was handed an hour long walk. Narrowed rather than trimmed: the
     length of an easy walk is part of what it is, and a 60 minute one cut to 30
     is a different session, not a shorter one. */
  for (const minutes of [20, 30, 45]) {
    const out = await generateFromPayload(stylePayload(["walking"], { session_minutes: minutes }));
    assert.ok(out.workout.cardio.minutes <= minutes,
      `asked for ${minutes} minutes and got a ${out.workout.cardio.minutes} minute ${out.workout.focus}`);
    assert.equal(out.meta.session.fits, true);
  }
});

test("the same day asked twice is the same session", async () => {
  const a = await generateFromPayload(stylePayload(["cycling"]));
  const b = await generateFromPayload(stylePayload(["cycling"]));
  assert.equal(a.workout.focus, b.workout.focus);
});

test("somebody who ticked only Yoga gets a yoga class, not five lifts", async () => {
  /* The bug this replaces, in full, because it ran for a day and it is the one
     Mo asked about: a person who ticked Yoga and nothing else was handed a
     lifting day under a note reading "this is a lifting session, not the
     mobility work week you picked: mobility work is not something this plan
     can build for you yet". The moves were in knowledge/exercise-library the
     whole time and activity-session.mjs could already build the class. Only
     the shape of this response was missing, so only the shape changed. */
  for (const [styles, training, label] of [[["yoga"], "yoga", "Yoga"], [["pilates"], "pilates", "Pilates"]]) {
    const out = await generateFromPayload(stylePayload(styles));
    assert.equal(out.workout.exercises.length, 0, `${label} has no sets, so nothing goes in exercises`);
    assert.ok(out.workout.flow, "the session itself comes back");
    assert.equal(out.workout.flow.training, training);
    assert.equal(out.workout.focus, label, "and the day is named the way the app's activity table names it");
    assert.ok(out.workout.flow.moves.length > 4, "a class is a list of moves, not a word and a clock");
    assert.ok(out.workout.flow.moves.every((m) => m.seconds > 0 && m.name), "every move has a name and a length");
    /* Measured, not predicted: the week that came back really is theirs. */
    assert.equal(out.meta.styles.honoured, true);
    assert.equal(out.meta.styles.resistance, false);
    assert.match(out.meta.styles.note, /^This week is mobility work only/,
      "the sentence about a week with no lifting in it, now attached to a week that exists");
    assert.ok(out.notes.includes(out.meta.styles.note), "it reaches the caller's notes, not only meta");
    assert.equal(out.meta.session.estimatedMinutes, out.workout.flow.minutes,
      "the day is costed at the class's length, not the lifting day's");
    assert.equal(out.meta.stretching.warmupMinutes, 0, "a mobility session is its own warm-up");
    assert.deepEqual([out.workout.warmup, out.workout.cooldown], [[], []]);
  }
});

test("a flow day runs for a defensible length, and for theirs when they gave us one", async () => {
  /* Nobody is standing in front of the clock when a week is planned, so the
     default is the number the app's own activity sheet opens on. A stated
     session length outranks it, because that is the person answering the
     question the default exists to guess at. */
  const plain = await generateFromPayload(stylePayload(["yoga"]));
  assert.equal(plain.workout.flow.minutes, FLOW_MINUTES_DEFAULT);

  for (const minutes of [20, 45, 60]) {
    const out = await generateFromPayload(stylePayload(["yoga"], { session_minutes: minutes }));
    assert.equal(out.workout.flow.minutes, minutes, `asked for ${minutes} and got ${out.workout.flow.minutes}`);
    assert.ok(out.workout.flow.seconds <= minutes * 60, "and the moves fit inside it");
  }

  /* Past an hour we build the hour and say so, rather than running one short
     sequence eight times and calling it a two hour class. */
  const long = await generateFromPayload(stylePayload(["yoga"], { session_minutes: 120 }));
  assert.equal(long.workout.flow.minutes, FLOW_MINUTES_MAX);
  assert.ok(long.workout.flow.notes.some((n) => /You asked for 120 minute sessions/.test(n)),
    "and the number they asked for is said out loud");
});

test("a flow day says out loud that the sequence repeats", async () => {
  /* The libraries are small: yoga holds about fourteen minutes of unique
     beginner work and Pilates about eight, so a thirty minute class is the
     same sequence coming round again. That is what a mat class is, and the
     round number and the note are how somebody can tell the difference between
     a class that repeats and a generator that lost count. */
  const out = await generateFromPayload(stylePayload(["pilates"]));
  assert.ok(out.workout.flow.rounds > 1, "thirty minutes of Pilates cannot be thirty unique minutes");
  assert.ok(out.workout.flow.notes.some((n) => /rounds of the same sequence/.test(n)));
  const rounds = new Set(out.workout.flow.moves.map((m) => m.round));
  assert.equal(rounds.size, out.workout.flow.rounds, "every round the header claims has moves in it");
});

test("the same day asked twice is the same class, and tomorrow is a different one", async () => {
  const a = await generateFromPayload(stylePayload(["yoga"]), { today: new Date("2026-09-18T07:00:00") });
  const b = await generateFromPayload(stylePayload(["yoga"]), { today: new Date("2026-09-18T21:00:00") });
  const c = await generateFromPayload(stylePayload(["yoga"]), { today: new Date("2026-09-25T07:00:00") });
  assert.deepEqual(a.workout.flow.moves, b.workout.flow.moves, "a day that reshuffles cannot be reviewed");
  assert.notDeepEqual(a.workout.flow.moves, c.workout.flow.moves, "and a week of identical days is not a week");
});

test("a class is built for the mat mileage they have, not for how much they lift", async () => {
  /* Lifting mileage is a lifting training age. An advanced deadlifter who has
     never been on a mat is a beginner here, and the only honest input is how
     many of these they have done, which the app writes into exercise_logs
     under the activity's own label.

     Measured against `meta.experience` and not `meta.level`, which is gone: a
     `notEqual(undefined, "beginner")` passes while asserting nothing, and this
     test exists precisely to catch a lifting number leaking onto the mat. */
  const lifter = await generateFromPayload(stylePayload(["yoga"], { logs: manySessions(80) }));
  assert.ok(lifter.meta.experience.sessions >= 20, "the lifting mileage really is substantial");
  assert.equal(lifter.workout.flow.level, "beginner", "and it buys nothing on a mat");

  const yogi = await generateFromPayload(stylePayload(["yoga"], {
    logs: Array.from({ length: 30 }, (_, i) => ({ entry_date: day(-i - 1), exercise_name: "Yoga", sets: 1 })),
  }));
  assert.equal(yogi.workout.flow.level, "advanced", "thirty classes is mileage and it counts");
});

test("a week with two kinds of day in it alternates rather than picking a favourite", async () => {
  /* Somebody who ticked Running and Yoga meant both. Answering with a run
     every time would be the column being half ignored, which is the bug this
     whole module exists to fix one level up. */
  const kinds = new Set();
  for (const d of ["2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21"]) {
    const out = await generateFromPayload(stylePayload(["running", "yoga"]), { today: new Date(d + "T09:00:00") });
    assert.equal(out.meta.styles.honoured, true, `${d} came back as a lifting day`);
    kinds.add(out.workout.flow ? "flow" : "cardio");
  }
  assert.deepEqual([...kinds].sort(), ["cardio", "flow"], "four days should hold both kinds");
});

test("a day we replaced does not carry the dropped day's sentences", async () => {
  /* The plan's own notes are all about the lifting day: the ramp-up sets on a
     Goblet Squat, the rest that came down to fit the clock, what a bad knee
     cost. Printed over a yoga class or a run they are the response describing
     a session it did not hand over. Measured on the session length note,
     because it is the one that is easy to provoke. */
  const lifting = await generateFromPayload(stylePayload(["lifting"], { session_minutes: 5 }));
  assert.ok(lifting.notes.some((n) => /There is no session that short/.test(n)),
    "the lifting week does say it, and must go on saying it");

  for (const styles of [["yoga"], ["running"]]) {
    const out = await generateFromPayload(stylePayload(styles, { session_minutes: 5 }));
    assert.equal(out.meta.styles.honoured, true);
    assert.ok(!out.notes.some((n) => /There is no session that short/.test(n)),
      `${styles[0]} was handed a sentence about the lifting day it never got`);
    assert.ok(out.notes.includes(out.meta.styles.note), "the sentence about THIS day still arrives");
  }
});

test("a week planned in one sitting is not the same day five times", async () => {
  /* The seed is the day being BUILT. Without `for_date` it is the moment of
     the call, so planning Thursday, Friday and Saturday on Wednesday night
     turned the ring not at all and handed back the same run three times. The
     app hit this on its own side first and fixed it the same way. */
  const kinds = [];
  const runs = new Set();
  for (const d of ["2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22"]) {
    const out = await generateFromPayload(stylePayload(["running", "yoga"], { for_date: d }),
      { today: new Date("2026-09-18T20:00:00") });
    kinds.push(out.workout.flow ? "flow" : "cardio");
    if (out.workout.cardio) runs.add(out.workout.focus);
  }
  assert.deepEqual([...new Set(kinds)].sort(), ["cardio", "flow"], `four nights came back as ${kinds.join(", ")}`);

  /* And a junk one changes nothing, which is what every client that predates
     the field sends. */
  const noDate = await generateFromPayload(stylePayload(["yoga"]), { today: new Date("2026-09-18T20:00:00") });
  for (const bad of [null, "", "tomorrow", "2026-13-40", 20260919, {}]) {
    const out = await generateFromPayload(stylePayload(["yoga"], { for_date: bad }), { today: new Date("2026-09-18T20:00:00") });
    assert.deepEqual(out.workout.flow.moves, noDate.workout.flow.moves, `for_date ${JSON.stringify(bad)} moved the day`);
  }
});

test("a kind we cannot build falls through to one we can, rather than to a refusal", async () => {
  /* When one kind in the ring comes back null, the honest answer is the other
     kind they also asked for and not the lifting day they did not.

     Driven through styleDayFor with a mode the cardio library does not know,
     rather than through a payload, and that is a note about the merge rather
     than about the ring. Swimming used to be the natural payload for this,
     because the only swim is tagged intermediate and the library was asked at
     beginner level; it builds now, and every mode on the onboarding sheet
     builds with it. So no tick a real person can make reaches this branch
     today. The branch stays, because it is what makes the ring safe when a
     library changes under it, and this is the only way left to exercise it. */
  const day = styleDayFor({ cardioModes: ["underwater basket weaving"], flowTrainings: ["yoga"] },
    { today: new Date("2026-09-19T09:00:00") });
  assert.ok(day, "a kind that cannot be built must not take the whole ring down with it");
  assert.equal(day.flow?.training, "yoga");
  assert.equal(day.exercises.length, 0);

  /* And the ring still refuses when NOTHING in it can be built. */
  assert.equal(styleDayFor({ cardioModes: ["underwater basket weaving"], flowTrainings: [] },
    { today: new Date("2026-09-19T09:00:00") }), null);
});

test("a week we cannot build still says so in a sentence, and does not claim otherwise", async () => {
  /* What is left after yoga and Pilates: a tick that names no session in any
     library we have. The lifting day stands, which is the old behaviour, and
     the response says what it is rather than attaching a note claiming the
     week is cardio only over five barbell lifts.

     Sports alone, and it really is alone now. Swimming and Classes were here
     too, because the cardio library was asked at beginner level and the only
     swim and the only HIIT session are both tagged intermediate. Refusing to
     build the mode somebody ticked, over a difficulty tag on the one row that
     could have served it, was the paternalism the level work removed: the
     library is asked on the strength of the mode now, so both build. Sports is
     the one tick that names no mode at all, and it stays refused. */
  for (const styles of [["sports"]]) {
    const out = await generateFromPayload(stylePayload(styles));
    assert.ok(out.workout.exercises.length >= 4, "the lifting day is still what we have to offer");
    assert.ok(!out.workout.flow && !out.workout.cardio, "and nothing is invented to cover it");
    assert.equal(out.meta.styles.honoured, false, "the response does not pretend otherwise");
    assert.match(out.meta.styles.note, /^This is a lifting session/, "the first clause says what they are holding");
    assert.ok(!/^This week is/.test(out.meta.styles.note), "never the sentence for a week that has no lifting in it");
    assert.ok(out.notes.includes(out.meta.styles.note), "and it reaches the notes a caller renders");
  }
});

test("a mode the cardio library does not know is refused rather than guessed at", async () => {
  /* "Sports" is a real tick on the onboarding sheet and there is no such thing
     as a sports session in the library. `cardioFor` answers a modeless ask with
     everything it has, so building from it would hand a five a side player an
     Easy Run and call it their choice. */
  const out = await generateFromPayload(stylePayload(["sports"]));
  assert.ok(out.workout.exercises.length >= 4);
  assert.equal(out.meta.styles.honoured, false);
  assert.match(out.meta.styles.note, /^This is a lifting session/);
});

test("ticking a resistance style leaves the week exactly as it was", async () => {
  /* The regression this pair guards: none of the above may reach anybody who
     did tick lifting, and least of all anybody who was never asked. */
  for (const styles of [["lifting"], ["home"], ["lifting", "running"], ["home", "yoga"], null, []]) {
    const out = await generateFromPayload(stylePayload(styles));
    assert.ok(out.workout.exercises.length >= 4, `${JSON.stringify(styles)} should still lift`);
    assert.equal(out.meta.styles.honoured, true);
    assert.equal(out.meta.styles.note, null);
  }
});

test("cardioSessionFor builds nothing rather than something wrong", () => {
  assert.equal(cardioSessionFor(readStyles(["yoga"]), {}), null, "a flow week has no cardio session in it");
  assert.equal(cardioSessionFor(readStyles(["sports"]), {}), null, "and neither has a mode the library cannot name");
  assert.equal(cardioSessionFor(readStyles(null), {}), null, "never asked means never overridden");
  const run = cardioSessionFor(readStyles(["running"]), { today: new Date("2026-09-18") });
  assert.deepEqual(run.exercises, [], "a run is never a list of sets");
  assert.deepEqual([run.warmup, run.cooldown], [[], []], "and never carries a lifting day's mobility");
});

test("a flow session is never a list of sets either", () => {
  const cls = flowSessionFor(readStyles(["yoga"]), { today: new Date("2026-09-18") });
  assert.deepEqual(cls.exercises, [], "a pose in exercises is a logged set and a lit muscle");
  assert.deepEqual([cls.warmup, cls.cooldown], [[], []], "and a yoga class does not need a stretch block bolted on");
  assert.equal(cls.flow.moves.every((m) => !("primary" in m) && !("secondary" in m)), true,
    "the library's muscle lists stay out of the response, because nothing renders them and something would count them");
  assert.equal(flowSessionFor(readStyles(["running"]), {}), null, "a cardio week has no class in it");
  assert.equal(flowSessionFor(readStyles(null), {}), null, "never asked means never overridden");
  assert.equal(styleDayFor(readStyles(["sports"]), {}), null, "and a tick no library can name still comes back empty handed");
  assert.equal(styleDayFor(readStyles(null), {}), null);
});

/* ---- how much core work a split actually buys ----
 *
 * The core slot named one muscle group and which one depended on the template,
 * so how much core somebody got was settled by whether their day count produced
 * a Leg day or a Lower day. Counted in sets, because sets are what a person
 * does; a test on the slot table would have passed either way.
 */

const coreSets = (plan) => plan.week.reduce((n, d) =>
  n + d.exercises.filter((e) => e.group === "abs" || e.group === "obliques").reduce((m, e) => m + e.sets, 0), 0);
const setsOf = (plan, group) => plan.week.reduce((n, d) =>
  n + d.exercises.filter((e) => e.group === group).reduce((m, e) => m + e.sets, 0), 0);
const corePlan = (daysAsked, priorityOverride = null) => buildPlan({
  goal: { bubble: "build-muscle" },
  person: { daysAsked, bodyWeightLb: 180, sex: "male" },
  logs: [], priorityOverride,
});
/* The floor a day one week is held to. Somebody with no logs sits at four
   fifths of MEV on purpose since 2026-09-19 (plan.mjs noviceScale, the
   landmark table's own caveat that beginners need less to grow), so the split
   is asked for that rather than for the intermediate column's 8. */
const CORE_FLOOR_DAY_ONE = Math.round(8 * 0.8);

test("every split trains core, whatever the day count called the day", () => {
  /* Measured on HEAD before the slot was widened: a three day week got 9 abs
     sets and no obliques, a four day week got 8 oblique sets and no abs, and a
     five day week 6 of each. The muscle a person trained was decided by their
     day count. */
  for (const days of [2, 3, 4, 5]) {
    const plan = corePlan(days);
    assert.ok(coreSets(plan) >= CORE_FLOOR_DAY_ONE, `a ${days} day week gets ${coreSets(plan)} core sets, under the MEV-to-MAV floor in knowledge/principles/volume-landmarks.md`);
    assert.ok(setsOf(plan, "abs") > 0, `a ${days} day week never trains abs`);
  }
});

test("a focus on core buys core on the four day split too", () => {
  /* The bug this is here for: the four day split filled its core slot from
     obliques, so a focus spent on abs asked for volume in a group the week
     never trained and bought exactly nothing. 8 core sets with the focus and 8
     without, measured, which is why index.html's focus picker carries a hedge
     splitting its points across both groups. That hedge can come out. */
  for (const days of [3, 4]) {
    const plain = coreSets(corePlan(days));
    const focused = coreSets(corePlan(days, { abs: 2 }));
    assert.ok(focused > plain,
      `a ${days} day week: asking for core bought ${focused} sets against ${plain} without asking`);
  }
});

test("asking for core on a four day split beats splitting the ask in two", () => {
  /* The measurement behind the recommendation to index.html. Spending the
     region's core allowance down onto abs is now at least as good as spreading
     it across abs and obliques on every split, and strictly better on four and
     five days. Spread, a "Legs and core" pick used to come back with LESS core
     than picking nothing at all. */
  for (const days of [3, 4, 5]) {
    const across = coreSets(corePlan(days, { quads: 3, hamstrings: 1, abs: 1, obliques: 1 }));
    const down = coreSets(corePlan(days, { quads: 3, hamstrings: 1, abs: 2 }));
    assert.ok(down >= across, `a ${days} day week: spending down bought ${down} sets, spreading bought ${across}`);
  }
});

/* ------------------------------------------------------------------ *
 * age.mjs, and the three levers research/02 asks for
 * ------------------------------------------------------------------ *
 * Written 2026-09-18, after finding that a 25 year old and a 60 year old got
 * byte-identical weeks. `age` reached the edge function, was bounded there,
 * rode the payload into adapter.mjs and was never put on the `person` object,
 * so every line of research/02 was unimplemented because the number never
 * arrived rather than because anybody disagreed with it.
 */
import { ageCaution, ageWarmupCaution, agePosition, ageNote, CAUTION_FROM, CAUTION_TO } from "./age.mjs";
import { returnFactorFor, RETURN_FACTOR, AGE_RETURN_CUT } from "./load.mjs";
import { AGE_WARMUP_GROWTH } from "./mobility.mjs";

test("age is a dial and not a cliff", () => {
  /* Nobody becomes a different trainee on their fiftieth birthday, so the only
     thing this has to prove is that it never steps: every year is within a
     year's worth of the year before it, all the way across. */
  let prev = ageCaution(10);
  for (let a = 10; a <= 120; a++) {
    const c = ageCaution(a);
    assert.ok(c >= prev, `caution went DOWN between ${a - 1} and ${a}`);
    assert.ok(c - prev <= 1 / (CAUTION_TO - CAUTION_FROM) + 1e-9, `a cliff at ${a}: ${prev} -> ${c}`);
    prev = c;
  }
  assert.equal(ageCaution(CAUTION_FROM), 0);
  assert.equal(ageCaution(CAUTION_TO), 1);
});

test("the dial saturates, so a 75 year old never gets less than a 60 year old", () => {
  /* research/02's headline is that older adults respond substantially into
     their seventies and eighties and that a smaller program is not a safety
     measure. A dial that kept climbing would eventually be one. */
  for (let a = CAUTION_TO; a <= 120; a++) assert.equal(ageCaution(a), 1, `caution at ${a}`);
});

test("the research says nothing about teenagers, so neither does the engine", () => {
  /* The app's stated minimum is 13 and research/02 has no line about
     adolescents in either direction. Inventing a youth branch to fill that
     silence would be the same mistake as inventing an old-age one. */
  for (const a of [13, 16, 18, 25, 30]) assert.equal(ageCaution(a), 0, `age ${a}`);
});

test("a missing age gets the careful ramp and NOT a claim about the person", () => {
  /* research/02: "the age-unknown default should look like the older-adult
     default, not the young-adult one. The asymmetry of the costs says so."
     Deliberately the opposite shape to the `sex` bug, where an unset field was
     read as a specific claim (male) that made half its users' weights too
     heavy. Here an unset field is read as no claim, and what follows from no
     claim is the answer that is survivable either way. */
  for (const bad of [null, undefined, "", NaN, "forty", {}, [], 0, 9, 121, Infinity]) {
    assert.equal(ageCaution(bad), 1, `${JSON.stringify(bad)} should read as unknown`);
    assert.equal(agePosition(bad), null);
  }
  assert.ok(/careful rate/.test(ageNote(null)), "and it says so out loud");
});

test("a missing age does NOT buy the longer warm-up", () => {
  /* The one place the two dials part company, and it is argued rather than
     sloppy: research/02 prices its unknown-age default as "a slightly slower
     first three weeks", which is a claim about ramp rate. Minutes are a
     different currency and research/13 is against spending them on a general
     block. So the block grows for somebody who told us, and not for everybody
     who left a field blank. */
  assert.equal(ageWarmupCaution(null), 0);
  assert.equal(ageCaution(null), 1);
  assert.equal(ageWarmupCaution(70), ageCaution(70));
});

test("age makes the increment smaller and never the destination", () => {
  /* research/02: "a longer ramp-in block and smaller load increments... Not a
     lower ceiling. A slower approach to it." */
  for (const [name, at] of [["Barbell Back Squat", 185], ["Romanian Deadlift", 155], ["Barbell Bench Press", 135], ["Dumbbell Curl", 25]]) {
    const young = stepFor(name, at, { ageCaution: 0 });
    assert.equal(young, stepFor(name, at), "no dial is the file as it was");
    let prev = young;
    for (let c = 0; c <= 1.0001; c += 0.05) {
      const s = stepFor(name, at, { ageCaution: c });
      assert.ok(s <= prev, `${name}: the step went UP at caution ${c.toFixed(2)}`);
      assert.ok(s > 0, `${name}: a step of nothing is not a smaller step, it is a stall`);
      prev = s;
    }
  }
  /* Squat and hinge are the two the grid can actually express a smaller step
     on, and they are also the two research/02's tendon argument points at. A
     5 lb compound step cannot go under the 5 lb plate that expresses it, and
     saying that is better than pretending otherwise. */
  assert.equal(stepFor("Barbell Back Squat", 185, { ageCaution: 1 }), 5);
  assert.equal(stepFor("Barbell Bench Press", 135, { ageCaution: 1 }), 5);
});

test("twelve weeks of increments: the older lifter is still climbing, just slower", () => {
  /* The measurement that matters, because a step size on its own says nothing
     about what somebody receives. Three sessions a week for twelve weeks, every
     one of them earning the step. */
  const climb = (name, start, caution) => {
    let w = start;
    for (let s = 0; s < 36; s++) w += stepFor(name, w, { ageCaution: caution });
    return w - start;
  };
  const young = climb("Barbell Back Squat", 185, ageCaution(25));
  const mid = climb("Barbell Back Squat", 185, ageCaution(45));
  const old = climb("Barbell Back Squat", 185, ageCaution(75));
  assert.equal(young, 360);
  assert.equal(mid, 360);
  assert.equal(old, 180);
  assert.ok(old > 0, "slower is not stopped: research/02's whole point is the same destination");
});

test("the returning restart moves with age, smoothly, and only downward", () => {
  assert.equal(returnFactorFor(0), RETURN_FACTOR);
  assert.equal(returnFactorFor(1), RETURN_FACTOR - AGE_RETURN_CUT);
  assert.equal(returnFactorFor(), RETURN_FACTOR);
  for (const bad of [null, "x", NaN, -5, 9]) {
    const f = returnFactorFor(bad);
    assert.ok(f >= RETURN_FACTOR - AGE_RETURN_CUT && f <= RETURN_FACTOR, `${bad} gave ${f}`);
  }
  const logs = [{ entry_date: "2026-07-10", exercise_name: "Barbell Back Squat", sets: 3, reps: 5, weight: 200 }];
  const at = (a) => prescribeLoad({
    exercise: { name: "Barbell Back Squat", equipment: "barbell" }, reps: 5,
    bodyWeightLb: 180, sex: "Male", logs, returning: true, ageCaution: ageCaution(a),
  }).weight;
  assert.equal(at(25), 110);
  assert.equal(at(45), 100);
  assert.equal(at(60), 95);
  assert.equal(at(75), 90);
  /* And the card has to say which of the two reasons it is. "You have been
     away" is true for everybody; "further back than that" is a second claim. */
  const older = prescribeLoad({
    exercise: { name: "Barbell Back Squat", equipment: "barbell" }, reps: 5,
    bodyWeightLb: 180, sex: "Male", logs, returning: true, ageCaution: 1,
  });
  assert.ok(/tendon/.test(older.note), older.note);
});

test("age never touches a weight that was not a restart", () => {
  /* The line research/02 draws: age modifies the rate of advance and the
     selection, never the destination. So a lifter who is NOT returning gets the
     same number at 25 and at 75. */
  const logs = [{ entry_date: "2026-09-15", exercise_name: "Barbell Back Squat", sets: 3, reps: 5, weight: 200 }];
  const args = { exercise: { name: "Barbell Back Squat", equipment: "barbell" }, reps: 5, bodyWeightLb: 180, sex: "Male", logs };
  assert.equal(prescribeLoad({ ...args, ageCaution: 0 }).weight, prescribeLoad({ ...args, ageCaution: 1 }).weight);
});

test("the warm-up grows with age, inside the band both research files argue in", () => {
  const day = {
    name: "Leg day", mainGroups: ["quads", "glutes", "hamstrings"],
    mainPatterns: ["squat", "hinge"], allPatterns: ["squat", "hinge"],
    exercises: [{ group: "quads" }, { group: "glutes" }],
  };
  const budget = (c) => mobilityFor(day, { ageCaution: c }).warmupBudgetSeconds;
  assert.equal(budget(0), WARMUP_SECONDS);
  assert.equal(budget(1), Math.round(WARMUP_SECONDS * (1 + AGE_WARMUP_GROWTH)));
  /* research/13's own numbers: ACSM says five to ten minutes and McGowan 2015
     says ten to fifteen counting the ramp. Nothing here leaves that window. */
  assert.ok(budget(1) <= 600, `${budget(1)}s is outside the ten minutes research/13 allows`);
  let prev = 0;
  for (let c = 0; c <= 1.0001; c += 0.1) {
    const b = budget(c);
    assert.ok(b >= prev, "the warm-up never gets shorter with age");
    prev = b;
  }
  /* And the clock wins. A caller with no minutes to spare gets the block it
     always got, with a sentence saying what it could not buy. */
  const squeezed = mobilityFor(day, { ageCaution: 1, maxWarmupSeconds: WARMUP_SECONDS });
  assert.equal(squeezed.warmupBudgetSeconds, WARMUP_SECONDS);
  assert.ok(squeezed.why.some((w) => /did not fit the session length/.test(w)), squeezed.why.join(" | "));
  /* A mean ceiling can never buy minutes back OUT of a warm-up. */
  assert.equal(mobilityFor(day, { ageCaution: 0, maxWarmupSeconds: 60 }).warmupBudgetSeconds, WARMUP_SECONDS);
});

test("a 25, a 45, a 60 and a 75 year old do not get the same week any more", () => {
  /* The whole reason this block exists. Everything else held constant. */
  const base = { goal_bubble: "get-stronger", challenge_target: 3, current_weight: 180, sex: "Male" };
  const at = (age) => generateFromPayload(age == null ? base : { ...base, age }, { today: new Date("2026-09-18T12:00:00Z"), includePlan: true });
  const seen = [25, 45, 60, 75].map(at);
  for (let i = 1; i < seen.length; i++) {
    assert.ok(seen[i].meta.age.rampCaution > seen[i - 1].meta.age.rampCaution, "the dial moves");
  }
  const warm = (o) => o.plan.week.reduce((t, d) => t + d.mobility.warmupSeconds, 0);
  assert.ok(warm(seen[3]) > warm(seen[0]), `75 got ${warm(seen[3])}s of warm-up against 25's ${warm(seen[0])}s`);
  assert.ok(warm(seen[2]) > warm(seen[0]), `60 got ${warm(seen[2])}s against 25's ${warm(seen[0])}s`);
  /* And nothing got smaller. research/02 is emphatic that an older person gets
     a plan that respects recovery, not a smaller plan, so the sets, the reps
     and the movements are the week the 25 year old got. */
  for (const o of seen) {
    for (let i = 0; i < o.plan.week.length; i++) {
      const a = seen[0].plan.week[i], b = o.plan.week[i];
      assert.deepEqual(b.exercises.map((e) => [e.name, e.sets, e.reps, e.weight]), a.exercises.map((e) => [e.name, e.sets, e.reps, e.weight]),
        `age changed the lifting on ${a.name}`);
    }
  }
  /* And the day never runs past the clock it was costed against because of it. */
  const old = at(75);
  for (const d of old.plan.week) {
    if (d.minutes == null) continue;
    const young = seen[0].plan.week.find((x) => x.name === d.name);
    if (young && young.estimatedMinutes > d.minutes) continue;   // already over before age touched it
    assert.ok(d.estimatedMinutes <= d.minutes, `${d.name}: ${d.estimatedMinutes} min against a ${d.minutes} min clock`);
  }
});

test("meta says what the age did, and the ramp really is applied now", () => {
  const out = generateFromPayload({ goal_bubble: "get-stronger", challenge_target: 3, age: 62 }, { today: new Date("2026-09-18T12:00:00Z") });
  assert.equal(out.meta.age.years, 62);
  assert.equal(out.meta.age.known, true);
  assert.ok(out.meta.age.rampCaution > 0.8);
  /* This was false on purpose while the dial was computed and unread, with a
     note telling whoever added the three forwards in plan.mjs to flip it. They
     went in on 2026-09-18, so it is true, and the assertion below is what makes
     it a claim rather than a hope: a 62 year old's increment is smaller than a
     25 year old's on the same lift, measured off the plan rather than the flag. */
  assert.equal(out.meta.age.rampApplied, true);
  const younger = generateFromPayload({ goal_bubble: "get-stronger", challenge_target: 3, age: 25 }, { today: new Date("2026-09-18T12:00:00Z") });
  assert.equal(younger.meta.age.rampApplied, false, "no caution to apply at 25, so nothing was applied");
  const blank = generateFromPayload({ goal_bubble: "get-stronger", challenge_target: 3 }, { today: new Date("2026-09-18T12:00:00Z") });
  assert.equal(blank.meta.age.known, false);
  assert.equal(blank.meta.age.rampCaution, 1);
  assert.equal(blank.meta.age.warmupCaution, 0);
});

/* ---------------------------------------------------------------- *
 * How much work a person gets: the four things that must hold
 * ---------------------------------------------------------------- *
 * Added 2026-09-18 with the change that made the body map's four colours mean
 * four different weeks. Each of these is a claim the engine now makes to a
 * person, and a claim nobody was checking.
 */

/* Straight off knowledge/principles/volume-landmarks.md rather than out of
   plan.mjs, on purpose. A ceiling checked against the constant that produced it
   only proves the constant was used; this checks it against the research, so the
   test still fails if somebody edits the table in plan.mjs to make a week fit.
   Traps and forearms have no row in that file and are not checked here. */
const LANDMARK_MRV = {
  chest: 22, lats: 25, shoulders: 24, quads: 20, hamstrings: 18,
  glutes: 18, biceps: 22, triceps: 20, calves: 22, abs: 20, obliques: 20,
};

const VOLUME_TODAY = new Date("2026-09-18T12:00:00Z");
const DAY_MS = 86400000;
const isoDay = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
/* A person who trains `perWeek` times a week for `weeks` weeks and logs it.
   Real exercise names, because training-age.mjs groups by them. */
function trainingHistory(weeks, perWeek, today = VOLUME_TODAY) {
  const names = ["Barbell Bench Press", "Barbell Back Squat", "Barbell Row", "Overhead Press"];
  const rows = [];
  for (let w = weeks; w >= 1; w--) {
    for (let s = 0; s < perWeek; s++) {
      const date = isoDay(new Date(today.getTime() - (w * 7 - s) * DAY_MS));
      for (const n of names) rows.push({ entry_date: date, exercise_name: n, sets: 3, reps: 8, weight: 100 + 2 * (weeks - w) });
    }
  }
  return rows;
}

test("no week goes over MRV for any muscle, whatever is asked of it", () => {
  /* The one ceiling that is protecting somebody rather than tidying a number.
     Swept against the loudest inputs there are: every tier on every group, the
     longest history the dial reads, and the day counts that train a group most
     often. */
  const goals = ["build-muscle", "get-stronger", "lose-weight", "tone-up"];
  const history = trainingHistory(52, 5);
  let checked = 0;
  for (const goal_bubble of goals) {
    for (const challenge_target of [3, 4, 5]) {
      for (const group of Object.keys(LANDMARK_MRV)) {
        for (const tier of [3, 2, 1]) {
          const out = generateFromPayload({
            goal_bubble, challenge_target, current_weight: 180, sex: "Male",
            logs: history, focus_groups: [`${group}:${tier}`],
          }, { today: VOLUME_TODAY, includePlan: true });
          for (const [g, row] of Object.entries(out.plan.weeklyVolume)) {
            if (LANDMARK_MRV[g] == null) continue;
            checked++;
            assert.ok(row.sets <= LANDMARK_MRV[g],
              `${goal_bubble} ${challenge_target}d ${group}:${tier} put ${g} at ${row.sets} sets, past its MRV of ${LANDMARK_MRV[g]}`);
          }
        }
      }
    }
  }
  assert.ok(checked > 1000, `only ${checked} group weeks checked`);
});

test("none, light, medium and heavy are four different weeks", () => {
  /* A tier that changes nothing is a lie told by a control.
   *
     Before this change the four runs came back with four distinct weekly totals
     in 4.3% of the 1,424 reachable goal x days x group cells, because the week
     was decided one session at a time and rounded: three chest slots can only
     deliver 6, 9, 12 or 15 sets, so 6.8, 8.2, 9.5 and 11.9 were answered 6, 9, 9
     and 12. The week is decided first now and it is 63.8% on the same sweep.
   *
     The rest is the split and not the arithmetic, and the two have to be told
     apart or this test is measuring the slot table. A group gets at most
     MAX_SETS_PER_SESSION sets per movement it appears in, so a week with two
     chest slots tops out at twelve chest sets whatever colour chest is, and for
     somebody far enough along the dial to be asking for twelve already, every
     tier lands there. That ceiling is real (the answer is another chest slot,
     which is a change to what a day is made of) so this asserts the honest
     contract instead: EITHER the colour changes the week, OR the plan says why
     it could not. The second half is checked below and has no exceptions. */
  const cases = [];
  for (const goal_bubble of ["build-muscle", "lose-weight", "get-stronger", "tone-up"]) {
    for (const challenge_target of [3, 4, 5]) {
      for (const group of ["chest", "lats", "quads", "abs", "hamstrings", "shoulders"]) {
        cases.push({ goal_bubble, challenge_target, group });
      }
    }
  }
  const ladderFor = (c, logs) => [null, [`${c.group}:1`], [`${c.group}:2`], [`${c.group}:3`]].map((focus_groups) =>
    generateFromPayload({
      goal_bubble: c.goal_bubble, challenge_target: c.challenge_target,
      current_weight: 180, sex: "Male", logs, focus_groups,
    }, { today: VOLUME_TODAY, includePlan: true }));

  let reachable = 0, four = 0;
  const collapsed = [];
  for (const c of cases) {
    const runs = ladderFor(c, []);
    const ladder = runs.map((out) => out.plan.weeklyVolume[c.group]?.sets ?? 0);
    if (ladder.every((s) => s === 0)) continue;
    reachable++;
    /* Monotone is absolute: a heavier colour can never buy fewer sets. */
    for (let i = 1; i < ladder.length; i++) {
      assert.ok(ladder[i] >= ladder[i - 1],
        `${c.goal_bubble} ${c.challenge_target}d ${c.group}: ${ladder.join(" -> ")} goes backwards`);
    }
    if (new Set(ladder).size === 4) four++;
    else collapsed.push(`${c.goal_bubble} ${c.challenge_target}d ${c.group}: ${ladder.join("/")}`);
  }
  const share = four / reachable;
  assert.ok(share >= 0.6,
    `only ${(100 * share).toFixed(1)}% of ${reachable} cells gave four distinct weekly totals:\n  ${collapsed.join("\n  ")}`);
});

test("a colour that bought nothing is a colour the plan explains", () => {
  /* The other half of the ladder, and the half that has to hold everywhere
     rather than most of the time. Swept over day one and over somebody a year
     in at five days a week, which is where the ceiling binds hardest: red buys
     nothing on 337 of the trained cells there, and `volumeNotes.frequencyCapped`
     names every one of them. Nothing is allowed to be silently inert. */
  const groups = ["chest", "lats", "quads", "abs", "hamstrings", "shoulders", "biceps", "triceps", "calves", "glutes"];
  let inert = 0;
  for (const logs of [[], trainingHistory(52, 5)]) {
    for (const goal_bubble of ["build-muscle", "lose-weight", "get-stronger"]) {
      for (const challenge_target of [3, 4, 5]) {
        for (const group of groups) {
          const at = (focus_groups) => generateFromPayload({
            goal_bubble, challenge_target, current_weight: 180, sex: "Male", logs, focus_groups,
          }, { today: VOLUME_TODAY, includePlan: true }).plan;
          const none = at(null), red = at([`${group}:3`]);
          const before = none.weeklyVolume[group]?.sets ?? 0;
          const after = red.weeklyVolume[group]?.sets ?? 0;
          if (after !== before) continue;
          const where = `${goal_bubble} ${challenge_target}d ${group}`;
          if (after === 0) {
            assert.ok((red.volumeNotes.focusUntrained || []).some((u) => u.group === group),
              `${where}: red trains it nowhere and nothing says so`);
            continue;
          }
          inert++;
          const row = red.weeklyVolume[group];
          const capped = (red.volumeNotes.frequencyCapped || []).some((f) => f.group === group);
          assert.ok(capped || row.sets >= row.target,
            `${where}: red bought nothing, the week is not at its ceiling (${row.sets} of ${row.target}) and no note says why`);
        }
      }
    }
  }
  assert.ok(inert > 0, "nothing was inert at all, which means this test stopped testing anything");
});

test("a focus the split cannot train says so instead of doing nothing quietly", () => {
  /* Lower back used to be the headline case here: no slot in SLOTS named it, so
     marking it red added nothing on every goal and every split, and it added
     nothing silently. It has a slot now (see LOWERBACK_SLOT), so what is left is
     the ordinary version of the same failure: biceps on a three day week, which
     is three full body days and carries no isolation slot at all. A focus cannot
     add a movement the split does not have, and the plan has to say so. */
  const arms = generateFromPayload({
    goal_bubble: "build-muscle", challenge_target: 3, current_weight: 180, sex: "Male",
    logs: [], focus_groups: ["biceps:3"],
  }, { today: VOLUME_TODAY, includePlan: true });
  const untrained = arms.plan.volumeNotes.focusUntrained;
  assert.ok(untrained.some((u) => u.group === "biceps" && u.asked), JSON.stringify(untrained));
  assert.ok(arms.plan.dayNotes.some((n) => n.includes("biceps") && n.includes("bought nothing")),
    arms.plan.dayNotes.join(" | "));
});

/* ---- the lower back slot ----
 *
 * Counted in sets, because sets are what a person does. A test on the slot
 * table would pass whether or not anything reached a card.
 */
const lowerBackSets = (plan) => plan.week.reduce((n, d) =>
  n + d.exercises.filter((e) => e.group === "lowerback").reduce((m, e) => m + e.sets, 0), 0);
const lbPlan = (daysAsked, focus) => generateFromPayload({
  goal_bubble: "build-muscle", challenge_target: daysAsked, current_weight: 180, sex: "Male",
  logs: [], ...(focus ? { focus_groups: focus } : {}),
}, { today: VOLUME_TODAY, includePlan: true }).plan;

test("marking lower back buys lower back, on every day count", () => {
  /* Measured on HEAD before the slot existed: 0 sets at every tier, every goal,
     every split. The picker's Back region spends a lone pick down
     ["lats", "traps", "lowerback"], so this is a colour real people can already
     reach, not a hypothetical one. */
  for (const days of [2, 3, 4, 5]) {
    assert.equal(lowerBackSets(lbPlan(days, null)), 0, `a ${days} day week trains lower back without being asked`);
    const asked = lbPlan(days, ["lowerback:2"]);
    assert.ok(lowerBackSets(asked) >= 6,
      `a ${days} day week marked for lower back got ${lowerBackSets(asked)} sets`);
    assert.ok(asked.weeklyVolume.lowerback, `a ${days} day week has no lower back row in the ledger`);
    /* And the tier still means something once the slot is there. */
    assert.ok(lowerBackSets(lbPlan(days, ["lowerback:3"])) > lowerBackSets(asked),
      `a ${days} day week: red bought no more lower back than yellow`);
  }
});

test("the lower back slot lands on the days that hinge, and on no others", () => {
  /* The erectors are the muscle the hinge already loads, so the direct work
     belongs beside it. A push, pull or upper day getting a back extension would
     be the only thing below the waist on that card, and it would displace arm
     work to get there. */
  for (const days of [4, 5]) {
    const plan = lbPlan(days, ["lowerback:3"]);
    for (const d of plan.week) {
      const has = d.exercises.some((e) => e.group === "lowerback");
      const lower = /Lower|Leg|Full body/.test(d.name);
      assert.equal(has, lower, `${days} day week: ${d.name} ${has ? "has" : "has no"} lower back work`);
    }
    /* Nobody's arm work was deleted to make room: the upper days are untouched. */
    const without = lbPlan(days, null);
    const armSets = (p) => p.week.reduce((n, d) => n + d.exercises
      .filter((e) => e.group === "biceps" || e.group === "triceps").reduce((m, e) => m + e.sets, 0), 0);
    assert.equal(armSets(plan), armSets(without), `${days} day week: the lower back slot cost arm sets`);
  }
});

test("a week nobody asked lower back for is the week it always was", () => {
  /* The slot is conditional so that the blast radius is exactly the people who
     asked. Everybody else gets the same card, which is a property worth
     asserting rather than hoping for days before a launch. */
  const rows = (p) => p.week.map((d) => d.exercises.map((e) => `${e.name}:${e.sets}x${e.reps}`).join("|")).join("//");
  for (const days of [2, 3, 4, 5]) {
    const plain = lbPlan(days, null);
    for (const focus of [["chest:3"], ["glutes:3"], ["biceps:3", "triceps:3"]]) {
      const other = lbPlan(days, focus);
      assert.ok(!other.week.some((d) => d.exercises.some((e) => e.group === "lowerback")),
        `${days} day week with ${focus.join(",")} grew a lower back slot`);
    }
    assert.ok(rows(plain).length > 0);
  }
});

test("the goal that writes bird dog into its own notes can finally prescribe it", () => {
  /* goal-tree.json's `pain` child prioritises ["abs", "glutes", "lowerback"] and
     names bird dog in its plan. Bird Dog has been in the library the whole time
     and was unreachable, because no slot named the group. That is the same class
     of bug as the goal that prescribed the movement its own note warned against,
     and it is now closed for the goal as well as for the tap. */
  for (const bubble of ["feel-better", "move-better"]) {
    const plan = generateFromPayload({
      goal_bubble: bubble, goal_child: "pain", challenge_target: 3, current_weight: 180, sex: "Male", logs: [],
    }, { today: VOLUME_TODAY, includePlan: true }).plan;
    assert.ok(lowerBackSets(plan) > 0, `${bubble}/pain still gets no lower back work`);
  }
});

/* ---- core is one row in the ledger ---- */

test("core has one weekly target, not two half-fed ones", () => {
  /* knowledge/principles/volume-landmarks.md carries a single "Abs/core" row and
     no oblique row anywhere. Two rows meant a person could be shown an oblique
     target of 8 sets that no movement in the pool would ever satisfy, and it
     meant abs at MRV plus obliques at MRV was 40 against a stated ceiling of 20. */
  for (const days of [2, 3, 4, 5]) {
    for (const focus of [null, ["abs:3"], ["obliques:3"]]) {
      const plan = lbPlan(days, focus);
      assert.equal(plan.weeklyVolume.obliques, undefined,
        `a ${days} day week still carries a separate obliques target`);
      assert.ok(plan.weeklyVolume.abs, `a ${days} day week has no core row at all`);
      const real = plan.week.reduce((n, d) => n + d.exercises
        .filter((e) => e.group === "abs" || e.group === "obliques").reduce((m, e) => m + e.sets, 0), 0);
      assert.equal(plan.weeklyVolume.abs.sets, real,
        `a ${days} day week's core row does not count the oblique work beside it`);
      assert.ok(real <= 20, `a ${days} day week prescribes ${real} core sets against an Abs/core MRV of 20`);
    }
  }
});

test("a point spent on obliques buys core, the same as a point spent on abs", () => {
  /* The owner's instruction, and the research agrees with it: "we can sort of
     count it as abs". Before this, the core slot's pool was ranked and every
     abs-tagged movement outranked every oblique one, so an obliques tap asked
     for volume in a group the week was never going to train. */
  for (const days of [2, 3, 4, 5]) {
    const core = (p) => p.weeklyVolume.abs.sets;
    const plain = core(lbPlan(days, null));
    assert.equal(core(lbPlan(days, ["obliques:2"])), core(lbPlan(days, ["abs:2"])),
      `a ${days} day week: obliques and abs do not buy the same core`);
    assert.ok(core(lbPlan(days, ["obliques:2"])) > plain,
      `a ${days} day week: asking for obliques bought nothing`);
  }
});

test("a pick that is all red says what the rest of the budget cannot buy", () => {
  /* Picking Chest spends 3 of the 9 units the picker shows. The other 6 are not
     lost volume: red is the top tier, chest already receives every set the
     multiplier can ask for, and the only thing left to spend on is a second
     group. Silence there is the picker showing nine cells and changing three. */
  const out = generateFromPayload({
    goal_bubble: "build-muscle", challenge_target: 4, current_weight: 180, sex: "Male",
    logs: [], focus_groups: ["chest:3"],
  }, { today: VOLUME_TODAY, includePlan: true });
  assert.ok(out.notes.some((n) => n.includes("chest") && n.includes("top tier")), out.notes.join(" | "));
  /* And it does not fire when the budget really was spent. */
  const spent = generateFromPayload({
    goal_bubble: "build-muscle", challenge_target: 4, current_weight: 180, sex: "Male",
    logs: [], focus_groups: ["chest:3", "lats:3", "shoulders:3"],
  }, { today: VOLUME_TODAY, includePlan: true });
  assert.ok(!spent.notes.some((n) => n.includes("top tier")), spent.notes.join(" | "));
});

test("a person who keeps turning up never gets a smaller week for it", () => {
  /* research/09: the first two weeks decide whether anybody is still here in
     twelve, and the engine used to spend them taking the plan apart.
     `observedCapacity` divided sessions by a flat six weeks whether or not the
     person had existed for six, so eight perfect sessions in a fortnight read as
     1.3 a week, plan.mjs read that as a capacity under the days they asked for,
     and three of the four days went short. Traced week by week the sets went 76,
     76, 52, 69, 81, 87 before settling: a 32% cut in week three, handed to
     somebody who had missed nothing.

     The window runs over the stretch they have actually been training now, so
     this asserts the thing the trace was showing: while somebody is turning up,
     the week never shrinks. */
  const perWeek = 4;
  const logs = [];
  const start = new Date("2026-06-01T12:00:00Z");
  const names = ["Barbell Bench Press", "Barbell Back Squat", "Barbell Row", "Overhead Press"];
  const totals = [];
  for (let w = 0; w < 12; w++) {
    const today = new Date(start.getTime() + w * 7 * DAY_MS);
    const out = generateFromPayload({
      goal_bubble: "build-muscle", challenge_target: perWeek,
      current_weight: 180, sex: "Male", logs,
    }, { today, includePlan: true });
    totals.push(out.plan.week.reduce((n, d) => n + d.exercises.reduce((m, e) => m + e.sets, 0), 0));
    for (let s = 0; s < perWeek; s++) {
      const date = isoDay(new Date(today.getTime() + s * DAY_MS));
      for (const n of names) logs.push({ entry_date: date, exercise_name: n, sets: 3, reps: 8, weight: 100 + 5 * w });
    }
  }
  for (let w = 1; w < totals.length; w++) {
    assert.ok(totals[w] >= totals[w - 1],
      `week ${w + 1} gave ${totals[w]} sets against week ${w}'s ${totals[w - 1]}: ${totals.join(", ")}`);
  }
  /* And it goes up, rather than merely not going down. */
  assert.ok(totals[11] > totals[0] * 1.2, `twelve weeks of perfect attendance moved ${totals[0]} to ${totals[11]}`);
});

test("the capacity read is the rhythm they are actually keeping", () => {
  /* The unit under the test above. Eight sessions in a fortnight is four a week.
     Eight sessions in a fortnight and then three weeks of nothing is not, and
     the window runs to today rather than to the last session so that it says so:
     a lapse has to be visible or the number is only flattering. */
  const today = new Date("2026-09-18T12:00:00Z");
  const keen = deriveTrainingAge({ logs: trainingHistory(2, 4, today), today });
  assert.equal(keen.sessionsPerWeek, 4, `${keen.sessionsPerWeek} a week off eight sessions in a fortnight`);
  assert.equal(observedCapacity(keen), 4);

  const lapsed = deriveTrainingAge({
    logs: trainingHistory(2, 4, new Date(today.getTime() - 21 * DAY_MS)),
    today,
  });
  assert.ok(lapsed.sessionsPerWeek < 2, `a three week gap still read as ${lapsed.sessionsPerWeek} a week`);
  assert.ok(lapsed.sessionsPerWeek > 1, `and it is not zero either: ${lapsed.sessionsPerWeek}`);
});

/* =========================================================================
 * The clock, 2026-09-19: the number on the card is the number on the app
 * ========================================================================= */

/* What the app prints: the lifting, the built warm-up, the ramp and the built
   cool-down, in real seconds. index.html's `sessionEstimateMinutes` is this
   arithmetic (minus the feeler term, see `meta.session.feelerMinutes`). */
const appMinutes = (d) => {
  const ramp = (d.rampSets || []).reduce((t, r) => t + r.seconds, 0);
  return Math.round((sessionSeconds(d.exercises) + d.mobility.warmupSeconds + ramp + d.mobility.cooldownSeconds) / 60);
};

test("fits is true only when the whole visit is about the number they asked for", () => {
  /* Across 1,100 runs with a stated clock, 69% of days landed five or more
     minutes over the ask and 47% of those said fits: true. Three minutes is
     "about"; one more for the rounding between two sums. */
  let fitting = 0;
  for (const bubble of ["build-muscle", "get-stronger", "lose-weight", "tone-lean-abs"]) {
    for (const days of [3, 4]) {
      for (const logs of [[], longHistory(26)]) {
        for (const clock of [30, 45, 60]) {
          const plan = buildPlan({ goal: { bubble }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: days, sessionMinutes: clock }, logs });
          for (const d of plan.week) {
            if (d.short) continue;
            const fits = !plan.volumeNotes.overBudget.some((o) => o.day === d.name);
            if (!fits) continue;
            fitting++;
            assert.ok(appMinutes(d) <= clock + 4,
              `${bubble} ${days}d ${logs.length ? "trained" : "day one"} at ${clock}: ${d.name} says it fits and the app would print ${appMinutes(d)}`);
            assert.equal(d.totalMinutes, d.estimatedMinutes + Math.round(d.mobility.cooldownSeconds / 60));
          }
        }
      }
    }
  }
  assert.ok(fitting > 20, `only ${fitting} days fit at all, which means the clock is now impossible rather than honest`);
});

test("a 20 minute ask is refused out loud rather than built for 25 and called a fit", () => {
  const plan = buildPlan({
    goal: { bubble: "build-muscle" },
    person: { daysAsked: 3, bodyWeightLb: 180, sex: "Male", sessionMinutes: 20 },
    logs: longHistory(26),
  });
  assert.equal(plan.sessionBudget.minutes, 25);
  assert.equal(plan.sessionBudget.asked, 20);
  const full = plan.week.filter((d) => !d.short);
  for (const d of full) {
    const row = plan.volumeNotes.overBudget.find((o) => o.day === d.name);
    assert.ok(row, `${d.name} was built for 25 against a 20 and not listed as not fitting`);
    assert.match(row.why, /There is no session that short/);
    assert.match(row.why, /You asked for 20/);
  }
  const out = generateFromPayload({
    goal_bubble: "build-muscle", challenge_target: 3, current_weight: 180, sex: "Male", logs: longHistory(26), session_minutes: 20,
  }, { today: VOLUME_TODAY });
  assert.equal(out.meta.session.fits, false);
  assert.equal(out.meta.session.asked, 20);
});

test("feeler sets are costed on a lift that has no weight yet", () => {
  assert.ok(feelerSeconds({ loadBasis: "unknown" }) >= 90, "two light sets and their rests is minutes, not seconds");
  assert.equal(feelerSeconds({ loadBasis: "bodyweight" }), 0);
  assert.equal(feelerSeconds({ loadBasis: "your last session" }), 0);
  assert.equal(feelerSeconds({}), 0);
  /* Day one: a couple of lifts a day carry no number, and the minutes spent
     finding one are on the estimate and on the response. */
  const out = generateFromPayload({
    goal_bubble: "build-muscle", challenge_target: 4, current_weight: 180, sex: "Male", logs: [],
  }, { today: VOLUME_TODAY, includePlan: true });
  assert.ok(out.meta.session.feelerMinutes >= 2, `day one carries ${out.meta.session.feelerMinutes} feeler minutes`);
  const d = out.plan.week[0];
  const withoutFeelers = Math.round(d.prepMinutes + d.exercises.reduce((t, e) => t + exerciseSecondsWithout(e), 0) / 60);
  assert.ok(d.estimatedMinutes > withoutFeelers, "the estimate is not the same number with the feelers taken out");
});
/* The costing without the feeler term, so the test above can measure it. */
const exerciseSecondsWithout = (e) => sessionSeconds([{ ...e, loadBasis: "bodyweight" }]);

test("the needs-less-than-that sentence is per day, or true of every day", () => {
  /* Build muscle, four days at 60, ran 69, 68, 60 and 54 with the note
     printed off the one day it was true of. */
  for (const clock of [60, 90]) {
    const plan = buildPlan({
      goal: { bubble: "build-muscle" },
      person: { daysAsked: 4, bodyWeightLb: 180, sex: "Male", sessionMinutes: clock },
      logs: longHistory(78),
    });
    const note = plan.dayNotes.find((n) => /the training itself needs less than/.test(n));
    if (!note) continue;
    const bought = (plan.volumeNotes.timeBought || []).filter((t) => t.bought === "cooldown").length;
    const fullDays = plan.week.filter((d) => !d.short).length;
    if (bought >= fullDays) assert.match(note, /^You asked for/);
    else assert.match(note, /^On .* the training itself needs less/, `${bought} of ${fullDays} days bought the block and the note says: ${note}`);
  }
});

test("when the clock takes sets the dial wanted, the plan says which lever they hold", () => {
  const plan = buildPlan({
    goal: { bubble: "build-muscle" },
    person: { daysAsked: 4, bodyWeightLb: 180, sex: "Male", sessionMinutes: 30 },
    logs: longHistory(78),
  });
  assert.ok(plan.volumeNotes.under.length, "a trained four day week at 30 minutes is under target somewhere");
  assert.ok(plan.dayNotes.some((n) => /More sets need more time on the clock or another day/.test(n)),
    plan.dayNotes.join(" | "));
  /* Said once, not per day. */
  assert.equal(plan.dayNotes.filter((n) => /More sets need more time on the clock/.test(n)).length, 1);
});

/* =========================================================================
 * The deload, built rather than promised
 * ========================================================================= */

/* Completed plans on Monday, Wednesday and Friday of each of the `weeks`
   calendar weeks before `today`. */
const trainedWeeksOfPlans = (weeks, today) => {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const out = [];
  for (let w = 1; w <= weeks; w++) {
    for (const off of [0, 2, 4]) {
      const d = new Date(monday); d.setDate(d.getDate() - w * 7 + off);
      const iso = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      out.push({ entry_date: iso, completed_at: iso, exercises: [] });
    }
  }
  return out;
};

test("trained weeks are counted off the plans history, back to the first week off", () => {
  const today = new Date(2026, 8, 17, 12);
  assert.equal(trainedWeeksBefore([], today), 0);
  assert.equal(trainedWeeksBefore(trainedWeeksOfPlans(6, today), today), 6);
  /* A week with nothing completed ends the run. */
  const gap = trainedWeeksOfPlans(6, today).filter((p) => !trainedWeeksOfPlans(3, today).some((q) => q.entry_date === p.entry_date) || true);
  const withGap = trainedWeeksOfPlans(6, today).filter((p) => {
    const inWeekThree = trainedWeeksOfPlans(3, today).slice(6).some((q) => q.entry_date === p.entry_date);
    return !inWeekThree;
  });
  assert.equal(trainedWeeksBefore(withGap, today), 2, `${gap.length} rows with week three missing`);
  /* A row marked as a deload ends it too. */
  const marked = trainedWeeksOfPlans(6, today).map((p, i) => (i >= 12 && i < 15 ? { ...p, deload: true } : p));
  assert.equal(trainedWeeksBefore(marked, today), 4);
  /* Rows without completed_at are not evidence, and the current week is not counted. */
  const unfinished = trainedWeeksOfPlans(6, today).map((p) => ({ entry_date: p.entry_date, exercises: [] }));
  assert.equal(trainedWeeksBefore(unfinished, today), 0);
});

test("a ten week replay builds week seven lighter and says so, and week eight is back", () => {
  const today = new Date(2026, 8, 17, 12);
  const daysAgo = (n) => { const d = new Date(today.getTime() - n * 86400000); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  /* Past linear progression, so a deload is on the schedule at all. */
  const logs = Array.from({ length: 70 }, (_, i) => ({ entry_date: daysAgo(1 + (69 - i) * 2), exercise_name: "Bench Press", weight: 135 + Math.min(i, 20) * 5, reps: 8 }));
  const build = (weeks) => buildPlan({
    goal: { bubble: "get-stronger" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 },
    logs, plans: trainedWeeksOfPlans(weeks, today), today,
  });
  const sets = (plan) => plan.week.reduce((t, d) => t + d.exercises.reduce((s, e) => s + e.sets, 0), 0);
  const loadOf = (plan, name) => plan.week.flatMap((d) => d.exercises).find((e) => e.name === name)?.weight ?? null;

  const week6 = build(5);
  const week7 = build(6);
  const week8 = build(7);
  assert.ok(week6.deload && week6.deload.week === false, JSON.stringify(week6.deload));
  assert.equal(week7.deload.week, true);
  assert.equal(week7.deload.trainedWeeks, 6);
  assert.equal(week8.deload.week, false);

  const ratio = sets(week7) / sets(week6);
  assert.ok(ratio >= 0.55 && ratio <= 0.8, `week seven is ${sets(week7)} sets against ${sets(week6)} the week before (${ratio.toFixed(2)})`);
  assert.equal(sets(week8), sets(week6), "week eight is the full week again");
  for (const d of week6.week) {
    for (const e of d.exercises) {
      if (!(e.weight > 0)) continue;
      const lighter = loadOf(week7, e.name);
      if (lighter == null) continue;
      assert.ok(lighter <= e.weight * 0.92 && lighter >= e.weight * 0.85, `${e.name}: ${e.weight} became ${lighter} on the deload week`);
      assert.equal(loadOf(week8, e.name), e.weight, `${e.name} is back to ${e.weight} the week after`);
    }
  }
  assert.ok(week7.dayNotes.some((n) => /deload week/.test(n) && /next week goes back up/i.test(n)), week7.dayNotes.join(" | "));
  assert.ok(!week8.dayNotes.some((n) => /deload week/.test(n)));
  /* Somebody still on linear progression is never deloaded, however many
     weeks in a row they have trained. */
  const still = buildPlan({
    goal: { bubble: "get-stronger" }, person: { bodyWeightLb: 180, sex: "Male", daysAsked: 3 },
    logs: [], plans: trainedWeeksOfPlans(6, today), today,
  });
  assert.equal(still.deload, null);
});

/* =========================================================================
 * The talkative half, on the response
 * ========================================================================= */

test("the response carries the deload, the progression and the ledger", () => {
  const out = generateFromPayload({
    goal_bubble: "build-muscle", challenge_target: 4, current_weight: 180, sex: "Male", logs: longHistory(26),
  }, { today: VOLUME_TODAY, includePlan: true });
  assert.deepEqual(out.meta.progression, out.plan.progression);
  assert.deepEqual(out.meta.deload, out.plan.deload);
  assert.deepEqual(out.meta.volume, {
    byGroup: out.plan.weeklyVolume, under: out.plan.volumeNotes.under, frequencyCapped: out.plan.volumeNotes.frequencyCapped,
  });
  assert.ok(Object.keys(out.meta.volume.byGroup).length > 5, "the ledger is not empty");
  assert.equal(typeof out.meta.session.feelerMinutes, "number");
  /* Day one: linear, no deload, and the keys are still there. */
  const first = generateFromPayload({ goal_bubble: "build-muscle", challenge_target: 4, current_weight: 180, sex: "Male", logs: [] }, { today: VOLUME_TODAY });
  assert.equal(first.meta.deload, null);
  assert.equal(first.meta.progression.rule, "linear");
  assert.ok(Array.isArray(first.meta.volume.under));
  /* Nothing in `workout` or `notes` changed shape for it. */
  assert.ok(Array.isArray(first.notes));
  assert.ok(!("deload" in first.workout) && !("progression" in first.workout) && !("volume" in first.workout));
});
