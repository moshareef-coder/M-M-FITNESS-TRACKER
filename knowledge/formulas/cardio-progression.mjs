// Turns "can you currently run continuously for N seconds" into a week-by-week run/walk
// interval progression toward a continuous-running target. See
// ../principles/build-endurance-training.md.
//
// The core research constraint: cardiovascular fitness adapts within days, but the connective
// tissue that actually gets injured (tendons, shins, bone) adapts over weeks. Progressing faster
// than that mismatch is the leading cause of beginner running injury and dropout -- not a lack of
// willpower. This is why this file exists as its own progression model rather than reusing
// exercise-selector.mjs's set/rep/load machinery, which has nothing to say about pacing or
// connective-tissue adaptation at all.

// The traditional Couch-to-5K program's own well-documented failure point is a single
// week-to-week jump of 72.7% in continuous running time (week 4 to week 5) -- identified
// directly as the point most beginners quit. Capped here at 50% specifically to avoid
// reproducing that exact known dropout wall, not as an arbitrary round number.
export const MAX_WEEKLY_RUNTIME_GROWTH = 0.5;

// Cycling gets a genuinely less conservative cap, not a bigger version of the same caution:
// runners average ~11 injuries per 1,000 hours versus cyclists' ~6 (roughly half), and a study
// matching training duration found runners accumulated up to 404% more muscle damage, 256%
// higher inflammation, and 87% more soreness than cyclists over the same time. That's a real,
// sourced difference, not an assumption -- cycling is non-weight-bearing, so it lacks running's
// primary injury driver (repeated ground-impact loading on connective tissue).
//
// Still a real cap, not "no limit": overuse injury remains common in cycling too, and multiple
// sources name the SAME trap specifically -- people under-rest because cycling *feels* easier,
// not because it demands less recovery. See build-endurance-training.md for the full caution
// (saddle/bike-fit issues, and cycling's real crash-risk category that running doesn't have).
export const CYCLING_MAX_WEEKLY_GROWTH = 0.65;

function growthRateForMode(mode) {
  return mode === "cycling" ? CYCLING_MAX_WEEKLY_GROWTH : MAX_WEEKLY_RUNTIME_GROWTH;
}

// 3 sessions/week is standard across every real program checked, and matches the cardio floor
// training-mix.mjs already establishes for this modality generally -- not a coincidence, this is
// close to the minimum frequency needed to build aerobic fitness while giving connective tissue
// time to adapt between sessions.
export const SESSIONS_PER_WEEK = 3;

// Matches periodization-deloads.md's general cadence -- a deliberately lower-effort week every
// few weeks to let adaptation catch up, same principle applied to a different kind of fatigue.
export const RECOVERY_WEEK_EVERY_N_WEEKS = 4;

/**
 * Rough estimate of how many weeks a plan will take, for setting expectations up front --
 * mirrors goal-timeline.mjs's role for weight goals, but for a continuous-running target instead
 * of a calorie target. Reuses buildCardioPlan() itself rather than a separate calculation, so
 * this can't silently drift out of sync with what the actual week-by-week plan produces (an
 * earlier version used its own simplified loop and disagreed with the real plan by 2 weeks,
 * since it didn't account for recovery weeks not progressing).
 */
export function estimateWeeksToTarget(currentContinuousRunSeconds, targetContinuousRunSeconds) {
  if (targetContinuousRunSeconds <= currentContinuousRunSeconds) return 0;
  return buildCardioPlan({ currentContinuousRunSeconds, targetContinuousRunSeconds }).length;
}

/**
 * Builds one week's run/walk interval structure.
 * weekIndex: 0-based, from the start of the plan.
/**
 * currentContinuousRunSeconds: their ability BEFORE this week's progression is applied --
 *   caller is expected to feed each week's own output back in as the next week's input. Despite
 *   the name (kept for backward compatibility), this is "continuous cardio seconds" generally --
 *   see `mode` below.
 * targetContinuousRunSeconds: the eventual goal (e.g. 1800 = 30 min, roughly a 5K at most
 *   beginner paces, or a comparable cycling duration).
 * totalSessionMinutes: how long one session should run, used to compute how many
 *   work/recovery rounds fit in it.
 * mode: "running" (default) | "cycling" -- changes the growth cap and the recovery-interval
 *   floor, not the overall structure. See CYCLING_MAX_WEEKLY_GROWTH above for why cycling gets
 *   a genuinely less conservative cap, not just a bigger version of running's.
 */
