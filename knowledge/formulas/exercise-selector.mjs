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
  recomp: [6, 15], // same rep range as hypertrophy -- shared training structure, see below
  general: [8, 12],
};

export function normalizeGoal(goal) {
  const g = (goal || "").toLowerCase();
  // Checked before "muscle" below -- "Recomp (lose fat, gain muscle)" contains "muscle" and
  // would otherwise silently fall into the hypertrophy bucket. That's actually fine for
  // TRAINING structure (recomp wants the same hypertrophy-biased split, see
  // recomp-training.md), which is why this accidentally "worked" until now -- but it would be
  // a real bug the moment calorie logic gets wired to goal, since recomp needs a small
  // deficit, not build-muscle's surplus. Kept as its own explicit bucket so that distinction
  // is visible and correct by design rather than by accident. See isHypertrophyStyle() below
  // for where recomp and hypertrophy should still be treated the same (training structure).
  if (g.includes("recomp")) return "recomp";
  if (g.includes("strong")) return "strength";
  if (g.includes("muscle") || g.includes("hypertrophy") || g.includes("gain")) return "hypertrophy";
  return "general"; // fat loss / general fitness / unspecified
}

// Recomp and hypertrophy share identical TRAINING structure (whole-body, hypertrophy-biased
// split) -- they differ only in calorie direction, which goal-timeline.mjs handles separately.
// Every exercise-selection decision below should use this, not a direct "=== hypertrophy"
// check, so recomp gets the same correct split/volume/day-naming treatment build-muscle does.
export function isHypertrophyStyle(goal) {
  const n = normalizeGoal(goal);
  return n === "hypertrophy" || n === "recomp";
}

/** Sets per exercise today. Beginners get less per movement -- they're doing more total
 *  movements across the same volume target while they're still learning technique.
 *  Hypertrophy sessions run higher (see build-muscle-training.md): the upper/lower split
 *  above covers each muscle with fewer, more-targeted exercises hit ~2x/week, which needs
 *  more sets per exercise than a variety-heavy session to still land near weekly volume
 *  targets -- one exercise at the generic 3 sets would leave most muscles under their own
 *  MEV floor. */
