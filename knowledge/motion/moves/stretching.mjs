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


// Arms sweep a big circle at the shoulder, ribs held down, the circles growing
// as they go. What must be visible is the arm travelling through the circle, so
// this is the side view and the circle is drawn in the sagittal plane: three
// keys, back and low, through overhead, out to forward and low, which pingpongs
// into a continuous sweep rather than a flap.
const ARM_CIRCLES = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  keys: [
    { // arms behind the hips, start of the sweep
      t: 0,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 1, neck: -2, shoulderR: -36, shoulderL: -28, elbowR: 6, elbowL: 8 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
    { // straight overhead, the tall point of the circle
      t: 0.5,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: -6, shoulderR: 172, shoulderL: 160, elbowR: 3, elbowL: 5 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
    { // out in front at shoulder height, closing the circle
      t: 1,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 1, neck: -1, shoulderR: 104, shoulderL: 94, elbowR: 5, elbowL: 7 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
  ],
};

// Arms hang dead while the shoulders roll up, back and down. There is no
// scapula in the rig, so the roll is carried by the three things there are: the
// body rising a little at the top of the roll, the chest opening as the
// shoulders go back, and the arms trailing behind the hips at the end of it.
const SHOULDER_ROLLS = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.2,
  keys: [
    { // shoulders forward and down, chest a touch closed
      t: 0,
      root: { x: 66, y: 62.6, rot: 0 },
      joints: { spine: 11, neck: 10, shoulderR: 20, shoulderL: 16, elbowR: 16, elbowL: 14 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
    { // shrugged up, tall through the body
      t: 0.5,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 1, neck: 4, shoulderR: 6, shoulderL: 4, elbowR: 8, elbowL: 7 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
    { // back and down, chest open, arms trailing behind the hips
      t: 1,
      root: { x: 66, y: 62.4, rot: 0 },
      joints: { spine: -11, neck: -8, shoulderR: -24, shoulderL: -20, elbowR: 3, elbowL: 3 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
  ],
};

// Arms swing wide open then scissor across the chest. Crossing the midline is
// the whole move and side on the two arms sit on top of each other, so this is
// the front view with both wrists pinned: open is a wide T, crossed is one
// forearm over the other with the hands past the opposite shoulder.
const CROSS_BODY_ARM_SWINGS = {
  view: "front",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.25,
  feet: { R: { ang: 13, len: 0.4, w: 1.3 }, L: { ang: 13, len: 0.4, w: 1.3 } },
  keys: [
    { // wide open, arms long
      t: 0,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 94, shoulderL: 90, elbowR: 3, elbowL: 3,
                wristR: -2, wristL: -2, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
    { // scissored across the body, the right forearm passing under the left
      t: 1,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: -76, shoulderL: -64, elbowR: -4, elbowL: -6,
                wristR: 6, wristL: 6, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
  ],
};

// Back flat to a wall, arms in a goalpost, sliding up toward a Y with the backs
// of the hands staying on the wall. Seen from behind, which is the view that
// has a wall in it and the only one where a W turning into a Y is a shape at
// all: side on the arms are pointing at the camera.
const WALL_SLIDES = {
  view: "front",
  facing: "away",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  feet: { R: { ang: 11, len: 0.42, w: 1.3 }, L: { ang: 11, len: 0.42, w: 1.3 } },
  props: [{ type: "wall", x: 16, w: 108, top: 2 }],
  keys: [
    { // goalpost: elbows down at the ribs, forearms up the wall
      t: 0,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 42, shoulderL: 42, elbowR: 128, elbowL: 128,
                wristR: -6, wristL: -6, hipR: 4, hipL: 4, kneeR: 3, kneeL: 3 },
    },
    { // slid up to a Y, elbows nearly straight, hands still on the wall
      t: 1,
      root: { x: 70, y: 61.2, rot: 0 },
      joints: { spine: -2, neck: 0, shoulderR: 148, shoulderL: 148, elbowR: 22, elbowL: 22,
                wristR: -4, wristL: -4, hipR: 4, hipL: 4, kneeR: 3, kneeL: 3 },
    },
  ],
};

// Upper arms held out and still while the forearms draw circles from the elbow.
// The suggested view was side, where both arms stack into one and you cannot
// see that the upper arm is holding still, which is the whole instruction. Front
// on, the upper arms are two fixed horizontal bars and the forearms sweep.
const ELBOW_CIRCLES = {
  view: "front",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.22,
  feet: { R: { ang: 13, len: 0.4, w: 1.3 }, L: { ang: 13, len: 0.4, w: 1.3 } },
  keys: [
    { // forearms up, hands by the ears
      t: 0,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 88, shoulderL: 88, elbowR: 108, elbowL: 108,
                wristR: 10, wristL: 10, hipR: 4, hipL: 4, kneeR: 3, kneeL: 3 },
    },
    { // halfway round, forearms out at forty five
      t: 0.5,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 88, shoulderL: 88, elbowR: 56, elbowL: 56,
                wristR: 0, wristL: 0, hipR: 4, hipL: 4, kneeR: 3, kneeL: 3 },
    },
    { // forearms swung down the far side of the circle, upper arms unmoved.
      // They stop short of straight on purpose: a straight arm here is a
      // lateral raise, and the bent elbow is the whole point of the drill.
      t: 1,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 88, shoulderL: 88, elbowR: 44, elbowL: 44,
                wristR: -12, wristL: -12, hipR: 4, hipL: 4, kneeR: 3, kneeL: 3 },
    },
  ],
};

// Fingers interlaced in front of the chest, hands circling slowly at the wrist.
// Side view: the hands are together on the midline so nothing is hidden, and the
// hand angle against a still forearm is what the circle actually is. Three keys
// so the hands travel round rather than flapping.
const WRIST_CIRCLES = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.22,
  keys: [
    { // hands low, wrists cocked back
      t: 0,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: 4, wristR: -34, wristL: -30 },
      ik: {
        wristR: { rel: "chest", x: 20, y: 16, bend: 1 }, wristL: { rel: "chest", x: 17, y: 14, bend: 1 },
        ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 },
      },
    },
    { // hands pushed out, wrists neutral
      t: 0.5,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: 3, wristR: 8, wristL: 10 },
      ik: {
        wristR: { rel: "chest", x: 26, y: 10, bend: 1 }, wristL: { rel: "chest", x: 23, y: 8, bend: 1 },
        ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 },
      },
    },
    { // hands high, wrists rolled over the top of the circle
      t: 1,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: 2, wristR: 46, wristL: 44 },
      ik: {
        wristR: { rel: "chest", x: 20, y: 3, bend: 1 }, wristL: { rel: "chest", x: 17, y: 1, bend: 1 },
        ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 },
      },
    },
  ],
};

// Hips stay square to the front while the ribs turn and the loose arms wrap
// around the waist, one in front and one behind. Rotation about the spine is
// invisible side on, so this is the front view: the feet and pelvis never move
// and both arms swing to the same side together, which is what separates it
// from the cross-body swings above.
const TORSO_TWISTS = {
  view: "front",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  feet: { R: { ang: 15, len: 0.42, w: 1.32 }, L: { ang: 15, len: 0.42, w: 1.32 } },
  keys: [
    { // turned left: the right arm wrapped across the waist, the left trailing
      t: 0,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: -70, shoulderL: 24, elbowR: 26, elbowL: 52,
                wristR: 8, wristL: 8, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
    { // turned right, the mirror of it, hips and feet unmoved
      t: 1,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 24, shoulderL: -70, elbowR: 52, elbowL: 26,
                wristR: 8, wristL: 8, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
  ],
};

// Face down, hands ahead of the shoulders, press the chest up and leave the
// hips on the floor. Prone, so root.rot is POSITIVE, which puts the head at +x
// and runs the legs out to -x. The hips staying down is the thing that has to
// be visible, so the pelvis does not move at all between the two keys: only the
// torso rotates up off it.
const PRONE_PRESS_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.6,
  breath: 0.3,
  breathRate: 0.95,
  fit: { k: 0.88, dy: 4 },
  props: [{ type: "mat", x: 6, w: 122 }],
  keys: [
    { // chest low, elbows folded down toward the mat
      t: 0,
      root: { x: 56, y: 108.4, rot: 84 },
      joints: { spine: -14, neck: -16, hipR: -168, hipL: -168, kneeR: 12, kneeL: 12,
                ankleR: -40, ankleL: -40, wristR: -14, wristL: -14 },
      ik: { wristR: { x: 108, y: 113.6, bend: 1 }, wristL: { x: 103, y: 113.6, bend: 1 } },
    },
    { // pressed up, arms nearly straight, hips still flat on the mat
      t: 1,
      root: { x: 56, y: 108.4, rot: 78 },
      joints: { spine: -26, neck: -28, hipR: -162, hipL: -162, kneeR: 12, kneeL: 12,
                ankleR: -40, ankleL: -40, wristR: -6, wristL: -6 },
      ik: { wristR: { x: 108, y: 113.6, bend: 1 }, wristL: { x: 103, y: 113.6, bend: 1 } },
    },
  ],
};

// Lying on the back with the knees bent and the feet flat, rocking the pelvis
// to flatten the low back and releasing. Supine, so root.rot is NEGATIVE: head
// at -x, legs out to +x. The whole move is the pelvis angle, so the feet are
// pinned and nothing else in the picture is allowed to travel.
const PELVIC_TILTS = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.35,
  breathRate: 0.95,
  props: [{ type: "mat", x: 8, w: 120 }],
  keys: [
    { // released: a small arch under the low back
      t: 0,
      root: { x: 76, y: 106.4, rot: -84 },
      joints: { spine: -5, neck: 4, shoulderR: 172, shoulderL: 176, elbowR: 16, elbowL: 12,
                wristR: -8, wristL: -8 },
      ik: { ankleR: { x: 103, y: 113.6, bend: -1 }, ankleL: { x: 98, y: 113.6, bend: -1 } },
    },
    { // tilted: tailbone tucked, low back pressed into the mat
      t: 1,
      root: { x: 75, y: 108.2, rot: -99 },
      joints: { spine: 6, neck: 6, shoulderR: 172, shoulderL: 176, elbowR: 16, elbowL: 12,
                wristR: -8, wristL: -8 },
      ik: { ankleR: { x: 103, y: 113.6, bend: -1 }, ankleL: { x: 98, y: 113.6, bend: -1 } },
    },
  ],
};


