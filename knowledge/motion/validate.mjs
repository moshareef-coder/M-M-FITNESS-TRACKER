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
import { solvePose, samplePose, jointAngles, GROUND, PROP_TYPES, LOOPS, VIEWS, PRESETS } from "./rig.mjs";

const allowMissing = process.argv.includes("--allow-missing");
const verbose = process.argv.includes("--verbose");

// Anatomical limits. Everything here is DERIVED from the solved pose by
// rig.jointAngles, never read back off the authored numbers: a push-up
// legitimately carries hip -140 to cancel root.rot, and a twisted torso would
// make any screen-space measurement lie. jointAngles measures each limb against
// the torso's own axes, so it survives both.
//
// Totals are checked always. The signed components are checked only when the
// limb is actually swinging in the plane that gives them meaning, because
// otherwise their sign is a projection artefact: an arm abducted straight out
// to the side has no meaningful flexion, and saying it has 180 degrees of it
// would fail a Warrior II for no reason.
const RANGE = {
  shoulderTotal: [0, 192],
  hipTotal: [0, 158],
  shoulderElev: [-95, 196],
  // Negative is the arm crossing the midline, which a woodchopper, a torso
  // twist and a cross-body swing all do on purpose.
  shoulderAbd: [-95, 186],
  hipFlex: [-35, 150],
  // A curtsy lunge really does take the working leg across the midline, and a
  // sumo stance really is this wide once the frontal angle absorbs the stance.
  hipAbd: [-62, 92],
  elbowMag: [0, 168],
  kneeMag: [0, 157],
  elbowFlex: [-12, 168],
  kneeFlex: [-8, 157],
  ankleDorsi: [-62, 48],
  spine: [-45, 65],
  neck: [-55, 55],
};
// A front view move measures the same joints in the frontal plane, where an arm
// crossing the midline reads as large negative elevation.
const FRONT_RANGE = { shoulderElev: [-120, 196] };

// The new v2 channels. These are authored numbers rather than derived ones,
// because they have no separate existence in the geometry: a twist is only
// visible as its effect.
const CHANNELS = {
  spineTwist: [-55, 55],
  neckTwist: [-80, 80],
  pelvisTwist: [-180, 180],
  torsoRoll: [-45, 45],
  shoulderGirdleElevL: [-4, 9], shoulderGirdleElevR: [-4, 9],
  shoulderGirdleProtL: [-5, 8], shoulderGirdleProtR: [-5, 8],
  forearmPronL: [-95, 95], forearmPronR: [-95, 95],
  hipRotL: [-50, 65], hipRotR: [-50, 65],
  shoulderRotL: [-95, 95], shoulderRotR: [-95, 95],
  hipAbdL: [-40, 80], hipAbdR: [-40, 80],
  shoulderAbdL: [-45, 185], shoulderAbdR: [-45, 185],
  hipFwdL: [-180, 180], hipFwdR: [-180, 180],
  shoulderFwdL: [-180, 180], shoulderFwdR: [-180, 180],
};

// Below this, a joint's hinge is not lined up with the body's lateral axis and
// the sign of its flexion is a projection artefact, so only the magnitude gets
// checked. Above it, a backwards elbow is a real error.
const HINGE_MIN = 0.6;
// How far out of the sagittal plane a limb may swing before its signed flexion
// stops meaning anything.
// A limb more than this far out of the sagittal plane has no meaningful signed
// flexion: the atan2 that measures it is reading a component that is almost
// zero, and it snaps to 180 on the far side of nothing.
const PLANAR_MAX = 0.45;
// Shoulder extension past this is how a hand reaches a bar on the traps, which
// needs external rotation the sign convention cannot carry.
const SHOULDER_EXTENDED = -25;
const FLOOR_TOL = 1.0;
const SAMPLES = 24;

// atan2 hands back +/-180, so an arm straight overhead comes out as either
// +180 or -180 depending on a rounding error in its anterior component. Each
// signed angle gets wrapped into the 360 degree window centred on the middle of
// what that joint can do, which keeps overhead at 180 rather than -180.
const CENTRE = { shoulderElev: 50, shoulderAbd: 70, hipFlex: 57, hipAbd: 15, elbowFlex: 70, kneeFlex: 70, ankleDorsi: -6 };
const wrapC = (key, deg) => {
  const c = CENTRE[key];
  if (c === undefined) return deg;
  return c + (((deg - c + 180) % 360 + 360) % 360 - 180);
};

