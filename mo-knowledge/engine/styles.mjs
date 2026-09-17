/* What somebody actually agreed to do, and what the plan is allowed to be
 * because of it.
 *
 * profiles.train_styles is written by onboarding: a list from lifting, home,
 * running, cycling, walking, pilates, yoga. It is strict opt in by product
 * decision, so a style that is not in the list is never planned, and there is
 * no floor putting resistance training back when somebody leaves it out.
 *
 * Until this module existed the column changed nothing. Onboarding collected
 * it, the payload carried it as far as the adapter, and the engine built the
 * same lifting week for somebody who ticked only running as for somebody who
 * ticked everything. That is the worst kind of setting: one the app asks for,
 * repeats back on the plan screen, and then ignores.
 *
 * THREE THINGS IT DECIDES, and it is worth being clear which is which.
 *
 *   1 Whether a lifting day may be built at all. Nobody who left both
 *     resistance styles unticked should be handed five lifts.
 *   2 What a lifting day may be made of. "At home" without "Lifting" is not a
 *     different kind of training, it is the same training with a shorter list
 *     of implements, so it becomes an equipment limit rather than a new branch.
 *     The engine already knows how to narrow a plan by equipment; this reuses
 *     that rather than inventing a parallel path.
 *   3 Which cardio modes are on the table, which is passed through for the
 *     caller to spend against the cardio library. The plan builder does not
 *     build cardio days, so this module reports rather than decides.
 *
 * NULL IS NOT THE SAME AS EMPTY. Null means never asked, which is every
 * account made before the question existed, and it has to keep the plan it
 * already had: everything allowed, no equipment narrowing. An empty array
 * would mean asked and answered with nothing, which onboarding does not let
 * anybody save. Both are treated as "no opinion" here, deliberately, because
 * the one thing worse than ignoring the column is having it silently empty
 * somebody's plan.
 */

/* The vocabulary onboarding writes. Anything outside it is dropped rather than
   guessed at: a typo in a text[] column should narrow nothing. */
export const STYLE_KEYS = Object.freeze([
  "lifting", "home", "running", "cycling", "walking", "pilates", "yoga",
  "swimming", "rowing", "classes", "hiking", "sports",
]);

/* Which of them are resistance training, which are cardio and what cardio mode
   each one means in the cardio library's own words. `equipment` is what a style
   implies you can reach, and it only matters for the resistance pair. */
const STYLE_KIND = {
  lifting: { kind: "resistance", equipment: ["bodyweight", "dumbbell", "barbell", "cable", "machine"] },
  home: { kind: "resistance", equipment: ["bodyweight", "dumbbell"] },
  running: { kind: "cardio", mode: "running" },
  cycling: { kind: "cardio", mode: "cycling" },
  walking: { kind: "cardio", mode: "walking" },
  swimming: { kind: "cardio", mode: "swimming" },
  rowing: { kind: "cardio", mode: "rowing" },
  classes: { kind: "cardio", mode: "hiit" },
  hiking: { kind: "cardio", mode: "hiking" },
  sports: { kind: "cardio", mode: null },
  pilates: { kind: "flow", training: "pilates" },
  yoga: { kind: "flow", training: "yoga" },
};

const ALLOWED = new Set(STYLE_KEYS);

/* Arrays or a comma separated string, the same shapes limits.mjs and focus.mjs
   accept, because a text[] column and a CSV both turn up in practice. */
export function normalizeStyles(value) {
  if (value === null || value === undefined) return null;
  const list = Array.isArray(value)
    ? value
    : typeof value === "string" ? value.split(",") : null;
  if (!list) return null;
  const out = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const key = raw.trim().toLowerCase();
    if (!ALLOWED.has(key) || out.includes(key)) continue;
    out.push(key);
  }
  /* A list that was sent but held nothing we recognise is the same as never
     having been asked. Narrowing a plan to nothing on the strength of a typo
     is the failure this guard exists for. */
  return out.length ? out : null;
}

/* The answer the rest of the engine reads.
 *
 *   asked            false when the column is null, empty or all noise
 *   resistance       may a lifting day be built
 *   cardio / flow    are those on the table at all
 *   equipmentMissing implements to subtract, in limits.mjs vocabulary
 *   cardioModes      modes to spend against the cardio library
 *   flowTrainings    yoga, pilates, or both
 */
export function readStyles(value) {
  const styles = normalizeStyles(value);
  if (!styles) {
    return {
      asked: false, styles: [], resistance: true, cardio: true, flow: true,
      equipmentMissing: [], cardioModes: [], flowTrainings: [], note: null,
    };
  }
  const kinds = styles.map((s) => STYLE_KIND[s]).filter(Boolean);
  const resistance = kinds.some((k) => k.kind === "resistance");
  const cardio = kinds.some((k) => k.kind === "cardio");
  const flow = kinds.some((k) => k.kind === "flow");

  /* The union of what the resistance styles can reach, subtracted from
     everything, is what they are missing. Ticking Lifting means a gym, so
     nothing is missing; ticking only At home means no barbell, no cable and no
     machines, which is exactly what the equipment limit already expresses.

     Only computed when a resistance style was actually ticked. Somebody who
     ticked only running is not short of a barbell, they are not lifting, and
     saying "you have no barbell" about them would put a wrong sentence on the
     plan screen. */
  const ALL = ["bodyweight", "dumbbell", "barbell", "cable", "machine"];
  let equipmentMissing = [];
  if (resistance) {
    const reach = new Set();
    for (const k of kinds) if (k.kind === "resistance") for (const e of k.equipment) reach.add(e);
    equipmentMissing = ALL.filter((e) => e !== "bodyweight" && !reach.has(e));
  }

  return {
    asked: true,
    styles,
    resistance,
    cardio,
    flow,
    equipmentMissing,
    cardioModes: kinds.filter((k) => k.kind === "cardio" && k.mode).map((k) => k.mode),
    flowTrainings: kinds.filter((k) => k.kind === "flow").map((k) => k.training),
    note: resistance ? null : styleNote(cardio, flow),
  };
}

/* What the plan screen says when the week has no resistance training in it.
   Said once, plainly, and it does not argue: they were told the same thing on
   the way in and chose this. The app's job now is to be honest about what the
   plan is, not to relitigate it. */
function styleNote(cardio, flow) {
  const what = cardio && flow ? "cardio and mobility" : cardio ? "cardio" : flow ? "mobility work" : "what you picked";
  return `This week is ${what} only, because that is what you picked. Two resistance sessions a week is what keeps weight loss taking fat rather than muscle, and you can add it back any time.`;
}

/* Fold the equipment a style implies into whatever limits were already sent,
   without losing a limit somebody set by hand. A missing implement stays
   missing whichever of the two said so, because both are the same claim: that
   the plan cannot use it. */
export function mergeStyleLimits(limits, styles) {
  const missing = new Set(Array.isArray(limits?.missing) ? limits.missing : []);
  for (const e of styles?.equipmentMissing || []) missing.add(e);
  return { ...(limits || {}), missing: [...missing] };
}
