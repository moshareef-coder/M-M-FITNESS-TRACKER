# Waiting on you

Sessions write migrations and functions; the owner applies and deploys them.
Everything below is written, committed and tested as far as it can be tested
without a database. **None of it does anything until you run it.**

Delete a line once it is done. Delete the file once it is empty.

## 1. Apply the migrations, in this order

```bash
supabase db push
```

Or paste each into the SQL editor, in order. Order matters: the second and
third both build on tables the first two create.

| File | What it adds | If you skip it |
|---|---|---|
| `supabase/migrations/20260916_clip_notification.sql` | Trigger that fires when a clip is sent | No "Mell sent you a video" ever arrives |
| `supabase/migrations/20260916_report_and_block.sql` | `content_reports`, `blocks`, `block_person()`, `live_clips.reported_at` | The flag button and the Block button both fail silently |
| `supabase/migrations/20260916_report_alert.sql` | `platform_admins`, moderator policies, report trigger | Reports land where nobody is told about them |

Each one ends with a `select` that prints what it installed. Read that line.

## 2. Deploy the functions

```bash
supabase functions deploy notify-clip
supabase functions deploy notify-report
supabase functions deploy expire-clips     # changed: now skips reported clips
```

`expire-clips` is already live and this is an edit to it. Without the redeploy,
the sweeper deletes reported clips after two hours and reports point at files
that no longer exist.

## 3. Check it, do not assume it

Two accounts, phones locked:

1. Mell sends you a clip mid workout. Your phone should say
   **"Mell sent you a video"** within a few seconds. Tap it: the clip plays.
2. Play a clip, tap the flag, pick a reason. Your own phone gets
   **"Report: ..."**. Setup, Admin, Reports shows it open.
3. Setup, Safety, Block. You should be unpaired and they cannot re-pair.

## 4. Optional, whenever you like

Email alerts for reports work the moment these two are set, with no code
change. Until then the push alert is the whole mechanism.

```
RESEND_API_KEY=...
RESEND_FROM="Unio <reports@creativelab1.com>"
```

Needs a Resend account and creativelab1.com verified there.

## 5. Still blocked on you, unrelated to the above

**TestFlight is serving build 6.** To upload the current build I need the
**Issuer ID**: App Store Connect, Users and Access, Integrations, App Store
Connect API, the UUID at the top of that page. The key itself and the Key ID
are already in place at
`~/.appstoreconnect/private_keys/AuthKey_4X3J46W9NL.p8`.
