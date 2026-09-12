/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/focus.mjs. Do not edit here. */
/* Focus: what somebody tapped on the body, in the language the plan speaks.
 *
 * The body picker in index.html works at the level of a muscle piece: you tap
 * the outer hamstring, or the rear delt, and it zooms. `plan.mjs` has never
 * heard of a rear delt. It thinks in the app's fourteen groups, and it already
 * has a lever for exactly this: `P.priority`, a list of group keys that earns
 * a weekly sets multiplier through `setsFor`. So this module is a translator
 * and a merge, and nothing else. It decides no volume and picks no exercise.
 *
 * Since 2026-09-12 a pick also carries how badly they want it. Three tiers,
 * red, yellow and green in the picker, 3, 2 and 1 in the column, and the tier
 * is what chooses the multiplier. See TIER_MULTIPLIER and FOCUS_BUDGET below
 * for the two decisions that matters most: how much each tier is worth, and
 * what stops somebody from marking the whole body red.
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

/* The three tiers. The picker paints them red, yellow and green; the column
   stores the number, because a colour is a decision the app is allowed to
   change and 3 is not. `secondary` is deliberately the middle one AND the
   default, so a legacy pick that carries no tier at all means exactly what it
   meant before any of this existed. */
export const TIERS = Object.freeze({ main: 3, secondary: 2, light: 1 });
const TIER_NAME = Object.freeze({ 3: "main", 2: "secondary", 1: "light" });

/* What each tier is worth in weekly sets, and the reason for these three
   numbers rather than three others.
 *
 * The middle one is 1.4 because it already was. Every plan built before tiers
 * existed ran one flat 1.4x, and a legacy `["chest","back"]` pick normalises to
 * this tier, so somebody who tapped chest in August gets the identical week in
 * September. A refactor that quietly reweights the plans of everybody who
 * already chose is not a refactor, it is a silent change of prescription.
 *
 * Green is 1.2 and red is 1.75, and the gap on the red side is wider than the
 * one on the green side because the plan is made of whole sets, not of
 * multipliers. `setsFor` divides a weekly target by how often the group is hit,
 * rounds to a whole set and clamps the session to [2, 6], so two multipliers
 * that are close together come back as the same prescription and the picker
 * ends up showing a difference the plan does not have. That was measured
 * rather than guessed: across 286 goal, day count and group combinations, a
 * red of 1.6 gave red and yellow the identical weekly total 90 times and never
 * once produced four distinct answers for none, green, yellow and red. At 1.75
 * the identical pairs drop to 40 and the four-way ladder appears (a 4 day
 * lose-a-number week reads chest 6, 8, 10, 12 sets). Above 1.75 nothing
 * further moves, because what is left is the clamp rather than the rounding,
 * so 1.75 is the smallest red that is a different prescription rather than a
 * different label.
 *
 * Green is 1.2 and could be 1.15 or 1.25 for all the difference it makes: all
 * three landed on identical numbers everywhere in that same run, because
 * `setsFor`'s +1 floor is what a light focus actually buys. 1.2 is the honest
 * label for "one more set than you would have had".
 *
 * Above the clamp the tiers converge, and that is honest rather than broken.
 * An intermediate's base of 14 sets is already over the per-session ceiling on
 * any group hit once or twice a week, so every tier lands on 6 and the tier
 * shows up only in the weekly ledger's target (README, "The sweep", finding 1,
 * which is the same clamp seen from the other side). The tiers bite hardest
 * exactly where somebody is new enough for the volume to matter and it has
 * room to move. The other end of that is a red target an advanced lifter's
 * week cannot spend: 16 base sets at 1.75 is a target of 28, past anything in
 * volume-landmarks.md, and the only reason it is not a prescription of 28 sets
 * is the same clamp. It is reported in README under the sweep rather than
 * quietly capped here, because capping it is a change to what every existing
 * 1.4x priority means too. */
export const TIER_MULTIPLIER = Object.freeze({ 3: 1.75, 2: 1.4, 1: 1.2 });

/* What each tier costs out of the emphasis budget below. Cost is the tier
   number itself: red is worth three greens, because red is asking for three
   times as much of a fixed thing.

   Exported because the picker in index.html spends this budget too, and it
   cannot show somebody nine cells and then have the plan disagree about what
   fills them. It mirrors the table rather than importing it, since the values
   are the tier numbers and a dynamic import would make the first paint wait on
   the engine for three integers. That mirror is only safe while cost really is
   the tier number, so the test suite pins exactly that: change this table to
   anything else and the engine's own tests fail and name the picker. */
