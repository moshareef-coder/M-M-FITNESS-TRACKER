/* Verifies the milestone-badge check() functions against realistic fixture
   data. boot-check.mjs cannot do this: its loadAll() call there is fire-and-
   forget for checkNewMilestoneBadges, and process.exit() fires before that
   promise chain settles, so it only proves the badge code does not crash
   loadAll's synchronous portion, never that a check actually fires correctly.
     node scripts/badge-check-test.mjs

   Two scenarios: a long-running paired account that should earn every one of
   the 11 badges exactly once, and a brand-new solo account that should earn
   none. Both run the real MILESTONE_BADGES catalog and checkNewMilestoneBadges
   lifted straight out of index.html, the same way boot-check does. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const bootSrc = src.replace(/import\("\.\/knowledge\//g, `import("${root}/knowledge/`);

const ids = [...html.matchAll(/id="([a-zA-Z0-9_-]+)"/g)].map((m) => m[1]);
const mk = (id) => ({
  id, textContent: "", innerHTML: "", value: "", checked: false, disabled: false, title: "",
  dataset: {}, files: [], style: { setProperty() {}, width: "" },
  classList: { add() {}, remove() {}, toggle() { return false; }, contains() { return false; } },
  addEventListener() {}, removeEventListener() {},
  querySelectorAll() { return []; }, querySelector() { return mk("child"); },
  appendChild() {}, focus() {}, click() {}, getContext() { return null; },
  setAttribute() {}, getAttribute() { return null; }, removeAttribute() {}, remove() {},
  insertAdjacentHTML() {}, scrollIntoView() {}, closest() { return null; },
  // Real DOM has these; the fake one needs them too, since the celebration
  // path (confettiBurst, buzz) genuinely runs in this test, not just loadAll.
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 40 }; },
  animate() { return { onfinish: null }; },
  parentElement: { appendChild() {} },
  set onclick(v) {}, set onchange(v) {}, set oninput(v) {},
});

function makeSandbox(data) {
  const nodes = {};
  ids.forEach((i) => (nodes[i] = mk(i)));
  globalThis.document = {
    getElementById: (id) => nodes[id] || (nodes[id] = mk(id)),
    querySelectorAll: () => [], querySelector: () => null,
    createElement: () => mk("tmp"), addEventListener() {}, hidden: false,
    documentElement: { getAttribute: () => "dark", setAttribute() {}, style: { setProperty() {} } },
    body: mk("body"),
  };
  globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  globalThis.location = { reload() {} };
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "#3b82f6" });
  globalThis.requestAnimationFrame = (fn) => { fn(0); return 0; };
  globalThis.cancelAnimationFrame = () => {};
  Object.defineProperty(globalThis, "navigator", { value: { onLine: true, vibrate: () => {} }, configurable: true });
  globalThis.Chart = function () { return { destroy() {} }; };

  const chain = (rows = []) => {
    const p = Promise.resolve({ data: rows, error: null });
    // Any unlisted filter/order method (lt, gt, is, neq...) just passes rows
    // through unfiltered: fine here, since every fixture below is shaped so
    // no code path needs a real filter to behave correctly.
    return new Proxy(p, {
      get(target, prop) {
        if (prop === "then" || prop === "catch" || prop === "finally") return target[prop].bind(target);
        if (prop === "maybeSingle") return () => Promise.resolve({ data: rows[0] || null, error: null });
        if (prop === "insert") return (row) => { data.__inserted.push(row); return chain([]); };
        if (prop === "upsert" || prop === "update" || prop === "delete") return () => chain([]);
        if (prop in target) return target[prop];
        return () => chain(rows);
      },
    });
  };
  data.__inserted = [];
  globalThis.window.supabase = {
    createClient: () => ({
      from: (t) => chain(data[t] || []),
      auth: { onAuthStateChange() {}, getSession: async () => ({ data: { session: null } }), signOut() {} },
      storage: { from: () => ({ createSignedUrl: async () => ({ data: null }), upload: async () => ({ error: null }), remove: async () => ({}) }) },
      rpc: () => chain([]),
      channel: () => ({ on() { return this; }, subscribe() { return this; } }),
      removeChannel: () => {},
    }),
  };
}

function boot(identity) {
  new Function(bootSrc + `;
    MY_EMAIL = ${JSON.stringify(identity.email)};
    ME = ${JSON.stringify(identity.name)};
    PARTNER_EMAIL = ${JSON.stringify(identity.partnerEmail || null)};
    MY_PARTNERSHIP = ${JSON.stringify(identity.partnership || null)};
    globalThis.__t = {
      loadAll, checkNewMilestoneBadges, MILESTONE_BADGES,
      get ALL_MILESTONE_BADGES() { return ALL_MILESTONE_BADGES; },
    };`)();
  return globalThis.__t;
}

let failed = 0;

/* ---- scenario one: a long-running paired account earns every badge ---- */
{
  const dates = (from, count) => Array.from({ length: count }, (_, i) => {
    const d = new Date(from + "T00:00:00");
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const MO = "mo.shareef@creativelab1.com", MEL = "mel@x.com";
  const gymRow = (email, name, weight) => (d) => ({ email, user_name: name, entry_date: d, gym: true, weight, sessions: 1 });

  const data = {
    profiles: [
      { email: MO, user_name: "Mo", tracked_metrics: ["weight", "prs"], challenge_target: 4 },
      { email: MEL, user_name: "Mel", tracked_metrics: ["weight"], challenge_target: 4 },
    ],
    fit_entries: [
      ...dates("2026-08-24", 4).map(gymRow(MO, "Mo", 180)),
      ...dates("2026-08-31", 4).map(gymRow(MO, "Mo", 180)),
      ...dates("2026-01-01", 95).map(gymRow(MEL, "Mel", 140)),   // combined with Mo, clears 100 together
      ...dates("2026-08-24", 4).map(gymRow(MEL, "Mel", 140)),
      ...dates("2026-08-31", 4).map(gymRow(MEL, "Mel", 140)),
    ],
    exercise_logs: [
      { email: MO, user_name: "Mo", entry_date: "2026-08-20", exercise_name: "Barbell Bench Press", weight: 135, reps: 8, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-27", exercise_name: "Barbell Bench Press", weight: 185, reps: 5, sets: 3 }, // new_pr, bodyweight_bench (>=180)
      // one session, every one of the 14 muscle groups -> full_body (and, for
      // the week it falls in, full_coverage too, since a week is a superset)
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Barbell Bench Press", weight: 135, reps: 8, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Overhead Press", weight: 65, reps: 8, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Shrug", weight: 90, reps: 10, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Lat Pulldown", weight: 120, reps: 10, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Romanian Deadlift", weight: 135, reps: 8, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Hammer Curl", weight: 30, reps: 10, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Tricep Pushdown", weight: 40, reps: 10, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Farmer Carry", weight: 50, reps: 10, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Plank", weight: null, duration_min: 5, sets: 1 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Russian Twist", weight: 20, reps: 12, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Hip Thrust", weight: 135, reps: 8, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Squat", weight: 185, reps: 5, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Leg Curl", weight: 90, reps: 10, sets: 3 },
      { email: MO, user_name: "Mo", entry_date: "2026-08-25", exercise_name: "Calf Raise", weight: 90, reps: 12, sets: 3 },
      // Mel PRs the same week as Mo -> double_pr_week
      { email: MEL, user_name: "Mel", entry_date: "2026-08-20", exercise_name: "Squat", weight: 95, reps: 8, sets: 3 },
      { email: MEL, user_name: "Mel", entry_date: "2026-08-26", exercise_name: "Squat", weight: 105, reps: 5, sets: 3 },
    ],
    ai_workouts: [],
    partnerships: [{ id: "p1", inviter_email: MO, invitee_email: MEL, status: "accepted", responded_at: "2025-08-01T00:00:00Z" }],
    body_photos: [{ id: "b1", email: MO, taken_on: "2026-08-20", path: "x/body/a.jpg" }],
    milestone_badges: [],
    encouragements: [],
  };
  makeSandbox(data);
  const t = boot({ email: MO, name: "Mo", partnerEmail: MEL, partnership: { responded_at: "2025-08-01T00:00:00Z" } });
  await t.loadAll();
  // loadAll's own badge check is fire-and-forget; give it a beat rather than
  // calling checkNewMilestoneBadges again, which would race the same insert.
  await new Promise((r) => setTimeout(r, 100));

  const earned = t.ALL_MILESTONE_BADGES.map((b) => b.badge_id).sort();
  const expected = ["first_workout", "full_body", "full_coverage", "goal_week", "two_weeks_running",
    "hundred_together", "new_pr", "double_pr_week", "bodyweight_bench", "first_photo", "one_year"].sort();
  const missing = expected.filter((id) => !earned.includes(id));
  const dupes = earned.filter((id, i) => earned.indexOf(id) !== i);
  const extra = earned.filter((id) => !expected.includes(id));
  if (missing.length || dupes.length || extra.length) {
    failed++;
    console.log("  paired account       FAILED");
    if (missing.length) console.log("    never earned:", missing.join(", "));
    if (dupes.length) console.log("    inserted twice:", [...new Set(dupes)].join(", "));
    if (extra.length) console.log("    unexpectedly earned:", extra.join(", "));
  } else {
    console.log(`  paired account       ok (all ${expected.length} badges, no duplicates)`);
  }
}

/* ---- scenario two: a brand-new solo account earns nothing ---- */
{
  const data = {
    profiles: [{ email: "new@x.com", user_name: "New", tracked_metrics: [], challenge_target: 4 }],
    fit_entries: [], exercise_logs: [], ai_workouts: [], partnerships: [], body_photos: [],
    milestone_badges: [], encouragements: [],
  };
  makeSandbox(data);
  const t = boot({ email: "new@x.com", name: "New" });
  await t.loadAll();
  await new Promise((r) => setTimeout(r, 100));
  const earned = t.ALL_MILESTONE_BADGES.map((b) => b.badge_id);
  if (earned.length) {
    failed++;
    console.log("  empty account        FAILED, earned:", earned.join(", "));
  } else {
    console.log("  empty account        ok (nothing earned)");
  }
}

console.log(failed ? "\nBADGE CHECK FAILED" : "\nBADGE CHECK PASSED");
process.exit(failed ? 1 : 0);
