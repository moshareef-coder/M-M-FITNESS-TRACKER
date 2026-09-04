// Per-muscle detail for the Body tab's zoomed-in view. The app tracks volume per broad
// group (MUSCLE_GROUPS in index.html); this refines it to the 29 individual muscles the
// Rive figure can draw (ALL_MUSCLES in rive-body.mjs) and, where exercise choice really
// changes which part of a muscle works, to heads within a muscle. Labels here are plain
// gym language on purpose (Bicep, Lower Back, Calf), not the Latin anatomy-textbook name.
//
// Weights follow the app's group rules: 1 for a prime mover, 0.5 for an assisting muscle.
// A rule only names the pieces an exercise actually loads, so a flat bench press credits
// the sternal head of the pecs and not the rear delt -- that gap is the whole point of
// the zoomed view. Exercises with no rule here fall back to spreading their group credit
// over every piece of the group (see hitsForExercise), so nothing logged ever vanishes.

const P = 1, S = 0.5;

// Plain gym language, not Latin: this is what shows on the piece list and the figure
// callouts. Two pieces sharing a label (the four forearm muscles, both hamstrings) is
// fine -- the "where" line underneath tells them apart, same as segments in an anatomy
// chart's legend. "try" is one exercise that targets the piece, shown when it has not
// been hit in the period.
export const MUSCLE_PIECES = {
  deltoids:             { label: "Shoulder",       group: "shoulders",  where: "front and side of the shoulder",     heads: ["anteriorDeltoid", "lateralDeltoid"], try: "Lateral raise" },
  posteriorDeltoid:     { label: "Rear Shoulder",  group: "shoulders",  where: "back of the shoulder",               try: "Face pull" },
  pectoralisMajor:      { label: "Chest",          group: "chest",      where: "the chest",                          heads: ["pecClavicular", "pecSternal"], try: "Bench press" },
  trapezius:            { label: "Upper Back",     group: "traps",      where: "neck down to mid back",              heads: ["upperTraps", "midTraps", "lowerTraps"], try: "Shrug" },
  sternocleidomastoid:  { label: "Neck",           group: "traps",      where: "front of the neck",                  try: "Neck flexion" },
  latissimusDorsi:      { label: "Middle Back",    group: "lats",       where: "the wide back muscle",               try: "Lat pulldown" },
  teresMajor:           { label: "Middle Back",    group: "lats",       where: "just behind the armpit",             try: "Row" },
  erectorSpinae:        { label: "Lower Back",     group: "lowerback",  where: "either side of the spine",           try: "Back extension" },
  biceps:               { label: "Bicep",          group: "biceps",     where: "front of the upper arm",             heads: ["bicepsLong", "bicepsShort"], try: "Curl" },
  brachialis:           { label: "Bicep",          group: "biceps",     where: "under the biceps",                   try: "Hammer curl" },
  tricepsBrachii:       { label: "Tricep",         group: "triceps",    where: "back of the upper arm",              heads: ["tricepsLong", "tricepsLateral", "tricepsMedial"], try: "Pushdown" },
  brachioradialis:      { label: "Forearm",        group: "forearms",   where: "thumb side of the forearm",          try: "Hammer curl" },
  flexorCarpiRadialis:  { label: "Forearm",        group: "forearms",   where: "inner forearm",                      try: "Wrist curl" },
  flexorCarpiUlnaris:   { label: "Forearm",        group: "forearms",   where: "inner forearm, little finger side",  try: "Wrist curl" },
  extensorCarpiUlnaris: { label: "Forearm",        group: "forearms",   where: "outer forearm",                      try: "Reverse wrist curl" },
  rectusAbdominis:      { label: "Abs",            group: "abs",        where: "the six pack",                       heads: ["upperAbs", "lowerAbs"], try: "Crunch" },
  externalObliques:     { label: "Obliques",       group: "obliques",   where: "sides of the waist",                 try: "Russian twist" },
  gluteusMaximus:       { label: "Glutes",         group: "glutes",     where: "the main glute",                     try: "Hip thrust" },
  gluteusMedius:        { label: "Hip",            group: "glutes",     where: "upper outer hip",                    try: "Hip abduction" },
  rectusFemoris:        { label: "Quad",           group: "quads",      where: "centre of the thigh",                try: "Leg extension" },
  vastusLateralis:      { label: "Quad",           group: "quads",      where: "outer thigh",                        try: "Squat" },
  vastusMedialis:       { label: "Quad",           group: "quads",      where: "inner thigh, above the knee",        try: "Leg extension" },
  sartorius:            { label: "Thigh",          group: "quads",      where: "runs diagonally across the thigh",   try: "Lunge" },
  adductorMagnus:       { label: "Inner Thigh",    group: "quads",      where: "inner thigh",                        try: "Squat" },
  bicepsFemoris:        { label: "Hamstring",      group: "hamstrings", where: "outer hamstring",                    try: "Leg curl" },
  semitendinosus:       { label: "Hamstring",      group: "hamstrings", where: "inner hamstring",                    try: "Romanian deadlift" },
  gastrocnemius:        { label: "Calf",           group: "calves",     where: "the visible calf",                   try: "Standing calf raise" },
  soleus:               { label: "Calf",           group: "calves",     where: "deep under the calf",                try: "Seated calf raise" },
  tibialisAnterior:     { label: "Shin",           group: "calves",     where: "front of the shin",                  try: "Tibialis raise" },
};