export const TIER_COST = Object.freeze({ 3: 3, 2: 2, 1: 1 });

/* The old cap was four groups and no more, for a reason that has not changed:
   the extra sets come out of a fixed weekly volume, so once most of the body is
   on the list the plan is the same plan with a longer explanation. Focusing on
   everything is focusing on nothing.
 *
   What changed is that four groups is the wrong unit once the groups are not
   all worth the same. So the cap is a budget in tier-cost, and it is set to
   exactly what the old four-group cap cost: four groups at the middle tier, 2
   each, is 8, and 9 is that plus one green. Spend it however: three reds, or
   four yellows, or one red, two yellows and two greens, or nine greens. A
   legacy pick of five groups still keeps four and drops the fifth, to the
   letter, because 8 fits in 9 and 10 does not. */
export const FOCUS_BUDGET = 9;

/* The combined budget, after the goal's own priority groups are merged in, is
   two higher for the same reason the old combined cap was one group higher:
   the goal has a claim too, and a person whose goal already named two groups
   should not lose both to a tap. Eleven is five middle-tier groups, which is
   what MAX_PRIORITY was. */
export const MAX_PRIORITY_BUDGET = 11;

/* Kept, and now derived rather than declared, because index.html and the tests
   both talk in groups and both were written against these two numbers. They
   are what the budgets come to when every group is at the middle tier, which is
   the only world that existed when they were written. */
export const MAX_FOCUS = Math.floor(FOCUS_BUDGET / TIER_COST[TIERS.secondary]);
export const MAX_PRIORITY = Math.floor(MAX_PRIORITY_BUDGET / TIER_COST[TIERS.secondary]);

/* "Select my whole body", as one token the picker can store instead of writing
   fourteen rows. It expands to every group at the lightest tier, which then
   trips the rule below and comes back as no focus at all with a sentence
   saying so. That round trip is deliberate: the button is a real thing people
   will tap, and the honest answer to it has to be computed by the same code
   that would answer fourteen individual taps, or the two would drift. */
const WHOLE_BODY_WORDS = new Set(["all", "everything", "wholebody", "whole-body", "whole_body", "full-body", "fullbody"]);

/* Where a pick stops being emphasis and becomes the baseline. Twelve of the
   fourteen at one level leaves two groups to surrender the volume, and two
   groups do not have that much to give. Below twelve the budget above handles
   it by dropping what does not fit; at or above it, nothing was really asked
   for and the plan says that out loud rather than picking three of the fourteen
   on the person's behalf. */
export const WHOLE_BODY_MIN = 12;

/* One token to one group, or null. Piece keys are camelCase and group keys are
   lower case, so the lookup is done twice: once verbatim, once folded. */
function groupOf(token) {
  if (typeof token !== "string") return null;
  const s = token.trim();
  if (!s) return null;
  const low = s.toLowerCase();
  return IS_GROUP.has(low) ? low : (GROUP_FOR_PIECE[s] || FOLDED_PIECE[low] || null);
}

const TIER_WORD = { main: 3, red: 3, primary: 3, high: 3, secondary: 2, yellow: 2, medium: 2, light: 1, green: 1, low: 1 };

/* An unreadable tier on a readable group falls back to the middle, rather than
   dropping the group. Somebody tapped that muscle; the worst honest reading of
   "chest:banana" is still "they want chest". Same instinct as the rest of this
   file, where a stale piece name costs a filter and never a plan. */
function tierOf(token) {
  if (token == null || token === true || token === "") return TIERS.secondary;
  const n = typeof token === "number" ? token : Number(String(token).trim());
  if (Number.isFinite(n)) return TIER_NAME[Math.round(n)] ? Math.round(n) : TIERS.secondary;
  const w = TIER_WORD[String(token).trim().toLowerCase()];
  return w || TIERS.secondary;
}

/* Every shape the column has ever held or will hold, flattened to one map.
 *
 * `profiles.focus_groups` is a live `text[]` with real picks in it, so the
 * three accepted shapes are not generosity, they are the migration:
 *
 *   ["chest", "back"]            the legacy pick. Every group at TIERS.secondary
 *   ["chest:3", "calves:1"]      the tiered pick, still a text[], still one column
 *   { chest: 3, calves: "green" }  the same thing as jsonb, for whoever moves the column later
 *
 * The encoded string is what the app writes today. It is not the prettiest
 * shape in this repo and it is the only one that needed no migration and no
 * second column, which means there is no window where the tier and the group
 * list can disagree with each other, and no dual write to get wrong. The
 * object form costs six lines here and buys the option of changing the column
 * type later without touching the engine again.
 *
 * A duplicate group takes the highest tier it was given, because the two ways
 * to reach one group (tap the muscle, tap a head inside it) are the same
 * intent and the stronger one is what they meant. */
