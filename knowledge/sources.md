# Formula provenance

Every formula in `formulas/` is public-domain exercise science, not a paraphrase of any
influencer's proprietary content. Kept here so the reasoning is auditable later.

- **MET values** (`calorie-math.mjs`): 2011 Compendium of Physical Activities (Ainsworth et al.),
  the standard reference every fitness tracker draws from. `kcal/min = MET x 3.5 x kg / 200`.
- **BMR / TDEE** (`tdee.mjs`): Mifflin-St Jeor (1990), currently the best-validated resting-energy
  equation for people at normal body weight (outperforms Harris-Benedict, which is from 1919).
- **1RM estimate** (`strength-math.mjs`): Epley formula, the most widely used estimator and the
  one most lifting apps default to. Accuracy degrades above ~10 reps, same caveat every app has.

## What this deliberately is NOT

None of this is a transcript, paraphrase, or "system" copied from Jeff Nippard, Mike Israetel,
or any other creator. The `principles/` folder (phase 2, not yet built) will distill the same
shared, textbook exercise-science concepts those creators teach -- progressive overload, volume
landmarks, RPE autoregulation -- written from scratch, not summarized from their videos.
