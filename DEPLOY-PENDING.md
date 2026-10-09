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

## 1. Optional: email alerts for reports

Push already alerts you and the queue in Setup, Admin, Reports is where a
report gets closed. Email starts working with no code change the moment these
two are set on the `notify-report` function:

```
RESEND_API_KEY=...
RESEND_FROM="Unio <reports@creativelab1.com>"
```

Needs a Resend account and creativelab1.com verified there.

## 2. Point the app at trainwithunio.com (next build)

`PUBLIC_SITE` in index.html is still `m-m-fitness-tracker.vercel.app`, so shared
sessions and the privacy link from the sign in screen show the old domain inside
an app called Unio. trainwithunio.com has `/privacy` and `/terms` since
2026-10-02, so this is a one line change in the next build.

Done and removed 2026-10-02: the Issuer ID (it was already in
`scripts/release-ios.sh`, and the key reads App Store Connect fine), and the
in-app purchase setup (1.0 shipped with `PAYWALL_ON = true`).
