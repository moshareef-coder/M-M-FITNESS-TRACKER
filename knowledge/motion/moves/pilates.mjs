// Pilates moves. Keys are the EXACT `name` from
// knowledge/exercise-library/pilates.mjs.
//
// Almost all of this library is mat work, so almost every entry lies the figure
// down with `root.rot` near 90 degrees and the numbers stop being readable at a
// glance. Three facts make them readable again.
//
// 1. SIGN. `perpV(rot)` is the direction the figure faces, so `rot < 0` is
//    supine (face up) and `rot > 0` is prone (face down). The head goes where
//    `upV(rot)` points, and `upV` for a rolled root means a supine figure ALWAYS
//    has its head at -x and its feet at +x, and a prone figure always has its
//    head at +x. That is not a style choice, it falls out of the rig, so every
//    prop and pin below is placed on that basis.
//
// 2. THE DERIVED ANGLES, which are what the validator checks and what a human
//    reader cares about:
//        hipFlex      = 2*rot + spine + hip
//        shoulderElev = 2*(rot + spine) + shoulder
//        kneeFlex     = knee,  elbowFlex = elbow,  ankleDorsi = ankle
//    So for a supine figure (rot -90) with no spinal flexion, a leg lying flat
//    along the mat is `hip: 180`, and an arm stretched overhead on the mat is
//    `shoulder: 0`. Work out the shape you want in hipFlex, then add 180.
//
// 3. CONTACT. A mat figure is held up by its contact points, not by its feet, so
//    the sacrum (root.y) and the shoulder blades (chest.y) are what have to sit
//    on the mat at 118. Pelvis radius is 9.9 and chest radius 11.8, so a pelvis
//    parked at y 105 to 107 puts the back of the body on the mat without the
//    validator seeing a joint centre through the floor.
//
// Pinned ankles are avoided on anything with a long leg: a pinned ankle is a
// FLAT foot, which on a supine extended leg derives as 90 degrees of plantar
// flexion and fails the ankle range. Long legs are authored with angles, and
// `ankle: -45` is about as pointed as a real foot gets.

// A mat under every one of these. It is the difference between "lying down" and
// "floating", and it is the only prop most of the library needs.
// Plank is the calisthenics one, authored once and shared.
import { PLANK } from "./calisthenics.mjs";

// Cat-Cow is the yoga one, authored once and shared.
import { CAT_COW } from "./yoga.mjs";

const MAT = { type: "mat", x: 6, w: 128 };

// Supine, head and shoulders curled off the mat, legs long at 45 degrees, both
// arms straight and hovering beside the hips beating up and down. Must be
// visible: the small fast arm pump against a body that does not move, which is
// the whole exercise. Side view. The cycle is deliberately under a second and
// only the wrist pins differ between the two keyframes, so the legs and the
// curl are frozen and the arms are the only thing beating.
const THE_HUNDRED = {
  view: "side",
  loop: "pingpong",
  dur: 0.58,
  breath: 0.12,
  props: [MAT],
  keys: [
    { // bottom of the beat, hands almost brushing the mat past the hips
      t: 0,
      root: { x: 60, y: 105, rot: -90 },
      joints: { spine: 22, neck: 42, hipR: 225, hipL: 222, kneeR: 3, kneeL: 3,
                ankleR: -48, ankleL: -46 },
      ik: { wristR: { x: 68.1, y: 110.6, bend: 1 }, wristL: { x: 66.9, y: 113.4, bend: 1 } },
    },
    { // top of the beat
      t: 1,
      root: { x: 60, y: 105, rot: -90 },
      joints: { spine: 22, neck: 42, hipR: 225, hipL: 222, kneeR: 3, kneeL: 3,
                ankleR: -48, ankleL: -46 },
      ik: { wristR: { x: 71.8, y: 99.7, bend: 1 }, wristL: { x: 70.6, y: 102.5, bend: 1 } },
    },
  ],
};

