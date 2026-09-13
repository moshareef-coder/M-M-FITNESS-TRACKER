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
- ~~**The library has no beginner hinge.**~~ Closed 2026-09-12, and it was never
  true. Every deadlift, Romanian deadlift and hip thrust is indeed tagged
  intermediate or above, but Cable Pull-Through is hamstrings-primary, beginner
  and a genuine hinge, and `load.mjs` was filing it as isolation because
  `pull.?through` sat in the isolation line above the hinge line. Reordering that
  table gave beginners a loadable hinge without anything in Jawa's folder moving.
- **A preference can be held back for good on the smallest weeks.** The cap is a
  quarter of the week's slots with a floor of two, so a two day week acts on
  three or four preferences and somebody with eight will never see the last of
  them honoured while the first four still cost something. That is deliberate:
  the alternative is a two day card that stops resembling itself. It is not
  silent either, `heldBackNote` names every queued preference every week. What
  is a real limit is that the queue only advances when an honoured preference
  stops costing anything, which on a two day week may never happen.
- **The cap cannot count its own knock-on.** `applyPreferences` is handed one
  pool at a time and bounds the slots it directly moves. It cannot see that
  displacing a lift on Monday makes it the least recently used candidate for a
  related slot on Thursday, through `plan.mjs`'s own no-repeats rule. Measured
  at roughly one extra slot per direct move, which is why `MAX_WEEK_SHARE` is a
  quarter and the promise is a third. Counting it properly needs the week built
  twice.
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
- **A day of four main lifts at long rests will not fit a short budget, when
  the budget is the GOAL's.** An advanced lifter who picks the no-time goal
  gets four main movements at six sets, which is about 47 minutes against the
  25 that goal asks for, and the two accessory levers stop before touching a
  main. 125 days out of 3824 land here. `volumeNotes.overBudget` names them and
  the sentence reaches `dayNotes`, so the number is a statement rather than a
  discrepancy. This half of the limit is deliberate and stays: `P.sessionMin`
  is the engine's own estimate of how long a goal takes, and an estimate has no
  business deleting sets off the movement the day is built around. Shaving a
  main's sets to satisfy it would fix the clock by pulling the back-off lever,
  which belongs to calibration and the plateau response, and two hands on one
  lever is the bug this folder already has a section about.

  The other half is closed as of 2026-09-12. When the PERSON names the clock,
  through `session_minutes`, two more levers run and then a third: sets come
  off everything including the mains, largest first, down to a floor of three,
  and only after that does the rest between sets shorten, by at most 40% and
  never below 45 seconds. A stated time is a fact about somebody's Tuesday
  rather than an estimate, which is why it may do what `P.sessionMin` may not.
  Measured over the same 3824 days, against the two old levers alone: at a 20
  minute target 75.3% of days ran over and now 32.8% do; at 30 minutes 27.0%
  and now 1.8%; at 45 minutes 5.9% and now none. What is left at 20 minutes is
  the engine's own floor, four movements at three sets and the shortest rest it
  will prescribe, which is about 21 minutes before a single long-rest strength
  lift is costed. Those days say so in plain words and name the two honest
  answers, more time or a goal with shorter rests.

  Rest compression is the one trim in the file that changes what a set is worth
  rather than how many there are, so it runs last, it stops at 60% of what the
  goal prescribed, and it always produces a sentence. That is not politeness:
  `knowledge/principles/` prescribes the interval per goal for a reason, and an
  engine that quietly shortens it is selling a strength block that is not one.
- **More time can only buy what the week can recover from.** The other
  direction of `session_minutes` adds sets to the groups the weekly ledger
  already reports as under target, capped at that target plus the usual slack
  and at the group's MRV, and it adds no exercise and no main movement, because
  the slot table is the argument of `plan.mjs` and a spare fifteen minutes is
  not a reason to put two lifts on the same muscle. So a 90 minute answer is
  mostly unspent: across the sweep matrix the longest day comes to about half
  the budget, and 4,466 lifts grow a set across the whole space rather than
  every day filling up. The plan says that out loud rather than inventing
  volume to fill the time. Whether the honest answer to "I have 90 minutes and
  three days" is a different SPLIT rather than a fuller day is a real question
  and the ledger does not get to answer it, same as the frequency cap above.
- **`detectPlateau` can rarely report a stall shorter than its own window.**
  `weeksFlat` is measured from the first day the all time best was set, and a lift
  whose best sits inside the six week window counts as climbing, so a 4 or 5 week
  stall only appears on a lift newer than the window. In practice `rotate` is the
  common answer and `rep-range` fires mostly for recently introduced lifts.
  `detectPlateau` is Jawa's and was not touched.
- **The library has no Dead Bug, and no way to say what a movement is.** Both
  `pain` and `back-postpartum` name dead bug in their goal-tree plan and it is
  not in `knowledge/exercise-library/` at all. Bird Dog is, and is unreachable,
  because it is tagged `lowerback` and no slot in `SLOTS` names that group. And
  because a library row records no movement class, the exclusion table in
  `goal-engine.mjs` is a list of exercise names kept in step by hand rather than
  a property of the movement. All three are requests for Jawa rather than edits
  to her folder. See "A goal can rule out a movement".
- **`emphasis` is almost inert.** Two behaviours, both of them
  `emphasis === "strength"`; the other seven values change nothing anywhere.
  Documented in full above so nobody builds a screen on it.
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
`P.priority` earns a group a multiplier on its weekly sets through `setsFor`,
1.4x flat until the tiers landed. A user chosen focus is that same mechanism
with a different source, so nothing new was invented for it: `parseFocus`
flattens pieces and heads down to groups and reads the tier off each,
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

### The three tiers, 2026-09-12

A pick now carries how badly they want it. Red, yellow and green in the picker;
3, 2 and 1 in the column; 1.75x, 1.4x and 1.2x on the group's weekly sets.

**Yellow is 1.4 because it already was.** `profiles.focus_groups` is a live
`text[]` with real picks in it, and a legacy entry that carries no tier reads as
yellow, so every plan built for somebody who chose before this landed is the
identical plan afterwards. That is why the middle tier was not free to be
anything else, and it is why the sweep's warning counts did not move when the
tiers shipped.

**Red is 1.75 because 1.6 was a label rather than a prescription.** The plan is
made of whole sets: `setsFor` divides a weekly target by how often the group is
hit, rounds, and clamps the session to [2, 6], so two close multipliers come
back as the same number of sets. Measured across 286 goal, day count and group
combinations: at 1.6 red and yellow produced the identical weekly total 90
times and no combination anywhere produced four distinct totals for none,
green, yellow and red. At 1.75 the identical pairs fall to 40 and the four-way
ladder appears (a 4 day lose-a-number week reads chest at 6, 8, 10 and 12 sets).
Past 1.75 nothing more moves, because what is left is the clamp and not the
rounding. Green could equally be 1.15 or 1.25; all three give identical plans
everywhere in that run, because what a light focus really buys is `setsFor`'s
+1 floor.

**The tier is a floor, never a ceiling.** The first sweep run of the tiers
failed on this: marking biceps GREEN under a goal that already prioritises arms
came back with fewer weekly sets than not touching the body map at all, 10
against 12, because the light tap replaced the goal's own 1.4x. Nobody taps a
muscle in order to train it less. A group both sources name takes the higher of
the two, the raise is paid for even when it puts the emphasis budget over, and
`why` says so.

**The cap is a budget, not a count.** The old rule was four groups and no more,
because the extra sets come out of a fixed weekly volume: focusing on everything
is focusing on nothing. Four groups is the wrong unit once groups are not worth
the same, so the cap is 9 units of tier-cost (red 3, yellow 2, green 1), which
is exactly what the old four-at-yellow cap cost plus one green. Spend it as
three reds, or four yellows, or nine greens. The combined budget after the
goal's own groups merge in is 11, which is the old five-group cap said the same
way. `MAX_FOCUS` and `MAX_PRIORITY` still exist and are now derived from the
budgets rather than declared, because index.html and the tests were written
against them.

