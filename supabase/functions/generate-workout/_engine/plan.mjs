/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/plan.mjs. Do not edit here. */
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
import { TRAININGS } from "../_library/index.mjs";
import { resolveGoal } from "./goal-engine.mjs";
import { deriveTrainingAge, observedCapacity } from "./training-age.mjs";
import { prescribeLoad, patternFor } from "./load.mjs";
import { calibrate } from "./calibrate.mjs";

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
   neighbours in the same session. */
function setsFor({ base, hitCount, priority, backOff, isMain }) {
  const per = (weekly) => Math.round(weekly / Math.max(1, hitCount));
  const target = base * (priority ? PRIORITY_MULTIPLIER : 1) * (backOff ? 0.85 : 1);
  let sets = per(target);
  if (backOff && isMain) sets = Math.min(sets, per(base * (priority ? PRIORITY_MULTIPLIER : 1)) - 1);
  if (priority) sets = Math.max(sets, per(base * (backOff ? 0.85 : 1)) + 1);
  return Math.max(2, Math.min(6, sets));
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
  const mains = all.filter((s) => s.role === "main");
  const rest = all.filter((s) => s.role !== "main");
  return mains.concat(rest.slice(0, Math.max(0, SHORT_DAY_MIN - mains.length)));
}

const LEVEL_RANK = { beginner: 0, novice: 1, intermediate: 2, advanced: 3 };

/* A main slot is a movement pattern somebody needs, so it reaches one level
   higher than an accessory would. Without that a beginner gets no hinge at all:
   every deadlift, Romanian deadlift and hip thrust in the library is tagged
   intermediate or above, which is defensible on technique and leaves a beginner
   with no posterior chain work, which is worse. See engine/README.md. */
function candidates({ groups, pattern, level, equipment, role = "accessory", historyNames = [] }) {
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
         3. research/05, the conservative tie break: lower level wins a draw. */
    const known = new Set(historyNames);
    const rank = LEVEL_RANK[level] ?? 0;
    return pool
      .map((e) => {
        const lv = LEVEL_RANK[e.level] ?? 0;
        return { e, score: (known.has(e.name.toLowerCase()) ? -100 : 0) + Math.abs(rank - lv) + (lv > rank ? 0.5 : 0) };
      })
      .sort((x, y) => x.score - y.score || (LEVEL_RANK[x.e.level] ?? 0) - (LEVEL_RANK[y.e.level] ?? 0))
      .map((x) => x.e);
  };

  const exact = match(pattern !== "isolation");
  if (exact.length) return exact;
  /* Never silently drop a slot. A missing hinge is a hole in the week, and the
     first run of this file dropped one without saying anything. */
  return match(false);
}

export function buildPlan({
  goal, person = {}, logs = [], plans = [], equipment = null, today = new Date(),
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

  const resolved = resolveGoal({ ...goal, bodyWeightLb, sex, level, today });
  const P = resolved.params;

  /* ---- pass 1: structure ---- */
  const capacity = observedCapacity(trainingAge);
  const asked = daysAsked ?? P.minDays;
  let days = Math.min(P.maxDays, Math.max(P.minDays, asked));
  const dayNotes = [];

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

  const split = splitFor(days, level).slice(0, days);
  const backOff = calibration.overall === "back-off";
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

    const picks = slots.map((slot) => {
      const pool = candidates({ ...slot, level, equipment, role: slot.role, historyNames });
      if (!pool.length) return null;
      /* Prefer something not already used this week, so a week of five days does
         not become the same four lifts five times. */
      const pick = pool.find((e) => !usedToday.has(e.name) && (usedThisWeek.get(e.name) || 0) === 0)
        || pool.find((e) => !usedToday.has(e.name)) || pool[0];
      const offPattern = patternFor(pick) !== slot.pattern && slot.pattern !== "isolation";
      usedToday.add(pick.name);
      usedThisWeek.set(pick.name, (usedThisWeek.get(pick.name) || 0) + 1);

      /* Every exercise needs a swap. The brief calls this a hard product
         requirement rather than a nice to have, and research/07 adds that the
         swap somebody actually uses is a pain signal worth recording. */
      const alternatives = pool.filter((e) => e.name !== pick.name && !usedToday.has(e.name));
      const swap = alternatives.find((e) => !swapsThisWeek.has(e.name)) || alternatives[0] || null;
      if (swap) swapsThisWeek.add(swap.name);

      return { slot, pick, swap, offPattern };
    }).filter(Boolean);

    return { name, key, isShort, picks };
  });

  /* How often each group really gets hit, from what was picked, so weekly volume
     can be split across sessions rather than guessed per session. */
  const hits = {};
  for (const day of selected) {
    for (const { pick } of day.picks) {
      const g = (pick.primary || [])[0];
      if (g) hits[g] = (hits[g] || 0) + 1;
    }
  }

  /* ---- pass 3: sets, reps and load, now that the week is known ---- */
  const week = selected.map(({ name, key, isShort, picks }) => {
    const exercises = picks.map(({ slot, pick, swap, offPattern }) => {
      const group = (pick.primary || [])[0];
      const priority = P.priority.includes(group);
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

      return {
        name: pick.name, group, equipment: pick.equipment, sets, reps,
        restSec: isMain ? P.restSec : Math.round(P.restSec * 0.7),
        weight: load.weight, loadBasis: load.basis, loadNote: load.note,
        swap: swap ? swap.name : null,
        priority,
        /* Said out loud rather than hidden: this slot wanted a movement pattern
           the library could not supply at this level. */
        note: offPattern ? `Standing in for a ${slot.pattern} movement; the library has none at this level.` : null,
      };
    });

    return { name, focus: key, short: isShort, minutes: isShort ? Math.round(P.sessionMin * 0.6) : P.sessionMin, exercises };
  });

  /* ---- pass 4: progression ---- */
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
    days, dayNotes, restDays: 7 - days,
    week, progression, deload,
    cardio: P.cardio,
    calibration: { summary: calibration.summary, overall: calibration.overall },
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
