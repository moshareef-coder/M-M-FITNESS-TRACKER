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
//    on the mat. The numbers that used to be here were the v2 body's and every
//    supine entry inherited its float from them, so, measured off the rig as it
//    ships:
//      - the floor line is 118, but the MAT is drawn from 115.6 to 120, so the
//        surface a body rests on is 115.6, not 118;
//      - pelvis radius is 8.0 and chest radius 9.8 (they were 9.9 and 11.8);
//      - so a FLAT supine body sits at root.y 106, where the chest lands on
//        115.8, and a body with the chest curled off the mat sits at root.y 108,
//        where the pelvis alone lands on 116;
//      - a side-lying body sits at root.y 106 for the same reason;
//      - extremities are allowed to press a little into the mat: the house range
//        for a heel or a toe is about 118 to 119, which is what Plank and Cat-Cow
//        measure. Past 120 it reads as ploughing.
//
// Pinned ankles are avoided on anything with a long leg: a pinned ankle is a
// FLAT foot, which on a supine extended leg derives as 90 degrees of plantar
// flexion and fails the ankle range. Long legs are authored with angles, and
// `ankle: -45` is about as pointed as a real foot gets.
//
// 4. THE ARM ARC, which is what most of this file got wrong. The arm is
//    20 + 17 = 37 units shoulder to wrist, so a wrist pin at 36.6 out is a long
//    arm, at 34 it is 44 degrees of elbow, and past 37 the solver stops solving
//    and clamps. Pilates says "reach" in nearly every cue, so before pinning a
//    reaching hand, work out where the shoulder actually IS in that pose and put
//    the pin on the 36.6 circle around it. The same arithmetic applies to what
//    happens BETWEEN two pins: a wrist travels in a straight line while the arm
//    swings through an arc, so any sweep over about 60 degrees needs a middle
//    key or the chord cuts inside the shoulder and the elbow folds shut halfway
//    through the rep. The Hundred, Double Leg Stretch, Teaser, Spine Stretch
//    Forward, Saw, Boomerang and Control Balance all carried one or both of
//    these faults.

// A mat under every one of these. It is the difference between "lying down" and
// "floating", and it is the only prop most of the library needs.
// Plank is the calisthenics one, authored once and shared.
import { PLANK } from "./calisthenics.mjs";

// Cat-Cow is the yoga one, authored once and shared.
import { CAT_COW } from "./yoga.mjs";

const MAT = { type: "mat", x: 6, w: 128 };
// The two PRONE moves need a longer one. A prone figure has its head at +x and
// its feet at -x, and at full reach it spans x 2.4 to 133, so on the standard
// mat the far foot hangs three units off the end, which reads as the mat being
// in the wrong place rather than as a long body.
const MAT_LONG = { type: "mat", x: 0, w: 136 };

// Supine, head and shoulders curled off the mat, legs long at 45 degrees, both
// arms straight and hovering beside the hips beating up and down. Must be
// visible: the small fast arm pump against a body that does not move, which is
// the whole exercise. Side view. The cycle is deliberately under a second and
// only the wrist pins differ between the two keyframes, so the legs and the
// curl are frozen and the arms are the only thing beating.
// Both pins sit on the arc of a STRAIGHT arm, 36.6 units from the shoulder. The
// pump in this exercise comes from the shoulder with a long arm; the top pin
// used to be 34.7 units out and folded the elbow to 41 degrees, so the beat
// read as a small bicep curl beside the hip rather than a long arm beating.
const THE_HUNDRED = {
  view: "side",
  loop: "pingpong",
  dur: 0.58,
  breath: 0.12,
  props: [MAT],
  keys: [
    { // bottom of the beat, hands almost brushing the mat past the hips
      t: 0,
      root: { x: 62, y: 108, rot: -90 },
      joints: { spine: 22, neck: 42, hipR: 225, hipL: 222, kneeR: 3, kneeL: 3,
                ankleR: -48, ankleL: -46 },
      ik: { wristR: { x: 68.0, y: 110.5, bend: 1 }, wristL: { x: 67.5, y: 111.8, bend: 1 } },
    },
    { // top of the beat. Same root as the bottom: the pump is the arms only, so
      // the body must not bob with them.
      t: 1,
      root: { x: 62, y: 108, rot: -90 },
      joints: { spine: 22, neck: 42, hipR: 225, hipL: 222, kneeR: 3, kneeL: 3,
                ankleR: -48, ankleL: -46 },
      ik: { wristR: { x: 71.1, y: 99.5, bend: 1 }, wristL: { x: 70.0, y: 101.5, bend: 1 } },
    },
  ],
};

