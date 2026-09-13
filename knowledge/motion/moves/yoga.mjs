// Yoga moves. Keys are the EXACT `name` from
// knowledge/exercise-library/yoga.mjs.
//
// Most poses are held, not repeated, so they use loop "hold": the cycle eases
// in and out of a settle while the breathing idle keeps the figure alive. A
// held pose with zero motion reads as a broken animation, not as a still. The
// two keyframes of a hold are nearly identical on purpose: sink a touch
// deeper, reach a touch longer, breathe. Cat-Cow, Bridge, Wheel and the
// flowing poses are the exceptions and use pingpong.
//
// Standing poses pin the feet to the floor at y 113.4 and move the pelvis, the
// same way a person does. Floor poses obey the root rule: rot > 0 is face
// down, rot < 0 is face up, and the head goes where upV(rot) points.

// Front view, because the whole shape of Warrior II is lateral: side on it
// collapses into one leg and one arm. The feet are authored explicitly, and
// BOTH of them are long. Warrior II is set up along the mat, not across it: the
// front foot points down the mat, which in this view is straight out to the
// side, and the back foot sits parallel to the back edge of the mat with the
// toes turned in a few degrees. Neither foot points at the camera. We had the
// front foot short and wide for a while, which is the Warrior I set-up, and it
// quietly turned the stance ninety degrees.
// Side Plank is the calisthenics one, authored once and shared.
import { SIDE_PLANK } from "./calisthenics.mjs";

const WARRIOR_II = {
  view: "front",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.8,
  farSide: "L",
  feet: { R: { ang: 86, len: 1.05, w: 0.95 }, L: { ang: 74, len: 1.0, w: 0.95 } },
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

// Standing dead straight, feet together, arms long beside the body, crown
// lifting. What must be visible is the single vertical line from the heels to
// the crown and the feet touching. Front view: there is nothing sagittal here,
// and the feet together only reads face on. Symmetric, so no farSide.
const MOUNTAIN_POSE = {
  view: "front",
  loop: "hold",
  dur: 6.4,
  breath: 1.0,
  breathRate: 0.75,
  feet: { R: { ang: 7, len: 0.42, w: 1.3 }, L: { ang: 7, len: 0.42, w: 1.3 } },
  keys: [
    { // settle, weight even, arms a hand's width off the thighs
      t: 0,
      root: { x: 70, y: 61.8, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 10, shoulderL: 10, elbowR: 4, elbowL: 4,
                wristR: -4, wristL: -4 },
      ik: { ankleR: { x: 73, y: 113.4, bend: -1 }, ankleL: { x: 67, y: 113.4, bend: -1 } },
    },
    { // lengthen: crown up, shoulders down, fingertips reaching to the floor
      t: 1,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: -1, neck: -1, shoulderR: 7, shoulderL: 7, elbowR: 1, elbowL: 1,
                wristR: -2, wristL: -2 },
      ik: { ankleR: { x: 73, y: 113.4, bend: -1 }, ankleL: { x: 67, y: 113.4, bend: -1 } },
    },
  ],
};

// Knees bent deep as if sitting into a chair, hips back, chest lifted and both
// arms reaching overhead in line with the torso. What must be visible is the
// knee bend with the hips travelling back. Deviating from the suggested front
// view to SIDE: front on, a knee bent 90 degrees in the sagittal plane is pure
// foreshortening and the pose reads as a short person with their arms up.
const CHAIR_POSE = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.94, dy: 4 },
  keys: [
    { // sit back, thighs on their way to parallel, arms alongside the ears
      t: 0,
      root: { x: 58, y: 78, rot: 0 },
      joints: { spine: 18, neck: -14, shoulderR: 138, shoulderL: 132, elbowR: 8, elbowL: 10,
                wristR: -6, wristL: -6 },
      ik: { ankleR: { x: 68, y: 113.4, bend: -1 }, ankleL: { x: 64, y: 113.4, bend: -1 } },
    },
    { // sink a touch lower and reach longer through the fingertips
      t: 1,
      root: { x: 56.5, y: 80.5, rot: 0 },
      joints: { spine: 20, neck: -16, shoulderR: 142, shoulderL: 136, elbowR: 2, elbowL: 4,
                wristR: -3, wristL: -3 },
      ik: { ankleR: { x: 68, y: 113.4, bend: -1 }, ankleL: { x: 64, y: 113.4, bend: -1 } },
    },
  ],
};

// A long lunge: front knee bent toward ninety over the ankle, back leg long and
// straight with the heel down, chest lifted and both arms straight overhead.
// What must be visible is the length of the lunge with a straight back leg and
// the arms up. Deviating from the suggested front view to SIDE: Warrior I's
// stance runs front to back, so face on it foreshortens away and what gets
// drawn instead is Warrior II with the arms up, which is another pose in this
// same library. The torso carries a few degrees of forward inclination because
// a straight back leg drawn side on is already at the end of what a hip
// extends to; side on the turned out back foot cannot be shown either, so it
// is drawn flat.
const WARRIOR_I = {
  view: "side",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.78,
  fit: { k: 0.9, dy: 4 },
  keys: [
    { // settle into the lunge, arms rising alongside the ears
      t: 0,
      root: { x: 58, y: 75.5, rot: 0 },
      joints: { spine: 14, neck: -26, hipL: -41, kneeL: 0, ankleL: 41,
                shoulderR: 152, shoulderL: 146, elbowR: 8, elbowL: 10,
                wristR: -4, wristL: -4 },
      ik: { ankleR: { x: 76, y: 113.4, bend: -1 } },
    },
    { // lift the ribs and reach taller through the fingers, back heel still down
      t: 1,
      root: { x: 58, y: 76, rot: 0 },
      joints: { spine: 15, neck: -28, hipL: -41.8, kneeL: 0, ankleL: 41.8,
                shoulderR: 155, shoulderL: 149, elbowR: 3, elbowL: 5,
                wristR: -2, wristL: -2 },
      ik: { ankleR: { x: 76, y: 113.4, bend: -1 } },
    },
  ],
};

// From a Warrior II stance the torso tips over the bent front leg: bottom hand
// to the floor outside the front foot, top arm reaching past the ear so the
// back heel, the hip and the top fingertips make one long diagonal. What must
// be visible is that diagonal, so this is the front view with the whole root
// rolled over: root.rot in the front view is a lateral lean. farSide is the
// bent front leg and the planted hand, which keeps the long reaching line in
// the bright tone where it belongs.
const EXTENDED_SIDE_ANGLE = {
  view: "front",
  loop: "hold",
  dur: 6.4,
  breath: 1.0,
  breathRate: 0.76,
  farSide: "L",
  fit: { k: 0.92, dy: 2 },
  // Same stance as Warrior II, so the same feet: front foot long down the mat,
  // back foot long along the back edge with the toes turned in a touch.
  feet: { R: { ang: 74, len: 1.0, w: 0.95 }, L: { ang: 86, len: 1.05, w: 0.95 } },
  keys: [
    { // settle over the front leg, hand down, top arm long over the ear
      t: 0,
      root: { x: 70, y: 84, rot: -57 },
      joints: { spine: 0, neck: 4, shoulderR: -74, shoulderL: 0, elbowR: 4, elbowL: 8,
                wristR: -4, wristL: 40 },
      ik: {
        wristL: { x: 24.0, y: 110.4, bend: 1 },
        ankleR: { x: 112, y: 113.4, bend: -1 }, ankleL: { x: 36, y: 113.4, bend: -1 },
      },
    },
    { // lengthen the side body: the top hand reaches further along the line
      t: 1,
      root: { x: 70.6, y: 84.6, rot: -59 },
      joints: { spine: 0, neck: 5, shoulderR: -74, shoulderL: 0, elbowR: 0, elbowL: 5,
                wristR: -2, wristL: 40 },
      ik: {
        wristL: { x: 23.4, y: 110.6, bend: 1 },
        ankleR: { x: 113, y: 113.4, bend: -1 }, ankleL: { x: 35.4, y: 113.4, bend: -1 },
      },
    },
  ],
};

