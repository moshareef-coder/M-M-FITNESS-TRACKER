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

/* Answers whether the rows are actually gone, which used to be assumed.
   PostgREST does not throw on a failed delete, it answers with a status, so a
   function that ignored the status reported ok after failing every one of its
   twenty five calls. "ok" has to mean the data is gone, because the privacy
   policy and Apple were both told that it does. 404 counts as success: nothing
   there is the state we were asking for. */
async function del(path: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "DELETE",
    headers: svc,
  });
  if (!res.ok && res.status !== 404) {
    console.error("delete failed", path, res.status, await res.text());
    return false;
  }
  return true;
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

  /* 1. Stored images: proof photos, progress photos and the avatar all live
     under {email}/ in workout-proof. The list API matches on a folder
     boundary rather than a string prefix, so a@b.co cannot reach a@b.com's
     folder; that is the property this whole step rests on.

     Paged rather than capped. A single limit of 1000 stopped silently at
     1001 files, and silently is the problem: the rows that index those files
     are deleted a few lines below, and once they are gone nothing can find
     the leftovers to try again. */
  const PAGE = 1000;
  async function listAll(prefix: string): Promise<Array<{ id: string | null; name: string }>> {
    const out: Array<{ id: string | null; name: string }> = [];
    for (let offset = 0; ; offset += PAGE) {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/workout-proof`, {
        method: "POST",
        headers: svc,
        body: JSON.stringify({ prefix, limit: PAGE, offset }),
      });
      if (!res.ok) throw new Error(`list ${prefix} failed: ${res.status} ${await res.text()}`);
      const page = (await res.json()) ?? [];
      out.push(...page);
      if (page.length < PAGE) return out;
    }
  }

  try {
    const names: string[] = [];
    for (const f of await listAll(email)) {
      if (f.id) names.push(`${email}/${f.name}`);
      else {
        // A folder such as {email}/body or {email}/avatar: one level deeper.
        for (const g of await listAll(`${email}/${f.name}`)) {
          if (g.id) names.push(`${email}/${f.name}/${g.name}`);
        }
      }
    }
    if (names.length) {
      const rm = await fetch(`${SUPABASE_URL}/storage/v1/object/workout-proof`, {
        method: "DELETE",
        headers: svc,
        body: JSON.stringify({ prefixes: names }),
      });
      if (!rm.ok) throw new Error(`remove failed: ${rm.status} ${await rm.text()}`);
    }
  } catch (e) {
    /* Stop here, before a single row is deleted. body_photos.path and
       fit_entries.proof_path are the only index into these files: delete
       those rows after a failed sweep and the photographs survive in a
       bucket with nothing pointing at them, which is the opposite of what
       the person asked for and of what privacy.html promises. Nothing has
       been destroyed at this point, so the honest answer is to fail and let
       them try again. */
    console.error("storage cleanup failed, nothing deleted", e);
    return json({ error: "Could not delete your photos, so nothing was deleted. Please try again." }, 500);
  }

  /* 1b. Live clips, which are video of this person and are keyed by a stored
     path rather than by a folder we could list. Files first, then the rows,
     so a storage failure leaves the rows for expire-clips to retry rather
     than orphaning objects nobody can find. Clips sent TO them are deleted
     too: the recipient's copy is still footage of the person leaving. */
  try {
    /* The or=() group is safe because GoTrue rejects an email containing a
       parenthesis or a comma, which are the only characters that could close
       this group early; encodeURIComponent leaves them alone. If email
       validation upstream ever loosens, this line needs a stricter encoder. */
    const clipsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/live_clips?select=path&or=(from_email.eq.${enc},to_email.eq.${enc})&limit=1000`,
      { headers: svc },
    );
    if (!clipsRes.ok) throw new Error(`clip list failed: ${clipsRes.status} ${await clipsRes.text()}`);
    const clips: Array<{ path: string }> = await clipsRes.json();
    const paths = (clips ?? []).map((c) => c.path).filter(Boolean);
    if (paths.length) {
      const rm = await fetch(`${SUPABASE_URL}/storage/v1/object/live-clips`, {
        method: "DELETE",
        headers: svc,
        body: JSON.stringify({ prefixes: paths }),
      });
      if (!rm.ok) throw new Error(`clip remove failed: ${rm.status} ${await rm.text()}`);
    }
  } catch (e) {
    /* The comment that used to sit here said a storage failure leaves the
       rows for expire-clips to retry. It did not: the two row deletes below
       ran unconditionally straight after this catch, so the rows went and the
       video did not, and live_clips.path was the only thing that knew where
       the file was. Both file sweeps now finish before any row is deleted, so
       failing here means nothing has been destroyed yet. */
    console.error("clip cleanup failed, nothing deleted", e);
    return json({ error: "Could not delete your clips, so nothing was deleted. Please try again." }, 500);
  }

  /* Every file is gone by this point. From here on it is rows, and a failure
     is collected rather than thrown so one bad table cannot strand the rest
     half deleted; the tally is checked before the auth user is removed. */
  const failed: string[] = [];
  const drop = async (path: string, label: string) => {
    if (!(await del(path))) failed.push(label);
  };

  await drop(`live_clips?from_email=eq.${enc}`, "live_clips");
  await drop(`live_clips?to_email=eq.${enc}`, "live_clips");

  // 2. Rows keyed by this user.
  for (const [table, col] of BY_EMAIL) {
    await drop(`${table}?${col}=eq.${enc}`, table);
  }

  /* 2b. Groups they own. Their membership row went with group_members above,
     but owner_email is their address and it was staying behind in a row
     nobody could then administer: every management policy runs through
     i_own_group(), which no living account would satisfy. A permanent zombie
     holding a deleted person's email.

     group_members.group_id is ON DELETE CASCADE, so this also ends the
     membership of everyone else in that group. For a coach's roster that is
     the honest outcome, the practice is gone with them, and for a pair group
     it matches the partnership delete just below. Stated here because a
     cascade this wide should be a decision somebody made on purpose rather
     than something the schema did quietly. */
  await drop(`groups?owner_email=eq.${enc}`, "groups");

  // 3. Encouragements and reactions in either direction.
  await drop(`encouragements?from_email=eq.${enc}`, "encouragements");
  await drop(`encouragements?to_email=eq.${enc}`, "encouragements");
  await drop(`session_reactions?from_email=eq.${enc}`, "session_reactions");
  await drop(`session_reactions?to_email=eq.${enc}`, "session_reactions");

  // 4. Partnerships on either side. This unpairs the partner rather than
  //    leaving them pointing at an account that no longer exists.
  await drop(`partnerships?inviter_email=eq.${enc}`, "partnerships");
  await drop(`partnerships?invitee_email=eq.${enc}`, "partnerships");

  // 5. The profile row.
  await drop(`profiles?email=eq.${enc}`, "profiles");

  /* 5b. Anything that did not actually delete stops this here, with the auth
     user deliberately left alive. Signing back in to a half empty account and
     pressing delete again is a worse experience than a clean error, but it is
     a recoverable one, and it is the only shape that keeps the retry working:
     remove the account first and whatever survived is orphaned for good. */
  if (failed.length) {
    console.error("delete incomplete", [...new Set(failed)]);
    return json({
      error: "Most of your data was deleted, but some of it could not be. Your account is still here so you can try again, and it will pick up where this left off.",
    }, 500);
  }

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
