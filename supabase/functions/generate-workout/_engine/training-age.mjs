/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/training-age.mjs. Do not edit here. */
/* Training age, derived from what somebody did rather than asked.
 *
 * research/04 argues this is the dominant variable in a plan and the one we can
 * measure instead of asking, because people are unreliable narrators about their
 * own training: beginners overrate themselves, experienced lifters underrate
 * themselves, and everyone who has held a gym membership picks "intermediate".
 *
 * research/07 found the data never reaches the generator. index.html sends a
 * flattened map of personal bests with no dates and no counts, so today the
 * generator could not do this even if it wanted to. Everything below needs only
 * exercise_logs rows, which already exist.
 *
 * Every threshold here is coaching convention, not a measured constant. They are
 * named and exported so they can be argued with and tuned against real data.
 * The `why` array on the result exists so a derivation can be audited rather
 * than trusted, which is the only thing that makes it better than a dropdown.
 */

/* There is no beginner / intermediate / advanced here any more, and its absence
   is the point. It was a LABEL on a person, and the app then compared that label
   against a label on a movement to decide what somebody was allowed to be shown.
   Two things were wrong with it. It could not work: the client sends 90 days of
   logs, the ladder started at 20 / 60 / 200 sessions, so four days a week for
   thirteen straight weeks came to 51 sessions and still read as novice, and
   "advanced" was arithmetically unreachable in production for anybody. And it
   should not work: research/04 and research/07 both say the honest unit is what
   somebody has actually done, and what somebody has actually done is a list of
   movements and a count of days, not a word.

   So this file publishes measured quantities and no verdict. Exercise
   eligibility is `earnedMovements` below, per movement. Volume is a dial in
   plan.mjs read off days per week and session count. Progression style is
   `stillLinear`, which is the signal research/04 says actually defines the
   transition, measured off the bar rather than asserted about the person. */

export const THRESHOLDS = {
  /* A gap this long stops counting the work before it. Somebody with 80 sessions
     across two years and three long layoffs is not an intermediate, they are a
     beginner who keeps restarting, and they need the beginner plan each time. */
  resetGapDays: 84,
  /* Away this long and the next session is a return, not a continuation.
     research/02: connective tissue and skill both need a ramp back. */
  layoffDays: 28,
  /* Weeks of history to read for current rhythm. Long enough to survive one bad
     week, short enough to notice somebody falling off. */
  recentWeeks: 6,
  /* Still adding weight to the same lift this often means linear progression is
     still working, which is what actually defines the novice phase in coaching
     practice, whatever the session count says. */
  linearProgressRatio: 0.5,
  minSessionsToJudgeProgress: 4,
};

const DAY = 86400000;
const iso = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const parse = (s) => new Date(String(s) + "T12:00:00Z");
const norm = (s) => String(s ?? "").trim().toLowerCase();

/* Every row that reaches this file is read through here first.
 *
 * `logs` is handed to the engine by its caller, not fetched by it, and the edge
 * function's payload bound slices the array without ever looking inside it. So a
 * null row, a row that is a number, and a row whose entry_date is 20260910
 * rather than "2026-09-10" all arrive, and each of them used to be a 500:
 * `l.entry_date` on null, and `a[0].localeCompare` on a numeric map key.
 * calibrate.mjs, load.mjs and recovery.mjs all already skip a row that is not an
 * object and coerce the two text fields before comparing them, so this is the
 * same answer rather than a fourth one. The date is kept as text because that is
 * what every sort, every Map key and every gap calculation in here assumes, and
 * a number that reads as a date is still a usable one once it is a string. */
function usableRows(logs) {
  return (Array.isArray(logs) ? logs : []).filter((l) => l && typeof l === "object");
}
const rowDate = (l) => {
  const d = l.entry_date;
  return d == null || d === "" ? null : String(d);
};

/* Distinct training days, sorted. A session is a day with anything logged, which
   is how the app already thinks about it. */
function sessionDays(logs) {
  return [...new Set(logs.map(rowDate).filter(Boolean))].sort();
}

/* Is this person still adding weight to the same movement most times they do it?
   Looks per exercise, then asks how many of them are still climbing. */
