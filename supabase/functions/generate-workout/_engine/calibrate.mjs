/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/calibrate.mjs. Do not edit here. */
/* Plan versus actual, which is RPE without asking for RPE.
 *
 * research/07, "Plan versus actual is computable and never computed": the app
 * already stores what was prescribed in `ai_workouts.exercises` (sets, reps,
 * targetWeight, and a `completed_at` once the session is finished) and what
 * really happened in `exercise_logs` (sets, reps, weight). Both are keyed by
 * email and entry_date. Nothing has ever joined them. That join is the richest
 * signal in the product and it costs no question, no new table and no model
 * call.
 *
 * Every serious app asks for an effort rating after a set. Most people do not
 * answer, or answer badly, or stop by week two. Nobody lies about what they
 * logged, because they were not answering anything.
 *
 * The mapping below is research/07's table made runnable:
 *
 *   every set completed at or above target   ->  too easy, go up
 *   sets complete, reps slightly under       ->  calibration is right, hold course
 *   sets abandoned or weight dropped         ->  too heavy, hold or reduce
 *   the exercise simply never happened       ->  a pain or preference signal
 *
 * research/07 rates that table "medium confidence: coaching judgement, tune it
 * against real data before it drives anything automatically". So the numbers
 * here are small on purpose. The largest thing this file can do to a load is
 * move it one step, 2.5 to 10 lb depending on the lift, and never more than a
 * tenth of what is already on the bar.
 */
import { patternFor } from "./load.mjs";

/* How far a load moves when the evidence says it should.
 *
 * This used to be a percentage: 1.05 on a compound, 1.025 on an isolation lift.
 * The percentage was the wrong shape, not the wrong number, and it is worth
 * saying why before somebody is tempted to tune 1.025 up to 1.05 and call it
 * fixed. `roundLoad` snaps to a 2.5 lb grid under 40 lb and a 5 lb grid above
 * it, because that is what a rack actually holds. A multiplier produces a step
 * proportional to the weight, so at small weights the step lands inside the grid
 * and rounds straight back to where it started. 2.5 percent of a 25 lb curl is
 * 0.625 lb, which is no lb. Eight weeks of hitting every rep left that curl at
 * 25 while the bench went 70 to 100. PUSH_COMPOUND had the same disease in the
 * range beginners actually live in: 5 percent of anything under 50 lb is under
 * 2.5, so a 45 lb goblet squat never moved either. Raising the percentage only
 * moves the weight at which it starts failing; it cannot fix a mechanism whose
 * step shrinks exactly where the grid is coarsest relative to the load.
 *
 * knowledge/principles/progressive-overload.md prescribes the right shape
 * directly: "If they hit their planned reps last time: add load. Typical jump is
 * 2.5-10lb depending on the lift (small joints/isolation moves get smaller jumps
 * than squat/deadlift/bench)." An absolute step in pounds. So that is what this
 * file computes now, and the factor it hands back is only the transport, because
 * load.mjs multiplies.
 *
 * The pattern comes from load.mjs, which already classifies every exercise by
 * name. No new input.
 */
export const STEP_ISOLATION = 2.5;   // curls, raises, pushdowns, calves, core
export const STEP_COMPOUND = 5;      // bench, press, row, pull, lunge, carry
export const STEP_HEAVY = 10;        // squat and hinge, the two the note names

const STEP_BY_PATTERN = {
  isolation: STEP_ISOLATION,
  core: STEP_ISOLATION,
  squat: STEP_HEAVY,
  hinge: STEP_HEAVY,
};

/* A ceiling, not the mechanism. research/05's rule still holds, wrong low costs
   one easy set and wrong high costs the session, and 10 lb onto a 45 lb goblet
   squat is a fifth of the lift. So the absolute step decides the move and a
   percentage only ever trims it, never sets it, and never below one grid space,
   because trimming under the grid is how the no-op got here in the first
   place. */
const STEP_CEILING_PCT = 0.10;

/* load.mjs's `roundLoad` grid, mirrored rather than imported because it is not
   exported as a number. Anything smaller than one grid space is not a step, it
   is the no-op this file exists to remove, so the grid is the floor in both
   directions: a 2.5 lb move on a 45 lb pushdown rounds straight back to 45 going
   up and to 45 going down, and the person sees nothing happen either way. That
   is why a 45 lb curl moves 5 lb and a 25 lb curl moves 2.5. If roundLoad ever
   learns about a real plate inventory, this follows it. */
const gridAt = (lb) => (lb < 40 ? 2.5 : 5);

export function stepFor(name, currentLb) {
  const step = STEP_BY_PATTERN[patternFor({ name })] ?? STEP_COMPOUND;
  if (!(currentLb > 0)) return step;
  const grid = gridAt(currentLb);
  const capped = Math.min(step, currentLb * STEP_CEILING_PCT);
  return Math.max(grid, Math.round(capped / grid) * grid);
}

/* Three sessions is the window. Two is enough to see a pattern and four starts
   describing a person they no longer are. */
const WINDOW = 3;

const lower = (s) => String(s || "").trim().toLowerCase();

