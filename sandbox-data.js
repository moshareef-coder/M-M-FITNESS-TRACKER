/* Fixture data for the sandbox, 2026-09-07.
 *
 * This file exists so the REAL app can be clicked through without a real
 * account, a real partner, or a real workout. make-sandbox.mjs injects it
 * straight after the Supabase CDN tag, so it replaces window.supabase before
 * the app ever calls createClient(). Nothing here ships in production:
 * index.html is untouched and never loads this file.
 *
 * Everything is in memory. Writes work and stick until reload, which is what
 * makes the thing genuinely clickable rather than a slideshow: log a set and
 * the set is logged.
 */
(function () {
  const qs = new URLSearchParams(location.search);
  const SCENARIO = qs.get("scenario") || "paired";

  /* Local date, exactly the way the app computes todayStr(). Using
     toISOString() straight was a whole day out after 5pm Pacific, which
     silently made "today's workout" tomorrow's and left the session
     screen unreachable. */
  const iso = (d) => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();
  const ME = "mo@sandbox", THEM = "mell@sandbox";

  const profile = (email, name, extra = {}) => ({
    email, user_name: name, theme: "light", sex: name === "Mell" ? "Female" : "Male",
    goal: "Get stronger", challenge_target: 5, share_workout_details: true,
    avatar_path: null, timezone: "America/Los_Angeles", invite_code: name.toUpperCase().slice(0, 6),
    bonus_xp: 0, tracked_metrics: ["weight", "prs", "trained"], ...extra,
  });

  const pushWorkout = [
    { name: "Bench Press", sets: 4, reps: 8, targetWeight: 185, note: "Pause a beat on the chest. Elbows about 45 degrees." },
    { name: "Overhead Press", sets: 3, reps: 10, targetWeight: 95 },
    { name: "Incline Dumbbell Press", sets: 3, reps: 10, targetWeight: 60 },
    { name: "Triceps Pushdown", sets: 3, reps: 12, targetWeight: 50 },
    { name: "Lateral Raise", sets: 3, reps: 15, targetWeight: 20 },
  ];

  /* One base world, then each scenario bends it. Keeping them as edits of a
     shared base rather than seven separate worlds is what stops them drifting
     into seven different apps. */
  function baseWorld() {
    return {
      /* Mo's goal matches his user_goals row below (lose weight, a real weight
         target) rather than the shared default, so the two do not contradict
         each other the moment Progress starts reading profiles.goal to decide
         which card leads. */
      profiles: [profile(ME, "Mo", { goal: "Lose weight" }), profile(THEM, "Mell")],
      partnerships: [{ id: "p1", inviter_email: ME, invitee_email: THEM, status: "accepted",
        created_at: day(-30) + "T00:00:00Z", responded_at: day(-30) + "T00:00:00Z" }],
      fit_entries: [
        { id: "e1", email: ME, user_name: "Mo", entry_date: day(-4), weight: 191.2, gym: true, sessions: 1, workout_at: day(-4) + "T07:35:00Z" },
        { id: "e2", email: ME, user_name: "Mo", entry_date: day(-3), weight: 190.8, gym: true, sessions: 1, workout_at: day(-3) + "T07:20:00Z" },
        { id: "e3", email: ME, user_name: "Mo", entry_date: day(-2), weight: 190.1, gym: false, sessions: 0, rest_day: true },
        { id: "e4", email: ME, user_name: "Mo", entry_date: day(-1), weight: 189.6, gym: true, sessions: 1, workout_at: day(-1) + "T07:41:00Z" },
        { id: "e5", email: ME, user_name: "Mo", entry_date: day(0), weight: 189.3, gym: true, sessions: 1, workout_at: day(0) + "T07:05:00Z" },
        { id: "f1", email: THEM, user_name: "Mell", entry_date: day(-4), weight: 146.0, gym: true, sessions: 1 },
        { id: "f2", email: THEM, user_name: "Mell", entry_date: day(-2), weight: 145.4, gym: true, sessions: 1 },
        { id: "f3", email: THEM, user_name: "Mell", entry_date: day(0), weight: 145.1, gym: true, sessions: 1, workout_at: day(0) + "T06:40:00Z" },
      ],
      exercise_logs: [
        /* Today's session. Without it the Body tab and every "this week" number
           read as empty whenever the sandbox is opened on a Monday, which made
           the app look broken when it was the fixture that was. Deliberately a
           pull day, so today's push plan still has all five exercises left. */
        { id: "x0a", email: ME, user_name: "Mo", entry_date: day(0), exercise_name: "Lat Pulldown", sets: 4, reps: 10, weight: 130, created_at: day(0) + "T07:05:00Z" },
        { id: "x0b", email: ME, user_name: "Mo", entry_date: day(0), exercise_name: "Seated Cable Row", sets: 3, reps: 12, weight: 120, created_at: day(0) + "T07:20:00Z" },
        { id: "x0c", email: ME, user_name: "Mo", entry_date: day(0), exercise_name: "Barbell Curl", sets: 3, reps: 10, weight: 60, created_at: day(0) + "T07:32:00Z" },
        { id: "x1", email: ME, user_name: "Mo", entry_date: day(-1), exercise_name: "Barbell Back Squat", sets: 4, reps: 6, weight: 245, created_at: day(-1) + "T08:00:00Z" },
        { id: "x2", email: ME, user_name: "Mo", entry_date: day(-3), exercise_name: "Deadlift", sets: 3, reps: 5, weight: 315, created_at: day(-3) + "T08:00:00Z" },
        { id: "x3", email: ME, user_name: "Mo", entry_date: day(-4), exercise_name: "Bench Press", sets: 4, reps: 8, weight: 180, created_at: day(-4) + "T08:00:00Z" },
        { id: "x4", email: THEM, user_name: "Mell", entry_date: day(0), exercise_name: "Hip Thrust", sets: 4, reps: 12, weight: 135, created_at: day(0) + "T07:00:00Z" },
        { id: "x5", email: THEM, user_name: "Mell", entry_date: day(-2), exercise_name: "Leg Press", sets: 3, reps: 12, weight: 180, created_at: day(-2) + "T07:00:00Z" },
      ],
      ai_workouts: [
        { id: "w1", email: ME, entry_date: day(0), archived: false, focus: "Push Day", created_at: day(0) + "T05:00:00Z", exercises: pushWorkout },
      ],
      saved_workouts: [
        { id: "s1", email: ME, name: "Full body reset", focus: "Full body", created_at: day(-6) + "T10:00:00Z",
          exercises: [{ name: "Goblet Squat", sets: 3, reps: 12 }, { name: "Dumbbell Bench Press", sets: 3, reps: 10 },
            { name: "Seated Cable Row", sets: 3, reps: 12 }, { name: "Romanian Deadlift", sets: 3, reps: 10 }, { name: "Plank", sets: 3, reps: 30 }] },
        { id: "s2", email: ME, name: "Push and pull", focus: "Upper body", created_at: day(-5) + "T10:00:00Z", last_used_at: day(-2) + "T18:00:00Z",
          exercises: [{ name: "Dumbbell Bench Press", sets: 4, reps: 8 }, { name: "Lat Pulldown", sets: 4, reps: 10 },
            { name: "Seated Dumbbell Press", sets: 3, reps: 10 }, { name: "Dumbbell Row", sets: 3, reps: 10 }] },
      ],
      /* Matches the real 20260903_user_goals migration columns exactly
         (goal_key, metric, metric_ref, start_value, target_value) rather than
         inventing target_weight/start_weight, which are not real columns and
         once let a whole feature ship reading fields that do not exist. */
      user_goals: [{ id: "g1", email: ME, status: "active", goal_key: "lose", detail: "10 to 20 pounds",
        metric: "weight_lb", start_value: 195, target_value: 182, target_date: day(60), pace: "steady", days_per_week: 5 }],
      session_reactions: [{ id: "r1", from_email: THEM, to_email: ME, entry_date: day(-1), kind: "comment", message: "Beast mode!", created_at: day(-1) + "T09:00:00Z" }],
      encouragements: [], live_sessions: [], live_clips: [], body_photos: [],
      group_members: [], groups: [], push_subscriptions: [], nudge_log: [],
      /* Empty on purpose: a swap is something you do in the walkthrough, and
         the point of the step is watching the row land in here. */
      exercise_swaps: [],
    };
  }

  const liveRow = (extra = {}) => ({
    email: THEM, user_name: "Mell", focus: "Leg Day", exercise_name: "Barbell Back Squat",
    exercise_index: 0, exercise_count: 5, set_done: 2, set_total: 4,
    details_shared: true, allow_cheers: true, state: "working",
    elapsed_sec: 19 * 60, started_at: ago(19), last_beat_at: ago(0), ...extra,
  });

  /* A clip you cannot play is not a clip. Rather than ship a video file in the
     repo, draw one here and record it: MediaRecorder turns a canvas into a real
     playable blob, so the viewer, the loop and the two-watch rule all exercise
     the actual <video> path. Started at boot so it is ready before anyone taps.
     If the browser will not record, the app falls back to its own "that clip
     has gone" state, which is a real state worth seeing too. */
  let clipPromise = null;
  function demoClip() {
    if (clipPromise) return clipPromise;
    clipPromise = new Promise((resolve) => {
      try {
        const c = document.createElement("canvas");
        c.width = 240; c.height = 426;
        const g = c.getContext("2d");
        const stream = c.captureStream(12);
        const type = ["video/mp4", "video/webm;codecs=vp9", "video/webm"]
          .find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
        if (!type) return resolve("");
        const rec = new MediaRecorder(stream, { mimeType: type });
        const parts = [];
        rec.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
        rec.onstop = () => resolve(URL.createObjectURL(new Blob(parts, { type })));
        const t0 = performance.now();
        (function draw() {
          const t = (performance.now() - t0) / 1000;
          g.fillStyle = "#15181d"; g.fillRect(0, 0, 240, 426);
          g.save(); g.translate(120, 190);
          g.strokeStyle = "#ff6b4a"; g.lineWidth = 7; g.lineCap = "round";
          g.beginPath(); g.arc(0, 0, 52, -Math.PI / 2, -Math.PI / 2 + (t % 2) * Math.PI, false); g.stroke();
          g.restore();
          g.fillStyle = "#f2f4f7"; g.textAlign = "center";
          g.font = "600 16px -apple-system, system-ui, sans-serif";
          g.fillText("Mell", 120, 296);
          g.fillStyle = "#8b95a5"; g.font = "13px -apple-system, system-ui, sans-serif";
          g.fillText("set 3 of 4, back squat", 120, 318);
          g.fillStyle = "#4a515c"; g.font = "11px -apple-system, system-ui, sans-serif";
          g.fillText("sandbox clip", 120, 400);
          if (t < 2.6) requestAnimationFrame(draw);
        })();
        rec.start();
        setTimeout(() => { try { rec.stop(); } catch { resolve(""); } }, 2600);
      } catch { resolve(""); }
    });
    return clipPromise;
  }

  const SCENARIOS = {
    paired: { label: "Paired, mid-week", apply: () => {} },

    signedout: {
      label: "Signed out",
      signedOut: true,
      apply: (db) => { db.profiles = []; db.partnerships = []; },
    },

    fresh: {
      label: "Brand new account",
      apply: (db) => {
        db.profiles = [];            // no profile yet, so onboarding runs
        db.partnerships = [];
        db.fit_entries = []; db.exercise_logs = []; db.ai_workouts = [];
        db.saved_workouts = []; db.session_reactions = []; db.user_goals = [];
      },
    },

    solo: {
      label: "Training alone",
      apply: (db) => {
        db.partnerships = [];
        db.profiles = db.profiles.filter((p) => p.email === ME);
        db.fit_entries = db.fit_entries.filter((e) => e.email === ME);
        db.exercise_logs = db.exercise_logs.filter((e) => e.email === ME);
        db.session_reactions = [];
        try { localStorage.setItem("ft_solo", "1"); } catch {}
      },
    },

    live: {
      label: "Partner training now",
      apply: (db) => { db.live_sessions = [liveRow()]; },
    },

    /* Today's push day already logged, every exercise. startWorkout sees a plan
       with nothing left in it and goes straight to the wrap-up, which is the
       app's own route to that screen rather than a screen posed for the photo.
       The bench set is 190 against a best of 180, so the day carries a real PR
       and the finish screen has something to put in its third tile. */
    finished: {
      label: "Workout just finished",
      apply: (db) => {
        const plan = db.ai_workouts.find((w) => w.email === ME && !w.archived);
        const at = (i) => day(0) + "T0" + (8 + i) + ":00:00Z";
        db.exercise_logs = db.exercise_logs.filter((e) => e.email !== ME || e.entry_date !== day(0));
        (plan?.exercises || []).forEach((ex, i) => {
          db.exercise_logs.push({
            id: "fin" + i, email: ME, user_name: "Mo", entry_date: day(0),
            exercise_name: ex.name, sets: ex.sets, reps: ex.reps,
            weight: ex.name === "Bench Press" ? 190 : ex.targetWeight ?? null,
            created_at: at(i),
          });
        });
        if (plan) { plan.duration_sec = 47 * 60; plan.completed_at = day(0) + "T08:47:00Z"; }
        db.fit_entries = db.fit_entries.filter((e) => e.email !== ME || e.entry_date !== day(0));
        db.fit_entries.push({ id: "efin", email: ME, user_name: "Mo", entry_date: day(0),
          weight: 189.1, gym: true, sessions: 1, workout_at: day(0) + "T08:47:00Z" });
      },
    },

    livePrivate: {
      label: "Partner keeps it private",
      apply: (db) => {
        db.live_sessions = [liveRow({ details_shared: false, focus: null, exercise_name: null,
          exercise_index: 0, exercise_count: 0, set_done: 0, set_total: 0 })];
        db.profiles = db.profiles.map((p) => p.email === THEM ? { ...p, share_workout_details: false } : p);
      },
    },

    clip: {
      label: "A clip is waiting",
      apply: (db) => {
        db.live_sessions = [liveRow()];
        db.live_clips = [{ id: "c1", from_email: THEM, to_email: ME, path: "sandbox/clip.mp4",
          created_at: ago(1), viewed_at: null, views: 0 }];
      },
    },

    behind: {
      label: "You are behind",
      apply: (db) => {
        db.fit_entries = db.fit_entries.filter((e) => e.email !== ME || e.entry_date < day(-3));
        db.exercise_logs = db.exercise_logs.filter((e) => e.email !== ME);
        db.ai_workouts = [];   // no plan waiting either, or being behind has an easy out
      },
    },

    /* A rest day is a choice, not a missed day, and the app has to say so. This
       used to log a workout and call itself a rest day, which tested nothing. */
    restday: {
      label: "Rest day",
      apply: (db) => {
        db.exercise_logs = db.exercise_logs.filter((e) => e.email !== ME || e.entry_date !== day(0));
        db.fit_entries = db.fit_entries.filter((e) => e.email !== ME || e.entry_date !== day(0));
        db.fit_entries.push({ id: "e5", email: ME, user_name: "Mo", entry_date: day(0),
          weight: 189.3, gym: false, sessions: 0, rest_day: true });
        db.ai_workouts = [];
      },
    },
  };

  const DB = baseWorld();
  (SCENARIOS[SCENARIO] || SCENARIOS.paired).apply(DB);

  window.__SANDBOX = { scenario: SCENARIO, scenarios: SCENARIOS, db: DB, me: ME, them: THEM };

  /* ---- the stand-in client ---- */
  /* Clones carry their index into the table, so an update() can land on the
     real row. Before this, update wrote into the clone and vanished, which
     hid a missing write behind a passing walk. __i never leaves the builder. */
  const clone = (rows) => rows.map((r, i) => ({ ...r, __i: i }));
  const strip = (rows) => rows.map(({ __i, ...r }) => r);
  const low = (v) => String(v == null ? "" : v).toLowerCase();
  const col = (row, c) => (c.startsWith("lower(") ? low(row[c.slice(6, -1)]) : row[c]);

  function builder(table) {
    let rows = clone(DB[table] || []);
    let pending = null;   // rows to write on await, for insert/upsert/update/delete
    const api = {
      select() { return api; },
      insert(payload) {
        const list = Array.isArray(payload) ? payload : [payload];
        rows = list.map((p) => ({ id: "s-" + Math.random().toString(36).slice(2, 9), created_at: new Date().toISOString(), ...p }));
        (DB[table] ??= []).push(...rows);
        return api;
      },
      upsert(payload, opts) {
        const list = Array.isArray(payload) ? payload : [payload];
        /* Supabase resolves an upsert on the primary key. profiles is keyed by
           email and its fixture rows carry no id, so the old "id" default
           matched undefined to undefined and always hit row zero: right by
           accident for one user, wrong the moment there are two. */
        const on = (opts && opts.onConflict ? opts.onConflict : (list[0]?.id != null ? "id" : table === "profiles" ? "email" : "id")).split(",")[0].trim();
        rows = list.map((p) => {
          const hit = p[on] == null ? null : (DB[table] ??= []).find((r) => low(r[on]) === low(p[on]));
          if (hit) { Object.assign(hit, p); return hit; }
          const row = { id: "s-" + Math.random().toString(36).slice(2, 9), ...p };
          DB[table].push(row);
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
  const hasProfile = () => DB.profiles.some((p) => p.email === ME);

  window.supabase = {
    createClient() {
      return {
        auth: {
          getSession: async () => (SCENARIOS[SCENARIO] && SCENARIOS[SCENARIO].signedOut
            ? { data: { session: null }, error: null }
            : { data: { session: { user: { email: ME, id: "sandbox-user", user_metadata: { full_name: "Mo" } } } }, error: null }),
          getUser: async () => ({ data: { user: { email: ME, id: "sandbox-user" } }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          signInWithOAuth: async () => ({ error: null }),
          signInWithOtp: async () => ({ error: null }),
          signOut: async () => { location.reload(); return { error: null }; },
        },
        from: builder,
        rpc: async () => ({ data: null, error: null }),
        channel, removeChannel: () => {},
        functions: { invoke: async () => ({ data: null, error: { message: "not available in the sandbox" } }) },
        storage: { from: () => ({
          createSignedUrl: async () => ({ data: { signedUrl: await demoClip() }, error: null }),
          upload: async () => ({ error: null }),
          remove: async () => ({ error: null }),
        }) },
      };
    },
  };
  window.__SANDBOX.hasProfile = hasProfile;

  /* Generate for me posts to a Supabase edge function, which the sandbox has no
     way to reach. That function is about to become a thin wrapper around
     mo-knowledge/engine/adapter.mjs with no model call in between, so this is
     not a mock of the generator, it is the generator: same module, same
     output, one hop closer to the browser than production runs it. What Mo
     sees here is what ships.

     Every other request passes straight through untouched, real fetch and all. */
  const realFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (!url.includes("/functions/v1/generate-workout")) return realFetch(input, init);
    try {
      const payload = init && init.body ? JSON.parse(init.body) : {};
      const { generateFromPayload } = await import("/mo-knowledge/engine/adapter.mjs");
      const { workout, honest, meta } = generateFromPayload(payload);
      window.__SANDBOX.lastGenerated = { payload, workout, honest, meta };
      return new Response(JSON.stringify({ workout, honest, meta }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Sandbox engine failed", detail: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };

  if (SCENARIO === "clip") demoClip();   // start recording now, not when it is tapped
})();
