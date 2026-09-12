// Weight-training moves, lower body: quads, hamstrings, glutes, calves, abs, obliques, lower back.
// Keys are the EXACT `name` from knowledge/exercise-library/weight-training.mjs.
// Merged into ./weight-training.mjs; do not import this file directly.
//
// Step 0 for every entry is in the comment above it: what the real movement
// looks like, the one thing that must be visible, and the view that shows it.

// ------------------------------------------------------------------ quads ---

// Both feet flat on the floor at a shoulder width stance. Every standing squat
// in this file starts from these pins, so the rep is the pelvis moving and the
// legs follow, the way a person works.
const SQUAT_FEET = {
  ankleR: { x: 66, y: 113.4, bend: -1 },
  ankleL: { x: 62, y: 113.4, bend: -1 },
};

// Bar across the upper back, feet flat, hips and knees bend together until the
// thighs are about parallel, then stand. Must be visible: the bar staying over
// the midfoot while the hips travel back and down. Side view, sagittal plane.
// The hands are now ON the bar. It rides the traps in torso space via the
// barbell prop's place: "traps", and the wrists pin to the same point as an
// offset from the chest, so bar and grip lean together through the whole rep.
// The upper arm swings back to about 85 degrees of extension and the forearm
// folds up to meet it, which is the projection of a wide grip, not a shoulder
// doing something strange.
const BARBELL_BACK_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 1.02, dy: 2 },
  props: [{ type: "barbell", place: "traps", up: 6.5, back: 5.5, r: 8.5, front: true }],
  keys: [
    { // stood tall under the bar
      t: 0,
      root: { x: 66, y: 61.4, rot: 3 },
      joints: { spine: 6, neck: -4 },
      ik: {
        ...SQUAT_FEET,
        wristR: { rel: "chest", x: -4.4, y: -7.3, bend: -1 },
        wristL: { rel: "chest", x: -6.0, y: -6.5, bend: -1 },
      },
    },
    { // bottom, hips back and down, thighs about parallel, chest still up
      t: 1,
      root: { x: 54, y: 90, rot: 14 },
      joints: { spine: 16, neck: -10 },
      ik: {
        ...SQUAT_FEET,
        wristR: { rel: "chest", x: -1.5, y: -8.4, bend: -1 },
        wristL: { rel: "chest", x: -3.1, y: -7.6, bend: -1 },
      },
    },
  ],
};

// Bar racked on the front delts with the elbows driven high, torso far more
// upright than a back squat. Must be visible: the bar in FRONT of the neck and
// the elbow leading it, which is the whole difference from the back squat two
// cards away. Side view.
const FRONT_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 1.02, dy: 2 },
  props: [{ type: "barbell", side: "R", point: "wrist", dx: 0, dy: 0, r: 10, front: true }],
  keys: [
    { // stood tall, elbows up, bar on the shoulders
      t: 0,
      root: { x: 66, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -2 },
      ik: {
        ...SQUAT_FEET,
        wristR: { rel: "chest", x: 16, y: -5, bend: 1 },
        wristL: { rel: "chest", x: 13, y: -3, bend: 1 },
      },
    },
    { // bottom, torso upright, elbows still high so the bar does not dump
      t: 1,
      root: { x: 54, y: 89, rot: 8 },
      joints: { spine: 9, neck: -5 },
      ik: {
        ...SQUAT_FEET,
        wristR: { rel: "chest", x: 16, y: -5, bend: 1 },
        wristL: { rel: "chest", x: 13, y: -3, bend: 1 },
      },
    },
  ],
};

// Bar carried in the crook of the elbows at belly height, arms folded in front,
// torso upright. Must be visible: the bar low and in front, held by the arms
// rather than resting on the body. Side view.
const ZERCHER_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 1.02, dy: 2 },
  props: [{ type: "barbell", side: "R", point: "wrist", dx: -6, dy: 3, r: 9, front: true }],
  keys: [
    { // stood tall, forearms level, bar in the elbow crook
      t: 0,
      root: { x: 66, y: 61.4, rot: 2 },
      joints: { spine: 5, neck: -3 },
      ik: {
        ...SQUAT_FEET,
        wristR: { rel: "chest", x: 11, y: 11, bend: 1 },
        wristL: { rel: "chest", x: 8, y: 12, bend: 1 },
      },
    },
    { // bottom, elbows tracking inside the knees
      t: 1,
      root: { x: 54, y: 89, rot: 10 },
      joints: { spine: 13, neck: -7 },
      ik: {
        ...SQUAT_FEET,
        wristR: { rel: "chest", x: 11, y: 11, bend: 1 },
        wristL: { rel: "chest", x: 8, y: 12, bend: 1 },
      },
    },
  ],
};

// Back flat against a pad angled back about 30 degrees, feet forward on the
// machine platform, knees bend and drive. Must be visible: the torso leaning
// BACK on the pad with the feet out in front, which is what separates it from a
// free squat. Side view.
const HACK_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.9, dy: 6 },
  props: [
    { type: "box", x: 44, y: 104, w: 64 },
    { type: "bench", x: 25, y: 35, w: 34, incline: -70 },
  ],
  keys: [
    { // top, legs nearly straight, back long on the pad
      t: 0,
      root: { x: 58, y: 55, rot: -22 },
      joints: { spine: 2, neck: 4, shoulderR: 18, elbowR: 44, shoulderL: 16, elbowL: 46 },
      ik: { ankleR: { x: 86, y: 99.4, bend: -1 }, ankleL: { x: 81, y: 99.4, bend: -1 } },
    },
    { // bottom, knees bent to about 90 with the hips low on the pad
      t: 1,
      root: { x: 52, y: 82, rot: -30 },
      joints: { spine: 4, neck: 6, shoulderR: 18, elbowR: 44, shoulderL: 16, elbowL: 46 },
      ik: { ankleR: { x: 86, y: 99.4, bend: -1 }, ankleL: { x: 81, y: 99.4, bend: -1 } },
    },
  ],
};

// Sat back against a pad with the feet high on a plate, knees fold toward the
// chest and press away. Must be visible: the knee folding deep while the torso
// stays still, and the load out at the feet. Side view.
// The foot is NOT pinned here: a pinned ankle is a flat foot on the floor, and
// this foot has to stand vertical against a plate the whole way.
const LEG_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  props: [
    { type: "bench", x: 4, y: 68, w: 47, incline: -70 },
    { type: "box", x: 32, y: 95, w: 30 },
    { type: "barbell", side: "L", point: "ankle", dx: 5, dy: -1, r: 12 },
    { type: "barbell", side: "R", point: "ankle", dx: 6, dy: -1, r: 12, front: true },
  ],
  keys: [
    { // pressed out, knees long but not locked
      t: 0,
      root: { x: 46, y: 86, rot: -20 },
      joints: {
        spine: 2, neck: 6,
        hipR: 117, kneeR: 8, ankleR: 0, hipL: 114, kneeL: 10, ankleL: 2,
      },
      ik: { wristR: { x: 50, y: 100, bend: 1 }, wristL: { x: 44, y: 101, bend: 1 } },
    },
    { // deep, knees folded toward the chest, shins angled down to the plate
      t: 1,
      root: { x: 46, y: 86, rot: -20 },
      joints: {
        spine: 3, neck: 8,
        hipR: 170, kneeR: 87, ankleR: 22, hipL: 166, kneeL: 89, ankleL: 24,
      },
      ik: { wristR: { x: 50, y: 100, bend: 1 }, wristL: { x: 44, y: 101, bend: 1 } },
    },
  ],
};

