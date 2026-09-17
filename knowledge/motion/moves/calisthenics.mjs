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
//
// v3, three linked fixes, and the same three apply to every prone move in this
// file that pins its hands to the floor.
//
//  - The top did not lock out. The near shoulder sat 32.8 units from a 37 unit
//    arm, which is fifty odd degrees of elbow, and a push-up whose top is half
//    a rep down teaches half a rep.
//  - The far arm is what was holding the top down. In a SIDE view the rig
//    offsets the two shoulder anchors 1.7 units each along the torso's own
//    ANTERIOR axis, to stop the far arm hiding exactly behind the near one.
//    For a standing figure that is a forward and backward offset and reads as
//    depth. For a PRONE figure anterior points at the floor, so the offset
//    becomes 3.4 units of screen HEIGHT: the far shoulder rides higher and its
//    arm has 3.4 units further to reach, which caps how high the body can sit
//    with both hands down. `shoulderGirdleProtL` runs along the same anterior
//    axis, so 3.4 units of protraction on the FAR side cancels it exactly and
//    both arms lock out together. (A push-up top really does protract, so this
//    is at worst an honest number on the wrong side.)
//  - The feet slid. The hips swung 12 degrees between the two keys and the
//    ankles 12 the other way, which is not one rigid body: the toes travelled
//    2.7 units down the floor over the rep, and on Diamond below the same
//    pattern dragged them twelve. A prone body tips about its toes as ONE
//    piece, and in this rig that means rot gains the tip angle, both hips lose
//    TWICE it (rot turns the torso one way and rot+hip turns the leg the
//    other), and the ankle gains it back so the foot keeps pointing at the
//    floor. Both keys below are the same body at two tip angles, with the root
//    placed so the ankle lands on the same point.
export const PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 2.6,
  breath: 0.18,
  keys: [
    { // top of the rep, arms locked out, one line from heel to head
      t: 0,
      root: { x: 68.99, y: 84.83, rot: 73.81 },
      joints: { spine: 0, neck: -12, hipL: -147.6, hipR: -147.6, kneeL: 2, kneeR: 2,
                ankleL: -12.7, ankleR: -12.7, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 94, y: 114.6, bend: 1 } },
    },
    { // bottom, chest just off the floor, elbows tracked back rather than flared
      t: 1,
      root: { x: 70.87, y: 94.11, rot: 84.25 },
      joints: { spine: 0, neck: -12, hipL: -168.5, hipR: -168.5, kneeL: 2, kneeR: 2,
                ankleL: -2.3, ankleR: -2.3, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 94, y: 114.6, bend: 1 } },
    },
  ],
};

// Dead hang to chin over the bar. A full pull-up is taller than the 140 box
// once you add a hanging body under a bar, so this one zooms out with `fit`
// rather than cropping the feet. Knees stay bent because a hanging adult's feet
// would otherwise be through the floor, which is also true in a real doorway.
// The hang keyframe used to sit at root.y 71 with the ankles pinned at 112,
// which put the toes half a unit THROUGH the floor and left five units of slack
// in a 37 unit arm, so the elbows bowed nine units out of line in what is
// supposed to be a dead hang. 74.6 and 103 straightens the arms and lifts the
// feet clear.
export // v2: PRONATED grip, knuckles toward the face, against Chin-Up below.
const PULL_UP = {
  // BACK view, because that is the angle the exercise is actually judged from:
  // the grip wider than the shoulders, the elbows driving down and back, the
  // shoulder blades pulling together. Side on, the upper arm projects straight
  // through the head at the top, which is why the old side version stopped at
  // three quarters range and still read as a scrunch. From behind it can go all
  // the way to chin over bar.
  view: "front",
  facing: "away",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.84, dy: 4 },
  // No spine or neck angle anywhere in this move, and the same goes for every
  // frontal-plane move in this file. In the frontal plane those two in-plane
  // channels are a SIDE bend and a head tilt, not the chest lift and the raised
  // gaze they read as in a side view, so a few degrees of them at the top leant
  // the whole figure a couple of units off centre in a pose that is meant to be
  // symmetric. Weighted Pull-Up spreads this move and inherited the lean.
  // The bar is nearer the camera than the figure, so at the top the head rises
  // behind it rather than through it.
  grip: { L: "closed", R: "closed" },
  // v3: the grip went from 18 units either side of the midline to 24, and the
  // top from root.y 51 to 49.6. Both are about where the ELBOW lands. Two bone
  // IK puts the elbow off the shoulder to wrist axis, so when the hand sits
  // almost directly above the shoulder that axis is vertical and the only place
  // left for the elbow is straight out sideways, level with the bar: the old
  // top read as a man hanging in a crucifix. Moving the hand six units wider
  // tips the axis over, and the elbow drops below the shoulder line, which is
  // the cue every coach gives. The hang dropped 1.4 units with it so the wider
  // reach still leaves margin in a 37 unit arm rather than clamping at it.
  props: [{ type: "pullupBar", y: 8, x0: 24, x1: 116, front: true }],
  feet: { R: { ang: 10, len: 0.55, w: 0.95 }, L: { ang: -10, len: 0.55, w: 0.95 } },
  keys: [
    { // dead hang, arms long, feet crossed behind
      t: 0,
      root: { x: 70, y: 73.2, rot: 0 },
      joints: { spine: 0, neck: 0,
        hipAbdR: -34, hipAbdL: -34, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 94, y: 9, bend: 1 }, wristL: { x: 46, y: 9, bend: 1 },
            ankleR: { x: 66.5, y: 103, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 73.5, y: 103, bend: 1, pole: [0, 0, -1] } },
    },
    { // top, chin over the bar, elbows down and back
      t: 1,
      root: { x: 70, y: 49.6, rot: 0 },
      joints: { spine: 0, neck: 0,
        hipAbdR: -36, hipAbdL: -36, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 94, y: 9, bend: 1 }, wristL: { x: 46, y: 9, bend: 1 },
            ankleR: { x: 66.5, y: 79, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 73.5, y: 79, bend: 1, pole: [0, 0, -1] } },
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
  // v3: the start stood 1.9 units too close to the wall, so the "locked out"
  // key opened with 40 degrees of elbow. Both hands are on the same wall plane
  // now, which they have to be, and the far shoulder carries 3.4 units of
  // protraction to cancel the rig's own near/far shoulder offset: without it
  // the far shoulder sits 3.4 units back from the near one, its arm has that
  // much further to reach the same wall, and it is the arm that decides how far
  // back the body can stand.
  keys: [
    { // arms locked out, body leaning barely off vertical
      t: 0,
      root: { x: 59.1, y: 62.2, rot: 10 },
      joints: { spine: 0, neck: -5, wristR: 8, wristL: 8, shoulderGirdleProtL: 3.4 },
      ik: {
        wristR: { x: 102, y: 40, bend: 1 }, wristL: { x: 102, y: 43, bend: 1 },
        ankleR: { x: 52, y: 113.4, bend: -1 }, ankleL: { x: 55.5, y: 113.4, bend: -1 },
      },
    },
    { // chest to the wall, elbows back along the ribs, heels still down
      t: 1,
      root: { x: 67.2, y: 63.7, rot: 17 },
      joints: { spine: 0, neck: -8, wristR: 8, wristL: 8, shoulderGirdleProtL: 3.4 },
      ik: {
        wristR: { x: 102, y: 40, bend: 1 }, wristL: { x: 102, y: 43, bend: 1 },
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
  // v3: same rebuild as PUSH_UP, see the note there. The top was 49 degrees bent
  // at the near elbow, so the rep never reached a lockout, and the far shoulder
  // was again the thing holding the body down; 3.4 units of protraction on that
  // side cancels the rig's prone depth offset. 36.6 of a 37 unit arm at the top,
  // 24 at the bottom, and the feet stay on one spot on the floor.
  keys: [
    { // top, arms straight down onto the pad
      t: 0,
      root: { x: 61.56, y: 67.19, rot: 43.24 },
      joints: { spine: 0, neck: -12, hipL: -86.5, hipR: -86.5, kneeL: 2, kneeR: 2,
                ankleL: -36.8, ankleR: -36.8, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 87.2, y: 82.9, bend: 1 }, wristL: { x: 85, y: 82.9, bend: 1 } },
    },
    { // bottom, chest at the pad, elbows tracking back
      t: 1,
      root: { x: 68.92, y: 75.63, rot: 55.6 },
      joints: { spine: 0, neck: -12, hipL: -111.2, hipR: -111.2, kneeL: 2, kneeR: 2,
                ankleL: -24.4, ankleR: -24.4, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 87.2, y: 82.9, bend: 1 }, wristL: { x: 85, y: 82.9, bend: 1 } },
    },
  ],
};

