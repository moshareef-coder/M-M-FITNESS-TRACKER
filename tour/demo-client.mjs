/* The onboarding tour's data layer, 2026-10-04.

   The opening of onboarding runs as a guided tour INSIDE the real app: the real
   Home, the real train together invite and lobby, the real session, the real
   Body and Progress tabs. Mo's rule: "it must look exactly like our app", so it
   is the app. What is not real is the data under it, which is this file: an
   in-memory stand-in for the Supabase client, holding a sample week for the new
   person and for Mell, a sample partner.

   Why a client and not fixtures: every screen in index.html reads and writes
   through `sb`. Swapping `sb` for this object for the length of the tour (see
   startObTour in index.html) means the screens run unchanged and every write
   they make lands in this file's arrays, which are thrown away when the tour
   ends. Nothing here can reach the network: it has no URL, no key and no fetch.
   index.html also blocks every request to the Supabase project while the tour
   runs, so a write that somehow went around `sb` would fail rather than land.

   Loaded only when the tour starts (a dynamic import), so nothing about it is
   on the app's boot path.

   The query builder is the sandbox's (sandbox-data.js), cut down to what the
   tour's screens call. Keep the two agreeing if either changes. */

const low = (v) => String(v == null ? "" : v).toLowerCase();
const clone = (rows) => rows.map((r, i) => ({ ...r, __i: i }));
const strip = (rows) => rows.map(({ __i, ...r }) => r);
const col = (row, c) => (c.startsWith("lower(") ? low(row[c.slice(6, -1)]) : row[c]);

function iso(d) { return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function day(n) { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); }

/* The sample world. The new person has a few weeks behind them (so Body and
   Progress have something to show) and no partner yet; Mell is a partner with
   her own history and a plan for today. `paired` starts them paired, for the
   invited path, whose partner is real and whose name `them` carries. */
