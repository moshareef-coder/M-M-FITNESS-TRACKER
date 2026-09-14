// Rest antics: what the figure does between sets while the rest clock runs.
// Not exercises, so the keys are NOT library names. They are looked up by the
// session screen through moveFor() like any other move, and validate.mjs runs
// the same anatomy and floor checks on them, but they are kept out of the
// library counts on purpose: a card that asked for "Rest: Water" would be a
// bug, not a missing animation.
//
// The brief was Mo's: "have the character drink water while the rest is
// happening, or scroll on tiktok, or do something they typically do. Make it
// funny and cute." So each one is a small, recognisable gym habit, kept subtle
// (a person catching their breath, not a cartoon), and a short loop of two to
// four seconds so it never becomes a performance.
//
// Every entry carries the three things AUTHORING.md asks for: one sentence of
// what the real thing looks like, the one thing that MUST be visible, and the
// view that shows it.

const FLOOR = 113.4;   // y of a pinned ankle standing on the ground
const stand = (xr, xl) => ({
  ankleR: { x: xr, y: FLOOR, bend: -1 },
  ankleL: { x: xl, y: FLOOR, bend: -1 },
});
// Front view feet pointing at the camera, drawn short and wide.
const FRONT_FEET = { R: { ang: 12, len: 0.4, w: 1.3 }, L: { ang: 12, len: 0.4, w: 1.3 } };

// Standing side on with the weight over slightly staggered feet, the way
// someone stands when they are not doing anything in particular.
const STAND = { x: 66, y: 61.4, rot: 0 };
const FEET = stand(70, 62);
// The arm that is not busy hangs loose at the side.
const HANG_L = { shoulderL: -3, elbowL: 7, wristL: 3 };
const HANG_R = { shoulderR: -3, elbowR: 7, wristR: 3 };

// ------------------------------------------------------------- water ----
// Standing, a bottle in the near hand: it comes up from chest height to the
// lips, the head tips back for the drink, then it comes back down. Must be
// visible: the head tipping back with the bottle at the mouth, which is what
// separates a drink from a curl. Side view, sagittal.
const WATER = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.3,
  // The forearm folds back toward the face at the sip, so the bottle, which
  // runs along the forearm, would point past the ear; `rot` tips it back down
  // so the cap meets the lips and the base stays out in front.
  props: [{ type: "bottle", side: "R", point: "hand", along: 0.5, rot: -42, k: 0.9, front: true }],
  keys: [
    { // bottle held up at the chest, about to drink
      t: 0,
      root: STAND,
      joints: { spine: 1, neck: 2, ...HANG_L },
      ik: { wristR: { rel: "chest", x: 12, y: 8, bend: 1 }, ...FEET },
    },
    { // at the lips, head back, a long sip
      t: 0.55,
      root: STAND,
      joints: { spine: -2, neck: -16, ...HANG_L },
      ik: { wristR: { rel: "chest", x: 14.5, y: -4, bend: 1 }, ...FEET },
    },
    { // the same sip, a shade further back: the bottle emptying
      t: 1,
      root: STAND,
      joints: { spine: -3, neck: -21, ...HANG_L },
      ik: { wristR: { rel: "chest", x: 14, y: -5.5, bend: 1 }, ...FEET },
    },
  ],
};

// ------------------------------------------------------------- phone ----
// Standing with the head bowed over a phone held out in front of the chest,
// the other hand over the screen flicking up the feed. Must be visible: the
// bowed head and the free hand sweeping up the screen, which is the scroll.
// Three quarters, sagittal: side on the phone is a slab edge; front on the
// head cannot bow. The phone is in the FAR hand and held out past the torso's
// edge, so the near hand can do the flick in front of it and both are seen.
// The phone is drawn in the back layer for the same reason: the flicking hand
// has to be over the screen, not under it.
const PHONE = {
  view: { yaw: 26, plane: "sagittal" },
  loop: "pingpong",
  dur: 2.4,
  breath: 0.3,
  props: [{ type: "phone", side: "L", point: "hand", along: 4, rot: -40, k: 1.05 }],
  keys: [
    { // thumb at the bottom edge of the screen, phone held low and out
      t: 0,
      root: STAND,
      joints: { spine: 8, neck: 30, wristR: -14 },
      ik: {
        wristL: { rel: "chest", x: 17, y: 13, bend: 1 },
        wristR: { rel: "chest", x: 12.5, y: 7, bend: 1 },
        ...FEET,
      },
    },
    { // the flick: the free hand sweeps up and off the top of the screen
      t: 1,
      root: STAND,
      joints: { spine: 8, neck: 30, wristR: 14 },
      ik: {
        wristL: { rel: "chest", x: 17, y: 13, bend: 1 },
        wristR: { rel: "chest", x: 14.5, y: 1, bend: 1 },
        ...FEET,
      },
    },
  ],
};

