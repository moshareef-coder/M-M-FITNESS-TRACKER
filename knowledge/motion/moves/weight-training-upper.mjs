// Weight-training moves, upper body: chest, back, traps, shoulders, biceps, triceps, forearms.
// Keys are the EXACT `name` from knowledge/exercise-library/weight-training.mjs.
// Merged into ./weight-training.mjs; do not import this file directly.
//
// Every entry carries, above it, the three things AUTHORING.md asks for: one
// sentence of what the real movement looks like, the one thing that MUST be
// visible, and the view that shows it. Where the view differs from the
// suggested one in AUTHORING.md the comment says why.

import { PULL_UP } from "./calisthenics.mjs";

const FLOOR = 113.4;   // y of a pinned ankle standing on the ground
const stand = (xr, xl) => ({
  ankleR: { x: xr, y: FLOOR, bend: -1 },
  ankleL: { x: xl, y: FLOOR, bend: -1 },
});
// Ankles pinned somewhere other than the floor: a decline bench hooks the feet
// in the air, so the y is per side.
const pinFeet = (xr, yr, xl, yl) => ({
  ankleR: { x: xr, y: yr, bend: -1 },
  ankleL: { x: xl, y: yl, bend: -1 },
});
// Front view feet: a foot pointing at the camera is drawn short and wide
// rather than rotated. The same `ang` mirrors, because dirV takes the side sign.
const FRONT_FEET = { R: { ang: 12, len: 0.4, w: 1.3 }, L: { ang: 12, len: 0.4, w: 1.3 } };

// ---------------------------------------------------------------- chest ----

// Supine on a flat bench, a dumbbell in each hand, press from beside the chest
// to straight overhead. Must be visible: the vertical travel of the hands with
// the elbows folding out at the bottom. Side view, sagittal.
// Same chassis as the seeded Barbell Bench Press: root.rot -90 is supine, which
// puts the head at -x and runs the legs out to +x.
const DUMBBELL_BENCH_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  props: [
    { type: "bench", x: 26, y: 92, w: 78 },
    { type: "dumbbell", side: "L", point: "hand", rot: 90, k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.8, front: true },
  ],
  keys: [
    { // lockout, bells nearly touching over the chest
      t: 0,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 0, neck: -4 },
      ik: { wristR: { x: 58, y: 45, bend: 1 }, wristL: { x: 62, y: 47, bend: 1 }, ...stand(92, 96) },
    },
    { // bottom, bells beside the chest, elbows folded out under the hands
      t: 1,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 2, neck: -6 },
      ik: { wristR: { x: 56, y: 62, bend: 1 }, wristL: { x: 60, y: 64, bend: 1 }, ...stand(92, 96) },
    },
  ],
};

// Seated upright against a back pad, handles at chest height, press straight
// forward to lockout. Must be visible: the hands travelling horizontally away
// from the chest while the back stays on the pad. Side view, sagittal.
const MACHINE_CHEST_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [
    { type: "machine", x: 40, y: 92, w: 32, parts: ["seat", "backPad"], padH: 34 },
    { type: "barbell", side: "L", point: "hand", r: 4.5 },
    { type: "barbell", side: "R", point: "hand", r: 4.5, front: true },
  ],
  keys: [
    { // start, handles level with the chest, elbows behind the torso line
      t: 0,
      root: { x: 52, y: 86, rot: -6 },
      joints: { spine: 0, neck: -2 },
      ik: { wristR: { x: 68, y: 66, bend: 1 }, wristL: { x: 65, y: 68, bend: 1 }, ...stand(82, 78) },
    },
    { // lockout, arms long, chest still against the pad
      t: 1,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: -2, neck: -3 },
      ik: { wristR: { x: 84, y: 60, bend: 1 }, wristL: { x: 81, y: 62, bend: 1 }, ...stand(82, 78) },
    },
  ],
};

// Seated with the forearms on two pads, elbows at shoulder height, squeeze the
// pads together in front of the chest. Must be visible: the elbows travelling
// from wide to together. Suggested view is side; deviating to FRONT, because
// this closes across the midline in the transverse plane and side on an arm
// abducted to 90 points straight at the camera, which is the exact trap
// AUTHORING.md records for the doorway pec stretch.
const PEC_DECK = {
  view: "front",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.96, dy: 2 },
  props: [{ type: "machine", x: 50, y: 90, w: 40, parts: ["seat"] }],
  keys: [
    { // open, elbows wide out at shoulder height, forearms up on the pads
      t: 0,
      root: { x: 70, y: 84, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 95, shoulderL: 95, elbowR: 90, elbowL: 90 },
      ik: { ...stand(86, 54) },
    },
    { // squeezed, elbows dropped in until they nearly meet in front of the chest
      t: 1,
      root: { x: 70, y: 84, rot: 0 },
      joints: { spine: 3, neck: 0, shoulderR: -10, shoulderL: -10, elbowR: 150, elbowL: 150 },
      ik: { ...stand(86, 54) },
    },
  ],
};

// Standing between two high pulleys, arms wide at shoulder height, sweep both
// hands down and together in front of the hips. Must be visible: the arms
// closing from wide to together. Suggested view is side; deviating to FRONT,
// because the open position of any fly is an arm abducted to 90, which side on
// points straight at the camera (the doorway pec stretch trap). The two stacks
// left and right and the two cable lines are what make it a crossover.
const CABLE_FLY = {
  view: "front",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.88, dy: 2 },
  feet: FRONT_FEET,
  props: [
    { type: "cable", x: 10, top: 10, y0: 44, to: { side: "L", point: "hand" } },
    { type: "cable", x: 130, top: 10, y0: 44, to: { side: "R", point: "hand" }, front: true },
  ],
  keys: [
    { // open, arms wide at shoulder height, chest stretched
      t: 0,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 86, shoulderL: 86, elbowR: 22, elbowL: 22 },
      ik: { ...stand(78, 62) },
    },
    { // closed, hands crossing in front of the hips, elbows still soft
      t: 1,
      root: { x: 70, y: 62, rot: 0 },
      joints: { spine: 3, neck: 2, shoulderR: -12, shoulderL: -12, elbowR: 28, elbowL: 28 },
      ik: { ...stand(78, 62) },
    },
  ],
};

// Standing over two floor level pulleys, sweep both hands from beside the hips
// up and together to eye height. Must be visible: the hand climbing from hip to
// above the shoulder, the opposite arc to the plain cable fly. Side view.
const LOW_TO_HIGH_CABLE_FLY = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  props: [
    { type: "cable", x: 14, top: 98, y0: 101, to: { side: "L", point: "hand" } },
    { type: "cable", x: 14, top: 98, y0: 101, to: { side: "R", point: "hand" }, front: true },
  ],
  keys: [
    { // bottom, hands low and behind the hips
      t: 0,
      root: { x: 64, y: 61.4, rot: 2 },
      joints: { spine: 6, neck: -4 },
      ik: { wristR: { x: 42, y: 86, bend: 1 }, wristL: { x: 39, y: 88, bend: 1 }, ...stand(66, 61) },
    },
    { // top, hands together out in front at eye height
      t: 1,
      root: { x: 64, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: -8 },
      ik: { wristR: { x: 100, y: 22, bend: 1 }, wristL: { x: 97, y: 25, bend: 1 }, ...stand(66, 61) },
    },
  ],
};

// Supine on a bench set to about 35 degrees, dumbbells pressed perpendicular to
// the torso. Must be visible: the reclined torso angle, which is the only thing
// separating this from a flat press. Side view.
const INCLINE_DUMBBELL_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  fit: { k: 0.95, dy: 0 },
  props: [
    { type: "bench", x: 32, y: 89, w: 72, incline: -35 },
    { type: "dumbbell", side: "L", point: "hand", rot: 55, k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", rot: 55, k: 0.8, front: true },
  ],
  keys: [
    { // lockout, arms long square to the reclined torso
      t: 0,
      root: { x: 84, y: 90, rot: -55 },
      joints: { spine: 0, neck: -6 },
      ik: { wristR: { x: 83, y: 45, bend: 1 }, wristL: { x: 86, y: 48, bend: 1 }, ...stand(110, 104) },
    },
    { // bottom, bells beside the upper chest
      t: 1,
      root: { x: 84, y: 90, rot: -55 },
      joints: { spine: 2, neck: -8 },
      ik: { wristR: { x: 74, y: 58, bend: 1 }, wristL: { x: 77, y: 61, bend: 1 }, ...stand(110, 104) },
    },
  ],
};

