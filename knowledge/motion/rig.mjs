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
//   Positive pitch puts the camera ABOVE the figure (the top preset is +88);
//   negative pitch looks up from below, which is almost never what you want.
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
const RAD2DEG = (r) => (r * 180) / Math.PI;
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
  spine: 30, neck: 8.4, headOff: 8.8,
  upperArm: 20, forearm: 17, hand: 8.6,
  thigh: 27, shin: 25, foot: 12,
  // Radii are the slim silhouette Mo approved in the first prototype, taken
  // in a further ten percent, and every mid-limb radius sits below the joint
  // above it so limbs taper instead of bulging. The previous set (chest 12.3,
  // thigh mid 8.7 over a hip of 8.0) read as heavy, and he said so.
  // Pelvis and hip spacing came in again (8.0 / 6.2) after Mo said the hips
  // were too wide on the phone even with the cap flush to the thigh.
  // Waist then went back OUT (6.4 to 7.4): with the narrow hips the trunk
  // pinched into an hourglass and Mo asked for a wider stomach.
  rPelvis: 7.3, rWaist: 7.4, rChest: 9.8,
  rNeckTop: 3.3, rNeckBot: 4.5,
  rHeadBack: 6.5, rHeadJaw: 4.8,
  rShoulder: 5.8, rDelt: 6.0, rElbow: 3.5, rWrist: 2.4,
  rUpperArmMid: 4.6, rForearmMid: 3.7,
  rHandA: 2.9, rHandB: 2.2, rThumb: 1.8,
  rHip: 6.3, rThighMid: 5.9, rKnee: 4.0,
  rCalf: 4.7, rAnkle: 4.0, rAnkleDraw: 2.7, rToe: 2.2, rHeel: 2.6,
  shoulderW: 12.2, hipW: 5.5, depth: 1.7,
  // hand v2
  palm: 5.0, palmHalf: 2.7, finger: 4.4, rPalm: 2.7, rFinger: 2.1, thumb: 5.0,
  // The product figure is one neutral bald body: Mo asked for "just the white",
  // no hair, no female variant for now.
  hairStyle: "none",
};
// Identical on both bodies by construction, so the floor is in the same place.
export const LEG_TO_FLOOR = BODY.thigh + BODY.shin + BODY.rAnkle;

// The female figure from knowledge/motion/reference/figure-female.png. SAME
// skeleton: every bone length is identical and so is rAnkle, which means hip
// height and LEG_TO_FLOOR are identical too, so every authored foot pin stays
// valid on either body. What changes is width: narrower shoulders over wider
// hips, a waist that is actually narrower than both, and slimmer arms and
// lower legs. Two fields exist only here: `bust`, the soft convex curve the
// sheet draws on the front of the side view, and `bun`, the hair knot at the
// back of the skull.
export const BODY_FEMALE = {
  ...BODY,
  rPelvis: 8.3, rWaist: 5.9, rChest: 9.1,
  rNeckTop: 3.0, rNeckBot: 4.1,
  rHeadBack: 6.1, rHeadJaw: 4.3,
  rShoulder: 5.1, rDelt: 5.3, rElbow: 3.1, rWrist: 2.2,
  rUpperArmMid: 4.1, rForearmMid: 3.3,
  rHandA: 2.6, rHandB: 2.0, rThumb: 1.6,
  rHip: 6.7, rThighMid: 6.1, rKnee: 3.7,
  rCalf: 4.3, rAnkle: 4.0, rAnkleDraw: 2.5, rToe: 2.3, rHeel: 2.8,
  shoulderW: 11.2, hipW: 7.0,
  bust: 2.0, bustAt: 0.80,
  // "bun", "tail" or "cap"; see drawHead
  hairStyle: "bun", tail: 9.5, tailR: 1.5,
};

// The hair variants are separate tables so a sheet can put them side by side
// without reaching into the rig. Only BODY_FEMALE ships.
export const BODY_FEMALE_BUN = { ...BODY_FEMALE, hairStyle: "bun" };
export const BODY_FEMALE_CAP = { ...BODY_FEMALE, hairStyle: "cap" };
export const BODIES = {
  male: BODY, female: BODY_FEMALE,
  "female-bun": BODY_FEMALE_BUN, "female-cap": BODY_FEMALE_CAP,
};