// Wide stance, BOTH legs dead straight, the torso tipping sideways over the
// front leg with the bottom hand on the shin and the top arm straight up, so
// the body makes a triangle with the floor. What must be visible is the two
// straight legs and the vertical top arm, which is the difference between this
// and Extended Side Angle; front view, with the lean carried by root.rot.
const TRIANGLE_POSE = {
  view: "front",
  loop: "hold",
  dur: 6.4,
  breath: 1.0,
  breathRate: 0.76,
  farSide: "R",
  fit: { k: 0.88, dy: 6 },
  // Warrior II stance again: both feet long, back toes turned in a touch.
  feet: { R: { ang: 74, len: 1.0, w: 0.95 }, L: { ang: 86, len: 1.05, w: 0.95 } },
  keys: [
    { // settle: hand to the shin, top arm stacked over the shoulder
      t: 0,
      root: { x: 70, y: 72, rot: -38 },
      joints: { spine: 0, neck: 6, shoulderR: 218, shoulderL: 0, elbowR: 3, elbowL: 2,
                wristR: -4, wristL: 4 },
      ik: {
        wristL: { x: 35.6, y: 91.6, bend: 1 },
        ankleR: { x: 100, y: 113.4, bend: -1 }, ankleL: { x: 28, y: 113.4, bend: -1 },
      },
    },
    { // tip a degree further and lengthen through the top fingertips
      t: 1,
      root: { x: 70, y: 72.6, rot: -40 },
      joints: { spine: 0, neck: 7, shoulderR: 220, shoulderL: 0, elbowR: 0, elbowL: 1,
                wristR: -2, wristL: 4 },
      ik: {
        wristL: { x: 35.0, y: 93.7, bend: 1 },
        ankleR: { x: 100.5, y: 113.4, bend: -1 }, ankleL: { x: 27.5, y: 113.4, bend: -1 },
      },
    },
  ],
};

// Balanced on one straight leg with the torso and the lifted leg level, making
// a T, arms reaching forward past the ears. What must be visible is that
// horizontal line with the standing foot planted and the free foot clearly off
// the floor. Deviating from the suggested front view to SIDE: face on, a body
// pointing at the camera is a head and two hands and nothing else.
const WARRIOR_III = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.88, dy: 6 },
  keys: [
    { // level: standing leg vertical, lifted leg in line with the torso
      t: 0,
      root: { x: 60, y: 60.6, rot: 86 },
      joints: { spine: 0, neck: 34, hipL: -176, kneeL: 2, ankleL: -4,
                shoulderR: -4, shoulderL: -2, elbowR: 8, elbowL: 10 },
      ik: {
        ankleR: { x: 60, y: 113.4, bend: -1 },
        wristR: { x: 125.0, y: 52.8, bend: 1 }, wristL: { x: 125.0, y: 47.8, bend: 1 },
      },
    },
    { // lift the back leg a degree higher and reach longer through the hands
      t: 1,
      root: { x: 60, y: 60.2, rot: 86 },
      joints: { spine: 0, neck: 36, hipL: -180, kneeL: 1, ankleL: -2,
                shoulderR: -2, shoulderL: 0, elbowR: 3, elbowL: 5 },
      ik: {
        ankleR: { x: 60, y: 113.4, bend: -1 },
        wristR: { x: 125.5, y: 50.8, bend: 1 }, wristL: { x: 125.5, y: 45.8, bend: 1 },
      },
    },
  ],
};

// A long straight-legged stance with the torso folded flat over the front leg
// and twisted, so the OPPOSITE hand goes to the floor outside the front foot
// and the other arm lifts straight up off the back. Three quarter camera,
// because the stance and the fold are sagittal and the revolve is not.
// v2: the revolve is a spine twist. Without it this was a triangle pose with
// an arm in the air, which is the pose it is named against.
// v5: the bottom hand used to hang a foot off the floor at full arm stretch,
// so the settle could not move it and the pose read as reaching at nothing.
// With both legs straight the floor is simply out of reach from a stance this
// long, which is true of the pose in life as well, so the hand goes on a BLOCK,
// the same block Half Moon uses. The top arm also pointed backwards down the
// body rather than up; it is near vertical now, as far as the shoulder
// extension limit allows. `wristL` lays the mitt ALONG the block top.
const REVOLVED_TRIANGLE = {
  view: { yaw: 24, plane: "sagittal" },
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.76,
  fit: { k: 0.9, dy: 2 },
  props: [{ type: "box", x: 73, y: 97, w: 15 }],
  keys: [
    { // folded over the front leg, bottom hand flat on the block, top arm up
      t: 0,
      root: { x: 58, y: 72, rot: 56 },
      joints: { spineTwist: 46, spine: 16, neck: -24, shoulderR: 132, elbowR: 6, elbowL: 10,
                wristR: -6, wristL: 60 },
      ik: {
        wristL: { x: 81, y: 94, bend: 1 },
        ankleR: { x: 90, y: 113.4, bend: -1 }, ankleL: { x: 28, y: 113.4, bend: -1 },
      },
    },
    { // settle deeper into the fold and open the top shoulder further
      t: 1,
      root: { x: 58, y: 73, rot: 58 },
      joints: { spineTwist: 50, spine: 17, neck: -26, shoulderR: 134, elbowR: 2, elbowL: 8,
                wristR: -4, wristL: 60 },
      ik: {
        wristL: { x: 81, y: 94.4, bend: 1 },
        ankleR: { x: 90, y: 113.4, bend: -1 }, ankleL: { x: 28, y: 113.4, bend: -1 },
      },
    },
  ],
};

// Balanced on one straight leg with the other knee opened out to the side and
// that foot pressed into the inner thigh, arms lifting overhead like branches.
// What must be visible is the open knee with the sole on the standing thigh, so
// front view: side on the lifted knee points at the camera and disappears.
const TREE_POSE = {
  view: "front",
  loop: "hold",
  dur: 6.4,
  breath: 1.0,
  breathRate: 0.72,
  farSide: "L",
  fit: { k: 0.88, dy: 6 },
  feet: { R: { ang: 7, len: 0.42, w: 1.3 }, L: { ang: -17, len: 0.62, w: 1.0 } },
  keys: [
    { // find the balance, sole pressed into the inner thigh, arms up in a V
      t: 0,
      root: { x: 72, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, hipL: 35, kneeL: 134,
                shoulderR: 168, shoulderL: 168, elbowR: 8, elbowL: 8, wristR: 0, wristL: 0 },
      ik: { ankleR: { x: 78, y: 113.4, bend: -1 } },
    },
    { // press the foot in harder, open the knee wider, lengthen the arms
      t: 1,
      root: { x: 72, y: 61.2, rot: 0 },
      joints: { spine: -1, neck: -1, hipL: 38, kneeL: 138,
                shoulderR: 172, shoulderL: 172, elbowR: 3, elbowL: 3, wristR: 2, wristL: 2 },
      ik: { ankleR: { x: 78, y: 113.4, bend: -1 } },
    },
  ],
};