// Supine curl held, both knees hugged into the chest, then both legs shoot long
// to 45 degrees while both arms sweep back past the ears. Must be visible: the
// body opening and closing at both ends at once, hands and feet travelling in
// opposite directions. Side view.
const DOUBLE_LEG_STRETCH = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.9, dy: 4 },
  props: [MAT],
  keys: [
    { // closed, knees to the chest, hands on the shins
      t: 0,
      root: { x: 72, y: 105, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 288, hipL: 284, kneeR: 140, kneeL: 136,
                ankleR: -30, ankleL: -28 },
      ik: { wristR: { x: 77, y: 85, bend: 1 }, wristL: { x: 74, y: 88, bend: 1 } },
    },
    { // mid, hands circling up past the chest as the legs start to lengthen
      t: 0.5,
      root: { x: 72, y: 105, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 255, hipL: 252, kneeR: 40, kneeL: 38,
                ankleR: -40, ankleL: -38 },
      ik: { wristR: { x: 56, y: 62, bend: 1 }, wristL: { x: 53, y: 65, bend: 1 } },
    },
    { // open, legs long at 45, arms reaching back beside the ears
      t: 1,
      root: { x: 72, y: 105, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 223, hipL: 220, kneeR: 4, kneeL: 4,
                ankleR: -48, ankleL: -46 },
      ik: { wristR: { x: 11.5, y: 93, bend: 1 }, wristL: { x: 11, y: 97, bend: 1 } },
    },
  ],
};

// Supine curl held, one knee drawn into the chest with both hands on it while
// the other leg reaches long at 45, then the legs swap. Must be visible: the two
// legs doing opposite things at the same moment, which is what separates this
// from the double leg version. Side view.
const SINGLE_LEG_STRETCH = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  fit: { k: 0.95, dy: 2 },
  props: [MAT],
  keys: [
    { // near knee in, far leg long
      t: 0,
      root: { x: 68, y: 105, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 290, kneeR: 142, ankleR: -26,
                hipL: 222, kneeL: 4, ankleL: -46 },
      ik: { wristR: { x: 76, y: 80, bend: 1 }, wristL: { x: 72, y: 84, bend: 1 } },
    },
    { // swapped, far knee in, near leg long
      t: 1,
      root: { x: 68, y: 105, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 222, kneeR: 4, ankleR: -46,
                hipL: 290, kneeL: 142, ankleL: -26 },
      ik: { wristR: { x: 74, y: 82, bend: 1 }, wristL: { x: 71, y: 79, bend: 1 } },
    },
  ],
};

// Flat on the back with the arms stretched overhead, then peel off the mat one
// vertebra at a time until the body is folded over straight legs, hands past the
// feet. Must be visible: the sequence, so the middle keyframe is a half rolled
// C curve with the pelvis still down, not a straight body hinging at the hip.
// Side view, three keys.
const ROLL_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.6,
  breath: 0.2,
  fit: { k: 0.85, dy: 4 },
  props: [MAT],
  keys: [
    { // flat, arms long on the mat behind the head
      t: 0,
      root: { x: 78, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 180, hipL: 178, kneeR: 3, kneeL: 3,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 13.5, y: 105, bend: 1 }, wristL: { x: 15.5, y: 108, bend: 1 } },
    },
    { // half way, head and shoulders peeled up, pelvis still on the mat
      t: 0.45,
      root: { x: 78, y: 105, rot: -62 },
      joints: { spine: 30, neck: 40, hipR: 147, hipL: 145, kneeR: 3, kneeL: 3,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 98, y: 92, bend: 1 }, wristL: { x: 95, y: 95, bend: 1 } },
    },
    { // sitting tall in a C curve, hands reaching past the feet. Deliberately
      // short of a full fold: folded flat the torso covers the thighs and the
      // whole card turns into one blob.
      t: 1,
      root: { x: 78, y: 107, rot: 8 },
      joints: { spine: 34, neck: 25, hipR: 77, hipL: 75, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 130, y: 95, bend: 1 }, wristL: { x: 127, y: 98, bend: 1 } },
    },
  ],
};