// Sat upright with a roller pad across the shins, knee straightens from 90 to
// locked while the thigh never moves. Must be visible: the knee as the only
// joint that changes. Side view.
const LEG_EXTENSION = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [
    { type: "machine", x: 40, y: 94, w: 32, parts: ["seat", "backPad"], padH: 30 },
    { type: "barbell", side: "L", point: "ankle", dx: 3, dy: 0, r: 6 },
    { type: "barbell", side: "R", point: "ankle", dx: 4, dy: 0, r: 6, front: true },
  ],
  keys: [
    { // start, shins hanging straight down under the knee
      t: 0,
      root: { x: 50, y: 85, rot: -8 },
      joints: {
        spine: 2, neck: 2,
        hipR: 98, kneeR: 90, ankleR: 0, hipL: 96, kneeL: 88, ankleL: 0,
      },
      ik: { wristR: { x: 54, y: 100, bend: 1 }, wristL: { x: 48, y: 101, bend: 1 } },
    },
    { // locked out, shin in line with the thigh, toes pointed
      t: 1,
      root: { x: 50, y: 85, rot: -8 },
      joints: {
        spine: 0, neck: 0,
        hipR: 98, kneeR: 6, ankleR: -16, hipL: 96, kneeL: 8, ankleL: -14,
      },
      ik: { wristR: { x: 54, y: 100, bend: 1 }, wristL: { x: 48, y: 101, bend: 1 } },
    },
  ],
};

// Heels up on the toes, knees drive forward, and the body from knee to head
// stays one straight line leaning back. Must be visible: the straight hip, no
// hinge at all, with the knees far in front of the toes. Side view.
// No ankle pin anywhere: the heels are off the floor for the whole rep.
const SISSY_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  keys: [
    { // stood tall on the balls of the feet, hands out for balance
      t: 0,
      root: { x: 62, y: 61.4, rot: -2 },
      joints: {
        spine: 0, neck: 0,
        hipR: 0, kneeR: 4, ankleR: -2, hipL: 2, kneeL: 6, ankleL: -2,
      },
      ik: { wristR: { rel: "chest", x: 20, y: 6, bend: 1 }, wristL: { rel: "chest", x: 17, y: 8, bend: 1 } },
    },
    { // bottom, knees way past the toes, knee to head one line leaning back
      t: 1,
      root: { x: 57, y: 65, rot: -45 },
      joints: {
        spine: 0, neck: 6,
        hipR: 90, kneeR: 79, ankleR: -19, hipL: 88, kneeL: 77, ankleL: -19,
      },
      ik: { wristR: { rel: "chest", x: 20, y: 6, bend: 1 }, wristL: { rel: "chest", x: 17, y: 8, bend: 1 } },
    },
  ],
};

// ------------------------------------------------------------- hamstrings ---

// A hinge is not a squat: the pelvis travels BACKWARD nearly as far as it drops,
// the shins stay close to vertical and the torso rotates around the hip. Every
// deadlift variant below shares this template and differs by what is in the
// hands and how straight the knee stays.
// Arms hang vertically, so shoulderR/L is authored as minus the torso angle
// (rot + spine). Anything else swings the bar away from the legs.

// Bar slides down the thighs to mid shin with the knees only soft, then the
// hips drive forward to stand. Must be visible: the hips going back while the
// back stays long, and the bar staying against the leg. Side view.
const ROMANIAN_DEADLIFT = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  props: [{ type: "barbell", side: "R", point: "hand", r: 9.5, front: true }],
  keys: [
    { // stood tall, bar at the hips
      t: 0,
      root: { x: 66, y: 61.4, rot: 3 },
      joints: { spine: 3, neck: -2, shoulderR: -6, elbowR: 2, shoulderL: -6, elbowL: 3 },
      ik: { ...SQUAT_FEET },
    },
    { // bottom, hips back about 20 units, torso 60 degrees, bar at mid shin
      t: 1,
      root: { x: 46, y: 65.8, rot: 26 },
      joints: { spine: 34, neck: -22, shoulderR: -60, elbowR: 2, shoulderL: -60, elbowL: 3 },
      ik: { ...SQUAT_FEET },
    },
  ],
};

// The same hinge with the knees held almost locked, so the bottom is deeper and
// the whole range lands on the hamstring. Must be visible: a straighter knee
// than the Romanian one card away. Side view.
const STIFF_LEG_DEADLIFT = {
  ...ROMANIAN_DEADLIFT,
  dur: 3.3,
  props: [
    { type: "dumbbell", side: "L", point: "hand", dx: -1, dy: 4, rot: 0, k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", dx: 1, dy: 4, rot: 0, k: 0.8, front: true },
  ],
  keys: [
    { // stood tall, bells at the front of the thighs
      t: 0,
      root: { x: 66, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: -2, shoulderR: -4, elbowR: 2, shoulderL: -4, elbowL: 3 },
      ik: { ...SQUAT_FEET },
    },
    { // bottom, knees all but locked, torso past 70 degrees
      t: 1,
      root: { x: 50, y: 64, rot: 30 },
      joints: { spine: 42, neck: -26, shoulderR: -72, elbowR: 2, shoulderL: -72, elbowL: 3 },
      ik: { ...SQUAT_FEET },
    },
  ],
};

// Stood on one leg, the free leg lifts behind exactly as far as the chest
// lowers, so body and lifted leg finish in one horizontal line. Must be visible:
// that T shape, which is the whole exercise. Side view.
const SINGLE_LEG_ROMANIAN_DEADLIFT = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.2,
  fit: { k: 0.9, dy: 2 },
  props: [{ type: "dumbbell", side: "R", point: "hand", dx: 1, dy: 4, rot: 0, k: 0.85, front: true }],
  keys: [
    { // stood tall on the right leg, free leg just off the floor behind
      t: 0,
      root: { x: 78, y: 61.4, rot: 2 },
      joints: {
        spine: 2, neck: -2, shoulderR: -4, elbowR: 2, shoulderL: -4, elbowL: 3,
        hipL: -16, kneeL: 16, ankleL: -10,
      },
      ik: { ankleR: { x: 78, y: 113.4, bend: -1 } },
    },
    { // bottom, torso and free leg level, bell hanging under the shoulder
      t: 1,
      root: { x: 72, y: 62, rot: 33 },
      joints: {
        spine: 53, neck: -30, shoulderR: -86, elbowR: 2, shoulderL: -86, elbowL: 3,
        hipL: -121, kneeL: 5, ankleL: -12,
      },
      ik: { ankleR: { x: 78, y: 113.4, bend: -1 } },
    },
  ],
};

// Bar across the upper back, same hinge as a Romanian deadlift. Must be visible:
// the load ON THE BACK rather than in the hands, which is the only thing that
// separates this from the deadlifts either side of it. Side view.
// Hands on the bar, same traps rack as the back squat. The chest-relative pin
// changes a lot between the two keyframes because the torso goes from nearly
// upright to nearly horizontal, and the bar has to stay on the back through it.
const GOOD_MORNING = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  props: [{ type: "barbell", place: "traps", up: 6.5, back: 5.5, r: 8.5, front: true }],
  keys: [
    { // stood tall under the bar
      t: 0,
      root: { x: 66, y: 61.4, rot: 3 },
      joints: { spine: 4, neck: -3 },
      ik: {
        ...SQUAT_FEET,
        wristR: { rel: "chest", x: -4.7, y: -7.1, bend: -1 },
        wristL: { rel: "chest", x: -6.3, y: -6.3, bend: -1 },
      },
    },
    { // half way down. This keyframe exists only to keep the bar on the back:
      // the wrist pin is an offset from the chest in WORLD space, so between two
      // keyframes it interpolates in a straight line while the torso swings
      // through 70 degrees, and the hands drift off the bar in the middle.
      t: 0.5,
      root: { x: 58, y: 62.7, rot: 16.5 },
      joints: { spine: 25, neck: -16 },
      ik: {
        ...SQUAT_FEET,
        wristR: { rel: "chest", x: 0.2, y: -8.5, bend: -1 },
        wristL: { rel: "chest", x: -1.4, y: -7.7, bend: -1 },
      },
    },
    { // bottom, chest heading for horizontal, hips well behind the heels
      t: 1,
      root: { x: 50, y: 64, rot: 30 },
      joints: { spine: 46, neck: -30 },
      ik: {
        ...SQUAT_FEET,
        wristR: { rel: "chest", x: 5.0, y: -6.9, bend: -1 },
        wristL: { rel: "chest", x: 3.4, y: -6.1, bend: -1 },
      },
    },
  ],
};

