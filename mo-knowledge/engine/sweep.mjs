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
import { jointLoadFor } from "./joint-load.mjs";
import { MUSCLE_GROUPS } from "./focus.mjs";
import { buildMuscleIndex, muscleRecoveryStates } from "./recovery.mjs";
import { readFileSync } from "node:fs";
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
   reason demo.mjs --check exists: two files describing the same nine bubbles
   drift, and a sweep that swept a stale list would be reporting on a goal set
   nobody ships. Every bubble contributes its children plus the bubble on its
   own, because the bubble default is a parameter set a real user can land on
   (they tapped the tile and never picked a child) and it is the one no test
   names. */
function goalCases() {
  const tree = JSON.parse(readFileSync(join(here, "../goals/goal-tree.json"), "utf8"));
  const out = [];
  for (const bubble of tree.bubbles || []) {
    out.push({ id: `${bubble.id}/_default`, goal_bubble: bubble.id, goal_child: null });
    for (const child of bubble.children || []) {
      out.push({ id: `${bubble.id}/${child.id}`, goal_bubble: bubble.id, goal_child: child.id });
    }
  }
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
 * Four smaller blocks then cover what a round robin cannot: matched focus
 * pairs, trained-yesterday recovery, the focus day request, and determinism.
 */

/* ------------------------------------------------------------------ *
 * Bookkeeping
 * ------------------------------------------------------------------ */

const FAIL = "fail";
const WARN = "warn";
const results = new Map();   // invariant -> { fail: [], warn: [], fails: n, warns: n }

function record(kind, invariant, input, detail) {
  let row = results.get(invariant);
  if (!row) { row = { fail: [], warn: [], fails: 0, warns: 0 }; results.set(invariant, row); }
  if (kind === FAIL) { row.fails++; if (row.fail.length < 5) row.fail.push({ input, detail }); }
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
  const plan = out.plan;
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

  if (!(typeof out.honest === "string" || out.honest === null)) {
    fail("honest-type", input, `honest is ${typeof out.honest}`);
  }
  if (!Array.isArray(out.meta?.missing) || out.meta.missing.some((m) => typeof m !== "string")) {
    fail("meta-missing-type", input, JSON.stringify(out.meta?.missing));
  }
  if (!LEVEL_RANK.hasOwnProperty(out.meta?.level)) {
    fail("level-value", input, `level ${JSON.stringify(out.meta?.level)}`);
  }

  if (!plan) return;

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
      warn("over-time-budget", input, `${d.name} ${d.estimatedMinutes} min against ${d.minutes} (${out.meta.level})`);
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
  for (const [group, row] of Object.entries(plan.weeklyVolume || {})) {
    if (!(row.sets >= 0)) fail("volume-ledger", input, `${group} sets ${JSON.stringify(row.sets)}`);
    if (!(row.target > 0)) fail("volume-ledger", input, `${group} target ${JSON.stringify(row.target)}`);
    if (row.target > 0) ratios.push({ level: out.meta.level, days: plan.days, group, ratio: row.sets / row.target });
  }

  /* ---- focus, the body map half ---- */
  const applied = out.meta?.focus?.applied || [];
  if (!Array.isArray(applied) || applied.some((g) => !GROUP_SET.has(g))) {
    fail("focus-applied-subset", input, JSON.stringify(applied));
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

console.log("");
console.log("ENGINE SWEEP");
console.log(`  runs              ${runs}`);
console.log(`  goal selections   ${GOALS.length} (9 bubbles, every child plus every bubble default)`);
console.log(`  threw             ${threw}`);
console.log(`  ledger rows       ${ratios.length}`);
console.log("");

console.log("FAILS");
if (!failing.length) console.log("  none");
for (const [inv, r] of failing.sort((a, b) => b[1].fails - a[1].fails)) {
  console.log(`  ${String(r.fails).padStart(7)}  ${inv}`);
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

console.log(failing.length ? "SWEEP FAILED" : "SWEEP CLEAN");
process.exit(failing.length ? 1 : 0);
