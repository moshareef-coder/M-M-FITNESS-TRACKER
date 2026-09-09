# The pair is the algorithm

The central claim of this folder, and the reason it is worth continuing.

## The observation

Every training algorithm that has ever been written builds a plan for **one person in
isolation**. Fitbod, Hevy, Ladder, Freeletics, every LLM wrapper, every coach's
spreadsheet. Where a second person appears, they appear afterwards: a leaderboard, a
feed, a share button. The algorithm ran, and then the social layer was painted on.

Fit Together has two people **as its premise**. Not as a feature. The tagline is
"neither of you gets to quit quietly". And yet our generator takes exactly the same
inputs as everybody else's: one person's goal, one person's body, one person's history.
The partner is not an input. We built the one thing nobody else has and then wrote a
single-player algorithm to sit inside it.

> **The pair is not a social feature on top of the algorithm. The pair should be the
> algorithm.**

That is the differentiated position. Everything in `01` to `05` is us getting better at
a game everyone else is already playing. This is a game nobody is playing.

## The evidence, which is real and nobody in fitness apps has used

There is an established effect here and it is exercise-specific, not borrowed from
another field.

**The Köhler effect.** When people work at a task in a pair or small group, the *weaker*
member works harder than they would alone. Substantially harder. The effect was
rediscovered and developed for exercise settings by Feltz, Kerr, Irwin and colleagues,
who ran actual persistence trials (isometric holds, planks, exercise-game tasks) with a
partner present, and found large increases in how long the weaker person kept going.

What makes it useful rather than a curiosity is that the effect **has conditions**, and
the conditions are directly designable:

1. **The gap has to be moderate.** Too small and there is nothing to rise to. Too large
   and the weaker person disengages entirely, because the outcome no longer feels like it
   depends on them. There is a productive band.
2. **The task has to be conjunctive.** The joint outcome must depend on the weaker
   member. If both people's results are simply added, or shown side by side, the effect
   is much weaker or absent.
3. **The weaker person has to know their contribution matters.**

*Confidence: high that the effect is real, replicated, and specifically demonstrated in
exercise contexts. Medium on the exact boundaries of the productive band, which I would
not put a number on. See `sources.md`, marked VERIFY.*

## What this implies, concretely

Five mechanisms. Each is buildable from data we already hold.

### 1. Conjunctive weekly targets, not parallel streaks

The app currently gives each person a `challenge_target` and shows two streaks side by
side. That is an **additive** design, and by the evidence above it is the weaker of the
two options.

A **conjunctive** target is a single number the pair reaches together, where falling
short is a joint outcome. "You two owe seven sessions this week" rather than "you owe
four and she owes three". Same total, different psychology, and the literature says
materially different behaviour.

This is a small change to a screen and a large change to what the app is.

*Confidence: high on the direction. This is the most testable product claim in the
folder and it is an A/B test, not an argument.*

### 2. Synchronised plans, not identical ones

Two people at completely different levels can still train **together** if the algorithm
holds the *pattern* constant and varies the *prescription*.

Same day, same name on the day, same movement pattern, different variant and load:

| | Partner A, trained | Partner B, 265 lb beginner |
|---|---|---|
| Day | Push | Push |
| Press | Barbell bench, 4 x 6 | Chest-supported machine press, 3 x 10 |
| Vertical | Standing overhead press | Seated dumbbell press |
| Accessory | Dips | Incline push-up from a bench |

They are in the gym at the same time doing the same session in every way that matters
socially, and neither prescription has been compromised. **Every other app would give
these two people unrelated plans and then show them a leaderboard.**

The pieces to build this already exist: `exercise-library` is keyed to the same 14 muscle
groups and every entry carries a `level` and an `equipment` field, and `calisthenics.mjs`
already has progression chains. Nothing new is needed except the intent.

*Confidence: high that it is buildable. Untested as a product idea, which is what the
sandbox is for.*

### 3. Scheduling is an algorithm output, not a calendar feature

For one person, *when* barely matters. For a pair it is most of the value. Two people
whose sessions land on the same days train together. Two people whose sessions land on
different days are two people using the same app.

We can infer real training windows without asking: `fit_entries.workout_at` records when
each person actually trained. Not when they said they would. When they did.

So the algorithm should be choosing training days for the **pair**, from the overlap of
two observed patterns, and treating "both of you on Tuesday" as worth more than a
marginally better split.

*Confidence: high that the data supports it. Medium on how much adherence it buys, which
is measurable once there are enough users.*

### 4. Shared rhythm, asymmetric volume

Following from 2 and 3: the pair should share training days and rest days even when their
volumes differ a lot. A beginner and an intermediate can be on the same four-day rhythm
with very different set counts on each day.

This costs the more advanced partner almost nothing, because weekly volume matters far
more than its exact distribution, and it buys the whole social mechanism.

*Confidence: medium-high. Rests on volume distribution mattering less than total, which
is reasonably supported.*

### 5. Re-entry is a dyadic problem

When someone comes back after two weeks off, the right plan depends on something no other
app can see: **what the other person did.**

- Both fell off. This is a restart, and the tone is "let's go again", not remedial.
- One fell off, one did not. This is the delicate one. The returner is behind, knows it,
  and is the person most likely to quit permanently. A plan that drops them straight back
  into a synchronised session they cannot complete will finish them off. The gap needs
  closing deliberately, over two or three sessions, and the app should probably not say
  a word about it.
- Neither fell off. Nothing to do.

The current app has one re-entry path, because it does not look at the partner.

*Confidence: high that the three cases are genuinely different. The right response to
case two is a product and copy decision as much as an algorithm one.*

## Where this could be wrong

Worth stating, because a thesis with no failure mode is a slogan.

**The gap may usually be too large.** The Köhler effect needs a moderate gap. Real pairs
are often a committed lifter and a beginner partner, which may be well outside the
productive band. If so, mechanism 1 backfires: a conjunctive target where one person
carries the other is humiliating rather than motivating. This is exactly what `08` is
for, and if handicapping cannot bring the perceived gap into the band, this whole chapter
weakens.

**Coached clients are not a pair.** The app also supports a coach with up to 19 clients.
None of this applies there. A coach and a client is not two peers, and pretending
otherwise would be a design error. The pair logic must be a mode, not the default.

**Two people can want genuinely incompatible things.** One training for a marathon and
one for a powerlifting meet should not be synchronised, and forcing it would be worse
than leaving them alone. There needs to be a threshold past which the algorithm gives up
on synchronisation and says so.
