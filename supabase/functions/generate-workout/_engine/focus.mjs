/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/focus.mjs. Do not edit here. */
/* Focus: what somebody tapped on the body, in the language the plan speaks.
 *
 * The body picker in index.html works at the level of a muscle piece: you tap
 * the outer hamstring, or the rear delt, and it zooms. `plan.mjs` has never
 * heard of a rear delt. It thinks in the app's fourteen groups, and it already
 * has a lever for exactly this: `P.priority`, a list of group keys that earns
 * 1.4x weekly sets through `setsFor`. So this module is a translator and a
 * merge, and nothing else. It decides no volume and picks no exercise.
 *
 * Two signals arrive here and they are not equal (PLAN-2's table). The goal's
 * own priority is what the tree says people with that goal need. The user's
 * focus is what they asked for, today, with a deliberate tap. Both go in, the
 * tap first, because a stated preference that we quietly ignore is the
 * paternalism the product rule exists to prevent. `revealed` is where W3's
 * measured preference will land, and where it disagrees with the tap it wins,
 * because somebody who picked glutes in January and has not hip thrusted since
 * February has told us something newer than the tap.
 *
 * Deno safe: no node: imports, no dependencies, no file reads.
 */

/* The app's fourteen. Same keys, same spelling as `MUSCLE_GROUPS` in
   index.html and as the `group` field in knowledge/anatomy/muscle-detail.mjs,
   because `plan.mjs` matches an exercise's `primary[0]` against them. */
export const MUSCLE_GROUPS = Object.freeze([
  "chest", "shoulders", "traps", "lats", "lowerback", "biceps", "triceps",
  "forearms", "abs", "obliques", "glutes", "quads", "hamstrings", "calves",
]);

const IS_GROUP = new Set(MUSCLE_GROUPS);

/* Piece key to group, mirroring MUSCLE_PIECES in
   knowledge/anatomy/muscle-detail.mjs, plus the heads from MUSCLE_HEADS that
   the zoomed view can select on their own.

   Written out rather than imported, for the same reason `ALIASES` in
   adapter.mjs is written out: the engine is vendored file by file into the
   edge function by scripts/vendor-engine.mjs, and every import that leaves
   this directory is a special case in that script. Two files describing the
   same thing drift, so the shape is deliberately dumb and checkable: every
   value here must be one of MUSCLE_GROUPS, and every key in MUSCLE_PIECES
   must appear here. */
const GROUP_FOR_PIECE = {
  /* MUSCLE_PIECES */
  deltoids: "shoulders", posteriorDeltoid: "shoulders",
  pectoralisMajor: "chest",
  trapezius: "traps", sternocleidomastoid: "traps",
  latissimusDorsi: "lats", teresMajor: "lats",
  erectorSpinae: "lowerback",
  biceps: "biceps", brachialis: "biceps",
  tricepsBrachii: "triceps",
  brachioradialis: "forearms", flexorCarpiRadialis: "forearms",
  flexorCarpiUlnaris: "forearms", extensorCarpiUlnaris: "forearms",
  rectusAbdominis: "abs",
  externalObliques: "obliques",
  gluteusMaximus: "glutes", gluteusMedius: "glutes",
  rectusFemoris: "quads", vastusLateralis: "quads", vastusMedialis: "quads",
  sartorius: "quads", adductorMagnus: "quads",
  bicepsFemoris: "hamstrings", semitendinosus: "hamstrings",
  gastrocnemius: "calves", soleus: "calves", tibialisAnterior: "calves",
  /* MUSCLE_HEADS, which the zoomed callouts can be tapped on directly */
  anteriorDeltoid: "shoulders", lateralDeltoid: "shoulders",
  pecClavicular: "chest", pecSternal: "chest",
  upperTraps: "traps", midTraps: "traps", lowerTraps: "traps",
  bicepsLong: "biceps", bicepsShort: "biceps",
  tricepsLong: "triceps", tricepsLateral: "triceps", tricepsMedial: "triceps",
  upperAbs: "abs", lowerAbs: "abs",
};

/* Piece keys are camelCase and group keys are lower case, so the lookup is done
   twice: once verbatim, once folded. That way "Glutes" from a stored profile
   and "gluteusMaximus" from the picker both land. */
const FOLDED_PIECE = {};
for (const [k, g] of Object.entries(GROUP_FOR_PIECE)) FOLDED_PIECE[k.toLowerCase()] = g;

/* Four, and not more. A priority list is a share of a fixed weekly volume: the
   1.4x has to come out of somewhere, and once most of the body is on the list
   the plan is the same plan with a longer explanation. Focusing on everything
   is focusing on nothing. */
export const MAX_FOCUS = 4;

/* The combined list is capped one higher, because the goal's own priority has
   a claim too and a person whose goal already named two groups should not lose
   both to a four group tap. Five is the point where `setsFor` is still moving
   a meaningfully smaller set of lifts than it leaves alone. */
