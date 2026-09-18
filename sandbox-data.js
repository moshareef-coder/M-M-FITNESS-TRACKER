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
  /* Paid and unpaid are a second axis, not a scenario of their own: whether
     the account can reach the generator, the week planner, the progress
     analysis and the accent colours is a question that applies to Mo just as
     much whether he is paired or alone. Before this the fake is_premium rpc
     below fell through to `{ data: null }` unconditionally, which reads as
     false, so the sandbox could never actually show what a paying account
     sees. Default is paid: most of what gets reviewed here is the product,
     not the paywall, and the paywall itself is one click away on ?paid=0. */
  const PAID = qs.get("paid") !== "0";

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
    /* Six characters, padded, because a real invite code always is and the
       code screen refuses to send anything shorter. "MO" sat in the Your code
       panel for months looking like a bug. */
    avatar_path: null, timezone: "America/Los_Angeles", invite_code: (name.toUpperCase() + "XXXXXX").slice(0, 6),
    /* A body, because the calorie maths refuses without one and the Recovery
       screen is the first screen that asks for it. Without these three the
       sandbox could only ever show the "I need your height" case, which is the
       one state a fixture does not need to be permanently stuck in.
       soloNoData still reaches it: it clears the weigh-ins, and no weight
       means no TDEE however tall somebody is. */
    height_in: name === "Mell" ? 65 : 70, age: name === "Mell" ? 31 : 34, activity_level: "Moderate",
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

        /* Twelve weeks behind today, so anything that reads a trend has one to
           read. Before this the fixture held eight logs across four days and no
           lift appeared on more than one day, which meant every strength answer
           came back "holding" and the screen looked broken when the data was.

           Each lift is deliberately a different shape, because the point is that
           the four answers are distinguishable:
             Bench Press        the weight climbs, 165 to 195
             Barbell Back Squat the weight never moves, the reps go 5 to 9
             Lat Pulldown       genuinely flat, same weight same reps
             Hanging Leg Raise  bodyweight, so there is no load to compare
           Mell is the mirror: her lower body climbs and her pressing does not. */
        ...[
          ["Bench Press",       [[-84, 165, 5], [-63, 170, 5], [-42, 180, 5], [-21, 190, 5], [-7, 195, 5]]],
          ["Barbell Back Squat",[[-84, 225, 5], [-56, 225, 6], [-35, 225, 8], [-14, 225, 9]]],
          ["Lat Pulldown",      [[-77, 130, 10], [-49, 130, 10], [-28, 130, 10]]],
          ["Overhead Press",    [[-70, 95, 6], [-35, 100, 6], [-14, 105, 6]]],
          ["Hanging Leg Raise", [[-63, null, 12], [-28, null, 14], [-9, null, 15]]],
        ].flatMap(([exercise_name, rows], li) =>
          rows.map(([d, weight, reps], ri) => ({
            id: `h${li}_${ri}`, email: ME, user_name: "Mo", entry_date: day(d),
            exercise_name, sets: 3, reps, weight, created_at: day(d) + "T08:00:00Z",
          }))),
        ...[
          ["Hip Thrust", [[-84, 135, 10], [-56, 155, 10], [-28, 175, 10], [-7, 185, 10]]],
          ["Leg Press",  [[-77, 180, 12], [-42, 200, 12], [-14, 230, 12]]],
          ["Bench Press",[[-70, 65, 8], [-35, 65, 8], [-14, 65, 8]]],
        ].flatMap(([exercise_name, rows], li) =>
          rows.map(([d, weight, reps], ri) => ({
            id: `hm${li}_${ri}`, email: THEM, user_name: "Mell", entry_date: day(d),
            exercise_name, sets: 3, reps, weight, created_at: day(d) + "T07:00:00Z",
          }))),
      ],
      ai_workouts: [
        { id: "w1", email: ME, entry_date: day(0), archived: false, focus: "Push Day", created_at: day(0) + "T05:00:00Z", exercises: pushWorkout,
          /* The engine's timed blocks ride on the row apart from `exercises`
             (ai_workouts.mobility). Two moves each, short, so a walkthrough
             reaches the first lift in under a minute. */
          mobility: {
            warmup: [
              { name: "Arm Circles", seconds: 20, perSide: false, group: "shoulders", kind: "dynamic", prepares: ["horizontalPush", "verticalPush"], cue: "Start with small circles and let them grow. Keep the ribs down so the movement happens at the shoulder." },
              { name: "Cross-Body Arm Swings", seconds: 20, perSide: false, group: "chest", kind: "dynamic", prepares: ["horizontalPush", "horizontalPull"], cue: "Swing the arms wide open, then cross them in front. Stay relaxed, this is not a stretch you force." },
            ],
            cooldown: [
              { name: "Doorway Chest Stretch", seconds: 20, perSide: false, group: "chest", kind: "static", cue: "Forearms on the frame, step through until the chest opens. Breathe out into it." },
              { name: "Overhead Triceps Stretch", seconds: 20, perSide: true, group: "triceps", kind: "static", cue: "Elbow to the ceiling, hand down the spine, ease the elbow back with the other hand." },
            ],
            /* Ramp-up sets (CONTRACT.md workout.rampSets), which a stated
               session length longer than the day needs buys. They ride in this
               same column because they are the other thing that is never a
               working set: never logged, never counted, never calibrated
               against. The first main gets the full ladder, the second main the
               one rung the research prescribes there. */
            ramp: [
              { exercise: "Bench Press", group: "chest", seconds: 270, sets: [
                { weight: 0, reps: 8, restSec: 45, pct: 0, cue: "The bar on its own, the machine empty, or the lightest weight you have." },
                { weight: 95, reps: 5, restSec: 45, pct: 0.5, cue: null },
                { weight: 130, reps: 3, restSec: 60, pct: 0.7, cue: null },
                { weight: 165, reps: 2, restSec: 60, pct: 0.88, cue: null },
              ] },
              { exercise: "Overhead Press", group: "shoulders", seconds: 75, sets: [
                { weight: 65, reps: 3, restSec: 60, pct: 0.7, cue: null },
              ] },
            ],
            skipped: false,
          } },
        /* Two more days already planned, because a week with one workout on it
           cannot show what Plan your week is for: rearranging the days. A gap
           between them is deliberate too, so a drag has an empty day to cross
           and to land on. */
        { id: "w2", email: ME, entry_date: day(1), archived: false, focus: "Pull Day", created_at: day(0) + "T05:00:00Z",
          exercises: [
            { name: "Lat Pulldown", sets: 4, reps: 10, targetWeight: 130 },
            { name: "Seated Cable Row", sets: 3, reps: 12, targetWeight: 120 },
            { name: "Face Pull", sets: 3, reps: 15, targetWeight: 40 },
            { name: "Barbell Curl", sets: 3, reps: 10, targetWeight: 60 },
          ] },
        { id: "w3", email: ME, entry_date: day(3), archived: false, focus: "Leg Day", created_at: day(0) + "T05:00:00Z",
          exercises: [
            { name: "Barbell Back Squat", sets: 4, reps: 6, targetWeight: 245 },
            { name: "Romanian Deadlift", sets: 3, reps: 10, targetWeight: 185 },
            { name: "Leg Press", sets: 3, reps: 12, targetWeight: 300 },
            { name: "Standing Calf Raise", sets: 4, reps: 15, targetWeight: 120 },
          ] },
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
        /* Mine goes, so onboarding runs. Hers stays, because a brand new
           account is new to a world other people are already in: with the
           table emptied outright there was nobody to pair with, and the
           partner step in onboarding had no code to accept and no name to
           put on the screen somebody sees when they arrive holding an
           invite. */
        db.profiles = db.profiles.filter((p) => p.email !== ME);
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

    /* A day already holding one session, with the next still to do. Mo: "one
       session for yoga in the morning, one session to work out." The yoga is a
       finished activity (an exercise_logs row with minutes on it, which is all
       an activity ever is) and the push day is the untouched plan beside it, so
       the workout tab has to show two sessions and the weekly ring has to still
       read one day. The fit_entries row carries sessions: 1 because only the
       yoga has been banked so far. */
    twoSessions: {
      label: "Two sessions today",
      apply: (db) => {
        db.exercise_logs = db.exercise_logs.filter((e) => e.email !== ME || e.entry_date !== day(0));
        db.exercise_logs.push({
          id: "yoga1", email: ME, user_name: "Mo", entry_date: day(0),
          exercise_name: "Yoga", sets: 1, duration_min: 35, created_at: day(0) + "T07:10:00Z",
        });
        db.fit_entries = db.fit_entries.filter((e) => e.email !== ME || e.entry_date !== day(0));
        db.fit_entries.push({ id: "e2s", email: ME, user_name: "Mo", entry_date: day(0),
          weight: 189.2, gym: true, sessions: 1, workout_at: day(0) + "T07:45:00Z" });
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

    /* ---- the three states nobody could look at ----
       Every empty-state finding in the audit lived in a world the sandbox
       could not build, which is exactly why they stayed unfixed: you cannot
       design a screen you cannot open. These three make them openable. */

    soloNoData: {
      label: "Alone, nothing logged",
      apply: (db) => {
        db.partnerships = [];
        db.profiles = db.profiles.filter((p) => p.email === ME);
        db.fit_entries = []; db.exercise_logs = []; db.ai_workouts = [];
        db.saved_workouts = []; db.session_reactions = []; db.user_goals = [];
        db.body_photos = []; db.live_sessions = []; db.live_clips = [];
        try { localStorage.setItem("ft_solo", "1"); } catch {}
      },
    },

    invitePending: {
      label: "Invite sent, not accepted",
      apply: (db) => {
        // A real pending row: sent by me, never answered. The app looks for an
        // accepted partnership, does not find one, and falls through.
        db.partnerships = [{ id: "p-pending", inviter_email: ME, invitee_email: THEM,
          status: "pending", created_at: day(-1) + "T09:00:00Z", responded_at: null }];
        db.profiles = db.profiles.filter((p) => p.email === ME);
        db.fit_entries = db.fit_entries.filter((e) => e.email === ME);
        db.exercise_logs = db.exercise_logs.filter((e) => e.email === ME);
        db.session_reactions = [];
        try { localStorage.removeItem("ft_solo"); } catch {}
      },
    },

    /* ---- the consent handshake ----
       20260915_consent_and_leak_close.sql makes a redeemed code a REQUEST, with
       the person who typed it as inviter_email and the person whose code it was
       as invitee_email. These three are the states that direction produces, and
       none of them can occur until that migration is applied. The stranger has
       no profiles row on purpose: you cannot read someone's profile until you
       accept, so an address is genuinely all the screen has to show. */
    pairRequest: {
      label: "Someone wants to pair with you",
      apply: (db) => {
        db.partnerships = [{ id: "p-in-1", inviter_email: "chris.h@sandbox", invitee_email: ME,
          status: "pending", created_at: ago(90), responded_at: null }];
        db.profiles = db.profiles.filter((p) => p.email === ME);
        db.fit_entries = db.fit_entries.filter((e) => e.email === ME);
        db.exercise_logs = db.exercise_logs.filter((e) => e.email === ME);
        db.session_reactions = [];
        try { localStorage.removeItem("ft_solo"); localStorage.removeItem("ft_declined_pairs"); } catch {}
      },
    },

    pairRequests: {
      label: "Three requests, one of them again",
      apply: (db) => {
        // The migration caps outstanding requests at three, so three is the
        // widest this screen ever gets. The last one has been turned down twice
        // already, which is the case the screen has to say out loud.
        db.partnerships = [
          { id: "p-in-1", inviter_email: "chris.h@sandbox", invitee_email: ME, status: "pending", created_at: ago(90), responded_at: null },
          { id: "p-in-2", inviter_email: "dani@sandbox", invitee_email: ME, status: "pending", created_at: ago(300), responded_at: null },
          { id: "p-in-3", inviter_email: "someone.you.blocked@sandbox", invitee_email: ME, status: "pending", created_at: ago(20), responded_at: null },
        ];
        db.profiles = db.profiles.filter((p) => p.email === ME);
        db.fit_entries = db.fit_entries.filter((e) => e.email === ME);
        db.exercise_logs = db.exercise_logs.filter((e) => e.email === ME);
        db.session_reactions = [];
        try {
          localStorage.removeItem("ft_solo");
          localStorage.setItem("ft_declined_pairs", JSON.stringify({ "someone.you.blocked@sandbox": 2 }));
        } catch {}
      },
    },

    pairRefused: {
      label: "They turned you down",
      apply: (db) => {
        // The dismissal is local and per row, so the fixture has to clear it
        // or the screen only ever shows on the first person to open it.
        try { localStorage.removeItem("ft_pair_no_seen"); } catch {}
        db.partnerships = [{ id: "p-no", inviter_email: ME, invitee_email: THEM,
          status: "declined", created_at: day(-1) + "T09:00:00Z", responded_at: ago(120) }];
        db.profiles = db.profiles.filter((p) => p.email === ME);
        db.fit_entries = db.fit_entries.filter((e) => e.email === ME);
        db.exercise_logs = db.exercise_logs.filter((e) => e.email === ME);
        db.session_reactions = [];
        try { localStorage.removeItem("ft_solo"); } catch {}
      },
    },

    pairedNoData: {
      label: "Paired, day one",
      apply: (db) => {
        // Both people are in and neither has trained. Every shared surface has
        // to hold up with two names and no history behind either of them.
        db.fit_entries = []; db.exercise_logs = []; db.ai_workouts = [];
        db.saved_workouts = []; db.session_reactions = []; db.user_goals = [];
        db.body_photos = []; db.live_sessions = []; db.live_clips = [];
        db.partnerships = db.partnerships.map((p) => ({ ...p,
          created_at: day(0) + "T08:00:00Z", responded_at: day(0) + "T08:00:00Z" }));
      },
    },
  };

  const DB = baseWorld();
  (SCENARIOS[SCENARIO] || SCENARIOS.paired).apply(DB);

  window.__SANDBOX = { scenario: SCENARIO, scenarios: SCENARIOS, db: DB, me: ME, them: THEM, paid: PAID };

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
        /* And every column of the conflict target, not just the first. Taking
           only "email" off "email,entry_date" meant every ai_workouts upsert
           matched whichever row this person happened to own first, so saving
           tomorrow's plan overwrote today's and the sandbox showed a day
           losing a workout that production keeps. A composite key has to be
           composite or it is testing a different database. */
        const on = (opts && opts.onConflict ? opts.onConflict : (list[0]?.id != null ? "id" : table === "profiles" ? "email" : "id"))
          .split(",").map((c) => c.trim()).filter(Boolean);
        rows = list.map((p) => {
          const keyed = on.every((c) => p[c] != null);
          const hit = !keyed ? null : (DB[table] ??= []).find((r) => on.every((c) => low(r[c]) === low(p[c])));
          if (hit) { Object.assign(hit, p); return hit; }
          /* profiles.invite_code is a server default on INSERT, and the partner
             step reads it straight back out to put on screen. Without it here
             that line stays blank in the sandbox and looks like a bug in the
             step rather than a thing the fixture never did. */
          const row = { id: "s-" + Math.random().toString(36).slice(2, 9),
            ...(table === "profiles" && !p.invite_code
              ? { invite_code: Math.random().toString(36).slice(2, 8).toUpperCase() } : {}),
            ...p };
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
      /* lock_partnership_parties, the one rule of it a screen can walk into.
         A sandbox that lets a client write over a declined row would have
         shown the refused screen's dismissal working when production refuses
         the write, which is the exact bug this fixture exists to prevent. */
      if (pending && pending.kind === "update" && table === "partnerships"
          && pending.patch.status && rows.some((r) => r.status === "declined")) {
        pending = null;
        return Promise.resolve({ data: null, error: { message: "a declined request is final" } });
      }
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

  /* The three pairing RPCs, ported from 20260915_consent_and_leak_close.sql,
     because an accept screen whose buttons do nothing is not reviewable. Only
     the branches the screens can reach are here, verdict shapes included: note
     that redeem returns ok:false with pending:true, which is the whole reason
     the client needed patching. Every other rpc still resolves to null, which
     is what its callers already expect. */
  const pRows = () => (DB.partnerships ??= []);
  const party = (r, e) => low(r.inviter_email) === low(e) || low(r.invitee_email) === low(e);

  function rpcRedeem(code) {
    const tidy = String(code || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (tidy.length !== 6) return { ok: false, error: "Codes are 6 characters" };
    const target = DB.profiles.find((p) => String(p.invite_code || "").toUpperCase() === tidy);
    if (!target) return { ok: false, error: "That code does not match anyone" };
    if (low(target.email) === low(ME)) return { ok: false, error: "That is your own code" };

    /* Their no, on the ordered pair, permanent. Checked here and not further
       down because the order is the migration's: a person who has already been
       refused is told so before anything else is looked at. */
    if (pRows().some((r) => r.status === "declined"
      && low(r.inviter_email) === low(ME) && low(r.invitee_email) === low(target.email)))
      return { ok: false, blocked: true,
               error: "You have already asked them. If you both want this, they can type your code instead." };
    if (pRows().some((r) => r.status === "accepted" && (party(r, ME) || party(r, target.email))))
      return { ok: false, error: "One of you already has a partner" };

    // They asked me first. Both of us have acted, so this is a pairing.
    const theirs = pRows().find((r) => r.status === "pending"
      && low(r.inviter_email) === low(target.email) && low(r.invitee_email) === low(ME));
    if (theirs) {
      theirs.status = "accepted";
      theirs.responded_at = new Date().toISOString();
      return { ok: true, partner_name: target.user_name, partner_email: low(target.email) };
    }
    if (pRows().some((r) => r.status === "pending"
      && low(r.inviter_email) === low(ME) && low(r.invitee_email) === low(target.email)))
      return { ok: false, pending: true, partner_name: target.user_name,
               error: `You already asked ${target.user_name}. Waiting on them.` };
    if (pRows().filter((r) => r.status === "pending" && low(r.inviter_email) === low(ME)).length >= 3)
      return { ok: false, error: "You have three pair requests out already. Wait for one of them." };

    pRows().push({ id: "s-" + Math.random().toString(36).slice(2, 9), inviter_email: ME,
      invitee_email: low(target.email), status: "pending",
      created_at: new Date().toISOString(), responded_at: null });
    return { ok: false, pending: true, partner_name: target.user_name,
             error: `Request sent to ${target.user_name}. They need to accept it in the app.` };
  }

  /* The one time link RPCs from 20260917_invite_links.sql, ported for the same
     reason as the three above: the partner step in onboarding leads with Send
     an invite, and a button whose rpc resolves to null cannot be reviewed.

     Tokens live in this array and nowhere else, which is all one tab needs.
     One of them is seeded as a link THEY sent, so the other half of that step,
     the screen somebody sees when they arrived holding an invite, is reachable
     too: load the app with ?j=sandboxinvitefrommell1 and peek answers for it. */
  const DEMO_TOKEN = "sandboxinvitefrommell1";
  const LINKS = [{ token: DEMO_TOKEN, owner_email: THEM, revoked_at: null, claimed_at: null }];
  const liveLink = (token) => LINKS.find((l) => l.token === token && !l.revoked_at && !l.claimed_at);

  function rpcCreateLink() {
    if (pRows().some((r) => r.status === "accepted" && party(r, ME)))
      return { ok: false, error: "You already have a partner" };
    // One live link at a time, the way the function does it: sharing twice is
    // one invitation sent two ways, not two invitations.
    LINKS.forEach((l) => { if (low(l.owner_email) === low(ME) && !l.claimed_at) l.revoked_at = Date.now(); });
    const token = ("sbx" + Math.random().toString(36).slice(2)).padEnd(22, "0").slice(0, 22);
    LINKS.push({ token, owner_email: ME, revoked_at: null, claimed_at: null });
    return { ok: true, token };
  }

  function rpcPeekLink(token) {
    const link = liveLink(token);
    // One answer for every kind of no, exactly as the migration argues.
    if (!link) return { ok: false, error: "This invite is no longer active" };
    const owner = DB.profiles.find((p) => low(p.email) === low(link.owner_email));
    return { ok: true, name: (owner && owner.user_name) || "Someone", code: owner && owner.invite_code };
  }

  function rpcClaimLink(token) {
    const link = liveLink(token);
    if (!link) return { ok: false, error: "This invite is no longer active" };
    if (low(link.owner_email) === low(ME)) return { ok: false, error: "That is your own invite" };
    if (pRows().some((r) => r.status === "accepted" && (party(r, ME) || party(r, link.owner_email))))
      return { ok: false, error: "One of you already has a partner" };

    link.claimed_at = Date.now();
    link.claimed_by = ME;
    pRows().push({ id: "s-" + Math.random().toString(36).slice(2, 9), inviter_email: low(link.owner_email),
      invitee_email: ME, status: "accepted",
      created_at: new Date().toISOString(), responded_at: new Date().toISOString() });
    const owner = DB.profiles.find((p) => low(p.email) === low(link.owner_email));
    return { ok: true, partner_name: (owner && owner.user_name) || "Your partner",
             partner_email: low(link.owner_email) };
  }

  function rpcRespond(id, accept) {
    const inv = pRows().find((r) => r.id === id && r.status === "pending" && low(r.invitee_email) === low(ME));
    if (!inv) return { ok: false, error: "That request is no longer open" };
    const now = new Date().toISOString();
    if (!accept) { inv.status = "declined"; inv.responded_at = now; return { ok: true, accepted: false }; }
    inv.status = "accepted";
    inv.responded_at = now;
    /* Everything else they were asked stops being an open question, as
       'ended' and never 'declined'. You get one partner, so picking somebody
       is not a refusal of everyone else, and recorded as one it would bar
       them from ever asking again off a no that was never said. */
    pRows().forEach((r) => {
      if (r.status === "pending" && r.id !== id && low(r.invitee_email) === low(ME)) {
        r.status = "ended"; r.responded_at = now;
      }
    });
    return { ok: true, accepted: true, partner_email: low(inv.inviter_email) };
  }

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
        rpc: async (name, args) => {
          const a = args || {};
          if (name === "redeem_invite_code") return { data: rpcRedeem(a.code), error: null };
          if (name === "respond_to_pair_invite") return { data: rpcRespond(a.p_id, a.p_accept), error: null };
          if (name === "create_invite_link") return { data: rpcCreateLink(), error: null };
          if (name === "peek_invite_link") return { data: rpcPeekLink(a.p_token), error: null };
          if (name === "claim_invite_link") return { data: rpcClaimLink(a.p_token), error: null };
          if (name === "revoke_invite_link") {
            LINKS.forEach((l) => { if (low(l.owner_email) === low(ME) && !l.claimed_at) l.revoked_at = Date.now(); });
            return { data: { ok: true }, error: null };
          }
          if (name === "rotate_invite_code") {
            const me = DB.profiles.find((p) => low(p.email) === low(ME));
            const fresh = "Q" + Math.random().toString(36).slice(2, 7).toUpperCase();
            if (!me) return { data: { ok: false, error: "No profile yet" }, error: null };
            me.invite_code = fresh;
            return { data: { ok: true, invite_code: fresh }, error: null };
          }
          if (name === "is_premium") return { data: PAID, error: null };
          return { data: null, error: null };
        },
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
      /* `notes` too: the real function returns it, the reveal renders it, and
         leaving it out of the fake made every sentence the plan says about
         itself invisible in the one place the app is reviewed. */
      const { workout, honest, meta, notes } = generateFromPayload(payload);
      window.__SANDBOX.lastGenerated = { payload, workout, honest, meta, notes };
      return new Response(JSON.stringify({ workout, honest, meta, notes }), {
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
