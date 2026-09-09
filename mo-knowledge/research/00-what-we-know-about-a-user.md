# What we actually know about a user

Everything downstream depends on this, so it goes first. There is no point researching
how age modifies a program if we never learn anyone's age.

## The inventory

Taken from `profiles`, `fit_entries` and `exercise_logs`, and from what
`generate-workout` is actually sent (`index.html`, the `fetch` to `FUNCTION_URL`).

| Input | Where it comes from | When we get it | How much to trust it |
|---|---|---|---|
| `goal` | Onboarding, step 2 | Always, immediately | High. They chose it. |
| `goal_detail` | Onboarding, step 3 | Always | High, and underused |
| `challenge_target` | Onboarding, "pace" | Always | **Low.** An intention, not a behaviour |
| `focus` | Setup | Rarely set | High when set |
| weight | `fit_entries.weight` | Whenever they weigh in | High, but often absent for days |
| `sex` | Setup, Your body | **Optional, post-onboarding** | High when set |
| `age` | Setup, Your body | **Optional, post-onboarding** | High when set |
| `height_in` | Setup, Your body | **Optional, post-onboarding** | High when set |
| `activity_level` | Setup, Your body | **Optional, post-onboarding** | **Low.** Self-reported activity is the least reliable thing on the list |
| logged history | `exercise_logs` | Builds from session one | **Highest.** It is behaviour, not claims |
| days actually trained | `fit_entries.gym` | Builds from day one | Highest |

## The finding that matters

**Age, sex and height are not asked during onboarding.** They live behind
Setup → Your body, which a new user has no reason to open. So the realistic input set on
the day someone signs up and asks for their first plan is:

```
goal, goal_detail, challenge_target
```

and nothing else. No weight until they first log one. No history until they train.

This is not a bug. It is the product rule working as intended: ask the goal, then tell
them the plan, never interrogate. But it has a consequence the current brief does not
acknowledge, and it is the most important sentence in this folder:

> **The plan has to be good before we know anything about the body it is for.**

Which inverts how this is normally built. The usual approach treats the personalised
plan as the product and the generic one as a fallback. For us it is the other way
round: the generic plan is the product, and every input we later acquire is a
*refinement* to a plan that already had to stand on its own.

## What follows from that

**1. Design the zero-knowledge plan first.** Goal plus a day count. If that plan is not
good, no amount of individualisation rescues it, because most first plans will be that
plan.

**2. Every modifier must be optional and independent.** Not a decision tree that needs
age to reach a branch. A stack of adjustments, each of which can be skipped if the input
is missing, and none of which depends on another having run.

**3. Never block on a missing input.** No "tell us your age to continue". The moment the
algorithm needs something we do not have, it has broken the product rule and the answer
is a better default, not a new question.

**4. Prefer measured over stated, every time.** We have `challenge_target` (what they
said they would do) and `fit_entries.gym` (what they did). We have `activity_level`
(what they claim) and logged sessions (what happened). Where both exist the measured one
wins, and after a few weeks the stated one should be ignored entirely.

**5. Some inputs are worth asking for later, in context.** Not at signup. Bodyweight is
already asked for naturally by the weigh-in flow. Age is worth having and is one tap; the
right moment is probably when it would visibly change something, not on a settings page
nobody opens.

## What we are missing that would actually help

Listed here rather than assumed away. None of these should become an onboarding question
without a fight.

- **Injury and pain history.** The single most useful safety input and we hold none of
  it. Currently the algorithm can prescribe overhead pressing to someone with a bad
  shoulder and never know. Worth solving, probably as a per-exercise "this hurts" swap
  rather than a questionnaire.
- **Equipment access.** We generate exercises without knowing whether the person has a
  barbell, a pair of dumbbells or a hotel room. `exercise-library` carries an `equipment`
  field, so the library is ready and the input is not.
- **Whether a layoff happened.** Derivable from `exercise_logs` gaps, not currently read.
- **Real training age.** Not asked and not needed as a question. See `04`.

## One correction to the table above

`exercise_logs` is listed as our best input, and it is, but the algorithm does not
receive it. `index.html` sends `generate-workout` a flattened map of personal bests, one
weight per exercise, with no dates and no counts. So in practice the generator's real
input set is even thinner than the inventory suggests, and the richest thing we own never
leaves the client. `04` has the detail.
