// Deno Deploy (Supabase Edge Functions) generates one day's workout.
//
// One engine: mo-knowledge/engine/ builds the week and adapter.mjs returns
// one day of it. Deterministic, no network call, no API key, zero cost per
// workout. Answers { workout, honest, meta }; the app reads data.workout and
// ignores the rest.
//
// This used to have a second path that called claude-sonnet-5 for the plan,
// kept for one release as a fallback while the local engine was new. It is
// gone now: the fallback was an escape hatch that could put a person's body
// metrics and training history on a third-party API by flipping a Supabase
// secret with no code change and no deploy, which made "generated locally,
// nothing sent externally" in privacy.html a claim about the current
// configuration rather than something the code guarantees. Removing the path
// and the ANTHROPIC_API_KEY secret makes it true by construction. If a model
// path is ever wanted again, it should be a new, deliberate decision, not a
// dormant secret from a previous release.
//
// The engine is VENDORED into ./_engine and ./_library by
// scripts/vendor-engine.mjs so this function stays self contained and
// deploys with scripts/deploy-function.sh, which uploads every file in this
// directory. Edit mo-knowledge/engine/, never _engine/.

// @ts-ignore untyped .mjs, same as the rest of mo-knowledge/
import { generateFromPayload } from "./_engine/adapter.mjs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* Nothing in the payload is trusted. The engine walks `logs` row by row and
   matches three hundred aliases against the free text, so an unbounded body is
   CPU and memory the caller chose on our behalf, fifteen times a day. The caps
   below are far above anything the app itself sends: the client trims logs to
   ninety days and plans to thirty. */
const MAX_BODY_BYTES = 512 * 1024;
const MAX_ROWS = 2000;
const MAX_TEXT = 200;
const TEXT_FIELDS = [
  "focus", "goal", "goal_detail", "goal_bubble", "goal_child",
  "activity_level", "sex", "focus_chosen_at",
];
/* Dropped before anything reads the payload. The client no longer sends
   these, but a phone running a service-worker-cached older build still
   will for as long as that copy lives, and none of it is a field the
   engine or its logs have any use for. Strip rather than trust the caller. */
const IDENTIFYING_FIELDS = ["user_name", "name", "email", "user_email", "partner_name"];
const ROW_FIELDS = ["history", "logs", "plans", "swaps", "focus_groups"];
/* [min, max] for the numbers that reach a formula. Out of range is dropped
   rather than clamped: a height of 900 inches is not a tall person, it is
   somebody probing, and the engine already has an answer for "not given". */
const NUMBER_FIELDS: Record<string, [number, number]> = {
  age: [10, 120],
  height_in: [20, 108],
  current_weight: [40, 1500],
  gym_days_this_week: [0, 14],
  challenge_target: [0, 14],
};

function boundPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, any> = { ...(raw as Record<string, any>) };
  for (const k of IDENTIFYING_FIELDS) delete out[k];
  for (const k of TEXT_FIELDS) {
    if (out[k] != null) out[k] = String(out[k]).slice(0, MAX_TEXT);
  }
  for (const k of ROW_FIELDS) {
    if (out[k] == null) continue;
    out[k] = Array.isArray(out[k]) ? out[k].slice(0, MAX_ROWS) : [];
  }
  for (const [k, [lo, hi]] of Object.entries(NUMBER_FIELDS)) {
    if (out[k] == null) continue;
    const n = Number(out[k]);
    out[k] = Number.isFinite(n) && n >= lo && n <= hi ? n : null;
  }
  return out;
}

/* The engine path. Everything it needs is in the payload, so there is no
   network call and nothing to time out. `honest` and `meta` ride along for
   the UI to start showing; the app reads `workout` and ignores the rest. */
function generateLocally(payload: any): { workout: any; honest: string | null; meta: any } {
  return generateFromPayload(payload);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    /* The email is asked of the auth server rather than read out of the token
       body. Decoding the middle segment of a JWT reads a claim nobody checked
       the signature on, and everything below (the quota, the usage row) is
       keyed on this string. */
    let callerEmail = "";
    if (token) {
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${token}` },
      });
      if (userRes.ok) {
        const user = await userRes.json();
        callerEmail = String(user?.email ?? "").toLowerCase();
      }
    }
    if (!callerEmail) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Must have a profile in this app. RLS means this only returns the caller's own row.
    const profileResp = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=email&email=eq.${encodeURIComponent(callerEmail)}`,
      { headers: { apikey: SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}` } },
    );
    const profileRows = await profileResp.json();
    if (!Array.isArray(profileRows) || profileRows.length === 0) {
      return new Response(JSON.stringify({ error: "No profile for this account" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    /* Rate limit. Counted and written with the service role so a client
       cannot read, forge or clear its own quota. */
    const DAILY_LIMIT = 15;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const svcHeaders = {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    };

    const usageResp = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_usage_log?select=id&email=eq.${encodeURIComponent(callerEmail)}&created_at=gte.${encodeURIComponent(since)}`,
      { headers: { ...svcHeaders, Prefer: "count=exact" } },
    );
    const usedRows = await usageResp.json();
    const used = Array.isArray(usedRows) ? usedRows.length : 0;

    if (used >= DAILY_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Daily limit reached (${DAILY_LIMIT} workouts). Try again tomorrow.` }),
        { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    /* The usage row used to be written before generation ran. That meant
       every failure still cost a slot: a bad response or a client that
       could not save what came back burned quota and produced nothing. One
       real case of that emptied an account's whole daily allowance in half
       an hour. Written at the end now, once there is a workout to hand back. */
    const logUsage = () => fetch(`${SUPABASE_URL}/rest/v1/ai_usage_log`, {
      method: "POST",
      headers: svcHeaders,
      body: JSON.stringify({ email: callerEmail }),
    }).catch((e) => console.error("could not log usage", e));

    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "That request was too large." }), {
        status: 413,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "That request was too large." }), {
        status: 413,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    let body: Record<string, unknown>;
    try {
      body = boundPayload(JSON.parse(rawBody));
    } catch {
      return new Response(JSON.stringify({ error: "Could not read that request." }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let result;
    try {
      result = generateLocally(body);
    } catch (engineErr) {
      /* The app prints data.error, so the engine's own "failed at <step>"
         string is worth more here than a stack it will never show. */
      console.error("workout engine failed", engineErr);
      return new Response(
        JSON.stringify({ error: "Workout engine failed. Please try again." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    await logUsage();
    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    /* The real reason stays in the function log. It used to be returned
       verbatim, and the app prints data.error straight onto the screen, so any
       internal wording (a URL, a table name, a key that failed to read) was
       shown to whoever asked for it. */
    console.error("generate-workout failed", err);
    return new Response(JSON.stringify({ error: "Could not generate a workout. Please try again." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