// Supine curl with the hands behind the head, one knee pulled in while the other
// leg reaches long, and the opposite elbow driving across to that knee. Must be
// visible: the elbow and the bent knee closing on each other over a scissoring
// pair of legs. Side view even though the movement is a rotation, because the
// rotation itself is out of plane in BOTH available views, and side is the one
// that still shows the scissor, the curl and the elbow travelling to the knee.
const CRISS_CROSS = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.95, dy: 2 },
  props: [MAT],
  keys: [
    { // far knee in, near elbow crossing to meet it
      t: 0,
      root: { x: 66, y: 105, rot: -90 },
      joints: { spine: 22, neck: 36, hipL: 288, kneeL: 112, ankleL: -26,
                hipR: 220, kneeR: 4, ankleR: -46 },
      ik: { wristR: { x: 32, y: 82, bend: 1 }, wristL: { x: 30, y: 86, bend: 1 } },
    },
    { // swapped, near knee in, far elbow crossing
      t: 1,
      root: { x: 66, y: 105, rot: -90 },
      joints: { spine: 22, neck: 36, hipR: 288, kneeR: 112, ankleR: -26,
                hipL: 220, kneeL: 4, ankleL: -46 },
      ik: { wristR: { x: 30, y: 86, bend: 1 }, wristL: { x: 32, y: 82, bend: 1 } },
    },
  ],
};

// From lying with the legs low, roll up to balance on the tail bone in a narrow
// V with the legs straight at 45 and the arms reaching parallel to them. Must be
// visible: the closed V, both halves of the body off the mat at the same time
// with only the pelvis touching. Side view.
const TEASER = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.2,
  fit: { k: 0.88, dy: 4 },
  props: [MAT],
  keys: [
    { // lying back, legs already at 45, arms long on the mat overhead
      t: 0,
      root: { x: 70, y: 106, rot: -90 },
      joints: { spine: 4, neck: 6, hipR: 218, hipL: 215, kneeR: 4, kneeL: 4,
                ankleR: -46, ankleL: -44 },
      ik: { wristR: { x: 10, y: 105, bend: 1 }, wristL: { x: 12, y: 108, bend: 1 } },
    },
    { // half way up, arms swung past the ears, spine peeling off the mat
      t: 0.5,
      root: { x: 70, y: 105, rot: -62 },
      joints: { spine: 6, neck: 14, hipR: 202, hipL: 199, kneeR: 4, kneeL: 4,
                ankleR: -46, ankleL: -44 },
      ik: { wristR: { x: 75, y: 65, bend: 1 }, wristL: { x: 72, y: 68, bend: 1 } },
    },
    { // the V, balanced on the sacrum, fingers reaching for the toes
      t: 1,
      root: { x: 70, y: 103, rot: -34 },
      joints: { spine: 8, neck: 12, hipR: 170, hipL: 167, kneeR: 4, kneeL: 4,
                ankleR: -46, ankleL: -44 },
      ik: { wristR: { x: 104, y: 60, bend: 1 }, wristL: { x: 101, y: 63, bend: 1 } },
    },
  ],
};

// Supine with the legs at 90, take them overhead, then press the hips up so the
// body makes one long diagonal from the shoulders to the toes. Must be visible:
// the hips leaving the mat and the whole body finishing as one straight line off
// the shoulders. Side view, deviating from the suggested front: the movement is
// entirely sagittal and front on it collapses to a figure standing on its head.
const JACKKNIFE = {
  view: "side",
  loop: "pingpong",
  dur: 3.6,
  breath: 0.2,
  fit: { k: 0.88, dy: 6 },
  props: [MAT],
  keys: [
    { // start, legs vertical, whole back on the mat
      t: 0,
      root: { x: 74, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 270, hipL: 267, kneeR: 4, kneeL: 4,
                ankleR: -40, ankleL: -38, shoulderR: 172, shoulderL: 175,
                elbowR: 8, elbowL: 8 },
    },
    { // legs travelling overhead, hips just leaving the mat
      t: 0.45,
      root: { x: 72, y: 96, rot: -110 },
      joints: { spine: 6, neck: 34, hipR: 292, hipL: 289, kneeR: 6, kneeL: 6,
                ankleR: -40, ankleL: -38, shoulderR: 190, shoulderL: 193,
                elbowR: 10, elbowL: 10 },
    },
    { // the jackknife, one line from the shoulders through the hips to the toes
      t: 1,
      root: { x: 84, y: 82, rot: -140 },
      joints: { spine: 0, neck: 50, hipR: 285, hipL: 282, kneeR: 4, kneeL: 4,
                ankleR: -40, ankleL: -38, shoulderR: 225, shoulderL: 228,
                elbowR: 10, elbowL: 10 },
    },
  ],
};

