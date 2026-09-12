// Fit Together: the procedural ecorche.
//
// Everything the figure is made of is generated here from the muscle library
// and one solved rig pose. No model file, no downloaded art.
//
// THE SHAPE OF A MUSCLE
//   Resolve the origin, the insertion and any wrap point against the bones of
//   the current frame. That gives a short control polyline in world space.
//   Run a Catmull-Rom through it (a two point muscle gets a third point
//   pushed out along the average of its two surface normals, which is the
//   belly). Sweep a cross section along the curve:
//     tube    an ellipse, `r` wide and `r * flat` thick, whose radius follows
//             a thin-thick-thin profile: the belly.
//     sheet   a grid of fibres, each its own curve from a point on the origin
//             LINE to a point on the insertion line, given thickness as a lens
//             so it has volume without needing a rim.
//   Both are fixed topology. Every frame only rewrites positions and normals
//   into one shared interleaved BufferGeometry, so there is one draw call for
//   the whole figure and one more for its ink outline.
//
// WHY NOT SKINNING
//   A skinned muscle has to be bound in a rest pose and then follows its two
//   bones linearly. That is fine for a bicep on a straight arm and wrong the
//   moment the elbow closes: the belly either collapses into the joint or
//   shears. Rebuilding the curve puts the wrap point back on the bone surface
//   every frame for free, which is the thing that makes a closed elbow read.
//   The cost is one pass over ~12k vertices per figure per frame, measured in
//   the page's own bench readout.

import * as THREE from "three";
import { GROUPS, BONE_REGION, DEEP_REGION, REGION_COUNT, BONE_LEN, MUSCLES, SKELETON,
         DIGITS, GRIP_SPEC, DIGIT_CURL } from "./muscles.mjs";

const RIG = { GROUND: 118, CENTER_X: 70 };
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- vec util --
const nrm = (o, i = 0) => {
  const L = Math.hypot(o[i], o[i + 1], o[i + 2]) || 1;
  o[i] /= L; o[i + 1] /= L; o[i + 2] /= L;
};
const cross = (a, b, o) => {
  const x = a[1] * b[2] - a[2] * b[1];
  const y = a[2] * b[0] - a[0] * b[2];
  const z = a[0] * b[1] - a[1] * b[0];
  o[0] = x; o[1] = y; o[2] = z;
};
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ------------------------------------------------------------- bone tables --
// The rig solves in its own frame (X anterior, Y down, Z to the figure's
// right) around a midline that depends on the move's plane. three wants Y up
// and the floor at 0, so both points and directions are converted once here
// and every other line in this file is plain three space.
const posOf = (p, mid, o) => { o[0] = p.z - mid.z; o[1] = RIG.GROUND - p.y; o[2] = p.x - mid.x; };
const dirOf = (v, o) => { o[0] = v.z; o[1] = -v.y; o[2] = v.x; };

function newBone() {
  return { A: new Float64Array(3), X: new Float64Array(3), Y: new Float64Array(3),
           Z: new Float64Array(3), len: 1, sx: 1, zdir: 1 };
}

// Build the bone dictionary for one solved pose. Reuses the same objects every
// frame: nothing here allocates after the first call.
export function boneTable(S, out) {
  const mid = S.frontal ? { x: 0, z: RIG.CENTER_X } : { x: RIG.CENTER_X, z: 0 };
  const t = out || {};
  const A = new Float64Array(3), B = new Float64Array(3), H = new Float64Array(3),
        Zh = new Float64Array(3);

  const set = (key, a, b, fx, fz, sx) => {
    const bone = t[key] || (t[key] = newBone());
    bone.A[0] = a[0]; bone.A[1] = a[1]; bone.A[2] = a[2];
    bone.Y[0] = b[0] - a[0]; bone.Y[1] = b[1] - a[1]; bone.Y[2] = b[2] - a[2];
    bone.len = Math.hypot(bone.Y[0], bone.Y[1], bone.Y[2]) || 1;
    bone.Y[0] /= bone.len; bone.Y[1] /= bone.len; bone.Y[2] /= bone.len;
    const d = dot(fx, bone.Y);
    bone.X[0] = fx[0] - bone.Y[0] * d; bone.X[1] = fx[1] - bone.Y[1] * d; bone.X[2] = fx[2] - bone.Y[2] * d;
    nrm(bone.X);
    cross(bone.X, bone.Y, bone.Z);
    // Keep every bone frame RIGHT handed, or the baked skeleton solids come
    // out reflected and render inside out. A bone whose Y runs up the body
    // (spine, neck, head) then has its Z pointing at the figure's LEFT, so
    // record which way it faces and let the angle convention flip instead.
    bone.zdir = dot(bone.Z, fz) < 0 ? -1 : 1;
    bone.sx = sx;
    return bone;
  };

  const TX = new Float64Array(3), TY = new Float64Array(3), TZ = new Float64Array(3);
  dirOf(S.frames.torso.x, TX); dirOf(S.frames.torso.y, TY); dirOf(S.frames.torso.z, TZ);
  const NX = new Float64Array(3), NZ = new Float64Array(3);
  dirOf(S.frames.neck.x, NX); dirOf(S.frames.neck.z, NZ);

  posOf(S.p3.pelvis, mid, A); posOf(S.p3.chest, mid, B);
  set("spine", A, B, TX, TZ, 0.78);
  H[0] = A[0] + TY[0] * 9; H[1] = A[1] + TY[1] * 9; H[2] = A[2] + TY[2] * 9;
  set("pelvis", A, H, TX, TZ, 0.80);
  posOf(S.p3.chest, mid, A); posOf(S.p3.neckTop, mid, B);
  set("neck", A, B, NX, NZ, 0.92);
  posOf(S.p3.neckTop, mid, A); posOf(S.p3.head, mid, B);
  set("head", A, B, NX, NZ, 0.88);

  for (const s of ["L", "R"]) {
    const K = S.sides[s];
    const fx = new Float64Array(3), fz = new Float64Array(3);
    const limb = (key, a, b, frame, sx) => {
      posOf(a, mid, A); posOf(b, mid, B);
      dirOf(frame.x, fx); dirOf(frame.z, fz);
      set(key + s, A, B, fx, fz, sx === undefined ? 1 : sx);
    };
    // clavicle and heel have no rig frame of their own: they take the anterior
    // face of the bone they hang off.
    posOf(S.p3.chest, mid, A); posOf(K.p3.shoulder, mid, B);
    set("clav" + s, A, B, TX, TZ, 1);
    limb("humerus", K.p3.shoulder, K.p3.elbow, K.frames.arm);
    limb("ulna", K.p3.elbow, K.p3.wrist, K.frames.fore);
    limb("hand", K.p3.wrist, K.p3.hand, K.frames.hand);
    limb("femur", K.p3.hip, K.p3.knee, K.frames.thigh);
    limb("tibia", K.p3.knee, K.p3.ankle, K.frames.shin);
    limb("foot", K.p3.ankle, K.p3.toe, K.frames.foot);
    dirOf(K.frames.foot.x, fx); dirOf(K.frames.foot.z, fz);
    posOf(K.p3.ankle, mid, A); posOf(K.p3.heel, mid, B);
    set("calc" + s, A, B, fx, fz, 1);
    if (S.frontal) faceFootForward(t, s, TX);
  }
  return t;
}