// Standing on one bent leg with the other thigh crossed over it and that foot
// hooked behind the calf, while the arms wrap at the elbows with the palms
// together in front of the face. What must be visible is limbs wrapped around
// limbs: the crossed thigh and the crossed forearms. Front view, because a
// wrap is a lateral relationship and side on the two legs sit on top of each
// other. The free shin is drawn hooking out past the standing shin rather than
// tucked behind it, which is the only way a wrap survives a flat projection.
// v2: eagle arms are two arms wrapped across the midline with the forearms
// turned, and eagle legs are one thigh crossed over the other. All four of
// those are v2 channels; before this the figure just stood there.
// v5: the wrist pins were sitting ABOVE the shoulders, which swung both elbows
// over the crown and put a knot of arm on top of the head. Eagle arms live in
// front of the STERNUM: pinned lower and with `bend: -1`, the elbows drop to
// chest height and cross, and the two mitts stack on the midline just under the
// chin, which is the shape a reader can copy.
const EAGLE_POSE = {
  view: "front",
  loop: "hold",
  dur: 6.4,
  breath: 1.0,
  breathRate: 0.8,
  farSide: "L",
  feet: { L: { ang: 8, len: 0.42, w: 1.3 }, R: { ang: -34, len: 0.62, w: 1.0 } },
  keys: [
    { // wrapped and settled, sitting into the standing knee
      t: 0,
      root: { x: 70, y: 65, rot: 0 },
      joints: { forearmPronR: 62, forearmPronL: 44, hipAbdR: -26, hipRotR: -22,
                spine: 2, neck: 0, wristR: -35, wristL: -15 },
      ik: {
        ankleL: { x: 68, y: 113.4, bend: -1 }, ankleR: { x: 58, y: 100, bend: -1 },
        wristR: { x: 68.5, y: 38.0, bend: -1 }, wristL: { x: 71.5, y: 35.0, bend: -1 },
      },
    },
    { // sink a little deeper into the standing leg and squeeze the wrap in
      t: 1,
      root: { x: 70, y: 67, rot: 0 },
      joints: { forearmPronR: 64, forearmPronL: 46, hipAbdR: -28, hipRotR: -24,
                spine: 3, neck: 1, wristR: -35, wristL: -15 },
      ik: {
        ankleL: { x: 68, y: 113.4, bend: -1 }, ankleR: { x: 57, y: 99, bend: -1 },
        wristR: { x: 68.5, y: 40.0, bend: -1 }, wristL: { x: 71.5, y: 37.0, bend: -1 },
      },
    },
  ],
};

// Balancing on one straight leg with the bottom hand on the floor ahead of it,
// the other leg lifted to hip height and level, and the top arm straight up, the
// whole body stacked in one plane. What must be visible is the lifted leg
// horizontal and clear of the floor with the standing leg straight. Front view,
// because half moon is a frontal plane pose and the lean is carried by rolling
// the root.
const HALF_MOON_POSE = {
  view: "front",
  loop: "hold",
  dur: 6.4,
  breath: 1.0,
  breathRate: 0.74,
  farSide: "L",
  fit: { k: 0.9, dy: 4 },
  feet: { R: { ang: 8, len: 0.4, w: 1.3 }, L: { ang: -70, len: 0.8, w: 1.0 } },
  // The block top sits where the hand can actually get to. It used to be at
  // 98, three units under a hand that was already at full arm stretch, so the
  // mitt hovered over it in the open grip instead of lying flat on it.
  props: [{ type: "box", x: 28, y: 92, w: 17 }],
  keys: [
    { // find the balance: bottom hand flat on the block, top leg level
      t: 0,
      root: { x: 74, y: 66.8, rot: -42 },
      joints: { spine: 0, neck: 8, shoulderR: -138, elbowR: 3, wristR: -2, wristL: 44 },
      ik: {
        wristL: { x: 39.0, y: 87.7, bend: 1 },
        ankleR: { x: 88, y: 113.4, bend: -1, tol: 1.0 }, ankleL: { x: 18, y: 71, bend: -1 },
      },
    },
    { // open a degree further and press the lifted heel away
      t: 1,
      root: { x: 74, y: 66.4, rot: -44 },
      joints: { spine: 0, neck: 9, shoulderR: -140, elbowR: 0, wristR: 0, wristL: 44 },
      ik: {
        wristL: { x: 38.9, y: 88.8, bend: 1 },
        ankleR: { x: 88, y: 113.4, bend: -1, tol: 1.0 }, ankleL: { x: 16, y: 69, bend: -1 },
      },
    },
  ],
};

// Standing on one leg, the other leg bent and lifted behind with that hand
// holding the foot, chest tipping forward and the free arm reaching out. What
// must be visible is the back foot held high behind by the hand. Side view, as
// suggested: the whole shape lives in the sagittal plane.
// v5: the back foot was barely above hip height and the torso stood upright, so
// the card read as a standing quad stretch. Tipping the chest forward is what
// buys the lift: the hip extension check measures torso to thigh, so every
// degree the chest goes down is a degree the back leg can go up. And the mitt
// now lies along the foot instead of ending in the air short of it.
const DANCERS_POSE = {
  view: "side",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.78,
  fit: { k: 0.86, dy: 6 },
  keys: [
    { // balanced, chest tipping forward, back foot held high, front arm long
      t: 0,
      root: { x: 58, y: 60.5, rot: 0 },
      joints: { spine: 40, neck: -46, hipL: -60, kneeL: 138, ankleL: -30,
                elbowL: 4, wristL: -70, wristR: -4 },
      ik: {
        ankleR: { x: 60, y: 113.4, bend: -1 },
        wristL: { x: 42, y: 47, bend: 1 }, wristR: { x: 112, y: 46, bend: 1 },
      },
    },
    { // kick the held foot a touch higher and lengthen the front arm
      t: 1,
      root: { x: 58, y: 60.5, rot: 0 },
      joints: { spine: 42, neck: -48, hipL: -62, kneeL: 141, ankleL: -30,
                elbowL: 2, wristL: -70, wristR: -2 },
      ik: {
        ankleR: { x: 60, y: 113.4, bend: -1 },
        wristL: { x: 41, y: 45, bend: 1 }, wristR: { x: 114, y: 44, bend: 1 },
      },
    },
  ],
};

// An arm balance: hands flat on the floor, knees resting high on the backs of
// the upper arms, the weight shifted forward until both feet float behind. What
// must be visible is the whole body carried on the hands with the feet off the
// floor. Side view, as suggested: the forward weight shift over the hands is
// the pose and it is entirely sagittal.
const CROW_POSE = {
  view: "side",
  loop: "hold",
  dur: 5.6,
  breath: 0.8,
  breathRate: 0.9,
  props: [{ type: "mat", x: 20, w: 104 }],
  keys: [
    { // balanced forward, hips high, shins tucked, toes lifted behind
      t: 0,
      root: { x: 49.3, y: 73.8, rot: 100 },
      joints: { spine: 0, neck: -46, hipR: -56, hipL: -54, kneeR: 138, kneeL: 140,
                ankleR: -30, ankleL: -30, wristR: 76, wristL: 76 },
      ik: { wristR: { x: 76, y: 113, bend: 1 }, wristL: { x: 72, y: 113, bend: 1 } },
    },
    { // press the floor away: the hips lift and the feet float a touch higher
      t: 1,
      root: { x: 48.3, y: 72.5, rot: 102 },
      joints: { spine: 0, neck: -48, hipR: -58, hipL: -56, kneeR: 140, kneeL: 142,
                ankleR: -32, ankleL: -32, wristR: 76, wristL: 76 },
      ik: { wristR: { x: 76, y: 113, bend: 1 }, wristL: { x: 72, y: 113, bend: 1 } },
    },
  ],
};

// The top of a push-up held: hands under the shoulders, one straight line from
// the heels through the hips to the head, ribs knitted. What must be visible is
// that single line with the hips neither sagging nor piked. Side view, as
// suggested. The hands are pinned so they stay welded to the floor while the
// body breathes.
const PLANK_POSE = {
  view: "side",
  loop: "hold",
  dur: 5.8,
  breath: 0.8,
  breathRate: 0.95,
  props: [{ type: "mat", x: 16, w: 112 }],
  keys: [
    { // settled into the line, shoulders stacked over the wrists
      t: 0,
      root: { x: 69.6, y: 87.2, rot: 76.5 },
      joints: { spine: 0, neck: -12, hipL: -146.5, hipR: -146.5, kneeL: 2, kneeR: 2,
                ankleL: -10, ankleR: -10, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 92, y: 114.6, bend: 1 } },
    },
    { // push the floor away and lengthen through the heels
      t: 1,
      root: { x: 69.2, y: 86.2, rot: 79.5 },
      joints: { spine: -1, neck: -12, hipL: -148.5, hipR: -148.5, kneeL: 1, kneeR: 1,
                ankleL: -12, ankleR: -12, wristL: 86, wristR: 86 },
      ik: { wristR: { x: 98, y: 114.6, bend: 1 }, wristL: { x: 92, y: 114.6, bend: 1 } },
    },
  ],
};

