// Fit Together: the muscle library, as data.
//
// Nothing here is art. A muscle is an origin, an insertion, an optional path
// point it has to wrap over, a belly profile and a cross section. Every
// attachment is expressed RELATIVE TO A BONE, so when the rig moves the bone
// the attachment moves with it and the muscle restretches itself.
//
// AN ATTACHMENT
//   { bone, t, ang, r, spanT, spanA, spanR }
//     bone   a key in the bone table built by boneTable() below. Paired bones
//            ("humerus") resolve to the instance's own side.
//     t      fraction along the bone, 0 at its A end, 1 at its B end.
//     ang    degrees around the bone's own axis. 0 is anterior (the way the
//            body faces), 90 lateral (away from the midline, whichever side
//            this instance is on), 180 posterior, 270 medial.
//     r      distance out from the bone axis, in rig units. The torso bone is
//            an ellipse, not a circle, so the anterior component is squashed
//            by the bone's own `sx`.
//     span*  only read by sheets. The attachment becomes a LINE rather than a
//            point: strand j in [-0.5, +0.5] lands at t + spanT*j,
//            ang + spanA*j, r + spanR*j. A wide spanA at the origin and a
//            narrow one at the insertion is what makes a fan a fan.
//
// A MUSCLE
//   kind   "tube"  one swept elliptical cross section: round bellies, straps
//          "sheet" a grid of fibres with a lens thickness: fans and sheets
//   r      tube only, [end, belly, end] radii. flat squashes the section
//          against the bone: 1 round, 0.5 strap, 0.3 flat.
//   h      sheet only, [end, belly, end] HALF THICKNESS of the slab.
//   bulge  how far the belly bows away from the bone chord, in units. This is
//          what keeps a muscle off the bone when the joint closes.
//   peak   where along the length the belly is thickest, default 0.5.
//   group  one of the app's 15 lighting keys (rig.mjs MUSCLE_GROUPS).
//
// Left and right are the same entry with lat = -1 / +1, which flips every
// `ang` about the midline. `side: "mid"` builds one copy only.

export const GROUPS = [
  "chest", "back", "lats", "shoulders", "traps", "biceps", "triceps", "forearms",
  "abs", "obliques", "lowerback", "glutes", "quads", "hamstrings", "calves",
];
// Two non-lit regions. The Rive body reads as pale skin carrying dark muscle
// plates, so the skeleton splits the same way: the parts that are exposed at
// the ends of the figure (skull, hands, feet) take the pale tone, and
// everything that lives UNDER muscle takes a recessed dark tone, so a gap
// between two muscles reads as depth instead of as a bright stripe.
export const BONE_REGION = GROUPS.length;          // 15, pale, never lit
export const DEEP_REGION = GROUPS.length + 1;      // 16, recessed, never lit
export const REGION_COUNT = GROUPS.length + 2;

// --------------------------------------------------------------- the bones --
// Derived from one solved pose. Each entry is A (start), B (end), a frame
// (X anterior, Y along A->B, Z to the figure's right) and sx, the anterior
// squash that turns the section from a circle into an ellipse.
// Written as a spec so the generator can rebuild it every frame without
// allocating: see body.mjs boneTable().
export const BONE_NAMES = ["spine", "pelvis", "neck", "head", "clav", "humerus", "ulna",
  "hand", "femur", "tibia", "foot", "calc"];

// Bone lengths never change (they are BODY proportions), so the skeleton
// solids can be baked at a fraction along their bone once and then carried
// rigidly for the rest of the session. Units are rig units.
export const BONE_LEN = {
  spine: 27, pelvis: 9, neck: 8.5, head: 11.6, clav: 11.6,
  humerus: 20, ulna: 17, hand: 7.5, femur: 27, tibia: 25, foot: 12, calc: 4.0,
};

const M = (o) => o;

