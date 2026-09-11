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
| `plateau-response.mjs` | a stalled lift in, one answer out: rotate, change the reps, deload that lift, cut the week, or wait |
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

## Round three, fixed

Seven that were found, written down and then left sitting, the last two of them
found while checking the other five. Same rule as the two lists above: the fix is
only worth as much as the sentence saying what was wrong.

- **Push-ups for a beginner who wants to get stronger, again.** The level term
  prefers the level closest to the user, a push-up is tagged beginner and a bench
  press intermediate, so "Get stronger" opened with 3 reps of a push-up. A main
  slot on a strength goal now ranks by how far a movement can be loaded, because
  no amount of progression turns a push-up into a 225 bench. A term, not a
  filter, and every other emphasis keeps the conservative tie break it had. The
  180 lb beginner asking for four days now opens on a Machine Chest Press and no
  main slot anywhere in his week is bodyweight.
- **A non-priority group out-setting a priority one on the same card.** The 1.4x
  went on the weekly target and was then divided by how often the group is hit,
  so a group trained once a week beat a priority group trained three times:
  Russian Twist 6 against a priority Step-Up 4. The guarantee is taken per
  session now, and no lift without the flag carries more sets than the lowest
  priority lift on its day. Checked across 3816 days: 366 of them carry a
  priority exercise and none of the 366 has a neighbour out-setting it.
- **The [2, 6] clamp still swallowing a back-off.** Round two moved the clamp and
  left the order alone, so a group hit once or twice at intermediate rounded past
  the ceiling both with and without the cut and 2 of 11 slots moved on a three
  lift stall. The cut is subtracted after the clamp now, so a back-off or a
  volume cut always costs every main lift it touches a set, floor 2. Measured
  again on two identical people whose only difference is a third stalled lift:
  8 main lifts out of 8, every one of them down a set.
- **Weekly volume threaded across the days, Wave 1 finding 1.** The week now
  totals its own hard sets per muscle group, trims accessories on the LATER days
  where a group is more than 2 sets over its target, and names the groups that
  are more than 2 sets under it with room to hold more. `weeklyVolume` is the
  ledger, one `{ sets, target }` per group, and `volumeNotes` holds every
  correction beside it rather than inside it, so a caller can iterate the ledger
  without having to know which keys are muscles and which are bookkeeping.
  demo.mjs prints both, because a total nobody can see is a total nobody checks.
- **`P.sessionMin` reached the display and nothing else, Wave 1 finding 3.** A
  strength day of six lifts at six sets and three minutes of rest printed
  "~60 min" over something closer to two hours. Every day carries
  `estimatedMinutes` now, computed from the sets, a 30 second set and the rest
  intervals already prescribed, and a day more than 15% over its budget comes
  down until it fits. Two levers, gentlest first, and a main lift is never
  either of them.
- **The time trim had only the blunt lever, and it ran out of road.** Dropping
  whole accessories stops at four exercises, so the demo's intermediate Lower
  body A sat at 73 minutes against a 60 minute budget with nothing left it was
  allowed to drop, while carrying a Single-Leg Calf Raise at 6 sets. Taking a set
  off a tail accessory is a smaller thing to do to a session than taking the
  movement away, so sets now come down to the floor of two before any movement
  goes, non-priority accessories only so the per session guarantee above cannot
  be undone from behind. That day is 68 minutes now and no day in the six weeks
  is over its tolerance.
- **A group could sit over its target with nothing saying why.** The trim moves
  accessories and never goes below two sets, so an excess made entirely of main
  work, or of accessories already on the floor, came out of the loop untouched
  and the ledger showed a number over target with no line anywhere explaining it.
  Across 1040 goal, day count and history combinations, 85 plans did this: a five
  day return-to-training week hits chest and lats four times at a 0.6 sets
  factor, which asks for 4.8 sets and cannot buy fewer than 8. Neither wall is a
  bug to patch here, so `volumeNotes.over` reports it and names which wall it
  hit, the same way the under side already did. The same argument applies to the
  clock: `volumeNotes.overBudget` names a day that is still long after both time
  levers, and the note reaches `dayNotes`.

