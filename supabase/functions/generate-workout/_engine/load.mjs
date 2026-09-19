/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/load.mjs. Do not edit here. */
/* Starting weights, from bodyweight and sex when there is no history, and from
 * history the moment there is any.
 *
 * research/01: strength scales with bodyweight to roughly the two thirds power,
 * not linearly, which is the result every serious powerlifting scoring formula
 * exists to correct for. Linear scaling overshoots heavy beginners, and that is
 * the direction that hurts.
 *
 * research/03: the sexes differ far more in relative upper body strength than
 * lower. So this does not apply one blanket multiplier. It keeps separate
 * pattern ratios per sex, which is what the evidence actually says.
 *
 * Reference points are StrengthLevel's bench standards (48.7M logged lifts) at
 * 180 lb male and 140 lb female. Everything else is a conventional ratio to
 * bench, which is coaching convention rather than measured, and is flagged as
 * such in sources.md. Treat all of it as a better first guess than a lookup
 * table, and as something the logs overrule immediately.
 */

export const ALLOMETRIC_EXPONENT = 0.67;

const REF = {
  male: { bw: 180, bench: { beginner: 127, novice: 169, intermediate: 220, advanced: 277 } },
  female: { bw: 140, bench: { beginner: 44, novice: 72, intermediate: 108, advanced: 152 } },
};

/* Ratio of each pattern's 1RM to bench. Note the female column is not the male
   column scaled down: relative lower body strength is much closer between sexes
   than upper, so squat and hinge sit higher against bench for women. */
const PATTERN_RATIO = {
  //                male  female
  horizontalPush: [1.00, 1.00],
  verticalPush:   [0.65, 0.62],
  horizontalPull: [0.90, 0.95],
  verticalPull:   [0.85, 0.80],
  squat:          [1.30, 1.60],
  hinge:          [1.55, 1.85],
  lunge:          [0.85, 1.05],
  carry:          [1.20, 1.30],
  isolation:      [0.20, 0.18],
  core:           [0, 0],
};

/* Which pattern a library exercise belongs to, by name, falling back to the
   muscle group. Kept deliberately dumb: the library has no pattern field and we
   are not editing it, since knowledge/ belongs to Jawa.
 *
 * THE ORDER OF THIS TABLE IS LOAD BEARING. First match wins, so the only thing
 * separating a specific movement from the broad one whose word it contains is
 * where it sits in this list. That was already true and nobody had written it
 * down, which is how seventeen exercises ended up filed wrong: "extension" ate
 * Back Extension, "pull through" was in the isolation line so Cable Pull-Through
 * was never a hinge, "squat" ate Split Squat so a lunge slot had exactly one
 * beginner option, "push up" ate Handstand Push-Up, and every incline and
 * decline press matched nothing at all and fell through to the isolation
 * default, which priced them at a fifth of a bench.
 *
 * So the list now reads most specific to most general, in numbered tiers, and
 * test.mjs walks the entire library against an expected table so that appending
 * a pattern in the wrong place fails loudly instead of quietly re-pricing
 * somebody's incline press.
 *
 * Second rule, learned from the muscle classifier that lit a whole lower body
 * because "crunch" contains "run": a bare substring is only safe when the word
 * cannot live inside another word. `deadlift`, `romanian`, `pushdown` and
 * `shrug` are distinctive. `raise`, `press`, `row`, `dip`, `fly`, `squat`,
 * `plank` and `up` are not, so those carry \b. Anchoring is the default; a
 * bare substring needs a reason. */
