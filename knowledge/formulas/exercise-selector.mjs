// The exercise-selection algorithm: turns knowledge/principles/*.md into executable rules
// instead of prose an AI has to re-interpret every call. Everything here is a pure function --
// same inputs always produce the same plan, which is the whole point of moving this out of a
// free-form AI prompt. See ../principles/ for the reasoning behind each table.

import { TRAININGS } from "../exercise-library/index.mjs";

const byId = Object.fromEntries(TRAININGS.map((t) => [t.id, t]));

// ---------------------------------------------------------------------------
// Trainee level, derived from logged history rather than asked for directly --
// self-reported experience is notoriously unreliable, session count is not.
// ---------------------------------------------------------------------------
export function deriveTraineeLevel(loggedSessionCount) {
  const n = loggedSessionCount || 0;
  if (n < 12) return "beginner";       // roughly the first month at 3x/week
  if (n < 100) return "intermediate";  // roughly the first 6-8 months
  return "advanced";
}

const LEVEL_RANK = { beginner: 0, intermediate: 1, advanced: 2 };

// ---------------------------------------------------------------------------
// Volume landmarks (see ../principles/volume-landmarks.md), keyed to every MUSCLE_GROUPS
// entry in index.html. Values are weekly hard sets for an intermediate trainee; used here to
// rank which muscle groups are most under-trained this week, not to micromanage every set.
// ---------------------------------------------------------------------------
export const VOLUME_LANDMARKS = {
  chest:      { mev: 8,  mavLow: 12, mavHigh: 20, mrv: 22 },
  lats:       { mev: 10, mavLow: 14, mavHigh: 22, mrv: 25 },
  traps:      { mev: 4,  mavLow: 6,  mavHigh: 12, mrv: 14 },
  shoulders:  { mev: 8,  mavLow: 12, mavHigh: 20, mrv: 24 },
  biceps:     { mev: 6,  mavLow: 10, mavHigh: 18, mrv: 22 },
  triceps:    { mev: 6,  mavLow: 10, mavHigh: 16, mrv: 20 },
  forearms:   { mev: 0,  mavLow: 4,  mavHigh: 10, mrv: 12 },
  quads:      { mev: 8,  mavLow: 12, mavHigh: 18, mrv: 20 },
  hamstrings: { mev: 6,  mavLow: 10, mavHigh: 16, mrv: 18 },
  glutes:     { mev: 6,  mavLow: 10, mavHigh: 16, mrv: 18 },
  calves:     { mev: 8,  mavLow: 12, mavHigh: 18, mrv: 22 },
  abs:        { mev: 0,  mavLow: 8,  mavHigh: 16, mrv: 20 },
  obliques:   { mev: 0,  mavLow: 6,  mavHigh: 12, mrv: 16 },
  lowerback:  { mev: 0,  mavLow: 4,  mavHigh: 10, mrv: 12 },
};

/** Weekly set target for a muscle group at a given trainee level (see volume-landmarks.md). */
export function weeklyVolumeTarget(categoryKey, level) {
  const lm = VOLUME_LANDMARKS[categoryKey];
  if (!lm) return null;
  if (level === "beginner") return Math.round(lm.mev + (lm.mavLow - lm.mev) * 0.5);
  if (level === "advanced") return Math.round((lm.mavLow + lm.mavHigh) / 2 + (lm.mrv - lm.mavHigh) * 0.25);
  return Math.round((lm.mavLow + lm.mavHigh) / 2); // intermediate: mid-MAV
}

/**
 * Ranks every weight-training muscle group by how far under this week's volume target it is,
 * most-behind first. `weeklyVolumeByCategory` is whatever index.html's existing
 * computeMuscleVolume() returns -- pass {} (or omit) with no data and every group ranks equal,
 * falling back to declaration order (roughly biggest-muscle-first).
 */
export function pickFocusCategories({ level, weeklyVolumeByCategory = {}, count = 2 }) {
  const keys = Object.keys(VOLUME_LANDMARKS);
  return keys
    .map((key) => {
      const target = weeklyVolumeTarget(key, level) || 1;
      const done = weeklyVolumeByCategory[key] || 0;
      return { key, gap: (target - done) / target };
    })
    .sort((a, b) => b.gap - a.gap)
    .slice(0, count)
    .map((c) => c.key);
}

