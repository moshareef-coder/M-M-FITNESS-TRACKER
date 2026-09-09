# What this feels like

`06` to `09` are mechanisms. This is the translation: what a person actually experiences
if we are right, and what we would build first. If a mechanism cannot be traced to a
sentence in this file, it is not worth building.

## The five moments

Not features. Moments, because that is how the product is judged.

### 1. Two people, different bodies, same session

She has been lifting six years, he started last month. The app puts them both on push
day, Tuesday. She has barbell bench and dips. He has a chest-supported machine press and
incline push-ups. Neither prescription has been softened. They are in the gym at the same
time doing the same workout in every way that matters to them.

> "We train together even though we are nowhere near the same level."

**Nobody else can do this.** Every other app gives these two unrelated plans and a
leaderboard. Mechanism: `06`, synchronised not identical. Buildable now with the existing
library, which is already keyed to muscle groups and carries a level per exercise.

### 2. The comparison does not make anyone want to close the app

He sees that he improved 12% on his press this month and she improved 3%, and both of
those are true and neither is embarrassing. The raw kilos are available if anyone wants
them and they are not what the screen leads with.

> "I am not embarrassed to look at the screen."

Mechanism: `08`, the comparison ladder. The fairest comparison, your own baseline, needs
no formula and works from session two.

### 3. It gets visibly smarter and never asks a question

Week one it gives him a sensible plan from a goal and nothing else. Week two the loads
are right, because it watched what he actually lifted. Week six it has stopped offering
the overhead press he swaps out every single time. Nobody filled in a form.

> "It knows me and I never told it anything."

Mechanism: `07`. The trajectory is the product, more than any single plan is.

### 4. Coming back after two weeks off does not feel like a punishment

He missed a fortnight. She did not. The app does not congratulate her at him, does not
show him a broken streak in red, and does not drop him into the session he would have
been doing had he not stopped. It gives him three sessions to close the gap and says
nothing about it.

> "It did not make me feel bad, so I stayed."

Mechanism: `06` mechanism 5, and `09`. This is a copy and tone problem at least as much
as an algorithm one, which is the uncomfortable conclusion in `09`.

### 5. The week is a thing you owe each other

He trains for strength, three days. She trains for something else, four. Neither number
changes for the other. But the week only feels like a win if both of them hit their own
number, and the app says so as one line, not two separate streaks that quietly let one
person coast while the other carries it.

> "I went because she would have been left carrying the week if I didn't."

Mechanism: `06` mechanism 1, the conjunctive target on individual goals. This is the
sharpest single change in the folder, it is one screen, and it is a genuine A/B test
rather than an argument.

## What we would build first

Ordered by value over cost, with the constraint that nothing here needs a new onboarding
question.

**1. Join plan to actual.** (`07`) Both tables exist and are keyed the same way. Nothing
new is recorded. It yields load calibration from session two, which is moment 3, and it
is the cheapest real intelligence available to us.

**2. Pass the real history to the generator.** (`04`, `07`) Currently a flattened map of
personal bests with no dates. A wider payload, no research required, and it unblocks
derived training age.

**3. The conjunctive weekly target.** (`06`) One screen. The highest ratio of behaviour
change to engineering in the whole folder, and the cleanest test of whether the pair
thesis is real.

**4. Synchronised day selection for a pair.** (`06`) Same day names, same patterns,
independent prescriptions. Moment 1, and the thing nobody else can copy without changing
what their product is.

**5. The comparison ladder.** (`08`) Lead with progress against your own baseline. Add
allometric scaling only for the narrow case of two people who both lift and want to
compare lifts.

**6. Record swaps and skips.** (`07`) Cheap, and only worth doing alongside the thing
that reads them, per the rule in that file.

Note what is not on this list: age, sex and height. They are real modifiers and they are
sixth-order compared to everything above, which is the conclusion `05` reached and this
list confirms from the other direction.

## What would have to be true

The honest version, because a vision document with no failure condition is marketing.

**The ability gap has to be workable.** If real pairs are usually far outside the Köhler
band and `08`'s ladder cannot bring the perceived gap inside it, moments 1, 2 and 5 all
weaken together. This is the load-bearing unknown and it is open question 7.

**People have to actually want to train with their partner.** The whole folder assumes
the pair is the point. Some people will want the tracker and not the partner, and if that
is most people we have researched the wrong product. The sandbox has a solo scenario for
exactly this reason.

**Coaches are not pairs.** Nineteen clients and a coach is not two peers. All of this has
to be a mode, not the default, or it breaks the other half of the product.

## The one line version

> Everyone else is building a better plan for one person. We should be building the only
> plan in the market that is built for two.
