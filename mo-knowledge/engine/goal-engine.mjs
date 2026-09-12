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
    /* Jawa's real-goals research: pushing strength in typical adults runs roughly 1.5 to
       2.7x pulling strength, because training and daily life are both push-dominant. A
       first pull-up is a weak-link problem with a known direction, so the pulling side
       gets disproportionate volume. Grip is the other thing that fails first, which is
       why forearms are here and not in the pushing list. */
    "first-pullup": pri(P.skill, ["lats", "biceps", "forearms"]),
    /* Same research, mirrored: pushing is usually the better-trained pattern, so a failed
       push-up is rarely a chest problem. It is general beginner strength or, more often,
       the core stability needed to hold a rigid plank under load. Hence abs. */
    "first-pushup": pri(P.skill, ["chest", "triceps", "abs"]),
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

/* One primary goal, and any number of "and also" goals.
 *
 * index.html has carried a note since the tile picker landed saying single
 * select is deliberate, because "a plan built for two goals is a plan built for
 * neither". That is true of the parameter set above and of nothing else. Two
 * goals genuinely cannot both set a rep range: 3 to 6 reps at 180 seconds rest
 * and 8 to 15 at 60 are not a thing you can average into a week that trains
 * either quality. A day count is the same, the session length is the same, the
 * sets factor is the same.
 *
 * But "I want to build muscle and touch my toes" is not two rep ranges. It is a
 * rep range plus ten minutes of hip and thoracic work after the last set, and
 * refusing it is not coherence, it is the app failing to listen. So the split
 * is by what a second goal can add without contradicting the first:
 *
 *   the primary sets   repRange, restSec, setsFactor, sessionMin, minDays,
 *                      maxDays, emphasis, and the honest timeline
 *   a secondary adds   priority muscle groups, the mobility cool-down block,
 *                      and cardio, and only ever upward
 *
 * Everything a secondary touches is additive by construction. Priority is a
 * 1.4x on a group's weekly sets taken out of a fixed budget, so naming another
 * group moves volume around inside the week the primary already decided.
 * Cardio is prescribed beside the lifting and never inside the session budget.
 * The mobility block sits after the last set. None of the three can move a rep
 * range, and none of them can add a day.
 */

/* Mirrored from MOBILITY_CHILDREN in mobility.mjs. Importing it would drag the
   whole exercise library into what is otherwise a table of numbers, and this
   file is the one every other module already depends on. A test pins the two
   lists equal, same convention as checkTreeCoverage over GOAL_PARAMS. */
const MOBILITY_CHILDREN = ["flexibility", "mobility"];

/* Five groups is where the 1.4x stops meaning anything: the extra volume comes
   out of a fixed weekly budget, so once most of the body is a priority the plan
   is the same plan with a longer explanation. focus.mjs caps the merged list at
   five for exactly this reason and this is the same cap one layer earlier. */
const PRIORITY_CAP = 5;

/* Two secondaries, and the number is arguable but it is not arbitrary. The only
   lever a secondary has on the split is the priority list, and that list is full
   at five: a primary already naming four groups plus one secondary naming four
   saturates it, so a third secondary can only ever be told it did nothing. The
   other two levers (cardio, the mobility block) are each a single slot that the
   first goal asking for them wins. Past two, the honest answer is that there is
   nothing left to give, and a picker that lets somebody tap six things and then
   tells them five did nothing is worse than one that stops at two. */
export const MAX_SECONDARY_GOALS = 2;

/* Weekly cardio, as one number, so two prescriptions can be compared. A whole
   prescription is taken or not taken: maxing sessions from one and minutes from
   another would invent a dose nothing in sources.md ever wrote down. */
const cardioLoad = (c) => (c && c.sessions ? c.sessions * c.minutes : 0);

/* bubble + child -> which entry of GOAL_PARAMS actually runs. Null for a bubble
   the table has never heard of, because a secondary from an old client should
   cost its own effect and never the plan. */