// One knee lifted to hip height and drawn round in a circle, standing tall
// rather than leaning away from it. The suggested view was side, where the
// outward half of the circle points at the camera and disappears; front on the
// knee visibly travels up and out, which is the half of the circle worth having.
const HIP_CIRCLES = {
  view: "front",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  farSide: "L",
  feet: { R: { ang: 34, len: 0.6, w: 1.1 }, L: { ang: 12, len: 0.42, w: 1.3 } },
  keys: [
    { // knee lifted in front, low in the circle
      t: 0,
      root: { x: 68, y: 61.6, rot: 0 },
      joints: { spine: -2, neck: 0, hipR: 16, kneeR: 84, shoulderR: 16, shoulderL: 18,
                elbowR: 24, elbowL: 26 },
      ik: { ankleL: { x: 63, y: 113.6, bend: -1 } },
    },
    { // knee swung out to the side, top of the circle
      t: 0.5,
      root: { x: 68, y: 61.6, rot: -3 },
      joints: { spine: -2, neck: 0, hipR: 46, kneeR: 96, shoulderR: 22, shoulderL: 20,
                elbowR: 22, elbowL: 26 },
      ik: { ankleL: { x: 63, y: 113.6, bend: -1 } },
    },
    { // knee dropping back down and in, closing the circle
      t: 1,
      root: { x: 68, y: 61.6, rot: -1 },
      joints: { spine: -2, neck: 0, hipR: 24, kneeR: 44, shoulderR: 18, shoulderL: 18,
                elbowR: 20, elbowL: 26 },
      ik: { ankleL: { x: 63, y: 113.6, bend: -1 } },
    },
  ],
};

// One leg swinging forward and back from the hip while the trunk stays quiet.
// Side view, because forward and back is the sagittal plane. Three keys with the
// leg hanging straight down in the middle, so the swing reads as a pendulum
// through neutral rather than a kick.
const LEG_SWINGS = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  keys: [
    { // swung behind, toe trailing
      t: 0,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: -2, neck: 0, hipR: -30, kneeR: 14, ankleR: 6,
                shoulderR: 26, elbowR: 30, shoulderL: 22, elbowL: 34 },
      ik: { ankleL: { x: 64, y: 113.6, bend: -1 } },
    },
    { // hanging through neutral
      t: 0.5,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, hipR: 2, kneeR: 4, ankleR: 2,
                shoulderR: 22, elbowR: 26, shoulderL: 20, elbowL: 30 },
      ik: { ankleL: { x: 64, y: 113.6, bend: -1 } },
    },
    { // swung forward to hip height, knee long
      t: 1,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: 0, hipR: 76, kneeR: 6, ankleR: -4,
                shoulderR: 18, elbowR: 22, shoulderL: 18, elbowL: 28 },
      ik: { ankleL: { x: 64, y: 113.6, bend: -1 } },
    },
  ],
};

// The same pendulum swung across the body and back out, so the plane is lateral
// and the view has to be the front: side on this move is one leg hidden behind
// the other. The standing knee stays soft and the chest stays square, which is
// why the pelvis does not travel between the keys.
const LATERAL_LEG_SWINGS = {
  view: "front",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  farSide: "L",
  feet: { R: { ang: 48, len: 0.6, w: 1.15 }, L: { ang: 12, len: 0.42, w: 1.3 } },
  keys: [
    { // swung across the standing leg
      t: 0,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, hipR: -28, kneeR: 8, shoulderR: 40, shoulderL: 42,
                elbowR: 16, elbowL: 16 },
      ik: { ankleL: { x: 60, y: 113.6, bend: -1 } },
    },
    { // hanging through neutral
      t: 0.5,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, hipR: 6, kneeR: 22, shoulderR: 34, shoulderL: 36,
                elbowR: 14, elbowL: 14 },
      ik: { ankleL: { x: 60, y: 113.6, bend: -1 } },
    },
    { // swung out wide
      t: 1,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, hipR: 46, kneeR: 6, shoulderR: 38, shoulderL: 40,
                elbowR: 14, elbowL: 14 },
      ik: { ankleL: { x: 60, y: 113.6, bend: -1 } },
    },
  ],
};

// Walking forward kicking a straight leg up to meet the opposite hand, chest
// tall. Side view: the leg and the reaching hand are both travelling in the
// sagittal plane and the picture has to show them meeting, which is the only
// thing that separates this from a leg swing.
const TOY_SOLDIER_KICKS = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.22,
  fit: { k: 0.85, dy: 2 },
  keys: [
    { // between kicks, standing tall
      t: 0,
      root: { x: 62, y: 61.6, rot: 0 },
      joints: { spine: 4, neck: 0, hipR: -6, kneeR: 6, ankleR: 0,
                shoulderR: 24, elbowR: 10, shoulderL: 14, elbowL: 12 },
      ik: { ankleL: { x: 60, y: 113.6, bend: -1 } },
    },
    { // straight leg up, opposite hand reaching down to meet the foot
      t: 1,
      root: { x: 62, y: 61.6, rot: 0 },
      joints: { spine: 40, neck: -16, hipR: 95, kneeR: 3, ankleR: -10,
                shoulderR: 20, elbowR: 2, shoulderL: -30, elbowL: 10 },
      ik: { ankleL: { x: 58, y: 113.6, bend: -1 } },
    },
  ],
};

