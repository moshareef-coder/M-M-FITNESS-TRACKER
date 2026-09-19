#!/usr/bin/env python3
"""Redraws the Unio mark as vector.

    python3 scripts/make-logo.py

The shipped mark is a raster that will not survive being looked at closely: the
ring is 842 wide by 810 tall so it is not round, the arc caps are clipped flat
by the top edge of the canvas, the two arcs are different thicknesses, the
dumbbell is off centre by a few pixels, and the shadows have picked up the
orange arc's colour and smeared it into a brown halo around the plates. None of
that is fixable by retouching a bitmap.

Every measurement here was taken off that file, so the shape is the same mark.
What changes is that it is now drawn rather than photographed: round, centred,
even, and resolution independent.

Two treatments, because the choice is a real one. "flat" matches the app, whose
robot and whole interface are flat vector. "depth" keeps some of the moulded
feel of the current mark, but with one light source and one shadow instead of
several disagreeing with each other.
"""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "brand/vector"

# The mark's own proportions, measured from brand/unio-mark.png and scaled so
# the ring's outer diameter is 1000 inside a 1024 box.
S = 1000 / 842
C = 512.0
STROKE = 98 * S
R = (1000 - STROKE) / 2          # centreline radius of the ring
GAP = 2.4                        # degrees of clear air where the arcs meet

PLATE_W, PLATE_H, PLATE_R, PLATE_X = 124 * S, 316 * S, 40 * S, 139 * S
OUTER_W, OUTER_H, OUTER_R, OUTER_X = 96 * S, 215 * S, 32 * S, 228 * S
# The bar runs all the way from one plate's centre to the other, so its ends are
# buried under the plates and there is no seam for the background to show
# through. Drawn only as wide as the visible span, a rounding difference of a
# pixel or two opens a white sliver either side, which is the single worst
# thing about the mark it replaces.
BAR_H, BAR_R = 113 * S, 22 * S
PAD_W, PAD_H = 53 * S, 157 * S

# The app's own tokens, not the raster's approximations of them. The arcs are
# the two people, and they are the same two colours their rings are drawn in on
# the dashboard, so the logo is literally that screen at a glance. The pads take
# the shared accent, which is the colour the app reserves for a shared win.
BLUE = "#2d6bff"       # --me
ORANGE = "#ff6b4a"     # --partner
PAD = "#a8ff00"        # --accent
# Mid grey, not near black. The boot screen paints on var(--bg), which is white
# in one theme and almost black in the other, and a near-black dumbbell simply
# vanishes on the dark one. This was measured against both grounds: darker than
# this disappears on black, lighter than this goes weak on white.
PLATE = "#4c565d"


def at(a):
    """A point on the ring, a degrees clockwise from the top."""
    t = math.radians(a)
    return C + R * math.sin(t), C - R * math.cos(t)


def arc(a0, a1, sweep):
    x0, y0 = at(a0)
    x1, y1 = at(a1)
    return f"M {x0:.2f} {y0:.2f} A {R:.2f} {R:.2f} 0 0 {sweep} {x1:.2f} {y1:.2f}"


def rrect(cx, cy, w, h, r, fill, extra=""):
    return (f'<rect x="{cx - w / 2:.2f}" y="{cy - h / 2:.2f}" width="{w:.2f}" height="{h:.2f}" '
            f'rx="{r:.2f}" fill="{fill}"{extra}/>')


