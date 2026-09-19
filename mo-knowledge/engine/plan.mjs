/* The plan builder. Four passes, in the order research/05 argues for, and each
 * one after the first can be skipped when its input is missing:
 *
 *   1 STRUCTURE    goal + days + derived level  ->  split, day names, sets, reps, rest
 *   2 SELECTION    + bodyweight, level, equipment ->  which exercises, and a swap for each
 *   3 LOAD         + bodyweight, sex, then logs   ->  a starting weight
 *   4 PROGRESSION  + logs, adherence, layoffs     ->  how the next session differs
 *
 * That ordering is the thesis. A person on day zero has a goal and a day count
 * and nothing else, so pass 1 has to produce a plan worth doing on its own, and
 * everything after it is a refinement to a plan that already stood up. A tree
 * that needs age to reach a branch is the failure mode. A stack where the age
 * pass simply does not run is the design.
 *
 * The exercise library is imported read only from knowledge/, which is Jawa's.
 * Deliberate: if both runs at this problem use the same 219 exercises then the
 * comparison is about the algorithm rather than about who wrote a better list.
 */
import { TRAININGS } from "../../knowledge/exercise-library/index.mjs";
import { resolveGoal, barredMovements, movementCautionNotes } from "./goal-engine.mjs";
import { deriveTrainingAge, observedCapacity } from "./training-age.mjs";
import { prescribeLoad, patternFor, roundLoad } from "./load.mjs";
import { calibrate } from "./calibrate.mjs";
import { learnPreferences, applyPreferences, avoidNote, openWeekBudget, heldBackNote, actedOn } from "./preferences.mjs";
import { scoreAlternatives } from "./alternatives.mjs";
import { planPlateauResponse, applyRotateFallback, repShiftFor } from "./plateau-response.mjs";
import { normalizeLimits, applyLimits, allowedEquipment, limitsSummary, softenedNote } from "./limits.mjs";
import { mainGroupsForDay } from "./recovery.mjs";
import { TIER_MULTIPLIER, TIERS } from "./focus.mjs";
import { mobilityFor, COOLDOWN_SECONDS, WARMUP_SECONDS, RAMPED_WARMUP_SECONDS } from "./mobility.mjs";

const WEIGHTS = TRAININGS.find((t) => t.id === "weight-training");
const CALIS = TRAININGS.find((t) => t.id === "calisthenics");

/* Weekly hard sets per muscle group, before the goal's factor and any priority.
   From knowledge/principles/volume-landmarks.md, deliberately at the low end for
   beginners: research/09 says the first weeks decide retention, and nobody ever
   quit because week one was too easy. */
const BASE_WEEKLY_SETS = { beginner: 8, novice: 10, intermediate: 14, advanced: 16 };
/* The multiplier a prioritised group earns, by focus tier: 1.75 red, 1.4
   yellow, 1.2 green, and 1.0 for everything else. Tier 0 is "not a priority" and is the
   only entry this file invents; the other three, and the reasoning for the 0.2
   step between them, live in engine/focus.mjs next to the tiers themselves.
   A goal's own priority list has no tiers and lands on the middle one, which is
   the flat 1.4x this constant used to be. */
const PRIORITY_MULTIPLIER = { 0: 1, ...TIER_MULTIPLIER };

/* MRV, the weekly ceiling, straight off the table in
   knowledge/principles/volume-landmarks.md. Past it "fatigue outpaces recovery
   and performance degrades even though more sets feels like it should mean more
   progress", which is a different claim from the clamp in `setsFor`: that one is
   about what a session can hold, this one is about what a week can recover from.

   It exists because the focus tiers could ask for a number no source in
   knowledge/ supports. An advanced base of 16 with a red focus is 16 x 1.75 =
   28 weekly sets, past the highest MRV in the table for any muscle, and the
   only reason nobody was ever prescribed 28 was the session clamp catching it
   on the way out. A ceiling the engine happens to be saved from by an unrelated
   limit is not a ceiling.

   It caps the ASK and not the prescription, and measurably so: the session
   clamp binds first in every combination the sweep covers, so turning this on
   moved no set count and no warning total. What it changes is the largest
   number the ledger can carry, which was 28 and is now the muscle's own MRV.
   The table's rows are the groups it names, so "Back (lats/rows)" is lats and
   "Abs/core" covers abs and obliques. Traps and forearms have no row and are
   left uncapped rather than given an invented number; every split in this file
   touches them once a week, so the frequency cap below is what binds on them. */
const WEEKLY_MRV = {
  chest: 22, lats: 25, shoulders: 24, quads: 20, hamstrings: 18,
  glutes: 18, biceps: 22, triceps: 20, calves: 22, abs: 20, obliques: 20,
};

/* A short day is fewer sets and less time, not half a session. It used to hand
   back the main slots alone, which is two exercises on a push or a pull day, and
   PLAN.md's contract with the app says 4 to 6. So the accessories fill back up
   to four and the sets come down instead. */
const SHORT_DAY_MIN = 4;
const SHORT_DAY_SETS = 2;

/* The top of the per-session sets clamp, named because two things now read it.
   `setsFor` clamps to [2, MAX_SETS_PER_SESSION] because a session is what a
   person reads and eleven sets of one movement is not a session; the weekly
   ledger reads it to work out what a split can physically deliver in a week.
   It was a bare 6 inside setsFor and the ledger had no way to know about it,
   which is how a weekly target of 14 could be asked of a slot that tops out at
   6 and the shortfall be filed as the plan's fault. */
const MAX_SETS_PER_SESSION = 6;

/* How far a group's weekly total is allowed to drift from its target before the
   plan does something about it. Two sets, because the target is itself a round
   number off a landmark range and pretending it is exact would have the week
   twitching over a rounding. */
const VOLUME_SLACK = 2;

/* The time budget. `P.sessionMin` has existed since the first version and only
   the display ever read it, so a strength day of six lifts at six sets and three
   minutes of rest printed "~60 min" over something closer to two hours. 15% over
   is the tolerance, because the estimate is an estimate and trimming a session
   for one minute is worse than the minute. Nothing goes below four exercises
   (PLAN.md's contract with the app) and a main movement is never the thing that
   goes.

   What a set costs, 2026-09-14. Until today a set was a flat thirty seconds
   plus its rest, and nothing else in the visit was counted, so a five exercise
   beginner day printed "About 21 min" over something closer to half an hour.
   Mo, on his own plan: "it says 6 min for warm up, 5 min for cool down and
   then I have 5 exercises and it says I can finish it in 20 mins, like no I
   can't." The minutes now come from what a person actually does at the rack:

     work        SET_SETUP_SECONDS + REP_SECONDS x reps. Ten seconds to get
                 under the bar, set the grip and unrack, then about four seconds
                 a rep at a controlled tempo. Eight reps is 42 seconds, fifteen
                 is 70, which is what a timed set of either really reads.
     rest        the prescribed interval, between sets, so (sets - 1) of them.
                 The rest after the LAST set of a movement is not a rest, it is
                 the walk to the next station, and that is charged as:
     transition  TRANSITION_SECONDS per exercise. Re-racking, walking, loading
                 the next bar, adjusting a seat. Measured sessions put this at a
                 minute to a minute and a half; 75 is the middle.
     logging     LOG_SECONDS per set, for ticking the set in the app. It
                 overlaps the rest some of the time and not all of it.
     warm-up     `prepMinutes`, the general block plus the ramp, unchanged.
     cool-down   on top, see COOLDOWN_MIN and `overClock`.

   Worked example, so the number can be checked by reading: five exercises at
   three sets of ten with 90 seconds rest, a six minute warm-up and a five
   minute cool-down.
     work        15 sets x (10 + 4 x 10) = 750 s
     logging     15 sets x 10             = 150 s
     rest        5 x 2 x 90               = 900 s
     transitions 5 x 75                   = 375 s
     lifting                              = 2175 s = 36.25 min
     + warm-up 6 = 42.25, rounds to 42 for `estimatedMinutes`
     + cool-down 5 = 47 for the whole visit.
   The old arithmetic said 6 + 15 x 120 / 60 = 36 for the same day.

   index.html mirrors these four numbers in `sessionEstimateMinutes` so the
   card and the clock the plan was built to are the same arithmetic. Change
   one, change both. */
const SET_SETUP_SECONDS = 10;
const REP_SECONDS = 4;
const LOG_SECONDS = 10;
const TRANSITION_SECONDS = 75;
/* A rep count outside this is a typo or a timed hold written as reps, and
   either way it is not four seconds a rep, so the work time is clamped. */
const REPS_COSTED_MAX = 30;
/* Six, matching mobility.mjs WARMUP_SECONDS. These two numbers are the same
   minutes counted twice: this one reserves them inside the session estimate,
   that one fills them with moves. They were 5 and 5; research/13 moved the
   block to 6 and this followed, or the estimate would quietly under-report
   every session by a minute.

   Both are now derived rather than written, because a day that ramps its first
   lift gets a shorter general block (mobility.mjs RAMPED_WARMUP_SECONDS) and a
   ramp on top of it. `prepMinutesFor` below is the one place the two halves are
   added up, and `estimateMinutes` reserves whatever it says. */
const WARMUP_MIN = Math.round(WARMUP_SECONDS / 60);
/* The nominal cool-down, and it is inside the clock check for a budget a
   PERSON named. The fill pass has always reasoned that "the person named how
   long they are in the gym, not how long the middle of it is" and counted these
   five minutes against the budget; the trim ladder did not, so a 30 minute
   answer built a 30 minute working session and the app then printed 35 over it.
   The rule is the budget is the whole visit, and it applies to the number
   somebody said out loud.

   It does NOT apply to `P.sessionMin`, and that is the correction of
   2026-09-15. The goal's own length is not a statement about how long anybody
   is in a gym: goal-engine.mjs derives it from the general warm-up plus the
   ramp plus the sets, and its own note on the 2026-09-12 increase adds up
   exactly those three and no cool-down. Charging five minutes of stretching
   against a number that never contained them silently took five minutes off
   every goal, which cost 15% of the week's volume: intermediate groups under
   0.8 of their weekly target went 18.2% to 39.0% across the sweep, advanced
   15.1% to 36.8%, on a matrix with no stated session length anywhere in it,
   which is nearly every real user. So a day carries `clockReserve`: the
   cool-down when the clock is theirs, nothing when the clock is the goal's.
   One rule, two honest readings of what the number means. */
const COOLDOWN_MIN = Math.round(COOLDOWN_SECONDS / 60);
const TIME_TOLERANCE = 1.15;

/* The three numbers the person's own clock needs, and none of them are read
   unless they gave one. See the budget block in `buildPlan`.

   15 and 120 are the clamp on what a slider may send. Below 15 there is no
   session at all: four movements at the smallest prescription this engine has,
   two sets and the shortest rest it will allow, is about 25 minutes once the
   warm-up and cool-down are in, so anything under that is a number the plan can
   only fail to meet. Above 120
   nothing changes, because the volume ceilings stop the fill pass long before
   the clock does; the ceiling is there so a typed 6000 does not turn into a
   loop that adds sets until MRV catches it one at a time.

   MAIN_SETS_FLOOR is 3 rather than the 2 an accessory can go to. A main lift at
   two sets is not the movement the day was built around any more, and the whole
   argument for letting the clock touch a main at all is that fewer real sets
   beats more rushed ones. Three is where it stops being real.

   The rest floor is a fraction and an absolute, and both are needed: 0.6 keeps
   the shape of the goal's prescription (a strength rest stays long relative to
   an accessory rest), and 45 seconds is the point below which a set stops being
   a set and becomes conditioning. Rest is the LAST lever on purpose, because it
   is the only one that changes what a set is worth rather than how many there
   are, and it is the only one that has to say out loud what it did. */
const SESSION_MIN_FLOOR = 15;
const SESSION_MIN_CEILING = 120;
const MAIN_SETS_FLOOR = 3;
const REST_FLOOR_FACTOR = 0.6;
const REST_FLOOR_SEC = 45;

/* ---- ramp-up sets, which a longer session buys first ----
   research/13 section 5. The warm-up today is a screen of stretches and then the
   session opens at the working weight, which is the one design that file tests
   against an alternative and loses: Oliva 2026 measured peak squat force falling
   3.8% after a general mobility warm-up and holding after a movement-specific
   one. Iversen 2021 says the same thing from the review side, "restrict the
   warm-up to exercise-specific warm-ups", with the nuance that matters here:
   the need for a specific ramp scales with load, and at twelve reps the first
   reps of the working set already are the ramp.

   The table is research/13's own: empty bar, then 50, 70 and 88% of the working
   weight, at 8, 5, 3 and 2 reps, resting 45, 45, 60 and 60 seconds.

   WHAT COUNTS AS HEAVY, which is the whole rule, stated where it is decided:

   research/13 puts it in %1RM and nowhere else. "Three to four ramp sets for a
   main compound at or above 80% 1RM; one to two for a second main; none for
   accessories and isolation", and Iversen 2021's nuance underneath it, "the need
   for a specific warm-up scales with load. Above about 80% 1RM it matters. In
   higher rep ranges, the first few reps of the working set already are the
   specific warm-up." So the gate is %1RM, and `impliedPct` below reads it off
   the prescribed reps by inverting load.mjs's own `workingFrom1RM` at the RIR it
   prescribes with. That inversion matters: the number agrees with how the weight
   on the card was worked out, rather than being a second opinion about the same
   lifter.

   Three conditions, all required:

   1. A MAIN slot. research/13 is explicit that accessories and isolation get
      none, so a lateral raise cannot reach this code however many reps it has.
   2. A prescribed weight above zero. See `rampFor`: a push-up has nothing to
      ramp and this engine has no regression ladder to ramp it with.
   3. At or above RAMP_PCT_FLOOR of one rep max.

   And then the count, from the two thresholds:

   | prescribed reps | implied %1RM | rungs | why |
   |---|---|---|---|
   | 5 or fewer | 81% and up | 4 | research/13's "at or above 80% 1RM", top of its 3 to 4 |
   | 6 to 9 | 73 to 79% | 3 | under the threshold where it "matters", still a load nobody meets cold. Bottom of the same 3 to 4 |
   | 10 or more | 71% and down | 0 | Iversen: the first reps of the working set already are the specific warm-up |

   A second main is gated the same way and gets one rung whatever it clears by,
   because research/13 caps it there: the body is warm by then and what is left
   is neural rehearsal of the movement.

   This is deliberately NOT gated on the clock any more. It was, for one day, and
   the effect was that an advanced lifter on a strength goal got nothing, because
   that person is already over the session length they asked for. They are also
   exactly the person research/13 is describing. A ramp is part of the warm-up,
   not something spare minutes buy, and `prepMinutesFor` costs it that way.

   A ramp set carries no volume. It is never counted in the weekly ledger, never
   seen by recovery.mjs, never written as an exercise_log, and never appears in
   `d.exercises`, which is the array the app copies into `ai_workouts.exercises`
   and therefore the only array calibrate.mjs can join against. That separation
   is the whole reason these live on their own key.

   Fifteen seconds a set rather than the setup and reps a working set costs: two
   light reps off a rack is not thirty seconds of work, and the rests are what
   the ramp actually spends. A full four set ramp comes to about four and a half
   minutes, which is research/13's "about three to four" plus the rest before
   the first working set. */
