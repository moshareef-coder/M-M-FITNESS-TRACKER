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
