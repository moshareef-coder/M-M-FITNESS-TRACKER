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
import { resolveGoal } from "./goal-engine.mjs";
import { deriveTrainingAge, observedCapacity } from "./training-age.mjs";
import { prescribeLoad, patternFor } from "./load.mjs";
import { calibrate } from "./calibrate.mjs";
import { learnPreferences, applyPreferences, avoidNote } from "./preferences.mjs";
import { scoreAlternatives } from "./alternatives.mjs";
import { planPlateauResponse, applyRotateFallback } from "./plateau-response.mjs";
import { normalizeLimits, applyLimits, allowedEquipment, limitsSummary, softenedNote } from "./limits.mjs";
import { mainGroupsForDay } from "./recovery.mjs";
import { mobilityFor } from "./mobility.mjs";

const WEIGHTS = TRAININGS.find((t) => t.id === "weight-training");
const CALIS = TRAININGS.find((t) => t.id === "calisthenics");

/* Weekly hard sets per muscle group, before the goal's factor and any priority.
   From knowledge/principles/volume-landmarks.md, deliberately at the low end for
   beginners: research/09 says the first weeks decide retention, and nobody ever
   quit because week one was too easy. */
const BASE_WEEKLY_SETS = { beginner: 8, novice: 10, intermediate: 14, advanced: 16 };
const PRIORITY_MULTIPLIER = 1.4;

/* A short day is fewer sets and less time, not half a session. It used to hand
   back the main slots alone, which is two exercises on a push or a pull day, and
   PLAN.md's contract with the app says 4 to 6. So the accessories fill back up
   to four and the sets come down instead. */
const SHORT_DAY_MIN = 4;
const SHORT_DAY_SETS = 2;

/* How far a group's weekly total is allowed to drift from its target before the
   plan does something about it. Two sets, because the target is itself a round
   number off a landmark range and pretending it is exact would have the week
   twitching over a rounding. */
const VOLUME_SLACK = 2;

/* The time budget. `P.sessionMin` has existed since the first version and only
   the display ever read it, so a strength day of six lifts at six sets and three
   minutes of rest printed "~60 min" over something closer to two hours. A set is
   about 30 seconds of actual work, the rest interval is already prescribed per
   exercise, and 5 minutes covers getting warm. 15% over is the tolerance,
   because the estimate is an estimate and trimming a session for one minute is
   worse than the minute. Nothing goes below four exercises (PLAN.md's contract
   with the app) and a main movement is never the thing that goes. */
const REP_SECONDS = 30;
const WARMUP_MIN = 5;
const TIME_TOLERANCE = 1.15;

