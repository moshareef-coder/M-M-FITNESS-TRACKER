// Calisthenics moves. Keys are the EXACT `name` from
// knowledge/exercise-library/calisthenics.mjs, because the picker passes names,
// not ids, and a near miss silently shows no animation. validate.mjs fails on
// any key that is not in the library.
//
// Push-Up and Pull-Up also live in the weight training library under the same
// name, so they are exported individually and imported there rather than
// copied. One pose, one place to fix it.

// Plank to floor and back. The wrists are pinned so the hands stay planted
// while the whole body rotates about the toes, which is what a push-up is.
export const PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.18,
  keys: [
    { // top of the rep, arms locked out, one line from heel to head
      t: 0,
      root: { x: 69.6, y: 87.2, rot: 70 },
      joints: { spine: 0, neck: -25, hipL: -140, hipR: -140, kneeL: 2, kneeR: 2,
                ankleL: -10, ankleR: -10, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 92, y: 114.6, bend: 1 } },
    },
    { // bottom, chest just off the floor, elbows tracked back rather than flared
      t: 1,
      root: { x: 72, y: 97.6, rot: 80 },
      joints: { spine: 0, neck: -30, hipL: -165, hipR: -165, kneeL: 2, kneeR: 2,
                ankleL: 2, ankleR: 2, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 92, y: 114.6, bend: 1 } },
    },
  ],
};

// Dead hang to chin over the bar. A full pull-up is taller than the 140 box
// once you add a hanging body under a bar, so this one zooms out with `fit`
// rather than cropping the feet. Knees stay bent because a hanging adult's feet
// would otherwise be through the floor, which is also true in a real doorway.
export const PULL_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.82, dy: 4 },
  props: [{ type: "pullupBar", y: 8, x0: 34, x1: 106 }],
  keys: [
    { // dead hang
      t: 0,
      root: { x: 70, y: 73, rot: 0 },
      joints: { spine: 2, neck: 0, hipL: -12, hipR: -10, kneeL: 74, kneeR: 70,
                ankleL: -16, ankleR: -16 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
    { // top. Deliberately three quarters of the true range: at a full chin
      // over bar the upper arm projects straight through the head in side view
      // and the whole thing reads as a scrunch rather than a pull-up.
      t: 1,
      root: { x: 70, y: 55, rot: 0 },
      joints: { spine: -6, neck: -10, hipL: -16, hipR: -14, kneeL: 78, kneeR: 74,
                ankleL: -16, ankleR: -16 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
  ],
};

// Standing an arm's length from a wall, hands on it at chest height, the body
// stays one straight line from heel to head while the elbows bend and the chest
// travels to the wall. Must be visible: the wall, the body held as one line,
// and the elbows bending. Side view, sagittal push.
export const WALL_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [{ type: "wall", x: 108, w: 22 }],
  keys: [
    { // arms locked out, body leaning barely off vertical
      t: 0,
      root: { x: 61, y: 62.2, rot: 10 },
      joints: { spine: 0, neck: -5, wristR: 8, wristL: 8 },
      ik: {
        wristR: { x: 102, y: 40, bend: 1 }, wristL: { x: 99, y: 42.5, bend: 1 },
        ankleR: { x: 52, y: 113.4, bend: -1 }, ankleL: { x: 55.5, y: 113.4, bend: -1 },
      },
    },
    { // chest to the wall, elbows back along the ribs, heels still down
      t: 1,
      root: { x: 67.2, y: 63.7, rot: 17 },
      joints: { spine: 0, neck: -8, wristR: 8, wristL: 8 },
      ik: {
        wristR: { x: 102, y: 40, bend: 1 }, wristL: { x: 99, y: 42.5, bend: 1 },
        ankleR: { x: 52, y: 113.4, bend: -1 }, ankleL: { x: 55.5, y: 113.4, bend: -1 },
      },
    },
  ],
};

// A push-up with the hands raised on a bench, so the body sits at about forty
// degrees instead of flat and the chest travels to the pad. Must be visible:
// the raised hands and the straight line from toe to head at an angle. Side
// view. Authored rather than spread from PUSH_UP because every keyframe number
// changes; the shape it copies is the straight body plus pinned hands.
export const INCLINE_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  fit: { k: 0.92, dy: 4 },
  props: [{ type: "bench", x: 68, y: 90, w: 48 }],
  keys: [
    { // top, arms straight down onto the pad
      t: 0,
      root: { x: 63.4, y: 68.9, rot: 46 },
      joints: { spine: 0, neck: -16, hipL: -92, hipR: -92, kneeL: 2, kneeR: 2,
                ankleL: -34, ankleR: -34, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 85, y: 85, bend: 1 }, wristL: { x: 80, y: 85, bend: 1 } },
    },
    { // bottom, chest at the pad, elbows tracking back
      t: 1,
      root: { x: 68.1, y: 74.4, rot: 54 },
      joints: { spine: 0, neck: -20, hipL: -108, hipR: -108, kneeL: 2, kneeR: 2,
                ankleL: -26, ankleR: -26, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 85, y: 85, bend: 1 }, wristL: { x: 80, y: 85, bend: 1 } },
    },
  ],
};

// A push-up with the hands together under the sternum and the elbows dragging
// along the ribs, which is what loads the triceps. Must be visible: the hands
// set back under the middle of the chest rather than under the shoulders, and
// the elbows staying in. Side view. Side on the diamond shape of the hands
// itself cannot be seen, so the hands are drawn stacked and low on the torso;
// that placement plus the tucked elbow is the readable difference from PUSH_UP.
export const DIAMOND_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.18,
  keys: [
    { // top, arms locked, hands touching under the sternum
      t: 0,
      root: { x: 69.6, y: 86.2, rot: 68 },
      joints: { spine: 0, neck: -25, hipL: -136, hipR: -136, kneeL: 2, kneeR: 2,
                ankleL: -16, ankleR: -16, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 90, y: 114.6, bend: 1 }, wristL: { x: 87, y: 114.6, bend: 1 } },
    },
    { // bottom, elbows folded tight to the ribs
      t: 1,
      root: { x: 71, y: 94, rot: 77 },
      joints: { spine: 0, neck: -30, hipL: -154, hipR: -154, kneeL: 2, kneeR: 2,
                ankleL: -6, ankleR: -6, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 90, y: 114.6, bend: 1 }, wristL: { x: 87, y: 114.6, bend: 1 } },
    },
  ],
};

