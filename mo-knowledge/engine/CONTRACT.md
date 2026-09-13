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
| `goal_bubble` | text | engine | a goal-tree bubble id, from the tile picker. Nine of them: `lose-weight`, `build-muscle`, `get-stronger`, `tone-lean-abs`, `do-a-thing`, `event`, `feel-better`, `get-back`, `consistent`. A valid one beats `goal` and `goal_detail` |
| `goal_child` | text | engine | a goal-tree child id under that bubble, from the same picker. Validated against the bubble; an id that does not belong to it is dropped and the bubble default runs |
| `goal_secondary` | jsonb or JSON string | engine | **new.** The "and also" goals, `[{ bubble, child }]`, same ids as above. Optional, and absent, `null`, `[]` and nonsense all behave identically to not sending it. The first entry the engine can honour and the second one are used; the rest are named in `meta.goals.ignored` and in `notes`. What a secondary may and may not change is section (e) |
| `sex` | text | engine | `"Male"` / `"Female"`. Changes the pattern ratios that set starting loads |
| `age` | number | function | TDEE only |
| `height_in` | number | function | TDEE only |
| `activity_level` | text | function | TDEE only |
| `current_weight` | number | engine | pounds. Without it there are no starting weights at all, and the plan says so in `meta.missing` |
| `gym_days_this_week` | number | engine | fallback day count when `challenge_target` is absent |
| `challenge_target` | number | engine | days per week they chose themselves, 2 to 6. Beats everything else |
| `session_minutes` | number | engine | **new.** How long one session should take, in minutes. Absent, `null`, `0` and nonsense all mean "never answered" and the goal's own session length runs, which is byte for byte the plan that was built yesterday. A real answer replaces it: the week is built to fit the number, in both directions. Clamped to 15 and 120, and the clamp is said in `notes` |
| `focus` | text | engine | a day name ("Push day"), which day of the week they want. Beats the rotation |
| `focus_groups` | text[] | engine | the body map pick, now with a priority tier on each entry. `"chest:3"` is red, `"chest:2"` yellow, `"chest:1"` green, and a bare `"chest"` with no tier is yellow, which is what every pick saved before 2026-09-12 means. Muscle group keys or the finer piece keys the zoomed view uses; both are flattened to the app's fourteen groups. The single entry `"all"` is "select my whole body" and expands to every group at green. A jsonb object, `{"chest":3}`, is accepted too, so the column can become jsonb later without the engine changing |
| `focus_chosen_at` | timestamptz | engine | when that pick was made. Older than 60 days comes back as `meta.focus.stale` |
| `limits` | jsonb or JSON string | engine | **new.** What hurts and what they do not own. Shape in section (c) |
| `history` | array | engine | the old flattened map of best lifts, `{ exercise_name, weight }`, no dates. Used for loads and never for experience level |
| `logs` | array | engine | real sessions, `{ entry_date, exercise_name, weight, reps, sets }`. Beats `history` whenever there is any |
| `plans` | array | engine | completed plans, `{ entry_date, focus, exercises, completed_at }`. Joined against `logs` to calibrate |
| `skip_stretching` | bool | engine | **new.** `true` strips `workout.warmup` and `workout.cooldown` and changes nothing else. From `profiles.skip_stretching`. A client may also send `stretching: false`, same effect |

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
        targetWeight: 140,              // pounds. 0 means bodyweight or unknown, never a string
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