/**
 * Circuit-style sessions (fat-loss/general-fitness goal) need full-body coverage EVERY
 * session, not a rotating body-part split -- that's the whole point of the modality (see
 * ../principles/weight-loss-training.md). pickFocusCategories() picks the N most-behind
 * muscle groups in declaration order, which produces a de-facto bro-split when N is small
 * relative to the 14 total groups, and can skip entire movement patterns for a whole week.
 *
 * This picks one category from each fundamental movement pattern instead, so every circuit
 * day always includes a squat, a hinge, a push, a pull, and core -- the skeleton already
 * specified in weight-loss-training.md's equipment-variant table. Within a pattern that maps
 * to more than one muscle group (e.g. push -> chest/shoulders/triceps), the most-behind one
 * this week wins, same ranking logic as pickFocusCategories.
 */
const MOVEMENT_PATTERNS = {
  squat: ["quads"],
  hinge: ["hamstrings", "glutes", "lowerback"],
  push: ["chest", "shoulders", "triceps"],
  pull: ["lats", "traps", "biceps"],
  core: ["abs", "obliques"],
};
const PATTERN_ORDER = ["squat", "hinge", "push", "pull", "core"];

export function pickCircuitCategories({ level, weeklyVolumeByCategory = {} }) {
  return PATTERN_ORDER.map((pattern) => {
    const candidates = MOVEMENT_PATTERNS[pattern];
    const [best] = candidates
      .map((key) => {
        const target = weeklyVolumeTarget(key, level) || 1;
        const done = weeklyVolumeByCategory[key] || 0;
        return { key, gap: (target - done) / target };
      })
      .sort((a, b) => b.gap - a.gap);
    return best.key;
  });
}


export const REP_RANGES = {
  strength: [3, 6],
  hypertrophy: [6, 15],
  general: [8, 12],
};

export function normalizeGoal(goal) {
  const g = (goal || "").toLowerCase();
  if (g.includes("strength")) return "strength";
  if (g.includes("muscle") || g.includes("hypertrophy") || g.includes("gain")) return "hypertrophy";
  return "general"; // fat loss / general fitness / unspecified
}

/** Sets per exercise today. Beginners get less per movement -- they're doing more total
 *  movements across the same volume target while they're still learning technique. */
export function setsPerExercise(level) {
  return { beginner: 3, intermediate: 3, advanced: 4 }[level] ?? 3;
}

export function repsForGoal(goal) {
  const [lo, hi] = REP_RANGES[normalizeGoal(goal)];
  return Math.round((lo + hi) / 2);
}

// Isometric holds (Plank, Dead Hang, L-Sit, Farmer's Carry, etc. -- tagged isHold: true in the
// exercise library) are prescribed as a duration, not a rep count. "3 x 10" is meaningless for
// a plank. Levels get progressively longer holds, same tiering logic as reps-by-goal.
export const HOLD_SECONDS_BY_LEVEL = { beginner: 20, intermediate: 35, advanced: 50 };

export function holdSecondsForLevel(level) {
  return HOLD_SECONDS_BY_LEVEL[level] ?? HOLD_SECONDS_BY_LEVEL.beginner;
}

/**
 * Progression for a hold, mirroring progressiveOverload()'s "hit target -> push further, miss
 * it -> hold" logic, but the lever is time instead of load -- consistent with
 * ../principles/equipment-substitution.md, which established that bodyweight/no-load
 * progression needs a different mechanism than adding plates.
 */
export function progressiveHold({ lastLog, level }) {
  const base = holdSecondsForLevel(level);
  if (!lastLog) return base;
  const hitTarget = lastLog.secondsAchieved >= lastLog.targetSeconds;
  return hitTarget ? lastLog.targetSeconds + 5 : lastLog.targetSeconds; // missed: hold, don't push further
}

// Circuit-style structure (short rest, elevated heart rate throughout) is a distinct session
// shape from traditional straight-sets training, not just "the same session but rushed" -- see
// ../principles/weight-loss-training.md. General-fitness/fat-loss sessions use it; strength and
// hypertrophy sessions need full recovery between sets to actually move load or add reps.
export function sessionStyleForGoal(goal) {
  return normalizeGoal(goal) === "general" ? "circuit" : "traditional";
}

