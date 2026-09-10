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

/* Same four tier scale plan.mjs uses. The library only ever tags beginner,
   intermediate or advanced, but a derived training age can come back "novice",
   so the user's level needs the middle rung the library does not have. */
const LEVEL_RANK = { beginner: 0, novice: 1, intermediate: 2, advanced: 3 };
const rankOf = (lvl) => LEVEL_RANK[lvl] ?? 0;

/* The scoring rule, highest weight first. Weights are spaced so that the order
   of the terms is the order of their authority: no amount of level or equipment
   agreement can outrank one more shared secondary muscle.

     +3  x how much of the original's secondary work it reproduces (0 to 3)
     +2  same movement pattern
     -1  per level step away from the user
     -1  extra if it is HARDER than the user, so ties break toward the easier one
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

   Level distance is measured from the user rather than from the original
   (Jawa measures from the original) because the original was already chosen
   against the user's level, and the failure we care about is handing somebody a
   movement above their technique. Symmetric distance would rate an advanced
   variant and an easier variant equally; the -1 asymmetry says it should not. */
export const SCORE_WEIGHTS = { secondary: 3, pattern: 2, levelStep: -1, harder: -1, sameEquipment: 0.5 };

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
 * @param {string}   opts.level      the USER's level (may be "novice")
 * @param {string[]|null} opts.equipment  what they have, or null for everything
 * @param {string[]} opts.exclude    names already spoken for today
 * @param {number}   opts.count      how many to return
 * @returns {Array<{name,equipment,level,score,why}>} best first
 */
export function scoreAlternatives({
  exercise, pool = [], level = "beginner", equipment = null, exclude = [], count = 4,
} = {}) {
  if (!exercise) return [];
  const original = exercise;
  const originalPrimary = arr(original.primary);
  const originalSecondary = new Set(arr(original.secondary));
  const originalPattern = patternFor(original);
  const userRank = rankOf(level);
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
    const levelDelta = exRank - userRank;

    const score = overlap * SCORE_WEIGHTS.secondary
      + (samePattern ? SCORE_WEIGHTS.pattern : 0)
      + Math.abs(levelDelta) * SCORE_WEIGHTS.levelStep
      + (levelDelta > 0 ? SCORE_WEIGHTS.harder : 0)
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

  /* research/05's conservative tie break: a draw goes to the lower level. Name
     last so the same inputs always produce the same list. */
  scored.sort((a, b) => b.score - a.score || a._rank - b._rank || a.name.localeCompare(b.name));
  return scored.slice(0, Math.max(0, count)).map(({ _rank, ...rest }) => rest);
}