// Supine head down on a declined bench, ankles hooked at the high end,
// dumbbells pressed perpendicular to the torso. Must be visible: the head being
// LOWER than the hips. Side view.
const DECLINE_DUMBBELL_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  fit: { k: 0.94, dy: 4 },
  props: [
    { type: "bench", x: 32, y: 78, w: 76, incline: 25 },
    { type: "roller", x: 116, y: 48, r: 5 },
    { type: "roller", x: 116, y: 66, r: 5 },
    { type: "dumbbell", side: "L", point: "hand", rot: 115, k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", rot: 115, k: 0.8, front: true },
  ],
  keys: [
    { // lockout, bells square to the declined torso
      t: 0,
      root: { x: 78, y: 64, rot: -115 },
      joints: { spine: 0, neck: 6 },
      ik: { wristR: { x: 38, y: 42, bend: 1 }, wristL: { x: 41, y: 45, bend: 1 }, ...pinFeet(112, 58, 108, 62) },
    },
    { // bottom, bells beside the lower chest
      t: 1,
      root: { x: 78, y: 64, rot: -115 },
      joints: { spine: 2, neck: 8 },
      ik: { wristR: { x: 45, y: 57, bend: 1 }, wristL: { x: 48, y: 60, bend: 1 }, ...pinFeet(112, 58, 108, 62) },
    },
  ],
};

// Same bench angle as the incline dumbbell press, one bar instead of two bells,
// so the hands travel together. Must be visible: the reclined torso plus the
// single disc, which side on is what a loaded bar looks like.
const INCLINE_BARBELL_PRESS = {
  ...INCLINE_DUMBBELL_PRESS,
  props: [
    { type: "bench", x: 32, y: 89, w: 72, incline: -35 },
    { type: "barbell", side: "R", point: "hand", r: 9, front: true },
  ],
  keys: [
    { // lockout above the upper chest
      t: 0,
      root: { x: 84, y: 90, rot: -55 },
      joints: { spine: 0, neck: -6 },
      ik: { wristR: { x: 83, y: 45, bend: 1 }, wristL: { x: 85, y: 47, bend: 1 }, ...stand(110, 104) },
    },
    { // bar down to the collarbone, elbows under the bar
      t: 1,
      root: { x: 84, y: 90, rot: -55 },
      joints: { spine: 2, neck: -8 },
      ik: { wristR: { x: 74, y: 58, bend: 1 }, wristL: { x: 76, y: 60, bend: 1 }, ...stand(110, 104) },
    },
  ],
};

// Same declined bench as the decline dumbbell press, one bar. Must be visible:
// the head lower than the hips, with the bar pressed square to that torso.
const DECLINE_BARBELL_PRESS = {
  ...DECLINE_DUMBBELL_PRESS,
  props: [
    { type: "bench", x: 32, y: 78, w: 76, incline: 25 },
    { type: "roller", x: 116, y: 48, r: 5 },
    { type: "roller", x: 116, y: 66, r: 5 },
    { type: "barbell", side: "R", point: "hand", r: 9, front: true },
  ],
  keys: [
    { // lockout over the lower chest
      t: 0,
      root: { x: 78, y: 64, rot: -115 },
      joints: { spine: 0, neck: 6 },
      ik: { wristR: { x: 38, y: 42, bend: 1 }, wristL: { x: 40, y: 44, bend: 1 }, ...pinFeet(112, 58, 108, 62) },
    },
    { // bar down to the lower chest, elbows under the bar
      t: 1,
      root: { x: 78, y: 64, rot: -115 },
      joints: { spine: 2, neck: 8 },
      ik: { wristR: { x: 45, y: 57, bend: 1 }, wristL: { x: 47, y: 59, bend: 1 }, ...pinFeet(112, 58, 108, 62) },
    },
  ],
};

// One end of a barbell wedged in a floor pivot, the loaded end held at the
// shoulder and pressed up and forward on the arc the bar allows. Must be
// visible: the angled bar running from the floor to the hand, which is the only
// thing that says landmine rather than a one arm dumbbell press. Side view.
// The bar is a `band` with zero slack (a straight line) plus a disc at the hand,
// because the loaded end of a landmine is the end you hold.
const LANDMINE_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [
    { type: "band", rest: 0, from: { x: 14, y: 116 }, to: { side: "R", point: "hand" } },
    { type: "barbell", side: "R", point: "hand", r: 8, front: true },
  ],
  keys: [
    { // racked, bar end at the front of the shoulder, elbow tucked in
      t: 0,
      root: { x: 56, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -2, shoulderL: 14, elbowL: 30 },
      ik: { wristR: { x: 78, y: 42, bend: 1 }, ...stand(58, 54) },
    },
    { // pressed, arm long up and forward, ribs down
      t: 1,
      root: { x: 56, y: 61.4, rot: 2 },
      joints: { spine: 0, neck: -8, shoulderL: 20, elbowL: 36 },
      ik: { wristR: { x: 88, y: 12, bend: 1 }, ...stand(58, 54) },
    },
  ],
};

// Supported on two parallel bars with the torso leaning forward and the knees
// tucked behind, lower until the shoulder drops below the elbow and press back
// up, with a plate hanging from a belt. Must be visible: the deep elbow bend
// with the whole body hanging between the bars, plus the hanging plate. Side view.
const WEIGHTED_DIP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.88, dy: 6 },
  props: [
    { type: "dipBars", x0: 44, x1: 100, y: 60 },
    { type: "barbell", side: "R", point: "hip", dx: -8, dy: 30, r: 7, front: true },
  ],
  keys: [
    { // top, arms locked out, body hanging tall between the bars
      t: 0,
      root: { x: 62, y: 52, rot: 14 },
      joints: { spine: 4, neck: -6, hipR: -15, kneeR: 70, ankleR: -28, hipL: -19, kneeL: 74, ankleL: -26 },
      ik: { wristR: { x: 70, y: 60, bend: 1 }, wristL: { x: 66, y: 60.5, bend: 1 } },
    },
    { // bottom, shoulder below the elbow, chest tipped forward over the bars
      t: 1,
      root: { x: 60, y: 66, rot: 20 },
      joints: { spine: 6, neck: -8, hipR: -15, kneeR: 75, ankleR: -28, hipL: -19, kneeL: 79, ankleL: -26 },
      ik: { wristR: { x: 70, y: 60, bend: 1 }, wristL: { x: 66, y: 60.5, bend: 1 } },
    },
  ],
};

// ------------------------------------------------------------- back, lats ---

// Seated under a high pulley with both hands close together on a V handle,
// pulled to the sternum with the torso upright and the elbows driving straight
// down the ribs. Must be visible: the hands moving from overhead to the chest.
// Side view. Honest caveat: side on, a narrow grip and a wide grip put the hands
// in the same place, so the only tell against Lat Pulldown is the upright torso
// and the single set of overlapping hands on one handle.
const CLOSE_GRIP_PULLDOWN = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [
    { type: "machine", x: 34, y: 95, w: 38, parts: ["seat", "thighPad"], padX: 62, padY: 76, padW: 22 },
    { type: "cable", x: 96, top: 14, y0: 44, to: { side: "R", point: "hand" }, front: true },
  ],
  keys: [
    { // arms long overhead, hands together on the handle
      t: 0,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: 0, neck: -6 },
      ik: {
        wristR: { x: 56, y: 25, bend: 1 }, wristL: { x: 55, y: 26, bend: 1 },
        ...stand(80, 76),
      },
    },
    { // handle to the sternum, torso still upright, elbows tight to the ribs
      t: 1,
      root: { x: 52, y: 86, rot: -6 },
      joints: { spine: -3, neck: -2 },
      ik: {
        wristR: { x: 60, y: 58, bend: 1 }, wristL: { x: 59, y: 59, bend: 1 },
        ...stand(80, 76),
      },
    },
  ],
};

// Sat with the legs out in front against a footplate, reach forward to a low
// pulley then pull the handle to the belly and sit tall. Must be visible: the
// torso swinging from a reach to upright while the elbow drives past the ribs.
// Side view.
const SEATED_CABLE_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  props: [
    { type: "bench", x: 22, y: 108, w: 44 },
    { type: "cable", x: 124, top: 96, y0: 99, to: { side: "R", point: "hand" }, front: true },
  ],
  keys: [
    { // reach, torso forward, arms long, lats stretched
      t: 0,
      root: { x: 44, y: 98, rot: 16 },
      joints: { spine: 12, neck: -6 },
      ik: {
        wristR: { x: 94, y: 80, bend: 1 }, wristL: { x: 91, y: 82, bend: 1 },
        ankleR: { x: 80, y: FLOOR, bend: -1 }, ankleL: { x: 76, y: FLOOR, bend: -1 },
      },
    },
    { // finish, sat tall, handle at the belly, elbows behind the torso
      t: 1,
      root: { x: 44, y: 98, rot: -6 },
      joints: { spine: -4, neck: -2 },
      ik: {
        wristR: { x: 62, y: 84, bend: 1 }, wristL: { x: 59, y: 86, bend: 1 },
        ankleR: { x: 80, y: FLOOR, bend: -1 }, ankleL: { x: 76, y: FLOOR, bend: -1 },
      },
    },
  ],
};

