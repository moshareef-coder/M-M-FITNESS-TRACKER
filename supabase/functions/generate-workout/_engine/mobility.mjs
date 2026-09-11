/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/mobility.mjs. Do not edit here. */
/* A warm-up before the session and a cool-down after it, matched to the day.
 *
 * Why this exists. research/11 (HFA/Kantar, n=2,000): 48% of people setting a
 * 2026 goal want mobility, flexibility or posture, second place, up from
 * outside the top three in one year, and "five to ten minutes a day of work
 * that nobody offers." Fitbod, Freeletics and Nike Training Club leave it out.
 * research/02: warm-up matters more with age, cheap and uncontroversial. The
 * engine has budgeted five minutes of warm-up on every day since its first run
 * (WARMUP_MIN in plan.mjs) and has never put anything in those five minutes.
 * This file fills them, and adds a cool-down on top.
 *
 * What it is not. It is not volume. A thirty second hamstring stretch is not a
 * set of Romanian deadlifts, so nothing here touches the weekly ledger,
 * recovery.mjs never credits it, and the app must not write these as
 * exercise_logs rows. It is also not a separate workout: it rides on the day it
 * belongs to, and the day is still the day without it. Mo's call, 2026-09-10:
 * timed, and skippable. `skip_stretching` on the payload strips both blocks in
 * the adapter and the plan underneath is byte for byte the plan it was.
 *
 * Time. The warm-up lives INSIDE the session budget, because those minutes were
 * already there. The cool-down sits on top, five minutes, and the day reports
 * `totalMinutes` beside `estimatedMinutes` so nothing is hidden in a number
 * that used to mean something else. For the two goal children that ARE this
 * (goal-tree: "flexibility" under do-a-thing, "mobility" under feel-better,
 * both "5 to 10 min daily, hips and upper back") the cool-down grows to ten
 * minutes and draws from the mobility category first, which is the hips and
 * thoracic work the tree asks for. Ten because that is the top of the range the
 * research names and the plan is the thing they came for.
 *
 * Reads knowledge/exercise-library/stretching.mjs through the library index,
 * read only, the same way plan.mjs reads the lifting libraries. Every entry
 * carries `kind`, `seconds`, `perSide`, `avoidIf` and a `cue`; the shape is
 * documented at the top of that file. Deno safe: no node: imports.
 */
import { TRAININGS } from "../_library/index.mjs";
import { MUSCLE_GROUPS } from "./focus.mjs";

export const WARMUP_SECONDS = 300;
export const COOLDOWN_SECONDS = 300;
export const MOBILITY_GOAL_SECONDS = 600;
/* The goal children whose whole point is this block. Ids from goal-tree.json;
   demo.mjs --check keeps the tree and goal-engine in step, and a test below
   keeps these two in step with the tree. */
export const MOBILITY_CHILDREN = Object.freeze(["flexibility", "mobility"]);
/* Fewer than two moves is not a warm-up, it is a token. More than six in five
   minutes and nobody holds anything long enough to matter; the ten minute
   mobility block gets room for ten, because the block is the point for them. */
export const MIN_MOVES = 2;
export const MAX_MOVES = 6;
export const MAX_MOBILITY_MOVES = 10;

const LEVEL_RANK = { beginner: 0, novice: 1, intermediate: 2, advanced: 3 };
const GROUPS = new Set(MUSCLE_GROUPS);

/* Resolved lazily rather than at import, so an engine bundle vendored before the
   library existed still boots and returns empty blocks instead of throwing at
   module load, which would take the whole generate call down with it. */
function library() {
  return TRAININGS.find((t) => t.id === "stretching") || null;
}

function poolFor(kind) {
  const lib = library();
  if (!lib) return [];
  const cat = (lib.categories || []).find((c) => c.key === kind);
  return cat ? cat.exercises || [] : [];
}

/* How long one move really takes: a per side stretch is done twice. */
export function moveSeconds(entry) {
  const s = Number(entry?.seconds) || 0;
  return entry?.perSide ? s * 2 : s;
}

/* What a stretch can need that a person might not own. The lifting vocabulary
   (barbell, dumbbell, cable, machine) does not describe a stretch, so this is
   the one bridge: "none" on limits.missing means bodyweight only, and a wall
   or a doorway is not equipment. A roller, a band and a bench are. */
const FREE_KIT = new Set(["none", "wall", "doorway", undefined, null, ""]);