function resolveOne(bubble, child) {
  const table = GOAL_PARAMS[bubble];
  if (!table) return null;
  /* Same rule as the primary below: a child this bubble has no entry for falls
     to the bubble default and says "_default" rather than going quiet. */
  const childUsed = table[child] ? child : "_default";
  return { bubble, child: child ?? null, childUsed, params: table[childUsed] };
}

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

  /* Above about 267 lb, 0.75% of bodyweight is more than 2 lb a week and the
     clamp above pins the rate at the ceiling. The message then called it "a
     healthy pace" as though it were the middle of the band, which is exactly
     backwards: it is the fastest thing we will plan, and the heaviest people,
     the ones with the most to lose and the most to lose by going too fast, were
     the only ones ever told it. So when the rate is pinned, it says so. */
  const capped = !gaining && bodyWeightLb * LOSS_RATE.midPct > LOSS_RATE.ceilLb;
  const paceWords = capped ? "the fastest pace we will plan for" : "a healthy pace";
  const capNote = capped
    ? ` That is capped at ${LOSS_RATE.ceilLb} lb a week, which is the top of the safe range and not the middle of it.`
    : "";
  /* Where the sentence already quoted the rate, the cap note replaces it rather
     than following it: saying "about 2 lb a week" and then "capped at 2 lb a
     week" in the same breath reads as a bug. */
  const rateSentence = capped ? capNote : ` That is about ${perWeek} lb a week.`;

  const out = { perWeekLb: perWeek, gaining, capped };

  if (byDate) {
    const weeks = weeksBetween(today, byDate);
    out.weeks = weeks;
    out.reachableLb = +(perWeek * weeks).toFixed(1);
    if (amountLb != null) {
      out.askedLb = amountLb;
      out.honest = amountLb <= out.reachableLb;
      out.weeksNeeded = Math.ceil(amountLb / perWeek);
      out.message = out.honest
        ? `${amountLb} lb in ${weeks} weeks is ${paceWords}.${rateSentence}`
        : `${weeks} weeks is enough for about ${out.reachableLb} lb at a pace that keeps your `
          + `muscle. ${amountLb} lb would take around ${out.weeksNeeded} weeks. Here is the plan `
          + `for ${out.reachableLb}, and if you get there early we will say so.${capNote}`;
    } else {
      out.message = `In ${weeks} weeks, about ${out.reachableLb} lb at ${paceWords}.${capNote}`;
    }
  } else if (amountLb != null) {
    out.askedLb = amountLb;
    out.weeksNeeded = Math.ceil(amountLb / perWeek);
    out.honest = true;
    const d = new Date(today.getTime() + out.weeksNeeded * 604800000);
    out.targetDate = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    out.message = `${amountLb} lb at ${paceWords} is about ${out.weeksNeeded} weeks, `
      + `so around ${out.targetDate}.${rateSentence}`;
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
 * @param {object} sel  { bubble, child, secondary?, amountLb?, byDate?, bodyWeightLb?, bodyFatPct?, sex?, level?, today? }
 *                      `secondary` is an optional array of { bubble, child },
 *                      the "and also" goals. Absent, empty or full of nonsense
 *                      is the single goal path, unchanged.
 */
export function resolveGoal(sel = {}) {
  const {
    bubble, child, secondary = [], amountLb = null, byDate = null, bodyWeightLb = null,
    bodyFatPct = null, sex = null, level = "beginner", today = new Date(),
  } = sel;

  const table = GOAL_PARAMS[bubble];
  if (!table) throw new Error(`Unknown goal bubble: ${bubble}`);
  /* Which key actually supplied the parameters, which is not always the child
     that was asked for. A free text match can land on a child this bubble has no
     entry for, and the old return said `child: undefined` and nothing else, so
     nothing downstream could tell a deliberate default from a typo. Naming
     "_default" out loud is how meta.childUsed can be audited later. */
  const childUsed = table[child] ? child : "_default";
  const params = table[childUsed];

  /* ---- the "and also" goals ---- */
  const asked = Array.isArray(secondary) ? secondary : [];
  const seen = new Set([`${bubble}/${childUsed}`]);
  const accepted = [];
  const ignoredSecondary = [];
  for (const s of asked) {
    const r = s && typeof s === "object" ? resolveOne(s.bubble, s.child) : null;
    const entry = { bubble: (s && s.bubble) ?? null, child: (s && s.child) ?? null };
    if (!r) { ignoredSecondary.push({ ...entry, why: "not a goal we know" }); continue; }
    const key = `${r.bubble}/${r.childUsed}`;
    /* Two taps that resolve to the same parameter entry are one goal said
       twice, and counting it against the cap would spend a slot on nothing. */
    if (seen.has(key)) { ignoredSecondary.push({ ...entry, why: "the same goal as one already picked" }); continue; }
    seen.add(key);
    if (accepted.length >= MAX_SECONDARY_GOALS) {
      ignoredSecondary.push({ ...entry, why: `over the limit of ${MAX_SECONDARY_GOALS} extra goals` });
      continue;
    }
    accepted.push(r);
  }

  const priority = [...(params.priority || [])];
  let cardio = params.cardio;
  /* The primary keeps the block when it is one of the two mobility children, so
     a single goal resolves to exactly the child it always did. */
  let mobilityChild = MOBILITY_CHILDREN.includes(childUsed) ? childUsed : null;

  const secondaryResolved = accepted.map((r) => {
    const gainedGroups = [];
    for (const g of r.params.priority || []) {
      if (priority.includes(g)) continue;
      if (priority.length >= PRIORITY_CAP) break;
      priority.push(g);
      gainedGroups.push(g);
    }
    /* Upward only. A secondary that would lower the cardio the primary
       prescribes is contradicting it, which is the thing a secondary may never
       do; a secondary that raises it is asking for work that happens beside the
       session and takes nothing away from it. The literal rule of "cardio only
       when the primary prescribes none" is dead code here: every entry in the
       table above prescribes at least one session, so nothing would ever have
       fired. This is the same idea that can actually happen. */
    const gainedCardio = cardioLoad(r.params.cardio) > cardioLoad(cardio);
    if (gainedCardio) cardio = r.params.cardio;
    const gainedMobility = !mobilityChild && MOBILITY_CHILDREN.includes(r.childUsed);
    if (gainedMobility) mobilityChild = r.childUsed;

    const effect = [];
    if (gainedGroups.length) effect.push(`extra weekly sets for ${gainedGroups.join(", ")}`);
    if (gainedCardio) effect.push(`${cardio.sessions} cardio sessions a week of about ${cardio.minutes} minutes`);
    if (gainedMobility) effect.push("a ten minute mobility block after the last set");
    /* The parameter object is deliberately not carried out: a secondary's
       repRange and restSec never ran, and returning them invites a caller to
       read them as though they had. */
    return {
      bubble: r.bubble, child: r.child, childUsed: r.childUsed,
      priority: gainedGroups, cardio: gainedCardio, mobility: gainedMobility, effect,
    };
  });

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
    bubble, child, childUsed,
    params: { ...params, priority, cardio },
    /* Which of the extra goals were honoured and with what, and which were not
       taken at all. Empty and empty for every caller that predates this. */
    secondary: secondaryResolved,
    ignoredSecondary,
    /* The child whose ten minute hips and upper back block runs, which is the
       primary's own child unless a secondary is the one asking for it. Null
       when nobody is: mobility.mjs treats that as the ordinary cool-down. */
    mobilityChild,
    /* The primary alone. A second goal cannot change what is reachable by a
       date, because it is not what the rate was computed from. */
    timeline,
    /* research/09: a plan nobody does produces nothing, so the days a person will
       really train beats the days they said. Callers pass observed capacity in. */
    dayRange: [params.minDays, params.maxDays],
  };
}
