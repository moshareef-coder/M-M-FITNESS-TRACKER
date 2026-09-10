/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/adapter.mjs. Do not edit here. */
/* The adapter: the engine builds a week, the app asks for one day.
 *
 * Everything in this folder speaks the tree's language, which is nine bubbles,
 * 43 children, a whole week and an honest timeline. index.html speaks a much
 * smaller one: five goal strings, a free text sentence, and exactly this back:
 *
 *   { focus: "Push day", exercises: [{ name, sets, reps, targetWeight, note }] }
 *
 * This file is the only place those two vocabularies meet. Nothing upstream of
 * it knows the app exists, and nothing in the app has to change for the engine
 * to ship. `mapGoal` also takes goal_bubble and goal_child now, which is the
 * tile picker's exact tap once profiles.goal_bubble/goal_child give it
 * somewhere to be stored; a valid one wins over the five strings and the free
 * text they come with. As more of onboarding moves to tiles, `mapGoal` is the
 * one function that gets smaller, and the rest of this file does not move.
 *
 * Deno safe: no node: imports, no dependencies, no file reads. Which is why the
 * alias table below is hand written rather than loaded from goal-tree.json.
 */
import { buildPlan } from "./plan.mjs";
import { normalizeFocus, mergePriority, focusFreshness } from "./focus.mjs";
import { normalizeLimits } from "./limits.mjs";
/* Read only, for one field. See the focus block in generateFromPayload. */
import { resolveGoal } from "./goal-engine.mjs";

/* ------------------------------------------------------------------ *
 * 1. Five goal strings in, nine bubbles out
 * ------------------------------------------------------------------ */

/* The tree already answers the reverse question: every bubble carries a
   `mapsTo` naming which of our five it lands on. This is that field, inverted,
   with `consistent` chosen over `feel-better` for "Stay consistent" because it
   is the one whose label is literally the button.

   Keys are already normalised, because `norm` runs over the goal string before
   the lookup and it strips the brackets out of "Recomp (lose fat, gain
   muscle)". Writing that label verbatim here looks right and never matches. */
const BUBBLE_FOR_GOAL = {
  "lose weight": "lose-weight",
  "build muscle": "build-muscle",
  "get stronger": "get-stronger",
  "recomp lose fat gain muscle": "tone-lean-abs",
  "recomp": "tone-lean-abs",
  "stay consistent": "consistent",
};

/* The four bubbles no button names. A person who typed "first pull up" or
   "after baby" had to pick one of five things, none of which is what they
   said, so a confident match here outranks the button they pressed. The other
   five bubbles are reachable by button, so the button is at least as good a
   witness as our substring match and we do not overrule it. */
const OVERRIDE_BUBBLES = new Set(["do-a-thing", "event", "get-back", "feel-better"]);

/* The nine bubble ids and, per bubble, the child ids under it. Hand written
   from mo-knowledge/goals/goal-tree.json, same convention as ALIASES below
   and for the same reason: this file has to stay Deno safe, so it cannot
   read the JSON at runtime and mirrors it here instead. Used only to
   validate goal_bubble/goal_child from the tile picker (see mapGoal) before
   trusting them; the same drift-check follow up noted at ALIASES covers
   this table too, and is not written yet. */
const TREE_CHILDREN = {
  "lose-weight": ["lose-a-number", "lose-belly", "lose-by-date", "lose-for-health", "lose-last-10", "lose-and-build"],
  "build-muscle": ["build-overall", "build-a-part", "build-glutes", "build-skinny-fat", "build-women"],
  "get-stronger": ["strong-a-lift", "strong-multiples", "strong-not-bigger", "strong-for-life", "strong-again"],
  "tone-lean-abs": ["tone-part", "abs", "lean-shredded"],
  "do-a-thing": ["first-pullup", "first-pushup", "run-5k", "faster-mile", "flexibility", "skills"],
  "event": ["event-run", "event-hyrox", "event-ocr", "event-test", "event-benchmark", "event-sport"],
  "feel-better": ["mental", "longevity", "energy", "prevent", "mobility", "pain"],
  "get-back": ["back-after-years", "back-postpartum", "start-fresh"],
  "consistent": ["keep-quitting", "dont-know", "no-time"],
};

function isValidBubble(bubble) {
  return typeof bubble === "string" && Object.prototype.hasOwnProperty.call(TREE_CHILDREN, bubble);
}

function isValidChild(bubble, child) {
  return typeof child === "string" && (TREE_CHILDREN[bubble] || []).includes(child);
}

/* Hand written from the `aliases` arrays in ../goals/goal-tree.json, plus a
   short tail of bare keywords ("abs", "glutes", "belly") because people type
   one word into a free text box far more often than they type a search query.
   Format: [phrase, bubble, child, theme].
 *
 * Two files describing the same aliases will drift, exactly as the tree and
 * GOAL_PARAMS would have without `checkTreeCoverage`. A demo.mjs --check style
 * assertion over this table is the follow up; it is not written yet, and this
 * comment is the marker for it. It cannot live in this file, because reading
 * the JSON needs a file read and this module has to run in Deno.
 *
 * Where the tree lists one phrase under two ids the collision is resolved here
 * once, deliberately, and noted: "run a 5k" goes to the milestone rather than
 * the race, "getting back into the gym" to get-back rather than strong-again,
 * "fix my posture" to mobility, the doctor words to prevent. */
