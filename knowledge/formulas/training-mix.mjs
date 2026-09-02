// Decides WHICH TRAINING MODALITY a given day should be, before exercise-selector.mjs decides
// what to actually do that day. This is the piece that was missing: goal alone ("lose weight")
// was routing straight to weight-training with no say in the matter. See ../principles/ for the
// reasoning; this file is the executable version.
//
// Public-health baseline, not one guru's system: ACSM/CDC physical activity guidelines
// recommend resistance training at least 2x/week regardless of the primary goal, because
// cardio-only weight loss burns meaningful muscle along with fat. That is the one hard floor
// here. Everything past the floor is a tunable weighting, meant to be adjusted, not a fixed law.

export const MIN_STRENGTH_SESSIONS_PER_WEEK = 2;

// Relative weighting per goal across the four modalities, BEFORE the floor rule and preference
// weighting are applied. These are the numbers meant to be tuned -- read them as "how many of
// the week's non-floor sessions lean this direction," not an absolute count.
export const GOAL_MIX_WEIGHTS = {
  lose:        { weightTraining: 2, cardio: 3, sports: 1, flow: 0 },
  gain:        { weightTraining: 5, cardio: 1, sports: 0, flow: 0 },
  hypertrophy: { weightTraining: 5, cardio: 1, sports: 0, flow: 0 },
  strength:    { weightTraining: 5, cardio: 1, sports: 0, flow: 0 },
  general:     { weightTraining: 3, cardio: 2, sports: 1, flow: 1 },
};

// "flow" = yoga/Pilates/calisthenics-as-recovery, not a fourth hard-training category.
const MODALITY_KEYS = ["weightTraining", "cardio", "sports", "flow"];

const PREF_KEY_MAP = { "weight-training": "weightTraining", cardio: "cardio", sports: "sports", flow: "flow" };

/**
 * preferredModalities: array from {"weight-training","cardio","sports","flow"}, or empty/null
 * for "no preference." Explicit preference reweights the goal defaults toward what the person
 * actually wants to do, without dropping resistance training below the floor on its own --
 * someone who just says "I like cardio" still gets the floor, since liking one thing is not the
 * same as refusing another.
 *
 * excludedModalities: array in the same vocabulary, for an explicit "no." This is different
 * from simply not preferring something -- it OVERRIDES the floor. Someone who says "I don't
 * want to weight train" gets zero weight-training days even though the floor would otherwise
 * add them back; that is a real choice this app has to respect, not a default to protect them
 * from. The floor is a recommendation for people with no strong opinion, not a mandate.
 */
export function computeWeeklyMix({ goal = "general", preferredModalities = [], excludedModalities = [], sportsCount = 0, daysAvailable = 4 }) {
  const weights = { ...(GOAL_MIX_WEIGHTS[goal] || GOAL_MIX_WEIGHTS.general) };

  // Preference reweighting: double the weight of anything explicitly chosen, halve what was not
  // chosen (when a preference was stated at all) -- a nudge, not an override of the floor.
  if (preferredModalities?.length) {
    for (const key of MODALITY_KEYS) {
      const chosen = preferredModalities.some((p) => PREF_KEY_MAP[p] === key);
      weights[key] = Math.max(0.5, weights[key] * (chosen ? 2 : 0.5));
    }
  }
  // No point recommending sports days if the person didn't say they play any.
  if (!sportsCount) weights.sports = 0;
  // A hard "no" zeroes the weight outright, which also makes it invisible to the leftover-day
  // allocation below (weight <= 0 is already skipped there).
  for (const p of excludedModalities) if (PREF_KEY_MAP[p]) weights[PREF_KEY_MAP[p]] = 0;

  // Reserve fixed floors up front -- strength always (unless explicitly declined), and one
  // sports day whenever the person said they play one and there is room, since a stated
  // preference losing every tiebreak to a higher-weighted goal category (which is what plain
  // proportional allocation does at low day counts) makes the "do you play a sport" question
  // pointless. Whatever is left after both floors is allocated by weight using the
  // largest-remainder method (standard proportional apportionment, not a proprietary system):
  // take the integer part of each modality's fair share of the remainder, then hand out
  // leftover days one at a time to the biggest fraction.
  let remainingDays = daysAvailable;
  const floorWeightTraining = excludedModalities.includes("weight-training")
    ? 0 : Math.min(MIN_STRENGTH_SESSIONS_PER_WEEK, remainingDays);
  remainingDays -= floorWeightTraining;
  const floorSports = !excludedModalities.includes("sports") && sportsCount > 0 && remainingDays > 0 ? 1 : 0;
  remainingDays -= floorSports;

  const totalWeight = MODALITY_KEYS.reduce((s, k) => s + weights[k], 0) || 1;
  const exact = Object.fromEntries(MODALITY_KEYS.map((k) => [k, (weights[k] / totalWeight) * remainingDays]));
  const mix = Object.fromEntries(MODALITY_KEYS.map((k) => [k, Math.floor(exact[k])]));
  let allocated = MODALITY_KEYS.reduce((s, k) => s + mix[k], 0);

  const byRemainder = MODALITY_KEYS
    .map((k) => ({ k, remainder: exact[k] - mix[k] }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { k } of byRemainder) {
    if (allocated >= remainingDays) break;
    if (weights[k] <= 0) continue; // never hand a day to a modality with zero weight (e.g. no sports played)
    mix[k] += 1;
    allocated += 1;
  }

  mix.weightTraining += floorWeightTraining;
  mix.sports += floorSports;
  return mix;
}

/** Turns a mix ({weightTraining:2, cardio:3, ...}) into an ordered week, alternating modalities
 *  rather than clumping the same type back to back where avoidable. */
export function assignWeekSchedule(mix) {
  const pool = MODALITY_KEYS.flatMap((k) => Array(mix[k] || 0).fill(k));
  const schedule = [];
  const remaining = { ...mix };
  while (pool.length) {
    const available = MODALITY_KEYS.filter((k) => remaining[k] > 0 && k !== schedule[schedule.length - 1]);
    const pick = (available.length ? available : MODALITY_KEYS.filter((k) => remaining[k] > 0))
      .reduce((a, b) => (remaining[a] >= remaining[b] ? a : b));
    schedule.push(pick);
    remaining[pick] -= 1;
    pool.pop();
  }
  return schedule;
}
