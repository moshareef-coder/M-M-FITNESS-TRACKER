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
 * THE SECOND TRAP, found the day this module went live and fixed the day after.
 * Every conclusion above is individually defensible and all of them arriving at
 * once is not. Somebody with eight lifts swapped three times each got ten of
 * fifteen movements replaced on the first generate after the wiring landed, and
 * ten of fifteen is not a preference being honoured, it is a different
 * programme handed to somebody who asked for a small change. So there is a
 * ceiling on how much of one week the whole of this file may rewrite, it is a
 * share of the week rather than a number (a fixed three is most of a two day
 * week and a tenth of a six day one), and what does not fit is said out loud
 * and comes back on its own. See MAX_WEEK_SHARE and openWeekBudget.
 *
 * The honest limit on that ceiling: preferences are queued loudest first and the
 * loudest always wins a slot they both want, but across the week they are let in
 * as the week reaches them, so a quiet preference on Monday can take the last
 * place from a loud one on Thursday. Fixing that properly means building the
 * week twice to find out what each preference would have done before deciding
 * which may, which is twice the work for a tie that a five day sweep of this
 * engine does not actually produce: the loud preferences are the main lifts and
 * the main lifts are chosen first. It is written down rather than claimed away.
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

/* Forty five days, half the window. Inside the ninety days every occurrence
   counts the same towards the SOFT_AT and HARD_AT thresholds above, which is
   right: three decisions are three decisions whenever they were taken. But when
   the week has room for two preferences and there are eight asking, something
   has to choose, and "how recently and how often" is the only honest ordering
   available. A half life rather than a second, tighter window, because a hard
   cut at an edge means a swap loses all its weight overnight on the eighty
   ninth day, and there is nothing about the eighty ninth day. */
const HALF_LIFE_DAYS = 45;

/* The ceiling, and it is one number bounding two things: how many separate
   conclusions from this file may act on a week, and how many slots they may
   directly move. Both, because they are not the same quantity. One preferred
   lift can win three slots in a five day week, so four preferences let in came
   out as eleven movements replaced on a four day upper/lower split, which is a
   quarter of the preferences and half the week.

   A share of the week rather than a count, because a count is two different
   features at either end of the day picker: three movements is most of a two day
   week and a tenth of a six day one.

   A quarter and not a third, and the difference is measured rather than felt. A
   direct move drags about one more slot with it, through plan.mjs's own rule
   that a slot prefers a movement not already used this week: displace a lift on
   Monday and it is the least recently used candidate for a related slot on
   Thursday. That knock-on cannot be counted here, since this function is handed
   one pool at a time and knows nothing about what the week has already picked.
   So the constant is set where the OBSERVED total, knock-on included, lands
   where a third was meant to: over a population of 640 people with swap history
   crossed with five goals, four day counts and four history lengths, a quarter
   gives a median of 27% of the week replaced against a third's 35%, and it still
   lets somebody with eight lifts swapped three times each see three movements
   change. A fifth was also measured and takes that same person down to two,
   which is a preference nobody would notice being honoured.

   The floor exists so the smallest weeks are not frozen. A preference that can
   never move anything is worse than one that moves too much, because at least
   the second one can be seen and complained about. */
export const MAX_WEEK_SHARE = 1 / 4;
export const MIN_WEEK_MOVES = 2;

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

function bump(map, name, weight = 1) {
  const key = low(name);
  const at = map.get(key) || { name: String(name).trim(), count: 0, weight: 0 };
  at.count += 1;
  at.weight += weight;
  map.set(key, at);
  return at;
}

/* How loud one occurrence still is. Used for ordering only: the thresholds that
   decide soft and hard are raw counts and stay raw counts, because a decayed
   count would mean a hard avoid could quietly demote itself to a soft one on a
   day nothing happened, and a removal that un-removes itself with no new
   information is the kind of drift this engine is supposed to be the opposite
   of. See HALF_LIFE_DAYS. */