// Supine with the knees bent and the feet flat, peel the hips up until the knee,
// hip and shoulder line up, then melt back down. Must be visible: the hips
// leaving the mat while the shoulders and the feet stay planted. Side view, feet
// pinned so they stay put while the pelvis travels.
const BRIDGE = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.22,
  props: [MAT],
  keys: [
    { // hips down
      t: 0,
      root: { x: 62, y: 106, rot: -90 },
      // The arms are angles rather than pins on purpose: pinned to the mat they
      // sit closer to the shoulder than an arm's length, and the IK answers that
      // by bowing the elbow straight down through the floor.
      joints: { spine: 0, neck: 4, shoulderR: 168, shoulderL: 171, elbowR: 4, elbowL: 4 },
      ik: { ankleR: { x: 93, y: 113.4, bend: -1 }, ankleL: { x: 89, y: 113.4, bend: -1 } },
    },
    { // hips up, weight through the shoulder blades and the feet
      t: 1,
      root: { x: 62, y: 89, rot: -119 },
      joints: { spine: 0, neck: 22, shoulderR: 200, shoulderL: 203, elbowR: 4, elbowL: 4 },
      ik: { ankleR: { x: 93, y: 113.4, bend: -1 }, ankleL: { x: 89, y: 113.4, bend: -1 } },
    },
  ],
};

// --------------------------------------------------------- side lying ------
// Clamshell, Side-Lying Leg Lift and Side Kick Series are the three moves where
// the suggested "side" view is worth arguing with, so here is the argument once
// for all three. The front view CANNOT draw a figure rolled onto its side: in
// front view the rig mirrors the left half about the screen vertical, which is
// only correct while the figure is upright, and with root.rot near 90 the two
// legs come out pointing in opposite directions along the body. So these use the
// side view, and what the side view draws is the figure's FRONTAL plane: the
// body lies along the mat with the head at -x, the bottom leg near the mat and
// the top leg free to lift away from it. Opening and abduction read perfectly in
// that plane. Hip flexion does not, so the forward swing of the side kick is the
// conventional flat shorthand, said again where it matters below.

// Side lying with the knees bent and the heels together, the top knee opening
// away from the bottom one like a shell while the feet stay glued. Must be
// visible: the gap opening between the two knees with the feet still touching.
// Side view, see the note above.
// v2: a clamshell is hip EXTERNAL ROTATION with the feet together. v1 had to
// fake it by swinging the whole thigh, which is a different exercise. Now the
// hip rotates and a three-quarter camera shows the knee opening.
const CLAMSHELL = {
  view: { yaw: 34, plane: "sagittal" },
  loop: "pingpong",
  dur: 2.8,
  breath: 0.22,
  fit: { k: 0.9, dy: 2 },
  props: [MAT],
  keys: [
    { // closed, knees stacked
      t: 0,
      root: { x: 70, y: 100, rot: -90 },
      joints: { hipRotR: 0, hipAbdR: 0, spine: 0, neck: 0, hipR: 212, kneeR: 100, ankleR: -10,
                hipL: 202, kneeL: 95, ankleL: -10 },
      ik: { wristR: { x: 80, y: 99, bend: 1 }, wristL: { x: 8, y: 104, bend: 1 } },
    },
    { // open, top knee lifted away, heels still together
      t: 1,
      root: { x: 70, y: 100, rot: -90 },
      joints: { hipRotR: 46, hipAbdR: 34, spine: 0, neck: 0, hipR: 212, kneeR: 100, ankleR: -10,
                hipL: 202, kneeL: 95, ankleL: -10 },
      ik: { wristR: { x: 80, y: 99, bend: 1 }, wristL: { x: 8, y: 104, bend: 1 } },
    },
  ],
};

// Side lying with both legs long, the top leg lifting straight away from the
// bottom one and lowering with control. Must be visible: the wedge of space
// opening between two straight legs. Side view, see the note above.
const SIDE_LYING_LEG_LIFT = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.22,
  fit: { k: 0.9, dy: 2 },
  props: [MAT],
  keys: [
    { // legs together
      t: 0,
      root: { x: 70, y: 100, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 176, kneeR: 4, ankleR: -54,
                hipL: 170, kneeL: 4, ankleL: -58 },
      ik: { wristR: { x: 80, y: 99, bend: 1 }, wristL: { x: 8, y: 104, bend: 1 } },
    },
    { // top leg lifted, bottom leg unmoved on the mat
      t: 1,
      root: { x: 70, y: 100, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 212, kneeR: 4, ankleR: -54,
                hipL: 170, kneeL: 4, ankleL: -58 },
      ik: { wristR: { x: 80, y: 99, bend: 1 }, wristL: { x: 8, y: 104, bend: 1 } },
    },
  ],
};