// Supine curl held, both knees hugged into the chest, then both legs shoot long
// to 45 degrees while both arms sweep back past the ears. Must be visible: the
// body opening and closing at both ends at once, hands and feet travelling in
// opposite directions. Side view.
// The arms are the part that had to be re-authored. Two things were wrong. The
// open position pinned the hand 28 units from a 37 unit arm, so the frame the
// whole exercise is named for showed a bent elbow instead of a long reach; the
// hand now sits 36.5 out, which is the straight arm. And the sweep from the
// shins to overhead is a 160 degree arc, which two keyframes cannot carry: pins
// travel in a straight line, so the chord cut the elbow to 106 degrees halfway
// and the arms folded shut over the face mid rep. Five keys hold the wrists on
// an arc of roughly constant radius, and the worst fold is now the same as the
// hands-on-shins pose it starts from.
const DOUBLE_LEG_STRETCH = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  fit: { k: 0.9, dy: 4 },
  // the sweep carries both arms across the skull, and without this the head is
  // drawn over them and the reach reads as going behind the head
  armOverHead: true,
  props: [MAT],
  keys: [
    { // closed, knees to the chest, hands on the shins
      t: 0,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 288, hipL: 284, kneeR: 140, kneeL: 136,
                ankleR: -30, ankleL: -28 },
      ik: { wristR: { x: 74.1, y: 86.9, bend: 1 }, wristL: { x: 71.1, y: 89.9, bend: 1 } },
    },
    { // hands leaving the shins, knees starting to travel away
      t: 0.25,
      through: true,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 271, hipL: 268, kneeR: 90, kneeL: 87,
                ankleR: -35, ankleL: -33 },
      ik: { wristR: { x: 67.0, y: 72.6, bend: 1 }, wristL: { x: 65.8, y: 75.8, bend: 1 } },
    },
    { // mid, hands circling up past the chest as the legs lengthen
      t: 0.5,
      through: true,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 255, hipL: 252, kneeR: 40, kneeL: 38,
                ankleR: -40, ankleL: -38 },
      ik: { wristR: { x: 50.3, y: 62.5, bend: 1 }, wristL: { x: 49.1, y: 65.7, bend: 1 } },
    },
    { // hands passing the ears, legs nearly long
      t: 0.75,
      through: true,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 239, hipL: 236, kneeR: 22, kneeL: 21,
                ankleR: -44, ankleL: -42 },
      ik: { wristR: { x: 24.0, y: 66.9, bend: 1 }, wristL: { x: 22.8, y: 70.1, bend: 1 } },
    },
    { // open, legs long at 45, arms reaching back beside the ears
      t: 1,
      root: { x: 72, y: 108, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 223, hipL: 220, kneeR: 4, kneeL: 4,
                ankleR: -48, ankleL: -46 },
      ik: { wristR: { x: 7.9, y: 96.0, bend: 1 }, wristL: { x: 6.7, y: 99.2, bend: 1 } },
    },
  ],
};

// Supine curl held, one knee drawn into the chest with both hands on it while
// the other leg reaches long at 45, then the legs swap. Must be visible: the two
// legs doing opposite things at the same moment, which is what separates this
// from the double leg version. Side view.
// Two keyframes were not enough. Lerped straight across, both legs arrived at
// the SAME hip and knee angle halfway through the swap, so for a beat the
// figure had one leg: the exact frame where the scissor is supposed to read was
// the frame where it disappeared. The middle key gives the swap the rhythm the
// real exercise has, a quick change through the middle and a held moment at
// each end, which also keeps the two legs 36 degrees apart as they pass.
// The hands are pinned ON the shin of whichever knee is in, a little below the
// knee. They used to sit eight units above it, hugging nothing.
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
      root: { x: 68, y: 108, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 290, kneeR: 142, ankleR: -26,
                hipL: 222, kneeL: 4, ankleL: -46 },
      ik: { wristR: { x: 72.0, y: 89.3, bend: 1 }, wristL: { x: 68.7, y: 87.3, bend: 1 } },
    },
    { // through the swap, the leg going long already ahead of the one coming in
      t: 0.5,
      root: { x: 68, y: 108, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 238, kneeR: 30, ankleR: -42,
                hipL: 274, kneeL: 116, ankleL: -28 },
      ik: { wristR: { x: 69.9, y: 89.6, bend: 1 }, wristL: { x: 68.2, y: 88.6, bend: 1 } },
    },
    { // swapped, far knee in, near leg long
      t: 1,
      root: { x: 68, y: 108, rot: -90 },
      joints: { spine: 20, neck: 38, hipR: 222, kneeR: 4, ankleR: -46,
                hipL: 290, kneeL: 142, ankleL: -26 },
      ik: { wristR: { x: 67.7, y: 89.9, bend: 1 }, wristL: { x: 71.0, y: 91.9, bend: 1 } },
    },
  ],
};

