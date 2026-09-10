/* The bake-off: the same six people through both engines, printed side by side,
 * so the comparison is a reading exercise and not an argument about whose prose
 * is more convincing. README.md, "How the bake-off gets judged", sets the rules;
 * this file just runs them.
 *
 * PEOPLE and history() are copied from demo.mjs rather than imported, because
 * demo.mjs calls main() at import time (it is a script, not a module) and this
 * file does not want a second full print run as a side effect of importing it.
 * Keep the two lists in sync by hand if demo.mjs's people change.
 *
 * One asymmetry decides how this whole file is built, so it is worth saying once
 * up front instead of leaving it implicit in the code below: our engine derives
 * `level` from logged history (deriveTrainingAge, in training-age.mjs). Jawa's
 * buildWeekPlan cannot do that, it takes `level` as a caller-supplied argument.
 * There is no fair way to run her function "cold" the way ours runs cold, so
 * every call below tells her the level our measurement produced for that person.
 * That is not a tie we are engineering in her favour. It is a real difference in
 * what the two functions need in order to run at all, and it is printed plainly
 * per person below rather than buried in a comment.
 */
import { buildPlan } from "./plan.mjs";
import { patternFor } from "./load.mjs";
import { buildWeekPlan } from "../../knowledge/formulas/exercise-selector.mjs";

// ---------------------------------------------------------------------------
// Copied from demo.mjs: the six people and the log-history generator.
// ---------------------------------------------------------------------------
const day = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
/* What each made up person is logging. It used to be 135 for a bench press and
   185 for everything else, which quietly handed a 145 lb woman a 205 lb goblet
   squat and, through the pattern fallback, an 890 lb leg press. The engine was
   right to believe the log. The log was the lie, and made up numbers that nobody
   could lift make the whole printout impossible to judge by reading. */
const LOG_WEIGHT = {
  "Bench Press": 135,
  "Barbell Back Squat": 185,
  "Dumbbell Bench Press": 55,
  "Goblet Squat": 45,
};

/* A plausible log history: `n` sessions ending `endedDaysAgo` ago, roughly every
   other day, with the weight climbing if `climbing`. */
const history = ({ n, endedDaysAgo = 1, climbing = true, lifts = ["Bench Press", "Barbell Back Squat"] }) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const back = endedDaysAgo + (n - 1 - i) * 3;
    for (const name of lifts) {
      out.push({
        entry_date: day(-back), exercise_name: name, sets: 3, reps: 8,
        weight: (LOG_WEIGHT[name] ?? 95) + (climbing ? Math.round(i / 3) * 5 : 0),
      });
    }
  }
  return out;
};

const PEOPLE = [
  {
    who: "Day one. 265 lb, never trained, wants 20 lb off before a wedding in six weeks.",
    goal: { bubble: "lose-weight", child: "lose-by-date", amountLb: 20, byDate: new Date(Date.now() + 42 * 864e5) },
    person: { bodyWeightLb: 265, sex: "Male", daysAsked: 4 }, logs: [],
  },
  {
    who: "145 lb woman, twelve sessions in, wants toned arms and legs.",
    goal: { bubble: "tone-lean-abs", child: "tone-part" },
    person: { bodyWeightLb: 145, sex: "Female", daysAsked: 4 },
    logs: history({ n: 12, lifts: ["Dumbbell Bench Press", "Goblet Squat"] }),
  },
  {
    who: "190 lb man, 70 sessions, still adding weight, wants a 225 bench.",
    goal: { bubble: "get-stronger", child: "strong-a-lift" },
    person: { bodyWeightLb: 190, sex: "Male", daysAsked: 4 }, logs: history({ n: 70 }),
  },
  {
    who: "Trained for two years, then vanished for four months. Coming back.",
    goal: { bubble: "get-back", child: "back-after-years" },
    person: { bodyWeightLb: 185, sex: "Male", daysAsked: 3 },
    logs: history({ n: 90, endedDaysAgo: 122 }),
  },
  {
    who: "Asked for five days. The logs say two. Wants to stop quitting.",
    goal: { bubble: "consistent", child: "keep-quitting" },
    person: { bodyWeightLb: 200, sex: "Male", daysAsked: 5 },
    logs: history({ n: 10, climbing: false }),
  },
  {
    who: "54, wants to feel better and keep up. No bodyweight logged yet.",
    goal: { bubble: "feel-better", child: "energy" },
    person: { sex: "Female", daysAsked: 3 }, logs: [],
  },
];