// Side lying with the hands behind the head, the bottom leg anchored and the top
// leg swinging long past the body and back. Must be visible: a straight top leg
// travelling through a big arc while the torso stays still. Side view, see the
// note above, and the honest caveat: the real front-and-back kick happens in the
// sagittal plane, which is edge on here, so the swing is drawn in the plane we
// have. The hands behind the head are what keeps it from reading as the leg
// lift above.
const SIDE_KICK_SERIES = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.22,
  fit: { k: 0.9, dy: 2 },
  props: [MAT],
  keys: [
    { // top leg down, in line with the bottom one
      t: 0,
      root: { x: 70, y: 100, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 172, kneeR: 4, ankleR: -54,
                hipL: 170, kneeL: 4, ankleL: -58 },
      ik: { wristR: { x: 28, y: 90, bend: 1 }, wristL: { x: 28, y: 110, bend: 1 } },
    },
    { // kicked long past the body
      t: 1,
      root: { x: 70, y: 100, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 248, kneeR: 4, ankleR: -54,
                hipL: 170, kneeL: 4, ankleL: -58 },
      ik: { wristR: { x: 28, y: 90, bend: 1 }, wristL: { x: 28, y: 110, bend: 1 } },
    },
  ],
};

// Supine with one leg pointing at the ceiling and the other long on the mat, the
// raised leg drawing a circle from the hip. Must be visible: one leg vertical
// and the other flat, and the vertical one sweeping while the pelvis stays
// still. Side view: the sagittal half of the circle is the half that shows, the
// lateral half is edge on, so the sweep is drawn as the leg carrying over toward
// the chest and back out.
const LEG_CIRCLES = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.25,
  props: [MAT],
  keys: [
    { // raised leg carried out away from the body
      t: 0,
      root: { x: 64, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, shoulderR: 168, shoulderL: 171, elbowR: 4, elbowL: 4,
                hipR: 240, kneeR: 3, ankleR: -50, hipL: 180, kneeL: 3, ankleL: -20 },
    },
    { // through vertical
      t: 0.5,
      root: { x: 64, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, shoulderR: 168, shoulderL: 171, elbowR: 4, elbowL: 4,
                hipR: 270, kneeR: 3, ankleR: -50, hipL: 180, kneeL: 3, ankleL: -20 },
    },
    { // carried across toward the chest
      t: 1,
      root: { x: 64, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, shoulderR: 168, shoulderL: 171, elbowR: 4, elbowL: 4,
                hipR: 302, kneeR: 3, ankleR: -50, hipL: 180, kneeL: 3, ankleL: -20 },
    },
  ],
};

// Sitting tall with the legs long and the arms reaching forward at shoulder
// height, then curling down over the legs one vertebra at a time. Must be
// visible: the tall start and the round C of the finish, with the legs staying
// straight on the mat the whole time. Side view.
const SPINE_STRETCH_FORWARD = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.25,
  fit: { k: 0.92, dy: 2 },
  props: [MAT],
  keys: [
    { // sitting tall, arms level
      t: 0,
      root: { x: 56, y: 107, rot: 0 },
      joints: { spine: 0, neck: -2, hipR: 85, hipL: 83, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 92, y: 82, bend: 1 }, wristL: { x: 89, y: 85, bend: 1 } },
    },
    { // curled forward, hands travelling past the feet
      t: 1,
      root: { x: 56, y: 107, rot: 8 },
      joints: { spine: 34, neck: 25, hipR: 77, hipL: 75, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 108, y: 100, bend: 1 }, wristL: { x: 105, y: 103, bend: 1 } },
    },
  ],
};