export const MAX_PRIORITY = 5;

/* Anything unrecognised is dropped in silence. This runs on a stored profile
   column that older clients wrote and newer ones will rewrite, so a stale piece
   name is an expected input, not an error worth failing a whole plan over. */
export function normalizeFocus(input) {
  return toGroups(input).slice(0, MAX_FOCUS);
}

/* The same translation with no cap. The cap belongs to what a person taps, not
   to what the goal tree already says: one recomp child names five groups, and
   running it through the four cap would quietly change the plan for everybody
   with that goal and nothing to do with the picker. */
function toGroups(input) {
  let list;
  if (Array.isArray(input)) list = input;
  else if (typeof input === "string") list = input.split(",");
  else return [];

  const out = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const s = raw.trim();
    if (!s) continue;
    const low = s.toLowerCase();
    const group = IS_GROUP.has(low) ? low : (GROUP_FOR_PIECE[s] || FOLDED_PIECE[low] || null);
    if (!group || out.includes(group)) continue;
    out.push(group);
  }
  return out;
}

const listOut = (a) => a.length === 1 ? a[0] : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;

/* Both sources in, one priority list out, plus the sentences that explain it.
 *
 * `why` is an array of plain sentences rather than a code, for the same reason
 * `training-age.mjs` publishes one: a plan that quietly prioritises something
 * cannot be argued with, and the first question support gets is "why is my
 * week suddenly leg heavy".
 *
 * `revealed` is W3's output and is null until it ships. Shape:
 * `{ avoid: [groups], prefer: [groups] }`. Only `avoid` is acted on here, and
 * only against the user's own focus: dropping a group the goal named would be
 * overruling the goal from a swap count, which is a bigger claim than this
 * round has evidence for. `prefer` is read by nobody yet, deliberately. */
export function mergePriority({ goalPriority = [], userFocus = [], revealed = null } = {}) {
  const goal = toGroups(goalPriority);
  const asked = normalizeFocus(userFocus);
  const why = [];

  const avoid = revealed && Array.isArray(revealed.avoid) ? toGroups(revealed.avoid) : [];
  const kept = asked.filter((g) => !avoid.includes(g));
  const dropped = asked.filter((g) => avoid.includes(g));

  if (dropped.length) {
    why.push(`You picked ${listOut(dropped)}, but your last few weeks say otherwise, `
      + `so it is not being pushed this week. What you train is newer information than what you tapped.`);
  }

  /* The tap goes first. It is explicit, it is recent, and it is the only one of
     the two the person can see themselves having made. */
  const priority = [];
  for (const g of [...kept, ...goal]) {
    if (!priority.includes(g)) priority.push(g);
    if (priority.length >= MAX_PRIORITY) break;
  }

  if (kept.length) why.push(`Extra volume on ${listOut(kept)}, because you picked ${kept.length === 1 ? "it" : "them"} on the body map.`);
  const fromGoal = priority.filter((g) => !kept.includes(g));
  if (fromGoal.length) why.push(`Your goal also puts ${listOut(fromGoal)} ahead of the rest of the week.`);
  if (!priority.length) why.push("No group is being pushed ahead of the others this week, so volume is spread evenly.");

  const overflow = [...kept, ...goal].filter((g, i, a) => a.indexOf(g) === i).length - priority.length;
  if (overflow > 0) why.push(`${overflow} more ${overflow === 1 ? "group was" : "groups were"} in line and did not fit. `
    + `Past about ${MAX_PRIORITY} the extra volume stops being extra.`);

  return { priority, why };
}

/* Sixty days. Long enough that a January answer is not thrown away in March,
   short enough that a body picked before a whole training block is flagged.
   Nothing acts on `stale` yet: it is reported so the app can ask again, and so
   that when W3 lands there is already a number saying how much the tap is
   worth against what the logs show. */
export const FOCUS_STALE_DAYS = 60;

const DAY = 86400000;

export function focusFreshness({ chosenAt = null, today = new Date() } = {}) {
  if (!chosenAt) return { ageDays: null, stale: false, note: "No focus has been chosen." };
  const then = chosenAt instanceof Date ? chosenAt : new Date(chosenAt);
  const t = then.getTime();
  if (!Number.isFinite(t)) return { ageDays: null, stale: false, note: "The focus date could not be read, so it is being treated as current." };

  const now = today instanceof Date ? today : new Date(today);
  /* A date in the future is a clock problem, not a stale choice, so it floors
     at zero rather than coming back negative and reading as fresher than new. */
  const ageDays = Math.max(0, Math.floor((now.getTime() - t) / DAY));
  const stale = ageDays > FOCUS_STALE_DAYS;
  return {
    ageDays,
    stale,
    note: stale
      ? `That focus was picked ${ageDays} days ago. Worth asking whether it is still the one.`
      : `Focus picked ${ageDays} ${ageDays === 1 ? "day" : "days"} ago.`,
  };
}
