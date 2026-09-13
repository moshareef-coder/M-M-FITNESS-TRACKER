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

**Front view: a thigh may cross the midline too, and the knee is checked by
magnitude.** The same two lifts as the arms, one floor down, and for the same
reason: the frontal projection of a rotated leg is not the sagittal angle the
side view measures.

- `hipFlex` runs to **-95** in the front view instead of -35. Negative is the
  thigh crossing the body. -35 is the side view's number, where it really is
  the limit of hip extension, and for a while it was quietly deciding how far a
  curtsy lunge could cross, how deep a cossack could sit and how a 90/90 could
  fold. A thigh lying across the body is a position most people can sit in.
- `kneeFlex` is checked by **magnitude** in the front view, like the elbow. The
  rig has no femoral rotation, so an internally rotated leg folds its shin
  toward the midline and an externally rotated one folds it away, and only one
  of those two signs survives the projection. A shin folding the wrong way is
  now a contact sheet catch, not a validator catch. Look for it.
- The curtsy lunge is the worked case. Its trailing leg is authored by angles,
  not pinned, because two bone IK between a hip and a planted ankle only has
  two solutions, knee swung wide or knee tucked inside, and neither of them is
  a leg crossing behind. The thigh sweeps 50 degrees across (hipFlex -42) and
  the shin drops from there to a toe planted past the standing foot.

What this did NOT fix, because it runs the other way: a hanging windshield
wiper needs BOTH legs over to one side, and the trailing one then points up and
past its own midline, around 210. The range that opened goes down across the
body, not up over it. That move is still side on.

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
plane, `len` and `w` scale it. `ang` 0 is a foot pointing straight at the
camera, which has to be drawn short and wide (`len` about 0.4, `w` about 1.3);
`ang` 90 is a foot pointing straight out to the side, drawn long and narrow
(`len` about 1.0, `w` about 0.95).

Get the stance right before you pick numbers. Warrior II is set up ALONG the
mat, so both of its feet are long: the front foot points down the mat, which in
this view is out to the side, `{ ang: 86, len: 1.05, w: 0.95 }`, and the back
foot lies along the back edge with the toes turned in a few degrees,
`{ ang: 74, len: 1.0, w: 0.95 }`. Neither points at the camera. For a long time
the front one was short and wide, which is the Warrior I set-up, and it turned
the whole stance ninety degrees without anything looking broken. Extended Side
Angle and Triangle Pose are the same stance and carry the same pair.

`fit` exists because a hanging body under a pull-up bar, or a body standing on a
box, is taller than 140 units. Zoom out; never crop the head.

### Props

Types: `mat, wall, doorway, doorframe, bench, box, roller, pullupBar, dipBars,
machine, cable, band, barbell, dumbbell, kettlebell`.

They either sit in the world (`{ type: "bench", x, y, w, incline }`) or attach
to the body (`{ type: "dumbbell", side: "R", point: "hand", dx, dy, rot, k }`).
`front: true` draws a prop over the figure instead of behind it.

Three that are not obvious:

- **A mat has two forms.** `{ type: "mat", x, w }` is the side view strip on the
  floor under a kneeling or lying figure. `{ type: "mat", top: true, x, y, w, h }`
  is the whole rectangle seen from ABOVE, and it is the only thing that tells a
  reader a top-down pose is a top-down pose. A figure drawn face down with its
  arms in a Y is pixel for pixel a figure standing with its arms in a Y; a
  prone scorpion is a standing twist; a frog stretch is a wide squat. Any move
  with `floor: false`, which is every top-down pose, needs one. Size it to the
  figure's own bounds plus about ten units on each side, let wide limbs hang off
  the sides the way they would in life, and reach for `fit` if the figure has to
  shrink to leave the mat room.
- **A barbell seen from the side is a disc**, not a bar. Drawing the bar
  sideways is the most common way these illustrations look wrong. Add
  `place: "traps"` to rack it across the upper back so it carries with the
  torso.
