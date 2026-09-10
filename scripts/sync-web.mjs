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

/* index.html fetches or dynamically imports these by root-relative path
   (/vendor/rive-2.42.0.wasm, /badges/*.webp, ./knowledge/formulas/*,
   ./knowledge/exercise-library/*, ./knowledge/anatomy/*, /mo-knowledge/engine/*),
   so the wrapped app needs them alongside index.html, not just on Vercel. */
const DIRS = ["knowledge", "mo-knowledge", "vendor", "badges"];

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

console.log(`synced ${copied}/${ASSETS.length} assets and ${dirsCopied}/${DIRS.length} directories into www/`);
