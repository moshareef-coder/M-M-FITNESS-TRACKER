/* Generates design-sheet.html: every Fit Together component rendered from the
   app's REAL <style> block, laid out for import into Figma via html.to.design.
   Regenerate after any CSS change: node scripts/make-design-sheet.mjs */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const fonts = html.match(/<link[^>]*fonts[^>]*>/g)?.join("\n") || "";

const ic = (d, s = 18, extra = "") =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const I = {
  check: '<path d="m5 13 4 4L19 7"/>',
  flame: '<path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.5-2-1-2.5.5 2-1 3-2 3-1.5 0-2-1.2-1.5-2.5C14 6 13 4 12 2Z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  dumbbell: '<path d="M6 8v8M18 8v8M4 10v4M20 10v4M6 12h12"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/>',
  body: '<circle cx="12" cy="4.5" r="2.2"/><path d="M8.5 8h7l1.5 5-2 .6V20h-3v-4h-1v4h-3v-6.4l-2-.6z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  trash: '<path d="M4 7h16M10 4h4M9 7v12M15 7v12M6 7l1 13h10l1-13"/>',
};

const sec = (title, note, inner) => `
<section class="sheet-sec">
  <div class="sheet-h"><h4>${title}</h4><span>${note}</span></div>
  ${inner}
</section>`;

