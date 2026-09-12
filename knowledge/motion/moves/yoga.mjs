// Yoga moves. Keys are the EXACT `name` from
// knowledge/exercise-library/yoga.mjs.
//
// Most poses are held, not repeated, so they use loop "hold": the cycle eases
// in and out of a settle while the breathing idle keeps the figure alive. A
// held pose with zero motion reads as a broken animation, not as a still.

// Front view, because the whole shape of Warrior II is lateral: side on it
// collapses into one leg and one arm. The feet are authored explicitly because
// the front foot points at the camera and has to be drawn short and wide while
// the back foot is turned out and long.
const WARRIOR_II = {
  view: "front",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.8,
  farSide: "L",
  feet: { R: { ang: 8, len: 0.34, w: 1.35 }, L: { ang: 74, len: 1.05, w: 0.95 } },
  keys: [
    { // settle into the stance
      t: 0,
      root: { x: 70, y: 71.8, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 92, shoulderL: 90, elbowR: 2, elbowL: 2,
                wristR: -3, wristL: -3 },
      ik: { ankleR: { x: 98, y: 113.4, bend: -1 }, ankleL: { x: 32, y: 113.4, bend: -1 } },
    },
    { // sink a touch deeper and reach longer through the hands
      t: 1,
      root: { x: 70, y: 73.4, rot: 0 },
      joints: { spine: 1.5, neck: -1, shoulderR: 89, shoulderL: 87, elbowR: 0, elbowL: 0,
                wristR: -1, wristL: -1 },
      ik: { ankleR: { x: 99, y: 113.4, bend: -1 }, ankleL: { x: 31, y: 113.4, bend: -1 } },
    },
  ],
};

export const MOVES = {
  "Warrior II": WARRIOR_II,
};
