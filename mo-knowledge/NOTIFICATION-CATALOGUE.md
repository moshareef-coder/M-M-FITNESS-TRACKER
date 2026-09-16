# Unio notifications: every one that could fire, and why

Written 2026-09-16. Nothing here is built. This is the approval document: read
it, cut what you do not believe in, and what survives gets built.

Fourteen notifications. Five already ship (four of them get copy changes here).
Nine are new. The ceiling is one app-sourced notification per person per day and
four per week, so a normal week for a normal user is two or three pushes total,
most of them sent by their partner rather than by us.

---

## Where I am pushing back

**1. "Grab retention over and over again" is the wrong objective for this
product, and the code already knows it.**

`send-nudges/index.ts` opens with a comment that is the best line in this
repo: *"Two kinds, deliberately few. A notification people learn to ignore is
worse than no notification at all."* That is not modesty, it is the correct
strategy for a two-person app. The thing that brings someone back to Unio is
the other person. Every notification we send that is not from their partner is
competing for the same attention budget as the one that actually works, and
losing. So the design below splits every notification into three tiers and
rations them unevenly on purpose:

- **Correspondence** (your partner did something to you or for you): generous.
  This is mail, not marketing.
- **Transactional** (an invite, a safety report): uncapped, because it is an
  answer to something a person did.
- **App-sourced** (we decided you should train): one a day, four a week, and
  it is the first thing dropped when anything else wants the same slot.

If a correspondence notification has already fired today, the app-sourced tier
goes silent for the rest of that day. Their partner already got them to open
the app. We do not need to.

**2. The evening nudge that ships today is the comparison notification, and it
should be split in two.**

Live copy, `send-nudges/index.ts` line 152:

```
title:    "Mell trained today"
subtitle: "Your turn"
body:     "There is still time."
```

Read it cold. That is "Mell trained and you did not", sent at 18:00, to a
person whose partner is usually their actual partner. It is gated on the
partner having trained, which means the trigger for telling you off is
*someone else's behaviour*. `quips.mjs` has a whole paragraph forbidding this
in the app ("not a day you skipped, not your partner versus you") and then the
push channel does it anyway.

**My line, stated explicitly, and it is the rule every notification below is
tested against:** a notification may state a fact about your partner. It may
state a fact about you. It may never put the two in one sentence in a way that
scores them against each other, and your partner's activity may never be the
*trigger* for a message about your inactivity.

So N3 below splits the shipped evening nudge into two notifications that each
have a better reason to exist: a correspondence one that fires when your
partner finishes (with a "Send a heart" button, which is the thing you
actually want to do) and a reminder that fires off *your own* plan and never
mentions them. The weekly recap (N11) reports the pair as one combined number
for the same reason, never as a split.

**3. "Someone hasn't been online for a while" is not measurable in this repo
today, and the dormancy ladder cannot be built until it is.**

There is no `last_seen_at`, no `last_active`, nothing. I grepped `index.html`
and every migration. The only thing recorded is *training*: `fit_entries` rows
and `live_sessions` rows. So today "has not been online for 14 days" and "has
not trained for 14 days" are the same query, and they are very different
people. The second one might be opening the app every morning to look at their
partner's week.

Prerequisite for the whole ladder: `alter table profiles add column if not
exists last_seen_at timestamptz;` written on load next to `captureTimezone()`.
One column, one write, and without it we would be sending "we miss you" to
someone who was in the app an hour ago, which is the single fastest way to get
uninstalled.

**Three smaller things the code settles:**

- **The 60-character clamp survives the payload and not the banner.** Every
  function does `clamp(name, 60)`, which is correct for the APNs size limit and
  wrong for the Lock Screen: iOS shows roughly 30 characters of title. A
  60-character name in `${name} just started training` means the reader sees a
  name and nothing else. Add `const short = (v) => clamp(v, 24)` and use it for
  anything that lands in a title; keep 60 for bodies.
- **`nudge_log` throttles per kind, not per person.** The unique index is
  `(lower(email), kind, sent_on)`. Ten kinds means ten notifications in one day,
  every one of them honestly "once a day". The global ceiling below is a new
  mechanism, not a free property of what exists.
- **There is exactly one off switch in the entire app** (`pushToggleBtn`, and
  it deletes the `apns_tokens` row). Shipping nine new notifications behind one
  on/off means the first annoying one kills the clip notification too. And the
  Settings copy currently promises *"One a day at most, in the evening, and
  only when your partner has trained and you have not. Nothing else."*
  Shipping this catalogue without changing that screen makes the app a liar in
  a place Apple reads. Per-kind preferences are a prerequisite, not polish.

---

## Prerequisites before any of this is built