function linearProgress(logs) {
  const byExercise = new Map();
  for (const l of logs) {
    const k = norm(l.exercise_name);
    if (l.weight == null || !k) continue;
    if (!byExercise.has(k)) byExercise.set(k, []);
    byExercise.get(k).push({ date: rowDate(l), weight: Number(l.weight) });
  }

  let judged = 0, climbing = 0;
  for (const [, rows] of byExercise) {
    if (rows.length < THRESHOLDS.minSessionsToJudgeProgress) continue;
    rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let up = 0, steps = 0;
    for (let i = 1; i < rows.length; i++) {
      steps++;
      if (rows[i].weight > rows[i - 1].weight) up++;
    }
    if (!steps) continue;
    judged++;
    if (up / steps >= THRESHOLDS.linearProgressRatio) climbing++;
  }
  return { judged, climbing, stillLinear: judged > 0 && climbing / judged >= 0.5 };
}

/* How many separate days a movement has to appear in somebody's logs before the
   plan may prescribe it off its own bat.

   Two, and the number is not picked here: preferences.mjs already answers the
   same question in the other direction and answers it with two. SOFT_AT is where
   a repeat stops being a busy machine and starts being a preference, HARD_AT is
   where it is settled. Earning a movement is that question asked about doing
   rather than about avoiding, so it gets the same answer rather than a second
   one. One day is a try, a friend's gym, or a mis-tap on a list; two separate
   days is a choice somebody made twice.

   The owner's words were "once or twice, and they finish up the workouts". Two
   is the cautious end of "once or twice", and the direction to be cautious in is
   the one research/05 argues everywhere in this engine: being slow to hand
   somebody a harder movement costs them a week of waiting, and being quick to
   costs them the movement. */
export const EARNED_DAYS = 2;

/* The movements this person has earned, which is the whole of what decides
   whether a harder lift may appear in their week.
 *
 * Three ways in, and they are deliberately different sizes:
 *
 *   1. Logged on EARNED_DAYS separate days. They have done it and come back to
 *      it. A day is the unit for the same reason it is the unit everywhere else
 *      in this file: three rows of the same lift on one afternoon is one
 *      session, not three.
 *   2. Chosen by hand, once. `exercise_swaps.chosen_exercise` is somebody
 *      opening the swap sheet and picking a movement by name, which is a
 *      stated preference rather than a guess about one, and the product rule is
 *      that a person who asks for a thing gets the thing. One is enough on
 *      purpose: asking twice for permission to have what you asked for is the
 *      paternalism this change exists to remove.
 *   3. Everything in the default pool, which is plan.mjs's business rather than
 *      this file's, because what is safe to open with depends on whether the
 *      slot is a main movement or an accessory and only the slot table knows
 *      that.
 *
 * What it deliberately does NOT do is generalise. Two sessions of a Barbell
 * Deadlift earn the Barbell Deadlift and nothing else. Letting one earned
 * movement unlock its neighbours would be inventing exactly the claim about
 * somebody that this change is removing, and the library carries no difficulty
 * ladder within a pattern that could support it even if we wanted to (see
 * LIBRARY-REQUESTS.md).
 *
 * @param {{ logs?: Array, swaps?: Array }} input
 * @returns {Set<string>} lowercased, trimmed exercise names
 */
export function earnedMovements({ logs = [], swaps = [] } = {}) {
  const daysByName = new Map();
  for (const l of usableRows(logs)) {
    const k = norm(l.exercise_name);
    const d = rowDate(l);
    if (!k || !d) continue;
    if (!daysByName.has(k)) daysByName.set(k, new Set());
    daysByName.get(k).add(d);
  }

  const earned = new Set();
  for (const [k, days] of daysByName) if (days.size >= EARNED_DAYS) earned.add(k);

  for (const s of (Array.isArray(swaps) ? swaps : [])) {
    if (!s || typeof s !== "object") continue;
    const k = norm(s.chosen_exercise);
    if (k) earned.add(k);
  }
  return earned;
}

/* Plateau detection. This one is Jawa's.
 *
 * Her real-goals research ("Not a goal at all: plateaus") found "stuck at the same weight
 * for weeks", "my bench hasn't gone up in 8 weeks" and "haven't moved on the scale in a
 * month" over and over in the forums, and made the argument we had missed: this is not an
 * onboarding goal, because nobody picks it on day one. It is a signal the algorithm has to
 * notice in somebody's own logged history and answer by itself, with a deload, a stimulus
 * change or a check on the deficit. See research/12-merged-with-jawa.md.
 *
 * linearProgress above asks the opposite question, whether progression is still working
 * across the whole history, and answers it as one ratio. This asks per lift, over a recent
 * window, and names the lifts. A plan can act on a name; it cannot act on a ratio.
 *
 * @param {{ logs?: Array, today?: Date, weeks?: number }} input
 * @returns {{ stalled: boolean, lifts: Array<{name:string,sessions:number,weeksFlat:number,weightLb:number}>, why: string[] }}
 */
