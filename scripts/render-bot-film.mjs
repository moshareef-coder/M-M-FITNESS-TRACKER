/* Renders the app's own figure, one frame per shot, for brand films.

     node scripts/render-bot-film.mjs --shots shots.json --out frames/ --size 1080

   shots.json is an array of {cycle, face, mood}: where the body is in its loop
   (0..1), what the face's clock reads in seconds, and which of the five moods
   it wears. Body and face are separate on purpose, so a film can hold a pose
   while the eyes blink on a beat somebody chose rather than on the rig's own
   4.3 second cycle. scripts/make-brand-film.py writes the shot list.

   Three things here were learned the hard way and should not be undone.

   It draws through brand/film-harness.html, which calls the rig's render()
   directly. The normal harness mounts the animation runtime, and that runtime
   is driven by requestAnimationFrame, which headless Chrome suspends whenever
   it decides nobody is looking. The seek lands, the canvas is never redrawn,
   and the read waits forever on a frame that is not coming.

   Frames come back in chunks. A 1080px PNG is around 150KB of base64 and
   returning that as one CDP value is where this stopped being reliable.

   Every evaluate has its own timeout. A silent hang with no output was the
   single most expensive failure mode while building this, so it cannot happen
   again: a stuck call now names itself and the run stops.
*/
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d;
};
const SHOTS = JSON.parse(readFileSync(arg("shots", "/tmp/shots.json"), "utf8"));
const OUT = arg("out", join(ROOT, "brand/film/frames"));
const SIZE = Number(arg("size", 1080));
const MOVE = arg("move", "Mountain Pose");
const THEME = arg("theme", "light");
// A whole run wears one face, one body and one skin: each cast member gets its
// own invocation of this script, so these are flags rather than fields on every
// shot object.
const FACE = arg("face", null);
const BODY_OPT = arg("body", null);
const SKIN = arg("skin", null);
const LINES = arg("lines", null);

/* Fresh port and profile per run: a fixed profile leaves a SingletonLock behind
   when a run is killed, and the next Chrome waits on a browser that is never
   coming back. */
const PORT = 8900 + Math.floor(Math.random() * 90);
const CDP = 9400 + Math.floor(Math.random() * 90);
const PROFILE = mkdtempSync(join(tmpdir(), "bot-film-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"],
  { cwd: ROOT, stdio: "ignore" });
const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${CDP}`, `--user-data-dir=${PROFILE}`,
  /* No --default-background-color here. The canvas carries its own alpha and
     the film composites it onto a ground in Python anyway, and with that flag
     set the first draw never returns. */
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--disable-gpu",
  "about:blank",
], { stdio: "ignore" });

let ws;
try {
  const url = `http://127.0.0.1:${PORT}/brand/film-harness.html`;
  let target;
  for (let i = 0; i < 60; i++) {
    try {
      target = await (await fetch(`http://127.0.0.1:${CDP}/json/new?${encodeURIComponent(url)}`,
        { method: "PUT" })).json();
      break;
    } catch { await sleep(300); }
  }
  if (!target) throw new Error("Chrome never came up on the debugging port");

  ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  /* With a timeout. Chrome can come up, answer /json/new, and then never
     complete the socket handshake, and an open with no deadline waits for it
     forever: one run sat here for 48 minutes with a live Chrome and no frames.
     Every other call in this file has a deadline; this was the one that did
     not. */
  await new Promise((r, j) => {
    const bell = setTimeout(() => j(new Error("Chrome accepted the target but never opened the socket")), 20000);
    ws.onopen = () => { clearTimeout(bell); r(); };
    ws.onerror = (e) => { clearTimeout(bell); j(e); };
  });
  ws.onmessage = (m) => {
    const x = JSON.parse(m.data);
    if (x.id && pending.has(x.id)) { pending.get(x.id)(x); pending.delete(x.id); }
  };
  /* The execution context has to exist before Runtime.evaluate will answer.
     Without this the very first call simply never comes back. */
  await new Promise((r) => {
    const i = ++id; pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method: "Runtime.enable" }));
  });

  const ev = async (expr, label = "evaluate") => {
    const call = new Promise((r) => {
      const i = ++id; pending.set(i, r);
      ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true, awaitPromise: true } }));
    });
    const bell = sleep(90000).then(() => "__TIMEOUT__");
    const r = await Promise.race([call, bell]);
    if (r === "__TIMEOUT__") throw new Error(`${label} did not come back within 90s`);
    if (r.result?.exceptionDetails) {
      throw new Error(`${label}: ${r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text}`);
    }
    return r.result?.result?.value;
  };

  for (let i = 0; i < 60; i++) { if (await ev("window.__ready === true", "ready") === true) break; await sleep(200); }
  if (await ev("window.__ready === true", "ready") !== true) throw new Error("the harness never signalled ready");
  /* This has to actually happen. It was dropped once while chasing a hang that
     turned out to be a browser flag, and every frame after that came out at the
     canvas default while the log cheerfully reported the size that was asked
     for. Read it back rather than trusting the call. */
  await ev(`window.__size(${SIZE}, ${SIZE})`, "size");
  const got = await ev("document.getElementById('stage').width", "size check");
  if (got !== SIZE) throw new Error(`asked for ${SIZE}px, canvas is ${got}px`);
  if (!(await ev(`window.__dur(${JSON.stringify(MOVE)})`, "dur"))) throw new Error(`no move called ${MOVE}`);

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const CH = 150000;
  for (let f = 0; f < SHOTS.length; f++) {
    const s = SHOTS[f];
    await ev(`window.__draw(${JSON.stringify(MOVE)}, ${s.cycle}, ${s.face}, `
      + `{theme: ${JSON.stringify(THEME)}, mood: ${JSON.stringify(s.mood || "neutral")}`
      + (FACE ? `, faceStyle: ${JSON.stringify(FACE)}` : "")
      + (BODY_OPT ? `, body: ${JSON.stringify(BODY_OPT)}` : "")
      + (SKIN ? `, skin: ${JSON.stringify(SKIN)}` : "")
      + (LINES !== null ? `, lines: ${LINES === "true"}` : "") + `})`, `draw ${f}`);
    const len = await ev("window.__b = window.__png(), window.__b.length", `size ${f}`);
    let b64 = "";
    for (let o = 0; o < len; o += CH) b64 += await ev(`window.__b.slice(${o}, ${o + CH})`, `chunk ${f}`);
    writeFileSync(join(OUT, `f${String(f).padStart(4, "0")}.png`), Buffer.from(b64, "base64"));
    if (f % 20 === 0) process.stderr.write(`  ${f}/${SHOTS.length}\n`);
  }
  console.log(`${SHOTS.length} figure frames at ${SIZE}px in ${OUT}`);
} finally {
  try { ws?.close(); } catch { /* already gone */ }
  chrome.kill();
  server.kill();
  /* Chrome is still writing into its profile as it goes down, so a delete here
     races it and throws ENOTEMPTY over the top of whatever actually happened in
     the run. Best effort, and never at the cost of the real error. */
  try { rmSync(PROFILE, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }); }
  catch { /* a temp directory the OS will reap */ }
}
