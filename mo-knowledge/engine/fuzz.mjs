/* The fuzzer. `sweep.mjs` walks a tidy grid of inputs a real person can
 * produce and asks whether the plan is any good. This asks the opposite
 * question: given an input NOBODY planned for, does the engine still hand the
 * app something it can render, and does it hand back the SAME thing twice.
 *
 * Run it:  node mo-knowledge/engine/fuzz.mjs
 *          node mo-knowledge/engine/fuzz.mjs --runs=40000
 *          node mo-knowledge/engine/fuzz.mjs --case=812345      (one seed, printed)
 * Exit 1 on any FAIL.
 *
 * Why a fuzzer next to a sweep. The sweep crosses axes that are all valid: a
 * goal, a day count, a history length. Everything it sends is a value the
 * client could legitimately produce, so it can measure plan quality and it can
 * never find a crash that comes from a field being the wrong SHAPE. The edge
 * function's own `boundPayload` caps text length, caps row counts and drops
 * out-of-range numbers, and after all that it still hands the engine a `limits`
 * it never looked inside, a `goal_secondary` it never looked inside, and 2000
 * log rows whose every field is whatever the caller typed. That is the surface
 * this file covers.
 *
 * Two channels, because "can this crash" and "can a USER make this crash" are
 * different questions and only the second one is a bug worth waking up for:
 *
 *   raw   the payload goes straight into generateFromPayload, which is what
 *         engine-lab.html and the sandbox do.
 *   edge  the payload goes through a replica of the edge function's
 *         boundPayload first, which is the most a hostile HTTP client can
 *         reach. A failure here is reachable over the wire.
 *
 * Every case is generated from ONE integer seed and nothing else, so any
 * failure reproduces with --case=<seed> and prints the exact payload.
 *
 * Node only, same exemption test.mjs and sweep.mjs have. Never vendored.
 */
import { TRAININGS } from "../../knowledge/exercise-library/index.mjs";
import { generateFromPayload } from "./adapter.mjs";
import { MUSCLE_GROUPS } from "./focus.mjs";
import { BODY_AREAS, EQUIPMENT_OPTIONS } from "./limits.mjs";
import { STYLE_KEYS } from "./styles.mjs";
import { readFileSync } from "node:fs";
import { clientGoals } from "./client-goals.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/* One fixed clock, for the same reason sweep.mjs pins one: two of the things
   checked here are answers about hours, and a run that read the wall clock
   would give a different verdict at 17:00 than at 19:00 and could not be
   reproduced from the seed it printed. Local noon, because recovery.mjs reads
   an undated entry_date as local 18:00 and the two have to agree. */
const TODAY = new Date(2026, 8, 10, 12, 0, 0);
const DAY_MS = 86400000;
const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ *
 * Seeded randomness
 * ------------------------------------------------------------------ */

/* mulberry32. Thirty-two bits of state, no dependencies, and the same seed
   gives the same stream on every Node build, which is the only property that
   matters here: a printed seed has to rebuild a byte-identical payload a week
   later on somebody else's machine. */
function rngFrom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => Math.floor(next() * n);
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}

/* ------------------------------------------------------------------ *
 * The junk pools
 * ------------------------------------------------------------------ */

/* Everything a JSON body can carry that is not what the field is for. Held in
   one list on purpose: the interesting failures come from a wrong value in a
   field nobody expected to be wrong, not from a clever value in the field
   somebody was thinking about, so every field draws from the same pool. */
const LONG = "x".repeat(4096);
const UNICODE = "\u{1F3CB}‍♀️ مرحبا \u{1D54F} ́́́";
const DEEP = { a: { b: { c: { d: { e: { f: [1, [2, [3, [4]]]] } } } } } };

const JUNK = [
  null, undefined, NaN, Infinity, -Infinity,
  0, -0, -1, -99999, 1e308, 3.5, 1e-9, 2147483648, Number.MAX_SAFE_INTEGER,
  "", " ", "\t\n", "0", "3", "-1", "NaN", "Infinity", "null", "undefined",
  "abc", "true", UNICODE, LONG,
  true, false,
  [], {}, [[]], [null], [undefined], [NaN], ["", ""], DEEP, [DEEP],
  { length: 3 }, { 0: "a", 1: "b" },
];

const junk = (r) => JUNK[r.int(JUNK.length)];

/* A number field's interesting values: the boundaries the edge function names
   (age 10..120, height 20..108, weight 40..1500, days 0..14) taken one either
   side, because off-by-one at a range edge is the classic. */
const around = (lo, hi) => [lo - 1, lo, lo + 1, hi - 1, hi, hi + 1];

/* ------------------------------------------------------------------ *
 * The realistic pools, for the "a real person could send this" channel
 * ------------------------------------------------------------------ */

const TREE = JSON.parse(readFileSync(join(here, "../goals/goal-tree.json"), "utf8"));
/* The research tree AND the picker, merged on the bubble id, 2026-09-15. The
   tree alone is what live profiles from before the picker rewrite carry; the
   picker is what every profile written since carries, and it offers two goals
   (`build-endurance`, `move-better`) that are in no bubble of the tree. While
   this pool was the tree alone the fuzzer generated a million payloads without
   ever sending either, which is how both shipped resolving to the habit plan.
   See client-goals.mjs. */
const CLIENT_TILES = clientGoals();
const BUBBLES = (() => {
  const byId = new Map();
  for (const b of TREE.bubbles || []) byId.set(b.id, { id: b.id, children: (b.children || []).map((c) => c.id) });
  for (const t of CLIENT_TILES) {
    const have = byId.get(t.id) || { id: t.id, children: [] };
    for (const kid of t.kids) if (!have.children.includes(kid)) have.children.push(kid);
    byId.set(t.id, have);
  }
  return [...byId.values()];
})();
const BUBBLE_IDS = BUBBLES.map((b) => b.id);
const ALL_CHILDREN = [...new Set(BUBBLES.flatMap((b) => b.children))];
const LEGACY_GOALS = [
  "Lose weight", "Build muscle", "Get stronger",
  "Recomp (lose fat, gain muscle)", "Stay consistent",
];
const JOINT_KEYS = BODY_AREAS.map((a) => a.key);
const EQUIP_KEYS = EQUIPMENT_OPTIONS.map((o) => o.key);
const DAY_NAMES = ["Push day", "Pull day", "Leg day", "Upper body", "Lower body", "Full body"];

/* Real library names, because a log of "Exercise 4" is invisible to both
   things that read logs (training-age groups by name, recovery looks the name
   up in the library's muscle tags), so a fuzz run on fake names would be
   fuzzing the no-history path over and over. The near-miss variants below are
   the point of including the real ones. */
const LIB_NAMES = [];
const LIB_NAME_SET = new Set();
for (const t of TRAININGS) {
  for (const cat of t.categories || []) {
    for (const ex of cat.exercises || []) {
      const n = String(ex.name || "").trim();
      if (!n) continue;
      LIB_NAMES.push(n);
      LIB_NAME_SET.add(n.toLowerCase());
    }
  }
}

/* Names that are ALMOST a library name. Case, whitespace and punctuation are
   the three ways a real row gets written differently from the library (an old
   client, a hand-typed custom exercise, a copy-paste with a non-breaking
   space), and each one decides whether a log contributes to the level, the
   loads and the recovery read, or contributes nothing at all. */
function nearMissName(r) {
  const base = r.pick(LIB_NAMES);
  switch (r.int(6)) {
    case 0: return base.toUpperCase();
    case 1: return base.toLowerCase();
    case 2: return `  ${base}  `;
    case 3: return base.replace(/ /g, " ");
    case 4: return base.replace(/-/g, " ");
    default: return `${base} (machine)`;
  }
}

/* ------------------------------------------------------------------ *
 * Field generators
 * ------------------------------------------------------------------ */

/* `realistic` decides which pool a field draws from. It is per-CASE, not per
   field, so a case is either something the client could produce or something
   only a crafted body could, and the two never blur into one unclassifiable
   failure. Inside a hostile case each field still gets a real value most of
   the time, because a payload that is junk in all twenty fields only ever
   tests the first guard it hits. */