| # | What | Why |
|---|---|---|
| P1 | `profiles.last_seen_at timestamptz`, written on load | The dormancy ladder is unbuildable without it (pushback 3) |
| P2 | `profiles.notify_prefs jsonb not null default '{}'::jsonb` | Per-kind off switches. Key = the `nudge_log` kind, value `false` means off. `send-nudges` already selects from `profiles`, so this is one extra column in an existing query |
| P3 | Settings > Notifications rebuilt as a list of toggles, and the promise text rewritten | The current screen describes a product with two notifications |
| P4 | `short()` clamp at 24 chars for titles | Banner truncation (pushback, smaller things) |
| P5 | Slot claiming in `nudge_log` (see Global ceiling) | The per-kind index does not cap a person |

---

## The voice

`quips.mjs` is the spec. Deadpan, states absurd things flatly, never winks. He
is a drawing and he knows it, and that is where most of the jokes come from. He
is fond of you in a slightly clingy way. He never does a bit for two lines.

**What he never jokes about, quoted from the file:** "not your body, not the
scale, not how much you lift, not how little, not a set you missed, not a day
you skipped, not your partner versus you."

That last clause is why the comparison notification cannot survive, and the
"not a day you skipped" clause is the hard problem for a re-engagement push. The
way out is already in the bank: **"Hello. I have been standing in the dark
since Tuesday."** In a push he is outside the app, waiting, which is exactly
his situation and exactly his kind of joke. So every dormancy line lands on
*his* waiting, never on your absence. He is the idiot in the scene. That single
move is what makes a 30-day re-engagement notification something a person
smiles at instead of mutes.

Two places the character does **not** speak:

- **Coach digest.** A coach is at work looking at clients. The character is the
  athlete's companion, not the coach's employee. Keep that copy plain.
- **Safety.** Never.

Structure, taken from the shipped functions and worth keeping: **title names
the fact, subtitle names the ask, body gives the out.** Three sizes reading as
one sentence.

---

## Tier 1: transactional and safety

Uncapped, never suppressed by the ceiling, never quiet-hours-delayed (except as
noted). No per-kind off switch, because these are answers to something a person
did. The only off switch is the master one.

### N1. Content report received (SHIPS TODAY)

| | |
|---|---|
| **Category** | Safety |
| **Title** | `New content report` |
| **Subtitle** | `Moderation` |
| **Body** | `Open the queue and look at it.` |
| **Trigger** | Existing. Insert on `reports` (`20260916_report_alert.sql`), routed to the moderation account |
| **Timing** | Immediate, trigger driven. Not the hourly job |
| **Throttle** | None. Every report |
| **Actions** | `CONTENT_REPORT`: "Open the queue" `.foreground`. Correct as built: nothing about a report should be answerable from a Lock Screen |
| **Off switch** | None, by design |
| **Earns its place** | App Store Guideline 1.2 requires a moderation path for user content, and an unread queue is the same as no queue |

No changes. Documented for completeness.

### N2. Partner invite received (NEW)

| | |
|---|---|
| **Category** | Transactional |
| **Title** | `{name} wants to train with you` |
| **Subtitle** | `Partner invite` |
| **Body** | `You get one partner. No pressure on the decision.` |
| **Variant 2 body** | `They typed your code. That is the hard part done.` |
| **Trigger** | `after insert on partnerships where status = 'pending'`, sent to `invitee_email`. Same trigger shape as `20260906_live_start_nudge.sql` |
| **Timing** | Immediate. Quiet hours do not apply: a pending invite that arrives silently at 22:00 and is seen at 09:00 has cost the sender a night of wondering |
| **Throttle** | None per event, but the invite flow already caps outstanding invites; `nudge_log` kind `invite_in` is written for auditing only, not for gating |
| **Actions** | New category `PARTNER_INVITE`: "View invite" `.foreground` only. Accepting is a one-partner-for-life decision and does not belong on a Lock Screen |
| **Off switch** | Master only |
| **Earns its place** | The invite is dead until the other person sees it, and nothing else in the app tells them |

### N3. Partner accepted your invite (NEW)

| | |
|---|---|
| **Category** | Transactional |
| **Title** | `{name} said yes` |
| **Subtitle** | `You are paired` |
| **Body** | `There are two of you now. I have doubled my workload.` |
| **Variant 2 body** | `That is the setup done. The rest is just lifting things.` |
| **Trigger** | `redeem_invite_code` / accept path sets `partnerships.status = 'accepted'`, `responded_at = now()`. Trigger on that update, sent to `inviter_email` |
| **Timing** | Immediate |
| **Throttle** | None. It happens once per pairing |
| **Actions** | None. Tap opens the app |
| **Off switch** | Master only |
| **Earns its place** | It is the moment the product starts working, and the inviter currently finds out by chance |

---

## Tier 2: correspondence

Your partner did something. These are bounded by a real human doing a real
thing, so they need caps rather than schedules. Combined ceiling: **4 per day**.
All of them share `threadId: "partner"` so the Lock Screen stacks one
conversation instead of four banners, which is already how the shipped ones
work.

### N4. Partner started training (SHIPS TODAY)