const ALIASES = [
  /* lose-weight */
  ["lose 10 pounds in a month", "lose-weight", "lose-a-number", "number"],
  ["lose 100 lbs", "lose-weight", "lose-a-number", "number"],
  ["lose 50 pounds", "lose-weight", "lose-a-number", "number"],
  ["lose 30 pounds", "lose-weight", "lose-a-number", "number"],
  ["lose 20 pounds", "lose-weight", "lose-a-number", "number"],
  ["lose 10 pounds", "lose-weight", "lose-a-number", "number"],
  ["lose 15", "lose-weight", "lose-a-number", "number"],
  ["get under 200", "lose-weight", "lose-a-number", "number"],
  ["healthy bmi", "lose-weight", "lose-a-number", "number"],
  ["lose lower belly fat", "lose-weight", "lose-belly", "midsection"],
  ["lose stomach fat", "lose-weight", "lose-belly", "midsection"],
  ["lose belly fat", "lose-weight", "lose-belly", "midsection"],
  ["belly fat", "lose-weight", "lose-belly", "midsection"],
  ["belly", "lose-weight", "lose-belly", "midsection"],
  ["lose arm fat", "lose-weight", "lose-belly", "midsection"],
  ["lose thigh fat", "lose-weight", "lose-belly", "midsection"],
  ["for my wedding", "lose-weight", "lose-by-date", "deadline"],
  ["wedding", "lose-weight", "lose-by-date", "deadline"],
  ["before vacation", "lose-weight", "lose-by-date", "deadline"],
  ["vacation", "lose-weight", "lose-by-date", "deadline"],
  ["holiday", "lose-weight", "lose-by-date", "deadline"],
  ["summer body", "lose-weight", "lose-by-date", "deadline"],
  ["summer", "lose-weight", "lose-by-date", "deadline"],
  ["before the reunion", "lose-weight", "lose-by-date", "deadline"],
  ["reunion", "lose-weight", "lose-by-date", "deadline"],
  ["doctor told me to lose weight", "lose-weight", "lose-for-health", "health"],
  ["last 10 pounds", "lose-weight", "lose-last-10", "lean"],
  ["stubborn fat", "lose-weight", "lose-last-10", "lean"],
  ["lose the last bit", "lose-weight", "lose-last-10", "lean"],
  ["drop the last 10", "lose-weight", "lose-last-10", "lean"],
  ["plateau", "lose-weight", "lose-last-10", "lean"],
  ["lose weight and build muscle", "lose-weight", "lose-and-build", null],
  ["lose weight and gain muscle", "lose-weight", "lose-and-build", null],
  ["lose fat and gain muscle", "lose-weight", "lose-and-build", null],
  ["build muscle and lose fat", "lose-weight", "lose-and-build", null],
  ["lose weight", "lose-weight", null, null],

  /* build-muscle */
  ["gain weight with fast metabolism", "build-muscle", "build-overall", "number"],
  ["gain weight fast", "build-muscle", "build-overall", "number"],
  ["gain 20 pounds", "build-muscle", "build-overall", "number"],
  ["put on size", "build-muscle", "build-overall", "number"],
  ["gain weight", "build-muscle", "build-overall", "number"],
  ["bigger biceps", "build-muscle", "build-a-part", "upper-part"],
  ["bigger forearms", "build-muscle", "build-a-part", "upper-part"],
  ["bigger shoulders", "build-muscle", "build-a-part", "upper-part"],
  ["bigger chest", "build-muscle", "build-a-part", "upper-part"],
  ["lower chest", "build-muscle", "build-a-part", "upper-part"],
  ["bigger arms", "build-muscle", "build-a-part", "upper-part"],
  ["arms", "build-muscle", "build-a-part", "upper-part"],
  ["chest", "build-muscle", "build-a-part", "upper-part"],
  ["shoulders", "build-muscle", "build-a-part", "upper-part"],
  ["traps", "build-muscle", "build-a-part", "upper-part"],
  ["bigger calves", "build-muscle", "build-a-part", "upper-part"],
  ["bigger thighs", "build-muscle", "build-a-part", "upper-part"],
  ["grow my glutes", "build-muscle", "build-glutes", "glutes"],
  ["bigger glutes", "build-muscle", "build-glutes", "glutes"],
  ["best workout for glutes", "build-muscle", "build-glutes", "glutes"],
  ["glutes", "build-muscle", "build-glutes", "glutes"],
  ["get thicker", "build-muscle", "build-glutes", "glutes"],
  ["curvier", "build-muscle", "build-glutes", "glutes"],
  ["skinny fat", "build-muscle", "build-skinny-fat", null],
  ["should i cut or bulk", "build-muscle", "build-skinny-fat", null],
  ["soft but not big", "build-muscle", "build-skinny-fat", null],
  ["build muscle for women", "build-muscle", "build-women", null],
  ["tone not bulk", "build-muscle", "build-women", null],
  ["dont want to get bulky", "build-muscle", "build-women", null],
  ["without getting bulky", "build-muscle", "build-women", null],
  ["lean muscle", "build-muscle", "build-women", null],
  ["build muscle", "build-muscle", null, null],
  ["gain muscle", "build-muscle", null, null],
  ["get bigger", "build-muscle", null, null],

  /* get-stronger */
  ["bench my bodyweight", "get-stronger", "strong-a-lift", null],
  ["1000 lb club", "get-stronger", "strong-a-lift", null],
  ["bench 225", "get-stronger", "strong-a-lift", null],
  ["squat 315", "get-stronger", "strong-a-lift", null],
  ["deadlift 405", "get-stronger", "strong-a-lift", null],
  ["squat 2x bodyweight", "get-stronger", "strong-multiples", null],
  ["squat my bodyweight", "get-stronger", "strong-multiples", null],
  ["deadlift double bodyweight", "get-stronger", "strong-multiples", null],
  ["ohp 1x bodyweight", "get-stronger", "strong-multiples", null],
  ["bench 1.5x", "get-stronger", "strong-multiples", null],
  ["deadlift 2.5x", "get-stronger", "strong-multiples", null],
  ["without getting bigger", "get-stronger", "strong-not-bigger", null],
  ["strength not size", "get-stronger", "strong-not-bigger", null],
  ["stay in my weight class", "get-stronger", "strong-not-bigger", null],
  ["lift my kids", "get-stronger", "strong-for-life", null],
  ["carry groceries", "get-stronger", "strong-for-life", null],
  ["keep up with the kids", "get-stronger", "strong-for-life", null],
  ["stronger bones", "get-stronger", "strong-for-life", null],
  ["stronger knees", "get-stronger", "strong-for-life", null],
  ["not be frail", "get-stronger", "strong-for-life", null],
  ["used to lift in college", "get-stronger", "strong-again", null],
  ["get back to my old numbers", "get-stronger", "strong-again", null],
  ["get stronger", "get-stronger", null, null],
  ["stronger arms", "get-stronger", null, null],
  ["stronger legs", "get-stronger", null, null],

  /* tone-lean-abs */
  ["how to get toned arms", "tone-lean-abs", "tone-part", "upper-part"],
  ["toned arms", "tone-lean-abs", "tone-part", "upper-part"],
  ["toned legs", "tone-lean-abs", "tone-part", "upper-part"],
  ["toned thighs", "tone-lean-abs", "tone-part", "upper-part"],
  ["toned stomach", "tone-lean-abs", "abs", "midsection"],
  ["toned body", "tone-lean-abs", "tone-part", "upper-part"],
  ["muscle tone", "tone-lean-abs", "tone-part", "upper-part"],
  ["tone up", "tone-lean-abs", "tone-part", "upper-part"],
  ["how to get abs", "tone-lean-abs", "abs", "midsection"],
  ["abs in 30 days", "tone-lean-abs", "abs", "midsection"],
  ["abs in a week", "tone-lean-abs", "abs", "midsection"],
  ["lower abs", "tone-lean-abs", "abs", "midsection"],
  ["six pack", "tone-lean-abs", "abs", "midsection"],
  ["abs", "tone-lean-abs", "abs", "midsection"],
  ["core", "tone-lean-abs", "abs", "midsection"],
  ["get shredded", "tone-lean-abs", "lean-shredded", "lean"],
  ["summer shred", "tone-lean-abs", "lean-shredded", "lean"],
  ["look good in a bathing suit", "tone-lean-abs", "lean-shredded", "lean"],
  ["look good naked", "tone-lean-abs", "lean-shredded", "lean"],
  ["get lean", "tone-lean-abs", "lean-shredded", "lean"],

  /* do-a-thing. "run a 5k" is listed under event-run too; it lands here,
     because somebody typing it with no race named means the distance. */
  ["how to do a pull up", "do-a-thing", "first-pullup", null],
  ["first pull-up", "do-a-thing", "first-pullup", null],
  ["first pull up", "do-a-thing", "first-pullup", null],
  ["do a pull up", "do-a-thing", "first-pullup", null],
  ["pull-up", "do-a-thing", "first-pullup", null],
  ["pull up", "do-a-thing", "first-pullup", null],
  ["chin-ups", "do-a-thing", "first-pullup", null],
  ["chin ups", "do-a-thing", "first-pullup", null],
  ["do a push up", "do-a-thing", "first-pushup", null],
  ["push ups", "do-a-thing", "first-pushup", null],
  ["push-ups", "do-a-thing", "first-pushup", null],
  ["pushups", "do-a-thing", "first-pushup", null],
  ["couch to 5k", "do-a-thing", "run-5k", null],
  ["run a 5k", "do-a-thing", "run-5k", null],
  ["run 5 miles", "do-a-thing", "run-5k", null],
  ["run without stopping", "do-a-thing", "run-5k", null],
  ["sub 30 5k", "do-a-thing", "run-5k", null],
  ["sub 25 5k", "do-a-thing", "run-5k", null],
  ["5k", "do-a-thing", "run-5k", null],
  ["run a faster mile", "do-a-thing", "faster-mile", null],
  ["improve my mile time", "do-a-thing", "faster-mile", null],
  ["8 minute mile", "do-a-thing", "faster-mile", null],
  ["run", "do-a-thing", "run-5k", null],
  ["touch my toes", "do-a-thing", "flexibility", null],
  ["do the splits", "do-a-thing", "flexibility", null],
  ["be more flexible", "do-a-thing", "flexibility", null],
  ["do a handstand", "do-a-thing", "skills", null],
  ["handstand", "do-a-thing", "skills", null],
  ["muscle up", "do-a-thing", "skills", null],
  ["pistol squat", "do-a-thing", "skills", null],

  /* event */
  ["train for a half marathon", "event", "event-run", null],
  ["first half marathon", "event", "event-run", null],
  ["half marathon", "event", "event-run", null],
  ["train for a marathon", "event", "event-run", null],
  ["first marathon", "event", "event-run", null],
  ["marathon", "event", "event-run", null],
  ["10k", "event", "event-run", null],
  ["a race", "event", "event-run", null],
  ["race", "event", "event-run", null],
  ["train for hyrox", "event", "event-hyrox", null],
  ["hyrox doubles", "event", "event-hyrox", null],
  ["hyrox", "event", "event-hyrox", null],
  ["spartan race", "event", "event-ocr", null],
  ["tough mudder", "event", "event-ocr", null],
  ["obstacle course race", "event", "event-ocr", null],
  ["spartan", "event", "event-ocr", null],
  ["police academy", "event", "event-test", null],
  ["army fitness test", "event", "event-test", null],
  ["firefighter test", "event", "event-test", null],
  ["pt test", "event", "event-test", null],
  ["get in shape for the military", "event", "event-test", null],
  ["crossfit benchmark", "event", "event-benchmark", null],
  ["murph", "event", "event-benchmark", null],
  ["get in shape for hiking", "event", "event-sport", null],
  ["ski season", "event", "event-sport", null],
  ["climb a mountain", "event", "event-sport", null],
  ["for basketball", "event", "event-sport", null],
  ["for soccer", "event", "event-sport", null],

  /* feel-better. The doctor words are listed under lose-for-health as well;
     they land here, and the `health` theme carries them back to lose-weight
     when that is the bubble the person actually pressed. */
  ["feel better mentally", "feel-better", "mental", null],
  ["mental health", "feel-better", "mental", null],
  ["reduce stress", "feel-better", "mental", null],
  ["less stressed", "feel-better", "mental", null],
  ["sleep better", "feel-better", "mental", null],
  ["anxiety", "feel-better", "mental", null],
  ["live a long and healthy life", "feel-better", "longevity", null],
  ["improve my vo2 max", "feel-better", "longevity", null],
  ["live longer", "feel-better", "longevity", null],
  ["longevity", "feel-better", "longevity", null],
  ["healthspan", "feel-better", "longevity", null],
  ["out of breath on stairs", "feel-better", "energy", null],
  ["not be out of breath", "feel-better", "energy", null],
  ["get winded", "feel-better", "energy", null],
  ["more energy", "feel-better", "energy", null],
  ["improve my cardio", "feel-better", "energy", null],
  ["improve endurance", "feel-better", "energy", null],
  ["prevent future medical issues", "feel-better", "prevent", "health"],
  ["improve my medical condition", "feel-better", "prevent", "health"],
  ["blood pressure", "feel-better", "prevent", "health"],
  ["prediabetes", "feel-better", "prevent", "health"],
  ["cholesterol", "feel-better", "prevent", "health"],
  ["doctors orders", "feel-better", "prevent", "health"],
  ["improve mobility", "feel-better", "mobility", null],
  ["fix my posture", "feel-better", "mobility", null],
  ["improve my posture", "feel-better", "mobility", null],
  ["tight hips", "feel-better", "mobility", null],
  ["desk job", "feel-better", "mobility", null],
  ["improve balance", "feel-better", "mobility", null],
  ["lower back pain", "feel-better", "pain", null],
  ["strengthen lower back", "feel-better", "pain", null],
  ["strengthen knees", "feel-better", "pain", null],
  ["strengthen ankles", "feel-better", "pain", null],
  ["bad shoulder", "feel-better", "pain", null],
  ["back pain", "feel-better", "pain", null],
  ["feel better", "feel-better", null, null],

  /* get-back */
  ["havent worked out in years", "get-back", "back-after-years", null],
  ["get back to my old self", "get-back", "back-after-years", null],
  ["after years off", "get-back", "back-after-years", null],
  ["getting back into working out", "get-back", "back-after-years", null],
  ["getting back into the gym", "get-back", "back-after-years", null],
  ["start working out again", "get-back", "back-after-years", null],
  ["used to be in shape", "get-back", "back-after-years", null],
  ["get back to", "get-back", "back-after-years", null],
  ["back to it", "get-back", "back-after-years", null],
  ["after injury", "get-back", "back-after-years", null],
  ["start working out postpartum", "get-back", "back-postpartum", null],
  ["core after pregnancy", "get-back", "back-postpartum", null],
  ["after pregnancy", "get-back", "back-postpartum", null],
  ["postpartum", "get-back", "back-postpartum", null],
  ["after baby", "get-back", "back-postpartum", null],
  ["mommy belly", "get-back", "back-postpartum", null],
  ["get my body back", "get-back", "back-postpartum", null],
  ["how to start working out for beginners", "get-back", "start-fresh", null],
  ["where do i start", "get-back", "start-fresh", null],
  ["total beginner", "get-back", "start-fresh", null],
  ["never worked out", "get-back", "start-fresh", null],

  /* consistent */
  ["i always quit", "consistent", "keep-quitting", null],
  ["start and stop", "consistent", "keep-quitting", null],
  ["lose motivation", "consistent", "keep-quitting", null],
  ["stop quitting", "consistent", "keep-quitting", null],
  ["keep quitting", "consistent", "keep-quitting", null],
  ["dont know where to start", "consistent", "dont-know", null],
  ["gym intimidates me", "consistent", "dont-know", null],
  ["what should i do at the gym", "consistent", "dont-know", null],
  ["short workouts", "consistent", "no-time", null],
  ["quick workout", "consistent", "no-time", null],
  ["no time", "consistent", "no-time", null],
  ["busy", "consistent", "no-time", null],
  ["make it a habit", "consistent", null, null],
  ["stay consistent", "consistent", null, null],
];

