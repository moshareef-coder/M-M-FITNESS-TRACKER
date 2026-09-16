# Notification plumbing audit, 2026-09-16

Scope: the delivery machinery only. Copy and rules live in
`mo-knowledge/NOTIFICATION-CATALOGUE.md` and are not touched here.

Everything below was measured against the live project
(`stcpiovpjismhltklfdw`) with read-only queries, or read out of the files
named. Where I am guessing I say so.

**Headline: the notification system is dark right now.** All four senders are
deployed with `verify_jwt = true` and every caller is pg_cron or a pg_net
trigger passing `Authorization: Bearer <CRON_SECRET>`, which is not a JWT. The
Supabase gateway rejects them with 401 before a line of function code runs.
This is not a scale risk or a future risk. It is happening every hour today.

---

## What would break first

Ranked by likelihood times silence. The whole point is that none of these
raise anything a person would see.

### 1. Every sender is behind `verify_jwt = true` and returns 401 to its own caller

CONFIDENT. Measured, not inferred.

- **File**: `scripts/deploy-function.sh` line 41,
  `verify_jwt\":true` hardcoded into the deploy metadata.
- **Condition**: any function invoked by pg_cron or a pg_net trigger, redeployed
  with that script. The caller sends `Bearer <CRON_SECRET>` (a base64 random
  string, not a JWT), the gateway answers
  `{"code":"UNAUTHORIZED_INVALID_JWT_FORMAT"}` 401, and the function never
  executes. The function's own `secretOk()` gate is never reached.
- **Live state**:

  | function | verify_jwt | last deploy | status |
  |---|---|---|---|
  | send-nudges | **true** | 2026-09-16 03:33 | dark since 04:00 |
  | notify-live-start | **true** | 2026-09-16 03:42 | dark |
  | notify-clip | **true** | 2026-09-16 08:51 | born dark, never delivered once |
  | notify-report | **true** | 2026-09-16 08:52 | born dark, never delivered once |
  | expire-clips | false | 2026-09-16 08:52 | working (the 200s in the log) |
  | expire-proofs | false | 2026-09-02 | working |

- **Evidence**: `net._http_response` has a 401 at exactly `:00` every hour from
  04:00 onward, which is `send-nudges`' `0 * * * *` slot, while the `*/15`
  `expire-clips` calls in between return 200. The first 401 is the first
  hourly run after the 03:33 redeploy.
- **What the user observes**: nothing. `cron.job_run_details` says
  `succeeded` 274 times, because pg_cron only reports that `net.http_post`
  was queued, not what came back. The dashboard is green. The evening nudge
  simply stopped arriving.
- **Aggravating factor**: `notify_live_session_start()` claims the `nudge_log`
  row **before** the http_post
  (`supabase/migrations/20260906_live_start_nudge.sql` lines 61-63, then 71).
  So each burnt call also consumes that recipient's once-a-day claim. The 401
  does not just fail, it spends the day's allowance.

Verify:

```bash
set -a; . ~/.cl1-deploy.env; set +a
curl -s "https://api.supabase.com/v1/projects/stcpiovpjismhltklfdw/functions" \
  -H "Authorization: Bearer $SB_TOKEN" \
  | python3 -c 'import sys,json;[print(f["slug"],f["verify_jwt"]) for f in json.load(sys.stdin)]'

curl -s -X POST "https://api.supabase.com/v1/projects/stcpiovpjismhltklfdw/database/query" \
  -H "Authorization: Bearer $SB_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select status_code, count(*), max(created) from net._http_response group by 1 order by 2 desc;"}'
```

The fix is one word in `deploy-function.sh`, but it must be per function:
`generate-workout` and `delete-account` are called from the app with a real
user JWT and need `verify_jwt = true`. The cron and trigger functions need
`false`, and their real gate stays `secretOk()`. There is no way to have both
from a script with a single hardcoded literal, so the script needs a per-slug
table or a flag.

### 2. `apns_tokens` is empty, so the iOS path has never carried a real notification

CONFIDENT. `select count(*) from apns_tokens` returns **0**. Two rows in
`push_subscriptions`, zero device tokens.

- **Condition**: `enablePush()` in `index.html` (around line 24040) is the
  only code path that ever writes an `apns_tokens` row, and `push.register()`
  is called from exactly one place, `awaitApnsToken()`, which only
  `enablePush()` calls. Nothing registers on launch.
- **What this means**: every piece of APNs machinery below (the two-gateway
  repair, the category declarations, the failure pruning) is untested against
  a real token in this database. It may all be correct. It has never been
  exercised here.
