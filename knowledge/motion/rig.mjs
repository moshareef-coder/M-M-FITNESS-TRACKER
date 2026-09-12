// Fit Together: procedural mannequin rig, version 2.
//
// v1 was two dimensional: every joint rotated inside one plane, and a move
// picked which plane by picking a view. That got 262 moves drawn, and then hit
// a wall on everything that is made of rotation: twists, shrugs, palm up versus
// palm down, hip rotation, anything a three-quarter camera would show.
//
// v2 is a real skeleton in three dimensions, projected orthographically. The v1
// angle contract survives intact as the IN-PLANE component, so all 262 existing
// moves render unchanged (there is a harness for exactly that claim), and the
// new channels are the out-of-plane and axial components that were missing.
//
// ANGLE CONTRACT (unchanged from v1)
//   0 deg means "straight down" for a limb, "straight up" for the spine/neck.
//   Positive rotates toward the direction the figure faces, which is screen +x
//   in side view and away from the midline in front view.
//     shoulder / hip   0 = limb along the torso, + = swings forward or out
//     elbow / knee     0 = straight, + = flexion
//     wrist            0 = hand continues the forearm
//     ankle            0 = foot at 90 deg to the shin, + = toes up
//     spine / neck     + = forward flexion
//   root: {x, y, rot} is the pelvis in a 140x140 unit box, rot = pelvis tilt.
//   Floor is y = 118, a standing pelvis sits at y = 61.4.
//
// THE THIRD DIMENSION (all default 0, so old data is untouched)
//   Anatomical frame: X anterior (the way the figure faces), Y down, Z to the
//   figure's right. A move's `plane` decides which of those the authored
//   in-plane angles rotate in: sagittal (X,Y) for side views, frontal (Z,Y) for
//   front views. Everything below is named for the anatomy, not the plane, so
//   it means the same thing whichever view the move uses.
//
//     spineTwist, pelvisTwist, neckTwist   axial rotation, + = turning the
//                                          front of the body toward its right
//     torsoRoll                            lateral flexion, + = toward its right
//     shoulderFwdL/R, hipFwdL/R            anatomical flexion, added to the
//                                          in-plane angle when they coincide
//     shoulderAbdL/R, hipAbdL/R            abduction away from the midline
//     shoulderRotL/R, hipRotL/R            axial rotation of the limb,
//                                          + = external (clamshell opens)
//     forearmPronL/R                       + = pronation (palm turns to face
//                                          back/down), - = supination
//     shoulderGirdleElevL/R                shrug, in units not degrees
//     shoulderGirdleProtL/R                protraction, units, + = forward
//
// THE CAMERA
//   view: "side" | "front" | "back" | "top", or { yaw, pitch, plane }.
//   yaw and pitch are degrees away from the move's own plane, so 0,0 is always
//   exactly what v1 drew. yaw 30 is the three-quarter view illustrators use.
//   Everything is depth sorted per frame, so limbs pass in front of and behind
//   the torso correctly at any angle, and a limb pointed at the camera
//   foreshortens instead of being drawn at full length.
//
// Deno-safe and browser-safe: nothing here touches window or document at module
// scope, so validate.mjs can import it under plain node.

export const VB = 140;      // drawing box, in figure units
export const GROUND = 118;  // floor line, in figure units
export const CENTER_X = 70; // the camera orbits this vertical line
export const CENTER_Y = 78;

const D = (d) => (d * Math.PI) / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ------------------------------------------------------------- 3D basics ----
const V3 = (x, y, z) => ({ x, y, z });
const add3 = (a, b) => V3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub3 = (a, b) => V3(a.x - b.x, a.y - b.y, a.z - b.z);
const scl3 = (a, k) => V3(a.x * k, a.y * k, a.z * k);
const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const len3 = (a) => Math.hypot(a.x, a.y, a.z);
const cross3 = (a, b) => V3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const norm3 = (a) => { const L = len3(a) || 1; return V3(a.x / L, a.y / L, a.z / L); };
const lerp3 = (a, b, t) => V3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

// A frame is three world-space basis vectors. For a bone, y runs along it from
// the parent joint to the child joint; x is the anterior face, z is lateral.
const FRAME = () => ({ x: V3(1, 0, 0), y: V3(0, 1, 0), z: V3(0, 0, 1) });
const cloneF = (F) => ({ x: F.x, y: F.y, z: F.z });
const local = (F, v) => add3(add3(scl3(F.x, v.x), scl3(F.y, v.y)), scl3(F.z, v.z));
// Express a world vector in a frame's own axes. Used by the validator to read a
// joint angle out of the pose no matter how the parent is twisted.
const unlocal = (F, v) => V3(dot3(F.x, v), dot3(F.y, v), dot3(F.z, v));

function rotX(F, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: F.x, y: add3(scl3(F.y, c), scl3(F.z, s)), z: sub3(scl3(F.z, c), scl3(F.y, s)) };
}
function rotY(F, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { y: F.y, z: add3(scl3(F.z, c), scl3(F.x, s)), x: sub3(scl3(F.x, c), scl3(F.z, s)) };
}
function rotZ(F, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { z: F.z, x: add3(scl3(F.x, c), scl3(F.y, s)), y: sub3(scl3(F.y, c), scl3(F.x, s)) };
}

// The in-plane rotation, which is the whole of the v1 contract. Sagittal moves
// rotate about Z (lateral axis), frontal moves about X (anterior axis), and the
// side sign is what makes "away from the midline" mean opposite things left and
// right.
const inPlane = (F, a, frontal, side) => (frontal ? rotX(F, side * a) : rotZ(F, -a));
// The out-of-plane partner of the above.
const outPlane = (F, a, frontal, side) => (frontal ? rotZ(F, -a) : rotX(F, side * a));
// Axial rotation of a limb: + is external rotation, mirrored for the left side.
const axial = (F, a, side) => rotY(F, -side * a);

// ------------------------------------------------------------ proportions ---
// Roughly 7 heads tall. Radii are the half thickness at each joint. Segments
// with a mid entry are drawn as a three circle chain so the belly of the muscle
// is wider than its ends.
// v3 proportions. Measured against standard adult fractions of stature, with
// the hip height (thigh + shin + ankle = 56.4) pinned as the anchor, which puts
// stature at 56.4 / 0.53 = 106.4 rig units. Everything else is checked against
// that: acromion 0.818H, head top 1.0H, hand 0.108H, foot 0.152H. Note the
// foot was already right: `foot` is ankle to toe and the heel adds 4 behind it,
// so the drawn foot is 16 units against a human 16.2.
//
// LEG LENGTHS AND HIP HEIGHT ARE DELIBERATELY UNCHANGED. Every authored move
// pins its feet in absolute units, so touching the legs would move 262 moves'
// contact points; touching the torso and head moves nothing that is pinned.
// The old figure's problem was never the legs: it was a head and neck stack of
// 28.1 units above the shoulder where a human carries 19.4, plus a torso that
// was 3.5 short. That reads as a child's proportions, which is most of what
// made it look like a doll.
export const BODY = {
  spine: 30, neck: 7.4, headOff: 8.0,
  upperArm: 20, forearm: 17, hand: 8.6,
  thigh: 27, shin: 25, foot: 12,
  rPelvis: 9.3, rWaist: 7.9, rChest: 12.3,
  rNeckTop: 4.2, rNeckBot: 5.6,
  rHeadBack: 7.3, rHeadJaw: 5.4,
  rShoulder: 7.0, rDelt: 8.1, rElbow: 5.4, rWrist: 4.0,
  rUpperArmMid: 6.6, rForearmMid: 5.2,
  rHandA: 4.0, rHandB: 2.9, rThumb: 2.1,
  rHip: 8.0, rThighMid: 8.7, rKnee: 6.3,
  rCalf: 6.9, rAnkle: 4.4, rToe: 3.2, rHeel: 4.0,
  shoulderW: 13.4, hipW: 6.2, depth: 1.7,
  // hand v2
  palm: 5.0, palmHalf: 2.9, finger: 4.4, rPalm: 3.0, rFinger: 2.4, thumb: 5.0,
};
export const LEG_TO_FLOOR = BODY.thigh + BODY.shin + BODY.rAnkle;

// A canonical figure at rest, for placeholders, empty states and anything that
// wants a person rather than an exercise. Not a library move and not something
// an authored move should import: it is the reference posture.
//
// Nobody stands like a diagram. The pelvis tilts back a couple of degrees, the
// upper spine curves forward over it, the head sits back on that, the elbows
// carry a few degrees of flexion, the knees are soft rather than locked and the
// feet are not quite level. Every one of those is small, and together they are
// the difference between standing and being stood up.
export function restPose(view = "side") {
  const frontal = view !== "side";
  const sway = (a, b) => [
    { t: 0, root: a.root, joints: a.joints, ik: a.ik },
    { t: 1, root: b.root, joints: b.joints, ik: b.ik },
  ];
  const side = {
    root: { x: 70, y: STAND_Y + 0.3, rot: -2 },
    joints: {
      spine: 5, neck: -4,
      shoulderR: -7, elbowR: 15, wristR: 9,
      shoulderL: -5, elbowL: 12, wristL: 7,
      hipR: 3, kneeR: 5, ankleR: -1,
      hipL: -2, kneeL: 4, ankleL: 1,
    },
  };
  const side2 = {
    root: { x: 70, y: STAND_Y + 0.7, rot: -1 },
    joints: {
      spine: 4, neck: -3,
      shoulderR: -6, elbowR: 17, wristR: 10,
      shoulderL: -4, elbowL: 14, wristL: 8,
      hipR: 3, kneeR: 4, ankleR: -1,
      hipL: -2, kneeL: 3, ankleL: 1,
    },
  };
  const front = {
    root: { x: 70, y: STAND_Y + 0.3, rot: 1 },
    joints: {
      spine: 0, neck: 1,
      shoulderR: 7, elbowR: 11, wristR: -4,
      shoulderL: 6, elbowL: 9, wristL: -3,
      hipR: 5, hipL: 4, kneeR: 3, kneeL: 4,
    },
    ik: { ankleR: { x: 77, y: 113.7, bend: -1 }, ankleL: { x: 63, y: 113.7, bend: -1 } },
  };
  const front2 = {
    root: { x: 70, y: STAND_Y + 0.8, rot: 0 },
    joints: {
      spine: 1, neck: 0,
      shoulderR: 8, elbowR: 13, wristR: -4,
      shoulderL: 7, elbowL: 11, wristL: -3,
      hipR: 5, hipL: 4, kneeR: 2, kneeL: 3,
    },
    ik: { ankleR: { x: 77, y: 113.7, bend: -1 }, ankleL: { x: 63, y: 113.7, bend: -1 } },
  };
  return {
    view: view === "back" ? "front" : view,
    facing: view === "back" ? "away" : undefined,
    loop: "hold", dur: 7, breath: 0.7, breathRate: 0.7,
    feet: frontal ? { R: { ang: 11, len: 0.42, w: 1.3 }, L: { ang: 13, len: 0.42, w: 1.3 } } : undefined,
    keys: frontal ? sway(front, front2) : sway(side, side2),
  };
}
export const STAND_Y = GROUND - LEG_TO_FLOOR; // 61.4