function goalFields(r, real) {
  const out = {};
  const mode = r.int(4);
  if (mode === 0 || mode === 1) {
    const b = r.pick(BUBBLES);
    out.goal_bubble = real || r.chance(0.7) ? b.id : junk(r);
    if (r.chance(0.75)) {
      /* A child that does not belong to the bubble is explicitly contracted to
         fall back to the bubble default, so send both kinds. */
      out.goal_child = r.chance(0.7) ? (b.children.length ? r.pick(b.children) : null) : r.pick(ALL_CHILDREN);
    }
  } else if (mode === 2) {
    out.goal = real || r.chance(0.8) ? r.pick(LEGACY_GOALS) : junk(r);
    if (r.chance(0.5)) {
      out.goal_detail = r.pick([
        "I want to lose 20 lb by June",
        "get my first pull-up",
        "run a 5k in under 25 minutes",
        "bigger arms",
        "my back hurts when I sit",
        "",
        real ? "just feel better" : UNICODE,
      ]);
    }
  }
  if (!real && r.chance(0.3)) out.goal_bubble = junk(r);
  if (!real && r.chance(0.3)) out.goal_child = junk(r);
  if (!real && r.chance(0.2)) out.goal_detail = junk(r);
  if (r.chance(0.35)) out.goal_secondary = goalSecondary(r, real);
  return out;
}

function goalSecondary(r, real) {
  const entry = () => {
    const b = r.pick(BUBBLES);
    if (!real && r.chance(0.35)) return junk(r);
    return { bubble: b.id, child: b.children.length && r.chance(0.8) ? r.pick(b.children) : null };
  };
  switch (r.int(8)) {
    case 0: return [];
    case 1: return null;
    /* Twenty entries and the same goal repeated: the contract says at most two
       are honoured and the rest are named in meta.goals.ignored, which is a
       promise about a list the client can trivially make long. */
    case 2: return Array.from({ length: 20 }, entry);
    case 3: { const e = entry(); return [e, e, e]; }
    case 4: return [{ bubble: "not-a-bubble", child: "not-a-child" }];
    /* The jsonb column round trips as a string through some clients, which the
       contract says is accepted. */
    case 5: return JSON.stringify([entry()]);
    case 6: return real ? [entry()] : junk(r);
    default: return [entry(), entry()];
  }
}

function focusGroups(r, real) {
  const g = () => r.pick(MUSCLE_GROUPS);
  switch (r.int(11)) {
    case 0: return null;
    case 1: return [];
    case 2: return ["all"];
    case 3: return [`${g()}:3`, `${g()}:2`, `${g()}:1`];
    case 4: return MUSCLE_GROUPS.map((x) => `${x}:2`);           // whole body, one tier
    /* Tiers outside 1..3 and tiers that are not numbers. The tier rides inside
       the existing text[] as "<group>:<tier>", so nothing in the column type
       stops any of these from being written. */
    case 5: return real ? [`${g()}:3`] : [`${g()}:0`, `${g()}:4`, `${g()}:red`, `${g()}:3.5`, `${g()}:-1`];
    case 6: return ["deltoids", "rectusAbdominis", "gluteusMaximus"];  // piece keys from the zoomed view
    case 7: return { [g()]: 3, [g()]: 1 };                       // the jsonb shape the contract accepts
    case 8: return real ? [g(), g()] : ["not-a-muscle", "", null, 7, {}, [g()]];
    case 9: return real ? [g()] : junk(r);
    default: return [g()];
  }
}

function limitsField(r, real) {
  const mk = () => ({
    hurts: real || r.chance(0.7) ? Array.from({ length: r.int(4) }, () => r.pick(JOINT_KEYS)) : [junk(r), r.pick(JOINT_KEYS)],
    missing: real || r.chance(0.7) ? Array.from({ length: r.int(3) }, () => r.pick(EQUIP_KEYS)) : [junk(r)],
    note: real ? "left cuff, cleared to train" : r.pick([LONG, UNICODE, junk(r), ""]),
    updated_at: real ? "2026-09-09T14:03:00Z" : junk(r),
  });
  switch (r.int(9)) {
    case 0: return null;
    case 1: return {};
    case 2: return JSON.stringify(mk());          // the string a jsonb column round trips as
    case 3: return real ? mk() : "{not json";
    /* Everything hurts and nothing is owned. The sweep has this case; it is
       here too because it is the one where the library runs out of movements
       and the exercise-count floor has to hold. */
    case 4: return { hurts: JOINT_KEYS.slice(), missing: EQUIP_KEYS.slice() };
    case 5: return { hurts: ["none"], missing: ["none"] };
    case 6: return real ? mk() : { hurts: junk(r), missing: junk(r), extra_key: junk(r) };
    case 7: return real ? mk() : junk(r);
    default: return mk();
  }
}

/* Histories that are realistic in shape and awkward in content: the ones a
   real exercise_logs table grows on its own. Duplicate dates (two sessions in
   a day), dates in the future (a phone with a wrong clock, or a timezone), a
   single row, a year of numbers going down, one exercise forever. */
function logRows(r, real) {
  const kind = r.int(10);
  const n = kind === 9 ? 1200 : 1 + r.int(60);
  const rows = [];
  const name = () => (real ? r.pick(LIB_NAMES) : r.chance(0.5) ? r.pick(LIB_NAMES) : r.chance(0.6) ? nearMissName(r) : r.pick(["Thruster McThruster", "", null, 42, UNICODE]));
  const onlyOne = r.pick(LIB_NAMES);
  for (let i = 0; i < n; i++) {
    let date;
    switch (kind) {
      case 0: date = isoLocal(new Date(TODAY.getTime() - i * 2 * DAY_MS)); break;
      case 1: date = isoLocal(TODAY); break;                                        // every row the same day
      case 2: date = isoLocal(new Date(TODAY.getTime() + (i + 1) * DAY_MS)); break; // the future
      case 3: date = isoLocal(new Date(TODAY.getTime() - i * 400 * DAY_MS)); break; // years apart
      case 4: date = real ? isoLocal(new Date(TODAY.getTime() - i * DAY_MS)) : r.pick(["", "not-a-date", "2026-13-45", "0000-00-00", null, 20260910, "2026-09-10T07:00:00Z"]); break;
      default: date = isoLocal(new Date(TODAY.getTime() - i * 3 * DAY_MS));
    }
    /* kind 7 is the person whose lifts went down for a year, which is the
       input plateau-response.mjs exists for and the one that reaches the most
       code. kind 8 is zero-weight and rep extremes. */
    const weight = kind === 7 ? 300 - i * 2
      : kind === 8 ? r.pick([0, -5, 0.0001, 5000, NaN, Infinity, "135", null])
      : 95 + 5 * Math.floor(i / 6);
    rows.push({
      entry_date: date,
      exercise_name: kind === 6 ? onlyOne : name(),
      sets: kind === 8 ? r.pick([0, 1, 100, -3, NaN, "3", null]) : 3,
      reps: kind === 8 ? r.pick([1, 100, 0, -1, NaN, "8", null]) : 8,
      weight,
      ...(r.chance(0.3) ? { created_at: `${String(date).slice(0, 10)}T07:00:00Z` } : {}),
    });
  }
  if (!real && r.chance(0.25)) rows.push(junk(r));
  return rows;
}

function plansField(r, real) {
  if (r.chance(0.5)) return undefined;
  const n = 1 + r.int(8);
  return Array.from({ length: n }, (_, i) => (
    !real && r.chance(0.2) ? junk(r) : {
      entry_date: isoLocal(new Date(TODAY.getTime() - i * 2 * DAY_MS)),
      focus: r.pick(DAY_NAMES),
      exercises: r.chance(0.2) ? junk(r) : Array.from({ length: 4 }, () => ({ name: r.pick(LIB_NAMES), sets: 3, reps: 8 })),
      completed_at: r.chance(0.5) ? isoLocal(new Date(TODAY.getTime() - i * 2 * DAY_MS)) : null,
    }
  ));
}