`notes` is the plan's own `dayNotes`, unfiltered, plus the focus merge's own
note when there is one (today: the sentence saying a whole-body pick changed
nothing). It carries the limits summary, the
softened warning when a slot kept a movement that loads a joint they said
hurts, the over-budget number, the day-count clamp, the capacity shortening,
the plateau answers, and, new on 2026-09-12, the sentence naming the muscle
groups whose weekly sets are capped by how often the split trains them ("more
of those muscles means another day in the week, not more sets in the days you
have"). Also new on 2026-09-12: the session-length sentences, when `session_minutes`
was sent. Up to four of them, and each one is a real event rather than a
reassurance: the clamp when the number was outside 15 to 120, the rest
compression when sets alone could not buy the minutes, the day that still does
not fit after everything, and the budget that could not be spent because more
sets than this is past what the level recovers from. None of them appear when
`session_minutes` is absent. Also new on 2026-09-12: the sentence naming a
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

`meta`, every key:

| key | type | what |
|---|---|---|
| `level` | text | `beginner` / `novice` / `intermediate` / `advanced`, measured from logs, never asked |
| `childUsed` | text or null | which goal-tree child's parameters really ran, `"_default"` included |
| `goals.primary` | object | **new.** `{ bubble, child, childUsed }`. The goal that set every parameter |
| `goals.secondary` | object[] | **new.** One entry per honoured extra goal, in the order they were sent: `{ bubble, child, childUsed, priority: text[], cardio: bool, mobility: bool, effect: text[] }`. `effect` is plain sentences and an **empty `effect` means that goal changed nothing**, which the screen should show rather than hide |
| `goals.ignored` | object[] | **new.** `{ bubble, child, why }` for every extra goal that was not used at all: unknown, a repeat of one already picked, or past the limit of two |
| `confidence` | text | how much the level is worth: `none` / `low` / `medium` / `high` |
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
| `stretching.included` | bool | **new.** `false` when `skip_stretching` stripped the blocks |
| `stretching.warmupMinutes` | number | **new.** Rounded minutes of the warm-up. Inside the session budget: those five minutes were always in `estimatedMinutes` and were empty until now |
| `stretching.cooldownMinutes` | number | **new.** Rounded minutes of the cool-down. On top of the session: five by default, ten for the `flexibility` and `mobility` goal children |
| `stretching.mobilityGoal` | bool | **new.** The goal child is one of those two, so the cool-down is the ten minute hips and upper back block the goal tree asks for |
| `stretching.why` | text[] | **new.** Plain sentences: what was picked, for which groups, and what a joint limit left out |
| `session.budgetMinutes` | number | **new.** The clock THIS day was costed against. A short day is six tenths of the week's budget, so this is not always the same number as `session.asked` |
| `session.source` | text | **new.** `asked` when `session_minutes` set the budget, `goal` when the goal's own session length did. Every plan built before this column existed reads `goal` |
| `session.asked` | number or null | **new.** What arrived before the clamp, so a screen can tell a clamp from a coincidence. Null when nothing was sent |
| `session.goalMinutes` | number | **new.** What the goal would have chosen on its own. Equal to `budgetMinutes` when `source` is `goal` |
| `session.estimatedMinutes` | number | **new.** What this day really comes to: sets times reps time, plus the rest between them, plus the warm-up. The same number `stretching.warmupMinutes` is counted inside. There is deliberately no `totalMinutes` here: the session plus the cool-down is this plus `stretching.cooldownMinutes`, and carrying the sum would make `meta` move when `skip_stretching` moves |
| `session.fits` | bool | **new.** `false` is the day that could not be squeezed into the answer they gave, after every lever ran. The sentence saying so is already in `notes` |
| `session.restCompressed` | bool | **new.** The budget on this day was partly bought by shortening the rest between sets, which is the one trim that changes what a set is worth. The sentence is in `notes` |
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
| `session_minutes` | the clock the whole week is costed against, replacing the goal's own `sessionMin`. Under it, the plan comes down to meet it in four steps, gentlest first: sets off a non-priority accessory to a floor of two, then a non-priority accessory movement goes, then sets come off everything including the main lifts down to a floor of three (largest first, so the emphasis survives), and only then does the rest between sets shorten, to at most 40% off and never below 45 seconds. The last one costs the goal something real and always produces a sentence in `notes`. Over it, the extra minutes buy sets on the groups the weekly ledger already reports as under target, capped at that target plus the usual slack and at the group's MRV, and never a new exercise or a new main movement. A budget that cannot be spent inside those rules is handed back with a sentence rather than filled with junk sets. A day that still does not fit after all four says its honest number, same as it always did |
| `gym_days_this_week` | the day count when nobody chose one |
| `current_weight` | starting loads, scaled allometrically. Without it every weight is omitted rather than guessed |
| `sex` | which column of pattern ratios sets those loads |
| `logs` | experience level, starting loads from real history, plateau detection, and how many days a week they actually manage |
| `plans` | joined with logs to calibrate: last week too hard makes this one lighter, and it says so |
| `history` | starting loads only. It has no dates, so it can never set an experience level |
| `focus` | which day of the rotation comes back |
| `focus_groups` | a weekly sets multiplier per group, by tier: 1.75x red, 1.4x yellow, 1.2x green. Merged with the goal's own priority list, which enters at yellow and acts as a floor, so a tap never buys a group less than no tap would. Capped by an emphasis budget rather than by a count, and what did not fit is named in `meta.focus.why`. Every group at one tier is not a focus and comes back as none, with a sentence in `notes` saying so. The weekly ask is capped at the group's MRV from `knowledge/principles/volume-landmarks.md`, so a red focus on an advanced lifter asks for that muscle's ceiling rather than 16 x 1.75 = 28; the cap moves no set count today, since the per-session clamp already binds first |
| `focus_chosen_at` | reports staleness past 60 days. Nothing acts on it yet |
| `limits.hurts` | removes every movement `joint-load.mjs` says loads that joint heavily. A slot the library cannot otherwise fill keeps its least loaded option and the plan says so out loud rather than pretending |
| `limits.missing` | narrows the equipment the plan may prescribe at all. This one is hard: a slot with nothing left is dropped, because a barbell they do not own is not a workout |
| `limits.note` | stored, shown back, never parsed |

The two halves of `limits` are treated differently on purpose. A painful joint
is a judgement and can be worked around with a lighter version of something. A
missing barbell is a fact and cannot.
