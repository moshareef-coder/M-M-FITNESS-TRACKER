#!/usr/bin/env python3
"""
Adds sound to brand/film/unio-announce.mp4: the typing tick, and now a warm,
minimal piano bed under it.

Mo tried a synth drone and chord first and cut it -- it read as product-tech,
which undersold the actual pitch of this film. UNIO is the tech; the couple
is the point. A few soft, felt-piano-style notes over near silence reads
warmer and keeps the typing tick as the clearest sound in the mix, rather
than competing with it the way the drone did.

It ALWAYS mixes onto brand/film/unio-announce.silent.mp4, never onto
brand/film/unio-announce.mp4 itself, and writes the result back to the
latter. An earlier version of this script muxed onto whatever
unio-announce.mp4 already was, so a second run built its audio on top of
the first run's audio instead of on top of silence. If the silent master is
ever missing, the film has to be re-rendered from scratch
(python3 make-brand-film.py), not pulled back out of a scored copy.

The piano is a toy: a handful of harmonics per note, each decaying faster
than the one below it, which is the one thing that actually makes a struck
tone read as piano rather than organ. It is not a sampled instrument and was
never going to be -- there is no licensed piano sample to fetch here, and a
company-page video needs cleared audio anyway. What it buys instead is being
built from the film's own timeline rather than trimmed to fit one: every
note's start time below is picked against SAYS, CAST and ZOOM_FROM/TO, so a
retime of the film is a reason to look at this list again, not a reason to
distrust it.
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


def smoothstep(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def tri(phase):
    return 4 * abs(phase - 0.5) - 1


def add_tick(t0, dur, freq, peak, attack=0.004):
    """Same shape as the app's own sfxNote(): quick exponential attack,
    exponential decay to silence. Used only for the typing tick."""
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
        v = tri(ph) * env
        L[i] += v
        R[i] += v


# Higher partials fade faster than the fundamental, which is the actual
# physical reason a struck string reads as warm rather than as a buzz. Weights
# drop off quickly on purpose: a felt piano is mostly fundamental with a
# little colour on top, not a bright harmonic stack.
PIANO_PARTIALS = [(1.0, 1.00, 1.00), (2.0, 0.42, 0.62), (3.0, 0.20, 0.40), (4.0, 0.09, 0.26)]


def add_piano(t0, freq, peak, decay, pan=0.0, attack=0.014):
    """One soft struck note. attack is slower than add_tick's -- a hammer
    hitting felt, not a UI click -- and each partial gets its own decay so the
    tone loses its edge before it loses its body."""
    start = int(t0 * SR)
    dur = decay * 2.2
    end = min(NSAMP, start + int(dur * SR))
    if end <= start:
        return
    lg = 1.0 - 0.5 * max(0.0, pan)
    rg = 1.0 - 0.5 * max(0.0, -pan)
    for i in range(start, end):
        tt = (i - start) / SR
        if tt < attack:
            a = tt / attack
        else:
            a = 1.0
        v = 0.0
        for mult, weight, decay_mult in PIANO_PARTIALS:
            d = decay * decay_mult
            if tt < attack:
                penv = 0.0001 * (1.0 / 0.0001) ** (tt / attack)
            else:
                penv = 1.0 * (0.0001 / 1.0) ** ((tt - attack) / max(0.001, d))
            v += weight * penv * math.sin(2 * math.pi * freq * mult * tt)
        v *= peak
        L[i] += v * lg
        R[i] += v * rg


def add_swell(t0, dur, freq0, freq1, peak0, peak1, pan=0.0):
    """The one non-piano voice: a slow bowed rise through the push into his
    face, on the same ease the camera itself zooms on (cam() in
    make-brand-film.py), so the sound and the push land together."""
    start = int(t0 * SR)
    end = min(NSAMP, start + int(dur * SR))
    if end <= start:
        return
    lg = 1.0 - 0.5 * max(0.0, pan)
    rg = 1.0 - 0.5 * max(0.0, -pan)
    for i in range(start, end):
        u = smoothstep((i - start) / (end - start))
        f = freq0 * (freq1 / freq0) ** u
        peak = peak0 + (peak1 - peak0) * u
        v = (math.sin(2 * math.pi * f * (i - start) / SR)
             + 0.5 * math.sin(2 * math.pi * f * 1.003 * (i - start) / SR)) * peak
        L[i] += v * lg
        R[i] += v * rg


# ---- typing ticks, unchanged from the last pass, timed by replaying the
# compositing loop's own character-reveal formula ----
print(f"reading {FILM.name}: N={film.N} FPS={film.FPS}")
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
            add_tick(t, 0.045, 1600.0, 0.10)
    print(f"  tick: {text!r}: {len(times)} ticks, {times[0]:.3f}s to {times[-1]:.3f}s")

# ---- the piano bed ----
# A2/E3/A3 is a bare fifth, not a full chord, while he is alone and the
# question is still forming -- there is nothing to resolve yet. C#4 arrives
# with the woman, which is what turns the fifth into a major chord: she is
# the answer to the question landing at the same moment, harmonically as
# well as visually. Everything here is very quiet; the typing tick should
# still be the loudest thing until the swell.
NOTES = [
    # (t0,   freq,    peak,  decay, pan)   -- comment says which beat it rides
    (0.10, 110.00, 0.05, 2.6, -0.15),   # A2, as UNIO fades in alone
    (1.00, 164.81, 0.045, 2.2, 0.15),   # E3, as the man arrives
    (2.35, 220.00, 0.035, 1.8, 0.0),    # A3, a quiet re-strike under the question
    (3.60, 277.18, 0.05, 1.8, 0.15),    # C#4, as she pops in: the fifth becomes A major
    (4.85, 329.63, 0.035, 1.4, -0.15),  # E4, keeps the chord alive into the quiet dip
]
for t0, freq, peak, decay, pan in NOTES:
    add_piano(t0, freq, peak, decay, pan=pan)

# The breath before the push: nothing new plays from 5.3s to 5.7s, on
# purpose, the same silence the film's own drone used for this beat.

# The push, riding the same ease the camera zooms on.
add_swell(film.ZOOM_FROM, film.ZOOM_TO - film.ZOOM_FROM, 220.0, 330.0, 0.006, 0.05)

# The cut: an E major chord, an octave below the app's own "pr" cue
# (659/831/988Hz -- the sound the app allows to sound pleased with itself),
# so it is recognisably the same chord quality without arriving in a bright
# register a warm piano bed has no business reaching for.
for freq, peak, pan in [(164.81, 0.075, -0.1), (207.65, 0.07, 0.0), (246.94, 0.075, 0.1)]:
    add_piano(film.ZOOM_TO, freq, peak, 3.0, pan=pan)

# One more note while the arcs draw themselves on, F#4, the colour tone that
# turns the resolved chord into something a little more particular than a
# plain triad -- quiet, no new event needed, just keeps the bed breathing.
draw_mid = film.DRAW_FROM + (film.DRAW_TO - film.DRAW_FROM) * 0.5
add_piano(draw_mid, 369.99, 0.03, 1.6, pan=-0.1)

# The end card: the same chord, spread wider and lower, re-struck softly so
# it can ring out under the tagline rather than trailing off from the cut.
for freq, peak, pan in [(82.41, 0.05, 0.0), (164.81, 0.05, -0.15), (246.94, 0.045, 0.15)]:
    add_piano(film.END_FROM, freq, peak, 2.6, pan=pan)

peak = max(0.001, max((abs(x) for x in L), default=0.001), max((abs(x) for x in R), default=0.001))
target = 10 ** (-4 / 20)
scale = target / peak

with wave.open(str(SCORE_WAV), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    frames = bytearray()
    for i in range(NSAMP):
        l = max(-1.0, min(1.0, L[i] * scale))
        r = max(-1.0, min(1.0, R[i] * scale))
        frames += struct.pack("<hh", int(l * 32767), int(r * 32767))
    w.writeframes(bytes(frames))
print(f"wrote {SCORE_WAV} ({NSAMP} samples, {DUR:.2f}s, peak {peak * scale:.3f} after normalising)")

import imageio_ffmpeg
exe = imageio_ffmpeg.get_ffmpeg_exe()
tmp_out = OUT.with_suffix(".withaudio.mp4")
subprocess.run([
    exe, "-y",
    "-i", str(SILENT),
    "-i", str(SCORE_WAV),
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "160k",
    "-af", "afade=t=out:st=9.7:d=0.3",
    "-map", "0:v:0", "-map", "1:a:0",
    "-shortest",
    str(tmp_out),
], check=True, capture_output=True)
tmp_out.replace(OUT)
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