const loudness = (when, today) => {
  const age = (new Date(today).getTime() - new Date(`${dateKey(when)}T00:00:00Z`).getTime()) / DAY;
  if (!Number.isFinite(age) || age <= 0) return 1;
  return 2 ** (-age / HALF_LIFE_DAYS);
};

const EMPTY = new Set();

/* The equipment skew is one conclusion rather than a list of them, so it needs a
   key of its own to queue behind the named ones. A NUL prefix because no
   exercise in the library can collide with it. */
const BIAS_KEY = "\u0000equipment";

/* Loudest first, and a raw count breaks a tie so the ordering never depends on
   floating point noise alone. */
const byLoudness = (a, b) => b.weight - a.weight || b.count - a.count || a.name.localeCompare(b.name);

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
    const w = loudness(s.entry_date, today);
    bump(swappedAway, s.planned_exercise, w);
    bump(chosen, s.chosen_exercise, w);
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
  for (const r of skipRows) bump(skipped, r.exercise, loudness(r.entry_date, today));

  /* ---- avoid ---- */
  const avoid = [];
  for (const key of new Set([...swappedAway.keys(), ...skipped.keys()])) {
    const s = swappedAway.get(key);
    const k = skipped.get(key);
    const count = (s?.count || 0) + (k?.count || 0);
    if (count < SOFT_AT) continue;
    const reason = s && k ? "both" : s ? "swapped" : "skipped";
    const strength = count >= HARD_AT ? "hard" : "soft";
    /* `weight` is published rather than kept private because it decides which
       preference gets the week's last free slot, and anything that decides that
       has to be readable next to the count it came from. */
    const weight = +(((s?.weight || 0) + (k?.weight || 0))).toFixed(3);
    avoid.push({ name: (s || k).name, count, weight, reason, strength });
  }
  /* Loudest first, so that when openWeekBudget runs out the week spends what it
     has on the thing being said most often and most recently. */
  avoid.sort(byLoudness);

  /* ---- prefer ---- */
  /* A lift that is both chosen often and avoided often is noise rather than a
     preference, so the avoid list wins and it is left out of both directions. */
  const avoided = new Set(avoid.map((a) => low(a.name)));
  const prefer = [...chosen.values()]
    .filter((c) => c.count >= SOFT_AT && !avoided.has(low(c.name)))
    .map((c) => ({ name: c.name, count: c.count, weight: +c.weight.toFixed(3) }))
    .sort(byLoudness);

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
 * How much of this week everything above is allowed to rewrite, opened once.
 *
 * The only mutable thing in this module, and it is mutable because the decision
 * it holds is about the week while the place that decision has to be taken is
 * one slot at a time, deep inside plan.mjs's selection pass. The alternative was
 * a second selection pass to find out what a preference would have done before
 * deciding whether to let it, which is twice the work to answer a question one
 * counter answers.
 *
 * `slots` is the week's slot table length, which plan.mjs knows before it picks
 * anything. It is an upper bound rather than the count of movements that come
 * out, because a slot the library cannot fill drops, so on those weeks the cap
 * is a little generous. Erring generous is the right side to err on: the cap is
 * here to stop a lurch, not to ration a preference down to nothing.
 *
 * @param {object|null} prefs   learnPreferences output
 * @param {{slots:number}} week
 */
