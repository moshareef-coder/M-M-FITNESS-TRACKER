#!/usr/bin/env python3
"""Cuts the real logo into the pieces the launch animation moves.

    python3 scripts/split-logo-parts.py

The mark is a 3D render, not vector art, so the arcs cannot be redrawn as
strokes without losing the gloss and stopping being the logo. Instead the actual
pixels are separated into three layers by colour, and the animation moves those:
what closes on screen is the artwork itself.

Writes into brand/ and into the web root so index.html can load them at boot.
Re-run it if the logo changes.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "brand" / "unio-mark.png"
OUT = ROOT / "brand"
WEB = ROOT / "logo"

# The arcs sit left and right of centre and the bar runs across the middle, so
# colour alone decides each pixel: blue, warm, or the dark-and-lime dumbbell.
def classify(r, g, b, central):
    mx, mn = max(r, g, b), min(r, g, b)
    sat = mx - mn
    # The dumbbell is decided by colour alone, before either arc is considered.
    #
    # It used to need a pixel to be central as well, and the right plate runs
    # far enough out that part of it failed that test. Coral wins any pixel
    # where red beats blue, so that part of the plate went into the right arc
    # and rode in with it: 947 opaque pixels of dumbbell on screen from the
    # first frame, which is exactly the thing the animation is built to reveal.
    #
    # Centrality is not needed for either test. The pale highlight along an arc
    # is bright, so it cannot pass the dark test, and it is near white, so it
    # cannot pass the saturation floor on the lime one.
    if mx < 110 and sat < 60:
        return "bar"                     # the dark dumbbell body
    if sat > 55 and g >= r and g >= b:
        return "bar"                     # its lime plates, green dominant
    if sat > 45 and b > r:
        return "left"                    # blue arc
    if sat > 45 and r > b:
        return "right"                   # coral arc
    return None


def combined_bounds(layers):
    """One square covering every layer, so the assembled mark is centred."""
    boxes = [img.getbbox() for img in layers.values() if img.getbbox()]
    left = min(b[0] for b in boxes)
    top = min(b[1] for b in boxes)
    right = max(b[2] for b in boxes)
    bottom = max(b[3] for b in boxes)
    cx, cy = (left + right) / 2, (top + bottom) / 2
    half = max(right - left, bottom - top) / 2 + 4
    return (int(cx - half), int(cy - half), int(cx + half), int(cy + half))


def main():
    src = Image.open(SRC).convert("RGBA")
    w, h = src.size
    px = src.load()

    layers = {name: Image.new("RGBA", (w, h), (0, 0, 0, 0)) for name in ("left", "right", "bar")}
    out = {name: img.load() for name, img in layers.items()}

    counts = {"left": 0, "right": 0, "bar": 0}
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 12:
                continue
            # The dumbbell occupies the middle of the mark; the arcs never do.
            central = abs(x - w / 2) < w * 0.30 and abs(y - h / 2) < h * 0.30
            which = classify(r, g, b, central)
            if not which:
                continue
            out[which][x, y] = (r, g, b, a)
            counts[which] += 1

    # All three cropped to ONE square, centred on the whole mark rather than on
    # each layer. The master crop left uneven padding, which put the assembled
    # mark eleven pixels left of centre on the launch screen: enough to read as
    # a mistake beside a centred wordmark. Sharing a square also means the
    # layers still stack with no positioning maths.
    box = combined_bounds(layers)
    WEB.mkdir(exist_ok=True)
    for name, img in layers.items():
        img.crop(box).save(OUT / f"unio-{name}.png")
        img.crop(box).save(WEB / f"unio-{name}.png")
        print(f"{name:6} {counts[name]:>7} px")
    print(f"square {box[2]-box[0]}x{box[3]-box[1]} centred on the mark")

    print(f"written to {OUT} and {WEB}")


if __name__ == "__main__":
    main()