const NAME_PATTERN = [
  /* 1. Core by name, first, because several ab movements are named after a
     movement they are not. Pallof Press is a press only in spelling, Hanging
     Leg Raise is not a lateral raise, and both used to lose to the line that
     owns their word. */
  [/\bpallof press\b|\bleg raise\b|windshield|\bhuman flag\b|\bl.?sit\b|\bv.?sit\b|hollow|\bplank\b|\bcrunch\b|\bsit.?up\b|\bv.?up\b|dead bug|bird dog|\btwist\b|side bend|rollout|toes.?to.?bar|superman/i, "core"],

  /* 2. Single joint work whose name carries a compound's word. A calf raise
     sits here rather than behind a lookahead in the isolation line, which also
     keeps Leg Press Calf Raise away from the squat tier below. An overhead
     triceps extension is not an overhead press, and a straight arm pulldown is
     one joint, so 0.85 of a bench was 108 lb of lat work for a beginner. */
  [/\bcalf\b|triceps extension|straight.?arm pulldown/i, "isolation"],

  /* 3. Hinge, above squat and above every push and pull line. Cable Pull-Through
     is the whole reason: it is hamstrings-primary, beginner, and a genuine
     hinge, and it is the only hinge a beginner can be given. */
  [/deadlift|romanian|good morning|hip thrust|\bswing\b|back extension|glute bridge|\bpull.?through\b/i, "hinge"],

  /* 4. Lunge above squat, because "split squat" contains "squat" and loses
     otherwise. That single line is why the lunge slot held one beginner option
     and the 4 day split repeated Step-Up on both leg days. */
  [/\blunge\b|split squat|step.?up/i, "lunge"],
  [/\bsquat\b|\bleg press\b/i, "squat"],

  /* 5. Vertical push above horizontal, because Handstand Push-Up contains
     "push up": the library's one bodyweight overhead press, filed as a bench
     press. The PUSH-UP only, not every handstand: Wall Handstand Hold and
     Freestanding Handstand are isometrics, and a vertical push slot prescribes
     sets and reps, so filing a hold as a press hands somebody "3 x 8 Wall
     Handstand Hold". They stay where they are until something in the plan can
     express a hold.
     The shoulder presses are named individually rather than inferred from the
     muscle group, because calibrate.mjs and fromHistory both classify a bare
     logged name with no primaries attached, and a rule that reads the group
     would quietly answer differently for the same lift. */
  [/handstand push.?up|\boverhead\b|shoulder press|military|\bpush press\b|arnold|cuban press|seated dumbbell press/i, "verticalPush"],
  [/\bpress\b|\bbench\b|\bpush.?up\b|\bdip\b/i, "horizontalPush"],

  /* 6. Pull. Nothing here overlaps, but specific before broad anyway. */
  [/\bpull.?up\b|\bchin.?up\b|pulldown|pullover|muscle.?up/i, "verticalPull"],
  [/\brow\b/i, "horizontalPull"],
  [/carry|farmer/i, "carry"],

  /* 7. Isolation LAST among the named lines, not first. It used to lead, for a
     good reason that had stopped being true: a lateral raise is not an overhead
     press and a fly is not a bench press, and when both were matched by a bare
     `bench|press` line the first run of this file prescribed a 265 lb beginner a
     70 lb lateral raise. The compound lines above are anchored now, so they no
     longer reach these, and whatever is still saying curl, raise, fly or shrug
     by the time we get here really is single joint. */
  [/curl|\braise\b|extension|pushdown|\bfly\b|shrug|kickback|pec deck|face pull/i, "isolation"],
];

/* A pattern ratio describes the barbell version of a movement. A goblet squat is
   not a back squat and a dumbbell press is not a bench press, so the variant has
   to scale it or the number is nonsense. Same failure as above: the first run
   put 145 lb on a goblet squat, which nobody has ever held. */
const VARIANT_FACTOR = [
  [/goblet/i, 0.35],
  [/leg press/i, 1.6],
  [/hack squat|smith/i, 0.9],
  [/single.?leg|single.?arm|bulgarian|split squat|step.?up|lunge/i, 0.45],
  [/dumbbell|db /i, 0.55],
  [/machine|cable|assisted|seated (?!barbell)/i, 0.8],
  [/incline/i, 0.8],
  [/close.?grip|stiff.?leg|pause|deficit/i, 0.85],
  [/sumo|trap bar/i, 1.0],
];

export function variantFactor(exercise, pattern) {
  const name = exercise?.name || String(exercise || "");
  /* Isolation ratios are already implement specific: a curl ratio describes a
     dumbbell curl, so discounting it again for being a dumbbell halves it twice.
     Only the single limb case still applies. */
  if (pattern === "isolation") return /single.?arm|single.?leg|one.?arm/i.test(name) ? 0.55 : 1;
  let f = 1;
  for (const [re, v] of VARIANT_FACTOR) if (re.test(name)) { f = v; break; }
  return f;
}