/* The whole payload. Depends on the seed and on nothing else. */
function makePayload(seed) {
  const r = rngFrom(seed);
  const real = r.chance(0.35);
  const p = {};

  Object.assign(p, goalFields(r, real));

  if (r.chance(0.8)) p.sex = real ? r.pick(["Male", "Female"]) : r.pick(["Male", "Female", "male", "F", "", null, 1, {}, UNICODE]);
  if (r.chance(0.8)) p.current_weight = real ? 110 + r.int(160) : r.pick([...around(40, 1500), ...JUNK.slice(0, 14)]);
  if (r.chance(0.6)) p.age = real ? 18 + r.int(50) : r.pick([...around(10, 120), junk(r)]);
  if (r.chance(0.5)) p.height_in = real ? 58 + r.int(20) : r.pick([...around(20, 108), junk(r)]);
  if (r.chance(0.4)) p.activity_level = real ? r.pick(["sedentary", "light", "moderate", "very"]) : junk(r);
  /* 1/2/6/7 either side of the picker's 2..6, which the contract says is the
     range, and absurd values for the gym_days fallback under it. */
  if (r.chance(0.8)) p.challenge_target = real ? 2 + r.int(5) : r.pick([1, 2, 6, 7, 0, -3, 14, 15, 3.5, "4", NaN, Infinity, null]);
  if (r.chance(0.5)) p.gym_days_this_week = real ? r.int(8) : r.pick([-1, 0, 4, 99, 1e9, "7", NaN, null, {}]);
  /* How long they have. The engine clamps to 15..120 and says so, so the junk
     side is mostly about the two ends of that clamp and the values a column
     can carry that are not numbers at all. */
  if (r.chance(0.4)) p.session_minutes = real ? r.pick([20, 30, 45, 60, 75, 90]) : r.pick([0, -30, 1, 14, 121, 600, 1e9, 45.7, "45", "", NaN, Infinity, null, {}, []]);
  if (r.chance(0.45)) p.focus = real ? r.pick(DAY_NAMES) : r.pick([...DAY_NAMES, "Arm day", "", "push", LONG, junk(r)]);
  if (r.chance(0.6)) p.focus_groups = focusGroups(r, real);
  if (r.chance(0.4)) p.focus_chosen_at = real ? isoLocal(new Date(TODAY.getTime() - r.int(400) * DAY_MS)) : r.pick(["not-a-date", "", 0, -1, "9999-99-99", junk(r)]);
  if (r.chance(0.6)) p.limits = limitsField(r, real);
  if (r.chance(0.55)) p.logs = logRows(r, real);
  else if (r.chance(0.4)) p.history = Array.from({ length: 1 + r.int(12) }, () => ({ exercise_name: real ? r.pick(LIB_NAMES) : nearMissName(r), weight: real ? 45 + r.int(200) : r.pick([0, -20, "135", NaN, null, Infinity]) }));
  const plans = plansField(r, real);
  if (plans !== undefined) p.plans = plans;
  /* skip_stretching with a mobility goal is a real combination the contract
     names, so it gets sent against every goal rather than only against the
     ones it obviously suits. */
  if (r.chance(0.3)) p.skip_stretching = real ? r.chance(0.5) : r.pick([true, false, "true", "false", 1, 0, null, {}]);
  if (r.chance(0.15)) p.stretching = r.pick([true, false, "false", 0, null]);
  /* What they agreed to do. The realistic side deliberately includes the three
     shapes that behave differently rather than a random subset: a resistance
     style (the week nothing changes for), no resistance style at all (the week
     that comes back as a run), and a flow-only pick (the week we have to refuse
     out loud). The junk side is about normalizeStyles: a text[] column arrives
     as a CSV through some clients, and a list of nothing recognisable has to
     read as "never asked" rather than emptying somebody's plan. */
  if (r.chance(0.3)) {
    p.train_styles = real
      ? r.pick([
        [r.pick(["lifting", "home"])],
        ["lifting", r.pick(STYLE_KEYS)],
        [r.pick(["running", "cycling", "walking", "swimming", "rowing", "hiking", "classes", "sports"])],
        [r.pick(["yoga", "pilates"])],
        ["walking", "yoga"],
        STYLE_KEYS.slice(),
      ])
      : r.pick([[], ["Running", " YOGA "], "running,walking", "", ["nonsense"], [null, 3, {}], {}, 7, junk(r), STYLE_KEYS.concat(STYLE_KEYS)]);
  }
  if (r.chance(0.2)) p.avoid = real ? [r.pick(LIB_NAMES)] : r.pick([[r.pick(LIB_NAMES)], LIB_NAMES.slice(0, 200), junk(r), [null, 3, {}]]);

  if (real) return { payload: p, real };

  /* The hostile extras. Keys the engine never heard of, keys that are a
     prototype attack, and, rarely, a payload that is not an object at all,
     which is what a client posting an array body produces. */
  if (r.chance(0.25)) p[r.pick(["__proto__x", "toString", "hasOwnProperty", "valueOf", "constructor_", ""])] = junk(r);
  if (r.chance(0.2)) p.user_name = r.pick(["Mo", LONG, junk(r)]);
  if (r.chance(0.15)) {
    /* An own "__proto__" property, which only JSON.parse and defineProperty
       can make. A literal would set the prototype instead and test nothing. */
    const polluted = JSON.parse('{"__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted2":"yes"}}}');
    Object.assign(p, polluted);
  }
  if (r.chance(0.04)) return { payload: r.pick([[], [p], "a string body", 42, null, Object.create(null)]), real };
  return { payload: p, real };
}

/* ------------------------------------------------------------------ *
 * The edge function's own guard, replicated
 * ------------------------------------------------------------------ *
 * Copied from supabase/functions/generate-workout/index.ts rather than
 * imported, because that file is TypeScript for Deno and this is Node. It is
 * copied on purpose and it is the one place in this file that can drift: if
 * the caps there change, this goes stale and the reachability verdicts below
 * get generous. Worth a glance whenever boundPayload is edited.
 */
const MAX_ROWS = 2000;
const MAX_TEXT = 200;
const TEXT_FIELDS = ["focus", "goal", "goal_detail", "goal_bubble", "goal_child", "activity_level", "sex", "focus_chosen_at"];
const IDENTIFYING_FIELDS = ["user_name", "name", "email", "user_email", "partner_name"];
const ROW_FIELDS = ["history", "logs", "plans", "swaps", "focus_groups"];
const NUMBER_FIELDS = {
  age: [10, 120], height_in: [20, 108], current_weight: [40, 1500],
  gym_days_this_week: [0, 14], challenge_target: [0, 14], session_minutes: [0, 600],
};

function boundPayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = { ...raw };
  for (const k of IDENTIFYING_FIELDS) delete out[k];
  for (const k of TEXT_FIELDS) if (out[k] != null) out[k] = String(out[k]).slice(0, MAX_TEXT);
  for (const k of ROW_FIELDS) {
    if (out[k] == null) continue;
    out[k] = Array.isArray(out[k]) ? out[k].slice(0, MAX_ROWS) : [];
  }
  for (const [k, [lo, hi]] of Object.entries(NUMBER_FIELDS)) {
    if (out[k] == null) continue;
    const n = Number(out[k]);
    out[k] = Number.isFinite(n) && n >= lo && n <= hi ? n : null;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Serialising, for the two checks that are about serialisability
 * ------------------------------------------------------------------ */

/* A stable stringify that survives what JSON.stringify silently rewrites.
   NaN and Infinity both become null in JSON, undefined disappears, and object
   key order is insertion order, so two plans that differ only in key order
   would compare equal under a plain stringify and a targetWeight of NaN would
   read as null. All three are exactly what the determinism and the
   round-trip checks are looking for, so none of them may be smoothed over. */
function stable(v, seen = new Set()) {
  if (v === undefined) return "<undefined>";
  if (v === null) return "null";
  const t = typeof v;
  if (t === "number") return Object.is(v, -0) ? "-0" : String(v);
  if (t === "string") return JSON.stringify(v);
  if (t === "boolean") return String(v);
  if (t === "function") return "<function>";
  if (t === "bigint" || t === "symbol") return `<${t}>`;
  if (seen.has(v)) return "<circular>";
  seen.add(v);
  let out;
  if (Array.isArray(v)) out = `[${v.map((x) => stable(x, seen)).join(",")}]`;
  else if (v instanceof Date) out = `<Date ${v.getTime()}>`;
  else {
    const keys = Object.keys(v);
    out = `{${keys.map((k) => `${JSON.stringify(k)}:${stable(v[k], seen)}`).join(",")}}`;
  }
  seen.delete(v);
  return out;
}

/* Walks the whole result looking for the four things the app cannot receive.
   The app does `JSON.parse(JSON.stringify(x))` over the wire whether it means
   to or not, so a Date becomes a string, an undefined disappears and a
   function disappears, and every one of those is a field the screen reads as
   missing without anything throwing. */
function badValues(v, path = "", out = [], seen = new Set()) {
  if (v === undefined) { out.push(`${path} is undefined`); return out; }
  const t = typeof v;
  if (t === "function") { out.push(`${path} is a function`); return out; }
  if (t === "bigint" || t === "symbol") { out.push(`${path} is a ${t}`); return out; }
  if (t === "number" && !Number.isFinite(v)) { out.push(`${path} is ${v}`); return out; }
  if (v === null || t !== "object") return out;
  if (seen.has(v)) { out.push(`${path} is circular`); return out; }
  if (v instanceof Date) { out.push(`${path} is a Date`); return out; }
  if (v instanceof Map || v instanceof Set) { out.push(`${path} is a ${v.constructor.name}`); return out; }
  seen.add(v);
  if (Array.isArray(v)) v.forEach((x, i) => badValues(x, `${path}[${i}]`, out, seen));
  else for (const k of Object.keys(v)) badValues(v[k], path ? `${path}.${k}` : k, out, seen);
  seen.delete(v);
  return out;
}

/* ------------------------------------------------------------------ *
 * What meta is allowed to contain
 * ------------------------------------------------------------------ *
 * CONTRACT.md section (b), the `meta` table, key for key. An undocumented key
 * is an internal leaking into a payload the app stores in ai_workouts, which
 * is how a private field becomes a public one by accident.
 */
const META_KEYS = new Set([
  "experience", "volumeDial", "childUsed", "goals", "confidence", "days", "dayName", "focusHonoured",
  "focus", "limits", "stretching", "session", "source", "goalSource", "logsSource", "missing",
  "styles", "age",
]);
/* Documented in the contract's prose and missing from its table. Warned, not
   failed: the key is deliberate and it is the TABLE that is behind, which is a
   documentation bug rather than a leak. See the finding note. */
const META_KEYS_UNDOCUMENTED = new Set(["cardio"]);
const META_SUBKEYS = {
  experience: ["sessions", "sessionsPerWeek", "weeksTraining", "stillLinear", "returning", "earnedMovements"],
  volumeDial: ["value", "days", "effectiveSessions"],
  goals: ["primary", "secondary", "ignored"],
  focus: ["requested", "requestedTiers", "applied", "tiers", "why", "stale"],
  limits: ["hurts", "missing", "excludedCount"],
  age: ["years", "known", "rampCaution", "rampApplied", "warmupCaution", "warmupApplied", "note"],
  stretching: ["included", "warmupMinutes", "cooldownMinutes", "mobilityGoal", "why"],
  session: ["budgetMinutes", "source", "asked", "goalMinutes", "estimatedMinutes", "rampMinutes", "fits", "restCompressed"],
  styles: ["asked", "picked", "resistance", "honoured", "equipmentMissing", "cardioModes", "flowTrainings", "note"],
};
const WORKOUT_KEYS = new Set(["focus", "exercises", "warmup", "cooldown", "rampSets", "cardio", "flow"]);
const CARDIO_KEYS = new Set(["name", "mode", "minutes", "effort", "cue", "structure"]);
const FLOW_KEYS = new Set(["training", "label", "style", "level", "minutes", "seconds", "rounds", "moves", "notes"]);
const FLOW_MOVE_KEYS = new Set(["name", "seconds", "perSide", "round", "category", "cue"]);
const RAMP_KEYS = new Set(["exercise", "group", "sets", "seconds"]);
const RAMP_SET_KEYS = new Set(["weight", "reps", "restSec", "pct", "cue"]);
/* `volumeCut` is present only on a week the plateau answer cut the sets, and it
   is the engine's memory of its own last answer: the app stores `exercises`
   verbatim and plateau-response.mjs reads it back off `plans`. CONTRACT.md
   documents it beside restSec. */
const EXERCISE_KEYS = new Set(["name", "sets", "reps", "targetWeight", "loadBasis", "note", "swap", "alternatives", "restSec", "volumeCut"]);
/* What a `targetWeight` of 0 is allowed to mean. "your size" is deliberately not
   in here: it was the cold start basis and there is no cold start any more, so a
   row carrying it would be an old prescription path finding its way back. */
const LOAD_BASES = new Set(["bodyweight", "unknown", "your last session", "a similar lift"]);
const CONFIDENCES = new Set(["none", "low", "medium", "high"]);
const GROUP_SET = new Set(MUSCLE_GROUPS);

/* What a targetWeight may be, as a multiple of bodyweight. Not a strength
   standard, a sanity rail: the question is only "would a person reading this
   card think the app was broken", and somebody told to put four times their own
   bodyweight on a bar would. Where no bodyweight was given the engine omits
   loads entirely, so 200 lb is a stand-in that only ever makes the rail looser.
   One number now rather than four by training level, matching
   TYPO_BODYWEIGHT_MULTIPLE in load.mjs, which this has to agree with or the
   fuzz is testing a rail the engine does not have. */
const WEIGHT_MULT = 4;
const ABSOLUTE_WEIGHT_CAP = 1200;

/* ------------------------------------------------------------------ *
 * Bookkeeping
 * ------------------------------------------------------------------ */

const results = new Map();   // invariant -> { fails, warns, examples[] }
function record(kind, invariant, seed, channel, real, detail) {
  let row = results.get(invariant);
  if (!row) { row = { fails: 0, warns: 0, examples: [] }; results.set(invariant, row); }
  row[kind === "fail" ? "fails" : "warns"]++;
  if (row.examples.length < 5) row.examples.push({ kind, seed, channel, real, detail });
  /* Reachability, which is the ranking the report is sorted by: a failure a
     realistic payload reaches through the edge function is one a user hits by
     using the app; one only a hand-built body reaches is one an attacker hits. */
  if (kind === "fail") {
    row.worst = Math.max(row.worst || 0, real && channel === "edge" ? 3 : channel === "edge" ? 2 : 1);
  }
}
const fail = (inv, ctx, detail) => record("fail", inv, ctx.seed, ctx.channel, ctx.real, detail);
const warn = (inv, ctx, detail) => record("warn", inv, ctx.seed, ctx.channel, ctx.real, detail);

/* ------------------------------------------------------------------ *
 * The invariants
 * ------------------------------------------------------------------ */

function checkResult(ctx, out, payload) {
  if (!out || typeof out !== "object") { fail("result-shape", ctx, `result is ${typeof out}`); return; }

  /* ---- nothing in here may be unserialisable ---- *
   * Split in two, because the two halves travel differently. `workout`,
   * `honest`, `notes` and `meta` are what the edge function writes to its
   * response and what the app stores in ai_workouts, so an undefined or a Date
   * in there reaches a screen. `plan` only comes back with includePlan, which
   * is engine-lab and this file, so the same fault in there is a tidiness
   * problem and not a shipped one. */
  const wire = { workout: out.workout, honest: out.honest, notes: out.notes, meta: out.meta };
  for (const bad of badValues(wire).slice(0, 3)) fail("unserialisable", ctx, bad);
  if (out.plan) for (const bad of badValues(out.plan, "plan").slice(0, 2)) warn("unserialisable-plan", ctx, bad);
  let roundTripped = null;
  try {
    roundTripped = JSON.parse(JSON.stringify(wire));
  } catch (err) {
    fail("json-stringify", ctx, String(err && err.message));
  }
  /* The wire is JSON both ways, so anything the round trip REWRITES is a
     value the screen never sees as the engine meant it: Infinity and NaN both
     land as null, undefined disappears, a Date becomes a string. */
  if (roundTripped && stable(roundTripped) !== stable(wire)) {
    fail("json-roundtrip", ctx, `JSON changed the answer: ${firstDiff(stable(wire), stable(roundTripped))}`);
  }

  const w = out.workout;
  if (!w || typeof w !== "object") { fail("workout-shape", ctx, `workout is ${typeof w}`); return; }
  for (const k of Object.keys(w)) if (!WORKOUT_KEYS.has(k)) fail("workout-extra-key", ctx, k);
  if (typeof w.focus !== "string" || !w.focus.trim()) fail("workout-shape", ctx, `focus ${stable(w.focus)}`);
  if (!Array.isArray(w.exercises)) { fail("workout-shape", ctx, "exercises is not an array"); return; }
  /* The two workouts with no exercises in them, and they are the answer rather
     than an exception: somebody whose train_styles hold no resistance style
     gets the cardio session or the mat class they asked for
     (engine/styles.mjs), and neither has sets. The rule that matters is the
     opposite one, that the session never appears in `exercises`, because
     anything in that array is logged as a set, calibrated against, and painted
     on the Body tab. */
  if (w.flow) {
    if (w.exercises.length) fail("flow-day-has-sets", ctx, `${w.focus} put ${w.exercises.length} rows in exercises`);
    if (w.cardio) fail("flow-day-also-cardio", ctx, `${w.focus} came back as both`);
    if (typeof w.flow !== "object") { fail("workout-shape", ctx, `flow is ${typeof w.flow}`); return; }
    for (const k of Object.keys(w.flow)) if (!FLOW_KEYS.has(k)) fail("flow-extra-key", ctx, k);
    if (w.flow.training !== "yoga" && w.flow.training !== "pilates") fail("flow-shape", ctx, `training ${stable(w.flow.training)}`);
    if (typeof w.flow.label !== "string" || !w.flow.label.trim()) fail("flow-shape", ctx, `label ${stable(w.flow.label)}`);
    if (!(w.flow.minutes > 0)) fail("flow-shape", ctx, `minutes ${stable(w.flow.minutes)}`);
    if (!(w.flow.rounds >= 1)) fail("flow-shape", ctx, `rounds ${stable(w.flow.rounds)}`);
    if (!Array.isArray(w.flow.moves) || !w.flow.moves.length) fail("flow-shape", ctx, "no moves");
    else {
      /* The session's own arithmetic. A class whose moves do not add up to the
         seconds it claims is one a clock cannot run, and the clock is the whole
         session here the way the bar is on a lifting day. */
      let spent = 0;
      for (const m of w.flow.moves) {
        if (!m || typeof m !== "object") { fail("flow-move-shape", ctx, `move is ${typeof m}`); continue; }
        for (const k of Object.keys(m)) if (!FLOW_MOVE_KEYS.has(k)) fail("flow-move-extra-key", ctx, k);
        if (typeof m.name !== "string" || !m.name.trim()) fail("flow-move-shape", ctx, `name ${stable(m.name)}`);
        if (!(m.seconds > 0)) fail("flow-move-shape", ctx, `${m.name} runs ${stable(m.seconds)}s`);
        if (!(m.round >= 1 && m.round <= w.flow.rounds)) fail("flow-move-shape", ctx, `${m.name} in round ${stable(m.round)} of ${stable(w.flow.rounds)}`);
        spent += Number(m.seconds) * (m.perSide ? 2 : 1);
      }
      if (spent !== w.flow.seconds) fail("flow-seconds", ctx, `moves come to ${spent}s, session says ${stable(w.flow.seconds)}s`);
      if (w.flow.seconds > w.flow.minutes * 60) fail("flow-seconds", ctx, `${w.flow.seconds}s of moves in a ${w.flow.minutes} min class`);
    }
    if (out.meta?.styles?.honoured !== true) fail("flow-day-not-honoured", ctx, `${w.focus} came back with honoured ${stable(out.meta?.styles?.honoured)}`);
  } else if (w.cardio) {
    if (w.exercises.length) fail("cardio-day-has-sets", ctx, `${w.focus} put ${w.exercises.length} rows in exercises`);
    if (typeof w.cardio !== "object") { fail("workout-shape", ctx, `cardio is ${typeof w.cardio}`); return; }
    for (const k of Object.keys(w.cardio)) if (!CARDIO_KEYS.has(k)) fail("cardio-extra-key", ctx, k);
    if (typeof w.cardio.name !== "string" || !w.cardio.name.trim()) fail("cardio-shape", ctx, `name ${stable(w.cardio.name)}`);
    if (!(w.cardio.minutes > 0)) fail("cardio-shape", ctx, `minutes ${stable(w.cardio.minutes)}`);
    if (!(w.cardio.effort >= 1 && w.cardio.effort <= 10)) fail("cardio-shape", ctx, `effort ${stable(w.cardio.effort)}`);
    if (typeof w.cardio.cue !== "string" || !w.cardio.cue.trim()) fail("cardio-shape", ctx, `cue ${stable(w.cardio.cue)}`);
    if (out.meta?.styles?.honoured !== true) fail("cardio-day-not-honoured", ctx, `${w.focus} came back with honoured ${stable(out.meta?.styles?.honoured)}`);
  } else {
    if (w.exercises.length === 0) { fail("zero-exercises", ctx, `${w.focus} came back empty`); return; }
    /* The contract's own floor and ceiling: "three to six exercises", three only
       when the library genuinely cannot fill the day. */
    if (w.exercises.length < 3) fail("exercise-count", ctx, `${w.exercises.length} on ${w.focus}`);
    if (w.exercises.length > 6) fail("exercise-count", ctx, `${w.exercises.length} on ${w.focus}`);
  }
  /* Everything below runs on a cardio day too, and on purpose: the first cut of
     this returned here instead, which quietly took the meta block, the notes
     and the honest line out of the fuzz for every cardio case. The loops below
     walk `exercises`, which is empty, so they cost nothing and check nothing,
     and the checks that matter for that day are the ones after them. */

  /* Ramp-up sets. The contract's promise about them is the one worth fuzzing:
     they are warm-up sets of a lift already on the card, at less than its
     working weight, and they are never logged as working sets. So a ramp naming
     a movement the day does not contain, or carrying a load at or above the
     working one, is the bug that would put a person under a heavier bar than
     the plan meant or write a set into calibration that was never prescribed. */
  if (w.rampSets !== undefined) {
    if (!Array.isArray(w.rampSets)) fail("ramp-shape", ctx, `rampSets is ${typeof w.rampSets}`);
    else {
      const working = new Map(w.exercises.map((e) => [String(e?.name), Number(e?.targetWeight)]));
      for (const r of w.rampSets) {
        if (!r || typeof r !== "object") { fail("ramp-shape", ctx, `ramp is ${typeof r}`); continue; }
        for (const k of Object.keys(r)) if (!RAMP_KEYS.has(k)) fail("ramp-extra-key", ctx, k);
        if (!working.has(String(r.exercise))) fail("ramp-off-card", ctx, `${r.exercise} is not on ${w.focus}`);
        if (!Array.isArray(r.sets) || !r.sets.length) { fail("ramp-shape", ctx, `${r.exercise} has no sets`); continue; }
        const top = working.get(String(r.exercise));
        for (const s of r.sets) {
          if (!s || typeof s !== "object") { fail("ramp-shape", ctx, `ramp set is ${typeof s}`); continue; }
          for (const k of Object.keys(s)) if (!RAMP_SET_KEYS.has(k)) fail("ramp-extra-key", ctx, k);
          if (typeof s.weight !== "number" || !Number.isFinite(s.weight) || s.weight < 0) {
            fail("ramp-weight", ctx, `${r.exercise} ramp weight ${stable(s.weight)}`);
          } else if (Number.isFinite(top) && top > 0 && s.weight >= top) {
            fail("ramp-not-submaximal", ctx, `${r.exercise} ramps at ${s.weight} against a working ${top}`);
          }
          if (!Number.isInteger(s.reps) || s.reps < 1 || s.reps > 30) fail("ramp-reps", ctx, `${r.exercise} ramp reps ${stable(s.reps)}`);
          if (!Number.isInteger(s.restSec) || s.restSec < 0 || s.restSec > 600) fail("ramp-rest", ctx, `${r.exercise} ramp rest ${stable(s.restSec)}`);
        }
      }
    }
  }

  const bwRaw = Number(payload && payload.current_weight);
  const bw = Number.isFinite(bwRaw) && bwRaw >= 40 && bwRaw <= 1500 ? bwRaw : 200;
  const cap = Math.min(ABSOLUTE_WEIGHT_CAP, Math.max(200, bw * WEIGHT_MULT));

  const seen = new Set();
  for (const e of w.exercises) {
    if (!e || typeof e !== "object") { fail("exercise-shape", ctx, `exercise is ${typeof e}`); continue; }
    for (const k of Object.keys(e)) if (!EXERCISE_KEYS.has(k)) fail("exercise-extra-key", ctx, k);
    if (typeof e.name !== "string" || !e.name.trim()) fail("exercise-shape", ctx, `name ${stable(e.name)}`);
    else if (!LIB_NAME_SET.has(e.name.trim().toLowerCase())) fail("name-not-in-library", ctx, e.name);
    if (!Number.isInteger(e.sets) || e.sets < 1 || e.sets > 20) fail("sets", ctx, `${e.name} sets ${stable(e.sets)}`);
    if (!Number.isInteger(e.reps) || e.reps < 1 || e.reps > 200) fail("reps", ctx, `${e.name} reps ${stable(e.reps)}`);
    if (typeof e.targetWeight !== "number" || !Number.isFinite(e.targetWeight) || e.targetWeight < 0) {
      fail("target-weight-type", ctx, `${e.name} targetWeight ${stable(e.targetWeight)}`);
    } else if (e.targetWeight > cap) {
      fail("target-weight-absurd", ctx, `${e.name} ${e.targetWeight} lb at ${bw} lb`);
    }
    /* Which of the two things a zero means. The contract now distinguishes them
       and the app renders them differently, so a row that says nothing is a row
       the card cannot caption. */
    if (!LOAD_BASES.has(e.loadBasis)) fail("load-basis", ctx, `${e.name} loadBasis ${stable(e.loadBasis)}`);
    if (e.targetWeight > 0 && (e.loadBasis === "bodyweight" || e.loadBasis === "unknown")) {
      fail("load-basis", ctx, `${e.name} carries ${e.targetWeight} lb under basis ${e.loadBasis}`);
    }
    /* The contract says restSec is the number the session was costed with and
       that the app's own default is the fallback when it is absent, so null is
       allowed and a string or a NaN is not. */
    if (!(e.restSec === null || (typeof e.restSec === "number" && Number.isFinite(e.restSec) && e.restSec >= 0 && e.restSec <= 900))) {
      fail("rest-sec", ctx, `${e.name} restSec ${stable(e.restSec)}`);
    }
    if (!(e.swap === null || (typeof e.swap === "string" && e.swap.trim()))) fail("swap-type", ctx, `${e.name} swap ${stable(e.swap)}`);
    if (!Array.isArray(e.alternatives) || e.alternatives.length > 3) fail("alternatives", ctx, `${e.name} alternatives ${stable(e.alternatives)}`);
    else for (const a of e.alternatives) {
      if (!a || typeof a.name !== "string" || !a.name.trim()) fail("alternatives", ctx, `${e.name} alternative ${stable(a)}`);
      else if (!LIB_NAME_SET.has(a.name.trim().toLowerCase())) fail("alternative-not-in-library", ctx, a.name);
      if (a && !(typeof a.why === "string")) fail("alternatives", ctx, `${e.name} why ${stable(a && a.why)}`);
    }
    if (!(e.note === null || typeof e.note === "string")) fail("note-type", ctx, `${e.name} note ${stable(e.note)}`);
    if (typeof e.name === "string") {
      if (seen.has(e.name)) fail("duplicate-in-day", ctx, `${e.name} twice on ${w.focus}`);
      seen.add(e.name);
    }
  }

  /* ---- the timed blocks ---- */
  for (const which of ["warmup", "cooldown"]) {
    const block = w[which];
    if (!Array.isArray(block)) { fail("mobility-shape", ctx, `${which} is ${stable(block)}`); continue; }
    const names = new Set();
    for (const m of block) {
      if (!m || typeof m !== "object") { fail("mobility-shape", ctx, `${which} entry ${stable(m)}`); continue; }
      if (typeof m.name !== "string" || !m.name.trim()) fail("mobility-shape", ctx, `${which} name ${stable(m.name)}`);
      if (!Number.isFinite(m.seconds) || m.seconds <= 0 || m.seconds > 600) fail("mobility-seconds", ctx, `${which} ${m.name} ${stable(m.seconds)}`);
      if (names.has(m.name)) fail("mobility-duplicate", ctx, `${which} repeats ${m.name}`);
      names.add(m.name);
    }
  }

  /* ---- honest and notes ---- */
  if (!(out.honest === null || typeof out.honest === "string")) fail("honest-type", ctx, stable(out.honest));
  if (!Array.isArray(out.notes) || out.notes.some((n) => typeof n !== "string")) fail("notes-type", ctx, stable(out.notes));

  /* ---- meta ---- */
  const meta = out.meta;
  if (!meta || typeof meta !== "object") { fail("meta-shape", ctx, `meta is ${typeof meta}`); return; }
  for (const k of Object.keys(meta)) {
    if (META_KEYS.has(k)) continue;
    if (META_KEYS_UNDOCUMENTED.has(k)) { warn("meta-key-undocumented", ctx, k); continue; }
    fail("meta-extra-key", ctx, k);
  }
  for (const [parent, allowed] of Object.entries(META_SUBKEYS)) {
    const obj = meta[parent];
    if (!obj || typeof obj !== "object") { fail("meta-shape", ctx, `meta.${parent} is ${stable(obj)}`); continue; }
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) fail("meta-extra-key", ctx, `${parent}.${k}`);
  }
  if ("level" in meta) fail("meta-level-resurrected", ctx, stable(meta.level));
  const xp = meta.experience;
  if (!xp || !Number.isFinite(xp.sessions) || xp.sessions < 0
      || !Number.isFinite(xp.earnedMovements) || xp.earnedMovements < 0
      || typeof xp.stillLinear !== "boolean" || typeof xp.returning !== "boolean") {
    fail("meta-experience", ctx, stable(xp));
  }
  const dial = meta.volumeDial;
  if (!dial || !(dial.value >= 0 && dial.value <= 1)) fail("meta-volume-dial", ctx, stable(dial));
  if (!CONFIDENCES.has(meta.confidence)) fail("meta-confidence", ctx, stable(meta.confidence));
  if (!Number.isInteger(meta.days) || meta.days < 2 || meta.days > 6) fail("meta-days", ctx, stable(meta.days));
  if (meta.dayName !== w.focus) fail("meta-day-name", ctx, `${stable(meta.dayName)} against ${stable(w.focus)}`);
  if (typeof meta.focusHonoured !== "boolean") fail("meta-type", ctx, `focusHonoured ${stable(meta.focusHonoured)}`);
  if (meta.source !== "engine") fail("meta-source", ctx, stable(meta.source));
  if (!["tiles", "legacy"].includes(meta.goalSource)) fail("meta-goal-source", ctx, stable(meta.goalSource));
  if (!["logs", "history", "none"].includes(meta.logsSource)) fail("meta-logs-source", ctx, stable(meta.logsSource));
  if (!Array.isArray(meta.missing) || meta.missing.some((m) => typeof m !== "string")) fail("meta-missing", ctx, stable(meta.missing));
  const applied = meta.focus && meta.focus.applied;
  if (!Array.isArray(applied) || applied.some((g) => !GROUP_SET.has(g))) fail("focus-applied-subset", ctx, stable(applied));
  const requested = meta.focus && meta.focus.requested;
  if (!Array.isArray(requested) || requested.some((g) => !GROUP_SET.has(g))) fail("focus-requested-subset", ctx, stable(requested));
  const lim = meta.limits || {};
  if (!Array.isArray(lim.hurts) || lim.hurts.some((h) => !JOINT_KEYS.includes(h))) fail("meta-limits", ctx, `hurts ${stable(lim.hurts)}`);
  if (!Array.isArray(lim.missing) || lim.missing.some((m) => !EQUIP_KEYS.includes(m))) fail("meta-limits", ctx, `missing ${stable(lim.missing)}`);
  /* age. `years` is the one field here that comes straight off a hostile
     payload, so it has to be a number this engine believes or null, and `known`
     has to agree with it: a `known: true` beside a null is meta claiming we have
     something we are not using. Both dials are proportions and a proportion
     outside 0 to 1 would be a multiplier somewhere doing the opposite of what
     it says. The -0 this caught is why `years` is taken from age.mjs's own
     verdict rather than from a bare Number(): -0 survives everything except
     JSON, which writes it as 0, so the response changed on a round trip. */
  const age = meta.age || {};
  const yearsOk = age.years === null || (Number.isFinite(age.years) && age.years >= 10 && age.years <= 120 && !Object.is(age.years, -0));
  if (!yearsOk) fail("meta-age", ctx, `years ${stable(age.years)}`);
  if (age.known !== (age.years !== null)) fail("meta-age", ctx, `known ${stable(age.known)} beside years ${stable(age.years)}`);
  for (const k of ["rampCaution", "warmupCaution"]) {
    if (!(age[k] >= 0 && age[k] <= 1)) fail("meta-age", ctx, `${k} ${stable(age[k])}`);
  }
  /* research/02's closing argument, checked on every payload the fuzz can
     build: an unknown age takes the careful ramp and does NOT take the warm-up
     minutes. The `sex` bug is what this line is here to stop happening again in
     a different field. */
  if (!age.known && !(age.rampCaution === 1 && age.warmupCaution === 0)) {
    fail("meta-age-unknown-default", ctx, `ramp ${stable(age.rampCaution)}, warmup ${stable(age.warmupCaution)}`);
  }
  if (!(age.note === null || typeof age.note === "string")) fail("meta-age", ctx, `note ${stable(age.note)}`);
  if (!Number.isInteger(lim.excludedCount) || lim.excludedCount < 0) fail("meta-limits", ctx, `excludedCount ${stable(lim.excludedCount)}`);
  const str = meta.stretching || {};
  if (typeof str.included !== "boolean") fail("meta-stretching", ctx, `included ${stable(str.included)}`);
  for (const k of ["warmupMinutes", "cooldownMinutes"]) {
    if (!Number.isFinite(str[k]) || str[k] < 0 || str[k] > 60) fail("meta-stretching", ctx, `${k} ${stable(str[k])}`);
  }
  /* skip_stretching strips the blocks and changes nothing else. */
  if (str.included === false && (w.warmup.length || w.cooldown.length)) {
    fail("stretching-not-stripped", ctx, `included:false with ${w.warmup.length}+${w.cooldown.length} moves`);
  }
  /* The contract caps the secondary goals at two honoured, and everything else
     has to be named rather than dropped in silence. */
  const sec = (meta.goals && meta.goals.secondary) || [];
  if (!Array.isArray(sec) || sec.length > 2) fail("secondary-cap", ctx, `${Array.isArray(sec) ? sec.length : stable(sec)} honoured`);
  const ign = (meta.goals && meta.goals.ignored) || [];
  if (!Array.isArray(ign)) fail("ignored-type", ctx, stable(ign));
  else for (const g of ign) if (!g || typeof g.why !== "string") fail("ignored-type", ctx, `no why on ${stable(g)}`);

  /* ---- the week, when it came back ---- */
  const plan = out.plan;
  if (plan) {
    if (!Array.isArray(plan.week) || plan.week.length !== plan.days) {
      fail("week-length", ctx, `${plan.week && plan.week.length} days against plan.days ${plan.days}`);
    }
    for (const d of plan.week || []) {
      if (!Number.isFinite(d.estimatedMinutes) || d.estimatedMinutes <= 0) {
        fail("estimated-minutes", ctx, `${d.name} ${stable(d.estimatedMinutes)}`);
      } else if (d.estimatedMinutes > Math.max(150, d.minutes * 2)) {
        /* A sane multiple of what was asked. The sweep warns at 1.15x and
           counts; this fails at 2x, which is not "a bit long", it is a session
           the person cannot do in the time they said they had. */
        fail("session-time-absurd", ctx, `${d.name} ${d.estimatedMinutes} min against a ${d.minutes} min budget`);
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * One case
 * ------------------------------------------------------------------ */

let runs = 0;
let generateCalls = 0;

function runCase(seed, channel) {
  const built = makePayload(seed);
  const payload = channel === "edge" ? boundPayload(built.payload) : built.payload;
  const ctx = { seed, channel, real: built.real };
  runs++;

  let a;
  try {
    generateCalls++;
    a = generateFromPayload(payload, { today: TODAY, includePlan: true });
  } catch (err) {
    fail(`throws:${throwKey(err)}`, ctx, (err && err.message) || String(err));
    return;
  }

  /* The same payload OBJECT a second time, not an equal one. That is the
     version of the check that catches the three things worth catching at
     once: hidden module state, a read of the wall clock between the two calls,
     and an engine that mutated the payload it was handed. */
  const before = payload && typeof payload === "object" && !(Array.isArray(payload.logs) && payload.logs.length > 200)
    ? stable(payload) : null;
  let b;
  try {
    generateCalls++;
    b = generateFromPayload(payload, { today: TODAY, includePlan: true });
  } catch (err) {
    fail("determinism-throw", ctx, `second call threw: ${(err && err.message) || err}`);
    return;
  }
  if (before !== null && stable(payload) !== before) fail("payload-mutated", ctx, "the engine wrote to its input");
  const sa = stable(a), sb = stable(b);
  if (sa !== sb) {
    const at = firstDiff(sa, sb);
    fail("determinism", ctx, `two identical calls differ near ${at}`);
  }

  checkResult(ctx, a, payload);

  /* Prototype pollution, checked after every hostile case rather than once at
     the end, so the seed that did it is still in hand. */
  if (({}).polluted !== undefined || ({}).polluted2 !== undefined || Object.prototype.polluted !== undefined) {
    fail("prototype-pollution", ctx, "Object.prototype was written to");
    delete Object.prototype.polluted;
    delete Object.prototype.polluted2;
  }
}

/* One bucket per distinct fault, not per pass. The adapter wraps everything as
   "Workout engine failed at <step>", which says WHICH of the eight passes died
   and nothing about why, so two unrelated crashes in buildPlan would be
   reported as one finding and the second would never get looked at. The
   message with its variable parts blanked is the actual fingerprint. */
function throwKey(err) {
  const msg = (err && err.message) || String(err);
  const step = /failed at (\w+)/.exec(msg)?.[1] || "unknown";
  const what = msg.replace(/^Workout engine failed at \w+: /, "")
    .replace(/'[^']*'/g, "'x'")
    .replace(/\b\w+\.(\w+) is not a function/, "<value>.$1 is not a function")
    .slice(0, 70);
  return `${step}: ${what}`;
}

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return `...${a.slice(Math.max(0, i - 60), i + 60)}  VS  ${b.slice(Math.max(0, i - 60), i + 60)}`;
}

/* ------------------------------------------------------------------ *
 * The clock block
 * ------------------------------------------------------------------ *
 * Every module in here takes a `today` and defaults it to `new Date()`. The
 * question this block asks is whether anything reads the real clock ANYWAY,
 * below the level where `today` is threaded, because that is a bug that only
 * shows up at certain times of day and the README records two tests that had
 * exactly it (recovery assumed 18:00 and two cases went red every evening).
 *
 * The method: build the same plan with the same fixed `today` under two
 * different fake system clocks, six months and eleven hours apart. With
 * `today` supplied, nothing in the answer is allowed to move. Anything that
 * does is a wall-clock read that `today` does not cover.
 */
function withFakeClock(nowMs, fn) {
  const Real = Date;
  class Fake extends Real {
    constructor(...args) { if (args.length === 0) super(nowMs); else super(...args); }
    static now() { return nowMs; }
  }
  globalThis.Date = Fake;
  try { return fn(); } finally { globalThis.Date = Real; }
}

const CLOCKS = [
  Date.UTC(2026, 8, 10, 3, 0, 0),     // early morning
  Date.UTC(2026, 8, 10, 23, 30, 0),   // late evening, the hour the README's two tests died at
  Date.UTC(2027, 2, 1, 12, 0, 0),     // six months on
];

function clockCase(seed) {
  const built = makePayload(seed);
  const payload = boundPayload(built.payload);
  const ctx = { seed, channel: "edge", real: built.real };
  const seen = [];
  for (const clock of CLOCKS) {
    try {
      generateCalls++;
      seen.push(stable(withFakeClock(clock, () => generateFromPayload(payload, { today: TODAY, includePlan: true }))));
    } catch (err) {
      fail("clock-throw", ctx, `threw under a fake clock: ${(err && err.message) || err}`);
      return;
    }
  }
  for (let i = 1; i < seen.length; i++) {
    if (seen[i] !== seen[0]) {
      fail("wall-clock-leak", ctx, `the plan moved when the system clock moved, with today fixed: ${firstDiff(seen[0], seen[i])}`);
      return;
    }
  }
}

/* And the other half of the same question: with NO `today` passed at all, the
   answer must still depend only on the system clock, so two calls under the
   same fake clock have to agree. This is the path the edge function actually
   takes, because generateLocally calls generateFromPayload(payload) with no
   options at all. */
function defaultClockCase(seed) {
  const built = makePayload(seed);
  const payload = boundPayload(built.payload);
  const ctx = { seed, channel: "edge", real: built.real };
  try {
    const two = withFakeClock(CLOCKS[1], () => {
      generateCalls += 2;
      return [stable(generateFromPayload(payload)), stable(generateFromPayload(payload))];
    });
    if (two[0] !== two[1]) fail("determinism-default-clock", ctx, firstDiff(two[0], two[1]));
  } catch (err) {
    fail(`throws-default-clock:${throwKey(err)}`, ctx, (err && err.message) || String(err));
  }
}

/* ------------------------------------------------------------------ *
 * The big-history block
 * ------------------------------------------------------------------ *
 * Ten thousand log rows is not a fuzz value, it is what the edge function's
 * own cap allows minus nothing: MAX_ROWS is 2000 and the client trims to
 * ninety days, but `history` and `plans` are capped at 2000 each as well and a
 * person who trains twice a day for two years is inside all of it. Run rarely
 * because it is the one input that costs real time.
 */
function bigHistoryCase(seed) {
  const r = rngFrom(seed);
  const n = r.pick([2000, 10000]);
  const logs = [];
  for (let i = 0; i < n; i++) {
    logs.push({
      entry_date: isoLocal(new Date(TODAY.getTime() - (i % 900) * DAY_MS)),
      exercise_name: LIB_NAMES[i % LIB_NAMES.length],
      sets: 3, reps: 8, weight: 95 + (i % 40),
    });
  }
  const payload = { goal_bubble: r.pick(BUBBLE_IDS), challenge_target: 2 + r.int(5), current_weight: 180, sex: "Male", logs };
  const ctx = { seed, channel: "raw", real: true };
  runs++;
  try {
    generateCalls++;
    const out = generateFromPayload(payload, { today: TODAY, includePlan: true });
    checkResult(ctx, out, payload);
  } catch (err) {
    fail("throws:big-history", ctx, `${n} rows: ${(err && err.message) || err}`);
  }
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  return m ? [m[1], m[2] ?? "true"] : [a, "true"];
}));

if (args.case) {
  /* One seed, printed. This is the reproduction line every finding carries. */
  const seed = Number(args.case);
  const built = makePayload(seed);
  console.log(`seed ${seed}  realistic=${built.real}`);
  console.log("raw payload:\n" + JSON.stringify(built.payload, (k, v) => (typeof v === "number" && !Number.isFinite(v) ? `<${v}>` : v), 2).slice(0, 8000));
  console.log("\nthrough boundPayload:\n" + JSON.stringify(boundPayload(built.payload), (k, v) => (typeof v === "number" && !Number.isFinite(v) ? `<${v}>` : v), 2).slice(0, 8000));
  for (const channel of ["raw", "edge"]) {
    const payload = channel === "raw" ? built.payload : boundPayload(built.payload);
    try {
      const out = generateFromPayload(payload, { today: TODAY, includePlan: true });
      console.log(`\n[${channel}] ok: ${out.workout.focus}, ${out.workout.exercises.length} exercises`);
      console.log(JSON.stringify(out.workout.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, w: e.targetWeight, rest: e.restSec })), null, 1));
      console.log(`[${channel}] sessions=${out.meta.experience?.sessions} days=${out.meta.days} keys=${Object.keys(out.meta).join(",")}`);
    } catch (err) {
      console.log(`\n[${channel}] THREW: ${(err && err.message) || err}`);
    }
  }
  process.exit(0);
}

