// Weight training moves. Keys are the EXACT `name` from
// knowledge/exercise-library/weight-training.mjs.
//
// Push-Up and Pull-Up are bodyweight moves that appear in both libraries under
// the same name, so they are imported from calisthenics.mjs rather than copied.

// Bodyweight names the lifting library shares with calisthenics are authored
// once, over there, and imported here so the same figure shows in both.
import {
  PUSH_UP, PULL_UP, INVERTED_ROW, CHIN_UP, DIAMOND_PUSH_UP, DEAD_HANG,
  WALKING_LUNGE, BULGARIAN_SPLIT_SQUAT, NORDIC_CURL, PLANK, HANGING_LEG_RAISE, SIDE_PLANK,
} from "./calisthenics.mjs";
// The 120 lifts are authored in two part files so two people can work on them
// at once without editing the same file: upper body (chest, back, shoulders,
// arms, forearms) and lower body plus core. This file keeps the shared seeds
// and merges the parts; the validator and index only ever see one MOVES map.
import { MOVES as UPPER } from "./weight-training-upper.mjs";
import { MOVES as LOWER } from "./weight-training-lower.mjs";
/* NOT wired up, deliberately, and this is a decision somebody has to make.
   weight-training-lower.mjs now exports DUMBBELL_WALKING_LUNGE and
   DUMBBELL_BULGARIAN_SPLIT_SQUAT, because the weight training library calls
   both of these dumbbell exercises while the animation shown is the bodyweight
   one from calisthenics, so a user is told to fetch dumbbells and shown a
   picture of someone with empty hands.

   Mapping them here does not work. index.mjs flattens every library into one
   lookup and the app mounts a move by NAME with no library, on the documented
   assumption that a name in two libraries is the same object in both. Point
   these names at the weighted moves and calisthenics gets dumbbells too, which
   is worse. Fixing it properly means either giving the loaded versions their
   own exercise names, which orphans anything already logged under the old ones,
   or teaching the lookup about libraries, which is an app change. */

// Feet pinned, pelvis drives the rep. Authoring a squat as hip and knee angles
// means re-deriving both every time the depth changes; pinning the ankles means
// the legs follow the pelvis the way they do on a real person.
const GOBLET_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 1.1, dy: 2 },
  props: [{ type: "dumbbell", hold: "upright", side: "R", point: "wrist", dx: 3, dy: 1, k: 0.95, front: true }],
  keys: [
    { // standing tall, bell racked at the chest
      t: 0,
      root: { x: 64, y: 61.4, rot: 2 },
      joints: { spine: 5, neck: -3 },
      ik: {
        ankleR: { x: 64, y: 113.4, bend: -1 }, ankleL: { x: 61, y: 113.4, bend: -1 },
        wristR: { rel: "chest", x: 14, y: 6, bend: 1 }, wristL: { rel: "chest", x: 11, y: 7, bend: 1 },
      },
    },
    { // bottom, hips back, thighs about parallel, knee just past the toe
      t: 1,
      root: { x: 52, y: 89, rot: 10 },
      joints: { spine: 12, neck: -6 },
      ik: {
        ankleR: { x: 64, y: 113.4, bend: -1 }, ankleL: { x: 61, y: 113.4, bend: -1 },
        wristR: { rel: "chest", x: 14, y: 6, bend: 1 }, wristL: { rel: "chest", x: 11, y: 7, bend: 1 },
      },
    },
  ],
};

// Supine on a flat bench. root.rot is 90, which lays the whole torso chain on
// its side in one number, and the legs are pinned to the floor so the feet stay
// planted while the bar moves. The bar is a disc because side on that is what a
// loaded barbell looks like.
// Supine on a flat bench. root.rot -90 lays the whole torso chain on its side
// in one number. The sign matters: perpV(rot) is the direction the figure
// faces, so a positive rot tips it face DOWN and a negative rot face UP. My
// first pass had rot +90 and the figure was pressing a barbell into the floor.
// Head goes where upV(rot) points, feet the other way, so here the head is at
// -x and the legs run out to +x.
const BARBELL_BENCH_PRESS = {
  view: "side",
  loop: "pingpong",
  dur: 3.2,
  breath: 0.25,
  props: [
    { type: "bench", x: 26, y: 92, w: 78 },
    { type: "barbell", side: "R", point: "hand", r: 9.5, front: true },
  ],
  keys: [
    /* Mo, on the gallery: "his knees cant be pointed like that, make his legs
       straight and then go down", and "the barbell must be pressing his chest,
       it looks like he is doing it to his face". Both were the same kind of
       error, a target placed without checking what the limb had to do to reach
       it.

       The ankles were at x 92/96 against a hip at 86: six units of run for
       twenty-five of drop, so the thigh and shin had nowhere to go but bow the
       knee out into the air. Out at 108/112 the thigh lies along the bench and
       the shin drops to the floor, which is what a bench setup looks like.

       The hands were at x 53/56 with the head at the low end of the body: that
       is over the face, not the chest. Moved toward the feet so the bar sits
       over the shoulder at lockout and touches mid-chest at the bottom. */
    { // lockout, bar over the shoulder
      t: 0,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 0, neck: -4, wristR: 0, wristL: 0 },
      ik: {
        wristR: { x: 58.0, y: 43.0, z: 12.2, flat: false, bend: 1 }, wristL: { x: 61.0, y: 44.0, z: -12.2, flat: false, bend: 1 },
        ankleR: { x: 108, y: 113.4, bend: -1 }, ankleL: { x: 112, y: 113.4, bend: -1 },
      },
    },
    { // bar touching mid-chest, elbows toward the feet rather than square out
      t: 1,
      root: { x: 86, y: 82, rot: -90 },
      joints: { spine: 2, neck: -6, wristR: 0, wristL: 0 },
      ik: {
        wristR: { x: 64.2, y: 76.5, z: 18, flat: false, bend: 1, pole: [-1, 0, -0.3] }, wristL: { x: 66.2, y: 78.5, z: -18, flat: false, bend: 1, pole: [1, 0, -0.3] },
        ankleR: { x: 108, y: 113.4, bend: -1 }, ankleL: { x: 112, y: 113.4, bend: -1 },
      },
    },
  ],
};

