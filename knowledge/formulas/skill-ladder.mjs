// Progression logic for the skill-ladder goals in real-goals.md (first pull-up, first
// push-up). Confirmed to belong under "Get stronger" via index.html's own RETIRED_GOALS log --
// Mo's comment: "A first pull-up and a first push-up are bodyweight strength, and 'Lift my
// bodyweight' is get-stronger's own word for that." But the two need genuinely different
// mechanics, not one shared function, per real-goals.md's own finding: pull-up is a real,
// measured weak-link problem (pulling strength runs well behind pushing in typical adults);
// push-up is usually a general strength/core-stability gap, since pushing is normally the
// better-trained pattern already. See ../principles/skill-ladder-training.md.

// ---------------------------------------------------------------------------
// First pull-up: an assistance-REDUCTION ladder (dead hang -> band-assisted + negative work in
// parallel -> attempt), not a leverage-increase ladder. Genuinely different shape from the
// bodyweight progression in exercise-selector.mjs, which climbs toward HARDER variations --
// here, the person starts unable to do the base movement at all and needs LESS help over time,
// not a harder version of something they can already do.
// ---------------------------------------------------------------------------

// Odin Fitness's beginner checkpoint: "Can you hold a dead hang for 30+ seconds... move to
// Phase 2." Reuses the EXISTING isHold/progressiveHold mechanic already in exercise-selector.mjs
// for the hold itself -- this just says when it's time to move on.
export const DEAD_HANG_GRADUATION_SECONDS = 30;

export function hasGraduatedDeadHang(lastHoldSeconds) {
  return (lastHoldSeconds ?? 0) >= DEAD_HANG_GRADUATION_SECONDS;
}

// Multiple sources converge near 8 reps at a given assistance level before reducing assistance
// further (SET FOR SET, PhD, others). BAND_ASSIST_LEVELS is a relative 0-1 scale (1.0 = maximum
// assistance) rather than named band colors/tensions, since band brands vary and the app has no
// way to verify what someone actually owns -- described in relative terms in the UI instead
// ("use a band that lets you complete the rep with control"), same approach already used for
// effort-based cardio intensity instead of unverifiable %HRmax targets.
export const BAND_ASSIST_REP_TARGET = 8;
export const BAND_ASSIST_LEVELS = 5;

export function progressiveBandAssist({ lastLog }) {
  if (!lastLog) return { reps: 3, assistanceLevel: 1.0, assistanceRemoved: false };
  const hitTarget = lastLog.repsAchieved >= BAND_ASSIST_REP_TARGET;
  if (!hitTarget) {
    return { reps: Math.min(BAND_ASSIST_REP_TARGET, lastLog.targetReps + 1), assistanceLevel: lastLog.assistanceLevel, assistanceRemoved: false };
  }
  // Hit the rep target at this assistance level -- reduce assistance, reps reset lower (a
  // harder assistance level starts easier), same "harder tier starts the rep count over" shape
  // used for the general bodyweight leverage ladder.
  const nextAssistance = Math.max(0, lastLog.assistanceLevel - 1 / BAND_ASSIST_LEVELS);
  return { reps: 3, assistanceLevel: nextAssistance, assistanceRemoved: nextAssistance <= 0 };
}

// The specific, sourced advancement criterion multiple programs converge on: "4x5 with an
// 8-second descent, then attempt one full pull-up" (SensAI). Eccentric contractions can handle
// roughly 1.5x the concentric load, which is the physiological reason a beginner who can't do a
// single full rep can usually still control a short negative from day one.
//
// Worth being honest about a real disagreement in the field, not papering over it: one source
// argues negatives are less effective than commonly claimed, since the nervous system recruits
// fewer motor units eccentrically than concentrically, and favors building pulldown strength
// toward bodyweight instead. Both views have real backing; negatives are used here because
// they're the more broadly-corroborated approach across sources checked and need no equipment
// beyond a bar, not because the alternative view is wrong.
export const NEGATIVE_STARTING_SECONDS = 3;
export const NEGATIVE_GRADUATION_SECONDS = 8;
export const NEGATIVE_GROWTH_PER_SESSION = 1;

export function progressiveNegative({ lastLog }) {
  if (!lastLog) return { descentSeconds: NEGATIVE_STARTING_SECONDS, readyToAttempt: false };
  const hitTarget = lastLog.descentSecondsAchieved >= lastLog.targetDescentSeconds;
  const next = hitTarget
    ? Math.min(NEGATIVE_GRADUATION_SECONDS, lastLog.targetDescentSeconds + NEGATIVE_GROWTH_PER_SESSION)
    : lastLog.targetDescentSeconds;
  return { descentSeconds: next, readyToAttempt: next >= NEGATIVE_GRADUATION_SECONDS };
}

/** Whether it's time to actually attempt a real pull-up -- both tracks (band assistance fully
 *  removed AND negative descent at the graduation threshold) should agree, not just one. */
export function readyForPullUpAttempt({ bandAssistanceRemoved, negativeReadyToAttempt }) {
  return bandAssistanceRemoved && negativeReadyToAttempt;
}

// ---------------------------------------------------------------------------
// First push-up: reuses exercise-selector.mjs's EXISTING leverage-ladder mechanic
// (progressiveBodyweightReps + findHarderBodyweightVariation) rather than new code -- but that
// mechanic only bumps across LEVEL tiers (beginner -> intermediate -> advanced), and Wall
// Push-Up, Incline Push-Up, and standard Push-Up are ALL tagged "beginner" despite being
// meaningfully different difficulties. The general mechanic has no way to sequence WITHIN a
// tier, so a true first-push-up beginner needs this explicit ordering instead.
// ---------------------------------------------------------------------------

export const PUSH_UP_LADDER = ["Wall Push-Up", "Incline Push-Up", "Push-Up"];

// A shorter rep target than the general bodyweight ceiling (30) -- this is a skill-ladder goal
// with a graduation point (one clean rep of standard Push-Up), not an ongoing strength-training
// rep target. 8 reps at a rung is enough to confirm real control before moving on, consistent
// with the same convergence point used for band-assisted pull-up work above.
export const PUSH_UP_RUNG_GRADUATION_REPS = 8;

/** currentRungIndex: 0 = Wall Push-Up, 1 = Incline, 2 = standard Push-Up (the goal itself). */
export function progressivePushUpLadder({ lastLog, currentRungIndex = 0 }) {
  if (!lastLog) return { rung: PUSH_UP_LADDER[0], rungIndex: 0, reps: 3, graduated: false };

  const hitRungTarget = lastLog.repsAchieved >= PUSH_UP_RUNG_GRADUATION_REPS;
  if (!hitRungTarget) {
    const nextReps = lastLog.repsAchieved >= lastLog.targetReps ? lastLog.targetReps + 1 : lastLog.targetReps;
    return { rung: PUSH_UP_LADDER[currentRungIndex], rungIndex: currentRungIndex, reps: Math.min(PUSH_UP_RUNG_GRADUATION_REPS, nextReps), graduated: false };
  }

  const isAtFinalRung = currentRungIndex >= PUSH_UP_LADDER.length - 1;
  if (isAtFinalRung) {
    return { rung: PUSH_UP_LADDER[currentRungIndex], rungIndex: currentRungIndex, reps: PUSH_UP_RUNG_GRADUATION_REPS, graduated: true };
  }
  const nextRungIndex = currentRungIndex + 1;
  return { rung: PUSH_UP_LADDER[nextRungIndex], rungIndex: nextRungIndex, reps: 3, graduated: false };
}
