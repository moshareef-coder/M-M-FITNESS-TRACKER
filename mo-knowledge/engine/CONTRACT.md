# The generate-workout contract

What the function takes, what it gives back, and what the screens are allowed
to assume. Written for whoever is building the onboarding and setup screens, so
that nothing has to be read out of `adapter.mjs` to get a field name right.

Everything here is exact. Where a field is optional it says so and says what
happens when it is missing, because "the engine ignores it" and "the engine
falls back to a guess" are different promises and the screens need the
difference.

The one rule with teeth: **the chip lists are exported, not written**. See
section (d).

---

## (a) What generate-workout receives

One JSON object, posted to `/functions/v1/generate-workout` with the user's
access token. Every field is optional. The engine has to produce a week for
somebody on day zero who has answered nothing, and it does.

| field | type | read by | what it does |
|---|---|---|---|
| ~~`user_name`~~ | | | **removed 2026-09-12.** The client no longer sends it and the function deletes it, along with `name`, `email`, `user_email` and `partner_name`, before anything reads the payload. Nothing in the engine ever wanted a name; privacy.html now promises none is collected here |
| `goal` | text | engine | one of the five legacy strings ("Lose weight", "Build muscle", "Get stronger", "Recomp (lose fat, gain muscle)", "Stay consistent") |
| `goal_detail` | text | engine | the free text sentence. Matched against the alias table, and a confident match can outrank the button |
| `goal_bubble` | text | engine | a goal id from the tile picker. **2026-09-15**: the accepted set is now derived from `GOAL_PARAMS` rather than typed out here and in adapter.mjs, so it is exactly what the engine has parameters for: the eight the picker offers (`lose-weight`, `build-muscle`, `get-stronger`, `tone-lean-abs`, `build-endurance`, `move-better`, `feel-better`, `consistent`) plus the three the picker retired and live profiles still carry (`do-a-thing`, `event`, `get-back`). `build-endurance` and `move-better` were rejected by the old hand written list, fell back to the legacy `goal` string, and resolved to the habit plan for every user who tapped either. A valid one beats `goal` and `goal_detail` |
| `goal_child` | text | engine | a child id under that bubble. Validated against the bubble; an id that does not belong to it is dropped and the bubble default runs. **2026-09-15**: the picker sends `null` on every tile and has since the rewrite, so `_default` is the live path and the children here are history. Anything the bubble default alone cannot express has to be earned by the bubble: see `stretching.cooldownMinutes` |
| `goal_secondary` | jsonb or JSON string | engine | **new.** The "and also" goals, `[{ bubble, child }]`, same ids as above. Optional, and absent, `null`, `[]` and nonsense all behave identically to not sending it. The first entry the engine can honour and the second one are used; the rest are named in `meta.goals.ignored` and in `notes`. What a secondary may and may not change is section (e) |
| `sex` | text | engine | `"Male"` / `"Female"`. Changes the pattern ratios that set starting loads |
| `age` | number | engine, function | **2026-09-18.** Was "TDEE only", and that was accurate: the number was bounded by the edge function, carried in the payload and never put on the `person` object, so a 25 year old and a 60 year old got byte-identical weeks and every line of research/02 was unimplemented. It now sets two dials (engine/age.mjs): the RATE of advance and the length of the warm-up block. It never changes weekly sets, rep ranges, movement selection or the ceiling, which is research/02's own limit on what age is allowed to do. **Absent is not neutral**: an unknown age takes the careful ramp (research/02: "the age-unknown default should look like the older-adult default") and does NOT take the longer warm-up. Outside 10 to 120 reads as absent. See `meta.age` |
| `height_in` | number | function | TDEE only |
| `activity_level` | text | function | TDEE only |
| `current_weight` | number | engine | pounds. Without it there are no starting weights at all, and the plan says so in `meta.missing` |
| `gym_days_this_week` | number | engine | fallback day count when `challenge_target` is absent |
| `challenge_target` | number | engine | days per week they chose themselves, 2 to 6. Beats everything else |
| `session_minutes` | number | engine | **new.** How long one session should take, in minutes. Absent, `null`, `0` and nonsense all mean "never answered" and the goal's own session length runs. A real answer replaces it: the week is built to fit the number, in both directions. Clamped to 15 and 120, and the clamp is said in `notes`. **2026-09-12**: a longer answer than the plan needs buys two things that cost no recovery: the rest the clock took back, if a lighter week left room for it, and a ten minute stretching block instead of five. It never buys hard sets past the weekly ceiling, and when there is nothing left to buy it still says so. Ramp sets are NOT among them: they are warm-up, they are on every day that has something to ramp, and no session length decides them |
| `train_styles` | text[] | engine | **new.** What the person agreed to do, from onboarding: `lifting`, `home`, `running`, `cycling`, `walking`, `pilates`, `yoga`, plus `swimming`, `rowing`, `classes`, `hiking`, `sports`. Strict opt in by product decision: a style not in the list is never planned and there is no floor putting resistance training back. `null`, an empty list and a list of nothing recognisable all mean "never asked" and build exactly the plan built before this column existed. Two resistance styles: `lifting` means a gym and narrows nothing, `home` without `lifting` means bodyweight and dumbbells only and folds into the equipment limit rather than opening a second path through the builder. A limit set by hand on the limits sheet survives the merge. A person who ticked no resistance style gets the day they asked for: a cardio session built from `knowledge/exercise-library/cardio.mjs` (see `workout.cardio`), or a yoga or Pilates class built from those libraries (see `workout.flow`), alternating by date when they ticked both kinds. Where nothing in what they ticked can be built, which today means Sports or a cardio mode with nothing at their level, the lifting day stands and `meta.styles.honoured` is false with a sentence saying so |
| `for_date` | text | engine | **new 2026-09-19.** The day this plan is being written onto, `YYYY-MM-DD`. Read by ONE thing: the seed for the session a no-lifting week gets (`workout.cardio`, `workout.flow`). Without it that seed is the moment of the call, so planning Thursday and Friday in one sitting came back as the same run twice and never turned the cardio/flow ring. Anything that is not an ISO day, this field included when absent, means "today", which is what every client that predates it sends. It changes nothing about a lifting week |
| `focus` | text | engine | a day name ("Push day"), which day of the week they want. Beats the rotation |
| `focus_groups` | text[] | engine | the body map pick, now with a priority tier on each entry. `"chest:3"` is red, `"chest:2"` yellow, `"chest:1"` green, and a bare `"chest"` with no tier is yellow, which is what every pick saved before 2026-09-12 means. Muscle group keys or the finer piece keys the zoomed view uses; both are flattened to the app's fourteen groups. The single entry `"all"` is "select my whole body" and expands to every group at green. A jsonb object, `{"chest":3}`, is accepted too, so the column can become jsonb later without the engine changing |
| `focus_chosen_at` | timestamptz | engine | when that pick was made. Older than 60 days comes back as `meta.focus.stale` |
| `limits` | jsonb or JSON string | engine | **new.** What hurts and what they do not own. Shape in section (c) |
| `history` | array | engine | the old flattened map of best lifts, `{ exercise_name, weight }`, no dates. Used for loads only. With no dates it can neither measure a training history nor earn a movement, so a payload carrying only `history` gets the default pool |
| `logs` | array | engine | real sessions, `{ entry_date, exercise_name, weight, reps, sets }`. Beats `history` whenever there is any |
| `plans` | array | engine | completed plans, `{ entry_date, focus, exercises, completed_at }`. Joined against `logs` to calibrate. **Live as of 2026-09-12**: this row has described the join since it was written and the adapter was not passing the column, so until that date every verdict came back `unknown` and nothing behind one ever ran. Only rows carrying `completed_at` are evidence; a plan that was generated and never finished is ignored on purpose. A row that is not an object is dropped, and a row whose `exercises` is not a list keeps its dates and loses the list, so the rotation still sees the session and the join has nothing to join |
| `swaps` | array | engine | `exercise_swaps` rows, `{ entry_date, planned_exercise, chosen_exercise }`. What somebody reached for instead. **Live as of the same date and for the same reason.** With `plans`, it feeds `preferences.mjs`: two occurrences inside 90 days sink a movement to the bottom of its pool, three take it out of the plan and the plan says so by name. It reorders the candidates for a slot and nothing else. It never changes a set count, a rep range, a load or the split, and it never leaves a slot empty |
| `skip_stretching` | bool | engine | **new.** `true` strips `workout.warmup` and `workout.cooldown` and changes nothing else. From `profiles.skip_stretching`. A client may also send `stretching: false`, same effect. It does NOT strip `workout.rampSets`: a ramp set is light sets of the lift itself, not stretching, and somebody who turned the stretching off did not turn off warming up to their working weight |