// A push-up with the hands together under the sternum and the elbows dragging
// along the ribs, which is what loads the triceps. Must be visible: the hands
// set back under the middle of the chest rather than under the shoulders, and
// the elbows staying in. Side view. Side on the diamond shape of the hands
// itself cannot be seen, so the hands are drawn stacked and low on the torso;
// that placement plus the tucked elbow is the readable difference from PUSH_UP.
// v3: rebuilt on PUSH_UP's numbers, see the long note there. Three faults, all
// of them the same ones: the top sat 57 degrees bent at the elbow, the rep only
// swung 26 degrees end to end (a push-up that never leaves the top), and the
// toes hung TWELVE units clear of the floor at the top and landed on it at the
// bottom, so the feet slid down the floor through every rep. The two keys are
// now one rigid body at two tip angles about a fixed toe, 36.5 of a 37 unit arm
// at the top and 24 at the bottom. The far hand moved from 87 to 89 so the far
// arm is not the one deciding how high the body can sit.
export const DIAMOND_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.18,
  keys: [
    { // top, arms locked, hands touching under the sternum
      t: 0,
      root: { x: 69.17, y: 85.47, rot: 74.54 },
      joints: { spine: 0, neck: -12, hipL: -149.1, hipR: -149.1, kneeL: 2, kneeR: 2,
                ankleL: -18, ankleR: -18, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 90, y: 114.6, bend: 1 }, wristL: { x: 89, y: 114.6, bend: 1 } },
    },
    { // bottom, elbows folded tight to the ribs
      t: 1,
      root: { x: 70.9, y: 94.39, rot: 84.56 },
      joints: { spine: 0, neck: -12, hipL: -169.1, hipR: -169.1, kneeL: 2, kneeR: 2,
                ankleL: -7.9, ankleR: -7.9, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 90, y: 114.6, bend: 1 }, wristL: { x: 89, y: 114.6, bend: 1 } },
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
  // The hand is forced flat: dipBars is not one of the surfaces the rig treats
  // as flat, so the mitt used to hang six units below the rail, which is a hand
  // under a table rather than on a bar. The girdle depression lifts the seat of
  // the pelvis clear of the rail as well, which is the other half of why this
  // read as leaning on furniture.
  fit: { k: 0.92, dy: 6 },
  grip: { L: "flat", R: "flat" },
  // The hands sit four units further back than they used to, behind the hips
  // rather than under them. Under the hips the arm hung down the line of the
  // ribs, so at card size there was no upper arm and no elbow to see at either
  // end of the rep; behind them it crosses the torso as a diagonal and the fold
  // at the bottom reads. It also straightens the lockout: the shoulder was 34.8
  // units from a 37 unit arm at the top and is 35.8 now, with both pins still
  // reached exactly on both bodies.
  // v3: the rep was a partial. The top sat 29 degrees bent at the near elbow
  // and the bottom only reached 71, where a dip goes to about 90 with the upper
  // arm at parallel. The body drops 4.7 units further now and the top rises
  // 0.8. The far hand moved from 70 to 74 so it is no longer the arm at full
  // stretch deciding how high the lockout can be. The bottom was CHECKED for
  // the thing that hurts people: at the far keyframe the shoulder is still
  // above the elbow, so this is a dip to parallel and not the collapsed
  // bottom position.
  props: [{ type: "dipBars", x0: 38, x1: 110, y: 70 }],
  keys: [
    { // lockout, arms straight under the shoulders, shins tucked behind
      t: 0,
      root: { x: 73, y: 57.2, rot: 14 },
      joints: { spine: 4, neck: -4, hipR: -6, hipL: -10, kneeR: 100, kneeL: 104,
                ankleR: -20, ankleL: -20,
                shoulderGirdleElevL: -4, shoulderGirdleElevR: -4 },
      ik: { wristR: { x: 72, y: 68, bend: 1 }, wristL: { x: 74, y: 68.5, bend: 1 } },
    },
    { // bottom, upper arm to parallel and no further: the shoulder stays ABOVE
      // the elbow, which is the line between a dip and the shoulder injury
      t: 1,
      root: { x: 73, y: 68.7, rot: 20 },
      joints: { spine: 6, neck: -6, hipR: -6, hipL: -10, kneeR: 100, kneeL: 104,
                ankleR: -20, ankleL: -20,
                shoulderGirdleElevL: -4, shoulderGirdleElevR: -4 },
      ik: { wristR: { x: 72, y: 68, bend: 1 }, wristL: { x: 74, y: 68.5, bend: 1 } },
    },
  ],
};

