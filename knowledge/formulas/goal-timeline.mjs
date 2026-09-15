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

// Surplus side (build-muscle goal) had no cap at all until this pass -- a flat 0.5lb/week
// regardless of experience meant an advanced trainee (who can't build muscle nearly that fast)
// got the same surplus as a beginner, with nothing stopping the excess from just becoming fat.
// Helms, Aragon & Fitschen (2014) anchor: roughly 0.5-1% bodyweight/week for natural lifters,
// tapering as training age increases -- see ../principles/build-muscle-training.md. Capped in
// absolute kcal/day (not %TDEE like the deficit) because that's how the underlying research and
// every corroborating source expresses it.
export const MAX_SURPLUS_KCAL_PER_DAY = { beginner: 500, intermediate: 400, advanced: 300 };

/** Safe, sustainable weekly rate of change for a goal, in lb/week, BEFORE the TDEE-relative cap
 *  is applied below. Loss scales gently with current body weight (a heavier starting point can
 *  safely lose a bit faster). Gain scales by BOTH body weight and experience level -- lean-mass
 *  gain has a hard physiological ceiling that gets lower the more trained someone already is,
 *  unlike fat loss which stays roughly proportional to size regardless of training age. */
export function recommendedWeeklyRateLb(direction, currentWeightLb, level = "beginner") {
  if (direction === "gain") {
    const pct = { beginner: 0.0075, intermediate: 0.005, advanced: 0.0025 }[level] ?? 0.005;
    return Math.max(0.25, Math.round((currentWeightLb || 150) * pct * 2) / 2);
  }
  const scaled = (currentWeightLb || 150) * 0.0075; // ~0.75% of body weight per week
  return Math.min(2, Math.max(0.5, Math.round(scaled * 2) / 2)); // clamp to 0.5-2 lb/week, nearest half-pound
}

/**
 * targetChangeLb: positive number, how much to lose or gain (not signed).
 * direction: "lose" | "gain".
 * tdee: from calculateTDEE() in tdee.mjs.
 * level: experience tier (see experience-tiers.md) -- only affects the "gain" direction's cap.
 * Returns null if there isn't enough data to compute anything meaningful.
 */
export function estimateGoalTimeline({ currentWeightLb, targetChangeLb, direction, tdee, level = "beginner", rateLbOverride = null }) {
  if (!targetChangeLb || !tdee) return null;

  const uncappedRateLb = rateLbOverride ?? recommendedWeeklyRateLb(direction, currentWeightLb, level);
  let dailyCalorieAdjustment = Math.round((uncappedRateLb * 3500) / 7);

  if (direction === "lose") {
    dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, Math.round(tdee * MAX_DEFICIT_PERCENT_OF_TDEE));
    dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, tdee - MIN_DAILY_CALORIES);
    dailyCalorieAdjustment = Math.max(0, dailyCalorieAdjustment); // TDEE already at/under the floor: no safe deficit to give
  } else if (direction === "gain") {
    dailyCalorieAdjustment = Math.min(dailyCalorieAdjustment, MAX_SURPLUS_KCAL_PER_DAY[level] ?? 400);
  }

  const dailyCalorieTarget = direction === "lose" ? tdee - dailyCalorieAdjustment : tdee + dailyCalorieAdjustment;
  const weeklyRateLb = Math.round(((dailyCalorieAdjustment * 7) / 3500) * 10) / 10; // the rate actually implied after capping, not the uncapped ask
  const weeks = weeklyRateLb > 0 ? Math.ceil(targetChangeLb / weeklyRateLb) : null;

  return { weeklyRateLb, weeks, dailyCalorieTarget, dailyCalorieAdjustment, direction, wasCapped: dailyCalorieAdjustment < Math.round((uncappedRateLb * 3500) / 7) };
}

/**
 * The onboarding "How fast?" screen (index.html) currently shows three hardcoded week counts
 * (12/8/16) to every person regardless of their weight, TDEE, or target amount -- a search of
 * index.html shows estimateGoalTimeline() is never actually called there today. This is the
 * real, personalized replacement: three genuine paces computed from this person's own numbers,
 * where "Quicker" pushes the uncapped rate up 50% but still passes through the exact same
 * MAX_DEFICIT_PERCENT_OF_TDEE / MAX_SURPLUS_KCAL_PER_DAY cap as every other tier -- it can
 * never land on an unsafe number, by construction, not by hoping the UI enforces it separately.
 * "Gentle" is a deliberately slower, uncapped-anyway rate for people who want more margin.
 */
export function paceOptions({ currentWeightLb, targetChangeLb, direction, tdee, level = "beginner" }) {
  const steady = estimateGoalTimeline({ currentWeightLb, targetChangeLb, direction, tdee, level });
  if (!steady) return null;

  const baseRate = recommendedWeeklyRateLb(direction, currentWeightLb, level);
  const quicker = estimateGoalTimeline({
    currentWeightLb, targetChangeLb, direction, tdee, level, rateLbOverride: baseRate * 1.5,
  });
  const gentle = estimateGoalTimeline({
    currentWeightLb, targetChangeLb, direction, tdee, level, rateLbOverride: baseRate * 0.6,
  });

  // When Steady is already at the safety cap, "Quicker" lands on the exact same capped number
  // -- there's no safe faster rate to offer. Surfacing this explicitly rather than silently
  // showing two buttons with different week-labels but identical underlying targets, which
  // would look like a real choice when it isn't one.
  const quickerMatchesSteady = quicker.dailyCalorieAdjustment === steady.dailyCalorieAdjustment;

  return { steady, quicker, gentle, quickerMatchesSteady };
}
