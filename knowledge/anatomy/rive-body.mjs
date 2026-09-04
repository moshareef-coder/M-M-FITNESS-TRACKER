// Thin wrapper around the Rive vanilla-JS runtime for the purchased body-heatmap asset
// (assets/human_anatomy_advanced_v3.0.riv, Fitness Visuals, Advanced tier). Assumes the
// classic <script src="https://cdn.jsdelivr.net/npm/@rive-app/webgl2@.../rive.min.js">
// tag is already on the page -- same pattern as Chart.js elsewhere in this app, not an
// ESM import, since that's the CDN build Rive actually ships.
//
// Muscle keys and grouping are the vendor's, not ours (see ALL_MUSCLES below) -- they map
// closely but not 1:1 onto this app's MUSCLE_GROUPS. See RIVE_TO_APP_GROUP.

// Resolved against this module's own location (not the importing page's), so it loads
// correctly whether imported from knowledge/anatomy/body-explorer.html or from index.html
// at the repo root. A plain "./assets/..." relative path would only work from the former.
export const RIVE_SRC = new URL("./assets/human_anatomy_advanced_v3.0.riv", import.meta.url).href;
export const STATE_MACHINE = "State Machine 1";

export const ARTBOARDS = ["Male-Front", "Male-Back", "Female-Front", "Female-Back"];

// Every muscle ViewModel property the .riv file exposes (v3.0). Pulled directly from the
// vendor's own muscles.ts sample rather than re-derived, so it can't drift out of sync with
// what the file actually contains.
export const ALL_MUSCLES = [
  "flexorCarpiUlnaris", "posteriorDeltoid", "tricepsBrachii", "teresMajor", "latissimusDorsi",
  "gluteusMaximus", "bicepsFemoris", "semitendinosus", "adductorMagnus", "erectorSpinae",
  "sternocleidomastoid", "trapezius", "pectoralisMajor", "deltoids", "rectusAbdominis",
  "externalObliques", "biceps", "brachialis", "brachioradialis", "extensorCarpiUlnaris",
  "flexorCarpiRadialis", "sartorius", "rectusFemoris", "vastusMedialis", "vastusLateralis",
  "gluteusMedius", "tibialisAnterior", "soleus", "gastrocnemius",
];
const MUSCLE_SET = new Set(ALL_MUSCLES);

// Maps each Rive muscle key to this app's existing MUSCLE_GROUPS key, so a click on the
// diagram can drive (or be driven by) the same volume/coverage data the rest of the app
// already tracks. Deliberately explicit rather than a naming-convention guess -- several
// of these don't match trivially (e.g. "deltoids" -> shoulders, "erectorSpinae" -> lowerback).
export const RIVE_TO_APP_GROUP = {
  flexorCarpiUlnaris: "forearms", posteriorDeltoid: "shoulders", tricepsBrachii: "triceps",
  teresMajor: "lats", latissimusDorsi: "lats", gluteusMaximus: "glutes",
  bicepsFemoris: "hamstrings", semitendinosus: "hamstrings", adductorMagnus: "quads",
  erectorSpinae: "lowerback", sternocleidomastoid: "traps", trapezius: "traps",
  pectoralisMajor: "chest", deltoids: "shoulders", rectusAbdominis: "abs",
  externalObliques: "obliques", biceps: "biceps", brachialis: "biceps",
  brachioradialis: "forearms", extensorCarpiUlnaris: "forearms", flexorCarpiRadialis: "forearms",
  sartorius: "quads", rectusFemoris: "quads", vastusMedialis: "quads", vastusLateralis: "quads",
  gluteusMedius: "glutes", tibialisAnterior: "calves", soleus: "calves", gastrocnemius: "calves",
};

// The reverse of RIVE_TO_APP_GROUP: for each of this app's 14 broad groups, every Rive
// muscle key that rolls up into it. Built once from RIVE_TO_APP_GROUP rather than hand
// duplicated, so the two can't drift apart.
export const APP_GROUP_TO_RIVE_MUSCLES = {};
for (const [muscle, group] of Object.entries(RIVE_TO_APP_GROUP)) {
  (APP_GROUP_TO_RIVE_MUSCLES[group] ??= []).push(muscle);
}

const PALETTE_VM = "palette";

// Zoom limits for focus(): never smaller than the plain contain-fit, never more than this
// many times it. The .riv is vector, so 4x stays crisp; beyond that a single muscle
// fills the canvas and loses its neighbours for context.
const MAX_ZOOM = 4;
const FOCUS_MS = 520;

