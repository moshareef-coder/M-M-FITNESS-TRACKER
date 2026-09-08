# Real goals — what people actually type, and what it means for a plan

This draws on Reddit fitness communities, app store reviews for
Fitbod/MyFitnessPal/Strava/Hevy, wedding and weight-loss forums,
personal-trainer intake-form guidance, and peer-reviewed research on
return-to-activity after injury. Sources are in `knowledge/sources.md`.

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
That collapses the real phrasing into seven categories, one cross-cutting
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
- Real gains are slower than people expect: visible strength gains in
  8–12 weeks, but only about 1–2 lbs of actual lean mass per month even
  when everything's dialed in. Worth setting that expectation up front.
- If a body part is named, bias weekly volume toward it above what an
  evenly-distributed split would give it — legitimate specialization,
  since muscle (unlike fat) does respond to targeted volume.

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
- If a number is given, check it against the rough experience ladder:
  bodyweight bench press is roughly a first-year target, 1.35x bodyweight
  is 2–3 years in, 1.5x is 5–6 years of dedicated training. Flag when the
  stated timeline doesn't match.
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

## 6. Running goal (distance or pace)

**What people say:** "Run a 5-minute mile," "run a 5K without stopping,"
"run a 5K under 20/25/30 minutes," "sub-4-hour marathon."

**Genuinely separate.** The app has no running plan type at all today.
Distance goals ("5K without stopping") need a run/walk interval structure
that gradually extends continuous running time. Pace goals ("5-minute
mile," "sub-20 5K") need that plus interval work at faster-than-goal pace
on top. Realism depends heavily on current level, which we don't ask
about today — at minimum, "can you currently run continuously for 5
minutes?" is the cheap version of the same question as the skill ladder.

## 7. Everyday fitness / no specific target

**What people say:** "I want to keep up with my kids without getting
winded," "carry groceries without my back hurting," "not out of breath on
stairs" — or, just as often, nothing specific at all: "overall health,"
"just want to get fit," "get back into shape."

**One category, not two.** A vague non-answer should default into the same
plan the functional answer produces — general fitness with a bias toward
the movement patterns that show up in daily life (carrying, stairs, floor
transitions) — rather than forcing a choice between the other categories
the person hasn't actually made, or inventing a separate "default" plan
that's really the same thing anyway.

**What it implies:**
- A combination of cardio base-building and general strength work, biased
  toward functional movement patterns rather than a specific lift number
  or calorie target.
- This is the strongest case against forcing everything into
  trainer-vocabulary goals — "stay consistent" doesn't capture the actual
  motivation behind either the functional or the vague phrasing, and
  neither does any of the other four original goals.

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
| Recomp | Aesthetic ("toned," "lean") or skinny-fat framing — same request | Existing — moderate calories, whole-body hypertrophy |
| Skill ladder | First pull-up, first push-up | **New plan type** — assistance-ladder progression |
| Running goal | Distance ("5K without stopping") or pace ("sub-5 mile") | **New plan type** — app has none today |
| Everyday fitness | Functional language or a vague/no answer — same default plan | **New category**, replaces forcing a choice |
| *Modifier:* starting context | Returning after a break (faster) / older or post-injury (slower) | Applies across any of the above, not a goal itself |
| *Not onboarding:* plateaus | Stalled weight or lift progress from logged history | Algorithm behavior, not a `real-goals` category |

## What this suggests for onboarding

Ask the goal, then tell them the plan — no intake form. The one free-text
answer (or a slightly reworded set of options) routes into one of the
seven categories above; a couple of the categories have one cheap optional
follow-up (a date, a number, an area) rather than a full intake form; and
starting-context signals (age, "returning," injury language) apply as a
ramp-speed modifier regardless of which category someone lands in.

All research gaps flagged earlier are closed. Next step is turning this
into the actual routing logic in the selector.