// One foot lifted clear of the floor, circling at the ankle with the rest of the
// leg still. Side view: the foot angle against a fixed shin is the whole move,
// and three keys take it round rather than flapping it up and down.
const ANKLE_CIRCLES = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.22,
  keys: [
    { // toes pointed down and away
      t: 0,
      root: { x: 64, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: 0, hipR: 55, kneeR: 70, ankleR: -45,
                shoulderR: 20, elbowR: 34, shoulderL: 18, elbowL: 30 },
      ik: { ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
    { // foot level, halfway round
      t: 0.5,
      root: { x: 64, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: 0, hipR: 55, kneeR: 70, ankleR: -4,
                shoulderR: 20, elbowR: 34, shoulderL: 18, elbowL: 30 },
      ik: { ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
    { // toes pulled up, top of the circle
      t: 1,
      root: { x: 64, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: 0, hipR: 55, kneeR: 70, ankleR: 40,
                shoulderR: 20, elbowR: 34, shoulderL: 18, elbowL: 30 },
      ik: { ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
  ],
};

// A deep lunge with one hand on the floor inside the front foot, then the chest
// opens and the other arm reaches for the ceiling. Side view, because the depth
// of the lunge and the back knee are sagittal; the opening is carried by the arm
// travelling from the floor to overhead, which is the part a beginner copies.
const WORLDS_GREATEST_STRETCH = {
  view: "side",
  loop: "pingpong",
  dur: 4.4,
  breath: 0.4,
  breathRate: 0.9,
  fit: { k: 0.88, dy: 2 },
  keys: [
    { // both hands down beside the front foot, back knee low
      t: 0,
      root: { x: 68, y: 96, rot: 0 },
      joints: { spine: 40, neck: -14, hipL: -56, kneeL: 41, ankleL: -23,
                shoulderR: -30, elbowR: 22, wristR: 58 },
      ik: {
        ankleR: { x: 98, y: 113.6, bend: -1 },
        wristL: { x: 95, y: 109, bend: 1 },
      },
    },
    { // chest opens, the free arm reaches for the ceiling and the eyes follow.
      // The reaching arm is authored as angles, not a pin: an ik target present
      // in only one key would be applied across the whole interval.
      t: 1,
      root: { x: 68, y: 96, rot: 0 },
      joints: { spine: 34, neck: -30, hipL: -56, kneeL: 41, ankleL: -23,
                shoulderR: 96, elbowR: 6, wristR: -4 },
      ik: {
        ankleR: { x: 98, y: 113.6, bend: -1 },
        wristL: { x: 95, y: 109, bend: 1 },
      },
    },
  ],
};

// Step into a lunge, then turn the chest over the front leg. The turn is the
// named half of the exercise and it is invisible side on, so this is the front
// view: a split stance with the near knee bent and both arms carried across to
// one side. Shallower than the Cossack Squat below on purpose, so the two do not
// read as the same picture.
const WALKING_LUNGE_WITH_TWIST = {
  view: "front",
  loop: "oneway",
  dur: 3.6,
  breath: 0.25,
  farSide: "L",
  feet: { R: { ang: 8, len: 0.4, w: 1.4 }, L: { ang: 70, len: 0.95, w: 1 } },
  keys: [
    { // standing tall, about to step
      t: 0,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 10, shoulderL: 10, elbowR: 16, elbowL: 16 },
      ik: { ankleR: { x: 74, y: 113.6, bend: -1 }, ankleL: { x: 66, y: 113.6, bend: -1 } },
    },
    { // landed in the lunge, front knee tracking over the foot
      t: 0.55,
      root: { x: 70, y: 74, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 24, shoulderL: 24, elbowR: 58, elbowL: 58 },
      ik: { ankleR: { x: 88, y: 113.6, bend: -1 }, ankleL: { x: 46, y: 113.6, bend: -1 } },
    },
    { // chest turned over the front leg, arms carried across with it
      t: 1,
      root: { x: 70, y: 74, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 86, shoulderL: -40, elbowR: 10, elbowL: 34 },
      ik: { ankleR: { x: 88, y: 113.6, bend: -1 }, ankleL: { x: 46, y: 113.6, bend: -1 } },
    },
  ],
};

// Stand a few inches off a wall and push the hips back until they brush it,
// shins vertical and back flat. Side view: a hinge is sagittal, and the wall
// behind the hips is what turns a bend into a hinge. The figure faces +x so the
// hips travel toward the wall at the left edge.
const WALL_HIP_HINGE_DRILL = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  props: [{ type: "wall", x: 2, w: 14 }],
  keys: [
    { // stood tall, hips just off the wall
      t: 0,
      root: { x: 40, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: 0, shoulderR: 6, elbowR: 14, shoulderL: 4, elbowL: 16 },
      ik: { ankleR: { x: 42, y: 113.6, bend: -1 }, ankleL: { x: 38, y: 113.6, bend: -1 } },
    },
    { // hips pushed back to the wall, back flat, shins still vertical
      t: 1,
      root: { x: 27, y: 66, rot: 0 },
      joints: { spine: 42, neck: -22, shoulderR: -6, elbowR: 10, shoulderL: -8, elbowL: 12 },
      ik: { ankleR: { x: 42, y: 113.6, bend: -1 }, ankleL: { x: 38, y: 113.6, bend: -1 } },
    },
  ],
};

// Hold the toes, sink the hips into a deep squat and lift the chest, then
// straighten the legs without letting go. Side view, and one way: the loop is
// fold, squat, fold, so the end of the cycle is the pose it started in and the
// snap back is invisible. The hands stay pinned near the feet throughout, which
// is the instruction that makes the drill work.
const SQUAT_TO_STAND = {
  view: "side",
  loop: "oneway",
  dur: 4.6,
  breath: 0.3,
  keys: [
    { // folded over straight legs, hands at the toes
      t: 0,
      root: { x: 64, y: 61.6, rot: 55 },
      joints: { spine: 58, neck: -20 },
      ik: {
        ankleR: { x: 66, y: 113.6, bend: -1 }, ankleL: { x: 61, y: 113.6, bend: -1 },
        wristR: { x: 73, y: 104, bend: 1 }, wristL: { x: 68, y: 105, bend: 1 },
      },
    },
    { // bottom of the squat, heels down, chest lifted
      t: 0.5,
      root: { x: 51, y: 90, rot: 15 },
      joints: { spine: 15, neck: -14 },
      ik: {
        ankleR: { x: 66, y: 113.6, bend: -1 }, ankleL: { x: 61, y: 113.6, bend: -1 },
        wristR: { x: 73, y: 104, bend: 1 }, wristL: { x: 68, y: 105, bend: 1 },
      },
    },
    { // stood the legs back up, still holding on
      t: 1,
      root: { x: 64, y: 61.6, rot: 55 },
      joints: { spine: 58, neck: -20 },
      ik: {
        ankleR: { x: 66, y: 113.6, bend: -1 }, ankleL: { x: 61, y: 113.6, bend: -1 },
        wristR: { x: 73, y: 104, bend: 1 }, wristL: { x: 68, y: 105, bend: 1 },
      },
    },
  ],
};

// Toes a hand's width from a wall, knee driven forward past the toes with the
// heel glued to the floor. Side view: the knee travelling over the toe is the
// measurement, and the wall is what makes it one. The heel never leaves the pin.
const KNEE_TO_WALL_ANKLE_ROCK = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  props: [{ type: "wall", x: 116, w: 22 }],
  keys: [
    { // shin vertical, knee behind the toes
      t: 0,
      root: { x: 84, y: 68, rot: 0 },
      joints: { spine: 6, neck: 0, hipL: -17, kneeL: 39, ankleL: 5 },
      ik: {
        ankleR: { x: 100, y: 113.6, bend: -1 },
        wristR: { x: 113, y: 54, bend: 1 },
      },
    },
    { // knee driven forward to the wall, front heel still glued down. The back
      // foot is authored rather than pinned because its heel comes up, and a
      // pinned ankle is a flat foot by definition.
      t: 1,
      root: { x: 90, y: 72, rot: 0 },
      joints: { spine: 10, neck: -2, hipL: -28, kneeL: 33, ankleL: 11 },
      ik: {
        ankleR: { x: 100, y: 113.6, bend: -1 },
        wristR: { x: 113, y: 54, bend: 1 },
      },
    },
  ],
};


// Fold to the floor, walk the hands out to a plank and walk the feet back in.
// One way, three keys, fold to plank to fold, so the end of the cycle is the
// pose it began in. Side view: the whole drill is travel along the floor. The
// feet are pinned for all three keys, which is what makes the hands do the
// walking, and it costs a flat foot in the plank where the toes would be tucked.
const INCHWORM_WALKOUT = {
  view: "side",
  loop: "oneway",
  dur: 5.4,
  breath: 0.25,
  fit: { k: 0.72, dy: 8 },
  keys: [
    { // folded over, hands about to land in front of the feet
      t: 0,
      root: { x: 30, y: 63.5, rot: 55 },
      joints: { spine: 58, neck: -18, hipR: -34, hipL: -34, kneeR: 72, kneeL: 72,
                ankleR: 2, ankleL: 2, wristR: 74, wristL: 74 },
      ik: { wristR: { x: 44, y: 109, bend: 1 }, wristL: { x: 39, y: 109, bend: 1 } },
    },
    { // halfway out, hips high. This key exists so the walk passes through a
      // real pose: with only fold and plank the interpolation swings the feet
      // through the floor on the way.
      t: 0.25,
      root: { x: 56, y: 71.5, rot: 100 },
      joints: { spine: 20, neck: -22, hipR: -132, hipL: -132, kneeR: 31, kneeL: 31,
                ankleR: 20, ankleL: 20, wristR: 80, wristL: 80 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 93, y: 114.6, bend: 1 } },
    },
    { // walked out to a plank, one line from heel to head, hips not sagging.
      // The legs are authored rather than pinned: the toes are tucked under,
      // and a pinned ankle is a flat foot by definition.
      t: 0.5,
      root: { x: 75.3, y: 86.4, rot: 72 },
      joints: { spine: 0, neck: -24, hipR: -144, hipL: -144, kneeR: 2, kneeL: 2,
                ankleR: -44, ankleL: -44, wristR: 84, wristL: 84 },
      ik: { wristR: { x: 126, y: 114.6, bend: 1 }, wristL: { x: 121, y: 114.6, bend: 1 } },
    },
    { // walking the hands back in, hips high again
      t: 0.75,
      root: { x: 56, y: 71.5, rot: 100 },
      joints: { spine: 20, neck: -22, hipR: -132, hipL: -132, kneeR: 31, kneeL: 31,
                ankleR: 20, ankleL: 20, wristR: 80, wristL: 80 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 93, y: 114.6, bend: 1 } },
    },
    { // back to the fold it started in, so the loop closes on itself
      t: 1,
      root: { x: 30, y: 63.5, rot: 55 },
      joints: { spine: 58, neck: -18, hipR: -34, hipL: -34, kneeR: 72, kneeL: 72,
                ankleR: 2, ankleL: 2, wristR: 74, wristL: 74 },
      ik: { wristR: { x: 44, y: 109, bend: 1 }, wristL: { x: 39, y: 109, bend: 1 } },
    },
  ],
};

// Band anchored high in front, elbows locked, hands pulled down to the thighs.
// Side view: the arc the straight arm travels is sagittal, and the cable line
// from a high anchor to the hand is what says which way the load pulls. The
// elbow angle is deliberately unchanged between the keys, because a bent elbow
// turns this into a pulldown.
const STRAIGHT_ARM_BAND_PULLDOWN = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  props: [{
    type: "band", rest: 16,
    from: { x: 100, y: 6 }, to: { side: "R", point: "hand" }, front: true,
  }],
  keys: [
    { // start, arms long and high toward the anchor
      t: 0,
      root: { x: 60, y: 61.6, rot: 0 },
      joints: { spine: 4, neck: -6, shoulderR: 130, shoulderL: 126, elbowR: 4, elbowL: 4,
                wristR: -6, wristL: -6 },
      ik: { ankleR: { x: 62, y: 113.6, bend: -1 }, ankleL: { x: 57, y: 113.6, bend: -1 } },
    },
    { // finish, hands at the thighs, elbows still locked
      t: 1,
      root: { x: 60, y: 61.6, rot: 0 },
      joints: { spine: 8, neck: -2, shoulderR: -10, shoulderL: -6, elbowR: 4, elbowL: 4,
                wristR: -6, wristL: -6 },
      ik: { ankleR: { x: 62, y: 113.6, bend: -1 }, ankleL: { x: 57, y: 113.6, bend: -1 } },
    },
  ],
};

// Face down with the arms out in a Y, lifting the thumbs a couple of inches off
// the floor. Seen from above and behind, which is the only view where a Y is a
// Y: side on it is two arms hidden behind a head. There is no floor line drawn,
// because a floor drawn at the bottom of a view that is looking down at the
// figure reads as the figure standing up.
const PRONE_Y_RAISE = {
  view: "front",
  facing: "away",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.3,
  floor: false,
  feet: { R: { ang: 7, len: 0.95, w: 0.95 }, L: { ang: 7, len: 0.95, w: 0.95 } },
  keys: [
    { // arms resting in the Y, thumbs on the floor
      t: 0,
      root: { x: 70, y: 54, rot: 0 },
      joints: { spine: 2, neck: 4, shoulderR: 143, shoulderL: 143, elbowR: 14, elbowL: 14,
                wristR: -6, wristL: -6, hipR: 3, hipL: 3, kneeR: 2, kneeL: 2 },
    },
    { // lifted: small and slow, the low traps do this one
      t: 1,
      root: { x: 70, y: 54, rot: 0 },
      joints: { spine: -4, neck: -2, shoulderR: 157, shoulderL: 157, elbowR: 8, elbowL: 8,
                wristR: -2, wristL: -2, hipR: 3, hipL: 3, kneeR: 2, kneeL: 2 },
    },
  ],
};

