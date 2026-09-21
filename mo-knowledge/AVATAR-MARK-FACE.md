# Putting the mark on his face, everywhere

Mo approved the dumbbell-as-face design in the announcement film and wants it
on every robot in the app. This is the handoff: what the design actually is,
where the two faces live, what changes, and the three calls that are Mo's to
make before anybody writes code.

Written 2026-09-20 from the film's own implementation, not from memory.

## What the approved design actually is

From `unio_face()` in `scripts/make-brand-film.py`, which is the thing Mo
looked at and said yes to:

- The **mark replaces the visor and both eyes.** The logo's two lime pads land
  exactly where the rig's two lime eyes were, scaled so the pad pair spans the
  width the drawn eyes spanned.
- The **mouth and the chin light stay.** They are lifted off an ordinary
  buddy-faced render as their own pixels, not as a rectangle, so none of the
  visor above them comes with it.
- **Blinking squashes the pads**, using the same `blink_bar()` the end card
  uses on the logo itself. His face and the logo close their eyes with the
  same code because it is the same drawing.

So: mark for the eyes, buddy for the mouth. Not a wholesale replacement.

The film measured pixel runs to find the eyes because it was a post-process on
finished PNGs at 2160px, offline, 207 frames. **None of that measuring ports.**
Both live implementations already know where the eyes are analytically.

## There are two robot faces, not one

They are completely independent and both have to move or the Home bubble and
the session figure become different characters.

### 1. `robotFaceSVG()` -- index.html:13152 -- OURS

SVG markup. One function, **12 call sites**: the intro (10707), onboarding
(13095, 41465), home hire (17506), hire pitch (18639), paywall (18697), the
rbr torso (22118), the activity heroes (22653, 22845), the home quip avatar
(28949), the workout bot (32972), the recovery bot (33944).

Change the function, all twelve change. The pieces to swap:

```
<rect x="31.7" y="25.1" width="32.6" height="19.3" rx="4.5" fill="var(--rb-visor)"/>
<path class="rb-eye" d="M35.8 32.4 ..." fill="var(--accent)" .../>
<path class="rb-eye" d="M60.2 32.4 ..." fill="var(--accent)" .../>
```

That rect is the visor and those two paths are the eyes. The mark's own art is
already in the repo: `brand/vector/unio-bar.svg`, and it already ships to the
app as `logo/unio-bar.png` (the boot animation uses it). Inline the bar's paths
into the same 64x64 viewBox in place of those three elements and keep
everything else.

Palette lives in `--rb-body / --rb-shade / --rb-line / --rb-visor` at
index.html:47 and :119, light and dark.

This half is editable by any session today. No permission needed.

### 2. The rig's `buddy` face -- knowledge/motion/rig.mjs:1024 -- NOT OURS

Canvas, procedural, drawn on every `[data-fig]` figure in the app.
`knowledge/` is read only for Claude sessions (see the root CLAUDE.md); this
needs a LIBRARY-REQUESTS.md entry or the human collaborator.

The good news is the rig already computes the exact geometry the mark needs,
in the same block that draws buddy:

| what | value |
| --- | --- |
| visor centre | `vis` |
| direction the visor runs | `along` |
| visor half width / half height | `R * 0.8`, `R * 0.42` |
| eye positions | `eyeAt`, at `eyeSpread = R * 0.36` |
| eye height / width | `R * 0.26`, `R * 0.105` |
| head radius in device px | `px` |
| blink | `(FACE_TIME % 4.3) < 0.11` |

A `mark` face style draws the plate at the visor capsule and the two pads at
`eyeAt` sized to `eyeH`. No measuring, no image loading, same coordinates
buddy already uses.

### Switching the rig on, app side

`mountMotionFigures()` at index.html:38198 is the single chokepoint for every
figure in the app, and it currently **passes no `face` at all**, so everything
gets the rig default `STYLE.face = "buddy"` (rig.mjs:2943).

Two ways in, and they are not equal:

- `setStyle({ face: "mark" })` once at boot. Works with **no change to
  index.mjs**, but it is global, so the harness and the lab lose buddy too.
- `mountMove()` forwards `opts.face`. It currently reads theme, accent, skin,
  mood, body, lit, view, speed, t, paused and drops face on the floor
  (index.mjs:185). Forwarding it is a two line change in `knowledge/` and is
  the cleaner answer, because then the one line in `mountMotionFigures()`
  decides per figure.

Either way the app-side change is one line.

## Three calls for Mo before anybody writes code

These are real, they are not theoretical, and getting them wrong means
shipping a worse robot than the one we have.

**1. The mark does not survive thumbnail sizes.** Buddy already gives up below
a head radius of 11 device pixels and falls back to "two soft lime marks,"
because real eyes would be a smudge at that size. The mark is strictly more
detail than buddy's eyes: two pads, a plate, and the outer plate blocks. It
will mud out earlier, not later. The app draws figures at thumbnail size in
`.upnext-fig`, `.cb-fig` and `.ex-icon`. The film ran at 2160px with his head
filling a 1080 wide frame, which is not the same problem.
**Decide:** does the mark face fall back to the current buddy eyes below some
size, or do thumbnails keep buddy permanently?

**2. The mark has one expression; buddy has five.** Buddy changes its eyes for
neutral, happy, focused, surprised and sleepy, and the app uses them: the
session card sets `data-mood` from what just happened, and the plan preview
sets `data-mood="sleepy"` (index.html:31386). Blink ports fine, the film
already solved it by squashing the pads. Happy, focused and surprised have no
mark equivalent.
**Decide:** design mark variants for the moods, or accept that the robot stops
reacting.

**3. Side on, a front facing logo is incoherent.** Plenty of moves are drawn
from the side, and buddy handles it by wrapping the visor to the front half of
the head with the ear clear (`latLen < 0.28`). The film was one hundred per
cent front on and never hit this.
**Decide:** mark front on and buddy in profile, or a squashed mark in profile.

## Suggested sequencing

1. Mo answers the three above.
2. `robotFaceSVG()` first. Ours, one function, twelve surfaces, and it covers
   everything a new user or a screenshot sees: intro, onboarding, paywall,
   home. Ship it and look at it.
3. File the rig request once the SVG version has settled the look, so the ask
   to `knowledge/` is one request with the answers in it rather than three.
4. One line in `mountMotionFigures()` when the style lands.

Doing 2 before 3 is deliberate: the SVG face is where the look gets argued
about, and it costs nothing to redraw. The rig style should be specified once
and specified correctly.