// A push-up with the hands far apart: one arm bends and takes the load while
// the other stays long, the chest travelling down over the bent side. Must be
// visible: one arm long, one arm bent. The suggested view is side, and side on
// a laterally extended arm is foreshortened to nothing, so the long arm is
// drawn reaching out past the head instead: that keeps the one long, one bent
// signature, which is the whole exercise.
// v3. The old version drew the wide hand as a long arm reaching out PAST THE
// HEAD, because side on a laterally extended arm foreshortens to nothing. That
// device cost the exercise: with one hand 21 units forward of the shoulder and
// both hands on the floor, the body could only sit as high as that arm allowed,
// so the top opened at 36 and 62 degrees of elbow and neither arm was ever
// straight.
//
// The hands are world space pins now (`z` is the figure's own left to right),
// so they sit out to the SIDES where an archer puts them and the far arm is
// genuinely straight in three dimensions while the camera foreshortens it. They
// keep a smaller screen stagger as well, 97 and 106, purely so the far arm is
// visible as a second limb rather than hidden exactly behind the near one; at
// full lateral separation and no stagger the card reads as a one-arm push-up.
//
// The hands also slide 20 units of `z` between the keys. That is NOT a hand
// moving: a side camera cannot see z, so on screen both stay planted. It is the
// only way to express the body shifting sideways over the working hand, which
// the root has no channel for, and it is what folds the near elbow to about 90
// degrees at the bottom while the far arm stays locked at 36.4 of 37.
export const ARCHER_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.18,
  fit: { k: 0.9, dy: 4 },
  keys: [
    { // top, hands wide, both arms long, body square between them
      t: 0,
      root: { x: 70.47, y: 86.38, rot: 72.56 },
      joints: { spine: 0, neck: -12, hipL: -145.2, hipR: -145.2, kneeL: 2, kneeR: 2,
                ankleL: -7.4, ankleR: -7.4, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 97, y: 114.6, z: 16, bend: 1 },
            wristL: { x: 106, y: 114.6, z: -16, bend: 1 } },
    },
    { // bottom, body shifted over the near hand: that elbow folds while the far
      // arm stays locked out and reads short because it is pointing at the lens
      t: 1,
      root: { x: 71.71, y: 92.4, rot: 79.33 },
      joints: { spine: 0, neck: -12, hipL: -158.7, hipR: -158.7, kneeL: 2, kneeR: 2,
                ankleL: -0.7, ankleR: -0.7, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 97, y: 114.6, z: -4, bend: 1 },
            wristL: { x: 106, y: 114.6, z: -36, bend: 1 } },
    },
  ],
};

export const PSEUDO_PLANCHE_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.18,
  fit: { k: 0.88, dy: 2 },
  keys: [
    // v3: same rigid tip about the toes as PUSH_UP. The range was 28 to 53
    // degrees of elbow, which on a card is two frames of the same picture. It
    // runs 17 to 71 now. This one stays a PARTIAL on purpose: with the shoulders
    // twenty five units out in front of the hands, a full depth bottom puts the
    // chest through the floor, and a pseudo planche push-up is a short range
    // movement in life for the same reason.
    { // top, shoulders well past the hands, arms long and slanted back
      t: 0,
      root: { x: 69.68, y: 93.37, rot: 76.7 },
      joints: { spine: 0, neck: -12, hipL: -153.4, hipR: -153.4, kneeL: 2, kneeR: 2,
                ankleL: -3.3, ankleR: -3.3, wristL: 120, wristR: 120 },
      ik: { wristR: { x: 74, y: 114.6, bend: 1 }, wristL: { x: 78, y: 114.6, bend: 1 } },
    },
    { // bottom, chest low, shoulders still out in front of the hands
      t: 1,
      root: { x: 71.04, y: 101.96, rot: 86.3 },
      joints: { spine: 0, neck: -12, hipL: -172.6, hipR: -172.6, kneeL: 2, kneeR: 2,
                ankleL: 6.3, ankleR: 6.3, wristL: 120, wristR: 120 },
      ik: { wristR: { x: 74, y: 114.6, bend: 1 }, wristL: { x: 78, y: 114.6, bend: 1 } },
    },
  ],
};

// A push-up on one hand, the other arm folded behind the back and the feet
// wide. Must be visible: a single hand on the floor carrying the body and the
// free arm out of the way. Side view; the wide feet are lost side on, but the
// one supporting arm is the exercise.
// v3: the free arm was swung 200 degrees at the shoulder and folded only 75,
// which drew it pointing straight back into the air off the shoulder, level
// with the body: a wing, not an arm behind the back. 180 and 130 lands the hand
// on the lower back, where a one-arm push-up carries it, and keeps the elbow
// just clear of the back line so the arm is still visible. Tucked any lower it
// disappears inside the torso outline and the card reads as an ordinary push-up
// with one arm hidden behind the other.
export const ONE_ARM_PUSH_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.18,
  keys: [
    { // top, supporting arm locked, free arm along the back
      t: 0,
      root: { x: 69.48, y: 86.89, rot: 69.68 },
      joints: { spine: 0, neck: -12, hipL: -139.4, hipR: -139.4, kneeL: 2, kneeR: 2,
                ankleL: -10.3, ankleR: -10.3, wristR: 86,
                shoulderL: -180, elbowL: 130, wristL: 10 },
      ik: { wristR: { x: 96, y: 114.6, bend: 1 } },
    },
    { // bottom, chest low over the one hand
      t: 1,
      root: { x: 71.74, y: 94.54, rot: 78.47 },
      joints: { spine: 0, neck: -12, hipL: -156.9, hipR: -156.9, kneeL: 2, kneeR: 2,
                ankleL: -1.5, ankleR: -1.5, wristR: 86,
                shoulderL: -184, elbowL: 128, wristL: 10 },
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
  // The bottom of the pull-up, held. Back view for the same reason: what a dead
  // hang is FOR is the shoulders opening under load, and that is a back picture.
  view: "front",
  facing: "away",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.84, dy: 4 },
  grip: { L: "closed", R: "closed" },
  props: [{ type: "pullupBar", y: 8, x0: 24, x1: 116, front: true }],
  feet: { R: { ang: 10, len: 0.55, w: 0.95 }, L: { ang: -10, len: 0.55, w: 0.95 } },
  keys: [
    { // hanging long, shoulders open
      t: 0,
      root: { x: 70, y: 75.4, rot: 0 },
      joints: { spine: 0, neck: 0,
        hipAbdR: -34, hipAbdL: -34, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 86, y: 9, bend: 1 }, wristL: { x: 54, y: 9, bend: 1 },
            ankleR: { x: 66.5, y: 103, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 73.5, y: 103, bend: 1, pole: [0, 0, -1] } },
    },
    { // a breath of sway, nothing more
      t: 1,
      root: { x: 70.5, y: 75.45, rot: 0 },
      joints: { spine: 0, neck: 0,
        hipAbdR: -33, hipAbdL: -33, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 86, y: 9, bend: 1 }, wristL: { x: 54, y: 9, bend: 1 },
            ankleR: { x: 67.5, y: 103.4, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 74.5, y: 103.4, bend: 1, pole: [0, 0, -1] } },
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
  // v3: the bar and both grips sit 5 units higher. At the old height the start
  // key, which is supposed to be a hang with the arms long, measured 31.8 units
  // of a 37 unit arm: 61 degrees of elbow, so the "bottom" of the row was
  // already a third of the way pulled. Raising the bar rather than dropping the
  // body keeps the heels on the floor where they belong.
  props: [{ type: "pullupBar", y: 45, x0: 6, x1: 74 }],
  keys: [
    { // bottom, arms straight, body hanging off the bar in one line
      t: 0,
      root: { x: 65.1, y: 93.6, rot: -70 },
      joints: { spine: 0, neck: 4, hipL: 140, hipR: 140, kneeL: 2, kneeR: 2,
                ankleL: 0, ankleR: 0 },
      ik: { wristR: { x: 40, y: 45, bend: 1 }, wristL: { x: 37.5, y: 45.5, bend: 1 } },
    },
    { // top, chest to the bar, elbows driven down and back, body still a line
      t: 1,
      root: { x: 68.2, y: 86.8, rot: -61.8 },
      joints: { spine: 0, neck: 6, hipL: 123.6, hipR: 123.6, kneeL: 2, kneeR: 2,
                ankleL: 0, ankleR: 0 },
      ik: { wristR: { x: 40, y: 45, bend: 1 }, wristL: { x: 37.5, y: 45.5, bend: 1 } },
    },
  ],
};

