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
     itself is usually fine and the range has run out of room. Eight rather
     than six since 2026-09-19, and eight on purpose: the rep range is
     prescribed "for this block", the block starts at minWeeksFlat, and at six
     the block was two weeks long before rotation took the lift anyway. Set
     equal to rotateFromWeeks, so the ladder on a strength goal reads reps
     first, then rotate, with no gap between them. */
  shortStallWeeks: 8,
  /* While session to session loading is still working, a lift has to be flat for
     this long, on this many sessions of it, before anything happens at all. Two
     guards rather than one, because week to week noise is enormous at that stage
     and the honest answer is almost always "linear progression is still working,
     keep going". plan.mjs takes the same line about scheduled deloads off the
     same measurement: giving somebody a deload the bar says they have not earned
     reads as the app deciding they are tired. */
  linearMinWeeksFlat: 8,
  linearMinSessions: 6,
  /* One lift dropped to this for a week and built back. periodization-deloads:
     cut the stress, keep the movement, one week is enough. */
  deloadLiftFactor: 0.85,
  /* Stalls at or above this count stop being about any one exercise. */
  systemicLifts: 3,
  /* How long a volume cut stays spent. The cut defers every per lift answer,
     so the stall it reacts to cannot resolve during the cut week, and until
     2026-09-19 that meant it fired again the next week, and the next: a
     replay measured it still cutting on week 14. The note promises "the sets
     come down for seven days, and then they go back up", so a cut inside this
     window blocks another and the per lift answers run instead. Four weeks,
     the same block minWeeksFlat is measured in: if three lifts are still flat
     a block after a lighter week AND their own answers, that is new evidence
     of fatigue rather than the same evidence read twice. */
  cutSpentDays: 28,
  /* How long a rotated lift stays out once it has been swapped. The swap is
     only worth making if the new lift gets a run of its own to be progressed,
     and until 2026-09-21 it got one week: detectPlateau stops listing a lift
     after a fortnight of not doing it (under four sessions in the window), the
     exclusion lapsed with the listing, and the stalled lift walked straight
     back in as the familiar pick. Four weeks, the same block everything else
     here is measured in, read back off the saved plans the way the cut is.
     Past the block the stand-in keeps the slot for exactly as long as it is
     still going up, which is the owner's rule in one line: if it is not
     broken, it is not changed. See rotationsHeld. */
  rotateHoldDays: 28,
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
   stimulus, which is the entire point.

   Exported since 2026-09-12 because plan.mjs has to prescribe the range this
   returns rather than only print it. It reads this function rather than
   carrying its own copy of the rule, for the same reason the sweep recomputes
   the volume ceiling instead of trusting the plan: two copies of one number
   agree until the day they do not, and the day they do not is the day a note
   promises 8 to 12 over a day prescribing 3. */
export function repShiftFor(goal) {
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
    if (reason === "still-linear") {
      return `${lift.name} has been at ${at} for ${dur}. Nothing about it changes yet. Weight `
        + `is still going up on your other lifts, so a flat one is usually about how many `
        + `sessions went in rather than about the plan, and the simple version keeps working `
        + `for a while yet.`;
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
      ? "There is nothing else in your pool to put in its place, so the lift stays and the reps change"
      : "The lift stays and the reps change";
    return `${flat}. ${change}: ${range(shift.to)} for this block`
      + `${shift.from ? ` instead of ${range(shift.from)}` : ""}. `
      + `More reps at that weight is still more work, and it is usually what gets a `
      + `stuck lift moving again.`;
  }
  if (action === "rotate" && reason === "held") {
    /* The stand-in is in its block. Said every week of it, because the
       person is looking at a lift where their usual one was and a plan that
       explains that once and then goes quiet reads as having forgotten. */
    const to = lift.replacement || "The stand-in";
    const left = Number(lift.weeksLeft) || 0;
    return `${to} is standing in for ${lift.name} for another ${left} week${left === 1 ? "" : "s"}, `
      + `so it gets a proper run before anything else changes.`;
  }
  /* rotate */
  return `${flat}, so it steps out this week and another lift for the same muscle `
    + `takes its place. Same muscle, new stimulus, and the ${lift.name.toLowerCase()} `
    + `comes back to a body that has been doing something else for a while.`;
}

