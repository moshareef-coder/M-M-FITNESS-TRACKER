# Putting the mark on his face, everywhere

Mo approved the dumbbell-as-face design in the announcement film and asked
for it on every robot in the app. **Shipped**, both halves: `robotFaceSVG()`
(5219faa) and the rig's exercise figure (4708f66, profile handling in
5d93daf). What follows was the handoff plan written before any of that
existed; kept as a record of what the design actually is and the one call
that is still genuinely open, not as a to-do list any more.

Written 2026-09-20 from the film's own implementation, not from memory.
Updated the same day once both halves shipped.

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

### 2. The rig's `buddy` face -- knowledge/motion/rig.mjs -- NOT OURS

Canvas, procedural, drawn on every `[data-fig]` figure in the app.
`knowledge/` is read only for Claude sessions as a standing rule (see the
root CLAUDE.md); Mo asked for this edit directly rather than routing it
through LIBRARY-REQUESTS.md, which is why it happened in here at all.

**Shipped as `FACE === "mark"`**, one part of buddy's own drawing swapped
rather than a new face bolted on beside it: the visor fill and the eye loop
are replaced, mouth, grille, chin light, ear disc and the tiny-size
fallback are shared and untouched. Two drawing functions, both in rig.mjs
right above the face block:

- `drawMarkFace(ctx, vis, along, halfW, squash, dark, lime)` -- face on. The
  mark's real seven rects (`brand/vector/unio-bar.svg`, re-measured not
  re-drawn), rotated onto `along` and scaled so the mark's own outer width
  matches the visor capsule's width, `halfW * 2`.
- `drawMarkEye(ctx, center, scale, squash, dark, lime)` -- profile. One
  housing plate and its pad, upright rather than rotated. The full mark does
  not have a rotation that looks right in profile, since its width assumes a
  face-on view; a single plate is what a dumbbell actually looks like turned
  edge on, and a plate-plus-centred-pad is left-right symmetric so it needs
  no "along" at all.

Which one draws is `latLen < 0.28`, the exact test buddy already uses to
decide whether its own visor wraps to the front of the head. `squash` is
`blink || mood === "sleepy"` in both, reusing buddy's own blink clock, so a
blink looks like the same eye closing whichever one is on screen.

`mountMove()` forwards `opts.face` through to `render()` and exposes a live
`ctl.setFace()` alongside its other live setters (setTheme, setMood, ...),
so a caller can flip a mounted figure's face without remounting it.

### Switching the rig on, app side

`mountMotionFigures()` at index.html now passes `face: "mark"` on every
mount. Was the one line the plan said it would be.

## What was three open calls, now one

**1. Thumbnail sizes: turned out to be moot.** The tiny-size fallback ("two
soft lime marks," below an 11 device pixel head radius) sits before the
buddy/mark branch and is shared code, so both faces already converge to the
same simplified dot at thumbnail size. Nothing to decide.

**2. The mark has one expression; buddy has five. Still open, deliberately.**
Blink and sleepy port (both squash the pad the same way). Happy, focused and
surprised have no equivalent on a fixed rounded-rect pad the way they do on
a drawn eye, so they quietly draw the neutral mark rather than a guessed
shape. This is a real design gap, not a bug: **decide** whether the mark
gets mood variants, or the robot's moods stop showing once the mark is on.

**3. Side on: shipped, `drawMarkEye`, see above.** Was "mark front on and
buddy in profile, or a squashed mark in profile" in the original plan; ended
up being neither guess. Mo saw the gallery, said the side-on figures still
looked like the old face, and asked for it fixed rather than left open.