export const MUSCLES = [
  // ------------------------------------------------------------------ neck --
  M({ id: "sternocleidomastoid", group: "traps", kind: "tube",
      from: { bone: "spine", t: 0.98, ang: 20, r: 5.6 },
      to:   { bone: "head",  t: 0.34, ang: 128, r: 5.4 },
      r: [1.4, 2.7, 1.5], flat: 0.85, bulge: 1.2 }),
  M({ id: "splenius", group: "traps", kind: "tube",
      from: { bone: "spine", t: 0.99, ang: 196, r: 5.2 },
      to:   { bone: "head",  t: 0.40, ang: 192, r: 5.2 },
      r: [1.8, 3.0, 1.8], flat: 0.8, bulge: 0.7 }),

  // ------------------------------------------------------- shoulder girdle --
  M({ id: "trapezius_upper", group: "traps", kind: "sheet",
      from: { bone: "head",  t: 0.46, ang: 186, r: 4.8, spanT: 0.52, spanA: 34 },
      to:   { bone: "clav",  t: 0.78, ang: 172, r: 3.6, spanT: 0.42, spanA: 30 },
      h: [0.7, 1.8, 1.0], bulge: 0.3, strands: 7, wide: [1, 0.92, 0.72] }),
  M({ id: "trapezius_mid", group: "traps", kind: "sheet",
      from: { bone: "spine", t: 0.84, ang: 180, r: 8.8, spanT: 0.30, spanA: 16 },
      to:   { bone: "clav",  t: 0.88, ang: 182, r: 3.6, spanT: 0.34, spanA: 24 },
      h: [0.8, 2.0, 0.9], bulge: 0.3, strands: 7, wide: [1, 0.95, 0.75] }),
  M({ id: "trapezius_lower", group: "traps", kind: "sheet",
      from: { bone: "spine", t: 0.58, ang: 184, r: 9.2, spanT: 0.30, spanA: 16 },
      to:   { bone: "spine", t: 0.86, ang: 208, r: 10.6, spanT: 0.10, spanA: 22 },
      h: [0.7, 1.8, 0.8], bulge: 0.3, strands: 7, wide: [1, 0.8, 0.45] }),
  M({ id: "rhomboid", group: "back", kind: "sheet",
      from: { bone: "spine", t: 0.86, ang: 181, r: 8.6, spanT: 0.20, spanA: 10 },
      to:   { bone: "spine", t: 0.88, ang: 208, r: 10.4, spanT: 0.16, spanA: 16 },
      h: [0.6, 1.5, 0.75], bulge: 0.2, strands: 5 }),
  M({ id: "infraspinatus", group: "back", kind: "sheet",
      from: { bone: "spine", t: 0.86, ang: 198, r: 10.6, spanT: 0.16, spanA: 34 },
      to:   { bone: "humerus", t: 0.10, ang: 162, r: 3.8, spanT: 0.06, spanA: 34 },
      h: [0.7, 1.8, 0.8], bulge: 0.5, strands: 6, wide: [1, 0.9, 0.5] }),
  M({ id: "teres_major", group: "lats", kind: "tube",
      from: { bone: "spine", t: 0.76, ang: 210, r: 10.6 },
      to:   { bone: "humerus", t: 0.17, ang: 215, r: 3.6 },
      r: [1.2, 2.5, 1.2], flat: 0.75, bulge: 1.0 }),

  // -------------------------------------------------------------- deltoids --
  M({ id: "deltoid_anterior", group: "shoulders", kind: "sheet",
      from: { bone: "clav", t: 0.84, ang: 28, r: 3.2, spanT: 0.30, spanA: 46 },
      to:   { bone: "humerus", t: 0.44, ang: 48, r: 3.0, spanT: 0.10, spanA: 24 },
      h: [0.9, 2.8, 1.05], bulge: 1.7, peak: 0.40, strands: 6, wide: [1.05, 0.85, 0.32], widePeak: 0.24 }),
  M({ id: "deltoid_lateral", group: "shoulders", kind: "sheet",
      from: { bone: "clav", t: 0.98, ang: 95, r: 3.5, spanT: 0.20, spanA: 58 },
      to:   { bone: "humerus", t: 0.46, ang: 92, r: 3.0, spanT: 0.10, spanA: 26 },
      h: [1.0, 3.2, 1.2], bulge: 1.9, peak: 0.38, strands: 6, wide: [1.05, 0.88, 0.34], widePeak: 0.24 }),
  M({ id: "deltoid_posterior", group: "shoulders", kind: "sheet",
      from: { bone: "clav", t: 0.88, ang: 158, r: 3.3, spanT: 0.30, spanA: 46 },
      to:   { bone: "humerus", t: 0.44, ang: 132, r: 3.0, spanT: 0.10, spanA: 24 },
      h: [0.9, 2.7, 1.05], bulge: 1.6, peak: 0.40, strands: 6, wide: [1.05, 0.85, 0.32], widePeak: 0.24 }),

  // ---------------------------------------------------------------- chest ---
  M({ id: "pectoralis_clavicular", group: "chest", kind: "sheet",
      from: { bone: "spine", t: 0.95, ang: 24, r: 8.4, spanT: 0.06, spanA: 46 },
      to:   { bone: "humerus", t: 0.16, ang: 34, r: 3.6, spanT: 0.07, spanA: 20 },
      h: [0.75, 2.1, 1.2], bulge: 0.35, strands: 6, wide: [1, 0.85, 0.35] }),
  M({ id: "pectoralis_sternal", group: "chest", kind: "sheet",
      from: { bone: "spine", t: 0.74, ang: 12, r: 9.2, spanT: 0.34, spanA: 62 },
      to:   { bone: "humerus", t: 0.21, ang: 28, r: 3.6, spanT: 0.10, spanA: 20 },
      h: [0.9, 2.9, 1.5], bulge: 0.35, strands: 8, wide: [1, 0.8, 0.3] }),

  // ----------------------------------------------------------------- back ---
  M({ id: "latissimus_dorsi", group: "lats", kind: "sheet",
      from: { bone: "spine", t: 0.30, ang: 190, r: 9.0, spanT: 0.62, spanA: 22 },
      via:  [{ bone: "spine", t: 0.66, ang: 220, r: 10.4, spanT: 0.30, spanA: 46 }],
      to:   { bone: "humerus", t: 0.15, ang: 238, r: 3.6, spanT: 0.08, spanA: 26 },
      h: [0.9, 2.6, 1.1], bulge: 0.3, strands: 8, wide: [1, 0.62, 0.2] }),
  M({ id: "erector_spinae", group: "lowerback", kind: "tube",
      from: { bone: "pelvis", t: 0.10, ang: 191, r: 6.8 },
      to:   { bone: "spine", t: 0.82, ang: 193, r: 9.0 },
      r: [2.0, 3.4, 1.6], flat: 0.85, bulge: 0.3, peak: 0.26, wide: [1.25, 1.1, 0.7] }),

  // ----------------------------------------------------------- trunk wall ---
  M({ id: "rectus_abdominis_1", group: "abs", kind: "tube",
      from: { bone: "spine", t: 0.04, ang: 21, r: 7.7 },
      to:   { bone: "spine", t: 0.19, ang: 20, r: 8.0 },
      r: [2.1, 3.0, 2.3], flat: 0.42, bulge: 0.2 }),
  M({ id: "rectus_abdominis_2", group: "abs", kind: "tube",
      from: { bone: "spine", t: 0.22, ang: 20, r: 8.1 },
      to:   { bone: "spine", t: 0.36, ang: 20, r: 8.2 },
      r: [2.3, 3.2, 2.4], flat: 0.42, bulge: 0.2 }),
  M({ id: "rectus_abdominis_3", group: "abs", kind: "tube",
      from: { bone: "spine", t: 0.39, ang: 20, r: 8.2 },
      to:   { bone: "spine", t: 0.52, ang: 21, r: 8.2 },
      r: [2.4, 3.3, 2.5], flat: 0.42, bulge: 0.2 }),
  M({ id: "rectus_abdominis_4", group: "abs", kind: "tube",
      from: { bone: "spine", t: 0.55, ang: 22, r: 8.2 },
      to:   { bone: "spine", t: 0.69, ang: 23, r: 8.0 },
      r: [2.5, 3.2, 2.1], flat: 0.42, bulge: 0.2 }),
  M({ id: "external_oblique", group: "obliques", kind: "sheet",
      from: { bone: "pelvis", t: 0.50, ang: 50, r: 8.4, spanT: 0.7, spanA: 58 },
      to:   { bone: "spine", t: 0.66, ang: 66, r: 9.6, spanT: 0.34, spanA: 70 },
      h: [0.9, 2.4, 1.2], bulge: 0.35, strands: 8, wide: [1, 0.95, 0.85] }),
  M({ id: "serratus_a", group: "obliques", kind: "tube",
      from: { bone: "spine", t: 0.56, ang: 44, r: 9.4 },
      to:   { bone: "spine", t: 0.72, ang: 112, r: 10.0 },
      r: [1.0, 1.9, 1.0], flat: 0.7, bulge: 0.2 }),
  M({ id: "serratus_b", group: "obliques", kind: "tube",
      from: { bone: "spine", t: 0.63, ang: 42, r: 9.6 },
      to:   { bone: "spine", t: 0.77, ang: 112, r: 10.0 },
      r: [1.0, 1.9, 1.0], flat: 0.7, bulge: 0.2 }),
  M({ id: "serratus_c", group: "obliques", kind: "tube",
      from: { bone: "spine", t: 0.70, ang: 40, r: 9.6 },
      to:   { bone: "spine", t: 0.81, ang: 110, r: 9.8 },
      r: [1.0, 1.8, 1.0], flat: 0.7, bulge: 0.2 }),

  // ------------------------------------------------------------------ arm ---
  M({ id: "biceps_brachii", group: "biceps", kind: "tube",
      from: { bone: "clav", t: 0.88, ang: 34, r: 3.0 },
      via:  [{ bone: "humerus", t: 0.55, ang: 16, r: 3.6 }],
      to:   { bone: "ulna", t: 0.13, ang: 12, r: 2.9 },
      r: [1.0, 2.9, 1.0], flat: 0.92, bulge: 0.5, peak: 0.58, wide: [1, 1.1, 0.55] }),
  M({ id: "brachialis", group: "biceps", kind: "tube",
      from: { bone: "humerus", t: 0.50, ang: 40, r: 3.2 },
      to:   { bone: "ulna", t: 0.09, ang: 34, r: 2.8 },
      r: [1.1, 1.9, 1.0], flat: 0.8, bulge: 0.7, wide: [1, 1, 0.8] }),
  M({ id: "triceps_long", group: "triceps", kind: "tube",
      from: { bone: "spine", t: 0.80, ang: 216, r: 9.6 },
      via:  [{ bone: "humerus", t: 0.55, ang: 196, r: 3.8 }],
      to:   { bone: "ulna", t: 0.05, ang: 196, r: 3.0 },
      r: [1.1, 3.0, 1.1], flat: 0.9, bulge: 0.5, peak: 0.55, wide: [1, 1.1, 0.6] }),
  M({ id: "triceps_lateral", group: "triceps", kind: "tube",
      from: { bone: "humerus", t: 0.26, ang: 148, r: 3.4 },
      to:   { bone: "ulna", t: 0.05, ang: 186, r: 3.0 },
      r: [1.0, 2.4, 1.0], flat: 0.85, bulge: 0.9, peak: 0.42, wide: [1.1, 1.05, 0.55] }),
  M({ id: "brachioradialis", group: "forearms", kind: "tube",
      from: { bone: "humerus", t: 0.80, ang: 110, r: 3.2 },
      to:   { bone: "ulna", t: 0.86, ang: 96, r: 2.3 },
      r: [0.9, 2.1, 0.7], flat: 0.7, bulge: 0.9, peak: 0.30, wide: [1, 1.05, 0.6] }),
  M({ id: "forearm_extensors", group: "forearms", kind: "sheet",
      from: { bone: "humerus", t: 0.93, ang: 152, r: 3.3, spanT: 0.10, spanA: 40 },
      to:   { bone: "ulna", t: 0.88, ang: 154, r: 2.2, spanT: 0.16, spanA: 58 },
      h: [1.0, 2.7, 0.8], bulge: 0.7, peak: 0.28, strands: 6, wide: [1, 0.9, 0.5], widePeak: 0.25 }),
  M({ id: "forearm_flexors", group: "forearms", kind: "sheet",
      from: { bone: "humerus", t: 0.95, ang: 292, r: 3.3, spanT: 0.10, spanA: 40 },
      to:   { bone: "ulna", t: 0.86, ang: 300, r: 2.2, spanT: 0.16, spanA: 64 },
      h: [1.0, 2.8, 0.8], bulge: 0.7, peak: 0.28, strands: 6, wide: [1, 0.9, 0.5], widePeak: 0.25 }),

  // ------------------------------------------------------------------ hip ---
  M({ id: "gluteus_maximus", group: "glutes", kind: "sheet",
      from: { bone: "pelvis", t: 0.44, ang: 202, r: 8.6, spanT: 0.86, spanA: 54 },
      via:  [{ bone: "femur", t: 0.10, ang: 196, r: 8.2, spanT: 0.06, spanA: 48 }],
      to:   { bone: "femur", t: 0.34, ang: 186, r: 4.4, spanT: 0.34, spanA: 44 },
      h: [1.3, 3.6, 1.2], bulge: 0.5, peak: 0.44, strands: 7, wide: [1, 1, 0.45] }),
  M({ id: "gluteus_medius", group: "glutes", kind: "sheet",
      from: { bone: "pelvis", t: 0.80, ang: 118, r: 8.2, spanT: 0.36, spanA: 54 },
      to:   { bone: "femur", t: 0.07, ang: 108, r: 4.6, spanT: 0.06, spanA: 26 },
      h: [0.9, 2.5, 1], bulge: 0.8, strands: 6, wide: [1, 0.9, 0.5] }),
  M({ id: "tensor_fasciae_latae", group: "glutes", kind: "tube",
      from: { bone: "pelvis", t: 0.86, ang: 68, r: 7.2 },
      to:   { bone: "femur", t: 0.26, ang: 92, r: 4.6 },
      r: [1.1, 1.9, 1.1], flat: 0.7, bulge: 0.7, wide: [1.2, 1, 0.6] }),
  M({ id: "iliotibial_band", group: "glutes", kind: "tube",
      from: { bone: "femur", t: 0.26, ang: 94, r: 4.8 },
      to:   { bone: "tibia", t: 0.07, ang: 84, r: 4.0 },
      r: [1.4, 1.5, 1.1], flat: 0.34, bulge: 0.2, wide: [1.1, 1, 0.9] }),

  // ----------------------------------------------------------------- quad ---
  M({ id: "rectus_femoris", group: "quads", kind: "tube",
      from: { bone: "pelvis", t: 0.72, ang: 34, r: 7.2 },
      via:  [{ bone: "femur", t: 0.55, ang: 6, r: 4.9 }],
      to:   { bone: "tibia", t: 0.07, ang: 6, r: 3.9 },
      r: [1.2, 2.9, 1.1], flat: 0.85, bulge: 0.6, peak: 0.5, wide: [1.25, 1.15, 0.55] }),
  M({ id: "vastus_lateralis", group: "quads", kind: "tube",
      from: { bone: "femur", t: 0.18, ang: 86, r: 4.4 },
      via:  [{ bone: "femur", t: 0.70, ang: 58, r: 5.0 }],
      to:   { bone: "tibia", t: 0.06, ang: 38, r: 3.9 },
      r: [1.1, 3.0, 1.1], flat: 0.85, bulge: 0.5, peak: 0.46, wide: [1.35, 1.2, 0.5], widePeak: 0.35 }),
  M({ id: "vastus_medialis", group: "quads", kind: "tube",
      from: { bone: "femur", t: 0.34, ang: 292, r: 4.4 },
      via:  [{ bone: "femur", t: 0.84, ang: 316, r: 5.0 }],
      to:   { bone: "tibia", t: 0.06, ang: 332, r: 3.9 },
      r: [1.0, 2.9, 1.2], flat: 0.85, bulge: 0.5, peak: 0.70, wide: [1.15, 1.3, 0.55], widePeak: 0.72 }),
  M({ id: "adductor_group", group: "quads", kind: "sheet",
      from: { bone: "pelvis", t: 0.04, ang: 276, r: 4.4, spanT: 0.24, spanA: 44 },
      to:   { bone: "femur", t: 0.64, ang: 284, r: 3.8, spanT: 0.46, spanA: 26 },
      h: [0.9, 2.5, 1], bulge: 0.5, strands: 6, wide: [1.2, 1.05, 0.45] }),
  M({ id: "sartorius", group: "quads", kind: "tube",
      from: { bone: "pelvis", t: 0.88, ang: 52, r: 7.4 },
      via:  [{ bone: "femur", t: 0.52, ang: 332, r: 5.4 }],
      to:   { bone: "tibia", t: 0.12, ang: 302, r: 3.9 },
      r: [1.0, 1.5, 0.9], flat: 0.45, bulge: 0.2, wide: [1, 1, 0.8] }),

  // ----------------------------------------------------------- hamstrings ---
  M({ id: "biceps_femoris", group: "hamstrings", kind: "tube",
      from: { bone: "pelvis", t: 0.02, ang: 196, r: 6.4 },
      via:  [{ bone: "femur", t: 0.66, ang: 168, r: 5.2 }],
      to:   { bone: "tibia", t: 0.08, ang: 150, r: 3.8 },
      r: [1.1, 2.9, 1.0], flat: 0.85, bulge: 0.5, peak: 0.56, wide: [1.3, 1.15, 0.5] }),
  M({ id: "semitendinosus", group: "hamstrings", kind: "tube",
      from: { bone: "pelvis", t: 0.00, ang: 224, r: 6.0 },
      via:  [{ bone: "femur", t: 0.66, ang: 212, r: 5.0 }],
      to:   { bone: "tibia", t: 0.12, ang: 218, r: 3.7 },
      r: [1.0, 2.7, 1.0], flat: 0.85, bulge: 0.5, peak: 0.54, wide: [1.2, 1.05, 0.45] }),

  // ------------------------------------------------------------ lower leg ---
  M({ id: "gastrocnemius_lateral", group: "calves", kind: "tube",
      from: { bone: "femur", t: 0.96, ang: 152, r: 4.6 },
      to:   { bone: "calc", t: 0.75, ang: 178, r: 2.0 },
      r: [1.4, 3.8, 0.7], flat: 0.85, bulge: 1.0, peak: 0.30, wide: [1.25, 1.1, 0.35], widePeak: 0.3 }),
  M({ id: "gastrocnemius_medial", group: "calves", kind: "tube",
      from: { bone: "femur", t: 0.96, ang: 210, r: 4.6 },
      to:   { bone: "calc", t: 0.75, ang: 186, r: 2.2 },
      r: [1.5, 4.0, 0.7], flat: 0.85, bulge: 1.0, peak: 0.28, wide: [1.25, 1.1, 0.35], widePeak: 0.28 }),
  M({ id: "soleus", group: "calves", kind: "tube",
      from: { bone: "tibia", t: 0.20, ang: 184, r: 4.2 },
      to:   { bone: "calc", t: 0.84, ang: 182, r: 2.2 },
      r: [2.2, 3.6, 0.8], flat: 0.85, bulge: 0.5, peak: 0.34, wide: [1.15, 1.05, 0.35], widePeak: 0.34 }),
  M({ id: "tibialis_anterior", group: "calves", kind: "tube",
      from: { bone: "tibia", t: 0.12, ang: 26, r: 3.6 },
      to:   { bone: "foot", t: 0.40, ang: 306, r: 2.2 },
      r: [1.5, 3.0, 0.6], flat: 0.75, bulge: 0.5, peak: 0.30, wide: [1.1, 1, 0.45], widePeak: 0.3 }),
  M({ id: "peroneus", group: "calves", kind: "tube",
      from: { bone: "tibia", t: 0.22, ang: 122, r: 3.8 },
      to:   { bone: "foot", t: 0.34, ang: 112, r: 2.0 },
      r: [1.2, 2.4, 0.6], flat: 0.7, bulge: 0.5, peak: 0.28, wide: [1, 0.95, 0.5] }),
];

