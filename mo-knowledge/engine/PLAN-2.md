# Build plan 2: the engine learns

Decided 2026-09-09, after the body focus picker landed. Four workstreams, all
independent, all engine-side first so nothing waits on production.

## The thesis for this round

research/07 said prefer measured over stated, every time. Round one measured
experience from logs. This round measures **preference**: what somebody
actually trains versus what they said they wanted, and what to do when they
stop progressing.

Two kinds of signal, and they are not equal:

| | comes from | trust |
|---|---|---|
| stated | the focus picker, the goal bubble | high on the day, decays |
| revealed | swaps taken, exercises skipped, lifts that stalled | rises with every session |

Where they disagree, revealed wins, but slowly and never silently. Somebody who
picked glutes in January and has not hip thrusted since February has told us
something newer than the tap.

## What exists already, so nobody rebuilds it

- `plan.mjs` honours `priority` groups: 1.4x weekly sets, via `setsFor()`. A
  user-chosen focus is the same mechanism with a different source.
- `training-age.mjs` exports `detectPlateau` (Jawa's) and `deriveTrainingAge`
  returns `plateau`. **Nothing reads it.** That is W4.
- `plan.mjs` computes a `swap` for every exercise. **The adapter drops it**, so
  it never reaches the app. That is W2.
- The body focus picker (`bodyFocusMuscle`, `BODY_FOCUS`) is a viewer. Its
  selection is in-memory and never saved. W1 gives it somewhere to go.

## Workstreams

| # | what | owns |
|---|---|---|
| W1 | a chosen focus reaches the engine and moves the plan | `engine/focus.mjs`, adapter, migration file, PLAN-2 notes |
| W2 | scored alternatives, delivered to the app and recorded | `engine/alternatives.mjs`, adapter, plan.mjs swap call, migration file |
| W3 | preference learned from what they swap and skip | `engine/preferences.mjs`, plan.mjs selection hook |
| W4 | a plateau gets a response, not just a diagnosis | `engine/plateau-response.mjs`, plan.mjs pass 4 hook |

Migrations are WRITTEN, not applied. Mo or the lead applies them.

## Rules, unchanged from round one

Plain ES modules, no dependencies, Deno safe (no `node:` outside demo, test,
bakeoff). Pure functions. `knowledge/` is read only. No em or en dashes.
Nothing committed, pushed or deployed by an agent. `index.html` is under active
edit by another session: touch it only where the task says, in the smallest
possible hunk, and never reformat around it.

Gate before finishing: `node --test mo-knowledge/engine/test.mjs` green,
`node mo-knowledge/engine/demo.mjs --check` clean, `node mo-knowledge/engine/demo.mjs`
and `bakeoff.mjs` both run. Re-run `node scripts/vendor-engine.mjs` if you
changed anything the edge function imports.
