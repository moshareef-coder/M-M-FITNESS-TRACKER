// Permanently deletes the calling user's account and all of their data.
// Required by App Store Review Guideline 5.1.1(v): an app that lets you create
// an account must let you delete it from inside the app.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const svc = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/* Tables keyed by a single email-ish column. A table that does not exist on a
   given project answers 404 and del() ignores that, so listing one that was
   added later is safe. Everything the app writes has to be here: a row left
   behind is data Apple was told would be gone. */
const BY_EMAIL: Array<[string, string]> = [
  ["ai_usage_log", "email"],
  ["ai_workouts", "email"],
  ["body_photos", "email"],
  ["challenge_completions", "email"],
  ["exercise_logs", "email"],
  ["fit_entries", "email"],
  ["season_results", "email"],
  ["arcs", "created_by"],
  ["weekly_stakes", "created_by"],
  ["allowed_emails", "email"],
  ["exercise_swaps", "email"],
  ["saved_workouts", "email"],
  ["user_goals", "email"],
  ["milestone_badges", "email"],
  ["nudge_log", "email"],
  /* Left behind, this one keeps pushing notifications to a phone whose
     account no longer exists. */
  ["push_subscriptions", "email"],
  ["live_sessions", "email"],
  ["group_members", "email"],
];

async function del(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "DELETE",
    headers: svc,
  });
  if (!res.ok && res.status !== 404) {
    console.error("delete failed", path, res.status, await res.text());
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Identify the caller from their own JWT. Never trust an email in the body.
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return json({ error: "Not signed in" }, 401);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json({ error: "Not signed in" }, 401);

  const user = await userRes.json();
  const email = (user?.email ?? "").toLowerCase();
  const userId = user?.id;
  if (!email || !userId) return json({ error: "Not signed in" }, 401);

  const enc = encodeURIComponent(email);

  // 1. Remove stored images: workout proof and progress photos live under {email}/.
  try {
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/workout-proof`, {
      method: "POST",
      headers: svc,
      body: JSON.stringify({ prefix: email, limit: 1000 }),
    });
    if (listRes.ok) {
      const top = await listRes.json();
      const names: string[] = [];
      for (const f of top ?? []) {
        if (f.id) names.push(`${email}/${f.name}`);
        else {
          // A folder such as {email}/body: list one level deeper.
          const sub = await fetch(`${SUPABASE_URL}/storage/v1/object/list/workout-proof`, {
            method: "POST",
            headers: svc,
            body: JSON.stringify({ prefix: `${email}/${f.name}`, limit: 1000 }),
          });
          if (sub.ok) {
            for (const g of (await sub.json()) ?? []) {
              if (g.id) names.push(`${email}/${f.name}/${g.name}`);
            }
          }
        }
      }
      if (names.length) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/workout-proof`, {
          method: "DELETE",
          headers: svc,
          body: JSON.stringify({ prefixes: names }),
        });
      }
    }
  } catch (e) {
    console.error("storage cleanup failed", e);
  }

  /* 1b. Live clips, which are video of this person and are keyed by a stored
     path rather than by a folder we could list. Files first, then the rows,
     so a storage failure leaves the rows for expire-clips to retry rather
     than orphaning objects nobody can find. Clips sent TO them are deleted
     too: the recipient's copy is still footage of the person leaving. */
  try {
    const clipsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/live_clips?select=path&or=(from_email.eq.${enc},to_email.eq.${enc})&limit=1000`,
      { headers: svc },
    );
    if (clipsRes.ok) {
      const clips: Array<{ path: string }> = await clipsRes.json();
      const paths = (clips ?? []).map((c) => c.path).filter(Boolean);
      if (paths.length) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/live-clips`, {
          method: "DELETE",
          headers: svc,
          body: JSON.stringify({ prefixes: paths }),
        });
      }
    }
  } catch (e) {
    console.error("clip cleanup failed", e);
  }
  await del(`live_clips?from_email=eq.${enc}`);
  await del(`live_clips?to_email=eq.${enc}`);

  // 2. Rows keyed by this user.
  for (const [table, col] of BY_EMAIL) {
    await del(`${table}?${col}=eq.${enc}`);
  }

  // 3. Encouragements and reactions in either direction.
  await del(`encouragements?from_email=eq.${enc}`);
  await del(`encouragements?to_email=eq.${enc}`);
  await del(`session_reactions?from_email=eq.${enc}`);
  await del(`session_reactions?to_email=eq.${enc}`);

  // 4. Partnerships on either side. This unpairs the partner rather than
  //    leaving them pointing at an account that no longer exists.
  await del(`partnerships?inviter_email=eq.${enc}`);
  await del(`partnerships?invitee_email=eq.${enc}`);

  // 5. The profile row.
  await del(`profiles?email=eq.${enc}`);

  // 6. Finally the auth user itself. Without this the account still exists.
  const authDel = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: svc,
  });
  if (!authDel.ok) {
    const detail = await authDel.text();
    console.error("auth user delete failed", authDel.status, detail);
    return json({ error: "Could not fully delete the account. Please contact support." }, 500);
  }

  return json({ ok: true, deleted: email });
});
