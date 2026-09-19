# Working in this repo

Written 2026-09-16 after five collisions in one day. Everything here is a thing
that has actually gone wrong, not a preference.

## Several sessions edit this repo at once

Three to five Claude sessions and a human collaborator work this repo
simultaneously, and `index.html` is 23,000 lines that all of them touch.

**Never `git add index.html`, and never `git commit -a`.** Stage only your own
hunks:

```
git diff index.html > /tmp/mine.patch     # then filter to your hunks
git apply --cached /tmp/mine.patch
```

Today this rule was broken five times. Nothing was lost, but work landed under
four unrelated commit messages, so the reasoning for a change is now in a commit
about something else. A commit message is how the next person learns why; sweeping
somebody else's hunks into yours destroys that even when the code survives.

**`git commit --only <file>` is as unsafe as `git add`.** It re-stages the whole
working copy of that file, so it sweeps in whatever else is mid-edit. An agent hit
this on 2026-09-18 and caught it only by reading the diff afterwards.

**Never `git stash`.** Three agents hit collisions with it on this shared tree.
For a baseline use `git archive HEAD | tar -x -C <scratch dir>` and work there.

**Never commit `sandbox-app.html`.** It is generated (`node scripts/make-sandbox.mjs`)
and committing it sweeps in whatever else is mid-edit in `index.html`.

**An Edit that returned success may not still be on disk.** Re-grep before you
commit, and commit as soon as something works rather than batching.

## Folder ownership

- `knowledge/` belongs to a human collaborator. **Read only.** Requests for it go
  in `mo-knowledge/LIBRARY-REQUESTS.md`.
- `mo-knowledge/` is ours, including the engine.
- `supabase/migrations/` are **written, not applied**. The owner runs them.
- Edge functions are **not deployed** by a session. The owner deploys.

## The gate

Engine changes:

```
node --test mo-knowledge/engine/test.mjs
node mo-knowledge/engine/demo.mjs --check
node mo-knowledge/engine/sweep.mjs          # exit 0, no FAILs, nothing KNOWN OPEN
node mo-knowledge/engine/fuzz.mjs           # exit 0, clean
node scripts/vendor-engine.mjs              # the vendored copy is what SHIPS
```

Re-vendor after every engine edit or production runs different code from the tests.

App changes: `node scripts/boot-check.mjs`, then drive the sandbox
(`node scripts/make-sandbox.mjs`, serve, `/sandbox-app.html`). Zero console errors
and `scrollWidth === clientWidth === 390` in both themes.

Report every sweep WARN delta with an explanation. A number that moves without a
reason is what the sweep exists to catch.

## Where the app actually comes from

`index.html` is the only source. The website, the sandbox and the iOS app are
three copies of it, and two of them go stale without saying so.

**The website is the source, served directly.** `vercel.json` sets
`outputDirectory: "."`, so a push to `main` IS the website. Nothing is built and
nothing can drift.

**The sandbox is generated.** `node scripts/make-sandbox.mjs` bakes `index.html`
into `sandbox-app.html` on fake data. Stale until regenerated. Affects nothing
else.

**The app is three hops away:**

```
index.html
  -> node scripts/sync-web.mjs     writes www/, and CHECKS runtime imports
  -> npx cap sync ios              copies www/, never reads index.html
  -> node scripts/register-native-plugins.mjs
  -> xcodebuild archive / export / altool --upload-app
```

**`cap sync` does not read `index.html`.** It copies `www/`. Skip `sync-web` and
you get a build that compiles, installs, runs, and is silently days old. This
shipped a day-old bundle to a real phone on 2026-09-17 and cost an afternoon of
"the app looks outdated".

`sync-web` also prints which runtime imports are missing from the bundle. Those
imports are lazy, so the app throws only when somebody opens that feature: a
build missing one looks perfect until a real person taps it. Read that output.

**Verify rather than trust**, one command:

```
diff <(shasum -a 256 index.html | cut -d' ' -f1) \
     <(shasum -a 256 ios/App/App/public/index.html | cut -d' ' -f1)
```

And after exporting, read the version back out of the `.ipa` itself, not out of
the tree it was built from.

**A cable install outranks TestFlight on the device.** `devicectl device install`
replaces the TestFlight copy, and iOS will not prompt to update over it. If a
tester reports an old-looking app, ask what they installed last before assuming
the build is wrong.

**Build numbers:** `CURRENT_PROJECT_VERSION` appears four times in
`project.pbxproj`, app and widget. Move all four together or App Store Connect
rejects the pair. It is separate from `APP_VERSION`, which is the web version.

## Version bumping

`APP_VERSION` in `index.html` and `CACHE` in `sw.js` are one version and must move
together, or the update check compares a live version against itself. **One bump per
batch**, at the end, not per commit. They have drifted apart repeatedly.

## House rules

- **No em dashes or en dashes.** Anywhere, code or copy, every project.
- Comments explain WHY, in the voice of the surrounding code. Read a neighbouring
  module before writing one.
- Commit messages: a plain-language subject about what changed for a person, then
  prose explaining why. Not a bulleted list of files. Read `git log`.
- End commits with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Say the uncomfortable thing out loud. This codebase reports what it could not do
  rather than hiding it, in `dayNotes`, `meta.missing` and `volumeNotes`. Keep that.
- Do not agree by default. If a brief is wrong, say so and propose better. Where the
  code can settle a question, measure rather than argue.

## Traps that have bitten more than once

- **supabase-js does not throw on a failed query**, it resolves with an error, so a
  `try/catch` around one catches nothing. Check the result.
- **App globals are top-level `let`/`const`**, so they are NOT on `window`. Inside
  `page.evaluate` use bare identifiers.
- **The sandbox's fake client**: `.update()` DOES persist (it carries `__i` back in
  `settle()`); `upsert` matches only the first `onConflict` column.
- **Capacitor 7 registers plugins only from `packageClassList`**, which it fills by
  scanning `node_modules`. A plugin in the app target is never registered and reads
  as `undefined` in JS rather than throwing. `scripts/register-native-plugins.mjs`
  puts them back after every `cap sync`.
- **A SECURITY DEFINER function's `current_user` is always its owner.** A trigger
  gated on `current_user not in ('authenticated','anon')` and declared SECURITY
  DEFINER exempts everybody and enforces nothing. This shipped in a migration and
  was caught only because somebody re-read it.