// In a plank on straight arms, let the chest sink between the shoulder blades,
// then push the floor away. The suggested view was back, where a plank seen from
// above hides the sink entirely. Side on, the chest dropping while the elbows
// stay locked is exactly what the picture has to prove, so this deviates.
const SCAPULAR_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  keys: [
    { // pushed away, upper back rounded up between the arms
      t: 0,
      root: { x: 69.6, y: 85.6, rot: 68 },
      joints: { spine: 4, neck: -22, hipL: -138, hipR: -138, kneeL: 2, kneeR: 2,
                ankleL: -12, ankleR: -12, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 92, y: 114.6, bend: 1 } },
    },
    { // sunk, chest dropped between the blades, elbows still straight
      t: 1,
      root: { x: 68.4, y: 89.4, rot: 71 },
      joints: { spine: -4, neck: -26, hipL: -145, hipR: -145, kneeL: 2, kneeR: 2,
                ankleL: -8, ankleR: -8, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 92, y: 114.6, bend: 1 } },
    },
  ],
};

// Elbow pinned to the side and bent to a right angle, the forearm turning
// outward against a band anchored across the body. Front view, because the turn
// is lateral. The rig has one hinge at the elbow, so the start is the forearm
// angled down and in rather than fully across the belly; the pinned elbow and
// the band crossing the body are what make it a rotation and not a pull.
const BAND_SHOULDER_EXTERNAL_ROTATION = {
  view: "front",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  farSide: "L",
  feet: { R: { ang: 13, len: 0.4, w: 1.3 }, L: { ang: 13, len: 0.4, w: 1.3 } },
  props: [{
    type: "band", rest: 68,
    from: { x: 6, y: 78 }, to: { side: "R", point: "hand" }, front: true,
  }],
  keys: [
    { // start, forearm turned in toward the body
      t: 0,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 4, elbowR: -64, wristR: 6,
                shoulderL: 6, elbowL: 10, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
    { // finish, forearm turned out, elbow still against the ribs
      t: 1,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 4, elbowR: 94, wristR: -4,
                shoulderL: 6, elbowL: 10, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
  ],
};

// On all fours with the palms flat, rocking the shoulders forward over the hands
// and back. Side view: the travel is sagittal and the angle between the forearm
// and the floor is the whole point. The hands stay pinned, so the load on the
// wrist is the body moving over them.
const QUADRUPED_WRIST_ROCKS = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  props: [{ type: "mat", x: 10, w: 118 }],
  keys: [
    { // rocked back, shoulders behind the hands
      t: 0,
      root: { x: 48, y: 84.7, rot: 90 },
      joints: { spine: 0, neck: -14, hipR: -90, hipL: -90, kneeR: 94, kneeL: 94,
                ankleR: -58, ankleL: -58, wristR: 54, wristL: 54 },
      ik: { wristR: { x: 94, y: 114.6, bend: 1 }, wristL: { x: 89, y: 114.6, bend: 1 } },
    },
    { // rocked forward over the hands, wrists working
      t: 1,
      root: { x: 56, y: 84.7, rot: 90 },
      joints: { spine: 0, neck: -18, hipR: -90, hipL: -90, kneeR: 94, kneeL: 94,
                ankleR: -58, ankleL: -58, wristR: 68, wristL: 68 },
      ik: { wristR: { x: 94, y: 114.6, bend: 1 }, wristL: { x: 89, y: 114.6, bend: 1 } },
    },
  ],
};

// One arm drawn across the chest with the other forearm holding it there,
// shoulder down rather than shrugged. Front view: the arm crossing the midline
// is the exercise and side on it points straight at the camera. The rig caps
// adduction to the far side, so the arm is drawn where it really sits: straight
// across the chest, with the other forearm folded up under it.
const CROSS_BODY_SHOULDER_STRETCH = {
  view: "front",
  loop: "hold",
  dur: 5.6,
  breath: 1.0,
  breathRate: 0.85,
  farSide: "L",
  feet: { R: { ang: 13, len: 0.4, w: 1.3 }, L: { ang: 13, len: 0.4, w: 1.3 } },
  keys: [
    { // settled, right arm across, left forearm hooked over it
      t: 0,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 2, shoulderR: -76, elbowR: 8, wristR: 6,
                shoulderL: 0, elbowL: 150, wristL: 10, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
    { // drawn a touch further across on the exhale
      t: 1,
      root: { x: 70, y: 61.8, rot: 0 },
      joints: { spine: 0, neck: 3, shoulderR: -82, elbowR: 10, wristR: 6,
                shoulderL: 0, elbowL: 156, wristL: 10, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
  ],
};

// Hand behind the neck, the other hand pressing the elbow back, ribs down. Side
// view as suggested: the press is backwards, which is sagittal, and the far arm
// draws in the dimmer tone so the two arms above the head stay readable.
const OVERHEAD_TRICEPS_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 5.6,
  breath: 1.0,
  breathRate: 0.85,
  keys: [
    { // settled, elbow up, hand behind the neck
      t: 0,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 4, neck: -4, shoulderR: 160, elbowR: 130, wristR: 10,
                shoulderL: 120, elbowL: 100, wristL: -10 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 63, y: 113.6, bend: -1 } },
    },
    { // elbow pressed a little further back on the exhale
      t: 1,
      root: { x: 66, y: 61.8, rot: 0 },
      joints: { spine: 2, neck: -6, shoulderR: 166, elbowR: 134, wristR: 10,
                shoulderL: 124, elbowL: 104, wristL: -10 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 63, y: 113.6, bend: -1 } },
    },
  ],
};

// Ear toward one shoulder while the opposite arm hangs heavy. The tilt is
// lateral, so the suggested side view would hide it completely: front on, the
// neck angle draws as exactly what it is, the head falling toward the shoulder.
// No hand on the head, because the cue says not to pull.
const UPPER_TRAP_STRETCH = {
  view: "front",
  loop: "hold",
  dur: 5.4,
  breath: 1.0,
  breathRate: 0.85,
  feet: { R: { ang: 13, len: 0.4, w: 1.3 }, L: { ang: 13, len: 0.4, w: 1.3 } },
  keys: [
    { // settled, head tipped toward the right shoulder
      t: 0,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: 26, shoulderR: 4, elbowR: 10, wristR: -4,
                shoulderL: -12, elbowL: 2, wristL: -8, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
    { // a degree or two further on the exhale, left arm still long
      t: 1,
      root: { x: 70, y: 61.8, rot: 0 },
      joints: { spine: 3, neck: 31, shoulderR: 4, elbowR: 10, wristR: -4,
                shoulderL: -15, elbowL: 0, wristL: -8, hipR: 5, hipL: 5, kneeR: 3, kneeL: 3 },
    },
  ],
};

// Arm straight out in front, fingers pointing up, the other hand drawing the
// hand back with the elbow locked. Side view: the arm is straight out in the
// sagittal plane and the wrist angle against a straight forearm is the whole
// picture. The helping hand is pinned a little short of the fingers so the two
// hands do not merge into one blob.
const WRIST_FLEXOR_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 5.2,
  breath: 1.0,
  breathRate: 0.85,
  keys: [
    { // settled, fingers up, elbow locked out
      t: 0,
      root: { x: 62, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: -2, shoulderR: 86, elbowR: 2, wristR: 88 },
      ik: {
        wristL: { x: 96, y: 30, bend: 1 },
        ankleR: { x: 64, y: 113.6, bend: -1 }, ankleL: { x: 59, y: 113.6, bend: -1 },
      },
    },
    { // hand drawn back a touch further on the exhale
      t: 1,
      root: { x: 62, y: 61.8, rot: 0 },
      joints: { spine: 2, neck: -2, shoulderR: 88, elbowR: 0, wristR: 96 },
      ik: {
        wristL: { x: 95, y: 28, bend: 1 },
        ankleR: { x: 64, y: 113.6, bend: -1 }, ankleL: { x: 59, y: 113.6, bend: -1 },
      },
    },
  ],
};


// On all fours, one arm slides under the other until the shoulder and the side
// of the head rest on the floor while the hips stay up over the knees. Side
// view: the threading arm runs away from the camera, so what carries the move
// is the silhouette, hips high and one shoulder down on the floor, which no
// other move in this library makes.
const THREAD_THE_NEEDLE_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 5.8,
  breath: 0.9,
  breathRate: 0.8,
  props: [{ type: "mat", x: 8, w: 120 }],
  keys: [
    { // settled, shoulder and ear down, hips over the knees
      t: 0,
      root: { x: 48, y: 84.7, rot: 105 },
      joints: { spine: 20, neck: -30, hipR: -105, hipL: -105, kneeR: 94, kneeL: 94,
                ankleR: -50, ankleL: -50, wristR: 30, wristL: 30 },
      ik: {
        wristR: { x: 98, y: 109, bend: 1 }, wristL: { x: 86, y: 103, bend: 1 },
      },
    },
    { // a touch deeper on the exhale, hips unmoved
      t: 1,
      root: { x: 48, y: 85.6, rot: 107 },
      joints: { spine: 21, neck: -31, hipR: -107, hipL: -107, kneeR: 94, kneeL: 94,
                ankleR: -50, ankleL: -50, wristR: 30, wristL: 30 },
      ik: {
        wristR: { x: 100, y: 109, bend: 1 }, wristL: { x: 88, y: 103, bend: 1 },
      },
    },
  ],
};