// The ankle angle is real; the plane the rig swings it in is not. A frontal
// move rotates the foot inside the frontal plane, which in three dimensions
// points the toes straight out to the side. Keep the angle the foot makes with
// the shin and swing it into the sagittal plane instead, with the small splay
// a standing person actually has.
const SPLAY = 14 * Math.PI / 180;
const _f1 = new Float64Array(3), _f2 = new Float64Array(3), _f3 = new Float64Array(3);
function faceFootForward(t, s, anterior) {
  const foot = t["foot" + s], shin = t["tibia" + s], calc = t["calc" + s];
  if (!foot || !shin) return;
  const lat = s === "R" ? 1 : -1;
  const cosA = Math.max(-1, Math.min(1, dot(shin.Y, foot.Y)));
  const ang = Math.acos(cosA);
  // anterior, with any component along the shin removed
  const d = dot(anterior, shin.Y);
  for (let k = 0; k < 3; k++) _f1[k] = anterior[k] - shin.Y[k] * d;
  nrm(_f1);
  // lateral, perpendicular to both, for the splay
  cross(shin.Y, _f1, _f2); nrm(_f2);
  const sl = Math.sin(SPLAY) * lat * (dot(_f2, shin.Z) < 0 ? -1 : 1);
  const cs = Math.cos(ang), sn = Math.sin(ang) * Math.cos(SPLAY), sx = Math.sin(ang) * sl;
  for (let k = 0; k < 3; k++) _f3[k] = shin.Y[k] * cs + _f1[k] * sn + _f2[k] * sx;
  nrm(_f3);
  const reframe = (bone, len, sign) => {
    for (let k = 0; k < 3; k++) bone.Y[k] = _f3[k] * sign;
    // x is the top of the foot: perpendicular to the sole, away from the shin
    const dd = dot(shin.Y, bone.Y);
    for (let k = 0; k < 3; k++) bone.X[k] = -(shin.Y[k] - bone.Y[k] * dd);
    nrm(bone.X);
    cross(bone.X, bone.Y, bone.Z);
    if (dot(bone.Z, shin.Z) < 0) { bone.Z[0] *= -1; bone.Z[1] *= -1; bone.Z[2] *= -1;
      bone.X[0] *= -1; bone.X[1] *= -1; bone.X[2] *= -1; }
    bone.len = len;
  };
  reframe(foot, foot.len, 1);
  if (calc) reframe(calc, calc.len, -1);
}

// A hand the rig has decided is flat on the floor should have its palm on the
// floor, not on its edge. Roll the hand about its own long axis; nothing else
// about the pose changes.
const _p1 = new Float64Array(3);
function flattenPalm(bone, s) {
  const lat = s === "R" ? 1 : -1;
  const d = -bone.Y[1];                     // world down, projected off Y
  _p1[0] = -bone.Y[0] * d; _p1[1] = -1 - bone.Y[1] * d; _p1[2] = -bone.Y[2] * d;
  const L = Math.hypot(_p1[0], _p1[1], _p1[2]);
  if (L < 0.12) return;                     // pointing straight down, no roll to pick
  for (let k = 0; k < 3; k++) bone.Z[k] = -lat * _p1[k] / L;
  cross(bone.Y, bone.Z, bone.X);
  nrm(bone.X);
}

// One attachment, for strand j in [-0.5, +0.5] and side lat (+1 right).
const _o = new Float64Array(3);
function attach(bones, spec, sfx, lat, j, P, k, U) {
  const b = bones[spec.bone + sfx] || bones[spec.bone];
  const t = spec.t + (spec.spanT || 0) * j;
  const a = (spec.ang + (spec.spanA || 0) * j) * DEG;
  const r = spec.r + (spec.spanR || 0) * j;
  const c = Math.cos(a), s = Math.sin(a) * lat * b.zdir;
  const alongY = t * b.len;
  const cx = r * c * b.sx, cz = r * s;
  P[k] = b.A[0] + b.Y[0] * alongY + b.X[0] * cx + b.Z[0] * cz;
  P[k + 1] = b.A[1] + b.Y[1] * alongY + b.X[1] * cx + b.Z[1] * cz;
  P[k + 2] = b.A[2] + b.Y[2] * alongY + b.X[2] * cx + b.Z[2] * cz;
  if (U) {
    // Normal of the ellipse, not of the circle, or a muscle on the flat of the
    // chest would stand off at the wrong angle.
    const ux = c / b.sx, uz = s;
    U[k] = b.X[0] * ux + b.Z[0] * uz;
    U[k + 1] = b.X[1] * ux + b.Z[1] * uz;
    U[k + 2] = b.X[2] * ux + b.Z[2] * uz;
    nrm(U, k);
  }
}

