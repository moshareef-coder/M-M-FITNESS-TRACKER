/* The exhaustive sweep. `test.mjs` asks whether each module keeps its own
 * contract; this asks whether the whole stack keeps the app's contract across
 * every input a real person can produce, which is a different question and the
 * one that was never being asked.
 *
 * Run it:  node mo-knowledge/engine/sweep.mjs
 * Exit 1 on any FAIL. Warnings never fail: they are the states the engine is
 * deliberately honest about (a day over its time budget, a group short of its
 * weekly target) and the point of counting them is to watch the number move,
 * not to block a commit on it.
 *
 * Why a script and not more `node:test` cases. A test names one input and one
 * expectation, and the failure mode this file exists to catch is the input
 * nobody thought to name: the goal child crossed with the day count crossed
 * with the history length crossed with a bad shoulder. There are 53 goal
 * selections alone. A sweep says "every one of these, and here are the five
 * inputs that broke" and hands back something reproducible, which is what a
 * bug report needs and what a red assert is not.
 *
 * Node only. It reads node:fs for nothing and imports nothing outside this
 * folder except the library plan.mjs already reads, but it is never vendored
 * into the edge function, so it is free to be as slow and as thorough as it
 * needs to be.
 */
import { TRAININGS } from "../../knowledge/exercise-library/index.mjs";
import { generateFromPayload } from "./adapter.mjs";
import { buildPlan } from "./plan.mjs";
import { calibrate } from "./calibrate.mjs";
import { learnPreferences } from "./preferences.mjs";
import { jointLoadFor } from "./joint-load.mjs";
import { MUSCLE_GROUPS } from "./focus.mjs";
import { buildMuscleIndex, muscleRecoveryStates } from "./recovery.mjs";
import { readFileSync } from "node:fs";
import { clientGoalCases } from "./client-goals.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/* One fixed clock for the whole run. Two of the invariants below (recovery and
   determinism) are answers about hours, so a sweep that read the wall clock
   would give a different verdict at 17:00 than at 19:00 and could not be
   reproduced from the input it printed. Local noon rather than UTC, because
   recovery.mjs parses an entry_date as local 18:00 and the two have to agree.
   See the rest audit: this same local-18:00 assumption is why two tests in
   test.mjs go red every evening. */
const TODAY = new Date(2026, 8, 10, 12, 0, 0);
const DAY_MS = 86400000;
const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ *
 * The space
 * ------------------------------------------------------------------ */

/* The goals are read out of the tree rather than typed here, for the same
   reason demo.mjs --check exists: two files describing the same bubbles drift,
   and a sweep that swept a stale list would be reporting on a goal set nobody
   ships. Every bubble contributes its children plus the bubble on its own,
   because the bubble default is a parameter set a real user can land on (they
   tapped the tile and never picked a child) and it is the one no test names.
 *
 * AND OUT OF THE PICKER, 2026-09-15. The tree was the only source until today,
 * and the tree is the research rather than the product: it has nine bubbles and
 * the picker has eight, two of which (`build-endurance`, `move-better`) exist
 * in no bubble at all. So this sweep ran 10,421 plans without once building the
 * two goals that were broken in production, and reported CLEAN while every user
 * who tapped either got the habit plan. A sweep that cannot see what the app
 * sends is measuring a different app.
 *
 * Both lists, de-duplicated on the pair, because both are real inputs: the tree
 * ids are what live profiles from before the rewrite still carry, and the
 * picker ids are what every profile written since carries. */
