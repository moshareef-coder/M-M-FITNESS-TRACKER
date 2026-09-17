// Weight-training moves, upper body: chest, back, traps, shoulders, biceps, triceps, forearms.
// Keys are the EXACT `name` from knowledge/exercise-library/weight-training.mjs.
// Merged into ./weight-training.mjs; do not import this file directly.
//
// Every entry carries, above it, the three things AUTHORING.md asks for: one
// sentence of what the real movement looks like, the one thing that MUST be
// visible, and the view that shows it. Where the view differs from the
// suggested one in AUTHORING.md the comment says why.

import { PULL_UP, DIP } from "./calisthenics.mjs";

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
/* HOW THE SEVEN BENCH PRESSES MOVE, AND WHY THEY ARE ANGLES, NOT HAND PINS.

   Mo's frame for the bottom of a bench press, side on: the bell fixed end on
   above the chest, the elbow hanging below the bench line, the forearm rising
   to the bell. And his rule for the rep: "smooth, up, down, up, down, as simple
   as a normal bench press."

   Every version of these that pinned the hand and let the solver place the
   elbow failed that rule in the middle of the rep, in three different ways. A
   hand pin gives a two bone arm exactly two elbow positions per frame and the
   solver picks one per frame, so as the hand descends the elbow switches
   sides: it sat above the shoulder pointing at the head, then jumped to below
   it in one step, passing flat across the chest on the way. Steering that with
   an IK pole pointed the elbow straight at the camera, which side on drew the
   whole arm as a stub. Adding a middle keyframe to fix the path put a pause in
   the rep, because the easing runs per segment and treats every key as a stop.

   So the arms are driven by joint angles, the way Seated Dumbbell Press
   already works. The bottom is Mo's frame copied exactly, solved numerically
   to within half a unit at elbow and wrist: the elbow ten units below the
   shoulder toward the bench and five toward the feet, the wrist eight toward
   the feet and a shade above, the forearm vertical. The top is the arm
   straight up on screen.

   Two things about the path between them, each of which cost a round.

   The elbow must break toward the FEET on the way down, never toward the
   head, and the upper arm must never point at the camera (side on that draws
   the shoulder sinking into the chest). Abduction in this rig scales the
   whole in plane arm direction by cos(abd) and puts the rest toward the
   camera, so a sweep of abduction through 90 always passes through the
   camera, and a lerp of the in plane angle from straight up (-90) to the
   bottom (113) passes 0, which is the head. The top is therefore written one
   full turn round, 270 instead of -90: the same pixel, but the lerp to 113
   now sweeps past 180, which is the feet.

   Two keys alone still overswung, the elbow going seventeen units toward the
   feet and back, so there is a halfway key marked `through: true`. The rig
   treats that as a waypoint, easing across the whole span rather than
   stopping on it, which is what a plain middle keyframe used to do and why
   the presses were held to two keys before. The waypoint was searched so the
   bell drops on the two key timing and stays on its vertical line while the
   elbow goes out toward the feet and down. Rotation MIRRORS between sides
   while abduction does not, so the left arm takes the opposite rotation sign
   or it swings to the floor.

   Close-Grip Bench Press is two keys from the same top, with the elbow kept
   to forty of abduction so it tucks toward the feet under the bar, which is
   the elbow that defines it. */

// Front view feet: a foot pointing at the camera is drawn short and wide
// rather than rotated. The same `ang` mirrors, because dirV takes the side sign.
const FRONT_FEET = { R: { ang: 12, len: 0.4, w: 1.3 }, L: { ang: 12, len: 0.4, w: 1.3 } };

// ---------------------------------------------------------------- chest ----

// Supine on a flat bench, a dumbbell in each hand, press from beside the chest
// to straight overhead. Must be visible: the vertical travel of the hands with
// the elbows folding out at the bottom. Side view, sagittal.
// Same chassis as the seeded Barbell Bench Press: root.rot -90 is supine, which
// puts the head at -x and runs the legs out to +x.
// The bells are the default "level": drawn end on, and FIXED for the whole rep.
// Mo, against three reference photos of flat and incline dumbbell benching:
// "the dumbbells need to be straight... when they go down, they don't move.
// They just go down, up, down, up." Side on to a pronated press the camera is
// looking straight down the handle, so a hexagon is the honest picture, and
// the grip does not turn during a press so the picture does not turn either.
// An earlier version used "follow", which tilts the bell with the forearm, on
// the idea that a bench press is gripped neutral. The photos say otherwise,
// and even where a lifter does go neutral the bell still does not rotate rep
// to rep. "follow" stays right where the grip genuinely is neutral and the
// forearm genuinely swings: hammer curls, rows, kickbacks, carries.
/* ALL SEVEN BENCH PRESSES ARE SIDE ON, and were turned to a three quarter
   view for a while so the flared elbow would read. Mo chose the side view,
   against a render of this exact move at the bottom of the rep. The note at
   the top of the file says how the arms are driven; nothing about that depends
   on the camera. */