// Supported on two parallel bars with the arms straight, the body sinks until
// the elbows are bent past ninety with the upper arms behind the torso, then
// presses back to lockout. Must be visible: the hands at the hips on the bars,
// the whole body hanging above them, and the elbows folding back. Side view.
export const DIP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.92, dy: 6 },
  props: [{ type: "dipBars", x0: 60, x1: 116, y: 70 }],
  keys: [
    { // lockout, arms straight under the shoulders, shins tucked behind
      t: 0,
      root: { x: 74, y: 60, rot: 14 },
      joints: { spine: 4, neck: -4, hipR: -6, hipL: -10, kneeR: 100, kneeL: 104,
                ankleR: -20, ankleL: -20 },
      ik: { wristR: { x: 76, y: 70, bend: 1 }, wristL: { x: 72, y: 70.5, bend: 1 } },
    },
    { // bottom, chest down between the bars, elbows folded behind the ribs
      t: 1,
      root: { x: 73, y: 70, rot: 20 },
      joints: { spine: 6, neck: -6, hipR: -6, hipL: -10, kneeR: 100, kneeL: 104,
                ankleR: -20, ankleL: -20 },
      ik: { wristR: { x: 76, y: 70, bend: 1 }, wristL: { x: 72, y: 70.5, bend: 1 } },
    },
  ],
};

// A push-up with the hands far apart: one arm bends and takes the load while
// the other stays long, the chest travelling down over the bent side. Must be
// visible: one arm long, one arm bent. The suggested view is side, and side on
// a laterally extended arm is foreshortened to nothing, so the long arm is
// drawn reaching out past the head instead: that keeps the one long, one bent
// signature, which is the whole exercise.
export const ARCHER_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.18,
  fit: { k: 0.76, dy: 6 },
  keys: [
    { // hands far apart, long arm straight, body starting to shift over the bent one
      t: 0,
      root: { x: 70.5, y: 92, rot: 76 },
      joints: { spine: 0, neck: -30, hipL: -152, hipR: -152, kneeL: 2, kneeR: 2,
                ankleL: -4, ankleR: -4, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 121, y: 114.6, bend: 1 }, wristL: { x: 95, y: 114.6, bend: 1 } },
    },
    { // chest down over the bent arm while the far hand stays out long
      t: 1,
      root: { x: 71, y: 94.5, rot: 78.5 },
      joints: { spine: 0, neck: -32, hipL: -157, hipR: -157, kneeL: 2, kneeR: 2,
                ankleL: -1, ankleR: -1, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 121, y: 114.6, bend: 1 }, wristL: { x: 95, y: 114.6, bend: 1 } },
    },
  ],
};

// A push-up with the hands down beside the waist and the shoulders driven out
// in front of them, leaning the weight forward onto straight-ish arms. Must be
// visible: the hands level with the hips, well behind the shoulders, and the
// forward lean of the whole body. Side view, which is the only view where the
// hand behind the shoulder can be seen at all.
export const PSEUDO_PLANCHE_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.18,
  fit: { k: 0.88, dy: 2 },
  keys: [
    { // top, shoulders well past the hands, arms long and slanted back
      t: 0,
      root: { x: 70, y: 93.3, rot: 77 },
      joints: { spine: 0, neck: -30, hipL: -154, hipR: -154, kneeL: 2, kneeR: 2,
                ankleL: -3, ankleR: -3, wristL: 120, wristR: 120 },
      ik: { wristR: { x: 74, y: 114.6, bend: 1 }, wristL: { x: 78, y: 114.6, bend: 1 } },
    },
    { // bottom, chest low, shoulders still out in front of the hands
      t: 1,
      root: { x: 71.5, y: 97, rot: 81 },
      joints: { spine: 0, neck: -32, hipL: -162, hipR: -162, kneeL: 2, kneeR: 2,
                ankleL: 1, ankleR: 1, wristL: 120, wristR: 120 },
      ik: { wristR: { x: 74, y: 114.6, bend: 1 }, wristL: { x: 78, y: 114.6, bend: 1 } },
    },
  ],
};

// A push-up on one hand, the other arm folded behind the back and the feet
// wide. Must be visible: a single hand on the floor carrying the body and the
// free arm out of the way. Side view; the wide feet are lost side on, but the
// one supporting arm is the exercise.
export const ONE_ARM_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.18,
  keys: [
    { // top, supporting arm locked, free arm along the back
      t: 0,
      root: { x: 69.6, y: 87.2, rot: 70 },
      joints: { spine: 0, neck: -25, hipL: -140, hipR: -140, kneeL: 2, kneeR: 2,
                ankleL: -10, ankleR: -10, wristR: 86,
                shoulderL: -200, elbowL: 75, wristL: 10 },
      ik: { wristR: { x: 96, y: 114.6, bend: 1 } },
    },
    { // bottom, chest low over the one hand
      t: 1,
      root: { x: 71.5, y: 94.5, rot: 78 },
      joints: { spine: 0, neck: -30, hipL: -156, hipR: -156, kneeL: 2, kneeR: 2,
                ankleL: -2, ankleR: -2, wristR: 86,
                shoulderL: -212, elbowL: 78, wristL: 10 },
      ik: { wristR: { x: 96, y: 114.6, bend: 1 } },
    },
  ],
};

