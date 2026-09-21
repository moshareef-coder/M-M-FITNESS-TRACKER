#!/usr/bin/env python3
"""
Builds the audio for brand/film/unio-announce.mp4 and muxes it in.

Nothing here is a stock track. Two reasons: the video posts to a LinkedIn
company page, which has no music picker and needs its own cleared audio baked
in, and the app already has a sound identity worth reusing rather than
fighting (see SFX_KIT in index.html, around line 27620) -- short synthesized
tones, exponential attack and decay, nothing percussive, nothing "triumphant"
for anything less than a genuine record. This score is built from the same
kind of oscillator, tuned to the film's own timeline rather than guessed.

Two callbacks worth knowing about if you touch this later:
  - The typing ticks are pitched and timed like the app's "set" sound (the
    most frequent, most unremarkable cue it has), because typing a line is
    also frequent and should not call attention to itself.
  - The chord under the logo reveal at 6.90s reuses the exact three
    frequencies from SFX_KIT's "pr" cue (a personal record, the only sound
    the app allows to sound pleased with itself). A launch earns that same
    chord, just played slow instead of struck.

Run after make-brand-film.py. Reads its N/FPS/SAYS/ZOOM/BAR/DRAW timing
constants directly rather than re-guessing them, so a retime of the film
retimes the score for free.
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
VIDEO = ROOT / "brand" / "film" / "unio-announce.mp4"
SCORE_WAV = ROOT / "brand" / "film" / "unio-announce-score.wav"
OUT = ROOT / "brand" / "film" / "unio-announce.mp4"

# Pull the film's own timing constants rather than retyping them.
spec = importlib.util.spec_from_file_location("brand_film", FILM)
film = importlib.util.module_from_spec(spec)
spec.loader.exec_module(film)

SR = 44100
DUR = film.N / film.FPS  # exactly matches the video's frame count / fps
NSAMP = int(round(DUR * SR))

L = array.array("d", [0.0]) * NSAMP
R = array.array("d", [0.0]) * NSAMP


def clamp01(x):
    return 0.0 if x < 0 else 1.0 if x > 1 else x


def smoothstep(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


def tri(phase):
    """Analytic triangle wave, -1..1, from a 0..1 phase."""
    return 4 * abs(phase - 0.5) - 1


def add_note(t0, dur, freq, peak, kind="sine", freq2=None, attack=0.006, pan=0.0):
    """One note in the app's own style: quick exponential attack, exponential
    decay to silence. Mirrors sfxNote() in index.html so anything short in
    this score reads as the same instrument as the app's own SFX."""
    start = int(t0 * SR)
    end = min(NSAMP, start + int(dur * SR))
    if end <= start:
        return
    lg = 1.0 - 0.5 * max(0.0, pan)
    rg = 1.0 - 0.5 * max(0.0, -pan)
    for i in range(start, end):
        tt = (i - start) / SR
        if tt < attack:
            env = 0.0001 * (peak / 0.0001) ** (tt / attack)
        else:
            env = peak * (0.0001 / peak) ** ((tt - attack) / max(0.001, dur - attack))
        f = freq
        if freq2 is not None:
            f = freq * (freq2 / freq) ** (tt / dur)
        ph = (f * tt) % 1.0
        s = math.sin(2 * math.pi * f * tt) if kind == "sine" else tri(ph)
        v = s * env
        L[i] += v * lg
        R[i] += v * rg


def add_swell(t0, dur, freq0, freq1, peak0, peak1, kind="sine", pan=0.0):
    """A rising line with no decay at the end -- the push into the cut. Both
    pitch and level ramp together on the same ease as the camera's own zoom
    (see cam() in make-brand-film.py), so the sound and the push agree."""
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
        ph = (f * (i - start) / SR) % 1.0
        s = math.sin(2 * math.pi * f * (i - start) / SR) if kind == "sine" else tri(ph)
        v = s * peak
        L[i] += v * lg
        R[i] += v * rg


# ---- the drone: one low pad, present for the whole film, on its own volume
# curve. Root is A2 (110Hz), the same register SFX_KIT's low cues live in
# (restStart is 330Hz, an octave and a fifth above this). Two oscillators a
# few cents apart give it width without turning it into a chord.
BREAKS = [
    (0.00, 0.00), (0.80, 0.10),   # he arrives alone
    (3.40, 0.12), (5.30, 0.13),   # both lines of dialogue
    (5.60, 0.05),                 # the breath right before the push
    (6.85, 0.02),                 # let the swell carry it into the cut
    (6.90, 0.17),                 # the cut: the drone jumps up with the chord
    (7.55, 0.15),                 # the mark has pulled back to full size
    (8.90, 0.14),                 # the end card
    (9.65, 0.14), (10.00, 0.0),   # fade out with the last frame
]


def env_at(t):
    for (t0, a0), (t1, a1) in zip(BREAKS, BREAKS[1:]):
        if t0 <= t <= t1:
            u = 0 if t1 == t0 else (t - t0) / (t1 - t0)
            return a0 + (a1 - a0) * smoothstep(u)
    return 0.0


ROOT_HZ = 110.0
for i in range(NSAMP):
    t = i / SR
    amp = env_at(t)
    if amp <= 0.0001:
        continue
    s = 0.6 * math.sin(2 * math.pi * ROOT_HZ * t) + 0.4 * math.sin(2 * math.pi * ROOT_HZ * 1.003 * t)
    L[i] += s * amp
    R[i] += s * amp