/* When the detail matched a child that lives under a bubble the person did not
   press, and that bubble is one a button can reach, we keep their button and
   look for the nearest thing it can say. "Abs" under Lose weight is belly fat,
   under Recomp it is abs, and under Get stronger it is nothing, which is the
   honest answer rather than a forced one. */
const THEME_CHILD = {
  midsection: { "lose-weight": "lose-belly", "tone-lean-abs": "abs" },
  "upper-part": { "build-muscle": "build-a-part", "tone-lean-abs": "tone-part" },
  glutes: { "build-muscle": "build-glutes", "tone-lean-abs": "tone-part" },
  lean: { "lose-weight": "lose-last-10", "tone-lean-abs": "lean-shredded" },
  deadline: { "lose-weight": "lose-by-date" },
  health: { "lose-weight": "lose-for-health", "feel-better": "prevent" },
  number: { "lose-weight": "lose-a-number", "build-muscle": "build-overall" },
};

/* Punctuation out, apostrophes out (so "don't" matches "dont"), spaces
   collapsed. Cheap on purpose: this runs on one short sentence. */
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9.\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/* Noon UTC, so a date never slips a day when it crosses a timezone. */
const atNoon = (y, m, d) => new Date(Date.UTC(y, m, d, 12, 0, 0));

/* A date only when there really is one. "Before my wedding" is a deadline word
   with no deadline in it, and inventing one would turn the honest timeline,
   which is the whole point of the engine, into a fabricated promise. */
