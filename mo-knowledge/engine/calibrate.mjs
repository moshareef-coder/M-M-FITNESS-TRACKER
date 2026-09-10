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
 * move it five percent.
 */
import { patternFor } from "./load.mjs";

/* How far a load moves when the evidence says it should. Deliberately timid,
   and asymmetric: a compound climbs faster than an isolation lift because five
   percent of a curl is a number no gym owns, and research/05's rule holds here
   too, wrong low costs one easy set and wrong high costs the session. */
export const PUSH_COMPOUND = 1.05;
export const PUSH_ISOLATION = 1.025;
export const BACK_OFF = 0.95;

/* Three sessions is the window. Two is enough to see a pattern and four starts
   describing a person they no longer are. */
const WINDOW = 3;

const lower = (s) => String(s || "").trim().toLowerCase();
const num = (v) => (v == null || v === "" ? null : Number(v));

/**
 * Join what was planned to what was done.
 *
 * Only plans carrying `completed_at` count. A plan that was generated and never
 * started is not evidence about load, it is evidence about a Tuesday, and
 * research/07 is explicit that an abandoned session should not be punished.
 *
 * A planned exercise with no matching log comes back with `actual: null`, which
 * is the skip signal rather than an absence of data.
 */
export function joinPlanToActual({ plans = [], logs = [] } = {}) {
  const done = plans.filter((p) => p && p.completed_at);

  /* One pass over the logs, bucketed by date and name, so a long history does
     not turn this into a nested scan. */
  const byDateName = new Map();
  for (const l of logs) {
    if (!l || !l.exercise_name) continue;
    const key = `${l.entry_date}|${lower(l.exercise_name)}`;
    if (!byDateName.has(key)) byDateName.set(key, l);
  }

  const rows = [];
  for (const p of done) {
    for (const ex of p.exercises || []) {
      if (!ex || !ex.name) continue;
      const hit = byDateName.get(`${p.entry_date}|${lower(ex.name)}`);
      rows.push({
        entry_date: p.entry_date,
        exercise: ex.name,
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

const isIsolation = (name) => {
  const p = patternFor({ name });
  return p === "isolation" || p === "core";
};

/**
 * One exercise's joined rows in, a verdict and a load factor out.
 *
 * Reads the three most recent completed sessions. Everything it says it can
 * defend from those rows, which is why `why` is a sentence rather than a code.
 */
export function calibrateExercise(rows = []) {
  const sorted = [...rows].sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));
  const recent = sorted.slice(0, WINDOW);
  const name = recent[0]?.exercise || sorted[0]?.exercise || null;
  const base = { name, sessions: recent.length };

  if (recent.length < 2) {
    return { ...base, verdict: "unknown", nextLoadFactor: 1, why: "Not enough finished sessions with this movement yet to say anything honest about the weight." };
  }

  /* Checked before anything numeric, because a skipped exercise produces no
     numbers at all. research/07: which exercise gets abandoned tells us about
     pain or preference more bluntly than any questionnaire would. */
  const last2 = recent.slice(0, 2);
  if (last2.every((r) => !r.actual)) {
    return {
      ...base,
      verdict: "skipped",
      nextLoadFactor: 1,
      swapSuggested: true,
      why: "This was in the last two sessions you finished and it never got logged, so it is either sore or it is not for you. The swap is there.",
    };
  }

  const done = recent.filter((r) => r.actual);
  if (done.length < 2) {
    return { ...base, verdict: "unknown", nextLoadFactor: 1, why: "Only one logged set of numbers so far, so the weight stays where it is until there are two." };
  }

  const pair = done.slice(0, 2);
  if (pair.every(isEasy)) {
    const isolation = isIsolation(name);
    return {
      ...base,
      verdict: "too-easy",
      nextLoadFactor: isolation ? PUSH_ISOLATION : PUSH_COMPOUND,
      why: "You hit every set, every rep and the target weight twice in a row, so that weight is no longer the hard part.",
    };
  }

  const last = done[0];
  if (isStruggle(last)) {
    return {
      ...base,
      verdict: "too-heavy",
      nextLoadFactor: BACK_OFF,
      why: "Last time the sets or the reps came up short of the plan, so the weight comes down slightly rather than you failing it again.",
    };
  }

  return {
    ...base,
    verdict: "on-track",
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