// Balanced on the sit bones with the legs lifted straight and the torso leaning
// back, arms reaching forward beside the shins, so the body makes a V. What
// must be visible is that V with nothing but the pelvis on the floor. Side
// view. Leaning back means the root rot is NEGATIVE: face up, head at -x.
const BOAT_POSE = {
  view: "side",
  loop: "hold",
  dur: 5.8,
  breath: 0.9,
  breathRate: 0.95,
  props: [{ type: "mat", x: 16, w: 112 }],
  keys: [
    { // the V: shins up, chest lifted, arms level beside the legs
      t: 0,
      root: { x: 58, y: 107, rot: -32 },
      joints: { spine: 0, neck: 6, hipR: 172, hipL: 170, kneeR: 2, kneeL: 3,
                ankleR: -50, ankleL: -50, wristR: -8, wristL: -8 },
      ik: { wristR: { x: 78.4, y: 81.4, bend: 1 }, wristL: { x: 76.4, y: 83.4, bend: 1 } },
    },
    { // lift the feet a touch higher and lengthen the chest away from the hips
      t: 1,
      root: { x: 58, y: 107, rot: -35 },
      joints: { spine: 0, neck: 6, hipR: 178, hipL: 176, kneeR: 1, kneeL: 2,
                ankleR: -50, ankleL: -50, wristR: -6, wristL: -6 },
      ik: { wristR: { x: 79.3, y: 79.5, bend: 1 }, wristL: { x: 77.3, y: 81.5, bend: 1 } },
    },
  ],
};

// Chair pose with a twist: knees deeply bent and together, the torso rotated so
// one elbow hooks outside the opposite thigh and the palms press together. What
// must be visible is the deep knee bend PLUS the rotation.
// v5: it was authored face on, and face on the knee bend that makes it a chair
// points straight at the camera and vanishes, exactly as the note on Chair Pose
// says. What was left read as somebody standing with their hands in their lap,
// and the arms drew a horizontal bar across the belly. Three quarters instead,
// which is the one camera that carries a squat AND an axial twist: the chair is
// authored sagittally like Chair Pose, the revolve is `spineTwist`, and the
// hands press together in front of the sternum where the twist carries them.
const REVOLVED_CHAIR_POSE = {
  view: { yaw: 36, plane: "sagittal" },
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.94, dy: 4 },
  keys: [
    { // sat low, palms pressed together, the low elbow hooked across the thigh
      t: 0,
      root: { x: 58, y: 80, rot: 0 },
      joints: { spine: 20, neck: -4, spineTwist: 44, wristR: 8, wristL: 8 },
      ik: {
        ankleR: { x: 68, y: 113.4, bend: -1 }, ankleL: { x: 64, y: 113.4, bend: -1 },
        wristR: { rel: "chest", x: 9, y: 5, bend: 1 },
        wristL: { rel: "chest", x: 22, y: 7, bend: 1 },
      },
    },
    { // deepen the twist and sit a touch lower
      t: 1,
      root: { x: 57, y: 82, rot: 0 },
      joints: { spine: 21, neck: -5, spineTwist: 48, wristR: 8, wristL: 8 },
      ik: {
        ankleR: { x: 68, y: 113.4, bend: -1 }, ankleL: { x: 64, y: 113.4, bend: -1 },
        wristR: { rel: "chest", x: 9, y: 5, bend: 1 },
        wristL: { rel: "chest", x: 22, y: 7, bend: 1 },
      },
    },
  ],
};

// An arm balance: hands flat on the floor under the hips, both legs threaded
// over the upper arms and lifted straight out in front, the whole body hovering
// clear of the floor. What must be visible is the straight legs out front with
// the seat floating above the hands. Side view, as suggested.
// v5: it was drawn with the seat at 106, which on this body is the seat ON the
// floor, and the arms tucked behind the torso where nothing could see them. A
// figure sitting on the mat with its legs up is Boat Pose, which is four cards
// away in the same library. The torso now reclines 45 degrees so the shoulders
// come down inside arm's reach of the floor, the pelvis rides eight units clear
// of the mat, and the arms run down in front of the torso to two flat hands
// between the shoulders and the hips, which is where they are in the pose.
const FIREFLY_POSE = {
  view: "side",
  loop: "hold",
  dur: 5.6,
  breath: 0.8,
  breathRate: 0.95,
  fit: { k: 0.94, dy: 2 },
  props: [{ type: "mat", x: 14, w: 114 }],
  keys: [
    { // hovering, seat clear of the mat, legs long out front over the arms
      t: 0,
      root: { x: 58, y: 92, rot: -60 },
      joints: { spine: 0, neck: 50, hipR: 176, hipL: 173, kneeR: 2, kneeL: 3,
                ankleR: -40, ankleL: -40, wristR: 64, wristL: 64 },
      ik: { wristR: { x: 39, y: 113, bend: 1 }, wristL: { x: 35, y: 113, bend: 1 } },
    },
    { // press the floor harder: the hips lift and the heels reach higher
      t: 1,
      root: { x: 58, y: 90.8, rot: -61 },
      joints: { spine: 0, neck: 51, hipR: 179, hipL: 176, kneeR: 1, kneeL: 2,
                ankleR: -42, ankleL: -42, wristR: 64, wristL: 64 },
      ik: { wristR: { x: 39, y: 113, bend: 1 }, wristL: { x: 35, y: 113, bend: 1 } },
    },
  ],
};

// Lying face down with the hands under the shoulders, the chest peeled off the
// floor by the back while the hips, legs and feet stay down and the elbows stay
// bent. What must be visible is the lifted chest with the hips still on the
// floor, which is the whole difference between this and Upward-Facing Dog.
// Side view, and prone means root rot is POSITIVE.
const COBRA_POSE = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.85,
  props: [{ type: "mat", x: 14, w: 114 }],
  keys: [
    { // settled: chest lifted, elbows bent, hips heavy on the mat
      t: 0,
      root: { x: 76, y: 108.5, rot: 90 },
      joints: { spine: -30, neck: -16, hipR: -180, hipL: -178, kneeR: 4, kneeL: 5,
                ankleR: -50, ankleL: -50, wristR: 84, wristL: 84 },
      ik: { wristR: { x: 96, y: 113, bend: 1 }, wristL: { x: 92, y: 113, bend: 1 } },
    },
    { // draw the chest a touch higher and longer without pushing the hips up
      t: 1,
      root: { x: 76, y: 108.5, rot: 90 },
      joints: { spine: -34, neck: -20, hipR: -178, hipL: -176, kneeR: 4, kneeL: 5,
                ankleR: -50, ankleL: -50, wristR: 84, wristL: 84 },
      ik: { wristR: { x: 96, y: 113, bend: 1 }, wristL: { x: 92, y: 113, bend: 1 } },
    },
  ],
};

// The same shape as Cobra pushed all the way up: arms straight, hips and knees
// lifted clear of the floor, only the hands and the tops of the feet touching,
// chest open and shoulders back. What must be visible is the straight arms and
// the gap under the thighs. Side view, prone, so root rot is positive.
const UPWARD_FACING_DOG = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.85,
  props: [{ type: "mat", x: 14, w: 114 }],
  keys: [
    { // pressed up, thighs off the mat, shoulders stacked over the wrists
      t: 0,
      root: { x: 72, y: 92, rot: 98 },
      joints: { spine: -35, neck: -18, hipR: -173.0, hipL: -171.0, kneeR: 3, kneeL: 4,
                ankleR: -42, ankleL: -42, wristR: 84, wristL: 84 },
      ik: { wristR: { x: 96, y: 113, bend: 1 }, wristL: { x: 92, y: 113, bend: 1 } },
    },
    { // press the floor further away and draw the chest through the arms
      t: 1,
      root: { x: 71, y: 90.5, rot: 105 },
      joints: { spine: -39, neck: -22, hipR: -179.0, hipL: -177.0, kneeR: 2, kneeL: 3,
                ankleR: -44, ankleL: -44, wristR: 84, wristL: 84 },
      ik: { wristR: { x: 96, y: 113, bend: 1 }, wristL: { x: 92, y: 113, bend: 1 } },
    },
  ],
};