function parseByDate(text, today) {
  const t = norm(text);
  if (!t) return undefined;

  const iso = t.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return atNoon(+iso[1], +iso[2] - 1, +iso[3]);

  const rel = t.match(/\bin (a|an|one|two|three|four|five|six|\d{1,3}) (day|week|month)s?\b/);
  if (rel) {
    const words = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    const n = words[rel[1]] ?? Number(rel[1]);
    if (Number.isFinite(n) && n > 0) {
      const per = rel[2] === "day" ? 1 : rel[2] === "week" ? 7 : 30.4;
      return new Date(today.getTime() + Math.round(n * per) * 86400000);
    }
  }

  const named = t.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2})(?:st|nd|rd|th)?(?:,? (\d{4}))?\b/,
  );
  if (named) {
    const m = MONTHS[named[1]];
    const d = +named[2];
    if (d >= 1 && d <= 31) {
      const year = named[3] ? +named[3] : today.getUTCFullYear();
      let out = atNoon(year, m, d);
      /* No year given and the date has gone: they mean the next one. */
      if (!named[3] && out < today) out = atNoon(year + 1, m, d);
      return out;
    }
  }
  return undefined;
}

/* Pounds, not a target weight and not a distance. Two shapes cover almost all
   of it: a number wearing a unit, or a number after a verb about losing. */