# ---- arrivals ----
# UNIO, alone, first: nothing struck, the drone rising IS his entrance.
# The man: quiet and low, matching restStart's "this is information, not an
# event" character.
add_note(film.CAST[0]["t0"], 0.50, 330.0, 0.09, kind="sine")
# Her pop: two quick notes rung like restEnd, but fast, matching the
# ease_out_back bounce she actually arrives on.
w_t0 = film.CAST[1]["t0"]
add_note(w_t0, 0.30, 392.0, 0.09, kind="sine")
add_note(w_t0 + 0.05, 0.35, 494.0, 0.08, kind="sine")

# ---- typing ticks ----
# Timed by replaying the exact per-frame reveal formula from the compositing
# loop, so a tick lands exactly when a character actually appears on screen
# rather than at a guessed interval. Pitched high and kept very quiet,
# shaped like "set" (880Hz) but a third shorter and four times quieter,
# because a line of dialogue is forty of these and "set" already proved a
# cheap-sounding click is what five of them in a row turns into.
for text, s_from, s_typed, s_until in film.SAYS:
    last_shown = 0
    for i in range(film.N):
        t = i / film.FPS
        if not (s_from <= t < s_until + 0.45):
            continue
        typed = clamp01((t - s_from - 0.18) / max(0.01, s_typed - s_from - 0.18))
        shown = int(len(text) * typed)
        if shown > last_shown:
            last_shown = shown
            add_note(t, 0.045, 1600.0, 0.035, kind="triangle")

# ---- his eyes: the same three closes the film actually draws ----
# BLINKS closes at [t, t+dn] and opens again at [t+dn, t+dn+up]; a tick on
# each edge is the sound of an eyelid, so it stays under the drone rather
# than announcing itself.
for at, dn, up in film.BLINKS:
    add_note(at, 0.03, 260.0, 0.025, kind="sine")
    add_note(at + dn + up, 0.03, 300.0, 0.02, kind="sine")
bo_at, bo_dn, bo_up = film.BLINK_OUT
add_note(bo_at, 0.03, 260.0, 0.03, kind="sine")
add_note(bo_at + bo_dn, 0.05, 300.0, 0.03, kind="sine")

# ---- the push ----
# Rises through the zoom and lands exactly at ZOOM_TO, where the resolve
# chord below picks it up. Pitch climbs a fifth over the 1.2s, the same
# interval the app already resolves on.
add_swell(film.ZOOM_FROM, film.ZOOM_TO - film.ZOOM_FROM, 220.0, 330.0, 0.01, 0.13, kind="sine")

# ---- the cut: his eyes become the mark ----
# SFX_KIT's "pr" chord (659/831/988Hz), the only sound in the app allowed to
# sound pleased with itself, played slow instead of struck. A launch is the
# one moment in this film that has earned it.
CHORD = [(659.25, 0.11), (830.61, 0.10), (987.77, 0.10)]
for freq, peak in CHORD:
    add_note(film.ZOOM_TO, 1.6, freq, peak, kind="sine", attack=0.05)

# ---- the arcs drawing themselves on ----
# Two short pings, one per arc, placed at the same easing the strokes
# themselves draw on (see arc_reveal / ease "smooth" in make-brand-film.py),
# so the sound finishes drawing when the arc does.
draw_span = film.DRAW_TO - film.DRAW_FROM
add_note(film.DRAW_FROM + draw_span * 0.30, 0.9, 987.77, 0.05, kind="sine", attack=0.03)
add_note(film.DRAW_FROM + draw_span * 0.62, 0.9, 1174.66, 0.05, kind="sine", attack=0.03)

# ---- his last blinks, on the mark itself ----
for at, dn, closed, opened in film.MARK_BLINKS:
    add_note(at, 0.04, 280.0, 0.03, kind="sine")

wav_path = SCORE_WAV
peak = max(0.001, max((abs(x) for x in L), default=0.001), max((abs(x) for x in R), default=0.001))
# Leave headroom rather than clipping: this mix was never checked against a
# limiter, so normalise to -3dBFS instead of trusting the levels chosen above.
target = 10 ** (-3 / 20)
scale = target / peak

with wave.open(str(wav_path), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    frames = bytearray()
    for i in range(NSAMP):
        l = max(-1.0, min(1.0, L[i] * scale))
        r = max(-1.0, min(1.0, R[i] * scale))
        frames += struct.pack("<hh", int(l * 32767), int(r * 32767))
    w.writeframes(bytes(frames))

print(f"wrote {wav_path} ({NSAMP} samples, {DUR:.2f}s, peak {peak * scale:.3f} after normalising)")

# ---- mux onto the video ----
import imageio_ffmpeg
exe = imageio_ffmpeg.get_ffmpeg_exe()
tmp_out = OUT.with_suffix(".withaudio.mp4")
subprocess.run([
    exe, "-y",
    "-i", str(VIDEO.with_suffix(".silent.mp4")) if False else str(VIDEO),
    "-i", str(wav_path),
    "-c:v", "copy",
    "-c:a", "aac", "-b:a", "160k",
    "-af", "afade=t=out:st=9.7:d=0.3",
    "-map", "0:v:0", "-map", "1:a:0",
    "-shortest",
    str(tmp_out),
], check=True, capture_output=True)
tmp_out.replace(OUT)
print(f"wrote {OUT} with audio ({OUT.stat().st_size // 1024} KB)")