**Whole body is answered, not swallowed.** Twelve or more of the fourteen groups
at one level is not emphasis, because there is nobody left to take the sets
from. Rather than greedily keeping the first three, the merge clears the user
half, leaves the goal's own priority standing, and puts a sentence in the plan's
`notes` saying the pick changed nothing and that marking two or three red would.
"Select my whole body" is stored as the single entry `"all"`, which expands to
every group at green and then takes exactly that path, so the button and
fourteen individual taps cannot drift apart.

The sweep grew a block for this: the same week built four times, once per tier
and once with no focus. A tier coming back with fewer sets than the tier below
it is a FAIL. Coming back with the SAME number is a warn, `tiers-indistinguishable`,
41 of 312 group checks, and that count is the honest measure of how much of the
table the [2, 6] clamp is eating. A separate 114 are groups the split has no
slot for at all, where no multiplier can conjure sets.

One thing left open, and it is the other end of finding 1 below: an advanced
base of 16 sets at 1.75 is a weekly target of 28, past anything in
volume-landmarks.md. The prescription is not 28, because the session clamp
stops it, but the ledger's target is, and a target nothing can reach is the
thing the ledger exists to report. Capping it is a change to what every
existing 1.4x priority means too, so it is named here rather than quietly
applied.

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

`meta.focus` is `{ requested, requestedTiers, applied, tiers, why, stale }`:
what came out of the profile and at which tier, what really ended up prioritised
after the merge and the budget and at which tier it really ran, the plain
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

`profiles.goal` still holds one of the five legacy strings ("Lose weight", etc). `profiles.goal_bubble` and `profiles.goal_child` hold ids from `mo-knowledge/goals/goal-tree.json` instead, once the tile picker writes them. When `goal_bubble` is a valid bubble id, `mo-knowledge/engine/adapter.mjs`'s `mapGoal` uses it over the legacy string, and a valid `goal_child` under it wins over anything parsed from `goal_detail`; an invalid or absent value falls back to the legacy parsing silently. `profiles.goal_secondary` holds the extra goals; see the section below.

## More than one goal

`profiles.goal_secondary` (migration `20260912_goal_secondary.sql`, written and
not applied) holds the "and also" goals as `[{ bubble, child }]`. One primary,
and the primary alone decides every parameter.

The single select note in `index.html` was half right and it is worth saying
which half. Rep ranges, rest, the sets factor, the session length and the day
count genuinely cannot be shared: 3 to 6 reps at 180 seconds of rest and 8 to
15 at 60 do not average into a week that trains either quality, and a week that
is both 3 days and 5 days is not a week. That is the half the note gets right,
and none of it moved. What the note got wrong is that it treated the whole goal
as the parameter set. "Build muscle and touch my toes" is not two rep ranges.
It is one rep range plus ten minutes of hips and upper back after the last set,
and refusing it was the app failing to listen rather than the app staying
coherent.

So a secondary may contribute exactly three things, and all three are additive
by construction:

| lever | why it cannot contradict the primary |
|---|---|
| priority muscle groups | a priority is a multiplier on a group's share of a **fixed** weekly budget, so it moves volume around inside the week the primary already decided |
| the mobility cool-down | it sits after the last set, outside the session estimate and outside the volume ledger. A stretch is not a set |
| cardio, upward only | it is prescribed beside the lifting and has never been inside the session budget. Lowering it would be contradicting the primary, so a secondary can only raise it |

And nothing else. A secondary never touches `repRange`, `restSec`,
`setsFactor`, `sessionMin`, `minDays`, `maxDays` or `emphasis`, and it never
touches the honest timeline, because the timeline is a rate computed from the
primary and a second goal does not make anybody lose weight faster.

**Two extras, and the number is defended rather than picked.** The priority
list is full at five groups (`focus.mjs` caps it there because the extra volume
comes out of a fixed budget), a primary naming four plus one secondary naming
four already saturates it, and the other two levers are single slots that the
first goal asking for them wins. Past two, a third can only ever be told it did
nothing, and a picker that takes six taps and then reports five of them dead is
worse than one that stops at two. Extras past the cap, repeats, and ids the
tree does not know are listed in `meta.goals.ignored` with a reason and said out
loud in `notes`; they are never silently dropped.

**A goal that bought nothing says so.** Strength as a second goal under a fat
loss primary is the honest case: strength is a rep range and a rest, it names
no priority groups, it asks for no mobility block and it prescribes less cardio,
so it contributes literally nothing. `meta.goals.secondary[n].effect` comes back
empty and `notes` carries a sentence saying the tap changed nothing and why.
The alternative, accepting the tap and building the same plan, is the thing
this codebase exists not to do.

**One consequence worth knowing.** `flexibility` and `mobility` resolve to the
health parameter set, which prescribes more easy cardio than hypertrophy does.
So "build muscle and touch my toes" raises the cardio line as well as adding
the mobility block, and both are reported. That is the table being honest about
what those goals are, not a leak between goals.

The one rule that was not taken as written: the brief said a secondary may
supply cardio only when the primary prescribes none. Every entry in
`GOAL_PARAMS` prescribes at least one session, so that rule could never have
fired. "Upward only" is the same idea in a form the table can actually reach.

## A goal can rule out a movement, 2026-09-12

A goal-tree audit found two goals prescribing the opposite of what their own
entry in `goals/goal-tree.json` says. `pain` ("Aches and pains") writes down
glute bridge, bird dog, dead bug and was handed **Crunch** and **Sit-Up**.
`back-postpartum` writes down core and pelvic floor first, function before
appearance, and was handed **Russian Twist** and **Side Bend**. Both for the
same mechanical reason: they prioritise `abs` and `obliques`, the slot table has
one core slot per day, and `candidates` fills it with whatever ranks first. The
library's obliques rows start with Russian Twist and Side Bend, its abs rows
with Plank and Crunch, so the goal's note never entered into it.

**This is a contradiction fix, not a training opinion.** The engine is not
writing a rehabilitation protocol, it makes no claim about what is safe for
anybody, and it decides nothing clinical. What it does now is obey the goal that
was already written down, which is the same class of bug as a secondary goal
being accepted and then ignored.

The mechanism is a per-goal exclusion, the way `limits.hurts` is a per-person
one. `MOVEMENT_CLASSES` in `goal-engine.mjs` names two classes, repeated trunk
flexion under load and trunk rotation or side bending under load, and lists the
weight-training and calisthenics rows in each. A goal names a class in
`avoidMovements` and `barredMovements` turns that into the set. No goal id
appears in a conditional anywhere, and a new goal can name a class without this
code learning about that goal.

**It is the one exclusion in `plan.mjs` with no fallback**, and that is the
point. Everything else there (a plateau rotation, a painful joint, a hard avoid)
has a never-empty-a-slot rule, because a hole in the week is worse than one
movement that is not ideal. Applied here that rule would hand back the exact
movement the goal pointed away from whenever it was the last one standing, which
is the bug. So the bar filters the pool inside `candidates`, before the
loose-pattern fallback can reach around it, and a slot it empties is **dropped
and named in `dayNotes`** rather than filled.

What actually fills those slots now is what the library already had: Plank and
Hollow Body Hold for abs, Side Plank for obliques, all bodyweight and beginner,
so the bodyweight-only week is unaffected. Pallof Press is the better
anti-rotation answer and needs a cable machine and an intermediate level, so it
cannot be the only answer; the notes say so in both places. The empty-slot path
is reachable in practice: a cable-only beginner has Cable Crunch as the whole of
the abs pool, and the week comes back with no abs slot and three sentences
saying which days lost it and why.

Two sentences reach `dayNotes` for any goal naming a class. One says what the
core work does instead, in movement words. The other is one line saying this is
general training guidance and somebody training around pain or a recent
pregnancy should run it past their own clinician. Deliberately the shortest
thing that can be said: no condition is named, nothing is diagnosed, and
nothing is promised.

