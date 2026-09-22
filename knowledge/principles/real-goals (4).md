# Real goals — what people actually type, and what it means for a plan

This draws on Reddit fitness communities, app store reviews for
Fitbod/MyFitnessPal/Strava/Hevy, wedding and weight-loss forums,
personal-trainer intake-form guidance, and peer-reviewed research on
return-to-activity after injury. Sources are in `knowledge/sources.md`.

**Reconciled against Mo's independent research** (`mo-knowledge/research/
11-real-goals.md`), which used survey data with real sample sizes (HFA/
Kantar n=2,000, Life Time n=750, a Frontiers paper analyzing 389,481
Fitbod users) and Google autocomplete/search-volume data — stronger
evidence than the forum/app-review approach here could reach on its own.
Where the two disagreed or one found something the other missed, that's
called out explicitly below rather than silently picked. Net effect:
two new categories added (mobility/posture; broadening running into any
date-driven event), several numbers upgraded to better-sourced ones, and
one open disagreement flagged rather than resolved unilaterally (see
"Where this still disagrees with Mo's research," below).

The five goals currently on the onboarding screen — lose weight, build
muscle, get stronger, recomp, stay consistent — are trainer vocabulary.
Almost nobody in the wild uses that language unprompted. Below is what
people actually say, consolidated into categories.

**The consolidation principle:** if two phrasings only differ by one piece
of information the onboarding flow can just ask for — a date, a target
number, an area to prioritize — they're the same category with an extra
question, not two categories. A category only earns its own row when it
needs a genuinely different plan: a different calorie direction, a
different progression structure, or a plan type the app doesn't have yet.
That collapses the real phrasing into nine categories, one cross-cutting
modifier, and one thing that isn't an onboarding goal at all.

---

## 1. Lose weight

**What people say:** "Lose weight," "lose 20/30/45 lbs before my wedding,"
"fit into my dress by [date]," "lose my belly fat / love handles."

**One category, not three.** A date isn't a different goal — it's one more
onboarding answer ("by when, if there's a date?") that turns on a
timeline check. A named body part isn't a different goal either — fat loss
doesn't work spot-by-spot, so "lose my belly fat" gets the same plan as
"lose weight," with the copy correcting the spot-reduction assumption
rather than the plan changing.

**What it implies:**
- A calorie deficit, sized against a date if one's given, against a
  standard safe rate if not.
- Safe rate: roughly 0.5–1% of bodyweight per week (~1–2 lbs/week for most
  people). When the stated date and number imply more than that, say so —
  offer what's achievable by that date plus a longer timeline for the
  rest, rather than quietly promising the faster number.
- When a specific area is named, the plan proceeds exactly as normal but
  the copy should note that fat loss isn't targetable to one area, so the
  person understands why the plan doesn't just add ab exercises.

## 2. Build muscle

**What people say:** "Build muscle," "skinny and want to gain," "hardgainer,"
"I eat a lot and don't gain weight," "grow my glutes," "chicken legs,"
"bigger arms."

**One category.** Whether someone states it generally or names a specific
body part, the mechanism is the same — surplus calories plus hypertrophy
volume. The body part is just an optional "anything you want to
prioritize?" answer that biases volume toward that muscle group, the same
pattern as the date question above.

**What it implies:**
- A calorie **surplus**, not maintenance or a deficit — this is the
  opposite direction from "lose weight" and needs to be flagged explicitly,
  since not eating enough is the most common reason this goal fails for
  people who don't already know to eat more.
- Real gains are slower than people expect, and slower the more trained
  someone is: beginners can gain roughly 1–1.5% of bodyweight per month,
  intermediates 0.5–1%, advanced trainees 0.25–0.5% (tighter and better-
  sourced than a flat "1–2 lbs/month" for everyone). First year for a man:
  roughly 10–15 lb of real muscle — worth being explicit that 20 lb of
  scale weight for a skinny beginner is closer to five months, and saying
  which number (scale weight vs. lean mass) is being promised matters.
- If a body part is named, bias weekly volume toward it above what an
  evenly-distributed split would give it — legitimate specialization,
  since muscle (unlike fat) does respond to targeted volume. Glutes are
  the most-searched body-part goal among women specifically — visible
  change around 8–12 weeks, more significant by 4–6 months. Arm growth is
  slower: roughly an inch in 4–6 months for a beginner. Always keep it a
  full-body plan with extra sets for the named part, never a part-only
  plan — isolating one body part and neglecting the rest isn't what
  "grow my arms" actually means once you translate it.

## 3. Get stronger

**What people say:** "Get stronger," "bench 225," "bodyweight bench press,"
"squat 1.5x bodyweight," "deadlift double bodyweight," "I want to be
strong but scared of gaining muscle," "toned not bulky."

**One category.** A specific number is just an optional target on top of
the same underlying plan — it turns on a realism check against how long
that benchmark typically takes. "Toned not bulky" doesn't change the
programming at all (women don't put on significant unintentional muscle
just from lifting heavy — the physiology doesn't support the fear), it
just means the plan's copy should address the worry directly instead of
silently ignoring it.

**What it implies:**
- A percentage-based, PR-tested progression structure (5x5-style testing
  and progression), not just heavier weight with no structure.
- If a number is given, check it against real strength-standard data
  rather than a single rule of thumb — a 180 lb male beginner benches
  roughly 127 lb, novice 169, intermediate 220 (StrengthLevel, 48.7M
  logged lifts); a 140 lb female beginner roughly 44 lb, novice 72,
  intermediate 108. Compute the check from *their* bodyweight and current
  level, not a flat bodyweight-ratio guess. Bodyweight-multiple targets
  (1x OHP, 1.5x bench, 2x squat, 2.5x deadlift) are advanced-level
  markers, not year-one goals — flag when the stated timeline doesn't
  match. For context: only about 17% of men have ever benched 225 at all,
  and roughly 1 in 100 get there in year one.
- If bulk-avoidance language shows up, the plan itself doesn't need to
  change — the copy does. Leading with heavy compound lifts without
  addressing the "will this make me bulky" concern risks the person not
  trusting or following an otherwise-correct plan.

## 4. Recomp

**What people say:** "Get toned," "get lean and defined," "look good
shirtless," "get abs," "build muscle and lose fat at the same time,"
"normal BMI but soft," "bulk/cut advice hasn't worked for me."

**One category.** These are the same request from two different angles —
aesthetic phrasing and "want both at once" phrasing both describe body
recomposition, not a bulk and not a cut. People frustrated that pure
bulk-then-cut advice didn't work for them are asking for exactly this.

**What it implies:**
- Moderate calories — a small deficit or maintenance, not a full surplus
  or full deficit — with protein-forward, whole-body hypertrophy-biased
  training. Going all-in on either bulk or cut logic is what these people
  say already failed for them.
- Fitbod treats "toning" as a first-class onboarding option, which is a
  reasonable signal this is common enough to name directly rather than
  fold into "lose weight" or "build muscle."

## 5. Skill ladder (first pull-up, first push-up)

**What people say:** "I want to do one pull-up," "get my first pull-up,"
"10 push-ups with good form."

**Genuinely separate — not reachable by adding a question to an existing
path.** This isn't a calorie or physique goal, it's a specific movement
competency, and the two examples aren't quite the same kind of problem:

- **Pull-ups are a real, measured weak-link problem.** Pushing strength
  in typical adults runs roughly 1.5–2.7x pulling strength — most people's
  training and daily life is push-dominant, so the pulling pattern
  genuinely is undertrained, not just untested. This deserves
  disproportionate volume on lats/biceps/rear delts/grip.
- **Push-ups are usually a general strength or core-stability gap,** not
  one weak muscle — pushing is typically the *better*-trained pattern, so
  failing a push-up more often comes down to overall beginner strength or
  the core stability needed to hold a rigid plank under load.
- Both still need the actual regression ladder practiced (dead hang →
  band-assisted → negative → strict pull-up; incline → knee → full
  push-up), not just indirect muscle work — the coordination of the
  specific movement matters on top of the underlying strength.
- We should ask one cheap question to place someone on the ladder: can you
  currently hang from a bar for 10 seconds? Do a knee push-up?

## 6. Train for an event (distance, pace, or a competitive format)

**What people say:** "Run a 5-minute mile," "run a 5K without stopping,"
"sub-4-hour marathon," "train for a half marathon," "get ready for Hyrox,"
"Spartan race," "get in shape for a fitness test," "get in shape for
hiking/soccer/basketball season."

**Broader than pure running — genuinely separate, and bigger than
expected.** Running goals need a run/walk interval structure (distance)
or interval work at faster-than-goal pace (pace) — the app has no running
plan type at all today. But the same "date + deterministic ladder" shape
covers a wider family than just running: half/full marathon training
(12–16 weeks; ACSM suggests 6–12 months from sedentary), Hyrox (a genuine
mainstream phenomenon now — participation went from 570k to 1.5M in one
season, with a near-even sex split, and it has an actual doubles format,
which is directly relevant to a two-person training app), Spartan/Tough
Mudder (6–8 weeks if already active, 16 from nothing), or a fitness test
(commonly a 12-week runway). The date is the input that drives everything
here, and the generator currently has no concept of a target date at all
— that's the actual gap, more than the running-specific mechanics.

## 7. Mobility, flexibility, and posture

**What people say:** "Fix my posture," "improve my posture," "exercises to
improve posture," "exercises to strengthen knees / lower back," general
stiffness complaints.

**No home in the current five at all — and it's not a small miss.** This
showed up as the second-largest stated 2026 fitness goal in survey data
(48%, HFA/Kantar), jumping from outside the top three the year before —
and it's absent or buried as an afterthought in every major competitor
(Fitbod's six goals, Freeletics' nine journeys, Nike Training Club's
four). It doesn't need much: a five-to-ten-minutes-a-day mobility/posture
routine is a legitimate, deterministic plan type on its own, distinct
from a strength or cardio session, not a rounding error tacked onto
another goal.

## 8. Everyday fitness / feel better / just be consistent

**What people say:** "I want to keep up with my kids without getting
winded," "carry groceries without my back hurting," "not out of breath on
stairs," "live a longer, healthier life," "more energy" — or, separately,
"I keep quitting," "I don't know what to do," "I only have 20 minutes" —
or, just as often, nothing specific at all: "overall health," "just want
to get fit."

**One plan, but Mo's survey data suggests these split into two
*framings* worth keeping distinct even though the underlying plan
converges:** "feel better / be healthy / live longer" (the single biggest
family in every survey found, and the thinnest in every fitness app) is a
different *motivation* than "I keep quitting" (a habit/adherence problem).
Both point at the same general-fitness plan — cardio base-building plus
general strength, biased toward functional movement patterns — but the
first screen's wording and the check-in messaging probably shouldn't
treat them identically, since one is about how someone wants to feel and
the other is explicitly about a pattern of failure they're naming. Worth
testing as two labels routing to the same plan, rather than one vague
catch-all.

**What it implies:**
- A combination of cardio base-building and general strength work, biased
  toward functional movement patterns rather than a specific lift number
  or calorie target.
- This is the strongest case against forcing everything into
  trainer-vocabulary goals — "stay consistent" doesn't capture the actual
  motivation behind any of these phrasings on its own.

---

## The finding that reframes priority, not taxonomy

Mo's research surfaced a peer-reviewed adherence study (389,481 Fitbod
users) worth stating plainly here even though it isn't a `real-goals`
category: only **10.1% of beginners were still training a year later**,
and the strongest predictor of sticking with it wasn't which goal someone
picked — it was training frequency in the first 28 days. This doesn't
change any category above, but it's a real argument that getting the
first-screen goal exactly right may matter less than what happens in
week five, and that the app's actual premise (a visible partner) may be
doing more retention work than precise goal-matching ever could. Worth
keeping in view as category-specific plan work continues, not something
to resolve in this file.

## Where this still disagrees with Mo's research — flagged, not resolved

**Is "returning after a break" a modifier or its own bubble?** This file
treats it as a cross-cutting modifier (see below) layered on top of
whichever goal someone picks, on the reasoning that the *plan* changes the
same way regardless of the underlying goal (faster ramp, old benchmark as
a target). Mo's research treats "get back into it" as its own first-class
bubble, on the reasoning that it's not a rare edge case — most beginners
have quit before (only 10.1% stick past a year, per the finding above),
so "returning" may be the *majority* case, not a modifier on a minority
one, and deserves its own first-screen presence and tone rather than
being buried as a follow-up modifier under another goal. Both readings are
defensible; this is a genuine open question for Mo to weigh in on rather
than something either research pass should decide alone.

---

## Cross-cutting modifier: starting context (not a goal on its own)

**What people say:**
- *Faster ramp:* "get back to what I lifted in college," "coming back to
  lifting as an adult" — detraining, not untrained.
- *Slower ramp:* "at 67, the usual aches and pains," "returning after ACL
  surgery," "afraid of reinjuring my knee," "the days of heavy squats are
  long gone."

**These are the same mechanism pointed in opposite directions**, not two
separate goals: both describe someone's *starting context* shifting how
fast the plan should ramp, layered on top of whichever category above
they picked — not a category in their own right.

- **Returning after a break** can ramp faster than a true beginner (real,
  if fuzzy, "muscle memory" from prior training), but should still treat
  any old benchmark as a target to work back toward, not a starting point.
- **Older adults and people returning from a specific injury** need the
  opposite: smaller load jumps, more conservative starting weights, and
  joint-friendly exercise selection. This is backed by real research, not
  just caution for its own sake — fear of reinjury is the single most
  commonly cited reason people don't return to their prior activity level
  after an injury (roughly two-thirds of people citing a psychological
  barrier name this specifically), and inactive adults lose about 1–2% of
  muscle mass per year after 50, which strength training directly
  counteracts. Stronger muscles around a joint also absorb more impact and
  measurably reduce pain at that joint — the self-limiting belief ("heavy
  lifts are behind me") shouldn't be accepted uncritically, but shouldn't
  be ignored either; a gentler on-ramp lets someone discover their own
  capacity without hard-coding a ceiling they didn't actually ask for.
- Someone can carry both at once (a 55-year-old getting back into lifting
  after a hip issue) — the two directions aren't mutually exclusive.

## Not a goal at all: plateaus

**What people say:** "Stuck at the same weight for weeks," "haven't moved
on the scale in a month," "my bench hasn't gone up in 8 weeks."

This doesn't belong in an onboarding taxonomy — nobody picks it on day
one. It's a signal the algorithm needs to recognize from someone's own
logged history and respond to automatically (a deload, a deficit check, a
stimulus change), which connects directly to the brief's own open question
about how much the plan should change between 0 and 60 logged sessions.
Flagging it here since it came up constantly in the research, but it's a
`formulas/exercise-selector` concern, not a `real-goals` one.

---

## Summary table

| Category | Falls under it | Existing goal or new? |
|---|---|---|
| Lose weight | Deadline optional; named body part is a copy-trigger only | Existing — one plan, two optional extras |
| Build muscle | General or hardgainer framing; named muscle group is a copy-trigger only | Existing — surplus required, most common failure point |
| Get stronger | General or with a numeric/bodyweight-ratio target; bulk-fear language is a copy-trigger only | Existing — needs a PR-tested progression structure |
| Recomp | Aesthetic ("toned," "lean") or skinny-fat framing — same request | Existing — moderate calories, whole-body hypertrophy. Both research passes independently flag "recomp" as the wrong word for the button. |
| Skill ladder | First pull-up, first push-up | **New plan type** — assistance-ladder progression |
| Train for an event | Running (distance/pace), half/full marathon, Hyrox, Spartan, a fitness test — any date-driven event | **New plan type** — app has none today; the date is the core missing input |
| Mobility/posture | "Fix my posture," joint/stiffness complaints | **New category** — 48% of people want this, no competitor offers it well |
| Everyday fitness / consistency | Functional or health-motivation language, or an adherence complaint, or a vague/no answer — same underlying plan, two possible framings | **New category**, replaces forcing a choice |
| *Modifier:* starting context | Returning after a break (faster) / older or post-injury (slower) | Applies across any of the above — **but see open disagreement above**, Mo's research argues this should be its own bubble instead |
| *Not onboarding:* plateaus | Stalled weight or lift progress from logged history | Algorithm behavior, not a `real-goals` category |

## What this suggests for onboarding

Ask the goal, then tell them the plan — no intake form. The one free-text
answer (or a slightly reworded set of options) routes into one of the
nine categories above; several of the categories have one cheap optional
follow-up (a date, a number, an area) rather than a full intake form; and
starting-context signals (age, "returning," injury language) apply as a
ramp-speed modifier regardless of which category someone lands in — or,
if Mo's reading wins out, as its own first-screen option given how common
it actually is.

Research gaps from the original pass are closed. Two items remain open
for discussion rather than resolved unilaterally: the modifier-vs-bubble
question above, and how much the retention finding should reprioritize
what gets built next (precise goal-matching vs. the habit/partner
mechanism Mo's `06`–`09` argue matters more).
