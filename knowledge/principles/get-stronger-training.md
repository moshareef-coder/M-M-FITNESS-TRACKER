# Get stronger training

Covers the "get stronger" category from `real-goals.md` — general phrasing and a
numeric/bodyweight-ratio target ("bench 225," "squat 1.5x bodyweight") are the same
underlying plan with an optional realism check, per that file.

## The core mechanic: weight moves, reps don't

Unlike hypertrophy (which varies rep range 6-15 and leans on volume), strength
programming works by fixing the rep target and progressing load against it —
a double/linear progression model, the same structure StrongLifts, Starting
Strength, and GreySkull LP all use for novices:

- Rep target stays locked within `REP_RANGES.strength` (3-6 reps, coded as a fixed
  midpoint of 5).
- Hit the target → add weight next session (`+5 lb` for barbell/machine, `+2.5 lb`
  for cable/dumbbell, per `incrementForEquipment()`).
- Miss the target → hold at the same weight, don't push into a heavier number
  that was already failed. This is already correctly implemented in
  `progressiveOverload()`.

## Rest periods needed a real fix, not just documentation

A systematic review (Grgic et al. 2017, *Sports Medicine*, PMID 28755103) found
that rest intervals under 60 seconds measurably reduce the load a lifter can
maintain across sets, and that 3-5 minute rest between heavy sets (1-5 reps,
80%+ of 1RM) produces greater strength gains than shorter rest — consistent
across every source checked. This is a nervous-system and ATP-recovery
constraint, not a preference: heavy compound lifts (squat, deadlift, bench,
overhead press) tax the CNS in a way that muscular (not just metabolic)
recovery requires real time for.

The code previously gave strength sessions the same 90-second rest as
hypertrophy sessions — correct for hypertrophy (2-3 minutes is the guidance
there), roughly half of what strength research actually calls for. Fixed to
240 seconds (4 minutes, the middle of the 3-5 minute range) for strength
specifically.

## Full-body coverage, not a body-part split

Novice and early-intermediate strength programs are conventionally full-body,
not split — StrongLifts and Starting Strength both train squat (or its
alternation) essentially every session, 3x/week, precisely because frequent
practice of the main compound patterns is what drives a beginner's rapid
early progress. This isn't a stretch applied to fit our existing circuit
infrastructure — it's the actual standard novice template, and it happens to
share the same "full-body, one exercise per movement pattern" shape our
circuit fix already established for lose-weight. Reused directly rather than
building a second parallel mechanism.

## Sex and anthropometry

Per `sex-and-anthropometry.md`: no default load or volume scaling by sex —
neither hypertrophy nor lower-body strength gains differ meaningfully by sex
in the research, and relative upper-body strength gains actually favor women
early in training. Stance-width and deadlift-variant (sumo vs. conventional)
suggestions from limb-proportion data apply here exactly as described there.

## Realism checking against a numeric target

When someone states a specific number (real-goals.md Cluster 3), it should
be checked against real strength-standard data rather than a single rule of
thumb — a 180 lb male beginner benches roughly 127 lb, novice 169,
intermediate 220 (StrengthLevel, 48.7M logged lifts, referenced in
`real-goals.md`); bodyweight-multiple targets (1.5x squat, 2x deadlift) are
advanced-level markers, typically 5-6 years in, not year-one goals. This
should compute from the person's own stated current lift and bodyweight,
not assume a generic beginner starting point.

## What linear progression doesn't handle — flagged, not yet fixed

`shouldDeload()` triggers on 2+ consecutive missed-rep sessions or an
8-week floor (`periodization-deloads.md`), which is reasonable as a general
mechanism. But novice linear progression specifically has a well-established
convention that's narrower than a general deload: StrongLifts and Starting
Strength both treat **three consecutive failures at the same weight** as a
signal to *reset* — cut the weight roughly 10% and resume progression from
there — rather than just taking a lighter week and returning to the same
number. A temporary deload (lighter week, same eventual target) and a reset
(permanently lower the number, rebuild from there) are different responses
to a linear-progression stall specifically, and the current code only
implements the former. Worth a follow-up once the immediate fixes here are
in — noting it here rather than silently deciding it's out of scope.

## Equipment variants

Same movement-pattern skeleton as the lose-weight circuit fix (squat, hinge,
horizontal push, horizontal pull, core), but exercise selection should favor
free-weight compounds over machines wherever available — machines are a fine
substitute when that's genuinely all someone has, but strength programming
specifically benefits from the stabilizer-muscle demand and skill practice
that only loaded free-weight compounds provide, which is part of why the
named-lift cold-start table (`COLD_START_MULTIPLIER`) is barbell-specific in
the first place.

| Pattern | Full gym | Dumbbells only | Bodyweight only | Machine-only |
|---|---|---|---|---|
| Squat | Barbell back squat | Goblet squat (heavy) | Pistol squat progression | Leg press (heavy) |
| Hinge | Barbell deadlift | Heavy dumbbell RDL | Nordic curl progression | Leg curl + hip thrust machine |
| Horizontal push | Barbell bench press | Heavy dumbbell press | Weighted/deficit push-up | Chest press machine (heavy) |
| Horizontal pull | Barbell row | Heavy dumbbell row | Weighted pull-up/inverted row | Seated row machine (heavy) |
| Core | Weighted plank, ab wheel | Heavy weighted carry | Dragon flag progression | Cable core work |

Bodyweight-only strength work runs into the same ceiling equipment-substitution.md
already established: reps alone stop being a strength stimulus past a point,
so leverage/unilateral/weighted-vest progression matters even more here than
for other goals, since strength specifically wants low reps at high relative
intensity — a bodyweight-only trainee genuinely needs a harder variation, not
just more reps of the same one, to keep progressing.
