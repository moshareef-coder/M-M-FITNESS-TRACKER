// Drive the partner step in the sandbox over CDP and shoot it at 390px.
//
//   node scripts/partner-step-shoot.mjs out-dir
//
// Serve the repo root first (python3 -m http.server 8123).
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
const out = process.argv[2] || "shots";
mkdirSync(out, { recursive: true });
const HTTP = process.env.HTTP || 8123;
const PORT = 9700 + Math.floor(Math.random() * 250);
const CH = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 390, H = 844;
const chrome = spawn(CH, ["--headless=new", "--use-gl=swiftshader", "--enable-unsafe-swiftshader",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/ch-pair-${process.pid}`,
  `--window-size=${W},${H}`, "about:blank"], { stdio: "ignore" });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(2000);
const tab = await (await fetch(`http://localhost:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
const ws = await new Promise((r, j) => { const w = new WebSocket(tab.webSocketDebuggerUrl); w.addEventListener("open", () => r(w)); w.addEventListener("error", j); });
let id = 0;
const errors = [];
ws.addEventListener("message", (e) => {
  const x = JSON.parse(e.data);
  if (x.method === "Runtime.consoleAPICalled" && (x.params.type === "error" || x.params.type === "warning"))
    errors.push(x.params.type + ": " + x.params.args.map((a) => a.value || a.description || a.type).join(" "));
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
  console.log("wrote", `${out}/${name}.png`);
};
try {
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: true });

  const go = async (query) => {
    await send("Page.navigate", { url: `http://127.0.0.1:${HTTP}/sandbox-app.html?scenario=fresh${query || ""}` });
    await wait(3500);
  };

  // 1. The step itself, reached the way a person reaches it: through the wizard.
  await go();
  await ev(`renderOnboardStep("name", {})`);
  await wait(200);
  await ev(`document.getElementById("nameInput").value = "Mo"; document.getElementById("nextBtn").click()`);
  await wait(400);
  await ev(`renderOnboardStep("partner", { name: "Mo", goal_bubble: "build-muscle", goalLabel: "Build muscle", train_styles: ["lifting"] })`);
  await wait(900);
  console.log("step ids:", await ev(`["shareLinkBtn","partnerCodeInput","obPairSolo","obPairBack","myCodeLine"].map(i=>i+"="+!!document.getElementById(i)).join(" ")`));
  console.log("my code line:", await ev(`(document.getElementById("myCodeLine")||{}).hidden`), await ev(`(document.getElementById("myInviteCode")||{}).textContent`));
  const w = await ev(`[document.documentElement.scrollWidth, document.documentElement.clientWidth]`);
  console.log("width:", w.join(" / "));
  await shot("partner-step-light");

  await ev(`applyTheme("dark")`); await wait(400); await shot("partner-step-dark");
  await ev(`applyTheme("light")`); await wait(300);

  // 2. After a share succeeds. Headless Chrome has navigator.share and
  //    rejects every call, which is the dismissed-sheet path, not this one.
  await ev(`navigator.share = async () => {}`);
  await ev(`document.getElementById("shareLinkBtn").click()`);
  await wait(900);
  console.log("after share:", await ev(`document.getElementById("shareLinkBtn").textContent + " | " + document.getElementById("obPairSolo").textContent + " | " + document.getElementById("obPairSolo").className`));
  console.log("hint:", await ev(`document.getElementById("shareHint").textContent`));
  await shot("partner-step-after-share");

  // 3. Continue lands on the plan, and the solo flag is set so the old
  //    pairing screen does not ask the same question again on the way in.
  await ev(`document.getElementById("obPairSolo").click()`);
  await wait(900);
  console.log("after continue: solo =", await ev(`soloHeld()`), "| heading =", await ev(`(document.querySelector("#onboard h1")||{}).textContent`));

  // 4. Skipping straight past, from a clean load.
  await go();
  await ev(`renderOnboardStep("partner", { name: "Mo", goal_bubble: "lose-weight", goalLabel: "Lose weight" })`);
  await wait(800);
  await ev(`document.getElementById("obPairSolo").click()`);
  await wait(900);
  console.log("after skip: solo =", await ev(`soloHeld()`), "| heading =", await ev(`(document.querySelector("#onboard h1")||{}).textContent`));

  // 5. Pairing by typing their six characters.
  await go();
  await ev(`clearSolo()`);
  await ev(`renderOnboardStep("partner", { name: "Mo", goal_bubble: "build-muscle" })`);
  await wait(800);
  const theirCode = await ev(`(__SANDBOX.db.profiles.find(p=>p.email==="mell@sandbox")||{}).invite_code`);
  console.log("their code:", theirCode);
  await ev(`(() => { const i = document.getElementById("partnerCodeInput"); i.value = ${JSON.stringify(String(theirCode || ""))}; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await wait(1200);
  console.log("after code: solo =", await ev(`soloHeld()`), "| heading =", await ev(`(document.querySelector("#onboard h1")||{}).textContent`));

  // 5b. Pairing by pasting the whole link, which is the path that actually
  //     ends in a partnership rather than a request.
  await go();
  await ev(`clearSolo()`);
  await ev(`renderOnboardStep("partner", { name: "Mo", goal_bubble: "build-muscle" })`);
  await wait(800);
  await ev(`(() => { const i = document.getElementById("partnerCodeInput"); i.value = "https://x/j/sandboxinvitefrommell1"; i.dispatchEvent(new Event("input", { bubbles: true })); })()`);
  await wait(1400);
  console.log("after link: solo =", await ev(`soloHeld()`), "| partnerships =", await ev(`JSON.stringify(__SANDBOX.db.partnerships.map(r=>r.status))`), "| heading =", await ev(`(document.querySelector("#onboard h1")||{}).textContent`));

  // 6. Arriving holding somebody else's link: the step should stop asking them
  //    to invite anyone and say who invited them instead.
  await go("&j=sandboxinvitefrommell1");
  await ev(`renderOnboardStep("partner", { name: "Mo", goal_bubble: "build-muscle" })`);
  await wait(1200);
  console.log("invited heading:", await ev(`(document.querySelector("#onboard h1")||{}).textContent`));
  await shot("partner-step-invited");

  console.log(errors.length ? "CONSOLE PROBLEMS:\n" + errors.join("\n") : "console clean");
} finally { chrome.kill(); }
