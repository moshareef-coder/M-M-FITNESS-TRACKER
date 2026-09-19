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
import { TRAININGS } from "../../knowledge/exercise-library/index.mjs";
import { MUSCLE_GROUPS } from "./focus.mjs";

/* research/13, and the answer to "fifteen to thirty minutes?": no. ACSM says 5
   to 10 minutes; Li 2023 (network meta, 35 studies) puts the optimum for
   explosive output at 7 to 10 minutes of dynamic work; McGowan 2015 shows a
   long warm-up costs performance through fatigue; Behm 2016 shows the acute
   range it buys has expired inside 30 minutes, so most of a 20 minute warm-up
   is gone before the last working set. Six minutes, and the rest of the
   preparation belongs in ramp-up sets of the lift itself.
   The cool-down is five because the flexibility literature caps out there: a
   2024 Sports Medicine meta-regression finds range-of-motion gains plateau at
   about 4 minutes per session and 10 per week, which three sessions of five
   already clears. Ten for the two goals where the stretching IS the plan. */
export const WARMUP_SECONDS = 360;
/* The general block on a day that ramps its first lift, 2026-09-12.
   research/13 recommendation 10 set WARMUP_SECONDS to 360 "with the warm-up
   block explicitly not including the ramp sets", so this goes one step past what
   that file asks for and the reason is worth writing down. 360 was chosen when
   the engine had no potentiate phase at all, and the block was implicitly doing
   that job badly: it is the general mobility warm-up Oliva 2026 measured 3.8% of
   peak squat force disappearing after. Now that the ramp exists, the block's job
   is narrower (raise, activate, mobilise) and the fourth phase has somewhere
   better to be.

   Four minutes, not less. Total preparation on a ramped day goes from six
   minutes of general work to about four general plus four specific, so the
   person gets MORE preparation than before and a larger share of it is the kind
   Iversen 2021 says to prioritise: "restrict the warm-up to exercise-specific
   warm-ups". Eight minutes sits inside ACSM's five to ten and well inside
   McGowan 2015's ten to fifteen, counting the ramp as warm-up, which RAMP does.
   Going lower would be picking a number to hit a minutes target rather than
   because the evidence moved, and the evidence stops supporting cuts here. */
export const RAMPED_WARMUP_SECONDS = 240;
export const COOLDOWN_SECONDS = 300;
/* How much longer the general block runs at the top of the age dial.
 *
 * research/02, item 4: "Warm-up matters more. Cheap, uncontroversial, worth
 * doing. More ramp-up sets before a working set." Confidence medium, which it
 * calls out as the weakest of its four recommendations.
 *
 * research/13 is the file that owns this block and it argues the other way on
 * its own evidence: McGowan 2015 has a long warm-up costing performance through
 * fatigue, Behm 2016 has the benefit expiring inside thirty minutes so most of
 * a twenty minute warm-up is gone before the last working set, and Oliva 2026
 * measured 3.8% off peak squat force after general work. That is why the block
 * is six minutes and not fifteen.
 *
 * The two are reconciled by staying inside the evidenced band rather than by
 * picking a winner. Forty percent takes the unramped block from 6:00 to 8:24
 * and the ramped one from 4:00 to 5:36, and ACSM's range is five to ten minutes
 * while McGowan's own recommendation is ten to fifteen counting the ramp. So
 * nothing here leaves the window either file is arguing inside; what moves is
 * where in that window an older lifter sits.
 *
 * Note what this is NOT. research/02 asks specifically for more RAMP-UP SETS
 * before a working set, which is preparation on the movement itself and is the
 * half research/13 also wants prioritised. Ramp sets are built in plan.mjs and
 * this file cannot reach them, so the general block growing is the reachable
 * half of that recommendation and the weaker half. Said here so the next person
 * does not read a longer stretch block as the request having been met. */
export const AGE_WARMUP_GROWTH = 0.4;
export const MOBILITY_GOAL_SECONDS = 600;
/* The goal children whose whole point is this block. Ids from goal-tree.json;
   demo.mjs --check keeps the tree and goal-engine in step, and a test below
   keeps these two in step with the tree. */