// Lying on the back with the knees bent and the feet flat, the hips press up
// until the thighs and the torso make one line, the shoulders and arms staying
// on the floor. What must be visible is the hips travelling up and down, so
// this one is a pingpong rather than a hold. Supine, so root rot is NEGATIVE
// and the head sits at -x with the feet out at +x.
// v3: the wrist pins here were authored where no arm on this body could
// reach, in v2 as well, so the arm stretched for them and put the elbow
// through the floor. Unpinned, the arms hung where the angles put them, which
// was a full arm's length PAST the head at the bottom and waving in the air at
// the top. v5 pins them where a bridge actually puts them: flat on the mat
// beside the hips, the same two points at both ends of the rep, because the
// shoulders barely move while the hips travel.
const BRIDGE_POSE = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.2,
  props: [{ type: "mat", x: 12, w: 116 }],
  keys: [
    { // start: back flat on the mat, feet planted close to the seat
      t: 0,
      root: { x: 76.5, y: 107.1, rot: -90 },
      joints: { spine: 0, neck: 0, wristR: -30, wristL: -30 },
      ik: {
        ankleR: { x: 96, y: 113.4, bend: -1 }, ankleL: { x: 92, y: 113.4, bend: -1 },
        wristR: { x: 82, y: 111.8, bend: 1 }, wristL: { x: 81, y: 112.8, bend: 1 },
      },
    },
    { // top: hips up to knee height, one line from the knees to the shoulders,
      // shoulders and head still on the mat
      t: 1,
      root: { x: 73.6, y: 90.9, rot: -120 },
      joints: { spine: 0, neck: 25, wristR: -30, wristL: -30 },
      ik: {
        ankleR: { x: 96, y: 113.4, bend: -1 }, ankleL: { x: 92, y: 113.4, bend: -1 },
        wristR: { x: 82, y: 111.8, bend: 1 }, wristL: { x: 81, y: 112.8, bend: 1 },
      },
    },
  ],
};

// From lying on the back with the hands planted by the ears, the whole body
// presses up into an arch on the hands and feet with the head hanging. What
// must be visible is the press itself, so this is a pingpong from the set-up to
// the arch. The top is as deep an arch as the figure's joints allow, and that
// is now literally true: a search over the root position and the foot placement
// found 31 units of hip lift as the most that keeps the torso-to-thigh angle
// inside the -35 hip extension limit and the shoulder inside its own, and this is that pose. A full wheel needs
// more than the rig will draw, because the validator measures torso to thigh
// and so charges the whole backbend, spine included, to the hip. It reads as a
// strong press rather than a competition backbend.
const WHEEL_POSE = {
  view: "side",
  loop: "pingpong",
  dur: 3.6,
  breath: 0.25,
  // A body on the floor only ever uses the bottom third of the box, so zoom in
  // on it: at 140 units the arch was a thumbnail with an empty sky over it.
  fit: { k: 1.25, dx: 15, dy: -31 },
  props: [{ type: "mat", x: 12, w: 116 }],
  keys: [
    { // set-up: on the back, hands by the ears, knees bent, feet flat
      t: 0,
      root: { x: 66, y: 106, rot: -90 },
      joints: { spine: 0, neck: -4, wristR: 70, wristL: 70 },
      ik: {
        ankleR: { x: 86, y: 113.4, bend: -1 }, ankleL: { x: 82, y: 113.4, bend: -1 },
        wristR: { x: 28, y: 113, bend: 1 }, wristL: { x: 32, y: 113, bend: 1 },
      },
    },
    { // pressed up into the arch: hips are the high point, head hanging back.
      // Pushed as far as the joint checks allow, which is a long way past where
      // this sat before: the limit that stops it is hip extension, so the hips
      // are the high point and the shoulders stay under the hands.
      t: 1,
      root: { x: 62, y: 82.5, rot: -108 },
      joints: { spine: 0, neck: -12, wristR: 58, wristL: 58 },
      ik: {
        ankleR: { x: 86, y: 113.4, bend: -1 }, ankleL: { x: 82, y: 113.4, bend: -1 },
        wristR: { x: 24, y: 113, bend: 1 }, wristL: { x: 28, y: 113, bend: 1 },
      },
    },
  ],
};

// Kneeling upright with the hips pressing forward over the knees, the chest
// opening and the head dropping back while both hands take hold of the heels.
// What must be visible is the arch through the front of the body with the
// thighs vertical. Side view.
// v5: the hands used to stop about seven units short of the heels and hang in
// the air, which on a held pose reads as unfinished. Deepening the arch is what
// closes the gap, because the more the chest opens the LOWER the shoulder
// travels, and the hands come with it; spine -38 is as far as the hip extension
// check allows before the thighs stop reading as vertical.
const CAMEL_POSE = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.85,
  props: [{ type: "mat", x: 16, w: 112 }],
  keys: [
    { // settled into the arch, hips over the knees, hands on the heels
      t: 0,
      root: { x: 56, y: 84, rot: 0 },
      joints: { spine: -38, neck: -32, hipR: 6, hipL: 7, kneeR: 99, kneeL: 100,
                ankleR: -50, ankleL: -50, wristR: 14, wristL: 14 },
      ik: { wristR: { x: 38, y: 96.4, bend: 1 }, wristL: { x: 35, y: 97.9, bend: 1 } },
    },
    { // press the hips a touch further forward and open the chest more
      t: 1,
      root: { x: 57, y: 84, rot: 0 },
      joints: { spine: -39, neck: -34, hipR: 7, hipL: 8, kneeR: 100, kneeL: 101,
                ankleR: -50, ankleL: -50, wristR: 14, wristL: 14 },
      ik: { wristR: { x: 39, y: 96.8, bend: 1 }, wristL: { x: 36, y: 98.3, bend: 1 } },
    },
  ],
};

// One leg folded in front, the back knee down with that shin lifted and the
// foot caught by the hand, chest lifted into a backbend while the free arm
// reaches overhead. What must be visible is the back foot lifted and HELD.
// Side view. The full pose takes the foot behind the head; that needs more hip
// extension than the figure has, so the catch is drawn low, which is also how
// the pose is entered.
// v5: neither hand used to be on anything. One floated over the front shin and
// the other hung eight units under the back foot, so the picture was a kneeling
// figure with two loose arms. The back hand now takes the foot and the front
// arm goes up, which is a reach rather than a miss.
const KING_PIGEON_POSE = {
  view: "side",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.8,
  props: [{ type: "mat", x: 14, w: 114 }],
  keys: [
    { // settled: back shin lifted, hand holding the foot, free arm overhead
      t: 0,
      root: { x: 58, y: 88, rot: 0 },
      joints: { spine: -10, neck: -26, hipR: 79, kneeR: 139, ankleR: -50,
                hipL: -22, kneeL: 141, ankleL: -30,
                shoulderR: 168, elbowR: 6, wristR: -8, wristL: -50 },
      ik: { wristL: { x: 37, y: 87, bend: 1 } },
    },
    { // draw the foot in closer and lift the chest a degree further
      t: 1,
      root: { x: 58, y: 88, rot: 0 },
      joints: { spine: -12, neck: -28, hipR: 79, kneeR: 139, ankleR: -50,
                hipL: -22, kneeL: 145, ankleL: -30,
                shoulderR: 171, elbowR: 2, wristR: -6, wristL: -50 },
      ik: { wristL: { x: 36.4, y: 86.2, bend: 1 } },
    },
  ],
};