- **A band sags by its slack**, so give it a `rest` length close to the hand
  separation at the end of the rep. The sag going to zero is the rep.

`dipBars` draws two rails, a dim far one and the near one. One rail side on is
a handrail, and a figure with its hands on the END of a handrail is leaning on
it. Run the rails well past the body in both directions.

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

## Rig v2: the third dimension

The rig is a real skeleton in three dimensions now, projected orthographically.
Everything above still applies: the v1 angles are the IN-PLANE component of each
joint, every one of the 262 moves authored against v1 renders on the same pixel,
and if you never touch a v2 channel you will never notice the difference.

What v2 adds is everything that is made of rotation. Before it, a wrist curl and
a reverse wrist curl were the same drawing, a chin-up and a pull-up were the same
drawing, and a shrug was faked with the spine and neck.

### The anatomical frame

X is anterior (the way the figure faces), Y is down, Z is to the figure's right.
A move's `plane` decides which of those the authored in-plane angles rotate in:

- `sagittal` (X and Y) for side views. This is the default.
- `frontal` (Z and Y) for front views.

The channels below are named for the anatomy, not for the plane, so each one
means the same thing whichever view the move uses.

### The channels, all defaulting to zero

| channel | range | what it is |
| --- | --- | --- |
| `spineTwist` | -55..55 | axial rotation at the chest, + turns the front of the body toward its right |
| `pelvisTwist` | -180..180 | the same at the root, so it rotates the whole figure about its long axis |
| `neckTwist` | -80..80 | the head turning |
| `torsoRoll` | -45..45 | lateral flexion, + toward the figure's right |
| `shoulderFwdL/R`, `hipFwdL/R` | free | anatomical flexion, added to the in-plane angle where they coincide |
| `shoulderAbdL/R` | -45..185 | abduction away from the midline; negative crosses the body |
| `hipAbdL/R` | -40..80 | the same for the leg |
| `shoulderRotL/R` | -95..95 | axial rotation of the humerus, + external. Sets which way the elbow bends |
| `hipRotL/R` | -50..65 | axial rotation of the femur, + external. Clamshells, 90/90, frog pumps |
| `forearmPronL/R` | -95..95 | + pronation (palm turns to face back or down), - supination. 0 is neutral |
| `shoulderGirdleElevL/R` | -4..9 units | shrug. Not degrees: it moves the shoulder anchor along the torso |
| `shoulderGirdleProtL/R` | -5..8 units | protraction, + forward. Scapular push-ups |

Three things worth knowing about them:

- **They ride on top, they do not replace.** `shoulderR: 40, shoulderFwdR: 20`
  is 60 degrees of flexion. The in-plane channel stays the primary one.
- **A twist carries everything above it.** `spineTwist` turns the chest, and the
  arms hang off the chest, so they come with it. `pelvisTwist` turns the lot.
- **External rotation moves the joint below, not the joint itself.** A clamshell
  is the classic trap: `hipRot` spins the femur about its own axis, so with a
  bent knee it sweeps the SHIN and the knee barely moves. What lifts the knee is
  `hipAbd`. The real exercise is both, and so is ours.

### The camera

`view` is a preset name or an object:

```js
view: "side"                              // sagittal, straight on. The default.
view: "front"                             // frontal, straight on
view: "back"                              // frontal from behind
view: "top"                               // looking down
view: { yaw: 30, plane: "sagittal" }      // three quarters
view: { yaw: 18, pitch: -24, plane: "sagittal" }
```

`yaw` and `pitch` are degrees away from the move's own plane, so `{ yaw: 0 }` is
always exactly what a v1 author drew. Always state the `plane` explicitly.

Depth sorting happens per frame, so limbs pass in front of and behind the torso
correctly at any angle, and a limb pointing at the camera foreshortens honestly
instead of being drawn at full length. Draw order is depth; the near/far tone
still follows the near side, flipping once the camera passes 90 degrees, because
a limb that changes colour mid-orbit reads as a bug.