export function patternFor(exercise) {
  const name = exercise?.name || String(exercise || "");
  for (const [re, p] of NAME_PATTERN) if (re.test(name)) return p;
  const g = (exercise?.primary || [])[0];
  if (["abs", "obliques", "lowerback"].includes(g)) return "core";
  return "isolation";
}

/* Epley, inverted: what you can hold for R reps given a 1RM. Trimmed a little
   because a working set is not a max attempt and a first session least of all. */
export function workingFrom1RM(oneRM, reps, { rir = 2 } = {}) {
  if (!oneRM) return null;
  const pct = 1 / (1 + reps / 30);
  const rirTrim = 1 - Math.min(0.10, rir * 0.025);
  return oneRM * pct * rirTrim;
}

/* Every weight this module hands out goes through here, which makes it the one
   place a non-finite number can be stopped. It has to be stopped: a log weight
   of 1e308 is valid JSON, survives the payload bound, overflows a pattern ratio
   to Infinity, and JSON.stringify writes Infinity as `null`. CONTRACT.md
   promises targetWeight is a number the app does arithmetic on, and 0 means
   bodyweight or unknown, never null. So anything that is not a real number
   leaves here as null, which adapter.mjs already turns into 0, which is the
   contract's own word for "we do not know". */
export const roundLoad = (lb) =>
  lb == null || !Number.isFinite(Number(lb)) ? null
    : lb < 40 ? Math.round(lb / 2.5) * 2.5 : Math.round(lb / 5) * 5;

/* The window a bodyweight has to be inside before this module will do
   arithmetic with it. Same 40 to 1500 the edge function's own payload bound
   uses, on purpose: the two should not disagree about what a person weighs.
   Anything outside it is not a light person or a heavy one, it is a bad row, a
   kilogram figure typed into a pound field, or a hostile body, and the honest
   answer to all three is the same as the answer to a missing weight. research/05
   again: we would rather say nothing than guess from a number we do not believe.
   Returns null so every caller can use the branch it already has for "we were
   never told how heavy they are". */
const HUMAN_BW_LB = [40, 1500];
export function humanBodyWeight(bodyWeightLb) {
  const n = Number(bodyWeightLb);
  if (!Number.isFinite(n) || n < HUMAN_BW_LB[0] || n > HUMAN_BW_LB[1]) return null;
  return n;
}

/* What somebody this size could PLAUSIBLY be lifting, at the top of the range.
 *
 * This used to be `coldStart1RM` and it used to end up on a card. It does not
 * any more, and that is the change: a person with no logs was being told to
 * pull 110 lb on a Cable Pull-Through under a note reading "deliberately light,
 * log what you do", which is the app admitting it is guessing and printing the
 * guess anyway. Worse, the guess was keyed on `sex`, which is optional, so a
 * woman who never filled it in got the male reference and every lift in her
 * week came out 2.0x to 2.8x too heavy. Removing the guess removes that whole
 * class of bug rather than patching one end of it.
 *
 * It survives for one job, and the job is the opposite of prescribing. When the
 * engine extrapolates a load from a DIFFERENT movement in somebody's own logs,
 * the ratio arithmetic can run away: one logged 200 lb Goblet Squat produced an
 * 870 lb Leg Press. `sanityCeiling` needs some idea of the size of a person to
 * catch that, and this is the only thing in the file that has one. A number that
 * can only ever lower a figure derived from the user's own logged work is not a
 * claim about how strong they are; it is a claim that 870 lb is nobody.
 *
 * It takes no training level, and the rung it stands on instead is the bottom
 * one. Two reasons, and they agree. research/05 decides the direction whenever
 * this engine is unsure, and what this bounds is a guess rather than a
 * measurement: wrong-low costs one easy set, wrong-high costs the session. And
 * it is what every real user was already getting, because the level ladder
 * started at 20 sessions of 90 days of logs and essentially nobody in production
 * ever left the bottom rung, so this is the rail as it actually ran rather than
 * a new one.
 *
 * A missing `sex` no longer costs anybody anything either, which is the other
 * half of the bug being removed: defaulting to the male reference can now only
 * make a ceiling looser, and a ceiling that fails to bind is a ceiling that
 * changed nothing. */