## Wave 1 findings: three things Jawa's selector does that ours does not

From reading `bakeoff.mjs` output side by side. All three are done now, 2 in the
second run and 1 and 3 in the third; the descriptions stay because what her
selector does better is worth keeping on the record after it has been copied.

1. **Weekly volume threaded across the days inside one call.** `buildWeekPlan`
   carries a running `weeklyVolumeByCategory` from day to day and re-ranks the
   most under-trained groups before choosing the next day's work. Ours divides a
   fixed weekly target by how often a group is hit and never looks at what the
   earlier days actually spent. Hers is the better shape: the ledger is real
   rather than assumed. **Done**, see Round three below.
2. **A scored swap, ranked by muscle overlap.** Her `suggestSwaps` ranks
   candidates by secondary-muscle overlap first and then by how close the level
   is to the original, so a swap is the nearest stimulus rather than the next row
   in the list. Ours takes the next unused candidate in a ranked pool, which is
   how a swap can be a materially easier or harder movement without saying so. **Done**, see Scored alternatives below.
3. **A time budget that decides the exercise count.** She works from about seven
   minutes an exercise, and the session length sets how many categories and how
   many movements per category fit. Ours fixes the count in the slot table and
   reports the minutes afterwards, which is the same arithmetic run backwards and
   is why a short day needed a special case at all. **Done**, see Round three
   below, though ours still runs it backwards on purpose: the slot table is the
   argument, so the minutes trim the tail rather than choosing the movements.

## A stall gets an answer (`plateau-response.mjs`)

`training-age.mjs` has always returned Jawa's `detectPlateau` on every plan and
nothing read it, so the engine could name the lift that had not moved in six
weeks and then hand back the same week regardless (PLAN-2, W4). It now has an
answer. A plateau is where people quit, so this is the most expensive signal to
leave unread in the folder.

**It is not the same thing as `calibrate.mjs` and the two must never both fire on
one lift.** calibrate asks "how did the last session go", per exercise, across
three sessions, and moves a load by at most five percent. A plateau is weeks of a
lift going nowhere while nothing goes wrong in any single session: every set
finished, every rep landed, same 185 lb since July. Different question, different
answer, and where they meet one of them stands down.

The decision, per stalled lift, top to bottom, first match wins:

| when | action | why that one |
|---|---|---|
| flat under 4 weeks | `wait` | a fortnight is a fortnight. research/09: a plan that reacts to noise teaches people to distrust every change it makes |
| beginner, under 8 weeks flat or under 6 sessions of the lift | `wait` | a beginner is on linear progression by definition. Same argument this file already makes about withholding a scheduled deload from a beginner |
| calibrate says `too-easy` | `wait` | calibrate is already adding load next session. The stall is breaking itself and a second response is the same fix twice |
| calibrate says `too-heavy` | `deload-lift` | they are grinding. `periodization-deloads.md` names missed reps on a previously solid lift as a trigger, and one week as enough. Never also rotated: the load is already coming down |
| strength goal, under 6 weeks flat | `rep-range` | `progressive-overload.md` counts more reps at the same weight as overload, and it is the cheapest lever that does not take away the lift they came here for |
| anything else | `rotate` | the same file: chasing 5 lb a week runs out of road, and rotating which lever moves is what keeps a plan working |
| 3 or more lifts acting at once | `volume-cut`, in `summary` | that is fatigue rather than three exercise problems. Systemic, so it never appears on one exercise |

Four things that took a second pass to get right.

**A rotation has to reach selection or it is only a sentence.** So the pass 4
call sits above pass 2 and hands the rotated names to `candidates()` as an
exclusion, the same shape `preferences.mjs` uses for a hard avoid, and with the
same rule: it never empties a slot. When excluding a lift would leave a slot with
nothing, the lift stays, `applyRotateFallback` turns that response into a
`rep-range` instead, and the note says so. A note claiming a lift is gone while
it is still on the card is worse than no note.

