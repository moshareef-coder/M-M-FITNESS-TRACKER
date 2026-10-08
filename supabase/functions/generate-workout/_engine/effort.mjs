/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/effort.mjs. Do not edit here. */
/* Effort and barriers: two onboarding answers, and what each may change.
 *
 * The app asks two things this engine had no input for. "How hard do you like
 * it", High / Medium / Low, and "What's stopping you", a multi select of seven
 * barriers. Both were asked and stored and read by nothing, and the minutes
 * step in index.html said out loud why an intensity question had been removed
 * once already: a question that changes nothing. This file is where they stop
 * being decorative, and it is deliberately small about what it lets them do.
 *
 * EFFORT is how close to failure a working set stops, said as reps in reserve.
 * knowledge/principles/rpe-autoregulation.md is the source for every number:
 *
 *   low      RIR 3, RPE 7. Not lower: "below RPE 6 is warm-up territory, not a
 *            working set", so an easier setting that went to RIR 4 or 5 would
 *            stop being training.
 *   medium   RIR 2, RPE 8. Exactly what this engine has always built: load.mjs
 *            `workingFrom1RM` defaults to it and the first-time note says "two
 *            reps short". So medium, and a missing answer, change nothing.
 *   high     RIR 1 on main lifts. The last set of a machine or isolation
 *            accessory goes to failure, RIR 0, and nothing else does. The same
 *            file: "training every set to true failure adds fatigue
 *            disproportionate to the extra growth it buys", and the technical
 *            breakdown near failure is where a barbell compound gets dangerous
 *            and a leg extension does not. The app's label "High (to failure)"
 *            promises more than this, and the honest label is "close to
 *            failure".
 *
 * Effort is a preference, not a measurement. research/07: "never ask for
 * something we could observe", and how hard somebody can work IS observed, by
 * calibrate.mjs, from the join between what was prescribed and what was
 * logged. So the stated effort is a starting point and calibration stays the
 * authority: a back-off week, a deload week or a plateau volume cut all hold
 * the week at medium whatever was asked, and nobody without a single logged
 * set gets past medium either, because the same principles file caps
 * beginners around RPE 7 to 8: they "can't yet judge true failure accurately".
 *
 * Effort never moves sets, reps, rest or selection. It is where a set ends.
 *
 * BARRIERS are defaults, never answers. Each one fills in something the person
 * did not say, and none of them can overrule something they did say, and none
 * of them cuts a weekly set. Of the seven, four reach the plan:
 *
 *   consistency  one short day from day zero. plan.mjs already shortens the days
 *                somebody's logs say they miss ("a short session you do beats a
 *                full one you skip", research/09), but a new user has no logs,
 *                so the shortening never fires for exactly the person who just
 *                told us it would. The logs take over the moment they exist.
 *   lost         the guided ranking. Barbell movements they have never logged
 *                sink below machines and dumbbells, and accessories rotate half
 *                as often, so the movements they are learning stay long enough
 *                to be learned.
 *   bored        accessories rotate every week instead of every fortnight.
 *                Anchors do not move for freshness, ever: the owner's rule, "if
 *                it ain't broken, don't break it", lives in plan.mjs ROTATION.
 *   energy       effort defaults to low when effort was not answered.
 *
 * And three that cannot change a plan, said here so nobody wires them later by
 * mistake: `busy` is already the session_minutes answer, `alone` is a partner
 * invite and not a training input, and `pain` without a joint is not something
 * the engine can act on, which is what the limits sheet is for.
 *
 * lost and bored together pull rotation in opposite directions, and neither
 * outranks the other, so they cancel and the calendar stays at a fortnight.
 *
 * Ids are the ones index.html stores in profiles.barriers. The two longer
 * spellings are accepted as well, because the brief that asked for this used
 * them, and an id that differs by an underscore should not be a silent no-op.
 */

export const EFFORT_LEVELS = Object.freeze(["low", "medium", "high"]);

/* Reps in reserve per level, for working sets. `lastSet` is the high level's
   one exception and it is read only on machine and isolation accessories. */
export const EFFORT_RIR = Object.freeze({
  low: { main: 3, accessory: 3, lastSet: null },
  medium: { main: 2, accessory: 2, lastSet: null },
  high: { main: 1, accessory: 1, lastSet: 0 },
});

/* What a capped or held week falls back to. The engine's own long standing
   prescription, so a cap can only ever land on the plan everybody had. */
export const EFFORT_CEILING = "medium";

export const BARRIER_IDS = Object.freeze(["busy", "consistency", "alone", "lost", "bored", "pain", "energy"]);
const BARRIER_ALIAS = { dont_know: "lost", low_energy: "energy" };

/* How many weeks one accessory turn lasts, per barrier. ROTATION in plan.mjs is
   the default (2) and these are the only two numbers that may replace it. */
export const ROTATION_WEEKS = Object.freeze({ bored: 1, lost: 4 });

export function normalizeEffort(raw) {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return EFFORT_LEVELS.includes(s) ? s : null;
}

/* Same three shapes every other jsonb or text[] column arrives in: an array, the
   string a jsonb column round trips as through some clients, or null. Anything
   that is not a known id is dropped, as styles.mjs drops a retired style. */
export function normalizeBarriers(raw) {
  let list = raw;
  if (typeof list === "string") {
    try { list = JSON.parse(list); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const id = BARRIER_ALIAS[item.trim().toLowerCase()] || item.trim().toLowerCase();
    if (BARRIER_IDS.includes(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/* The person's answers, resolved to the knobs plan.mjs reads. Pure, and the
   whole of the barrier logic: plan.mjs never looks at a barrier id. */
export function resolveEffort({ effort = null, barriers = [] } = {}) {
  const list = normalizeBarriers(barriers);
  const asked = normalizeEffort(effort);
  const has = (id) => list.includes(id);
  const level = asked || (has("energy") ? "low" : EFFORT_CEILING);
  const source = asked ? "asked" : has("energy") ? "barrier" : "default";
  let rotationWeeks = null;
  if (has("bored") && !has("lost")) rotationWeeks = ROTATION_WEEKS.bored;
  else if (has("lost") && !has("bored")) rotationWeeks = ROTATION_WEEKS.lost;
  return {
    level,
    source,
    barriers: list,
    shortDayFromStart: has("consistency"),
    guided: has("lost"),
    rotationWeeks,
  };
}

/* The level a week actually runs at, after the two things that may hold it:
   no logs at all, and a week the engine has already decided is lighter. Only
   ever moves DOWN to medium, never up and never below where they asked. */
export function effectiveEffort(level, { hasLogs = false, lighterWeek = false } = {}) {
  const asked = normalizeEffort(level) || EFFORT_CEILING;
  if (asked !== "high") return { level: asked, held: null };
  if (!hasLogs) return { level: EFFORT_CEILING, held: "no-logs" };
  if (lighterWeek) return { level: EFFORT_CEILING, held: "lighter-week" };
  return { level: asked, held: null };
}

/* A machine or isolation accessory is the only place a set may go to failure.
   A cable counts as a machine here: the stack takes the load the moment you let
   go, which is the property that makes failure safe, whatever the movement. */
const FIXED_PATH = new Set(["machine", "cable"]);
export function failureSafe(exercise, pattern) {
  return exercise?.role !== "main" && (pattern === "isolation" || FIXED_PATH.has(exercise?.equipment));
}