// ------------------------------------------------------------------ colour --
function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// Returns hex, not rgb(), so the result can be fed straight back into mix().
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  const c = A.map((v, i) => clamp(Math.round(v + (B[i] - v) * t), 0, 255));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export const THEMES = {
  dark: { bg: "#0b0d11", surface: "#14171d", baseInk: "#e9eef8" },
  light: { bg: "#f5f7fa", surface: "#ffffff", baseInk: "#252d3a" },
};
export const ACCENTS = {
  action: { dark: { accent: "#a8ff00", accentInk: "#a8ff00" },
            light: { accent: "#3be76b", accentInk: "#0f7a38" } },
  stretch: { dark: { accent: "#2ea8ff", accentInk: "#6cc4ff" },
             light: { accent: "#0b7fc7", accentInk: "#0a6ba8" } },
};
export const SKINS = ["mannequin", "anatomy"];

export function palette(theme = "dark", accent = "action", skin = "mannequin") {
  const dark = theme !== "light";
  const T = dark ? THEMES.dark : THEMES.light;
  const A = typeof accent === "string"
    ? (ACCENTS[accent] || ACCENTS.action)[dark ? "dark" : "light"]
    : accent;
  const tint = dark ? A.accent : A.accentInk;
  const ink = mix(T.baseInk, tint, dark ? 0.085 : 0.06);
  const skinBase = dark ? "#dcdfea" : "#b9bfcd";
  return {
    skin,
    bg: T.bg,
    surface: T.surface,
    ink: skin === "anatomy" ? skinBase : ink,
    mannequinInk: ink,
    plate: dark ? "#232a31" : "#2b323b",
    plateFar: dark ? "#1a2027" : "#555d6a",
    seam: skin === "anatomy" ? (dark ? "#dcdfea" : "#cfd4de") : T.bg,
    inkHi: skin === "anatomy" ? (dark ? mix(skinBase, "#ffffff", 0.3) : mix(skinBase, "#ffffff", 0.35))
      : (dark ? mix(ink, "#ffffff", 0.16) : mix(ink, T.bg, 0.14)),
    far: skin === "anatomy" ? (dark ? mix(T.bg, skinBase, 0.46) : mix(skinBase, T.bg, 0.30))
      : (dark ? mix(T.bg, ink, 0.46) : mix(ink, T.bg, 0.52)),
    shade: dark ? "rgba(9,11,15,0.26)" : "rgba(37,45,58,0.14)",
    // A crease is not a seam. Seams are where two pieces of armour meet; creases
    // are where skin folds, and they are thin, soft and only in the eight places
    // a body actually creases at this size.
    crease: dark ? "rgba(9,11,15,0.34)" : "rgba(37,45,58,0.20)",
    hair: dark ? "rgba(9,11,15,0.20)" : "rgba(37,45,58,0.13)",
    shadeSoft: dark ? "rgba(9,11,15,0.17)" : "rgba(37,45,58,0.09)",
    edge: T.bg,
    accent: A.accent,
    accentInk: A.accentInk,
    line: dark ? A.accent : A.accentInk,
    prop: dark ? mix(T.bg, "#93a3b8", 0.55) : mix(T.surface, "#3c4757", 0.42),
    propTop: dark ? mix(T.bg, "#c3d0e0", 0.78) : mix(T.surface, "#56637a", 0.66),
    propDark: dark ? mix(T.bg, "#93a3b8", 0.32) : mix(T.surface, "#3c4757", 0.62),
  };
}

// ------------------------------------------------------------- the camera ---
// A move is authored in a plane. The camera starts looking straight at that
// plane (yaw 0, pitch 0), which reproduces v1 exactly, and yaw/pitch orbit away
// from it. Presets are just named yaw/pitch/plane triples.
export const VIEWS = ["side", "front", "back", "top"];
export const PRESETS = {
  side: { plane: "sagittal", yaw: 0, pitch: 0 },
  front: { plane: "frontal", yaw: 0, pitch: 0 },
  back: { plane: "frontal", yaw: 180, pitch: 0 },
  top: { plane: "sagittal", yaw: 0, pitch: -88 },
};

export function cameraFor(view) {
  if (!view) return { ...PRESETS.side, name: "side" };
  if (typeof view === "string") {
    const p = PRESETS[view] || PRESETS.side;
    return { ...p, name: view };
  }
  const plane = view.plane || (Math.abs(view.yaw || 0) > 45 ? "frontal" : "sagittal");
  return { plane, yaw: view.yaw || 0, pitch: view.pitch || 0, name: "custom" };
}

// Anatomical point to screen. Sagittal moves read X as screen x and Z as depth;
// frontal moves read Z as screen x and X as depth, which is what makes an
// authored front view come out the same as it did in v1.
function project(P, cam) {
  const frontal = cam.plane === "frontal";
  let sx = frontal ? P.z : P.x;
  let sy = P.y;
  let d = frontal ? P.x : P.z;
  if (cam.yaw) {
    const c = Math.cos(D(cam.yaw)), s = Math.sin(D(cam.yaw));
    const ox = sx - CENTER_X;
    sx = CENTER_X + ox * c + d * s;
    d = -ox * s + d * c;
  }
  if (cam.pitch) {
    const c = Math.cos(D(cam.pitch)), s = Math.sin(D(cam.pitch));
    const oy = sy - CENTER_Y;
    sy = CENTER_Y + oy * c + d * s;
    d = -oy * s + d * c;
  }
  return { x: sx, y: sy, d };
}
// The inverse for authored 2D targets, which always live in the move's plane.
function unproject(x, y, cam) {
  return cam.plane === "frontal" ? V3(0, y, x) : V3(x, y, 0);
}

// ---------------------------------------------------------------- solving ---
// The in-plane angles are absolute, exactly as v1 computed them (armA = torso
// angle + shoulder, and so on). The new channels ride on top as a carrier
// rotation that is passed down the chain, so with every new channel at zero the
// carrier is the identity and every joint lands on the v1 pixel.
function ikTarget(spec, ctx, cam) {
  if (!spec) return null;
  if (Array.isArray(spec)) return { p: unproject(spec[0], spec[1], cam), bend: spec[2] || 1 };
  if (spec.rel === "chest") {
    return { p: add3(ctx.chest, unproject(spec.x, spec.y, cam)), bend: spec.bend || 1, pole: spec.pole };
  }
  return { p: spec.z !== undefined ? V3(spec.x, spec.y, spec.z) : unproject(spec.x, spec.y, cam),
    bend: spec.bend || 1, pole: spec.pole, flat: spec.z === undefined };
}

// Two bone IK in three dimensions. The elbow (or knee) is placed on the circle
// of valid positions by a pole vector, which defaults to the plane normal so a
// planar move solves exactly where v1 put it.
function twoBone3(S, T, l1, l2, n, bend) {
  const u0 = sub3(T, S);
  const raw = len3(u0);
  const lo = Math.abs(l1 - l2) + 0.001, hi = l1 + l2 - 0.001;
  const u = norm3(raw < 0.0001 ? V3(0, 1, 0) : u0);
  const d = clamp(raw, lo, hi);
  const a = (l1 * l1 + d * d - l2 * l2) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let v = cross3(n, u);
  if (len3(v) < 0.0001) v = cross3(V3(0, 0, 1), u);
  v = norm3(v);
  // The reachable target: an out of range pin leaves the chain pointing at it
  // at full stretch (or fully folded), which is what v1 did and what a body
  // does. Returning the pin itself would tear the limb off.
  return { mid: add3(add3(S, scl3(u, a)), scl3(v, h * bend)), end: add3(S, scl3(u, d)) };
}

// Build an orthonormal frame for a bone whose direction came out of IK, using
// the solve plane's normal as the hinge axis. Projecting a reference vector
// instead looks equivalent and is not: it flips sign the moment the bone passes
// the perpendicular, which puts a hand on backwards halfway through a rep.
function frameFromDir(dir, n, frontal, side = 1) {
  const y = norm3(dir);
  let p = cross3(y, n);
  if (len3(p) < 0.0001) p = cross3(y, Math.abs(y.z) < 0.9 ? V3(0, 0, 1) : V3(1, 0, 0));
  p = norm3(p);
  // p is the axis the next joint hinges toward. Which slot it belongs in
  // depends on the plane, because the in-plane rotation is about Z for a
  // sagittal move and about X for a frontal one.
  // The frontal hinge axis flips with the side, because "away from the
  // midline" is opposite left and right.
  if (frontal) { const z = scl3(p, side); return { z, y, x: cross3(y, z) }; }
  return { x: p, y, z: cross3(p, y) };
}

// An authored 2D pin has no depth, so it means "in this limb's own plane":
// slide it out to the depth of the joint the chain hangs from. Without this an
// arm solved from a shoulder 11.5 units out to the side would swing inward to
// reach a target on the midline, and every existing move would shift.
function inLimbPlane(anchor, T, frontal) {
  return frontal ? V3(anchor.x, T.y, T.z) : V3(T.x, T.y, anchor.z);
}

const DOWN0 = { x: V3(1, 0, 0), y: V3(0, 1, 0), z: V3(0, 0, 1) };
const UP0 = { x: V3(1, 0, 0), y: V3(0, -1, 0), z: V3(0, 0, 1) };
const carry = (C, F) => ({ x: local(C, F.x), y: local(C, F.y), z: local(C, F.z) });