const N = Number(args.runs || 20000);
const BASE = Number(args.seed || 1_000_000);
const t0 = Date.now();

for (let i = 0; i < N; i++) {
  const seed = BASE + i;
  /* Both channels on the same seed, so a failure that the edge guard catches
     and one it does not are visibly the same payload. */
  runCase(seed, "raw");
  runCase(seed, "edge");
  /* The clock blocks are three and two extra generate calls, so they run on a
     slice rather than on everything. */
  if (i % 37 === 0) clockCase(seed);
  if (i % 53 === 0) defaultClockCase(seed);
  if (i % 1500 === 0) bigHistoryCase(seed);
  if (i && i % 2000 === 0) process.stderr.write(`  ${i}/${N} cases, ${generateCalls} generate calls, ${Math.round((Date.now() - t0) / 1000)}s\n`);
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
const rows = [...results.entries()].sort((a, b) => (b[1].worst || 0) - (a[1].worst || 0) || b[1].fails - a[1].fails);
let totalFails = 0, totalWarns = 0;
for (const [, row] of rows) { totalFails += row.fails; totalWarns += row.warns; }

console.log("");
console.log(`${runs} cases, ${generateCalls} generate calls, ${secs}s`);
console.log(`${totalFails} failures, ${totalWarns} warnings, ${rows.filter(([, r]) => r.fails).length} distinct failing invariants`);
console.log("");

const REACH = { 3: "a real user can hit this", 2: "reachable over the wire, crafted body", 1: "direct caller only" };
for (const [invariant, row] of rows) {
  if (!row.fails && !row.warns) continue;
  const head = row.fails
    ? `FAIL  ${invariant}  x${row.fails}   [${REACH[row.worst] || "?"}]`
    : `warn  ${invariant}  x${row.warns}`;
  console.log(head);
  for (const ex of row.examples.slice(0, 3)) {
    console.log(`        --case=${ex.seed}  channel=${ex.channel} realistic=${ex.real}`);
    console.log(`        ${String(ex.detail).slice(0, 240)}`);
  }
}

if (totalFails) {
  console.log("");
  console.log("Reproduce any one of them with:  node mo-knowledge/engine/fuzz.mjs --case=<seed>");
  process.exit(1);
}
console.log("Clean.");
