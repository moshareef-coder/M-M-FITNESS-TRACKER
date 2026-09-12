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

export const MOVES = {
  "Push-Up": PUSH_UP,
  "Pull-Up": PULL_UP,
};