export function detectPlateau({ logs = [], today = new Date(), weeks = THRESHOLDS.recentWeeks } = {}) {
  const why = [];
  const cutoff = new Date(parse(iso(today)) - weeks * 7 * DAY);

  /* Per exercise, the best weight on each training day, oldest first. A day is the unit
     because that is what a session is everywhere else in this file. */
  const byExercise = new Map();
  for (const l of usableRows(logs)) {
    const k = norm(l.exercise_name);
    const date = rowDate(l);
    if (l.weight == null || !k || !date) continue;
    if (!byExercise.has(k)) byExercise.set(k, { name: String(l.exercise_name).trim(), days: new Map() });
    const rec = byExercise.get(k);
    const w = Number(l.weight);
    if (!Number.isFinite(w)) continue;
    rec.days.set(date, Math.max(w, rec.days.get(date) ?? -Infinity));
  }

  const lifts = [];
  for (const [, rec] of byExercise) {
    const all = [...rec.days.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const window = all.filter(([d]) => parse(d) >= cutoff);
    if (window.length < THRESHOLDS.minSessionsToJudgeProgress) continue;

    /* Flat means no session in the window beat everything before it in the window. One
       heavier day is enough to say this lift is still moving. */
    let best = window[0][1], climbed = false;
    for (let i = 1; i < window.length; i++) {
      if (window[i][1] > best) { climbed = true; best = window[i][1]; }
    }
    if (climbed) continue;

    /* How long it has actually been flat, measured from the last day this lift set a new
       best across the whole history, not just the window. Somebody stuck for four months
       should not be told they are stuck for six weeks. */
    let runningBest = -Infinity, lastPr = all[0][0];
    for (const [d, w] of all) {
      if (w > runningBest) { runningBest = w; lastPr = d; }
    }
    const weeksFlat = Math.max(0, Math.round((parse(iso(today)) - parse(lastPr)) / DAY / 7));

    lifts.push({ name: rec.name, sessions: window.length, weeksFlat, weightLb: best });
  }

  lifts.sort((a, b) => b.weeksFlat - a.weeksFlat || b.sessions - a.sessions);

  if (lifts.length) {
    for (const l of lifts) {
      why.push(`${l.name} has not gone up in ${l.weeksFlat} weeks, across ${l.sessions} ` +
               `sessions in the last ${weeks}, still at ${l.weightLb} lb.`);
    }
    why.push(`A stall is information, not failure. It is the point where adding weight ` +
             `every session stops being the plan: change the stimulus, or take the ` +
             `lighter week first and then change it.`);
  } else {
    why.push(`No lift has enough sessions in the last ${weeks} weeks to be called stuck, ` +
             `or the ones that do are still climbing.`);
  }

  return { stalled: lifts.length > 0, lifts, why };
}

/**
 * @param {{ logs?: Array, today?: Date }} input
 * @returns {{ confidence: "none"|"low"|"medium"|"high", effectiveSessions: number, ... }}
 */
export function deriveTrainingAge({ logs: given = [], today = new Date() } = {}) {
  const why = [];
  const logs = usableRows(given);
  const days = sessionDays(logs);
  const todayStr = iso(today);

  if (!days.length) {
    return {
      confidence: "none", sessions: 0, effectiveSessions: 0,
      sessionsPerWeek: 0, weeksTraining: 0, daysSinceLast: null, longestGapDays: null,
      returning: false, restarting: false, stillLinear: false,
      plateau: detectPlateau({ logs, today }),
      why: ["No logged sessions. Nothing is assumed from that: the plan opens on the safe " +
            "pool of movements, the volume dial sits at its bottom end, and no weight is " +
            "prescribed until there is one on the record. research/05: the cost of guessing " +
            "too low is one easy session and the cost of guessing too high is an injury, so " +
            "where we know nothing we say nothing."],
    };
  }

  /* Effective sessions: everything since the last reset-length gap. This is the
     difference between somebody with two years behind them and somebody who has
     started over four times. */
  let resetIndex = 0, longestGapDays = 0;
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((parse(days[i]) - parse(days[i - 1])) / DAY);
    if (!Number.isFinite(gap)) continue;     // an unreadable date is not a gap
    if (gap > longestGapDays) longestGapDays = gap;
    if (gap >= THRESHOLDS.resetGapDays) resetIndex = i;
  }
  const effectiveDays = days.slice(resetIndex);
  const sessions = days.length;
  const effectiveSessions = effectiveDays.length;
  const restarting = resetIndex > 0;

  const first = parse(effectiveDays[0]);
  const last = parse(effectiveDays[effectiveDays.length - 1]);
  /* `entry_date` is whatever the caller's rows carried, and "2026-13-45" parses
     to an Invalid Date whose arithmetic is NaN all the way out. Every number
     below is published now that `meta.experience` exists, and JSON.stringify
     writes NaN as `null`, so a fuzz run of 40,014 cases turned this from a
     latent wrong number into 1,454 responses that changed meaning on their way
     over the wire. The count is the honest fallback for both: a day we cannot
     place on a calendar is still a day somebody logged. */
  const spanDays = (a, b) => {
    const n = Math.round((a - b) / DAY);
    return Number.isFinite(n) ? n : null;
  };
  const daysSinceLast = spanDays(parse(todayStr), last);
  const span = spanDays(last, first);
  const weeksTraining = span == null
    ? Math.max(1, Math.round(effectiveDays.length / 3))
    : Math.max(1, Math.round(span / 7));

  const cutoff = new Date(parse(todayStr) - THRESHOLDS.recentWeeks * 7 * DAY);
  const recent = effectiveDays.filter((d) => parse(d) >= cutoff).length;
  const perWeek = +(recent / THRESHOLDS.recentWeeks).toFixed(1);
  const sessionsPerWeek = Number.isFinite(perWeek) ? perWeek : 0;

  const prog = linearProgress(logs.filter((l) => {
    const d = rowDate(l);
    return d != null && d >= effectiveDays[0];
  }));
  const returning = daysSinceLast != null && daysSinceLast >= THRESHOLDS.layoffDays;

  /* What there is to say about the history, in numbers rather than a verdict. */
  why.push(`${effectiveSessions} session${effectiveSessions === 1 ? "" : "s"} since the last ` +
           `real break, over about ${weeksTraining} week${weeksTraining === 1 ? "" : "s"}, ` +
           `about ${sessionsPerWeek} a week lately.`);
  if (prog.judged) {
    why.push(prog.stillLinear
      ? `Still adding weight on ${prog.climbing} of ${prog.judged} tracked lifts, so linear ` +
        `progression has not stopped working yet. That is the signal research/04 says actually ` +
        `separates one training phase from the next, and it is read off the bar rather than ` +
        `asked about.`
      : `Weight is no longer climbing on most of the ${prog.judged} lifts with enough sessions ` +
        `to judge, so session to session loading has run out of road on them.`);
  }

  if (restarting) {
    why.push(`Longest break was ${longestGapDays} days, so the ${sessions - effectiveSessions} ` +
             `sessions before it are not counted. Somebody who keeps restarting needs the ` +
             `plan for where they are now, not credit for where they once were.`);
  }
  if (returning) {
    why.push(`${daysSinceLast} days since the last session. Treat the next few as a return: ` +
             `research/02, tissue and skill both need a ramp back, and research/11, muscle ` +
             `memory means it comes back fast so there is no need to be dramatic about it.`);
  }

  const confidence = effectiveSessions >= 40 ? "high"
    : effectiveSessions >= 15 ? "medium"
    : effectiveSessions >= 4 ? "low" : "none";

  return {
    confidence, sessions, effectiveSessions, sessionsPerWeek, weeksTraining,
    daysSinceLast, longestGapDays, returning, restarting,
    stillLinear: prog.stillLinear, progressJudged: prog.judged, progressClimbing: prog.climbing,
    /* Jawa's contribution, see detectPlateau above. Reported rather than folded into the
       level, because a stall is a reason to change the plan, not evidence about how long
       somebody has been training. */
    plateau: detectPlateau({ logs, today }),
    why,
  };
}

/* What they actually did per week, which research/09 argues should beat what they
   said they would do. Returns null when there is not enough history to disagree. */
export function observedCapacity(trainingAge) {
  if (!trainingAge || trainingAge.confidence === "none") return null;
  if (trainingAge.effectiveSessions < 8) return null;
  return Math.max(1, Math.round(trainingAge.sessionsPerWeek));
}
