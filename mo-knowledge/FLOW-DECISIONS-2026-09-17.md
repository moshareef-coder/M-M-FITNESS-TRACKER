# The flow, as decided on 2026-09-17

Transcribed from Mo's meeting the same evening. Every item below is a decision
unless it is marked OPEN. The words in quotes are the meeting's own; the copy
the app ships is written from them, shorter, in the robot's voice.

The robot's name is **Unio**. He is the app's personal trainer. He is funny and
motivational and he never lectures. Every line he says should also work read
aloud, because voice is coming: write for the ear.

Two things the whole flow is built on, said in the meeting in so many words:

- The product is not the generator. It is the goals, and it is having a
  partner. The generator is how the trainer does his job.
- "Simplicity is the key." Bold things that are easy to tap. No backgrounds, no
  subtext, no walls of words. "This is an app, not a website."

## The onboarding sequence

Old: name, goal, target, tune, track, styles, days, plan, commit, partner.

New:

```
login  ->  name  ->  intro 1  ->  intro 2  ->  goal  ->  target  ->  about you
       ->  body (main goal only, if it asks)  ->  workouts  ->  intensity
       ->  plan  ->  hire me  ->  commit  ->  Home
```

### 0. Login
Unchanged. Google, Apple in the native build, email and password for an account
that already exists.

### 1. Name: "What should we call you?"
FIRST, before the intro. Even somebody who signed in with Google may not want
the name on that account (business accounts, full legal names). Recorded and
written to the profile. The robot does NOT have to say the name out loud in his
lines, because a mispronounced name is worse than none. It appears in writing
where it already does.

### 2. Intro, page one
The robot introduces himself. Substance: "Welcome. I'm Unio. I'm going to be
your personal trainer. I'll build you a workout plan that is yours and
[the word is not "affordable"; find the right one, or say nothing about price
here]." One screen, one Continue.

### 3. Intro, page two
"You will not be alone. There are three of us: me, you, and your partner. Invite
them and I'll watch you both, track you both, and tell you what's going on. Or
it can be just me and you. That works too." Funny, motivational. The partner is
"included in your package", never "free". One Continue.

This is the ONLY place onboarding talks about the partner. See item 14.

### 4. Goal: "What's your goal?"
Robot lead-in, in substance: "Let's plan your goal. Don't worry about your
partner. They'll get a link, and I'll help them build their own." Then the
goal tiles. SIMPLE: bold labels, easy to tap, no backgrounds, no descriptions,
not many of them. The existing goal set is fine. The 1 main + 2 extras rule
stays.

### 5. Target
The goal weight / numbers screen stays where it is (only for goals that ask).

### 6. About you: sex, height, weight  (NEW screen)
Before the body picker and before "pick your workouts", because the body
avatar is different for a woman and a man, and because Pilates is recommended
differently. Three inputs, nothing else:
- Male / Female / Rather not say (three tiles). Not "other".
- Height, weight (the fields that are on the target screen today move here).
"Rather not say" gets the male figure and no sex-based recommendations.

### 7. Body picker (main goal only)
Where does it hurt / where do you want to get stronger. REDESIGNED:
- The full body, the woman's or the man's per item 6.
- Big regions, not muscles: arms and shoulders, chest, back, legs, core. "I
  don't want to see too much detail."
- Two views, front and back. FRONT FIRST. Tapping a region that lives on the
  back (back) flips the figure to the back view on its own, a swipe animation.
  The person never has to find a toggle. "I don't swipe. The app swipes for me
  based on what I pick." Not 3D.
- Only the MAIN goal gets this page. "All for your three goals: this is too
  much in the beginning." Extras get no follow-up page.

### 8. Track: REMOVED as a page
"Choose what you want to track" is too much in the beginning. It becomes one
robot line on the way past (on the plan screen, or wherever it fits): "You can
track whatever you want in Progress. I'll show you later." The actual choice
happens the first time they open Progress, which already has the per-goal
preferences. Nothing else changes about tracking.

