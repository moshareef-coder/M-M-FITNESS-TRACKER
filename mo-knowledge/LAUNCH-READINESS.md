# Unio: App Store launch readiness

Audited 2026-09-16 against the repo at `/Users/creativelab1/fit-together`, the
live Supabase project `stcpiovpjismhltklfdw` (read only), and the deployed edge
functions. Scope is submission readiness only: the binary, the entitlements, the
review obligations and the listing. Runtime UI bugs and RLS are two other
sessions.

Every finding below says whether it was **verified** (I read the file, ran the
query, or probed the endpoint) or **inferred** (I reasoned from source I read
but did not run on a device).

**4 things block submission.** The single most likely cause of rejection is the
review account: it is signed up but has no partner and no data, so a reviewer
cannot reach a single one of the features Apple will be checking.

---

## 1. Blocks submission

### 1.1 The App Review account is empty and unpaired

**Verified by SQL.** `appreview@creativelab1.com` exists in `auth.users`
(confirmed, last sign in 2026-09-16 03:40) and has a `profiles` row created
today at 09:08. It has:

- `partnerships`: **no row of any kind**. The five rows in that table are Mo,
  Mell, Jawa and two fake demo partners. None mentions the review account.
- `fit_entries`: 0. `exercise_logs`: 0. `ai_workouts`: 0. `milestone_badges`: 0.

The product is "train with your partner". With no partner the reviewer sees the
solo shell and cannot reach any of this:

- live clips (the UGC the whole 1.2 review is about)
- the flag on a clip, which is the **only** way to file a report
- Setup, Safety, Block, whose button is hidden when `PARTNER_EMAIL` is empty
  (`index.html:13070`, `blockLive` is toggled on `Boolean(PARTNER_EMAIL)`)
- messages, partner progress, rank, the shared rank gate

Apple's 1.2 checklist asks the reviewer to confirm reporting and blocking work.
Here they cannot be reached at all. That is a rejection with a request for
working credentials, and it costs a full review cycle.

**Fix:** stand up a second account (for example `appreview.partner@creativelab1.com`),
accept a partnership between the two, and seed the review account with four to
six weeks of weigh-ins, workouts and exercise logs plus at least one badge, so
Home, Progress and Rank are not empty. Then put **both** sets of credentials and
a three-line "how to find report and block" note in App Store Connect, Test
Information, Notes. This is data, not code: no file in the repo changes.

### 1.2 Widget extension build number does not match the app

**Verified in `ios/App/App.xcodeproj/project.pbxproj`.**

- App target: `CURRENT_PROJECT_VERSION = 34` (lines 497, 517)
- `FitTogetherWidgetExtension`: `CURRENT_PROJECT_VERSION = 1` (lines 554, 598)

App Store Connect refuses the upload with "CFBundleVersion Mismatch. The
CFBundleVersion value '1' of extension
`Unio.app/PlugIns/FitTogetherWidgetExtension.appex` does not match the
CFBundleVersion value '34' of its containing iOS application". `MARKETING_VERSION`
is `1.0` on both, which is correct and needs no change.

**Fix:** `ios/App/App.xcodeproj/project.pbxproj`, change `CURRENT_PROJECT_VERSION = 1;`
to `34` at **line 554** and **line 598**. Keep all four numbers moving together on
every future bump.

### 1.3 Widget declares iPad support that the app does not have

**Verified in the same file.**

- App target: `TARGETED_DEVICE_FAMILY = 1` (iPhone only, lines 512, 538)
- Widget: `TARGETED_DEVICE_FAMILY = "1,2"` (lines 581, 623)

An app extension's device family has to be a subset of its container's.
"1,2" is not a subset of "1", and upload validation fails on it. The widget
target still carries the Xcode template default because nobody touched it when
the app was pinned to iPhone on 2026-09-15.

**Fix:** `ios/App/App.xcodeproj/project.pbxproj`, change
`TARGETED_DEVICE_FAMILY = "1,2";` to `TARGETED_DEVICE_FAMILY = 1;` at **line 581**
and **line 623**.

### 1.4 The in-app Privacy Policy and Support links are dead in the native build

