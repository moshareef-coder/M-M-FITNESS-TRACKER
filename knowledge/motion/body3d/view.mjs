// Shared scene plumbing for the two demo pages: materials, one figure in one
// scene, framing, and the per frame draw. Nothing here knows about layout.

import * as THREE from "three";
import { samplePose, solvePose, litIntensity } from "./fitrig/index.mjs";
import { gripSides, GROUND } from "./fitrig/rig.mjs";
import { buildFigure } from "./body.mjs";
import { GROUPS, BONE_REGION, DEEP_REGION, REGION_COUNT, MUSCLES } from "./muscles.mjs";

// Two themes, because the app puts this figure on a white card as well as on
// a dark one. The relationships are what matter and they are the same in both:
// the muscle is the mid tone that carries the figure, the exposed bone (skull,
// hands, feet) is lighter than it, the bone UNDER muscle is darker than it so
// a gap reads as depth, and the seam is the darkest thing on the figure.
export const THEMES = {
  dark: {
    bg: 0x11151b,
    muscle: 0x616c80,     // resting tone, the neutral the Rive body rests at
    bone: 0xc3cbd9,       // skull, hands, feet: the pale of the Rive body
    deep: 0x333d4b,       // bone under muscle: a gap has to read as depth
    ink: 0x090c11,
    heat: "#e0521f",
    shadow: [150, 175, 215, 0.30],
    ambient: 0.62, key: 2.5, fill: 0.55, rim: 1.25,
  },
  light: {
    bg: 0xffffff,
    muscle: 0x8d97a6,     // mid slate: dark enough to read on white, not a lump
    bone: 0xdfe3ea,       // pale warm grey
    deep: 0x6b7482,       // still below the muscle, so gaps still read as depth
    ink: 0x252c36,
    heat: "#e0521f",
    shadow: [90, 105, 130, 0.22],
    ambient: 0.80, key: 1.85, fill: 0.40, rim: 0.30,
  },
};
// Mutated in place by setTheme, so anything that already imported it keeps
// working without re-importing.
export const PALETTE = { ...THEMES.dark };
let themeName = "dark";
const stages = new Set();

export function setTheme(name) {
  themeName = THEMES[name] ? name : "dark";
  Object.assign(PALETTE, THEMES[themeName]);
  for (const st of stages) applyTheme(st);
  return themeName;
}
export function currentTheme() { return themeName; }

function applyTheme(st) {
  st.shadow.material.map = shadowTexture(themeName);
  st.shadow.material.needsUpdate = true;
  st.shell.material.color.set(PALETTE.ink);
  st.lights.ambient.intensity = PALETTE.ambient;
  st.lights.key.intensity = PALETTE.key;
  st.lights.fill.intensity = PALETTE.fill;
  st.lights.rim.intensity = PALETTE.rim;
}

// Three flat steps. A toon ramp, not a gradient: the Rive body has no soft
// shading anywhere and neither should this.
export function makeGradientMap(steps = 3) {
  const data = new Uint8Array(steps);
  const stops = steps === 3 ? [0.46, 0.78, 1.0] : null;
  for (let i = 0; i < steps; i++)
    data[i] = Math.round((stops ? stops[i] : (i + 0.9) / steps) * 255);
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const N = REGION_COUNT;

// One material for the whole figure. Every vertex carries the index of its
// lighting group, and the group's colour comes out of a uniform array, so
// lighting one muscle group is a uniform write and not a material swap.
export function makeBodyMaterial(gradientMap) {
  const mat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap });
  const tint = [], emis = [];
  for (let i = 0; i < N; i++) { tint.push(new THREE.Color(1, 1, 1)); emis.push(new THREE.Color(0, 0, 0)); }
  mat.userData.uTint = { value: tint };
  mat.userData.uEmis = { value: emis };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTint = mat.userData.uTint;
    shader.uniforms.uEmis = mat.userData.uEmis;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>
        attribute float aRegion;
        uniform vec3 uTint[${N}];
        uniform vec3 uEmis[${N}];
        varying vec3 vRegTint;
        varying vec3 vRegEmis;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        int rIdx = int(aRegion + 0.5);
        vRegTint = uTint[rIdx];
        vRegEmis = uEmis[rIdx];`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vRegTint;
        varying vec3 vRegEmis;`)
      .replace("vec4 diffuseColor = vec4( diffuse, opacity );",
        "vec4 diffuseColor = vec4( diffuse * vRegTint, opacity );")
      .replace("vec3 totalEmissiveRadiance = emissive;",
        "vec3 totalEmissiveRadiance = emissive + vRegEmis;");
  };
  mat.customProgramCacheKey = () => "ft-proc-toon";
  return mat;
}