// Kneeling with the elbows up on a bench and the chest sinking toward the floor
// between them. Side view, because the sink is sagittal and the bench under the
// elbows is what makes the hang a lat stretch instead of a child's pose.
const KNEELING_LAT_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  props: [{ type: "bench", x: 74, y: 88, w: 44 }],
  keys: [
    { // settled, arms long onto the pad, chest between them
      t: 0,
      root: { x: 50, y: 86, rot: 90 },
      joints: { spine: 7, neck: -26, hipR: -90, hipL: -90, kneeR: 105, kneeL: 105,
                ankleR: -50, ankleL: -50, wristR: 10, wristL: 10 },
      ik: { wristR: { x: 104, y: 84, bend: 1 }, wristL: { x: 99, y: 85, bend: 1 } },
    },
    { // chest sinks a little further on the exhale
      t: 1,
      root: { x: 50, y: 87.5, rot: 90 },
      joints: { spine: 12, neck: -28, hipR: -90, hipL: -90, kneeR: 105, kneeL: 105,
                ankleR: -50, ankleL: -50, wristR: 10, wristL: 10 },
      ik: { wristR: { x: 104, y: 84, bend: 1 }, wristL: { x: 99, y: 85, bend: 1 } },
    },
  ],
};

// Palm flat on a wall behind the body, then the body turns away from it. Side
// view as suggested: an arm held behind is a sagittal shape and the wall is
// what gives the hand something to stay on. The arm cannot reach true shoulder
// height behind without leaving the rig's shoulder range, so it sits a little
// below, which is also how most people find the stretch.
const BICEPS_WALL_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 5.6,
  breath: 1.0,
  breathRate: 0.85,
  props: [{ type: "wall", x: 4, w: 12 }],
  keys: [
    { // hand planted, arm long behind
      t: 0,
      root: { x: 44, y: 61.6, rot: 0 },
      joints: { spine: 4, neck: 2, shoulderR: -52, elbowR: 0, wristR: -42,
                shoulderL: 8, elbowL: 14, wristL: -4 },
      ik: { ankleR: { x: 46, y: 113.6, bend: -1 }, ankleL: { x: 41, y: 113.6, bend: -1 } },
    },
    { // body turns away from the planted hand on the exhale
      t: 1,
      root: { x: 47, y: 61.8, rot: 0 },
      joints: { spine: 6, neck: 3, shoulderR: -56, elbowR: 0, wristR: -46,
                shoulderL: 10, elbowL: 16, wristL: -4 },
      ik: { ankleR: { x: 49, y: 113.6, bend: -1 }, ankleL: { x: 44, y: 113.6, bend: -1 } },
    },
  ],
};

// The mirror of the flexor stretch: arm straight out, fingers pointing DOWN,
// the other hand pressing the back of the hand toward the body. Side view for
// the same reason, and the two are deliberately identical apart from the wrist,
// because that is the only difference in the exercise.
const WRIST_EXTENSOR_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 5.2,
  breath: 1.0,
  breathRate: 0.85,
  keys: [
    { // settled, fingers down, elbow locked out
      t: 0,
      root: { x: 62, y: 61.6, rot: 0 },
      joints: { spine: 2, neck: -2, shoulderR: 86, elbowR: 2, wristR: -86 },
      ik: {
        wristL: { x: 94, y: 44, bend: 1 },
        ankleR: { x: 64, y: 113.6, bend: -1 }, ankleL: { x: 59, y: 113.6, bend: -1 },
      },
    },
    { // pressed a touch further on the exhale
      t: 1,
      root: { x: 62, y: 61.8, rot: 0 },
      joints: { spine: 2, neck: -2, shoulderR: 88, elbowR: 0, wristR: -94 },
      ik: {
        wristL: { x: 93, y: 46, bend: 1 },
        ankleR: { x: 64, y: 113.6, bend: -1 }, ankleL: { x: 59, y: 113.6, bend: -1 },
      },
    },
  ],
};

// Face down on the forearms, elbows under the shoulders, hips heavy on the
// floor. Prone, so root.rot is positive and the head runs out to +x. The one
// thing that has to be visible is the forearms flat on the floor with the hips
// still down, which is what separates it from the press-up above.
const SPHINX_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 0.9,
  breathRate: 0.8,
  fit: { k: 0.88, dy: 4 },
  props: [{ type: "mat", x: 6, w: 122 }],
  keys: [
    { // settled on the forearms, front of the body long
      t: 0,
      root: { x: 56, y: 108.4, rot: 78 },
      joints: { spine: -22, neck: -22, hipR: -162, hipL: -162, kneeR: 12, kneeL: 12,
                ankleR: -40, ankleL: -40, wristR: 40, wristL: 40 },
      ik: { wristR: { x: 105, y: 113.6, bend: 1 }, wristL: { x: 100, y: 113.6, bend: 1 } },
    },
    { // chest lifts a fraction with the breath, hips unmoved
      t: 1,
      root: { x: 56, y: 108.4, rot: 76 },
      joints: { spine: -25, neck: -25, hipR: -160, hipL: -160, kneeR: 12, kneeL: 12,
                ankleR: -40, ankleL: -40, wristR: 40, wristL: 40 },
      ik: { wristR: { x: 105, y: 113.6, bend: 1 }, wristL: { x: 100, y: 113.6, bend: 1 } },
    },
  ],
};

// Sitting tall with one knee crossed over and planted, the opposite arm hooked
// over that knee and the other hand braced on the floor behind. Side view: the
// turn itself is invisible from anywhere, so the picture has to carry the setup
// instead, and the braced hand behind plus the arm levering on the raised knee
// is the setup nobody else in this library has.
const SEATED_SPINAL_TWIST = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  props: [{ type: "mat", x: 20, w: 108 }],
  keys: [
    { // sat tall, crossed foot planted, hand braced behind
      t: 0,
      root: { x: 56, y: 106, rot: 0 },
      joints: { spine: -4, neck: -2, hipR: 130, kneeR: 149,
                hipL: 84, kneeL: -4, ankleL: -50 },
      ik: {
        wristR: { x: 80, y: 92, bend: 1 }, wristL: { x: 38, y: 110, bend: 1 },
      },
    },
    { // grows taller on the inhale and levers a degree further on the exhale
      t: 1,
      root: { x: 56, y: 105, rot: -2 },
      joints: { spine: -6, neck: -3, hipR: 132, kneeR: 149,
                hipL: 84, kneeL: -4, ankleL: -50 },
      ik: {
        wristR: { x: 78, y: 90, bend: 1 }, wristL: { x: 37, y: 110, bend: 1 },
      },
    },
  ],
};

// One arm overhead, leaning sideways with both feet planted evenly. Lateral, so
// it has to be the front view: side on a sideways lean is a figure standing
// still. In the front view the spine angle draws as exactly what it is, the
// trunk falling to one side, and the low arm hangs vertically through it.
const STANDING_SIDE_BEND_STRETCH = {
  view: "front",
  loop: "hold",
  dur: 5.6,
  breath: 1.0,
  breathRate: 0.85,
  feet: { R: { ang: 13, len: 0.42, w: 1.3 }, L: { ang: 13, len: 0.42, w: 1.3 } },
  keys: [
    { // settled into the bend, top arm reaching over
      t: 0,
      root: { x: 68, y: 61.6, rot: 0 },
      joints: { spine: 22, neck: 4, shoulderR: 138, elbowR: 12, wristR: -6,
                shoulderL: -22, elbowL: 6, wristL: -4 },
      ik: { ankleR: { x: 76, y: 113.6, bend: -1 }, ankleL: { x: 64, y: 113.6, bend: -1 } },
    },
    { // reaches a little longer on the exhale, feet still even
      t: 1,
      root: { x: 68.5, y: 61.8, rot: 0 },
      joints: { spine: 26, neck: 5, shoulderR: 142, elbowR: 8, wristR: -4,
                shoulderL: -26, elbowL: 4, wristL: -4 },
      ik: { ankleR: { x: 76, y: 113.6, bend: -1 }, ankleL: { x: 64, y: 113.6, bend: -1 } },
    },
  ],
};

// On the back, both knees hugged in to the chest with the low back flat on the
// floor. Supine, so root.rot is negative: head at -x, legs out to +x. Side view,
// because the fold is sagittal and the hands wrapped around the shins are what
// says hug rather than lie.
const KNEES_TO_CHEST_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 0.9,
  breathRate: 0.8,
  props: [{ type: "mat", x: 8, w: 120 }],
  keys: [
    { // settled, knees in, back flat
      t: 0,
      root: { x: 76, y: 106, rot: -90 },
      joints: { spine: 0, neck: 6, hipR: -40, hipL: -44, kneeR: 120, kneeL: 118 },
      ik: { wristR: { x: 68, y: 84, bend: 1 }, wristL: { x: 64, y: 88, bend: 1 } },
    },
    { // drawn a touch closer on the exhale
      t: 1,
      root: { x: 76, y: 106.6, rot: -90 },
      joints: { spine: 2, neck: 8, hipR: -36, hipL: -40, kneeR: 124, kneeL: 122 },
      ik: { wristR: { x: 66, y: 82, bend: 1 }, wristL: { x: 62, y: 86, bend: 1 } },
    },
  ],
};

