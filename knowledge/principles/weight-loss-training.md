# Weight-loss training: what a cross-section of trainers agree on

Researched 2026-09-01 against the publicly known training philosophies of four fitness
creators with genuinely different styles: Kayla Itsines (circuit/resistance + LISS), Joe Wicks
(HIIT popularizer), Lilly Sabri (physiotherapist, Pilates/low-impact), James Smith (energy
balance, no-nonsense PT). A fifth name the user asked about, Kevin Curry (Fit Men Cook), is
excluded here on purpose -- his public brand is meal prep and nutrition, not a training
methodology, so there was nothing training-specific to extract. This is our own synthesis of
their *publicly documented general approach* (interviews, articles, free content), not a copy
of anyone's paid program -- see `../sources.md` for the same standard that applies everywhere
else in this folder.

## What they actually agree on

Four people with very different brands, and every one of them lands on the same handful of
points for the fitness side of weight loss:

1. **Resistance + cardio combined, not either alone.** Itsines pairs circuit-style resistance
   work with LISS cardio explicitly. Wicks' HIIT sessions blend both within one format. Smith's
   energy-balance framing treats training as one lever, not the whole system, and still points
   people toward resistance work. This matches [[volume-landmarks]] and the training-mix floor
   already built into this app (see `../formulas/training-mix.mjs`) -- it is not a new idea, it
   is confirmation the existing floor rule is pointed the right direction.
2. **Short, low-equipment-barrier sessions win on adherence.** Wicks built his entire public
   reputation on 20-30 minute, minimal-equipment HIIT specifically because that removes the
   biggest real-world barrier to consistency. Itsines' BBG circuits run in a similar range. The
   lesson isn't "short is better," it's that a program only works if someone actually does it,
   which is a real, load-bearing product constraint, not just a preference to accommodate.
3. **Circuit structure is a distinct, useful mode, not just "weight training but faster."**
   Itsines' format specifically is short exercise blocks (roughly 4 exercises, ~7 min per
   circuit) with minimal rest between exercises, run through twice. That is a genuinely
   different session shape from traditional straight-sets-with-full-rest training, and it is
   the shape most associated with fat-loss-oriented resistance work across the people
   researched here.
4. **Low-impact is a legitimate primary path, not a fallback.** Sabri's entire public position
   is built on being a physiotherapist first -- her approach is explicitly for people who need
   or want joint-friendly training, not a lesser option for people who "can't handle" more
   intense formats. `flow` (yoga/Pilates) in the training mix should be treated as a real
   equal option for a weight-loss goal, especially when someone's notes mention joint issues,
   not a minor category that only shows up by leftover allocation.
5. **Every one of them explicitly argues against extreme intensity or an aggressive deficit.**
   This is the strongest, most consistent signal across all four: Wicks moved his own public
   messaging away from pure HIIT toward balance and sustainability over time. Sabri's stated
   position is explicitly anti-extreme. Smith is publicly associated with a 15-20% deficit
   below TDEE as the sustainable range, not a crash-diet number. **This directly caught a real
   bug in this app's own math** -- `estimateGoalTimeline()` was computing deficits up to 37% of
   TDEE for some profiles with no cap, landing under commonly-cited safe daily-calorie floors.
   Fixed 2026-09-01: capped at 20% of TDEE and a 1,200 kcal/day floor, see
   `../formulas/goal-timeline.mjs`.

## How this should shape a generated program for a weight-loss goal

- Prefer circuit-style structure for weight-training days on a "lose" goal specifically:
  shorter rest between exercises than a strength- or hypertrophy-focused day would use, not a
  different exercise list.
- Do not let session length or equipment barrier creep up for this goal -- adherence is the
  active constraint being optimized for here, which is a real, cited reason to keep sessions
  short and low-equipment, not just a nice-to-have.
- Treat `flow` as a genuine primary recommendation, not just whatever is left over after
  resistance and cardio are allocated, especially when the person's notes mention joint pain,
  a bad knee, or similar -- this is Sabri's whole public positioning, and it is medically
  sound, not a lesser substitute.
- Never recommend a deficit or a pace that the math itself would not call sustainable. The cap
  described above is not a suggestion to relax later for "better results" -- the unanimous
  point across every trainer researched here is that the aggressive version is the one that
  does not work long-term.