- **Consequence for the catalogue**: do not treat "APNs works" as established.
  It is asserted, not observed.

Verify:

```bash
curl -s -X POST ".../database/query" -H "Authorization: Bearer $SB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"select environment, failures, count(*) from apns_tokens group by 1,2;"}'
```

### 3. A token is registered once and never again, so rotation silently unsubscribes people

CONFIDENT about the code, SUSPICIOUS about the real-world rate.

- **File**: `index.html`, `awaitApnsToken()` / `push.register()` (single call
  site), reached only from `enablePush()`.
- **Condition**: APNs rotates a device token on restore-from-backup, some OS
  upgrades, and reinstall. The stored row keeps the old token. Apple answer
  `BadDeviceToken` for it, `sendApns` retries the other gateway, that fails
  too, and `send-nudges/index.ts` lines 249-256 delete the row.
- **What the user observes**: nothing. The row vanishes. The next time they
  open Setup, the toggle reads "Turn on reminders" again, which looks like they
  turned it off. Most people will not notice or will assume they did it.
- **Fix shape**: call `push.register()` on every launch when permission is
  already granted, and upsert the token that comes back. That is the standard
  pattern and its absence is the single most common cause of "push just stopped
  working for me" in wrapped apps.

### 4. Revoking notifications in iOS Settings is undetectable, and the app lies about it

CONFIDENT.

- **File**: `index.html`, `currentPushSub()` for the native branch returns a
  row from `apns_tokens`, and `renderPushToggle()` prints "On for this device."
  purely on the row existing.
- **Condition**: user grants in-app, then turns notifications off in iOS
  Settings. Apple still accept the push and return 200. Nothing fails,
  `failures` stays 0, `last_ok_at` keeps advancing.
- **What the user observes**: the app says reminders are on, `sent` counts go
  up in the function response, and no banner ever appears. This is the exact
  failure shape the brief describes.
- **Fix shape**: `push.checkPermissions()` on render, and show the real OS
  state rather than the row. Cheap, and it converts an invisible failure into
  a visible one.
- The opposite direction (deny, then enable later in Settings) is fine:
  `currentPushSub()` returns null, the button reads "Turn on reminders", and
  `requestPermissions()` on an already-granted app returns granted immediately
  so the tap works. The user has to find the button, but nothing is broken.

### 5. `notify-report` is the odd sender: no environment repair, no pruning, no failure counting

CONFIDENT. This is the "fix applied to three copies and not the fourth" hazard,
and it is already live.

`supabase/functions/notify-report/index.ts` lines 102-119. Compare with
`notify-clip/index.ts` lines 121-155, which is the correct shape.

| behaviour | send-nudges | notify-live-start | notify-clip | notify-report |
|---|---|---|---|---|
| writes repaired `environment` back | yes | yes | yes | **no** |
| `last_ok_at` / `failures = 0` on success | yes | yes | yes | **no** |
| deletes on `BadDeviceToken` / `Unregistered` | yes | yes | yes | **no** |
| increments `failures` on other errors | yes | yes | yes | **no** |

- **Condition**: the admin's token is mislabelled (which is the default state,
  see finding 7). `sendApns` still delivers, because it retries the other
  gateway, but the row is never corrected. Every report notification then costs
  a wasted round trip to the wrong gateway first, for ever.
- **Worse**: a genuinely dead admin token is never deleted and `failures` never
  climbs, so `failures=lt.5` never excludes it. It is retried on every report
  for the life of the row. `console.error("report push failed", e)` is the only
  trace, in function logs nobody reads.
- **What the user observes**: reports arrive slower or not at all, and the App
  Store 1.2 promise of "we look at every report within a day" has nothing
  behind it. There is 1 row in `platform_admins` and 0 rows in `apns_tokens`,
  so today this function can reach nobody at all.

### 6. `send-nudges` reads are unpaginated against a PostgREST `max_rows` of 1000

CONFIDENT about the cap, and it is currently far from binding.

- **Measured**: the project's PostgREST config is `"max_rows": 1000`.
- **File**: `supabase/functions/send-nudges/index.ts` lines 41-45, `q()` sends
  no `Range` header and no `limit`, and lines 76-83 and 130 use it for six
  unbounded selects.
- **Condition**: `profiles` passes 1000 rows, or the two-day `fit_entries`
  window passes 1000 rows (roughly 500 active users).
- **What breaks**: `profiles` truncating means users past row 1000 are never
  considered. That is silence, and silence is survivable. `fit_entries`
  truncating is worse: `trained` becomes incomplete, so the job believes people
  who trained did not. The evening nudge is gated on "you have not trained and
  your partner has", so a truncated `trained` set sends a nudge saying your
  partner trained to someone whose partner did not, or nags somebody who
  already trained. **A wrong notification, not a missing one.**