export function buildCardioWeek({
  weekIndex, currentContinuousRunSeconds, targetContinuousRunSeconds, totalSessionMinutes = 25, mode = "running",
}) {
  const isRecoveryWeek = weekIndex > 0 && weekIndex % RECOVERY_WEEK_EVERY_N_WEEKS === 0;
  const isFirstWeek = weekIndex === 0;
  const isCycling = mode === "cycling";

  // A recovery week repeats the PREVIOUS week's numbers rather than progressing further -- the
  // whole point is giving the body a week to catch up, not a harder one dressed up as a break.
  // Week 1 also doesn't apply growth -- it establishes the floor a person actually starts from.
  const growthFactor = (isRecoveryWeek || isFirstWeek) ? 1 : (1 + growthRateForMode(mode));
  const runSeconds = Math.round(Math.min(
    targetContinuousRunSeconds,
    Math.max(currentContinuousRunSeconds, 60) * growthFactor
  ));

  // The recovery interval (walk, for running; easy spin, for cycling) shrinks as the work
  // interval grows, but keeps a real floor until the target is actually reached. Cycling's
  // floor and ratio are both a little lower than running's -- easy spinning is more readily
  // sustainable and recovers faster between harder segments than walking does between running
  // segments, since it's non-impact, not because cycling needs LESS structure overall.
  const isGraduated = runSeconds >= targetContinuousRunSeconds;
  const recoveryFloor = isCycling ? 45 : 60;
  const recoveryRatio = isCycling ? 0.6 : 0.75;
  const walkSeconds = isGraduated ? 0 : Math.max(recoveryFloor, Math.round(runSeconds * recoveryRatio));

  const roundSeconds = runSeconds + walkSeconds;
  const rounds = walkSeconds > 0 ? Math.max(1, Math.round((totalSessionMinutes * 60) / roundSeconds)) : 1;

  return {
    runSeconds, walkSeconds, rounds, isRecoveryWeek, isGraduated, mode,
    sessionsThisWeek: SESSIONS_PER_WEEK,
  };
}

/** Builds a full plan, week by week, feeding each week's resulting ability into the next --
 *  this is what a caller actually wants: the whole progression, not one week at a time managed
 *  externally. */
export function buildCardioPlan({ currentContinuousRunSeconds = 0, targetContinuousRunSeconds = 1800, totalSessionMinutes = 25, mode = "running" }) {
  const weeks = [];
  let cur = currentContinuousRunSeconds;
  let weekIndex = 0;
  while (weeks.length < 52) {
    const week = buildCardioWeek({ weekIndex, currentContinuousRunSeconds: cur, targetContinuousRunSeconds, totalSessionMinutes, mode });
    weeks.push(week);
    cur = week.runSeconds;
    weekIndex++;
    if (week.isGraduated) break;
  }
  return weeks;
}

// ---------------------------------------------------------------------------
// "Going faster" (the build-endurance tune question's "speed" option): interval work layered
// ON TOP of an easy-run base, not a separate system. Research is consistent across sources:
// even for a pure speed goal, most weekly running volume should stay easy -- one hard session a
// week for beginners, one to two for intermediate/advanced, never the majority of the week.
// See ../principles/build-endurance-training.md.
// ---------------------------------------------------------------------------

// A classic, widely-cited study found 4x4-minute intervals at 90-95% max HR improved VO2max by
// ~7.2% over the training period. Beginners start far short of that: 6x30s-1min hard efforts
// with generous easy recovery is the standard beginner entry point across sources checked.
export const SPEED_SESSIONS_PER_WEEK = 1; // the ONE hard day; the rest of the week's cardio stays easy
export const SPEED_GROWTH_PER_WEEK = 0.15; // more conservative than the distance case's 50% --
  // high-intensity work is more taxing and more injury-prone than easy continuous running, so
  // this progresses slower on purpose, not by oversight.

/**
 * Builds one week's interval session. No HR data assumed available, so intensity is described
 * by effort (RPE / "comfortably hard" to "hard") rather than a %HRmax number the app can't
 * actually verify without a wearable -- a target the app can't check is worse than an honest
 * effort-based instruction.
 * level: "beginner" | "intermediate" | "advanced" -- from experience-tiers.md, NOT specific to
 *   running experience, but a reasonable proxy in the absence of a running-specific history.
 * mode: "running" (default) | "cycling" -- changes the effort language only, NOT the growth
 *   rate. Unlike the distance case, the injury-rate research supporting a less conservative
 *   cycling cap was about aggregate training injury (impact-driven), not specifically about
 *   high-intensity interval sessions -- the classic VO2max interval research (4x4min at
 *   90-95% max HR) is commonly done on a cycling ergometer in lab studies to begin with, so
 *   there's no real basis to treat interval-specific injury risk as mode-dependent here. Kept
 *   the same on purpose rather than guessing at a cycling-specific number.
 */