**Props stay in screen space.** They are scenery, not skeleton, so a yawed
camera moves the figure and not the bench. Nudge the prop `x` by hand when you
yaw a move that stands on something.

### What a three-quarter view changes

Go back to step 0 and ask the question again. Three quarters is not a nicer side
view, it is a different set of trade-offs:

- It shows **rotation**, which is the only view that does. Twists, hip rotation,
  anything that happens around the body's long axis.
- It **costs you the clean silhouette**. A squat's hip and knee angles read
  perfectly at yaw 0 and get muddier at every degree after that. If the thing
  that MUST be visible is a joint angle in the sagittal plane, stay at yaw 0.
- Useful range is about **20 to 40 degrees**. Past 45 you are in a front view
  with none of a front view's symmetry.
- It **does not fix foreshortening**, it trades which limb suffers from it.

### Muscles that fire (OFF in the product)

Mo cut muscle highlighting and the anatomy skin from the product: the plain skin
is the only one that ships. The code below stays in the rig because the anatomy
skin is useful for checking that a move works the muscle it claims to, but
nothing in the app turns it on, and **the plain skin ignores `lit` entirely**, so
a stale caller passing muscles cannot light anything. Do not add `litPeak` or
`litFloor` to new moves; the validator still range checks them for the moves that
already carry them.

The anatomy skin can light the muscles a move works. The caller passes which
ones and one colour:

```js
mountMove(canvas, "Goblet Squat", {
  skin: "anatomy",
  lit: { muscles: ["quads", "glutes"], color: "#e0521f" },   // the PEAK colour
});
```

Intensity is not the caller's job, it is the move's. A muscle fires through the
rep and lets go at the other end, so the plate ramps between a resting tint and
the passed colour, and the resting tint is that same colour mixed back toward
the plate. A muscle at rest still reads as the muscle this exercise works.

The default curve, by loop style:

| loop | curve | peaks at |
| --- | --- | --- |
| `pingpong` | ramps to the working end of the rep and eases back, smoothstepped | cycle 0.5, the far keyframe: the bottom of a squat, the top of a curl |
| `hold` | a slow breathing pulse, because a held position is still working | cycle 0.5 |
| `oneway` | ramps through the drill and releases as it resets | cycle 0.82, the far keyframe |

Two optional per-move fields override it:

```js
litPeak: 0.35,     // cycle position of peak effort. Default: the far keyframe.
litFloor: 0.2,     // resting intensity, 0..1. Default 0.35.
```

Use `litPeak` when the hard part is not the far end of the rep. A kettlebell
swing peaks on the way up, not at the top; a negative peaks on the way down.
Use `litFloor` 0 for a move where the muscle genuinely switches off between
reps, and leave it alone otherwise: at 0 the plate falls back to plain grey and
the card stops saying which muscle the exercise is for.

Off-centre peaks wrap correctly (the distance is measured around the cycle), and
a caller that needs a fixed value can still pass `intensity` in the `lit` object
to pin it. The mannequin skin, which is the one that ships, ignores all of this.

### Hands

The hand is a soft rounded mitt at every size: no fingers, no thumb, no knuckles.
The fingered hand is gone from the rig, not merely switched off, so there is no
flag that can bring it back. Mo saw it on the approval sheet and it read as a
claw at 320px and as porridge at 160px, and on a bar it fought the prop.

Five grip states, picked automatically and overridable with `grip: { R: "flat" }`.
They change the SHAPE of the mitt, not its parts:

| state | when | looks like |
| --- | --- | --- |
| `open` | default | the neutral rounded end |
| `flat` | the hand is on the floor (detected) | a longer, flatter paddle |
| `closed` | a barbell, dumbbell, kettlebell, cable or band is on that hand | short, flattened against what it holds |
| `fist` | authored | shortest and thickest |
| `hook` | a pull-up bar prop | short, slightly flattened |