const RAMP_TABLE = [
  { pct: 0, reps: 8, restSec: 45 },
  { pct: 0.5, reps: 5, restSec: 45 },
  { pct: 0.7, reps: 3, restSec: 60 },
  { pct: 0.88, reps: 2, restSec: 60 },
];
const RAMP_SET_SECONDS = 15;
/* 70% is the middle rung, heavy enough to rehearse and light enough to be free. */
const RAMP_SECOND_MAIN = [2];
const RAMP_PCT_HEAVY = 0.80;
/* Where "not worth a ramp" starts. Chosen so the cut lands between 9 and 10
   prescribed reps, which is where Iversen's "higher rep ranges" argument takes
   over from the load argument, and it is a real cut rather than a tidy one:
   nine reps implies 73% and ten implies 71%. */
const RAMP_PCT_FLOOR = 0.72;

/* What fraction of one rep max a set of `reps` at the RIR this engine prescribes
   with actually is. The inverse of load.mjs `workingFrom1RM`, written out here
   rather than imported because that function goes the other way and inverting it
   in place would mean a caller could not tell which direction it was being asked
   for. Same formula, same default RIR, so the two agree by construction. */
function impliedPct(reps) {
  const rirTrim = 1 - Math.min(0.10, 2 * 0.025);
  return (1 / (1 + reps / 30)) * rirTrim;
}

/* "3:00", for the one sentence that has to compare two rest intervals. */
function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* The warm-up minutes a day reserves, general block plus ramp, rounded once at
   the end rather than half by half: rounding 240 and 270 seconds separately
   turns eight and a half minutes into nine and hands the day a minute it never
   spends. A day with no ramp is WARMUP_MIN, which is what every day was before
   ramps existed and what the whole file was measured against. */
function prepMinutesFor(day) {
  const rampSec = (day?.rampSets || []).reduce((t, r) => t + r.seconds, 0);
  if (!rampSec) return WARMUP_MIN;
  return Math.round((RAMPED_WARMUP_SECONDS + rampSec) / 60);
}

/* The lifting itself, in seconds, costed the way the comment on REP_SECONDS
   lays out. Exported so test.mjs asserts the same arithmetic rather than a
   copy of it, and so a reader of index.html's mirror has one place to check. */
export function setWorkSeconds(reps) {
  const r = Math.min(REPS_COSTED_MAX, Math.max(1, Math.round(Number(reps) || 0) || 1));
  return SET_SETUP_SECONDS + REP_SECONDS * r;
}
export function exerciseSeconds(e) {
  const sets = Math.max(0, Math.round(Number(e?.sets) || 0));
  if (!sets) return 0;
  const rest = Math.max(0, Number(e.restSec) || 0);
  return sets * (setWorkSeconds(e.reps) + LOG_SECONDS) + (sets - 1) * rest + TRANSITION_SECONDS;
}
export function sessionSeconds(exercises) {
  return (exercises || []).reduce((t, e) => t + exerciseSeconds(e), 0);
}
export function estimateMinutes(exercises, prepMinutes = WARMUP_MIN) {
  return Math.round(prepMinutes + sessionSeconds(exercises) / 60);
}
/* Whether a day runs past its clock. Every trim, fill and ramp decision
   measures against this one line. Takes the day rather than its minutes so the
   reserve travels with the budget it belongs to: see COOLDOWN_MIN for why a
   stated clock reserves the cool-down and the goal's own does not. */
function overClock(estimate, day) {
  return estimate + (day?.clockReserve ?? 0) > (day?.minutes ?? 0) * TIME_TOLERANCE;
}

/* The ramp for one lift, or null when there is nothing to ramp.

   BODYWEIGHT AND ANYTHING ELSE THAT CANNOT BE LOADED GETS NONE, deliberately and
   not by accident. A ramp is a load and a rep count, and `targetWeight` of 0 is
   this engine's word for "bodyweight, or we do not know". For a push-up the ramp
   would have to be an incline push-up and for a squat a box squat, which is
   research/13 open question 9, and the answer there is that the engine would
   need a regression ladder per movement pattern. It does not have one: checked
   2026-09-12, `knowledge/exercise-library/calisthenics.mjs` carries `name`,
   `primary`, `secondary`, `equipment` and `level` and nothing that orders two
   movements on the same pattern by difficulty, so there is no way to say that a
   wall push-up is the easier version of a push-up rather than a different
   exercise for the same muscle. Guessing a ladder from `level` would put a
   beginner-tagged movement in front of an intermediate one on a pattern they do
   not share. So: no ramp, written down here and in LIBRARY-REQUESTS.md, rather
   than a ramp that is wrong. A plank gets none for the same reason and also
   because it is never a main slot.

   A working weight small enough that 50% of it rounds onto the rung below is a
   light dumbbell, where the ramp would be four sets of the same weight written
   four times. Same answer.

   `rungs` is which rows of RAMP_TABLE to use, from `rungsForReps` for a first
   main and the single middle rung for a second. */
function rampFor(exercise, rungs) {
  if (!rungs || !rungs.length) return null;
  const working = Number(exercise?.weight);
  if (!Number.isFinite(working) || working <= 0) return null;
  const sets = [];
  for (const i of rungs) {
    const row = RAMP_TABLE[i];
    const weight = row.pct === 0 ? 0 : roundLoad(working * row.pct);
    /* A rung that rounds onto the rung before it is the same set twice, and two
       identical sets is not a ramp. Drop it rather than print it. */
    if (row.pct !== 0 && (!weight || weight >= working || sets.some((s) => s.weight === weight))) continue;
    sets.push({
      weight, reps: row.reps, restSec: row.restSec, pct: row.pct,
      /* The zero rung is the only one a number cannot say. "Empty bar" is what
         research/13 writes and it is wrong for a leg press and for dumbbells,
         so the cue names the idea rather than the equipment. */
      cue: row.pct === 0 ? "The bar on its own, the machine empty, or the lightest weight you have." : null,
    });
  }
  /* A ramp that asked for four rungs and kept one is a gesture, not a ramp: the
     rungs collapsed onto each other, which means the working weight is light
     enough that there is nothing to work up to. A ramp that only ever asked for
     one rung is the second main, and one rung is what research/13 prescribes
     there, so it stands. */
  if (!sets.length || (rungs.length > 1 && sets.length < 2)) return null;
  return {
    exercise: exercise.name,
    group: exercise.group,
    sets,
    seconds: sets.reduce((t, s) => t + RAMP_SET_SECONDS + s.restSec, 0),
  };
}

/* How many rungs the first main of a day earns. The table is in the comment on
   RAMP_TABLE; this is it in code. An empty list is "no ramp", which is the
   answer for anything under the floor. */
function rungsForReps(reps) {
  const pct = impliedPct(reps);
  if (pct >= RAMP_PCT_HEAVY) return [0, 1, 2, 3];
  if (pct >= RAMP_PCT_FLOOR) return [0, 1, 2];
  return [];
}

/* The first main's ramp, decided by the lift alone and not by the clock. Runs
   before the time passes, because `prepMinutesFor` has to be able to cost it and
   the trims have to be able to see what it costs.

   The second main's single rung is NOT here, and that is a measurement rather
   than an oversight. research/13 asks for one to two rungs on a second main, but
   it is the weakest claim in that section: "the body is warm by then and the
   value of the ramp is mostly neural rehearsal", with no citation attached, and
   section 5's own confidence note does not cover it. Built it unconditionally
   first and swept it: it put 319 more days over their time budget and cost 164
   real working sets across the matrix, because the trims took the minutes out of
   the sets. Trading a person's working sets for an uncited rehearsal rung is a
   bad trade. So it moved to `addSecondMainRamps` below, which adds it only where
   the day already has room, and it is therefore free by construction. */
function rampsForDay(exercises, roleOf) {
  /* The first main that CAN be ramped, not simply the first main. A day that
     opens with a pull-up and follows it with a barbell row used to come back
     with nothing, because the ramp stopped at the first slot and that slot was
     bodyweight. The row is then the first loaded thing the person meets, and it
     is the one that should not be met cold. */
  for (const e of exercises) {
    if (roleOf.get(e) !== "main") continue;
    const r = rampFor(e, rungsForReps(e.reps));
    if (r) return [r];
  }
  return [];
}

/* The second main's one rung, added only where it costs the day nothing. Runs
   after every trim and after the back-off, so `d.estimatedMinutes` is final and
   the question "does this still fit" has an answer. A day that cannot take it
   keeps its sets, which is the trade the comment above measured. */
function addSecondMainRamps(week, roleOf) {
  for (const d of week) {
    if (!d.rampSets.length) continue;
    /* The next main after the one already ramped, by the same "first that can
       be" rule. A second main clears the same load floor before it earns its
       rung: research/13 caps the count there, it does not lower the bar. */
    const already = d.rampSets[0].exercise;
    let second = null;
    let seen = false;
    for (const e of d.exercises) {
      if (roleOf.get(e) !== "main") continue;
      if (e.name === already) { seen = true; continue; }
      if (!seen) continue;
      if (impliedPct(e.reps) < RAMP_PCT_FLOOR) continue;
      const candidate = rampFor(e, RAMP_SECOND_MAIN);
      if (candidate) { second = candidate; break; }
    }
    const r = second;
    if (!r) continue;
    const withIt = [...d.rampSets, r];
    const prep = prepMinutesFor({ rampSets: withIt });
    if (overClock(estimateMinutes(d.exercises, prep), d)) continue;
    d.rampSets = withIt;
    d.prepMinutes = prep;
    d.rampMinutes = Math.round(withIt.reduce((t, x) => t + x.seconds, 0) / 60);
    d.estimatedMinutes = estimateMinutes(d.exercises, prep);
  }
}

/* The sets clamp used to be Math.max(2, Math.min(5, ...)) applied straight to
   the rounded target, and it quietly ate the three things that were supposed to
   move it. A beginner's 8 weekly sets over one hit already rounds past the top,
   so P.setsFactor did nothing; a strength intermediate on 14 pinned at 5 whether
   or not the group was a priority; and calibration's 0.85 back-off changed no
   number at all while dayNotes said "this one is a touch lighter". In 20 of the
   52 goal and level combinations every multiplier was a silent no-op, which is
   worse than not having them: the plan said one thing and did another.
   So: compute unclamped, then guarantee the direction each modifier asked for
   against what the count would have been without it, then clamp to [2, 6].
   Where a back-off and a priority meet on the same lift the priority wins by
   one set, because a group the goal named should never come out below its
   neighbours in the same session.

   Round three moved two things, both for the same reason: the guarantee has to
   survive the clamp, and the round two version ran it before the clamp.
   1. The priority guarantee is taken after the divide, on the per-session
      number, so a group the goal named earns a set in the session rather than
      only in the weekly total. Multiplying the week and then dividing is the
      same arithmetic either way, but +1 is not: on the week it can vanish into
      a rounding, on the session it cannot. `enforcePriorityFloor` below then
      finishes the job across a whole day, which is the half of it no single
      exercise can see.
   2. A back-off is subtracted from the CLAMPED number rather than folded into
      the target before it. The old order was the [2, 6] clamp swallowing the
      cut it was meant to protect: 14 weekly sets over one hit is 14, times 0.85
      is 12, and both come out of the clamp at 6, so the plan said "this week is
      lighter" and handed back the same six sets. Measured on a three lift
      stall: the cut moved 2 slots out of 11.

   Round four took the back-off out of here altogether, and it is the same
   lesson one level up. Subtracting it in pass 2 put it in front of three later
   passes that all re-decide a set count and none of which knows a back-off is
   in force: the volume ledger trims a group that is over target, the clock
   shaves accessories off a day that runs long, and a stated session length buys
   sets back where the ledger says there is room. A lighter week is a cheaper
   week in minutes, so the clock had less to shave, and the sweep of 2026-09-12
   measured the result: get-stronger/strong-not-bigger on identical logs came
   back with 50 weekly sets when calibration said back off and 48 when it said
   nothing. The back-off was real in every single number and the week it
   produced was bigger. Two hands on one lever, and the fix is to take the
   second hand off rather than to change what either of them pulls: the ease is
   the last thing that happens to a set count now, in `easeSets` below, so the
   back-off week is the week the person would have had minus the cut, and
   nothing downstream can hand any of it back. */
function setsFor({ base, hitCount, tier, ceiling = Infinity }) {
  const per = (weekly) => Math.round(weekly / Math.max(1, hitCount));
  const plain = per(base);
  /* The +1 guarantee is a floor and not a bonus, so it is the same +1 at every
     tier. A group somebody marked green has to come back with more sets than an
     identical group they did not mark, or the colour was decoration; how much
     more than that is the multiplier's job.

     `ceiling` is the group's MRV and it caps the boosted week before the divide,
     never the +1: a focus still always earns its set, because an ask past what a
     week can recover from is a reason to stop adding, not a reason to take the
     colour back. It sits outside the Math.max for exactly that reason. */
  const boosted = Math.min(base * PRIORITY_MULTIPLIER[tier], ceiling);
  const wanted = tier ? Math.max(per(boosted), plain + 1) : plain;
  return Math.max(2, Math.min(MAX_SETS_PER_SESSION, wanted));
}