// Hinged over with one hand braced on a bench, the free arm rows a dumbbell
// from arm's length up to the ribs. Must be visible: the flat, near horizontal
// back with one arm hanging and the other supporting. Side view.
const DUMBBELL_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.92, dy: 4 },
  props: [
    { type: "bench", x: 94, y: 92, w: 40 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.85, front: true },
  ],
  keys: [
    { // bottom, the working arm hanging straight down under the shoulder
      t: 0,
      root: { x: 58, y: 61.4, rot: 80 },
      joints: { spine: -4, neck: -22 },
      ik: {
        wristR: { x: 78, y: 92, bend: 1 }, wristL: { x: 104, y: 88, bend: 1 },
        ankleR: { x: 52, y: FLOOR, bend: -1 }, ankleL: { x: 47, y: FLOOR, bend: -1 },
      },
    },
    { // top, elbow driven up past the ribs, back still flat
      t: 1,
      root: { x: 58, y: 61.4, rot: 80 },
      joints: { spine: -6, neck: -22 },
      ik: {
        wristR: { x: 72, y: 74, bend: 1 }, wristL: { x: 104, y: 88, bend: 1 },
        ankleR: { x: 52, y: FLOOR, bend: -1 }, ankleL: { x: 47, y: FLOOR, bend: -1 },
      },
    },
  ],
};

// Standing hinged slightly at a high pulley, elbows locked, sweep a straight bar
// in an arc from out in front of the face down to the thighs. Must be visible:
// the arm staying STRAIGHT through the whole arc, which is the only thing
// separating it from a pulldown. Side view.
const STRAIGHT_ARM_PULLDOWN = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [{ type: "cable", x: 120, top: 10, y0: 42, to: { side: "R", point: "hand" }, front: true }],
  keys: [
    { // top, arms long and high out in front, lats stretched
      t: 0,
      root: { x: 56, y: 61.4, rot: 4 },
      joints: { spine: 16, neck: -10 },
      ik: {
        wristR: { x: 92, y: 14, bend: 1 }, wristL: { x: 89, y: 17, bend: 1 },
        ...stand(58, 53),
      },
    },
    { // finish, arms still long, bar at the front of the thighs
      t: 1,
      root: { x: 56, y: 61.4, rot: 4 },
      joints: { spine: 20, neck: -6 },
      ik: {
        wristR: { x: 74, y: 70, bend: 1 }, wristL: { x: 71, y: 72, bend: 1 },
        ...stand(58, 53),
      },
    },
  ],
};

// Chest laid on an incline pad, both arms hanging straight down off the pad,
// rowing two dumbbells up to the ribs. Must be visible: the torso resting on
// the pad so nothing but the arms moves. Side view.
// Prone means root.rot POSITIVE, and here it is 55 rather than 90 because the
// pad is inclined, which puts the head up at +x and the feet back at -x.
const CHEST_SUPPORTED_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.95, dy: 2 },
  props: [
    { type: "bench", x: 31, y: 71, w: 70, incline: 35 },
    { type: "dumbbell", side: "L", point: "hand", rot: 90, k: 0.78 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.78, front: true },
  ],
  keys: [
    { // bottom, both arms hanging long under the shoulders
      t: 0,
      root: { x: 46, y: 66, rot: 55 },
      joints: { spine: 0, neck: -14 },
      ik: {
        wristR: { x: 72, y: 87, bend: 1 }, wristL: { x: 68, y: 88, bend: 1 },
        ankleR: { x: 38, y: FLOOR, bend: -1 }, ankleL: { x: 33, y: FLOOR, bend: -1 },
      },
    },
    { // top, elbows up behind the ribs, chest still pinned to the pad
      t: 1,
      root: { x: 46, y: 66, rot: 55 },
      joints: { spine: 0, neck: -14 },
      ik: {
        wristR: { x: 62, y: 70, bend: 1 }, wristL: { x: 58, y: 71, bend: 1 },
        ankleR: { x: 38, y: FLOOR, bend: -1 }, ankleL: { x: 33, y: FLOOR, bend: -1 },
      },
    },
  ],
};

// Hinged over a bar that is pinned to the floor at one end, pulling a handle at
// the loaded end up into the belly. Must be visible: the bar running down to a
// fixed point on the floor, which is the whole difference from a barbell row.
// Side view. The bar is a `band` with no slack plus the disc at the hand end.
const T_BAR_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [
    { type: "band", rest: 0, from: { x: 16, y: 116 }, to: { side: "R", point: "hand" } },
    { type: "barbell", side: "R", point: "hand", r: 9, front: true },
  ],
  keys: [
    { // bottom, arms long, the bar hanging at the end of the arc
      t: 0,
      root: { x: 66, y: 61.4, rot: 16 },
      joints: { spine: 30, neck: -14 },
      ik: {
        wristR: { x: 94, y: 78, bend: 1 }, wristL: { x: 91, y: 80, bend: 1 },
        ...stand(64, 59),
      },
    },
    { // top, handle into the belly, elbows behind the ribs, torso angle unchanged
      t: 1,
      root: { x: 66, y: 61.4, rot: 16 },
      joints: { spine: 30, neck: -14 },
      ik: {
        wristR: { x: 86, y: 62, bend: 1 }, wristL: { x: 83, y: 64, bend: 1 },
        ...stand(64, 59),
      },
    },
  ],
};

// Hinged to about 45 degrees with a free barbell, pulled from arm's length into
// the belly and lowered, the torso angle never changing. Must be visible: the
// fixed torso angle with the bar travelling to the body. Side view.
const BARBELL_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [{ type: "barbell", side: "R", point: "hand", r: 9.5, front: true }],
  keys: [
    { // bottom, bar hanging under the shoulders
      t: 0,
      root: { x: 64, y: 61.4, rot: 14 },
      joints: { spine: 32, neck: -14 },
      ik: {
        wristR: { x: 92, y: 78, bend: 1 }, wristL: { x: 89, y: 80, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // top, bar at the belly, elbows past the torso
      t: 1,
      root: { x: 64, y: 61.4, rot: 14 },
      joints: { spine: 32, neck: -14 },
      ik: {
        wristR: { x: 84, y: 62, bend: 1 }, wristL: { x: 81, y: 64, bend: 1 },
        ...stand(62, 57),
      },
    },
  ],
};

// The barbell row done from a dead stop with the back flat and PARALLEL to the
// floor, the bar returning to the plates every rep. Must be visible: the
// horizontal torso and the bar right down at the floor, which is the whole
// difference from a barbell row. Side view.
const PENDLAY_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.95, dy: 4 },
  props: [{ type: "barbell", side: "R", point: "hand", r: 11, front: true }],
  keys: [
    { // dead stop, bar on the plates, back flat and horizontal
      t: 0,
      root: { x: 62, y: 64, rot: 20 },
      joints: { spine: 48, neck: -30 },
      ik: {
        wristR: { x: 91.5, y: 92, bend: 1 }, wristL: { x: 88.5, y: 93, bend: 1 },
        ...stand(58, 54),
      },
    },
    { // pulled to the belly, back still horizontal
      t: 1,
      root: { x: 62, y: 64, rot: 20 },
      joints: { spine: 48, neck: -30 },
      ik: {
        wristR: { x: 88, y: 72, bend: 1 }, wristL: { x: 85, y: 73, bend: 1 },
        ...stand(58, 54),
      },
    },
  ],
};

// The pull-up with a plate hung from a belt between the legs. Imported rather
// than copied so the pull itself stays fixed in one place; the only edit is the
// plate. Must be visible: the chin travelling to the bar AND the hanging plate.
const WEIGHTED_PULL_UP = {
  ...PULL_UP,
  props: [
    ...PULL_UP.props,
    { type: "barbell", side: "R", point: "hip", dx: -3, dy: 30, r: 7.5, front: true },
  ],
};

// ------------------------------------------------- traps and upper back -----

// Seen from the front a barbell is a BAR, not the disc the side view gets, so
// it is drawn as a zero slack band between the two hands with a plate at each
// end. `front` false puts the whole bar behind the figure, which is how a
// behind-the-back hold reads.
const frontBar = (front) => ([
  { type: "band", rest: 0, from: { side: "L", point: "hand" }, to: { side: "R", point: "hand" }, front },
  { type: "barbell", side: "L", point: "hand", r: 7, front },
  { type: "barbell", side: "R", point: "hand", r: 7, front },
]);

