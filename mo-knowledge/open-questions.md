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

## 7. Are we researching the right thing at all?

The brief's section 3 argues the most valuable work is finding out what people actually
say they want, in their own words, rather than our five abstract goals. That may well be
true, and this folder has not touched it.

Worth being honest that the individualisation research here and the real-goals research
there are different bets:

- **This folder bets** the plan is wrong for the person and fixing it needs better use of
  what we know about their body and history.
- **The brief bets** the goal is wrong for the person and fixing it needs better
  understanding of what they actually asked for.

Both could be right. If only one is, the second one is probably more valuable, because a
technically excellent plan for the wrong goal is still the wrong plan. That is worth
saying out loud even though it argues against our own folder.