// ------------------------------------------------------------ the seams ---
// The old seam was a back face shell: every muscle got a constant width ink
// band whether or not anything was next to it, which is what turned a crowded
// shoulder to mush and ate thin sheets whole. This draws the id and the depth
// of every part into a buffer first, then inks only the pixels whose
// neighbour belongs to a DIFFERENT part, on the far side of the pair, with the
// strength set by how big the depth step is. A smooth muscle gets no line
// anywhere inside itself.
export function makeIdMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `
      attribute float aId;
      varying float vId;
      varying float vDepth;
      void main() {
        vId = aId;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vDepth = gl_Position.z / gl_Position.w * 0.5 + 0.5;
      }`,
    fragmentShader: `
      varying float vId;
      varying float vDepth;
      void main() {
        float d = clamp(vDepth, 0.0, 1.0);
        float hi = floor(d * 255.0) / 255.0;
        float lo = fract(d * 255.0);
        gl_FragColor = vec4(vId / 255.0, 0.0, hi, lo);
      }`,
  });
}

const SEAM_FRAG = `
  uniform sampler2D tCol;
  uniform sampler2D tId;
  uniform vec2 texel;
  uniform vec3 ink;
  uniform float seam;
  uniform float range;
  varying vec2 vUv;
  vec4 grab(vec2 o) { return texture2D(tId, vUv + o * texel); }
  void main() {
    vec3 c = texture2D(tCol, vUv).rgb;
    vec4 m = grab(vec2(0.0));
    float d0 = m.b + m.a / 255.0;
    float e = 0.0;
    vec4 n;
    float dn;
    #define TAP(ox, oy) n = grab(vec2(ox, oy)); \
      if (abs(n.r - m.r) > 0.0015) { dn = n.b + n.a / 255.0; \
        if (d0 >= dn - 0.00002) e = max(e, 0.55 + clamp((d0 - dn) * range * 0.6, 0.0, 0.45)); }
    TAP(1.0, 0.0)
    TAP(-1.0, 0.0)
    TAP(0.0, 1.0)
    TAP(0.0, -1.0)
    vec3 o = mix(c, ink, e * seam);
    // A render target does not get three's output colour space conversion, so
    // the composite has to do it or the whole figure comes out two stops dark.
    o = mix(o * 12.92, 1.055 * pow(max(o, vec3(0.0)), vec3(0.41666)) - 0.055,
            step(vec3(0.0031308), o));
    gl_FragColor = vec4(o, 1.0);
  }`;

// The old shell, kept because it is the fallback if a device cannot give us a
// second render target.
export function makeOutlineMaterial(color, width) {
  const mat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = { value: width };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\n uniform float uOutline;")
      .replace("#include <begin_vertex>", "vec3 transformed = vec3( position + normal * uOutline );");
  };
  mat.customProgramCacheKey = () => "ft-proc-outline";
  return mat;
}

// The same lit set the material gets, as a per group 0..1 the generator can
// use to swell the working muscles. Reuses one array: do not keep the result.
const _con = new Float32Array(GROUPS.length + 2);
export function contractionFor(groups, intensity) {
  const on = new Set(groups || []);
  const i = Math.max(0, Math.min(1, intensity === undefined ? 1 : intensity));
  for (let r = 0; r < GROUPS.length; r++) _con[r] = on.has(GROUPS[r]) ? i : 0;
  return _con;
}

