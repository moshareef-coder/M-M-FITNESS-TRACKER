// Turns a numeric goal ("lose 20 lbs", "gain 30 lbs") into a daily calorie target and a
// realistic timeline, built on top of TDEE (tdee.mjs). Uses the widely-cited ~3500 kcal per
// pound of body fat approximation -- it is a rough model, not exact (metabolic adaptation and
// water-weight shifts mean real progress deviates from a straight line), which is exactly why
// this recommends a *rate*, not a single hard number, and errs conservative.

/** Safe, sustainable weekly rate of change for a goal, in lb/week. Loss scales gently with
 *  current body weight (a heavier starting point can safely lose a bit faster); gain does not,
 *  since lean-mass gain has a hard physiological ceiling regardless of size. */
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
  const weeklyRateLb = recommendedWeeklyRateLb(direction, currentWeightLb);
  const weeks = Math.ceil(targetChangeLb / weeklyRateLb);
  const dailyCalorieAdjustment = Math.round((weeklyRateLb * 3500) / 7);
  const dailyCalorieTarget = direction === "lose" ? tdee - dailyCalorieAdjustment : tdee + dailyCalorieAdjustment;
  return { weeklyRateLb, weeks, dailyCalorieTarget, dailyCalorieAdjustment, direction };
}
