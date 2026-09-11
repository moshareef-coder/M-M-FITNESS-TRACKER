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
| `user_name` | text | function | greeting only, never reaches the engine |
| `goal` | text | engine | one of the five legacy strings ("Lose weight", "Build muscle", "Get stronger", "Recomp (lose fat, gain muscle)", "Stay consistent") |
| `goal_detail` | text | engine | the free text sentence. Matched against the alias table, and a confident match can outrank the button |
| `goal_bubble` | text | engine | a goal-tree bubble id, from the tile picker. Nine of them: `lose-weight`, `build-muscle`, `get-stronger`, `tone-lean-abs`, `do-a-thing`, `event`, `feel-better`, `get-back`, `consistent`. A valid one beats `goal` and `goal_detail` |
| `goal_child` | text | engine | a goal-tree child id under that bubble, from the same picker. Validated against the bubble; an id that does not belong to it is dropped and the bubble default runs |
| `sex` | text | engine | `"Male"` / `"Female"`. Changes the pattern ratios that set starting loads |
| `age` | number | function | TDEE only |
| `height_in` | number | function | TDEE only |
| `activity_level` | text | function | TDEE only |
| `current_weight` | number | engine | pounds. Without it there are no starting weights at all, and the plan says so in `meta.missing` |
| `gym_days_this_week` | number | engine | fallback day count when `challenge_target` is absent |
| `challenge_target` | number | engine | days per week they chose themselves, 2 to 6. Beats everything else |
| `focus` | text | engine | a day name ("Push day"), which day of the week they want. Beats the rotation |
| `focus_groups` | text[] | engine | the body map pick. Muscle group keys or the finer piece keys the zoomed view uses; both are flattened to the app's fourteen groups |
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

`notes` is the plan's own `dayNotes`, unfiltered: the limits summary, the
softened warning when a slot kept a movement that loads a joint they said
hurts, the over-budget number, the day-count clamp, the capacity shortening,
the plateau answers. Until 2026-09-10 all of it was computed and none of it
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
| `confidence` | text | how much the level is worth: `none` / `low` / `medium` / `high` |
| `days` | number | days in the week the plan was built for |
| `dayName` | text | the day that came back, same string as `workout.focus` |
| `focusHonoured` | bool | whether `payload.focus` picked the day, or the rotation did |
| `focus.requested` | text[] | the body map groups asked for, flattened |
| `focus.applied` | text[] | the groups that actually earned extra volume, goal priority merged in |
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
| `source` | text | `engine` or `llm` |
| `goalSource` | text | `tiles` if `goal_bubble` was valid, `legacy` if the five strings and the free text were parsed |
| `logsSource` | text | `logs` / `history` / `none` |
| `missing` | text[] | what would have sharpened the plan and was not there, in plain words |

---

## (c) The profile columns

| column | type | migration | shape |
|---|---|---|---|
| `focus_groups` | `text[]` | `20260909_focus_groups.sql` | at most four muscle group keys from the body map |
| `focus_chosen_at` | `timestamptz` | `20260909_focus_groups.sql` | when that pick was made |
| `goal_bubble` | `text` | added separately | one goal-tree bubble id, exactly as spelled in `mo-knowledge/goals/goal-tree.json` |
| `goal_child` | `text` | added separately | one goal-tree child id under that bubble, same spelling. Both are plain text ids and neither is a label |
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
| `goal` + `goal_detail` | the same, reached by parsing instead of by tapping, and beaten by a valid bubble |
| `challenge_target` | how many days the week has, clamped to what the goal supports |
| `gym_days_this_week` | the day count when nobody chose one |
| `current_weight` | starting loads, scaled allometrically. Without it every weight is omitted rather than guessed |
| `sex` | which column of pattern ratios sets those loads |
| `logs` | experience level, starting loads from real history, plateau detection, and how many days a week they actually manage |
| `plans` | joined with logs to calibrate: last week too hard makes this one lighter, and it says so |
| `history` | starting loads only. It has no dates, so it can never set an experience level |
| `focus` | which day of the rotation comes back |
| `focus_groups` | 1.4x weekly sets on those groups, merged with the goal's own priority list, capped at five |
| `focus_chosen_at` | reports staleness past 60 days. Nothing acts on it yet |
| `limits.hurts` | removes every movement `joint-load.mjs` says loads that joint heavily. A slot the library cannot otherwise fill keeps its least loaded option and the plan says so out loud rather than pretending |
| `limits.missing` | narrows the equipment the plan may prescribe at all. This one is hard: a slot with nothing left is dropped, because a barbell they do not own is not a workout |
| `limits.note` | stored, shown back, never parsed |

The two halves of `limits` are treated differently on purpose. A painful joint
is a judgement and can be worked around with a lighter version of something. A
missing barbell is a fact and cannot.
