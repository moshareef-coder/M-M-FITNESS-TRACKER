// Deletes workout proof photos older than PROOF_TTL_DAYS and clears their paths.
// Proof photos exist to prove you turned up that day; they are not a keepsake.
// Progress photos in body_photos are deliberately NOT touched, because those are
// the ones people keep to see change over months.
//
// Invoked daily by pg_cron. Also safe to call by hand.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET")!;
const PROOF_TTL_DAYS = 30;

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

  const cutoff = new Date(Date.now() - PROOF_TTL_DAYS * 86400_000).toISOString().slice(0, 10);

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/fit_entries?select=id,proof_path&proof_path=not.is.null&entry_date=lt.${cutoff}&limit=500`,
    { headers: svc },
  );
  // Database wording stays in the function log; the caller gets the shape only.
  if (!res.ok) {
    console.error("could not list proofs", res.status, await res.text());
    return json({ error: "could not list" }, 500);
  }

  const rows: Array<{ id: string; proof_path: string }> = await res.json();
  if (!rows.length) return json({ ok: true, expired: 0, cutoff });

  // Remove the files first. If this fails we keep the paths so it can retry,
  // rather than orphaning objects nobody can find any more.
  const paths = rows.map((r) => r.proof_path);
  const del = await fetch(`${SUPABASE_URL}/storage/v1/object/workout-proof`, {
    method: "DELETE",
    headers: svc,
    body: JSON.stringify({ prefixes: paths }),
  });
  if (!del.ok) {
    console.error("proof storage delete failed", del.status, await del.text());
    return json({ error: "storage delete failed" }, 500);
  }

  let cleared = 0;
  for (const r of rows) {
    const p = await fetch(`${SUPABASE_URL}/rest/v1/fit_entries?id=eq.${r.id}`, {
      method: "PATCH",
      headers: svc,
      body: JSON.stringify({ proof_path: null }),
    });
    if (p.ok) cleared++;
  }

  return json({ ok: true, expired: cleared, of: rows.length, cutoff });
});
