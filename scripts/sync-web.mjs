/* Copies the deployable web assets into www/ for the native wrapper.
   The web app itself still ships from the repo root on Vercel; www/ exists
   only so Capacitor has a self-contained bundle to embed in the app. */
import { mkdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
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

console.log(`synced ${copied}/${ASSETS.length} assets into www/`);
