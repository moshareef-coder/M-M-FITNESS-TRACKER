# Equipment substitution

The plan shouldn't be tied to one fixed exercise per slot — it should be
tied to a movement pattern and a muscle group, with the actual exercise
chosen from whatever equipment tier the person has available. This is what
lets the same underlying plan survive a home/gym switch, travel, or a
hotel gym with only dumbbells, without regenerating from scratch.

## The matching principle

A good substitute matches on two things, in order: the movement pattern
(horizontal push, horizontal pull, vertical push, vertical pull, squat,
hinge, carry/core) and the primary muscle group. It should not be
downgraded to a same-muscle-different-pattern swap (e.g. don't replace a
horizontal push with a shoulder-dominant move just because both hit the
"chest/shoulders" area loosely) — pattern match first, muscle match second.

A secondary consideration: free-weight exercises demand more stability and
coordination than machine equivalents, since the lifter (not the machine)
controls the bar path. That's a feature for some goals (functional
carryover, the "everyday fitness" category) and a reason to start on a
machine for others (a true beginner still building coordination, or
someone training around an injury who needs the movement isolated).

## Equipment tiers

Roughly four tiers a user's available equipment will fall into:

1. **Full gym** — barbell, rack, bench, plates, machines, cables.
2. **Dumbbells + bench** — common home-gym setup, no barbell/rack.
3. **Bodyweight only** — no external load at all.
4. **Limited/machine-only** — smaller commercial gyms or hotel gyms with
   machines but no free-weight area, or the reverse (free weights but
   missing a specific machine).

For a given movement pattern, the substitution chain runs roughly barbell →
dumbbell → machine/cable → bodyweight, in order of how directly each
preserves the original stimulus — but any tier can produce a real,
progressive stimulus on its own; none of them are a compromise plan.

## Bodyweight-only needs different overload levers, not a weaker plan

Research directly comparing bodyweight training to loaded training found
it builds equivalent muscle mass, provided sets are taken close to
failure — the ceiling isn't the lack of a barbell, it's how the difficulty
gets scaled. Since you can't always add a small, precise increment of
external load, bodyweight progression should draw on a different, well-
supported toolkit:

- **Leverage changes** — the single most effective lever. Moving hands/feet
  to a harder position (e.g. feet-elevated push-up, single-arm progressions)
  can be mechanically equivalent to a large jump in external load.
- **Unilateral variations** — single-limb work roughly doubles the load on
  the working side without any added weight (a pistol squat removes one
  leg's contribution entirely, not just "half the difficulty").
- **Tempo and isometric holds** — a slower eccentric (e.g. a 3-4 second
  lowering phase) or a paused hold at the hardest point increases time
  under tension without changing the movement at all.
- **Range of motion** — a deeper range of the same movement is a real
  stimulus increase, not just "more form."
- **Reps/sets/rest** — the most familiar levers, but the weakest ones
  alone: once a set climbs past roughly 30-35 reps, it's shifting into
  muscular endurance/conditioning territory rather than a strength or
  hypertrophy stimulus, and one of the levers above should be used instead
  of just adding more reps.

This same toolkit is exactly what the pull-up and push-up skill-ladder
categories in `real-goals.md` already rely on (band-assisted → negative →
strict; incline → knee → full) — it's the general case of the same idea.

## How this should shape a generated program

- `exercise-selector.mjs` should pick by (movement pattern, muscle group,
  available equipment tier) rather than a fixed exercise-to-slot mapping,
  so a plan degrades gracefully rather than breaking when equipment
  changes.
- When equipment changes mid-plan (a logged equipment-tier change, not a
  new plan request), re-substitute along the same movement-pattern chain
  rather than generating an entirely new plan — the training goal and
  progression history shouldn't reset just because the person is traveling.
- For bodyweight-only users, especially past the early beginner stage,
  progression should draw on leverage/tempo/unilateral/ROM changes per the
  research above, not just an ever-climbing rep count — that's true for any
  goal category that lands someone in a bodyweight-only context, not just
  the dedicated skill-ladder goals.
- Bodyweight and machine variants are legitimate primary programming for
  someone whose only equipment is that tier — never present them as a
  fallback or a lesser version of "the real plan."
