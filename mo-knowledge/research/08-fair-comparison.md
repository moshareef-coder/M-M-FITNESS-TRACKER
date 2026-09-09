# Fair comparison

`06` says the Köhler effect needs the ability gap to sit in a productive band, and
collapses outside it. This file is about how you get a real pair into that band, and it
is the bridge from the allometric work in `01` to something a user actually sees.

## The problem

A 190 lb man benches 185. A 145 lb woman benches 85. Put those two numbers next to each
other and you have not created motivation, you have created a reason for one of them to
stop opening the app.

Both numbers are also, as a measure of who is training well, meaningless. They mostly
report body size and sex. Which means the comparison the app is currently capable of
making is simultaneously demoralising **and** uninformative, which is the worst available
combination.

## The thing that already solves this, that no consumer app uses

Competitive powerlifting has had this problem for a century and solved it. Wilks, DOTS
and IPF Goodlift coefficients all exist to answer exactly one question: **who lifted more
relative to what they should be able to lift at their size.** They are published, freely
available, and computable in a few lines with no dependencies.

The underlying physics is in `01`: strength scales roughly with bodyweight to the
two-thirds power, not linearly, because force capacity tracks cross-sectional area while
mass tracks volume.

Not one consumer fitness app uses any of this. They all show raw kilos on a leaderboard.

*Confidence: high that the formulas exist and are appropriate for the job. Medium on
applying them to untrained people, since they were fitted on competitive lifters. Flagged
VERIFY in `sources.md`.*

## Two uses, and they are different

### 1. Presentation: make the head-to-head worth having

The app already has an effort-XP head-to-head. Scoring strength work allometrically makes
a cross-size, cross-sex comparison **fair enough to be motivating instead of insulting**.
The 145 lb lifter's 85 and the 190 lb lifter's 185 can turn out to be close, which is
both truer and more useful than the raw numbers.

### 2. Mechanism: keep the gap inside the productive band

This is the part that matters more and is much less obvious. `06` is not a nice-to-have
sitting on top of a fair scoreboard. The scoreboard is load-bearing: if the perceived gap
is enormous, the conjunctive target in `06` stops motivating the weaker partner and
starts humiliating them, and the whole chapter fails.

So handicapping is not decoration. **It is the thing that makes pair training work for
pairs who are not already matched.**

## Where the formulas stop, and what to do instead

Being clear about this, because over-reaching here would produce a fair-looking number
that is wrong.

- They cover **barbell strength** only. They say nothing about a plank, a yoga session, a
  bike ride or a set of push-ups, which is most of what most of our users do.
- They handle bodyweight properly and **sex only through separate coefficient sets**,
  which is coarse.
- They are contested *within* powerlifting. There is no settled answer, only better and
  worse approximations.
- They are calibrated on trained competitors. Two beginners compared this way are being
  scored by a ruler built for somebody else.

So the honest design is a **ladder of comparisons, most fair first**, and the app should
prefer the fairest one available rather than always reaching for the formula:

1. **Progress against your own baseline.** Percentage improvement on your own numbers.
   Perfectly fair by construction, needs no formula, works for every activity, and is
   available the moment someone has two sessions. This should be the default comparison
   and it is the one the app should lead with.
2. **Effort and consistency.** Sessions completed, sets logged, weeks unbroken. Fair
   across any gap in strength, and it is what the pair mechanism actually needs, since
   showing up is the behaviour we are trying to produce.
3. **Allometrically scaled strength.** For the specific case of two people who both lift
   and want to compare lifts. Presented as a handicap, explicitly, never as a claim about
   who is stronger.

Note what falls out: **the fairest comparison is also the one that needs no research and
no formula.** Progress against your own past is the right default, and the powerlifting
maths is a special case for a narrower situation than it first appears.

## The design rule

> Never show a comparison that a reasonable person would find humiliating. If the only
> available comparison is humiliating, show progress instead.

The app can check this. It knows both numbers before it renders anything. A comparison
that would display a five-to-one gap should quietly become a different comparison.

*Confidence: high on the rule. It costs nothing and the failure it prevents is a user who
leaves.*

## What this would look like to a user

The felt version, since that is the test:

> "My partner has been lifting for six years and I started last month, and somehow the
> app makes it feel like we are in the same gym doing the same thing, and I am not
> embarrassed to look at the screen."

No other fitness app can currently produce that sentence, because they are all showing
raw kilos side by side.