// Face down on a pad, roller across the achilles, heels curl toward the glutes.
// Must be visible: the knee as the only joint moving, and the body face DOWN.
// Side view. Prone means root.rot is POSITIVE, which puts the head at +x.
const LEG_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [
    { type: "bench", x: 32, y: 100, w: 98 },
    { type: "barbell", side: "L", point: "ankle", dx: -2, dy: 0, r: 6 },
    { type: "barbell", side: "R", point: "ankle", dx: -3, dy: 0, r: 6, front: true },
  ],
  keys: [
    { // start, legs long on the pad
      t: 0,
      root: { x: 72, y: 86, rot: 90 },
      joints: {
        spine: 0, neck: -16,
        hipR: -180, kneeR: 6, ankleR: 0, hipL: -178, kneeL: 8, ankleL: 0,
      },
      ik: { wristR: { x: 110, y: 104, bend: 1 }, wristL: { x: 106, y: 103, bend: 1 } },
    },
    { // top of the curl, heels pulled up over the back of the knee
      t: 1,
      root: { x: 72, y: 86, rot: 90 },
      joints: {
        spine: 0, neck: -18,
        hipR: -184, kneeR: 100, ankleR: 0, hipL: -182, kneeL: 98, ankleL: 0,
      },
      ik: { wristR: { x: 110, y: 104, bend: 1 }, wristL: { x: 106, y: 103, bend: 1 } },
    },
  ],
};

// Knees pinned on a pad with the feet anchored, body held in one line and
// lowered forward from the KNEE, then pulled back up by the hamstrings. Must be
// visible: the pivot at the knee with no hinge at the hip at all. Side view.
const GLUTE_HAM_RAISE = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.2,
  fit: { k: 0.9, dy: 2 },
  props: [
    { type: "bench", x: 24, y: 94, w: 34 },
    { type: "box", x: 6, y: 86, w: 12 },
  ],
  keys: [
    { // top, torso stacked upright over the knees
      t: 0,
      root: { x: 46, y: 61, rot: 0 },
      joints: {
        spine: 0, neck: -2,
        hipR: 0, kneeR: 90, ankleR: -50, hipL: 0, kneeL: 90, ankleL: -50,
      },
      ik: { wristR: { rel: "chest", x: 7, y: 11, bend: 1 }, wristL: { rel: "chest", x: 5, y: 13, bend: 1 } },
    },
    { // bottom, knee to head one straight horizontal line
      t: 1,
      root: { x: 73, y: 88, rot: 90 },
      joints: {
        spine: 0, neck: -6,
        hipR: -180, kneeR: 0, ankleR: -50, hipL: -180, kneeL: 0, ankleL: -50,
      },
      ik: { wristR: { rel: "chest", x: 7, y: 11, bend: 1 }, wristL: { rel: "chest", x: 5, y: 13, bend: 1 } },
    },
  ],
};

// Facing away from a low pulley with the rope passed between the legs, hinge
// back and then snap the hips forward to stand. Must be visible: the cable
// coming from BEHIND and running between the legs, which is what makes it a
// pull-through and not a deadlift. Side view.
const CABLE_PULL_THROUGH = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [{ type: "cable", x: 16, top: 96, y0: 100, to: { side: "R", point: "hand" } }],
  keys: [
    { // stood tall, hips through, rope in front of the hips
      t: 0,
      root: { x: 64, y: 61.4, rot: 2 },
      joints: { spine: 3, neck: -2 },
      ik: {
        ...SQUAT_FEET,
        wristR: { x: 70, y: 72, bend: 1 }, wristL: { x: 66, y: 73, bend: 1 },
      },
    },
    { // hinged back, hands reaching between the legs toward the stack
      t: 1,
      root: { x: 50, y: 65, rot: 26 },
      joints: { spine: 36, neck: -24 },
      ik: {
        ...SQUAT_FEET,
        wristR: { x: 70, y: 86, bend: 1 }, wristL: { x: 66, y: 87, bend: 1 },
      },
    },
  ],
};

// ----------------------------------------------------------------- glutes ---

// On the floor, knees bent and feet flat, drive the hips up until the body is
// one line from knee to shoulder. Must be visible: the hips leaving the floor
// while the shoulders stay on it. Side view.
// Supine, so root.rot is NEGATIVE: the head goes where upV points, which here
// is -x, and the feet run out to +x. The neck angle at the top is what keeps the
// head on the floor when the torso tilts.
const GLUTE_BRIDGE = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.25,
  props: [{ type: "mat", x: 14, w: 110 }],
  keys: [
    { // hips down, back flat on the floor
      t: 0,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 0, neck: 4 },
      ik: {
        ankleR: { x: 100, y: 113.4, bend: -1 }, ankleL: { x: 96, y: 113.4, bend: -1 },
        wristR: { x: 86, y: 110, bend: 1 }, wristL: { x: 83, y: 111, bend: 1 },
      },
    },
    { // hips high, shins vertical, shoulders still down
      t: 1,
      root: { x: 72, y: 92, rot: -120 },
      joints: { spine: 0, neck: 20 },
      ik: {
        ankleR: { x: 100, y: 113.4, bend: -1 }, ankleL: { x: 96, y: 113.4, bend: -1 },
        wristR: { x: 88, y: 110, bend: 1 }, wristL: { x: 85, y: 111, bend: 1 },
      },
    },
  ],
};

// Shoulder blades on a bench, bar across the hips, thrust up to a flat body.
// Must be visible: the upper back ON the bench and the bar riding the hip, which
// is what makes it a hip thrust rather than a bridge. Side view, supine.
const HIP_THRUST = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  props: [
    { type: "bench", x: 18, y: 93, w: 44 },
    { type: "barbell", side: "R", point: "hip", dx: 2, dy: 0, r: 10, front: true },
  ],
  keys: [
    { // bottom, hips dropped under the bar
      t: 0,
      root: { x: 76, y: 106, rot: -52 },
      joints: { spine: 0, neck: 10 },
      ik: {
        ankleR: { x: 104, y: 113.4, bend: -1 }, ankleL: { x: 100, y: 113.4, bend: -1 },
        wristR: { x: 82, y: 104, bend: 1 }, wristL: { x: 79, y: 105, bend: 1 },
      },
    },
    { // lockout, knee to shoulder level, shins vertical
      t: 1,
      root: { x: 76, y: 88, rot: -90 },
      joints: { spine: 0, neck: 18 },
      ik: {
        ankleR: { x: 104, y: 113.4, bend: -1 }, ankleL: { x: 100, y: 113.4, bend: -1 },
        wristR: { x: 84, y: 98, bend: 1 }, wristL: { x: 81, y: 99, bend: 1 },
      },
    },
  ],
};

// Wide stance with the toes turned out, hands inside the knees, torso far more
// upright than a conventional pull. Must be visible: the width of the stance and
// the knees pushing out over the toes, both of which the side view hides behind
// the near leg. Front view, so the bar is drawn as the two plates you would
// actually see from there.
const SUMO_DEADLIFT = {
  view: "front",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  feet: { R: { ang: 26, len: 0.62, w: 1.25 }, L: { ang: 26, len: 0.62, w: 1.25 } },
  props: [
    { type: "barbell", side: "R", point: "hand", dx: 16, dy: 2, r: 11, front: true },
    { type: "barbell", side: "L", point: "hand", dx: -16, dy: 2, r: 11, front: true },
  ],
  keys: [
    { // lockout, bar at the hips
      t: 0,
      root: { x: 70, y: 72, rot: 2 },
      joints: { spine: 2, neck: 0 },
      ik: {
        ankleR: { x: 96, y: 111, bend: -1 }, ankleL: { x: 44, y: 111, bend: -1 },
        wristR: { x: 80, y: 84, bend: 1 }, wristL: { x: 60, y: 84, bend: 1 },
      },
    },
    { // start position, hips down, knees shoved out, arms long inside them
      t: 1,
      root: { x: 70, y: 88, rot: 6 },
      joints: { spine: 18, neck: -8 },
      ik: {
        ankleR: { x: 96, y: 111, bend: -1 }, ankleL: { x: 44, y: 111, bend: -1 },
        wristR: { x: 78, y: 100, bend: 1 }, wristL: { x: 62, y: 101, bend: 1 },
      },
    },
  ],
};

