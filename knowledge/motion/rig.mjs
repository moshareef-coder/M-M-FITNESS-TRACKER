// Fit Together: procedural 2D mannequin rig.
//
// Every exercise animation in the app is drawn from this file. A move is pure
// data (see moves/*.mjs): keyframes of joint angles in degrees. There is no art
// asset, no runtime library, no video. That is deliberate. We need roughly 278
// moves and buying or filming them is not on the table, so the figure has to be
// something we can pose from numbers.
//
// ANGLE CONTRACT (the whole thing an author needs to know):
//   0 deg means "straight down" for a limb, "straight up" for the spine/neck.
//   Positive rotates toward the direction the figure faces, which is screen +x
//   in side view and away from the midline in front view.
//     shoulder: 0 = arm hanging along the torso, + = arm swings forward/out
//     elbow:    0 = straight, + = flexion (hand travels forward)
//     wrist:    0 = hand continues the forearm, + = hand bends forward
//     hip:      0 = thigh straight down from the pelvis, + = thigh forward/out
//     knee:     0 = straight, + = flexion (heel toward the glute)
//     ankle:    0 = foot at 90 deg to the shin, + = dorsiflexion (toes up)
//     spine / neck: + = forward flexion
//   root: {x, y, rot} is the pelvis in a 140x140 unit box, rot = pelvis tilt.
//   The floor is y = 118 and a standing pelvis sits at y = 61.4.
//
// Keyframes can also pin an end effector with `ik`, which overrides the chain
// angles for that limb. That is what keeps hands and feet welded to the floor
// while the root moves, and it is the difference between a pose that reads as a
// real push-up and one that skates. Authoring a squat by angles alone means
// re-deriving every angle each time the hips move; pinning the ankles means
// moving the pelvis and letting the legs follow, which is how a person works.
//
// Deno-safe and browser-safe: nothing here touches window/document at module
// scope, so validate.mjs can import it under plain node.

export const VB = 140;      // drawing box, in figure units
export const GROUND = 118;  // floor line, in figure units