The mitt is still oriented by `forearmPron`, so a wrist curl and a reverse wrist
curl are still different pictures.

**A flat hand ignores the hand frame.** A hand resting on a surface lies ALONG
it, palm down, fingers toward the head end of the body, so the flat grip takes
the floor tangent instead of the authored wrist angle: the forearm's own forward
direction, flattened, falling back to which way the head is when the forearm is
near vertical (a handstand). The authored wrist angle in a push-up is 86, and
rotating the mitt by it stood the hand on its heel pointing at the ceiling. The
centre line also tilts by the difference between the root and tip radius so the
UNDERSIDE is level: a flat hand is a paddle on a surface, not a wedge.

**What counts as flat is decided by the WRIST**, never by where the hand point
landed, which was circular: a hand drawn standing on its heel never read as flat,
so it never got laid down. The floor counts, and so does the top of a `bench` or
a `box`, because a hand on a bench is a hand on a flat surface.

### Worked example: a twist (Russian Twist)

```js
const RUSSIAN_TWIST = {
  view: { yaw: 34, plane: "sagittal" },    // three quarters, to see the rotation
  loop: "pingpong",
  keys: [
    { t: 0, root: { x: 62, y: 100, rot: -35 },
      joints: { spineTwist: 36, hipR: 145, kneeR: 70, /* ... */ }, ik: { /* ... */ } },
    { t: 1, root: { x: 62, y: 100, rot: -30 },
      joints: { spineTwist: -36, hipR: 140, kneeR: 66, /* ... */ }, ik: { /* ... */ } },
  ],
};
```

The V-sit is authored exactly as it was in v1, in the sagittal plane. The only
new numbers are `spineTwist` swinging through 72 degrees and a yawed camera to
see it happen. v1 could draw the sit or the twist, never both.

### Worked example: a roll (Reclined Twist)

```js
view: { yaw: 18, pitch: -24, plane: "sagittal" },
// t 0
joints: { pelvisTwist: 0, spineTwist: 0, hipR: 290, kneeR: 140, /* ... */ }
// t 1
joints: { pelvisTwist: -62, spineTwist: 40, hipR: 254, kneeR: 143, /* ... */ }
```

Knees fall one way, shoulders stay down. That is `pelvisTwist` rotating the whole
body about its long axis and `spineTwist` giving 40 of it back at the chest, so
the shoulders stay near the floor while the hips turn. The opposition between the
two is the entire stretch, and the pitched camera is what shows it.

**The one that did not work.** Side Plank was tried as `pelvisTwist: -72` plus a
three-quarter camera, to roll the body onto its side properly instead of faking
the stack with extreme shoulder numbers. The roll itself is correct. The arms
are not: they were authored as in-plane angles against a flat side view, so
carrying them round the long axis folds them into the torso. Rolling a body needs
its limbs authored in the rolled frame from the start. It was reverted, the v1
pose stands, and the comment in the move says so.


---

## Rig v3: the figure

The skeleton and every angle are unchanged. What changed is the body that hangs
on it, because the v2 figure read as a doll: a big head, a short torso and a
neck you could not see.

### Proportions

Measured against standard adult fractions of stature, anchoring on hip height
(thigh + shin + ankle = 56.4 units), which puts stature at 56.4 / 0.53 = 106.4
rig units:

| | v2 | v3 | human |
| --- | --- | --- | --- |
| torso, pelvis to shoulder | 27 | **30** | 30.6 |
| torso as a fraction of hip height | 0.479 | **0.532** | 0.543 |
| neck plus head above the shoulder | 28.1 | **22.7** | 19.4 |
| shoulder half width | 11.5 | **12.6** | 12.9 |
| hip joint half width | 6.9 | **6.2** | 5.3 |
| hand, wrist to hand tip | 7.5 | **8.6** | 11.5 |
| total height, rig units | 111.5 | **109.1** | 106.4 |
| total height in heads | 7.0 | **7.5** | 7.5 |