function estimateMinutes(exercises) {
  const seconds = exercises.reduce((t, e) => t + e.sets * (REP_SECONDS + e.restSec), 0);
  return Math.round(WARMUP_MIN + seconds / 60);
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
      stall: the cut moved 2 slots out of 11. Now a main lift always gives up a
      set to a back-off, floor 2, and the only thing that can swallow it is the
      floor itself, which is a real limit rather than an accident of ordering. */
function setsFor({ base, hitCount, priority, backOff, isMain }) {
  const per = (weekly) => Math.round(weekly / Math.max(1, hitCount));
  const plain = per(base);
  const wanted = priority ? Math.max(per(base * PRIORITY_MULTIPLIER), plain + 1) : plain;
  const sets = Math.max(2, Math.min(6, wanted));
  if (!backOff) return sets;
  /* The accessories take the 0.85 they always took. A main lift takes whichever
     is smaller, so the cut is never less than one set: that is the whole promise
     the note in dayNotes makes on the user's behalf. */
  const eased = Math.round(sets * 0.85);
  return Math.max(2, isMain ? Math.min(eased, sets - 1) : eased);
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
   without the flag carries more sets than the lowest priority lift there. */
function enforcePriorityFloor(exercises) {
  const priority = exercises.filter((e) => e.priority);
  if (!priority.length) return;
  const ceiling = Math.min(...priority.map((e) => e.sets));
  for (const e of exercises) if (!e.priority) e.sets = Math.max(2, Math.min(e.sets, ceiling));
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
function candidates({ groups, pattern, level, equipment, role = "accessory", historyNames = [], preferences = null, exclude = null, emphasis = null }) {
  const ceiling = (LEVEL_RANK[level] ?? 0) + (role === "main" ? 2 : 1);
  const match = (needPattern) => {
    const pool = [];
    for (const lib of [WEIGHTS, CALIS]) {
      for (const cat of lib.categories) {
        for (const ex of cat.exercises) {
          if (!(ex.primary || []).some((g) => groups.includes(g))) continue;
          if ((LEVEL_RANK[ex.level] ?? 0) > ceiling) continue;
          if (equipment && !equipment.includes(ex.equipment)) continue;
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
  return applyPreferences(pool, preferences);
}

export function buildPlan({
  goal, person = {}, logs = [], plans = [], swaps = [], equipment = null, today = new Date(), priorityOverride = null,
  limits = null,
} = {}) {
  const { bodyWeightLb = null, sex = null, daysAsked = null } = person;

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
  const excludeOut = limitOut.size ? new Set([...rotateOut, ...limitOut]) : rotateOut;

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
      const pool = candidates({ ...slot, level, equipment: kit, role: slot.role, historyNames, preferences, exclude: excludeOut, emphasis: P.emphasis });
      if (!pool.length) return null;
      /* Prefer something not already used this week, so a week of five days does
         not become the same four lifts five times. */
      const pick = pool.find((e) => !usedToday.has(e.name) && (usedThisWeek.get(e.name) || 0) === 0)
        || pool.find((e) => !usedToday.has(e.name)) || pool[0];
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
  const isPriority = (group) => (priorityOverride ?? P.priority).includes(group);
  const week = selected.map(({ name, key, isShort, picks }) => {
    const exercises = picks.map(({ slot, pick, swap, alternatives, offPattern }) => {
      const group = groupFor(slot, pick);
      /* The goal is not the only thing that can name a priority group. When the
         caller has merged the user's own body-map focus in (engine/focus.mjs),
         that merged list arrives as priorityOverride and stands in for the
         goal's. Null means nobody merged anything and the goal decides, which
         is every call that existed before this line. */
      const priority = isPriority(group);
      const isMain = slot.role === "main";
      const full = setsFor({ base: baseSets, hitCount: hits[group] || 1, priority, backOff, isMain });
      /* A short day is the session they were least likely to make, so it stays
         small however the multipliers landed. */
      const sets = isShort ? SHORT_DAY_SETS : full;
      const reps = isMain ? P.repRange[0] : P.repRange[1];

      const load = prescribeLoad({
        exercise: pick, reps, bodyWeightLb, sex, level, logs, returning: trainingAge.returning,
        calibration: calibration.byExercise,
      });

      const exercise = {
        name: pick.name, group, equipment: pick.equipment, sets, reps,
        restSec: isMain ? P.restSec : Math.round(P.restSec * 0.7),
        weight: load.weight, loadBasis: load.basis, loadNote: load.note,
        /* `swap` stays a bare string, because everything already reading it
           expects one. `alternatives` is the same answer with its reasons
           attached and two more options behind it. */
        swap: swap ? swap.name : null,
        alternatives,
        priority,
        /* Said out loud rather than hidden: this slot wanted a movement pattern
           the library could not supply at this level. */
        note: offPattern ? `Standing in for a ${slot.pattern} movement; the library has none at this level.` : null,
      };
      roleOf.set(exercise, slot.role);
      return exercise;
    });

    return {
      name, focus: key, short: isShort,
      minutes: isShort ? Math.round(P.sessionMin * 0.6) : P.sessionMin,
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
  const weeklyTargetFor = (group) => baseSets * (isPriority(group) ? PRIORITY_MULTIPLIER : 1);
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
  const timeTrimmed = [];
  const lastIndex = (list, ok) => { for (let i = list.length - 1; i >= 0; i--) if (ok(list[i], i)) return i; return -1; };
  for (const d of week) {
    let estimate = estimateMinutes(d.exercises);
    const overBudget = () => estimate > d.minutes * TIME_TOLERANCE;
    while (overBudget()) {
      const shave = lastIndex(d.exercises, (e) => roleOf.get(e) === "accessory" && !e.priority && e.sets > SHORT_DAY_SETS);
      if (shave >= 0) {
        d.exercises[shave].sets -= 1;
        estimate = estimateMinutes(d.exercises);
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
      estimate = estimateMinutes(d.exercises);
    }
    d.estimatedMinutes = estimate;
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
     floor. Named, so the number is a statement rather than a discrepancy. */
  const overBudget = week
    .filter((d) => d.estimatedMinutes > d.minutes * TIME_TOLERANCE)
    .map((d) => ({
      day: d.name, estimatedMinutes: d.estimatedMinutes, budget: d.minutes,
      why: `${d.name} comes to about ${d.estimatedMinutes} minutes against the ${d.minutes} you asked for. Everything left on it is a main lift, so the time goes to the rest between sets.`,
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
    weeklyVolume[group] = { sets, target: +weeklyTargetFor(group).toFixed(1) };
  }
  const volumeUnder = [];
  for (const [group, planned] of Object.entries(finalTotals)) {
    const target = weeklyTargetFor(group);
    if (planned >= target - VOLUME_SLACK) continue;
    const room = week.some((d) => d.exercises.some((e) => e.group === group && roleOf.get(e) === "accessory" && e.sets < 6));
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
    d.mobility = mobilityFor(d, { level, hurts: limitsUsed.hurts, missing: limitsUsed.missing, goalChild: resolved.childUsed });
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
    volumeNotes: { trimmed: volumeTrimmed, over: volumeOver, under: volumeUnder, timeTrimmed, overBudget },
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
      logs.length && !plans.length
        ? "any completed plans, so nothing was calibrated against what you actually did"
        : null,
      sex ? null : "sex, so upper body starting weights use the cautious default",
    ].filter(Boolean),
  };
}