// An inverted V: hands and feet on the floor, hips pushed high and back, arms
// and spine in one long line, legs straight with the heels reaching down. What
// must be visible is the inverted V with the hips as the highest point. Side
// view, and the root is tipped face down.
const DOWNWARD_FACING_DOG = {
  view: "side",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.8,
  props: [{ type: "mat", x: 14, w: 114 }],
  keys: [
    { // settled: hips high, arms and back one line, heels down
      t: 0,
      root: { x: 56, y: 66, rot: 127 },
      joints: { spine: 0, neck: -8, wristR: 40, wristL: 40 },
      ik: {
        wristR: { x: 96, y: 113, bend: 1 }, wristL: { x: 92, y: 113, bend: 1 },
        ankleR: { x: 34.6, y: 113.4, bend: -1 }, ankleL: { x: 30.6, y: 113.4, bend: -1 },
      },
    },
    { // lift the hips a touch higher and press the heels further down
      t: 1,
      root: { x: 55, y: 63.5, rot: 129 },
      joints: { spine: 0, neck: -8, wristR: 40, wristL: 40 },
      ik: {
        wristR: { x: 96, y: 113, bend: 1 }, wristL: { x: 92, y: 113, bend: 1 },
        ankleR: { x: 33.6, y: 113.4, bend: -1 }, ankleL: { x: 29.6, y: 113.4, bend: -1 },
      },
    },
  ],
};

// Standing and folded at the hips with the legs straight, the spine hanging
// down and the hands flat on the floor beside the feet. What must be visible is
// the hinge at the hip with straight legs and the head hanging low. Side view.
// v5: the hands used to end up an inch UNDER the floor line, and the head sat
// right on top of them. Both mitts are flat on the floor now and the crown is
// tucked a little further so it hangs behind the hands rather than between
// them. The head still hangs out ahead of the feet and cannot be brought back:
// with the torso-to-thigh check capped at 150 this is the deepest fold the rig
// will draw, and every arrangement that puts the crown over the ankles either
// bends the knees past a straight leg or fails that check. See RIG ISSUES.
const FORWARD_FOLD = {
  view: "side",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.8,
  keys: [
    { // folded, hands flat under the shoulders, crown tucked and heavy
      t: 0,
      root: { x: 72, y: 63, rot: 90 },
      joints: { spine: 58, neck: 16, wristR: 36, wristL: 36 },
      ik: {
        wristR: { x: 88, y: 112.6, bend: 1 }, wristL: { x: 84, y: 112.3, bend: 1 },
        ankleR: { x: 60, y: 113.4, bend: -1 }, ankleL: { x: 56, y: 113.4, bend: -1 },
      },
    },
    { // soften a degree deeper: the crown drops and the elbows fold further
      t: 1,
      root: { x: 72, y: 62.6, rot: 90.5 },
      joints: { spine: 59, neck: 18, wristR: 36, wristL: 36 },
      ik: {
        wristR: { x: 89, y: 112.8, bend: 1 }, wristL: { x: 85, y: 112.5, bend: 1 },
        ankleR: { x: 60, y: 113.4, bend: -1 }, ankleL: { x: 56, y: 113.4, bend: -1 },
      },
    },
  ],
};

// A long lunge with the BACK KNEE DOWN on the floor, the front knee stacked
// over the ankle and the arms sweeping overhead. What must be visible is the
// back knee resting on the floor, which is the whole difference between this
// and Warrior I. Side view, sagittal.
const LOW_LUNGE = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.8,
  fit: { k: 0.9, dy: 4 },
  props: [{ type: "mat", x: 10, w: 118 }],
  keys: [
    { // settled, back knee down, hips sinking, arms overhead
      t: 0,
      root: { x: 58, y: 88, rot: 0 },
      joints: { spine: 8, neck: -18, hipL: -20, kneeL: 75, ankleL: -50,
                shoulderR: 164, shoulderL: 158, elbowR: 8, elbowL: 10,
                wristR: -4, wristL: -4 },
      ik: { ankleR: { x: 86, y: 113.4, bend: -1 } },
    },
    { // sink the hips a touch further forward and reach taller
      t: 1,
      root: { x: 59, y: 89, rot: 0 },
      joints: { spine: 7, neck: -20, hipL: -22, kneeL: 77, ankleL: -50,
                shoulderR: 167, shoulderL: 161, elbowR: 3, elbowL: 5,
                wristR: -2, wristL: -2 },
      ik: { ankleR: { x: 86, y: 113.4, bend: -1 } },
    },
  ],
};

// Sitting tall with the soles of the feet pressed together and the knees
// dropped out wide, hands holding the feet. What must be visible is the two
// knees opening out to the sides, which only exists face on, so front view as
// suggested. Symmetric, so no farSide. The feet are drawn short and turned in
// so the soles meet at the midline.
const BUTTERFLY_POSE = {
  view: "front",
  loop: "hold",
  dur: 6.4,
  breath: 1.0,
  breathRate: 0.75,
  feet: { R: { ang: -90, len: 0.55, w: 1.15 }, L: { ang: -90, len: 0.55, w: 1.15 } },
  props: [{ type: "mat", x: 16, w: 112 }],
  keys: [
    { // settled, spine long, knees heavy toward the floor
      t: 0,
      root: { x: 70, y: 100, rot: 0 },
      joints: { spine: 0, neck: 0, hipR: 66, hipL: 66, kneeR: 151, kneeL: 151,
                wristR: 8, wristL: 8 },
      ik: { wristR: { x: 73.0, y: 103.0, bend: 1 }, wristL: { x: 67.0, y: 103.0, bend: 1 } },
    },
    { // lengthen up through the crown and let the knees settle a touch wider
      t: 1,
      root: { x: 70, y: 99.4, rot: 0 },
      joints: { spine: -1, neck: -1, hipR: 69, hipL: 69, kneeR: 153, kneeL: 153,
                wristR: 8, wristL: 8 },
      ik: { wristR: { x: 72.9, y: 102.0, bend: 1 }, wristL: { x: 66.9, y: 102.0, bend: 1 } },
    },
  ],
};

// The front leg folded on the floor with the shin across the body, the back leg
// stretched straight behind, the chest coming forward over the front shin. What
// must be visible is the long back leg on the floor with the front leg folded
// under the hip. Side view. The torso carries a real forward fold, because the
// figure cannot keep an upright chest over a leg stretched that far behind.
const PIGEON_POSE = {
  view: "side",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.78,
  fit: { k: 0.92, dy: 2 },
  props: [{ type: "mat", x: 10, w: 118 }],
  keys: [
    { // settled over the front leg, back leg long
      t: 0,
      root: { x: 74, y: 103, rot: 0 },
      joints: { spine: 42, neck: 16, hipR: 100, kneeR: 150, ankleR: 46,
                hipL: -75, kneeL: 20, ankleL: -50, wristR: 20, wristL: 20 },
      ik: { wristR: { x: 104, y: 112.4, bend: 1 }, wristL: { x: 100, y: 113.0, bend: 1 } },
    },
    { // breathe into the hip and let the chest travel a touch lower
      t: 1,
      root: { x: 74, y: 103, rot: 0 },
      joints: { spine: 45, neck: 18, hipR: 100, kneeR: 150, ankleR: 46,
                hipL: -75, kneeL: 20, ankleL: -50, wristR: 20, wristL: 20 },
      ik: { wristR: { x: 105, y: 112.6, bend: 1 }, wristL: { x: 101, y: 113.2, bend: 1 } },
    },
  ],
};

