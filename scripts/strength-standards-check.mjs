/* The strength standards have to stay pinned to reality at three ends, and the
   numbers are easy to nudge without noticing what a nudge does at the bottom.
   The first version of this table read "Intermediate" for an untrained woman,
   which is the failure mode the whole feature exists to avoid, and it was
   caught by running this rather than by reading the numbers.

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

const grab = (re, what) => {
  const m = app.match(re);
  if (!m) { console.error(`${what} not found in index.html`); process.exit(1); }
  return m[0];
};
const S = new Function(`${grab(/const STRENGTH_STANDARDS = \{[\s\S]*?\n\};/, "STRENGTH_STANDARDS")} return STRENGTH_STANDARDS;`)();
const REF = new Function(`${grab(/const STRENGTH_REF_BW = \{[^}]*\};/, "STRENGTH_REF_BW")} return STRENGTH_REF_BW;`)();
/* The real function, lifted out of the app, so this tests what ships rather
   than a second copy of the arithmetic that can drift away from it. */
const thresholdLb = new Function(
  `${grab(/const STRENGTH_REF_BW = \{[^}]*\};/, "STRENGTH_REF_BW")}
   ${grab(/function strengthThresholdLb\([\s\S]*?\n\}/, "strengthThresholdLb")}
   return strengthThresholdLb;`)();

const L = ["Beginner", "Novice", "Intermediate", "Advanced", "Elite"];
/* Level for an absolute lift in lb at a given bodyweight, the way the app does
   it, rather than for a bare ratio. A ratio test cannot see a scaling bug. */
const levelFor = (lift, sex, liftLb, bw) => {
  const cuts = S[lift][sex].map((t) => thresholdLb(t, sex, bw));
  let i = 0;
  while (i < cuts.length && liftLb >= cuts[i]) i++;
  return L[i];
};

let bad = 0;
const check = (label, got, want) => {
  const pass = got === want;
  if (!pass) bad++;
  console.log(`${pass ? "ok  " : "FAIL"} ${label.padEnd(58)} ${got.padEnd(12)} want ${want}`);
};

/* ---- 1. Population anchors, at the reference bodyweight ---- */
console.log("Population anchors, at reference bodyweight");
for (const [lift, sex, ratio, want, why] of [
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
  ["squat", "Male", 2.83, "Elite", "JSAMS 90th"],
  ["squat", "Female", 2.26, "Elite", "JSAMS 90th"],
  ["bench", "Male", 1.95, "Elite", "JSAMS 90th"],
  ["bench", "Female", 1.35, "Elite", "JSAMS 90th"],
  ["deadlift", "Male", 3.25, "Elite", "JSAMS 90th"],
  ["deadlift", "Female", 2.66, "Elite", "JSAMS 90th"],
]) {
  const bw = REF[sex];
  check(`${lift} ${sex} ${ratio}x at ${bw} lb (${why})`, levelFor(lift, sex, ratio * bw, bw), want);
}

/* ---- 2. The allometric property itself ----
   The thing a ratio test cannot see. Two lifters of very different sizes who
   have achieved the SAME THING, by the two thirds law, must land on the same
   level. Under the old flat-multiple scaling these disagreed by a level at
   both ends, which is the bug this section exists to stop coming back. */
console.log("\nEqual achievement across bodyweight must give equal level");
for (const [lift, sex] of [["bench", "Male"], ["squat", "Male"], ["deadlift", "Male"], ["bench", "Female"], ["squat", "Female"]]) {
  const ref = REF[sex];
  for (const mult of S[lift][sex]) {
    /* Sit just above each threshold at the reference weight, then compute the
       allometrically equivalent lift at 60% and 160% of that bodyweight. */
    const atRef = mult * ref * 1.02;
    const want = levelFor(lift, sex, atRef, ref);
    for (const bw of [Math.round(ref * 0.6), Math.round(ref * 1.6)]) {
      const equivalent = atRef * Math.pow(bw / ref, 0.67);
      check(`${lift} ${sex} ${mult}x-equivalent at ${bw} lb`, levelFor(lift, sex, equivalent, bw), want);
    }
  }
}

/* ---- 3. Direction of the correction ----
   A heavier lifter must need a LOWER multiple of their own bodyweight for the
   same level, and a lighter one a higher multiple. If this ever flips, the
   exponent has been inverted. */
console.log("\nRelative strength must fall as bodyweight rises");
for (const [lift, sex] of [["bench", "Male"], ["squat", "Female"]]) {
  const ref = REF[sex];
  const mult = S[lift][sex][2];
  const light = thresholdLb(mult, sex, ref * 0.7) / (ref * 0.7);
  const heavy = thresholdLb(mult, sex, ref * 1.4) / (ref * 1.4);
  check(`${lift} ${sex}: light needs a bigger multiple than heavy`, light > heavy ? "yes" : "no", "yes");
}

/* ---- 4. Every level reachable, bands climbing ---- */
for (const [lift, bySex] of Object.entries(S)) {
  for (const [sex, cuts] of Object.entries(bySex)) {
    for (let i = 1; i < cuts.length; i++) {
      if (cuts[i] <= cuts[i - 1]) { console.log(`FAIL ${lift} ${sex}: threshold ${i} does not climb`); bad++; }
    }
  }
}

console.log(bad ? `\n${bad} FAILED` : "\nSTRENGTH STANDARDS PASS");
process.exit(bad ? 1 : 0);
