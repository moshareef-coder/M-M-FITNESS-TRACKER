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

const body = `
<div id="app">
  <div class="greeting-row">
    <div class="avatar">M</div>
    <div class="greeting"><strong>Evening, Mo</strong><br><span class="muted-note">Thursday, 30 August</span></div>
  </div>

  <div class="card rank-card" style="--rank-color:#c87b3a; --rank-glow:rgba(200,123,58,0.55);">
    <div class="rank-head">
      <div class="rank-crest"><img class="crest-img" src="/badges/bronze-ii.webp" width="78" height="78" alt="" /></div>
      <div class="rank-meta">
        <div class="rank-tier-name">Bronze II</div>
        <div class="rank-level">Level 7 · Consistent</div>
        <div class="gauge-sub">1,240 XP total · 160 to next</div>
      </div>
    </div>
    <div class="rank-progress-track"><div class="rank-progress-fill" style="width:62%"></div></div>
    <div class="rank-progress-label">160 combined XP to Bronze I</div>
    <div class="rank-sync waiting">${'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>'}<span>You've earned <strong>Bronze I</strong>, but you rank up together. Mel needs 90 XP to join you.</span></div>
  </div>

  <div class="stat-grid">
    <div class="stat-tile">
      <div class="stat-top"><span class="stat-ico week"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg></span><span class="stat-label">This week</span></div>
      <div class="stat-value">4<span class="stat-unit">/5</span></div>
      <div class="stat-bar"><div class="stat-fill" style="width:80%"></div></div>
      <div class="stat-sub">1 to go</div>
    </div>
    <div class="stat-tile">
      <div class="stat-top"><span class="stat-ico streak"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2.5.5 2-1 3-2 3-1.5 0-2-1.2-1.5-2.5C14 6 13 4 12 2Z"/></svg></span><span class="stat-label">Streak</span></div>
      <div class="stat-value">6<span class="stat-unit">days</span></div>
      <div class="stat-bar"><div class="stat-fill streak" style="width:85%"></div></div>
      <div class="stat-sub">2 rest days left</div>
    </div>
  </div>

  <div class="card">
    <h2>Your week</h2>
    <div class="week-dots">
      ${["M","T","W","T","F","S","S"].map((d,i)=>`<div class="week-dot ${i<4?"done":""}"><span>${d}</span></div>`).join("")}
    </div>
    <p class="muted-note">4 of 5 days this week. One more to hit your goal.</p>
  </div>

  <div class="card">
    <h2>Partner</h2>
    <div class="partner-row">
      <div class="avatar partner">M</div>
      <div><div class="partner-name">Mel</div><div class="muted-note">3 of 5 days · trained today</div></div>
    </div>
    <button class="btn-secondary" style="margin-top:12px;">Send encouragement</button>
  </div>

  <div class="card">
    <h2>Personal records</h2>
    <div class="pr-list">
      <div class="pr-row"><span>Bench Press</span><span class="pr-weight">185 lb</span></div>
      <div class="pr-row"><span>Squat</span><span class="pr-weight">245 lb</span></div>
      <div class="pr-row"><span>Deadlift</span><span class="pr-weight">315 lb</span></div>
    </div>
  </div>

  <nav class="tabs">
    <button class="tab-btn active"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg><span>Home</span></button>
    <button class="tab-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M6 8v8M18 8v8M4 10v4M20 10v4M6 12h12"/></svg><span>Workout</span></button>
    <button class="fab"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
    <button class="tab-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="m3 17 6-6 4 4 8-8"/></svg><span>Progress</span></button>
    <button class="tab-btn"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg><span>Setup</span></button>
  </nav>
</div>`;

writeFileSync(join(root, "preview.html"),
`<!doctype html><html lang="en" data-theme="dark"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fit Together · UI preview</title>${head}
<style>${style}</style></head><body>${body}</body></html>`);
console.log("preview.html written");