// The app hands the figure a set of group keys; every muscle with that group
// lights. This is the whole mapping, as a lookup built once.
export const MUSCLES_BY_GROUP = {};
for (const g of GROUPS) MUSCLES_BY_GROUP[g] = MUSCLES.filter((m) => m.group === g).map((m) => m.id);

// -------------------------------------------------------------- the bones ---
// The ecorche read depends on seeing bone in the gaps, so the skeleton is a
// real (if simple) set of solids, not a stick. Each part is built once in its
// bone's local frame and then carried rigidly, because bone lengths never
// change. Local space: y along the bone from A, x anterior, z to the right.
//   cap   a capsule: y0, y1 as FRACTIONS of the bone, radius, and an optional
//         lateral offset in units
//   ell   an ellipsoid: fraction along, offset (x,y,z in units), radii
//   ring  a flattened torus around the bone axis: fraction along, lateral
//         radius, anterior squash, tube radius
export const SKELETON = [
  ["head", { ell: [1.06, [-0.7, 0.4, 0], [5.6, 6.3, 5.9]] }, "pale"],   // cranial dome
  ["head", { ell: [0.86, [2.9, 0.2, 0], [2.9, 3.6, 4.2]] }, "pale"],    // maxilla
  ["head", { box: [[4.1, 10.4, 0], [0.85, 0.75, 4.0]] }, "pale"],       // brow ridge
  ["head", { ell: [0.52, [2.5, 0.0, 0], [2.7, 2.5, 3.6]] }, "pale"],    // mandible
  ["neck", { cap: [-0.1, 1.05, 2.3, 0, [-1.6, 0, 0]] }],
  ["spine", { cap: [0.30, 1.0, 2.2, 0, [-3.2, 0, 0]] }],        // thoracic
  ["spine", { cap: [0.02, 0.34, 2.4, 0, [-2.6, 0, 0]] }],       // lumbar
  ["spine", { ell: [0.84, [5.6, 0, 0], [1.0, 6.0, 2.2]] }],     // sternum
  ["spine", { ring: [0.50, 7.8, 0.70, 0.58] }],
  ["spine", { ring: [0.58, 8.4, 0.70, 0.58] }],
  ["spine", { ring: [0.66, 8.7, 0.70, 0.58] }],
  ["spine", { ring: [0.74, 8.7, 0.70, 0.58] }],
  ["spine", { ring: [0.82, 8.2, 0.70, 0.58] }],
  ["spine", { ring: [0.90, 7.2, 0.70, 0.58] }],
  ["spine", { ring: [0.97, 5.8, 0.72, 0.58] }],
  // pelvis: two iliac blades and a sacral block
  ["pelvis", { ell: [0.55, [0.5, 0, 6.2], [4.6, 5.6, 2.0]] }],
  ["pelvis", { ell: [0.55, [0.5, 0, -6.2], [4.6, 5.6, 2.0]] }],
  ["pelvis", { ell: [0.20, [-1.0, 0, 0], [3.2, 4.0, 6.0]] }],
  ["pelvis", { ell: [-0.25, [3.6, 0, 0], [2.0, 2.2, 4.4]] }],   // pubis
  ["clav", { cap: [0.10, 0.95, 1.25, 0, [1.4, 0, 0]] }],        // clavicle
  ["clav", { ell: [0.70, [-2.6, 0, 0], [1.0, 4.4, 4.0]] }],     // scapula
  ["humerus", { cap: [0.02, 0.99, 2.0] }],
  ["ulna", { cap: [0.02, 0.99, 1.55, 0, [0.6, 0, 1.1]] }],
  ["ulna", { cap: [0.04, 0.99, 1.35, 0, [-0.4, 0, -1.2]] }],
  ["femur", { cap: [0.02, 0.99, 2.2] }],
  ["femur", { ell: [0.99, [0, 0, 0], [3.0, 2.4, 4.2]] }],       // condyles
  ["humerus", { ell: [0.99, [0, 0, 0], [2.4, 1.9, 3.1]] }],     // elbow
  ["tibia", { cap: [0.02, 0.99, 1.9, 0, [0.5, 0, -0.6]] }],
  ["tibia", { cap: [0.10, 0.98, 1.1, 0, [-0.4, 0, 2.1]] }],
  // ---- the hand. Local space is the rig's own hand frame: y runs wrist to
  // knuckles, +x is the thumb side of the palm and +z is lateral, so the palm
  // faces -z, which is exactly what the 2D renderer means by palmN.
  ["hand", { box: [[0.0, 2.30, 0.0], [1.10, 2.10, 2.55]] }, "pale"],     // palm block
  ["hand", { box: [[1.95, 0.95, 0.0], [0.62, 1.25, 1.15]] }, "pale"],    // thenar
  // ---- the foot. y runs ankle to toe, +x is the top of the foot, the sole
  // sits at x = -4.4 because that is where the rig puts the floor.
  ["foot", { box: [[-2.30, -1.85, 0.0], [2.10, 2.45, 2.05]] }, "pale"],  // calcaneus
  ["foot", { box: [[-1.55, 2.60, 0.0], [1.85, 2.80, 2.15]] }, "pale"],   // arch, lifted off the sole
  ["foot", { box: [[-3.15, 7.10, 0.0], [1.30, 2.60, 2.70]] }, "pale"],   // ball
  ["foot", { box: [[-3.55, 10.10, 0.0], [0.88, 1.40, 2.50]] }, "pale"],  // toe block
  ["foot", { ell: [0.0, [-3.5, 11.6, -1.95], [0.95, 1.05, 0.90]] }, "pale"],
  ["foot", { ell: [0.0, [-3.6, 11.7, -0.55], [0.78, 0.95, 0.68]] }, "pale"],
  ["foot", { ell: [0.0, [-3.6, 11.5, 0.62], [0.72, 0.88, 0.62]] }, "pale"],
  ["foot", { ell: [0.0, [-3.6, 11.2, 1.62], [0.66, 0.80, 0.56]] }, "pale"],
  ["foot", { ell: [0.0, [-3.6, 10.8, 2.42], [0.60, 0.72, 0.50]] }, "pale"],
];

