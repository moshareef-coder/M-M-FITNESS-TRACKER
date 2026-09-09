# Open questions

Things this folder cannot answer, roughly in order of how much they matter, with what
would actually settle each. Written down so the research has an edge rather than
trailing off.

## 1. Is derived training age better than asking?

`04-training-history.md` claims we can compute experience level from `exercise_logs`
better than a person can report it. That is the strongest claim in the folder and it is
currently unverified.

**What would settle it:** enough users with enough logged history to compare a derived
level against whether they complete the sessions we give them. We have two users. This
is a real answer but not a soon one.

**What we can do now:** write the derivation as a pure function and run it over the logs
we do have. Two people is not a study, but if it classifies Mo and Mell wrongly it is
wrong, and that is worth knowing for the cost of an afternoon.

## 2. What does "just be consistent" mean as a program?

Carried over from the brief's own open questions, unanswered there and here. It is the
only goal with no measurable target, and it may be the most honest thing most people
want.

The interesting possibility is that it should optimise for **something other than
adaptation**: lowest friction, most enjoyable, most robust to a missed week. That would
be a genuinely different program, not a watered-down version of the others.

**What would settle it:** deciding what we are willing to promise someone who picks it.

## 3. When someone misses a week, does the plan restart, continue, or step back?

Also from the brief. `04-training-history.md` asserts a layoff should step the program
back and gives no threshold, because I do not have a defensible one.

**What would settle it:** the detraining literature for the timeline, plus a product
decision about how it feels. Stepping someone back is correct and can read as punishment,
which is exactly the wrong note for an app whose whole idea is that neither of you quits.
This is as much a copy problem as an algorithm problem.

## 4. Do we cap beginner volume even when they ask for more?

From the brief. This folder's `05` says yes by asymmetric cost: too much too soon is how
beginners get hurt and quit, too little costs a couple of easy weeks.

But it collides with the product rule. "Ask the goal, then tell them the plan" also means
believing them when they say five days. Capping it is telling them they are wrong.

**What would settle it:** probably not evidence. A decision about who the app is for.

## 5. Should we ask for age at all?

Currently optional and buried, so mostly absent. `02-age.md` argues the age-unknown
default should be the cautious one anyway, which makes age nearly free to not have.

If that is right, the honest conclusion is that **we should not add an age question**,
because it would buy us a slightly faster ramp for young users at the cost of one more
screen between a person and their plan. That is a bad trade and it is the trade every
other app has made.

**What would settle it:** working out whether anything else we want to do needs age. If
nothing does, leave it where it is.

## 6. Injury and pain, which we hold nothing about

The largest gap in `00`. An algorithm that can prescribe overhead pressing to someone
with a bad shoulder and never find out is not safe, it is lucky.

The instinct is that this should never be a questionnaire. It should be a per-exercise
"this hurts" that swaps the movement and is remembered, which turns a safety input into
a feature people would use anyway. `findAlternatives` in the existing selector is already
most of the mechanism.

**What would settle it:** a product decision, then a small amount of schema.

## 7. Where is the productive ability gap?

New, and now the most important unknown here. `06` rests on the Köhler effect, which
only works when the ability gap between two people is moderate. Too small, nothing
happens. Too large, the weaker person disengages and a conjunctive target becomes
humiliating rather than motivating.

Neither `06` nor `08` can say where that band is. So the folder's main claim currently
has a hole in the middle of it.

**What would settle it:** a proper read of the Feltz and Kerr experimental work, which
manipulated the gap deliberately and should have the numbers. This is the single highest
value hour of reading available to this project.

**What we can do meanwhile:** design `08`'s comparison ladder so the *perceived* gap is
always presented at its narrowest defensible framing. That is the right design whatever
the number turns out to be.

## 8. Does the pair effect show up in our own data?

`09` states it as a testable prediction: sessions within a partnership should cluster in
time more than chance, and more than two matched people training alone would.

**What would settle it:** more users. With two, we cannot distinguish a real effect from
Mo and Mell living in the same house.

**Worth doing now:** write the query anyway, so it runs the day there is enough data
rather than being remembered as a good idea nobody had time for.

## 9. Should we ever give someone fewer days than they asked for?

From `09`. If the honest read of someone's behaviour says three days and they asked for
five, handing them five schedules four failures a week.

But overriding a stated preference is exactly the paternalism the product rule exists to
prevent, and being quietly downgraded by an app is its own insult.

**What would settle it:** probably a middle path rather than an answer. Give the days
they asked for, make some of them small enough to be unmissable, and let the plan
converge on what they actually do without ever announcing that it did.

## 10. Are we researching the right thing at all?

The brief's section 3 argues the most valuable work is finding out what people actually
say they want, in their own words, rather than our five abstract goals. That may well be
true, and this folder has not touched it.

Worth being honest that the individualisation research here and the real-goals research
there are different bets:

- **This folder bets** the plan is wrong for the person and fixing it needs better use of
  what we know about their body and history.
- **The brief bets** the goal is wrong for the person and fixing it needs better
  understanding of what they actually asked for.

Both could be right. If only one is, the brief's is probably more valuable, because a
technically excellent plan for the wrong goal is still the wrong plan. That was worth
saying out loud even though it argued against our own folder.

**What changed with `06` to `09`.** That paragraph was written when this folder was only
about individualisation, and it was fair then. It is now a third bet, and the third bet
is the one worth having:

- The brief bets **the goal is wrong for the person.**
- Files `01` to `05` bet **the plan is wrong for the person.**
- Files `06` to `09` bet **the plan is built for the wrong unit entirely**, because it is
  built for one person when the product is two.

The third is the only one of the three that nobody else in the market can copy quickly,
because they would have to change what their product is first. That is the argument for
spending the next block of effort there rather than on either of the others.