/* A number this file is willing to do arithmetic with, or nothing.
 *
 * This module was written against `ai_workouts` rows as the app writes them and
 * it had never once run on real input, because the two arguments it needs were
 * not being passed (see adapter.mjs). The day they started being passed, every
 * read in here became a read of whatever a payload happens to carry, and the
 * fuzz found the difference immediately. So the rule for the whole file is the
 * one the rest of the engine already uses for row data: a row we cannot believe
 * contributes NO signal, and never an exception. A bad row in somebody's plan
 * history has to degrade to "nothing learned from that row". A throw here is a
 * failed generate, and a failed generate is no workout at all, which is a far
 * worse answer than an uncalibrated one.
 *
 * `Number("")` is 0 and `Number({})` is NaN, and both used to get through. A
 * NaN never throws, it just makes every comparison below false in silence,
 * which is the quietest way to get a wrong verdict. Non-finite is not a number
 * to this file, it is an absence, and an absence already has a branch. */
const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* A row is a row: a plain object, not a number, a string, an array or a null.
   The app never sends anything else; a crafted body does. */
const isRow = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const rowsOf = (v) => (Array.isArray(v) ? v.filter(isRow) : []);
/* `entry_date` is only ever used as a map key and a sort key, so it wants to be
   a string and does not have to be a date. Anything unstringable is not a day. */
const dateOf = (v) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
/* A name is the only handle plans and logs share, so a row without a usable one
   cannot be joined to anything and is not evidence about any exercise. */
const nameOf = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Join what was planned to what was done.
 *
 * Only plans carrying `completed_at` count. A plan that was generated and never
 * started is not evidence about load, it is evidence about a Tuesday, and
 * research/07 is explicit that an abandoned session should not be punished.
 *
 * A planned exercise with no matching log comes back with `actual: null`, which
 * is the skip signal rather than an absence of data.
 *
 * Every read below is guarded, and the guards drop rather than repair: see
 * `num` above for why a row we cannot believe has to contribute nothing.
 */
export function joinPlanToActual({ plans = [], logs = [] } = {}) {
  const done = rowsOf(plans).filter((p) => p.completed_at);

  /* One pass over the logs, bucketed by date and name, so a long history does
     not turn this into a nested scan. */
  const byDateName = new Map();
  for (const l of rowsOf(logs)) {
    const name = nameOf(l.exercise_name);
    if (!name) continue;
    const key = `${dateOf(l.entry_date)}|${lower(name)}`;
    if (!byDateName.has(key)) byDateName.set(key, l);
  }

  const rows = [];
  for (const p of done) {
    const date = dateOf(p.entry_date);
    /* `p.exercises` is a list on every row the app writes and can be anything
       at all on a row it did not. Not iterable is not empty: it is a row that
       says nothing, which is the same answer. */
    for (const ex of rowsOf(p.exercises)) {
      const name = nameOf(ex.name);
      if (!name) continue;
      const hit = byDateName.get(`${date}|${lower(name)}`);
      rows.push({
        entry_date: date,
        exercise: name,
        planned: {
          sets: num(ex.sets),
          reps: num(ex.reps),
          targetWeight: num(ex.targetWeight),
        },
        actual: hit
          ? { sets: num(hit.sets), reps: num(hit.reps), weight: num(hit.weight) }
          : null,
      });
    }
  }
  return rows;
}

/* Bodyweight work has no target to beat, so a missing or zero targetWeight is
   treated as satisfied rather than as a failure. Otherwise every push-up in the
   plan would read as too heavy forever. */
const weightMet = (planned, actual) =>
  !planned.targetWeight ? true : (actual.weight ?? 0) >= planned.targetWeight;

const weightDropped = (planned, actual) =>
  Boolean(planned.targetWeight) && actual.weight != null && actual.weight < planned.targetWeight;

const setsMet = (planned, actual) =>
  planned.sets == null || (actual.sets ?? 0) >= planned.sets;

const repsShort = (planned, actual) =>
  planned.reps == null ? 0 : Math.max(0, planned.reps - (actual.reps ?? 0));

/* Row one of research/07's table: every set completed at or above target. */
const isEasy = (r) =>
  Boolean(r.actual) && setsMet(r.planned, r.actual) && repsShort(r.planned, r.actual) <= 0 && weightMet(r.planned, r.actual);

/* Row three: later sets abandoned, or the weight came down, or the reps fell a
   long way short. Any one of the three is enough. */
const isStruggle = (r) =>
  Boolean(r.actual) && (
    (r.planned.sets != null && (r.actual.sets ?? 0) < r.planned.sets)
    || weightDropped(r.planned, r.actual)
    || repsShort(r.planned, r.actual) >= 3
  );

/* What the person is actually lifting on this movement right now, which is what
   an absolute step has to be measured against. The heaviest logged weight in the
   window rather than the most recent, because that is the row load.mjs's
   `fromHistory` will pick as the base, and a step measured against a different
   base than it is applied to is a step of the wrong size. Falls back to what was
   prescribed, and comes back 0 for bodyweight work, which has no load to add. */
