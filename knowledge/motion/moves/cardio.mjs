/* Cardio: the sessions that are a gait rather than a rep.
 *
 * Added 2026-09-19 on Mo's explicit call. This folder is the collaborator's
 * and CLAUDE.md marks it read only; he asked for a running animation, was told
 * that, and said to write it here rather than file a request and wait. Saying
 * so out loud because the rule is a good one and the next person should know
 * this was a decision rather than somebody not reading the file.
 *
 * WHY THERE WAS NOTHING HERE. Every other library is a list of moves you do a
 * set of. knowledge/exercise-library/cardio.mjs is a list of SESSIONS: "Easy
 * Run" is twenty five minutes at an effort, not a thing you do eight of. So no
 * name in it ever needed a picture, and the activity screen was a bare clock.
 * It needs one now because that screen is being brought onto the same shape as
 * the lifting screen, which is built around the figure.
 *
 * One animation serves every session in a mode: seven running sessions are all
 * the same gait at different speeds, and a Tempo Run drawn differently from an
 * Easy Run would be a distinction the picture cannot honestly make. The mapping
 * from session name to move is in index.mjs ALIASES.
 */

/* A running gait, side on.
 *
 * What the real movement looks like: the body travels over one foot while the
 * other knee drives forward, the trailing heel folds up under the glute, the
 * arms swing opposed to the legs, and for part of every stride neither foot is
 * down.
 *
 * The one thing that MUST be visible: opposition. Right arm with left leg,
 * driven from a torso that stays quiet. A run drawn with the same-side arm and
 * leg forward is the single tell that an animation was authored by somebody who
 * did not look at a runner, and it survives every other check because the
 * joints are all in legal ranges.
 *
 * The view: side. A run is sagittal, and the knee drive and the heel recovery
 * are the whole picture. Front on, the legs pass through each other and the
 * stride disappears.
 *
 * Authored as joint angles rather than pinned ankles, because a pinned ankle is
 * a FLAT foot welded to the floor and half of this stride is in the air. The
 * float is the root rising, not the feet being placed.
 *
 * `cycle` rather than `oneway`, and that loop mode was added for this. A stride
 * never reverses and never rests: ping-pong would walk the figure backwards
 * every other stride, and oneway stands perfectly still for the last 18 per
 * cent of every cycle while it waits to reset, which is exactly what Mo saw.
 * "He goes one, two, and then he stops. Can we just have it go on forever?"
 * `cycle` runs the clock straight through at one speed with no easing, and
 * t=1 is authored identical to t=0 so the wrap lands on the same frame.
 *
 * `dur` 0.75 is a real cadence, about 160 steps a minute. The rest of this
 * folder runs 2.6 to 3.4 because a rep is slow; a stride is not, and slowing it
 * to match the others produced a man wading.
 */
export const RUN = {
  view: "side",
  loop: "cycle",
  dur: 0.75,
  breath: 0.15,
  fit: { k: 0.98, dy: 2 },
  keys: [
    { // right foot strike: it lands under the hips, not out in front, and the pelvis dips onto it
      t: 0,
      root: { x: 62, y: 64, rot: 6 },
      joints: {
        spine: 6, neck: -9,
        hipR: 18, kneeR: 22, ankleR: 2,
        hipL: -24, kneeL: 78, ankleL: -8,
        shoulderR: -34, elbowR: 84, shoulderL: 36, elbowL: 80,
      },
    },
    { // drive and toe-off: the stance leg extends behind, the left knee comes through, the body is at its highest
      t: 0.25,
      root: { x: 62, y: 57, rot: 7 },
      joints: {
        spine: 7, neck: -10,
        hipR: -22, kneeR: 14, ankleR: -16,
        hipL: 46, kneeL: 96, ankleL: 0,
        shoulderR: -8, elbowR: 78, shoulderL: 10, elbowL: 74,
      },
    },
    { // left foot strike: the mirror of t=0, which is what makes it a stride rather than a hop
      t: 0.5,
      root: { x: 62, y: 64, rot: 6 },
      joints: {
        spine: 6, neck: -9,
        hipL: 18, kneeL: 22, ankleL: 2,
        hipR: -24, kneeR: 78, ankleR: -8,
        shoulderL: -34, elbowL: 84, shoulderR: 36, elbowR: 80,
      },
    },
    { // the second drive and float, mirrored
      t: 0.75,
      root: { x: 62, y: 57, rot: 7 },
      joints: {
        spine: 7, neck: -10,
        hipL: -22, kneeL: 14, ankleL: -16,
        hipR: 46, kneeR: 96, ankleR: 0,
        shoulderL: -8, elbowL: 78, shoulderR: 10, elbowR: 74,
      },
    },
    { // back to the right foot strike, authored identical to t=0 so oneway loops clean
      t: 1,
      root: { x: 62, y: 64, rot: 6 },
      joints: {
        spine: 6, neck: -9,
        hipR: 18, kneeR: 22, ankleR: 2,
        hipL: -24, kneeL: 78, ankleL: -8,
        shoulderR: -34, elbowR: 84, shoulderL: 36, elbowL: 80,
      },
    },
  ],
};