// Hanging at full stretch from a bar, arms straight, body long and still, just
// holding on. Must be visible: both arms straight overhead and the body
// hanging, doing nothing. Side view, hold loop. The knees stay bent for the
// same reason PULL_UP bends them: a hanging adult at this scale would have its
// feet through the floor.
export const DEAD_HANG = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.82, dy: 4 },
  props: [{ type: "pullupBar", y: 8, x0: 34, x1: 106 }],
  keys: [
    { // hanging long, shoulders open
      t: 0,
      root: { x: 70, y: 72.5, rot: 0 },
      joints: { spine: 1, neck: -2, hipL: -12, hipR: -14, kneeL: 66, kneeR: 70,
                ankleL: -18, ankleR: -18 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
    { // settle, a breath of sway, nothing more
      t: 1,
      root: { x: 70.6, y: 73, rot: 1 },
      joints: { spine: 2, neck: -3, hipL: -12, hipR: -14, kneeL: 68, kneeR: 72,
                ankleL: -20, ankleR: -20 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
  ],
};

// Lying face up under a low bar, heels on the floor, body held as one straight
// line while the arms pull the chest up to the bar. Must be visible: the
// straight diagonal body under the bar and the chest travelling to it. Side
// view. root.rot is negative because the figure is face UP.
export const INVERTED_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.9, dy: 2 },
  props: [{ type: "pullupBar", y: 50, x0: 14, x1: 74 }],
  keys: [
    { // bottom, arms straight, body hanging off the bar in one line
      t: 0,
      root: { x: 65.1, y: 93.6, rot: -70 },
      joints: { spine: 0, neck: 4, hipL: 140, hipR: 140, kneeL: 2, kneeR: 2,
                ankleL: 0, ankleR: 0 },
      ik: { wristR: { x: 40, y: 50, bend: 1 }, wristL: { x: 36, y: 50.5, bend: 1 } },
    },
    { // top, chest to the bar, elbows driven down and back, body still a line
      t: 1,
      root: { x: 68.2, y: 86.8, rot: -61.8 },
      joints: { spine: 0, neck: 6, hipL: 123.6, hipR: 123.6, kneeL: 2, kneeR: 2,
                ankleL: 0, ankleR: 0 },
      ik: { wristR: { x: 40, y: 50, bend: 1 }, wristL: { x: 36, y: 50.5, bend: 1 } },
    },
  ],
};

// Starting at the top of a pull-up with the chin over the bar and lowering
// under control to a dead hang. Must be visible: that it runs one way, top to
// bottom. Side view, oneway loop, which is the whole difference from PULL_UP:
// a negative is the lowering half only.
export const NEGATIVE_PULL_UP = {
  view: "side",
  loop: "oneway",
  dur: 3.6,
  breath: 0.2,
  fit: { k: 0.82, dy: 4 },
  props: [{ type: "pullupBar", y: 8, x0: 34, x1: 106 }],
  keys: [
    { // start at the top, chin at the bar
      t: 0,
      root: { x: 70, y: 55, rot: 0 },
      joints: { spine: -6, neck: -10, hipL: -16, hipR: -14, kneeL: 78, kneeR: 74,
                ankleL: -16, ankleR: -16 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
    { // finish hanging, arms straight
      t: 1,
      root: { x: 70, y: 73, rot: 0 },
      joints: { spine: 2, neck: 0, hipL: -12, hipR: -10, kneeL: 74, kneeR: 70,
                ankleL: -16, ankleR: -16 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
  ],
};

// Hanging from a narrow underhand grip and pulling until the chin clears the
// bar, elbows driving down in front of the ribs rather than out. Must be
// visible: the hands close together, the chin finishing above the bar and the
// elbows tracking in front. Side view. The hands curl back over the bar, which
// is the only way a supinated grip shows side on.
export const CHIN_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.8, dy: 6 },
  props: [{ type: "pullupBar", y: 8, x0: 34, x1: 106 }],
  keys: [
    { // hang, palms toward the face, hands close
      t: 0,
      root: { x: 70, y: 72.6, rot: 0 },
      joints: { spine: 2, neck: 0, hipL: -12, hipR: -10, kneeL: 74, kneeR: 70,
                ankleL: -16, ankleR: -16, wristL: -40, wristR: -40 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 66, y: 9.5, bend: 1 } },
    },
    { // top, chin above the bar, elbows down in front of the ribs
      t: 1,
      root: { x: 70, y: 52, rot: 0 },
      joints: { spine: -4, neck: -8, hipL: -18, hipR: -16, kneeL: 80, kneeR: 76,
                ankleL: -16, ankleR: -16, wristL: -40, wristR: -40 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 66, y: 9.5, bend: 1 } },
    },
  ],
};

// Hanging from a wide grip and pulling the body up to one hand while the other
// arm stays long along the bar. Must be visible: one arm bent and loaded, one
// arm straight. The suggested view is side, where the two hands land on top of
// each other and the asymmetry vanishes, so this is authored FRONT on, which is
// how a wide asymmetric grip actually reads.
export const ARCHER_PULL_UP = {
  view: "front",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  farSide: "L",
  fit: { k: 0.8, dy: 6 },
  feet: { R: { ang: 22, len: 0.9, w: 0.9 }, L: { ang: 22, len: 0.9, w: 0.9 } },
  props: [{ type: "pullupBar", y: 8, x0: 20, x1: 110 }],
  keys: [
    { // hanging wide, both arms long
      t: 0,
      root: { x: 62, y: 70, rot: 0 },
      joints: { spine: 0, neck: 0, hipL: 6, hipR: 6, kneeL: 78, kneeR: 75 },
      ik: { wristR: { x: 86, y: 9, bend: 1 }, wristL: { x: 32, y: 9, bend: 1 } },
    },
    { // pulled up to the right hand, left arm still long across the bar
      t: 1,
      root: { x: 74, y: 56, rot: 0 },
      joints: { spine: 0, neck: -4, hipL: 6, hipR: 6, kneeL: 78, kneeR: 75 },
      ik: { wristR: { x: 86, y: 9, bend: 1 }, wristL: { x: 32, y: 9, bend: 1 } },
    },
  ],
};

// A pull-up that does not stop at the bar: the chest comes over it and the body
// rolls forward until it is supported above the bar on straight-ish arms. Must
// be visible: the body ending up ABOVE the bar, which is the whole exercise.
// Side view, oneway. The frames are the transition, not the hang: a bar high
// enough to hang from leaves no room above it inside the box, so the hang is
// the Pull-Up card and this one starts where that one ends.
export const MUSCLE_UP = {
  view: "side",
  loop: "oneway",
  dur: 3.4,
  breath: 0.25,
  fit: { k: 0.95, dy: 2 },
  props: [{ type: "pullupBar", y: 30, x0: 30, x1: 110 }],
  keys: [
    { // end of the pull, chest at the bar, elbows high
      t: 0,
      root: { x: 72.3, y: 69.7, rot: -18 },
      joints: { spine: 0, neck: -8, hipL: 16, hipR: 18, kneeL: 74, kneeR: 70,
                ankleL: -20, ankleR: -20 },
      ik: { wristR: { x: 70, y: 31, bend: 1 }, wristL: { x: 65, y: 31.5, bend: 1 } },
    },
    { // shoulders level with the bar, still behind it
      t: 0.45,
      root: { x: 56.3, y: 60, rot: 0 },
      joints: { spine: 0, neck: -4, hipL: -2, hipR: 0, kneeL: 74, kneeR: 70,
                ankleL: -20, ankleR: -20 },
      ik: { wristR: { x: 70, y: 31, bend: 1 }, wristL: { x: 65, y: 31.5, bend: 1 } },
    },
    { // shoulders above the bar, torso pitching forward over it
      t: 0.75,
      root: { x: 56.7, y: 47.1, rot: 12 },
      joints: { spine: 0, neck: -4, hipL: -14, hipR: -12, kneeL: 74, kneeR: 70,
                ankleL: -20, ankleR: -20 },
      ik: { wristR: { x: 70, y: 31, bend: 1 }, wristL: { x: 65, y: 31.5, bend: 1 } },
    },
    { // the catch, supported above the bar with the hips still below it
      t: 1,
      root: { x: 61.3, y: 43.4, rot: 22 },
      joints: { spine: 0, neck: -6, hipL: -24, hipR: -22, kneeL: 74, kneeR: 70,
                ankleL: -20, ankleR: -20 },
      ik: { wristR: { x: 70, y: 31, bend: 1 }, wristL: { x: 65, y: 31.5, bend: 1 } },
    },
  ],
};

// Hanging from one hand and pulling the chin to it, the free arm out of the
// way. Must be visible: a single hand on the bar carrying the whole body.
// Suggested view is side, which hides the free arm behind the working one, so
// this is authored FRONT on: one arm to the bar, one arm loose, and the body
// hanging off to the side of the grip.
export const ONE_ARM_PULL_UP = {
  view: "front",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  farSide: "L",
  fit: { k: 0.8, dy: 6 },
  feet: { R: { ang: 20, len: 0.9, w: 0.9 }, L: { ang: 20, len: 0.9, w: 0.9 } },
  props: [{ type: "pullupBar", y: 8, x0: 34, x1: 106 }],
  keys: [
    { // hanging from the one arm, free arm down by the side
      t: 0,
      root: { x: 64, y: 72, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderL: 14, elbowL: 25,
                hipL: 4, hipR: 4, kneeL: 80, kneeR: 76 },
      ik: { wristR: { x: 74, y: 9, bend: 1 } },
    },
    { // pulled up under the grip, free arm counterbalancing
      t: 1,
      root: { x: 66, y: 62, rot: 0 },
      joints: { spine: 0, neck: -4, shoulderL: 34, elbowL: 60,
                hipL: 4, hipR: 4, kneeL: 80, kneeR: 76 },
      ik: { wristR: { x: 74, y: 9, bend: 1 } },
    },
  ],
};

// Stand, sit the hips back and down until the thighs are about parallel, stand
// up, arms counterbalancing out front at the bottom. Must be visible: the hip
// and knee bending together with the heels staying down. Side view, sagittal.
export const BODYWEIGHT_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 1.1, dy: 2 },
  keys: [
    { // standing tall, arms by the sides
      t: 0,
      root: { x: 64, y: 61.4, rot: 2 },
      joints: { spine: 5, neck: -3, shoulderR: -9, elbowR: 8, shoulderL: -7, elbowL: 12 },
      ik: { ankleR: { x: 64, y: 113.4, bend: -1 }, ankleL: { x: 61, y: 113.4, bend: -1 } },
    },
    { // bottom, hips back and down, chest up, arms out for balance
      t: 1,
      root: { x: 52, y: 89, rot: 10 },
      joints: { spine: 12, neck: -6, shoulderR: 41, elbowR: 10, shoulderL: 38, elbowL: 14 },
      ik: { ankleR: { x: 64, y: 113.4, bend: -1 }, ankleL: { x: 61, y: 113.4, bend: -1 } },
    },
  ],
};

