# iOS App Store submission checklist

Security and privacy pass on the native wrapper (ios/, capacitor.config.json, scripts/sync-web.mjs,
www/), done from source. Nothing here was verified by building or running Xcode; those items say so
explicitly. Written 2026-09-11.

No em dashes.

## 1. Done

- **App Transport Security**: `ios/App/App/Info.plist` has no `NSAppTransportSecurity` key at all,
  so default ATS applies (TLS 1.2+, no arbitrary loads, no exception domains). Verified from source,
  not from a device: default ATS permits the app's actual traffic (Supabase over `https`/`wss`,
  the two CDN scripts, Google Fonts over `https`) without any exception, so nothing needs adding.
  If a future dependency needs plaintext HTTP, that is a decision for the owner, not a default to
  reach for.
- **Capacitor configuration**: `capacitor.config.json` (root) has no `server.url`, so the binary
  loads its own bundled `www/` and is not a thin shell around a remote site. `server.cleartext` is
  absent (defaults to false: no plaintext HTTP). `allowNavigation` is absent, which is the safe
  default: no wildcard, no domain gets webview-level navigation. `iosScheme` is `https`, the
  recommended value (some native APIs assume a secure origin). The synced copy at
  `ios/App/App/capacitor.config.json` matches, plus an auto-added `packageClassList: []` from
  `cap sync`.
- **Camera, microphone and photo library usage strings**: present in `Info.plist`, and each one is
  verified against a real feature in `index.html`: camera and microphone strings describe the
  training-partner clip feature and its two-view deletion; the photo library string matches the
  profile/workout/progress-photo picker path. No unused permission was found. (Confirmed present:
  another agent added these tonight, this pass re-verified them against the code that actually
  triggers them, not just that the strings exist.)
- **Orientation locked to portrait**: `UISupportedInterfaceOrientations` and its iPad variant both
  list portrait only. Confirmed present and correct.
- **No custom WKWebView code, no custom URL scheme, no universal link / associated domain.**
  Searched `ios/App/App/*.swift`, `Info.plist` and `project.pbxproj` for `WKWebView`,
  `isInspectable`, `evaluateJavaScript`, `CFBundleURLTypes`, `WKAppBoundDomains`,
  `associated-domains`: none found. `AppDelegate.swift` is the stock Capacitor template; the two
  `open url` / `continue userActivity` overrides just forward to
  `ApplicationDelegateProxy.shared`, they do not act on the URL themselves. There is no deep-link
  handler to validate because there is no deep link registered. This is the safe state, not a gap,
  but it also means the app has no deep-linking feature at all if the owner wants one later.
- **No debug-in-release exposure found in project code.** No `.entitlements` file exists, no
  `isInspectable` override in this project's Swift. Capacitor 7's own `CAPBridgeViewController`
  guards `webView.isInspectable` to `#if DEBUG` internally, so a Release/Archive build should not
  be Safari-inspectable. This is inferred from Capacitor's known behaviour at this version, not
  verified by producing an actual archive and attaching Safari's inspector to it. Flagged as
  unverified below.
- **`sync-web.mjs` no longer ships internal working documents into the binary.** Fixed this
  session, see finding below.
- **Account deletion is reachable in-app without contacting support.** `page-account` in
  `index.html` is an ordinary settings subpage (same navigation pattern as profile, partner,
  training, etc.), containing a two-step "Delete account" control (type DELETE to confirm) that
  calls `POST {SUPABASE_URL}/functions/v1/delete-account` with the user's session token, clears
  local storage, signs out and reloads. The confirmation copy states the consequence in plain
  language: "This permanently erases your profile, workouts, weigh-ins, photos and rank... and it
  unpairs your partner." A reviewer should accept the client-side half of this: reachable, does not
  merely deactivate on the client, tells the user what happens, requires typed confirmation. The
  edge function's actual internals (whether it truly deletes every row and every storage object) are
  outside this agent's area; another agent audited `delete-account` directly, defer to that report
  for whether the deletion is complete server-side.

## 2. Fixed this session

**Finding: `scripts/sync-web.mjs` copied four entire directories into the shipped bundle,
including internal files the app never loads.**

Before tonight, `sync-web.mjs`'s `DIRS` list did `cpSync(..., { recursive: true })` on `knowledge/`
and `mo-knowledge/` in full. Cross-checking every `import()`/`fetch()` of a `knowledge/` or
`mo-knowledge/` path actually present in `index.html` against what those two directories contain
shows the app only ever loads:

- `mo-knowledge/engine/limits.mjs` (which pulls in `joint-load.mjs` and `load.mjs`)
- `knowledge/formulas/tdee.mjs`, `calorie-math.mjs`, `strength-math.mjs`
- `knowledge/exercise-library/index.mjs` (which pulls in `weight-training.mjs`, `yoga.mjs`,
  `pilates.mjs`, `calisthenics.mjs`, `stretching.mjs`)
- `knowledge/anatomy/rive-body.mjs`, `muscle-detail.mjs`, `muscle-bounds.mjs`, and the `.riv` binary
  asset `rive-body.mjs` loads relative to itself
  (`knowledge/anatomy/assets/human_anatomy_advanced_v3.0.riv`)

A recursive copy of the two directories also pulls in files that are never loaded and are clearly
internal: `mo-knowledge/research/*.md` (12 files of internal product/training research, including
one titled "the pair is the algorithm" and one about a product merge), `mo-knowledge/PLAN.md`,
`PLAN-2.md`, `open-questions.md`, `README.md`, unused engine modules (`adapter.mjs`, `bakeoff.mjs`,
`calibrate.mjs`, `demo.mjs`, `goal-engine.mjs`, `mobility.mjs`, `pair.mjs`, `plan.mjs`,
`plateau-response.mjs`, `preferences.mjs`, `recovery.mjs`, `sweep.mjs`, `test.mjs`,
`training-age.mjs`), and `knowledge/CLAUDE.md`, `BRIEF-workout-algorithm.md`, `README.md`,
`sources.md`, `principles/*.md`, both demo `.html` files, and `exercise-library/library.html`.
`knowledge/CLAUDE.md` in particular is an internal working brief written for Claude Code sessions,
naming the owner and internal review process (CODEOWNERS, "Mo's approval"). None of this is a
credential leak, but it is exactly the "read the internal roadmap out of a shipped app binary"
leak the brief names: unzip the IPA, find the web bundle, read the team's product research and
process notes.

**What was changed**: `scripts/sync-web.mjs` now copies an explicit `KNOWLEDGE_FILES` list (the
exact files enumerated above) instead of recursing the two directories. `vendor/` and `badges/`
still copy whole, because both hold nothing but binary assets (one `.wasm`, 19 badge `.webp`
images) with no internal documents mixed in.

**Not run.** Per the fix brief's rule 5, `sync-web.mjs` was edited but not executed. `www/` right
now is stale from before the `DIRS` expansion existed at all (it holds only `index.html`,
`manifest.webmanifest`, `sw.js` and the three icons, no `knowledge/`, `mo-knowledge/`, `vendor/` or
`badges/` present). **The owner must run `node scripts/sync-web.mjs` (or `npm run cap:sync`) before
the next Xcode archive.** When they do, it will now follow the trimmed list above, not the old
recursive one. This also means no build has yet shipped the over-broad copy to a device or to
TestFlight, based on what's on disk now, but that could not be confirmed without seeing prior
archives.

**Already clean, confirmed by source inspection**: no `.env` file exists anywhere in the repo
(`git ls-files | grep -i env` returns nothing), no service-role key appears in `index.html`, `sw.js`
or `capacitor.config.json` (only the public anon key pattern used elsewhere in the app), no source
maps (`grep sourceMappingURL` on `index.html` and `sw.js` is empty), and `sandbox-*.html`,
`issues.json`, `states.html`, `design-sheet.html`, `preview.html`, `engine-lab.html` were never in
`sync-web.mjs`'s `ASSETS` or `DIRS` lists (before or after this fix), so none of them have ever
been copied into `www/`.

## 3. Needs the owner's decision or action

- **Run `node scripts/sync-web.mjs` before the next archive**, per above. Without this, `www/` is
  missing files the app needs at runtime (the knowledge/mo-knowledge imports would 404 inside the
  native app even though they work fine on Vercel, since the web app still serves from the repo
  root there).