function parseAmountLb(text) {
  const t = norm(text);
  if (!t) return undefined;

  const unit = t.match(/\b(\d{1,3})(?:\.\d)?\s*(?:lb|lbs|pound|pounds|kg|kilos?)\b/);
  if (unit) {
    const n = +unit[1];
    const isKg = /kg|kilo/.test(unit[0]);
    const lb = isKg ? Math.round(n * 2.2046) : n;
    if (lb >= 1 && lb <= 300) return lb;
  }

  const verb = t.match(/\b(?:lose|lost|drop|shed|cut|gain|put on)\s+(?:about\s+|another\s+)?(\d{1,3})\b/);
  if (verb) {
    const n = +verb[1];
    if (n >= 1 && n <= 300) return n;
  }
  return undefined;
}

/* Children that outrank a longer phrase, because getting them wrong is not just
   a slightly-off plan. "Getting back into the gym after baby" contains a longer
   match for back-after-years than for back-postpartum, and the postpartum ramp
   (pelvic floor and function before intensity, per KNOWN_PROGRAMMES) is the one
   that has to win a tie it would otherwise lose on character count. */
const SAFETY_FIRST = new Set(["back-postpartum"]);

/* Longest phrase wins, and a child level entry beats a bubble level one of the
   same length, because the more specific claim is the one worth acting on. */
function bestAlias(detail) {
  const t = norm(detail);
  if (!t) return null;
  let best = null;
  for (const [phrase, bubble, child, theme] of ALIASES) {
    if (!t.includes(phrase)) continue;
    const score = phrase.length + (child ? 0.5 : 0) + (SAFETY_FIRST.has(child) ? 40 : 0);
    if (!best || score > best.score) best = { phrase, bubble, child, theme, score };
  }
  return best;
}

/**
 * The five strings the app stores, plus whatever they typed, turned into the
 * tree's language. Now also takes goal_bubble and goal_child, which is what
 * the tile picker in index.html (renderGoalTilesPrototype) produces once a
 * person taps a category and one of its rows: the exact bubble and child,
 * with nothing to parse. A valid goal_bubble wins over the legacy goal
 * string outright, and a valid goal_child under that bubble wins over
 * whatever goal_detail would have matched. goal_detail is still parsed for
 * amountLb and byDate either way, because a number of pounds and a date are
 * not in the tree and the tile picker cannot supply them; it is parsed for a
 * child only when goal_child was absent or did not validate, same as before
 * this existed. An invalid goal_bubble or goal_child is treated as if it
 * were never sent, silently, so a bad value degrades to the old behaviour
 * rather than throwing.
 *
 * @param {{ goal?: string, goal_detail?: string, goal_bubble?: string, goal_child?: string, today?: Date }} input
 * @returns {{ bubble: string, child: string|undefined, amountLb?: number, byDate?: Date }}
 */
