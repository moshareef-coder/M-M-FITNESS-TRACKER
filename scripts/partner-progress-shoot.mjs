// Drives the Progress tab's partner switch in the sandbox and shoots it at
// 390px, once per sharing state, because the only honest proof that a number
// is withheld is a picture of the screen without it on.
//
//   node scripts/partner-progress-shoot.mjs out-dir
//
// Serve the repo root first (python3 -m http.server 9123).
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

const out = process.argv[2] || "shots";
mkdirSync(out, { recursive: true });
const HTTP = process.env.HTTP || 9123;
const PORT = 9640 + Math.floor(Math.random() * 120);
const CH = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 390, H = 844;
const MARKER = process.env.MARKER || "progWho";

const chrome = spawn(CH, ["--headless=new", "--use-angle=swiftshader", "--use-gl=swiftshader",
  "--enable-unsafe-swiftshader", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=/tmp/ch-prog-${process.pid}`, `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2000);

/* Four agents are serving nearby ports today, so the run refuses to shoot
   anything until the file on the wire is the one carrying my change. */
const served = await (await fetch(`http://127.0.0.1:${HTTP}/sandbox-app.html`)).text();
if (!served.includes(MARKER)) throw new Error(`port ${HTTP} is serving a sandbox without ${MARKER}: wrong tree`);

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
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name) => {
  const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(`${out}/${name}.png`, Buffer.from(s.data, "base64"));
  console.log("  shot", name);
};
/* Read off the rendered box, never off innerHTML: a hidden screen passes an
   innerHTML test and fails a person looking at it. */
const visibleText = () => ev(`(() => {
  const t = document.getElementById("tab-progress");
  const seen = [];
  const walk = (n) => {
    for (const el of n.children) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || el.classList.contains("hidden")) continue;
      if (!el.getClientRects().length) continue;
      if (!el.children.length) { const s = el.textContent.trim(); if (s) seen.push(s); }
      else walk(el);
    }
  };
  walk(t);
  return seen.join(" | ");
})()`);

const results = [];
try {
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: true });

  const go = async (query, theme) => {
    errors = [];
    await send("Page.navigate", { url: `http://127.0.0.1:${HTTP}/sandbox-app.html${query}` });
    await wait(3800);
    await ev(`showApp()`);
    if (theme) await ev(`document.documentElement.setAttribute("data-theme", ${JSON.stringify(theme)})`);
    await ev(`switchTab("progress")`);
    await wait(900);
  };
  /* The switch is a real tap, not a call into the renderer: the point of the
     run is that a finger can reach it. */
  const tapPartner = async () => {
    const box = await ev(`(() => { const b = document.querySelector("#progWho [data-who='partner']");
      if (!b) return null; const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; })()`);
    if (!box) throw new Error("no partner button to tap");
    for (const type of ["mousePressed", "mouseReleased"])
      await send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
    await wait(800);
    return box;
  };
  const geometry = () => ev(`({ sw: document.scrollingElement.scrollWidth, cw: document.scrollingElement.clientWidth })`);

  const cases = [
    ["paired-me",            "?scenario=paired",       null,   false],
    ["paired-partner",       "?scenario=paired",       null,   true],
    ["paired-partner-dark",  "?scenario=paired",       "dark", true],
    ["shared-weight-partner","?scenario=weighInsShared", null, true],
    ["weighins-only-partner","?scenario=weighInsOnlyShared", null, true],
    ["endurance-private",    "?scenario=partnerEndurancePrivate", null, true],
    ["private-partner",      "?scenario=livePrivate",  null,   true],
    ["private-partner-dark", "?scenario=livePrivate",  "dark", true],
    ["solo",                 "?scenario=solo",         null,   false],
  ];
  for (const [name, query, theme, tap] of cases) {
    await go(query, theme);
    const present = await ev(`!!document.querySelector("#progWho [data-who='partner']")`);
    let box = null;
    if (tap) box = await tapPartner();
    await shot(name);
    const g = await geometry();
    const seen = await ev(`(() => {
      const vis = (id) => { const el = document.getElementById(id);
        return !!el && !el.classList.contains("hidden") && !!el.getClientRects().length; };
      return ["cardPhotos", "cardStrength", "cardVolume", "cardMuscles", "cardWeight",
              "endHero", "toneHero", "bulkHero", "liftHero", "progGoalChips", "trackOpen"]
        .filter(vis);
    })()`);
    results.push({ name, control: present, onScreen: seen, tapTarget: box && `${Math.round(box.w)}x${Math.round(box.h)}`,
      geometry: `${g.sw}/${g.cw}`, errors: errors.slice(), text: await visibleText() });
  }
  /* The round trip, not an assertion about one. Her row is turned off through
     the app's own client, loadAll re-reads it, and the same screen is shot
     again: nothing here trusts a render that was never re-run. Then the
     numbers themselves are searched for in the rendered text, because "the
     card is gone" and "the number is nowhere on screen" are not the same
     claim and only the second one is the one that matters. */
  const HER_WEIGHTS = ["145.1", "145.4", "146.0", "146"];
  const HER_LIFTS = ["Hip Thrust", "Leg Press", "Bench Press"];
  const leaks = async (needles) => {
    const t = await visibleText();
    return needles.filter((n) => t.includes(n));
  };

  await go("?scenario=weighInsShared", null);
  await tapPartner();
  const beforeLeak = await leaks(HER_WEIGHTS);
  await shot("roundtrip-weight-on");
  await ev(`sb.from("profiles").update({ share_weigh_ins: false }).eq("email", PARTNER_EMAIL)`);
  await ev(`loadAll()`);
  await ev(`renderProgressTab()`);
  await wait(600);
  await shot("roundtrip-weight-off");
  results.push({ name: "roundtrip-weight", control: true,
    shownWhileShared: beforeLeak, leakedAfterOff: await leaks(HER_WEIGHTS),
    geometry: (await geometry()).sw + "/" + (await geometry()).cw, errors: errors.slice(), text: "" });

  await go("?scenario=weighInsShared", null);
  await tapPartner();
  const liftsBefore = await leaks(HER_LIFTS);
  await ev(`sb.from("profiles").update({ share_workout_details: false }).eq("email", PARTNER_EMAIL)`);
  await ev(`loadAll()`);
  await ev(`renderProgressTab()`);
  await wait(600);
  await shot("roundtrip-details-off");
  results.push({ name: "roundtrip-details", control: true,
    shownWhileShared: liftsBefore, leakedAfterOff: await leaks(HER_LIFTS),
    geometry: (await geometry()).sw + "/" + (await geometry()).cw, errors: errors.slice(), text: "" });

  /* The switch Mo asked to be able to reach, in the one place it lives. */
  for (const [name, query] of [["settings-partner", "?scenario=weighInsShared"],
                               ["settings-partner-nocolumn", "?scenario=paired"]]) {
    await go(query, null);
    await ev(`switchTab("setup")`);
    await ev(`openSettingsPage("partner")`);
    await wait(600);
    await shot(name);
    results.push({ name, control: await ev(`!$("shareWeighInsCard").classList.contains("hidden")`),
      geometry: (await geometry()).sw + "/" + (await geometry()).cw, errors: errors.slice(), text: "" });
  }
  console.log(JSON.stringify(results, null, 1));
} finally {
  try { ws.close(); } catch {}
  chrome.kill();
}