export function sizeCeiling1RM({ exercise, bodyWeightLb, sex = "Male" }) {
  const female = String(sex).toLowerCase().startsWith("f");
  const ref = female ? REF.female : REF.male;
  const pattern = patternFor(exercise);
  const ratio = (PATTERN_RATIO[pattern] || PATTERN_RATIO.isolation)[female ? 1 : 0];
  if (!ratio) return null;                       // bodyweight or core work, no load to set
  const bw = humanBodyWeight(bodyWeightLb);
  if (!bw) return null;                          // research/05: never guess, just omit it

  const benchAtRef = ref.bench.beginner;
  const scaled = benchAtRef * Math.pow(bw / ref.bw, ALLOMETRIC_EXPONENT);
  return scaled * ratio * variantFactor(exercise, pattern);
}

/* How many recent sessions of a movement get a vote. Same window as
   calibrate.mjs, and for the same reason: two is enough to see a pattern and
   four is describing somebody they no longer are. */
const HISTORY_WINDOW = 3;

/* The most recent row is not the best evidence of what somebody can lift. It
   used to be the whole answer here, so one deliberately light day, a deload, a
   set done at home with what was in the room, became the next prescription and
   the person spent the following week undertrained. A logged `weight: 0` was
   worse: bodyweight work and mistyped rows both read as a history of zero.
   So: the last three sessions, nothing at or below zero, and where the caller
   said what reps it is asking for, prefer a row done at a comparable rep count,
   because 8 reps at 135 and 3 reps at 135 are not the same lift.
   calibrate.mjs is the fuller answer to this question, since it can see what was
   prescribed as well as what was done. This is the guard for the people who have
   no completed plans for it to read, which on day one is everybody. */
function bestRow(rows, reps, weightOf) {
  const near = reps != null
    ? rows.filter((r) => r.reps != null && Math.abs(Number(r.reps) - reps) <= 2)
    : [];
  const pool = near.length ? near : rows;
  return pool.reduce((best, r) => (weightOf(r) > weightOf(best) ? r : best), pool[0]);
}

const byDateDesc = (a, b) => String(b.entry_date).localeCompare(String(a.entry_date));

/* One reading of a log row's exercise name, lowercased and trimmed, for every
   comparison in this file. Exported because training-age.mjs asks the same
   question of the same rows and the two must never answer it differently. */
export const logName = (row) => String(row?.exercise_name ?? "").trim().toLowerCase();

/* History wins the moment it exists. Exact name first, then the same pattern,
   which is how a coach would guess a new movement from a known one. */
export function fromHistory({ exercise, logs = [], reps = null }) {
  const target = String(exercise?.name || exercise || "").toLowerCase();
  /* `exercise_name` is whatever the row carried. It is a text column and every
     client writes a string into it, but the engine is handed rows it did not
     fetch, and a number there used to be a 500 off `.toLowerCase`. Same answer
     as everywhere else that reads a name out of a row: coerce it, then judge it.
     A row whose name is an object stringifies to something no library entry
     matches, which is the same outcome as a name nobody has ever logged. */
  const withWeight = (Array.isArray(logs) ? logs : [])
    .filter((l) => l && typeof l === "object" && logName(l) && Number(l.weight) > 0);
  const exact = withWeight
    .filter((l) => logName(l) === target)
    .sort(byDateDesc)
    .slice(0, HISTORY_WINDOW);
  if (exact.length) {
    const hit = bestRow(exact, reps, (r) => Number(r.weight));
    return { source: "exact", weight: Number(hit.weight), reps: hit.reps ?? null, date: hit.entry_date };
  }
  const want = patternFor(exercise);
  const same = withWeight
    .filter((l) => patternFor({ name: l.exercise_name }) === want)
    .sort(byDateDesc)
    .slice(0, HISTORY_WINDOW);
  if (same.length) {
    /* Scale between the variants, or a barbell squat becomes a 450 lb goblet
       squat, which is what the first run of this actually produced. Each
       candidate is scaled before they are compared, because the heaviest number
       in the column is not the heaviest lift once the implement differs. */
    const scaled = (r) =>
      Number(r.weight) * (variantFactor(exercise, want) / (variantFactor({ name: r.exercise_name }, want) || 1));
    const from = bestRow(same, reps, scaled);
    return {
      source: "pattern", weight: scaled(from) * 0.95, rows: same.length,
      from: from.exercise_name, date: from.entry_date,
    };
  }
  return null;
}