/**
 * Load one artboard onto a canvas and wire it up to intensities/palette/click callback.
 * Returns a controller: { setIntensities, setPalette, focus, project, resize, destroy }.
 * Caller owns the canvas element's sizing; this only draws into it.
 *
 * onMuscleClick(muscle, group, tap) also gets the tap position as artboard fractions
 * ({ x, y } in 0..1) so the caller can tell the viewer-left limb from the viewer-right.
 * onFrame(controller) fires whenever the render frame moves (zoom tween, resize), so
 * HTML overlays positioned with project() can follow.
 */
export function createBodyHeatmap({ canvas, artboardName, palette, intensities, onMuscleClick, onLoad, onFrame }) {
  if (!ARTBOARDS.includes(artboardName)) {
    throw new Error(`Unknown artboard "${artboardName}", expected one of ${ARTBOARDS.join(", ")}`);
  }
  if (typeof window === "undefined" || !window.rive) {
    throw new Error("window.rive is not loaded -- add the Rive <script> tag before calling this");
  }

  const r = new window.rive.Rive({
    src: RIVE_SRC,
    canvas,
    artboard: artboardName,
    stateMachine: STATE_MACHINE,
    autoplay: true,
    autoBind: true,
    layout: new window.rive.Layout({ fit: window.rive.Fit.Contain, alignment: window.rive.Alignment.Center }),
    onLoad: () => {
      r.resizeDrawingSurfaceToCanvas();
      applyIntensities(r, intensities || {});
      applyPalette(r, palette);
      loaded = true;
      frame = frameFor(focusBox);
      applyFrame(frame);
      onLoad?.(r);
    },
    onLoadError: (e) => console.error("Rive body heatmap failed to load:", e),
  });

  // --- render frame (zoom) -------------------------------------------------------
  // Rive's Layout can draw the artboard into any rectangle of the drawing buffer, even
  // one much larger than the canvas; the canvas simply clips it. That is our zoom: a
  // contain-fit into a frame scaled around the muscle we want centred. Frames are kept
  // as fractions of the canvas so a resize mid-tween only needs a re-multiply.
  let loaded = false;
  let focusBox = null;        // normalized artboard box we are zoomed on, or null
  let frame = null;           // current frame, fractions of canvas {x0, y0, x1, y1}
  let tween = null;
  let lastTap = null;         // last pointerdown in drawing-buffer pixels

  function artboardAspect() {
    const b = r.bounds;
    return b ? (b.maxX - b.minX) / (b.maxY - b.minY) : 178 / 490;
  }

  function frameFor(box) {
    const W = canvas.width || 1, H = canvas.height || 1;
    const a = artboardAspect();
    const base = Math.min(H, W / a);          // contain-fit height in px
    let fh = base;
    let cx = 0.5, cy = 0.5;
    if (box) {
      const bw = Math.max(box[2] - box[0], 0.02), bh = Math.max(box[3] - box[1], 0.02);
      // Fill about 60% of the canvas height or 70% of its width with the muscle,
      // whichever hits first, then clamp to the allowed zoom range.
      fh = Math.min((0.6 * H) / bh, (0.7 * W) / (bw * a));
      fh = Math.max(base, Math.min(base * MAX_ZOOM, fh));
      cx = (box[0] + box[2]) / 2;
      cy = (box[1] + box[3]) / 2;
    }
    const fw = fh * a;
    const x0 = W / 2 - cx * fw, y0 = H / 2 - cy * fh;
    return { x0: x0 / W, y0: y0 / H, x1: (x0 + fw) / W, y1: (y0 + fh) / H };
  }

  function applyFrame(f) {
    if (!loaded || !f) return;
    const W = canvas.width, H = canvas.height;
    r.layout = r.layout.copyWith({
      fit: window.rive.Fit.Contain,
      alignment: window.rive.Alignment.Center,
      minX: f.x0 * W, minY: f.y0 * H, maxX: f.x1 * W, maxY: f.y1 * H,
    });
    onFrame?.(api);
  }

  function focus(box, animate = true) {
    focusBox = box ? box.slice() : null;
    if (!loaded) return;
    if (tween) { cancelAnimationFrame(tween); tween = null; }
    const to = frameFor(focusBox);
    const from = frame || frameFor(null);
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce) { frame = to; applyFrame(frame); return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / FOCUS_MS);
      const e = 1 - Math.pow(1 - t, 3);
      frame = {
        x0: from.x0 + (to.x0 - from.x0) * e, y0: from.y0 + (to.y0 - from.y0) * e,
        x1: from.x1 + (to.x1 - from.x1) * e, y1: from.y1 + (to.y1 - from.y1) * e,
      };
      applyFrame(frame);
      tween = t < 1 ? requestAnimationFrame(step) : null;
    };
    tween = requestAnimationFrame(step);
  }

  // Artboard fraction -> CSS pixel inside the canvas, for positioning overlays.
  function project(ax, ay) {
    const f = frame || frameFor(focusBox);
    const cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    return { x: (f.x0 + ax * (f.x1 - f.x0)) * cw, y: (f.y0 + ay * (f.y1 - f.y0)) * ch };
  }

  // Drawing-buffer pixel -> artboard fraction (may fall outside 0..1 when zoomed).
  function unproject(px, py) {
    const f = frame || frameFor(focusBox);
    const W = canvas.width || 1, H = canvas.height || 1;
    return { x: (px / W - f.x0) / (f.x1 - f.x0), y: (py / H - f.y0) / (f.y1 - f.y0) };
  }

  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    lastTap = {
      x: ((e.clientX - rect.left) / (rect.width || 1)) * canvas.width,
      y: ((e.clientY - rect.top) / (rect.height || 1)) * canvas.height,
    };
  });

  if (onMuscleClick) {
    r.on(window.rive.EventType.RiveEvent, (event) => {
      const muscle = extractMuscleName(event?.data);
      if (muscle) onMuscleClick(muscle, RIVE_TO_APP_GROUP[muscle], lastTap ? unproject(lastTap.x, lastTap.y) : null);
    });
  }

  // The canvas is often created while its tab is display:none (zero size), and phones
  // rotate. Rive only sizes its drawing surface on load, so without this the figure
  // renders blurry or stretched the first time the tab becomes visible. Resizing also
  // resets Rive's layout to the full canvas, so the zoom frame is put back afterwards.
  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => {
      try { r.resizeDrawingSurfaceToCanvas(); } catch { return; /* not loaded yet */ }
      if (!loaded) return;
      if (!tween) frame = frameFor(focusBox);
      applyFrame(frame);
    });
    ro.observe(canvas);
  }

  const api = {
    setIntensities: (next) => applyIntensities(r, next),
    setPalette: (next) => applyPalette(r, next),
    focus,
    project,
    get zoomed() { return !!focusBox; },
    resize: () => {
      r.resizeDrawingSurfaceToCanvas();
      if (loaded) { frame = frameFor(focusBox); applyFrame(frame); }
    },
    destroy: () => { if (tween) cancelAnimationFrame(tween); ro?.disconnect(); r.cleanup(); },
  };
  return api;
}