// Face down with the arms reaching long past the head, lifting the chest and
// the arms off the mat into one long arc while the hips stay down. Must be
// visible: the chest and head leaving the mat while the pelvis does not. Side
// view, and prone, so root.rot is POSITIVE and the head is at +x. The arms reach
// forward rather than pressing hands-under-shoulders: at mat level the shoulder
// is only 12 units up, and every hands-down solve bows the elbow through the
// floor, which is the pose being wrong rather than the bend being wrong.
const SWAN = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  fit: { k: 0.82, dy: 2 },
  props: [MAT],
  keys: [
    { // down, the whole front of the body on the mat
      t: 0,
      root: { x: 66, y: 106, rot: 90 },
      joints: { spine: -4, neck: 0, shoulderR: 0, shoulderL: 3, elbowR: 4, elbowL: 5,
                hipR: -177, hipL: -179, kneeR: 4, kneeL: 4, ankleR: -58, ankleL: -56 },
    },
    { // lifted, one arc from the fingertips through the chest to the hips
      t: 1,
      root: { x: 66, y: 106, rot: 90 },
      joints: { spine: -36, neck: -10, shoulderR: 68, shoulderL: 71, elbowR: 8, elbowL: 9,
                hipR: -177, hipL: -179, kneeR: 4, kneeL: 4, ankleR: -58, ankleL: -56 },
    },
  ],
};

// Sitting tall with the legs wide and the arms out, twisting and reaching one
// hand past the opposite foot while the other arm reaches back and up. Must be
// visible: the two arms travelling in opposite directions over a forward fold,
// which is the only part of a rotation a flat view can carry. Side view, because
// front on the fold disappears and the reach past the foot goes with it. The
// trailing arm stays roughly in line with the folded torso rather than lifting
// behind it: an arm reaching back and up off a folded torso derives as 90 plus
// degrees of shoulder extension, which no shoulder does and the validator knows.
const SAW = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.25,
  fit: { k: 0.92, dy: 2 },
  props: [MAT],
  keys: [
    { // sitting tall, arms open front and back
      t: 0,
      root: { x: 56, y: 107, rot: 0 },
      joints: { spine: 0, neck: 0, hipR: 85, hipL: 83, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 92, y: 82, bend: 1 }, wristL: { x: 27, y: 104.5, bend: 1 } },
    },
    { // sawing, near hand past the foot and far arm reaching back and up
      t: 1,
      root: { x: 56, y: 107, rot: 10 },
      joints: { spine: 32, neck: 20, hipR: 75, hipL: 73, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 108, y: 104, bend: 1 }, wristL: { x: 36, y: 88, bend: 1 } },
    },
  ],
};

// Face down with the arms and legs long, lifting one arm and the opposite leg
// off the mat and swapping in a quick flutter. Must be visible: the diagonal,
// one arm up on one side and the leg up on the other, and the swap. Side view,
// prone, so root.rot is positive and the head is at +x. Short cycle: swimming is
// a beat, not a rep.
const SWIMMING = {
  view: "side",
  loop: "pingpong",
  dur: 1.2,
  breath: 0.15,
  fit: { k: 0.82, dy: 2 },
  props: [MAT],
  keys: [
    { // near arm up, far leg up
      t: 0,
      root: { x: 66, y: 106, rot: 90 },
      joints: { spine: -14, neck: -8, shoulderR: 42, shoulderL: 10, elbowR: 6, elbowL: 5,
                hipR: -174, hipL: -200, kneeR: 4, kneeL: 4, ankleR: -58, ankleL: -56 },
    },
    { // swapped: far arm up, near leg up
      t: 1,
      root: { x: 66, y: 106, rot: 90 },
      joints: { spine: -14, neck: -8, shoulderR: 10, shoulderL: 42, elbowR: 5, elbowL: 6,
                hipR: -200, hipL: -174, kneeR: 4, kneeL: 4, ankleR: -58, ankleL: -56 },
    },
  ],
};

// Hips held high off the mat on one planted foot while the free leg extends to
// the ceiling and kicks down and up. Must be visible: the hips STAYING up while
// only the free leg moves, which is what separates this from Bridge. Side view,
// planted foot pinned.
const SHOULDER_BRIDGE = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.22,
  props: [MAT],
  keys: [
    { // free leg straight up
      t: 0,
      root: { x: 62, y: 89, rot: -119 },
      joints: { spine: 0, neck: 22, shoulderR: 200, shoulderL: 203, elbowR: 4, elbowL: 4,
                hipR: 299, kneeR: 4, ankleR: -44 },
      ik: { ankleL: { x: 89, y: 113.4, bend: -1 } },
    },
    { // free leg lowered toward the line of the body, hips unmoved
      t: 1,
      root: { x: 62, y: 89, rot: -119 },
      joints: { spine: 0, neck: 22, shoulderR: 200, shoulderL: 203, elbowR: 4, elbowL: 4,
                hipR: 262, kneeR: 4, ankleR: -44 },
      ik: { ankleL: { x: 89, y: 113.4, bend: -1 } },
    },
  ],
};

