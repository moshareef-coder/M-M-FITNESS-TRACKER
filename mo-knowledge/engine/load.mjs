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

/* No history at all. Bodyweight, sex and level, scaled properly. */
export function coldStart1RM({ exercise, bodyWeightLb, sex = "Male", level = "beginner" }) {
  const female = String(sex).toLowerCase().startsWith("f");
  const ref = female ? REF.female : REF.male;
  const pattern = patternFor(exercise);
  const ratio = (PATTERN_RATIO[pattern] || PATTERN_RATIO.isolation)[female ? 1 : 0];
  if (!ratio) return null;                       // bodyweight or core work, no load to set
  if (!bodyWeightLb) return null;                // research/05: never guess, just omit it

  const benchAtRef = ref.bench[level] || ref.bench.beginner;
  const scaled = benchAtRef * Math.pow(bodyWeightLb / ref.bw, ALLOMETRIC_EXPONENT);
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

/* History wins the moment it exists. Exact name first, then the same pattern,
   which is how a coach would guess a new movement from a known one. */
export function fromHistory({ exercise, logs = [], reps = null }) {
  const target = String(exercise?.name || exercise || "").toLowerCase();
  const withWeight = logs.filter((l) => l && l.exercise_name && Number(l.weight) > 0);
  const exact = withWeight
    .filter((l) => l.exercise_name.toLowerCase() === target)
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
 * Only the guess is capped. An exact history row is a measurement of something
 * the person actually did, and capping a measurement would be the engine telling
 * somebody they did not lift what they lifted. */
const EXTRAPOLATION_TRUST = [1.5, 2.0, 2.5];   // by how many rows are behind the guess

/* The last resort, for when bodyweight is missing and there is no size-based
   guess to be a multiple of. Not a claim about anybody in particular: it is the
   line past which no working set is a real person, and it exists so that a bad
   row cannot turn into a four figure prescription just because we never asked
   how heavy the user is. */
const NO_HUMAN_LB = 1500;

function extrapolationCeiling({ exercise, reps, bodyWeightLb, sex, level, rows = 1 }) {
  const trust = EXTRAPOLATION_TRUST[Math.min(Math.max(rows, 1), EXTRAPOLATION_TRUST.length) - 1];
  const oneRM = coldStart1RM({ exercise, bodyWeightLb, sex, level });
  const sizeBased = oneRM ? workingFrom1RM(oneRM, reps ?? 8) : null;
  return sizeBased ? Math.min(sizeBased * trust, NO_HUMAN_LB) : NO_HUMAN_LB;
}

/**
 * The load for one exercise, and an honest note about where the number came from.
 *
 * `calibration` is optional and is calibrate.mjs's `byExercise` map. Without it
 * this behaves exactly as it always has, which matters: the join only exists
 * for people who have finished a planned session.
 */
export function prescribeLoad({ exercise, reps, bodyWeightLb, sex, level, logs = [], returning = false, calibration = null }) {
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
       climb back. Muscle memory makes that quick, so it costs very little. */
    if (returning) w *= 0.55;
    const tuned = applyCalibration(w, hist.source === "exact"
      ? `You lifted ${hist.weight} on ${hist.date}.${returning ? " Starting light because you have been away." : ""}`
      : `Guessed from your ${hist.from} on ${hist.date}.${returning ? " Starting light because you have been away." : ""}`,
      calibration, exercise);

    /* The cap, applied last so that everything which can legitimately lower the
       number has already had its turn. It only ever lowers, and it only ever
       touches a guess. When it binds it says so, because a capped number
       presented as a derived one is the engine lying quietly, and this file's
       whole argument is that the number should be honest about where it came
       from. `capped` rides along so the caller can lift it into a day note. */
    let weight = tuned.weight;
    let note = tuned.note;
    let capped = false;
    if (weight != null && !Number.isNaN(Number(weight))) {
      /* An exact row is a measurement and gets only the no-human line, which no
         real lifter will ever reach. The guess gets the real ceiling. Written as
         `!(weight <= ceiling)` rather than `weight > ceiling` on purpose: an
         Infinity that came out of a 1e308 log fails the first and passes the
         second, and it has to be clamped rather than quietly become a null. */
      const ceiling = hist.source === "pattern"
        ? extrapolationCeiling({ exercise, reps, bodyWeightLb, sex, level, rows: hist.rows })
        : NO_HUMAN_LB;
      if (!(weight <= ceiling)) {
        weight = ceiling;
        capped = true;
        note = hist.source === "pattern"
          ? `${note} That worked out far above what your size and level suggest, off `
            + `${hist.rows === 1 ? "one session" : `${hist.rows} sessions`} of a different movement, so it is held here. `
            + `Treat it as a guess and change it if it is wrong.`
          : `${note} That is not a weight anybody lifts, so the logged row behind it is wrong. `
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

  const oneRM = coldStart1RM({ exercise, bodyWeightLb, sex, level });
  if (!oneRM) {
    return { weight: null, basis: "unknown", note: "Pick a weight you could do a couple more reps with. We will learn it from what you log." };
  }
  const working = workingFrom1RM(oneRM, reps);
  /* Deliberately under, not over. research/05: wrong-low costs one easy set,
     wrong-high costs a failed session and possibly the user. */
  /* Calibration reaches this branch too, and the case that needs it is the
     skipped one: an exercise nobody has ever logged has no history to read, so
     without this the swap line would never be said out loud. */
  const cold = applyCalibration(working * 0.9,
    "A starting guess from your bodyweight. Deliberately light. Log what you actually do and the next one will be right.",
    calibration, exercise);
  return {
    weight: roundLoad(cold.weight),
    basis: "your size",
    note: cold.note,
  };
}
