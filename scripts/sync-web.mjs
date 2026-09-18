/* Copies the deployable web assets into www/ for the native wrapper.
   The web app itself still ships from the repo root on Vercel; www/ exists
   only so Capacitor has a self-contained bundle to embed in the app. */
import { readdirSync, mkdirSync, copyFileSync, cpSync, rmSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");

const ASSETS = [
  "index.html",
  /* Setup links to both of these with a root-relative href. On the web that
     resolves; inside the Capacitor wrap the root is the bundle, so leaving
     them out gives a 404 where App Review expects to find a privacy policy. */
  "privacy.html",
  "support.html",
  "manifest.webmanifest",
  /* index.html imports this at runtime for everything the character says. On
     the web it resolves from the repo root; left out of the bundle the import
     throws and he has no lines at all, in the session or on the Lock Screen. */
  "quips.mjs",
  "sw.js",
  /* The launch animation's three layers, cut from the master render by
     scripts/split-logo-parts.py. These are <img> src rather than a runtime
     import, so the import check below cannot catch them going missing: left
     out, the app launches to an empty screen. */
  "logo/unio-left.png",
  "logo/unio-right.png",
  "logo/unio-bar.png",
  /* The paywall carousel's five screens, one real capture per premium
     feature. <img> src the same as the logo layers above, so left out of the
     bundle the paywall would show five broken image icons instead of what
     somebody is being asked to pay for. */
  "paywall/01-generated-workout.jpg",
  "paywall/02-week-plan.jpg",
  "paywall/03-body-impact.jpg",
  "paywall/04-progress-records.jpg",
  "paywall/05-accent-colors.jpg",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
];

/* knowledge/ and mo-knowledge/ also hold internal working notes (research/,
   PLAN.md, CLAUDE.md, open-questions.md, unused engine modules like demo.mjs
   and test.mjs) that index.html never loads. Copying those directories
   wholesale would ship internal roadmap material inside the app binary, so
   list only the files index.html actually imports or fetches at runtime
   (verified against every import()/fetch() of a knowledge or mo-knowledge
   path in index.html) instead of recursing whole directories. vendor/ and
   badges/ hold nothing but binary assets, so those two still copy whole. */
/* The whole engine, minus its own test and research tools. adapter.mjs pulls
   in plan, styles, focus, limits, goal-engine, recovery and mobility, and plan
   pulls in more; a hand-kept list of the leaves was exactly what left the
   native build without a generator. Listing the directory cannot miss one. */
const ENGINE_TOOLS = new Set(["test.mjs", "sweep.mjs", "fuzz.mjs", "demo.mjs", "bakeoff.mjs"]);
const ENGINE_FILES = readdirSync(join(root, "mo-knowledge/engine"))
  .filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs") && !ENGINE_TOOLS.has(f))
  .map((f) => "mo-knowledge/engine/" + f);
const KNOWLEDGE_FILES = [
  ...ENGINE_FILES,
  /* The Recovery screen's stretch picks, and focus.mjs because mobility.mjs
     imports MUSCLE_GROUPS from it. Lazy, like every other engine import here,
     so a build without them looks perfect until somebody taps Rest well. */
  "knowledge/formulas/tdee.mjs",
  "knowledge/formulas/calorie-math.mjs",
  /* The calorie target per goal, which the Recovery screen reads. */
  "knowledge/formulas/goal-timeline.mjs",
  "knowledge/formulas/strength-math.mjs",
  "knowledge/equipment.mjs",
  "knowledge/exercise-library/index.mjs",
  "knowledge/exercise-library/weight-training.mjs",
  "knowledge/exercise-library/yoga.mjs",
  "knowledge/exercise-library/pilates.mjs",
  "knowledge/exercise-library/calisthenics.mjs",
  "knowledge/exercise-library/stretching.mjs",
  /* Imported lazily at index.html:19140 for the cardio modes and the swap
     alternatives. Lazy is exactly why it was missed: nothing throws until
     somebody opens cardio, so a build without it looks fine right up until a
     real person taps the thing. */
  "knowledge/exercise-library/cardio.mjs",
  "knowledge/anatomy/rive-body.mjs",
  "knowledge/anatomy/muscle-detail.mjs",
  "knowledge/anatomy/muscle-bounds.mjs",
  "knowledge/anatomy/assets/human_anatomy_advanced_v3.0.riv",
  /* The move rig and every animation. Left out of the bundle, the import of
     motion/index.mjs throws at runtime and the native app shows no figure at
     all, on any exercise. About 530 KB for the ten files below.

     Deliberately not shipped from this directory: reference/ (9.6 MB of
     source footage nothing loads), AUTHORING.md (internal authoring notes),
     validate.mjs (a build-time tool), and body3d/ (BODY3D is false, so it is
     never imported). */
  "knowledge/motion/index.mjs",
  "knowledge/motion/rig.mjs",
  "knowledge/motion/moves/calisthenics.mjs",
  "knowledge/motion/moves/idle.mjs",
  "knowledge/motion/moves/pilates.mjs",
  "knowledge/motion/moves/stretching.mjs",
  "knowledge/motion/moves/weight-training.mjs",
  "knowledge/motion/moves/weight-training-lower.mjs",
  "knowledge/motion/moves/weight-training-upper.mjs",
  "knowledge/motion/moves/yoga.mjs",
];
const DIRS = ["vendor", "badges"];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let copied = 0;
for (const file of ASSETS) {
  const src = join(root, file);
  if (!existsSync(src)) {
    console.warn(`skip (missing): ${file}`);
    continue;
  }
  mkdirSync(dirname(join(out, file)), { recursive: true });
  copyFileSync(src, join(out, file));
  copied++;
}

let filesCopied = 0;
for (const file of KNOWLEDGE_FILES) {
  const src = join(root, file);
  if (!existsSync(src)) {
    console.warn(`skip (missing): ${file}`);
    continue;
  }
  mkdirSync(dirname(join(out, file)), { recursive: true });
  copyFileSync(src, join(out, file));
  filesCopied++;
}

let dirsCopied = 0;
for (const dir of DIRS) {
  const src = join(root, dir);
  if (!existsSync(src)) {
    console.warn(`skip (missing): ${dir}/`);
    continue;
  }
  cpSync(src, join(out, dir), { recursive: true });
  dirsCopied++;
}

console.log(`synced ${copied}/${ASSETS.length} assets, ${filesCopied}/${KNOWLEDGE_FILES.length} knowledge files, and ${dirsCopied}/${DIRS.length} directories into www/`);

/* Every runtime import index.html makes has to exist in the bundle, and the
   lists above are hand-maintained, so they drift the moment somebody adds an
   import without thinking about the native build. That has now cost three
   separate features: quips.mjs (the character had no lines), knowledge/motion
   (no animations at all, on any exercise) and knowledge/equipment.mjs. Each one
   failed silently at runtime and looked like a rendering bug for days.

   Anything deliberately left out is named below, so the warning only ever
   fires for a genuine omission and stays worth reading. */
const NOT_SHIPPED = new Set([
  // Imported behind BODY3D, which is false: Mo saw the 3D bodies and said no.
  "knowledge/motion/body3d/mount.mjs",
]);
const html = readFileSync(join(root, "index.html"), "utf8");
/* Both spellings index.html uses: "./knowledge/..." and the root-relative
   "/mo-knowledge/engine/..." that the engine imports use. The check used to
   read only the first, which is how four engine modules the app imports at
   runtime (adapter, goal-engine, activity-session, alternatives) were reported
   "all present" while absent from the bundle: generate, the goal maths, the
   yoga builder and the no-equipment switch all threw on the phone. */
const imported = [...html.matchAll(/import\("(?:\.\/|\/)((?:mo-)?knowledge\/[^"]+)"\)/g)].map((m) => m[1]);
const missing = [...new Set(imported)]
  .filter((rel) => !NOT_SHIPPED.has(rel) && !existsSync(join(out, rel)));

if (missing.length) {
  console.warn("\n  WARNING: index.html imports these at runtime and they are not in www/:");
  for (const rel of missing) console.warn(`    ${rel}`);
  console.warn("  Add them to ASSETS or KNOWLEDGE_FILES, or the native app throws on load.\n");
} else {
  console.log(`checked ${new Set(imported).size} runtime imports, all present`);
}
