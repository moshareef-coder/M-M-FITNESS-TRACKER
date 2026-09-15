# Build muscle training

Covers the "build muscle" category from `real-goals.md` — general hardgainer
framing and the muscle-group-specific variant ("grow my glutes," "chicken
legs") are the same plan with an optional volume bias, per that file.

## Surplus sizing — the number that actually matters here

Multiple sources converge tightly on the same range, anchored by a real
peer-reviewed recommendation: Helms, Aragon & Fitschen (2014, Journal of
the International Society of Sports Nutrition) recommend natural lifters
target roughly **0.5–1% of bodyweight gained per week** during a surplus
phase, to keep the fat share of the gain low. In calorie terms that's
commonly translated to:

| Experience tier | Daily surplus | Expected muscle gain |
|---|---|---|
| Beginner | ~250–500 kcal/day above TDEE | ~0.5–1 kg (1–2 lb) muscle/month |
| Intermediate | ~200–400 kcal/day above TDEE | ~0.2–0.5 kg/month |
| Advanced | ~150–300 kcal/day above TDEE | ~0.1–0.3 kg/month |

The pattern is the same shape as the deficit cap already fixed in
`goal-timeline.mjs` for the lose-weight goal: **bigger surplus doesn't mean
faster muscle, past a point it just means more fat.** A "dirty bulk"
(500+ kcal/day, untracked) reliably produces more fat per pound of actual
muscle than a controlled surplus does — this is the unanimous point across
every source researched here, mirroring the weight-loss finding that the
aggressive version is the one that doesn't work long-term.

**Implication for `calorie-math.mjs`/`goal-timeline.mjs`:** the build-muscle
goal needs its own surplus target, tiered by experience level (derived the
same way as `deriveTraineeLevel()` already does), rather than a single flat
number for everyone — a beginner and an advanced lifter shouldn't get the
same daily surplus, the same way they don't get the same deficit.

## Rep/set scheme and volume

This is where `build muscle` and `get stronger` should diverge even though
both currently normalize to overlapping rep ranges in `REP_RANGES`:

- Hypertrophy-biased rep range: roughly 6–15 reps, RPE 7–9 / 1–3 RIR per
  `rpe-autoregulation.md` — already correctly coded as the `hypertrophy`
  bucket.
- Weekly volume should sit at mid-to-high MAV (`volume-landmarks.md`), not
  low-MAV — hypertrophy responds to volume more directly than pure strength
  work does, within the recoverable ceiling for the trainee's tier
  (`experience-tiers.md`).
- **When a muscle group is named for emphasis** ("grow my glutes"), bias
  that group's target toward the top of its MAV range or slightly beyond
  (short of MRV), while every other muscle group stays at a normal
  maintenance-level MEV-to-low-MAV allocation — this is standard
  specialization-block structure, not overtraining, as long as the
  emphasized group's fatigue is tracked against its own MRV ceiling.

## Progression across weeks

Standard `progressiveOverload()` logic applies as-is: hit target reps → add
load next session; missed reps → hold. Nothing goal-specific changes here
beyond what's already in `progressive-overload.md` — the surplus is what's
different about this goal, not the set-to-set progression mechanic.

## Split structure

A build-muscle goal is where training frequency matters more than for a
general-fitness goal — each muscle group benefits from being hit roughly
twice a week rather than once, within the same weekly volume total, since
frequency itself is a component of the stimulus at higher volumes. In
practice: a 3–4 day/week trainee is usually better served by an
upper/lower split repeated across the week than a single-muscle-per-day
"bro split," so that everything gets touched twice; a 5–6 day/week trainee
has room for a push/pull/legs structure repeated twice weekly instead.
`pickFocusCategories()` already tends toward this naturally by picking the
most-behind muscle groups each session — worth confirming it actually
produces roughly-twice-weekly coverage per muscle across a real week rather
than just optimizing session-to-session.

## Sex and anthropometry

Per `sex-and-anthropometry.md`: no default volume or load scaling by sex —
hypertrophy response is statistically equal between men and women. Named
muscle-group emphasis, limb-length-informed stance/grip suggestions, and
tall-lifter mechanics apply exactly as described there; nothing about the
build-muscle goal changes those defaults.

## Equipment variants

Hypertrophy work benefits more than most goals from machine and cable
options specifically, since constant tension and a fixed path let a
trainee push closer to failure safely without a spotter — worth weighting
machine/cable options slightly higher in the selection order for this goal
specifically when a full gym is available, not just falling back to them
as a bodyweight/dumbbell substitute.

| Pattern | Full gym | Dumbbells only | Bodyweight only | Machine-only |
|---|---|---|---|---|
| Horizontal push (chest) | Barbell/dumbbell bench, cable fly | Dumbbell press, dumbbell fly | Push-up variations (see `equipment-substitution.md` ladder) | Chest press + pec deck |
| Vertical pull (lats) | Weighted pull-up, lat pulldown | Dumbbell row (heavy, low rep) | Pull-up progression ladder (`real-goals.md` skill-ladder logic) | Lat pulldown + assisted pull-up machine |
| Horizontal pull (mid-back) | Barbell row, cable row | Dumbbell row | Inverted row / band row | Seated row machine |
| Shoulders | Overhead press, lateral raise | Dumbbell press, lateral raise | Pike push-up, handstand progression | Shoulder press machine, cable lateral raise |
| Quads | Back squat, leg press | Goblet squat, dumbbell lunge | Bulgarian split squat, pistol progression | Leg press, leg extension |
| Hamstrings/glutes | Deadlift/RDL, hip thrust | Dumbbell RDL, dumbbell hip thrust | Single-leg glute bridge, nordic curl progression | Leg curl, hip thrust machine |
| Arms | Barbell/EZ curl, cable pushdown | Dumbbell curl, overhead extension | Close-grip push-up (triceps), doorframe curl w/ band | Cable curl, cable pushdown |

For a named-emphasis goal (e.g. glutes), the extra volume comes from adding
sets/exercises within this same table for that row, not from a different
exercise selection mechanism.
