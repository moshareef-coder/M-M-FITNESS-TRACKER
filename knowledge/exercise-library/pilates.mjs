// Pilates move library. Muscle keys match MUSCLE_GROUPS in index.html.

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
        { name: "The Hundred", primary: ["abs"], secondary: [] },
        { name: "Roll-Up", primary: ["abs"], secondary: ["lowerback"] },
        { name: "Teaser", primary: ["abs"], secondary: ["quads"] },
        { name: "Double Leg Stretch", primary: ["abs"], secondary: [] },
        { name: "Criss-Cross", primary: ["obliques"], secondary: ["abs"] },
        { name: "Plank", primary: ["abs"], secondary: ["shoulders", "obliques"] },
      ],
    },
    {
      key: "glutes-hips",
      label: "Glutes / hips",
      exercises: [
        { name: "Leg Circles", primary: ["glutes"], secondary: ["abs"] },
        { name: "Side-Lying Leg Lift", primary: ["glutes"], secondary: [] },
        { name: "Bridge", primary: ["glutes"], secondary: ["hamstrings"] },
        { name: "Clamshell", primary: ["glutes"], secondary: [] },
      ],
    },
    {
      key: "back-posture",
      label: "Back / posture",
      exercises: [
        { name: "Swan", primary: ["lowerback"], secondary: ["shoulders"] },
        { name: "Swimming", primary: ["lowerback"], secondary: ["glutes", "shoulders"] },
        { name: "Saw", primary: ["obliques"], secondary: ["hamstrings"] },
        { name: "Spine Stretch Forward", primary: ["hamstrings"], secondary: ["lowerback"] },
      ],
    },
    {
      key: "full-body",
      label: "Full-body flow",
      exercises: [
        { name: "Roll-Over", primary: ["abs"], secondary: ["hamstrings"] },
        { name: "Jackknife", primary: ["abs"], secondary: ["shoulders"] },
        { name: "Side Kick Series", primary: ["glutes"], secondary: ["obliques", "quads"] },
        { name: "Boomerang", primary: ["abs"], secondary: ["glutes", "shoulders"] },
      ],
    },
  ],
};
