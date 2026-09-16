// "Mell sent you a video", the moment she sends it, 2026-09-16.
//
// A clip is watched once and then it is gone, and it is sent to somebody who
// is training right now with their phone face down on a bench. Realtime
// already covers the case where the app is in front: watchLiveSessions()
// pushes the row straight into the inbox and the pill appears. This is the
// other case, which is most of them, and without it a clip sat unseen until
// the workout happened to be picked back up. A clip nobody sees in time is
// the same as no clip: by the time they look, the set it was cheering is
// over.
//
// Shaped like notify-live-start and for the same reason: an event, not a
// state, so it is trigger driven rather than waiting for the hourly job.
//
// No permission check here either, and again the trigger firing is the
// permission: live_clips has an INSERT policy that requires the sender to be
// the person they claim and the recipient to be their actual partner, so a
// row existing already proves a pair.

import webpush from "npm:web-push@3.6.7";
import { apnsConfigured, sendApns } from "./apns.ts";

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

/* Free text somebody typed into their profile, landing in a payload with a
   hard size limit. Clamped rather than trusted. */
const clamp = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!secretOk(auth, CRON_SECRET)) return json({ error: "forbidden" }, 403);
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: "VAPID keys not configured" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "bad json" }, 400);
  const to = clamp(body.to_email, 254).toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return json({ error: "to_email required" }, 400);

  /* The sender's name is the whole notification. "Somebody sent you a video"
     is worth nothing to a person deciding whether to pick the phone up mid
     set, so the trigger looks the name up and a fallback only covers a
     profile row that somehow has no name on it. */
  const fromName = clamp(body.from_name, 60) || "Your partner";

  const title = `${fromName} sent you a video`;
  /* Says the thing that makes it urgent. A clip is one watch and then it is
     deleted, so "watch it now" is a fact about the feature, not a growth
     nag. */
  const body_ = "Watch it now, it plays once.";

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
        JSON.stringify({ title, body: body_, url: "/clip" }),
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
        title,
        subtitle: "Live clip",
        body: body_,
        /* Routed rather than dropped on the home tab: the app opens the clip
           itself, because the one thing this notification is for is watching
           it, and making somebody hunt for the pill afterwards wastes the
           only view they get. */
        url: "/clip",
        category: "PARTNER_CLIP",
        /* Same thread as the live notifications, so a partner's "started
           training" and the clips that follow it stack into one conversation
           on the Lock Screen instead of three separate banners. */
        threadId: "partner",
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
