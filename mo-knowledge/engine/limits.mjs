/* Limits: what hurts, and what they do not own.
 *
 * The onboarding screen in index.html asks two optional questions, "does
 * anything hurt" and "anything you don't have", and the prototype's own
 * comment says the engine could not honour either answer. This module is the
 * engine side of that, and the reason it exists is that an answer is only
 * worth collecting if something downstream can act on it. A limit nothing can
 * honour is a promise the plan quietly breaks.
 *
 * Two lists, and the screen must import them from here rather than writing its
 * own. That is the whole contract:
 *
 *   BODY_AREAS         the eight joints joint-load.mjs actually tags
 *   EQUIPMENT_OPTIONS  the five equipment answers the library can filter on
 *
 * The prototype offered "Pull-up bar", "Squat rack" and "Bench", and the
 * library records exactly five equipment values (bodyweight, dumbbell,
 * barbell, cable, machine) and nothing else. So somebody could say they have
 * no squat rack and nothing could honour it, while "machine", which the engine
 * CAN honour, was not offered at all. Those three are not here and will not
 * be until the library grows a field that can see them. Adding a chip is a
 * change to knowledge/ first and to this file second, never the other way
 * round.
 *
 * Nothing here is a medical question and none of it is phrased as one. See the
 * header of joint-load.mjs: the joint table is coaching judgement, written
 * from scratch, and a physio should review it before any of it is called
 * medical advice.
 *
 * Deno safe: no node: imports, no dependencies, no file reads.
 */
import { JOINTS, JOINT_LOAD, jointLoadFor } from "./joint-load.mjs";

/* The honourable list the screen may offer. `hint` is what actually gets
   avoided, in the words a person would use, because a chip that does not say
   what it costs is a chip nobody can decide about. */
export const BODY_AREAS = Object.freeze([
  { key: "shoulder", label: "Shoulder", hint: "no overhead pressing or dips" },
  { key: "elbow", label: "Elbow", hint: "no skull crushers or weighted chin-ups" },
  { key: "wrist", label: "Wrist", hint: "no push-ups or front rack work" },
  { key: "neck", label: "Neck", hint: "no heavy shrugs or crunches" },
  { key: "lowerback", label: "Lower back", hint: "no deadlifts or good mornings" },
  { key: "hip", label: "Hip", hint: "no deep squatting or heavy hinging" },
  { key: "knee", label: "Knee", hint: "no deep lunges or leg extensions" },
  { key: "ankle", label: "Ankle", hint: "no calf raises or split squats" },
]);

/* What the engine can actually filter on. Four implements plus the honest
   nothing case. `none` is not a sixth implement: it means bodyweight only, and
   it overrides the other four when both are somehow sent. */
export const EQUIPMENT_OPTIONS = Object.freeze([
  { key: "barbell", label: "No barbell", hint: "dumbbell and machine versions instead" },
  { key: "dumbbell", label: "No dumbbells", hint: "machine, cable and bodyweight versions instead" },
  { key: "cable", label: "No cable machine", hint: "dumbbell and machine versions instead" },
  { key: "machine", label: "No machines", hint: "free weight and bodyweight versions instead" },
  { key: "none", label: "No equipment at all", hint: "bodyweight only" },
]);

/* The five values the library records, plus the one keyword. */
export const EQUIPMENT_KEYS = Object.freeze(EQUIPMENT_OPTIONS.map((o) => o.key));
const IS_JOINT = new Set(JOINTS);
const IS_EQUIPMENT = new Set(EQUIPMENT_KEYS);

/* Everything the library can be made of. `bodyweight` is never something you
   can be missing, so it is not an option above, and it is the fallback for the
   60 yoga and pilates rows that record no equipment at all: a pose needs
   nothing, so filtering it out for want of a barbell would be nonsense. */
const IMPLEMENTS = ["bodyweight", "dumbbell", "barbell", "cable", "machine"];

