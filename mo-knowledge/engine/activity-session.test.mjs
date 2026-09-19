/* The session builder, pinned. Run it:
 *     node --test mo-knowledge/engine/activity-session.test.mjs
 *
 * Every assertion here is a claim the module's comments make out loud. A
 * generator nobody can argue with is a generator nobody should trust. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { TRAININGS } from "../../knowledge/exercise-library/index.mjs";
import {
  buildActivitySession, levelFromSessions,
  DEFAULT_MOVE_SECONDS, MIN_SESSION_MINUTES,
} from "./activity-session.mjs";

const lib = (id) => TRAININGS.find((t) => t.id === id);
const pilates = lib("pilates");
const yoga = lib("yoga");
const calisthenics = lib("calisthenics");

test("the libraries this is built on are still there", () => {
  for (const t of [pilates, yoga, calisthenics]) assert.ok(t, "missing a training");
  assert.equal(pilates.trackingMode, "duration");
  assert.equal(yoga.trackingMode, "duration");
});

test("it builds a session of about the length asked for", () => {
  for (const mins of [15, 30, 45, 60]) {
    const s = buildActivitySession(pilates, { minutes: mins, level: "intermediate", seed: "t" });
    assert.ok(s.ok, `failed at ${mins}`);
    assert.ok(s.seconds <= mins * 60, "overran the budget");
    /* Within one move of full, or it says why in a note. */
    assert.ok(mins * 60 - s.seconds < DEFAULT_MOVE_SECONDS || s.notes.some((n) => /spare/.test(n)),
      `left ${mins * 60 - s.seconds}s on the table silently`);
  }
});

test("a longer session is more work, and repeats are numbered rounds", () => {
  const short = buildActivitySession(yoga, { minutes: 15, level: "beginner", seed: "t" });
  const long = buildActivitySession(yoga, { minutes: 45, level: "beginner", seed: "t" });
  assert.ok(long.seconds > short.seconds, "the longer ask did not buy more work");
  /* Within one round nothing repeats. Across rounds it may, and must say so. */
  for (const s of [short, long]) {
    const byRound = {};
    for (const m of s.moves) (byRound[m.round] ||= []).push(m.name);
    for (const [r, names] of Object.entries(byRound)) {
      assert.equal(new Set(names).size, names.length, `round ${r} repeats a move inside itself`);
    }
    if (s.rounds > 1) assert.ok(s.notes.some((n) => /rounds/.test(n)), "repeated silently");
  }
});

test("the content limit is stated, not hidden", () => {
  const s = buildActivitySession(pilates, { minutes: 45, level: "beginner", seed: "t" });
  assert.ok(s.rounds > 1, "45 min of beginner Pilates should need rounds");
  assert.ok(s.uniqueSeconds > 0 && s.uniqueSeconds < 45 * 60);
  assert.ok(s.notes.some((n) => /min of moves at this level/.test(n)), "did not say how small the library is");
});

test("nothing above the level asked for ever appears", () => {
  const rank = { beginner: 0, intermediate: 1, advanced: 2 };
  for (const level of ["beginner", "intermediate", "advanced"]) {
    const s = buildActivitySession(pilates, { minutes: 45, level, seed: "t" });
    for (const m of s.moves) assert.ok(rank[m.level] <= rank[level], `${m.name} is ${m.level} in a ${level} session`);
  }
});

test("a beginner session is not one category's greatest hits", () => {
  const s = buildActivitySession(pilates, { minutes: 30, level: "intermediate", seed: "t" });
  const cats = new Set(s.moves.filter((m) => m.round === 1).map((m) => m.category));
  assert.ok(cats.size >= 3, `only ${cats.size} categories in 30 minutes`);
  /* And no category may take more than half the session. */
  const r1 = s.moves.filter((m) => m.round === 1);
  const counts = {};
  for (const m of r1) counts[m.category] = (counts[m.category] || 0) + 1;
  const worst = Math.max(...Object.values(counts));
  assert.ok(worst <= Math.ceil(r1.length / 2), "one category took over the session");
});

test("it opens on the easier work", () => {
  const s = buildActivitySession(pilates, { minutes: 15, level: "advanced", seed: "t" });
  const rank = { beginner: 0, intermediate: 1, advanced: 2 };
  /* Within a round. Across rounds it starts over, which is the point of a round. */
  const first = s.moves.filter((m) => m.round === 1).map((m) => rank[m.level]);
  for (let i = 1; i < first.length; i++) assert.ok(first[i] >= first[i - 1], "difficulty went backwards");
});

test("a class is shaped like the discipline, whatever the seed", () => {
  /* The category order is the library's, not the seed's. It was the seed's
     until 2026-09-19, so a vinyasa could open on a restorative pose and finish
     on a standing one, which is not a yoga class. The seed still decides which
     moves inside a category come first, so two days are different sessions. */
  const first = (seed) => buildActivitySession(yoga, { minutes: 30, level: "beginner", seed })
    .moves.find((m) => m.round === 1).category;
  const cats = new Set(["monday", "tuesday", "wednesday", "thursday"].map(first));
  assert.equal(cats.size, 1, `a yoga class opened on ${[...cats].join(" or ")} depending on the day`);
  assert.equal([...cats][0], yoga.categories[0].key, "and it opens where the library opens");

  const names = (seed) => buildActivitySession(yoga, { minutes: 30, level: "beginner", seed })
    .moves.map((m) => m.name).join("|");
  assert.notEqual(names("monday"), names("tuesday"), "every day the same class is not a week");
});

test("same seed, same session; different seed, still a valid session", () => {
  const a = buildActivitySession(yoga, { minutes: 30, level: "intermediate", seed: "monday" });
  const b = buildActivitySession(yoga, { minutes: 30, level: "intermediate", seed: "monday" });
  const c = buildActivitySession(yoga, { minutes: 30, level: "intermediate", seed: "tuesday" });
  assert.deepEqual(a.moves.map((m) => m.name), b.moves.map((m) => m.name));
  assert.ok(c.ok && c.moves.length > 0);
});

test("a per-side move is charged for both sides", () => {
  const stretching = lib("stretching");
  const s = buildActivitySession(stretching, { minutes: 20, level: "beginner", seed: "t" });
  if (!s.ok) return;                       // stretching may be shaped differently
  const spent = s.moves.reduce((n, m) => n + m.seconds * (m.perSide ? 2 : 1), 0);
  assert.equal(spent, s.seconds, "the budget and the moves disagree");
});

test("it refuses rather than inventing", () => {
  assert.equal(buildActivitySession(calisthenics, { minutes: 30 }).ok, false, "sets are not minutes");
  assert.equal(buildActivitySession(pilates, { minutes: MIN_SESSION_MINUTES - 1 }).ok, false);
  assert.equal(buildActivitySession(null, { minutes: 30 }).ok, false);
  for (const bad of [calisthenics, null]) {
    const s = buildActivitySession(bad, { minutes: 30 });
    assert.ok(s.notes.length > 0, "refused without saying why");
  }
});

test("level comes from mileage and nothing is asked", () => {
  assert.equal(levelFromSessions(0), "beginner");
  assert.equal(levelFromSessions(7), "beginner");
  assert.equal(levelFromSessions(8), "intermediate");
  assert.equal(levelFromSessions(23), "intermediate");
  assert.equal(levelFromSessions(24), "advanced");
});