/* research/07: what was planned and what was actually logged are the same
   signal a coach reads off a set, and calibrate.mjs turns that join into a
   factor and a verdict. Applied here rather than after the fact so the number
   the user sees is the number the evidence supports, and said out loud in the
   note so the plan never changes underneath them silently. */
function applyCalibration(weight, note, calibration, exercise) {
  const name = String(exercise?.name || exercise || "").toLowerCase();
  const c = calibration && calibration[name];
  if (!c) return { weight, note };

  const lines = [note];
  if (c.verdict === "too-easy") lines.push("Last time was easy, going up.");
  if (c.verdict === "too-heavy") lines.push("Held: last time was a struggle.");
  if (c.swapSuggested) lines.push("You have skipped this twice; the swap is there.");
  /* Left unrounded on purpose. Every caller runs it through roundLoad, and
     rounding twice is how a 2.5 lb step quietly becomes a 5 lb one. */
  return {
    weight: weight == null ? weight : weight * (c.nextLoadFactor ?? 1),
    note: lines.join(" "),
  };
}

/* A ceiling on a load that was EXTRAPOLATED rather than measured.
 *
 * The fuzz run of 2026-09-12 found a 180 lb man with one logged Goblet Squat at
 * 200 lb being prescribed a 870 lb Leg Press, note reading "Guessed from your
 * Goblet Squat", meta.level still reading beginner. The ratio arithmetic was
 * doing exactly what it was told. Nothing was asking whether the answer was a
 * weight a person could stand under.
 *
 * The bound is not a flat number, because the honest ceiling for a 250 lb
 * advanced lifter's leg press and for a 120 lb beginner's lateral raise are not
 * the same number and never will be. It is a multiple of what this same module
 * would have guessed from size alone, which already carries bodyweight
 * allometrically, sex, level, the movement pattern and the implement. So the
 * cap asks one question: how far above your size and level is this allowed to
 * go on the strength of the evidence behind it?
 *
 * And the evidence is the multiplier. One row of a different movement is a
 * rumour; three rows is a pattern. research/05 decides the direction when we are
 * unsure, as it does everywhere else in this file: wrong-low costs one easy set,
 * wrong-high costs the session.
 *
 * The guess is capped hardest. See the bodyweight rail below for the measured
 * row, which used to be capped at nothing a real lifter could reach. */
const EXTRAPOLATION_TRUST = [1.5, 2.0, 2.5];   // by how many rows are behind the guess

/* The last resort, for when bodyweight is missing and there is no size-based
   guess to be a multiple of. Not a claim about anybody in particular: it is the
   line past which no working set is a real person, and it exists so that a bad
   row cannot turn into a four figure prescription just because we never asked
   how heavy the user is. */
const NO_HUMAN_LB = 1200;

/* The second rail, and the one that does the work on a MEASURED row.
 *
 * The first version of this cap only bounded a guess, on the argument that
 * capping a measurement would be the engine telling somebody they did not lift
 * what they lifted. That argument was right about measurements and wrong about
 * rows: the session weight field is `type="number"` with no max, so a logged
 * 5000 lb Front Squat is not a measurement, it is a typo with a date on it, and
 * the old no-human line of 1500 lb was happy to hand it back. The fuzz run of
 * 2026-09-12 found 2,882 of these, most of them a four figure load read straight
 * off one absurd row.
 *
 * So the ceiling is now a multiple of the person's own bodyweight as well. Not a
 * strength standard and not an opinion about anybody's best lift: it is the line
 * where somebody reading the card would decide the app is broken. A beginner
 * told to put three times their own bodyweight on a bar has been told something
 * useless whether or not a row somewhere says so.
 *
 * It used to be a multiple by LEVEL, 3 for a beginner rising to 6 for an
 * advanced lifter. That went with the level, and it went without much of a
 * fight: the rail's job is to catch a typo, not to model a lifter, and a rail
 * that decides how strong somebody is allowed to be is doing the second thing.
 * Four is the one number now. It is looser than the 3 nearly every real user
 * got, because in production almost nobody could ever climb off the bottom
 * rung, and tighter than the 6 the top rung gave, which nobody in production
 * could reach at all. A 180 lb person would have to have logged 720 lb on one
 * movement before it says a word. */
const TYPO_BODYWEIGHT_MULTIPLE = 4;