# The glossy treatment, in one place so it can be tuned without hunting.
# Every one of these is lit from the same place, up and slightly left, which is
# the thing the old raster never managed: it had a different answer per element
# and that is what read as "shadows all over".
# Mo picked the middle of three shine levels by looking at them side by side,
# which is the only sensible way to settle a word like "glossy".
def gloss_defs(sheen=0.50, glow=0.75, plate="#2b3036"):
    """The glossy palette. One light, up and slightly left, and everything obeys
    it: gradients are in user space, not per shape, or each arc lights itself and
    the two halves disagree about where the sun is.

    The colour is carried by the fill and the light by a thin specular. Spreading
    the highlight across the tube instead is what turned a saturated blue milky
    on the first attempt.
    """
    return f"""
<linearGradient id="bl" gradientUnits="userSpaceOnUse" x1="200" y1="120" x2="820" y2="900">
  <stop offset="0" stop-color="#3d7cff"/><stop offset="0.35" stop-color="#0a5bff"/><stop offset="1" stop-color="#0030b4"/>
</linearGradient>
<linearGradient id="or" gradientUnits="userSpaceOnUse" x1="200" y1="120" x2="820" y2="900">
  <stop offset="0" stop-color="#ff8055"/><stop offset="0.35" stop-color="#ff5228"/><stop offset="1" stop-color="#bd2a04"/>
</linearGradient>
<linearGradient id="sheen" gradientUnits="userSpaceOnUse" x1="230" y1="110" x2="660" y2="680">
  <stop offset="0" stop-color="#ffffff" stop-opacity="{sheen}"/>
  <stop offset="0.3" stop-color="#ffffff" stop-opacity="{sheen * 0.14:.3f}"/>
  <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
<linearGradient id="pl" gradientUnits="userSpaceOnUse" x1="340" y1="300" x2="690" y2="740">
  <stop offset="0" stop-color="{plate}"/><stop offset="1" stop-color="{plate}"/>
</linearGradient>
<linearGradient id="pd" x1="0" y1="0" x2="0.28" y2="1">
  <stop offset="0" stop-color="#ddff8a"/><stop offset="0.2" stop-color="#bcff3d"/>
  <stop offset="0.58" stop-color="#a8ff00"/><stop offset="1" stop-color="#6cc400"/>
</linearGradient>
<linearGradient id="pdTop" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#ffffff" stop-opacity="0.7"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
<filter id="glow" x="-70%" y="-70%" width="240%" height="240%">
  <feGaussianBlur stdDeviation="18" result="g"/>
  <feComponentTransfer in="g"><feFuncA type="linear" slope="{glow}"/></feComponentTransfer>
</filter>
<filter id="soft"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="cast" x="-25%" y="-25%" width="150%" height="160%">
  <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0a1420" flood-opacity="0.20"/>
</filter>
"""


GLOSS_TUNE = {}


