# Recomp training

Covers the "Recomp" category from `real-goals.md` — shown in the app as "Lose
fat and build muscle" (`tone-lean-abs` in the current goal-tiles system).
Aesthetic phrasing ("get toned," "get lean and defined") and "want both at
once" phrasing are the same request, per that file.

## A real routing bug, caught before it went live

`normalizeGoal()` previously had no dedicated bucket for recomp at all — the
goal string `"Recomp (lose fat, gain muscle)"` contains the substring
"muscle" and was silently falling into the same bucket as Build Muscle. For
**training structure**, that accidentally produced the right answer (recomp
genuinely wants the same whole-body, hypertrophy-biased split build-muscle
uses — see below). For **calories**, it would have been actively wrong: a
recomp user would have gotten a calorie *surplus* instead of the small
deficit this goal actually needs, since `goal-timeline.mjs` wasn't
distinguishing them either. Since `goal-timeline.mjs` isn't wired into the
live app yet, this hadn't caused real harm — but it was exactly the kind of
landmine worth defusing before it did. Fixed: recomp is now its own
explicit `normalizeGoal()` bucket, correct by design rather than by an
accidental substring match, with a dedicated `isHypertrophyStyle()` helper
so training code can still (correctly, deliberately) treat recomp and
hypertrophy the same where they should be.

## The calorie side: a small, fixed deficit — not a surplus, not a big cut

Every source checked converges tightly on the same range: roughly
**200-300 kcal/day below maintenance**, sometimes called the "minimum
effective deficit." This is much smaller than the deficit used for pure
weight loss (which can run up to the 20%-of-TDEE cap already in
`goal-timeline.mjs`). Going deeper than this measurably backfires — a
deficit above ~750 kcal/day reduces muscle protein synthesis, depletes
training glycogen, and elevates cortisol in ways that directly work against
what recomp is trying to do. The mechanism that makes recomp possible at
all: in a person with meaningful fat stores, stored body fat can supply
enough energy for muscle protein synthesis even while total intake sits at
or slightly below maintenance — the calories don't have to come from food
in a surplus, they can come from fat being liberated for fuel.

**Protein needs to be higher than a normal diet** — 1.6-2.2 g/kg bodyweight
(roughly 0.7-1 g/lb) is the consistent range across sources, higher than
typical intake recommendations, because muscle needs adequate amino acids
available even while calories are restricted. **The app doesn't currently
track macros, only total calories** — this is a real gap for this goal
specifically, since hitting the calorie target without hitting protein
would likely produce disappointing recomp results even if the calorie math
is exactly right. Flagging as a gap rather than expanding scope to build
macro tracking here.

Implemented: `estimateGoalTimeline({ direction: "recomp", tdee })` — a
fixed 250 kcal/day deficit (middle of the 200-300 range), still passing
through the same safety floor (`MIN_DAILY_CALORIES`) the deficit side
already had, so an unusually low-TDEE person doesn't get pushed under a
safe minimum even at this much smaller deficit.

## Why this doesn't return a "weeks to X lb" estimate

Unlike lose-weight and build-muscle, recomp deliberately doesn't promise a
scale-based timeline. The whole point of recomposition is that fat loss and
muscle gain can happen at the same time — losing five pounds of fat while
gaining five pounds of muscle leaves the scale exactly where it started,
even though the person's actual body composition changed substantially.
Promising "you'll be down 10 lb in 8 weeks" would be actively misleading
for this specific goal, in the same spirit as the honesty principle applied
to unrealistic weight-loss timelines elsewhere. `estimateGoalTimeline`
returns a `scaleCaveat` string for this direction specifically, meant to be
surfaced in the UI rather than a bare number implying the scale is the
metric that matters.

## Training structure: identical to build-muscle, by design

Whole-body, hypertrophy-biased split (upper/lower alternating, ~2x/week
frequency per muscle group), same rep range (6-15), same elevated
sets-per-exercise scheme as build-muscle — all inherited automatically now
via `isHypertrophyStyle()` rather than duplicated. This matches the
research directly: going all-in on a pure bulk or a pure cut is what people
describing this goal say already failed for them (`real-goals.md`), so the
training stimulus should look like build-muscle's, not like a fat-loss
circuit or a pure strength program.

## Sex and anthropometry

No changes from `sex-and-anthropometry.md`'s general guidance — no default
volume/load scaling by sex, since neither hypertrophy response nor the
training structure here differs meaningfully by sex.

## Equipment variants

Identical to `build-muscle-training.md`'s equipment table — same movement
patterns, same exercise substitution logic, since the training side of
recomp and build-muscle are the same by design.