export const MUSCLE_HEADS = {
  anteriorDeltoid: { of: "deltoids",        label: "Front" },
  lateralDeltoid:  { of: "deltoids",        label: "Side" },
  pecClavicular:   { of: "pectoralisMajor", label: "Upper chest" },
  pecSternal:      { of: "pectoralisMajor", label: "Mid and lower chest" },
  upperTraps:      { of: "trapezius",       label: "Upper" },
  midTraps:        { of: "trapezius",       label: "Middle" },
  lowerTraps:      { of: "trapezius",       label: "Lower" },
  bicepsLong:      { of: "biceps",          label: "Outer" },
  bicepsShort:     { of: "biceps",          label: "Inner" },
  tricepsLong:     { of: "tricepsBrachii",  label: "Back" },
  tricepsLateral:  { of: "tricepsBrachii",  label: "Outer" },
  tricepsMedial:   { of: "tricepsBrachii",  label: "Inner" },
  upperAbs:        { of: "rectusAbdominis", label: "Upper abs" },
  lowerAbs:        { of: "rectusAbdominis", label: "Lower abs" },
};

export const PIECES_BY_GROUP = {};
for (const [key, p] of Object.entries(MUSCLE_PIECES)) (PIECES_BY_GROUP[p.group] ??= []).push(key);

const TRI_ALL = { tricepsBrachii: S, tricepsLong: S, tricepsLateral: S, tricepsMedial: S };
const GRIP = { flexorCarpiUlnaris: S, flexorCarpiRadialis: S, brachioradialis: S };

