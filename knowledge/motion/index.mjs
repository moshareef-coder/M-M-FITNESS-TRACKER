// Public entry point for exercise animations.
//
//   import { mountMove, hasMove } from "./knowledge/motion/index.mjs";
//   const anim = mountMove(canvas, "Goblet Squat", { accent: "action" });
//
// Everything is keyed by the exercise NAME as it appears in
// knowledge/exercise-library, because that is what the picker, the session
// screen and the logs already pass around. hasMove() is the guard: most of the
// library has no animation yet and a card with no move must fall back to
// whatever it showed before, not to an empty canvas.
//
// Importable under plain node (validate.mjs does it): nothing here touches the
// DOM until mountMove is called.

import { palette, render, samplePose, solvePose, jointAngles, cameraFor, VB, GROUND, PROP_TYPES,
  LOOPS, VIEWS, PRESETS, SKINS, GRIPS, MUSCLE_GROUPS, BODY } from "./rig.mjs";
import { MOVES as WEIGHT_TRAINING } from "./moves/weight-training.mjs";
import { MOVES as YOGA } from "./moves/yoga.mjs";
import { MOVES as PILATES } from "./moves/pilates.mjs";
import { MOVES as CALISTHENICS } from "./moves/calisthenics.mjs";
import { MOVES as STRETCHING } from "./moves/stretching.mjs";

export { palette, render, samplePose, solvePose, jointAngles, cameraFor, VB, GROUND, PROP_TYPES,
  LOOPS, VIEWS, PRESETS, SKINS, GRIPS, MUSCLE_GROUPS, BODY };

// Keyed by the training id used in knowledge/exercise-library/index.mjs.
export const MOVES_BY_LIBRARY = {
  "weight-training": WEIGHT_TRAINING,
  yoga: YOGA,
  pilates: PILATES,
  calisthenics: CALISTHENICS,
  stretching: STRETCHING,
};

// One flat lookup. A name in two libraries (Push-Up, Pull-Up) is the same
// object in both, so merge order does not matter.
const ALL = {};
for (const lib of Object.values(MOVES_BY_LIBRARY)) Object.assign(ALL, lib);

export const MOVE_NAMES = Object.keys(ALL).sort();
export const hasMove = (name) => Object.prototype.hasOwnProperty.call(ALL, name);
export const moveFor = (name) => ALL[name] || null;

// ------------------------------------------------------------ the runtime ---
// One requestAnimationFrame loop drives every mounted canvas on the page. A
// session screen can show a hero animation and a strip of upcoming moves; that
// must not be five independent rAF loops each doing their own clock.
const mounts = new Set();
let frameId = null;
let lastNow = 0;

function reducedMotion() {
  return typeof globalThis.matchMedia === "function" &&
    globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let observer = null;
function watcher() {
  if (observer || typeof globalThis.IntersectionObserver !== "function") return observer;
  observer = new globalThis.IntersectionObserver((entries) => {
    for (const e of entries) {
      for (const m of mounts) {
        if (m.canvas !== e.target) continue;
        m.visible = e.isIntersecting;
        if (m.visible) m.dirty = true;
      }
    }
    pump();
  }, { rootMargin: "80px" });
  return observer;
}

function pump() {
  if (frameId !== null) return;
  const anyLive = [...mounts].some((m) => m.dirty || (m.playing && m.visible));
  if (!anyLive) return;
  lastNow = 0;
  frameId = globalThis.requestAnimationFrame(tick);
}

function tick(now) {
  frameId = null;
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0;
  lastNow = now;
  for (const m of mounts) {
    const running = m.playing && m.visible;
    if (!running && !m.dirty) continue;
    if (running) m.time += dt * m.speed;
    m.dirty = false;
    paint(m);
  }
  pump();
}

function paint(m) {
  const cycle = ((m.time / m.move.dur) % 1 + 1) % 1;
  render(m.canvas, m.move, m.colors, cycle, m.time, { lit: m.lit, view: m.view });
}

/**
 * Draw an exercise animation into a canvas.
 * Returns null for a name with no move, having drawn nothing, so the caller can
 * fall back. Extra beyond the documented API: setSpeed(x) for the motion lab.
 */
export function mountMove(canvas, name, opts = {}) {
  const move = moveFor(name);
  if (!canvas || !move) return null;

  const m = {
    canvas, move, name,
    theme: opts.theme || "dark",
    accent: opts.accent || "action",
    skin: opts.skin || "mannequin",
    // { muscles: ["chest","triceps"], color: "#e0521f" } from bodyHeatRGB
    lit: opts.lit || null,
    // camera override: a preset name, or { yaw, pitch, plane }. Null means the
    // move's own view, which is what everything except the lab wants.
    view: opts.view || null,
    speed: opts.speed || 1,
    time: opts.t === undefined ? 0 : opts.t * move.dur,
    playing: !opts.paused,
    visible: true,
    dirty: true,
    colors: palette(opts.theme || "dark", opts.accent || "action", opts.skin || "mannequin"),
  };
  mounts.add(m);

  // Someone who asked the OS to stop animating things meant it. Draw the most
  // representative frame of the move (mid cycle, which for a pingpong rep is
  // the far end of the rep) and leave it there.
  const still = reducedMotion();
  if (still) {
    m.playing = false;
    m.time = move.dur * 0.5;
    paint(m);
  } else {
    const ob = watcher();
    if (ob) ob.observe(canvas);
    pump();
  }

  const api = {
    play() { if (!still) { m.playing = true; pump(); } return api; },
    pause() { m.playing = false; return api; },
    seek(t) {
      m.time = (typeof t === "number" ? t : 0) * move.dur;
      m.dirty = true;
      if (still) paint(m); else pump();
      return api;
    },
    setAccent(accent) {
      m.accent = accent;
      m.colors = palette(m.theme, accent, m.skin);
      m.dirty = true;
      if (still) paint(m); else pump();
      return api;
    },
    setTheme(theme) {
      m.theme = theme;
      m.colors = palette(theme, m.accent, m.skin);
      m.dirty = true;
      if (still) paint(m); else pump();
      return api;
    },
    setSkin(skin) {
      m.skin = skin;
      m.colors = palette(m.theme, m.accent, skin);
      m.dirty = true;
      if (still) paint(m); else pump();
      return api;
    },
    // Light the muscles a move works, in the caller's colour. The app passes
    // the same RGB the body heat map uses so the two never disagree.
    setLit(lit) {
      m.lit = lit;
      m.dirty = true;
      if (still) paint(m); else pump();
      return api;
    },
    // Drive the camera at runtime. The move's own view is the default; this is
    // for the lab and for any screen that wants to spin a figure.
    setView(view) {
      m.view = view;
      m.dirty = true;
      if (still) paint(m); else pump();
      return api;
    },
    setSpeed(x) { m.speed = x; return api; },
    get move() { return move; },
    destroy() {
      mounts.delete(m);
      if (observer) observer.unobserve(canvas);
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    },
  };
  return api;
}
