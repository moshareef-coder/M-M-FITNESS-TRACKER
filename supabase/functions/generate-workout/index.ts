// Deno Deploy (Supabase Edge Functions) generates one day's workout.
//
// Two engines, chosen by the WORKOUT_ENGINE function secret:
//
//   local (the default, and what runs when the var is unset)
//     mo-knowledge/engine/ builds the week and adapter.mjs returns one day of
//     it. Deterministic, no network call, no API key needed, zero cost per
//     workout. Answers { workout, honest, meta }.
//
//   llm
//     the original path: one claude-sonnet-5 call against SYSTEM_PROMPT below,
//     with the JSON parsed back defensively. Requires ANTHROPIC_API_KEY.
//     Kept for one release as a fallback. Answers { workout }.
//
// The app reads data.workout and nothing else, so both shapes satisfy it.
//
// calculateTDEE below is inlined from knowledge/formulas/tdee.mjs (Mifflin-St Jeor,
// see knowledge/sources.md) rather than imported, because this function used to be
// deployed via the Management API with only this file's contents, and a relative
// import there would resolve against a bundle that was never actually uploaded.
// Keep this copy in sync if the source in knowledge/formulas/tdee.mjs changes.
// The engine is VENDORED into ./_engine and ./_library by
// scripts/vendor-engine.mjs for the same reason, so this function stays self
// contained and deploys with scripts/deploy-function.sh, which uploads every
// file in this directory. Edit mo-knowledge/engine/, never _engine/.

// @ts-ignore untyped .mjs, same as the rest of mo-knowledge/
import { generateFromPayload } from "./_engine/adapter.mjs";

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
/* Unset means local. The engine is the default so a fresh deploy needs no
   secret at all; set WORKOUT_ENGINE=llm to go back to the model for a release. */
const ENGINE = (Deno.env.get("WORKOUT_ENGINE") || "local").toLowerCase();
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

/* The model's answer, reduced to the shape the app actually consumes. Returns
   null when there is nothing usable in it. Lengths follow the prompt's own
   contract (a short label, a standard exercise name, a cue under 100 chars). */
function sanitizeWorkout(raw: any): { focus: string; exercises: any[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const list = Array.isArray(raw.exercises) ? raw.exercises : [];
  const exercises = list
    .filter((e: any) => e && typeof e === "object" && typeof e.name === "string" && e.name.trim())
    .slice(0, 8)
    .map((e: any) => {
      const num = (v: unknown, lo: number, hi: number, fallback: number) => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback;
      };
      return {
        name: String(e.name).trim().slice(0, 60),
        sets: num(e.sets, 1, 20, 3),
        reps: num(e.reps, 1, 200, 10),
        targetWeight: num(e.targetWeight, 0, 2000, 0),
        note: typeof e.note === "string" ? e.note.trim().slice(0, 100) : "",
      };
    });
  if (!exercises.length) return null;
  const focus = typeof raw.focus === "string" && raw.focus.trim()
    ? raw.focus.trim().slice(0, 40)
    : "Today's session";
  return { focus, exercises };
}

/* The model path, lifted out of the handler unchanged. It answers either
   `{ workout }` or `{ response }`, because both of its failures are Responses
   with wording the app already shows and a thrown error would lose them. */
async function generateWithModel(payload: any): Promise<{ workout?: any; response?: Response }> {
  const {
    focus, goal, goal_detail, history,
    sex, age, height_in, activity_level, current_weight, gym_days_this_week,
  } = payload;

  const heightStr = height_in ? `${Math.floor(height_in / 12)}'${height_in % 12}"` : "not given";
  const tdee = calculateTDEE({ sex, age, height_in, activity_level, weightLb: current_weight });

  /* Deliberately anonymous. Nothing here names the person: the model gets
     body metrics, goals and training history, never a name or an email. */
  const userMsg = `Sex: ${sex || "not given"}
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
      "x-api-key": ANTHROPIC_API_KEY!,
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
    // The upstream body can name the org and the key that failed, so it is logged, not returned.
    console.error("anthropic error", resp.status, await resp.text());
    return {
      response: new Response(JSON.stringify({ error: "The coach is unavailable right now. Try again." }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }),
    };
  }

  const data = await resp.json();
  const text = data.content?.[0]?.text?.trim() || "";
  // The model is asked for pure JSON, but strip fences and any stray
  // leading/trailing prose defensively rather than trusting that exactly --
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
    /* The snippet used to ride back in the response so a failure was
       diagnosable from the client. It is model output shaped by the user's own
       free text, so it is a way to get arbitrary text onto the screen; the
       snippet is logged instead and the caller gets the reason only. */
    console.error("model response was not JSON", String(parseErr), data.stop_reason, text.slice(0, 400));
    return {
      response: new Response(JSON.stringify({
        error: "The coach's answer was unreadable. Try again.",
      }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }),
    };
  }

  /* The model is told what shape to answer in; it is not trusted to have
     obeyed. Whatever comes back here is written to ai_workouts by the client
     and then read by a partner, so it is checked and trimmed to the five
     fields the app consumes before it leaves this function. A crafted goal
     note cannot turn an exercise name into a paragraph of someone else's
     choosing, because a name that is not a short string does not survive. */
  const clean = sanitizeWorkout(workout);
  if (!clean) {
    console.error("model returned an unusable workout shape");
    return {
      response: new Response(JSON.stringify({
        error: "The coach's answer was unusable. Try again.",
      }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }),
    };
  }

  return { workout: clean };
}

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
   will for as long as that copy lives, and the published policy says no
   identifier reaches the model. Strip rather than trust the caller. */
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
  /* Only the model path needs a key. The local engine must work on a project
     where ANTHROPIC_API_KEY was never set, so this guard moved behind ENGINE. */
  if (ENGINE === "llm" && !ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
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

    /* The usage row used to be written here, before the model was even
       called. That meant every failure still cost a slot: a bad response, a
       Claude outage, or a client that could not save what came back all
       burned quota and produced nothing. One real case of that emptied an
       account's whole daily allowance in half an hour. It is written at the
       end now, once there is a workout to hand back. Both engines log, so a
       user's daily allowance keeps meaning one thing whichever one is on. The
       row carries the caller and nothing else; if a model column is ever added
       the local path should write "local-engine" into it. */
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

    if (ENGINE !== "llm") {
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
    }

    const { workout, response } = await generateWithModel(body);
    if (response) return response;

    await logUsage();
    return new Response(JSON.stringify({ workout }), {
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