// Step one foot back and ACROSS behind the other, then sink until the back knee
// nearly touches. Must be visible: the crossing, which is a lateral thing the
// side view flattens into an ordinary reverse lunge, so this one deviates from
// the suggested side view to the front.
const CURTSY_LUNGE = {
  view: "front",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  farSide: "L",
  feet: { R: { ang: 6, len: 0.4, w: 1.3 }, L: { ang: 46, len: 0.6, w: 1.05 } },
  props: [
    { type: "dumbbell", side: "R", point: "hand", dx: 2, dy: 5, rot: 0, k: 0.8, front: true },
    { type: "dumbbell", side: "L", point: "hand", dx: -2, dy: 5, rot: 0, k: 0.8 },
  ],
  keys: [
    { // stood tall, feet under the hips
      t: 0,
      root: { x: 72, y: 62, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: -3, elbowR: 4, shoulderL: -3, elbowL: 4 },
      ik: { ankleR: { x: 78, y: 113.4, bend: -1 }, ankleL: { x: 66, y: 112, bend: -1 } },
    },
    { // sunk, left foot crossed behind and past the right, hips square
      t: 1,
      root: { x: 76, y: 78, rot: 2 },
      joints: { spine: 6, neck: -2, shoulderR: -3, elbowR: 4, shoulderL: -3, elbowL: 4 },
      ik: { ankleR: { x: 78, y: 113.4, bend: -1 }, ankleL: { x: 92, y: 112, bend: -1 } },
    },
  ],
};

// Soles of the feet pressed together with the knees fallen wide, then short
// sharp hip drives off the floor. Must be visible: that the person is LYING ON
// THEIR BACK driving the hips, with the heels drawn right up under them.
// This deviates from the suggested front view. Front on, a figure with the
// knees splayed and the heels together is drawn standing, and it read as a deep
// sumo squat: a clean pose of the wrong movement. Side on the knee splay is
// invisible, but the lying position, the tucked heels and the hip drive are all
// true, so the wrong thing that is missing is smaller. Supine, so rot is
// negative and the head is at -x.
const FROG_PUMP = {
  view: "side",
  loop: "pingpong",
  dur: 2.2,
  breath: 0.25,
  props: [{ type: "mat", x: 14, w: 110 }],
  keys: [
    { // hips down, heels tucked in tight under the hips
      t: 0,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 0, neck: 4 },
      ik: {
        ankleR: { x: 90, y: 113.4, bend: -1 }, ankleL: { x: 86, y: 113.4, bend: -1 },
        wristR: { x: 86, y: 110, bend: 1 }, wristL: { x: 83, y: 111, bend: 1 },
      },
    },
    { // short sharp drive up, knees stay high over the heels
      t: 1,
      root: { x: 72, y: 96, rot: -112 },
      joints: { spine: 0, neck: 16 },
      ik: {
        ankleR: { x: 90, y: 113.4, bend: -1 }, ankleL: { x: 86, y: 113.4, bend: -1 },
        wristR: { x: 88, y: 110, bend: 1 }, wristL: { x: 85, y: 111, bend: 1 },
      },
    },
  ],
};

// Facing a low pulley with a cuff on one ankle, the working leg sweeps straight
// back behind the body. Must be visible: the leg travelling BACK past the
// standing leg, and the cable telling you which way the load pulls. Side view.
const CABLE_KICKBACK = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [{ type: "cable", x: 112, top: 102, y0: 106, to: { side: "R", point: "ankle" } }],
  keys: [
    { // start, working leg under the hip
      t: 0,
      root: { x: 62, y: 61.4, rot: 2 },
      joints: {
        spine: 4, neck: -2, shoulderR: 6, elbowR: 30, shoulderL: 4, elbowL: 28,
        hipR: -4, kneeR: 10, ankleR: -4,
      },
      ik: { ankleL: { x: 62, y: 113.4, bend: -1 } },
    },
    { // finish, hip extended, heel driven back and up behind
      t: 1,
      root: { x: 64, y: 61.4, rot: 6 },
      joints: {
        spine: 10, neck: -6, shoulderR: 6, elbowR: 30, shoulderL: 4, elbowL: 28,
        hipR: -40, kneeR: 14, ankleR: -14,
      },
      ik: { ankleL: { x: 62, y: 113.4, bend: -1 } },
    },
  ],
};

// ----------------------------------------------------------------- calves ---

// Stand tall and push the floor away through the ball of the foot until the
// heel is high. Must be visible: the heel leaving the ground with the knee
// straight. Side view, and the ankles are NOT pinned anywhere in this group,
// because a pinned ankle is a flat foot and a flat foot is the one thing a calf
// raise must not have.
const DUMBBELL_CALF_RAISE = {
  view: "side",
  loop: "pingpong",
  dur: 2.4,
  breath: 0.2,
  fit: { k: 0.92, dy: 4 },
  props: [{ type: "dumbbell", side: "R", point: "hand", dx: 2, dy: 5, rot: 0, k: 0.85, front: true }],
  keys: [
    { // heels down, feet flat
      t: 0,
      root: { x: 61.4, y: 62.8, rot: 0 },
      joints: {
        spine: 2, neck: -2, shoulderR: -2, elbowR: 4, shoulderL: -2, elbowL: 5,
        hipR: 0, kneeR: 3, ankleR: 8, hipL: 0, kneeL: 3, ankleL: 8,
      },
    },
    { // up on the balls of the feet, heels 14 units clear of the floor
      t: 1,
      root: { x: 66.4, y: 52.6, rot: 0 },
      joints: {
        spine: 2, neck: -2, shoulderR: -2, elbowR: 4, shoulderL: -2, elbowL: 5,
        hipR: 0, kneeR: 3, ankleR: -48, hipL: 0, kneeL: 3, ankleL: -48,
      },
    },
  ],
};

// Toes on a block with the heels hanging off the back, shoulder pads holding the
// weight, and the heel drops BELOW the block before it drives up. Must be
// visible: the heel travelling through a range the floor would not allow. Side
// view.
const STANDING_CALF_RAISE = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.2,
  fit: { k: 0.8, dy: 4 },
  props: [
    { type: "box", x: 63, y: 104, w: 34 },
    { type: "machine", x: 96, y: 100, w: 20, parts: ["lever"], leverX: 70, leverY: 30 },
  ],
  keys: [
    { // stretched, heel dropped below the block
      t: 0,
      root: { x: 64.2, y: 56.5, rot: 0 },
      joints: {
        spine: 2, neck: -2, shoulderR: -4, elbowR: 10, shoulderL: -4, elbowL: 11,
        hipR: 0, kneeR: 3, ankleR: 25, hipL: 0, kneeL: 3, ankleL: 25,
      },
    },
    { // top, heel driven high above the block
      t: 1,
      root: { x: 66.5, y: 43.8, rot: 0 },
      joints: {
        spine: 2, neck: -2, shoulderR: -4, elbowR: 10, shoulderL: -4, elbowL: 11,
        hipR: 0, kneeR: 3, ankleR: -40, hipL: 0, kneeL: 3, ankleL: -40,
      },
    },
  ],
};

// Sat with the knees bent to ninety and a pad over the thighs, toes on a low
// block, heels drive up. Must be visible: the knee staying bent all the way
// through, which is the whole reason this one exists next to the standing
// version. Side view.
const SEATED_CALF_RAISE = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.2,
  props: [
    { type: "machine", x: 30, y: 94, w: 30, parts: ["seat", "thighPad"], padX: 58, padY: 70, padW: 26 },
    { type: "box", x: 82, y: 104, w: 24 },
  ],
  keys: [
    { // heels down below the block, calf stretched
      t: 0,
      root: { x: 46, y: 84, rot: -4 },
      joints: {
        spine: 2, neck: 0, shoulderR: 10, elbowR: 34, shoulderL: 8, elbowL: 32,
        hipR: 94, kneeR: 86, ankleR: 20, hipL: 92, kneeL: 84, ankleL: 20,
      },
    },
    { // heels driven high, knee still folded
      t: 1,
      root: { x: 46, y: 84, rot: -4 },
      joints: {
        spine: 2, neck: 0, shoulderR: 10, elbowR: 34, shoulderL: 8, elbowL: 32,
        hipR: 110, kneeR: 88, ankleR: -38, hipL: 108, kneeL: 86, ankleL: -38,
      },
    },
  ],
};

