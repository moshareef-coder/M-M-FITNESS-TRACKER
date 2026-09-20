// Dosing and selection for the "Move better" goal (mobility, flexibility, pain) -- see
// ../principles/move-better-training.md. Draws on the existing YOGA and PILATES libraries
// rather than needing new exercise content, since both already carry the level/primary/isHold
// tagging this needs.
//
// This is the rare case where dosing does NOT need experience-tier scaling: a 2024 systematic
// review and multivariate meta-regression across 7 databases (PubMed 39614059) found stretching
// duration effects were not moderated by age, sex, or training status -- one dosing target works
// for essentially everyone, unlike every other category built so far.

// No additional flexibility benefit was found beyond this dose -- more is not better here, a
// real ceiling backed by the meta-regression above, not a conservative guess.
export const MAX_HOLD_SECONDS_PER_AREA_PER_SESSION = 240; // 4 minutes
export const MAX_HOLD_SECONDS_PER_AREA_PER_WEEK = 600; // 10 minutes

// Older adults specifically benefit from LONGER individual holds than the general 15-30s
// convention -- Feland et al. found 60-second holds produced greater hamstring flexibility
// gains in older adults specifically. This is the one place the starting-context modifier from
// real-goals.md actually changes the mechanic, not just the ramp speed.
export const HOLD_SECONDS_STANDARD = 30;
export const HOLD_SECONDS_OLDER_ADULT = 60;

/**
 * Builds one session's worth of holds for a set of targeted areas (from the existing body-part
 * picker, reused in its "sore" mode per index.html's renderBodyFocusPage).
 * targetedAreas: array of muscle-group keys, e.g. ["lowerback", "hamstrings"] -- from the sore
 *   picker, ranked, same as the existing focus-area system for other goals.
 * isOlderAdult: whether the starting-context modifier applies (see real-goals.md) -- changes
 *   hold duration, not session structure.
 */
export function buildMobilitySession({ targetedAreas = [], isOlderAdult = false }) {
  const holdSeconds = isOlderAdult ? HOLD_SECONDS_OLDER_ADULT : HOLD_SECONDS_STANDARD;
  const roundsPerArea = Math.floor(MAX_HOLD_SECONDS_PER_AREA_PER_SESSION / holdSeconds);
  return targetedAreas.map((area) => ({
    area, holdSeconds, rounds: roundsPerArea,
    totalSecondsThisSession: holdSeconds * roundsPerArea,
  }));
}

/**
 * Whether a session already covers the weekly cap for an area -- callers should check this
 * before adding more mobility work for that area this week, same "don't exceed the ceiling"
 * principle used for the calorie caps elsewhere.
 */
export function isAtWeeklyMobilityCap(secondsLoggedThisWeek) {
  return secondsLoggedThisWeek >= MAX_HOLD_SECONDS_PER_AREA_PER_WEEK;
}

// ---------------------------------------------------------------------------
// back-postpartum: deliberately NOT auto-selected from the general YOGA/PILATES libraries.
// PILATES's own "core" category includes The Hundred, Roll-Up, Teaser, and Jackknife -- all
// flexion/crunch-pattern movements that real clinical guidance on diastasis recti specifically
// cautions against (they increase intra-abdominal pressure). None of these carry a tag that
// would let a selector safely avoid them; an "advanced"-level filter could serve Teaser or
// Jackknife to a postpartum user with no safeguard at all. Building an auto-selector on top of
// unvetted content here would be a real safety problem, not a content gap to route around
// quietly. See move-better-training.md for what this needs before it can be built.
// ---------------------------------------------------------------------------
export const BACK_POSTPARTUM_NOT_YET_SUPPORTED = true;
