# The engine

The research in `../research/` made executable. Five modules, no dependencies, no
build step, every function pure. Run it:

```
node mo-knowledge/engine/demo.mjs            six people, their weeks, and the pair
node mo-knowledge/engine/demo.mjs --check    coverage only, nonzero exit on drift
```

**Nothing here is wired into the app.** No import from `index.html`, no edge
function, no database. It is a second opinion you can run, not a shipped feature.

## The four passes

```
1 STRUCTURE    goal + days + derived level   ->  split, day names, sets, reps, rest
2 SELECTION    + bodyweight, level, equipment ->  which exercises, and a swap for each
3 LOAD         + bodyweight, sex, then logs   ->  a starting weight
4 PROGRESSION  + logs, adherence, layoffs     ->  how the next session differs
```

That order is the whole argument. A person on day zero has a goal and a day count
and nothing else (`../research/00`), so pass 1 has to produce a plan worth doing on
its own and everything after it refines a plan that already stood up. A decision
tree that needs age to reach a branch is the failure mode. A stack where the age
pass simply does not run is the design.

| file | does |
|---|---|
| `goal-engine.mjs` | `../goals/goal-tree.json` made runnable: goal in, honest timeline and training parameters out |
| `training-age.mjs` | logs in, experience level out, with an audit trail. Nothing is asked |
| `load.mjs` | allometric cold start from bodyweight and sex, overruled by history the moment there is any |
| `plan.mjs` | the orchestrator |
| `pair.mjs` | shared rhythm, conjunctive week, and a comparison that does not humiliate |
| `demo.mjs` | prints weeks so they can be judged by reading |

## What makes it different from a normal generator

1. **The plan opens with an honest number.** "Fast" is the suffix on nearly every
   goal people search (`../research/11`), so before the plan there is a date and a
   rate, computed. Twenty pounds in six weeks becomes "six weeks is enough for
   about twelve, and here is the plan for twelve".
2. **Experience is measured, not asked.** No level dropdown. `training-age.mjs`
   reads session count, gaps, rhythm and whether load is still climbing, and
   publishes a `why` array so the answer can be audited instead of trusted.
3. **Loads scale allometrically.** Strength goes with bodyweight to about the two
   thirds power, so a 265 lb beginner gets 22 lb less on the bar than linear
   scaling would give them, which is the direction that matters.
4. **The sexes differ by pattern, not by one multiplier.** Relative lower body
   strength is far closer between sexes than upper, so squat and hinge sit higher
   against bench for women rather than everything being scaled down together.
5. **Every unknown resolves conservatively.** Wrong low costs one easy session.
   Wrong high costs a failed session and possibly the user.
6. **Days asked for are honoured, and the ones they will probably miss are made
   short.** Overriding a stated preference is the paternalism the product rule
   exists to prevent, but a plan nobody does produces nothing.
7. **The pair is an input.** Shared training days from when both actually trained,
   a week that only lands when both hit their own separate targets, and a
   comparison ladder that drops to effort rather than showing a humiliating gap.

## Bugs the first run had, kept here on purpose

Every one of these was in the first working version, and they are the same class
of bug the brief complains about in the other selector. Writing them down is
cheaper than rediscovering them.

- **A 70 lb lateral raise for a beginner.** "Lateral raise" matched the overhead
  press pattern and inherited its load ratio. Isolation is now tested first.
- **A 145 lb goblet squat.** Pattern ratios describe the barbell version. Added
  variant factors, so a goblet is 0.35 of a back squat.
- **A 450 lb goblet squat, differently.** Inferring a load from a related lift in
  the history did not scale between variants either.
- **A whole missing hinge.** Beginners got no posterior chain work at all, and the
  slot was dropped silently. Main slots now reach a level higher, and an unmatched
  slot falls back and says so in the output rather than vanishing.
- **Two shrugs standing in for a row.** The upper split asked for a
  trap-primary horizontal pull, which does not exist. This is precisely the
  "Dumbbell Shrug, Barbell Shrug, traps hit twice" failure the brief names first.
- **Push-ups for a man who wants a 225 bench.** Candidates sorted simplest first,
  so push-ups beat bench press. Now ranked by what he already lifts, then by level
  closest to his own.

## Known limits

- **Cold start loads for isolation work are the weakest numbers here.** A formula
  cannot really tell a lateral raise from a curl. They are deliberately light and
  the note says so, and one logged session replaces them.
- **The library has no beginner hinge.** Every deadlift, Romanian deadlift and hip
  thrust in `knowledge/exercise-library/` is tagged intermediate or above. That is
  defensible on technique demand and it leaves a beginner with no posterior chain,
  which is worse. Worked around here; worth raising with Jawa rather than fixing
  in her folder.
- **`PRODUCTIVE_GAP` in `pair.mjs` is a guess.** The Köhler effect needs a moderate
  ability gap and neither the research nor this code can say where the band ends.
  It is open question 7 and it is the biggest hole in the folder's main claim.
- **Sex coefficients** in `pair.mjs` are derived from two reference bench
  standards. Fine as a presentation handicap, not a measurement.
- **No nutrition, and it matters.** For every fat loss goal the training is maybe a
  fifth of the outcome. The plan says so rather than implying the workouts will do
  it.

## Why it imports Jawa's exercise library

`plan.mjs` reads `knowledge/exercise-library/` read only, and edits nothing under
`knowledge/`. Deliberate: if both runs at this problem use the same 219 exercises,
the bake-off is about the algorithm rather than about who wrote a better list.
