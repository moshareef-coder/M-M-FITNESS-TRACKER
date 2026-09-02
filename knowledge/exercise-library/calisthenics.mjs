// Calisthenics / bodyweight skill library. Muscle keys match MUSCLE_GROUPS in index.html.
// Structured as progression chains, not muscle groups, because that's how calisthenics
// actually works: each category is a line from "anyone can do this" to "elite skill," and the
// level field marks where on that line a move sits. Basic moves that also live in
// weight-training.mjs (Push-Up, Pull-Up, Plank, Dip) are intentionally repeated here so a
// beginner's progression chain reads start-to-finish without a gap.

export const CALISTHENICS = {
  id: "calisthenics",
  label: "Calisthenics",
  trackingMode: "sets",
  categories: [
    {
      key: "push",
      label: "Push progressions",
      exercises: [
        { name: "Wall Push-Up", primary: ["chest"], secondary: ["triceps", "shoulders"], equipment: "bodyweight", level: "beginner" },
        { name: "Incline Push-Up", primary: ["chest"], secondary: ["triceps", "shoulders"], equipment: "bodyweight", level: "beginner" },
        { name: "Push-Up", primary: ["chest"], secondary: ["triceps", "shoulders"], equipment: "bodyweight", level: "beginner" },
        { name: "Diamond Push-Up", primary: ["triceps"], secondary: ["chest"], equipment: "bodyweight", level: "intermediate" },
        { name: "Dip", primary: ["chest", "triceps"], secondary: ["shoulders"], equipment: "bodyweight", level: "intermediate" },
        { name: "Archer Push-Up", primary: ["chest"], secondary: ["triceps", "shoulders"], equipment: "bodyweight", level: "advanced" },
        { name: "Pseudo Planche Push-Up", primary: ["chest", "shoulders"], secondary: ["triceps", "abs"], equipment: "bodyweight", level: "advanced" },
        { name: "One-Arm Push-Up", primary: ["chest"], secondary: ["triceps", "shoulders", "obliques"], equipment: "bodyweight", level: "advanced" },
      ],
    },
    {
      key: "pull",
      label: "Pull progressions",
      exercises: [
        { name: "Dead Hang", primary: ["forearms"], secondary: ["lats"], equipment: "bodyweight", level: "beginner" },
        { name: "Inverted Row", primary: ["lats"], secondary: ["biceps", "traps"], equipment: "bodyweight", level: "beginner" },
        { name: "Negative Pull-Up", primary: ["lats"], secondary: ["biceps", "forearms"], equipment: "bodyweight", level: "beginner" },
        { name: "Pull-Up", primary: ["lats"], secondary: ["biceps", "forearms"], equipment: "bodyweight", level: "intermediate" },
        { name: "Chin-Up", primary: ["lats"], secondary: ["biceps", "forearms"], equipment: "bodyweight", level: "intermediate" },
        { name: "Archer Pull-Up", primary: ["lats"], secondary: ["biceps", "forearms"], equipment: "bodyweight", level: "advanced" },
        { name: "Muscle-Up", primary: ["lats"], secondary: ["chest", "triceps", "shoulders"], equipment: "bodyweight", level: "advanced" },
        { name: "One-Arm Pull-Up", primary: ["lats"], secondary: ["biceps", "forearms", "obliques"], equipment: "bodyweight", level: "advanced" },
      ],
    },
    {
      key: "legs",
      label: "Leg progressions",
      exercises: [
        { name: "Bodyweight Squat", primary: ["quads"], secondary: ["glutes"], equipment: "bodyweight", level: "beginner" },
        { name: "Split Squat", primary: ["quads"], secondary: ["glutes"], equipment: "bodyweight", level: "beginner" },
        { name: "Walking Lunge", primary: ["quads"], secondary: ["glutes", "hamstrings"], equipment: "bodyweight", level: "beginner" },
        { name: "Bulgarian Split Squat", primary: ["quads"], secondary: ["glutes"], equipment: "bodyweight", level: "intermediate" },
        { name: "Nordic Curl", primary: ["hamstrings"], secondary: [], equipment: "bodyweight", level: "advanced" },
        { name: "Shrimp Squat", primary: ["quads"], secondary: ["glutes"], equipment: "bodyweight", level: "advanced" },
        { name: "Pistol Squat", primary: ["quads"], secondary: ["glutes"], equipment: "bodyweight", level: "advanced" },
      ],
    },
    {
      key: "core-statics",
      label: "Core & static holds",
      exercises: [
        { name: "Plank", primary: ["abs"], secondary: ["obliques"], equipment: "bodyweight", level: "beginner" },
        { name: "Hollow Body Hold", primary: ["abs"], secondary: [], equipment: "bodyweight", level: "beginner" },
        { name: "Side Plank", primary: ["obliques"], secondary: ["abs"], equipment: "bodyweight", level: "beginner" },
        { name: "Tuck L-Sit", primary: ["abs"], secondary: ["triceps", "forearms"], equipment: "bodyweight", level: "intermediate" },
        { name: "Hanging Leg Raise", primary: ["abs"], secondary: ["forearms"], equipment: "bodyweight", level: "intermediate" },
        { name: "L-Sit", primary: ["abs"], secondary: ["triceps", "forearms"], equipment: "bodyweight", level: "advanced" },
        { name: "V-Sit", primary: ["abs"], secondary: ["hamstrings", "triceps"], equipment: "bodyweight", level: "advanced" },
      ],
    },
    {
      key: "advanced-statics",
      label: "Advanced statics (skill work)",
      exercises: [
        { name: "Wall Handstand Hold", primary: ["shoulders"], secondary: ["triceps", "abs"], equipment: "bodyweight", level: "intermediate" },
        { name: "Planche Lean", primary: ["shoulders", "chest"], secondary: ["abs"], equipment: "bodyweight", level: "intermediate" },
        { name: "Tuck Front Lever", primary: ["lats"], secondary: ["abs", "biceps"], equipment: "bodyweight", level: "advanced" },
        { name: "Freestanding Handstand", primary: ["shoulders"], secondary: ["triceps", "abs"], equipment: "bodyweight", level: "advanced" },
        { name: "Handstand Push-Up", primary: ["shoulders"], secondary: ["triceps"], equipment: "bodyweight", level: "advanced" },
        { name: "Front Lever", primary: ["lats"], secondary: ["abs", "biceps"], equipment: "bodyweight", level: "advanced" },
        { name: "Tuck Planche", primary: ["shoulders", "chest"], secondary: ["abs"], equipment: "bodyweight", level: "advanced" },
        { name: "Full Planche", primary: ["shoulders", "chest"], secondary: ["abs", "triceps"], equipment: "bodyweight", level: "advanced" },
        { name: "Human Flag", primary: ["obliques"], secondary: ["lats", "shoulders"], equipment: "bodyweight", level: "advanced" },
      ],
    },
  ],
};