// The leg press position with the legs left almost straight, so the ankle is the
// only joint that moves and the sled travels a few inches. Must be visible: a
// near locked knee with a big ankle swing, the opposite of the leg press it
// borrows its setup from. Side view.
const LEG_PRESS_CALF_RAISE = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.2,
  props: [
    { type: "bench", x: 4, y: 68, w: 47, incline: -70 },
    { type: "box", x: 32, y: 95, w: 30 },
    { type: "barbell", side: "L", point: "ankle", dx: 5, dy: -1, r: 12 },
    { type: "barbell", side: "R", point: "ankle", dx: 6, dy: -1, r: 12, front: true },
  ],
  keys: [
    { // toes taking the load, ankle pushed back toward the shin
      t: 0,
      root: { x: 46, y: 86, rot: -20 },
      joints: {
        spine: 2, neck: 6,
        hipR: 113, kneeR: 12, ankleR: 34, hipL: 110, kneeL: 14, ankleL: 34,
      },
      ik: { wristR: { x: 50, y: 100, bend: 1 }, wristL: { x: 44, y: 101, bend: 1 } },
    },
    { // pressed away through the ball of the foot, knee barely changed
      t: 1,
      root: { x: 46, y: 86, rot: -20 },
      joints: {
        spine: 2, neck: 6,
        hipR: 117, kneeR: 8, ankleR: -34, hipL: 114, kneeL: 10, ankleL: -34,
      },
      ik: { wristR: { x: 50, y: 100, bend: 1 }, wristL: { x: 44, y: 101, bend: 1 } },
    },
  ],
};

// One foot on a block, the other tucked up behind, a hand on something for
// balance. Must be visible: only one leg working, and its heel dropping below
// the block. Side view.
const SINGLE_LEG_CALF_RAISE = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.2,
  fit: { k: 0.8, dy: 4 },
  props: [{ type: "box", x: 63, y: 104, w: 34 }],
  keys: [
    { // heel dropped below the block, free leg hooked up behind
      t: 0,
      root: { x: 64.2, y: 56.5, rot: 0 },
      joints: {
        spine: 2, neck: -2, shoulderR: 24, elbowR: 22, shoulderL: 20, elbowL: 24,
        hipR: 0, kneeR: 3, ankleR: 25, hipL: -18, kneeL: 74, ankleL: -16,
      },
    },
    { // top, heel high above the block
      t: 1,
      root: { x: 66.5, y: 43.8, rot: 0 },
      joints: {
        spine: 2, neck: -2, shoulderR: 24, elbowR: 22, shoulderL: 20, elbowL: 24,
        hipR: 0, kneeR: 3, ankleR: -44, hipL: -18, kneeL: 74, ankleL: -16,
      },
    },
  ],
};

// Bent over at the hips with the forearms on a rail and the toes on a block,
// heels drive up behind. Must be visible: the folded torso, because the calf
// work itself looks the same as every other raise. Side view.
const DONKEY_CALF_RAISE = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.2,
  fit: { k: 0.86, dy: 4 },
  props: [
    { type: "box", x: 42, y: 104, w: 30 },
    { type: "bench", x: 86, y: 74, w: 34 },
  ],
  keys: [
    { // heels dropped, back flat and level
      t: 0,
      root: { x: 46, y: 56.5, rot: 30 },
      joints: {
        spine: 44, neck: -34,
        hipR: -30, kneeR: 3, ankleR: 22, hipL: -30, kneeL: 3, ankleL: 22,
      },
      ik: { wristR: { x: 92, y: 68, bend: 1 }, wristL: { x: 88, y: 69, bend: 1 } },
    },
    { // heels high, hips lifting with them
      t: 1,
      root: { x: 48.3, y: 45.5, rot: 30 },
      joints: {
        spine: 44, neck: -34,
        hipR: -30, kneeR: 3, ankleR: -42, hipL: -30, kneeL: 3, ankleL: -42,
      },
      ik: { wristR: { x: 92, y: 68, bend: 1 }, wristL: { x: 88, y: 69, bend: 1 } },
    },
  ],
};

// -------------------------------------------------------------------- abs ---

// On the floor with the knees bent, peel only the shoulder blades up and reach
// past the knees. Must be visible: a short range with the lower back never
// leaving the floor. Side view, supine, so rot is negative and the head is at
// -x. The hands reach rather than sit behind the head, because a hand next to
// the head is mush at card size.
const CRUNCH = {
  view: "side",
  loop: "pingpong",
  dur: 2.4,
  breath: 0.25,
  props: [{ type: "mat", x: 14, w: 110 }],
  keys: [
    { // down, whole back on the floor
      t: 0,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 0, neck: 5 },
      ik: {
        ankleR: { x: 100, y: 113.4, bend: -1 }, ankleL: { x: 96, y: 113.4, bend: -1 },
        wristR: { x: 74, y: 100, bend: 1 }, wristL: { x: 70, y: 101, bend: 1 },
      },
    },
    { // top, shoulder blades up, ribs pulled toward the hips, hips still down
      t: 1,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 30, neck: 20 },
      ik: {
        ankleR: { x: 100, y: 113.4, bend: -1 }, ankleL: { x: 96, y: 113.4, bend: -1 },
        wristR: { x: 82, y: 96, bend: 1 }, wristL: { x: 78, y: 97, bend: 1 },
      },
    },
  ],
};

// The whole torso comes off the floor until the chest is over the thighs. Must
// be visible: the far bigger range than the crunch it sits next to, and the hip
// folding to do it. Side view, supine.
const SIT_UP = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.25,
  props: [{ type: "mat", x: 14, w: 110 }],
  keys: [
    { // down, flat on the floor
      t: 0,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 0, neck: 5 },
      ik: {
        ankleR: { x: 100, y: 113.4, bend: -1 }, ankleL: { x: 96, y: 113.4, bend: -1 },
        wristR: { x: 74, y: 100, bend: 1 }, wristL: { x: 70, y: 101, bend: 1 },
      },
    },
    { // all the way up, torso vertical, hands reaching for the feet
      t: 1,
      root: { x: 72, y: 108, rot: -15 },
      joints: { spine: 20, neck: 10 },
      ik: {
        ankleR: { x: 100, y: 113.4, bend: -1 }, ankleL: { x: 96, y: 113.4, bend: -1 },
        wristR: { x: 96, y: 92, bend: 1 }, wristL: { x: 92, y: 93, bend: 1 },
      },
    },
  ],
};

// Shoulders stay down, the knees are drawn in and the hips curl off the floor.
// Must be visible: the hips leaving the floor with the chest never moving, which
// is the exact opposite of the crunch. Side view, supine.
const REVERSE_CRUNCH = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.25,
  props: [{ type: "mat", x: 14, w: 110 }],
  keys: [
    { // start, thighs vertical, shins level, hips on the floor
      t: 0,
      root: { x: 72, y: 108, rot: -90 },
      joints: {
        spine: 0, neck: 6,
        hipR: 270, kneeR: 90, ankleR: -20, hipL: 268, kneeL: 92, ankleL: -20,
      },
      ik: { wristR: { x: 88, y: 110, bend: 1 }, wristL: { x: 85, y: 111, bend: 1 } },
    },
    { // knees pulled over the chest, hips curled up off the floor
      t: 1,
      root: { x: 70, y: 100, rot: -105 },
      joints: {
        spine: 0, neck: 14,
        hipR: 335, kneeR: 120, ankleR: -16, hipL: 333, kneeL: 122, ankleL: -16,
      },
      ik: { wristR: { x: 88, y: 110, bend: 1 }, wristL: { x: 85, y: 111, bend: 1 } },
    },
  ],
};

