/* Generates preview.html: the app's REAL <style> block plus representative
   markup, so UI changes can be seen without signing in. Regenerate after any
   CSS change: node scripts/make-preview.mjs */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const head = html.match(/<link[^>]*fonts[^>]*>/g)?.join("\n") || "";

function ring(done, target, color, size = 148) {
  const stroke = 9, r = 50 - stroke / 2 - 1, circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, done / target));
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" class="goal-ring">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--ring-track)" stroke-width="${stroke}"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}" transform="rotate(-90 50 50)"/>
    <text x="50" y="47" text-anchor="middle" class="ring-num">${done}</text>
    <text x="50" y="64" text-anchor="middle" class="ring-of">of ${target}</text>
  </svg>`;
}

const body = `
<div id="app">
  <header class="day-head">
    <div class="day-date">WEDNESDAY, SEP 2</div>
    <h1 class="day-title">This week</h1>
  </header>

  <div class="rings">
    <div class="ring-col">
      <div class="ring-wrap">${ring(3,4,"var(--me)")}</div>
      <div class="ring-name">Mo</div><div class="ring-role">YOU</div>
      <div class="ring-streak">6 day streak</div>
    </div>
    <div class="ring-col">
      <div class="ring-wrap">${ring(2,5,"var(--partner)")}</div>
      <div class="ring-name">Mel</div><div class="ring-role">PARTNER</div>
      <div class="ring-streak">4 day streak</div>
    </div>
  </div>

  <div class="next-up">
    <p class="next-line">1 more to hit your goal this week.</p>
    <button class="btn-primary">Begin workout</button>
  </div>

  <div class="card">
    <div class="pp-head"><div class="pp-title">Mel trained today</div><div class="pp-time">2 sessions</div></div>
    <div style="height:190px;border-radius:12px;background:var(--panel-2);border:1px solid var(--border)"></div>
    <button class="btn-secondary" style="margin-top:12px">Cheer Mel on</button>
  </div>

  <div class="card">
    <h2>The week</h2>
    <div class="wk-grid">
      <div class="wk-labels">${"MTWTFSS".split("").map(l=>`<span>${l}</span>`).join("")}</div>
      <div class="wk-row">${[1,1,1,0,0,0,0].map((v,i)=>`<span class="wk-cell me ${v?"done":""} ${i===2?"today":""}"></span>`).join("")}</div>
      <div class="wk-row">${[1,0,1,0,0,0,0].map((v,i)=>`<span class="wk-cell partner ${v?"done":""} ${i===2?"today":""}"></span>`).join("")}</div>
    </div>
    <div class="wk-legend">
      <span class="wk-key"><span class="wk-swatch me"></span>Mo</span>
      <span class="wk-key"><span class="wk-swatch partner"></span>Mel</span>
    </div>
  </div>

  <nav class="tabs">
    <button class="tab-btn active"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg><span>Home</span></button>
    <button class="tab-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="4.5" r="2.2"/><path d="M8.5 8h7l1.5 5-2 .6V20h-3v-4h-1v4h-3v-6.4l-2-.6z"/></svg><span>Body</span></button>
    <button class="fab"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 8v8M18 8v8M4 10v4M20 10v4M6 12h12"/></svg></button>
    <button class="tab-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m3 17 6-6 4 4 8-8"/></svg><span>Progress</span></button>
    <button class="tab-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg><span>Setup</span></button>
  </nav>
</div>`;

writeFileSync(join(root, "preview.html"),
`<!doctype html><html lang="en" data-theme="light"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fit Together · UI preview</title>${head}
<style>${style}</style></head><body>${body}</body></html>`);
console.log("preview.html written");