// A staggered stance, front foot flat and back foot on its toes, the back knee
// dropping straight down toward the floor and pressing back up. Must be
// visible: the split stance and the back knee travelling down. Side view.
export const SPLIT_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.98, dy: 2 },
  keys: [
    { // tall in the stance, back leg long
      t: 0,
      root: { x: 64, y: 66, rot: 4 },
      joints: { spine: 4, neck: -3, hipL: -44, kneeL: 8, ankleL: -42,
                shoulderR: -6, elbowR: 12, shoulderL: -4, elbowL: 16 },
      ik: { ankleR: { x: 84, y: 113.4, bend: -1 } },
    },
    { // bottom, front shin upright, back knee just off the floor
      t: 1,
      root: { x: 62, y: 84, rot: 6 },
      joints: { spine: 6, neck: -4, hipL: -27.5, kneeL: 82, ankleL: 14,
                shoulderR: -4, elbowR: 20, shoulderL: -2, elbowL: 24 },
      ik: { ankleR: { x: 84, y: 113.4, bend: -1 } },
    },
  ],
};

// Step a long way forward, sink until both knees are bent, then stand through
// onto the front leg and step again. Must be visible: the long step and both
// knees bending, with the arms swinging in opposition, which is what separates
// a walking lunge from a planted split squat. Side view, oneway: it travels.
export const WALKING_LUNGE = {
  view: "side",
  loop: "oneway",
  dur: 3.2,
  breath: 0.25,
  fit: { k: 0.98, dy: 2 },
  keys: [
    { // standing, feet together, mid stride
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -2, hipL: -20, kneeL: 20, ankleL: -20,
                shoulderR: 14, elbowR: 18, shoulderL: -16, elbowL: 22 },
      ik: { ankleR: { x: 58, y: 113.4, bend: -1 } },
    },
    { // bottom of the step, front shin upright, back knee low, arms opposed
      t: 1,
      root: { x: 60, y: 84, rot: 6 },
      joints: { spine: 6, neck: -4, hipL: -27.5, kneeL: 82, ankleL: 14,
                shoulderR: -22, elbowR: 24, shoulderL: 30, elbowL: 28 },
      ik: { ankleR: { x: 84, y: 113.4, bend: -1 } },
    },
  ],
};

