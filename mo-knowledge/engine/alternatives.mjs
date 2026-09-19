/* Scored alternatives: given an exercise and the pool it was picked from, rank
 * the other exercises by how close a substitute each one really is.
 *
 * Why this file exists. The engine already computed a swap for every exercise,
 * but it took the first unused row of an already ranked pool, and that pool is
 * ranked for picking a MAIN lift (familiar first, then level closest to yours).
 * "Next row down from the thing I am replacing" is not the same question as
 * "nearest stimulus to the thing I am replacing", which is how a swap could
 * come back materially easier or harder than the lift it stood in for without
 * ever saying so. engine/README.md, Wave 1 finding 2.
 *
 * The approach is lifted from reading `knowledge/formulas/exercise-selector.mjs`
 * `findAlternatives` (Jawa's): rank by secondary muscle overlap first, then by
 * how close the level is. Read only, nothing under knowledge/ was edited. Two
 * things are ours: movement pattern is scored too, via `patternFor`, because a
 * row and a pulldown share every muscle and are not interchangeable; and level
 * distance is measured against the USER, not against the original exercise, and
 * is asymmetric, because a swap you cannot do safely is not a swap.
 *
 * Pure. Imports one helper from load.mjs and nothing else.
 */
import { patternFor } from "./load.mjs";

/* How hard a MOVEMENT is, the same scale plan.mjs reads. It is the library's own
   field and a property of the exercise. What used to be here as well was a rank
   for the USER, on the same scale, so the two could be subtracted. That is gone
   with the training level: see plan.mjs, MOVEMENT_RANK. */
const MOVEMENT_RANK = { beginner: 0, novice: 0, intermediate: 1, advanced: 2 };
const rankOf = (lvl) => MOVEMENT_RANK[lvl] ?? MOVEMENT_RANK.advanced;

/* The scoring rule, highest weight first. Weights are spaced so that the order
   of the terms is the order of their authority: no amount of level or equipment
   agreement can outrank one more shared secondary muscle.

     +3  x how much of the original's secondary work it reproduces (0 to 3)
     +2  same movement pattern
     -1  per step HARDER than the lift it is replacing, 0 for easier
     +1.5 they have already done this one
     +0.5 same equipment as the original

   Every term is bounded by its own weight, so the ORDER of the terms is their
   authority: full agreement on secondary muscles can outrank the pattern bonus,
   and no pile of level and equipment agreement can outrank either.

   Coverage, not Jaccard and not a raw count. Coverage is |shared| / |the
   original's secondary list|: how much of the supporting work this substitute
   reproduces. Jaccard would penalise an exercise for hitting MORE muscles than
   the original, which is not a reason to reject a substitute; extra muscles are
   free. A raw count is worse still, and it is worth saying why, because it was
   the first thing tried here and it produced a bad answer: Walking Lunge shares
   two secondary muscles with Barbell Back Squat and Goblet Squat shares one, so
   an uncapped count put a LUNGE above a goblet squat as the swap for a back
   squat, which is exactly the "the swap was a materially different movement"
   failure this file exists to fix. Bounded coverage lets the pattern bonus
   decide that one, correctly. An original with no secondary muscles listed
   scores 0 here for everyone, because the term carries no information then.

   Difficulty is now measured from the ORIGINAL rather than from the user, which
   is where Jawa measures it from and where it always belonged. The old rule
   subtracted a rank on the exercise from a rank on the person, and the person
   half of that no longer exists: there is no beginner, intermediate or advanced
   user here any more. What survives is the part that was doing the work anyway,
   which is asymmetry. A swap harder than the lift it replaces is a swap somebody
   may not be able to do; a swap easier than it is always available to them. So
   harder costs and easier is free, and a draw goes to the simpler movement.

   `earned` is the replacement for the term that knew who the lifter was, and it
   knows something better: whether they have actually done this movement. Worth
   1.5, which can beat a pattern match but never a full secondary-muscle
   coverage, because a movement they have done is a strong hint and not a reason
   to hand back something that trains the wrong thing. */
export const SCORE_WEIGHTS = { secondary: 3, pattern: 2, harderStep: -1, earned: 1.5, sameEquipment: 0.5 };

const arr = (v) => (Array.isArray(v) ? v : []);

/* Bodyweight is always allowed, whatever the equipment list says. Somebody who
   ticked "dumbbells only" still owns the floor, and the alternative to a bench
   press when the bench is taken is a push-up. */
function equipmentAllowed(ex, equipment) {
  if (!equipment || !equipment.length) return true;
  if (ex.equipment === "bodyweight" || !ex.equipment) return true;
  return equipment.includes(ex.equipment);
}

/* A short plain sentence, written for the person doing the lift rather than for
   a log line. Reason first (why it is the same), caveat second (what changes),
   never more than two clauses. */
