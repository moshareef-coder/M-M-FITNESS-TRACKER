// One push, the moment your partner starts a workout, 2026-09-06.
//
// send-nudges is a batch job: it wakes up once an hour and asks "who needs a
// nudge right now". That is right for "you have not trained and it is
// evening", which is a state, not a moment. "Your partner just started" is a
// moment, and an hour of lag on it defeats the point, so this is event
// driven instead: a trigger on live_sessions fires it the instant a session
// row is actually inserted (not on the heartbeat updates that follow it).
//
// The gate the product asked for -- "only if they have the ability to see
// the workout" -- needs no check here. A live_sessions row can only exist at
// all when its owner's own privacy switch allows it (liveStateNow() in the
// app returns null otherwise), so the trigger firing already proves that.
// What is still conditional is how much the notification says: exercise
// detail only if details_shared, an invitation to cheer only if allow_cheers.
//
// Safe to call by hand with a made up body; it will just fail to find a
// subscription and report zero sent, the same shape send-nudges answers with.

import webpush from "npm:web-push@3.6.7";

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

Deno.serve(async (req) => {
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!CRON_SECRET || auth !== CRON_SECRET) return json({ error: "forbidden" }, 403);
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: "VAPID keys not configured" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const to = String(body.to_email || "").toLowerCase();
  if (!to) return json({ error: "to_email required" }, 400);

  const trainerName = String(body.from_name || "Your partner");
  const detailsShared = !!body.details_shared;
  const allowCheers = !!body.allow_cheers;
  const focus = detailsShared ? String(body.focus || "").trim() : "";
  const exerciseName = detailsShared ? String(body.exercise_name || "").trim() : "";

  const title = focus ? `${trainerName} just started ${focus}` : `${trainerName} just started training`;
  const body_ = exerciseName
    ? `${exerciseName} is up first. ${allowCheers ? "Go cheer them on." : "Go see how it is going."}`
    : (allowCheers ? "Go cheer them on." : "Go see how it is going.");

  const subsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=*&email=eq.${encodeURIComponent(to)}&failures=lt.5`,
    { headers: svc },
  );
  if (!subsRes.ok) return json({ error: `could not read subscriptions: ${subsRes.status}` }, 500);
  const subs = await subsRes.json();
  if (!subs.length) return json({ ok: true, sent: 0, dropped: 0, reason: "no subscription" });

  webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);

  let sent = 0, dropped = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title, body: body_, url: "/" }),
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

  return json({ ok: true, sent, dropped });
});