- **Push notifications appear to not be wired up for the native iOS build at all.**
  `supabase/migrations/20260903_push_and_nudges.sql` stores `endpoint`, `p256dh`, `auth`, which is
  the Web Push API shape, and `sw.js` handles `push`/`notificationclick`. But `package.json` has no
  `@capacitor/push-notifications` dependency, `Info.plist` has no `UIBackgroundModes` with
  `remote-notification`, and there is no `.entitlements` file granting the `aps-environment`
  capability. Web Push does not work inside a Capacitor `WKWebView` wrapper the way it does in
  Safari; it needs the native Capacitor Push Notifications plugin talking to APNs. This is a
  functional gap, not a security hole, but if push notifications are advertised as a feature they
  will silently not fire in the App Store build. Worth a decision: wire up native push, or don't
  advertise it for this platform yet.
- **Privacy policy content is out of date.** See section 5 below for the specific gap list. This
  blocks App Review under Guideline 5.1.1 if a reviewer checks the policy against the permission
  strings and finds camera/microphone/photos mentioned in the plist but not the policy.
- **`limitsNavigationsToAppBoundDomains` is not set.** Not required (no `allowNavigation` wildcard
  exists to make it urgent), but it is a defense-in-depth option worth considering: it restricts
  the webview to domains declared in a `WKAppBoundDomains` array in `Info.plist`, so a successful
  script injection could not silently start loading content from an arbitrary origin. Adding it
  requires deciding the exact allow list (the Supabase project host, the CDN hosts, Google Fonts)
  and is a product/ops decision more than a pure code fix, so left for the owner.
- **Bundle version.** `project.pbxproj` has `MARKETING_VERSION = 1.0` and
  `CURRENT_PROJECT_VERSION = 1`, `CODE_SIGN_STYLE = Automatic`, no `DEVELOPMENT_TEAM` set in the
  lines this pass could see. Signing team and provisioning are configured at archive time in Xcode,
  cannot be verified from source. Confirm the bundle ID `com.creativelab1.fittogether` matches the
  App Store Connect record before archiving.
- **iOS deployment target is 14.0** (`ios/App/Podfile`). Acceptable minimum, but confirm it is
  still compatible with whatever Xcode/SDK version does the archive; Apple periodically requires a
  recent SDK for new submissions regardless of the app's own deployment target.

## 4. Could not verify without Xcode or a device

