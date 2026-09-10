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

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, src, style, fonts, grab, fn, section, SNAP_SPECS, SNAP_PROFILES } from "./lift.mjs";
import { hitsForExercise, MUSCLE_PIECES, MUSCLE_HEADS } from "../knowledge/anatomy/muscle-detail.mjs";

/* ---- lift the real thing out of the app ---- */

const ICONS = grab(/\nconst ICON_PATHS = \{.*?\n\};\n/s, "ICON_PATHS");
const HEADER = grab(/ {2}<header class="top">.*?<\/header>\n/s, "the app header");
const HOME = src.match(/<!-- HOME TAB -->([\s\S]*?)<div id="tab-workout"/)[1];
const LIVE_SHEET = grab(/ {2}<div class="sheet-scrim hidden" id="liveScrim">[\s\S]*?<\/div>\n {2}<\/div>\n/, "the live sheet");
const CLIP_PILL = grab(/ {2}<button type="button" class="clip-pill hidden" id="clipPill"><\/button>\n/, "the clip pill");
const POP = grab(/ {2}<div class="pop-scrim hidden" id="popScrim">[\s\S]*?<\/div>\n {2}<\/div>\n/, "the popup shell");
const GEN = grab(/ {2}<div class="gen-scrim hidden" id="genScrim"[\s\S]*?<div class="gen-stage" id="genStage"><\/div>\n {2}<\/div>\n/, "the generating screen");
const SESSION_CARD = grab(/ {4}<div id="sessionCard" class="session-overlay hidden">[\s\S]*?<div id="sessionBody"><\/div>\n {4}<\/div>\n/, "the session card");
/* Whole tabs, lifted the same way Home is. Without these the gallery only ever
   showed Home and the session, which is how the Body tab drifted out of review
   entirely: it was not stale, it simply was not in here. */
const BODY_TAB = grab(/ {2}<!-- BODY TAB -->\n([\s\S]*?)\n {2}<!-- PROGRESS TAB -->/, "the body tab", 1);
const PROGRESS_TAB = grab(/ {2}<!-- PROGRESS TAB -->\n([\s\S]*?)\n {2}<!-- SETUP TAB -->/, "the progress tab", 1);

const FUNCS = [
  "icon", "personRing", "hydrateAvatars", "renderHero", "renderTopStreak",
  "entryOn", "dotHTML", "renderWeekStrips",
  "timelineSessions", "reactionsFor", "nameFor", "timelineItemHTML", "wireTimeline", "renderTimeline",
  "liveAgeMs", "liveStateLabel", "renderLiveCard", "renderLiveSheet",
  "classifyMuscles", "profileFor", "renderClipPill",
  "clipRecorderHTML", "clipViewerHTML", "clipGoneHTML", "clipSavedForLaterHTML", "clipSentHTML", "clipSendFailedHTML",
  "formatRest",
  "renderSession", "renderSessionComplete", "openEffortInfo", "openInfo", "infoDot",
  "openWorkoutPrivacy", "workoutPrivacy", "defaultWorkoutPrivacy", "privacySummary", "workoutPrivacyLocked",
  "liveDetailsShared", "openGenOverlay", "paintGen", "stopGenTicker", "revealGeneratedPlan",
  "setGenWord", "startGenWordCycle", "stopGenWordCycle", "mountGenBody", "unmountGenBody",
  "startGenRaf", "stopGenRaf", "writeRev",
  /* The Body tab. Everything that computes or draws HTML comes over; the Rive
     figure cannot run here and is stubbed below, so these render the rings,
     the ranked list and the detail panel exactly as the app does. */
  "bodyPeriodRange", "bodyPeriodWord", "bodyHeatColor", "bodyImpactLevel",
  "bodyImpactRank", "bodyFmtSets", "computeMuscleVolumeBetween", "computeMuscleDetailBetween",
  "countUp", "bodyCountUp", "bodyAreaStates", "avatarHTML",
  "renderBodyTab", "renderBodyList", "renderBodyRings", "renderBodyDetail",
  "renderBodyNext", "renderBodyShare",
  /* Progress. */
  "emptyState", "myTrackedMetrics", "renderScaleCheck", "renderMetricPicker", "renderLog",
  "renderProgressTab",
].map(fn).join("\n");

/* The working-muscles block is more than a function: caches, colour helpers
   and the snapshot queue. It comes over whole. */
const WORKING_MUSCLES = section("/* ---------- Working muscles ----------", "/* ---------- Watching someone train ----------");

/* The info topics are data too: every explainer in the app comes from here. */
const INFO = grab(/\nconst INFO_TOPICS = \{.*?\n\};\n/s, "INFO_TOPICS");

/* The three switches are data, and a hand-copied copy of them would drift. */
const PRIVACY_ROWS = grab(/\nconst PRIVACY_ROWS = \[.*?\n\];\n/s, "PRIVACY_ROWS");
const GEN_STEPS = grab(/\nconst GEN_STEPS = \[.*?\n\];\n/s, "GEN_STEPS");
const GEN_WORDS = grab(/\nconst GEN_WORDS = \[.*?\n\];\n/s, "GEN_WORDS");

/* Data the extracted functions close over. Lifted whole rather than retyped,
   because a hand-copied muscle table would drift from the app's within a week. */
const DATA = [
  grab(/\nconst MUSCLE_RULES = \[.*?\n\];\n/s, "MUSCLE_RULES"),
  grab(/\nconst BODY_GROUP_LABELS = \{.*?\n\};\n/s, "BODY_GROUP_LABELS"),
  grab(/\nconst MUSCLE_GROUPS = \[.*?\];\n/s, "MUSCLE_GROUPS"),
  grab(/\nconst BODY_IMPACT_TARGET = \{.*?\};\n/s, "BODY_IMPACT_TARGET"),
  grab(/\nconst BODY_RING_FILLERS = \[.*?\];\n/s, "BODY_RING_FILLERS"),
  grab(/\nconst BODY_HEAT_STOPS = \[.*?\n\];\n/s, "BODY_HEAT_STOPS"),
  grab(/\nconst COVERAGE_TARGETS = \[.*?\n\];\n/s, "COVERAGE_TARGETS"),
  grab(/\nconst TRACK_OPTIONS = \[.*?\n\];\n/s, "TRACK_OPTIONS"),
].join("\n");

/* ---- the working muscles ----
   The muscle detail modules are ES modules the app imports at runtime. A
   standalone page cannot, so the answers for the gallery's exercises are
   worked out here in Node, with the app's own classifier, and embedded. */