export function demoWorld({ me, myName, them, theirName, paired = false }) {
  const profile = (email, name, extra = {}) => ({
    email, user_name: name, theme: "light", share_workout_details: true, avatar_path: null,
    timezone: "America/Los_Angeles", invite_code: (name.replace(/[^A-Za-z]/g, "").toUpperCase() + "XXXXXX").slice(0, 6),
    bonus_xp: 0, created_at: day(-40) + "T08:00:00Z",
    /* What Progress tracks, answered, so the tab opens on the graph rather
       than on its first-visit question. */
    tracked_metrics: ["weight", "prs", "trained"], ...extra,
  });
  const weights = [194.6, 194.1, 193.8, 194.2, 193.1, 192.6, 192.9, 191.8, 191.2, 191.6, 190.4, 190.1];
  const lifts = [
    ["Bench Press", [[-35, 155, 6], [-28, 160, 6], [-21, 165, 6], [-14, 165, 8], [-7, 170, 6]]],
    ["Barbell Back Squat", [[-33, 185, 6], [-26, 195, 6], [-19, 195, 7], [-12, 205, 6], [-5, 205, 7]]],
    ["Lat Pulldown", [[-31, 120, 10], [-24, 125, 10], [-17, 130, 10], [-10, 130, 12], [-3, 135, 10]]],
    ["Romanian Deadlift", [[-30, 135, 8], [-16, 145, 8], [-2, 155, 8]]],
  ];
  const mellPlan = [
    { name: "Goblet Squat", sets: 2, reps: 10, targetWeight: 35 },
    { name: "Push-Up", sets: 2, reps: 10, targetWeight: 0 },
  ];
  return {
    profiles: [
      profile(me, myName, { goal: "Lose weight", goal_bubble: "lose-weight", challenge_target: 3, sex: "Male", age: 34, height_in: 70 }),
      profile(them, theirName, { goal: "Get stronger", goal_bubble: "get-stronger", challenge_target: 3, sex: "Female", age: 31, height_in: 65 }),
    ],
    partnerships: paired ? [{ id: "p1", inviter_email: them, invitee_email: me, status: "accepted", created_at: day(0) + "T00:00:00Z", responded_at: day(0) + "T00:00:00Z" }] : [],
    fit_entries: [
      ...[-12, -10, -8, -5, -3, -1].map((d, i) => ({ id: "fe" + i, email: me, user_name: myName, entry_date: day(d), gym: true, sessions: 1, workout_at: day(d) + "T07:30:00Z" })),
      ...[-11, -9, -6, -4, -2].map((d, i) => ({ id: "fm" + i, email: them, user_name: theirName, entry_date: day(d), gym: true, sessions: 1, workout_at: day(d) + "T06:40:00Z" })),
    ],
    body_measurements: weights.map((w, i) => ({ id: "bm" + i, email: me, entry_date: day(-44 + i * 4), weight: w })),
    exercise_logs: [
      ...lifts.flatMap(([exercise_name, rows], li) => rows.map(([d, weight, reps], ri) => ({
        id: `h${li}_${ri}`, email: me, user_name: myName, entry_date: day(d), exercise_name, sets: 3, reps, weight, created_at: day(d) + "T08:00:00Z",
      }))),
      { id: "m1", email: them, user_name: theirName, entry_date: day(-2), exercise_name: "Hip Thrust", sets: 3, reps: 10, weight: 155, created_at: day(-2) + "T07:00:00Z" },
      { id: "m2", email: them, user_name: theirName, entry_date: day(-4), exercise_name: "Leg Press", sets: 3, reps: 12, weight: 200, created_at: day(-4) + "T07:00:00Z" },
    ],
    ai_workouts: [
      { id: "mw1", email: them, user_name: theirName, entry_date: day(0), archived: false, slot: 0, focus: "Full body", exercises: mellPlan, created_at: day(0) + "T05:00:00Z", completed_at: null },
    ],
    user_goals: [{ id: "g1", email: me, status: "active", goal_key: "lose", detail: "10 to 20 pounds", metric: "weight_lb",
      start_value: 195, target_value: 182, target_date: day(60), pace: "steady", days_per_week: 3 }],
    session_reactions: [], encouragements: [], live_sessions: [], live_clips: [], body_photos: [],
    exercise_swaps: [], milestone_badges: [], profile_limits: [], together_sessions: [], together_sets: [],
    push_subscriptions: [], apns_tokens: [], group_members: [], groups: [],
  };
}

