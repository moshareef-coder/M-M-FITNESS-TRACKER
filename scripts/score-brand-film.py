#!/usr/bin/env python3
"""
Adds the typing sound to brand/film/unio-announce.mp4. Nothing else.

Mo tried the full score (drone, arrivals, the resolve chord, arc pings) and
asked for just the typing noise, so that is the only thing this builds now.
The old broader version is still in git history at 42c11ef if it is ever
wanted back.

It ALWAYS mixes onto brand/film/unio-announce.silent.mp4, never onto
brand/film/unio-announce.mp4 itself, and writes the result back to the
latter. That matters: this file used to mux onto whatever unio-announce.mp4
already was, so the second run built the typing tick on top of the first
run's drone and chord instead of on top of silence. If the silent master is
ever missing, the film has to be re-rendered from scratch
(python3 make-brand-film.py) rather than pulled from git, because the
silent master itself is not committed on its own -- only ever as part of a
video that already had something muxed onto it.

The tick timing is read from make-brand-film.py's own SAYS constant, by
replaying the exact per-frame character-reveal formula the compositing loop
uses, rather than a guessed interval. Printed below on every run so a retime
of the two lines is visible immediately rather than trusted blind:
"""
import array
import math
import struct
import subprocess
import wave
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
FILM = ROOT / "scripts" / "make-brand-film.py"
SILENT = ROOT / "brand" / "film" / "unio-announce.silent.mp4"
OUT = ROOT / "brand" / "film" / "unio-announce.mp4"
SCORE_WAV = ROOT / "brand" / "film" / "unio-announce-score.wav"

spec = importlib.util.spec_from_file_location("brand_film", FILM)
film = importlib.util.module_from_spec(spec)
spec.loader.exec_module(film)

if not SILENT.exists():
    raise SystemExit(
        f"{SILENT} is missing. This script never regenerates the film itself -- "
        f"run `python3 {FILM}` first, then copy its output to {SILENT} before "
        f"running this again."
    )

SR = 44100
DUR = film.N / film.FPS
NSAMP = int(round(DUR * SR))

L = array.array("d", [0.0]) * NSAMP
R = array.array("d", [0.0]) * NSAMP


def clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def tri(phase):
    return 4 * abs(phase - 0.5) - 1


def add_note(t0, dur, freq, peak, kind="triangle", attack=0.004):
    """Same shape as the app's own sfxNote(): quick exponential attack,
    exponential decay to silence, so a single tick reads as the same
    instrument as the rest of the app's sound design rather than a foreign
    click."""
    start = int(t0 * SR)
    end = min(NSAMP, start + int(dur * SR))
    if end <= start:
        return
    for i in range(start, end):
        tt = (i - start) / SR
        if tt < attack:
            env = 0.0001 * (peak / 0.0001) ** (tt / attack)
        else:
            env = peak * (0.0001 / peak) ** ((tt - attack) / max(0.001, dur - attack))
        ph = (freq * tt) % 1.0
        s = tri(ph) if kind == "triangle" else math.sin(2 * math.pi * freq * tt)
        v = s * env
        L[i] += v
        R[i] += v


# ---- typing ticks, timed by replaying the compositing loop's own formula ----
# Pitched and sized like SFX_KIT's "set" cue (880Hz triangle, 90ms) but a
# third shorter and quieter, since a line of dialogue plays this forty times
# and "set" already proved what five clicks in a row that loud turns into.
print(f"reading {FILM.name}: N={film.N} FPS={film.FPS}")
total_ticks = 0
for text, s_from, s_typed, s_until in film.SAYS:
    last_shown = 0
    times = []
    for i in range(film.N):
        t = i / film.FPS
        if not (s_from <= t < s_until + 0.45):
            continue
        typed = clamp01((t - s_from - 0.18) / max(0.01, s_typed - s_from - 0.18))
        shown = int(len(text) * typed)
        if shown > last_shown:
            last_shown = shown
            times.append(t)
            add_note(t, 0.045, 1600.0, 0.10, kind="triangle")
    total_ticks += len(times)
    print(f"  {text!r}: {len(times)} ticks, {times[0]:.3f}s to {times[-1]:.3f}s "
          f"(line types from {s_from:.2f}s to {s_typed:.2f}s)")

if total_ticks == 0:
    raise SystemExit("no ticks generated -- SAYS is empty or its timings are unreachable")

peak = max(0.001, max((abs(x) for x in L), default=0.001))
target = 10 ** (-3 / 20)
scale = target / peak

with wave.open(str(SCORE_WAV), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    frames = bytearray()
    for i in range(NSAMP):
        v = max(-1.0, min(1.0, L[i] * scale))
        s16 = int(v * 32767)
        frames += struct.pack("<hh", s16, s16)
    w.writeframes(bytes(frames))
print(f"wrote {SCORE_WAV} ({NSAMP} samples, {DUR:.2f}s)")

import imageio_ffmpeg
exe = imageio_ffmpeg.get_ffmpeg_exe()
tmp_out = OUT.with_suffix(".withaudio.mp4")
subprocess.run([
    exe, "-y",
    "-i", str(SILENT),
    "-i", str(SCORE_WAV),
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "160k",
    "-map", "0:v:0", "-map", "1:a:0",
    "-shortest",
    str(tmp_out),
], check=True, capture_output=True)
tmp_out.replace(OUT)
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