// Which table the rig is drawing with right now. render() sets it from the
// palette or the caller's option; solvePose takes it as an optional argument so
// a harness can measure one body without disturbing another.
let ACTIVE = BODY;
export const activeBody = () => ACTIVE;
export function useBody(name) { ACTIVE = BODIES[name] || BODY; return ACTIVE; }


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
      shoulderR: -5, elbowR: 7, wristR: 5,
      shoulderL: -3, elbowL: 5, wristL: 4,
      hipR: 1, kneeR: 0, ankleR: -1,
      hipL: -1, kneeL: 0, ankleL: 1,
    },
  };
  const side2 = {
    root: { x: 70, y: STAND_Y + 0.7, rot: -1 },
    joints: {
      spine: 4, neck: -3,
      shoulderR: -4, elbowR: 9, wristR: 6,
      shoulderL: -2, elbowL: 7, wristL: 5,
      hipR: 1, kneeR: 0, ankleR: -1,
      hipL: -1, kneeL: 0, ankleL: 1,
    },
  };
  // The front stance is SYMMETRIC, deliberately and exactly. Every left and
  // right value matches, both ankles sit on the same line at hip width, and the
  // breath keyframe moves the whole body rather than one side of it. A degree
  // of difference between the two halves does not read as life at card size, it
  // reads as a figure turned slightly away, which is the thing Mo kept seeing.
  // Feet at hip width and directly under the hip joints, so the legs hang as
  // two straight verticals. Anything wider bows the knees outward.
  const STANCE = { R: BODY.hipW, L: -BODY.hipW };
  const front = {
    root: { x: 70, y: STAND_Y + 0.3, rot: 0 },
    joints: {
      spine: 0, neck: 0,
      shoulderR: 7, elbowR: 3, wristR: -1,
      shoulderL: 7, elbowL: 3, wristL: -1,
      hipR: 0, hipL: 0, kneeR: 0, kneeL: 0,
    },
    ik: { ankleR: { x: 70 + STANCE.R, y: 113.7, bend: -1 },
          ankleL: { x: 70 + STANCE.L, y: 113.7, bend: -1 } },
  };
  const front2 = {
    root: { x: 70, y: STAND_Y + 0.8, rot: 0 },
    joints: {
      spine: 1, neck: 0,
      shoulderR: 8, elbowR: 4, wristR: -1,
      shoulderL: 8, elbowL: 4, wristL: -1,
      hipR: 0, hipL: 0, kneeR: 0, kneeL: 0,
    },
    ik: { ankleR: { x: 70 + STANCE.R, y: 113.7, bend: -1 },
          ankleL: { x: 70 + STANCE.L, y: 113.7, bend: -1 } },
  };
  return {
    view: view === "back" ? "front" : view,
    facing: view === "back" ? "away" : undefined,
    loop: "hold", dur: 7, breath: 0.7, breathRate: 0.7,
    feet: frontal ? { R: { ang: 0, len: 0.5, w: 1.05 }, L: { ang: 0, len: 0.5, w: 1.05 } } : undefined,
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

export const BODY_KINDS = ["male", "female"];
const HAIR_KINDS = ["female-bun", "female-cap"];
export { HAIR_KINDS };
export function palette(theme = "dark", accent = "action", skin = "mannequin", bodyKind = "male") {
  const dark = theme !== "light";
  const T = dark ? THEMES.dark : THEMES.light;
  const A = typeof accent === "string"
    ? (ACCENTS[accent] || ACCENTS.action)[dark ? "dark" : "light"]
    : accent;
  // Sampled off knowledge/motion/reference/figure-turnaround.png: body #bbb8b5,
  // its shadow #949290, hair #807f7f, the seam lines #2a2d30, and from
  // figure-muscles.png the muscle panels #7e7d7e over the same light body with
  // the body colour showing through as the seam between them, lit #dc551e.
  //
  // The figure is deliberately NOT accent tinted any more. The reference body is
  // a neutral warm grey and tinting it green was one of the things that made it
  // read as a prop rather than a person. The accent survives on the floor line.
  // Sampled off knowledge/motion/reference/figure-final.png, which Mo approved
  // as the definitive look: a flat white body on near black, one clean dark
  // outline, thin dark seams at the joints, a soft light grey shade on the far
  // side, and hair that is nearly as dark as the outline.
  //
  // On light the same drawing is inverted rather than recoloured: a white body
  // on a white card is an outline and nothing else, so the body takes the dark
  // tone and the shading goes light. That is what the first prototype did and
  // it is still the only version that reads on white.
  // Light keeps the same white-body-with-outline drawing as dark, just a
  // touch of grey so the body still separates from a white card, because
  // the face (a dark visor with lime eyes) disappears on a charcoal head.
  const body = dark ? "#f6f5f3" : "#eef0f4";
  const bodyShade = dark ? "#ece9e5" : "#e0e4ea";
  return {
    skin,
    body: BODIES[bodyKind] ? bodyKind : "male",
    bg: T.bg,
    surface: T.surface,
    ink: body,
    inkHi: body,
    // The far side is a clear step, not a whisper: it has to survive being 40
    // pixels tall on a session card.
    far: dark ? "#e6e3df" : "#d3d8e0",
    farShade: dark ? "#dcd8d3" : "#c7cdd6",
    shade: bodyShade,
    shadeSoft: dark ? "#e8e6e3" : "#e5e8ed",
    // One line colour. The whole silhouette carries it heavy, the seams inside
    // carry it thin. Nothing on this figure is drawn in a middle grey.
    seam: "#1c1f26",
    seamSoft: "#1c1f26",
    crease: dark ? "#4c525c" : "#6d7480",
    plateSeam: dark ? "#f6f5f3" : "#2b3038",
    edge: T.bg,
    // Hair is nearly the outline colour, and on the back view it is the whole
    // cue. On light the body is charcoal, so the hair has to go darker still or
    // it disappears into the head.
    hair: dark ? "#2f343d" : "#12161d",
    plate: dark ? "#dcd9d5" : "#4a5058",
    plateFar: dark ? "#c2bfba" : "#5a616b",
    accent: A.accent,
    accentInk: A.accentInk,
    line: dark ? A.accent : A.accentInk,
    prop: dark ? mix(T.bg, "#93a3b8", 0.55) : mix(T.surface, "#3c4757", 0.42),
    propTop: dark ? mix(T.bg, "#c3d0e0", 0.78) : mix(T.surface, "#56637a", 0.66),
    propDark: dark ? mix(T.bg, "#93a3b8", 0.32) : mix(T.surface, "#3c4757", 0.62),
    ...GEAR,
  };
}

/* Gym equipment is the same colour in both themes: the powder-coated steel,
   black vinyl pads and cast iron of the real thing, sampled to match the
   machine artwork in knowledge/motion/props/ so a drawn bench and an SVG
   machine sit in the same picture. The old theme-mixed greys made a barbell
   look like a lump of the background, and Mo approved the dark steel machine
   on the light card before any of this was drawn. */
const GEAR = {
  steel: "#454c56", steelHi: "#5c646f", steelLo: "#30363d",
  pad: "#20242a", padHi: "#31363d", padLine: "#3a4049",
  iron: "#262a30", ironHi: "#3a4048", rubber: "#16191d",
  chrome: "#8b95a2", chromeHi: "#b4bcc6", chromeLo: "#5d6672",
  rope: "#4a4640", ropeHi: "#6a655d",
  cableLine: "#7a838e",
};

// ------------------------------------------------------------- the camera ---
// A move is authored in a plane. The camera starts looking straight at that
// plane (yaw 0, pitch 0), which reproduces v1 exactly, and yaw/pitch orbit away
// from it. Presets are just named yaw/pitch/plane triples.
export const VIEWS = ["side", "front", "back", "threequarter", "top"];
export const PRESETS = {
  side: { plane: "sagittal", yaw: 0, pitch: 0 },
  front: { plane: "frontal", yaw: 0, pitch: 0 },
  back: { plane: "frontal", yaw: 180, pitch: 0 },
  // Larger depth draws nearer, and a positive pitch pushes the head end of
  // the body nearer, so +pitch is a camera ABOVE the figure. This preset was
  // -88 for a while and quietly rendered a prone figure's face from below.
  top: { plane: "sagittal", yaw: 0, pitch: 88 },
  // the fourth view on figure-final.png: turned far enough to read as a
  // body with depth, not far enough to lose the front cues
  threequarter: { plane: "frontal", yaw: 34, pitch: 0 },
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

export function solvePose(pose, view, body) {
  if (body) useBody(body);
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
  const spineLen = ACTIVE.spine * (1 + breath * 0.012);
  const chest = add3(pelvis, scl3(Ft.y, spineLen));

  // carrier for the chest and everything hanging off it
  let Ct = C;
  if (g("torsoRoll")) Ct = rotX(Ct, D(g("torsoRoll")));
  if (g("spineTwist")) Ct = rotY(Ct, -D(g("spineTwist")));
  const Ftw = carry(Ct, inPlane(UP0, D(t), frontal, 1));   // twisted torso frame

  let Cn = Ct;
  if (g("neckTwist")) Cn = rotY(Cn, -D(g("neckTwist")));
  const Fn = carry(Cn, inPlane(UP0, D(tn), frontal, 1));
  const neckTop = add3(chest, scl3(Fn.y, ACTIVE.neck));
  const head = add3(neckTop, scl3(Fn.y, ACTIVE.headOff));

  const out = {
    view, cam, plane: cam.plane, frontal,
    t, tn, rot,
    chestR: ACTIVE.rChest * (1 + breath * 0.02),
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
    let shoulder = add3(chest, scl3(Ftw.z, lat * ACTIVE.shoulderW));
    if (!frontal) shoulder = add3(shoulder, scl3(Ftw.x, screenSign * ACTIVE.depth));
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
    let elbow = add3(shoulder, scl3(Fa.y, ACTIVE.upperArm));
    let Ff = inPlane(Fa, D(g("elbow" + s)), frontal, side);
    let wrist = add3(elbow, scl3(Ff.y, ACTIVE.forearm));

    const wIk = ikTarget(ik["wrist" + s], { chest }, cam);
    if (wIk) {
      const n = wIk.pole ? norm3(V3(wIk.pole[0], wIk.pole[1], wIk.pole[2]))
        : (frontal ? scl3(Ct.x, -side) : Ct.z);
      const wt = wIk.flat === false ? wIk.p : inLimbPlane(shoulder, wIk.p, frontal);
      const r = twoBone3(shoulder, wt, ACTIVE.upperArm, ACTIVE.forearm, n, wIk.bend);
      elbow = r.mid; wrist = r.end;
      Fa = frameFromDir(sub3(elbow, shoulder), n, frontal, side);
      Ff = frameFromDir(sub3(wrist, elbow), n, frontal, side);
    }
    let Fh = inPlane(Ff, D(g("wrist" + s)), frontal, side);
    if (g("forearmPron" + s)) Fh = rotY(Fh, -lat * D(g("forearmPron" + s)));
    const hand = add3(wrist, scl3(Fh.y, ACTIVE.hand));

    // ---- leg
    const legAbs = rot + g("hip" + s) + g("hipFwd" + s);
    let Fl = carry(C, inPlane(DOWN0, D(legAbs), frontal, side));
    if (g("hipAbd" + s)) Fl = outPlane(Fl, D(g("hipAbd" + s)), frontal, side);
    if (g("hipRot" + s)) Fl = axial(Fl, D(g("hipRot" + s)), lat);
    // v1 hung the hip anchors off the torso angle rather than the pelvis, and
    // every authored move is calibrated to that. Kept deliberately.
    let hip = add3(pelvis, scl3(Ft.z, lat * ACTIVE.hipW));
    if (!frontal) hip = add3(hip, scl3(Ft.x, screenSign * ACTIVE.depth * 0.8));
    let knee = add3(hip, scl3(Fl.y, ACTIVE.thigh));
    let Fs = inPlane(Fl, -D(g("knee" + s)), frontal, side);
    let ankle = add3(knee, scl3(Fs.y, ACTIVE.shin));

    const aIk = ikTarget(ik["ankle" + s], { chest }, cam);
    if (aIk) {
      const n = aIk.pole ? norm3(V3(aIk.pole[0], aIk.pole[1], aIk.pole[2]))
        : (frontal ? scl3(C.x, -side) : C.z);
      const at = aIk.flat === false ? aIk.p : inLimbPlane(hip, aIk.p, frontal);
      const r = twoBone3(hip, at, ACTIVE.thigh, ACTIVE.shin, n, aIk.bend);
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
    const footLen = ACTIVE.foot * ((fm && fm.len) || 1);
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
// The whole figure is outlined ONCE, as a union, instead of every segment
// outlining itself. Two passes: pass one walks the same draw calls with COLLECT
// set and gathers every capsule, then the union of those capsules is stroked;
// pass two draws the fills with LINES off. Without this an arm laid across the
// chest carries its own dark ring over the chest, which is exactly what made
// the figure read as armour plates rather than one body.
let COLLECT = null;
let LINES = true;
// Pass two only: every ARM capsule painted so far, in order. drawTorso reads
// it to find the arms that are UNDER the torso, so it can give them the same
// shoulder seam a near arm leaves. Legs are deliberately not recorded: the hip
// carries no seam on either side (see drawLeg).
let DRAWN = null;   // { L: [...], R: [...] } arm capsules by side
let DRAWN_TAG = null;

function part(ctx, C, pts, o = {}) {
  const fill = o.fill || C.ink;
  const segs = o.segs || (() => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) out.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]);
    return out;
  })();
  // Stroke every segment first, then fill every segment. The strokes that fall
  // inside the shape are painted over, so what survives is the outer contour
  // only: one continuous hairline round the whole limb instead of a ring at
  // every circle in the chain.
  if (COLLECT) { for (const g of segs) COLLECT.push(g); return; }
  /* Every part strokes its own edge and then fills, so where a part drawn
     later overlaps one drawn earlier its hairline survives across it: that is
     the seam at a shoulder or a hip, and Mo wants those kept. What he does not
     want is the seam showing on one side only, which happens when the part
     UNDERNEATH declines to stroke (see drawTorso). Opt out with line: false. */
  if (o.line !== false) {
    ctx.strokeStyle = o.lineColor || C.seam;
    ctx.lineWidth = (LINES ? (o.lineW || 0.28) : 0.15) * 2;
    ctx.lineJoin = "round";
    for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.stroke(); }
  }
  ctx.fillStyle = fill;
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.fill(); }
  if (DRAWN && DRAWN_TAG) for (const g of segs) DRAWN[DRAWN_TAG].push(g);
  // The shade band is OPT IN now. The reference is flat white: one white, one
  // very soft far side tone, nothing else. A crescent on every thigh, torso and
  // upper arm reads as facets, and that was the main thing still separating the
  // rig from the sheet.
  if (o.shade === true) {
    // One soft band down the shaded side, flat and opaque like the reference,
    // kept inside the silhouette so it never touches the edge.
    const a = pts[0], b = pts[pts.length - 1];
    const n = shadeSide(a[0], b[0]);
    const k = o.shadeOff === undefined ? 0.60 : o.shadeOff;
    const q = o.shadeR === undefined ? 0.44 : o.shadeR;
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
  if (COLLECT) return;
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

// The hand is a soft rounded mitt at every size. Mo looked at the fingered
// version on the approval sheet and rejected it: four fingers and a thumb read
// as a claw at 320px and as porridge at 160px, and on a bar they fought the
// prop. There is no fingered path any more, so nothing can turn one back on.
// The grip changes the SHAPE of the mitt, not its parts: a closed hand is short
// and flattened against what it holds, a flat hand is a long paddle on the
// floor, an open hand is the neutral rounded end.
const MITT = {
  open:   { len: 0.98, root: 1.00, tip: 1.00 },
  flat:   { len: 1.06, root: 0.94, tip: 1.06 },
  closed: { len: 0.66, root: 1.02, tip: 1.22 },
  fist:   { len: 0.58, root: 1.06, tip: 1.24 },
  hook:   { len: 0.70, root: 1.00, tip: 1.16 },
};

function drawHand(ctx, S, side, C, fill, grip) {
  const B = ACTIVE, k = S.sides[side];
  const m = MITT[grip] || MITT.open;
  const rRoot = B.rHandA * m.root, rTip = B.rHandB * m.tip;
  const L = B.hand * m.len;
  let d = norm2(k.axis.hand.y);
  let tip = add(k.wrist, scl(d, L));
  if (grip === "flat") {
    // A hand on the floor LIES ALONG it, palm down, fingers toward the head end
    // of the body. The authored wrist angle rotates the hand frame in the
    // forearm's plane, and in a push-up that left the mitt standing on its heel
    // pointing at the ceiling, which is what Mo saw on the card. So the flat
    // hand ignores the hand frame and takes the floor tangent instead: the
    // forearm's own forward direction, flattened.
    let fwd = k.wrist.x - k.elbow.x;
    // A near vertical forearm (a handstand, a bear crawl) gives no usable
    // horizontal component, so fall back to which way the head is.
    if (Math.abs(fwd) < 0.8) fwd = S.head.x - k.wrist.x;
    if (Math.abs(fwd) < 0.001) fwd = d.x || 1;
    const sgn = fwd < 0 ? -1 : 1;
    d = V(sgn, 0);
    // Tilt the centre line by the difference in radius so the UNDERSIDE is
    // level: a flat hand is a paddle resting on a surface, not a wedge.
    tip = V(k.wrist.x + sgn * L, k.wrist.y + (rRoot - rTip));
  }
  part(ctx, C, [
    [k.wrist, rRoot],
    [lerpV(k.wrist, tip, 0.62), rRoot * 0.94],
    [tip, rTip],
  ], { fill, shadeR: 0.42, shadeOff: 0.34 });
}

// A foot with a heel and a toe: instep from the ankle, sole along the ground,
// heel bump behind. Three circles, one silhouette.
function drawFoot(ctx, S, side, C, fill) {
  const B = ACTIVE, k = S.sides[side];
  const w = k.footW;
  const d = norm2(sub(k.toe, k.heel));
  const r = B.rAnkleDraw * w;
  // Front on, the shin just continues to the floor and ends round.
  if (S.frontal && Math.abs(d.x) < 0.45) {
    const sole = Math.max(k.toe.y, k.heel.y, k.ankle.y + B.rAnkle * 0.8);
    const bottom = V(k.ankle.x, Math.max(k.ankle.y + r * 0.5, sole - r * 1.05));
    part(ctx, C, [[k.ankle, r], [bottom, r * 1.05]], { fill });
    return;
  }
  // Side on. A foot ON THE FLOOR is built from the ankle alone: a short heel
  // behind it, the toe ahead of it, both on the ground, one capsule. The
  // solved foot frame is ignored here on purpose: in a squat the frame tilts
  // with the shin and the capsule built from it put the heel a long way behind
  // the leg and the toe under it, which is the foot Mo circled. Only a foot in
  // the air (a hang, a kick, a raised heel) follows the frame.
  const sole = Math.max(k.toe.y, k.heel.y);
  const onFloor = sole > GROUND - 2.5 && k.ankle.y > GROUND - B.foot * 0.9;
  if (onFloor) {
    const fwd = d.x >= 0 ? 1 : -1;
    const y = GROUND - r * 0.9;
    const heel = V(k.ankle.x - fwd * B.foot * 0.28, y);
    const toe = V(k.ankle.x + fwd * B.foot * 0.78, y);
    part(ctx, C, [[k.ankle, r], [heel, r * 0.92], [toe, r * 0.78]], { fill });
    return;
  }
  const heel = add(k.ankle, scl(d, -B.foot * 0.25));
  part(ctx, C, [[k.ankle, r], [heel, r * 0.9], [k.toe, r * 0.75]], { fill });
}

// Head: one silhouette with a hair mass and one soft shade. The v3 head carried
// an offset inner plate like every other segment, and on a head that plate sits
// exactly where a visor would, which is most of why the figure read as a space
// suit. Still faceless: the hairline is the only feature and it is a shape, not
// a face.
function drawHead(ctx, S, C, fill) {
  const B = ACTIVE;
  const u = norm2(S.neckAxis.y), f = norm2(S.neckAxis.x);
  const flat = S.frontal;
  const away = S.facing === "away";
  const at = (up, fwd) => add(add(S.head, scl(u, up)), scl(f, fwd));
  // Skull from the reference sheet: a high round cranium, a brow, a jaw that
  // angles back under the ear and a short chin. Front on it is an oval that
  // narrows to the jaw.
  // A symmetric oval on the neck axis in every view. The offset jaw and the
  // ear made the head lopsided at card size (Mo's word), and the sheet's head
  // is a plain egg: wide at the crown, narrowing to a centred chin.
  const skull = [[at(2.8, 0), B.rHeadBack * 0.98], [at(-0.6, 0), B.rHeadBack * 0.92],
                 [at(-3.6, 0), B.rHeadBack * 0.72], [at(-5.4, 0), B.rHeadBack * 0.48]];
  hull(ctx, C, skull, { fill, shade: false });
  // Her hair, as one of three shapes. `hairStyle` on the body table picks it:
  // "bun" is the rolled up knot, "tail" a thin ponytail, "cap" nothing at all
  // beyond the cap every figure gets. All of them are drawn before the collect
  // pass returns, so they are part of the silhouette rather than stuck on top.
  if (B.hairStyle === "bun") {
    // Small, high, and at the BACK of the skull. Front on almost none of it
    // clears the head, which is exactly what the sheet shows.
    const root = flat ? at(4.6, 0) : at(3.6, -B.rHeadBack * 0.72);
    const knot = flat ? at(7.6, 0) : at(5.8, -B.rHeadBack * 1.2);
    part(ctx, C, [[root, 1.5], [knot, 2.9]], { fill: C.hair, shade: false });
  } else if (B.hairStyle === "tail") {
    // It hangs off the BACK of the skull and gravity wins: the tail falls down
    // the screen, pulled part of the way toward the back of the head so it
    // swings when the head turns instead of standing straight out behind like a
    // rudder. In a hinge or a plank it drops toward the floor, which is the
    // whole test of whether hair reads as hair.
    const back = flat ? V(0, 0) : scl(f, -1);
    const dir = norm2(add(V(0, 1), scl(back, 0.5)));
    // Front on the tail is directly behind the head, so a centred one is
    // invisible. It is nudged off the midline instead, which is what you
    // actually catch of a ponytail from the front: a bit of it past the neck.
    const off = flat && !away ? V(-B.rHeadBack * 0.5, 0) : V(0, 0);
    const root = flat ? add(at(1.4, 0), off) : add(at(1.6, -B.rHeadBack * 0.66), scl(dir, 1.2));
    const len = B.tail * (flat && !away ? 0.86 : 1);
    const mid = add(root, scl(dir, len * 0.5));
    const tip = add(mid, scl(dir, len * 0.5));
    part(ctx, C, [
      [root, B.tailR * (away || !flat ? 1 : 0.82)],
      [mid, B.tailR * 0.94],
      [tip, B.tailR * 0.46],
    ], { fill: C.hair, shade: false });
  }
  if (COLLECT) return;
  // one soft tone down the shaded side of the face and jaw
  const sd = (f.x * 0.42 + f.y * 0.91 < 0) ? -1 : 1;
  ctx.save();
  hull(ctx, C, skull, { clip: true });
  capsulePath(ctx,
    add(at(2.0, 0), scl(f, sd * B.rHeadBack * 0.72)), B.rHeadBack * 0.62,
    add(at(-4.0, flat ? 0 : 1.2), scl(f, sd * B.rHeadBack * 0.5)), B.rHeadJaw * 0.62);
  ctx.fillStyle = C.shade;
  ctx.fill();
  ctx.restore();
  // No face plane and no brow line. In the bold style the front of the head is
  // a plain light shape and the HAIRLINE is what tells you it is facing you:
  // front on the cap stops level across the forehead, from behind there is no
  // hairline at all because the whole skull is hair.
  // hair: a cap over the cranium ending in a hairline at the forehead and
  // behind the ear, clipped to the skull so it never breaks the silhouette
  ctx.save();
  hull(ctx, C, skull, { clip: true });
  if (B.hairStyle !== "none") {
  // The cap is drawn with circles far above the head, so the edge that lands on
  // the skull is nearly straight: that edge IS the hairline. Front on it runs
  // level across the forehead; side on it slopes down behind the ear. From
  // BEHIND there is no hairline at all: the whole skull is hair down to the
  // nape, which is what you actually see of the back of a head.
  // A small cap on the crown, the same from every side: the sheet's figure
  // wears a little dark cap that stops well above the brow.
  const capTop = 5.2;
  const hair = [[at(capTop + 30, -5), 30], [at(capTop + 30, 5), 30]];
  const hsegs = [];
  for (let i = 0; i < hair.length - 1; i++) hsegs.push([hair[i][0], hair[i][1], hair[i + 1][0], hair[i + 1][1]]);
  ctx.fillStyle = C.hair;
  for (const g of hsegs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.fill(); }
  // A small peak down the centre of the forehead. Without it the hairline is a
  // ruled line across the head and the cap reads as a swimming cap; the sheet
  // has a soft point in the middle.
  {
    const peakF = flat ? 0 : -B.rHeadBack * 0.1;
    capsulePath(ctx, at(capTop + 0.4, peakF), B.rHeadBack * 0.22, at(capTop - 1.4, peakF), B.rHeadBack * 0.08);
    ctx.fill();
  }
  // the sideburn: a short tab of the cap running down in front of the ear

  }
  ctx.restore();
  // ear: a small shape at the hairline, the only feature on the head
  const ears = [];  // the sheet's head has no ear
  // The face. Placed from the head's PROJECTED axes so it lands right in any
  // view: forward along the anterior axis (which foreshortens to nothing face
  // on and to full length side on), spread along the lateral axis (the other
  // way round). Hidden when the face points away from the camera.
  if (!COLLECT && FACE && FACE !== "none") {
    const ax = S.neckAxis;
    const toward = away ? -ax.x.d : ax.x.d;
    if (toward > -0.08) {
      const R = B.rHeadBack;
      const centre = add(S.head, scl(norm2(ax.y), -0.9));
      const F = V(ax.x.x, ax.x.y), Lt = V(ax.z.x, ax.z.y);
      const latLen = Math.hypot(Lt.x, Lt.y);
      const fwd = add(centre, scl(F, R * 0.66));
      const spread = R * 0.4;
      const eyes = latLen < 0.28 ? [fwd] : [add(fwd, scl(Lt, spread)), add(fwd, scl(Lt, -spread))];
      ctx.save();
      hull(ctx, C, skull, { clip: true });
      ctx.fillStyle = C.seam;
      if (FACE === "buddy") {
        // The face Mo approved (reference/face-buddy.png): a dark visor with
        // two lime pill eyes and grille marks, a tiny nose tick, a small
        // mouth, a lime chin light, an ear disc seen from the side. Moods
        // change only the eyes and the mouth: neutral, happy, focused,
        // surprised, sleepy. Everything is a few flat shapes so it survives
        // card size; the grille and the nose drop out below 200px.
        const up = norm2(ax.y);
        const px = (ctx.getTransform ? ctx.getTransform().a : 2) * R;   // head radius in device pixels
        const big = px > 14;
        const tiny = px < 11;   // rows and small cards: a visor band only, eyes would be a smudge
        const blink = FACE_TIME > 0 && ((FACE_TIME % 4.3) < 0.11);
        const eyeLine = add(centre, scl(up, R * 0.12));
        // Side on, the visor wraps only the FRONT half of the head, the way
        // the reference draws it, with the ear clear behind it. Face on it
        // spans the face.
        const sideOn = latLen < 0.28;
        const vis = add(eyeLine, scl(F, R * (sideOn ? 0.72 : 0.66)));
        const halfW = R * (sideOn ? 0.5 : 0.8), halfH = R * 0.42;
        const along = latLen < 0.28 ? scl(F, 0.9) : Lt;     // visor runs across the face, or along it side on
        const alongLen = latLen < 0.28 ? 0.9 : latLen;
        const a = add(vis, scl(along, halfW)), b = add(vis, scl(along, -halfW));
        ctx.fillStyle = C.seam;
        capsulePath(ctx, a, halfH, b, halfH); ctx.fill();
        const lime = C.accent;
        if (tiny) {
          // two soft lime marks inside the band so it still reads as a face
          ctx.fillStyle = lime;
          const e1 = add(vis, scl(along, R * 0.3)), e2 = add(vis, scl(along, -R * 0.3));
          for (const e of (latLen < 0.28 ? [vis] : [e1, e2])) { ctx.beginPath(); ctx.arc(e.x, e.y, R * 0.16, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
          return;
        }
        const eyeSpread = R * 0.36 * (latLen < 0.28 ? 0.35 : 1);
        const eyeAt = [add(vis, scl(along, eyeSpread)), add(vis, scl(along, -eyeSpread))];
        const eyeH = R * 0.26, eyeW = R * 0.105;
        const mood = MOOD || "neutral";
        ctx.strokeStyle = lime; ctx.lineCap = "round"; ctx.lineWidth = eyeW * 1.6;
        for (let i = 0; i < eyeAt.length; i++) {
          const e = eyeAt[i], sign = i === 0 ? 1 : -1;
          if (blink || mood === "sleepy") {
            // a closed eye: a soft downward arc
            ctx.beginPath();
            const l = add(e, scl(along, -eyeW * 1.6)), r2 = add(e, scl(along, eyeW * 1.6)), m = add(e, scl(up, -eyeW * 0.9));
            ctx.moveTo(l.x, l.y); ctx.quadraticCurveTo(m.x, m.y, r2.x, r2.y); ctx.stroke();
          } else if (mood === "happy") {
            // an upward arc, the ^ ^ of a smile with the eyes
            ctx.beginPath();
            const l = add(e, scl(along, -eyeW * 1.6)), r2 = add(e, scl(along, eyeW * 1.6)), m = add(e, scl(up, eyeW * 1.6));
            ctx.moveTo(l.x, l.y); ctx.quadraticCurveTo(m.x, m.y, r2.x, r2.y); ctx.stroke();
          } else if (mood === "focused") {
            // a wedge tilted in toward the nose: effort
            const tilt = scl(along, sign * eyeW * 1.2);
            ctx.fillStyle = lime;
            const top = add(add(e, scl(up, eyeH * 0.6)), tilt), bot = add(e, scl(up, -eyeH * 0.6));
            capsulePath(ctx, top, eyeW * 0.55, bot, eyeW * 1.1); ctx.fill();
          } else {
            const tall = mood === "surprised" ? 1.25 : 1;
            ctx.fillStyle = lime;
            capsulePath(ctx, add(e, scl(up, eyeH * tall)), eyeW, add(e, scl(up, -eyeH * tall)), eyeW); ctx.fill();
          }
        }
        if (big && latLen >= 0.28) {
          // grille: three short dashes just outside each eye
          ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = R * 0.045; ctx.lineCap = "round";
          for (const sign of [1, -1]) for (let k = -1; k <= 1; k++) {
            const g = add(add(vis, scl(along, sign * R * 0.62)), scl(up, k * R * 0.12));
            ctx.beginPath(); ctx.moveTo(g.x - along.x * R * 0.07, g.y - along.y * R * 0.07); ctx.lineTo(g.x + along.x * R * 0.07, g.y + along.y * R * 0.07); ctx.stroke();
          }
        }
        // mouth: a short dark line below the visor; a smile when happy or at
        // rest, straight when focused or neutral, a small ring when surprised
        const mouthAt = add(add(centre, scl(F, R * 0.7)), scl(up, -R * 0.42));
        ctx.strokeStyle = C.seam; ctx.lineWidth = R * 0.05; ctx.lineCap = "round";
        const mw = R * 0.16 * (latLen < 0.28 ? 0.5 : 1);
        if (mood === "surprised") {
          ctx.beginPath(); ctx.arc(mouthAt.x, mouthAt.y, R * 0.06, 0, Math.PI * 2); ctx.stroke();
        } else {
          const l = add(mouthAt, scl(along, -mw)), r2 = add(mouthAt, scl(along, mw));
          const dip = (mood === "happy" || mood === "neutral") ? add(mouthAt, scl(up, -R * 0.06)) : mouthAt;
          ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.quadraticCurveTo(dip.x, dip.y, r2.x, r2.y); ctx.stroke();
        }
        // chin light: a short lime capsule low on the face
        const chin = add(add(centre, scl(F, R * 0.62)), scl(up, -R * 0.66));
        ctx.fillStyle = lime;
        capsulePath(ctx, add(chin, scl(along, -R * 0.08)), R * 0.03, add(chin, scl(along, R * 0.08)), R * 0.03); ctx.fill();
        // Ear disc: a ring with a dot on the side of the head, drawn only when
        // that side faces the camera enough to see it (side and three
        // quarter views). Face on, the ears sit on the silhouette edge and the
        // reference shows none, so none are drawn.
        if (big && latLen < 0.9) {
          const sideSign = (ax.z.d >= 0 ? 1 : -1) * (away ? -1 : 1);
          // behind the visor, level with the eyes, out on the side of the skull
          const ep = add(add(add(centre, scl(up, R * 0.08)), scl(F, -R * 0.3)), scl(Lt, sideSign * R * 0.66));
          ctx.strokeStyle = C.seam; ctx.lineWidth = R * 0.045;
          ctx.beginPath(); ctx.arc(ep.x, ep.y, R * 0.17, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = C.seam; ctx.beginPath(); ctx.arc(ep.x, ep.y, R * 0.06, 0, Math.PI * 2); ctx.fill();
        }
      } else if (FACE === "robot" || FACE === "robotglow" || FACE === "robotvisor") {
        // A cute robot: two tall rounded eyes, blinking now and then. Sized
        // to read at card size, which the dots did not. "robotglow" lights
        // them in the accent so the character carries the app's colour;
        // "robotvisor" sets them in a dark band.
        const up = norm2(ax.y);
        const blink = FACE_TIME > 0 && ((FACE_TIME % 4.3) < 0.11);
        // Big: each eye about a third of the head's width, or they are dots.
        const eh = blink ? R * 0.04 : R * 0.26, ew = R * 0.2;
        const eyeSpread = R * 0.36;
        const eyeAt = latLen < 0.28 ? [fwd] : [add(fwd, scl(Lt, eyeSpread)), add(fwd, scl(Lt, -eyeSpread))];
        if (FACE === "robotvisor") {
          const a = add(fwd, scl(Lt, eyeSpread * 1.6)), b = add(fwd, scl(Lt, -eyeSpread * 1.6));
          ctx.fillStyle = C.seam;
          capsulePath(ctx, latLen < 0.28 ? add(fwd, scl(F, 0.8)) : a, R * 0.42, latLen < 0.28 ? add(fwd, scl(F, -0.8)) : b, R * 0.42);
          ctx.fill();
        }
        for (const e of eyeAt) {
          const top = add(e, scl(up, eh)), bot = add(e, scl(up, -eh));
          if (FACE === "robot") {
            ctx.fillStyle = C.seam; capsulePath(ctx, top, ew, bot, ew); ctx.fill();
          } else if (FACE === "robotvisor") {
            ctx.fillStyle = C.accent; capsulePath(ctx, top, ew * 0.8, bot, ew * 0.8); ctx.fill();
          } else {
            // a dark rim so the glow reads on the white head, then the light
            ctx.fillStyle = C.seam; capsulePath(ctx, top, ew * 1.25, bot, ew * 1.25); ctx.fill();
            ctx.fillStyle = C.accent; capsulePath(ctx, top, ew * 0.85, bot, ew * 0.85); ctx.fill();
          }
        }
      } else if (FACE === "visor") {
        // one soft band across the eye line, the visor read some robots have
        const a = add(fwd, scl(Lt, spread * 1.15)), b = add(fwd, scl(Lt, -spread * 1.15));
        capsulePath(ctx, latLen < 0.28 ? add(fwd, scl(F, 0.3)) : a, R * 0.11, latLen < 0.28 ? add(fwd, scl(F, -0.3)) : b, R * 0.11);
        ctx.fill();
      } else {
        for (const e of eyes) { ctx.beginPath(); ctx.arc(e.x, e.y, R * 0.1, 0, Math.PI * 2); ctx.fill(); }
        if (FACE === "dotsmouth") {
          const m = add(add(centre, scl(F, R * 0.66)), scl(norm2(ax.y), -R * 0.42));
          const half = latLen < 0.28 ? R * 0.08 : spread * 0.45;
          ctx.strokeStyle = C.seam; ctx.lineWidth = 0.5; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(m.x - Lt.x * half, m.y - Lt.y * half); ctx.lineTo(m.x + Lt.x * half, m.y + Lt.y * half); ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  for (const sd2 of ears) {
    // Behind the cheekbone, not on it. At 1.0 forward the ear landed in the
    // middle of the face and read as a single staring eye.
    const across = V(-u.y, u.x);
    const ear = flat
      ? add(at(-1.2, 0), scl(across, sd2 * B.rHeadBack * 0.8))
      : at(-1.2, sd2 * 3.0);
    const tip = add(ear, scl(u, -1.3));
    capsulePath(ctx, ear, 1.35, tip, 1.1);
    ctx.fillStyle = fill; ctx.fill();
    capsulePath(ctx, ear, 1.55, tip, 1.25);
    ctx.strokeStyle = C.seamSoft; ctx.lineWidth = 0.3; ctx.stroke();
  }
}

// A limb segment as a smooth taper: radii are control points along the bone
// (Catmull-Rom between them), sampled into a chain of circles that part()
// joins with capsules. This is what makes an arm read as an arm: thick at the
// shoulder, narrow at the wrist, one swell in the forearm, no ball at the
// joint. Mo looked at tube limbs with joint balls and said "something is
// wrong with the legs and arms", and this was it.
function taper(a, b, radii, n = 7) {
  const out = [];
  const m = radii.length - 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = t * m, k = Math.max(0, Math.min(m - 1, Math.floor(x))), u = x - k;
    const p0 = radii[Math.max(0, k - 1)], p1 = radii[k], p2 = radii[k + 1], p3 = radii[Math.min(m, k + 2)];
    const r = 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
    out.push([lerpV(a, b, t), r]);
  }
  return out;
}

// A ring at a joint, the way a drawing doll shows its elbow and knee. Drawn
// after the limb is filled so it sits on top; skipped in the collect pass.
function ring(ctx, C, p, r) {
  if (COLLECT) return;
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = C.seam; ctx.lineWidth = 0.5; ctx.stroke();
}

function drawArm(ctx, S, side, C, fill, grip, skinOpts) {
  const B = ACTIVE, k = S.sides[side];
  const d = norm2(sub(k.elbow, k.shoulder));
  // Three parts, not one: deltoid, upper arm, forearm. The reference draws a
  // seam where the shoulder cap meets the arm and a ring at the elbow, and the
  // cheapest way to get exactly those two lines and no others is to let them be
  // the boundaries between parts.
  // The deltoid belongs to the TORSO's yoke, not to the arm. Drawing it here as
  // well put two outlines across each other at the shoulder and made an X. The
  // arm now starts just below the cap, so the shoulder carries exactly one
  // seam, which is what the reference draws.
  const top = add(k.shoulder, scl(d, 1.6));
  part(ctx, C, taper(top, k.elbow, [B.rDelt * 0.92, B.rUpperArmMid * 1.06, B.rUpperArmMid * 0.94, B.rElbow * 1.08, B.rElbow]), { fill });
  part(ctx, C, taper(k.elbow, k.wrist, [B.rElbow, B.rForearmMid, B.rForearmMid * 0.9, B.rWrist * 1.25, B.rWrist]), { fill });
  if (skinOpts && skinOpts.plates) armPlates(ctx, S, side, C, skinOpts.lit);
  drawHand(ctx, S, side, C, fill, grip);
}

// Hip, thigh and shin as one surface, with a crease at the knee.
function drawLeg(ctx, S, side, C, fill, skinOpts) {
  const B = ACTIVE, k = S.sides[side];
  const sh = norm2(sub(k.ankle, k.knee));
  // Thigh and shin are separate parts so the knee carries the ring the
  // reference draws on a straight leg. The crease below only fires when the
  // knee is actually bent and deepens the same line.
  /* No seam where the thigh meets the pelvis. With one, the near leg left an
     arc bulging UP into the pelvis and the far leg got the pelvis edge bulging
     DOWN into the thigh: two different curves, one each side, and Mo read the
     pair as a pelvis turned away from the camera. Seamless hips face straight.
     The knee keeps its seam and its crease. */
  part(ctx, C, taper(k.hip, k.knee, [B.rHip, B.rHip * 0.95, B.rThighMid * 0.92, B.rKnee * 1.12, B.rKnee]), { fill, line: false });
  part(ctx, C, taper(k.knee, k.ankle, [B.rKnee * 0.98, B.rCalf, B.rCalf * 0.92, B.rCalf * 0.68, B.rAnkleDraw]), { fill });
  if (skinOpts && skinOpts.plates) legPlates(ctx, S, side, C, skinOpts.lit);
  drawFoot(ctx, S, side, C, fill);
}

// The lines the reference sheet draws on the torso: the pec underline, the
// waist, the hip crease, and on the back the spine and the shoulder blades.
// They are the same hairline as the silhouette, clipped inside the body, and
// they are most of what makes a flat grey shape read as a torso.
function torsoLines(ctx, S, C) {
  if (COLLECT) return;
  if (!LINES_TORSO) return;
  const B = ACTIVE;
  const u = norm2(S.torsoAxis.y);
  const flat = S.frontal;
  const lat = flat ? norm2(S.torsoAxis.z) : norm2(S.torsoAxis.x);
  const at = (up, side) => add(add(S.chest, scl(u, up)), scl(lat, side));
  const line = (pts, w = 0.5) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
    }
    const L = pts[pts.length - 1];
    ctx.lineTo(L.x, L.y);
    ctx.strokeStyle = C.seam;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.stroke();
  };
  ctx.save();
  const waist = lerpV(S.pelvis, S.chest, 0.46);
  const body = [[S.pelvis, B.rPelvis], [waist, B.rWaist], [S.chest, S.chestR]];
  const clip = new Path2D();
  for (let i = 0; i < body.length - 1; i++) {
    capsulePathInto(clip, body[i][0], body[i][1], body[i + 1][0], body[i + 1][1]);
  }
  ctx.clip(clip);
  if (flat && S.facing === "away") {
    // Back: shoulder blades, a spine line and the crease between the glutes.
    line([at(4.0, 0), at(-6, 0), at(-16, 0)], 0.5);
    for (const g of [-1, 1]) {
      line([at(2.0, g * 2.4), at(-1.6, g * 6.8), at(-5.4, g * 7.6)], 0.44);
    }
    line([at(-22.5, 0), at(-27.5, 0)], 0.5);
    line([at(-16.5, -9), at(-17.6, 0), at(-16.5, 9)], 0.44);           // waist
  } else if (flat) {
    // Front: the chest line and the abdominal centre line, plus the waist.
    for (const g of [-1, 1]) {
      line([at(1.6, g * 1.2), at(-3.4, g * 5.8), at(-2.8, g * 9.6)], 0.5);
    }
    line([at(-4.0, 0), at(-10, 0), at(-16, 0)], 0.42);
    line([at(-16.5, -9), at(-17.6, 0), at(-16.5, 9)], 0.44);           // waist
    for (const g of [-1, 1]) {
      line([at(-19.5, g * 8.4), at(-23.5, g * 4.4), at(-26, 0)], 0.5); // groin
    }
  } else {
    line([at(1.8, 5.6), at(-3.0, 7.0), at(-3.4, 3.0)]);                  // pec underline
    line([at(-12.5, 5.6), at(-13.5, 2.0)], 0.42);                        // lower ribs
    line([at(-19, 6.6), at(-23, 4.0), at(-25, 0)], 0.55);                // hip crease
    line([at(-16, -7.0), at(-21, -7.6), at(-25, -5.0)], 0.5);            // glute
  }
  ctx.restore();
}

// Three circles down the torso so the silhouette narrows at the waist, plus a
// soft chest plate. Flat two tone: a designed figure, not an anatomy chart.
function drawTorso(ctx, S, C, fill, skinOpts) {
  const B = ACTIVE;
  // The neck flares into the shoulders instead of standing on them like a peg.
  // The wide bottom circle is the trapezius, and it is most of what stops the
  // head reading as a ball on a stick.
  const nu = norm2(S.torsoAxis.y);
  // Clavicle and trapezius: a yoke from the base of the neck out to each
  // shoulder joint. Without it the neck stands on a flat shelf and the
  // deltoids read as pads bolted on; the reference sheet has one unbroken
  // slope from ear to shoulder.
  const yoke = lerpV(S.chest, S.neckTop, 0.26);
  const fv = S.frontal;
  const waist = lerpV(S.pelvis, S.chest, 0.46);
  /* The trunk carries no outline of its own (a stroke doubled up with the
     limb on top). It paints plain, then its edge is stroked only where it
     runs over an arm painted before it, then it is filled again so only the
     outer half of that stroke survives: the same hairline a near arm leaves.
     The shoulder yoke is NOT drawn here any more, see drawYoke: it goes on
     after both arms so the deltoid cap sits over the arm on both sides. */
  const under = DRAWN ? [...DRAWN.L, ...DRAWN.R] : [];
  const trunk = [[S.pelvis, B.rPelvis], [waist, B.rWaist], [S.chest, S.chestR]];
  part(ctx, C, trunk, { fill, line: false });
  if (!COLLECT && under.length) {
    const below = new Path2D();
    for (const g of under) capsulePathInto(below, g[0], g[1], g[2], g[3]);
    ctx.save();
    ctx.clip(below);
    ctx.strokeStyle = C.seam; ctx.lineWidth = 0.3; ctx.lineJoin = "round";
    for (let k = 0; k < trunk.length - 1; k++) {
      capsulePath(ctx, trunk[k][0], trunk[k][1], trunk[k + 1][0], trunk[k + 1][1]);
      ctx.stroke();
    }
    ctx.restore();
    part(ctx, C, trunk, { fill, line: false });
  }
  // The soft convex curve the female sheet draws on the front of the torso,
  // between the shoulder and the waist. Side view only: face on, the same shape
  // would be two circles stuck to a flat chest, which is not what the sheet
  // does.
  if (B.bust && !fv) {
    const f = norm2(S.torsoAxis.x);
    const at = lerpV(S.pelvis, S.chest, B.bustAt);
    const rHere = B.rWaist + (S.chestR - B.rWaist) * 0.62;
    const rb = B.rChest * 0.44;
    const out = rHere + B.bust - rb;
    part(ctx, C, [
      [add(at, scl(f, out * 0.30)), rb * 0.92],
      [add(at, scl(f, out)), rb],
    ], { fill });
  }
  // The neck goes on LAST so its base arc lands on top of the chest: that arc
  // is the neck seam the sheet draws, and drawn first it was painted over.
  /* The neck has no line of its own in any pose. It is part of the one
     silhouette the union pass draws; an internal outline here read as a
     collar when upright and as a bar across the chest when lying, and Mo
     asked for it gone both times. */
  part(ctx, C, [
    [add(S.chest, scl(nu, -0.6)), B.rNeckBot * 1.2],
    [lerpV(S.chest, S.neckTop, 0.5), B.rNeckBot * 0.8],
    [S.neckTop, B.rNeckTop],
  ], { fill, line: false });
  if (skinOpts && skinOpts.plates) { torsoPlates(ctx, S, C, skinOpts.lit); return; }
  torsoLines(ctx, S, C);
  // A single soft mass under the collarbone gives the chest volume. It used to
  // be a hard edged capsule across the whole chest, which at 160px read as the
  // front panel of a vest.
  const u = norm2(S.torsoAxis.y), f = norm2(S.torsoAxis.x);
  void fv;
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
  // Panels are separated by the body showing through, exactly as in
  // figure-muscles.png. A dark line here turns every limb into armour.
  ctx.strokeStyle = C.plateSeam;
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
  ctx.strokeStyle = C.plateSeam;
  ctx.lineWidth = 1.4;
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.stroke(); }
  ctx.fillStyle = litFill(group, C, lit);
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.fill(); }
}

// Panels traced off knowledge/motion/reference/figure-muscles.png: mid grey
// shapes on the light body, with the body showing through between them as the
// light seam. Each view draws the panels that view actually shows.
function armPlates(ctx, S, side, C, lit) {
  if (COLLECT) return;
  const B = ACTIVE, k = S.sides[side];
  const flat = S.frontal;
  const back = flat && S.facing === "away";
  const face = flat ? V(0, 0) : k.axis.arm.x;
  const faceF = flat ? V(0, 0) : k.axis.fore.x;
  const sh = add(k.shoulder, scl(norm2(sub(k.elbow, k.shoulder)), -1.8));
  // deltoid: a cap over the joint running a third of the way down
  bonePlate(ctx, C, "shoulders", lit, sh, B.rDelt, k.elbow, B.rElbow, face, [
    { at: 0.02, w: 0.94, side: 0 }, { at: 0.16, w: 0.9, side: 0 },
    { at: 0.3, w: 0.72, side: 0 }, { at: 0.4, w: 0.42, side: 0 },
  ]);
  if (back || (!flat)) {
    // triceps: the long mass down the back of the upper arm
    bonePlate(ctx, C, "triceps", lit, k.shoulder, B.rShoulder, k.elbow, B.rElbow, face, [
      { at: 0.3, w: back ? 0.62 : 0.44, side: back ? 0 : -1 },
      { at: 0.62, w: back ? 0.7 : 0.52, side: back ? 0 : -1 },
      { at: 0.96, w: back ? 0.5 : 0.34, side: back ? 0 : -1 },
    ]);
  }
  if (!back) {
    bonePlate(ctx, C, "biceps", lit, k.shoulder, B.rShoulder, k.elbow, B.rElbow, face,
      flat ? [{ at: 0.36, w: 0.62, side: 0 }, { at: 0.64, w: 0.7, side: 0 }, { at: 0.94, w: 0.46, side: 0 }]
           : [{ at: 0.34, w: 0.42, side: 1 }, { at: 0.62, w: 0.54, side: 1 }, { at: 0.94, w: 0.36, side: 1 }]);
  }
  // forearm: a broad mass at the elbow running out to nothing at the wrist
  bonePlate(ctx, C, "forearms", lit, k.elbow, B.rElbow, k.wrist, B.rWrist, faceF,
    flat ? [{ at: 0.06, w: 0.74, side: 0 }, { at: 0.34, w: 0.66, side: 0 }, { at: 0.86, w: 0.4, side: 0 }]
         : [{ at: 0.06, w: 0.62, side: 1 }, { at: 0.34, w: 0.58, side: 1 }, { at: 0.86, w: 0.34, side: 1 }]);
  if (!flat) {
    bonePlate(ctx, C, "forearms", lit, k.elbow, B.rElbow, k.wrist, B.rWrist, faceF, [
      { at: 0.1, w: 0.42, side: -1 }, { at: 0.5, w: 0.36, side: -1 }, { at: 0.8, w: 0.24, side: -1 },
    ]);
  }
}

function legPlates(ctx, S, side, C, lit) {
  if (COLLECT) return;
  const B = ACTIVE, k = S.sides[side];
  const flat = S.frontal;
  const back = flat && S.facing === "away";
  const face = flat ? V(0, 0) : k.axis.thigh.x;
  const faceS = flat ? V(0, 0) : k.axis.shin.x;
  if (back) {
    // glute as one round mass per side, then two hamstring strips
    bonePlate(ctx, C, "glutes", lit, k.hip, B.rHip, k.knee, B.rKnee, face, [
      { at: -0.1, w: 0.92, side: 0 }, { at: 0.06, w: 0.94, side: 0 }, { at: 0.2, w: 0.66, side: 0 },
    ]);
    for (const o of [-0.42, 0.42]) {
      bonePlate(ctx, C, "hamstrings", lit, k.hip, B.rHip, k.knee, B.rKnee, face, [
        { at: 0.3, w: 0.34, side: o }, { at: 0.6, w: 0.4, side: o }, { at: 0.9, w: 0.28, side: o },
      ]);
    }
  } else {
    bonePlate(ctx, C, "glutes", lit, k.hip, B.rHip, k.knee, B.rKnee, face,
      flat ? [{ at: -0.02, w: 0.72, side: 0 }, { at: 0.14, w: 0.6, side: 0 }]
           : [{ at: -0.08, w: 0.82, side: -1 }, { at: 0.1, w: 0.7, side: -1 }, { at: 0.26, w: 0.44, side: -1 }]);
    if (flat) {
      // quads: rectus down the middle, vastus lateralis outside, and the
      // medialis teardrop just above the knee
      bonePlate(ctx, C, "quads", lit, k.hip, B.rHip, k.knee, B.rKnee, face, [
        { at: 0.2, w: 0.4, side: 0 }, { at: 0.52, w: 0.46, side: 0 }, { at: 0.86, w: 0.34, side: 0 },
      ]);
      bonePlate(ctx, C, "quads", lit, k.hip, B.rHip, k.knee, B.rKnee, face, [
        { at: 0.16, w: 0.34, side: k.lat * 0.5 }, { at: 0.5, w: 0.4, side: k.lat * 0.52 },
        { at: 0.78, w: 0.26, side: k.lat * 0.5 },
      ]);
      bonePlate(ctx, C, "quads", lit, k.hip, B.rHip, k.knee, B.rKnee, face, [
        { at: 0.68, w: 0.26, side: -k.lat * 0.5 }, { at: 0.84, w: 0.34, side: -k.lat * 0.52 },
        { at: 0.95, w: 0.22, side: -k.lat * 0.48 },
      ]);
    } else {
      bonePlate(ctx, C, "quads", lit, k.hip, B.rHip, k.knee, B.rKnee, face, [
        { at: 0.16, w: 0.46, side: 1 }, { at: 0.5, w: 0.58, side: 1 },
        { at: 0.78, w: 0.52, side: 1 }, { at: 0.93, w: 0.3, side: 1 },
      ]);
      bonePlate(ctx, C, "hamstrings", lit, k.hip, B.rHip, k.knee, B.rKnee, face, [
        { at: 0.3, w: 0.4, side: -1 }, { at: 0.6, w: 0.46, side: -1 }, { at: 0.92, w: 0.26, side: -1 },
      ]);
    }
  }
  // calf: two heads from behind, one belly from the front or side
  if (back) {
    for (const o of [-0.34, 0.34]) {
      bonePlate(ctx, C, "calves", lit, k.knee, B.rKnee, k.ankle, B.rAnkle, faceS, [
        { at: 0.1, w: 0.38, side: o }, { at: 0.3, w: 0.46, side: o }, { at: 0.62, w: 0.22, side: o },
      ]);
    }
  } else {
    bonePlate(ctx, C, "calves", lit, k.knee, B.rKnee, k.ankle, B.rAnkle, faceS,
      flat ? [{ at: 0.08, w: 0.54, side: k.lat * 0.4 }, { at: 0.3, w: 0.62, side: k.lat * 0.4 },
              { at: 0.66, w: 0.3, side: k.lat * 0.36 }]
           : [{ at: 0.06, w: 0.5, side: -1 }, { at: 0.28, w: 0.64, side: -1 },
              { at: 0.52, w: 0.5, side: -1 }, { at: 0.8, w: 0.24, side: -1 }]);
  }
}

function torsoPlates(ctx, S, C, lit) {
  if (COLLECT) return;
  const B = ACTIVE;
  const P = S.pelvis, Ch = S.chest;
  const flat = S.frontal;
  const back = flat && S.facing === "away";
  const u = norm2(S.torsoAxis.y);
  const lat = flat ? norm2(S.torsoAxis.z) : norm2(S.torsoAxis.x);
  const at = (up, side) => add(add(Ch, scl(u, up)), scl(lat, side));
  if (back) {
    // trapezius diamond from the neck out over both shoulders and down the back
    freePlate(ctx, C, "traps", lit, [
      [at(3.2, 0), 4.0], [at(0.6, -6.4), 3.6], [at(-4.0, -3.0), 3.4],
      [at(-7.0, 0), 3.2], [at(-4.0, 3.0), 3.4], [at(0.6, 6.4), 3.6], [at(3.2, 0), 4.0],
    ]);
    // lats: wings from under each armpit converging into the waist
    for (const g of [-1, 1]) {
      freePlate(ctx, C, "lats", lit, [
        [at(-1.6, g * 8.4), 3.6], [at(-7.5, g * 7.0), 4.0], [at(-13.5, g * 3.6), 2.8],
      ]);
    }
    for (const g of [-1, 1]) {
      freePlate(ctx, C, "lowerback", lit, [[at(-11.5, g * 1.9), 1.9], [at(-18.0, g * 1.9), 1.9]]);
    }
  } else if (flat) {
    for (const g of [-1, 1]) {
      freePlate(ctx, C, "traps", lit, [[at(3.4, g * 1.6), 2.6], [at(1.0, g * 6.6), 3.0]]);
      // pec: a broad panel from the sternum out to the armpit
      freePlate(ctx, C, "chest", lit, [
        [at(-0.6, g * 2.0), 3.4], [at(0.4, g * 5.6), 4.4], [at(-0.8, g * 8.8), 4.0],
      ]);
      // serratus and obliques at the side of the ribs
      freePlate(ctx, C, "obliques", lit, [[at(-9.5, g * 6.6), 2.4], [at(-15.0, g * 5.2), 2.6]]);
    }
    // rectus: three rows of two
    for (const [up, r] of [[-6.4, 2.5], [-10.6, 2.5], [-14.6, 2.3]]) {
      for (const g of [-1, 1]) freePlate(ctx, C, "abs", lit, [[at(up, g * 2.9), r]]);
    }
  } else {
    freePlate(ctx, C, "traps", lit, [[at(3.6, 1.0), 2.8], [at(1.4, -4.6), 3.0]]);
    freePlate(ctx, C, "chest", lit, [
      [at(1.2, 6.0), 3.6], [at(-2.6, 7.2), 4.0], [at(-5.4, 5.6), 3.0],
    ]);
    freePlate(ctx, C, "lats", lit, [
      [at(-1.2, -7.4), 4.2], [at(-7.5, -8.0), 4.4], [at(-14.0, -5.6), 3.2],
    ]);
    freePlate(ctx, C, "lowerback", lit, [[at(-16.0, -6.0), 2.8], [at(-21.0, -5.0), 2.6]]);
    for (const [up, r] of [[-7.0, 2.3], [-11.4, 2.3], [-15.4, 2.1]]) {
      freePlate(ctx, C, "abs", lit, [[at(up, 5.4), r]]);
    }
    freePlate(ctx, C, "obliques", lit, [[at(-12.0, 1.6), 2.6], [at(-17.5, 1.0), 2.4]]);
  }
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
// ---- the parts every piece of gym equipment is built from ----
// The unit of a real gym is box-section steel, round tube, black vinyl pad
// and chrome bar. Drawing those four well once is what makes a bench, a rack
// and a cable column look like they came from the same catalogue.
// Which way is "up" for a highlight on a tube that runs at any angle.
function upNormal(a, b) {
  const d = norm2(sub(b, a));
  const n = V(-d.y, d.x);
  return n.y < 0 ? n : V(-n.x, -n.y);
}
// A square-section upright from `top` down to `bottom`, with a flat foot on
// the floor unless told otherwise. `far` dims it for the far side of a frame.
function steelPost(ctx, C, x, top, bottom, w, far = false, foot = true) {
  ctx.fillStyle = far ? C.steelLo : C.steel;
  roundRect(ctx, x - w / 2, top, w, bottom - top, 1.3); ctx.fill();
  ctx.fillStyle = far ? C.steel : C.steelHi;
  roundRect(ctx, x - w / 2 + 0.7, top + 0.7, w * 0.26, bottom - top - 1.4, 0.7); ctx.fill();
  if (foot) {
    ctx.fillStyle = C.steelLo;
    roundRect(ctx, x - w * 1.7, bottom - 2.6, w * 3.4, 2.6, 1.2); ctx.fill();
  }
}
// A round tube between two points, lit along its upper edge.
function steelTube(ctx, C, a, b, r, far = false) {
  capsulePath(ctx, a, r, b, r);
  ctx.fillStyle = far ? C.steelLo : C.steel; ctx.fill();
  const n = scl(upNormal(a, b), r * 0.45);
  capsulePath(ctx, add(a, n), r * 0.28, add(b, n), r * 0.28);
  ctx.fillStyle = far ? C.steel : C.steelHi; ctx.fill();
}
// A vinyl pad of thickness t centred on the line a to b, with the stitched
// seam that runs along the top of every real one.
function padSlab(ctx, C, a, b, t) {
  const r = t / 2;
  capsulePath(ctx, a, r, b, r);
  ctx.fillStyle = C.pad; ctx.fill();
  const d = norm2(sub(b, a)), n = scl(upNormal(a, b), r * 0.55);
  capsulePath(ctx, add(add(a, n), scl(d, 2.2)), r * 0.2, add(add(b, n), scl(d, -2.2)), r * 0.2);
  ctx.fillStyle = C.padLine; ctx.fill();
}
// A chrome bar, knurled if asked, dimmed if far.
function chromeBar(ctx, C, a, b, r, knurl = false, far = false) {
  capsulePath(ctx, a, r, b, r);
  ctx.fillStyle = far ? C.chromeLo : C.chrome; ctx.fill();
  const n = scl(upNormal(a, b), r * 0.42);
  capsulePath(ctx, add(a, n), r * 0.3, add(b, n), r * 0.3);
  ctx.fillStyle = far ? C.chrome : C.chromeHi; ctx.fill();
  if (knurl) {
    const d = norm2(sub(b, a)), L = len2(sub(b, a)), m = upNormal(a, b);
    ctx.strokeStyle = C.chromeLo; ctx.lineWidth = 0.6;
    for (let s = 7; s < L - 7; s += 2.1) {
      const q = add(a, scl(d, s));
      ctx.beginPath(); ctx.moveTo(q.x - m.x * r * 0.85, q.y - m.y * r * 0.85); ctx.lineTo(q.x + m.x * r * 0.85, q.y + m.y * r * 0.85); ctx.stroke();
    }
  }
}
// Knurl on a chrome bar: fine ticks at low alpha, so at 300 px it reads as
// the cross-cut grip and at 160 px it fades to a slightly matte bar instead
// of turning into moire.
function knurl(ctx, C, a, b, r) {
  const d = norm2(sub(b, a)), L = len2(sub(b, a)), m = upNormal(a, b);
  ctx.save();
  ctx.strokeStyle = C.chromeLo; ctx.lineWidth = 0.55; ctx.globalAlpha = 0.6;
  for (let s = 0; s <= L; s += 2.6) {
    const q = add(a, scl(d, s));
    ctx.beginPath(); ctx.moveTo(q.x - m.x * r * 0.8, q.y - m.y * r * 0.8); ctx.lineTo(q.x + m.x * r * 0.8, q.y + m.y * r * 0.8); ctx.stroke();
  }
  ctx.restore();
}
// A box-section tube between two points at any angle, lit along whichever
// long edge faces up on screen. steelPost is the vertical special case; a
// bench leg that splays or a spine under a tilted pad needs this one.
function boxTube(ctx, C, a, b, w, far = false) {
  const d = norm2(sub(b, a)), L = len2(sub(b, a));
  const up = upNormal(a, b), side = -d.y * up.x + d.x * up.y > 0 ? 1 : -1;
  ctx.save();
  ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(d.y, d.x));
  ctx.fillStyle = far ? C.steelLo : C.steel;
  roundRect(ctx, -0.6, -w / 2, L + 1.2, w, 1.3); ctx.fill();
  ctx.fillStyle = far ? C.steel : C.steelHi;
  roundRect(ctx, 0.3, side > 0 ? w / 2 - 0.7 - w * 0.26 : -w / 2 + 0.7, L - 0.6, w * 0.26, 0.6); ctx.fill();
  ctx.restore();
}
// A pulley: a chrome wheel with a dark hub, in a bracket if the caller draws one.
function pulleyWheel(ctx, C, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = C.chrome; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.fillStyle = C.chromeLo; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r * 0.24, 0, Math.PI * 2); ctx.fillStyle = C.rubber; ctx.fill();
}
/* A single-column cable machine: the upright, the weight stack in its housing
   round the foot of it, guide rods, a selector pin. The carriage with the
   pulley is drawn by the cable prop at whatever height the move needs, so one
   tower serves a high pulley and a low one. */
function cableTower(ctx, C, x, y0) {
  steelPost(ctx, C, x, 3, y0 + 3, 6.5, false, false);
  ctx.fillStyle = C.iron;
  roundRect(ctx, x - 9.5, y0, 19, GROUND - y0, 2); ctx.fill();
  ctx.fillStyle = C.steelLo;
  roundRect(ctx, x - 14, GROUND - 2.6, 28, 2.6, 1.2); ctx.fill();
  ctx.fillStyle = C.ironHi;
  for (let y = y0 + 3.5; y < GROUND - 6; y += 5.2) { roundRect(ctx, x - 7.5, y, 15, 3.8, 1); ctx.fill(); }
  ctx.fillStyle = C.chromeLo;
  roundRect(ctx, x - 5.2, y0 + 1, 0.9, GROUND - y0 - 4, 0); ctx.fill();
  roundRect(ctx, x + 4.3, y0 + 1, 0.9, GROUND - y0 - 4, 0); ctx.fill();
  ctx.fillStyle = C.chrome;
  roundRect(ctx, x + 9, y0 + 4.5, 4.2, 1.5, 0.75); ctx.fill();
}
/* What is clipped to the end of a cable. `o` is where the hand holds it, `u`
   the direction the cable pulls (unit vector, pulley toward the hand). Items
   a hand steers (rope, V-bar, stirrup) hang along the cable; a bar stays
   level whatever the hands do, because a loaded bar cannot tilt. Returns how
   far back along the cable the clip sits, so the line can stop there. */
const GRIP_CLIP = { bar: 3.4, lat: 3.6, rope: 7.2, vbar: 7.6, handle: 7.4, strap: 2.6, none: 0 };
function cableGrip(ctx, C, grip, o, u, p) {
  const clip = GRIP_CLIP[grip] === undefined ? GRIP_CLIP.bar : GRIP_CLIP[grip];
  if (grip === "none") return 0;
  ctx.save();
  ctx.translate(o.x, o.y);
  const along = grip === "rope" || grip === "vbar" || grip === "handle";
  if (along) ctx.rotate(Math.atan2(u.y, u.x) - Math.PI / 2);
  // the snap hook between line and handle
  const hook = along ? V(0, -clip + 1.3) : V(-u.x * (clip - 1.3), -u.y * (clip - 1.3));
  ctx.strokeStyle = C.chrome; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.ellipse(hook.x, hook.y, 1.3, 1.9, along ? 0 : Math.atan2(u.y, u.x) - Math.PI / 2, 0, Math.PI * 2); ctx.stroke();
  if (grip === "bar") {
    const half = (p.barW === undefined ? 15 : p.barW) / 2;
    chromeBar(ctx, C, V(-half, 0), V(half, 0), 2.4, true);
  } else if (grip === "lat") {
    const half = (p.barW === undefined ? 36 : p.barW) / 2;
    chromeBar(ctx, C, V(-half + 6, 0), V(half - 6, 0), 2.2, true);
    steelTube(ctx, C, V(-half + 6, 0), V(-half, 2.8), 2);
    steelTube(ctx, C, V(half - 6, 0), V(half, 2.8), 2);
  } else if (grip === "rope") {
    // the U: two strands off one ring, a rubber stopper on each end
    ctx.strokeStyle = C.rope; ctx.lineWidth = 2.3; ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(0, -5.6); ctx.quadraticCurveTo(s * 1.2, 0.5, s * 3.9, 4.2); ctx.stroke();
    }
    ctx.strokeStyle = C.ropeHi; ctx.lineWidth = 0.7;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 0.5, -5); ctx.quadraticCurveTo(s * 1.4, 0.2, s * 3.6, 3.6); ctx.stroke();
    }
    for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(s * 4.4, 5.2); ctx.rotate(s * 0.55);
      ctx.fillStyle = C.rubber; roundRect(ctx, -1.9, -2.6, 3.8, 5.2, 1.4); ctx.fill();
      ctx.fillStyle = C.padHi; roundRect(ctx, -1.9, -2.6, 3.8, 1.4, 0.7); ctx.fill();
      ctx.restore();
    }
  } else if (grip === "vbar") {
    // the close-grip triangle: two arms off the ring down to a pair of grips
    steelTube(ctx, C, V(0, -6.2), V(-5.2, 1.4), 1.5);
    steelTube(ctx, C, V(0, -6.2), V(5.2, 1.4), 1.5);
    chromeBar(ctx, C, V(-5.4, 1.4), V(-1.6, 1.4), 1.9);
    chromeBar(ctx, C, V(1.6, 1.4), V(5.4, 1.4), 1.9);
  } else if (grip === "handle") {
    // a stirrup handle: chrome D with the rubber grip across the hand
    ctx.strokeStyle = C.chrome; ctx.lineWidth = 1.5; ctx.lineJoin = "round";
    roundRect(ctx, -3.6, -6.2, 7.2, 8, 2.4); ctx.stroke();
    ctx.fillStyle = C.rubber; roundRect(ctx, -4.4, -1.6, 8.8, 3.2, 1.4); ctx.fill();
    ctx.fillStyle = C.padHi; roundRect(ctx, -4.4, -1.6, 8.8, 0.9, 0.45); ctx.fill();
  } else if (grip === "strap") {
    // an ankle cuff: a padded band with a D-ring on the cable side
    ctx.fillStyle = C.rubber; roundRect(ctx, -4.2, -2.8, 8.4, 5.6, 2); ctx.fill();
    ctx.fillStyle = C.padHi; roundRect(ctx, -4.2, -2.8, 8.4, 1.1, 0.55); ctx.fill();
  }
  ctx.restore();
  return clip;
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
  "artwork", "lever",
  // The rest-time props: what the figure fiddles with between sets. Hand held
  // and drawn small, so they read as a thing in a hand and not as equipment.
  "bottle", "phone", "towel", "watch",
];