// ---------------------------------------------------------------------------
// Our nine bubbles to her five goal strings. Only four bubbles map directly;
// everything else lands on "Stay consistent" because that is the closest of
// her five to "no PR chase, no fat-loss math, just show up", which is what the
// other five bubbles are all really asking for.
// ---------------------------------------------------------------------------
const JAWA_GOAL = {
  "lose-weight": "Lose weight",
  "build-muscle": "Build muscle",
  "get-stronger": "Get stronger",
  "tone-lean-abs": "Recomp (lose fat, gain muscle)",
};
const jawaGoalFor = (bubble) => JAWA_GOAL[bubble] || "Stay consistent";

// ---------------------------------------------------------------------------
// Normalise both engines' output to { name, exercises: [{name, sets, reps, load, equipment}] }
// so one scorecard function can read either. Nothing here changes what either
// engine produced, it only reshapes it enough to count things.
// ---------------------------------------------------------------------------
function normaliseOurs(plan) {
  return plan.week.map((d) => ({
    name: d.name,
    /* The time budget and what the prescription really costs. Hers carries
       neither, so the metric below reports ours and prints a dash for hers
       rather than inventing a number to compare against. */
    budgetMin: d.minutes, estimateMin: d.estimatedMinutes,
    exercises: d.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, load: e.weight, equipment: e.equipment, primary: e.group ? [e.group] : [] })),
  }));
}
function normaliseJawa(days) {
  return days.map((d) => ({
    name: null, // her day objects carry no name field at all
    budgetMin: null, estimateMin: null,
    exercises: (d.exercises || []).map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, load: e.targetWeight, equipment: e.equipment, primary: e.primary || [] })),
  }));
}

/* A missing hinge only means anything on a day that was supposed to train the
   posterior chain. Counting it over every day punished the split programme for
   being a split: an upper day and a push day correctly contain no deadlift, and
   the first version of this metric read those as five failures each, which made
   the one number in the table that looks like a verdict say the opposite of the
   truth. So: our days are judged by name, hers, which carry no name, by content. */
const LOWER_GROUPS = ["quads", "hamstrings", "glutes"];
const LOWER_BY_NAME = /full body|lower|leg/i;

function isLowerDay(d) {
  if (d.name) return LOWER_BY_NAME.test(d.name);
  return d.exercises.some((e) => (e.primary || []).some((g) => LOWER_GROUPS.includes(g)));
}

function scorecard(days) {
  const perDay = days.map((d) => d.exercises.length);
  let repeatedInstances = 0, lowerDays = 0, noHingeDays = 0, noLoadCount = 0, overBudgetDays = 0;
  for (const d of days) {
    if (d.budgetMin && d.estimateMin && d.estimateMin > d.budgetMin * 1.15) overBudgetDays++;
    const names = d.exercises.map((e) => e.name);
    repeatedInstances += names.length - new Set(names).size;
    if (isLowerDay(d)) {
      lowerDays++;
      const hasHinge = d.exercises.some((e) => patternFor({ name: e.name }) === "hinge");
      if (!hasHinge) noHingeDays++;
    }
    for (const e of d.exercises) {
      if (e.equipment !== "bodyweight" && e.load == null) noLoadCount++;
    }
  }
  return {
    days: days.length,
    exMin: perDay.length ? Math.min(...perDay) : 0,
    exMax: perDay.length ? Math.max(...perDay) : 0,
    repeatedInstances, lowerDays, noHingeDays, noLoadCount, overBudgetDays,
    namesPresent: days.length > 0 && days.every((d) => d.name),
  };
}

const fmtLoad = (load, equipment) =>
  equipment === "bodyweight" ? "bodyweight" : load != null ? `${load} lb` : "no load";