// Starting at the top of a pull-up with the chin over the bar and lowering
// under control to a dead hang. Must be visible: that it runs one way, top to
// bottom. Side view, oneway loop, which is the whole difference from PULL_UP:
// a negative is the lowering half only.
export const NEGATIVE_PULL_UP = {
  // The lowering half of a pull-up, so it is Pull-Up's two keys in the other
  // order with a oneway loop: start at the top, finish hanging. It carries
  // Pull-Up's v3 grip width for the same reason, and the two must stay in step:
  // a negative that hangs from a different bar than the pull-up is a bug.
  view: "front",
  facing: "away",
  loop: "oneway",
  dur: 3.6,
  breath: 0.2,
  fit: { k: 0.84, dy: 4 },
  grip: { L: "closed", R: "closed" },
  props: [{ type: "pullupBar", y: 8, x0: 24, x1: 116, front: true }],
  feet: { R: { ang: 10, len: 0.55, w: 0.95 }, L: { ang: -10, len: 0.55, w: 0.95 } },
  keys: [
    { // start at the top, chin over the bar
      t: 0,
      root: { x: 70, y: 49.6, rot: 0 },
      joints: { spine: 0, neck: 0,
        hipAbdR: -36, hipAbdL: -36, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 94, y: 9, bend: 1 }, wristL: { x: 46, y: 9, bend: 1 },
            ankleR: { x: 66.5, y: 79, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 73.5, y: 79, bend: 1, pole: [0, 0, -1] } },
    },
    { // finish hanging, arms long
      t: 1,
      root: { x: 70, y: 73.2, rot: 0 },
      joints: { spine: 0, neck: 0,
        hipAbdR: -34, hipAbdL: -34, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 94, y: 9, bend: 1 }, wristL: { x: 46, y: 9, bend: 1 },
            ankleR: { x: 66.5, y: 103, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 73.5, y: 103, bend: 1, pole: [0, 0, -1] } },
    },
  ],
};