export const MOBILITY_CHILDREN = Object.freeze(["flexibility", "mobility"]);
/* Fewer than two moves is not a warm-up, it is a token. More than six in five
   minutes and nobody holds anything long enough to matter; the ten minute
   mobility block gets room for ten, because the block is the point for them. */
export const MIN_MOVES = 2;
/* Eight, not six: the library's dynamic moves are 20 to 30 seconds each, so a
   six move cap could only ever spend three of the six minutes research/13
   asks for, and push and pull days were coming back at half the warm-up a leg
   day got purely because their moves are shorter. */
export const MAX_MOVES = 8;
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

function eligible(entry, { hurts, bodyweightOnly }) {
  if (!entry || !entry.name) return false;
  /* A stretch that loads a joint they said hurts is the same mistake as a lift
     that does, only slower. avoidIf is the library's own word on that. */
  for (const j of entry.avoidIf || []) if (hurts.includes(j)) return false;
  if (bodyweightOnly && !FREE_KIT.has(entry.equipment)) return false;
  /* Nothing tagged advanced, and nothing else is filtered.
   *
   * This used to be "one rank above the USER's level is fine, because nothing
   * here is loaded", which is two claims: a safe pool, and a person to size it
   * against. The person is gone with the training level, and the safe pool is
   * all the claim ever needed. It comes out the same for everybody who could
   * really reach this code: a beginner allowed rank 0 + 1 and a novice rank
   * 1 + 1, and with no library row tagged novice both of those are exactly
   * "beginner and intermediate stretches". So this is byte for byte what
   * every production user already got. */
  return (LEVEL_RANK[entry.level] ?? 0) <= LEVEL_RANK.intermediate;
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
 * Then the simpler move, then the shorter one, then the name, so two
 * runs with the same input give the same block. The budget is filled toward,
 * not merely respected: once everything is covered it keeps adding the next
 * best move until the minutes are used or `maxMoves` is reached. A pool with
 * nothing for the target still yields a block: a warm-up for a day the library
 * does not describe well is better than no warm-up.
 */
export function pickBlock({ kind, groups = [], patterns = [], budgetSec, hurts = [], missing = [], exclude = null, pools = null, maxMoves = MAX_MOVES, stopAtCoverage = false, minSec = 0 }) {
  const want = new Set((groups || []).filter((g) => GROUPS.has(g)));
  const bodyweightOnly = (missing || []).includes("none");
  const source = pools || [poolFor(kind)];
  const seen = new Set();
  const candidates = [];
  for (const pool of source) {
    for (const e of pool) {
      const key = String(e.name).toLowerCase();
      if (seen.has(key) || (exclude && exclude.has(key))) continue;
      if (!eligible(e, { hurts, bodyweightOnly })) continue;
      seen.add(key);
      candidates.push(e);
    }
  }
  if (!candidates.length) return [];

  /* Ties break toward the simpler move, which is the same conservative rule
     research/05 gives everywhere else and no longer needs a lifter to compare
     against: rank 0 is "prefer a beginner-tagged stretch". */
  const rank = 0;
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
         minimum is exempt so a big first pick cannot leave a one move block.
         research/13 caught what this rule did on its own: a leg day cool-down
         skipped Figure Four (80s, glutes, the group the day actually worked)
         because only 65s were left, and spent them on a hold for a group the
         day never touched. Skipping the right move and then padding with the
         wrong one is worse than running a few seconds long, so a move that
         still covers something nothing else has covered is allowed to
         overrun. Only filler has to fit. */
      const coversSomethingNew =
        (e.prepares || []).some((p) => wantPatterns.has(p) && !coveredPatterns.has(p)) ||
        (e.primary || []).some((g) => want.has(g) && !covered.has(g));
      if (spent + secs > budgetSec && picks.length >= MIN_MOVES && !coversSomethingNew) continue;
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
    /* A cool-down stops when it has covered what the day actually worked.
       Filling the remaining seconds means reaching for a group the session
       never touched, and research/13 is blunt about this: the honest
       justification for a cool-down is cumulative range of motion plus a
       session having an ending, and five real minutes beat fifteen fake ones.
       A warm-up does keep filling, because more preparation for what is about
       to happen is still preparation. The mobility goal keeps filling too,
       because for those two goals the block is the plan. */
    if (stopAtCoverage && picks.length >= MIN_MOVES) {
      const coversNew =
        (best.primary || []).some((g) => want.has(g) && !covered.has(g)) ||
        (best.secondary || []).some((g) => want.has(g) && !covered.has(g));
      if (!coversNew) break;
    }
    picks.push(toMove(best));
    spent += moveSeconds(best);
    for (const g of best.primary || []) covered.add(g);
    for (const p of best.prepares || []) coveredPatterns.add(p);
    left.delete(best.name);
  }
  /* The floor. Mo, 2026-09-18: "all stretches should always be five minutes
     minimum." Everything above stops early for good reasons (coverage
     reached, budget spent, enough moves), and the sum of those good reasons
     was a cool-down of ninety seconds on a pull day: the constants said five
     minutes and the block said two. So once the reasoned block is done, if
     it is short of the floor it is topped up one move at a time with the
     best remaining candidate, coverage and ceiling set aside, because at
     that point the question is not "what does today need" but "is this a
     stretch or a gesture". Capped so a library with only long holds cannot
     run away. */
  const floorCap = maxMoves + 4;
  while (minSec > 0 && spent < minSec && left.size && picks.length < floorCap) {
    let best = null, bestKey = null;
    for (const e of candidates) {
      if (!left.has(e.name)) continue;
      const fresh = (e.primary || []).filter((g) => want.has(g) && !covered.has(g)).length;
      const key = [-fresh, Math.abs(rank - (LEVEL_RANK[e.level] ?? 0)), -moveSeconds(e), e.name];
      if (!best || compare(key, bestKey) < 0) { best = e; bestKey = key; }
    }
    if (!best) break;
    picks.push(toMove(best));
    spent += moveSeconds(best);
    for (const g of best.primary || []) covered.add(g);
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
 * @param hurts      limits.hurts, validated joint keys
 * @param goalChild  plan.goal.childUsed, so the two mobility children get their block
 */
/* `longCooldown` is the ten minute block bought by a stated session length.
   It grows the cool-down and never the warm-up: research/13 has a long warm-up
   costing performance (McGowan 2015 on fatigue, Behm 2016 on shelf life, Oliva
   2026 on peak force) and a long cool-down costing nothing (Van Hooren 2018)
   while buying the one outcome stretching reliably produces. */
/* `ageCaution` is age.mjs's warm-up dial, 0 to 1, and `maxWarmupSeconds` is the
   ceiling the caller's clock can actually afford. The two are separate because
   they answer different questions: the dial is what this person's age argues
   for, the ceiling is what their session length leaves room for, and where the
   second bites the block stays where it was and the caller is the one that has
   to say so. Both default to "no change", so every existing call site gets the
   file exactly as it was. */
export function mobilityFor(day, { hurts = [], missing = [], goalChild = null, longCooldown = false, ageCaution = 0, maxWarmupSeconds = Infinity } = {}) {
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
  /* A day whose first lift is ramped gets the shorter general block, because the
     ramp is the potentiate phase and the block no longer has to pretend to be
     it. See RAMPED_WARMUP_SECONDS. plan.mjs decides which days ramp and reserves
     exactly these seconds inside the session estimate, so the two agree. */
  const ramped = Array.isArray(day?.rampSets) && day.rampSets.length > 0;
  const baseWarmupSec = ramped ? RAMPED_WARMUP_SECONDS : WARMUP_SECONDS;
  /* Age lengthens the block, the clock caps it, and neither may ever shorten
     it: `Math.max(baseWarmupSec, ...)` is there so a caller that passes a mean
     `maxWarmupSeconds` cannot buy minutes back out of somebody's warm-up. The
     ceiling is a limit on the GROWTH and not on the block. */
  const caution = Number.isFinite(Number(ageCaution)) ? Math.min(1, Math.max(0, Number(ageCaution))) : 0;
  const wanted = Math.round(baseWarmupSec * (1 + AGE_WARMUP_GROWTH * caution));
  const warmupSec = Math.max(baseWarmupSec, Math.min(wanted, Number(maxWarmupSeconds) || baseWarmupSec));
  /* Both blocks fill to their own budget now. The ramped warm up keeps its
     shorter budget on purpose: the ramp sets are the rest of the potentiation
     and plan.mjs reserves exactly these seconds in the session estimate. */
  const warmup = pickBlock({ kind: "dynamic", groups: mainGroups, patterns, budgetSec: warmupSec, hurts, missing, minSec: warmupSec });
  const longBlock = mobilityGoal || longCooldown;
  const cooldown = longBlock
    ? pickBlock({
        kind: "mobility", groups: worked, budgetSec: MOBILITY_GOAL_SECONDS, hurts, missing,
        /* Mobility moves first, then static holds for whatever those left out.
           The order of the pools is the preference; coverage still decides. */
        pools: [poolFor("mobility"), poolFor("static")],
        maxMoves: MAX_MOBILITY_MOVES,
      })
    : pickBlock({ kind: "static", groups: worked, budgetSec: COOLDOWN_SECONDS, hurts, missing, stopAtCoverage: true, minSec: COOLDOWN_SECONDS });

  const why = [];
  if ((missing || []).includes("none")) {
    const kitOnly = [...poolFor("dynamic"), ...poolFor("static"), ...poolFor("mobility")]
      .filter((e) => !FREE_KIT.has(e.equipment)).length;
    if (kitOnly) why.push(`${kitOnly} stretches that need a roller, a band or a bench left out, since there is no equipment.`);
  }
  if (warmup.length) {
    why.push(ramped
      ? `${warmup.length} dynamic moves for ${mainGroups.length ? mainGroups.join(", ") : "the whole body"} before the first set. Shorter than the usual block, because the ramp-up sets on the first lift do the rest of the preparing and do it on the movement itself.`
      : `${warmup.length} dynamic moves for ${mainGroups.length ? mainGroups.join(", ") : "the whole body"} before the first set, inside the five minutes the session already budgets.`);
  }
  if (warmup.length && warmupSec > baseWarmupSec) {
    why.push(`${Math.round(warmupSec / 60)} minutes of it rather than ${Math.round(baseWarmupSec / 60)}, because the warm-up is the one part of a session that matters more with age and it is the cheapest thing in here to buy.`);
  } else if (warmup.length && caution > 0) {
    why.push("The longer warm-up your age argues for did not fit the session length, so this is the standard block. A few more minutes on the clock in Setup would buy it.");
  }
  if (cooldown.length) {
    why.push(mobilityGoal
      ? `A ten minute mobility block after, hips and upper back first, because the goal is the range of motion itself (goal-tree: "5 to 10 min daily").`
      : longCooldown
        ? `A ten minute block after instead of five, bought with the session length you asked for. It is the cool-down and not the warm-up that grows, because a longer warm-up costs performance and a longer cool-down costs nothing.`
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
    /* What was ASKED for and what was RESERVED, which are two different
       numbers the moment a clock is involved. A caller that has to re-cost the
       day (adapter.mjs does, until plan.mjs passes the dial itself) needs the
       reserved figure, and a caller deciding whether to bother rebuilding at
       all needs the asked one. Both are 0 and the base block on every plan
       built without an age, which is every plan built before this existed. */
    ageCaution: caution,
    warmupBudgetSeconds: warmupSec,
    why,
  };
}

/* What skipping means: the arrays go, the day does not. Kept here so the
   adapter and the lab strip a workout the same way. */
export function stripMobility(workout) {
  if (!workout) return workout;
  return { ...workout, warmup: [], cooldown: [] };
}

/* ---- A whole session made of movement, not a block bolted to a lifting day ----
 *
 * Mo promoted "Move better" to a top-level goal and chose, when asked, that it
 * should generate a session with no lifting in it at all: someone who picked it
 * over "Get stronger" has said what they want. That is a different shape from
 * everything else this engine builds, which is why it lives here beside
 * pickBlock rather than inside plan.mjs's sets-and-load machinery. There is no
 * load to prescribe, no ledger to feed and nothing to progress by adding a
 * plate; the unit is a hold measured in seconds.
 *
 * DRAWN FROM STRETCHING ONLY, and that is a content limit rather than a choice.
 * The yoga library has 37 poses and pilates 23, and Mo asked for both, but
 * neither carries a hold time or a coaching cue: an entry is a name, the
 * muscles it works and a level. Stretching's 59 moves carry seconds, perSide,
 * equipment and a cue each. Building a session out of poses with no hold time
 * would mean inventing one for every pose, and a session that shows a move with
 * no coaching line under it is worse than one with fewer moves. Add `seconds`
 * and `cue` to those 60 entries and they join this pool by changing POOLS below.
 *
 * Three passes, because a mobility session that repeats the same shoulder
 * stretch six times is not a session: the daily-mobility set leads because it
 * is the one written to be done on its own, static holds fill what mobility
 * left uncovered, and dynamic moves open the session the way they open a
 * warm-up.
 */
export const MOVEMENT_POOLS = Object.freeze(["mobility", "static", "dynamic"]);

/* Not built on pickBlock, and the first attempt that was is why this comment
   exists. pickBlock fills a warm-up or a cool-down: a small budget, and it
   stops as soon as the muscles the day touched are covered. Coverage per
   second is what it optimises, so it reaches for the cheapest moves that tick
   the most groups, which are the 25-second dynamic ones. Asked for a
   45-minute session it returned eleven warm-up moves and ten minutes of work.

   A session wants the opposite: long holds, the daily-mobility and static sets
   leading, dynamic only as a short opening, and the clock actually filled. */
export function movementSession({
  minutes = 30, hurts = [], missing = [], groups = null,
} = {}) {
  const lib = library();
  if (!lib) return { exercises: [], seconds: 0, why: ["No stretching library in this build."] };

  const bodyweightOnly = (missing || []).includes("none");
  const ok = (e) => eligible(e, { hurts, bodyweightOnly });
  const pick = (kind) => poolFor(kind).filter(ok);

  const budget = Math.max(300, Math.round(minutes * 60));
  /* A couple of dynamic moves to open, capped hard. They are there to take the
     first stiffness off, not to be the session. */
  const opener = pick("dynamic").slice(0, 2);
  /* The real work, mobility first because that set is the one written to stand
     on its own, then the static holds. */
  const core = [...pick("mobility"), ...pick("static")];

  /* Spread across the body rather than working down a list: the pools are
     ordered by muscle group, so taking them in order gives six shoulder
     stretches before a hip ever appears. One move per group per pass, then
     round again, which also means a short session is a whole-body session and
     a long one just goes deeper. */
  const want = new Set(groups && groups.length ? groups : [...GROUPS]);
  const byGroup = new Map();
  for (const e of core) {
    const g = (e.primary || []).find((x) => want.has(x)) || (e.primary || [])[0] || "other";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(e);
  }

  const chosen = [...opener];
  let seconds = chosen.reduce((n, e) => n + moveSeconds(e), 0);
  const queues = [...byGroup.values()];
  let added = true;
  while (seconds < budget && added) {
    added = false;
    for (const q of queues) {
      if (!q.length) continue;
      const e = q.shift();
      if (chosen.includes(e)) continue;
      chosen.push(e);
      seconds += moveSeconds(e);
      added = true;
      if (seconds >= budget) break;
    }
  }

  const order = { dynamic: 0, mobility: 1, static: 2 };
  const exercises = chosen.sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1));
  const total = exercises.reduce((n, e) => n + moveSeconds(e), 0);
  return {
    exercises,
    seconds: total,
    why: [
      `${exercises.length} moves, ${Math.round(total / 60)} minutes of work, spread across the whole body.`,
      "Stretching library only: yoga and pilates carry no hold times or cues yet.",
    ],
  };
}
