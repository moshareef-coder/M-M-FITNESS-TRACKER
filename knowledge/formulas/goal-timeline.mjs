// Turns a numeric goal ("lose 20 lbs", "gain 30 lbs") into a daily calorie target and a
// realistic timeline, built on top of TDEE (tdee.mjs). Uses the widely-cited ~3500 kcal per
// pound of body fat approximation -- it is a rough model, not exact (metabolic adaptation and
// water-weight shifts mean real progress deviates from a straight line), which is exactly why
// this recommends a *rate*, not a single hard number, and errs conservative.

// A deficit sized purely off body weight, with no reference to TDEE, can demand an unsafely
// large PERCENTAGE cut for someone whose maintenance calories are already low (e.g. a smaller,
// sedentary person) -- caught by testing: a 220lb sedentary profile landed at a 37% deficit and
// a 1,264 kcal/day target. Two independent caps fix that: the deficit itself never exceeds this
// share of TDEE (the widely-cited sustainable range across mainstream trainers and dietitians is
// roughly 15-20%; this uses the conservative end since every trainer whose approach informed
// this app explicitly favored sustainability over speed), and the resulting target never drops
// below a standard conservative floor either.
export const MAX_DEFICIT_PERCENT_OF_TDEE = 0.20;
export const MIN_DAILY_CALORIES = 1200;

/** Safe, sustainable weekly rate of change for a goal, in lb/week, BEFORE the TDEE-relative cap
 *  is applied below. Loss scales gently with current body weight (a heavier starting point can
 *  safely lose a bit faster); gain does not, since lean-mass gain has a hard physiological
 *  ceiling regardless of size. */
export function recommendedWeeklyRateLb(direction, currentWeightLb) {
  if (direction === "gain") return 0.5;
  const scaled = (currentWeightLb || 150) * 0.0075; // ~0.75% of body weight per week
  return Math.min(2, Math.max(0.5, Math.round(scaled * 2) / 2)); // clamp to 0.5-2 lb/week, nearest half-pound
}

/**
 * targetChangeLb: positive number, how much to lose or gain (not signed).
 * direction: "lose" | "gain".
 * tdee: from calculateTDEE() in tdee.mjs.
 * Returns null if there isn't enough data to compute anything meaningful.
 */
export function estimateGoalTimeline({ currentWeightLb, targetChangeLb, direction, tdee }) {
  if (!targetChangeLb || !tdee) return null;

  const uncappedRateLb = recommendedWeeklyRateLb(direction, currentWeightLb);
  let dailyCalorieAdjustment = Math.round((uncappedRateLb * 3500) / 7);

  if (direction === "lose") {
    dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, Math.round(tdee * MAX_DEFICIT_PERCENT_OF_TDEE));
    dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, tdee - MIN_DAILY_CALORIES);
    dailyCalorieAdjustment = Math.max(0, dailyCalorieAdjustment); // TDEE already at/under the floor: no safe deficit to give
  }

  const dailyCalorieTarget = direction === "lose" ? tdee - dailyCalorieAdjustment : tdee + dailyCalorieAdjustment;
  const weeklyRateLb = Math.round(((dailyCalorieAdjustment * 7) / 3500) * 10) / 10; // the rate actually implied after capping, not the uncapped ask
  const weeks = weeklyRateLb > 0 ? Math.ceil(targetChangeLb / weeklyRateLb) : null;

  return { weeklyRateLb, weeks, dailyCalorieTarget, dailyCalorieAdjustment, direction, wasCapped: dailyCalorieAdjustment < Math.round((uncappedRateLb * 3500) / 7) };
}
