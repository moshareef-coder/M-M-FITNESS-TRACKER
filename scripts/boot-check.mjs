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
/* Ids built from template literals inside an innerHTML the same code just
   wrote, e.g. `${containerId}_${s.key}_val`. They exist by lookup time. */
const DYNAMIC_PATTERNS = [/_val$/];
const isDynamic = (id) => DYNAMIC.has(id) || DYNAMIC_PATTERNS.some((r) => r.test(id));
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
  getElementById: (id) => {
    if (nodes[id]) return nodes[id];
    // Ids created at runtime exist by the time they are looked up, so hand
    // back a node rather than null; only genuinely absent ids are reported.
    if (isDynamic(id)) return (nodes[id] = mk(id));
    MISSES.add(id);
    return null;
  },
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
  profiles: [
    { email: "mo.shareef@creativelab1.com", user_name: "Mo", tracked_metrics: ["weight", "prs"], challenge_target: 4 },
    { email: "mel@x.com", user_name: "Mel", tracked_metrics: ["weight"], challenge_target: 5 },
  ],
  fit_entries: [
    { email: "mo.shareef@creativelab1.com", user_name: "Mo", entry_date: "2026-09-01", gym: true, weight: 180, sessions: 1, proof_path: "x/p.jpg" },
    { email: "mel@x.com", user_name: "Mel", entry_date: "2026-09-01", gym: true, weight: 140, sessions: 2, proof_path: "x/q.jpg" },
  ],
  exercise_logs: [{ email: "mo.shareef@creativelab1.com", user_name: "Mo", entry_date: "2026-08-30", exercise_name: "Bench", weight: 135, reps: 8, sets: 3 }],
  ai_workouts: [{ id: "w1", email: "mo.shareef@creativelab1.com", user_name: "Mo", entry_date: "2026-08-30", archived: false,
    focus: "Strength", exercises: [
      { name: "Bench", sets: 3, reps: 8, targetWeight: 135 },
      { name: "Row", sets: 3, reps: 10, targetWeight: 95 },
    ] }],
  partnerships: [{ id: "p1", inviter_email: "mo.shareef@creativelab1.com", invitee_email: "mel@x.com", status: "accepted" }],
  body_photos: [{ id: "b1", email: "mo.shareef@creativelab1.com", taken_on: "2026-09-01", path: "x/body/a.jpg" }],
  encouragements: [],
};
globalThis.window.supabase = {
  createClient: () => ({
    from: (t) => chain(DATA[t] || []),
    auth: { onAuthStateChange() {}, getSession: async () => ({ data: { session: null } }), signOut() {} },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null }), upload: async () => ({ error: null }), remove: async () => ({}) }) },
    rpc: () => chain([]),
  }),
};

/* Static check: an element whose id lives inside a container that later gets
   its innerHTML reassigned is destroyed at runtime. Looking it up afterwards
   returns null and throws. The fake DOM cannot see this, so check the source.
   (This is the exact bug that broke the Setup tab's colour wheel.) */
function checkClobberedIds() {
  const wiped = new Set([...src.matchAll(/\$\("([a-zA-Z0-9_]+)"\)\s*\.innerHTML\s*=/g)].map((m) => m[1]));
  const problems = [];
  for (const parent of wiped) {
    // grab the parent element's markup block and any ids nested inside it
    const open = new RegExp(`<([a-z]+)[^>]*id="${parent}"[^>]*>`, "i").exec(html);
    if (!open) continue;
    const tag = open[1];
    const start = open.index + open[0].length;
    const close = html.indexOf(`</${tag}>`, start);
    if (close === -1) continue;
    const inner = html.slice(start, close);
    for (const m of inner.matchAll(/id="([a-zA-Z0-9_]+)"/g)) {
      const child = m[1];
      if (new RegExp(`\\$\\("${child}"\\)`).test(src)) {
        problems.push(`${child} (inside #${parent}, whose innerHTML is reassigned)`);
      }
    }
  }
  return problems;
}

/* Structural check. A single unclosed <div> nests every panel inside the first
   one, so hiding one tab hides the whole app. This shipped once; never again. */
{
  let markup = html.replace(/<script>[\s\S]*?<\/script>/g, "")
                   .replace(/<style>[\s\S]*?<\/style>/g, "")
                   .replace(/<!--[\s\S]*?-->/g, "");
  const opens = (markup.match(/<div\b/g) || []).length;
  const closes = (markup.match(/<\/div>/g) || []).length;
  if (opens !== closes) {
    console.log(`  STRUCTURE           div balance ${opens - closes} (unclosed tags)`);
    process.exit(1);
  }
  let depth = 0;
  const depths = {};
  for (const m of markup.matchAll(/<div\b[^>]*>|<\/div>|<nav\b/g)) {
    const t = m[0];
    if (t.startsWith("<div")) {
      depth++;
      const id = /id="(tab-[a-z]+)"/.exec(t);
      if (id) depths[id[1]] = depth;
    } else if (t === "</div>") depth--;
    else if (t === "<nav") depths.__nav = depth;
  }
  const levels = new Set(Object.entries(depths).filter(([k]) => k.startsWith("tab-")).map(([, v]) => v));
  if (levels.size > 1) {
    console.log("  STRUCTURE           tab panels are nested inside each other:", JSON.stringify(depths));
    process.exit(1);
  }
  console.log("  structure            ok (panels are siblings, nav outside)");
}

let failed = 0;
const clobbered = checkClobberedIds();
if (clobbered.length) {
  failed++;
  console.log("  ids destroyed by an innerHTML wipe but still looked up:");
  clobbered.forEach((p) => console.log("    " + p));
  console.log("");
}

try {
  new Function(src + ";globalThis.__t={showApp,loadAll,renderHome,renderWorkoutTab,renderProgressTab,renderSetupTab,switchTab,renderFab,renderTodayTally,renderScaleCheck,renderBodyTab,renderAdminPanel,renderPRSteppers};")();
} catch (e) {
  console.log("TOP-LEVEL ERROR:", e.message);
  process.exit(1);
}

globalThis.ME = "Mo";
globalThis.MY_EMAIL = "mo.shareef@creativelab1.com";
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
  ["renderAdminPanel", () => t.renderAdminPanel()],
  ["renderPRSteppers", () => t.renderPRSteppers()],
  ["switchTab progress", () => t.switchTab("progress")],
  ["switchTab setup", () => t.switchTab("setup")],
  ["renderScaleCheck", () => t.renderScaleCheck()],
  ["renderFab", () => t.renderFab()],
]) {
  try { await run(); console.log(`  ${name.padEnd(20)} ok`); }
  catch (e) { failed++; console.log(`  ${name.padEnd(20)} THREW: ${e.message}`); console.log("    " + (e.stack || "").split("\n")[1]?.trim()); }
}
if (MISSES.size) { failed++; console.log("\n  ids used in JS but MISSING from markup:", [...MISSES].join(", ")); }
console.log(failed ? "\nBOOT CHECK FAILED" : "\nBOOT CHECK PASSED");
process.exit(failed ? 1 : 0);
