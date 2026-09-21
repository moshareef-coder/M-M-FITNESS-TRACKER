# Requests for the exercise library

For whoever owns `knowledge/exercise-library/`. Compiled 2026-09-12 from four
independent audits that each ended up asking for the same folder: a coverage
audit, a goal-tree audit, a 50,000 case fuzz run, and the classifier fix.

`knowledge/` is read only from our side, so none of this has been touched. Every
item below was measured with the engine's own predicates, not eyeballed, and the
counts come from an 864 scenario sweep over level, day count, equipment case and
joint limit. The full working is in the audit reports.

Ordered by how many real people hit it.

---

## 1. Two rows are tagged in a way that makes them unreachable

These are the cheapest fixes here and they are tagging, not new content.

**Split Squat and Bulgarian Split Squat are `primary: ["quads"]`.** Every lunge
slot in the engine asks for `groups: ["glutes"]`, so neither can ever be
selected, and four of the six lunge rows in the library are unreachable. Both
movements are genuinely glute movements as much as quad movements.

We tried to fix this on our side by widening the lunge slot to accept quads, and
measured it as worse: repeats fell, but "same muscle group twice in one day"
rose 51%, because it puts a quads lunge next to the quads squat that is already
the main lift. The clean fix is `primary: ["quads", "glutes"]` on those two rows.

Cost of leaving it: a bodyweight-only beginner currently gets Bodyweight Squat
on three consecutive days.

**Bird Dog is `primary: ["lowerback"]`,** and no slot in the engine names that
group, so nothing can ever select it. It is in the library and has never once
been prescribed. Either it wants `abs` among its primaries, or the engine wants a
lowerback slot, and the second changes every goal's week so we did not do it.

This one matters more than it looks: Bird Dog is one of the movements the
"aches and pains" goal explicitly asks for by name.

---

## 2. Dead Bug is missing entirely

Bodyweight, beginner, anti-extension core. It belongs in the abs category.

Two goals name it in their own guidance text (`pain` and `back-postpartum`), and
until today both were prescribing Crunch, Sit-Up, Russian Twist and Side Bend
instead, which is the opposite of what those goals say they want. We have fixed
that by excluding the wrong movements, but the right movement still does not
exist, so those goals are now training around a hole.

---

## 3. A library row cannot say what kind of movement it is

There is no field for movement class: flexion, rotation, anti-extension,
anti-rotation, isometric, carry.

Because of that, the safety exclusions for the pain and postpartum goals are a
hand maintained list of exercise names in our code. That list will go stale the
moment a row is added or renamed, and it will go stale silently.

A `class` or `pattern` field on each row would turn that list into a query.

---

## 4. Coverage gaps, with the movements that would close them

Named rather than described, so each is an afternoon rather than a project.

**Beginner hinge, and bodyweight hinge at any level.** The single most repeated
cell in the library: `hinge[hamstrings/glutes]` at beginner is a pool of one
(Glute Bridge) in 390 of 864 scenarios. Bodyweight only, it is empty and the slot
is silently dropped. With a bad back or hip, every candidate is ruled out and the
plan softens and hands a beginner a Stiff-Leg Deadlift anyway.
Suggested: Single-Leg Glute Bridge, Bodyweight Good Morning, Sliding Leg Curl,
Hip Hinge to Box, and a Dumbbell Romanian Deadlift tagged beginner.

**Bodyweight-only pull day is missing four slots.** Biceps has zero bodyweight
rows (162 empty slots, triple the next worst), traps zero, calves one and it is
intermediate, shoulder isolation zero at beginner. The pool is empty before any
limit filter runs, so the slot vanishes with no note.
Suggested: Towel Biceps Curl, Ring Curl, Chin-Up Negative tagged biceps primary;
Scapular Pull-Up, Prone Y Raise, Prone T Raise; a bodyweight Standing Calf Raise;
Pike Shoulder Tap, Wall Angel.

**The lunge slot holds exactly one beginner option.** Step-Up. That is why the
4 day split repeats it on both leg days in 94 of 208 plans. Fixing item 1 helps;
more options would help more.
Suggested: Reverse Lunge, Lateral Lunge, Bodyweight Step-Up.

**Three vertical presses exist and none is bodyweight.** A bodyweight-only person
gets zero and falls back to Wall Handstand Hold as an overhead press. With
shoulder pain all three are ruled out and Machine Shoulder Press is prescribed
anyway, immediately after the plan promises otherwise.
Suggested: Pike Push-Up (the highest value single row in the whole audit),
Landmine Shoulder Press, Half-Kneeling Single-Arm Dumbbell Press.