**What we do not have.** There is no Dead Bug in
`knowledge/exercise-library/` at all, and both goals' notes ask for it by name.
There is also no movement-class field on a library row, which is why the table
above is a list of names rather than a query. Both are requests for the
`knowledge/` owner rather than edits to her folder. Bird Dog *is* in the library
and is still unreachable, because it is tagged `lowerback` and no slot in
`SLOTS` names that group; widening a slot changes every goal's week and is a
bigger decision than this fix.

## One exercise is never two exercises, 2026-09-12

A 50,017 case fuzz run found a push day carrying **Dip at 3x8** in the chest
slot and **Dip again at 3x12** in the triceps slot. `Dip` is
`primary: ["chest", "triceps"]`, so it is a fair candidate for both; on a
bodyweight only week with a sore wrist the pool has nothing else left by the
time the second slot is filled; and the last-resort fallback in `buildPlan` was
`pool[0]`, which did not care that the movement was already on the card. It
fires at every day count from 2 to 6.

Not an exotic input. Training at home with a sore wrist is an ordinary person
and it is exactly the population the limits feature was built for, which is the
worst place for a selector bug to land.

The fallback now stops at "anything not already on today's card", and a slot
with nothing of its own left is dropped and named in `dayNotes` rather than
filled with the repeat. The floor still holds: `toWorkout`'s
`MIN_EXERCISES` borrow from the next day of the same week catches any day that
falls under three, and a test now checks that across the matrix rather than
trusting the comment that says it should never fire.

Related and not ours: `Weighted Dip` is tagged `equipment: "bodyweight"` in
`knowledge/exercise-library/`, so it appears on a bodyweight only week. That is
a data fact in a read-only folder, and it is a request for Jawa rather than an
edit here.

## How long you actually have, 2026-09-12

Mo: "sometimes you put like five sets, six sets, whatever. But some people they
wanna do more, or they wanna do less. So maybe we should also have it be where,
how long are you wanting to work out for?"

There was always a time budget. It just came from the goal. `P.sessionMin` is
25, 30, 40, 45, 50 or 60 depending on the tile, and until 2026-09-10 only the
display read it. Now `session_minutes` can replace it.

**Replace, not clamp.** A goal's session length is a considered number and it
is also a guess about somebody's life. A stated one is a fact, the same class
of input as a missing barbell, and this file already has a rule for facts: they
win. What the goal keeps is everything else, and that is the trade the design
makes visible rather than hiding. Twenty-five minutes of a strength goal is
still strength rep ranges and long rests; it is just fewer of them.

**Absent is not a value.** Null, zero, a string and nonsense all mean "never
answered", the goal decides, and the whole matrix comes out byte for byte what
it was. That is load bearing rather than polite: the three levers that can
touch a main lift or a rest interval are guarded on the stated answer, so
nobody who skipped the question can reach them.

### Down: four levers, gentlest first

1. Sets off a non-priority accessory, to a floor of two. Already existed.
2. A non-priority accessory movement goes, to a floor of four exercises.
   Already existed. Priority accessories are exempt from both, which is the
   2026-09-10 bug where asking for arms deleted the arm work.
3. **New.** Sets off everything, mains included, to a floor of three. Largest
   first, one at a time, which is an even haircut rather than one movement
   being gutted: it never takes a lift below a lift that already had fewer
   sets, so the emphasis four passes spent building survives the trim and the
   priority floor survives with it. A priority lift gets the main floor too, so
   shaving cannot walk a focused group under an unfocused one.
4. **New, and last.** The rest between sets, to at most 40% off and never below
   45 seconds. Last because it is the only lever that changes what a set is
   worth instead of how many there are, and it is the only one that always
   produces a sentence. Three minutes between heavy triples is the difference
   between a strength set and a hard set; buying minutes with it is a real cost
   and the plan says so.

Below all four there is a floor: four movements at three sets and the shortest
rest the engine will prescribe is about 21 minutes with the warm-up in, so a
20 minute answer against a long-rest strength goal still runs over. Those days
say the honest number and name the two real answers, more time or a goal with
shorter rests. Measured, over 3824 days, against the two old levers alone:

| target | over budget before | over budget now |
|---|---|---|
| 20 min | 75.3% | 32.8% |
| 30 min | 27.0% | 1.8% |
| 45 min | 5.9% | 0% |
| 60 min | 0% | 0% |

### Up: the ledger decides, not the clock

More time buys sets, and it buys them where the week's own ledger already says
there is room: a group under its weekly target with an accessory slot below the
session clamp. `volumeNotes.under` has reported exactly that list since it was
written, with a comment saying it would be acted on "when there is a caller".
This is the caller.

What it will not do matters more. No new exercise and no new main movement,
because the slot table is the argument of this file and a spare fifteen minutes
is not a reason to put two lifts on the same muscle. Never past
`weeklyTargetFor` plus the same slack the over-trim uses, which is itself
capped at the group's MRV, so more time approaches what the research supports
and can never pass it. A 90 minute answer therefore comes out mostly unspent:
the longest day averages about half that budget across the matrix. The plan
hands the difference back with a sentence rather than inventing volume to fill
the clock.

### And when the ledger is full: what the surplus buys, 2026-09-12

The paragraph above was right about volume and wrong about the control. A 90
minute chip that produces a 29 minute plan is the dead "Main focus" dropdown
wearing an explanation, and the engine's own refusal sentence already named
three things worth doing with the time. It now does them instead of only naming
them. Three levers, in the order of what they are worth, all of them costing
zero recovery and none of them touching a hard set:

1. **The rest goes back.** If the clock compressed rest below the goal's
   prescribed interval, the surplus repays that first, back up the same 0.05
   ladder it came down. This can only fire on a week the calibration or the
   plateau response backed off, and it is worth saying why: compression happens
   exactly when a day is over budget, so a day cannot be both in debt and roomy
   at the same instant. What makes it real is that the back-off takes sets off
   **after** the compression and leaves the short rest sitting there. Measured:
   72 days across the goal matrix were carrying a rest debt the week no longer
   needed. The "your rest came down" sentence, and `meta.session.restCompressed`,
   now drop for a day that got it back.
2. **Ramp-up sets on the day's main lifts** (`workout.rampSets`). research/13
   section 5 ranked this the highest-value missing feature in the engine and it
   is the only design in that file tested against its alternative: Oliva 2026
   measured peak squat force falling 3.8% after a general mobility warm-up and
   holding after a movement-specific one, which is a close description of what
   this engine shipped. The table is the research's own, 0 / 50 / 70 / 88% of the
   working weight at 8 / 5 / 3 / 2 reps. How many rungs comes off the working
   reps, because reps are the only proxy for %1RM this engine has and the rule
   is stated in %1RM: four at six reps or fewer, three to ten, two above that,
   and one for a second main. None for accessories, none for a lift with no
   prescribed weight, because a ramp needs load to ramp and the regression ladder
   research/13 asks for (an incline push-up for a push-up) does not exist here.
3. **A ten minute stretching block instead of five**, and the block that grows
   is the cool-down. The old sentence offered "a longer warm-up" and research/13
   is against it three ways: McGowan 2015 has a long warm-up costing performance
   through accumulated fatigue, Behm 2016 has the range it buys expiring inside
   thirty minutes, and Oliva 2026 is above. The cool-down is the opposite case.
   Van Hooren 2018 finds it neither helps recovery nor costs anything, and the
   2024 *Sports Medicine* meta-regression puts the range-of-motion plateau at
   four minutes a session, which five barely clears and ten comfortably does.
   `MOBILITY_GOAL_SECONDS` already built that block for the two mobility goal
   children; `longCooldown` opens it to anybody who paid for it.

