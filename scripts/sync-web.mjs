/* Copies the deployable web assets into www/ for the native wrapper.
   The web app itself still ships from the repo root on Vercel; www/ exists
   only so Capacitor has a self-contained bundle to embed in the app. */
import { mkdirSync, copyFileSync, cpSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "www");

const ASSETS = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
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
const KNOWLEDGE_FILES = [
  "mo-knowledge/engine/limits.mjs",
  "mo-knowledge/engine/joint-load.mjs",
  "mo-knowledge/engine/load.mjs",
  "knowledge/formulas/tdee.mjs",
  "knowledge/formulas/calorie-math.mjs",
  "knowledge/formulas/strength-math.mjs",
  "knowledge/exercise-library/index.mjs",
  "knowledge/exercise-library/weight-training.mjs",
  "knowledge/exercise-library/yoga.mjs",
  "knowledge/exercise-library/pilates.mjs",
  "knowledge/exercise-library/calisthenics.mjs",
  "knowledge/exercise-library/stretching.mjs",
  "knowledge/anatomy/rive-body.mjs",
  "knowledge/anatomy/muscle-detail.mjs",
  "knowledge/anatomy/muscle-bounds.mjs",
  "knowledge/anatomy/assets/human_anatomy_advanced_v3.0.riv",
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