`limits` is accepted three ways and all three are safe: the object, the string a
jsonb column round trips as through some clients, and `null`. Unknown keys
inside it are dropped in silence.

---

## (b) What it returns

```
{
  workout: {
    focus: "Push day",
    exercises: [
      {
        name: "Machine Chest Press",
        sets: 5,
        reps: 3,
        targetWeight: 140,              // pounds. 0 means "no weight on this card", never a string. WHICH kind of no weight is loadBasis
        loadBasis: "a similar lift",    // new 2026-09-18. "your last session" | "a similar lift" | "bodyweight" | "unknown". See below
        note: "Guessed from a similar lift you logged",
        swap: "Dumbbell Bench Press",   // string or null
        alternatives: [                 // up to three, ranked by nearest stimulus
          { name: "Dumbbell Bench Press", why: "Same movement, same supporting muscles, dumbbell instead" },
          { name: "Incline Push-Up",      why: "Same movement, same supporting muscles, no equipment needed" },
          { name: "Push-Up",              why: "Same movement, same supporting muscles, no equipment needed" }
        ],
        restSec: 180                    // new. The rest this lift was budgeted at, the number the session estimate was costed with. Seed the rest timer from it; the app's own default stays the fallback when absent
      }
    ],
    warmup: [                           // new. Dynamic moves before the first set. Timed, never logged as sets
      { name: "Leg Swings", seconds: 30, perSide: true, group: "hamstrings", kind: "dynamic",
        cue: "Swing from the hip, not the back. Let the range grow with each swing." }
    ],
    cooldown: [                         // new. Static holds after the last set, or a mobility block for the flexibility and mobility goals
      { name: "Standing Calf Stretch", seconds: 30, perSide: true, group: "calves", kind: "static", cue: "..." }
    ],
    rampSets: [                         // new 2026-09-12. On nearly every day now. ABSENT when the day has nothing loaded to ramp. See below
      {
        exercise: "Barbell Back Squat", // always a lift already in `exercises` on this same day
        group: "quads",
        seconds: 270,                   // what the whole ramp costs, rests included
        sets: [
          { weight: 0,   reps: 8, restSec: 45, pct: 0,    cue: "The bar on its own, the machine empty, or the lightest weight you have." },
          { weight: 140, reps: 5, restSec: 45, pct: 0.5,  cue: null },
          { weight: 195, reps: 3, restSec: 60, pct: 0.7,  cue: null },
          { weight: 240, reps: 2, restSec: 60, pct: 0.88, cue: null }
        ]
      }
    ]
  },
  honest: "Six weeks is enough for about twelve pounds, and here is the plan for twelve.",  // or null
  notes: [                              // new. Every sentence the plan said about itself, in the order it said them; [] when it said nothing
    "You asked for 6 days. This goal tops out at 5: more sessions than that and the recovery between them is what gives, so the week is 5.",
    "Machine Shoulder Press is still in this week. The library has nothing else that fills that slot, so go light, stop if it hurts, and swap it out if it does not settle."
  ],
  meta: { ... }
}
```