// Lying flat with the legs long, lifting them over the head until they hang
// above and behind it, then rolling back down one vertebra at a time. Must be
// visible: the hips leaving the mat and the legs travelling past the head while
// the shoulders stay put. Side view, three keys so the middle is the vertical
// pass rather than a straight line between two extremes.
const ROLL_OVER = {
  view: "side",
  loop: "pingpong",
  dur: 3.8,
  breath: 0.22,
  fit: { k: 0.86, dy: 4 },
  props: [MAT],
  keys: [
    { // flat, legs low
      t: 0,
      root: { x: 76, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, shoulderR: 170, shoulderL: 173, elbowR: 5, elbowL: 5,
                hipR: 210, hipL: 208, kneeR: 4, kneeL: 4, ankleR: -44, ankleL: -42 },
    },
    { // through vertical, hips just leaving the mat
      t: 0.45,
      root: { x: 76, y: 102, rot: -100 },
      joints: { spine: 0, neck: 20, shoulderR: 190, shoulderL: 193, elbowR: 5, elbowL: 5,
                hipR: 286, hipL: 284, kneeR: 4, kneeL: 4, ankleR: -44, ankleL: -42 },
    },
    { // over, legs hanging above and behind the head
      t: 1,
      root: { x: 76, y: 80, rot: -146 },
      joints: { spine: 0, neck: 50, shoulderR: 236, shoulderL: 239, elbowR: 6, elbowL: 6,
                hipR: 416, hipL: 414, kneeR: 6, kneeL: 6, ankleR: -44, ankleL: -42 },
    },
  ],
};

// Lying flat with both legs squeezed together and pointing at the ceiling,
// circling them as one unit. Must be visible: the two legs staying glued as they
// sweep, which is the only thing separating this from Leg Circles. Side view,
// same reasoning as Leg Circles: the sagittal half of the circle is the half a
// flat view can carry.
const CORKSCREW = {
  view: "side",
  loop: "pingpong",
  dur: 3.6,
  breath: 0.25,
  props: [MAT],
  keys: [
    { // swept out away from the body
      t: 0,
      root: { x: 64, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, shoulderR: 168, shoulderL: 171, elbowR: 4, elbowL: 4,
                hipR: 240, hipL: 238, kneeR: 3, kneeL: 3, ankleR: -48, ankleL: -46 },
    },
    { // through vertical
      t: 0.5,
      root: { x: 64, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, shoulderR: 168, shoulderL: 171, elbowR: 4, elbowL: 4,
                hipR: 270, hipL: 268, kneeR: 3, kneeL: 3, ankleR: -48, ankleL: -46 },
    },
    { // carried over toward the chest, hips peeling off the mat
      t: 1,
      root: { x: 64, y: 101, rot: -98 },
      joints: { spine: 0, neck: 24, shoulderR: 184, shoulderL: 187, elbowR: 4, elbowL: 4,
                hipR: 306, hipL: 304, kneeR: 3, kneeL: 3, ankleR: -48, ankleL: -46 },
    },
  ],
};

