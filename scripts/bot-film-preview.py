#!/usr/bin/env python3
"""Assembles a frame sequence from render-bot-film into something reviewable.

    python3 scripts/bot-film-preview.py

Writes an animated PNG next to the frames. APNG rather than GIF because the
figure is drawn on transparency with soft antialiased edges, and GIF's one-bit
alpha turns every one of those edges into a white fringe.

Crops to head and shoulders by finding the figure's own bounding box rather
than by hardcoded numbers, the same way render-bot-web.py does, so a change to
the pose or the canvas size does not silently reframe him.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAMES = ROOT / "brand/film/frames"
OUT = ROOT / "brand/film/blink-preview.png"
# How far down the figure the portrait reaches, as a fraction of its height.
PORTRAIT = 0.32
WIDE = 720
# The app's own dark panel, so he is previewed on the ground he ships on.
GROUND = (18, 19, 23, 255)


def main():
    files = sorted(FRAMES.glob("f*.png"))
    if not files:
        sys.exit(f"no frames in {FRAMES}, run scripts/render-bot-film.mjs first")
    meta = json.loads((FRAMES / "meta.json").read_text())

    first = Image.open(files[0]).convert("RGBA")
    box = first.getbbox()
    if not box:
        sys.exit("first frame is empty")
    x0, y0, x1, y1 = box
    crop = (x0, max(0, y0 - 8), x1, y0 + int((y1 - y0) * PORTRAIT))
    w = WIDE
    h = int(w * (crop[3] - crop[1]) / (crop[2] - crop[0]))

    out = []
    for f in files:
        im = Image.open(f).convert("RGBA").crop(crop).resize((w, h), Image.LANCZOS)
        plate = Image.new("RGBA", (w, h), GROUND)
        plate.alpha_composite(im)
        out.append(plate.convert("P", palette=Image.ADAPTIVE, colors=255))

    ms = round(1000 / meta["fps"])
    out[0].save(OUT, save_all=True, append_images=out[1:], duration=ms, loop=0)
    print(f"{len(out)} frames at {meta['fps']}fps ({ms}ms each) -> {OUT}")


if __name__ == "__main__":
    main()
