// Calorie burn estimates, MET-based (Compendium of Physical Activities). See ../sources.md.
// kcal/min = MET x 3.5 x bodyWeightKg / 200 -- the standard indirect-calorimetry-derived formula.

export const LB_TO_KG = 0.453592;

// MET values for every ACTIVITY_PRESETS entry in index.html, keyed by the exact preset string
// so the app can look this up with zero name-mapping logic. Add an entry here whenever a new
// preset is added there.
export const ACTIVITY_METS = {
  "Pilates": 3.0,
  "Yoga": 2.5,
  "Barre": 3.5,
  "Running": 9.8,       // ~6 mph pace; see estimateCardioMET for pace-adjusted running
  "Walking": 3.5,
  "Hiking": 6.0,
  "Cycling": 7.5,
  "Spin class": 8.5,
  "Swimming": 6.0,
  "Rowing machine": 7.0,
  "Elliptical": 5.0,
  "Stair climber": 8.0,
  "Boxing": 7.8,
  "Kickboxing": 7.5,
  "HIIT": 8.5,
  "CrossFit": 8.0,
  "Jump rope": 10.0,
  "Dance": 5.5,
  "Basketball": 6.5,
  "Soccer": 7.0,
  "Tennis": 6.0,
  "Climbing": 7.5,
  "Skiing": 6.0,
  "Stretching": 2.3,
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

/** For a logged cardio/class activity: preset name (from ACTIVITY_PRESETS) + minutes + body weight. */
export function estimateActivityCalories(activityName, minutes, weightLb) {
  const met = ACTIVITY_METS[activityName] ?? 5.0; // generic moderate-effort fallback
  return caloriesFromMET(met, weightLb, minutes);
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