// Uniform Catmull-Rom through n control points held in P (flat, stride 3),
// endpoints duplicated so the curve starts and ends exactly on them.
function crEval(P, n, u, o) {
  const segs = n - 1;
  let f = u * segs;
  let i = Math.min(segs - 1, Math.floor(f));
  f -= i;
  const i0 = Math.max(0, i - 1) * 3, i1 = i * 3, i2 = (i + 1) * 3, i3 = Math.min(n - 1, i + 2) * 3;
  const f2 = f * f, f3 = f2 * f;
  const c0 = -0.5 * f3 + f2 - 0.5 * f;
  const c1 = 1.5 * f3 - 2.5 * f2 + 1;
  const c2 = -1.5 * f3 + 2 * f2 + 0.5 * f;
  const c3 = 0.5 * f3 - 0.5 * f2;
  o[0] = P[i0] * c0 + P[i1] * c1 + P[i2] * c2 + P[i3] * c3;
  o[1] = P[i0 + 1] * c0 + P[i1 + 1] * c1 + P[i2 + 1] * c2 + P[i3 + 1] * c3;
  o[2] = P[i0 + 2] * c0 + P[i1 + 2] * c1 + P[i2 + 2] * c2 + P[i3 + 2] * c3;
}

// thin - thick - thin. `peak` slides where the belly sits, which is the
// difference between a gastrocnemius (high) and a vastus medialis (low).
// `sharp` above 1 pulls the thick part into a narrower band around the peak,
// which is what a contracting muscle does: it gets shorter and fatter rather
// than uniformly bigger.
function bellyProfile(s, a, b, c, peak, sharp) {
  const base = a + (c - a) * s;
  const u = s < peak ? (s / peak) : (1 - (s - peak) / (1 - peak));
  let w = Math.sin(Math.max(0, Math.min(1, u)) * Math.PI * 0.5);
  w = w * w * (3 - 2 * w);
  if (sharp !== undefined && sharp !== 1) w = Math.pow(w, sharp);
  return base + (b - base) * w;
}

// The across-the-fibres profile. A muscle is not the same width all the way
// down: the vastus lateralis is wide at the hip and narrow at the knee, the
// latissimus is a sheet at the spine and a strap at the armpit. Without this
// every muscle is a parallel sausage and a thigh reads as four of them.
const WIDE1 = [1, 1, 1];
function wideAt(m, s) {
  const w = m.wide;
  if (!w) return 1;
  return bellyProfile(s, w[0], w[1], w[2], m.widePeak === undefined ? 0.45 : m.widePeak);
}

// ----------------------------------------------------------- the generator --
const RING = 8;          // ring segments around a tube
const LONG = 11;         // samples along any muscle

