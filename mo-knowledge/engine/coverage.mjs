/* How much of the library a person ever sees.
 *
 * Run it:  node mo-knowledge/engine/coverage.mjs
 *          node mo-knowledge/engine/coverage.mjs --weeks=24 --verbose
 *
 * Measured on 2026-09-21, before rotation existed: across many generated
 * weeks the engine reached 21 of the 158 movements people were eligible for.
 * Not the earning rule, which moved one movement when deleted; it was
 * selection being a sort with no memory, so the same top scored movement won
 * the same slot every week for everybody with the same profile. This script
 * is the instrument for that number, so the claim can be re-measured rather
 * than remembered.
 *
 * A handful of people, each replayed for twelve weeks the way sweep.mjs's
 * block F replays: build the week, save every day of it back as the app
 * would (through toWorkout, so the plan rows carry exactly the fields the
 * app stores, rotation memory included), log it, build the next week. Two
 * kinds of logging, because the owner's rule turns on them: a progressing
 * lift logs what it was prescribed and the calibration pushes it up; a
 * stalled one logs the same weight every session, a rep short of the
 * target, which is what a real stall looks like in exercise_logs.
 *
 * Three numbers come out, and the second is the one that must never move:
 *
 *   reach      distinct movements prescribed across the whole run, against
 *              the movements those people were eligible for (eligibleMovements
 *              in plan.mjs, the same `candidates` the week is built from).
 *   anchors    of the main slots on a progressing person, how many weeks kept
 *              the movement they opened with. 100% is the rule: never rotate a
 *              movement someone is making progress on.
 *   rotations  how many stalled anchors were rotated, and whether the stand-in
 *              was then held rather than flipped back the next week.
 *
 * Node only, like sweep.mjs. Never vendored. */
import { buildPlan, eligibleMovements } from "./plan.mjs";
import { toWorkout } from "./adapter.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const WEEKS = Number(args.weeks) || 12;
const VERBOSE = Boolean(args.verbose);

/* One fixed clock, for the same reason sweep.mjs has one: rotation reads the
   calendar, and a run that cannot be reproduced from what it printed is not a
   measurement. A Monday, so week w starts on a Monday. */
const START = new Date(2026, 5, 1, 12, 0, 0);
const DAY_MS = 86400000;
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/* Each person: who they are, and which of their anchors stall.
   `stall` is how many of the opening week's main lifts stop moving, taken in
   card order. Infinity is everybody's nightmare week, every main flat. */
const PEOPLE = [
  { id: "muscle 4d, all progressing", goal: { bubble: "build-muscle" }, person: { bodyWeightLb: 195, sex: "Male", daysAsked: 4 }, stall: 0 },
  { id: "muscle 4d, one anchor stalled", goal: { bubble: "build-muscle" }, person: { bodyWeightLb: 195, sex: "Male", daysAsked: 4 }, stall: 1 },
  { id: "strength 3d, every main stalled", goal: { bubble: "get-stronger" }, person: { bodyWeightLb: 140, sex: "Female", daysAsked: 3 }, stall: Infinity },
  { id: "lose weight 3d, generates and never trains", goal: { bubble: "lose-weight" }, person: { bodyWeightLb: 210, sex: "Male", daysAsked: 3 }, stall: 0, trains: false },
  { id: "muscle 5d, no barbell, progressing", goal: { bubble: "build-muscle" }, person: { bodyWeightLb: 165, sex: "Female", daysAsked: 5 }, stall: 0, limits: { hurts: [], missing: ["barbell"] } },
  { id: "feel better 2d, progressing", goal: { bubble: "feel-better" }, person: { bodyWeightLb: 180, sex: null, daysAsked: 2 }, stall: 0 },
];

