/* VENDORED by scripts/vendor-engine.mjs from knowledge/exercise-library/cardio.mjs. Do not edit here. */
// Cardio library. Built because the mix engine has always been able to allocate
// cardio days (computeWeeklyMix has had a `cardio` modality since it was written)
// and there was nothing for those days to generate. A cardio day produced an empty
// plan, so in practice the generator quietly handed every day to weight training.
//
// WHY THIS DOES NOT LOOK LIKE THE OTHER LIBRARIES. Everywhere else an exercise is
// a shape you hold or a rep you repeat, and the unit is sets and reps. Cardio's
// unit is time at an effort. So an entry here is a SESSION, not a movement:
// "Easy Run" is thirty minutes at a conversational pace, not a thing you do eight
// of. The fields the rest of the app reads are still here and still mean the same
// thing (name, primary, secondary, equipment, level) so the heat map, the history
// and the search all keep working without knowing cardio is different.
//
// EFFORT IS PRESCRIBED BY FEEL, NOT BY HEART RATE. We do not have the user's max
// heart rate, we cannot measure it, and a zone number nobody can verify is worse
// than a sentence they can act on. So `effort` is a 1 to 10 rating of perceived
// exertion and every `cue` says what that feels like in words: able to hold a
// conversation, able to speak a sentence, cannot speak. That is the standard
// talk-test scale, it needs no hardware, and it is honest about what we know.
//
// THE MUSCLE KEYS ARE REAL, NOT DECORATIVE. They match MUSCLE_GROUPS exactly, the
// same as stretching does, so a week of running actually shows up on the heat map
// as calves and hamstrings rather than leaving the legs looking untrained. They
// are the muscles doing the work in that mode: running is posterior chain and
// calves, cycling is quads and glutes, rowing is lats and legs, swimming is lats
// and shoulders. A rower who never squats should not look like they skipped legs.
//
// `mode` is how you do it, and it is what a preference picker selects on. Someone
// who says they cycle gets the cycling entries across every session type rather
// than a single "cycling" exercise, which is what makes a preference produce a
// varied week instead of the same ride five times.
//
// `minutes` is the planned length at that level. `structure` describes intervals
// in plain words for the ones that have them, and is null for continuous work.
// `indoor` says whether it needs a machine or can be done outside, which is the
// difference between a plan somebody follows in February and one they do not.

