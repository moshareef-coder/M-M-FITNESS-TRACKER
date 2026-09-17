#!/usr/bin/env python3
"""Renders the app's own figure into a web asset for the dashboard.

    python3 scripts/render-bot-web.py

Same character, same rig, same crop as the widget: this imports
render-bot-faces rather than copying its cropping, because two head-and-
shoulders crops that drift apart would give the app and the widget two
different looking robots and nobody would notice until both were on screen.

The widget's copies top out at 102px because that is 30pt at 3x and no more.
The dashboard shows him bigger than that, so this writes a 256px master from
the same 720px render instead of upscaling the widget's.

Re-run it whenever the rig or the face changes. Needs Chrome and Pillow.
"""

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

faces = import_module("render-bot-faces".replace("-", "_")) if False else None

# The module name has hyphens, so it cannot be imported by name.
import importlib.util
spec = importlib.util.spec_from_file_location(
    "render_bot_faces", Path(__file__).resolve().parent / "render-bot-faces.py")
faces = importlib.util.module_from_spec(spec)
spec.loader.exec_module(faces)

from PIL import Image

ROOT = faces.ROOT
OUT = ROOT / "bot"
WEB_PX = 256
MOODS = {"neutral": "bot-neutral.png", "happy": "bot-happy.png"}


def _trim(img, pad_frac=0.04):
    """Drop the transparent margin the crop leaves behind.

    crop_head aims at the widget, where the face is 34px inside a fixed square
    and a generous margin is what stops it touching the tile edge. On the
    dashboard he sits in a 52px box of his own, and that same margin left him
    44 percent empty and looking like a thumbnail of himself. So the alpha
    bounds are taken and a thin, even pad is put back deliberately rather than
    inherited."""
    box = img.getbbox()
    if not box:
        return img
    img = img.crop(box)
    pad = max(2, int(max(img.size) * pad_frac))
    out = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    out.paste(img, (pad, pad), img)
    return out


def main():
    if not Path(faces.CHROME).exists():
        sys.exit(f"Chrome not found at {faces.CHROME}")
    OUT.mkdir(parents=True, exist_ok=True)
    httpd = faces.serve()
    try:
        with tempfile.TemporaryDirectory() as tmp:
            for mood, name in MOODS.items():
                raw = Path(tmp) / f"{mood}.png"
                cropped = Path(tmp) / f"{mood}-crop.png"
                faces.shoot(mood, str(raw))
                faces.crop_head(str(raw), str(cropped))
                master = Image.open(cropped).convert("RGBA")
                before = master.size
                master = _trim(master)
                # thumbnail only ever shrinks, so a crop that came back smaller than
                # the target stayed small and was then centred in a canvas half again
                # its size. Scale to the box in both directions.
                scale = WEB_PX / max(master.size)
                master = master.resize(
                    (max(1, round(master.width * scale)), max(1, round(master.height * scale))),
                    Image.LANCZOS)
                canvas = Image.new("RGBA", (WEB_PX, WEB_PX), (0, 0, 0, 0))
                canvas.paste(master, ((WEB_PX - master.width) // 2,
                                      (WEB_PX - master.height) // 2), master)
                canvas.save(OUT / name)
                b = canvas.getbbox()
                fill = round(100 * (b[2] - b[0]) * (b[3] - b[1]) / (WEB_PX * WEB_PX))
                print(f"{name}  crop {before[0]}x{before[1]} -> {WEB_PX}px canvas, "
                      f"content {b[2]-b[0]}x{b[3]-b[1]} (~{fill}% of the box)")
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    main()