### `workout.cardio`, a day that is not a lifting day

New 2026-09-18. When `train_styles` holds no resistance style and the cardio
library has a session in a mode they picked, the workout is that session and
not a lifting day:

```
workout: {
  focus: "Easy Run",
  cardio: {                   // present ONLY on a cardio day, absent on every lifting day
    name: "Easy Run",
    mode: "running",
    minutes: 25,
    effort: 4,                // rate of perceived exertion, 1 to 10. We do not know anybody's heart rate
    cue: "Conversational. If you cannot speak a full sentence, slow down.",
    structure: null           // plain words for an interval session, null for continuous work
  },
  exercises: [],              // ALWAYS empty on a cardio day. A run has no sets and must never be logged as one
  warmup: [], cooldown: []    // the mobility block is chosen for a lifting day's patterns, so it does not ride along
}
```

`meta.session.estimatedMinutes` is the run's own length and
`meta.stretching` is zeroed, so nothing in the response describes the lifting
day that was dropped. `notes` drops the plan's own sentences for the same
reason: a warning about ramp-up sets on a Goblet Squat is about a session this
response did not hand over. The focus merge's sentences and the styles sentence
both stay.

Before this the engine returned the lifting day regardless, set
`meta.styles.honoured` to false, attached a note saying "this week is cardio
only", and left it to the caller to throw the day away and build its own. Two
claims in one response, one of them false, and whether anybody ever saw a run
depended on a caller remembering to. Where no session can be built (a mode with
nothing at their level, or a tick no library can name, which today is Sports)
the lifting day still stands, `honoured` is false, and `meta.styles.note` says
so in a sentence beginning "This is a lifting session".

### `workout.flow`, the other one

New 2026-09-19. The same road, for the week somebody ticks Yoga or Pilates and
no resistance style. Until this the engine refused that week and said so out
loud, which was honest and was still a person being handed five lifts they had
told us they do not do.

```
workout: {
  focus: "Yoga",              // the training's plain label, never the style or a class name. See below
  flow: {                     // present ONLY on a flow day, absent on every other kind
    training: "yoga",         // "yoga" or "pilates"
    label: "Yoga",
    style: { key: "vinyasa", label: "Vinyasa / Flow" },   // the library's first style, or null
    level: "beginner",        // from how many of THESE they have logged, not from how much they lift
    minutes: 30,              // what the class was built to
    seconds: 1800,            // what the moves actually come to, which is never more than minutes * 60
    rounds: 3,                // the sequence repeats. These libraries are small and the note says so
    moves: [
      { name: "Mountain Pose", seconds: 45, perSide: false, round: 1, category: "Standing poses", cue: null }
    ],
    notes: ["3 rounds of the same sequence. Yoga has about 14 min of moves at this level, and a class repeats them."]
  },
  exercises: [],              // ALWAYS empty on a flow day. A pose is not a set and must never be logged as one
  warmup: [], cooldown: []    // a mobility session is its own warm-up. Nothing is bolted to the front of it
}
```

Three notes with teeth:

**`focus` is exactly `"Yoga"` or `"Pilates"`.** The app's activity table matches
that string to open the right timer, `exercise_logs.exercise_name` is written
from it, and Progress counts sessions back by it. A prettier name breaks all
three quietly.

**The length.** `session_minutes`, when the person actually answered it, clamped
to a 60 minute ceiling; 30 when they did not. 30 is the number the app's own
activity sheet opens on and the number `buildActivitySession` defaults to, so a
planned class and one started from the timer are the same class. The ceiling is
a refusal to overpromise: these libraries hold about fourteen minutes of unique
beginner yoga and eight of Pilates, so an hour is already several rounds and two
hours would be one short sequence run eight times. What was asked for is said in
`flow.notes` when it was cut.

**A week with cardio AND a flow style in it alternates.** Both were ticked and
both are meant. The ticked kinds go in a ring turned by the date, so consecutive
days are different kinds and the same day asked twice is the same day. When one
kind cannot be built the next in the ring is tried, which is why a beginner who
ticked Swimming and Yoga gets the yoga class rather than the refusal the swim
alone would have earned.

### `workout.rampSets`, and the one rule the app must not break

Ramp-up sets are warm-up sets of a lift that is already on the card, at less
than its working weight, so the first real set is not also the warm-up
(`mo-knowledge/research/13-warmup-cooldown.md` section 5, and its checklist item
9). **They are never working sets.** Concretely, the app must:

