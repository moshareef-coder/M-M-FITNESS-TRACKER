// "Mell cheered you on" and "Mell wants to train together", the moment she
// does it, 2026-10-09.
//
// Shaped like notify-clip and for the same reason: an event, not a state, so
// it is trigger driven rather than waiting for the hourly job. One function
// for both events because they are the same job (find the other phone, say
// who and what) and one deploy is one fewer thing to forget.
//
// No permission check here, and the trigger firing is the permission:
// encouragements has an INSERT policy requiring the sender to be who they say,
// and together_sessions an INSERT policy requiring the guest to be the host's
// actual partner. A row existing already proves a pair. This function must
// never become the place that decides who may be messaged.
//
// What it does decide: the recipient's own switch for this kind
// (profiles.notify_off) and whether it is the middle of the night where they
// are. Both are in decide.ts.

import webpush from "npm:web-push@3.6.7";
import { apnsConfigured, sendApns } from "./apns.ts";
import { decideEvent } from "./decide.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
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

/* Free text somebody typed, landing in a payload with a hard size limit.
   Clamped rather than trusted. */
const clamp = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function localHour(tz: string | null) {
  try {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC", hour: "2-digit", hour12: false });
    return Number(f.formatToParts(new Date()).find((x) => x.type === "hour")?.value ?? 0) % 24;
  } catch {
    return new Date().getUTCHours();
  }
}

/* The recipient's switches and timezone. notify_off is behind a migration that
   is written and not applied; until it is, asking for it fails the select, so
   a missing column reads as nothing switched off, which is today's behaviour. */
async function recipient(to: string): Promise<{ off: Set<string>; tz: string | null }> {
  const base = `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(to)}&limit=1`;
  let r = await fetch(`${base}&select=timezone,notify_off`, { headers: svc });
  if (!r.ok) r = await fetch(`${base}&select=timezone`, { headers: svc });
  if (!r.ok) return { off: new Set(), tz: null };
  const row = (await r.json())[0] || {};
  const off = Array.isArray(row.notify_off) ? row.notify_off.map((s: unknown) => String(s).toLowerCase()) : [];
  return { off: new Set(off), tz: row.timezone || null };
}

Deno.serve(async (req) => {
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!secretOk(auth, CRON_SECRET)) return json({ error: "forbidden" }, 403);
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: "VAPID keys not configured" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "bad json" }, 400);
  const to = clamp(body.to_email, 254).toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "to_email required" }, 400);

  const who = await recipient(to);
  const d = decideEvent({
    kind: clamp(body.kind, 20),
    fromName: clamp(body.from_name, 60),
    message: clamp(body.message, 140),
    request: body.request === true,
    sessionId: clamp(body.session_id, 64),
    off: who.off,
    localHour: localHour(who.tz),
    nowSec: Date.now() / 1000,
  });
  if (!d.send) return json({ ok: true, sent: 0, reason: d.why });

  const subsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&email=eq.${encodeURIComponent(to)}&failures=lt.5`,
    { headers: svc },
  );
  if (!subsRes.ok) return json({ error: `could not read subscriptions: ${subsRes.status}` }, 500);
  const subs = await subsRes.json();

  let tokens: any[] = [];
  if (apnsConfigured()) {
    const tokRes = await fetch(
      `${SUPABASE_URL}/rest/v1/apns_tokens?select=*&email=eq.${encodeURIComponent(to)}&failures=lt.5`,
      { headers: svc },
    );
    if (tokRes.ok) tokens = await tokRes.json();
  }
  if (!subs.length && !tokens.length) return json({ ok: true, sent: 0, dropped: 0, reason: "no subscription" });

  webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);

  let sent = 0, dropped = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: d.title, body: d.body, url: d.url, subtitle: d.subtitle }),
      );
      sent++;
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${s.id}`, {
        method: "PATCH", headers: svc,
        body: JSON.stringify({ last_ok_at: new Date().toISOString(), failures: 0 }),
      });
    } catch (e: any) {
      const gone = e?.statusCode === 404 || e?.statusCode === 410;
      if (gone) {
        dropped++;
        await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${s.id}`, { method: "DELETE", headers: svc });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${s.id}`, {
          method: "PATCH", headers: svc,
          body: JSON.stringify({ failures: (s.failures ?? 0) + 1 }),
        });
      }
    }
  }

  for (const t of tokens) {
    try {
      const usedEnv = await sendApns(t.token, t.environment, {
        title: d.title, subtitle: d.subtitle, body: d.body, url: d.url,
        category: d.category, threadId: d.threadId,
        interruptionLevel: d.interruptionLevel, expiresAt: d.expiresAt,
      });
      sent++;
      const fixed = usedEnv !== t.environment ? { environment: usedEnv } : {};
      await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, {
        method: "PATCH", headers: svc,
        body: JSON.stringify({ last_ok_at: new Date().toISOString(), failures: 0, ...fixed }),
      });
    } catch (e: any) {
      const gone = e?.status === 410 || e?.reason === "BadDeviceToken" || e?.reason === "Unregistered";
      if (gone) {
        dropped++;
        await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, { method: "DELETE", headers: svc });
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, {
          method: "PATCH", headers: svc,
          body: JSON.stringify({ failures: (t.failures ?? 0) + 1 }),
        });
      }
    }
  }

  return json({ ok: true, sent, dropped });
});