function goalCases() {
  const tree = JSON.parse(readFileSync(join(here, "../goals/goal-tree.json"), "utf8"));
  const out = [];
  const seen = new Set();
  const add = (id, goal_bubble, goal_child) => {
    const key = `${goal_bubble}|${goal_child ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ id, goal_bubble, goal_child });
  };
  for (const bubble of tree.bubbles || []) {
    add(`${bubble.id}/_default`, bubble.id, null);
    for (const child of bubble.children || []) add(`${bubble.id}/${child.id}`, bubble.id, child.id);
  }
  for (const c of clientGoalCases()) add(c.id, c.goal_bubble, c.goal_child);
  return out;
}

/* Real names, because a synthetic log of "Exercise 4" is invisible to both the
   things that read logs: training-age.mjs needs a name it can group by, and
   recovery.mjs looks the name up in the library's own muscle tags and
   contributes nothing at all when it misses. A sweep on fake names would be
   sweeping the no-history path four times over and calling it four levels. */
const LOG_NAMES = [
  "Barbell Bench Press", "Barbell Back Squat", "Barbell Row", "Overhead Press",
  "Romanian Deadlift", "Lat Pulldown", "Dumbbell Curl", "Leg Press",
];

/* Weight climbs one step every six sessions. Slower than that and everything
   reads as a plateau, which drags the whole sweep down the plateau-response
   branch and stops it being a sweep of anything else; faster and
   `linearProgress` calls it still-linear and pins even the 18 month person at
   novice, which would leave two of the four levels untested. Six is the value
   where the four history levels land on beginner, beginner, intermediate and
   advanced with no stall detected, which is the spread the level invariant
   needs to be able to see an inversion at all. */
function syntheticLogs(weeks) {
  if (!weeks) return [];
  const logs = [];
  const total = weeks * 3;                       // three sessions a week, gaps of 2 to 3 days
  for (let s = 0; s < total; s++) {
    const back = Math.round((total - 1 - s) * (7 / 3));
    const date = isoLocal(new Date(TODAY.getTime() - back * DAY_MS));
    for (let k = 0; k < 4; k++) {
      logs.push({
        entry_date: date,
        exercise_name: LOG_NAMES[(s * 4 + k) % LOG_NAMES.length],
        sets: 3, reps: 8, weight: 100 + 5 * Math.floor(s / 6),
      });
    }
  }
  return logs;
}

/* Built once and shared. The engine reads logs and never writes to them (every
   sort in training-age.mjs and adapter.mjs is on an array it just built), and
   regenerating 936 rows per combination would be most of the run time. The
   no-mutation assumption is checked once at the end rather than assumed.
   Known gap in the coverage, said out loud rather than left to be noticed: the
   four lengths land on beginner, beginner, intermediate and advanced, so the
   NOVICE band is never swept. It is 20 to 60 effective sessions, which at three
   a week is weeks 7 to 20, and it falls between "3 weeks" and "6 months". Worth
   a fifth history if this ever grows one. */
const HISTORY = [
  { id: "none", weeks: 0 },
  { id: "3weeks", weeks: 3 },
  { id: "6months", weeks: 26 },
  { id: "18months", weeks: 78 },
].map((h) => ({ ...h, logs: syntheticLogs(h.weeks) }));

const SEXES = ["Male", "Female", null];
const WEIGHTS_LB = [130, 195, null];

const LIMIT_CASES = [
  { id: "none", limits: null },
  { id: "shoulder", limits: { hurts: ["shoulder"], missing: [] } },
  { id: "knee+lowerback", limits: { hurts: ["knee", "lowerback"], missing: [] } },
  { id: "no-barbell", limits: { hurts: [], missing: ["barbell"] } },
  { id: "bodyweight-only", limits: { hurts: [], missing: ["none"] } },
  {
    id: "everything",
    limits: {
      hurts: ["shoulder", "elbow", "wrist", "neck", "lowerback", "hip", "knee", "ankle"],
      missing: ["barbell", "dumbbell", "cable", "machine", "none"],
    },
  },
];

const FOCUS_CASES = [
  { id: "none", groups: null },
  { id: "arms", groups: ["biceps", "triceps"] },
  { id: "glutes", groups: ["glutes"] },
];

const DAY_COUNTS = [2, 3, 4, 5, 6];

/* ------------------------------------------------------------------ *
 * Sampling, stated out loud
 * ------------------------------------------------------------------ *
 * The full cross is 53 goals x 5 day counts x 4 histories x 3 sexes x 3
 * bodyweights x 6 limits x 3 focus cases = 171,720 runs, and at about 3 ms a
 * run with a determinism re-run on top that is over twenty minutes. So:
 *
 *   goal x days x history x limits  is EXHAUSTIVE (6,360 cells).
 *   sex, bodyweight and focus are cycled round robin across those cells, so
 *   every value of each is exercised thousands of times and every PAIR of
 *   (sex, bodyweight, focus) appears, just not against every goal.
 *
 * The round robin index is deliberately computed WITHOUT the history index, so
 * the four histories inside one cell describe the same person with a longer
 * past. That is the only way the level-monotonicity invariant means anything:
 * comparing a 130 lb woman with no logs against a 195 lb man with eighteen
 * months would not be an inversion, it would be two different people.
 *
 * Five smaller blocks then cover what a round robin cannot: matched focus
 * pairs, the three focus tiers against each other, trained-yesterday recovery,
 * the focus day request, and determinism.
 */

/* ------------------------------------------------------------------ *
 * Bookkeeping
 * ------------------------------------------------------------------ */

const FAIL = "fail";
const WARN = "warn";

/* A third state, and the reason it exists rather than a second WARN.
 *
 * Two of the invariants added on 2026-09-12 fire on live code, and the fix for
 * each is in a file this sweep does not own. A FAIL would paint the gate red for
 * everybody working in the tree today over a bug none of them introduced, and a
 * permanently red instrument is one nobody reads, which is the failure this
 * whole exercise is about. A WARN would file a broken promise next to "the four
 * day split repeats Step-Up", which is not the same kind of fact.
 *
 * So they are FAILs, written as FAILs, counted apart, and printed in their own
 * section with what is wrong and where. Deleting a line from this map turns one
 * back into a gate-breaking FAIL, and that is the whole of the fix procedure:
 * fix the module, delete the line, watch it stay green. Nothing else in this
 * file knows the difference. */
/* Empty, and kept rather than deleted. Every entry it ever held was closed on
   2026-09-12 by the change that switched calibration on:

     adapter-drops-plans / adapter-drops-swaps  the two missing arguments, now
       passed, so calibration and preferences.mjs are reachable from a payload.
     back-off-added-sets  the back-off moved to the last pass in plan.mjs, so
       nothing downstream can hand back what it took.
     plateau-rep-range-not-applied  plan.mjs prescribes the rep range the note
       promises, at prescription time so the load follows it.

   All four are live FAIL-on-regression checks now. The mechanism stays because
   the lesson does: a failure the sweep can see and name is worth more than a
   gate that is permanently red, and the next real finding should land here
   rather than in a comment somewhere. */
const KNOWN_OPEN = new Map([]);

const results = new Map();   // invariant -> { fail: [], warn: [], open: [], fails, warns, opens }

function record(kind, invariant, input, detail) {
  let row = results.get(invariant);
  if (!row) { row = { fail: [], warn: [], open: [], fails: 0, warns: 0, opens: 0 }; results.set(invariant, row); }
  if (kind === FAIL && KNOWN_OPEN.has(invariant)) { row.opens++; if (row.open.length < 5) row.open.push({ input, detail }); }
  else if (kind === FAIL) { row.fails++; if (row.fail.length < 5) row.fail.push({ input, detail }); }
  else { row.warns++; if (row.warn.length < 5) row.warn.push({ input, detail }); }
}
const fail = (inv, input, detail) => record(FAIL, inv, input, detail);
const warn = (inv, input, detail) => record(WARN, inv, input, detail);

/* ------------------------------------------------------------------ *
 * Library lookups the workout shape does not carry
 * ------------------------------------------------------------------ */

/* toWorkout hands the app a name and nothing about the movement, so equipment
   and joint load have to be looked back up by name.
   All the entries for a name, not the first one. Fourteen names appear in more
   than one library and two of them differ in the only field this check reads:
   Walking Lunge and Bulgarian Split Squat are dumbbell in weight-training and
   bodyweight in calisthenics. Taking the first hit called 464 correct
   bodyweight-only picks a violation, which is a bug in this file rather than in
   the engine, and it is worth a note in its own right: the workout the app
   receives carries a name that does not say which of the two it is. */
const BY_NAME = new Map();
for (const t of TRAININGS) {
  for (const cat of t.categories || []) {
    for (const ex of cat.exercises || []) {
      const key = String(ex.name || "").trim().toLowerCase();
      if (!key) continue;
      if (!BY_NAME.has(key)) BY_NAME.set(key, []);
      BY_NAME.get(key).push({ ...ex, training: t.id });
    }
  }
}
const lookup = (name) => BY_NAME.get(String(name || "").trim().toLowerCase()) || [];
const MUSCLE_INDEX = buildMuscleIndex(TRAININGS);
const GROUP_SET = new Set(MUSCLE_GROUPS);
const LEVEL_RANK = { beginner: 0, novice: 1, intermediate: 2, advanced: 3 };

/* ------------------------------------------------------------------ *
 * The invariants, run over one result
 * ------------------------------------------------------------------ */

/* Every ratio the ledger produced, so the distribution can be reported by
   level and day count rather than as one number that hides which corner of the
   space is short. */
const ratios = [];   // { level, days, group, ratio }

function checkOne(input, out) {
  const w = out.workout;

  /* ---- the day the app is handed ---- */
  if (!w || !Array.isArray(w.exercises)) { fail("workout-shape", input, "no exercises array"); return; }
  if (w.exercises.length < 3 || w.exercises.length > 6) {
    fail("exercise-count", input, `${w.exercises.length} exercises on ${w.focus}`);
  }
  const seenToday = new Set();
  for (const e of w.exercises) {
    if (typeof e.name !== "string" || !e.name.trim()) fail("exercise-shape", input, `name ${JSON.stringify(e.name)}`);
    if (!Number.isInteger(e.sets) || e.sets < 1) fail("exercise-shape", input, `${e.name} sets ${JSON.stringify(e.sets)}`);
    if (!Number.isInteger(e.reps) || e.reps < 1) fail("exercise-shape", input, `${e.name} reps ${JSON.stringify(e.reps)}`);
    if (typeof e.targetWeight !== "number" || !Number.isFinite(e.targetWeight)) {
      fail("exercise-shape", input, `${e.name} targetWeight ${JSON.stringify(e.targetWeight)}`);
    }
    if (seenToday.has(e.name)) fail("duplicate-in-day", input, `${e.name} twice on ${w.focus}`);
    seenToday.add(e.name);
  }

  if (!(typeof out.honest === "string" || out.honest === null)) {
    fail("honest-type", input, `honest is ${typeof out.honest}`);
  }
  if (!Array.isArray(out.meta?.missing) || out.meta.missing.some((m) => typeof m !== "string")) {
    fail("meta-missing-type", input, JSON.stringify(out.meta?.missing));
  }
  if (!LEVEL_RANK.hasOwnProperty(out.meta?.level)) {
    fail("level-value", input, `level ${JSON.stringify(out.meta?.level)}`);
  }

  /* ---- focus, the body map half ---- */
  const applied = out.meta?.focus?.applied || [];
  if (!Array.isArray(applied) || applied.some((g) => !GROUP_SET.has(g))) {
    fail("focus-applied-subset", input, JSON.stringify(applied));
  }

  if (!out.plan) return;
  checkPlan(input, out.plan, out.meta?.level);
}

/* The week half, split out of `checkOne` so the blocks that drive `buildPlan`
   directly can use it too. Those blocks exist because `plans` never reaches
   buildPlan through the adapter, so a calibrated week cannot be produced from a
   payload at all; see block G. Nothing in here reads `workout` or `meta`, which
   is why the split was possible without changing a single check. */
function checkPlan(input, plan, level) {
  /* Not one of the named invariants, but it is the same claim one level down.
     The SLOTS comment in plan.mjs says two slots can never quietly land on the
     same muscle group, which is the first complaint in the brief (two shrugs in
     a row). The slot table lists groups as alternatives, so a hinge slot listing
     ["hamstrings", "glutes"] can pick a glutes-primary movement and collide with
     the lunge slot next to it. Counted as a warning because it is a weaker fault
     than a repeated name and nobody has decided it is wrong. */
  const groupsToday = new Map();
  for (const d of (plan?.week || [])) {
    const seen = new Map();
    for (const e of d.exercises) seen.set(e.group, (seen.get(e.group) || 0) + 1);
    for (const [g, n] of seen) if (n > 1) groupsToday.set(`${d.name}:${g}`, n);
  }
  for (const [where, n] of groupsToday) warn("same-group-twice-in-day", input, `${where} x${n}`);

  /* ---- the week ---- */
  /* Against plan.days rather than against the number asked for, because
     buildPlan clamps to the goal's own minDays and maxDays on purpose. The gap
     between the two is reported separately below: it is not a broken week, it
     is a request that was silently not honoured. */
  if (plan.week.length !== plan.days) {
    fail("week-length", input, `week has ${plan.week.length} days, plan.days says ${plan.days}`);
  }
  if (plan.days !== input.days) {
    warn("days-clamped", input, `asked ${input.days}, got ${plan.days} (goal min/max)`);
  }
  if (plan.restDays !== 7 - plan.week.length) {
    fail("rest-days", input, `restDays ${plan.restDays} against a ${plan.week.length} day week`);
  }

  const seenWeek = new Map();
  for (const d of plan.week) {
    if (!Array.isArray(d.exercises) || d.exercises.length < 3) {
      fail("day-min-exercises", input, `${d.name} has ${d.exercises?.length}`);
    }
    if (!Array.isArray(d.mainGroups) || !d.mainGroups.length) {
      fail("day-main-groups", input, `${d.name} has no mainGroups`);
    }
    if (!Number.isInteger(d.estimatedMinutes) || d.estimatedMinutes <= 0) {
      fail("estimated-minutes", input, `${d.name} estimatedMinutes ${JSON.stringify(d.estimatedMinutes)}`);
    } else if (d.estimatedMinutes > d.minutes * 1.15) {
      warn("over-time-budget", input, `${d.name} ${d.estimatedMinutes} min against ${d.minutes} (${level})`);
    }
    for (const e of d.exercises) {
      seenWeek.set(e.name, (seenWeek.get(e.name) || 0) + 1);
    }
  }
  for (const [name, n] of seenWeek) {
    if (n > 1) warn("duplicate-in-week", input, `${name} on ${n} days`);
  }

  /* ---- the limits, checked against the week and not against the intent ---- */
  const excluded = new Set((plan.limits?.excluded || []).map((n) => String(n).toLowerCase()));
  const announced = new Set((plan.limits?.blocked || []).map((n) => String(n).toLowerCase()));
  const hurts = plan.limits?.applied?.hurts || [];
  const missing = plan.limits?.applied?.missing || [];
  for (const d of plan.week) {
    for (const e of d.exercises) {
      const key = String(e.name).toLowerCase();
      if (excluded.has(key)) {
        /* Split in two, because they are not the same failure. A ruled-out
           movement the plan also lists in `limits.blocked` was kept knowingly
           and the person is told (plan.mjs softenedNote); one that is not
           listed was prescribed with nobody saying anything. The second is the
           one that can hurt somebody. */
        /* Announced fallbacks are a design decision (plan.mjs: a hole in the
           week is worse than one movement that is not ideal), and the invariant
           that matters is the one below it, "silently". This counts them. */
        warn("excluded-prescribed", input, `${e.name} on ${d.name}`);
        if (!announced.has(key)) fail("excluded-prescribed-silently", input, `${e.name} on ${d.name}`);
      }
      const entries = lookup(e.name);
      if (missing.includes("none") && entries.length) {
        /* A name clears this if ANY library row for it is bodyweight, because
           that is the row the engine's own equipment filter kept. */
        const kits = entries.map((x) => x.equipment || "bodyweight");
        if (!kits.includes("bodyweight")) fail("bodyweight-only", input, `${e.name} needs ${kits.join("/")}`);
      }
      if (hurts.length && entries.length) {
        /* Same rule for the same reason: flagged only when every row for the
           name loads the joint, so an ambiguous name with a safe variant is not
           counted against the engine. jointLoadFor is keyed by name, so for the
           146 explicitly tagged movements the two are the same answer anyway. */
        const bad = hurts.filter((j) => entries.every((x) => jointLoadFor(x, { training: x.training }).joints.includes(j)));
        /* Same events as excluded-prescribed, same reasoning: counted, not failed,
           because every one is in plan.limits.blocked with a note. */
        if (bad.length) warn("hurt-joint-prescribed", input, `${e.name} loads ${bad.join("+")}`);
      }
    }
  }

  /* ---- the weekly ledger ---- */
  /* What the week could spend on a group if every one of its exercises ran at
     the top of the per-session clamp, which is 6, or 2 on a short day. Written
     out here rather than imported, on the same principle as the rest of this
     file: the sweep checks the engine's claim against an independent sum, and a
     sum that imported the engine's own constant would agree with it by
     construction. Finding 1 of the 2026-09-10 audit is the reason: a target
     above this number is one the split was never going to reach, and it used to
     be three quarters of every intermediate and advanced row. */
  const deliverable = {};
  for (const d of plan.week || []) {
    for (const e of d.exercises) deliverable[e.group] = (deliverable[e.group] || 0) + (d.short ? 2 : 6);
  }
  for (const [group, row] of Object.entries(plan.weeklyVolume || {})) {
    if (!(row.sets >= 0)) fail("volume-ledger", input, `${group} sets ${JSON.stringify(row.sets)}`);
    if (!(row.target > 0)) fail("volume-ledger", input, `${group} target ${JSON.stringify(row.target)}`);
    if (row.target > (deliverable[group] ?? 0)) {
      fail("volume-target-unreachable", input, `${group} target ${row.target} over a ceiling of ${deliverable[group] ?? 0}`);
    }
    if (!(row.wanted >= row.target)) {
      fail("volume-ledger", input, `${group} wanted ${JSON.stringify(row.wanted)} under target ${row.target}`);
    }
    if (row.target > 0) ratios.push({ level, days: plan.days, group, ratio: row.sets / row.target });
  }
}

/* ------------------------------------------------------------------ *
 * Block A: the exhaustive core
 * ------------------------------------------------------------------ */

function payloadFor({ goal, days, history, limitCase, sex, bodyWeight, focusCase, extra = {} }) {
  return {
    goal_bubble: goal.goal_bubble,
    goal_child: goal.goal_child,
    challenge_target: days,
    current_weight: bodyWeight,
    sex,
    logs: history.logs,
    limits: limitCase.limits,
    focus_groups: focusCase.groups,
    ...extra,
  };
}

/* What gets printed when something fails. Small enough to paste back into a
   node -e, and it never carries the log array itself: "18months" plus the
   generator above is the reproduction, 936 rows is not. */
function tag({ goal, days, history, limitCase, sex, bodyWeight, focusCase, note }) {
  return {
    goal: goal.id, days, history: history.id, limits: limitCase.id,
    sex, bw: bodyWeight, focus: focusCase.id, ...(note ? { note } : {}),
  };
}

const GOALS = goalCases();
let runs = 0;
let threw = 0;

function run(cell, extra) {
  runs++;
  try {
    return generateFromPayload(payloadFor({ ...cell, extra }), { today: TODAY, includePlan: true });
  } catch (err) {
    threw++;
    /* The adapter wraps everything as "Workout engine failed at <step>", which
       is the one piece of a throw worth grouping on: it says which of the eight
       passes died without needing the stack. */
    const step = /failed at (\w+)/.exec(err?.message || "")?.[1] || "unknown";
    fail("throws", tag(cell), `${step}: ${err?.message || err}`);
    return null;
  }
}

const blockA = [];   // kept for the monotonicity pass below
let rr = 0;
for (let gi = 0; gi < GOALS.length; gi++) {
  for (const days of DAY_COUNTS) {
    for (let li = 0; li < LIMIT_CASES.length; li++) {
      /* Round robin over the three axes that are sampled rather than crossed.
         Keyed off goal, days and limits only, so that the four histories below
         share one person. */
      const sex = SEXES[rr % SEXES.length];
      const bodyWeight = WEIGHTS_LB[(rr + 1) % WEIGHTS_LB.length];
      const focusCase = FOCUS_CASES[(rr + 2) % FOCUS_CASES.length];
      rr++;
      const cellLevels = [];
      for (const history of HISTORY) {
        const cell = { goal: GOALS[gi], days, history, limitCase: LIMIT_CASES[li], sex, bodyWeight, focusCase };
        const out = run(cell);
        if (!out) continue;
        checkOne(tag(cell), out);
        cellLevels.push({ history: history.id, level: out.meta.level, cell });
      }
      /* Level is measured from the logs and nothing else, so a longer past can
         never make somebody less experienced. An inversion here is either the
         threshold table or the still-linear pull-back reaching somewhere it
         should not. */
      for (let i = 1; i < cellLevels.length; i++) {
        const a = cellLevels[i - 1], b = cellLevels[i];
        if (LEVEL_RANK[b.level] < LEVEL_RANK[a.level]) {
          fail("level-monotone", tag(b.cell), `${a.history}=${a.level} then ${b.history}=${b.level}`);
        }
      }
      blockA.push({ goal: GOALS[gi], days, limitCase: LIMIT_CASES[li], sex, bodyWeight, focusCase });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Block B: matched focus pairs
 * ------------------------------------------------------------------ *
 * The only way to know whether asking for a focus did anything is to build the
 * identical week without it and subtract. Everything else about the two runs is
 * the same object, so any difference in weekly sets is the focus and nothing
 * else. A focus that REDUCES a group it was asked to push is the failure this
 * block exists for; mergePriority caps the combined list at five, so a goal
 * that already named five groups can quietly lose one to the tap, and that is
 * reported separately as a warning because it is a stated trade rather than a
 * bug. */
const focusAsks = FOCUS_CASES.filter((f) => f.groups);
for (const goal of GOALS) {
  for (const days of [3, 5]) {
    for (const history of [HISTORY[0], HISTORY[2]]) {
      const base = {
        goal, days, history, limitCase: LIMIT_CASES[0], sex: "Male", bodyWeight: 180,
        focusCase: FOCUS_CASES[0],
      };
      const without = run(base);
      if (!without) continue;
      for (const focusCase of focusAsks) {
        const cell = { ...base, focusCase };
        const with_ = run(cell);
        if (!with_) continue;
        const input = tag({ ...cell, note: "focus-pair" });
        checkOne(input, with_);
        const setsOf = (out, g) => out.plan?.weeklyVolume?.[g]?.sets ?? 0;
        for (const g of out_requested(with_)) {
          if (setsOf(with_, g) < setsOf(without, g)) {
            fail("focus-reduced-sets", input, `${g}: ${setsOf(without, g)} without focus, ${setsOf(with_, g)} with`);
          }
        }
        /* The goal's own priority groups that the tap pushed out of the list. */
        const lost = (without.meta.focus.applied || []).filter((g) => !(with_.meta.focus.applied || []).includes(g));
        for (const g of lost) {
          warn("goal-priority-displaced", input, `${g} was a goal priority and the tap pushed it past MAX_PRIORITY`);
        }
      }
    }
  }
}
function out_requested(out) {
  return out.meta?.focus?.requested || [];
}

/* ------------------------------------------------------------------ *
 * Block B2: three tiers, or one tier painted three colours
 * ------------------------------------------------------------------ *
 * Red, yellow and green buy 1.6x, 1.4x and 1.2x of a group's weekly sets, and
 * the only way to know that is three answers rather than one is to build the
 * same week four times, once at each tier and once with no focus at all, and
 * read the group's weekly total back.
 *
 * Monotonic is the invariant, and it is a FAIL: a group marked red can never
 * come back with fewer sets than the same group marked green, or the picker is
 * lying about what the colours do. Strictly increasing is NOT the invariant and
 * must not be, because `setsFor` clamps a session to [2, 6] and rounds to whole
 * sets, so above the beginner base every tier lands on the same ceiling. Where
 * the four runs come back identical it is warned instead, and that count is the
 * honest measurement of how much of the table the clamp is eating: it belongs
 * next to README "The sweep" finding 1, which is the same clamp seen from the
 * volume side.
 *
 * And the whole-body case, which is the one somebody will tap on the first day:
 * every group at one level is not a focus, and the plan has to say so in words
 * rather than pick three of the fourteen on their behalf. */
const TIER_LADDER = [
  { id: "green", tier: 1 }, { id: "yellow", tier: 2 }, { id: "red", tier: 3 },
];
for (const goal of GOALS) {
  for (const days of [3, 5]) {
    for (const focusCase of focusAsks) {
      const base = {
        goal, days, history: HISTORY[0], limitCase: LIMIT_CASES[0], sex: "Male", bodyWeight: 180,
        focusCase: FOCUS_CASES[0],
      };
      const runs = [{ id: "none", out: run(base) }];
      for (const step of TIER_LADDER) {
        const cell = { ...base, focusCase: { id: `${focusCase.id}-${step.id}`, groups: focusCase.groups.map((g) => `${g}:${step.tier}`) } };
        runs.push({ id: step.id, out: run(cell), cell });
      }
      if (runs.some((r) => !r.out)) continue;
      const input = tag({ ...base, focusCase: { id: `${focusCase.id}-ladder` }, note: "tier-ladder" });
      for (const r of runs.slice(1)) checkOne(input, r.out);
      const setsOf = (out, g) => out.plan?.weeklyVolume?.[g]?.sets ?? 0;
      for (const g of focusCase.groups) {
        const ladder = runs.map((r) => setsOf(r.out, g));
        for (let i = 1; i < ladder.length; i++) {
          if (ladder[i] < ladder[i - 1]) {
            fail("tier-not-monotone", input, `${g}: ${runs.map((r, j) => `${r.id}=${ladder[j]}`).join(" ")}`);
          }
        }
        /* Two different findings wear the same shape, so they are counted
           apart. All zeroes means the split never trains that group at all and
           no multiplier can conjure a slot, which is a fact about SLOTS and the
           goal, not about the tiers. Equal and non-zero is the clamp. */
        if (new Set(ladder).size === 1) {
          if (ladder[0] === 0) warn("focus-group-not-in-split", input, `${g}: the split has no slot for it, so no tier can add sets`);
          else warn("tiers-indistinguishable", input, `${g}: every tier and no focus all come to ${ladder[0]} weekly sets`);
        }
      }
      /* Every group at one level, which is what "select my whole body" stores.
         The user half of the pick has to come back empty and the plan has to
         carry the sentence saying why; the goal's own priority still stands,
         so `applied` is checked against the goal run rather than against []. */
      const whole = run({ ...base, focusCase: { id: "whole-body", groups: ["all"] } });
      if (whole) {
        const wholeInput = tag({ ...base, focusCase: { id: "whole-body" }, note: "whole-body" });
        checkOne(wholeInput, whole);
        const applied = whole.meta?.focus?.applied || [];
        const goalApplied = runs[0].out.meta?.focus?.applied || [];
        if (applied.length !== goalApplied.length || applied.some((g) => !goalApplied.includes(g))) {
          fail("whole-body-not-flattened", wholeInput, `applied ${JSON.stringify(applied)} against ${JSON.stringify(goalApplied)}`);
        }
        if (!(whole.notes || []).some((n) => n.includes("whole body"))) {
          fail("whole-body-unexplained", wholeInput, "no note said the pick changed nothing");
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Block C: trained yesterday, one case per day of the split
 * ------------------------------------------------------------------ *
 * The promise nextDayIndex makes is that it will not hand back muscle a real
 * session hit yesterday, unless every day in the week is in the same state and
 * it has to pick the least fresh one. So: build a week, then for each of its
 * days write a yesterday's session out of that day's own exercises at four sets
 * apiece (above recovery.mjs's MIN_CREDIT_SETS of two), regenerate, and check
 * what comes back.
 *
 * Days 3 and 5 between them cover every split key in SLOTS: full body, push,
 * pull, legs, upper and lower. */
for (const goal of GOALS) {
  for (const days of [3, 5]) {
    const seedCell = {
      goal, days, history: HISTORY[2], limitCase: LIMIT_CASES[0], sex: "Male", bodyWeight: 180,
      focusCase: FOCUS_CASES[0],
    };
    const seed = run(seedCell);
    if (!seed?.plan) continue;
    const yesterday = isoLocal(new Date(TODAY.getTime() - DAY_MS));
    for (const trained of seed.plan.week) {
      const extraLogs = trained.exercises.map((e) => ({
        entry_date: yesterday, exercise_name: e.name, sets: 4, reps: 8, weight: 100,
      }));
      const logs = HISTORY[2].logs.concat(extraLogs);
      const cell = { ...seedCell, history: { id: `6months+did ${trained.name}`, logs } };
      const out = run(cell);
      if (!out?.plan) continue;
      const input = tag({ ...cell, note: "trained-yesterday" });
      checkOne(input, out);

      const states = muscleRecoveryStates({ logs, muscleIndex: MUSCLE_INDEX, today: TODAY });
      const held = new Set([...states].filter(([, s]) => s.state === "hold").map(([g]) => g));
      if (!held.size) continue;
      const intersects = (day) => (day.mainGroups || []).some((g) => held.has(g));
      const everyDayIntersects = out.plan.week.every(intersects);
      const given = out.plan.week.find((d) => d.name === out.workout.focus);
      if (given && intersects(given) && !everyDayIntersects) {
        fail("recovery-repeats-fresh-muscle", input,
          `did ${trained.name} yesterday, got ${given.name} (${given.mainGroups.join("+")}) while held=${[...held].join("+")}`);
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Block D: the profile's focus day
 * ------------------------------------------------------------------ *
 * A stated preference outranks the rotation. "Legs" is the word the old model
 * read off the profile, and the day names it has to match are "Leg day" and
 * "Lower body A", so this is really a test of FOCUS_KEYWORDS against splitFor's
 * vocabulary. A week with no lower day at all (two full-body days) must come
 * back focusHonoured false rather than honouring it with something else. */
for (const goal of GOALS) {
  for (const days of DAY_COUNTS) {
    const cell = {
      goal, days, history: HISTORY[1], limitCase: LIMIT_CASES[0], sex: "Female", bodyWeight: 150,
      focusCase: FOCUS_CASES[0],
    };
    const out = run(cell, { focus: "Legs" });
    if (!out?.plan) continue;
    const input = tag({ ...cell, note: "focus=Legs" });
    const hasLower = out.plan.week.some((d) => /leg|lower/i.test(d.name));
    if (hasLower && !out.meta.focusHonoured) {
      fail("focus-day-not-honoured", input, `week is ${out.plan.week.map((d) => d.name).join(",")}`);
    }
    if (out.meta.focusHonoured && !/leg|lower/i.test(out.workout.focus)) {
      fail("focus-day-wrong-day", input, `focusHonoured but returned ${out.workout.focus}`);
    }
    if (!hasLower && out.meta.focusHonoured) {
      fail("focus-day-invented", input, `no lower day in ${out.plan.week.map((d) => d.name).join(",")} yet honoured`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Block E: determinism
 * ------------------------------------------------------------------ *
 * The engine is supposed to be a pure function of its payload and a clock, and
 * a generator that answers differently on a retry is the bug support can never
 * reproduce. Every twelfth cell of block A is run twice and the whole return
 * compared byte for byte. Twelfth rather than all of them because the cost is a
 * second full build plus a JSON.stringify of the week, and nondeterminism that
 * exists at all will show up in five hundred samples. */
for (let i = 0; i < blockA.length; i += 12) {
  const cell = { ...blockA[i], history: HISTORY[i % HISTORY.length] };
  const a = run(cell);
  const b = run(cell);
  if (!a || !b) continue;
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  if (ja !== jb) {
    let at = 0;
    while (at < ja.length && ja[at] === jb[at]) at++;
    fail("nondeterministic", tag({ ...cell, note: "run twice" }), `diverges at char ${at}: ${ja.slice(at, at + 80)}`);
  }
}

/* ------------------------------------------------------------------ *
 * Blocks F to I: what happens NEXT week
 * ------------------------------------------------------------------ *
 * Everything above this line generates one day for one person once, and that is
 * why 8,913 runs never caught the bug of 2026-09-12, where a 2.5 percent
 * multiplier could not clear a 5 lb rounding step and a curl sat at 25 lb
 * through eight weeks of perfect training. `sweep.mjs` never passed `plans`, so
 * `calibrate.mjs` saw no completed sessions, returned `unknown` on every single
 * run, and calibration, the back-off lever, progression and the whole plateau
 * response had zero coverage. A no-op cannot fail an instrument that is not
 * pointed at it, and "SWEEP CLEAN" was overstating what had been checked.
 *
 * These four blocks point it at them. Two things make them different in kind
 * from blocks A to E:
 *
 * 1. They call `buildPlan` directly rather than `generateFromPayload`. Not a
 *    shortcut: `adapter.mjs` passes `payload.plans` to `nextDayIndex` and never
 *    to `buildPlan`, so a calibrated week cannot be produced from a payload at
 *    all. Block I asserts exactly that and it is in KNOWN_OPEN above.
 * 2. Block F runs a SEQUENCE. Every other block asks what the engine says
 *    today; the question that hid three bugs is what it says on week eight when
 *    you did everything it asked, and only a replay can ask it.
 *
 * Cost was the constraint. Multiplying the main matrix by a history axis would
 * have made the sweep unusable, so these are targeted blocks the same way the
 * tier ladder was: a fixed few runs per goal rather than a new dimension.
 */

let builds = 0;

/* The `buildPlan` twin of `run`. Same accounting, same one line reproduction in
   the failure report, and the same refusal to print the log array. */
function build(where, args) {
  builds++;
  try {
    return buildPlan(args);
  } catch (err) {
    threw++;
    fail("throws", where, `buildPlan: ${err?.message || err}`);
    return null;
  }
}

/* The tile pick a payload would have produced, without the payload. mapGoal
   turns a valid bubble and child straight into this shape and does nothing else
   to it, so a goal built here is the same goal block A swept. */
const asGoal = (g) => ({ bubble: g.goal_bubble, child: g.goal_child || undefined });

const dayBack = (n) => isoLocal(new Date(TODAY.getTime() - n * DAY_MS));

/* roundLoad's grid, mirrored from calibrate.mjs for the same reason the volume
   ceiling above is written out rather than imported: a check that borrows the
   engine's own constant agrees with it by construction. Anything smaller than
   one grid space is not a step, it is the no-op. */
const gridAt = (lb) => (lb < 40 ? 2.5 : 5);

/* First prescription per exercise across a week, which is what the person is
   handed. Name keyed, because that is the only handle the app and the logs
   share. */
function prescriptionsOf(plan) {
  const m = new Map();
  for (const d of plan?.week || []) {
    for (const e of d.exercises) if (!m.has(e.name)) m.set(e.name, e);
  }
  return m;
}

/* A history table turned into dated rows, three sessions a week, four movements
   a session, ending where the caller says. Same shape as `syntheticLogs` and
   kept separate from it because these two need control over the loads: the
   whole point of the light table is that its weights sit either side of
   roundLoad's 40 lb boundary, which is where the no-op lived. */
function seededLogs(table, weeks, until) {
  const logs = [];
  const total = weeks * 3;
  for (let s = 0; s < total; s++) {
    const date = isoLocal(new Date(until.getTime() - Math.round((total - 1 - s) * (7 / 3)) * DAY_MS));
    for (let k = 0; k < 4; k++) {
      const [name, lb] = table[(s * 4 + k) % table.length];
      logs.push({ entry_date: date, exercise_name: name, sets: 3, reps: 10, weight: lb + 5 * Math.floor(s / 6) });
    }
  }
  return logs;
}

/* Under 40 lb the grid is 2.5 and a percentage step rounds to nothing; over it
   the grid is 5 and the same percentage rounds to nothing for longer. Both
   sides are swept because the bug lived on one of them and its sibling on the
   other. */
const LIGHT_HISTORY = [
  ["Dumbbell Curl", 20], ["Triceps Pushdown", 25], ["Lateral Raise", 10], ["Goblet Squat", 35],
  ["Dumbbell Bench Press", 30], ["Seated Cable Row", 45], ["Leg Curl", 30], ["Calf Raise", 25],
];
const HEAVY_HISTORY = LOG_NAMES.map((n, i) => [n, 95 + 5 * i]);

const REPLAY_PEOPLE = [
  { id: "light", person: { bodyWeightLb: 125, sex: "Female", daysAsked: 3 }, table: LIGHT_HISTORY, weeks: 10 },
  { id: "heavy", person: { bodyWeightLb: 195, sex: "Male", daysAsked: 4 }, table: HEAVY_HISTORY, weeks: 26 },
];

/* ------------------------------------------------------------------ *
 * Block F: eight weeks of doing exactly what it said
 * ------------------------------------------------------------------ *
 * The replay. Build a week, write every day of it back as a completed
 * `ai_workouts` row plus the `exercise_logs` rows of somebody who hit every
 * prescribed set, rep and pound, hand both back, build the next week, eight
 * times. That is the user this engine is for and it had never been simulated.
 *
 * The invariant is one sentence: if you do everything it asks for eight weeks,
 * the weight on the bar has to go up. Asserted on the OUTPUT in pounds after
 * rounding, never on a multiplier, because all three bugs of 2026-09-12 had a
 * multiplier that looked right and a prescription that never moved.
 *
 * Two people rather than one, alternating by goal so the cost stays at eight
 * builds per goal: the light one lives under roundLoad's 40 lb boundary where
 * the step was being rounded away, the heavy one above it.
 */
const REPLAY_WEEKS = 8;

for (let gi = 0; gi < GOALS.length; gi++) {
  const g = GOALS[gi];
  const who = REPLAY_PEOPLE[gi % REPLAY_PEOPLE.length];
  const start = new Date(TODAY.getTime() - (REPLAY_WEEKS - 1) * 7 * DAY_MS);
  const input = tag({
    goal: g, days: who.person.daysAsked, history: { id: `${who.id} replay` },
    limitCase: { id: "none" }, sex: who.person.sex, bodyWeight: who.person.bodyWeightLb,
    focusCase: { id: "none" }, note: `${REPLAY_WEEKS} perfect weeks`,
  });

  const logs = seededLogs(who.table, who.weeks, new Date(start.getTime() - 7 * DAY_MS));
  const plans = [];
  const byWeek = new Map();   // exercise name -> the prescribed weight, one per week
  let sawPush = false;
  let last = null;

  for (let w = 0; w < REPLAY_WEEKS; w++) {
    const day = new Date(start.getTime() + w * 7 * DAY_MS);
    const plan = build(input, { goal: asGoal(g), person: who.person, logs, plans, today: day });
    if (!plan) break;
    last = plan;
    if (plan.calibration?.overall === "push") sawPush = true;

    for (const [name, e] of prescriptionsOf(plan)) {
      if (typeof e.weight !== "number" || !(e.weight > 0)) continue;
      if (!byWeek.has(name)) byWeek.set(name, []);
      byWeek.get(name).push(e.weight);
    }

    /* The week done as written, one day after another. `completed_at` is what
       makes a row evidence: joinPlanToActual ignores a plan that was generated
       and never started, which is the right call and also the reason a replay
       that forgot this field would silently sweep nothing at all. */
    plan.week.forEach((d, i) => {
      const stamp = isoLocal(new Date(day.getTime() + i * DAY_MS));
      plans.push({
        entry_date: stamp, focus: d.name, completed_at: `${stamp}T18:00:00Z`,
        exercises: d.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, targetWeight: e.weight })),
      });
      for (const e of d.exercises) {
        logs.push({ entry_date: stamp, exercise_name: e.name, sets: e.sets, reps: e.reps, weight: e.weight ?? 0 });
      }
    });
  }
  if (last) checkPlan(input, last, last.level);

  /* The instrument checking itself, which is the lesson of this whole exercise.
     If a refactor ever stops the replay feeding calibration, every check below
     goes quietly green on a person the engine never calibrated, exactly as the
     8,912 runs did. So: eight weeks of perfect training must have produced at
     least one "push" week, or the block is not measuring anything. */
  if (!sawPush) {
    fail("calibration-never-ran", input, "eight perfect weeks and calibration never once said push");
  }

  for (const [name, weights] of byWeek) {
    /* Three weeks is the floor for a verdict at all: calibrateExercise needs two
       finished sessions of the movement before it will say anything, so a lift
       that appeared twice has not been asked the question yet. */
    if (weights.length < 3) continue;
    const first = weights[0], end = weights[weights.length - 1];
    const seq = `${weights.join(" -> ")}`;
    if (end === first) {
      fail("progress-stalled-under-perfect-training", input,
        `${name} prescribed ${weights.length} weeks running, every rep hit, still ${end} lb: ${seq}`);
    } else if (end < first) {
      fail("progress-went-backwards", input, `${name} ${first} lb down to ${end} lb on perfect logs: ${seq}`);
    }
    for (let i = 1; i < weights.length; i++) {
      if (weights[i] < weights[i - 1]) warn("progress-not-monotone", input, `${name}: ${seq}`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Blocks G and H: the plan against what actually happened
 * ------------------------------------------------------------------ *
 * One seed week per goal, three completed sessions of its first day, and then
 * the same week rebuilt with `plans` and without them. Identical logs on both
 * sides, so level, training age and every starting weight are the same object:
 * the only difference between the two plans is that one of them knows what was
 * prescribed. That subtraction is what makes "the load moved" attributable, and
 * it is the same trick block B uses for focus.
 *
 * Four scenarios, one per row of research/07's table, because a verdict nobody
 * reaches is a branch nobody sweeps.
 */

/* Days back for the three completed sessions. Off the seed history's own 7/3
   grid on purpose: an overlapping date lets a leftover history row win
   joinPlanToActual's first-hit-per-date-and-name rule, and the scenario then
   quietly measures something other than what it says. Found the hard way. */
const CAL_SESSIONS = [5, 12, 19];

/* `include` keeps a movement out of the PLAN as well as out of the logs where
   the scenario cannot be expressed on it. A single at the planned reps is not
   "one rep short" of anything, it is the target hit, and on the goals whose
   main works at one rep the matched scenario was quietly producing a too-easy
   verdict and measuring the wrong branch. Dropping it from the plan keeps the
   join clean rather than turning it into a skip. */
const CAL_SCENARIOS = [
  {
    id: "beat-the-plan", wants: "too-easy", overall: "push",
    log: (e) => ({ sets: e.sets, reps: e.reps + 1, weight: e.weight ?? 0 }),
  },
  {
    id: "matched-the-plan", wants: "on-track", overall: "hold",
    include: (e) => e.reps >= 2,
    log: (e) => ({ sets: e.sets, reps: e.reps - 1, weight: e.weight ?? 0 }),
  },
  {
    id: "missed-the-plan", wants: "too-heavy", overall: "back-off",
    include: (e) => e.sets >= 2,
    log: (e) => ({ sets: e.sets - 1, reps: e.reps, weight: e.weight ?? 0 }),
  },
  /* No rows at all for a session they finished. Not an absence of data: it is
     the pain or preference signal, and the one verdict that is about which
     exercise rather than about how much. */
  { id: "never-logged-it", wants: "skipped", overall: "hold", log: () => null },
];

const VERDICT_COUNTER = { "too-easy": "tooEasy", "on-track": "onTrack", "too-heavy": "tooHeavy", skipped: "skipped" };

/* Three shapes of stall, chosen for the three branches of planPlateauResponse
   that a log history alone can reach. `pr` is how many days ago the lift last
   set a best: 37 lands on five weeks flat, which is over minWeeksFlat and under
   shortStallWeeks, and 65 lands on nine, which is past rotateFromWeeks. */
const STALL_SHAPES = [
  { id: "flat-5-weeks", pr: 37, lifts: 1 },
  { id: "flat-9-weeks", pr: 65, lifts: 1 },
  { id: "three-lifts-flat", pr: 65, lifts: 3 },
];

const CAL_PERSON = { bodyWeightLb: 180, sex: "Male", daysAsked: 3 };

for (const g of GOALS) {
  const goal = asGoal(g);
  const base = {
    goal: g, days: CAL_PERSON.daysAsked, limitCase: { id: "none" },
    sex: CAL_PERSON.sex, bodyWeight: CAL_PERSON.bodyWeightLb, focusCase: { id: "none" },
  };
  /* Ends 26 days back so nothing in it can land on a session date below, and so
     the person is not inside layoffDays and reading as a return. */
  const seedLogs = seededLogs(HEAVY_HISTORY, 26, new Date(TODAY.getTime() - 26 * DAY_MS));
  const seedInput = tag({ ...base, history: { id: "26w seed" }, note: "calibration seed" });
  const seed = build(seedInput, { goal, person: CAL_PERSON, logs: seedLogs, today: TODAY });
  if (!seed?.week?.length) continue;
  const seedDay = seed.week[0];
  const seedReps = prescriptionsOf(seed);

  /* ---- Block G: the four verdicts ---- */
  for (const sc of CAL_SCENARIOS) {
    const input = tag({ ...base, history: { id: `26w + ${sc.id}` }, note: "plan vs actual" });
    const doing = seedDay.exercises.filter((e) => (sc.include ? sc.include(e) : true));
    if (doing.length < 2) continue;
    const plans = [];
    const sessionLogs = [];
    for (const backDays of CAL_SESSIONS) {
      const stamp = dayBack(backDays);
      plans.push({
        entry_date: stamp, focus: seedDay.name, completed_at: `${stamp}T18:00:00Z`,
        exercises: doing.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, targetWeight: e.weight })),
      });
      for (const e of doing) {
        const row = sc.log(e);
        if (row) sessionLogs.push({ entry_date: stamp, exercise_name: e.name, ...row });
      }
    }
    const logs = seedLogs.concat(sessionLogs);
    const ctl = build(input, { goal, person: CAL_PERSON, logs, today: TODAY });
    const trt = build(input, { goal, person: CAL_PERSON, logs, plans, today: TODAY });
    if (!ctl || !trt) continue;
    checkPlan(input, trt, trt.level);

    /* Recomputed here rather than read off the plan, which only carries the
       summary. Same reasoning as the volume ceiling: the sweep needs its own
       answer to check the engine's against. */
    const cal = calibrate({ plans, logs });

    /* Self check first, and it is a FAIL rather than a warning. If the scenario
       stops producing the verdict it is named after, every assertion under it
       passes on a person nobody calibrated, which is precisely how the sweep
       was clean through three bugs. */
    if (!(cal.summary[VERDICT_COUNTER[sc.wants]] >= 1)) {
      fail("calibration-branch-not-reached", input,
        `${sc.id} produced no ${sc.wants} verdict: ${JSON.stringify(cal.summary)}`);
    }
    if (trt.calibration?.overall !== sc.overall) {
      fail("calibration-branch-not-reached", input,
        `${sc.id} should read as ${sc.overall}, plan says ${trt.calibration?.overall}`);
    }
    if (ctl.calibration?.overall !== "unknown") {
      fail("calibration-without-plans", input,
        `no plans given and the week still calibrated: ${ctl.calibration?.overall}`);
    }

    const before = prescriptionsOf(ctl);
    const after = prescriptionsOf(trt);
    for (const [name, e] of after) {
      const was = before.get(name);
      if (!was) { warn("calibration-changed-selection", input, `${name} is in the calibrated week and not in the control`); continue; }
      const a = was.weight, b = e.weight;
      if (typeof a !== "number" || typeof b !== "number" || !(a > 0)) continue;   // bodyweight work has no load to move
      const verdict = cal.byExercise[name.trim().toLowerCase()]?.verdict || null;

      if (verdict === "too-easy") {
        /* THE invariant. Three bugs on 2026-09-12 wore this exact shape: a
           factor that said "go up" and a prescription in pounds that did not
           move, because the step was smaller than the grid it rounds to. It is
           asserted on the pounds the person is handed, and the floor is one
           grid space, because a move the rack cannot express is not a move. */
        if (b === a) {
          fail("advance-did-not-move-load", input,
            `${name}: calibration says too-easy and the prescription is ${a} lb either way`);
        } else if (b < a) {
          fail("advance-moved-load-down", input, `${name}: too-easy and ${a} lb fell to ${b} lb`);
        } else if (b - a < gridAt(a)) {
          fail("advance-under-one-grid-step", input,
            `${name}: ${a} lb to ${b} lb, under the ${gridAt(a)} lb the rack can express`);
        } else if (b - a > 10) {
          warn("advance-over-a-heavy-step", input, `${name}: ${a} lb to ${b} lb in one week`);
        }
      } else if (verdict === "too-heavy") {
        /* The same claim in the other direction, and the same bug: the back-off
           told people the weight was coming down and handed them the same
           weight. Only asserted where there is room to come down: at or under
           one grid space the floor in calibrate.mjs is doing its job and a
           prescription of nothing is not a back-off. */
        if (a > gridAt(a)) {
          if (b === a) {
            fail("back-off-did-not-reduce-load", input,
              `${name}: calibration says too-heavy and the prescription is ${a} lb either way`);
          } else if (b > a) {
            fail("back-off-raised-load", input, `${name}: too-heavy and ${a} lb rose to ${b} lb`);
          }
        }
      } else if (b !== a) {
        /* on-track, skipped, or no verdict at all. calibrate.mjs returns a
           factor of exactly 1 for all three, so a load that moved anyway is
           something else reaching the bar. */
        fail("uncalibrated-load-moved", input, `${name}: verdict ${verdict || "none"} and ${a} lb became ${b} lb`);
      }
    }

    /* A back-off is a lighter week as well as a lighter bar. Not asserted as a
       strict drop: setsFor floors a main at 2, so a week already at the floor
       has nowhere to go. Going UP under a back-off is the failure. */
    if (sc.overall === "back-off") {
      /* Summed over the exercises both weeks prescribe, so a movement that only
         one of them picked cannot make the total move on its own. The two weeks
         share their logs, so this really is the back-off lever and nothing
         else. */
      let x = 0, y = 0;
      for (const [name, e] of after) {
        if (!before.has(name)) continue;
        y += e.sets; x += before.get(name).sets;
      }
      if (y > x) fail("back-off-added-sets", input, `back-off week has ${y} weekly sets against ${x} on the same exercises`);
      else if (y === x) warn("back-off-changed-no-sets", input, `${x} weekly sets either way`);
    }
  }

  /* ---- Block H: a stall gets an answer, and the answer has to be visible ---- */
  for (const shape of STALL_SHAPES) {
    const loaded = seedDay.exercises.filter((e) => typeof e.weight === "number" && e.weight > 0);
    if (loaded.length < shape.lifts) continue;
    const picked = loaded.slice(0, shape.lifts);
    const names = picked.map((e) => e.name);
    const input = tag({ ...base, history: { id: `26w + ${shape.id}` }, note: "stall" });

    /* The stalled lift's own history is replaced rather than added to, because a
       lift that climbed last month is not flat however many flat weeks follow
       it: detectPlateau reads the best day in the window against the ones
       before it. */
    const logs = seedLogs.filter((l) => !names.includes(l.exercise_name));
    for (const e of picked) {
      for (let d = shape.pr; d >= 1; d -= 3) {
        logs.push({ entry_date: dayBack(d), exercise_name: e.name, sets: 3, reps: 5, weight: e.weight });
      }
    }
    const trt = build(input, { goal, person: CAL_PERSON, logs, today: TODAY });
    if (!trt) continue;
    checkPlan(input, trt, trt.level);

    const responses = trt.plateau?.responses || [];
    const summary = trt.plateau?.summary || { action: "none" };
    const notes = trt.dayNotes || [];
    const week = prescriptionsOf(trt);

    if (!responses.length && summary.action === "none") {
      fail("stall-not-detected", input,
        `${names.join(" + ")} flat since ${shape.pr} days ago and nothing was said`);
    }

    for (const r of responses) {
      /* Said out loud. A response with a sentence nobody ever sees is the same
         failure as a response with no lever behind it. */
      if (r.say && !notes.includes(r.say)) {
        fail("plateau-answer-unspoken", input, `${r.exercise}: ${r.action} decided and the note never reached dayNotes`);
      }
      const here = week.get(r.exercise);
      if (r.action === "rotate") {
        if (here) fail("plateau-rotate-not-applied", input, `${r.exercise} was rotated out and is still in the week`);
      } else if (r.action === "rep-range") {
        /* The note promises a different rep range for the block. Nothing in
           plan.mjs reads the response, so the reps come off P.repRange exactly
           as they did before the stall, and the person is told the reps changed
           while being handed the same prescription. Checked against the
           un-stalled seed rather than against the sentence, because reps depend
           on the goal alone and not on the logs, so the seed is a clean control
           for this one field. */
        const was = seedReps.get(r.exercise);
        if (here && was && here.reps === was.reps) {
          fail("plateau-rep-range-not-applied", input,
            `${r.exercise}: answer is rep-range, the note says so, and the day still prescribes ${here.reps} reps`);
        }
      } else if (r.action === "deload-lift") {
        /* Deliberately not checked here. deload-lift only fires when calibrate
           already says too-heavy, and that lever is the one block G measures in
           pounds; asserting it twice would be asserting the same move twice. */
      } else if (r.action !== "wait") {
        fail("plateau-action-unobservable", input,
          `${r.action} is a response this sweep has no observable for, so nothing is checking it did anything`);
      }
    }

    if (summary.action === "volume-cut") {
      if (summary.say && !notes.includes(summary.say)) {
        fail("plateau-answer-unspoken", input, "volume-cut decided and the week never said so");
      }
      /* Whether the cut cuts. The control is the same person with the same logs
         and one heavier session on each stalled lift, which is the smallest
         edit that stops detectPlateau calling it flat, so selection and level
         hold still and the backOff lever is what differs. Not exact: a lighter
         main frees time, the volume ledger tops accessories back up, and both
         can add sets back. Counted rather than failed for that reason, and the
         count is the honest measure of how much of the cut survives. */
      const broken = logs.concat(picked.map((e) => ({
        entry_date: dayBack(1), exercise_name: e.name, sets: 3, reps: 5, weight: e.weight + 10,
      })));
      const ctl = build(input, { goal, person: CAL_PERSON, logs: broken, today: TODAY });
      if (ctl) {
        const shared = prescriptionsOf(ctl);
        let was = 0, now = 0;
        for (const [name, e] of week) {
          if (!shared.has(name)) continue;
          now += e.sets; was += shared.get(name).sets;
        }
        if (now >= was) {
          warn("volume-cut-did-not-cut", input,
            `${summary.lifts} lifts stalled, weekly sets on the shared exercises went ${was} to ${now}`);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Block I: the claims nothing was checking
 * ------------------------------------------------------------------ *
 * Four fields that reach `generateFromPayload` and have a stated promise
 * attached, none of which had a check anywhere. Each is a matched pair against
 * the same person with the field absent, so the assertion is about the
 * difference and not about the plan.
 */
const CLAIM_HISTORY = HISTORY[2];   // six months, so there is a level to disturb

for (const goal of GOALS) {
  const cell = {
    goal, days: 3, history: CLAIM_HISTORY, limitCase: LIMIT_CASES[0],
    sex: "Male", bodyWeight: 180, focusCase: FOCUS_CASES[0],
  };
  const plain = run(cell);
  if (!plain?.plan) continue;

  /* ---- stretching can be turned off, and turning it off moves nothing else ---- */
  const skipped = run(cell, { skip_stretching: true });
  if (skipped?.plan) {
    const input = tag({ ...cell, note: "skip_stretching" });
    checkOne(input, skipped);
    if (skipped.meta.stretching.included !== false || skipped.meta.stretching.warmupMinutes !== 0) {
      fail("stretching-not-skipped", input, JSON.stringify(skipped.meta.stretching));
    }
    /* adapter.mjs: "the plan, the day, the rotation and every other field of
       meta are byte for byte what they were". Nobody had ever checked it. */
    if (JSON.stringify(plain.plan) !== JSON.stringify(skipped.plan)) {
      fail("skip-stretching-changed-the-plan", input, "the week is not the week it would have been");
    }
    const bare = (w) => JSON.stringify((w.exercises || []).map((e) => [e.name, e.sets, e.reps, e.targetWeight]));
    if (bare(plain.workout) !== bare(skipped.workout)) {
      fail("skip-stretching-changed-the-day", input, "the exercises moved when only the mobility blocks should have");
    }
  }

  /* ---- a stale focus is flagged and acts on nothing ---- */
  const withFocus = { focus_groups: ["chest", "glutes"] };
  const fresh = run(cell, { ...withFocus, focus_chosen_at: dayBack(1) });
  const stale = run(cell, { ...withFocus, focus_chosen_at: dayBack(400) });
  if (fresh?.plan && stale?.plan) {
    const input = tag({ ...cell, note: "focus_chosen_at" });
    checkOne(input, stale);
    if (fresh.meta.focus.stale !== false) fail("focus-freshness-wrong", input, "a focus picked yesterday reads as stale");
    if (stale.meta.focus.stale !== true) fail("focus-freshness-wrong", input, "a focus picked 400 days ago reads as current");
    /* The comment in adapter.mjs says nothing acts on `stale` yet, on purpose.
       That is a claim about the whole plan and this is the only thing asserting
       it, so the day it stops being true somebody finds out here. */
    const minusStale = (o) => JSON.stringify({ plan: o.plan, workout: o.workout, notes: o.notes });
    if (minusStale(fresh) !== minusStale(stale)) {
      fail("stale-focus-changed-the-plan", input, "stale is supposed to be a flag and it moved the week");
    }
  }

  /* ---- a second goal is reported honestly ---- */
  const secondary = [{ bubble: "feel-better" }, { bubble: "get-stronger", child: "lift-heavier" }];
  const withSecond = run(cell, { goal_secondary: [...secondary, { bubble: "mobility" }] });
  if (withSecond?.plan) {
    const input = tag({ ...cell, note: "goal_secondary" });
    checkOne(input, withSecond);
    const said = withSecond.meta.goals;
    const named = new Set([...(said.secondary || []), ...(said.ignored || [])].map((s) => s.bubble || s));
    /* Every extra goal somebody taps has to come back either bought or ignored,
       because the meta block's whole job is to give the app a straight answer
       about what the second tap did. */
    for (const s of secondary) {
      if (!named.has(s.bubble) && s.bubble !== goal.goal_bubble) {
        fail("secondary-goal-unaccounted", input, `${s.bubble} was asked for and is neither applied nor ignored`);
      }
    }
    /* "mobility" is not a bubble in the tree, and normalizeSecondaryGoals drops
       a bubble it does not know before resolveGoal ever sees it, so it never
       reaches `ignored` and nobody is told. The right call about the plan and a
       silent one about the tap: a client sending a retired id gets no answer at
       all. Counted rather than failed, because nothing has decided what it
       should say instead. */
    if (!named.has("mobility")) {
      warn("unknown-secondary-goal-dropped-silently", input, "mobility was sent, is not a bubble, and is in neither list");
    }
    if (said.primary.bubble !== plain.meta.goals.primary.bubble || said.primary.childUsed !== plain.meta.goals.primary.childUsed) {
      fail("secondary-goal-moved-the-primary", input,
        `primary went from ${plain.meta.goals.primary.childUsed} to ${said.primary.childUsed}`);
    }
  }

  /* ---- and the two fields the adapter accepts and throws away ---- */
  /* Both are in KNOWN_OPEN. The check is here rather than in a bug report
     because a bug report goes stale and this does not: the day somebody adds
     the argument, this stops firing on its own. */
  const day0 = plain.plan.week[0];
  const donePlans = CAL_SESSIONS.map((backDays) => ({
    entry_date: dayBack(backDays), focus: day0.name, completed_at: `${dayBack(backDays)}T18:00:00Z`,
    exercises: day0.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, targetWeight: e.weight })),
  }));
  const doneLogs = [];
  for (const backDays of CAL_SESSIONS) {
    for (const e of day0.exercises) {
      doneLogs.push({ entry_date: dayBack(backDays), exercise_name: e.name, sets: e.sets, reps: e.reps + 1, weight: e.weight ?? 0 });
    }
  }
  const logs = CLAIM_HISTORY.logs.concat(doneLogs);
  const withoutPlans = run({ ...cell, history: { id: "6months+done", logs } });
  const withPlans = run({ ...cell, history: { id: "6months+done", logs } }, { plans: donePlans });
  if (withoutPlans?.plan && withPlans?.plan) {
    const input = tag({ ...cell, note: "payload.plans" });
    const truth = calibrate({ plans: donePlans, logs });
    if (truth.overall !== "unknown" && withPlans.plan.calibration.overall === "unknown") {
      fail("adapter-drops-plans", input,
        `calibrate() on this payload says ${truth.overall}, the plan built from it says unknown`);
    }
  }

  const swaps = day0.exercises.slice(0, 1).flatMap((e) => [1, 2, 3].map((n) => ({
    entry_date: dayBack(n * 3), planned_exercise: e.name, chosen_exercise: "Machine Chest Press",
  })));
  const withSwaps = run(cell, { swaps });
  if (withSwaps?.plan) {
    const input = tag({ ...cell, note: "payload.swaps" });
    const prefs = learnPreferences({ swaps, logs: CLAIM_HISTORY.logs, today: TODAY });
    const hard = (prefs.avoid || []).filter((a) => a.strength === "hard").map((a) => a.name.toLowerCase());
    const still = prescriptionsOf(withSwaps.plan);
    for (const name of hard) {
      if ([...still.keys()].some((k) => k.toLowerCase() === name)) {
        fail("adapter-drops-swaps", input, `${name} was swapped out three times and is still prescribed`);
      }
    }
  }
}

/* The shared log arrays are the one piece of state this script reuses across
   thousands of runs, so the assumption that the engine never writes to them is
   checked rather than trusted. If it were false every result after the first
   would be quietly wrong and nothing above would notice. */
for (const h of HISTORY) {
  const rebuilt = syntheticLogs(h.weeks);
  if (JSON.stringify(rebuilt) !== JSON.stringify(h.logs)) {
    fail("logs-mutated", { history: h.id }, "the engine wrote to the logs array it was given");
  }
}

/* ------------------------------------------------------------------ *
 * The report
 * ------------------------------------------------------------------ */

const UNDER = 0.8;
const OVER = 1.25;

function distribution() {
  const byLevel = new Map();
  const byDays = new Map();
  const add = (map, key, r) => {
    let row = map.get(key);
    if (!row) { row = { n: 0, under: 0, over: 0 }; map.set(key, row); }
    row.n++;
    if (r < UNDER) row.under++;
    else if (r > OVER) row.over++;
  };
  const crossed = new Map();
  for (const r of ratios) {
    add(byLevel, r.level, r.ratio);
    add(byDays, r.days, r.ratio);
    add(crossed, `${r.level}|${r.days}`, r.ratio);
  }
  return { byLevel, byDays, crossed };
}

function pct(n, of) { return of ? `${(100 * n / of).toFixed(1)}%` : "-"; }

const failing = [...results.entries()].filter(([, r]) => r.fails);
const warning = [...results.entries()].filter(([, r]) => r.warns);
const opened = [...results.entries()].filter(([, r]) => r.opens);

console.log("");
console.log("ENGINE SWEEP");
console.log(`  runs              ${runs + builds}`);
console.log(`    payload         ${runs} through generateFromPayload`);
console.log(`    direct          ${builds} through buildPlan, which is the only way to reach calibration`);
console.log(`  goal selections   ${GOALS.length} (${new Set(GOALS.map((g) => g.goal_bubble)).size} bubbles from the research tree and the picker, `
    + `every child plus every bubble default)`);
console.log(`  threw             ${threw}`);
console.log(`  ledger rows       ${ratios.length}`);
console.log("");

console.log("FAILS");
if (!failing.length) console.log("  none");
for (const [inv, r] of failing.sort((a, b) => b[1].fails - a[1].fails)) {
  console.log(`  ${String(r.fails).padStart(7)}  ${inv}`);
}
console.log("");

console.log("KNOWN OPEN, would be FAILs");
if (!opened.length) console.log("  none");
for (const [inv, r] of opened.sort((a, b) => b[1].opens - a[1].opens)) {
  console.log(`  ${String(r.opens).padStart(7)}  ${inv}`);
  console.log(`           ${KNOWN_OPEN.get(inv)}`);
  for (const f of r.open.slice(0, 2)) console.log(`           ${JSON.stringify(f.input)}  ${f.detail}`);
}
console.log("");

console.log("WARNS");
if (!warning.length) console.log("  none");
for (const [inv, r] of warning.sort((a, b) => b[1].warns - a[1].warns)) {
  console.log(`  ${String(r.warns).padStart(7)}  ${inv}`);
}
console.log("");

const { byLevel, byDays, crossed } = distribution();
console.log("WEEKLY VOLUME, sets against target");
console.log("  level         groups    under 0.8    over 1.25");
for (const level of ["beginner", "novice", "intermediate", "advanced"]) {
  const row = byLevel.get(level);
  if (!row) continue;
  console.log(`  ${level.padEnd(14)}${String(row.n).padStart(6)}${pct(row.under, row.n).padStart(13)}${pct(row.over, row.n).padStart(13)}`);
}
console.log("  days          groups    under 0.8    over 1.25");
for (const days of DAY_COUNTS) {
  const row = byDays.get(days);
  if (!row) continue;
  console.log(`  ${String(days).padEnd(14)}${String(row.n).padStart(6)}${pct(row.under, row.n).padStart(13)}${pct(row.over, row.n).padStart(13)}`);
}
/* The two axes crossed, because they are not independent: a four day Upper and
   Lower week hits every group twice and divides the weekly target by two, so it
   lands short in a way a three day week does not, and averaging the two hides
   the corner that is actually wrong. */
console.log("  level x days   groups    under 0.8    over 1.25");
for (const level of ["beginner", "novice", "intermediate", "advanced"]) {
  for (const days of DAY_COUNTS) {
    const row = crossed.get(`${level}|${days}`);
    if (!row) continue;
    console.log(`  ${`${level.slice(0, 5)} ${days}d`.padEnd(15)}${String(row.n).padStart(5)}${pct(row.under, row.n).padStart(13)}${pct(row.over, row.n).padStart(13)}`);
  }
}
console.log("");

if (failing.length) {
  console.log("FIRST FAILING INPUTS");
  for (const [inv, r] of failing) {
    console.log(`  ${inv}`);
    for (const f of r.fail) console.log(`    ${JSON.stringify(f.input)}  ${f.detail}`);
  }
  console.log("");
}
if (warning.length) {
  console.log("FIRST WARNING INPUTS");
  for (const [inv, r] of warning) {
    console.log(`  ${inv}`);
    for (const f of r.warn) console.log(`    ${JSON.stringify(f.input)}  ${f.detail}`);
  }
  console.log("");
}

console.log(failing.length
  ? "SWEEP FAILED"
  : opened.length
    ? `SWEEP CLEAN, ${opened.length} known open finding(s) above that the fix for lives elsewhere`
    : "SWEEP CLEAN");
process.exit(failing.length ? 1 : 0);
