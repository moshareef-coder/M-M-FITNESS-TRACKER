# Build endurance training

Covers the "Build endurance" goal tile — the entry-level, general-capacity
version of `real-goals.md`'s broader "Train for an event" category (which
also covers date-driven goals like a half marathon or Hyrox once someone
has a specific target, not just "build my endurance up"). This doc covers
the foundational case: going from limited or no continuous running ability
to a real, sustained aerobic base.

## Why this needed a genuinely new formula, not a fix to an existing one

`exercise-selector.mjs`'s whole model — sets, reps, load, progressive
overload — has nothing to say about pacing or connective-tissue adaptation.
Running progression is a different problem: cardiovascular fitness adapts
within days, but the tendons, shins, and bone that actually get injured
adapt over weeks. That mismatch, not lack of effort, is the leading cause
of beginner running injury and dropout. `cardio-progression.mjs` is a new
file for that reason, not an extension of the weight-training machinery.

## The specific, well-documented failure point this was designed around

The traditional Couch-to-5K program has a widely-identified dropout wall:
week 4 to week 5 jumps continuous running time by 72.7% in a single step
(roughly 11.5 minutes to 20 minutes) — a jump directly named as the point
most beginners quit. This isn't a vague "progress gradually" principle,
it's a specific, avoidable number. `MAX_WEEKLY_RUNTIME_GROWTH` caps
week-over-week growth at 50% specifically to not reproduce that jump.

## Real research backing walk-run as legitimate, not a lesser version

A 2017 study (*BMJ Open Sport & Exercise Medicine*) found walk-run methods
and continuous slow running produced statistically similar VO2 max
improvements over 8-12 weeks in previously sedentary adults — walk-run
isn't training wheels, it's an evidence-equivalent approach for this
population specifically. Worth being explicit about this in any copy shown
to users: walking intervals aren't a consolation prize.

## Structure

- **3 sessions/week** — standard across every real program checked, and
  not arbitrary: it's close to the minimum frequency needed to build
  aerobic fitness while giving connective tissue real recovery time
  between sessions. Matches the cardio-modality floor `training-mix.mjs`
  already establishes for this category generally.
- **A recovery week every 4 weeks** — repeats the previous week's numbers
  rather than progressing, same principle as `periodization-deloads.md`
  applied to a different kind of fatigue (connective-tissue adaptation
  time, not just muscular fatigue).
- **Week 1 starts at a genuine floor** (60s run / 60s walk), not already a
  step ahead of it — an earlier draft of this formula applied growth from
  the first week and started beginners at 90 seconds, which is more
  aggressive than any real program checked opens with. Caught by testing
  the actual output, not assumed correct from the formula alone.
- **The walk interval shrinks but doesn't disappear early** — held at
  `max(60s, 75% of the run interval)` until the run interval reaches the
  target, matching every real program checked; none of them cut the walk
  break just because the run interval got longer, only once continuous
  running is the actual goal being hit.

## What this is genuinely honest about not doing

This deliberately doesn't replicate any single named program's exact
week-by-week numbers (Couch-to-5K's specific schedule, the NHS version,
etc.) — the brief is explicit that we write our own content rather than
copy a creator's programme, and the underlying research (walk-run
equivalence, the connective-tissue adaptation timeline, the specific
72.7%-jump failure point) is what actually informs the numbers here, not
any one program's copyrighted schedule. The resulting plan lands close to
comparable real programs (roughly 9-12 weeks from zero to 30 minutes
continuous, depending on whether recovery weeks are needed) without being
a copy of one.

## Open questions, not yet resolved

- **Where "Build endurance" and the broader "Train for an event" research
  in `real-goals.md` meet** (a half marathon, Hyrox) isn't reconciled
  yet — this doc covers the foundational continuous-running case that a
  date-driven event goal would presumably build on top of, but that
  connection hasn't been designed.

## The other two tune-question branches: speed and general stamina

The live `build-endurance` tune question ("Endurance for what?") actually
offers three options, not one — confirmed directly in `index.html`'s
`GOAL_TUNE`. Everything above covers "Going further" (distance). The other
two needed genuinely different logic, not a variant of the same mechanic.