// Back foot up on a bench behind, the front leg taking everything, the hips
// dropping straight down. Must be visible: the rear foot raised on the bench
// and the front knee bending under the hip. Side view.
export const BULGARIAN_SPLIT_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.94, dy: 2 },
  props: [{ type: "bench", x: 8, y: 92, w: 46 }],
  keys: [
    { // tall, rear instep resting on the pad behind
      t: 0,
      root: { x: 67, y: 70, rot: 6 },
      joints: { spine: 5, neck: -3, hipL: -27.9, kneeL: 98.7, ankleL: -30.3,
                shoulderR: -6, elbowR: 14, shoulderL: -4, elbowL: 18 },
      ik: { ankleR: { x: 84, y: 113.4, bend: -1 } },
    },
    { // bottom, front knee over the foot, rear knee dropped toward the floor
      t: 1,
      root: { x: 64, y: 86, rot: 10 },
      joints: { spine: 8, neck: -5, hipL: -55.1, kneeL: 111.6, ankleL: 5.8,
                shoulderR: -4, elbowR: 22, shoulderL: -2, elbowL: 26 },
      ik: { ankleR: { x: 84, y: 113.4, bend: -1 } },
    },
  ],
};

// Kneeling with the ankles anchored, the body tips forward from the knees as
// one straight line and the hamstrings fight the whole way down. Must be
// visible: the body straight from knee to head, hinging only at the knee, with
// the ankles pinned to the floor. Side view.
export const NORDIC_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.22,
  fit: { k: 0.94, dy: 2 },
  keys: [
    { // upright kneeling, hips locked out
      t: 0,
      root: { x: 62, y: 87, rot: 0 },
      joints: { spine: 0, neck: -2, hipL: 0, hipR: 0, kneeL: 104, kneeR: 104,
                ankleL: -31, ankleR: -31,
                shoulderR: 25, elbowR: 125, shoulderL: 22, elbowL: 128 },
      ik: {},
    },
    { // lowered, still one line from knee to head, arms ready to catch
      t: 1,
      root: { x: 81.1, y: 94.9, rot: 45 },
      joints: { spine: 0, neck: -6, hipL: -90, hipR: -90, kneeL: 59, kneeR: 59,
                ankleL: -31, ankleR: -31,
                shoulderR: -65, elbowR: 125, shoulderL: -68, elbowL: 128 },
      ik: {},
    },
  ],
};

// A single-leg squat with the back leg folded under, the trailing knee tracking
// down to the floor behind the standing heel. Must be visible: one leg doing
// all the work while the other folds behind and drops to the floor. Side view.
// The rear foot is left free rather than held in the hands: at this size a hand
// gripping a foot behind the hip is a knot, and the folded trailing leg is the
// thing that names the movement.
export const SHRIMP_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.96, dy: 2 },
  keys: [
    { // standing on one leg, trailing heel tucked to the glute
      t: 0,
      root: { x: 70, y: 63, rot: 4 },
      joints: { spine: 5, neck: -3, hipL: -25, kneeL: 110, ankleL: -50,
                shoulderR: 18, elbowR: 20, shoulderL: 14, elbowL: 24 },
      ik: { ankleR: { x: 76, y: 113.4, bend: -1 } },
    },
    { // bottom, trailing knee down behind the standing foot
      t: 1,
      root: { x: 66, y: 86, rot: 12 },
      joints: { spine: 10, neck: -5, hipL: -39, kneeL: 110, ankleL: -50,
                shoulderR: 46, elbowR: 16, shoulderL: 42, elbowL: 20 },
      ik: { ankleR: { x: 76, y: 113.4, bend: -1 } },
    },
  ],
};

// A one-legged squat all the way to the bottom with the free leg held straight
// out in front. Must be visible: one leg straight out front while the other
// folds completely underneath. Side view.
export const PISTOL_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.2,
  fit: { k: 0.86, dy: 2 },
  keys: [
    { // standing on one leg, free leg already lifted out front
      t: 0,
      root: { x: 66, y: 62, rot: 4 },
      joints: { spine: 5, neck: -3, hipL: 65, kneeL: 6, ankleL: 16,
                shoulderR: 24, elbowR: 16, shoulderL: 20, elbowL: 20 },
      ik: { ankleR: { x: 70, y: 113.4, bend: -1 } },
    },
    { // bottom, hips to the heel, free leg long and level
      t: 1,
      root: { x: 58, y: 100, rot: 20 },
      joints: { spine: 14, neck: -8, hipL: 92, kneeL: 4, ankleL: 20,
                shoulderR: 50, elbowR: 10, shoulderL: 46, elbowL: 14 },
      ik: { ankleR: { x: 70, y: 113.4, bend: -1 } },
    },
  ],
};

// Propped on both forearms and the toes, body held as one straight line from
// heel to head, nothing moving. Must be visible: the FOREARMS flat on the
// floor, which is the only thing separating a plank from the top of a push-up,
// plus the straight body. Side view, hold loop.
export const PLANK = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.78, dy: 4 },
  keys: [
    { // set, elbows under the shoulders, hips level
      t: 0,
      root: { x: 67.2, y: 96.5, rot: 82.5 },
      joints: { spine: 0, neck: -28, hipL: -165, hipR: -165, kneeL: 2, kneeR: 2,
                ankleL: 0, ankleR: 0, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 111, y: 114.6, bend: 1 }, wristL: { x: 106, y: 114.6, bend: 1 } },
    },
    { // the settle a held position always has, and nothing else
      t: 1,
      root: { x: 67.4, y: 97.2, rot: 83.2 },
      joints: { spine: 0, neck: -30, hipL: -166.4, hipR: -166.4, kneeL: 2, kneeR: 2,
                ankleL: 1, ankleR: 1, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 111, y: 114.6, bend: 1 }, wristL: { x: 106, y: 114.6, bend: 1 } },
    },
  ],
};

