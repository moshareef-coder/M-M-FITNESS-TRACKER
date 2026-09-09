# Mo's knowledge file

A second, independent run at the workout algorithm, written from scratch rather than
built on `knowledge/`. Jawa owns `knowledge/`. This folder is ours. The two are meant
to be compared, not merged, until one of them clearly wins.

**Nothing in here is wired into the app.** No imports, no edge function, no `index.html`.
It is research and reasoning only, so it can be argued with before it costs anything.

## Why a second one at all

`knowledge/principles/` is good, and it is almost entirely about the **average trainee**:
how many sets a muscle wants, what RPE suits a goal, when to deload. Read the four files
and you will not find an answer to "this person is 54 and weighs 265 and has never lifted,
what changes". The brief does not ask for one either. It says "beginner versus someone
with a year behind them" and stops.

That gap is the whole reason this folder exists. Our question is not *what is the right
program*. It is **what about this specific person moves it, and by how much**.

## The claim we are testing

> Weight, age and sex are load and recovery modifiers. They barely touch program
> structure. The variables that actually decide the shape of a plan are how many days
> a week someone will really show up, and how much training they have behind them,
> and we can measure the second one instead of asking.

If that is right, a lot of what consumer fitness apps ask for on their first screen is
theatre, and our onboarding is already closer to correct than theirs by accident. If it
is wrong, we will find out here rather than after shipping.

## What is in here

```
research/
  00-what-we-know-about-a-user.md   the input inventory: what we hold, when we get
                                    it, and how much any of it can be trusted
  01-bodyweight.md                  what bodyweight actually changes
  02-age.md                         what age actually changes, which is less than
                                    people assume and in different places
  03-sex.md                         what sex actually changes, and where the
                                    evidence does not support prescribing anything
  04-training-history.md            the dominant variable, and the one we can measure
  05-putting-it-together.md         the synthesis: the modifier stack, in order, and
                                    what to do when half the inputs are missing
sources.md                          every claim above, with a confidence rating and
                                    a note on what still needs verifying
open-questions.md                   what we cannot answer yet and what would settle it
```

Read `00` first. It is short and it constrains everything after it.

## How the bake-off gets judged

Two documents both sounding reasonable is not a result. Before we compare, we agree on
what would make one better, otherwise it comes down to whose prose we like:

1. **Same inputs, both plans, read side by side.** A fixed set of made-up people
   (a 24 year old beginner, a 54 year old returner, a 265 lb first-timer, someone with
   60 logged sessions) run through both. The plans get read, not scored.
2. **Does it survive a missing input.** Half our users will have no age and no height.
   A method that needs them is worth less than one that does not.
3. **Can it be checked against the logs.** A rule that predicts something we can look
   up in `exercise_logs` beats a rule that cannot be wrong.
4. **Does it say what it does not know.** Confident writing about contested evidence is
   a mark against, not for.

The honest possible outcome is that Jawa's is better on program structure and ours is
better on individualisation, in which case the answer is to take both and neither of us
was running a competition worth winning.
