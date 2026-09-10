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

export const LEVELS = ["beginner", "novice", "intermediate", "advanced"];

export const THRESHOLDS = {
  /* Under this many real sessions nobody is anything but a beginner, whatever
     else the numbers say. */
  beginnerSessions: 20,
  noviceSessions: 60,
  intermediateSessions: 200,
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
const norm = (s) => String(s || "").trim().toLowerCase();

/* Distinct training days, sorted. A session is a day with anything logged, which
   is how the app already thinks about it. */
function sessionDays(logs) {
  return [...new Set(logs.map((l) => l.entry_date).filter(Boolean))].sort();
}

/* Is this person still adding weight to the same movement most times they do it?
   Looks per exercise, then asks how many of them are still climbing. */
function linearProgress(logs) {
  const byExercise = new Map();
  for (const l of logs) {
    if (l.weight == null || !l.exercise_name) continue;
    const k = norm(l.exercise_name);
    if (!byExercise.has(k)) byExercise.set(k, []);
    byExercise.get(k).push({ date: l.entry_date, weight: Number(l.weight) });
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
  for (const l of logs) {
    if (l.weight == null || !l.exercise_name || !l.entry_date) continue;
    const k = norm(l.exercise_name);
    if (!byExercise.has(k)) byExercise.set(k, { name: String(l.exercise_name).trim(), days: new Map() });
    const rec = byExercise.get(k);
    const w = Number(l.weight);
    if (!Number.isFinite(w)) continue;
    rec.days.set(l.entry_date, Math.max(w, rec.days.get(l.entry_date) ?? -Infinity));
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
 * @returns {{ level: string, confidence: "none"|"low"|"medium"|"high", ... }}
 */
export function deriveTrainingAge({ logs = [], today = new Date() } = {}) {
  const why = [];
  const days = sessionDays(logs);
  const todayStr = iso(today);

  if (!days.length) {
    return {
      level: "beginner", confidence: "none", sessions: 0, effectiveSessions: 0,
      sessionsPerWeek: 0, weeksTraining: 0, daysSinceLast: null, longestGapDays: null,
      returning: false, restarting: false, stillLinear: false,
      plateau: detectPlateau({ logs, today }),
      why: ["No logged sessions, so beginner by default. research/05: the conservative " +
            "default is the right one when we know nothing, because the cost of guessing " +
            "too low is one easy session and the cost of guessing too high is an injury."],
    };
  }

  /* Effective sessions: everything since the last reset-length gap. This is the
     difference between somebody with two years behind them and somebody who has
     started over four times. */
  let resetIndex = 0, longestGapDays = 0;
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((parse(days[i]) - parse(days[i - 1])) / DAY);
    if (gap > longestGapDays) longestGapDays = gap;
    if (gap >= THRESHOLDS.resetGapDays) resetIndex = i;
  }
  const effectiveDays = days.slice(resetIndex);
  const sessions = days.length;
  const effectiveSessions = effectiveDays.length;
  const restarting = resetIndex > 0;

  const first = parse(effectiveDays[0]);
  const last = parse(effectiveDays[effectiveDays.length - 1]);
  const daysSinceLast = Math.round((parse(todayStr) - last) / DAY);
  const weeksTraining = Math.max(1, Math.round((last - first) / DAY / 7));

  const cutoff = new Date(parse(todayStr) - THRESHOLDS.recentWeeks * 7 * DAY);
  const recent = effectiveDays.filter((d) => parse(d) >= cutoff).length;
  const sessionsPerWeek = +(recent / THRESHOLDS.recentWeeks).toFixed(1);

  const prog = linearProgress(logs.filter((l) => l.entry_date >= effectiveDays[0]));
  const returning = daysSinceLast >= THRESHOLDS.layoffDays;

  /* Level. Session count sets the ceiling, and still-working linear progression
     pulls it back down, because that is what the novice phase actually is. */
  let level;
  if (effectiveSessions < THRESHOLDS.beginnerSessions) {
    level = "beginner";
    why.push(`${effectiveSessions} sessions since the last real break, under the ` +
             `${THRESHOLDS.beginnerSessions} where anybody counts as more than a beginner.`);
  } else if (effectiveSessions < THRESHOLDS.noviceSessions) {
    level = "novice";
    why.push(`${effectiveSessions} sessions puts them past a beginner and short of ` +
             `${THRESHOLDS.noviceSessions}.`);
  } else if (effectiveSessions < THRESHOLDS.intermediateSessions) {
    level = "intermediate";
    why.push(`${effectiveSessions} sessions over about ${weeksTraining} weeks.`);
  } else {
    level = "advanced";
    why.push(`${effectiveSessions} sessions is a long training history.`);
  }

  if (prog.judged && prog.stillLinear && LEVELS.indexOf(level) > 1) {
    why.push(`Still adding weight on ${prog.climbing} of ${prog.judged} tracked lifts, so ` +
             `linear progression has not stopped working yet. Held at novice: the session ` +
             `count says more, the bar says otherwise, and the bar is the better witness.`);
    level = "novice";
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
    level, confidence, sessions, effectiveSessions, sessionsPerWeek, weeksTraining,
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