### 9. Workouts: "Pick your workouts"
- Icons on every option.
- "Lifting" and "At home" are gone: nobody knows the difference. They become
  **With equipment** and **Without equipment**. A home gym is equipment.
- Running, cycling, walking, yoga, Pilates stay.
- Recommendation rules: yoga for mobility (as now). **Pilates is recommended
  for women only.** A man can tick it himself; it is never pre-ticked for him.
- OPEN: "Do you play any sports?" (basketball etc). Parked. Not built.

### 10. Intensity: "How hard do you want to go?"
Too much detail today. Three tiles: **Easy / Steady / All in**. No subtext on
the tiles. The details live behind the tile (a tap opens it), in one compact
line each, in this shape:
    Easy     1 to 2 days a week, about 30 minutes
    Steady   3 to 4 days a week, about 45 minutes
    All in   5 to 6 days a week, about 60 minutes
Sessions can outnumber days; say it in the detail, not on the tile. The
colours stay warm-to-hot but **no aggressive red**: "the last one makes me feel
stressed, I don't want to do it." Tone it to amber/orange at most. The robot's
reactive line stays ("I'll be the one telling you to take a day off").

### 11. Plan: "Your plan"
Keep the details, they are wanted: days, built for [goal], we pick each session,
change any of it later in Setup, about N minutes a session. Changes:
- Days are a RANGE, "5 to 6 days a week", never "6", because rest gets
  suggested.
- Plain English everywhere. No "Recomp", no "Focus: upper/lower". Say "lose fat
  and build muscle".
- Show the sub goals somewhere small.
- No subtext under the rows.
- Buttons: "Change something" / "This is my plan".

### 12. Hire me: the payment screen  (NEW position: before commit)
Do not surprise anyone with a price after they have committed. Right after the
plan:

The pitch, in the robot's voice, in substance: "That's your plan. If you hire
me as your personal trainer, I'll generate your workouts, track your progress,
keep your progress photos, follow up with you, and do the same for your
partner. $7.99 a month, your partner included. Or skip and look around first."

Two buttons: **Hire me, $7.99 a month** / **Skip, I'll look around first**.

Naming: this $7.99 tier is the STANDARD, not "Premium". Stop calling it
Premium in the app. "Premium" is reserved for a future higher tier. The plan
is called what the robot is: your personal trainer.

### 13. Commit: "This only works if you turn up."
Stays, after payment, shown to everyone, paid or skipped. BRIEF IT: it is too
long. Three short promises, one button "I'm committing to this", one ghost
"Let me change something".

### 14. Partner: NOT a page in onboarding
"Bring somebody with you" comes out of the sequence. "I want to discover the
app before I invite my partner." Instead:
- Intro page two says it (item 3).
- Home shows a visible, encouraging, SKIPPABLE prompt, more visible than the
  small plus circle it is today: "Bring your partner. They're included in your
  package." Skip hides it for the session, not forever. It comes back quietly.
- Sending the invite from that prompt uses the existing link flow.

## What is free and what is paid

Free (skip): sign in, the plan on screen, plan your own workouts, begin and log
a workout, the day counts on Home, invite a partner, the body figure showing
what you hit. Paid ($7.99, partner included): generate workouts, "what to
train next", Progress tracking and charts, progress photos, the trainer's
follow-ups. Every paid surface that a free account can reach shows the
"hire me" pitch in place, not a blank.

OPEN: ads on the free tier. One side: "it's free, accept ads, like YouTube".
Mo: "it will ruin the app". Not built. No ads at launch.

OPEN: a $4.99 code for the first fifty. Marketing, later.

## Do not lock me in the workout

"Open rules, not endpoints." Two things:
- Mid-workout, if I cannot get to the gym, let me switch what is left to a
  no-equipment version right there, without going to preferences and back.
  A bodyweight alternative for the remainder, one tap.
- If I leave a workout (a friend calls, I go to Home), I can come back and
  finish it. The paused screen exists; make sure every path back in lands on
  it and nothing archives an unfinished session.

## Voice
Every robot line will be spoken later. Write for the ear: short sentences, no
parentheses, nothing that only makes sense as text.
