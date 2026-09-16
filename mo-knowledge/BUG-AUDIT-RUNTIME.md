# Runtime and UI bug audit

Written 2026-09-16 against `index.html` at APP_VERSION 2026.09.16.4, by driving
`sandbox-app.html` over CDP in headless Chrome at 390x844, both themes.

Scope: runtime and UI only. Crashes, broken states, dead controls, layout
failures. Database policies and migrations are a separate audit and are not
covered here.

## What was actually driven, and what came back clean

Everything below was reproduced in the running app, not read off the source.

- **Five tabs (home, workout, body, progress, setup), both themes.** Zero
  console errors. `scrollWidth === clientWidth === 390` on every one. The only
  console output at all is a Rive deprecation warning ("Rive Events are
  deprecated") on the body tab, which is the vendored runtime talking, not us.
- **All fourteen settings sub-pages** (`page-profile`, `partner`, `goal`,
  `training`, `focus`, `limits`, `milestones`, `notify`, `theme`, `stats`,
  `safety`, `account`, `about`, `admin`), both themes, opened through
  `openSettingsPage()`. All render, all measure 390 wide, no errors.
- **Every control on every settings page clicked: 84 of them**, each on a
  freshly re-opened page so nothing was clicked through a stale DOM. Sign out
  was skipped on purpose. Zero console errors, no geometry breakage after any
  click.
- **The full workout flow**: start, warm-up, end warm-up, tick sets, rest
  timer, advance through all five exercises, cool-down, finish. Zero console
  errors, 390 throughout, and the summary screen was correct.
- **Mid-workout reload.** Ticked two sets on Bench Press, reloaded the page,
  opened the workout tab. The session came back with `setsDone` and
  `setWeights` intact and an "IN PROGRESS / Bench Press, set 3 of 4" resume
  card. This one is genuinely well built.
- **Empty and edge-state scenarios**, all tabs, both themes: `fresh`, `solo`,
  `soloNoData`, `pairedNoData`, `restday`, `behind`, `signedout`,
  `invitePending`, `pairRequest`, `pairRequests`, `pairRefused`, `finished`,
  `live`, `livePrivate`, `clip`. Every one clean: no errors, no overflow. The
  empty states render rather than throw.
- **The offline write path.** `safeWrite` / `flushQueue` (index.html:~10000)
  distinguishes retryable from non-retryable, toasts on a rejection instead of
  pretending it saved, and does not lose writes queued during a flush. Nothing
  to fix here.

Two things that look like bugs in a naive scan and are not, recorded so the
next audit does not spend an hour on them: the `.str-row` buttons on the
progress tab measure past 390 because they sit inside `#strengthList`, which is
a deliberate `overflow-x: auto` scroller; and the "effort points" spans that
report `scrollWidth 114 / clientWidth 1` are `sr-only` screen-reader text.

---

## 1. A failed read is silently drawn as "you have no data", and the workout summary tells you that you did nothing

**Severity: broken.** This is the one that would embarrass us.
**Confidence: high, reproduced.**

`index.html:10165` `loadAll()` fires eight queries in one `Promise.all` and
checks the `error` on none of them:

```
ALL_REACTIONS      = reactRes.data    || [];
ALL_GOALS          = goalsRes.data    || [];
ALL_PLANS          = plansRes.data    || [];
ALL_ENTRIES        = entriesRes.data  || [];
ALL_EXERCISE_LOGS  = exLogRes.data    || [];
ALL_PROFILES       = profilesRes.data || [];
ALL_MILESTONE_BADGES = badgesRes.data || [];
ALL_SWAPS          = swapsRes.data    || [];
```

supabase-js resolves with `{ data: null, error }` rather than throwing, so
every one of these collapses to an empty array on any failure and the app
renders a confident, wrong screen. `renderConnBanner()` only tracks the write
queue, so nothing on screen says a read failed.

The worst case is `exercise_logs`, because the finish screen re-reads
`ALL_EXERCISE_LOGS` after a `loadAll()` to count what the session did.

Reproduce (the harness is `scratchpad/pr.mjs`, but the shape is simple):

1. Serve the repo and build the sandbox:
   `node scripts/make-sandbox.mjs && python3 -m http.server 8777`
2. Launch headless Chrome with `--remote-debugging-port`, and before
   navigating, `Page.addScriptToEvaluateOnNewDocument` a shim that wraps
   `supabase.createClient` so that `.from("exercise_logs")` resolves reads with
   `{data: null, error: {code: "PGRST000"}}` while letting inserts through
   untouched. (This is exactly what a transient PostgREST failure looks like:
   the sets still land, the read back does not.)
3. Navigate to `http://127.0.0.1:8777/sandbox-app.html?scenario=paired`.
4. `switchTab("workout"); startWorkout(); endStretchPhase();` then tick every
   set of all five exercises and call `doFinishExerciseAndAdvance()` through to
   the cool-down, then `endStretchPhase()`.

Measured, control run versus broken-read run, same actions:

```
control          Workout Complete   Push Day · 5 of 5 exercises   3,460 VOLUME LB
exercise_logs    Workout Ended      Push Day · 0 of 5 exercises   0/5 EXERCISES  TIME 0
```

Screenshots: `scratchpad/shots/pr-control.png`,
`scratchpad/shots/pr-exercise_logs.png`.

The user did the entire workout. The sets are in the database. The app says
"Workout Ended, 0 of 5 exercises" with no error and no way to tell it is wrong.
`ALL_EXERCISE_LOGS.length` is 36 in the control and 0 in the broken run, which
is the whole mechanism.

The same injection on `fit_entries`, `ai_workouts`, `user_goals`,
`session_reactions` or `profiles` produces the matching lie on its own surface:
with `exercise_logs` broken the app boots straight to "Nothing logged this week
yet" across home, body and progress with a completely silent console.

Note that this is not a blanket problem, which is why it is worth fixing in one
place: `loadLiveSessions`, `loadSavedWorkouts` and `checkNewMilestoneBadges`
already check and `console.warn`. The gap is the eight in `loadAll`.

Suggested fix, not applied: have `loadAll` collect the errored results, keep the
previous in-memory array rather than blanking it, and surface one honest line
through the existing connection banner. Blanking a populated array on a failed
read is the actual defect; `|| []` is only right on a first load.

---

## 2. A failed `partnerships` read drops a paired user onto the "Who is training with you?" setup screen

**Severity: broken.**
**Confidence: high, reproduced.**

`index.html:6977`, in `checkPartnershipThenEnter()`:

```
const { data: rows } = await sb.from("partnerships")
  .select("*")
  .order("created_at", { ascending: false });
const all = rows || [];
const accepted = all.find((r) => r.status === "accepted");
```

No `error` check. A failed read gives `rows === null`, `all === []`, no
accepted partnership, and the app concludes the user has no partner and renders
`renderPairingScreen()`.

Reproduce: same CDP shim as finding 1, with `TBL = "partnerships"`, then load
`?scenario=paired`.

Measured. `document.body.innerText` after boot:

```
Who is training with you? You can change this later. Nothing is locked in.
Just me  Train alone. You can add someone whenever you like.
Me and one other  A partner you keep each other honest with.
I coach people  Up to 20, including you. Managed from the web.
Sign out
```

Console: empty. Toast: none. Screenshot:
`scratchpad/shots/fail-partnerships.png`.

Why it matters beyond the wrong screen: this is a modal screen with no way past
it except to pick something. Picking "Just me" calls `setSolo()`
(index.html:7334), which writes `ft_solo` and enters the app unpaired. Picking
"I coach people" (index.html:7340) inserts a real `groups` row and a
`group_members` row for a user who already has a partner. Neither destroys the
existing partnership row, so it is recoverable, but the user has been told their
partner is gone and pushed to act on it.

`loadMyGroups()` at `index.html:6949` and `:6953` has the same unchecked shape
one function above, so a failed `group_members` read makes a coached client look
un-coached.

---

## 3. `commitProfile` says "saved" and then silently keeps showing the old profile

**Severity: cosmetic, bordering on broken.**
**Confidence: high on the code path, not separately reproduced end to end.**

`index.html:25460`:

```
const { error } = await sb.from("profiles").upsert({...});
if (error) { toast("Could not save"); console.error(error); return false; }
const { data } = await sb.from("profiles").select("*").eq("email", MY_EMAIL).maybeSingle();
if (data) MY_PROFILE = data;
toast(toastText);
return true;
```

The write is checked properly. The read-back is not. If the re-read fails,
`data` is null, `MY_PROFILE` keeps its pre-save value, and the success toast
still fires. The save really did land, so nothing is lost, but every screen
reading `MY_PROFILE` (the Goal row, the Training page subtitles, accent colours)
shows the old value until the next full `loadAll`, with a toast on screen
saying it saved. I reproduced the unchecked destructure by reading it; I did not
drive a run that forces only that second query to fail.

---

## Things I could not reach, stated plainly

- **`openAvatarEditor`, `openClipRecorder`, `openNextClip`** need a real
  `File` / `MediaRecorder` and could not be driven headless. The avatar editor
  throws `createObjectURL: Overload resolution failed` when called with no
  argument, which is my call being wrong, not a bug. These three screens are
  **unaudited**.
- **`openPolicy()`** is not reachable as a bare identifier from
  `Runtime.evaluate`, so I tested the two policy URLs directly instead:
  `https://m-m-fitness-tracker.vercel.app/privacy.html` and `/support.html`
  both return 200, and so does `/coach`. Not broken, but worth a decision
  before submission: the app is branded Unio and `renderCoachHandoff()`
  (index.html:~7371) prints `m-m-fitness-tracker.vercel.app/coach` to the user
  as the dashboard address. A reviewer will see a different product's domain
  inside Unio. That is a branding call, not a bug.
- **The `finished` and `live` scenarios' sheets** were walked as tabs but I did
  not click through every sheet in those scenarios, only in `paired`.
- **Native-only paths** (Capacitor plugins, APNs registration, the Browser
  plugin) do not run in the sandbox and are unaudited here.

## One observation that is not a bug

Booting `?scenario=paired` fires the "First one down." milestone celebration
modal over the home screen, because `sandbox-data.js` ships no
`milestone_badges` rows and `checkNewMilestoneBadges()` correctly awards the
first-workout badge. That is the sandbox data, not the app. It does cost every
future audit an hour, though, because the modal silently contaminates every
screenshot taken in the first minute. Worth seeding a couple of earned badges
into the `paired` scenario.
