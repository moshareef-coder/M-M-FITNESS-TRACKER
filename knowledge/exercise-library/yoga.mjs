// Yoga pose library. Muscle keys match MUSCLE_GROUPS in index.html. Poses are grouped by
// body-focus rather than by yoga style, because most poses show up across multiple styles --
// what changes between styles is pacing/hold time, not which poses exist. Styles are listed
// separately as format tags for whichever style-selection UI eventually uses them.

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
        { name: "Mountain Pose", primary: ["abs"], secondary: [] },
        { name: "Warrior I", primary: ["quads", "shoulders"], secondary: ["glutes", "calves"] },
        { name: "Warrior II", primary: ["quads"], secondary: ["shoulders", "glutes"] },
        { name: "Triangle Pose", primary: ["obliques", "hamstrings"], secondary: ["quads"] },
        { name: "Chair Pose", primary: ["quads"], secondary: ["glutes", "shoulders"] },
        { name: "Tree Pose", primary: ["calves"], secondary: ["abs", "quads"] },
      ],
    },
    {
      key: "balance",
      label: "Balance poses",
      exercises: [
        { name: "Eagle Pose", primary: ["glutes", "quads"], secondary: ["shoulders"] },
        { name: "Half Moon Pose", primary: ["obliques", "glutes"], secondary: ["hamstrings"] },
        { name: "Dancer's Pose", primary: ["quads", "shoulders"], secondary: ["hamstrings"] },
      ],
    },
    {
      key: "core-twists",
      label: "Core & twists",
      exercises: [
        { name: "Boat Pose", primary: ["abs"], secondary: ["quads"] },
        { name: "Plank Pose", primary: ["abs"], secondary: ["shoulders", "chest"] },
        { name: "Side Plank", primary: ["obliques"], secondary: ["abs", "shoulders"] },
        { name: "Revolved Chair Pose", primary: ["obliques"], secondary: ["quads"] },
      ],
    },
    {
      key: "backbends",
      label: "Backbends",
      exercises: [
        { name: "Cobra Pose", primary: ["lowerback"], secondary: ["chest", "shoulders"] },
        { name: "Upward-Facing Dog", primary: ["lowerback"], secondary: ["chest", "shoulders"] },
        { name: "Camel Pose", primary: ["lowerback"], secondary: ["quads", "shoulders"] },
        { name: "Bridge Pose", primary: ["glutes"], secondary: ["lowerback", "hamstrings"] },
      ],
    },
    {
      key: "hip-openers",
      label: "Hip openers & forward folds",
      exercises: [
        { name: "Downward-Facing Dog", primary: ["hamstrings"], secondary: ["shoulders", "calves"] },
        { name: "Pigeon Pose", primary: ["glutes"], secondary: ["hamstrings"] },
        { name: "Forward Fold", primary: ["hamstrings"], secondary: ["lowerback"] },
        { name: "Butterfly Pose", primary: ["hamstrings"], secondary: ["glutes"] },
        { name: "Low Lunge", primary: ["quads", "hamstrings"], secondary: ["glutes"] },
      ],
    },
    {
      key: "restorative",
      label: "Restorative / cool-down",
      exercises: [
        { name: "Child's Pose", primary: ["lowerback"], secondary: ["hamstrings"] },
        { name: "Cat-Cow", primary: ["lowerback"], secondary: ["abs"] },
        { name: "Reclined Twist", primary: ["obliques"], secondary: ["lowerback"] },
        { name: "Corpse Pose (Savasana)", primary: [], secondary: [] },
      ],
    },
  ],
};