**The volume cut goes down the lever that already exists.** It sets the same
`backOff` flag calibration's back-off sets, rather than adding a second 0.85
beside it, and `planPlateauResponse` will not return `volume-cut` at all when
calibration has already called the week a back-off. Two cuts down one lever is a
deload nobody prescribed.

**When the cut fires, the per lift answers stand down for the week.** Rotating
three lifts during a lighter week hands somebody a week they do not recognise and
leaves nothing attributable afterwards. `periodization-deloads.md` describes a
deload as the same exercises with fewer sets, and `progressive-overload.md` says
pick one lever. The diagnosis survives in each response's `detail`; only the
action waits, and the summary speaks for the week.

**`wait` has three different sentences.** "Too soon to tell", "you are a beginner
and this is attendance" and "you are about to add weight anyway" are different
news, and a wait note that guesses wrong is the one place this could sound like
it is not paying attention.

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
- **A volume cut can still be a no-op on a lift already at two sets.** The clamp
  half of this is fixed: the 0.85 is subtracted after [2, 6] rather than folded
  in before it, so a back-off costs every main lift it touches a set. What
  remains is the floor. Two sets is the smallest thing worth calling a
  prescription, so a lift already there gives up nothing, and the plateau note
  saying "the sets come down" is speaking for the week rather than for that one
  lift. That is a real limit rather than an ordering accident, which is the
  difference between this entry and the one it replaced.
- **A weekly target can be unreachable in both directions and the plan can only
  say so.** The smallest prescription is two sets and the trim never touches a
  main movement, so a split that hits a group four times cannot spend fewer than
  8 sets on it whatever the target says, and a group with no accessory slot
  cannot be topped up without inventing a movement the slot table exists to
  prevent. `volumeNotes.over` and `volumeNotes.under` report both. Acting on
  either one means changing the split, which is a larger decision than a ledger
  should be allowed to make on its own.
- **A day of four main lifts at long rests will not fit a short budget.** An
  advanced lifter who picks the no-time goal gets four main movements at six
  sets, which is about 47 minutes against the 25 they asked for, and both time
  levers stop before touching a main. 90 days out of 3816 land here.
  `volumeNotes.overBudget` names them and the sentence reaches `dayNotes`, so
  the number is a statement rather than a discrepancy. Shaving a main's sets
  would fix the clock by pulling the back-off lever, which belongs to
  calibration and the plateau response, and two hands on one lever is the bug
  this folder already has a section about.
- **`detectPlateau` can rarely report a stall shorter than its own window.**
  `weeksFlat` is measured from the first day the all time best was set, and a lift
  whose best sits inside the six week window counts as climbing, so a 4 or 5 week
  stall only appears on a lift newer than the window. In practice `rotate` is the
  common answer and `rep-range` fires mostly for recently introduced lifts.
  `detectPlateau` is Jawa's and was not touched.
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

## Focus

`focus.mjs` is the body picker's selection, translated into something the plan
can act on. The picker works at the level of a muscle piece and a head, because
that is what you can point at on a figure; `plan.mjs` has only ever thought in
the app's fourteen muscle groups, and it already has the lever this needs.
`P.priority` earns a group 1.4x its weekly sets through `setsFor`. A user chosen
focus is that same mechanism with a different source, so nothing new was
invented for it: `normalizeFocus` flattens pieces and heads down to groups,
`mergePriority` decides whose list wins, and `buildPlan` takes the result as
`priorityOverride`. Null there means nobody merged anything and the goal decides,
which is every caller that existed before this landed.

