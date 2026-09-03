# Brief: the workout generation algorithm

**Owner:** Jawa · **Contact:** Mo · **Started:** September 2026

## What the app does

Fit Together is a workout tracker for people training together: a pair, or a coach with up to
19 clients. When someone opens it they either follow a plan their coach set, or the app
generates one for them. **This brief is about that generation.**

Try it first, as a user: **https://m-m-fitness-tracker.vercel.app** — sign in with Google,
choose "Start on my own" when it asks about a partner. Set a goal, generate a workout, run
through a session, log some sets. An hour of that will tell you more than this document.

## The rule everything follows

**Ask the goal, then tell them the plan.** Do not interrogate the user. We do not ask activity
level, training history, or how many days they can manage. We ask what they want, we suggest a
pace, and we hand them a plan. They can change it afterwards in Setup, never before.

This came from watching someone abandon five paid fitness apps over exactly that friction. The
plan must also be safety-led: we suggest the healthy rate, never the fastest one someone asks
for.

## What already exists

Everything is plain ES modules in `knowledge/`, no build step, runnable with `node`.

- **`exercise-library/`** — 219 exercises across weight training (120, keyed to the app's 14
  muscle groups), yoga (37), pilates (23) and calisthenics (39). Each has `primary` and
  `secondary` muscles, `equipment`, and a `level`. Review page: `exercise-library/library.html`.
- **`formulas/`** — TDEE and BMR, calorie burn per activity with MET tiers, 1RM and tonnage,
  goal timelines, and the training mix (how many strength vs cardio sessions for a goal).
- **`formulas/exercise-selector.mjs`** — the selection algorithm. **This is the file you own.**
  It already has `buildWeekPlan`, `selectExercisesForCategory`, `findAlternatives`,
  `progressiveOverload`, `coldStartWeight`, volume landmarks and rep ranges per goal.
- **`principles/`** — our written distillation of the training science the algorithm is meant to
  follow: progressive overload, volume landmarks (MEV/MAV/MRV), RPE, periodization and deloads.

**The algorithm runs today.** `buildWeekPlan({ level: "beginner", goal: "Lose weight",
daysPerWeek: 4, bodyWeightLb: 190 })` returns four days of real exercises. So this is not a
blank page. Your job is to make what it produces actually good.

## What is wrong with it right now

Run it and look at the output. Real problems visible in the first two days it generated:

1. **Poor exercise pairing.** One day came back as `Dumbbell Shrug, Barbell Shrug, Machine
   Shoulder Press, Seated Dumbbell Press` — two shrugs in a row, and traps hit twice while other
   groups got nothing.
2. **Every exercise is 3x10**, whatever the goal. Rep ranges exist in the file but are not
   reaching the output.
3. **No starting weight** comes through, so the user sees no target load.
4. **Days have no name.** There is no "Push day" or "Legs", just a list.
5. **No rest days or deloads** across a week or a block.

## What we need from you

**1. Research first, write second.** Establish, with sources, how a plan should actually be
built for each of our five goals: lose weight, build muscle, get stronger, lose fat and build
muscle, just be consistent. Split choice, weekly volume per muscle group, rep ranges, rest, and
how it changes for a beginner versus someone with a year behind them. Add what you find to
`principles/` as short readable notes, and cite in `sources.md`.

**2. Then fix the selector** so the output matches the research. Specifically:
   - Sensible day splits with names, no muscle hit twice in a session by accident
   - Rep ranges, sets and rest that follow the goal
   - A starting weight for a first-timer, and progression from their own logged history
   - Deloads and rest days across a training block
   - **Every exercise needs a swap.** `findAlternatives` exists; make sure it always returns
     something sensible for the same muscle and available equipment. This is a hard product
     requirement, not a nice-to-have.

**3. Keep it testable.** Pure functions, no network, no database. Given the same inputs it
returns the same plan. Add a small script that prints a week for several goal and level
combinations so we can read the output and judge it.

## Constraints

- **Plain `.mjs`, no build step, no dependencies.** The edge function imports these directly.
- **Do not edit `index.html`, `coach/`, `sw.js` or anything in `supabase/`.** That is the live
  app two people use daily. If you need something changed there, say so.
- **Exercise names must stay generic and functional.** We write our own entries; we do not copy
  another product's library.
- Exercise categories are keyed to the app's existing muscle groups. Do not rename them.

## How to work

Work on a branch, open a pull request, and Mo reviews before anything merges. `main` deploys to
production automatically, which is why nobody pushes to it directly.

```
git checkout -b algorithm/<what-you-are-doing>
node knowledge/formulas/exercise-selector.mjs   # or your own test script
git push -u origin algorithm/<what-you-are-doing>
```

## Open questions worth your judgement

- How much should the plan change for someone with no logged history versus 60 sessions?
- Do we cap total weekly volume for beginners even when they ask for more?
- When someone misses a week, does the plan restart, continue, or step back?
- What does "just be consistent" actually mean as a program, given it has no measurable target?
