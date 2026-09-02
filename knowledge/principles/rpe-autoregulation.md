# RPE / RIR-based autoregulation

Fixed percentages of a 1RM ("do 5 sets at 75%") assume the lifter's max never changes and that
they feel the same every day. Neither is true. RPE (Rate of Perceived Exertion, 1-10) and its
mirror RIR (Reps In Reserve) let effort scale to how the trainee actually feels that session,
which is why most modern programs — regardless of which coach designed them — lean on this
instead of rigid percentages.

## The scale

- **RPE 10 / 0 RIR** — true failure, could not get another rep.
- **RPE 9 / 1 RIR** — could have done exactly one more rep.
- **RPE 8 / 2 RIR** — could have done two more.
- **RPE 7 / 3 RIR** — a solid working set, clearly submaximal.
- Below RPE 6 is warm-up territory, not a working set.

## Target RPE by goal

- **Muscle gain (hypertrophy)**: RPE 7-9 (1-3 RIR) on most working sets. Training every set to
  true failure adds fatigue disproportionate to the extra growth it buys.
- **Strength**: RPE 6-8 on volume work, occasional RPE 9 singles/doubles near a peak — but not
  every session, since grinding near-max reps every session is a fast route to burnout.
- **General fitness / fat loss**: RPE 6-8 is plenty. The goal is consistent, recoverable output
  across the week, not maximal single-session intensity.
- **Beginners (first ~6 months)**: cap around RPE 7-8. They can't yet judge true failure
  accurately, and the technical breakdown that happens near failure is riskier before movement
  patterns are grooved.

## How this should shape a generated program

- When picking a starting weight with no history, aim for a load that lands around the target
  RPE for that set/rep scheme, not a percentage of an unknown 1RM.
- When progressing load week to week, treat "last session felt like RPE 6 at the planned
  weight" as a green light to add load, and "last session was RPE 9-10" as a signal to hold or
  even slightly back off, regardless of what the raw progressive-overload rule would suggest.
- Don't program RPE 9-10 on back-to-back sessions hitting the same muscle group — that's the
  fastest way to blow through MRV (see `volume-landmarks.md`) without the numbers "looking" high.
