// Strength/volume math: 1RM estimation and tonnage. See ../sources.md.

/** Epley formula, the most common estimator and what most lifting apps default to. Reps > 10 get unreliable. */
export function estimate1RM(weight, reps) {
  if (!weight || !reps) return 0;
  if (reps === 1) return Math.round(weight);
  return Math.round(weight * (1 + reps / 30));
}

/** Total load moved in a set: weight x reps. Sum across sets for a session's tonnage. */
export function setTonnage(weight, reps) {
  return (weight || 0) * (reps || 0);
}

export function sessionTonnage(sets) {
  return sets.reduce((sum, s) => sum + setTonnage(s.weight, s.reps), 0);
}