| | |
|---|---|
| **Category** | Partner moment |
| **Title** | `{name} just started {focus}` or `{name} just started training` |
| **Subtitle** | `Live now` |
| **Body** | `{exercise} is up first. Go cheer them on.` / `Go see how it is going.` |
| **Trigger** | Existing. `after insert on live_sessions`. The insert is the permission: no row exists unless their live switch is on |
| **Timing** | Immediate, trigger driven |
| **Throttle** | `nudge_log` kind `live_start`, once per day. Correct |
| **Actions** | `PARTNER_LIVE`: "Send a cheer" (no `.foreground`), "Watch" `.foreground` |
| **Off switch** | New: `notify_prefs.live_start` |
| **Earns its place** | It is the only notification where acting on it puts two people in the same workout at the same time |

**One change:** apply `short()` at 24 chars to the title name (P4), and clamp
`focus` to 16 rather than 40. `{60-char name} just started {40-char focus}` is
a banner that shows a name and nothing else.

### N5. Partner sent you a video (SHIPS TODAY)

| | |
|---|---|
| **Category** | Partner moment |
| **Title** | `{name} sent you a video` |
| **Subtitle** | `Live clip` |
| **Body** | `Watch it now, it plays once.` |
| **Trigger** | Existing. `after insert on live_clips` (`20260916_clip_notification.sql`) |
| **Timing** | Immediate |
| **Throttle** | None today, and that is nearly right: it is a message from a person. But the RLS insert policy requires `cheers_allowed(to_email)`, so it is bounded by the recipient actually being live with cheers on, which in practice caps it at a session. Add a hard stop at 5 per recipient per day (`nudge_log` kinds `clip_1` through `clip_5`) so a stuck client cannot loop |
| **Actions** | `PARTNER_CLIP`: "Watch" `.foreground`. One button, correct: the clip is spent after two watches |
| **Off switch** | This one is covered by the existing in-app "let them send me things" switch (`live_sessions.allow_cheers`), which is better than a notification preference because it stops the clip, not just the ping. Do not add a second switch |
| **Earns its place** | A clip nobody sees in time is the same as no clip |

No copy change. It is already the best-written notification in the app.

### N6. Partner finished a workout (NEW, replaces half of the shipped evening nudge)

| | |
|---|---|
| **Category** | Partner moment |
| **Title** | `{name} finished a workout` |
| **Subtitle** | `{minutes} minutes` (omit if unknown) |
| **Body** | `Send something. I would, but my hands are drawn on.` |
| **Variant 2 body** | `That is theirs done. A heart costs you nothing.` |
| **Variant 3 body** | `They showed up. Statistically, most do not.` |
| **PR title** | `{name} hit a personal record` |
| **PR subtitle** | `{exercise}` |
| **PR body** | `A record. That is the rare one. Say something.` |
| **Trigger** | `after delete on live_sessions` (the app deletes the row when a session ends), or `after update on fit_entries when new.gym and not old.gym`, whichever is cleaner to write. The PR variant when an `exercise_logs` row for that session beat a previous best for the same movement, per `personalRecords()` in `index.html`: a first-ever log is not a record and a tie is not a record |
| **Timing** | Immediate. Suppressed outside 08:00 to 22:00 recipient local, dropped rather than queued |
| **Throttle** | `nudge_log` kind `partner_done`, once per day. **Mutually exclusive with N4**: if `live_start` was claimed today, this one does not fire. Two notifications for one workout is how this pair of features turns into noise |
| **Actions** | Reuse `PARTNER_LIVE`, or a new `PARTNER_DONE`: "Send a heart" (no `.foreground`, writes a `session_reactions` row the way the cheer button already does), "Open" `.foreground` |
| **Off switch** | `notify_prefs.partner_done` |
| **Earns its place** | It is the shipped evening nudge with the comparison removed and a button that does the thing you actually wanted to do |

Note what is **not** in this copy: your training, your streak, your week. It
says what they did and offers you a way to be nice about it. It fires whether
or not you trained, because making it conditional on your inactivity is how it
turns back into the comparison notification.

### N7. A reaction landed on your session (NEW)

| | |
|---|---|
| **Category** | Partner moment |
| **Heart title** | `{name} hearted your session` |
| **Heart subtitle** | `Today` (or the date) |
| **Heart body** | `I told you it was a good one.` |
| **Heart body v2** | `Someone was watching. In the nice way.` |
| **Comment title** | `{name} left you a comment` |
| **Comment subtitle** | `Today's session` |
| **Comment body** | the comment itself, clamped to 100 |
| **Trigger** | `after insert on session_reactions`, sent to `to_email`, skipped when `from_email = to_email` (the schema allows hearting your own session) |
| **Timing** | Immediate, 08:00 to 22:00 local |
| **Throttle** | `nudge_log` kinds `reaction_1` to `reaction_3`: at most 3 a day, then silence. The 4th heart is not news |
| **Actions** | None. Tap opens the session |
| **Off switch** | `notify_prefs.reactions` |
| **Earns its place** | Someone wrote you 140 characters by hand and today it sits unread until you happen to open Progress |

