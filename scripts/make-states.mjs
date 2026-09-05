/* Generates states.html: every screen state, side by side, for review without
   touching real data.
     node scripts/make-states.mjs

   WHY THIS EXISTS. Checking a change used to mean asking a real person to
   start a real workout, which logs a real session neither of them wanted.
   This renders the same screens from fixtures instead.

   WHY IT CANNOT GO STALE. It does not describe the app, it runs it: the CSS
   block, the Home markup and the render functions are all lifted out of
   index.html at build time. If a function is renamed this script fails loudly
   rather than quietly drawing last month's UI, which is exactly how
   design-sheet.html rotted.

   Every state renders into one hidden stage that carries the real element ids,
   then the resulting HTML is captured and the ids are stripped, so a page full
   of frames never has duplicate ids. Handlers are dropped in the capture; this
   is a gallery to look at, not an app to use. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, src, style, fonts, grab, fn, section, SNAP_SPECS, SNAP_PROFILES, SNAP_FILE } from "./lift.mjs";
import { hitsForExercise } from "../knowledge/anatomy/muscle-detail.mjs";
import { RIVE_TO_APP_GROUP } from "../knowledge/anatomy/rive-body.mjs";

/* ---- lift the real thing out of the app ---- */

const ICONS = grab(/\nconst ICON_PATHS = \{.*?\n\};\n/s, "ICON_PATHS");
const HEADER = grab(/ {2}<header class="top">.*?<\/header>\n/s, "the app header");
const HOME = src.match(/<!-- HOME TAB -->([\s\S]*?)<div id="tab-workout"/)[1];
const LIVE_SHEET = grab(/ {2}<div class="sheet-scrim hidden" id="liveScrim">[\s\S]*?<\/div>\n {2}<\/div>\n/, "the live sheet");
const CLIP_PILL = grab(/ {2}<button type="button" class="clip-pill hidden" id="clipPill"><\/button>\n/, "the clip pill");
const POP = grab(/ {2}<div class="pop-scrim hidden" id="popScrim">[\s\S]*?<\/div>\n {2}<\/div>\n/, "the popup shell");
const GEN = grab(/ {2}<div class="gen-scrim hidden" id="genScrim"[\s\S]*?<div class="gen-stage" id="genStage"><\/div>\n {2}<\/div>\n/, "the generating screen");
const SESSION_CARD = grab(/ {4}<div id="sessionCard" class="session-overlay hidden">[\s\S]*?<div id="sessionBody"><\/div>\n {4}<\/div>\n/, "the session card");

const FUNCS = [
  "icon", "personRing", "hydrateAvatars", "renderHero", "renderTopStreak",
  "entryOn", "dotHTML", "renderWeekStrips",
  "timelineSessions", "reactionsFor", "nameFor", "timelineItemHTML", "wireTimeline", "renderTimeline",
  "liveAgeMs", "liveStateLabel", "renderLiveCard", "renderLiveSheet",
  "classifyMuscles", "profileFor", "renderClipPill",
  "clipRecorderHTML", "clipViewerHTML", "clipGoneHTML",
  "formatRest", "renderSession", "openEffortInfo",
  "openWorkoutPrivacy", "workoutPrivacy", "defaultWorkoutPrivacy", "privacySummary", "workoutPrivacyLocked",
  "liveDetailsShared", "openGenOverlay", "paintGen", "stopGenTicker", "revealGeneratedPlan",
  "setGenWord", "startGenWordCycle", "stopGenWordCycle", "mountGenBody", "unmountGenBody",
  "startGenRaf", "stopGenRaf",
].map(fn).join("\n");

/* The working-muscles block is more than a function: caches, colour helpers
   and the snapshot queue. It comes over whole. */
const WORKING_MUSCLES = section("/* ---------- Working muscles ----------", "/* ---------- Watching someone train ----------");

/* The three switches are data, and a hand-copied copy of them would drift. */
const PRIVACY_ROWS = grab(/\nconst PRIVACY_ROWS = \[.*?\n\];\n/s, "PRIVACY_ROWS");
const GEN_STEPS = grab(/\nconst GEN_STEPS = \[.*?\n\];\n/s, "GEN_STEPS");
const GEN_WORDS = grab(/\nconst GEN_WORDS = \[.*?\n\];\n/s, "GEN_WORDS");

/* Data the extracted functions close over. Lifted whole rather than retyped,
   because a hand-copied muscle table would drift from the app's within a week. */
const DATA = [
  grab(/\nconst MUSCLE_RULES = \[.*?\n\];\n/s, "MUSCLE_RULES"),
  grab(/\nconst BODY_GROUP_LABELS = \{.*?\n\};\n/s, "BODY_GROUP_LABELS"),
].join("\n");

