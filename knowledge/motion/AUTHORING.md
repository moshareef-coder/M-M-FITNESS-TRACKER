# Authoring exercise motion

Every animation in the app is data: an array of keyframes holding joint angles
in degrees, drawn by `rig.mjs`. No art assets, no video, no runtime library.
This file is how you add one.

Files you touch: `knowledge/motion/moves/<library>.mjs`, and nothing else.

---

## Step 0, before any numbers: decide what the picture has to prove

This is not optional and it is not paperwork. Most bad exercise illustrations
are anatomically fine and still show the wrong exercise.

For each move, write these three things in a comment above the entry:

1. **One sentence of what the real movement looks like.** Take it from the
   library entry: the `cue` if there is one, plus `primary` and `secondary`.
   "Standing square in a doorway, one arm straight out to the side at shoulder
   height, palm on the frame, then step the body through."
2. **The one thing that MUST be visible.** Either the joint under load or the
   range of motion. For a squat it is the hip and knee bending together. For a
   doorway pec stretch it is the arm held back at 90 degrees while the chest
   moves past it.
3. **The view that shows that thing.** Not the view that is easiest to author.

Our first doorway pec stretch was a side view. Side on, an arm abducted to 95
degrees points straight at the camera and there is nothing to see, so the pose
drifted into "leaning on a wall with the hand out front", which is a different
exercise. It validated. It looked good. It was wrong.

### Choosing the view

| the movement is | view | examples |
| --- | --- | --- |
| in the sagittal plane: hinge, squat, push, row, lunge, roll, press | side | push-up, goblet squat, deadlift, bench press, lat pulldown, foam roller work |
| lateral, or symmetric across the midline | front | lateral raise, band pull-apart, jumping jack, Warrior II, cossack squat, 90/90 hip switch, band external rotation |
| about the back of the body, or the arms are held behind | back (front view with `facing: "away"`) | doorway pec stretch, wall angel, scapular retraction, rear delt work |

The mannequin has no face, so "back" is the front view plus `facing: "away"`,
which rounds the skull, drops the jaw taper and shows both ears.

A suggested view for all 278 library names is at the bottom of this file. It is
a starting point that has been reviewed once; if you disagree for a specific
move, follow step 0 and say why in the comment.

---

## The angle contract

```
0 deg means "straight down" for a limb, "straight up" for the spine and neck.
Positive rotates toward the direction the figure faces, which is screen +x in
side view and away from the midline in front view.

  shoulder  0 = arm hanging along the torso, + = arm swings forward or out
  elbow     0 = straight, + = flexion (hand travels forward)
  wrist     0 = hand continues the forearm
  hip       0 = thigh straight down from the pelvis, + = thigh forward or out
  knee      0 = straight, + = flexion (heel toward the glute)
  ankle     0 = foot at 90 deg to the shin, + = dorsiflexion (toes up)
  spine     + = forward flexion, - = extension
  neck      + = chin to chest, - = looking up
```

### The root box

The drawing area is 140 x 140 units. The floor is `y = 118`. A standing pelvis
sits at `y = 61.4` (`STAND_Y`), because the leg plus the ankle is 56.6 units.
The figure is about 110 units tall, roughly seven heads.

`root: { x, y, rot }` is the pelvis. `rot` rotates the whole body:

- **`perpV(rot)` is the direction the figure faces.** `rot > 0` tips it face
  DOWN (prone, like a push-up). `rot < 0` tips it face UP (supine, like a bench
  press or lying on a foam roller).
- **The head goes where `upV(rot)` points and the feet go the other way.** Lay
  the scene out from that. A supine figure with `rot -90` has its head at -x and
  its legs running out to +x, so the bench, the roller and the floor contacts
  all have to be placed on that basis.

Getting this backwards is the single most expensive mistake available here. My
first bench press had `rot +90` and the figure was lying face down pressing a
barbell into the floor. It validated until the validator learned to check
derived joint angles.

### IK pins

A keyframe may pin an end effector instead of authoring the chain:

```js
ik: {
  ankleR: { x: 64, y: 113.4, bend: -1 },
  wristR: { rel: "chest", x: 14, y: 6, bend: 1 },
}
```

`ankleL/R` pins the ankle, `wristL/R` pins the wrist, in world units. `rel:
"chest"` makes the target an offset from the chest point, which is how a
dumbbell racked at the chest rides along with the torso.