export const CARDIO = {
  id: "cardio",
  label: "Cardio",
  /* No per-exercise animation, and the motion validator reads this flag rather
     than carrying a list of exceptions. Everywhere else an exercise is a shape
     the figure can hold, so a missing animation is a real gap. An Easy Run is
     twenty five minutes at an effort: there is no single pose that is it, and
     drawing one per session would give twenty seven near-identical pictures of
     a figure running. When cardio does get artwork it should be a handful of
     looping modes, a run, a ride, a row, shared across every session in that
     mode, which is a different shape of thing from the move-per-exercise rule
     this flag switches off. */
  posed: false,
  categories: [
    {
      key: "steady",
      label: "Steady / easy",
      // The bulk of anyone's cardio should live here. It is the part people skip
      // because it feels too easy, and the part that actually builds the base.
      exercises: [
        { name: "Easy Run", mode: "running", primary: ["hamstrings", "calves"], secondary: ["quads", "glutes"], equipment: "none", level: "beginner", minutes: 25, effort: 4, structure: null, indoor: false, cue: "Conversational. If you cannot speak a full sentence, slow down. Land under your hips, short quick steps." },
        { name: "Brisk Walk", mode: "walking", primary: ["calves", "hamstrings"], secondary: ["glutes", "quads"], equipment: "none", level: "beginner", minutes: 30, effort: 3, structure: null, indoor: false, cue: "Stand tall, let the arms swing. Fast enough that talking takes a little effort." },
        { name: "Easy Ride", mode: "cycling", primary: ["quads", "glutes"], secondary: ["calves", "hamstrings"], equipment: "none", level: "beginner", minutes: 40, effort: 4, structure: null, indoor: false, cue: "Spin, do not grind. Saddle high enough that your knee is almost straight at the bottom." },
        { name: "Easy Spin", mode: "cycling", primary: ["quads", "glutes"], secondary: ["calves"], equipment: "machine", level: "beginner", minutes: 30, effort: 4, structure: null, indoor: true, cue: "Light resistance, high cadence. Do not lock the elbows or lean on the bars." },
        { name: "Easy Row", mode: "rowing", primary: ["lats", "quads"], secondary: ["abs", "glutes", "biceps"], equipment: "machine", level: "beginner", minutes: 20, effort: 4, structure: null, indoor: true, cue: "Legs, then back, then arms. Reverse it coming in. That order is the whole technique." },
        { name: "Easy Swim", mode: "swimming", primary: ["lats", "shoulders"], secondary: ["abs", "triceps"], equipment: "none", level: "intermediate", minutes: 25, effort: 4, structure: null, indoor: true, cue: "Breathe out underwater. Rotate from the hips, not the neck." },
        { name: "Elliptical Steady", mode: "elliptical", primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"], equipment: "machine", level: "beginner", minutes: 25, effort: 4, structure: null, indoor: true, cue: "Stand tall. Let go of the handles now and then and let the legs do it." },
        { name: "Incline Walk", mode: "walking", primary: ["calves", "glutes"], secondary: ["hamstrings", "quads"], equipment: "machine", level: "beginner", minutes: 25, effort: 5, structure: null, indoor: true, cue: "Raise the incline, not the speed. Do not hold the rails, that is how you cheat yourself." },
      ],
    },
    {
      key: "intervals",
      label: "Intervals",
      // Hard work with real rest. The rest is not optional padding, it is what
      // lets the hard part be genuinely hard, which is the entire point.
      exercises: [
        { name: "Run Intervals", mode: "running", primary: ["hamstrings", "quads"], secondary: ["calves", "glutes"], equipment: "none", level: "intermediate", minutes: 25, effort: 8, structure: "8 rounds of 1 minute hard, 2 minutes easy", indoor: false, cue: "Hard means you cannot hold a conversation. Easy means you fully recover. Do not blur the two." },
        { name: "Bike Intervals", mode: "cycling", primary: ["quads", "glutes"], secondary: ["calves", "hamstrings"], equipment: "machine", level: "intermediate", minutes: 25, effort: 8, structure: "8 rounds of 1 minute hard, 2 minutes easy", indoor: true, cue: "Add resistance for the hard minute, do not just spin faster. Keep the hips still." },
        { name: "Row Intervals", mode: "rowing", primary: ["lats", "quads"], secondary: ["abs", "biceps", "glutes"], equipment: "machine", level: "intermediate", minutes: 20, effort: 8, structure: "6 rounds of 500 metres, 2 minutes easy between", indoor: true, cue: "Same stroke when tired as when fresh. Legs first, every single time." },
        { name: "Hill Repeats", mode: "running", primary: ["glutes", "quads"], secondary: ["calves", "hamstrings"], equipment: "none", level: "intermediate", minutes: 25, effort: 8, structure: "8 rounds of 45 seconds uphill, walk down", indoor: false, cue: "Short steps, drive the arms. Walk all the way down, the walk is the rest." },
        { name: "Sprint Intervals", mode: "running", primary: ["hamstrings", "quads"], secondary: ["calves", "glutes"], equipment: "none", level: "advanced", minutes: 20, effort: 9, structure: "10 rounds of 20 seconds flat out, 90 seconds walking", indoor: false, cue: "Warm up properly first. Flat out means flat out, and the walk means walking." },
        { name: "HIIT Circuit", mode: "hiit", primary: ["quads", "abs"], secondary: ["glutes", "shoulders", "chest"], equipment: "bodyweight", level: "intermediate", minutes: 20, effort: 8, structure: "20 seconds work, 40 seconds rest, 5 moves, 4 rounds", indoor: true, cue: "Form first, speed second. A fast bad rep is just a bad rep done quickly." },
        { name: "Stair Intervals", mode: "stairs", primary: ["quads", "glutes"], secondary: ["calves", "hamstrings"], equipment: "machine", level: "intermediate", minutes: 20, effort: 8, structure: "6 rounds of 2 minutes hard, 1 minute easy", indoor: true, cue: "Stand upright. Leaning on the rails takes the legs out of it entirely." },
        { name: "Jump Rope Intervals", mode: "jump rope", primary: ["calves"], secondary: ["shoulders", "quads", "forearms"], equipment: "band", level: "intermediate", minutes: 15, effort: 7, structure: "10 rounds of 45 seconds skipping, 30 seconds rest", indoor: true, cue: "Small jumps, barely off the floor. Turn the rope with the wrists, not the arms." },
      ],
    },
    {
      key: "tempo",
      label: "Tempo / threshold",
      // The uncomfortable middle. Harder than easy, nowhere near a sprint, held
      // for a long time. This is the one people get wrong in both directions.
      exercises: [
        { name: "Tempo Run", mode: "running", primary: ["hamstrings", "calves"], secondary: ["quads", "glutes"], equipment: "none", level: "intermediate", minutes: 30, effort: 7, structure: "10 minutes easy, 15 minutes tempo, 5 minutes easy", indoor: false, cue: "Comfortably hard. You can speak a short sentence, not a paragraph. Hold it, do not drift up." },
        { name: "Tempo Ride", mode: "cycling", primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"], equipment: "none", level: "intermediate", minutes: 40, effort: 7, structure: "10 minutes easy, 20 minutes tempo, 10 minutes easy", indoor: false, cue: "Steady pressure, steady cadence. The effort should feel the same at minute twenty as at minute one." },
        { name: "Threshold Row", mode: "rowing", primary: ["lats", "quads"], secondary: ["abs", "glutes", "biceps"], equipment: "machine", level: "advanced", minutes: 30, effort: 7, structure: "4 rounds of 5 minutes, 90 seconds easy between", indoor: true, cue: "Pick a pace you could hold for twenty minutes, then hold exactly that." },
        { name: "Progression Run", mode: "running", primary: ["hamstrings", "calves"], secondary: ["quads", "glutes"], equipment: "none", level: "intermediate", minutes: 35, effort: 6, structure: "Start easy, finish at tempo, one notch faster every ten minutes", indoor: false, cue: "Start slower than feels right. The last ten minutes should be the fastest, not the first." },
      ],
    },
    {
      key: "long",
      label: "Long / endurance",
      // One a week at most, and always slower than people want to run it.
      exercises: [
        { name: "Long Run", mode: "running", primary: ["hamstrings", "calves"], secondary: ["quads", "glutes"], equipment: "none", level: "intermediate", minutes: 60, effort: 4, structure: null, indoor: false, cue: "Slower than you think. If the last ten minutes fall apart, you started too fast." },
        { name: "Long Ride", mode: "cycling", primary: ["quads", "glutes"], secondary: ["calves", "hamstrings"], equipment: "none", level: "intermediate", minutes: 90, effort: 4, structure: null, indoor: false, cue: "Eat and drink before you think you need to. Spin the hills, do not attack them." },
        { name: "Hike", mode: "hiking", primary: ["glutes", "quads"], secondary: ["calves", "hamstrings"], equipment: "none", level: "beginner", minutes: 75, effort: 4, structure: null, indoor: false, cue: "Short steps uphill, small steps downhill, let the legs take the brake rather than the knees." },
        { name: "Long Walk", mode: "walking", primary: ["calves", "hamstrings"], secondary: ["glutes", "quads"], equipment: "none", level: "beginner", minutes: 60, effort: 3, structure: null, indoor: false, cue: "It counts. It genuinely counts. Comfortable shoes and keep going." },
      ],
    },
    {
      key: "recovery",
      label: "Recovery",
      // Deliberately easy, short, and on the list so that "do nothing" is not the
      // only option on a tired day. A recovery session done is worth more than a
      // hard session skipped.
      exercises: [
        { name: "Recovery Walk", mode: "walking", primary: ["calves"], secondary: ["hamstrings", "glutes"], equipment: "none", level: "beginner", minutes: 20, effort: 2, structure: null, indoor: false, cue: "Easy the whole way. This is for blood flow, not fitness. Nothing to prove." },
        { name: "Recovery Spin", mode: "cycling", primary: ["quads"], secondary: ["glutes", "calves"], equipment: "machine", level: "beginner", minutes: 20, effort: 2, structure: null, indoor: true, cue: "Almost no resistance, legs turning over. If it feels like training, ease off." },
        { name: "Easy Elliptical", mode: "elliptical", primary: ["quads"], secondary: ["glutes", "hamstrings"], equipment: "machine", level: "beginner", minutes: 20, effort: 3, structure: null, indoor: true, cue: "Low effort, smooth rhythm, breathe through your nose if you can." },
      ],
    },
  ],
};

// Every mode in the library, which is the vocabulary a preference picker chooses
// from. Derived rather than written out twice, so adding a session in a new mode
// makes that mode selectable without a second edit.
export const CARDIO_MODES = [...new Set(CARDIO.categories.flatMap((c) => c.exercises.map((e) => e.mode)))].sort();

// Sessions in the modes somebody said they like, at or below their level. Falls
// back to everything rather than returning nothing, because a picker that filters
// a plan down to zero sessions is worse than one that ignores the preference.
export function cardioFor({ modes = [], level = "beginner", indoorOnly = false } = {}) {
  const rank = { beginner: 0, intermediate: 1, advanced: 2 };
  const all = CARDIO.categories.flatMap((c) => c.exercises.map((e) => ({ ...e, categoryKey: c.key })));
  const ok = all.filter((e) => (rank[e.level] ?? 0) <= (rank[level] ?? 0) && (!indoorOnly || e.indoor));
  if (!modes.length) return ok.length ? ok : all;
  const picked = ok.filter((e) => modes.includes(e.mode));
  return picked.length ? picked : (ok.length ? ok : all);
}
