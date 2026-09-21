/* Drives every overlay in the sandbox and answers, with a real finger rather
   than a computed style:

     1. with the overlay open, does a drag on the backdrop move the page behind?
     2. does a drag inside the overlay's own content scroll that content?
     3. does a pull from the panel's top edge dismiss it?
     4. is the page behind still where it was once it has gone?

     node scripts/modal-scroll-check.mjs [out-dir]

   Serve the repo root yourself first; HTTP=<port> picks the server, CDP=<port>
   the debugger, MARK=<string> asserts the served file is the one you built.
*/
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const out = process.argv[2] || "/tmp/wt2-shots";
mkdirSync(out, { recursive: true });
const HTTP = process.env.HTTP || 8941;
const PORT = Number(process.env.CDP || 9541);
const MARK = process.env.MARK || "";
const ONLY = process.env.ONLY || "";
const CH = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 390, H = 844;
const chrome = spawn(CH, ["--headless=new", "--use-angle=swiftshader", "--use-gl=swiftshader",
  "--enable-unsafe-swiftshader", "--disable-lcd-text",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/ch-wt2-${process.pid}`,
  `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2200);
const tab = await (await fetch(`http://localhost:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
const ws = await new Promise((r, j) => { const w = new WebSocket(tab.webSocketDebuggerUrl); w.addEventListener("open", () => r(w)); w.addEventListener("error", j); });
let id = 0;
let errors = [];
ws.addEventListener("message", (e) => {
  const x = JSON.parse(e.data);
  if (x.method === "Runtime.consoleAPICalled" && x.params.type === "error")
    errors.push("error: " + x.params.args.map((a) => a.value || a.description || a.type).join(" "));
  if (x.method === "Runtime.exceptionThrown")
    errors.push("exception: " + (x.params.exceptionDetails.exception?.description || x.params.exceptionDetails.text));
});
const send = (m, p = {}) => new Promise((res, rej) => {
  const i = ++id;
  const h = (e) => { const x = JSON.parse(e.data); if (x.id === i) { ws.removeEventListener("message", h); x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result); } };
  ws.addEventListener("message", h); ws.send(JSON.stringify({ id: i, method: m, params: p }));
});
const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name) => {
  const s = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${out}/${name}.png`, Buffer.from(s.data, "base64"));
};

/* A real finger: touchStart, a run of touchMove, touchEnd. Enough steps that
   the app's own 6px claim threshold sees a plausible gesture, not a teleport. */
async function drag(x, y, dx, dy, { steps = 16, hold = 18 } = {}) {
  const pt = (px, py) => [{ x: Math.round(px), y: Math.round(py), radiusX: 12, radiusY: 12, force: 1 }];
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt(x, y) });
  await wait(30);
  for (let i = 1; i <= steps; i++) {
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pt(x + (dx * i) / steps, y + (dy * i) / steps) });
    await wait(hold);
  }
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/* Where the page behind actually sits. With a position-fixed lock the
   scrolling element reads 0 and the saved offset is the truth, so ask for
   both and let the caller compare like with like. */
const pageY = () => ev(`(() => {
  const el = document.scrollingElement || document.documentElement;
  const fixed = getComputedStyle(document.body).position === "fixed";
  return { top: Math.round(el.scrollTop), fixed, parked: fixed ? Math.round(-parseFloat(document.body.style.top || 0)) : Math.round(el.scrollTop) };
})()`);

await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: true, screenWidth: W, screenHeight: H });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

async function boot(theme = "light") {
  errors = [];
  await send("Page.navigate", { url: `http://127.0.0.1:${HTTP}/sandbox-app.html?scenario=paired` });
  await wait(4200);
  if (MARK) {
    const seen = await ev(`typeof __WT2 === "string" ? __WT2 : ""`);
    if (seen !== MARK) throw new Error(`served file is not mine: marker ${JSON.stringify(seen)} != ${JSON.stringify(MARK)}`);
  }
  await ev(`showApp()`);
  await ev(`IS_PREMIUM = true`);
  if (theme !== "light") await ev(`applyTheme(${JSON.stringify(theme)})`);
  await wait(900);
  /* The fixture pops a badge celebration on boot, and .pop-scrim outranks every
     sheet, so leaving it up means every gesture below lands on it instead. */
  await ev(`closeAllOverlays()`);
  await wait(400);
}

/* [name, tab to sit on behind it, expression that opens it, scrim selector] */
const CASES = [
  ["partner",     "home",     `openPartnerSheet()`,                    "#partnerSheetScrim"],
  ["allWorkouts", "workout",  `openAllWorkouts()`,                     "#allWorkoutsScrim"],
  ["timeline",    "home",     `openTimelineSheet()`,                   "#timelineScrim"],
  ["daySheet",    "home",     `openBothDaySheet(todayStr())`,          "#daySheetScrim"],
  ["recap",       "home",     `openRecap(MY_EMAIL, ME, todayStr())`,   "#recapScrim"],
  ["track",       "progress", `openTrackSheet(MY_PROFILE?.goal_bubble)`, "#trackScrim"],
  ["measure",     "progress", `openMeasurementsSheet()`,               "#measureScrim"],
  ["cardio",      "progress", `openCardioSheet()`,                     "#cardioScrim"],
  ["report",      "progress", `openStrengthReport(ME)`,                "#reportScrim"],
  ["lifts",       "progress", `openLiftBrowser(ME)`,                   "#liftsScrim"],
  ["picker",      "workout",  `cbOpenPicker("draft")`,                 "#cbPickScrim"],
  ["pop",         "home",     `showNextMilestoneCelebration()`,        "#popScrim"],
];