**Every quad squat is knee-tagged, so knee pain gets a Hack Squat.** 192
scenarios, the largest single driver of softened limits.
Suggested: Wall Sit, Spanish Squat, Box Squat, Terminal Knee Extension.

---

## 5. A difficulty ladder inside a movement pattern

**Asked for 2026-09-12, by the ramp-up sets in `engine/plan.mjs`.**

A ramp works up to the working weight in light sets of the same lift. For a
loaded movement the engine builds it from the weight. For a bodyweight movement
there is no weight to scale, so the ramp has to be an easier version of the same
movement: an incline push-up before a push-up, a box squat before a squat, a
band-assisted pull-up before a pull-up. research/13 open question 9 assumed
`calisthenics.mjs` might already carry this.

It does not. Every entry has `name`, `primary`, `secondary`, `equipment` and
`level`, and nothing that orders two movements on the same pattern by
difficulty. `level` cannot stand in: it ranks an exercise against the population,
not against its own siblings, so it will happily put a beginner-tagged movement
from one pattern in front of an intermediate one from another.

What would fix it: one field per entry naming the easier movement on the same
pattern, for example `regressionOf: "Push-Up"` or `easierThan`. A single link per
row is enough; the engine can walk the chain. Until it exists, **bodyweight main
lifts get no ramp at all**, which is currently 21% of main slots across the goal
matrix. That is a deliberate refusal rather than a gap, and it is written down in
`engine/plan.mjs` at `rampFor` and in `CONTRACT.md`.

---

## 6. Two numbers `formulas/` does not have: protein and water

**Asked for 2026-09-18, by the Recovery screen in `index.html`.**

`formulas/` answers every question that screen asks except two. `tdee.mjs`
gives maintenance calories, `goal-timeline.mjs` turns those into a daily target
for a goal, and `calorie-math.mjs` estimates burn. Nothing anywhere states a
protein target or a fluid target, so both are computed in `index.html` with
their sources in a comment beside them, which is the wrong place for a formula:
it cannot be tested by the gate and it will drift from the rest of this folder.

What we used, and would rather import:

- **Protein, grams per pound of body weight, by direction of the goal.** 1.0 in
  a deficit, 0.9 building, 0.8 otherwise. Sources: ISSN position stand on
  protein and exercise (Jager et al. 2017), 1.4 to 2.0 g/kg/day; Morton et al.
  2018, no further gain past about 2.2 g/kg; Helms et al. 2014, the top of the
  range while cutting, since that is what protects lean mass.
- **Water, ounces per pound of body weight, plus a training day's sweat.** 0.6
  oz per lb, plus 16 oz on a day with a session. Sources: US National Academies
  adequate intake (2005), 3.7 L a day for men and 2.7 L for women including
  food; ACSM position stand on exercise and fluid replacement (2007), losses of
  roughly 0.4 to 1.2 L an hour of exercise.

Both would sit naturally in a `formulas/nutrition.mjs` next to the other two,
taking the same profile shape `calculateTDEE` already takes. If they land there
we will delete our copies the same day.

---

## 7. Smaller data problems

- **Weighted Dip is tagged `equipment: "bodyweight"`,** so it appears on
  bodyweight-only weeks. Found by the fuzzer.
- **Three duplicate rows disagree with themselves.** Dead Hang (intermediate in
  one row, beginner in another), Hanging Leg Raise (advanced vs intermediate),
  Incline Push-Up (different secondaries).
- **No row anywhere uses the `novice` level.** The engine has a novice band and
  the library never populates it, so the engine's ceiling arithmetic is quietly
  doing that job instead.
- **Stretching has a gap for the people most likely to need it.** Both
  lower-back mobility moves carry `avoidIf: ["lowerback"]`, so somebody whose
  mobility goal exists *because* their back hurts loses both. A bodyweight-only
  person also has no lats static, because the only one needs a bench, and
  shoulder pain zeroes out the chest, shoulders, biceps and triceps statics
  simultaneously.

---

## 7. A run cycle for the motion rig  (added 2026-09-18, from the Activity screen)