/**
 * The rotate sentence once selection knows what came in. planPlateauResponse
 * decides before pass 2 runs and cannot name the replacement; plan.mjs finds
 * it while filling the slot and rewrites the note through here, so the note
 * and the card name the same lift. One plain sentence, then the hold, so the
 * person knows the change is a block and not a whim.
 */
export function sayRotation({ from, to, weeksFlat = null, holdWeeks = Math.round(PLATEAU_RESPONSE.rotateHoldDays / 7) } = {}) {
  const flat = typeof weeksFlat === "number" ? `has not moved in ${weeksFlat} weeks` : "has stopped moving";
  return `Swapped in ${to}: your ${from} ${flat}. It stays in for the next ${holdWeeks} weeks `
    + `so it can be progressed on its own before anything else changes.`;
}

function detailFor({ action, lift, goal, reason = null }) {
  const shift = repShiftFor(goal);
  if (action === "wait") {
    if (reason === "already-climbing") return "calibrate.mjs already reads this as too easy and adds load next session. Nothing to add here.";
    if (reason === "still-linear") {
      return `Loading still works elsewhere. Flat ${lift.weeksFlat} weeks across ${lift.sessions} `
        + `sessions of it, under the ${PLATEAU_RESPONSE.linearMinWeeksFlat} weeks and `
        + `${PLATEAU_RESPONSE.linearMinSessions} sessions this clears first. No change.`;
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
  if (action === "rotate" && reason === "held") {
    return `${lift.replacement || "The stand-in"} took ${lift.name}'s slot on ${lift.rotatedAt || "an earlier week"}. `
      + `Held for ${Math.round(PLATEAU_RESPONSE.rotateHoldDays / 7)} weeks from then, and past that for as `
      + `long as the stand-in keeps going up.`;
  }
  return `Leave ${lift.name} out of this week and fill the slot from the same primary muscle.`;
}

/**
 * A plateau in, a plan for it out.
 *
 * @param {{
 *   plateau: { stalled?: boolean, lifts?: Array<{name:string,sessions:number,weeksFlat:number,weightLb:number}> },
 *   calibration?: object|null,
 *   goal?: object|null,
 * }} input
 * @returns {{
 *   responses: Array<{ exercise: string, action: string, detail: string, say: string }>,
 *   summary: { action: string, lifts: number, detail: string, say: string|null },
 *   why: string[],
 * }}
 */
export function planPlateauResponse({ plateau, stillLinear = false, confidence = "none", calibration = null, goal = null, cutTaken = false, held = [] } = {}) {
  /* This used to take `level` and branch on `level === "beginner"`. The sentence
     under that branch says what it was really asking: "a beginner is on linear
     progression by definition". That is a claim about the bar and it is
     measured, so it is read off the measurement now. `stillLinear` is
     training-age.mjs seeing weight go up on most tracked lifts; a low
     `confidence` is not having enough sessions to say either way, which is the
     day one case and needs the same answer for the same reason. Nothing about
     this is a lower standard for a "beginner": it is the honest version of what
     the branch already believed. */
  const linearStillWorks = stillLinear
    || !(confidence === "medium" || confidence === "high");
  const why = [];
  const lifts = (plateau && Array.isArray(plateau.lifts) ? plateau.lifts : []).filter((l) => l && l.name);
  const { byExercise, overall } = calibrationOf(calibration);

  /* Rotations already made, read back off the saved plans by rotationsHeld.
     A held lift is not decided again: it is out, its stand-in is in, and the
     only question is whether the hold is still live. That is answered after
     the per lift decisions below, because past the block it turns on what
     was decided about the stand-in. Keyed on the stalled lift. */
  const holds = new Map();
  for (const h of Array.isArray(held) ? held : []) {
    if (!h || !h.from || !h.to) continue;
    const k = lower(h.from);
    if (!holds.has(k)) holds.set(k, h);
  }

  if (!lifts.length && !holds.size) {
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
  const decided = lifts.filter((lift) => !holds.has(lower(lift.name))).map((lift) => {
    const verdict = byExercise[lower(lift.name)]?.verdict || null;

    if (lift.weeksFlat < PLATEAU_RESPONSE.minWeeksFlat) {
      why.push(`${lift.name}: flat ${lift.weeksFlat} weeks, under ${PLATEAU_RESPONSE.minWeeksFlat}. `
        + `Wait. Reacting here would be reacting to a fortnight, and an app that changes the `
        + `plan over noise teaches people to stop trusting the changes.`);
      return { lift, action: "wait", reason: "short" };
    }

    /* The rep range answer on a strength goal, decided here rather than below
       the still-linear wait where it sat until 2026-09-19. Down there it was
       unreachable in practice: it fired 0 times in 94 replayed weeks, because
       the only person who got past the wait was stalled everywhere, and that
       person trips the systemic cut instead. The wait's own argument is that
       a flat lift while loading still works elsewhere is usually attendance,
       and the sessions gate is the answer to that: six sessions of the lift
       inside the window is not attendance. A verdict still comes first below,
       because calibrate.mjs adding load or taking it off is already a change
       and the rep range on top of it is two levers at once. */
    const strengthShort = isStrengthGoal(goal) && lift.weeksFlat < PLATEAU_RESPONSE.shortStallWeeks;
    /* Sessions of the lift while it has been flat, or in the window when the
       plateau came from somewhere that does not count the former. The window
       count alone made the gate unreachable for a lift done once a week: see
       sessionsFlat in training-age.mjs. */
    const ofIt = Math.max(Number(lift.sessions) || 0, Number(lift.sessionsFlat) || 0);
    const enoughOfIt = ofIt >= PLATEAU_RESPONSE.linearMinSessions;

    if (linearStillWorks
        && (lift.weeksFlat < PLATEAU_RESPONSE.linearMinWeeksFlat || !enoughOfIt)
        && !(strengthShort && enoughOfIt)) {
      why.push(`${lift.name}: ${lift.weeksFlat} weeks flat across ${lift.sessions} sessions of `
        + `it, under the ${PLATEAU_RESPONSE.linearMinWeeksFlat} weeks and `
        + `${PLATEAU_RESPONSE.linearMinSessions} sessions this asks for while weight is still `
        + `going up elsewhere. Wait. While session to session loading is still working, linear `
        + `progression is the answer far more often than a stall is real, most flat spots are `
        + `attendance rather than adaptation, and telling somebody they have plateaued is a `
        + `good way to make them believe it.`);
      return { lift, action: "wait", reason: "still-linear" };
    }

    /* Only while the promise is young. calibrate.mjs reads the last two
       sessions; a lift it has called too easy for eight weeks is a lift that
       goes up next session and comes back down the one after, and "this one
       is already sorting itself out" said of that for two months is the app
       not paying attention. Past rotateFromWeeks the bar has had its chance. */
    if (verdict === "too-easy" && lift.weeksFlat < PLATEAU_RESPONSE.rotateFromWeeks) {
      why.push(`${lift.name}: stalled, but calibrate.mjs already reads it as too easy and adds `
        + `load next session. Wait, because that is the stall breaking on its own and a second `
        + `response would be the same fix applied twice.`);
      return { lift, action: "wait", reason: "already-climbing" };
    }

    if (verdict === "too-heavy" && !(lift.weightLb > 0)) {
      /* Cannot happen off detectPlateau any more, which skips loadless rows,
         but this function is exported and takes any list. "It goes lighter
         this week" said of a lift with nothing to go lighter by is the app
         being wrong out loud, so a struggling loadless movement changes
         rather than lightens. */
      why.push(`${lift.name}: flat ${lift.weeksFlat} weeks and calibrate.mjs says too heavy, but there `
        + `is no load on it to take off. Rotate it: the variation is the lever on bodyweight work.`);
      return { lift, action: "rotate" };
    }

    if (verdict === "too-heavy") {
      why.push(`${lift.name}: flat ${lift.weeksFlat} weeks AND calibrate.mjs says too heavy, so `
        + `they are grinding it rather than coasting. Deload the lift, not the week: `
        + `periodization-deloads.md names missed reps on a previously solid lift as a trigger `
        + `and says one week is enough. Not a rotation, because the load is already coming `
        + `down and two changes at once leaves nothing to learn from.`);
      return { lift, action: "deload-lift" };
    }

    if (strengthShort) {
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

  /* ---- the holds, which sit BELOW rotate in the ladder ----
     wait, deload-lift and rep-range are all ways of keeping the lift; rotate
     is the rung where it goes, and a hold is what happens after that rung has
     fired. Inside the block it is live unconditionally: a swap that can be
     undone by next week's build is not a swap, it is noise, and the stand-in
     has to be on the card long enough to be loaded and progressed. Past the
     block it is live while the stand-in is being done and has not itself
     stalled: the moment the stand-in earns a rotate of its own the hold ends
     and the original, rested, is the familiar next pick. A stand-in nobody
     has logged since the swap has nothing to defend the slot with, so the
     original comes back at the block's end. Held lifts are never `acting`:
     they were answered on the week they left, and three of them at once is
     not fatigue, it is memory. */
  const actionOf = new Map(decided.map((d) => [lower(d.lift.name), d.action]));
  const holdWeeks = PLATEAU_RESPONSE.rotateHoldDays / 7;
  const liveHolds = [];
  for (const [, h] of holds) {
    const days = Number(h.daysHeld) || 0;
    const inBlock = days < PLATEAU_RESPONSE.rotateHoldDays;
    const standInStalled = actionOf.get(lower(h.to)) === "rotate";
    const live = inBlock || (h.loggedSince === true && !standInStalled);
    if (!live) {
      why.push(`${h.from}: ${h.to} stood in for it from ${h.rotatedAt}. The block is over and `
        + (standInStalled ? `${h.to} has now stalled itself, so it rotates and ${h.from} is the rested, familiar next pick.`
          : `${h.to} has not been logged since, so there is nothing to keep it in the slot with. ${h.from} may come back.`));
      continue;
    }
    const weeksLeft = inBlock ? Math.max(1, Math.ceil((PLATEAU_RESPONSE.rotateHoldDays - days) / 7)) : 0;
    why.push(`${h.from}: ${h.to} has stood in for it since ${h.rotatedAt}` + (inBlock
      ? `, ${weeksLeft} of ${holdWeeks} weeks left. Held, because a swap undone the next week is noise, not a change.`
      : `. Past the block and still going up, so it keeps the slot: if it is not broken it is not changed.`));
    liveHolds.push({
      lift: { name: h.from, replacement: h.to, weeksLeft, rotatedAt: h.rotatedAt },
      action: "rotate", reason: "held", replacement: h.to, rotatedAt: h.rotatedAt, weeksLeft,
    });
  }

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
    if (cutTaken) {
      summary = {
        action: "none",
        lifts: acting.length,
        detail: `${acting.length} lifts still stalled after the lighter week. The cut has been `
          + `taken inside the last ${PLATEAU_RESPONSE.cutSpentDays} days, so the per lift answers `
          + `run now rather than a second lighter week.`,
        say: null,
      };
      why.push(`${acting.length} stalled lifts would earn a volume cut, and one has already been `
        + `handed out inside the last ${PLATEAU_RESPONSE.cutSpentDays} days. The note promised the `
        + `sets come back after seven days, and the stall cannot have resolved during a week that `
        + `deferred every answer to it, so a second cut here is the same evidence read twice. The `
        + `per lift answers run instead.`);
    } else if (overall === "back-off") {
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
      responses: [
        ...decided.map(({ lift, action, reason = null }) => ({
          exercise: lift.name,
          action: "wait",
          detail: action === "wait"
            ? detailFor({ action, lift, goal, reason })
            : `Deferred: ${action}. Held a week behind the volume cut, which is the change this week.`,
          /* The summary speaks for the whole week here. Four notes saying the same
             thing in different words is the app apologising. */
          say: null,
        })),
        /* A hold survives the cut. The lighter week is the SAME exercises with
           fewer sets, and the stand-in is what is on the card; letting the
           original back in for a week would be the very ping-pong the hold
           exists to stop. Quiet, for the same reason the rest of the week is. */
        ...liveHolds.map(({ lift, action, reason, replacement, rotatedAt, weeksLeft }) => ({
          exercise: lift.name, action, reason, replacement, rotatedAt, weeksLeft,
          detail: detailFor({ action, lift, goal, reason }), say: null,
        })),
      ],
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

  const responses = [...spoken, ...liveHolds].map(({ lift, action, reason = null, replacement, rotatedAt, weeksLeft }) => ({
    exercise: lift.name,
    action,
    detail: detailFor({ action, lift, goal, reason }),
    /* Inside the block the hold says so every week. Past it the stand-in is
       simply their lift now, and a weekly reminder that it used to be
       something else is the app talking about itself. */
    say: reason === "held" && !(weeksLeft > 0) ? null : sayFor({ action, lift, goal, reason }),
    ...(reason === "held" ? { reason, replacement, rotatedAt, weeksLeft } : {}),
  }));

  return { responses, summary, why };
}

/**
 * The rotations the engine has already made, read back off the plans the app
 * saved, exactly the way cutTakenRecently reads the cut. Every stand-in the
 * week prescribes carries `rotatedFor` (the lift it replaced) and `rotatedAt`
 * (the day of the first swap) through the adapter into
 * `ai_workouts.exercises`, and the stand-in's later rows carry the same two
 * fields forward, so the first date survives the app's thirty day window on
 * `plans` as long as the swap is still being prescribed. Read off the earliest
 * `rotatedAt` rather than the row's own date for that reason: measuring the
 * hold from whichever row happens to be in the window would restart it every
 * week.
 *
 * `loggedSince` is whether the stand-in has been trained at all since the
 * swap, which is what decides the hold past its block. Read here, off the
 * logs, so planPlateauResponse can stay a function of its arguments.
 *
 * @param {{ plans?: Array, logs?: Array, today?: Date }} input
 * @returns {Array<{ from: string, to: string, rotatedAt: string, daysHeld: number, loggedSince: boolean }>}
 */
export function rotationsHeld({ plans = [], logs = [], today = new Date() } = {}) {
  const now = today instanceof Date ? today.getTime() : Date.parse(today);
  if (!Number.isFinite(now)) return [];
  const byFrom = new Map();
  for (const p of (Array.isArray(plans) ? plans : [])) {
    if (!p || typeof p !== "object" || !Array.isArray(p.exercises)) continue;
    for (const e of p.exercises) {
      if (!e || typeof e !== "object" || typeof e.rotatedFor !== "string" || !e.rotatedFor.trim()) continue;
      if (typeof e.name !== "string" || !e.name.trim()) continue;
      const at = String(e.rotatedAt || p.entry_date || "").slice(0, 10);
      const stamp = Date.parse(`${at}T12:00:00Z`);
      if (!Number.isFinite(stamp)) continue;
      const days = (now - stamp) / 86400000;
      if (days < 0) continue;
      const k = lower(e.rotatedFor);
      const cur = byFrom.get(k);
      /* Earliest swap wins, so the hold is measured from the day it started. */
      if (!cur || stamp < cur.stamp) byFrom.set(k, { from: e.rotatedFor.trim(), to: e.name.trim(), rotatedAt: at, stamp, daysHeld: Math.floor(days) });
    }
  }
  const out = [];
  for (const [, h] of byFrom) {
    const to = lower(h.to);
    const loggedSince = (Array.isArray(logs) ? logs : []).some((l) => l && typeof l === "object"
      && lower(l.exercise_name) === to && String(l.entry_date || "") > h.rotatedAt);
    out.push({ from: h.from, to: h.to, rotatedAt: h.rotatedAt, daysHeld: h.daysHeld, loggedSince });
  }
  return out;
}

/**
 * Whether a volume cut has been handed out recently, read off the plans the
 * app saved. Every exercise on a cut week carries `volumeCut: true` on its way
 * through the adapter, and `ai_workouts.exercises` is stored verbatim, so this
 * is the one place the engine can see its own last answer without a table. A
 * plan that was generated and never trained still counts: the cut was
 * prescribed, and prescribing it again a week later is the thing the promise
 * forbids. Rows are read the way calibrate.mjs reads them, a row that is not
 * a row says nothing.
 *
 * @param {{ plans?: Array, today?: Date, withinDays?: number }} input
 * @returns {boolean}
 */
export function cutTakenRecently({ plans = [], today = new Date(), withinDays = PLATEAU_RESPONSE.cutSpentDays } = {}) {
  const now = today instanceof Date ? today.getTime() : Date.parse(today);
  if (!Number.isFinite(now)) return false;
  for (const p of (Array.isArray(plans) ? plans : [])) {
    if (!p || typeof p !== "object" || !Array.isArray(p.exercises)) continue;
    if (!p.exercises.some((e) => e && typeof e === "object" && e.volumeCut === true)) continue;
    const at = Date.parse(`${String(p.entry_date)}T12:00:00Z`);
    if (!Number.isFinite(at)) continue;
    const days = (now - at) / 86400000;
    if (days >= 0 && days < withinDays) return true;
  }
  return false;
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
      + `them left a slot with no pool at this equipment. Fell back to the rep range, `
      + `because dropping the slot would leave a hole in the week and silently putting the lift `
      + `back would be the app saying one thing and doing another.`],
  };
}
