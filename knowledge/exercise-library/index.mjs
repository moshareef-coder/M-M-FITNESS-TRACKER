// Aggregates every training's exercise library into one list. Add a new training here once
// its file exists (see weight-training.mjs for the shape to follow).

import { WEIGHT_TRAINING } from "./weight-training.mjs";
import { YOGA } from "./yoga.mjs";
import { PILATES } from "./pilates.mjs";

export const TRAININGS = [WEIGHT_TRAINING, YOGA, PILATES];

// Activities tracked by duration with no exercise-level breakdown -- logging "exercises within
// basketball" doesn't map to a discrete move list the way lifting or yoga does. Mirrors
// ACTIVITY_PRESETS in index.html minus the three trainings above, which do have real libraries.
export const SIMPLE_TIMED_ACTIVITIES = [
  "Barre", "Running", "Walking", "Hiking", "Cycling", "Spin class", "Swimming",
  "Rowing machine", "Elliptical", "Stair climber", "Boxing", "Kickboxing", "HIIT", "CrossFit",
  "Jump rope", "Dance", "Basketball", "Soccer", "Tennis", "Climbing", "Skiing", "Stretching",
];