**Stated and revealed are two different signals, and only one of them is here
yet.** Stated is the tap, the goal bubble, the number in the picker: high trust
on the day, decaying afterwards. Revealed is what somebody actually does, which
exercises they swap away from, which days they skip, which lifts have stopped
moving: low trust on day one, and it rises with every session. Where the two
disagree the measured one is right, because somebody who picked glutes in
January and has not hip thrusted since February has told us something newer than
the tap.

Today `mergePriority` puts the tap first and the goal's own priority second, and
caps the combination at five, because the 1.4x has to come out of a fixed weekly
volume and once most of the body is on the list the plan is the same plan with a
longer explanation. A single tap is capped at four for the same reason: focusing
on everything is focusing on nothing.

The `revealed` argument is where W3's output lands, shaped
`{ avoid: [], prefer: [] }` and null until it ships. When it does, an `avoid`
entry drops the matching group out of the user's focus and says so in `why`. It
never touches the goal's own priority: overruling the goal from a swap count is
a larger claim than a swap count can carry. `prefer` is deliberately read by
nobody yet.

`focusFreshness` reports rather than acts. Past 60 days the choice comes back
`stale: true` and `meta.focus.stale` carries it to the app, which can ask again.
Nothing in the engine discounts a stale focus, because the honest thing to do
with an old answer is to ask for a new one, not to quietly weight the old one
down. That decision belongs with W3, which will have the measurement to make it.

`meta.focus` is `{ requested, applied, why, stale }`: what came out of the
profile, what really ended up prioritised after the merge and the cap, the plain
sentences explaining it, and whether the choice is old. The gap between
`requested` and `applied` is the interesting field, and it is the first question
support gets when somebody says their week did not change.

## Scored alternatives

`alternatives.mjs` ranks substitutes for an exercise, and `plan.mjs` uses it to
choose the swap. The approach came from reading Jawa's `findAlternatives` in
`knowledge/formulas/exercise-selector.mjs`, which was Wave 1 finding 2 above:
she ranks by secondary muscle overlap and then by level distance, so her swap is
the nearest stimulus. Ours took the next unused row of a pool ranked for
choosing a MAIN lift, which is a different question, and is how a swap could
come back materially easier or harder than the lift it replaced without ever
saying so. Nothing under `knowledge/` was edited; it was read.

The rule, in descending authority, and every term bounded by its own weight so
that the order of the terms IS their authority:

| term | weight | note |
|---|---|---|
| same primary muscle group | filter | not a score. An alternative that does not train the thing the slot exists for is a different exercise |
| secondary muscle coverage | 0 to +3 | `shared / the original's secondary count` |
| same movement pattern | +2 | via `patternFor` |
| level distance from the USER | -1 per step | plus another -1 if it is harder than they are |
| same equipment as the original | +0.5 | the load carries over |
| equipment list, when given | filter | bodyweight always allowed: they still own the floor |

Three choices worth defending.

**Coverage rather than a raw overlap count.** A count is unbounded, and unbounded
it beat everything else put together. Walking Lunge shares two secondary muscles
with Barbell Back Squat and Goblet Squat shares one, so counting put a *lunge*
above a goblet squat as the swap for a back squat, which is precisely the
"materially different movement" failure this file exists to fix. Coverage caps
the term at 3 and the pattern bonus then decides that case correctly. Jaccard was
the other option and was rejected for penalising an exercise for hitting more
muscles than the original, which is not a reason to reject a substitute.

**Level distance is measured from the user, not from the original.** Jawa
measures from the original. The original was already chosen against the user's
level, and the failure that costs something is handing somebody a movement above
their technique, so the distance is to the person and it is asymmetric: harder
than you costs an extra point, which makes every tie break toward the easier
option. research/05's conservative rule, applied to swaps.

**Movement pattern is scored, which is ours rather than hers.** A barbell row
and a lat pulldown share every muscle in the library's description of them and
are not interchangeable. `patternFor` already existed for load ratios and it
answers this too.

Fourteen exercise names exist in more than one training (`Push-Up` and `Pull-Up`
are in weight-training and calisthenics both, `Plank` is in three), so a pool
built across libraries hands the same movement back twice and a list of three
alternatives could have shown `Push-Up` twice. Deduplicated by name, keeping the
highest scoring copy, which is the one described most fully.

