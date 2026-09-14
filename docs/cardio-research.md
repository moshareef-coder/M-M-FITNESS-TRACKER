# Cardio research: what we do, what the good apps do, what to build

Date: 2026-09-14. Research only, no code changed.

## Summary

Today cardio is one advisory line under the lifting plan ("2x 30 min of cardio this week"), never placed on a day, never opened as a session, and never logged, so the app prescribes it and then has no idea whether it happened. Every good app treats a cardio session as a first-class block with a type, a duration, an intensity cue and, for intervals, a work/rest structure, and gives it its own live screen and its own log row. The single most important change: make the generator emit a cardio block (type, minutes, intensity, structure) placed on a real day, give it a session screen built around a big clock and an interval timer instead of set chips and dials, and log minutes plus RPE so the weekly "2 of 2 done" is visible on Home. Everything else below hangs off that.

## Part 1: what Fit Together does today

### Where cardio comes from

1. The engine has one number per goal, in `mo-knowledge/engine/goal-engine.mjs` lines 89 to 96. Each goal carries `cardio: { sessions, minutes, zone }`.
2. Values: fat loss 2x30 easy, hypertrophy 1x20 easy, strength 1x20 easy, recomp 2x25 easy, skill 1x20 easy, endurance 3x35 "mixed", health 3x30 easy, habit 1x20 easy. Feel-better "mental" 3x30 easy, "energy" 4x30 easy (lines 234 to 235).
3. "Improve my cardio" in the goal picker maps to feel-better/energy (`adapter.mjs` line 334), so it gets 4x30 easy and no intervals.
4. A secondary goal can only raise cardio, never lower it (`goal-engine.mjs` lines 463 to 490, `cardioLoad`).
5. The engine README says it plainly (line 1676): "`plan.cardio` is never placed on a day or sent to the app." The adapter now sends it as `meta.cardio` (`adapter.mjs` lines 1112 to 1122) but it is still not placed on a day.
6. `knowledge/formulas/training-mix.mjs` (Jawa's side) has a different model: `GOAL_MIX_WEIGHTS` gives cardio whole days (lose: 2 lifting, 3 cardio) and `assignWeekSchedule` alternates them. It is not wired into the shipped engine.

### How it is presented in a plan

7. The app saves it on the plan row as `cardio` (`index.html` line 13268). The comment there: "Advisory: never a set, never logged, never in `exercises`."
8. It renders once, as `cardioNoteHTML` (line 17600), a dashed card under the cool-down block. Exact strings the user sees:
   - Title: `2x 30 min of cardio this week`
   - Body: `Run, bike or incline walk. easy pace, you can still hold a conversation. Separate from this session, on a day that suits you.`
9. The card is hidden as soon as the workout is finished, so it is only visible on the plan screen before you train.
10. Zone words (line 17595): easy = "easy pace, you can still hold a conversation", moderate = "moderate, breathing hard but steady", hard = "hard intervals". The engine only ever emits `easy` or `mixed`. `mixed` has no words, so the endurance goal prints: `Run, bike or incline walk. mixed. Separate from this session, on a day that suits you.` That is a live bug. `moderate` and `hard` are dead entries.
11. What it has: sessions, minutes, zone. What it does not have: a type (run vs bike is a suggestion in prose), a day, a structure (no intervals), a target, or any state (done or not done).

### What the user sees during a session

12. There is no cardio session screen. The live session (`index.html` lines 14700 to 14800) is built for lifts only: the animated figure stage, warm-up rungs and set chips, weight and reps dials, and the `Log set N of M` CTA. Cardio never enters `SESSION`.
13. If someone adds "Run" through Manual build (`renderManualBuildScreen`, line 16979), it becomes a row with sets, reps and weight, because that is the only shape a row can have.

### What gets logged

14. Nothing, for the prescribed cardio. `logExerciseSilent` (line 14316) writes `exercise_name, weight, reps, sets` only.
15. `exercise_logs.duration_min` exists and is read in 23 places (recap shows `30 min`, Body tab converts minutes to pseudo-sets at one set per 10 minutes, PB logic filters it out). Nothing in the app writes it. Only `scripts/badge-check-test.mjs` does. It is a legacy column waiting for a writer.
16. `MUSCLE_RULES` (line 18031 onward) already maps typed cardio names (run, bike, row erg, incline walk, swim, HIIT) to muscle credit, so the Body tab is ready for cardio rows the moment they exist.
17. Home, streaks and the calendar have no concept of a cardio day. The engine's own streak token is "2-a-week lifting".

## Part 2: how the good apps do it

Fitbod and Hevy help-centre pages refuse automated fetches; their lines below come from their own published help URLs as summarised in search, plus the Hevy features page.

### Nike Training Club (free, guided classes)
- Structure: video or audio-led classes, each a timed sequence of moves; cardio lives in HIIT and "sprint interval" style classes, work/rest by the clock.
- During: on-screen countdown per move, coach voice cues for form, breathing and tempo.
- Placement: cardio is its own class type alongside strength, mobility, yoga; programs mix class types across the week.
- Logged: class completed, minutes; no per-interval data.
- Source: https://www.reviewed.com/health/content/nike-training-club-review-workout-app and https://apps.apple.com/us/app/nike-training-club/id301521403

### Peloton app (no bike)
- Structure: audio outdoor runs and walks, 10 to 75 min, typed by intent: Warm Up, Endurance, Interval, Walk + Run, Power Walk, Speed. Effort is instructor-cued, not a number.
- During: instructor voice tells you when to push and when to recover; "Just Run/Walk" mode is a bare tracker with no coach.
- Placement: separate classes; programs schedule strength and cardio on different days.
- Logged: time, distance, class completed.
- Source: https://www.onepeloton.com/classes/outdoor-workout/walk-run and https://www.pelobuddy.com/just-work-out-feature-soon/

### Apple Fitness+
- Structure: HIIT, Treadmill (walk or run), Cycling, Rowing classes; HIIT is coach-cued work/recovery intervals. Time to Walk/Run are audio-only, by time.
- During: workout time, heart rate, calories, and the Burn Bar (your calories vs everyone who did the class) for HIIT, treadmill, cycling, rowing.
- Placement: standalone classes; Apple suggests pairings but does not schedule.
- Logged: full workout summary with all metrics saved to Fitness, even hidden ones.
- Source: https://support.apple.com/en-sa/HT211923 and https://www.myhealthyapple.com/how-to-use-the-burn-bar-in-apple-fitness-and-turn-the-burn-bar-on-or-off/

### Strava
- Structure: no prescription. Records an activity by GPS and heart rate; intensity comes from heart-rate zones (default 220 minus age) or a manual Perceived Exertion 1 to 10.
- During: live pace, distance, time; zones are analysed after.
- Placement: none, it is a log. Relative Effort makes a short hard session and a long easy one comparable, then feeds a fitness curve.
- Logged: time, distance, pace, HR stream, time in zone, Relative Effort, perceived exertion.
- Source: https://support.strava.com/en-us/articles/15401794-relative-effort and https://support.strava.com/en-us/articles/15401762-heart-rate

### Freeletics
- Structure: AI Coach builds a week of bodyweight HIIT, running intervals and cardio, each with warm-up and cool-down; running sessions are interval-based by time or distance.
- During: timer and countdown per exercise or interval; after each session you rate it (too easy, right, too hard) and the coach adjusts.
- Placement: cardio and running are their own coached sessions in the week, not attached to lifting.
- Logged: time, completed intervals, the post-session feedback rating.
- Source: https://www.freeletics.com/en/ and https://womenlovetech.com/a-beginners-guide-to-the-freeletics-running-app/amp/

### Centr
- Structure: weekly programs with a fixed cardio slot, e.g. Strength in Motion is 3 strength, 1 HIIT, 1 mobility per week (20 to 45 min); Hybrid Strong is 3 strength plus 1 cardio HIIT.
- During: trainer-led video, or self-guided text with a timer.
- Placement: cardio is one named day in the week, and strength days carry short cardio elements.
- Logged: session completed.
- Source: https://www.garagegymreviews.com/centr-review and https://www.fitandwell.com/features/maximize-your-strength-and-endurance-like-chris-hemsworth-with-this-hybrid-training-workout-from-centr

### Fitbod (generator, lifting first)
- Structure: cardio is an exercise type: Treadmill, Running (outdoor), Stationary bike, Cycling (outdoor), Elliptical, Rowing, Walking and Hiking. Fields are time, distance, resistance; timed intervals take a duration in seconds per interval.
- During: a duration field with a timer; no coach.
- Placement: the generator adds cardio to a workout based on goal and workout length: more for "Reduce bodyweight" and "Improve fitness", less for "Powerlifting". Strava runs and rides import as exercises.
- Logged: time, distance, resistance; logged cardio raises muscle fatigue in the recovery model.
- Source: https://fitbod.zendesk.com/hc/en-us/articles/360006427673-Cardio-Recommendations and https://fitbod.zendesk.com/hc/en-us/articles/360041831493-Timed-Intervals

### Hevy (lifting tracker)
- Structure: cardio is an exercise with sets typed as distance and duration instead of weight and reps.
- During: a row in the workout like any lift; a rest timer, no cardio timer.
- Placement: wherever you put it in the routine; usually a finisher row.
- Logged: distance and duration per set; PRs for best pace, longest distance, longest time.
- Source: https://www.hevyapp.com/features/exercise-performance/ and https://help.hevyapp.com/hc/en-us/articles/35382889578135-Exercise-Performance-Tracking-in-Library-Weight-Bodyweight-Cardio-and-Duration-Based-Exercises

### Strong (lifting tracker)
- Structure: exercise types include "duration" and "distance and duration"; rowing and cycling ship in the library.
- During: same set-list screen as lifts; type the minutes.
- Placement: a row in the routine, typically last.
- Logged: duration, distance.
- Source: https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577

### Runna (running plans)
- Structure: session types are Easy run (conversational pace), Long run (distance), Tempo (comfortably hard, sustained), Intervals (reps with active or passive recovery), Hills, Walk-Run (timed alternation for beginners), Time trial. Targets are pace or RPE, user's choice.
- During: audio cues at each rep boundary (start, stop, speed up, slow down, rest), pace alerts if pace targets are on, watch prompts.
- Placement: running is the plan; strength is optional add-on sessions.
- Logged: time, distance, splits, and whether pace targets were hit.
- Source: https://support.runna.com/en/collections/16285592-training-methods-and-sessions-explained and https://support.runna.com/en/articles/8159780-setting-up-and-managing-your-audio-cues

### Nike Run Club
- Structure: guided runs by time or distance; Guided Speed Runs cue intervals, tempo blocks and recovery. Effort-based targets, e.g. tempo is "6 out of 10 effort", not a fixed pace.
- During: a coach's voice tells you when to push and recover; live pace and distance on screen.
- Placement: standalone runs; NRC's 5K and marathon plans pair guided runs with rest and cross-training days.
- Logged: pace, distance, splits, HR if present, plus a post-run tag of effort, terrain, weather and shoes.
- Source: https://www.nike.com/a/running-goals and https://apps.apple.com/us/app/nike-run-club-running-coach/id387771637

### The pattern across all ten
1. A cardio session is a typed block: (type, duration, intensity cue, optional interval structure). Never a bare name.
2. Intensity is given as an RPE or talk-test cue in every consumer app; only Strava and Apple depend on heart rate.
3. The screen during cardio is a clock plus a phase (work or rest) plus a voice or a beep, not a set list.
4. What is logged is minutes, distance if the phone had it, and a one-tap effort rating.
5. Placement is a scheduled slot in the week (Centr, Freeletics, Peloton programs) or a finisher row (Fitbod, Hevy, Strong). Nobody leaves it as advice.

### The sports science in five lines
1. Baseline dose: 150 to 300 min a week moderate, or 75 to 150 vigorous, plus resistance training 2 or more days. Source: https://acsm.org/physical-activity-guidelines-faqs/
2. LISS or zone 2: 60 to 70 percent of max HR, RPE 3 to 4 out of 10, you can speak full sentences (the talk test is validated as a prescription tool). 25 to 40 min, 3 times a week is the standard starter dose. Source: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8017038/ and https://repfitness.com/blogs/training/what-is-zone-2
3. HIIT: short work bouts (20 s to 4 min) at RPE 8 to 9 with equal or longer easy recovery; meta-analysis shows fat loss and VO2 gains equal to or better than steady state in less time, with adherence as the open question. Source: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10048683/
4. Interference: across 43 studies, adding cardio to lifting did not meaningfully reduce strength or muscle growth; only explosive power dropped, mainly when both were in the same session. Lift first if in one session; cycling interferes less than running. Source: https://www.strongerbyscience.com/research-spotlight-interference-effect/ and https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5752732/
5. Placement by goal: fat loss wants the most minutes (2 to 3 easy sessions, own days or after lifting); muscle and strength want 1 to 2 easy sessions kept off leg day; endurance goals want structure (easy, intervals, long) on their own days; habit goals want the shortest possible session attached to something already scheduled. Source: https://www.barbellmedicine.com/blog/concurrent-training-and-the-interference-effect/

## Part 3: recommendation for Fit Together

### 1. Give the generator a cardio block, not a number
Replace `cardio: { sessions, minutes, zone }` with one block per session, placed on a day:

```
cardio: {
  kind: "steady" | "intervals" | "walk",
  minutes: 30,
  intensity: "easy" | "moderate" | "hard",
  cue: "You can still hold a conversation",   // the talk-test line, always present
  rpe: [3, 4],                                 // target range on 1 to 10
  structure: null | { warmMin: 3, workSec: 30, restSec: 30, rounds: 10, coolMin: 3 },
  modality: ["run", "bike", "incline walk", "row"],   // user picks at start
  placement: "own-day" | "after-lifting",
  day: 3                                       // index into the week, never null
}
```
- Steady: minutes plus cue. Intervals: the structure above. Walk: minutes only, counts for health and habit goals.
- The `mixed` zone goes away; endurance becomes one easy, one intervals, one longer steady.
- The app already stores `plan.cardio`; this is the same field with more shape.

### 2. Cardio session screen (replaces chips and dials, keeps the stage and the CTA)
1. Start card: modality picker (Run, Bike, Walk, Row), the target ("30 min, easy, you can still talk"), one lime `Start` CTA.
2. Stage: keep the figure, in a run, bike, walk or row loop. If no loop exists, show the big clock on the stage instead of an empty figure.
3. Steady: a big elapsed clock counting up to the target, a thin progress ring, the talk-test cue as a persistent line. CTA becomes `Pause`, then `Finish` once the target is reached (`Finish early` under it).
4. Intervals: a full-width phase panel, WORK in lime and REST in the muted panel colour, round `4 of 10`, a countdown per phase, a short beep and a vibration on every phase change (WebAudio plus `navigator.vibrate`, no library). Wake lock on, same as the rest timer should be.
5. End sheet: three-chip RPE (`Easy`, `Steady`, `Hard`, mapping to 3, 5, 8) plus an optional distance field, then the existing finish screen with minutes in the Time tile and no proud zero for volume.
6. Partner: if both are on a cardio day, show the partner's live clock in the presence strip, same as sets today. Two people can do this side by side more easily than any lift.

### 3. Where cardio sits per goal
1. Fat loss: 2 to 3 x 30 min steady easy, own days between lifting days. Minutes drive the calorie total and easy sessions get done.
2. Muscle gain: 1 to 2 x 20 min easy, after an upper-body session. Interference is negligible and it saves a day.
3. Strength: 1 x 20 min easy bike or incline walk, on a non-leg day. Keeps fatigue off heavy days; cycling interferes less than running.
4. Endurance and run 5k: 3 own days, one easy, one intervals, one longer steady. Running is the goal, lifting is the support.
5. Health and energy: 3 to 4 x 30 min walks or easy sessions, own days, walking counts. The guideline is 150 minutes a week.
6. Habit and consistency: 1 x 15 min walk as a finisher on a lifting day. One fewer day to schedule is the whole point.

### 4. What to log
1. One `exercise_logs` row per cardio session: `exercise_name` (the modality), `duration_min` (already exists, finally written), `distance_km` nullable, `rpe`, `kind`, `rounds_done` for intervals.
2. Home and the plan: `Cardio 1 of 2 this week`, ticking as rows land, so the prescription has a state.
3. Progress: minutes per week trend, longest session, best RPE-adjusted pace if distance was typed. Hevy's three PRs (best pace, longest distance, longest time) are the right small set.
4. Body tab: keep the existing minutes-to-pseudo-sets rule and the `MUSCLE_RULES` credit; they already work once rows exist.
5. Streaks: a cardio session counts as a training day. Today it cannot.

### 5. Three things not to do
1. No heart-rate zone bars, Burn Bar, or Relative Effort. There is no wearable integration, so any zone number would be a guess dressed as data. RPE and the talk test are the honest signal.
2. No coached audio or video classes. That is a content treadmill; the app's voice is the plan and the clock. A beep and a cue line is enough.
3. No pace targets in min/km. Background GPS in a PWA is unreliable and the Capacitor wrap is not shipped. Distance is an optional typed field at the end, not a live metric.

### Quick win before any of this
Fix the `mixed` zone string in `CARDIO_ZONE_WORDS` (`index.html` line 17595) so the endurance goal stops printing "mixed." as a sentence. Two lines.