// Flat on the back with the arms stretched overhead, then peel off the mat one
// vertebra at a time until the body is folded over straight legs, hands past the
// feet. Must be visible: the SEQUENCE, so the early frames are the chest curling
// off a pelvis that has not moved, not a straight body hinging at the hip.
// Side view, five keys.
// Three keys were not enough and the shape of the old middle one was the real
// bug. Its "half way" pose rotated the whole torso 58 degrees about a pelvis
// that stayed put and only gave the spine 30 degrees of flexion, so what played
// was a plank hinging up off the hip joint, and because the ease concentrates
// the travel in the middle of a segment the card went from flat to nearly
// upright in a tenth of a cycle. Now the first quarter of the cycle is spinal
// flexion ALONE, root.rot pinned at -90 so the pelvis cannot move while the
// chest peels, and the pelvis only starts to tip once the chest is already up.
// The spine carries its deepest C in the middle of the roll (42 degrees) and
// gives some of it back as the body arrives seated, which is the shape a roll-up
// actually passes through.
// The legs stay flat throughout, which is what `rot + hip = 91` holds: the thigh
// is drawn off the pelvis, so every degree the pelvis tips has to come back out
// of the hip or the heels lift off the mat.
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
      joints: { spine: 0, neck: 0, hipR: 181, hipL: 179.5, kneeR: 3, kneeL: 3,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 11.5, y: 106.5, bend: 1 }, wristL: { x: 11.4, y: 109.5, bend: 1 } },
    },
    { // head and chest peeled off the mat, pelvis flat and untouched, arms
      // coming off the mat to reach down the body
      t: 0.25,
      through: true,
      root: { x: 78, y: 106, rot: -90 },
      joints: { spine: 34, neck: 38, hipR: 181, hipL: 179.5, kneeR: 3, kneeL: 3,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 90.6, y: 90.8, bend: 1 }, wristL: { x: 88.7, y: 93.6, bend: 1 } },
    },
    { // the middle of the roll: deepest C curve, the pelvis only now tipping
      t: 0.5,
      through: true,
      root: { x: 78, y: 105, rot: -68 },
      joints: { spine: 42, neck: 34, hipR: 159, hipL: 157.5, kneeR: 3, kneeL: 3,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 100.7, y: 89.8, bend: 1 }, wristL: { x: 97.6, y: 91.3, bend: 1 } },
    },
    { // up over the sit bones, still round, hands over the shins
      t: 0.75,
      through: true,
      root: { x: 78, y: 106, rot: -28 },
      joints: { spine: 38, neck: 26, hipR: 119, hipL: 117.5, kneeR: 3, kneeL: 3,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 118.0, y: 92.2, bend: 1 }, wristL: { x: 114.6, y: 91.6, bend: 1 } },
    },
    { // folded over the legs in a C curve, hands reaching past the feet.
      // Deliberately short of a full fold: folded flat the torso covers the
      // thighs and the whole card turns into one blob.
      t: 1,
      root: { x: 78, y: 107, rot: 8 },
      joints: { spine: 27, neck: 16, hipR: 82, hipL: 80.5, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 130.0, y: 96.0, bend: 1 }, wristL: { x: 127.0, y: 94.5, bend: 1 } },
    },
  ],
};

// Supine curl with the hands behind the head, one knee pulled in while the other
// leg reaches long, and the opposite elbow driving across to that knee. Must be
// visible: the CHEST ROTATING toward the bent knee. That is the whole exercise
// and the only thing that separates this card from Single Leg Stretch, which has
// the same scissoring legs and the same curl.
// It was authored flat side on, and flat side on it failed that test: the twist
// was not drawn at all, the arms were pinned in the air above the skull because
// two bone IK cannot put a hand behind the head in a flat side view, and the
// result was Single Leg Stretch with antennae. The rig can draw rotation, so it
// does: `spineTwist` swings 68 degrees through the cycle and the camera sits at
// yaw 30 to see it, which is the same trade the Russian Twist makes.
// With the camera off the sagittal plane the arms come off angles rather than
// pins. `shoulderAbd` 42 puts the elbows out wide either side of the head where
// the exercise wants them, `shoulderRot` -90 turns the humerus so the forearms
// fold back MEDIALLY instead of out, and the hands land behind the skull. The
// elbows then sit about 47 units apart on screen, so the near one visibly
// travels across as the chest turns. 42 rather than 30 is the width that clears
// the skull: at 30 the near hand landed within four units of the head centre and
// was drawn straight over it, so for half the cycle the figure had no head. Pinning could not do this: a wrist pin is a
// screen point and cannot express an elbow going out to the side.
const CRISS_CROSS = {
  view: { yaw: 30, plane: "sagittal" },
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 0.95, dy: 2 },
  props: [MAT],
  keys: [
    { // far knee in, chest turned toward it, near elbow crossing to meet it
      t: 0,
      root: { x: 66, y: 108, rot: -90 },
      joints: { spine: 22, neck: 36, spineTwist: -34,
                shoulderR: 290, shoulderL: 290, shoulderAbdR: 42, shoulderAbdL: -42,
                shoulderRotR: -90, shoulderRotL: -90, elbowR: 120, elbowL: 120,
                hipL: 288, kneeL: 112, ankleL: -26,
                hipR: 220, kneeR: 4, ankleR: -46 },
    },
    { // swapped, near knee in, chest turned the other way, far elbow crossing
      t: 1,
      root: { x: 66, y: 108, rot: -90 },
      joints: { spine: 22, neck: 36, spineTwist: 34,
                shoulderR: 290, shoulderL: 290, shoulderAbdR: 42, shoulderAbdL: -42,
                shoulderRotR: -90, shoulderRotL: -90, elbowR: 120, elbowL: 120,
                hipR: 288, kneeR: 112, ankleR: -26,
                hipL: 220, kneeL: 4, ankleL: -46 },
    },
  ],
};