// Same shape and ordering discipline as MUSCLE_RULES in index.html: first match wins,
// specific phrases above broad ones. Keep the two lists in step when adding keywords.
export const DETAIL_RULES = [
  { match: ["hip thrust", "glute bridge"], hits: { gluteusMaximus: P, bicepsFemoris: S, semitendinosus: S } },
  { match: ["romanian deadlift", "rdl", "stiff leg"], hits: { bicepsFemoris: P, semitendinosus: P, gluteusMaximus: S, erectorSpinae: S } },
  { match: ["deadlift"], hits: { bicepsFemoris: P, semitendinosus: P, gluteusMaximus: P, erectorSpinae: P, trapezius: S, upperTraps: S, latissimusDorsi: S, ...GRIP } },
  { match: ["back extension", "hyperextension", "good morning"], hits: { erectorSpinae: P, bicepsFemoris: S, semitendinosus: S, gluteusMaximus: S } },
  { match: ["lunge", "step up", "step-up", "bulgarian", "split squat"], hits: { rectusFemoris: P, vastusLateralis: P, vastusMedialis: P, sartorius: S, gluteusMaximus: S, gluteusMedius: S, bicepsFemoris: S, semitendinosus: S } },
  { match: ["squat", "leg press"], hits: { rectusFemoris: P, vastusLateralis: P, vastusMedialis: P, adductorMagnus: P, gluteusMaximus: S, bicepsFemoris: S, semitendinosus: S } },
  { match: ["leg extension"], hits: { rectusFemoris: P, vastusLateralis: P, vastusMedialis: P } },
  { match: ["leg curl", "hamstring curl", "nordic"], hits: { bicepsFemoris: P, semitendinosus: P } },
  { match: ["seated calf"], hits: { soleus: P } },
  { match: ["calf"], hits: { gastrocnemius: P, soleus: P } },
  { match: ["tibialis", "toe raise"], hits: { tibialisAnterior: P } },
  { match: ["lat pulldown", "pulldown", "pull-up", "pullup", "chin-up", "chinup"], hits: { latissimusDorsi: P, teresMajor: P, biceps: S, bicepsLong: S, bicepsShort: S, brachialis: S, brachioradialis: S, flexorCarpiUlnaris: S } },
  { match: ["upright row"], hits: { deltoids: P, lateralDeltoid: P, trapezius: P, upperTraps: P, biceps: S, brachialis: S } },
  { match: ["row"], hits: { latissimusDorsi: P, teresMajor: P, biceps: S, brachialis: S, trapezius: S, midTraps: S, posteriorDeltoid: S } },
  { match: ["shrug"], hits: { trapezius: P, upperTraps: P, flexorCarpiUlnaris: S, flexorCarpiRadialis: S } },
  { match: ["face pull", "rear delt", "reverse fly", "reverse flye"], hits: { posteriorDeltoid: P, trapezius: S, midTraps: S } },
  { match: ["lateral raise", "side raise"], hits: { deltoids: P, lateralDeltoid: P, trapezius: S, upperTraps: S } },
  { match: ["front raise"], hits: { deltoids: P, anteriorDeltoid: P } },
  { match: ["arnold", "overhead press", "military press", "ohp", "shoulder press", "push press"], hits: { deltoids: P, anteriorDeltoid: P, lateralDeltoid: P, ...TRI_ALL, trapezius: S, upperTraps: S } },
  { match: ["reverse wrist", "wrist extension"], hits: { extensorCarpiUlnaris: P, brachioradialis: S } },
  { match: ["wrist"], hits: { flexorCarpiRadialis: P, flexorCarpiUlnaris: P } },
  { match: ["forearm", "farmer", "grip"], hits: { brachioradialis: P, flexorCarpiRadialis: P, flexorCarpiUlnaris: P, extensorCarpiUlnaris: P } },
  { match: ["hammer curl", "reverse curl"], hits: { brachialis: P, biceps: P, bicepsLong: P, brachioradialis: S } },
  { match: ["preacher", "concentration", "spider curl"], hits: { biceps: P, bicepsShort: P, bicepsLong: S, brachialis: P, brachioradialis: S } },
  { match: ["incline curl"], hits: { biceps: P, bicepsLong: P, bicepsShort: S, brachialis: S } },
  { match: ["bicep", "curl"], hits: { biceps: P, bicepsLong: P, bicepsShort: P, brachialis: P, brachioradialis: S } },
  { match: ["close grip", "close-grip"], hits: { tricepsBrachii: P, tricepsLong: P, tricepsLateral: P, tricepsMedial: P, pectoralisMajor: S, pecSternal: S, deltoids: S, anteriorDeltoid: S } },
  { match: ["decline"], hits: { pectoralisMajor: P, pecSternal: P, ...TRI_ALL, deltoids: S, anteriorDeltoid: S } },
  { match: ["incline"], hits: { pectoralisMajor: P, pecClavicular: P, pecSternal: S, deltoids: P, anteriorDeltoid: P, ...TRI_ALL } },
  { match: ["dip"], hits: { pectoralisMajor: P, pecSternal: P, ...TRI_ALL, deltoids: S, anteriorDeltoid: S } },
  { match: ["fly", "flye", "pec deck", "crossover"], hits: { pectoralisMajor: P, pecSternal: P, pecClavicular: S, deltoids: S, anteriorDeltoid: S } },
  { match: ["bench", "chest press", "push-up", "pushup", "push up"], hits: { pectoralisMajor: P, pecSternal: P, pecClavicular: S, ...TRI_ALL, deltoids: S, anteriorDeltoid: S } },
  { match: ["overhead extension", "skull crusher", "french press", "overhead tricep"], hits: { tricepsBrachii: P, tricepsLong: P, tricepsLateral: P, tricepsMedial: P } },
  { match: ["tricep", "pushdown", "kickback"], hits: { tricepsBrachii: P, tricepsLateral: P, tricepsMedial: P, tricepsLong: S } },
  { match: ["swing", "clean", "snatch", "thruster"], hits: { gluteusMaximus: P, bicepsFemoris: P, semitendinosus: P, deltoids: S, anteriorDeltoid: S, lateralDeltoid: S, erectorSpinae: S, trapezius: S, upperTraps: S } },
  { match: ["russian twist", "side bend", "oblique", "woodchop", "wood chop", "side plank"], hits: { externalObliques: P, rectusAbdominis: S, upperAbs: S, lowerAbs: S } },
  { match: ["leg raise", "hanging", "reverse crunch", "hollow", "knee raise", "toes to bar"], hits: { rectusAbdominis: P, lowerAbs: P, upperAbs: S, externalObliques: S } },
  { match: ["plank", "dead bug", "ab wheel", "rollout"], hits: { rectusAbdominis: P, upperAbs: P, lowerAbs: P, externalObliques: S } },
  { match: ["crunch", "sit-up", "situp", "sit up", "ab ", "abs", "core"], hits: { rectusAbdominis: P, upperAbs: P, lowerAbs: S, externalObliques: S } },
  { match: ["abduction", "abductor", "clamshell", "band walk", "monster walk", "fire hydrant"], hits: { gluteusMedius: P, gluteusMaximus: S } },
  { match: ["adduction", "adductor", "copenhagen"], hits: { adductorMagnus: P } },
  { match: ["neck"], hits: { sternocleidomastoid: P, trapezius: S, upperTraps: S } },
];

