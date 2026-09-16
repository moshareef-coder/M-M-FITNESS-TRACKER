#!/usr/bin/env python3
"""Cuts the transparent mark out of the app icon master.

    python3 scripts/cut-logo-mark.py

Writes brand/unio-mark.png, which split-logo-parts.py then cuts into the three
animated layers. Run this first if the logo ever changes, then run that.

WHY THIS EXISTS. The previous unio-mark.png was made by a general purpose
background remover and it had bitten notches out of the dumbbell: chunks missing
from the outer edge of both plates and along the top of the bar. It was not our
splitter losing them, the damage was in the file, and it showed on the launch
screen as a logo with pieces chipped off.

A general remover has to guess what the subject is. Here we know exactly what
the subject is, so guessing is the wrong tool. The icon sits on a near white
rounded tile, and every part of the mark is either strongly coloured (the blue
arc, the coral arc, the lime plates) or clearly dark (the dumbbell body). So a
pixel is background only if it is BOTH pale AND colourless, which no part of the
mark is, and the key cannot eat the plates because the plates are dark.

It also doubles the resolution on the way through: the master is 1254px against
the 858px derivative it replaces.
"""

from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand" / "unio-logo-master.png"
OUT = ROOT / "brand" / "unio-mark.png"

# Pale and colourless is the tile. Both conditions, never either: the lime
# plates are pale but very colourful, and the dumbbell is colourless but very
# dark, so each is saved by the half of the test the other fails.
PALE = 190          # brightness at or above this can be background
COLOURLESS = 56     # saturation below this can be background


def main():
    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    px = src.load()

    # A hard mask first, then one pass of blur to give the edge back the
    # softness a hard key removes. Without it the mark gets a stair stepped
    # outline, which at launch screen size reads as a cheap cutout.
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    kept = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            mx, mn = max(r, g, b), min(r, g, b)
            if mx >= PALE and (mx - mn) < COLOURLESS:
                continue                      # the tile
            mp[x, y] = 255
            kept += 1

    mask = mask.filter(ImageFilter.GaussianBlur(0.6))

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    # Cropped to what is actually there, so the mark does not carry the tile's
    # padding into every layer downstream.
    box = out.getbbox()
    out = out.crop(box)
    out.save(OUT)
    print(f"kept {kept} px of {w * h}")
    print(f"wrote {OUT.name} at {out.size[0]}x{out.size[1]} from a {w}x{h} master")


if __name__ == "__main__":
    main()
