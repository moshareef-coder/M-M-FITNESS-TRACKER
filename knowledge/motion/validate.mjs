// Gate for authored motion data. Run it before every commit that touches
// knowledge/motion:
//
//   node knowledge/motion/validate.mjs               (strict)
//   node knowledge/motion/validate.mjs --allow-missing
//
// --allow-missing is for now, while most of the library has no animation: it
// turns "this exercise has no move" into a warning so the check is still useful
// for catching real breakage. Drop the flag once the batches land.
//
// What it actually protects against, in the order these bit me:
//   1. a move keyed to a name that is not in the library (silently never shows)
//   2. a limb through the floor, which is invisible in the keyframe numbers and
//      obvious in the render
//   3. joint angles no human joint reaches, which is how a pose ends up looking
//      broken rather than stylised
//   4. a prop type nothing draws, which fails silently

import { TRAININGS } from "../exercise-library/index.mjs";
import { MOVES_BY_LIBRARY, MOVE_NAMES } from "./index.mjs";
import { solvePose, samplePose, GROUND, PROP_TYPES, LOOPS, VIEWS } from "./rig.mjs";

const allowMissing = process.argv.includes("--allow-missing");
const verbose = process.argv.includes("--verbose");

// Anatomical limits, in degrees, on angles DERIVED from the solved pose rather
// than on the authored numbers. Authored hip angles are relative to the pelvis,
// so a push-up legitimately carries hip: -140 to cancel root.rot; what matters
// is the angle between the torso and the thigh, which is 0 there.
const RANGE = {
  hipFlex: [-35, 150],      // + = thigh toward the chest
  kneeFlex: [-8, 155],      // + = heel toward the glute
  shoulderElev: [-95, 196], // + = arm away from the torso, 180 = straight overhead
  elbowFlex: [-12, 168],
  ankleDorsi: [-58, 46],    // + = toes up
  spine: [-45, 65],
  neck: [-55, 55],
};

// The front view measures the same joints in the frontal plane, where two
// things the side view cannot do become legal:
//
//   shoulderElev below zero is the arm ADDUCTING across the chest. Pallof
//   press, woodchopper, Russian twist, cross-body swings and thread the needle
//   all put a hand at or past the midline, which reads as roughly -60 to -110
//   of elevation on the adduction side. In the side view a number like that
//   would be shoulder extension no shoulder reaches, so the limit stays tight
//   there.
//
// The same goes for the elbow, and not only in the front view: see
// MAGNITUDE_ONLY below.
const FRONT_RANGE = {
  shoulderElev: [-120, 196],
};

// When the elbow's projected fold direction is an artefact of the view rather
// than an anatomical fact, check how far the elbow is bent and not which way it
// appears to bend. Two cases:
//
//   front view, because the rig has no humeral rotation: an internally rotated
//   arm folds toward the midline and an externally rotated one folds away, and
//   both project into the frontal plane with opposite signs.
//
//   any view with the shoulder extended behind the torso, which is how a hand
//   reaches a bar racked on the traps. Reaching back and folding the forearm up
//   to the bar needs external rotation the rig cannot carry, so the fold reads
//   as negative in the chain even though the elbow is closing normally.
//
// The magnitude cap still applies, so an impossible 175 degree fold is still
// caught. What this gives up is catching a forearm that folds the wrong way in
// those two cases, which is a contact sheet job, not a numbers job.
const SHOULDER_EXTENDED = -25;
const FLOOR_TOL = 1.0;      // a joint centre this far below GROUND is a clip
const SAMPLES = 24;

// Wrap each angle into the 360 degree window centred on the middle of what the
// joint can do, not into -180..180. An arm straight overhead is 183 degrees of
// elevation, and a plain wrap turns that into -177 and reports a broken figure.
// The centre also has to leave room for the widest legal value of each joint,
// or a real angle wraps out the far side of its own window: with shoulderElev
// centred at 67 an arm adducted to -120 came back as +240 and failed for the
// wrong reason.
const CENTRE = { hipFlex: 57, kneeFlex: 73, shoulderElev: 40, elbowFlex: 0, ankleDorsi: -6, spine: 10, neck: 0 };
const wrap = (deg, key) => {
  const c = CENTRE[key] === undefined ? 0 : CENTRE[key];
  return c + (((deg - c + 180) % 360 + 360) % 360 - 180);
};
const R2D = 180 / Math.PI;

const errors = [];
const fail = (name, msg) => errors.push(`${name}: ${msg}`);

const wrap2 = (key, deg) => wrap(deg, key);

function checkRange(name, key, value, where, view) {
  const [lo, hi] = (view === "front" && FRONT_RANGE[key]) || RANGE[key];
  if (value < lo || value > hi) {
    const hint = (key === "kneeFlex" && value < lo) ? " (legs pin with bend -1)"
      : (key === "elbowFlex" && value < lo) ? " (arms pin with bend +1)" : "";
    fail(name, `${key} ${value.toFixed(0)} deg is outside ${lo}..${hi} ${where}${hint}`);
  }
}