export function solvePose(pose, view) {
  const cam = cameraFor(view);
  const frontal = cam.plane === "frontal";
  const J = pose.joints || {};
  const R = pose.root || { x: CENTER_X, y: STAND_Y, rot: 0 };
  const ik = pose.ik || {};
  const breath = pose.breath || 0;
  const g = (k) => J[k] || 0;

  const rot = R.rot || 0;
  const t = rot + (J.spine || 0) + breath * 0.9;     // absolute torso angle
  const tn = t + (J.neck || 0);

  // carrier for everything above the pelvis
  let C = FRAME();
  if (g("pelvisTwist")) C = rotY(C, -D(g("pelvisTwist")));
  const pelvis = add3(unproject(R.x, R.y - breath * 0.35, cam), V3(0, 0, 0));

  // torso: y runs UP the body here, which is the one place v1's convention
  // flips. Keeping the flip is what keeps 262 moves on the same pixels.
  let Ft = carry(C, inPlane(UP0, D(t), frontal, 1));
  const spineLen = BODY.spine * (1 + breath * 0.012);
  const chest = add3(pelvis, scl3(Ft.y, spineLen));

  // carrier for the chest and everything hanging off it
  let Ct = C;
  if (g("torsoRoll")) Ct = rotX(Ct, D(g("torsoRoll")));
  if (g("spineTwist")) Ct = rotY(Ct, -D(g("spineTwist")));
  const Ftw = carry(Ct, inPlane(UP0, D(t), frontal, 1));   // twisted torso frame

  let Cn = Ct;
  if (g("neckTwist")) Cn = rotY(Cn, -D(g("neckTwist")));
  const Fn = carry(Cn, inPlane(UP0, D(tn), frontal, 1));
  const neckTop = add3(chest, scl3(Fn.y, BODY.neck));
  const head = add3(neckTop, scl3(Fn.y, BODY.headOff));

  const out = {
    view, cam, plane: cam.plane, frontal,
    t, tn, rot,
    chestR: BODY.rChest * (1 + breath * 0.02),
    facing: pose.facing || "toward",
    farSide: pose.farSide || null,
    frames: { torso: Ftw, neck: Fn, pelvis: carry(C, inPlane(DOWN0, D(rot), frontal, 1)) },
    p3: { pelvis, chest, neckTop, head },
    sides: {},
  };

  for (const s of ["L", "R"]) {
    const screenSign = s === "R" ? 1 : -1;
    const side = frontal ? screenSign : 1;      // v1's `sign`
    const lat = screenSign;                      // true anatomical side
    const K = {};

    // ---- shoulder anchor, including the girdle
    const girdleUp = g("shoulderGirdleElev" + s);
    const girdleFwd = g("shoulderGirdleProt" + s);
    let shoulder = add3(chest, scl3(Ftw.z, lat * BODY.shoulderW));
    if (!frontal) shoulder = add3(shoulder, scl3(Ftw.x, screenSign * BODY.depth));
    if (girdleUp) shoulder = add3(shoulder, scl3(Ftw.y, girdleUp));
    if (girdleFwd) {
      shoulder = add3(shoulder, scl3(Ftw.x, girdleFwd));
      shoulder = add3(shoulder, scl3(Ftw.z, -lat * girdleFwd * 0.35));
    }

    // ---- arm
    const armAbs = t + g("shoulder" + s) + g("shoulderFwd" + s);
    let Fa = carry(Ct, inPlane(DOWN0, D(armAbs), frontal, side));
    if (g("shoulderAbd" + s)) Fa = outPlane(Fa, D(g("shoulderAbd" + s)), frontal, side);
    if (g("shoulderRot" + s)) Fa = axial(Fa, D(g("shoulderRot" + s)), lat);
    let elbow = add3(shoulder, scl3(Fa.y, BODY.upperArm));
    let Ff = inPlane(Fa, D(g("elbow" + s)), frontal, side);
    let wrist = add3(elbow, scl3(Ff.y, BODY.forearm));

    const wIk = ikTarget(ik["wrist" + s], { chest }, cam);
    if (wIk) {
      const n = wIk.pole ? norm3(V3(wIk.pole[0], wIk.pole[1], wIk.pole[2]))
        : (frontal ? scl3(Ct.x, -side) : Ct.z);
      const wt = wIk.flat === false ? wIk.p : inLimbPlane(shoulder, wIk.p, frontal);
      const r = twoBone3(shoulder, wt, BODY.upperArm, BODY.forearm, n, wIk.bend);
      elbow = r.mid; wrist = r.end;
      Fa = frameFromDir(sub3(elbow, shoulder), n, frontal, side);
      Ff = frameFromDir(sub3(wrist, elbow), n, frontal, side);
    }
    let Fh = inPlane(Ff, D(g("wrist" + s)), frontal, side);
    if (g("forearmPron" + s)) Fh = rotY(Fh, -lat * D(g("forearmPron" + s)));
    const hand = add3(wrist, scl3(Fh.y, BODY.hand));

    // ---- leg
    const legAbs = rot + g("hip" + s) + g("hipFwd" + s);
    let Fl = carry(C, inPlane(DOWN0, D(legAbs), frontal, side));
    if (g("hipAbd" + s)) Fl = outPlane(Fl, D(g("hipAbd" + s)), frontal, side);
    if (g("hipRot" + s)) Fl = axial(Fl, D(g("hipRot" + s)), lat);
    // v1 hung the hip anchors off the torso angle rather than the pelvis, and
    // every authored move is calibrated to that. Kept deliberately.
    let hip = add3(pelvis, scl3(Ft.z, lat * BODY.hipW));
    if (!frontal) hip = add3(hip, scl3(Ft.x, screenSign * BODY.depth * 0.8));
    let knee = add3(hip, scl3(Fl.y, BODY.thigh));
    let Fs = inPlane(Fl, -D(g("knee" + s)), frontal, side);
    let ankle = add3(knee, scl3(Fs.y, BODY.shin));

    const aIk = ikTarget(ik["ankle" + s], { chest }, cam);
    if (aIk) {
      const n = aIk.pole ? norm3(V3(aIk.pole[0], aIk.pole[1], aIk.pole[2]))
        : (frontal ? scl3(C.x, -side) : C.z);
      const at = aIk.flat === false ? aIk.p : inLimbPlane(hip, aIk.p, frontal);
      const r = twoBone3(hip, at, BODY.thigh, BODY.shin, n, aIk.bend);
      knee = r.mid; ankle = r.end;
      Fl = frameFromDir(sub3(knee, hip), n, frontal, side);
      Fs = frameFromDir(sub3(ankle, knee), n, frontal, side);
    }

    // ---- foot
    const fm = (pose.feet && pose.feet[s]) || null;
    let Ffoot;
    if (fm && fm.ang !== undefined) {
      Ffoot = carry(C, inPlane(DOWN0, D(fm.ang), frontal, side));
    } else if (aIk && pose.flatFeet !== false) {
      // a pinned ankle means the foot is on the floor, so keep it flat there
      Ffoot = carry(C, inPlane(DOWN0, Math.PI / 2 + D(g("ankle" + s) * 0.25), frontal, side));
    } else {
      Ffoot = inPlane(Fs, Math.PI / 2 + D(g("ankle" + s)), frontal, side);
    }
    const footLen = BODY.foot * ((fm && fm.len) || 1);
    const toe = add3(ankle, scl3(Ffoot.y, footLen));
    const heel = add3(ankle, scl3(Ffoot.y, -4.0));

    Object.assign(K, {
      sign: side, screenSign, lat, footW: (fm && fm.w) || 1,
      armA: armAbs, foreA: armAbs + g("elbow" + s), handA: armAbs + g("elbow" + s) + g("wrist" + s),
      legA: legAbs, shinA: legAbs - g("knee" + s),
      frames: { arm: Fa, fore: Ff, hand: Fh, thigh: Fl, shin: Fs, foot: Ffoot },
      p3: { shoulder, elbow, wrist, hand, hip, knee, ankle, toe, heel },
    });
    out.sides[s] = K;
  }

  // ---- project everything into screen space; drawing stays 2D
  const pr = (p) => project(p, cam);
  // Projected basis vectors, deliberately NOT normalised: an axis pointing at
  // the camera comes back short, which is how foreshortening reaches the
  // drawing code for free.
  const prAxis = (o, F) => {
    const O = pr(o);
    const one = (v) => { const q = pr(add3(o, v)); return { x: q.x - O.x, y: q.y - O.y, d: q.d - O.d }; };
    return { x: one(F.x), y: one(F.y), z: one(F.z) };
  };
  out.pelvis = pr(pelvis); out.chest = pr(chest);
  out.neckTop = pr(neckTop); out.head = pr(head);
  out.torsoAxis = prAxis(chest, Ftw);
  out.neckAxis = prAxis(head, Fn);
  out.pelvisAxis = prAxis(pelvis, out.frames.pelvis);
  const anchorFor = { arm: "shoulder", fore: "elbow", hand: "wrist", thigh: "hip", shin: "knee", foot: "ankle" };
  for (const s of ["L", "R"]) {
    const K = out.sides[s];
    for (const key of Object.keys(K.p3)) K[key] = pr(K.p3[key]);
    K.axis = {};
    for (const [name, F] of Object.entries(K.frames)) K.axis[name] = prAxis(K.p3[anchorFor[name]], F);
  }
  return out;
}

// ---------------------------------------------------------------- drawing ---
const V = (x, y) => ({ x, y });
const add = (a, b) => V(a.x + b.x, a.y + b.y);
const sub = (a, b) => V(a.x - b.x, a.y - b.y);
const scl = (a, k) => V(a.x * k, a.y * k);
const lerpV = (a, b, t) => V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
const len2 = (a) => Math.hypot(a.x, a.y);
const norm2 = (a) => { const L = len2(a) || 1; return V(a.x / L, a.y / L); };

// A tapered capsule: the convex hull of two circles. This one primitive draws
// every limb, the torso and the neck.
function capsulePath(ctx, p0, r0, p1, r1) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const d = Math.hypot(dx, dy);
  ctx.beginPath();
  if (d < 0.001 || Math.abs(r0 - r1) >= d) {
    const big = r0 >= r1 ? [p0, r0] : [p1, r1];
    ctx.arc(big[0].x, big[0].y, big[1], 0, Math.PI * 2);
    return;
  }
  const a = Math.atan2(dy, dx);
  const phi = Math.acos((r0 - r1) / d);
  ctx.arc(p0.x, p0.y, r0, a + phi, a - phi + Math.PI * 2);
  ctx.arc(p1.x, p1.y, r1, a - phi, a + phi);
  ctx.closePath();
}

function shadeSide(p0, p1) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const d = Math.hypot(dx, dy) || 1;
  let nx = -dy / d, ny = dx / d;
  if (nx * 0.42 + ny * 0.91 < 0) { nx = -nx; ny = -ny; }
  return V(nx, ny);
}

