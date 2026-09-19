/* Renders brand/vector/*.svg to PNG at whatever sizes the app and the stores need.

     node scripts/render-logo-png.mjs

   Chrome rather than a rasteriser library, because it is already a dependency
   of the other brand scripts and it is the same engine that will draw the SVG
   if we ever ship it as an SVG.
*/
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "brand/vector");
const OUT = join(ROOT, "brand/vector/png");
const PORT = 8900 + Math.floor(Math.random() * 90);
const CDP = 9400 + Math.floor(Math.random() * 90);
const PROFILE = mkdtempSync(join(tmpdir(), "logo-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The boot layers have to come out at the size the app already ships them at,
// or the boot screen reframes itself.
const JOBS = [
  ["unio-mark-flat", 1024], ["unio-mark-flat", 512], ["unio-mark-flat", 180],
  ["unio-mark-gloss", 1024], ["unio-mark-gloss", 512], ["unio-mark-gloss", 180],
  ["unio-mark-pa", 1024], ["unio-mark-pb", 1024], ["unio-mark-pc", 1024],
  ["unio-left", 853], ["unio-right", 853], ["unio-bar", 853],
];

const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"],
  { cwd: ROOT, stdio: "ignore" });
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", `--remote-debugging-port=${CDP}`, `--user-data-dir=${PROFILE}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--disable-gpu",
  "about:blank",
], { stdio: "ignore" });

try {
  mkdirSync(OUT, { recursive: true });
  for (const [name, size] of JOBS) {
    /* Served rather than a data: URL. A data: page is an opaque origin and
       Chrome refuses to fetch the SVG from the local server, which produces a
       perfectly blank screenshot with no error anywhere. */
    const page = `http://127.0.0.1:${PORT}/brand/vector/_shot.html?f=${name}&s=${size}`;
    let t;
    for (let i = 0; i < 60; i++) {
      try { t = await (await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent(page)}`, { method: "PUT" })).json(); break; }
      catch { await sleep(300); }
    }
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    let id = 0; const pending = new Map();
    await new Promise((r) => { ws.onopen = r; });
    ws.onmessage = (m) => { const x = JSON.parse(m.data); if (x.id && pending.has(x.id)) { pending.get(x.id)(x); pending.delete(x.id); } };
    const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    await send("Runtime.enable"); await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: size, height: size, deviceScaleFactor: 1, mobile: false });
    /* Without this the screenshot comes back on Chrome's default white page
       background, whatever the CSS says, and the three boot layers then paint
       over each other instead of stacking. Done per page rather than with the
       browser-wide --default-background-color flag, which deadlocks canvas
       readback elsewhere in these scripts. */
    await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.result?.value;
    for (let i = 0; i < 40; i++) { if (await ev("window.__ready === true")) break; await sleep(150); }
    await sleep(250);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = join(OUT, size === 1024 || JOBS.filter(([n]) => n === name).length === 1 ? `${name}.png` : `${name}-${size}.png`);
    writeFileSync(file, Buffer.from(shot.result.data, "base64"));
    console.log("  ", file.replace(ROOT, ""), `${size}px`);
    ws.close(); await fetch(`http://127.0.0.1:${CDP}/json/close/${t.id}`);
  }
  console.log(readdirSync(OUT).length, "png written");
} finally {
  chrome.kill(); server.kill();
  try { rmSync(PROFILE, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }); } catch { /* temp */ }
}