**Inferred from Capacitor source, not run on a device. High confidence, and
cheap to confirm on the phone in ten seconds.**

Three places link out with `target="_blank"`:

- `index.html:6639` the sign-in screen, "By continuing you agree to the Privacy Policy"
- `index.html:5842` Setup, About, Privacy policy
- `index.html:5845` Setup, About, Support

In the wrap the web origin is `https://localhost` (`capacitor.config.json`,
`ios.server.iosScheme: "https"`). A `target="_blank"` anchor reaches
`WebViewDelegationHandler.swift:310`, whose entire body is:

```swift
if let url = navigationAction.request.url {
    UIApplication.shared.open(url, options: [:], completionHandler: nil)
}
return nil
```

So iOS hands `https://localhost/privacy.html` to Safari, where nothing is
listening. The reviewer taps Privacy Policy on the very first screen and gets a
Safari failure page or nothing at all. `decidePolicyFor` (line 66) allows the
navigation first, because the URL does start with `bridge.config.localURL`, so
nothing upstream catches it. `@capacitor/browser` is already a dependency but is
used only for the Google OAuth popover (`index.html:6719`), never for these
links.

A broken privacy link on the sign-in screen is the thing App Review checks
first, and it reads as both 5.1.1 (privacy disclosure) and 2.1 (broken
functionality).

**Fix, one of:**

- Drop `target="_blank"` on those three anchors so they navigate in the webview,
  and rely on the "Back to Unio" button already present at the bottom of both
  `privacy.html` and `support.html`. Cheapest, no new code.
- Or route them through `Capacitor.Plugins.Browser.open({ url })` with the
  public URL when `isNativeApp()`, which also gives a native Done button.

`index.html` is off limits to this session, so this is a one-line change for
whoever owns it. The same three anchors live in `www/index.html` and
`ios/App/App/public/index.html`, which are regenerated by `npm run cap:sync`.

---

## 2. Likely rejection

### 2.1 No terms of use, no agreement not to post objectionable content (Guideline 1.2)

**Verified.** A grep of `index.html` for "terms of service", "terms of use" and
"EULA" returns nothing but unrelated prose. The sign-in screen's legal line
(`index.html:6639`) offers the Privacy Policy and support, and no terms.

Guideline 1.2 asks for four things from any app with user generated content.
Three are shipped and good:

- a mechanism to report offensive content: the flag on a playing clip,
  `index.html:12632` and `reportClip` at `13010`, writing `content_reports`
- the ability to block abusive users: Setup, Safety, Block, calling the
  `block_person` RPC, `index.html:13050`
- published contact information: `support.html` and the mailto on the Safety page

The fourth is the gap. Apple's standard 1.2 response asks for terms the user
agrees to that forbid objectionable content and set out a zero tolerance policy,
because Apple's default EULA does not contain one. For a video-between-users app
this is asked for routinely.