// From lying with the legs low, roll up to balance on the tail bone in a narrow
// V with the legs straight at 45 and the arms reaching along them toward the
// toes. Must be visible: the closed V, both halves of the body off the mat at
// the same time with only the pelvis touching. Side view.
// Every wrist pin sat inside the arm's reach, worst at the start where the hand
// was 27.7 units from a 37 unit shoulder and the arms lying overhead on the mat
// came out folded at 86 degrees. All six are back on the 36 unit arc, and the
// V's pair now aims at the toes rather than level, because "reach for the toes"
// is the cue and a level arm off a lifted shoulder points under them.
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
      root: { x: 70, y: 108, rot: -90 },
      joints: { spine: 4, neck: 6, hipR: 218, hipL: 215, kneeR: 4, kneeL: 4,
                ankleR: -46, ankleL: -44 },
      ik: { wristR: { x: 4.4, y: 107.0, bend: 1 }, wristL: { x: 4.1, y: 110.0, bend: 1 } },
    },
    { // arms swinging up past the ears on the way, the spine just starting to
      // peel. Without this key the wrist pins lerp in a straight line across a
      // 145 degree sweep and the chord passes eleven units from the shoulder,
      // which folds the elbow to 148 degrees in the middle of the roll.
      t: 0.25,
      through: true,
      root: { x: 70, y: 108, rot: -76 },
      joints: { spine: 5, neck: 10, hipR: 210, hipL: 207, kneeR: 4, kneeL: 4,
                ankleR: -46, ankleL: -44 },
      ik: { wristR: { x: 28.7, y: 63.2, bend: 1 }, wristL: { x: 27.6, y: 66.4, bend: 1 } },
    },
    { // half way up, arms swung past the ears, spine peeling off the mat
      t: 0.5,
      through: true,
      root: { x: 70, y: 108, rot: -62 },
      joints: { spine: 6, neck: 14, hipR: 202, hipL: 199, kneeR: 4, kneeL: 4,
                ankleR: -46, ankleL: -44 },
      ik: { wristR: { x: 73.6, y: 66.0, bend: 1 }, wristL: { x: 71.3, y: 68.4, bend: 1 } },
    },
    { // the V, balanced on the sacrum, fingers reaching for the toes
      t: 1,
      root: { x: 70, y: 108, rot: -34 },
      joints: { spine: 8, neck: 12, hipR: 170, hipL: 167, kneeR: 4, kneeL: 4,
                ankleR: -46, ankleL: -44 },
      ik: { wristR: { x: 92.1, y: 66.3, bend: 1 }, wristL: { x: 89.7, y: 69.3, bend: 1 } },
    },
  ],
};

