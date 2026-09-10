/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/plateau-response.mjs. Do not edit here. */
/* What to do about a stall, which is the half nobody had written.
 *
 * `training-age.mjs` exports Jawa's `detectPlateau` and `deriveTrainingAge`
 * returns its result on every plan. Until this file existed nothing read it: the
 * engine could name the lift that had not moved in six weeks and then handed back
 * the same week it would have handed back anyway. research/12 is blunt about why
 * that is the wrong place to stop. Nobody picks "I am stuck" on day one, so a
 * plateau never arrives as a goal; it arrives in the logs, and it is the moment
 * people decide the app is not working and stop opening it. A diagnosis with no
 * response is worse than no diagnosis, because it proves we could see it.
 *
 * THE LINE BETWEEN THIS FILE AND calibrate.mjs, which is the thing to get right.
 *
 * `calibrate.mjs` answers "how did the last session go", per exercise, over a
 * three session window, and moves a load by at most five percent. Its too-heavy
 * verdict means the sets were abandoned or the weight came down LAST TIME. That
 * is one session and it is about the number on the bar.
 *
 * This file answers "has this lift stopped going anywhere", per exercise, over
 * weeks. A stalled lift is often not failing at all: every set completed, every
 * rep landed, and the same 185 lb for a month and a half. calibrate has nothing
 * to say about that, because nothing went wrong in any single session.
 *
 * So the two can disagree, and where they meet the answer has to be one answer:
 *
 *   stalled + too-heavy  ->  deload-lift, never rotate. They are grinding. The
 *                            load already comes down through calibrate, and a
 *                            new exercise on top of that is two changes at once
 *                            with nothing learned from either.
 *   stalled + too-easy   ->  wait. calibrate is already adding weight next
 *                            session, so the stall is about to break itself and
 *                            a second response would be double counting.
 *   stalled + skipped    ->  rotate, which is the same direction calibrate's
 *                            `swapSuggested` already points. No conflict.
 *   three or more stalls ->  volume-cut, but ONLY when calibrate has not already
 *                            called the week a back-off, because that back-off
 *                            is the same 0.85 lever and stacking them twice is a
 *                            deload nobody prescribed. And when the cut does
 *                            fire, the per lift answers stand down for the week
 *                            behind it: a lighter week is the same exercises
 *                            with fewer sets, not a week they do not recognise.
 *
 * The actions, and where each comes from:
 *
 *   rotate      knowledge/principles/progressive-overload.md, "a program that
 *               only chases add 5lb every week runs out of room in months.
 *               Rotating which lever moves is what keeps it working". Changing
 *               the exercise changes the stimulus without changing the person's
 *               week, and it is the least dramatic thing on this list.
 *   rep-range   the same file's list of what counts as overload: more reps at
 *               the same weight is overload. A heavy lift that has stopped
 *               moving at 3 to 6 usually moves again after a block at 8 to 12.
 *   deload-lift knowledge/principles/periodization-deloads.md, "reps missed on
 *               lifts that were previously solid" is a named deload trigger, and
 *               "one week is typically enough". One lift, not the week.
 *   volume-cut  the same file: several weeks near the ceiling, cut volume rather
 *               than intensity, roughly a week. Systemic by definition, so it
 *               lives in `summary` and never in a per exercise response.
 *   wait        research/09 by way of calibrate.mjs: the fastest way to lose
 *               somebody is a plan that reacts to noise. Two flat weeks is a
 *               fortnight. Doing nothing has to be a first class answer or the
 *               app thrashes and every change stops meaning anything.
 *
 * Pure, no dependencies, no imports. Everything it needs arrives as arguments.
 */

/* Named and exported so they can be argued with, like THRESHOLDS in
   training-age.mjs. None of these is a measured constant. */
