/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/activity-session.mjs. Do not edit here. */
/* A real session for the trainings that have a move library but no generator.
 *
 * Yoga, Pilates and Stretching all ship a full library in
 * knowledge/exercise-library, with categories, levels and muscles, and until now
 * nothing built a session out of any of them. plan.mjs generates weight training
 * and only weight training; mobility.mjs reaches into Stretching for a warm-up
 * and a cool-down and stops there. So somebody who trains Pilates got a stopwatch
 * and a library they could not reach, which is the thing Mo asked to fix: "we
 * already have workouts and stuff like that implemented, so we should be able to
 * do that."
 *
 * WHAT THIS IS NOT. It does not program a progression, it does not read logs and
 * it does not adapt week to week. plan.mjs does all three for lifting and doing
 * it here would mean claiming a model of Pilates adaptation that nothing in
 * ../research/ supports. This builds ONE session, on request, of the length that
 * was asked for, at a level the person has earned. Everything it knows comes off
 * the library and the arguments.
 *
 * THE ORDERING ARGUMENT. A session is not a shuffled list. Two rules, both from
 * how these are actually taught:
 *
 *   Spread across categories before going deep in one. Eight core moves in a row
 *   is not a Pilates class, it is an abs burnout, and the library's own category
 *   split is the best statement available of what a balanced session covers.
 *
 *   Easier before harder within what was picked. Every one of these libraries
 *   orders its categories roughly the way the discipline does, and the classical
 *   mat order is explicit about it: the beginner moves build the control the
 *   later ones assume. So the session opens on what it opens on for a reason.
 *
 * DETERMINISM. Same person, same day, same request, same session. The rest of
 * this engine is pure and reproducible and a generator that reshuffles on every
 * render cannot be reviewed, argued with, or tested. The seed is the caller's.
 */

/* Duration trainings are taught in held or flowing pieces of roughly this size.
 * Forty five seconds is the middle of what a mat class gives a move and what a
 * vinyasa holds a pose, and it is short enough that a thirty minute session is
 * a real list rather than six items. A move done on both sides gets both. */
export const DEFAULT_MOVE_SECONDS = 45;
export const PER_SIDE_MULTIPLIER = 2;

/* Below this there is no session worth building, only a stretch. Asking for
 * four minutes of Pilates should say so rather than hand back one move. */
export const MIN_SESSION_MINUTES = 5;

const LEVELS = ["beginner", "intermediate", "advanced"];

/* A small deterministic PRNG so the same seed gives the same session. Not for
 * anything that needs to be unguessable; it is here so two renders agree. */
function rng(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed ?? "");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return () => { h ^= h << 13; h >>>= 0; h ^= h >> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
}

function levelRank(level) {
  const i = LEVELS.indexOf(String(level || "beginner").toLowerCase());
  return i < 0 ? 0 : i;
}

/* Everything at or below the level asked for. A beginner is not shown a Teaser;
 * an advanced practitioner still gets the basics, because they are the session's
 * opening and leaving them out would build a class with no beginning. */
function movesAtOrBelow(training, level) {
  const cap = levelRank(level);
  const out = [];
  for (const cat of training.categories || []) {
    for (const ex of cat.exercises || []) {
      if (levelRank(ex.level) > cap) continue;
      out.push({
        name: ex.name,
        category: cat.key,
        categoryLabel: cat.label,
        level: String(ex.level || "beginner").toLowerCase(),
        primary: ex.primary || [],
        secondary: ex.secondary || [],
        seconds: Number(ex.seconds) > 0 ? Number(ex.seconds) : DEFAULT_MOVE_SECONDS,
        perSide: !!ex.perSide,
        cue: ex.cue || null,
      });
    }
  }
  return out;
}

function moveCost(m) {
  return m.seconds * (m.perSide ? PER_SIDE_MULTIPLIER : 1);
}

/* Round robin across categories, easiest first inside each, for the whole pool.
 * Taking one from each category before a second from any is what keeps a session
 * from becoming a category's greatest hits. */
function buildSequence(pool, rand) {
  const byCat = new Map();
  for (const m of pool) {
    if (!byCat.has(m.category)) byCat.set(m.category, []);
    byCat.get(m.category).push(m);
  }
  for (const list of byCat.values()) {
    list.forEach((m) => { m._r = rand(); });
    list.sort((a, b) => levelRank(a.level) - levelRank(b.level) || a._r - b._r);
  }
  /* The library's own category order, which is the order the discipline
     teaches in: yoga runs standing, balance, core, backbends, hip openers,
     restorative, and the classical mat order is the Pilates one. This used to
     be shuffled by the seed, which contradicted the rule written at the top of
     this file and showed: a thirty minute vinyasa opened on Legs-Up-the-Wall
     Pose and buried Savasana in the middle of it. The seed still decides WHICH
     moves come first inside a category, so two days are different classes; it
     no longer decides what a class is shaped like. */
  const order = [...byCat.keys()];

  const seq = [];
  let added = true;
  while (added) {
    added = false;
    for (const c of order) {
      const list = byCat.get(c);
      if (!list.length) continue;
      seq.push(list.shift());
      added = true;
    }
  }
  /* The sequence as a whole runs easiest to hardest, which is the second rule.
     Ties keep the round robin order, so the categories stay interleaved. */
  seq.forEach((m, i) => { m._i = i; });
  seq.sort((a, b) => levelRank(a.level) - levelRank(b.level) || a._i - b._i);
  seq.forEach((m) => { delete m._r; delete m._i; });
  return seq;
}