// On the back with one ankle crossed over the opposite thigh and that thigh
// drawn toward the chest. Side view. The crossed knee really falls out toward
// the camera, which no 2D view can show, so it is drawn as the shin crossing
// over the lifted thigh: that crossing is the shape people recognise, and the
// hands pulling the far thigh in carry the rest.
const FIGURE_FOUR_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 0.9,
  breathRate: 0.8,
  props: [{ type: "mat", x: 8, w: 120 }],
  keys: [
    { // settled, shin crossing the lifted thigh, head heavy on the floor
      t: 0,
      root: { x: 76, y: 106, rot: -90 },
      joints: { spine: 0, neck: 6, hipR: -42, kneeR: 145, hipL: -65, kneeL: 95 },
      ik: { wristR: { x: 68, y: 97, bend: 1 }, wristL: { x: 72, y: 101, bend: 1 } },
    },
    { // far thigh drawn a little closer on the exhale
      t: 1,
      root: { x: 76, y: 106.6, rot: -90 },
      joints: { spine: 1, neck: 7, hipR: -40, kneeR: 145, hipL: -61, kneeL: 95 },
      ik: { wristR: { x: 66, y: 95, bend: 1 }, wristL: { x: 70, y: 99, bend: 1 } },
    },
  ],
};

// Half kneeling with the back knee down, the pelvis tucked under before any
// weight shifts forward. Side view: the tuck and the shift are both sagittal.
// The tuck is the stretch, so the two keys differ mostly in the pelvis angle
// rather than in how far the body travels.
const KNEELING_HIP_FLEXOR_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 0.9,
  breathRate: 0.8,
  props: [{ type: "mat", x: 8, w: 120 }],
  keys: [
    { // set up, pelvis neutral
      t: 0,
      root: { x: 56, y: 86, rot: 4 },
      joints: { spine: 2, neck: -2, hipL: -22, kneeL: 77, ankleL: -50,
                shoulderR: -12, elbowR: 62, shoulderL: -14, elbowL: 64 },
      ik: { ankleR: { x: 84, y: 113.6, bend: -1 } },
    },
    { // tailbone tucked under and an inch of forward shift, no more
      t: 1,
      root: { x: 58, y: 86, rot: -10 },
      joints: { spine: 4, neck: -3, hipL: -8, kneeL: 77, ankleL: -50,
                shoulderR: -12, elbowR: 62, shoulderL: -14, elbowL: 64 },
      ik: { ankleR: { x: 84, y: 113.6, bend: -1 } },
    },
  ],
};


// Half kneeling with the back shin up a wall behind, front foot planted, back
// glute squeezed. Side view: the shin running up the wall behind the body is
// the whole setup and it only exists in the sagittal plane.
const COUCH_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.8,
  props: [{ type: "wall", x: 4, w: 12 }, { type: "mat", x: 18, w: 106 }],
  keys: [
    { // settled, back shin up the wall, front shin vertical
      t: 0,
      root: { x: 38, y: 88, rot: 6 },
      joints: { spine: 2, neck: -2, hipL: -35, kneeL: 137, ankleL: -58 },
      ik: {
        ankleR: { x: 66, y: 113.6, bend: -1 },
        wristR: { x: 60, y: 86, bend: 1 }, wristL: { x: 55, y: 88, bend: 1 },
      },
    },
    { // pelvis tucks and the chest comes up a degree on the exhale
      t: 1,
      root: { x: 39, y: 88, rot: -2 },
      joints: { spine: 4, neck: -3, hipL: -27, kneeL: 137, ankleL: -58 },
      ik: {
        ankleR: { x: 66, y: 113.6, bend: -1 },
        wristR: { x: 61, y: 85, bend: 1 }, wristL: { x: 56, y: 87, bend: 1 },
      },
    },
  ],
};

// Knees wide with the shins in line behind them, forearms down, rocking the
// hips back. Front view as suggested, which here is the view from above the
// figure: that is the only one where both knees are visible and the M of the
// wide legs reads. No floor line, because the floor is behind the figure.
const FROG_STRETCH = {
  view: "front",
  loop: "hold",
  dur: 6.2,
  breath: 0.9,
  breathRate: 0.8,
  floor: false,
  feet: { R: { ang: 150, len: 0.8, w: 1 }, L: { ang: 150, len: 0.8, w: 1 } },
  keys: [
    { // settled, knees wide, shins in line with the thighs
      t: 0,
      root: { x: 70, y: 66, rot: 0 },
      joints: { spine: 0, neck: -6, hipR: 76, hipL: 76, kneeR: 92, kneeL: 92,
                shoulderR: 24, shoulderL: 24, elbowR: 104, elbowL: 104,
                wristR: 10, wristL: 10 },
    },
    { // rocked back slowly, hips travelling away from the hands
      t: 1,
      root: { x: 70, y: 60, rot: 0 },
      joints: { spine: 0, neck: -8, hipR: 82, hipL: 82, kneeR: 96, kneeL: 96,
                shoulderR: 20, shoulderL: 20, elbowR: 118, elbowL: 118,
                wristR: 10, wristL: 10 },
    },
  ],
};

// Heel out in front with the toes up, hinging at the hip with a flat back. Side
// view: hinge and flat back are sagittal, and the lifted toes on the front foot
// are what separate this from a forward fold. The front foot is authored rather
// than pinned, because a pinned ankle is a flat foot.
const STANDING_HAMSTRING_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 5.8,
  breath: 1.0,
  breathRate: 0.85,
  keys: [
    { // settled into the hinge, front leg long, back flat
      t: 0,
      root: { x: 62, y: 66, rot: 10 },
      joints: { spine: 38, neck: -14, hipR: 13, kneeR: 6, ankleR: 23 },
      ik: {
        ankleL: { x: 56, y: 113.6, bend: -1 },
        wristR: { x: 88, y: 82, bend: 1 }, wristL: { x: 83, y: 84, bend: 1 },
      },
    },
    { // hinges a degree further on the exhale, spine still flat
      t: 1,
      root: { x: 61, y: 67, rot: 12 },
      joints: { spine: 42, neck: -16, hipR: 13, kneeR: 4, ankleR: 26 },
      ik: {
        ankleL: { x: 56, y: 113.6, bend: -1 },
        wristR: { x: 88, y: 86, bend: 1 }, wristL: { x: 83, y: 88, bend: 1 },
      },
    },
  ],
};

// On the back, one leg drawn up with a strap around the foot and the other leg
// left on the floor. Supine, so root.rot is negative: head at -x, legs to +x.
// Side view, and the strap is drawn as a band from the hand to the foot, which
// is what lets the hands stay low while the leg goes past their reach.
const SUPINE_HAMSTRING_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 6.2,
  breath: 0.9,
  breathRate: 0.8,
  props: [
    { type: "mat", x: 8, w: 120 },
    { type: "band", rest: 0, from: { side: "R", point: "hand" }, to: { side: "R", point: "toe" }, front: true },
  ],
  keys: [
    { // settled, working leg up, other leg heavy on the mat
      t: 0,
      root: { x: 60, y: 106, rot: -90 },
      joints: { spine: 0, neck: 6, hipR: -90, kneeR: 6, ankleR: 10,
                hipL: 180, kneeL: 2, ankleL: -30 },
      ik: { wristR: { x: 50, y: 88, bend: 1 }, wristL: { x: 46, y: 92, bend: 1 } },
    },
    { // drawn a little closer on the exhale, knee still soft
      t: 1,
      root: { x: 60, y: 106.6, rot: -90 },
      joints: { spine: 1, neck: 7, hipR: -98, kneeR: 4, ankleR: 14,
                hipL: 180, kneeL: 2, ankleL: -30 },
      ik: { wristR: { x: 48, y: 86, bend: 1 }, wristL: { x: 44, y: 90, bend: 1 } },
    },
  ],
};

// Hands on a wall, back leg straight with the heel pinned to the floor and the
// hips travelling forward. Side view: the straight back leg and the heel down
// are a sagittal line, and the wall is what the hands push into.
const STANDING_CALF_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 5.8,
  breath: 1.0,
  breathRate: 0.85,
  props: [{ type: "wall", x: 116, w: 22 }],
  keys: [
    { // settled, back leg long, heel down
      t: 0,
      root: { x: 82, y: 68, rot: 0 },
      joints: { spine: 14, neck: -8 },
      ik: {
        ankleR: { x: 98, y: 113.6, bend: -1 }, ankleL: { x: 58, y: 113.6, bend: -1 },
        wristR: { x: 113, y: 44, bend: 1 }, wristL: { x: 113, y: 50, bend: 1 },
      },
    },
    { // hips travel a little further forward on the exhale
      t: 1,
      root: { x: 84, y: 68, rot: 0 },
      joints: { spine: 16, neck: -9 },
      ik: {
        ankleR: { x: 98, y: 113.6, bend: -1 }, ankleL: { x: 58, y: 113.6, bend: -1 },
        wristR: { x: 113, y: 44, bend: 1 }, wristL: { x: 113, y: 50, bend: 1 },
      },
    },
  ],
};

// The same wall position with the back knee bent, which drops the stretch from
// the calf to the soleus. Side view, and deliberately the same framing as the
// stretch above so the only difference a user sees is the one that matters: the
// back knee bent and the back foot closer in.
const BENT_KNEE_CALF_STRETCH = {
  view: "side",
  loop: "hold",
  dur: 5.8,
  breath: 1.0,
  breathRate: 0.85,
  props: [{ type: "wall", x: 116, w: 22 }],
  keys: [
    { // settled, back knee bent, heel still down
      t: 0,
      root: { x: 72, y: 67, rot: 0 },
      joints: { spine: 14, neck: -8 },
      ik: {
        ankleR: { x: 94, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 },
        wristR: { x: 113, y: 46, bend: 1 }, wristL: { x: 113, y: 52, bend: 1 },
      },
    },
    { // sinks a little further into the back knee on the exhale
      t: 1,
      root: { x: 73, y: 69, rot: 0 },
      joints: { spine: 15, neck: -9 },
      ik: {
        ankleR: { x: 94, y: 113.6, bend: -1 }, ankleL: { x: 62, y: 113.6, bend: -1 },
        wristR: { x: 113, y: 46, bend: 1 }, wristL: { x: 113, y: 52, bend: 1 },
      },
    },
  ],
};