// Standing with a weight hanging at arm's length, lift the shoulders straight up
// toward the ears and let them down. Must be visible: the load hanging dead
// straight from a still arm, so nothing but the shoulder girdle moves. Front
// view, because a shrug is symmetric across the midline.
// Known limit, and the honest reason this is the weakest card in the file: the
// rig has a fixed shoulder girdle, so the shoulders cannot actually rise. The
// rep is carried by the chest lifting, the chin coming up and the knees
// softening at the bottom. The implement is what identifies the exercise.
const DUMBBELL_SHRUG = {
  view: "front",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  feet: FRONT_FEET,
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 90, k: 0.85 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.85, front: true },
  ],
  keys: [
    { // bottom, shoulders let down, knees soft, chin level
      t: 0,
      root: { x: 70, y: 62.6, rot: 0 },
      joints: { spine: 3, neck: 5, shoulderR: 2, shoulderL: 2, elbowR: 4, elbowL: 4 },
      ik: { ...stand(78, 62) },
    },
    { // top, chest lifted and chin up, arms still dead straight
      t: 1,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: -3, neck: -6, shoulderR: -2, shoulderL: -2, elbowR: 8, elbowL: 8 },
      ik: { ...stand(78, 62) },
    },
  ],
};

// The same shrug with a barbell held in front of the thighs. Must be visible:
// the bar IN FRONT of the legs, which is the whole difference from the
// behind-the-back version on the next card. Front view.
const BARBELL_SHRUG = {
  ...DUMBBELL_SHRUG,
  props: frontBar(true),
  keys: [
    { // bottom, bar hanging at the thighs on a shoulder width grip
      t: 0,
      root: { x: 70, y: 62.6, rot: 0 },
      joints: { spine: 3, neck: 5, shoulderR: 12, shoulderL: 12, elbowR: 4, elbowL: 4 },
      ik: { ...stand(78, 62) },
    },
    { // top, chest lifted and chin up, arms still dead straight
      t: 1,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: -3, neck: -6, shoulderR: 11, shoulderL: 11, elbowR: 6, elbowL: 6 },
      ik: { ...stand(78, 62) },
    },
  ],
};

// The same shrug with the bar held behind the hips. Must be visible: the bar
// passing BEHIND the legs, so the thighs occlude the middle of it. Front view.
const BEHIND_THE_BACK_SHRUG = {
  ...BARBELL_SHRUG,
  props: frontBar(false),
};

// Standing at a high pulley, pull a rope to eye level with the elbows staying
// high and travelling back past the shoulders. Must be visible: the hand
// arriving at face height with the elbow up, not at the chest like a row.
// Suggested view is back; deviating to SIDE, because from behind the machine is
// on the far side of the figure and the start (both arms reaching away from the
// camera) foreshortens to nothing. Side on, the full travel from arm's length
// to the face is visible and so is the pulley it comes from.
const FACE_PULL = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [{ type: "cable", x: 122, top: 18, y0: 48, to: { side: "R", point: "hand" }, front: true }],
  keys: [
    { // start, arms long out in front at eye height
      t: 0,
      root: { x: 58, y: 61.4, rot: 2 },
      joints: { spine: 6, neck: -4 },
      ik: {
        wristR: { x: 96, y: 30, bend: 1 }, wristL: { x: 93, y: 33, bend: 1 },
        ...stand(60, 55),
      },
    },
    { // finish, hands at the face, elbows high
      t: 1,
      root: { x: 58, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: -6 },
      ik: {
        wristR: { x: 76, y: 24, bend: 1 }, wristL: { x: 73, y: 27, bend: 1 },
        ...stand(60, 55),
      },
    },
  ],
};

// Two dumbbells swept out to the sides until the arms are level, with a soft
// elbow. Must be visible: the arms opening wide across the midline. Back view,
// the front view with facing "away", because this is rear delt work and the
// figure should read as seen from behind.
// Known limit: the rig cannot hinge the torso toward the camera, so the figure
// stands rather than bending over. What separates this from a lateral raise on
// the card is the facing, the bent elbow and the sweep finishing slightly below
// shoulder height.
const REAR_DELT_FLY = {
  view: "front",
  facing: "away",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.9, dy: 2 },
  feet: FRONT_FEET,
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 90, k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.8, front: true },
  ],
  keys: [
    { // bottom, bells hanging together under the chest, elbows soft
      t: 0,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 6, shoulderL: 6, elbowR: 24, elbowL: 24 },
      ik: { ...stand(78, 62) },
    },
    { // top, arms swept wide and level, shoulder blades squeezed
      t: 1,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: -2, neck: -2, shoulderR: 86, shoulderL: 86, elbowR: 26, elbowL: 26 },
      ik: { ...stand(78, 62) },
    },
  ],
};

// The rear delt fly done seated on a machine, chest against the pad, sweeping
// two handles out and back. Must be visible: the same wide sweep, seated.
// Suggested view is side; deviating to BACK for the same reason as the pec deck,
// the sweep is across the midline and side on it points at the camera.
const REVERSE_PEC_DECK = {
  view: "front",
  facing: "away",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.92, dy: 2 },
  props: [
    { type: "machine", x: 50, y: 90, w: 40, parts: ["seat"] },
    { type: "barbell", side: "L", point: "hand", r: 4 },
    { type: "barbell", side: "R", point: "hand", r: 4, front: true },
  ],
  keys: [
    { // start, handles together in front, elbows soft
      t: 0,
      root: { x: 70, y: 84, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 20, shoulderL: 20, elbowR: 30, elbowL: 30 },
      ik: { ...stand(86, 54) },
    },
    { // finish, arms swept wide and level with the shoulders
      t: 1,
      root: { x: 70, y: 84, rot: 0 },
      joints: { spine: -2, neck: 0, shoulderR: 88, shoulderL: 88, elbowR: 28, elbowL: 28 },
      ik: { ...stand(86, 54) },
    },
  ],
};

// A bar pulled straight up the front of the body from the thighs to the
// collarbone, the elbow leading and finishing above the hand. Must be visible:
// the bar staying close to the body all the way to chin height with the elbow
// high. Suggested view is front; deviating to SIDE. In front view a hand
// travelling up the midline passes within a couple of units of the shoulder
// joint, and the arm solves through that singularity with the elbow snapping
// from outside to inside, which no amount of tuning fixes. Side on the bar path
// hugging the body and the high leading elbow both read, and the disc is the
// honest side view of a loaded bar.
const UPRIGHT_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [{ type: "barbell", side: "R", point: "wrist", dx: 2, dy: 1, r: 7.5, front: true }],
  keys: [
    { // bottom, bar hanging at the thighs, arms straight
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: 4, neck: 0,
        shoulderR: 4, elbowR: 6, shoulderL: 2, elbowL: 8,
      },
      ik: { ...stand(62, 57) },
    },
    { // top, bar at the collarbone with the elbow up in front of the shoulder
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: -2, neck: -16,
        shoulderR: 96, elbowR: 122, shoulderL: 92, elbowL: 120,
      },
      ik: { ...stand(62, 57) },
    },
  ],
};

// A wide grip bar pulled explosively from below the knee to chest height as the
// body extends from a hinge to standing tall. Must be visible: the body going
// from bent over to fully extended while the bar stays close and climbs. Side view.
const SNATCH_GRIP_HIGH_PULL = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [{ type: "barbell", side: "R", point: "hand", r: 9.5, front: true }],
  keys: [
    { // start, hinged over with the bar hanging at the knee, arms long
      t: 0,
      root: { x: 62, y: 70, rot: 14 },
      joints: { spine: 34, neck: -18 },
      ik: {
        wristR: { x: 88, y: 88, bend: 1 }, wristL: { x: 85, y: 89, bend: 1 },
        ...stand(62, 58),
      },
    },
    { // finish, stood tall and extended, bar pulled to the chest, elbows high
      t: 1,
      root: { x: 64, y: 61.4, rot: -4 },
      joints: { spine: -6, neck: -4 },
      ik: {
        wristR: { x: 79, y: 45, bend: 1 }, wristL: { x: 76, y: 47, bend: 1 },
        ...stand(62, 58),
      },
    },
  ],
};

// ------------------------------------------------------------- shoulders ---

// Standing with a dumbbell in each hand, arms swept out to the sides until they
// are level with the shoulders, elbows nearly straight. Must be visible: the
// arms opening wide to a T. Front view, because that sweep is lateral and side
// on it points at the camera.
const LATERAL_RAISE = {
  view: "front",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  fit: { k: 0.86, dy: 2 },
  feet: FRONT_FEET,
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 90, k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.8, front: true },
  ],
  keys: [
    { // bottom, bells beside the thighs, arms long
      t: 0,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 4, shoulderL: 4, elbowR: 6, elbowL: 6 },
      ik: { ...stand(78, 62) },
    },
    { // top, arms out level with the shoulders, elbows only softly bent
      t: 1,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 88, shoulderL: 88, elbowR: 8, elbowL: 8 },
      ik: { ...stand(78, 62) },
    },
  ],
};