**What is deliberately not here is optional accessory work**, for three reasons
and not one. The ledger: a surplus only survives the fill pass when the fill
pass could find no group under its ceiling, so at the moment this code runs
there is by construction no room left under MRV, and optional sets would be
volume past the ceiling the whole file exists to respect the moment somebody
actually did them. The slot table: adding a movement instead is the same thing
the fill pass already refuses to do with the same spare minutes. And
calibration, which went live the day before: a prescribed lift a person
reasonably skips reads as a shortfall and takes weight off them next week, so
shipping optional work in `exercises` would punish somebody for taking the
optional extra.

**Zero volume, proved rather than asserted.** Across every goal and child, four
day counts, three histories, both sexes and seven stated session lengths, 1512
plans: weekly hard sets changed on **0**, the rows the app copies into
`ai_workouts.exercises` changed on **0**, and no group's weekly total rose above
what the same plan produced before this change. With `session_minutes` absent,
all 216 plans are byte for byte identical, which is why `volumeNotes.timeBought`
is spread in rather than always present.

**What it moved.** Minutes used against minutes asked, same matrix:

| | median | p10 | p90 | under 0.6 | 0.8 to 1.0 |
|---|---|---|---|---|---|
| before | 0.80 | 0.38 | 1.13 | 33.5% | 18.3% |
| after | 0.87 | 0.42 | 1.15 | 27.0% | 22.6% |

Still not 1.0, and it should not be. When there is genuinely nothing left worth
buying the engine still says so, and the sentence now ends "spend what is left
on a walk, or take it back" rather than recommending the longer warm-up the
research says costs performance.

**That known gap is closed.** It was recorded here as: the ramp is gated on
surplus, so the advanced lifter on a strength goal, already over the 90 minutes
they asked for, gets none, and that person is exactly who research/13 is
describing. The owner lifted the byte-identical baseline the same day and the
ramp became unconditional. What follows is that change.

## Ramp-up sets are normal now, 2026-09-12

Nobody works up to a 240 lb squat cold, and until this change the engine told
them to. Ramp sets are no longer bought with spare minutes. They are decided by
the lifts, they are costed inside the session budget like any other warm-up
minute, and they are on nearly every day.

### What counts as heavy, and where the rule comes from

research/13 states it in %1RM and in nothing else: "three to four ramp sets for
a main compound at or above 80% 1RM; one to two for a second main; none for
accessories and isolation", under Iversen 2021's "the need for a specific
warm-up scales with load. Above about 80% 1RM it matters. In higher rep ranges,
the first few reps of the working set already are the specific warm-up."

So the gate is %1RM, read off the prescribed reps by inverting `load.mjs`'s own
`workingFrom1RM` at the RIR it prescribes with. Inverting the engine's own
function rather than picking a second formula matters: the number agrees with
how the weight on the card was worked out.

| prescribed reps | implied %1RM | rungs |
|---|---|---|
| 5 or fewer | 81% and up | 4 |
| 6 to 9 | 73 to 79% | 3 |
| 10 or more | 71% and down | 0 |

Plus two hard conditions: a **main** slot, so a lateral raise can never reach
the code, and a **prescribed weight above zero**.

**And an honest note about what this rule cannot do.** It does not distinguish a
240 lb back squat from a beginner's 35 lb goblet squat, and it cannot, because
both are about 78% of that person's own one rep max. The working weight was
derived from the estimated 1RM by this same relation, so asking "what fraction
of their max is this" gives back the reps it started from. That is not a defect
hiding in the rule, it is the rule being relative: 78% of your max is heavy for
you whoever you are, and both of those lifters should work up to it. What the
rule does exclude is accessories, isolation, anything unloadable, high-rep
mains, and any load light enough that the rungs round onto each other.

### Bodyweight and unloadable movements, decided rather than skipped

A push-up and a plank get no ramp, on purpose. A ramp is a load and a rep count.
research/13 open question 9 says what it would take: a regression ladder per
movement pattern, an incline push-up for a push-up, a box squat for a squat, and
suggests `calisthenics.mjs` may already have one. Checked on 2026-09-12: it does
not. Every entry carries `name`, `primary`, `secondary`, `equipment` and `level`
and nothing that orders two movements on the same pattern by difficulty, so
there is no way to say a wall push-up is the easier version of a push-up rather
than a different exercise for the same muscle. Deriving a ladder from `level`
would put a beginner-tagged movement in front of an intermediate one on a
pattern they do not share. Requested in `LIBRARY-REQUESTS.md`; until it exists,
no ramp is the honest answer and a guessed one is not.

One consequence worth naming: **the first main that can be ramped is the one
that ramps, not simply the first slot.** A day that opens with pull-ups and
follows with a barbell row ramps the row. The first version stopped at slot one
and handed that day nothing, which is the same starving bug in a new place.

### Replace, not add: did it pay for itself

Partly, and the honest answer is no, not fully. On a day with a ramp the general
warm-up block drops from six minutes to four (`RAMPED_WARMUP_SECONDS`), so the
person gets four minutes of general work plus about four and a half of ramp:
**more** preparation than the six they had, and a larger share of it the
movement-specific kind Iversen asks to prioritise. Eight and a half minutes of
preparation sits inside ACSM's five to ten, counting the ramp as warm-up, which
RAMP does.

Measured across 3,690 days: the ramp costs **4.5 minutes**, the shorter block
gives back **2.0**, net **+2.5 minutes on a ramped day**, and the whole-matrix
average session estimate goes from 35.3 to 37.7 minutes.

It cannot fully pay for itself, and the arithmetic says why rather than the
judgement: the ramp's four rests are 45, 45, 60 and 60 seconds, which is 3.5
minutes before a single rep is counted. Absorbing that would need the general
block at about 90 seconds, which is not a warm-up. Going below four minutes was
tried and rejected: it saves roughly one more minute and it would be picking a
number to hit a counter. research/13 recommendation 10 asks for 360 seconds
*with* the ramp on top, so four minutes already goes one step further than that
file does, and the step is argued rather than assumed: 360 was chosen when the
engine had no potentiate phase and the block was implicitly, badly, doing that
job.

### The second main's rung was built, measured worse, and made discretionary

research/13 asks for one to two rungs on a second main. Built it unconditionally
and swept it: **319 more days over their time budget and 164 fewer real working
sets**, because the trims took the minutes out of the sets. The claim behind it
is the weakest in section 5, "the body is warm by then and the value of the ramp
is mostly neural rehearsal", with no citation and outside that section's own
confidence note. Trading a person's working sets for an uncited rehearsal rung
is a bad trade. So it moved to `addSecondMainRamps`, which runs after every trim
and adds the rung only where the day already fits with it, making it free by
construction. It still lands on 76% of days.

### Blast radius, measured

Same matrix as the surplus work: every goal bubble and child, four day counts,
three histories, both sexes, five session-length settings. 1,080 plans, 3,690
days.

| | before | after |
|---|---|---|
| days with a ramp | 0 | 3,690 (100%) |
| of which a second main too | 0 | 2,804 (76%) |
| prep minutes reserved per day | 6.0 | 8.8 |
| session estimate per day | 35.3 | 37.7 |
| weekly hard sets, whole matrix | 60,380 | 59,686 (-1.1%) |
| group-weeks above MRV plus slack | 40 | 40 |

Main slots across the matrix: 7,380, of which 5,830 (79%) carry a load and 1,550
do not. Ramp coverage is 100% of days and not 100% of main slots, because a day
whose first main is bodyweight ramps the next one that is not.

**Volume is no longer untouched, and it should not be.** This is the one
property that held for the surplus-gated version and deliberately does not hold
here: 280 of 1,080 plans lose sets and 318 have different rows for
`calibrate.mjs` to join. That is the time budget doing its job. A warm-up the
session estimate cannot see is exactly the bug the comment on `WARMUP_MIN` was
written about, minutes the person spends that the number on the screen does not
know about, so the ramp is inside `estimatedMinutes` and the trims see all of
it. Hiding it outside the budget would have frozen every counter in this table
and lied about the clock. **MRV is untouched**: 40 group-weeks sat above target
plus slack before this change and 40 sit above it after, the same 40.

