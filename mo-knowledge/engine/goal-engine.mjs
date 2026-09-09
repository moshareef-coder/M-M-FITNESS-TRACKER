/* Goals in, an honest answer and a set of training parameters out.
 *
 * This is ../goals/goal-tree.json made executable. The tree is the research: what
 * people say, how common it is, where the numbers came from. This file is the
 * part a program can run, keyed by the same ids, and `assertTreeCoverage` in
 * demo.mjs checks the two have not drifted apart.
 *
 * The thing it exists to do, from research/11: "fast" is the suffix on almost
 * every goal people search. Abs in a week, 20 pounds in a month, a pull-up in
 * 30 days. So the first thing a plan says is not the plan, it is what is
 * actually reachable by the date they asked for. Not as a warning. As the
 * answer. We suggest the healthy rate, we never sell the fastest one.
 *
 * Every rate below is sourced in ../sources.md. None of them is invented here.
 */

const WEEKS_PER_MONTH = 4.345;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/* Safe rate of loss: 0.5 to 1% of bodyweight per week (CDC, Harvard). We plan on
   the middle and never above the top, because research/05: wrong-low costs a
   slower week, wrong-high costs muscle and adherence. */
export const LOSS_RATE = { lowPct: 0.005, midPct: 0.0075, highPct: 0.01, floorLb: 0.5, ceilLb: 2 };

/* Rate of muscle gain by training age, as a fraction of bodyweight per month.
   The McDonald and Aragon models, which are coaching convention rather than
   trial data, and are cited that way in sources.md. */
export const GAIN_RATE_PER_MONTH = {
  beginner: { lo: 0.010, hi: 0.015 },
  novice: { lo: 0.0075, hi: 0.0125 },
  intermediate: { lo: 0.005, hi: 0.010 },
  advanced: { lo: 0.0025, hi: 0.005 },
};

/* Body fat where abs generally show. research/11, InBody and BodySpec. Used only
   when a body fat estimate is actually supplied; we do not invent one. */
export const ABS_BODYFAT = { male: { outline: 15, clear: 11 }, female: { outline: 22, clear: 18 } };

/* Programme lengths that are simply known, so no generator is needed. Weeks. */
export const KNOWN_PROGRAMMES = {
  "run-5k": { weeks: 9, note: "Couch to 5K is 9 weeks, 3 runs a week, ending at 30 minutes of running." },
  "first-pushup": { weeks: 8, note: "Wall, incline, knee, full. About 8 weeks staged, longer for some." },
  "first-pullup": { weeks: 16, note: "Programmes promise 6 to 12 weeks. Real accounts run 3 to 6 months, so we plan for the long end." },
  "flexibility": { weeks: 6, note: "Toe touch in 4 to 8 weeks at 5 to 10 minutes most days. A split is months to years, and we do not promise a date for it." },
  "skills": { weeks: 26, note: "A freestanding handstand is 3 to 12 months of near-daily practice. Skill work, not strength work." },
  "event-run": { weeks: 16, note: "A first half marathon is 12 to 16 weeks, 20 from nothing. ACSM says 6 to 12 months from properly sedentary." },
  "event-ocr": { weeks: 8, note: "A Spartan Sprint is 6 to 8 weeks if already active, 16 from nothing." },
  "event-test": { weeks: 12, note: "12 weeks, building from 3 sessions a week to 5." },
  "event-hyrox": { weeks: 12, note: "8 to 12 weeks for somebody already training. Longer from scratch." },
  "event-benchmark": { weeks: 8, note: "8 weeks of specific prep for a scaled version." },
  "back-postpartum": { weeks: 12, note: "Walking, breathing and pelvic floor first. 6 to 12 weeks before intensity, function before appearance." },
};

/* Training parameters per goal. emphasis drives the split and the set counts,
   repRange and restSec come from the goal, priority lifts a muscle group's share
   of weekly volume without changing the shape of the week. */