// The lateral raise done one arm at a time on a low pulley set on the opposite
// side, so the cable crosses in front of the body. Must be visible: the single
// working arm and the line of pull coming from the far side, which is the whole
// difference from the dumbbell version. Front view.
const CABLE_LATERAL_RAISE = {
  view: "front",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  fit: { k: 0.86, dy: 2 },
  farSide: "L",
  feet: FRONT_FEET,
  props: [{ type: "cable", x: 10, top: 104, y0: 107, to: { side: "R", point: "hand" }, front: true }],
  keys: [
    { // bottom, working hand in front of the far thigh, cable slack taken up
      t: 0,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 2, shoulderL: 6, elbowR: 6, elbowL: 10 },
      ik: { ...stand(78, 62) },
    },
    { // top, working arm level with the shoulder, the other hanging quiet
      t: 1,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: -2, neck: 0, shoulderR: 88, shoulderL: 6, elbowR: 8, elbowL: 10 },
      ik: { ...stand(78, 62) },
    },
  ],
};

// Standing, a dumbbell lifted straight out in front on a long arm until it is
// level with the shoulder. Must be visible: the arm staying straight through a
// forward arc that stops at shoulder height. Side view, sagittal.
const FRONT_RAISE = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 0, k: 0.78 },
    { type: "dumbbell", side: "R", point: "hand", rot: 0, k: 0.78, front: true },
  ],
  keys: [
    { // bottom, bells resting against the thighs
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: 0 },
      ik: {
        wristR: { x: 68, y: 70, bend: 1 }, wristL: { x: 65, y: 72, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // top, arm long and level, stopping at shoulder height
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 0, neck: -2 },
      ik: {
        wristR: { x: 98, y: 30, bend: 1 }, wristL: { x: 95, y: 33, bend: 1 },
        ...stand(62, 57),
      },
    },
  ],
};

// Seated against a back pad, handles at the shoulders, pressed straight
// overhead. Must be visible: the hands travelling vertically from the shoulder
// to a lockout above the head. Side view.
const MACHINE_SHOULDER_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.92, dy: 6 },
  props: [
    { type: "machine", x: 40, y: 92, w: 32, parts: ["seat", "backPad"], padH: 34 },
    { type: "barbell", side: "L", point: "hand", r: 4.5 },
    { type: "barbell", side: "R", point: "hand", r: 4.5, front: true },
  ],
  keys: [
    { // start, handles level with the shoulders, elbows under the hands
      t: 0,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: 0, neck: -2 },
      ik: { wristR: { x: 68, y: 50, bend: 1 }, wristL: { x: 65, y: 52, bend: 1 }, ...stand(82, 78) },
    },
    { // lockout, arms long overhead, back still on the pad
      t: 1,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: -2, neck: -4 },
      ik: { wristR: { x: 58, y: 22, bend: 1 }, wristL: { x: 55, y: 24, bend: 1 }, ...stand(82, 78) },
    },
  ],
};

// The same press with two dumbbells on an upright bench rather than a machine.
// Must be visible: the near vertical back pad and two separate bells. Side view.
const SEATED_DUMBBELL_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.92, dy: 6 },
  props: [
    { type: "bench", x: 36, y: 96, w: 36 },
    { type: "bench", x: 20, y: 70, w: 44, incline: -78 },
    { type: "dumbbell", side: "L", point: "hand", rot: 0, k: 0.78 },
    { type: "dumbbell", side: "R", point: "hand", rot: 0, k: 0.78, front: true },
  ],
  keys: [
    { // start, bells at the shoulders, elbows under the hands
      t: 0,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: 0, neck: -2 },
      ik: { wristR: { x: 68, y: 50, bend: 1 }, wristL: { x: 64, y: 53, bend: 1 }, ...stand(82, 78) },
    },
    { // lockout, bells nearly touching over the head
      t: 1,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: -2, neck: -4 },
      ik: { wristR: { x: 58, y: 22, bend: 1 }, wristL: { x: 55, y: 25, bend: 1 }, ...stand(82, 78) },
    },
  ],
};

// Standing, bells racked beside the head with the elbows wide, pressed until the
// arms are long overhead. Must be visible: the elbows wide at the start closing
// to arms straight up. Front view, because that is where the width of the rack
// position can be seen at all.
const DUMBBELL_SHOULDER_PRESS = {
  view: "front",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.78, dy: 14 },
  feet: FRONT_FEET,
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 90, k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.8, front: true },
  ],
  keys: [
    { // racked, elbows out level with the shoulders, forearms vertical
      t: 0,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 88, shoulderL: 88, elbowR: 90, elbowL: 90 },
      ik: { ...stand(78, 62) },
    },
    { // lockout, arms long overhead, bells close together
      t: 1,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: -2, neck: -2, shoulderR: 168, shoulderL: 168, elbowR: 6, elbowL: 6 },
      ik: { ...stand(78, 62) },
    },
  ],
};

// Bells start in front of the chest with the elbows down and the palms in, then
// rotate out and press overhead. Must be visible: the start with the elbows IN
// FRONT of the body rather than out to the sides, which is what separates it
// from a straight dumbbell press. Suggested view is front; deviating to SIDE,
// because in front view the racked elbows are in front of the torso and
// foreshorten to nothing, while side on that forward elbow is the whole story.
// The palm rotation itself is not drawable on a rig with no forearm twist.
const ARNOLD_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.84, dy: 10 },
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 0, k: 0.78 },
    { type: "dumbbell", side: "R", point: "hand", rot: 0, k: 0.78, front: true },
  ],
  keys: [
    { // start, elbows down and forward, bells in front of the chin
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: 2, neck: -2,
        shoulderR: 34, elbowR: 132, shoulderL: 31, elbowL: 130,
      },
      ik: { ...stand(62, 57) },
    },
    { // lockout, arms long overhead
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: -2, neck: -4,
        shoulderR: 176, elbowR: 6, shoulderL: 173, elbowL: 8,
      },
      ik: { ...stand(62, 57) },
    },
  ],
};

// Three positions in one: bells at the thighs, pulled up to a high elbow with
// the forearms hanging, then rotated up and pressed overhead. Must be visible:
// the middle position, because a Cuban press without it is just a press. Side
// view, and authored with three keyframes for that reason.
const CUBAN_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.6,
  breath: 0.2,
  fit: { k: 0.84, dy: 10 },
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 0, k: 0.72 },
    { type: "dumbbell", side: "R", point: "hand", rot: 0, k: 0.72, front: true },
  ],
  keys: [
    { // bells at the thighs, arms long
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: 2, neck: 0,
        shoulderR: 8, elbowR: 14, shoulderL: 6, elbowL: 16,
      },
      ik: { ...stand(62, 57) },
    },
    { // elbows pulled up high with the forearms still hanging down
      t: 0.45,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: 0, neck: -2,
        shoulderR: 88, elbowR: 96, shoulderL: 85, elbowL: 94,
      },
      ik: { ...stand(62, 57) },
    },
    { // rotated up and pressed to lockout
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: -2, neck: -4,
        shoulderR: 176, elbowR: 8, shoulderL: 173, elbowL: 10,
      },
      ik: { ...stand(62, 57) },
    },
  ],
};

// Standing with a barbell at the collarbone, pressed overhead with the legs
// locked and the body braced. Must be visible: the bar path going straight up
// past the face with NO help from the legs, which is what the push press next to
// it does differently. Side view.
const OVERHEAD_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.84, dy: 10 },
  props: [{ type: "barbell", side: "R", point: "hand", r: 9.5, front: true }],
  keys: [
    { // racked, bar at the collarbone, elbows under it, knees locked
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: 0 },
      ik: {
        wristR: { x: 74, y: 44, bend: 1 }, wristL: { x: 71, y: 46, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // lockout, bar over the middle of the body, ribs down
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: -3, neck: -6 },
      ik: {
        wristR: { x: 66, y: 4, bend: 1 }, wristL: { x: 63, y: 6, bend: 1 },
        ...stand(62, 57),
      },
    },
  ],
};

// The overhead press started with a dip and drive of the legs. Must be visible:
// the KNEE BEND at the bottom, which is the only difference from the strict
// press. Side view.
const PUSH_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.84, dy: 10 },
  props: [{ type: "barbell", side: "R", point: "hand", r: 9.5, front: true }],
  keys: [
    { // dip, knees bent, torso upright, bar still at the collarbone
      t: 0,
      root: { x: 60, y: 68, rot: 2 },
      joints: { spine: 2, neck: 0 },
      ik: {
        wristR: { x: 74, y: 50, bend: 1 }, wristL: { x: 71, y: 52, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // drive, legs straight and the bar punched to lockout
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: -3, neck: -6 },
      ik: {
        wristR: { x: 66, y: 4, bend: 1 }, wristL: { x: 63, y: 6, bend: 1 },
        ...stand(62, 57),
      },
    },
  ],
};