/* A note is a free text box and it goes nowhere near the selection. Nothing
   reads it, on purpose: parsing "my left knee since the ACL" into a filter is
   how an app ends up guessing at a medical history. It is stored so a coach or
   a future screen can read it back, and it is capped so a paste of a hospital
   discharge letter does not end up in a jsonb column. */
export const NOTE_MAX = 120;

const LABEL = {};
for (const a of BODY_AREAS) LABEL[a.key] = a.label.toLowerCase();

/* Whatever the caller has, into the one shape. An object, the JSON string a
   jsonb column round trips as, or null. Unknown keys are dropped in silence
   for the same reason focus.mjs drops unknown groups: this runs on a stored
   profile column that older clients wrote and newer ones will rewrite, so a
   stale key is an expected input and not an error worth failing a plan over. */
export function normalizeLimits(input) {
  let raw = input;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return empty();
    try { raw = JSON.parse(s); } catch { return empty(); }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty();

  const hurts = pick(raw.hurts, IS_JOINT);
  const missing = pick(raw.missing, IS_EQUIPMENT);
  const note = typeof raw.note === "string" && raw.note.trim()
    ? raw.note.trim().slice(0, NOTE_MAX).trim()
    : null;
  return { hurts, missing, note };
}

const empty = () => ({ hurts: [], missing: [], note: null });

/* Arrays or a comma separated string, same as focus.mjs, because a text[]
   column and a CSV both turn up in practice. */
function pick(value, allowed) {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const out = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const key = raw.trim().toLowerCase();
    if (!allowed.has(key) || out.includes(key)) continue;
    out.push(key);
  }
  return out;
}

/* Which implements are still allowed. Null means "no equipment limit was
   given", which is not the same as "everything is allowed" to a caller that
   wants to leave its own equipment list alone. */
export function allowedEquipment(limits) {
  const lim = limits && Array.isArray(limits.missing) ? limits : normalizeLimits(limits);
  if (!lim.missing.length) return null;
  if (lim.missing.includes("none")) return ["bodyweight"];
  return IMPLEMENTS.filter((e) => !lim.missing.includes(e));
}

/* An exercise with no equipment recorded is treated as bodyweight. Sixty rows
   in the library are like this, all of them yoga and pilates, and every one of
   them needs a mat at most. Reading a missing field as "some unknown implement
   we cannot rule out" would delete all of them the moment somebody said they
   own no barbell, which is the opposite of the truth. */
const implementOf = (ex) => ex?.equipment || "bodyweight";

/* The filter itself. Pure: it reads the pool and the limits and returns a new
   pool, and it never touches the exercises.
 *
 * Two rules, and they are not the same kind of rule. A joint is a judgement
 * from joint-load.mjs about whether this movement loads that joint heavily. An
 * implement is a fact: they either have a barbell or they do not.
 *
 * It never hands back an empty pool. A hole in the week is worse than an
 * imperfect exercise, so when every candidate would go, the least loaded one
 * stays and is reported with `softened: true` and a reason, which is how a
 * caller knows to say so out loud rather than pretending the limit was
 * honoured. Least loaded is: fewest of the joints they named, then fewest
 * joints in total, then the pool's own order, which is already ranked. */
export function applyLimits({ pool = [], limits = null, jointLoad = JOINT_LOAD } = {}) {
  const lim = limits && Array.isArray(limits.hurts) ? limits : normalizeLimits(limits);
  if (!lim.hurts.length && !lim.missing.length) return { pool: [...pool], excluded: [] };

  const allowed = allowedEquipment(lim);
  const judged = pool.map((ex) => {
    const joints = jointLoadFor(ex, { table: jointLoad }).joints;
    const hit = lim.hurts.filter((j) => joints.includes(j));
    const implement = implementOf(ex);
    const wrongKit = allowed ? !allowed.includes(implement) : false;
    return { ex, joints, hit, implement, wrongKit };
  });

  const kept = judged.filter((j) => !j.hit.length && !j.wrongKit);
  const gone = judged.filter((j) => j.hit.length || j.wrongKit);

  if (kept.length) {
    return {
      pool: kept.map((j) => j.ex),
      excluded: gone.map((j) => ({ name: j.ex.name, why: whyGone(j, lim), excluded: true, softened: false })),
    };
  }

  /* Nothing survived. Keep one rather than hand back nothing. */
  const order = [...judged].sort((a, b) => a.hit.length - b.hit.length || a.joints.length - b.joints.length);
  const spared = order[0];
  const rest = gone.filter((j) => j !== spared);
  return {
    pool: spared ? [spared.ex] : [],
    excluded: [
      ...rest.map((j) => ({ name: j.ex.name, why: whyGone(j, lim), excluded: true, softened: false })),
      ...(spared ? [{
        name: spared.ex.name,
        why: `${whyGone(spared, lim)}, but it is the least loaded thing that fills this slot and an empty slot is worse`,
        excluded: false,
        softened: true,
      }] : []),
    ],
  };
}