**Leg lengths and hip height are deliberately untouched.** Every authored move
pins its feet in absolute units, so changing the legs would move 262 moves'
contact points. Changing the torso and head moves nothing that is pinned, which
is why the migration below was possible at all.

Three of these are still short of human on purpose. The head stack is 3 units
tall because a truly human head on this body looks like a pinhead at 160px. The
hand is short because the drawn hand is a rounded mitt, and at full human length
it reads as a paddle. The hip joints stay wider than anatomy because the
legs are drawn as capsules and a true 5.3 puts the thighs in contact.

### What the migration did

Growing the torso moves the shoulders 3 units further from the pelvis, and every
absolute wrist pin was authored against where the shoulders used to be. So:

1. **Pins that hold something that moves with the body** (a dumbbell, a cable
   handle, a bar in the hands) were shifted by the same 3 units along the torso
   axis. 378 pins across the seven move files.
2. **Pins that hold the world** (a hand on the floor, on a pull-up bar, on a
   door frame) were left exactly where they were. Those are contacts.
3. **Ten keyframes** where the supporting arm could no longer reach a world
   contact were fixed: eight by sliding the whole body toward the contact
   (dips, L-sits, a planche) and two by flattening the body angle with the hips
   compensated so the feet stayed put. One, Planche Lean, was reverted because
   the fix put the hand through the floor, which is worse than an arm two units
   short.

The proof is a contact harness that solves every move at 24 points in both the
old and the new rig and asserts that anything touching the world still touches
it: a pinned ankle within 0.5 units, a hand on the floor still on the floor
within 1 unit, and a hand on a plane allowed to slide along that plane but not
leave it. 13,790 contacts checked. Pins the old rig could not reach either are
reported separately and not counted, because there was no contact to preserve.

### Head, neck, hands, feet

- **Head** is three or four circles hulled together rather than an egg: cranium
  set back and high, brow, jaw, chin, plus an ear. Front on it is a tapered
  oval, wide at the temples and narrower at the jaw.
- **Neck** flares into the shoulders instead of standing on them like a peg.
  The wide bottom circle is the trapezius and it is most of what stops the head
  reading as a ball on a stick.
- **Mitt** (the card-size hand) has a thumb on the real thumb side, so pronation
  still shows, and two knuckle hints across the back.
- **Foot** has a squared heel, an instep, an arch and a blunt toe box. Note that
  `BODY.foot` is ankle to toe and the heel adds 4 behind it, so the drawn foot
  is already 16 units against a human 16.2. It did not need lengthening, and
  lengthening it put toes through the floor in every pose with a pointed foot.

### Anatomy plates

Reshaped from ovals to the silhouettes on the purchased Rive body, drawn as
chains of circles rather than single capsules:

- deltoid cap over the joint, tapering a third of the way down the arm
- pec fan from the sternum out to the armpit
- lats sweeping from the lower back up into the armpit (side view) or as wings
  under the armpits (back view)
- quads as one long mass with the teardrop above the knee
- hamstrings tapering at both ends, calf belly high on the shin
- seen from behind (`facing: "away"`), the torso draws traps, lats and spinal
  erectors instead of pecs and abs. Showing someone's chest on their back was
  the single most obviously wrong thing the anatomy skin did.


---

## Rig v4: skin, not armour

v3 got the proportions human and the figure still read as a space suit. The
cause was the seam treatment: every capsule carried its own knockout outline and
its own offset shade plate, so the body read as a set of armour segments, and on
the head that inner plate sat exactly where a visor would.

**Seams only where a body creases.** Shoulder cap, upper arm and forearm are now
one shape with one run of shading; hip, thigh and shin likewise. The outlines
that remain are the ones a real body shows at 160px: neck to torso, armpit,
waist, groin, wrist and ankle (the hand and foot are still their own shapes).

**Creases replace seams at the elbow and knee.** A crease is thin, soft, stops
short of the silhouette, and **only appears when the joint is bent**, deepening
with the bend. A line drawn across a straight limb is not a crease, it is a scar,
and the first version of this looked exactly like one.