`knowledge/motion` has a pose or a loop for every exercise this app prescribes,
and it has nothing for running, cycling, rowing, stepping or the elliptical.
That is consistent with `cardio.mjs` setting `posed: false`, and the reason
given there is right: an Easy Run is twenty five minutes at an effort, there is
no single frame that is it, and drawing one per session would produce twenty
seven near-identical pictures of a figure running.

But the activity screen now has a session on a clock with nothing on it, and the
screen whose entire subject is movement was the one screen with a still figure
on it. So the robot on the running screen is drawn in `index.html`, in CSS and
SVG, off the same `robotFaceSVG` bust the rest of the app uses, with legs, arms,
a bobbing torso and a ground line going past. It is ours and it is deliberately
crude.

What the library could give instead, and what `cardio.mjs`'s own comment already
proposes: **a handful of looping modes rather than a move per exercise.** Run,
ride, row, step, glide. One loop each, shared across every session in that mode,
which is five loops covering all twenty seven cardio sessions rather than
twenty seven poses. That is the shape the cardio library says it wants, and it
is the piece that would let the running screen use the real rig like every other
session screen in the app does.

**Partly delivered.** `knowledge/motion/moves/cardio.mjs` now carries a run, a
walk, an indoor ride and the stepmill, keyed by the cardio library's own session
names, so nineteen of the twenty seven sessions draw themselves on the real rig.
The hand drawn robot was deleted from `index.html` on 2026-09-21. What is still
missing is item 12 below.

---

## What we fixed on our side instead, so it is not requested twice

Nineteen exercises were being classified as the wrong movement pattern by our
own code, which cost both slot eligibility and starting load: an incline barbell
press was priced at 17.5 lb instead of 65. That was ours and it is fixed. Cable
Pull-Through and Back Extension were among them, which is why the beginner hinge
is partly solved already without any change here.

## 8. The Rive body never stops rendering (2026-09-18)

**Measured:** the Body tab runs at **7 fps** on a 4x throttled phone profile,
worst frame 236ms, and a CPU profile of the tab sitting perfectly still is 88%
"(program)", which is the Rive WASM runtime. It is the same on a build from
before this week, so this is long standing rather than new. Two canvases,
89x250 CSS each, 178x500 backing at DPR 2 and 267x750 on a real iPhone at DPR 3.

**Why:** `createBodyHeatmap` mounts with `autoplay: true` and a state machine,
so the runtime advances and repaints every frame forever. The body is a still
picture: once the palette and intensities are applied and the focus tween has
finished, nothing changes until the person taps a muscle or the heat map is
rebuilt.

**Asked for**, either one is enough:

1. Expose `pause()` and `play()` on the object `createBodyHeatmap` returns, so
   the app can stop a body that is not being interacted with. The app already
   knows when the tab is hidden and when a tween has landed.
2. Or have the module park itself: stop the state machine a frame after the
   last change, and wake it on `setPalette`, `setMusclePalette`, `focus`,
   `resize` and a pointer event. This is the better version, because every
   caller gets it without having to remember.

A third, smaller one, worth having either way:
`r.resizeDrawingSurfaceToCanvas()` takes an optional device pixel ratio in the
current runtime. Passing `Math.min(2, devicePixelRatio)` would cut the fill
cost by more than half on a 3x phone, on a drawing that is flat colour with no
fine detail.

**Not worked around in the app**, because the app cannot reach the Rive
instance and the only lever from here would be lying about `devicePixelRatio`
globally.

---

## 9. Two onboarding ticks have no beginner session in `cardio.mjs` (2026-09-18)

**Withdrawn 2026-09-19.** Swimming and Classes are no longer ticks: Mo cut the
styles to lifting, home, running, cycling, walking, yoga and Pilates, on the
grounds that every removed style was a place the engine had to refuse. Nothing
below is asked for any more; it is kept as the record of why.

Onboarding offers twelve training styles and `styles.mjs` maps each cardio one
onto a `mode` in `knowledge/exercise-library/cardio.mjs`. From 2026-09-18 the
engine builds the day itself for somebody who ticked no resistance style, out of
that library, so a mode with nothing the person can do is now a week we have to
refuse.

At beginner level the library offers running, cycling, walking, hiking, rowing
and elliptical. It offers nothing for:

- **swimming**, whose only row is `Easy Swim`, tagged intermediate
- **hiit**, which is what the `classes` tick maps to, and whose rows are all
  tagged intermediate

So a beginner who ticks Swimming, or Classes, gets a lifting session and a
sentence saying we could not build their week.