function applyIntensities(r, intensities) {
  const vmi = r.viewModelInstance;
  if (!vmi) return;
  for (const muscle of ALL_MUSCLES) {
    const n = vmi.number(`${muscle}/intensity`);
    if (n) n.value = intensities[muscle] ?? 0;
  }
}

function applyPalette(r, palette) {
  if (!palette) return;
  const vmi = r.viewModelInstance;
  if (!vmi) return;
  for (const muscle of ALL_MUSCLES) {
    const set = (name, c) => {
      const prop = vmi.color(`${muscle}/${PALETTE_VM}/${name}`);
      if (prop && c) prop.rgb(c.r, c.g, c.b);
    };
    set("baseColor", palette.base);
    set("colorLevel1", palette.level1);
    set("colorLevel2", palette.level2);
    set("colorLevel3", palette.level3);
    set("colorLevel4", palette.level4);
  }
}

// Rive event payload shape: { name, properties? }. Validated against ALL_MUSCLES so an
// unrelated or future event can't leak an unexpected string to the caller.
function extractMuscleName(payload) {
  if (payload && typeof payload.name === "string" && MUSCLE_SET.has(payload.name)) {
    return payload.name;
  }
  const props = payload?.properties;
  if (props) {
    for (const value of Object.values(props)) {
      if (typeof value === "string" && MUSCLE_SET.has(value)) return value;
    }
  }
  return null;
}

// The app's existing 4-stop heat gradient (index.html HEAT_STOPS), as an RGB palette this
// module can push into the .riv file. Level 0 (untrained) intentionally left as the file's
// own neutral base color rather than forced -- only levels 1-4 are ours to define.
export const APP_HEAT_PALETTE = {
  base: { r: 0x23, g: 0x2a, b: 0x31 },
  level1: { r: 242, g: 208, b: 36 },
  level2: { r: 245, g: 155, b: 31 },
  level3: { r: 224, g: 82, b: 31 },
  level4: { r: 143, g: 16, b: 16 },
};
