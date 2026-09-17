// Receives purchase events from RevenueCat and writes the subscriptions table.
// This is the ONLY writer of that table; the app can only read is_premium().
// A client that could grant itself premium would not have a paywall, it would
// have a suggestion.
//
// RevenueCat calls this on every entitlement change: a purchase, a renewal, a
// cancellation, a billing retry, a refund. The payload always carries the
// app_user_id we set at Purchases.configure() time, which this app sets to the
// signed-in email, so the row can be written by email with no separate mapping
// table.
//
// Verified with a shared secret in the Authorization header, set on both sides:
// here as AUTHORIZATION_HEADER_SECRET, and in RevenueCat's dashboard under
// Project Settings > Integrations > Webhooks > Authorization header.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("REVENUECAT_WEBHOOK_SECRET")!;

const svc = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/* Compared character by character to the end, so a wrong secret cannot be
   narrowed down by timing how quickly it was rejected. Same shape used by
   every other function in this repo that checks a shared secret. */
function secretOk(given: string, expected: string) {
  if (!expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/* RevenueCat's event types that mean "entitlement changed" and the state each
   one implies. Anything not listed here (billing_issue, non_renewing_purchase
   details, etc.) is acknowledged with 200 and ignored, because RevenueCat
   retries a non-2xx response and an event we do not understand yet must never
   become a retry storm. */
const EVENT_STATUS: Record<string, string> = {
  INITIAL_PURCHASE: "active",
  RENEWAL: "active",
  UNCANCELLATION: "active",
  PRODUCT_CHANGE: "active",
  CANCELLATION: "active",     // still entitled until expiration_at_ms passes
  BILLING_ISSUE: "grace",     // Apple retries for up to 16 days; still counted premium
  EXPIRATION: "expired",
  REFUND: "expired",
};

Deno.serve(async (req) => {
  const auth = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!secretOk(auth, WEBHOOK_SECRET)) return json({ error: "forbidden" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const event = body?.event;
  if (!event) return json({ error: "no event" }, 400);

  const type = String(event.type ?? "");
  const status = EVENT_STATUS[type];
  /* Acknowledged rather than rejected. An unrecognised event type is not an
     error on RevenueCat's side, and answering anything but 2xx makes them
     retry it forever. */
  if (!status) return json({ ok: true, ignored: type });

  /* app_user_id is set to the signed-in email at Purchases.configure() time
     (see purchasesPlugin() / startPurchase() in index.html), so no separate
     identity mapping is needed here. Lower-cased because every other email
     comparison in this schema is. */
  const email = String(event.app_user_id ?? "").toLowerCase().trim();
  if (!email || !email.includes("@")) return json({ error: "no usable app_user_id" }, 400);

  const store = String(event.store ?? "").toLowerCase() || null;
  /* Milliseconds since epoch, or absent for a lifetime/promotional grant. */
  const expiresMs = event.expiration_at_ms;
  const expiresAt = typeof expiresMs === "number" ? new Date(expiresMs).toISOString() : null;

  const row = {
    email,
    rc_app_user_id: String(event.original_app_user_id ?? event.app_user_id ?? email),
    entitlement: "premium",
    status,
    expires_at: expiresAt,
    store,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=email`, {
    method: "POST",
    headers: { ...svc, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("could not upsert subscription", res.status, text);
    return json({ error: "db write failed" }, 500);
  }

  return json({ ok: true, email, status });
});
