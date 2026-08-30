// Deno Deploy (Supabase Edge Functions) — generates a daily workout via the Claude API.
// Expects env var ANTHROPIC_API_KEY set as a function secret.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a strength coach generating one day's workout for a home/gym fitness app.
Return ONLY valid JSON, no prose, matching this exact shape:
{
  "focus": "short label for today's session, e.g. Push Day",
  "exercises": [
    { "name": "Bench Press", "sets": 4, "reps": 8, "targetWeight": 135, "note": "short cue or why, <=100 chars" }
  ]
}
Rules:
- 4 to 6 exercises.
- targetWeight is in pounds. If the user has a previous best (given in "history"), progressively overload: usually +2.5 to +10 lbs over their last logged weight for that exact exercise name, unless their goal is more about form/cardio/endurance in which case reps/sets matter more than weight jumps.
- If no history exists for an exercise, pick a sensible conservative starting weight for a general adult trainee, or use 0 and note "bodyweight" for bodyweight moves.
- Match the requested "focus" area and the user's stated "goal".
- Keep exercise names simple and standard (e.g. "Barbell Squat", "Lat Pulldown", "Plank") so weight history can be tracked across days.
- No markdown, no code fences, no explanation — JSON object only.`;

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const allowResp = await fetch(
      `${SUPABASE_URL}/rest/v1/allowed_emails?select=email&email=eq.${encodeURIComponent(callerEmail)}`,
      { headers: { apikey: SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}` } },
    );
    const allowRows = await allowResp.json();
    if (!Array.isArray(allowRows) || allowRows.length === 0) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { user_name, focus, goal, goal_detail, history } = body;

    const userMsg = `User: ${user_name}
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
