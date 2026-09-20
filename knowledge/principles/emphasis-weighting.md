# Emphasis weighting: the tune-question gap affecting three tiles at once

Found by systematically checking each live tile's actual current mechanism
against what our formulas handle — the same diligence that caught
build-endurance's real 3-way split. This one came back with a genuine,
significant gap, not a clean bill of health.

## What was missing

Three tiles — `build-muscle` ("What do you want to grow most?"),
`get-stronger` ("Stronger where?"), and `tone-lean-abs`/recomp ("Where do
you want it to show first?") — all share the same live, real,
ranked-priority tune question in `index.html`'s `GOAL_TUNE`. The person
ranks up to 4 body regions (1st gets the most work, last gets none of the
extra), and the UI has real weighting behind that promise
(`AREA_RANK_TIER = { 1: 3, 2: 2, 3: 1 }`).

**No formula was reading this at all.** Confirmed by search — zero
references to emphasis, focus regions, or tune fields anywhere in
`knowledge/formulas/`. Every category-picking function
(`pickFocusCategories`, `pickCircuitCategories`, `pickSplitCategories`)
only ever considered how far behind a muscle group's weekly volume
target was — never whether the person had actually asked for it to be
prioritized. This is the single most commonly *answered* interactive
question in the whole app (it's on three separate tiles) and it was being
silently ignored by the algorithm the entire time.

## The fix: mirror the UI's own weighting exactly, don't invent a new one

`emphasisMultiplier()` reuses `index.html`'s own tier values (1st = 3x,
2nd = 2x, 3rd = 1x, unranked = 1x baseline) rather than a different
number this project made up — the two systems should agree, not offer a
second, competing opinion about how much "first" should actually matter.

**Two effects, not one:**
- **Selection frequency** — every category-picking function now weighs
  its existing volume-gap ranking by this multiplier, so emphasized
  muscle groups win more session slots.
- **A direct set bump for the #1 pick specifically** (`+1 set`) — added
  because selection frequency alone doesn't guarantee the *person's own
  top choice* actually feels different in a given session; "first gets
  the most work" should mean more volume on the day it's trained, not
  just more chances to be picked over a week. 2nd/3rd rank rely on
  selection frequency alone, so the distinction between "my top pick" and
  "also somewhat prioritized" is actually felt, not just theoretical.

**Tested end-to-end, not just unit-level:** a real week comparison with
"arms and shoulders" ranked 1st showed biceps and shoulders volume
jumping from 3 sets/week (baseline) to 8 — chest (2nd) and back/lats
(3rd) correctly traded down in the process, exactly the tradeoff the UI's
own copy promises rather than a free bonus with no cost anywhere else.

## The region-to-category translation

The UI doesn't offer per-muscle picks — it groups the 14 categories our
formulas use into 4 broad regions (arms & shoulders, chest, back, legs &
core), confirmed directly against `index.html`'s own `FOCUS_REGIONS`
definition and mirrored exactly, not approximated:

```
arms:     biceps, triceps, forearms, shoulders
chest:    chest
back:     lats, traps, lowerback
legscore: quads, hamstrings, glutes, calves, abs, obliques
```

`emphasisRanksFromRegions()` translates a caller's region-level ranks
(`{ arms: 1, chest: 2, back: 3 }`) into the category-level map every
picking function actually needs — so the eventual caller in `index.html`
can pass its own tune-answer data straight through without needing to
know this project's internal category vocabulary at all.

## What this doesn't cover

- **`lose-weight` and `consistent` have no tune question at all** —
  confirmed by checking `GOAL_TUNE` directly (5 entries total: build-
  muscle, get-stronger, tone-lean-abs, build-endurance, move-better).
  Nothing missing there; those two genuinely don't have this mechanism.
- **Move-better's "sore" version of the same picker** already has its own
  correct handling via `mobility-progression.mjs`'s `targetedAreas`
  parameter — this fix doesn't touch that, since it was already built
  correctly on the first pass.
- **Wiring this into `index.html`** — the tune answer needs to actually
  reach `buildWeekPlan()`'s new `emphasisRanks` parameter; that's caller
  wiring, outside `knowledge/`'s boundary.