**The head** is one silhouette with one soft shade down the shaded side and a
hair mass clipped to the skull, giving a hairline. No inner plate. Still
faceless: the hairline is a shape, not a feature.

**`restPose(view)`** is exported from the rig: a canonical figure at rest for
placeholders and empty states, with a couple of degrees of posterior pelvic tilt,
the upper spine curving forward over it, soft knees, elbows carrying some
flexion, relaxed wrists and feet that are not quite level. It is not a library
move and authored moves must not import it.

`shoulderW` went 12.6 to 13.4 so the arms hang beside the body rather than
against it in the front view. Human half biacromial is 12.9; the extra half unit
buys the daylight that makes arms read as arms.


## Rig v5: matched to the reference sheets

Mo generated two reference sheets, `reference/figure-turnaround.png` and
`reference/figure-muscles.png`, and approved them as the look. Everything below
is the rig moving toward them. If you are changing how the figure is drawn, open
both sheets first, then render `motion-lab.html?sheet=compare`.

**One outline for the whole body, not one per segment.** This is the change that
finally killed the armour look. `drawFigure` runs the same draw calls twice: the
first pass sets the module level `COLLECT` and gathers every capsule instead of
painting, and the union of those capsules is stroked once in `C.seam`; the
second pass paints the fills with `LINES` off, which downgrades every per part
outline to a light hairline in `C.seamSoft`. So the silhouette is one dark
contour and the internal boundaries are faint lines that only say where one form
laps over another. Before this, an arm laid across the chest carried its own
dark ring over the chest, and at 160px that is indistinguishable from a chest
plate.

If you add a draw function, it must go through `part()` or `hull()` so it is
collected, and anything that is inner detail rather than silhouette (creases,
torso lines, anatomy panels, knuckles, hair, the ear) must start with
`if (COLLECT) return;`. Forgetting the guard paints inner detail into the
outline pass and thickens the contour in a way that is hard to spot.

**The palette is sampled off the sheets, not invented.** Body `#bbb8b5`, its
shadow `#a6a3a0`, far side `#8e8c8a`, hair `#807f7f`, contour `#2a2d30`, the
light internal line `#6f6d6c`, muscle panels `#989694`, lit `#dc551e`. The body
is deliberately **not** accent tinted: the reference body is a neutral warm grey
and tinting it green was most of what made the figure read as a prop. The accent
survives on the floor line and in the UI around the canvas.

**One shade band per form, on one side.** `shadeSide` fixes the light at the
upper left for the whole figure, so every crescent falls on the lower right.
Two lights, or a shade that follows each limb's own direction, reads as plastic.

**The trapezius yoke.** The torso draws a capsule from the base of the neck out
to each shoulder joint before the chest. Without it the neck stands on a flat
shelf and the deltoids read as pads bolted to the corners of the torso; the
reference has one unbroken slope from ear to shoulder.

**Hands.** One rounded mitt at every size, shaped by the grip. See Hands above:
the fingered version was cut after the approval sheet and the code is gone.

**A horizontal body does not crane its head.** When the torso is horizontal and
the chest faces the floor (prone, plank, quadruped, hinge), neck extension past
about 12 degrees puts the face above the line of the spine and the figure reads
as looking at the ceiling, showing its crown to the camera. The house limit for
those poses is `neck: -12`, which puts the gaze slightly ahead of straight down,
about a hand's width in front of the hands. Deliberate exceptions, where the
extension IS the exercise, keep more: Cobra Pose, Upward-Facing Dog, Sphinx
Stretch, Prone Press-Up, Superman, Revolved Triangle, World's Greatest Stretch,
the cow half of Cat-Cow, and Crow Pose, whose gaze is cued forward. A standing
or seated move keeps the gaze level and is not affected.

**The ear sits behind the cheekbone**, not on it. At one unit forward it landed
in the middle of the face and read as a single staring eye. This is the kind of
thing only a render shows you.

