// Sends at most one scheduled notification per person per day, at a sensible
// hour in their own timezone. Invoked hourly by pg_cron; the hour filter is
// what makes that safe.
//
// Deliberately few kinds. A notification people learn to ignore is worse than
// no notification at all.
//   evening   (local 18:00) you have not trained today and your partner has
//   streak    (local 20:00) your together streak of 3+ ends tonight
//   recap     (Sunday 19:00) the week, both of you, in one line
//   progress  (Monday 08:00) weigh in or take a photo, only when one is due
//   digest    (local 08:00) a coach's summary of who trained yesterday
//
// Who gets which, the priority between them and the reasons are in plan.ts,
// which is pure so it can be tested without a network. This file only fetches
// rows, asks plan.ts, and delivers.
//
// Safe to call by hand. It will still refuse to send twice in a day, because
// nudge_log's unique indexes do that job rather than this code. POST
// {"dry_run": true} to see what it would send right now without sending, and
// add "now": "2026-10-11T19:05:00-07:00" to ask about another moment.

import webpush from "npm:web-push@3.6.7";
import { apnsConfigured, sendApns } from "./apns.ts";
import { localParts, offSet, planFor, shift, trackedKeys, type Day, type Planned } from "./plan.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const CONTACT = "mailto:mo.shareef@creativelab1.com";

const svc = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/* Compared character by character to the end, so a wrong secret cannot be
   narrowed down by timing how quickly it was rejected. */
function secretOk(given: string, expected: string) {
  if (!expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function q(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svc });
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

/* Every page of a select. PostgREST stops at its max-rows (1000 here by
   default) without saying so, and a streak read off a silently truncated
   history is a streak that breaks for no reason anybody can find. */
async function qAll(path: string) {
  const out: any[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { ...svc, "Range-Unit": "items", Range: `${from}-${from + size - 1}` },
    });
    if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < size) return out;
  }
}

/* profiles.notify_off is behind 20261009_notify_prefs_and_cheer.sql, written
   and not applied. Until it is, asking for it fails the whole select, so a
   missing column is retried without it and reads as nothing switched off,
   which is exactly today's behaviour. */