export const PLATEAU_RESPONSE = {
  /* Under this many weeks flat, nothing happens. Four weeks is roughly a
     training block, and shorter than that is indistinguishable from a bad
     fortnight, a deload, a holiday or a cold. */
  minWeeksFlat: 4,
  /* Above this a rotation stops being optional. Four to eight weeks is where the
     brief says rotate first; past eight weeks it is the same answer, held more
     firmly, because whatever they are doing has had long enough to work. */
  rotateFromWeeks: 8,
  /* A strength stall this short gets the rep range first, because the lift
     itself is usually fine and the range has run out of room. */
  shortStallWeeks: 6,
  /* A beginner has to be flat for this long, on this many sessions of the lift,
     before anything happens at all. Two guards rather than one, because a
     beginner's week to week noise is enormous and their honest answer is almost
     always "linear progression is still working, keep going". plan.mjs takes the
     same line about scheduled deloads: giving somebody one they have not earned
     reads as the app deciding they are tired. These stand in for training age
     confidence, which this function is not given: a beginner is under 20
     effective sessions by definition, so their confidence is never better than
     medium and usually low. */
  beginnerMinWeeksFlat: 8,
  beginnerMinSessions: 6,
  /* One lift dropped to this for a week and built back. periodization-deloads:
     cut the stress, keep the movement, one week is enough. */
  deloadLiftFactor: 0.85,
  /* Stalls at or above this count stop being about any one exercise. */
  systemicLifts: 3,
  /* How many lifts get a response out loud. A week that changes six things
     teaches nothing, and six notes on one plan is a wall of text nobody reads.
     Everything else stays visible in `trainingAge.plateau.lifts`. */
  maxSpoken: 3,
};

const lower = (s) => String(s || "").trim().toLowerCase();
const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);

/* calibrate() hands back { byExercise, summary, overall }. Callers holding only
   the map are accepted too, because that is what load.mjs is passed and somebody
   will eventually pass the same thing here. */
function calibrationOf(calibration) {
  if (!calibration || typeof calibration !== "object") return { byExercise: {}, overall: null };
  if (calibration.byExercise) return { byExercise: calibration.byExercise, overall: calibration.overall ?? null };
  return { byExercise: calibration, overall: null };
}

/* Either a resolved goal from goal-engine.mjs or the raw selection. Both shapes
   turn up in this codebase and neither is wrong. */
const goalEmphasis = (goal) => lower(goal?.params?.emphasis || goal?.emphasis || goal?.bubble || "");
const isStrengthGoal = (goal) => {
  const e = goalEmphasis(goal);
  return e === "strength" || e === "get-stronger";
};
const goalRepRange = (goal) => {
  const r = goal?.params?.repRange || goal?.repRange;
  return Array.isArray(r) && r.length === 2 ? r : null;
};

/* Which way the reps move. A heavy range has nowhere to go but up, and a range
   that is already high has nowhere to go but down. Either direction is a new
   stimulus, which is the entire point. */
function repShiftFor(goal) {
  const from = goalRepRange(goal);
  const to = !from || from[1] <= 6 ? [8, 12] : [4, 6];
  return { from, to };
}

const range = (r) => `${r[0]} to ${r[1]}`;

function sayFor({ action, lift, goal, reason = null, blocked = false }) {
  /* A fallback response can arrive without numbers, so the sentence degrades
     rather than printing "undefined lb". */
  const at = typeof lift.weightLb === "number" ? `${lift.weightLb} lb` : "the same weight";
  const dur = typeof lift.weeksFlat === "number" ? `${lift.weeksFlat} weeks` : "weeks now";
  const flat = `${lift.name} has sat at ${at} for ${dur}`;
  const shift = repShiftFor(goal);

  if (action === "wait") {
    /* Three different reasons to do nothing, and they are not the same sentence.
       "Too soon to tell" and "you are about to add weight anyway" read as very
       different news, and a wait note that guesses wrong is the one place this
       file could sound like it is not paying attention. */
    if (reason === "already-climbing") {
      return `${lift.name} has been at ${at} for ${dur}, and you have been finishing `
        + `everything it asks. The weight goes up next session, so this one is already `
        + `sorting itself out.`;
    }
    if (reason === "beginner") {
      return `${lift.name} has been at ${at} for ${dur}. Nothing about it changes yet. This `
        + `early on, a lift that has not moved is usually about how many sessions went in `
        + `rather than about the plan, and the simple version keeps working for a while yet.`;
    }
    return `${lift.name} has been at ${at} for ${dur}. That is a rough patch rather than a `
      + `plateau, so nothing about it changes yet. Lifts sit still for a few weeks and then `
      + `move again, and changing the plan every time one does would make the changes mean `
      + `nothing.`;
  }
  if (action === "deload-lift") {
    return `${flat} and lately it has been a grind. It goes lighter this week and `
      + `builds back up from there, instead of you meeting the same number again on `
      + `a worse day. Backing one lift off on purpose is how it starts moving.`;
  }
  if (action === "rep-range") {
    const change = blocked
      ? "There is nothing else at your level to put in its place, so the lift stays and the reps change"
      : "The lift stays and the reps change";
    return `${flat}. ${change}: ${range(shift.to)} for this block`
      + `${shift.from ? ` instead of ${range(shift.from)}` : ""}. `
      + `More reps at that weight is still more work, and it is usually what gets a `
      + `stuck lift moving again.`;
  }
  /* rotate */
  return `${flat}, so it steps out this week and another lift for the same muscle `
    + `takes its place. Same muscle, new stimulus, and the ${lift.name.toLowerCase()} `
    + `comes back to a body that has been doing something else for a while.`;
}