export function buildFigure(opts = {}) {
  const ringC = new Float32Array(RING), ringS = new Float32Array(RING);
  for (let i = 0; i < RING; i++) {
    ringC[i] = Math.cos((i / RING) * Math.PI * 2);
    ringS[i] = Math.sin((i / RING) * Math.PI * 2);
  }

  const items = [];           // every dynamic muscle instance
  const rigid = [];           // every skeleton part
  let vTotal = 0, iTotal = 0;

  // ---- muscles: lay out the buffer
  for (const m of MUSCLES) {
    for (const side of (m.side === "mid" ? [0] : [1, -1])) {
      const sfx = side > 0 ? "R" : "L";
      const region = GROUPS.indexOf(m.group);
      const wideArr = new Float64Array(LONG);
      for (let i = 0; i < LONG; i++) wideArr[i] = wideAt(m, i / (LONG - 1));
      if (m.kind === "tube") {
        const nv = RING * LONG + 2;
        const ni = RING * (LONG - 1) * 6 + RING * 6;
        items.push({ m, lat: side, sfx, region, kind: 1, wideArr, v0: vTotal, nv, i0: iTotal, ni });
        vTotal += nv; iTotal += ni;
      } else {
        const nj = m.strands || 6;
        const nv = nj * LONG * 2;
        const ni = (nj - 1) * (LONG - 1) * 12;
        items.push({ m, lat: side, sfx, region, kind: 2, nj, wideArr, v0: vTotal, nv, i0: iTotal, ni });
        vTotal += nv; iTotal += ni;
      }
    }
  }

  // ---- skeleton: bake each part into its bone's local space once
  const partCache = new Map();
  for (const [boneKey, spec, tone] of SKELETON) {
    const key = boneKey + JSON.stringify(spec);
    let baked = partCache.get(key);
    if (!baked) { baked = bakePart(spec, BONE_LEN[boneKey]); partCache.set(key, baked); }
    const paired = !["spine", "pelvis", "neck", "head"].includes(boneKey);
    for (const sfx of paired ? ["L", "R"] : [""]) {
      rigid.push({ bone: boneKey + sfx, baked, mirror: sfx === "L",
                   region: tone === "pale" ? BONE_REGION : DEEP_REGION, v0: vTotal, i0: iTotal,
                   nv: baked.pos.length / 3, ni: baked.idx.length });
      vTotal += baked.pos.length / 3;
      iTotal += baked.idx.length;
    }
  }

  // Digits. Same buffer, same one draw call, but their local frame is
  // recomputed each frame from the move's grip rather than being baked.
  const digitCache = new Map();
  for (const sfx of ["L", "R"]) {
    for (let d = 0; d < DIGITS.length; d++) {
      const dg = DIGITS[d];
      for (let k = 0; k < dg.seg.length; k++) {
        const key = d + ":" + k;
        let baked = digitCache.get(key);
        if (!baked) { baked = bakeDigit(dg, k); digitCache.set(key, baked); }
        rigid.push({ bone: "hand" + sfx, baked, mirror: sfx === "L", region: BONE_REGION,
                     digit: { side: sfx, d, k }, v0: vTotal, i0: iTotal,
                     nv: baked.pos.length / 3, ni: baked.idx.length });
        vTotal += baked.pos.length / 3;
        iTotal += baked.idx.length;
      }
    }
  }

  const position = new Float32Array(vTotal * 3);
  const normal = new Float32Array(vTotal * 3);
  const region = new Float32Array(vTotal);
  // Every muscle and every bone solid carries its own id, so the seam pass can
  // ask "is my neighbour a different part" instead of guessing from normals.
  const partId = new Float32Array(vTotal);
  const index = new (vTotal > 65535 ? Uint32Array : Uint16Array)(iTotal);

  // ---- indices, once. Winding is decided at build time from the rest pose
  // (see finish()), so the outline shell can safely draw back faces only.
  let nextId = 1;
  const partNames = ["background"];
  for (const it of items) {
    partNames.push(it.m.id + "." + it.sfx);
  }
  for (const rp of rigid) {
    partNames.push("bone:" + rp.bone + (rp.digit ? ".d" + rp.digit.d + "." + rp.digit.k : ""));
  }
  for (const it of items) {
    const r = it.region, id = nextId++;
    for (let v = 0; v < it.nv; v++) { region[it.v0 + v] = r; partId[it.v0 + v] = id; }
  }
  for (const rp of rigid) {
    const id = nextId++;
    for (let v = 0; v < rp.nv; v++) { region[rp.v0 + v] = rp.region; partId[rp.v0 + v] = id; }
  }
  // The seam pass encodes the id in one byte, so it has to stay under 256.
  if (nextId > 255) for (let v = 0; v < vTotal; v++) partId[v] = 1 + (partId[v] % 254);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geo.setAttribute("aRegion", new THREE.BufferAttribute(region, 1));
  geo.setAttribute("aId", new THREE.BufferAttribute(partId, 1));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 45, 0), 130);

  // scratch, allocated once
  const ctrl = new Float64Array(6 * 3);
  const cpts = new Float64Array(LONG * 3);
  const uS = new Float64Array(LONG * 3);
  const grid = new Float64Array(10 * LONG * 3);
  const prof = new Float64Array(LONG);
  const U0 = new Float64Array(3), U1 = new Float64Array(3);
  const T = new Float64Array(3), V = new Float64Array(3), N = new Float64Array(3),
        Tj = new Float64Array(3), tmp = new Float64Array(3);
  let bones = null;
  let wound = false;

  function updateTube(it) {
    const m = it.m, lat = it.lat, sfx = it.sfx;
    let n = 0;
    attach(bones, m.from, sfx, lat, 0, ctrl, 0, U0); n++;
    if (m.via) for (const v of m.via) { attach(bones, v, sfx, lat, 0, ctrl, n * 3, null); n++; }
    attach(bones, m.to, sfx, lat, 0, ctrl, n * 3, U1); n++;
    const bulge = (m.bulge || 0) * (1 + 0.60 * (it.c || 0));
    if (n === 2 && bulge !== 0) {
      // no wrap point: the belly IS the control point, pushed off the chord
      // along the average of the two surface normals.
      ctrl[6] = ctrl[3]; ctrl[7] = ctrl[4]; ctrl[8] = ctrl[5];
      for (let k = 0; k < 3; k++) {
        const u = (U0[k] + U1[k]) * 0.5;
        ctrl[3 + k] = (ctrl[k] + ctrl[6 + k]) * 0.5 + u * bulge;
      }
      n = 3;
    } else if (bulge !== 0) {
      for (let c = 1; c < n - 1; c++)
        for (let k = 0; k < 3; k++) ctrl[c * 3 + k] += (U0[k] + U1[k]) * 0.5 * bulge;
    }

    for (let i = 0; i < LONG; i++) {
      const s = i / (LONG - 1);
      crEval(ctrl, n, s, tmp);
      cpts[i * 3] = tmp[0]; cpts[i * 3 + 1] = tmp[1]; cpts[i * 3 + 2] = tmp[2];
      for (let k = 0; k < 3; k++) uS[i * 3 + k] = U0[k] + (U1[k] - U0[k]) * s;
    }

    const flat = m.flat === undefined ? 1 : m.flat;
    const peak = m.peak === undefined ? 0.5 : m.peak;
    // Contraction. A working muscle is not uniformly bigger: the belly swells
    // and sharpens, the tendon ends draw in, and it stands further off the
    // bone. 12 per cent at full effort, which is enough to see and not enough
    // to look inflated.
    const c = it.c || 0;
    const r0 = m.r[0] * (1 - 0.06 * c), r1 = m.r[1] * (1 + 0.12 * c), r2 = m.r[2] * (1 - 0.06 * c);
    const sharp = 1 + 0.35 * c;
    const P = position, NM = normal;
    const WA = it.wideArr;
    for (let i = 0; i < LONG; i++) prof[i] = bellyProfile(i / (LONG - 1), r0, r1, r2, peak, sharp);
    for (let i = 0; i < LONG; i++) {
      const i0 = Math.max(0, i - 1) * 3, i1 = Math.min(LONG - 1, i + 1) * 3;
      T[0] = cpts[i1] - cpts[i0]; T[1] = cpts[i1 + 1] - cpts[i0 + 1]; T[2] = cpts[i1 + 2] - cpts[i0 + 2];
      const segLen = Math.hypot(T[0], T[1], T[2]) || 1;
      T[0] /= segLen; T[1] /= segLen; T[2] /= segLen;
      const d = uS[i * 3] * T[0] + uS[i * 3 + 1] * T[1] + uS[i * 3 + 2] * T[2];
      N[0] = uS[i * 3] - T[0] * d; N[1] = uS[i * 3 + 1] - T[1] * d; N[2] = uS[i * 3 + 2] - T[2] * d;
      nrm(N);
      cross(T, N, V); nrm(V);
      const rad = prof[i];
      const w = rad * WA[i];
      const h = rad * flat;
      // dr / d(arc length): T was a central difference, so the arc step and
      // the radius step share the same denominator and it cancels.
      const ia = Math.max(0, i - 1), ib = Math.min(LONG - 1, i + 1);
      const dw = (prof[ib] * WA[ib] - prof[ia] * WA[ia]) / segLen;
      const base = (it.v0 + i * RING) * 3;
      for (let a = 0; a < RING; a++) {
        const c = ringC[a], si = ringS[a];
        const o = base + a * 3;
        P[o] = cpts[i * 3] + V[0] * w * c + N[0] * h * si;
        P[o + 1] = cpts[i * 3 + 1] + V[1] * w * c + N[1] * h * si;
        P[o + 2] = cpts[i * 3 + 2] + V[2] * w * c + N[2] * h * si;
        let nx = V[0] * h * c + N[0] * w * si - T[0] * dw;
        let ny = V[1] * h * c + N[1] * w * si - T[1] * dw;
        let nz = V[2] * h * c + N[2] * w * si - T[2] * dw;
        const L = Math.hypot(nx, ny, nz) || 1;
        NM[o] = nx / L; NM[o + 1] = ny / L; NM[o + 2] = nz / L;
      }
    }
    // two end caps, collapsed to the curve ends
    const cA = (it.v0 + RING * LONG) * 3, cB = cA + 3;
    P[cA] = cpts[0]; P[cA + 1] = cpts[1]; P[cA + 2] = cpts[2];
    P[cB] = cpts[(LONG - 1) * 3]; P[cB + 1] = cpts[(LONG - 1) * 3 + 1]; P[cB + 2] = cpts[(LONG - 1) * 3 + 2];
    for (let k = 0; k < 3; k++) {
      NM[cA + k] = cpts[k] - cpts[3 + k];
      NM[cB + k] = cpts[(LONG - 1) * 3 + k] - cpts[(LONG - 2) * 3 + k];
    }
    nrm(NM, cA); nrm(NM, cB);
  }

  function updateSheet(it) {
    const m = it.m, lat = it.lat, sfx = it.sfx, nj = it.nj;
    const peak = m.peak === undefined ? 0.5 : m.peak;
    const cc = it.c || 0;
    const h0 = m.h[0] * (1 - 0.06 * cc), h1 = m.h[1] * (1 + 0.12 * cc), h2 = m.h[2] * (1 - 0.06 * cc);
    const hSharp = 1 + 0.35 * cc;
    // strand order is reversed on the left so the slab's two faces keep the
    // same winding on both sides of the body
    for (let jj = 0; jj < nj; jj++) {
      const j = (lat > 0 ? jj : nj - 1 - jj) / (nj - 1) - 0.5;
      let n = 0;
      attach(bones, m.from, sfx, lat, j, ctrl, 0, U0); n++;
      if (m.via) for (const v of m.via) { attach(bones, v, sfx, lat, j, ctrl, n * 3, null); n++; }
      attach(bones, m.to, sfx, lat, j, ctrl, n * 3, U1); n++;
      const bulge = (m.bulge || 0) * (1 + 0.60 * cc);
      if (n === 2 && bulge !== 0) {
        ctrl[6] = ctrl[3]; ctrl[7] = ctrl[4]; ctrl[8] = ctrl[5];
        for (let k = 0; k < 3; k++)
          ctrl[3 + k] = (ctrl[k] + ctrl[6 + k]) * 0.5 + (U0[k] + U1[k]) * 0.5 * bulge;
        n = 3;
      } else if (bulge !== 0) {
        for (let c = 1; c < n - 1; c++)
          for (let k = 0; k < 3; k++) ctrl[c * 3 + k] += (U0[k] + U1[k]) * 0.5 * bulge;
      }
      for (let i = 0; i < LONG; i++) {
        crEval(ctrl, n, i / (LONG - 1), tmp);
        const o = (jj * LONG + i) * 3;
        grid[o] = tmp[0]; grid[o + 1] = tmp[1]; grid[o + 2] = tmp[2];
        if (jj === 0) { const s = i / (LONG - 1);
          for (let k = 0; k < 3; k++) uS[i * 3 + k] = U0[k] + (U1[k] - U0[k]) * s; }
      }
    }
    // Narrow the sheet across its fibres. The strands are pulled toward the
    // centreline of the sheet by the width profile, so a fan can be a sheet at
    // its origin and a strap at its insertion without moving either
    // attachment. cpts is free here: only the tube path uses it.
    const WA = it.wideArr;
    if (m.wide) {
      for (let i = 0; i < LONG; i++) {
        let mx = 0, my = 0, mz = 0;
        for (let jj = 0; jj < nj; jj++) {
          const g = (jj * LONG + i) * 3;
          mx += grid[g]; my += grid[g + 1]; mz += grid[g + 2];
        }
        cpts[i * 3] = mx / nj; cpts[i * 3 + 1] = my / nj; cpts[i * 3 + 2] = mz / nj;
      }
      for (let i = 0; i < LONG; i++) {
        const k = WA[i];
        const mx = cpts[i * 3], my = cpts[i * 3 + 1], mz = cpts[i * 3 + 2];
        for (let jj = 0; jj < nj; jj++) {
          const g = (jj * LONG + i) * 3;
          grid[g] = mx + (grid[g] - mx) * k;
          grid[g + 1] = my + (grid[g + 1] - my) * k;
          grid[g + 2] = mz + (grid[g + 2] - mz) * k;
        }
      }
    }

    const P = position, NM = normal;
    const top = it.v0 * 3, bot = (it.v0 + nj * LONG) * 3;
    // One sign for the whole slab, taken at its centre. Per vertex signs tear
    // the sheet inside out wherever the fibres converge on an insertion and
    // the across-fibre direction collapses.
    let sheetSign = 1;
    {
      const jm = nj >> 1, im = LONG >> 1;
      const g = (jm * LONG + im) * 3;
      const a = (jm * LONG + im - 1) * 3, b = (jm * LONG + im + 1) * 3;
      T[0] = grid[b] - grid[a]; T[1] = grid[b + 1] - grid[a + 1]; T[2] = grid[b + 2] - grid[a + 2];
      const c = (Math.max(0, jm - 1) * LONG + im) * 3, d = (Math.min(nj - 1, jm + 1) * LONG + im) * 3;
      Tj[0] = grid[d] - grid[c]; Tj[1] = grid[d + 1] - grid[c + 1]; Tj[2] = grid[d + 2] - grid[c + 2];
      cross(T, Tj, N);
      if (N[0] * uS[im * 3] + N[1] * uS[im * 3 + 1] + N[2] * uS[im * 3 + 2] < 0) sheetSign = -1;
    }
    for (let i = 0; i < LONG; i++) prof[i] = bellyProfile(i / (LONG - 1), h0, h1, h2, peak, hSharp);
    for (let jj = 0; jj < nj; jj++) {
      const ju = nj === 1 ? 0.5 : jj / (nj - 1);
      // lens: full thickness through the middle of the sheet, knife edge at
      // the two long sides, so the slab closes without a rim
      let e = Math.min(1, Math.sin(ju * Math.PI) * 3.2);
      e = Math.pow(e, 0.45);
      for (let i = 0; i < LONG; i++) {
        const s = i / (LONG - 1);
        const g = (jj * LONG + i) * 3;
        const a = (jj * LONG + Math.max(0, i - 1)) * 3, b = (jj * LONG + Math.min(LONG - 1, i + 1)) * 3;
        T[0] = grid[b] - grid[a]; T[1] = grid[b + 1] - grid[a + 1]; T[2] = grid[b + 2] - grid[a + 2];
        nrm(T);
        const c = (Math.max(0, jj - 1) * LONG + i) * 3, d = (Math.min(nj - 1, jj + 1) * LONG + i) * 3;
        Tj[0] = grid[d] - grid[c]; Tj[1] = grid[d + 1] - grid[c + 1]; Tj[2] = grid[d + 2] - grid[c + 2];
        nrm(Tj);
        cross(T, Tj, N);
        if (Math.hypot(N[0], N[1], N[2]) < 1e-6) { N[0] = uS[i * 3]; N[1] = uS[i * 3 + 1]; N[2] = uS[i * 3 + 2]; }
        nrm(N);
        if (sheetSign < 0) { N[0] = -N[0]; N[1] = -N[1]; N[2] = -N[2]; }
        const h = prof[i] * e;
        const o = jj * LONG + i;
        for (let k = 0; k < 3; k++) {
          P[top + o * 3 + k] = grid[g + k] + N[k] * h;
          P[bot + o * 3 + k] = grid[g + k] - N[k] * h;
          NM[top + o * 3 + k] = N[k];
          NM[bot + o * 3 + k] = -N[k];
        }
      }
    }
  }

  // Indices for the dynamic parts, written once against the rest pose so the
  // outward face is the one that gets drawn.
  function finish() {
    const P = position, NM = normal;
    const A = new Float64Array(3), B = new Float64Array(3), C = new Float64Array(3);
    const put = (o, a, b, c) => { index[o] = a; index[o + 1] = b; index[o + 2] = c; };
    for (const it of items) {
      // orientation test: does (v0, v1, v2) of the first quad face outward?
      let flip = false;
      if (it.kind === 1) {
        const p = (i, a) => it.v0 + i * RING + (a % RING);
        const a = p(0, 0), b = p(0, 1), c = p(1, 0);
        for (let k = 0; k < 3; k++) { A[k] = P[b * 3 + k] - P[a * 3 + k]; B[k] = P[c * 3 + k] - P[a * 3 + k]; }
        cross(A, B, C);
        flip = (C[0] * NM[a * 3] + C[1] * NM[a * 3 + 1] + C[2] * NM[a * 3 + 2]) < 0;
        let o = it.i0;
        for (let i = 0; i < LONG - 1; i++) {
          for (let a2 = 0; a2 < RING; a2++) {
            const v00 = p(i, a2), v01 = p(i, a2 + 1), v10 = p(i + 1, a2), v11 = p(i + 1, a2 + 1);
            if (flip) { put(o, v00, v10, v01); put(o + 3, v01, v10, v11); }
            else { put(o, v00, v01, v10); put(o + 3, v01, v11, v10); }
            o += 6;
          }
        }
        const cA = it.v0 + RING * LONG, cB = cA + 1;
        for (let a2 = 0; a2 < RING; a2++) {
          const v0 = p(0, a2), v1 = p(0, a2 + 1);
          if (flip) put(o, cA, v0, v1); else put(o, cA, v1, v0);
          o += 3;
          const w0 = p(LONG - 1, a2), w1 = p(LONG - 1, a2 + 1);
          if (flip) put(o, cB, w1, w0); else put(o, cB, w0, w1);
          o += 3;
        }
      } else {
        const nj = it.nj, top = it.v0, bot = it.v0 + nj * LONG;
        const p = (j, i) => j * LONG + i;
        // the first emitted triangle is (v00, v01, v10), so the test pair has
        // to be taken in that order or every sheet comes out inside out
        const a = top + p(0, 0), b = top + p(0, 1), c = top + p(1, 0);
        for (let k = 0; k < 3; k++) { A[k] = P[b * 3 + k] - P[a * 3 + k]; B[k] = P[c * 3 + k] - P[a * 3 + k]; }
        cross(A, B, C);
        flip = (C[0] * NM[a * 3] + C[1] * NM[a * 3 + 1] + C[2] * NM[a * 3 + 2]) < 0;
        let o = it.i0;
        for (let j = 0; j < nj - 1; j++) {
          for (let i = 0; i < LONG - 1; i++) {
            const v00 = p(j, i), v01 = p(j, i + 1), v10 = p(j + 1, i), v11 = p(j + 1, i + 1);
            if (flip) { put(o, top + v00, top + v10, top + v01); put(o + 3, top + v01, top + v10, top + v11); }
            else { put(o, top + v00, top + v01, top + v10); put(o + 3, top + v01, top + v11, top + v10); }
            o += 6;
            if (flip) { put(o, bot + v00, bot + v01, bot + v10); put(o + 3, bot + v01, bot + v11, bot + v10); }
            else { put(o, bot + v00, bot + v10, bot + v01); put(o + 3, bot + v01, bot + v10, bot + v11); }
            o += 6;
          }
        }
      }
    }
    // Skeleton solids: a reflected placement (the left side, or a bone whose
    // local Z faces left) has to have its winding turned round with it.
    for (const rp of rigid) {
      const b = bones[rp.bone];
      const flip = (rp.mirror ? -1 : 1) * (b ? b.zdir : 1) < 0;
      const src = rp.baked.idx;
      for (let k = 0; k < src.length; k += 3) {
        index[rp.i0 + k] = rp.v0 + src[flip ? k + 1 : k];
        index[rp.i0 + k + 1] = rp.v0 + src[flip ? k : k + 1];
        index[rp.i0 + k + 2] = rp.v0 + src[k + 2];
      }
    }
    geo.getIndex().needsUpdate = true;
  }

  // Per side, per digit, per segment: the joint position and the segment's own
  // basis, all in hand-bone local space. Allocated once.
  const chains = { L: [], R: [] };
  for (const sfx of ["L", "R"]) {
    for (const dg of DIGITS) {
      const segs = [];
      for (let k = 0; k < dg.seg.length; k++)
        segs.push({ O: new Float64Array(3), ex: new Float64Array(3),
                    ey: new Float64Array(3), ez: new Float64Array(3) });
      chains[sfx].push(segs);
    }
  }
  let gripNow = { L: "", R: "" };

  function computeChain(sfx, gripName) {
    const spec = GRIP_SPEC[gripName] || GRIP_SPEC.open;
    const curl = spec.curl * DEG;
    for (let d = 0; d < DIGITS.length; d++) {
      const dg = DIGITS[d], segs = chains[sfx][d];
      let ox = dg.root[0], oy = dg.root[1], oz = dg.root[2];
      if (dg.kind === "finger") {
        // the fingers flex toward the palm, which is local -z
        for (let k = 0; k < dg.seg.length; k++) {
          const a = curl * DIGIT_CURL[Math.min(k, DIGIT_CURL.length - 1)];
          const c = Math.cos(a), si = Math.sin(a);
          const S1 = segs[k];
          S1.O[0] = ox; S1.O[1] = oy; S1.O[2] = oz;
          S1.ex[0] = 1; S1.ex[1] = 0; S1.ex[2] = 0;
          S1.ey[0] = 0; S1.ey[1] = c; S1.ey[2] = -si;
          S1.ez[0] = 0; S1.ez[1] = si; S1.ez[2] = c;
          ox += S1.ey[0] * dg.seg[k]; oy += S1.ey[1] * dg.seg[k]; oz += S1.ey[2] * dg.seg[k];
        }
      } else {
        // the thumb swings out across the palm and then folds over it
        const th = spec.thumb * DEG;
        let ey0 = [Math.sin(th), Math.cos(th), -spec.over];
        const L0 = Math.hypot(ey0[0], ey0[1], ey0[2]);
        ey0 = [ey0[0] / L0, ey0[1] / L0, ey0[2] / L0];
        // ez perpendicular to the thumb, kept as close to the palm normal as
        // it can be; ex = cross(ey, ez) keeps the triple right handed
        const dz = ey0[2];
        let ez0 = [-ey0[0] * dz, -ey0[1] * dz, 1 - ey0[2] * dz];
        const L1 = Math.hypot(ez0[0], ez0[1], ez0[2]) || 1;
        ez0 = [ez0[0] / L1, ez0[1] / L1, ez0[2] / L1];
        const ex0 = [ey0[1] * ez0[2] - ey0[2] * ez0[1],
                     ey0[2] * ez0[0] - ey0[0] * ez0[2],
                     ey0[0] * ez0[1] - ey0[1] * ez0[0]];
        for (let k = 0; k < dg.seg.length; k++) {
          const b = k === 0 ? 0 : curl * 0.45;
          const c = Math.cos(b), si = Math.sin(b);
          const S1 = segs[k];
          S1.O[0] = ox; S1.O[1] = oy; S1.O[2] = oz;
          for (let q = 0; q < 3; q++) {
            S1.ex[q] = ex0[q];
            S1.ey[q] = ey0[q] * c - ez0[q] * si;
            S1.ez[q] = ey0[q] * si + ez0[q] * c;
          }
          ox += S1.ey[0] * dg.seg[k]; oy += S1.ey[1] * dg.seg[k]; oz += S1.ey[2] * dg.seg[k];
        }
      }
    }
  }

  const _m = new THREE.Matrix4();
  function updateRigid(rp) {
    const b = bones[rp.bone];
    if (!b) return;
    const P = position, NM = normal, src = rp.baked.pos, sn = rp.baked.nor;
    const X = b.X, Y = b.Y, Z = b.Z, A = b.A;
    // the L side mirrors about the body's own lateral axis; a Y-up bone's
    // local Z already faces left, which is a second reflection
    const mz = (rp.mirror ? -1 : 1) * b.zdir;
    const dg = rp.digit ? chains[rp.digit.side][rp.digit.d][rp.digit.k] : null;
    for (let v = 0; v < rp.nv; v++) {
      const s = v * 3, o = (rp.v0 + v) * 3;
      let lx = src[s], ly = src[s + 1], lz = src[s + 2];
      let nx = sn[s], ny = sn[s + 1], nz = sn[s + 2];
      if (dg) {
        const ex = dg.ex, ey = dg.ey, ez = dg.ez, O = dg.O;
        const px = lx, py = ly, pz = lz;
        lx = O[0] + ex[0] * px + ey[0] * py + ez[0] * pz;
        ly = O[1] + ex[1] * px + ey[1] * py + ez[1] * pz;
        lz = O[2] + ex[2] * px + ey[2] * py + ez[2] * pz;
        const qx = nx, qy = ny, qz = nz;
        nx = ex[0] * qx + ey[0] * qy + ez[0] * qz;
        ny = ex[1] * qx + ey[1] * qy + ez[1] * qz;
        nz = ex[2] * qx + ey[2] * qy + ez[2] * qz;
      }
      lz *= mz; nz *= mz;
      P[o] = A[0] + X[0] * lx + Y[0] * ly + Z[0] * lz;
      P[o + 1] = A[1] + X[1] * lx + Y[1] * ly + Z[1] * lz;
      P[o + 2] = A[2] + X[2] * lx + Y[2] * ly + Z[2] * lz;
      NM[o] = X[0] * nx + Y[0] * ny + Z[0] * nz;
      NM[o + 1] = X[1] * nx + Y[1] * ny + Z[1] * nz;
      NM[o + 2] = X[2] * nx + Y[2] * ny + Z[2] * nz;
    }
  }

  // update(S) is the whole contract; opts is optional and additive.
  //   opts.contraction  Float32Array, one 0..1 per lighting group
  //   opts.grips        { L, R } grip names for the hands
  function update(S, opts) {
    bones = boneTable(S, bones);
    const con = (opts && opts.contraction) || null;
    const grips = (opts && opts.grips) || null;
    for (const sfx of ["L", "R"]) {
      const g = (grips && grips[sfx]) || "open";
      if (g !== gripNow[sfx]) { computeChain(sfx, g); gripNow[sfx] = g; }
      if (g === "flat" && bones["hand" + sfx]) flattenPalm(bones["hand" + sfx], sfx);
    }
    for (const it of items) {
      it.c = con ? con[it.region] : 0;
      (it.kind === 1 ? updateTube : updateSheet)(it);
    }
    for (const rp of rigid) updateRigid(rp);
    if (!wound) { finish(); wound = true; }
    geo.getAttribute("position").needsUpdate = true;
    geo.getAttribute("normal").needsUpdate = true;
  }

  return { geometry: geo, update, vertices: vTotal, triangles: iTotal / 3,
           muscleCount: items.length, boneParts: rigid.length, partCount: nextId - 1,
           partNames };
}