const PROFILE_COLS = "email,user_name,timezone,created_at,challenge_target,goal_bubble,goal_secondary,tracked_by_goal,tracked_metrics";
async function loadProfiles() {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=${PROFILE_COLS},notify_off`, { headers: svc });
  if (r.ok) return r.json();
  const text = await r.text();
  if (!/notify_off/.test(text)) throw new Error(`profiles -> ${r.status} ${text}`);
  return q(`profiles?select=${PROFILE_COLS}`);
}

Deno.serve(async (req) => {
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!secretOk(auth, CRON_SECRET)) return json({ error: "forbidden" }, 403);
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: "VAPID keys not configured" }, 500);

  let opts: any = {};
  try { opts = await req.json(); } catch { /* cron sends {} and a hand call may send nothing */ }
  const dryRun = opts?.dry_run === true;
  const now = typeof opts?.now === "string" && !Number.isNaN(Date.parse(opts.now)) ? new Date(opts.now) : new Date();

  webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);

  // Small data set, so one pass over everything beats a query per person.
  // Revisit when a single run stops fitting comfortably in memory.
  const [profiles, subs, apns, partnerships, members, groups] = await Promise.all([
    loadProfiles(),
    q("push_subscriptions?select=*&failures=lt.5"),
    apnsConfigured() ? q("apns_tokens?select=*&failures=lt.5") : Promise.resolve([]),
    q("partnerships?select=inviter_email,invitee_email,created_at,responded_at&status=eq.accepted"),
    q("group_members?select=email,role,group_id&left_at=is.null"),
    q("groups?select=id,owner_email,kind&kind=eq.coach"),
  ]);

  const subsFor = new Map<string, any[]>();
  for (const s of subs) {
    const k = (s.email || "").toLowerCase();
    if (!subsFor.has(k)) subsFor.set(k, []);
    subsFor.get(k)!.push(s);
  }

  // Someone on the phone app has a device token and no web subscription, so
  // both maps decide who is reachable.
  const apnsFor = new Map<string, any[]>();
  for (const t of apns) {
    const k = (t.email || "").toLowerCase();
    if (!apnsFor.has(k)) apnsFor.set(k, []);
    apnsFor.get(k)!.push(t);
  }
  const reachable = (email: string) => subsFor.has(email) || apnsFor.has(email);

  const partnerOf = new Map<string, string>();
  const partnerSince = new Map<string, string>();
  for (const p of partnerships) {
    const a = (p.inviter_email || "").toLowerCase();
    const b = (p.invitee_email || "").toLowerCase();
    partnerOf.set(a, b);
    partnerOf.set(b, a);
    const since = p.responded_at || p.created_at || null;
    if (since) { partnerSince.set(a, since); partnerSince.set(b, since); }
  }

  /* Clamped because user_name is free text the person types and it goes
     straight into a push title, and a push payload has a hard size limit that
     a long enough name would push the whole notification past. */
  const nameOf = new Map<string, string>(
    profiles.map((p: any) => [
      (p.email || "").toLowerCase(),
      String(p.user_name || "Your partner").slice(0, 60),
    ]),
  );
  const profileOf = new Map<string, any>(profiles.map((p: any) => [(p.email || "").toLowerCase(), p]));

  /* A whole year of days for the streak, because the app counts up to 365 and
     a warning that quotes a smaller number than the Home pill is a lie. Only
     days that can matter are fetched: trained or rested. Anything else is the
     same as no row, which is what the app's rule says too. */
  let earliest = localParts(null, now).date;
  for (const p of profiles) {
    const { date } = localParts(p.timezone, now);
    if (date < earliest) earliest = date;
  }
  const since = shift(earliest, -370);
  const days = new Map<string, Day>();
  const entries = await qAll(
    `fit_entries?select=email,entry_date,gym,rest_day&entry_date=gte.${since}&or=(gym.eq.true,rest_day.eq.true)&order=entry_date.asc`,
  );
  for (const r of entries) {
    const k = `${(r.email || "").toLowerCase()}|${r.entry_date}`;
    const d = days.get(k) || { gym: false, rest: false };
    days.set(k, { gym: d.gym || !!r.gym, rest: d.rest || !!r.rest_day });
  }
  const NONE: Day = { gym: false, rest: false };
  const dayOf = (email: string, date: string) => days.get(`${email}|${date}`) || NONE;

  /* The newest weigh-in and the newest photo per person, which is what the
     Progress weight chart and photo card read. */
  const lastWeight = new Map<string, { date: string; weight: number }>();
  for (const r of await qAll("body_measurements?select=email,entry_date,weight&weight=not.is.null&order=entry_date.desc")) {
    const k = (r.email || "").toLowerCase();
    if (!lastWeight.has(k) && Number(r.weight) > 0) lastWeight.set(k, { date: r.entry_date, weight: Number(r.weight) });
  }
  const lastPhoto = new Map<string, string>();
  for (const r of await qAll("body_photos?select=email,taken_on&order=taken_on.desc")) {
    const k = (r.email || "").toLowerCase();
    if (!lastPhoto.has(k) && r.taken_on) lastPhoto.set(k, r.taken_on);
  }
  const progressSent = new Map<string, string[]>();
  for (const r of await q(`nudge_log?select=email,sent_on&kind=eq.progress&sent_on=gte.${shift(earliest, -10)}`)) {
    const k = (r.email || "").toLowerCase();
    if (!progressSent.has(k)) progressSent.set(k, []);
    progressSent.get(k)!.push(r.sent_on);
  }

  // For the coach digest: did they show up yesterday. Rest days do not count.
  const trained = (email: string, date: string) => dayOf(email, date).gym;

  const planned: Planned[] = [];
  const reasons: { email: string; why: string }[] = [];

  for (const p of profiles) {
    const me = (p.email || "").toLowerCase();
    if (!me || !reachable(me)) continue;
    const { date, hour, weekday } = localParts(p.timezone, now);
    const partner = partnerOf.get(me) || null;

    const decision = planFor({
      email: me, date, hour, weekday,
      off: offSet(p.notify_off),
      partner,
      partnerName: partner ? (nameOf.get(partner) || "Your partner") : "Your partner",
      partnerSince: partnerSince.get(me) || null,
      dayOf,
      targetOf: (e) => Number(profileOf.get(e)?.challenge_target) || 4,
      accountCreated: p.created_at || null,
      tracked: trackedKeys(p),
      lastWeight: lastWeight.get(me) || null,
      lastPhoto: lastPhoto.get(me) || null,
      progressSentSince: (d) => (progressSent.get(me) || []).some((s) => s >= d),
    });
    if (decision.planned) planned.push(decision.planned);
    reasons.push({ email: me, why: decision.why });

    if (hour === 8) {
      const mine = groups.find((g: any) => (g.owner_email || "").toLowerCase() === me);
      if (mine) {
        const roster = members.filter((m: any) =>
          m.group_id === mine.id && (m.email || "").toLowerCase() !== me);
        if (roster.length) {
          const y = shift(date, -1);
          const did = roster.filter((m: any) => trained((m.email || "").toLowerCase(), y)).length;
          planned.push({
            email: me, kind: "digest",
            title: `${did} of ${roster.length} trained yesterday`,
            subtitle: "Your group",
            body: did === roster.length
              ? "Everyone showed up. Worth telling them."
              : `${roster.length - did} to check in on.`,
            category: "COACH_DIGEST",
            threadId: "coach",
            url: "/coach/",
            // Outside the one-a-day cap on purpose: it is a coach's work
            // summary about other people, not a nudge about their own day,
            // and the cap index does not list it.
            sentOn: date,
          });
        }
      }
    }
  }

  if (dryRun) return json({ ok: true, dry_run: true, at: now.toISOString(), planned, reasons });

  let sent = 0, skipped = 0, dropped = 0;

  for (const n of planned) {
    // Claim the nudge before sending it. The unique indexes are what
    // guarantee once a day, and one scheduled kind a day, so a retry or an
    // overlapping run cannot double up. A refused claim is the cap working.
    const claim = await fetch(`${SUPABASE_URL}/rest/v1/nudge_log`, {
      method: "POST",
      headers: svc,
      /* sent_on is the person's own date, not the database's. The cap is
         "one a day where you are", and current_date is UTC, which for
         somebody in California turns 18:00 and 20:00 into two different days. */
      body: JSON.stringify({ email: n.email, kind: n.kind, sent_on: n.sentOn }),
    });
    if (!claim.ok) { skipped++; continue; }

    for (const s of subsFor.get(n.email) || []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: n.title, body: n.body, url: n.url, subtitle: n.subtitle }),
        );
        sent++;
        await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${s.id}`, {
          method: "PATCH", headers: svc,
          body: JSON.stringify({ last_ok_at: new Date().toISOString(), failures: 0 }),
        });
      } catch (e: any) {
        // 404 and 410 mean the browser threw the subscription away. Anything
        // else might be transient, so count it and give up after five.
        const gone = e?.statusCode === 404 || e?.statusCode === 410;
        if (gone) {
          dropped++;
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${s.id}`, {
            method: "DELETE", headers: svc,
          });
        } else {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${s.id}`, {
            method: "PATCH", headers: svc,
            body: JSON.stringify({ failures: (s.failures ?? 0) + 1 }),
          });
        }
      }
    }

    for (const t of apnsFor.get(n.email) || []) {
      try {
        const usedEnv = await sendApns(t.token, t.environment, {
          title: n.title, body: n.body, url: n.url,
          subtitle: n.subtitle, category: n.category, threadId: n.threadId,
        });
        sent++;
        // The row is repaired in place when the token turned out to belong to
        // the other gateway. Every token the app registered while it asserted
        // "development" is wrong, and this is what makes the next send go
        // straight there instead of costing a round trip every time.
        const fixed = usedEnv !== t.environment ? { environment: usedEnv } : {};
        await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, {
          method: "PATCH", headers: svc,
          body: JSON.stringify({ last_ok_at: new Date().toISOString(), failures: 0, ...fixed }),
        });
      } catch (e: any) {
        // Apple say BadDeviceToken or Unregistered when the app is gone from
        // that phone. Anything else may be transient, so it is counted and the
        // row drops out of the query after five. BadDeviceToken reaching here
        // means BOTH gateways refused it, since sendApns tries the other one
        // first, so it really is gone rather than mislabelled.
        const gone = e?.status === 410
          || e?.reason === "BadDeviceToken"
          || e?.reason === "Unregistered";
        if (gone) {
          dropped++;
          await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, {
            method: "DELETE", headers: svc,
          });
        } else {
          await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, {
            method: "PATCH", headers: svc,
            body: JSON.stringify({ failures: (t.failures ?? 0) + 1 }),
          });
        }
      }
    }
  }

  return json({ ok: true, considered: planned.length, sent, skipped, dropped });
});
