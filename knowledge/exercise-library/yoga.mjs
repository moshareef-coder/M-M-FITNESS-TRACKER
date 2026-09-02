// Yoga pose library. Muscle keys match MUSCLE_GROUPS in index.html. Poses are grouped by
// body-focus rather than by yoga style, because most poses show up across multiple styles --
// what changes between styles is pacing/hold time, not which poses exist. Styles are listed
// separately as format tags for whichever style-selection UI eventually uses them.
//
// level: beginner | intermediate | advanced -- standard yogic convention: beginner poses need
// little prior flexibility/balance, intermediate assumes a working foundation, advanced needs
// real strength, balance, or spinal flexibility and is usually taught with spotting/props first.

export const YOGA = {
  id: "yoga",
  label: "Yoga",
  trackingMode: "duration",
  styles: [
    { key: "vinyasa", label: "Vinyasa / Flow", note: "Continuous movement linked to breath, faster pacing." },
    { key: "hatha", label: "Hatha", note: "Slower, poses held longer, good for beginners." },
    { key: "power", label: "Power Yoga", note: "Athletic, strength-focused, fastest pacing." },
    { key: "yin", label: "Yin / Restorative", note: "Long passive holds (2-5 min), deep stretch, low exertion." },
  ],
  categories: [
    {
      key: "standing",
      label: "Standing poses",
      exercises: [
        { name: "Mountain Pose", primary: ["abs"], secondary: [], level: "beginner" },
        { name: "Chair Pose", primary: ["quads"], secondary: ["glutes", "shoulders"], level: "beginner" },
        { name: "Warrior I", primary: ["quads", "shoulders"], secondary: ["glutes", "calves"], level: "beginner" },
        { name: "Warrior II", primary: ["quads"], secondary: ["shoulders", "glutes"], level: "beginner" },
        { name: "Extended Side Angle", primary: ["obliques", "quads"], secondary: ["shoulders"], level: "intermediate" },
        { name: "Triangle Pose", primary: ["obliques", "hamstrings"], secondary: ["quads"], level: "intermediate" },
        { name: "Warrior III", primary: ["glutes", "quads"], secondary: ["shoulders", "abs"], level: "advanced" },
        { name: "Revolved Triangle", primary: ["obliques", "hamstrings"], secondary: ["quads"], level: "advanced" },
      ],
    },
    {
      key: "balance",
      label: "Balance poses",
      exercises: [
        { name: "Tree Pose", primary: ["calves"], secondary: ["abs", "quads"], level: "beginner" },
        { name: "Eagle Pose", primary: ["glutes", "quads"], secondary: ["shoulders"], level: "intermediate" },
        { name: "Half Moon Pose", primary: ["obliques", "glutes"], secondary: ["hamstrings"], level: "advanced" },
        { name: "Dancer's Pose", primary: ["quads", "shoulders"], secondary: ["hamstrings"], level: "advanced" },
        { name: "Crow Pose", primary: ["abs", "shoulders"], secondary: ["forearms"], level: "advanced" },
      ],
    },
    {
      key: "core-twists",
      label: "Core & twists",
      exercises: [
        { name: "Plank Pose", primary: ["abs"], secondary: ["shoulders", "chest"], level: "beginner" },
        { name: "Side Plank", primary: ["obliques"], secondary: ["abs", "shoulders"], level: "intermediate" },
        { name: "Boat Pose", primary: ["abs"], secondary: ["quads"], level: "intermediate" },
        { name: "Revolved Chair Pose", primary: ["obliques"], secondary: ["quads"], level: "intermediate" },
        { name: "Firefly Pose", primary: ["abs"], secondary: ["shoulders", "hamstrings"], level: "advanced" },
      ],
    },
    {
      key: "backbends",
      label: "Backbends",
      exercises: [
        { name: "Cobra Pose", primary: ["lowerback"], secondary: ["chest", "shoulders"], level: "beginner" },
        { name: "Bridge Pose", primary: ["glutes"], secondary: ["lowerback", "hamstrings"], level: "beginner" },
        { name: "Upward-Facing Dog", primary: ["lowerback"], secondary: ["chest", "shoulders"], level: "intermediate" },
        { name: "Camel Pose", primary: ["lowerback"], secondary: ["quads", "shoulders"], level: "intermediate" },
        { name: "Wheel Pose", primary: ["lowerback"], secondary: ["shoulders", "glutes"], level: "advanced" },
        { name: "King Pigeon Pose", primary: ["lowerback"], secondary: ["quads", "shoulders"], level: "advanced" },
      ],
    },
    {
      key: "hip-openers",
      label: "Hip openers & forward folds",
      exercises: [
        { name: "Downward-Facing Dog", primary: ["hamstrings"], secondary: ["shoulders", "calves"], level: "beginner" },
        { name: "Forward Fold", primary: ["hamstrings"], secondary: ["lowerback"], level: "beginner" },
        { name: "Low Lunge", primary: ["quads", "hamstrings"], secondary: ["glutes"], level: "beginner" },
        { name: "Butterfly Pose", primary: ["hamstrings"], secondary: ["glutes"], level: "beginner" },
        { name: "Pigeon Pose", primary: ["glutes"], secondary: ["hamstrings"], level: "intermediate" },
        { name: "Lizard Pose", primary: ["quads", "hamstrings"], secondary: ["glutes"], level: "intermediate" },
        { name: "Splits (Hanumanasana)", primary: ["hamstrings"], secondary: ["quads", "glutes"], level: "advanced" },
      ],
    },
    {
      key: "restorative",
      label: "Restorative / cool-down",
      exercises: [
        { name: "Child's Pose", primary: ["lowerback"], secondary: ["hamstrings"], level: "beginner" },
        { name: "Cat-Cow", primary: ["lowerback"], secondary: ["abs"], level: "beginner" },
        { name: "Corpse Pose (Savasana)", primary: [], secondary: [], level: "beginner" },
        { name: "Reclined Twist", primary: ["obliques"], secondary: ["lowerback"], level: "beginner" },
        { name: "Legs-Up-the-Wall Pose", primary: [], secondary: ["hamstrings"], level: "beginner" },
        { name: "Reclined Bound Angle Pose", primary: [], secondary: ["hamstrings"], level: "beginner" },
      ],
    },
  ],
};
