/* Muscle recovery, read off the logs rather than a fixed rotation.
 *
 * The gap this closes: index.html's own Body tab already answers "what is
 * safe to train right now" for every one of the fourteen muscle groups
 * (bodyAreaStates, same file). The generator answered a completely different
 * question: "what comes next in the split," a plain (i+1) % length rotation
 * with no idea what was actually trained yesterday. Regenerating twice in
 * quick succession could hand back the SAME muscles the Body tab was, at that
 * exact moment, telling the user to leave alone. Two screens in the same app
 * disagreeing about the same body is not a second opinion, it reads as the
 * app not listening to what it just told you.
 *
 * Same two thresholds as bodyAreaStates, on purpose: FRESH_HOURS (worked
 * recently enough that another hard set on it is the wrong call right now)
 * and RECOVERY_HOURS (repaired, no longer worth mentioning). Diverging from
 * the number already on screen would make the generator wrong in a new way
 * instead of not wrong at all.
 *
 * research/09: the outcome that matters is whether someone is still here in
 * twelve weeks, and a plan that overrides a legitimate "leave this alone"
 * reads as the app not listening, which is exactly the kind of thing that
 * costs trust in the first weeks.
 */

export const FRESH_HOURS = 24;
export const RECOVERY_HOURS = 48;

/* A light secondary touch should not read as a real session. One accessory
   set of shrugs does not make "Back" day the wrong call the way five sets of
   rows would. Below this many credited sets on a single day, that day does
   not count as having trained the group at all for recovery purposes. */
export const MIN_CREDIT_SETS = 2;

const norm = (s) => String(s || "").trim().toLowerCase();

/* name -> { primary: Set, secondary: Set }, built once from the same exercise
 * library plan.mjs already reads. More precise than a keyword match against
 * the exercise name, which is what the app's own classifyMuscles does: this
 * reads the library's own tags per exercise rather than guessing from text,
 * and a logged name with no library entry (a manual or custom exercise)
 * simply contributes nothing, rather than a wrong guess.
 */
export function buildMuscleIndex(trainings) {
  const index = new Map();
  for (const t of trainings || []) {
    for (const cat of t.categories || []) {
      for (const ex of cat.exercises || []) {
        const key = norm(ex.name);
        if (!key) continue;
        index.set(key, {
          primary: new Set(ex.primary || []),
          secondary: new Set(ex.secondary || []),
        });
      }
    }
  }
  return index;
}

/* Credited sets per muscle group for one entry_date, primary counting full
 * and secondary counting half, the same weighting computeMuscleVolumeBetween
 * already uses in index.html so the two systems can be compared honestly. */
function creditForDay(logsOnDay, muscleIndex) {
  const credit = {};
  for (const log of logsOnDay) {
    const rule = muscleIndex.get(norm(log.exercise_name));
    if (!rule) continue;
    const sets = log.duration_min ? Math.max(1, Math.round(log.duration_min / 10)) : (log.sets || 1);
    for (const g of rule.primary) credit[g] = (credit[g] || 0) + sets;
    for (const g of rule.secondary) credit[g] = (credit[g] || 0) + sets * 0.5;
  }
  return credit;
}

/**
 * For every muscle group that shows up anywhere in the logs, how long since
 * it last took a real (not incidental) hit, and what state that puts it in.
 *
 * @returns Map<group, { hoursSince, state: "hold"|"ok"|"ready", lastDate }>
 */
export function muscleRecoveryStates({ logs = [], muscleIndex, today = new Date() }) {
  const byDate = new Map();
  for (const log of logs) {
    if (!log?.entry_date) continue;
    if (!byDate.has(log.entry_date)) byDate.set(log.entry_date, []);
    byDate.get(log.entry_date).push(log);
  }

  const lastRealHit = new Map(); // group -> entry_date string, most recent date clearing MIN_CREDIT_SETS
  /* When the rows carry a real clock (exercise_logs.created_at is written the
     moment a set is logged, fit_entries.workout_at when the day is), the last
     one on the day is the session's end, and that is when recovery starts.
     The 18:00 assumption below is for rows that have neither, which is the
     sandbox fixture and nothing the app writes today. Audit of 2026-09-10:
     with the assumption alone, "yesterday" stopped reading as fresh at 18:00
     today whatever time the session really ended. */
  const endOfDay = new Map();
  for (const [date, dayLogs] of byDate) {
    const credit = creditForDay(dayLogs, muscleIndex);
    for (const [group, sets] of Object.entries(credit)) {
      if (sets < MIN_CREDIT_SETS) continue;   // a light secondary touch does not count as training it
      const prev = lastRealHit.get(group);
      if (!prev || date > prev) lastRealHit.set(group, date);
    }
    let latest = NaN;
    for (const log of dayLogs) {
      const t = Date.parse(log.created_at || log.workout_at || "");
      if (Number.isFinite(t) && !(t < latest)) latest = t;
    }
    if (Number.isFinite(latest)) endOfDay.set(date, latest);
  }

  const states = new Map();
  for (const [group, lastDate] of lastRealHit) {
    const hitAt = endOfDay.has(lastDate)
      ? new Date(endOfDay.get(lastDate))
      : new Date(lastDate + "T18:00:00");   // same assumed time-of-day as the app when no timestamp exists
    const hoursSince = (today - hitAt) / 3600000;
    const state = hoursSince < FRESH_HOURS ? "hold" : hoursSince < RECOVERY_HOURS ? "ok" : "ready";
    states.set(group, { hoursSince, state, lastDate });
  }
  return states;
}

/* The main-role groups a split day is actually FOR. Accessory slots ride
 * along with whatever the main lifts allow; they are not what decides
 * whether the day itself is a fresh-muscle day. */
export function mainGroupsForDay(slots) {
  const groups = new Set();
  for (const slot of slots || []) {
    if (slot.role !== "main") continue;
    for (const g of slot.groups || []) groups.add(g);
  }
  return groups;
}

/* True when at least one of a day's defining muscle groups is still in the
 * fresh window. A group in "ok" is fine, on purpose: research and the app
 * agree that 24 to 48 hours out is trainable, just no longer the first
 * choice, and a day should only be skipped for genuinely fresh muscle. */
export function dayIsFresh(mainGroups, states) {
  for (const g of mainGroups) {
    const s = states.get(g);
    if (s && s.state === "hold") return true;
  }
  return false;
}

/**
 * Walk the rotation forward from the naive next index, skipping any day whose
 * main muscles are still fresh, until one that is not fresh turns up. Wraps
 * the whole week; never returns nothing, because a plan that refuses to
 * generate is a worse failure than one that repeats a muscle a day early.
 *
 * `dayGroups` is week.map(day => mainGroupsForDay(SLOTS[day.key])), passed in
 * rather than recomputed so this file needs no knowledge of SLOTS itself.
 */
export function skipFreshDays(naiveIndex, dayGroups, states) {
  const n = dayGroups.length;
  if (n <= 1) return naiveIndex;
  let bestIndex = naiveIndex;
  let bestFreshCount = Infinity;
  for (let step = 0; step < n; step++) {
    const i = (naiveIndex + step) % n;
    const groups = dayGroups[i];
    const freshCount = [...groups].filter((g) => states.get(g)?.state === "hold").length;
    if (freshCount === 0) return i;               // fully rested, take it immediately
    if (freshCount < bestFreshCount) { bestFreshCount = freshCount; bestIndex = i; }
  }
  return bestIndex;   // nothing fully rested; least-fresh wins over the naive pick
}
