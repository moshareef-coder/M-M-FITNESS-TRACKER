// Aggregates every training's exercise library into one list. Add a new training here once
// its file exists (see weight-training.mjs for the shape to follow).

import { WEIGHT_TRAINING } from "./weight-training.mjs";
import { YOGA } from "./yoga.mjs";
import { PILATES } from "./pilates.mjs";
import { CALISTHENICS } from "./calisthenics.mjs";
import { STRETCHING } from "./stretching.mjs";
import { CARDIO } from "./cardio.mjs";

export const TRAININGS = [WEIGHT_TRAINING, YOGA, PILATES, CALISTHENICS, STRETCHING, CARDIO];

// Activities tracked by duration with no exercise-level breakdown -- logging "exercises within
// basketball" doesn't map to a discrete move list the way lifting or yoga does. Mirrors
// ACTIVITY_PRESETS in index.html minus the trainings above, which do have real libraries.
//
// Running, Cycling, Swimming, Rowing and the rest still appear here on purpose. This list is
// what somebody picks when LOGGING something they already did, where "I ran for 40 minutes" is
// the whole truth and a prescription would be a lie. cardio.mjs is the other direction: what to
// PLAN. The same activity legitimately lives in both, meaning different things.
export const SIMPLE_TIMED_ACTIVITIES = [
  "Barre", "Running", "Walking", "Hiking", "Cycling", "Spin class", "Swimming",
  "Rowing machine", "Elliptical", "Stair climber", "Boxing", "Kickboxing", "HIIT", "CrossFit",
  "Jump rope", "Dance", "Basketball", "Soccer", "Tennis", "Climbing", "Skiing", "Stretching",
];