/* The back-off itself, unchanged in what it takes and moved in when it takes
   it. The accessories take the 0.85 they always took. A main lift takes
   whichever is smaller, so the cut is never less than one set: that is the whole
   promise the note in dayNotes makes on the user's behalf. Floor of two, because
   a prescription of one set is not a lighter week, it is a missing exercise. */
function easeSets(sets, isMain) {
  const eased = Math.round(sets * 0.85);
  return Math.max(2, isMain ? Math.min(eased, sets - 1) : eased);
}

/* Either shape of a priority list, read as one map. An array is the old shape
   and every entry in it is a middle-tier group; an object is already the map
   engine/focus.mjs produces. Unknown tiers are floored at the middle one rather
   than dropped, on the same principle as focus.mjs: a group somebody named is a
   group they want, whatever nonsense came with it. */
function toTierMap(input) {
  const out = {};
  if (Array.isArray(input)) {
    for (const g of input) if (typeof g === "string") out[g] = TIERS.secondary;
    return out;
  }
  if (input && typeof input === "object") {
    for (const [g, t] of Object.entries(input)) {
      const n = Math.round(Number(t));
      if (!n) continue;
      out[g] = TIER_MULTIPLIER[n] ? n : TIERS.secondary;
    }
  }
  return out;
}

/* Priority has to hold inside one session and not only across the week, because
   a session is what somebody reads. `setsFor` divides a weekly target by how
   often the group is hit, and two groups on the same card can arrive there by
   very different divisors: on the toned-arms person a Russian Twist for a group
   trained once a week came out at 6 sets next to a priority Step-Up at 4, so the
   card said "arms and glutes are the focus" and then gave the most sets to abs.
   The extra volume a priority earns has to come out of a fixed weekly budget
   (see engine/README.md, Focus), so this takes it from the neighbours rather
   than adding it on top: on any day that has a priority exercise, nothing
   without the flag carries more sets than the lowest priority lift there.

   Tiers narrowed this on both ends, and deliberately. Only a red or a yellow
   sets the ceiling: a green is "slightly focusing on it", and letting a slight
   preference cap every other lift on the card is the tail wagging the session.
   And only an unfocused lift is capped by it, so a green never has sets taken
   off it to protect a red. The result for a legacy pick, where everything is
   yellow and nothing is green, is the function this has always been. */
function enforcePriorityFloor(exercises) {
  const priority = exercises.filter((e) => e.focusTier >= TIERS.secondary);
  if (!priority.length) return;
  const ceiling = Math.min(...priority.map((e) => e.sets));
  for (const e of exercises) if (!e.focusTier) e.sets = Math.max(2, Math.min(e.sets, ceiling));
}

/* A day is a list of slots. Each slot names a movement pattern and the muscle
   groups that satisfy it, so two slots can never quietly land on the same group,
   which is the bug the brief complains about first (two shrugs in a row). */
const SLOTS = {
  fullBody: [
    { pattern: "squat", groups: ["quads"], role: "main" },
    { pattern: "horizontalPush", groups: ["chest"], role: "main" },
    { pattern: "horizontalPull", groups: ["lats"], role: "main" },
    { pattern: "hinge", groups: ["hamstrings", "glutes"], role: "main" },
    { pattern: "core", groups: ["abs"], role: "accessory" },
  ],
  push: [
    { pattern: "horizontalPush", groups: ["chest"], role: "main" },
    { pattern: "verticalPush", groups: ["shoulders"], role: "main" },
    { pattern: "isolation", groups: ["chest"], role: "accessory" },
    { pattern: "isolation", groups: ["triceps"], role: "accessory" },
    { pattern: "isolation", groups: ["shoulders"], role: "accessory" },
  ],
  pull: [
    { pattern: "verticalPull", groups: ["lats"], role: "main" },
    { pattern: "horizontalPull", groups: ["lats", "traps"], role: "main" },
    { pattern: "isolation", groups: ["biceps"], role: "accessory" },
    { pattern: "isolation", groups: ["traps"], role: "accessory" },
    { pattern: "isolation", groups: ["forearms"], role: "accessory" },
  ],
  legs: [
    { pattern: "squat", groups: ["quads"], role: "main" },
    { pattern: "hinge", groups: ["hamstrings"], role: "main" },
    { pattern: "lunge", groups: ["glutes"], role: "accessory" },
    { pattern: "isolation", groups: ["calves"], role: "accessory" },
    { pattern: "core", groups: ["abs"], role: "accessory" },
  ],
  upper: [
    { pattern: "horizontalPush", groups: ["chest"], role: "main" },
    { pattern: "verticalPull", groups: ["lats"], role: "main" },
    { pattern: "verticalPush", groups: ["shoulders"], role: "main" },
    /* Was groups ["traps"] alone, and the library has no trap-primary row, so it
       fell through to shrugs: the exact failure the brief names first about the
       other selector. Widened so a row qualifies. */
    { pattern: "horizontalPull", groups: ["lats", "traps"], role: "accessory" },
    { pattern: "isolation", groups: ["biceps"], role: "accessory" },
    { pattern: "isolation", groups: ["triceps"], role: "accessory" },
  ],
  lower: [
    { pattern: "squat", groups: ["quads"], role: "main" },
    { pattern: "hinge", groups: ["hamstrings", "glutes"], role: "main" },
    { pattern: "lunge", groups: ["glutes"], role: "accessory" },
    { pattern: "isolation", groups: ["calves"], role: "accessory" },
    { pattern: "core", groups: ["obliques"], role: "accessory" },
  ],
};

/* Names, because "there is no Push day or Legs, just a list" is complaint 4.
   Exported so the one day case can be tested at all: every goal in the tree has
   a minDays of 2 or 3 today, so buildPlan cannot currently reach it, and a fix
   nothing can call is a fix nobody can trust. */
export function splitFor(days, level) {
  const young = level === "beginner" || level === "novice";
  /* One day a week is its own answer, not the two day answer with a day cut off.
     Slicing the pair down to one left somebody with a week called "Full body A"
     and no B anywhere, which reads as the app having lost a day. */
  if (days <= 1) return [["Full body", "fullBody"]];
  if (days <= 2) return [["Full body A", "fullBody"], ["Full body B", "fullBody"]];
  if (days === 3) {
    return young
      ? [["Full body A", "fullBody"], ["Full body B", "fullBody"], ["Full body C", "fullBody"]]
      : [["Push day", "push"], ["Pull day", "pull"], ["Leg day", "legs"]];
  }
  if (days === 4) return [["Upper body A", "upper"], ["Lower body A", "lower"], ["Upper body B", "upper"], ["Lower body B", "lower"]];
  return [["Push day", "push"], ["Pull day", "pull"], ["Leg day", "legs"], ["Upper body", "upper"], ["Lower body", "lower"]];
}

/* Which slots a day actually runs. A short day keeps every main movement and
   then takes accessories in order until it reaches four, because two exercises
   is not a session the app is allowed to hand back. */
function slotsForDay(key, isShort) {
  const all = SLOTS[key];
  if (!isShort) return all;
  /* Mains first, then every accessory in order, and the cap is applied by the
     caller on PICKS rather than here on slots. Slicing the slots to four meant
     a slot the equipment filter could not fill counted against the floor, and
     the sweep of 2026-09-10 found 100 bodyweight only short days handed back
     with two exercises: the comment in adapter.mjs saying the floor there
     "should never fire" was carrying the whole week. */
  const mains = all.filter((s) => s.role === "main");
  const rest = all.filter((s) => s.role !== "main");
  return mains.concat(rest);
}

const LEVEL_RANK = { beginner: 0, novice: 1, intermediate: 2, advanced: 3 };

/* How far a movement can be loaded, as a ranking penalty rather than a filter.
   Only a strength emphasis reads it, and only on a main slot. A beginner who
   picks "Get stronger" and has logged nothing was handed Push-Up at 3 reps as
   the main horizontal push, because the level term below prefers the level
   closest to the user and a push-up is tagged beginner while a bench press is
   intermediate. Three reps of a push-up is not a strength prescription and no
   amount of progression turns it into a 225 bench: there is nothing to add.
   Barbell and machine load in small steps and keep going, so they cost nothing.
   Dumbbells and cables load in coarser steps and run out at whatever the rack
   holds, so they cost a little. Bodyweight cannot be loaded at all, so it costs
   3, which is enough to lose to a lift two levels away (2 plus the 0.5 for
   being above the user) and never enough to outrank the -100 for something they
   already lift. Every other emphasis keeps the conservative tie break it had. */
const LOAD_PENALTY = { barbell: 0, machine: 0, bodyweight: 3 };
const loadPenalty = (ex) => LOAD_PENALTY[ex.equipment] ?? 1;

/* A main slot is a movement pattern somebody needs, so it reaches one level
   higher than an accessory would. Without that a beginner gets no hinge at all:
   every deadlift, Romanian deadlift and hip thrust in the library is tagged
   intermediate or above, which is defensible on technique and leaves a beginner
   with no posterior chain work, which is worse. See engine/README.md. */
function candidates({ groups, pattern, level, equipment, role = "accessory", historyNames = [], preferences = null, prefBudget = null, exclude = null, emphasis = null, barred = null }) {
  const ceiling = (LEVEL_RANK[level] ?? 0) + (role === "main" ? 2 : 1);
  const match = (needPattern) => {
    const pool = [];
    for (const lib of [WEIGHTS, CALIS]) {
      for (const cat of lib.categories) {
        for (const ex of cat.exercises) {
          if (!(ex.primary || []).some((g) => groups.includes(g))) continue;
          if ((LEVEL_RANK[ex.level] ?? 0) > ceiling) continue;
          if (equipment && !equipment.includes(ex.equipment)) continue;
          /* The goal's own "not these". This is the one exclusion in the file
             with no fallback and it sits here, inside the pool build, rather
             than beside `exclude` below: everything below has a
             never-empty-a-slot rule, and a never-empty rule applied to this
             list would hand back the exact movement the goal warned about
             whenever it was the only one left, which is the bug. So it filters
             both the exact-pattern pass and the loose one, and where that
             leaves nothing the slot goes empty and buildPlan says so. */
          if (barred && barred.has(ex.name.toLowerCase())) continue;
          if (needPattern && patternFor(ex) !== pattern) continue;
          pool.push(ex);
        }
      }
    }
    /* Ranked, not just simplest first. Simplest-first alone gave a man with
       seventy sessions who wants a 225 bench a set of push-ups, because push-ups
       sort before bench press. Three things decide it, in order:
         1. Something he already lifts. Familiar beats theoretically optimal, and
            it is the only way the load can come from history rather than a guess.
         2. Level as close to his as possible without going over, so a beginner
            gets the safe version and an intermediate does not get the baby one.
         3. On a main slot for a strength goal, how far the thing can be loaded,
            because a main lift you cannot add weight to is not a strength plan.
            See LOAD_PENALTY. It is a term and not a filter on purpose: where the
            library has nothing loadable at this level the bodyweight movement
            still wins its slot rather than the slot going empty.
         4. research/05, the conservative tie break: lower level wins a draw. */
    const known = new Set(historyNames);
    const rank = LEVEL_RANK[level] ?? 0;
    const wantsLoad = emphasis === "strength" && role === "main";
    return pool
      .map((e) => {
        const lv = LEVEL_RANK[e.level] ?? 0;
        return {
          e,
          score: (known.has(e.name.toLowerCase()) ? -100 : 0) + Math.abs(rank - lv) + (lv > rank ? 0.5 : 0)
            + (wantsLoad ? loadPenalty(e) : 0),
        };
      })
      .sort((x, y) => x.score - y.score || (LEVEL_RANK[x.e.level] ?? 0) - (LEVEL_RANK[y.e.level] ?? 0))
      .map((x) => x.e);
  };

  /* Never silently drop a slot. A missing hinge is a hole in the week, and the
     first run of this file dropped one without saying anything. */
  const exact = match(pattern !== "isolation");
  const ranked = exact.length ? exact : match(false);
  /* Lifts a plateau response rotated out of this week (engine/plateau-response.mjs).
     Same shape as a hard avoid below and the same rule: it filters the ranked
     pool and it never empties a slot, because a hole in the week is worse than
     a stalled lift appearing once more. When it cannot be honoured the excluded
     lift is still in the pool, which is how buildPlan knows the rotation was
     blocked and answers with the rep range instead. */
  const kept = exclude ? ranked.filter((e) => !exclude.has(e.name.toLowerCase())) : ranked;
  const pool = kept.length ? kept : ranked;
  /* research/07: what they swap away from and what they stop logging is a
     stronger signal than anything they could tell us. It is applied here, on
     the ranked pool, so a preference reorders the same candidates rather than
     reaching into the split, the sets or the load. */
  return applyPreferences(pool, preferences, prefBudget);
}

