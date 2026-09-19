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

import { palette, render, samplePose, solvePose, jointAngles, cameraFor, litIntensity, VB, GROUND,
  PROP_TYPES, LOOPS, VIEWS, PRESETS, SKINS, GRIPS, MUSCLE_GROUPS, BODY,
  BODY_FEMALE, BODIES, BODY_KINDS, HAIR_KINDS, useBody, restPose, gripSides, STYLE, setStyle,
  onArtworkReady, drawKit, KIT_ART_IDS } from "./rig.mjs";
import { MOVES as WEIGHT_TRAINING } from "./moves/weight-training.mjs";
import { MOVES as YOGA } from "./moves/yoga.mjs";
import { MOVES as PILATES } from "./moves/pilates.mjs";
import { MOVES as CALISTHENICS } from "./moves/calisthenics.mjs";
import { MOVES as STRETCHING } from "./moves/stretching.mjs";
import { MOVES as CARDIO } from "./moves/cardio.mjs";
import { MOVES as IDLE } from "./moves/idle.mjs";

export { palette, render, samplePose, solvePose, jointAngles, cameraFor, litIntensity, VB, GROUND,
  PROP_TYPES, LOOPS, VIEWS, PRESETS, SKINS, GRIPS, MUSCLE_GROUPS, BODY,
  BODY_FEMALE, BODIES, BODY_KINDS, HAIR_KINDS, useBody, restPose, gripSides, STYLE, setStyle,
  drawKit, KIT_ART_IDS };

/* A picture of one piece of equipment, no figure on it. Redraws itself when a
   machine's artwork finishes loading, which is the same one-frame gap the
   animations have and is invisible in a scene but very visible on a still. */
export function mountKit(canvas, id, opts = {}) {
  const paint = () => drawKit(canvas, id, { ...opts, onReady: () => drawKit(canvas, id, opts) });
  const ok = paint();
  return ok ? { repaint: paint, setTheme(theme) { opts = { ...opts, theme }; paint(); } } : null;
}

// Keyed by the training id used in knowledge/exercise-library/index.mjs.
export const MOVES_BY_LIBRARY = {
  "weight-training": WEIGHT_TRAINING,
  yoga: YOGA,
  pilates: PILATES,
  calisthenics: CALISTHENICS,
  stretching: STRETCHING,
  cardio: CARDIO,
};

/* One flat lookup, and the FIRST library to claim a name keeps it.
 *
 * Fifteen names appear in two libraries and until now every one of them pointed
 * at the same object, so merge order genuinely did not matter and this was an
 * Object.assign. Two of them stop being the same object today: the weight
 * training library records Bulgarian Split Squat and Walking Lunge as dumbbell
 * exercises and calisthenics records them as bodyweight, which are different
 * movements that happen to share a name, and the dumbbell animations for both
 * have sat written and unmapped for months waiting for somebody to decide which
 * one a bare name means.
 *
 * It means the weight training one, because that is the library the app reaches
 * for by default and the gym meaning is the common one. Calisthenics keeps the
 * bodyweight version in its own map, which is what MOVES_BY_LIBRARY is for and
 * what the validator checks against, so a caller that knows which training it
 * is in can still ask for the right one.
 *
 * First wins rather than last, in other words, and the order of the object
 * below is now load bearing. */
const ALL = {};
for (const lib of Object.values(MOVES_BY_LIBRARY)) {
  for (const [name, move] of Object.entries(lib)) if (!(name in ALL)) ALL[name] = move;
}

// The exercise names only: every count in the lab and the validator is a
// count of library coverage, and the rest antics must not inflate it.
export const MOVE_NAMES = Object.keys(ALL).sort();

// The rest antics (moves/idle.mjs). Mountable by name like any move, so the
// session stage can swap to one between sets, but not part of any library.
export const IDLES = IDLE;
export const IDLE_NAMES = Object.keys(IDLE);
Object.assign(ALL, IDLE);
export const hasMove = (name) => moveFor(name) !== null;
// Names that older plans and logs use for a move the library files under a
// longer name. A row with an unknown name keeps its old icon, so the miss is
// quiet, but the session hero should not be blank for the commonest lift.
const ALIASES = {
  "Bench Press": "Barbell Bench Press",
  "Squat": "Barbell Back Squat",
  "Back Squat": "Barbell Back Squat",
  "Shoulder Press": "Overhead Press",
  "Military Press": "Overhead Press",
  "Deadlifts": "Deadlift",
  "RDL": "Romanian Deadlift",
};
/* `trainingId` is optional and only matters for the two names that differ by
   library. A caller that knows it is rendering a calisthenics day gets the
   bodyweight Bulgarian split squat; everybody else gets the dumbbell one. */
export const moveFor = (name, trainingId = null) => {
  if (trainingId && MOVES_BY_LIBRARY[trainingId]) {
    const own = MOVES_BY_LIBRARY[trainingId][name] || MOVES_BY_LIBRARY[trainingId][ALIASES[name]];
    if (own) return own;
  }
  return ALL[name] || ALL[ALIASES[name]] || null;
};