// ---------------------------------------------------------------- math ------
const D = (d) => (d * Math.PI) / 180;
const V = (x, y) => ({ x, y });
const add = (a, b) => V(a.x + b.x, a.y + b.y);
const sub = (a, b) => V(a.x - b.x, a.y - b.y);
const scl = (a, k) => V(a.x * k, a.y * k);
const len = (a) => Math.hypot(a.x, a.y);
const lerpV = (a, b, t) => V(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
// dirV(0) points down, +a rotates toward +x (times the side sign)
const dirV = (a, s = 1) => V(s * Math.sin(a), Math.cos(a));
const upV = (a) => V(Math.sin(a), -Math.cos(a));
const perpV = (a) => V(Math.cos(a), Math.sin(a));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const norm = (a) => { const L = len(a) || 1; return V(a.x / L, a.y / L); };

// Analytic two bone IK. Returns angles in the same convention as the chain:
//   mid = S + l1 * dirV(a1, sign);  end = mid + l2 * dirV(a1 + joint, sign)
// bend = +1 puts the middle joint on the negative side of the S->T line.
function twoBone(S, T, l1, l2, sign, bend) {
  const u = sub(T, S);
  const d = clamp(len(u), Math.abs(l1 - l2) + 0.001, l1 + l2 - 0.001);
  const base = Math.atan2(sign * u.x, u.y);
  const alpha = Math.acos(clamp((d * d + l1 * l1 - l2 * l2) / (2 * d * l1), -1, 1));
  const gamma = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
  return { a1: base - bend * alpha, joint: bend * (Math.PI - gamma) };
}

// ------------------------------------------------------------ proportions ---
// Roughly 7 heads tall, which is the stylised-but-believable range. Radii are
// the half thickness at each joint. Segments with a `mid` entry are drawn as a
// three circle chain so the belly of the muscle is wider than its ends, which
// is most of what separates a designed figure from a balloon animal.
export const BODY = {
  spine: 27, neck: 8.5, headOff: 11.6,
  upperArm: 20, forearm: 17, hand: 7.5,
  thigh: 27, shin: 25, foot: 12,
  rPelvis: 9.9, rWaist: 8.5, rChest: 11.8,
  rNeckTop: 4.3, rNeckBot: 5.2,
  rHeadBack: 8.0, rHeadJaw: 6.2,
  rShoulder: 7.0, rDelt: 7.9, rElbow: 5.4, rWrist: 4.1,
  rUpperArmMid: 6.6, rForearmMid: 5.2,
  rHandA: 4.1, rHandB: 3.0, rThumb: 2.2,
  rHip: 8.0, rThighMid: 8.7, rKnee: 6.3,
  rCalf: 6.9, rAnkle: 4.4, rToe: 3.0, rHeel: 3.9,
  shoulderW: 11.5, hipW: 6.9, depth: 1.7,
};
// Pelvis height when standing with straight legs. Authors use this constantly.
export const LEG_TO_FLOOR = BODY.thigh + BODY.shin + BODY.rAnkle;
export const STAND_Y = GROUND - LEG_TO_FLOOR; // 61.4

// ------------------------------------------------------------------ colour --
function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// Returns hex, not rgb(), so the result can be fed straight back into mix().
// (It could not, once, and every far side limb silently painted black.)
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  const c = A.map((v, i) => clamp(Math.round(v + (B[i] - v) * t), 0, 255));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

export const THEMES = {
  dark: { bg: "#0b0d11", surface: "#14171d", baseInk: "#e9eef8" },
  light: { bg: "#f5f7fa", surface: "#ffffff", baseInk: "#252d3a" },
};

// Lifted from the app's own tokens in index.html. accent is the fill hue,
// accentInk is the same identity deepened so it survives on white: the light
// mode lime is a highlighter and a floor line drawn in it disappears.
export const ACCENTS = {
  action: { dark: { accent: "#a8ff00", accentInk: "#a8ff00" },
            light: { accent: "#3be76b", accentInk: "#0f7a38" } },
  stretch: { dark: { accent: "#2ea8ff", accentInk: "#6cc4ff" },
             light: { accent: "#0b7fc7", accentInk: "#0a6ba8" } },
};

export const SKINS = ["mannequin", "anatomy"];

export function palette(theme = "dark", accent = "action", skin = "mannequin") {
  const dark = theme !== "light";
  const T = dark ? THEMES.dark : THEMES.light;
  const A = typeof accent === "string"
    ? (ACCENTS[accent] || ACCENTS.action)[dark ? "dark" : "light"]
    : accent;
  // Tint the figure with the readable variant, not the fill variant, or the
  // light mode figure picks up a wash nobody can see.
  const tint = dark ? A.accent : A.accentInk;
  const ink = mix(T.baseInk, tint, dark ? 0.085 : 0.06);
  // The anatomy skin borrows the purchased Rive body's design language: a pale
  // neutral silhouette with flat dark muscle plates and thin light seams. Base
  // stays neutral rather than accent tinted, because the plates are the thing
  // carrying colour once a move lights the muscles it works.
  const skinBase = dark ? "#dcdfea" : "#b9bfcd";
  return {
    skin,
    bg: T.bg,
    surface: T.surface,
    ink: skin === "anatomy" ? skinBase : ink,
    mannequinInk: ink,
    plate: dark ? "#232a31" : "#2b323b",
    plateFar: dark ? "#1a2027" : "#555d6a",
    seam: skin === "anatomy" ? (dark ? "#dcdfea" : "#cfd4de") : T.bg,
    inkHi: skin === "anatomy" ? (dark ? mix(skinBase, "#ffffff", 0.3) : mix(skinBase, "#ffffff", 0.35))
      : (dark ? mix(ink, "#ffffff", 0.16) : mix(ink, T.bg, 0.14)),
    far: skin === "anatomy" ? (dark ? mix(T.bg, skinBase, 0.46) : mix(skinBase, T.bg, 0.30))
      : (dark ? mix(T.bg, ink, 0.46) : mix(ink, T.bg, 0.52)),
    shade: dark ? "rgba(9,11,15,0.30)" : "rgba(37,45,58,0.16)",
    shadeSoft: dark ? "rgba(9,11,15,0.17)" : "rgba(37,45,58,0.09)",
    edge: T.bg,
    accent: A.accent,
    accentInk: A.accentInk,
    line: dark ? A.accent : A.accentInk,
    prop: dark ? mix(T.bg, "#93a3b8", 0.55) : mix(T.surface, "#3c4757", 0.42),
    propTop: dark ? mix(T.bg, "#c3d0e0", 0.78) : mix(T.surface, "#56637a", 0.66),
    propDark: dark ? mix(T.bg, "#93a3b8", 0.32) : mix(T.surface, "#3c4757", 0.62),
  };
}

// ---------------------------------------------------------------- solving ---
function ikTarget(spec, ctx) {
  if (!spec) return null;
  if (Array.isArray(spec)) return { p: V(spec[0], spec[1]), bend: spec[2] || 1 };
  if (spec.rel === "chest") return { p: add(ctx.chest, V(spec.x, spec.y)), bend: spec.bend || 1 };
  return { p: V(spec.x, spec.y), bend: spec.bend || 1 };
}

// Turns one pose (root + joint angles + optional ik pins) into world points.
export function solvePose(pose, view) {
  const front = view === "front";
  const J = pose.joints || {};
  const R = pose.root || { x: 70, y: STAND_Y, rot: 0 };
  const ik = pose.ik || {};
  const breath = pose.breath || 0;

  const rot = D(R.rot || 0);
  const t = rot + D((J.spine || 0) + breath * 0.9);
  const pelvis = V(R.x, R.y - breath * 0.35);
  const chest = add(pelvis, scl(upV(t), BODY.spine * (1 + breath * 0.012)));
  const tn = t + D(J.neck || 0);
  const neckTop = add(chest, scl(upV(tn), BODY.neck));
  const head = add(neckTop, scl(upV(tn), BODY.headOff));
  const perp = perpV(t);

  const out = {
    view, pelvis, chest, neckTop, head, t, tn, perp, rot,
    facing: pose.facing || "toward",
    chestR: BODY.rChest * (1 + breath * 0.02),
    farSide: pose.farSide || null,
    sides: {},
  };

  for (const s of ["L", "R"]) {
    const screenSign = s === "R" ? 1 : -1;
    const sign = front ? screenSign : 1;
    const shoulder = add(chest, scl(perp, front ? BODY.shoulderW * screenSign : BODY.depth * screenSign));
    const hip = add(pelvis, scl(perp, front ? BODY.hipW * screenSign : BODY.depth * 0.8 * screenSign));

    // --- arm
    let armA = t + D(J["shoulder" + s] || 0);
    let elbowA = D(J["elbow" + s] || 0);
    const wIk = ikTarget(ik["wrist" + s], out);
    if (wIk) {
      const r = twoBone(shoulder, wIk.p, BODY.upperArm, BODY.forearm, sign, wIk.bend);
      armA = r.a1; elbowA = r.joint;
    }
    const elbow = add(shoulder, scl(dirV(armA, sign), BODY.upperArm));
    const foreA = armA + elbowA;
    const wrist = add(elbow, scl(dirV(foreA, sign), BODY.forearm));
    const handA = foreA + D(J["wrist" + s] || 0);
    const hand = add(wrist, scl(dirV(handA, sign), BODY.hand));

    // --- leg
    let legA = rot + D(J["hip" + s] || 0);
    let kneeA = -D(J["knee" + s] || 0);
    const aIk = ikTarget(ik["ankle" + s], out);
    if (aIk) {
      const r = twoBone(hip, aIk.p, BODY.thigh, BODY.shin, sign, aIk.bend);
      legA = r.a1; kneeA = r.joint;
    }
    const knee = add(hip, scl(dirV(legA, sign), BODY.thigh));
    const shinA = legA + kneeA;
    const ankle = add(knee, scl(dirV(shinA, sign), BODY.shin));
    const fm = (pose.feet && pose.feet[s]) || null;
    // A pinned ankle means the foot is on the floor, so keep it flat there
    // instead of letting it pivot with the shin and knife into the ground.
    const footA = fm && fm.ang !== undefined
      ? D(fm.ang)
      : aIk && pose.flatFeet !== false
        ? Math.PI / 2 + D((J["ankle" + s] || 0) * 0.25)
        : shinA + Math.PI / 2 + D(J["ankle" + s] || 0);
    const footLen = BODY.foot * ((fm && fm.len) || 1);
    const fd = dirV(footA, sign);
    const toe = add(ankle, scl(fd, footLen));
    const heel = add(ankle, scl(fd, -4.0));

    out.sides[s] = {
      sign, screenSign, armA, foreA, handA, footA, legA, shinA,
      shoulder, elbow, wrist, hand, hip, knee, ankle, toe, heel,
      footW: (fm && fm.w) || 1,
    };
  }
  return out;
}

// ---------------------------------------------------------------- drawing ---
// A tapered capsule: the convex hull of two circles. This one primitive draws
// every limb, the torso and the neck, which is what gives the figure its
// consistent, machined silhouette instead of a stick-man look.
function capsulePath(ctx, p0, r0, p1, r1) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const d = Math.hypot(dx, dy);
  ctx.beginPath();
  if (d < 0.001 || Math.abs(r0 - r1) >= d) {
    const big = r0 >= r1 ? [p0, r0] : [p1, r1];
    ctx.arc(big[0].x, big[0].y, big[1], 0, Math.PI * 2);
    return;
  }
  const a = Math.atan2(dy, dx);
  const phi = Math.acos((r0 - r1) / d);
  ctx.arc(p0.x, p0.y, r0, a + phi, a - phi + Math.PI * 2);
  ctx.arc(p1.x, p1.y, r1, a - phi, a + phi);
  ctx.closePath();
}

