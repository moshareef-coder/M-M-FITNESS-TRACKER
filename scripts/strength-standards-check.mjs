/* The strength standards have to stay pinned to reality at three ends, and the
   numbers are easy to nudge without noticing what a nudge does at the bottom.
   The first version of this table read "Intermediate" for an untrained woman,
   which is the failure mode the whole feature exists to avoid, and it was
   caught by this check rather than by looking at it.

     node scripts/strength-standards-check.mjs

   Anchors, with sources:
   - Untrained, "the majority of the population" (Symmetric Strength): a 180 lb
     man squats 135, benches 100, pulls 155; a 130 lb woman 80 / 55 / 95.
   - Median and 90th percentile of drug tested unequipped competitors:
     JSAMS 2024, 809,986 competition entries, ages 18 to 35.
   Read against index.html itself so the shipped table is the one tested. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = readFileSync(join(root, "index.html"), "utf8");

const block = app.match(/const STRENGTH_STANDARDS = \{[\s\S]*?\n\};/);
if (!block) { console.error("STRENGTH_STANDARDS not found in index.html"); process.exit(1); }
const S = new Function(`${block[0]} return STRENGTH_STANDARDS;`)();
const L = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"];
const lvl = (k, sex, r) => { let i = 0; const c = S[k][sex]; while (i < c.length && r >= c[i]) i++; return L[i]; };

const cases = [
  ["bench", "Male", 0.56, "Beginner", "untrained"],
  ["bench", "Female", 0.42, "Beginner", "untrained"],
  ["squat", "Male", 0.75, "Beginner", "untrained"],
  ["squat", "Female", 0.62, "Beginner", "untrained"],
  ["deadlift", "Male", 0.86, "Beginner", "untrained"],
  ["deadlift", "Female", 0.73, "Beginner", "untrained"],
  ["bench", "Male", 1.20, "Intermediate", "2 to 4 years trained"],
  ["squat", "Male", 1.65, "Intermediate", "2 to 4 years trained"],
  ["deadlift", "Male", 2.00, "Intermediate", "2 to 4 years trained"],
  ["bench", "Male", 1.56, "Advanced", "median competitor"],
  ["bench", "Female", 0.96, "Advanced", "median competitor"],
  ["squat", "Male", 2.83, "Elite", "JSAMS 90th percentile"],
  ["squat", "Female", 2.26, "Elite", "JSAMS 90th percentile"],
  ["bench", "Male", 1.95, "Elite", "JSAMS 90th percentile"],
  ["bench", "Female", 1.35, "Elite", "JSAMS 90th percentile"],
  ["deadlift", "Male", 3.25, "Elite", "JSAMS 90th percentile"],
  ["deadlift", "Female", 2.66, "Elite", "JSAMS 90th percentile"],
];

let bad = 0;
for (const [k, sex, r, want, why] of cases) {
  const got = lvl(k, sex, r);
  const pass = got === want;
  if (!pass) bad++;
  console.log(`${pass ? "ok  " : "FAIL"} ${k.padEnd(9)} ${sex.padEnd(6)} ${String(r).padEnd(5)} -> ${got.padEnd(12)} want ${want.padEnd(12)} ${why}`);
}

/* Every level must be reachable and the bands must climb. A typo that puts a
   threshold below the one before it makes a level impossible to ever hold. */
for (const [lift, bySex] of Object.entries(S)) {
  for (const [sex, cuts] of Object.entries(bySex)) {
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] <= cuts[i - 1]) { console.log(`FAIL ${lift} ${sex}: threshold ${i} does not climb`); bad++; }
    }
  }
}

console.log(bad ? `\n${bad} FAILED` : "\nSTRENGTH STANDARDS PASS");
process.exit(bad ? 1 : 0);