const classifyMuscles = new Function(`${DATA}\n${fn("classifyMuscles")}\nreturn classifyMuscles;`)();
const GALLERY_EXERCISES = [...new Set([...SNAP_SPECS.map((s) => s.exerciseName), "Turkish Get-Up"])];
const HITS = Object.fromEntries(GALLERY_EXERCISES.map((name) =>
  [name.toLowerCase(), hitsForExercise(name, classifyMuscles(name))]));

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
  .gal-title { font-size: 17px; font-weight: 800; letter-spacing: -.02em; }
  .gal-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
  .gal-sub { color: var(--muted); font-size: 12.5px; max-width: 66ch; line-height: 1.55; margin: 0; }
  .gal-controls { display: flex; gap: 8px; }
  .gal-btn {
    font: inherit; font-size: 12.5px; font-weight: 600; padding: 7px 13px; border-radius: 100px; cursor: pointer;
    background: var(--panel); border: 1px solid var(--border); color: var(--text);
  }
  .gal-btn.on { background: var(--accent); color: var(--on-accent); border-color: transparent; }

  :root { --gal-bar: 150px; }
  @media (max-width: 900px) { :root { --gal-bar: 218px; } }

  /* ---- the file shell: a tree on the left, the canvas on the right ---- */
  .fig { display: grid; grid-template-columns: 272px minmax(0, 1fr); min-height: 100vh; }
  .fig-side {
    position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto;
    background: var(--panel); border-right: 1px solid var(--border); padding: 18px 12px 40px;
  }
  .fig-file { padding: 0 8px 14px; border-bottom: 1px solid var(--border); margin-bottom: 12px; }
  .fig-file b { display: block; font-size: 14px; font-weight: 800; letter-spacing: -.01em; }
  .fig-file span { display: block; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-top: 3px; }
  .fig-tree { display: flex; flex-direction: column; gap: 2px; }
  .fig-page-btn {
    display: flex; align-items: center; gap: 7px; width: 100%; text-align: left; cursor: pointer;
    font: inherit; font-size: 13px; font-weight: 700; color: var(--text);
    background: none; border: none; border-radius: 8px; padding: 7px 8px;
  }
  .fig-page-btn:hover { background: var(--panel-2); }
  .fig-page-btn .caret { width: 10px; color: var(--muted); transition: transform .18s; display: inline-block; }
  .fig-page-btn.shut .caret { transform: rotate(-90deg); }
  .fig-page-btn .count { margin-left: auto; font-size: 11px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
  .fig-kids { display: flex; flex-direction: column; gap: 1px; margin: 0 0 6px 9px; padding-left: 9px; border-left: 1px solid var(--border); }
  .fig-page-btn.shut + .fig-kids { display: none; }
  .fig-sec-label {
    display: flex; align-items: center; gap: 8px; text-decoration: none;
    font-size: 10.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
    color: var(--muted); padding: 9px 8px 4px; border-radius: 7px;
  }
  .fig-sec-label span { margin-left: auto; letter-spacing: 0; font-size: 10.5px; opacity: .8; }
  .fig-sec-label:hover { color: var(--text); }
  .fig-link {
    display: flex; align-items: baseline; gap: 8px; width: 100%; text-align: left; cursor: pointer;
    font: inherit; font-size: 12.5px; color: var(--muted); background: none; border: none;
    border-radius: 7px; padding: 5px 8px; text-decoration: none;
  }
  .fig-link:hover { background: var(--panel-2); color: var(--text); }
  .fig-link.on { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent-ink); font-weight: 700; }
  .fig-link i { font-style: normal; font-size: 10.5px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; min-width: 15px; }
  .fig-link.on i { color: var(--accent-ink); }
  .fig-canvas { padding: 0 26px 90px; min-width: 0; background: var(--bg); }
  .gal-bar {
    position: sticky; top: 0; z-index: 6; display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; flex-wrap: wrap; padding: 16px 0 12px; margin-bottom: 6px;
    background: var(--bg); border-bottom: 1px solid var(--border);
  }
  .gal-crumb { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }

  /* ---- pages, sections, frames ---- */
  /* The sticky header is 133px tall, 203px once it wraps on a narrow window,
     and every anchor offset here was a guess well under that: jumping to a
     page or a frame from the tree landed it underneath the bar. One number,
     measured, used by all three. */
  .fig-page { padding-top: 30px; scroll-margin-top: var(--gal-bar); }
  .fig-page-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
  .fig-page-n {
    font-size: 11px; font-weight: 800; color: var(--muted); border: 1px solid var(--border);
    border-radius: 6px; padding: 2px 7px; font-variant-numeric: tabular-nums;
  }
  .fig-page-name { font-size: 21px; font-weight: 800; letter-spacing: -.03em; }
  .fig-page-note { font-size: 12.5px; color: var(--muted); margin: 0 0 12px; line-height: 1.5; max-width: 68ch; }
  .fig-section { border: 1px dashed var(--border); border-radius: 16px; padding: 14px; margin-top: 14px; scroll-margin-top: calc(var(--gal-bar) + 10px); }
  .fig-section-head { display: flex; align-items: center; gap: 8px; margin: -2px 0 12px; }
  .fig-section-name { font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
  .fig-section-rule { flex: 1; height: 1px; background: var(--border); }
  .gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(393px, 1fr)); gap: 24px 20px; }
  @media (max-width: 460px) { .gal-grid { grid-template-columns: 1fr; } }
  .gal-frame { margin: 0; scroll-margin-top: calc(var(--gal-bar) + 16px); }
  .gal-frame.flash .gal-phone { box-shadow: 0 0 0 3px var(--accent); }
  .gal-cap { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
  .gal-num {
    font-size: 11px; font-weight: 800; color: var(--accent-ink);
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    border-radius: 100px; padding: 2px 8px; flex-shrink: 0; font-variant-numeric: tabular-nums;
  }
  .fig-section-n { font-size: 10.5px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
  .gal-name { font-size: 14px; font-weight: 700; }
  .gal-note { font-size: 12.5px; color: var(--muted); margin: 0 0 8px; line-height: 1.45; }
  @media (max-width: 900px) {
    .fig { grid-template-columns: 1fr; }
    .fig-side { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
    .fig-canvas { padding: 0 16px 80px; }
  }
  /* ---- prototype mode ----
     A gallery answers "what does it look like". A flow answers "what happens
     next", which is the actual question about a feature like sending a clip.
     Every section is already an ordered flow, so clicking any frame plays its
     section from that point rather than opening a bigger picture of one. */
  .fig-play {
    font: inherit; font-size: 10.5px; font-weight: 800; letter-spacing: .04em;
    display: inline-flex; align-items: center; gap: 5px; cursor: pointer; flex-shrink: 0;
    background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent-ink);
    border: none; border-radius: 100px; padding: 5px 11px; min-height: 32px;
  }
  .fig-play:active { transform: scale(.97); }
  .fig-play-page { font-size: 11px; padding: 7px 14px; }
  .gal-frame .gal-phone { cursor: pointer; position: relative; transition: box-shadow .15s, transform .15s; }
  .gal-frame .gal-phone:hover { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 55%, transparent); }
  .gal-frame .gal-phone:active { transform: scale(.995); }

  /* The master sheet. Not a screen, so not a phone frame: a list you read. */
  .iss-note { font-size: 12.5px; color: var(--muted); line-height: 1.5; margin: -4px 0 14px; max-width: 68ch; }
  .iss-list { display: flex; flex-direction: column; gap: 10px; }
  .iss {
    border: 1px solid var(--border); border-left: 3px solid var(--border);
    border-radius: 14px; padding: 14px 16px; background: var(--panel);
  }
  .iss-blocker { border-left-color: var(--partner); }
  .iss-waiting, .iss-native { border-left-color: color-mix(in srgb, var(--accent) 60%, var(--border)); }
  .iss-closed { opacity: .62; }
  .iss-top { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .iss-tag {
    font-size: 10.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
    padding: 3px 9px; border-radius: 100px; flex-shrink: 0;
    background: var(--panel-2); color: var(--muted);
  }
  .iss-tag.blocker { background: color-mix(in srgb, var(--partner) 16%, transparent); color: var(--partner); }
  .iss-tag.waiting, .iss-tag.native { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent-ink); }
  .iss-title { font-size: 15.5px; font-weight: 700; letter-spacing: -.01em; }
  .iss-detail { font-size: 12.5px; color: var(--muted); line-height: 1.55; margin: 8px 0 0; max-width: 74ch; }
  .iss-where {
    font-size: 11px; font-weight: 700; color: var(--muted); margin-top: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; opacity: .8;
  }
  #p-open-issues .fig-page-n { color: var(--partner); border-color: color-mix(in srgb, var(--partner) 45%, var(--border)); }

  /* Badges: a design handoff, so the grid reads more like a spec sheet than
     a phone screen -- no phone frame, just the medallions themselves. */
  #p-badges .fig-page-n { color: #a8ff00; border-color: color-mix(in srgb, #a8ff00 45%, var(--border)); }
  .bdg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 18px 14px; }
  .bdg { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 7px; }
  .bdg-ring {
    width: 62px; height: 62px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .bdg-mystery {
    background: var(--panel-2); box-shadow: 0 0 0 1.5px var(--border);
    color: var(--muted); font-size: 22px; font-weight: 800;
  }
  .bdg-label { font-size: 11.5px; font-weight: 700; }
  .bdg-locked .bdg-label { color: var(--muted); }
  .bdg-sub { font-size: 9.5px; color: var(--muted); line-height: 1.3; max-width: 104px; }
  .bdg-cap { font-size: 9.5px; color: var(--muted); line-height: 1.3; max-width: 112px; opacity: .7; }
  .bdg-cel-row { display: flex; gap: 18px; flex-wrap: wrap; }
  .bdg-cel {
    flex: 1 1 220px; max-width: 260px; background: var(--panel); border: 1px solid var(--border);
    border-radius: 18px; padding: 22px 18px; text-align: center;
  }
  .bdg-cel-ring {
    width: 74px; height: 74px; border-radius: 50%; margin: 0 auto 14px;
    display: flex; align-items: center; justify-content: center; background: var(--panel-2);
  }
  .bdg-cel-h { font-size: 18px; font-weight: 800; letter-spacing: -.02em; margin: 0 0 6px; }
  .bdg-cel-sub { font-size: 12px; color: var(--muted); line-height: 1.5; margin: 0 0 16px; }
  .bdg-cel-cta {
    display: inline-block; padding: 9px 20px; border-radius: 100px;
    font-size: 12.5px; font-weight: 700; color: #0b0d11;
  }
  .bdg-concept-group { margin-top: 14px; }
  .bdg-concept-name { font-size: 11px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .bdg-concept-list { margin: 0; padding-left: 18px; font-size: 12.5px; color: var(--text); line-height: 1.7; }

  .proto-scrim {
    position: fixed; inset: 0; z-index: 60; display: none; flex-direction: column;
    background: color-mix(in srgb, var(--bg) 82%, #000);
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  }
  .proto-scrim.on { display: flex; }
  .proto-top {
    display: flex; align-items: center; justify-content: space-between; gap: 14px;
    padding: 14px 18px; border-bottom: 1px solid var(--border); background: var(--panel);
  }
  .proto-where { min-width: 0; }
  .proto-flow { font-size: 10.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
  .proto-name { font-size: 15.5px; font-weight: 800; letter-spacing: -.01em; margin-top: 2px; }
  .proto-x {
    font: inherit; font-size: 21px; line-height: 1; cursor: pointer; flex-shrink: 0;
    width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border);
    background: var(--panel-2); color: var(--text); display: flex; align-items: center; justify-content: center;
  }
  /* Stands in for the two things a still capture genuinely cannot draw: the
     Rive figure and the Chart.js weight line. Labelled, so a blank rectangle
     is never mistaken for a broken screen. */
  .gal-nofig {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    min-height: 150px; border: 1px dashed var(--border); border-radius: 12px;
    color: var(--muted); font-size: 12px; font-weight: 700; text-align: center; padding: 12px;
  }
  .gal-nofig span { display: block; font-size: 10.5px; font-weight: 500; opacity: .75; }
  .proto-stage { flex: 1; min-height: 0; position: relative; display: grid; place-items: center; padding: 18px; }
  .proto-phone {
    width: 393px; flex-shrink: 0; border: 1px solid var(--border); border-radius: 22px; overflow: hidden;
    background: var(--bg); background-image: var(--page-wash); transform-origin: center center;
    box-shadow: 0 24px 60px -20px rgba(0,0,0,.45);
  }
  .proto-zone { position: absolute; top: 0; bottom: 0; width: 34%; cursor: pointer; z-index: 2; }
  .proto-zone.prev { left: 0; }
  .proto-zone.next { right: 0; }
  .proto-note {
    font-size: 12.5px; color: var(--muted); line-height: 1.5; text-align: center;
    max-width: 62ch; margin: 0 auto; padding: 0 18px 10px;
  }
  .proto-foot {
    display: flex; align-items: center; justify-content: center; gap: 14px;
    padding: 12px 18px calc(18px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid var(--border); background: var(--panel);
  }
  .proto-btn {
    font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; min-height: 40px;
    padding: 9px 18px; border-radius: 100px; border: 1px solid var(--border);
    background: var(--panel-2); color: var(--text);
  }
  .proto-btn.go { background: var(--accent); color: var(--on-accent); border-color: transparent; }
  .proto-btn:disabled { opacity: .4; cursor: default; }
  .proto-dots { display: flex; align-items: center; gap: 6px; }
  .proto-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); cursor: pointer; padding: 0; border: none; }
  .proto-dot.on { background: var(--accent); transform: scale(1.25); }
  .proto-step { font-size: 12.5px; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }
  @media (max-width: 460px) { .proto-zone { width: 40%; } }

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

  /* Prototype: the goal bubble picker. Not lifted from index.html, because it
     is not in index.html; this is the only page in the gallery showing work
     that has never shipped. Positions are hand placed per state rather than
     driven by the live spring simulation, the same way every other frame here
     is a still frame, not a running loop. */
  .proto-flag {
    display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800;
    letter-spacing: .08em; text-transform: uppercase; color: var(--partner);
    background: color-mix(in srgb, var(--partner) 14%, transparent);
    border-radius: 100px; padding: 5px 11px; margin-bottom: 12px;
  }
  .proto-field { position: relative; }
  .proto-bub {
    position: absolute; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    text-align: center; padding: 6px; color: var(--text); background: var(--panel-2);
    border: 1.5px solid var(--border);
  }
  .proto-bub-inner { display: flex; flex-direction: column; align-items: center; gap: 4px; line-height: 1.15; }
  .proto-bub-label { font-weight: 700; letter-spacing: -.01em; }
  .proto-bub.parent { background: var(--panel); border-color: color-mix(in srgb, var(--accent) 38%, var(--border)); }
  .proto-bub.parent .proto-bub-ico { color: var(--accent-ink); }
  .proto-bub.parent .proto-bub-label { font-size: 14px; }
  .proto-bub.parent.active {
    background: var(--accent); border-color: transparent; color: var(--on-accent);
    box-shadow: var(--glow-accent);
  }
  .proto-bub.parent.active .proto-bub-ico { color: var(--on-accent); }
  .proto-bub.child { background: var(--panel-2); border-color: var(--border); }
  .proto-bub.child .proto-bub-label { font-size: 12.5px; font-weight: 600; }
  .proto-bub.child.picked {
    background: var(--panel); border-color: var(--accent-ink); color: var(--text);
    box-shadow: inset 0 0 0 1.5px var(--accent-ink);
  }
`;

/* Node-side escaping: the client-side escapeHtml lives inside the generated
   script, and this block is built out here. */
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---- the master sheet ----
   Everything flagged and not yet done, kept where we actually look rather than
   in a chat scrollback nobody scrolls. Each entry is real and checked against
   the code or the live config on the day it was written; when one is fixed it
   moves to "closed" rather than quietly disappearing, so we can see what was
   decided as well as what was done. */
/* The master sheet lives in issues.json so the gallery and the sandbox read
   one list rather than drifting into two. */
const ISSUES = JSON.parse(readFileSync(join(root, "issues.json"), "utf8"));

const LEVEL_LABEL = {
  blocker: "Blocker", todo: "To do", waiting: "Waiting on you",
  native: "Needs native", debt: "Debt", closed: "Closed",
};

const issueCount = ISSUES.reduce((n, g) => n + g.items.filter((i) => i.level !== "closed").length, 0);
const ISSUES_HTML =
  '<section class="fig-page" id="p-open-issues">' +
    '<div class="fig-page-head"><span class="fig-page-n">!</span>' +
      '<h2 class="fig-page-name">Open issues</h2></div>' +
    '<p class="fig-page-note">The master sheet: everything flagged and not yet done, checked against the code or the live config rather than remembered. ' +
      issueCount + ' open right now.</p>' +
    ISSUES.map((g) =>
      '<div class="fig-section" id="i-' + g.group.replace(/\W+/g, "-").toLowerCase() + '">' +
        '<div class="fig-section-head"><span class="fig-section-name">' + esc(g.group) + '</span>' +
          '<span class="fig-section-rule"></span>' +
          '<span class="fig-section-n">' + g.items.length + '</span></div>' +
        '<p class="iss-note">' + esc(g.note) + '</p>' +
        '<div class="iss-list">' +
          g.items.map((i) =>
            '<div class="iss iss-' + i.level + '">' +
              '<div class="iss-top">' +
                '<span class="iss-tag ' + i.level + '">' + esc(LEVEL_LABEL[i.level] || i.level) + '</span>' +
                '<span class="iss-title">' + esc(i.title) + '</span>' +
              '</div>' +
              '<p class="iss-detail">' + esc(i.detail) + '</p>' +
              '<div class="iss-where">' + esc(i.where) + '</div>' +
            '</div>').join("") +
        '</div>' +
      '</div>').join("") +
  '</section>';

const ISSUES_TREE =
  '<button type="button" class="fig-page-btn" data-page="p-open-issues">' +
    '<span class="caret">&#9662;</span>Open issues' +
    '<span class="count">' + issueCount + '</span></button>' +
  '<div class="fig-kids">' +
    ISSUES.map((g) =>
      '<a class="fig-sec-label" href="#i-' + g.group.replace(/\W+/g, "-").toLowerCase() + '">' + esc(g.group) +
        '<span>' + g.items.length + '</span></a>').join("") +
  '</div>';

/* ---- the badge system ----
   Design handoff, not a real screen: nothing here is wired into index.html.
   Kept in one place so whoever builds it has the real icons, the real copy
   and the rest-day rule rather than re-deriving them from a chat. Every
   badge routes through each person's own weekly target, never a raw day
   count, on purpose: see the "before real users" onboarding note and the
   REST_ALLOWANCE mechanic this has to keep agreeing with. */
const BADGE_CATS = [
  { name: "Getting started", items: [
    { earned: true, color: "#2d6bff", label: "First Workout", sub: "Logged",
      svg: '<path d="M6 21V3"/><path d="M6 4h11l-3 4 3 4H6"/>' },
    { earned: true, color: "#2fa968", label: "Full Body", sub: "One session, every group",
      svg: '<circle cx="12" cy="5" r="2.3"/><path d="M12 8v6M12 8l-5 2M12 8l5 2M12 14l-4 7M12 14l4 7"/>' },
    { earned: false, color: "#4a5160", label: "Goal Week", sub: "Hit your own weekly number",
      svg: '<circle cx="12" cy="4.2" r="1.6"/><circle cx="17.7" cy="6.3" r="1.6"/><circle cx="19.8" cy="12" r="1.6"/><circle cx="17.7" cy="17.7" r="1.6"/><circle cx="12" cy="19.8" r="1.6"/><circle cx="6.3" cy="17.7" r="1.6"/><circle cx="4.2" cy="6.3" r="1.6"/>' },
  ]},
  { name: "Consistency, together", items: [
    { earned: true, color: "#ff6b4a", label: "Two Weeks Running", sub: "Two weeks in a row, both of you",
      svg: '<g transform="translate(-2.3,1.5) scale(0.62)"><path d="M12 2C12 6 8 8 8 12a4 4 0 1 0 8 0c0-1-.3-1.8-.8-2.5.3 1.8-.9 2.5-1.8 2.5-1.3 0-1.9-1-1.4-2.3C13 8 12.7 5 12 2Z"/></g><g transform="translate(7.3,1.5) scale(0.62)"><path d="M12 2C12 6 8 8 8 12a4 4 0 1 0 8 0c0-1-.3-1.8-.8-2.5.3 1.8-.9 2.5-1.8 2.5-1.3 0-1.9-1-1.4-2.3C13 8 12.7 5 12 2Z"/></g>' },
    { earned: true, color: "#a8ff00", label: "100 Together", sub: "Combined workouts", text: "100" },
    { earned: false, color: "#4a5160", label: "Full Coverage", sub: "Every muscle, one week",
      svg: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6.3 6.3l11.4 11.4M17.7 6.3 6.3 17.7"/>' },
  ]},
  { name: "Strength", items: [
    { earned: true, color: "#ff6b4a", label: "New PR", sub: "Beat your own best",
      svg: '<path d="M4 17h16M8 12l4-5 4 5M12 7v10"/>' },
    { earned: false, color: "#4a5160", label: "Double PR Week", sub: "You both hit one",
      svg: '<g transform="translate(-3.5,2)"><path d="M9 15.5V6.5M5.2 10l3.8-4 3.8 4" transform="scale(0.62)"/></g><g transform="translate(6.5,2)"><path d="M9 15.5V6.5M5.2 10l3.8-4 3.8 4" transform="scale(0.62)"/></g>' },
    { earned: false, color: "#4a5160", label: "Bodyweight Bench", sub: "The first real ladder rung",
      svg: '<path d="M4 10v4M20 10v4M2 12h2M20 12h2M6 8v8M18 8v8M9 12h6"/>' },
  ]},
  { name: "Keeping the record", items: [
    { earned: false, color: "#4a5160", label: "First Photo", sub: "Day one of the record",
      svg: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>' },
    { earned: false, color: "#4a5160", label: "1 Year", sub: "Together, on the app", text: "365" },
  ]},
];

const BADGE_CELEBRATIONS = [
  { color: "#2d6bff", headline: "First one down.", sub: "Every streak starts here. Welcome to the log.",
    svg: '<path d="M6 21V3"/><path d="M6 4h11l-3 4 3 4H6"/>' },
  { color: "#a8ff00", headline: "100 together.", sub: "Not 100 each: 100 total. That is every session, both of you, added up.",
    text: "100" },
  { color: "#ff6b4a", headline: "Two weeks running.", sub: "Two weeks in a row you both hit your own goal. That is the actual hard part.",
    svg: '<g transform="translate(-2.3,1.5) scale(0.62)"><path d="M12 2C12 6 8 8 8 12a4 4 0 1 0 8 0c0-1-.3-1.8-.8-2.5.3 1.8-.9 2.5-1.8 2.5-1.3 0-1.9-1-1.4-2.3C13 8 12.7 5 12 2Z"/></g><g transform="translate(7.3,1.5) scale(0.62)"><path d="M12 2C12 6 8 8 8 12a4 4 0 1 0 8 0c0-1-.3-1.8-.8-2.5.3 1.8-.9 2.5-1.8 2.5-1.3 0-1.9-1-1.4-2.3C13 8 12.7 5 12 2Z"/></g>' },
];

const BADGE_CONCEPTS = [
  { group: "Consistency, goal-based and rest-day safe", items: [
    "First time you hit your weekly goal",
    "A full month: four weeks running, both of you",
    "Two months running",
    "Used a rest day: tapped rest day instead of quietly skipping, before the streak broke",
    "Back at it: first session after a week or more away, framed as welcome back, never a scolding",
  ]},
  { group: "Strength", items: [
    "5 total PRs",
    "10 total PRs",
    "The comeback PR: a new best on a lift not touched in 30 or more days",
  ]},
  { group: "Variety", items: [
    "Tried 3 different training types in a month",
    "First time logging yoga, pilates or calisthenics, whichever is new for you",
  ]},
  { group: "Partner, lean hardest here since it is the differentiator", items: [
    "Evenly matched: a week where you both logged the exact same number of sessions",
    "Cheered your partner 10 times",
    "Cheered your partner 25 times",
    "Reset together: you both came back from a break in the same week",
    "Both hit your own goal, same week, for the first time",
  ]},
];

const badgeIcon = (b) => b.text
  ? '<text x="12" y="16.2" text-anchor="middle" font-family="DM Sans" font-weight="800" font-size="9.5" fill="' + b.color + '">' + b.text + '</text>'
  : '<g fill="none" stroke="' + b.color + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + b.svg + '</g>';

const badgeConceptCount = BADGE_CONCEPTS.reduce((n, g) => n + g.items.length, 0);

const BADGES_HTML =
  '<section class="fig-page" id="p-badges">' +
    '<div class="fig-page-head"><span class="fig-page-n">B</span>' +
      '<h2 class="fig-page-name">Badges</h2></div>' +
    '<p class="fig-page-note">Not wired into the app yet: a design handoff, so whoever builds this has the real icons and the real rule rather than a description of them. Every badge routes through their own weekly target, never a raw day count, so nobody is penalized for a rest day. Locked badges hide the icon and the name in the shipped app, shown here as a plain question mark, with the real name kept in a caption for whoever is building it, not for the end user.</p>' +
    BADGE_CATS.map((cat) =>
      '<div class="fig-section" id="bdg-' + cat.name.replace(/\W+/g, "-").toLowerCase() + '">' +
        '<div class="fig-section-head"><span class="fig-section-name">' + esc(cat.name) + '</span>' +
          '<span class="fig-section-rule"></span>' +
          '<span class="fig-section-n">' + cat.items.length + '</span></div>' +
        '<div class="bdg-grid">' +
          cat.items.map((b) => b.earned
            ? '<div class="bdg bdg-earned">' +
                '<div class="bdg-ring" style="background:color-mix(in srgb, ' + b.color + ' 16%, var(--panel-2));box-shadow:0 0 0 1.5px ' + b.color + ', 0 8px 20px -8px color-mix(in srgb, ' + b.color + ' 40%, transparent)">' +
                  '<svg viewBox="0 0 24 24" width="34" height="34">' + badgeIcon(b) + '</svg>' +
                '</div>' +
                '<div class="bdg-label">' + esc(b.label) + '</div>' +
                '<div class="bdg-sub">' + esc(b.sub) + '</div>' +
              '</div>'
            : '<div class="bdg bdg-locked">' +
                '<div class="bdg-ring bdg-mystery">?</div>' +
                '<div class="bdg-label">Locked</div>' +
                '<div class="bdg-cap">' + esc(b.label) + ', ' + esc(b.sub) + '</div>' +
              '</div>').join("") +
        '</div>' +
      '</div>').join("") +
    '<div class="fig-section" id="bdg-unlock-moments">' +
      '<div class="fig-section-head"><span class="fig-section-name">Unlock moments</span>' +
        '<span class="fig-section-rule"></span>' +
        '<span class="fig-section-n">' + BADGE_CELEBRATIONS.length + '</span></div>' +
      '<p class="iss-note">The full-screen celebration when a badge unlocks. Shown static here; the real version stages the ring in with an overshoot bounce, then the headline and button fade up a beat after.</p>' +
      '<div class="bdg-cel-row">' +
        BADGE_CELEBRATIONS.map((c) =>
          '<div class="bdg-cel">' +
            '<div class="bdg-cel-ring" style="box-shadow:0 0 0 2px ' + c.color + ', 0 0 60px -10px ' + c.color + '">' +
              '<svg viewBox="0 0 24 24" width="46" height="46">' + badgeIcon(c) + '</svg>' +
            '</div>' +
            '<h3 class="bdg-cel-h">' + esc(c.headline) + '</h3>' +
            '<p class="bdg-cel-sub">' + esc(c.sub) + '</p>' +
            '<div class="bdg-cel-cta" style="background:' + c.color + '">Keep going</div>' +
          '</div>').join("") +
      '</div>' +
    '</div>' +
    '<div class="fig-section" id="bdg-concepts">' +
      '<div class="fig-section-head"><span class="fig-section-name">Written, not designed</span>' +
        '<span class="fig-section-rule"></span>' +
        '<span class="fig-section-n">' + badgeConceptCount + '</span></div>' +
      '<p class="iss-note">Named and reasoned through, no icon or medallion built yet. Same rule as above: everything here is rest-day safe by construction, nothing rewards never resting.</p>' +
      BADGE_CONCEPTS.map((g) =>
        '<div class="bdg-concept-group">' +
          '<div class="bdg-concept-name">' + esc(g.group) + '</div>' +
          '<ul class="bdg-concept-list">' + g.items.map((t) => '<li>' + esc(t) + '</li>').join("") + '</ul>' +
        '</div>').join("") +
    '</div>' +
  '</section>';

const BADGES_TREE =
  '<button type="button" class="fig-page-btn" data-page="p-badges">' +
    '<span class="caret">&#9662;</span>Badges' +
    '<span class="count">' + (BADGE_CATS.reduce((n, c) => n + c.items.length, 0) + BADGE_CELEBRATIONS.length + badgeConceptCount) + '</span></button>' +
  '<div class="fig-kids">' +
    BADGE_CATS.map((cat) =>
      '<a class="fig-sec-label" href="#bdg-' + cat.name.replace(/\W+/g, "-").toLowerCase() + '">' + esc(cat.name) +
        '<span>' + cat.items.length + '</span></a>').join("") +
    '<a class="fig-sec-label" href="#bdg-unlock-moments">Unlock moments<span>' + BADGE_CELEBRATIONS.length + '</span></a>' +
    '<a class="fig-sec-label" href="#bdg-concepts">Written, not designed<span>' + badgeConceptCount + '</span></a>' +
  '</div>';

const BODY = `<title>Fit Together Screen States</title>
${fonts}
<style>${style}</style>
<style>${GALLERY_CSS}</style>
<div class="fig">
  <aside class="fig-side">
    <div class="fig-file">
      <b>Fit Together</b>
      <span>Screen states</span>
    </div>
    <nav class="fig-tree" id="galTree"></nav>
  </aside>
  <main class="fig-canvas">
    <div class="gal-bar">
      <div>
        <div class="gal-crumb" id="galCrumb">Fit Together / Screen states</div>
        <div class="gal-title">Every screen, in the order you meet it</div>
        <p class="gal-sub">Real stylesheet, real render functions, fake data. Pages follow the journey: opening the app, planning the workout, doing it, watching them, sending and getting a clip. Every frame has a number, so "change 7" is enough to say which one.</p>
      </div>
      <div class="gal-controls">
        <button type="button" class="gal-btn on" id="galLight">Light</button>
        <button type="button" class="gal-btn" id="galDark">Dark</button>
      </div>
    </div>
    <div id="galBody"></div>
  </main>
</div>

<div class="proto-scrim" id="protoScrim" role="dialog" aria-label="Flow">
  <div class="proto-top">
    <div class="proto-where">
      <div class="proto-flow" id="protoFlow"></div>
      <div class="proto-name" id="protoName"></div>
    </div>
    <button type="button" class="proto-x" id="protoX" aria-label="Close">&times;</button>
  </div>
  <div class="proto-stage" id="protoStage">
    <div class="proto-zone prev" id="protoPrevZone" aria-hidden="true"></div>
    <div class="proto-phone" id="protoPhone"></div>
    <div class="proto-zone next" id="protoNextZone" aria-hidden="true"></div>
  </div>
  <p class="proto-note" id="protoNote"></p>
  <div class="proto-foot">
    <button type="button" class="proto-btn" id="protoPrev">Back</button>
    <div class="proto-dots" id="protoDots"></div>
    <span class="proto-step" id="protoStep"></span>
    <button type="button" class="proto-btn go" id="protoNext">Next</button>
  </div>
</div>

<!-- The hidden stage. Real ids, real markup, one state at a time. -->
<div id="galStage" style="position:absolute;left:-9999px;top:0;width:393px;">
  <div id="app">
${HEADER}
    <span id="topDate" class="hidden"></span>
${HOME}
${BODY_TAB}
${PROGRESS_TAB}
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

const ISSUES_HTML = ${JSON.stringify(ISSUES_HTML)};
const ISSUES_TREE = ${JSON.stringify(ISSUES_TREE)};
const BADGES_HTML = ${JSON.stringify(BADGES_HTML)};
const BADGES_TREE = ${JSON.stringify(BADGES_TREE)};

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
let DAY_STREAK = 4, WEEK_STREAK = 0, TRAINED_TODAY = false;
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
/* The app keeps one flat table and filters it; the gallery keeps a map by
   name. Progress reads the flat one directly, so it is flattened from the map
   at render time rather than kept as a second fixture that could disagree. */
let ALL_ENTRIES = [];
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
let SESSION = null, CLIP_INBOX = [], TODAY_WORKOUT = null, WORKOUT_MODE = null;
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
/* The finish screen is lifted whole, so only its write half and its noises are
   stubbed out. Everything it reports is a number the fixtures decide. */
let SESSION_ELAPSED_MS = 47 * 60 * 1000, TODAY_PRS = 1, LOGGED_NAMES = [];
const finishWorkout = async () => {};
const sessionElapsed = () => SESSION_ELAPSED_MS;
const todaysLoggedExerciseNames = () => new Set(LOGGED_NAMES);
const todaysPRCount = () => TODAY_PRS;
const buzz = () => {};
const confettiBurst = () => {};
const toggleSet = () => {};
const startNextSet = () => {};
const jumpToExercise = () => {};
const finishExerciseAndAdvance = () => {};
/* The Body tab's figure is Rive on a WebGL canvas. It cannot run in a static
   capture, so everything that touches it is a no-op and the canvas is labelled
   in the frame instead of pretending. The rings, the ranked list, the detail
   panel and What to train next are all the app's real code. */
let BODY_PERIOD = null, BODY_LAST_KEY = null, BODY_LAST_TARGET = {}, BODY_PULSE_RAF = null;
let BODY_GREENED = null, BODY_HEAT_PALETTE = null, BODY_MUSCLE_COLOR = {}, BODY_ALL_MUSCLES = [];
let riveFrontCtrl = null, riveBackCtrl = null, riveLoadedSex = "Male";
/* The app's weekStartStr reads the real clock, which would put the fixture
   week out of range and leave every "this week" panel empty. Same rule,
   anchored to the fixture day instead. */
const weekStartStr = () => {
  const d = new Date(TODAY + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day));
  return isoDate(d);
};
const renderBodyDiagram = async () => {};
const bodyRampFigures = () => {};
const bodyBuildOrder = () => [];
const bodyPaintPalettes = () => ({});
const bodyHeatRGB = () => ({ r: 0, g: 0, b: 0 });
const bodyIsolateMuscle = () => {};
const bodyRestoreGreen = () => {};
const bodyStopPulse = () => {};
const bodyClearFocusUI = () => {};
const bodyPositionCallouts = () => {};
const bodyFocusMuscle = async () => {};

/* Progress: the chart needs Chart.js off a CDN and the photos need signed
   storage URLs, so those two panels are stubbed and the rest is real. */
let PROGRESS_VIEW = "me";
const SCALE_STATE = { weight: 0 };
const renderWeightChart = () => {};
const renderBodyPhotos = async () => {};
const loadBodyPhotos = async () => [];
const deleteBodyPhoto = () => {};
const toggleMetric = () => {};
const cssVar = () => "#888";
const loadScriptOnce = () => Promise.resolve();

/* The app loads these as ES modules. Here the answers are baked in. */
let riveBodyPromise = null, bodyDetailPromise = null;
const ensureRiveBodyModule = () => Promise.resolve(null);
const ensureBodyDetailModules = () => Promise.resolve(BODY_DETAIL);
const BODY_RECOVERY_HOURS = 48;
const BODY_FRESH_HOURS = 24;
let BODY_DETAIL = { detail: {
  hitsForExercise: (name) => HITS[String(name).toLowerCase()] || null,
  MUSCLE_PIECES: ${JSON.stringify(MUSCLE_PIECES)},
  MUSCLE_HEADS: ${JSON.stringify(MUSCLE_HEADS)},
} };
const HITS = ${JSON.stringify(HITS)};

${INFO}
${PRIVACY_ROWS}
${GEN_STEPS}
${GEN_WORDS}
let genTimer = null, genPct = 0, genStepAt = 0, genWordTimer = null, genWordAt = 0, genBodyCtrl = null;
let genRaf = null, genRevShown = 0, genFrameAt = 0, genCancelled = false;
${FUNCS}
${WORKING_MUSCLES}

/* ---- the fixtures each state starts from ---- */

function resetFixtures() {
  ME = "Mo"; MY_EMAIL = "mo@x"; PARTNER_EMAIL = "mell@x";
  MY_DAYS = 4; MY_TARGET = 5; THEIR_DAYS = 4; THEIR_TARGET = 5;
  DAY_STREAK = 4; WEEK_STREAK = 0; TRAINED_TODAY = false;
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

/* The screen after the last rep. "done" is how many of the five exercises
   actually got logged, which is what separates finishing from stopping. */
/* The Body tab reads exercise_logs and nothing else, so the fixture is just a
   day's training. Names go through the app's own classifier, so what lights up
   is whatever the app would light up. */
const bodyFixture = ({ period = "today", logs = null } = {}) => {
  BODY_PERIOD = period;
  BODY_LAST_KEY = null;
  BODY_FOCUS = null;
  const day = (d, rows) => rows.map((r) => ({ email: "mo@x", user_name: "Mo", entry_date: d, ...r }));
  ALL_EXERCISE_LOGS = logs !== null ? logs : [
    ...day(TODAY, [
      { exercise_name: "Bench Press", sets: 4, reps: 8, weight: 185 },
      { exercise_name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 60 },
      { exercise_name: "Triceps Pushdown", sets: 3, reps: 12, weight: 50 },
      { exercise_name: "Overhead Press", sets: 3, reps: 10, weight: 95 },
    ]),
    ...day("2026-09-02", [
      { exercise_name: "Barbell Row", sets: 4, reps: 8, weight: 155 },
      { exercise_name: "Lat Pulldown", sets: 3, reps: 10, weight: 120 },
      { exercise_name: "Barbell Squat", sets: 4, reps: 6, weight: 225 },
      { exercise_name: "Calf Raise", sets: 3, reps: 15, weight: 90 },
    ]),
  ];
};

const completeFixture = ({ done = null, elapsedMs = 47 * 60 * 1000, prs = 1 } = {}) => {
  sessionFixture();
  const names = TODAY_WORKOUT.exercises.map((e) => e.name.toLowerCase());
  LOGGED_NAMES = done == null ? names : names.slice(0, done);
  SESSION_ELAPSED_MS = elapsedMs;
  TODAY_PRS = prs;
};

/* ---- what to show ---- */

const STATES = [
  { page: "Choosing a goal", section: "Bubble picker prototype", name: "Resting cluster, nothing open",
    note: "PROTOTYPE, NOT LIVE. Five broad goals, each a bubble. Tapping one opens it without closing any other.",
    subline: "Tap one to open it up.",
    bubbles: "resting", setup: () => {} },

  { page: "Choosing a goal", section: "Bubble picker prototype", name: "One goal open",
    note: "PROTOTYPE, NOT LIVE. The tapped goal fills solid and its specific goals bloom out around it.",
    subline: "Tap a specific goal, then continue.",
    bubbles: "oneOpen", setup: () => {} },

  { page: "Choosing a goal", section: "Bubble picker prototype", name: "Two goals open, three specifics picked",
    note: "PROTOTYPE, NOT LIVE. Every open goal stays open, and picking a specific goal never clears another, in the same category or a different one.",
    subline: "Tap a specific goal, then continue.",
    bubbles: "twoOpenPicked", setup: () => {} },

  { page: "Opening the app", section: "The everyday state", name: "Everyday, both of you going",
    note: "The one you see most: partner paired, both mid-week, nobody live.",
    setup: () => {} },

  { page: "Opening the app", section: "When they are training", name: "Partner is training right now",
    note: "The live card takes the top of the screen. Red dot pulses.",
    setup: () => { LIVE_PARTNER = liveRow(); } },

  { page: "Opening the app", section: "When they are training", name: "Partner live, but their phone locked",
    note: "Beat older than 3 minutes. It says so instead of pretending.",
    setup: () => { LIVE_PARTNER = liveRow({ last_beat_at: new Date(Date.now() - 7 * 60000).toISOString(), state: "resting" }); } },

  { page: "Opening the app", section: "The everyday state", name: "You have already trained today",
    note: "The green button turns into planning tomorrow.",
    setup: () => { TRAINED_TODAY = true; } },

  { page: "Opening the app", section: "The everyday state", name: "Tomorrow is already planned",
    note: "Review Next Workout opens the plan; the line above it names the focus.",
    /* renderHero finds this by looking up ALL_PLANS for tomorrow's date itself,
       it does not read a separate flag. PLANNED_TOMORROW never fed anything: a
       leftover from before that lookup existed, and the reason this state used
       to render with nothing queued at all. */
    setup: () => {
      TRAINED_TODAY = true;
      ALL_PLANS.push({ id: "p1", email: MY_EMAIL, entry_date: "2026-09-05", focus: "Pull day", exercises: [
        { name: "Deadlift", sets: 3, reps: 5, targetWeight: 315 },
        { name: "Pull-Up", sets: 4, reps: 8, targetWeight: null },
        { name: "Barbell Row", sets: 3, reps: 10, targetWeight: 155 },
      ] });
    } },

  { page: "Opening the app", section: "Other shapes of the same screen", name: "Brand new, nothing logged",
    note: "First run. Empty rings, no streak, empty week, empty timeline.",
    setup: () => {
      MY_DAYS = 0; THEIR_DAYS = 0; DAY_STREAK = 0; WEEK_STREAK = 0;
      ENTRIES = { Mo: [], Mell: [] }; ALL_PLANS = []; ALL_EXERCISE_LOGS = []; ALL_REACTIONS = [];
    } },

  { page: "Opening the app", section: "Other shapes of the same screen", name: "Training on your own",
    note: "No partner: one ring, centred, no legend, no timeline from them.",
    setup: () => { PARTNER_EMAIL = null; ENTRIES.Mell = []; ALL_REACTIONS = []; } },

  { page: "Opening the app", section: "The everyday state", name: "One of you is behind",
    note: "Different counts, so the line names both instead of saying 'each'.",
    setup: () => { MY_DAYS = 4; THEIR_DAYS = 1; DAY_STREAK = 0; WEEK_STREAK = 2; } },

  { page: "Opening the app", section: "The everyday state", name: "Week streak instead of day streak",
    note: "Days beat weeks when both exist; this is what weeks look like.",
    setup: () => { DAY_STREAK = 0; WEEK_STREAK = 3; } },

  { page: "Opening the app", section: "Other shapes of the same screen", name: "Partner keeps workouts private",
    note: "The effort line still says who trained harder this week. Her live card and yesterday's timeline row lose the specifics; the number stays.",
    setup: () => { LIVE_PARTNER = liveRow(); PARTNER_PROFILE = { share_workout_details: false }; } },

  /* The Body tab itself. It had no state at all before this: the page held
     only its four explainer popups, so the screen everyone actually looks at
     was never in review. */
  { page: "Reading your body", section: "The screen itself", name: "A push day, chest and triceps lit",
    note: "The real rings, the ranked list and What to train next, off the same logs the app reads. The two figures are Rive on WebGL and only draw in the live app.",
    body: true, setup: () => { bodyFixture(); } },

  { page: "Reading your body", section: "The screen itself", name: "A week of everything",
    note: "The week period rather than today, so more groups are lit and the ranking spreads out.",
    body: true, setup: () => { bodyFixture({ period: "week" }); } },

  { page: "Reading your body", section: "The screen itself", name: "Nothing logged yet",
    note: "The empty state: no bars, no rings, and the line that says what would fill them.",
    body: true, setup: () => { bodyFixture({ logs: [] }); } },

  { page: "Looking back", section: "The Progress tab", name: "Weight, activity and personal bests",
    note: "The Progress tab, which had no state here before. The weight chart is Chart.js and the body photos need signed storage URLs, so both are live only; everything else is the app's own render.",
    progress: true, setup: () => { bodyFixture(); } },

  { page: "Reading your body", section: "The explainers behind it", name: "What to train next",
    note: "The card on the Body tab answers one question and shows its working. This is the note behind it.",
    pop: () => openInfo("trainNext"), setup: () => {} },

  { page: "Reading your body", section: "The explainers behind it", name: "Low, medium and high",
    pop: () => openInfo("muscleLevels"), setup: () => {} },

  { page: "Reading your body", section: "The explainers behind it", name: "Training impact",
    pop: () => openInfo("impact"), setup: () => {} },

  { page: "Reading your body", section: "The explainers behind it", name: "What your partner sees",
    pop: () => openInfo("share"), setup: () => {} },

  { page: "Watching them train", section: "Where they are up to", name: "Working, mid set",
    note: "Set dots fill as they log. Up next comes from their plan.",
    sheet: true, setup: () => { LIVE_PARTNER = liveRow(); } },

  { page: "Watching them train", section: "Where they are up to", name: "Resting between sets",
    setup: () => { LIVE_PARTNER = liveRow({ state: "resting", set_done: 3 }); }, sheet: true },

  { page: "Watching them train", section: "Where they are up to", name: "Paused",
    setup: () => { LIVE_PARTNER = liveRow({ state: "paused", elapsed_sec: 2100 }); }, sheet: true },

  { page: "Watching them train", section: "Where they are up to", name: "Screen off, still in it",
    note: "What a watcher sees once the beats stop coming.",
    setup: () => { LIVE_PARTNER = liveRow({ last_beat_at: new Date(Date.now() - 9 * 60000).toISOString() }); }, sheet: true },

  { page: "Watching them train", section: "Where they are up to", name: "Last exercise, nothing next",
    setup: () => { LIVE_PARTNER = liveRow({ exercise_index: 4, exercise_name: "Calf Raise", set_done: 1, set_total: 3 }); }, sheet: true },

  { page: "Watching them train", section: "Where they are up to", name: "They just finished while you were looking",
    note: "The row goes away mid-watch. This is the fallback.",
    setup: () => { LIVE_PARTNER = null; }, sheet: true },

  { page: "Watching them train", section: "What the muscle line says", name: "A pull exercise, back lit up",
    note: "The muscle line is per exercise, so it changes as they move through the plan. The tile beside it is where the exercise demo will go.",
    setup: () => { LIVE_PARTNER = liveRow({ exercise_name: "Barbell Row", exercise_index: 1, set_done: 1, set_total: 3 }); }, sheet: true },

  { page: "Watching them train", section: "What the muscle line says", name: "An exercise nobody has classified",
    note: "Nothing at all rather than a line naming no muscles.",
    setup: () => { LIVE_PARTNER = liveRow({ exercise_name: "Turkish Get-Up" }); }, sheet: true },

  { page: "Watching them train", section: "When they hold something back", name: "This one keeps it private",
    note: "Name, sets and the muscle line are gone. Live status, elapsed time and today's effort score stay, so how hard never needs to reveal at what.",
    setup: () => { LIVE_PARTNER = liveRow(); PARTNER_PROFILE = { share_workout_details: false }; }, sheet: true },

  { page: "Planning the workout", section: "While it thinks", name: "Working on it",
    note: "Comes up from the bottom when you press generate. The body builds from the feet up as it works, with a scan line at the height it has reached. The figure itself is live WebGL, so this still frame shows the chamber without it.",
    gen: () => { openGenOverlay("Generating"); paintGen(62); }, setup: () => {} },

  { page: "Planning the workout", section: "While it thinks", name: "The plan lands",
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

  { page: "Getting a clip", section: "The pill on your session", name: "A clip is waiting",
    note: "Sits above the session screen. Only ever exists during a workout.",
    pill: true,
    setup: () => { SESSION = { finished: false }; CLIP_INBOX = [{ id: "c1", from_email: "mell@x", path: "x" }]; } },

  { page: "Getting a clip", section: "The pill on your session", name: "More than one waiting",
    pill: true,
    setup: () => { SESSION = { finished: false }; CLIP_INBOX = [
      { id: "c1", from_email: "mell@x", path: "x" }, { id: "c2", from_email: "mell@x", path: "y" }]; } },

  { page: "Getting a clip", section: "The pill on your session", name: "The second one is a replay",
    note: "A clip already watched once says so on the pill, so it does not read as something new arriving.",
    pill: true,
    setup: () => { SESSION = { finished: false }; CLIP_INBOX = [{ id: "c1", from_email: "mell@x", path: "x", views: 1 }]; } },

  { page: "Getting a clip", section: "Two watches, then gone", name: "Watching it",
    note: "It loops for as long as you stay. The video area is black here because there is no file.",
    raw: () => clipViewerHTML("Mell", "", false), setup: () => {} },

  { page: "Getting a clip", section: "Two watches, then gone", name: "Closing the first watch",
    note: "One watch is spent by closing, not by the video reaching the end. The clip is still there.",
    raw: () => clipSavedForLaterHTML("Mell"), setup: () => {} },

  { page: "Getting a clip", section: "Two watches, then gone", name: "The last watch",
    note: "Opened for the second time, the line under it stops promising another.",
    raw: () => clipViewerHTML("Mell", "", true), setup: () => {} },

  { page: "Getting a clip", section: "Two watches, then gone", name: "After the last one",
    note: "Then it is deleted, file and row, and this closes itself.",
    raw: () => clipGoneHTML(), setup: () => {} },

  { page: "Sending a clip", section: "After you press send", name: "Sent",
    note: "The overlay stays up and answers. A toast behind a closing camera is not an answer when you are holding a phone in a gym.",
    raw: () => clipSentHTML("Mell"), setup: () => {} },

  { page: "Sending a clip", section: "After you press send", name: "It did not send",
    note: "Signal in a gym being what it is. The clip is gone with it, which the copy says rather than implying a retry that does not exist.",
    raw: () => clipSendFailedHTML(), setup: () => {} },

  { page: "Sending a clip", section: "Filming it", name: "The recorder",
    note: "Up to twenty seconds. Tap the shutter again to stop early; the ring shows time used. The camera fills the screen in the app.",
    raw: () => clipRecorderHTML("Mell"), setup: () => {} },

  { page: "Opening the app", section: "Explaining a number", name: "What keeps the streak alive",
    note: "The badge is the button. Tapping it says what breaks a streak and what does not.",
    pop: () => openInfo("streak"), setup: () => {} },

  { page: "Opening the app", section: "Explaining a number", name: "What the day tiles mean",
    note: "The week strip is dense on purpose, so the key lives one tap away rather than under it.",
    pop: () => openInfo("weekStrip"), setup: () => {} },

  { page: "Opening the app", section: "Explaining a number", name: "The weekly target",
    pop: () => openInfo("weekTarget"), setup: () => {} },

  { page: "Opening the app", section: "Explaining a number", name: "How effort is scored",
    note: "Tapping the effort line opens this. Three lines, the real numbers from the formula, and why two people can be compared when one of them shares nothing.",
    pop: () => openEffortInfo(), setup: () => {} },

  { page: "Planning the workout", section: "Before you press begin", name: "What the match figure means",
    note: "86% has to mean something or it is decoration.",
    pop: () => openInfo("planMatch"), setup: () => {} },

  { page: "Planning the workout", section: "Before you press begin", name: "Advanced settings for one workout",
    note: "Opened from the plan screen before you press Begin, or the small chip on the session card once you have. Defaults come from Settings, changes here last one workout.",
    pop: () => openWorkoutPrivacy(),
    setup: () => { SESSION = null; PENDING_PRIVACY = { live: true, details: false, cheers: true }; } },

  { page: "Watching them train", section: "When they hold something back", name: "They turned messages off",
    note: "Cheer buttons are gone rather than greyed. The database refuses the clip too, so it is not a UI-only promise.",
    setup: () => { LIVE_PARTNER = liveRow({ allow_cheers: false }); }, sheet: true },

  { page: "Doing the workout", section: "The session screen", name: "Mid set, bench press",
    note: "The exerciser's own screen. What they are working reads as a line between the target and the set dots, in their colour, with the demo tile beside it.",
    session: true, setup: () => { sessionFixture(); } },

  { page: "Doing the workout", section: "The session screen", name: "Resting, a hip hinge",
    note: "A hip hinge names the hamstrings and glutes, with the quads and lower back listed as helping.",
    session: true, setup: () => { sessionFixture({ exerciseIndex: 3, restStartedAt: Date.now() - 48000,
      setsDone: [[true, true, true, true], [true, true, true], [true, true, true], [true, false, false], [false, false, false]],
      setWeights: [[185, 185, 185, 185], [95, 95, 95], [60, 60, 60], [225]], completed: [true, true, true, false, false] }); } },

  { page: "Doing the workout", section: "The session screen", name: "An exercise the classifier does not know",
    note: "The card simply has no muscle line. Nothing else moves.",
    session: true, setup: () => { sessionFixture(); TODAY_WORKOUT.exercises[0] = { name: "Turkish Get-Up", sets: 3, reps: 5 }; } },

  { page: "Doing the workout", section: "Finishing", name: "All five done, one of them a record",
    note: "The ring fills, the numbers land, and the last line is the pair rather than a solo total. A PR earns its own tile; without one that tile is not there.",
    complete: true, setup: () => { completeFixture(); } },

  { page: "Doing the workout", section: "Finishing", name: "Stopped after two",
    note: "Ending early is a real outcome and reads as one: Workout Ended, no PR tile, no confetti. Same layout, no false celebration.",
    complete: true, setup: () => { completeFixture({ done: 2, elapsedMs: 18 * 60 * 1000, prs: 0 }); } },
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

/* The Body tab. Its rings and bars open empty and animate to the real number
   on the next frame, which a still capture would freeze at zero, so the
   resting values are applied straight after the render, the same way the
   finish screen's ring is handled. */
async function renderBodyState() {
  const panel = stage.querySelector("#tab-body");
  panel.classList.remove("hidden");
  renderBodyTab(true);
  await settle();
  panel.querySelectorAll(".bi-ring .fill").forEach((f) => { f.style.strokeDashoffset = f.dataset.off; });
  panel.querySelectorAll(".bi-ring-val").forEach((v) => { v.textContent = v.dataset.target + "%"; });
  panel.querySelectorAll(".bi-seg i").forEach((i) => { i.style.setProperty("--fill", i.dataset.fill); });
  // The figure is Rive on WebGL and cannot draw here. Say so rather than
  // leaving two blank rectangles that read as a broken screen.
  panel.querySelectorAll(".bi-fig").forEach((f) => {
    f.innerHTML = '<div class="gal-nofig">' + f.dataset.view + ' figure<span>live only, Rive/WebGL</span></div>';
  });
  return '<div class="gal-inner">' + deId(header.outerHTML + panel.outerHTML) + "</div>";
}

async function renderProgressState() {
  const panel = stage.querySelector("#tab-progress");
  panel.classList.remove("hidden");
  ALL_ENTRIES = Object.values(ENTRIES).flat();
  renderProgressTab();
  await settle();
  const chart = panel.querySelector(".chart-wrap");
  if (chart) chart.innerHTML = '<div class="gal-nofig">Weight chart<span>live only, Chart.js</span></div>';
  return '<div class="gal-inner">' + deId(header.outerHTML + panel.outerHTML) + "</div>";
}

/* Some states are just markup, with no data behind them. */
async function renderRawState(st) {
  return '<div class="gal-dark">' + deId(st.raw()) + "</div>";
}

/* Prototype: the goal bubble picker. Every other state in this file renders
   real app code against fake data; this one does not, because the picker has
   never been built into index.html at all. Positions are hand placed and
   checked for overlap once, offline, rather than produced by the live spring
   simulation the actual prototype runs, the same way every other "frame" in
   this gallery is a still image rather than a running loop. See the flag on
   the page itself, and "Choosing a goal, bubble picker" in Open issues. */
function protoBub(kind, icoKey, b, active, picked) {
  const cls = "proto-bub " + kind + (active ? " active" : "") + (picked ? " picked" : "");
  const inner = kind === "parent"
    ? '<span class="proto-bub-ico">' + icon(icoKey, 20) + '</span><span class="proto-bub-label">' + escapeHtml(b.label) + "</span>"
    : '<span class="proto-bub-label">' + escapeHtml(b.label) + "</span>";
  return '<div class="' + cls + '" style="width:' + (b.r * 2) + "px;height:" + (b.r * 2) + "px;left:" + (b.x - b.r) + "px;top:" + (b.y - b.r) + 'px">'
    + '<span class="proto-bub-inner">' + inner + "</span></div>";
}

const PROTO_STATES = {
  resting: {
    w: 357, h: 380,
    bubbles: [
      { kind: "parent", ico: "arrowDown", b: { label: "Lose weight", r: 58, x: 95, y: 90 } },
      { kind: "parent", ico: "dumbbell", b: { label: "Build muscle", r: 56, x: 255, y: 70 } },
      { kind: "parent", ico: "bolt", b: { label: "Get stronger", r: 52, x: 60, y: 230 } },
      { kind: "parent", ico: "refresh", b: { label: "Lose fat, build muscle", r: 60, x: 270, y: 220 } },
      { kind: "parent", ico: "clock", b: { label: "Stay consistent", r: 54, x: 175, y: 310 } },
    ],
  },
  oneOpen: {
    w: 357, h: 470,
    bubbles: [
      { kind: "parent", ico: "bolt", active: true, b: { label: "Get stronger", r: 58, x: 178, y: 195 } },
      { kind: "child", b: { label: "Bench my bodyweight", r: 34, x: 178, y: 71 } },
      { kind: "child", b: { label: "Get a first pull-up", r: 34, x: 296, y: 157 } },
      { kind: "child", b: { label: "Deadlift 2x bodyweight", r: 34, x: 251, y: 295 } },
      { kind: "child", b: { label: "Squat 1.5x bodyweight", r: 34, x: 105, y: 295 } },
      { kind: "child", b: { label: "Lift heavier, generally", r: 34, x: 60, y: 157 } },
    ],
  },
  twoOpenPicked: {
    w: 357, h: 560,
    bubbles: [
      { kind: "parent", ico: "arrowDown", active: true, b: { label: "Lose weight", r: 50, x: 140, y: 180 } },
      { kind: "child", picked: true, b: { label: "Lose 10 to 15 lb", r: 30, x: 140, y: 80 } },
      { kind: "child", b: { label: "Lose 20+ lb", r: 30, x: 227, y: 230 } },
      { kind: "child", picked: true, b: { label: "Fit old clothes again", r: 30, x: 53, y: 230 } },
      { kind: "parent", ico: "clock", active: true, b: { label: "Stay consistent", r: 50, x: 235, y: 400 } },
      { kind: "child", picked: true, b: { label: "Get back into a routine", r: 30, x: 235, y: 300 } },
      { kind: "child", b: { label: "Show up 3x a week", r: 30, x: 235, y: 500 } },
    ],
  },
};

function protoHeader(kicker, h1, sub) {
  return '<div class="ob-kicker">' + escapeHtml(kicker) + '</div>'
    + '<h1 class="ob-h1">' + escapeHtml(h1) + "</h1>"
    + '<p class="ob-sub">' + escapeHtml(sub) + "</p>";
}

async function renderBubblesState(st) {
  const s = PROTO_STATES[st.bubbles];
  const field = '<div class="proto-field" style="width:' + s.w + "px;height:" + s.h + 'px">'
    + s.bubbles.map((x) => protoBub(x.kind, x.ico, x.b, x.active, x.picked)).join("")
    + "</div>";
  const ctaCount = s.bubbles.filter((x) => x.kind === "child" && x.picked).length;
  const cta = ctaCount === 0 ? "" : '<button type="button" class="btn-cta" style="margin-top:16px" disabled>'
    + icon("dumbbell", 22) + " Continue with " + ctaCount + (ctaCount === 1 ? " goal" : " goals")
    + '<span class="go">' + icon("chevronRight", 22) + "</span></button>";
  return '<div class="gal-inner">'
    + '<span class="proto-flag">' + icon("bell", 12) + " Prototype, not live</span>"
    + protoHeader("STEP 2 OF 5", "What's the goal?", st.subline)
    + field + cta
    + "</div>";
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

/* The finish screen fills its ring across two animation frames. A still life
   wants the value it settles ON, and waiting for rAF here hangs the build in
   headless, so the resting offset is applied straight after the render. */
async function renderCompleteState() {
  const card = $("sessionCard");
  card.classList.remove("hidden");
  await renderSessionComplete();
  await settle();
  const fill = $("scFill");
  if (fill) fill.style.strokeDashoffset = fill.dataset.off;
  return deId(card.outerHTML);
}

const setTheme = (t) => {
  document.documentElement.setAttribute("data-theme", t);
  $("galLight").classList.toggle("on", t === "light");
  $("galDark").classList.toggle("on", t === "dark");
};

(async () => {
  /* The app's light palette lives behind html[data-theme="light"], so an
     un-stamped host would render this dark. Light is the app's default, so
     state it before anything is drawn: the figures pick their theme at
     render time. */
  setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");

  /* Pages hold sections hold frames. The order is the journey, stated here
     rather than left to whatever order the states happen to be declared in,
     and the frame numbers follow it so they ascend as you scroll. */
  const PAGE_ORDER = [
    "Opening the app", "Planning the workout", "Doing the workout", "Reading your body",
    "Looking back", "Watching them train", "Sending a clip", "Getting a clip",
  ];
  const SECTION_ORDER = {
    "Opening the app": ["The everyday state", "Other shapes of the same screen", "When they are training", "Explaining a number"],
    "Planning the workout": ["While it thinks", "Before you press begin"],
    "Doing the workout": ["The session screen", "Finishing"],
    "Reading your body": ["The screen itself", "The explainers behind it"],
    "Looking back": ["The Progress tab"],
    "Watching them train": ["Where they are up to", "What the muscle line says", "When they hold something back"],
    "Sending a clip": ["Filming it", "After you press send"],
    "Getting a clip": ["The pill on your session", "Two watches, then gone"],
  };
  const rank = (list, v) => { const i = list.indexOf(v); return i < 0 ? 999 : i; };
  const ORDERED = STATES.slice().sort((a, b) =>
    rank(PAGE_ORDER, a.page) - rank(PAGE_ORDER, b.page) ||
    rank(SECTION_ORDER[a.page] || [], a.section) - rank(SECTION_ORDER[b.page] || [], b.section) ||
    STATES.indexOf(a) - STATES.indexOf(b));

  const slug = (t) => t.replace(/\\W+/g, "-").toLowerCase();
  const pages = new Map();
  for (let i = 0; i < ORDERED.length; i++) {
    const st = ORDERED[i];
    resetFixtures();
    st.setup();
    let html;
    try {
      html = st.raw ? await renderRawState(st)
           : st.pill ? await renderPillState()
           : st.sheet ? await renderSheetState()
           : st.gen ? await renderGenState(st)
           : st.pop ? await renderPopState(st)
           : st.body ? await renderBodyState()
           : st.progress ? await renderProgressState()
           : st.complete ? await renderCompleteState()
           : st.session ? await renderSessionState()
           : st.bubbles ? await renderBubblesState(st)
           : await renderHomeState();
    } catch (e) {
      html = '<div class="gal-empty">This state threw: ' + escapeHtml(e.message) + "</div>";
      console.error(st.name, e);
    }
    const frameId = "f-" + (i + 1) + "-" + slug(st.name);
    if (!pages.has(st.page)) pages.set(st.page, new Map());
    const sections = pages.get(st.page);
    if (!sections.has(st.section)) sections.set(st.section, []);
    sections.get(st.section).push({
      n: i + 1, name: st.name, id: frameId, note: st.note || "", screen: html,
      html:
        '<figure class="gal-frame" id="' + frameId + '">' +
          '<figcaption class="gal-cap"><span class="gal-num">' + (i + 1) + '</span>' +
            '<span class="gal-name">' + escapeHtml(st.name) + "</span></figcaption>" +
          (st.note ? '<p class="gal-note">' + escapeHtml(st.note) + "</p>" : "") +
          '<div class="gal-phone" data-frame-play="' + frameId + '">' + html + "</div>" +
        "</figure>",
    });
  }

  const PAGE_NOTES = {
    "Choosing a goal": "Not built yet. A prototype for the onboarding goal step: tap a broad goal, it opens into specific ones, and everything you open or pick stays open until you say otherwise. Tracked in Open issues.",
    "Opening the app": "The first thing you see, in the states it is actually in: both of you going, one of you behind, nobody paired yet, and the moment they start training.",
    "Planning the workout": "From pressing generate to standing over the plan with your thumb on begin.",
    "Doing the workout": "Your own screen, mid session. This is the one you look at with a barbell in front of you.",
    "Reading your body": "The Body tab turns logged sets into a picture. These are the cards that say where each number came from, reachable from the small i beside it.",
    "Watching them train": "Their session as it reaches you: how far in, what they are on, and the parts they can keep to themselves.",
    "Sending a clip": "Twenty seconds, one take, and a straight answer about whether it left your phone.",
    "Getting a clip": "It waits on the pill, loops while you watch, and gives you exactly one more before it is gone.",
  };

  /* Every section is a flow, and every page is all of its flows end to end.
     The player reads from here, so the thing you click through is the same
     markup the gallery drew, not a second copy that can drift from it. */
  const FLOWS = {};
  const frameFlow = {};
  const byNumber = {};

  let pageNo = 0;
  const canvas = [], tree = [];
  for (const [pageName, sections] of pages) {
    pageNo++;
    const pageId = "p-" + slug(pageName);
    const total = [...sections.values()].reduce((n, f) => n + f.length, 0);

    const pageFrames = [];
    for (const [secName, frames] of sections) {
      const flowId = "s-" + slug(pageName + "-" + secName);
      FLOWS[flowId] = { title: pageName + " / " + secName, frames };
      frames.forEach((f, i) => { frameFlow[f.id] = { flow: flowId, at: i }; byNumber[f.n] = { flow: flowId, at: i }; });
      pageFrames.push(...frames);
    }
    FLOWS[pageId] = { title: pageName, frames: pageFrames };

    canvas.push(
      '<section class="fig-page" id="' + pageId + '">' +
        '<div class="fig-page-head"><span class="fig-page-n">' + pageNo + '</span>' +
          '<h2 class="fig-page-name">' + escapeHtml(pageName) + "</h2>" +
          '<button type="button" class="fig-play fig-play-page" data-play="' + pageId + '">' +
            "&#9654; Play all " + total + "</button></div>" +
        (PAGE_NOTES[pageName] ? '<p class="fig-page-note">' + escapeHtml(PAGE_NOTES[pageName]) + "</p>" : "") +
        [...sections.entries()].map(([secName, frames]) =>
          '<div class="fig-section" id="s-' + slug(pageName + "-" + secName) + '">' +
            '<div class="fig-section-head"><span class="fig-section-name">' + escapeHtml(secName) +
              '</span><span class="fig-section-rule"></span>' +
              '<span class="fig-section-n">' + frames.length + " frame" + (frames.length === 1 ? "" : "s") + "</span>" +
              '<button type="button" class="fig-play" data-play="s-' + slug(pageName + "-" + secName) + '">' +
                "&#9654; Play</button></div>" +
            '<div class="gal-grid">' + frames.map((f) => f.html).join("") + "</div>" +
          "</div>").join("") +
      "</section>");

    tree.push(
      '<button type="button" class="fig-page-btn" data-page="' + pageId + '">' +
        '<span class="caret">&#9662;</span>' + escapeHtml(pageName) +
        '<span class="count">' + total + "</span></button>" +
      '<div class="fig-kids">' +
        [...sections.entries()].map(([secName, frames]) =>
          '<a class="fig-sec-label" href="#s-' + slug(pageName + "-" + secName) + '">' + escapeHtml(secName) +
            '<span>' + frames.length + "</span></a>" +
          frames.map((f) =>
            '<a class="fig-link" href="#' + f.id + '" data-frame="' + f.id + '"><i>' + f.n + "</i>" +
              escapeHtml(f.name) + "</a>").join("")).join("") +
      "</div>");
  }
  /* Design handoffs come after the real screens, and the master sheet goes
     last of all: neither one is a screen pulled from index.html. */
  canvas.push(BADGES_HTML);
  tree.push(BADGES_TREE);
  canvas.push(ISSUES_HTML);
  tree.push(ISSUES_TREE);

  $("galBody").innerHTML = canvas.join("");
  $("galTree").innerHTML = tree.join("");
  stage.remove();

  /* ---- the flow player ----
     Click a frame and it plays its section from there: the screens in order,
     one at a time, at phone size, with the note under each. Arrow keys, the
     buttons, or tapping the left and right thirds of the screen, which is how
     a prototype behaves everywhere else. */
  let PLAY = null;
  const fit = () => {
    if (!PLAY) return;
    const stage = $("protoStage"), phone = $("protoPhone");
    phone.style.transform = "scale(1)";
    const box = stage.getBoundingClientRect(), card = phone.getBoundingClientRect();
    if (!card.height) return;
    const s = Math.min(1.35, (box.height - 24) / card.height, (box.width - 24) / card.width);
    phone.style.transform = "scale(" + Math.max(0.4, s) + ")";
  };
  const paintFlow = () => {
    const f = PLAY.frames[PLAY.at];
    $("protoFlow").textContent = PLAY.title;
    $("protoName").textContent = f.n + ". " + f.name;
    $("protoPhone").innerHTML = f.screen;
    $("protoNote").textContent = f.note || "";
    $("protoStep").textContent = (PLAY.at + 1) + " / " + PLAY.frames.length;
    $("protoPrev").disabled = PLAY.at === 0;
    /* At the end of a section, carry on into whatever comes next in the
       journey instead of dead-ending: sending a clip and receiving one are
       the same story told from two phones. */
    const last = PLAY.at === PLAY.frames.length - 1;
    const after = last ? byNumber[f.n + 1] : null;
    PLAY.handoff = after && after.flow !== PLAY.id ? after : null;
    $("protoNext").disabled = last && !PLAY.handoff;
    $("protoNext").textContent = PLAY.handoff
      ? "Next: " + FLOWS[PLAY.handoff.flow].title.split(" / ").pop()
      : "Next";
    $("protoDots").innerHTML = PLAY.frames.map((x, i) =>
      '<button type="button" class="proto-dot' + (i === PLAY.at ? " on" : "") + '" data-dot="' + i +
        '" aria-label="' + escapeHtml(x.name) + '"></button>').join("");
    fit();
  };
  const step = (d) => {
    if (!PLAY) return;
    const next = PLAY.at + d;
    if (d > 0 && next >= PLAY.frames.length) {
      if (PLAY.handoff) openFlow(PLAY.handoff.flow, PLAY.handoff.at);
      return;
    }
    if (next < 0 || next >= PLAY.frames.length) return;
    PLAY.at = next;
    paintFlow();
  };
  function openFlow(flowId, at) {
    const flow = FLOWS[flowId];
    if (!flow || !flow.frames.length) return;
    PLAY = { id: flowId, title: flow.title, frames: flow.frames, at: Math.max(0, Math.min(at || 0, flow.frames.length - 1)) };
    $("protoScrim").classList.add("on");
    paintFlow();
  }
  const closeFlow = () => { PLAY = null; $("protoScrim").classList.remove("on"); $("protoPhone").innerHTML = ""; };

  $("protoX").onclick = closeFlow;
  $("protoPrev").onclick = () => step(-1);
  $("protoNext").onclick = () => step(1);
  $("protoPrevZone").onclick = () => step(-1);
  $("protoNextZone").onclick = () => step(1);
  $("protoDots").onclick = (e) => {
    const d = e.target.closest("[data-dot]");
    if (d && PLAY) { PLAY.at = Number(d.dataset.dot); paintFlow(); }
  };
  $("protoScrim").onclick = (e) => { if (e.target === $("protoScrim")) closeFlow(); };
  window.addEventListener("resize", fit);
  document.addEventListener("keydown", (e) => {
    if (!PLAY) return;
    if (e.key === "Escape") closeFlow();
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  /* Play a whole page or one section from its header. */
  $("galBody").addEventListener("click", (e) => {
    const play = e.target.closest("[data-play]");
    if (play) { openFlow(play.dataset.play, 0); return; }
    /* Or click the screen itself and start there, inside its own section. */
    const frame = e.target.closest("[data-frame-play]");
    if (frame) {
      const where = frameFlow[frame.dataset.framePlay];
      if (where) openFlow(where.flow, where.at);
    }
  });

  /* Clicking a frame in the tree highlights it, the way selecting a layer
     does. Collapsing a page folds its frames away. */
  $("galTree").querySelectorAll("[data-page]").forEach((b) => {
    b.onclick = (e) => {
      if (e.target.classList.contains("caret")) { b.classList.toggle("shut"); return; }
      document.getElementById(b.dataset.page)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  });
  const links = [...$("galTree").querySelectorAll("[data-frame]")];
  links.forEach((a) => {
    a.onclick = () => {
      const el = document.getElementById(a.dataset.frame);
      el?.classList.add("flash");
      setTimeout(() => el?.classList.remove("flash"), 900);
    };
  });

  /* The tree follows the canvas, so you always know where you are. */
  const crumb = $("galCrumb");
  const seen = new Map();
  const spy = new IntersectionObserver((entries) => {
    for (const en of entries) seen.set(en.target, en.isIntersecting ? en.intersectionRatio : 0);
    let best = null, bestR = 0;
    for (const [el, r] of seen) if (r > bestR) { best = el; bestR = r; }
    if (!best) return;
    let active = null;
    links.forEach((a) => {
      const on = a.dataset.frame === best.id;
      a.classList.toggle("on", on);
      if (on) active = a;
    });
    /* The tree follows the canvas the way a layers panel follows selection. */
    if (active) {
      const side = active.closest(".fig-side");
      const r = active.getBoundingClientRect(), sr = side.getBoundingClientRect();
      if (r.top < sr.top + 12 || r.bottom > sr.bottom - 12) active.scrollIntoView({ block: "center" });
    }
    const page = best.closest(".fig-page");
    const section = best.closest(".fig-section");
    if (page && crumb) {
      crumb.textContent = "Fit Together / " + page.querySelector(".fig-page-name").textContent +
        (section ? " / " + section.querySelector(".fig-section-name").textContent : "");
    }
  }, { rootMargin: "-15% 0px -60% 0px", threshold: [0, 0.25, 0.6] });
  document.querySelectorAll(".gal-frame").forEach((f) => spy.observe(f));

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

const count = (BODY.match(/page: "/g) || []).length;
console.log(`states.html written (${count} states)`);