**Legs pin with `bend: -1`. Arms pin with `bend: +1`.** That is the combination
that produces knee flexion rather than hyperextension and elbow flexion rather
than a backwards elbow. If the pose looks wrong with those, the pose is usually
wrong, not the bend: move the root or move the pin. The two exceptions, both
covered below, are an arm folding across the body in the front view and an arm
reaching back to a bar on the traps; both pin with `bend: -1`.

Pinning is what keeps hands and feet welded to the floor while the root moves.
Authoring a squat as hip and knee angles means re-deriving both every time you
change the depth; pinning the ankles means moving the pelvis and letting the
legs follow, like a person.

A pinned ankle also means a **flat foot** on the floor. If you want tucked toes
(push-up) or pointed toes (hanging), do not pin: use `hip`, `knee` and `ankle`
angles.

### Reaching across the body, and reaching behind it

Two limits were lifted after the first batch, because both were costing
accuracy rather than protecting it.

**Front view: an arm may cross the midline.** A shoulder angle can go negative
past the torso, which adducts the arm across the chest, and the elbow may fold
inward as well. Any move where the hands meet at the sternum or travel past the
midline needs this: Pallof press, woodchopper, Russian twist, cross-body arm
swings, cross-body shoulder stretch, thread the needle.

- Pin those wrists with **`bend: -1`**, not `+1`. In the front view `+1` swings
  the elbow up and over the opposite shoulder; `-1` drops it down and out, which
  is what a hand held at the sternum actually looks like.
- The rig works out the z-order itself: an arm whose wrist comes inside five
  units of its own shoulder draws **in front of the torso**, in the near tone.
  Nothing to author.
- The validator checks the **magnitude** of elbow flexion in the front view, not
  its sign, because the rig has no humeral rotation: an internally rotated arm
  folds toward the midline and an externally rotated one folds away, and both
  project into the frontal plane with opposite signs. A forearm folding the
  wrong way is now a contact sheet catch, not a validator catch. Look for it.
- Shoulder elevation may run to -120 in the front view. It stays at -95 in the
  side view, where a number like that would be shoulder extension no shoulder
  reaches.

**Side view: a hand may rest on a bar racked on the traps.** Back squat, good
morning, and anything else carrying a bar behind the neck.

```js
props: [{ type: "barbell", place: "traps", up: 6.5, back: 5.5, r: 8.5, front: true }],
// and in each keyframe:
ik: { wristR: { rel: "chest", x: -4.4, y: -7.3, bend: -1 }, ... }
```

`place: "traps"` puts the bar at `chest + up * up(t) - back * perp(t)`, so it
leans and travels with the shoulders instead of hovering in world space. Pin the
wrists to the same point, as a chest offset, with **`bend: -1`** so the elbow
goes behind rather than over the head.

That pose reaches about 85 degrees of shoulder extension and 155 of elbow
flexion. Both are legal now (the limits are -95 and 168) and both are really the
projection of a wide grip, not a shoulder doing something strange: the hands are
out to the sides, which a side view cannot show. The same magnitude-only rule
applies to the elbow whenever the shoulder is extended past -25, because
reaching back and folding up to a bar needs external rotation the rig cannot
carry.

**Watch the interpolation, not just the keyframes.** `rel: "chest"` offsets are
world-space, so between two keyframes they travel in a straight line while the
torso swings through its arc. On a good morning, where the torso goes from
almost upright to almost horizontal, the hands come off the bar in the middle
of the rep and the elbow folds past what a joint does. The fix is a third
keyframe at t 0.5 with the offset recomputed for the halfway torso angle. The
validator samples 24 points precisely so it can see this.

**What these did NOT fix.** A seated front view is still mush: there is no way
to foreshorten a shin pointed at the camera, so a seated figure has to splay its
knees wide and the limbs pile up. The Russian twist was tried in the front view
with the new cross-body arms, and the arms worked while the legs did not, so it
stayed side on. When a limit lifts, re-test the move; do not assume.

### Loop style by kind

| kind | loop | breath | why |
| --- | --- | --- | --- |
| reps (strength, dynamic stretches) | `pingpong` | 0.2 | out and back, easing at both ends |
| static holds (yoga, static stretches) | `hold` | 1.0 | eases into a settle; the breathing idle is what stops a held pose reading as a broken animation |
| drills that only go one way (inchworm, crawl) | `oneway` | 0.3 | plays through, snaps back |

