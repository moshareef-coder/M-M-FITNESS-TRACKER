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

/* Which pattern a library exercise belongs to, by muscle group and name. Kept
   deliberately dumb: the library has no pattern field and we are not editing it,
   since knowledge/ belongs to Jawa. */
const NAME_PATTERN = [
  /* Isolation is tested first and deliberately. A lateral raise is not an
     overhead press and a fly is not a bench press, but both used to match the
     compound line above and inherit its load ratio, which is how the first run
     of this file prescribed a 265 lb beginner a 70 lb lateral raise. */
  [/curl|raise(?!.*calf)|extension|pushdown|fly|shrug|kickback|pull.?through|pec deck|reverse fly|face pull/i, "isolation"],
  [/calf/i, "isolation"],
  [/deadlift|romanian|good morning|hip thrust|swing|back extension|glute bridge/i, "hinge"],
  [/squat|leg press/i, "squat"],
  [/lunge|split squat|step.?up/i, "lunge"],
  [/bench|chest press|push.?up|dip/i, "horizontalPush"],
  [/overhead|shoulder press|military/i, "verticalPush"],
  [/row/i, "horizontalPull"],
  [/pull.?up|chin.?up|pulldown|pullover/i, "verticalPull"],
  [/carry|farmer/i, "carry"],
  [/plank|crunch|sit.?up|leg raise|dead bug|bird dog|hollow|twist|side bend/i, "core"],
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

export const roundLoad = (lb) =>
  lb == null ? null : lb < 40 ? Math.round(lb / 2.5) * 2.5 : Math.round(lb / 5) * 5;

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
      source: "pattern", weight: scaled(from) * 0.95,
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
    return {
      weight: roundLoad(tuned.weight),
      basis: hist.source === "exact" ? "your last session" : "a similar lift",
      note: tuned.note,
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
