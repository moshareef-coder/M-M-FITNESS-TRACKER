// Deletes live clips the app never got to clean up itself.
//
// A clip is meant to die the moment it is watched, or when the workout it was
// sent into ends. Both of those happen on the recipient's phone, so both fail
// the same way: the app is killed, the phone dies, the tab is closed. This is
// the backstop, and it is deliberately aggressive. Two hours is far longer than
// any workout and far shorter than "kept".
//
// Invoked every 15 minutes by pg_cron. Also safe to call by hand.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const CLIP_TTL_MINUTES = 120;

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

Deno.serve(async (req) => {
  // Destructive, so it runs only for the scheduler's shared secret.
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!secretOk(auth, CRON_SECRET)) return json({ error: "forbidden" }, 403);

  const cutoff = new Date(Date.now() - CLIP_TTL_MINUTES * 60_000).toISOString();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/live_clips?select=id,path&created_at=lt.${cutoff}&limit=500`,
    { headers: svc },
  );
  // Database wording stays in the function log; the caller gets the shape only.
  if (!res.ok) {
    console.error("could not list clips", res.status, await res.text());
    return json({ error: "could not list" }, 500);
  }

  const rows: Array<{ id: string; path: string }> = await res.json();
  if (!rows.length) return json({ ok: true, expired: 0, cutoff });

  // Files first, same as expire-proofs: a failure here leaves the rows behind
  // so the next run retries, rather than orphaning objects nobody can find.
  const del = await fetch(`${SUPABASE_URL}/storage/v1/object/live-clips`, {
    method: "DELETE",
    headers: svc,
    body: JSON.stringify({ prefixes: rows.map((r) => r.path) }),
  });
  if (!del.ok) {
    console.error("clip storage delete failed", del.status, await del.text());
    return json({ error: "storage delete failed" }, 500);
  }

  const ids = rows.map((r) => `"${r.id}"`).join(",");
  const drop = await fetch(`${SUPABASE_URL}/rest/v1/live_clips?id=in.(${ids})`, {
    method: "DELETE",
    headers: svc,
  });
  if (!drop.ok) {
    console.error("clip row delete failed", drop.status, await drop.text());
    return json({ error: "row delete failed" }, 500);
  }

  return json({ ok: true, expired: rows.length, cutoff });
});
