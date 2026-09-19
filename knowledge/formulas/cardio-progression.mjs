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
 * currentContinuousRunSeconds: their ability BEFORE this week's progression is applied --
 *   caller is expected to feed each week's own output back in as the next week's input.
 * targetContinuousRunSeconds: the eventual goal (e.g. 1800 = 30 min, roughly a 5K at most
 *   beginner paces).
 * totalSessionMinutes: how long one session should run, used to compute how many
 *   run/walk rounds fit in it.
 */
export function buildCardioWeek({
  weekIndex, currentContinuousRunSeconds, targetContinuousRunSeconds, totalSessionMinutes = 25,
}) {
  const isRecoveryWeek = weekIndex > 0 && weekIndex % RECOVERY_WEEK_EVERY_N_WEEKS === 0;
  const isFirstWeek = weekIndex === 0;

  // A recovery week repeats the PREVIOUS week's numbers rather than progressing further -- the
  // whole point is giving connective tissue a week to catch up, not a harder one dressed up as
  // a break. Week 1 also doesn't apply growth -- it establishes the floor a person actually
  // starts from; every real program checked opens at a genuinely easy interval (60s run / 90s+
  // walk for a true beginner), not one step already ahead of it.
  const growthFactor = (isRecoveryWeek || isFirstWeek) ? 1 : (1 + MAX_WEEKLY_RUNTIME_GROWTH);
  const runSeconds = Math.round(Math.min(
    targetContinuousRunSeconds,
    Math.max(currentContinuousRunSeconds, 60) * growthFactor
  ));

  // The walk interval shrinks as the run interval grows, but keeps a real recovery floor until
  // continuous running is actually reached -- matching every real program checked, none of which
  // eliminate the walk break early just because the run interval got longer.
  const isGraduated = runSeconds >= targetContinuousRunSeconds;
  const walkSeconds = isGraduated ? 0 : Math.max(60, Math.round(runSeconds * 0.75));

  const roundSeconds = runSeconds + walkSeconds;
  const rounds = walkSeconds > 0 ? Math.max(1, Math.round((totalSessionMinutes * 60) / roundSeconds)) : 1;

  return {
    runSeconds, walkSeconds, rounds, isRecoveryWeek, isGraduated,
    sessionsThisWeek: SESSIONS_PER_WEEK,
  };
}

/** Builds a full plan, week by week, feeding each week's resulting ability into the next --
 *  this is what a caller actually wants: the whole progression, not one week at a time managed
 *  externally. */
export function buildCardioPlan({ currentContinuousRunSeconds = 0, targetContinuousRunSeconds = 1800, totalSessionMinutes = 25 }) {
  const weeks = [];
  let cur = currentContinuousRunSeconds;
  let weekIndex = 0;
  while (weeks.length < 52) {
    const week = buildCardioWeek({ weekIndex, currentContinuousRunSeconds: cur, targetContinuousRunSeconds, totalSessionMinutes });
    weeks.push(week);
    cur = week.runSeconds;
    weekIndex++;
    if (week.isGraduated) break;
  }
  return weeks;
}