const P = {
  fatloss:    { emphasis: "fatloss", repRange: [8, 15], restSec: 60, setsFactor: 0.85, cardio: { sessions: 2, minutes: 30, zone: "easy" }, minDays: 3, maxDays: 5, sessionMin: 45 },
  hypertrophy:{ emphasis: "hypertrophy", repRange: [6, 12], restSec: 90, setsFactor: 1.0, cardio: { sessions: 1, minutes: 20, zone: "easy" }, minDays: 3, maxDays: 5, sessionMin: 60 },
  strength:   { emphasis: "strength", repRange: [3, 6], restSec: 180, setsFactor: 0.9, cardio: { sessions: 1, minutes: 20, zone: "easy" }, minDays: 3, maxDays: 4, sessionMin: 60 },
  recomp:     { emphasis: "recomp", repRange: [8, 12], restSec: 75, setsFactor: 1.0, cardio: { sessions: 2, minutes: 25, zone: "easy" }, minDays: 3, maxDays: 5, sessionMin: 50 },
  skill:      { emphasis: "skill", repRange: [3, 8], restSec: 120, setsFactor: 0.8, cardio: { sessions: 1, minutes: 20, zone: "easy" }, minDays: 3, maxDays: 4, sessionMin: 45 },
  endurance:  { emphasis: "endurance", repRange: [8, 15], restSec: 60, setsFactor: 0.6, cardio: { sessions: 3, minutes: 35, zone: "mixed" }, minDays: 3, maxDays: 5, sessionMin: 40 },
  health:     { emphasis: "health", repRange: [8, 12], restSec: 75, setsFactor: 0.8, cardio: { sessions: 3, minutes: 30, zone: "easy" }, minDays: 2, maxDays: 4, sessionMin: 40 },
  habit:      { emphasis: "habit", repRange: [8, 12], restSec: 75, setsFactor: 0.7, cardio: { sessions: 1, minutes: 20, zone: "easy" }, minDays: 2, maxDays: 3, sessionMin: 30 },
};

const pri = (params, groups) => ({ ...params, priority: groups });

/* Keyed to goal-tree.json. bubble id -> child id -> parameters. */
export const GOAL_PARAMS = {
  "lose-weight": {
    _default: P.fatloss,
    "lose-a-number": P.fatloss, "lose-belly": pri(P.fatloss, ["abs", "obliques"]),
    "lose-by-date": P.fatloss, "lose-for-health": { ...P.health, emphasis: "fatloss" },
    "lose-last-10": P.recomp, "lose-and-build": P.recomp,
  },
  "build-muscle": {
    _default: P.hypertrophy,
    "build-overall": P.hypertrophy,
    "build-a-part": pri(P.hypertrophy, ["chest", "shoulders", "biceps", "triceps"]),
    "build-glutes": pri(P.hypertrophy, ["glutes", "hamstrings"]),
    "build-skinny-fat": P.recomp, "build-women": P.hypertrophy,
  },
  "get-stronger": {
    _default: P.strength,
    "strong-a-lift": P.strength, "strong-multiples": P.strength,
    "strong-not-bigger": { ...P.strength, repRange: [1, 5], setsFactor: 0.75 },
    "strong-for-life": { ...P.strength, repRange: [5, 8] },
    "strong-again": { ...P.strength, repRange: [5, 8] },
  },
  "tone-lean-abs": {
    _default: P.recomp,
    "tone-part": pri(P.recomp, ["chest", "shoulders", "biceps", "triceps", "glutes"]),
    "abs": pri(P.recomp, ["abs", "obliques"]), "lean-shredded": P.recomp,
  },
  "do-a-thing": {
    _default: P.skill,
    "first-pullup": pri(P.skill, ["lats", "biceps"]),
    "first-pushup": pri(P.skill, ["chest", "triceps"]),
    "run-5k": P.endurance, "faster-mile": P.endurance,
    "flexibility": { ...P.health, setsFactor: 0.6 }, "skills": P.skill,
  },
  "event": {
    _default: P.endurance,
    "event-run": P.endurance, "event-hyrox": P.endurance, "event-ocr": P.endurance,
    "event-test": P.endurance, "event-benchmark": P.endurance, "event-sport": P.health,
  },
  "feel-better": {
    _default: P.health,
    "mental": { ...P.health, cardio: { sessions: 3, minutes: 30, zone: "easy" } },
    "longevity": P.health, "energy": { ...P.health, cardio: { sessions: 4, minutes: 30, zone: "easy" } },
    "prevent": P.health, "mobility": { ...P.health, setsFactor: 0.6 },
    "pain": pri({ ...P.health, setsFactor: 0.6 }, ["abs", "glutes", "lowerback"]),
  },
  "get-back": {
    _default: P.habit,
    "back-after-years": { ...P.hypertrophy, setsFactor: 0.6 },
    "back-postpartum": pri({ ...P.health, setsFactor: 0.5 }, ["abs", "glutes"]),
    "start-fresh": P.habit,
  },
  "consistent": {
    _default: P.habit,
    "keep-quitting": P.habit, "dont-know": P.habit,
    "no-time": { ...P.habit, sessionMin: 25, maxDays: 4 },
  },
};

function weeksBetween(from, to) {
  return Math.max(0, Math.round((to - from) / 604800000));
}

