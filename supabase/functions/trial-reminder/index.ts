// Keeps the paywall's promise: "I'll remind you your trial is ending."
//
// The paywall draws that stop on the date two days before Apple's free month
// ends, so this sends one push on that local date, at a waking hour, to every
// person whose current period is still the trial and who has not cancelled.
// Invoked hourly by pg_cron (job trial-reminder).
//
// Who counts comes from the subscriptions row RevenueCat's webhook writes:
//   period_type TRIAL   the current period is the free month, not a paid one
//   will_renew  true    they have not turned auto renew off in Settings
//   status      active  and it has not expired or been refunded
// A cancelled trial is not reminded: they already did the thing the reminder
// is for, and a push saying "you will be charged" to somebody who will not be
// is a lie.
//
// Never twice. Each send is claimed in trial_reminders first, under a unique
// index on (email, trial), so overlapping runs and hand invocations skip.
//
// Never too late to act on. Apple tries the renewal charge up to 24 hours
// before the period ends, and turning auto renew off inside that window does
// not stop it. So nothing is sent with less than CUTOFF_HOURS left: a reminder
// that arrives after the decision is already made is worse than none.
//
// Two test modes, both behind the same secret:
//   {"dry_run": true}               lists who would be sent right now, sends nothing
//   {"preview_email": "a@b.c"}      sends the push to that person's devices now,
//                                   ignoring the window and the claim

import webpush from "npm:web-push@3.6.7";
import { apnsConfigured, sendApns } from "./apns.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const CONTACT = "mailto:mo.shareef@creativelab1.com";

const CUTOFF_HOURS = 26;       // Apple's 24 hour renewal window, plus two to act
const LOOKAHEAD_HOURS = 80;    // the remind date can be up to ~3 days out in local time
const WAKING = [9, 20];        // local hours a reminder may arrive in
const LATE_HOURS = 30;         // below this, send whatever the hour: tomorrow is too late

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

/* A moment's local date and hour in a timezone. A bad zone falls back to UTC
   rather than taking the whole run down, the same as send-nudges. */
function localParts(at: Date, tz: string | null) {
  try {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
    });
    const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
  } catch {
    return { date: at.toISOString().slice(0, 10), hour: at.getUTCHours() };
  }
}

const dayNumber = (d: string) => Math.round(new Date(`${d}T00:00:00Z`).getTime() / 86400_000);

/* The words. Counted in calendar days where the person is, because that is
   how the paywall counted when it drew the date, and "in 2 days" sent at 9 am
   about a trial ending at 11 pm the day after tomorrow is true to the reader
   even though it is 62 hours. */
function copyFor(daysLeft: number) {
  const when = daysLeft <= 1 ? "tomorrow" : `in ${daysLeft} days`;
  return {
    title: `Your free month ends ${when}`,
    body: "Keep going, or cancel in Settings. No hard feelings. Some.",
    url: "/",
    threadId: "plan",
  };
}

type Push = ReturnType<typeof copyFor>;

async function deliver(email: string, n: Push, devices: { web: any[]; apns: any[] }) {
  let sent = 0;
  for (const s of devices.web) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: n.title, body: n.body, url: n.url }),
      );
      sent++;
    } catch (e: any) {
      // Cleanup of dead subscriptions is send-nudges' job, which runs every
      // hour over the same table. This only counts.
      console.warn("web push failed", email, e?.statusCode);
    }
  }
  for (const t of devices.apns) {
    try {
      const usedEnv = await sendApns(t.token, t.environment, {
        title: n.title, body: n.body, url: n.url, threadId: n.threadId,
      });
      sent++;
      const fixed = usedEnv !== t.environment ? { environment: usedEnv } : {};
      await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, {
        method: "PATCH", headers: svc,
        body: JSON.stringify({ last_ok_at: new Date().toISOString(), failures: 0, ...fixed }),
      });
    } catch (e: any) {
      console.warn("apns failed", email, e?.status, e?.reason);
    }
  }
  return sent;
}

async function devicesFor(email: string) {
  /* ilike for case, with its wildcards escaped: an underscore is common in
     an email address and would otherwise match somebody else's devices. */
  const enc = encodeURIComponent(email.replace(/[\\%_]/g, (c) => `\\${c}`));
  const [web, apns] = await Promise.all([
    VAPID_PUBLIC && VAPID_PRIVATE ? q(`push_subscriptions?select=*&email=ilike.${enc}&failures=lt.5`) : Promise.resolve([]),
    apnsConfigured() ? q(`apns_tokens?select=*&email=ilike.${enc}&failures=lt.5`) : Promise.resolve([]),
  ]);
  return { web, apns };
}