// Stroke every segment first, then fill every segment, so the seam between them
// is painted over and the outline reads as one shape. Joints BETWEEN parts keep
// their seam on purpose: that thin dark line is what makes the figure read as
// articulated.
function part(ctx, C, pts, o = {}) {
  const fill = o.fill || C.ink;
  const segs = o.segs || (() => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) out.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]);
    return out;
  })();
  if (o.halo !== false) {
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = o.haloW || 3.4;
    ctx.lineJoin = "round";
    for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.stroke(); }
  }
  ctx.fillStyle = fill;
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.fill(); }
  if (o.shade !== false) {
    const a = pts[0], b = pts[pts.length - 1];
    const n = shadeSide(a[0], b[0]);
    const k = o.shadeOff === undefined ? 0.40 : o.shadeOff;
    const q = o.shadeR === undefined ? 0.50 : o.shadeR;
    ctx.fillStyle = o.shadeFill || C.shade;
    for (const g of segs) {
      capsulePath(ctx,
        V(g[0].x + n.x * g[1] * k, g[0].y + n.y * g[1] * k), g[1] * q,
        V(g[2].x + n.x * g[3] * k, g[2].y + n.y * g[3] * k), g[3] * q);
      ctx.fill();
    }
  }
}
const limb = (ctx, C, p0, r0, p1, r1, o) => part(ctx, C, [[p0, r0], [p1, r1]], o);

// A soft fold across a joint, drawn instead of a knockout seam. It appears only
// when the joint is actually bent, and deepens with the bend, because a straight
// limb has no crease and a line drawn across one reads as a scar. It also stops
// short of the silhouette edge so it never reads as a cut.
function crease(ctx, C, p, a, b, r, span = 0.5, w = 0.42) {
  const bend = Math.acos(clamp(a.x * b.x + a.y * b.y, -1, 1)) * 180 / Math.PI;
  if (bend < 12) return;
  const k = Math.min(1, (bend - 12) / 45);
  const n = V(-b.y, b.x);
  const L = r * span * (0.55 + 0.45 * k);
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.65 * k;
  capsulePath(ctx, V(p.x - n.x * L, p.y - n.y * L), w, V(p.x + n.x * L, p.y + n.y * L), w);
  ctx.fillStyle = C.crease;
  ctx.fill();
  ctx.restore();
}

// The convex hull of a set of circles, drawn as every pairwise capsule in one
// stroke-then-fill pass. This is what makes a palm a slab rather than a stick.
function hull(ctx, C, circles, o = {}) {
  const segs = [];
  for (let i = 0; i < circles.length; i++) {
    for (let j = i + 1; j < circles.length; j++) {
      segs.push([circles[i][0], circles[i][1], circles[j][0], circles[j][1]]);
    }
  }
  if (o.clip) {
    const p = new Path2D();
    for (const g of segs) capsulePathInto(p, g[0], g[1], g[2], g[3]);
    ctx.clip(p);
    return;
  }
  part(ctx, C, circles, { ...o, segs });
}

// capsulePath draws into the context; this draws the same geometry into a
// Path2D so it can be used as a clip region.
function capsulePathInto(path, p0, r0, p1, r1) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.001 || Math.abs(r0 - r1) >= d) {
    const big = r0 >= r1 ? [p0, r0] : [p1, r1];
    path.moveTo(big[0].x + big[1], big[0].y);
    path.arc(big[0].x, big[0].y, big[1], 0, Math.PI * 2);
    return;
  }
  const a = Math.atan2(dy, dx);
  const phi = Math.acos((r0 - r1) / d);
  path.moveTo(p0.x + Math.cos(a + phi) * r0, p0.y + Math.sin(a + phi) * r0);
  path.arc(p0.x, p0.y, r0, a + phi, a - phi + Math.PI * 2);
  path.arc(p1.x, p1.y, r1, a - phi, a + phi);
  path.closePath();
}

// ------------------------------------------------------------------ hands ---
// Five states. A hand on a bar is not a hand on the floor is not a hand hanging
// off a pull-up bar, and at 320px you can see the difference.
export const GRIPS = ["open", "flat", "closed", "fist", "hook"];
const GRIP_SPEC = {
  open:   { curl: 14, thumb: 44, fing: 1.00, over: 0.0 },
  flat:   { curl: 2, thumb: 22, fing: 1.06, over: 0.0 },
  closed: { curl: 92, thumb: 58, fing: 0.94, over: 0.45 },
  fist:   { curl: 142, thumb: 62, fing: 0.84, over: 0.55 },
  hook:   { curl: 104, thumb: 14, fing: 0.98, over: 0.1 },
};

// The mitt from v1, still used below 190px where fingers turn to porridge.
function drawMitt(ctx, S, side, C, fill, closed) {
  const B = BODY, k = S.sides[side];
  const d = norm2(k.axis.hand.y);
  const L = B.hand * (closed ? 0.66 : 0.98);
  const tip = add(k.wrist, scl(d, L));
  // The thumb rides the hand's real thumb side rather than whichever edge
  // happens to point up the screen. It is the only pronation cue that survives
  // at 160px, and it is what tells a wrist curl from a reverse wrist curl.
  const acr = k.axis.hand.x;
  let n = len2(acr) > 0.25 ? norm2(acr) : V(-d.y, d.x);
  if (len2(acr) <= 0.25 && n.y > 0) n = V(-n.x, -n.y);
  const base = add(k.wrist, scl(d, L * (closed ? 0.30 : 0.38)));
  const thumbRoot = add(base, scl(n, closed ? 1.4 : 1.8));
  const thumbTip = add(add(thumbRoot, scl(d, L * (closed ? 0.42 : 0.55))), scl(n, closed ? 0.6 : 1.5));
  part(ctx, C, [[k.wrist, B.rHandA], [lerpV(k.wrist, tip, 0.62), B.rHandA * 0.94],
                [tip, closed ? B.rHandB * 1.25 : B.rHandB]],
       { fill, shadeR: 0.42, shadeOff: 0.34 });
  part(ctx, C, [[thumbRoot, B.rThumb], [thumbTip, B.rThumb * 0.82]], { fill, shade: false, haloW: 2.6 });
  // two knuckle hints across the back of the hand. At 160px they are the only
  // thing that says hand rather than paddle.
  const kn = add(k.wrist, scl(d, L * 0.74));
  const across = V(-d.y, d.x);
  ctx.fillStyle = C.shade;
  for (const o of [-1, 1]) {
    const c0 = add(kn, scl(across, o * B.rHandB * 0.5));
    capsulePath(ctx, c0, B.rHandB * 0.34, add(c0, scl(d, B.rHandB * 0.5)), B.rHandB * 0.26);
    ctx.fill();
  }
}

function drawHand(ctx, S, side, C, fill, grip, detail) {
  const B = BODY, k = S.sides[side];
  if (!detail) return drawMitt(ctx, S, side, C, fill, grip === "closed" || grip === "fist" || grip === "hook");
  const spec = GRIP_SPEC[grip] || GRIP_SPEC.open;
  const A = k.axis.hand;
  const along = A.y;                       // wrist to knuckles, foreshortens
  const across = A.x;                      // thumb side of the palm
  const palmN = scl(A.z, -k.lat);          // the way the palm faces
  const W = k.wrist;
  const knuck = add(W, scl(along, B.palm));
  const hw = B.palmHalf;
  const kL = add(knuck, scl(across, -hw));
  const kR = add(knuck, scl(across, hw));
  // palm slab
  hull(ctx, C, [[W, B.rPalm * 0.94], [kL, B.rPalm], [kR, B.rPalm]],
       { fill, shadeR: 0.46, shadeOff: 0.34 });
  // four fingers as one block, in two phalanxes so a curl reads as a curl
  const c1 = D(spec.curl * 0.55), c2 = D(spec.curl);
  const dir1 = add(scl(along, Math.cos(c1)), scl(palmN, Math.sin(c1)));
  const dir2 = add(scl(along, Math.cos(c2)), scl(palmN, Math.sin(c2)));
  const fl = B.finger * spec.fing;
  const mL = add(kL, scl(dir1, fl * 0.55)), mR = add(kR, scl(dir1, fl * 0.55));
  const tL = add(mL, scl(dir2, fl * 0.55)), tR = add(mR, scl(dir2, fl * 0.55));
  hull(ctx, C, [[kL, B.rFinger], [kR, B.rFinger], [mL, B.rFinger], [mR, B.rFinger]],
       { fill, shade: false, haloW: 2.6 });
  hull(ctx, C, [[mL, B.rFinger * 0.94], [mR, B.rFinger * 0.94], [tL, B.rFinger * 0.86], [tR, B.rFinger * 0.86]],
       { fill, shadeR: 0.4, shadeOff: 0.3, haloW: 2.6 });
  // thumb, on the anterior edge of the palm, wrapping over for a closed grip
  const th = D(spec.thumb);
  const troot = add(add(W, scl(along, B.palm * 0.42)), scl(across, hw * 0.95));
  const tdir = add(add(scl(along, Math.cos(th)), scl(across, Math.sin(th))), scl(palmN, spec.over));
  const ttip = add(troot, scl(tdir, B.thumb));
  part(ctx, C, [[troot, B.rThumb], [ttip, B.rThumb * 0.84]], { fill, shade: false, haloW: 2.6 });
}

// A foot with a heel and a toe: instep from the ankle, sole along the ground,
// heel bump behind. Three circles, one silhouette.
function drawFoot(ctx, S, side, C, fill) {
  const B = BODY, k = S.sides[side];
  const w = k.footW;
  const d = norm2(sub(k.toe, k.heel));
  const mid = lerpV(k.ankle, k.toe, 0.45);
  part(ctx, C, [
    [add(k.heel, scl(d, -0.4)), B.rHeel * 1.04 * w],      // heel, squared off
    [add(k.ankle, scl(d, 0.4)), B.rAnkle * 1.02 * w],     // ankle and instep
    [mid, B.rToe * 1.16 * w],                             // arch into the ball
    [add(k.toe, scl(d, -0.8)), B.rToe * 1.22 * w],        // toe box, blunt
    [k.toe, B.rToe * 0.82 * w],
  ], { fill, shadeR: 0.44, shadeOff: 0.36 });
}

