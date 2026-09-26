# Environments: dev, staging, prod

Written 2026-09-26, the day 1.0 went back to App Review. The goal is shipping
updates fast without the two things that cost the first submission two days:
broken code reaching a phone, and nobody noticing until it was recorded.

Unio is three things that ship on three different clocks, so it gets three
pipelines, not one.

## 1. The web layer (index.html)

This already has all three environments. They are just not being used.

| | Where | How long |
|---|---|---|
| dev | `sandbox.html` locally, the real app on fake data | seconds |
| staging | any branch you push gets its own Vercel preview URL | ~1 minute |
| prod | merge to `main`, which is `m-m-fitness-tracker.vercel.app` | ~1 minute |

**The change:** stop pushing straight to `main`. Push a branch, open the
preview URL on a phone, then merge. Every session and collaborator doing the
same removes most of the "it looked fine" failures.

## 2. The iOS app

| | Where | How long |
|---|---|---|
| dev | cable install to a phone: build for the device, `devicectl` install | ~3 minutes |
| staging | TestFlight | ~15 minutes after upload |
| prod | App Store | 24 to 48 hours of review, and nothing makes that faster |

**Release:** `scripts/release-ios.sh`. One command: gate, bump every version
together, sync the bundle, archive, export, open the IPA and check what is
actually inside it, upload. It stops at the first thing that is wrong. Use
`--dry-run` to build and verify without uploading.

**TestFlight is broken for Mo today.** Both internal testers are stuck at
INVITED, which is why TestFlight asks for a redeem code. Fix: accept the
invitation email, or resend it from Users and Access.

## 3. The backend (Supabase): the real gap

Today there is one project. Migrations are written in `supabase/migrations/`
and applied by hand, directly to the database real users will be on. Nothing
tests a migration before it touches production data. Once there are paying
users, this is the thing most likely to cause an incident.

The account already has two projects (`fit-together`, `cl1-money-tracker`),
which is the free plan's limit. Options, cheapest first:

1. **Supabase CLI locally.** `supabase start` runs the full stack in Docker on
   the Mac, free. Apply every migration there first. Needs Docker Desktop.
2. **A staging project** on the Pro plan. A real hosted copy, roughly $25 a
   month for the plan plus compute per extra project.
3. **Supabase Branching** (Pro). A throwaway database per git branch, billed
   only while it exists.

Not decided yet. Option 1 is enough until there are users.

## 4. Shipping without waiting for Apple

The whole UI is `index.html` inside a webview, so most fixes are web fixes
that currently wait 24 to 48 hours on review for no technical reason. Over the
air updates (Capgo, or Ionic's live updates) swap the web bundle inside the
installed app. Apple's guideline 3.3.2 permits downloading interpreted code as
long as it does not change the app's primary purpose or add features that
should have been reviewed, and this pattern is widely used. Native changes
(plugins, permissions, entitlements) still need a real build and review.

Worth setting up once there are real users and a real fix to rush out. Not
before: it is one more moving part, and a bad OTA push reaches every phone at
once.

## 5. The gate

`.github/workflows/gate.yml` runs on every push and pull request. Every check
in it already existed as a script meant to be run by hand, and was not:

- boot check (the app boots and every tab renders, pure Node)
- native bundle completeness (the check that would have caught the blank
  animations)
- the vendored engine matches `mo-knowledge/engine`
- engine determinism, sweep and fuzz
- the move library validates
- `APP_VERSION` and the service worker `CACHE` agree
- all four `CURRENT_PROJECT_VERSION` values agree
- no em or en dashes

**Two checks were already failing the first time the gate ever ran**, and sit
in a separate `known-failing` job so they are visible without blocking
everything else:

- engine test: *a cardio day respects the session length they gave us*. User
  facing, cardio sessions may run longer than asked.
- engine test: *a short bodyweight-only day still reaches the four exercise
  floor*
- `knowledge/equipment.mjs` is out of date against its generator.
  `knowledge/` belongs to the collaborator, so the regenerated file goes to
  them rather than being committed here.

The quarantine exists to be emptied. Do not add to it without saying why and
when it comes out.

## The flow, end to end

1. Branch. Build it. Check it in the sandbox.
2. Push the branch. The gate runs, and Vercel gives you a preview URL.
3. Open the preview on a phone.
4. Merge to `main`. The website updates.
5. When the iOS app needs it: `scripts/release-ios.sh`, then TestFlight, then
   submit.
6. Any migration goes through the local or staging database first, never
   straight to production.
