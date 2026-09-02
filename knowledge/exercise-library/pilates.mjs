// Pilates move library. Muscle keys match MUSCLE_GROUPS in index.html.
//
// level: beginner | intermediate | advanced -- standard Pilates convention, roughly matching
// the classical mat order (beginner moves build the control the intermediate/advanced
// sequence assumes you already have).

export const PILATES = {
  id: "pilates",
  label: "Pilates",
  trackingMode: "duration",
  styles: [
    { key: "mat", label: "Mat Pilates", note: "Bodyweight, floor-based, no equipment needed." },
    { key: "reformer", label: "Reformer Pilates", note: "Spring-resistance machine, adds load to the same movement patterns." },
  ],
  categories: [
    {
      key: "core",
      label: "Core / abs",
      exercises: [
        { name: "The Hundred", primary: ["abs"], secondary: [], level: "beginner" },
        { name: "Plank", primary: ["abs"], secondary: ["shoulders", "obliques"], level: "beginner" },
        { name: "Double Leg Stretch", primary: ["abs"], secondary: [], level: "beginner" },
        { name: "Single Leg Stretch", primary: ["abs"], secondary: [], level: "beginner" },
        { name: "Roll-Up", primary: ["abs"], secondary: ["lowerback"], level: "intermediate" },
        { name: "Criss-Cross", primary: ["obliques"], secondary: ["abs"], level: "intermediate" },
        { name: "Teaser", primary: ["abs"], secondary: ["quads"], level: "advanced" },
        { name: "Jackknife", primary: ["abs"], secondary: ["shoulders"], level: "advanced" },
      ],
    },
    {
      key: "glutes-hips",
      label: "Glutes / hips",
      exercises: [
        { name: "Bridge", primary: ["glutes"], secondary: ["hamstrings"], level: "beginner" },
        { name: "Clamshell", primary: ["glutes"], secondary: [], level: "beginner" },
        { name: "Leg Circles", primary: ["glutes"], secondary: ["abs"], level: "beginner" },
        { name: "Side-Lying Leg Lift", primary: ["glutes"], secondary: [], level: "beginner" },
        { name: "Side Kick Series", primary: ["glutes"], secondary: ["obliques", "quads"], level: "intermediate" },
      ],
    },
    {
      key: "back-posture",
      label: "Back / posture",
      exercises: [
        { name: "Cat-Cow", primary: ["lowerback"], secondary: ["abs"], level: "beginner" },
        { name: "Spine Stretch Forward", primary: ["hamstrings"], secondary: ["lowerback"], level: "beginner" },
        { name: "Swan", primary: ["lowerback"], secondary: ["shoulders"], level: "intermediate" },
        { name: "Saw", primary: ["obliques"], secondary: ["hamstrings"], level: "intermediate" },
        { name: "Swimming", primary: ["lowerback"], secondary: ["glutes", "shoulders"], level: "advanced" },
      ],
    },
    {
      key: "full-body",
      label: "Full-body flow",
      exercises: [
        { name: "Shoulder Bridge", primary: ["glutes"], secondary: ["hamstrings", "abs"], level: "beginner" },
        { name: "Roll-Over", primary: ["abs"], secondary: ["hamstrings"], level: "intermediate" },
        { name: "Corkscrew", primary: ["abs"], secondary: ["obliques"], level: "advanced" },
        { name: "Boomerang", primary: ["abs"], secondary: ["glutes", "shoulders"], level: "advanced" },
        { name: "Control Balance", primary: ["abs"], secondary: ["hamstrings", "shoulders"], level: "advanced" },
      ],
    },
  ],
};
