/* Smoke test the app's boot path without a browser.
   A passing syntax check does NOT prove the app runs: a single reference to a
   removed element throws and silently kills startup. This catches that.
   Usage: node scripts/boot-check.mjs */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Fake DOM built from the real markup's ids, so a missing element shows up.
const ids = [...html.matchAll(/id="([a-zA-Z0-9_]+)"/g)].map((m) => m[1]);
const nodes = {};
const MISSES = new Set();
/* Ids created at runtime via createElement, so absence from markup is expected.
   Every one of these MUST be null-checked at its lookup site. */
const DYNAMIC = new Set(["weightEmpty", "proofRemoveBtn"]);
const mk = (id) => ({
  id, textContent: "", innerHTML: "", value: "", checked: false, disabled: false, title: "",
  dataset: {}, files: [], style: { setProperty() {}, width: "" },
  classList: { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } },
  addEventListener() {}, removeEventListener() {},
  querySelectorAll() { return []; },
  querySelector() { return mk("child"); },   // must not be null: real DOM finds these
  appendChild() {}, focus() {}, click() {}, getContext() { return null; },
  setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, remove() {},
  insertAdjacentHTML() {}, scrollIntoView() {}, closest() { return null; },
  parentElement: { appendChild() {} },
  set onclick(v) {}, set onchange(v) {}, set oninput(v) {},
});
ids.forEach((i) => (nodes[i] = mk(i)));

globalThis.document = {
  getElementById: (id) => { if (!nodes[id]) { if (!DYNAMIC.has(id)) MISSES.add(id); return null; } return nodes[id]; },
  querySelectorAll: () => [], querySelector: () => null,
  createElement: () => mk("tmp"), addEventListener() {}, hidden: false,
  documentElement: { getAttribute: () => "dark", setAttribute() {}, style: { setProperty() {} } },
  body: mk("body"),
};
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.location = { reload() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "#3b82f6" });
Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
globalThis.Chart = function () { return { destroy() {} }; };

const chain = (rows = []) => {
  const p = Promise.resolve({ data: rows, error: null });
  Object.assign(p, {
    select: () => chain(rows), eq: () => chain(rows), order: () => chain(rows),
    limit: () => chain(rows), maybeSingle: () => Promise.resolve({ data: rows[0] || null, error: null }),
    insert: () => chain([]), upsert: () => chain([]), update: () => chain([]), delete: () => chain([]),
  });
  return p;
};
const DATA = {
  profiles: [{ email: "mo@x.com", user_name: "Mo", tracked_metrics: ["weight", "prs", "trained"], bonus_xp: 0, challenge_target: 4 }],
  fit_entries: [{ email: "mo@x.com", user_name: "Mo", entry_date: "2026-08-30", gym: true, weight: 180, sessions: 1 }],
  exercise_logs: [{ email: "mo@x.com", user_name: "Mo", entry_date: "2026-08-30", exercise_name: "Bench", weight: 135, reps: 8, sets: 3 }],
  ai_workouts: [{ id: "w1", email: "mo@x.com", user_name: "Mo", entry_date: "2026-08-30", archived: false,
    focus: "Strength", exercises: [
      { name: "Bench", sets: 3, reps: 8, targetWeight: 135 },
      { name: "Row", sets: 3, reps: 10, targetWeight: 95 },
    ] }],
  partnerships: [{ id: "p1", inviter_email: "mo@x.com", invitee_email: "mel@x.com", status: "accepted" }],
};
globalThis.window.supabase = {
  createClient: () => ({
    from: (t) => chain(DATA[t] || []),
    auth: { onAuthStateChange() {}, getSession: async () => ({ data: { session: null } }), signOut() {} },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null }), upload: async () => ({ error: null }), remove: async () => ({}) }) },
    rpc: () => chain([]),
  }),
};

let failed = 0;
try {
  new Function(src + ";globalThis.__t={showApp,loadAll,renderHome,renderWorkoutTab,renderProgressTab,renderSetupTab,switchTab,renderFab,renderStatTiles,renderTodayTally,renderXP,renderScaleCheck,renderBodyTab};")();
} catch (e) {
  console.log("TOP-LEVEL ERROR:", e.message);
  process.exit(1);
}

globalThis.ME = "Mo";
globalThis.MY_EMAIL = "mo@x.com";
const t = globalThis.__t;
for (const [name, run] of [
  ["showApp", () => t.showApp()],
  ["loadAll", () => t.loadAll()],
  ["renderHome", () => t.renderHome()],
  ["renderWorkoutTab", () => t.renderWorkoutTab()],
  ["renderProgressTab", () => t.renderProgressTab()],
  ["renderSetupTab", () => t.renderSetupTab()],
  ["switchTab home", () => t.switchTab("home")],
  ["switchTab workout", () => t.switchTab("workout")],
  ["switchTab body", () => t.switchTab("body")],
  ["renderBodyTab", () => t.renderBodyTab()],
  ["switchTab progress", () => t.switchTab("progress")],
  ["switchTab setup", () => t.switchTab("setup")],
  ["renderXP", () => t.renderXP()],
  ["renderScaleCheck", () => t.renderScaleCheck()],
  ["renderFab", () => t.renderFab()],
]) {
  try { await run(); console.log(`  ${name.padEnd(20)} ok`); }
  catch (e) { failed++; console.log(`  ${name.padEnd(20)} THREW: ${e.message}`); console.log("    " + (e.stack || "").split("\n")[1]?.trim()); }
}
if (MISSES.size) { failed++; console.log("\n  ids used in JS but MISSING from markup:", [...MISSES].join(", ")); }
console.log(failed ? "\nBOOT CHECK FAILED" : "\nBOOT CHECK PASSED");
process.exit(failed ? 1 : 0);
