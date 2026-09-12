// Stretching moves. Keys are the EXACT `name` from
// knowledge/exercise-library/stretching.mjs.
//
// The library's own `kind` maps onto loop style: static -> hold with a real
// breathing amplitude, dynamic -> pingpong, mobility -> a slower pingpong. The
// timer already shows seconds and the cue, so the animation only has to make
// the shape unmistakable.

// Seen from BEHIND, square in the doorway, arm straight out to the side at
// shoulder height with the palm on the frame. The first version of this was a
// side view and it read as leaning on a wall with the hand out front, which is
// a different exercise: side on, an arm abducted to 95 degrees is pointing at
// the camera and there is nothing to see. The mannequin has no face, so front
// view plus facing "away" is also the back view.
const DOORWAY_PEC_STRETCH = {
  view: "front",
  facing: "away",
  loop: "hold",
  dur: 5.6,
  breath: 1.0,
  breathRate: 0.85,
  feet: { R: { ang: 12, len: 0.4, w: 1.3 }, L: { ang: 12, len: 0.4, w: 1.3 } },
  props: [{ type: "doorframe", x: 118, w: 9 }],
  keys: [
    { // set up: palm flat on the frame, arm long, feet together
      t: 0,
      root: { x: 64, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderL: -3, elbowL: 8, wristL: 4, wristR: 0,
                hipR: 3, hipL: 3, kneeR: 2, kneeL: 2 },
      ik: {
        wristR: { x: 112, y: 35, bend: 1 },
        ankleR: { x: 68, y: 113.4, bend: -1 }, ankleL: { x: 61, y: 113.4, bend: -1 },
      },
    },
    { // step through: the chest travels past the planted hand. Toward the
      // viewer in reality, which front on is a small drop plus a little spine
      // flex, and the elbow softens because the shoulder has moved away.
      t: 1,
      root: { x: 63.2, y: 62.4, rot: 0 },
      joints: { spine: 4, neck: 1, shoulderL: -1, elbowL: 12, wristL: 4, wristR: 0,
                hipR: 3, hipL: 3, kneeR: 2, kneeL: 2 },
      ik: {
        wristR: { x: 112, y: 35, bend: 1 },
        ankleR: { x: 68, y: 113.4, bend: -1 }, ankleL: { x: 61, y: 113.4, bend: -1 },
      },
    },
  ],
};

// Front view: pulling a band apart is lateral, and side on it is two arms on
// top of each other. The band prop sags by how much slack is left, so the rep
// reads even in a single frame: slack at the start, straight at the finish.
const BAND_PULL_APART = {
  view: "front",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.25,
  feet: { R: { ang: 14, len: 0.4, w: 1.3 }, L: { ang: 14, len: 0.4, w: 1.3 } },
  props: [{
    type: "band", rest: 94,
    from: { side: "L", point: "hand" }, to: { side: "R", point: "hand" }, front: true,
  }],
  keys: [
    { // start: hands close together in front, band slack
      t: 0,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 55, shoulderL: 55, elbowR: -8, elbowL: -8,
                wristR: -4, wristL: -4, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
      ik: { ankleR: { x: 76, y: 113.4, bend: -1 }, ankleL: { x: 64, y: 113.4, bend: -1 } },
    },
    { // finish: wide T, shoulder blades together, band straight
      t: 1,
      root: { x: 70, y: 61, rot: 0 },
      joints: { spine: -1, neck: 0, shoulderR: 93, shoulderL: 93, elbowR: 2, elbowL: 2,
                wristR: 0, wristL: 0, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
      ik: { ankleR: { x: 76, y: 113.4, bend: -1 }, ankleL: { x: 64, y: 113.4, bend: -1 } },
    },
  ],
};

// Supine over a roller under the upper back, hips on the floor, hands behind
// the head. Supine means root.rot is NEGATIVE, which puts the head at -x and
// runs the legs out to +x; get that backwards and the figure is face down on
// the roller doing something nobody should do.
const FOAM_ROLLER_THORACIC_EXTENSION = {
  view: "side",
  loop: "pingpong",
  dur: 4.6,
  breath: 0.6,
  breathRate: 0.9,
  props: [
    { type: "mat", x: 12, w: 116 },
    { type: "roller", x: 42, y: 112.6, r: 5.4 },
  ],
  keys: [
    { // neutral, ribs down, upper back resting on the roller
      t: 0,
      root: { x: 66, y: 108, rot: -62 },
      joints: { spine: 2, neck: -22 },
      ik: {
        wristR: { x: 24, y: 90, bend: 1 }, wristL: { x: 27, y: 92, bend: 1 },
        ankleR: { x: 100, y: 113.4, bend: -1 }, ankleL: { x: 96, y: 113.4, bend: -1 },
      },
    },
    { // extend over the roller, head supported so the neck follows the spine
      t: 1,
      root: { x: 64, y: 105.5, rot: -62 },
      joints: { spine: -8, neck: -34 },
      ik: {
        wristR: { x: 22, y: 94, bend: 1 }, wristL: { x: 25, y: 96, bend: 1 },
        ankleR: { x: 100, y: 113.4, bend: -1 }, ankleL: { x: 96, y: 113.4, bend: -1 },
      },
    },
  ],
};

export const MOVES = {
  "Doorway Pec Stretch": DOORWAY_PEC_STRETCH,
  "Band Pull-Apart": BAND_PULL_APART,
  "Foam Roller Thoracic Extension": FOAM_ROLLER_THORACIC_EXTENSION,
};