// Kneeling under a high pulley with the rope at the head, curl the ribs down
// toward the thighs. Must be visible: the SPINE rounding rather than the hips
// folding, and the cable coming from above. Side view.
const CABLE_CRUNCH = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [{ type: "cable", x: 106, top: 12, y0: 46, to: { side: "R", point: "hand" } }],
  keys: [
    { // tall, hips stacked over the knees, rope held at the head
      t: 0,
      root: { x: 58, y: 83.5, rot: 10 },
      joints: {
        spine: 0, neck: -2,
        hipR: -10, kneeR: 90, ankleR: -58, hipL: -10, kneeL: 90, ankleL: -58,
      },
      ik: { wristR: { x: 82, y: 30, bend: 1 }, wristL: { x: 78, y: 32, bend: 1 } },
    },
    { // crunched, spine rounded, elbows driven toward the thighs
      t: 1,
      root: { x: 58, y: 83.5, rot: 10 },
      joints: {
        spine: 50, neck: 22,
        hipR: -10, kneeR: 90, ankleR: -58, hipL: -10, kneeL: 90, ankleL: -58,
      },
      ik: { wristR: { x: 104, y: 46, bend: 1 }, wristL: { x: 100, y: 48, bend: 1 } },
    },
  ],
};

// Legs and torso fold up at the same time until the hands meet the feet. Must be
// visible: the V, both halves lifting together. Side view, supine, head at -x.
const V_UP = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.25,
  props: [{ type: "mat", x: 14, w: 110 }],
  keys: [
    { // long on the floor, arms overhead behind the head
      t: 0,
      root: { x: 72, y: 108, rot: -90 },
      joints: {
        spine: 0, neck: 2,
        hipR: 180, kneeR: 4, ankleR: -30, hipL: 178, kneeL: 6, ankleL: -30,
      },
      ik: { wristR: { x: 18, y: 104, bend: 1 }, wristL: { x: 22, y: 105, bend: 1 } },
    },
    { // half way, arms sweeping past the head rather than through the shoulder
      t: 0.5,
      root: { x: 72, y: 108, rot: -75 },
      joints: {
        spine: 12, neck: 4,
        hipR: 187, kneeR: 4, ankleR: -30, hipL: 185, kneeL: 6, ankleL: -30,
      },
      ik: { wristR: { x: 46, y: 74, bend: 1 }, wristL: { x: 42, y: 76, bend: 1 } },
    },
    { // the V, hands out at the shins
      t: 1,
      root: { x: 72, y: 108, rot: -60 },
      joints: {
        spine: 25, neck: 6,
        hipR: 195, kneeR: 4, ankleR: -30, hipL: 193, kneeL: 6, ankleL: -30,
      },
      ik: { wristR: { x: 92, y: 82, bend: 1 }, wristL: { x: 88, y: 84, bend: 1 } },
    },
  ],
};

// Hanging from a bar, the straight legs come all the way up until the toes touch
// it. Must be visible: the feet arriving at bar height. Side view.
const TOES_TO_BAR = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.82, dy: 4 },
  props: [{ type: "pullupBar", y: 8, x0: 34, x1: 106 }],
  keys: [
    { // hang, knees softly bent so the feet are not through the floor
      t: 0,
      root: { x: 70, y: 73, rot: 0 },
      joints: {
        spine: 2, neck: 0,
        hipR: -12, kneeR: 75, ankleR: -50, hipL: -10, kneeL: 78, ankleL: -50,
      },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
    { // knees driven up bent, so the feet never sweep down through the floor
      t: 0.25,
      root: { x: 70.5, y: 72.5, rot: -4 },
      joints: {
        spine: 0, neck: -2,
        hipR: 40, kneeR: 110, ankleR: -40, hipL: 38, kneeL: 112, ankleL: -40,
      },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
    { // knees up first, tucked, which is also how the rep actually goes
      t: 0.5,
      root: { x: 71, y: 72, rot: -8 },
      joints: {
        spine: 0, neck: -4,
        hipR: 98, kneeR: 90, ankleR: -30, hipL: 96, kneeL: 92, ankleL: -30,
      },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
    { // toes at the bar, body leant back under it, legs long
      t: 1,
      root: { x: 72, y: 70, rot: -20 },
      joints: {
        spine: 0, neck: -6,
        hipR: 180, kneeR: 4, ankleR: -40, hipL: 178, kneeL: 6, ankleL: -40,
      },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
  ],
};

// Kneeling behind a wheel, roll it out until the body is one long line from knee
// to hands, then drag it back. Must be visible: the body straightening out over
// the floor rather than the hips folding. Side view.
const AB_WHEEL_ROLLOUT = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.2,
  fit: { k: 0.92, dy: 2 },
  props: [
    { type: "mat", x: 10, w: 120 },
    { type: "barbell", side: "R", point: "hand", dx: 0, dy: 2, r: 7, front: true },
  ],
  keys: [
    { // tucked, wheel under the shoulders
      t: 0,
      root: { x: 50, y: 80, rot: 25 },
      joints: {
        spine: 30, neck: -18,
        hipR: -25, kneeR: 90, ankleR: -58, hipL: -25, kneeL: 90, ankleL: -58,
      },
      ik: { wristR: { x: 86, y: 97, bend: 1 }, wristL: { x: 82, y: 98, bend: 1 } },
    },
    { // rolled out, knee to shoulder one long line just off the floor
      t: 1,
      root: { x: 74.2, y: 95.1, rot: 20 },
      joints: {
        spine: 44, neck: -26,
        hipR: -84, kneeR: 26, ankleR: -58, hipL: -84, kneeL: 26, ankleL: -58,
      },
      ik: { wristR: { x: 118, y: 101, bend: 1 }, wristL: { x: 114, y: 102, bend: 1 } },
    },
  ],
};

// -------------------------------------------------------------- obliques ---

// Sat leaning back with the knees bent, hands together, rotating side to side.
// Must be visible: the lean-back V-sit with the feet off the floor and the hands
// travelling in an arc. The rotation itself is not drawn, in either view.
// Front view was tried once the rig learned to fold an arm across the chest, and
// the arms did work. The legs did not: a front view cannot foreshorten a shin
// pointed at the camera, so a seated figure has to splay its knees wide and the
// whole thing collapses into a ball of overlapping limbs at any size. Side on,
// the V-sit, the lifted feet and the arc of the hands are all true, and that
// setup is unique in this library.
const RUSSIAN_TWIST = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.25,
  props: [{ type: "mat", x: 14, w: 110 }],
  keys: [
    { // hands high on one side, chest open
      t: 0,
      root: { x: 62, y: 100, rot: -35 },
      joints: {
        spine: 0, neck: 4,
        hipR: 145, kneeR: 70, ankleR: -25, hipL: 143, kneeL: 72, ankleL: -25,
      },
      ik: { wristR: { x: 78, y: 76, bend: 1 }, wristL: { x: 74, y: 78, bend: 1 } },
    },
    { // swung down and across toward the other hip
      t: 1,
      root: { x: 62, y: 100, rot: -30 },
      joints: {
        spine: 0, neck: 8,
        hipR: 140, kneeR: 66, ankleR: -25, hipL: 138, kneeL: 68, ankleL: -25,
      },
      ik: { wristR: { x: 68, y: 102, bend: 1 }, wristL: { x: 64, y: 103, bend: 1 } },
    },
  ],
};

// A bell in one hand, bend sideways at the waist and come back up. Must be
// visible: the sideways bend, which only exists in the frontal plane. Front view.
const SIDE_BEND = {
  view: "front",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [{ type: "dumbbell", side: "R", point: "hand", dx: 3, dy: 5, rot: 0, k: 0.85, front: true }],
  keys: [
    { // stood square, bell hanging at the side
      t: 0,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: {
        spine: 0, neck: 0, shoulderR: 2, elbowR: 2, shoulderL: 34, elbowL: 96,
        hipR: 4, hipL: 4, kneeR: 3, kneeL: 3,
      },
      ik: { ankleR: { x: 76, y: 113.4, bend: -1 }, ankleL: { x: 64, y: 113.4, bend: -1 } },
    },
    { // bent over toward the loaded side, bell sliding down the thigh
      t: 1,
      root: { x: 70, y: 62.4, rot: 16 },
      joints: {
        spine: 0, neck: -4, shoulderR: 2, elbowR: 2, shoulderL: 34, elbowL: 96,
        hipR: 4, hipL: 4, kneeR: 3, kneeL: 3,
      },
      ik: { ankleR: { x: 76, y: 113.4, bend: -1 }, ankleL: { x: 64, y: 113.4, bend: -1 } },
    },
  ],
};

// Stood side on to a cable with the handle at the sternum, press it out and
// refuse to let it turn you. Must be visible: the cable pulling from the SIDE
// while the body stays square. Front view, because side on the cable would be in
// front of or behind the figure, which is a different exercise entirely.
// Both hands now hold the handle at the sternum, which needs each arm to fold
// across its own chest: front view arms pin with bend -1 to fold inward, and the
// crossing arms draw over the torso. The press itself travels at the camera and
// cannot be drawn, so it reads as the elbows going from tucked and wide to long.
const PALLOF_PRESS = {
  view: "front",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [{ type: "cable", x: 16, top: 44, y0: 52, to: { side: "L", point: "hand" } }],
  keys: [
    { // handle held at the sternum, elbows tucked down
      t: 0,
      root: { x: 74, y: 62, rot: 0 },
      joints: {
        spine: 0, neck: 0,
        hipR: 5, hipL: 5, kneeR: 4, kneeL: 4,
      },
      ik: {
        ankleR: { x: 82, y: 113.4, bend: -1 }, ankleL: { x: 68, y: 113.4, bend: -1 },
        wristR: { x: 73, y: 40, bend: -1 }, wristL: { x: 70, y: 41, bend: -1 },
      },
    },
    { // pressed long, hands still dead centre, body refusing to rotate
      t: 1,
      root: { x: 74, y: 62, rot: -2 },
      joints: {
        spine: 0, neck: 0,
        hipR: 5, hipL: 5, kneeR: 4, kneeL: 4,
      },
      ik: {
        ankleR: { x: 82, y: 113.4, bend: -1 }, ankleL: { x: 68, y: 113.4, bend: -1 },
        wristR: { x: 72, y: 52, bend: -1 }, wristL: { x: 69, y: 53, bend: -1 },
      },
    },
  ],
};

// A cable driven on a long diagonal from high on one side to low across the
// opposite hip. Must be visible: that diagonal crossing the midline. It crosses
// the body, so this leaves the suggested side view for the front, where side on
// the chop collapses into a straight-arm pulldown.
// Both hands are on the handle now. The far arm reaches across the chest at the
// top and the near arm crosses at the bottom, and whichever one is crossing
// draws in front of the torso. The body leans after the handle, which is the
// rig's stand-in for a rotation it cannot make: with no twist about the spine,
// the far shoulder cannot travel, so the lean is what buys the reach.
const WOODCHOPPER = {
  view: "front",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  farSide: "L",
  props: [{ type: "cable", x: 122, top: 14, y0: 44, to: { side: "R", point: "hand" } }],
  keys: [
    { // wound up high to the right
      t: 0,
      root: { x: 70, y: 62, rot: 10 },
      joints: {
        spine: 0, neck: -4,
        hipR: 5, hipL: 5, kneeR: 4, kneeL: 4,
      },
      ik: {
        ankleR: { x: 80, y: 113.4, bend: -1 }, ankleL: { x: 60, y: 113.4, bend: -1 },
        wristR: { x: 104, y: 28, bend: -1 }, wristL: { x: 100, y: 31, bend: -1 },
      },
    },
    { // through the middle of the arc, hands outside the near shoulder
      t: 0.5,
      root: { x: 70, y: 68, rot: 0 },
      joints: {
        spine: 0, neck: 0,
        hipR: 5, hipL: 5, kneeR: 4, kneeL: 4,
      },
      ik: {
        ankleR: { x: 80, y: 113.4, bend: -1 }, ankleL: { x: 60, y: 113.4, bend: -1 },
        wristR: { x: 86, y: 58, bend: -1 }, wristL: { x: 82, y: 60, bend: -1 },
      },
    },
    { // chopped through to the low left, hips and knees giving with it
      t: 1,
      root: { x: 70, y: 76, rot: -8 },
      joints: {
        spine: 0, neck: 6,
        hipR: 5, hipL: 5, kneeR: 4, kneeL: 4,
      },
      ik: {
        ankleR: { x: 80, y: 113.4, bend: -1 }, ankleL: { x: 60, y: 113.4, bend: -1 },
        wristR: { x: 60, y: 78, bend: -1 }, wristL: { x: 56, y: 80, bend: -1 },
      },
    },
  ],
};

// Hanging from a bar with the legs held high, the feet sweep from one side to
// the other like a wiper. Must be visible: the legs staying HIGH the whole time,
// which is what separates it from the hanging leg raise it sits beside.
// The sweep itself is lateral and this rig cannot draw it: front on, the leg that
// travels away from its own side needs a hip angle no hip reaches, and the check
// is right to refuse it. So the side view keeps the true part, legs pinned high
// under a bar and moving through the top of the arc, and loses the direction.
const HANGING_WINDSHIELD_WIPER = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.82, dy: 4 },
  props: [{ type: "pullupBar", y: 8, x0: 34, x1: 106 }],
  keys: [
    { // legs high and forward, hips already fully flexed
      t: 0,
      root: { x: 72, y: 70, rot: -16 },
      joints: {
        spine: 0, neck: -4,
        hipR: 172, kneeR: 8, ankleR: -34, hipL: 170, kneeL: 10, ankleL: -34,
      },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
    { // swept across, still high, body counter-rotating under the bar
      t: 1,
      root: { x: 68, y: 72, rot: -4 },
      joints: {
        spine: 0, neck: -4,
        hipR: 128, kneeR: 12, ankleR: -30, hipL: 126, kneeL: 14, ankleL: -30,
      },
      ik: { wristR: { x: 70, y: 9, bend: 1 }, wristL: { x: 65, y: 9, bend: 1 } },
    },
  ],
};

