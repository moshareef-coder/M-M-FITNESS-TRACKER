// TDEE / BMR via Mifflin-St Jeor (1990), the equation with the best validated accuracy for
// living people (vs. Harris-Benedict, which was derived in 1919 and runs high). See ../sources.md.

import { LB_TO_KG } from "./calorie-math.mjs";

const IN_TO_CM = 2.54;

// Matches the app's setupActivity <select> exactly (Sedentary / Moderate / Active).
export const ACTIVITY_MULTIPLIERS = {
  "Sedentary": 1.2,
  "Moderate": 1.55,
  "Active": 1.725,
};

/**
 * profile: { sex: "Male"|"Female"|"Rather not say", age, height_in, weightLb }
 * "Rather not say" averages the male/female offset rather than excluding the estimate,
 * since BMR is still useful context even when sex isn't disclosed.
 */
export function calculateBMR({ sex, age, height_in, weightLb }) {
  if (!age || !height_in || !weightLb) return null;
  const kg = weightLb * LB_TO_KG;
  const cm = height_in * IN_TO_CM;
  const base = 10 * kg + 6.25 * cm - 5 * age;
  if (sex === "Male") return Math.round(base + 5);
  if (sex === "Female") return Math.round(base - 161);
  return Math.round(base - 78); // midpoint of +5 / -161
}

export function calculateTDEE(profile) {
  const bmr = calculateBMR(profile);
  if (bmr == null) return null;
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activity_level] ?? ACTIVITY_MULTIPLIERS["Moderate"];
  return Math.round(bmr * multiplier);
}