// One phalanx, baked from its joint along +y. x is across the hand, z is the
// palm-to-back thickness.
function bakeDigit(dg, k) {
  const L = dg.seg[k];
  const taper = 1 - k * 0.06;
  const g = new THREE.BoxGeometry(dg.w * 2 * taper, L, dg.t * 2 * taper);
  g.translate(0, L / 2, 0);
  const pos = new Float32Array(g.getAttribute("position").array);
  const nor = new Float32Array(g.getAttribute("normal").array);
  const idx = Array.from(g.getIndex().array);
  g.dispose();
  return { pos, nor, idx };
}

// ------------------------------------------------------------ bone solids ---
// Baked once in bone local space, in rig units: y along the bone from its A
// end, x anterior, z to the figure's right. Bone lengths are fixed by BODY, so
// a part can be positioned at a FRACTION along its bone at bake time and then
// carried rigidly for the rest of its life.
function bakePart(spec, len) {
  let g;
  if (spec.cap) {
    const [y0, y1, r, , off = [0, 0, 0]] = spec.cap;
    const a = y0 * len, b = y1 * len;
    g = new THREE.CapsuleGeometry(r, Math.max(0.1, Math.abs(b - a) - 2 * r), 2, 6);
    g.translate(off[0], (a + b) / 2, off[2]);
  } else if (spec.box) {
    const [c, h] = spec.box;
    g = new THREE.BoxGeometry(h[0] * 2, h[1] * 2, h[2] * 2);
    g.translate(c[0], c[1], c[2]);
  } else if (spec.ell) {
    const [y, off, rad] = spec.ell;
    g = new THREE.SphereGeometry(1, 9, 6);
    g.scale(rad[0], rad[1], rad[2]);
    g.translate(off[0], y * len + off[1], off[2]);
  } else {
    const [y, rl, sx, rt] = spec.ring;
    g = new THREE.TorusGeometry(rl, rt, 4, 14);
    g.rotateX(Math.PI / 2);
    g.scale(sx, 1, 1);
    g.translate(0, y * len, 0);
  }
  const pos = new Float32Array(g.getAttribute("position").array);
  const nor = new Float32Array(g.getAttribute("normal").array);
  const idx = Array.from(g.getIndex().array);
  g.dispose();
  return { pos, nor, idx };
}