/* ---- the figures ----
   The muscle detail modules are ES modules the app imports at runtime. A
   standalone page cannot, so the answers for the gallery's exercises are
   worked out here in Node, with the app's own classifier, and embedded. */
const classifyMuscles = new Function(`${DATA}\n${fn("classifyMuscles")}\nreturn classifyMuscles;`)();
const GALLERY_EXERCISES = [...new Set([...SNAP_SPECS.map((s) => s.exerciseName), "Turkish Get-Up"])];
const HITS = Object.fromEntries(GALLERY_EXERCISES.map((name) =>
  [name.toLowerCase(), hitsForExercise(name, classifyMuscles(name))]));

/* The pictures themselves are WebGL, which Node does not have. snap-body.mjs
   draws them in a headless Chrome; without that file the slots stay empty and
   the build says so, loudly, because a gallery with blank bodies reads as a
   bug in the app. */
let SNAPS = {};
if (existsSync(SNAP_FILE)) SNAPS = JSON.parse(readFileSync(SNAP_FILE, "utf8"));
else console.warn("make-states: no scripts/.body-snaps.json, the figures will be blank. Run: node scripts/snap-body.mjs");

/* ---- the gallery page ---- */

const GALLERY_CSS = `
  .gal-wrap { max-width: 1400px; margin: 0 auto; padding: 0 18px 80px; }
  .gal-bar {
    position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; padding: 14px 0 12px; margin-bottom: 4px;
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px);
    border-bottom: 1px solid var(--border);
  }
  .gal-title { font-size: 21px; font-weight: 800; letter-spacing: -.03em; }
  .gal-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .gal-toc { display: flex; flex-wrap: wrap; gap: 6px; margin: 16px 0 4px; }
  .gal-toc a {
    font-size: 12.5px; font-weight: 600; text-decoration: none; color: var(--muted);
    border: 1px solid var(--border); border-radius: 100px; padding: 5px 11px; background: var(--panel);
  }
  .gal-toc a:hover { color: var(--text); }
  .gal-sub { color: var(--muted); font-size: 14px; max-width: 62ch; line-height: 1.5; margin: 0 0 22px; }
  .gal-controls { display: flex; gap: 8px; }
  .gal-btn {
    font: inherit; font-size: 14px; font-weight: 600; padding: 8px 14px; border-radius: 100px; cursor: pointer;
    background: var(--panel); border: 1px solid var(--border); color: var(--text);
  }
  .gal-btn.on { background: var(--accent); color: var(--on-accent); border-color: transparent; }
  .gal-group { margin-top: 34px; scroll-margin-top: 70px; }
  .gal-group h2 {
    font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted);
    font-weight: 800; margin: 0 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }
  .gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(393px, 1fr)); gap: 26px 20px; }
  @media (max-width: 460px) { .gal-grid { grid-template-columns: 1fr; } }
  .gal-frame { margin: 0; }
  .gal-cap { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
  .gal-num {
    font-size: 11px; font-weight: 800; color: var(--on-accent); background: var(--accent);
    border-radius: 100px; padding: 2px 8px; flex-shrink: 0; font-variant-numeric: tabular-nums;
  }
  .gal-name { font-size: 15.5px; font-weight: 700; }
  .gal-note { font-size: 12.5px; color: var(--muted); margin: 2px 0 8px; line-height: 1.4; }
  .gal-phone {
    width: 100%; max-width: 393px; border: 1px solid var(--border); border-radius: 20px; overflow: hidden;
    background: var(--bg); background-image: var(--page-wash);
  }
  .gal-phone .gal-inner { padding: 14px 18px 18px; }
  /* The sheet states are shown as the panel itself, not the dimmed overlay. */
  .gal-phone .partner-sheet { position: static; transform: none; max-height: none; border-radius: 0; }
  .gal-empty { color: var(--muted); font-size: 14px; padding: 20px; }
  /* The pill is fixed to the viewport in the app; here it sits in a box. */
  .gal-pillbox { position: relative; height: 92px; background: var(--panel-2); }
  /* Full-screen black surfaces, shown at phone proportions rather than fixed. */
  .gal-dark { position: relative; height: 560px; background: #000; display: flex; flex-direction: column; }
  .gal-dark .clip-top, .gal-dark .clip-bottom { position: absolute; }
  .gal-dark .clip-media { flex: 1; min-height: 0; }
  .gal-pillbox .clip-pill { position: absolute; top: 26px; animation: none; }
  /* The session screen covers the viewport in the app; here it is a card. */
  .gal-phone .session-overlay { position: static; animation: none; padding: 14px 18px 24px; }
  /* Same for the generating screen, which is fixed and full bleed in the app. */
  .gal-phone .gen-scrim { position: relative; height: 560px; animation: none; }
`;

