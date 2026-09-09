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

/* History wins the moment it exists. Exact name first, then the same pattern,
   which is how a coach would guess a new movement from a known one. */
export function fromHistory({ exercise, logs = [] }) {
  const target = String(exercise?.name || exercise || "").toLowerCase();
  const withWeight = logs.filter((l) => l.weight != null && l.exercise_name);
  const exact = withWeight
    .filter((l) => l.exercise_name.toLowerCase() === target)
    .sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));
  if (exact.length) {
    return { source: "exact", weight: Number(exact[0].weight), reps: exact[0].reps ?? null, date: exact[0].entry_date };
  }
  const want = patternFor(exercise);
  const same = withWeight
    .filter((l) => patternFor({ name: l.exercise_name }) === want)
    .sort((a, b) => String(b.entry_date).localeCompare(String(a.entry_date)));
  if (same.length) {
    /* Scale between the variants, or a barbell squat becomes a 450 lb goblet
       squat, which is what the first run of this actually produced. */
    const from = same[0];
    const ratio = variantFactor(exercise, want) / (variantFactor({ name: from.exercise_name }, want) || 1);
    return {
      source: "pattern", weight: Number(from.weight) * ratio * 0.95,
      from: from.exercise_name, date: from.entry_date,
    };
  }
  return null;
}

/**
 * The load for one exercise, and an honest note about where the number came from.
 */
export function prescribeLoad({ exercise, reps, bodyWeightLb, sex, level, logs = [], returning = false }) {
  if (exercise?.equipment === "bodyweight") {
    return { weight: null, basis: "bodyweight", note: "Bodyweight. The progression is the variation, not the load." };
  }

  const hist = fromHistory({ exercise, logs });
  if (hist) {
    let w = hist.weight;
    /* research/11 and 02: after four weeks or more away, start near half and
       climb back. Muscle memory makes that quick, so it costs very little. */
    if (returning) w *= 0.55;
    return {
      weight: roundLoad(w),
      basis: hist.source === "exact" ? "your last session" : "a similar lift",
      note: hist.source === "exact"
        ? `You lifted ${hist.weight} on ${hist.date}.${returning ? " Starting light because you have been away." : ""}`
        : `Guessed from your ${hist.from} on ${hist.date}.${returning ? " Starting light because you have been away." : ""}`,
    };
  }

  const oneRM = coldStart1RM({ exercise, bodyWeightLb, sex, level });
  if (!oneRM) {
    return { weight: null, basis: "unknown", note: "Pick a weight you could do a couple more reps with. We will learn it from what you log." };
  }
  const working = workingFrom1RM(oneRM, reps);
  /* Deliberately under, not over. research/05: wrong-low costs one easy set,
     wrong-high costs a failed session and possibly the user. */
  return {
    weight: roundLoad(working * 0.9),
    basis: "your size",
    note: "A starting guess from your bodyweight. Deliberately light. Log what you actually do and the next one will be right.",
  };
}