/* A hand-held object that is not a weight sits ALONG the forearm rather than
   across the fist: a bottle tipped to the mouth, a phone held out to read,
   both continue the forearm line and tilt with it. `rot` is a nudge on top,
   `along` slides the object's centre out along that line from the hand point,
   `k` scales it. The dumbbell's grip rule does not apply: nobody holds a
   bottle like a hammer curl. */
function handHeldFrame(ctx, p, S) {
  const at = anchor(p, S);
  if (!at) return null;
  const k = S.sides[p.side || "R"];
  const d = norm2(sub(k.wrist, k.elbow));
  const deg = RAD2DEG(Math.atan2(d.y, d.x)) + (p.rot || 0);
  ctx.save();
  ctx.translate(at.x + d.x * (p.along || 0), at.y + d.y * (p.along || 0));
  ctx.rotate(D(deg));
  return true;
}

const PROPS = {
  mat(ctx, C, p, S) {
    ctx.fillStyle = C.propDark;
    // Looking down, a mat seen edge on is a stripe below the figure, which
    // makes a top view read as a side view of somebody floating. From a steep
    // pitch it becomes what it actually is: a rectangle on the floor under the
    // body.
    // An author can ask for the same thing with top: true on a floor rotation
    // that is drawn as seen from overhead at pitch 0 (90/90, open book).
    const steep = S && S.cam && Math.abs(S.cam.pitch || 0) > 55;
    if (steep || p.top) {
      const h = p.h || 52, y = p.y === undefined ? CENTER_Y - h / 2 : p.y;
      roundRect(ctx, p.x, y, p.w, h, p.r === undefined ? 6 : p.r); ctx.fill();
      return;
    }
    roundRect(ctx, p.x, GROUND - 2.4, p.w, 4.4, 2.2); ctx.fill();
  },
  /* A wall, the real thing: a flat pale plane that runs off the top of the
     frame and stops at a skirting board on the floor. Side on it is the slab
     the figure leans on, so the face nearest the figure carries the skirting
     and a hairline edge; a wide one (Wall Slides, seen from the front) is the
     face itself with the skirting running right across. Painted with the
     theme's prop tint at low alpha, so it is a light wall on the dark card
     and a slightly darker panel on the light one, never a steel post. */
  wall(ctx, C, p) {
    const top = p.top === undefined ? -4 : p.top;
    const w = p.w, x = p.x, h = GROUND - top;
    const wide = w > 60;
    const faceLeft = !wide && x + w / 2 > VB / 2;
    const sk = 4.2;
    ctx.save();
    ctx.globalAlpha = 0.34; ctx.fillStyle = C.prop;
    ctx.fillRect(x, top, w, h);
    // skirting: a strip along the floor, proud of the face by a touch
    ctx.globalAlpha = 0.62;
    if (wide) ctx.fillRect(x, GROUND - sk, w, sk);
    else if (faceLeft) ctx.fillRect(x - 1.3, GROUND - sk, w + 1.3, sk);
    else ctx.fillRect(x, GROUND - sk, w + 1.3, sk);
    // the top edge of the skirting and the hairline where the face turns
    ctx.globalAlpha = 0.45; ctx.fillStyle = C.propTop;
    if (wide) ctx.fillRect(x, GROUND - sk, w, 0.8);
    else {
      const fx = x - 1.3;
      ctx.fillRect(faceLeft ? fx : x, GROUND - sk, w + 1.3, 0.8);
      ctx.fillRect(faceLeft ? x : x + w - 0.8, top, 0.8, h - sk);
    }
    ctx.restore();
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
  /* A door frame seen from inside the room: the architrave, the jamb the
     forearm rests on, and a hint of the door, swung open flat against the
     wall beyond the frame with its handle at hip height. `pole: true` draws
     a vertical rig post instead, which is what a human flag is really held
     on: nobody flags off a door frame. */
  doorframe(ctx, C, p) {
    const w = p.w || 8, x = p.x;
    if (p.pole) {
      steelPost(ctx, C, x + w / 2, -6, GROUND, 5.2);
      return;
    }
    const right = x + w / 2 > VB / 2;
    const bx = right ? x + w : -6, bw = right ? VB - x - w + 6 : x + 6;
    ctx.save();
    // the wall beyond, then the open door leaf against it
    ctx.globalAlpha = 0.34; ctx.fillStyle = C.prop;
    ctx.fillRect(bx, -6, bw, GROUND + 6);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(bx, -6, bw, GROUND + 6);
    ctx.globalAlpha = 0.45; ctx.fillStyle = C.propTop;
    ctx.fillRect(bx + 1.5, 6, Math.max(0, bw - 3), 0.7);
    ctx.fillRect(bx + 1.5, 6, 0.7, GROUND - 12);
    ctx.fillRect(bx + 1.5, GROUND - 6, Math.max(0, bw - 3), 0.7);
    ctx.globalAlpha = 1;
    // the handle, on the leaf next to the frame
    ctx.fillStyle = C.chrome;
    ctx.beginPath(); ctx.arc(right ? x + w + 5 : x - 5, 72, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // architrave: the trim board, with a groove where it steps down to the jamb
    ctx.fillStyle = C.prop;
    roundRect(ctx, x, -6, w, GROUND + 6, 0.6); ctx.fill();
    ctx.fillStyle = C.propDark;
    ctx.fillRect(right ? x + w * 0.55 : x + w * 0.38, -6, 0.8, GROUND + 6);
    // the jamb face the arm presses on: the lit inner edge of the opening
    ctx.fillStyle = C.propTop;
    ctx.fillRect(right ? x : x + w - 2, -6, 2, GROUND + 6);
  },
  /* A gym bench, the real object. Flat: a black vinyl pad on a box-section
     spine, two legs splayed a touch outward to wide feet on the floor (the
     Rogue flat utility bench profile). Past 30 degrees it is the back pad of
     an adjustable bench: a square post under the raised end, a toothed ladder
     strut from the post's foot up to the pad, a stub post under the low end
     and a base rail joining the feet. A shallow positive incline is a decline
     bench, so the leg-lock upright is drawn off its raised end; the moves put
     `roller` props on it. The parameters and the pad are unchanged from the
     old drawing, so every move that placed a bench keeps its geometry: the
     pad's top surface is still 2.8 above the line from (x, y) tipped by
     `incline` about its centre. */
  bench(ctx, C, p) {
    const w = p.w, y = p.y, x = p.x, incDeg = p.incline || 0, inc = D(incDeg);
    const c = V(x + w / 2, y);
    const dx = Math.cos(inc) * (w / 2), dy = Math.sin(inc) * (w / 2);
    const A = V(c.x - dx, c.y + dy), Bp = V(c.x + dx, c.y - dy);
    const T = 5.6;
    // the pad in its own terms: hi is the raised end, lo the other, and n
    // points down out of the underside, away from the body
    const hi = A.y <= Bp.y ? A : Bp, lo = hi === A ? Bp : A;
    const d = norm2(sub(lo, hi));
    const n = scl(upNormal(hi, lo), -1);
    const under = (u, e = 0) => add(lerpV(hi, lo, u), scl(n, T / 2 + e));
    const foot = (fx, fw) => {
      ctx.fillStyle = C.steelLo;
      roundRect(ctx, fx - fw / 2, GROUND - 2.8, fw, 2.8, 1.2); ctx.fill();
      ctx.fillStyle = C.rubber;
      roundRect(ctx, fx - fw / 2, GROUND - 1.6, 2.6, 1.6, 0.6); ctx.fill();
      roundRect(ctx, fx + fw / 2 - 2.6, GROUND - 1.6, 2.6, 1.6, 0.6); ctx.fill();
    };
    if (Math.abs(incDeg) <= 30) {
      // legs first so the spine sits over their tops, splayed 2.5 outward
      for (const [u, s] of [[0.2, -1], [0.8, 1]]) {
        const top = under(u, 2.4), bx = top.x + s * 2.5;
        foot(bx, 15);
        boxTube(ctx, C, top, V(bx, GROUND - 1.4), 4.6);
      }
      boxTube(ctx, C, under(0.05, 1.9), under(0.95, 1.9), 3.6);
      if (incDeg > 8) {
        // decline bench: the leg-lock upright off the raised end. The move's
        // roller props sit on the axle at the end of this arm.
        const axle = add(hi, scl(d, -12));
        boxTube(ctx, C, add(hi, scl(d, 6)), axle, 3.6);
        steelTube(ctx, C, add(axle, V(0, -13)), add(axle, V(0, 13)), 2.2);
        ctx.beginPath(); ctx.arc(axle.x, axle.y, 1.6, 0, Math.PI * 2); ctx.fillStyle = C.chromeLo; ctx.fill();
      }
    } else {
      const rear = under(0.24), front = under(0.92);
      const span = Math.abs(front.x - rear.x);
      const wide = span > 12;
      if (wide) {
        // base rail between the two feet
        const x0 = Math.min(rear.x, front.x) - 7, x1 = Math.max(rear.x, front.x) + 7;
        ctx.fillStyle = C.steelLo;
        roundRect(ctx, x0, GROUND - 3, x1 - x0, 3, 1.2); ctx.fill();
        ctx.fillStyle = C.steel;
        roundRect(ctx, x0 + 1, GROUND - 3, x1 - x0 - 2, 1, 0.5); ctx.fill();
        ctx.fillStyle = C.rubber;
        roundRect(ctx, x0, GROUND - 1.6, 3, 1.6, 0.6); ctx.fill();
        roundRect(ctx, x1 - 3, GROUND - 1.6, 3, 1.6, 0.6); ctx.fill();
        steelPost(ctx, C, front.x, front.y - 1, GROUND - 1.5, 4.2, false, false);
        // the ladder: a toothed strut from the rear foot up to the pad, the
        // arm of the back pad rests in one of its notches
        const a = V(rear.x + 3, GROUND - 3), b = under(0.72, 0.6);
        steelTube(ctx, C, a, b, 1.9);
        const ld = norm2(sub(b, a)), L = len2(sub(b, a)), m = upNormal(a, b);
        ctx.strokeStyle = C.steelLo; ctx.lineWidth = 1;
        for (let s = L * 0.3; s < L * 0.8; s += 3.4) {
          const q = add(a, scl(ld, s));
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + m.x * 2.6, q.y + m.y * 2.6); ctx.stroke();
        }
      } else {
        foot(rear.x, 15);
      }
      // the post under the raised end, square section, full height
      steelPost(ctx, C, rear.x, rear.y - 1, GROUND - (wide ? 1.5 : 1.2), 4.8, false, false);
      if (!wide) {
        // near vertical: the arm and its ladder sit behind the pad, so only a
        // short adjuster bracket shows below the pad's low end
        const b = under(0.86, 0.6);
        steelTube(ctx, C, V(rear.x, b.y + 4), b, 1.6);
      }
    }
    padSlab(ctx, C, A, Bp, T);
  },
  /* A plyo box or a step: a dark padded block with a lighter top face and a
     seam where the two halves of the cover meet. Under 20 wide (or `block:
     true`) it is a yoga block instead: a small foam brick in the theme's prop
     tint, shaded top and end so it reads as foam and not as a tiny plyo box. */
  box(ctx, C, p) {
    const h = GROUND - p.y;
    if (p.block || p.w < 20) {
      ctx.fillStyle = C.prop;
      roundRect(ctx, p.x, p.y, p.w, h, 1.3); ctx.fill();
      ctx.fillStyle = mix(C.prop, "#ffffff", 0.28);
      roundRect(ctx, p.x, p.y, p.w, 2.4, 1.2); ctx.fill();
      ctx.fillStyle = mix(C.prop, "#000000", 0.22);
      roundRect(ctx, p.x + p.w - 2.4, p.y + 1.2, 2.4, h - 1.2, 1.1); ctx.fill();
      return;
    }
    ctx.fillStyle = C.pad;
    roundRect(ctx, p.x, p.y, p.w, h, 2.6); ctx.fill();
    ctx.fillStyle = C.padHi;
    roundRect(ctx, p.x, p.y, p.w, 3.4, 1.7); ctx.fill();
    ctx.fillStyle = C.padLine;
    roundRect(ctx, p.x + 1.5, p.y + h * 0.5, p.w - 3, 0.9, 0.45); ctx.fill();
    // corner guards
    ctx.fillStyle = C.steelLo;
    roundRect(ctx, p.x, GROUND - 2.4, p.w, 2.4, 1); ctx.fill();
  },
  /* A roller seen end on. On the floor (or `foam: true`) it is a foam roller:
     a dense EVA cylinder with a flat moulded end and a hollow core, no axle.
     Anywhere else it is a leg lock pad on a machine: a black vinyl cylinder
     turning on a steel axle. */
  roller(ctx, C, p) {
    const r = p.r || 5.4;
    const foam = p.foam || p.y + r > GROUND - 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.pad; ctx.fill();
    if (foam) {
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = C.padHi; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = C.rubber; ctx.fill();
      ctx.strokeStyle = C.padLine; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(p.x, p.y, r - 0.8, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      return;
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = C.padHi; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = C.steelLo; ctx.fill();
    ctx.strokeStyle = C.padLine; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(p.x, p.y, r - 0.9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  },
  /* A pull-up bar on a rig: a knurled chrome bar (about 32 mm, so r 1.7 at
     this scale) bolted between two box-section uprights that stand on the
     floor, a mounting plate where each meets the bar. The uprights sit AT x0
     and x1, so the bar spans past both hands and a post stays clear of an
     arm stretched along the bar (Archer Pull-Up). A bar racked low (y past
     36: the Inverted Row) is a barbell in a rack instead: the same uprights
     run to the top of the frame and the bar rests in a J-cup on each. */
  pullupBar(ctx, C, p) {
    const y = p.y === undefined ? 10 : p.y;
    const x0 = p.x0 === undefined ? 30 : p.x0;
    const x1 = p.x1 === undefined ? 110 : p.x1;
    const r = p.r || 1.7, pw = 4.6, racked = y > 36;
    for (const x of [x0, x1]) {
      steelPost(ctx, C, x, racked ? -6 : y - 6.5, GROUND, pw);
      ctx.fillStyle = C.steelLo;
      if (racked) roundRect(ctx, x - pw / 2 - 1.2, y - r - 0.8, pw + 2.4, r * 2 + 3.4, 1.2);
      else roundRect(ctx, x - pw / 2 - 0.9, y - 3.6, pw + 1.8, 7.2, 1.1);
      ctx.fill();
    }
    chromeBar(ctx, C, V(x0 - pw / 2, y), V(x1 + pw / 2, y), r, false);
    knurl(ctx, C, V(x0 + pw / 2 + 1.5, y), V(x1 - pw / 2 - 1.5, y), r);
    ctx.fillStyle = C.ironHi;
    for (const x of [x0, x1]) { ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill(); }
  },
  /* Parallel bars. At chest height (y under 80) it is a dip station: two
     chrome rails on box-section uprights tied together by a rail on the
     floor. Low (y 80 or more) it is a pair of parallettes, the short round
     tube handle on two small legs with feet that an L-sit is held on. Two
     rails, one each side of the body: the far one dim and behind the figure,
     the near one in front of it and a touch lower (parallax from a camera a
     little above the rails). One rail behind the body read as a table the
     figure was sitting on. near: false keeps only the back rail. */
  dipBars(ctx, C, p, S, layer) {
    const y = p.y === undefined ? 86 : p.y;
    const parallette = y >= 80;
    const rail = (ry, far) => {
      if (parallette) {
        for (const x of [p.x0 + 3.5, p.x1 - 3.5]) {
          steelTube(ctx, C, V(x, ry + 1), V(x, GROUND - 1.5), 1.3, far);
          steelTube(ctx, C, V(x - 4.2, GROUND - 1.4), V(x + 4.2, GROUND - 1.4), 1.4, far);
        }
        chromeBar(ctx, C, V(p.x0, ry), V(p.x1, ry), 1.7, false, far);
        return;
      }
      for (const x of [p.x0 + 4.5, p.x1 - 4.5]) steelPost(ctx, C, x, ry + 1, GROUND, 4.4, far);
      ctx.fillStyle = far ? C.steelLo : C.steel;
      roundRect(ctx, p.x0 + 2.5, GROUND - 3.2, p.x1 - p.x0 - 5, 3.2, 1.1); ctx.fill();
      chromeBar(ctx, C, V(p.x0, ry), V(p.x1, ry), 2, false, far);
    };
    if (layer === "back") rail(y, true);
    else if (p.near !== false) rail(y + 1.4, false);
  },
  /* The generic seat-and-pad machine. Anything with a real shape has its own
     artwork now; this is the fallback for a move nobody has drawn yet. */
  machine(ctx, C, p) {
    const parts = p.parts || ["seat"];
    if (parts.includes("seat")) {
      steelPost(ctx, C, p.x + p.w * 0.5, p.y + 5, GROUND, 6);
      padSlab(ctx, C, V(p.x, p.y + 2.7), V(p.x + p.w, p.y + 2.7), 5.4);
    }
    if (parts.includes("backPad")) {
      const h = (p.padH || 26) + 4;
      padSlab(ctx, C, V(p.x - 3.2, p.y + 4), V(p.x - 3.2, p.y + 4 - h), 6.5);
    }
    if (parts.includes("thighPad")) {
      const px = p.padX === undefined ? p.x + p.w * 0.6 : p.padX;
      const py = p.padY === undefined ? p.y - 16 : p.padY;
      const pw = p.padW || 20;
      steelTube(ctx, C, V(px + pw * 0.5, py + 4), V(px + pw * 0.5, p.y), 2);
      padSlab(ctx, C, V(px, py + 2.7), V(px + pw, py + 2.7), 5.4);
    }
    if (parts.includes("lever")) {
      const lx = p.leverX === undefined ? p.x + p.w : p.leverX;
      const ly = p.leverY === undefined ? p.y - 22 : p.leverY;
      steelTube(ctx, C, V(p.x + p.w * 0.45, p.y - 4), V(lx, ly), 2.2);
      ctx.beginPath(); ctx.arc(lx, ly, 4.2, 0, Math.PI * 2); ctx.fillStyle = C.rubber; ctx.fill();
    }
  },
  artwork,
  /* A machine's moving arm: a steel tube from a fixed pivot to a joint on the
     body, so a chest press handle, a leg extension pad or a landmine bar
     follows the figure while the machine itself stays a still drawing.
       pivot {x,y}   where the arm hinges on the frame
       to            a body anchor { side, point, dx, dy }
       past          extend the tube this far beyond the joint
       end           what is at the body end: "grip" (a rubber handle seen end
                     on), "pad" (a roller pad across the limb, padW long),
                     "plate" (a loaded bar end, plateR), or nothing
       r             tube radius */
  lever(ctx, C, p, S) {
    const to = anchor(p.to, S);
    if (!to || !p.pivot) return;
    const pv = V(p.pivot.x, p.pivot.y);
    const r = p.r || 2.2;
    const d = norm2(sub(to, pv));
    const end = add(to, scl(d, p.past || 0));
    steelTube(ctx, C, pv, end, r);
    ctx.beginPath(); ctx.arc(pv.x, pv.y, r * 1.7, 0, Math.PI * 2); ctx.fillStyle = C.steelLo; ctx.fill();
    ctx.beginPath(); ctx.arc(pv.x, pv.y, r * 0.75, 0, Math.PI * 2); ctx.fillStyle = C.chrome; ctx.fill();
    if (p.end === "grip") {
      const g = p.gripR || 3.2;
      ctx.strokeStyle = C.edge; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(to.x, to.y, g, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = C.rubber; ctx.fill();
      ctx.beginPath(); ctx.arc(to.x, to.y, g * 0.45, 0, Math.PI * 2); ctx.fillStyle = C.padHi; ctx.fill();
    } else if (p.end === "pad") {
      const n = V(-d.y, d.x), half = (p.padW || 10) / 2;
      padSlab(ctx, C, add(to, scl(n, -half)), add(to, scl(n, half)), p.padT || 5.2);
    } else if (p.end === "plate") {
      PROPS.barbell(ctx, C, { x: end.x, y: end.y, r: p.plateR || 8 }, S);
    }
  },
  /* A cable station.
       x, top      where the pulley is
       y0          top of the weight stack
       stack:false a machine drawn as artwork supplies the frame and stack, so
                   this draws only the moving parts: pulley, line, attachment.
                   Two stacks in the same place is worse than none.
       plumb       the line drops straight down from the pulley and the
                   attachment sits on that line at the hand's height. How a
                   pulldown really hangs. Mo, on a photo of the real machine:
                   "the machine is straight and then goes down with the rope
                   and then you see the handle."
       grip        what is clipped on: bar (default), lat, rope, vbar, handle,
                   strap, none. See cableGrip.
       barW        width of a bar grip
     Without plumb the line runs from the pulley to the hand, which is right
     for a row, a curl, a fly: anything pulled away from the machine. A bar on
     either stays level, because a loaded bar cannot tilt with a wrist. */
  cable(ctx, C, p, S) {
    const top = p.top === undefined ? 16 : p.top;
    const y0 = p.y0 === undefined ? 46 : p.y0;
    if (p.stack !== false) {
      cableTower(ctx, C, p.x, y0);
      ctx.fillStyle = C.steelHi;
      roundRect(ctx, p.x - 3.8, top - 3.6, 7.6, 7.2, 1.5); ctx.fill();
    }
    pulleyWheel(ctx, C, p.x, top, p.stack === false ? 3.2 : 2.9);
    const h = anchor(p.to || { side: "R", point: "hand" }, S);
    if (!h) return;
    const grip = p.grip || "bar";
    const o = p.plumb ? V(p.x, h.y) : h;
    const u = p.plumb ? V(0, 1) : norm2(sub(h, V(p.x, top)));
    const clip = GRIP_CLIP[grip] === undefined ? GRIP_CLIP.bar : GRIP_CLIP[grip];
    ctx.strokeStyle = C.cableLine; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(p.x, top); ctx.lineTo(o.x - u.x * clip, o.y - u.y * clip); ctx.stroke();
    cableGrip(ctx, C, grip, o, u, p);
  },
  band(ctx, C, p, S) {
    const a = anchor(p.from, S), b = anchor(p.to, S);
    if (!a || !b) return;
    const d = len2(sub(b, a));
    const rest = p.rest === undefined ? 40 : p.rest;
    const slack = Math.max(0, rest - d);
    const m = lerpV(a, b, 0.5);
    // A band is rubber, not a bar: keep the stroke thin and cap the sag so a
    // slack band droops instead of closing into a loop.
    const c = V(m.x, m.y + Math.min(slack * 0.5, 12) + 1.2);
    ctx.strokeStyle = C.propTop;
    ctx.lineWidth = Math.max(1.1, 2.0 - slack * 0.04);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.stroke();
  },
  barbell(ctx, C, p, S) {
    const at = p.place === "traps" ? barOnTraps(S, p) : anchor(p, S);
    if (!at) return;
    const r = p.r || 9.5;
    /* A loaded bar seen end on: the outer plate, cast iron with its raised
       centre ring and a lit rim, and the chrome sleeve of the bar through the
       hub. Small radii (a machine handle, a pad) are just the disc. */
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.iron; ctx.fill();
    if (r >= 6) {
      ctx.strokeStyle = C.ironHi; ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.64, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = Math.max(0.8, r * 0.08);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, Math.PI * 1.08, Math.PI * 1.72); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, Math.min(3, r * 0.3), 0, Math.PI * 2); ctx.fillStyle = C.chrome; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, Math.min(1.4, r * 0.13), 0, Math.PI * 2); ctx.fillStyle = C.chromeLo; ctx.fill();
    ctx.restore();
  },
  dumbbell(ctx, C, p, S) {
    const at = anchor(p, S);
    if (!at) return;
    const k = p.k || 1;
    /* Which way a dumbbell faces is decided by the GRIP, not by the arm.
       The handle is always square to the forearm, but that leaves two very
       different pictures depending on which way the fist is turned, and the
       shape below can only ever draw the long side of the bell:

         level (default)  palm down or palm up, so the handle runs across the
                          body, straight at a side-on camera. Nearly end on,
                          which is unreadable, so it is drawn as the long side
                          lying flat, and it stays flat for the whole rep no
                          matter where the arm goes: a press, a raise, a fly,
                          a straight curl. This is the common case.
         follow           a neutral, thumb-up grip, so the handle runs front
                          to back and the camera sees its full length. Here
                          the bell really does tilt with the forearm, which is
                          the rotation you see on a hammer curl or a row.
         upright          stood on one end and cupped, the goblet hold.

       Getting this wrong is very visible: `follow` on a pressing grip tips
       the bell over as the arm travels, which no dumbbell does. */
    const hold = p.hold || "level";
    let deg = hold === "upright" ? 0 : 90;
    if (hold === "follow") {
      const side = S.sides[p.side || "R"];
      deg = RAD2DEG(Math.atan2(side.axis.hand.y.y, side.axis.hand.y.x));
    }
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(D(deg + (p.rot || 0)));
    /* A hex dumbbell: two cast heads with the facet that catches the light
       along one side, a knurled chrome handle with a collar at each end. The
       geometry is the old one, so nothing about where a hand holds it moved. */
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3.2; ctx.lineJoin = "round";
    const handle = () => roundRect(ctx, -2.4, -9 * k, 4.8, 18 * k, 2.2);
    const heads = [
      () => roundRect(ctx, -7.2, -17 * k, 14.4, 8.4 * k, 2.4),
      () => roundRect(ctx, -7.2, 8.6 * k, 14.4, 8.4 * k, 2.4),
    ];
    for (const sh of [handle, ...heads]) { sh(); ctx.stroke(); }
    ctx.fillStyle = C.chrome; handle(); ctx.fill();
    ctx.fillStyle = C.chromeHi; roundRect(ctx, -2.4, -9 * k, 1.5, 18 * k, 0.75); ctx.fill();
    ctx.strokeStyle = C.chromeLo; ctx.lineWidth = 0.55;
    for (let y = -6.4 * k; y <= 6.4 * k; y += 1.6) { ctx.beginPath(); ctx.moveTo(-2, y); ctx.lineTo(2, y); ctx.stroke(); }
    ctx.fillStyle = C.chromeLo;
    roundRect(ctx, -3.1, -9.4 * k, 6.2, 1.7, 0.8); ctx.fill();
    roundRect(ctx, -3.1, 7.7 * k, 6.2, 1.7, 0.8); ctx.fill();
    ctx.fillStyle = C.iron;
    for (const sh of heads) { sh(); ctx.fill(); }
    // the lit facet and the shadowed one, which is what says "hex" side on
    ctx.fillStyle = C.ironHi;
    roundRect(ctx, -7.2, -17 * k, 4.2, 8.4 * k, 2); ctx.fill();
    roundRect(ctx, -7.2, 8.6 * k, 4.2, 8.4 * k, 2); ctx.fill();
    ctx.fillStyle = C.rubber;
    roundRect(ctx, 4.2, -17 * k, 3, 8.4 * k, 2); ctx.fill();
    roundRect(ctx, 4.2, 8.6 * k, 3, 8.4 * k, 2); ctx.fill();
    ctx.restore();
  },
  kettlebell(ctx, C, p, S) {
    const at = anchor(p, S);
    if (!at) return;
    const k = p.k || 1;
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(D(p.rot === undefined ? 0 : p.rot));
    /* Cast iron: a bell with a flat base, a lit shoulder, and the thick
       handle arching over it, outlined like the bell so it separates from a
       hand. Geometry unchanged. */
    const handleArc = () => { ctx.beginPath(); ctx.arc(0, 2.5 * k, 5.6 * k, Math.PI * 1.12, Math.PI * 1.88); };
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3.4 * k + 3; ctx.lineCap = "round";
    handleArc(); ctx.stroke();
    ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.arc(0, 11 * k, 8.2 * k, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.iron; ctx.fill();
    ctx.strokeStyle = C.ironHi; ctx.lineWidth = 1.4 * k;
    ctx.beginPath(); ctx.arc(0, 11 * k, 6.2 * k, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
    ctx.fillStyle = C.rubber;
    roundRect(ctx, -4.6 * k, 18.2 * k, 9.2 * k, 1.6 * k, 0.8 * k); ctx.fill();
    ctx.strokeStyle = C.iron; ctx.lineWidth = 3.4 * k; handleArc(); ctx.stroke();
    ctx.strokeStyle = C.ironHi; ctx.lineWidth = 0.9 * k;
    ctx.beginPath(); ctx.arc(0, 2.5 * k, 6.4 * k, Math.PI * 1.2, Math.PI * 1.6); ctx.stroke();
    ctx.restore();
  },
  // A gym water bottle: a tall capsule with a neck and a cap, the cap at the
  // forearm's far end so tipping the forearm up tips the bottle to the mouth.
  // Local +x runs from the elbow out past the hand, so the cap sits at +x.
  bottle(ctx, C, p, S) {
    if (!handHeldFrame(ctx, p, S)) return;
    const k = p.k || 1;
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3; ctx.lineJoin = "round";
    const body = () => roundRect(ctx, -8 * k, -3.2 * k, 14 * k, 6.4 * k, 3 * k);
    const neck = () => roundRect(ctx, 5.4 * k, -2 * k, 3.4 * k, 4 * k, 1.2 * k);
    const cap = () => roundRect(ctx, 8.2 * k, -2.5 * k, 3.2 * k, 5 * k, 1.4 * k);
    for (const sh of [body, neck, cap]) { sh(); ctx.stroke(); }
    ctx.fillStyle = C.propTop; body(); ctx.fill();
    ctx.fillStyle = C.prop; neck(); ctx.fill();
    ctx.fillStyle = C.propDark; cap(); ctx.fill();
    // a label band and a water line, so it is a bottle and not a baton
    ctx.fillStyle = C.prop;
    roundRect(ctx, -4.6 * k, -3.2 * k, 5 * k, 6.4 * k, 0); ctx.fill();
    ctx.restore();
  },
  // A phone: a rounded slab with a lit screen, held so the screen faces the
  // figure's face. The slab lies along the forearm line; `rot` tips it.
  phone(ctx, C, p, S) {
    if (!handHeldFrame(ctx, p, S)) return;
    const k = p.k || 1;
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3; ctx.lineJoin = "round";
    const slab = () => roundRect(ctx, -6.4 * k, -3.6 * k, 12.8 * k, 7.2 * k, 1.6 * k);
    slab(); ctx.stroke();
    ctx.fillStyle = C.propDark; slab(); ctx.fill();
    // the screen, in the accent so it reads as lit
    ctx.fillStyle = C.accent;
    roundRect(ctx, -5.4 * k, -2.7 * k, 10.8 * k, 5.4 * k, 1 * k); ctx.fill();
    // two faint lines of "content" on the screen
    ctx.fillStyle = C.propDark; ctx.globalAlpha = 0.35;
    roundRect(ctx, -4 * k, -1.2 * k, 6.5 * k, 0.9 * k, 0.45 * k); ctx.fill();
    roundRect(ctx, -4 * k, 0.6 * k, 4.5 * k, 0.9 * k, 0.45 * k); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  },
  // A small towel: a soft cloth bunched in the fist with a tail that hangs
  // straight down from the hand, because cloth obeys gravity and not the arm.
  towel(ctx, C, p, S) {
    const at = anchor(p, S);
    if (!at) return;
    const k = p.k || 1;
    const len = (p.len === undefined ? 12 : p.len) * k;
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3; ctx.lineJoin = "round";
    const tail = () => {
      ctx.beginPath();
      ctx.moveTo(at.x - 3 * k, at.y + 1);
      ctx.quadraticCurveTo(at.x - 4.4 * k, at.y + len * 0.55, at.x - 2.2 * k, at.y + len);
      ctx.quadraticCurveTo(at.x + 0.2 * k, at.y + len + 1.4 * k, at.x + 2.4 * k, at.y + len * 0.92);
      ctx.quadraticCurveTo(at.x + 3.6 * k, at.y + len * 0.45, at.x + 3 * k, at.y + 1);
      ctx.closePath();
    };
    const knot = () => { ctx.beginPath(); ctx.ellipse(at.x, at.y, 4.6 * k, 3.4 * k, 0, 0, Math.PI * 2); };
    tail(); ctx.stroke(); knot(); ctx.stroke();
    ctx.fillStyle = C.propTop; tail(); ctx.fill(); knot(); ctx.fill();
    // one fold line down the tail
    ctx.strokeStyle = C.prop; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(at.x + 0.4 * k, at.y + 3 * k); ctx.quadraticCurveTo(at.x - 1.2 * k, at.y + len * 0.5, at.x + 0.3 * k, at.y + len * 0.86); ctx.stroke();
  },
  // A wristwatch: a band across the wrist and a face on top, drawn at the
  // wrist point, square to the forearm so it rides round with it.
  watch(ctx, C, p, S) {
    const k = S.sides[p.side || "L"];
    const d = norm2(sub(k.wrist, k.elbow));
    const n = V(-d.y, d.x);
    const at = add(k.wrist, scl(d, -1.4));
    const r = ACTIVE.rWrist * 1.15 * (p.k || 1);
    ctx.strokeStyle = C.propDark; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(at.x - n.x * r, at.y - n.y * r); ctx.lineTo(at.x + n.x * r, at.y + n.y * r); ctx.stroke();
    const face = add(at, scl(n, (p.flip ? -1 : 1) * r * 0.9));
    ctx.beginPath(); ctx.arc(face.x, face.y, 2.1 * (p.k || 1), 0, Math.PI * 2);
    ctx.fillStyle = C.propDark; ctx.fill();
    ctx.beginPath(); ctx.arc(face.x, face.y, 1.3 * (p.k || 1), 0, Math.PI * 2);
    ctx.fillStyle = C.accent; ctx.fill();
  },
};

/* ---- artwork props: a machine supplied as a drawing ----
 *
 * The primitives draw a bench, a bar and a mat perfectly well, but a cable
 * stack or a pec deck is a specific object and "a box with a pad on it" will
 * never be the machine somebody is standing in front of. Those get an SVG
 * authored in the rig's own 140-unit space with the floor at 118, so it drops
 * in with no scaling and no perspective matching.
 *
 * ONE FILE, TWO LAYERS. The file carries a #back group and a #front group, and
 * this splits them at load into two images so the body can sit between them:
 * behind the knee pads, in front of the seat. That is the whole reason this is
 * worth doing over a flat picture.
 *
 * Loading is async and drawing is not, so a miss draws nothing this frame and
 * the next frame picks it up. Every move using artwork animates, so the gap is
 * one frame; a paused render can pass onReady to be told. */
const ARTWORK = new Map();
/* Who to tell when a drawing arrives. A paused mount (the lab grid, the
   pose-check sheet, a session card before it scrolls into view) has painted
   once and will not paint again on its own, so without this the machine is
   simply missing from every still. index.mjs registers one listener that
   marks every mount dirty. */
const ARTWORK_READY = new Set();
export function onArtworkReady(fn) { ARTWORK_READY.add(fn); return () => ARTWORK_READY.delete(fn); }

function artworkFor(src, onReady) {
  let rec = ARTWORK.get(src);
  if (rec) return rec;
  rec = { back: null, front: null, failed: false };
  ARTWORK.set(src, rec);
  fetch(src)
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then((text) => {
      /* Split in a detached document rather than by string surgery: a regex
         over SVG breaks the first time a group nests. */
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      for (const layer of ["back", "front"]) {
        const copy = doc.documentElement.cloneNode(true);
        let found = false;
        for (const g of [...copy.querySelectorAll("g")]) {
          if (g.parentNode !== copy) continue;             // top-level groups only
          if (g.getAttribute("id") === layer) found = true;
          else g.remove();
        }
        if (!found && layer === "front") { rec.front = null; continue; }
        const blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" });
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(img.src);
          if (onReady) onReady();
          for (const fn of ARTWORK_READY) fn(src);
        };
        img.src = URL.createObjectURL(blob);
        rec[layer] = img;
      }
    })
    .catch((e) => { rec.failed = true; console.warn("artwork failed:", src, e.message); });
  return rec;
}

/* Two ways to place a drawing:

   scenery   { type: "artwork", src, dx, dy, flip }
             drawn over the whole 140 box, so the file is authored in figure
             units with the floor at 118. `dx`/`dy` slide it, `flip` mirrors it
             about the box's centre line, so one side-view machine serves a
             move that faces the other way. Both layers draw, #back and
             #front, and the body goes between them.
   held      { type: "artwork", src, side, point, dx, dy, k, rot, front }
             a sprite pinned to a joint, drawn at the file's own width and
             height (in figure units) centred on that point, times `k`.
             `rot` is degrees, or "forearm" to lie along the forearm the way a
             held thing does. Only its own layer draws, like a dumbbell. */
function artwork(ctx, C, p, S, layer) {
  const rec = artworkFor(p.src, p.onReady);
  const img = layer === "front" ? rec.front : rec.back;
  if (!img || !img.complete || !img.naturalWidth) return;
  ctx.save();
  if (isHeldArtwork(p)) {
    const at = anchor(p, S);
    if (at) {
      let deg = typeof p.rot === "number" ? p.rot : 0;
      if (p.rot === "forearm") {
        const k = S.sides[p.side || "R"];
        const d = norm2(sub(k.wrist, k.elbow));
        deg = RAD2DEG(Math.atan2(d.y, d.x));
      }
      const k = p.k || 1, w = img.naturalWidth * k, h = img.naturalHeight * k;
      ctx.translate(at.x, at.y);
      ctx.rotate(D(deg));
      ctx.drawImage(img, -w / 2 + (p.ox || 0), -h / 2 + (p.oy || 0), w, h);
    }
  } else {
    ctx.translate(p.dx || 0, p.dy || 0);
    if (p.flip) { ctx.translate(VB, 0); ctx.scale(-1, 1); }
    ctx.drawImage(img, 0, 0, VB, VB);
  }
  ctx.restore();
}
/* Scenery fills the 140 box; a sprite is placed at a point and drawn at its
   own size. Either a body joint (`side`) or a plain world point (`x`) makes
   it a sprite. Without the second test an `x` was ignored and a 20-unit ab
   wheel was stretched across the whole scene. */
const isHeldArtwork = (p) => p.type === "artwork" && (p.side !== undefined || p.x !== undefined);

function drawProps(ctx, C, list, S, layer) {
  for (const p of list || []) {
    // dip bars have a rail on each side of the body, so they draw in both
    // layers and sort out front and back themselves; scenery artwork carries
    // its own back and front groups
    const both = p.type === "dipBars" || (p.type === "artwork" && !isHeldArtwork(p));
    if (!both && (p.front ? "front" : "back") !== layer) continue;
    const fn = PROPS[p.type];
    if (fn) fn(ctx, C, p, S, layer);
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
    if (["barbell", "dumbbell", "kettlebell", "bottle", "phone", "towel"].includes(p.type) && p.point !== "wrist") g[p.side || "R"] = "closed";
    if (p.type === "cable" && p.to && p.to.side) g[p.to.side] = "closed";
    if (p.type === "band") for (const e of [p.from, p.to]) if (e && e.side) g[e.side] = "closed";
    if (p.type === "pullupBar") { g.L = g.L || "hook"; g.R = g.R || "hook"; }
    if (p.grip) g[p.grip] = "closed";
  }
  if (S) {
    // Flat surfaces the hand can rest on: the floor, and the top of a bench or
    // a box. The old test also looked at where the HAND point had landed, which
    // was circular: a hand drawn standing on its heel never read as flat, so it
    // never got laid down. Only the wrist decides now.
    const tops = [];
    for (const p of (move && move.props) || []) {
      if (p.type === "bench") tops.push({ y: p.y - 3.6, x0: p.x, x1: p.x + p.w });
      else if (p.type === "box") tops.push({ y: p.y, x0: p.x, x1: p.x + p.w });
      // a dip bar or parallette rail is a surface the hand rests on, palm down
      else if (p.type === "dipBars") tops.push({ y: (p.y === undefined ? 86 : p.y) - 2.2, x0: p.x0, x1: p.x1 });
    }
    for (const s of ["L", "R"]) {
      if (g[s]) continue;
      const w = S.sides[s].wrist;
      const onFloor = w.y > GROUND - 8;
      const onTop = tops.some((t) => w.y > t.y - 8 && w.y < t.y + 3 && w.x > t.x0 - 4 && w.x < t.x1 + 4);
      if (onFloor || onTop) g[s] = "flat";
    }
  }
  if (move && move.grip) Object.assign(g, move.grip);
  return g;
}

/* The shoulder yoke: clavicle and trapezius from the base of the neck out to
   each deltoid cap. Drawn as its own item AFTER both arms, so the cap sits
   over the top of the upper arm on both sides, which is how a shoulder is
   built and, more to the point, how both shoulders end up identical: the
   seam on each is the cap's own edge, stroked only where it crosses that
   arm, then filled again so only the outer hairline survives. Before this the
   yoke was part of the torso, so the near arm was painted on top of it with
   its own outline while the far arm went under it: one shoulder read as a
   rounded cap with a seam beneath, the other as an arm pasted on. Mo asked
   for the right to match the left exactly, and the left was the cap. */
function drawYoke(ctx, S, C, fill) {
  const B = ACTIVE;
  const yoke = lerpV(S.chest, S.neckTop, 0.26);
  const caps = ["L", "R"].map((ys) => {
    const sh = S.sides[ys].shoulder;
    return [
      [yoke, B.rNeckBot * 0.98],
      [lerpV(yoke, sh, 0.6), B.rShoulder * 0.8],
      [add(sh, scl(norm2(sub(sh, yoke)), 0.6)), B.rDelt * 0.9],
    ];
  });
  for (const c of caps) part(ctx, C, c, { fill, line: false });
  if (COLLECT || !DRAWN) return;
  const arms = [...DRAWN.L, ...DRAWN.R];
  if (!arms.length) return;
  const region = new Path2D();
  for (const g of arms) capsulePathInto(region, g[0], g[1], g[2], g[3]);
  ctx.save();
  ctx.clip(region);
  ctx.strokeStyle = C.seam; ctx.lineWidth = 0.3; ctx.lineJoin = "round";
  for (const c of caps) for (let k = 0; k < c.length - 1; k++) {
    capsulePath(ctx, c[k][0], c[k][1], c[k + 1][0], c[k + 1][1]);
    ctx.stroke();
  }
  ctx.restore();
  for (const c of caps) part(ctx, C, c, { fill, line: false });
}

/* The trunk ends in a pelvis capsule that is narrower than the top of the
   thigh, so the front view used to step straight out at each hip: a near
   vertical thigh edge meeting the trunk's near vertical one in a concave
   nick, one on each side. Mo inked over both nicks and asked for a hip that
   runs from the waist into the thigh in one curve, "blending it in well with
   the body". This is the yoke idea at the other end of the trunk: a short
   chain that starts buried in the pelvis, runs out and down through the hip
   joint and dies into the upper thigh, so the only new material is the wedge
   the trunk and the thigh used to leave empty. It is painted FIRST, under
   both thighs and the trunk, so it can only ever fill, never cover. It takes
   the fill of the leg it belongs to, so the far side stays the far tone. No
   seam and no DRAWN_TAG: the hip carries no line on either side (see
   drawLeg), and the arm seam machinery is for arms only. The lower circle
   rides the femur rather than hanging straight down, so a seated or supine
   pose keeps it inside the thigh instead of growing a lump under the hip. */
function drawHips(ctx, S, C, fills) {
  const B = ACTIVE;
  const up = norm2(sub(S.chest, S.pelvis));
  for (const s of ["L", "R"]) {
    const k = S.sides[s];
    /* Mo drew the hip as one rounded mass from just under the waist, out
       past the joint and back into the thigh, not the straight taper the
       first cut had. The middle circle carries that: it sits a little
       outboard of the joint and is the widest of the three, so the profile
       is convex. How far out to the side the hip joint sits ON SCREEN is 0
       in a side view (the joint is behind the pelvis centre there) and 1
       face on, and the extra mass scales with it: face on it rounds the hip
       out, side on it adds only a little glute, never a belly. The first
       cut without that scaling pushed a paunch out of every squat. */
    const lat = sub(k.hip, S.pelvis);
    const w = clamp(len2(lat) / B.hipW, 0, 1);
    /* Mo's second pass: the 0.18 / 0.6 bulge read as a pear on the phone,
       "does not look human at all". The rounding is now a hint: the joint
       circle barely outgrows the thigh and moves out a whisker. */
    const outward = len2(lat) > 0.5 ? scl(norm2(lat), 0.10 * w) : V(0, 0);
    part(ctx, C, [
      [add(S.pelvis, scl(up, B.rPelvis * 0.70)), B.rPelvis * 0.84],
      [add(k.hip, outward), B.rHip * (1.0 + 0.03 * w)],
      [lerpV(k.hip, k.knee, 0.34), B.rHip * 0.98],
    ], { fill: fills[s], line: false });
  }
}

// Draw order is by depth now, not by a fixed list. The tie-break keeps the v1
// order exactly for a planar camera, where every limb sits at the same depth as
// its opposite number and only the old near/far rule can separate them.
// One stroke round the union of every capsule in the body. Drawn before any
// fill, so only the part of it outside the silhouette survives.
function outline(ctx, C, segs) {
  ctx.strokeStyle = C.seam;
  ctx.lineWidth = 1.75;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Measured both ways: one compound Path2D and a single stroke call is no
  // faster than stroking each capsule, so this stays the simple loop.
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.stroke(); }
}


// How the figure shows which way it faces. Mo found the torso lines (pec,
// spine, blades) unreliable, they get adjusted oddly in some poses, and asked
// for a face instead. Two eye dots do the job at any size: two from the
// front, one from the side, none from behind, and they never distort with a
// pose the way body lines do. `lines` keeps the old torso lines available.
export const STYLE = { face: "buddy", mood: "neutral", lines: false };
export function setStyle(o = {}) { Object.assign(STYLE, o); return STYLE; }

let FACE = STYLE.face, MOOD = STYLE.mood, LINES_TORSO = STYLE.lines;
export function drawFigure(ctx, S, C, opts = {}) {
  FACE = opts.face !== undefined ? opts.face : STYLE.face;
  MOOD = opts.mood !== undefined ? opts.mood : STYLE.mood;
  LINES_TORSO = opts.lines !== undefined ? opts.lines : STYLE.lines;
  if (opts.floor !== false) drawFloor(ctx, C, S);
  drawProps(ctx, C, opts.props, S, "back");
  const near = S.frontal ? (S.farSide === "R" ? "L" : "R") : "R";
  const grips = opts.grip || {};
  const skinOpts = C.skin === "anatomy" ? { plates: true, lit: opts.lit } : null;
  const mean = (...ps) => ps.reduce((a, p) => a + p.d, 0) / ps.length;
  const torsoD = mean(S.pelvis, S.chest);
  // TONE follows real depth, not the authored side. The old rule painted one
  // half of every front view in the far tone whether or not that half was
  // actually further away, and on a symmetric standing pose that reads as a
  // torso twisted toward the camera. A limb takes the far tone only when it
  // sits at least this far behind its opposite number: a yawed camera, a leg
  // stepped back, an arm reaching across. Order still comes from depth plus the
  // near/far hint, which is unchanged.
  const DEPTH_EPS = 1.6;
  const depths = { arm: {}, leg: {} };
  for (const s of ["L", "R"]) {
    const k = S.sides[s];
    depths.arm[s] = mean(k.shoulder, k.elbow, k.wrist);
    depths.leg[s] = mean(k.hip, k.knee, k.ankle);
  }
  /* Larger depth draws LAST, which is nearest the camera (that is what the
     ascending sort below does with it). So a limb is far when its depth is
     SMALLER than its opposite number's. This used to compare the other way
     round and painted the limb on top in the far tone, in every side view,
     for the whole life of the rig. Subtle enough (the two tones are a few
     units apart) that it took a pixel count on Chair Pose to notice. */
  const isFar = (kind, s) => depths[kind][s === "R" ? "L" : "R"] - depths[kind][s] > DEPTH_EPS;
  // A near arm raised overhead in a side view projects straight across the
  // skull (the shoulder sits at the head's x), and the plain tie-break painted
  // it over the face, so every lockout read as headless. When the upper arm or
  // forearm crosses the head circle the arm is drawn between the torso and the
  // head instead: the face stays visible and the bar can sit over the midline.
  const segDist = (p, a, b) => {
    const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2));
    return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
  };
  /* A near arm that crosses the skull in a side view: an overhead lockout,
     a hang, a handstand, a prone reach. Left to the depth sort the arm wins,
     because in a side view the near arm is always deeper than the head, and
     the figure reads as headless. The head is drawn LAST in that case (see
     the head item below); a nudge to the arm's tie-break did nothing, since
     the tie-break only decides between equal depths. Any direction counts:
     the prone reach in Swimming runs level with the shoulder, not above it. */
  const crossesHead = (s) => {
    if (S.frontal) return false;
    const k = S.sides[s];
    const r = ACTIVE.rHeadBack * 1.7;
    return segDist(S.head, k.shoulder, k.elbow) < r || segDist(S.head, k.elbow, k.wrist) < r;
  };

  const items = [];
  const legFills = {};
  for (const s of ["L", "R"]) {
    const k = S.sides[s];
    const crossing = crossesBody(S, s);
    const armD = depths.arm[s];
    const legD = depths.leg[s];
    // An arm reaching across the body is always the near one, whatever the
    // depth arithmetic says: it is drawn over the chest, so it cannot be shaded
    // as though it were behind it.
    const armFar = !crossing && isFar("arm", s);
    const legFar = isFar("leg", s);
    items.push({
      d: armD, o: s === near ? 5 : (crossing ? 4.5 : 0), kind: "arm", s,
      fill: armFar ? C.far : C.inkHi,
      plates: armFar ? null : skinOpts,
    });
    legFills[s] = legFar ? C.far : C.inkHi;
    items.push({
      d: legD, o: s === near ? 4 : 1, kind: "leg", s,
      fill: legFills[s],
      plates: legFar ? null : skinOpts,
    });
  }
  items.push({ d: torsoD, o: 2, kind: "torso" });
  items.push({ d: Math.max(torsoD, depths.arm.L, depths.arm.R), o: 5.5, kind: "yoke" });
  // The head goes on top of any near arm that crosses it, and stays where it
  // was otherwise, so a hand held in front of the chest is still in front.
  const armOnFace = crossesHead(near) ? depths.arm[near] : null;
  items.push(armOnFace !== null
    ? { d: Math.max(S.head.d, armOnFace), o: 6, kind: "head" }
    : { d: S.head.d, o: 3, kind: "head" });
  items.sort((a, b) => (a.d + a.o * 0.0001) - (b.d + b.o * 0.0001));
  // Not part of the depth sort: the hip fillers are only ever allowed to show
  // through where the trunk and the thighs leave a gap, so they go first.
  items.unshift({ kind: "hip", fills: legFills });

  const walk = () => {
    for (const it of items) {
      if (it.kind === "arm") { DRAWN_TAG = it.s; drawArm(ctx, S, it.s, C, it.fill, grips[it.s], it.plates); DRAWN_TAG = null; }
      else if (it.kind === "yoke") drawYoke(ctx, S, C, C.ink);
      else if (it.kind === "leg") drawLeg(ctx, S, it.s, C, it.fill, it.plates);
      else if (it.kind === "torso") drawTorso(ctx, S, C, C.ink, skinOpts);
      else if (it.kind === "hip") drawHips(ctx, S, C, it.fills);
      else drawHead(ctx, S, C, C.ink);
    }
  };
  // pass one: gather every capsule and stroke the union once
  COLLECT = [];
  try { walk(); } finally { const segs = COLLECT; COLLECT = null; outline(ctx, C, segs); }
  // pass two: fills and inner detail, with per part outlines off
  LINES = false; DRAWN = { L: [], R: [] };
  try { walk(); } finally { LINES = true; DRAWN = null; }
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
    // bend is a sign, so it cannot be interpolated: the earlier keyframe of the
    // pair owns it, and the later one is only consulted when the earlier says
    // nothing. A pin whose bend must flip mid rep needs a keyframe at the flip.
    const bend = (Array.isArray(A) ? A[2] : A.bend) ?? (Array.isArray(B) ? B[2] : B.bend);
    // A pin with an explicit z is a WORLD target rather than a screen one, and
    // its z has to interpolate like the other two. Without this a lateral sweep
    // collapses to whichever z the first keyframe had.
    const az = Array.isArray(A) ? undefined : A.z, bz = Array.isArray(B) ? undefined : B.z;
    // `tol` rides along: it is not geometry, it is how much slack a contact
    // check is allowed on that pin, and a harness reads it off the sampled pose.
    out[k] = { rel: A.rel || B.rel, x: ax + (bx - ax) * u, y: ay + (by - ay) * u, bend,
               pole: A.pole || B.pole, tol: A.tol || B.tol };
    if (az !== undefined || bz !== undefined) {
      const z0 = az === undefined ? bz : az, z1 = bz === undefined ? az : bz;
      out[k].z = z0 + (z1 - z0) * u;
    }
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
// The blink clock: render stamps the wall time so the face can close its eyes
// for a tenth of a second every few seconds. Static renders (sheets, t pins)
// pass 0 and never blink.
let FACE_TIME = 0;
export function render(canvas, move, C, cycle, timeSec = 0, opts = {}) {
  FACE_TIME = timeSec || 0;
  const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
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
  useBody(opts.body || C.body || "male");
  const view = opts.view || move.view;
  // The caller passes which muscles and what peak colour; when they fire is the
  // move's business, so it is worked out here rather than by every caller.
  // Muscle highlighting is OFF in the product. It only exists on the anatomy
  // skin, which nothing ships with, and the plain skin ignores opts.lit
  // entirely so a stale caller passing muscles cannot light anything.
  const lit = C.skin === "anatomy" && opts.lit
    ? { ...opts.lit, intensity: opts.lit.intensity === undefined ? litIntensity(move, cycle) : opts.lit.intensity }
    : null;
  const S = solvePose(samplePose(move, cycle, timeSec), view);
  S.farSide = move.farSide || null;
  S.facing = move.facing || "toward";
  drawFigure(ctx, S, C, {
    props: move.props, floor: move.floor, lit,
    grip: gripSides(move, S),
    face: opts.face, mood: opts.mood, lines: opts.lines,
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

/* ------------------------------------------------------ equipment portraits ---
 *
 * A picture of the thing itself, with no figure on it: "this is what a
 * preacher bench looks like, go and find one". It is drawn by the same code
 * that draws the equipment inside the exercise animations, out of the same
 * steel, pad, chrome and iron, so the machine in the popup is the machine in
 * the picture the figure is using. A separate set of illustrations would drift
 * from the animations the first time somebody edited one.
 *
 * Each portrait is a props list plus the box to crop to, in the rig's own
 * 140-unit space. Props that hang off a joint take a plain { x, y } instead of
 * a body part, which `anchor` already supports, so no pose is needed.
 *
 * The free weights are the one place a portrait is NOT the animation's own
 * drawing: side on, a loaded barbell is a single disc, which is right in a
 * scene and useless as a picture of a barbell. So those are drawn front on,
 * the way you would see them on the rack you are walking to.
 */
function plateStack(ctx, C, x, y, r) {
  ctx.strokeStyle = C.edge; ctx.lineWidth = 2.4; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = C.iron; ctx.fill();
  ctx.strokeStyle = C.ironHi; ctx.lineWidth = r * 0.16;
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.arc(x, y, r * 0.88, Math.PI * 1.08, Math.PI * 1.7); ctx.stroke();
}
// A loaded bar seen from the front: sleeve, collars, a pair of plates a side.
function loadedBar(ctx, C, y, half, plates = [9.5, 6.5]) {
  chromeBar(ctx, C, V(70 - half, y), V(70 + half, y), 2.6, true);
  for (const s of [-1, 1]) {
    let x = 70 + s * (half - 4);
    for (const r of plates) { plateStack(ctx, C, x, y, r); x -= s * (r * 0.42 + 2.6); }
    ctx.fillStyle = C.chromeLo;
    roundRect(ctx, 70 + s * (half - 2.4) - 2, y - 4, 4, 8, 1.4); ctx.fill();
  }
}
const KIT_ART = {
  // ---- the machines, which already have their own drawings ----
  "lat-pulldown": { box: [18, 0, 100, 122], props: [{ type: "artwork", src: "/knowledge/motion/props/lat-pulldown.svg" }] },
  "seated-row": { box: [8, 40, 128, 84], props: [{ type: "artwork", src: "/knowledge/motion/props/seated-row.svg" }] },
  "chest-press": { box: [10, 0, 118, 124], props: [{ type: "artwork", src: "/knowledge/motion/props/chest-press.svg" }] },
  "shoulder-press": { box: [10, 0, 118, 124], props: [{ type: "artwork", src: "/knowledge/motion/props/shoulder-press.svg" }] },
  "pec-deck": { box: [16, 0, 108, 124], props: [{ type: "artwork", src: "/knowledge/motion/props/pec-deck.svg" }] },
  "leg-extension": { box: [8, 24, 124, 100], props: [{ type: "artwork", src: "/knowledge/motion/props/leg-extension.svg" }] },
  "leg-curl": { box: [0, 40, 138, 84], props: [{ type: "artwork", src: "/knowledge/motion/props/leg-curl.svg" }] },
  "leg-press": { box: [0, 30, 138, 94], props: [{ type: "artwork", src: "/knowledge/motion/props/leg-press.svg" }, { type: "artwork", src: "/knowledge/motion/props/leg-press-sled.svg", x: 96, y: 74, k: 1 }] },
  "hack-squat": { box: [8, 10, 124, 114], props: [{ type: "artwork", src: "/knowledge/motion/props/hack-squat.svg" }, { type: "artwork", src: "/knowledge/motion/props/hack-squat-sled.svg", x: 62, y: 62, k: 1 }] },
  "seated-calf": { box: [10, 50, 118, 74], props: [{ type: "artwork", src: "/knowledge/motion/props/seated-calf.svg" }] },
  "reverse-hyper": { box: [24, 40, 96, 84], props: [{ type: "artwork", src: "/knowledge/motion/props/reverse-hyper.svg" }] },
  ghd: { box: [10, 50, 118, 74], props: [{ type: "artwork", src: "/knowledge/motion/props/ghd.svg" }] },
  "back-extension": { box: [16, 40, 108, 84], props: [{ type: "artwork", src: "/knowledge/motion/props/back-extension.svg" }] },
  "preacher-bench": { box: [14, 50, 108, 74], props: [{ type: "artwork", src: "/knowledge/motion/props/preacher.svg" }] },
  landmine: { box: [8, 96, 44, 28], props: [{ type: "artwork", src: "/knowledge/motion/props/landmine.svg" }] },
  "ab-wheel": { box: [46, 44, 48, 48], props: [{ type: "artwork", src: "/knowledge/motion/props/ab-wheel.svg", x: 70, y: 68, k: 1.6 }] },
  "calf-block": { box: [40, 92, 60, 32], props: [{ type: "artwork", src: "/knowledge/motion/props/calf-block.svg", dx: 21 }] },

  // ---- the cable stations, drawn by the cable prop itself ----
  cable: {
    box: [38, 0, 64, 124],
    props: [{ type: "cable", x: 70, top: 14, y0: 46, plumb: true, grip: "bar", barW: 20, to: { x: 70, y: 74 } }],
  },
  "cable-crossover": {
    box: [2, 0, 136, 124],
    props: [
      { type: "artwork", src: "/knowledge/motion/props/crossover-beam.svg" },
      { type: "cable", x: 14, top: 12, y0: 46, plumb: true, grip: "handle", to: { x: 14, y: 62 } },
      { type: "cable", x: 126, top: 12, y0: 46, plumb: true, grip: "handle", to: { x: 126, y: 62 } },
    ],
  },

  // ---- benches and the places you stand ----
  bench: { box: [16, 78, 108, 46], props: [{ type: "bench", x: 26, y: 96, w: 88 }] },
  "bench-adjustable": { box: [16, 56, 108, 68], props: [{ type: "bench", x: 30, y: 92, w: 80, incline: -35 }] },
  "pullup-bar": { box: [14, 0, 112, 124], props: [{ type: "pullupBar", y: 18, x0: 26, x1: 114 }] },
  "dip-bars": { box: [26, 56, 88, 68], props: [{ type: "dipBars", x0: 36, x1: 104, y: 72 }] },
  parallettes: { box: [30, 84, 80, 40], props: [{ type: "dipBars", x0: 42, x1: 98, y: 100 }] },
  box: { box: [34, 82, 72, 42], props: [{ type: "box", x: 44, y: 92, w: 52 }] },
  block: { box: [48, 94, 44, 30], props: [{ type: "box", x: 56, y: 102, w: 28, block: true }] },
  wall: { box: [40, 0, 60, 124], props: [{ type: "wall", x: 56, w: 30 }] },
  doorway: { box: [34, 0, 72, 124], props: [{ type: "doorframe", x: 62, w: 12 }] },
  "rig-post": { box: [48, 0, 44, 124], props: [{ type: "doorframe", x: 64, w: 10, pole: true }] },
  rack: {
    box: [14, 0, 112, 124],
    draw(ctx, C) {
      for (const x of [34, 106]) {
        steelPost(ctx, C, x, 6, GROUND, 8);
        // the J cup the bar sits in, at shoulder height
        ctx.fillStyle = C.steelLo;
        roundRect(ctx, x - 9, 44, 9, 4.4, 1.6); ctx.fill();
        roundRect(ctx, x - 9, 38, 3.4, 8, 1.4); ctx.fill();
        // the holes that make it a rack and not two posts
        ctx.fillStyle = C.steelLo;
        for (let y = 16; y < GROUND - 8; y += 9) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); }
      }
      loadedBar(ctx, C, 42, 54);
    },
  },
  "smith-machine": {
    box: [14, 0, 112, 124],
    draw(ctx, C) {
      for (const x of [36, 104] ) {
        steelPost(ctx, C, x, 6, GROUND, 7);
        chromeBar(ctx, C, V(x + 5, 10), V(x + 5, GROUND - 6), 1.6);
      }
      loadedBar(ctx, C, 54, 44);
      ctx.fillStyle = C.steelLo;
      for (const x of [41, 109]) { roundRect(ctx, x - 4, 50, 8, 8, 2); ctx.fill(); }
    },
  },

  // ---- what you pick up, drawn front on ----
  barbell: { box: [4, 46, 132, 32], draw: (ctx, C) => loadedBar(ctx, C, 62, 62) },
  "ez-bar": {
    box: [20, 48, 100, 28],
    draw(ctx, C) {
      // the camber: down, up, down across the middle, which is the whole point
      const p = [V(42, 62), V(52, 58), V(62, 66), V(78, 66), V(88, 58), V(98, 62)];
      for (let i = 0; i < p.length - 1; i++) chromeBar(ctx, C, p[i], p[i + 1], 2.3, i === 1 || i === 3);
      for (const s of [-1, 1]) {
        plateStack(ctx, C, 70 + s * 32, 62, 7.5);
        ctx.fillStyle = C.chromeLo; roundRect(ctx, 70 + s * 26 - 2, 58, 4, 8, 1.4); ctx.fill();
      }
    },
  },
  dumbbell: {
    box: [14, 44, 112, 36],
    draw(ctx, C) {
      PROPS.dumbbell(ctx, C, { x: 46, y: 62, k: 0.95 }, null);
      PROPS.dumbbell(ctx, C, { x: 94, y: 62, k: 0.95 }, null);
    },
  },
  "dumbbell-one": { box: [40, 42, 60, 40], draw: (ctx, C) => PROPS.dumbbell(ctx, C, { x: 70, y: 62, k: 1.15 }, null) },
  kettlebell: { box: [44, 38, 52, 46], draw: (ctx, C) => PROPS.kettlebell(ctx, C, { x: 70, y: 44, k: 1.25 }, null) },
  plate: { box: [44, 36, 52, 52], draw: (ctx, C) => plateStack(ctx, C, 70, 62, 22) },
  "dip-belt": {
    box: [36, 26, 68, 72],
    draw(ctx, C) {
      // the belt, then the chain, then the plate hanging off it
      ctx.fillStyle = C.rubber;
      roundRect(ctx, 50, 34, 40, 9, 4); ctx.fill();
      ctx.fillStyle = C.padHi; roundRect(ctx, 50, 34, 40, 2.6, 1.3); ctx.fill();
      ctx.strokeStyle = C.chrome; ctx.lineWidth = 1.6;
      for (const x of [62, 78]) { ctx.beginPath(); ctx.moveTo(x, 43); ctx.lineTo(70, 62); ctx.stroke(); }
      plateStack(ctx, C, 70, 74, 14);
    },
  },

  // ---- the small things ----
  band: { box: [22, 46, 96, 40], props: [{ type: "band", rest: 96, from: { x: 34, y: 56 }, to: { x: 106, y: 56 } }] },
  /* End on, a foam roller and a weight plate are the same dark circle. Seen
     along its length it is unmistakably a roller, so the portrait turns it. */
  roller: {
    box: [28, 44, 84, 40],
    draw(ctx, C) {
      capsulePath(ctx, V(48, 64), 14, V(92, 64), 14);
      ctx.fillStyle = C.pad; ctx.fill();
      ctx.beginPath(); ctx.ellipse(48, 64, 5.5, 14, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.padHi; ctx.fill();
      ctx.beginPath(); ctx.ellipse(48, 64, 2.2, 5.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.steelLo; ctx.fill();
      ctx.strokeStyle = C.padLine; ctx.lineWidth = 1.1;
      for (const x of [62, 76, 90]) { ctx.beginPath(); ctx.ellipse(x, 64, 4.4, 13, 0, Math.PI * 1.55, Math.PI * 2.45); ctx.stroke(); }
    },
  },
  // Edge on a mat is a stripe. From above it is a mat.
  mat: { box: [26, 30, 88, 80], props: [{ type: "mat", top: true, x: 32, y: 36, w: 76, h: 68, r: 7 }] },
};

/* Paint one piece of equipment into a canvas, cropped to its own box. Returns
   false when nothing is known about that id, so a caller can leave the space
   empty instead of drawing a mystery. */
export function drawKit(canvas, id, { theme = "dark", onReady } = {}) {
  const art = KIT_ART[id];
  if (!canvas || !art) return false;
  const C = palette(theme);
  const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
  const w = canvas.clientWidth || canvas.width || 120;
  const h = canvas.clientHeight || canvas.height || 120;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const [bx, by, bw, bh] = art.box;
  // Fit the box inside the canvas, centred, never upscaled past the frame.
  const k = Math.min(w / bw, h / bh);
  ctx.translate((w - bw * k) / 2, (h - bh * k) / 2);
  ctx.scale(k, k);
  ctx.translate(-bx, -by);
  if (art.draw) art.draw(ctx, C);
  if (art.props) {
    // Two passes, same as a scene, so a machine's near pads land over its frame.
    const list = art.props.map((p) => (p.type === "artwork" && onReady ? { ...p, onReady } : p));
    drawProps(ctx, C, list, null, "back");
    drawProps(ctx, C, list, null, "front");
  }
  return true;
}
export const KIT_ART_IDS = Object.keys(KIT_ART);
