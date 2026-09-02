// Calorie burn estimates, MET-based (Compendium of Physical Activities). See ../sources.md.
// kcal/min = MET x 3.5 x bodyWeightKg / 200 -- the standard indirect-calorimetry-derived formula.

export const LB_TO_KG = 0.453592;

// MET values for every ACTIVITY_PRESETS entry in index.html, keyed by the exact preset string
// so the app can look this up with zero name-mapping logic. Add an entry here whenever a new
// preset is added there.
//
// Activities where effort swings the burn a lot (a casual pickup game vs. a competitive one,
// an easy jog vs. a tempo run) carry a {light, moderate, vigorous} object instead of one flat
// number -- same three-tier convention as STRENGTH_MET_BY_INTENSITY below. Activities whose
// intensity doesn't realistically vary session to session (stretching, a Pilates class) keep a
// single number. "moderate" is the fallback when no intensity is given, so old calls still work.
export const ACTIVITY_METS = {
  "Pilates": 3.0,
  "Yoga": 2.5,
  "Barre": 3.5,
  "Stretching": 2.3,
  "Running": { light: 8.3, moderate: 9.8, vigorous: 13.5 },       // ~5mph jog / ~6mph / ~8mph tempo
  "Walking": { light: 2.8, moderate: 4.3, vigorous: 5.0 },        // ~2mph / ~3.5mph / ~4.5mph brisk
  "Hiking": { light: 5.3, moderate: 6.0, vigorous: 7.8 },         // flat trail / rolling / loaded pack or steep
  "Cycling": { light: 4.0, moderate: 7.5, vigorous: 10.0 },       // <10mph / 12-14mph / 16-19mph
  "Spin class": { light: 6.8, moderate: 8.5, vigorous: 10.5 },
  "Swimming": { light: 6.0, moderate: 8.3, vigorous: 9.8 },
  "Rowing machine": { light: 4.8, moderate: 7.0, vigorous: 8.5 },
  "Elliptical": { light: 4.0, moderate: 5.0, vigorous: 7.0 },
  "Stair climber": { light: 4.0, moderate: 8.0, vigorous: 9.0 },
  "Boxing": { light: 5.5, moderate: 7.8, vigorous: 9.5 },         // shadow box / bag work / sparring
  "Kickboxing": { light: 6.0, moderate: 7.5, vigorous: 10.0 },
  "HIIT": { light: 6.0, moderate: 8.5, vigorous: 12.0 },
  "CrossFit": { light: 5.5, moderate: 8.0, vigorous: 10.0 },
  "Jump rope": { light: 8.8, moderate: 10.0, vigorous: 12.3 },
  "Dance": { light: 3.5, moderate: 5.5, vigorous: 7.8 },
  "Basketball": { light: 4.5, moderate: 6.5, vigorous: 8.0 },     // shooting around / half-court / competitive full-court
  "Soccer": { light: 5.0, moderate: 7.0, vigorous: 10.0 },        // casual kickabout / recreational / competitive
  "Tennis": { light: 5.0, moderate: 6.0, vigorous: 8.0 },         // doubles / casual singles / competitive singles
  "Climbing": { light: 5.8, moderate: 7.5, vigorous: 9.0 },       // easy top-rope / moderate / hard bouldering
  "Skiing": { light: 5.3, moderate: 6.0, vigorous: 8.0 },
};

// Resistance training has no single MET since it depends on rest-to-work ratio; these three
// tiers span the Compendium's "weight lifting" entries (light/moderate <-> vigorous effort).
export const STRENGTH_MET_BY_INTENSITY = {
  light: 3.5,
  moderate: 5.0,
  vigorous: 6.0,
};

/** kcal burned for a MET value held for `minutes`, scaled by body weight. */
export function caloriesFromMET(met, weightLb, minutes) {
  if (!met || !weightLb || !minutes) return 0;
  const kg = weightLb * LB_TO_KG;
  return Math.round(met * 3.5 * kg / 200 * minutes);
}

/**
 * For a logged cardio/class/sport activity: preset name (from ACTIVITY_PRESETS) + minutes +
 * body weight, optionally + effort ("light" | "moderate" | "vigorous", default "moderate").
 * Activities with a single flat MET (Yoga, Stretching, ...) ignore the intensity argument.
 */
export function estimateActivityCalories(activityName, minutes, weightLb, intensity = "moderate") {
  const entry = ACTIVITY_METS[activityName] ?? 5.0; // generic moderate-effort fallback
  const met = typeof entry === "number" ? entry : (entry[intensity] ?? entry.moderate);
  return caloriesFromMET(met, weightLb, minutes);
}

/** Whether an activity supports the light/moderate/vigorous intensity picker at all. */
export function activityHasIntensity(activityName) {
  return typeof ACTIVITY_METS[activityName] === "object";
}

/**
 * For a logged strength session: infer intensity from rest-to-work ratio rather than
 * guessing, since that's what actually drives energy expenditure in lifting.
 * setCount: number of sets performed. sessionMinutes: total time including rest.
 */
export function estimateStrengthCalories(setCount, sessionMinutes, weightLb) {
  if (!setCount || !sessionMinutes) return 0;
  const minutesPerSet = sessionMinutes / setCount;
  const intensity = minutesPerSet <= 2 ? "vigorous" : minutesPerSet <= 3.5 ? "moderate" : "light";
  return caloriesFromMET(STRENGTH_MET_BY_INTENSITY[intensity], weightLb, sessionMinutes);
}