// Head: one silhouette with a hair mass and one soft shade. The v3 head carried
// an offset inner plate like every other segment, and on a head that plate sits
// exactly where a visor would, which is most of why the figure read as a space
// suit. Still faceless: the hairline is the only feature and it is a shape, not
// a face.
function drawHead(ctx, S, C, fill) {
  const B = BODY;
  const u = norm2(S.neckAxis.y), f = norm2(S.neckAxis.x);
  const flat = S.frontal;
  const away = S.facing === "away";
  const at = (up, fwd) => add(add(S.head, scl(u, up)), scl(f, fwd));
  const skull = flat
    ? [[at(2.4, 0), B.rHeadBack], [at(-1.0, 0), B.rHeadBack * 0.94],
       [at(-4.2, 0), away ? B.rHeadBack * 0.9 : B.rHeadBack * 0.78]]
    : [[at(1.9, -1.4), B.rHeadBack], [at(0.6, 2.0), B.rHeadBack * 0.84],
       [at(-3.4, 2.4), B.rHeadJaw], [at(-4.6, 3.4), B.rHeadJaw * 0.62]];
  hull(ctx, C, skull, { fill, shade: false });
  // one soft shade down the shaded side of the face and jaw, no hard edge
  const n = flat ? V(f.x, f.y) : V(f.x, f.y);
  const sd = (n.x * 0.42 + n.y * 0.91 < 0) ? -1 : 1;
  capsulePath(ctx,
    add(at(1.4, 0), scl(n, sd * B.rHeadBack * 0.34)), B.rHeadBack * 0.66,
    add(at(-3.2, flat ? 0 : 1.6), scl(n, sd * B.rHeadBack * 0.3)), B.rHeadJaw * 0.72);
  ctx.fillStyle = C.shade;
  ctx.fill();
  // hair: a mass over the cranium with a hairline, which is what stops a
  // faceless head reading as an egg
  const hair = flat
    ? [[at(3.0, 0), B.rHeadBack * 0.94], [at(0.4, 0), B.rHeadBack * 0.9]]
    : [[at(2.4, -1.8), B.rHeadBack * 0.9], [at(1.0, 0.4), B.rHeadBack * 0.82],
       [at(-1.6, -2.4), B.rHeadBack * 0.72]];
  const segs = [];
  for (let i = 0; i < hair.length - 1; i++) segs.push([hair[i][0], hair[i][1], hair[i + 1][0], hair[i + 1][1]]);
  ctx.save();
  hull(ctx, C, skull, { fill, halo: false, shade: false, clip: true });
  ctx.clip();
  ctx.fillStyle = C.hair;
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.fill(); }
  ctx.restore();
  const ears = flat ? (away ? [-1, 1] : []) : [-1];
  for (const sd2 of ears) {
    const ear = at(-0.2, sd2 * (flat ? B.rHeadBack * 0.84 : 1.9));
    capsulePath(ctx, ear, 2.2, add(ear, scl(u, -1.4)), 1.8);
    ctx.fillStyle = C.shade; ctx.fill();
  }
}

function drawArm(ctx, S, side, C, fill, grip, skinOpts, detail) {
  const B = BODY, k = S.sides[side];
  const d = norm2(sub(k.elbow, k.shoulder));
  part(ctx, C, [
    [add(k.shoulder, scl(d, -1.2)), B.rDelt],
    [add(k.shoulder, scl(d, 5.0)), B.rShoulder],
    [k.elbow, B.rElbow],
  ], { fill });
  part(ctx, C, [[k.elbow, B.rElbow], [lerpV(k.elbow, k.wrist, 0.3), B.rForearmMid], [k.wrist, B.rWrist]], { fill });
  if (skinOpts && skinOpts.plates) armPlates(ctx, S, side, C, skinOpts.lit);
  drawHand(ctx, S, side, C, fill, grip, detail);
}

// Hip, thigh and shin as one surface, with a crease at the knee.
function drawLeg(ctx, S, side, C, fill, skinOpts) {
  const B = BODY, k = S.sides[side];
  const sh = norm2(sub(k.ankle, k.knee));
  part(ctx, C, [
    [k.hip, B.rHip],
    [lerpV(k.hip, k.knee, 0.42), B.rThighMid],
    [lerpV(k.hip, k.knee, 0.86), B.rKnee * 1.1],
    [k.knee, B.rKnee],
    [lerpV(k.knee, k.ankle, 0.30), B.rCalf],
    [k.ankle, B.rAnkle],
  ], { fill, shadeOff: 0.42, shadeR: 0.52 });
  crease(ctx, C, k.knee, norm2(sub(k.knee, k.hip)), sh, B.rKnee, 0.56, 0.46);
  if (skinOpts && skinOpts.plates) legPlates(ctx, S, side, C, skinOpts.lit);
  drawFoot(ctx, S, side, C, fill);
}

// Three circles down the torso so the silhouette narrows at the waist, plus a
// soft chest plate. Flat two tone: a designed figure, not an anatomy chart.
function drawTorso(ctx, S, C, fill, skinOpts) {
  const B = BODY;
  // The neck flares into the shoulders instead of standing on them like a peg.
  // The wide bottom circle is the trapezius, and it is most of what stops the
  // head reading as a ball on a stick.
  const nu = norm2(S.torsoAxis.y);
  part(ctx, C, [
    [add(S.chest, scl(nu, -0.6)), B.rNeckBot * 1.12],
    [lerpV(S.chest, S.neckTop, 0.55), B.rNeckBot * 0.86],
    [S.neckTop, B.rNeckTop],
  ], { fill, shade: false });
  const waist = lerpV(S.pelvis, S.chest, 0.46);
  const fv = S.frontal;
  part(ctx, C, [[S.pelvis, B.rPelvis], [waist, B.rWaist], [S.chest, S.chestR]],
       { fill, shadeOff: fv ? 0.18 : 0.44, shadeR: fv ? 0.62 : 0.54 });
  if (skinOpts && skinOpts.plates) { torsoPlates(ctx, S, C, skinOpts.lit); return; }
  // A single soft mass under the collarbone gives the chest volume. It used to
  // be a hard edged capsule across the whole chest, which at 160px read as the
  // front panel of a vest.
  const u = norm2(S.torsoAxis.y), f = norm2(S.torsoAxis.x);
  const a = fv ? add(add(S.chest, scl(f, -4.6)), scl(u, -1.6))
               : add(add(S.chest, scl(f, 2.6)), scl(u, 0.4));
  const b = fv ? add(add(S.chest, scl(f, 4.6)), scl(u, -1.6))
               : add(add(S.chest, scl(f, 1.2)), scl(u, -5.0));
  ctx.save();
  ctx.globalAlpha = 0.62;
  capsulePath(ctx, a, fv ? 5.0 : 4.2, b, fv ? 5.0 : 4.6);
  ctx.fillStyle = C.shadeSoft; ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------- anatomy skin ---
export const MUSCLE_GROUPS = [
  "chest", "back", "lats", "shoulders", "traps", "biceps", "triceps", "forearms",
  "abs", "obliques", "lowerback", "glutes", "quads", "hamstrings", "calves",
];
// A muscle is not lit like a light switch. It fires through the rep and lets go
// at the other end, so the plate ramps between a resting tint and the caller's
// colour. The colour the app passes stays the PEAK colour; the resting tint is
// that colour mixed back toward the plate, so a lit muscle at rest still reads
// as the same muscle.
function litFill(group, C, lit) {
  if (!lit || !lit.color || !(lit.muscles || []).includes(group)) return C.plate;
  const i = lit.intensity === undefined ? 1 : clamp(lit.intensity, 0, 1);
  if (i >= 0.999 || !/^#[0-9a-fA-F]{6}$/.test(lit.color)) return lit.color;
  return mix(C.plate, lit.color, i);
}

// Effort over the cycle, 0 at rest and 1 at the working end of the movement.
//   pingpong  ramps to the far end of the rep and eases back: the bottom of a
//             squat, the top of a curl
//   hold      a slow breathing pulse, because a held position is still working
//   oneway    ramps through the drill and releases as it resets
// litPeak moves the peak (cycle position, default the far keyframe) and
// litFloor sets how bright a resting muscle stays.
export function litIntensity(move, cycle) {
  const floor = move.litFloor === undefined ? 0.35 : move.litFloor;
  const peak = move.litPeak === undefined ? (move.loop === "oneway" ? 0.82 : 0.5) : move.litPeak;
  const c = ((cycle % 1) + 1) % 1;
  let shape;
  if (move.loop === "hold") {
    shape = 0.5 - 0.5 * Math.cos((c - peak + 0.5) * Math.PI * 2);
  } else if (move.loop === "oneway") {
    shape = c <= peak ? c / Math.max(0.001, peak) : 1 - (c - peak) / Math.max(0.001, 1 - peak);
  } else {
    // Circular distance, so an off-centre peak still meets itself at the wrap.
    const d = Math.abs(c - peak);
    shape = 1 - Math.min(d, 1 - d) / 0.5;
  }
  shape = clamp(shape, 0, 1);
  const smooth = shape * shape * (3 - 2 * shape);
  return clamp(floor + (1 - floor) * smooth, 0, 1);
}

// A muscle plate: a chain of circles riding on a bone, drawn as one hull with a
// thin light seam. Shapes are taken from the purchased anatomy figure rather
// than invented, which is why they are chains and not ovals: a quad is a long
// tapering mass with a teardrop above the knee, a calf is a high belly running
// down to nothing, and a patch of colour in the middle of a limb reads as a
// sticker.
//
// `specs` are positions along the bone: at = fraction, w = fraction of the
// bone's radius, side = +1 front, -1 back, 0 centred. Front view collapses
// front and back onto each other, so everything there is centred.
function bonePlate(ctx, C, group, lit, p0, r0, p1, r1, face, specs) {
  const d = norm2(sub(p1, p0));
  let n = V(-d.y, d.x);
  if (n.x * face.x + n.y * face.y < 0) n = V(-n.x, -n.y);
  const circles = specs.map((sp) => {
    const p = lerpV(p0, p1, sp.at);
    const r = r0 + (r1 - r0) * sp.at;
    const o = r * (1 - sp.w) * (sp.side || 0);
    return [V(p.x + n.x * o, p.y + n.y * o), Math.max(0.6, r * sp.w)];
  });
  const segs = [];
  for (let i = 0; i < circles.length - 1; i++) {
    segs.push([circles[i][0], circles[i][1], circles[i + 1][0], circles[i + 1][1]]);
  }
  ctx.strokeStyle = C.seam;
  ctx.lineWidth = 1.1;
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.stroke(); }
  ctx.fillStyle = litFill(group, C, lit);
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.fill(); }
}

// A free plate that does not ride a bone: pecs, lats, abs. Same seam and fill.
function freePlate(ctx, C, group, lit, circles) {
  const segs = [];
  for (let i = 0; i < circles.length - 1; i++) {
    segs.push([circles[i][0], circles[i][1], circles[i + 1][0], circles[i + 1][1]]);
  }
  ctx.strokeStyle = C.seam;
  ctx.lineWidth = 1.1;
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.stroke(); }
  ctx.fillStyle = litFill(group, C, lit);
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.fill(); }
}

