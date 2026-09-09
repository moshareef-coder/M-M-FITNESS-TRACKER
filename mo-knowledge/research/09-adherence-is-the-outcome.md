# Adherence is the outcome

The quiet argument underneath everything else in this folder, stated directly so it can
be disagreed with.

## The claim

We have been optimising the wrong variable. Every file in `knowledge/principles/`, and
files `01` through `05` here, optimise for **adaptation**: the best stimulus for
hypertrophy or strength given this person's body. That is what the science is about, so
that is what gets researched.

But adaptation is not what decides whether somebody gets in shape. **Showing up is.**

The arithmetic is not close. A theoretically optimal program done 1.5 times a week for
five weeks before abandonment produces nothing. A mediocre program done four times a week
for a year transforms somebody. The gap between an excellent program and an average one
is small. The gap between a program done and a program abandoned is total.

> **The dependent variable is not hypertrophy. It is whether they are still here in
> twelve weeks.**

If that is right, then the algorithm's job is not "produce the best plan". It is
**produce the best plan they will actually do**, which is a different optimisation and
sometimes points the other way.

*Confidence: high on the direction. This is not controversial among coaches and is
strangely absent from how training apps are built.*

## Where this changes the answer

Cases where optimising for adherence beats optimising for adaptation:

- **Fewer days than they asked for.** Someone says five, the honest read of the data says
  they will do three. Giving them five sets up four failures a week. Three they hit beats
  five they miss, and there is a real question about whether we should ever hand somebody
  a target we can already predict they will miss.
- **Exercises they like.** Two exercises with near-identical stimulus, one of which they
  enjoy. The literature says the difference in adaptation is negligible. The difference in
  whether they turn up is not.
- **Shorter sessions.** A 40 minute session done consistently beats a 75 minute session
  done sometimes. Session length is barely modelled in any generator and it is a first
  order adherence variable.
- **Not punishing a miss.** Covered in `06`. The plan after a missed week is a retention
  problem wearing an algorithm costume.

## What actually moves adherence

Honest summary of what I am reasonably confident about.

**Implementation intentions.** Specifying *when and where* a behaviour will happen, in
advance and concretely, substantially improves follow-through. This is Gollwitzer's work
and it is one of the better replicated findings in behaviour change. The practical form is
"Tuesday 7am at the gym near work", not "four times a week".

Direct implication: **the app should be scheduling sessions to specific days, not issuing
weekly quotas.** `challenge_target` is a quota. That is the weaker form. And `06` already
argues scheduling should be an algorithm output for pair reasons, so two independent lines
of reasoning arrive at the same change.

*Confidence: high on the finding. High on the implication.*

**Doing it with someone.** Exercising with others improves adherence, and the Köhler work
in `06` gives a mechanism for part of it. This is our whole product, and the point of this
file is that it is not a nice feature, it is the highest-leverage adherence intervention
available and we happen to have built the app around it already.

*Confidence: high on the general finding.*

**Early wins.** The first two weeks decide it. Someone whose first session goes badly, too
hard, too long, an exercise they could not perform, is disproportionately likely to be
gone. This is the strongest argument for the conservative defaults in `05`, and it is an
adherence argument rather than a safety one.

*Confidence: medium-high. Sensible, widely believed, and I would want the source before
quoting a number.*

**Streaks and social contagion, with a caveat.** Behaviour spreading through social
networks is a real literature, most famously Christakis and Fowler, and the causal
identification is genuinely contested. Homophily is very hard to separate from contagion
in observational network data. So: reasonable to design as if a partner's behaviour
influences yours, unreasonable to quote effect sizes at anybody.

*Confidence: medium on the effect. High that the criticism of the methodology is
substantive and should be acknowledged rather than ignored.*

## What we can measure, starting now

Adherence is the one outcome we can observe completely, which is convenient given it is
the one that matters. All of this is already in the database:

- Session completion rate, planned against done
- Gaps, and whether they return after one
- Whether the day of week and time of day are stable, which is an implementation
  intention forming on its own
- Streak breaks and recoveries
- **Partner correlation**: does one person's session predict the other's within a couple
  of days? If `06` is right this should be visible in the data, and it is the cleanest
  test of the whole thesis.

That last one is worth stating as a prediction, because a thesis that cannot be checked
is not worth much:

> If the pair mechanism is real, sessions within a partnership should cluster in time
> more than chance would produce, and more than two matched individuals training alone.

We have two users, so this is not testable yet. It is testable later, and writing it down
now means we will not quietly forget to check.

## The uncomfortable implication

If adherence is the outcome, then a large part of the algorithm's job is **not
programming at all**. It is scheduling, tone, expectation setting, and the partner
mechanism.

Which means the most valuable work in this project may not be in the selector. It may be
in what the app says on the day somebody comes back after two weeks away.

That is worth taking seriously rather than treating as a soft aside, because it argues for
spending our next block of effort somewhere other than where a fitness algorithm project
would naturally spend it.