// ------------------------------------------------------------- lower back ---

// On hands and knees, the opposite arm and leg reach out until both are level
// with the flat back. Must be visible: the long diagonal from fingertip to heel
// with the back not moving. Side view.
const BIRD_DOG = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  fit: { k: 0.9, dy: 4 },
  props: [{ type: "mat", x: 10, w: 120 }],
  keys: [
    { // neutral quadruped, all four down
      t: 0,
      root: { x: 66, y: 84, rot: 90 },
      joints: {
        spine: 0, neck: -14, wristR: 86, wristL: 86,
        hipR: -90, kneeR: 90, ankleR: -58, hipL: -90, kneeL: 90, ankleL: -58,
      },
      ik: {
        wristR: { x: 95, y: 113, bend: 1 }, wristL: { x: 91, y: 113, bend: 1 },
      },
    },
    { // left arm and right leg long, both level with the back
      t: 1,
      root: { x: 66, y: 84, rot: 90 },
      joints: {
        spine: 0, neck: -10, wristR: 86, wristL: 0,
        hipR: -90, kneeR: 90, ankleR: -58, hipL: -180, kneeL: 4, ankleL: -20,
      },
      ik: {
        wristR: { x: 95, y: 113, bend: 1 }, wristL: { x: 124, y: 80, bend: 1 },
      },
    },
  ],
};

// Face down on the floor, chest and straight legs lift at the same time. Must be
// visible: both ends clear of the floor at once, the banana shape.
// This leaves the suggested back view. From behind, a prone figure is drawn as a
// standing one with the arms overhead, and the whole point, that the body is off
// the floor, cannot be seen at all. Side on it is unmistakable. Prone, so rot is
// POSITIVE and the head is at +x.
const SUPERMAN = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.3,
  fit: { k: 0.84, dy: 2 },
  props: [{ type: "mat", x: 8, w: 124 }],
  keys: [
    { // flat, arms long in front, legs long behind
      t: 0,
      root: { x: 70, y: 106, rot: 90 },
      joints: {
        spine: 0, neck: -10,
        hipR: -180, kneeR: 4, ankleR: -58, hipL: -180, kneeL: 6, ankleL: -58,
      },
      ik: { wristR: { x: 132, y: 108, bend: 1 }, wristL: { x: 128, y: 109, bend: 1 } },
    },
    { // chest and feet both lifted, back extended
      t: 1,
      root: { x: 70, y: 106, rot: 80 },
      joints: {
        spine: -15, neck: -22,
        hipR: -176, kneeR: 4, ankleR: -58, hipL: -176, kneeL: 6, ankleL: -58,
      },
      ik: { wristR: { x: 132, y: 96, bend: 1 }, wristL: { x: 128, y: 97, bend: 1 } },
    },
  ],
};