export function buildSpeedWeek({ weekIndex, level = "beginner", mode = "running" }) {
  const isRecoveryWeek = weekIndex > 0 && weekIndex % RECOVERY_WEEK_EVERY_N_WEEKS === 0;
  const growthFactor = isRecoveryWeek ? 0 : Math.min(weekIndex, 8) * SPEED_GROWTH_PER_WEEK; // caps growth after week 8 -- linear growth forever isn't realistic for interval volume either
  const verb = mode === "cycling" ? "pedaling" : "running";

  if (level === "beginner") {
    // 6x30s hard, generous recovery -- the standard beginner entry point. Rounds grow slowly;
    // interval duration itself does not, since going both longer AND more frequent at once is
    // exactly the kind of double-progression that causes overuse injury.
    const rounds = Math.min(10, Math.round(6 * (1 + growthFactor)));
    return { intervalSeconds: 30, recoverySeconds: 90, rounds, mode, effort: `hard ${verb}, not all-out`, isRecoveryWeek, sessionsThisWeek: SPEED_SESSIONS_PER_WEEK };
  }
  if (level === "intermediate") {
    // Tempo/"cruise interval" format -- less neurologically taxing than short VO2max intervals,
    // so sustainable more often. 3x10min at "comfortably hard" with 2min jog recovery.
    const rounds = Math.min(5, Math.round(3 * (1 + growthFactor)));
    return { intervalSeconds: 600, recoverySeconds: 120, rounds, mode, effort: `comfortably hard ${verb}, sustainable pace`, isRecoveryWeek, sessionsThisWeek: SPEED_SESSIONS_PER_WEEK };
  }
  // Advanced: classic 4x4min hard effort, 3min easy recovery -- the specific structure behind
  // the cited 7.2% VO2max improvement.
  const rounds = Math.min(6, Math.round(4 * (1 + growthFactor)));
  return { intervalSeconds: 240, recoverySeconds: 180, rounds, mode, effort: `hard ${verb}, 90-95% effort`, isRecoveryWeek, sessionsThisWeek: SPEED_SESSIONS_PER_WEEK };
}

// ---------------------------------------------------------------------------
// "Everyday stamina" (the build-endurance tune question's "general" option): a time/frequency
// target using whatever activity the person likes, not a continuous-running-duration to build
// toward the way "distance" is. No graduation point -- this is a standing weekly habit, not a
// program with an end state. See ../principles/build-endurance-training.md.
// ---------------------------------------------------------------------------

// ACSM, CDC, AHA, and ACC all converge on the same target: 150 min/week moderate intensity OR
// 75 min/week vigorous. Near-unanimous across every major body checked -- this isn't one
// source's opinion.
export const GENERAL_TARGET_MODERATE_MINUTES_PER_WEEK = 150;
export const GENERAL_TARGET_VIGOROUS_MINUTES_PER_WEEK = 75;
export const GENERAL_RAMP_WEEKS = 6; // AHA explicitly recommends ramping up gradually rather
  // than starting a previously sedentary person straight at the full target

/**
 * currentWeeklyMinutes: what they're already doing (0 for a true beginner).
 * intensity: "moderate" | "vigorous" -- moderate = can talk but not sing; vigorous = can't
 *   hold a conversation. This is the actual practical marker every source uses, deliberately
 *   not a %HRmax number the app has no way to verify.
 */
export function buildGeneralEnduranceWeek({ weekIndex, currentWeeklyMinutes = 0, intensity = "moderate" }) {
  const target = intensity === "vigorous" ? GENERAL_TARGET_VIGOROUS_MINUTES_PER_WEEK : GENERAL_TARGET_MODERATE_MINUTES_PER_WEEK;
  if (currentWeeklyMinutes >= target) {
    return { weeklyMinutes: target, sessionsThisWeek: 5, minutesPerSession: Math.round(target / 5), isAtTarget: true, intensity };
  }
  const rampProgress = Math.min(1, (weekIndex + 1) / GENERAL_RAMP_WEEKS);
  const weeklyMinutes = Math.round(Math.max(currentWeeklyMinutes, 60) + (target - Math.max(currentWeeklyMinutes, 60)) * rampProgress);
  const sessionsThisWeek = 5; // spread across the week, matching "30 min x 5 days" -- easier to
    // sustain than fewer, longer sessions, and matches how the guideline itself is phrased
  return { weeklyMinutes, sessionsThisWeek, minutesPerSession: Math.round(weeklyMinutes / sessionsThisWeek), isAtTarget: false, intensity };
}