function checkMove(name, move) {
  if (!VIEWS.includes(move.view)) fail(name, `unknown view "${move.view}"`);
  if (!LOOPS.includes(move.loop)) fail(name, `unknown loop "${move.loop}"`);
  if (!(move.dur > 0)) fail(name, "dur must be a positive number of seconds");

  const keys = move.keys || [];
  if (keys.length < 2) fail(name, "needs at least two keyframes");
  let prev = -1;
  for (const k of keys) {
    if (typeof k.t !== "number" || k.t < 0 || k.t > 1) fail(name, `keyframe t ${k.t} is outside 0..1`);
    if (k.t <= prev) fail(name, `keyframes are not sorted by t (${prev} then ${k.t})`);
    prev = k.t;
    if (!k.root) fail(name, "every keyframe needs a root");
  }
  if (keys.length && keys[0].t !== 0) fail(name, "first keyframe must be t 0");
  if (keys.length && keys[keys.length - 1].t !== 1) fail(name, "last keyframe must be t 1");

  for (const p of move.props || []) {
    if (!PROP_TYPES.includes(p.type)) fail(name, `unknown prop type "${p.type}"`);
  }

  // Sample the whole cycle, not just the keyframes: easing between two legal
  // poses can still swing a limb through the floor on the way.
  for (let i = 0; i < SAMPLES; i++) {
    const cycle = i / SAMPLES;
    const pose = samplePose(move, cycle, cycle * move.dur);
    const S = solvePose(pose, move.view);
    const where = `at cycle ${cycle.toFixed(2)}`;

    checkRange(name, "spine", wrap(pose.joints.spine || 0, "spine"), where, move.view);
    checkRange(name, "neck", wrap(pose.joints.neck || 0, "neck"), where, move.view);

    for (const side of ["L", "R"]) {
      const k = S.sides[side];
      checkRange(name, "hipFlex", wrap2("hipFlex", (k.legA + S.t) * R2D), `${where} (${side})`, move.view);
      checkRange(name, "kneeFlex", wrap2("kneeFlex", (k.legA - k.shinA) * R2D), `${where} (${side})`, move.view);
      const elev = wrap2("shoulderElev", (k.armA + S.t) * R2D);
      checkRange(name, "shoulderElev", elev, `${where} (${side})`, move.view);
      const flex = wrap2("elbowFlex", (k.foreA - k.armA) * R2D);
      const magnitudeOnly = move.view === "front" || elev < SHOULDER_EXTENDED;
      checkRange(name, "elbowFlex", magnitudeOnly ? Math.abs(flex) : flex, `${where} (${side})`, move.view);
      // A move that authors feet explicitly (front view, where a foot pointing
      // at the camera has to be drawn short rather than rotated) is making a
      // drawing decision, not an ankle angle, so there is nothing to check.
      const authoredFoot = move.feet && move.feet[side] && move.feet[side].ang !== undefined;
      if (!authoredFoot) {
        checkRange(name, "ankleDorsi", wrap2("ankleDorsi", (k.footA - k.shinA) * R2D - 90), `${where} (${side})`, move.view);
      }
    }

    if (move.allowBelowFloor) continue;
    const pts = { pelvis: S.pelvis, chest: S.chest, neck: S.neckTop, head: S.head };
    for (const side of ["L", "R"]) {
      for (const j of ["shoulder", "elbow", "wrist", "hand", "hip", "knee", "ankle", "toe", "heel"]) {
        pts[`${j}${side}`] = S.sides[side][j];
      }
    }
    for (const [label, p] of Object.entries(pts)) {
      if (p.y > GROUND + FLOOR_TOL) {
        fail(name, `${label} is ${(p.y - GROUND).toFixed(1)} below the floor ${where}`);
      }
    }
  }
}

// ---------------------------------------------------------------- report ----
const lines = [];
let authored = 0, missing = 0;

for (const training of TRAININGS) {
  const lib = MOVES_BY_LIBRARY[training.id] || {};
  const names = [];
  for (const cat of training.categories || []) for (const ex of cat.exercises || []) names.push(ex.name);
  const known = new Set(names);

  for (const key of Object.keys(lib)) {
    if (!known.has(key)) fail(key, `is not an exercise in the ${training.id} library (typo, or wrong file)`);
  }
  const gaps = names.filter((n) => !lib[n]);
  authored += names.length - gaps.length;
  missing += gaps.length;
  lines.push(`  ${training.id.padEnd(16)} ${String(names.length - gaps.length).padStart(3)} authored, ${String(gaps.length).padStart(3)} missing of ${names.length}`);
  if (verbose && gaps.length) {
    lines.push(`      next up: ${gaps.slice(0, 8).join(", ")}${gaps.length > 8 ? ", ..." : ""}`);
  }
}

for (const [id, lib] of Object.entries(MOVES_BY_LIBRARY)) {
  for (const [name, move] of Object.entries(lib)) checkMove(`${id}/${name}`, move);
}

console.log("motion validate\n");
console.log(lines.join("\n"));
if (errors.length) {
  console.log(`\n${errors.length} problem${errors.length === 1 ? "" : "s"}:`);
  for (const e of errors.slice(0, 40)) console.log(`  ${e}`);
  if (errors.length > 40) console.log(`  ... and ${errors.length - 40} more`);
}
if (missing && !allowMissing) {
  console.log(`\n${missing} library entries have no move. Pass --allow-missing while the batches are in flight.`);
}

const bad = errors.length;
console.log(`\nmotion: ${MOVE_NAMES.length} moves, ${missing} missing, ${bad} invalid`);
process.exit(bad || (missing && !allowMissing) ? 1 : 0);
