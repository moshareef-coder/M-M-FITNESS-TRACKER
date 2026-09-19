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
 * `oneway` rather than `pingpong`: a stride is a cycle, not an out and back.
 * Ping-pong would run the figure backwards through the stride every other
 * cycle, which is a moonwalk. t=1 is authored identical to t=0 so the snap back
 * lands on the same frame and the loop is seamless. The two mid keys are
 * waypoints (`through`), so the figure passes through the drive and the float
 * at speed instead of stopping to pose at each one, which is what made the
 * first pass read as four separate lunges.
 *
 * `dur` 0.75 is a real cadence, about 160 steps a minute. The rest of this
 * folder runs 2.6 to 3.4 because a rep is slow; a stride is not, and slowing it
 * to match the others produced a man wading.
 */
export const RUN = {
  view: "side",
  loop: "oneway",
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
      through: true,
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
      through: true,
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
  loop: "oneway",
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
      through: true,
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
      through: true,
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
