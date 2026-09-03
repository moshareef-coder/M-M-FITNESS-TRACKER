// Structured version of muscle-glossary.md, for the body-explorer UI to consume. Keep the two
// in sync -- this is the machine-readable form of the same 75-muscle list, same source of truth.
//
// Each region is a clickable zone on the overview body. `views` says which overview view(s)
// (front/back) that region appears on. `muscles` is ordered roughly superficial-to-deep /
// proximal-to-distal, matching how the detail illustration lays them out.

export const MUSCLE_REGIONS = {
  neckTraps: {
    label: "Neck & Traps", broadGroup: "traps", views: ["front", "back"],
    muscles: [
      { name: "Sternocleidomastoid" },
      { name: "Upper Trapezius" },
      { name: "Middle Trapezius" },
      { name: "Lower Trapezius" },
      { name: "Levator Scapulae" },
    ],
  },
  shoulders: {
    label: "Shoulders", broadGroup: "shoulders", views: ["front", "back"],
    muscles: [
      { name: "Anterior Deltoid" },
      { name: "Lateral Deltoid" },
      { name: "Posterior Deltoid" },
      { name: "Supraspinatus" },
      { name: "Infraspinatus" },
      { name: "Teres Minor" },
      { name: "Subscapularis" },
    ],
  },
  chest: {
    label: "Chest", broadGroup: "chest", views: ["front"],
    muscles: [
      { name: "Pectoralis Major, Clavicular Head" },
      { name: "Pectoralis Major, Sternal Head" },
      { name: "Pectoralis Minor" },
      { name: "Serratus Anterior" },
    ],
  },
  back: {
    label: "Back", broadGroup: "lats", views: ["back"],
    muscles: [
      { name: "Latissimus Dorsi" },
      { name: "Teres Major" },
      { name: "Rhomboid Major" },
      { name: "Rhomboid Minor" },
    ],
  },
  lowerBack: {
    label: "Lower Back", broadGroup: "lowerback", views: ["back"],
    muscles: [
      { name: "Iliocostalis" },
      { name: "Longissimus" },
      { name: "Spinalis" },
      { name: "Multifidus" },
      { name: "Quadratus Lumborum" },
    ],
  },
  biceps: {
    label: "Biceps", broadGroup: "biceps", views: ["front"],
    muscles: [
      { name: "Biceps Brachii, Long Head" },
      { name: "Biceps Brachii, Short Head" },
      { name: "Brachialis" },
      { name: "Coracobrachialis" },
    ],
  },
  triceps: {
    label: "Triceps", broadGroup: "triceps", views: ["back"],
    muscles: [
      { name: "Triceps Brachii, Long Head" },
      { name: "Triceps Brachii, Lateral Head" },
      { name: "Triceps Brachii, Medial Head" },
      { name: "Anconeus" },
    ],
  },
  forearms: {
    label: "Forearms", broadGroup: "forearms", views: ["front", "back"],
    muscles: [
      { name: "Brachioradialis" },
      { name: "Flexor Carpi Radialis" },
      { name: "Flexor Carpi Ulnaris" },
      { name: "Palmaris Longus" },
      { name: "Extensor Carpi Radialis Longus" },
      { name: "Extensor Carpi Radialis Brevis" },
      { name: "Extensor Carpi Ulnaris" },
      { name: "Pronator Teres" },
      { name: "Supinator" },
    ],
  },
  abs: {
    label: "Abs", broadGroup: "abs", views: ["front"],
    muscles: [
      { name: "Rectus Abdominis" },
      { name: "Transverse Abdominis" },
    ],
  },
  obliques: {
    label: "Obliques", broadGroup: "obliques", views: ["front"],
    muscles: [
      { name: "External Oblique" },
      { name: "Internal Oblique" },
    ],
  },
  glutes: {
    label: "Glutes", broadGroup: "glutes", views: ["back"],
    muscles: [
      { name: "Gluteus Maximus" },
      { name: "Gluteus Medius" },
      { name: "Gluteus Minimus" },
      { name: "Tensor Fasciae Latae" },
      { name: "Piriformis" },
    ],
  },
  hipFlexors: {
    label: "Hip Flexors", broadGroup: "quads", views: ["front"],
    muscles: [
      { name: "Iliopsoas" },
      { name: "Sartorius" },
    ],
  },
  quads: {
    label: "Quads", broadGroup: "quads", views: ["front"],
    muscles: [
      { name: "Rectus Femoris" },
      { name: "Vastus Lateralis" },
      { name: "Vastus Medialis" },
      { name: "Vastus Intermedius" },
    ],
  },
  hamstrings: {
    label: "Hamstrings", broadGroup: "hamstrings", views: ["back"],
    muscles: [
      { name: "Biceps Femoris" },
      { name: "Semitendinosus" },
      { name: "Semimembranosus" },
      { name: "Popliteus" },
    ],
  },
  adductors: {
    label: "Adductors", broadGroup: "quads", views: ["front"],
    muscles: [
      { name: "Adductor Longus" },
      { name: "Adductor Magnus" },
      { name: "Adductor Brevis" },
      { name: "Gracilis" },
      { name: "Pectineus" },
    ],
  },
  calves: {
    label: "Calves", broadGroup: "calves", views: ["front", "back"],
    muscles: [
      { name: "Gastrocnemius, Medial Head" },
      { name: "Gastrocnemius, Lateral Head" },
      { name: "Soleus" },
      { name: "Plantaris" },
      { name: "Tibialis Anterior" },
      { name: "Tibialis Posterior" },
      { name: "Peroneus Longus" },
      { name: "Peroneus Brevis" },
    ],
  },
};

export const REGION_KEYS_BY_VIEW = {
  front: Object.entries(MUSCLE_REGIONS).filter(([, r]) => r.views.includes("front")).map(([k]) => k),
  back: Object.entries(MUSCLE_REGIONS).filter(([, r]) => r.views.includes("back")).map(([k]) => k),
};
