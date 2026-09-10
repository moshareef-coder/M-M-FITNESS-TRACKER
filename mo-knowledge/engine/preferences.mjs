/* What they swap away from, and what they quietly stop doing.
 *
 * research/07, "Things we never record at all": if someone always swaps overhead
 * press for something else, that is an injury or a preference signal worth more
 * than any questionnaire could get, and which exercise gets abandoned tells us
 * the same thing more bluntly. The file also sets the rule this module has to
 * obey: never observe something we will not use. So swaps are read here, and
 * they change the plan here, or there was no reason to store them.
 *
 * PLAN-2.md's table is the other half of the argument. Stated preference is high
 * on the day and decays. Revealed preference rises with every session. Where
 * they disagree, revealed wins, but slowly and never silently, which is why
 * every conclusion below comes out with a sentence attached.
 *
 * Two sources, both free:
 *
 *   swaps   rows the app writes when an offered alternative is taken
 *   skips   a planned exercise with no matching log, which calibrate.mjs
 *           already derives in joinPlanToActual and calls `actual: null`
 *
 * THE TRAP, and it is the obvious one: a machine was busy. Somebody who swaps
 * the leg press once because two people were sitting on it has told us about a
 * Tuesday, not about themselves. The same goes for one missing log on a night
 * they left early. That is why nothing here fires on a single occurrence. Two
 * says there may be a pattern and earns a demotion that costs nothing, since a
 * soft avoid only sinks a lift down its own pool. Three separate decisions,
 * spread across three sessions, is a person telling us something, and only that
 * earns removal. The thresholds are the whole guard, so they are named
 * constants and they are explained rather than tuned in silence.
 */
import { TRAININGS } from "../../knowledge/exercise-library/index.mjs";
import { joinPlanToActual } from "./calibrate.mjs";

/* Two occurrences to be noticed, three to be acted on. See the trap above. */
export const SOFT_AT = 2;
export const HARD_AT = 3;

/* Ninety days, matching the far right column of research/07's "what we can know"
   table, where month three is the first point it claims a response to volume and
   a re-entry pattern are readable. Older than that is a person they may no
   longer be, which is the same reason training-age.mjs discounts sessions before
   a long gap. */
export const DEFAULT_WINDOW_DAYS = 90;

/* An equipment skew is reported only when most of the moves agree, because two
   swaps that land on two different machines are not a direction. */
const BIAS_MIN_SHARE = 0.6;

/* How hard each conclusion pushes on plan.mjs's existing ranking, where one
   whole point is one level of difference away from the lifter. So a preference
   is worth two levels and can reorder a pool, and equipment is worth a quarter
   of one, which breaks an exact tie and nothing else. That number is chosen
   rather than tuned: at 0.5 it would also cancel the half point plan.mjs adds
   for a movement above the lifter's level, which is research/05's conservative
   tie break, and no equipment habit is worth overruling that. */
const PREFER_WEIGHT = -2;
const SOFT_AVOID_WEIGHT = 2;
const EQUIPMENT_NUDGE = -0.25;

const DAY = 86400000;
const low = (s) => String(s || "").trim().toLowerCase();
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const dateKey = (d) => (d instanceof Date ? iso(d) : String(d || "").slice(0, 10));

/* The library read only, the same way plan.mjs reads it, so equipment can be
   looked up by name without this module owning a second list of exercises. */
const EQUIPMENT = new Map();
for (const lib of TRAININGS) {
  for (const cat of lib.categories || []) {
    for (const ex of cat.exercises || []) {
      if (ex && ex.name && !EQUIPMENT.has(low(ex.name))) EQUIPMENT.set(low(ex.name), ex.equipment);
    }
  }
}

const equipmentOf = (name) => EQUIPMENT.get(low(name)) || null;

const WORDS = ["zero", "once", "twice", "three times", "four times", "five times"];
const times = (n) => (n < WORDS.length ? WORDS[n] : `${n} times`);

function bump(map, name) {
  const key = low(name);
  const at = map.get(key) || { name: String(name).trim(), count: 0 };
  at.count += 1;
  map.set(key, at);
  return at;
}

/**
 * Learn what somebody prefers from what they did, never from what they said.
 *
 * @param {{ swaps?: Array<{entry_date:string, planned_exercise:string, chosen_exercise:string, source?:string}>,
 *           plans?: Array, logs?: Array, today?: Date, windowDays?: number }} input
 * @returns {{ avoid: Array<{name:string,count:number,reason:"swapped"|"skipped"|"both",strength:"soft"|"hard"}>,
 *             prefer: Array<{name:string,count:number}>,
 *             equipmentBias: {equipment:string, ratio:number, n:number}|null,
 *             why: string[], confidence: "none"|"low"|"medium"|"high" }}
 */
