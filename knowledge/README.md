# Fitness knowledge base

Two layers, built in phases, both feeding `supabase/functions/generate-workout`:

1. **`formulas/`** (done) -- deterministic math: calorie burn, TDEE/BMR, 1RM, tonnage. Computed
   in code, not guessed by the AI, because LLMs are unreliable at arithmetic. See `sources.md`
   for where each formula comes from.
2. **`principles/`** (not started) -- our own written distillation of mainstream, evidence-based
   training science (progressive overload, volume landmarks, periodization, RPE autoregulation),
   folded into `generate-workout`'s system prompt. Not transcripts or paraphrases of any specific
   creator's content -- see the note in `sources.md`.

## Using the formulas

Plain ES modules (`.mjs`), no build step, so they work two ways:
- **Edge function (Deno)**: `import { calculateTDEE } from "../../../knowledge/formulas/tdee.mjs"`
- **Browser (index.html)**: dynamic `import()` from a small module-script shim, since the rest of
  the app is a single classic `<script>` and this is additive, not a rewrite. Not yet wired in --
  index.html currently has an uncommitted diff from another session; wire this in after that lands
  so the two changes don't collide.
