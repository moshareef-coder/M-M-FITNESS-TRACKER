/* The sandbox shell: journey on the left, the real app in the middle, the
   world it wakes up in on the right.
 *
 * Every step drives the iframe by calling the app's OWN functions, not by
 * faking screens. Same origin, so switchTab, goWorkoutScreen, openLiveSheet
 * and the rest are all reachable. If a step stops working, the app changed,
 * which is exactly what we want a walkthrough to tell us.
 */
(function () {
  const $ = (id) => document.getElementById(id);
  const frame = $("app");
  const device = $("device");

  /* Types into the session's weight field the way a thumb would, so the app's
     own oninput banks it. Setting SESSION directly is not possible from here:
     it is a top-level `let`, which never lands on window. */
  function setSessionWeight(w, lb) {
    const el = w.document.getElementById("sessWeightVal");
    if (!el) return;
    el.value = String(lb);
    el.dispatchEvent(new w.Event("input", { bubbles: true }));
  }

  /* ---------- the journey ----------
     Grouped the way a person meets the app, not the way the code is laid out.
     `scenario` says which world the step needs; the phone only reloads when
     the step actually asks for a different one. */
  const JOURNEY = [
    { group: "Getting in", note: "Everything before there is an account.", steps: [
      { t: "Sign in", scenario: "signedout",
        s: "Google, or a link by email",
        note: "The first screen anyone ever sees. Two rings for the hero, both ways in below where the thumb is, and the legal links in front of you before you hand over an account. The buttons are live: pressing one shows the real loading and error states.",
        run: () => {} },

      { t: "Welcome tour", scenario: "fresh",
        s: "Three screens explaining the app",
        note: "Three statements between signing in and being asked anything: what the app is for, what a partner is, what the two rings mean. One idea per screen, dots to show where you are, and a skip that is always there. New sign-ups only, so nobody who already has an account sees it again.",
        run: (w) => w.renderOnboardIntro(0, {}) },

      { t: "Tell us about you", scenario: "fresh",
        s: "Name, goal, pace, plan",
        note: "The five-step wizard the intro hands you to. A real account with no profile row, so it runs for real: type a name and press through, and every answer is written to the fake database and read back by the next screen.",
        run: () => {} },

      { t: "Goal tiles (prototype)", scenario: "fresh", flag: "not live",
        s: "Tiles + bottom sheet, for real",
        note: "Not the real goal step, which is the one before this. The bubble version that used to live here got opened all the way (all nine categories, 52 bubbles) and stopped being readable, no spacing fix was going to save 52 items on one screen. A follow-up compared three structurally different pickers and Mo picked this one: nine categories always visible as a grid, tap one for its full checklist in a bottom sheet. Multi-select persists across categories. Nothing here writes to the fake database and Continue does not go anywhere, on purpose. Tracked in Open issues under Designed, not built.",
        run: (w) => w.renderGoalTilesPrototype?.() },

      { t: "Body focus (prototype)", scenario: "fresh", flag: "not live",
        s: "Tap the body, front and back",
        note: "The follow-up to the goal tiles: show the body and let a person mark which muscles they want to focus on, instead of describing goals in words. This is the actual purchased body figure, the same one Body Impact and the workout builder already render, not a stand-in. A tap marks or unmarks a muscle, plain and simple, no zoom: went through a tap-to-zoom pass and then a pinch-to-zoom pass, and neither turned out to be needed, so both are gone. Marking any muscle lights the whole group it belongs to (front delts and rear delts both from either one), the same keys Body Impact already tracks. Full body and Clear all sit under the figures for marking or clearing everything at once. Nothing here writes to the fake database and Continue does not go anywhere, on purpose. Tracked in Open issues under Designed, not built.",
        run: (w) => w.renderBodyFocusPrototype?.() },

      { t: "Limits and injuries (prototype)", scenario: "fresh", flag: "not live",
        s: "Shape is right, content is not",
        note: "READ THIS BEFORE JUDGING THE CHIPS: the eight body areas and six pieces of equipment are placeholder. They were written to have something real to tap, and they are wrong. The exercise library can only filter on five equipment values (bodyweight, dumbbell, barbell, cable, machine), so Pull-up bar, Squat rack and Bench do not exist in the engine at all, somebody could say they have no squat rack and nothing could honour it. Injuries are worse: there is no joint or pain concept in the library whatsoever, so 'my shoulder hurts' can only be acted on by proxy, which would drop most chest pressing while keeping plenty that genuinely loads a bad shoulder. The engine has to define this content. What IS worth judging here is the shape. The app holds nothing about injuries today, so it can prescribe overhead pressing to somebody with a bad shoulder and never find out; this is the screen for that, and where it sits is the point: AFTER the plan exists, never before. A limit is not a goal, it is a constraint on how the goal gets trained for, and asking up front turns 'what do you want' into 'what is wrong with you'. The plan is already made by here, so this only ever makes it safer, which is why Skip for now is a real button and not small print. Only the stated half of the problem: the measured half, an exercise somebody quietly swaps away from every week, is being built engine-side separately and is the better signal. Nothing writes to the fake database, on purpose. Tracked in Open issues under Designed, not built.",
        run: (w) => w.renderLimitsPrototype?.() },

      { t: "First look at an empty app", scenario: "fresh",
        s: "No workouts, no partner, no history",
        note: "What a stranger sees on day one. Skip past onboarding first if it is still on screen. This is the state that has never been walked properly end to end, so look hard at the empty cards.",
        run: (w) => w.switchTab("home") },
    ]},

    { group: "A normal day", note: "The loop the app exists for.", steps: [
      { t: "Home", scenario: "paired",
        s: "The week, both of you",
        note: "Paired with Mell, a pull session already logged this morning and a push day queued. The week strip carries both people, the hero card carries today. Tap a day tile to open that day.",
        run: (w) => w.switchTab("home") },

      { t: "Pick how to train", scenario: "paired",
        s: "Generate, build, or plan the week",
        note: "The fork at the top of the workout tab. All three routes below are reachable from here, so try it by tapping rather than by the rail.",
        run: (w) => { w.switchTab("workout"); w.goWorkoutScreen("choose"); } },

      { t: "Generate a workout", scenario: "paired",
        s: "The engine, live",
        note: "This is the deterministic engine that replaces the model call, running right here in your browser against the fake data, not a screenshot of it. The honest line about pace pops as a toast a beat after the plan lands, because the reveal sheet itself only ever shows the exercises. Tap Generate and read the plan it built for Mo: a pull session yesterday and a push day already queued, so this is the engine picking the next thing in the rotation.",
        run: (w) => {
          w.switchTab("workout");
          w.goWorkoutScreen("choose");
          // goWorkoutScreen animates the screen swap and only renders the
          // buttons once that settles (220ms fallback if the animation event
          // never fires, which it will not while the phone is still loading).
          // 400ms clears that with room to spare before the click below.
          setTimeout(() => { w.document.getElementById("chooseGenerateBtn")?.click(); }, 400);
        } },

      { t: "Generate for a beginner", scenario: "fresh",
        s: "Day one, no history",
        note: "Same button, same engine, a person the app knows nothing about yet: no profile, no logged sets, no goal on file. This is where the honest line does the most work, the plan comes back deliberately cautious and says so rather than guessing a load it has no basis for.",
        run: (w) => {
          w.switchTab("workout");
          w.goWorkoutScreen("choose");
          setTimeout(() => { w.document.getElementById("chooseGenerateBtn")?.click(); }, 400);
        } },

      { t: "Build one yourself", scenario: "paired",
        s: "Search, categories, sets and reps",
        note: "The screen with the keyboard bug we fixed: type in the search box and the sheet should stay put rather than sliding under the keyboard. Categories should clear the search field.",
        run: (w) => { w.switchTab("workout"); w.goWorkoutScreen("manual"); } },

      { t: "Plan the week", scenario: "paired",
        s: "Assign workouts to days",
        note: "Tap any day to plan it. Planned days feed the week strip on home and the auto-schedule.",
        run: (w) => { w.switchTab("workout"); w.goWorkoutScreen("week"); } },

      { t: "Saved workouts", scenario: "paired",
        s: "Two saved, openable",
        note: "The list that used to be called a loadout. Tap one to see its exercises, tap an exercise for the detail. Nothing here says loadout any more.",
        run: (w) => { w.switchTab("workout"); w.openSavedList(); } },

      { t: "Do the workout", scenario: "paired",
        s: "Five exercises, live timer",
        note: "The real session screen on today's push day. Log sets, change weights, tap through exercises. Weight and reps should sit on the same baseline in every row. Finish it and the completion screen banks the workout into the fake database.",
        run: (w) => { w.switchTab("workout"); w.startWorkout(); } },

      { t: "Resting between sets", scenario: "paired",
        s: "A ring, not a line of text",
        note: "One set logged, so rest has started. The ring counts down against a 90 second target, the two chips move that target by ten seconds, and it turns red for the last fifth. Past the target it counts up with a plus rather than sitting on zero. The weight is dropped under the bench best first, so this step shows rest on its own without a record firing over it.",
        run: (w) => {
          w.switchTab("workout");
          w.startWorkout();
          setSessionWeight(w, 175);
          w.toggleSet(0);
        } },

      { t: "A record, as it happens", scenario: "paired",
        s: "The banner on the set that broke it",
        note: "Bench Press has been logged at 180 before, so a set at 190 is a real record and says so on the spot instead of turning up later as a tag in Recent Activity. The banner drops in, bursts once and retracts on its own. Log two more sets at the same weight: it should stay quiet, because the record was already announced.",
        run: (w) => {
          w.switchTab("workout");
          w.startWorkout();
          setSessionWeight(w, 190);
          w.toggleSet(0);
        } },

      { t: "Finishing", scenario: "finished",
        s: "The screen after the last rep",
        note: "Every exercise on today's plan already logged, so the app's own route lands here: the ring fills, time, volume and the record land under it, and the last line is the pair rather than a solo total. End a workout early instead and the same layout drops the PR tile and the confetti, because that is not the same event.",
        run: (w) => { w.switchTab("workout"); w.startWorkout(); } },
    ]},

    { group: "The other person", note: "Everything that only matters because someone else is there.", steps: [
      { t: "They are training now", scenario: "live",
        s: "Live card on home",
        note: "Mell is nineteen minutes into leg day. The live card is on home; tap it for the sheet with what she is on and the cheer buttons. This is the state that fires the push notification we added.",
        run: (w) => { w.switchTab("home"); setTimeout(() => w.openLiveSheet(), 260); } },

      { t: "They keep it private", scenario: "livePrivate",
        s: "Same card, no detail",
        note: "Same live session with sharing turned off. You can see that she is training and cheer for her. You cannot see what she is lifting. The card has to still feel worth having.",
        run: (w) => { w.switchTab("home"); setTimeout(() => w.openLiveSheet(), 260); } },

      { t: "A clip is waiting", scenario: "clip",
        s: "Watch, then it is gone",
        note: "A clip only reaches you while you are training, so this starts your workout first and the pill appears above the set list. It loops for as long as you stay on it, you get exactly one more watch after you close it, then it is gone for good. The video is drawn by the sandbox, so it is a real playable file rather than a placeholder.",
        run: (w) => { w.switchTab("workout"); w.startWorkout(); setTimeout(() => w.openNextClip?.(), 500); } },

      { t: "Send a clip", scenario: "live", flag: "needs a camera",
        s: "Record twenty seconds",
        note: "The recorder asks for the camera, so in this frame you get the permission-denied state rather than a viewfinder. That path is worth reading on its own: it should explain itself, not just fail.",
        run: (w) => { w.switchTab("home"); setTimeout(() => w.openClipRecorder?.("mell@sandbox"), 260); } },

      { t: "Training alone", scenario: "solo",
        s: "No partner at all",
        note: "Every partner surface has to hold up with nobody there: no live card, no comparison, no second ring. Setup should offer pairing rather than showing an empty slot.",
        run: (w) => w.switchTab("home") },

      { t: "You are behind", scenario: "behind",
        s: "They trained, you did not",
        note: "She trained, you did not, and there is no plan queued to make it easy. This is the one that decides whether the app feels like a training partner or like a scold, so read the wording closely.",
        run: (w) => w.switchTab("home") },

      { t: "Rest day", scenario: "restday",
        s: "Deliberately not training",
        note: "A rest day is a choice, not a miss, so nothing is logged and no plan is waiting. The banner and the streak both have to treat it as deliberate rather than as a gap.",
        run: (w) => w.switchTab("home") },
    ]},

    { group: "Looking back", note: "The two tabs that answer how it is going.", steps: [
      { t: "Progress", scenario: "paired",
        s: "Weight, PRs, days trained",
        note: "One person per chart, whoever the You / Mell toggle is on: both lines shared an axis before, and forty five pounds between them flattened each into a straight line. Start, now, change and the goal read across the top, the dashes are the target, the pills change the window, and every weigh-in below opens the day it belongs to so a mistyped number is fixable here.",
        run: (w) => w.switchTab("progress") },

      { t: "A goal-shaped default", scenario: "paired",
        s: "Same tab, a different goal",
        note: "Mo's fixture goal is Lose weight, so the step above defaults to the weight chart. This one flips his goal to Stay consistent and reloads Progress: the default becomes days-trained-vs-target instead, because the old default was a flat [weight, trained] for every goal, and \"trained\" was not even a real card. Build muscle and Get stronger still fall back to weight for now, an empty tab would be worse than a not-quite-right one, until their own cards exist.",
        run: (w) => {
          const db = w.__SANDBOX.db;
          const me = db.profiles.find((p) => p.email === w.__SANDBOX.me);
          me.goal = "Stay consistent";
          delete me.tracked_metrics;
          w.loadAll().then(() => w.switchTab("progress"));
        } },

      { t: "Choose what to track", scenario: "paired",
        s: "The metric picker",
        note: "Not everyone cares about scale weight. Turning one off should remove it from the chart and the summary, not just grey it out.",
        run: (w) => { w.switchTab("progress"); setTimeout(() => w.document.getElementById("metricPicker")?.scrollIntoView({ behavior: "smooth", block: "center" }), 220); } },

      { t: "Progress photos", scenario: "paired",
        s: "Private by default",
        note: "Photos live on progress, not on home, because they are the most private thing in the app. Adding one opens the file picker for real.",
        run: (w) => { w.switchTab("progress"); setTimeout(() => w.document.getElementById("cardPhotos")?.scrollIntoView({ behavior: "smooth", block: "start" }), 220); } },

      { t: "Body", scenario: "paired",
        s: "What you have hit, what is next",
        note: "The tab we just rewrote. It answers one question, which muscle group to train next, and everything else is supporting detail. The information dots explain the levels and the rings.",
        run: (w) => w.switchTab("body") },
    ]},

    { group: "Settings", note: "Everything under the last tab.", steps: [
      { t: "Setup", scenario: "paired",
        s: "The settings index",
        note: "Every row here opens its own page. Check the rows line up and the icons match the line height of their labels.",
        run: (w) => w.switchTab("setup") },

      { t: "Profile and photo", scenario: "paired",
        s: "Upload, crop, zoom",
        note: "Uploading a photo opens the crop editor for real: pick a file and you get the circle, the zoom and the pan. The visible circle now matches exactly what gets saved, which it did not before.",
        run: (w) => { w.switchTab("setup"); w.openSettingsPage("profile"); } },

      { t: "Your partner", scenario: "paired",
        s: "Pairing, invite code, privacy",
        note: "Where sharing workout detail is turned off, which is what the private live card above is obeying.",
        run: (w) => { w.switchTab("setup"); w.openSettingsPage("partner"); } },

      { t: "Notifications", scenario: "paired", flag: "needs a home screen",
        s: "Push, nudges, partner started",
        note: "Web push only exists in an installed app on iOS, so inside this frame the toggle will report that it cannot subscribe. The list of what we would send is still the point: read it as copy.",
        run: (w) => { w.switchTab("setup"); w.openSettingsPage("notify"); } },

      { t: "Training preferences", scenario: "paired",
        s: "Goal, pace, equipment",
        note: "What the generator reads before it writes a plan.",
        run: (w) => { w.switchTab("setup"); w.openSettingsPage("training"); } },

      { t: "Milestones", scenario: "paired",
        s: "Badges earned, doing the real thing",
        note: "Earned from real data on load, not clicked into being: this fixture set already has a logged workout, so First Workout should already show unlocked. Everything still locked shows only a question mark, on purpose, so it never spoils what is coming.",
        run: (w) => { w.switchTab("setup"); w.openSettingsPage("milestones"); } },

      { t: "Theme", scenario: "paired",
        s: "Light, dark, system",
        note: "Dark mode is not the light one inverted. Card surfaces lift rather than drop shadows, and the two ring colours have separate dark values.",
        run: (w) => { w.switchTab("setup"); w.openSettingsPage("theme"); } },

      { t: "Account and legal", scenario: "paired",
        s: "Sign out, delete, privacy",
        note: "The delete path has to actually delete, and the privacy policy has to describe clips, photos and live sessions. Right now it predates all three, which is on the issues list.",
        run: (w) => { w.switchTab("setup"); w.openSettingsPage("account"); } },
    ]},
  ];

  /* Flat list, so previous and next are one line each. */
  const STEPS = [];
  JOURNEY.forEach((g) => g.steps.forEach((s) => STEPS.push({ ...s, group: g.group })));

  const SCENARIO_COPY = {
    signedout:   "Nobody is signed in. The app is on its very first screen.",
    fresh:       "A real account with no profile row yet, so onboarding runs.",
    paired:      "Paired with Mell. You pulled this morning; push day is queued.",
    solo:        "No partner. Every shared surface has to hold up empty.",
    live:        "Mell is nineteen minutes into leg day, sharing the detail.",
    livePrivate: "Mell is training with sharing switched off.",
    clip:        "Mell is live and a clip from an hour ago is unwatched.",
    behind:      "She trained today and yesterday. You did not.",
    restday:     "You marked today a rest day on purpose.",
    finished:    "Today's push day is done, every exercise logged, one of them a record.",
  };
  const SCENARIO_ORDER = ["paired", "signedout", "fresh", "solo", "live", "livePrivate", "clip", "behind", "restday", "finished"];
  const SCENARIO_LABEL = {
    signedout: "Signed out", fresh: "Brand new account", paired: "Paired, mid-week",
    solo: "Training alone", live: "Partner training now", livePrivate: "Partner keeps it private",
    clip: "A clip is waiting", behind: "You are behind", restday: "Rest day",
    finished: "Workout just finished",
  };

  /* ---------- driving the phone ---------- */
  let current = 0;
  let loaded = "signedout";   // matches the src in sandbox.html, so step one does not reload

  /* The app boots asynchronously. Wait for it to have put something on screen
     rather than guessing at a delay, or half the steps fire into an empty DOM. */
  function ready(win) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const poll = () => {
        try {
          const d = win.document;
          const app = d.getElementById("app");
          const ob = d.getElementById("onboard");
          const painted = (app && !app.classList.contains("hidden")) ||
                          (ob && ob.innerHTML.length > 300);
          if (painted && typeof win.switchTab === "function") return resolve(win);
        } catch { /* still navigating */ }
        if (Date.now() - t0 > 15000) return resolve(null);
        setTimeout(poll, 80);
      };
      poll();
    });
  }

  function load(scenario) {
    device.classList.add("loading");
    return new Promise((resolve) => {
      frame.onload = () => { frame.onload = null; ready(frame.contentWindow).then(resolve); };
      frame.src = `/sandbox-app.html?scenario=${encodeURIComponent(scenario)}`;
      loaded = scenario;
    });
  }

  async function go(i, { force = false } = {}) {
    current = Math.max(0, Math.min(STEPS.length - 1, i));
    const step = STEPS[current];
    paintHead(step);
    paintRail();
    paintScenarios(step.scenario);

    let win;
    if (force || step.scenario !== loaded) {
      win = await load(step.scenario);
    } else {
      win = frame.contentWindow;
      /* Same world, so do not reload: just stand down whatever the last step
         left open, which is faster and keeps anything you typed. An open
         workout session is part of that: it wins over everything else the
         workout tab can show, so "Pick how to train" and "Build one
         yourself" rendered as "workout in progress" the moment any later
         step (or the same one, revisited) had already started one. Every
         step that actually wants a session calls startWorkout() itself
         right after, which makes a fresh one unconditionally, so clearing
         here costs those steps nothing. */
      try { win.closeAllOverlays?.(); win.closeSettingsPage?.(); win.closeSavedSheet?.(); win.discardSession?.(); } catch {}
    }
    device.classList.remove("loading");
    if (!win) return;
    try { step.run(win); } catch (err) { console.warn("step failed:", step.t, err); }
  }

  /* ---------- painting ---------- */
  function paintHead(step) {
    $("crumb").textContent = step.group;
    $("stepTitle").textContent = step.t;
    $("stepNote").textContent = step.note;
    $("prevBtn").disabled = current === 0;
    $("nextBtn").disabled = current === STEPS.length - 1;
  }

  function paintRail() {
    const pane = $("paneJourney");
    if (!pane.dataset.built) {
      let n = 0, html = "";
      JOURNEY.forEach((g) => {
        html += `<div class="grp"><b>${esc(g.group)}</b><i>${g.steps.length}</i></div>`;
        g.steps.forEach((s) => {
          const idx = n++;
          html += `<button class="step" data-i="${idx}">
            <span class="n">${String(idx + 1).padStart(2, "0")}</span>
            <span>
              <span class="t">${esc(s.t)}${s.flag ? `<span class="flag">${esc(s.flag)}</span>` : ""}</span>
              <span class="s">${esc(s.s)}</span>
            </span>
          </button>`;
        });
      });
      pane.innerHTML = html;
      pane.dataset.built = "1";
      pane.addEventListener("click", (e) => {
        const b = e.target.closest(".step");
        if (b) go(Number(b.dataset.i));
      });
    }
    pane.querySelectorAll(".step").forEach((b) => {
      b.setAttribute("aria-current", Number(b.dataset.i) === current ? "true" : "false");
    });
  }

  function paintScenarios(active) {
    const box = $("scenarios");
    if (!box.dataset.built) {
      box.innerHTML = SCENARIO_ORDER.map((k) => `
        <button class="scn${k.startsWith("live") || k === "clip" ? " live" : ""}" data-k="${k}" aria-pressed="false">
          <span><span class="t">${esc(SCENARIO_LABEL[k])}</span><span class="d">${esc(SCENARIO_COPY[k])}</span></span>
          <span class="dot"></span>
        </button>`).join("");
      box.dataset.built = "1";
      box.addEventListener("click", async (e) => {
        const b = e.target.closest(".scn");
        if (!b) return;
        const k = b.dataset.k;
        paintScenarios(k);
        $("scenarioNote").innerHTML = `<b>Now showing</b>${esc(SCENARIO_COPY[k])}`;
        device.classList.add("loading");
        await load(k);
        device.classList.remove("loading");
      });
    }
    box.querySelectorAll(".scn").forEach((b) => {
      b.setAttribute("aria-pressed", b.dataset.k === active ? "true" : "false");
    });
    $("scenarioNote").innerHTML = `<b>Now showing</b>${esc(SCENARIO_COPY[active] || "")}`;
  }

  /* ---------- issues ---------- */
  const DONE_KEY = "ft_sandbox_done";
  const doneSet = new Set(JSON.parse(localStorage.getItem(DONE_KEY) || "[]"));
  const LEVEL_LABEL = {
    blocker: "Blocker", todo: "To do", waiting: "Waiting on you",
    native: "Needs native", debt: "Debt", closed: "Closed",
  };

  fetch("/issues.json")
    .then((r) => r.json())
    .then((groups) => {
      const open = groups.reduce((n, g) => n + g.items.filter((i) => i.level !== "closed").length, 0);
      $("issueCount").textContent = String(open);
      $("paneIssues").innerHTML = groups.map((g) => `
        <div class="isec"><b>${esc(g.group)}</b><p>${esc(g.note)}</p></div>
        ${g.items.map((it) => {
          const id = slug(it.title);
          return `<button class="issue${doneSet.has(id) ? " done" : ""}" data-id="${id}">
            <span class="lv lv-${it.level}">${esc(LEVEL_LABEL[it.level] || it.level)}</span>
            <span class="h">${esc(it.title)}</span>
            <span class="d">${esc(it.detail)}</span>
            <span class="w">${esc(it.where)}</span>
          </button>`;
        }).join("")}`).join("");
      $("paneIssues").addEventListener("click", (e) => {
        const b = e.target.closest(".issue");
        if (!b) return;
        /* Alt-click ticks one off. It only lives in this browser, which is the
           honest scope: the file on disk stays the source of truth. */
        if (e.altKey) {
          b.classList.toggle("done");
          b.classList.contains("done") ? doneSet.add(b.dataset.id) : doneSet.delete(b.dataset.id);
          localStorage.setItem(DONE_KEY, JSON.stringify([...doneSet]));
          return;
        }
        b.classList.toggle("open");
      });
    })
    .catch(() => { $("paneIssues").innerHTML = `<div class="isec"><p>issues.json did not load.</p></div>`; });

  /* ---------- chrome ---------- */
  $("tabJourney").onclick = () => showPane("Journey");
  $("tabIssues").onclick = () => showPane("Issues");
  function showPane(which) {
    ["Journey", "Issues"].forEach((k) => {
      $("tab" + k).setAttribute("aria-selected", String(k === which));
      $("pane" + k).hidden = k !== which;
    });
  }

  $("prevBtn").onclick = () => go(current - 1);
  $("nextBtn").onclick = () => go(current + 1);
  $("reloadBtn").onclick = () => go(current, { force: true });
  $("openBtn").onclick = () => window.open(frame.src, "_blank", "noopener");
  $("darkBtn").onclick = () => {
    const w = frame.contentWindow;
    try {
      const next = w.document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      w.applyTheme?.(next);
      $("darkBtn").textContent = next === "dark" ? "Flip the app to light" : "Flip the app to dark";
    } catch { /* frame still loading */ }
  };

  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
  });

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  /* The phone already has ?scenario=paired in its src, so step one only has to
     wait for it rather than reload it. */
  device.classList.add("loading");
  ready(frame.contentWindow).then(() => { device.classList.remove("loading"); go(0); });
})();
