# Am I getting stronger

What the market actually shows, what the honest metric is, and the one place
this gets dishonest if nobody is watching.

Written 2026-09-16 after a Mobbin sweep of the category and a source check on
the normative data. `08-fair-comparison.md` is the sibling: it covers scoring a
pair fairly. This one covers scoring a person against the rest of the world.

## What every app converged on

Estimated one rep max. It is the only way to put 165 lb x 5 and 180 lb x 8 on
the same axis, and without it "am I stronger" cannot be answered at all, because
the raw numbers move in two dimensions and a person cannot read two dimensions.

We already compute it. `e1rm()` and `liftE1rmHistory()` have been in
`index.html` for months and nothing on screen has ever shown the result.

| App | What it shows | Worth taking |
|---|---|---|
| Hevy | Best 1RM, a level on a Beginner to Elite bar, and "stronger than 48% of male lifters your age and bodyweight" | The level. It is the only pattern in the category that answers "is that any good". |
| Tonal | Per set: weight, reps, and that set's own 1RM. Separately a "Strength Score" of 411 | Per set e1RM is honest and cheap. The score is a number with no unit and no meaning. |
| Gymshark | "Bench Press (PB) 100 lb" with a sparkline | Clean, but only reports the best. Says nothing about direction. |
| Bevel | A list: exercise, equipment, session count, sparkline, "Stronger than ever" | The list shape. Scannable without reading. |
| Peloton, Equinox | "Total Reps 322. Total Weight 0 kg" | Nothing. This is the pattern we deleted from Progress on the same day. |

The finding: **a number cannot tell you whether you are strong. A level can.**
Everything else in the category is a number.

## The percentile problem

This is the part to be careful about, because the feature is easy to build
wrong and the wrong version is worse than not shipping it.

Real normative data exists and is free:

- **OpenPowerlifting**, CC0 public domain, bulk CSV, millions of entries.
  Genuinely usable, no licence problem, attribution requested but not required.
- **JSAMS 2024**, 809,986 competition entries, peer reviewed percentiles by age
  and sex for all three lifts. At the 90th percentile, ages 18 to 35:
  squat 2.83x bodyweight male and 2.26x female, bench 1.95x and 1.35x,
  deadlift 3.25x and 2.66x.

Both describe **drug tested competitive powerlifters who trained specifically to
maximise those three lifts.** That is not our user. The median competitor
benches 1.56x bodyweight at 18 to 35; a realistic intermediate gym-goer after
two to four years of programmed training benches about 1.2x, and the untrained
majority of the population is around 0.55x.

So a real percentile against the only real dataset tells an ordinary person who
has been training hard for a year that they are in roughly the **3rd
percentile**. That is arithmetically true and completely useless. It is also
the opposite of what the feature is for.

Hevy dodges this by saying "lifters", which is doing a lot of quiet work: their
comparison set is their own users, who are app-using recreational lifters. We
cannot copy that, because we do not have a user base to compare against yet.
**That is the honest blocker, and it is a data problem, not a code problem.**

### What can be said truthfully

1. **A level, anchored on published gym-goer standards.** Beginner, Novice,
   Intermediate, Advanced, Elite as bodyweight ratios adjusted for sex and age.
   Defensible, needs no population dataset, and is the thing that actually
   answers the question.
2. **A percentile against competitors, with the population named.** "Top 12% of
   people who compete" is true and citable. For most users the number will be
   small, and it should say who it is measuring against in the same sentence or
   it is a lie by omission.
3. **A percentile against our own users**, once there are enough of them. This
   is what Hevy has and what we will eventually have. It is the right long term
   answer and it is not available on day one.

What must not happen: a percentile with an unnamed comparison group, chosen
because it produces a flattering number. That is inventing a statistic.

## Recommendation

Ship the level now, on published standards, per lift. It answers the question
and nothing about it is made up.

Hold the percentile until it can be computed against our own users, and use the
competitor dataset only for the top anchor of the scale, which is the one thing
it is genuinely authoritative about.

*Confidence: high on e1RM as the metric and on the level as the presentation.
High on the licence position for OpenPowerlifting. High that a competitor
percentile is misleading for our population. Medium on the exact gym-goer
ratios, which are widely published and consistent between sources but are
consensus rather than a single peer reviewed table.*

## Sources

- Normative data for the squat, bench press and deadlift in powerlifting,
  Journal of Science and Medicine in Sport, 2024. 809,986 entries.
  https://pubmed.ncbi.nlm.nih.gov/39060209/
- OpenPowerlifting bulk CSV and licence.
  https://openpowerlifting.gitlab.io/opl-csv/bulk-csv.html
- Barbell Medicine, strength standards by bodyweight, age and sex.
  https://www.barbellmedicine.com/blog/strength-standards/