- **Today**: 7 profiles, 250 `fit_entries` rows. Not urgent. It becomes urgent
  the week a launch works.
- **This is also the O(users) answer to the brief's question**: yes, the job is
  O(users) and yes it re-reads the same rows every hour. Six full table scans
  24 times a day, regardless of whether anybody is at local 18:00 or 08:00. At
  7 users that is the right trade (the comment at line 74 says so honestly).
  At 10,000 users it is 240,000 profile reads a day to send a few hundred
  notifications. The fix when it matters is to compute the set of timezones
  currently at hour 18 or 8 first, and filter on those.

Verify:

```bash
curl -s "https://api.supabase.com/v1/projects/stcpiovpjismhltklfdw/postgrest" \
  -H "Authorization: Bearer $SB_TOKEN"
```

### 7. The environment repair is present in three senders and structurally impossible in the fourth

CONFIDENT.

The `apns.ts` doc comment (lines 113-126) is careful and correct: `sendApns`
returns the environment that actually worked, and the **caller** is responsible
for writing it back. Three callers do
(`send-nudges/index.ts:238`, `notify-live-start/index.ts:140`,
`notify-clip/index.ts:139`). `notify-report` throws the return value away
(line 104, no assignment).

The knock-on from `20260915_apns_environment.sql` line 18: the table default is
now `production`, and the client (`apnsEnvironment()` in `index.html`) falls
back to `production` when the `PushEnvironment` plugin is missing. Per the
CLAUDE.md Capacitor trap, a plugin the `packageClassList` scan misses reads as
`undefined` rather than throwing, so "the plugin is missing" is a live
possibility after any `cap sync` where
`scripts/register-native-plugins.mjs` did not run. A developer on a cable
install in that state gets a `development` token labelled `production`, and
only the retry path rescues it.

That retry path costs a full failed HTTPS round trip to Apple per send per
mislabelled token. Fine for one repair. Permanent in `notify-report`.

### 8. Sequential sends inside one function invocation, with no wall-clock budget

SUSPICIOUS, meaning I believe the mechanism and cannot size the risk yet.

`send-nudges/index.ts` lines 188-265: one `await` per subscription, plus one
or two more PATCH/DELETE round trips per device, all serial. At roughly 3
round trips of 150-300ms per recipient, a single timezone's 18:00 slot holding
a few hundred people exceeds the edge function wall clock. The run dies
mid-loop.

- **What the user observes**: the first N people get their nudge, everybody
  after N gets nothing, and because the next cron tick is hour 19 the 18:00
  window is gone for that day. It self-heals tomorrow, which is precisely why
  it would never be reported as a bug.
- Related, and already visible: `net._http_response` id 1393 is
  `Timeout of 5000 ms reached`. pg_net's default 5s timeout is shorter than
  this function's realistic runtime. That one does not kill the function (it
  keeps running), but it does mean the status code you would diagnose from is
  lost.

### 9. A single missed hour permanently loses that day's nudge for a whole timezone

CONFIDENT, and it is what turns finding 1 from "an outage" into "an outage
nobody could have noticed".

`send-nudges/index.ts` line 145 and 162 match `hour === 18` and `hour === 8`
exactly. There is no catch-up window. Any hour the job does not run (401,
timeout, cron blip, a deploy that takes the function down for ninety seconds)
silently deletes that day's evening nudge for everyone whose local time was 18
in that hour. Nothing records that it was skipped, because `nudge_log` only
records sends.

A `>= 18 and < 20` window plus the existing `nudge_log` daily unique index
would make this self-healing at no cost. The unique index is already doing the
work that makes a wider window safe.

### 10. `nudge_log` grows for ever

CONFIDENT, and low severity. Say it and move on.

`20260903_push_and_nudges.sql` lines 37-51 create the table and the unique
index. Nothing in the repo deletes from it. Grep confirms: no retention job, no
cron entry, no `delete from nudge_log` anywhere.

Today: 18 rows, 48 kB. At 10,000 users and three notification kinds a day that
is 11 million rows a year, and the unique index is on
`(lower(email), kind, sent_on)` so the index grows with it. The daily-claim
insert stays fast because it is a point lookup on that index, so this is a
storage and vacuum problem rather than a correctness one. It only becomes a
correctness problem if a future `count(*)`-style throttle is written against
this table.

`delete from nudge_log where sent_on < current_date - 30` on the existing daily
cron is the whole fix. Nothing reads a row older than yesterday.

### Considered and not a finding