/* The whole point. What is actually reachable, said plainly, with the date. */
function weightTimeline({ bubble, amountLb, byDate, bodyWeightLb, level, today }) {
  if (!bodyWeightLb) return null;
  const gaining = bubble === "build-muscle";
  let perWeek;
  if (gaining) {
    const r = GAIN_RATE_PER_MONTH[level] || GAIN_RATE_PER_MONTH.beginner;
    perWeek = (bodyWeightLb * (r.lo + r.hi) / 2) / WEEKS_PER_MONTH;
  } else {
    perWeek = clamp(bodyWeightLb * LOSS_RATE.midPct, LOSS_RATE.floorLb, LOSS_RATE.ceilLb);
  }
  perWeek = +perWeek.toFixed(2);

  const out = { perWeekLb: perWeek, gaining };

  if (byDate) {
    const weeks = weeksBetween(today, byDate);
    out.weeks = weeks;
    out.reachableLb = +(perWeek * weeks).toFixed(1);
    if (amountLb != null) {
      out.askedLb = amountLb;
      out.honest = amountLb <= out.reachableLb;
      out.weeksNeeded = Math.ceil(amountLb / perWeek);
      out.message = out.honest
        ? `${amountLb} lb in ${weeks} weeks is a healthy pace. That is about ${perWeek} lb a week.`
        : `${weeks} weeks is enough for about ${out.reachableLb} lb at a pace that keeps your `
          + `muscle. ${amountLb} lb would take around ${out.weeksNeeded} weeks. Here is the plan `
          + `for ${out.reachableLb}, and if you get there early we will say so.`;
    } else {
      out.message = `In ${weeks} weeks, about ${out.reachableLb} lb at a healthy pace.`;
    }
  } else if (amountLb != null) {
    out.askedLb = amountLb;
    out.weeksNeeded = Math.ceil(amountLb / perWeek);
    out.honest = true;
    const d = new Date(today.getTime() + out.weeksNeeded * 604800000);
    out.targetDate = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    out.message = `${amountLb} lb at a healthy pace is about ${out.weeksNeeded} weeks, `
      + `so around ${out.targetDate}. That is roughly ${perWeek} lb a week.`;
  }
  return out;
}

function absTimeline({ bodyFatPct, sex, bodyWeightLb, today }) {
  const t = ABS_BODYFAT[sex === "Female" ? "female" : "male"];
  if (bodyFatPct == null || !bodyWeightLb) {
    return {
      unknown: true,
      message: `Abs are a body fat number, not an exercise. Around ${t.outline}% is where they `
        + `start to show and about ${t.clear}% is where they are clear. From an average start `
        + `that is usually four to six months, not four to six weeks. The training below is `
        + `the same plan either way; what decides it is the eating, which we do not do.`,
    };
  }
  const perWeek = clamp(bodyWeightLb * LOSS_RATE.midPct, LOSS_RATE.floorLb, LOSS_RATE.ceilLb);
  const lbToLose = Math.max(0, (bodyFatPct - t.clear) / 100 * bodyWeightLb);
  const weeks = Math.ceil(lbToLose / perWeek);
  return {
    unknown: false, perWeekLb: +perWeek.toFixed(2), lbToLose: +lbToLose.toFixed(1), weeks,
    message: `At about ${bodyFatPct}% now, clear abs are near ${t.clear}%, which is roughly `
      + `${lbToLose.toFixed(0)} lb. At a healthy pace that is about ${weeks} weeks.`,
  };
}

/**
 * @param {object} sel  { bubble, child, amountLb?, byDate?, bodyWeightLb?, bodyFatPct?, sex?, level?, today? }
 */
export function resolveGoal(sel = {}) {
  const {
    bubble, child, amountLb = null, byDate = null, bodyWeightLb = null,
    bodyFatPct = null, sex = null, level = "beginner", today = new Date(),
  } = sel;

  const table = GOAL_PARAMS[bubble];
  if (!table) throw new Error(`Unknown goal bubble: ${bubble}`);
  const params = table[child] || table._default;

  let timeline = null;
  if (child === "abs") {
    timeline = absTimeline({ bodyFatPct, sex, bodyWeightLb, today });
  } else if (bubble === "lose-weight" || bubble === "build-muscle") {
    timeline = weightTimeline({ bubble, amountLb, byDate, bodyWeightLb, level, today });
  } else if (KNOWN_PROGRAMMES[child]) {
    const k = KNOWN_PROGRAMMES[child];
    timeline = { weeks: k.weeks, known: true, message: k.note };
    if (byDate) {
      const have = weeksBetween(today, byDate);
      timeline.weeksAvailable = have;
      timeline.honest = have >= k.weeks;
      if (!timeline.honest) {
        timeline.message = `${k.note} You have ${have}. We can build toward it and get you `
          + `close, but the honest answer is that ${k.weeks} is what it usually takes.`;
      }
    }
  }

  return {
    bubble, child,
    params: { ...params, priority: params.priority || [] },
    timeline,
    /* research/09: a plan nobody does produces nothing, so the days a person will
       really train beats the days they said. Callers pass observed capacity in. */
    dayRange: [params.minDays, params.maxDays],
  };
}