// Supine with the legs at 90, take them overhead, then press the hips up so the
// body makes one long line from the shoulders through the hips to the toes.
// Must be visible: the legs actually going OVER the head, and the hips leaving
// the mat. Side view, deviating from the suggested front: the movement is
// entirely sagittal and front on it collapses to a figure standing on its head.
// The old middle key never took the legs overhead. It lifted the hips ten units
// and left the legs near vertical, so the whole cycle played as a supine straight
// leg raise with the back flat on the mat, which is a different and much easier
// exercise. The middle key is now the real roll-over pass: hips twenty units up,
// feet past the head.
// WHAT THIS STILL CANNOT DRAW, and it is a rig limit rather than a choice. A
// true jackknife stacks the hips over the shoulders, and the head then lies on
// the mat at about 90 degrees to the torso. The rig's neck stops at 55, which is
// the anatomically safe figure, so the steepest inversion whose head still
// reaches the mat is about rot -145. Past that the skull is driven through the
// mat, which is worse than a shallow line. So the torso finishes at 55 degrees
// rather than vertical and the legs carry the rest: they come up past the torso
// to the ceiling, which is why there are 31 degrees at the hip rather than the
// dead straight line the classical picture has.
// The weight is on the shoulder blades and the arms, which is the safety point
// of this exercise: the chest sits on the mat at y 104 with its own radius
// putting it on the surface, and the head rests BESIDE it, never under it.
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
    { // the pass: hips twenty units off the mat, feet carried past the head
      t: 0.45,
      through: true,
      root: { x: 80, y: 86, rot: -128 },
      joints: { spine: 0, neck: 38, hipR: 390, hipL: 388, kneeR: 6, kneeL: 6,
                ankleR: -40, ankleL: -38, shoulderR: 219, shoulderL: 222,
                elbowR: 10, elbowL: 10 },
    },
    { // the jackknife, hips high and the legs reaching for the ceiling off a
      // body carried on the shoulder blades
      t: 1,
      root: { x: 81.2, y: 79.4, rot: -145 },
      joints: { spine: 0, neck: 52, hipR: 321, hipL: 318, kneeR: 4, kneeL: 4,
                ankleR: -40, ankleL: -38, shoulderR: 236, shoulderL: 239,
                elbowR: 10, elbowL: 10 },
    },
  ],
};

// Supine with the knees bent and the feet flat, peel the hips up until the knee,
// hip and shoulder line up, then melt back down. Must be visible: the hips
// leaving the mat while the shoulders and the feet stay planted, and at the top
// ONE STRAIGHT RAMP from the shoulders through the hips to the knees. Side view,
// feet pinned so they stay put while the pelvis travels.
// The old top key put the pelvis at y 89, which is seven units above the line
// through the shoulder and the knee, so the shape peaked at the hip: that is the
// over-arched bridge every coach spends the set correcting, and it loads the
// lumbar spine rather than the glutes. The pelvis cannot simply be lowered,
// because the torso is a rigid link off the root and dropping the root drives
// the shoulders into the mat, so the fix is root.y 96 WITH rot -105: the
// shoulders stay on the mat at y 102 and the hip lands on the line, hipFlex -3
// instead of -31.
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
    { // hips up, weight through the shoulder blades and the feet, and the
      // shoulder, hip and knee on one line
      t: 1,
      root: { x: 62, y: 96, rot: -105 },
      joints: { spine: 0, neck: 14, shoulderR: 184, shoulderL: 187, elbowR: 4, elbowL: 4 },
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
//
// All three park the pelvis at y 106, not the 100 they were authored at. The
// figure lost weight between rig versions (chest radius 11.8 to 9.8, pelvis 9.9
// to 8.0) and at 100 the torso hung seven units clear of the mat with only the
// drooping bottom leg touching it, which reads as a body floating over its own
// shadow.

// Side lying with the knees bent and the heels together, the top knee opening
// away from the bottom one like a shell while the feet stay glued. Must be
// visible: the gap opening between the two knees with the feet still touching.
// Side view, see the note above.
// v2 tried this as hip EXTERNAL ROTATION with a three-quarter camera, on the
// grounds that swinging the thigh is a different exercise. That is not what the
// render showed: hipRot sweeps the SHIN, so what opened was the FOOT while the
// two knees stayed stacked, which is the opposite of the movement. It is back in
// the flat view with the opening in the in-plane hip.
// The compromise, stated once: the hip sits 10 units above the mat and a 52 unit
// leg has to fold into that gap, so two bone kinematics put the knee high, and a
// knee cannot travel at all while the ankle is held still. So the knee leads and
// the heel comes up about half as far, and what reads is the V opening between
// the two thighs.
const CLAMSHELL = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.22,
  fit: { k: 0.9, dy: 2 },
  props: [MAT],
  keys: [
    { // closed, knees stacked
      t: 0,
      root: { x: 70, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 227, kneeR: 116.5, ankleR: -10,
                hipL: 226.5, kneeL: 124, ankleL: -10 },
      ik: { wristR: { x: 78.0, y: 104.0, bend: 1 }, wristL: { x: 12.0, y: 108.0, bend: 1 } },
    },
    { // open, top knee lifted away, heels still together
      t: 1,
      root: { x: 70, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 250, kneeR: 122, ankleR: -10,
                hipL: 226.5, kneeL: 124, ankleL: -10 },
      ik: { wristR: { x: 78.0, y: 104.0, bend: 1 }, wristL: { x: 12.0, y: 108.0, bend: 1 } },
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
      root: { x: 70, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 178, kneeR: 4, ankleR: -54,
                hipL: 175.5, kneeL: 4, ankleL: -78 },
      ik: { wristR: { x: 80.0, y: 104.0, bend: 1 }, wristL: { x: 12.0, y: 108.0, bend: 1 } },
    },
    { // top leg lifted, bottom leg unmoved on the mat
      t: 1,
      root: { x: 70, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 214, kneeR: 4, ankleR: -54,
                hipL: 175.5, kneeL: 4, ankleL: -78 },
      ik: { wristR: { x: 80.0, y: 104.0, bend: 1 }, wristL: { x: 12.0, y: 108.0, bend: 1 } },
    },
  ],
};