// Seated under a high pulley. The cable prop draws the line from the pulley to
// whichever hand it names, so the direction of pull is never ambiguous.
const LAT_PULLDOWN = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  props: [
    /* The frame is artwork; anything that travels is still code. The cable
       keeps the pulley, the line and the bar, and hands the stack to the
       drawing with stack:false so the two do not both draw one. */
    { type: "artwork", src: "/knowledge/motion/props/lat-pulldown.svg" },
    { type: "cable", x: 54, top: 9, y0: 44, stack: false, plumb: true, barW: 16, to: { side: "R", point: "hand" }, front: true },
  ],
  keys: [
    { // arms long overhead, lats stretched
      t: 0,
      root: { x: 52, y: 86, rot: -8 },
      joints: { spine: -2, neck: -6 },
      ik: {
        wristR: { x: 55.5, y: 24.5, bend: 1 }, wristL: { x: 50.5, y: 25.5, bend: 1 },
        ankleR: { x: 80, y: 113.4, bend: -1 }, ankleL: { x: 76, y: 113.4, bend: -1 },
      },
    },
    { // bar to the collarbone, slight lean back, chest up
      t: 1,
      root: { x: 52, y: 86, rot: -12 },
      joints: { spine: -6, neck: -2 },
      ik: {
        wristR: { x: 57.1, y: 53.2, bend: 1 }, wristL: { x: 52.1, y: 54.2, bend: 1 },
        ankleR: { x: 80, y: 113.4, bend: -1 }, ankleL: { x: 76, y: 113.4, bend: -1 },
      },
    },
  ],
};

// Lead foot stays on the box for the whole rep, trail leg drives and then hangs.
// Standing on a box puts the head above the top of the 140 box, so this zooms
// out with `fit` instead of losing the head.
const STEP_UP = {
  view: "side",
  loop: "pingpong",
  dur: 3.4,
  breath: 0.2,
  fit: { k: 0.8, dy: 8 },
  props: [
    { type: "box", x: 76, y: 100, w: 44 },
    { type: "dumbbell", hold: "follow", side: "R", point: "hand", dx: 1, dy: 5, k: 0.8, front: true },
    { type: "dumbbell", hold: "follow", side: "L", point: "hand", dx: -1, dy: 5, k: 0.8 },
  ],
  keys: [
    { // bottom, lead foot on the box, trail foot on the floor
      t: 0,
      root: { x: 58, y: 61.4, rot: 4 },
      joints: { spine: 8, neck: -4, shoulderR: -4, elbowR: 6, shoulderL: -2, elbowL: 8 },
      ik: {
        ankleR: { x: 86, y: 95.4, bend: -1 }, ankleL: { x: 52, y: 113.4, bend: -1 },
      },
    },
    { // top, standing on the box, trail leg hanging behind
      t: 1,
      root: { x: 82, y: 43.4, rot: 2 },
      joints: { spine: 4, neck: -2, shoulderR: -4, elbowR: 6,
                hipL: -18, kneeL: 34, ankleL: -12 },
      ik: { ankleR: { x: 86, y: 95.4, bend: -1 } },
    },
  ],
};

export const MOVES = {
  ...UPPER,
  ...LOWER,
  "Push-Up": PUSH_UP,
  "Pull-Up": PULL_UP,
  "Inverted Row": INVERTED_ROW,
  "Chin-Up": CHIN_UP,
  "Diamond Push-Up": DIAMOND_PUSH_UP,
  "Dead Hang": DEAD_HANG,
  "Walking Lunge": WALKING_LUNGE,
  "Bulgarian Split Squat": BULGARIAN_SPLIT_SQUAT,
  "Nordic Curl": NORDIC_CURL,
  "Plank": PLANK,
  "Hanging Leg Raise": HANGING_LEG_RAISE,
  "Side Plank": SIDE_PLANK,
  "Goblet Squat": GOBLET_SQUAT,
  "Barbell Bench Press": BARBELL_BENCH_PRESS,
  "Lat Pulldown": LAT_PULLDOWN,
  "Step-Up": STEP_UP,
};