// Light comes from the upper left, so the shade plate is offset down and right.
function shadeSide(p0, p1) {
  const dx = p1.x - p0.x, dy = p1.y - p0.y;
  const d = Math.hypot(dx, dy) || 1;
  let nx = -dy / d, ny = dx / d;
  if (nx * 0.42 + ny * 0.91 < 0) { nx = -nx; ny = -ny; }
  return V(nx, ny);
}

// Draws one part as a chain of circles: stroke every segment first, then fill
// every segment, so the seam between them is painted over and the outline reads
// as a single shape. Joints BETWEEN parts keep their seam on purpose, because
// that thin dark line is what makes the figure read as articulated.
function part(ctx, C, pts, o = {}) {
  const fill = o.fill || C.ink;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]);
  if (o.halo !== false) {
    ctx.strokeStyle = C.edge;
    ctx.lineWidth = o.haloW || 3.4;
    ctx.lineJoin = "round";
    for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.stroke(); }
  }
  ctx.fillStyle = fill;
  for (const g of segs) { capsulePath(ctx, g[0], g[1], g[2], g[3]); ctx.fill(); }
  if (o.shade !== false) {
    const a = pts[0], b = pts[pts.length - 1];
    const n = shadeSide(a[0], b[0]);
    const k = o.shadeOff === undefined ? 0.40 : o.shadeOff;
    const q = o.shadeR === undefined ? 0.50 : o.shadeR;
    ctx.fillStyle = o.shadeFill || C.shade;
    for (const g of segs) {
      capsulePath(ctx,
        V(g[0].x + n.x * g[1] * k, g[0].y + n.y * g[1] * k), g[1] * q,
        V(g[2].x + n.x * g[3] * k, g[2].y + n.y * g[3] * k), g[3] * q);
      ctx.fill();
    }
  }
}

const limb = (ctx, C, p0, r0, p1, r1, o) => part(ctx, C, [[p0, r0], [p1, r1]], o);

// A hand: mitt plus a thumb that follows the wrist angle. When the side is
// holding something the mitt closes into a fist and the thumb wraps, so a hand
// on a barbell does not read as an open palm slapped onto the bar.
function drawHand(ctx, S, side, C, fill, grip) {
  const B = BODY, k = S.sides[side];
  const d = dirV(k.handA, k.sign);
  const L = B.hand * (grip ? 0.66 : 0.98);
  const tip = add(k.wrist, scl(d, L));
  // thumb rides the upper edge of the hand whichever way the wrist is turned
  let n = V(-d.y, d.x);
  if (n.y > 0) n = V(-n.x, -n.y);
  const base = add(k.wrist, scl(d, L * (grip ? 0.30 : 0.38)));
  const thumbRoot = add(base, scl(n, grip ? 1.4 : 1.8));
  const thumbTip = add(add(thumbRoot, scl(d, L * (grip ? 0.42 : 0.55))), scl(n, grip ? 0.6 : 1.5));
  part(ctx, C, [[k.wrist, B.rHandA], [tip, grip ? B.rHandB * 1.25 : B.rHandB]],
       { fill, shadeR: 0.42, shadeOff: 0.34 });
  part(ctx, C, [[thumbRoot, B.rThumb], [thumbTip, B.rThumb * 0.82]], { fill, shade: false, haloW: 2.6 });
}

// A foot with a heel and a toe instead of one capsule: instep from the ankle,
// sole along the ground, heel bump behind. Three circles, one silhouette.
function drawFoot(ctx, S, side, C, fill) {
  const B = BODY, k = S.sides[side];
  const w = k.footW;
  const d = norm(sub(k.toe, k.heel));
  const mid = lerpV(k.ankle, k.toe, 0.45);
  part(ctx, C, [
    [k.heel, B.rHeel * w],
    [add(k.ankle, scl(d, 0.5)), B.rAnkle * 1.06 * w],
    [mid, B.rToe * 1.25 * w],
    [k.toe, B.rToe * w],
  ], { fill, shadeR: 0.44, shadeOff: 0.36 });
}

