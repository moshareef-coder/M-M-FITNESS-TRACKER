# What people actually want

The brief's section 3 asked for this and called it possibly the most valuable thing in the
project. Open question 10 in this folder agreed. This is it: what people say they want, in
their own words, grouped into the bubbles a first screen could show, with what each one
means in numbers and what plan it implies.

The machine-readable version is `../goals/goal-tree.json`: 9 bubbles, 46 sub-bubbles. This
file is the argument; that file is the data.

## How this was researched, and what it could not reach

Roughly ninety searches and fetches on 2026-09-08. Four kinds of evidence, in descending
order of how much to trust them:

1. **Surveys with a sample size.** HFA/Kantar (n=2,000, Dec 2024 and Dec 2025), Life Time
   (n=750, Dec 2025), Mindbody Wellness Index (n≈17,000, 2018; and 2024), Strava Year in
   Sport 2025, Cornell wedding study, Precision Nutrition client data, and a 2026 Frontiers
   paper on 389,481 Fitbod users. These tell you what people **say**.
2. **Search volume and Google autocomplete.** Annual and monthly volumes from three
   independent compilations, plus Google's own suggestion endpoint queried with 25 prefixes
   ("best workout for", "i want to lose", "how to get toned", "how to train for", "i want to
   be able to" and so on). These tell you what people **want when nobody is watching**, and
   they disagree with the surveys in an instructive way.
3. **Open forums.** MyFitnessPal community (snippets only, the pages render client side),
   AnandTech, Blind, Weddingbee, Quora and bodybuilding.com (403), HealthUnlocked (403),
   Lemmy. Verbatim goals, thin but real.
4. **Practitioner consensus with numbers.** Rates of loss and gain, strength standards,
   race times, progression timelines. Cross-checked across at least two sources each.

**What it could not reach:** Reddit blocks the crawler entirely, so r/Fitness, r/loseit,
r/xxfitness and r/bodyweightfitness, the richest sources of verbatim goals on the
internet, are absent. The forum layer here is thinner than it should be because of that.
Nothing below rests on a single forum post.

## Part 1: what the numbers say

### People say strength. People search fat loss.

Every 2025 and 2026 survey found puts building muscle or strength first:

| Source | Top stated goal | Second | Third |
|---|---|---|---|
| HFA/Kantar, Dec 2025, n=2,000 | Build muscle or strength 50% | Mobility, flexibility, posture 48% | Mental health via activity 46% |
| HFA/Kantar, Dec 2024, n=2,000 | Build muscle or strength 50% | Regular routine 44% | Mental health 42% |
| Life Time, Dec 2025, n=750 | Get physically stronger 42.3% (primary) | Overall fitness 46.4% (motivation) | Longevity 33.2% |
| Mindbody 2024 | Live a healthier, longer life 61% | Mobility 30% | |

And the search data says something else entirely:

| Query | Volume |
|---|---|
| "how to lose weight fast" | ~486,000 / year |
| "how to get a six pack" | ~145,000 / year |
| "how to gain weight" | ~79,000 / year |
| "how to build muscle" | ~52,800 / year |
| "how to get bigger arms" | ~22,800 / year |
| "what is the best way to lose weight" | ~13,000 / month |
| "what exercise burns the most belly fat" | ~6,400 / month |
| "how do I get a six-pack" | ~3,600 / month |

Fat loss outsearches muscle building roughly ten to one. The Google autocomplete for
"i want to lose" is nine weight phrasings and one "weight and build muscle". The
autocomplete for "workout plan to" is lose weight, lose weight and gain muscle, lose belly
fat, build muscle, build muscle and lose fat, gain muscle, get lean, get shredded, lose
weight at home, lose 10 pounds in a month.

**Both are true.** Surveys are aspirational and social; strength is what people are proud
to say. Search is private; fat loss is what they type at 11pm. Mindbody's 2019 data (n≈17k)
shows the split cleanly: "lose or gain weight" is the #1 reason for 26 to 45 year olds and
for women (35% vs 27% of men); "live a long and healthy life" is #1 for 46 to 65 year olds;
"look better physically" is #1 for 18 to 25s. "I want to feel good" is top three in every
bracket.

The design consequence: **the first screen must make fat loss easy to pick without making
it the headline.** Lead with strength and feeling better, which is what people are proud
of, and put weight loss right there, unjudged, because it is what most of them came for.

### The three biggest families are not on our list

Our five goals are lose weight, build muscle, get stronger, recomp, stay consistent. The
research found nine bubbles. Three of them have no home:

- **Be able to do something.** First pull-up, run a 5K, touch my toes, handstand. Google's
  autocomplete for "i want to be able to" is: do a pull up, touch my toes, run 5 miles, do
  a handstand, lift my girlfriend, do the splits. These are mastery goals, the kind
  Precision Nutrition's data says people actually stick to, and they are perfectly
  deterministic to program. We have no bubble for them.
- **Train for an event.** Half marathon, marathon, Hyrox, Spartan, a PT test. Gen Z is 75%
  more likely than Gen X to say an event is their main motivation (Strava). Hyrox went from
  570k to 1.5M participants in one season with a near-even sex split. Our generator has no
  concept of a date.
- **Get back into it.** "Getting back into working out", "start working out again",
  "postpartum", "after injury", "used to lift in college". Only 10.1% of beginners are
  still training a year later (Fitbod cohort), so most of our users will be restarting,
  not starting. Different plan, different tone, no bubble.

And one of our five is named wrong. **Nobody says "recomp".** They say "tone up", "get
lean", "lose weight and build muscle", "skinny fat". The goal is right. The word on the
button is not.

### Half of people want something no fitness app offers

48% of people setting 2026 goals want to improve **mobility, flexibility or posture**
(HFA/Kantar). It jumped from not being in the top three to second place in one year.
"Fix my posture", "improve my posture", "exercises to improve posture", "exercises to
strengthen knees" and "strengthen lower back" are all autocompletes. Fitbod's six goals,
Freeletics' nine journeys and Nike Training Club's four do not include it, or fold it into
"flexibility" as an afterthought. It is a five-to-ten-minutes-a-day bubble and it is
empty.

### "Fast" is the suffix on everything

"How to get abs in a week", "in 2 weeks", "in 30 days", "in one day", "in 5 minutes" are
all real autocompletes. So are "lose 10 pounds in a week", "lose 20 pounds in a month",
"do a pull up in 30 days", "get in shape in 2 weeks". The fantasy timeline is not an edge
case, it is the default ask. The product rule already says we suggest the healthy rate and
never sell the fastest one. This research says that rule will fire on most first plans,
so the wording for "here is what is actually reachable by then" is not copy polish, it is
the onboarding.

## Part 2: the bubbles

Nine top-level bubbles, ordered roughly by how often they come up, each with its
"what specifically?" children. Full detail, aliases and per-item sources are in
`goal-tree.json`. This is the readable pass.

### 1. Lose weight
<sub>and keep it off</sub>

Maps to our **Lose weight**. The largest search intent by a wide margin.

- **A number of pounds.** 0.5 to 1% of bodyweight per week is the safe rate; 20 lb is 10 to
  20 weeks. Compute the date and show it.
- **Belly fat or one area.** Cannot spot-reduce. Same plan as a number, plus core because
  they will want it. Do not sell ab exercises as fat loss.
- **By a date.** Weeks times rate equals the honest number. Brides: 70% intend to lose,
  want 23 lb on average, only half lose any, those average about 7 lb. If the ask exceeds
  the date, show what the date can hold.
- **For health, or my doctor said.** 5 to 10% of bodyweight is the clinically meaningful
  target (Look AHEAD): blood pressure, HbA1c, lipids all move. 150 min/week plus two
  strength days. Frame the target as 5%, not "goal weight".
- **The last 10 pounds.** Slower by physiology. Often better served by recomp.
- **With PCOS, thyroid, perimenopause, breastfeeding.** All autocompletes. Training does
  not change; nutrition and medical do, and are not ours.
- **Lose weight AND build muscle.** One of the most common phrasings anywhere. This is
  recomp in their words. Route it there.

The honest line for this whole bubble: training is perhaps a fifth of the outcome and we
do not do nutrition. The plan should say so rather than imply the workouts will do it.

### 2. Build muscle
<sub>get bigger</sub>

Maps to our **Build muscle**. Surveys' #1 stated goal.

- **Overall size.** Beginners 1 to 1.5% bodyweight per month, intermediates 0.5 to 1%,
  advanced 0.25 to 0.5%. First year: 10 to 15 lb of real muscle for a man. 20 lb of scale
  weight for a skinny beginner is about five months; say which number is which.
- **A specific part.** "Best workout for" autocomplete is almost entirely body parts.
  Arms: an inch in 4 to 6 months for beginners, roughly an inch per 10 lb gained. Always a
  full-body plan with extra sets for the part, never a part-only plan.
- **Glutes.** The most searched body-part goal among women. Firmer at 4 to 6 weeks, visible
  at 8 to 12, significant at 4 to 6 months.
- **Skinny fat.** Consensus: do not cut. Recomp at maintenance or a small surplus for at
  least four months.
- **Without getting bulky.** Women gain about a pound of muscle a month as beginners.
  Bulky does not happen by accident. The plan is identical.

### 3. Get stronger
<sub>lift heavier</sub>

Maps to our **Get stronger**. 42.3% name it their primary 2026 goal.

- **A number on a lift.** 225 bench: 17% of men surveyed have ever done it; 1 in 100 in
  year one, 1 in 6 after three years. StrengthLevel (48.7M lifts): a 180 lb male beginner
  benches about 127, novice 169, intermediate 220; a 140 lb female beginner 44, novice 72,
  intermediate 108. Compute from their bodyweight, not from the ask.
- **Bodyweight multiples.** OHP 1x, bench 1.5x, squat 2x, deadlift 2.5x are advanced
  markers, not year-one targets.
- **Stronger without getting bigger.** A real autocomplete. Low reps, fewer sets,
  maintenance calories.
- **Strong for life.** "Strengthen knees" is the #1 autocomplete for "exercises to". Grip
  and leg strength predict mortality. Overlaps feel-better.
- **Get back to where I was.** Muscle memory: roughly a tenth of the original time.
  Route to get-back.

### 4. Tone up
<sub>get lean, see abs</sub>

Maps to our **Recomp**, and this is the bubble that should be labelled in their words.

- **Toned arms, legs, stomach.** Every "how to get toned" autocomplete is a body part.
  Toned means enough muscle to have shape plus low enough fat to see it. Recomp with a
  part emphasis.
- **Visible abs.** A body-fat number, not an exercise. Men: outline around 14 to 17%, clear
  at 10 to 13%. Women: tone around 21 to 24%, clear at 16 to 20%. From 25% to 12% at a
  healthy rate is four to six months. Never thirty days.
- **Lean, shredded, summer body.** 8 to 12 weeks for a visible change; 2 to 4 kg in eight
  weeks is realistic. Twelve weeks out is the honest start date.

### 5. Do something new
<sub>first pull-up, first 5K</sub>

**No home in our five.** "I want to be able to" autocomplete: do a pull up, touch my toes,
run 5 miles, do a handstand, lift my girlfriend, do the splits.

- **First pull-up.** Programs promise 6 to 12 weeks, real accounts run 3 to 6 months. The
  ladder entry depends on bodyweight and sex (`01`, `03`). `calisthenics.mjs` already has
  the chain.
- **First push-up, or more.** Adult average 12 to 18 in a set. First full one in about
  eight weeks, staged.
- **Run a 5K, or faster.** Couch to 5K: 9 weeks, 3 runs, ends at 30 minutes running. First
  5K typically 35 to 45 minutes. Sub-30 needs 9:39/mile and 6 to 10 more weeks.
- **A faster mile.** Sub-8 from 9 to 10 minutes: 8 to 12 weeks. From 11 to 12: months.
- **Touch my toes, do a split.** Toes in 4 to 8 weeks at 5 to 10 minutes most days.
  Splits: do not promise a date.
- **Handstand and skills.** 3 to 12 months of daily practice.

Every one of these is deterministic. No generator, no AI, a ladder and a schedule.

### 6. Train for an event
<sub>a race, a test, a trip</sub>

**No home in our five.** "How to train for" autocomplete: half marathon, 5k, marathon,
hyrox, ironman, 10k, triathlon, pull ups, spartan race.

- **5K to marathon.** Half: 12 to 16 weeks, 20 from zero; ACSM says 6 to 12 months from
  sedentary. Marathoners on Strava most often pick 4-run weeks. First-half goal: finish.
- **Hyrox.** 8 x 1 km with 8 stations. 1.5M participants, 2.5M expected in 2026, 1,200 US
  training clubs, nearly even sex split. It has a doubles format, which is literally our
  product.
- **Spartan, Tough Mudder.** 6 to 8 weeks for a Sprint if active; 16 from nothing.
  Baseline: 3 miles, 20 push-ups, one pull-up.
- **A fitness test.** 12 weeks. Run, push-ups, sit-ups. "Get in shape for the military" is
  an autocomplete.
- **A workout challenge.** Scaled beginner 50 to 70 minutes.
- **A season or a trip.** "Get in shape for hiking / soccer / basketball" are all
  autocompletes.

The date drives everything and the generator does not know what a date is.

### 7. Feel better
<sub>energy, sleep, live longer</sub>

Maps to our **Stay consistent**, and gives it content. The biggest family in every survey
and the thinnest in every fitness app.

- **Mood, stress, sleep.** Exercise has medium effects on depression (d ≈ 0.43) and anxiety
  (d ≈ 0.42) versus usual care (Singh 2023 umbrella review). Shorter and lower intensity
  works best for anxiety. Group and supervised settings help more for depression. Felt
  within two weeks: the fastest-returning goal on the list, and "doing it with someone
  helps" is our whole product.
- **Live longer.** 37.8% predict longevity as 2026's defining trend. What predicts it: VO2
  max, grip, leg strength, muscle mass. "Improve my vo2 max" is now an autocomplete.
- **More energy, less winded.** Walking first. Weeks.
- **Prevent problems.** 89% call activity one of the most effective forms of preventive
  care. 150 minutes plus two strength days.
- **Move better, posture, stiffness.** 48%. Empty in every competitor. Five to ten minutes
  a day.
- **Pain.** Top two autocompletes for "exercises to". We hold no injury data. The answer is
  a per-exercise "this hurts" that swaps and remembers, not a questionnaire.

### 8. Get back into it
<sub>after time off</sub>

**No home in our five.** And it is most of our users, because most beginners quit.

- **After years off.** Regain in a tenth of the time. Start at half the old loads. Six to
  twelve weeks to most of it back.
- **After a baby.** "Start working out postpartum" is an autocomplete. Core and pelvic floor
  first, 6 to 12 weeks, function before appearance. Do not sell the pre-baby body.
- **Never really started.** "Beginner workout for" autocomplete is women, women over 50,
  women over 40, men over 50, men over 40. First 28 days of consistency is the strongest
  predictor of still training at a year. Three short full-body days. Nothing else matters
  if week five does not happen.

### 9. Stay consistent
<sub>actually stick to it</sub>

Maps to our **Stay consistent**. 44% want a regular routine. "How to stay consistent with
working out / in the gym / with weight loss / with adhd" are all autocompletes.

- **I keep quitting.** Weekly goals: ten times more likely to hit them ten weeks running
  (Strava). First 28 days predicts the year. Median dropout week 19. A partner who sees the
  week is the mechanism in `06`.
- **I don't know what to do.** Hand them the zero-knowledge plan. Ask nothing.
- **I only have 20 minutes.** Frequency beats duration for habit. Longer sessions only
  helped adherence in people who already trained often. Session length is a first-order
  variable no generator models.

## Part 3: the finding that reframes the rest

A 2026 paper in *Frontiers in Sports and Active Living* analysed 389,481 Fitbod users,
100,709 of them beginners. Adherence was defined generously: one session a week from day
29 to day 365, with six misses allowed.

- **10.1% of beginners were still adherent at 12 months.** Intermediates 18.3%, advanced
  25.8%.
- **Median time to dropout: 19 weeks.**
- **The strongest predictor was training frequency in the first 28 days.** Each standard
  deviation more cut dropout hazard by 27% at week 11.
- Longer sessions only helped people who already trained frequently.
- Users over 51 stuck at 13.3% versus 8.4% for 18 to 40. Men 11.4%, women 7.9%.
- **Training goals were not in the dataset.** The authors list goals, motivation and social
  support as limitations and say accountability features "remain largely under-studied in
  real-world settings".

Read that alongside the goal research. The best AI workout generator on the market, with
six goal options and a personalisation engine, keeps one beginner in ten for a year and
has never measured whether the goal they picked mattered. Everything in Parts 1 and 2 is
about getting the first screen right. This says the first screen is worth getting right
only if week five happens, and that the thing most likely to make week five happen is not
on any goal list. It is a partner and a schedule. Which is `06` and `09`, arrived at from
the outside.

## Part 4: what this means for the first screen

The product rule is ask the goal, then tell them the plan. Two taps is still that. This
is the shape the research supports:

**Tap one: nine bubbles, two or three words each.** A long label is a label nobody reads,
so the button carries the shortest true phrase and a quiet line under it does the
explaining:

| Button | Under it |
|---|---|
| Lose weight | and keep it off |
| Build muscle | get bigger |
| Get stronger | lift heavier |
| Tone up | get lean, see abs |
| Do something new | first pull-up, first 5K |
| Train for an event | a race, a test, a trip |
| Feel better | energy, sleep, live longer |
| Get back into it | after time off |
| Stay consistent | actually stick to it |

Not five abstract categories; nine things people actually say, with weight loss present and
unjudged but not the headline. Every longer phrasing people really type ("lose 20 pounds
before my sister's wedding", "I want to be able to do a pull up") stays in the data as an
alias, so it can be matched and shown later. It just never goes on a button.

**Tap two: "what specifically?"** The children above. Two to seven per bubble, one tap,
optional. A number, a date, a body part, an event. Each one changes the numbers the plan
shows and sometimes the plan.

**Never a third tap.** Every modifier after that is inferred (`07`) or asked later in
context (`00`).

**The plan screen answers the fantasy honestly.** Because "fast" is the default ask, the
first thing the plan says for any goal with a number or a date is the healthy rate and the
date that produces. "You asked for 20 pounds by the wedding in 6 weeks. 6 to 9 is what six
weeks can do without costing you muscle. Here is the plan for that." Not a warning. The
plan.

**Three bubbles need work we have not done.** Be-able-to, event and get-back need a date
field, deterministic ladders and a re-entry ramp respectively. None needs the AI. All
three are underserved by every competitor found.

## Part 4b: what is not a goal

Three children were pulled out of the bubbles on 2026-09-09: "With a health condition"
(was under Lose weight), "After an injury" (was under Get back into it) and "Over 40"
(was under Build muscle).

None of them is a goal. They are **limits on how a goal gets trained for**, and mixing
them into "what do you want?" asks somebody to describe a problem at the exact moment they
came to state an ambition. Different question, different screen.

The screen they belong on, flagged as later work and now on the master sheet:

> **Anything we should know?** Optional, with an obvious skip. Injuries, conditions, things
> that hurt, equipment you do not have. Shown **after** the plan exists, never before, so
> it can only ever make an existing plan safer and can never stand between somebody and
> their first plan. Answerable later from Setup.

This still obeys the product rule. Ask the goal, tell them the plan, and only then offer
to make it safer.

Most of it is probably solved more cheaply anyway. A per-exercise "this hurts, give me
something else" that gets remembered turns a safety input into a feature people would use
regardless, and it needs no questionnaire at all. `findAlternatives` already exists;
nothing records why it was used. See open questions 6 and `07` on recording swaps.

## Part 5: where this disagrees with our current five

- **"Recomp" should be labelled "Tone up".** Two words, and the two words most people
  already use. The goal is right and popular; the word on the button was one nobody says.
  Two rules came out of this pass and both generalise. **If a label needs a comma, it is
  two labels or it is too long.** And **if a word makes somebody stop and work it out, it
  is the wrong word**, however accurate it is. That killed "Bodyweight multiples" (gym
  jargon), "Back to my old numbers" (only means something to somebody who kept records),
  "Murph" (CrossFit), "Hit a number", "Doctor's orders", and "Before a date", which reads
  as a romantic one.
- **"Stay consistent" is two different things.** One is "I want to feel better and be
  healthy" (the biggest survey family). The other is "I keep quitting". They need different
  first screens even if the plan converges.
- **We are missing three of nine families.** Be able to do something, train for an event,
  get back into it. Between them they cover mastery goals, the fastest-growing
  participation sport in the world, and the majority of people who will ever open the app.
- **Mobility, flexibility and posture is a bubble of its own or at least a child.** 48%.
  Nobody offers it.

## Open questions this raises

- Nine bubbles is more than five. Is nine too many for one screen, or is the honest answer
  that five was too few? A 3x3 grid of short phrases is common in onboarding and tested
  well in apps found (Freeletics uses nine journeys).
- The say-versus-search gap: do we design the first screen for what people say (strength,
  health) or what they search (fat loss, abs)? This file argues both, ordered by pride.
  That is a design bet, not a finding.
- Reddit. The single richest source of verbatim goals is unreachable from here. Worth an
  hour of Mo scrolling r/loseit and r/Fitness "what are your goals" threads by hand to
  check the nine bubbles against it, because if a tenth family exists that is where it is.
- Whether any of this survives the Fitbod number. If 90% of beginners are gone by month 12
  regardless of goal, the first screen may matter far less than what happens in week five,
  and the next block of work belongs to `06` and `09` rather than here.
