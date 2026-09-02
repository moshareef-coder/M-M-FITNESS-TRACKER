// Deno Deploy (Supabase Edge Functions) — generates a daily workout via the Claude API.
// Expects env var ANTHROPIC_API_KEY set as a function secret.

import { calculateTDEE } from "../../../knowledge/formulas/tdee.mjs";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an experienced strength & conditioning coach generating one day's workout for a fitness app.
Ground every decision in mainstream, evidence-based exercise science (progressive overload, appropriate weekly volume per muscle group, RPE-based intensity, periodization and deloads when relevant) rather than any single influencer's branded program. This is the same common ground shared by credible strength coaches and hypertrophy researchers.

Return ONLY valid JSON, no prose, matching this exact shape:
{
  "focus": "short label for today's session, e.g. Push Day",
  "exercises": [
    { "name": "Bench Press", "sets": 4, "reps": 8, "targetWeight": 135, "note": "short cue or why, <=100 chars" }
  ]
}

Personalize using whatever the user provided:
- sex, age, height, current body weight, and activity level shift starting loads and recovery capacity: younger/more active/taller-heavier trainees can typically start heavier and recover faster; older, sedentary, or smaller-framed trainees need more conservative starting loads and slightly more rest emphasis.
- If the stated goal is fat loss, keep rest periods and volume in a range that supports a bit more overall energy expenditure without sacrificing form; if it's muscle gain, bias toward hypertrophy rep ranges (roughly 6-15) and adequate volume per muscle group; if it's general strength, bias toward lower rep ranges (3-6) at higher relative intensity for compound lifts.
- If gym_days_this_week is already high relative to a typical week, avoid hammering the same muscle groups two days in a row within this same request's context; otherwise pick the focus freely.

Rules:
- 4 to 6 exercises.
- targetWeight is in pounds. If the user has a previous best (given in "history"), progressively overload: usually +2.5 to +10 lbs over their last logged weight for that exact exercise name, unless their goal is more about form/cardio/endurance in which case reps/sets matter more than weight jumps.
- If no history exists for an exercise, pick a sensible starting weight informed by the user's stated stats (sex, age, height, weight, activity level) for a trainee at that profile, or use 0 and note "bodyweight" for bodyweight moves.
- Match the requested "focus" area and the user's stated "goal".
- Keep exercise names simple and standard (e.g. "Barbell Squat", "Lat Pulldown", "Plank") so weight history can be tracked across days.
- No markdown, no code fences, no explanation, JSON object only.`;

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
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    let callerEmail = "";
    try {
      const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      callerEmail = (payload.email || "").toLowerCase();
    } catch {
      // fall through to the empty-email rejection below
    }
    if (!callerEmail) {
      return new Response(JSON.stringify({ error: "Not signed in" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Must have a profile in this app. RLS means this only returns the caller's own row.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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

    await fetch(`${SUPABASE_URL}/rest/v1/ai_usage_log`, {
      method: "POST",
      headers: svcHeaders,
      body: JSON.stringify({ email: callerEmail }),
    });

    const body = await req.json();
    const {
      user_name, focus, goal, goal_detail, history,
      sex, age, height_in, activity_level, current_weight, gym_days_this_week,
    } = body;

    const heightStr = height_in ? `${Math.floor(height_in / 12)}'${height_in % 12}"` : "not given";
    const tdee = calculateTDEE({ sex, age, height_in, activity_level, weightLb: current_weight });

    const userMsg = `User: ${user_name}
Sex: ${sex || "not given"}
Age: ${age || "not given"}
Height: ${heightStr}
Current body weight: ${current_weight != null ? current_weight + " lb" : "not given"}
Activity level: ${activity_level || "not given"}
Estimated maintenance calories (TDEE, Mifflin-St Jeor): ${tdee != null ? tdee + " kcal/day" : "not enough data to estimate"}
Gym days already logged this week: ${gym_days_this_week ?? "not given"}
Requested focus today: ${focus || "coach's choice"}
Stated goal: ${goal || "general fitness"}
Goal detail: ${goal_detail || "none given"}
Recent exercise history (most recent last logged weight per exercise, may be empty):
${JSON.stringify(history || [], null, 2)}

Generate today's workout JSON now.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: "Claude API error", detail: errText }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text?.trim() || "";
    const jsonText = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const workout = JSON.parse(jsonText);

    return new Response(JSON.stringify({ workout }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