/* When we were never told a bodyweight, the rail still has to exist, because the
   history path hands out loads with or without one. A 200 lb person is the
   stand-in: it is not a guess about this user, it only decides how loose the
   rail is, and it is deliberately on the heavy side so the rail never binds on
   somebody real. */
const ASSUMED_BW_LB = 200;

/* One ceiling, three bounds, the tightest wins.
 *
 * `trust` is null for a measured row, which is the difference between the two
 * kinds of evidence: an exact row is bounded only by what a person of this size
 * could plausibly be doing, while a guess is bounded by what this module itself
 * would have prescribed from size alone, times how many rows are behind the
 * guess. One row of a different movement is a rumour; three rows is a pattern. */
function sanityCeiling({ exercise, reps, bodyWeightLb, sex, trust = null }) {
  const bw = humanBodyWeight(bodyWeightLb) ?? ASSUMED_BW_LB;
  let ceiling = Math.min(NO_HUMAN_LB, bw * TYPO_BODYWEIGHT_MULTIPLE);
  if (trust != null) {
    const oneRM = sizeCeiling1RM({ exercise, bodyWeightLb, sex });
    const sizeBased = oneRM ? workingFrom1RM(oneRM, reps ?? 8) : null;
    if (sizeBased) ceiling = Math.min(ceiling, sizeBased * trust);
  }
  /* Rounded DOWN to the step every load leaves here on, because roundLoad rounds
     to the nearest 5 and a ceiling that rounds up is not a ceiling. */
  return Math.floor(ceiling / 5) * 5;
}

const trustFor = (rows = 1) =>
  EXTRAPOLATION_TRUST[Math.min(Math.max(rows, 1), EXTRAPOLATION_TRUST.length) - 1];

/**
 * The load for one exercise, and an honest note about where the number came from.
 *
 * `calibration` is optional and is calibrate.mjs's `byExercise` map. Without it
 * this behaves exactly as it always has, which matters: the join only exists
 * for people who have finished a planned session.
 */
/* The one sentence a person gets in place of a number they were never owed.
   Three things have to be in it and nothing else: what to do today, how to know
   when they have got it, and that this is the last time they will be asked.
   research/05's conservative rule said out loud rather than performed: two reps
   in reserve is the engine's own RIR everywhere else in this file, so the number
   they arrive at is the number the next prescription is built from, and saying
   so is what makes the first session feel like the start of something rather
   than a blank. */
/* Coming back after four weeks or more away: where the first session restarts,
   as a fraction of what the logs say they were lifting.
 *
 * research/11 and research/02 both land on about half, and muscle memory makes
 * the climb back quick enough that it costs very little. research/02 adds the
 * age term: connective tissue lags muscle and lags it further with age, so
 * muscle gets strong enough to hurt the structures holding it before those
 * structures catch up, and week one back is exactly the unaccustomed eccentric
 * work that finds that out. The answer it gives is "a longer ramp-in block and
 * smaller load increments, especially for someone returning after years away.
 * Not a lower ceiling. A slower approach to it."
 *
 * So the restart moves from 0.55 to 0.45 across the dial. Ten points, which is
 * two thirds of one session's climb back, not a different program: the same
 * logs, the same movements, the same place to get back to, reached with one
 * more week under it. research/02 is explicit that the magnitude here is
 * invented and that it would not put a number on how much slower recovery gets
 * without checking; this is a small one for that reason. */
export const RETURN_FACTOR = 0.55;
export const AGE_RETURN_CUT = 0.10;

export function returnFactorFor(ageCaution = 0) {
  const c = Number(ageCaution);
  const caution = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0;
  return RETURN_FACTOR - AGE_RETURN_CUT * caution;
}

const FIRST_TIME_NOTE =
  "First time on this one: work up to a weight you could stop two reps short of. That becomes your number.";

/* `ageCaution` is age.mjs's dial, 0 to 1. It reaches exactly one number in
   this file, the returning restart, and it can only lower it. It does not
   touch the ceiling, the pattern ratios, the cap or the first-time note: those
   are claims about how strong somebody is and age is not allowed to make one.
   Defaults to 0, so a caller that does not pass it gets the file as it was. */