// Stacked on one side, propped on one forearm, hips lifted so the body is one
// straight diagonal line, top arm reaching at the ceiling. Must be visible: the
// single forearm on the floor, the lifted hips and the top arm pointing up,
// which is what stops it reading as a plank. Side view. The authored shoulder
// numbers look extreme because the root is rotated 76 degrees: an arm pointing
// at the ceiling off a near horizontal torso is a big number, not a mistake.
export const SIDE_PLANK = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.84, dy: 6 },
  keys: [
    { // set, hips high, body in one line
      t: 0,
      root: { x: 60.2, y: 99, rot: -76 },
      joints: { spine: 0, neck: 2, hipL: 152, hipR: 152, kneeL: 2, kneeR: 2,
                ankleL: -50, ankleR: -50,
                shoulderR: 256, elbowR: 2, wristR: -6,
                shoulderL: 101, elbowL: 65, wristL: 0 },
      ik: {},
    },
    { // settle, hips a touch lower, top arm still long
      t: 1,
      root: { x: 60.4, y: 100.1, rot: -74.6 },
      joints: { spine: 0, neck: 3, hipL: 149.2, hipR: 149.2, kneeL: 2, kneeR: 2,
                ankleL: -50, ankleR: -50,
                shoulderR: 254, elbowR: 3, wristR: -6,
                shoulderL: 100, elbowL: 66, wristL: 0 },
      ik: {},
    },
  ],
};

// Lying face up with the lower back pressed into the floor, shoulders and
// straight legs both lifted a few inches, arms reaching past the head. Must be
// visible: the shoulders AND the legs off the floor with only the lower back
// touching. Side view; root.rot is negative because the figure is face up.
export const HOLLOW_BODY_HOLD = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.7, dy: 8 },
  keys: [
    { // set, shoulders and heels both up, only the lower back down
      t: 0,
      root: { x: 72, y: 108, rot: -68 },
      joints: { spine: 0, neck: 10, hipL: 183.2, hipR: 183.2, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40,
                shoulderR: -44, elbowR: 8, shoulderL: -46, elbowL: 10 },
      ik: {},
    },
    { // settle, everything a degree lower, nothing else moves
      t: 1,
      root: { x: 72, y: 108.6, rot: -66 },
      joints: { spine: 0, neck: 11, hipL: 179.2, hipR: 179.2, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40,
                shoulderR: -45, elbowR: 9, shoulderL: -47, elbowL: 11 },
      ik: {},
    },
  ],
};

// Hands pressing down on parallettes, whole body lifted clear of the floor,
// knees tucked to the chest. Must be visible: the body hanging off straight
// arms with nothing touching the ground and the knees pulled up. Side view.
export const TUCK_L_SIT = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.92, dy: 4 },
  props: [{ type: "dipBars", x0: 52, x1: 96, y: 86 }],
  keys: [
    { // set, arms locked, knees to the chest
      t: 0,
      root: { x: 74, y: 77, rot: -4 },
      joints: { spine: 4, neck: 0, hipL: 112, hipR: 114, kneeL: 128, kneeR: 130,
                ankleL: -30, ankleR: -30 },
      ik: { wristR: { x: 74, y: 86, bend: 1 }, wristL: { x: 70, y: 86.5, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 74, y: 78, rot: -3 },
      joints: { spine: 4, neck: 1, hipL: 110, hipR: 112, kneeL: 126, kneeR: 128,
                ankleL: -30, ankleR: -30 },
      ik: { wristR: { x: 74, y: 86, bend: 1 }, wristL: { x: 70, y: 86.5, bend: 1 } },
    },
  ],
};

// Hands pressing down, body lifted clear of the floor, legs held straight out
// in front so the body makes an L. Must be visible: the straight horizontal
// legs and the locked arms carrying everything. Side view.
export const L_SIT = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.8, dy: 4 },
  props: [{ type: "dipBars", x0: 50, x1: 94, y: 86 }],
  keys: [
    { // set, legs level, toes pointed
      t: 0,
      root: { x: 72, y: 77, rot: -2 },
      joints: { spine: 2, neck: 0, hipL: 90, hipR: 92, kneeL: 2, kneeR: 2,
                ankleL: -45, ankleR: -45 },
      ik: { wristR: { x: 72, y: 86, bend: 1 }, wristL: { x: 68, y: 86.5, bend: 1 } },
    },
    { // settle, legs a degree lower
      t: 1,
      root: { x: 72, y: 78, rot: -1 },
      joints: { spine: 2, neck: 1, hipL: 87, hipR: 89, kneeL: 2, kneeR: 2,
                ankleL: -45, ankleR: -45 },
      ik: { wristR: { x: 72, y: 86, bend: 1 }, wristL: { x: 68, y: 86.5, bend: 1 } },
    },
  ],
};

// The L-sit taken higher: straight legs lifted well above the hips so the body
// folds into a V, torso leaning back to balance it. Must be visible: the legs
// clearly ABOVE horizontal, which is the only difference from L_SIT. Side view.
export const V_SIT = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.82, dy: 6 },
  props: [{ type: "dipBars", x0: 50, x1: 94, y: 90 }],
  keys: [
    { // set, legs high, torso leaning back under them
      t: 0,
      root: { x: 70, y: 80, rot: -12 },
      joints: { spine: -2, neck: 6, hipL: 140, hipR: 142, kneeL: 2, kneeR: 2,
                ankleL: -45, ankleR: -45 },
      ik: { wristR: { x: 72, y: 90, bend: 1 }, wristL: { x: 68, y: 90.5, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 70, y: 81, rot: -11 },
      joints: { spine: -2, neck: 7, hipL: 137, hipR: 139, kneeL: 2, kneeR: 2,
                ankleL: -45, ankleR: -45 },
      ik: { wristR: { x: 72, y: 90, bend: 1 }, wristL: { x: 68, y: 90.5, bend: 1 } },
    },
  ],
};