// Head: skull mass set back, jaw tapering forward, and a hint of an ear. The
// ear is the cheapest way to say which way the figure is facing, and a side
// view figure with no facing cue reads as a mannequin part rather than a person.
function drawHead(ctx, S, C, fill) {
  const B = BODY;
  const u = upV(S.tn), f = perpV(S.tn);
  const front = S.view === "front";
  const away = S.facing === "away";
  const top = front ? add(S.head, scl(u, 2.2)) : add(add(S.head, scl(u, 2.2)), scl(f, -1.5));
  // Seen from behind there is no jaw to taper to, so the skull stays round and
  // both ears show. That plus the hands being on the far side of the props is
  // the whole cue that the figure has its back to you.
  const jawR = front ? (away ? B.rHeadBack * 0.94 : B.rHeadBack * 0.86) : B.rHeadJaw;
  const jaw = front ? add(S.head, scl(u, away ? -2.2 : -2.8))
                    : add(add(S.head, scl(u, -2.6)), scl(f, 2.8));
  part(ctx, C, [[top, B.rHeadBack], [jaw, jawR]], { fill, shadeOff: 0.34, shadeR: 0.56 });
  const ears = front ? (away ? [-1, 1] : []) : [-1];
  for (const sd of ears) {
    const ear = add(add(S.head, scl(f, sd * (front ? B.rHeadBack * 0.86 : 2.2))), scl(u, -0.4));
    capsulePath(ctx, ear, 2.3, add(ear, scl(u, -1.3)), 1.9);
    ctx.fillStyle = C.shade; ctx.fill();
  }
}

// ---------------------------------------------------------- anatomy skin ---
// A second skin over the same capsules. It does NOT try to be the purchased
// Rive body (that file has no bones and cannot be posed); it borrows its design
// language: flat plates, one dark step under a pale silhouette, thin light
// seams, no gradients. Group keys are the app's own MUSCLE_GROUPS so a caller
// can pass the exact ring colour from bodyHeatRGB and light up what a move
// works.
export const MUSCLE_GROUPS = [
  "chest", "back", "lats", "shoulders", "traps", "biceps", "triceps", "forearms",
  "abs", "obliques", "lowerback", "glutes", "quads", "hamstrings", "calves",
];

function litFill(group, C, lit) {
  if (lit && lit.color && (lit.muscles || []).includes(group)) return lit.color;
  return C.plate;
}

// One flat plate riding on a segment. `from`/`to` are fractions along it,
// `w` is the fraction of the segment radius it covers, and `side` is -1 for the
// figure's back, +1 for its front, 0 for centred (which is what the front view
// gets, where front and back collapse onto each other).
function musclePlate(ctx, C, group, lit, p0, r0, p1, r1, face, o) {
  const a = lerpV(p0, p1, o.from), b = lerpV(p0, p1, o.to);
  const ra = r0 + (r1 - r0) * o.from, rb = r0 + (r1 - r0) * o.to;
  const d = norm(sub(p1, p0));
  let n = V(-d.y, d.x);
  if (n.x * face.x + n.y * face.y < 0) n = V(-n.x, -n.y); // n now points "front"
  const side = o.side === undefined ? 0 : o.side;
  const w = o.w === undefined ? 0.6 : o.w;
  const oa = ra * (1 - w) * side, ob = rb * (1 - w) * side;
  const pa = V(a.x + n.x * oa, a.y + n.y * oa);
  const pb = V(b.x + n.x * ob, b.y + n.y * ob);
  capsulePath(ctx, pa, ra * w, pb, rb * w);
  ctx.strokeStyle = C.seam;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.fillStyle = litFill(group, C, lit);
  ctx.fill();
}

function armPlates(ctx, S, side, C, lit) {
  const B = BODY, k = S.sides[side];
  const face = S.view === "front" ? V(0, 0) : perpV(S.t);
  const flat = S.view === "front";
  const sh = add(k.shoulder, scl(norm(sub(k.elbow, k.shoulder)), -1.2));
  musclePlate(ctx, C, "shoulders", lit, sh, B.rDelt, k.elbow, B.rElbow, face,
              { from: 0.02, to: 0.30, w: 0.86, side: 0 });
  musclePlate(ctx, C, "biceps", lit, k.shoulder, B.rShoulder, k.elbow, B.rElbow, face,
              { from: 0.34, to: 0.92, w: flat ? 0.66 : 0.54, side: flat ? 0 : 1 });
  if (!flat) {
    musclePlate(ctx, C, "triceps", lit, k.shoulder, B.rShoulder, k.elbow, B.rElbow, face,
                { from: 0.30, to: 0.95, w: 0.48, side: -1 });
  }
  musclePlate(ctx, C, "forearms", lit, k.elbow, B.rElbow, k.wrist, B.rWrist, face,
              { from: 0.06, to: 0.78, w: flat ? 0.66 : 0.58, side: flat ? 0 : 1 });
}

function legPlates(ctx, S, side, C, lit) {
  const B = BODY, k = S.sides[side];
  const face = S.view === "front" ? V(0, 0) : perpV(S.t);
  const flat = S.view === "front";
  musclePlate(ctx, C, "glutes", lit, k.hip, B.rHip, k.knee, B.rKnee, face,
              { from: 0.0, to: 0.24, w: flat ? 0.7 : 0.62, side: flat ? 0 : -1 });
  musclePlate(ctx, C, "quads", lit, k.hip, B.rHip, k.knee, B.rKnee, face,
              { from: 0.22, to: 0.92, w: flat ? 0.68 : 0.56, side: flat ? 0 : 1 });
  if (!flat) {
    musclePlate(ctx, C, "hamstrings", lit, k.hip, B.rHip, k.knee, B.rKnee, face,
                { from: 0.26, to: 0.9, w: 0.44, side: -1 });
  }
  musclePlate(ctx, C, "calves", lit, k.knee, B.rKnee, k.ankle, B.rAnkle, face,
              { from: 0.06, to: 0.56, w: flat ? 0.7 : 0.6, side: flat ? 0 : -1 });
}

