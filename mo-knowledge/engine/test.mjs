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
import { resolveGoal, GOAL_PARAMS, MAX_SECONDARY_GOALS, MOVEMENT_CLASSES, barredMovements, movementCautionNotes } from "./goal-engine.mjs";
import { coldStart1RM, prescribeLoad, patternFor, variantFactor, roundLoad } from "./load.mjs";
import { buildPlan } from "./plan.mjs";
import { conjunctiveWeek, chooseComparison, sharedSchedule, relativeScore, PRODUCTIVE_GAP } from "./pair.mjs";

import { normalizeFocus, parseFocus, mergePriority, focusFreshness, MUSCLE_GROUPS, TIERS, TIER_COST, FOCUS_BUDGET } from "./focus.mjs";
import { mobilityFor, pickBlock, moveSeconds, stripMobility, WARMUP_SECONDS, COOLDOWN_SECONDS, MOBILITY_GOAL_SECONDS, MOBILITY_CHILDREN, MIN_MOVES, MAX_MOVES } from "./mobility.mjs";
import { scoreAlternatives } from "./alternatives.mjs";
import { learnPreferences, applyPreferences, avoidNote, SOFT_AT, HARD_AT } from "./preferences.mjs";
import { planPlateauResponse, applyRotateFallback, PLATEAU_RESPONSE } from "./plateau-response.mjs";
import { BODY_AREAS, EQUIPMENT_OPTIONS, normalizeLimits, applyLimits, limitsSummary, softenedNote } from "./limits.mjs";
import { JOINTS, JOINT_LOAD, defaultJointLoad } from "./joint-load.mjs";
import { joinPlanToActual, calibrateExercise, calibrate, stepFor, STEP_ISOLATION, STEP_COMPOUND, STEP_HEAVY } from "./calibrate.mjs";
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
    "Archer Push-Up", "Barbell Bench Press", "Bench Dip", "Close-Grip Bench Press",
    "Decline Barbell Press", "Decline Dumbbell Press", "Diamond Push-Up", "Dip",
    "Dumbbell Bench Press", "Incline Barbell Press", "Incline Dumbbell Press",
    "Incline Push-Up", "Landmine Press", "Machine Chest Press", "One-Arm Push-Up",
    "Pseudo Planche Push-Up", "Push-Up", "Wall Push-Up", "Weighted Dip",
  ],
  verticalPush: [
    "Arnold Press", "Cuban Press", "Dumbbell Shoulder Press", "Handstand Push-Up",
    "Machine Shoulder Press", "Overhead Press", "Push Press", "Seated Dumbbell Press",
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
test("an incline press is priced against the bench, not against a curl", () => {
  const person = { reps: 8, bodyWeightLb: 180, sex: "Male", level: "beginner", logs: [] };
  const flat = prescribeLoad({ exercise: { name: "Dumbbell Bench Press", equipment: "dumbbell" }, ...person });
  const incline = prescribeLoad({ exercise: { name: "Incline Dumbbell Press", equipment: "dumbbell" }, ...person });
  const curl = prescribeLoad({ exercise: { name: "Dumbbell Curl", equipment: "dumbbell" }, ...person });
  assert.ok(incline.weight > curl.weight * 2, `incline ${incline.weight} vs curl ${curl.weight}`);
  assert.ok(incline.weight >= flat.weight * 0.7, `incline ${incline.weight} vs flat ${flat.weight}`);
  assert.ok(incline.weight <= flat.weight, `incline ${incline.weight} should not exceed flat ${flat.weight}`);
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

/* The fuzz run of 2026-09-12: one logged Goblet Squat at 200 lb turned into an
   870 lb Leg Press for a 180 lb man the engine itself called a beginner. Every
   assertion here is on the pounds that come out, never on a ratio or a factor,
   because the ratios were all doing what they were told and the number was still
   one nobody can lift. */
test("a load extrapolated from one row of a different lift is capped, and says so", () => {
  const logs = [{ entry_date: day(-4), exercise_name: "Goblet Squat", weight: 200, reps: 10 }];
  const r = prescribeLoad({
    exercise: { name: "Leg Press", equipment: "machine" }, reps: 10,
    bodyWeightLb: 180, sex: "Male", level: "beginner", logs,
  });
  assert.equal(r.capped, true);
  assert.ok(r.weight < 500, `capped leg press was ${r.weight}`);
  assert.match(r.note, /guess/i);
});

test("three rows behind a guess buy it more room than one row does", () => {
  const at = (name, weight, d) => ({ entry_date: day(d), exercise_name: name, weight, reps: 10 });
  const person = { exercise: { name: "Leg Press", equipment: "machine" }, reps: 10, bodyWeightLb: 180, sex: "Male", level: "beginner" };
  const one = prescribeLoad({ ...person, logs: [at("Goblet Squat", 200, -4)] });
  const three = prescribeLoad({ ...person, logs: [at("Goblet Squat", 200, -4), at("Goblet Squat", 200, -7), at("Goblet Squat", 200, -10)] });
  assert.equal(one.capped, true);
  assert.ok(three.weight > one.weight, `three rows ${three.weight} should beat one row ${one.weight}`);
});

test("an ordinary guess from a similar lift is not capped and does not gain a caveat", () => {
  const logs = [{ entry_date: day(-4), exercise_name: "Goblet Squat", weight: 50, reps: 10 }];
  const r = prescribeLoad({
    exercise: { name: "Barbell Back Squat", equipment: "barbell" }, reps: 10,
    bodyWeightLb: 180, sex: "Male", level: "beginner", logs,
  });
  assert.equal(r.capped, false);
  assert.doesNotMatch(r.note, /held here/);
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
        bodyWeightLb: 180, sex: "Male", level: "beginner", logs,
      });
      const targetWeight = JSON.parse(JSON.stringify({ targetWeight: r.weight ?? 0 })).targetWeight;
      assert.equal(typeof targetWeight, "number", `${name} from ${weight} gave ${targetWeight}`);
      assert.ok(Number.isFinite(targetWeight), `${name} from ${weight} gave ${targetWeight}`);
      assert.ok(targetWeight <= 1500, `${name} from ${weight} gave ${targetWeight}`);
    }
  }
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
  const plan = buildPlan({ goal: { bubble: "get-stronger", child: null }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 3 }, logs: manySessions(80) });
  const names = plan.week.map((d) => d.name);
  assert.deepEqual(names, ["Push day", "Pull day", "Leg day"], "the fixture really is a push/pull/legs split");
  const [push, pull, legs] = plan.week.map((d) => d.mobility.warmup.map((m) => m.name));
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
  const plan = buildPlan({ goal: { bubble: "get-stronger", child: null }, person: { bodyWeightLb: 190, sex: "Male", daysAsked: 3 }, logs: manySessions(80) });
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
  const out = generateFromPayload(
    { goal_bubble: "build-muscle", challenge_target: 3, current_weight: 195, sex: "Male", logs: longHistory(78) },
    { today, includePlan: true },
  );
  assert.equal(out.meta.level, "advanced", "the history reaches the level the finding is about");
  const capped = out.plan.volumeNotes.frequencyCapped;
  assert.ok(capped.length, "the three day split caps somebody");
  const tri = capped.find((c) => c.group === "triceps");
  assert.ok(tri, "triceps is one of them on Push/Pull/Legs");
  assert.equal(tri.sessions, 1, "and it is trained once");
  assert.ok(tri.wanted > tri.target, `the level wanted ${tri.wanted} and the week aims at ${tri.target}`);
  /* The ledger carries both numbers, so nothing downstream has to guess which
     of the two it is looking at. */
  assert.equal(out.plan.weeklyVolume.triceps.target, tri.target);
  assert.equal(out.plan.weeklyVolume.triceps.wanted, tri.wanted);
  /* And it reaches the person rather than only the ledger. */
  assert.ok(out.notes.some((n) => /top out below what your level/.test(n)), "a dayNote says it out loud");
  /* A capped group is not also reported as a shortfall the week could have
     closed: that was the double-counting the finding is about. */
  for (const u of out.plan.volumeNotes.under) {
    assert.ok(!capped.some((c) => c.group === u.group), `${u.group} is either capped or short, never filed as both`);
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
     that would fill the obliques slot is intermediate. The slot goes, and the
     day says so. */
  const plan = buildPlan({
    goal: { bubble: "feel-better", child: "pain" },
    person: { daysAsked: 3, bodyWeightLb: 160 }, equipment: ["cable"],
  });
  const names = plan.week.flatMap((d) => d.exercises.map((e) => e.name.toLowerCase()));
  assert.ok(!names.includes("cable crunch"), "the barred movement did not come back as the fallback");
  assert.ok(plan.dayNotes.some((n) => /has no abs exercise in it/.test(n)), "the missing slot is said out loud");
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
  const plan = buildPlan({
    goal: { bubble: "build-muscle", child: "build-overall" },
    person: { daysAsked: 3, bodyWeightLb: 170, sex: "Male" },
    logs: longHistory(78), limits: { hurts: ["wrist"], missing: ["none"] },
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
  assert.equal(plan.sessionBudget.goalMinutes, 60, "the goal's own number is still reported");
  for (const d of plan.week) assert.equal(d.short ? Math.round(30 * 0.6) : 30, d.minutes);
});

test("a short answer takes sets off the mains before it touches the rest, and never below three", () => {
  const plan = buildPlan({
    goal: { bubble: "consistent", child: "no-time" },
    person: { daysAsked: 2, bodyWeightLb: 180, sex: "Male", sessionMinutes: 30 },
    logs: longHistory(78),
  });
  const day = plan.week[0];
  assert.ok(day.estimatedMinutes <= 30 * 1.15, `${day.estimatedMinutes} against 30`);
  assert.ok(day.exercises.every((e) => e.sets >= 2), "nothing went under the accessory floor");
  /* This is the day the README's known limit was written about: four mains at
     six sets, 48 minutes against a 25 minute goal. Sets alone buy 30 minutes,
     so the rest is untouched and nothing is said about it. */
  assert.deepEqual(plan.volumeNotes.restCompressed, [], "sets alone were enough");
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
  assert.equal(tiny.sessionBudget.minutes, 15);
  assert.equal(tiny.sessionBudget.asked, 5);
  assert.ok(tiny.dayNotes.some((n) => /There is no session that short/.test(n)));
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
