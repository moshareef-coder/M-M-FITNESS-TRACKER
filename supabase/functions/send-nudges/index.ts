// Sends at most one nudge per person per day, at a sensible hour in their own
// timezone. Invoked hourly by pg_cron; the hour filter is what makes that safe.
//
// Two kinds, deliberately few. A notification people learn to ignore is worse
// than no notification at all.
//   evening  (local 18:00) you have not trained today and your partner has
//   digest   (local 08:00) a coach's summary of who trained yesterday
//
// Safe to call by hand. It will still refuse to send a nudge twice in a day,
// because nudge_log has a unique index doing that job rather than this code.

import webpush from "npm:web-push@3.6.7";

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

async function q(path: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svc });
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

/* The local date and hour for a person, which is the whole point of storing a
   timezone. An unknown or bad zone falls back to UTC rather than throwing and
   taking the entire run down with it. */
function localParts(tz: string | null) {
  try {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
    });
    const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
  } catch {
    const now = new Date();
    return { date: now.toISOString().slice(0, 10), hour: now.getUTCHours() };
  }
}

const shift = (d: string, days: number) =>
  new Date(new Date(`${d}T00:00:00Z`).getTime() + days * 86400_000).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!CRON_SECRET || auth !== CRON_SECRET) return json({ error: "forbidden" }, 403);
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: "VAPID keys not configured" }, 500);

  webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);

  // Small data set, so one pass over everything beats a query per person.
  // Revisit when a single run stops fitting comfortably in memory.
  const [profiles, subs, partnerships, members, groups] = await Promise.all([
    q("profiles?select=email,user_name,timezone"),
    q("push_subscriptions?select=*&failures=lt.5"),
    q("partnerships?select=inviter_email,invitee_email&status=eq.accepted"),
    q("group_members?select=email,role,group_id&left_at=is.null"),
    q("groups?select=id,owner_email,kind&kind=eq.coach"),
  ]);

  const subsFor = new Map<string, any[]>();
  for (const s of subs) {
    const k = (s.email || "").toLowerCase();
    if (!subsFor.has(k)) subsFor.set(k, []);
    subsFor.get(k)!.push(s);
  }

  const partnerOf = new Map<string, string>();
  for (const p of partnerships) {
    const a = (p.inviter_email || "").toLowerCase();
    const b = (p.invitee_email || "").toLowerCase();
    partnerOf.set(a, b);
    partnerOf.set(b, a);
  }

  const nameOf = new Map<string, string>(
    profiles.map((p: any) => [(p.email || "").toLowerCase(), p.user_name || "Your partner"]),
  );

  // Only the dates anyone is actually standing in right now.
  const dates = new Set<string>();
  for (const p of profiles) {
    const { date } = localParts(p.timezone);
    dates.add(date);
    dates.add(shift(date, -1));
  }
  const trained = new Set<string>();
  if (dates.size) {
    const list = [...dates].map((d) => `"${d}"`).join(",");
    const rows = await q(`fit_entries?select=email,entry_date,sessions&entry_date=in.(${list})&sessions=gt.0`);
    for (const r of rows) trained.add(`${(r.email || "").toLowerCase()}|${r.entry_date}`);
  }

  const planned: { email: string; kind: string; title: string; body: string; url: string }[] = [];

  for (const p of profiles) {
    const me = (p.email || "").toLowerCase();
    if (!me || !subsFor.has(me)) continue;
    const { date, hour } = localParts(p.timezone);
    const didTrain = trained.has(`${me}|${date}`);

    if (hour === 18 && !didTrain) {
      const partner = partnerOf.get(me);
      if (partner && trained.has(`${partner}|${date}`)) {
        planned.push({
          email: me, kind: "evening",
          title: `${nameOf.get(partner)} trained today`,
          body: "Your turn. There is still time.",
          url: "/",
        });
      }
    }

    if (hour === 8) {
      const mine = groups.find((g: any) => (g.owner_email || "").toLowerCase() === me);
      if (mine) {
        const roster = members.filter((m: any) =>
          m.group_id === mine.id && (m.email || "").toLowerCase() !== me);
        if (roster.length) {
          const y = shift(date, -1);
          const did = roster.filter((m: any) => trained.has(`${(m.email || "").toLowerCase()}|${y}`)).length;
          planned.push({
            email: me, kind: "digest",
            title: `${did} of ${roster.length} trained yesterday`,
            body: did === roster.length
              ? "Everyone showed up. Worth telling them."
              : `${roster.length - did} to check in on.`,
            url: "/coach/",
          });
        }
      }
    }
  }

  let sent = 0, skipped = 0, dropped = 0;

  for (const n of planned) {
    // Claim the nudge before sending it. The unique index is what guarantees
    // once a day, so a retry or an overlapping run cannot double up.
    const claim = await fetch(`${SUPABASE_URL}/rest/v1/nudge_log`, {
      method: "POST",
      headers: svc,
      body: JSON.stringify({ email: n.email, kind: n.kind }),
    });
    if (!claim.ok) { skipped++; continue; }

    for (const s of subsFor.get(n.email) || []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: n.title, body: n.body, url: n.url }),
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
  }

  return json({ ok: true, considered: planned.length, sent, skipped, dropped });
});