const errors = [];
const fail = (name, msg) => errors.push(`${name}: ${msg}`);

function checkRange(name, key, value0, where, view) {
  const value = wrapC(key, value0);
  const [lo, hi] = (view === "front" && FRONT_RANGE[key]) || RANGE[key] || [-1e9, 1e9];
  if (value < lo || value > hi) {
    const hint = (key === "kneeFlex" && value < lo) ? " (legs pin with bend -1)"
      : (key === "elbowFlex" && value < lo) ? " (arms pin with bend +1)" : "";
    fail(name, `${key} ${value.toFixed(0)} deg is outside ${lo}..${hi} ${where}${hint}`);
  }
}

function checkMove(name, move) {
  const v = move.view;
  const viewOk = typeof v === "object"
    ? (typeof v.yaw === "number" || typeof v.pitch === "number")
    : (v === undefined || VIEWS.includes(v));
  if (!viewOk) fail(name, `unknown view ${JSON.stringify(v)}`);
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

  if (move.litPeak !== undefined && !(move.litPeak >= 0 && move.litPeak <= 1)) {
    fail(name, `litPeak ${move.litPeak} is outside 0..1`);
  }
  if (move.litFloor !== undefined && !(move.litFloor >= 0 && move.litFloor <= 1)) {
    fail(name, `litFloor ${move.litFloor} is outside 0..1`);
  }
  for (const p of move.props || []) {
    if (!PROP_TYPES.includes(p.type)) fail(name, `unknown prop type "${p.type}"`);
  }

  // Sample the whole cycle, not just the keyframes: easing between two legal
  // poses can still swing a limb through the floor on the way.
  for (let i = 0; i < SAMPLES; i++) {
    const cycle = i / SAMPLES;
    const pose = samplePose(move, cycle, cycle * move.dur);
    const S = solvePose(pose, move.view);
    const A = jointAngles(S);
    const where = `at cycle ${cycle.toFixed(2)}`;

    checkRange(name, "spine", pose.joints.spine || 0, where, move.view);
    checkRange(name, "neck", pose.joints.neck || 0, where, move.view);
    for (const [ch, [lo, hi]] of Object.entries(CHANNELS)) {
      const v = pose.joints[ch];
      if (v === undefined) continue;
      if (v < lo || v > hi) fail(name, `${ch} ${v.toFixed(0)} is outside ${lo}..${hi} ${where}`);
    }

    for (const side of ["L", "R"]) {
      const a = A[side];
      const w = `${where} (${side})`;
      checkRange(name, "shoulderTotal", a.shoulderTotal, w, move.view);
      checkRange(name, "hipTotal", a.hipTotal, w, move.view);
      checkRange(name, "elbowMag", a.elbowMag, w, move.view);
      checkRange(name, "kneeMag", a.kneeMag, w, move.view);
      if (a.shoulderLat < PLANAR_MAX) checkRange(name, "shoulderElev", a.shoulderElev, w, move.view);
      if (Math.abs(a.shoulderAbd) > 1) checkRange(name, "shoulderAbd", a.shoulderAbd, w, move.view);
      if (a.hipLat < PLANAR_MAX) checkRange(name, "hipFlex", a.hipFlex, w, move.view);
      if (Math.abs(a.hipAbd) > 1) checkRange(name, "hipAbd", a.hipAbd, w, move.view);
      if (a.elbowHinge > HINGE_MIN && a.shoulderElev > SHOULDER_EXTENDED && move.view !== "front") {
        checkRange(name, "elbowFlex", a.elbowFlex, w, move.view);
      }
      if (a.kneeHinge > HINGE_MIN) checkRange(name, "kneeFlex", a.kneeFlex, w, move.view);
      const authoredFoot = move.feet && move.feet[side] && move.feet[side].ang !== undefined;
      if (!authoredFoot && a.kneeHinge > HINGE_MIN) checkRange(name, "ankleDorsi", a.ankleDorsi, w, move.view);
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