const DUMBBELL_BENCH_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  props: [
    { type: "bench", x: 26, y: 92, w: 78 },
    { type: "dumbbell", side: "L", point: "hand", k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", k: 0.8, front: true },
  ],
  keys: [
    { // lockout, bells nearly touching over the chest
      t: 0,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 0, neck: -4, shoulderR: 270, shoulderL: 270, shoulderAbdR: 0, shoulderAbdL: 0, elbowR: 0, elbowL: 0, shoulderRotR: 30, shoulderRotL: -30 },
      ik: { ...stand(108, 112) },
    },
    { // halfway, a waypoint not a stop: elbow out toward the feet, bell on its line
      t: 0.5, through: true,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 2, neck: -6, shoulderR: 205, shoulderL: 205, shoulderAbdR: 59, shoulderAbdL: 59, elbowR: 103, elbowL: 103, shoulderRotR: -10, shoulderRotL: 10 },
      ik: { ...stand(108, 112) },
    },
    { // bottom, bells beside the chest, elbows folded out under the hands
      t: 1,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 2, neck: -6, shoulderR: 113, shoulderL: 113, shoulderAbdR: 56, shoulderAbdL: 56, elbowR: 78, elbowL: 78, shoulderRotR: 60, shoulderRotL: -60 },
      ik: { ...stand(108, 112) },
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
    /* The machine is artwork; the two press arms are levers hinged at the
       overhead pivot behind the head, the way the real chest press hangs its
       handles. The near arm draws over the body, the far one behind. */
    { type: "artwork", src: "/knowledge/motion/props/chest-press.svg" },
    { type: "lever", pivot: { x: 43, y: 14 }, to: { side: "L", point: "hand" }, r: 2.2, end: "grip" },
    { type: "lever", pivot: { x: 43, y: 14 }, to: { side: "R", point: "hand" }, r: 2.2, end: "grip", front: true },
  ],
  keys: [
    { // start, handles level with the chest, elbows behind the torso line
      t: 0,
      root: { x: 52, y: 86, rot: -6 },
      joints: { spine: 0, neck: -2 },
      ik: { wristR: { x: 67.6, y: 67.1, bend: 1 }, wristL: { x: 64.6, y: 69.1, bend: 1 }, ...stand(82, 78) },
    },
    { // lockout, arms long, chest still against the pad
      t: 1,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: -2, neck: -3 },
      ik: { wristR: { x: 87.1, y: 57.1, bend: 1 }, wristL: { x: 83.7, y: 59.2, bend: 1 }, ...stand(82, 78) },
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
  props: [
    // the pec fly / rear delt machine: seat, back pad, mast, head beam and
    // stack are still artwork; the two swing arms are levers hung from the
    // pivots under the head beam so they follow the hands
    { type: "artwork", src: "/knowledge/motion/props/pec-deck.svg" },
    { type: "lever", pivot: { x: 37, y: 8 }, to: { side: "L", point: "hand" }, r: 2.2, end: "grip" },
    { type: "lever", pivot: { x: 103, y: 8 }, to: { side: "R", point: "hand" }, r: 2.2, end: "grip", front: true },
  ],
  keys: [
    { // open, elbows wide out at shoulder height, forearms up on the pads
      t: 0,
      root: { x: 70, y: 80, rot: 0 },
      joints: {
        spine: 0, neck: 0, shoulderR: 95, shoulderL: 95, elbowR: 90, elbowL: 90,
        hipR: 24, hipL: 24, hipAbdR: 64, hipAbdL: 64, hipRotR: -50, hipRotL: -50, kneeR: 40, kneeL: 40,
      },
      ik: {},
    },
    { // squeezed: the elbows travel in to meet in front of the chest with the
      // forearms still up. The fold is turned by shoulderRot rather than by
      // flipping the sign of the elbow: a sign flip passes through a straight
      // arm halfway up the rep, and mid rep this read as a wide fly with two
      // dead straight arms, which is a different exercise.
      t: 1,
      root: { x: 70, y: 80, rot: 0 },
      joints: {
        spine: 0, neck: 0, shoulderR: 17, shoulderL: 17, elbowR: 96, elbowL: 96,
        hipR: 24, hipL: 24, hipAbdR: 64, hipAbdL: 64, hipRotR: -50, hipRotL: -50, kneeR: 40, kneeL: 40,
                shoulderRotR: -95, shoulderRotL: -95 },
      ik: {},
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
    /* Two towers with the crossover's overhead beam joining them, so they
       read as one machine and not two columns that happen to be nearby. */
    { type: "artwork", src: "/knowledge/motion/props/crossover-beam.svg" },
    { type: "cable", x: 10, top: 10, y0: 44, grip: "handle", to: { side: "L", point: "hand" } },
    { type: "cable", x: 130, top: 10, y0: 44, grip: "handle", to: { side: "R", point: "hand" }, front: true },
  ],
  keys: [
    { // open, arms wide at shoulder height and a little forward of the body,
      // chest stretched, elbows soft and fixed for the whole rep
      t: 0,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: {
        spine: 0, neck: 0,
        shoulderR: 88, shoulderL: 88, shoulderAbdR: 10, shoulderAbdL: 10,
        shoulderRotR: -20, shoulderRotL: -20, elbowR: 22, elbowL: 22,
      },
      ik: { ...stand(78, 62) },
    },
    { /* Closed: the hands meet IN FRONT OF THE CHEST, arms forward, like going
         in for a hug. Mo: "his arms should be facing as if he was going in for
         a hug... both arms are forward. Hugging." This used to finish at
         shoulder -12, which points the arms DOWN and slightly behind the body,
         so the near hand ended up level with the hip and read as being behind
         his backside. That is a low crossover, not a chest fly.

         Getting the hands to the midline in a FRONT view takes three channels,
         not one. shoulderAbd swings the arm forward at the camera, which
         foreshortens it. The in-plane shoulder angle brings it across the
         body. And shoulderRot turns the elbow's own swing plane, which is the
         only thing that decides whether the forearm folds inward toward the
         midline or outward away from it; without it the hands stay 30 units
         apart no matter what the other two do.

         The exact numbers are a balance, not an optimum. Pushed all the way
         the hands meet at the midline, which is correct and unreadable: both
         arm segments end up pointed straight at the lens and the arms vanish
         into the torso, leaving two handles floating at the chest. These land
         the hands 9 units apart at chest height with the ELBOWS still outside
         them, which is the shape of a hug, and keep enough upper arm on screen
         to see. */
      t: 1,
      root: { x: 70, y: 62, rot: 0 },
      joints: {
        spine: 0, neck: 0,
        shoulderR: -28, shoulderL: -28, shoulderAbdR: 55, shoulderAbdL: 55,
        shoulderRotR: -95, shoulderRotL: -95, elbowR: 30, elbowL: 30,
      },
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
    { type: "cable", x: 14, top: 98, y0: 70, grip: "handle", to: { side: "L", point: "hand" } },
    { type: "cable", x: 14, top: 98, y0: 70, grip: "handle", to: { side: "R", point: "hand" }, front: true },
  ],
  // Authored as shoulder ANGLES on a fixed soft elbow, not as wrist pins, for
  // the reason written up over STRAIGHT_ARM_PULLDOWN. The old bottom pin sat 57
  // units from a 37 unit arm, so the solver clamped it and the hand never
  // reached the handle; worse, the chord between the two pins passed within 20
  // units of the shoulder, so mid rep the elbow folded to 117 degrees and the
  // card read as a curl. A fly is one fixed soft elbow swinging through an arc,
  // which is exactly what a shoulder angle is.
  keys: [
    { // bottom, hands low and behind the hips, elbow soft and staying soft
      t: 0,
      root: { x: 64, y: 61.4, rot: 2 },
      joints: { spine: 6, neck: -4, shoulderR: -30, shoulderL: -26, elbowR: 24, elbowL: 24 },
      ik: { ...stand(66, 61) },
    },
    { // top, hands swept up and in front to eye height, same soft elbow
      t: 1,
      root: { x: 64, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: -8, shoulderR: 104, shoulderL: 100, elbowR: 24, elbowL: 24 },
      ik: { ...stand(66, 61) },
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
    { type: "dumbbell", side: "L", point: "hand", k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", k: 0.8, front: true },
  ],
  keys: [
    { // lockout, arms long square to the reclined torso
      t: 0,
      root: { x: 84, y: 90, rot: -55 },
      joints: { spine: 0, neck: -6, forearmPronR: 90, forearmPronL: 90, shoulderR: 235, shoulderL: 235, shoulderAbdR: 0, shoulderAbdL: 0, elbowR: 0, elbowL: 0, shoulderRotR: 90, shoulderRotL: -90 },
      ik: { ...stand(110, 104) },
    },
    { // halfway, a waypoint not a stop: elbow out toward the feet, bell on its line
      t: 0.5, through: true,
      root: { x: 84, y: 90, rot: -55 },
      joints: { spine: 2, neck: -8, forearmPronR: 90, forearmPronL: 90, shoulderR: 215, shoulderL: 215, shoulderAbdR: 63, shoulderAbdL: 63, elbowR: 14, elbowL: 14, shoulderRotR: 50, shoulderRotL: -50 },
      ik: { ...stand(110, 104) },
    },
    { /* bottom, bells beside the UPPER chest, just below the collarbone, which
         is 0.16 of the way from the shoulder joint to the hip. That is the
         right touch point for an incline: higher than the flat bench's 0.24 and
         well above the declines' 0.45, and clearly on the chest rather than at
         the throat.

         A harness that finds the bottom by taking the most-folded frame reads
         0.03 here and calls it the throat. It is measuring cycle 0.36, not the
         keyframe, and it is reading the MITT TIP, which points up along the
         forearm mid-descent. Sweeping this target ten units down the torso does
         not move that number at all (it still reads about 0 with the bar down
         at the belly), so the number is not measuring this move. The bar at
         that frame is 22 units clear in front of the collarbone, which is just
         a bar on its way down. */
      t: 1,
      root: { x: 84, y: 90, rot: -55 },
      joints: { spine: 2, neck: -8, forearmPronR: 90, forearmPronL: 90, shoulderR: 43, shoulderL: 43, shoulderAbdR: 56, shoulderAbdL: 56, elbowR: 78, elbowL: 78, shoulderRotR: 60, shoulderRotL: -60 },
      ik: { ...stand(110, 104) },
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
    { type: "dumbbell", side: "L", point: "hand", k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", k: 0.8, front: true },
  ],
  keys: [
    { // lockout, bells square to the declined torso
      t: 0,
      root: { x: 78, y: 64, rot: -115 },
      joints: { spine: 0, neck: 6, shoulderR: 295, shoulderL: 295, shoulderAbdR: 0, shoulderAbdL: 0, elbowR: 0, elbowL: 0, shoulderRotR: 30, shoulderRotL: -30 },
      ik: { ...pinFeet(112, 58, 108, 62) },
    },
    { // halfway, a waypoint not a stop: elbow out toward the feet, bell on its line
      t: 0.5, through: true,
      root: { x: 78, y: 64, rot: -115 },
      joints: { spine: 2, neck: 8, shoulderR: 255, shoulderL: 255, shoulderAbdR: 66, shoulderAbdL: 66, elbowR: 57, elbowL: 57, shoulderRotR: 0, shoulderRotL: 0 },
      ik: { ...pinFeet(112, 58, 108, 62) },
    },
    { // bottom, bells beside the lower chest
      t: 1,
      root: { x: 78, y: 64, rot: -115 },
      joints: { spine: 2, neck: 8, shoulderR: 162, shoulderL: 162, shoulderAbdR: 55, shoulderAbdL: 55, elbowR: 82, elbowL: 82, shoulderRotR: 60, shoulderRotL: -60 },
      ik: { ...pinFeet(112, 58, 108, 62) },
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
      joints: { spine: 0, neck: -6, shoulderR: 235, shoulderL: 235, shoulderAbdR: 0, shoulderAbdL: 0, elbowR: 0, elbowL: 0, shoulderRotR: 90, shoulderRotL: -90 },
      ik: { ...stand(110, 104) },
    },
    { // halfway, a waypoint not a stop: elbow out toward the feet, bell on its line
      t: 0.5, through: true,
      root: { x: 84, y: 90, rot: -55 },
      joints: { spine: 2, neck: -8, shoulderR: 215, shoulderL: 215, shoulderAbdR: 63, shoulderAbdL: 63, elbowR: 14, elbowL: 14, shoulderRotR: 50, shoulderRotL: -50 },
      ik: { ...stand(110, 104) },
    },
    { // bar down to the collarbone, elbows under the bar
      t: 1,
      root: { x: 84, y: 90, rot: -55 },
      joints: { spine: 2, neck: -8, shoulderR: 43, shoulderL: 43, shoulderAbdR: 56, shoulderAbdL: 56, elbowR: 78, elbowL: 78, shoulderRotR: 60, shoulderRotL: -60 },
      ik: { ...stand(110, 104) },
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
      joints: { spine: 0, neck: 6, shoulderR: 295, shoulderL: 295, shoulderAbdR: 0, shoulderAbdL: 0, elbowR: 0, elbowL: 0, shoulderRotR: 30, shoulderRotL: -30 },
      ik: { ...pinFeet(112, 58, 108, 62) },
    },
    { // halfway, a waypoint not a stop: elbow out toward the feet, bell on its line
      t: 0.5, through: true,
      root: { x: 78, y: 64, rot: -115 },
      joints: { spine: 2, neck: 8, shoulderR: 255, shoulderL: 255, shoulderAbdR: 66, shoulderAbdL: 66, elbowR: 57, elbowL: 57, shoulderRotR: 0, shoulderRotL: 0 },
      ik: { ...pinFeet(112, 58, 108, 62) },
    },
    { // bar down to the lower chest, elbows under the bar
      t: 1,
      root: { x: 78, y: 64, rot: -115 },
      joints: { spine: 2, neck: 8, shoulderR: 162, shoulderL: 162, shoulderAbdR: 55, shoulderAbdL: 55, elbowR: 82, elbowL: 82, shoulderRotR: 60, shoulderRotL: -60 },
      ik: { ...pinFeet(112, 58, 108, 62) },
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
    // A landmine: the bar pivots in a sleeve on a floor post behind the
    // lifter and the loaded end is cupped at the shoulder. The bar sits on
    // the midline, so the near leg and the near hand draw over it.
    { type: "artwork", src: "/knowledge/motion/props/landmine.svg" },
    { type: "lever", pivot: { x: 26, y: 112 }, to: { side: "R", point: "hand" }, r: 2.2, end: "plate", plateR: 8 },
  ],
  keys: [
    { // racked, bar end at the front of the shoulder, elbow tucked in
      t: 0,
      root: { x: 52, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -2, shoulderL: 14, elbowL: 30 },
      ik: { wristR: { x: 74.3, y: 39.0, bend: 1 }, ...stand(54, 50) },
    },
    { // pressed, arm long up and forward, ribs down
      t: 1,
      root: { x: 52, y: 61.4, rot: 2 },
      joints: { spine: 0, neck: -8, shoulderL: 20, elbowL: 36 },
      ik: { wristR: { x: 84.1, y: 9.0, bend: 1 }, ...stand(54, 50) },
    },
  ],
};

// The dip with a plate hung from a belt between the legs. Imported rather than
// copied so the dip itself stays fixed in one place; the only edit is the
// plate. Must be visible: the deep elbow bend with the whole body hanging
// between the bars, AND the hanging plate. Side view.
// Was authored separately and sat too low on the bars: the rail crossed the
// hips and the figure read as sitting on it with its legs draped over.
const WEIGHTED_DIP = {
  ...DIP,
  props: [
    ...DIP.props,
    // dip belt: the chain drops from the belt at the waist to the plate
    { type: "band", rest: 0, from: { side: "R", point: "hip", dx: -1, dy: -2 }, to: { side: "R", point: "hip", dx: -6, dy: 21 }, front: true },
    { type: "barbell", side: "R", point: "hip", dx: -6, dy: 28, r: 7, front: true },
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
    /* The same lat pulldown station as Lat Pulldown, on the same seat (the
       hips sit at 52, 86 in both), with the V handle hanging plumb from the
       high pulley. The artwork owns the stack, so the cable draws none. */
    { type: "artwork", src: "/knowledge/motion/props/lat-pulldown.svg" },
    { type: "cable", x: 54, top: 9, y0: 44, stack: false, plumb: true, grip: "vbar", to: { side: "R", point: "hand" }, front: true },
  ],
  keys: [
    { // arms long overhead, hands together on the handle
      t: 0,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: 0, neck: -6 },
      ik: {
        wristR: { x: 55.8, y: 22.0, bend: 1 }, wristL: { x: 54.8, y: 23.0, bend: 1 },
        ...stand(80, 76),
      },
    },
    { // handle to the sternum, torso still upright, elbows tight to the ribs
      t: 1,
      root: { x: 52, y: 86, rot: -6 },
      joints: { spine: -3, neck: -2 },
      ik: {
        wristR: { x: 57.8, y: 60.0, bend: 1 }, wristL: { x: 56.8, y: 61.0, bend: 1 },
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
    /* The low row station: long bench, foot plate in front of the toes, the
       low pulley on its bracket just past the plate, stack tower behind. The
       artwork owns the frame and stack; the cable draws pulley, line, V bar. */
    { type: "artwork", src: "/knowledge/motion/props/seated-row.svg" },
    { type: "cable", x: 108, top: 98, y0: 62, stack: false, grip: "vbar", to: { side: "R", point: "hand" }, front: true },
  ],
  keys: [
    { // reach, torso forward, arms long, lats stretched
      t: 0,
      root: { x: 44, y: 98, rot: 26 },
      joints: { spine: 2, neck: -6 },
      ik: {
        wristR: { x: 95.4, y: 77.4, bend: 1 }, wristL: { x: 92.4, y: 79.4, bend: 1 },
        // up on the machine's foot plate, not flat on the floor beside it. The
        // plate is what a seated row braces against, and a lifter with his feet
        // on the floor next to it reads as somebody who has not set up yet.
        ankleR: { x: 86, y: 104, bend: -1 }, ankleL: { x: 82, y: 106, bend: -1 },
      },
    },
    { // finish, sat tall, handle at the belly, elbows behind the torso
      t: 1,
      root: { x: 44, y: 98, rot: -6 },
      joints: { spine: -4, neck: -2 },
      ik: {
        wristR: { x: 61.5, y: 81.1, bend: 1 }, wristL: { x: 58.5, y: 83.1, bend: 1 },
        // up on the machine's foot plate, not flat on the floor beside it. The
        // plate is what a seated row braces against, and a lifter with his feet
        // on the floor next to it reads as somebody who has not set up yet.
        ankleR: { x: 86, y: 104, bend: -1 }, ankleL: { x: 82, y: 106, bend: -1 },
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
    { type: "dumbbell", hold: "follow", side: "R", point: "hand", k: 0.85, front: true },
  ],
  keys: [
    { // bottom, the working arm hanging straight down under the shoulder
      t: 0,
      root: { x: 58, y: 61.4, rot: 80 },
      joints: { spine: -4, neck: -12 },
      ik: {
        wristR: { x: 80.9, y: 91.2, bend: 1 }, wristL: { x: 106.9, y: 87.2, bend: 1 },
        ankleR: { x: 52, y: FLOOR, bend: -1 }, ankleL: { x: 47, y: FLOOR, bend: -1 },
      },
    },
    { // top, elbow driven up past the ribs, back still flat
      t: 1,
      root: { x: 58, y: 61.4, rot: 80 },
      joints: { spine: -6, neck: -12 },
      ik: {
        wristR: { x: 74.8, y: 73.2, bend: 1 }, wristL: { x: 106.8, y: 87.2, bend: 1 },
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
  props: [{ type: "cable", x: 128, top: 8, y0: 44, grip: "bar", barW: 14, to: { side: "R", point: "hand" }, front: true }],
  // Authored as shoulder ANGLES with the elbow pinned at 2 degrees, not as
  // wrist pins. Two wrist pins interpolate along the CHORD between them, and
  // the chord of this 123 degree sweep passed 16 units from the shoulder, so
  // mid rep the elbow was folded to 129 degrees and the card read as a triceps
  // pushdown. The one thing that must be visible here is a straight arm, and a
  // straight arm swinging through an arc is exactly what a shoulder angle is.
  keys: [
    { // top, arms long and high out in front, lats stretched
      t: 0,
      root: { x: 56, y: 61.4, rot: 14 },
      joints: { spine: 6, neck: -10, shoulderR: 95, shoulderL: 98, elbowR: 2, elbowL: 2 },
      ik: { ...stand(58, 53) },
    },
    { // finish, arms still long, bar at the front of the thighs
      t: 1,
      root: { x: 56, y: 61.4, rot: 16 },
      joints: { spine: 8, neck: -6, shoulderR: -15, shoulderL: -12, elbowR: 2, elbowL: 2 },
      ik: { ...stand(58, 53) },
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
    { type: "dumbbell", hold: "follow", side: "L", point: "hand", k: 0.78 },
    { type: "dumbbell", hold: "follow", side: "R", point: "hand", k: 0.78, front: true },
  ],
  keys: [
    { // bottom, both arms hanging long under the shoulders
      t: 0,
      root: { x: 46, y: 66, rot: 55 },
      joints: { spine: 0, neck: -12 },
      ik: {
        wristR: { x: 74.5, y: 85.3, bend: 1 }, wristL: { x: 70.5, y: 86.3, bend: 1 },
        ankleR: { x: 38, y: FLOOR, bend: -1 }, ankleL: { x: 33, y: FLOOR, bend: -1 },
      },
    },
    { // top, elbows up behind the ribs, chest still pinned to the pad
      t: 1,
      root: { x: 46, y: 66, rot: 55 },
      joints: { spine: 0, neck: -12 },
      ik: {
        wristR: { x: 64.5, y: 68.3, bend: 1 }, wristL: { x: 60.5, y: 69.3, bend: 1 },
        ankleR: { x: 38, y: FLOOR, bend: -1 }, ankleL: { x: 33, y: FLOOR, bend: -1 },
      },
    },
  ],
};

// Hinged over a bar that is pinned to the floor at one end, pulling a handle at
// the loaded end up into the belly. Must be visible: the bar running down to a
// fixed point on the floor, which is the whole difference from a barbell row.
// Side view. The bar is a `band` with no slack plus the disc at the hand end.
//
// The 46 degrees of lean used to be 16 of hip and 30 of spine. The torso ends
// up at the same angle either way, but the PELVIS does not: at rot 16 it stayed
// nearly upright under a torso folded forward, which draws the tucked pelvis
// and kinked waist of a rounded-back row. Now 38 of hip and 8 of spine, an 8
// degree waist kink against BARBELL_ROW's 18. Nothing else moved: rot and spine
// sum to the same torso angle, so every pin, the chest and both legs are where
// they were.
const T_BAR_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [
    // A landmine T-bar: the lifter straddles the bar with the pivot behind
    // and the plates ahead, holding a V handle hooked under the bar just
    // behind the plates. The near grip of the handle pokes through the fist.
    { type: "artwork", src: "/knowledge/motion/props/landmine.svg", dx: -10 },
    { type: "lever", pivot: { x: 16, y: 112 }, to: { side: "R", point: "hand" }, r: 2.2, end: "plate", plateR: 9, past: 6 },
    { type: "barbell", side: "R", point: "hand", r: 2.6, front: true },
  ],
  keys: [
    { // bottom, arms long, the bar hanging at the end of the arc
      t: 0,
      root: { x: 66, y: 61.4, rot: 38 },
      joints: { spine: 8, neck: -12 },
      ik: {
        wristR: { x: 96.2, y: 75.9, bend: 1 }, wristL: { x: 93.2, y: 77.9, bend: 1 },
        ...stand(64, 59),
      },
    },
    { // top, handle into the belly, elbows behind the ribs, torso angle unchanged
      t: 1,
      root: { x: 66, y: 61.4, rot: 38 },
      joints: { spine: 8, neck: -12 },
      ik: {
        wristR: { x: 88.2, y: 59.9, bend: 1 }, wristL: { x: 85.2, y: 61.9, bend: 1 },
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
  /* Mo, on the gallery: "i need to be bended over a bit more, back straight."
     It was 14 degrees of hip hinge carrying 32 of spine, which is 46 in total
     and most of it coming from the back rounding rather than the hips folding.
     Now 52 of hinge and 18 of spine: 70 degrees of lean against the old 46,
     and a flatter back with it,
     because the extra angle comes from the hip. The neck also stops craning up
     at -12 and sits closer to in line with the spine.

     Deliberately short of parallel. PENDLAY_ROW right below this is the flat,
     parallel-to-the-floor version, and the two have to stay tellable apart. */
  keys: [
    { // bottom, bar hanging under the shoulders
      t: 0,
      root: { x: 64, y: 61.4, rot: 52 },
      joints: { spine: 18, neck: -12 },
      ik: {
        wristR: { x: 92.2, y: 88.9, bend: 1 }, wristL: { x: 89.2, y: 90.9, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // top, bar at the belly, elbows past the torso
      t: 1,
      root: { x: 64, y: 61.4, rot: 52 },
      joints: { spine: 18, neck: -12 },
      ik: {
        wristR: { x: 85.2, y: 73.9, bend: 1 }, wristL: { x: 82.2, y: 75.9, bend: 1 },
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
  // r 10 rather than 11: the plate is what decides how high the bar sits, and
  // at 11 the bar was too high off the floor for a 37 unit arm to reach it
  // straight from a horizontal back, so the near arm started the "dead stop"
  // folded 65 degrees while the far one was nearly locked.
  props: [{ type: "barbell", side: "R", point: "hand", r: 10, front: true }],
  keys: [
    { /* dead stop, bar resting on the plates, back truly parallel to the floor
         and both arms hanging STRAIGHT, because a dead stop is a dead stop.
         The old pair only reached 68 degrees of hinge, so the shoulders sat
         above the hips and it read as an ordinary bent-over row.

         The 90 degrees of lean also used to be 34 of hip and 56 of spine, a 56
         degree kink at the waist, which is the drawn version of rowing with a
         rounded lower back and the worst thing in this file. Now 72 and 18,
         matching BARBELL_ROW's 18 degree kink. The torso ends up at the same
         angle; the pelvis does not. */
      t: 0,
      root: { x: 62, y: 63, rot: 72 },
      joints: { spine: 18, neck: -12 },
      ik: {
        wristR: { x: 92.0, y: 100.0, bend: 1 }, wristL: { x: 89.0, y: 96.6, bend: 1 },
        ...stand(60, 56),
      },
    },
    { // pulled to the belly, back still horizontal
      t: 1,
      root: { x: 62, y: 63, rot: 72 },
      joints: { spine: 18, neck: -12 },
      ik: {
        wristR: { x: 88.0, y: 77.0, bend: 1 }, wristL: { x: 85.0, y: 78.0, bend: 1 },
        ...stand(60, 56),
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
    // dip belt, seen from behind: the chain shows below the crotch to the plate
    { type: "band", rest: 0, from: { side: "R", point: "hip", dx: -5.5, dy: 4 }, to: { side: "R", point: "hip", dx: -4, dy: 9.5 }, front: true },
    { type: "barbell", side: "R", point: "hip", dx: -4, dy: 17, r: 7.5, front: true },
  ],
};

// ------------------------------------------------- traps and upper back -----

// Seen from the front a barbell is a BAR, not the disc the side view gets, so
// it is drawn as a zero slack band between the two hands with a plate at each
// end. `front` false puts the whole bar behind the figure, which is how a
// behind-the-back hold reads.
// Mo, on the gallery: "it looks like im holding the plates on both sides..
// wrong. let me hold the bar." He was right and it was this: each plate was
// drawn centred ON its hand, so the hand and the plate occupied the same spot
// and the grip read as holding the disc. The plates sit outboard now, with the
// hands on the bar between them, which is where a shrug is actually held.
// The signs are opposite because dx is screen space and is NOT mirrored by
// `side`: giving both plates the same dx slides the whole barbell sideways
// instead of spreading it, which is what the first attempt did.
const frontBar = (front) => ([
  { type: "band", rest: 0, from: { side: "L", point: "hand" }, to: { side: "R", point: "hand" }, front },
  { type: "barbell", side: "L", point: "hand", dx: -8, r: 7, front },
  { type: "barbell", side: "R", point: "hand", dx: 8, r: 7, front },
]);

// Standing with a weight hanging at arm's length, lift the shoulders straight up
// toward the ears and let them down. Must be visible: the load hanging dead
// straight from a still arm, so nothing but the shoulder girdle moves. Front
// view, because a shrug is symmetric across the midline.
// v2: the shrug is the girdle channel, not a spine and neck cheat. The
// shoulders rise and the arms hang off them, which is the movement. The old
// spine and neck cheat is now removed rather than merely unused: in a FRONTAL
// move the in plane spine and neck angles are a side bend, not a chest lift,
// so `spine: 3, neck: 5` swinging to `spine: -3, neck: -6` tipped the head
// four units off the midline and dropped one shoulder below the other. On a
// symmetric front view that reads as a figure turned away, not as a shrug.
const DUMBBELL_SHRUG = {
  view: "front",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  feet: FRONT_FEET,
  props: [
    { type: "dumbbell", side: "L", point: "hand", k: 0.85 },
    { type: "dumbbell", side: "R", point: "hand", k: 0.85, front: true },
  ],
  keys: [
    { // bottom, shoulders let down, knees soft, chin level
      t: 0,
      root: { x: 70, y: 62.6, rot: 0 },
      joints: { shoulderGirdleElevR: 0, shoulderGirdleElevL: 0, spine: 0, neck: 0, shoulderR: 10, shoulderL: 10, elbowR: 4, elbowL: 4 },
      ik: { ...stand(78, 62) },
    },
    { // top, the girdle carries the shoulders up, arms still dead straight
      t: 1,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { shoulderGirdleElevR: 7.5, shoulderGirdleElevL: 7.5, spine: 0, neck: 0, shoulderR: 8, shoulderL: 8, elbowR: 8, elbowL: 8 },
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
      joints: { shoulderGirdleElevR: 0, shoulderGirdleElevL: 0, spine: 0, neck: 0, shoulderR: 12, shoulderL: 12, elbowR: 4, elbowL: 4 },
      ik: { ...stand(78, 62) },
    },
    { // top, the girdle carries the shoulders up, arms still dead straight
      t: 1,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { shoulderGirdleElevR: 7, shoulderGirdleElevL: 7, spine: 0, neck: 0, shoulderR: 11, shoulderL: 11, elbowR: 6, elbowL: 6 },
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
  props: [{ type: "cable", x: 128, top: 14, y0: 48, grip: "rope", to: { side: "R", point: "hand" }, front: true }],
  keys: [
    { // start, arms long out in front at eye height
      t: 0,
      root: { x: 58, y: 61.4, rot: 2 },
      joints: { spine: 6, neck: -4 },
      ik: {
        wristR: { x: 96.5, y: 27.0, bend: 1 }, wristL: { x: 93.5, y: 30.0, bend: 1 },
        ...stand(60, 55),
      },
    },
    { // finish, hands at the face, elbows high
      t: 1,
      root: { x: 58, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: -6 },
      ik: {
        wristR: { x: 76.2, y: 21.0, bend: 1 }, wristL: { x: 73.2, y: 24.0, bend: 1 },
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
  // Hinged at the hip with the back flat, bells hanging under the chest, then
  // swept out level with the back. Neither a front nor a back camera can hinge
  // the torso, and a pure side view hides the sweep (it points at the camera),
  // so this is a side-plane hinge seen from behind and beside the figure: the
  // hinge and the spread both read. The abduction signs are opposite on L and
  // R because out-of-plane channels are not mirrored in a sagittal move.
  view: { plane: "sagittal", yaw: -42 },
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.92, dy: 4 },
  props: [
    { type: "dumbbell", side: "L", point: "hand", k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", k: 0.8, front: true },
  ],
  keys: [
    { // bottom, arms hanging straight down from the shoulders, elbows soft
      t: 0,
      root: { x: 58, y: 61.4, rot: 78 },
      joints: { spine: -4, neck: -12, shoulderR: -78, shoulderL: -78, elbowR: 18, elbowL: 18,
                shoulderAbdR: 6, shoulderAbdL: 6 },
      ik: { ankleR: { x: 52, y: FLOOR, bend: -1 }, ankleL: { x: 47, y: FLOOR, bend: -1 } },
    },
    { // top, arms swept out to the sides level with the back, blades squeezed
      t: 1,
      root: { x: 58, y: 61.4, rot: 78 },
      joints: { spine: -6, neck: -12, shoulderR: -78, shoulderL: -78, elbowR: 22, elbowL: 22,
                shoulderAbdR: 84, shoulderAbdL: 84 },
      ik: { ankleR: { x: 52, y: FLOOR, bend: -1 }, ankleL: { x: 47, y: FLOOR, bend: -1 } },
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
    // same machine as Pec Deck, the figure turned to face the pad: from
    // behind, the pad and frame are all on the far side of the body, so the
    // one drawing serves both moves
    { type: "artwork", src: "/knowledge/motion/props/pec-deck.svg" },
    { type: "lever", pivot: { x: 37, y: 8 }, to: { side: "L", point: "hand" }, r: 2.2, end: "grip" },
    { type: "lever", pivot: { x: 103, y: 8 }, to: { side: "R", point: "hand" }, r: 2.2, end: "grip", front: true },
  ],
  keys: [
    { // start, handles together in front, elbows soft
      t: 0,
      root: { x: 70, y: 80, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 20, shoulderL: 20, elbowR: 30, elbowL: 30 },
      ik: { ...stand(86, 54) },
    },
    { // finish, arms swept wide and level with the shoulders
      t: 1,
      root: { x: 70, y: 80, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 88, shoulderL: 88, elbowR: 28, elbowL: 28 },
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
// honest side view of a loaded bar. What the side view cannot show is the
// elbow flaring out sideways, so the middle of the rep is carried by a third
// keyframe instead: see the note on it below.
const UPRIGHT_ROW = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [{ type: "barbell", side: "R", point: "wrist", dx: 2, dy: 1, r: 7.5, front: true }],
  keys: [
    { /* bottom, bar hanging at the thighs, arms straight. 4 and 2 are the
         same "arm hanging" numbers the middle keyframe uses. They were 180 and
         177, and in this rig 0 points the arm DOWN and 180 points it straight
         overhead, so the rep opened with the bar held above the crown of the
         head and the whole pingpong played as a press, not a row. */
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: 4, neck: 0,
        shoulderR: 4, elbowR: 6, shoulderL: 2, elbowL: 8,
      },
      ik: { ...stand(62, 57) },
    },
    { // halfway, the elbow has folded and the bar is at the navel, still in
      // against the body. Without this key the two end poses interpolate
      // through shoulder 41 and elbow 65, which swings the bar a whole arm's
      // length out in front at chest height: mid rep the card was a Front
      // Raise, which is a different exercise in the same library. The rep now
      // folds the elbow first and drives the elbow up second, which is the
      // order the real lift happens in. A little shoulderAbd flares the elbow
      // sideways as well; much more than 20 and the upper arm foreshortens to
      // nothing and the bar reads as floating beside the belly.
      t: 0.5,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: 1, neck: -2,
        shoulderR: 4, elbowR: 116, shoulderL: 2, elbowL: 118,
        shoulderAbdR: 20, shoulderAbdL: 20,
      },
      ik: { ...stand(62, 57) },
    },
    { /* top, bar at the collarbone with the elbow up in front of the shoulder.
         The old pair finished at the chin, which put the disc over the visor.

         The upper arm stops at 78 degrees of elevation, which is 12 degrees
         BELOW horizontal. That is deliberate and it is the safety line on this
         lift: an upright row that drives the elbows above the shoulder is the
         position that pinches the shoulder, so the drawn range stops short of
         it rather than teaching the worst version. The neck was -20 to dodge a
         disc that is 8 units clear of the skull anyway; a standing lifter
         looks ahead. */
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: -2, neck: -4,
        shoulderR: 78, elbowR: 124, shoulderL: 74, elbowL: 122,
      },
      ik: { ...stand(62, 57) },
    },
  ],
};

// A wide grip bar pulled explosively from below the knee to chest height as the
// body extends from a hinge to standing tall. Must be visible: the body going
// from bent over to fully extended while the bar stays close and climbs. Side view.
// The start was 14 of hip carrying 34 of spine, which is a 34 degree waist kink
// on a loaded pull off the floor: the pelvis tucked under and the back drawn
// round. Redistributed to 40 and 8 for the same torso angle, same chest, same
// pins. See the note on T_BAR_ROW.
const SNATCH_GRIP_HIGH_PULL = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [{ type: "barbell", side: "R", point: "hand", r: 9.5, front: true }],
  keys: [
    { // start, hinged over with the bar hanging at the knee, arms long
      t: 0,
      root: { x: 62, y: 70, rot: 40 },
      joints: { spine: 8, neck: -12 },
      ik: {
        wristR: { x: 90.3, y: 86.0, bend: 1 }, wristL: { x: 87.3, y: 87.0, bend: 1 },
        ...stand(62, 58),
      },
    },
    { // finish, stood tall and extended, bar pulled to the chest, elbows high
      t: 1,
      root: { x: 64, y: 61.4, rot: -4 },
      joints: { spine: -6, neck: -4 },
      ik: {
        wristR: { x: 78.5, y: 42.1, bend: 1 }, wristL: { x: 75.5, y: 44.1, bend: 1 },
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
    { type: "dumbbell", side: "L", point: "hand", k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", k: 0.8, front: true },
  ],
  keys: [
    { // bottom, bells beside the thighs, arms long
      t: 0,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 13, shoulderL: 13, elbowR: 6, elbowL: 6 },
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
  props: [{ type: "cable", x: 10, top: 104, y0: 70, grip: "handle", to: { side: "R", point: "hand" }, front: true }],
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
      joints: { spine: 0, neck: 0, shoulderR: 88, shoulderL: 6, elbowR: 8, elbowL: 10 },
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
    { type: "dumbbell", hold: "grip", side: "L", point: "hand", k: 0.78 },
    { type: "dumbbell", hold: "grip", side: "R", point: "hand", k: 0.78, front: true },
  ],
  keys: [
    { // bottom, bells resting against the thighs
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: 0, forearmPronR: 90, forearmPronL: 90 },
      ik: {
        wristR: { x: 68.2, y: 67.0, bend: 1 }, wristL: { x: 65.2, y: 69.0, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // top, arm long and level, stopping at shoulder height
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 0, neck: -2, forearmPronR: 90, forearmPronL: 90 },
      ik: {
        wristR: { x: 98.1, y: 27.0, bend: 1 }, wristL: { x: 95.1, y: 30.0, bend: 1 },
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
  /* Same reason as ARNOLD_PRESS: the near arm sweeps up past the head and the
     default layering hands the head the win, so the arm looked like it ran
     behind the skull at the start. It is the nearer thing, so it draws in
     front. */
  armOverHead: true,
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.92, dy: 6 },
  props: [
    /* Artwork for the frame, tall back pad and stack; the press arms are
       levers hinged on the upright behind the shoulders at shoulder height, handles starting
       at shoulder height and sweeping up. Near arm over the body, far behind. */
    { type: "artwork", src: "/knowledge/motion/props/shoulder-press.svg" },
    { type: "lever", pivot: { x: 27, y: 58 }, to: { side: "L", point: "hand" }, r: 2.2, end: "grip" },
    { type: "lever", pivot: { x: 27, y: 58 }, to: { side: "R", point: "hand" }, r: 2.2, end: "grip", front: true },
  ],
  keys: [
    { // start, handles level with the shoulders, elbows under the hands
      t: 0,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: 0, neck: -2 },
      ik: { wristR: { x: 67.8, y: 47.0, bend: 1 }, wristL: { x: 64.8, y: 49.0, bend: 1 }, ...stand(82, 78) },
    },
    { // lockout, arms long overhead, back still on the pad
      t: 1,
      root: { x: 52, y: 86, rot: -4 },
      joints: { spine: -2, neck: -4 },
      ik: { wristR: { x: 57.7, y: 19.0, bend: 1 }, wristL: { x: 54.7, y: 21.0, bend: 1 }, ...stand(82, 78) },
    },
  ],
};

// The same press with two dumbbells on an upright bench rather than a machine.
// Must be visible: the near vertical back pad and two separate bells. Side view.
const SEATED_DUMBBELL_PRESS = {
  view: "side",
  /* The near arm passes the head on the way up and is the nearer thing, so it
     draws in front rather than disappearing behind the skull. See
     ARNOLD_PRESS. */
  armOverHead: true,
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.92, dy: 6 },
  props: [
    { type: "bench", x: 20, y: 70, w: 44, incline: -78 },
    { type: "bench", x: 36, y: 96, w: 36 },
    /* Plain "level" bells. The grip never changes here, it is pronated from
       the shoulders to lockout, so end on is the right picture at every
       frame and there is nothing for the derived bell to derive. */
    { type: "dumbbell", side: "L", point: "hand", k: 0.72, front: true },
    { type: "dumbbell", side: "R", point: "hand", k: 0.72, front: true },
  ],
  keys: [
    { /* Racked at the shoulders, bells sitting just above them, then straight
         up. Mo: "just have the dumbbells on his shoulders and going up."

         Angles rather than a wrist target, because a wrist target cannot put
         the hand at the shoulder. The upper arm is 20 and the forearm 17, and
         a solver working in the camera plane draws both at full screen length,
         so the only way it can fold the arm that tight is to throw the elbow
         about 20 units clear of the body, forward or back. Abduction is what a
         real rack uses: the elbow goes OUT, toward the camera, and 75 degrees
         of it is why the upper arm reads short here rather than swinging out
         in front of the chest.

         These angles are picked so the hand lands on the SAME vertical line
         as the lockout's, with the elbow directly under it. Mo: "just make the
         arms straight up, and then have them come straight down from the
         side." So the bells travel a plumb line: straight up to lockout,
         straight back down beside the shoulders, with no drift forward or
         back at either end. */
      t: 0,
      root: { x: 52, y: 86, rot: -4 },
      joints: {
        spine: 0, neck: -2,
        shoulderR: 66, shoulderAbdR: 75, elbowR: 154,
        shoulderL: 63, shoulderAbdL: 73, elbowL: 156,
        forearmPronR: 90, forearmPronL: 90,
      },
      ik: { ...stand(82, 78) },
    },
    { // lockout, arms long straight overhead, bells nearly touching
      t: 1,
      root: { x: 52, y: 86, rot: -4 },
      joints: {
        spine: -2, neck: -4,
        shoulderR: 176, shoulderAbdR: 12, elbowR: 2,
        shoulderL: 173, shoulderAbdL: 10, elbowL: 4,
        forearmPronR: 90, forearmPronL: 90,
      },
      ik: { ...stand(82, 78) },
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
    { type: "dumbbell", hold: "follow", side: "L", point: "hand", k: 0.8 },
    { type: "dumbbell", hold: "follow", side: "R", point: "hand", k: 0.8, front: true },
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
      joints: { spine: 0, neck: 0, shoulderR: 168, shoulderL: 168, elbowR: 6, elbowL: 6 },
      ik: { ...stand(78, 62) },
    },
  ],
};

// Bells start in front of the chest with the elbows down and the palms in, then
// rotate out and press overhead. Must be visible: the start with the elbows IN
// FRONT of the body rather than out to the sides, which is what separates it
// from a straight dumbbell press, and the grip rolling over on the way up.
// Suggested view is front; deviating to SIDE, because a front camera cannot
// draw the racked elbows (they point at the lens and foreshorten to nothing)
// and cannot draw a seated figure at all: the leg IK solves in the camera
// plane, so with the hips up on a bench the knees have nowhere to bend but
// sideways and he sits there in a butterfly stretch.
//
// Side view is also the one that shows the twist hardest, now that the bells
// are drawn on the hands instead of at a fixed angle. The handle swings from
// dead end on at the bottom, through fully broadside halfway up as the
// forearms pass through neutral, back to end on at lockout. A turned camera
// shows the same roll in a narrower band; straight on side it is the whole
// width of the bell.
//
// This move spent a while orbited 30 degrees round, because in a flat side
// view the near arm and the head land on the same pixels at lockout and the
// depth sort drew the head on top, so the arm looked like it went behind the
// skull (Mo: "as if his arm went inside of him", then "still not in front of
// the head"). The fix was not the camera and not the pose: it is
// armOverHead, which lets the near arm keep its own depth and draw OVER the
// head, which is what an arm in front of a face actually does. At this
// lockout they barely overlap anyway, so the face stays readable and the arm
// reads as passing in front of it. Leaning the arm back past vertical to dodge
// the head, which earlier versions did at 183 and 191, is not needed and was
// never what the movement does.
const ARNOLD_PRESS = {
  view: "side",
  /* The near arm draws over the head at lockout instead of the other way
     round. See the note above: without it the pressing arm disappears behind
     the skull. */
  armOverHead: true,
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  /* Seated, on Mo's note from the gallery: "arnold press is me sitting down on
     a bench and doing the workout". It was authored standing. Same seat and
     upright backrest as SEATED_DUMBBELL_PRESS, so the two read as the same
     bench, and the arm angles are untouched: the elbows-forward rack is what
     makes this an Arnold rather than a dumbbell press and it did not change by
     sitting down.

     A bench pinned to a coordinate is drawn in screen space and knows nothing
     about the camera, so these x values only line up with the figure in the
     move's own plane. That is worth remembering before turning a camera on any
     move that sits on something: the figure orbits, the furniture does not,
     and the seat slides out from under him. */
  fit: { k: 0.92, dy: 6 },
  props: [
    { type: "bench", x: 20, y: 70, w: 44, incline: -78 },
    { type: "bench", x: 36, y: 96, w: 36 },
    /* k 0.70 rather than the 0.78 these were when a bell was always a flat
       hex. On "grip" the same bell opens out to its full length halfway up the
       rep, and at 0.78 that length ran into the head. */
    { type: "dumbbell", hold: "grip", side: "L", point: "hand", k: 0.7, front: true },
    { type: "dumbbell", hold: "grip", side: "R", point: "hand", k: 0.7, front: true },
  ],
  keys: [
    { // start, elbows down and forward, bells in front of the chest, palms
      // turned back toward the face. forearmPron is the real channel for that
      // (negative is supinated) and it is the same -86 the dumbbell curls use,
      // because this IS the top of a curl. The bells read it for free: hold
      // "grip" runs the handle along the hand's own axis, so a supinated grip
      // points the bell straight at a side camera and it draws end on.
      t: 0,
      root: { x: 52, y: 86, rot: -4 },
      joints: {
        spine: 2, neck: -2,
        shoulderR: 34, elbowR: 132, shoulderL: 31, elbowL: 130,
        forearmPronR: -86, forearmPronL: -86,
      },
      ik: { ...stand(82, 78) },
    },
    { // lockout, arms long overhead, palms turned forward. That is the
      // ordinary pronated press grip, so the forearms roll the whole way
      // across, and passing through neutral halfway is what swings both bells
      // broadside mid-rep and then back. Mo asked for exactly that: "we need
      // to show how he twists his arm from that to chin up to the pull up
      // grip." Nothing here fakes it, the bells are just drawn on the hands.
      //
      // 165 is the same lockout Seated Dumbbell Press uses. It sits forward of
      // vertical, which is where a press actually finishes, and it is also
      // what keeps the arm clear of most of the head on its way past.
      t: 1,
      root: { x: 52, y: 86, rot: -4 },
      joints: {
        spine: -2, neck: 8,
        shoulderR: 165, elbowR: 6, shoulderL: 162, elbowL: 8,
        forearmPronR: 90, forearmPronL: 90,
      },
      ik: { ...stand(82, 78) },
    },
  ],
};

// Three positions in one: bells at the thighs, pulled up to a high elbow with
// the forearms hanging, then rotated up and pressed overhead. Must be visible:
// the middle position, because a Cuban press without it is just a press. Side
// view, and authored with three keyframes for that reason.
const CUBAN_PRESS = {
  view: "side",
  /* The near arm passes the head on the way to lockout and is the nearer
     thing, so it draws in front. See ARNOLD_PRESS. */
  armOverHead: true,
  loop: "pingpong",
  dur: 3.6,
  breath: 0.2,
  fit: { k: 0.84, dy: 10 },
  props: [
    { type: "dumbbell", hold: "grip", side: "L", point: "hand", k: 0.72 },
    { type: "dumbbell", hold: "grip", side: "R", point: "hand", k: 0.72, front: true },
  ],
  keys: [
    { // bells at the thighs, arms long
      t: 0,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: 2, neck: 0,
        shoulderR: 8, elbowR: 14, shoulderL: 6, elbowL: 16, forearmPronR: 90, forearmPronL: 90 },
      ik: { ...stand(62, 57) },
    },
    { /* elbows pulled up high, bells at the chest. Kept clear of the chin: the
         rig folds the forearm up from a forward upper arm, so a higher elbow
         here puts the bells on the face rather than under it.

         AUDIT NOTE, not fixed on purpose. This is not the Cuban press middle.
         The real one has the elbows out to the SIDES at shoulder height with
         the forearms hanging straight DOWN, and the press half of the rep is
         the humerus rotating those forearms up; without it the card is a plain
         dumbbell press. A forearm cannot be folded downward from a forward
         upper arm, because elbow flexion always carries the hand toward the
         arm's own anterior, so the hang has to come from shoulderRot and the
         width from shoulderAbd.

         Both were authored and measured, and they work: shoulderR 26,
         shoulderAbdR 72, elbowR 92, shoulderRotR -88 (mirrored to +86 on L,
         because shoulderRot mirrors between sides and shoulderAbd does not).
         What they do NOT survive is this camera. Abducted straight out to the
         side, the upper arm points at a side lens and foreshortens to nothing,
         so the corrected middle rendered as two arms hanging at the sides,
         which is less use than the wrong pose it replaced. Rendered again at
         view { plane: "sagittal", yaw: 38 } it reads perfectly, but that yaw
         swings the camera behind the figure and turns the whole card into a
         back three quarter. That is a camera decision for the move, not a
         tweak, and this move was handed to me as already corrected, so the
         numbers are here and the pose is left alone. */
      t: 0.45,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: 0, neck: -2,
        shoulderR: 70, elbowR: 78, shoulderL: 67, elbowL: 76, forearmPronR: 90, forearmPronL: 90 },
      ik: { ...stand(62, 57) },
    },
    { /* rotated up and pressed to lockout. This used to sit at 191 and 188,
         leaning the arms back past vertical, with the neck cranked to -20 on
         top, all so the head would not be buried under the near arm. That was
         the same dodge ARNOLD_PRESS was carrying and it has the same answer:
         armOverHead lets the arm draw where it actually is, so the press can
         finish where a press finishes. 166 matches the other overhead
         lockouts. The neck keeps a small forward tilt at -12, which is a head
         looking ahead at the top of a press rather than one thrown back to get
         out of the way, and it happens to leave the face clearest too. */
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: {
        spine: -2, neck: -12,
        shoulderR: 166, elbowR: 8, shoulderL: 163, elbowL: 10, forearmPronR: 90, forearmPronL: 90 },
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
  /* The bar passes the head on the way up and the arm is the nearer
     thing, so it draws in front instead of behind the skull. That is also what
     lets the lockout sit OVER the crown rather than parked behind it. */
  armOverHead: true,
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
        wristR: { x: 74.2, y: 41.0, bend: 1 }, wristL: { x: 71.2, y: 43.0, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // lockout, arms long and straight, bar stacked over the crown
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: -2, neck: 12 },
      ik: {
        wristR: { x: 54.7, y: -4.7, bend: 1 }, wristL: { x: 51.7, y: -3.2, bend: 1 },
        ...stand(62, 57),
      },
    },
  ],
};

// The overhead press started with a dip and drive of the legs. Must be visible:
// the KNEE BEND at the bottom, which is the only difference from the strict
// press. Side view.
// The strict standing barbell press: feet together, no dip, no layback, the bar
// travelling from the collarbone to a straight-arm lockout on nothing but the
// shoulders. Must be visible: the stance and the fact that NOTHING below the
// shoulders moves, because that is the whole difference from a push press.
// Side view, same as the other two, so the three read as one family.
//
// Why it exists alongside OVERHEAD_PRESS, which is the same movement pattern:
// in a gym the two names are used for the same lift, and this library already
// had the loose one. The split here is the one most coaching uses. Military
// Press is strict with the feet together and a vertical torso; Overhead Press
// is the same bar path from a hip-width stance with a little lean allowed;
// Push Press adds the leg drive. If that distinction ever stops earning its
// keep, this is the entry to fold back into OVERHEAD_PRESS, not the other way
// round.
const MILITARY_PRESS = {
  view: "side",
  /* Same as the other overhead presses: the near arm passes the head and is
     the nearer thing, so it draws in front. */
  armOverHead: true,
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.84, dy: 10 },
  props: [{ type: "barbell", side: "R", point: "hand", r: 9.5, front: true }],
  keys: [
    { // racked, bar at the collarbone, feet together, torso stacked upright
      t: 0,
      root: { x: 60, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 0 },
      ik: {
        wristR: { x: 74.2, y: 41.0, bend: 1 }, wristL: { x: 71.2, y: 43.0, bend: 1 },
        ...stand(60.5, 58.5),
      },
    },
    { // lockout, arms long and straight, ribs still down and no lean back
      t: 1,
      root: { x: 60, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: 12 },
      ik: {
        wristR: { x: 54.7, y: -4.7, bend: 1 }, wristL: { x: 51.7, y: -3.2, bend: 1 },
        ...stand(60.5, 58.5),
      },
    },
  ],
};

const PUSH_PRESS = {
  view: "side",
  /* The bar passes the head on the way up and the arm is the nearer
     thing, so it draws in front instead of behind the skull. That is also what
     lets the lockout sit OVER the crown rather than parked behind it. */
  armOverHead: true,
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
        wristR: { x: 74.2, y: 47.0, bend: 1 }, wristL: { x: 71.2, y: 49.0, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // drive, legs straight and the bar punched to a straight-arm lockout
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: -2, neck: 12 },
      ik: {
        wristR: { x: 54.7, y: -4.7, bend: 1 }, wristL: { x: 51.7, y: -3.2, bend: 1 },
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
// FOUR keyframes, not two, and the two extra ones are the whole point. Two
// wrist pins interpolate along the straight CHORD between them, and the chord
// from a hanging hand to a hand at the chest passes close enough to the
// shoulder that the solver swung the elbow 7 units BACKWARD to reach it: 21
// degrees of shoulder extension in the middle of every rep, which is a curl
// with the elbow swinging, the one thing this exercise is not allowed to teach.
// The two middle keys put the hand where a 50 degree and a 94 degree elbow
// actually put it with the upper arm hanging vertical, so the elbow now stays
// inside 1.3 units for the whole rep and the shoulder inside 5 degrees.
const standingCurlKeys = [
  { // bottom, arms long, elbows at the sides
    t: 0,
    root: { x: 60, y: 61.4, rot: 2 },
    joints: { spine: 2, neck: 0 },
    ik: {
      wristR: { x: 66.2, y: 68.0, bend: 1 }, wristL: { x: 63.2, y: 70.0, bend: 1 },
      ...stand(62, 57),
    },
  },
  { // a third of the way up: elbow bent about 50, upper arm still hanging
    t: 0.3,
    root: { x: 60, y: 61.4, rot: 2 },
    joints: { spine: 1.5, neck: -0.5 },
    ik: {
      wristR: { x: 75.0, y: 62.4, bend: 1 }, wristL: { x: 72.0, y: 64.4, bend: 1 },
      ...stand(62, 57),
    },
  },
  { // forearm level, elbow bent about 94 and still directly under the shoulder
    t: 0.62,
    root: { x: 60, y: 61.4, rot: 2 },
    joints: { spine: 1, neck: -1 },
    ik: {
      wristR: { x: 79.0, y: 51.5, bend: 1 }, wristL: { x: 76.0, y: 53.5, bend: 1 },
      ...stand(62, 57),
    },
  },
  { // top, forearm folded to the chest, elbow still under the shoulder
    t: 1,
    root: { x: 60, y: 61.4, rot: 2 },
    joints: { spine: 0, neck: -2 },
    ik: {
      wristR: { x: 76.1, y: 43.0, bend: 1 }, wristL: { x: 73.1, y: 45.0, bend: 1 },
      ...stand(62, 57),
    },
  },
];

// Standing, a dumbbell in each hand curled from the thigh to the chest with the
// elbow pinned. Must be visible: the elbow staying put while only the forearm
// swings. Side view, sagittal. The bell is drawn across the hand (rot 90) for
// the supinated grip, which is what separates it from the hammer curl.
// v2: palms fully turned up. The shared curl keys stay neutral, so Hammer Curl
// keeps its thumbs-up grip and the three curls stop being the same picture.
const DUMBBELL_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.2,
  props: [
    { type: "dumbbell", side: "L", point: "hand", k: 0.8 },
    { type: "dumbbell", side: "R", point: "hand", k: 0.8, front: true },
  ],
  keys: standingCurlKeys.map((k) => ({ ...k, joints: { ...k.joints, forearmPronR: -86, forearmPronL: -86 } })),
};

// The same curl with a neutral, thumbs up grip. Must be visible: the bell IN
// LINE with the forearm rather than across it, which is the whole difference.
// Side view.
const HAMMER_CURL = {
  ...DUMBBELL_CURL,
  props: [
    { type: "dumbbell", hold: "follow", side: "L", point: "hand", k: 0.8 },
    { type: "dumbbell", hold: "follow", side: "R", point: "hand", k: 0.8, front: true },
  ],
};

// The same curl against a low pulley, so the load pulls down and forward rather
// than straight down. Must be visible: the cable line from the floor pulley to
// the hand staying taut through the arc. Side view.
const CABLE_CURL = {
  ...DUMBBELL_CURL,
  props: [{ type: "cable", x: 116, top: 100, y0: 70, grip: "bar", barW: 14, to: { side: "R", point: "hand" }, front: true }],
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
// v2: semi-supinated, which is what the cambered bar is for. Barbell Curl
// two cards away is the same movement with the palms fully turned up.
const EZ_BAR_CURL = {
  ...DUMBBELL_CURL,
  props: [{ type: "barbell", side: "R", point: "hand", r: 8, front: true }],
  keys: standingCurlKeys.map((k) => ({
    ...k,
    joints: { ...k.joints, forearmPronR: -42, forearmPronL: -42, wristR: -14, wristL: -14 },
  })),
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
    { type: "dumbbell", hold: "grip", side: "R", point: "hand", k: 0.85, front: true },
  ],
  keys: [
    { // bottom, working arm hanging long inside the knee
      t: 0,
      root: { x: 46, y: 88, rot: 18 },
      joints: { spine: 22, neck: -12, forearmPronR: -86 },
      ik: {
        wristR: { x: 86.0, y: 97.7, bend: 1 }, wristL: { x: 62.0, y: 93.7, bend: 1 },
        ankleR: { x: 76, y: FLOOR, bend: -1 }, ankleL: { x: 70, y: FLOOR, bend: -1 },
      },
    },
    { // halfway, forearm level and the elbow still jammed against the thigh.
      // Without this the elbow slid 10.8 units mid rep, which on the one
      // exercise whose entire point is a braced elbow is the worst place in
      // this file for it to happen.
      t: 0.5,
      root: { x: 46, y: 88, rot: 18 },
      joints: { spine: 22, neck: -12, forearmPronR: -86 },
      ik: {
        wristR: { x: 90.7, y: 84.8, bend: 1 }, wristL: { x: 62.0, y: 93.7, bend: 1 },
        ankleR: { x: 76, y: FLOOR, bend: -1 }, ankleL: { x: 70, y: FLOOR, bend: -1 },
      },
    },
    { // top, bell curled to the shoulder, elbow never leaving the thigh
      t: 1,
      root: { x: 46, y: 88, rot: 18 },
      joints: { spine: 22, neck: -12, forearmPronR: -86 },
      ik: {
        wristR: { x: 80.0, y: 71.7, bend: 1 }, wristL: { x: 62.0, y: 93.7, bend: 1 },
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
    // the preacher bench drawn as one object; its seat and arm pad sit exactly
    // where the two bench props used to
    { type: "artwork", src: "/knowledge/motion/props/preacher.svg" },
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
        shoulderR: 55, elbowR: 100, shoulderL: 53, elbowL: 98,
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
    { type: "dumbbell", hold: "grip", side: "L", point: "hand", k: 0.78 },
    { type: "dumbbell", hold: "grip", side: "R", point: "hand", k: 0.78, front: true },
  ],
  keys: [
    { // bottom, arms hanging straight down behind the line of the torso
      t: 0,
      root: { x: 84, y: 84, rot: -44 },
      joints: { spine: 0, neck: -4, forearmPronR: -86, forearmPronL: -86 },
      ik: {
        wristR: { x: 71.9, y: 97.8, bend: 1 }, wristL: { x: 74.9, y: 98.8, bend: 1 },
        ...stand(110, 104),
      },
    },
    { // halfway, forearms level and the upper arms still hanging BEHIND the
      // torso line, which is the whole reason for the incline. The two end
      // pins alone pulled the elbow 7.9 units forward mid rep and gave that
      // stretched position away.
      t: 0.5,
      root: { x: 84, y: 84, rot: -44 },
      joints: { spine: 0, neck: -5, forearmPronR: -86, forearmPronL: -86 },
      ik: {
        wristR: { x: 80.0, y: 90.3, bend: 1 }, wristL: { x: 82.7, y: 90.6, bend: 1 },
        ...stand(110, 104),
      },
    },
    { // top, forearms curled up, upper arms still hanging back
      t: 1,
      root: { x: 84, y: 84, rot: -44 },
      joints: { spine: 0, neck: -6, forearmPronR: -86, forearmPronL: -86 },
      ik: {
        wristR: { x: 79.9, y: 77.8, bend: 1 }, wristL: { x: 82.9, y: 78.8, bend: 1 },
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
    { type: "dumbbell", hold: "grip", side: "L", point: "hand", k: 0.78 },
    { type: "dumbbell", hold: "grip", side: "R", point: "hand", k: 0.78, front: true },
  ],
  keys: [
    { // bottom, arms hanging dead straight under the shoulders
      t: 0,
      root: { x: 46, y: 66, rot: 55 },
      joints: { spine: 0, neck: -12, forearmPronR: -86, forearmPronL: -86 },
      ik: {
        wristR: { x: 72.5, y: 87.3, bend: 1 }, wristL: { x: 68.5, y: 88.3, bend: 1 },
        ankleR: { x: 38, y: FLOOR, bend: -1 }, ankleL: { x: 33, y: FLOOR, bend: -1 },
      },
    },
    { // halfway, forearms level, upper arms still hanging dead under the
      // shoulders. The chord between the two end pins was dragging the elbow
      // 9.5 units forward mid rep, which on a spider curl is the arm swinging
      // off the pad.
      t: 0.5,
      root: { x: 46, y: 66, rot: 55 },
      joints: { spine: 0, neck: -12, forearmPronR: -86, forearmPronL: -86 },
      ik: {
        wristR: { x: 83.0, y: 79.6, bend: 1 }, wristL: { x: 77.3, y: 78.5, bend: 1 },
        ankleR: { x: 38, y: FLOOR, bend: -1 }, ankleL: { x: 33, y: FLOOR, bend: -1 },
      },
    },
    { // top, bells curled up in front of the face
      t: 1,
      root: { x: 46, y: 66, rot: 55 },
      joints: { spine: 0, neck: -12, forearmPronR: -86, forearmPronL: -86 },
      ik: {
        wristR: { x: 82.5, y: 64.3, bend: 1 }, wristL: { x: 78.5, y: 65.3, bend: 1 },
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
    { type: "cable", x: 84, top: 8, y0: 44, grip: "bar", barW: 13, to: { side: "R", point: "hand" }, front: true },
  ],
  keys: [
    { /* start, forearm up at about ninety, elbow directly under the shoulder.
         The pin used to be at 60.3, 51.0, which put the elbow 6.4 units BEHIND
         where the lockout puts it, so across the rep the elbow crawled forward
         while the forearm swung. On a pushdown the still elbow is the whole
         exercise, so the start is now placed where a 114 degree elbow lands
         with the upper arm hanging vertical, which is the same place the
         lockout's elbow is. */
      t: 0,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4 },
      ik: {
        wristR: { x: 65.5, y: 45.9, bend: 1 }, wristL: { x: 62.5, y: 47.9, bend: 1 },
        ...stand(48, 43),
      },
    },
    { // halfway, elbow in exactly the same place. The two end pins alone leave
      // a chord that pulls it 5.4 units back mid rep.
      t: 0.5,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4 },
      ik: {
        wristR: { x: 64.7, y: 59.4, bend: 1 }, wristL: { x: 61.3, y: 61.3, bend: 1 },
        ...stand(48, 43),
      },
    },
    { // lockout, arm straight down, elbow unmoved
      t: 1,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4 },
      ik: {
        wristR: { x: 54.3, y: 68.0, bend: 1 }, wristL: { x: 51.3, y: 70.0, bend: 1 },
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
  props: [{ type: "cable", x: 84, top: 8, y0: 44, grip: "rope", to: { side: "R", point: "hand" }, front: true }],
  keys: [
    { // start, forearms up, hands together on the rope, elbow under the
      // shoulder where the lockout leaves it. Same fix as Triceps Pushdown.
      t: 0,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4, wristR: 0, wristL: 0 },
      ik: {
        wristR: { x: 65.5, y: 45.9, bend: 1 }, wristL: { x: 62.5, y: 47.9, bend: 1 },
        ...stand(48, 43),
      },
    },
    { // halfway, elbow unmoved. Same reason as Triceps Pushdown.
      t: 0.5,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4, wristR: 13, wristL: -11 },
      ik: {
        wristR: { x: 66.2, y: 60.3, bend: 1 }, wristL: { x: 60.9, y: 61.5, bend: 1 },
        ...stand(48, 43),
      },
    },
    { // lockout, hands driven apart and the wrists turned out
      t: 1,
      root: { x: 46, y: 61.4, rot: 2 },
      joints: { spine: 4, neck: -4, wristR: 26, wristL: -22 },
      ik: {
        wristR: { x: 56.3, y: 69.0, bend: 1 }, wristL: { x: 50.3, y: 69.0, bend: 1 },
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
  props: [{ type: "dumbbell", hold: "upright", side: "R", point: "hand", k: 0.85, front: true }],
  keys: [
    { // bottom, bell behind the head, elbows up
      t: 0,
      root: { x: 58, y: 61.4, rot: 2 },
      joints: { spine: 2, neck: -2 },
      ik: {
        wristR: { x: 50.2, y: 25.0, bend: 1 }, wristL: { x: 47.2, y: 22.0, bend: 1 },
        ...stand(60, 55),
      },
    },
    { /* halfway, elbow in exactly the same place with the forearm swung back
         to horizontal. Without this key the two pins interpolate along their
         chord and the solver has to swing the ELBOW forward 7.5 units to reach
         it, crossing the vertical as it goes, so mid rep the upper arm was
         travelling and the forearm was not. On this exercise that is the whole
         failure: the elbow must stay put and only the forearm moves. */
      t: 0.5,
      root: { x: 58, y: 61.4, rot: 2 },
      joints: { spine: 1, neck: 5 },
      ik: {
        wristR: { x: 42.0, y: 8.1, bend: 1 }, wristL: { x: 42.4, y: 7.9, bend: 1 },
        ...stand(60, 55),
      },
    },
    { // lockout, arms long and a touch behind vertical, elbows in the same
      // place. Dead vertical put the whole arm over the face.
      t: 1,
      root: { x: 58, y: 61.4, rot: 2 },
      joints: { spine: 0, neck: 12 },
      ik: {
        wristR: { x: 52.7, y: -4.7, bend: 1 }, wristL: { x: 49.7, y: -3.7, bend: 1 },
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
    { type: "dumbbell", hold: "follow", side: "R", point: "hand", k: 0.8, front: true },
  ],
  keys: [
    { // start, upper arm back and level, forearm hanging straight down
      t: 0,
      root: { x: 62, y: 61.4, rot: 38 },
      joints: { spine: 10, neck: -12, shoulderR: -138, elbowR: 95 },
      ik: { wristL: { x: 98.3, y: 74.0, bend: 1 }, ...stand(60, 55) },
    },
    { // finish, forearm swung back to a straight arm, upper arm unmoved
      t: 1,
      root: { x: 62, y: 61.4, rot: 38 },
      joints: { spine: 10, neck: -12, shoulderR: -138, elbowR: 6 },
      ik: { wristL: { x: 98.3, y: 74.0, bend: 1 }, ...stand(60, 55) },
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
    { /* top, arms LOCKED OUT straight, hips just off the front edge and level
         with it. The root was 1.2 units lower, which left the shoulder 35.5
         from a pinned wrist on a 37 unit arm: 33 degrees of elbow still folded
         at the end of the push, which is a rep that never finishes. The top of
         a pushing movement is a straight arm. */
      t: 0,
      root: { x: 57.4, y: 72.4, rot: -5 },
      /* Mo: "just keep my hands faced forward." The wrist angle turns the mitt
         so the fingers point toward the feet, which is how a bench dip is
         actually held. It survives the IK: the solver decides where the wrist
         ENDS UP, and the hand frame is built from the solved forearm with this
         angle applied on top, so the two do not fight. */
      joints: { spine: 0, neck: -2, wristR: 150, wristL: 150 },
      ik: {
        wristR: { x: 42.0, y: 76.0, bend: 1 }, wristL: { x: 38.0, y: 76.5, bend: 1 },
        ankleR: { x: 89, y: FLOOR, bend: -1 }, ankleL: { x: 83, y: FLOOR, bend: -1 },
      },
    },
    { // bottom, hips dropped in front of the bench, elbows folded back.
      // Deliberately short of a full dip: past this the shoulder goes further
      // into extension than a shoulder actually does, which is also why this
      // exercise has the reputation it has.
      t: 1,
      root: { x: 55.2, y: 85.0, rot: -7 },
      joints: { spine: 0, neck: -4, wristR: 150, wristL: 150 },
      ik: {
        wristR: { x: 41.8, y: 76.0, bend: 1 }, wristL: { x: 37.8, y: 76.5, bend: 1 },
        ankleR: { x: 89, y: FLOOR, bend: -1 }, ankleL: { x: 83, y: FLOOR, bend: -1 },
      },
    },
  ],
};

// Supine on a flat bench with the upper arms held still and angled slightly back
// over the head, the bar lowered past the forehead on a bent elbow. Must be
// visible: the upper arm staying put while the bar swings back past the head,
// which is what separates it from a bench press. Side view, root.rot -90 supine.
// The bar stops above and behind the forehead on purpose: at the true bottom
// the disc overlaps the skull and the whole card turns to mush.
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
      ik: { wristR: { x: 55.0, y: 45.0, bend: 1 }, wristL: { x: 58.0, y: 46.0, bend: 1 }, ...stand(108, 112) },
    },
    { // halfway, upper arm unmoved and the forearm swung back through
      // horizontal. Same reason as the other elbow-fixed moves: without a key
      // on the arc the chord between the two pins pulls the elbow 4.5 units
      // out of place mid rep, and a skull crusher with a travelling elbow is a
      // press.
      t: 0.5,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 0, neck: -5 },
      ik: { wristR: { x: 45.6, y: 51.6, bend: 1 }, wristL: { x: 48.4, y: 51.3, bend: 1 }, ...stand(108, 112) },
    },
    { // bottom, elbow folded, bar swung back to just above the forehead
      t: 1,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 0, neck: -6 },
      ik: { wristR: { x: 42.0, y: 62.0, bend: 1 }, wristL: { x: 45.0, y: 63.0, bend: 1 }, ...stand(108, 112) },
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
      joints: { spine: 0, neck: -4, shoulderR: 270, shoulderL: 270, shoulderAbdR: 0, shoulderAbdL: 0, elbowR: 0, elbowL: 0, shoulderRotR: 60, shoulderRotL: -60 },
      ik: { ...stand(108, 112) },
    },
    { // bottom, bar low on the sternum, elbows tucked toward the feet
      t: 1,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 2, neck: -6, shoulderR: 125, shoulderL: 125, shoulderAbdR: 40, shoulderAbdL: 40, elbowR: 150, elbowL: 150, shoulderRotR: 15, shoulderRotL: -15 },
      ik: { ...stand(108, 112) },
    },
  ],
};

// ---------------------------------------------------- forearms and grip -----

// Seated with the forearms flat along the thighs and the hands hanging past the
// knees, palms up, the wrist alone curls the weight up. Must be visible: the
// forearm welded to the thigh so the HAND is the only thing that moves.
// Side view.
// v2: palms UP. The forearm channel is the entire difference between this
// and the reverse curl below, and before it existed the two cards were the
// same picture.
const WRIST_CURL = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.18,
  props: [
    { type: "bench", x: 26, y: 96, w: 40 },
    { type: "dumbbell", side: "R", point: "hand", k: 0.75, front: true },
  ],
  keys: [
    { // bottom, hand rolled open and hanging below the knee
      t: 0,
      root: { x: 46, y: 88, rot: 14 },
      joints: { forearmPronR: -78, forearmPronL: -78, spine: 18, neck: -12, wristR: -35, wristL: -35 },
      ik: {
        wristR: { x: 77.6, y: 87.4, bend: 1 }, wristL: { x: 73.6, y: 89.4, bend: 1 },
        ankleR: { x: 76, y: FLOOR, bend: -1 }, ankleL: { x: 70, y: FLOOR, bend: -1 },
      },
    },
    { // top, hand curled up toward the forearm, elbows never leaving the thighs
      t: 1,
      root: { x: 46, y: 88, rot: 14 },
      joints: { forearmPronR: -78, forearmPronL: -78, spine: 18, neck: -12, wristR: 50, wristL: 50 },
      ik: {
        wristR: { x: 77.6, y: 87.4, bend: 1 }, wristL: { x: 73.6, y: 89.4, bend: 1 },
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
// v2: palms DOWN, the mirror of Wrist Curl.
const REVERSE_WRIST_CURL = {
  ...WRIST_CURL,
  keys: [
    { ...WRIST_CURL.keys[0], joints: { forearmPronR: 78, forearmPronL: 78, spine: 18, neck: -12, wristR: -18, wristL: -18 } },
    { ...WRIST_CURL.keys[1], joints: { forearmPronR: 78, forearmPronL: 78, spine: 18, neck: -12, wristR: 16, wristL: 16 } },
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
        wristR: { x: 66.2, y: 68.0, bend: 1 }, wristL: { x: 63.2, y: 70.0, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // halfway, elbow unmoved. Same chord problem as the other curls, smaller
      // here because the range is shorter, but 4.6 units of elbow swing on a
      // curl is still a curl with a swinging elbow.
      t: 0.5,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 1, neck: -1, wristR: 22, wristL: 22 },
      ik: {
        wristR: { x: 76.1, y: 61.8, bend: 1 }, wristL: { x: 72.9, y: 63.5, bend: 1 },
        ...stand(62, 57),
      },
    },
    { // top, bar stopping at the lower chest with the wrist rolled over
      t: 1,
      root: { x: 60, y: 61.4, rot: 2 },
      joints: { spine: 0, neck: -2, wristR: 24, wristL: 24 },
      ik: {
        wristR: { x: 80.1, y: 51.0, bend: 1 }, wristL: { x: 77.1, y: 53.0, bend: 1 },
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
    // both plates behind the hands, so the fingers show pinching the top rim
    { type: "barbell", side: "R", point: "hand", dx: 1, dy: 6, r: 8 },
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
    { type: "dumbbell", hold: "follow", side: "L", point: "hand", k: 0.9 },
    { type: "dumbbell", hold: "follow", side: "R", point: "hand", k: 0.9, front: true },
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
  "Military Press": MILITARY_PRESS,
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