Deno.serve(async (req) => {
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!secretOk(auth, CRON_SECRET)) return json({ error: "forbidden" }, 403);
  if (VAPID_PUBLIC && VAPID_PRIVATE) webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
  if (!apnsConfigured()) console.warn("APNs is not configured; only web push can reach anybody");

  let body: any = {};
  try { body = await req.json(); } catch { /* cron sends {}, a bare call sends nothing */ }

  // Preview: the exact push, to one person, now. For checking the words on a
  // real phone. Writes nothing, so it does not use up their real reminder.
  if (body?.preview_email) {
    const email = String(body.preview_email).toLowerCase().trim();
    const devices = await devicesFor(email);
    const sent = await deliver(email, copyFor(2), devices);
    return json({ ok: true, preview: email, devices: devices.web.length + devices.apns.length, sent });
  }

  const now = new Date();
  const from = new Date(now.getTime() + CUTOFF_HOURS * 3600_000).toISOString();
  const to = new Date(now.getTime() + LOOKAHEAD_HOURS * 3600_000).toISOString();

  const subs = await q(
    `subscriptions?select=email,expires_at,original_transaction_id,environment`
    + `&period_type=eq.TRIAL&will_renew=is.true&status=eq.active`
    + `&expires_at=gt.${encodeURIComponent(from)}&expires_at=lte.${encodeURIComponent(to)}`,
  );
  if (!subs.length) return json({ ok: true, considered: 0, sent: 0 });

  const emails = subs.map((s: any) => `"${String(s.email).toLowerCase()}"`).join(",");
  const [profiles, done] = await Promise.all([
    q(`profiles?select=email,timezone&email=in.(${emails})`),
    q(`trial_reminders?select=email,trial_key&email=in.(${emails})`),
  ]);
  const tzOf = new Map<string, string | null>(profiles.map((p: any) => [String(p.email).toLowerCase(), p.timezone]));
  const already = new Set(done.map((d: any) => `${String(d.email).toLowerCase()}|${d.trial_key}`));

  const due: { email: string; key: string; expires: string; daysLeft: number }[] = [];
  for (const s of subs) {
    const email = String(s.email).toLowerCase();
    const key = s.original_transaction_id || s.expires_at;
    if (already.has(`${email}|${key}`)) continue;

    const end = new Date(s.expires_at);
    const hoursLeft = (end.getTime() - now.getTime()) / 3600_000;
    const tz = tzOf.get(email) ?? null;
    const here = localParts(now, tz);
    const daysLeft = dayNumber(localParts(end, tz).date) - dayNumber(here.date);

    // The paywall's date is end minus two days. Not before it; on it or after
    // (a late webhook) is fine, as long as the cutoff above has not passed.
    if (daysLeft > 2) continue;
    const waking = here.hour >= WAKING[0] && here.hour <= WAKING[1];
    if (!waking && hoursLeft >= LATE_HOURS) continue;

    due.push({ email, key, expires: s.expires_at, daysLeft: Math.max(1, daysLeft) });
  }

  if (body?.dry_run) return json({ ok: true, dry_run: true, considered: subs.length, due });

  let sent = 0, skipped = 0, unreachable = 0;
  for (const d of due) {
    const devices = await devicesFor(d.email);
    // Nobody to reach yet: left unclaimed, so if they turn notifications on
    // before the cutoff the next hourly run still gets them.
    if (!devices.web.length && !devices.apns.length) { unreachable++; continue; }

    const claim = await fetch(`${SUPABASE_URL}/rest/v1/trial_reminders`, {
      method: "POST",
      headers: { ...svc, Prefer: "return=representation" },
      body: JSON.stringify({ email: d.email, trial_key: d.key, expires_at: d.expires }),
    });
    if (!claim.ok) { skipped++; continue; }
    const [row] = await claim.json();

    const n = await deliver(d.email, copyFor(d.daysLeft), devices);
    sent += n;
    await fetch(`${SUPABASE_URL}/rest/v1/trial_reminders?id=eq.${row.id}`, {
      method: "PATCH", headers: svc, body: JSON.stringify({ delivered: n }),
    });
  }

  return json({ ok: true, considered: subs.length, due: due.length, sent, skipped, unreachable });
});
