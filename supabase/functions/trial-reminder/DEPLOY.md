# Trial reminder: deploy steps

Keeps the paywall's "I'll remind you your trial is ending" true. One push, on
the date two days before Apple's free month ends, at a waking hour, only to
people still on the trial who have not cancelled. Never twice.

Nothing here is deployed or applied. Do the steps in this order.

## 1. Run the migration (SQL editor)

`supabase/migrations/20261007_trial_reminder.sql`

Adds five columns to `subscriptions`, the `trial_reminders` table, and the
hourly cron job `trial-reminder` at minute 7. The last select should read
`5, true, true, true`. Run it BEFORE step 2: the new webhook writes those
columns and would 500 on every event against the old table.

## 2. Deploy both functions

```
supabase functions deploy revenuecat-webhook --no-verify-jwt --project-ref stcpiovpjismhltklfdw
supabase functions deploy trial-reminder     --no-verify-jwt --project-ref stcpiovpjismhltklfdw
```

`--no-verify-jwt` on both: RevenueCat and pg_cron send a shared secret, not a
Supabase JWT, the same as the live webhook and send-nudges.

## 3. Secrets

Nothing new. Both functions use secrets the project already has:

- `REVENUECAT_WEBHOOK_SECRET` (webhook, already set for the live one)
- `CRON_SECRET` (must equal the vault `cron_secret`, same as send-nudges)
- `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_TOPIC` (push to iPhone)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (optional, web push)

Check with `supabase secrets list --project-ref stcpiovpjismhltklfdw`.

## 4. RevenueCat dashboard

Project Settings > Integrations > Webhooks. It should already exist; confirm:

- URL: `https://stcpiovpjismhltklfdw.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: the exact value of `REVENUECAT_WEBHOOK_SECRET`
  (the function also accepts it with a `Bearer ` prefix)
- Environment: send both Production and Sandbox events (sandbox is how you test)
- Events: all. The function ignores what it does not use.

## 5. Test with a sandbox purchase

Apple's sandbox shrinks a 1 month trial to about 5 minutes, so the real
48 hour window cannot be waited for. Test the two halves separately.

**a. The webhook records the trial.** On a TestFlight or Xcode build signed in
with a sandbox Apple ID, finish onboarding and tap Start free trial. Within a
minute:

```sql
select email, status, period_type, will_renew, environment, expires_at
  from subscriptions where email = '<tester email>';
```

Expect `active, TRIAL, true, SANDBOX`. Then in iOS Settings > App Store >
Sandbox Account > Manage, cancel it. Expect `will_renew = false` within a minute.

**b. The reminder picks the right people.** Pretend that row is two days out
(sandbox will overwrite it at the next renewal, which is fine):

```sql
update subscriptions
   set period_type = 'TRIAL', will_renew = true, status = 'active',
       expires_at = now() + interval '40 hours'
 where email = '<tester email>';
```

```
curl -s -X POST https://stcpiovpjismhltklfdw.supabase.co/functions/v1/trial-reminder \
  -H "Authorization: Bearer <CRON_SECRET>" -d '{"dry_run":true}'
```

The tester should be in `due` if their local time is 9:00 to 20:59. Drop
`dry_run` to really send it; run it again and expect `skipped` or nothing due,
which is the never-twice check.

**c. The words on a phone**, without using up anybody's real reminder:

```
curl -s -X POST .../functions/v1/trial-reminder \
  -H "Authorization: Bearer <CRON_SECRET>" -d '{"preview_email":"<your email>"}'
```

Clean up the test: `delete from trial_reminders where email = '<tester email>';`

## 6. Turn the promise on

Only after steps 1 to 4 are live: set `TRIAL_REMINDER_LIVE = true` in
`index.html` (the onboarding branch), so the paywall shows the reminder stop.

## Limits, said plainly

- **Nothing is sent with under 26 hours left.** Apple charges up to 24 hours
  before the end, and cancelling inside that window does not stop the charge.
  A late webhook or a person with no device token by then gets no reminder.
- **Needs notifications on.** Somebody who declined push gets nothing. They are
  left unclaimed, so turning push on before the cutoff still gets them one.
- **Only the payer is reminded.** The partner covered by the plan is not charged.
- **Trials bought before this ships** are invisible: their rows have no
  `period_type`, so they are never reminded. A new event (cancel, renew) fixes
  a row; a backfill would need the RevenueCat REST API.
- **app_user_id must be the email.** A purchase made before sign-in arrives as
  an anonymous RevenueCat id, the webhook rejects it (as it already does), and
  that person is not reminded.
- **The 30 day computed trial** in `20261004_premium_trial_30_days.sql` is a
  second, separate free month on `profiles.created_at`. If Apple now runs the
  trial, that migration should probably not be applied; decide before it is.