Sample, for an intermediate lifter with everything available:

```
Barbell Row          ->  Pendlay Row            Same movement, same supporting muscles
                         T-Bar Row              Same movement, same supporting muscles
                         Chest-Supported Row    Easier version of the same movement, no barbell needed

Barbell Bench Press  ->  Dip                    Same movement, same supporting muscles, no equipment needed
                         Dumbbell Bench Press   Easier version of the same movement, no barbell needed
                         Incline Push-Up        Easier version of the same movement, no equipment needed

  ...bodyweight only ->  Dip                    Same movement, same supporting muscles, no equipment needed
                         Incline Push-Up        Easier version of the same movement, no equipment needed
                         Push-Up                Easier version of the same movement, no equipment needed

Barbell Back Squat   ->  Bulgarian Split Squat  Same movement, same supporting muscles, no barbell needed
                         Hack Squat             Same movement, same supporting muscles, no barbell needed
                         Leg Press              Easier version of the same movement, no barbell needed
```

### The swap now reaches the app

It did not before. `plan.mjs` computed one for every exercise and `toWorkout`
dropped it, so the suggestion existed and never got to a screen. That was PLAN-2
W2 and it is fixed: `toWorkout` emits `swap` (a string or null) and
`alternatives` (up to three `{ name, why }`) alongside the five keys it always
emitted, which are unchanged. Additive, so nothing in `index.html` had to move
and nothing in it reads them yet.

`swap` stays a bare string on the plan's exercise objects too, because things
already read it that way. `alternatives` is the same answer with its reasons
attached and two more options behind it. The two can differ: `swapsThisWeek`
still prefers an alternative that has not already been offered this week, so the
swap is sometimes the second ranked rather than the first, and a swap still
never blocks a later main pick.

The one place it comes back empty is `Step-Up` on a glutes lunge slot, which is
the only glute-primary lunge in the library. `swap: null` is the honest output
there rather than an off-pattern substitute.

`supabase/migrations/20260909_exercise_swaps.sql` is the other half and is
written, not applied. It records what somebody actually replaced and whether
they took one of ours (`suggested`) or went and found their own (`searched`),
which is the second signal and the stronger one. research/07 calls this the
revealed preference the app throws away. Nothing reads the table yet; W3
(`preferences.mjs`) is the reader, and recording now means it opens with history
instead of an empty table.

## Goal storage

`profiles.goal` still holds one of the five legacy strings ("Lose weight", etc). `profiles.goal_bubble` and `profiles.goal_child` hold ids from `mo-knowledge/goals/goal-tree.json` instead, once the tile picker writes them. When `goal_bubble` is a valid bubble id, `mo-knowledge/engine/adapter.mjs`'s `mapGoal` uses it over the legacy string, and a valid `goal_child` under it wins over anything parsed from `goal_detail`; an invalid or absent value falls back to the legacy parsing silently.

## Limits: what hurts, and what they do not own

The optional onboarding sheet in `index.html` asks two questions and, until
this round, the engine could honour neither. The sheet's own comment says so
better than a summary would:

> there is no joint or pain concept in the library at all. An exercise records
> name, primary, secondary, equipment, level, and that is the lot. The only way
> to act on "my shoulder hurts" today is by proxy, dropping anything listing
> shoulders in primary or secondary, which is wrong in both directions at once:
> it would drop most chest pressing (where shoulders is a secondary) while
> keeping plenty that genuinely loads a bad shoulder.

Both directions are the point. A Dumbbell Bench Press lists shoulders. So does
a Dip. They are not the same question, and no amount of reading `secondary`
will tell them apart.

### `joint-load.mjs`, which is the actual work

A table from exercise name to the joints that movement loads **heavily**, where
heavily means "a person with pain there should not be handed this", not "this
joint is involved". Eight keys: shoulder, elbow, wrist, neck, lowerback, hip,
knee, ankle.