/* Fill the time by running the sequence, and again if there is time left.
 *
 * THIS IS THE CONTENT LIMIT, AND IT IS REAL. Measured against the libraries as
 * they ship: Pilates holds about eight minutes of unique beginner work and
 * seventeen even at advanced; Yoga fourteen and twenty eight. So a thirty minute
 * session CANNOT be thirty minutes of different moves, and pretending otherwise
 * would mean either refusing every normal request or silently handing back a
 * third of what was asked for.
 *
 * Repeating is the honest answer here, and unlike in a lifting plan it is also
 * the correct one: a mat class runs its sequence more than once and a vinyasa is
 * a flow you repeat by definition. The round is NUMBERED so nobody has to work
 * out why a move came around again, and the note says out loud how much unique
 * work there was. A partial final round is allowed, because stopping a class
 * halfway through a sequence at the bell is also what happens. */
function fillRounds(seq, budgetSeconds) {
  const out = [];
  let spent = 0;
  let round = 1;
  while (spent < budgetSeconds) {
    let addedThisRound = false;
    for (const m of seq) {
      const cost = moveCost(m);
      if (spent + cost > budgetSeconds) continue;
      out.push({ ...m, round });
      spent += cost;
      addedThisRound = true;
    }
    if (!addedThisRound) break;      // nothing left short enough to fit
    round++;
  }
  return { moves: out, seconds: spent, rounds: out.length ? out[out.length - 1].round : 0 };
}

/* How hard a session to build for somebody, from how many of these they have
 * actually done. Deliberately blunt and deliberately slow: there is no test for
 * Pilates ability in this app, so the only honest input is mileage, and the
 * thresholds are stated rather than tuned. Nothing here asks the person. */
export function levelFromSessions(count = 0) {
  const n = Number(count) || 0;
  if (n >= 24) return "advanced";
  if (n >= 8) return "intermediate";
  return "beginner";
}

/* The session. `training` is a library object out of TRAININGS. */
export function buildActivitySession(training, {
  minutes = 30,
  level = "beginner",
  styleKey = null,
  seed = "",
} = {}) {
  const notes = [];
  if (!training || !Array.isArray(training.categories)) {
    return { ok: false, reason: "no-library", moves: [], notes: ["That training has no move library."] };
  }
  if (training.trackingMode !== "duration") {
    /* Calisthenics is tracked in sets, so it belongs with the lifting path
       rather than here, and saying so is better than building it a timer. */
    return { ok: false, reason: "not-duration", moves: [],
      notes: [`${training.label} is counted in sets, not minutes, so it is built as a workout rather than a session.`] };
  }
  const mins = Math.max(0, Math.round(Number(minutes) || 0));
  if (mins < MIN_SESSION_MINUTES) {
    return { ok: false, reason: "too-short", moves: [],
      notes: [`Under ${MIN_SESSION_MINUTES} minutes is a stretch rather than a session.`] };
  }

  const style = (training.styles || []).find((s) => s.key === styleKey) || null;
  const pool = movesAtOrBelow(training, level);
  if (!pool.length) {
    return { ok: false, reason: "no-moves", moves: [], notes: ["Nothing in the library at that level."] };
  }

  const rand = rng(`${training.id}|${level}|${styleKey || ""}|${seed}`);
  const sequence = buildSequence(pool, rand);
  const uniqueSeconds = sequence.reduce((n, m) => n + moveCost(m), 0);
  const { moves, seconds, rounds } = fillRounds(sequence, mins * 60);

  if (!moves.length) {
    return { ok: false, reason: "no-fit", moves: [],
      notes: ["No move in the library is short enough for that."] };
  }
  /* Said out loud, both halves: that it repeats, and how much there was to
     repeat. A person who can see the library is small can judge the session. */
  if (rounds > 1) {
    notes.push(`${rounds} rounds of the same sequence. ${training.label} has about ${Math.round(uniqueSeconds / 60)} min of moves at this level, and a class repeats them.`);
  }
  /* The gap is reported rather than padded out with a move nobody chose. */
  const left = mins * 60 - seconds;
  if (left >= DEFAULT_MOVE_SECONDS) {
    notes.push(`About ${Math.round(left / 60)} min spare at the end, for whatever you want to hold longer.`);
  }
  if (style?.note) notes.push(style.note);

  return {
    ok: true,
    training: training.id,
    label: training.label,
    style,
    level,
    minutes: mins,
    seconds,
    rounds,
    uniqueSeconds,
    moves,
    notes,
  };
}