### `over-time-budget`, which is the counter to watch

`sweep.mjs` now genuinely covers this, where it gave the surplus-gated version
none, so its WARN deltas mean something for the first time.

| WARN | before | after | why |
|---|---|---|---|
| over-time-budget | 1399 | 1916 | **+517.** The real cost, below |
| same-group-twice-in-day | 20149 | 20146 | -3. Three days lost a trailing accessory to the clock, so its group stopped appearing twice |
| ledger rows | 77428 | 77218 | -210 sets, the same trims |
| excluded-prescribed | 12291 | 12291 | unchanged |
| hurt-joint-prescribed | 12291 | 12291 | unchanged |
| duplicate-in-week | 9828 | 9828 | unchanged |
| days-clamped | 3245 | 3245 | unchanged |
| calibration-changed-selection | 208 | 208 | unchanged |
| focus-group-not-in-split | 114 | 114 | unchanged |
| unknown-secondary-goal | 52 | 52 | unchanged |
| tiers-indistinguishable | 46 | 46 | unchanged |

FAILs none and KNOWN OPEN none, before and after.

**Why +517 happened, and it was not acceptable.** Those days were 0 to 2 minutes
past a 15% tolerance line, median 0, which is a boundary case rather than a
session that stopped fitting. But the warn was the instrument reading correctly:
`P.sessionMin`, the goal's own session length, was set for a session that opened
cold and was now short by exactly what the ramp costs. The fix was to make the
number honest, and it shipped the same day. Next section.

## The session lengths grew to cover the ramp, 2026-09-12

`sessionMin` in `goal-engine.mjs` had not moved since it was written. The ramp
made it stale rather than wrong: a session genuinely takes two and a half
minutes longer than it did that morning, so 517 sweep days read as over budget
with nothing a person would feel having changed.

### The increase is derived, not flat

How many rungs a main earns comes off its prescribed reps, and a main's reps are
`repRange[0]` on the same row `sessionMin` sits on. So the cost falls out of the
row it is being added to:

| `repRange[0]` | rungs | block 6 min goes to 4, ramp costs | move |
|---|---|---|---|
| 5 or fewer | 4 | 4.5 min | **+3** |
| 6 to 9 | 3 | 3.25 min | **+1** |
| 10 or more | none | nothing | **0** |

Measured before it was applied, across every bubble, every child, four day
counts, three histories and both sexes: the added preparation is **exactly 3 on
every strength and skill day and exactly 1 everywhere else, with no spread at
all**. Not an average that happened to land near a round number, a constant.

| table | was | now | why |
|---|---|---|---|
| strength | 60 | 63 | mains at 3 reps, 4 rungs |
| skill | 45 | 48 | mains at 3 reps, 4 rungs |
| hypertrophy | 60 | 61 | mains at 6 reps, 3 rungs |
| fatloss | 45 | 46 | mains at 8 reps |
| recomp | 50 | 51 | mains at 8 reps |
| endurance | 40 | 41 | mains at 8 reps |
| health | 40 | 41 | mains at 8 reps |
| habit | 30 | 31 | mains at 8 reps |
| `no-time` child | 25 | **25** | held, see below |

Not rounded to the nearest five. 63 and 46 are numbers a person says out loud,
and rounding to 65 and 45 would either buy volume the ramp never cost or leave
the staleness in place. Only the mandatory first-main ramp is budgeted for; the
second main's rung is added afterwards and only where the day already fits, so
budgeting for it would be budgeting for something optional.

### The chips, and the one goal that did not move

`sessionMin` has exactly one reader outside the engine: the session-length UI
pre-selects from it, mapping the goal's number to the nearest of 20/30/45/60/90
with ties going to the shorter. **Every moved goal keeps the chip it had.** 46
and 48 still suggest 45, 51 still suggests 45, 61 and 63 still suggest 60, 41
still suggests 45, 31 still suggests 30.

The exception is `no-time` at 25, which is the only length that ties, so it
suggests 20 today and 26 would suggest 30. Raising it by the one minute its ramp
costs would offer somebody who told us they have no time a session half again as
long as the one they asked for. It stays at 25, a no-time day stays one minute
under-reserved, and it says so when it runs over. A test asserts the whole chip
mapping so the table and the app cannot drift apart in silence.

### What recovered, measured

Sweep, 10,421 runs, none of which sends a `session_minutes`, so this is the path
`sessionMin` governs:

| | this morning | ramp only | ramp + honest lengths |
|---|---|---|---|
| over-time-budget | 1399 | 1916 | **1319** |
| ledger rows (weekly sets) | 77428 | 77218 | **77506** |

And on the default path of the goal matrix, 216 plans: weekly hard sets **11202
before the ramp and 11202 after both changes**, 0 plans with different sets, 0
with different rows for `calibrate.mjs`, group-weeks above MRV plus slack 8 and
8. The ramp is now free in volume terms on the path it governs.

**It slightly over-recovered, which is worth knowing.** Sweep-wide it ended 80
days *under* the pre-ramp over-budget count and 78 sets *above* the pre-ramp
ledger. The mechanism is the 15% tolerance, which scales with the budget: a day
whose budget grew 3 minutes gained 3.45 minutes of effective ceiling, and across
enough days that occasional half-minute fits one more accessory set. It is 0.1%
of the week's volume, **MRV is untouched** (40 group-weeks sat above target plus
slack before all of this and 40 sit above it now, and the sweep's own over-1.25
column is unmoved at 3.1% beginner, 0.0% intermediate and advanced), and the
fill pass cannot cross the ceiling by construction. Worth naming rather than
presenting as a clean revert.

### Sweep WARN deltas, this change on its own

| WARN | ramp only | after | why |
|---|---|---|---|
| over-time-budget | 1916 | 1319 | the point of the change |
| same-group-twice-in-day | 20146 | 20207 | fewer accessories deleted by the clock, so more groups appear twice again |
| excluded-prescribed | 12291 | 12307 | same cause: the clock was suppressing these by deleting the offending accessory, not by selecting better |
| hurt-joint-prescribed | 12291 | 12307 | same |
| duplicate-in-week | 9828 | 9831 | same |
| days-clamped | 3245 | 3245 | unchanged |
| calibration-changed-selection | 208 | 208 | unchanged |
| focus-group-not-in-split | 114 | 114 | unchanged |
| unknown-secondary-goal | 52 | 52 | unchanged |
| tiers-indistinguishable | 46 | 46 | unchanged |

The four that rose are one finding, not four: those movements were already being
prescribed and the time trim was deleting them before the checker saw them. A
bigger budget stops deleting them, so the warns surface. That is a pre-existing
selection problem becoming visible, not a new one, and it belongs to
`excluded-prescribed` rather than to the clock.

FAILs none and KNOWN OPEN none throughout.

### What the sweep does and does not cover

`sweep.mjs` sends no `session_minutes` today, so its `over-time-budget` count
is unmoved at 1399 and that is the correct reading: the sweep measures the
no-answer path, which is exactly the path this change leaves alone. The numbers
in the table above come from the same 3824 day matrix run five times with a
target set. A `session_minutes` axis belongs in `sweep.mjs` and is the obvious
next thing to add there.

Still true of the surplus work on 2026-09-12, and it cost something: every sweep
count was identical before and after it, which reads as "no regressions" and was
really "the instrument is not pointed at it". The proof numbers in the section
below come from a separate matrix for exactly that reason. `fuzz.mjs` **is**
pointed at it, and it grew checks to match: a ramp that names a movement not on
the day, or carries a load at or above the working weight, is a FAIL there.

Fixed by accident later the same day. Unconditional ramp sets are on the default
path, so `sweep.mjs` covers them without a `session_minutes` axis, and its
deltas are reported properly two sections down. A `session_minutes` axis is
still the obvious next thing to add, and it is still missing.

## What `emphasis` does, and what it does not

`emphasis` is on every entry of `GOAL_PARAMS` and reads like the field that
drives the plan. It is not. As of 2026-09-12 it has exactly two behaviours in
the whole engine, and both of them are the same question:

