# Merged with Jawa's real-goals research

Jawa Abdulal ran the same assignment independently, from her own sources, on her own
branch (`origin/jawaabdulal-patch-1`, folder `knowledge/`). Mo read both and decided we
fold hers into ours rather than run the two side by side. This file is the honest
accounting of that merge: what agreed, what she had that we did not, what we had that she
did not, and the one place we genuinely disagree, which is left unresolved on purpose.

Her original file has been removed from this folder now that it is merged. It lives on her
branch. Her URLs are in `../sources.md` under "From Jawa's research".

What actually changed in our files is at the bottom, under "What this merge changed".

## Where we agree, having got there separately

Two people, two source sets, two vocabularies, and the same shape came out. That is the
most useful thing in this document, because agreement arrived at independently is worth
more than either file's confidence in itself.

| Her category | Our bubble | Note |
|---|---|---|
| Skill ladder (first pull-up, first push-up) | `do-a-thing` "Hit a milestone" | Both of us pulled this out as a genuinely new plan type that no existing goal reaches. Both of us said it needs a real regression ladder, not indirect muscle work. |
| Running goal (distance or pace) | `run-5k`, `faster-mile`, `event-run` | Both of us noted the app has no running plan type and no concept of a date. She splits distance from pace; we split 5K from mile from race. Same content, different cut. |
| Starting context as a cross-cutting modifier, not a goal | `cross_cutting_modifiers` plus `deferred_constraints_screen`, and the `returning` / `restarting` logic in `engine/training-age.mjs` | This is the strongest agreement. She says returning-after-a-break and older-or-post-injury are one mechanism pointed two ways, layered on whatever goal was picked. We say the same thing in `research/11` Part 4b and we already compute the "faster" half from logs rather than asking. |
| Everyday fitness / no specific target | `feel-better`, and `dont-know` under `consistent` | She argues a vague non-answer should default into the functional-fitness plan rather than force a choice. That is our `dont-know` child, and her point that "stay consistent" does not capture the motivation is the same point our Part 5 makes when it says "Stay consistent" is two different things. |
| Lose weight is one category with optional extras | `lose-weight` with `lose-by-date` and `lose-belly` | She collapses date and body part into follow-up questions on one plan. We keep them as children because a child is one tap, not an intake field, but the plan is the same plan and the spot-reduction correction is copy in both. |
| Recomp is real and badly named | `tone-lean-abs` "Tone up" | She keeps the word "recomp" as the internal category and notes Fitbod names "toning" on the onboarding screen. We renamed the button to "Tone up" for the same reason. Same conclusion, and she reached it from app-store evidence where we reached it from autocomplete. |

## Where she has something we do not

Four things. All four are now merged.

### 1. Push strength runs roughly 1.5 to 2.7 times pull strength in typical adults

This is the best single finding in her file and we did not have it. It turns "first
pull-up" from a generic skill goal into a **weak-link problem with a known direction**.
Most people's training and most of daily life is push-dominant, so the pulling pattern is
not merely untested, it is genuinely undertrained. That justifies giving lats, biceps,
rear delts and grip disproportionate volume rather than the balanced allocation a normal
hypertrophy split would hand out.

And the mirror of it, which is the part we would never have guessed: **a failed push-up is
usually not a chest problem.** Pushing is typically the better-trained pattern, so failing
a push-up is more often general beginner strength or the core stability needed to hold a
rigid plank under load. Programming more chest volume at somebody who cannot hold a plank
is treating the wrong muscle.

Merged into `goals/goal-tree.json` (`first-pullup` and `first-pushup` numbers and plan)
and into `engine/goal-engine.mjs` (priority groups, with the ratio cited in a comment).

### 2. Plateaus are not a goal, they are a signal

Nobody picks "I am stuck" on day one, so it does not belong in an onboarding taxonomy at
all. But "stuck at the same weight for weeks", "my bench has not gone up in 8 weeks" and
"have not moved on the scale in a month" came up constantly in her forum reading. Her
conclusion is that this is something the algorithm has to **detect from the person's own
logs and respond to automatically**, which connects to the brief's open question about how
much a plan should change between 0 and 60 logged sessions.

We had none of this. Our `training-age.mjs` measured whether linear progression was still
working, which is the same data looked at from the opposite end, and it never asked the
question "has this specific lift stopped moving". It does now:
`detectPlateau({ logs, today, weeks })` is her contribution and the comment in that file
says so.

### 3. Fear of reinjury, and 1 to 2% muscle loss per year after 50

Two numbers on the slower-ramp side of the starting-context modifier that we gestured at
and she sourced.

Fear of reinjury is the single most commonly cited psychological barrier to returning to a
prior activity level after injury, at roughly two thirds of people who name a psychological
barrier at all (her citation is the ACL return-to-sport literature, Zarzycki et al. and
Lentz et al.). Our `02-age.md` and our deferred-constraints screen both assume the barrier
is physical capacity. She is saying the barrier is usually belief, and that changes what
the on-ramp is for: it exists so somebody can discover their own capacity, not so we can
hard-code a ceiling they never asked for. That framing is better than ours and we have
taken it.

Inactive adults lose about 1 to 2% of muscle mass per year after 50, which resistance
training directly counteracts. Our `02-age.md` says age changes less than people assume
and gives no number for the thing it does change. Hers is the number.

### 4. One cheap placement question

She proposes asking exactly one question to place somebody on a ladder: "can you hang from
a bar for 10 seconds? can you do a knee push-up?" for the skill ladder, and "can you run
continuously for 5 minutes?" for the running goal.

