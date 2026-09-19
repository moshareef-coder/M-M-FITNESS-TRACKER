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
 *   3 Which cardio modes and which mat classes are on the table, and the day
 *     itself for both. Until 2026-09-18 this module only reported them and
 *     left the day to the caller, which read well in the contract and failed
 *     in practice: the engine returned five lifts to somebody who had ticked
 *     only Running, set `honoured: false`, and attached a sentence saying
 *     "this week is cardio only". Two claims in one response, one of them
 *     false, and whether the person ever saw a run depended on a caller
 *     remembering to build one. So the day is built here now, out of the same
 *     cardio library the app reads. plan.mjs still builds lifting and only
 *     lifting; this is beside it, not inside it, because a run has no sets, no
 *     reps and no progression model, and pretending otherwise is how a run
 *     ends up logged as a set.
 *
 *     Yoga and Pilates stayed refused for a day longer than that, and the
 *     reason written here was that a flow session is "a move list with no sets
 *     and nowhere to put it in the workout shape this engine returns". That
 *     was a shape problem and not a knowledge problem: the moves are already
 *     in knowledge/exercise-library and engine/activity-session.mjs already
 *     builds the class. So since 2026-09-19 a flow day travels the road a run
 *     travels, as `workout.flow` beside `workout.cardio`, `exercises` empty
 *     for exactly the same reason. Somebody who ticked only Yoga is no longer
 *     handed five lifts under a note about mobility work.
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
import { YOGA } from "../../knowledge/exercise-library/yoga.mjs";
import { PILATES } from "../../knowledge/exercise-library/pilates.mjs";
import { buildActivitySession, levelFromSessions, MIN_SESSION_MINUTES } from "./activity-session.mjs";

/* The vocabulary onboarding writes. Anything outside it is dropped rather than
   guessed at: a typo in a text[] column should narrow nothing.

   Seven, and it was twelve until 2026-09-19. Swimming, rowing, classes, hiking
   and sports were on the sheet, and every one of them was a place this engine
   had to say "cannot build": sports named no session in any library, and the
   other four had one row or none at the level a person could be given. Mo's
   call was fewer promises, all kept. A profile saved while those ticks existed
   may still hold one of the old words; it is dropped here exactly as a typo is,
   so somebody whose only tick was swimming reads as never asked and keeps a
   full plan rather than an empty one. */