function armPlates(ctx, S, side, C, lit) {
  const B = BODY, k = S.sides[side];
  const flat = S.frontal;
  const face = flat ? V(0, 0) : k.axis.arm.x;
  const faceF = flat ? V(0, 0) : k.axis.fore.x;
  const sh = add(k.shoulder, scl(norm2(sub(k.elbow, k.shoulder)), -1.6));
  // deltoid: a cap over the joint that tapers a third of the way down the arm
  bonePlate(ctx, C, "shoulders", lit, sh, B.rDelt, k.elbow, B.rElbow, face, [
    { at: 0.0, w: 0.99, side: 0 }, { at: 0.12, w: 0.95, side: 0 },
    { at: 0.26, w: 0.78, side: 0 }, { at: 0.36, w: 0.5, side: 0 },
  ]);
  bonePlate(ctx, C, "biceps", lit, k.shoulder, B.rShoulder, k.elbow, B.rElbow, face,
    flat ? [{ at: 0.36, w: 0.66, side: 0 }, { at: 0.62, w: 0.74, side: 0 }, { at: 0.94, w: 0.5, side: 0 }]
         : [{ at: 0.34, w: 0.44, side: 1 }, { at: 0.6, w: 0.56, side: 1 }, { at: 0.93, w: 0.38, side: 1 }]);
  if (!flat) {
    bonePlate(ctx, C, "triceps", lit, k.shoulder, B.rShoulder, k.elbow, B.rElbow, face, [
      { at: 0.3, w: 0.4, side: -1 }, { at: 0.62, w: 0.5, side: -1 }, { at: 0.96, w: 0.34, side: -1 },
    ]);
  }
  // forearm: thick at the elbow, running out to nothing at the wrist
  bonePlate(ctx, C, "forearms", lit, k.elbow, B.rElbow, k.wrist, B.rWrist, faceF,
    flat ? [{ at: 0.04, w: 0.72, side: 0 }, { at: 0.3, w: 0.68, side: 0 }, { at: 0.82, w: 0.42, side: 0 }]
         : [{ at: 0.04, w: 0.64, side: 1 }, { at: 0.3, w: 0.6, side: 1 }, { at: 0.84, w: 0.36, side: 1 }]);
}

function legPlates(ctx, S, side, C, lit) {
  const B = BODY, k = S.sides[side];
  const flat = S.frontal;
  const face = flat ? V(0, 0) : k.axis.thigh.x;
  const faceS = flat ? V(0, 0) : k.axis.shin.x;
  bonePlate(ctx, C, "glutes", lit, k.hip, B.rHip, k.knee, B.rKnee, face,
    flat ? [{ at: 0.0, w: 0.84, side: 0 }, { at: 0.16, w: 0.72, side: 0 }, { at: 0.28, w: 0.46, side: 0 }]
         : [{ at: -0.04, w: 0.78, side: -1 }, { at: 0.14, w: 0.66, side: -1 }, { at: 0.3, w: 0.4, side: -1 }]);
  // quads: one long mass with the teardrop sitting just above the knee
  bonePlate(ctx, C, "quads", lit, k.hip, B.rHip, k.knee, B.rKnee, face,
    flat ? [{ at: 0.16, w: 0.66, side: 0 }, { at: 0.48, w: 0.78, side: 0 },
            { at: 0.74, w: 0.72, side: 0 }, { at: 0.88, w: 0.58, side: 0 }, { at: 0.96, w: 0.34, side: 0 }]
         : [{ at: 0.16, w: 0.48, side: 1 }, { at: 0.46, w: 0.6, side: 1 },
            { at: 0.74, w: 0.56, side: 1 }, { at: 0.88, w: 0.46, side: 1 }, { at: 0.96, w: 0.28, side: 1 }]);
  if (!flat) {
    bonePlate(ctx, C, "hamstrings", lit, k.hip, B.rHip, k.knee, B.rKnee, face, [
      { at: 0.26, w: 0.4, side: -1 }, { at: 0.56, w: 0.48, side: -1 },
      { at: 0.8, w: 0.42, side: -1 }, { at: 0.94, w: 0.26, side: -1 },
    ]);
  }
  // calf: belly high on the shin, tapering into the achilles
  bonePlate(ctx, C, "calves", lit, k.knee, B.rKnee, k.ankle, B.rAnkle, faceS,
    flat ? [{ at: 0.06, w: 0.56, side: 0 }, { at: 0.26, w: 0.76, side: 0 },
            { at: 0.5, w: 0.58, side: 0 }, { at: 0.78, w: 0.3, side: 0 }]
         : [{ at: 0.06, w: 0.5, side: -1 }, { at: 0.26, w: 0.68, side: -1 },
            { at: 0.5, w: 0.52, side: -1 }, { at: 0.8, w: 0.26, side: -1 }]);
}

function torsoPlates(ctx, S, C, lit) {
  const B = BODY;
  const P = S.pelvis, Ch = S.chest, rP = B.rPelvis, rC = S.chestR;
  const flat = S.frontal;
  const u = norm2(S.torsoAxis.y);
  // Lateral axis and anterior axis project to different things depending on the
  // view: front on, the anterior axis points at the camera and has no screen
  // direction at all, so the lateral one has to carry the layout.
  const lat = flat ? norm2(S.torsoAxis.z) : norm2(S.torsoAxis.x);
  const at = (up, side) => add(add(Ch, scl(u, up)), scl(lat, side));
  if (flat && S.facing === "away") {
    // trapezius sheet from the neck out over both shoulders
    const trap = (sgn) => freePlate(ctx, C, "traps", lit, [
      [at(2.0, sgn * 1.0), 3.4], [at(0.2, sgn * 5.4), 4.2], [at(-1.6, sgn * 9.0), 3.2],
    ]);
    trap(-1); trap(1);
    // lats: wings from under the armpit down into the waist
    const lat_ = (sgn) => freePlate(ctx, C, "lats", lit, [
      [at(-2.0, sgn * 8.6), 4.2], [at(-8.5, sgn * 7.2), 4.6], [at(-15.0, sgn * 4.2), 3.0],
    ]);
    lat_(-1); lat_(1);
    freePlate(ctx, C, "lowerback", lit, [[at(-12.0, 0), 3.0], [at(-18.0, 0), 2.8]]);
  } else if (flat) {
    // pec: a fan from the sternum out to the armpit, not a blob on the chest
    const pec = (sgn) => freePlate(ctx, C, "chest", lit, [
      [at(-1.8, sgn * 1.5), 2.6], [at(-0.6, sgn * 5.2), 4.6], [at(-1.2, sgn * 8.8), 4.2],
    ]);
    pec(-1); pec(1);
    // rectus: two blocks, stacked and narrow
    for (const [a, b, w] of [[-7.5, -11.5, 4.2], [-12.5, -16.5, 4.2]]) {
      freePlate(ctx, C, "abs", lit, [[at(a, 0), w], [at(b, 0), w * 0.96]]);
    }
    const ob = (sgn) => freePlate(ctx, C, "obliques", lit, [
      [at(-7.0, sgn * 6.2), 2.8], [at(-13.0, sgn * 5.0), 2.4],
    ]);
    ob(-1); ob(1);
  } else {
    // side on: pec sheet at the front of the chest, lats sweeping from the
    // lower back up into the armpit, abs down the front
    freePlate(ctx, C, "chest", lit, [
      [at(1.6, 6.2), 4.2], [at(-2.4, 7.4), 4.6], [at(-6.0, 6.4), 3.4],
    ]);
    freePlate(ctx, C, "lats", lit, [
      [add(add(P, scl(u, 9)), scl(lat, -6.4)), 3.0],
      [add(add(P, scl(u, 17)), scl(lat, -7.6)), 4.4],
      [at(-1.0, -8.0), 5.0],
      [at(1.8, -5.6), 4.0],
    ]);
    freePlate(ctx, C, "lowerback", lit, [
      [add(add(P, scl(u, 5)), scl(lat, -5.6)), 3.2],
      [add(add(P, scl(u, 12)), scl(lat, -6.6)), 3.4],
    ]);
    freePlate(ctx, C, "abs", lit, [
      [at(-8.0, 5.6), 3.2], [at(-13.0, 5.0), 3.0], [at(-17.5, 4.2), 2.6],
    ]);
    freePlate(ctx, C, "obliques", lit, [
      [at(-12.0, 3.0), 2.6], [at(-17.0, 2.0), 2.4],
    ]);
  }
  // traps: from the neck out over the shoulder line
  const t0 = add(S.chest, scl(u, 1.2)), t1 = add(S.neckTop, scl(u, -0.6));
  bonePlate(ctx, C, "traps", lit, t0, B.rNeckBot * 1.5, t1, B.rNeckTop, lat, [
    { at: 0.0, w: 0.92, side: 0 }, { at: 0.5, w: 0.8, side: 0 }, { at: 0.95, w: 0.7, side: 0 },
  ]);
}

// ------------------------------------------------------------------ props ---
// Equipment is scenery: simple vector geometry in one neutral metal colour. It
// lives in screen space, so a three-quarter camera moves the figure and not the
// bench; nudge the prop x when you yaw a move that stands on something.
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function bar(ctx, C, p0, p1, r, fill) {
  capsulePath(ctx, p0, r, p1, r);
  ctx.fillStyle = fill || C.prop;
  ctx.fill();
}
// Where a bar racked across the upper back sits, in torso space, so it leans
// with the shoulders instead of hovering in world coordinates.
export function barOnTraps(S, p = {}) {
  const u = norm2(S.torsoAxis.y), f = norm2(S.torsoAxis.x);
  const up = p.up === undefined ? 5.5 : p.up;
  const back = p.back === undefined ? 2.4 : p.back;
  return add(add(S.chest, scl(u, up)), scl(f, -back));
}
function anchor(spec, S) {
  if (!spec) return null;
  if (spec.x !== undefined && spec.side === undefined) return V(spec.x, spec.y);
  const k = S.sides[spec.side || "R"];
  const p = k[spec.point || "hand"];
  return V(p.x + (spec.dx || 0), p.y + (spec.dy || 0));
}

export const PROP_TYPES = [
  "mat", "wall", "doorway", "doorframe", "bench", "box", "roller", "pullupBar",
  "dipBars", "machine", "cable", "band", "barbell", "dumbbell", "kettlebell",
];