function eligible(entry, { hurts, level, bodyweightOnly }) {
  if (!entry || !entry.name) return false;
  /* A stretch that loads a joint they said hurts is the same mistake as a lift
     that does, only slower. avoidIf is the library's own word on that. */
  for (const j of entry.avoidIf || []) if (hurts.includes(j)) return false;
  if (bodyweightOnly && !FREE_KIT.has(entry.equipment)) return false;
  /* One level above theirs is fine on a stretch: nothing here is loaded. Two
     above is a movement that needs a floor teacher, not a cue. */
  const rank = LEVEL_RANK[level] ?? 0;
  return (LEVEL_RANK[entry.level] ?? 0) <= rank + 1;
}

const toMove = (e) => ({
  name: e.name,
  seconds: e.seconds,
  perSide: !!e.perSide,
  cue: e.cue || null,
  /* The first primary, for the app's muscle labels. The full lists stay in the
     library where recovery would read them, which it deliberately does not. */
  group: (e.primary || [])[0] || null,
  kind: e.kind,
  /* Which of today's movements this move is here for. The app shows it as
     "for your squats", which is the difference between a stretch that feels
     like homework and one that has an obvious reason to exist. */
  prepares: Array.isArray(e.prepares) ? e.prepares : [],
});

/**
 * One block, greedily, for what the day is about to ask of the body.
 *
 * Two things decide a pick, in this order:
 *
 * 1. PATTERNS, when the caller passes any. A warm-up exists to prepare the
 *    movements that are coming, and the library says which movements each
 *    move prepares (`prepares`, added 2026-09-11). A squat day wants ankles
 *    and hip flexors; a bench day wants pecs, t-spine and the cuff. Muscle
 *    coverage alone could not tell those apart, which is why a push day and a
 *    leg day used to open with near-identical warm-ups. research/13.
 * 2. MUSCLE COVERAGE, which is all a cool-down needs: statics run after, so
 *    what matters is what was worked, not what is next, and static entries
 *    carry no `prepares` at all.
 *
 * Then the level nearest theirs, then the shorter move, then the name, so two
 * runs with the same input give the same block. The budget is filled toward,
 * not merely respected: once everything is covered it keeps adding the next
 * best move until the minutes are used or `maxMoves` is reached. A pool with
 * nothing for the target still yields a block: a warm-up for a day the library
 * does not describe well is better than no warm-up.
 */
export function pickBlock({ kind, groups = [], patterns = [], budgetSec, hurts = [], missing = [], level = "beginner", exclude = null, pools = null, maxMoves = MAX_MOVES }) {
  const want = new Set((groups || []).filter((g) => GROUPS.has(g)));
  const bodyweightOnly = (missing || []).includes("none");
  const source = pools || [poolFor(kind)];
  const seen = new Set();
  const candidates = [];
  for (const pool of source) {
    for (const e of pool) {
      const key = String(e.name).toLowerCase();
      if (seen.has(key) || (exclude && exclude.has(key))) continue;
      if (!eligible(e, { hurts, level, bodyweightOnly })) continue;
      seen.add(key);
      candidates.push(e);
    }
  }
  if (!candidates.length) return [];

  const rank = LEVEL_RANK[level] ?? 0;
  const wantPatterns = new Set(patterns || []);
  const covered = new Set();
  const coveredPatterns = new Set();
  const picks = [];
  let spent = 0;
  const left = new Set(candidates.map((e) => e.name));

  while (picks.length < maxMoves && left.size && (spent < budgetSec || picks.length < MIN_MOVES)) {
    let best = null;
    let bestKey = null;
    for (const e of candidates) {
      if (!left.has(e.name)) continue;
      const secs = moveSeconds(e);
      /* Budget is a ceiling, not a target: a move that does not fit is skipped,
         not shortened, because the seconds on it are the seconds it needs. The
         minimum is exempt so a big first pick cannot leave a one move block. */
      if (spent + secs > budgetSec && picks.length >= MIN_MOVES) continue;
      const fresh = (e.primary || []).filter((g) => want.has(g) && !covered.has(g)).length;
      const touch = (e.secondary || []).filter((g) => want.has(g) && !covered.has(g)).length;
      /* How many of today's movements this move prepares that nothing picked
         so far has prepared. Zero for every static entry, which is correct:
         with no patterns asked for, this term is constant and the ranking
         below collapses to exactly the muscle coverage it always was. */
      const newPatterns = (e.prepares || []).filter((p) => wantPatterns.has(p) && !coveredPatterns.has(p)).length;
      const anyPattern = (e.prepares || []).some((p) => wantPatterns.has(p)) ? 0 : 1;
      const key = [
        -newPatterns,
        anyPattern,
        -fresh,
        -touch,
        Math.abs(rank - (LEVEL_RANK[e.level] ?? 0)),
        secs,
        e.name,
      ];
      if (!best || compare(key, bestKey) < 0) { best = e; bestKey = key; }
    }
    if (!best) break;
    picks.push(toMove(best));
    spent += moveSeconds(best);
    for (const g of best.primary || []) covered.add(g);
    for (const p of best.prepares || []) coveredPatterns.add(p);
    left.delete(best.name);
  }
  return picks;
}