/* Walking, side on, and it is not a slow run.
 *
 * What the real movement looks like: one foot is always down, the heel strikes
 * ahead of the body with an almost straight knee, the body rolls over it, and
 * the arms swing from the shoulder with the elbows nearly straight.
 *
 * The one thing that MUST be visible: the stance leg is straight and a foot is
 * always on the floor. Take the float out and shrink the angles and a run does
 * not become a walk, it becomes a jog; what makes it read as walking is the
 * long straight stance leg and the heel arriving first.
 *
 * Five walking sessions ride on this, including the Recovery Walk and the
 * Incline Walk, which the app offers more often than anything else to somebody
 * who has just started.
 */
export const WALK = {
  view: "side",
  loop: "cycle",
  dur: 1.25,
  breath: 0.3,
  fit: { k: 0.98, dy: 2 },
  keys: [
    { // right heel strike, that leg straight, the left still behind with the heel up
      t: 0,
      root: { x: 62, y: 62, rot: 2 },
      joints: {
        spine: 3, neck: -5,
        hipR: 22, kneeR: 4, ankleR: 8,
        hipL: -18, kneeL: 22, ankleL: -14,
        shoulderR: -20, elbowR: 16, shoulderL: 20, elbowL: 18,
      },
    },
    { // mid-stance: the body passes over a straight right leg, the left swings through underneath
      t: 0.25,
      root: { x: 62, y: 60.5, rot: 2 },
      joints: {
        spine: 3, neck: -5,
        hipR: -2, kneeR: 6, ankleR: 0,
        hipL: 12, kneeL: 44, ankleL: 4,
        shoulderR: -4, elbowR: 14, shoulderL: 4, elbowL: 14,
      },
    },
    { // left heel strike, the mirror
      t: 0.5,
      root: { x: 62, y: 62, rot: 2 },
      joints: {
        spine: 3, neck: -5,
        hipL: 22, kneeL: 4, ankleL: 8,
        hipR: -18, kneeR: 22, ankleR: -14,
        shoulderL: -20, elbowL: 16, shoulderR: 20, elbowR: 18,
      },
    },
    { // mid-stance over the left
      t: 0.75,
      root: { x: 62, y: 60.5, rot: 2 },
      joints: {
        spine: 3, neck: -5,
        hipL: -2, kneeL: 6, ankleL: 0,
        hipR: 12, kneeR: 44, ankleR: 4,
        shoulderL: -4, elbowL: 14, shoulderR: 4, elbowR: 14,
      },
    },
    { // back to the right heel strike
      t: 1,
      root: { x: 62, y: 62, rot: 2 },
      joints: {
        spine: 3, neck: -5,
        hipR: 22, kneeR: 4, ankleR: 8,
        hipL: -18, kneeL: 22, ankleL: -14,
        shoulderR: -20, elbowR: 16, shoulderL: 20, elbowL: 18,
      },
    },
  ],
};

/* Pedalling, side on, seated on an upright bike.
 *
 * What the real movement looks like: the hips stay still on the saddle, the
 * feet run a circle around the bottom bracket, and the legs do everything.
 * The library's own cue for Bike Intervals is "keep the hips still", and for
 * Easy Ride "saddle high enough that your knee is almost straight at the
 * bottom", so those two are what the picture has to prove.
 *
 * The one thing that MUST be visible: the feet on a CIRCLE. A cyclist drawn as
 * alternating knee bends is a person doing seated marches in the air. The feet
 * are therefore pinned with IK to points on the crank circle and the legs solve
 * to follow, which is also how a real leg works on a pedal: the foot is on the
 * pedal, the pedal decides where it goes.
 *
 * `flatFeet: false` because a pinned ankle otherwise welds the sole flat to the
 * floor, which is right for a squat and wrong here: on a pedal the ankle rolls
 * through the stroke, toe down over the top and heel dropping at the bottom.
 *
 * The crank arms are NOT in the bike drawing. They rotate, and a moving part
 * cannot live in an SVG; each one is a `lever` from the bottom bracket to that
 * ankle, which draws the arm and puts a pedal on the end of it.
 *
 * Geometry, so the next person can move the bike without re-deriving the rider:
 * bottom bracket (70, 96), crank radius 10, saddle carries the pelvis at
 * (60, 51). Pelvis to the bottom of the stroke is 55.9 units against a leg of
 * 56.6, which is the "almost straight" the cue asks for, and to the top of the
 * stroke is 36.4, which is the deep bend at the top.
 */
const CRANK = { x: 70, y: 96, r: 10 };
const pedal = (deg) => ({
  x: CRANK.x + CRANK.r * Math.cos((deg * Math.PI) / 180),
  y: CRANK.y - CRANK.r * Math.sin((deg * Math.PI) / 180),
});
/* One rider, two bikes. The frame is the only difference between a spin studio
   and a road ride, and the body does the same thing on both, so the pose is
   authored once and the prop swapped under it. */