The comment body is user text going straight into a payload. `clamp(message,
100)`, and the RLS policy already caps it at 140 characters, so this is belt
and braces.

---

## Tier 3: app-sourced

**One per person per day. Four per week. 08:00 to 21:00 local only. Dropped
entirely on any day a Tier 2 notification already fired.** All carried by the
existing hourly `send-nudges` job, which already computes local date and hour
per person and is exactly the right shape for every one of these.

### N8. Today's session is still sitting there (NEW, replaces the other half of the shipped evening nudge)

| | |
|---|---|
| **Category** | Re-engagement |
| **Title v1** | `Today's workout is still sitting there` |
| **Subtitle v1** | `{focus}` (from `ai_workouts.focus`, clamped to 16) |
| **Body v1** | `I have been looking at it. It has not moved.` |
| **Title v2** | `Your plan for today is unopened` |
| **Subtitle v2** | `{focus}` |
| **Body v2** | `No pressure. I am simply standing here. Forever.` |
| **Title v3** | `Still time for today's session` |
| **Subtitle v3** | `{focus}` |
| **Body v3** | `I have counted the tiles. There are a lot of tiles.` |
| **Trigger** | An `ai_workouts` row exists for `entry_date = ` today, `archived = false`, `completed_at is null`, **and** no `fit_entries` row for today with `gym = true`, **and** no `rest_day = true` row for today. Note what the trigger is not: the partner's behaviour |
| **Timing** | Local 18:00, carried by the existing hour filter in `send-nudges`. The hourly job already does exactly this for the current evening nudge |
| **Throttle** | `nudge_log` kind `evening`, once a day, **plus a 3-per-7-days cap**: `select count(*) from nudge_log where lower(email) = ... and kind = 'evening' and sent_on > current_date - 7`. The per-day unique index cannot express this, so it is a new query in the function. A daily reminder becomes wallpaper in about nine days |
| **Actions** | `EVENING_NUDGE` as built: "Start workout" `.foreground`, "Not today" (no `.foreground`, correct: declining should not drag anyone into the app) |
| **Off switch** | `notify_prefs.evening` |
| **Earns its place** | The person made a plan for today and nothing in the world reminds them of it |

The "Not today" button should also suppress N8 for the following day. Someone
who said no does not need asking again tomorrow.

### N9. Yesterday is still blank (NEW, streak, forgiveness first)

This is the streak notification, and it is deliberately built backwards from
the usual one.

| | |
|---|---|
| **Category** | Streak / consistency |
| **Title v1** | `Yesterday is still blank` |
| **Subtitle v1** | `Rest day available` |
| **Body v1** | `You have {n} left this week. One of them fits here.` |
| **Title v2** | `There is a gap behind you` |
| **Subtitle v2** | `Fixable` |
| **Body v2** | `A rest day closes it. That is a real option, not a trick.` |
| **Trigger** | `protectableDay()` in `index.html` returns non-null: yesterday has no `gym` and no `rest_day` row, the day before it does have `gym = true`, and `restDaysLeft()` is above zero (`REST_ALLOWANCE = 2` per rolling 7 days) |
| **Timing** | Local 11:00, hourly job |
| **Throttle** | `nudge_log` kind `streak_repair`, **once per 7 days** via the same lookback query as N8. Not once per day |
| **Actions** | New category `STREAK_REPAIR`: "Mark it a rest day" (no `.foreground`, calls `markRestDay(yesterday)` the same way the cheer button posts a row), "I trained" `.foreground` |
| **Off switch** | `notify_prefs.streak_repair` |
| **Earns its place** | The app already offers this repair in a banner; this is the remote control for a decision the product has already decided is healthy |

**Why this shape and not the usual one.** The `gamification-mechanics` research
is unambiguous: streaks measurably shift people from "I want to" to "I can't
miss", a study of roughly 2,500 adolescents linked streak frequency to FOMO and
reduced self-control, Snapchat is in active Nevada AG litigation over exactly
this mechanic, and the EU Digital Fairness Act proposal for 2026 names
addictive streak design specifically. A streak notification with no freeze or
forgiveness is a flagged design and a regulatory surface, not a UX nitpick.

