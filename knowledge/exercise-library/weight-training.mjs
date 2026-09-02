// Weight training exercise library. Categories are keyed exactly to MUSCLE_GROUPS in
// index.html (chest, shoulders, traps, lats, lowerback, biceps, triceps, forearms, abs,
// obliques, glutes, quads, hamstrings, calves) so this plugs directly into the existing
// muscle-volume/heat-map system with no translation layer.
//
// level: beginner | intermediate | advanced -- roughly, how much technique/stability the
// move demands before it's safe to load heavy, not how "hard" it feels.

export const WEIGHT_TRAINING = {
  id: "weight-training",
  label: "Weight Training",
  trackingMode: "sets", // sets x reps x weight, vs. duration-based activities
  categories: [
    {
      key: "chest",
      label: "Chest",
      exercises: [
        { name: "Barbell Bench Press", primary: ["chest"], secondary: ["triceps", "shoulders"], equipment: "barbell", level: "intermediate" },
        { name: "Incline Barbell Press", primary: ["chest", "shoulders"], secondary: ["triceps"], equipment: "barbell", level: "intermediate" },
        { name: "Dumbbell Bench Press", primary: ["chest"], secondary: ["triceps", "shoulders"], equipment: "dumbbell", level: "beginner" },
        { name: "Incline Dumbbell Press", primary: ["chest", "shoulders"], secondary: ["triceps"], equipment: "dumbbell", level: "beginner" },
        { name: "Push-Up", primary: ["chest"], secondary: ["triceps", "shoulders"], equipment: "bodyweight", level: "beginner" },
        { name: "Dip", primary: ["chest"], secondary: ["triceps", "shoulders"], equipment: "bodyweight", level: "intermediate" },
        { name: "Cable Fly", primary: ["chest"], secondary: [], equipment: "cable", level: "beginner" },
        { name: "Pec Deck", primary: ["chest"], secondary: [], equipment: "machine", level: "beginner" },
      ],
    },
    {
      key: "lats",
      label: "Back (Lats)",
      exercises: [
        { name: "Pull-Up", primary: ["lats"], secondary: ["biceps", "forearms"], equipment: "bodyweight", level: "intermediate" },
        { name: "Lat Pulldown", primary: ["lats"], secondary: ["biceps", "forearms"], equipment: "cable", level: "beginner" },
        { name: "Barbell Row", primary: ["lats"], secondary: ["biceps", "traps", "shoulders"], equipment: "barbell", level: "intermediate" },
        { name: "Dumbbell Row", primary: ["lats"], secondary: ["biceps", "traps"], equipment: "dumbbell", level: "beginner" },
        { name: "Seated Cable Row", primary: ["lats"], secondary: ["biceps", "traps"], equipment: "cable", level: "beginner" },
        { name: "T-Bar Row", primary: ["lats"], secondary: ["biceps", "traps"], equipment: "barbell", level: "intermediate" },
        { name: "Straight-Arm Pulldown", primary: ["lats"], secondary: ["triceps"], equipment: "cable", level: "beginner" },
      ],
    },
    {
      key: "traps",
      label: "Traps / Upper Back",
      exercises: [
        { name: "Barbell Shrug", primary: ["traps"], secondary: ["forearms"], equipment: "barbell", level: "beginner" },
        { name: "Dumbbell Shrug", primary: ["traps"], secondary: ["forearms"], equipment: "dumbbell", level: "beginner" },
        { name: "Face Pull", primary: ["traps", "shoulders"], secondary: [], equipment: "cable", level: "beginner" },
        { name: "Rear Delt Fly", primary: ["shoulders", "traps"], secondary: [], equipment: "dumbbell", level: "beginner" },
        { name: "Upright Row", primary: ["traps", "shoulders"], secondary: ["biceps"], equipment: "barbell", level: "intermediate" },
      ],
    },
    {
      key: "shoulders",
      label: "Shoulders",
      exercises: [
        { name: "Overhead Press", primary: ["shoulders"], secondary: ["triceps", "traps"], equipment: "barbell", level: "intermediate" },
        { name: "Dumbbell Shoulder Press", primary: ["shoulders"], secondary: ["triceps"], equipment: "dumbbell", level: "beginner" },
        { name: "Lateral Raise", primary: ["shoulders"], secondary: [], equipment: "dumbbell", level: "beginner" },
        { name: "Front Raise", primary: ["shoulders"], secondary: [], equipment: "dumbbell", level: "beginner" },
        { name: "Arnold Press", primary: ["shoulders"], secondary: ["triceps"], equipment: "dumbbell", level: "intermediate" },
        { name: "Cable Lateral Raise", primary: ["shoulders"], secondary: [], equipment: "cable", level: "beginner" },
      ],
    },
    {
      key: "biceps",
      label: "Biceps",
      exercises: [
        { name: "Barbell Curl", primary: ["biceps"], secondary: ["forearms"], equipment: "barbell", level: "beginner" },
        { name: "Dumbbell Curl", primary: ["biceps"], secondary: ["forearms"], equipment: "dumbbell", level: "beginner" },
        { name: "Hammer Curl", primary: ["biceps"], secondary: ["forearms"], equipment: "dumbbell", level: "beginner" },
        { name: "Preacher Curl", primary: ["biceps"], secondary: [], equipment: "barbell", level: "beginner" },
        { name: "Cable Curl", primary: ["biceps"], secondary: ["forearms"], equipment: "cable", level: "beginner" },
        { name: "Incline Dumbbell Curl", primary: ["biceps"], secondary: [], equipment: "dumbbell", level: "intermediate" },
      ],
    },
    {
      key: "triceps",
      label: "Triceps",
      exercises: [
        { name: "Triceps Pushdown", primary: ["triceps"], secondary: [], equipment: "cable", level: "beginner" },
        { name: "Skull Crusher", primary: ["triceps"], secondary: [], equipment: "barbell", level: "intermediate" },
        { name: "Overhead Triceps Extension", primary: ["triceps"], secondary: [], equipment: "dumbbell", level: "beginner" },
        { name: "Close-Grip Bench Press", primary: ["triceps"], secondary: ["chest", "shoulders"], equipment: "barbell", level: "intermediate" },
        { name: "Triceps Kickback", primary: ["triceps"], secondary: [], equipment: "dumbbell", level: "beginner" },
        { name: "Bench Dip", primary: ["triceps"], secondary: ["chest", "shoulders"], equipment: "bodyweight", level: "beginner" },
      ],
    },
    {
      key: "forearms",
      label: "Forearms",
      exercises: [
        { name: "Wrist Curl", primary: ["forearms"], secondary: [], equipment: "dumbbell", level: "beginner" },
        { name: "Reverse Wrist Curl", primary: ["forearms"], secondary: [], equipment: "dumbbell", level: "beginner" },
        { name: "Farmer's Carry", primary: ["forearms"], secondary: ["traps", "abs"], equipment: "dumbbell", level: "beginner" },
        { name: "Dead Hang", primary: ["forearms"], secondary: ["lats"], equipment: "bodyweight", level: "beginner" },
        { name: "Reverse Curl", primary: ["forearms"], secondary: ["biceps"], equipment: "barbell", level: "beginner" },
      ],
    },
    {
      key: "quads",
      label: "Quads",
      exercises: [
        { name: "Barbell Back Squat", primary: ["quads"], secondary: ["glutes", "hamstrings"], equipment: "barbell", level: "intermediate" },
        { name: "Front Squat", primary: ["quads"], secondary: ["glutes", "abs"], equipment: "barbell", level: "advanced" },
        { name: "Leg Press", primary: ["quads"], secondary: ["glutes", "hamstrings"], equipment: "machine", level: "beginner" },
        { name: "Walking Lunge", primary: ["quads"], secondary: ["glutes", "hamstrings"], equipment: "dumbbell", level: "beginner" },
        { name: "Bulgarian Split Squat", primary: ["quads"], secondary: ["glutes"], equipment: "dumbbell", level: "intermediate" },
        { name: "Leg Extension", primary: ["quads"], secondary: [], equipment: "machine", level: "beginner" },
        { name: "Goblet Squat", primary: ["quads"], secondary: ["glutes"], equipment: "dumbbell", level: "beginner" },
      ],
    },
    {
      key: "hamstrings",
      label: "Hamstrings",
      exercises: [
        { name: "Romanian Deadlift", primary: ["hamstrings"], secondary: ["glutes", "lowerback"], equipment: "barbell", level: "intermediate" },
        { name: "Leg Curl", primary: ["hamstrings"], secondary: [], equipment: "machine", level: "beginner" },
        { name: "Good Morning", primary: ["hamstrings"], secondary: ["lowerback", "glutes"], equipment: "barbell", level: "advanced" },
        { name: "Stiff-Leg Deadlift", primary: ["hamstrings"], secondary: ["glutes"], equipment: "dumbbell", level: "intermediate" },
        { name: "Nordic Curl", primary: ["hamstrings"], secondary: [], equipment: "bodyweight", level: "advanced" },
      ],
    },
    {
      key: "glutes",
      label: "Glutes",
      exercises: [
        { name: "Hip Thrust", primary: ["glutes"], secondary: ["hamstrings"], equipment: "barbell", level: "beginner" },
        { name: "Glute Bridge", primary: ["glutes"], secondary: ["hamstrings"], equipment: "bodyweight", level: "beginner" },
        { name: "Cable Kickback", primary: ["glutes"], secondary: [], equipment: "cable", level: "beginner" },
        { name: "Sumo Deadlift", primary: ["glutes"], secondary: ["hamstrings", "quads"], equipment: "barbell", level: "intermediate" },
        { name: "Step-Up", primary: ["glutes"], secondary: ["quads"], equipment: "dumbbell", level: "beginner" },
      ],
    },
    {
      key: "calves",
      label: "Calves",
      exercises: [
        { name: "Standing Calf Raise", primary: ["calves"], secondary: [], equipment: "machine", level: "beginner" },
        { name: "Seated Calf Raise", primary: ["calves"], secondary: [], equipment: "machine", level: "beginner" },
        { name: "Dumbbell Calf Raise", primary: ["calves"], secondary: [], equipment: "dumbbell", level: "beginner" },
        { name: "Leg Press Calf Raise", primary: ["calves"], secondary: [], equipment: "machine", level: "beginner" },
      ],
    },
    {
      key: "abs",
      label: "Abs",
      exercises: [
        { name: "Plank", primary: ["abs"], secondary: ["obliques"], equipment: "bodyweight", level: "beginner" },
        { name: "Crunch", primary: ["abs"], secondary: [], equipment: "bodyweight", level: "beginner" },
        { name: "Hanging Leg Raise", primary: ["abs"], secondary: ["forearms"], equipment: "bodyweight", level: "advanced" },
        { name: "Cable Crunch", primary: ["abs"], secondary: [], equipment: "cable", level: "beginner" },
        { name: "Sit-Up", primary: ["abs"], secondary: [], equipment: "bodyweight", level: "beginner" },
        { name: "Ab Wheel Rollout", primary: ["abs"], secondary: ["lowerback", "shoulders"], equipment: "bodyweight", level: "advanced" },
      ],
    },
    {
      key: "obliques",
      label: "Obliques",
      exercises: [
        { name: "Russian Twist", primary: ["obliques"], secondary: ["abs"], equipment: "bodyweight", level: "beginner" },
        { name: "Side Plank", primary: ["obliques"], secondary: ["abs"], equipment: "bodyweight", level: "beginner" },
        { name: "Woodchopper", primary: ["obliques"], secondary: ["abs"], equipment: "cable", level: "intermediate" },
        { name: "Side Bend", primary: ["obliques"], secondary: [], equipment: "dumbbell", level: "beginner" },
      ],
    },
    {
      key: "lowerback",
      label: "Lower Back",
      exercises: [
        { name: "Back Extension", primary: ["lowerback"], secondary: ["glutes", "hamstrings"], equipment: "bodyweight", level: "beginner" },
        { name: "Superman", primary: ["lowerback"], secondary: ["glutes"], equipment: "bodyweight", level: "beginner" },
        { name: "Deadlift", primary: ["lowerback", "hamstrings", "glutes"], secondary: ["traps", "forearms", "lats"], equipment: "barbell", level: "advanced" },
      ],
    },
  ],
};
