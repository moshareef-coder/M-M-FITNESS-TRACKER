// Feeds sample rows to the pure decision logic behind the notifications and
// prints who gets what, when, and why not. No network, no Deno: node strips
// the types out of the .ts files itself (node 23.6 and later).
//
//   node scripts/notify-plan-test.mjs
//
// Exits 1 on any failed expectation, so it can sit in a gate.

import {
  planFor, localParts, offSet, trackedKeys, progressCopy, sharedDayStreak, shift,
} from "../supabase/functions/send-nudges/plan.ts";
import { decideEvent } from "../supabase/functions/notify-partner/decide.ts";

let fails = 0;
const expect = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`);
};

/* A couple's history as a tiny DSL: for each email, the dates they trained (g)
   or rested (r). */
function history(rows) {
  const m = new Map();
  for (const [email, date, what] of rows) m.set(`${email}|${date}`, { gym: what === "g", rest: what === "r" });
  return (email, date) => m.get(`${email}|${date}`) || { gym: false, rest: false };
}
const run = (from, n, email, what = "g") => Array.from({ length: n }, (_, i) => [email, shift(from, -i), what]);

const MO = "mo@x.test", MELL = "mell@x.test";
const base = (over) => ({
  email: MO, date: "2026-10-08", hour: 18, weekday: 3,
  off: new Set(), partner: MELL, partnerName: "Mell", partnerSince: "2026-09-01T00:00:00Z",
  dayOf: history([]), targetOf: () => 4, accountCreated: "2026-09-01T00:00:00Z",
  tracked: new Set(["weight"]), lastWeight: null, lastPhoto: null,
  progressSentSince: () => false,
  ...over,
});
const show = (label, ctx) => {
  const d = planFor(ctx);
  const p = d.planned;
  console.log(`  ${label.padEnd(58)} ${p ? `SEND ${p.kind}: "${p.title}"${p.subtitle ? ` / "${p.subtitle}"` : ""} / "${p.body}"` : `none (${d.why})`}`);
  return d;
};

console.log("\nlocal time");
const now = new Date("2026-10-09T01:30:00Z");
expect("01:30Z is 18:xx Thursday in Los Angeles", localParts("America/Los_Angeles", now), { date: "2026-10-08", hour: 18, weekday: 3 });
expect("a bad zone falls back to UTC", localParts("Not/AZone", now), { date: "2026-10-09", hour: 1, weekday: 4 });

console.log("\nprefs column");
expect("array", [...offSet(["Cheer", "recap"])], ["cheer", "recap"]);
expect("postgres literal", [...offSet("{cheer,recap}")], ["cheer", "recap"]);
expect("null and absent", [...offSet(null), ...offSet(undefined)], []);

console.log("\nstreak port (sharedDayStreak)");
// Five days both trained up to yesterday; today only Mell so far.
const five = history([...run("2026-10-07", 5, MO), ...run("2026-10-07", 5, MELL), [MELL, "2026-10-08", "g"]]);
expect("5 completed, today open", sharedDayStreak(five, MO, MELL, "2026-10-08"), 5);
// A shared rest day holds the chain without counting.
const rested = history([...run("2026-10-07", 2, MO), ...run("2026-10-07", 2, MELL),
  [MO, "2026-10-05", "r"], [MELL, "2026-10-05", "r"], ...run("2026-10-04", 3, MO), ...run("2026-10-04", 3, MELL)]);
expect("rest day held, 2 + 3", sharedDayStreak(rested, MO, MELL, "2026-10-08"), 5);

console.log("\nThursday 2026-10-08 (Los Angeles), hour by hour");
show("18:00 Mo, streak 5, Mell trained, Mo not", base({ dayOf: five }));
show("18:00 Mell (she trained)", base({ email: MELL, partner: MO, partnerName: "Mo", dayOf: five }));
let d = show("20:00 Mo, still not trained", base({ hour: 20, dayOf: five }));
expect("streak copy", [d.planned?.title, d.planned?.body], ["Your together streak ends tonight", "5 days. One workout keeps it."]);
show("20:00 Mell, she trained (not hers to save)", base({ email: MELL, partner: MO, partnerName: "Mo", hour: 20, dayOf: five }));
const twoOnly = history([...run("2026-10-07", 2, MO), ...run("2026-10-07", 2, MELL), [MELL, "2026-10-08", "g"]]);
d = show("18:00 Mo, streak only 2", base({ dayOf: twoOnly }));
expect("evening copy", [d.planned?.title, d.planned?.subtitle, d.planned?.body], ["Mell trained today", "Your turn", "There is still time."]);
show("20:00 Mo, streak only 2", base({ hour: 20, dayOf: twoOnly }));
const neither = history([...run("2026-10-07", 4, MO), ...run("2026-10-07", 4, MELL)]);
d = show("20:00 Mo, streak 4, neither trained", base({ hour: 20, dayOf: neither }));
expect("both missing copy", d.planned?.body, "4 days. One workout each keeps it.");
const moRested = history([...run("2026-10-07", 4, MO), ...run("2026-10-07", 4, MELL), [MO, "2026-10-08", "r"]]);
show("20:00 Mo, he logged a rest day", base({ hour: 20, dayOf: moRested }));
show("20:00 Mell, Mo rested, she has not shown up", base({ email: MELL, partner: MO, partnerName: "Mo", hour: 20, dayOf: moRested }));
d = show("18:00 Mo, streak 5 but streak switched OFF", base({ dayOf: five, off: new Set(["streak"]) }));
expect("evening comes back when streak is off", d.planned?.kind, "evening");
show("18:00 Mo, evening switched off, streak 2", base({ dayOf: twoOnly, off: new Set(["evening"]) }));
show("18:00 solo (no partner)", base({ partner: null, dayOf: twoOnly }));

console.log("\nSunday 2026-10-11");
const sun = { date: "2026-10-11", weekday: 6 };
// This week: Mo trained Mon, Wed, Fri, Sun; Mell Mon, Wed, Sat.
const week = history([[MO, "2026-10-05", "g"], [MO, "2026-10-07", "g"], [MO, "2026-10-09", "g"], [MO, "2026-10-11", "g"],
  [MELL, "2026-10-05", "g"], [MELL, "2026-10-07", "g"], [MELL, "2026-10-10", "g"]]);
show("18:00 Mell (Mo trained, she has not)", base({ ...sun, email: MELL, partner: MO, partnerName: "Mo", dayOf: week }));
d = show("19:00 Mo", base({ ...sun, hour: 19, dayOf: week }));
expect("recap copy", [d.planned?.title, d.planned?.body], ["Week 6 together", "You 4 of 4, Mell 3 of 4. One more for Mell."]);
d = show("19:00 Mell", base({ ...sun, hour: 19, email: MELL, partner: MO, partnerName: "Mo", dayOf: week }));
expect("recap from her side", d.planned?.body, "You 3 of 4, Mo 4 of 4. One more for you tonight.");
show("19:00 Mo, recap switched off", base({ ...sun, hour: 19, dayOf: week, off: new Set(["recap"]) }));
show("19:00 a week where neither trained", base({ ...sun, hour: 19, dayOf: history([]) }));
const sunRisk = history([...run("2026-10-10", 4, MO), ...run("2026-10-10", 4, MELL)]);
show("19:00 Mo, streak 4 at risk tonight", base({ ...sun, hour: 19, dayOf: sunRisk }));
show("20:00 Mo, still at risk", base({ ...sun, hour: 20, dayOf: sunRisk }));
const sunSaved = history([...run("2026-10-11", 5, MO), ...run("2026-10-10", 4, MELL), [MELL, "2026-10-11", "g"]]);
show("20:00 Mo, both trained by 20:00 (recap fallback)", base({ ...sun, hour: 20, dayOf: sunSaved }));

console.log("\nprogress reminders");
expect("default goal tracks weight only", [...trackedKeys({ goal_bubble: "consistent" })].sort(), ["weight", "workouts_wk"]);
expect("lose weight + secondary build muscle", [...trackedKeys({ goal_bubble: "lose-weight", goal_secondary: [{ bubble: "build-muscle" }] })].sort(),
  ["arm_in", "chest_in", "photos", "waist_in", "weight"]);
expect("an empty per goal list is honoured", [...trackedKeys({ goal_bubble: "consistent", tracked_by_goal: { consistent: [] } })], []);
expect("flat list only for the main goal", [...trackedKeys({ goal_bubble: "get-stronger", tracked_metrics: ["photos"] })], ["photos"]);
expect("retired goal reads as its replacement", [...trackedKeys({ goal_bubble: "feel-better" })].sort(), ["weight", "workouts_wk"]);
const mon = { date: "2026-10-12", weekday: 0, hour: 8, dayOf: history([]) };
show("Mon 08:00 weight, last 182.4 lb 9 days ago", base({ ...mon, lastWeight: { date: "2026-10-03", weight: 182.4 } }));
show("Mon 08:00 weight, last 3 days ago (not due)", base({ ...mon, lastWeight: { date: "2026-10-09", weight: 182 } }));
show("Mon 08:00 weight, never logged, new account", base({ ...mon, accountCreated: "2026-10-01T00:00:00Z" }));
show("Mon 08:00 weight, never logged, account 6 weeks old", base({ ...mon, accountCreated: "2026-08-31T00:00:00Z" }));
show("Mon 08:00 photos only, last photo 21 days ago", base({ ...mon, tracked: new Set(["photos"]), lastPhoto: "2026-09-21" }));
d = show("Mon 08:00 both due", base({ ...mon, tracked: new Set(["weight", "photos"]), lastWeight: { date: "2026-10-02", weight: 180 }, lastPhoto: "2026-09-20" }));
expect("both copy", [d.planned?.title, d.planned?.body, d.planned?.url], ["Progress day", "Weigh in and snap a photo. It's been 10 days.", "/progress/log"]);
show("Mon 08:00 tracks neither", base({ ...mon, tracked: new Set(["lifts"]), lastWeight: { date: "2026-09-01", weight: 180 } }));
show("Mon 08:00 progress switched off", base({ ...mon, off: new Set(["progress"]), lastWeight: { date: "2026-10-02", weight: 180 } }));
show("Mon 08:00 already sent this week", base({ ...mon, progressSentSince: () => true, lastWeight: { date: "2026-10-02", weight: 180 } }));
const alive = history([...run("2026-10-11", 4, MO), ...run("2026-10-11", 4, MELL), ...run("2026-10-12", 1, MO)]);
show("Mon 08:00, together streak 4 alive", base({ ...mon, dayOf: alive, lastWeight: { date: "2026-10-02", weight: 180 } }));
show("Tue 08:00, the slipped one", base({ ...mon, date: "2026-10-13", weekday: 1, dayOf: alive, lastWeight: { date: "2026-10-02", weight: 180 } }));
show("Tue 08:00, Monday was not slipped", base({ ...mon, date: "2026-10-13", weekday: 1, lastWeight: { date: "2026-10-02", weight: 180 } }));
show("Wed 08:00", base({ ...mon, date: "2026-10-14", weekday: 2, lastWeight: { date: "2026-10-02", weight: 180 } }));
expect("weight copy with a whole number", progressCopy({ today: "2026-10-12", accountCreated: null, tracksWeight: true, tracksPhotos: false, lastWeight: { date: "2026-10-01", weight: 180 }, lastPhoto: null }),
  { title: "Weigh-in day", body: "Last one: 180 lb, 11 days ago." });

console.log("\none scheduled notification per person per local day (the cap index, simulated)");
/* Runs all 24 hourly passes for a day, with the claim behaving like
   nudge_log_one_scheduled_a_day: a second scheduled row for the same person
   and local date is refused. The day chosen is the worst case: a Monday where
   a weigh-in is due at 08:00 and at 18:00 Mell has trained and Mo has not. */
function simulateDay(ctxFor) {
  const claimed = new Map();
  const out = [];
  for (let h = 0; h < 24; h++) {
    const c = ctxFor(h);
    const { planned } = planFor(c);
    if (!planned) continue;
    const k = `${planned.email}|${planned.sentOn}`;
    if (claimed.has(k)) { out.push(`${h}:00 ${planned.kind} REFUSED (slot used by ${claimed.get(k)})`); continue; }
    claimed.set(k, planned.kind);
    out.push(`${h}:00 ${planned.kind} sent`);
  }
  return out;
}
const monEvening = history([[MELL, "2026-10-12", "g"], [MO, "2026-10-10", "g"], [MELL, "2026-10-10", "g"]]);
let log = simulateDay((h) => base({ date: "2026-10-12", weekday: 0, hour: h, dayOf: monEvening, lastWeight: { date: "2026-10-01", weight: 181 } }));
console.log("  Monday, weigh-in due and the evening case:", log.join(", "));
expect("only one went out", log.filter((l) => l.endsWith("sent")).length, 1);
const sunAll = history([...run("2026-10-10", 4, MO), ...run("2026-10-11", 5, MELL)]);
log = simulateDay((h) => base({ ...sun, hour: h, dayOf: sunAll }));
console.log("  Sunday, Mell trained, Mo has not, streak 4:", log.join(", "));
expect("the streak warning wins Sunday", log, ["20:00 streak sent"]);

console.log("\nevent notifications (notify-partner)");
const ev = (label, e) => {
  const o = decideEvent({ off: new Set(), localHour: 14, nowSec: 1_760_000_000, fromName: "Mell", ...e });
  console.log(`  ${label.padEnd(44)} ${o.send ? `SEND "${o.title}" / "${o.body}" [${o.interruptionLevel}${o.category ? `, ${o.category}` : ""}${o.expiresAt ? `, expires +${o.expiresAt - 1_760_000_000}s` : ""}] -> ${o.url}` : `none (${o.why})`}`);
  return o;
};
let o = ev("cheer at 14:00", { kind: "cheer", message: "Proud of you" });
expect("cheer copy", [o.title, o.body], ["Mell cheered you on", "“Proud of you”"]);
o = ev("cheer at 23:00", { kind: "cheer", message: "Night!", localHour: 23 });
expect("quiet hours are passive", o.interruptionLevel, "passive");
ev("cheer at 06:00", { kind: "cheer", message: "Morning", localHour: 6 });
ev("cheer at 07:00", { kind: "cheer", message: "Morning", localHour: 7 });
ev("empty cheer", { kind: "cheer", message: "   " });
ev("cheer switched off", { kind: "cheer", message: "Hi", off: new Set(["cheer"]) });
o = ev("invite", { kind: "invite", sessionId: "abc-123" });
expect("invite copy", [o.title, o.body, o.category], ["Mell wants to train together", "Same workout, 1.5x XP if you both finish.", "TOGETHER_INVITE"]);
ev("invite at 23:00 (not quietened)", { kind: "invite", sessionId: "abc-123", localHour: 23 });
ev("ask to join her workout", { kind: "invite", request: true, sessionId: "abc-123" });
ev("invite switched off", { kind: "invite", off: new Set(["invite"]) });
o = ev("finish with a caption", { kind: "finish", workout: "Full body A", message: "Legs done. Your turn." });
expect("finish copy", [o.title, o.body, o.url], ["Mell just finished Full body A", "“Legs done. Your turn.”", "/finished"]);
o = ev("finish, no caption", { kind: "finish", workout: "Full body A", message: "" });
expect("finish without a caption says Your turn.", o.body, "Your turn.");
o = ev("finish, details private", { kind: "finish", workout: "", message: "" });
expect("private finish names no workout", o.title, "Mell just finished a workout");
o = ev("finish at 23:00", { kind: "finish", workout: "Legs", localHour: 23 });
expect("finish overnight is passive", o.interruptionLevel, "passive");
o = ev("finish switched off", { kind: "finish", workout: "Legs", off: new Set(["finish"]) });
expect("finish respects notify_off", o.send, false);

console.log("\nno dashes in any copy");
const src = (await import("node:fs")).readFileSync;
const copy = [
  src(new URL("../supabase/functions/send-nudges/plan.ts", import.meta.url), "utf8"),
  src(new URL("../supabase/functions/notify-partner/decide.ts", import.meta.url), "utf8"),
].join("\n");
expect("no em or en dash in either file", /[\u2013\u2014]/.test(copy), false);

console.log(fails ? `\n${fails} FAILED` : "\nall expectations held");
process.exit(fails ? 1 : 0);