const geomOf = (sel) => ev(`(() => {
  const s = document.querySelector(${JSON.stringify(sel)});
  if (!s || s.classList.contains("hidden")) return null;
  const p = s.firstElementChild;
  const r = p.getBoundingClientRect();
  const scrollers = [...p.querySelectorAll("*")].filter(el => {
    const o = getComputedStyle(el).overflowY;
    return (o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight + 1;
  });
  return { top: Math.round(r.top), h: Math.round(r.height),
           panelScrollable: p.scrollHeight > p.clientHeight + 1,
           scrollH: p.scrollHeight, clientH: p.clientHeight,
           overflowY: getComputedStyle(p).overflowY,
           innerScrollers: scrollers.length,
           innerSel: scrollers[0] ? (scrollers[0].className || scrollers[0].id || scrollers[0].tagName) : null };
})()`);

const scrollTops = (sel) => ev(`(() => {
  const p = document.querySelector(${JSON.stringify(sel)}).firstElementChild;
  const all = [p, ...p.querySelectorAll("*")].filter(el => { const o = getComputedStyle(el).overflowY; return o==="auto"||o==="scroll"; });
  return all.map(el => el.scrollTop).reduce((a,b)=>a+b,0);
})()`);

const rows = [];
const only = ONLY ? ONLY.split(",") : null;
for (const [name, tab, opener, sel] of CASES) {
  if (only && !only.includes(name)) continue;
  const row = { name };
  try {
    await boot();
    await ev(`switchTab(${JSON.stringify(tab)})`); await wait(1100);
    /* Parked halfway down whatever is behind, so a stolen scroll shows up in
       either direction rather than running into the end of the page. */
    row.pageRange = await ev(`Math.max(0, document.documentElement.scrollHeight - window.innerHeight)`);
    await ev(`window.scrollTo(0, Math.round((document.documentElement.scrollHeight - window.innerHeight) / 2))`);
    await wait(400);
    const before = await pageY();
    row.before = before.parked;
    try { await ev(`(async()=>{ await (${opener}); })()`); } catch (e) { row.openErr = String(e).slice(0, 120); }
    await wait(1200);
    const g = await geomOf(sel);
    if (!g) { row.note = "did not open"; rows.push(row); continue; }
    row.panel = g;
    await shot(`${name}-open`);

    // 1. backdrop drag: the page behind must not move.
    if (g.top > 30) {
      const by = Math.max(10, Math.round(g.top / 2));
      await drag(195, by, 0, -200);
      await wait(700);
      const up = (await pageY()).parked - before.parked;
      await drag(195, by, 0, 200);
      await wait(700);
      const down = (await pageY()).parked - before.parked;
      row.backdropMovedPage = [up, down];
      await ev(`window.scrollTo(0, ${before.parked})`);
      await wait(200);
    } else row.backdropMovedPage = "no backdrop";

    // 2. drag inside the panel content: the panel must scroll, page must not.
    const cy = Math.round(g.top + Math.min(Math.max(g.h - 60, 60), 500));
    const sBefore = await scrollTops(sel);
    const pBefore = await pageY();
    await drag(195, cy, 0, -300, { steps: 20 });
    await wait(700);
    row.contentScrolled = (await scrollTops(sel)) - sBefore;
    const pAfter = await pageY();
    row.contentMovedPage = pAfter.parked - pBefore.parked;
    if (row.contentScrolled > 40) await shot(`${name}-scrolled`);

    // 3. pull from the panel's top edge: it must dismiss.
    await ev(`(() => { const p = document.querySelector(${JSON.stringify(sel)}).firstElementChild;
      const all = [p, ...p.querySelectorAll("*")]; all.forEach(el => { el.scrollTop = 0; }); })()`);
    await wait(250);
    const g2 = await geomOf(sel);
    await drag(195, Math.round((g2?.top ?? g.top) + 18), 0, 240, { steps: 14, hold: 14 });
    await wait(900);
    row.dismissed = await ev(`document.querySelector(${JSON.stringify(sel)}).classList.contains("hidden")`);

    // 4. the page is where it was.
    await wait(400);
    const end = await pageY();
    row.pageAfterClose = end.parked;
    row.pageKept = end.parked === before.parked;
    row.errors = errors.slice(0, 3);
  } catch (e) { row.err = String(e).slice(0, 200); }
  rows.push(row);
}

console.log(JSON.stringify(rows, null, 1));

// Ordinary page scrolling must still work, by finger and by wheel, both themes.
for (const theme of ["light", "dark"]) {
  await boot(theme);
  await ev(`window.scrollTo(0, 0)`); await wait(300);
  await drag(195, 620, 0, -320, { steps: 20 });
  await wait(700);
  const byFinger = (await pageY()).parked;
  await ev(`window.scrollTo(0, 0)`); await wait(250);
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 195, y: 500, deltaX: 0, deltaY: 400 });
  await wait(600);
  const byWheel = (await pageY()).parked;
  const w = await ev(`[document.documentElement.scrollWidth, document.documentElement.clientWidth]`);
  await shot(`page-${theme}`);
  console.log(`page scroll ${theme}: finger=${byFinger} wheel=${byWheel} width=${w.join("/")} errors=${errors.length}`);
  if (errors.length) console.log("  ", errors.slice(0, 5));
}

ws.close(); chrome.kill();