**Asked for:** one beginner row in each mode. A beginner swim is laps with rest
(something like 8 x 50m easy with 30 seconds between), and a beginner HIIT
session is a low-skill circuit with a long work-to-rest ratio rather than the
20/10 shape the intermediate rows use.

**Why we did not work around it:** `cardioFor` falls back to every session at
the person's level when the mode it was asked for has none, which is right for a
week planner choosing among several modes and wrong for one mode asked for by
name. Unfiltered it handed a beginner who ticked Swimming an Easy Spin on a
stationary bike, under a note reading "this week is cardio only, because that is
what you picked". `cardioSessionFor` in `engine/styles.mjs` now filters the
result back down to the modes that were asked for and refuses when nothing is
left, which is honest and is still one fewer person getting the week they chose.

---

## 10. Beginner yoga and Pilates run out of moves before a class is over (2026-09-19)

From 2026-09-19 the engine builds the day itself for somebody who ticked Yoga or
Pilates and no resistance style, out of `yoga.mjs` and `pilates.mjs` through
`engine/activity-session.mjs`. That made the size of the beginner pools visible
on the plan screen, where it had only been visible to a timer before.

Measured off the libraries as they ship, at beginner:

- **Yoga**: about 14 minutes of unique moves, so a 30 minute class is 3 rounds
  of the same 18 poses and a 45 minute one is 4.
- **Pilates**: about 8 minutes, so a 30 minute class is 4 rounds and a 45 minute
  one is 6. Six rounds of the same ten moves is a real thing a person will read
  on their plan.

Repeating is not wrong, a mat class does repeat and the session says out loud
how many rounds it is and how small the pool was. Six is past where that reads
as a class rather than as a library running dry.

**Asked for:** more beginner rows, Pilates first. Pilates has four categories
and the beginner half of them is thin; ten more beginner mat moves would take a
30 minute class from four rounds to two. Yoga is less urgent and would benefit
most in Balance and Core, which are its two smallest categories.

**Also worth having, and cheaper:** a `seconds` on the rows that are not 45
second moves. Every row in both libraries currently falls back to the default,
so a two minute Savasana and a 45 second Chair Pose are costed the same, and a
`perSide: true` on the single sided poses (Warrior I and II, Low Lunge, Tree,
Half Moon, Side Plank, Single Leg Stretch) would make the clock honest about
what a round actually takes.

**Why we did not work around it:** padding a class out with moves above the
person's level, or holding the same pose for longer to fill the minutes, would
both be the engine inventing content it does not have. The rounds are stated in
`workout.flow.rounds` and in a note, which is honest and is still a thinner
class than the person deserves.

---

## 11. Five cardio modes have exactly one session each (2026-09-19)

**Withdrawn the same day.** The five thin modes, and rowing and the elliptical
with them, are no longer offered anywhere: the styles sheet is down to running,
cycling and walking on the cardio side, and the activity sheet builds library
sessions for those three only (the stair master, the rower, the elliptical and
HIIT are a clock now). Nothing below is asked for; the table stays because it
is the measurement the decision was made on.

The level gate came off the app's three cardio pickers today. Until then the
plan generator asked `cardio.mjs` for `MY_PROFILE.level`, a column that does not
exist, so it asked at "beginner" for every person who has ever used the app.
Measured against the library as it ships, that meant ticking Running produced
Easy Run on all seven days of a week, and ticking Swimming, HIIT, Stairs or Jump
Rope produced a session in some **other** mode every single day, because
`cardioFor` answers a mode it cannot serve with everything else it has.

Asking the way `cardioSessionFor` already does, at the intermediate ceiling and
filtered by mode on the way out, fixes the wrong-mode half outright. What it
cannot fix is how thin some of the modes are. Distinct sessions a week can now
contain, per mode:

| mode | rows in the library | distinct sessions across a week |
|---|---|---|
| running | 7 | 6 |
| cycling | 6 | 6 |
| walking | 4 | 4 |
| rowing | 3 | 2 |
| elliptical | 2 | 2 |
| **swimming** | **1** | **1** |
| **hiit** | **1** | **1** |
| **stairs** | **1** | **1** |
| **jump rope** | **1** | **1** |
| **hiking** | **1** | **1** |

