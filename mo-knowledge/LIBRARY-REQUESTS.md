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

## 6. Smaller data problems

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

## What we fixed on our side instead, so it is not requested twice

Nineteen exercises were being classified as the wrong movement pattern by our
own code, which cost both slot eligibility and starting load: an incline barbell
press was priced at 17.5 lb instead of 65. That was ours and it is fixed. Cable
Pull-Through and Back Extension were among them, which is why the beginner hinge
is partly solved already without any change here.