// Sitting with both knees at right angles, one leg in front and one out to the
// side, then rotating the whole lot over to the other side. Front view, which
// here is from above: the switch is a rotation about the vertical axis and side
// on it is one leg hiding the other. No floor line, for the same reason as the
// frog: the floor is behind the figure, not below it.
const HIP_SWITCH_90_90 = {
  view: "front",
  loop: "pingpong",
  dur: 4.6,
  breath: 0.4,
  breathRate: 0.9,
  floor: false,
  feet: { R: { ang: 120, len: 0.85, w: 1 }, L: { ang: 120, len: 0.85, w: 1 } },
  keys: [
    { // knees to the left: front shin across the body, back knee out
      t: 0,
      root: { x: 70, y: 76, rot: 0 },
      joints: { spine: -2, neck: 0, hipR: 84, kneeR: 144, hipL: 96, kneeL: 120,
                shoulderR: 14, elbowR: 20, shoulderL: 14, elbowL: 20 },
    },
    { // rotated through to the other side, chest still tall
      t: 1,
      root: { x: 70, y: 76, rot: 0 },
      joints: { spine: 2, neck: 0, hipR: 96, kneeR: 120, hipL: 84, kneeL: 144,
                shoulderR: 14, elbowR: 20, shoulderL: 14, elbowL: 20 },
    },
  ],
};

// Half kneeling, pelvis tucked, then an inch of rocking forward and back. Side
// view. The travel is deliberately tiny: the tuck is the stretch, and a big
// forward lunge here is the thing the cue is warning against.
const HALF_KNEELING_HIP_FLEXOR_ROCK = {
  view: "side",
  loop: "pingpong",
  dur: 4.4,
  breath: 0.4,
  breathRate: 0.9,
  props: [{ type: "mat", x: 8, w: 120 }],
  keys: [
    { // back, pelvis already tucked under
      t: 0,
      root: { x: 58, y: 86, rot: -8 },
      joints: { spine: 4, neck: -2, hipL: -14, kneeL: 73, ankleL: -55,
                shoulderR: -12, elbowR: 62, shoulderL: -14, elbowL: 64 },
      ik: { ankleR: { x: 88, y: 113.6, bend: -1 } },
    },
    { // an inch forward, tuck held
      t: 1,
      root: { x: 62, y: 86, rot: -10 },
      joints: { spine: 5, neck: -3, hipL: -8, kneeL: 73, ankleL: -55,
                shoulderR: -12, elbowR: 62, shoulderL: -14, elbowL: 64 },
      ik: { ankleR: { x: 88, y: 113.6, bend: -1 } },
    },
  ],
};

// Sitting as low as possible with both heels down and the elbows inside the
// knees. Side view: depth and heels down are sagittal, and the depth is the
// thing that has to be visible. The hands are together in front of the chest,
// which is what puts the elbows where the cue wants them.
const DEEP_SQUAT_HOLD = {
  view: "side",
  loop: "hold",
  dur: 6.2,
  breath: 0.9,
  breathRate: 0.8,
  keys: [
    { // settled at the bottom, heels down, chest between the knees
      t: 0,
      root: { x: 51, y: 90, rot: 15 },
      joints: { spine: 16, neck: -10 },
      ik: {
        ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 63, y: 113.6, bend: -1 },
        wristR: { x: 78, y: 76, bend: 1 }, wristL: { x: 74, y: 78, bend: 1 },
      },
    },
    { // sinks a fraction on the exhale, heels still down
      t: 1,
      root: { x: 50, y: 92, rot: 17 },
      joints: { spine: 18, neck: -11 },
      ik: {
        ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 63, y: 113.6, bend: -1 },
        wristR: { x: 78, y: 78, bend: 1 }, wristL: { x: 74, y: 80, bend: 1 },
      },
    },
  ],
};

// Weight shifted over one bent leg with the other leg straight out to the side
// and its toes up. Lateral, so front view: side on the straight leg points at
// the camera and the whole shape disappears. The straight leg's foot is authored
// with the toes up, which is the cue and also what stops it reading as a lunge.
const COSSACK_SQUAT = {
  view: "front",
  loop: "pingpong",
  dur: 4.4,
  breath: 0.4,
  breathRate: 0.9,
  farSide: "L",
  fit: { k: 0.92, dy: 2 },
  feet: { R: { ang: 26, len: 0.38, w: 1.35 }, L: { ang: 150, len: 0.9, w: 1 } },
  keys: [
    { // standing wide, before the shift
      t: 0,
      root: { x: 56, y: 64, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 16, elbowR: 22, shoulderL: 16, elbowL: 22 },
      ik: { ankleR: { x: 86, y: 113.6, bend: -1 }, ankleL: { x: 14, y: 113.6, bend: -1 } },
    },
    { // sunk over the bent leg, other leg long with the toes up
      t: 1,
      root: { x: 56, y: 86, rot: 4 },
      joints: { spine: 6, neck: -4, shoulderR: 34, elbowR: 46, shoulderL: 32, elbowL: 46 },
      ik: { ankleR: { x: 86, y: 113.6, bend: -1 }, ankleL: { x: 8, y: 112, bend: -1 } },
    },
  ],
};