export function createDemoClient(DB, { me }) {
  const ME = me;
  /* What the storage stub was handed, kept as object URLs so a proof photo
     taken in the tour shows on screen and goes nowhere. */
  const files = new Map();

  /* Column defaults the real tables have and a fresh row here would not.
     ai_workouts.archived defaults to false in the database, and the app reads
     today's plan with .eq("archived", false), so a row written without it
     vanished from the session halfway through. */
  const DEFAULTS = { ai_workouts: { archived: false } };

  function builder(table) {
    let rows = clone(DB[table] || []);
    let pending = null;
    const api = {
      select() { return api; },
      insert(payload) {
        const list = Array.isArray(payload) ? payload : [payload];
        rows = list.map((p) => ({ id: "d-" + Math.random().toString(36).slice(2, 9), created_at: new Date().toISOString(), ...(DEFAULTS[table] || {}), ...p }));
        (DB[table] ??= []).push(...rows);
        return api;
      },
      upsert(payload, opts) {
        const list = Array.isArray(payload) ? payload : [payload];
        const on = (opts && opts.onConflict ? opts.onConflict : (list[0]?.id != null ? "id" : table === "profiles" || table === "profile_limits" ? "email" : "id"))
          .split(",").map((c) => c.trim()).filter(Boolean);
        rows = list.map((p) => {
          const keyed = on.every((c) => p[c] != null);
          const hit = !keyed ? null : (DB[table] ??= []).find((r) => on.every((c) => low(r[c]) === low(p[c])));
          if (hit) { Object.assign(hit, p); return hit; }
          const row = { id: "d-" + Math.random().toString(36).slice(2, 9), created_at: new Date().toISOString(), ...(DEFAULTS[table] || {}), ...p };
          (DB[table] ??= []).push(row);
          return row;
        });
        return api;
      },
      update(patch) { pending = { kind: "update", patch }; return api; },
      delete() { pending = { kind: "delete" }; return api; },
      eq(c, v) { rows = rows.filter((r) => low(col(r, c)) === low(v)); return api; },
      neq(c, v) { rows = rows.filter((r) => r[c] !== v); return api; },
      is(c, v) { rows = rows.filter((r) => (v === null ? r[c] == null : r[c] === v)); return api; },
      lt(c, v) { rows = rows.filter((r) => (r[c] ?? 0) < v); return api; },
      lte(c, v) { rows = rows.filter((r) => (r[c] ?? 0) <= v); return api; },
      gt(c, v) { rows = rows.filter((r) => (r[c] ?? 0) > v); return api; },
      gte(c, v) { rows = rows.filter((r) => (r[c] ?? 0) >= v); return api; },
      in(c, list) { rows = rows.filter((r) => list.includes(r[c])); return api; },
      or() { return api; }, not() { return api; }, filter() { return api; }, range() { return api; },
      order(c, opts) {
        const asc = !opts || opts.ascending !== false;
        rows = rows.slice().sort((a, b) => String(a[c] ?? "").localeCompare(String(b[c] ?? "")) * (asc ? 1 : -1));
        return api;
      },
      limit(n) { rows = rows.slice(0, n); return api; },
      single() { return settle().then((r) => ({ data: r.data[0] || null, error: r.data.length ? null : { message: "no rows" } })); },
      maybeSingle() { return settle().then((r) => ({ data: r.data[0] || null, error: null })); },
      then(res, rej) { return settle().then(res, rej); },
    };
    function settle() {
      if (pending && pending.kind === "update") {
        for (const r of rows) {
          Object.assign(r, pending.patch);
          if (r.__i != null && DB[table]?.[r.__i]) Object.assign(DB[table][r.__i], pending.patch);
        }
      }
      if (pending && pending.kind === "delete") {
        const ids = new Set(rows.map((r) => r.id));
        DB[table] = (DB[table] || []).filter((r) => !ids.has(r.id));
      }
      pending = null;
      return Promise.resolve({ data: strip(rows), error: null });
    }
    return api;
  }

  const channel = () => { const ch = { on: () => ch, subscribe: () => ch, unsubscribe: () => {} }; return ch; };
  const session = { user: { email: ME, id: "tour-user", user_metadata: {} }, access_token: "tour" };

  return {
    __tour: true,
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }),
      updateUser: async () => ({ data: null, error: null }),
    },
    from: builder,
    rpc: async (name) => {
      /* The tour shows the paid app, the way somebody inside their free month
         sees it. */
      if (name === "is_premium") return { data: true, error: null };
      if (name === "create_invite_link") return { data: { ok: true, token: "tourtourtourtourtour00" }, error: null };
      return { data: null, error: null };
    },
    channel, removeChannel: () => {},
    functions: { invoke: async () => ({ data: null, error: { message: "not in the tour" } }) },
    storage: { from: () => ({
      upload: async (path, blob) => { files.set(path, URL.createObjectURL(blob)); return { data: { path }, error: null }; },
      createSignedUrl: async (path) => ({ data: files.has(path) ? { signedUrl: files.get(path) } : null, error: files.has(path) ? null : { message: "no file" } }),
      createSignedUrls: async (paths) => ({ data: paths.map((p) => ({ path: p, signedUrl: files.get(p) || null })), error: null }),
      remove: async () => ({ data: null, error: null }),
    }) },
  };
}