export function prescribeLoad({ exercise, reps, bodyWeightLb, sex, logs = [], returning = false, calibration = null, ageCaution = 0 }) {
  if (exercise?.equipment === "bodyweight") {
    return { weight: null, basis: "bodyweight", note: "Bodyweight. The progression is the variation, not the load." };
  }

  /* `reps` goes down with it so history can prefer a set done at a comparable
     rep count. A triple and a set of twelve at the same weight are different
     evidence about what today's prescription should be. */
  const hist = fromHistory({ exercise, logs, reps });
  if (hist) {
    let w = hist.weight;
    /* research/11 and 02: after four weeks or more away, start near half and
       climb back. Muscle memory makes that quick, so it costs very little, and
       age moves where "half" starts. See RETURN_FACTOR. */
    const restart = returnFactorFor(ageCaution);
    if (returning) w *= restart;
    /* The one sentence the restart owes them, and it has to say which of the
       two reasons it is: "you have been away" is true for everybody, and
       "further back than that because of your age" is a different claim and
       the kind this file says out loud rather than performing. */
    const away = !returning ? ""
      : restart < RETURN_FACTOR
        ? " Starting light because you have been away, and a little lighter still: tendon takes longer than muscle to catch back up."
        : " Starting light because you have been away.";
    const tuned = applyCalibration(w, hist.source === "exact"
      ? `You lifted ${hist.weight} on ${hist.date}.${away}`
      : `Guessed from your ${hist.from} on ${hist.date}.${away}`,
      calibration, exercise);

    /* The cap, applied last so that everything which can legitimately lower the
       number has already had its turn. It only ever lowers. When it binds it
       says so, because a capped number presented as a derived one is the engine
       lying quietly, and this file's whole argument is that the number should be
       honest about where it came from. `capped` rides along so the caller can
       lift it into a day note. */
    let weight = tuned.weight;
    let note = tuned.note;
    let capped = false;
    if (weight != null && !Number.isNaN(Number(weight))) {
      /* Both kinds of evidence get a ceiling now, and they get different ones.
         A guess is bounded by what this module would have prescribed from size
         alone; a measured row is bounded only by the bodyweight rail, because a
         row IS what somebody did right up to the point where it stops being a
         weight a person of that size lifts and starts being a typo.
         Written as `!(weight <= ceiling)` rather than `weight > ceiling` on
         purpose: an Infinity that came out of a 1e308 log fails the first and
         passes the second, and it has to be clamped rather than quietly become
         a null. */
      const ceiling = sanityCeiling({
        exercise, reps, bodyWeightLb, sex,
        trust: hist.source === "pattern" ? trustFor(hist.rows) : null,
      });
      if (!(weight <= ceiling)) {
        weight = ceiling;
        capped = true;
        note = hist.source === "pattern"
          ? `${note} That worked out far above what your size and level suggest, off `
            + `${hist.rows === 1 ? "one session" : `${hist.rows} sessions`} of a different movement, so it is held here. `
            + `Treat it as a guess and change it if it is wrong.`
          : `${note} That is far above what anybody your size lifts, so the logged row behind it is wrong. `
            + `This is a ceiling, not a prescription: put in what you can actually do.`;
      }
    }
    return {
      weight: roundLoad(weight),
      basis: hist.source === "exact" ? "your last session" : "a similar lift",
      note,
      capped,
    };
  }

  /* Nothing logged, and nothing honest to say about the number. There used to be
     a third path here: scale a reference bench by bodyweight and sex, take 90%
     of the working set, print it, and attach a note admitting it was a guess.
     That is the shape of the whole problem. The note said "deliberately light"
     while the card said 110 lb to somebody who had never trained, and a number
     on a card is read where a note under it is not.

     So the number is simply absent, and what takes its place is the rest of the
     prescription, which was never a guess: the sets, the reps, the rest, and one
     instruction. `basis: "unknown"` is a path this function already had, for the
     people whose bodyweight was missing, and the app already renders it: a
     targetWeight of 0 draws no load on the card and the note goes under the
     lift. So this is not a new state for a client to learn, it is an old state
     arriving far more often, which is why `loadBasis` now leaves the adapter
     as well: a card has to be able to tell "you carry yourself" from "go and
     find out".

     Calibration still reaches this branch, because an exercise nobody has ever
     logged has no history to read and the twice-skipped swap line has to be
     able to be said. */
  const said = applyCalibration(null, FIRST_TIME_NOTE, calibration, exercise);
  return { weight: null, basis: "unknown", note: said.note };
}
