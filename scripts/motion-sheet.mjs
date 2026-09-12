/* Contact sheet screenshots for knowledge/motion.

     node scripts/motion-sheet.mjs                        every library
     node scripts/motion-sheet.mjs stretching             one library
     node scripts/motion-sheet.mjs yoga /tmp/yoga.png     one library, named file

   Serves the repo over a local http server (the lab is ES modules, so file://
   will not load it), screenshots motion-lab.html in sheet mode with headless
   Chrome, and kills the server. Output defaults to the scratchpad, never the
   repo: these PNGs are review material for the session that made them, not
   something to carry around in git. The guard below refuses to write one inside
   the repo even if you ask.

   Look at the result with the Read tool. Validation says the numbers are legal;
   only the picture says the pose reads as the exercise. */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, existsSync, rmSync, statSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
const SCRATCH = "/private/tmp/claude-501/-Users-creativelab1/ef418cb8-6e15-4c42-a3d9-800235df410c/scratchpad/motion-sheets";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const LIBRARIES = ["weight-training", "yoga", "pilates", "calisthenics", "stretching"];

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const theme = process.argv.includes("--light") ? "light" : "dark";
const libs = args[0] ? [args[0]] : LIBRARIES;
const explicitOut = args[1] ? resolve(args[1]) : null;

if (explicitOut && (explicitOut + "/").startsWith(REPO + "/")) {
  console.error(`refusing to write a screenshot inside the repo: ${explicitOut}`);
  process.exit(1);
}
if (!existsSync(CHROME)) {
  console.error(`no Chrome at ${CHROME}`);
  process.exit(1);
}

function freePort() {
  return new Promise((ok, bad) => {
    const s = createServer();
    s.on("error", bad);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => ok(port));
    });
  });
}

// Chrome on this machine writes the screenshot and then sometimes sits there
// instead of exiting, so wait for the file rather than for the process: once
// the PNG is on disk and has stopped growing, kill it and move on.
function shoot(argv, out) {
  return new Promise((ok) => {
    const p = spawn(CHROME, argv, { stdio: "ignore" });
    let done = false;
    const finish = (code) => { if (done) return; done = true; clearInterval(poll); clearTimeout(bail); ok(code); };
    p.on("exit", (code) => finish(code === null ? 0 : code));
    let lastSize = -1;
    const poll = setInterval(() => {
      if (!existsSync(out)) return;
      const size = statSync(out).size;
      if (size > 0 && size === lastSize) { p.kill("SIGTERM"); finish(0); }
      lastSize = size;
    }, 400);
    const bail = setTimeout(() => { p.kill("SIGKILL"); finish(existsSync(out) ? 0 : 1); }, 45000);
  });
}

const port = await freePort();
const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"],
  { cwd: REPO, stdio: "ignore" });
process.on("exit", () => server.kill());

// Wait for the server rather than sleeping a guessed amount.
let up = false;
for (let i = 0; i < 40 && !up; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/motion-lab.html`);
    up = r.ok;
  } catch { await new Promise((r) => setTimeout(r, 100)); }
}
if (!up) { server.kill(); console.error("local server did not come up"); process.exit(1); }

mkdirSync(SCRATCH, { recursive: true });
const written = [];
for (const lib of libs) {
  const out = explicitOut || join(SCRATCH, `${lib}.png`);
  const url = `http://127.0.0.1:${port}/motion-lab.html?sheet=${lib}&cols=5&theme=${theme}`;
  const profile = join(SCRATCH, `.chrome-${lib}`);
  // virtual-time-budget lets the page finish fonts, module loading and the two
  // animation frames the sheet waits for before it declares itself ready.
  if (existsSync(out)) unlinkSync(out); // so the size poll cannot see a stale file
  const code = await shoot([
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--no-default-browser-check", "--disable-extensions",
    "--force-device-scale-factor=2", "--virtual-time-budget=6000",
    `--user-data-dir=${profile}`,
    `--screenshot=${out}`, "--window-size=1280,1500", url,
  ], out);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch { /* chrome still letting go of it */ }
  if (code === 0 && existsSync(out)) written.push(out);
  else console.error(`chrome exited ${code} for ${lib}`);
}
server.kill();
console.log(written.length ? written.join("\n") : "nothing written");
process.exit(written.length ? 0 : 1);