This directly contradicts our position. It is the real disagreement and it gets its own
section below.

## Where we have something she does not

Not scored as a win. Listed because the merge should not quietly lose our side either.

- **Nine families against her seven.** Her consolidation principle is deliberate and
  defensible: a category earns a row only when it needs a different calorie direction, a
  different progression structure, or a plan type the app lacks. By that test she is right
  to collapse. Our test was different: a bubble earns a row when it is a distinct thing
  people say, because the first screen's job is recognition, not taxonomy. The families
  she does not have as top-level rows are **train for an event** (Hyrox went from 570k to
  1.5M participants in a season, near-even sex split, and it has a doubles format that is
  literally our product) and **get back into it** as a first-class entry rather than a
  modifier. Her modifier treatment of the second is arguably cleaner; the event family is
  a real gap.
- **The say-versus-search gap.** Surveys put building muscle first, at 50% in two
  consecutive HFA/Kantar waves of n=2,000. Search puts fat loss ahead of muscle by about
  ten to one, 486k a year against 52.8k. Both are true, and the design consequence is
  specific: lead with what people are proud to say and put fat loss right there, unjudged,
  because it is what most of them came for. Her file works from phrasing without a volume
  layer, so this tension does not appear in it.
- **The 48% mobility finding.** Mobility, flexibility and posture went from outside the
  top three to second place in one year of HFA/Kantar polling. It is absent or an
  afterthought in Fitbod, Freeletics and Nike Training Club. It is five to ten minutes a
  day of work and nobody offers it. Not in her taxonomy.
- **The Fitbod cohort numbers.** 389,481 users, 100,709 of them beginners: 10.1% of
  beginners still adherent at 12 months, median dropout week 19, and first-28-day training
  frequency the strongest predictor of anything. Training goals were not even in the
  dataset. That is the number that reframes both of our files, because it says the goal
  taxonomy matters only if week five happens.
- **The honest-timeline math, as running code.** "Fast" is the suffix on nearly every goal
  people search, so `resolveGoal` answers the fantasy with the reachable number and the
  date, computed from bodyweight and training age, before it says anything else. Her file
  says to flag unrealistic timelines; ours computes the flag.

## The disagreement, left open

**One cheap placement question, or none.**

**Her position.** Ladder goals cannot be programmed without knowing where on the ladder
somebody stands. A 265 lb never-trained beginner and a 140 lb ex-gymnast asking for a first
pull-up need different first sessions, and no data we hold distinguishes them on day one.
One binary question ("can you hang from a bar for 10 seconds?") costs one tap, is
answerable without embarrassment, and replaces weeks of the plan being wrong. The same
applies to running: "can you run continuously for 5 minutes?" is the difference between a
run-walk plan and a base-building plan. She is not proposing an intake form. She is
proposing one question, only for the two goals that cannot be inferred.

**Our position.** `research/07` argues that asking nothing is an advantage rather than a
constraint, and `research/11` Part 4b says every modifier after the second tap is inferred
or asked later in context. Our objections are three. First, a placement question is a
capability question, and a capability question at the moment somebody is stating an
ambition invites them to answer it as a self-assessment, which is exactly the input
`04-training-history.md` shows people are worst at. Second, the first session answers it
for free: prescribe a dead hang, log what happens, and we have measured what she would
have asked. Third, and this is the part that is a bet rather than an argument, every extra
onboarding step costs completions, and the Fitbod number says the thing that matters is
week five, not the accuracy of week one.

**Where each of us is weakest.** Her question is asked before the plan exists, which is
the one thing our product rule ("ask the goal, then tell them the plan") forbids, and it
is asked of exactly the population least able to answer it accurately. Our inference costs
a first session that may be badly calibrated, and "we will find out on Tuesday" is not
much comfort to somebody who wanted a plan today. We also have no evidence at all that one
extra tap costs completions in this app. We are asserting it.

**This is not resolved here and should not be.** It is a testable difference: run the same
made-up people through both, ask whether the placement question actually changes the first
week's prescription, and whether inference recovers by session two. That is what the
bake-off (`engine/bakeoff.mjs`, workstream G in `engine/PLAN.md`) is for. Nothing else in
this merge is contested; this is.

## What this merge changed

- `goals/goal-tree.json`: her verbatim phrasings added to `aliases` across nine children;
  the push/pull ratio and the core-stability finding written into the `numbers` and `plan`
  text of `first-pullup` and `first-pushup`; her source keys added where they back a claim.
  Labels untouched, because Mo approved those.
- `engine/goal-engine.mjs`: `first-pullup` priority is now lats, biceps and forearms, with
  the ratio cited. `first-pushup` priority is now chest, triceps and abs, with the reason.
  No other parameter moved.
- `engine/training-age.mjs`: `detectPlateau` added and exported, and `deriveTrainingAge`
  now returns a `plateau` field. Everything else identical.
- `sources.md`: a new section with her URLs for the claims we took.

## Credit

The push-to-pull ratio, the push-up-is-a-core-problem finding, plateau detection as an
algorithm behaviour, the reinjury-fear framing and the post-50 muscle-loss number are
Jawa Abdulal's research, merged 2026-09-09. The consolidation principle in her file, that
a category earns its own row only when it needs a genuinely different plan, is a better
stated rule than anything in our nine bubbles and is worth keeping in mind the next time
somebody wants to add a tenth.