// Side lying with the hands behind the head, the bottom leg anchored and the top
// leg swinging long past the body and back. Must be visible: a straight top leg
// travelling through a big arc while the torso stays still. Side view, see the
// note above, and the honest caveat: the real front-and-back kick happens in the
// sagittal plane, which is edge on here, so the swing is drawn in the plane we
// have. Two things keep it from reading as the leg lift above: the arc is twice
// as big, and the TOP arm folds behind the head with the elbow open, a triangle
// clear above the torso. Only the top one. The old version put both hands there,
// which drove the bottom hand three units under the mat and parked the top one
// close enough to the skull to merge with it at 160px; the bottom arm now lies
// long under the head like the other two side-lying moves.
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
      root: { x: 70, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 176, kneeR: 4, ankleR: -54,
                hipL: 175.5, kneeL: 4, ankleL: -78 },
      ik: { wristR: { x: 30.0, y: 84.0, bend: 1 }, wristL: { x: 12.0, y: 108.0, bend: 1 } },
    },
    { // kicked long past the body
      t: 1,
      root: { x: 70, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 248, kneeR: 4, ankleR: -54,
                hipL: 175.5, kneeL: 4, ankleL: -78 },
      ik: { wristR: { x: 30.0, y: 84.0, bend: 1 }, wristL: { x: 12.0, y: 108.0, bend: 1 } },
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
      through: true,
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
// The reaching arms were pinned 34.4 units from a 37 unit shoulder and so they
// carried 44 degrees of elbow through a move whose only cue is "reach long".
// Both pairs are on the 36.6 arc now, which also puts the fingers past the toes
// at the bottom instead of short of them.
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
      joints: { spine: 0, neck: -2, hipR: 87, hipL: 86, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 94.2, y: 79.1, bend: 1 }, wristL: { x: 90.5, y: 82.2, bend: 1 } },
    },
    { // curled forward, hands travelling past the feet
      t: 1,
      root: { x: 56, y: 107, rot: 8 },
      joints: { spine: 34, neck: 25, hipR: 79, hipL: 78, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 111.9, y: 98.4, bend: 1 }, wristL: { x: 107.3, y: 100.8, bend: 1 } },
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
  props: [MAT_LONG],
  keys: [
    { // down, the whole front of the body on the mat
      t: 0,
      root: { x: 66, y: 106, rot: 90 },
      joints: { spine: -4, neck: 0, shoulderR: 0, shoulderL: 3, elbowR: 4, elbowL: 5,
                hipR: -177, hipL: -179, kneeR: 4, kneeL: 4, ankleR: -78, ankleL: -78 },
    },
    { // lifted, one arc from the fingertips through the chest to the hips
      t: 1,
      root: { x: 66, y: 106, rot: 90 },
      joints: { spine: -36, neck: -10, shoulderR: 68, shoulderL: 71, elbowR: 8, elbowL: 9,
                hipR: -177, hipL: -179, kneeR: 4, kneeL: 4, ankleR: -78, ankleL: -78 },
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
// The reaching arm carried the same short pin as Spine Stretch Forward and is on
// the 36.6 arc now. The trailing pin at the fold was 37.07 out, past the arm's
// own length, so it was clamping rather than solving; it is inside reach.
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
      joints: { spine: 0, neck: 0, hipR: 87, hipL: 86, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 94.2, y: 79.1, bend: 1 }, wristL: { x: 27.0, y: 101.5, bend: 1 } },
    },
    { // sawing, near hand past the foot and far arm reaching back and up
      t: 1,
      root: { x: 56, y: 107, rot: 10 },
      joints: { spine: 32, neck: 20, hipR: 77, hipL: 76, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 110.4, y: 101.9, bend: 1 }, wristL: { x: 38.5, y: 85.7, bend: 1 } },
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
  props: [MAT_LONG],
  keys: [
    { // near arm up, far leg up
      t: 0,
      root: { x: 66, y: 106, rot: 90 },
      joints: { spine: -14, neck: -8, shoulderR: 42, shoulderL: 6, elbowR: 6, elbowL: 5,
                hipR: -174, hipL: -201, kneeR: 4, kneeL: 4, ankleR: -78, ankleL: -78 },
    },
    { // swapped: far arm up, near leg up
      t: 1,
      root: { x: 66, y: 106, rot: 90 },
      joints: { spine: -14, neck: -8, shoulderR: 6, shoulderL: 42, elbowR: 5, elbowL: 6,
                hipR: -201, hipL: -174, kneeR: 4, kneeL: 4, ankleR: -78, ankleL: -78 },
    },
  ],
};