- **Timezone handling.** `localParts()` falls back to UTC on a bad zone rather
  than throwing (lines 50-62), and the `% 24` guards the locale that formats
  midnight as "24". Two of seven profiles have a null timezone and will be
  nudged on UTC hours, which is the documented behaviour, not a bug.
- **The `nudge_log` claim-before-send ordering.** It is correct: claiming first
  is what makes a retry or an overlapping run safe, and the alternative loses
  that. The cost is that a failed send burns the day. Given finding 1 that cost
  is currently large, but the ordering is right and I would not change it.
- **`secretOk()`.** Constant time, length-checked first, correct.
- **Payload clamping.** Every free-text field is clamped before it reaches a
  payload with a hard size limit. Correct in all four senders.
- **The `found` check** after `insert ... on conflict do nothing` in
  `notify_live_session_start()`. Correct: `FOUND` is false when the conflict
  swallowed the insert.

---

## Every notification the system can currently send

Cross-checked every `category:` literal in `supabase/functions/*/index.ts`
against `registerNotificationCategories()` in
`ios/App/App/AppDelegate.swift` lines 23-76.

**No mismatches. All five categories used are declared, and all five declared
are used.** This is the one part of the system that is in good order.

| notification | sender | fired by | category | declared in AppDelegate | throttle | live status |
|---|---|---|---|---|---|---|
| Evening nudge | `send-nudges` | pg_cron `0 * * * *`, gated on local hour 18 | `EVENING_NUDGE` | yes, line 25, actions `start` / `later` | `nudge_log` unique on `(lower(email),'evening',sent_on)`, one per day, plus the exact-hour gate | last fired 2026-09-15, dark since |
| Coach digest | `send-nudges` | same job, gated on local hour 8 | `COACH_DIGEST` | yes, line 68, action `open` | `nudge_log` kind `digest`, one per day | **never fired once.** 0 rows of kind `digest` in `nudge_log` despite 1 coach group existing |
| Partner started training | `notify-live-start` | trigger `live_session_started` on `live_sessions` insert | `PARTNER_LIVE` | yes, line 37, actions `cheer` / `watch` | `nudge_log` kind `live_start`, one per recipient per day, claimed in the trigger | 15 claims logged, delivery dark since 03:42 |
| Partner sent a clip | `notify-clip` | trigger `live_clip_sent` on `live_clips` insert | `PARTNER_CLIP` | yes, line 49, action `watch` | 90-second burst suppression counted off `live_clips` itself. **No daily cap** | never delivered, deployed dark |
| Content report filed | `notify-report` | trigger `content_report_filed` on `content_reports` insert | `CONTENT_REPORT` | yes, line 60, action `open` | **none at all** | never delivered, deployed dark |

Two notes the catalogue needs:

- **The coach digest has never fired.** A coach group exists. Worth an hour of
  someone's time to find out whether the owner's timezone has ever put them at
  local 08:00 during an hour the job ran, or whether the roster filter at
  `send-nudges/index.ts:165` never matches. I did not chase it to ground.
- **The web push leg carries no category.** `webpush.sendNotification` sends
  only `{title, body, url, subtitle}`. Buttons are an APNs-only feature here.
  Any catalogue entry whose value depends on an action button is iOS-only.
- **`CONTENT_REPORT` has no throttle.** One notification per report row, and
  `content_reports` is user-writable. Not a retention notification, but if the
  catalogue adds anything else that is trigger-driven with no throttle, that is
  the shape to avoid.
- **Action identifiers all have handlers**: `start`, `later`, `cheer`, `watch`,
  `open` are each handled in `registerPushHandlers()` in `index.html`.
  `cheer` early-returns when `PARTNER_EMAIL` is unset, which after a cold
  launch from a notification is plausible. Minor, unverified.

---

## The shared apns.ts question

Measured first: all four copies are **byte identical today**.

```bash
md5 supabase/functions/*/apns.ts
# 1e47e2c8533f57e7249e23077238d59d, four times
```

So the drift has not happened in `apns.ts`. **It has already happened one layer
up**, in the per-function code that consumes it: `notify-report` is missing the
write-back, the pruning and the failure counting that the other three have
(finding 5). That is the same class of bug the brief is worried about, and
copying `apns.ts` did not cause it. Extracting `apns.ts` would not have
prevented it either, because the divergent code is the caller, not the module.

**Recommendation: keep the copies, and fix the real problem, which is that the
caller-side token bookkeeping is duplicated four times and already diverged.**

Reasons:

