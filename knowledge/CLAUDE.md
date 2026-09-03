# Working context for the workout algorithm

Read this before touching anything. It is written for Claude Code sessions working
on the algorithm, and for the person running them.

## What you are working on

Fit Together is a workout tracker for people training together: a pair, or a coach with up to
19 clients. It is live and two people use it daily, so the live app is off limits (see
Boundaries). Your job is the **workout generation algorithm** in `knowledge/`.

The full assignment is in **`BRIEF-workout-algorithm.md`** in this folder. Read that next.

## Boundaries, which matter

**Only edit files under `knowledge/`.** Specifically `formulas/`, `principles/`,
`exercise-library/` and `sources.md`.

**Never edit** `index.html`, `sw.js`, `coach/`, `supabase/`, `scripts/` or `vercel.json`.
`index.html` is the entire app in one file and `main` deploys to production automatically.
A `CODEOWNERS` file enforces this: a pull request touching those paths cannot merge without
Mo's approval.

If the algorithm needs something the app does not provide, **say so in the pull request**
rather than reaching into the app to add it.

## How the code is shaped

Plain ES modules, `.mjs`, **no build step and no dependencies**. They run three ways:
directly with `node`, imported by the Supabase edge function (Deno), and imported by the
browser. That is why there is no package manager here. Keep it that way.

```
knowledge/
  formulas/
    exercise-selector.mjs   <- the main file you own, ~340 lines
    training-mix.mjs        <- how many strength vs cardio sessions per goal
    tdee.mjs, calorie-math.mjs, strength-math.mjs, goal-timeline.mjs
  exercise-library/
    index.mjs               <- exports all four trainings
    weight-training.mjs     <- 120 exercises, categories keyed to the app's muscle groups
    yoga.mjs, pilates.mjs, calisthenics.mjs
  principles/               <- written training science the algorithm should follow
  sources.md                <- cite research here
```

**Run it to see what it does:**

```js
import { buildWeekPlan } from "./knowledge/formulas/exercise-selector.mjs";
console.log(buildWeekPlan({ level: "beginner", goal: "Lose weight", daysPerWeek: 4, bodyWeightLb: 190 }));
```

It works today. It returns four days of real exercises. It is just not good yet, and the
brief lists exactly how.

## Things that will bite you

**Exercise category keys are load-bearing.** They match `MUSCLE_GROUPS` in the app
(chest, shoulders, traps, lats, lowerback, biceps, triceps, forearms, abs, obliques, glutes,
quads, hamstrings, calves). The muscle heat map and coverage ring read them directly. Renaming
one silently breaks a screen.

**Exercise names must stay generic and functional.** We write our own entries. Do not copy
another product's library, and do not paste in a creator's programme.

**Keep everything a pure function.** No network, no database, no `Date.now()` inside the
planning logic. Same inputs, same plan, every time. That is what makes it reviewable.

**The product rule the whole app follows:** ask the goal, then tell the user the plan. Never
interrogate them. If your algorithm needs an input we do not ask for, either derive it from
what we already have or default it sensibly. Adding a question is a last resort and needs
agreement.

## The five goals

Every plan is built for one of these, taken verbatim from onboarding:

- Lose weight
- Build muscle
- Get stronger
- Recomp (lose fat, gain muscle)
- Stay consistent

Plus a weekly day target (3 to 5) and, optionally, the user's logged history.

## How to work

```
git checkout -b algorithm/<what-you-are-doing>
# edit only under knowledge/
node your-test-script.mjs        # show the output, judge it, iterate
git push -u origin algorithm/<what-you-are-doing>
```

Then open a pull request. **Put the generated output in the description**, a week for a
couple of different goals and levels, so it can be judged by reading rather than by running.

## Try the app first

**https://m-m-fitness-tracker.vercel.app** — sign in with Google, choose **"Just me"** when it
asks who is training with you. Set a goal, generate a workout, run a session, log some sets.
An hour of that is worth more than any amount of reading this file.
