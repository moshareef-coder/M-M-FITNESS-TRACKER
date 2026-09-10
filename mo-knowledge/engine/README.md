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

## Bugs the second run had, all fixed

Same rule as the list above. These were found by reading the code each module's
author had just written, plus one the edge function agent hit wiring it up.

- **The sets clamp swallowed every multiplier it was there to protect.**
  `Math.max(2, Math.min(5, ...))` pinned beginners at 2 and strength
  intermediates at 5, so `setsFactor`, the priority list and calibration's 0.85
  back-off were silent no-ops in 20 of 52 goal and level combinations while the
  plan said "this week is lighter". Now the target is computed unclamped, a
  back-off is guaranteed to cost a main lift a set and a priority to earn one,
  and only then is it clamped to [2, 6].
- **Weekly volume was divided by intentions rather than by exercises.** `hits`
  counted slot groups, so a slot listing `["lats", "traps"]` bumped both and one
  exercise came out of it. Selection is now a first pass over the whole week and
  the divisor is counted off what was actually picked.
- **The last logged row became the next prescription.** One deliberately light
  day, or a set done at home with what was in the room, set the week. `weight: 0`
  counted as history too. Now: the last three sessions, nothing at or below zero,
  and a preference for rows done at a comparable rep count.
- **The same swap was offered on three days running.** Swaps were chosen and
  never registered, so they repeated and could collide with a later main pick.
  They are tracked in their own set now, which keeps them varied without letting
  an offer block a prescription.
- **`missing` never mentioned absent plans.** Logs with no plans is the common
  half-fed case: calibrate.mjs has no join to make and every verdict comes back
  unknown. It says so now.
- **Short days came out with two exercises.** The app contract is 4 to 6. A short
  day now keeps every main movement and fills back up to four with accessories,
  at two sets, in the same short minutes.
- **2 lb a week was called "a healthy pace".** Above about 267 lb the rate is
  pinned at the ceiling, so the people with the most to lose by going too fast
  were the only ones being told the top of the range was the middle of it.
- **A one day week was a two day week with a day cut off.** `splitFor(1)` sliced
  the pair down to one and left somebody with "Full body A" and no B anywhere.
- **`resolveGoal` could not say which parameter set ran.** It returned
  `child: undefined` when it fell to `_default`, so nothing downstream could tell
  a deliberate default from a typo. It returns `childUsed` now, and the adapter
  puts it in `meta`.
- **`daysAsked` was inferred when the person had already answered.** The widened
  payload carries `challenge_target`, a number they set themselves, and it now
  wins over the gym-days-so-far guess.
- **The bake-off's no-hinge metric punished split programmes.** It counted upper
  and push days, which correctly have no hinge. Only lower days can fail it now,
  ours judged by day name and hers, which carry no names, by content, and the
  rule is printed under the table.
- **The profile's preferred focus was ignored.** The model this replaces honoured
  `payload.focus`, and the adapter handed back whatever the rotation had queued.
  A stated focus now picks the matching day, the rotation decides which when two
  match, and `meta.focusHonoured` says whether it was used.
- **The demo's own fake logs were the least believable numbers in the printout.**
  `history()` gave 135 lb to a bench press and 185 lb to everything else, so a
  145 lb woman logged a 205 lb goblet squat and the pattern fallback turned it
  into an 890 lb leg press. The engine was right to believe the log. The log was
  the lie. Weights are per lift now, in demo.mjs and bakeoff.mjs both.

## Wave 1 findings: three things Jawa's selector does that ours does not

From reading `bakeoff.mjs` output side by side. None of these is done here yet.
They are listed as **next**, not as shipped.

1. **Weekly volume threaded across the days inside one call.** `buildWeekPlan`
   carries a running `weeklyVolumeByCategory` from day to day and re-ranks the
   most under-trained groups before choosing the next day's work. Ours divides a
   fixed weekly target by how often a group is hit and never looks at what the
   earlier days actually spent. Hers is the better shape: the ledger is real
   rather than assumed.
2. **A scored swap, ranked by muscle overlap.** Her `suggestSwaps` ranks
   candidates by secondary-muscle overlap first and then by how close the level
   is to the original, so a swap is the nearest stimulus rather than the next row
   in the list. Ours takes the next unused candidate in a ranked pool, which is
   how a swap can be a materially easier or harder movement without saying so.
3. **A time budget that decides the exercise count.** She works from about seven
   minutes an exercise, and the session length sets how many categories and how
   many movements per category fit. Ours fixes the count in the slot table and
   reports the minutes afterwards, which is the same arithmetic run backwards and
   is why a short day needed a special case at all.

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

## Adapter

`adapter.mjs` is the only file in here that knows the app exists. The engine
builds a week; index.html asks for one day and consumes exactly this:

```
{ focus: "Push day", exercises: [{ name, sets, reps, targetWeight, note }] }
```

Four exports, and the edge function calls the last one.

| export | does |
|---|---|
| `mapGoal({ goal, goal_detail })` | five stored goal strings plus free text, into a bubble, a child, and any pounds or date that were really in the sentence |
| `nextDayIndex(plan, { logs, plans, today })` | where in the rotation this person is, from the last `ai_workouts.focus` we wrote, or from log names when there is no plan row |
| `toWorkout(plan, dayIndex)` | one day of `plan.week` in the app's shape |
| `generateFromPayload(payload)` | the whole path: `{ workout, honest, meta }` |

Four things worth knowing before editing it.

**The alias table is hand written.** `ALIASES` mirrors the `aliases` arrays in
`../goals/goal-tree.json`, because reading the JSON needs a file read and this
module has to run in Deno. Two files describing the same thing drift, which is
why `checkTreeCoverage` exists for `GOAL_PARAMS`; the equivalent check over
`ALIASES` is a follow up and is marked as one in the file.

**The button loses to the sentence, but only where it has to.** The five goals
cannot express "first pull-up", "train for Hyrox", "after baby" or "more
energy", so a confident match on one of those four bubbles overrules whichever
button they pressed. The other five bubbles are reachable by button, so a
cross-bubble match there keeps the bubble and uses `THEME_CHILD` to find the
nearest thing that bubble can say. "Abs" under Lose weight is belly fat, under
Recomp it is abs, and under Get stronger it is nothing, which is the honest
answer rather than a forced one.

**A date is only a date when there is one in the sentence.** "Before my wedding"
sets no `byDate`. Inventing one would turn the honest timeline, which is the
whole argument of `goal-engine.mjs`, into a fabricated promise.

**The old payload cannot carry a training age and says so.** `history` is a
flattened map of personal bests with no dates, so `generateFromPayload`
synthesizes one row per lift dated three days back. Loads come out right;
`meta.confidence` comes back `"none"` and `meta.missing` names what is absent.
Pass real `logs` and that entry disappears.

Two things it deliberately does not do: it does not pad a day up to six
exercises, and it never returns the same day twice in a row when the week has
more than one. It does hold a floor of three, because the app has no answer for
a two exercise card, and it fills from the next day of that person's own week
rather than inventing a movement. `plan.mjs` floors a short day at four, so the
floor should never fire.
