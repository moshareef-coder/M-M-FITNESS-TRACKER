# Fitness knowledge base

Two layers, built in phases, both feeding `supabase/functions/generate-workout`:

1. **`formulas/`** (done) -- deterministic math: calorie burn, TDEE/BMR, 1RM, tonnage. Computed
   in code, not guessed by the AI, because LLMs are unreliable at arithmetic. See `sources.md`
   for where each formula comes from.
2. **`principles/`** (done) -- our own written distillation of mainstream, evidence-based
   training science, folded into `generate-workout`'s system prompt as condensed rules. Not
   transcripts or paraphrases of any specific creator's content -- see the note in `sources.md`.
   Four files: `progressive-overload.md`, `volume-landmarks.md` (MEV/MAV/MRV set ranges per
   muscle group), `rpe-autoregulation.md` (effort targets by goal), `periodization-deloads.md`
   (when and how to back off). Each is short and meant to be read directly, not just consumed
   by the AI -- add to or edit these like any other doc when the training philosophy changes.

## Using the formulas

Plain ES modules (`.mjs`), no build step, so they work two ways:
- **Edge function (Deno)**: `import { calculateTDEE } from "../../../knowledge/formulas/tdee.mjs"`
  (done, live in `generate-workout`)
- **Browser (index.html)**: dynamic `import()` from a small shim near the top of the main
  `<script>` (`FIT_MATH`, done, loads all three formula modules into one object) plus a
  `currentWeightLb(name)` helper next to `entriesFor()`. Not yet wired into any screen --
  index.html is under active concurrent edits from another session as of 2026-09-01, so the
  actual UI display (calorie estimate on workout/activity completion, a TDEE stat in Setup) is
  the next step once that settles, using `FIT_MATH` and `currentWeightLb` that are already there.
