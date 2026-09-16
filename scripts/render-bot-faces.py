#!/usr/bin/env python3
"""Renders the app's own figure into the widget's image assets.

    python3 scripts/render-bot-faces.py

The widget is a separate process that cannot run the motion rig, so the
character has to arrive there as a still. Drawing him by hand in SwiftUI was
tried and rejected: it was a circle with two dots, and it looked nothing like
him. This takes the real rig, freezes it, crops to a head-and-shoulders
portrait and writes the result into Assets.xcassets.

Re-run it whenever the rig or the face changes, or the widget will quietly go
on showing an older character than the app.

Needs Chrome (module imports are blocked on file://, so it serves the repo over
http first) and Pillow.
"""

import http.server
import json
import os
import shutil
import socketserver
import subprocess
import sys
import threading
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 8931
HARNESS = "/brand/figure-harness.html"
# Front view, so the face is square to camera. The other idles are side or
# three-quarter and give a profile.
MOVE = "Rest: Shake-out"
ASSETS = ROOT / "ios/App/FitTogetherWidget/Assets.xcassets"
# The two the widget actually switches between: he reacts to a logged set.
MOODS = {"neutral": "BotNeutral", "happy": "BotHappy"}
RENDER = 720
# Big enough for 30pt at 3x with room to spare.
SIZES = {1: 34, 2: 68, 3: 102}


def serve():
    os.chdir(ROOT)
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    httpd.allow_reuse_address = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def shoot(mood, out):
    url = (f"http://127.0.0.1:{PORT}{HARNESS}"
           f"?move={MOVE.replace(' ', '%20')}&mood={mood}&t=0")
    subprocess.run([
        CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--default-background-color=00000000",
        f"--screenshot={out}", f"--window-size={RENDER},{RENDER}",
        "--virtual-time-budget=4000", url,
    ], check=True, capture_output=True)


def crop_head(src, dest):
    """Head plus a little shoulder. The head is a narrow band of rows; the
    shoulders are where that width jumps, which is where the crop stops."""
    img = Image.open(src).convert("RGBA")
    w, h = img.size
    px = img.load()
    rows = []
    for y in range(h):
        xs = [x for x in range(w) if px[x, y][3] > 12]
        rows.append((min(xs), max(xs)) if xs else None)

    top = next(y for y, r in enumerate(rows) if r)
    head_w = rows[top + 12][1] - rows[top + 12][0]
    shoulder_y = next(
        (y for y in range(top + 20, h)
         if rows[y] and (rows[y][1] - rows[y][0]) > head_w * 1.55),
        top + 140,
    )
    bottom = min(h, shoulder_y + 26)
    cx = (rows[top + 12][0] + rows[top + 12][1]) // 2
    half = (bottom - top) // 2 + 6
    img.crop((max(0, cx - half), max(0, top - 8), min(w, cx + half), bottom)).save(dest)


def install(src, name):
    out = ASSETS / f"{name}.imageset"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True, exist_ok=True)
    master = Image.open(src)
    for scale, px in SIZES.items():
        frame = master.copy()
        frame.thumbnail((px, px), Image.LANCZOS)
        canvas = Image.new("RGBA", (px, px), (0, 0, 0, 0))
        canvas.paste(frame, ((px - frame.width) // 2, (px - frame.height) // 2), frame)
        canvas.save(out / f"face@{scale}x.png")
    (out / "Contents.json").write_text(json.dumps({
        "images": [{"idiom": "universal", "filename": f"face@{s}x.png", "scale": f"{s}x"}
                   for s in SIZES],
        "info": {"author": "xcode", "version": 1},
    }, indent=2))


def main():
    if not Path(CHROME).exists():
        sys.exit(f"Chrome not found at {CHROME}")
    httpd = serve()
    try:
        for mood, asset in MOODS.items():
            raw = f"/tmp/unio-fig-{mood}.png"
            head = f"/tmp/unio-head-{mood}.png"
            shoot(mood, raw)
            crop_head(raw, head)
            install(head, asset)
            print(f"{mood:8} -> {asset}.imageset")
    finally:
        httpd.shutdown()
    print("done")


if __name__ == "__main__":
    main()
