// Fit Together: mounting the procedural ecorche into the app.
//
//   import { mountBody3D, body3DSupported } from "./knowledge/motion/body3d/mount.mjs";
//   const anim = mountBody3D(canvas, "Barbell Bench Press",
//     { theme: "dark", lit: { muscles: ["chest","triceps"], color: "#e0521f" } });
//
// Same shape as mountMove in ../index.mjs on purpose: the app holds one set of
// controllers and calls setTheme/destroy on all of them without caring which
// kind it got. Returns null for a name with no move, or when WebGL is not
// usable, having drawn nothing, so the caller falls back to the 2D figure.
//
// muscles.mjs, body.mjs and view.mjs in this folder are copies of the files in
// the anatomy workspace and are meant to be re-copied over, byte for byte, as
// that body improves. Everything app-specific lives HERE. The only two things
// those files need from outside are `three` (pinned by the importmap in
// index.html to the same URL this file imports below, so there is one THREE
// instance and not two) and ./fitrig/index.mjs (a one-line shim re-exporting
// the rig).

import * as THREE from "../../../vendor/three/three-0.160.1.module.js";
import { moveFor } from "../index.mjs";
import * as RIG from "../rig.mjs";
import * as VIEW from "./view.mjs";

const { PALETTE, makeGradientMap, makeStage, frameStage, aimCamera, setLit,
        samplePose, solvePose, litIntensity } = VIEW;
/* Two things the body grew after this file was first written. Read off the
   namespace rather than imported by name, because a named import of something
   a re-copied view.mjs does not export is a hard module error that would take
   the whole app's figure down; missing, they just do nothing.
     contractionFor  per group 0..1 so a working muscle swells on the rep
     gripSides       which hand is on which implement, for the hand pose */
const contractionFor = VIEW.contractionFor || null;
// gripsFor knows a barbell is two handed and asks where the wrist is, not
// the fingertips, so a push-up hand lands flat. Older view.mjs copies only
// had the rig's gripSides; fall through to that when it is missing.
const gripsFor = VIEW.gripsFor || null;
const gripSides = RIG.gripSides || null;

// The outline ink and the contact shadow are the two things that read wrong if
// they ignore the theme: near-black seams vanish on a dark card and the blue
// shadow blooms on a light one. Everything else (muscle tone, bone, the heat
// colour the app passes in) is legible on both.
const THEME = {
  dark:  { ink: 0x090c11, shadow: 1.0 },
  light: { ink: 0x243044, shadow: 0.45 },
};

// A few degrees each way, over nine seconds. Enough parallax that the volume
// reads as volume; not a turntable.
const DRIFT_DEG = 7;
const DRIFT_SEC = 9;

// ------------------------------------------------------------- capability ---
let _supported = null;
/** WebGL2 or WebGL1, and not a software rasteriser when the driver will say. */
export function body3DSupported() {
  if (_supported !== null) return _supported;
  _supported = false;
  try {
    if (typeof document === "undefined") return _supported;
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return _supported;
    let name = "";
    try {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      name = String(dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || "");
    } catch { name = ""; }
    const soft = /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(name);
    try { gl.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* best effort */ }
    _supported = !soft;
  } catch {
    _supported = false;
  }
  return _supported;
}

// --------------------------------------------------------------- the pool ---
// Building a figure is ~12k vertices of geometry plus a framing pass over ten
// sampled poses. The session screen rebuilds its innerHTML on every logged set,
// so without this the same bench press figure would be rebuilt a dozen times a
// workout. Keyed by move name, handed back on destroy, capped so a long picker
// scroll cannot grow it without bound.
const POOL_MAX = 3;
const pool = [];
let gradientMap = null;

function takeStage(name, move) {
  const i = pool.findIndex((p) => p.name === name);
  if (i >= 0) return pool.splice(i, 1)[0];
  if (!gradientMap) gradientMap = makeGradientMap(3);
  const st = makeStage(gradientMap);
  frameStage(st, move);
  return { name, st };
}

function giveBackStage(entry) {
  pool.push(entry);
  while (pool.length > POOL_MAX) {
    const gone = pool.shift();
    gone.st.fig.geometry.dispose();
    gone.st.mat.dispose();
    gone.st.shell.material.dispose();
    gone.st.shadow.geometry.dispose();
  }
}

// -------------------------------------------------------------- the loop ----
// One rAF for every mounted body, the same contract mountMove keeps. A session
// card and a stretch card must not each run their own clock.
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
    if (running) m.time += dt;
    m.dirty = false;
    paint(m);
  }
  pump();
}

