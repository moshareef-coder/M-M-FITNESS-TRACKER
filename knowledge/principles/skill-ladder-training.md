# Skill ladder training: first pull-up, first push-up

Covers the "skill ladder" category from `real-goals.md` — confirmed to
belong under "Get stronger" via `index.html`'s own `RETIRED_GOALS`
migration log, not a category needing its own top-level tile. Mo's own
comment there: *"A first pull-up and a first push-up are bodyweight
strength, and 'Lift my bodyweight' is get-stronger's own word for that."*

This doc covers what still needed building once that placement question
was settled: the two goals need genuinely different progression
mechanics, not a shared one.

## Why pull-up and push-up aren't the same kind of problem

Already established in `real-goals.md`: pushing strength in typical adults
runs roughly 1.5-2.7x pulling strength, since most training and daily life
is push-dominant. Pull-up struggles are a real, measured weak-link
problem; push-up struggles are usually a general strength or core-
stability gap, since pushing is normally the *better*-trained pattern.
That difference carries straight through to how each is built here.

## First pull-up: an assistance-reduction ladder

This is genuinely not the same shape as the leverage ladder already built
for general bodyweight progression (`progressiveBodyweightReps` /
`findHarderBodyweightVariation` in `exercise-selector.mjs`), which climbs
toward *harder* variations as someone gets stronger at a movement they can
already do. Here, someone starts unable to do the base movement at all and
needs *less* help over time — the opposite shape.

**Stage 1 — Dead hang.** Reuses the existing `isHold`/`progressiveHold`
mechanic already in `exercise-selector.mjs` for the hold itself; this only
adds the graduation checkpoint. Odin Fitness's beginner benchmark: hold 30+
seconds, then move on.

**Stage 2 — Band-assisted work (a real gap, now filled).** The exercise
library had `Dead Hang` and `Negative Pull-Up` but **no band-assisted
entry at all** — the standard entry point for someone who can't yet
control a full negative. Added `Band-Assisted Pull-Up` to
`calisthenics.mjs`. A real, peer-reviewed number backs this specifically:
a 2019 study in the *Journal of Strength and Conditioning Research* found
participants doing banded pull-up work 3x/week with weekly band reduction
added an average of 4-5 strict reps over 10 weeks, versus 1-2 reps in a
lat-pulldown-only comparison group.

Assistance is tracked as a relative 0-1 scale (1.0 = maximum), not named
band colors or tensions — band brands vary, and the app has no way to
verify what anyone actually owns. Same approach already used for cardio
intensity (effort-based language instead of an unverifiable %HRmax
target). Progression: climb reps toward 8 at a given assistance level
(multiple sources converge near this number), then reduce assistance one
step and reset reps lower — the same "harder tier starts easier" shape
used for the leverage ladder elsewhere.

**Stage 2 (parallel) — Negative pull-ups.** A specific, sourced
advancement criterion multiple programs converge on: **4×5 reps with an
8-second controlled descent, then attempt one full pull-up.** The
physiological reason this works for someone who can't do a single
concentric rep at all: eccentric contractions can handle roughly 1.5x the
concentric load, so a controlled lowering is achievable well before a
full pull is.

**A real disagreement in the field, worth being honest about rather than
smoothing over:** one source argues negatives are less effective than
commonly claimed, since the nervous system recruits fewer motor units
eccentrically than concentrically, and favors building lat-pulldown
strength toward bodyweight instead, adding assisted-pull-up practice only
once that approaches parity. Both views have real backing. Negatives are
used here because they're the more broadly-corroborated approach across
sources checked and need no equipment beyond a bar — not because the
alternative view is wrong.

**Attempting a real pull-up** requires both tracks to agree — band
assistance fully removed *and* negative descent at the 8-second
threshold — not just one (`readyForPullUpAttempt()`). Requiring
agreement between two independently-sourced criteria is more conservative
than either alone, deliberately, given how much a first real attempt
matters for someone who could otherwise stall out on a near-miss.

## First push-up: reuses the existing ladder mechanic, with one real gap filled

Push-up needed less new code — the general bodyweight leverage ladder
already exists and already has a real, usable sequence: Wall Push-Up →
Incline Push-Up → Push-Up → Diamond Push-Up → One-Arm Push-Up.

**The gap:** `findHarderBodyweightVariation()` only bumps across LEVEL
tiers (beginner → intermediate → advanced) — but Wall Push-Up, Incline
Push-Up, and standard Push-Up are **all** tagged `beginner` despite being
meaningfully different difficulties. The general mechanic has no way to
sequence *within* a tier, so a true first-push-up beginner needs an
explicit ordering instead: `PUSH_UP_LADDER = ["Wall Push-Up", "Incline
Push-Up", "Push-Up"]`, walked directly via `progressivePushUpLadder()`
rather than the level-tag-based lookup.

Graduation per rung: 8 clean reps (matching the same convergence point
used for band-assisted pull-up work above) — enough to confirm real
control before moving on, not the general bodyweight ceiling of 30, since
this is a skill-ladder goal with a specific finish line (one clean rep of
standard Push-Up), not an ongoing strength-training target. Testing a full
trajectory: 19 sessions from zero to graduation, roughly 6-7 weeks at
typical frequency — shorter than the pull-up timeline, consistent with
push-up being the smaller strength gap of the two per the research above.

## What this doesn't cover

- **Scapular pulls and inverted rows**, mentioned as supporting work in
  several pull-up sources, aren't built as a distinct stage — folded
  into the assumption that Get Stronger's regular pulling work already
  covers this, rather than adding a fourth parallel track for scope
  reasons.
- **The onboarding UI side** — a tune-question option for "a specific
  movement" (mirroring `build-endurance`'s `kind: "choice"` pattern)
  still needs to exist under Get Stronger for someone to actually reach
  this path. Formula-only in this pass, per the project's `index.html`
  boundary.