export function mapGoal({ goal, goal_detail, goal_bubble, goal_child, today = new Date() } = {}) {
  const tileBubble = isValidBubble(goal_bubble) ? goal_bubble : null;
  const tileChild = tileBubble && isValidChild(tileBubble, goal_child) ? goal_child : null;

  /* No goal at all is the habit plan, which is the one that asks least of
     somebody we know nothing about. A valid tile bubble stands in for the
     legacy lookup rather than beside it, so `stated` below is exactly what
     it always was when there is no tile pick. */
  const stated = tileBubble || BUBBLE_FOR_GOAL[norm(goal)];
  let bubble = stated || "consistent";
  let child = tileChild || undefined;

  /* Skipped entirely once the tile picker already named a child: that tap is
     a better witness than a phrase match, and running the alias search on
     top of it risks overruling a person's explicit second tap with a guess. */
  if (!child) {
    const hit = bestAlias(goal_detail);
    if (hit) {
      if (!stated && hit.bubble) {
        bubble = hit.bubble;
        child = hit.child || undefined;
      } else if (hit.bubble === bubble) {
        child = hit.child || undefined;
      } else if (OVERRIDE_BUBBLES.has(hit.bubble) && !tileBubble) {
        /* A tile bubble already won the argument the legacy override exists
           to settle, so it does not get re-litigated by a phrase match. */
        bubble = hit.bubble;
        child = hit.child || undefined;
      } else if (hit.theme) {
        child = THEME_CHILD[hit.theme]?.[bubble];
      }
    }
  }

  const out = { bubble, child };
  const amountLb = parseAmountLb(goal_detail);
  if (amountLb != null) out.amountLb = amountLb;
  const byDate = parseByDate(goal_detail, today);
  if (byDate) out.byDate = byDate;

  /* A number or a real date under Lose weight is the "a number of pounds" or
     "before a date" goal even when the sentence named no phrase we know. Same
     parameters either way; this is so the plan is labelled as the thing they
     asked for rather than as the bubble default. */
  if (!child && bubble === "lose-weight") {
    if (out.byDate) out.child = "lose-by-date";
    else if (out.amountLb != null) out.child = "lose-a-number";
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 2. A week, and which day of it is next
 * ------------------------------------------------------------------ */

/* ai_workouts has entry_date and completed_at; the second is the better clock
   when it is there, because a plan made for Friday and done on Sunday happened
   on Sunday. */
function rowTime(row) {
  const stamp = row?.completed_at || row?.entry_date;
  const t = stamp ? Date.parse(String(stamp).length === 10 ? stamp + "T12:00:00Z" : stamp) : NaN;
  return Number.isFinite(t) ? t : -Infinity;
}

/**
 * Which day of plan.week to hand over now.
 *
 * The engine builds a week and the app shows one card, so something has to
 * remember where in the rotation this person is. The ai_workouts row is that
 * memory: its `focus` is the day name we wrote last time. Logs are the backup
 * for anyone whose plans predate the engine, matched on exercise names.
 *
 * Always the day after the last one, never the same day again, including when
 * the last one was earlier today. Somebody generating twice in a day wants
 * something else to do, not the same session repeated.
 */
export function nextDayIndex(plan, { logs = [], plans = [], today = new Date() } = {}) {
  const week = plan?.week || [];
  if (week.length <= 1) return 0;
  const names = week.map((d) => norm(d.name));

  const rows = (Array.isArray(plans) ? plans : [])
    .filter((p) => p && p.focus)
    .sort((a, b) => rowTime(b) - rowTime(a));
  for (const r of rows) {
    const i = names.indexOf(norm(r.focus));
    if (i >= 0) return (i + 1) % week.length;
  }

  /* No usable plan row. Ask the logs what the last session looked like: the
     day whose exercises show up most in it is the day they did. */
  const dated = (Array.isArray(logs) ? logs : []).filter((l) => l && l.entry_date && l.exercise_name);
  if (dated.length) {
    const last = dated.map((l) => String(l.entry_date)).sort().pop();
    const did = new Set(dated.filter((l) => String(l.entry_date) === last).map((l) => norm(l.exercise_name)));
    let bestIndex = -1;
    let bestHits = 0;
    week.forEach((d, i) => {
      const hits = d.exercises.filter((e) => did.has(norm(e.name))).length;
      if (hits > bestHits) { bestHits = hits; bestIndex = i; }
    });
    if (bestIndex >= 0) return (bestIndex + 1) % week.length;
  }

  /* Nothing to go on, so the week starts where the week starts. */
  return 0;
}

/* The profile carries a preferred training focus, and the model the engine
   replaces used to read it. Losing it is a regression somebody would feel on
   the first generate: they set "Legs" in their profile and got whatever the
   rotation had queued. The payload's words and our day names are not the same
   vocabulary ("Legs" against "Leg day", "Lower" against "Lower body A"), so the
   match runs through keywords rather than a substring test in either direction. */
const FOCUS_KEYWORDS = [
  [/push/i, ["push"]],
  [/pull/i, ["pull"]],
  [/leg|lower/i, ["leg", "lower"]],
  [/upper/i, ["upper"]],
  [/full|total|whole/i, ["full body"]],
];

/**
 * The index of the day that matches a requested focus, or -1 when nothing does.
 *
 * `from` is where the rotation was going to land, so when a week holds two days
 * that both answer the focus (Upper body A and Upper body B) the one the
 * rotation would have reached first wins. Honouring the request should not also
 * reset where they are in the week.
 */
export function focusDayIndex(plan, focus, { from = 0 } = {}) {
  const week = plan?.week || [];
  const wanted = String(focus || "").trim();
  if (!week.length || !wanted) return -1;
  const keys = FOCUS_KEYWORDS.filter(([re]) => re.test(wanted)).flatMap(([, k]) => k);
  if (!keys.length) return -1;
  const start = ((from % week.length) + week.length) % week.length;
  for (let n = 0; n < week.length; n++) {
    const i = (start + n) % week.length;
    const name = String(week[i].name || "").toLowerCase();
    if (keys.some((k) => name.includes(k))) return i;
  }
  return -1;
}

/* ------------------------------------------------------------------ *
 * 3. One day, in the shape the app already consumes
 * ------------------------------------------------------------------ */

const MAX_EXERCISES = 6;
/* PLAN.md's floor. plan.mjs already fills a short day back up to four, so this
   should never fire; it exists because the app has no answer for a two exercise
   card and "should never" is not a guarantee. When it does fire it borrows real
   movements from the next day of this person's own week rather than inventing
   one, because a made up exercise is a worse failure than a short session. */
const MIN_EXERCISES = 3;

/* The engine's loadNote explains itself in a sentence or two, which is right in
   the demo output and too long for a line under an exercise name on a phone.
   These are the same statements, short enough to read mid set. */
const LOAD_CUE = {
  bodyweight: "Bodyweight, progression is the variation",
  "your size": "Deliberately light, log what you do",
  unknown: "Pick a weight with two reps left in you",
  "your last session": "What you did last time, or a little more",
  "a similar lift": "Guessed from a similar lift you logged",
};

/* Join what fits and drop what does not, on a word boundary. A cue truncated
   mid sentence reads like a bug, so nothing is ever cut with an ellipsis. */
function fit(parts, max) {
  let out = "";
  for (const p of parts) {
    if (!p) continue;
    const next = out ? out + " " + p : p;
    if (next.length <= max) out = next;
  }
  return out;
}

function cueFor(ex) {
  /* The stand-in warning comes first when there is one: it says this slot
     wanted a movement the library could not supply, and burying that is
     exactly the silent failure engine/README.md keeps a list of. */
  /* Fifty is where the engine's own notes split cleanly in two: "You lifted 210
     on 2026-09-07" is specific and worth the room, while the bodyweight and
     cold start sentences are boilerplate that says the same thing every time
     and reads better as the short version. */
  const loadLine = ex.loadNote && ex.loadNote.length <= 50 ? ex.loadNote : LOAD_CUE[ex.loadBasis];
  return fit([ex.note, loadLine], 99);
}

/**
 * @param {object} plan   a buildPlan result
 * @param {number} dayIndex
 * @returns {{ focus: string, exercises: Array<{name,sets,reps,targetWeight,note,swap,alternatives}> }}
 */
export function toWorkout(plan, dayIndex = 0) {
  const week = plan?.week || [];
  const day = week[dayIndex] || week[0];
  if (!day) throw new Error("plan has no days");

  /* Order is already main slots first, so slicing keeps the movements that
     matter and drops the last isolation piece. No padding up to six: a made up
     sixth exercise is worse than a five exercise day. */
  const picked = day.exercises.slice(0, MAX_EXERCISES);
  if (picked.length < MIN_EXERCISES) {
    const chosen = new Set(picked.map((e) => e.name));
    for (let n = 1; n < week.length && picked.length < MIN_EXERCISES; n++) {
      for (const e of week[(dayIndex + n) % week.length].exercises) {
        if (picked.length >= MIN_EXERCISES) break;
        if (!chosen.has(e.name)) { picked.push(e); chosen.add(e.name); }
      }
    }
  }

  const exercises = picked.map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    /* null means bodyweight or "we do not know", and the app's contract for
       both is 0. Never a string: the app does arithmetic on this. */
    targetWeight: e.weight ?? 0,
    note: cueFor(e),
    /* Additive, and the five keys above are untouched. The engine has always
       computed a swap for every exercise and this function threw it away, so
       the suggestion existed and never reached a screen (PLAN-2, W2).
       index.html ignores both of these fields today and that is fine: extra
       keys cost the app nothing, and the field is here for whoever wires the
       swap button, at which point exercise_swaps records what they chose. */
    swap: e.swap ?? null,
    alternatives: (Array.isArray(e.alternatives) ? e.alternatives : [])
      .slice(0, 3).map((a) => ({ name: a.name, why: a.why })),
  }));

  return { focus: day.name, exercises };
}