All 159 weight-training and calisthenics rows are tagged explicitly, one at a
time, across 146 distinct names (thirteen names live in both libraries and
share one entry, which is correct: a Push-Up is a Push-Up). Nothing falls
through to the default. Yoga and pilates are deliberately untagged: they are
low load by nature, no pose in either file carries an external weight, and a
pose by pose pass belongs with somebody who knows the contraindications.

It is coaching judgement, written from scratch, and its header says so. A
physio should review it before any of it is described to a user as medical
advice. It is not medical advice.

The line it draws, in the cases the brief named and a few it did not:

```
Overhead Press        shoulder, lowerback, wrist     Dumbbell Bench Press   none
Weighted Dip          shoulder, elbow                Machine Chest Press    none
Upright Row           shoulder, wrist, neck          Chest-Supported Row    none
Barbell Bench Press   shoulder                       Landmine Press         none
Pec Deck              shoulder                       Face Pull              none
Deadlift              lowerback, hip                 Leg Press              knee, hip
Good Morning          lowerback, hip                 Goblet Squat           knee, hip
Barbell Back Squat    knee, hip, lowerback           Glute Bridge           none
Leg Extension         knee                           Hip Thrust             hip
Sissy Squat           knee, ankle                    Leg Curl               none
Crunch                neck, lowerback                Plank                  none
Skull Crusher         elbow                          Hammer Curl            none
```

Thirty one of the 146 are tagged with nothing at all, and that is the number
that makes the file worth having. A proxy filter has no way to produce it.

`defaultJointLoad` covers anything not in the table, conservatively, from
`patternFor` and the primary groups: a vertical push is a shoulder, a hinge is
a lower back and a hip, a squat or a lunge is a knee and a hip. Nothing
untagged slips through unprotected. Today nothing in the two libraries reaches
it, which is the intended state and is asserted by counting.

### `limits.mjs`, which is the interface

Two exported lists, `BODY_AREAS` and `EQUIPMENT_OPTIONS`, and the screen must
import them rather than write its own. That is the lesson from the prototype:
it offered "Pull-up bar", "Squat rack" and "Bench", and the library records
exactly five equipment values and cannot see any of those three, while
"machine", which the engine can honour, was not offered at all. `CONTRACT.md`
is the document the screens are built from and carries both lists in full.

`normalizeLimits` takes an object, the JSON string a jsonb column round trips
as, or null, and drops unknown keys in silence. `applyLimits` is the pure
filter. `limitsSummary` turns the answers into the sentences the plan says out
loud.

The free text note is stored and never parsed. Turning "left knee since the
ACL" into a filter is how an app ends up guessing at a medical history.

### The two halves are not the same kind of answer

A painful joint is a judgement, so it travels down the `exclude` path the
plateau rotation already uses: it filters the ranked pool and never empties a
slot, because a hole in the week is worse than one movement that is not ideal.

Missing equipment is a fact, so it narrows the `equipment` allow list
`buildPlan` has always taken, which is a hard filter with no fallback. A bad
shoulder can be worked around with a lighter version of something. A barbell
somebody does not own cannot. Where that leaves a slot with nothing the slot is
dropped rather than filled with a lie: the library has no bodyweight
biceps-primary movement at all, so a bodyweight only pull day honestly has no
curl in it and comes back with three exercises instead of five.

### Where it is still imperfect, said out loud

Every overhead press in the library loads the shoulder, because that is what
overhead pressing is. So a shoulder limit empties the vertical push slot, the
existing never-empty fallback keeps the best ranked candidate, and the week
comes back with a Machine Shoulder Press in it. That is not a bug being hidden:
`plan.limits.blocked` names it and `dayNotes` carries the sentence.

> Machine Shoulder Press and Dumbbell Shoulder Press are still in this week.
> The library has nothing else that fills that slot, so go light, stop if it
> hurts, and swap it out if it does not settle.

