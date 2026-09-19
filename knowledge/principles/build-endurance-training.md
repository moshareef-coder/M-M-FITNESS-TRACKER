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

- **Injury-risk research on graded programs is genuinely mixed.** One
  study (Buist et al. 2007) found no measurable injury-reduction effect
  from a graded program specifically, which is a real complication worth
  being honest about rather than overselling the evidence as unanimous —
  the 50%-cap design choice here is grounded in the documented dropout
  pattern (which is well-supported) more than in a settled injury-rate
  claim (which is more contested).
- **Pace goals and cycling** aren't covered by this formula yet — this
  covers the distance/continuous-time case only. A pace goal ("5-minute
  mile") needs interval work at faster-than-goal pace layered on top of a
  base, which this doesn't attempt yet. Flagging as a gap, not silently
  expanding scope to cover it here.
- **Where "Build endurance" and the broader "Train for an event" research
  in `real-goals.md` meet** (a half marathon, Hyrox) isn't reconciled
  yet — this doc covers the foundational continuous-running case that a
  date-driven event goal would presumably build on top of, but that
  connection hasn't been designed.