### "Going faster" (speed) — layered on the easy-run base, not separate

Research is consistent on one point across every source checked: **even
for a pure speed goal, most weekly running volume should stay easy.**
Beginners do one hard session a week; intermediate/advanced do one to two.
The rest of the week is still the easy continuous running from the
distance case above — speed work is an addition on top of a base, not a
replacement for it.

- A classic, widely-cited study found 4x4-minute intervals at 90-95% max
  heart rate improved VO2max by roughly 7.2% over a training period — the
  structure `buildSpeedWeek()` uses for advanced trainees directly.
- Beginners start far short of that: 6x30-second hard efforts with
  generous recovery (90s) is the standard entry point across sources
  checked, not the full VO2max-interval structure — starting a beginner
  on 4-minute hard intervals would be a serious overreach.
- Intermediate uses a "cruise interval" / tempo format instead (3x10min
  at a comfortably-hard pace, 2min jog recovery) — less neurologically
  taxing than short VO2max intervals, so it's sustainable more often,
  which matters since this is the one hard day of the week and shouldn't
  leave someone unable to train for several days after.
- **No %HRmax targets** — the app has no way to verify heart rate without
  a wearable, and a target it can't check is worse than an honest
  effort-based instruction. Intensity is described by effort ("hard, not
  all-out," "comfortably hard") instead, matching the practical "talk
  test" language used for the general-endurance case below.
- **Growth is deliberately more conservative than the distance case** —
  15%/week versus distance's 50%, capped after week 8. High-intensity
  interval work is more taxing and more injury-prone than easy continuous
  running, so it should progress slower on purpose, not by oversight.
  Round count grows; interval duration itself doesn't, since growing both
  duration and frequency at once is exactly the kind of double-progression
  that causes overuse injury.

### "Everyday stamina" (general) — a standing habit, not a program with an end

This is a genuinely different shape from the other two: there's no
graduation point. Someone isn't working toward being able to do something
they can't do now (run continuously, hit a faster pace) — they're
building and then maintaining a standing weekly activity habit.

- **150 minutes/week of moderate intensity, or 75 minutes/week of
  vigorous** — this is about as close to unanimous as public-health
  guidance gets: ACSM, CDC, the American Heart Association, and the
  American College of Cardiology all converge on the identical number.
  Not one source's opinion.
- **Intensity uses the "talk test," not a %HRmax target** — moderate means
  you can talk but not sing; vigorous means you can't hold a conversation.
  Every source checked uses this same practical marker, and it doesn't
  require any equipment to check, unlike a heart-rate zone.
- **Ramps up over 6 weeks rather than starting a sedentary person straight
  at 150 minutes** — the American Heart Association explicitly recommends
  increasing amount and intensity gradually rather than jumping straight
  to the target, the same underlying principle as the distance case's
  connective-tissue argument, applied here to general deconditioning
  rather than running-specific impact stress.
- **Spread across 5 sessions/week, not fewer/longer ones** — matches how
  the guideline itself is phrased (30 min x 5 days) and is generally
  easier to sustain as a habit than compressing the same total time into
  fewer sessions.
- **Deliberately modality-agnostic** — this doesn't prescribe running
  specifically; walking, cycling, stairs, swimming, anything that clears
  the talk-test intensity bar counts, matching the actual phrasing people
  use for this goal ("keep up with my kids," "not out of breath on
  stairs") which was never about running in the first place.

## What's still open after this pass

- **Injury-risk research on graded running programs is genuinely mixed** —
  one study (Buist et al. 2007) found no measurable injury-reduction
  effect from a graded program specifically. The distance case's 50% cap
  is grounded in the well-documented dropout pattern, not a settled
  injury-rate claim; worth not overselling the evidence as more unanimous
  than it is.
- **"Distance" and "speed" are still running-specific** — cycling isn't
  covered by either, even though it's one of the tune question's own
  stated examples ("Longer runs or rides"). "General" is modality-agnostic
  by design; the other two aren't yet.
- **Where this meets the broader "Train for an event" research in
  `real-goals.md`** (a half marathon, Hyrox) still isn't reconciled —
  this covers the foundational continuous-running and general-fitness
  cases a date-driven event goal would presumably build on top of.