// Match the backing store to the CSS box. The session figure is 240 px tall in
// a column whose width the phone decides, so this cannot be a fixed number.
function resize(m) {
  const w = Math.max(1, Math.round(m.canvas.clientWidth || m.fallbackSize));
  const h = Math.max(1, Math.round(m.canvas.clientHeight || m.fallbackSize));
  if (m.w === w && m.h === h) return;
  m.w = w; m.h = h;
  m.renderer.setSize(w, h, false);
}

function paint(m) {
  const move = m.move;
  const cycle = ((m.time / move.dur) % 1 + 1) % 1;
  const S = solvePose(samplePose(move, cycle, m.time), move.view);
  const groups = m.lit && m.lit.muscles;
  const intensity = litIntensity(move, cycle);
  m.st.fig.update(S, {
    contraction: contractionFor ? contractionFor(groups, intensity) : undefined,
    grips: gripsFor ? gripsFor(move, S) : (gripSides ? gripSides(move, S) : undefined),
  });
  setLit(m.st.mat, groups, m.lit && m.lit.color, intensity);
  const drift = m.paused3d ? 0 : DRIFT_DEG * Math.sin((m.time / DRIFT_SEC) * Math.PI * 2);
  aimCamera(m.st, S.frontal ? 0 : -90, m.yaw + drift);
  resize(m);
  // renderStage is the three pass draw (part ids and depth, figure, seam),
  // which only inks where two muscles meet. Without it the old outline shell
  // stays on, so a view.mjs without renderStage still draws something.
  if (VIEW.renderStage) VIEW.renderStage(m.renderer, m.st, m.w, m.h);
  else m.renderer.render(m.st.scene, m.st.cam);
}

function applyTheme(m) {
  // view.mjs owns the palette (muscle, bone, seam ink, lights) per theme and
  // re-skins every live stage; the shell and shadow tweaks below are the
  // mount's own leftovers for a view.mjs without setTheme.
  if (VIEW.setTheme) VIEW.setTheme(m.theme);
  const t = THEME[m.theme] || THEME.dark;
  m.st.shell.material.color.setHex(t.ink);
  m.st.shadow.material.opacity = t.shadow;
  m.st.shadow.material.transparent = true;
}

/**
 * Draw the 3D muscle body into a canvas.
 * @param canvas   the canvas to take over; it becomes a WebGL canvas.
 * @param name     an exercise name from knowledge/exercise-library.
 * @param opts     { theme, lit: { muscles, color }, yaw, paused, size }
 * @returns { play, pause, seek, setLit, setTheme, setYaw, destroy } or null.
 */
export function mountBody3D(canvas, name, opts = {}) {
  const move = moveFor(name);
  if (!canvas || !move || !body3DSupported()) return null;

  let renderer;
  let entry;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
    // Transparent: the card's own background shows through, so the figure
    // needs no colour of its own to sit correctly in either theme.
    renderer.setClearColor(0x000000, 0);
    entry = takeStage(name, move);
  } catch (e) {
    try { renderer?.dispose(); } catch { /* nothing to clean */ }
    console.warn("body3d: mount failed", e);
    return null;
  }

  const m = {
    canvas, renderer, move, name,
    st: entry.st,
    entry,
    theme: opts.theme === "light" ? "light" : "dark",
    lit: opts.lit || null,
    yaw: opts.yaw || 0,
    paused3d: false,
    time: 0,
    playing: !opts.paused,
    visible: true,
    dirty: true,
    fallbackSize: opts.size || 240,
    w: 0, h: 0,
  };
  applyTheme(m);
  mounts.add(m);

  // Someone who asked the OS to stop animating things meant it. One frame,
  // mid rep, square on, and nothing after that.
  const still = reducedMotion();
  if (still) {
    m.playing = false;
    m.paused3d = true;
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
    setLit(lit) {
      m.lit = lit;
      m.dirty = true;
      if (still) paint(m); else pump();
      return api;
    },
    setTheme(theme) {
      m.theme = theme === "light" ? "light" : "dark";
      applyTheme(m);
      m.dirty = true;
      if (still) paint(m); else pump();
      return api;
    },
    setYaw(deg) {
      m.yaw = deg || 0;
      m.dirty = true;
      if (still) paint(m); else pump();
      return api;
    },
    // Same extras mountMove carries, so a lab page can drive either kind.
    setAccent() { return api; },
    setSkin() { return api; },
    setSpeed() { return api; },
    get move() { return move; },
    get is3d() { return true; },
    destroy() {
      mounts.delete(m);
      if (observer) observer.unobserve(canvas);
      giveBackStage(m.entry);
      try {
        renderer.dispose();
        renderer.forceContextLoss();
      } catch { /* the context may already be gone */ }
    },
  };
  return api;
}

export { PALETTE };