const _c = new THREE.Color();
const _rest = new THREE.Color();
const _boneC = new THREE.Color();
const _deepC = new THREE.Color();
export function setLit(mat, groups, color, intensity) {
  const on = new Set(groups || []);
  const col = color ? _c.set(color) : null;
  const i = Math.max(0, Math.min(1, intensity === undefined ? 1 : intensity));
  const tint = mat.userData.uTint.value, emis = mat.userData.uEmis.value;
  _rest.set(PALETTE.muscle);
  _boneC.set(PALETTE.bone);
  for (let r = 0; r < GROUPS.length; r++) {
    if (col && on.has(GROUPS[r])) {
      tint[r].copy(_rest).lerp(col, 0.30 + 0.55 * i);
      emis[r].copy(col).multiplyScalar(0.10 + 0.55 * i * i);
    } else {
      tint[r].copy(_rest);
      emis[r].setRGB(0, 0, 0);
    }
  }
  tint[BONE_REGION].copy(_boneC);
  emis[BONE_REGION].setRGB(0, 0, 0);
  tint[DEEP_REGION].copy(_deepC.set(PALETTE.deep));
  emis[DEEP_REGION].setRGB(0, 0, 0);
}

// One soft contact ellipse, painted once and shared.
const _shadowTex = {};
function shadowTexture(theme) {
  if (_shadowTex[theme]) return _shadowTex[theme];
  const [r, g2, b, a] = (THEMES[theme] || THEMES.dark).shadow;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const rad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rad.addColorStop(0, `rgba(${r},${g2},${b},${a})`);
  rad.addColorStop(0.45, `rgba(${r},${g2},${b},${a * 0.42})`);
  rad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rad;
  g.fillRect(0, 0, 128, 128);
  _shadowTex[theme] = new THREE.CanvasTexture(c);
  return _shadowTex[theme];
}

export function makeStage(gradientMap, outlineWidth = 0.20) {
  const seamStrength = 0.92;
  const scene = new THREE.Scene();
  const fig = buildFigure();
  const mat = makeBodyMaterial(gradientMap);
  const mesh = new THREE.Mesh(fig.geometry, mat);
  mesh.frustumCulled = false;
  const shell = new THREE.Mesh(fig.geometry, makeOutlineMaterial(PALETTE.ink, outlineWidth));
  shell.frustumCulled = false;
  shell.renderOrder = -1;
  // Left ON deliberately. A caller that renders the scene itself, rather than
  // through renderStage, still gets seams; renderStage switches the shell off
  // the first time it succeeds in making its buffers.

  const pivot = new THREE.Group();
  pivot.add(mesh);
  pivot.add(shell);
  scene.add(pivot);

  const ambient = new THREE.AmbientLight(0xffffff, PALETTE.ambient);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, PALETTE.key);
  key.position.set(-0.45, 0.9, 1.0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb4ff, PALETTE.fill);
  fill.position.set(0.95, 0.15, 0.35);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xbcd0ff, PALETTE.rim);
  rim.position.set(0.2, 0.35, -1.0);
  scene.add(rim);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture(themeName), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.2;
  scene.add(shadow);

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -400, 400);
  const st = { scene, cam, fig, mat, mesh, shell, pivot, shadow, seamStrength,
           lights: { ambient, key, fill, rim },
           rtId: null, rtCol: null, idMat: null, seamPass: null, size: [0, 0],
           focus: new THREE.Vector3(), radius: 60 };
  stages.add(st);
  return st;
}