// The five digits of the hand, in the hand bone's local space. Each is a chain
// of segments that flexes toward the palm by an amount the grip decides, so
// the same geometry is an open hand, a flat palm on the floor and a fist.
// Lengths add up to BODY.finger and BODY.thumb.
export const DIGITS = [
  { kind: "finger", root: [ 1.95, 4.25, 0.0], w: 0.60, t: 0.74, seg: [1.85, 1.25, 0.95] },
  { kind: "finger", root: [ 0.65, 4.40, 0.0], w: 0.62, t: 0.76, seg: [2.00, 1.35, 1.00] },
  { kind: "finger", root: [-0.65, 4.35, 0.0], w: 0.60, t: 0.74, seg: [1.90, 1.30, 0.95] },
  { kind: "finger", root: [-1.90, 4.15, 0.0], w: 0.55, t: 0.68, seg: [1.55, 1.05, 0.85] },
  { kind: "thumb",  root: [ 2.40, 1.95, 0.0], w: 0.80, t: 0.86, seg: [2.30, 1.70] },
];

// The rig's own grip table (rig.mjs GRIP_SPEC), read the same way: curl is the
// flexion of the first phalanx in degrees, thumb is the spread away from the
// palm's long axis, over pulls the thumb across the palm.
export const GRIP_SPEC = {
  open:   { curl: 14, thumb: 44, over: 0.00 },
  flat:   { curl: 2, thumb: 22, over: 0.00 },
  closed: { curl: 92, thumb: 58, over: 0.45 },
  fist:   { curl: 142, thumb: 62, over: 0.55 },
  hook:   { curl: 104, thumb: 14, over: 0.10 },
};
// cumulative flexion per joint, as a multiple of curl
export const DIGIT_CURL = [0.55, 1.0, 1.25];