**Anatomy panels** are mid grey on the light body, separated by the body colour
showing through rather than by dark lines. They are off in the product: the
anatomy skin and muscle highlighting were both cut, and `render()` only builds a
`lit` object when the palette's skin is `anatomy`. The panels stay in the rig as
a checking tool. Panels are drawn for near side limbs only; a far side limb in a
lunge or a Warrior II shows none, which is deliberate.

**The cost of the second pass.** Drawing the body twice roughly doubles the
canvas work: 0.451 ms per figure per frame at 160px and 0.410 ms at 320px, so a
screen showing twelve animated figures spends about 5.4 ms a frame drawing them,
against a 16.7 ms budget. That was measured with `/tmp/v2sheet/perf.html`. A
single compound `Path2D` for the outline measures no faster than stroking each
capsule, so the outline stays a plain loop.

**What still does not match the sheets**, so nobody rediscovers it: the head is
rounder and a little larger than the reference skull; the limbs are tapered
capsules rather than the reference's anatomical swells at the biceps and calf;
the feet have a heel, arch and toe box but no separated toes; and the hand is a
mitt by decision, not by limitation.


## Two bodies

There is a second proportion table, `BODY_FEMALE`, matched to
`reference/figure-female.png`. It is the SAME skeleton: every bone length is
identical and so is `rAnkle`, which means hip height and `LEG_TO_FLOOR` are
identical, which is the whole reason every authored foot pin stays valid on
either body. Only widths differ.

Pick it with `body: "female"` on `mountMove`, as the fourth argument to
`palette`, as `opts.body` on `render`, or as the third argument to `solvePose`
when a harness wants to measure one body without disturbing another. The lab has
a Female body button and takes `?body=female`. Default is `male` everywhere.

Internally the rig reads from `ACTIVE`, set by `useBody()`. If you add a draw
function, read `ACTIVE`, never `BODY`, or it will ignore the switch.

What changes, and why each one:

| | male | female |
| --- | --- | --- |
| `shoulderW` | 12.6 | **11.2** |
| `hipW` | 6.2 | **7.0** |
| `rChest` | 10.6 | **9.6** |
| `rWaist` | 7.0 | **6.4** |
| `rPelvis` | 8.4 | **8.8** |
| `rHip` | 7.2 | **7.4** |
| `rShoulder` / `rDelt` | 6.2 / 6.6 | **5.5 / 5.8** |
| `rUpperArmMid` / `rForearmMid` | 5.5 / 4.4 | **4.8 / 3.9** |
| `rKnee` / `rCalf` | 5.5 / 5.6 | **5.0 / 5.2** |
| `rHeadBack` / `rHeadJaw` | 6.8 / 5.0 | **6.4 / 4.5** |

Two fields exist only on the female table. `bust` and `bustAt` place the soft
convex curve the sheet draws on the front of the torso, and it is drawn in the
SIDE view only: face on, the same shape is two circles stuck to a flat chest,
which is not what the sheet does. `bun` is the hair knot at the back of the
skull, drawn before the outline pass returns so it is part of the silhouette
rather than a sticker on top of it.

**Widths move contacts, so both bodies are gated.** The validator samples every
move on both tables, and a floor penetration or an illegal angle on either one
fails the run. A contact harness compares the two: worst pin drift between them
is 0.503 and worst floor drift 0.438, both inside tolerance.

Three pins sit at the very edge of the leg's reach once the hip joint moves out
0.8 units, so they carry an explicit `tol` on the pin rather than being
re-authored: `Frog Pump` ankleR (0.9), `Side Bend` ankleL (0.9) and
`Half Moon Pose` ankleR (1.0). `tol` is not geometry. The rig ignores it; it
says how much slack a contact check is allowed on that pin, and `lerpIk` carries
it through pose interpolation so a harness can read it off a sampled pose.


## The top view, and what a frontal plane does to a knee