- Supabase edge functions deploy independently and `deploy-function.sh` uploads
  everything under one directory. A shared module means either a symlink (which
  `find -type f` in that script does not follow), a relative `../_shared/`
  import (which the flat `source/<rel>` upload shape breaks), or a build step.
  All three add a way for a deploy to ship a stale or missing file, which is a
  worse failure than the one being solved because it fails at runtime in
  production rather than at edit time.
- `apns.ts` is the stable part. It has changed twice and both changes were
  additive. The unstable part is the 25 lines of `try / send / patch / prune`
  around each call, and that is what should be extracted.
- Migration cost of extracting `apns.ts` alone: about two hours, mostly
  reworking `deploy-function.sh` to resolve and flatten a shared directory,
  plus a redeploy of all four functions. Real risk that a function ships
  without its dependency and 500s on first invocation.

What to do instead, in order:

1. Extend the copied `apns.ts` with a `deliverToUser(email, payload)` that owns
   the whole loop: read tokens at `failures < 5`, send, repair environment,
   reset `failures`, prune on `BadDeviceToken` / `Unregistered`, increment
   otherwise. One function, still copied four times, but now the duplicated
   thing is a file that a checksum test can compare.
2. Add a CI or gate step that fails when the four copies differ:

   ```bash
   md5 -q supabase/functions/*/apns.ts | sort -u | wc -l   # must be 1
   ```

   This is the cheap version of the shared module and it catches the exact
   hazard. Put it next to the engine gate in CLAUDE.md.
3. Revisit a real shared module only if a fifth sender appears.

---

## What must be true before adding ten more notifications

The catalogue should not be built until these are done, in this order. Items
1 to 3 are blocking. Nothing about copy or cadence matters while the gateway
is returning 401.

**Blocking:**

1. **Fix `verify_jwt`.** Per-slug in `scripts/deploy-function.sh`: `false` for
   `send-nudges`, `notify-live-start`, `notify-clip`, `notify-report`; `true`
   for `generate-workout` and `delete-account`. Then redeploy all four. Until
   this is done, every notification in the catalogue delivers zero.
2. **Prove one notification end to end on a real device.** `apns_tokens` has
   zero rows. Register a token, send one nudge, watch it land, and check the
   row came back with `failures = 0`, a fresh `last_ok_at`, and the
   `environment` the send actually used. Every claim in this document about the
   APNs path is currently unverified against reality.
3. **A delivery receipt that is not `console.log`.** Right now the only way to
   learn that a notification failed is to notice its absence. The catalogue
   will make that ten times harder, because ten kinds of silence look the same.
   Minimum viable: a `sent_at` / `failed_reason` column on `nudge_log`, written
   by the sender, and a one-line query that answers "what did we try to send in
   the last 24 hours and what happened". Without this, the next outage is found
   the same way this one was, by someone happening to look.

**Strongly recommended before ten, not before one:**

4. **Widen the hour gate** to a two-hour window and lean on the existing
   `nudge_log` unique index. Ten notification kinds means ten chances for a
   missed hour to silently lose a day.
5. **Register the token on every launch** when permission is already granted,
   and show the real OS permission state on the toggle rather than the
   existence of a row. Findings 3 and 4.
6. **Unify the caller-side token bookkeeping** and add the `md5` equality gate.
   Ten notifications across four functions with the bookkeeping copied by hand
   is how `notify-report` happened.
7. **Paginate `q()`** in `send-nudges`, or add an explicit
   `Range: 0-9999` and a loud error when the response is exactly at the cap.
   The `fit_entries` truncation sends wrong notifications, not missing ones.
8. **A `nudge_log` retention delete** on the existing daily cron.

**A rule for the catalogue itself:** every new notification needs a named
throttle backed by a database constraint, not by code. `nudge_log`'s unique
index is the pattern and it is the reason the once-a-day rule has never been
violated even with an hourly job and a trigger both writing to it. The 90
second clip window is the weaker pattern (a count, racy under concurrency) and
the report alert has nothing at all. Ten more of the third kind is how the app
ends up buzzing someone six times in a minute.

---

## Verdict

The design is better than the state. `apns.ts`, the two-gateway repair, the
`nudge_log` claim-before-send, the category declarations and the payload
clamping are all correct and carefully reasoned, and the comments explain why
rather than what. I found no fault in the thinking.

What is wrong is operational, and it is total: a deploy script with one
hardcoded boolean has taken every sender off the air, and nothing in the system
was capable of saying so. `cron.job_run_details` reads `succeeded` 274 times
for a job whose every invocation was rejected at the door.

Do not add ten notifications to this. Add observability to it, fix the one
boolean, prove one notification arrives on one phone, and then the catalogue
has something to stand on.