def build(style, only=None):
    """only: None for the whole mark, or "left" / "right" / "bar" for one layer.

    The app's boot screen animates the three pieces separately, so they are
    emitted on the same 1024 canvas and stay in register when stacked.
    """
    depth = style == "depth"
    gloss = style == "gloss"
    defs = []
    if gloss:
        defs.append(gloss_defs(**(GLOSS_TUNE or {})))
    if depth:
        # One light, from above and slightly left, and one shadow under the
        # whole mark. The old artwork had a different answer per element.
        defs.append(
            '<linearGradient id="gp" x1="0" y1="0" x2="0.35" y2="1">'
            f'<stop offset="0" stop-color="#454d50"/><stop offset="1" stop-color="#242a2c"/></linearGradient>'
            '<linearGradient id="gb" x1="0" y1="0" x2="0.3" y2="1">'
            '<stop offset="0" stop-color="#2f74ff"/><stop offset="1" stop-color="#0049d6"/></linearGradient>'
            '<linearGradient id="go" x1="0" y1="0" x2="0.3" y2="1">'
            '<stop offset="0" stop-color="#ff7a52"/><stop offset="1" stop-color="#e8431d"/></linearGradient>'
            '<linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#a5ff45"/><stop offset="1" stop-color="#6fdf10"/></linearGradient>'
            '<filter id="sh" x="-20%" y="-20%" width="140%" height="140%">'
            '<feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0b1417" flood-opacity="0.18"/></filter>')
    blue = "url(#bl)" if gloss else "url(#gb)" if depth else BLUE
    orange = "url(#or)" if gloss else "url(#go)" if depth else ORANGE
    plate = "url(#pl)" if gloss else "url(#gp)" if depth else PLATE
    pad = "url(#pd)" if gloss else "url(#gg)" if depth else PAD
    shadow = ' filter="url(#cast)"' if gloss else ' filter="url(#sh)"' if depth else ""

    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">']
    if defs:
        parts.append(f"<defs>{''.join(defs)}</defs>")
    parts.append(f'<g{shadow}>')
    want = lambda k: only is None or only == k
    # The two arcs. Round caps, so they read as two separate strokes meeting
    # rather than one ring with notches cut out of it.
    def tube(a0, a1, sweep, fill):
        """One arc, and on a glossy build the specular running along it.

        The highlight is a narrower arc drawn just inside the centreline, which
        is where the light catches a round tube. Blurred, because a hard white
        line on a curve reads as a second ring rather than as a sheen."""
        out = [f'<path d="{arc(a0, a1, sweep)}" fill="none" stroke="{fill}" '
               f'stroke-width="{STROKE:.2f}" stroke-linecap="round"/>']
        if gloss:
            rin = R - STROKE * 0.27
            x0, y0 = C + rin * math.sin(math.radians(a0)), C - rin * math.cos(math.radians(a0))
            x1, y1 = C + rin * math.sin(math.radians(a1)), C - rin * math.cos(math.radians(a1))
            out.append(f'<path d="M {x0:.2f} {y0:.2f} A {rin:.2f} {rin:.2f} 0 0 {sweep} {x1:.2f} {y1:.2f}" '
                       f'fill="none" stroke="url(#sheen)" stroke-width="{STROKE * 0.17:.2f}" '
                       f'stroke-linecap="round" filter="url(#soft)"/>')
        return out

    if want("left"):
        parts += tube(360 - GAP, 180 + GAP, 0, blue)
    if want("right"):
        parts += tube(GAP, 180 - GAP, 1, orange)
    if not want("bar"):
        parts.append("</g></svg>")
        return "\n".join(parts)
    if only == "bar":
        parts = [parts[0]] + ([parts[1]] if defs else []) + [f'<g{shadow}>']
    # Outboard plates first, so the tall ones overlap them the way they do on
    # a real dumbbell.
    for sgn in (-1, 1):
        parts.append(rrect(C + sgn * OUTER_X, C, OUTER_W, OUTER_H, OUTER_R, plate))
    parts.append(rrect(C, C, 2 * PLATE_X, BAR_H, BAR_R, plate))
    for sgn in (-1, 1):
        px = C + sgn * PLATE_X
        parts.append(rrect(px, C, PLATE_W, PLATE_H, PLATE_R, plate))
        if gloss:
            # The pad glows before it is drawn, so the lime reads as lit rather
            # than painted on. This is the one place the mark is allowed to shout.
            parts.append(rrect(px, C, PAD_W, PAD_H, PAD_W / 2, PAD,
                               ' filter="url(#glow)" opacity="0.9"'))
        parts.append(rrect(px, C, PAD_W, PAD_H, PAD_W / 2, pad))
        if gloss:
            parts.append(rrect(px, C - PAD_H * 0.27, PAD_W * 0.56, PAD_H * 0.38,
                               PAD_W * 0.28, "url(#pdTop)"))
    parts.append("</g></svg>")
    return "\n".join(parts)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for style in ("flat", "depth", "gloss"):
        (OUT / f"unio-mark-{style}.svg").write_text(build(style))
    # Three amounts of shine, so the call can be made by looking rather than by
    # arguing about the word "glossy".
    global GLOSS_TUNE
    for tag, tune in (("a", {"plate": "#23272b"}),
                      ("b", {"plate": "#2b3036"}),
                      ("c", {"plate": "#353b42"})):
        GLOSS_TUNE = tune
        (OUT / f"unio-mark-p{tag}.svg").write_text(build("gloss"))
    GLOSS_TUNE = {}
    # The boot layers take the glossy build: they are shown at 150px on a phone,
    # which is nowhere near the size where gloss turns to mud.
    for layer in ("left", "right", "bar"):
        (OUT / f"unio-{layer}.svg").write_text(build("gloss", layer))
    print("wrote", len(list(OUT.glob("*.svg"))), "svgs in", OUT)


if __name__ == "__main__":
    main()