// ---------------------------------------------------------------- biceps ---

// Every standing curl is the same two poses: arms long at the thighs, then the
// forearm folded up to the chest with the elbow staying pinned at the side.
// What changes between the nine is the implement and where the elbow is braced,
// so the pose lives here once and the variants set their own props.
const standingCurlKeys = [
  { // bottom, arms long, elbows at the sides
    t: 0,
    root: { x: 60, y: 61.4, rot: 2 },
    joints: { spine: 2, neck: 0 },
    ik: {
      wristR: { x: 66, y: 71, bend: 1 }, wristL: { x: 63, y: 73, bend: 1 },
      ...stand(62, 57),
    },
  },
  { // top, forearm folded to the chest, elbow still under the shoulder
    t: 1,
    root: { x: 60, y: 61.4, rot: 2 },
    joints: { spine: 0, neck: -2 },
    ik: {
      wristR: { x: 76, y: 46, bend: 1 }, wristL: { x: 73, y: 48, bend: 1 },
      ...stand(62, 57),
    },
  },
];

// Standing, a dumbbell in each hand curled from the thigh to the chest with the
// elbow pinned. Must be visible: the elbow staying put while only the forearm
// swings. Side view, sagittal. The bell is drawn across the hand (rot 90) for
// the supinated grip, which is what separates it from the hammer curl.
const DUMBBELL_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 90, k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.8, front: true },
  ],
  keys: standingCurlKeys,
};

// The same curl with a neutral, thumbs up grip. Must be visible: the bell IN
// LINE with the forearm rather than across it, which is the whole difference.
// Side view.
const HAMMER_CURL = {
  ...DUMBBELL_CURL,
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 0, k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", rot: 0, k: 0.8, front: true },
  ],
};

// The same curl against a low pulley, so the load pulls down and forward rather
// than straight down. Must be visible: the cable line from the floor pulley to
// the hand staying taut through the arc. Side view.
const CABLE_CURL = {
  ...DUMBBELL_CURL,
  props: [{ type: "cable", x: 116, top: 100, y0: 103, to: { side: "R", point: "hand" }, front: true }],
};

// The same curl with a barbell, both hands on one bar. Must be visible: the
// single disc, which side on is what a loaded bar looks like. Side view.
const BARBELL_CURL = {
  ...DUMBBELL_CURL,
  props: [{ type: "barbell", side: "R", point: "hand", r: 9.5, front: true }],
};

// The barbell curl on a cambered bar, which lets the wrists sit half turned in.
// Must be visible: the same curl arc. Side view. Honest caveat: side on, a
// cambered bar and a straight bar are the same disc, so the only difference
// from Barbell Curl on the card is the smaller plate and the angled wrist.
const EZ_BAR_CURL = {
  ...DUMBBELL_CURL,
  props: [{ type: "barbell", side: "R", point: "hand", r: 8, front: true }],
  keys: [
    { ...standingCurlKeys[0], joints: { spine: 2, neck: 0, wristR: -14, wristL: -14 } },
    { ...standingCurlKeys[1], joints: { spine: 0, neck: -2, wristR: -14, wristL: -14 } },
  ],
};

// Seated and hinged forward with the working elbow braced against the inside of
// the thigh, one dumbbell curled up to the shoulder. Must be visible: the elbow
// jammed into the thigh, which is the point of the exercise. Side view.
const CONCENTRATION_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [
    { type: "bench", x: 30, y: 96, w: 44 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.85, front: true },
  ],
  keys: [
    { // bottom, working arm hanging long inside the knee
      t: 0,
      root: { x: 46, y: 88, rot: 18 },
      joints: { spine: 22, neck: -18 },
      ik: {
        wristR: { x: 84, y: 100, bend: 1 }, wristL: { x: 60, y: 96, bend: 1 },
        ankleR: { x: 76, y: FLOOR, bend: -1 }, ankleL: { x: 70, y: FLOOR, bend: -1 },
      },
    },
    { // top, bell curled to the shoulder, elbow never leaving the thigh
      t: 1,
      root: { x: 46, y: 88, rot: 18 },
      joints: { spine: 22, neck: -14 },
      ik: {
        wristR: { x: 78, y: 74, bend: 1 }, wristL: { x: 60, y: 96, bend: 1 },
        ankleR: { x: 76, y: FLOOR, bend: -1 }, ankleL: { x: 70, y: FLOOR, bend: -1 },
      },
    },
  ],
};

// Seated with the upper arms flat on a pad angled away from the chest, curling
// the bar up off a fully straight arm. Must be visible: the pad under the upper
// arm, which is what stops the elbow moving. Side view.
const PREACHER_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [
    { type: "bench", x: 26, y: 96, w: 34 },
    { type: "bench", x: 48, y: 73.3, w: 42, incline: -43 },
    { type: "barbell", side: "R", point: "hand", r: 8, front: true },
  ],
  keys: [
    { // bottom, arms straight down the pad
      t: 0,
      root: { x: 44, y: 88, rot: 6 },
      joints: {
        spine: 10, neck: -6,
        shoulderR: 55, elbowR: 20, shoulderL: 53, elbowL: 22,
      },
      ik: { ankleR: { x: 76, y: FLOOR, bend: -1 }, ankleL: { x: 70, y: FLOOR, bend: -1 } },
    },
    { // top, forearms folded up, upper arms still flat on the pad
      t: 1,
      root: { x: 44, y: 88, rot: 6 },
      joints: {
        spine: 10, neck: -2,
        shoulderR: 55, elbowR: 135, shoulderL: 53, elbowL: 133,
      },
      ik: { ankleR: { x: 76, y: FLOOR, bend: -1 }, ankleL: { x: 70, y: FLOOR, bend: -1 } },
    },
  ],
};

// Lying back on a bench set to about fifty five degrees so the arms hang BEHIND
// the line of the torso, then curling from that stretched position. Must be
// visible: the reclined torso with the arms hanging back and down. Side view.
const INCLINE_DUMBBELL_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.95, dy: 0 },
  props: [
    { type: "bench", x: 32, y: 81, w: 72, incline: -46 },
    { type: "dumbbell", side: "L", point: "hand", rot: 90, k: 0.78 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.78, front: true },
  ],
  keys: [
    { // bottom, arms hanging straight down behind the line of the torso
      t: 0,
      root: { x: 84, y: 84, rot: -44 },
      joints: { spine: 0, neck: -4 },
      ik: {
        wristR: { x: 74, y: 100, bend: 1 }, wristL: { x: 77, y: 101, bend: 1 },
        ...stand(110, 104),
      },
    },
    { // top, forearms curled up, upper arms still hanging back
      t: 1,
      root: { x: 84, y: 84, rot: -44 },
      joints: { spine: 0, neck: -6 },
      ik: {
        wristR: { x: 82, y: 80, bend: 1 }, wristL: { x: 85, y: 81, bend: 1 },
        ...stand(110, 104),
      },
    },
  ],
};

// Chest down on an incline pad with the arms hanging straight below the
// shoulders, curling up in front of the face. Must be visible: the body face
// down on the pad with the arms hanging free of it. Side view.
const SPIDER_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.95, dy: 2 },
  props: [
    { type: "bench", x: 31, y: 71, w: 70, incline: 35 },
    { type: "dumbbell", side: "L", point: "hand", rot: 90, k: 0.78 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.78, front: true },
  ],
  keys: [
    { // bottom, arms hanging dead straight under the shoulders
      t: 0,
      root: { x: 46, y: 66, rot: 55 },
      joints: { spine: 0, neck: -14 },
      ik: {
        wristR: { x: 70, y: 89, bend: 1 }, wristL: { x: 66, y: 90, bend: 1 },
        ankleR: { x: 38, y: FLOOR, bend: -1 }, ankleL: { x: 33, y: FLOOR, bend: -1 },
      },
    },
    { // top, bells curled up in front of the face
      t: 1,
      root: { x: 46, y: 66, rot: 55 },
      joints: { spine: 0, neck: -14 },
      ik: {
        wristR: { x: 80, y: 66, bend: 1 }, wristL: { x: 76, y: 67, bend: 1 },
        ankleR: { x: 38, y: FLOOR, bend: -1 }, ankleL: { x: 33, y: FLOOR, bend: -1 },
      },
    },
  ],
};

// --------------------------------------------------------------- triceps ---