// Balanced on one leg, hinged forward, the free hip rotating open and closed.
// The rotation is the named half of the drill and it only exists in the frontal
// plane, so this is the front view: the free leg travelling out to the side and
// the trunk falling the other way is what a user can copy. Side on, the open and
// closed positions are the same picture.
const STANDING_HIP_AIRPLANE = {
  view: "front",
  loop: "pingpong",
  dur: 4.4,
  breath: 0.4,
  breathRate: 0.9,
  farSide: "L",
  fit: { k: 0.94, dy: 2 },
  feet: { R: { ang: 40, len: 0.8, w: 1 }, L: { ang: 12, len: 0.42, w: 1.3 } },
  keys: [
    { // closed: free leg in line behind, hips level
      t: 0,
      root: { x: 72, y: 61.6, rot: 0 },
      joints: { spine: -10, neck: -2, hipR: 30, kneeR: 12,
                shoulderR: 52, elbowR: 16, shoulderL: 56, elbowL: 14 },
      ik: { ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
    { // open: free hip rotates out, trunk counterbalances the other way
      t: 1,
      root: { x: 73, y: 62.4, rot: 0 },
      joints: { spine: -20, neck: -3, hipR: 58, kneeR: 6,
                shoulderR: 64, elbowR: 10, shoulderL: 68, elbowL: 10 },
      ik: { ankleL: { x: 62, y: 113.6, bend: -1 } },
    },
  ],
};

// Lying on one side with the knees stacked, the top arm opening across the body
// while the knees stay put. Front view, which here is looking down at the figure
// on its side: that is the only view where the arm sweeping across is a sweep.
// The rig's shoulder stops short of the far side, so the arm opens to overhead
// rather than all the way to the floor behind, and the head follows it.
const OPEN_BOOK_THORACIC_ROTATION = {
  view: "front",
  loop: "pingpong",
  dur: 4.8,
  breath: 0.4,
  breathRate: 0.9,
  floor: false,
  farSide: "L",
  feet: { R: { ang: 40, len: 0.8, w: 1 }, L: { ang: 40, len: 0.8, w: 1 } },
  keys: [
    { // start: hands stacked together, knees bent to one side
      t: 0,
      root: { x: 66, y: 58, rot: 0 },
      joints: { spine: 0, neck: 18, shoulderR: 84, elbowR: 8, wristR: -4,
                shoulderL: -54, elbowL: 26, wristL: -4,
                hipR: 72, kneeR: 86, hipL: -30, kneeL: 80 },
    },
    { // top arm opens across and overhead, eyes following it, knees unmoved
      t: 1,
      root: { x: 66, y: 58, rot: 0 },
      joints: { spine: 0, neck: -18, shoulderR: 184, elbowR: 6, wristR: -4,
                shoulderL: -50, elbowL: 30, wristL: -4,
                hipR: 72, kneeR: 86, hipL: -30, kneeL: 80 },
    },
  ],
};

// On all fours with one hand behind the head, turning the elbow up and then
// tucking it back under the chest. Side view, and it is the least satisfying
// compromise in this file: rotating about the spine's long axis moves the elbow
// up and sideways, and the sideways half cannot be drawn. What is drawn is the
// elbow travelling from under the chest to up past the head, which is the half a
// beginner can check.
const QUADRUPED_THORACIC_ROTATION = {
  view: "side",
  loop: "pingpong",
  dur: 4.6,
  breath: 0.4,
  breathRate: 0.9,
  props: [{ type: "mat", x: 10, w: 118 }],
  keys: [
    { // elbow tucked down under the chest
      t: 0,
      root: { x: 52, y: 84.7, rot: 90 },
      joints: { spine: 0, neck: -14, hipR: -90, hipL: -90, kneeR: 94, kneeL: 94,
                ankleR: -58, ankleL: -58, shoulderR: -70, elbowR: 130, wristR: -10,
                wristL: 60 },
      ik: { wristL: { x: 92, y: 114.6, bend: 1 } },
    },
    { // elbow turned up and past the head, hand still behind it
      t: 1,
      root: { x: 52, y: 84.7, rot: 90 },
      joints: { spine: 0, neck: -18, hipR: -90, hipL: -90, kneeR: 94, kneeL: 94,
                ankleR: -58, ankleL: -58, shoulderR: 10, elbowR: 125, wristR: -10,
                wristL: 60 },
      ik: { wristL: { x: 92, y: 114.6, bend: 1 } },
    },
  ],
};

// Lying the length of a roller, head to tailbone, letting the arms fall open and
// doing nothing for a minute. Side view. The arms really fall out to the sides,
// which points them at the camera, so they are drawn fallen down to the floor
// either side of the raised torso: the readable claim is the body up off the
// floor on the roller with both arms down on it, which is the position.
const FOAM_ROLLER_CHEST_OPENER = {
  view: "side",
  loop: "hold",
  dur: 6.4,
  breath: 0.9,
  breathRate: 0.75,
  props: [
    { type: "mat", x: 10, w: 118 },
    { type: "roller", x: 58, y: 110, r: 5.4 },
  ],
  keys: [
    { // settled along the roller, arms open and heavy
      t: 0,
      root: { x: 74, y: 104, rot: -90 },
      joints: { spine: -2, neck: 4, shoulderR: 150, elbowR: 42, wristR: -20,
                shoulderL: 156, elbowL: 38, wristL: -20,
                hipR: 178, hipL: 182, kneeR: 4, kneeL: 4, ankleR: -30, ankleL: -30 },
    },
    { // the ribs settle a fraction further on the exhale
      t: 1,
      root: { x: 74, y: 104.6, rot: -90 },
      joints: { spine: -4, neck: 5, shoulderR: 154, elbowR: 38, wristR: -20,
                shoulderL: 160, elbowL: 34, wristL: -20,
                hipR: 178, hipL: 182, kneeR: 4, kneeL: 4, ankleR: -30, ankleL: -30 },
    },
  ],
};

// Sliding the chin straight back to make a double chin, then releasing. Side
// view: the head travelling backwards over the neck is sagittal and invisible
// from anywhere else. The rig has no neck slide, so it is carried by the neck
// angle plus a small shift of the whole body, which is what the movement looks
// like from across a room.
const CHIN_TUCKS = {
  view: "side",
  loop: "pingpong",
  dur: 3.6,
  breath: 0.3,
  breathRate: 0.9,
  keys: [
    { // released, head forward of the shoulders
      t: 0,
      root: { x: 66, y: 61.6, rot: 0 },
      joints: { spine: 4, neck: -14, shoulderR: 4, elbowR: 12, shoulderL: 2, elbowL: 14 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 63, y: 113.6, bend: -1 } },
    },
    { // chin slides back and down, back of the neck long
      t: 1,
      root: { x: 65, y: 61.6, rot: 0 },
      joints: { spine: -2, neck: 20, shoulderR: 4, elbowR: 12, shoulderL: 2, elbowL: 14 },
      ik: { ankleR: { x: 68, y: 113.6, bend: -1 }, ankleL: { x: 63, y: 113.6, bend: -1 } },
    },
  ],
};

// Face down with the arms wide, reaching one foot across the body toward the
// opposite hand. Seen from above and behind, as suggested: the reach crosses the
// midline, which is exactly what the back view shows and what a side view turns
// into a leg disappearing behind a body. No floor line, because the floor is
// behind the figure here.
const PRONE_SCORPION_STRETCH = {
  view: "front",
  facing: "away",
  loop: "pingpong",
  dur: 4.6,
  breath: 0.4,
  breathRate: 0.9,
  floor: false,
  feet: { R: { ang: -80, len: 0.95, w: 0.95 }, L: { ang: 7, len: 0.95, w: 0.95 } },
  keys: [
    { // lying long, arms wide
      t: 0,
      root: { x: 70, y: 54, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 92, shoulderL: 92, elbowR: 8, elbowL: 8,
                hipR: 4, hipL: 4, kneeR: 4, kneeL: 4 },
    },
    { // one foot reaches across toward the opposite hand, chest stays down
      t: 1,
      root: { x: 70, y: 54, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 92, shoulderL: 92, elbowR: 8, elbowL: 8,
                hipR: -30, hipL: 4, kneeR: 55, kneeL: 4 },
    },
  ],
};

// Folded from the hips with the knees soft, hanging heavy, nodding the head yes
// and no to let the neck go. Side view: the fold is sagittal, and the arms
// hanging straight down under the shoulders are what say hang rather than reach.
const STANDING_FORWARD_HANG = {
  view: "side",
  loop: "pingpong",
  dur: 5.0,
  breath: 0.4,
  breathRate: 0.8,
  keys: [
    { // hanging, chin tucked in toward the chest
      t: 0,
      root: { x: 62, y: 62.6, rot: 50 },
      joints: { spine: 55, neck: 22, shoulderR: -105, elbowR: 14, shoulderL: -102, elbowL: 16,
                wristR: -30, wristL: -30 },
      ik: { ankleR: { x: 64, y: 113.6, bend: -1 }, ankleL: { x: 59, y: 113.6, bend: -1 } },
    },
    { // head nods the other way, everything else stays heavy
      t: 1,
      root: { x: 62, y: 63.2, rot: 52 },
      joints: { spine: 57, neck: -18, shoulderR: -107, elbowR: 12, shoulderL: -104, elbowL: 14,
                wristR: -30, wristL: -30 },
      ik: { ankleR: { x: 64, y: 113.6, bend: -1 }, ankleL: { x: 59, y: 113.6, bend: -1 } },
    },
  ],
};

export const MOVES = {
  "Doorway Pec Stretch": DOORWAY_PEC_STRETCH,
  "Band Pull-Apart": BAND_PULL_APART,
  "Foam Roller Thoracic Extension": FOAM_ROLLER_THORACIC_EXTENSION,
  "Arm Circles": ARM_CIRCLES,
  "Shoulder Rolls": SHOULDER_ROLLS,
  "Cross-Body Arm Swings": CROSS_BODY_ARM_SWINGS,
  "Wall Slides": WALL_SLIDES,
  "Elbow Circles": ELBOW_CIRCLES,
  "Wrist Circles": WRIST_CIRCLES,
  "Torso Twists": TORSO_TWISTS,
  "Prone Press-Up": PRONE_PRESS_UP,
  "Pelvic Tilts": PELVIC_TILTS,
  "Hip Circles": HIP_CIRCLES,
  "Leg Swings": LEG_SWINGS,
  "Lateral Leg Swings": LATERAL_LEG_SWINGS,
  "Toy Soldier Kicks": TOY_SOLDIER_KICKS,
  "Ankle Circles": ANKLE_CIRCLES,
  "World's Greatest Stretch": WORLDS_GREATEST_STRETCH,
  "Walking Lunge with Twist": WALKING_LUNGE_WITH_TWIST,
  "Wall Hip Hinge Drill": WALL_HIP_HINGE_DRILL,
  "Squat to Stand": SQUAT_TO_STAND,
  "Knee-to-Wall Ankle Rock": KNEE_TO_WALL_ANKLE_ROCK,
  "Inchworm Walkout": INCHWORM_WALKOUT,
  "Straight-Arm Band Pulldown": STRAIGHT_ARM_BAND_PULLDOWN,
  "Prone Y Raise": PRONE_Y_RAISE,
  "Scapular Push-Up": SCAPULAR_PUSH_UP,
  "Band Shoulder External Rotation": BAND_SHOULDER_EXTERNAL_ROTATION,
  "Quadruped Wrist Rocks": QUADRUPED_WRIST_ROCKS,
  "Cross-Body Shoulder Stretch": CROSS_BODY_SHOULDER_STRETCH,
  "Overhead Triceps Stretch": OVERHEAD_TRICEPS_STRETCH,
  "Upper Trap Stretch": UPPER_TRAP_STRETCH,
  "Wrist Flexor Stretch": WRIST_FLEXOR_STRETCH,
  "Thread the Needle Stretch": THREAD_THE_NEEDLE_STRETCH,
  "Kneeling Lat Stretch": KNEELING_LAT_STRETCH,
  "Biceps Wall Stretch": BICEPS_WALL_STRETCH,
  "Wrist Extensor Stretch": WRIST_EXTENSOR_STRETCH,
  "Sphinx Stretch": SPHINX_STRETCH,
  "Seated Spinal Twist": SEATED_SPINAL_TWIST,
  "Standing Side Bend Stretch": STANDING_SIDE_BEND_STRETCH,
  "Knees-to-Chest Stretch": KNEES_TO_CHEST_STRETCH,
  "Figure Four Stretch": FIGURE_FOUR_STRETCH,
  "Kneeling Hip Flexor Stretch": KNEELING_HIP_FLEXOR_STRETCH,
  "Couch Stretch": COUCH_STRETCH,
  "Frog Stretch": FROG_STRETCH,
  "Standing Hamstring Stretch": STANDING_HAMSTRING_STRETCH,
  "Supine Hamstring Stretch": SUPINE_HAMSTRING_STRETCH,
  "Standing Calf Stretch": STANDING_CALF_STRETCH,
  "Bent-Knee Calf Stretch": BENT_KNEE_CALF_STRETCH,
  "90/90 Hip Switch": HIP_SWITCH_90_90,
  "Half-Kneeling Hip Flexor Rock": HALF_KNEELING_HIP_FLEXOR_ROCK,
  "Deep Squat Hold": DEEP_SQUAT_HOLD,
  "Cossack Squat": COSSACK_SQUAT,
  "Standing Hip Airplane": STANDING_HIP_AIRPLANE,
  "Open Book Thoracic Rotation": OPEN_BOOK_THORACIC_ROTATION,
  "Quadruped Thoracic Rotation": QUADRUPED_THORACIC_ROTATION,
  "Foam Roller Chest Opener": FOAM_ROLLER_CHEST_OPENER,
  "Chin Tucks": CHIN_TUCKS,
  "Prone Scorpion Stretch": PRONE_SCORPION_STRETCH,
  "Standing Forward Hang": STANDING_FORWARD_HANG,
};