// Hips locked on a pad with the feet anchored, the torso folds down and comes
// back up to level. Must be visible: the pad at the hip, so the bend is clearly
// at the hip rather than a standing hinge. Side view, prone.
// The hip is the pivot, so the whole pelvis rotates: root.rot carries it and the
// authored hip angle is walked back by the same amount to keep the legs still.
const BACK_EXTENSION = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  fit: { k: 0.92, dy: 2 },
  props: [
    { type: "bench", x: 54, y: 88, w: 26 },
    { type: "roller", x: 26, y: 100, r: 5.5 },
  ],
  keys: [
    { // level, body in one line from heel to head
      t: 0,
      root: { x: 66, y: 76, rot: 40 },
      joints: {
        spine: 0, neck: -6,
        hipR: -85, kneeR: 20, ankleR: -58, hipL: -85, kneeL: 20, ankleL: -58,
      },
      ik: {
        wristR: { rel: "chest", x: 1, y: 14, bend: 1 },
        wristL: { rel: "chest", x: -3, y: 15, bend: 1 },
      },
    },
    { // folded down over the pad, legs untouched
      t: 1,
      root: { x: 66, y: 76, rot: 100 },
      joints: {
        spine: 20, neck: 8,
        hipR: -145, kneeR: 20, ankleR: -58, hipL: -145, kneeL: 20, ankleL: -58,
      },
      ik: {
        wristR: { rel: "chest", x: -14, y: 4, bend: 1 },
        wristL: { rel: "chest", x: -17, y: 5, bend: 1 },
      },
    },
  ],
};

// Face down on a high pad with the hips at its edge, the straight legs swing
// from hanging down to level behind. Must be visible: the torso pinned to the
// pad while only the legs travel. Side view, prone.
const REVERSE_HYPEREXTENSION = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.25,
  fit: { k: 0.85, dy: 6 },
  props: [{ type: "bench", x: 58, y: 58, w: 62 }],
  keys: [
    { // legs hanging straight down off the end
      t: 0,
      root: { x: 60, y: 50, rot: 90 },
      joints: {
        spine: 0, neck: -12,
        hipR: -90, kneeR: 5, ankleR: -20, hipL: -90, kneeL: 7, ankleL: -20,
      },
      ik: { wristR: { x: 104, y: 70, bend: 1 }, wristL: { x: 100, y: 71, bend: 1 } },
    },
    { // swung up to level with the pad, glutes and lower back doing it
      t: 1,
      root: { x: 60, y: 50, rot: 90 },
      joints: {
        spine: 0, neck: -16,
        hipR: -170, kneeR: 5, ankleR: -40, hipL: -170, kneeL: 7, ankleL: -40,
      },
      ik: { wristR: { x: 104, y: 70, bend: 1 }, wristL: { x: 100, y: 71, bend: 1 } },
    },
  ],
};

// Walk with a heavy weight in ONE hand and refuse to lean. Must be visible: the
// load on one side only and the body staying square over it.
// That asymmetry is the exercise and it is lateral, so this leaves the suggested
// side view for the front, where side on the two arms sit on top of each other
// and it reads as a walk with a dumbbell.
const SUITCASE_CARRY = {
  view: "front",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.3,
  breathRate: 0.9,
  farSide: "L",
  feet: { R: { ang: 8, len: 0.42, w: 1.3 }, L: { ang: 8, len: 0.42, w: 1.3 } },
  props: [{ type: "dumbbell", side: "R", point: "hand", dx: 4, dy: 6, rot: 0, k: 0.95, front: true }],
  keys: [
    { // square under the load, free arm quiet
      t: 0,
      root: { x: 68, y: 61.4, rot: 0 },
      joints: {
        spine: 0, neck: 0, shoulderR: 3, elbowR: 2, shoulderL: 8, elbowL: 6,
        hipR: 4, hipL: 4, kneeR: 3, kneeL: 3,
      },
      ik: { ankleR: { x: 74, y: 113.4, bend: -1 }, ankleL: { x: 62, y: 113.4, bend: -1 } },
    },
    { // a step later, still square, the load still trying to tip it over
      t: 1,
      root: { x: 69, y: 62.4, rot: -3 },
      joints: {
        spine: 0, neck: 0, shoulderR: 2, elbowR: 3, shoulderL: 14, elbowL: 10,
        hipR: 4, hipL: 4, kneeR: 3, kneeL: 3,
      },
      ik: { ankleR: { x: 74, y: 113.4, bend: -1 }, ankleL: { x: 62, y: 113.4, bend: -1 } },
    },
  ],
};

// Bar on the floor, take the slack out and stand up with it. Must be visible:
// the bar STARTING on the floor with the knees bent, which is the whole
// difference from the Romanian deadlift it sits beside. Side view.
const DEADLIFT = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.2,
  props: [{ type: "barbell", side: "R", point: "hand", r: 9.5, front: true }],
  keys: [
    { // stood tall at lockout, bar at the hips
      t: 0,
      root: { x: 64, y: 61.4, rot: 3 },
      joints: { spine: 3, neck: -2, shoulderR: -6, elbowR: 2, shoulderL: -6, elbowL: 3 },
      ik: { ...SQUAT_FEET },
    },
    { // start position, bar on the floor, shins close to it, back flat
      t: 1,
      root: { x: 46, y: 76, rot: 30 },
      joints: { spine: 30, neck: -24, shoulderR: -60, elbowR: 2, shoulderL: -60, elbowL: 3 },
      ik: { ...SQUAT_FEET },
    },
  ],
};

export const MOVES = {
  "Barbell Back Squat": BARBELL_BACK_SQUAT,
  "Front Squat": FRONT_SQUAT,
  "Zercher Squat": ZERCHER_SQUAT,
  "Hack Squat": HACK_SQUAT,
  "Leg Press": LEG_PRESS,
  "Leg Extension": LEG_EXTENSION,
  "Sissy Squat": SISSY_SQUAT,

  "Romanian Deadlift": ROMANIAN_DEADLIFT,
  "Stiff-Leg Deadlift": STIFF_LEG_DEADLIFT,
  "Single-Leg Romanian Deadlift": SINGLE_LEG_ROMANIAN_DEADLIFT,
  "Good Morning": GOOD_MORNING,
  "Leg Curl": LEG_CURL,
  "Glute-Ham Raise": GLUTE_HAM_RAISE,
  "Cable Pull-Through": CABLE_PULL_THROUGH,

  "Glute Bridge": GLUTE_BRIDGE,
  "Hip Thrust": HIP_THRUST,
  "Sumo Deadlift": SUMO_DEADLIFT,
  "Curtsy Lunge": CURTSY_LUNGE,
  "Frog Pump": FROG_PUMP,
  "Cable Kickback": CABLE_KICKBACK,

  "Dumbbell Calf Raise": DUMBBELL_CALF_RAISE,
  "Standing Calf Raise": STANDING_CALF_RAISE,
  "Seated Calf Raise": SEATED_CALF_RAISE,
  "Leg Press Calf Raise": LEG_PRESS_CALF_RAISE,
  "Single-Leg Calf Raise": SINGLE_LEG_CALF_RAISE,
  "Donkey Calf Raise": DONKEY_CALF_RAISE,

  "Crunch": CRUNCH,
  "Sit-Up": SIT_UP,
  "Reverse Crunch": REVERSE_CRUNCH,
  "Cable Crunch": CABLE_CRUNCH,
  "V-Up": V_UP,
  "Toes-to-Bar": TOES_TO_BAR,
  "Ab Wheel Rollout": AB_WHEEL_ROLLOUT,

  "Russian Twist": RUSSIAN_TWIST,
  "Side Bend": SIDE_BEND,
  "Pallof Press": PALLOF_PRESS,
  "Woodchopper": WOODCHOPPER,
  "Hanging Windshield Wiper": HANGING_WINDSHIELD_WIPER,

  "Bird Dog": BIRD_DOG,
  "Superman": SUPERMAN,
  "Back Extension": BACK_EXTENSION,
  "Reverse Hyperextension": REVERSE_HYPEREXTENSION,
  "Suitcase Carry": SUITCASE_CARRY,
  "Deadlift": DEADLIFT,
};
