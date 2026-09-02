# Weight-loss training: what a cross-section of trainers agree on

Researched 2026-09-01 against the publicly known training philosophies of four fitness
creators with genuinely different styles: Kayla Itsines (circuit/resistance + LISS), Joe Wicks
(HIIT popularizer), Lilly Sabri (physiotherapist, Pilates/low-impact), James Smith (energy
balance, no-nonsense PT). A fifth name the user asked about, Kevin Curry (Fit Men Cook), is
excluded here on purpose -- his public brand is meal prep and nutrition, not a training
methodology, so there was nothing training-specific to extract. This is our own synthesis of
their *publicly documented general approach* (interviews, articles, free content), not a copy
of anyone's paid program -- see `../sources.md` for the same standard that applies everywhere
else in this folder.

## What they actually agree on

Four people with very different brands, and every one of them lands on the same handful of
points for the fitness side of weight loss:

1. **Resistance + cardio combined, not either alone.** Itsines pairs circuit-style resistance
   work with LISS cardio explicitly. Wicks' HIIT sessions blend both within one format. Smith's
   energy-balance framing treats training as one lever, not the whole system, and still points
   people toward resistance work. This matches [[volume-landmarks]] and the training-mix floor
   already built into this app (see `../formulas/training-mix.mjs`) -- it is not a new idea, it
   is confirmation the existing floor rule is pointed the right direction.
2. **Short, low-equipment-barrier sessions win on adherence.** Wicks built his entire public
   reputation on 20-30 minute, minimal-equipment HIIT specifically because that removes the
   biggest real-world barrier to consistency. Itsines' BBG circuits run in a similar range. The
   lesson isn't "short is better," it's that a program only works if someone actually does it,
   which is a real, load-bearing product constraint, not just a preference to accommodate.
3. **Circuit structure is a distinct, useful mode, not just "weight training but faster."**
   Itsines' format specifically is short exercise blocks (roughly 4 exercises, ~7 min per
   circuit) with minimal rest between exercises, run through twice. That is a genuinely
   different session shape from traditional straight-sets-with-full-rest training, and it is
   the shape most associated with fat-loss-oriented resistance work across the people
   researched here.
4. **Low-impact is a legitimate primary path, not a fallback.** Sabri's entire public position
   is built on being a physiotherapist first -- her approach is explicitly for people who need
   or want joint-friendly training, not a lesser option for people who "can't handle" more
   intense formats. `flow` (yoga/Pilates) in the training mix should be treated as a real
   equal option for a weight-loss goal, especially when someone's notes mention joint issues,
   not a minor category that only shows up by leftover allocation.
5. **Every one of them explicitly argues against extreme intensity or an aggressive deficit.**
   This is the strongest, most consistent signal across all four: Wicks moved his own public
   messaging away from pure HIIT toward balance and sustainability over time. Sabri's stated
   position is explicitly anti-extreme. Smith is publicly associated with a 15-20% deficit
   below TDEE as the sustainable range, not a crash-diet number. **This directly caught a real
   bug in this app's own math** -- `estimateGoalTimeline()` was computing deficits up to 37% of
   TDEE for some profiles with no cap, landing under commonly-cited safe daily-calorie floors.
   Fixed 2026-09-01: capped at 20% of TDEE and a 1,200 kcal/day floor, see
   `../formulas/goal-timeline.mjs`.

## How this should shape a generated program for a weight-loss goal

- Prefer circuit-style structure for weight-training days on a "lose" goal specifically:
  shorter rest between exercises than a strength- or hypertrophy-focused day would use, not a
  different exercise list.
- Do not let session length or equipment barrier creep up for this goal -- adherence is the
  active constraint being optimized for here, which is a real, cited reason to keep sessions
  short and low-equipment, not just a nice-to-have.
- Treat `flow` as a genuine primary recommendation, not just whatever is left over after
  resistance and cardio are allocated, especially when the person's notes mention joint pain,
  a bad knee, or similar -- this is Sabri's whole public positioning, and it is medically
  sound, not a lesser substitute.
- Never recommend a deficit or a pace that the math itself would not call sustainable. The cap
  described above is not a suggestion to relax later for "better results" -- the unanimous
  point across every trainer researched here is that the aggressive version is the one that
  does not work long-term.
