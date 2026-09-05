/* Pre-renders the working-muscles figures for the state gallery.
     node scripts/snap-body.mjs
   writes scripts/.body-snaps.json (ignored by git), which make-states.mjs
   picks up automatically.

   WHY. The figures are Rive, drawn on WebGL, and Node has no GPU. The gallery
   still has to show them, so this drives a headless Chrome over the DevTools
   protocol, runs the app's OWN snapshot code (lifted from index.html, same as
   the gallery lifts its render functions), and keeps what came out. Every
   figure in SNAP_SPECS, both themes.

   Needs Google Chrome on this machine (CHROME env to point elsewhere). Serves
   the repo itself on a local port for the run, because ES module imports do
   not work over file://. */

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { tmpdir } from "node:os";
import { root, style, grab, fn, section, SNAP_SPECS, SNAP_PROFILES, SNAP_FILE } from "./lift.mjs";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 8794, CDP_PORT = 9339;
const RIVE_TAG = grab(/<script src="[^"]*@rive-app\/webgl2[^"]*"><\/script>/, "the Rive script tag");

/* ---- the harness: the app's snapshot code and nothing else ---- */

const HARNESS = `<!doctype html>
<html lang="en" data-theme="light">
<head><meta charset="utf-8" />${RIVE_TAG}<style>${style}</style></head>
<body>
<script>
const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let ALL_PROFILES = ${JSON.stringify(SNAP_PROFILES)};
let riveBodyPromise = null, BODY_DETAIL = null, bodyDetailPromise = null;
${grab(/\nconst MUSCLE_RULES = \[.*?\n\];\n/s, "MUSCLE_RULES")}
${grab(/\nconst BODY_GROUP_LABELS = \{.*?\n\};\n/s, "BODY_GROUP_LABELS")}
${["profileFor", "classifyMuscles", "ensureRiveBodyModule", "ensureBodyDetailModules"].map(fn).join("\n")}
${section("/* ---------- Working muscles ----------", "/* ---------- Watching someone train ----------")}

window.SNAP_RESULT = null;
window.SNAP_LOG = [];
window.onerror = (m, f, l) => window.SNAP_LOG.push(m + " @" + l);
window.SNAP_PIX = async () => { const c = document.querySelector("#bodySnapHost canvas"); if (!c) return "no canvas"; const kinds = ["2d", "webgl2", "bitmaprenderer"].filter((k) => { try { return !!c.getContext(k); } catch { return false; } }); const url = c.toDataURL("image/png"); const img = new Image(); img.src = url; await new Promise((r) => (img.onload = r)); const t = document.createElement("canvas"); t.width = c.width; t.height = c.height; const x = t.getContext("2d"); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, t.width, t.height).data; const cnt = {}; let op = 0; for (let i = 0; i < d.length; i += 4 * 31) { if (d[i + 3] > 200) { op++; const k = [d[i], d[i + 1], d[i + 2]].join(","); cnt[k] = (cnt[k] || 0) + 1; } } return { kinds, urlLen: url.length, size: c.width + "x" + c.height, opaque: op, top: Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6) }; };
window.SNAP_STATE = async () => ({ pix: await window.SNAP_PIX(), ink: JSON.stringify(bodySnapInk("them")), pending: BODY_SNAP_PENDING.size, cached: [...BODY_SNAP_CACHE.entries()].map(([k, v]) => k + (v ? " ok" : " null")), detail: !!BODY_DETAIL, rive: !!RIVE_BODY, host: !!document.getElementById("bodySnapHost"), canvases: document.querySelectorAll("canvas").length });
(async () => {
  try {
    await ensureWorkingMuscleModules();
    const specs = ${JSON.stringify(SNAP_SPECS)};
    for (const theme of ["light", "dark"]) {
      document.documentElement.setAttribute("data-theme", theme);
      for (const spec of specs) workingMusclesHTML(spec.exerciseName, spec);
    }
    while (BODY_SNAP_PENDING.size) await new Promise((r) => setTimeout(r, 150));
    window.SNAP_RESULT = { keys: [...BODY_SNAP_CACHE.keys()] };
  } catch (e) { window.SNAP_LOG.push(String(e.stack || e)); window.SNAP_RESULT = { error: String(e) }; }
})();
</script>
</body>
</html>`;

/* ---- a static server for the repo, plus the harness ---- */

const MIME = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css",
  ".riv": "application/octet-stream", ".wasm": "application/wasm", ".png": "image/png", ".json": "application/json" };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/_snap.html") { res.writeHead(200, { "Content-Type": "text/html" }); res.end(HARNESS); return; }
  const file = normalize(join(root, path));
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

/* ---- drive Chrome ---- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = join(tmpdir(), "fit-together-snap-profile");
const chrome = spawn(CHROME, ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, "--window-size=500,900", "about:blank"], { stdio: "ignore" });

let ws;
try {
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json(); } catch { await sleep(250); }
  }
  if (!targets) throw new Error(`Chrome did not come up at ${CHROME}`);
  ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 500, height: 900, deviceScaleFactor: 2, mobile: true });
  await send("Page.navigate", { url: `http://127.0.0.1:${PORT}/_snap.html` });

  const t0 = Date.now();
  let result = null;
  const debug = process.argv.includes("--debug");
  let lastLog = 0;
  while (Date.now() - t0 < 300000 && !result) {
    result = await evaluate("window.SNAP_RESULT");
    if (!result) await sleep(500);
    if (debug && Date.now() - lastLog > 4000) {
      lastLog = Date.now();
      const st = await send("Runtime.evaluate", { expression: "window.SNAP_STATE().then((s) => JSON.stringify(s))", returnByValue: true, awaitPromise: true });
      console.log(JSON.stringify(st.result), JSON.stringify(await evaluate("window.SNAP_LOG")));
      const shot = await send("Page.captureScreenshot", { format: "png" });
      if (shot.result?.data) await writeFile(join(tmpdir(), "fit-together-snap.png"), Buffer.from(shot.result.data, "base64"));
    }
  }
  if (!result) throw new Error("timed out waiting for the harness; log: " + JSON.stringify(await evaluate("window.SNAP_LOG")));
  if (result.error) throw new Error(result.error + "\n" + JSON.stringify(await evaluate("window.SNAP_LOG")));

  /* One key at a time: a couple of megabytes of data URLs in one message is
     more than the debugging socket likes. */
  const snaps = {};
  let missing = 0;
  for (const key of result.keys) {
    const url = await evaluate(`BODY_SNAP_CACHE.get(${JSON.stringify(key)})`);
    snaps[key] = url || null;
    if (!url) missing++;
  }
  await writeFile(SNAP_FILE, JSON.stringify(snaps));
  console.log(`${Object.keys(snaps).length} figures in ${Math.round((Date.now() - t0) / 1000)}s` +
    (missing ? `, ${missing} FAILED to draw` : "") + `, written to ${SNAP_FILE}`);
  if (missing) process.exitCode = 1;
} finally {
  ws?.close();
  chrome.kill("SIGKILL");
  server.close();
}
