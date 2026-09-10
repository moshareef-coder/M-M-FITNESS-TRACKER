# Build plan: the engine becomes the generator

Decided 2026-09-09. Deterministic engine, no model call per plan, Jawa's research
folded in. Zero cost per workout generated.

## The shape of the thing

```
index.html  --POST payload-->  generate-workout (Deno)  --{workout}-->  index.html
                                      |
                                      v
                          mo-knowledge/engine/plan.mjs      builds the week
                          mo-knowledge/engine/adapter.mjs   picks today, returns app shape
```

The edge function today calls claude-sonnet-5 with a 243 line prompt and parses
JSON back. It becomes: receive payload, run the engine, return the same JSON. The
app does not change what it consumes.

## The contract, which nothing may break

**Request** (what index.html already sends, at ~line 8080):
```
{ user_name, focus, goal, goal_detail, sex, age, height_in, activity_level,
  current_weight, gym_days_this_week, history: [{ exercise_name, weight }] }
```
Widened by wave 2 to also carry `logs` (exercise_logs rows, last 90 days) and
`plans` (ai_workouts rows, last 30 days). Both optional; the engine must degrade
to the old shape.

**Response** (what index.html consumes at ~line 8862):
```
{ workout: { focus: "Push day", exercises: [
    { name, sets, reps, targetWeight, note } ] } }
```
`targetWeight` in lb, `0` for bodyweight. 4 to 6 exercises, and a short day is
floored at 4 in `plan.mjs` rather than coming back as the 2 main slots. The
adapter holds a hard floor of 3 as a backstop and fills it from the next day of
the same person's week rather than inventing a movement. Names simple and
standard so history matches across days.

**Goal today** is one of five strings: `Lose weight`, `Build muscle`, `Get
stronger`, `Recomp (lose fat, gain muscle)`, `Stay consistent`, plus free text
`goal_detail`. The engine speaks nine bubbles and 43 children. The adapter
bridges the five to the nine so this ships with no schema change; the bubble
picker (prototyped in index.html, not wired) replaces the five later.

## Workstreams

| # | what | files owned | depends on |
|---|---|---|---|
| A | adapter: week to today, five goals to nine, both payload shapes | `engine/adapter.mjs` | nothing |
| B | merge Jawa's real-goals research and sources | `goals/goal-tree.json`, `engine/goal-engine.mjs`, `engine/training-age.mjs`, `sources.md`, `research/12-*.md` | nothing |
| C | test suite, node built-in runner | `engine/test.mjs` | nothing (tests the public API as it stands) |
| D | plan-vs-actual calibration feeding progression | `engine/calibrate.mjs`, a small hook in `engine/plan.mjs` and `engine/load.mjs` | nothing |
| G | bake-off harness: same people through ours and Jawa's selector, side by side | `engine/bakeoff.mjs` | nothing |
| E | edge function swap plus payload widening | `supabase/functions/generate-workout/index.ts`, `index.html` (payload only) | A |
| F | sandbox: Generate runs the engine in the browser | `sandbox-data.js`, `sandbox-steps.js` | A |

Wave 1 is A, B, C, D, G in parallel. Wave 2 is E and F.

## Rules every workstream follows

- Plain ES modules, no dependencies, no build step, pure functions. Engine code
  must run in Deno as well as node: no `node:` imports outside `demo.mjs`,
  `test.mjs` and `bakeoff.mjs`.
- `knowledge/` is Jawa's. Read only. We fold her work into `mo-knowledge/`, we
  do not edit hers.
- `index.html` is production. Only E touches it, only the payload lines.
- No em dashes or en dashes anywhere, code or prose. House rule.
- Comments say why, in the voice of the existing modules. Read `README.md` and
  one module before writing.
- Nothing is deployed by an agent. Edits only. Mo or the lead deploys.
- Before finishing: `node mo-knowledge/engine/demo.mjs --check` and
  `node --test mo-knowledge/engine/test.mjs` must both pass (the directory form crashes on Node 24, pass the file).

## What done looks like

1. `node --test mo-knowledge/engine/test.mjs` green.
2. The edge function returns engine output with no model call, behind
   `WORKOUT_ENGINE=local` (default) with `llm` kept as a fallback for one release.
3. In the sandbox, tapping Generate shows the engine's plan with the honest line.
4. `node mo-knowledge/engine/bakeoff.mjs` prints ours and Jawa's side by side for
   the same six people, so the comparison is a reading exercise.
5. Jawa's research is merged with attribution, and her one disagreement with
   ours (ask one cheap placement question) is recorded, not buried.
