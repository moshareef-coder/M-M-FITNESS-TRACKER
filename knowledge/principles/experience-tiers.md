# Experience tiers (beginner / intermediate / advanced)

Training age alone is a weak signal — someone can train poorly for ten years
and still be a true beginner in every way that matters for programming. The
more reliable classification uses three axes together, and should shift over
time as real logged data comes in rather than staying fixed from onboarding.

## The three axes

1. **Rate of progress** — the single best signal, and the one this app is
   naturally positioned to measure from logged history:
   - Beginner: can add load to a lift almost every session (multiple times
     a week).
   - Intermediate: adds load roughly weekly to monthly.
   - Advanced: progress comes every few weeks or longer, and needs real
     periodization (see `periodization-deloads.md`) to keep moving at all.
2. **Relative strength / bodyweight-ratio benchmarks** — useful as a
   spot-check, especially before any logged history exists. Rough
   commonly-cited landmarks: bodyweight bench press and roughly a
   bodyweight squat sit near the beginner→intermediate line for most
   recreational lifters; 1.35x bodyweight squat is a couple years in;
   1.5x bodyweight squat and 2x bodyweight deadlift are more like 5-6 years
   of dedicated training. These vary a lot by source and body size — use
   as orientation, not a hard cutoff.
- 3. **Consistent training age** — the weakest axis alone, but a fine
     starting point when there's no other data yet. A commonly used rough
     mapping: 0-6 months = beginner, 6-12 months = novice, 1-3 years =
     intermediate, 3+ years = advanced. This should be treated as a
     provisional label to be overridden by the other two axes as soon as
     real data exists.

Years of gym membership does not equal training level — someone training
inconsistently or with poor programming for years can still show
beginner-level rate of progress. Rate of progress should always win over
raw training age when they disagree.

## Cold-start classification (no logged history yet) — default, don't ask

Consistent with the product's "ask the goal, then tell them the plan" rule
— and more specifically: **the app tells the trainee what to do, it
doesn't ask them to self-report their level.** Self-reported experience is
notoriously unreliable (people both over- and under-estimate), which is
exactly why `deriveTraineeLevel()` is already built around session count,
not a survey question. That principle should extend to a true cold start
too, not just to reclassification later:

- **Default every new trainee to beginner-tier programming from session
  one.** No "beginner / intermediate / advanced" picker, no "how long have
  you been training" question. This costs almost nothing — a genuinely
  advanced lifter given a beginner-tier session for their first day or two
  isn't harmed by it, while a true beginner given advanced-tier volume or
  load from a bad self-report could be.
- The only place a number is worth capturing is the one already collected
  for other reasons — bodyweight (needed for `coldStartWeight()` and TDEE
  math regardless of this) — which lets `COLD_START_MULTIPLIER` produce a
  sensible first-session load without asking anything level-specific at
  all.
- From there, reclassification is fast and automatic (see below) — a
  genuinely advanced trainee will blow past beginner-tier volume and load
  within a session or two of real logged performance, and the tier
  self-corrects without ever having asked them anything.

## Reclassification from logged history

Since there's no self-report to begin with, the tier is purely a function
of logged behavior from day one, and should update quickly rather than
staying fixed:

- Someone defaulted to beginner but adding load almost every session with
  clean technique and no missed reps should move toward intermediate-tier
  programming within the first few sessions — the algorithm shouldn't wait
  weeks to notice someone is clearly not a true beginner.
- Someone who plateaus or misses reps early should simply stay at
  beginner-tier programming longer — there's no self-report to "correct,"
  the tier just reflects what's actually been observed so far.
- The relative-strength benchmarks (bodyweight-ratio landmarks above) are
  still useful as a sanity check once a trainee logs a real lift number,
  but they inform the tier, they're never asked for directly.

## How this should shape a generated program

- **Beginner tier**: program near MEV to low-MAV (`volume-landmarks.md`),
  cap intensity around RPE 7-8 (`rpe-autoregulation.md`), and default to
  near-linear per-session load progression per `progressive-overload.md` —
  this is the population that mechanism works best for.
- **Intermediate tier**: move into mid-MAV, introduce weekly or monthly
  undulation rather than pure linear progression, and start watching for
  deload triggers proactively rather than reactively.
- **Advanced tier**: needs real periodization structure
  (`periodization-deloads.md`), volume closer to MAV/MRV managed
  deliberately across a block, and progress measured in months, not weeks —
  a flat "add weight this session" rule will just produce missed reps for
  this group.
- Re-derive the tier periodically from logged history rather than locking
  it at onboarding — this is a pure function of past sessions, consistent
  with the "no fetching, no external state" rule for planning functions.