function toTiers(input) {
  const map = {};
  const order = [];
  const add = (rawGroup, rawTier) => {
    const group = groupOf(rawGroup);
    if (!group) return;
    const tier = tierOf(rawTier);
    if (!order.includes(group)) order.push(group);
    map[group] = Math.max(map[group] || 0, tier);
  };

  if (input && typeof input === "object" && !Array.isArray(input)) {
    for (const [k, v] of Object.entries(input)) {
      if (v === false || v === null || v === undefined) continue;
      add(k, v);
    }
    return { map, order };
  }

  let list;
  if (Array.isArray(input)) list = input;
  else if (typeof input === "string") list = input.split(",");
  else return { map, order };

  for (const raw of list) {
    if (raw && typeof raw === "object" && !Array.isArray(raw)) { add(raw.group ?? raw.key, raw.tier ?? raw.level); continue; }
    if (typeof raw !== "string") continue;
    const s = raw.trim();
    if (!s) continue;
    if (WHOLE_BODY_WORDS.has(s.toLowerCase())) {
      for (const g of MUSCLE_GROUPS) add(g, TIERS.light);
      continue;
    }
    const cut = s.search(/[:=]/);
    if (cut < 0) add(s, null);
    else add(s.slice(0, cut), s.slice(cut + 1));
  }
  return { map, order };
}

/* The pick as the rest of the engine wants to read it: a tier map, plus the
   groups in the order the budget should be spent on them. Highest tier first,
   and within a tier the order they were tapped in, so the thing that loses when
   somebody overspends is the lightest and latest pick rather than an accident
   of the alphabet. */
export function parseFocus(input) {
  const { map, order } = toTiers(input);
  const groups = order.slice().sort((a, b) => (map[b] - map[a]) || (order.indexOf(a) - order.indexOf(b)));
  return { tiers: map, groups };
}

/* Anything unrecognised is dropped in silence. This runs on a stored profile
   column that older clients wrote and newer ones will rewrite, so a stale piece
   name is an expected input, not an error worth failing a whole plan over.
 *
   Kept at the old shape, a plain group list spent against the budget, because
   callers outside this module still ask the old question. `parseFocus` is the
   one that carries the tiers. */
export function normalizeFocus(input) {
  const { tiers, groups } = parseFocus(input);
  return spend(groups, tiers, FOCUS_BUDGET).kept;
}

/* The same translation with no cap and no tiers. The cap belongs to what a
   person taps, not to what the goal tree already says: one recomp child names
   five groups, and running it through the budget would quietly change the plan
   for everybody with that goal and nothing to do with the picker. */
function toGroups(input) {
  const { map, order } = toTiers(input);
  return order.filter((g) => map[g]);
}

/* Greedy, highest tier first, and it keeps going past a group that does not
   fit rather than stopping there. A red that missed by one leaves room for a
   green behind it, and spending the last unit of the budget on the lightest
   thing somebody asked for is better than handing it back. Everything that did
   not fit comes out in `dropped` and gets named, never silently lost. */
function spend(groups, tiers, budget) {
  const kept = [];
  const dropped = [];
  let left = budget;
  for (const g of groups) {
    const cost = TIER_COST[tiers[g]] || TIER_COST[TIERS.secondary];
    if (cost <= left) { kept.push(g); left -= cost; } else dropped.push(g);
  }
  return { kept, dropped, left };
}

