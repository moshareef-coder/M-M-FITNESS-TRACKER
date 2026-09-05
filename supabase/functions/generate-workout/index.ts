// Deno Deploy (Supabase Edge Functions) — generates a daily workout via the Claude API.
// Expects env var ANTHROPIC_API_KEY set as a function secret.
//
// calculateTDEE below is inlined from knowledge/formulas/tdee.mjs (Mifflin-St Jeor,
// see knowledge/sources.md) rather than imported, because this function is deployed
// via the Management API with only this file's contents — a relative import here
// would resolve against a bundle that was never actually uploaded. Keep this copy in
// sync if the source in knowledge/formulas/tdee.mjs changes.

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  "Sedentary": 1.2,
  "Moderate": 1.55,
  "Active": 1.725,
};
function calculateBMR({ sex, age, height_in, weightLb }: { sex?: string; age?: number; height_in?: number; weightLb?: number }) {
  if (!age || !height_in || !weightLb) return null;
  const kg = weightLb * LB_TO_KG;
  const cm = height_in * IN_TO_CM;
  const base = 10 * kg + 6.25 * cm - 5 * age;
  if (sex === "Male") return Math.round(base + 5);
  if (sex === "Female") return Math.round(base - 161);
  return Math.round(base - 78); // midpoint of +5 / -161
}
function calculateTDEE(profile: { sex?: string; age?: number; height_in?: number; weightLb?: number; activity_level?: string }) {
  const bmr = calculateBMR(profile);
  if (bmr == null) return null;
  const multiplier = ACTIVITY_MULTIPLIERS[profile.activity_level ?? ""] ?? ACTIVITY_MULTIPLIERS["Moderate"];
  return Math.round(bmr * multiplier);
}

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are an experienced strength & conditioning coach generating one day's workout for a fitness app.
Ground every decision in mainstream, evidence-based exercise science rather than any single influencer's branded program. This is the same common ground shared by credible strength coaches and hypertrophy researchers. The rules below are a condensed version of the app's own knowledge base (knowledge/principles/*.md in the repo) — treat them as your training philosophy, not just formatting instructions.

TRAINING PRINCIPLES:
1. Progressive overload — compare against "history" (their last logged weight per exercise). If they hit their planned reps last time, add load (2.5-10lb depending on the lift: small joints/isolation get the smaller end, squat/deadlift/bench can take the larger end). If they missed reps last time, hold the same weight — don't push load on a lift they just failed. Never move load, reps, AND sets all at once; pick one lever.
2. Weekly volume landmarks (hard sets per muscle group per week) — roughly: chest 8-20, back 10-22, shoulders 8-20, quads 8-18, hamstrings/glutes 6-16, biceps/triceps 6-18, calves 8-18, abs 8-16. A trainee training 2-3 days/week or newer to lifting should sit at the low-to-mid end; someone training hard 4-6 days/week with real history can run mid-to-high end. Never program at the top of these ranges every single week — treat sustained high volume as a signal a deload is coming, not a new baseline.
3. RPE targets by goal (effort, not just a rep number) — hypertrophy/muscle gain: RPE 7-9 (leave 1-3 reps in the tank on most sets, don't grind every set to failure). Strength: RPE 6-8 on volume work, occasional harder singles/doubles but not every session. General fitness/fat loss: RPE 6-8 is enough. Anyone new to lifting (little/no history logged): cap around RPE 7-8, they can't yet judge true failure safely.
4. Deload/backoff signal — if "history" shows the same lift stalling (repeated misses or no progress across recent entries) or gym_days_this_week is unusually high, that is a cue to program a lighter, lower-volume day now rather than another overload push. One tough session after a rest day is normal and needs no adjustment; a sustained pattern across several sessions does.

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
- The user's estimated TDEE (maintenance calories) is computed for you with the Mifflin-St Jeor equation, not guessed — treat it as ground truth for reasoning about energy balance, but do not invent a specific calorie-burn number for the session itself; that is computed separately by the app, not by you.
- If gym_days_this_week is already high relative to a typical week, avoid hammering the same muscle groups two days in a row within this same request's context; otherwise pick the focus freely.

Rules:
- 4 to 6 exercises.
- targetWeight is in pounds. Apply TRAINING PRINCIPLE 1 (progressive overload) using "history", unless their goal is more about form/cardio/endurance in which case reps/sets matter more than weight jumps.
- If no history exists for an exercise, pick a sensible starting weight informed by the user's stated stats (sex, age, height, weight, activity level) for a trainee at that profile and TRAINING PRINCIPLE 3's RPE target for their goal, or use 0 and note "bodyweight" for bodyweight moves.
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

    /* The usage row used to be written here, before the model was even
       called. That meant every failure still cost a slot: a bad response, a
       Claude outage, or a client that could not save what came back all
       burned quota and produced nothing. One real case of that emptied an
       account's whole daily allowance in half an hour. It is written at the
       end now, once there is a workout to hand back. */
    const logUsage = () => fetch(`${SUPABASE_URL}/rest/v1/ai_usage_log`, {
      method: "POST",
      headers: svcHeaders,
      body: JSON.stringify({ email: callerEmail }),
    }).catch((e) => console.error("could not log usage", e));

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
        max_tokens: 2048,
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
    // The model is asked for pure JSON, but strip fences and any stray
    // leading/trailing prose defensively rather than trusting that exactly —
    // a truncated response or an extra sentence around the JSON is a real
    // failure mode, not a hypothetical one.
    let jsonText = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
    const first = jsonText.indexOf("{");
    const last = jsonText.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) jsonText = jsonText.slice(first, last + 1);

    let workout;
    try {
      workout = JSON.parse(jsonText);
    } catch (parseErr) {
      // Keep a snippet of the raw text so a future failure is diagnosable
      // from the client error instead of a bare "Unexpected token" message.
      return new Response(JSON.stringify({
        error: "Coach's response wasn't valid JSON — try again",
        detail: String(parseErr),
        raw: text.slice(0, 400),
        stopReason: data.stop_reason,
      }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    await logUsage();
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