Two things caught me out authoring the back view pull-ups and the top down
Russian Twist. Both are about which plane a channel acts in.

**In a frontal move, `hipAbd` is the OUT of plane channel and `knee` is the in
plane one.** `hipAbd` goes through `outPlane`, so in a front or back view it
swings the leg forward and backward, invisibly. `knee` goes through `inPlane`,
so a bent knee swings the shin sideways across the screen. That is why a hanging
figure with bent knees reads as a frog from behind: the shins fly out laterally
instead of folding back. To fold a knee backward in a frontal view, pin the
ankle and give the pin `pole: [0, 0, -1]`, the lateral axis, which puts the bend
in the sagittal plane where it belongs. Watch the sign: with that pole,
`bend: 1` bends the knee the human way and `bend: -1` hyperextends it, which the
validator catches as a negative `kneeFlex`.

**A pin at the edge of reach is fragile authoring.** The first back view hang put
the wrist 35 units from a shoulder with 37 units of arm, and that one clamped on
one body and reached on another, which the contact harness saw as the pin
moving. Leave a few units of margin; on the pull-ups that meant hanging from
`root.y 71` rather than 74.

**Screen space pins cannot move laterally in a sagittal move.** An `ik` target
written as `{ x, y }` is a screen point, and `inLimbPlane` slides it into the
limb's own plane, which for a sagittal move means discarding its lateral
component entirely. A Russian Twist authored that way has hands that never
leave the midline. Give the pin an explicit `z` instead: `{ x, y, z }` is a
WORLD target, taken as is, with x running head to feet, y height (larger is
lower) and z the body's own left to right. `lerpIk` interpolates z along with
x and y.

**The `mat` prop knows about the camera.** Seen edge on it is a stripe below the
figure, which makes a top view read as a side view of somebody floating. Past
55 degrees of pitch it draws as a rectangle on the floor under the body instead.
Any prop that is really a floor patch should do the same.

**The top view is legible but dense.** Looking straight down, this rig has no
depth cue except draw order: everything is the same flat grey with one
silhouette, so limbs that overlap merge. It works when the exercise's whole
point is rotation about the body's long axis, which is the one thing side and
front cannot show, and only if the moving part is pushed well clear of the
torso outline. A steep three quarter pitch, around -64, is far more legible and
still reads as looking down, so prefer it unless a true overhead is the point.


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
10. **A rotation channel moves the joint BELOW it.** hipRot sweeps the shin,
    not the knee; shoulderRot sweeps the forearm, not the elbow. If you want the
    knee to travel, that is hipAbd.
11. **Deep folds read as blobs.** At the bottom of a real push-up the elbow sits
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

What it looks like: a wide stance set up ALONG the mat, front knee bent to
about 90 with the shin vertical, front foot pointing down the mat, back leg
straight with its foot along the back edge of the mat and the toes turned in a
few degrees, arms reaching level in opposite directions. Must be visible: the
width of the stance and the bent front knee. Front view, because side on it
collapses into one leg and one arm.

```js
const WARRIOR_II = {
  view: "front",
  loop: "hold",
  dur: 6.2,
  breath: 1.0,
  breathRate: 0.8,
  farSide: "L",
  // both feet long: the front one down the mat, the back one along its back
  // edge with the toes turned in. Neither foot points at the camera.
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
```

`farSide: "L"` is what makes the back leg and arm draw in the dimmer tone. Leave
it out on a genuinely symmetric move (band pull-apart, doorway pec stretch) or
one half of the figure reads as a lighting mistake.

The feet are the part of this that was wrong for a long time, and it is worth
saying why it survived review. The front foot was authored short and wide, the
camera-facing shape, and the back foot long. That is a real stance, it is just
Warrior I: square to the front with the back foot turned out. Every other line
in the entry was Warrior II, so nothing looked broken and the picture read as a
confident pose of a different one. If a move has a mat, work out which way the
mat runs before you pick a foot angle.

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