- render them as part of the warm-up or on the first lift's card, and **never**
  as rows in `exercises`;
- **never** write them to `exercise_logs`, for the same reason a stretch is not
  written there: a ramp set credited as a set would light the Body tab and tell
  `recovery.mjs` a muscle was worked;
- **never** add them to `ai_workouts.exercises`. That row is the only thing
  calibration joins a log against, so a ramp set in it would be read as
  prescribed work the person did not do, and their weights would come down next
  week for taking the extra.

`weight: 0` on the first rung means the empty bar, the empty machine, or the
lightest thing they have, and the `cue` says so; it does not mean bodyweight.
`pct` is the fraction of the working weight the rung was built from, before
rounding to the plate grid. The key is **absent entirely** on a day with nothing
to ramp.

**Changed 2026-09-12, later the same day.** Ramp sets were briefly something a
long `session_minutes` bought. They are not: they are part of warming up, they
appear on nearly every day, and no session length is involved in deciding them.
The array's shape did not change.

**When a day has one.** All three conditions must hold:

- the lift is in a **main** slot. research/13 is explicit that accessories and
  isolation get none, so a lateral raise can never carry one;
- it has a prescribed weight above zero. A push-up, a plank and anything else
  unloadable get none, because a ramp is a load and a rep count and this engine
  has no regression ladder to build one from (research/13 open question 9, and
  `LIBRARY-REQUESTS.md`). This is a decision, not an omission;
- the prescribed reps imply at least 72% of one rep max, which is 9 reps or
  fewer. Above that, Iversen 2021's point applies: the first reps of the working
  set already are the specific warm-up.