export function buildPlan({
  goal, person = {}, logs: rawLogs = [], plans = [], swaps = [], equipment = null, today = new Date(), priorityOverride = null,
  limits = null, avoid = [],
} = {}) {
  const { bodyWeightLb = null, sex = null, daysAsked = null, sessionMinutes = null } = person;

  /* A log row is an object or it is not a row. Eight passes in this file, plus
     load.mjs, training-age.mjs, calibrate.mjs and preferences.mjs, read fields
     off these rows, and every one of them guarding separately is eleven places
     to forget: `historyNames` below was the one that did, and it threw on a
     single `null` in the array. Filtered once here, at the door, so everything
     downstream inherits it.

     `adapter.mjs` does the same thing to a payload's rows on its way in. Not a
     duplicate: that is a different door. `buildPlan` is a public entry point
     with callers of its own (the sweep, the fuzz's direct channel, the tests),
     and a guard that only exists on the other side of the adapter is not a
     guard on this function. */
  const logs = Array.isArray(rawLogs)
    ? rawLogs.filter((l) => l && typeof l === "object" && !Array.isArray(l))
    : [];

  /* ---- who they are, measured not asked ---- */
  const trainingAge = deriveTrainingAge({ logs, today });
  const level = trainingAge.level;

  /* research/07: what was prescribed and what was logged are two tables that
     never meet, and joining them is the effort rating nobody will ever type in.
     Empty `plans` gives an empty map and every pass below behaves as it always
     did, which is the day one plan. */
  const calibration = calibrate({ plans, logs });

  /* research/07 again, the half of it nothing read until now: swaps taken and
     exercises quietly abandoned. Learned once for the whole week, because a
     preference is about a person and not about a Tuesday. Empty `swaps` and
     empty `plans` give an empty result and every pass below behaves exactly as
     it did before this existed. */
  const preferences = learnPreferences({ swaps, plans, logs, today });

  const resolved = resolveGoal({ ...goal, bodyWeightLb, sex, level, today });
  const P = resolved.params;

  /* ---- pass 1: structure ---- */
  const capacity = observedCapacity(trainingAge);
  const asked = daysAsked ?? P.minDays;
  let days = Math.min(P.maxDays, Math.max(P.minDays, asked));
  const dayNotes = [];
  /* The one input they can see being ignored. The weekly picker offers 2 to 6,
     no goal in the tree allows more than 5, and the sweep of 2026-09-10 found
     every six day ask silently answered with 5, 4 or 3 and no sentence about
     it, unlike the capacity shortening below which explains itself. Same
     voice, same place, so the number is a statement rather than a discrepancy.
     Whether a goal should allow six is a product question; saying what
     happened is not. */
  if (Number.isFinite(asked) && asked !== days) {
    dayNotes.push(asked > days
      ? `You asked for ${asked} days. This goal tops out at ${days}: more sessions than that and the recovery between them is what gives, so the week is ${days}.`
      : `You asked for ${asked} days. This goal needs at least ${days} to work, so the week is ${days}, with the extra kept short.`);
  }

  /* A second goal that changed nothing has to say so. The tap happened, the
     person believes it bought something, and the only thing worse than an app
     that refuses a second goal is one that accepts it and quietly builds the
     same plan. goal-engine.mjs decides what a secondary may contribute
     (priority groups, the mobility block, more cardio) and returns an empty
     `effect` for one that contributed none of the three, which is what a
     strength ask under a fat loss plan honestly comes to: rep ranges and rest
     belong to the primary and that goal had nothing else to give.

     The ids are not spelled out here on purpose. The engine has no label table
     and reading goal-tree.json is not available to it in Deno, so naming the
     goal would mean mirroring a third copy of the tree; the app already knows
     the labels and `meta.goals.secondary` carries the ids to pair them with. */
  const deadSecondary = (resolved.secondary || []).filter((s) => !s.effect.length);
  if (deadSecondary.length) {
    const which = resolved.secondary.length === 1
      ? "The second goal you picked"
      : `${deadSecondary.length} of the extra goals you picked`;
    dayNotes.push(`${which} changed nothing in this plan. Rep ranges, rest, session length and the `
      + `day count all come from your main goal, because two goals cannot set them at once. An `
      + `extra goal can only add priority muscles, mobility work or cardio on top, and there was `
      + `none of that to add.`);
  }
  if ((resolved.ignoredSecondary || []).length) {
    dayNotes.push(`${resolved.ignoredSecondary.length} of the goals you picked were not used at all: `
      + `${resolved.ignoredSecondary.map((s) => s.why).join(", ")}.`);
  }

  /* research/09 and open question 9: honour the number they asked for, because
     overriding a stated preference is the paternalism the product rule exists to
     prevent. Then make the sessions they are least likely to make small enough
     to be unmissable, and let the plan converge on what they really do without
     ever announcing that it did. */
  let shortFrom = null;
  if (capacity != null && capacity < days) {
    shortFrom = capacity;
    dayNotes.push(`You asked for ${days} days. Your logs say you have been doing about `
      + `${capacity}. Keeping ${days}, with the last ${days - capacity} kept short, because a `
      + `short session you do beats a full one you skip.`);
  }
  if (trainingAge.returning) {
    dayNotes.push(`Coming back after ${trainingAge.daysSinceLast} days off, so the first block `
      + `is lighter than where you left it. It comes back fast.`);
  }

  /* The week reacts only when two lifts agree, and it says why. A plan that
     quietly gets lighter reads as the app losing faith in you, so research/09's
     retention argument applies to the wording as much as to the number. */
  if (calibration.overall === "back-off") {
    dayNotes.push("Last week read as a struggle across several lifts, so this one is a touch lighter. "
      + "That is the plan working, not you failing.");
  } else if (calibration.overall === "push") {
    dayNotes.push("Everything landed last week. Loads are up.");
  }

  /* ---- pass 4's decision, taken here because it changes pass 2 ----
     `deriveTrainingAge` has always returned Jawa's `plateau` and nothing ever
     read it: the engine could name the lift that had not moved in six weeks and
     then hand back the same week regardless. This is where it gets an answer.
     It is a progression decision and it belongs to pass 4, but a rotation has to
     reach selection or it is only a sentence, so the call sits above pass 2 and
     the result is spoken further down with the rest of pass 4. */
  let plateauPlan = planPlateauResponse({
    plateau: trainingAge.plateau, level, calibration, goal: resolved,
  });
  const rotateOut = new Set(
    plateauPlan.responses.filter((r) => r.action === "rotate").map((r) => r.exercise.toLowerCase()),
  );
  /* Rotations the library could not afford. Filled during selection. */
  const rotateBlocked = new Set();

  /* ---- what hurts and what they do not own (engine/limits.mjs) ----
     Two answers from one optional onboarding screen, and they are not the same
     kind of answer, so they do not travel the same way.

     A painful joint is a judgement, so it goes down the `exclude` path the
     plateau rotation already uses: it filters the ranked pool and it never
     empties a slot, because a hole in the week is worse than one movement that
     is not ideal. Where it could not be honoured the exercise is still in the
     week, which is how the note below knows to say so out loud instead of
     claiming a limit was kept that was not.

     Missing equipment is a fact, so it narrows the `equipment` allow list this
     function has always taken, which is a hard filter with no fallback. That
     difference is deliberate. A bad shoulder can be worked around with a
     lighter version of something; a barbell somebody does not own cannot, and a
     plan that prescribes one is a plan they cannot do. Where that leaves a slot
     with nothing, the slot is dropped rather than filled with a lie: the
     library has no bodyweight biceps-primary movement at all, so a bodyweight
     only week honestly has no curl in it.

     The joint exclusion is computed once, over the same two libraries
     `candidates` draws from, because whether a movement loads a bad shoulder is
     a property of the movement and not of the slot it is being considered for.
     applyLimits' own softening cannot fire at that scale and is not meant to:
     it is there for a caller filtering one slot's pool, and it is what the per
     slot fallback inside `candidates` is doing in a rougher way here. */
  const limitsUsed = normalizeLimits(limits);
  const libraryPool = [];
  for (const lib of [WEIGHTS, CALIS]) for (const cat of lib.categories) for (const ex of cat.exercises) libraryPool.push(ex);
  const limitsRun = applyLimits({ pool: libraryPool, limits: limitsUsed });
  const limitExcluded = limitsRun.excluded.filter((e) => e.excluded !== false);
  const limitOut = new Set(limitExcluded.map((e) => e.name.toLowerCase()));
  const limitNotes = limitsSummary(limitsUsed);
  for (const say of limitNotes) dayNotes.push(say);

  const kitAllowed = allowedEquipment(limitsUsed);
  const kit = kitAllowed
    ? (equipment ? equipment.filter((e) => kitAllowed.includes(e)) : kitAllowed)
    : equipment;
  /* One set into the one `exclude` parameter, so there is still exactly one
     path into selection and the rotation and the limits cannot fight. */
  /* Movements the caller wants a different answer than. This engine is
     deterministic on purpose, so asking it for the same day twice returns the
     same day twice, which is right until somebody looks at their back day and
     wants a different back day. Handing back what they already have is not an
     answer. So "give me another one" is expressed as "not these", and the
     never-empty-a-slot fallback in `candidates` still applies: where the
     library has no alternative at this level the same movement comes back,
     which is honest rather than a hole in the week. */
  const avoidOut = new Set((Array.isArray(avoid) ? avoid : []).map((n) => String(n || "").toLowerCase()).filter(Boolean));
  const excludeOut = (limitOut.size || avoidOut.size)
    ? new Set([...rotateOut, ...limitOut, ...avoidOut])
    : rotateOut;

  /* ---- what the goal itself points away from (engine/goal-engine.mjs) ----
     A third exclusion, and it is a different kind again from the two above. A
     joint is the person's answer and a missing barbell is a fact about their
     room; this one is the goal's own note, read back. Two children in the tree
     write down what they train and the selector was handing them the opposite,
     because they prioritise abs and obliques and the library fills those slots
     with whatever ranks first. Fixing that is not a training opinion, it is
     making the plan agree with the goal it was built from.

     Hard, with no fallback, unlike `exclude`. The never-empty-a-slot rule is
     right for a rotation and for a sore shoulder, where the worst case is one
     movement that is not ideal; here the worst case is the movement the goal
     specifically pointed away from, arriving because nothing else fitted. So
     an unfillable slot is dropped and named in dayNotes instead, which is what
     this file does with every other uncomfortable number. */
  const goalBarred = barredMovements(P);
  for (const say of movementCautionNotes(P)) dayNotes.push(say);
  /* Slots the bar emptied, filled during selection and spoken after it. */
  const cautionEmpty = [];
  /* And slots that emptied because everything left in them is already on the
     same card. Same shape, different cause, so a different sentence. */
  const dedupeEmpty = [];

  const split = splitFor(days, level).slice(0, days);
  /* One lever, pulled once. A systemic volume cut is the same 0.85 that
     calibration's back-off already runs through `setsFor`, so it reuses that
     flag rather than adding a second multiplier beside it. plateau-response.mjs
     will not return volume-cut at all when calibration has already backed off,
     so these two can never both be true, and the week can never be cut twice. */
  const backOff = calibration.overall === "back-off" || plateauPlan.summary.action === "volume-cut";
  const baseSets = BASE_WEEKLY_SETS[level] * P.setsFactor;

  /* ---- pass 2: selection, the whole week before any set count ---- */
  /* Two passes rather than one, because the divisor in pass 3 has to be the
     number of times a group is really trained. Counting it off the slot table
     inflated it: a slot listing ["lats", "traps"] bumped both, one exercise came
     out of it, and every lat and trap movement in the week then got its weekly
     volume divided by a number too big. Count picks, not intentions. */
  const historyNames = [...new Set(logs.map((l) => String(l.exercise_name || "").toLowerCase()))];
  const usedThisWeek = new Map();
  /* Swaps are tracked apart from picks on purpose. Offered but not prescribed,
     so a swap must not consume a movement a later main slot needs, and equally
     the same alternative should not be the answer on Monday, Wednesday and
     Friday when the pool has others in it. */
  const swapsThisWeek = new Set();

  /* How much of this week the swap history is allowed to rewrite. Counted here
     rather than in preferences.mjs because the slot table is this file's
     knowledge and a share of the week is meaningless without it: a cap of three
     movements is most of a two day week and a tenth of a six day one. Opened
     before the first pick and spent as the week is built, so it is the same one
     counter for all of pass 2. See openWeekBudget. */
  const prefSlots = split.reduce(
    (n, [, key], i) => n + slotsForDay(key, shortFrom != null && i >= shortFrom).length, 0,
  );
  const prefBudget = openWeekBudget(preferences, { slots: prefSlots });

  const selected = split.map(([name, key], dayIndex) => {
    const isShort = shortFrom != null && dayIndex >= shortFrom;
    const usedToday = new Set();
    const slots = slotsForDay(key, isShort);

    /* The short day floor, counted on what was actually filled. Every main
       slot still runs; accessories are taken in order until the day has
       SHORT_DAY_MIN exercises, and a slot the library cannot fill does not
       spend one of those places. See slotsForDay. */
    let taken = 0;
    const picks = slots.map((slot) => {
      if (isShort && slot.role !== "main" && taken >= SHORT_DAY_MIN) return null;
      const args = { ...slot, level, equipment: kit, role: slot.role, historyNames, preferences, prefBudget, exclude: excludeOut, emphasis: P.emphasis };
      const pool = candidates({ ...args, barred: goalBarred });
      if (!pool.length) {
        /* Empty for want of equipment is an old and quiet case, handled by
           dropping the slot. Empty because of the goal's own bar is new and it
           is not allowed to be quiet: the person asked for core work, the week
           has none here, and the only wrong answer is saying nothing. Asked a
           second time without the bar, because that is the only way to tell
           the two causes apart, and it runs at most once per empty slot. */
        /* No budget on the diagnostic re-ask. This pool is thrown away after
           its length is read, and a week that spent a move on a slot it did not
           fill would be charged for nothing. */
        if (goalBarred.size && candidates({ ...args, prefBudget: null }).length) {
          cautionEmpty.push({ day: name, groups: slot.groups.join(" and ") });
        }
        return null;
      }
      /* Prefer something not already used this week, so a week of five days does
         not become the same four lifts five times. Then anything not already on
         today's card, and then nothing.
         The third fallback used to be `pool[0]`, which could be a movement
         already picked today, and a 50,017 case fuzz run found it: a bodyweight
         only week with a sore wrist leaves Dip as the whole triceps pool and as
         the whole chest pool, so the push day came back with Dip at 3x8 in the
         chest slot and Dip again at 3x12 four lines below it. That is not two
         exercises, it is one exercise the card is asking for twice at different
         rep counts, and no set count downstream can make sense of it. A slot
         with nothing left of its own is a slot the library cannot fill, which
         is a state this file already has an answer for. */
      const pick = pool.find((e) => !usedToday.has(e.name) && (usedThisWeek.get(e.name) || 0) === 0)
        || pool.find((e) => !usedToday.has(e.name))
        || null;
      if (!pick) { dedupeEmpty.push({ day: name, groups: slot.groups.join(" and ") }); return null; }
      /* A rotated lift that got picked anyway means excluding it would have left
         this slot with nothing. Recorded now, answered after selection. */
      if (rotateOut.has(pick.name.toLowerCase())) rotateBlocked.add(pick.name);
      const offPattern = patternFor(pick) !== slot.pattern && slot.pattern !== "isolation";
      usedToday.add(pick.name);
      taken++;
      usedThisWeek.set(pick.name, (usedThisWeek.get(pick.name) || 0) + 1);

      /* Every exercise needs a swap. The brief calls this a hard product
         requirement rather than a nice to have, and research/07 adds that the
         swap somebody actually uses is a pain signal worth recording.

         This used to be `pool.filter(...)[0]`: the next unused row of a pool
         ranked for choosing a MAIN lift, which is a different question and is
         how a swap could be materially easier or harder than the lift it stood
         in for. Now ranked by nearest stimulus, in alternatives.mjs. */
      const ranked = scoreAlternatives({
        exercise: pick, pool, level, equipment: kit, exclude: [...usedToday], count: 4,
      });
      const swap = ranked.find((a) => !swapsThisWeek.has(a.name)) || ranked[0] || null;
      if (swap) swapsThisWeek.add(swap.name);

      return {
        slot, pick, swap, offPattern,
        alternatives: ranked.slice(0, 3).map((a) => ({ name: a.name, why: a.why })),
      };
    }).filter(Boolean);

    return { name, key, isShort, picks };
  });

  /* The slots the goal's bar emptied, said out loud. Nothing silently replaced
     them, because the replacement would have been the movement the goal pointed
     away from, and a missing slot somebody has been told about beats a slot
     filled with the wrong thing. One sentence per day, not per slot, since two
     empty core slots on one day is still one thing that happened to that day. */
  for (const day of [...new Set(cautionEmpty.map((c) => c.day))]) {
    const groups = [...new Set(cautionEmpty.filter((c) => c.day === day).map((c) => c.groups))].join(", ");
    dayNotes.push(`${day} has no ${groups} exercise in it. At your level and with the equipment you have, `
      + `everything the library offers for that slot is the kind of movement this goal points away from, so `
      + `the slot is left out rather than filled with one of those. The work that would fill it is planks `
      + `and side planks, or a Pallof Press if you have a cable machine.`);
  }

  /* And the slots that emptied because the only movements left were already on
     the card. Said out loud for the same reason as everything else in here: a
     day that is one exercise shorter than its neighbours is a thing somebody
     will notice, and the choice between a short day and the same lift twice is
     one the plan should be seen making rather than making quietly. */
  for (const day of [...new Set(dedupeEmpty.map((c) => c.day))]) {
    const groups = [...new Set(dedupeEmpty.filter((c) => c.day === day).map((c) => c.groups))].join(", ");
    dayNotes.push(`${day} is a slot short. The only ${groups} movements left after your equipment and what `
      + `you said hurts were already on that card, and the same exercise twice in one session is not two `
      + `exercises. The day runs one movement lighter instead.`);
  }

  /* How often each group really gets hit, from what was picked, so weekly volume
     can be split across sessions rather than guessed per session. */
  /* The group an exercise counts toward is the slot's group it was chosen FOR,
     not whatever its library row lists first. An incline press qualifies for
     the shoulders isolation slot because shoulders is among its primaries, and
     recording primary[0] credited it to chest instead, so the slot's own
     group got nothing, the neighbour was over-counted, and a day could read as
     chest three times. The sweep of 2026-09-10 found that on 307 of 726 clean
     days. Same rule below in the week map, same helper, one answer. */
  const groupFor = (slot, pick) => (slot.groups || []).find((g) => (pick.primary || []).includes(g)) || (pick.primary || [])[0];
  const hits = {};
  for (const day of selected) {
    for (const { slot, pick } of day.picks) {
      const g = groupFor(slot, pick);
      if (g) hits[g] = (hits[g] || 0) + 1;
    }
  }

  /* ---- pass 3: sets, reps and load, now that the week is known ---- */
  /* Which slot an exercise came out of is needed twice after the week is built,
     by the weekly ledger and by the time budget, and both need to know a main
     from an accessory. It is not part of the shape the app consumes, so it is
     kept beside the week in a map keyed by the exercise object rather than
     added to it as a field nothing outside this file would read. */
  const roleOf = new Map();
  /* Which groups are pushed, and by how much. `priorityOverride` arrives from
     engine/focus.mjs as a tier map, `{ chest: 3, calves: 1 }`, and is also
     still accepted as the bare group list it used to be: the goal tree's own
     `P.priority` is one of those, and so is every caller written before tiers
     existed. A bare list is read at the middle tier, which is the flat 1.4x
     that list has always earned. Null means nobody merged anything and the goal
     decides, which is every call that existed before focus.mjs landed. */
  const tierMap = toTierMap(priorityOverride ?? P.priority);
  const tierFor = (group) => tierMap[group] || 0;
  const isPriority = (group) => tierFor(group) > 0;

  /* ---- how long they actually have ----
     `P.sessionMin` is the goal's answer to this and it is a considered number:
     a strength goal really does need the three minutes between heavy sets that
     make it 60. What it never was is a fact about this person's Tuesday. Mo,
     2026-09-12: "sometimes you put like five sets, six sets, whatever. But some
     people they wanna do more, or they wanna do less. So maybe we should also
     have it be where, how long are you wanting to work out for?"

     A stated answer REPLACES the goal's number rather than clamping it or
     averaging with it. It is the same class of input as a missing barbell: a
     fact about the world the plan has to build around, not an opinion the
     engine gets a vote on. What the goal keeps is everything else it sets, and
     that is the trade this makes visible: 25 minutes of a strength goal is
     still strength rep ranges and long rests, it is just fewer of them.

     Clamped to 15 and 120 because a slider can send anything, and said out loud
     when the clamp bites, on the same principle as the day count above: the
     number is a statement rather than a discrepancy.

     Null, absent, zero and nonsense all mean "never answered", the goal decides,
     and every line below behaves exactly as it did before this existed. That is
     load bearing rather than polite: the two passes that can touch a main lift,
     and the one that can shorten a rest, are all guarded on `askedMinutes`, so
     a plan built without it is the plan it was yesterday to the byte. */
  /* A boolean is excluded by hand because `Number(true)` is 1 and 1 is finite,
     so a client that sent `session_minutes: true` would have bought a 15 minute
     week off a value that means nothing. Every other junk shape (a string, an
     object, an array, a negative) already falls out as NaN or as a number the
     guard below rejects. */
  const rawAsked = typeof sessionMinutes === "boolean" ? NaN : Number(sessionMinutes);
  const askedMinutes = Number.isFinite(rawAsked) && rawAsked > 0
    ? Math.min(SESSION_MIN_CEILING, Math.max(SESSION_MIN_FLOOR, Math.round(rawAsked)))
    : null;
  if (askedMinutes !== null && askedMinutes !== Math.round(rawAsked)) {
    dayNotes.push(askedMinutes === SESSION_MIN_FLOOR
      ? `You asked for ${Math.round(rawAsked)} minutes a session. There is no session that short: four movements at `
        + `two sets and the shortest rest worth calling rest is about 25 minutes once the warm-up and cool-down are in, so the plan `
        + `is built for ${askedMinutes} and tells you when a day still runs over.`
      : `You asked for ${Math.round(rawAsked)} minutes a session. The plan is built for ${askedMinutes}, because past `
        + `that the limit stops being the clock and starts being what a week can recover from.`);
  }
  const sessionBudgetMin = askedMinutes ?? P.sessionMin;

  /* Filled by pass 3 below, spoken once after it. See the note at the call. */
  const cappedLoads = new Set();

  /* ---- the plateau answer that is a number and not only a sentence ----
     `rep-range` was the one response in plateau-response.mjs with nothing on the
     other end of it. The note went out saying "the lift stays and the reps
     change: 8 to 12 for this block instead of 3 to 6" and the day underneath it
     still said 3, because the reps came off `P.repRange` and nothing read the
     response. A promise in a sentence and a contradiction in the prescription is
     worse than never having made the promise.

     Applied here, at prescription time, rather than in a tidy pass at the end,
     because reps and load are one decision and not two: `prescribeLoad` takes
     the rep count and works the weight back from it, so eight reps at the
     three rep weight would be a HARDER week wearing the note of a lighter one,
     which is the opposite of what a stalled lifter is being offered.

     Both sources of the answer are already known by now. `planPlateauResponse`
     decided some of them above, and a rotation the library could not afford
     becomes a rep-range answer too: `rotateBlocked` was filled during selection,
     and `applyRotateFallback` further down turns exactly that set of rotates
     into rep-range responses, so this map is the same set it will produce and
     not a guess at it. Mains take the low end and accessories the high end, the
     same convention the goal's own range is read with one line below. */
  const repRangeFor = new Map();
  {
    const shifted = repShiftFor(resolved).to;
    for (const r of plateauPlan.responses) {
      if (r.action === "rep-range") repRangeFor.set(r.exercise.toLowerCase(), shifted);
    }
    for (const name of rotateBlocked) repRangeFor.set(name.toLowerCase(), shifted);
  }

  const week = selected.map(({ name, key, isShort, picks }) => {
    const exercises = picks.map(({ slot, pick, swap, alternatives, offPattern }) => {
      const group = groupFor(slot, pick);
      /* The goal is not the only thing that can name a priority group. When the
         caller has merged the user's own body-map focus in (engine/focus.mjs),
         that merged list arrives as priorityOverride and stands in for the
         goal's. Null means nobody merged anything and the goal decides, which
         is every call that existed before this line. */
      const tier = tierFor(group);
      const priority = tier > 0;
      const isMain = slot.role === "main";
      const full = setsFor({
        base: baseSets, hitCount: hits[group] || 1, tier,
        ceiling: WEEKLY_MRV[group] ?? Infinity,
      });
      /* A short day is the session they were least likely to make, so it stays
         small however the multipliers landed. */
      const sets = isShort ? SHORT_DAY_SETS : full;
      const repRange = repRangeFor.get(pick.name.toLowerCase()) || P.repRange;
      const reps = isMain ? repRange[0] : repRange[1];

      const load = prescribeLoad({
        exercise: pick, reps, bodyWeightLb, sex, level, logs, returning: trainingAge.returning,
        calibration: calibration.byExercise,
      });
      /* load.mjs caps a guess that extrapolated past what the person's size and
         level can support: one logged 200 lb Goblet Squat was producing an 870
         lb Leg Press. The cap already writes the reason into the exercise's own
         note, and `capped` rides back specifically so the week can say it once
         out loud as well, because a number on a card is read and a note under
         it often is not. Collected here, spoken below with the rest of pass 3. */
      if (load.capped) cappedLoads.add(pick.name);

      const exercise = {
        name: pick.name, group, equipment: pick.equipment, sets, reps,
        restSec: isMain ? P.restSec : Math.round(P.restSec * 0.7),
        weight: load.weight, loadBasis: load.basis, loadNote: load.note,
        /* `swap` stays a bare string, because everything already reading it
           expects one. `alternatives` is the same answer with its reasons
           attached and two more options behind it. */
        swap: swap ? swap.name : null,
        alternatives,
        /* Two fields for one fact, because two things read it. `priority` is the
           boolean every trim in this file already guards on, and it is true at
           every tier: a green lift is still a lift somebody asked for, and the
           time trim must not delete it (the sweep of 2026-09-10, "asking for a
           focus deleted that group's work"). `focusTier` is how badly, for the
           two places that need to tell a red from a green. */
        priority,
        focusTier: tier,
        /* Said out loud rather than hidden: this slot wanted a movement pattern
           the library could not supply at this level. */
        note: offPattern ? `Standing in for a ${slot.pattern} movement; the library has none at this level.` : null,
      };
      roleOf.set(exercise, slot.role);
      return exercise;
    });

    return {
      name, focus: key, short: isShort,
      /* The budget is the person's when they named one and the goal's when they
         did not. A short day is still six tenths of it: a short day is the
         session they were least likely to make, and that is as true of a 90
         minute answer as of a 45 minute goal. */
      minutes: isShort ? Math.round(sessionBudgetMin * 0.6) : sessionBudgetMin,
      /* Five minutes of cool-down are charged against a clock somebody named
         and against nothing else, because `P.sessionMin` never contained them.
         See COOLDOWN_MIN. */
      clockReserve: askedMinutes === null ? 0 : COOLDOWN_MIN,
      /* Filled in below, once the sets have stopped moving. Declared here so the
         key is on every day whatever the trimming does. */
      estimatedMinutes: null,
      /* What this day is actually FOR, muscle-wise, so the adapter can tell a
         Push day apart from a Leg day without knowing SLOTS exists. Read by
         engine/recovery.mjs on the way to nextDayIndex, so regenerating skips
         a day whose defining muscles were trained within the last day rather
         than handing back the same muscles the Body tab is, right now, saying
         to leave alone. */
      mainGroups: [...mainGroupsForDay(SLOTS[key])],
      /* The movement patterns this day is built out of, in slot order. Muscle
         groups alone cannot tell a squat day from a leg press day, and the
         warm-up for the two is not the same: one needs ankles and hip flexors
         under load, the other does not. engine/mobility.mjs reads this to pick
         preparation for the movements rather than for the muscles, which is
         research/13 and the difference Mo asked for. Mains first, because a
         warm-up that prepares the accessories and not the main lift has the
         priority backwards. */
      mainPatterns: [...new Set(SLOTS[key].filter((s) => s.role === "main").map((s) => s.pattern))],
      allPatterns: [...new Set(SLOTS[key].map((s) => s.pattern))],
      exercises,
    };
  });

  /* ---- the week's own ledger, read after the week exists ----
     Wave 1 finding 1, from the bake-off: Jawa's `buildWeekPlan` carries a
     running `weeklyVolumeByCategory` from day to day, so day four knows what
     days one to three actually spent. Ours divided a weekly target by how often
     a group is hit and then never looked again, which is an assumption rather
     than a ledger: the [2, 6] clamp, the priority multiplier and the rounding
     all move the real total away from the target and nothing noticed.
     Hers threads the ledger forward while choosing; ours cannot, because pass 2
     has to finish before pass 3 knows a divisor at all (see `hits` above). So
     the ledger is read at the end instead, and the correction lands on the LATER
     days, which is the same direction her loop corrects in: the days furthest
     from being decided are the ones that give the sets back.
     Accessories only. A main movement is the reason the day exists. */
  /* What the LEVEL asks for, before the week is allowed to argue with it. This
     is the number BASE_WEEKLY_SETS and the focus multiplier between them come
     to, and it is still the number every set count is divided out of in
     `setsFor`. It is kept separate from the target below because the two mean
     different things now and the ledger reports both. */
  const wantedFor = (group) =>
    Math.min(baseSets * PRIORITY_MULTIPLIER[tierFor(group)], WEEKLY_MRV[group] ?? Infinity);

  /* What this week could spend on a group if every one of its exercises ran at
     the top of the clamp. A group the split touches once cannot be handed more
     than MAX_SETS_PER_SESSION however loudly the level asks, and a short day
     cannot be handed more than SHORT_DAY_SETS, so this is the ceiling the plan
     is physically built out of rather than an opinion about training.

     Counted off the week rather than off `hits`, because the time trim can drop
     an accessory after `hits` was taken and a group that lost its only
     accessory to the clock really can deliver less this week. */
  const deliverableFor = (group) => {
    let cap = 0;
    for (const d of week) {
      for (const e of d.exercises) {
        if (e.group === group) cap += d.short ? SHORT_DAY_SETS : MAX_SETS_PER_SESSION;
      }
    }
    return cap;
  };

  /* The target the week is actually held to, and the finding-1 fix. It used to
     be `wantedFor` alone, which asked a three day Push/Pull/Legs week for 14
     triceps sets out of one triceps slot that tops out at 6, and then filed the
     8 set gap as the plan's fault. The sweep measured that as 71% of every
     intermediate group and 78% of every advanced one landing under 0.8 of
     target, with nothing anywhere overshooting: a ledger that is wrong in one
     direction only is not measuring, it is subtracting a constant.

     knowledge/principles/volume-landmarks.md is explicit that the weekly number
     is not a property of the lifter alone: "a new trainee or someone training
     2-3 days/week should sit near MEV-to-low-MAV per muscle", and "someone
     training hard 4-6 days/week with a real history can run mid-to-high MAV".
     BASE_WEEKLY_SETS reads level and never read frequency, so an advanced
     lifter on three days a week was being handed the 4-6 day number. Capping
     the target at what the split can deliver is that sentence, applied per
     group instead of per person, since frequency is a per-group fact: the same
     three day week hits lats four times and forearms once.

     This changes no prescription. `setsFor` still divides `wantedFor` and still
     clamps, so the sets on the card are the sets that were there yesterday.
     What changes is what the plan claims it was aiming at, and the gap between
     the two is now said out loud in `volumeNotes.frequencyCapped` rather than
     shown as a shortfall the week could have closed and did not. */
  const weeklyTargetFor = (group) => Math.min(wantedFor(group), deliverableFor(group));
  const plannedByGroup = () => {
    const totals = {};
    for (const d of week) for (const e of d.exercises) totals[e.group] = (totals[e.group] || 0) + e.sets;
    return totals;
  };
  const volumeTrimmed = [];
  for (const [group, planned] of Object.entries(plannedByGroup())) {
    /* Whole sets only, so the loops stop at `>= 1` rather than at `> 0`. The
       target is fractional (a base of 6.4 times a 1.4 priority is 8.96) and
       chasing the last 0.04 of a set takes a whole one, which is how a
       correction of one set became a correction of two on the first run of
       this. A fraction of a set over is not over. */
    let excess = planned - weeklyTargetFor(group) - VOLUME_SLACK;
    if (excess < 1) continue;
    const before = planned;
    for (let i = week.length - 1; i >= 0 && excess >= 1; i--) {
      for (const e of week[i].exercises) {
        if (excess < 1) break;
        if (e.group !== group || roleOf.get(e) !== "accessory") continue;
        while (e.sets > 2 && excess >= 1) { e.sets -= 1; excess -= 1; }
      }
    }
    const after = plannedByGroup()[group];
    if (after < before) {
      volumeTrimmed.push({
        group, target: +weeklyTargetFor(group).toFixed(1), from: before, to: after,
        why: `${group} was ${+(before - weeklyTargetFor(group)).toFixed(1)} sets over its weekly target, so the later days give some back.`,
      });
    }
  }

  /* Priority is settled after the ledger, not before it, because a trim can take
     a set off a priority accessory and put a day back the wrong way round. */
  for (const d of week) enforcePriorityFloor(d.exercises);

  /* ---- the time budget, which is the last thing that can change a day ----
     Wave 1 finding 3: Jawa's `sessionCapacity` turns minutes into an exercise
     count before anything is chosen. Ours fixes the count in the slot table and
     then reported the minutes afterwards, which is the same arithmetic run
     backwards, and it was not even run: `P.sessionMin` reached the display and
     nothing else, so a strength day of six lifts at six sets and three minutes
     of rest was printed as "~60 min" over something closer to two hours.
     Backwards is the right way round for this engine, because the slots are the
     argument and a movement pattern is not negotiable for a rounding of time.
     So the count is still decided by the split, the minutes are estimated from
     what was really prescribed, and only the tail accessories go when it will
     not fit. Four exercises is the floor and a main lift never goes.

     Two levers, gentlest first, because the round three version had only the
     blunt one and it ran out of road: the demo's intermediate Lower body A came
     to 73 minutes against a 60 minute budget, 22% over, with the loop stopping
     because the day was already at four exercises. It was sitting on a
     Single-Leg Calf Raise at 6 sets. Taking a set off a tail accessory is a
     smaller thing to do to somebody's session than taking the movement away, so
     sets come down to the floor of two first and only then does a movement go.
     Only non-priority accessories are shaved, so the per session priority
     guarantee settled above cannot be undone from here. A day that is still
     over after both levers is a day of long-rested main lifts, and it says the
     honest number rather than the budget it was asked for. */
  /* The capped guesses, said once. The number on the card is a ceiling rather
     than a prescription and the person is the only one who can correct it, so
     the ask is explicit: change it. Named rather than counted, because "one of
     your weights was held back" sends somebody hunting through the week. */
  if (cappedLoads.size) {
    const names = [...cappedLoads];
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    dayNotes.push(`The starting weight on ${list} is a guess held back on purpose. It was worked out from very little `
      + `history on a different movement and it came out higher than your size and level support, so it is capped `
      + `rather than shown as it calculated. Treat it as a starting point and change it to what you can actually do: `
      + `one logged session replaces the guess entirely.`);
  }

  /* ---- ramp-up sets, decided before the clock rather than by it ----
     research/13 section 5, and see RAMP_TABLE for the evidence and the rule for
     what counts as heavy. This runs here, after the loads are prescribed and
     before a single trim, for two reasons. The ramp is read off the working
     weight and the working reps, both of which are final by now and neither of
     which any trim below moves. And it has to be costed before the trims run,
     because a warm-up the session estimate cannot see is the exact bug the
     comment on `WARMUP_MIN` was written about: minutes the person spends that
     the number on the screen does not.

     So `prepMinutesFor` folds it into what the day reserves, the general block
     shrinks from six minutes to four on a ramped day (mobility.mjs
     RAMPED_WARMUP_SECONDS), and every estimate below reserves the sum. The net
     is one to three minutes a day, not four, and the trims see all of it. */
  const ramped = [];
  for (const d of week) {
    d.rampSets = rampsForDay(d.exercises, roleOf);
    d.rampMinutes = Math.round((d.rampSets.reduce((t, r) => t + r.seconds, 0)) / 60);
    d.prepMinutes = prepMinutesFor(d);
    for (const r of d.rampSets) ramped.push({ day: d.name, exercise: r.exercise, sets: r.sets.length, seconds: r.seconds });
  }

  /* Said once for the week, because a ramp is now normal rather than something
     spare minutes bought, and because it is new on every existing plan: the
     first thing a person will notice is sets on their card that are not work.
     The sentence has to answer "why is there a set of the empty bar on here"
     and "does this count", in that order. */
  if (ramped.length) {
    const heaviest = ramped[0];
    dayNotes.push(`Your main lift now starts with ${heaviest.sets} ramp-up sets, light sets working up to the weight on `
      + `the card rather than meeting it cold. ${heaviest.exercise} is the first one. They are not work: they are not `
      + `logged, they do not count toward your week, and the weight you are aiming at has not changed. The stretching `
      + `before the session is shorter to make room, which is the trade on purpose. A general stretch does not prepare `
      + `a heavy lift and light sets of the lift itself do.`);
  }

  const timeTrimmed = [];
  const restCompressed = [];
  const lastIndex = (list, ok) => { for (let i = list.length - 1; i >= 0; i--) if (ok(list[i], i)) return i; return -1; };
  for (const d of week) {
    let estimate = estimateMinutes(d.exercises, d.prepMinutes);
    const overBudget = () => overClock(estimate, d);
    while (overBudget()) {
      const shave = lastIndex(d.exercises, (e) => roleOf.get(e) === "accessory" && !e.priority && e.sets > SHORT_DAY_SETS);
      if (shave >= 0) {
        d.exercises[shave].sets -= 1;
        estimate = estimateMinutes(d.exercises, d.prepMinutes);
        continue;
      }
      if (d.exercises.length <= SHORT_DAY_MIN) break;
      /* The sweep of 2026-09-10 caught this lever undoing the one above it:
         "Only non-priority accessories are shaved" was true of the sets lever
         and false of the drop lever four lines below it, so asking for arms on
         a tight strength day pushed both arm lifts to five sets, crossed the
         budget, and this line deleted the triceps work from the week. Weekly
         triceps went 8 sets to 0 because somebody asked for more of it. A
         priority accessory is never the thing that goes; a day with nothing
         else to drop says its honest number instead. */
      const last = lastIndex(d.exercises, (e) => roleOf.get(e) === "accessory" && !e.priority);
      if (last < 0) break;
      timeTrimmed.push({ day: d.name, dropped: d.exercises[last].name });
      d.exercises.splice(last, 1);
      estimate = estimateMinutes(d.exercises, d.prepMinutes);
    }

    /* ---- the third lever, and it exists only when the person named the clock ----
       Everything above this line refuses to touch a main lift, and the reasoning
       is still right for the budget it was written against: `P.sessionMin` is
       the engine's own estimate of how long this goal takes, and an estimate has
       no business deleting sets off the movement the day is built around.

       A stated session length is a different kind of number. Somebody with 25
       minutes has 25 minutes, and the two answers available are a session that
       fits and a session that does not. So when, and only when, they told us,
       the clock is allowed to take sets off a main, down to MAIN_SETS_FLOOR.

       Largest first, one set at a time, which is an even haircut rather than one
       movement being gutted: it never takes a lift below a lift that had fewer
       sets than it, so the relative emphasis the whole file spent four passes
       building survives the trim, and the priority floor survives with it. A
       priority lift gets the main floor too, not the accessory one, so shaving
       cannot walk a focused group down under an unfocused one, which is the
       2026-09-10 bug in a new place. `enforcePriorityFloor` runs again after,
       because it only ever lowers sets and a guarantee worth stating is worth
       re-checking rather than reasoned about. */
    if (askedMinutes !== null) {
      const setsFloor = (e) => (roleOf.get(e) === "main" || e.priority ? MAIN_SETS_FLOOR : SHORT_DAY_SETS);
      while (overBudget()) {
        let pick = -1;
        for (let i = 0; i < d.exercises.length; i++) {
          const e = d.exercises[i];
          if (e.sets <= setsFloor(e)) continue;
          if (pick < 0 || e.sets >= d.exercises[pick].sets) pick = i;
        }
        if (pick < 0) break;
        d.exercises[pick].sets -= 1;
        estimate = estimateMinutes(d.exercises, d.prepMinutes);
      }
      enforcePriorityFloor(d.exercises);
      estimate = estimateMinutes(d.exercises, d.prepMinutes);

      /* ---- and the fourth, which costs the goal something and says so ----
         Rest is last because it is the only lever that changes what a set is
         worth instead of how many of them there are. knowledge/ prescribes the
         interval per goal for a reason: three minutes between heavy triples is
         the difference between a strength set and a hard set. Cutting it buys
         minutes at the price of the thing the goal was for, so it runs only
         after every set that could come off has come off, it stops at 60% of
         what was prescribed and never under 45 seconds, and it is the one trim
         in this file that always produces a sentence. Never upward: a floor
         that raised an accessory's 42 second rest to 45 would be this pass
         spending time rather than saving it. */
      if (overBudget()) {
        const restBefore = d.exercises.map((e) => e.restSec);
        let factor = 1;
        while (factor > REST_FLOOR_FACTOR + 1e-9 && overBudget()) {
          factor = Math.max(REST_FLOOR_FACTOR, +(factor - 0.05).toFixed(2));
          d.exercises.forEach((e, i) => {
            e.restSec = Math.min(restBefore[i], Math.max(REST_FLOOR_SEC, Math.round(restBefore[i] * factor)));
          });
          estimate = estimateMinutes(d.exercises, d.prepMinutes);
        }
        const from = Math.max(...restBefore);
        const to = Math.max(...d.exercises.map((e) => e.restSec));
        /* `restBefore` rides along, because the fill pass below may be able to
           hand some of this back and cannot do it from two summary numbers. */
        if (to < from) restCompressed.push({ day: d.name, fromSec: from, toSec: to, factor, startFactor: factor, before: restBefore, d });
      }
    }

    d.estimatedMinutes = estimate;
  }

  /* The rest sentence used to be said here. It is said after the fill pass now,
     because the back-off below can free the minutes the compression was taken to
     buy, and a plan that tells somebody their rest is short while handing them
     the full interval is the plan saying one thing and doing another.

     ---- the other direction: more time should mean more work ----
     "Some people they wanna do more." A budget bigger than the plan needs is
     slack today, and slack is not a plan. So the extra minutes buy sets, and
     they buy them where the week's own ledger already says there is room: a
     group under its weekly target that has an accessory slot below the session
     clamp. `volumeNotes.under` has been reporting exactly that list since it
     was written, with a comment saying it would be acted on "when there is a
     caller". This is the caller.

     What it will NOT do is more interesting than what it will. It adds no
     exercise and no main movement, because the slot table is the argument of
     this whole file and a spare fifteen minutes is not a reason to put two
     lifts on the same muscle. And it never crosses `weeklyTargetFor` plus the
     same VOLUME_SLACK the over-trim uses, which is itself capped at the group's
     MRV, so more time can approach what the research supports and can never
     pass it. A budget that cannot be spent inside those two rules is handed
     back with a sentence rather than filled with junk sets.

     Skips short days: a short day is deliberately small and topping it up with
     the extra time would delete the only thing that makes it short. */
  const timeAdded = new Map();
  if (askedMinutes !== null) {
    for (const d of week) {
      if (d.short) continue;
      /* Unfocused lifts may not climb past the priority floor's ceiling, which
         is the smallest set count among the day's focused lifts. Same guarantee
         `enforcePriorityFloor` makes, enforced before the fact rather than
         undone after it, since undoing it would hand back minutes already
         counted as spent. */
      const focused = d.exercises.filter((e) => e.focusTier >= TIERS.secondary);
      const floorCeiling = focused.length ? Math.min(...focused.map((e) => e.sets)) : Infinity;
      for (;;) {
        const totals = plannedByGroup();
        let best = null;
        let bestGap = 0;
        for (const e of d.exercises) {
          if (e.sets >= MAX_SETS_PER_SESSION) continue;
          if (!e.focusTier && e.sets + 1 > floorCeiling) continue;
          const ceiling = Math.min(weeklyTargetFor(e.group) + VOLUME_SLACK, WEEKLY_MRV[e.group] ?? Infinity);
          const gap = ceiling - (totals[e.group] || 0);
          if (gap < 1) continue;
          if (!best || gap > bestGap) { best = e; bestGap = gap; }
        }
        if (!best) break;
        best.sets += 1;
        if (overClock(estimateMinutes(d.exercises, d.prepMinutes), d)) { best.sets -= 1; break; }
        timeAdded.set(`${d.name}|${best.name}`, { day: d.name, exercise: best.name, group: best.group, to: best.sets });
      }
      d.estimatedMinutes = estimateMinutes(d.exercises, d.prepMinutes);
    }
  }

  /* ---- the back-off, last, because a back-off has to be the last word ----
     Everything above this line decides how big the week is. This decides how
     much of it comes off, and it runs after all of them for the reason spelled
     out at `setsFor`: while the cut lived in pass 2 it was in front of the
     volume ledger, the clock and the time top-up, none of which knows a
     back-off is in force, and all three could hand back more than it took.
     Running it here makes the calibrated week an exact subtraction from the
     uncalibrated one, which is the property the note in dayNotes is claiming on
     the user's behalf and the property the sweep asserts.

     The priority floor is re-run after, for the same reason the clock re-runs
     it: `enforcePriorityFloor` only ever lowers sets, so re-checking it costs
     nothing and a guarantee worth stating is worth checking rather than
     reasoned about. The minutes are re-estimated because the day genuinely got
     shorter, and a back-off week that still prints the long week's number would
     be the plan saying one thing and doing another. What it deliberately does
     NOT do is give the freed minutes back to the top-up above: those minutes
     are the back-off. */
  if (backOff) {
    for (const d of week) {
      for (const e of d.exercises) e.sets = easeSets(e.sets, roleOf.get(e) === "main");
      enforcePriorityFloor(d.exercises);
      d.estimatedMinutes = estimateMinutes(d.exercises, d.prepMinutes);
    }
  }

  /* Now that the minutes have stopped moving, the second main can have its rung
     on any day with room for it. Before the surplus pass below, because a rung
     on the lift is worth more than five more minutes of stretching. */
  addSecondMainRamps(week, roleOf);

  /* ---- what the extra minutes buy when they cannot buy sets ----
     The fill pass above stops at the weekly ceiling, and past that point every
     further minute is one the engine used to hand back with a sentence. That
     sentence is right about volume and wrong about the clock: a 90 minute chip
     that produces a 29 minute plan is the dead "main focus" dropdown wearing an
     explanation. So the surplus buys the three things that cost no recovery, in
     the order of what they are worth.

     Ceilings first, because both of them matter. The surplus is measured against
     `d.minutes` flat, with no TIME_TOLERANCE: the fill pass is allowed its 15%
     overshoot because a set is indivisible and half a set is not a thing, while
     everything here is discretionary and spending a person past the clock they
     named to give them something they did not ask for is the wrong mistake. And
     the five minutes of cool-down are counted against the clock even though
     `estimatedMinutes` has never included them, because the person named how
     long they are in the gym, not how long the middle of it is.

     Short days are skipped for the same reason the fill pass skips them: a short
     day is deliberately the session they were least likely to make, and topping
     it up deletes the only thing that made it short.

     1. REST. If the clock compressed rest below what the goal prescribes, the
        minutes go back there first, because that is repaying a debt the engine
        announced taking on rather than buying something new. This can only ever
        fire on a back-off week: compression happens exactly when a day is over
        budget, so a day cannot be both compressed and roomy at the same moment.
        What makes it real is the back-off below the compression, which takes
        sets off afterwards and leaves the short rest in place. Measured across
        the sweep, and the count is in the report.
     2. A LONGER COOL-DOWN, not a longer warm-up. The engine's old sentence
        offered "a longer warm-up" and research/13 is against it: McGowan 2015
        has a long warm-up costing performance through accumulated fatigue, Behm
        2016 has the range it buys expiring inside thirty minutes, and Oliva 2026
        has general mobility work costing peak force outright. The cool-down is
        the opposite case. Van Hooren 2018 finds it does not help recovery and
        does not cost anything either, and the 2024 Sports Medicine
        meta-regression puts the range-of-motion plateau at four minutes a
        session, which five minutes barely clears and ten comfortably does. So
        the extra time grows the block that is free and leaves alone the block
        that is not.

     RAMP-UP SETS WERE ITEM 2 HERE FOR ONE DAY AND ARE NOT ANY MORE. Buying them
     with spare minutes meant the person research/13 is actually describing, an
     advanced lifter working up to a heavy low-rep main, got none of them,
     because that person is already over the session length they asked for. A
     ramp is part of warming up, not a luxury a long clock affords, so it is
     decided by the lifts up at the ramp pass and costed inside the budget like
     any other warm-up minute.

     What is NOT here is optional accessory work, and the reason is the ledger
     rather than a worry. A surplus only survives the fill pass when the fill
     pass could find no group under its ceiling, so by construction there is no
     room left under MRV at the moment this code runs; anything optional added
     here would be volume past the ceiling the whole file exists to respect the
     moment somebody actually did it. Adding a movement instead would break the
     slot table for the same spare fifteen minutes the fill pass already refuses
     to spend that way. And the calibration hazard is real on top of both: a
     prescribed lift that a person reasonably skips reads to calibrate.mjs as a
     shortfall and backs their weights off next week, which would punish them for
     taking the optional extra. Three reasons, one answer. */
  const timeBought = [];
  if (askedMinutes !== null) {
    const compressedOf = new Map(restCompressed.map((r) => [r.d, r]));
    for (const d of week) {
      /* 1. rest, back up the same 0.05 ladder it came down, against the same
         ceiling it came down to meet. Not the tighter one the two purchases
         below use: the debt was taken to fit `d.minutes * TIME_TOLERANCE` with
         no cool-down reserved, so repaying it against a stricter number would
         make the engine unable to give back what it just took. And this runs on
         a short day too, where the purchases do not: a short day is kept small
         on purpose, and restoring the rest between its sets does not make it
         bigger, it makes the sets it already has count. */
      const rc = compressedOf.get(d);
      if (rc) {
        let factor = rc.factor;
        const setRest = (f) => d.exercises.forEach((e, i) => {
          e.restSec = Math.min(rc.before[i], Math.max(REST_FLOOR_SEC, Math.round(rc.before[i] * f)));
        });
        while (factor < 1 - 1e-9) {
          const next = Math.min(1, +(factor + 0.05).toFixed(2));
          setRest(next);
          const est = estimateMinutes(d.exercises, d.prepMinutes);
          /* One step too far is undone rather than accepted. */
          if (overClock(est, d)) { setRest(factor); break; }
          d.estimatedMinutes = est;
          factor = next;
        }
        rc.factor = factor;
        rc.toSec = Math.max(...d.exercises.map((e) => e.restSec));
        rc.repaid = rc.toSec >= rc.fromSec;
        if (factor > rc.startFactor) {
          timeBought.push({ day: d.name, bought: "rest", toSec: rc.toSec, minutes: 0 });
        }
      }

      if (d.short) continue;
      /* The nominal cool-down, not the measured one: the block is picked after
         this pass, so five minutes is what the clock can know here. Reserved
         because the person named how long they are in the gym, not how long the
         middle of it is, and unlike the repayment above these are additions. */
      const cooldownMin = Math.round(COOLDOWN_SECONDS / 60);
      /* `estimatedMinutes` already carries the ramp, because `prepMinutes` is
         inside it, so there is nothing to subtract for it here. */
      const spare = () => d.minutes - d.estimatedMinutes - cooldownMin - (d.longCooldown ? 5 : 0);
      if (spare() <= 0) continue;

      /* 2. the ten minute block, all or nothing: half of it is the five it
         already had. `mobilityFor` reads this flag below. */
      if (!resolved.mobilityChild && spare() >= 5) {
        d.longCooldown = true;
        timeBought.push({ day: d.name, bought: "cooldown", minutes: 5 });
      }
    }
  }

  /* Said once for the week rather than once a day, because it is the same
     decision on every day and three copies of it is a scold. Entries the fill
     pass paid back in full drop out: rest that is back where the goal wanted it
     is not a cost to report. */
  const restStillShort = restCompressed.filter((r) => !r.repaid);
  if (restStillShort.length) {
    const worst = restStillShort.reduce((a, b) => (b.toSec / b.fromSec < a.toSec / a.fromSec ? b : a));
    dayNotes.push(`To fit the ${sessionBudgetMin} minutes you asked for, the rest between sets came down from `
      + `${clock(worst.fromSec)} to ${clock(worst.toSec)}${restStillShort.length > 1 ? ` on ${restStillShort.length} days` : ` on ${worst.day}`}. `
      + `That is less recovery than this goal asks for, and it is a real cost rather than a rounding: the last sets `
      + `will feel harder and the heaviest work will climb more slowly. Sets came off first and this is what was left. `
      + `If you ever have the longer session, take it.`);
  }
  const restRepaid = restCompressed.filter((r) => r.repaid);
  if (restRepaid.length) {
    dayNotes.push(`The rest between sets is back to the full ${clock(restRepaid[0].fromSec)} on `
      + `${restRepaid.length === 1 ? restRepaid[0].day : `${restRepaid.length} days`}. It was cut to fit the clock, and this `
      + `week is lighter, so the minutes it cost went back into it. Full rest is what makes a heavy set heavy.`);
  }

  /* What the extras bought, in the voice of the sentence they replaced. Said
     once for the week, listing the kinds rather than every day, because the
     answer is the same on every day it fired. */
  const cools = timeBought.filter((t) => t.bought === "cooldown");
  if (cools.length) {
    dayNotes.push(`You asked for ${askedMinutes} minutes and the training itself needs less than that. The extra did not `
      + `become more hard sets, because more than this is past what your week recovers from. It bought a ten minute `
      + `stretching block after instead of five, which is the one thing more of reliably gives you something: range of `
      + `motion over weeks. It does not count as a set and it is not logged.`);
  }

  /* A budget nothing could spend. Worth a sentence for the same reason the
     over-budget day gets one: they answered a question and the answer moved
     nothing, and an app that quietly pockets the answer is the dead "main
     focus" dropdown. Only when they asked for MORE than the goal wanted, since
     below that the budget is doing plenty.

     The ramp minutes are already inside `estimatedMinutes`, because a ramp is
     warm-up and the warm-up has always been inside it. The cool-down still is
     not, for the same reason it never was: it sits on top and `totalMinutes` is
     where the two are added. And the old closing advice, "spend the rest on a
     longer warm-up", is gone: research/13 says a longer warm-up costs
     performance, so the engine should not have been recommending one. */
  const longestDay = week.reduce((m, d) => Math.max(m, d.estimatedMinutes + COOLDOWN_MIN), 0);
  if (askedMinutes !== null && askedMinutes > P.sessionMin && longestDay < askedMinutes * 0.8) {
    dayNotes.push(`You have ${askedMinutes} minutes and the longest day here needs about ${longestDay}. That is not the `
      + `plan being lazy: more sets than this is past what your level recovers from in a week, and volume you cannot `
      + `recover from is not training. Everything that could be bought without costing you recovery already has been. `
      + `Spend what is left on a walk, or take it back.`);
  }

  /* And when neither lever was enough, the day says so instead of leaving the
     number to be noticed. This is a real state, not a rounding: an advanced
     lifter on the no-time goal gets four main movements at six sets, which is
     47 minutes against the 25 they asked for, and there is nothing here that
     can honestly fix it. Trimming a main would take the movement pattern the
     day exists for, and shaving a main's sets is the back-off lever, which
     belongs to calibration and the plateau response rather than to a clock.
     Measured across 3816 days of goal, day count and history combinations: 90
     stay over, every one of them a day whose accessories are gone or at the
     floor. Named, so the number is a statement rather than a discrepancy.

     When they named the clock themselves, three more levers ran and the
     sentence has to be a different one: "everything left on it is a main lift"
     is no longer true, because the mains came down too and so did the rest.
     What is left over is the floor of the engine itself, four movements at
     three sets and the shortest rest it will prescribe, and the honest thing to
     say is that the budget is smaller than any real session of this goal. */
  const overBudget = week
    .filter((d) => overClock(d.estimatedMinutes, d))
    .map((d) => ({
      day: d.name, estimatedMinutes: d.estimatedMinutes, totalMinutes: d.estimatedMinutes + COOLDOWN_MIN, budget: d.minutes,
      why: askedMinutes === null
        /* "you asked for" is wrong on this branch and always was: `askedMinutes`
           is null here, so the number is the goal's own, not theirs. It went
           unnoticed while every goal length was a round 45 or 60; the ramp made
           them 46 and 63 and a conspicuous number in a sentence that misnames
           where it came from is worth one word. */
        /* No cool-down in this one, because the goal's number does not contain
           one: it is the warm-up plus the sets, and that is what is compared.
           See COOLDOWN_MIN. `totalMinutes` above still carries the whole visit
           for a screen that wants it. */
        ? `${d.name} comes to about ${d.estimatedMinutes} minutes against the ${d.minutes} this goal is built around. Everything left on it is a main lift, so the time goes to the rest between sets.`
        : `${d.name} still comes to about ${d.estimatedMinutes + COOLDOWN_MIN} minutes with the cool-down, against the ${d.minutes} you asked for, and that is `
          + `after the sets came down and the rest with them. This goal cannot honestly be done in ${d.minutes} minutes: `
          + `give it the extra or pick a goal with shorter rests.`,
    }));
  for (const o of overBudget) dayNotes.push(o.why);

  /* The ledger, said out loud. The over side acted where it could and reports
     what it could not; the under side only reports, because the honest answer
     to "this group is short" is another
     movement and inventing one would break the slot table that keeps two lifts
     off the same muscle. "Room to add" means the group already appears as an
     accessory somewhere with fewer than the 6 sets the clamp allows, so the gap
     could be closed without a new exercise. Nothing downstream reads this yet
     and that is deliberate: measured first, acted on when there is a caller. */
  const finalTotals = plannedByGroup();
  /* One entry per group, `{ sets, target }`, because the two numbers are only
     ever read together: a total means nothing without the thing it was aiming
     at. The first shape of this was two parallel maps keyed by the same groups,
     which is the same data with a way to get them out of step. */
  const weeklyVolume = {};
  for (const [group, sets] of Object.entries(finalTotals)) {
    /* `wanted` rides alongside because the two are a different claim now.
       `target` is what this week was held to and `wanted` is what the level
       would have asked for at a frequency this split does not have, so a
       reader can tell "you hit your number" from "your number was lowered to
       what one session a week can hold". Equal on most groups, and the entry
       carries both rather than only the difference so nothing downstream has
       to know which case it is looking at. */
    weeklyVolume[group] = {
      sets,
      target: +weeklyTargetFor(group).toFixed(1),
      wanted: +wantedFor(group).toFixed(1),
    };
  }

  /* The gap the cap above stopped pretending was a shortfall. A group the split
     touches once a week, or twice on an advanced target, cannot reach the
     level's number out of the slots it has, and that is a fact about the split
     rather than about the week: the answer is another training day or a
     different split, and neither is a decision a ledger gets to make. So it is
     reported, and one sentence reaches dayNotes, on the same principle as the
     over-budget day and the softened limit: the uncomfortable number gets said
     rather than absorbed. */
  const frequencyCapped = [];
  for (const group of Object.keys(finalTotals)) {
    const wanted = wantedFor(group);
    const deliverable = deliverableFor(group);
    if (deliverable >= wanted - VOLUME_SLACK) continue;
    const sessions = week.reduce((n, d) => n + d.exercises.filter((e) => e.group === group).length, 0);
    frequencyCapped.push({
      group, wanted: +wanted.toFixed(1), target: +deliverable.toFixed(1), sessions,
      why: `${group} gets ${sessions === 1 ? "one session" : `${sessions} sessions`} a week on this split, which tops out at `
        + `${deliverable} sets. Your level asks for ${+wanted.toFixed(1)}, so the week aims at ${deliverable} and the rest `
        + `needs another training day rather than more sets in the one you have.`,
    });
  }
  if (frequencyCapped.length) {
    const names = frequencyCapped.map((f) => f.group);
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    dayNotes.push(`This split trains ${list} once or twice a week, so their weekly sets top out below what your `
      + `level would otherwise ask for. That is the split talking, not the effort: more of those muscles means `
      + `another day in the week, not more sets in the days you have.`);
  }

  const volumeUnder = [];
  for (const [group, planned] of Object.entries(finalTotals)) {
    const target = weeklyTargetFor(group);
    if (planned >= target - VOLUME_SLACK) continue;
    const room = week.some((d) => d.exercises.some((e) => e.group === group && roleOf.get(e) === "accessory" && e.sets < MAX_SETS_PER_SESSION));
    if (!room) continue;
    volumeUnder.push({
      group, target: +target.toFixed(1), planned,
      why: `${group} is ${+(target - planned).toFixed(1)} sets under its weekly target and an accessory slot has room for them.`,
    });
  }

  /* The other half of the same honesty, and it was missing. The trim above only
     moves accessories and never goes below two sets, so an excess made entirely
     of main work, or of accessories already sitting on the floor of two, comes
     out of the loop untouched and the ledger showed a group over target with no
     line anywhere saying why. Measured on a sweep of 1040 goal, day count and
     history combinations: 85 plans left a group more than the slack over, every
     one of them because two sets is the smallest prescription there is. A
     five day return-to-training week hits chest and lats four times at a 0.6
     sets factor, which asks for 4.8 sets and cannot buy fewer than 8.
     Neither cause is a bug to patch here. Cutting a main movement to chase a
     weekly number would take the reason the day exists, and prescribing one set
     is not a prescription. So it reports, in the same shape as the under side,
     and it names which of the two walls it hit. */
  const volumeOver = [];
  for (const [group, planned] of Object.entries(finalTotals)) {
    const target = weeklyTargetFor(group);
    if (planned - target <= VOLUME_SLACK) continue;
    const accessories = week.flatMap((d) => d.exercises.filter((e) => e.group === group && roleOf.get(e) === "accessory"));
    volumeOver.push({
      group, target: +target.toFixed(1), planned,
      why: accessories.length
        ? `${group} is ${+(planned - target).toFixed(1)} sets over its weekly target and every accessory for it is already at the floor of two sets.`
        : `${group} is ${+(planned - target).toFixed(1)} sets over its weekly target and all of it is main work, which is not trimmed.`,
    });
  }

  /* A hard avoid is the only thing in here that removes a movement somebody
     never asked to have removed, so it is said out loud. Checked against the
     week that was actually built rather than against the intent, because
     applyPreferences keeps a disliked lift when dropping it would leave the
     slot unfillable, and a note claiming it is gone when it is still on the
     card would be worse than no note. */
  const inWeek = new Set(week.flatMap((d) => d.exercises.map((e) => String(e.name).toLowerCase())));
  for (const a of preferences.avoid) {
    if (a.strength === "hard" && !inWeek.has(a.name.toLowerCase())) dayNotes.push(avoidNote(a));
  }

  /* And the other half of the same promise. A hard avoid that is still on the
     card because the week ran out of moves would otherwise read as a tap that
     did nothing, which is exactly the silence avoidNote exists to break. Said
     once for the week rather than once per lift, because "more than one week
     should change at once" is one fact and repeating it is nagging. */
  const heldSay = heldBackNote(prefBudget);
  if (heldSay) dayNotes.push(heldSay);

  /* Same argument, for the limits. A slot the library could fill no other way
     kept a movement that still loads a joint they named, and the person has to
     be told rather than left to find out under a bar. */
  const limitBlocked = [...new Set(
    week.flatMap((d) => d.exercises.map((e) => e.name)).filter((n) => limitOut.has(n.toLowerCase())),
  )];
  const blockedSay = softenedNote(limitBlocked);
  if (blockedSay) dayNotes.push(blockedSay);

  /* ---- pass 4: progression ---- */
  /* The plateau answer, spoken. A rotation the library could not afford becomes
     a rep range change instead, so the note and the week always agree. */
  if (rotateBlocked.size) {
    plateauPlan = applyRotateFallback(plateauPlan, [...rotateBlocked], { goal: resolved, plateau: trainingAge.plateau });
  }
  /* A response with nothing to say is a deferral, not a silence: on a volume cut
     week the summary speaks for the whole plan and the per lift answers wait. */
  for (const r of plateauPlan.responses) if (r.say) dayNotes.push(r.say);
  if (plateauPlan.summary.say) dayNotes.push(plateauPlan.summary.say);

  /* ---- warm-up and cool-down, after the time pass so the day is final ----
     The five warm-up minutes have been inside estimateMinutes since the first
     run with nothing in them; the warm-up block fills them. The cool-down is
     new and sits on top, so a day carries both numbers and totalMinutes is the
     honest one for somebody deciding whether they have time. Nothing here
     feeds the volume ledger or recovery: a stretch is not a set. See
     engine/mobility.mjs for the reasoning and the research. */
  for (const d of week) {
    /* `mobilityChild` is the primary's own child whenever that child is one of
       the two mobility ones, so this is what it always was, and it is a
       secondary goal's child only when the primary had no claim on the block.
       "Build muscle and touch my toes" is the case it exists for. */
    d.mobility = mobilityFor(d, {
      level, hurts: limitsUsed.hurts, missing: limitsUsed.missing, goalChild: resolved.mobilityChild,
      /* Set by the fill pass above, and only there: a longer block is something
         a stated session length bought, never a default. */
      longCooldown: !!d.longCooldown,
    });
    /* The ramp is already inside `estimatedMinutes` by way of `prepMinutes`, so
       it must not be added again here. Only the cool-down sits on top. */
    d.totalMinutes = d.estimatedMinutes + Math.round(d.mobility.cooldownSeconds / 60);
  }

  const progression = level === "beginner" || level === "novice"
    ? { rule: "linear", detail: "Hit every rep on every set and the weight goes up next time. That keeps working for months and there is no reason to be cleverer than it while it does." }
    : { rule: "double", detail: "Work up to the top of the rep range on every set, then add weight and drop back to the bottom." };

  /* research: beginners rarely need a planned deload, and giving them one they
     have not earned reads as the app deciding they are tired. */
  const deload = LEVEL_RANK[level] >= 2
    ? { everyWeeks: 6, detail: "Every sixth week, same exercises, about two thirds of the sets." }
    : null;

  return {
    goal: resolved, honest: resolved.timeline, level, trainingAge,
    preferences: {
      avoid: preferences.avoid, prefer: preferences.prefer,
      equipmentBias: preferences.equipmentBias, confidence: preferences.confidence,
      /* What the week's cap did, published so a reader can tell "your swap
         changed nothing" from "your swap is next in the queue". Spread rather
         than set to null, so the plan of somebody with nothing to act on is the
         object it was before this existed rather than that object plus a key,
         which is the difference between "nothing changed" and "nothing changed,
         probably". */
      ...(prefBudget ? {
        budget: {
          cap: prefBudget.cap, slots: prefBudget.slots,
          acted: [...prefBudget.active].filter((k) => /* The escape, not the byte: preferences.mjs keys the equipment skew
             with a NUL prefix so no exercise name can collide with it, and
             this has to match. Written as a literal NUL it was invisible in
             every editor, survived nothing that re-encodes a file, and made
             plan.mjs the one source file that is not plain text. Same
             string, bytes anyone can read. */
          k !== "\u0000equipment").map((k) => prefBudget.nameOf.get(k) || k),
          held: [...prefBudget.held.values()].map((h) => h.name),
        },
      } : {}),
    },
    days, dayNotes, restDays: 7 - days,
    week, progression, deload,
    /* What the week really spends per muscle group against what it was aiming
       for. The first version of this engine could not have printed this table,
       which is precisely why it did not notice it was wrong. */
    weeklyVolume,
    /* Every correction that was made and every gap that was not, kept beside
       the ledger rather than inside it so that `weeklyVolume` stays a plain map
       from group to numbers and a caller can iterate it without having to know
       which keys are muscles and which are bookkeeping. */
    volumeNotes: {
      trimmed: volumeTrimmed, over: volumeOver, under: volumeUnder, frequencyCapped, timeTrimmed, overBudget,
      /* The two new halves of the time ledger. `restCompressed` is the only
         trim in this file that changes what a set is worth, so it is reported
         separately from `timeTrimmed` rather than folded in with the dropped
         movements. `timeAdded` is the fill pass, one entry per lift that grew,
         not one per set. Both are empty on every plan built without a stated
         session length, which is every plan built before today. */
      /* Every ramp in the week, one entry per lift rather than per set, so the
         sweep and a screen can read what was prepared without walking the days.
         Always present: a ramp is decided by the lifts, not by the clock. */
      ramped,
      /* Published without the working fields the fill pass needed: `before` is
         one number per exercise and `d` is the day itself, and neither belongs
         in a ledger a caller iterates. `factor` and `toSec` are whatever the
         repayment left them at, so the published row is what the person got. */
      restCompressed: restCompressed.map(({ day, fromSec, toSec, factor, repaid }) => ({ day, fromSec, toSec, factor, repaid: !!repaid })),
      timeAdded: [...timeAdded.values()],
      /* What the surplus bought once sets were off the table. Spread in rather
         than always present, the same way `preferences.budget` is: a plan built
         without a stated session length has no clock to have spent, and the
         honest shape for that is the object it was before this key existed
         rather than that object plus an empty array. */
      ...(askedMinutes === null ? {} : { timeBought }),
    },
    /* What the week was costed against and where that number came from, because
       "45 minutes" means a different thing when the goal chose it and when the
       person did. `asked` is what arrived before the clamp, so a screen can tell
       a clamp from a coincidence. */
    sessionBudget: {
      minutes: sessionBudgetMin,
      source: askedMinutes === null ? "goal" : "asked",
      asked: Number.isFinite(rawAsked) && rawAsked > 0 ? Math.round(rawAsked) : null,
      goalMinutes: P.sessionMin,
    },
    cardio: P.cardio,
    /* What was asked for, what it cost, and what it could not buy. `excluded`
       is every movement the joint table ruled out across both libraries, not
       only the ones a slot wanted, because "how much of the library is left"
       is the question support gets. `blocked` is the honest remainder. */
    limits: { applied: limitsUsed, excluded: limitExcluded.map((e) => e.name), notes: limitNotes, blocked: limitBlocked },
    calibration: { summary: calibration.summary, overall: calibration.overall },
    /* A stall now leaves with an answer attached rather than a diagnosis. The
       full reasoning stays in plateauPlan.why for an audit; the plan carries
       what was decided and what it means for the week. */
    plateau: { responses: plateauPlan.responses, summary: plateauPlan.summary },
    /* What we would have used and did not have, so a plan can say what would
       sharpen it rather than silently guessing. */
    missing: [
      bodyWeightLb ? null : "bodyweight, so there are no starting weights",
      logs.length ? null : "any logged sessions, so this is the day one plan",
      /* Logs without plans is the common half-fed case: we know what was lifted
         and nothing about what was asked for, so calibrate.mjs has no join to
         make and every verdict comes back unknown. Worth naming, because the
         fix is one table the app already writes. */
      /* Asked of the calibration and not of `plans.length`, which is the
         difference between "there are rows" and "there was anything to join".
         A plan that was generated and never finished carries no `completed_at`,
         `joinPlanToActual` ignores it on purpose, and counting it here made the
         sentence disappear for somebody nothing had in fact been calibrated
         for. `overall` is "unknown" exactly when the join came back empty, so
         it is the same question asked of the answer instead of the input.
         Found the day `plans` started arriving: before that this branch had
         never seen a payload carrying an unfinished plan. */
      logs.length && calibration.overall === "unknown"
        ? "any completed plans, so nothing was calibrated against what you actually did"
        : null,
      sex ? null : "sex, so upper body starting weights use the cautious default",
    ].filter(Boolean),
  };
}