- Whether a Release/Archive build is actually non-inspectable (`isInspectable` behaviour is
  Capacitor's own default, not overridden in this project, but was not exercised on a device).
- Whether the app actually builds and archives cleanly with the current Podfile/Pods state.
- Code signing, provisioning profile validity, and TestFlight upload itself.
- Whether push notifications, if left as-is, fail silently or throw at runtime on device (inferred
  from the plugin/entitlement gap above, not observed).
- App icon and launch screen asset completeness (all required sizes) inside `Assets.xcassets`, not
  enumerated by this pass.

## 5. Privacy nutrition label (draft, for the App Store Connect privacy questionnaire)

Derived from the code paths and schema that actually collect each type, not from the current
(out of date) privacy.html. This is a draft for the owner to enter into App Store Connect and to
use as the source of truth for the privacy questionnaire; it is not legal text. Corrected 11 September 2026 against the code, and privacy.html now matches it.

No tracking of any kind was found anywhere in the app: no analytics SDK, no ad SDK, no
`gtag`/Mixpanel/Amplitude/Segment/Sentry/PostHog, nothing that correlates the user across other
apps or sites. Every "Used for tracking" answer below is **No**.

| Data type | Collected | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Email address (Google Sign-In via Supabase Auth) | Yes | Yes | No | App functionality (account, pairing) |
| Name | Yes | Yes | No | App functionality (display to partner) |
| Health & fitness: workouts, sets, reps, weights lifted, exercise history | Yes | Yes | No | App functionality (the core product) |
| Health & fitness: body weight (weigh-ins) | Yes | Yes | No | App functionality |
| Health & fitness: height, age, sex, training goals, training preferences, physical limits/equipment | Yes | Yes | No | App functionality (workout tailoring); plans are generated locally on our servers, nothing sent externally |
| Photos: progress photos and workout proof photos (`workout-proof` storage bucket) | Yes | Yes | No | App functionality |
| Photos: profile picture (`workout-proof` bucket under `{email}/avatar/`, keyed off `profiles.avatar_path`) | Yes | Yes | No | App functionality |
| User-generated video/audio clips (`live-clips` storage bucket, camera and microphone) | Yes | Yes | No | App functionality (short clip to training partner, deleted on first view, with a scheduled `expire-clips` cleanup as a two-hour backstop) |
| Live session / presence data (`live_sessions` table) | Yes | Yes | No | App functionality (real-time "who's training now" between partner pair) |
| User content: exercise names, notes, comments, reactions typed into the app | Yes | Yes | No | App functionality |
| Partner graph (who is paired with whom, coach/client groups) | Yes | Yes | No | App functionality |
| Push token (`push_subscriptions`: endpoint, p256dh, auth, user agent) | Yes, if the user turns notifications on | Yes | No | App functionality (nudges, live-session notifications) |
| Usage data (nudge send log, badge/milestone unlocks, saved workouts, exercise swaps) | Yes | Yes | No | App functionality |
| Device timezone | Yes (`profiles.timezone`, captured on sign-in) | Yes | No | App functionality (sending nudges at the right local hour) |
| Diagnostics/crash data | Not found in this pass. No crash reporter or logging service was found wired into `index.html` or the native project. | n/a | n/a | n/a |

Notes for App Store Connect specifically:
- All rows are "Data used to track you: No", since there is no third-party tracking SDK.
- Everything is "Data linked to you", since every table keys on the user's email/id and RLS scopes
  it to that user or their declared partner; nothing here is collected anonymously.
- The photos and health/fitness rows are the ones Apple scrutinizes hardest for a fitness app;
  the purpose for all of them here is "App Functionality," never "Third-Party Advertising" or
  "Analytics."

## 6. Privacy policy: rewritten, and what is left for a lawyer

`privacy.html` was rewritten on 12 September 2026 from an inventory of what the code actually
touches (17 tables, 2 storage buckets, 5 service providers) rather than from the previous text.
Workflow generation uses a local deterministic engine, not a third-party API, so nothing leaves
our servers. Every gap the previous checklist listed is closed.

One thing the policy now discloses rather than hides: the share-workout-details switch controls
what the partner's app renders, not what it downloads. That paragraph comes out of the policy when
column-level policy lands, and not before.

**One blocking dependency before this policy is true in production:**

1. **Deploy `delete-account`.** The policy lists every table and both buckets that deletion
   clears. The repo version does that; the deployed version still clears ten tables and touches
   neither `live-clips` nor the newer tables. Until it ships, the deletion section is a promise
   the server does not keep, which is exactly the claim Guideline 5.1.1(v) is about.

**What still needs an actual lawyer, and why I did not write it:**

- **GDPR lawful basis.** If anyone in the EU or UK installs this, the policy needs to name a basis
  per purpose (contract for the core tracker, consent for notifications, and so on), and health
  data is an Article 9 special category, which generally needs explicit consent rather than
  contract. Getting that wrong is the expensive kind of wrong. The policy currently describes
  behaviour truthfully but claims no basis.
- **Controller identity and address.** A GDPR-facing policy has to name the legal entity and a
  postal address. The page currently gives an email only.
- **Data location and transfers.** I did not assert a storage region because I could not verify
  the Supabase project's region from the repo. If EU users are in scope, that region plus the
  transfer mechanism (SCCs) has to be stated.
- **CCPA/CPRA.** California requires a specific set of named rights and a "we do not sell or share"
  statement in their defined sense. The policy says we do not sell, in plain English, which is
  true but is not the statutory formulation.
- **Age.** The policy says 13. Whether that is right depends on where users are (GDPR sets 13 to 16
  by member state) and whether COPPA applies. There is currently no age gate in the app at all, so
  the 13 line is a statement of intent rather than an enforced control.
- **Retention periods for the rest.** "Until you delete it" is honest but is not a retention
  schedule, which some regimes expect.
- **The coach relationship.** If a coach ever pays for access to clients' data, the coach is
  plausibly a separate controller and that needs a processing agreement, not just a policy line.

None of this blocks an App Store submission. It blocks being comfortable if a European user or a
regulator ever reads the page.

## 7. Report summary

No SEVERE finding in this agent's area (ios/, capacitor.config.json, scripts/sync-web.mjs, www/).
One real defect found and fixed: `scripts/sync-web.mjs` would have shipped internal roadmap and
research documents into the App Store binary via unrestricted recursive directory copies; it now
copies an explicit, verified list of the files `index.html` actually loads. Everything else in this
area (ATS, Capacitor config, webview hardening, permission strings, account deletion reachability)
checks out from source. The two things that actually block a clean submission are both outside code
fixes: the privacy policy content needs a human rewrite against the gap list above, and the owner
needs to decide whether to wire up native push notifications or leave the feature unadvertised for
iOS.