function compare(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

const total = (moves) => moves.reduce((t, m) => t + moveSeconds(m), 0);

/**
 * The two blocks for one day of the week.
 *
 * @param day        a plan.mjs week day: needs `mainGroups` and `exercises[].group`
 * @param level      the training age level
 * @param hurts      limits.hurts, validated joint keys
 * @param goalChild  plan.goal.childUsed, so the two mobility children get their block
 */
export function mobilityFor(day, { level = "beginner", hurts = [], missing = [], goalChild = null } = {}) {
  const lib = library();
  if (!lib) {
    return { warmup: [], cooldown: [], warmupSeconds: 0, cooldownSeconds: 0, mobilityGoal: false,
      why: ["No stretching library in this build, so the blocks are empty."] };
  }
  const mainGroups = day?.mainGroups || [];
  /* The cool-down covers what the day actually touched, main lifts and
     accessories both, because the biceps you curled are the biceps that are
     tight, not only the lats the day was named for. */
  const worked = [...new Set([...(day?.exercises || []).map((e) => e.group).filter(Boolean), ...mainGroups])];
  const mobilityGoal = MOBILITY_CHILDREN.includes(goalChild);

  /* Mains first, then the accessories, so the warm-up prepares the movement
     the day is named for before it prepares the last accessory slot.
     "isolation" is dropped on the way through: in SLOTS it is not a movement
     quality, it is "whatever fills this accessory slot", so a leg day's calf
     slot and a warm-up move tagged isolation have nothing to do with each
     other. Leaving it in put Elbow Circles and Band Pull-Apart in a leg day
     warm-up, which is exactly the generic block this change exists to end. */
  const patterns = [...new Set([...(day?.mainPatterns || []), ...(day?.allPatterns || [])])]
    .filter((p) => p !== "isolation");
  const warmup = pickBlock({ kind: "dynamic", groups: mainGroups, patterns, budgetSec: WARMUP_SECONDS, hurts, missing, level });
  const cooldown = mobilityGoal
    ? pickBlock({
        kind: "mobility", groups: worked, budgetSec: MOBILITY_GOAL_SECONDS, hurts, missing, level,
        /* Mobility moves first, then static holds for whatever those left out.
           The order of the pools is the preference; coverage still decides. */
        pools: [poolFor("mobility"), poolFor("static")],
        maxMoves: MAX_MOBILITY_MOVES,
      })
    : pickBlock({ kind: "static", groups: worked, budgetSec: COOLDOWN_SECONDS, hurts, missing, level });

  const why = [];
  if ((missing || []).includes("none")) {
    const kitOnly = [...poolFor("dynamic"), ...poolFor("static"), ...poolFor("mobility")]
      .filter((e) => !FREE_KIT.has(e.equipment)).length;
    if (kitOnly) why.push(`${kitOnly} stretches that need a roller, a band or a bench left out, since there is no equipment.`);
  }
  if (warmup.length) why.push(`${warmup.length} dynamic moves for ${mainGroups.length ? mainGroups.join(", ") : "the whole body"} before the first set, inside the five minutes the session already budgets.`);
  if (cooldown.length) {
    why.push(mobilityGoal
      ? `A ten minute mobility block after, hips and upper back first, because the goal is the range of motion itself (goal-tree: "5 to 10 min daily").`
      : `${cooldown.length} static holds after, for what the day worked.`);
  }
  if (hurts.length) {
    const dropped = [...poolFor("dynamic"), ...poolFor("static"), ...poolFor("mobility")]
      .filter((e) => (e.avoidIf || []).some((j) => hurts.includes(j))).length;
    if (dropped) why.push(`${dropped} stretch${dropped === 1 ? "" : "es"} left out for the ${hurts.join(", ")} they said hurts.`);
  }

  return {
    warmup, cooldown,
    warmupSeconds: total(warmup),
    cooldownSeconds: total(cooldown),
    mobilityGoal,
    why,
  };
}

/* What skipping means: the arrays go, the day does not. Kept here so the
   adapter and the lab strip a workout the same way. */
export function stripMobility(workout) {
  if (!workout) return workout;
  return { ...workout, warmup: [], cooldown: [] };
}