`dur` is the seconds for one full cycle. Reps 2.6 to 3.4. Holds 5 to 7.

### The other fields

```js
{
  view: "side" | "front",
  facing: "away",         // front view only, draws the back of the figure
  loop, dur, breath, breathRate,
  farSide: "L",           // front view: which side is behind. Omit for a
                          // symmetric move, which draws both sides equally.
  feet: { R: { ang, len, w }, L: {...} },  // front view feet, see below
  fit: { k: 0.8, dy: 8 }, // zoom the whole scene, for moves taller than the box
  props: [...],
  keys: [...],
}
```

`feet` is only for the front view, where a foot pointing at the camera has to be
drawn short and wide rather than rotated. `ang` is its angle in the frontal
plane, `len` and `w` scale it. Warrior II's front foot is `{ ang: 8, len: 0.34,
w: 1.35 }` and its turned-out back foot is `{ ang: 74, len: 1.05, w: 0.95 }`.

`fit` exists because a hanging body under a pull-up bar, or a body standing on a
box, is taller than 140 units. Zoom out; never crop the head.

### Props

Types: `mat, wall, doorway, doorframe, bench, box, roller, pullupBar, dipBars,
machine, cable, band, barbell, dumbbell, kettlebell`.

They either sit in the world (`{ type: "bench", x, y, w, incline }`) or attach
to the body (`{ type: "dumbbell", side: "R", point: "hand", dx, dy, rot, k }`).
`front: true` draws a prop over the figure instead of behind it.

Two that are not obvious:

- **A barbell seen from the side is a disc**, not a bar. Drawing the bar
  sideways is the most common way these illustrations look wrong. Add
  `place: "traps"` to rack it across the upper back so it carries with the
  torso.
- **A band sags by its slack**, so give it a `rest` length close to the hand
  separation at the end of the rep. The sag going to zero is the rep.

`machine` is one abstraction for every seated machine: `parts: ["seat",
"backPad", "thighPad", "lever"]`. `cable` draws a stack, a pulley and a line
that ends in the hand you name, so the direction of pull is never ambiguous.

### Variants are nearly free

A variant is usually a template plus two edits. Incline push-up is the push-up
with a `bench` prop, a smaller `root.rot` and the wrist pins moved up onto the
pad. Reuse by importing the base move and spreading it:

```js
import { PUSH_UP } from "./calisthenics.mjs";
const INCLINE_PUSH_UP = { ...PUSH_UP, props: [...], keys: [...] };
```

Do that rather than copying, and fix a pose in one place.

---

## Ten things that will bite you

1. **Legs `bend: -1`, arms `bend: +1`,** except for an arm crossing the body in
   the front view or reaching a bar on the traps, which both use `-1`. Anything
   else is a joint bending the wrong way, and the validator names it `kneeFlex`
   or `elbowFlex` negative.
2. **`rot > 0` is face down, `rot < 0` is face up.** Check it before you place
   a single prop.
3. **Hip and knee angles are relative to the pelvis**, so a rotated root makes
   them look absurd. The push-up carries `hip: -140` and is perfectly straight.
   That is fine. The validator checks the derived angle (torso to thigh), not
   the number you typed.
4. **A pinned ankle is a flat foot.** Tucked or pointed toes need angles.
5. **The side view foreshortens anything lateral to nothing.** That is a view
   problem, not a numbers problem. Go back to step 0.
6. **The box is only 140 units.** Hanging and standing-on-things need `fit`.
7. **A hand next to the head is mush at 160px.** Same colour, thin knockout
   line between them. Move the pin five units.
8. **A prop attached to a hand follows the hand.** If the hand must stay on a
   fixed frame while the body moves, pin the wrist with IK and leave the prop in
   world coordinates.
9. **Breathing 1.0 on a rep looks like a shiver.** 0.2 for reps, 1.0 for holds.
10. **Deep folds read as blobs.** At the bottom of a real push-up the elbow sits
    inside the torso silhouette; we pull the bottom of the rep up slightly so
    the bent arm still reads. Three quarters of the true range that reads beats
    the full range that does not.

---

## The review loop

Run all of it, every time, for every move.

```bash
node knowledge/motion/validate.mjs --allow-missing      # 1. is it legal
node scripts/motion-sheet.mjs <library>                 # 2. what does it look like
# 3. open the PNG it printed and look at it
```

The validator checks: known view and loop, keyframes sorted and spanning 0 to 1,
derived joint angles inside human ranges, known prop types, and no joint through
the floor at any of 24 sampled points in the cycle. It exits 1 on failure. Do
not commit red.

**Then the accuracy check, which is the one that matters.** For each move on the
contact sheet, read your own one-sentence description from step 0 and ask:

- Would a beginner copying this picture do the movement in that sentence?
- Is the thing that MUST be visible actually visible?
- Could this be mistaken for a neighbouring exercise in the same library?

If the answer to any of those is no, the move is a failure and gets re-authored,
however good it looks. **A pretty pose of the wrong movement is a failure.** It
is worse than no animation, because no animation sends the user to the cue text
and a wrong animation does not.

---

## Worked example 1: Goblet Squat (side view, reps, pinned feet)

What it looks like: stand holding a dumbbell vertically at the chest, sit the
hips back and down until the thighs are about parallel, stand up. Must be
visible: the hip and knee bending together while the torso stays upright-ish.
Side view, because that is the sagittal plane.

```js
const GOBLET_SQUAT = {
  view: "side",
  loop: "pingpong",
  dur: 3.0,
  breath: 0.2,
  fit: { k: 1.1, dy: 2 },
  props: [{ type: "dumbbell", side: "R", point: "wrist", dx: 3, dy: 1, rot: 0, k: 0.95, front: true }],
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
```

Note what is NOT in there: no hip angle, no knee angle, no ankle angle. The feet
are pinned to the floor and the whole rep is the pelvis moving from (64, 61.4)
to (52, 89) with the torso leaning 22 degrees. That is also how the movement
actually works.

## Worked example 2: Warrior II (front view, hold, authored feet)

What it looks like: a wide stance, front knee bent to about 90 with the shin
vertical, back leg straight with the foot turned out, arms reaching level in
opposite directions. Must be visible: the width of the stance and the bent front
knee. Front view, because side on it collapses into one leg and one arm.

```js
const WARRIOR_II = {
  view: "front",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.8,
  farSide: "L",
  feet: { R: { ang: 8, len: 0.34, w: 1.35 }, L: { ang: 74, len: 1.05, w: 0.95 } },
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
```

`farSide: "L"` is what makes the back leg and arm draw in the dimmer tone. Leave
it out on a genuinely symmetric move (band pull-apart, doorway pec stretch) or
one half of the figure reads as a lighting mistake.

The two keyframes are nearly identical on purpose. A hold is not a rep: the
motion is a settle plus breathing, and if you animate more than that it stops
looking like someone holding a pose.

---

## Suggested view per exercise

Starting point for all 278 library names, from the rules in step 0. `side` is
the default and covers most lifting; `front` is for anything lateral or
symmetric; `back` is the front view with `facing: "away"`.


### Weight Training (120)

| exercise | group | view |
| --- | --- | --- |
| Push-Up | Chest | side |
| Incline Push-Up | Chest | side |
| Dumbbell Bench Press | Chest | side |
| Machine Chest Press | Chest | side |
| Pec Deck | Chest | side |
| Cable Fly | Chest | side |
| Low-to-High Cable Fly | Chest | side |
| Incline Dumbbell Press | Chest | side |
| Decline Dumbbell Press | Chest | side |
| Barbell Bench Press | Chest | side |
| Incline Barbell Press | Chest | side |
| Decline Barbell Press | Chest | side |
| Landmine Press | Chest | side |
| Weighted Dip | Chest | side |
| Inverted Row | Back (Lats) | side |
| Lat Pulldown | Back (Lats) | side |
| Close-Grip Pulldown | Back (Lats) | side |
| Seated Cable Row | Back (Lats) | side |
| Dumbbell Row | Back (Lats) | side |
| Straight-Arm Pulldown | Back (Lats) | side |
| Chest-Supported Row | Back (Lats) | side |
| T-Bar Row | Back (Lats) | side |
| Barbell Row | Back (Lats) | side |
| Pendlay Row | Back (Lats) | side |
| Pull-Up | Back (Lats) | side |
| Chin-Up | Back (Lats) | side |
| Weighted Pull-Up | Back (Lats) | side |
| Dumbbell Shrug | Traps / Upper Back | front |
| Barbell Shrug | Traps / Upper Back | front |
| Face Pull | Traps / Upper Back | back |
| Rear Delt Fly | Traps / Upper Back | back |
| Reverse Pec Deck | Traps / Upper Back | side |
| Behind-the-Back Shrug | Traps / Upper Back | front |
| Upright Row | Traps / Upper Back | front |
| Snatch-Grip High Pull | Traps / Upper Back | side |
| Lateral Raise | Shoulders | front |
| Cable Lateral Raise | Shoulders | front |
| Front Raise | Shoulders | side |
| Machine Shoulder Press | Shoulders | side |
| Seated Dumbbell Press | Shoulders | side |
| Dumbbell Shoulder Press | Shoulders | front |
| Arnold Press | Shoulders | front |
| Cuban Press | Shoulders | side |
| Overhead Press | Shoulders | side |
| Push Press | Shoulders | side |
| Dumbbell Curl | Biceps | side |
| Hammer Curl | Biceps | side |
| Cable Curl | Biceps | side |
| EZ-Bar Curl | Biceps | side |
| Concentration Curl | Biceps | side |
| Barbell Curl | Biceps | side |
| Preacher Curl | Biceps | side |
| Incline Dumbbell Curl | Biceps | side |
| Spider Curl | Biceps | side |
| Triceps Pushdown | Triceps | side |
| Rope Pushdown | Triceps | side |
| Overhead Triceps Extension | Triceps | side |
| Triceps Kickback | Triceps | side |
| Bench Dip | Triceps | side |
| Diamond Push-Up | Triceps | side |
| Skull Crusher | Triceps | side |
| Close-Grip Bench Press | Triceps | side |
| Wrist Curl | Forearms | side |
| Reverse Wrist Curl | Forearms | side |
| Reverse Curl | Forearms | side |
| Plate Pinch | Forearms | side |
| Farmer's Carry | Forearms | side |
| Dead Hang | Forearms | side |
| Goblet Squat | Quads | side |
| Leg Press | Quads | side |
| Leg Extension | Quads | side |
| Walking Lunge | Quads | side |
| Hack Squat | Quads | side |
| Barbell Back Squat | Quads | side |
| Bulgarian Split Squat | Quads | side |
| Front Squat | Quads | side |
| Zercher Squat | Quads | side |
| Sissy Squat | Quads | side |
| Leg Curl | Hamstrings | side |
| Cable Pull-Through | Hamstrings | side |
| Stiff-Leg Deadlift | Hamstrings | side |
| Romanian Deadlift | Hamstrings | side |
| Glute-Ham Raise | Hamstrings | side |
| Single-Leg Romanian Deadlift | Hamstrings | side |
| Good Morning | Hamstrings | side |
| Nordic Curl | Hamstrings | side |
| Glute Bridge | Glutes | side |
| Cable Kickback | Glutes | side |
| Frog Pump | Glutes | front |
| Step-Up | Glutes | side |
| Curtsy Lunge | Glutes | side |
| Hip Thrust | Glutes | side |
| Sumo Deadlift | Glutes | front |
| Dumbbell Calf Raise | Calves | side |
| Seated Calf Raise | Calves | side |
| Standing Calf Raise | Calves | side |
| Leg Press Calf Raise | Calves | side |
| Single-Leg Calf Raise | Calves | side |
| Donkey Calf Raise | Calves | side |
| Plank | Abs | side |
| Crunch | Abs | side |
| Sit-Up | Abs | side |
| Reverse Crunch | Abs | side |
| Cable Crunch | Abs | side |
| V-Up | Abs | side |
| Hanging Leg Raise | Abs | side |
| Toes-to-Bar | Abs | side |
| Ab Wheel Rollout | Abs | side |
| Russian Twist | Obliques | side |
| Side Bend | Obliques | front |
| Side Plank | Obliques | side |
| Pallof Press | Obliques | side |
| Woodchopper | Obliques | side |
| Hanging Windshield Wiper | Obliques | side |
| Bird Dog | Lower Back | side |
| Superman | Lower Back | back |
| Back Extension | Lower Back | side |
| Suitcase Carry | Lower Back | side |
| Reverse Hyperextension | Lower Back | side |
| Deadlift | Lower Back | side |

### Yoga (37)

| exercise | group | view |
| --- | --- | --- |
| Mountain Pose | Standing poses | front |
| Chair Pose | Standing poses | front |
| Warrior I | Standing poses | front |
| Warrior II | Standing poses | front |
| Extended Side Angle | Standing poses | front |
| Triangle Pose | Standing poses | front |
| Warrior III | Standing poses | front |
| Revolved Triangle | Standing poses | front |
| Tree Pose | Balance poses | front |
| Eagle Pose | Balance poses | front |
| Half Moon Pose | Balance poses | front |
| Dancer's Pose | Balance poses | side |
| Crow Pose | Balance poses | side |
| Plank Pose | Core & twists | side |
| Side Plank | Core & twists | side |
| Boat Pose | Core & twists | side |
| Revolved Chair Pose | Core & twists | front |
| Firefly Pose | Core & twists | side |
| Cobra Pose | Backbends | side |
| Bridge Pose | Backbends | side |
| Upward-Facing Dog | Backbends | side |
| Camel Pose | Backbends | side |
| Wheel Pose | Backbends | side |
| King Pigeon Pose | Backbends | side |
| Downward-Facing Dog | Hip openers & forward folds | side |
| Forward Fold | Hip openers & forward folds | side |
| Low Lunge | Hip openers & forward folds | side |
| Butterfly Pose | Hip openers & forward folds | front |
| Pigeon Pose | Hip openers & forward folds | side |
| Lizard Pose | Hip openers & forward folds | side |
| Splits (Hanumanasana) | Hip openers & forward folds | side |
| Child's Pose | Restorative / cool-down | side |
| Cat-Cow | Restorative / cool-down | side |
| Corpse Pose (Savasana) | Restorative / cool-down | side |
| Reclined Twist | Restorative / cool-down | side |
| Legs-Up-the-Wall Pose | Restorative / cool-down | side |
| Reclined Bound Angle Pose | Restorative / cool-down | side |

### Pilates (23)

| exercise | group | view |
| --- | --- | --- |
| The Hundred | Core / abs | side |
| Plank | Core / abs | side |
| Double Leg Stretch | Core / abs | side |
| Single Leg Stretch | Core / abs | side |
| Roll-Up | Core / abs | side |
| Criss-Cross | Core / abs | side |
| Teaser | Core / abs | side |
| Jackknife | Core / abs | front |
| Bridge | Glutes / hips | side |
| Clamshell | Glutes / hips | side |
| Leg Circles | Glutes / hips | side |
| Side-Lying Leg Lift | Glutes / hips | side |
| Side Kick Series | Glutes / hips | side |
| Cat-Cow | Back / posture | side |
| Spine Stretch Forward | Back / posture | side |
| Swan | Back / posture | side |
| Saw | Back / posture | side |
| Swimming | Back / posture | side |
| Shoulder Bridge | Full-body flow | side |
| Roll-Over | Full-body flow | side |
| Corkscrew | Full-body flow | side |
| Boomerang | Full-body flow | side |
| Control Balance | Full-body flow | side |

### Calisthenics (39)

| exercise | group | view |
| --- | --- | --- |
| Wall Push-Up | Push progressions | side |
| Incline Push-Up | Push progressions | side |
| Push-Up | Push progressions | side |
| Diamond Push-Up | Push progressions | side |
| Dip | Push progressions | side |
| Archer Push-Up | Push progressions | side |
| Pseudo Planche Push-Up | Push progressions | side |
| One-Arm Push-Up | Push progressions | side |
| Dead Hang | Pull progressions | side |
| Inverted Row | Pull progressions | side |
| Negative Pull-Up | Pull progressions | side |
| Pull-Up | Pull progressions | side |
| Chin-Up | Pull progressions | side |
| Archer Pull-Up | Pull progressions | side |
| Muscle-Up | Pull progressions | side |
| One-Arm Pull-Up | Pull progressions | side |
| Bodyweight Squat | Leg progressions | side |
| Split Squat | Leg progressions | side |
| Walking Lunge | Leg progressions | side |
| Bulgarian Split Squat | Leg progressions | side |
| Nordic Curl | Leg progressions | side |
| Shrimp Squat | Leg progressions | side |
| Pistol Squat | Leg progressions | side |
| Plank | Core & static holds | side |
| Hollow Body Hold | Core & static holds | side |
| Side Plank | Core & static holds | side |
| Tuck L-Sit | Core & static holds | side |
| Hanging Leg Raise | Core & static holds | side |
| L-Sit | Core & static holds | side |
| V-Sit | Core & static holds | side |
| Wall Handstand Hold | Advanced statics (skill work) | side |
| Planche Lean | Advanced statics (skill work) | side |
| Tuck Front Lever | Advanced statics (skill work) | side |
| Freestanding Handstand | Advanced statics (skill work) | side |
| Handstand Push-Up | Advanced statics (skill work) | side |
| Front Lever | Advanced statics (skill work) | side |
| Tuck Planche | Advanced statics (skill work) | side |
| Full Planche | Advanced statics (skill work) | side |
| Human Flag | Advanced statics (skill work) | side |

### Stretching (59)

| exercise | group | view |
| --- | --- | --- |
| Arm Circles | Dynamic, before training | side |
| Shoulder Rolls | Dynamic, before training | side |
| Cross-Body Arm Swings | Dynamic, before training | side |
| Wall Slides | Dynamic, before training | back |
| Elbow Circles | Dynamic, before training | side |
| Wrist Circles | Dynamic, before training | side |
| Torso Twists | Dynamic, before training | side |
| Prone Press-Up | Dynamic, before training | side |
| Pelvic Tilts | Dynamic, before training | side |
| Hip Circles | Dynamic, before training | side |
| Leg Swings | Dynamic, before training | side |
| Lateral Leg Swings | Dynamic, before training | front |
| Toy Soldier Kicks | Dynamic, before training | side |
| Ankle Circles | Dynamic, before training | side |
| World's Greatest Stretch | Dynamic, before training | side |
| Walking Lunge with Twist | Dynamic, before training | side |
| Wall Hip Hinge Drill | Dynamic, before training | side |
| Squat to Stand | Dynamic, before training | side |
| Knee-to-Wall Ankle Rock | Dynamic, before training | side |
| Inchworm Walkout | Dynamic, before training | side |
| Band Pull-Apart | Dynamic, before training | front |
| Straight-Arm Band Pulldown | Dynamic, before training | side |
| Prone Y Raise | Dynamic, before training | back |
| Scapular Push-Up | Dynamic, before training | back |
| Band Shoulder External Rotation | Dynamic, before training | front |
| Quadruped Wrist Rocks | Dynamic, before training | side |
| Doorway Pec Stretch | Static, after training | back |
| Cross-Body Shoulder Stretch | Static, after training | side |
| Overhead Triceps Stretch | Static, after training | side |
| Upper Trap Stretch | Static, after training | side |
| Thread the Needle Stretch | Static, after training | side |
| Kneeling Lat Stretch | Static, after training | side |
| Biceps Wall Stretch | Static, after training | side |
| Wrist Flexor Stretch | Static, after training | side |
| Wrist Extensor Stretch | Static, after training | side |
| Sphinx Stretch | Static, after training | side |
| Seated Spinal Twist | Static, after training | side |
| Standing Side Bend Stretch | Static, after training | front |
| Knees-to-Chest Stretch | Static, after training | side |
| Figure Four Stretch | Static, after training | side |
| Kneeling Hip Flexor Stretch | Static, after training | side |
| Couch Stretch | Static, after training | side |
| Frog Stretch | Static, after training | front |
| Standing Hamstring Stretch | Static, after training | side |
| Supine Hamstring Stretch | Static, after training | side |
| Standing Calf Stretch | Static, after training | side |
| Bent-Knee Calf Stretch | Static, after training | side |
| 90/90 Hip Switch | Mobility, daily | front |
| Half-Kneeling Hip Flexor Rock | Mobility, daily | side |
| Deep Squat Hold | Mobility, daily | side |
| Cossack Squat | Mobility, daily | front |
| Standing Hip Airplane | Mobility, daily | side |
| Open Book Thoracic Rotation | Mobility, daily | side |
| Quadruped Thoracic Rotation | Mobility, daily | side |
| Foam Roller Thoracic Extension | Mobility, daily | side |
| Foam Roller Chest Opener | Mobility, daily | side |
| Chin Tucks | Mobility, daily | side |
| Prone Scorpion Stretch | Mobility, daily | side |
| Standing Forward Hang | Mobility, daily | side |