function printBlock(label, days, sc, error) {
  console.log(`  -- ${label} --`);
  if (error) {
    console.log(`    threw: ${error}`);
    return;
  }
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const heading = d.name ? d.name : `Day ${i + 1}  (no name)`;
    console.log(`    ${heading}`);
    for (const e of d.exercises) {
      const load = fmtLoad(e.load, e.equipment);
      console.log(`      ${e.name.padEnd(28)} ${String(e.sets + "x" + e.reps).padEnd(7)} @ ${load}`);
    }
  }
  console.log(`    scorecard: days ${sc.days} | exercises/day ${sc.exMin}-${sc.exMax}`
    + ` | repeated-in-day ${sc.repeatedInstances} | no-hinge lower days ${sc.noHingeDays}/${sc.lowerDays}`
    + ` | no-load-nonbw ${sc.noLoadCount} | day names ${sc.namesPresent ? "yes" : "no"}`);
}

// ---------------------------------------------------------------------------
// Run all six, collecting totals for the closing table plus the two specific
// checks the brief calls out by name: rep ranges moving with the goal, and
// whether a starting weight shows up for someone with no history at all.
// ---------------------------------------------------------------------------
const totals = {
  OURS: { days: 0, exMin: Infinity, exMax: 0, repeatedInstances: 0, lowerDays: 0, noHingeDays: 0, noLoadCount: 0, overBudgetDays: 0, namesAlways: true, errors: 0 },
  JAWA: { days: 0, exMin: Infinity, exMax: 0, repeatedInstances: 0, lowerDays: 0, noHingeDays: 0, noLoadCount: 0, overBudgetDays: 0, namesAlways: true, errors: 0 },
};
function addTotals(bucket, sc) {
  bucket.days += sc.days;
  bucket.exMin = Math.min(bucket.exMin, sc.exMin);
  bucket.exMax = Math.max(bucket.exMax, sc.exMax);
  bucket.repeatedInstances += sc.repeatedInstances;
  bucket.lowerDays += sc.lowerDays;
  bucket.noHingeDays += sc.noHingeDays;
  bucket.noLoadCount += sc.noLoadCount;
  bucket.overBudgetDays += sc.overBudgetDays;
  bucket.namesAlways = bucket.namesAlways && sc.namesPresent;
}

let repRangeSample = { ours: {}, jawa: {} }; // goal -> first main-lift reps, for person 0 and person 2
let startingWeight = { ours: null, jawa: null }; // person 0, no history

console.log("=".repeat(78));
console.log("ASYMMETRY, stated once: Jawa's buildWeekPlan takes level as an argument.");
console.log("Ours measures it from logged history (deriveTrainingAge) and never asks.");
console.log("Every JAWA call below is handed the level OUR engine measured for that");
console.log("person. That is a real difference in what each function needs to run,");
console.log("not a tie engineered in either direction.");
console.log("=".repeat(78));

PEOPLE.forEach((c, idx) => {
  console.log("\n" + "=".repeat(78) + `\n${c.who}\n` + "=".repeat(78));

  const ourPlan = buildPlan({ goal: c.goal, person: c.person, logs: c.logs });
  const ourDays = normaliseOurs(ourPlan);
  const ourSc = scorecard(ourDays);
  addTotals(totals.OURS, ourSc);

  const measuredLevel = ourPlan.level;
  const goalForJawa = jawaGoalFor(c.goal.bubble);
  console.log(`  goal bubble "${c.goal.bubble}" -> Jawa goal string "${goalForJawa}"`
    + ` | level told to Jawa: ${measuredLevel} (measured, not asked)`
    + ` | daysAsked ${c.person.daysAsked} | bodyWeightLb ${c.person.bodyWeightLb ?? "none"}`);

  let jawaDays = [], jawaSc = null, jawaError = null;
  try {
    const raw = buildWeekPlan({
      level: measuredLevel, goal: goalForJawa,
      daysPerWeek: c.person.daysAsked, bodyWeightLb: c.person.bodyWeightLb ?? null,
    });
    if (!Array.isArray(raw)) throw new Error(`buildWeekPlan returned ${typeof raw}, expected an array of days`);
    jawaDays = normaliseJawa(raw);
    jawaSc = scorecard(jawaDays);
    addTotals(totals.JAWA, jawaSc);
  } catch (err) {
    jawaError = err.message;
    totals.JAWA.errors++;
  }

  console.log("");
  printBlock("OURS", ourDays, ourSc, null);
  console.log("");
  printBlock("JAWA", jawaDays, jawaSc || { days: 0, exMin: 0, exMax: 0, repeatedInstances: 0, lowerDays: 0, noHingeDays: 0, noLoadCount: 0, overBudgetDays: 0, namesPresent: false }, jawaError);

  // Rep-range-vs-goal sample: person 0 is lose-weight, person 2 is get-stronger.
  if (idx === 0 || idx === 2) {
    const key = idx === 0 ? "lose-weight" : "get-stronger";
    repRangeSample.ours[key] = ourDays[0]?.exercises[0]?.reps ?? null;
    repRangeSample.jawa[key] = jawaDays[0]?.exercises[0]?.reps ?? null;
  }
  // Starting-weight-with-no-history: person 0, logs is empty.
  if (idx === 0) {
    startingWeight.ours = ourDays[0]?.exercises[0]?.load ?? null;
    startingWeight.jawa = jawaDays[0]?.exercises[0]?.load ?? null;
  }
});

