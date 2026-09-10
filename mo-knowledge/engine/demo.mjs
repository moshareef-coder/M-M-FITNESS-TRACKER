/* Run the engine over a handful of made up people and print the weeks, so the
 * output can be judged by reading rather than by running. The brief asks for
 * exactly this and it is a fair ask: a plan you have to execute to evaluate is
 * a plan nobody evaluates.
 *
 *   node mo-knowledge/engine/demo.mjs
 *   node mo-knowledge/engine/demo.mjs --check     (coverage only, exits nonzero on drift)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildPlan } from "./plan.mjs";
import { GOAL_PARAMS } from "./goal-engine.mjs";
import { pairPlan } from "./pair.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const TREE = JSON.parse(readFileSync(join(here, "../goals/goal-tree.json"), "utf8"));

/* The research tree and the executable table are two files that describe the same
   thing, so they will drift unless something checks. This is that something. */
export function checkTreeCoverage() {
  const problems = [];
  for (const b of TREE.bubbles) {
    const table = GOAL_PARAMS[b.id];
    if (!table) { problems.push(`bubble "${b.id}" (${b.label}) has no parameters`); continue; }
    for (const k of b.children) {
      if (!table[k.id]) problems.push(`  "${b.label} / ${k.label}" (${k.id}) falls back to the bubble default`);
    }
  }
  for (const id of Object.keys(GOAL_PARAMS)) {
    if (!TREE.bubbles.some((b) => b.id === id)) problems.push(`parameters for "${id}" but no such bubble in the tree`);
  }
  return problems;
}

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

function printPlan(p) {
  const t = p.trainingAge;
  console.log(`  level ${p.level} (${t.confidence} confidence, ${t.effectiveSessions} sessions)`
    + ` | ${p.days} days, ${p.restDays} rest | ${p.progression.rule} progression`
    + (p.deload ? `, deload every ${p.deload.everyWeeks}w` : ""));
  if (p.honest?.message) console.log(`\n  "${p.honest.message}"`);
  for (const n of p.dayNotes) console.log(`\n  ${n}`);
  if (p.missing.length) console.log(`\n  Working without: ${p.missing.join("; ")}.`);
  for (const d of p.week) {
    /* Two numbers, because they used to be one and it was the wrong one.
       `minutes` is the budget the goal asked for; `estimatedMinutes` is what the
       sets, reps and rest intervals below actually add up to. */
    console.log(`\n  ${d.name}${d.short ? "  (kept short)" : ""}  ~${d.estimatedMinutes} min against a ${d.minutes} min budget`);
    for (const e of d.exercises) {
      const load = e.weight != null ? `${e.weight} lb` : e.loadBasis === "bodyweight" ? "bodyweight" : "your call";
      console.log(`    ${e.name.padEnd(28)} ${String(e.sets + "x" + e.reps).padEnd(6)} ${load.padStart(11)}`
        + `   ${e.restSec}s rest   swap: ${e.swap || "none"}${e.priority ? "   [priority]" : ""}`);
      if (e.note) console.log(`      ${e.note}`);
    }
  }
  /* The week's own ledger. Printed because a total nobody can see is a total
     nobody checks, and every volume bug in this folder was found by adding one
     column to a printout. */
  const v = p.weeklyVolume;
  const line = Object.keys(v.byGroup).sort()
    .map((g) => `${g} ${v.byGroup[g]}/${v.targetByGroup[g]}`).join("  ");
  console.log(`\n  Weekly sets per group, against target: ${line}`);
  for (const t of v.trimmed) console.log(`    Trimmed: ${t.why}`);
  for (const u of v.under) console.log(`    Short: ${u.why}`);
  for (const t of v.timeTrimmed) console.log(`    Dropped for time: ${t.dropped} from ${t.day}.`);

  const first = p.week[0]?.exercises[0];
  if (first) console.log(`\n  Where the first weight came from: ${first.loadNote}`);
  console.log(`  Cardio: ${p.cardio.sessions} x ${p.cardio.minutes} min ${p.cardio.zone}.`);
}

function main() {
  const problems = checkTreeCoverage();
  console.log(problems.length
    ? `Tree coverage: ${problems.length} gaps\n${problems.join("\n")}\n`
    : `Tree coverage: every bubble and child in goal-tree.json has parameters.\n`);
  if (process.argv.includes("--check")) process.exit(problems.length ? 1 : 0);

  for (const c of PEOPLE) {
    console.log("\n" + "=".repeat(78) + `\n${c.who}\n` + "=".repeat(78));
    printPlan(buildPlan({ goal: c.goal, person: c.person, logs: c.logs }));
  }

  console.log("\n" + "=".repeat(78) + "\nThe pair: those first two people, together\n" + "=".repeat(78));
  const a = { name: "Mo", plan: buildPlan({ goal: PEOPLE[0].goal, person: PEOPLE[0].person, logs: PEOPLE[0].logs }), logs: PEOPLE[0].logs, doneThisWeek: 3, compare: { liftedLb: 185, bodyWeightLb: 265, sex: "Male" } };
  const b = { name: "Mell", plan: buildPlan({ goal: PEOPLE[1].goal, person: PEOPLE[1].person, logs: PEOPLE[1].logs }), logs: PEOPLE[1].logs, doneThisWeek: 2, compare: { liftedLb: 85, bodyWeightLb: 145, sex: "Female" } };
  const pair = pairPlan({ a, b });
  console.log(`\n  Together on: ${pair.schedule.together.join(", ") || "no overlap"}`);
  if (pair.schedule.aAlone.length) console.log(`  Mo alone on: ${pair.schedule.aAlone.join(", ")}`);
  if (pair.schedule.bAlone.length) console.log(`  Mell alone on: ${pair.schedule.bAlone.join(", ")}`);
  console.log(`  Chosen because: ${pair.schedule.basis}.`);
  console.log(`\n  The week: ${pair.week.line}`);
  console.log(`  ${pair.week.landed ? "Landed for both." : "Not landed yet, and it takes both."}`);
  console.log(`\n  Comparison shown: ${pair.comparison.kind} (${pair.comparison.fairness})`);
  console.log(`  "${pair.comparison.line}"`);
  console.log(`  Why: ${pair.comparison.why}`);
  console.log(`\n  Note the two plans are different goals and different day counts, and they still\n  share a rhythm. Nothing about either prescription was compromised to do it.\n`);
}

main();