export function detailRuleFor(exerciseName) {
  const n = exerciseName.toLowerCase();
  for (const rule of DETAIL_RULES) {
    if (rule.match.some((k) => n.includes(k))) return rule;
  }
  return null;
}

/**
 * Credit per piece and head for one logged exercise, as { key: weight }.
 * `groupRule` is the app's broad-group classification ({ primary, secondary }) for the
 * same exercise, used when no detail rule matches: every piece of a primary group gets
 * 1, of a secondary group 0.5, heads included. Returns null when neither knows the
 * exercise. `general` is true when the fallback was used.
 */
export function hitsForExercise(exerciseName, groupRule) {
  const rule = detailRuleFor(exerciseName);
  const hits = {};
  let general = false;
  if (rule) {
    Object.assign(hits, rule.hits);
  } else if (groupRule) {
    general = true;
    const spread = (groups, w) => (groups || []).forEach((g) => (PIECES_BY_GROUP[g] || []).forEach((k) => { hits[k] = Math.max(hits[k] || 0, w); }));
    spread(groupRule.secondary, S);
    spread(groupRule.primary, P);
  } else {
    return null;
  }
  // A rule that credits a muscle but says nothing about its heads means all of them.
  for (const [key, w] of Object.entries(hits)) {
    const heads = MUSCLE_PIECES[key]?.heads;
    if (heads && !heads.some((h) => h in hits)) heads.forEach((h) => { hits[h] = w; });
  }
  return { hits, general };
}