function detailFor({ action, lift, goal, reason = null }) {
  const shift = repShiftFor(goal);
  if (action === "wait") {
    if (reason === "already-climbing") return "calibrate.mjs already reads this as too easy and adds load next session. Nothing to add here.";
    if (reason === "beginner") {
      return `Beginner, flat ${lift.weeksFlat} weeks across ${lift.sessions} sessions of it, under `
        + `the ${PLATEAU_RESPONSE.beginnerMinWeeksFlat} weeks and ${PLATEAU_RESPONSE.beginnerMinSessions} `
        + `sessions a beginner has to clear before this responds. No change.`;
    }
    return `Flat ${lift.weeksFlat} weeks, under the ${PLATEAU_RESPONSE.minWeeksFlat} where this responds. No change.`;
  }
  if (action === "deload-lift") {
    return `Take this one lift to about ${round5(lift.weightLb * PLATEAU_RESPONSE.deloadLiftFactor)} lb `
      + `(${Math.round(PLATEAU_RESPONSE.deloadLiftFactor * 100)}% of ${lift.weightLb}) for a week, then build back. `
      + `calibrate.mjs is already backing this lift off, so the two are one move, not two.`;
  }
  if (action === "rep-range") {
    return `Keep ${lift.name}, work ${range(shift.to)}`
      + `${shift.from ? ` instead of ${range(shift.from)}` : ""} for a block, then return to the heavy range.`;
  }
  return `Leave ${lift.name} out of this week and fill the slot from the same primary muscle.`;
}

/**
 * A plateau in, a plan for it out.
 *
 * @param {{
 *   plateau: { stalled?: boolean, lifts?: Array<{name:string,sessions:number,weeksFlat:number,weightLb:number}> },
 *   level: string,
 *   calibration?: object|null,
 *   goal?: object|null,
 * }} input
 * @returns {{
 *   responses: Array<{ exercise: string, action: string, detail: string, say: string }>,
 *   summary: { action: string, lifts: number, detail: string, say: string|null },
 *   why: string[],
 * }}
 */