// ---------------------------------------------------------------------------
// Summary table across all six people. Numbers only, the reader judges.
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(78) + "\nSummary across all six people\n" + "=".repeat(78));
const row = (label, ours, jawa) => console.log(`  ${label.padEnd(34)} ${String(ours).padEnd(20)} ${jawa}`);
console.log(`  ${"metric".padEnd(34)} ${"OURS".padEnd(20)} JAWA`);
console.log(`  ${"-".repeat(34)} ${"-".repeat(20)} ${"-".repeat(20)}`);
row("total days across 6 people", totals.OURS.days, totals.JAWA.days);
row("exercises/day, min", isFinite(totals.OURS.exMin) ? totals.OURS.exMin : "n/a", isFinite(totals.JAWA.exMin) ? totals.JAWA.exMin : "n/a");
row("exercises/day, max", totals.OURS.exMax, totals.JAWA.exMax);
row("repeated exercise in a day (count)", totals.OURS.repeatedInstances, totals.JAWA.repeatedInstances);
/* The rule is printed rather than left in the source, because a metric the
   reader has to take on trust is not a comparison, it is an assertion. */
row("lower days (ours by name, hers content)", totals.OURS.lowerDays, totals.JAWA.lowerDays);
row("of those, days with no hinge", totals.OURS.noHingeDays, totals.JAWA.noHingeDays);
row("exercise with no load, non-bw (count)", totals.OURS.noLoadCount, totals.JAWA.noLoadCount);
row("days over their time budget by 15%", totals.OURS.overBudgetDays, "no budget to be over");
row("days have names, every time", totals.OURS.namesAlways ? "yes" : "no", totals.JAWA.namesAlways ? "yes" : "no");
row("people Jawa's call errored on", "-", totals.JAWA.errors);
row("main-lift reps, lose-weight", repRangeSample.ours["lose-weight"], repRangeSample.jawa["lose-weight"]);
row("main-lift reps, get-stronger", repRangeSample.ours["get-stronger"], repRangeSample.jawa["get-stronger"]);
row("reps vary with goal (above two differ)",
  repRangeSample.ours["lose-weight"] !== repRangeSample.ours["get-stronger"] ? "yes" : "no",
  repRangeSample.jawa["lose-weight"] !== repRangeSample.jawa["get-stronger"] ? "yes" : "no");
row("starting weight, no-history person", startingWeight.ours != null ? `${startingWeight.ours} lb` : "none", startingWeight.jawa != null ? `${startingWeight.jawa} lb` : "none");
console.log("\n  Hinge rule: only a lower day can fail it. Ours counts a day whose name holds"
  + "\n  \"Full body\", \"Lower\" or \"Leg\"; hers carry no names, so a day counts when it holds"
  + "\n  any quads, hamstrings or glutes exercise. Counting every day, as this file first"
  + "\n  did, marks a correct push or upper day as a missing hinge and punishes the split.");