export function restSecondsForGoal(goal) {
  return sessionStyleForGoal(goal) === "circuit" ? 30 : 90;
}

// ---------------------------------------------------------------------------
// Exercise selection within a category: filter by level and available equipment, prefer
// exercises not done in the last few sessions for variety, prefer more-compound movements
// (more secondary muscles recruited) first since that's standard program-ordering practice.
// ---------------------------------------------------------------------------
export function selectExercisesForCategory({ trainingId, categoryKey, level, equipmentAvailable, recentExerciseNames = [], count = 2 }) {
  const training = byId[trainingId];
  const category = training?.categories.find((c) => c.key === categoryKey);
  if (!category) return [];

  const maxRank = LEVEL_RANK[level] ?? 1;
  const eligible = category.exercises.filter((ex) => {
    const okLevel = LEVEL_RANK[ex.level] <= maxRank;
    const okEquip = !equipmentAvailable || !ex.equipment || equipmentAvailable.includes(ex.equipment);
    return okLevel && okEquip;
  });
  if (eligible.length === 0) return [];

  const fresh = eligible.filter((ex) => !recentExerciseNames.includes(ex.name));
  const pool = fresh.length >= count ? fresh : eligible; // fall back to repeats rather than an empty session

  return [...pool]
    .sort((a, b) => (b.secondary?.length ?? 0) - (a.secondary?.length ?? 0))
    .slice(0, count);
}

/** Finds the exercise + its category/training by name, since a plan only carries the name. */
function locateExercise(exerciseName, trainingId = null) {
  const searchSpace = trainingId ? [byId[trainingId]].filter(Boolean) : TRAININGS;
  for (const training of searchSpace) {
    for (const category of training.categories) {
      const ex = category.exercises.find((e) => e.name === exerciseName);
      if (ex) return { training, category, exercise: ex };
    }
  }
  return null;
}

/**
 * Swap suggestions for one exercise: other moves in the SAME category (same primary target
 * muscle, guaranteed by the library's structure) ranked by how similar the stimulus is --
 * secondary-muscle overlap first, then how close the difficulty level is to the original. The
 * top result is the recommendation; the rest are viable alternatives, not padding.
 *
 * excludeNames: a HARD exclusion, no fallback -- pass every exercise already sitting in
 * today's plan (including the one being swapped out) so a swap can never create a duplicate
 * within the same session.
 * recentExerciseNames: a SOFT exclusion (this week's history) -- avoided when possible, but
 * falls back to allowing a repeat rather than returning nothing if that is the only option,
 * same "fresh vs. pool" pattern selectExercisesForCategory uses.
 */
export function findAlternatives({ exerciseName, trainingId = null, level = null, equipmentAvailable = null, excludeNames = [], recentExerciseNames = [], count = 4 }) {
  const located = locateExercise(exerciseName, trainingId);
  if (!located) return [];
  const { category, exercise: original } = located;
  const maxRank = LEVEL_RANK[level ?? original.level] ?? 1;
  const hardExcluded = new Set([original.name, ...excludeNames]);

  const eligible = category.exercises.filter((ex) => {
    if (hardExcluded.has(ex.name)) return false;
    const okLevel = LEVEL_RANK[ex.level] <= maxRank;
    const okEquip = !equipmentAvailable || !ex.equipment || equipmentAvailable.includes(ex.equipment);
    return okLevel && okEquip;
  });

  const fresh = eligible.filter((ex) => !recentExerciseNames.includes(ex.name));
  const candidates = fresh.length ? fresh : eligible; // weekly-repeat avoidance is best-effort only

  const originalSecondary = new Set(original.secondary || []);
  const scored = candidates.map((ex) => {
    const overlap = (ex.secondary || []).filter((m) => originalSecondary.has(m)).length;
    const levelDistance = Math.abs(LEVEL_RANK[ex.level] - LEVEL_RANK[original.level]);
    const sameEquipment = ex.equipment === original.equipment ? 1 : 0;
    return { ex, score: overlap * 3 + sameEquipment - levelDistance };
  });

  const ranked = scored.sort((a, b) => b.score - a.score).slice(0, count).map((s) => s.ex);
  return ranked.map((ex, i) => ({
    name: ex.name, primary: ex.primary, secondary: ex.secondary,
    equipment: ex.equipment, level: ex.level, recommended: i === 0,
  }));
}