**How many rungs**: 4 at 5 reps or fewer (81% of 1RM and up, research/13's "at
or above 80% 1RM"), 3 at 6 to 9 reps, none above. The next main on the day gets
one extra rung at 70%, but only when the day has room for it inside its time
budget, so it can never be the thing that pushes a session over.

**The day's first loadable main is the one that ramps**, not simply the first
slot. A day that opens with pull-ups and follows with a barbell row ramps the
row, because the row is the first loaded thing the person meets.

`notes` is the plan's own `dayNotes`, unfiltered, plus the focus merge's own
note when there is one (today: the sentence saying a whole-body pick changed
nothing). It carries the limits summary, the
softened warning when a slot kept a movement that loads a joint they said
hurts, the over-budget number, the day-count clamp, the capacity shortening,
the plateau answers, and, new on 2026-09-12, the sentence naming the muscle
groups whose weekly sets are capped by how often the split trains them ("more
of those muscles means another day in the week, not more sets in the days you
have"). Also new on 2026-09-12: the session-length sentences, when `session_minutes`
was sent, plus one that is sent whatever the session length is: the sentence
explaining the ramp-up sets on the main lift, which appears on any plan that has
them. Up to six of the session-length ones, and each one is a real event rather than a
reassurance: the clamp when the number was outside 15 to 120, the rest
compression when sets alone could not buy the minutes, the rest going back up
when a lighter week made room for it, what the extra minutes bought when they
could not buy sets, the day that still does not fit after everything, and the
budget that could not be spent because more sets than this is past what the
level recovers from. None of them appear when `session_minutes` is absent. Also new on 2026-09-12: the sentence naming a
starting weight that was capped, which happens when a guess extrapolated from
very little history off a different movement came out above what the person's
size and level support; the per-exercise `note` has always said it and now the
week says it once as well, with the ask to change it. And, also 2026-09-12: for the `pain` and `back-postpartum` children,
two sentences saying the core work here holds position rather than bending or
twisting under load, and one saying this is general training guidance that
somebody training around pain or a recent pregnancy should run past their own
clinician. A day whose core slot the goal's exclusion emptied gets a sentence
naming that day too, and so does a day that gave up a slot rather than
prescribe a movement already on the same card (a bodyweight week with a sore
wrist can leave one movement qualifying for two slots). All of them are plain `notes` strings; nothing in `meta`
changed shape for them, and nothing needs storing. Nothing in `meta` changed shape for it. Until 2026-09-10 all of it was computed and none of it
left the engine. Render it under `honest` in the reveal; nothing needs storing,
`ai_workouts` does not store `honest` either.

Three to six exercises. Three is the floor and it is only reached when the
library genuinely cannot fill the day, which today means a bodyweight only week
(there is no bodyweight biceps-primary movement in the library at all, so a
bodyweight only pull day honestly has no curl in it).

### No training level, and no weight we have not been told, 2026-09-18

Two changes, one principle: the plan only claims what it actually knows.

**`meta.level` is gone.** It was `beginner` / `novice` / `intermediate` /
`advanced`, and it decided which exercises a person was allowed to be shown. A
client reading it should read `meta.experience` instead, which is the
measurement the label was a lossy summary of. The label could not work anyway:
the app sends 90 days of logs and the ladder started at 20 / 60 / 200 sessions,
so four days a week for thirteen straight weeks came to 51 sessions and still
read as novice, and "advanced" was arithmetically unreachable in production.

What decides which exercises appear is now **earned access**, per movement:

- a **default pool** anybody starts with, with no history and nothing asked:
  every movement the library tags `beginner`, plus `intermediate` ones on a main
  slot, because the library has no beginner-tagged hinge and a week with no
  posterior chain work is worse than one intermediate movement;
- **plus anything they have logged on two separate days**;
- **plus anything they picked by hand**, once, through the swap sheet.

A movement tagged `advanced` never appears unless one of the last two is true.
The set only grows, and it grows one movement at a time: two sessions of a
Barbell Deadlift earn the Barbell Deadlift and nothing else.

**And `targetWeight: 0` now needs reading with `loadBasis`.** It always had two
meanings, and they were the same on screen because the second was rare: the
engine used to invent a starting weight from bodyweight and sex for anybody with
no history, so almost nobody ever saw "we do not know". That guess is gone. It
was wrong often enough to matter (`sex` is optional, so a woman who skipped it
got the male reference and every lift came out 2.0x to 2.8x heavy) and a wrong
number is worse than no number for the person most likely to trust it.

So a new user's first week comes back with `targetWeight: 0` on nearly every
lift, and the card must say which kind of zero it is:

| `loadBasis` | `targetWeight` | what the card should say |
|---|---|---|
| `"your last session"` | > 0 | the weight, as now |
| `"a similar lift"` | > 0 | the weight, as now |
| `"bodyweight"` | 0 | no weight. Nothing to add: the progression is the variation |
| `"unknown"` | 0 | no weight, and the `note` beside it, which tells them to find one and says it will be used from then on |

`note` already carries the right sentence in both zero cases, so a client that
only renders `note` is correct today and always was. `loadBasis` exists so a
client can render the two differently: an "unknown" row is an invitation to put
a number in and a "bodyweight" row is not.

`meta`, every key:

| key | type | what |
|---|---|---|
| `experience` | object | **new 2026-09-18, and it REPLACES `level`.** `{ sessions, sessionsPerWeek, weeksTraining, stillLinear, returning, earnedMovements }`, every one of them counted rather than judged. `sessions` is training days since the last long break, `earnedMovements` is how many movements this person has earned the right to be prescribed beyond the safe default pool. There is no beginner / intermediate / advanced anywhere in this response any more: see "No training level" below |
| `volumeDial` | object | **new 2026-09-18.** `{ value, days, effectiveSessions }`. `value` is 0 to 1, where the week's volume sat between each muscle's MEV and the middle of its MAV range, and the two numbers under it are what put it there |
| `childUsed` | text or null | which goal-tree child's parameters really ran, `"_default"` included |
| `goals.primary` | object | **new.** `{ bubble, child, childUsed }`. The goal that set every parameter |
| `goals.secondary` | object[] | **new.** One entry per honoured extra goal, in the order they were sent: `{ bubble, child, childUsed, priority: text[], cardio: bool, mobility: bool, effect: text[] }`. `effect` is plain sentences and an **empty `effect` means that goal changed nothing**, which the screen should show rather than hide |
| `goals.ignored` | object[] | **new.** `{ bubble, child, why }` for every extra goal that was not used at all: unknown, a repeat of one already picked, or past the limit of two |
| `confidence` | text | how much the measured history is worth: `none` / `low` / `medium` / `high` |
| `days` | number | days in the week the plan was built for |
| `dayName` | text | the day that came back, same string as `workout.focus` |
| `focusHonoured` | bool | whether `payload.focus` picked the day, or the rotation did |
| `focus.requested` | text[] | the body map groups asked for, flattened, highest tier first. Uncapped: this is the ask, not the answer |
| `focus.requestedTiers` | object | `{ chest: 3 }`, the tier each requested group was asked at |
| `focus.applied` | text[] | the groups that actually earned extra volume, goal priority merged in |
| `focus.tiers` | object | the tier each applied group really ran at, which is not always the one it was asked at: the goal's own priority raises a green group to yellow rather than letting a tap reduce it |
| `focus.why` | text[] | plain sentences explaining that merge |
| `focus.stale` | bool | the pick is older than 60 days. Nothing acts on it yet, on purpose |
| `limits.hurts` | text[] | **new.** The joint keys that survived validation |
| `limits.missing` | text[] | **new.** The equipment keys that survived validation |
| `limits.excludedCount` | number | **new.** How many library movements those two answers ruled out. The names and the per-movement reasons stay on the plan, because on a bodyweight only week the list runs past a hundred |
| `age.years` | number\|null | **new 2026-09-18.** The age the payload carried, or `null` when it carried none or one outside 10 to 120 |
| `age.known` | bool | **new.** Whether there was an age to read. `false` is the common case: the field is optional and post-onboarding |
| `age.rampCaution` | number | **new.** 0 to 1, how careful the rate of advance is. 0 at 30 and below, 1 at 65 and above, a straight line between, and **1 when the age is not known**. Smaller load increments (calibrate.mjs) and a lower restart after a layoff (load.mjs) |
| `age.rampApplied` | bool | **new, and `false` today.** The dial is computed and put on `person.ageCaution`, and plan.mjs does not read it yet: it destructures four named fields off `person` and this is not one of them. Three forwards in plan.mjs light it (the destructure, the `calibrate` call, the `prescribeLoad` call) and this flag becomes true in the same commit |
| `age.warmupCaution` | number | **new.** 0 to 1, how much longer the warm-up block runs, up to 40% (6:00 to 8:24, or 4:00 to 5:36 on a ramped day). **0 when the age is not known**, unlike `rampCaution`: research/02 prices its unknown-age default as a slower ramp, which is not a claim about minutes, and research/13 argues against a longer general block on its own evidence |
| `age.warmupApplied` | bool | **new.** Whether this day's block actually grew. `false` where the day had no minutes to spare: the growth is capped at the day's remaining slack against its clock, so a longer warm-up never pushes somebody past the session length they asked for and never buys itself with a set |
| `age.note` | text\|null | **new.** One sentence for the reveal: what the age changed, or, when there is none, that adding it buys the faster ramp |
| `stretching.included` | bool | **new.** `false` when `skip_stretching` stripped the blocks |
| `stretching.warmupMinutes` | number | **new.** Rounded minutes of the general warm-up block. Inside the session budget: those minutes were always in `estimatedMinutes` and were empty until 2026-09-10. **2026-09-12**: six minutes normally, four on a day that has `workout.rampSets`, because the ramp is the rest of the preparation and it is better preparation. The two together are more than the six they replace |
| `stretching.cooldownMinutes` | number | **new.** Rounded minutes of the cool-down. On top of the session: five by default, ten for the `flexibility` and `mobility` goal children. **2026-09-15**: and for the `move-better` bubble, with or without a child. The block was reachable only through a child id, the picker stopped sending child ids, and so the ten minutes became unreachable by anybody, including the one goal whose whole subtitle is "mobility, flexibility, less pain". A bubble can earn it now (goal-engine.mjs `MOBILITY_BUBBLES`) |
| `stretching.mobilityGoal` | bool | **new.** The goal child is one of those two, so the cool-down is the ten minute hips and upper back block the goal tree asks for |
| `stretching.why` | text[] | **new.** Plain sentences: what was picked, for which groups, and what a joint limit left out |
| `session.budgetMinutes` | number | **new.** The clock THIS day was costed against. A short day is six tenths of the week's budget, so this is not always the same number as `session.asked` |
| `session.source` | text | **new.** `asked` when `session_minutes` set the budget, `goal` when the goal's own session length did. Every plan built before this column existed reads `goal` |
| `styles` | object | **new.** What `train_styles` changed. Always present, like every other key here: `asked` is false when the column was null or empty, and the rest is the no-opinion answer. `picked` is the normalised list, `resistance` whether a lifting day was allowed, `honoured` whether this response really is the week they asked for, measured after the day is built and not predicted from the tick list, `equipmentMissing` what the style choice subtracted in `limits` vocabulary, `cardioModes` and `flowTrainings` what was ticked against the cardio, yoga and pilates libraries (the engine now spends them itself, and they stay here because a screen still has to say what was picked), and `note` the one sentence to show, which is "this week is cardio only" or "this week is mobility work only" when the choice was honoured and "this is a lifting session, not the week you picked" when it could not be. Both also arrive in `notes`. `honoured: false` is the engine admitting it could not build the asked-for week at all, and the note is then the apology rather than a claim about the week |
| `session.asked` | number or null | **new.** What arrived before the clamp, so a screen can tell a clamp from a coincidence. Null when nothing was sent |
| `session.goalMinutes` | number | **new.** What the goal would have chosen on its own. Equal to `budgetMinutes` when `source` is `goal`. **Changed 2026-09-12**: every one of these grew, by 3 minutes where the goal's mains are at 5 reps or fewer and by 1 everywhere else, so the number covers the ramp-up sets the session now includes. 45 became 46, 60 became 61 or 63, 40 became 41, 50 became 51, 30 became 31. The one that did not move is "I have no time", which stays at 25 because 26 would change the session-length chip the app suggests from 20 to 30. **Nothing else crosses a chip boundary**: on 20/30/45/60/90 with ties going to the shorter, every moved goal still suggests the chip it suggested before |
| `session.estimatedMinutes` | number | **new.** What this day really comes to: sets times reps time, plus the rest between them, plus the warm-up. Both halves of the warm-up: `stretching.warmupMinutes` AND `session.rampMinutes` are counted inside it. There is deliberately no `totalMinutes` here: the whole visit is this plus `stretching.cooldownMinutes`, and carrying the sum would make `meta` move when `skip_stretching` moves. **2026-09-14, costed honestly.** A set was a flat thirty seconds plus its rest and nothing else in the visit was counted, so a five lift beginner day read 21 minutes over a real half hour. A set is now ten seconds of setup plus four a rep, plus ten to log it; the rest is charged between sets, (sets - 1) of them; and every exercise carries a 75 second transition to the next station. plan.mjs `REP_SECONDS` has the worked example. **And the clock is the whole visit**: every trim, fill and ramp decision measures `estimatedMinutes` plus the nominal five minute cool-down against the budget, so `session_minutes: 30` builds a visit of about 30, not a working session of 30 with a cool-down on top. **Corrected 2026-09-15**: only when a person named the clock. `P.sessionMin` is not a statement about how long anybody is in a gym, it is the warm-up plus the ramp plus the sets, which is how goal-engine.mjs derived it and what its own note on the 2026-09-12 increase adds up, so five minutes of stretching were being charged against a number that never contained them. Across the sweep that alone cost 15% of the week: intermediate groups under 0.8 of their weekly target went 18.2% to 39.0% and advanced 15.1% to 36.8%, on a matrix with no stated session length in it, which is nearly every real user. A day now carries `clockReserve`, the cool-down when the clock is theirs and nothing when it is the goal's, and the goal path is back to 36.3% and 33.5%. The rest of that gap is the honest costing itself against session lengths that predate it, which is a number to re-derive and not a bug to fix here. The app's `sessionEstimateMinutes` mirrors the same five numbers |
| `session.rampMinutes` | number | **new 2026-09-12, and its meaning changed the same day. Read this before summing anything.** What `workout.rampSets` costs on this day, rests included. It is a **component of** `estimatedMinutes`, not an addition to it: **the whole visit is `estimatedMinutes + stretching.cooldownMinutes` and nothing else.** Adding `rampMinutes` on top double counts it. `0` on a day with nothing to ramp. Zero volume either way: it is warm-up time, not work |
| `session.fits` | bool | **new.** `false` is the day that could not be squeezed into the answer they gave, after every lever ran. The sentence saying so is already in `notes` |
| `session.restCompressed` | bool | **new.** The budget on this day was partly bought by shortening the rest between sets, which is the one trim that changes what a set is worth. The sentence is in `notes`. **Changed 2026-09-12**: a day whose rest was given back in full reads `false`, because a screen saying "your rest was cut" beside a card printing the full interval is the app contradicting itself |
| `stretching.cooldownMinutes` (changed) | number | **2026-09-12.** Can now be ten for anyone, not only the `flexibility` and `mobility` goal children, when a stated `session_minutes` had minutes left over and bought the longer block. `stretching.mobilityGoal` stays the goal-child flag and does not go true for a bought block; `stretching.why` says which happened |
| `source` | text | always `engine`. The `llm` path was removed 2026-09-12; the key stays so a reader of an older stored plan can still tell which built it |
| `goalSource` | text | `tiles` if `goal_bubble` was valid, `legacy` if the five strings and the free text were parsed |
| `emphasis` | **not returned** | the goal table has an `emphasis` on every entry and it never leaves the engine, deliberately. It has two behaviours in the whole codebase, both `=== "strength"`, and the other seven values change nothing. Do not surface it and do not add it here: see "What `emphasis` does, and what it does not" in `README.md` |
| `logsSource` | text | `logs` / `history` / `none` |
| `missing` | text[] | what would have sharpened the plan and was not there, in plain words |

---

## (c) The profile columns

| column | type | migration | shape |
|---|---|---|---|
| `focus_groups` | `text[]` | `20260909_focus_groups.sql` | the body map pick, one entry per group, each `"<group>:<tier>"` with tier 3 red, 2 yellow, 1 green. A bare `"<group>"` is tier 2. No migration: the tier rides inside the existing `text[]`, so there is no second column to keep in step and no window where the groups and the tiers can disagree. How many entries is not capped by the column, it is capped by the emphasis budget in `focus.mjs`, which comes to four groups at yellow, three at red, or nine at green |
| `focus_chosen_at` | `timestamptz` | `20260909_focus_groups.sql` | when that pick was made |
| `goal_bubble` | `text` | added separately | one goal-tree bubble id, exactly as spelled in `mo-knowledge/goals/goal-tree.json` |
| `goal_child` | `text` | added separately | one goal-tree child id under that bubble, same spelling. Both are plain text ids and neither is a label |
| `session_minutes` | `int` | `20260912_session_minutes.sql` (written, not applied) | minutes, nullable, no default. Null is "never answered" and the goal decides. No check constraint: the engine clamps to 15..120 and says what it did, so a slider that ships with a wider track costs a clamp and a sentence rather than a failed save |
| `goal_secondary` | `jsonb` | `20260912_goal_secondary.sql` (written, not applied) | `[{ "bubble": "do-a-thing", "child": "flexibility" }]`, default `[]`. A separate column on purpose: `goal_bubble` and `goal_child` hold live rows and nothing about them changes |
| `limits` | `jsonb` | `20260909_limits.sql` | below |

`profiles.limits`, exactly:

```json
{
  "hurts":      ["shoulder", "knee"],
  "missing":    ["barbell"],
  "note":       "left cuff, cleared to train",
  "updated_at": "2026-09-09T14:03:00Z"
}
```

- `hurts` is a list of joint keys and every one must be a `BODY_AREAS` key.
- `missing` is a list of equipment keys and every one must be an
  `EQUIPMENT_OPTIONS` key. `"none"` means bodyweight only and overrides the
  other four if both somehow arrive.
- `note` is free text, at most 120 characters, and is **stored and never
  parsed**. Turning "left knee since the ACL" into a filter is how an app ends
  up guessing at a medical history. It is there so a coach, or a later screen,
  can read back what the person said.
- `updated_at` is written by the screen. The engine does not read it yet;
  it is there so a limit can be aged the way `focus_chosen_at` ages a body map
  pick.

Anything the engine does not recognise is dropped without complaint, so an old
client writing a stale key costs a filter and never a failed plan. Passing
`null`, `{}` or a malformed string all behave identically to skipping the
screen.

---

## (d) The chip lists

Import them. Do not write them.

```js
import { BODY_AREAS, EQUIPMENT_OPTIONS } from "/mo-knowledge/engine/limits.mjs";
```

Each entry is `{ key, label, hint }`. `key` is what goes in the column, `label`
is the chip, `hint` is one line saying what gets avoided so the person can
decide.

**`BODY_AREAS`**, eight, in this order:

| key | label | hint |
|---|---|---|
| `shoulder` | Shoulder | no overhead pressing or dips |
| `elbow` | Elbow | no skull crushers or weighted chin-ups |
| `wrist` | Wrist | no push-ups or front rack work |
| `neck` | Neck | no heavy shrugs or crunches |
| `lowerback` | Lower back | no deadlifts or good mornings |
| `hip` | Hip | no deep squatting or heavy hinging |
| `knee` | Knee | no deep lunges or leg extensions |
| `ankle` | Ankle | no calf raises or split squats |

**`EQUIPMENT_OPTIONS`**, five, in this order:

| key | label | hint |
|---|---|---|
| `barbell` | No barbell | dumbbell and machine versions instead |
| `dumbbell` | No dumbbells | machine, cable and bodyweight versions instead |
| `cable` | No cable machine | dumbbell and machine versions instead |
| `machine` | No machines | free weight and bodyweight versions instead |
| `none` | No equipment at all | bodyweight only |

Why these and not the prototype's six. The exercise library records exactly
five equipment values, `bodyweight`, `dumbbell`, `barbell`, `cable`,
`machine`, and nothing else. The prototype offered "Pull-up bar", "Squat rack"
and "Bench", none of which the library can see, so somebody could say they had
no squat rack and nothing could honour it, while "machine", which the engine
CAN honour, was not offered. `bodyweight` is not an option because it is not
something you can be missing.

Why eight body areas and not a longer list. Every one of the eight is a key in
`joint-load.mjs`, where all 159 weight-training and calisthenics exercises are
tagged one at a time with the joints they load heavily. A ninth chip would need
a ninth column in that table before it meant anything.

Adding a chip is a change to `knowledge/` or to `joint-load.mjs` first and to
`limits.mjs` second, never the other way round. A chip the engine cannot
honour is a promise the plan quietly breaks, which is the whole reason the
prototype's lists were flagged instead of shipped.

The note box is a plain text input, `maxlength="120"`.

---

## (e) What the engine does with each input

One line each, so a screen can say what an answer buys.

| input | what happens |
|---|---|
| `goal_bubble` + `goal_child` | picks the parameter set: rep ranges, rest, weekly sets factor, session length, cardio, and which muscle groups the goal itself prioritises |
| `goal_secondary` | adds priority muscle groups, the ten minute mobility cool-down, and more cardio, and nothing else. It can never move a rep range, a rest, the sets factor, the session length or the day count, and it never changes the honest timeline. A secondary that turns out to add none of those three is reported with an empty `effect` and the plan says in `notes` that the tap changed nothing |
| `goal` + `goal_detail` | the same, reached by parsing instead of by tapping, and beaten by a valid bubble |
| `challenge_target` | how many days the week has, clamped to what the goal supports |
| `session_minutes` | the clock the whole week is costed against, replacing the goal's own `sessionMin`, which grew on 2026-09-12 to cover the ramp (see `session.goalMinutes`). Under it, the plan comes down to meet it in four steps, gentlest first: sets off a non-priority accessory to a floor of two, then a non-priority accessory movement goes, then sets come off everything including the main lifts down to a floor of three (largest first, so the emphasis survives), and only then does the rest between sets shorten, to at most 40% off and never below 45 seconds. The last one costs the goal something real and always produces a sentence in `notes`. Over it, the extra minutes buy sets on the groups the weekly ledger already reports as under target, capped at that target plus the usual slack and at the group's MRV, and never a new exercise or a new main movement. A budget that cannot be spent inside those rules is handed back with a sentence rather than filled with junk sets. A day that still does not fit after all four says its honest number, same as it always did |
| `gym_days_this_week` | the day count when nobody chose one |
| `current_weight` | starting loads, scaled allometrically. Without it every weight is omitted rather than guessed |
| `sex` | which column of pattern ratios sets those loads |
| `logs` | which movements have been earned, starting loads from real history, plateau detection, the volume dial, and how many days a week they actually manage |
| `plans` | joined with logs to calibrate: hit every set and every rep twice running and the bar goes up one step, at most 10% and at most 10 lb; came up short and the bar comes down by the same step and the whole week gives up a set on every lift, and it says so. Also decides whether a flat lift is a real stall (nothing to fix if you are beating the plan on it) and, with `logs`, which movements you were given and never logged |
| `swaps` | with `plans`, reorders which exercise fills a slot. Nothing else: same slots, same sets, same reps, same loads |
| `history` | starting loads only. It has no dates, so it can neither measure a training history nor earn a movement |
| `focus` | which day of the rotation comes back |
| `focus_groups` | a weekly sets multiplier per group, by tier: 1.75x red, 1.4x yellow, 1.2x green. Merged with the goal's own priority list, which enters at yellow and acts as a floor, so a tap never buys a group less than no tap would. Capped by an emphasis budget rather than by a count, and what did not fit is named in `meta.focus.why`. Every group at one tier is not a focus and comes back as none, with a sentence in `notes` saying so. The weekly ask is capped at the group's MRV from `knowledge/principles/volume-landmarks.md`, so a red focus on an advanced lifter asks for that muscle's ceiling rather than 16 x 1.75 = 28; the cap moves no set count today, since the per-session clamp already binds first |
| `focus_chosen_at` | reports staleness past 60 days. Nothing acts on it yet |
| `limits.hurts` | removes every movement `joint-load.mjs` says loads that joint heavily. A slot the library cannot otherwise fill keeps its least loaded option and the plan says so out loud rather than pretending |
| `limits.missing` | narrows the equipment the plan may prescribe at all. This one is hard: a slot with nothing left is dropped, because a barbell they do not own is not a workout |
| `limits.note` | stored, shown back, never parsed |

The two halves of `limits` are treated differently on purpose. A painful joint
is a judgement and can be worked around with a lighter version of something. A
missing barbell is a fact and cannot.
