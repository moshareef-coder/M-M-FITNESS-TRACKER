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