const PROPS = {
  mat(ctx, C, p) {
    ctx.fillStyle = C.propDark;
    roundRect(ctx, p.x, GROUND - 2.4, p.w, 4.4, 2.2); ctx.fill();
  },
  wall(ctx, C, p) {
    const top = p.top === undefined ? 4 : p.top;
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x, top, p.w, GROUND - top, 3); ctx.fill();
    ctx.fillStyle = C.propTop;
    roundRect(ctx, p.x, top, 2.6, GROUND - top, 1.3); ctx.fill();
  },
  doorway(ctx, C, p) {
    const w = p.w || 9;
    ctx.fillStyle = C.propDark;
    roundRect(ctx, p.x + w * 0.55, 4, w * 0.9, GROUND - 4, 2); ctx.fill();
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x, 4, w * 0.62, GROUND - 4, 2.6); ctx.fill();
    ctx.fillStyle = C.propTop;
    roundRect(ctx, p.x, 4, 2.2, GROUND - 4, 1.1); ctx.fill();
  },
  doorframe(ctx, C, p) {
    const w = p.w || 8;
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x, -6, w, GROUND + 6, 2.6); ctx.fill();
    ctx.fillStyle = C.propDark;
    roundRect(ctx, p.x + w * 0.62, -6, w * 0.38, GROUND + 6, 1.4); ctx.fill();
    ctx.fillStyle = C.propTop;
    roundRect(ctx, p.x, -6, 2.2, GROUND + 6, 1.1); ctx.fill();
  },
  bench(ctx, C, p) {
    const w = p.w, y = p.y, x = p.x, inc = D(p.incline || 0);
    const c = V(x + w / 2, y);
    const dx = Math.cos(inc) * (w / 2), dy = Math.sin(inc) * (w / 2);
    const A = V(c.x - dx, c.y + dy), Bp = V(c.x + dx, c.y - dy);
    capsulePath(ctx, A, 3.6, Bp, 3.6);
    ctx.fillStyle = C.prop; ctx.fill();
    capsulePath(ctx, V(A.x, A.y - 1.4), 2.0, V(Bp.x, Bp.y - 1.4), 2.0);
    ctx.fillStyle = C.propTop; ctx.fill();
    ctx.fillStyle = C.propDark;
    for (const f of [0.16, 0.84]) {
      const fp = lerpV(A, Bp, f);
      roundRect(ctx, fp.x - 2.4, fp.y, 4.8, GROUND - fp.y, 2); ctx.fill();
    }
  },
  box(ctx, C, p) {
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x, p.y, p.w, GROUND - p.y, 3); ctx.fill();
    ctx.fillStyle = C.propTop;
    roundRect(ctx, p.x, p.y, p.w, 3.2, 1.6); ctx.fill();
  },
  roller(ctx, C, p) {
    const r = p.r || 5.4;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.prop; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = C.propDark; ctx.fill();
  },
  pullupBar(ctx, C, p) {
    const y = p.y === undefined ? 10 : p.y;
    const x0 = p.x0 === undefined ? 30 : p.x0;
    const x1 = p.x1 === undefined ? 110 : p.x1;
    ctx.fillStyle = C.prop;
    roundRect(ctx, x0, y - 2.4, x1 - x0, 4.8, 2.4); ctx.fill();
    for (const x of [x0, x1 - 5]) { roundRect(ctx, x, 0, 5, y - 1.5, 2); ctx.fill(); }
  },
  dipBars(ctx, C, p) {
    const y = p.y === undefined ? 86 : p.y;
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x0, y - 2.2, p.x1 - p.x0, 4.4, 2.2); ctx.fill();
    for (const x of [p.x0 + 2, p.x1 - 7]) { roundRect(ctx, x, y, 5, GROUND - y, 2); ctx.fill(); }
  },
  machine(ctx, C, p) {
    const parts = p.parts || ["seat"];
    ctx.fillStyle = C.prop;
    if (parts.includes("seat")) {
      roundRect(ctx, p.x, p.y, p.w, 5.4, 2.7); ctx.fill();
      roundRect(ctx, p.x + p.w * 0.42, p.y + 5.4, 6, GROUND - p.y - 5.4, 2.4); ctx.fill();
      ctx.fillStyle = C.propTop;
      roundRect(ctx, p.x, p.y, p.w, 2.2, 1.1); ctx.fill();
      ctx.fillStyle = C.prop;
    }
    if (parts.includes("backPad")) {
      roundRect(ctx, p.x - 6.5, p.y - (p.padH || 26), 6.5, (p.padH || 26) + 4, 3); ctx.fill();
    }
    if (parts.includes("thighPad")) {
      const px = p.padX === undefined ? p.x + p.w * 0.6 : p.padX;
      const py = p.padY === undefined ? p.y - 16 : p.padY;
      roundRect(ctx, px, py, p.padW || 20, 5.4, 2.7); ctx.fill();
      roundRect(ctx, px + (p.padW || 20) * 0.5 - 2, py + 5.4, 4, p.y - py - 5.4, 2); ctx.fill();
    }
    if (parts.includes("lever")) {
      const lx = p.leverX === undefined ? p.x + p.w : p.leverX;
      const ly = p.leverY === undefined ? p.y - 22 : p.leverY;
      bar(ctx, C, V(p.x + p.w * 0.45, p.y - 4), V(lx, ly), 2.2);
      ctx.beginPath(); ctx.arc(lx, ly, 4.2, 0, Math.PI * 2); ctx.fill();
    }
  },
  cable(ctx, C, p, S) {
    const top = p.top === undefined ? 16 : p.top;
    const y0 = p.y0 === undefined ? 46 : p.y0;
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x - 2, top, 4, y0 - top, 2); ctx.fill();
    roundRect(ctx, p.x - 9, y0, 18, GROUND - y0, 2.6); ctx.fill();
    ctx.fillStyle = C.propDark;
    for (let y = y0 + 3; y < GROUND - 4; y += 6) { roundRect(ctx, p.x - 7, y, 14, 4, 1.6); ctx.fill(); }
    ctx.fillStyle = C.propTop;
    ctx.beginPath(); ctx.arc(p.x, top, 4.4, 0, Math.PI * 2); ctx.fill();
    const h = anchor(p.to || { side: "R", point: "hand" }, S);
    if (!h) return;
    ctx.strokeStyle = C.propTop; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p.x, top); ctx.lineTo(h.x, h.y); ctx.stroke();
    const k = S.sides[(p.to && p.to.side) || "R"];
    const d = norm2(k.axis.hand.x);
    capsulePath(ctx, V(h.x - d.x * 7, h.y - d.y * 7), 2.4, V(h.x + d.x * 7, h.y + d.y * 7), 2.4);
    ctx.fillStyle = C.prop; ctx.fill();
  },
  band(ctx, C, p, S) {
    const a = anchor(p.from, S), b = anchor(p.to, S);
    if (!a || !b) return;
    const d = len2(sub(b, a));
    const rest = p.rest === undefined ? 40 : p.rest;
    const slack = Math.max(0, rest - d);
    const m = lerpV(a, b, 0.5);
    const c = V(m.x, m.y + slack * 0.55 + 1.2);
    ctx.strokeStyle = C.propTop;
    ctx.lineWidth = Math.max(1.4, 3.2 - slack * 0.05);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.stroke();
  },
  barbell(ctx, C, p, S) {
    const at = p.place === "traps" ? barOnTraps(S, p) : anchor(p, S);
    if (!at) return;
    const r = p.r || 9.5;
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.arc(at.x, at.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.prop; ctx.fill();
    ctx.beginPath(); ctx.arc(at.x, at.y, r * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = C.propDark; ctx.fill();
    ctx.beginPath(); ctx.arc(at.x, at.y, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = C.propTop; ctx.fill();
  },
  dumbbell(ctx, C, p, S) {
    const at = anchor(p, S);
    if (!at) return;
    const k = p.k || 1;
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(D(p.rot === undefined ? 0 : p.rot));
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3.2; ctx.lineJoin = "round";
    const shapes = [
      () => roundRect(ctx, -2.4, -9 * k, 4.8, 18 * k, 2.2),
      () => roundRect(ctx, -7.2, -17 * k, 14.4, 8.4 * k, 3),
      () => roundRect(ctx, -7.2, 8.6 * k, 14.4, 8.4 * k, 3),
    ];
    for (const sh of shapes) { sh(); ctx.stroke(); }
    ctx.fillStyle = C.prop;
    for (const sh of shapes) { sh(); ctx.fill(); }
    ctx.fillStyle = C.propTop;
    roundRect(ctx, -7.2, -17 * k, 14.4, 2.4, 1.2); ctx.fill();
    roundRect(ctx, -7.2, 8.6 * k, 14.4, 2.4, 1.2); ctx.fill();
    ctx.restore();
  },
  kettlebell(ctx, C, p, S) {
    const at = anchor(p, S);
    if (!at) return;
    const k = p.k || 1;
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(D(p.rot === undefined ? 0 : p.rot));
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(0, 11 * k, 8.2 * k, 0, Math.PI * 2);
    ctx.stroke(); ctx.fillStyle = C.prop; ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 2.5 * k, 5.6 * k, Math.PI * 1.12, Math.PI * 1.88);
    ctx.lineWidth = 3.4 * k; ctx.strokeStyle = C.prop; ctx.stroke();
    ctx.restore();
  },
};

function drawProps(ctx, C, list, S, layer) {
  for (const p of list || []) {
    if ((p.front ? "front" : "back") !== layer) continue;
    const fn = PROPS[p.type];
    if (fn) fn(ctx, C, p, S);
  }
}

function drawFloor(ctx, C, S) {
  const g = ctx.createLinearGradient(6, 0, VB - 6, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.16, C.line);
  g.addColorStop(0.84, C.line);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = g;
  roundRect(ctx, 6, GROUND, VB - 12, 1.7, 0.85); ctx.fill();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = C.line;
  for (const s of ["L", "R"]) {
    const k = S.sides[s];
    for (const p of [k.toe, k.heel, k.hand, k.wrist]) {
      if (p.y > GROUND - 10) {
        ctx.beginPath();
        ctx.ellipse(p.x, GROUND + 0.8, 8.5, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}


// How far inboard of its own shoulder a wrist has to come before we call the
// arm "across the body". A hanging arm sits about 11.5 out.
const CROSS_X = 5;
function crossesBody(S, s) {
  if (!S.frontal) return false;
  const sgn = s === "R" ? 1 : -1;
  return (S.sides[s].wrist.x - S.chest.x) * sgn < CROSS_X;
}

// A hand holding something is a fist; a hand on the floor is flat; a hand on a
// pull-up bar is a hook. Props decide most of it, the move can override, and
// the floor test catches push-ups and planks without anyone authoring anything.
export function gripSides(move, S) {
  const g = {};
  for (const p of (move && move.props) || []) {
    if (p.type === "barbell" && p.place === "traps") { g.L = "closed"; g.R = "closed"; continue; }
    if (["barbell", "dumbbell", "kettlebell"].includes(p.type) && p.point !== "wrist") g[p.side || "R"] = "closed";
    if (p.type === "cable" && p.to && p.to.side) g[p.to.side] = "closed";
    if (p.type === "band") for (const e of [p.from, p.to]) if (e && e.side) g[e.side] = "closed";
    if (p.type === "pullupBar") { g.L = g.L || "hook"; g.R = g.R || "hook"; }
    if (p.grip) g[p.grip] = "closed";
  }
  if (S) {
    for (const s of ["L", "R"]) {
      if (g[s]) continue;
      const k = S.sides[s];
      if (k.hand.y > GROUND - 7 && k.wrist.y > GROUND - 12) g[s] = "flat";
    }
  }
  if (move && move.grip) Object.assign(g, move.grip);
  return g;
}

// Draw order is by depth now, not by a fixed list. The tie-break keeps the v1
// order exactly for a planar camera, where every limb sits at the same depth as
// its opposite number and only the old near/far rule can separate them.
export function drawFigure(ctx, S, C, opts = {}) {
  if (opts.floor !== false) drawFloor(ctx, C, S);
  drawProps(ctx, C, opts.props, S, "back");
  const symmetric = S.frontal && !S.farSide;
  const near = S.frontal ? (S.farSide === "R" ? "L" : "R") : "R";
  const far = near === "R" ? "L" : "R";
  const grips = opts.grip || {};
  const detail = opts.detail !== false;
  const skinOpts = C.skin === "anatomy" ? { plates: true, lit: opts.lit } : null;
  const farFill = symmetric ? C.ink : C.far;
  // Depth decides draw ORDER. Tone stays on the near/far rule, flipped once the
  // camera has swung past the figure, because a depth threshold makes limbs
  // change colour mid-orbit for no reason a viewer can read.
  const behind = Math.abs(((S.cam.yaw || 0) + 180) % 360 - 180) > 90;
  const mean = (...ps) => ps.reduce((a, p) => a + p.d, 0) / ps.length;
  const torsoD = mean(S.pelvis, S.chest);

  const items = [];
  for (const s of ["L", "R"]) {
    const k = S.sides[s];
    const crossing = crossesBody(S, s);
    const armD = mean(k.shoulder, k.elbow, k.wrist);
    const legD = mean(k.hip, k.knee, k.ankle);
    const armFar = (!(crossing || s === near)) !== behind;
    const legFar = (s !== near) !== behind;
    items.push({
      d: armD, o: s === near ? 5 : (crossing ? 4.5 : 0), kind: "arm", s,
      fill: armFar ? farFill : C.inkHi,
      plates: !armFar || symmetric ? skinOpts : null,
    });
    items.push({
      d: legD, o: s === near ? 4 : 1, kind: "leg", s,
      fill: legFar ? farFill : C.inkHi,
      plates: !legFar || symmetric ? skinOpts : null,
    });
  }
  items.push({ d: torsoD, o: 2, kind: "torso" });
  items.push({ d: S.head.d, o: 3, kind: "head" });
  items.sort((a, b) => (a.d + a.o * 0.0001) - (b.d + b.o * 0.0001));

  for (const it of items) {
    if (it.kind === "arm") drawArm(ctx, S, it.s, C, it.fill, grips[it.s], it.plates, detail);
    else if (it.kind === "leg") drawLeg(ctx, S, it.s, C, it.fill, it.plates);
    else if (it.kind === "torso") drawTorso(ctx, S, C, C.ink, skinOpts);
    else drawHead(ctx, S, C, C.ink);
  }
  drawProps(ctx, C, opts.props, S, "front");
}

// ------------------------------------------------------------- animation ----
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const LOOPS = ["pingpong", "hold", "oneway"];

function lerpObj(a, b, u, keys) {
  const o = {};
  for (const k of keys) {
    const av = a[k] === undefined ? 0 : a[k];
    const bv = b[k] === undefined ? 0 : b[k];
    o[k] = av + (bv - av) * u;
  }
  return o;
}
function lerpIk(a, b, u) {
  const out = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const A = (a || {})[k], B = (b || {})[k];
    if (!A || !B) { out[k] = A || B; continue; }
    const ax = Array.isArray(A) ? A[0] : A.x, ay = Array.isArray(A) ? A[1] : A.y;
    const bx = Array.isArray(B) ? B[0] : B.x, by = Array.isArray(B) ? B[1] : B.y;
    const bend = Array.isArray(A) ? A[2] : A.bend;
    out[k] = { rel: A.rel || B.rel, x: ax + (bx - ax) * u, y: ay + (by - ay) * u, bend, pole: A.pole || B.pole };
  }
  return out;
}

export function samplePose(move, cycle, timeSec = 0) {
  const kfs = move.keys;
  let u = cycle;
  if (move.loop === "pingpong") u = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
  else if (move.loop === "hold") u = 0.5 - 0.5 * Math.cos(cycle * Math.PI * 2);
  else if (move.loop === "oneway") u = Math.min(1, cycle / 0.82);

  let i = 0;
  while (i < kfs.length - 2 && u > kfs[i + 1].t) i++;
  const a = kfs[i], b = kfs[Math.min(i + 1, kfs.length - 1)];
  const span = Math.max(0.0001, b.t - a.t);
  const w = easeInOut(clamp((u - a.t) / span, 0, 1));

  const jointKeys = new Set();
  for (const k of kfs) for (const j of Object.keys(k.joints || {})) jointKeys.add(j);

  return {
    root: lerpObj(a.root || {}, b.root || {}, w, ["x", "y", "rot"]),
    joints: lerpObj(a.joints || {}, b.joints || {}, w, [...jointKeys]),
    ik: lerpIk(a.ik, b.ik, w),
    feet: move.feet,
    farSide: move.farSide,
    facing: move.facing,
    flatFeet: move.flatFeet,
    breath: Math.sin(timeSec * (move.breathRate || 1.15)) * (move.breath === undefined ? 0.35 : move.breath),
  };
}

// Draw one frame of a move into a canvas. Sizing is the caller's business.
// Fingers below 190 CSS pixels turn to porridge, so the hand falls back to the
// v1 mitt there; the app's 160px cards get the mitt, the session screen gets
// the hand.
export function render(canvas, move, C, cycle, timeSec = 0, opts = {}) {
  const dpr = Math.min(2.5, globalThis.devicePixelRatio || 1);
  const w = canvas.clientWidth || canvas.width || 160;
  const h = canvas.clientHeight || canvas.height || 160;
  // Both dimensions, not just the width: a canvas with no width/height
  // attributes defaults to 300x150, and a 150 CSS px canvas at dpr 2 wants
  // exactly 300 wide, so a width-only check silently leaves the height at 150
  // and draws the figure at double scale, cropped.
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  const s = (w / VB) * dpr;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.clearRect(0, 0, VB, VB);
  const fit = move.fit;
  if (fit) {
    const cx = VB / 2, cy = 78;
    ctx.translate(cx + (fit.dx || 0), cy + (fit.dy || 0));
    ctx.scale(fit.k || 1, fit.k || 1);
    ctx.translate(-cx, -cy);
  }
  const view = opts.view || move.view;
  // The caller passes which muscles and what peak colour; when they fire is the
  // move's business, so it is worked out here rather than by every caller.
  const lit = opts.lit
    ? { ...opts.lit, intensity: opts.lit.intensity === undefined ? litIntensity(move, cycle) : opts.lit.intensity }
    : null;
  const S = solvePose(samplePose(move, cycle, timeSec), view);
  S.farSide = move.farSide || null;
  S.facing = move.facing || "toward";
  drawFigure(ctx, S, C, {
    props: move.props, floor: move.floor, lit,
    grip: gripSides(move, S),
    detail: opts.detail === undefined ? w >= 190 : opts.detail,
  });
  return S;
}

// ------------------------------------------------- derived joint angles -----
// What the validator checks. Everything is measured against the torso's own
// axes and the limb's own direction, never against the screen, so a twisted or
// rolled figure reports the same hip flexion as an upright one.
export function jointAngles(S) {
  const T = S.frames.torso;
  const ref = { x: T.x, y: scl3(T.y, -1), z: T.z };   // anterior, down, lateral
  const deg = (r) => (r * 180) / Math.PI;
  // The anterior face of a bone comes from the bone's own frame, not from the
  // torso's anterior projected sideways. They agree for a limb hanging in the
  // sagittal plane and disagree completely for a seated leg, where the thigh IS
  // the anterior direction and the knee bends toward the floor.
  const out = {};
  for (const s of ["L", "R"]) {
    const k = S.sides[s], lat = k.lat, P = k.p3;
    const arm = norm3(sub3(P.elbow, P.shoulder));
    const fore = norm3(sub3(P.wrist, P.elbow));
    const thigh = norm3(sub3(P.knee, P.hip));
    const shin = norm3(sub3(P.ankle, P.knee));
    const foot = norm3(sub3(P.toe, P.ankle));
    const la = unlocal(ref, arm), lt = unlocal(ref, thigh);
    const antA = k.frames.arm.x, antT = k.frames.thigh.x;
    const bendE = norm3(cross3(arm, fore)), bendK = norm3(cross3(thigh, shin));
    out[s] = {
      // totals are the honest magnitudes: the angle a limb makes with the
      // torso, whatever plane it swings in. The signed components below only
      // mean something when the limb is actually in that plane, which is what
      // the sagittal/lateral fractions are for.
      shoulderTotal: deg(Math.acos(clamp(la.y, -1, 1))),
      hipTotal: deg(Math.acos(clamp(lt.y, -1, 1))),
      shoulderLat: Math.abs(la.z),
      hipLat: Math.abs(lt.z),
      shoulderElev: deg(Math.atan2(la.x, la.y)),
      shoulderAbd: deg(Math.atan2(la.z * lat, Math.hypot(la.x, la.y))),
      hipFlex: deg(Math.atan2(lt.x, lt.y)),
      hipAbd: deg(Math.atan2(lt.z * lat, Math.hypot(lt.x, lt.y))),
      elbowFlex: deg(Math.atan2(dot3(fore, antA), dot3(fore, arm))),
      elbowMag: deg(Math.acos(clamp(dot3(arm, fore), -1, 1))),
      kneeFlex: -deg(Math.atan2(dot3(shin, antT), dot3(shin, thigh))),
      kneeMag: deg(Math.acos(clamp(dot3(thigh, shin), -1, 1))),
      // Just the angle between foot and shin, no reference direction needed:
      // neutral is 90, more is toes toward the shin. Measuring it against the
      // body's anterior instead reports 137 degrees of dorsiflexion for a man
      // lying on a bench with his feet flat on the floor.
      ankleDorsi: deg(Math.acos(clamp(dot3(foot, shin), -1, 1))) - 90,
      // how close the joint's actual hinge is to the body's lateral axis. Below
      // about 0.7 the bend is happening in some other plane and its sign is a
      // projection artefact rather than an anatomical claim.
      elbowHinge: Math.abs(dot3(bendE, ref.z)),
      kneeHinge: Math.abs(dot3(bendK, ref.z)),
    };
  }
  return out;
}