export function planPlateauResponse({ plateau, level = "beginner", calibration = null, goal = null } = {}) {
  const why = [];
  const lifts = (plateau && Array.isArray(plateau.lifts) ? plateau.lifts : []).filter((l) => l && l.name);
  const { byExercise, overall } = calibrationOf(calibration);

  if (!lifts.length) {
    why.push("No lift is stalled, so there is nothing to answer. detectPlateau needs four "
      + "sessions of a movement inside the window before it will call anything stuck, which "
      + "is the right bar: a lift you did twice is not a lift that stopped.");
    return {
      responses: [],
      summary: { action: "none", lifts: 0, detail: "No stalled lifts.", say: null },
      why,
    };
  }

  /* One decision per stalled lift, in the order detectPlateau gave them, which is
     longest stall first. */
  const decided = lifts.map((lift) => {
    const verdict = byExercise[lower(lift.name)]?.verdict || null;

    if (lift.weeksFlat < PLATEAU_RESPONSE.minWeeksFlat) {
      why.push(`${lift.name}: flat ${lift.weeksFlat} weeks, under ${PLATEAU_RESPONSE.minWeeksFlat}. `
        + `Wait. Reacting here would be reacting to a fortnight, and an app that changes the `
        + `plan over noise teaches people to stop trusting the changes.`);
      return { lift, action: "wait", reason: "short" };
    }

    if (level === "beginner"
        && (lift.weeksFlat < PLATEAU_RESPONSE.beginnerMinWeeksFlat
            || lift.sessions < PLATEAU_RESPONSE.beginnerMinSessions)) {
      why.push(`${lift.name}: a beginner, ${lift.weeksFlat} weeks flat across ${lift.sessions} `
        + `sessions of it, under the ${PLATEAU_RESPONSE.beginnerMinWeeksFlat} weeks and `
        + `${PLATEAU_RESPONSE.beginnerMinSessions} sessions this asks of a beginner. Wait. At `
        + `this stage linear progression is still the answer far more often than a stall is `
        + `real, most flat spots are attendance rather than adaptation, and telling a beginner `
        + `they have plateaued is a good way to make them believe it.`);
      return { lift, action: "wait", reason: "beginner" };
    }

    if (verdict === "too-easy") {
      why.push(`${lift.name}: stalled, but calibrate.mjs already reads it as too easy and adds `
        + `load next session. Wait, because that is the stall breaking on its own and a second `
        + `response would be the same fix applied twice.`);
      return { lift, action: "wait", reason: "already-climbing" };
    }

    if (verdict === "too-heavy") {
      why.push(`${lift.name}: flat ${lift.weeksFlat} weeks AND calibrate.mjs says too heavy, so `
        + `they are grinding it rather than coasting. Deload the lift, not the week: `
        + `periodization-deloads.md names missed reps on a previously solid lift as a trigger `
        + `and says one week is enough. Not a rotation, because the load is already coming `
        + `down and two changes at once leaves nothing to learn from.`);
      return { lift, action: "deload-lift" };
    }

    if (isStrengthGoal(goal) && lift.weeksFlat < PLATEAU_RESPONSE.shortStallWeeks) {
      why.push(`${lift.name}: ${lift.weeksFlat} weeks flat on a strength goal, which is a short `
        + `stall on a lift they came here for. Change the rep range first. `
        + `progressive-overload.md counts more reps at the same weight as overload, and it is `
        + `the cheapest lever that does not take the lift away from somebody chasing that lift.`);
      return { lift, action: "rep-range" };
    }

    const long = lift.weeksFlat >= PLATEAU_RESPONSE.rotateFromWeeks;
    why.push(`${lift.name}: ${lift.weeksFlat} weeks flat${verdict === "skipped" ? ", and it keeps not getting logged" : ""}. `
      + `Rotate it out. progressive-overload.md: adding weight every week runs out of road, and `
      + `rotating which lever moves is what keeps a plan working`
      + `${long ? `. Past ${PLATEAU_RESPONSE.rotateFromWeeks} weeks this stops being optional` : ""}`
      + `${verdict === "skipped" ? ". calibrate.mjs already suggested a swap here, so both agree" : ""}.`);
    return { lift, action: "rotate" };
  });

  const acting = decided.filter((d) => d.action !== "wait");

  /* ---- the systemic answer, which is never per exercise, and comes first
         because it can overrule every per lift answer below it ---- */
  let summary = {
    action: "none",
    lifts: acting.length,
    detail: "Nothing systemic: the stalls are few enough to answer one lift at a time.",
    say: null,
  };

  if (acting.length >= PLATEAU_RESPONSE.systemicLifts) {
    if (overall === "back-off") {
      summary = {
        action: "none",
        lifts: acting.length,
        detail: `${acting.length} lifts stalled, which would normally be a volume cut, but `
          + `calibration already put the week on its 0.85 back-off. Skipped rather than stacked.`,
        say: null,
      };
      why.push(`${acting.length} stalled lifts is systemic and would earn a volume cut, except `
        + `calibrate.mjs has already called the week a back-off and plan.mjs is already running `
        + `sets at 0.85 through the same lever. Two cuts down one lever is a deload nobody `
        + `prescribed and a week that reads as the app giving up. Skipped, and said so here.`);
    } else {
      summary = {
        action: "volume-cut",
        lifts: acting.length,
        detail: `${acting.length} lifts stalled at once. Cut weekly sets for one week, keep the `
          + `exercises and the loads where they are, then put the sets back. Per lift answers `
          + `are deferred a week behind it.`,
        say: `${acting.length} lifts have gone quiet at the same time, which is usually the whole `
          + `week catching up with you rather than any one exercise. The lifts stay, the sets `
          + `come down for seven days, and then they go back up. Nothing is lost in a week `
          + `like that.`,
      };
      why.push(`${acting.length} lifts stalled at once is not ${acting.length} exercise problems, `
        + `it is fatigue. periodization-deloads.md: cut volume rather than intensity, roughly a `
        + `week, and do it before the body forces the unplanned version through an injury. `
        + `Systemic, so it belongs in the summary and never on one lift.`);
    }
  }

  /* A volume cut answers every stalled lift at once, so the per lift answers
     stand down for the week rather than firing alongside it. Two reasons, and
     both are in knowledge/: periodization-deloads.md describes a lighter week as
     the SAME exercises with fewer sets, and progressive-overload.md says pick
     one lever rather than moving load and reps and sets together. Rotating three
     lifts out during a cut week also hands somebody a week they do not
     recognise, and then nothing that follows can be attributed to anything. The
     diagnosis survives in `detail`; only the action waits. */
  if (summary.action === "volume-cut") {
    why.push(`Rotations and rep range changes are held for a week behind the cut. The lighter `
      + `week is the change, and a week that changes six things teaches nothing about any of `
      + `them. They come back next plan if the lifts are still flat.`);
    return {
      responses: decided.map(({ lift, action, reason = null }) => ({
        exercise: lift.name,
        action: "wait",
        detail: action === "wait"
          ? detailFor({ action, lift, goal, reason })
          : `Deferred: ${action}. Held a week behind the volume cut, which is the change this week.`,
        /* The summary speaks for the whole week here. Four notes saying the same
           thing in different words is the app apologising. */
        say: null,
      })),
      summary,
      why,
    };
  }

  /* Spoken, not decided. Everything below is still on the record in `why` and in
     trainingAge.plateau.lifts; this only bounds how much the plan says out loud.
     One wait note is reassuring, four is a wall of text about lifts that are
     fine. */
  const spokenActing = acting.slice(0, PLATEAU_RESPONSE.maxSpoken);
  const firstWait = decided.find((d) => d.action === "wait");
  const spoken = decided.filter((d) => spokenActing.includes(d) || d === firstWait);
  if (acting.length > spokenActing.length) {
    why.push(`${acting.length} lifts had an answer and only ${spokenActing.length} are said out `
      + `loud. Changing everything in one week means learning nothing from any of it, and the `
      + `rest are named in trainingAge.plateau.`);
  }

  const responses = spoken.map(({ lift, action, reason = null }) => ({
    exercise: lift.name,
    action,
    detail: detailFor({ action, lift, goal, reason }),
    say: sayFor({ action, lift, goal, reason }),
  }));

  return { responses, summary, why };
}