function whyFor({ ex, original, overlap, samePattern, levelDelta }) {
  /* `levelDelta` is now measured against the lift being replaced rather than
     against the lifter, which is what these three sentences always claimed to
     be describing: "easier version of the same movement" is a statement about
     two exercises. */
  const lead = levelDelta < 0
    ? (samePattern ? "Easier version of the same movement" : "Easier, and works the same muscle")
    : levelDelta > 0
      ? (samePattern ? "A step up from the same movement" : "Harder, same muscle")
      : samePattern
        ? (overlap > 0 ? "Same movement, same supporting muscles" : "Same movement pattern")
        : (overlap > 0 ? "Same muscles, different movement" : "Same primary muscle, different movement");

  let kit = null;
  if (ex.equipment !== original.equipment) {
    if (ex.equipment === "bodyweight") kit = "no equipment needed";
    else if (original.equipment === "barbell") kit = "no barbell needed";
    else if (original.equipment === "bodyweight") kit = `uses a ${ex.equipment}`;
    else kit = `${ex.equipment} instead`;
  }
  return kit ? `${lead}, ${kit}` : lead;
}

/**
 * Rank substitutes for one exercise.
 *
 * Same primary muscle group is a filter, not a score: an alternative that does
 * not train the thing the slot exists to train is not an alternative, it is a
 * different exercise. So is the equipment list, and so is `exclude`.
 *
 * @param {object}   opts.exercise   the library entry being replaced
 * @param {object[]} opts.pool       library entries to choose from
 * @param {Set<string>|null} opts.earned  lowercased names this person has done
 * @param {string[]|null} opts.equipment  what they have, or null for everything
 * @param {string[]} opts.exclude    names already spoken for today
 * @param {number}   opts.count      how many to return
 * @returns {Array<{name,equipment,level,score,why}>} best first
 */
/* Eligibility is deliberately NOT applied here, and that is not an oversight.
   plan.mjs will not PRESCRIBE a movement somebody has not earned; this is the
   list they choose from, and choosing from it is exactly the explicit selection
   that earns a movement in the first place. Narrowing a menu to the things
   somebody has already picked is how an app stops being able to offer anybody
   anything new. */
export function scoreAlternatives({
  exercise, pool = [], earned = null, equipment = null, exclude = [], count = 4,
} = {}) {
  if (!exercise) return [];
  const original = exercise;
  const originalPrimary = arr(original.primary);
  const originalSecondary = new Set(arr(original.secondary));
  const originalPattern = patternFor(original);
  const originalRank = rankOf(original.level);
  const hasDone = (name) => Boolean(earned && earned.has(String(name).toLowerCase()));
  const blocked = new Set([original.name, ...arr(exclude)]);

  /* By name, not an array. Fourteen names in this library exist in two
     trainings at once (Push-Up and Pull-Up are in weight-training AND in
     calisthenics, Plank is in three), so a pool built across libraries hands
     the same movement back more than once and a list of three alternatives
     could show "Push-Up" twice. Same name is the same movement; the copy that
     scores highest is the one described most fully, so that is the one kept. */
  const byName = new Map();
  for (const ex of arr(pool)) {
    if (!ex || !ex.name || blocked.has(ex.name)) continue;
    /* Required, not scored. */
    if (!arr(ex.primary).some((g) => originalPrimary.includes(g))) continue;
    if (!equipmentAllowed(ex, equipment)) continue;

    const shared = arr(ex.secondary).filter((m) => originalSecondary.has(m)).length;
    const overlap = originalSecondary.size ? shared / originalSecondary.size : 0;
    const samePattern = patternFor(ex) === originalPattern;
    const exRank = rankOf(ex.level);
    const levelDelta = exRank - originalRank;

    const score = overlap * SCORE_WEIGHTS.secondary
      + (samePattern ? SCORE_WEIGHTS.pattern : 0)
      + Math.max(0, levelDelta) * SCORE_WEIGHTS.harderStep
      + (hasDone(ex.name) ? SCORE_WEIGHTS.earned : 0)
      + (ex.equipment === original.equipment ? SCORE_WEIGHTS.sameEquipment : 0);

    const row = {
      name: ex.name,
      equipment: ex.equipment ?? null,
      level: ex.level ?? null,
      score: Math.round(score * 100) / 100,
      why: whyFor({ ex, original, overlap, samePattern, levelDelta }),
      _rank: exRank,
    };
    const seen = byName.get(ex.name);
    if (!seen || row.score > seen.score) byName.set(ex.name, row);
  }

  const scored = [...byName.values()];

  /* research/05's conservative tie break: a draw goes to the simpler movement.
     Name last so the same inputs always produce the same list. */
  scored.sort((a, b) => b.score - a.score || a._rank - b._rank || a.name.localeCompare(b.name));
  return scored.slice(0, Math.max(0, count)).map(({ _rank, ...rest }) => rest);
}