/* ------------------------------------------------------------------ *
 * 4. The one call the edge function makes
 * ------------------------------------------------------------------ */

const DAY_MS = 86400000;
const isoDay = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/* The old payload carries `history`, which is a flattened map of personal bests
   with no dates and no counts. research/07 names this as the reason the
   generator could never derive a training age. We can still get a load out of
   it, so we date it three days back and use it, and we say in `meta` that the
   experience level behind this plan was read from something that cannot carry
   one. Nothing here pretends the rows are sessions. */
function logsFromHistory(history, today) {
  const stamp = isoDay(new Date(today.getTime() - 3 * DAY_MS));
  return (Array.isArray(history) ? history : [])
    .filter((h) => h && h.exercise_name && h.weight != null)
    .map((h) => ({
      entry_date: stamp,
      exercise_name: h.exercise_name,
      sets: null,
      reps: null,
      weight: Number(h.weight),
    }));
}

/**
 * Payload in, one day's workout out. The edge function calls this and nothing
 * else, so every degradation the old payload needs lives here rather than
 * being spread through the engine.
 *
 * @param {object} payload  what index.html POSTs, optionally widened with
 *                          `logs` (exercise_logs rows) and `plans` (ai_workouts)
 * @returns {{ workout: object, honest: string|null, meta: object }}
 */
