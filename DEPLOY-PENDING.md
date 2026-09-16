# Waiting on you

Sessions write migrations and functions; the owner applies and deploys them.
Delete a line once it is done. Delete the file once it is empty.

## Done 2026-09-16

The clip notification, reporting and blocking are live. All three migrations
applied and verified, all three functions deployed:

- `20260916_clip_notification.sql`, `20260916_report_and_block.sql`,
  `20260916_report_alert.sql`
- `notify-clip`, `notify-report`, `expire-clips`

Verified in the database rather than assumed: both triggers present,
`content_reports` and `blocks` created, `block_person()` installed,
`live_clips.reported_at` added, one moderator configured.

Still worth doing once, with two phones, because a push path can be installed
correctly and still not deliver:

1. Mell sends a clip while your phone is locked. You should get
   **"Mell sent you a video"** in seconds, and tapping it plays the clip.
2. Play a clip, tap the flag, pick a reason. Your own phone gets
   **"Report: ..."**, and Setup, Admin, Reports shows it open.
3. Setup, Safety, Block. You should be unpaired and they cannot re-pair.


Also done later the same day: `delete-account` (was running code from 30 August,
two commits behind, and it is the account deletion path a reviewer tests) and
`generate-workout` were deployed, and `scripts/deploy-function.sh` no longer
hardcodes `verify_jwt: true`, which is what killed every notification between
03:33 and 09:00. All eight functions verified correct afterwards.

The App Review account is seeded and paired (`supabase/seed-app-review.sql`),
and reporting is reachable from Setup, Safety without needing a clip on screen.

## 1. TestFlight is still serving build 6

To upload a current build I need the **Issuer ID**: App Store Connect, Users
and Access, Integrations, App Store Connect API, the UUID at the top of that
page. The key and Key ID are already in place at
`~/.appstoreconnect/private_keys/AuthKey_4X3J46W9NL.p8`.

## 2. Optional: email alerts for reports

Push already alerts you and the queue in Setup, Admin, Reports is where a
report gets closed. Email starts working with no code change the moment these
two are set on the `notify-report` function:

```
RESEND_API_KEY=...
RESEND_FROM="Unio <reports@creativelab1.com>"
```

Needs a Resend account and creativelab1.com verified there.

## 3. In-app purchase, built but switched off

`PAYWALL_ON` in index.html is `false` and everything is unlocked. Nothing is
gated until all four of these are done, because a live paywall with no product
behind it is the main feature switched off for everybody, reviewer included.

1. **Paid Applications Agreement** in App Store Connect, Business. Banking and
   tax forms too. Nothing can be tested in sandbox until this is signed.
2. **Apple Small Business Program**, same place. 15% instead of 30%. Ten
   minutes, and the highest value form in the project.
3. **A RevenueCat account**, then give me the public SDK key.
4. Apply `supabase/migrations/20260916_subscriptions.sql`.

Then I install `@revenuecat/purchases-capacitor@11` (v13 needs Capacitor 8, we
are on 7), create the product, wire the webhook and flip the flag.

Agreed: $7.99 a month, covering both people in a pair, paid by one of them.
Premium is the generator, week planning, body impact, the progress analysis and
accent colours. Free is everything shared with a partner, manual logging, and
all of somebody's own history, weigh-ins and photos.

## 4. A domain

`PUBLIC_SITE` in index.html is `m-m-fitness-tracker.vercel.app`. That is what
people see when a session is shared and what a reviewer sees on the privacy
link from the sign in screen, inside an app called Unio. It is one constant now,
so it is a one line change once there is a domain.