export function openWeekBudget(prefs = null, { slots = 0 } = {}) {
  const entries = [
    ...(prefs?.avoid || []).map((a) => ({ ...a, kind: "avoid" })),
    ...(prefs?.prefer || []).map((p) => ({ ...p, kind: "prefer" })),
  ].sort(byLoudness);
  /* The equipment skew queues last and never first. It is the weakest thing this
     file concludes, it says so in its own note, and letting a quarter point
     nudge spend the week ahead of a lift somebody swapped away from three times
     would be the tail deciding. It is in the queue at all because leaving it out
     was the first version of this cap and it was wrong: a quarter point is
     supposed to break exact ties, this engine's ranking produces a great many
     exact ties, and a dumbbell skew on its own turned push-ups into a dumbbell
     bench press, inverted rows into dumbbell rows and an incline push-up into an
     incline dumbbell press in one week, under a cap that thought it had let two
     preferences through. Anything that can move a movement is counted. */
  if (prefs?.equipmentBias) entries.push({ name: BIAS_KEY, weight: -1, count: 0, kind: "equipment" });
  if (!entries.length) return null;
  const cap = Math.max(MIN_WEEK_MOVES, Math.round(Math.max(0, slots) * MAX_WEEK_SHARE));
  return {
    cap,
    slots,
    /* The order preferences are let in, loudest first. The queue is fixed for
       the week so a preference cannot win a slot on Monday and lose the same
       argument on Thursday. */
    queue: entries.map((e) => (e.name === BIAS_KEY ? BIAS_KEY : low(e.name))),
    nameOf: new Map(entries.map((e) => [e.name === BIAS_KEY ? BIAS_KEY : low(e.name), e.name])),
    kindOf: new Map(entries.map((e) => [e.name === BIAS_KEY ? BIAS_KEY : low(e.name), e.kind])),
    /* The preferences that have actually changed something, which is what the
       cap counts. Only ever grows. */
    active: new Set(),
    /* Slots whose top candidate the active set has actually moved. The cap
       bounds this as well as `active`, because the two are not the same number:
       one preferred lift can win three slots in a five day week, so five
       preferences let in can be eleven movements out, which is a third of the
       preferences and half the week. */
    moved: 0,
    held: new Map(),
  };
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
 *
 * With a `budget` the week runs on a subset of the conclusions rather than all
 * of them. A preference joins the set the first time it would actually change a
 * slot's top candidate, loudest first, and once it is in it applies to the whole
 * week. The set never shrinks, which is the point: the first thing tried here
 * capped the slots instead and handed the back half of the week the unfiltered
 * pool, so every lift that had just been avoided on Monday came back on Thursday
 * as the least recently used candidate and a four day split came out a mirror of
 * itself. A cap that reorganises more than no cap at all is not a cap.
 *
 * The equipment nudge is not in the count. It is a quarter point that breaks
 * exact ties, it is one conclusion rather than a list of them, and the thing
 * being rationed here is named movements arriving and leaving.
 *
 * Reordering below the top candidate is free either way. It changes which
 * alternative is offered underneath the movement, and an offer is not a
 * prescription.
 */
export function applyPreferences(pool = [], prefs = null, budget = null) {
  if (!Array.isArray(pool) || !pool.length || !prefs) return pool;

  const bias = prefs.equipmentBias ? prefs.equipmentBias.equipment : null;
  const hardOf = new Set();
  const softOf = new Set();
  for (const a of prefs.avoid || []) (a.strength === "hard" ? hardOf : softOf).add(low(a.name));
  const preferOf = new Set((prefs.prefer || []).map((p) => low(p.name)));

  /* The pool as it looks when only `active` preferences are allowed to speak.
     A slot with nothing in it is worse than a slot with a lift they dislike. A
     removed exercise leaves a hole in the week, the app hands back a short day,
     and the first run of plan.mjs proved a silently dropped slot is the bug
     nobody notices until a beginner has no posterior chain work. So a hard
     avoid empties nothing: if it would, the exercise stays and the plan can say
     out loud that it had no alternative. */
  const orderUnder = (active) => {
    const kept = pool.filter((e) => !(hardOf.has(low(e.name)) && active.has(low(e.name))));
    const list = kept.length ? kept : pool;
    return list
      .map((e, i) => {
        const k = low(e.name);
        const on = active.has(k);
        return {
          e,
          i,
          /* Preferred rises, soft avoided sinks, and equipment is a fraction of
             either because it is a nudge and not a filter. */
          score: (on && preferOf.has(k) ? PREFER_WEIGHT : 0)
            + (on && softOf.has(k) ? SOFT_AVOID_WEIGHT : 0)
            + (bias && active.has(BIAS_KEY) && e.equipment === bias ? EQUIPMENT_NUDGE : 0),
        };
      })
      .sort((a, b) => a.score - b.score || a.i - b.i)
      .map((x) => x.e);
  };

  const everything = new Set([...hardOf, ...softOf, ...preferOf, BIAS_KEY]);
  /* No budget is the old behaviour exactly, and that is the contract every
     direct caller of this function was written against. */
  if (!budget) return orderUnder(everything);

  const here = new Set(pool.map((e) => low(e.name)));
  /* Nothing this person has revealed can reach this slot, so there is no
     argument to have. Short circuited rather than reasoned through three times,
     because this is the common case and pass 2 runs it once per slot per week
     across every sweep and fuzz combination. */
  if (!bias && ![...everything].some((n) => here.has(n))) return pool;

  const bare = orderUnder(EMPTY);
  const full = orderUnder(everything);
  let order = orderUnder(budget.active);
  /* Admit preferences one at a time, loudest first, and only ones that can
     reach this slot at all: a hard avoid on a lift that is not a candidate here
     has no argument to win and must not spend a place in the week for it. */
  const passed = new Set();
  while (order[0] !== full[0]) {
    const next = budget.queue.find(
      (n) => !budget.active.has(n) && !passed.has(n) && (n === BIAS_KEY ? Boolean(bias) : here.has(n)),
    );
    if (!next) break;
    if (budget.active.size >= budget.cap || budget.moved >= budget.cap) {
      /* Out of room. Named rather than dropped, because a tap that appears to
         have done nothing is the thing this codebase is least willing to ship. */
      /* The equipment skew is not put on the held list. The note names movements
         that are still on the card and there is no movement to name here, and
         "your preference for dumbbells is queued" is a sentence about the
         engine rather than about their week. */
      if (next !== BIAS_KEY && !budget.held.has(next)) {
        budget.held.set(next, { name: budget.nameOf.get(next) || next, kind: budget.kindOf.get(next) });
      }
      break;
    }
    const tried = orderUnder(new Set([...budget.active, next]));
    /* It reached the slot and still changed nothing here, so it buys nothing
       and is charged nothing. Move down the queue rather than out of the week:
       the lift it wants gone may be the top candidate on Thursday. */
    if (tried[0] === order[0]) { passed.add(next); continue; }
    budget.active.add(next);
    order = tried;
  }
  if (order[0] !== bare[0]) budget.moved += 1;
  return order;
}

export function actedOn(budget = null) {
  if (!budget) return [];
  /* The equipment skew is left off. It is in the count because it can move a
     movement, and off this list because it is not one: naming it here would put
     "dumbbell" in a list of exercises. */
  return [...budget.active].filter((k) => k !== BIAS_KEY).map((k) => budget.nameOf.get(k) || k);
}

/**
 * The sentence the week gets when the cap held a preference back.
 *
 * Same voice and the same place as avoidNote, because it is the same promise:
 * the app says what it did with what you told it, including the part it has not
 * done yet.
 */
export function heldBackNote(budget = null) {
  if (!budget || !budget.held.size) return null;
  const held = [...budget.held.values()];
  const list = (rows) => (rows.length === 1
    ? rows[0].name
    : `${rows.slice(0, -1).map((r) => r.name).join(", ")} and ${rows[rows.length - 1].name}`);

  /* Two different things get held back and they need two different sentences.
     A lift somebody swapped away from is still on the card and they can see it,
     so the note has to explain the thing in front of them. A lift they reached
     for instead is simply absent, and telling them "X is still in here" about a
     movement that is not in here would be the app being wrong out loud, which
     is worse than the app being quiet. */
  const stayed = held.filter((h) => h.kind === "avoid");
  const missing = held.filter((h) => h.kind === "prefer");
  const parts = [];
  if (stayed.length) parts.push(`${list(stayed)} ${stayed.length === 1 ? "is" : "are"} still in here`);
  if (missing.length) parts.push(`${list(missing)} ${missing.length === 1 ? "has" : "have"} not come in yet`);

  return `${parts.join(", and ")}. That is the cap and not an oversight: you have shown this app `
    + `more preferences than one week should act on at once, so it took the ${budget.active.size} `
    + `loudest and queued the rest. Train this week and log it, and the next one picks up where `
    + `this one stopped.`;
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