const cycleKeys = (phase) => [0, 0.25, 0.5, 0.75, 1].map((t) => {
  const a = phase - t * 360;                     // the right foot's angle on the circle
  const R = pedal(a), L = pedal(a + 180);        // cranks are opposed, always
  return {
    t,
    root: { x: 58, y: 50, rot: 14 },
    joints: { spine: 16, neck: -30 },
    ik: {
      ankleR: { x: R.x, y: R.y, bend: -1, flat: false },
      ankleL: { x: L.x, y: L.y, bend: -1, flat: false },
      wristR: { x: 88, y: 53, bend: 1 },
      wristL: { x: 88, y: 53, bend: 1 },
    },
  };
});

export const CYCLE_INDOOR = {
  view: "side",
  loop: "cycle",
  dur: 1.1,
  breath: 0.2,
  flatFeet: false,
  fit: { k: 0.98, dy: 2 },
  props: [
    { type: "artwork", src: "/knowledge/motion/props/spin-bike.svg" },
    { type: "lever", pivot: { x: CRANK.x, y: CRANK.y }, to: { side: "R", point: "ankle" }, end: "pad", padW: 9, padT: 3, r: 1.9 },
    { type: "lever", pivot: { x: CRANK.x, y: CRANK.y }, to: { side: "L", point: "ankle" }, end: "pad", padW: 9, padT: 3, r: 1.9 },
  ],
  keys: cycleKeys(90),
};

/* Climbing a stepmill, side on.
 *
 * What the real movement looks like: the stairs come down and the climber
 * stays at one height, driving one knee up onto the next tread while the other
 * leg straightens under them, hands resting on the rails rather than hanging
 * from them.
 *
 * The one thing that MUST be visible: the rider stands UPRIGHT and the weight
 * is on the legs. The library's cue for Stair Intervals is "stand upright,
 * leaning on the rails takes the legs out of it entirely", so a figure hanging
 * off its arms would be drawing the mistake the cue exists to prevent. The
 * hands rest on the side rail beside the hips, which is where a stepmill
 * rail actually is: arms nearly straight at the sides, not reaching forward
 * and not hanging off anything. Targets further forward than this are past the
 * arm's reach, the IK gives up, and the figure stands there with its arms
 * dangling, which is how the first pass looked.
 *
 * The feet are pinned to the two treads the machine drawing puts at y=96 and
 * y=108, and they swap. The root barely moves, which is the whole difference
 * between a stepmill and a staircase: on a staircase you rise, here the stairs
 * fall away underneath you.
 */
const STEP_HI = 96, STEP_LO = 108;
const stairKeys = (rightHigh) => {
  const hi = rightHigh ? "R" : "L", lo = rightHigh ? "L" : "R";
  return {
    root: { x: 66, y: 54.5, rot: 4 },
    joints: { spine: 5, neck: -7 },
    ik: {
      ["ankle" + hi]: { x: 73, y: STEP_HI, bend: -1 },
      ["ankle" + lo]: { x: 67, y: STEP_LO, bend: -1 },
      wristR: { x: 75, y: 59, bend: 1 },
      wristL: { x: 70, y: 59.5, bend: 1 },
    },
  };
};

export const STAIRS = {
  view: "side",
  loop: "cycle",
  dur: 1.4,
  breath: 0.3,
  fit: { k: 0.98, dy: 2 },
  props: [{ type: "artwork", src: "/knowledge/motion/props/stair-climber.svg" }],
  keys: [
    { t: 0, ...stairKeys(true) },
    { t: 0.5, ...stairKeys(false) },
    { t: 1, ...stairKeys(true) },
  ],
};

/* Keyed by SESSION name, every running session pointing at the one gait.
 *
 * The obvious shape was one move called "Run" plus a line each in index.mjs
 * ALIASES, and the validator is right to refuse it: it checks that every
 * authored name is an exercise in that library, which is the check that catches
 * a move keyed to a name nothing will ever ask for. A gait keyed to a name the
 * cardio library does not have is exactly that mistake, whatever the intent.
 *
 * So the names here are the library's own, and the same object answers to all
 * of them. It costs nothing at runtime (one object, seven references) and it
 * puts the mapping where somebody reading this file can see it, rather than in
 * an alias table two files away.
 *
 * The modes with nothing here (cycling, rowing, swimming, elliptical, stairs,
 * rope, HIIT) are absent on purpose. Cycling and rowing need a bike and an
 * ergometer drawn before they can be honest, and a swimmer cannot be drawn
 * standing on a floor at all. */
export const MOVES = {
  "Stair Intervals": STAIRS,
  "Easy Ride": CYCLE_INDOOR,
  "Long Ride": CYCLE_INDOOR,
  "Easy Spin": CYCLE_INDOOR,
  "Bike Intervals": CYCLE_INDOOR,
  "Tempo Ride": CYCLE_INDOOR,
  "Recovery Spin": CYCLE_INDOOR,
  "Easy Run": RUN,
  "Run Intervals": RUN,
  "Hill Repeats": RUN,
  "Sprint Intervals": RUN,
  "Tempo Run": RUN,
  "Progression Run": RUN,
  "Long Run": RUN,
  "Brisk Walk": WALK,
  "Incline Walk": WALK,
  "Long Walk": WALK,
  "Recovery Walk": WALK,
  "Hike": WALK,
};