Five of the ten modes on the onboarding sheet are a single row. Somebody who
ticks Swimming gets Easy Swim on Monday and Easy Swim on Sunday and Easy Swim
next month, and the three-way Easy / Steady / Hard segment on the activity sheet
returns the same session for all three answers, because there is nothing else to
return. The app says that out loud rather than dressing it up, which is the
right behaviour and still a thin week.

**Asked for:** an easy, an interval and a long row in each of swimming, stairs,
jump rope and HIIT, so each of those modes has a three-way choice that is
actually a choice. Swimming is the most urgent: it is a mode people train
seriously and exclusively, and it is the only one of the five where a person is
likely to tick it and tick nothing else. Hiking is the least urgent, since a
hike is genuinely one kind of thing.

**Also worth having:** a non-machine HIIT and jump rope row. Both are tagged
`indoor: true`, and the venue filter on the activity sheet therefore has to
relax itself and print an apology for somebody skipping in a garden.

**Why we did not work around it:** the only workarounds available are inventing
sessions the library does not have, or handing somebody a different mode from
the one they ticked. The second is exactly the bug this change removes.

---

## 12. Five cardio modes still have no figure, and the app now draws nothing for them (2026-09-21)

Item 7 asked for five looping gaits and four of them exist. This is the rest of
that list, re-measured against the libraries as they ship today, because the
app's behaviour changed underneath it.

Every one of the 27 rows in `knowledge/exercise-library/cardio.mjs` checked
against `knowledge/motion/index.mjs` `hasMove()`:

| mode | sessions | drawn |
|---|---|---|
| running | 7 | 7 |
| cycling | 6 | 6 |
| walking | 4 | 4 |
| stairs | 1 | 1 |
| hiking | 1 | 1 |
| **rowing** | **3** | **0** |
| **elliptical** | **2** | **0** |
| **swimming** | **1** | **0** |
| **hiit** | **1** | **0** |
| **jump rope** | **1** | **0** |

Nineteen drawn, eight not. The eight are Easy Row, Row Intervals, Threshold Row,
Easy Elliptical, Elliptical Steady, Easy Swim, HIIT Circuit and Jump Rope
Intervals.

**What changed on our side.** Until 2026-09-21 every one of those eight, and
every bare clock including a yoga one, got a robot drawn RUNNING, because the
fallback beside the figure mount on the session stage was a running figure
rather than an absence. A run cycle on an elliptical is the app asserting
something false about what the person is doing. The fallback is now the
activity's own icon, the robot is deleted, and a mode with no gait shows a quiet
mark and the clock instead of a figure doing the wrong exercise.

So this is no longer "the stand-in is crude". It is "there is nothing on the
stage", on the one screen whose whole subject is movement, for anybody who rows,
swims, uses the elliptical, does a HIIT circuit or skips.

**Asked for, in the order they would earn their keep:**

1. **A row.** Three sessions ride on it, it is the commonest gym machine after
   the treadmill and the bike, and the catch-drive-finish-recovery cycle is a
   real loop rather than a pose. It is also the one where a wrong picture is
   most likely to teach a bad habit, so an authored one is worth more here than
   anywhere else on this list.
2. **A glide, for the elliptical.** Two sessions. Closest to what already exists:
   it is the ride's leg cycle standing up with the arms travelling, and it is the
   mode that looked most absurd under a run cycle.
3. **A skip, for jump rope.** One session, and the only one of these that is
   cheap: it is a small bounce with the wrists turning, and it needs no machine
   drawn behind it.
4. **A swim.** One session, and the hardest, because the figure is horizontal and
   the rig stands on a ground line. Worth saying out loud rather than leaving on
   a list: if the rig cannot lie down, the honest answer is that swimming never
   gets a figure and keeps the icon, and we would rather be told that than wait.
5. **HIIT is not a gait and we are not asking for one.** A HIIT Circuit is a
   sequence of whole exercises, so what would actually serve it is the library
   naming those exercises, at which point it becomes a class and draws itself
   pose by pose the way a yoga class already does. That is a request for
   `knowledge/exercise-library/cardio.mjs`, not for the rig.

One loop each, shared by every session in the mode, exactly as item 7 proposed.
The mount needs no change: `mountMotionFigures` keys on the library's session
name, marks anything it cannot draw `fig-none`, and the icon steps aside by
itself the day a name starts resolving. Nothing in `index.html` has to know
which modes are covered.

**Why we did not work around it:** authoring gaits in `index.html` is how the
running robot happened, and the robot then outlived its own honesty by being the
fallback for everything that had nothing. We are not drawing a second one.