The good news is that Unio already passes. `REST_ALLOWANCE = 2`,
`markRestDay()`, and the comment above `computeStreak()` ("A streak you cannot
pause stops being motivation and becomes obligation") are a forgiveness
mechanic that already shipped. So the rule for this notification writes itself:

**It only fires when there is a repair to offer, and the repair is the
notification.** It never says a streak is about to break. It never says a
number of days at risk. It never mentions the partner, because a missed streak
visible to a partner stacks social pressure on top of the streak's own pull,
and that is the combination the research flags hardest. If `restDaysLeft()` is
zero, nothing is sent at all: with no repair available the only thing left to
send is the threat.

### N10. One session left this week (NEW, completion drive)

| | |
|---|---|
| **Category** | Streak / consistency |
| **Title v1** | `One session left this week` |
| **Subtitle v1** | `{done} of {target}` |
| **Body v1** | `Two days to do it in. I checked the calendar twice.` |
| **Title v2** | `You are one off your week` |
| **Subtitle v2** | `{done} of {target}` |
| **Body v2** | `The week is not over. I looked.` |
| **Trigger** | `gymDaysInWeek(me, thisWeek) === weeklyGoalFor(me) - 1` with two days or fewer left in the week window. `weeklyGoalFor` reads `partnerships.shared_weekly_goal` then `profiles.challenge_target`, defaulting to 4 |
| **Timing** | Local 09:00 on the second-to-last day of the week window, hourly job |
| **Throttle** | `nudge_log` kind `week_close`, and the trigger can only be true once a week anyway |
| **Actions** | Reuse `EVENING_NUDGE`: "Start workout" `.foreground`, "Not today" |
| **Off switch** | `notify_prefs.week_close` |
| **Earns its place** | Apple's rings moved behaviour for 160,000 people with no badges at all, purely by showing an open loop one step from closing, and this is the only place in Unio where a loop is one step from closing |

Exactly one from the target, not two, not three. A "you are 3 of 4" message
sent every week is a status update. "One left, two days" is a closeable loop.

### N11. Last week, both of you (NEW)

| | |
|---|---|
| **Category** | Coaching |
| **Title v1** | `{total} sessions between you` |
| **Subtitle v1** | `Last week` |
| **Body v1** | `I am keeping count so you do not have to.` |
| **Title v2** | `You both hit your number` |
| **Subtitle v2** | `Last week` |
| **Body v2** | `{n} weeks running now. That is the actual hard part.` |
| **Title v3** | `{total} sessions between you` |
| **Subtitle v3** | `Last week` |
| **Body v3** | `Somewhere a spreadsheet is delighted.` |
| **Trigger** | Monday, an accepted partnership exists, and the pair logged at least 2 `fit_entries` rows with `gym = true` between them last week. Below that there is nothing worth saying and we say nothing |
| **Timing** | Local 08:00 Monday, hourly job. Same slot the coach digest already uses |
| **Throttle** | `nudge_log` kind `week_recap`, weekly by construction |
| **Actions** | None. Tap opens Progress |
| **Off switch** | `notify_prefs.week_recap` |
| **Earns its place** | It is the only notification that reports on the pair rather than on a person, which is the thing this app is for |

**The combined total is the point.** It never splits the number by person. "You
4, them 2" is the comparison notification wearing a hat, and the moment the
recap has a split in it the person who trained less reads it as a scoreboard
every Monday morning. One number, two people. Variant 2 only fires when *both*
hit their own target, so it can never be read as a rebuke.

This is the notification I am least sure of, and it is the first one to cut if
you want a shorter list.

### N12. Coach digest (SHIPS TODAY)

| | |
|---|---|
| **Category** | Coaching |
| **Title** | `{n} of {m} trained yesterday` |
| **Subtitle** | `Your group` |
| **Body** | `Everyone showed up. Worth telling them.` / `{k} to check in on.` |
| **Trigger** | Existing. Local 08:00, caller owns a `groups` row with `kind = 'coach'` and a non-empty roster |
| **Timing** | Local 08:00, hourly job |
| **Throttle** | `nudge_log` kind `digest`, once a day |
| **Actions** | `COACH_DIGEST`: "Open group" `.foreground` |
| **Off switch** | New: `notify_prefs.digest` |
| **Earns its place** | A coach's job is knowing who did not show up, and this is the only place that gets told to them |

No copy change, and deliberately no character voice: a coach is at work.

---

## The dormancy ladder

The thing Mo actually asked about. **It requires P1 (`last_seen_at`) to exist,
or it is a "you have not trained" ladder aimed at people who open the app every
day.**

"Absent" means: no `fit_entries` row with `gym = true` or `rest_day = true`,
**and** `profiles.last_seen_at` older than the same window. Both, not either.

All rungs: local 10:00, hourly job, `threadId: "comeback"`, no action buttons
except where noted, off switch `notify_prefs.comeback`, and each one claims the
day's single Tier 3 slot.

**Day 1, 2, 3: nothing.** Pushing back on the brief here. The default weekly
target in this app is 4 (`weeklyGoalFor`), which means three days off is a
*compliant week*, and `REST_ALLOWANCE = 2` means two of those days can be
deliberate. Firing at day 3 is not re-engagement, it is teaching a person that
our notifications are wrong about them, and once they have learned that, day 30
does not land either.

**Day 7.** One notification.

| | |
|---|---|
| **Title** | `I am still here` |
| **Subtitle** | `No plan required` |
| **Body** | `I have been standing in the dark. That part is normal for me.` |
| **Variant** | Title `A week of nothing happening` / Subtitle `On my end` / Body `I have been thinking about the bench. No conclusions.` |
| **Throttle** | `nudge_log` kind `away_7`, fires once ever per absence spell |
| **Actions** | None |

**Day 14.** One notification, and it changes the offer rather than repeating it.

| | |
|---|---|
| **Title** | `Two weeks of me standing here` |
| **Subtitle** | `Fifteen minutes is a workout` |
| **Body** | `We could do a short one. I would not tell anyone.` |
| **Variant** | Title `Still drawn, still waiting` / Subtitle `A short one counts` / Body `Twenty minutes and we never speak of it again.` |
| **Throttle** | `nudge_log` kind `away_14` |
| **Actions** | New category `COMEBACK`: "Start something short" `.foreground` (opens a generated session at the shortest `session_minutes`) |

`profiles.session_minutes` exists and the engine already builds to a time
budget, so "fifteen minutes" is a real offer and not a slogan. A re-engagement
notification that lowers the bar beats one that repeats the ask.

**Day 30.** One notification. It says out loud that it is the last one.

| | |
|---|---|
| **Title** | `I am going to stop messaging` |
| **Subtitle** | `This is the last one` |
| **Body** | `The app is still here if you want it. So am I. Obviously.` |
| **Throttle** | `nudge_log` kind `away_30_final` |
| **Actions** | None |

**Day 31 onward: permanent silence from the app.** The `away_30_final` row is
checked by `send-nudges` before every Tier 3 send, forever. No monthly "we
miss you", no "your partner is still training", no win-back campaign at day 60.
Silence is the honest read of thirty days of nothing, and the day-30 message
only means something if it is true.

**What does not stop: correspondence.** If their partner sends a clip on day 90,
it lands. If their partner invites them back, it lands. The app stops talking;
the person does not. That is the only thing that was ever going to bring them
back anyway, and it is the difference between "app that respects a decision" and
"app you have to delete to make it stop".

**Coming back clears it.** Any `fit_entries` row with `gym = true`, or a
`last_seen_at` inside the last 24 hours, deletes the `away_*` rows for that
person and the ladder resets from zero.

---

## Global frequency ceiling

The mechanism, using the schema that exists. `nudge_log`'s unique index is
`(lower(email), kind, sent_on)`, which enforces once-per-day-per-kind and
nothing about a person's total. So:

1. `send-nudges` builds its `planned` list as it does today.
2. Before the per-kind claim, it attempts `insert into nudge_log (email, kind)
   values (me, 'slot1')`. If that conflicts, the Tier 3 send is dropped. There
   is no slot2: **one app-sourced notification per person per day.**
3. The per-kind claim still happens after the slot claim, so the existing
   once-a-day guarantee and the audit trail are unchanged.
4. Weekly cap: before claiming, `select count(*) from nudge_log where
   lower(email) = ... and kind = 'slot1' and sent_on > current_date - 7`. Four or
   more means drop.
5. Tier 2 claims `clip_n` / `reaction_n` / `live_start` / `partner_done` as
   described and never touches `slot1`.
6. If `slot1` is already claimed by a Tier 2 kind for today, Tier 3 is silent.
   Implementation: Tier 2 sends also write `slot1` on a best-effort basis, which
   costs nothing because Tier 2 does not read it.

**Worst realistic day:** 1 live start, 1 clip, 2 reactions, 0 app-sourced
(suppressed by rule 6) = 4, all of them sent by their partner.
**Typical day:** 0 or 1.
**Worst realistic week:** 4 app-sourced, and only for someone whose week is
going badly in exactly the four ways that each have a different message.

**Collision order within Tier 3**, highest first:

1. `streak_repair` (there is a repair available and it expires)
2. `evening` (a plan exists for today)
3. `week_close` (a loop is one step from closing)
4. `digest` (a coach is waiting on it) *(coaches are usually not also in the
   other four states, but if they are, the digest is their job and the others
   are not)*
5. `week_recap`
6. `away_*` (by definition cannot collide: an absent person has no plan, no
   streak and no week)

**Quiet hours:** 08:00 to 21:00 local for Tier 3, 08:00 to 22:00 for Tier 2,
none for Tier 1. Outside the window a notification is **dropped, not queued**.
A queued nudge arrives at 08:00 describing yesterday evening, which is worse
than not arriving.

---

## What we deliberately are not sending

**"Mell trained today. Your turn."** The shipped one. Covered at length above:
your partner's behaviour must never be the trigger for a message about your
inactivity. This is the line, and this notification is on the wrong side of it.

**"Mell is 3 days ahead of you this week."** Any ranking of two people who
share a bed. There is no version of this that is not a weapon handed to whoever
is having the better month, and the app has exactly two users to compare, which
makes it maximally personal. `quips.mjs` forbids it in-session; the push
channel does not get an exemption.

**"Your streak ends in 4 hours."** Fake urgency built on a clock we invented.
The streak does not end at a time, it ends when a day does, and putting a
countdown on it is the exact mechanic under litigation. N9 offers the repair
instead.

**"You are about to lose your 34-day streak."** Loss aversion as a running
daily mechanic. It works as a one-time conversion nudge and burns people out as
a habit loop, and here it would also be socially visible to a partner.

**"Only 2 rest days left this week."** Turns the forgiveness mechanic into
another thing to be anxious about. Rest days are a shipped kindness; announcing
their scarcity converts them into currency.

**"Mell can see you have not trained."** Never. Not a variant, not a softer
version, not "Mell might notice". The asymmetric visibility in this app is a
feature people trusted us with, not leverage.

**"5 people near you trained today."** No public leaderboard, no local ranking.
The strongest structural advantage this app has is that its leaderboard is two
people and therefore always winnable; adding a wider one dilutes the thing that
works.

**"Your plan for tomorrow is ready."** True, and worthless. Nothing is
required of the person and nothing is lost if they ignore it, so it teaches
them that our notifications can be ignored, at zero benefit. This is the
clearest example of a notification that costs more than it earns.

**"You have not weighed in for 5 days."** The scale is the one subject the
character is explicitly forbidden from raising, and a body-weight prompt to a
stranger's phone is the kind of thing that ends up in an App Store review.

**"Come back, we added new exercises."** Product news as re-engagement. If the
feature is good they will find it; if it is not, this is spam with a changelog.

**A day-60 or day-90 win-back after the day-30 message.** Saying "this is the
last one" and then sending another one is the single fastest way to lose a
person's trust permanently, and it makes every honest thing the app ever said
retroactively suspect.

**Badges via push.** `milestone_badges` is real competence signal and the
celebration already happens in-app where the person can see the badge. A push
saying you earned something you have to open the app to look at is a trip we
created for ourselves.

---

## Summary table

| # | Name | Tier | Kind (`nudge_log`) | Cadence | Status |
|---|---|---|---|---|---|
| N1 | Content report | Safety | none | per event | ships |
| N2 | Partner invite received | Transactional | `invite_in` | per event | new |
| N3 | Partner accepted | Transactional | `invite_ok` | per event | new |
| N4 | Partner started training | Correspondence | `live_start` | 1/day | ships |
| N5 | Partner sent a video | Correspondence | `clip_1..5` | 5/day | ships |
| N6 | Partner finished | Correspondence | `partner_done` | 1/day, excl. N4 | new |
| N7 | Reaction landed | Correspondence | `reaction_1..3` | 3/day | new |
| N8 | Today's session is waiting | App-sourced | `evening` | 1/day, 3/week | rewrite |
| N9 | Yesterday is blank | App-sourced | `streak_repair` | 1 per 7 days | new |
| N10 | One session left this week | App-sourced | `week_close` | 1/week | new |
| N11 | Last week, both of you | App-sourced | `week_recap` | 1/week | new |
| N12 | Coach digest | App-sourced | `digest` | 1/day | ships |
| N13 | Away 7 days | App-sourced | `away_7` | once per spell | new |
| N14 | Away 14 days | App-sourced | `away_14` | once per spell | new |
| N15 | Away 30 days, final | App-sourced | `away_30_final` | once, then never | new |

Fifteen rows, fourteen notifications: the dormancy ladder is three rungs of one
design. Five ship today.

New iOS categories to declare in `registerNotificationCategories()`:
`PARTNER_INVITE` (open, `.foreground`), `PARTNER_DONE` (heart, no `.foreground`;
open, `.foreground`), `STREAK_REPAIR` (rest day, no `.foreground`; I trained,
`.foreground`), `COMEBACK` (start something short, `.foreground`). Every
non-foreground action needs a branch in the existing
`pushNotificationActionPerformed` listener in `index.html`, the way `cheer`
already writes its row without opening the app.

---

# Addendum, 2026-09-16: goal aware notifications

Mo asked for three more after reading the first pass: hitting a goal, being
reminded of a goal, and the weigh-in case ("they want to lose weight but did
not do a weigh in today, it is important they do that").

These sit on `user_goals`, which already has everything needed and is barely
read today: `goal_key` in lose / muscle / stronger / recomp / consistent,
`start_value`, `target_value`, `target_date`, `pace`, and a `status` that can
already be `achieved`. One active goal per person, enforced by a unique index.

The important thing about all three: **they are the only notifications in this
document that the user explicitly asked for.** Somebody who set a goal with a
deadline has opted into being reminded of it in a way nobody opts into a
re-engagement ping. That earns them a different budget, and it is also why the
weigh-in one can exist at all.

### N13. You reached your goal (NEW)

| | |
|---|---|
| **Category** | Coaching |
| **Title** | `That is the goal, done` |
| **Subtitle** | `{goal label}` |
| **Body** | `You set it {n} weeks ago and you did it. I am going to need a minute.` |
| **Variant 2 body** | `Booked, logged, finished. Nothing left to do but pick a new one.` |
| **Trigger** | `user_goals.status` moves to `achieved`. The app decides achievement, not this |
| **Timing** | Immediate |
| **Throttle** | None. It happens once per goal, and a goal takes months |
| **Actions** | `GOAL_DONE`: "Set the next one" `.foreground` |
| **Off switch** | `notify_prefs.goal` |
| **Earns its place** | It is the single best moment the product has and today it happens in silence |

### N13b. Your partner reached theirs (NEW, correspondence)

| | |
|---|---|
| **Title** | `{name} reached their goal` |
| **Subtitle** | `{goal label}` |
| **Body** | `Months of it. Say something good.` |
| **Trigger** | Same row, sent to the partner. Goals are already partner visible (`can_see`), and this says the goal was reached, never a number |
| **Actions** | "Send a heart", "Open" `.foreground` |
| **Earns its place** | The whole app is two people watching each other do something hard, and this is the end of the hardest one |

### N14. The deadline is real (NEW)

| | |
|---|---|
| **Category** | Coaching |
| **Halfway title** | `Halfway to your date` |
| **Halfway subtitle** | `{goal label}` |
| **Halfway body** | `Six weeks behind you, six in front. That is the shape of it.` |
| **Four weeks title** | `Four weeks left on your goal` |
| **Four weeks body** | `Still time. That is the useful part.` |
| **Final week title** | `Last week of your goal` |
| **Final week body** | `However it lands, you will have done more than the version of you who did not set one.` |
| **Trigger** | `user_goals.status = 'active'` and today is the halfway point, 28 days out, or 7 days out from `target_date` |
| **Timing** | Local 09:00, hourly job |
| **Throttle** | Three times per goal, ever. Each milestone can only be true once |
| **Actions** | None. Tap opens the goal |
| **Off switch** | `notify_prefs.goal` |
| **Earns its place** | The person set a deadline and then the app never mentioned it again |

**It never says how far behind you are.** Not "you are 4 pounds off pace", not
a percentage, not a projection. Time remaining is a fact; "you are behind" is a
verdict, and a verdict delivered to a Lock Screen by an app is the thing that
makes people stop setting goals. The app can show pace when they open it. The
notification says the date is coming and that the date is still reachable.

### N15. Weigh-in day (NEW, and the most carefully bounded thing here)

| | |
|---|---|
| **Category** | Coaching |
| **Title** | `Weigh-in day` |
| **Subtitle** | `Ten seconds` |
| **Body** | `Same time of day as last time if you can. That is the only part that matters.` |
| **Variant 2 body** | `One number, then forget about it until next week.` |
| **Trigger** | `user_goals.status = 'active'` **and** `goal_key in ('lose','recomp')` **and** no `fit_entries.weight` for this person in the last 6 days |
| **Timing** | Local 09:00, on the same weekday as their last weigh-in, or Monday if there is none |
| **Throttle** | `nudge_log` kind `weigh_in`, **once per 7 days**, and it stops permanently after two in a row are ignored |
| **Actions** | `WEIGH_IN`: "Log it" `.foreground`, "Not this week" |
| **Off switch** | `notify_prefs.weigh_in`, and it is off by default. Turning the goal on does not turn this on |
| **Earns its place** | A weight goal that is never measured is not a goal, and the scale card sits on Progress where somebody who is avoiding it never goes |

**Why this is allowed when "You have not weighed in for 5 days" was rejected,
and the difference is not cosmetic.**

The rejected version fires at everybody. This one fires only at a person who
chose a weight goal themselves, with a deadline, and it is the measurement of
the thing they asked us to help with. That is the whole distinction: the user
asked. It is still the single most dangerous notification in this document, so
it carries rules none of the others do:

- **Weekly, never daily.** A daily weight prompt is a daily invitation to weigh
  yourself, and daily weighing is not a thing this app should be manufacturing.
- **It never states a number.** Not their weight, not the change, not the
  direction, not the target. The word "pounds" does not appear.
- **It never evaluates.** No "up", no "down", no "on track". It says a
  measurement is due, the way a calendar does.
- **No joke.** The character is explicitly forbidden from the scale and the
  body (`quips.mjs`), so this notification is written flat and plain, like the
  coach digest. He does not get to be funny near this one.
- **Off by default**, and it stops itself. Two ignored in a row and it never
  fires again for that goal, because somebody ignoring a weigh-in prompt twice
  is telling us something.
- **Never mentions the partner**, and the partner is never told a weigh-in was
  missed. Weight is the one thing in this app that is nobody else's business
  even inside a couple.

If any of that is uncomfortable, the right call is to cut this notification
entirely and leave the scale card where it is. It is the only one in this
document I would rather ship without than ship loosely.