// Standing at a high pulley with the elbows pinned at the ribs, the forearm
// swings from about ninety degrees down to a straight arm. Must be visible: the
// elbow staying still while only the forearm moves, and the cable coming from
// above. Side view, sagittal.
const TRICEPS_PUSHDOWN = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [
    { type: "cable", x: 78, top: 12, y0: 42, to: { side: "R", point: "hand" }, front: true },
    { type: "barbell", side: "R", point: "hand", r: 4.5, front: true },
  ],
  keys: [
    { // start, forearm up at about ninety, elbow at the rib
      t: 0,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4 },
      ik: {
        wristR: { x: 60, y: 54, bend: 1 }, wristL: { x: 57, y: 56, bend: 1 },
        ...stand(48, 43),
      },
    },
    { // lockout, arm straight down, elbow unmoved
      t: 1,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4 },
      ik: {
        wristR: { x: 54, y: 71, bend: 1 }, wristL: { x: 51, y: 73, bend: 1 },
        ...stand(48, 43),
      },
    },
  ],
};

// The pushdown on a rope, which lets the hands split and turn out at the bottom.
// Must be visible: the same fixed elbow, with the wrists breaking outward at
// lockout. Side view. Honest caveat: side on a rope and a straight bar put the
// hands in the same place, so the split wrists and the missing bar end are the
// only difference from Triceps Pushdown.
const ROPE_PUSHDOWN = {
  ...TRICEPS_PUSHDOWN,
  props: [{ type: "cable", x: 78, top: 12, y0: 42, to: { side: "R", point: "hand" }, front: true }],
  keys: [
    { // start, forearms up, hands together on the rope
      t: 0,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4, wristR: 0, wristL: 0 },
      ik: {
        wristR: { x: 60, y: 54, bend: 1 }, wristL: { x: 57, y: 56, bend: 1 },
        ...stand(48, 43),
      },
    },
    { // lockout, hands driven apart and the wrists turned out
      t: 1,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4, wristR: 26, wristL: -22 },
      ik: {
        wristR: { x: 56, y: 72, bend: 1 }, wristL: { x: 50, y: 72, bend: 1 },
        ...stand(48, 43),
      },
    },
  ],
};

// Standing with a dumbbell held in both hands behind the head, elbows pointing
// up, the forearm straightens overhead. Must be visible: the elbows staying
// high and still while the hands travel from behind the head to lockout.
// Side view.
const OVERHEAD_TRICEPS_EXTENSION = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.84, dy: 10 },
  props: [{ type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.85, front: true }],
  keys: [
    { // bottom, bell behind the head, elbows up
      t: 0,
      root: { x: 58, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: -2 },
      ik: {
        wristR: { x: 50, y: 28, bend: 1 }, wristL: { x: 47, y: 25, bend: 1 },
        ...stand(60, 55),
      },
    },
    { // lockout, arms long overhead, elbows in the same place
      t: 1,
      root: { x: 58, y: 61.4, rot: 2 },
      joints: { spine: 0, neck: -4 },
      ik: {
        wristR: { x: 62, y: -2, bend: 1 }, wristL: { x: 59, y: -1, bend: 1 },
        ...stand(60, 55),
      },
    },
  ],
};

// Hinged over with one hand braced on a bench, the working upper arm held
// horizontal along the ribs while the forearm swings back to straight. Must be
// visible: the upper arm NOT moving, parallel to the torso, while the forearm
// opens. Side view.
const TRICEPS_KICKBACK = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  fit: { k: 0.95, dy: 4 },
  props: [
    { type: "bench", x: 84, y: 80, w: 40 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.8, front: true },
  ],
  keys: [
    { // start, upper arm back and level, forearm hanging straight down
      t: 0,
      root: { x: 62, y: 61.4, rot: 14 },
      joints: { spine: 34, neck: -18, shoulderR: -138, elbowR: 95 },
      ik: { wristL: { x: 96, y: 76, bend: 1 }, ...stand(60, 55) },
    },
    { // finish, forearm swung back to a straight arm, upper arm unmoved
      t: 1,
      root: { x: 62, y: 61.4, rot: 14 },
      joints: { spine: 34, neck: -18, shoulderR: -138, elbowR: 6 },
      ik: { wristL: { x: 96, y: 76, bend: 1 }, ...stand(60, 55) },
    },
  ],
};

// Hands behind on the edge of a bench with the legs stretched out in front, the
// hips sink straight down and press back up. Must be visible: the hands BEHIND
// the body on the bench and the hips dropping in front of it. Side view.
const BENCH_DIP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.94, dy: 2 },
  props: [{ type: "bench", x: 14, y: 82, w: 36 }],
  keys: [
    { // top, arms straight, hips up level with the bench edge
      t: 0,
      root: { x: 59.6, y: 70.2, rot: -4 },
      joints: { spine: 0, neck: -2 },
      ik: {
        wristR: { x: 46, y: 78, bend: 1 }, wristL: { x: 42, y: 78.5, bend: 1 },
        ankleR: { x: 88, y: FLOOR, bend: -1 }, ankleL: { x: 82, y: FLOOR, bend: -1 },
      },
    },
    { // bottom, hips dropped in front of the bench, elbows folded back.
      // Deliberately short of a full dip: past this the shoulder goes further
      // into extension than a shoulder actually does, which is also why this
      // exercise has the reputation it has.
      t: 1,
      root: { x: 50.1, y: 81.3, rot: -6 },
      joints: { spine: 0, neck: -4 },
      ik: {
        wristR: { x: 46, y: 78, bend: 1 }, wristL: { x: 42, y: 78.5, bend: 1 },
        ankleR: { x: 88, y: FLOOR, bend: -1 }, ankleL: { x: 82, y: FLOOR, bend: -1 },
      },
    },
  ],
};

// Supine on a flat bench with the upper arms held still and angled slightly back
// over the head, the bar lowered past the forehead on a bent elbow. Must be
// visible: the upper arm staying put while the bar swings back past the head,
// which is what separates it from a bench press. Side view, root.rot -90 supine.
// The bar stops just short of the forehead on purpose: at the true bottom the
// disc lands on the skull and the whole card turns to mush.
const SKULL_CRUSHER = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  props: [
    { type: "bench", x: 26, y: 92, w: 78 },
    { type: "barbell", side: "R", point: "hand", r: 8, front: true },
  ],
  keys: [
    { // lockout, arms long over the chest
      t: 0,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 0, neck: -4 },
      ik: { wristR: { x: 58, y: 45, bend: 1 }, wristL: { x: 61, y: 46, bend: 1 }, ...stand(92, 96) },
    },
    { // bottom, elbow folded, bar swung back to just above the forehead
      t: 1,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 0, neck: -6 },
      ik: { wristR: { x: 46, y: 70, bend: 1 }, wristL: { x: 49, y: 71, bend: 1 }, ...stand(92, 96) },
    },
  ],
};

// The bench press with the hands inside shoulder width and the elbows dragged
// along the ribs, the bar touching lower on the chest. Must be visible: the bar
// path angling toward the feet rather than straight down. Side view. Honest
// caveat: side on this is close to Barbell Bench Press, and the lower touch
// point plus the tighter elbow are the whole difference.
const CLOSE_GRIP_BENCH_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  props: [
    { type: "bench", x: 26, y: 92, w: 78 },
    { type: "barbell", side: "R", point: "hand", r: 9.5, front: true },
  ],
  keys: [
    { // lockout, bar over the lower chest
      t: 0,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 0, neck: -4 },
      ik: { wristR: { x: 62, y: 46, bend: 1 }, wristL: { x: 64, y: 47, bend: 1 }, ...stand(92, 96) },
    },
    { // bottom, bar low on the sternum, elbows tucked toward the feet
      t: 1,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 2, neck: -6 },
      ik: { wristR: { x: 66, y: 68, bend: 1 }, wristL: { x: 68, y: 69, bend: 1 }, ...stand(92, 96) },
    },
  ],
};

// ---------------------------------------------------- forearms and grip -----

// Seated with the forearms flat along the thighs and the hands hanging past the
// knees, palms up, the wrist alone curls the weight up. Must be visible: the
// forearm welded to the thigh so the HAND is the only thing that moves.
// Side view.
const WRIST_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.18,
  props: [
    { type: "bench", x: 26, y: 96, w: 40 },
    { type: "dumbbell", side: "R", point: "hand", rot: 90, k: 0.75, front: true },
  ],
  keys: [
    { // bottom, hand rolled open and hanging below the knee
      t: 0,
      root: { x: 46, y: 88, rot: 14 },
      joints: { spine: 18, neck: -12, wristR: -35, wristL: -35 },
      ik: {
        wristR: { x: 76, y: 90, bend: 1 }, wristL: { x: 72, y: 92, bend: 1 },
        ankleR: { x: 76, y: FLOOR, bend: -1 }, ankleL: { x: 70, y: FLOOR, bend: -1 },
      },
    },
    { // top, hand curled up toward the forearm, elbows never leaving the thighs
      t: 1,
      root: { x: 46, y: 88, rot: 14 },
      joints: { spine: 18, neck: -12, wristR: 50, wristL: 50 },
      ik: {
        wristR: { x: 76, y: 90, bend: 1 }, wristL: { x: 72, y: 92, bend: 1 },
        ankleR: { x: 76, y: FLOOR, bend: -1 }, ankleL: { x: 70, y: FLOOR, bend: -1 },
      },
    },
  ],
};

