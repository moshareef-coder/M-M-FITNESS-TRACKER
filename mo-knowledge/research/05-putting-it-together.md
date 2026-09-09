# Putting it together

The synthesis. What actually gets computed, in what order, and what happens when half
the inputs are missing, which will be most of the time.

## The claim, restated as a structure

Nothing in `01` to `04` changes the **shape** of a plan except training history and how
many days a week someone will show up. Everything else adjusts **loads**, **selection**
and **ramp rate**. So the program should be built in that order, and each later stage
must be skippable.

```
1. STRUCTURE      goal + days per week + derived training age
                  -> split, day names, weekly sets per group, rep ranges, rest
                  requires: goal, day count. Both always present.

2. SELECTION      + bodyweight, age, equipment, injury flags
                  -> which exercises, and where on a progression ladder
                  each input optional; absent means use the cautious default

3. LOAD           + bodyweight (allometric), sex, then logged history
                  -> starting weight or ladder entry point
                  history overrides everything else the moment it exists

4. PROGRESSION    + logged history, recent adherence, layoff gaps
                  -> how fast load rises, when to deload, when to step back
                  absent history means the conservative linear default
```

Read that as four independent passes over a plan, not a decision tree. A tree that needs
age to reach a branch is the failure mode. A stack where the age pass simply does not run
is the design.

## The modifier stack, in order of how much it actually moves the output

Roughly, and this ordering is the most contestable thing in the folder, which is why it
is written down where it can be argued with:

1. **Days per week they will really train.** Nothing else comes close. A good three-day
   plan beats a perfect five-day plan they do twice.
2. **Training history.** Changes the shape. See `04`.
3. **Goal.** Changes rep ranges, rest, and the strength-to-cardio mix. Less than people
   assume, because the first three months of nearly every goal look similar.
4. **Bodyweight.** Changes starting loads and whether bodyweight movements are viable.
5. **Age.** Changes ramp rate and selection. Not volume, not rep ranges.
6. **Sex.** Changes upper-body starting loads and ladder entry. Little else.
7. **Height.** Almost nothing. TDEE only.

If our algorithm ever weights these differently, it should be for a stated reason.

## The default person

Because most first plans are built from `goal + days` alone, the defaults are not an
edge case, they are the product. Every default should be chosen on **asymmetric cost**:

| Choice | If we are wrong low | If we are wrong high |
|---|---|---|
| Starting load | One easy session | Failed reps, possible injury, deleted app |
| Ramp rate | Slightly slower progress | Stalling, soreness, quitting |
| Weekly volume | Slower gains | Cannot recover, misses sessions |
| Ladder entry | A set that felt easy | A movement they cannot perform at all |

Every row points the same way. **The unknown-input default should be the conservative
one in every case**, and the cost of that is one or two easy early sessions for a user
who could have handled more, which the logs will correct within two weeks.

This is why `02-age.md` concludes that the age-unknown default should look like the
older-adult default, and `03-sex.md` reaches the same conclusion for sex. It is the same
argument both times and it generalises.

## What we would build first, if this research were accepted

Not a commitment, an implication. Listed so the research connects to something.

1. **The zero-knowledge plan.** Goal plus days, nothing else. Good enough to ship alone.
2. **Derived training age from `exercise_logs`.** The highest-value piece and entirely
   self-contained: a pure function from logs to a level, testable against real rows.
3. **Bodyweight-aware ladder entry** for bodyweight movements. Fixes the worst concrete
   failure available today, which is prescribing pull-ups to somebody who cannot do one.
4. **Allometric cold-start loads.** Better than linear, cheap to implement.
5. **Layoff detection.** Free from data we hold, and currently ignored.

Notably, none of these need a new onboarding question, which is the constraint the whole
product runs on.

## Where this disagrees with the existing brief

Worth stating plainly, since the point of a second opinion is to differ somewhere:

- The brief treats level as an input (`buildWeekPlan({ level: "beginner", ... })`). We
  think it should be **derived**, and that passing it in is how the app ends up asking a
  question it does not need to ask.
- The brief lists "no starting weight comes through" as a bug. Agreed, but the fix is
  not a lookup table. It needs bodyweight, allometric scaling, sex where known, and
  history the moment it exists.
- The brief does not mention age, sex or bodyweight as programming inputs at all. This
  folder is mostly the argument that they matter less than expected but not zero, and
  that the interesting ones are elsewhere.