// A flowing sequence: balanced in a V, roll back so the legs pass overhead, then
// come back up through the V and fold over the legs. Must be visible: three
// clearly different shapes in one cycle, because the boomerang is a sequence
// rather than a rep. Side view. The fourth keyframe exists because the rig lerps
// hip angles as plain numbers: rolling straight from legs-overhead to seated
// walks the legs down through the mat, so the V is authored on the way back too.
const BOOMERANG = {
  view: "side",
  loop: "pingpong",
  dur: 4.4,
  breath: 0.2,
  fit: { k: 0.86, dy: 4 },
  props: [MAT],
  keys: [
    { // balanced in the V, arms reaching along the legs
      t: 0,
      root: { x: 70, y: 103, rot: -34 },
      joints: { spine: 8, neck: 12, hipR: 170, hipL: 167, kneeR: 4, kneeL: 4,
                ankleR: -46, ankleL: -44 },
      ik: { wristR: { x: 104, y: 60, bend: 1 }, wristL: { x: 101, y: 63, bend: 1 } },
    },
    { // rolled back, legs passing over the head, arms long on the mat
      t: 0.42,
      root: { x: 72, y: 82, rot: -142 },
      joints: { spine: 0, neck: 48, hipR: 420, hipL: 418, kneeR: 8, kneeL: 8,
                ankleR: -44, ankleL: -42 },
      ik: { wristR: { x: 106, y: 106, bend: 1 }, wristL: { x: 103, y: 108, bend: 1 } },
    },
    { // back through the V on the way up
      t: 0.72,
      root: { x: 66, y: 100, rot: -45 },
      joints: { spine: 6, neck: 16, hipR: 180, hipL: 177, kneeR: 4, kneeL: 4,
                ankleR: -44, ankleL: -42 },
      ik: { wristR: { x: 84, y: 63, bend: 1 }, wristL: { x: 81, y: 66, bend: 1 } },
    },
    { // up and folded over long legs
      t: 1,
      root: { x: 56, y: 107, rot: 8 },
      joints: { spine: 34, neck: 28, hipR: 77, hipL: 75, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 108, y: 100, bend: 1 }, wristL: { x: 105, y: 103, bend: 1 } },
    },
  ],
};

// Balanced on the shoulders with the legs split in the air, both hands holding
// the ankle of the leg reaching down past the head while the other leg points
// straight at the ceiling. Must be visible: the split, one leg down to the hands
// and one leg up, off a body held on the shoulders. Side view.
const CONTROL_BALANCE = {
  view: "side",
  loop: "pingpong",
  dur: 3.8,
  breath: 0.22,
  fit: { k: 0.84, dy: 6 },
  props: [MAT],
  keys: [
    { // flat, legs pointing at the ceiling
      t: 0,
      root: { x: 76, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 268, hipL: 266, kneeR: 4, kneeL: 4,
                ankleR: -44, ankleL: -42 },
      ik: { wristR: { x: 104, y: 110, bend: 1 }, wristL: { x: 101, y: 112, bend: 1 } },
    },
    { // hips peeling up, hands already leaving the mat. Without this key the
      // hands travel straight from beside the hips to the overhead ankle and
      // pass within a few units of the shoulder, folding the elbow past its stop.
      t: 0.5,
      root: { x: 76, y: 96, rot: -112 },
      joints: { spine: 0, neck: 30, hipR: 288, kneeR: 4, ankleR: -44,
                hipL: 350, kneeL: 6, ankleL: -30 },
      ik: { wristR: { x: 70, y: 72, bend: 1 }, wristL: { x: 67, y: 75, bend: 1 } },
    },
    { // up on the shoulders, split, hands on the low ankle
      t: 1,
      root: { x: 76, y: 82, rot: -146 },
      joints: { spine: 0, neck: 50, hipR: 292, kneeR: 4, ankleR: -44,
                hipL: 441, kneeL: 6, ankleL: -20 },
      ik: { wristR: { x: 29, y: 101, bend: 1 }, wristL: { x: 32, y: 104, bend: 1 } },
    },
  ],
};

export const MOVES = {
  "Cat-Cow": CAT_COW,
  "Plank": PLANK,
  "The Hundred": THE_HUNDRED,
  "Double Leg Stretch": DOUBLE_LEG_STRETCH,
  "Single Leg Stretch": SINGLE_LEG_STRETCH,
  "Roll-Up": ROLL_UP,
  "Criss-Cross": CRISS_CROSS,
  "Teaser": TEASER,
  "Jackknife": JACKKNIFE,
  "Bridge": BRIDGE,
  "Clamshell": CLAMSHELL,
  "Leg Circles": LEG_CIRCLES,
  "Side-Lying Leg Lift": SIDE_LYING_LEG_LIFT,
  "Side Kick Series": SIDE_KICK_SERIES,
  "Spine Stretch Forward": SPINE_STRETCH_FORWARD,
  "Swan": SWAN,
  "Saw": SAW,
  "Swimming": SWIMMING,
  "Shoulder Bridge": SHOULDER_BRIDGE,
  "Roll-Over": ROLL_OVER,
  "Corkscrew": CORKSCREW,
  "Boomerang": BOOMERANG,
  "Control Balance": CONTROL_BALANCE,
};