// Torso plates are laid out along the pelvis to chest axis. The rectus block is
// two segments, not six: at 160px a six pack is three grey pixels and a rumour.
function torsoPlates(ctx, S, C, lit) {
  const B = BODY;
  const P = S.pelvis, Ch = S.chest, rP = B.rPelvis, rC = S.chestR;
  const face = perpV(S.t);
  const flat = S.view === "front";
  const seg = (group, o) => musclePlate(ctx, C, group, lit, P, rP, Ch, rC, face, o);
  if (flat) {
    const u = upV(S.t), f = perpV(S.t);
    const pec = (sgn) => {
      const c = add(add(Ch, scl(f, sgn * 5.4)), scl(u, -1.6));
      capsulePath(ctx, add(c, scl(u, 2.4)), 5.0, add(c, scl(u, -2.6)), 4.6);
      ctx.strokeStyle = C.seam; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = litFill("chest", C, lit); ctx.fill();
    };
    pec(-1); pec(1);
    seg("abs", { from: 0.34, to: 0.56, w: 0.44, side: 0 });
    seg("abs", { from: 0.58, to: 0.76, w: 0.46, side: 0 });
    const ob = (sgn) => {
      const c = add(add(P, scl(f, sgn * 6.2)), scl(u, 12));
      capsulePath(ctx, add(c, scl(u, 3.4)), 3.0, add(c, scl(u, -2.2)), 2.4);
      ctx.strokeStyle = C.seam; ctx.lineWidth = 1.1; ctx.stroke();
      ctx.fillStyle = litFill("obliques", C, lit); ctx.fill();
    };
    ob(-1); ob(1);
  } else {
    seg("chest", { from: 0.74, to: 0.97, w: 0.62, side: 1 });
    seg("lats", { from: 0.52, to: 0.95, w: 0.52, side: -1 });
    seg("lowerback", { from: 0.20, to: 0.50, w: 0.46, side: -1 });
    seg("abs", { from: 0.40, to: 0.60, w: 0.40, side: 1 });
    seg("abs", { from: 0.62, to: 0.72, w: 0.40, side: 1 });
    seg("obliques", { from: 0.26, to: 0.40, w: 0.40, side: 1 });
  }
  const u = upV(S.t);
  const t0 = add(S.chest, scl(u, 1.5)), t1 = add(S.neckTop, scl(u, -0.5));
  musclePlate(ctx, C, "traps", lit, t0, B.rNeckBot * 1.5, t1, B.rNeckTop, perpV(S.t),
              { from: 0.0, to: 0.9, w: 0.8, side: 0 });
}

function drawArm(ctx, S, side, C, fill, grip, skinOpts) {
  const B = BODY, k = S.sides[side];
  const d = norm(sub(k.elbow, k.shoulder));
  // shoulder cap: a short wider segment before the upper arm reads as a delt
  part(ctx, C, [
    [add(k.shoulder, scl(d, -1.2)), B.rDelt],
    [add(k.shoulder, scl(d, 5.0)), B.rShoulder],
    [k.elbow, B.rElbow],
  ], { fill });
  part(ctx, C, [[k.elbow, B.rElbow], [lerpV(k.elbow, k.wrist, 0.3), B.rForearmMid], [k.wrist, B.rWrist]], { fill });
  if (skinOpts && skinOpts.plates) armPlates(ctx, S, side, C, skinOpts.lit);
  drawHand(ctx, S, side, C, fill, grip);
}

function drawLeg(ctx, S, side, C, fill, skinOpts) {
  const B = BODY, k = S.sides[side];
  part(ctx, C, [[k.hip, B.rHip], [lerpV(k.hip, k.knee, 0.42), B.rThighMid], [k.knee, B.rKnee]], { fill });
  part(ctx, C, [[k.knee, B.rKnee], [lerpV(k.knee, k.ankle, 0.30), B.rCalf], [k.ankle, B.rAnkle]], { fill });
  if (skinOpts && skinOpts.plates) legPlates(ctx, S, side, C, skinOpts.lit);
  drawFoot(ctx, S, side, C, fill);
}

// The torso is three circles, not two, so the silhouette narrows at the waist,
// plus a soft chest plate. Flat two tone throughout: this is a designed figure,
// not an anatomy chart, and muscle-by-muscle shading at 160px is mud.
function drawTorso(ctx, S, C, fill, skinOpts) {
  const B = BODY;
  limb(ctx, C, S.chest, B.rNeckBot * 0.95, S.neckTop, B.rNeckTop, { fill, shade: false });
  const waist = lerpV(S.pelvis, S.chest, 0.46);
  const fv = S.view === "front";
  part(ctx, C, [[S.pelvis, B.rPelvis], [waist, B.rWaist], [S.chest, S.chestR]],
       { fill, shadeOff: fv ? 0.18 : 0.44, shadeR: fv ? 0.62 : 0.54 });
  const u = upV(S.t), f = perpV(S.t);
  const a = fv ? add(add(S.chest, scl(f, -6.4)), scl(u, -1.0))
               : add(add(S.chest, scl(f, 3.4)), scl(u, 1.2));
  const b = fv ? add(add(S.chest, scl(f, 6.4)), scl(u, -1.0))
               : add(add(S.chest, scl(f, 1.6)), scl(u, -6.5));
  if (skinOpts && skinOpts.plates) { torsoPlates(ctx, S, C, skinOpts.lit); return; }
  capsulePath(ctx, a, fv ? 5.4 : 4.7, b, fv ? 5.4 : 5.3);
  ctx.fillStyle = C.shadeSoft; ctx.fill();
}