// ------------------------------------------------------------- towel ----
// Standing, a towel in the near hand pressed to the brow and dragged back
// across it to the temple, then down to the back of the neck, the head dipping
// as it goes. Must be visible: the hand at the brow with the cloth hanging
// from it. Side view, sagittal: the wipe runs front to back along the head,
// which only the profile shows. The hand stays just in front of the face
// rather than on it, because the rig draws the head over any near arm that
// crosses it and a hand on the brow disappears behind the skull, and the tail
// is kept short so it hangs beside the face instead of curtaining it.
const TOWEL = {
  view: "side",
  loop: "pingpong",
  dur: 2.8,
  breath: 0.3,
  props: [{ type: "towel", side: "R", point: "hand", len: 8, k: 0.85, front: true }],
  keys: [
    { // towel pressed to the brow, chin up a little into it
      t: 0,
      root: STAND,
      joints: { spine: 2, neck: -6, ...HANG_L },
      ik: { wristR: { rel: "chest", x: 14, y: -17, bend: 1 }, ...FEET },
    },
    { // dragged back over the temple, head dipping
      t: 0.5,
      root: STAND,
      joints: { spine: 3, neck: 6, ...HANG_L },
      ik: { wristR: { rel: "chest", x: 9, y: -20.5, bend: 1 }, ...FEET },
    },
    { // and down to the back of the neck
      t: 1,
      root: STAND,
      joints: { spine: 4, neck: 14, ...HANG_L },
      ik: { wristR: { rel: "chest", x: 1, y: -14, bend: 1 }, ...FEET },
    },
  ],
};

// ---------------------------------------------------------- shake-out ----
// Standing square to the camera, arms hanging loose, a shrug up and a drop,
// the arms flapping a little and the head rolling side to side. Must be
// visible: the shoulders rising and the arms swinging out, which needs both
// sides in view. Front view, frontal. In this plane the neck angle is a side
// bend, which is exactly the head roll wanted.
const SHAKE_OUT = {
  view: "front",
  loop: "pingpong",
  dur: 2.2,
  breath: 0.35,
  feet: FRONT_FEET,
  keys: [
    { // loose, shoulders down
      t: 0,
      root: { x: 70, y: 61.6, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 12, shoulderL: 12, elbowR: 14, elbowL: 14, wristR: 6, wristL: 6,
                shoulderGirdleElevR: 0, shoulderGirdleElevL: 0 },
      ik: { ...stand(78, 62) },
    },
    { // shrug up, arms swing out, head rolls one way
      t: 0.35,
      root: { x: 70, y: 61.4, rot: 0 },
      joints: { spine: 0, neck: -9, shoulderR: 30, shoulderL: 28, elbowR: 26, elbowL: 24, wristR: -10, wristL: -10,
                shoulderGirdleElevR: 6.5, shoulderGirdleElevL: 6.5 },
      ik: { ...stand(78, 62) },
    },
    { // drop, arms back in, head rolls the other way
      t: 0.7,
      root: { x: 70, y: 61.8, rot: 0 },
      joints: { spine: 0, neck: 9, shoulderR: 10, shoulderL: 12, elbowR: 12, elbowL: 16, wristR: 8, wristL: 8,
                shoulderGirdleElevR: -1, shoulderGirdleElevL: -1 },
      ik: { ...stand(78, 62) },
    },
    { // a smaller second shrug, settling
      t: 1,
      root: { x: 70, y: 61.5, rot: 0 },
      joints: { spine: 0, neck: 0, shoulderR: 22, shoulderL: 22, elbowR: 20, elbowL: 20, wristR: -4, wristL: -4,
                shoulderGirdleElevR: 4, shoulderGirdleElevL: 4 },
      ik: { ...stand(78, 62) },
    },
  ],
};

// ------------------------------------------------------------- watch ----
// Standing, the near forearm comes up across the chest and the head bows to
// read the watch on it, then holds there, reading. Must be visible: the bowed
// head over the raised wrist. Slight three quarters, sagittal, so the face
// turned down toward the wrist is partly visible rather than a pure profile.
const WATCH = {
  view: { yaw: 18, plane: "sagittal" },
  loop: "pingpong",
  dur: 3.2,
  breath: 0.3,
  props: [{ type: "watch", side: "R", k: 1.1, front: true }],
  keys: [
    { // arm at the side, head level
      t: 0,
      root: STAND,
      joints: { spine: 1, neck: 2, ...HANG_L, shoulderR: 2, elbowR: 10, wristR: 4 },
      ik: { ...FEET },
    },
    { // forearm level in front of the chest, head dropping to read it. The
      // face turns a little toward the camera so it is a face looking down
      // and not the top of a skull.
      t: 0.6,
      root: STAND,
      joints: { spine: 5, neck: 26, neckTwist: -14, ...HANG_L, wristR: -22, forearmPronR: -60 },
      ik: { wristR: { rel: "chest", x: 15, y: 8, bend: 1 }, ...FEET },
    },
    { // reading, a small lean in
      t: 1,
      root: STAND,
      joints: { spine: 7, neck: 30, neckTwist: -14, ...HANG_L, wristR: -26, forearmPronR: -60 },
      ik: { wristR: { rel: "chest", x: 15.5, y: 6.5, bend: 1 }, ...FEET },
    },
  ],
};

export const MOVES = {
  "Rest: Water": WATER,
  "Rest: Phone": PHONE,
  "Rest: Towel": TOWEL,
  "Rest: Shake-out": SHAKE_OUT,
  "Rest: Watch": WATCH,
};