export function setsPerExercise(level, goal = null) {
  if (goal && isHypertrophyStyle(goal)) {
    return { beginner: 4, intermediate: 4, advanced: 5 }[level] ?? 4;
  }
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
  const style = sessionStyleForGoal(goal);
  if (style === "circuit") return 30; // endurance/circuit-style: 30-60s is the real range
  // Strength and hypertrophy both use "traditional" style but need genuinely different rest --
  // a systematic review (Grgic et al. 2017, Sports Medicine) found 3-5 minutes necessary for
  // heavy compound strength work (1-5 reps, 80%+ 1RM); hypertrophy compound work needs less,
  // 2-3 minutes. The old flat 90s for both was right for hypertrophy and far too short for
  // strength -- see get-stronger-training.md.
  if (normalizeGoal(goal) === "strength") return 240; // 4 min, middle of the 3-5 min range
  return 90; // hypertrophy/general: matches 2-3 min compound guidance closely enough as a default
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

/**
 * Bodyweight progression (see ../principles/equipment-substitution.md): reps are the first,
 * weakest lever -- progressed up to a ceiling, same "hit target -> push further, miss it ->
 * hold" shape progressiveOverload() already uses for loaded lifts. Past that ceiling, more
 * reps drifts into muscular-endurance/conditioning territory rather than the intended
 * strength/hypertrophy stimulus, so the right response is a harder variation, not an
 * ever-climbing rep count. This is the fix for a gap flagged since the very first PR:
 * incrementForEquipment("bodyweight") has always returned 0, meaning bodyweight exercises
 * never progressed in the generated plan at all.
 */
const BODYWEIGHT_REP_CEILING = 30; // past here, reps stop testing strength/hypertrophy at all

export function progressiveBodyweightReps({ lastLog, goal }) {
  const [lo, hi] = REP_RANGES[normalizeGoal(goal)];
  const ceiling = Math.min(hi, BODYWEIGHT_REP_CEILING);
  if (!lastLog) return { reps: lo, atCeiling: false };
  if (lastLog.repsAchieved >= ceiling) return { reps: ceiling, atCeiling: true };
  const hitTarget = lastLog.repsAchieved >= lastLog.targetReps;
  const nextReps = hitTarget ? Math.min(ceiling, lastLog.targetReps + 1) : lastLog.targetReps;
  return { reps: nextReps, atCeiling: false };
}

/**
 * Finds the next harder same-category bodyweight variation -- deliberately bypassing the
 * trainee's overall level cap that selectExercisesForCategory applies, since this is a
 * movement-specific signal (capped reps on THIS exercise), not a general trainee-level
 * upgrade, and the two shouldn't be coupled. A true beginner by session count can still be
 * ready for Diamond Push-Up if they've maxed reps on regular Push-Up; making them wait for
 * their overall level to advance would ignore the actual signal in front of it.
 */
export function findHarderBodyweightVariation({ trainingId, categoryKey, currentExerciseName }) {
  const training = byId[trainingId];
  const category = training?.categories.find((c) => c.key === categoryKey);
  if (!category) return null;

  const current = category.exercises.find((ex) => ex.name === currentExerciseName);
  if (!current) return null;
  const currentRank = LEVEL_RANK[current.level] ?? 1;

  const harderOptions = category.exercises
    .filter((ex) => ex.equipment === "bodyweight" && (LEVEL_RANK[ex.level] ?? 1) > currentRank)
    .sort((a, b) => (LEVEL_RANK[a.level] ?? 1) - (LEVEL_RANK[b.level] ?? 1)); // nearest harder tier first, not the biggest jump cataloged

  return harderOptions[0] ?? null; // null at the hardest cataloged variation -- a real, honest limit, not every movement has a next tier
}

/**
 * Once someone has progressed to a harder bodyweight variation, the NEXT session's category
 * selection needs to know that happened -- otherwise selectExercisesForCategory just re-picks
 * the original (now-capped) exercise from the pool every time, re-triggering the same swap
 * repeatedly instead of continuing progression on the new variation. This finds whichever
 * bodyweight exercise in a category has the most recent log, so that one can be used directly
 * instead of falling back to the pool default. Requires callers to stamp a loggedAt timestamp
 * on each history entry -- without one, "most recent" can't be determined, so entries without
 * it are treated as not-yet-logged rather than guessed at.
 */
export function continuedBodyweightExercise({ trainingId, categoryKey, historyByExercise = {} }) {
  const training = byId[trainingId];
  const category = training?.categories.find((c) => c.key === categoryKey);
  if (!category) return null;

  const logged = category.exercises
    .filter((ex) => ex.equipment === "bodyweight" && historyByExercise[ex.name]?.loggedAt)
    .sort((a, b) => historyByExercise[b.name].loggedAt - historyByExercise[a.name].loggedAt);

  return logged[0] ?? null;
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


/**
 * Hypertrophy-goal split (see ../principles/build-muscle-training.md): frequency matters more
 * here than for other goals -- each muscle group benefits from roughly twice-weekly training,
 * not once. pickFocusCategories's small top-N picks would otherwise produce a bro-split that
 * skips whole movement patterns for a week, same failure mode fixed for circuit sessions above.
 * Alternating upper/lower across the week guarantees full coverage AND ~2x/week frequency at
 * once. Core rotates in on every session (most-behind of abs/obliques/lowerback), since ab work
 * is a normal finisher regardless of which half of the body the rest of the session covers.
 */
const HYPERTROPHY_SPLIT = {
  // Forearms and calves are deliberately left off dedicated slots here, same call already
  // made for the circuit fix above -- they get real incidental work from rows/curls and
  // squats/lunges respectively, and a full 7-category upper day would bloat into an
  // unrealistic 12-14 exercise session for little extra benefit.
  upper: ["chest", "lats", "traps", "shoulders", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes"],
  core: ["abs", "obliques", "lowerback"],
};

export function pickSplitCategories({ level, weeklyVolumeByCategory = {}, dayIndex = 0 }) {
  const half = dayIndex % 2 === 0 ? "upper" : "lower";
  const [bestCore] = HYPERTROPHY_SPLIT.core
    .map((key) => {
      const target = weeklyVolumeTarget(key, level) || 1;
      const done = weeklyVolumeByCategory[key] || 0;
      return { key, gap: (target - done) / target };
    })
    .sort((a, b) => b.gap - a.gap);
  return [...HYPERTROPHY_SPLIT[half], bestCore.key];
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

export function nameForDay({ categories, sessionStyle, dayIndex = 0, isHypertrophy = false, isFullBodyPattern = false }) {
  if (sessionStyle === "circuit" || isFullBodyPattern) {
    const label = sessionStyle === "circuit" ? "Full Body Circuit" : "Full Body Strength";
    return `${label} ${String.fromCharCode(65 + (dayIndex % 26))}`; // A, B, C...
  }
  if (isHypertrophy) {
    return dayIndex % 2 === 0 ? "Upper Body Day" : "Lower Body Day";
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
  const isHypertrophy = isHypertrophyStyle(goal);
  const isStrength = normalizeGoal(goal) === "strength";
  // Strength reuses the same movement-pattern full-coverage picker as circuit sessions --
  // pickFocusCategories had the identical skipped-categories bug here (8 of 14 groups, never
  // touching hamstrings/glutes/calves/abs/obliques/lowerback, plus nonsensical pairings like
  // wrist curls with leg press on the same day). Full-body-every-session with heavy compounds
  // is also just how real beginner/intermediate strength programs are actually structured
  // (StrongLifts, Starting Strength) -- this isn't a stretch, it's the standard template.
  // Session style/reps/rest stay strength-appropriate; only category SELECTION is shared with
  // circuit's logic, not circuit's actual pacing.
  const categories = (isCircuit || isStrength)
    ? pickCircuitCategories({ level, weeklyVolumeByCategory })
    : isHypertrophy
      ? pickSplitCategories({ level, weeklyVolumeByCategory, dayIndex })
      : pickFocusCategories({ level, weeklyVolumeByCategory, count: focusCategoryCount });
  // Circuit and strength sessions cover 5 movement patterns in one exercise each (full-body
  // every time); hypertrophy sessions alternate upper/lower for full coverage at ~2x/week
  // frequency; anything else falls back to the older, narrower split logic.
  const perCategoryCount = (isCircuit || isHypertrophy || isStrength) ? 1 : exercisesPerCategory;
  const reps = repsForGoal(goal);
  const sets = applyDeload(setsPerExercise(level, goal), isDeloadWeek);

  const exercises = categories.flatMap((categoryKey) => {
    // Continuation check first: if someone already progressed to a harder bodyweight
    // variation in this category, keep going on that one instead of letting the pool
    // default re-select the original, now-capped exercise every session. Only applies when
    // exactly one exercise is picked per category (circuit/hypertrophy/strength full-body
    // selection) -- multi-exercise categories don't have this "one variation per slot" shape.
    const continued = perCategoryCount === 1
      ? continuedBodyweightExercise({ trainingId: "weight-training", categoryKey, historyByExercise })
      : null;
    const picked = continued ? [continued] : selectExercisesForCategory({
      trainingId: "weight-training", categoryKey, level, equipmentAvailable,
      recentExerciseNames, count: perCategoryCount,
    });

    return picked.map((ex) => {
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
      // Bodyweight progression: reps climb toward a ceiling, then hand off to a harder
      // variation instead of climbing forever -- see progressiveBodyweightReps() above.
      if (isBodyweight) {
        const { reps: bwReps, atCeiling } = progressiveBodyweightReps({ lastLog, goal });
        if (atCeiling) {
          const harder = findHarderBodyweightVariation({ trainingId: "weight-training", categoryKey, currentExerciseName: ex.name });
          if (harder) {
            return {
              name: harder.name, sets, reps: repsForGoal(goal), targetWeight: 0, isEstimate: false,
              primary: harder.primary, equipment: harder.equipment, level: harder.level,
              progressedFrom: ex.name, // so the UI can say "you leveled up from X" rather than silently swap
            };
          }
          // No harder cataloged variation exists -- an honest limit, not a bug. Hold at the
          // ceiling on the current exercise rather than pretending there's somewhere to go.
        }
        return {
          name: ex.name, sets, reps: bwReps, targetWeight: 0, isEstimate: false,
          primary: ex.primary, equipment: ex.equipment, level: ex.level,
          atRepCeiling: atCeiling, // true only when atCeiling AND no harder variation was found
        };
      }
      return {
        name: ex.name, sets, reps, targetWeight: weight,
        isEstimate: !isBodyweight && weight != null && !lastLog,
        primary: ex.primary, equipment: ex.equipment, level: ex.level,
      };
    });
  });

  const sessionStyle = sessionStyleForGoal(goal);
  return {
    trainingId: "weight-training", focusCategories: categories, exercises,
    dayName: nameForDay({ categories, sessionStyle, dayIndex, isHypertrophy, isFullBodyPattern: isStrength }),
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
export function buildWeekPlan({ level, goal, daysPerWeek = 4, equipmentAvailable = null, bodyWeightLb = null, focusCategoryCount = 2, exercisesPerCategory = 2, weeksSinceLastDeload = 0, missedRepStreak = 0, risingRpeStreak = 0, historyByExercise = {} }) {
  const days = [];
  let weeklyVolumeByCategory = {};
  let recentExerciseNames = [];
  const isDeloadWeek = shouldDeload({ weeksSinceLastDeload, missedRepStreak, risingRpeStreak });

  for (let day = 0; day < daysPerWeek; day++) {
    const plan = buildWeightTrainingPlan({
      level, goal, weeklyVolumeByCategory, recentExerciseNames, equipmentAvailable, bodyWeightLb,
      focusCategoryCount, exercisesPerCategory, dayIndex: day, isDeloadWeek, historyByExercise,
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