// ---------------------------------------------------------------------------
// Progressive overload as a formula, not a prompt instruction (see
// ../principles/progressive-overload.md). Isolation/small-joint moves get a smaller jump than
// barbell compounds -- inferred from equipment, since the library already tags it.
// ---------------------------------------------------------------------------
export function incrementForEquipment(equipment) {
  return { barbell: 5, machine: 5, cable: 2.5, dumbbell: 2.5, bodyweight: 0 }[equipment] ?? 2.5;
}

/**
 * lastLog: { weight, repsAchieved, targetReps } for this exact exercise, or null with no history.
 * Returns the weight to prescribe today, or null if there's no history AND no cold-start table
 * hit -- caller should fall back to asking the trainee or a conservative guess in that case.
 */
export function progressiveOverload({ lastLog, equipment }) {
  if (!lastLog) return null;
  const hitTarget = lastLog.repsAchieved >= lastLog.targetReps;
  if (!hitTarget) return lastLog.weight; // missed reps: hold, don't push a lift they just failed
  return lastLog.weight + incrementForEquipment(equipment);
}

// Rough bodyweight-multiplier starting points for a cold start on the handful of exercises
// almost everyone eventually does, so a first-ever session doesn't need an AI guess either.
// Approximate and intentionally conservative -- meant as a safe starting point, not a standard.
export const COLD_START_MULTIPLIER = {
  "Barbell Back Squat": { beginner: 0.5, intermediate: 0.9, advanced: 1.3 },
  "Barbell Bench Press": { beginner: 0.4, intermediate: 0.7, advanced: 1.0 },
  "Deadlift": { beginner: 0.6, intermediate: 1.1, advanced: 1.6 },
  "Overhead Press": { beginner: 0.25, intermediate: 0.45, advanced: 0.65 },
  "Barbell Row": { beginner: 0.4, intermediate: 0.6, advanced: 0.85 },
};

export function coldStartWeight(exerciseName, level, bodyWeightLb) {
  const table = COLD_START_MULTIPLIER[exerciseName];
  if (table && bodyWeightLb) {
    return Math.round((bodyWeightLb * table[level]) / 2.5) * 2.5;
  }
  return null;
}

// Fallback for every exercise NOT in the named-lift table above -- which, for a circuit-style
// session, is most of them (dumbbell/cable/machine variety, not the 5 big barbell lifts).
// Deliberately light and equipment-general rather than exercise-specific: the point is to give
// a real, non-zero, safe-to-attempt first number so the trainee isn't left guessing, not to be
// precise -- progressiveOverload()/RPE self-correct it within a session or two either way.
const GENERIC_COLD_START_FRACTION = { barbell: 0.35, machine: 0.25, cable: 0.15, dumbbell: 0.12 };

export function genericColdStartWeight(equipment, level, bodyWeightLb) {
  const frac = GENERIC_COLD_START_FRACTION[equipment];
  if (!frac || !bodyWeightLb) return null;
  const levelScale = { beginner: 0.7, intermediate: 1, advanced: 1.3 }[level] ?? 1;
  const raw = bodyWeightLb * frac * levelScale;
  const rounded = equipment === "dumbbell" || equipment === "cable" ? 2.5 : 5;
  return Math.max(rounded, Math.round(raw / rounded) * rounded);
}


// ---------------------------------------------------------------------------
// Day names and deloads -- both flagged directly in BRIEF-workout-algorithm.md's known
// bugs. Circuit sessions hit the same 5 movement patterns every day by design, so naming
// them by category would be noisy; a full-body circuit is legitimately just "Full Body
// Circuit" every time, with a letter to distinguish the week's sessions from each other.
// Split-style sessions get named from whichever categories they actually cover.
// ---------------------------------------------------------------------------
const CATEGORY_LABELS = {
  chest: "Chest", lats: "Back", traps: "Traps", shoulders: "Shoulders",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms", quads: "Legs",
  hamstrings: "Hamstrings", glutes: "Glutes", calves: "Calves",
  abs: "Abs", obliques: "Core", lowerback: "Lower Back",
};