// Hips held high off the mat on one planted foot while the free leg extends to
// the ceiling and kicks down and up. Must be visible: the hips STAYING up while
// only the free leg moves, which is what separates this from Bridge. Side view,
// planted foot pinned.
// The supporting side carries the same correction as Bridge: the old pose held
// the pelvis seven units above the shoulder-to-knee line, so the "held high"
// position was really a lumbar arch. It is the corrected ramp now, and the free
// leg swings from vertical down to the line of the body, which is where the
// classical kick finishes rather than at the floor.
const SHOULDER_BRIDGE = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.22,
  props: [MAT],
  keys: [
    { // free leg straight up
      t: 0,
      root: { x: 62, y: 96, rot: -105 },
      joints: { spine: 0, neck: 14, shoulderR: 184, shoulderL: 187, elbowR: 4, elbowL: 4,
                hipR: 286, kneeR: 4, ankleR: -44 },
      ik: { ankleL: { x: 89, y: 113.4, bend: -1 } },
    },
    { // free leg lowered into the line of the body, hips unmoved
      t: 1,
      root: { x: 62, y: 96, rot: -105 },
      joints: { spine: 0, neck: 14, shoulderR: 184, shoulderL: 187, elbowR: 4, elbowL: 4,
                hipR: 214, kneeR: 4, ankleR: -44 },
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
      through: true,
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
      through: true,
      root: { x: 64, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, shoulderR: 168, shoulderL: 171, elbowR: 4, elbowL: 4,
                hipR: 270, hipL: 268, kneeR: 3, kneeL: 3, ankleR: -48, ankleL: -46 },
    },
    { // carried over toward the chest, hips peeling off the mat. neck 8 is what
      // keeps the head flat ON the mat once the body tips to -98: at 24 the head
      // came up off it, and a corkscrew that lifts its head is loading the neck
      // instead of resting on it.
      t: 1,
      root: { x: 64, y: 101, rot: -98 },
      joints: { spine: 0, neck: 8, shoulderR: 184, shoulderL: 187, elbowR: 4, elbowL: 4, hipR: 331, hipL: 329, kneeR: 0, kneeL: 0, ankleR: -48, ankleL: -46 },
    },
  ],
};

// A flowing sequence: balanced in a V, roll back so the legs pass overhead, then
// come back up through the V and fold over the legs. Must be visible: three
// clearly different shapes in one cycle, because the boomerang is a sequence
// rather than a rep. Side view. The fourth keyframe exists because the rig lerps
// hip angles as plain numbers: rolling straight from legs-overhead to seated
// walks the legs down through the mat, so the V is authored on the way back too.
// v4: every one of the four keys was floating, the V balanced five units clear
// of the mat and the rolled back key nearly eight, so the whole sequence played
// above its own shadow. All four sit on the mat now.
// v5: the three reaching keys were still off the arm's own arc, two of them
// past it (38.0 and 37.6 units from a 37 unit shoulder, so the solver was
// clamping rather than solving) and the seated fold eleven units inside it, at
// 71 degrees of elbow. All three now aim at the TOES at 36.5 out, which is both
// the cue and the straight arm.
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
      root: { x: 70, y: 108, rot: -34 },
      joints: {  spine: 8, neck: 12, hipR: 170, hipL: 167, kneeR: 4, kneeL: 4,
                ankleR: -46, ankleL: -44 },
      ik: { wristR: { x: 92.1, y: 66.3, bend: 1 }, wristL: { x: 89.7, y: 69.3, bend: 1 } },
    },
    { // the pass: hips half up, legs vertical. Without it the lerp from the V
      // to the shoulders cuts the corner and the whole body leaves the mat.
      t: 0.21,
      root: { x: 73, y: 103, rot: -96 },
      joints: {  spine: 0, neck: 26, hipR: 292, hipL: 290, kneeR: 6, kneeL: 6,
                ankleR: -44, ankleL: -42 },
      ik: { wristR: { x: 96, y: 100, bend: 1 }, wristL: { x: 93, y: 102, bend: 1 } },
    },
    { // rolled back, legs passing over the head, arms long on the mat
      t: 0.42,
      root: { x: 76, y: 80, rot: -146 },
      joints: {  spine: 0, neck: 50, hipR: 418, hipL: 416, kneeR: 8, kneeL: 8,
                ankleR: -44, ankleL: -42 },
      ik: { wristR: { x: 100, y: 104, bend: 1 }, wristL: { x: 97, y: 106, bend: 1 } },
    },
    { // the same pass on the way back up, for the same reason
      t: 0.57,
      root: { x: 73, y: 103, rot: -96 },
      joints: {  spine: 0, neck: 26, hipR: 292, hipL: 290, kneeR: 6, kneeL: 6,
                ankleR: -44, ankleL: -42 },
      ik: { wristR: { x: 96, y: 100, bend: 1 }, wristL: { x: 93, y: 102, bend: 1 } },
    },
    { // back through the V on the way up
      t: 0.72,
      root: { x: 66, y: 107, rot: -45 },
      joints: {  spine: 6, neck: 16, hipR: 180, hipL: 177, kneeR: 4, kneeL: 4,
                ankleR: -44, ankleL: -42 },
      ik: { wristR: { x: 82.3, y: 68.3, bend: 1 }, wristL: { x: 80.1, y: 71.8, bend: 1 } },
    },
    { // up and folded over long legs
      t: 1,
      root: { x: 56, y: 107, rot: 8 },
      joints: {   spine: 29, neck: 18, hipR: 79, hipL: 78, kneeR: 2, kneeL: 2,
                ankleR: 4, ankleL: 4 },
      ik: { wristR: { x: 108.7, y: 99.2, bend: 1 }, wristL: { x: 105.7, y: 97.9, bend: 1 } },
    },
  ],
};

