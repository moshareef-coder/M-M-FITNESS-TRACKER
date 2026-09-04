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

/**
 * Load one artboard onto a canvas and wire it up to intensities/palette/click callback.
 * Returns a controller: { setIntensities, setPalette, destroy }. Caller owns the canvas
 * element's sizing; this only draws into it.
 */
export function createBodyHeatmap({ canvas, artboardName, palette, intensities, onMuscleClick, onLoad }) {
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
      onLoad?.(r);
    },
    onLoadError: (e) => console.error("Rive body heatmap failed to load:", e),
  });

  if (onMuscleClick) {
    r.on(window.rive.EventType.RiveEvent, (event) => {
      const muscle = extractMuscleName(event?.data);
      if (muscle) onMuscleClick(muscle, RIVE_TO_APP_GROUP[muscle]);
    });
  }

  // The canvas is often created while its tab is display:none (zero size), and phones
  // rotate. Rive only sizes its drawing surface on load, so without this the figure
  // renders blurry or stretched the first time the tab becomes visible.
  let ro = null;
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(() => {
      try { r.resizeDrawingSurfaceToCanvas(); } catch { /* not loaded yet */ }
    });
    ro.observe(canvas);
  }

  return {
    setIntensities: (next) => applyIntensities(r, next),
    setPalette: (next) => applyPalette(r, next),
    resize: () => r.resizeDrawingSurfaceToCanvas(),
    destroy: () => { ro?.disconnect(); r.cleanup(); },
  };
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

// Single-hue ramp on the app's electric lime accent (#a8ff00): dim for a light touch,
// full accent for a heavily worked muscle. Used by the live Body tab, where one colour
// getting brighter reads cleaner than a yellow-to-red heat scale next to lime UI.
export const LIME_PALETTE = {
  base: { r: 0x2a, g: 0x30, b: 0x38 },
  level1: { r: 84, g: 128, b: 0 },
  level2: { r: 118, g: 180, b: 0 },
  level3: { r: 150, g: 228, b: 0 },
  level4: { r: 168, g: 255, b: 0 },
};
