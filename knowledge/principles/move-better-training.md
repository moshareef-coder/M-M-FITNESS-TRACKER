# Move better training

Covers the "Move better" goal tile — its real kids, confirmed directly in
`index.html`'s `TREE_KIDS`, are **mobility, flexibility, pain, and
back-postpartum**. This doc covers the first three fully; back-postpartum
is deliberately not auto-generated yet — see below for why.

## The rare case where one dosing target works for everyone

A 2024 systematic review and multivariate meta-regression (PubMed
39614059), searching seven databases up to June 2024, found static
stretching improves flexibility with **no additional benefit beyond 4
minutes per session or 10 minutes per week** — and critically, this effect
was *not* moderated by age, sex, training status, or session frequency.
Every other category built so far has needed tiering by experience level;
this one genuinely doesn't. `mobility-progression.mjs` caps at exactly
that ceiling — 240 seconds per targeted area per session, 600 seconds per
area per week — rather than the "more must be better" assumption most
stretching content defaults to.

**One real exception:** older adults need longer individual holds, not
more total time. Feland et al. found 60-second holds produced greater
hamstring flexibility gains in older adults than the standard 15-30 second
convention. This is the one place the starting-context modifier from
`real-goals.md` changes the actual mechanic (hold duration), not just the
ramp speed the way it does everywhere else.

## A real caveat worth being honest about

A 2025 meta-analysis found no compelling evidence that stretching *after*
a workout, used alone, meaningfully improves pain, performance, strength,
or flexibility. The flexibility research above is about a **dedicated
mobility session** — this goal, standalone — not stretching tacked onto
the end of another workout as a cooldown. Worth keeping that distinction
clear in any copy: this goal earns its own session time, it isn't just
"add stretching to what you're already doing."

## No new exercise library needed — for the safe part

Both `YOGA` and `PILATES` already exist with the right shape: level
tagging, `primary` muscle groups, `isHold: true` already used, and
`trackingMode: "duration"` set at the library level. Yin/Restorative yoga
in particular is already described in the library's own comments as "long
passive holds (2-5 min), deep stretch, low exertion" — close to an exact
match for the research-backed dosing above. `buildMobilitySession()` pulls
from this existing content; no new exercises needed for the general
mobility/flexibility/pain case.

## Area targeting reuses the existing body picker

`index.html` already has this solved — `renderBodyFocusPage({ sore: true
})` flips the same body-part picker used elsewhere (rank what to grow)
into ranking what hurts instead, reusing the identical figure, ranking
engine, and budget logic. `buildMobilitySession()` is designed to take
that output directly (an array of ranked area keys) rather than
duplicating a second area-picker.

## back-postpartum: deliberately not auto-generated yet

Over 60% of childbearing women experience diastasis recti (abdominal
separation), and real clinical evidence backs specific, careful
programming for this population: a systematic review with meta-analysis
(65 studies, 21,334 participants, *British Journal of Sports Medicine*
2025) found pelvic floor muscle training reduces the odds of urinary
incontinence by 37% and pelvic organ prolapse by 56% — moderate-certainty
evidence, not a small effect. High-impact activity and traditional
flexion-pattern core exercises (crunches, sit-ups) are specifically
cautioned against during recovery, since they increase intra-abdominal
pressure in a way that can worsen the condition; low-impact cardio
(walking, elliptical, hiking) and transverse-abdominis/pelvic-floor-
focused core work are the recommended alternatives instead.

**This is exactly what the existing exercise library can't safely
provide yet.** `PILATES`'s own "core" category includes The Hundred,
Roll-Up, Teaser, and Jackknife — all flexion/crunch-pattern movements that
postpartum guidance specifically cautions against — and none of them carry
any tag that would let a selector avoid them. An auto-selector filtering
by level alone could serve an "advanced" postpartum user Teaser or
Jackknife with zero safeguard. Building selection logic on top of
unvetted content here would be a real safety problem, not a minor content
gap to quietly route around — so `mobility-progression.mjs` explicitly
does not attempt it (`BACK_POSTPARTUM_NOT_YET_SUPPORTED`).

**What this actually needs before it can be built:**
1. A small set of new, properly-tagged exercise entries specifically for
   this population — pelvic tilts, diaphragmatic breathing with
   transverse-abdominis engagement, modified glute bridges — ideally
   reviewed by someone with direct clinical grounding in postpartum
   rehabilitation, not generated from general fitness research alone.
2. A prominent, explicit recommendation to get clearance from a doctor or
   pelvic floor physical therapist before starting — standard practice
   across every postpartum-specific source checked, and appropriate given
   the real, common, and variable nature of this condition.

Flagging this clearly rather than shipping a workaround: the honest
answer for back-postpartum today is "professional guidance first," not an
algorithmically generated plan.