export function nameForDay({ categories, sessionStyle, dayIndex = 0 }) {
  if (sessionStyle === "circuit") {
    return `Full Body Circuit ${String.fromCharCode(65 + (dayIndex % 26))}`; // A, B, C...
  }
  const labels = [...new Set(categories.map((c) => CATEGORY_LABELS[c] || c))].slice(0, 2);
  return labels.length ? `${labels.join(" & ")} Day` : "Training Day";
}

// ---------------------------------------------------------------------------
// Deload detection (see ../principles/periodization-deloads.md): not on a rigid calendar,
// triggered by real signals, with a floor so fatigue that isn't consciously felt still gets
// addressed. A deload week keeps intensity normal and cuts volume roughly in half.
// ---------------------------------------------------------------------------
export function shouldDeload({ weeksSinceLastDeload = 0, missedRepStreak = 0, risingRpeStreak = 0 }) {
  if (missedRepStreak >= 2) return true;   // reps missed across 2+ consecutive sessions
  if (risingRpeStreak >= 2) return true;   // RPE creeping up at the same weight, 2+ sessions
  if (weeksSinceLastDeload >= 8) return true; // floor: fatigue accrues even unfelt
  return false;
}

export function applyDeload(sets, isDeloadWeek) {
  return isDeloadWeek ? Math.max(1, Math.round(sets / 2)) : sets;
}


export function buildWeightTrainingPlan({
  level, goal, weeklyVolumeByCategory = {}, recentExerciseNames = [],
  equipmentAvailable = null, historyByExercise = {}, bodyWeightLb = null,
  focusCategoryCount = 2, exercisesPerCategory = 2, dayIndex = 0, isDeloadWeek = false,
}) {
  const isCircuit = sessionStyleForGoal(goal) === "circuit";
  const categories = isCircuit
    ? pickCircuitCategories({ level, weeklyVolumeByCategory })
    : pickFocusCategories({ level, weeklyVolumeByCategory, count: focusCategoryCount });
  // Circuit sessions cover 5 movement patterns in one exercise each (full-body every time);
  // split-style sessions go deeper on fewer categories instead.
  const perCategoryCount = isCircuit ? 1 : exercisesPerCategory;
  const reps = repsForGoal(goal);
  const sets = applyDeload(setsPerExercise(level), isDeloadWeek);

  const exercises = categories.flatMap((categoryKey) =>
    selectExercisesForCategory({
      trainingId: "weight-training", categoryKey, level, equipmentAvailable,
      recentExerciseNames, count: perCategoryCount,
    }).map((ex) => {
      const lastLog = historyByExercise[ex.name] || null;
      const isBodyweight = ex.equipment === "bodyweight";
      // null (not 0) means "no formula-backed number yet" -- 0 would read as a real
      // prescription. Bodyweight moves have no load at all, which is a different, known 0.
      const weight = isBodyweight
        ? 0
        : progressiveOverload({ lastLog, equipment: ex.equipment })
          ?? coldStartWeight(ex.name, level, bodyWeightLb)
          ?? genericColdStartWeight(ex.equipment, level, bodyWeightLb)
          ?? null;
      if (ex.isHold) {
        return {
          name: ex.name, sets, reps: null, holdSeconds: progressiveHold({ lastLog, level }),
          targetWeight: isBodyweight ? 0 : weight, isEstimate: false,
          primary: ex.primary, equipment: ex.equipment, level: ex.level, isHold: true,
        };
      }
      return {
        name: ex.name, sets, reps, targetWeight: weight,
        isEstimate: !isBodyweight && weight != null && !lastLog,
        primary: ex.primary, equipment: ex.equipment, level: ex.level,
      };
    })
  );

  const sessionStyle = sessionStyleForGoal(goal);
  return {
    trainingId: "weight-training", focusCategories: categories, exercises,
    dayName: nameForDay({ categories, sessionStyle, dayIndex }),
    sessionStyle, restSeconds: restSecondsForGoal(goal), isDeloadWeek,
  };
}