const BODY = `<title>Fit Together Screen States</title>
${fonts}
<style>${style}</style>
<style>${GALLERY_CSS}</style>
<div class="gal-wrap">
  <div class="gal-bar">
    <div>
      <div class="gal-eyebrow">Fit Together</div>
      <div class="gal-title">Every screen state</div>
    </div>
    <div class="gal-controls">
      <button type="button" class="gal-btn on" id="galLight">Light</button>
      <button type="button" class="gal-btn" id="galDark">Dark</button>
    </div>
  </div>
  <p class="gal-sub">Drawn with the app's real stylesheet and its real render functions, fed fake data. Nothing here needs a logged workout, so we can go through it together and change what you don't like. Each state has a number: say "change 7" and I will know which one.</p>
  <nav class="gal-toc" id="galToc"></nav>
  <div id="galBody"></div>
</div>

<!-- The hidden stage. Real ids, real markup, one state at a time. -->
<div id="galStage" style="position:absolute;left:-9999px;top:0;width:393px;">
  <div id="app">
${HEADER}
    <span id="topDate" class="hidden"></span>
${HOME}
  </div>
${LIVE_SHEET}
${CLIP_PILL}
${SESSION_CARD}
${POP}
${GEN}
</div>

<script>
${ICONS}
${DATA}

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const initials = (n) => String(n).split(/\\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

/* ---- fixtures ----------------------------------------------------------
   One made-up week, shaped so the interesting states are all reachable by
   changing a variable rather than by editing markup. */

const TODAY = "2026-09-04";
const WEEK = ["2026-08-31","2026-09-01","2026-09-02","2026-09-03","2026-09-04","2026-09-05","2026-09-06"];
const DAY_LETTERS = ["M","T","W","T","F","S","S"];
const APP_VERSION = "states";
const LIVE_QUIET_MS = 3 * 60 * 1000;
const LIVE_GONE_MS = 25 * 60 * 1000;
const CLIP_SECONDS = 20;
let ALL_PROFILES = ${JSON.stringify(SNAP_PROFILES)};

const FACE = (c) => "data:image/svg+xml," + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='" + c + "'/>" +
  "<circle cx='60' cy='45' r='21' fill='#fff' opacity='.92'/><ellipse cx='60' cy='104' rx='36' ry='27' fill='#fff' opacity='.92'/></svg>");
const SHOT = (c) => "data:image/svg+xml," + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><rect width='160' height='120' fill='" + c + "'/>" +
  "<circle cx='80' cy='44' r='18' fill='#fff' opacity='.75'/><rect x='44' y='70' width='72' height='42' rx='10' fill='#fff' opacity='.75'/></svg>");

let ME = "Mo", MY_EMAIL = "mo@x", PARTNER_EMAIL = "mell@x";
let MY_DAYS = 4, MY_TARGET = 5, THEIR_DAYS = 4, THEIR_TARGET = 5;
let DAY_STREAK = 4, WEEK_STREAK = 0, TRAINED_TODAY = false, PLANNED_TOMORROW = null;
let ENTRIES = {}, ALL_PLANS = [], ALL_EXERCISE_LOGS = [], ALL_REACTIONS = [], LIVE_PARTNER = null;
let PARTNER_PROFILE = null;
let PENDING_PRIVACY = null, MY_PROFILE = null;
const saveSessionToStorage2 = () => {};
const applyWorkoutPrivacy = () => {};
const renderPlanPreview = () => {};

/* Effort points stand in for real data here: what matters for the gallery is
   the shape (a number, a lead) not the exact math, which lives in index.html. */
const MY_WEEK_XP = 85, THEIR_WEEK_XP = 60, TODAY_XP = 45, ENTRY_XP = 60;
const weekEffortXP = (name) => (name === ME ? MY_WEEK_XP : THEIR_WEEK_XP);
const todaysEffortXP = () => TODAY_XP;
const effortXPBetween = () => ENTRY_XP;

const partnerName = () => "Mell";
const currentWeekDates = () => WEEK;
const todayStr = () => TODAY;
const isoDate = (d) => d.toISOString().slice(0, 10);
const entriesFor = (n) => ENTRIES[n] || [];
const gymDaysThisWeek = (n) => (n === ME ? MY_DAYS : THEIR_DAYS);
const weeklyGoalFor = (e) => (e === MY_EMAIL ? MY_TARGET : THEIR_TARGET);
const todayEntryFor = () => (TRAINED_TODAY ? { gym: true } : null);
const sharedWeekStreak = () => WEEK_STREAK;
const sharedDayStreak = () => DAY_STREAK;
const isCoachedClient = () => false;
const MY_COACH = null;
const workoutSummary = (name, date) => {
  const logs = ALL_EXERCISE_LOGS.filter((l) => l.user_name === name && l.entry_date === date);
  return { logs, sets: logs.reduce((s, l) => s + (l.sets || 1), 0), mins: 0,
           names: [...new Set(logs.map((l) => l.exercise_name).filter(Boolean))] };
};
const displayFocus = (f) => f;
const deriveFocus = (names) => names[0] || "Workout";
const dayVolumeLb = (email, date) => ALL_EXERCISE_LOGS
  .filter((l) => l.email === email && l.entry_date === date)
  .reduce((s, l) => s + (l.sets || 1) * (l.reps || 0) * (l.weight || 0), 0);
const fmtVolume = (lb) => Math.round(lb).toLocaleString();
const relDayLabel = (d) => d === TODAY ? "Today" : d === "2026-09-03" ? "Yesterday" : "Tuesday";
const avatarUrlFor = async (e) => e === MY_EMAIL ? FACE("#2f5f92") : FACE("#a4533b");
const signedProofUrl = async () => SHOT("#4a5568");
const openDaySheet = () => {};
const switchTab = () => {};
const openSessionComment = () => {};
const toggleReaction = () => {};
const openLiveSheet = () => {};
const closeLiveSheet = () => {};
const openNoteComposer = () => {};
const openNextClip = () => {};
let SESSION = null, CLIP_INBOX = [], TODAY_WORKOUT = null;
/* Animation bookkeeping renderSession reads. The gallery is a still life, so
   these stay null and nothing animates in a captured frame. */
let SESSION_JUST_SET = null, SESSION_LAST_EX = 0;
const beatLive = () => {};
const startRestTicker = () => {};
const stopRestTicker = () => {};
const saveSessionToStorage = () => {};
const clearSessionStorage = () => {};
const closeSessionUI = () => {};
const renderWorkoutTab = () => {};
const renderSessionComplete = () => {};
const toggleSet = () => {};
const startNextSet = () => {};
const jumpToExercise = () => {};
const finishExerciseAndAdvance = () => {};
/* The app loads these as ES modules. Here the answers are baked in. */
let riveBodyPromise = null, bodyDetailPromise = null;
const ensureRiveBodyModule = () => Promise.resolve(RIVE_BODY);
const ensureBodyDetailModules = () => Promise.resolve(BODY_DETAIL);
let BODY_DETAIL = { detail: { hitsForExercise: (name) => HITS[String(name).toLowerCase()] || null } };
const HITS = ${JSON.stringify(HITS)};

${PRIVACY_ROWS}
${GEN_STEPS}
${GEN_WORDS}
let genTimer = null, genPct = 0, genStepAt = 0, genWordTimer = null, genWordAt = 0, genBodyCtrl = null;
let genRaf = null, genRevShown = 0;
${FUNCS}
${WORKING_MUSCLES}

RIVE_BODY = { RIVE_TO_APP_GROUP: ${JSON.stringify(RIVE_TO_APP_GROUP)} };
/* Pre-drawn by snap-body.mjs, both themes, so nothing here touches WebGL. */
const SNAPS = ${JSON.stringify(SNAPS)};
for (const [k, v] of Object.entries(SNAPS)) BODY_SNAP_CACHE.set(k, v);
ensureBodySnap = (key) => { if (!BODY_SNAP_CACHE.has(key)) console.warn("no snapshot for " + key + ", run node scripts/snap-body.mjs"); };

/* ---- the fixtures each state starts from ---- */

function resetFixtures() {
  ME = "Mo"; MY_EMAIL = "mo@x"; PARTNER_EMAIL = "mell@x";
  MY_DAYS = 4; MY_TARGET = 5; THEIR_DAYS = 4; THEIR_TARGET = 5;
  DAY_STREAK = 4; WEEK_STREAK = 0; TRAINED_TODAY = false; PLANNED_TOMORROW = null;
  LIVE_PARTNER = null;
  PARTNER_PROFILE = null;
  ENTRIES = {
    Mo: [
      { entry_date: "2026-08-31", gym: true, proof_path: "p", workout_at: "2026-08-31T07:10:00" },
      { entry_date: "2026-09-01", gym: true, proof_path: "p", workout_at: "2026-09-01T07:20:00" },
      { entry_date: "2026-09-02", rest_day: true },
      { entry_date: "2026-09-03", gym: true, workout_at: "2026-09-03T18:10:00" },
      { entry_date: "2026-09-04", gym: true, proof_path: "p", workout_at: "2026-09-04T07:35:00" },
    ],
    Mell: [
      { entry_date: "2026-08-31", gym: true, proof_path: "p" },
      { entry_date: "2026-09-01", weight: 141 },
      { entry_date: "2026-09-02", gym: true, proof_path: "p" },
      { entry_date: "2026-09-03", gym: true, proof_path: "p", workout_at: "2026-09-03T18:20:00" },
      { entry_date: "2026-09-04", gym: true, workout_at: "2026-09-04T06:40:00" },
    ],
  };
  ALL_PLANS = [
    { id: "w1", email: "mo@x", entry_date: "2026-09-04", completed_at: "x", focus: "Chest & Triceps", duration_sec: 3600, exercises: [] },
    { id: "w2", email: "mell@x", entry_date: "2026-09-03", completed_at: "x", focus: "Leg Day", duration_sec: 2700, exercises: [] },
    { id: "w3", email: "mell@x", entry_date: "2026-09-04", focus: "Leg Day", exercises: [
      { name: "Barbell Squat", sets: 4, reps: 8 }, { name: "Romanian Deadlift", sets: 3, reps: 10 },
      { name: "Walking Lunge", sets: 3, reps: 12 }, { name: "Leg Press", sets: 4, reps: 10 },
      { name: "Calf Raise", sets: 3, reps: 15 }] },
  ];
  ALL_EXERCISE_LOGS = [
    { email: "mo@x", user_name: "Mo", entry_date: "2026-09-04", sets: 3, reps: 10, weight: 415, exercise_name: "Bench" },
    { email: "mell@x", user_name: "Mell", entry_date: "2026-09-03", sets: 4, reps: 10, weight: 222, exercise_name: "Squat" },
    { email: "mo@x", user_name: "Mo", entry_date: "2026-09-03", sets: 3, reps: 8, weight: 300, exercise_name: "Bench" },
  ];
  ALL_REACTIONS = [
    { id: "1", from_email: "mell@x", to_email: "mo@x", entry_date: "2026-09-04", kind: "comment", message: "Beast mode!" },
    { id: "2", from_email: "mell@x", to_email: "mo@x", entry_date: "2026-09-04", kind: "heart" },
  ];
}

const liveRow = (over = {}) => ({
  email: "mell@x", user_name: "Mell", focus: "Leg Day", workout_id: "w3",
  exercise_name: "Barbell Squat", exercise_index: 0, exercise_count: 5,
  set_done: 2, set_total: 4, state: "working", elapsed_sec: 1140,
  last_beat_at: new Date().toISOString(), ...over,
});

/* The exerciser's side. Mo, three exercises into a push day. */
const sessionFixture = (over = {}) => {
  TODAY_WORKOUT = { focus: "Push day", exercises: [
    { name: "Bench Press", sets: 4, reps: 8, note: "Pause a beat on the chest. Elbows about 45 degrees." },
    { name: "Overhead Press", sets: 3, reps: 10 }, { name: "Incline Dumbbell Press", sets: 3, reps: 10 },
    { name: "Romanian Deadlift", sets: 3, reps: 10 }, { name: "Triceps Pushdown", sets: 3, reps: 12 }] };
  SESSION = { exerciseIndex: 0, setsDone: [[true, true, false, false], [false, false, false], [false, false, false], [false, false, false], [false, false, false]],
    setWeights: [[185, 185]], weights: [185, 95, 60, 225, 50], reps: [8, 10, 10, 10, 12], completed: [false, false, false, false, false],
    restStartedAt: null, ...over };
};

/* ---- what to show ---- */

const STATES = [
  { group: "Home", name: "Everyday, both of you going",
    note: "The one you see most: partner paired, both mid-week, nobody live.",
    setup: () => {} },

  { group: "Home", name: "Partner is training right now",
    note: "The live card takes the top of the screen. Red dot pulses.",
    setup: () => { LIVE_PARTNER = liveRow(); } },

  { group: "Home", name: "Partner live, but their phone locked",
    note: "Beat older than 3 minutes. It says so instead of pretending.",
    setup: () => { LIVE_PARTNER = liveRow({ last_beat_at: new Date(Date.now() - 7 * 60000).toISOString(), state: "resting" }); } },

  { group: "Home", name: "You have already trained today",
    note: "The green button turns into planning tomorrow.",
    setup: () => { TRAINED_TODAY = true; } },

  { group: "Home", name: "Tomorrow is already planned",
    note: "No button at all, just the line and a way to clear it.",
    setup: () => { TRAINED_TODAY = true; PLANNED_TOMORROW = { id: "p1", focus: "Pull day" }; } },

  { group: "Home", name: "Brand new, nothing logged",
    note: "First run. Empty rings, no streak, empty week, empty timeline.",
    setup: () => {
      MY_DAYS = 0; THEIR_DAYS = 0; DAY_STREAK = 0; WEEK_STREAK = 0;
      ENTRIES = { Mo: [], Mell: [] }; ALL_PLANS = []; ALL_EXERCISE_LOGS = []; ALL_REACTIONS = [];
    } },

  { group: "Home", name: "Training on your own",
    note: "No partner: one ring, centred, no legend, no timeline from them.",
    setup: () => { PARTNER_EMAIL = null; ENTRIES.Mell = []; ALL_REACTIONS = []; } },

  { group: "Home", name: "One of you is behind",
    note: "Different counts, so the line names both instead of saying 'each'.",
    setup: () => { MY_DAYS = 4; THEIR_DAYS = 1; DAY_STREAK = 0; WEEK_STREAK = 2; } },

  { group: "Home", name: "Week streak instead of day streak",
    note: "Days beat weeks when both exist; this is what weeks look like.",
    setup: () => { DAY_STREAK = 0; WEEK_STREAK = 3; } },

  { group: "Home", name: "Partner keeps workouts private",
    note: "The effort line still says who trained harder this week. Her live card and yesterday's timeline row lose the specifics; the number stays.",
    setup: () => { LIVE_PARTNER = liveRow(); PARTNER_PROFILE = { share_workout_details: false }; } },

  { group: "Watching them train", name: "Working, mid set",
    note: "Set dots fill as they log. Up next comes from their plan.",
    sheet: true, setup: () => { LIVE_PARTNER = liveRow(); } },

  { group: "Watching them train", name: "Resting between sets",
    setup: () => { LIVE_PARTNER = liveRow({ state: "resting", set_done: 3 }); }, sheet: true },

  { group: "Watching them train", name: "Paused",
    setup: () => { LIVE_PARTNER = liveRow({ state: "paused", elapsed_sec: 2100 }); }, sheet: true },

  { group: "Watching them train", name: "Screen off, still in it",
    note: "What a watcher sees once the beats stop coming.",
    setup: () => { LIVE_PARTNER = liveRow({ last_beat_at: new Date(Date.now() - 9 * 60000).toISOString() }); }, sheet: true },

  { group: "Watching them train", name: "Last exercise, nothing next",
    setup: () => { LIVE_PARTNER = liveRow({ exercise_index: 4, exercise_name: "Calf Raise", set_done: 1, set_total: 3 }); }, sheet: true },

  { group: "Watching them train", name: "They just finished while you were looking",
    note: "The row goes away mid-watch. This is the fallback.",
    setup: () => { LIVE_PARTNER = null; }, sheet: true },

  { group: "Watching them train", name: "A pull exercise, back lit up",
    note: "The figure is per exercise, so front and back change as they move through the plan. Same anatomy as the Body tab, her body since she is a woman.",
    setup: () => { LIVE_PARTNER = liveRow({ exercise_name: "Barbell Row", exercise_index: 1, set_done: 1, set_total: 3 }); }, sheet: true },

  { group: "Watching them train", name: "An exercise the classifier does not know",
    note: "No figure rather than a body with nothing lit.",
    setup: () => { LIVE_PARTNER = liveRow({ exercise_name: "Turkish Get-Up" }); }, sheet: true },

  { group: "Watching them train", name: "This one keeps it private",
    note: "Name, sets and the muscle figure are gone. Live status, elapsed time and today's effort score stay, so how hard never needs to reveal at what.",
    setup: () => { LIVE_PARTNER = liveRow(); PARTNER_PROFILE = { share_workout_details: false }; }, sheet: true },

  { group: "Generating a workout", name: "Working on it",
    note: "Comes up from the bottom when you press generate. The body builds from the feet up as it works, with a scan line at the height it has reached. The figure itself is live WebGL, so this still frame shows the chamber without it.",
    gen: () => { openGenOverlay("Generating"); paintGen(62); }, setup: () => {} },

  { group: "Generating a workout", name: "The plan lands",
    note: "Each exercise fades up in turn, about 70ms apart, so five are in within half a second. The figure fades back behind them rather than leaving.",
    gen: () => {
      openGenOverlay("Generating");
      paintGen(100);
      $("genScrim").classList.add("done");
      const plan = [["Bench Press", 4, 8], ["Overhead Press", 3, 10], ["Incline Dumbbell Press", 3, 10],
        ["Triceps Pushdown", 3, 12], ["Lateral Raise", 3, 15]];
      const rows = plan.map((ex, i) =>
        '<div class="gen-row" style="--d:' + (i * 70) + 'ms"><span class="gen-row-n">' + (i + 1) + '</span>' +
        '<span class="gen-row-b"><span class="gen-row-name">' + ex[0] + '</span>' +
        '<span class="gen-row-t">' + ex[1] + ' sets \u00b7 ' + ex[2] + ' reps</span></span></div>').join("");
      $("genStage").innerHTML =
        '<div class="gen-done-head">Your workout</div>' +
        '<div class="gen-focus">Push Day</div>' +
        '<div class="gen-rows">' + rows + '</div>' +
        '<button type="button" class="btn-primary gen-go">Let\u2019s go</button>';
    }, setup: () => {} },

  { group: "Getting a clip mid-workout", name: "A clip is waiting",
    note: "Sits above the session screen. Only ever exists during a workout.",
    pill: true,
    setup: () => { SESSION = { finished: false }; CLIP_INBOX = [{ id: "c1", from_email: "mell@x", path: "x" }]; } },

  { group: "Getting a clip mid-workout", name: "More than one waiting",
    pill: true,
    setup: () => { SESSION = { finished: false }; CLIP_INBOX = [
      { id: "c1", from_email: "mell@x", path: "x" }, { id: "c2", from_email: "mell@x", path: "y" }]; } },

  { group: "Getting a clip mid-workout", name: "Opening it",
    note: "Plays once, full screen. The video area is black here because there is no file.",
    raw: () => clipViewerHTML("Mell", ""), setup: () => {} },

  { group: "Getting a clip mid-workout", name: "After it plays",
    note: "Then it is deleted, file and row, and this closes itself.",
    raw: () => clipGoneHTML(), setup: () => {} },

  { group: "Sending a clip", name: "The recorder",
    note: "Up to twenty seconds. Tap the shutter again to stop early; the ring shows time used. The camera fills the screen in the app.",
    raw: () => clipRecorderHTML("Mell"), setup: () => {} },

  { group: "Home", name: "How effort is scored",
    note: "Tapping the effort line opens this. Three lines, the real numbers from the formula, and why two people can be compared when one of them shares nothing.",
    pop: () => openEffortInfo(), setup: () => {} },

  { group: "Home", name: "Advanced settings for one workout",
    note: "Opened from the plan screen before you press Begin, or the small chip on the session card once you have. Defaults come from Settings, changes here last one workout.",
    pop: () => openWorkoutPrivacy(),
    setup: () => { SESSION = null; PENDING_PRIVACY = { live: true, details: false, cheers: true }; } },

  { group: "Watching them train", name: "They turned messages off",
    note: "Cheer buttons are gone rather than greyed. The database refuses the clip too, so it is not a UI-only promise.",
    setup: () => { LIVE_PARTNER = liveRow({ allow_cheers: false }); }, sheet: true },

  { group: "What they see while training", name: "Mid set, bench press",
    note: "The exerciser's own screen. Their body, lit in their colour, sits between the target and the set dots so they see what they are hitting before they log.",
    session: true, setup: () => { sessionFixture(); } },

  { group: "What they see while training", name: "Resting, a hip hinge",
    note: "Hamstrings and glutes are on the back, so the back figure carries the colour and the front stays quiet.",
    session: true, setup: () => { sessionFixture({ exerciseIndex: 3, restStartedAt: Date.now() - 48000,
      setsDone: [[true, true, true, true], [true, true, true], [true, true, true], [true, false, false], [false, false, false]],
      setWeights: [[185, 185, 185, 185], [95, 95, 95], [60, 60, 60], [225]], completed: [true, true, true, false, false] }); } },

  { group: "What they see while training", name: "An exercise the classifier does not know",
    note: "The card simply has no figure. Nothing else moves.",
    session: true, setup: () => { sessionFixture(); TODAY_WORKOUT.exercises[0] = { name: "Turkish Get-Up", sets: 3, reps: 5 }; } },
];

/* ---- render each state into the stage, then capture it ---- */

const stage = $("galStage");
const home = stage.querySelector("#tab-home");
const header = stage.querySelector("header.top");

/* Ids would collide across frames, and a captured frame is not interactive
   anyway, so they become data-was-id for debugging and nothing else. */
const deId = (h) => h.replace(/\\sid="([^"]+)"/g, ' data-was-id="$1"');

async function settle() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

async function renderHomeState() {
  $("avatarPair").innerHTML = '<span class="av me" data-av-email="' + MY_EMAIL + '">' + initials(ME) + "</span>" +
    (PARTNER_EMAIL ? '<span class="av them" data-av-email="' + PARTNER_EMAIL + '">' + initials(partnerName()) + "</span>" : "");
  hydrateAvatars($("avatarPair"));
  renderHero();
  renderTopStreak();
  await renderLiveCard();
  renderWeekStrips();
  await renderTimeline();
  await settle();
  return '<div class="gal-inner">' + deId(header.outerHTML + home.innerHTML) + "</div>";
}

/* Some states are just markup, with no data behind them. */
async function renderRawState(st) {
  return '<div class="gal-dark">' + deId(st.raw()) + "</div>";
}

async function renderPillState() {
  renderClipPill();
  await settle();
  const pill = $("clipPill");
  return '<div class="gal-pillbox">' + deId(pill.outerHTML) + "</div>";
}

async function renderSheetState() {
  await renderLiveSheet();
  await settle();
  return deId($("liveSheet").outerHTML);
}

async function renderGenState(st) {
  const scrim = $("genScrim");
  scrim.classList.remove("hidden");
  st.gen();
  stopGenTicker();           // a still frame, so no ticker is left running
  await settle();
  return deId(scrim.outerHTML);
}

async function renderPopState(st) {
  st.pop();
  await settle();
  return deId($("popCard").outerHTML);
}

async function renderSessionState() {
  const card = $("sessionCard");
  card.classList.remove("hidden");
  renderSession();
  await settle();
  return deId(card.outerHTML);
}

/* The figures are drawn per theme (their greys come from the tokens), so
   the toggle swaps every figure to its sibling in the other theme. */
const setTheme = (t) => {
  document.documentElement.setAttribute("data-theme", t);
  $("galLight").classList.toggle("on", t === "light");
  $("galDark").classList.toggle("on", t === "dark");
  document.querySelectorAll("img.wm-fig[data-snap]").forEach((img) => {
    const key = img.dataset.snap.replace(/\|(light|dark)\|/, "|" + t + "|");
    img.dataset.snap = key;
    const url = BODY_SNAP_CACHE.get(key);
    if (url) img.src = url; else img.removeAttribute("src");
  });
};

(async () => {
  /* The app's light palette lives behind html[data-theme="light"], so an
     un-stamped host would render this dark. Light is the app's default, so
     state it before anything is drawn: the figures pick their theme at
     render time. */
  setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

  const groups = new Map();
  for (let i = 0; i < STATES.length; i++) {
    const st = STATES[i];
    resetFixtures();
    st.setup();
    let html;
    try {
      html = st.raw ? await renderRawState(st)
           : st.pill ? await renderPillState()
           : st.sheet ? await renderSheetState()
           : st.gen ? await renderGenState(st)
           : st.pop ? await renderPopState(st)
           : st.session ? await renderSessionState()
           : await renderHomeState();
    } catch (e) {
      html = '<div class="gal-empty">This state threw: ' + escapeHtml(e.message) + "</div>";
      console.error(st.name, e);
    }
    if (!groups.has(st.group)) groups.set(st.group, []);
    groups.get(st.group).push(
      '<figure class="gal-frame">' +
        '<figcaption class="gal-cap"><span class="gal-num">' + (i + 1) + '</span>' +
          '<span class="gal-name">' + escapeHtml(st.name) + "</span></figcaption>" +
        (st.note ? '<p class="gal-note">' + escapeHtml(st.note) + "</p>" : "") +
        '<div class="gal-phone">' + html + "</div>" +
      "</figure>");
  }

  $("galBody").innerHTML = [...groups.entries()].map(([g, frames]) =>
    '<section class="gal-group" id="g-' + g.replace(/\\W+/g, "-").toLowerCase() + '"><h2>' + escapeHtml(g) +
      '</h2><div class="gal-grid">' + frames.join("") + "</div></section>"
  ).join("");
  stage.remove();

  $("galToc").innerHTML = [...groups.keys()].map((g) =>
    '<a href="#g-' + g.replace(/\\W+/g, "-").toLowerCase() + '">' + escapeHtml(g) + "</a>").join("");

  $("galLight").onclick = () => setTheme("light");
  $("galDark").onclick = () => setTheme("dark");
})();
</script>`;

/* Standalone, for opening the file directly. */
const page = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
${BODY}
</body>
</html>`;

/* A syntax error here produces a page that renders NOTHING, which looks like a
   slow load rather than a fault. Catch it at build time instead. The commonest
   cause is a stub colliding with a function lifted out of the app. */
{
  const js = BODY.slice(BODY.indexOf("<script>") + 8, BODY.lastIndexOf("</script>"));
  try { new Function(js); }
  catch (e) { throw new Error(`make-states: the generated script does not parse: ${e.message}`); }
}

writeFileSync(join(root, "states.html"), page);

/* Body-only, for publishing where the host supplies the skeleton. */
const embed = process.argv.indexOf("--embed");
if (embed > -1 && process.argv[embed + 1]) {
  writeFileSync(process.argv[embed + 1], BODY);
  console.log(`embed written to ${process.argv[embed + 1]}`);
}

const count = (BODY.match(/group: "/g) || []).length;
console.log(`states.html written (${count} states)`);