// ------------------------------------------------------------------ props ---
// Equipment is deliberately simple vector geometry in one neutral metal colour.
// It is scenery: if a prop competes with the figure for attention at 160px the
// card stops reading as an exercise and starts reading as a gym photo.
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function bar(ctx, C, p0, p1, r, fill) {
  capsulePath(ctx, p0, r, p1, r);
  ctx.fillStyle = fill || C.prop;
  ctx.fill();
}

// Where a prop hangs off the body. Accepts {side, point} or plain {x, y}.
function anchor(spec, S) {
  if (!spec) return null;
  if (spec.x !== undefined && spec.side === undefined) return V(spec.x, spec.y);
  const k = S.sides[spec.side || "R"];
  const p = k[spec.point || "hand"];
  return V(p.x + (spec.dx || 0), p.y + (spec.dy || 0));
}

export const PROP_TYPES = [
  "mat", "wall", "doorway", "doorframe", "bench", "box", "roller", "pullupBar",
  "dipBars", "machine", "cable", "band", "barbell", "dumbbell", "kettlebell",
];

const PROPS = {
  mat(ctx, C, p) {
    ctx.fillStyle = C.propDark;
    roundRect(ctx, p.x, GROUND - 2.4, p.w, 4.4, 2.2); ctx.fill();
  },
  wall(ctx, C, p) {
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x, p.top === undefined ? 4 : p.top, p.w, GROUND - (p.top === undefined ? 4 : p.top), 3);
    ctx.fill();
    ctx.fillStyle = C.propTop;
    roundRect(ctx, p.x, p.top === undefined ? 4 : p.top, 2.6, GROUND - (p.top === undefined ? 4 : p.top), 1.3);
    ctx.fill();
  },
  // Side on, a doorway is one jamb plus the reveal behind it. Two tones is
  // enough to say "frame" rather than "column".
  doorway(ctx, C, p) {
    const w = p.w || 9;
    ctx.fillStyle = C.propDark;
    roundRect(ctx, p.x + w * 0.55, 4, w * 0.9, GROUND - 4, 2); ctx.fill();
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x, 4, w * 0.62, GROUND - 4, 2.6); ctx.fill();
    ctx.fillStyle = C.propTop;
    roundRect(ctx, p.x, 4, 2.2, GROUND - 4, 1.1); ctx.fill();
  },
  // Front on, a door frame is a plain vertical jamb beside the figure. It runs
  // off the top of the box on purpose: a frame with a visible top edge reads as
  // a pole, and the hand placement stops meaning anything.
  doorframe(ctx, C, p) {
    const w = p.w || 8;
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x, -6, w, GROUND + 6, 2.6); ctx.fill();
    ctx.fillStyle = C.propDark;
    roundRect(ctx, p.x + w * 0.62, -6, w * 0.38, GROUND + 6, 1.4); ctx.fill();
    ctx.fillStyle = C.propTop;
    roundRect(ctx, p.x, -6, 2.2, GROUND + 6, 1.1); ctx.fill();
  },
  bench(ctx, C, p) {
    const w = p.w, y = p.y, x = p.x, inc = D(p.incline || 0);
    const c = V(x + w / 2, y);
    const dx = Math.cos(inc) * (w / 2), dy = Math.sin(inc) * (w / 2);
    const A = V(c.x - dx, c.y + dy), Bp = V(c.x + dx, c.y - dy);
    capsulePath(ctx, A, 3.6, Bp, 3.6);
    ctx.fillStyle = C.prop; ctx.fill();
    capsulePath(ctx, V(A.x, A.y - 1.4), 2.0, V(Bp.x, Bp.y - 1.4), 2.0);
    ctx.fillStyle = C.propTop; ctx.fill();
    ctx.fillStyle = C.propDark;
    for (const f of [0.16, 0.84]) {
      const fp = lerpV(A, Bp, f);
      roundRect(ctx, fp.x - 2.4, fp.y, 4.8, GROUND - fp.y, 2); ctx.fill();
    }
  },
  box(ctx, C, p) {
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x, p.y, p.w, GROUND - p.y, 3); ctx.fill();
    ctx.fillStyle = C.propTop;
    roundRect(ctx, p.x, p.y, p.w, 3.2, 1.6); ctx.fill();
  },
  roller(ctx, C, p) {
    const r = p.r || 5.4;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = C.prop; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = C.propDark; ctx.fill();
  },
  pullupBar(ctx, C, p) {
    const y = p.y === undefined ? 10 : p.y;
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x0 === undefined ? 30 : p.x0, y - 2.4,
              (p.x1 === undefined ? 110 : p.x1) - (p.x0 === undefined ? 30 : p.x0), 4.8, 2.4);
    ctx.fill();
    for (const x of [p.x0 === undefined ? 30 : p.x0, (p.x1 === undefined ? 110 : p.x1) - 5]) {
      roundRect(ctx, x, 0, 5, y - 1.5, 2); ctx.fill();
    }
  },
  dipBars(ctx, C, p) {
    const y = p.y === undefined ? 86 : p.y;
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x0, y - 2.2, p.x1 - p.x0, 4.4, 2.2); ctx.fill();
    for (const x of [p.x0 + 2, p.x1 - 7]) { roundRect(ctx, x, y, 5, GROUND - y, 2); ctx.fill(); }
  },
  // One abstraction for every seated machine: a seat, a column to the floor,
  // and whichever of the back pad, thigh pad or lever arm the move needs.
  machine(ctx, C, p) {
    const parts = p.parts || ["seat"];
    ctx.fillStyle = C.prop;
    if (parts.includes("seat")) {
      roundRect(ctx, p.x, p.y, p.w, 5.4, 2.7); ctx.fill();
      roundRect(ctx, p.x + p.w * 0.42, p.y + 5.4, 6, GROUND - p.y - 5.4, 2.4); ctx.fill();
      ctx.fillStyle = C.propTop;
      roundRect(ctx, p.x, p.y, p.w, 2.2, 1.1); ctx.fill();
      ctx.fillStyle = C.prop;
    }
    if (parts.includes("backPad")) {
      roundRect(ctx, p.x - 6.5, p.y - (p.padH || 26), 6.5, (p.padH || 26) + 4, 3); ctx.fill();
    }
    if (parts.includes("thighPad")) {
      const px = p.padX === undefined ? p.x + p.w * 0.6 : p.padX;
      const py = p.padY === undefined ? p.y - 16 : p.padY;
      roundRect(ctx, px, py, p.padW || 20, 5.4, 2.7); ctx.fill();
      roundRect(ctx, px + (p.padW || 20) * 0.5 - 2, py + 5.4, 4, p.y - py - 5.4, 2); ctx.fill();
    }
    if (parts.includes("lever")) {
      const lx = p.leverX === undefined ? p.x + p.w : p.leverX;
      const ly = p.leverY === undefined ? p.y - 22 : p.leverY;
      bar(ctx, C, V(p.x + p.w * 0.45, p.y - 4), V(lx, ly), 2.2);
      ctx.beginPath(); ctx.arc(lx, ly, 4.2, 0, Math.PI * 2); ctx.fill();
    }
  },
  // A weight stack with a pulley at the top and a cable that actually ends in
  // the hand, so the pulling direction is never ambiguous.
  cable(ctx, C, p, S) {
    const top = p.top === undefined ? 16 : p.top;
    const y0 = p.y0 === undefined ? 46 : p.y0;
    ctx.fillStyle = C.prop;
    roundRect(ctx, p.x - 2, top, 4, y0 - top, 2); ctx.fill();
    roundRect(ctx, p.x - 9, y0, 18, GROUND - y0, 2.6); ctx.fill();
    ctx.fillStyle = C.propDark;
    for (let y = y0 + 3; y < GROUND - 4; y += 6) { roundRect(ctx, p.x - 7, y, 14, 4, 1.6); ctx.fill(); }
    ctx.fillStyle = C.propTop;
    ctx.beginPath(); ctx.arc(p.x, top, 4.4, 0, Math.PI * 2); ctx.fill();
    const h = anchor(p.to || { side: "R", point: "hand" }, S);
    if (!h) return;
    ctx.strokeStyle = C.propTop; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p.x, top); ctx.lineTo(h.x, h.y); ctx.stroke();
    const k = S.sides[(p.to && p.to.side) || "R"];
    const d = perpV(k.handA);
    capsulePath(ctx, V(h.x - d.x * 7, h.y - d.y * 7), 2.4, V(h.x + d.x * 7, h.y + d.y * 7), 2.4);
    ctx.fillStyle = C.prop; ctx.fill();
  },
  // Slack is the whole point of a band: it sags when the hands are close and
  // pulls straight as they separate, which is the rep.
  band(ctx, C, p, S) {
    const a = anchor(p.from, S), b = anchor(p.to, S);
    if (!a || !b) return;
    const d = len(sub(b, a));
    const rest = p.rest === undefined ? 40 : p.rest;
    const slack = Math.max(0, rest - d);
    const m = lerpV(a, b, 0.5);
    const c = V(m.x, m.y + slack * 0.55 + 1.2);
    ctx.strokeStyle = C.propTop;
    ctx.lineWidth = Math.max(1.4, 3.2 - slack * 0.05);
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); ctx.stroke();
  },
  // Seen from the side a loaded bar is a disc, end on. Drawing the bar sideways
  // is the single most common way these illustrations look wrong.
  barbell(ctx, C, p, S) {
    const at = anchor(p, S);
    if (!at) return;
    const r = p.r || 9.5;
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.arc(at.x, at.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.prop; ctx.fill();
    ctx.beginPath(); ctx.arc(at.x, at.y, r * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = C.propDark; ctx.fill();
    ctx.beginPath(); ctx.arc(at.x, at.y, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = C.propTop; ctx.fill();
  },
  dumbbell(ctx, C, p, S) {
    const at = anchor(p, S);
    if (!at) return;
    const k = p.k || 1;
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(D(p.rot === undefined ? 0 : p.rot));
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3.2; ctx.lineJoin = "round";
    const shapes = [
      () => roundRect(ctx, -2.4, -9 * k, 4.8, 18 * k, 2.2),
      () => roundRect(ctx, -7.2, -17 * k, 14.4, 8.4 * k, 3),
      () => roundRect(ctx, -7.2, 8.6 * k, 14.4, 8.4 * k, 3),
    ];
    for (const sh of shapes) { sh(); ctx.stroke(); }
    ctx.fillStyle = C.prop;
    for (const sh of shapes) { sh(); ctx.fill(); }
    ctx.fillStyle = C.propTop;
    roundRect(ctx, -7.2, -17 * k, 14.4, 2.4, 1.2); ctx.fill();
    roundRect(ctx, -7.2, 8.6 * k, 14.4, 2.4, 1.2); ctx.fill();
    ctx.restore();
  },
  kettlebell(ctx, C, p, S) {
    const at = anchor(p, S);
    if (!at) return;
    const k = p.k || 1;
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.rotate(D(p.rot === undefined ? 0 : p.rot));
    ctx.strokeStyle = C.edge; ctx.lineWidth = 3; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.arc(0, 11 * k, 8.2 * k, 0, Math.PI * 2);
    ctx.stroke(); ctx.fillStyle = C.prop; ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 2.5 * k, 5.6 * k, Math.PI * 1.12, Math.PI * 1.88);
    ctx.lineWidth = 3.4 * k; ctx.strokeStyle = C.prop; ctx.stroke();
    ctx.restore();
  },
};

function drawProps(ctx, C, list, S, layer) {
  for (const p of list || []) {
    if ((p.front ? "front" : "back") !== layer) continue;
    const fn = PROPS[p.type];
    if (fn) fn(ctx, C, p, S);
  }
}

function drawFloor(ctx, C, S) {
  const g = ctx.createLinearGradient(6, 0, VB - 6, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.16, C.line);
  g.addColorStop(0.84, C.line);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = g;
  roundRect(ctx, 6, GROUND, VB - 12, 1.7, 0.85); ctx.fill();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = C.line;
  for (const s of ["L", "R"]) {
    const k = S.sides[s];
    for (const p of [k.toe, k.heel, k.hand, k.wrist]) {
      if (p.y > GROUND - 10) {
        ctx.beginPath();
        ctx.ellipse(p.x, GROUND + 0.8, 8.5, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

export function drawFigure(ctx, S, C, opts = {}) {
  if (opts.floor !== false) drawFloor(ctx, C, S);
  drawProps(ctx, C, opts.props, S, "back");
  // A front view move with no farSide is symmetric (band pull-apart, doorway
  // pec stretch): shading one half dark reads as a lighting mistake, not depth.
  const symmetric = S.view === "front" && !S.farSide;
  const near = S.view === "front" ? (S.farSide === "R" ? "L" : "R") : "R";
  const far = near === "R" ? "L" : "R";
  const grip = opts.grip || {};
  const skinOpts = C.skin === "anatomy" ? { plates: true, lit: opts.lit } : null;
  const farFill = symmetric ? C.ink : C.far;
  drawArm(ctx, S, far, C, farFill, grip[far], symmetric ? skinOpts : null);
  drawLeg(ctx, S, far, C, farFill, symmetric ? skinOpts : null);
  drawTorso(ctx, S, C, C.ink, skinOpts);
  drawHead(ctx, S, C, C.ink);
  drawLeg(ctx, S, near, C, C.inkHi, skinOpts);
  drawArm(ctx, S, near, C, C.inkHi, grip[near], skinOpts);
  drawProps(ctx, C, opts.props, S, "front");
}

// A hand holding something is a fist, so work out which sides hold a prop.
export function gripSides(props) {
  const g = {};
  for (const p of props || []) {
    if (["barbell", "dumbbell", "kettlebell"].includes(p.type) && p.point !== "wrist") g[p.side || "R"] = true;
    if (p.type === "cable" && p.to && p.to.side) g[p.to.side] = true;
    if (p.type === "band") for (const e of [p.from, p.to]) if (e && e.side) g[e.side] = true;
    if (p.grip) g[p.grip] = true;
  }
  return g;
}

// ------------------------------------------------------------- animation ----
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const LOOPS = ["pingpong", "hold", "oneway"];
export const VIEWS = ["side", "front"];

function lerpObj(a, b, u, keys) {
  const o = {};
  for (const k of keys) {
    const av = a[k] === undefined ? 0 : a[k];
    const bv = b[k] === undefined ? 0 : b[k];
    o[k] = av + (bv - av) * u;
  }
  return o;
}

function lerpIk(a, b, u) {
  const out = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const A = (a || {})[k], B = (b || {})[k];
    if (!A || !B) { out[k] = A || B; continue; }
    const ax = Array.isArray(A) ? A[0] : A.x, ay = Array.isArray(A) ? A[1] : A.y;
    const bx = Array.isArray(B) ? B[0] : B.x, by = Array.isArray(B) ? B[1] : B.y;
    const bend = Array.isArray(A) ? A[2] : A.bend;
    out[k] = { rel: A.rel || B.rel, x: ax + (bx - ax) * u, y: ay + (by - ay) * u, bend };
  }
  return out;
}

// Sample a move at normalised cycle position 0..1 and return a pose.
export function samplePose(move, cycle, timeSec = 0) {
  const kfs = move.keys;
  let u = cycle;
  if (move.loop === "pingpong") u = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
  else if (move.loop === "hold") u = 0.5 - 0.5 * Math.cos(cycle * Math.PI * 2);
  else if (move.loop === "oneway") u = Math.min(1, cycle / 0.82);

  let i = 0;
  while (i < kfs.length - 2 && u > kfs[i + 1].t) i++;
  const a = kfs[i], b = kfs[Math.min(i + 1, kfs.length - 1)];
  const span = Math.max(0.0001, b.t - a.t);
  const w = easeInOut(clamp((u - a.t) / span, 0, 1));

  const jointKeys = new Set();
  for (const k of kfs) for (const j of Object.keys(k.joints || {})) jointKeys.add(j);

  return {
    root: lerpObj(a.root || {}, b.root || {}, w, ["x", "y", "rot"]),
    joints: lerpObj(a.joints || {}, b.joints || {}, w, [...jointKeys]),
    ik: lerpIk(a.ik, b.ik, w),
    feet: move.feet,
    farSide: move.farSide,
    facing: move.facing,
    flatFeet: move.flatFeet,
    breath: Math.sin(timeSec * (move.breathRate || 1.15)) * (move.breath === undefined ? 0.35 : move.breath),
  };
}

// Draw one frame of a move into a canvas. Sizing is the caller's business.
export function render(canvas, move, C, cycle, timeSec = 0, opts = {}) {
  const dpr = Math.min(2.5, (globalThis.devicePixelRatio || 1));
  const w = canvas.clientWidth || canvas.width || 160;
  const h = canvas.clientHeight || canvas.height || 160;
  if (canvas.width !== Math.round(w * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  const s = (w / VB) * dpr;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  ctx.clearRect(0, 0, VB, VB);
  const fit = move.fit;
  if (fit) {
    const cx = VB / 2, cy = 78;
    ctx.translate(cx + (fit.dx || 0), cy + (fit.dy || 0));
    ctx.scale(fit.k || 1, fit.k || 1);
    ctx.translate(-cx, -cy);
  }
  const S = solvePose(samplePose(move, cycle, timeSec), move.view);
  S.farSide = move.farSide || null;
  S.facing = move.facing || "toward";
  drawFigure(ctx, S, C, { props: move.props, floor: move.floor, grip: gripSides(move.props), lit: opts.lit });
  return S;
}