export const STYLE_KEYS = Object.freeze([
  "lifting", "home", "running", "cycling", "walking", "pilates", "yoga",
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
 *   flowTrainings    yoga, pilates, or both, in the order they ticked them
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
   what they are holding, which is the thing the old note got wrong.

   The reason clause was "X is not something this plan can build for you yet"
   until 2026-09-19, and that was the truth while yoga and Pilates were refused
   wholesale. It is not the truth any more and a sentence that outlives its
   reason is how an app starts lying politely. What is left is narrow and the
   sentence now says the narrow thing: a cardio library that came back with
   nothing in the mode they named, or a flow library with no move they can do.
   In both the honest claim is about the library and not about the app's
   ambitions. Since the styles were cut to seven on 2026-09-19 no tick a person
   can make reaches this sentence with the library as it ships; it stays because
   the library can change under it, and a refusal that is never needed costs
   nothing, where a missing one costs somebody a week. */
export function refusalNote(cardio, flow) {
  const what = cardio && flow ? "cardio and mobility" : cardio ? "cardio" : flow ? "mobility work" : "what you picked";
  return `This is a lifting session, not the ${what} week you picked: nothing in the ${what} library fits what you asked for, `
    + `so there was nothing honest to build. Do your own ${what} instead if you would rather, and nothing here is counted against you.`;
}

/* The date as one number. Every session picker in this module, and the app's
   own activity sheet, is seeded off it: the same day asked twice is the same
   answer and tomorrow is a different one. Same rule the rest of the engine
   follows, because a generator that reshuffles on every call cannot be
   reviewed, argued with or tested. */
function daySeed(today) {
  const day = today instanceof Date ? today : new Date(today);
  return Number.isFinite(day.getTime())
    ? day.getFullYear() * 10000 + (day.getMonth() + 1) * 100 + day.getDate()
    : 0;
}

/* The cardio half of a week with no lifting in it, out of the library the app
   already reads, or null when there is nothing honest to build.

   Null rather than an empty day, and it matters: `cardioFor` answers a mode
   it cannot serve with EVERY session it has, so building from an unfiltered
   answer would hand somebody a session in a mode they never ticked and call
   it their choice. That is what happened while Sports was a tick with no mode
   behind it, and it is why the modes are filtered again on the way out.

   Until 2026-09-19 this also refused a yoga-only week, on the grounds that a
   flow session is a move list with nowhere to sit in the shape this engine
   returns. `flowSessionFor` below is that shape, and `styleDayFor` is what
   decides between the two, so a null from here is now the cardio half saying
   no rather than the whole answer.

   No `level` argument any more. It used to take the person's training level
   and that concept is gone from the engine; what the library is asked for now
   is a property of the REQUEST, and the reason is measured, below. */
export function cardioSessionFor(styles, { today = new Date(), minutes = null } = {}) {
  const modes = styles?.cardioModes || [];
  if (!modes.length) return null;
  /* We used to tell `cardioFor` how advanced the PERSON was, and that is gone
     with the training level. What it is told instead is a property of the
     request: they ticked this mode by name, so everything in it short of the
     hardest tier is open to them.
   *
     The reason it is not simply "beginner" is a measured one. Of the three
     modes left on the sheet, running has exactly one row tagged beginner (Easy
     Run) and five tagged intermediate, so a beginner gate handed a runner the
     same Easy Run on every day of the week. It used to be worse than that: the
     only swim, HIIT, jump rope and stairs rows were all intermediate, so the
     gate answered four ticks with nothing at all. Those ticks are gone, and the
     seven day Easy Run is reason enough on its own. Refusing variety a person
     asked for, over a difficulty tag, is the paternalism this change removed.
   *
     Advanced stays out, and that line is drawn where the request stops. They
     named a mode, not a difficulty. Sprint Intervals is the one row behind it
     in the three modes left, and nothing anybody ticked says they want it.

     Filtered again on the way out, and this is not belt and braces. `cardioFor`
     answers a mode it cannot serve with everything else it has, which is the
     right call for a week planner choosing among several modes and the wrong one
     here: it is how somebody who ticked Swimming, while that was a tick, was
     handed an Easy Spin on a stationary bike under a note saying the week was
     cardio only "because that is what you picked". */
  const all = cardioFor({ modes, level: "intermediate" }).filter((s) => modes.includes(s.mode));
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

/* ---- the flow day ----

   The libraries a flow style is built out of, named the way STYLE_KIND names
   them. Reached directly rather than through index.mjs for the same reason
   cardio is: index.mjs exports the whole TRAININGS list and would drag the
   weight training library in behind it to read two objects out of it. */
const FLOW_LIBRARY = { yoga: YOGA, pilates: PILATES };

/* How long a planned flow day runs when nobody is standing in front of the
   clock choosing one.

   Thirty, for two reasons that agree. It is the number the app's own activity
   sheet opens on and the number buildActivitySession defaults to, so a planned
   yoga day and the one somebody would have got by opening the timer themselves
   are the same class rather than two answers to one question. And it is the
   length these libraries can actually fill: yoga holds about fourteen minutes
   of unique beginner work and Pilates about eight, so thirty is two or three
   rounds of a sequence rather than six.

   The ceiling is an hour, and it is a refusal to overpromise rather than a
   tidy number. plan.mjs will cost a lifting week at up to two hours, and two
   hours of this is one short sequence run eight times. The session would say
   so in its own notes, and a plan whose notes have to apologise for its length
   is a plan built wrong. What was asked for is said out loud either way. */
export const FLOW_MINUTES_DEFAULT = 30;
export const FLOW_MINUTES_MAX = 60;

function flowLength(askedMinutes) {
  /* `Number(true)` is 1, so a boolean is excluded by hand, the same guard
     plan.mjs puts on session_minutes and for the same reason. */
  const raw = typeof askedMinutes === "boolean" ? NaN : Number(askedMinutes);
  if (!Number.isFinite(raw) || raw <= 0) return { minutes: FLOW_MINUTES_DEFAULT, note: null };
  const asked = Math.round(raw);
  if (asked <= FLOW_MINUTES_MAX) return { minutes: Math.max(MIN_SESSION_MINUTES, asked), note: null };
  return {
    minutes: FLOW_MINUTES_MAX,
    note: `You asked for ${asked} minute sessions. This one is ${FLOW_MINUTES_MAX}, because past an hour the class is `
      + `the same sequence coming round again rather than more of it.`,
  };
}

/* How hard a class to build, from how many of these they have already done.

   Not from anything the lifting side knows. That is a lifting training age,
   worked out of logged loads and dated sessions, and an advanced deadlifter
   who has never been on a mat is a beginner here. activity-session.mjs is
   explicit that the only honest input is mileage, and mileage is what the
   payload carries: the app writes the activity's own label into
   exercise_logs.exercise_name, so "Yoga" rows are yoga sessions and they can
   be counted.

   The payload's window is ninety days where the app's own counter looks back a
   year, so this reads low rather than high. That is the safe direction: an
   intermediate handed a beginner sequence has a session they can do, and a
   beginner handed Crow Pose has one they cannot. */
function flowLevelFor(training, logs) {
  const label = String(training?.label || "").trim().toLowerCase();
  if (!label || !Array.isArray(logs)) return levelFromSessions(0);
  let done = 0;
  for (const l of logs) {
    if (!l || typeof l !== "object") continue;
    if (String(l.exercise_name || "").trim().toLowerCase() === label) done++;
  }
  return levelFromSessions(done);
}

/* One yoga or Pilates day, in the shape a cardio day already travels in: the
   session on a key of its own, `exercises` empty, and nothing anywhere on it
   that could be read as a set.

   `focus` is the training's plain label, "Yoga" or "Pilates", and not the
   style or a class name. Three things downstream match that exact string: the
   app's activity table (CARDIO_ACTS, which is how a planned day opens the
   right timer), exercise_logs.exercise_name (which is how Progress counts the
   session back), and the week builder's own flow days. A prettier focus would
   break all three quietly.

   Null when the library has nothing to give at this person's level or for this
   clock, which is the same refusal the cardio half makes and for the same
   reason: better to say we could not build it than to hand back something
   nobody asked for with their own words on it. */
export function flowSessionFor(styles, { training = null, today = new Date(), askedMinutes = null, logs = [] } = {}) {
  const key = training || (styles?.flowTrainings || [])[0] || null;
  const lib = key ? FLOW_LIBRARY[key] : null;
  if (!lib) return null;
  const { minutes, note } = flowLength(askedMinutes);
  const built = buildActivitySession(lib, {
    minutes,
    level: flowLevelFor(lib, logs),
    /* The library's first style, which is the one the app's activity sheet
       picks when nobody has chosen. It changes the note and nothing else: the
       poses are the same, and the engine has no basis for putting somebody in
       yin rather than vinyasa. Picking the same one the sheet picks is the
       point, so the plan and the timer describe one class. */
    styleKey: (lib.styles || [])[0]?.key || null,
    seed: String(daySeed(today)),
  });
  if (!built?.ok || !built.moves.length) return null;
  return {
    focus: built.label,
    /* The session itself. `moves` carries what a person reads off a card and
       what a clock counts down: the name, how long, whether it is done on both
       sides, which round it belongs to, and the category it came from, which
       is the only part of the library's grouping a screen ever shows.

       The muscle lists the library holds are deliberately NOT carried. Nothing
       renders them for a class, and a move with `primary: ["abs"]` sitting in
       a plan row is one refactor away from being counted as trained volume. */
    flow: {
      training: built.training,
      label: built.label,
      style: built.style ? { key: built.style.key, label: built.style.label } : null,
      level: built.level,
      minutes: built.minutes,
      seconds: built.seconds,
      rounds: built.rounds,
      moves: built.moves.map((m) => ({
        name: m.name,
        seconds: m.seconds,
        perSide: !!m.perSide,
        round: m.round,
        category: m.categoryLabel || null,
        cue: m.cue || null,
      })),
      /* The session engine's own notes, which say out loud that the sequence
         repeats and how little unique work there was to repeat, plus ours
         about the clock. Kept rather than summarised: this codebase reports
         what it could not do. */
      notes: [...(built.notes || []), ...(note ? [note] : [])],
    },
    /* Empty, and it has to stay empty, for the reason the cardio day gives
       above. A pose in `exercises` is a logged set, prescribed volume nobody
       did, and a lit muscle on the Body tab. */
    exercises: [],
    /* No warm-up or cool-down. On a lifting day mobility.mjs picks those for
       the movement patterns of the lifts; here the session IS mobility work,
       and bolting a stretch block onto a yoga class is the app not knowing
       what it just prescribed. */
    warmup: [],
    cooldown: [],
  };
}

/* THE DAY a week with no resistance training in it should get, which is a real
   question once more than one kind of day is available.

   A week with two kinds in it alternates, it does not pick a favourite.
   Somebody who ticked Running and Yoga meant both, and an engine that answered
   with a run every single time would be ignoring half the column, which is the
   bug this module was written to fix one level further up. So the ticked kinds
   go in a ring and the date turns it: Monday and Tuesday are different kinds
   of day, and the same day asked twice is the same day. It is the rule the
   app's own week builder already follows when there is no lifting to protect
   (weekGenKinds in index.html alternates through what was ticked rather than
   filling a week with one of them), so the two agree about what a mixed week
   is, even though they reach the dates differently.

   Cardio takes the first slot and the flow trainings follow in the order they
   were ticked. On a two kind week that decides nothing except which of them
   lands on an odd day, and there is nothing in ../research/ that would justify
   pretending it decides more.

   Falling through to the next kind when one cannot be built is not a
   substitution. cardioSessionFor refuses a mode the library cannot serve, and
   for somebody who also ticked Yoga the honest answer
   to that refusal is the yoga day they also asked for, not the lifting day
   they did not. Null, and with it the refusal note, only when NOTHING in the
   ring can be built, which with the seven styles that are left means a
   library that came back empty. */
export function styleDayFor(styles, { today = new Date(), minutes = null, askedMinutes = null, logs = [] } = {}) {
  const ring = [];
  if ((styles?.cardioModes || []).length) ring.push("cardio");
  for (const t of styles?.flowTrainings || []) ring.push(t);
  if (!ring.length) return null;
  const start = daySeed(today) % ring.length;
  for (let i = 0; i < ring.length; i++) {
    const pick = ring[(start + i) % ring.length];
    const day = pick === "cardio"
      ? cardioSessionFor(styles, { today, minutes })
      : flowSessionFor(styles, { training: pick, today, askedMinutes, logs });
    if (day) return day;
  }
  return null;
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