| where | what it does |
|---|---|
| `plan.mjs`, `candidates` | `emphasis === "strength"` on a **main** slot turns on `LOAD_PENALTY`, which ranks a loadable movement over a bodyweight one so a strength goal does not get push-ups at three reps |
| `plateau-response.mjs`, `isStrengthGoal` | `emphasis === "strength"` (or a bubble of `get-stronger`) picks the strength branch of the stall answer |

That is all of it. The other seven values, `fatloss`, `hypertrophy`, `recomp`,
`skill`, `endurance`, `health` and `habit`, are **decorative**: nothing anywhere
branches on them, and changing one to another changes no set, no exercise, no
rest and no sentence. What actually separates those goals is `repRange`,
`restSec`, `setsFactor`, `minDays`, `maxDays`, `sessionMin`, `cardio` and
`priority`, every one of which is a number the goal table sets directly.

**Do not build a screen on it.** "Your emphasis is hypertrophy" is a label with
nothing behind it, and a reader who assumes the field drives the split will be
wrong. It does not leave the engine today: it is not in `meta`, and the only
correct use of it outside these two call sites is none.

Giving the other seven values real behaviour is a design decision about what
each quality should change, not a bug fix, and it is not one this section is
making. It is recorded here so that the gap is on the record rather than
discovered by somebody trusting the name.

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

**Anyone can now have that block, if they paid for it.** 2026-09-12: a stated
`session_minutes` with minutes left over after the fill pass buys the same ten
minute cool-down for anybody (`mobilityFor(..., { longCooldown: true })`). The
warm-up does not grow and will not: research/13 has McGowan 2015 on the fatigue
a long warm-up accumulates, Behm 2016 on the acute range expiring inside thirty
minutes, and Oliva 2026 on a general mobility warm-up costing 3.8% of peak squat
force outright. The cool-down is the free one (Van Hooren 2018: no recovery
benefit, no cost either) and it is where the one real outcome lives. The surplus
therefore grows the block that is free and leaves alone the block that is not.
`meta.stretching.mobilityGoal` stays the goal-child flag; `why` says which of
the two happened.

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

## The sweep (`sweep.mjs`), and the audit of 2026-09-10

`node mo-knowledge/engine/sweep.mjs` runs every goal selection (52: nine
bubbles, every child plus every bubble default) across 2 to 6 days, four
history lengths, six limits cases, with sex, bodyweight and focus cycled
through, **10,421 plans in about twenty-two seconds**, and checks thirty
odd invariants on each. 1,040 of those are the tier ladder added on
2026-09-12, which builds the same week at each of the three focus tiers and
once without one; see Focus above for what it found. It exits 1 on any FAIL and is part of the gate now.
WARNs are counted, not failed, and the counts are the point: a number that
moves between commits is a change somebody should be able to explain.

**9,329 of those go through `generateFromPayload` and 1,092 call `buildPlan`
directly.** When those blocks were written that was not a shortcut but a
confession: `adapter.mjs` handed `payload.plans` to `nextDayIndex` and never to
`buildPlan`, so a calibrated week could not be produced from a payload at all.
It can now, as of later the same day, and the direct calls stay because they are
the only way to hold `logs` fixed while varying `plans`, which is the
subtraction that makes "calibration did this" attributable. Until 2026-09-12 the
sweep never passed `plans`, `calibrate.mjs` saw no
completed sessions and returned `unknown` on every one of 8,912 runs, and
calibration, the back-off lever, progression and the entire plateau response
had zero coverage. The bug fixed that morning, a 2.5 percent multiplier that
could not clear a 5 lb rounding step so a curl sat at 25 lb through eight
weeks of perfect training, survived 8,913 clean runs because the instrument
was not pointed at it. "SWEEP CLEAN" was overstating what had been checked.

**What was added to close that, and what each one asserts:**

- **Eight weeks of doing exactly what it said** (block F, 8 builds per goal).
  Build a week, write every day back as a completed `ai_workouts` row plus the
  logs of somebody who hit every set, rep and pound, rebuild, eight times. The
  invariant is one sentence: *if you do everything it asks for eight weeks, the
  weight on the bar has to go up.* `progress-stalled-under-perfect-training`
  fails on a lift prescribed three or more weeks running whose last
  prescription equals its first, **in pounds after rounding, never on a
  multiplier**, because all three bugs of that morning had a factor that looked
  right and a prescription that never moved. Two people alternate by goal, one
  living under `roundLoad`'s 40 lb boundary and one above it, because that
  boundary is where the no-op lived.
- **Plan against actual, all four verdicts** (block G). One seed week per goal,
  three completed sessions of its first day, then the same week built with
  `plans` and without them on *identical logs*, so level, training age and every
  starting weight are the same object and the only difference is that one plan
  knows what was prescribed. Beat it, matched it, missed it, never logged it.
  `advance-did-not-move-load` and `back-off-did-not-reduce-load` are the two
  headline invariants and they are the exact shape that hid three bugs;
  `advance-under-one-grid-step` catches the near miss, a move the rack cannot
  express; `uncalibrated-load-moved` catches the opposite, a load that moved
  with no verdict behind it. `calibration-branch-not-reached` is the instrument
  checking itself: if a scenario stops producing the verdict it is named after,
  every assertion under it would pass on a person nobody calibrated, which is
  exactly how the sweep stayed clean before.
- **A stall gets an answer, and the answer has to be visible** (block H). Three
  stall shapes per goal: five weeks flat, nine weeks flat, three lifts flat at
  once. A `rotate` whose lift is still in the week fails, a response whose
  sentence never reached `dayNotes` fails, and an action this file has no
  observable for fails on sight, so a new action added without a lever cannot
  arrive silently.
- **The claims nothing was checking** (block I). `skip_stretching` really does
  leave the plan byte for byte what it was; a stale `focus_chosen_at` is flagged
  and acts on nothing; every `goal_secondary` comes back either bought or
  ignored; and the two fields the adapter accepts and throws away.

**Found by the new invariants on their first run, all four closed the same day.**
They printed under KNOWN OPEN rather than FAILS: written as FAILs and counted
apart, because a permanently red gate is one nobody reads. Deleting a line from
`KNOWN_OPEN` in `sweep.mjs` is the whole of the fix procedure, and all four
lines are gone. `KNOWN_OPEN` itself stays, empty, for the next one.

1. **`plans` and `swaps` never reached `buildPlan`. Closed 2026-09-12.**
   `adapter.mjs` passed `payload.plans` to `nextDayIndex` only, and
   `payload.swaps` nowhere. `CONTRACT.md` said `plans` is joined against `logs`
   to calibrate, the edge function already read both columns and the app already
   sent them, so the data arrived at the engine's door and was dropped one line
   inside it. End to end, in the shipped app, calibration had never run, the
   back-off had never fired, `preferences.mjs` was dead code and every plateau
   answer that depends on a verdict took its "no verdict" branch. It was one
   argument each, and the fix is those two arguments plus the three things that
   only broke once they were passed: the two below, and `missing` asking
   `plans.length` where it meant `calibration.overall === "unknown"`, which made
   the "nothing was calibrated" sentence disappear for somebody carrying an
   unfinished plan. The shape of a plan row is now settled in `adapter.mjs`,
   which is where a payload stops being input and becomes an argument: the fuzz
   found a crafted body with a number where a plan should be within the hour.
2. **A back-off week could come back with more sets than the week it backed off
   from. Closed 2026-09-12.** `setsFor` took a set off every main in pass 2, and
   pass 2 runs in front of three passes that all re-decide a set count and none
   of which knows a back-off is in force: the volume ledger, the clock's trim
   and the stated-session-length top-up. A lighter week is a cheaper week in
   minutes, so the clock had less to shave and the accessories kept sets the
   uncalibrated week lost. 48 weekly sets became 50 on the identical exercise
   list with identical logs, the only difference being `plans`. 6 of 52 goals.
   An ordering question rather than a number, and the ordering is the fix: the
   ease is now the LAST thing that happens to a set count, in `easeSets`, so a
   calibrated back-off week is the week the person would otherwise have had
   minus the cut, and nothing downstream can hand any of it back. Measured after:
   every one of the 52 goals loses 4 to 10 weekly sets on a back-off and none
   gains any. `volume-cut-did-not-cut`, which was 12, is now 0 for the same
   reason: the same lever was being undone the same way.