// Hanging from a bar and lifting straight legs up to horizontal, then lowering
// them under control. Must be visible: the arms staying straight while the legs
// swing from hanging to level. Side view.
export const HANGING_LEG_RAISE = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.78, dy: 4 },
  props: [{ type: "pullupBar", y: 8, x0: 34, x1: 106 }],
  keys: [
    { // hanging, legs down and still
      t: 0,
      root: { x: 70, y: 72.6, rot: 0 },
      joints: { spine: 2, neck: 0, hipL: -10, hipR: -8, kneeL: 76, kneeR: 72,
                ankleL: -24, ankleR: -24 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
    { // knees come up first, which is the only path that does not sweep the
      // feet through the floor, and is what a real leg raise looks like anyway
      t: 0.5,
      root: { x: 70, y: 72.8, rot: -2 },
      joints: { spine: 3, neck: 1, hipL: 50, hipR: 52, kneeL: 118, kneeR: 120,
                ankleL: -25, ankleR: -25 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
    { // legs level with the hips, knees long
      t: 1,
      root: { x: 70, y: 73, rot: -4 },
      joints: { spine: 4, neck: 2, hipL: 92, hipR: 94, kneeL: 6, kneeR: 4,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
  ],
};

// Upside down on straight arms with the feet resting on a wall, body stacked in
// one vertical line. Must be visible: that the figure is INVERTED, hands on the
// floor, feet against the wall. Side view, hold. root.rot 180 is what flips the
// whole chain: the head goes where upV points, which is now straight down.
export const WALL_HANDSTAND_HOLD = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.78, dy: 0 },
  props: [{ type: "wall", x: 52, w: 18, top: -24 }],
  keys: [
    { // stacked, hands a hand's length off the wall, toes touching it
      t: 0,
      root: { x: 78, y: 52, rot: 180 },
      joints: { spine: 0, neck: 4, hipL: 0, hipR: 0, kneeL: 0, kneeR: 0,
                ankleL: -58, ankleR: -58, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
    { // the small correction a held handstand always makes
      t: 1,
      root: { x: 78.4, y: 52.6, rot: 181.4 },
      joints: { spine: 0, neck: 5, hipL: 0, hipR: 0, kneeL: 2, kneeR: 2,
                ankleL: -56, ankleR: -56, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
  ],
};

// Upside down on straight arms with nothing to lean on, the whole line balanced
// over the hands. Must be visible: inverted, stacked and free standing, no wall
// anywhere. Side view, hold. The settle is bigger than a wall handstand's: a
// free handstand is a constant correction, and that is the difference between
// the two cards.
export const FREESTANDING_HANDSTAND = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.9,
  fit: { k: 0.78, dy: 0 },
  keys: [
    { // stacked over the hands
      t: 0,
      root: { x: 78, y: 52, rot: 177 },
      joints: { spine: 2, neck: 6, hipL: 0, hipR: 0, kneeL: 2, kneeR: 2,
                ankleL: -54, ankleR: -54, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
    { // the balance correction, hips travelling a couple of units
      t: 1,
      root: { x: 77.2, y: 52.8, rot: 183 },
      joints: { spine: -2, neck: 2, hipL: 2, hipR: 2, kneeL: 4, kneeR: 4,
                ankleL: -50, ankleR: -50, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
  ],
};

// From a handstand, bend the elbows until the head touches the floor between
// the hands, then press the whole body back up. Must be visible: the inverted
// body descending until the head is at the floor, elbows folding. Side view.
export const HANDSTAND_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.78, dy: 0 },
  keys: [
    { // locked out overhead
      t: 0,
      root: { x: 78, y: 51.6, rot: 180 },
      joints: { spine: 0, neck: 2, hipL: 0, hipR: 0, kneeL: 2, kneeR: 2,
                ankleL: -56, ankleR: -56, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
    { // bottom, head at the floor between the hands, elbows folded
      t: 1,
      root: { x: 78, y: 63, rot: 180 },
      joints: { spine: 0, neck: 2, hipL: 0, hipR: 0, kneeL: 2, kneeR: 2,
                ankleL: -56, ankleR: -56, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
  ],
};

// A push-up top position taken as far forward as it will go: straight arms,
// toes on the floor, shoulders driven way out in front of the hands and held
// there. Must be visible: the shoulders well ahead of the hands with the body
// flat, and that nothing is moving. Side view, hold, which is what separates it
// from PSEUDO_PLANCHE_PUSH_UP.
export const PLANCHE_LEAN = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.8, dy: 2 },
  keys: [
    { // leaning, hands back at the hips, body flat
      t: 0,
      root: { x: 70, y: 97, rot: 84 },
      joints: { spine: 0, neck: -32, hipL: -168, hipR: -168, kneeL: 2, kneeR: 2,
                ankleL: 0, ankleR: 0, wristL: 120, wristR: 120 },
      ik: { wristR: { x: 66, y: 114.6, bend: 1 }, wristL: { x: 70, y: 114.6, bend: 1 } },
    },
    { // settle, a degree further forward
      t: 1,
      root: { x: 70.4, y: 97.6, rot: 85 },
      joints: { spine: 0, neck: -33, hipL: -170, hipR: -170, kneeL: 2, kneeR: 2,
                ankleL: 1, ankleR: 1, wristL: 120, wristR: 120 },
      ik: { wristR: { x: 66, y: 114.6, bend: 1 }, wristL: { x: 70, y: 114.6, bend: 1 } },
    },
  ],
};

// Balanced on straight arms with the knees tucked to the chest and nothing else
// touching the floor, shoulders leaning out in front of the hands. Must be
// visible: the whole body clear of the floor with the hips level with the
// shoulders. Side view, hold.
export const TUCK_PLANCHE = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.82, dy: 2 },
  keys: [
    { // holding, knees under the chest, hips up
      t: 0,
      root: { x: 59, y: 84, rot: 81.5 },
      joints: { spine: 0, neck: -30, hipL: -19.5, hipR: -19.5, kneeL: 145, kneeR: 145,
                ankleL: -40, ankleR: -40, wristL: 110, wristR: 110 },
      ik: { wristR: { x: 70, y: 114.6, bend: 1 }, wristL: { x: 65, y: 114.6, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 59.4, y: 84.8, rot: 82.5 },
      joints: { spine: 0, neck: -31, hipL: -21, hipR: -21, kneeL: 143, kneeR: 143,
                ankleL: -40, ankleR: -40, wristL: 110, wristR: 110 },
      ik: { wristR: { x: 70, y: 114.6, bend: 1 }, wristL: { x: 65, y: 114.6, bend: 1 } },
    },
  ],
};

// The same balance with the legs straight: the whole body held horizontal off
// the floor on straight arms. Must be visible: a straight body parallel to the
// floor, held clear of it, with the shoulders in front of the hands. Side view,
// hold. Legs long is the only difference from TUCK_PLANCHE, and it is the
// difference between a progression and the finished skill.
export const FULL_PLANCHE = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.74, dy: 2 },
  keys: [
    { // holding, one straight line from toe to head, nothing on the floor
      t: 0,
      root: { x: 59, y: 84, rot: 81.5 },
      joints: { spine: 0, neck: -30, hipL: -163, hipR: -163, kneeL: 2, kneeR: 2,
                ankleL: 0, ankleR: 0, wristL: 110, wristR: 110 },
      ik: { wristR: { x: 70, y: 114.6, bend: 1 }, wristL: { x: 65, y: 114.6, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 59.4, y: 84.8, rot: 82.5 },
      joints: { spine: 0, neck: -31, hipL: -165, hipR: -165, kneeL: 2, kneeR: 2,
                ankleL: 1, ankleR: 1, wristL: 110, wristR: 110 },
      ik: { wristR: { x: 70, y: 114.6, bend: 1 }, wristL: { x: 65, y: 114.6, bend: 1 } },
    },
  ],
};

// Hanging under a bar on straight arms with the body held horizontal, face up.
// Must be visible: the body level under the bar, arms straight, nothing
// touching the floor. Side view, hold. root.rot is negative because the figure
// is face UP; the head has to sit at -x for that, so the bar is drawn off to
// the left and the feet run out to the right.
export const FRONT_LEVER = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.84, dy: 0 },
  props: [{ type: "pullupBar", y: 22, x0: 4, x1: 64 }],
  keys: [
    { // holding level, toes long
      t: 0,
      root: { x: 52, y: 61, rot: -90 },
      joints: { spine: 0, neck: 6, hipL: 180, hipR: 180, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 25, y: 23, bend: 1 }, wristL: { x: 21, y: 23.5, bend: 1 } },
    },
    { // settle, hips a shade lower
      t: 1,
      root: { x: 52, y: 62.4, rot: -87.5 },
      joints: { spine: 0, neck: 7, hipL: 175, hipR: 175, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 25, y: 23, bend: 1 }, wristL: { x: 21, y: 23.5, bend: 1 } },
    },
  ],
};

// The front lever with the knees pulled in to the chest, the easiest version
// that still holds the hips at shoulder height under the bar. Must be visible:
// the body hanging level under straight arms with the knees tucked. Side view,
// hold.
export const TUCK_FRONT_LEVER = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.9, dy: 0 },
  props: [{ type: "pullupBar", y: 22, x0: 4, x1: 64 }],
  keys: [
    { // holding, knees to the chest, hips level with the shoulders
      t: 0,
      root: { x: 52, y: 61, rot: -90 },
      joints: { spine: 0, neck: 6, hipL: -40, hipR: -40, kneeL: 140, kneeR: 140,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 25, y: 23, bend: 1 }, wristL: { x: 21, y: 23.5, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 52, y: 62.2, rot: -88 },
      joints: { spine: 0, neck: 7, hipL: -37, hipR: -37, kneeL: 138, kneeR: 138,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 25, y: 23, bend: 1 }, wristL: { x: 21, y: 23.5, bend: 1 } },
    },
  ],
};

// Gripping a vertical pole with both hands, one high and one low, and holding
// the whole body out sideways off it. Must be visible: the pole, both hands on
// it far apart, and the body out in the air with nothing under it. Side view
// with a doorframe as the pole. The body is drawn about twenty degrees above
// horizontal rather than dead level: at dead level the top arm needs more
// shoulder elevation than a shoulder has, and the top arm carries a bend here
// for the same reason.
export const HUMAN_FLAG = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.86, dy: 4 },
  props: [{ type: "doorframe", x: 112, w: 8 }],
  keys: [
    { // holding, top hand high on the pole, bottom hand pressing low
      t: 0,
      root: { x: 70.6, y: 71.2, rot: 70 },
      joints: { spine: 0, neck: -8, hipL: -140, hipR: -140, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 116, y: 92, bend: 1 }, wristL: { x: 116, y: 38, bend: 1 } },
    },
    { // settle, the body dips a degree and holds
      t: 1,
      root: { x: 70.8, y: 72.4, rot: 72 },
      joints: { spine: 0, neck: -9, hipL: -144, hipR: -144, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 116, y: 92, bend: 1 }, wristL: { x: 116, y: 38, bend: 1 } },
    },
  ],
};

