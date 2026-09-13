/* Bump the app version in the one place it has to move together.

     node scripts/bump-version.mjs            next build today
     node scripts/bump-version.mjs 2026.09.14.1   an exact version

   The version lives twice on purpose: sw.js names its cache with it, so a
   deploy drops the old cache, and index.html carries it so a running page can
   notice a newer build is out and reload onto it. That second half only works
   while the two agree. They drifted for eight deploys once and every launch
   thought it was stale. boot-check.mjs fails on drift now; this is the thing
   that stops it happening. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const swPath = join(root, "sw.js");
const appPath = join(root, "index.html");

const sw = readFileSync(swPath, "utf8");
const app = readFileSync(appPath, "utf8");
const current = (sw.match(/fit-together-([0-9.]+)/) || [])[1];
if (!current) { console.error("no cache version found in sw.js"); process.exit(1); }

function nextVersion(from) {
  const now = new Date();
  const today = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  // Same day carries on counting; a new day starts at 1.
  const m = from.match(/^(\d{4}\.\d{2}\.\d{2})\.(\d+)$/);
  return m && m[1] === today ? `${today}.${Number(m[2]) + 1}` : `${today}.1`;
}

const target = process.argv[2] || nextVersion(current);
if (!/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(target)) {
  console.error(`not a version: ${target}`);
  process.exit(1);
}

writeFileSync(swPath, sw.replace(/fit-together-[0-9.]+/, `fit-together-${target}`));
writeFileSync(appPath, app.replace(/const APP_VERSION = "[^"]+"/, `const APP_VERSION = "${target}"`));
console.log(`${current} -> ${target}  (sw.js cache and index.html APP_VERSION)`);