// A very deep lunge with the front foot outside the hands, both hands planted
// on the floor and the back leg long with the knee lifted and the toes tucked.
// What must be visible is the hands on the floor beside the front foot with the
// back leg straight, which is what separates it from Low Lunge. Side view.
const LIZARD_POSE = {
  view: "side",
  loop: "hold",
  dur: 6.0,
  breath: 1.0,
  breathRate: 0.82,
  fit: { k: 0.92, dy: 2 },
  props: [{ type: "mat", x: 10, w: 118 }],
  keys: [
    { // settled low, hands flat on the mat inside the front foot, back knee up
      t: 0,
      root: { x: 66, y: 95, rot: 0 },
      joints: { spine: 46, neck: -6, hipL: -78, kneeL: 2, ankleL: -20,
                wristR: 44, wristL: 44, shoulderGirdleElevR: -4, shoulderGirdleElevL: -4 },
      ik: {
        ankleR: { x: 106, y: 113.4, bend: -1 },
        wristR: { x: 97, y: 113.0, bend: 1 }, wristL: { x: 93.5, y: 112.6, bend: 1 },
      },
    },
    { // melt the hips a touch lower and press the back heel further away
      t: 1,
      root: { x: 66, y: 95.8, rot: 0 },
      joints: { spine: 47, neck: -8, hipL: -79, kneeL: 2, ankleL: -20,
                wristR: 44, wristL: 44, shoulderGirdleElevR: -4, shoulderGirdleElevL: -4 },
      ik: {
        ankleR: { x: 106, y: 113.4, bend: -1 },
        wristR: { x: 97, y: 113.0, bend: 1 }, wristL: { x: 93.5, y: 112.6, bend: 1 },
      },
    },
  ],
};

// Both legs straight along the floor in opposite directions, front heel and
// back thigh down, hips square, both arms reaching long out of the waist. What
// must be visible is the two legs in one straight line on the floor. Side view.
// The chest still carries a forward incline, because the validator charges the
// whole backbend to the back hip and 35 degrees of extension is all it allows,
// so an upright torso over a leg stretched this far back is not available.
// v5: the arms used to press into the floor either side of the front shin,
// which with a torso already folded to the horizontal left the whole figure
// lying flat and reading as somebody face down on a mat. The arms reach out of
// the waist in line with the torso instead, which turns the pose into one long
// diagonal from the back foot to the fingertips and gets the mass off the
// floor without moving a single joint that the checks control.
const SPLITS = {
  view: "side",
  loop: "hold",
  dur: 6.4,
  breath: 1.0,
  breathRate: 0.76,
  fit: { k: 0.78, dy: 8 },
  props: [{ type: "mat", x: 6, w: 126 }],
  keys: [
    { // settled into the length, arms long in line with the torso
      t: 0,
      root: { x: 64, y: 107, rot: 0 },
      joints: { spine: 54, neck: -20, hipR: 86, kneeR: 2, ankleR: 20,
                hipL: -86, kneeL: 2, ankleL: -58,
                shoulderR: 66, shoulderL: 62, elbowR: 6, elbowL: 8,
                wristR: -4, wristL: -4 },
    },
    { // slide a fraction further and reach longer through the fingertips
      t: 1,
      root: { x: 64, y: 107.4, rot: 0 },
      joints: { spine: 55, neck: -22, hipR: 87, kneeR: 2, ankleR: 20,
                hipL: -87, kneeL: 2, ankleL: -58,
                shoulderR: 72, shoulderL: 68, elbowR: 0, elbowL: 2,
                wristR: -2, wristL: -2 },
    },
  ],
};

// Kneeling with the seat back on the heels, the torso folded down over the
// thighs and both arms stretched forward on the floor. What must be visible is
// the seat sitting back on the heels with the forehead low. Side view, and the
// root is tipped face down.
// v5: the forehead used to hover a full head's height above the mat and the
// seat a hand above the heels, so the pose read as a kneeling hover rather than
// a rest. The pelvis drops as far as the knee will go without leaving the mat
// and the neck tucks the crown down the rest of the way. It cannot fold further
// at the hip: 146 degrees is already almost all of the 150 the checks allow.
const CHILDS_POSE = {
  view: "side",
  loop: "hold",
  dur: 6.6,
  breath: 1.0,
  breathRate: 0.66,
  props: [{ type: "mat", x: 10, w: 118 }],
  keys: [
    { // settled, hips back toward the heels, forehead down, arms long
      t: 0,
      root: { x: 30, y: 97.2, rot: 61 },
      joints: { spine: 24, neck: 50, hipR: 0, hipL: 1, kneeR: 151, kneeL: 150,
                ankleR: -58, ankleL: -58, wristR: 40, wristL: 40 },
      ik: { wristR: { x: 92, y: 112.6, bend: 1 }, wristL: { x: 88, y: 113.0, bend: 1 } },
    },
    { // exhale lower: the ribs melt toward the thighs and the fingers creep on
      t: 1,
      root: { x: 30, y: 97.8, rot: 61 },
      joints: { spine: 25, neck: 51, hipR: 0, hipL: 1, kneeR: 151, kneeL: 150,
                ankleR: -58, ankleL: -58, wristR: 40, wristL: 40 },
      ik: { wristR: { x: 93, y: 112.8, bend: 1 }, wristL: { x: 89, y: 113.2, bend: 1 } },
    },
  ],
};

// On hands and knees, the spine alternating between dropping into an arch with
// the chest and tail lifting, and rounding up with the head and tail tucking.
// What must be visible is the spine reversing between the two frames, so this
// is a pingpong, not a hold. Side view. Exported by name as well because the
// pilates library imports the same move.
export const CAT_COW = {
  view: "side",
  loop: "pingpong",
  dur: 4.2,
  breath: 0.25,
  props: [{ type: "mat", x: 10, w: 118 }],
  keys: [
    { // cow: belly drops, tail lifts, chest and gaze rise
      t: 0,
      root: { x: 46, y: 84.5, rot: 116 },
      joints: { spine: -24, neck: -50, hipR: -116, hipL: -116, kneeR: 100, kneeL: 100,
                ankleR: -40, ankleL: -40, wristR: 50, wristL: 50 },
      ik: { wristR: { x: 96, y: 112, bend: 1 }, wristL: { x: 92, y: 112.5, bend: 1 } },
    },
    { // cat: tail tucks, the back rounds up and the head drops
      t: 1,
      root: { x: 46.4, y: 84.6, rot: 62 },
      joints: { spine: 24, neck: 42, hipR: -62, hipL: -62, kneeR: 100, kneeL: 100,
                ankleR: -40, ankleL: -40, wristR: 50, wristL: 50 },
      ik: { wristR: { x: 96, y: 112, bend: 1 }, wristL: { x: 92, y: 112.5, bend: 1 } },
    },
  ],
};

// Lying flat on the back, legs long and slightly apart, arms a little away from
// the body with the feet falling open, completely still. What must be visible is
// the whole body flat on the floor. Side view, and supine means root rot is
// NEGATIVE, which puts the head at -x and runs the legs out to +x. The only
// motion is the breath.
const CORPSE_POSE = {
  view: "side",
  loop: "hold",
  dur: 7.0,
  breath: 1.0,
  breathRate: 0.55,
  fit: { k: 0.92, dy: 0 },
  props: [{ type: "mat", x: 8, w: 122 }],
  keys: [
    { // settled and heavy
      t: 0,
      root: { x: 68, y: 107.6, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 180, hipL: 178, kneeR: 2, kneeL: 3,
                ankleR: -20, ankleL: -22, wristR: -6, wristL: -6 },
      ik: { wristR: { x: 74, y: 111, bend: 1 }, wristL: { x: 73, y: 110, bend: 1 } },
    },
    { // one long breath: nothing moves but the ribs
      t: 1,
      root: { x: 68, y: 108, rot: -90 },
      joints: { spine: 0, neck: 1, hipR: 181, hipL: 179, kneeR: 2, kneeL: 3,
                ankleR: -22, ankleL: -24, wristR: -6, wristL: -6 },
      ik: { wristR: { x: 74, y: 111.5, bend: 1 }, wristL: { x: 73, y: 110.5, bend: 1 } },
    },
  ],
};