The alternative is dropping the slot, which is a product decision rather than
an engine one. The same shape happens for a bad ankle and the calf slot, where
there is no calf exercise that spares the ankle, and `applyLimits` softens to
the single least loaded one when it is called on a pool directly.

`supabase/migrations/20260909_limits.sql` is the other half and is written, not
applied. One jsonb column on `profiles`, because unlike `focus_groups` these
three fields are one answer given at one moment and are read together or not at
all. No policy change: self writes its own row and `can_see` reads.

## Stretching (`mobility.mjs`)

Built 2026-09-10, Mo's ask: "we need the stretching in there, timed, and they
can say skip stretching." research/11: 48% of people setting a 2026 goal want
mobility, flexibility or posture, "five to ten minutes a day of work that nobody
offers." research/02: warm-up matters more with age.

**What it is.** A dynamic warm-up before the first set and a static cool-down
after the last one, matched to the day. `knowledge/exercise-library/
stretching.mjs` holds 49 moves in three categories (dynamic, static, mobility),
every one tagged with the fourteen muscle groups, `seconds`, `perSide`, a
`cue`, and `avoidIf` joints. `mobilityFor(day)` picks greedily for coverage:
each move is the one that covers the most target groups nobody has covered
yet, then nearest level, then shortest, then name, so it is deterministic. The
warm-up targets `day.mainGroups`; the cool-down targets every group the day's
exercises touched, because the biceps you curled are the tight ones, not only
the lats the day was named for.

**Time, decided.** The warm-up lives inside the session budget, because
`WARMUP_MIN = 5` has been inside `estimateMinutes` since the first run of this
engine with nothing in it. The cool-down is new and sits on top: five minutes,
and every day now carries `totalMinutes = estimatedMinutes + cooldown` beside
the old number so nothing is hidden inside a figure that used to mean
something else. Cutting working sets to make room would have reduced the volume
the ledger already says is short, silently, on every plan.

**The two goals that are this.** `flexibility` (under do-a-thing) and
`mobility` (under feel-better) both say "5 to 10 min daily, hips and upper
back" in the tree. For them the cool-down grows to ten minutes and draws from
the mobility category first, then static holds for whatever is left. Ten is the
top of the range the research names, and for these people the block is the
plan.

**What it is not.** Volume. Nothing here touches `weeklyVolume`, `recovery.mjs`
never credits a stretch (a test guarantees no stretch shares a name with a
lift, so the app's keyword classifier cannot mistake one either), and the app
must not write these rows to `exercise_logs`. Also not a separate workout: the
blocks ride on the day as `workout.warmup` and `workout.cooldown`, additive
keys, and the five keys the app has always read are untouched.

**Skip.** `payload.skip_stretching: true` (or `stretching: false`) strips both
arrays in the adapter and nothing else moves: a test asserts the plan is byte
for byte identical with and without it. `profiles.skip_stretching` is the
column; `meta.stretching` says which happened.

**Limits.** A stretch carries `avoidIf` joints and a joint that hurts removes
it, same rule as a lift. `meta.stretching.why` names how many were left out.

**Where it is still imperfect.** Biceps and triceps have no honest dynamic
stretch; the library uses elbow circles, which is what a coach would do and is
the one entry worth revisiting. The library index still lists "Stretching" in
`SIMPLE_TIMED_ACTIVITIES` for logging a class by minutes; that path is
unchanged and separate from this. And sixteen names were already duplicated
across the lifting, calisthenics, yoga and pilates files before this work
(Push-Up, Pull-Up, Plank and friends). Measured 2026-09-10: every pair agrees
on the primary muscle; three (Plank, Side Plank, Incline Push-Up) differ by one
extra secondary, shoulders, in the later file. `buildMuscleIndex` keeps the
last copy it sees, so recovery credits those three a half set to shoulders the
lifting file would not. Harmless today, worth one cleanup pass.