// Balanced on the shoulders with the legs split in the air, both hands holding
// the ankle of the leg reaching down past the head while the other leg points
// straight at the ceiling. Must be visible: the split, one leg down to the hands
// and one leg up, off a body held on the SHOULDERS with the head lying beside
// them on the mat and never under them.
// v4: only the LEFT wrist was pinned and the right arm was left on its default
// angles, so it stuck up into the air away from the body at every keyframe while
// the cue says both hands hold the ankle.
// v5: the hands still were not on the ankle. At the finish they sat fourteen
// units off it with 120 degrees of elbow, so the one thing this exercise is
// named for, the hold, was not drawn. The hands now pin ON the low ankle, and
// because that is a 167 degree sweep of the shoulder from beside the hip to
// behind the head, it takes four keys rather than three: the wrists ride an arc
// of constant 36.4 radius through the middle two, which keeps every interpolated
// chord at least 31 units from the shoulder and the elbow under 52 all the way
// round. With three keys the chord passed 21 units out and the arms folded shut
// mid roll.
// The low leg stops with its toe at y 107, eight units clear of the mat, rather
// than reaching the floor: taking it further needs hipFlex past 150, which is
// the validator's stop and is also about where a hamstring stops.
const CONTROL_BALANCE = {
  view: "side",
  loop: "pingpong",
  dur: 3.8,
  breath: 0.22,
  fit: { k: 0.84, dy: 6 },
  props: [MAT],
  keys: [
    { // flat, legs pointing at the ceiling, hands long beside the hips
      t: 0,
      root: { x: 76, y: 106, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 268, hipL: 266, kneeR: 4, kneeL: 4,
                ankleR: -44, ankleL: -42 },
      ik: { wristR: { x: 82.3, y: 101.8, bend: 1 }, wristL: { x: 82.3, y: 105.2, bend: 1 } },
    },
    { // hips peeling up, the low leg starting over, hands swinging up after it
      t: 0.35,
      root: { x: 76, y: 97.6, rot: -110 },
      joints: { spine: 0, neck: 24, hipR: 290, kneeR: 4, ankleR: -44,
                hipL: 320, kneeL: 5, ankleL: -36 },
      ik: { wristR: { x: 65.4, y: 74.7, bend: 1 }, wristL: { x: 66.6, y: 77.9, bend: 1 } },
    },
    { // up on the shoulders, the split opening, hands closing on the low ankle
      t: 0.7,
      root: { x: 76, y: 89.2, rot: -130 },
      joints: { spine: 0, neck: 40, hipR: 312, kneeR: 4, ankleR: -44,
                hipL: 392, kneeL: 6, ankleL: -30 },
      ik: { wristR: { x: 36.0, y: 74.5, bend: 1 }, wristL: { x: 38.2, y: 77.1, bend: 1 } },
    },
    { // the balance: split, both hands on the low ankle past the head
      t: 1,
      root: { x: 76, y: 80, rot: -146 },
      joints: { spine: 0, neck: 50, hipR: 330, kneeR: 4, ankleR: -44,
                hipL: 435, kneeL: 6, ankleL: -24 },
      ik: { wristR: { x: 28.2, y: 94.4, bend: 1 }, wristL: { x: 30.2, y: 96.4, bend: 1 } },
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
  "Control Balance": CONTROL_BALANCE,
};

/* Archived on Mo's call, 2026-09-17: Boomerang, Elbow Circles, Hip Circles,
   Inchworm Walkout and Archer Push-Up are unmapped rather than deleted. The
   poses above still build, so putting one back is restoring its one line in
   the table and its entry in the exercise library. */
