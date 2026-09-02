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

// ---------------------------------------------------------------------------
// Rep ranges and set counts by goal (see ../principles/rpe-autoregulation.md).
// ---------------------------------------------------------------------------
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
  if (!table || !bodyWeightLb) return null;
  return Math.round((bodyWeightLb * table[level]) / 2.5) * 2.5; // round to nearest 2.5lb plate
}

// ---------------------------------------------------------------------------
// Weight training: the full plan for one session.
// ---------------------------------------------------------------------------
export function buildWeightTrainingPlan({
  level, goal, weeklyVolumeByCategory = {}, recentExerciseNames = [],
  equipmentAvailable = null, historyByExercise = {}, bodyWeightLb = null,
  focusCategoryCount = 2, exercisesPerCategory = 2,
}) {
  const categories = pickFocusCategories({ level, weeklyVolumeByCategory, count: focusCategoryCount });
  const reps = repsForGoal(goal);
  const sets = setsPerExercise(level);

  const exercises = categories.flatMap((categoryKey) =>
    selectExercisesForCategory({
      trainingId: "weight-training", categoryKey, level, equipmentAvailable,
      recentExerciseNames, count: exercisesPerCategory,
    }).map((ex) => {
      const lastLog = historyByExercise[ex.name] || null;
      const isBodyweight = ex.equipment === "bodyweight";
      // null (not 0) means "no formula-backed number yet" -- 0 would read as a real
      // prescription. Bodyweight moves have no load at all, which is a different, known 0.
      const weight = isBodyweight
        ? 0
        : progressiveOverload({ lastLog, equipment: ex.equipment }) ?? coldStartWeight(ex.name, level, bodyWeightLb) ?? null;
      return {
        name: ex.name, sets, reps, targetWeight: weight,
        isEstimate: !isBodyweight && weight != null && !lastLog,
        primary: ex.primary, equipment: ex.equipment, level: ex.level,
      };
    })
  );

  return { trainingId: "weight-training", focusCategories: categories, exercises };
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
export function buildWeekPlan({ level, goal, daysPerWeek = 4, equipmentAvailable = null, bodyWeightLb = null, focusCategoryCount = 2, exercisesPerCategory = 2 }) {
  const days = [];
  let weeklyVolumeByCategory = {};
  let recentExerciseNames = [];

  for (let day = 0; day < daysPerWeek; day++) {
    const plan = buildWeightTrainingPlan({
      level, goal, weeklyVolumeByCategory, recentExerciseNames, equipmentAvailable, bodyWeightLb,
      focusCategoryCount, exercisesPerCategory,
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