3. **A `rep-range` plateau answer was a sentence and nothing else. Closed
   2026-09-12.** The note said "the lift stays and the reps change: 8 to 12 for
   this block instead of 3 to 6" and the day still prescribed 3, because nothing
   in `plan.mjs` read the response. `rotate` was applied, `volume-cut` was
   applied, this one was not. 5 of 52 goals, every one a strength goal with a
   short stall. `plan.mjs` now reads `repShiftFor` out of `plateau-response.mjs`
   rather than keeping a second copy of the rule, and it applies the range at
   prescription time rather than in a tidy pass at the end: `prescribeLoad`
   works the weight back from the rep count, so eight reps at the three rep
   weight would be a harder week wearing the note of a lighter one.

**WARN counts moved, and why.** The run count moved, so some had to.
`same-group-twice-in-day` 18,567 to 20,151 and `over-time-budget` 1,341 to
1,399: the new blocks check their plans with the same invariants, so these are
new plans, not new faults. `days-clamped` 3,243 to 3,245: two of the five goals
that clamp a four day ask to three land on the replay's four day person.
`excluded-prescribed`, `hurt-joint-prescribed`, `duplicate-in-week` and
`tiers-indistinguishable` are unchanged to the unit, because the new blocks send
no limits. New counters: `calibration-changed-selection` 260 (a skipped exercise
teaches `preferences.mjs` to avoid it, which is the system working),
`unknown-secondary-goal-dropped-silently` 52, `volume-cut-did-not-cut` 12,
`back-off-changed-no-sets` 6.

**And again when calibration was switched on, later the same day.** Four
counters moved and everything else held to the unit, which is the point of
counting them. `volume-cut-did-not-cut` 12 to 0 and `back-off-changed-no-sets`
6 to 0: both were the back-off being handed back by a later pass, and both are
gone with the ordering fix. `calibration-changed-selection` 260 to 258 and
`same-group-twice-in-day` 20,151 to 20,149: two rep-range answers now change a
prescription rather than only a sentence, which moves two plans. Ledger rows
77,436 to 77,428. `excluded-prescribed`, `hurt-joint-prescribed`,
`duplicate-in-week`, `days-clamped`, `over-time-budget`,
`focus-group-not-in-split`, `tiers-indistinguishable` and
`unknown-secondary-goal-dropped-silently` are unchanged to the unit.

**And once more when the preference cap landed, the day after.** One counter
moved and every other total, plus every cell of the volume table, is identical
to the unit. `calibration-changed-selection` 258 to 208. That warning fires when
a movement is in the calibrated week and not in the control, which is exactly
the thing the cap exists to ration: a skipped exercise teaches `preferences.mjs`
to avoid it and the selection changes. 258 was every such change firing at once.
208 is the same signals arriving under a ceiling, with the fifty that no longer
fire held back and named in `dayNotes` instead. Down is the direction that means
the cap works; zero would mean revealed preference had stopped doing anything,
which would be worse than the lurch.

**What the sweep still cannot see.** The most useful sentence in this section.

- **The app.** Everything here checks the engine's return. Nothing checks that
  `index.html` renders `notes`, the rest timer, the cardio prescription or a
  plateau sentence, and the audit of 2026-09-10 found five things computed and
  never returned. The same class of bug one layer up is uncovered.
- **Real data.** Every log in the sweep is synthetic and tidy: three sessions a
  week, whole pounds, no double entries, no typos, no 400 lb curl. `fuzz.mjs`
  covers the hostile end of that and the two do not meet in the middle.
- **The calendar.** Blocks F to I step a week at a time on a fixed clock. Nobody
  trains on Tuesday and Saturday, takes a holiday, comes back after five weeks
  or logs a session at 06:00 and another at 23:00 the same day.
- **Deloads over time.** `deload` is still a sentence and week six is identical
  to week five, so the replay cannot catch a deload that never arrives: there is
  nothing to catch it with.
- **The novice band** (weeks 7 to 20), still, and now for a second reason: the
  four history lengths land either side of it and the replay's two people land
  on beginner and intermediate.
- **Everything between the verdicts.** Block G sends four clean scenarios. A
  person who beats the plan on Monday, misses it on Wednesday and skips Friday
  is the common case and is not swept.
- **`goal_secondary` beyond its bookkeeping.** That the second goal is reported
  honestly is checked. That it bought the right thing is not.

**Fixed from the first run, all pinned by tests:**

- *Asking for a focus deleted that group's work.* The time trim's drop lever
  removed the last accessory without checking `priority`, so arms focus on a
  tight strength day pushed both arm lifts to five sets, crossed the budget,
  and dropped the triceps isolation from the week: 8 weekly sets to 0 because
  somebody asked for more. A priority accessory is never the thing that goes.
- *A short bodyweight day came back with two exercises.* `slotsForDay` sliced
  the slots to four, an unfillable slot spent one of the places, and nothing
  re-floored. 100 days in the sweep. The floor is counted on picks now.
- *The ledger credited an exercise to its library row's first primary, not the
  slot it was chosen for.* An incline press in the shoulders slot was booked as
  chest, so the slot's group got nothing and the day could read chest three
  times (307 of 726 clean days). `groupFor(slot, pick)` is the one answer.
- *Rest never reached the app.* `restSec` was the only number in the time
  budget the app could not see; a 180 second strength rest ran on the app's 90
  second default. It rides on every exercise now (CONTRACT.md).
- *Every dayNote was thrown away.* The limits summary, the softened warning
  when a slot kept a movement that loads a bad joint, the over-budget number,
  the plateau answers: computed, never returned. `notes` comes back next to
  `honest` now. The app has to render it; see the stretching wiring list.
- *A six day ask was silently answered with five, four or three.* No goal in
  the tree allows six. The clamp says so in the notes now, in the same voice
  as the capacity shortening; whether a goal should allow six is a product
  question, still open.
- *Recovery assumed 18:00.* It reads `created_at` (or `workout_at`) when the
  rows carry one, so a session logged at 07:00 is ready 24 hours after 07:00.
  Two tests that compared "yesterday at six" against `new Date()` only passed
  before six in the evening; fixed clocks now.

**Measured and left open, in the order a user would notice:**

1. ~~**Volume above beginner is mostly under target, by design of the clamp.**~~
   **Fixed on 2026-09-12: the target is scaled to the frequency the split
   delivers.** See "Finding 1, and why the target was the thing that was wrong"
   below for the numbers on both options.
2. **There is no calendar.** `restDays: 7 - days` is read by the demo only; the
   app's rest day is a separate 2-a-week streak token; nothing places a day on
   a weekday and the week never says "today is a rest day". Spacing between
   sessions is emergent from `nextDayIndex` at generate time.
3. **`deload` is a sentence.** Level decides it, nothing counts weeks, and
   week six is identical to week five. The `backOff` lever exists; it needs a
   week number to fire on.
4. **`plan.cardio` is never placed on a day or sent to the app.** For the
   endurance goals it is three sessions a week the user is never told about.
5. **Announced fallbacks are common.** With `hurts: ["shoulder"]` about 1.3
   ruled out movements per plan are still prescribed because the slot had
   nothing else, every one named in `plan.limits.blocked` with a note. The
   note reaches the app now (above). Dropping the slot instead is a product
   decision.

Also counted: the 4 day split repeats `Step-Up` on both leg days in 94 of 208
clean plans; the novice band (weeks 7 to 20) is never swept because the four
history lengths land either side of it; `over-time-budget` rose from 704 to
1,268 days when the drop lever stopped removing priority work, which is the
honest number replacing a quiet deletion.