// ---------------------------------------------------------------------------
// How much time available maps to how many exercises fit. ~7 min per exercise covers warm-up
// sets, working sets, and rest -- rough, but good enough to keep a 30-min session from getting
// an 8-exercise plan.
// ---------------------------------------------------------------------------
export function sessionCapacity(minutesAvailable) {
  const totalExercises = Math.max(2, Math.min(10, Math.round((minutesAvailable || 45) / 7)));
  const focusCategoryCount = totalExercises <= 4 ? 1 : totalExercises <= 7 ? 2 : 3;
  const exercisesPerCategory = Math.max(1, Math.round(totalExercises / focusCategoryCount));
  return { focusCategoryCount, exercisesPerCategory };
}

// ---------------------------------------------------------------------------
// A week at a time: each day folds into the running weekly volume/variety totals before the
// next day is generated, so day 4 already "knows" what days 1-3 did -- the same mechanic that
// makes today's plan depend on yesterday's real logged history once this is wired into the app.
// ---------------------------------------------------------------------------
export function buildWeekPlan({ level, goal, daysPerWeek = 4, equipmentAvailable = null, bodyWeightLb = null, focusCategoryCount = 2, exercisesPerCategory = 2, weeksSinceLastDeload = 0, missedRepStreak = 0, risingRpeStreak = 0 }) {
  const days = [];
  let weeklyVolumeByCategory = {};
  let recentExerciseNames = [];
  const isDeloadWeek = shouldDeload({ weeksSinceLastDeload, missedRepStreak, risingRpeStreak });

  for (let day = 0; day < daysPerWeek; day++) {
    const plan = buildWeightTrainingPlan({
      level, goal, weeklyVolumeByCategory, recentExerciseNames, equipmentAvailable, bodyWeightLb,
      focusCategoryCount, exercisesPerCategory, dayIndex: day, isDeloadWeek,
    });
    days.push(plan);

    plan.exercises.forEach((ex) => {
      (ex.primary || []).forEach((m) => { weeklyVolumeByCategory[m] = (weeklyVolumeByCategory[m] || 0) + ex.sets; });
    });
    recentExerciseNames = [...new Set([...recentExerciseNames, ...plan.exercises.map((e) => e.name)])].slice(-12);
  }
  return days;
}

// ---------------------------------------------------------------------------
// Calisthenics: rotate push/pull/legs/core, pick each move's progression rung at the
// trainee's level (a calisthenics "level" IS the progression rung, not a separate concept).
// ---------------------------------------------------------------------------
const CALISTHENICS_ROTATION = ["push", "pull", "legs", "core-statics"];

export function buildCalisthenicsPlan({ level, lastFocusKey = null, recentExerciseNames = [], count = 4 }) {
  const rotation = CALISTHENICS_ROTATION.filter((k) => k !== lastFocusKey);
  const focusKey = (rotation.length ? rotation : CALISTHENICS_ROTATION)[0];
  const exercises = selectExercisesForCategory({
    trainingId: "calisthenics", categoryKey: focusKey, level,
    equipmentAvailable: null, recentExerciseNames, count,
  });
  return { trainingId: "calisthenics", focusCategories: [focusKey], exercises: exercises.map((ex) => ({ ...ex, sets: setsPerExercise(level), reps: repsForGoal("hypertrophy") })) };
}

// ---------------------------------------------------------------------------
// Yoga / Pilates: duration-based, so the "plan" is a pose/move sequence sized to fill the
// requested minutes rather than a sets x reps prescription. ~2.5 min per pose including a
// transition/hold is a reasonable class pace.
// ---------------------------------------------------------------------------
const MINUTES_PER_POSE = 2.5;

export function buildFlowPlan({ trainingId, level, targetMinutes = 30, categoriesToTouch = null }) {
  const training = byId[trainingId];
  if (!training) return { trainingId, exercises: [] };
  const categories = categoriesToTouch ?? training.categories.map((c) => c.key);
  const totalPoses = Math.max(4, Math.round(targetMinutes / MINUTES_PER_POSE));
  const perCategory = Math.max(1, Math.round(totalPoses / categories.length));

  const exercises = categories.flatMap((categoryKey) =>
    selectExercisesForCategory({ trainingId, categoryKey, level, equipmentAvailable: null, count: perCategory })
  );
  return { trainingId, focusCategories: categories, exercises: exercises.slice(0, totalPoses) };
}