// Hanging from a narrow underhand grip and pulling until the chin clears the
// bar, elbows driving down in front of the ribs rather than out. Must be
// visible: the hands close together, the chin finishing above the bar and the
// elbows tracking in front. Side view. The hands curl back over the bar, which
// is the only way a supinated grip shows side on.
export // v2: SUPINATED grip, palms toward the face. That is the only difference from
// a pull-up and until the forearm channel existed the two cards were the same
// drawing with different names.
const CHIN_UP = {
  // Same back view as Pull-Up, and the two must not look alike: the grip is
  // SHOULDER WIDTH here, not wider, and the palms face the figure, so the
  // elbows finish tight to the ribs rather than flared.
  // v3: the hands moved from 13 units either side of the midline to 19, which
  // is still five units narrower than Pull-Up's. The reason is the same one
  // written out there: with the hand almost directly over the shoulder the two
  // bone solver has nowhere to put the elbow but straight out at bar height,
  // and the old top read as a shrug with the elbows in a crucifix. A lateral
  // elbow pole was tried first, to fold the arm forward the way a chin-up
  // really does. It draws well and it is a lie: the shoulder passes 200 degrees
  // of elevation and the elbow folds 178, and the validator says so.
  view: "front",
  facing: "away",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.84, dy: 4 },
  grip: { L: "closed", R: "closed" },
  props: [{ type: "pullupBar", y: 8, x0: 24, x1: 116, front: true }],
  feet: { R: { ang: 10, len: 0.55, w: 0.95 }, L: { ang: -10, len: 0.55, w: 0.95 } },
  keys: [
    { // hang, hands shoulder width, palms back toward the camera
      t: 0,
      root: { x: 70, y: 74.6, rot: 0 },
      joints: { spine: 0, neck: 0, forearmPronR: -74, forearmPronL: -74,
        hipAbdR: -34, hipAbdL: -34, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 89, y: 9, bend: 1 }, wristL: { x: 51, y: 9, bend: 1 },
            ankleR: { x: 66.5, y: 103, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 73.5, y: 103, bend: 1, pole: [0, 0, -1] } },
    },
    { // top, chin over the bar, elbows driving down close to the body
      t: 1,
      root: { x: 70, y: 51, rot: 0 },
      joints: { spine: 0, neck: 0, forearmPronR: -74, forearmPronL: -74,
        hipAbdR: -36, hipAbdL: -36, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 89, y: 9, bend: 1 }, wristL: { x: 51, y: 9, bend: 1 },
            ankleR: { x: 66.5, y: 80, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 73.5, y: 80, bend: 1, pole: [0, 0, -1] } },
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
  // The knees were authored as angles, and in a FRONTAL move `knee` is the in
  // plane channel: the shins swung sideways and crossed each other, so the hang
  // read as a frog with its feet on the floor. Pinned ankles with a lateral
  // pole put the bend back in the sagittal plane, where a hanging knee belongs.
  // v3: the whole move was one arm length short. At the hang both elbows sat 53
  // degrees bent, so the start of an archer pull-up was already half a rep in,
  // and at the top the chin finished six units BELOW the bar, which is not a
  // pull-up at all. The grip is wider (86 and 28, so 58 units across against a
  // 24 unit shoulder) because that is what lets the far arm stay long with the
  // chin at the bar: with the old 54 unit grip the straight arm ran out of
  // reach 20 units below it. Hang 71.1 and top 50, with the body sliding from
  // the middle of the grip over to the working hand.
  fit: { k: 0.8, dy: 6 },
  feet: { R: { ang: 12, len: 0.55, w: 0.95 }, L: { ang: -12, len: 0.55, w: 0.95 } },
  props: [{ type: "pullupBar", y: 8, x0: 20, x1: 110 }],
  keys: [
    { // hanging wide, both arms long, feet tucked up behind
      t: 0,
      root: { x: 57, y: 71.1, rot: 0 },
      joints: { spine: 0, neck: 0, hipAbdR: -32, hipAbdL: -32, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 86, y: 9, bend: 1 }, wristL: { x: 28, y: 9, bend: 1 },
            ankleR: { x: 53.5, y: 101, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 60.5, y: 101, bend: 1, pole: [0, 0, -1] } },
    },
    { // halfway. The body travels on an ARC around the far hand, not on the
      // chord between the two ends: interpolating root x and y straight from
      // the hang to the top pulls the far shoulder 33 units from a 36 unit
      // reach, and the long arm folds 55 degrees in the middle of the rep. One
      // arm bent and one arm long is the whole exercise, so the middle has to
      // hold it too.
      t: 0.5,
      root: { x: 68.7, y: 61, rot: 0 },
      joints: { spine: 0, neck: 0, hipAbdR: -32, hipAbdL: -32, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 86, y: 9, bend: 1 }, wristL: { x: 28, y: 9, bend: 1 },
            ankleR: { x: 65.2, y: 91, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 72.2, y: 91, bend: 1, pole: [0, 0, -1] } },
    },
    { // pulled up to the right hand, left arm still long across the bar
      t: 1,
      root: { x: 74, y: 50, rot: 0 },
      joints: { spine: 0, neck: 0, hipAbdR: -32, hipAbdL: -32, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 86, y: 9, bend: 1 }, wristL: { x: 28, y: 9, bend: 1 },
            ankleR: { x: 70.5, y: 80, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 77.5, y: 80, bend: 1, pole: [0, 0, -1] } },
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
  // The catch put the crown of the head at y -0.9 and the old fit cropped it,
  // which is the one thing `fit` exists to prevent. The knees also had to come
  // up: at seventy four degrees of flexion the toes brushed the floor while the
  // chest was at the bar.
  fit: { k: 0.85, dy: 6 },
  props: [{ type: "pullupBar", y: 30, x0: 30, x1: 110 }],
  keys: [
    { // end of the pull, chest at the bar, elbows high
      t: 0,
      root: { x: 72.3, y: 69.7, rot: -18 },
      joints: { spine: 0, neck: -8, hipL: 16, hipR: 18, kneeL: 100, kneeR: 98,
                ankleL: -20, ankleR: -20 },
      ik: { wristR: { x: 70, y: 31, bend: 1 }, wristL: { x: 65, y: 31.5, bend: 1 } },
    },
    { // shoulders level with the bar, still behind it
      t: 0.45,
      through: true,
      root: { x: 56.3, y: 60, rot: 0 },
      joints: { spine: 0, neck: -4, hipL: -2, hipR: 0, kneeL: 100, kneeR: 98,
                ankleL: -20, ankleR: -20 },
      ik: { wristR: { x: 70, y: 31, bend: 1 }, wristL: { x: 65, y: 31.5, bend: 1 } },
    },
    { // shoulders above the bar, torso pitching forward over it
      t: 0.75,
      through: true,
      root: { x: 56.7, y: 47.1, rot: 12 },
      joints: { spine: 0, neck: -4, hipL: -14, hipR: -12, kneeL: 100, kneeR: 98,
                ankleL: -20, ankleR: -20 },
      ik: { wristR: { x: 70, y: 31, bend: 1 }, wristL: { x: 65, y: 31.5, bend: 1 } },
    },
    { // the catch and the press out of it: a muscle-up does not end folded in
      // the bottom of a dip. The old last key left 132 degrees of elbow, so the
      // card finished in the hardest position rather than on top of the bar;
      // 7.4 units higher takes the arms out to about 95.
      t: 1,
      root: { x: 61.3, y: 36, rot: 22 },
      joints: { spine: 0, neck: -6, hipL: -24, hipR: -22, kneeL: 100, kneeR: 98,
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
  // Same fix as ARCHER_PULL_UP: frontal `knee` swings the shin sideways, so the
  // legs crossed and the feet landed on the floor. Pinned with a lateral pole.
  // The free arm was also swung fourteen degrees out and folded twenty five,
  // which reads as a wing rather than as an arm hanging out of the way.
  // v3, two things. The rep only travelled ten units, which left the chin a
  // head below the bar at the far keyframe: a one-arm pull-up that never
  // finishes is a one-arm hang, and that is a different exercise. It runs the
  // pull-up's full range now, 75.4 down to 50, which also puts a real dead hang
  // at the bottom (the shoulder was 33 units from a 37 unit arm before, so the
  // working elbow sat half bent at the start). The free elbow came down from 52
  // degrees to 12: in a FRONTAL move `elbow` is the in plane channel, so every
  // degree of it throws the forearm out sideways, and 52 drew a forearm
  // sticking straight out from the hip.
  fit: { k: 0.8, dy: 6 },
  feet: { R: { ang: 12, len: 0.55, w: 0.95 }, L: { ang: -12, len: 0.55, w: 0.95 } },
  props: [{ type: "pullupBar", y: 8, x0: 26, x1: 114 }],
  keys: [
    { // hanging from the one arm, free arm down by the side
      t: 0,
      root: { x: 62.5, y: 75.4, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderL: 4, elbowL: 6,
                hipAbdR: -30, hipAbdL: -30, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 74, y: 9, bend: 1 },
            ankleR: { x: 59.5, y: 105, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 65.5, y: 105, bend: 1, pole: [0, 0, -1] } },
    },
    { // pulled up under the grip, free arm counterbalancing
      t: 1,
      root: { x: 64, y: 50, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderL: 10, elbowL: 12,
                hipAbdR: -30, hipAbdL: -30, ankleR: -8, ankleL: -8 },
      ik: { wristR: { x: 74, y: 9, bend: 1 },
            ankleR: { x: 61, y: 80, bend: 1, pole: [0, 0, -1] },
            ankleL: { x: 67, y: 80, bend: 1, pole: [0, 0, -1] } },
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
      root: { x: 51.2, y: 95.6, rot: 10 },
      joints: { spine: 12, neck: -6, shoulderR: 66, shoulderL: 64, shoulderRotR: 0, shoulderRotL: 1, elbowR: 1, elbowL: 1 },
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
  // The counterbalancing arms used to finish at the same height as the free
  // leg and the two read as one horizontal bar at 160px. They are carried
  // eighteen units higher now.
  fit: { k: 0.86, dy: 2 },
  keys: [
    { // standing on one leg, free leg already lifted out front
      t: 0,
      root: { x: 66, y: 62, rot: 4 },
      joints: { spine: 5, neck: -3, hipL: 65, kneeL: 6, ankleL: 16,
                shoulderR: 24, elbowR: 16, shoulderL: 20, elbowL: 20 },
      ik: { ankleR: { x: 70, y: 113.4, bend: -1 } },
    },
    { // bottom, hips to the heel, free leg long and level, arms up clear of it
      t: 1,
      root: { x: 58, y: 100, rot: 20 },
      joints: { spine: 14, neck: -8, hipL: 92, kneeL: 4, ankleL: 20,
                shoulderR: 62, elbowR: 10, shoulderL: 58, elbowL: 14 },
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
      joints: { spine: 0, neck: -12, hipL: -165, hipR: -165, kneeL: 2, kneeR: 2,
                ankleL: 0, ankleR: 0, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 111, y: 114.6, bend: 1 }, wristL: { x: 109, y: 114.6, bend: 1 } },
    },
    { // the settle a held position always has, and nothing else
      t: 1,
      root: { x: 67.4, y: 97.2, rot: 83.2 },
      joints: { spine: 0, neck: -12, hipL: -166.4, hipR: -166.4, kneeL: 2, kneeR: 2,
                ankleL: 1, ankleR: 1, wristL: 86, wristR: 86,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 111, y: 114.6, bend: 1 }, wristL: { x: 109, y: 114.6, bend: 1 } },
    },
  ],
};

// Stacked on one side, propped on one forearm, hips lifted so the body is one
// straight diagonal line, top arm reaching at the ceiling. Must be visible: the
// single forearm on the floor, the lifted hips and the top arm pointing up,
// which is what stops it reading as a plank. Side view. The authored shoulder
// numbers look extreme because the root is rotated 76 degrees: an arm pointing
// at the ceiling off a near horizontal torso is a big number, not a mistake.
export // v2 note: rolling the body onto its side with pelvisTwist and viewing it from
// three quarters was tried and reverted. The roll works, but the arms were
// authored as in-plane angles against a flat side view, so carrying them round
// the long axis folds them into the torso and the pose collapses. Re-authoring
// the whole shape in the rolled frame is the right fix and is more than this
// pass; the v1 pose still reads as a side plank, so it stays.
const SIDE_PLANK = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  // The supporting forearm used to lie four units clear of the floor. Dropping
  // the whole body instead put the trailing heel through it, so only the arm
  // moved: the upper arm is vertical now, elbow directly under the shoulder,
  // which is where a forearm side plank carries it anyway.
  fit: { k: 0.84, dy: 6 },
  keys: [
    { // set, hips high, body in one line
      t: 0,
      root: { x: 60.2, y: 99, rot: -76 },
      joints: { spine: 0, neck: 2, hipL: 152, hipR: 152, kneeL: 2, kneeR: 2,
                ankleL: -50, ankleR: -50,
                shoulderR: 256, elbowR: 2, wristR: -6,
                shoulderL: 76, elbowL: 90, wristL: 0 },
      ik: {},
    },
    { // settle, hips a touch lower, top arm still long
      t: 1,
      root: { x: 60.4, y: 100.1, rot: -74.6 },
      joints: { spine: 0, neck: 3, hipL: 149.2, hipR: 149.2, kneeL: 2, kneeR: 2,
                ankleL: -50, ankleR: -50,
                shoulderR: 254, elbowR: 3, wristR: -6,
                shoulderL: 75, elbowL: 91, wristL: 0 },
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
  // The pelvis was at 108 and the whole banana floated: a hollow hold with
  // nothing touching is a lever, not a hollow hold. 110.5 presses the lower
  // back into the floor and leaves the shoulders and the heels up.
  fit: { k: 0.7, dy: 8 },
  keys: [
    { // set, shoulders and heels both up, only the lower back down
      t: 0,
      root: { x: 72, y: 110.5, rot: -68 },
      joints: { spine: 0, neck: 10, hipL: 183.2, hipR: 183.2, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40,
                shoulderR: -44, elbowR: 8, shoulderL: -46, elbowL: 10 },
      ik: {},
    },
    { // settle, everything a degree lower, nothing else moves
      t: 1,
      root: { x: 72, y: 111, rot: -66 },
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
  // What decides whether a support hold reads is whether you can see the ARM.
  // Side on, the hip of a support hold sits at hand height whatever you do
  // (arm 37, torso 30: the pelvis lands seven units above the grip), so hands
  // beside the hips put the whole arm inside the torso silhouette and the card
  // reads as a man sitting on a stool. Three changes fix it and are shared by
  // all three sits: the hands go BEHIND the hips so the elbow and forearm clear
  // the body outline, the shoulder girdle is depressed four units so the hips
  // ride above the rail rather than on it, and the mitt is forced flat because
  // dipBars is not one of the surfaces the rig lays a hand on, so it used to
  // dangle under the rail.
  fit: { k: 0.76, dy: 4 },
  grip: { L: "flat", R: "flat" },
  props: [{ type: "dipBars", x0: 40, x1: 68, y: 92 }],
  keys: [
    { // set, arms locked behind the hips, knees to the chest, hips off the bars
      t: 0,
      root: { x: 71.8, y: 80.98, rot: -4 },
      joints: { spine: 4, neck: 0, hipL: 122, hipR: 124, kneeL: 128, kneeR: 130,
                ankleL: -30, ankleR: -30,
                shoulderGirdleElevL: -4, shoulderGirdleElevR: -4 },
      ik: { wristR: { x: 60, y: 89, bend: 1 }, wristL: { x: 58, y: 89.5, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 71.8, y: 81.13, rot: -3 },
      joints: { spine: 4, neck: 1, hipL: 120, hipR: 122, kneeL: 126, kneeR: 128,
                ankleL: -30, ankleR: -30,
                shoulderGirdleElevL: -4, shoulderGirdleElevR: -4 },
      ik: { wristR: { x: 60, y: 89, bend: 1 }, wristL: { x: 58, y: 89.5, bend: 1 } },
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
  // Staged exactly like TUCK_L_SIT, and for the reason written out there: the
  // hands go behind the hips so the arm is outside the torso outline, the
  // girdle is depressed so the hips clear the rail, and the grip is forced flat.
  fit: { k: 0.76, dy: 4 },
  grip: { L: "flat", R: "flat" },
  props: [{ type: "dipBars", x0: 40, x1: 68, y: 92 }],
  keys: [
    { // set, legs level, toes pointed, hips clear of the bars
      t: 0,
      root: { x: 71.8, y: 80.98, rot: -2 },
      joints: { spine: 2, neck: 0, hipL: 90, hipR: 92, kneeL: 2, kneeR: 2,
                ankleL: -45, ankleR: -45,
                shoulderGirdleElevL: -4, shoulderGirdleElevR: -4 },
      ik: { wristR: { x: 60, y: 89, bend: 1 }, wristL: { x: 58, y: 89.5, bend: 1 } },
    },
    { // settle, legs a degree lower
      t: 1,
      root: { x: 71.8, y: 81.13, rot: -1 },
      joints: { spine: 2, neck: 1, hipL: 87, hipR: 89, kneeL: 2, kneeR: 2,
                ankleL: -45, ankleR: -45,
                shoulderGirdleElevL: -4, shoulderGirdleElevR: -4 },
      ik: { wristR: { x: 60, y: 89, bend: 1 }, wristL: { x: 58, y: 89.5, bend: 1 } },
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
  fit: { k: 0.78, dy: 4 },
  grip: { L: "flat", R: "flat" },
  props: [{ type: "dipBars", x0: 32, x1: 60, y: 92 }],
  keys: [
    { // set, legs high, torso leaning back under them, hips clear of the bars
      t: 0,
      root: { x: 71, y: 80.19, rot: -12 },
      joints: { spine: -2, neck: 6, hipL: 140, hipR: 142, kneeL: 2, kneeR: 2,
                ankleL: -45, ankleR: -45,
                shoulderGirdleElevL: -4, shoulderGirdleElevR: -4 },
      ik: { wristR: { x: 54, y: 89, bend: 1 }, wristL: { x: 51, y: 89.5, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 70.8, y: 80.36, rot: -11 },
      joints: { spine: -2, neck: 7, hipL: 137, hipR: 139, kneeL: 2, kneeR: 2,
                ankleL: -45, ankleR: -45,
                shoulderGirdleElevL: -4, shoulderGirdleElevR: -4 },
      ik: { wristR: { x: 54, y: 89, bend: 1 }, wristL: { x: 51, y: 89.5, bend: 1 } },
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
  // The bar and both wrist pins sit 2.7 units higher than they used to. At the
  // old height the shoulder was 33.8 units from a 37 unit arm, so the figure
  // hung with both elbows bowed about fifty degrees, which reads as holding a
  // half pull-up rather than as a hang. Raising the bar and the grip together
  // straightens the arms and moves no other contact: nothing else touches the
  // world and the feet keep their clearance.
  props: [{ type: "pullupBar", y: 5.3, x0: 34, x1: 106 }],
  keys: [
    { // hanging, legs down and still
      t: 0,
      root: { x: 70, y: 72.6, rot: -4 },
      joints: { spine: 2, neck: 0, torsoRoll: 1, hipR: -8, hipL: -10, kneeR: 72, kneeL: 76, ankleR: -24, ankleL: -24 },
      ik: { wristR: { x: 92.8, y: 5.1, bend: 1 }, wristL: { x: 65, y: 6.3, bend: 1 } },
    },
    { // knees come up first, which is the only path that does not sweep the
      // feet through the floor, and is what a real leg raise looks like anyway
      t: 0.5,
      through: true,
      root: { x: 70, y: 72.8, rot: -2 },
      joints: { spine: 3, neck: 1, hipL: 50, hipR: 52, kneeL: 118, kneeR: 120,
                ankleL: -25, ankleR: -25 },
      ik: { wristR: { x: 70, y: 6.3, bend: 1 }, wristL: { x: 65, y: 6.3, bend: 1 } },
    },
    { // legs level with the hips, knees long
      t: 1,
      root: { x: 70, y: 73, rot: -4 },
      joints: { spine: 4, neck: 2, hipL: 92, hipR: 94, kneeL: 6, kneeR: 4,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 70, y: 6.3, bend: 1 }, wristL: { x: 65, y: 6.3, bend: 1 } },
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
  // root.y was 52, which left five units of slack in a 37 unit arm and drew a
  // handstand with bent elbows. 48 locks them out.
  fit: { k: 0.74, dy: 0 },
  // The wall was at x 52 and the torso, which is nearly ten units thick, lay
  // inside it: a handstand leaning through a wall rather than on it. Moved out
  // six units, with eight degrees of hip flexion so the TOES still reach it,
  // which is the only contact a wall handstand has.
  props: [{ type: "wall", x: 46, w: 18, top: -24 }],
  keys: [
    { // stacked, hands a hand's length off the wall, toes touching it
      t: 0,
      root: { x: 78, y: 48, rot: 180 },
      joints: { spine: 0, neck: 4, hipL: 8, hipR: 8, kneeL: 0, kneeR: 0,
                ankleL: -78, ankleR: -78, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
    { // the small correction a held handstand always makes
      t: 1,
      root: { x: 78.4, y: 48.6, rot: 181.4 },
      joints: { spine: 0, neck: 5, hipL: 7, hipR: 7, kneeL: 2, kneeR: 2,
                ankleL: -78, ankleR: -78, wristL: 86, wristR: 86 },
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
  // 48 rather than 52: at 52 the arm carried five units of slack and the elbows
  // bowed, and a handstand with bent arms is a different skill.
  fit: { k: 0.74, dy: 0 },
  keys: [
    { // stacked over the hands
      t: 0,
      root: { x: 78, y: 48, rot: 177 },
      joints: { spine: 2, neck: 6, hipL: 0, hipR: 0, kneeL: 2, kneeR: 2,
                ankleL: -54, ankleR: -54, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
    { // the balance correction, hips travelling a couple of units
      t: 1,
      root: { x: 77.2, y: 48.8, rot: 183 },
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
  // Lockout at 47.6 instead of 51.6 so the arms are actually straight at the
  // top; the bottom stays at 63, where the head is at the floor between the
  // hands. That is also what makes the rep read: sixteen units of travel.
  fit: { k: 0.74, dy: 0 },
  keys: [
    { // locked out overhead
      t: 0,
      root: { x: 78, y: 47.6, rot: 180 },
      joints: { spine: 0, neck: 2, hipL: 0, hipR: 0, kneeL: 2, kneeR: 2,
                ankleL: -78, ankleR: -78, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
    { // bottom, head at the floor between the hands, elbows folded
      t: 1,
      root: { x: 78, y: 63, rot: 180 },
      joints: { spine: 0, neck: 2, hipL: 0, hipR: 0, kneeL: 2, kneeR: 2,
                ankleL: -78, ankleR: -78, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 75, y: 114.6, bend: 1 } },
    },
  ],
};

// A push-up top position taken as far forward as it will go: straight arms,
// toes on the floor, shoulders driven way out in front of the hands and held
// there. Must be visible: the shoulders well ahead of the hands with the body
// flat, and that nothing is moving. Side view, hold, which is what separates it
// from PSEUDO_PLANCHE_PUSH_UP.
export // v3: the flatten migration that fixed the shoulder reach here put the hand
// through the floor, which is worse than an arm two units short, so this one
// keeps its authored angle and carries the shortfall.
const PLANCHE_LEAN = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.8, dy: 2 },
  keys: [
    { // leaning, hands back at the hips, body flat
      t: 0,
      root: { x: 67.9, y: 98.13, rot: 84 },
      joints: { spine: 0, neck: -12, hipL: -168.0, hipR: -168.0, kneeL: 2, kneeR: 2,
                ankleL: 0, ankleR: 0, wristL: 120, wristR: 120 },
      ik: { wristR: { x: 66, y: 114.6, bend: 1 }, wristL: { x: 68, y: 114.6, bend: 1 } },
    },
    { // settle, a degree further forward
      t: 1,
      root: { x: 68.3, y: 98.62, rot: 84.5 },
      joints: { spine: 0, neck: -12, hipL: -169.5, hipR: -169.5, kneeL: 2, kneeR: 2,
                ankleL: 1, ankleR: 1, wristL: 120, wristR: 120 },
      ik: { wristR: { x: 66, y: 114.6, bend: 1 }, wristL: { x: 68, y: 114.6, bend: 1 } },
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
  // The first version put the knees and the toes on the floor, so it read as
  // somebody crouching face down. The hips are now 30 units up and the tuck
  // swings FORWARD under the chest, which is where a tucked planche carries it.
  fit: { k: 0.9, dy: 2 },
  keys: [
    { // holding, knees under the chest, hips up, nothing on the floor but the hands
      t: 0,
      root: { x: 52, y: 83.5, rot: 81.5 },
      joints: { spine: 0, neck: -12, hipL: -19.5, hipR: -19.5, kneeL: 155, kneeR: 155,
                ankleL: -78, ankleR: -78, wristL: 110, wristR: 110,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 68, y: 114.6, bend: 1 }, wristL: { x: 70, y: 114.6, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 52.5, y: 84, rot: 82.5 },
      joints: { spine: 0, neck: -12, hipL: -21.5, hipR: -21.5, kneeL: 153, kneeR: 153,
                ankleL: -54, ankleR: -54, wristL: 110, wristR: 110,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 68, y: 114.6, bend: 1 }, wristL: { x: 70, y: 114.6, bend: 1 } },
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
  // The ankle used to sit at zero, which is a foot at ninety degrees to a
  // horizontal shin: a sole pointing at the floor, which read as a plank
  // standing on its toes. The toes are pointed now and the whole body is up.
  fit: { k: 0.8, dy: 4 },
  keys: [
    { // holding, one straight line from toe to head, nothing on the floor
      t: 0,
      root: { x: 66, y: 84.4, rot: 81.5 },
      joints: { spine: 0, neck: -12, hipL: -163, hipR: -163, kneeL: 2, kneeR: 2,
                ankleL: -78, ankleR: -78, wristL: 110, wristR: 110,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 81, y: 114.6, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 66.5, y: 84.9, rot: 82.5 },
      joints: { spine: 0, neck: -12, hipL: -165, hipR: -165, kneeL: 2, kneeR: 2,
                ankleL: -78, ankleR: -78, wristL: 110, wristR: 110,
                shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 80, y: 114.6, bend: 1 }, wristL: { x: 81, y: 114.6, bend: 1 } },
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
  props: [{ type: "pullupBar", y: 22, x0: 8, x1: 64 }],
  keys: [
    { // holding level, toes long
      t: 0,
      root: { x: 51.9, y: 61.28, rot: -90 },
      joints: { spine: 0, neck: 6, hipL: 180, hipR: 180, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40, shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 23, y: 23, bend: 1 }, wristL: { x: 21.5, y: 23.5, bend: 1 } },
    },
    { // settle, hips a shade lower
      t: 1,
      root: { x: 51.9, y: 62.59, rot: -87.5 },
      joints: { spine: 0, neck: 7, hipL: 175, hipR: 175, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40, shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 23, y: 23, bend: 1 }, wristL: { x: 21.5, y: 23.5, bend: 1 } },
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
  props: [{ type: "pullupBar", y: 22, x0: 8, x1: 64 }],
  keys: [
    // The old tuck folded 140 degrees at the hip, which threw the knees past
    // the shoulders and up among the arms, and the shins then pointed back out
    // level: a knot rather than a tuck. 100 degrees puts the knees over the
    // chest with the heels drawn in under the hips, which is the shape.
    { // holding, knees to the chest, hips level with the shoulders
      t: 0,
      root: { x: 51.9, y: 61.28, rot: -90 },
      joints: { spine: 0, neck: 6, hipL: -78.5, hipR: -78.5, kneeL: 140, kneeR: 140,
                ankleL: -40, ankleR: -40, shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 23, y: 23, bend: 1 }, wristL: { x: 21.5, y: 23.5, bend: 1 } },
    },
    { // settle
      t: 1,
      root: { x: 51.9, y: 62.33, rot: -88 },
      joints: { spine: 0, neck: 7, hipL: -76, hipR: -76, kneeL: 138, kneeR: 138,
                ankleL: -40, ankleR: -40, shoulderGirdleProtL: 3.4 },
      ik: { wristR: { x: 23, y: 23, bend: 1 }, wristL: { x: 21.5, y: 23.5, bend: 1 } },
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
  // A doorframe sets no grip, so the mitt stayed open and its tip ran out past
  // the far edge of the pole. Closed wraps it.
  // v3: both hands moved apart on the pole, 95 and 35.5 against 92 and 38. A
  // flag is a STRAIGHT ARM hold at both ends and the old spacing left the
  // bottom arm 48 degrees bent, which is a man hanging off a pole rather than a
  // flag; the bottom one is straight now, 19 degrees.
  // The TOP arm is still bent, about 69 degrees, and it cannot be fixed from
  // here. Straightening it means lifting that hand another three units, and at
  // 33 the validator reports shoulderElev 197 against a ceiling of 196: the
  // shoulder is already as far past overhead as the rig allows. A real flag
  // does carry the top arm past the line of the body, so the ceiling, not the
  // pose, is what is wrong. Written up for the lead.
  grip: { L: "closed", R: "closed" },
  props: [{ type: "doorframe", x: 112, w: 8, pole: true }],
  keys: [
    { // holding, top hand high on the pole, bottom hand pressing low
      t: 0,
      root: { x: 70.6, y: 71.2, rot: 70 },
      joints: { spine: 0, neck: -8, hipL: -140, hipR: -140, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 116, y: 95, bend: 1 }, wristL: { x: 116, y: 35.5, bend: 1 } },
    },
    { // settle, the body dips a degree and holds
      t: 1,
      root: { x: 70.8, y: 72.4, rot: 72 },
      joints: { spine: 0, neck: -9, hipL: -144, hipR: -144, kneeL: 2, kneeR: 2,
                ankleL: -40, ankleR: -40 },
      ik: { wristR: { x: 116, y: 95, bend: 1 }, wristL: { x: 116, y: 35.5, bend: 1 } },
    },
  ],
};

export const MOVES = {
  "Wall Push-Up": WALL_PUSH_UP,
  "Incline Push-Up": INCLINE_PUSH_UP,
  "Push-Up": PUSH_UP,
  "Diamond Push-Up": DIAMOND_PUSH_UP,
  "Dip": DIP,
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

/* Archived on Mo's call, 2026-09-17: Boomerang, Elbow Circles, Hip Circles,
   Inchworm Walkout and Archer Push-Up are unmapped rather than deleted. The
   poses above still build, so putting one back is restoring its one line in
   the table and its entry in the exercise library. */