## Finding 1, and why the target was the thing that was wrong

Resolved 2026-09-12. The sweep's first finding was that three quarters of every
intermediate and advanced group landed under 0.8 of its weekly target and
nothing above beginner ever overshot. A ledger that is wrong in one direction
only is not measuring anything; it is subtracting a constant. Two fixes were
named at the time and they are not the same kind of change, so both were built
and measured before either was kept.

**Option A, scale the target to the frequency the split delivers.** Bookkeeping.
Nobody's training moves by one set; the ledger stops asking for volume the split
was never going to produce.

**Option B, give each muscle a second weekly touch.** A real training change. It
delivers more volume and changes the plan every existing user gets tomorrow.

### What the probe found before either was written

Sorting every ledger row by how many times the split actually touched the group
says the whole thing in one table. Intermediate and advanced only, no focus:

```
group        rows   under 0.8   avg sets   avg target   touches per week
triceps       344         291        6.0         12.4   1x:244  2x:100
biceps        364         297        6.6         12.4   1x:244  2x:120
traps         240         239        4.9         12.1   1x:240
forearms      227         226        4.8         12.3   1x:227
calves        378         376        5.6         12.0   1x:190  2x:188
obliques      134         134        3.9         12.1   1x:134
chest         416         111       10.6         12.3   2x:366  3x:50
lats          416          62       11.0         12.0   2x:232  4x:184
```

Every group the split touches once is under, every group it touches three or
four times is fine, and the two-touch groups are split down the middle. The
binding number is not the clamp and not the target on its own, it is the two
of them meeting: one touch times six sets is six, and the level is asking for
fourteen or sixteen.

Which makes the arithmetic case against B on its own, before any code: **two
touches is not enough either.** An advanced base of 16 over two sessions at the
top of the clamp is 12 sets, which is 0.75 of target and still counts as under.
Only three touches a week closes an advanced target, and no split in this file
is a three-touch split except lats on upper/lower.

### What the research says, which is not what was assumed

`knowledge/principles/volume-landmarks.md` is the source, and it contains the
frequency clause nobody had read against this code:

> A new trainee or someone training 2-3 days/week should sit near MEV-to-low-MAV
> per muscle, not chase MRV. Someone training hard 4-6 days/week with a real
> history can run mid-to-high MAV.

`BASE_WEEKLY_SETS` reads level and has never read frequency, so an advanced
lifter training three days a week was being handed the 4-6 day number and then
marked down for not reaching it. The weekly target is not a property of the
lifter alone, and it is not even a property of the week: it is per group, since
the same three day split hits lats four times and forearms once.

That same table also settles B. Its MEV column gives triceps and biceps 6 and
hamstrings/glutes 6. A three day intermediate getting 6 direct triceps sets on
top of roughly 12 sets of pressing is exactly the MEV-to-low-MAV the source
prescribes for somebody training three days a week. B would have pushed that to
12 direct sets, which is mid-MAV, which is the 4-6 day prescription handed to a
3 day trainee. The research argues for B where the split already allows it and
against inventing the second touch on a split that does not.

### B, built and measured anyway

Second touches added to the three day Push/Pull/Legs split at the cheapest
places the slot table allows: calves onto Push, core onto Pull, triceps isolation
onto Legs. Against A as the baseline:

```
                          A       A+B     delta
under 0.8, inter 3d    21.5%     27.0%    worse
under 0.8, advan 3d    20.1%     25.6%    worse
over-time-budget        1369      1493     +124
duplicate-in-week       8780      9532     +752
excluded-prescribed    12679     13219     +540
hurt-joint-prescribed  12679     13219     +540
```

Every column moved the wrong way. The second touch raises what the split could
deliver, the time trim immediately shaves the new tail accessory back off, and
the week ends further from its own target than before: one problem traded for
another, which is the thing the time budget exists to catch. The 752 extra
`duplicate-in-week` rows are the library running out of distinct calf and core
movements, and the 540 extra forced prescriptions are the same shortage seen
through the limits filter. B is not taken, and the numbers rather than the
argument are why.

Worth saying: the 4 day upper/lower already gives every group two touches and is
the only split that does, which is why it was the least bad in the original
table. Nothing was taken away from it.

### What shipped

`weeklyTargetFor` is now `min(what the level asks, what the week can deliver)`,
where the second half is counted off the finished week at
`MAX_SETS_PER_SESSION` per exercise, or `SHORT_DAY_SETS` on a short day. The
count is taken after the time trim rather than from `hits`, so a group that lost
its only accessory to the clock is credited with the smaller week it really got.

No prescription changed. `setsFor` still divides the level's number and still
clamps, so every set count is the set count it was the day before. What changed
is what the plan claims it was aiming at:

```
level         groups    under 0.8    over 1.25          under 0.8    over 1.25
                                        before                          after
beginner       32925        19.8%         3.1%              9.2%         3.1%
intermediate   22096        71.2%         0.0%             18.7%         0.0%
advanced       15270        77.9%         0.0%             16.0%         0.0%

inter 3d       10037        79.9%         0.0%             21.5%         0.0%
advan 3d        6654        87.6%         0.0%             20.1%         0.0%
advan 5d        3400        87.4%         0.0%              6.8%         0.0%
```

Every warning total is byte-identical to the run before it, which is the proof
that nothing in anybody's week moved: `same-group-twice-in-day` 19147,
`over-time-budget` 1369, `duplicate-in-week` 8780, all unchanged. The over
column cannot move either, and not by luck: a group's sets can never exceed
touches times the clamp, so a target capped at that number can only be
approached from below.

Beginners were not broken to fix the top: 19.8% under became 9.2% and the 3.1%
over is the same 3.1%.

**The residual under is now a real one.** The 16 to 20% left is groups whose
slots did not run at the top of the clamp: the time trim shaved the tail
accessory, or `enforcePriorityFloor` capped an unfocused lift next to a
prioritised one. Traps, forearms and obliques average 4.9 sets against a
deliverable 6. That is the number `volumeNotes.under` was always meant to be,
and it now points at the time budget rather than at arithmetic.

**The gap is announced, not absorbed.** `volumeNotes.frequencyCapped` carries
one row per group, with `wanted`, `target` and how many sessions it gets, and
`weeklyVolume[group]` carries `wanted` alongside `sets` and `target` so a reader
can tell "you hit your number" from "your number was lowered to what one session
a week can hold". One sentence reaches `dayNotes` and therefore the app: the
split trains these muscles once or twice a week, their weekly sets top out
below what the level would ask, and the answer is another training day rather
than more sets in the days that exist. An existing user's week is unchanged
tomorrow; what is new is that the app now says why.

### The advanced 28, closed

The focus-tier work left an advanced lifter at base 16 with a red 1.75x focus
holding a weekly TARGET of 28 sets, past anything in the volume research, and it
was left uncapped because capping the multiplier changes what every 1.4x
priority means too.

It is capped at the muscle's own MRV instead, from the table in
volume-landmarks.md, which is not the same lever: the multiplier still means
exactly what it meant, and the ceiling is the muscle's rather than the tier's.
`WEEKLY_MRV` caps the boosted week before `setsFor` divides it, so the ledger
and the prescription read one number rather than two that can drift. It sits
outside the +1 guarantee deliberately: an ask past what a week can recover from
is a reason to stop adding, not a reason to make the colour mean nothing.

It moves nothing today and that is measured, not asserted. Turning it on left
the sweep byte-identical in every warning total and every cell of the volume
table, because the per-session clamp binds first in every combination swept. The
largest number the ledger can now carry is 25, lats at MRV, and the largest
target observed is 24, which is four touches of an upper/lower week at the top
of the clamp and a real prescription rather than a ledger artifact. Traps and
forearms have no row in the source table and are left uncapped rather than given
an invented number; every split here touches them once a week, so the frequency
cap is what binds on them anyway.
