// Shared scene plumbing for the two demo pages: materials, one figure in one
// scene, framing, and the per frame draw. Nothing here knows about layout.

import * as THREE from "three";
import { samplePose, solvePose, litIntensity } from "./fitrig/index.mjs";
import { buildFigure } from "./body.mjs";
import { GROUPS, BONE_REGION, DEEP_REGION, REGION_COUNT, MUSCLES } from "./muscles.mjs";

export const PALETTE = {
  bg: 0x11151b,
  muscle: 0x616c80,       // resting tone, the neutral the Rive body rests at
  bone: 0xc3cbd9,         // skull, hands, feet: the pale of the Rive body
  deep: 0x333d4b,         // bone under muscle: a gap has to read as depth
  ink: 0x090c11,
  heat: "#e0521f",
};

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

// The seams. Back faces only, every vertex pushed out along its own normal,
// which draws a constant width ink line around every muscle and every bone.
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
let _shadowTex = null;
function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const rad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rad.addColorStop(0, "rgba(140,165,205,0.26)");
  rad.addColorStop(0.45, "rgba(110,135,180,0.11)");
  rad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rad;
  g.fillRect(0, 0, 128, 128);
  _shadowTex = new THREE.CanvasTexture(c);
  return _shadowTex;
}

export function makeStage(gradientMap, outlineWidth = 0.20) {
  const scene = new THREE.Scene();
  const fig = buildFigure();
  const mat = makeBodyMaterial(gradientMap);
  const mesh = new THREE.Mesh(fig.geometry, mat);
  mesh.frustumCulled = false;
  const shell = new THREE.Mesh(fig.geometry, makeOutlineMaterial(PALETTE.ink, outlineWidth));
  shell.frustumCulled = false;
  shell.renderOrder = -1;

  const pivot = new THREE.Group();
  pivot.add(mesh);
  pivot.add(shell);
  scene.add(pivot);

  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(-0.45, 0.9, 1.0);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.55);
  fill.position.set(0.95, 0.15, 0.35);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xbcd0ff, 0.85);
  rim.position.set(0.2, 0.35, -1.0);
  scene.add(rim);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.2;
  scene.add(shadow);

  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -400, 400);
  return { scene, cam, fig, mat, mesh, shell, pivot, shadow,
           focus: new THREE.Vector3(), radius: 60 };
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

export { samplePose, solvePose, litIntensity, MUSCLES, GROUPS };