export function generateFromPayload(payload = {}, { today = new Date() } = {}) {
  let step = "start";
  try {
    step = "mapGoal";
    const goal = mapGoal({
      goal: payload.goal,
      goal_detail: payload.goal_detail,
      goal_bubble: payload.goal_bubble,
      goal_child: payload.goal_child,
      today,
    });
    /* Same validity check mapGoal uses internally to decide whether the tile
       pick wins. Recomputed rather than threaded back out of mapGoal, so its
       return shape stays exactly what it was before goal_bubble existed. */
    const goalSource = isValidBubble(payload.goal_bubble) ? "tiles" : "legacy";

    step = "logs";
    const given = Array.isArray(payload.logs) ? payload.logs : null;
    const logs = given && given.length ? given : logsFromHistory(payload.history, today);
    const logsSource = given && given.length ? "logs" : logs.length ? "history" : "none";

    step = "buildPlan";
    /* The days a person actually chose beat anything we can infer. The app's
       weekly challenge target is a number they set themselves, so when the
       widened payload carries one it is the answer, and 2 to 6 is the range the
       picker offers.
       Failing that, three days or four from what they have already done this
       week. That is a crude read on a Monday and it is still better than
       inventing five for somebody who did two, which is the plan nobody
       follows. */
    const target = Number(payload.challenge_target);
    const daysAsked = Number.isFinite(target) && target >= 2 && target <= 6
      ? Math.round(target)
      : Number(payload.gym_days_this_week) >= 4 ? 4 : 3;
    step = "focus";
    /* The body picker's selection, once it has somewhere to live. It arrives as
       the app's group keys or as the finer piece keys the zoomed view works in,
       and focus.mjs flattens both to the fourteen groups plan.mjs prioritises.
       Absent column, old client, null: all of them come back as an empty list
       and every line below behaves exactly as it did before this existed.

       resolveGoal is called here for one field. It is cheap, pure, and it picks
       `params` off the bubble and the child alone: `level` only reaches the
       timeline. So the priority list read here is the same one buildPlan will
       resolve for itself a few lines down, and reading it is preferable to
       building the week twice or to copying the goal table into this file. */
    const goalPriority = resolveGoal({ ...goal, today }).params.priority;
    const requestedFocus = normalizeFocus(payload.focus_groups);
    const freshness = focusFreshness({ chosenAt: payload.focus_chosen_at ?? null, today });
    /* `revealed` is W3's measured preference and does not exist yet, so this is
       null and the tap stands unopposed. When it lands, this is the one line
       that changes. */
    const merged = mergePriority({ goalPriority, userFocus: requestedFocus, revealed: null });

    step = "limits";
    /* What hurts and what they do not own, from the optional onboarding sheet.
       It arrives as a jsonb object, or as the string a jsonb column round trips
       as through some clients, or as null for everybody who skipped the screen
       and everybody whose client predates it. All three come back as two empty
       lists and the plan below is exactly the plan it was before this existed.
       The free text note is normalised and stored and nothing reads it: see
       engine/limits.mjs on why parsing it would be guessing at a medical
       history. */
    const limits = normalizeLimits(payload.limits);

    step = "buildPlan";
    const plan = buildPlan({
      goal,
      person: {
        bodyWeightLb: payload.current_weight ?? null,
        sex: payload.sex ?? null,
        daysAsked,
      },
      logs,
      today,
      priorityOverride: merged.priority,
      limits,
    });

    step = "nextDayIndex";
    const rotation = nextDayIndex(plan, { logs, plans: payload.plans || [], today });
    /* A stated preference outranks the rotation, which is the same product rule
       that stops us overriding the day count somebody asked for. */
    const asked = focusDayIndex(plan, payload.focus, { from: rotation });
    const focusHonoured = asked >= 0;
    const dayIndex = focusHonoured ? asked : rotation;

    step = "toWorkout";
    const workout = toWorkout(plan, dayIndex);

    const missing = [...(plan.missing || [])];
    if (logsSource === "history") {
      missing.push("dated sessions, so the loads come from your best lifts and the experience level does not");
    }

    return {
      workout,
      honest: plan.honest?.message || null,
      meta: {
        level: plan.level,
        /* Which parameter set really ran, "_default" included. A plan that came
           out of the bubble default rather than the child we matched is a
           different plan, and support cannot tell the two apart from the
           output alone. */
        childUsed: plan.goal?.childUsed ?? null,
        /* From the old payload this is always "none": one undated row per lift
           cannot say how long somebody has trained, and saying so is cheaper
           than a level nobody can audit. */
        confidence: plan.trainingAge?.confidence ?? "none",
        days: plan.days,
        dayName: workout.focus,
        /* False also covers "they never asked for one", which is the common
           case. It says the day came from the rotation, which is true either
           way, and the profile's focus is right there in the payload if
           somebody needs to tell the two apart. */
        focusHonoured,
        /* Not the same `focus` as `focusHonoured` above, which is about which
           day of the rotation came back. This is the body map: which groups
           were asked for, which ones actually earned the extra volume, the
           sentences saying why, and whether the choice is old enough that it is
           worth asking again. Nothing acts on `stale` yet, on purpose. */
        focus: {
          requested: requestedFocus,
          applied: merged.priority,
          why: merged.why,
          stale: freshness.stale,
        },
        /* What was said and what it cost, in three numbers. The excluded list
           itself is on the plan and can run to fifty names on a bodyweight
           only week, which is not something a meta block should carry, so the
           count is here and the names stay where the reasons are. */
        limits: {
          hurts: limits.hurts,
          missing: limits.missing,
          excludedCount: (plan.limits?.excluded || []).length,
        },
        source: "engine",
        /* Whether the bubble came from an explicit tile tap or from parsing
           the five legacy strings and free text. Support cannot tell the two
           apart from the workout alone, same reason childUsed exists above. */
        goalSource,
        logsSource,
        missing,
      },
    };
  } catch (err) {
    /* The app shows this string to the user verbatim, and a bare stack from
       three modules down is what made the last round of failures unreadable. */
    throw new Error(`Workout engine failed at ${step}: ${err && err.message ? err.message : String(err)}`);
  }
}
