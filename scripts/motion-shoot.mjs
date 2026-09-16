// Screenshot pose-check.html in headless Chrome.
//
//   node scripts/motion-shoot.mjs "Lat Pulldown" out.png            three frames, both themes
//   node scripts/motion-shoot.mjs "Cable Curl,Face Pull" out.png "0,1" light
//   HTTP=8123 node scripts/motion-shoot.mjs ...                     which local server to hit
//
// Serve the repo root first (python3 -m http.server 8123). The cache is
// disabled on every load because Chrome otherwise keeps stale ES modules and
// SVGs across edits, which cost an evening once.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const [,, moves, out, ts, theme, size] = process.argv;
if (!moves || !out) { console.error("usage: motion-shoot.mjs <move[,move]> <out.png> [t list] [dark|light|both] [size]"); process.exit(2); }
const HTTP = process.env.HTTP || 8123;
const PORT = 9700 + Math.floor(Math.random() * 250);
const CH = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const nT = (ts || "0,0.5,1").split(",").length, nTh = (theme || "both") === "both" ? 2 : 1, sz = Number(size || 300);
const rows = moves.split(",").length;
const W = Math.min(4000, 40 + nT * nTh * (sz + 8)), H = Math.min(6000, 30 + rows * (sz + 26));
const chrome = spawn(CH, ["--headless=new", "--use-gl=swiftshader", "--enable-unsafe-swiftshader", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=/tmp/ch-shoot-${process.pid}`, `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2000);
const tab = await (await fetch(`http://localhost:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
const ws = await new Promise((r, j) => { const w = new WebSocket(tab.webSocketDebuggerUrl); w.addEventListener("open", () => r(w)); w.addEventListener("error", j); });
let id = 0;
const send = (m, p = {}) => new Promise((res, rej) => {
  const i = ++id;
  const h = (e) => { const x = JSON.parse(e.data); if (x.id === i) { ws.removeEventListener("message", h); x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result); } };
  ws.addEventListener("message", h); ws.send(JSON.stringify({ id: i, method: m, params: p }));
});
try {
  await send("Page.enable"); await send("Network.enable"); await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const url = `http://127.0.0.1:${HTTP}/pose-check.html?moves=${encodeURIComponent(moves)}&t=${ts || "0,0.5,1"}&theme=${theme || "both"}&size=${sz}`;
  await send("Page.navigate", { url });
  await wait(2600);
  const s = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  writeFileSync(out, Buffer.from(s.data, "base64"));
  console.log("wrote", out);
} finally { chrome.kill(); }