**Fix:** add `terms.html` next to `privacy.html` (same stylesheet, same "Back to
Unio" footer), add it to the `ASSETS` list in `scripts/sync-web.mjs` so it lands
in the bundle, and change the sign-in legal line to "By continuing you agree to
the Terms and the Privacy Policy". The terms need one explicit clause: no
objectionable content, zero tolerance, accounts removed for abuse.

### 2.2 No filtering mechanism for user generated video (Guideline 1.2)

**Verified.** `reportClip` is purely reactive: it marks `live_clips.reported_at`
and inserts a `content_reports` row after a human has already watched the clip.
There is no pre-publication check of any kind, automated or manual.

1.2's first bullet is "a method for filtering objectionable content from being
posted". Enforcement is genuinely lighter for private one to one sharing than for
a public feed, and a reviewer may accept report-plus-block plus terms. But it is
the likeliest thing they push back on, and the answer is easier to write now than
under a rejection clock.

**Fix:** no code needed. Write the argument down for App Store Connect, Review
Notes: clips are visible only to one consented, mutually paired partner, never
to a feed or a stranger, they are single view, they self destruct within two
hours, every clip can be flagged mid-playback, and a block ends the channel
permanently and prevents re-pairing. Send that with the submission rather than
waiting to be asked.

### 2.3 The privacy policy says Google Sign-In and does not mention Apple

**Verified.** `privacy.html`, "What we collect": *"Your email address and display
name, from Google Sign-In."* The app has offered Sign in with Apple since
2026-09-15 (`index.html:6656`, entitlement `com.apple.developer.applesignin` in
both `App.entitlements` and `AppRelease.entitlements`), and on iOS it is the
**first** button on the screen.

It also omits the private relay case, which the code explicitly handles
(`index.html`, `captureAppleName`, the comment about a relayed email's random
local part). Under 5.1.1 the policy has to describe the sign-in data actually
collected. An Apple reviewer reading a policy that names only Google, in an app
whose top button is Apple's, is a bad look on the one document they are certain
to read.

Two smaller inaccuracies in the same file:

- "You can permanently delete your account at any time from **Setup, then Delete
  account**". The real path is Setup, then **Account**, then Delete account
  (`index.html:5883` `page-account`, heading at `5914`). Same wording is in
  `support.html`, "How do I delete my account?". Two taps, not one, and the
  policy should say the path that exists.
- The policy never mentions that filing a report stores the reporter's email,
  the subject's email and the clip path in `content_reports`, or that blocking
  stores the blocked email in `blocks`. Both tables exist and are live
  (**verified**: `content_reports` and `blocks` both queryable, 0 rows each).
  Moderation data is still collected data.

**Fix:** `privacy.html`. Change the Account paragraph to cover Sign in with Apple
including Hide My Email relay, correct the delete path in both `privacy.html` and
`support.html`, and add one paragraph under "What we collect" for reports and
blocks.

### 2.4 The app downloads and executes code from a CDN at launch

**Verified.** Six `cdn.jsdelivr.net` references survive into the shipped bundle
(`grep -c cdn.jsdelivr.net ios/App/App/public/index.html` returns 6):

- `index.html:30` `@supabase/supabase-js@2.116.0`, a blocking `<script>` in
  `<head>` with an SRI hash. **Nothing in the app works without it.** No client,
  no sign-in, no data.
- `chart.js@4.5.1`, lazy loaded at lines 14418, 14573, 14710, 14770, each with a
  `chartUnavailable` fallback, so those degrade gracefully.
- `@rive-app/webgl2@2.42.0`, line 22141. The wasm beside it is already vendored
  to `vendor/rive-2.42.0.wasm`, but the runtime JS is not.

Two separate risks:

- **Guideline 2.5.2.** "Apps... may not download, install, or execute code which
  introduces or changes features or functionality". A CDN script tag in a
  Capacitor webview is a common pattern and usually passes, but it is a
  discretionary call and the SRI pin is the only thing making the argument
  defensible.
- **Guideline 2.1, the practical one.** App Review runs on restricted networks.
  If `cdn.jsdelivr.net` is slow or blocked, the reviewer sees a permanently blank
  app and files "the app did not load". There is no offline fallback: the `<script>`
  tag has no `onerror`, and `sw.js` cannot have cached a first-launch request.

`three` is already handled the right way, pinned to `/vendor/three/` through the
importmap at `index.html:39`. Do the same for supabase-js.

**Fix:** vendor `supabase-js@2.116.0` into `vendor/`, point line 30 at the local
copy, and add it to `scripts/sync-web.mjs`. Worth doing for Rive too. Chart.js
can stay remote, it already fails soft.

### 2.5 The app shows a URL that is not the product's name

**Verified.** `index.html:11840` `const SHARE_URL = "https://m-m-fitness-tracker.vercel.app";`
and `index.html:7365`, the coach handoff card, renders literally
`m-m-fitness-tracker.vercel.app/coach` to the user.

The app is called Unio everywhere else. A reviewer seeing an invite share out to
`m-m-fitness-tracker.vercel.app` will read it as either a different product or an
unfinished one, which is 2.3.1 territory (hidden or misleading features) at worst
and an amateur note in the review at best. The same hostname is where
`privacy.html` and `support.html` are served from for the listing
(**verified**: both return HTTP 200).

**Fix:** point a real domain at the Vercel project (`unio.creativelab1.com` or a
new one), update `SHARE_URL` and the coach card, and use the new domain for both
listing URLs.

### 2.6 Age rating has to declare user generated video

**Inferred from the feature set.** The app lets one user send a recorded video
with audio to another. `privacy.html`, Children, says Unio is "not intended for
anyone under 13". The App Store Connect age rating questionnaire has to answer
the user generated content questions honestly, which will land the app at 12+ or
higher. A 4+ rating on an app with peer to peer video is a rejection, and the
questionnaire is also where the 1.2 controls get declared.

**Fix:** App Store Connect only. See section 4.

---

## 3. Do before launch, not blocking

- **Production push has never once worked.** **Verified by SQL**: `apns_tokens`
  holds exactly one row, `mo.shareef@creativelab1.com`, `environment = development`.
  The Release entitlement correctly says `aps-environment: production`
  (`AppRelease.entitlements`), so a TestFlight or App Store build registers against
  a different APNs environment than anything ever tested. Send one real push to a
  TestFlight install before the store build goes out.
- **The bundle is stale.** `index.html` is 1,307,271 bytes (03:32);
  `www/index.html` and `ios/App/App/public/index.html` are both 1,307,805 (03:28,
  03:29). Normal with other sessions editing, but `npm run cap:sync` has to be the
  last thing before Archive, or the reviewer gets a build nobody tested.
- **The launch storyboard is light, the app is dark.**
  `LaunchScreen.storyboard` pins `appearance="light"` and a
  `systemBackgroundColor` behind the Splash image, while `capacitor.config.json`
  sets `backgroundColor: "#0c0e13"`. Expect a white flash on cold launch. Cosmetic,
  and the first thing anyone sees.
- **`INFOPLIST_KEY_CFBundleDisplayName = "Creativelab1 Fitness"`** sits at
  `project.pbxproj` lines 500 and 526. It is **inert**: the App target does not set
  `GENERATE_INFOPLIST_FILE`, so `INFOPLIST_KEY_*` is ignored and `Info.plist`'s
  `CFBundleDisplayName = Unio` wins. **Verified.** Delete both lines anyway before
  someone turns that setting on and ships an app called Creativelab1 Fitness.
- **The widget has no icon.**
  `ios/App/FitTogetherWidget/Assets.xcassets/AppIcon.appiconset/Contents.json`
  declares three 1024x1024 entries (universal, dark, tinted) and the folder
  contains **no PNG at all**. Harmless for a widget extension, noisy in the build log.
- **`allowed_emails` is vestigial.** Three rows, none of them the review account,
  and **verified** that nothing in `index.html` reads the table. The only reference
  left is the delete cascade in `supabase/functions/delete-account/index.ts:40`.
  Not a blocker, but it looks like an access gate and one day someone will wire it
  back up and lock out App Review.
- **`limitsNavigationsToAppBoundDomains` is not set.** Optional hardening, called
  out already in `IOS-SUBMISSION.md`. Leave it: turning it on requires a correct
  `WKAppBoundDomains` list, and getting that list wrong breaks Google OAuth.
- **`UIRequiredDeviceCapabilities: armv7`** in `Info.plist` is the stock Capacitor
  template value and is meaningless on a 64-bit-only app. It has never blocked a
  submission. Leave it.
- **`IOS-SUBMISSION.md` is stale in two places** that will mislead whoever reads it
  next: it says "User-generated content has no report or block path" (shipped
  2026-09-16) and "`CURRENT_PROJECT_VERSION` is 17" (it is 34).

### Verified fine, no action

- **Usage strings.** `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`
  and `NSPhotoLibraryUsageDescription` are all present and all specific about
  purpose and retention. They match what the app actually does: two `getUserMedia`
  call sites, and three `<input type="file">` pickers (`avatarFile`,
  `bodyPhotoInput` and `proofInput`, the latter two with `capture="environment"`).
  Nothing writes to the photo library, so `NSPhotoLibraryAddUsageDescription` is
  correctly absent.
- **No HealthKit anywhere.** Grepped `index.html`, the Swift sources and the
  entitlements for HealthKit, `NSHealth*` and Apple Health. Zero hits, and no
  `HealthKit.framework` in the project. None of the HealthKit review requirements
  apply.
- **Sign in with Apple is present and correct.** Google OAuth is offered, so
  Guideline 4.8 requires Apple. `Capacitor.Plugins.SignInWithApple` at
  `index.html:6656`, `com.apple.developer.applesignin` in both Debug and Release
  entitlements, and on native it renders **above** the Google button.
- **Account deletion is reachable and live.** Setup, Account, Delete my account,
  type DELETE, Permanently delete. Three taps from the tab bar
  (`index.html:5914`, handler at `9590`, `deleteMyAccount` at `10118`). The
  `delete-account` edge function is **deployed** (probed: HTTP 401 unauthenticated,
  so it exists and enforces auth; the other seven functions answer too).
- **Export compliance is declared.** `ITSAppUsesNonExemptEncryption = false` in
  `Info.plist`, so builds stop parking in Missing Compliance.
- **App icon is valid.** `AppIcon-512@2x.png`, 1024x1024, 8-bit RGB, **no alpha**,
  sRGB profile. The single-size universal `Contents.json` is the current Xcode
  format and is correct.
- **App Groups match.** `group.com.creativelab1.fittogether` in the app, the release
  and the widget entitlements, all three identical.
- **Orientation, deployment target, device family** on the app target: portrait
  only both idioms, iOS 14.0, iPhone only. Internally consistent, and iPhone only
  is the right call while there is no landscape layout.
- **Version numbers are in step.** `APP_VERSION = "2026.09.16.4"` in `index.html`
  and `CACHE = "unio-2026.09.16.4"` in `sw.js` match, per the CLAUDE.md rule.
  Build 34 is comfortably above the 6 currently in TestFlight.
- **Report and block are deployed, not just written.** `content_reports` and
  `blocks` both exist and are queryable; `notify-report`, `notify-clip` and
  `expire-clips` all answer.

---

## 4. What only Mo can do

Each of these needs a human in App Store Connect, a browser, or a decision. None
of them is code.

1. Create a second partner account, pair it with `appreview@creativelab1.com`,
   and seed both with four to six weeks of real-looking workouts, weigh-ins and at
   least one badge.
2. Put **both** accounts' credentials plus a short "Setup, Safety is report and
   block; Setup, Account is delete account" note in App Store Connect, Test
   Information, Notes.
3. Rename the App Store Connect record from `com.creativelab1.fittogether` to
   **Unio**, and fill in subtitle, description, keywords and promotional text.
4. Produce screenshots: 6.9 inch (1320x2868) and 6.5 inch (1242x2688) are the two
   required iPhone sizes. Portrait only, no iPad set needed since the app is iPhone
   only.
5. Answer the age rating questionnaire, declaring user generated content and
   peer to peer video, which will put Unio at 12+ or higher.
6. Complete the **EU trader status** declaration under the Digital Services Act.
   Mandatory for EU distribution and it blocks submission until done.
7. Enter the privacy nutrition labels. The draft table in `IOS-SUBMISSION.md`
   section 5 is accurate and ready to type in; every "used for tracking" answer is
   No.
8. Set the listing's Privacy Policy URL and Support URL. They work today at
   `m-m-fitness-tracker.vercel.app`, but decide whether to put a real domain in
   front of them first, because the listing shows that hostname to the public.
9. Decide whether to write terms of use, or to argue 1.2 on report plus block
   plus expiry alone. Writing them is the lower-risk path.
10. Generate or confirm the APNs `.p8` key and set `APNS_KEY_P8`, `APNS_KEY_ID`
    and `APNS_TEAM_ID` on the Supabase functions, then send one push to a real
    TestFlight install to prove the production environment works.
11. Get the App Store Connect **Issuer ID** (Users and Access, Integrations) so
    builds can be uploaded without Organizer. Still outstanding from
    `DEPLOY-PENDING.md`.
12. Two phones, ten minutes: send a clip, flag it, confirm the report lands in
    Setup, Admin, Reports, then block and confirm re-pairing is refused. The path
    a reviewer will walk has never been walked end to end.