## Starting point, reps, and sets by experience tier

Cross-checked against `experience-tiers.md`, `volume-landmarks.md`, and what's already coded
in `exercise-selector.mjs`.

- **Rep/set scheme**: already correctly coded — `REP_RANGES.general = [8, 12]` (≈10 reps),
  30-second rest (`sessionStyleForGoal` → "circuit"), 3 sets/exercise for beginner and
  intermediate, 4 for advanced. This matches the circuit-style, moderate-rep structure the
  cross-trainer research above converges on. Nothing to change here.
- **Weekly muscle-group allocation**: `pickFocusCategories()` already ranks the most
  under-trained groups first each session, which naturally produces full-body rotation across
  the week — the shape most associated with fat-loss-oriented resistance training in the
  research above (Itsines, Wicks). `weeklyVolumeTarget()` already scales to
  near-MEV/low-MAV for beginners per `experience-tiers.md`. Nothing to change here either.
- **Cold-start load, barbell lifts**: `COLD_START_MULTIPLIER` already covers squat, bench,
  deadlift, overhead press, and row with bodyweight-ratio starting points by tier. Per
  `sex-and-anthropometry.md`, this doesn't need a separate male/female multiplier — hypertrophy
  and lower-body strength response don't differ meaningfully by sex, and relative upper-body
  strength gains actually favor women early on, so a lower starting multiplier for women isn't
  supported by the evidence.
- **Cold-start load, bodyweight movements — a real gap.** `COLD_START_MULTIPLIER` only covers
  barbell lifts; there's no equivalent starting point for push-ups, bodyweight squats, etc.
  Per `equipment-substitution.md`, bodyweight overload comes from leverage, not load, so a
  weight-multiplier table is the wrong shape for it anyway. What's needed instead is a starting
  *rung* on a difficulty ladder (e.g. "can't do 5 clean standard push-ups → start on an incline"),
  the same mechanic the skill-ladder categories in `real-goals.md` already use. Worth building
  once, shared across every goal that can land someone on bodyweight-only equipment, not just
  this one.

## Progression across weeks

- `progressiveOverload()` already implements the right rule from `progressive-overload.md`: hit
  target reps → add load next time; missed reps → hold, don't push a lift just failed.
- **Bodyweight progression — another real gap.** `incrementForEquipment("bodyweight")` currently
  returns 0, meaning bodyweight exercises never progress in the generated plan at all. Per
  `equipment-substitution.md`, bodyweight progression should move through leverage changes,
  added reps up to a point, tempo/isometric holds, and unilateral variations instead of load —
  right now the algorithm has no mechanism for any of that, so a bodyweight-only trainee's plan
  would currently stall indefinitely on the same movement and difficulty.
- Deload logic (`periodization-deloads.md`) applies to this goal exactly as it does to any
  other — fatigue accumulates on a circuit-style fat-loss program the same way it does on a
  straight-sets strength program, and rising RPE or missed reps should trigger the same
  lighter-week response regardless of goal.

## Equipment variants for a circuit day

Same movement-pattern skeleton (squat, hinge, horizontal push, horizontal pull, core), two
rounds, ~10 reps, 30-second rest between exercises — only the equipment tier changes which
exercise fills each slot, per `equipment-substitution.md`:

| Pattern | Full gym | Dumbbells only | Bodyweight only | Machine-only |
|---|---|---|---|---|
| Squat | Barbell back squat | Goblet squat | Bodyweight squat / split squat | Leg press |
| Hinge | Barbell deadlift or RDL | Dumbbell RDL | Glute bridge / single-leg hip thrust | Machine hip thrust / leg curl |
| Horizontal push | Barbell or dumbbell bench press | Dumbbell floor press | Push-up (incline if needed) | Chest press machine |
| Horizontal pull | Barbell row | Dumbbell row | Inverted row (table/low bar) or band row | Seated cable/machine row |
| Core | Weighted plank / cable chop | Dumbbell deadbug/ carry | Plank / dead bug / hollow hold | Cable or machine crunch |

This is a representative skeleton, not the exercise library itself — actual selection still
goes through `selectExercisesForCategory()` filtering by level and equipment, same as any
other goal.