/**
 * The rotation that could not happen.
 *
 * plan.mjs excludes rotated lifts from selection. Where that empties a slot's
 * pool, the honest move is not to drop the slot and not to quietly put the lift
 * back with nothing said: it is to keep the lift and change the reps instead,
 * which is the next lever down the same list. Called after selection, because
 * only selection knows the pool ran out.
 */
export function applyRotateFallback(result, names = [], { goal = null, plateau = null } = {}) {
  const blocked = new Set(names.map(lower));
  if (!result || !blocked.size) return result;

  /* The lift's numbers come back out of the plateau rather than out of the
     sentence they were written into, so the fallback copy reads the same as the
     copy it replaces. */
  const known = new Map((plateau && Array.isArray(plateau.lifts) ? plateau.lifts : []).map((l) => [lower(l.name), l]));

  let changed = false;
  const responses = result.responses.map((r) => {
    if (r.action !== "rotate" || !blocked.has(lower(r.exercise))) return r;
    changed = true;
    const lift = known.get(lower(r.exercise)) || { name: r.exercise, weightLb: "the same weight", weeksFlat: "several" };
    return {
      exercise: r.exercise,
      action: "rep-range",
      detail: detailFor({ action: "rep-range", lift, goal }),
      say: sayFor({ action: "rep-range", lift, goal, blocked: true }),
    };
  });

  if (!changed) return result;
  return {
    responses,
    summary: result.summary,
    why: [...result.why, `Rotation was not possible for ${blocked.size} lift(s): excluding `
      + `them left a slot with no pool at this level and equipment. Fell back to the rep range, `
      + `because dropping the slot would leave a hole in the week and silently putting the lift `
      + `back would be the app saying one thing and doing another.`],
  };
}