export const MOVES = {
  "Wall Push-Up": WALL_PUSH_UP,
  "Incline Push-Up": INCLINE_PUSH_UP,
  "Push-Up": PUSH_UP,
  "Diamond Push-Up": DIAMOND_PUSH_UP,
  "Dip": DIP,
  "Archer Push-Up": ARCHER_PUSH_UP,
  "Pseudo Planche Push-Up": PSEUDO_PLANCHE_PUSH_UP,
  "One-Arm Push-Up": ONE_ARM_PUSH_UP,
  "Dead Hang": DEAD_HANG,
  "Inverted Row": INVERTED_ROW,
  "Negative Pull-Up": NEGATIVE_PULL_UP,
  "Pull-Up": PULL_UP,
  "Chin-Up": CHIN_UP,
  "Archer Pull-Up": ARCHER_PULL_UP,
  "Muscle-Up": MUSCLE_UP,
  "One-Arm Pull-Up": ONE_ARM_PULL_UP,
  "Bodyweight Squat": BODYWEIGHT_SQUAT,
  "Split Squat": SPLIT_SQUAT,
  "Walking Lunge": WALKING_LUNGE,
  "Bulgarian Split Squat": BULGARIAN_SPLIT_SQUAT,
  "Nordic Curl": NORDIC_CURL,
  "Shrimp Squat": SHRIMP_SQUAT,
  "Pistol Squat": PISTOL_SQUAT,
  "Plank": PLANK,
  "Hollow Body Hold": HOLLOW_BODY_HOLD,
  "Side Plank": SIDE_PLANK,
  "Tuck L-Sit": TUCK_L_SIT,
  "Hanging Leg Raise": HANGING_LEG_RAISE,
  "L-Sit": L_SIT,
  "V-Sit": V_SIT,
  "Wall Handstand Hold": WALL_HANDSTAND_HOLD,
  "Planche Lean": PLANCHE_LEAN,
  "Tuck Front Lever": TUCK_FRONT_LEVER,
  "Freestanding Handstand": FREESTANDING_HANDSTAND,
  "Handstand Push-Up": HANDSTAND_PUSH_UP,
  "Front Lever": FRONT_LEVER,
  "Tuck Planche": TUCK_PLANCHE,
  "Full Planche": FULL_PLANCHE,
  "Human Flag": HUMAN_FLAG,
};
