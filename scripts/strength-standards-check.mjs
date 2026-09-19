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

/* ---- The dumbbell and machine variants ----
   Added once Mo settled what a logged dumbbell number means: ONE dumbbell, the
   way people say it. That makes the factor carry the doubling, and a wrong
   factor here is invisible by inspection, so it is pinned two ways.

   First, mechanically: a variant load at its factor must read the same level as
   the equivalent load on the base barbell lift. That is what catches the factor
   being applied upside down, which is the failure this file exists for.

   Second, against reality: a 180 lb man pressing a pair of 70s is a real thing
   with a known feel, and it should not come back Elite. */
const LS = new Function(`${grab(/const LIFT_STANDARDS = \{[\s\S]*?\n\};/, "LIFT_STANDARDS")} return LIFT_STANDARDS;`)();

const variantLevel = (liftName, sex, liftLb, bw) => {
  const [base, factor] = LS[liftName];
  const cuts = S[base][sex].map((t) => thresholdLb(t, sex, bw) * factor);
  let i = 0;
  while (i < cuts.length && liftLb >= cuts[i]) i++;
  return L[i];
};

/* Every dumbbell entry, not a chosen few. A factor applied upside down is
   invisible by inspection and the table grew again the moment somebody asked
   why their legs carried no level, so the mechanical half is a loop over the
   table itself: add a row and it is held from the next run onwards. */
console.log("\nEvery dumbbell variant reads as its own base lift");
for (const name of Object.keys(LS).filter((k) => /dumbbell|goblet/.test(k))) {
  const [base, factor] = LS[name];
  for (const sex of ["Male", "Female"]) {
    const bw = REF[sex];
    for (const mult of S[base][sex]) {
      const load = thresholdLb(mult, sex, bw) * factor * 1.02;
      check(`${name} ${sex} at ${Math.round(load)} lb`,
        variantLevel(name, sex, load, bw), levelFor(base, sex, load / factor, bw));
    }
  }
}

for (const [name, load, bw, why] of [
  ["dumbbell bench press", 70, 180, "a pair of 70s at 180 lb"],
  ["dumbbell bench press", 100, 180, "a pair of 100s at 180 lb"],
  ["dumbbell shoulder press", 50, 180, "a pair of 50s overhead at 180 lb"],
  ["lat pulldown", 160, 180, "160 on the stack at 180 lb"],
  ["leg press", 400, 180, "400 on the sled at 180 lb"],
]) {
  const [base, factor] = LS[name];
  const equivalent = load / factor;
  check(`${name}: ${why} reads the same as ${Math.round(equivalent)} lb of ${base}`,
    variantLevel(name, "Male", load, bw), levelFor(base, "Male", equivalent, bw));
}

/* The reality anchors. These are judgement calls, written down so that moving a
   factor has to argue with them rather than slip past. */
check("a pair of 70s at 180 lb is not Elite", variantLevel("dumbbell bench press", "Male", 70, 180), "Intermediate");
check("a pair of 30s at 180 lb is a beginner", variantLevel("dumbbell bench press", "Male", 30, 180), "Beginner");
check("400 lb leg press at 180 lb is not Advanced", variantLevel("leg press", "Male", 400, 180), "Novice");
/* The lower-body dumbbells, anchored the same way. The goblet squat is the one
   to watch: it is a single implement held in two hands, so a factor that had
   been halved like the presses would read every one of these a level high. */
check("a 70 lb goblet squat at 180 lb", variantLevel("goblet squat", "Male", 70, 180), "Novice");
check("a 100 lb goblet squat at 180 lb", variantLevel("goblet squat", "Male", 100, 180), "Intermediate");
check("a pair of 70s on RDLs at 180 lb", variantLevel("dumbbell romanian deadlift", "Male", 70, 180), "Novice");
check("a pair of 100s on RDLs at 180 lb", variantLevel("dumbbell romanian deadlift", "Male", 100, 180), "Intermediate");
check("a pair of 50s on lunges at 180 lb", variantLevel("dumbbell lunge", "Male", 50, 180), "Novice");
check("a pair of 80s on lunges at 180 lb", variantLevel("dumbbell lunge", "Male", 80, 180), "Advanced");
check("a pair of 80s on decline at 180 lb", variantLevel("decline dumbbell press", "Male", 80, 180), "Intermediate");
check("an isolation move has no entry", LS["dumbbell curl"] ? "scored" : "unscored", "unscored");
check("a lateral raise has no entry", LS["lateral raise"] ? "scored" : "unscored", "unscored");

console.log(bad ? `\n${bad} FAILED` : "\nSTRENGTH STANDARDS PASS");
process.exit(bad ? 1 : 0);
