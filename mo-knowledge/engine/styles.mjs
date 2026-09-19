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
 *   3 Which cardio modes are on the table, and the session itself. Until
 *     2026-09-18 this module only reported them and left the day to the caller,
 *     which read well in the contract and failed in practice: the engine
 *     returned five lifts to somebody who had ticked only Running, set
 *     `honoured: false`, and attached a sentence saying "this week is cardio
 *     only". Two claims in one response, one of them false, and whether the
 *     person ever saw a run depended on a caller remembering to build one. So
 *     the day is built here now, out of the same cardio library the app reads.
 *     plan.mjs still builds lifting and only lifting; this is beside it, not
 *     inside it, because a run has no sets, no reps and no progression model
 *     and pretending otherwise is how a run ends up logged as a set.
 *
 * NULL IS NOT THE SAME AS EMPTY. Null means never asked, which is every
 * account made before the question existed, and it has to keep the plan it
 * already had: everything allowed, no equipment narrowing. An empty array
 * would mean asked and answered with nothing, which onboarding does not let
 * anybody save. Both are treated as "no opinion" here, deliberately, because
 * the one thing worse than ignoring the column is having it silently empty
 * somebody's plan.
 */

import { cardioFor } from "../../knowledge/exercise-library/cardio.mjs";

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
 *   note             what to say when the week really has no lifting in it
 *   refusal          what to say when we could not build that week and are
 *                    handing back a lifting session anyway
 */
export function readStyles(value) {
  const styles = normalizeStyles(value);
  if (!styles) {
    return {
      asked: false, styles: [], resistance: true, cardio: true, flow: true,
      equipmentMissing: [], cardioModes: [], flowTrainings: [], note: null, refusal: null,
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
    refusal: resistance ? null : refusalNote(cardio, flow),
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

/* And what to say when we could NOT build that week and are handing back a
   lifting session anyway. There was one sentence for both cases until
   2026-09-18 and it was the one above, so somebody who ticked Yoga got five
   lifts under a line reading "this week is mobility work only". Two sentences,
   because they are two different pieces of news and only one of them is ever
   true about a given response.

   It does not apologise and it does not bury the lede: the first clause says
   what they are holding, which is the thing the old note got wrong. */
export function refusalNote(cardio, flow) {
  const what = cardio && flow ? "cardio and mobility" : cardio ? "cardio" : flow ? "mobility work" : "what you picked";
  return `This is a lifting session, not the ${what} week you picked: ${what} is not something this plan can build for you yet. `
    + `Do your own ${what} instead if you would rather, and nothing here is counted against you.`;
}

/* The session a cardio-only week should actually hand back, out of the library
   the app already reads, or null when there is nothing honest to build.

   Null rather than an empty day in two cases, and both matter. Somebody who
   ticked only Sports has no mode the library knows (see STYLE_KIND), and
   `cardioFor` answers a modeless ask with EVERY session it has, so building
   from that would hand a five a side player an Easy Run and call it their
   choice. And somebody who ticked only Yoga or Pilates needs a flow session,
   which is a move list with no sets and nowhere to put it in the workout shape
   this engine returns; knowledge/exercise-library has the moves and
   engine/activity-session.mjs can build the session, but the day it belongs on
   is the caller's screen and not this response. Both come back null and the
   refusal note above is what the person gets instead.

   Seeded by the date, so the same day asked twice is the same session and
   tomorrow is a different one. Same rule the rest of the engine follows: a
   generator that reshuffles on every call cannot be reviewed or tested. */
export function cardioSessionFor(styles, { level = "beginner", today = new Date(), minutes = null } = {}) {
  const modes = styles?.cardioModes || [];
  if (!modes.length) return null;
  /* Filtered again on the way out, and this is not belt and braces. `cardioFor`
     answers with everything at the person's level rather than nothing when a
     mode has no session they can do, which is the right call for a week planner
     choosing among several modes and the wrong one here: the library's only
     swim is tagged intermediate, so a beginner who ticked Swimming was handed
     an Easy Spin on a stationary bike, under a note saying the week was cardio
     only "because that is what you picked". Better to say we could not build it
     than to build something they did not ask for and put their own words on it. */
  const all = cardioFor({ modes, level }).filter((s) => modes.includes(s.mode));
  if (!all.length) return null;
  /* The clock they gave us, applied the same way plan.mjs applies it to a
     lifting day. The library runs from a 20 minute row to a 60 minute walk, so
     somebody who said they have half an hour and ticked Walking was being
     handed an hour long walk. Narrowed rather than trimmed: a cardio session's
     length is part of what it IS, and cutting a 60 minute easy walk to 30
     makes it a different session rather than a shorter one. Where nothing fits
     the whole list stands and `meta.session.fits` says so. */
  const fits = minutes ? all.filter((s) => s.minutes <= minutes) : [];
  const picks = fits.length ? fits : all;
  const day = today instanceof Date ? today : new Date(today);
  const seed = Number.isFinite(day.getTime())
    ? day.getFullYear() * 10000 + (day.getMonth() + 1) * 100 + day.getDate()
    : 0;
  const s = picks[seed % picks.length];
  return {
    focus: s.name,
    /* The session itself, in the cardio library's own words. `effort` is a rate
       of perceived exertion and `cue` says what that feels like, which is the
       library's deliberate answer to not knowing anybody's heart rate. */
    cardio: { name: s.name, mode: s.mode, minutes: s.minutes, effort: s.effort, cue: s.cue, structure: s.structure || null },
    /* Empty, and it has to stay empty. Everything downstream treats an entry in
       here as sets of a lift: a run written in as an exercise would be logged
       as a set, counted by calibrate.mjs as prescribed work nobody did, and
       lit on the Body tab as muscles that were trained to failure. */
    exercises: [],
    /* No warm-up or cool-down, on purpose. mobility.mjs picked those for the
       movement patterns of a LIFTING day, so a running day would inherit
       thoracic rotations chosen for a bench press. The library's own cue is the
       preparation this session comes with. */
    warmup: [],
    cooldown: [],
  };
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
