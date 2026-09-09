# Inference over interrogation

`00` established that we ask almost nothing, and framed it as a constraint to work
around. That was the wrong framing. It is an advantage, and this file is the argument
for why plus the mechanism for exploiting it.

## The reframe

Every other app treats onboarding questions as *how you personalise*. Twelve screens,
then a plan. The questions feel like rigour and they are mostly theatre, because:

- People are unreliable narrators about their own training. Beginners overrate themselves,
  experienced lifters underrate themselves, and everyone who has held a gym membership
  picks "intermediate".
- Self-reported activity level is among the least reliable measures in the field.
- Stated availability is an intention. "Five days a week" is a wish, not a schedule.
- Every question is a place to abandon signup. That is the friction Mo watched kill five
  paid apps.

We ask the goal and nothing else. So we are forced to infer everything from behaviour.
**Behaviour is better evidence than self-report.** The constraint pushes us onto the
better method.

> The felt experience we are aiming at: *this app knows me and I never told it anything.*

Nobody gets that from a questionnaire. It is only available to an app that watches.

## What we can know, and when

A progressive model of a user. Each row is what is genuinely available, not what we wish
we had.

| When | What we can know | What it can change |
|---|---|---|
| Day 0 | Goal, goal detail, stated pace | The starting plan, nothing more |
| After session 1 | Whether they finished it. Which sets landed. What loads they actually used | Load calibration for session 2 |
| Week 1 | Their real training window, from `workout_at`. Whether stated pace was true | Scheduling, and the pair overlap in `06` |
| Week 2 to 3 | Progression rate. Whether linear loading still works | Training age, from `04` |
| Week 6 | Consistency pattern. Which exercises they always swap or skip | Selection, and a pain or preference signal |
| Month 3 | Response to volume. Whether they came back after a gap | Volume targets, re-entry handling |

Nothing in that table needs a question. All of it is already in the database, or would be
with a small change to what we record.

## The three signals we currently throw away

Verified against the code, not assumed. This is the actionable part of the file.

### 1. History reaches the generator flattened

Covered in `04`. `index.html` sends `Object.entries(personalRecords(ME).best)`, a map of
exercise name to best weight. No dates, no counts, no sets or reps. Fix is a wider
payload.

### 2. Plan versus actual is computable and never computed

This is the big one.

The plan is stored in `ai_workouts.exercises`, each entry carrying `sets`, `reps` and
`targetWeight`. Completed plans persist with a `completed_at`. The actual is in
`exercise_logs`, one row per exercise with the weight, reps and sets that really
happened. Both are keyed by email and `entry_date`.

**Nothing ever joins them.** So the single richest signal available to us, obtainable
with no question and no new data, is sitting in two tables that never meet:

| What happened | What it means | What should change |
|---|---|---|
| Every set completed at or above target | The load was too easy | Progress faster next session |
| Sets completed, reps slightly under target | Calibration is about right | Normal progression |
| Later sets abandoned, or weight dropped mid-exercise | Too heavy, or under-recovered | Hold or reduce load |
| Session started and abandoned | Something outside the plan | Do not punish. Probably say nothing |
| Consistently finishing early and easily | Volume is too low for them | Raise it |

**This is RPE without asking for RPE.** Every serious app asks users to rate effort after
a set. Most users do not, or lie, or stop bothering by week two. We can infer the same
thing from what they did, which they cannot be bothered to lie about because they are not
answering anything.

*Confidence: high that the join is possible and that the signal is meaningful. Medium on
the exact mapping in that table, which is coaching judgement and should be tuned against
real data before it drives anything automatically.*

### 3. Things we never record at all

Cheap to add, and each is a real signal:

- **Swaps.** If someone always swaps overhead press for something else, that is an injury
  or a preference signal worth more than any questionnaire could get. `findAlternatives`
  exists in the selector. Nothing logs what it was used for.
- **Skips.** Which exercise gets abandoned tells us the same thing more bluntly.
- **Session duration and rest.** `SESSION` tracks elapsed time in memory and it is never
  persisted. Rest length between sets is a genuine autoregulation signal and we discard
  it every session.
- **Whether the plan was generated or hand-built.** Someone who always rebuilds the plan
  by hand is telling us the generator is not good enough for them.

## The rule this produces

> **Never ask for something we could observe. Never observe something we will not use.**

The first half is the product rule already. The second half is new and matters: recording
data we never act on is not neutral, it is a privacy cost with no return. Every signal
above should be added only alongside the thing that reads it.

## The honest limit

Inference needs time. On day zero we know the goal and nothing else, and no amount of
cleverness changes that. So this file does not replace `05`'s conclusion that the
zero-knowledge plan is the product. It says the plan should get visibly better in week
two, week six and month three, without anybody being asked anything.

That trajectory, rather than any single plan, may be the actual product.