const body = `
<div class="sheet">
  <header class="sheet-top">
    <h1>Fit Together</h1>
    <p>Component sheet. Every element below is rendered from the live app stylesheet, so colours, type and spacing match production exactly.</p>
  </header>

${sec("Greeting", "top of Home", `
  <div class="greeting-row">
    <div class="avatar">M</div>
    <div class="greeting"><div class="hi">Good evening, Mo</div><div class="sub">3 day streak.</div></div>
  </div>`)}

${sec("Rank card", "the hero element on Home", `
  <div class="card rank-card" style="--rank-color:#c87b3a;--rank-glow:rgba(200,123,58,.55)">
    <div class="rank-head">
      <div class="rank-crest"><img class="crest-img" src="/badges/bronze-ii.webp" width="78" height="78" alt=""></div>
      <div class="rank-meta">
        <div class="rank-tier-name">Bronze II</div>
        <div class="rank-level">Level 7 · Consistent</div>
        <div class="gauge-sub">1,240 XP total · 160 to next level</div>
      </div>
    </div>
    <div class="rank-progress-track"><div class="rank-progress-fill" style="width:62%"></div></div>
    <div class="rank-progress-label">160 combined XP to Bronze I</div>
    <div class="rank-sync waiting">${ic(I.lock, 15)}<span>You've earned <strong>Bronze I</strong>, but you rank up together. Mel needs 90 XP to join you.</span></div>
  </div>`)}

${sec("Stat tiles", "two up, compact", `
  <div class="stat-grid">
    <div class="stat-tile">
      <div class="stat-top"><span class="stat-ico week">${ic(I.list, 20)}</span><span class="stat-label">This week</span></div>
      <div class="stat-value">4<span class="stat-unit">/5</span></div>
      <div class="stat-bar"><div class="stat-fill" style="width:80%"></div></div>
      <div class="stat-sub">1 to go</div>
    </div>
    <div class="stat-tile">
      <div class="stat-top"><span class="stat-ico streak">${ic(I.flame, 20)}</span><span class="stat-label">Streak</span></div>
      <div class="stat-value">6<span class="stat-unit">days</span></div>
      <div class="stat-bar"><div class="stat-fill streak" style="width:85%"></div></div>
      <div class="stat-sub">2 rest days left</div>
    </div>
  </div>`)}

${sec("Week strip", "seven days, trained marked", `
  <div class="card">
    <h2>Your week</h2>
    <div class="week-dots">
      ${["M","T","W","T","F","S","S"].map((d,i)=>`<div class="week-dot-col"><div class="week-dot ${i<4?"done":""} ${i===4?"today":""}">${i<4?ic(I.check,14):""}</div><div class="week-dot-lbl">${d}</div></div>`).join("")}
    </div>
    <p class="week-caption">4/5 days this week · 6 day streak</p>
  </div>`)}

${sec("Partner", "the other person, always visible", `
  <div class="card">
    <h2>Partner</h2>
    <div class="partner-row">
      <div class="avatar partner">M</div>
      <div><div class="partner-name">Mel</div><div class="muted-note">3/5 days this week · 2 day streak</div></div>
    </div>
    <div class="week-dots" style="margin-top:12px">
      ${["M","T","W","T","F","S","S"].map((d,i)=>`<div class="week-dot-col"><div class="week-dot ${i<3?"done":""}">${i<3?ic(I.check,14):""}</div><div class="week-dot-lbl">${d}</div></div>`).join("")}
    </div>
    <button class="btn-secondary" style="margin-top:12px">Send encouragement</button>
  </div>`)}

${sec("Rest day prompt", "streak protection", `
  <div class="rest-banner" style="display:flex">
    <div class="rest-copy"><strong>Missed yesterday?</strong><span>Call it a rest day and keep your 6 day streak. 2 left this week.</span></div>
    <button class="rest-btn">Rest day</button>
  </div>`)}

${sec("Weigh-in", "typed, on Progress", `
  <div class="card">
    <h2>Log your weight</h2>
    <p class="muted-note" style="margin-top:-6px">Last logged 182.5 lbs.</p>
    <div class="weigh-row">
      <input type="number" id="scaleWeightInput" value="182.5">
      <span class="weigh-unit">lbs</span>
      <div class="weigh-nudge"><button class="weigh-btn">&minus;</button><button class="weigh-btn">+</button></div>
    </div>
    <label class="gym-toggle" style="margin-top:12px"><span>Worked out today</span><input type="checkbox"></label>
    <button class="btn-primary" style="margin-top:12px">Save weigh-in</button>
  </div>`)}

${sec("Muscle coverage", "the loop to close, on Body", `
  <div class="card">
    <h2>Muscle coverage</h2>
    <div class="coverage">
      <div class="coverage-ring"></div>
      <div class="coverage-body">
        <div class="coverage-count">4/6</div>
        <div class="coverage-title">2 muscle groups to go</div>
        <div class="coverage-hint">Still untouched this week: Back, Core.</div>
      </div>
    </div>
    <div class="coverage-chips">
      ${["Chest","Back","Shoulders","Arms","Legs","Core"].map((g,i)=>`<span class="cov-chip ${i%3?"on":""}">${i%3?ic(I.check,13):""}${g}</span>`).join("")}
    </div>
  </div>`)}

${sec("Personal records", "the strongest signal in the app", `
  <div class="card">
    <h2>Personal records</h2>
    <div class="pr-list">
      <div class="pr-row"><span>Bench Press</span><span class="pr-weight">185 lb</span></div>
      <div class="pr-row"><span>Squat</span><span class="pr-weight">245 lb</span></div>
      <div class="pr-row"><span>Deadlift</span><span class="pr-weight">315 lb</span></div>
    </div>
  </div>`)}

${sec("Activity log", "with per-day delete", `
  <div class="card">
    <h2>Recent activity</h2>
    <div class="log-list">
      <div class="log-item"><span class="dot" style="background:var(--me)"></span><span class="date">08-31</span><span class="w">182.5 lb</span><span class="gym-yes">${ic(I.dumbbell,14)}</span><span class="note"></span><button class="log-del">${ic(I.trash,15)}</button></div>
      <div class="log-item"><span class="dot" style="background:var(--me)"></span><span class="date">08-30</span><span class="w">183 lb</span><span class="log-rest">rest</span><span class="note"></span><button class="log-del">${ic(I.trash,15)}</button></div>
      <div class="log-item"><span class="dot" style="background:var(--partner)"></span><span class="date">08-30</span><span class="w">141 lb</span><span class="gym-yes">${ic(I.dumbbell,14)}</span><span class="note"></span></div>
    </div>
  </div>`)}

${sec("Empty state", "what a new account sees", `
  <div class="card">
    <h2>Weight trend</h2>
    <div class="empty-state">
      <div class="empty-icon">${ic(I.trend,26)}</div>
      <div class="empty-title">No weigh-ins yet</div>
      <div class="empty-hint">Log your weight on the Home tab and your trend line starts here.</div>
    </div>
  </div>`)}

${sec("Buttons and inputs", "every state", `
  <div class="card">
    <button class="btn-primary">Primary action</button>
    <button class="btn-secondary">Secondary action</button>
    <button class="btn-ghost">Ghost action</button>
    <button class="btn-danger" style="margin-top:8px">Destructive action</button>
    <label style="margin-top:16px">Text input</label>
    <input type="text" placeholder="Placeholder">
    <label style="margin-top:12px">Select</label>
    <select><option>An option</option></select>
  </div>`)}

${sec("Banners", "offline, error, encouragement", `
  <div class="conn-banner">${ic(I.lock,14)}<span>Offline, 3 changes saved here. Keep going, nothing is lost.</span></div>
  <div class="fatal-banner"><strong>Something broke while loading.</strong><span>TypeError: example message in renderHome()</span><button>Reload</button></div>`)}

${sec("Bottom navigation", "floating, with the primary action", `
  <div class="sheet-navwrap">
    <nav class="tabs" style="position:relative;left:auto;right:auto;bottom:auto;margin:0">
      <button class="tab-btn active">${ic(I.home,20)}<span>Home</span></button>
      <button class="tab-btn">${ic(I.body,20)}<span>Body</span></button>
      <button class="fab">${ic(I.dumbbell,26,'stroke-width="2.4"')}</button>
      <button class="tab-btn">${ic(I.trend,20)}<span>Progress</span></button>
      <button class="tab-btn">${ic(I.gear,20)}<span>Setup</span></button>
    </nav>
  </div>`)}
</div>`;

const sheetCss = `
  body { background: var(--bg); }
  .sheet { max-width: 480px; margin: 0 auto; padding: 28px 18px 60px; }
  .sheet-top h1 { font-size: 30px; letter-spacing: -0.02em; margin: 0 0 6px; }
  .sheet-top p { color: var(--muted); font-size: 14px; line-height: 1.5; margin: 0 0 8px; }
  .sheet-sec { padding-top: 30px; }
  .sheet-h { display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
    margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .sheet-h h4 { margin: 0; font-size: 15px; font-weight: 700; }
  .sheet-h span { font-size: 12px; color: var(--muted); }
  .sheet-navwrap { padding: 8px 0 4px; }
`;

writeFileSync(join(root, "design-sheet.html"),
`<!doctype html><html lang="en" data-theme="dark"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fit Together · component sheet</title>${fonts}
<style>${style}${sheetCss}</style></head><body>${body}</body></html>`);
console.log("design-sheet.html written");