// The same seated position with the palms turned DOWN, so the wrist extends
// rather than flexes and the range is much shorter. Must be visible: the same
// welded forearm with a small knuckles up lift. Side view. Honest caveat: with
// no forearm twist in the rig, palms up and palms down look the same, so the
// short range here is the only thing separating it from Wrist Curl.
const REVERSE_WRIST_CURL = {
  ...WRIST_CURL,
  keys: [
    { ...WRIST_CURL.keys[0], joints: { spine: 18, neck: -12, wristR: -18, wristL: -18 } },
    { ...WRIST_CURL.keys[1], joints: { spine: 18, neck: -12, wristR: 16, wristL: 16 } },
  ],
};

// The standing barbell curl taken with the knuckles up, which stops the bar
// short of the shoulder and loads the forearm. Must be visible: the curl arc
// finishing lower than a biceps curl with the wrist rolled over the bar.
// Side view.
const REVERSE_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [{ type: "barbell", side: "R", point: "hand", r: 8.5, front: true }],
  keys: [
    { // bottom, arms long, knuckles forward
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: 0, wristR: 20, wristL: 20 },
      ik: {
        wristR: { x: 66, y: 71, bend: 1 }, wristL: { x: 63, y: 73, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // top, bar stopping at the lower chest with the wrist rolled over
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 0, neck: -2, wristR: 24, wristL: 24 },
      ik: {
        wristR: { x: 80, y: 54, bend: 1 }, wristL: { x: 77, y: 56, bend: 1 },
        ...stand(62, 57),
      },
    },
  ],
};

// Standing still, a smooth plate pinched between the fingers and thumb at the
// side, held until the grip gives out. Must be visible: nothing moving, the
// plate hanging off the ends of the fingers on a dead straight arm. Side view,
// and a HOLD rather than a rep, so the loop is a settle plus breathing.
const PLATE_PINCH = {
  view: "side",
  loop: "hold",
  dur: 5.6,
  breath: 1.0,
  breathRate: 0.8,
  props: [
    { type: "barbell", side: "L", point: "hand", dx: -1, dy: 6, r: 8 },
    { type: "barbell", side: "R", point: "hand", dx: 1, dy: 6, r: 8, front: true },
  ],
  keys: [
    { // settle into the hold
      t: 0,
      root: { x: 62, y: 61.4, rot: 2 },
      joints: { spine: 3, neck: 0, shoulderR: 3, elbowR: 5, shoulderL: 2, elbowL: 6 },
      ik: { ...stand(64, 59) },
    },
    { // the grip creeping, shoulders settling a touch lower
      t: 1,
      root: { x: 62, y: 62.2, rot: 2 },
      joints: { spine: 5, neck: 2, shoulderR: 1, elbowR: 8, shoulderL: 0, elbowL: 9 },
      ik: { ...stand(64, 59) },
    },
  ],
};

// Walking with a heavy weight in each hand, torso tall and the arms dead
// straight. Must be visible: the STRIDE, because a farmer's carry standing
// still is a plate pinch. Side view, and the two keyframes swap which leg is in
// front so the pingpong reads as a walk.
const FARMERS_CARRY = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.22,
  props: [
    { type: "dumbbell", side: "L", point: "hand", rot: 0, k: 0.9 },
    { type: "dumbbell", side: "R", point: "hand", rot: 0, k: 0.9, front: true },
  ],
  keys: [
    { // right foot forward, left trailing
      t: 0,
      root: { x: 64, y: 64, rot: 2 },
      joints: { spine: 3, neck: -2, shoulderR: 4, elbowR: 6, shoulderL: 2, elbowL: 8 },
      ik: { ankleR: { x: 77, y: FLOOR, bend: -1 }, ankleL: { x: 51, y: FLOOR, bend: -1 } },
    },
    { // left foot forward, right trailing
      t: 1,
      root: { x: 64, y: 64, rot: 2 },
      joints: { spine: 3, neck: -2, shoulderR: 2, elbowR: 8, shoulderL: 4, elbowL: 6 },
      ik: { ankleR: { x: 51, y: FLOOR, bend: -1 }, ankleL: { x: 77, y: FLOOR, bend: -1 } },
    },
  ],
};

export const MOVES = {
  "Dumbbell Bench Press": DUMBBELL_BENCH_PRESS,
  "Machine Chest Press": MACHINE_CHEST_PRESS,
  "Pec Deck": PEC_DECK,
  "Cable Fly": CABLE_FLY,
  "Low-to-High Cable Fly": LOW_TO_HIGH_CABLE_FLY,
  "Incline Dumbbell Press": INCLINE_DUMBBELL_PRESS,
  "Decline Dumbbell Press": DECLINE_DUMBBELL_PRESS,
  "Incline Barbell Press": INCLINE_BARBELL_PRESS,
  "Decline Barbell Press": DECLINE_BARBELL_PRESS,
  "Landmine Press": LANDMINE_PRESS,
  "Weighted Dip": WEIGHTED_DIP,
  "Close-Grip Pulldown": CLOSE_GRIP_PULLDOWN,
  "Seated Cable Row": SEATED_CABLE_ROW,
  "Dumbbell Row": DUMBBELL_ROW,
  "Straight-Arm Pulldown": STRAIGHT_ARM_PULLDOWN,
  "Chest-Supported Row": CHEST_SUPPORTED_ROW,
  "T-Bar Row": T_BAR_ROW,
  "Barbell Row": BARBELL_ROW,
  "Pendlay Row": PENDLAY_ROW,
  "Weighted Pull-Up": WEIGHTED_PULL_UP,
  "Dumbbell Shrug": DUMBBELL_SHRUG,
  "Barbell Shrug": BARBELL_SHRUG,
  "Behind-the-Back Shrug": BEHIND_THE_BACK_SHRUG,
  "Face Pull": FACE_PULL,
  "Rear Delt Fly": REAR_DELT_FLY,
  "Reverse Pec Deck": REVERSE_PEC_DECK,
  "Upright Row": UPRIGHT_ROW,
  "Snatch-Grip High Pull": SNATCH_GRIP_HIGH_PULL,
  "Lateral Raise": LATERAL_RAISE,
  "Cable Lateral Raise": CABLE_LATERAL_RAISE,
  "Front Raise": FRONT_RAISE,
  "Machine Shoulder Press": MACHINE_SHOULDER_PRESS,
  "Seated Dumbbell Press": SEATED_DUMBBELL_PRESS,
  "Dumbbell Shoulder Press": DUMBBELL_SHOULDER_PRESS,
  "Arnold Press": ARNOLD_PRESS,
  "Cuban Press": CUBAN_PRESS,
  "Overhead Press": OVERHEAD_PRESS,
  "Push Press": PUSH_PRESS,
  "Dumbbell Curl": DUMBBELL_CURL,
  "Hammer Curl": HAMMER_CURL,
  "Cable Curl": CABLE_CURL,
  "EZ-Bar Curl": EZ_BAR_CURL,
  "Concentration Curl": CONCENTRATION_CURL,
  "Barbell Curl": BARBELL_CURL,
  "Preacher Curl": PREACHER_CURL,
  "Incline Dumbbell Curl": INCLINE_DUMBBELL_CURL,
  "Spider Curl": SPIDER_CURL,
  "Triceps Pushdown": TRICEPS_PUSHDOWN,
  "Rope Pushdown": ROPE_PUSHDOWN,
  "Overhead Triceps Extension": OVERHEAD_TRICEPS_EXTENSION,
  "Triceps Kickback": TRICEPS_KICKBACK,
  "Bench Dip": BENCH_DIP,
  "Skull Crusher": SKULL_CRUSHER,
  "Close-Grip Bench Press": CLOSE_GRIP_BENCH_PRESS,
  "Wrist Curl": WRIST_CURL,
  "Reverse Wrist Curl": REVERSE_WRIST_CURL,
  "Reverse Curl": REVERSE_CURL,
  "Plate Pinch": PLATE_PINCH,
  "Farmer's Carry": FARMERS_CARRY,
};