// One full screen quad, shared by every stage on the page.
let _quad = null;
function quad() {
  if (_quad) return _quad;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(
    new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  const mat = new THREE.ShaderMaterial({
    uniforms: { tCol: { value: null }, tId: { value: null }, texel: { value: new THREE.Vector2() },
                ink: { value: new THREE.Color(PALETTE.ink) }, seam: { value: 0.9 },
                range: { value: 800 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }",
    fragmentShader: SEAM_FRAG,
    depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  const sc = new THREE.Scene();
  sc.add(mesh);
  _quad = { scene: sc, cam: new THREE.Camera(), mat };
  return _quad;
}

// Draw one stage at w by h device pixels, seams and all. Three passes: part
// ids and depth, then the figure, then the ink. Falls back to the shell if the
// render targets cannot be made.
export function renderStage(renderer, st, w, h) {
  const q = quad();
  if (st.size[0] !== w || st.size[1] !== h) {
    if (st.rtId) { st.rtId.dispose(); st.rtCol.dispose(); }
    const opt = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
                  format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: true };
    try {
      st.rtId = new THREE.WebGLRenderTarget(w, h, opt);
      st.rtCol = new THREE.WebGLRenderTarget(w, h,
        { ...opt, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
      st.rtCol.texture.colorSpace = THREE.NoColorSpace;
      st.idMat = st.idMat || makeIdMaterial();
      st.shell.visible = false;
    } catch (e) {
      st.rtId = null;
      st.shell.visible = true;
    }
    st.size[0] = w; st.size[1] = h;
  }
  if (!st.rtId) { renderer.render(st.scene, st.cam); return; }

  const clear = renderer.getClearColor(new THREE.Color()).clone();
  const shadowWas = st.shadow.visible;
  st.shadow.visible = false;
  st.scene.overrideMaterial = st.idMat;
  renderer.setRenderTarget(st.rtId);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(st.scene, st.cam);

  st.scene.overrideMaterial = null;
  st.shadow.visible = shadowWas;
  renderer.setClearColor(clear, 1);
  renderer.setRenderTarget(st.rtCol);
  renderer.clear();
  renderer.render(st.scene, st.cam);

  renderer.setRenderTarget(null);
  q.mat.uniforms.tCol.value = st.rtCol.texture;
  q.mat.uniforms.tId.value = st.rtId.texture;
  q.mat.uniforms.texel.value.set(1 / w, 1 / h);
  q.mat.uniforms.seam.value = st.seamStrength;
  q.mat.uniforms.ink.value.set(PALETTE.ink);
  q.mat.uniforms.range.value = st.cam.far - st.cam.near;
  renderer.render(q.scene, q.cam);
}

// Frame the shot from the extremes of the whole rep, so the camera does not
// breathe with the animation. Yaw independent: a spun figure sweeps a
// cylinder, so the widest it can ever look is the diagonal of its footprint.
export function frameStage(st, move, pad = 4) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const pos = st.fig.geometry.getAttribute("position");
  let first = true;
  for (let i = 0; i < 10; i++) {
    st.fig.update(solvePose(samplePose(move, i / 10, 0), move.view));
    for (let k = 0; k < pos.count; k += 7) {
      v.fromBufferAttribute(pos, k);
      if (first) { box.set(v.clone(), v.clone()); first = false; } else box.expandByPoint(v);
    }
  }
  box.getCenter(st.focus);
  const size = box.getSize(new THREE.Vector3());
  const wide = Math.hypot(size.x, size.z) + pad;
  const FLOOR = 0.10;
  const top = box.max.y + pad;
  st.radius = Math.max(top / (2 - 2 * FLOOR), wide / 2);
  st.focus.y = Math.min(st.radius * (1 - 2 * FLOOR), Math.max(st.radius * 0.12, top * 0.5));
  st.focus.x = 0;
  st.shadow.scale.setScalar(Math.max(wide, size.x + 24));
  st.shadow.position.z = st.focus.z;
}

export function aimCamera(st, baseDeg, yawDeg) {
  const a = THREE.MathUtils.degToRad(baseDeg + yawDeg);
  const d = st.radius * 2.2;
  st.cam.position.set(st.focus.x + Math.sin(a) * d, st.focus.y + st.radius * 0.10,
                      st.focus.z + Math.cos(a) * d);
  st.cam.up.set(0, 1, 0);
  st.cam.lookAt(st.focus);
  const r = st.radius;
  st.cam.left = -r; st.cam.right = r; st.cam.top = r; st.cam.bottom = -r;
  st.cam.updateProjectionMatrix();
}

// The grip the move implies, in the shape update() wants. One call, so the
// app never has to think about it: a barbell in the hands closes them.
export function gripsFor(move, S) {
  const g = gripSides(move, S) || {};
  const out = { L: g.L || "open", R: g.R || "open" };
  for (const p of (move && move.props) || []) {
    // a barbell is two handed by definition, whichever side the prop names,
    // and a weight held at the wrist is still a weight being held
    const both = p.type === "barbell" || p.type === "pullupBar";
    if (!both && !["dumbbell", "kettlebell"].includes(p.type)) continue;
    const want = p.type === "pullupBar" ? "hook" : "closed";
    for (const s of both ? ["L", "R"] : [p.side || "R"]) if (out[s] === "open") out[s] = want;
  }
  // the rig's own floor test asks where the finger tips are, which a push-up
  // sends back up in the air. The joint that is actually on the floor is the
  // wrist.
  if (S) for (const s of ["L", "R"]) {
    if (out[s] === "open" && S.sides[s].wrist.y > GROUND - 8) out[s] = "flat";
  }
  return out;
}

export { samplePose, solvePose, litIntensity, MUSCLES, GROUPS };