const currentLoad = (rows) => {
  let w = 0;
  for (const r of rows) {
    w = Math.max(w, Number(r.actual?.weight) || 0, Number(r.planned?.targetWeight) || 0);
  }
  return w;
};

/* Pounds turned into the factor load.mjs multiplies by. A move of zero pounds,
   which is every bodyweight movement, comes back as 1 rather than as a division
   by zero, so a push-up is left alone on purpose and not by accident. */
const factorFor = (current, stepLb) => (current > 0 ? (current + stepLb) / current : 1);

/**
 * One exercise's joined rows in, a verdict and a load factor out.
 *
 * Reads the three most recent completed sessions. Everything it says it can
 * defend from those rows, which is why `why` is a sentence rather than a code.
 */
export function calibrateExercise(rows = []) {
  /* Exported, so it is not only `calibrate` below that reaches it, and a caller
     holding rows it built itself is exactly how a shape this file does not
     expect gets in. Same rule as everywhere else here: a row that is not a row
     is not evidence, and `planned` and `actual` are filled in rather than
     assumed, because every predicate below reads through them. */
  const sorted = rowsOf(rows)
    .map((r) => ({ ...r, planned: isRow(r.planned) ? r.planned : {}, actual: isRow(r.actual) ? r.actual : null }))
    .sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));
  const recent = sorted.slice(0, WINDOW);
  const name = recent[0]?.exercise || sorted[0]?.exercise || null;
  const base = { name, sessions: recent.length };

  if (recent.length < 2) {
    return { ...base, verdict: "unknown", nextLoadStep: 0, nextLoadFactor: 1, why: "Not enough finished sessions with this movement yet to say anything honest about the weight." };
  }

  /* Checked before anything numeric, because a skipped exercise produces no
     numbers at all. research/07: which exercise gets abandoned tells us about
     pain or preference more bluntly than any questionnaire would. */
  const last2 = recent.slice(0, 2);
  if (last2.every((r) => !r.actual)) {
    return {
      ...base,
      verdict: "skipped",
      nextLoadStep: 0,
      nextLoadFactor: 1,
      swapSuggested: true,
      why: "This was in the last two sessions you finished and it never got logged, so it is either sore or it is not for you. The swap is there.",
    };
  }

  const done = recent.filter((r) => r.actual);
  if (done.length < 2) {
    return { ...base, verdict: "unknown", nextLoadStep: 0, nextLoadFactor: 1, why: "Only one logged set of numbers so far, so the weight stays where it is until there are two." };
  }

  const current = currentLoad(done);
  const step = current > 0 ? stepFor(name, current) : 0;

  const pair = done.slice(0, 2);
  if (pair.every(isEasy)) {
    return {
      ...base,
      verdict: "too-easy",
      nextLoadStep: step,
      nextLoadFactor: factorFor(current, step),
      why: "You hit every set, every rep and the target weight twice in a row, so that weight is no longer the hard part.",
    };
  }

  const last = done[0];
  if (isStruggle(last)) {
    /* Down by the same step it would have gone up by. A percentage failed in
       this direction too: 0.95 of a 25 lb curl is 23.75, which rounds back to
       25, so the back-off a struggling person was promised never happened. */
    /* Never far enough down to reach zero or below: the lightest thing the grid
       can express is one 2.5 lb step, and a prescription of nothing is not a
       back-off, it is a missing exercise. */
    const down = Math.min(step, Math.max(0, current - gridAt(current)));
    return {
      ...base,
      verdict: "too-heavy",
      nextLoadStep: -down,
      nextLoadFactor: factorFor(current, -down),
      why: "Last time the sets or the reps came up short of the plan, so the weight comes down slightly rather than you failing it again.",
    };
  }

  return {
    ...base,
    verdict: "on-track",
    nextLoadStep: 0,
    nextLoadFactor: 1,
    why: "You are finishing the sets and landing a rep or two under target, which is exactly where the weight should be.",
  };
}

/**
 * The whole picture: every exercise judged, plus one word for the week.
 *
 * `overall` is deliberately hard to trip. One easy lift is a good day, and
 * research/09 says the fastest way to lose somebody is a plan that reacts to
 * noise, so it takes two exercises pointing the same way before the week moves.
 */
export function calibrate({ plans = [], logs = [] } = {}) {
  const rows = joinPlanToActual({ plans, logs });

  const grouped = new Map();
  for (const r of rows) {
    const key = lower(r.exercise);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(r);
  }

  const byExercise = {};
  const summary = { tooEasy: 0, onTrack: 0, tooHeavy: 0, skipped: 0 };
  const COUNTER = { "too-easy": "tooEasy", "on-track": "onTrack", "too-heavy": "tooHeavy", skipped: "skipped" };

  for (const [key, list] of grouped) {
    const result = calibrateExercise(list);
    byExercise[key] = result;
    const counter = COUNTER[result.verdict];
    if (counter) summary[counter] += 1;
  }

  let overall = "hold";
  if (!rows.length) overall = "unknown";
  else if (summary.tooEasy > summary.tooHeavy && summary.tooEasy >= 2) overall = "push";
  else if (summary.tooHeavy >= 2) overall = "back-off";

  return { byExercise, summary, overall };
}
