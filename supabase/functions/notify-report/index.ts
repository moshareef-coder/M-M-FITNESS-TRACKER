// Tells the person who has to answer a report that one has arrived, 2026-09-16.
//
// The app now prints "we look at every report within a day" to users, and App
// Store Review Guideline 1.2 expects that to be true. Until this existed,
// reports landed in a table nobody was watching, which is worse than having no
// report button at all: a promise with nothing behind it.
//
// Push first, email second, and that order is deliberate. Email needs an
// account and a verified domain before it can send a single message; the APNs
// path is already carrying nudges to the same phone today and needs nothing
// new. So the alert works from the moment this is deployed, and the email
// starts working on its own the day RESEND_API_KEY is set, without this
// function changing.
//
// Neither is where a report gets HANDLED. That is the queue in the admin page,
// which survives a dismissed banner and a deleted email. This is only the tap
// on the shoulder.

import { apnsConfigured, sendApns } from "./apns.ts";

const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
// Optional. Absent means push only, and the function says so rather than
// failing, because a missing email key must never cost somebody the alert.
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "";

const svc = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function secretOk(given: string, expected: string) {
  if (!expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

const clamp = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/* Reason codes are what the app stores; these are what a person reads at
   seven in the morning without the app open. */
const REASON_WORDS: Record<string, string> = {
  sexual: "Nudity or sexual content",
  abuse: "Harassment or abuse",
  violence: "Violence or threats",
  other: "Something else",
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

Deno.serve(async (req) => {
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!secretOk(auth, CRON_SECRET)) return json({ error: "forbidden" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!body || typeof body !== "object") return json({ error: "bad json" }, 400);

  const reportId = clamp(body.report_id, 64);
  const kind = clamp(body.kind, 24) || "clip";
  const reason = clamp(body.reason, 24);
  const reporter = clamp(body.reporter_email, 254).toLowerCase();
  const subject = clamp(body.subject_email, 254).toLowerCase();
  const evidence = clamp(body.evidence_path, 400);
  const reasonWords = REASON_WORDS[reason] ?? reason ?? "Unspecified";

  /* Who answers reports. A table rather than a literal in here, so adding a
     second person later is a row and not a redeploy of a function that also
     sends push. */
  const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_admins?select=email`, { headers: svc });
  if (!adminRes.ok) return json({ error: `could not read admins: ${adminRes.status}` }, 500);
  const admins: Array<{ email: string }> = await adminRes.json();
  if (!admins.length) {
    /* Loud rather than quiet. Nobody being on the list is exactly the state
       where a report sits unanswered for a week, so it is logged as an error
       and reported back, not shrugged off as "nothing to do". */
    console.error("a report arrived and platform_admins is empty");
    return json({ ok: true, sent: 0, reason: "no admins configured" });
  }

  const title = `Report: ${reasonWords}`;
  const line = `${reporter || "someone"} reported a ${kind} from ${subject || "someone"}.`;

  let pushed = 0;
  if (apnsConfigured()) {
    for (const a of admins) {
      const tokRes = await fetch(
        `${SUPABASE_URL}/rest/v1/apns_tokens?select=*&email=eq.${encodeURIComponent(a.email.toLowerCase())}&failures=lt.5`,
        { headers: svc },
      );
      if (!tokRes.ok) continue;
      const tokens = await tokRes.json();
      for (const t of tokens) {
        try {
          const usedEnv = await sendApns(t.token, t.environment, {
            title,
            subtitle: "Needs an answer today",
            body: line,
            /* Straight to the queue. The banner is the alert and the queue is
               where it gets handled, so the tap should not land anywhere that
               still requires hunting. */
            url: "/admin/reports",
            category: "CONTENT_REPORT",
            threadId: "reports",
          });
          pushed++;
          /* The same bookkeeping every other sender does, and it was missing
             here. Three consequences, all of them quiet: a token minted by the
             other gateway was never repaired, so every send paid a failed
             round trip first; a dead token was never pruned, so it would be
             retried for ever; and last_ok_at stayed null, so nothing recorded
             that a moderation alert had ever actually been delivered. That
             last one matters most, because this is the notification standing
             behind an App Store commitment. */
          const fixed = usedEnv !== t.environment ? { environment: usedEnv } : {};
          await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, {
            method: "PATCH", headers: svc,
            body: JSON.stringify({ last_ok_at: new Date().toISOString(), failures: 0, ...fixed }),
          });
        } catch (e: any) {
          console.error("report push failed", e);
          const gone = e?.status === 410 || e?.reason === "BadDeviceToken" || e?.reason === "Unregistered";
          if (gone) {
            await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, { method: "DELETE", headers: svc });
          } else {
            await fetch(`${SUPABASE_URL}/rest/v1/apns_tokens?id=eq.${t.id}`, {
              method: "PATCH", headers: svc,
              body: JSON.stringify({ failures: (t.failures ?? 0) + 1 }),
            });
          }
        }
      }
    }
  }

  let emailed = 0;
  if (RESEND_KEY && RESEND_FROM) {
    const html = `
      <p><strong>${escapeHtml(reasonWords)}</strong></p>
      <p>${escapeHtml(line)}</p>
      <ul>
        <li>Report: <code>${escapeHtml(reportId)}</code></li>
        <li>Reporter: ${escapeHtml(reporter)}</li>
        <li>Reported: ${escapeHtml(subject)}</li>
        <li>File: <code>${escapeHtml(evidence || "none")}</code></li>
      </ul>
      <p>The clip is held and will not expire until this is handled.
      Open Setup, Admin, Reports in the app to close it.</p>`;
    for (const a of admins) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: RESEND_FROM, to: a.email, subject: title, html }),
        });
        if (r.ok) emailed++;
        else console.error("resend rejected the report email", r.status, await r.text());
      } catch (e) {
        console.error("report email failed", e);
      }
    }
  }

  return json({ ok: true, pushed, emailed, email_configured: Boolean(RESEND_KEY && RESEND_FROM) });
});