export function learnPreferences({
  swaps = [], plans = [], logs = [], today = new Date(), windowDays = DEFAULT_WINDOW_DAYS,
} = {}) {
  const why = [];
  const cutoff = iso(new Date(new Date(today).getTime() - windowDays * DAY));
  const inWindow = (d) => {
    const k = dateKey(d);
    return Boolean(k) && k >= cutoff;
  };

  /* ---- swaps ---- */
  const swapRows = (swaps || []).filter(
    (s) => s && s.planned_exercise && s.chosen_exercise && inWindow(s.entry_date),
  );

  const swappedAway = new Map();
  const chosen = new Map();
  /* Every swap is also, in the plan versus actual join, a planned exercise with
     no matching log. Counting both would double every swap and drag a two swap
     soft avoid over the hard line on one person's single change of mind, so a
     date and name that has a swap row is struck out of the skip count below. */
  const swappedOn = new Set();

  for (const s of swapRows) {
    bump(swappedAway, s.planned_exercise);
    bump(chosen, s.chosen_exercise);
    swappedOn.add(`${dateKey(s.entry_date)}|${low(s.planned_exercise)}`);
  }

  /* ---- skips, from the join calibrate.mjs already makes ---- */
  /* Imported rather than reimplemented. joinPlanToActual only reads plans that
     carry completed_at, which matters here: a session that was generated and
     never started is evidence about a Tuesday, and research/07 is explicit that
     an abandoned session must not be punished. A missing log inside a session
     they finished is a different thing entirely. */
  const skipRows = joinPlanToActual({ plans, logs }).filter(
    (r) => r.actual === null
      && inWindow(r.entry_date)
      && !swappedOn.has(`${dateKey(r.entry_date)}|${low(r.exercise)}`),
  );

  const skipped = new Map();
  for (const r of skipRows) bump(skipped, r.exercise);

  /* ---- avoid ---- */
  const avoid = [];
  for (const key of new Set([...swappedAway.keys(), ...skipped.keys()])) {
    const s = swappedAway.get(key);
    const k = skipped.get(key);
    const count = (s?.count || 0) + (k?.count || 0);
    if (count < SOFT_AT) continue;
    const reason = s && k ? "both" : s ? "swapped" : "skipped";
    const strength = count >= HARD_AT ? "hard" : "soft";
    avoid.push({ name: (s || k).name, count, reason, strength });
  }
  avoid.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  /* ---- prefer ---- */
  /* A lift that is both chosen often and avoided often is noise rather than a
     preference, so the avoid list wins and it is left out of both directions. */
  const avoided = new Set(avoid.map((a) => low(a.name)));
  const prefer = [...chosen.values()]
    .filter((c) => c.count >= SOFT_AT && !avoided.has(low(c.name)))
    .map((c) => ({ name: c.name, count: c.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  /* ---- equipment ---- */
  /* Only swaps that actually changed equipment vote. A barbell row traded for a
     different barbell row says nothing about equipment, and counting it would
     water down a real skew until it never reached the share below. */
  const moves = swapRows
    .map((s) => ({ from: equipmentOf(s.planned_exercise), to: equipmentOf(s.chosen_exercise) }))
    .filter((m) => m.from && m.to && m.from !== m.to);

  let equipmentBias = null;
  if (moves.length >= SOFT_AT) {
    const tally = new Map();
    for (const m of moves) tally.set(m.to, (tally.get(m.to) || 0) + 1);
    const [equipment, n] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    const ratio = +(n / moves.length).toFixed(2);
    if (ratio >= BIAS_MIN_SHARE) equipmentBias = { equipment, ratio, n: moves.length };
  }

  /* ---- confidence ---- */
  const signals = swapRows.length + skipRows.length;
  const confidence = signals >= 20 ? "high" : signals >= 8 ? "medium" : signals >= 3 ? "low" : "none";

  /* ---- why, one sentence per conclusion, in training-age.mjs's voice ---- */
  /* The point of this array is that a preference can be audited rather than
     trusted. Getting an exercise silently removed from your week with no reason
     given is exactly the paternalism the product rule exists to prevent. */
  for (const a of avoid) {
    const how = a.reason === "swapped"
      ? `swapped out ${times(a.count)}`
      : a.reason === "skipped"
        ? `planned and never logged ${times(a.count)}`
        : `swapped out or left unlogged ${times(a.count)}`;
    why.push(a.strength === "hard"
      ? `${a.name} was ${how} in the last ${windowDays} days, which is ${HARD_AT} separate `
        + `decisions in ${HARD_AT} separate sessions rather than one busy machine, so it comes `
        + `out of the plan.`
      : `${a.name} was ${how} in the last ${windowDays} days. That is enough to move it to the `
        + `bottom of its pool and not enough to remove it, because twice can still be two bad `
        + `evenings.`);
  }
  for (const p of prefer) {
    why.push(`${p.name} was the replacement chosen ${times(p.count)}, so it moves up its pool. `
      + `research/07: what somebody reaches for instead is better evidence than anything they `
      + `could have typed on a signup screen.`);
  }
  if (equipmentBias) {
    const landed = Math.round(equipmentBias.ratio * equipmentBias.n);
    why.push(`Of the ${equipmentBias.n} swaps that changed equipment, ${landed} landed on `
      + `${equipmentBias.equipment}, so ${equipmentBias.equipment} work gets a small nudge up the `
      + `pool and nothing more. Equipment choice is often the room they were standing in rather `
      + `than the lifter they are.`);
  }
  if (!avoid.length && !prefer.length) {
    why.push(`Nothing has been swapped or skipped more than once in the last ${windowDays} days, `
      + `so there is no preference to act on yet. research/07: one swap is a busy machine, not a `
      + `preference, and observing something we will not use is a privacy cost with no return.`);
  }
  why.push(`${signals} revealed signal${signals === 1 ? "" : "s"} in the window, so confidence is `
    + `${confidence}. Revealed preference beats stated preference, but it earns that slowly: `
    + `PLAN-2.md, where they disagree revealed wins and never silently.`);

  return { avoid, prefer, equipmentBias, why, confidence };
}

/**
 * Reorder a ranked candidate pool by what this person has revealed.
 *
 * The pool arriving here is already ranked by plan.mjs: familiar lifts first,
 * then level closeness, then the conservative tie break. That order is kept
 * inside each band, so a preference nudges the ranking rather than replacing it.
 *
 * Confidence is deliberately not consulted. The occurrence thresholds in
 * learnPreferences are the guard, and a hard avoid already needs three sessions,
 * which cannot happen below "low".
 */
export function applyPreferences(pool = [], prefs = null) {
  if (!Array.isArray(pool) || !pool.length || !prefs) return pool;

  const hard = new Set();
  const soft = new Set();
  for (const a of prefs.avoid || []) (a.strength === "hard" ? hard : soft).add(low(a.name));
  const preferred = new Set((prefs.prefer || []).map((p) => low(p.name)));
  const bias = prefs.equipmentBias ? prefs.equipmentBias.equipment : null;

  /* A slot with nothing in it is worse than a slot with a lift they dislike. A
     removed exercise leaves a hole in the week, the app hands back a short day,
     and the first run of plan.mjs proved a silently dropped slot is the bug
     nobody notices until a beginner has no posterior chain work. So a hard
     avoid empties nothing: if it would, the exercise stays and the plan can say
     out loud that it had no alternative. */
  const kept = pool.filter((e) => !hard.has(low(e.name)));
  const list = kept.length ? kept : pool;

  return list
    .map((e, i) => ({
      e,
      i,
      /* Preferred rises, soft avoided sinks, and equipment is a fraction of
         either because it is a nudge and not a filter. */
      score: (preferred.has(low(e.name)) ? PREFER_WEIGHT : 0)
        + (soft.has(low(e.name)) ? SOFT_AVOID_WEIGHT : 0)
        + (bias && e.equipment === bias ? EQUIPMENT_NUDGE : 0),
    }))
    .sort((a, b) => a.score - b.score || a.i - b.i)
    .map((x) => x.e);
}

/**
 * The sentence a removed exercise gets in dayNotes.
 *
 * Said in the second person and with the door left open, because a preference
 * we inferred without being told is exactly the thing that has to be easy to
 * overrule. PLAN-2.md: revealed wins, but never silently.
 */
export function avoidNote(entry) {
  const how = entry.reason === "skipped"
    ? `It has been in the plan ${times(entry.count)} and never logged`
    : entry.reason === "both"
      ? `You have swapped out of or skipped ${entry.name} ${times(entry.count)}`
      : `You have swapped out of ${entry.name} ${times(entry.count)}`;
  const head = entry.reason === "skipped" ? `${entry.name} is not in here. ${how}.` : `${how}, so it is not in here.`;
  return `${head} Say the word and it comes back.`;
}