// Lying on the back with both knees drawn up and dropped across the body while
// the shoulders stay down and the arms rest out on the floor. What must be
// visible is the knees folded up and travelling over with the back flat. Side
// view, which is honest about what it can show: the rotation itself points at
// the camera, so the two legs are drawn at clearly different angles to say they
// have travelled together to one side, and the shoulders split to say the chest
// stayed behind.
// v5: the v2 version used `pelvisTwist` and a pitched camera and both were
// wrong here. `pelvisTwist` on a SUPINE figure does not roll it about its long
// axis, it swings it round like a compass needle, so the body foreshortened
// from 45 units of head-to-hip down to 14 and the head vanished into the chest.
// The pitched camera was worse: a `mat` only draws as a floor rectangle past 55
// degrees, so at -24 the figure floated a hand's width above its own mat. Both
// are gone. The twist is now `spineTwist` at the chest, which does split the
// shoulders, plus `neckTwist` so the face is still a face. See RIG ISSUES.
const RECLINED_TWIST = {
  view: "side",
  loop: "hold",
  dur: 6.6,
  breath: 1.0,
  breathRate: 0.66,
  props: [{ type: "mat", x: 8, w: 122 }],
  keys: [
    { // settled: knees drawn up over the hips, shoulders heavy, arms out
      t: 0,
      root: { x: 66, y: 107, rot: -90 },
      joints: { spine: 0, neck: -6, hipR: 292, kneeR: 140, ankleR: -20,
                hipL: 280, kneeL: 132, ankleL: -20, wristR: -20, wristL: -20 },
      ik: { wristR: { x: 97, y: 111.6, bend: 1 }, wristL: { x: 96, y: 112.6, bend: 1 } },
    },
    { // the knees travel over together on the exhale, the chest stays behind
      t: 1,
      root: { x: 66, y: 107, rot: -90 },
      joints: { spineTwist: 36, neckTwist: -30, spine: 0, neck: -6,
                hipR: 252, kneeR: 148, ankleR: 10,
                hipL: 234, kneeL: 136, ankleL: 10, wristR: -20, wristL: -20 },
      ik: { wristR: { x: 97, y: 111.6, bend: 1 }, wristL: { x: 96, y: 112.6, bend: 1 } },
    },
  ],
};

// Lying on the back with the seat close to a wall and both legs running
// straight up it. What must be visible is the wall with the legs vertical
// against it and the whole back on the floor. Side view, supine, with the wall
// prop standing where the feet are.
// v5: the arms used to be pinned past the head, which is a different pose and
// put two forearms across the face. They lie along the floor beside the body
// now. They have to be nearly straight: a supine figure's elbow can only fold
// toward the floor in this rig, so a bent arm here puts its elbow through it.
const LEGS_UP_THE_WALL_POSE = {
  view: "side",
  loop: "hold",
  dur: 7.0,
  breath: 1.0,
  breathRate: 0.58,
  props: [{ type: "wall", x: 100, w: 20 }],
  keys: [
    { // settled, legs long up the wall, arms resting out on the floor
      t: 0,
      root: { x: 94, y: 107, rot: -90 },
      joints: { spine: 0, neck: 0, hipR: 270, hipL: 268, kneeR: 2, kneeL: 3,
                ankleR: -20, ankleL: -22, wristR: -34, wristL: -34 },
      ik: { wristR: { x: 99.5, y: 111.6, bend: 1 }, wristL: { x: 99, y: 112.6, bend: 1 } },
    },
    { // one slow breath: the legs lengthen a fraction up the wall
      t: 1,
      root: { x: 94, y: 107.4, rot: -90 },
      joints: { spine: 0, neck: 1, hipR: 271, hipL: 269, kneeR: 1, kneeL: 2,
                ankleR: -22, ankleL: -24, wristR: -34, wristL: -34 },
      ik: { wristR: { x: 99.5, y: 112.0, bend: 1 }, wristL: { x: 99, y: 113.0, bend: 1 } },
    },
  ],
};

// Lying on the back with the soles of the feet together and the knees dropped
// open, hands resting beside the hips. What must be visible is the folded legs
// with the feet drawn in toward the seat. Side view as suggested; the knees
// opening sideways points at the camera, so the two legs are drawn at clearly
// different angles, with `hipAbd` splitting them in depth so the far one takes
// the far tone. Without that split the two legs landed on top of each other and
// the whole lower half of the figure read as one lump.
// v5: the arms were pinned where no arm could reach, so both were clamped
// straight at full stretch; they lie along the floor beside the hips now.
const RECLINED_BOUND_ANGLE_POSE = {
  view: "side",
  loop: "hold",
  dur: 6.8,
  breath: 1.0,
  breathRate: 0.6,
  props: [{ type: "mat", x: 8, w: 122 }],
  keys: [
    { // settled, feet drawn in sole to sole, knees heavy and open
      t: 0,
      root: { x: 66, y: 107, rot: -90 },
      joints: { spine: 0, neck: -4, hipR: 216, kneeR: 148, ankleR: 40, hipAbdR: 30,
                hipL: 210, kneeL: 149, ankleL: 40, hipAbdL: -30,
                wristR: -24, wristL: -24 },
      ik: { wristR: { x: 96, y: 111.6, bend: 1 }, wristL: { x: 95, y: 112.6, bend: 1 } },
    },
    { // exhale: the knees settle a degree wider and lower
      t: 1,
      root: { x: 66, y: 107.4, rot: -90 },
      joints: { spine: 0, neck: -5, hipR: 212, kneeR: 146, ankleR: 40, hipAbdR: 33,
                hipL: 206, kneeL: 147, ankleL: 40, hipAbdL: -33,
                wristR: -24, wristL: -24 },
      ik: { wristR: { x: 96, y: 112.0, bend: 1 }, wristL: { x: 95, y: 113.0, bend: 1 } },
    },
  ],
};

export const MOVES = {
  "Side Plank": SIDE_PLANK,
  "Mountain Pose": MOUNTAIN_POSE,
  "Chair Pose": CHAIR_POSE,
  "Warrior I": WARRIOR_I,
  "Warrior II": WARRIOR_II,
  "Extended Side Angle": EXTENDED_SIDE_ANGLE,
  "Triangle Pose": TRIANGLE_POSE,
  "Warrior III": WARRIOR_III,
  "Revolved Triangle": REVOLVED_TRIANGLE,
  "Tree Pose": TREE_POSE,
  "Eagle Pose": EAGLE_POSE,
  "Half Moon Pose": HALF_MOON_POSE,
  "Dancer's Pose": DANCERS_POSE,
  "Crow Pose": CROW_POSE,
  "Plank Pose": PLANK_POSE,
  "Boat Pose": BOAT_POSE,
  "Revolved Chair Pose": REVOLVED_CHAIR_POSE,
  "Firefly Pose": FIREFLY_POSE,
  "Cobra Pose": COBRA_POSE,
  "Upward-Facing Dog": UPWARD_FACING_DOG,
  "Bridge Pose": BRIDGE_POSE,
  "Wheel Pose": WHEEL_POSE,
  "Camel Pose": CAMEL_POSE,
  "King Pigeon Pose": KING_PIGEON_POSE,
  "Downward-Facing Dog": DOWNWARD_FACING_DOG,
  "Forward Fold": FORWARD_FOLD,
  "Low Lunge": LOW_LUNGE,
  "Butterfly Pose": BUTTERFLY_POSE,
  "Pigeon Pose": PIGEON_POSE,
  "Lizard Pose": LIZARD_POSE,
  "Splits (Hanumanasana)": SPLITS,
  "Child's Pose": CHILDS_POSE,
  "Cat-Cow": CAT_COW,
  "Corpse Pose (Savasana)": CORPSE_POSE,
  "Reclined Twist": RECLINED_TWIST,
  "Legs-Up-the-Wall Pose": LEGS_UP_THE_WALL_POSE,
  "Reclined Bound Angle Pose": RECLINED_BOUND_ANGLE_POSE,
};