const listOut = (a) => a.length === 1 ? a[0] : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
const plural = (a, one, many) => a.length === 1 ? one : many;

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
  const { tiers: asked, groups: askedOrder } = parseFocus(userFocus);
  const why = [];
  /* The subset of `why` that has to reach the plan's own dayNotes rather than
     only meta.focus. One sentence qualifies today: the one that says the pick
     was so wide it changed nothing. A person who taps every muscle and gets an
     ordinary week back deserves to read why on the card, not in a meta block
     nothing renders. */
  const notes = [];

  const avoid = revealed && Array.isArray(revealed.avoid) ? toGroups(revealed.avoid) : [];
  const overruled = askedOrder.filter((g) => avoid.includes(g));
  let wanted = askedOrder.filter((g) => !avoid.includes(g));

  if (overruled.length) {
    why.push(`You picked ${listOut(overruled)}, but your last few weeks say otherwise, `
      + `so it is not being pushed this week. What you train is newer information than what you tapped.`);
  }

  /* Emphasis is relative or it is nothing. Past WHOLE_BODY_MIN groups at one
     level there is nobody left to take the sets from, so the answer is the
     plain week, said out loud. This is also what "select my whole body"
     resolves to, by design: the button is answerable, and the answer is that it
     does not change the plan. The goal's own priority still stands underneath,
     because that was never the user's tap to flatten. */
  const levels = new Set(wanted.map((g) => asked[g]));
  if (wanted.length >= WHOLE_BODY_MIN && levels.size === 1) {
    const say = wanted.length === MUSCLE_GROUPS.length
      ? "You picked your whole body at one level, which is the same week as picking none of it: the extra sets a focus earns have to come out of the groups you did not pick. Volume is spread evenly. Mark two or three red and the week changes shape."
      : `You picked ${wanted.length} of the fourteen muscle groups at the same level, and the extra sets a focus earns have to come out of the ones you did not pick. There are not enough of those left, so volume is spread evenly. Mark two or three red and the week changes shape.`;
    why.push(say);
    notes.push(say);
    wanted = [];
  }

  /* The tap goes first. It is explicit, it is recent, and it is the only one of
     the two the person can see themselves having made. */
  const mine = spend(wanted, asked, FOCUS_BUDGET);
  const tiers = {};
  let spent = 0;
  for (const g of mine.kept) { tiers[g] = asked[g]; spent += TIER_COST[asked[g]]; }

  /* The goal's own groups come in at the middle tier, which is the multiplier
     they have always had: the goal tree says "prioritise these" and has never
     said how much.
   *
     And the goal's claim is a floor, never a ceiling. The sweep of 2026-09-12
     caught the alternative on the first run: marking biceps GREEN on a goal
     that already prioritises arms came back with fewer weekly sets than not
     touching the body map at all, 10 against 12, because a light tap replaced
     the goal's own 1.4x with 1.2x. Nobody taps a muscle to train it less. So a
     group both of them name takes the higher of the two, and the raise is paid
     for out of budget even when that puts the total over: not raising it would
     be taking volume away from somebody for asking, and there is no budget
     argument that survives that. */
  const fromGoal = [];
  const raised = [];
  for (const g of goal) {
    if (tiers[g]) {
      if (tiers[g] < TIERS.secondary) {
        spent += TIER_COST[TIERS.secondary] - TIER_COST[tiers[g]];
        tiers[g] = TIERS.secondary;
        raised.push(g);
      }
      continue;
    }
    if (spent + TIER_COST[TIERS.secondary] > MAX_PRIORITY_BUDGET) continue;
    tiers[g] = TIERS.secondary;
    spent += TIER_COST[TIERS.secondary];
    fromGoal.push(g);
  }

  const priority = [...mine.kept, ...fromGoal];

  /* Read off the tiers that really ran, not the ones that were tapped, because
     a group the goal raised is now a secondary focus and saying "a light nudge"
     about it would be describing a plan that was not built. */
  const byTier = (t) => mine.kept.filter((g) => tiers[g] === t);
  const red = byTier(TIERS.main), yellow = byTier(TIERS.secondary), green = byTier(TIERS.light);
  if (red.length) why.push(`Most of the extra volume goes to ${listOut(red)}, ${plural(red, "the group", "the groups")} you marked red.`);
  if (yellow.length) why.push(`${listOut(yellow)} ${plural(yellow, "is a secondary focus and gets", "are secondary focuses and get")} a smaller share.`);
  if (green.length) why.push(`${listOut(green)} ${plural(green, "gets", "get")} a light nudge, which is what green asks for.`);
  if (raised.length) why.push(`Your goal already pushes ${listOut(raised)}, so ${plural(raised, "it stays", "they stay")} a secondary focus `
    + `rather than dropping to the light one you picked. A tap never buys less than no tap.`);
  if (fromGoal.length) why.push(`Your goal also puts ${listOut(fromGoal)} ahead of the rest of the week.`);
  if (!priority.length && !notes.length) why.push("No group is being pushed ahead of the others this week, so volume is spread evenly.");

  const missed = [...mine.dropped, ...goal.filter((g) => !tiers[g])].filter((g, i, a) => a.indexOf(g) === i);
  if (missed.length) why.push(`${listOut(missed)} ${plural(missed, "was", "were")} in line and did not fit. `
    + `A focus is a share of one week's volume, and past about ${MAX_PRIORITY} groups the extra stops being extra.`);

  return { priority, tiers, why, notes };
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
