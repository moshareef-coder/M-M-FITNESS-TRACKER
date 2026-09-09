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

const WEIGHTS = TRAININGS.find((t) => t.id === "weight-training");
const CALIS = TRAININGS.find((t) => t.id === "calisthenics");

/* Weekly hard sets per muscle group, before the goal's factor and any priority.
   From knowledge/principles/volume-landmarks.md, deliberately at the low end for
   beginners: research/09 says the first weeks decide retention, and nobody ever
   quit because week one was too easy. */
const BASE_WEEKLY_SETS = { beginner: 8, novice: 10, intermediate: 14, advanced: 16 };
const PRIORITY_MULTIPLIER = 1.4;

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

/* Names, because "there is no Push day or Legs, just a list" is complaint 4. */
function splitFor(days, level) {
  const young = level === "beginner" || level === "novice";
  if (days <= 2) return [["Full body A", "fullBody"], ["Full body B", "fullBody"]];
  if (days === 3) {
    return young
      ? [["Full body A", "fullBody"], ["Full body B", "fullBody"], ["Full body C", "fullBody"]]
      : [["Push day", "push"], ["Pull day", "pull"], ["Leg day", "legs"]];
  }
  if (days === 4) return [["Upper body A", "upper"], ["Lower body A", "lower"], ["Upper body B", "upper"], ["Lower body B", "lower"]];
  return [["Push day", "push"], ["Pull day", "pull"], ["Leg day", "legs"], ["Upper body", "upper"], ["Lower body", "lower"]];
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
  goal, person = {}, logs = [], equipment = null, today = new Date(),
} = {}) {
  const { bodyWeightLb = null, sex = null, daysAsked = null } = person;

  /* ---- who they are, measured not asked ---- */
  const trainingAge = deriveTrainingAge({ logs, today });
  const level = trainingAge.level;

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

  const split = splitFor(days, level).slice(0, days);
  const baseSets = BASE_WEEKLY_SETS[level] * P.setsFactor;

  /* How often each group gets hit, so weekly volume can be split across sessions
     rather than guessed per session. */
  const hits = {};
  for (const [, key] of split) for (const s of SLOTS[key]) for (const g of s.groups) hits[g] = (hits[g] || 0) + 1;

  /* ---- passes 2 and 3: selection, then load ---- */
  const historyNames = [...new Set(logs.map((l) => String(l.exercise_name || "").toLowerCase()))];
  const usedThisWeek = new Map();
  const week = split.map(([name, key], dayIndex) => {
    const isShort = shortFrom != null && dayIndex >= shortFrom;
    const usedToday = new Set();
    const slots = isShort ? SLOTS[key].filter((s) => s.role === "main") : SLOTS[key];

    const exercises = slots.map((slot) => {
      const pool = candidates({ ...slot, level, equipment, role: slot.role, historyNames });
      if (!pool.length) return null;
      /* Prefer something not already used this week, so a week of five days does
         not become the same four lifts five times. */
      const pick = pool.find((e) => !usedToday.has(e.name) && (usedThisWeek.get(e.name) || 0) === 0)
        || pool.find((e) => !usedToday.has(e.name)) || pool[0];
      const offPattern = patternFor(pick) !== slot.pattern && slot.pattern !== "isolation";
      usedToday.add(pick.name);
      usedThisWeek.set(pick.name, (usedThisWeek.get(pick.name) || 0) + 1);

      const group = (pick.primary || [])[0];
      const priority = P.priority.includes(group);
      const weekly = baseSets * (priority ? PRIORITY_MULTIPLIER : 1);
      const sets = Math.max(2, Math.min(5, Math.round(weekly / Math.max(1, hits[group] || 1))));
      const reps = slot.role === "main" ? P.repRange[0] : P.repRange[1];

      const load = prescribeLoad({
        exercise: pick, reps, bodyWeightLb, sex, level, logs, returning: trainingAge.returning,
      });

      /* Every exercise needs a swap. The brief calls this a hard product
         requirement rather than a nice to have, and research/07 adds that the
         swap somebody actually uses is a pain signal worth recording. */
      const swap = pool.find((e) => e.name !== pick.name && !usedToday.has(e.name));

      return {
        name: pick.name, group, equipment: pick.equipment, sets, reps,
        restSec: slot.role === "main" ? P.restSec : Math.round(P.restSec * 0.7),
        weight: load.weight, loadBasis: load.basis, loadNote: load.note,
        swap: swap ? swap.name : null,
        priority,
        /* Said out loud rather than hidden: this slot wanted a movement pattern
           the library could not supply at this level. */
        note: offPattern ? `Standing in for a ${slot.pattern} movement; the library has none at this level.` : null,
      };
    }).filter(Boolean);

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
    /* What we would have used and did not have, so a plan can say what would
       sharpen it rather than silently guessing. */
    missing: [
      bodyWeightLb ? null : "bodyweight, so there are no starting weights",
      logs.length ? null : "any logged sessions, so this is the day one plan",
      sex ? null : "sex, so upper body starting weights use the cautious default",
    ].filter(Boolean),
  };
}