function whyGone({ hit, wrongKit, implement }, lim) {
  const parts = [];
  if (hit.length) parts.push(`loads the ${listOut(hit.map((j) => LABEL[j] || j))}, and you said that hurts`);
  if (wrongKit) {
    parts.push(lim.missing.includes("none")
      ? `needs a ${implement}, and you said you have no equipment`
      : `needs a ${implement}, and you said you have none`);
  }
  return parts.join("; ");
}

const listOut = (a) => a.length === 1 ? a[0] : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;

/* What the plan says out loud. One sentence per painful joint and one for the
   equipment, in plain words, because a plan that quietly removed half the
   movements somebody expected reads as the app being broken. Same argument as
   focus.mjs's `why` array and preferences.mjs's `avoidNote`. */
const HURT_SENTENCE = {
  shoulder: "Nothing that loads a bad shoulder is in here, so overhead pressing and dips are out and chest supported work is in.",
  elbow: "Nothing that loads a bad elbow is in here, so skull crushers and weighted chin-ups are out and cable and machine work is in.",
  wrist: "Nothing that loads a bad wrist is in here, so push-ups and front rack work are out and machine handles and neutral grips are in.",
  neck: "Nothing that loads a bad neck is in here, so heavy shrugs and crunches are out and braced core work is in.",
  lowerback: "Nothing that loads a bad lower back is in here, so deadlifts and good mornings are out and supported and machine work is in.",
  hip: "Nothing that loads a bad hip is in here, so deep squatting and heavy hinging are out and shorter range work is in.",
  knee: "Nothing that loads a bad knee is in here, so deep lunges and leg extensions are out and bridges and hip work are in.",
  ankle: "Nothing that loads a bad ankle is in here, so calf raises and split squats are out and seated and supported work is in.",
};

export function limitsSummary(limits) {
  const lim = limits && Array.isArray(limits.hurts) ? limits : normalizeLimits(limits);
  const out = [];
  for (const j of lim.hurts) if (HURT_SENTENCE[j]) out.push(HURT_SENTENCE[j]);

  if (lim.missing.includes("none")) {
    out.push("You said you have no equipment, so every exercise in this week is bodyweight.");
  } else if (lim.missing.length) {
    const gone = lim.missing.map((k) => k === "dumbbell" ? "dumbbells" : k === "machine" ? "machines" : k);
    const left = (allowedEquipment(lim) || []).filter((e) => e !== "bodyweight");
    out.push(`You said you have ${listOut(gone.map((g) => `no ${g}`))}, so the plan uses ${listOut([...left, "bodyweight"])} versions instead.`);
  }
  return out;
}

/* The other half of the honesty. A slot the library could not fill any other
   way keeps a movement that still loads a joint they named, and saying so is
   the difference between a plan that is honest about a compromise and one that
   made the promise and broke it. Mirrors the rotate-blocked note in plan.mjs. */
export function softenedNote(names = []) {
  if (!names.length) return null;
  return `${listOut(names)} ${names.length === 1 ? "is" : "are"} still in this week. `
    + `The library has nothing else that fills that slot, so go light, stop if it hurts, and swap it out `
    + `if it does not settle.`;
}