// ------------------------------------------------------------ the runtime ---
// One requestAnimationFrame loop drives every mounted canvas on the page. A
// session screen can show a hero animation and a strip of upcoming moves; that
// must not be five independent rAF loops each doing their own clock.
const mounts = new Set();
// A machine drawing that arrives after a paused mount painted: repaint them
// all, or the still is missing its machine.
onArtworkReady(() => { for (const m of mounts) m.dirty = true; pump(); });
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
  // Nothing to draw: park the loop AND forget the timestamp, so that when it
  // starts again the gap since the last frame is not charged to one step.
  // The reset used to live below, on the scheduling path, which meant tick()
  // zeroed it on its way out every frame: dt was always 0, the clock never
  // advanced and every figure sat on the frame it was born with.
  if (!anyLive) { lastNow = 0; return; }
  frameId = globalThis.requestAnimationFrame(tick);
}

function tick(now) {
  frameId = null;
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0;
  lastNow = now;
  for (const m of mounts) {
    /* A canvas the page has thrown away (every session redraw replaces its
       figures) must not keep costing a paint per frame: the loop is real now,
       so a leaked mount is real work. The app prunes on its next mount pass;
       this catches them a frame after they leave the document. */
    if (!m.canvas.isConnected) {
      if (observer) observer.unobserve(m.canvas);
      mounts.delete(m);
      continue;
    }
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
  render(m.canvas, m.move, m.colors, cycle, m.time, { lit: m.lit, view: m.view, mood: m.mood });
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
    // The face's mood: neutral, happy, focused, surprised, sleepy. The app
    // sets it from what just happened (a logged set, a beaten record).
    mood: opts.mood || undefined,
    // "male" (default) or "female". Same skeleton and the same moves, a second
    // proportion table; see BODY_FEMALE in rig.mjs.
    bodyKind: opts.body || "male",
    // { muscles: ["chest","triceps"], color: "#e0521f" } from bodyHeatRGB. The
    // colour is the PEAK colour: intensity follows the rep unless the caller
    // pins it by passing an explicit `intensity`.
    lit: opts.lit || null,
    // camera override: a preset name, or { yaw, pitch, plane }. Null means the
    // move's own view, which is what everything except the lab wants.
    view: opts.view || null,
    speed: opts.speed || 1,
    time: opts.t === undefined ? 0 : opts.t * move.dur,
    playing: !opts.paused,
    visible: true,
    dirty: true,
    colors: palette(opts.theme || "dark", opts.accent || "action", opts.skin || "mannequin",
      opts.body || "male"),
  };
  mounts.add(m);

  /* The figure is the instruction, not decoration: a still picture of a bench
     press does not teach the movement, which is the whole reason it is on the
     screen. So it loops for everyone, and reduced motion buys a slower, calmer
     rep rather than a frozen one. Every decorative animation in the app (the
     pops, the confetti, the slide-ins) still stops dead when the OS asks. */
  if (reducedMotion()) m.speed *= 0.6;
  const ob = watcher();
  if (ob) ob.observe(canvas);
  pump();

  const api = {
    play() { m.playing = true; pump(); return api; },
    pause() { m.playing = false; return api; },
    seek(t) {
      // the clock is modulo the cycle, so seek(1) would wrap to the start;
      // clamp just short of it so a oneway move's last keyframe is reachable
      m.time = Math.min(typeof t === "number" ? t : 0, 0.999999) * move.dur;
      m.dirty = true;
      pump();
      return api;
    },
    setAccent(accent) {
      m.accent = accent;
      m.colors = palette(m.theme, accent, m.skin, m.bodyKind);
      m.dirty = true;
      pump();
      return api;
    },
    setTheme(theme) {
      m.theme = theme;
      m.colors = palette(theme, m.accent, m.skin, m.bodyKind);
      m.dirty = true;
      pump();
      return api;
    },
    setMood(mood) {
      m.mood = mood || undefined;
      m.dirty = true;
      pump();
      return api;
    },
    setSkin(skin) {
      m.skin = skin;
      m.colors = palette(m.theme, m.accent, skin, m.bodyKind);
      m.dirty = true;
      pump();
      return api;
    },
    setBody(bodyKind) {
      m.bodyKind = bodyKind;
      m.colors = palette(m.theme, m.accent, m.skin, bodyKind);
      m.dirty = true;
      pump();
      return api;
    },
    // Light the muscles a move works, in the caller's colour. The app passes
    // the same RGB the body heat map uses so the two never disagree.
    setLit(lit) {
      m.lit = lit;
      m.dirty = true;
      pump();
      return api;
    },
    // Drive the camera at runtime. The move's own view is the default; this is
    // for the lab and for any screen that wants to spin a figure.
    setView(view) {
      m.view = view;
      m.dirty = true;
      pump();
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