function replay(who) {
  const logs = [];
  const plans = [];
  const stalledAt = new Map();          // name -> the weight it is stuck at
  let stalledNames = null;              // decided off the opening week
  const seen = new Set();
  const weeks = [];
  let rotations = 0;
  const holdWeeks = new Map();          // "from>to" -> weeks the stand-in was on the card
  let anchorWeeks = 0, anchorKept = 0;
  let opening = null;                    // day index -> main names on week 0

  for (let w = 0; w < WEEKS; w++) {
    const today = new Date(START.getTime() + w * 7 * DAY_MS);
    const window = (rows, days) => rows.filter((r) => r.entry_date >= iso(new Date(today.getTime() - days * DAY_MS)));
    const plan = buildPlan({
      goal: who.goal, person: who.person, limits: who.limits ?? null,
      /* The app's own windows: ninety days of logs, thirty of plans. */
      logs: window(logs, 90), plans: window(plans, 30), today,
    });
    const mains = plan.week.map((d) => d.exercises.filter((e) => e.role === "main").map((e) => e.name));
    if (w === 0) {
      opening = mains;
      /* Only a loaded lift can stall: detectPlateau skips loadless rows on
         purpose, so a push-up "stuck at 0 lb" is not a stall and choosing one
         here would measure nothing. */
      const loaded = plan.week.flatMap((d) => d.exercises.filter((e) => e.role === "main" && e.equipment !== "bodyweight").map((e) => e.name));
      const flat = [...new Set(loaded)].slice(0, who.stall === Infinity ? undefined : who.stall);
      stalledNames = new Set(flat.map((n) => n.toLowerCase()));
    }
    for (const d of plan.week) for (const e of d.exercises) seen.add(e.name);
    weeks.push({
      w, days: plan.week.map((d) => d.exercises.map((e) => e.name)), notes: plan.dayNotes, rotation: plan.rotation,
      /* What pass 4 saw and said, so a run with no rotations can be read
         rather than guessed at. */
      signal: `linear ${plan.trainingAge.stillLinear} conf ${plan.trainingAge.confidence} flat [${(plan.trainingAge.plateau?.lifts || []).map((l) => `${l.name} ${l.weeksFlat}w/${l.sessionsFlat}s`).join(", ")}]`
        + ` -> ${plan.plateau.responses.map((r) => `${r.exercise}:${r.action}${r.reason ? `(${r.reason})` : ""}`).join(", ") || "none"}${plan.plateau.summary.action !== "none" ? ` [${plan.plateau.summary.action}]` : ""}`,
    });
    rotations += (plan.rotation?.anchors || []).length;
    for (const h of [...(plan.rotation?.anchors || []), ...(plan.rotation?.held || [])]) {
      const k = `${h.from}>${h.to}`;
      holdWeeks.set(k, (holdWeeks.get(k) || 0) + 1);
    }
    /* Anchor stability, counted on the lifts that are NOT the ones this run
       deliberately stalled: those are supposed to move. */
    if (w > 0) {
      mains.forEach((names, di) => {
        (opening[di] || []).forEach((name, j) => {
          if (stalledNames.has(name.toLowerCase())) return;
          anchorWeeks++;
          if (names[j] === name) anchorKept++;
        });
      });
    }

    /* Save the week back the way the app does, and train it. */
    plan.week.forEach((d, i) => {
      const stamp = iso(new Date(today.getTime() + i * DAY_MS));
      const stored = toWorkout(plan, i);
      const trains = who.trains !== false;
      plans.push({ entry_date: stamp, focus: d.name, exercises: stored.exercises, completed_at: trains ? `${stamp}T18:00:00Z` : null });
      if (!trains) return;
      for (const e of d.exercises) {
        const key = e.name.toLowerCase();
        /* A first week carries no weight on purpose (no number until there is
           one on the record), so the person finds one: a modest starter on
           anything loadable, which the engine then progresses from. */
        const prescribed = e.weight > 0 ? e.weight : (e.equipment !== "bodyweight" ? 45 : 0);
        const stalled = stalledNames.has(key) && prescribed > 0;
        if (stalled && !stalledAt.has(key)) stalledAt.set(key, prescribed);
        logs.push({
          entry_date: stamp, exercise_name: e.name, sets: e.sets,
          reps: stalled ? Math.max(1, e.reps - 1) : e.reps,
          weight: stalled ? stalledAt.get(key) : prescribed,
        });
      }
    });
  }

  const eligible = eligibleMovements({ days: who.person.daysAsked, limits: who.limits ?? null });
  return { who, seen, eligible, weeks, rotations, holdWeeks, anchorWeeks, anchorKept, stalledNames };
}

const results = PEOPLE.map(replay);

console.log(`COVERAGE, ${WEEKS} weeks each, clock pinned at ${iso(START)}`);
console.log("");
const allSeen = new Set(), allEligible = new Set();
for (const r of results) {
  for (const n of r.seen) allSeen.add(n);
  for (const n of r.eligible) allEligible.add(n);
  const stable = r.anchorWeeks ? `${Math.round(100 * r.anchorKept / r.anchorWeeks)}%` : "n/a";
  const holds = [...r.holdWeeks.entries()].map(([k, n]) => `${k} x${n}`).join(", ");
  console.log(`  ${r.who.id}`);
  console.log(`    reached ${r.seen.size} of ${r.eligible.length} eligible, progressing anchors kept ${stable} (${r.anchorKept}/${r.anchorWeeks}), anchor rotations ${r.rotations}${holds ? `, stand-ins held: ${holds}` : ""}`);
  if (VERBOSE) {
    for (const wk of r.weeks) {
      console.log(`      week ${String(wk.w + 1).padStart(2)}  ${wk.days.map((d) => d.join(", ")).join("  |  ")}`);
      console.log(`               ${wk.signal}`);
      for (const n of wk.notes) if (/Swapped in|standing in|Rotated accessories/.test(n)) console.log(`               ${n}`);
    }
  }
}
console.log("");
console.log(`  TOTAL reached ${allSeen.size} of ${allEligible.size} eligible movements across ${results.length} people`);
const progressing = results.filter((r) => r.who.stall === 0 && r.who.trains !== false);
const kept = progressing.reduce((n, r) => n + r.anchorKept, 0), of = progressing.reduce((n, r) => n + r.anchorWeeks, 0);
console.log(`  ANCHORS on progressing people kept ${of ? Math.round(1000 * kept / of) / 10 : 0}% of the time (${kept}/${of})`);
const stalledPeople = results.filter((r) => r.who.stall > 0);
console.log(`  STALLED anchors rotated ${stalledPeople.reduce((n, r) => n + r.rotations, 0)} times across ${stalledPeople.length} stalled people`);
