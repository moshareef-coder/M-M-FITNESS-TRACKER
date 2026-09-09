# Bodyweight

The input we get earliest and most often, and the one most apps waste on a BMI readout.

## What it genuinely determines

### 1. Whether a bodyweight exercise is an exercise at all

The most actionable use of weight, and the one routinely missed. A pull-up is not one
movement with one difficulty. For a 140 lb trained person it is a working set. For a
265 lb beginner it is not a movement they can perform once, so prescribing "3 x 8
pull-ups" is not a hard workout, it is a failed session and probably a lost user.

The same holds, less severely, for push-ups, dips, lunges, and every plyometric.

This does not mean "heavy people should not do bodyweight work". It means the
**entry point on a progression ladder must be a function of bodyweight**, and the
`calisthenics.mjs` progression chains already in the library are the right structure to
hang that on. Nobody has connected the two.

*Confidence: high. This is mechanics, not physiology.*

### 2. Starting load, but not linearly

Absolute strength rises with bodyweight. Strength **per pound** falls. A 250 lb person
is stronger than a 150 lb person in absolute terms and weaker relative to their size.

The practical scaling is roughly with bodyweight to the power of two thirds, which is the
surface-area-to-volume result that underlies every serious powerlifting scoring formula
(Wilks, DOTS, IPF Goodlift all exist to correct for exactly this). So if we hold a
strength standard for a reference bodyweight and want to scale a cold-start load:

```
estimated ≈ standard × (theirWeight / referenceWeight) ^ 0.67
```

not `× (theirWeight / referenceWeight)`. Linear scaling overshoots heavy beginners,
which is the direction that hurts, and undershoots light ones, which merely wastes a
session.

*Confidence: high on the two-thirds exponent as the right shape. Medium on using it for
cold-start loads, because the powerlifting formulas were fitted on competitive lifters,
not on beginners. Treat it as better than linear rather than as correct.*

### 3. Energy cost of everything

Already handled. `calorie-math.mjs` multiplies MET values by bodyweight, which is the
standard method and is fine. Nothing to add.

### 4. Joint loading, which is an exercise-selection input, not a volume input

High bodyweight plus untrained plus impact is the combination that produces knee and
ankle problems and, more importantly for us, produces pain in week one and a deleted app
in week two.

The response is **selection, not reduction**. Not "do less". Rather: early blocks favour
supported and machine variants, seated and lying positions, and low-impact conditioning
(bike, incline walk, rower) over running and jumping. The volume target does not need to
change. The exercises do.

*Confidence: high as a practical rule and as the conventional clinical recommendation.
Lower as a precise claim about injury rates, which I would not assert a number for.*

### 5. Weight trend, which we are currently ignoring entirely

We have a time series of bodyweight in `fit_entries` and the algorithm reads only the
most recent value. The trend is the single best available feedback signal on whether the
plan is working, and it is free.

A weight-loss plan where weight has not moved in three weeks is information. So is one
where it has dropped fast enough to be costing muscle. Right now the algorithm cannot
respond to either, because it never looks.

Worth saying plainly: this belongs to nutrition more than to training, and we do not do
nutrition. But it should at minimum change what the app *says*, and possibly the cardio
volume.

*Confidence: high that the signal is there and unused. The right response to it is an
open question.*

## What bodyweight does not determine

- **Weekly sets per muscle.** No good reason to think a heavier person needs more or
  fewer hard sets.
- **Rep ranges.** No.
- **Goal suitability.** A heavy beginner who wants to get stronger should get a strength
  program, not be quietly redirected to weight loss because their BMI says so. This is
  the most common way apps insult people.

## Height, while we are here

We collect `height_in` and there is very little to do with it beyond BMI and the BMR
equations in `tdee.mjs`, where it belongs and is already used.

It has one real training use: limb length changes what a "good" range of motion looks
like and makes certain exercises awkward (long femurs and back squats, long arms and
conventional deadlifts). That is a coaching-level nuance we are nowhere near able to act
on, and pretending otherwise would be inventing precision. Noted and parked.
