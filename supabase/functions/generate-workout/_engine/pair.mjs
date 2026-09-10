/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/pair.mjs. Do not edit here. */
/* The pair layer. research/06: every training algorithm ever written builds a
 * plan for one person in isolation and bolts the social layer on afterwards. We
 * have two people as the premise of the product. This is the part that treats
 * them as two.
 *
 * Three jobs, in the order they matter:
 *   1. Put them in the gym on the same days, which is most of the value and
 *      needs no programming cleverness at all.
 *   2. Make the week conjunctive: individual targets, joint outcome.
 *   3. Choose a comparison that motivates instead of humiliating, which is what
 *      keeps the ability gap inside the band the effect needs.
 *
 * Honest limit, and it is the folder's biggest: research/06 rests on the Köhler
 * effect, which only works when the ability gap is moderate, and neither research
 * nor this file can say where that band ends. PRODUCTIVE_GAP below is a guess
 * with a number attached, flagged as open question 7. Everything else here is
 * sound whatever that number turns out to be.
 */
import { ALLOMETRIC_EXPONENT } from "./load.mjs";

/* Ratio of the stronger person's size adjusted score to the weaker one's, past
   which a head to head stops being motivating. A GUESS. See open-questions #7. */
export const PRODUCTIVE_GAP = { tooClose: 1.05, tooFar: 1.6 };

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* When somebody actually trains, from fit_entries rather than from what they
   said. research/07: prefer measured over stated, every time. */
export function observedTrainingDays(logs = []) {
  const counts = new Array(7).fill(0);
  for (const d of new Set(logs.map((l) => l.entry_date).filter(Boolean))) {
    counts[new Date(String(d) + "T12:00:00Z").getUTCDay()]++;
  }
  return counts;
}

/* Days for the pair. Their counts can differ and their goals can differ; what is
 * shared is the rhythm. research/06 mechanism 3: two people whose sessions land
 * on the same days train together, two people whose sessions land on different
 * days are two people using the same app.
 */
export function sharedSchedule({ aDays, bDays, aLogs = [], bLogs = [] }) {
  const a = observedTrainingDays(aLogs);
  const b = observedTrainingDays(bLogs);
  const both = a.map((n, i) => n + b[i]);
  const anyHistory = both.some((n) => n > 0);

  /* With no history, a sane default: spread across the week, avoiding Friday,
     which Strava's 2025 data says is the least popular day to train. */
  const fallback = [1, 3, 5, 2, 6, 4, 0];
  const order = anyHistory
    ? both.map((n, i) => [n, i]).sort((x, y) => y[0] - x[0] || fallback.indexOf(x[1]) - fallback.indexOf(y[1])).map(([, i]) => i)
    : fallback;

  const overlap = order.slice(0, Math.min(aDays, bDays));
  const aOnly = order.filter((d) => !overlap.includes(d)).slice(0, Math.max(0, aDays - overlap.length));
  const bOnly = order.filter((d) => !overlap.includes(d) && !aOnly.includes(d)).slice(0, Math.max(0, bDays - overlap.length));

  /* Preference order picks WHICH days. Calendar order is how they are read back,
     because "Wednesday, Tuesday, Saturday" is preference order leaking into the UI. */
  const weekStart = [1, 2, 3, 4, 5, 6, 0];
  const sortDay = (arr) => arr.slice().sort((x, y) => weekStart.indexOf(x) - weekStart.indexOf(y));
  return {
    together: sortDay(overlap).map((d) => DAY_NAMES[d]),
    aAlone: sortDay(aOnly).map((d) => DAY_NAMES[d]),
    bAlone: sortDay(bOnly).map((d) => DAY_NAMES[d]),
    basis: anyHistory ? "when you have both actually trained" : "a sensible default until we see when you train",
  };
}

/* The week they owe each other. research/06 mechanism 1, corrected: NOT one
 * pooled number. Two people rarely share a goal, and summing his three and her
 * four either overcounts him or undercounts her and quietly erases that they were
 * never training for the same thing. Targets stay individual. Only the outcome is
 * conjunctive: the week lands for the pair when both hit their own number.
 */
export function conjunctiveWeek({ a, b }) {
  const done = (p) => ({ name: p.name, target: p.target, done: p.done, hit: p.done >= p.target });
  const A = done(a), B = done(b);
  const landed = A.hit && B.hit;

  let line;
  if (landed) line = `Week done. ${A.name} ${A.done} of ${A.target}, ${B.name} ${B.done} of ${B.target}.`;
  else if (A.hit) line = `${A.name} is done. Waiting on ${B.name}, ${B.target - B.done} to go.`;
  else if (B.hit) line = `${B.name} is done. Waiting on ${A.name}, ${A.target - A.done} to go.`;
  else line = `${A.name} ${A.done} of ${A.target}, ${B.name} ${B.done} of ${B.target}.`;

  return { landed, a: A, b: B, line, carrying: A.hit !== B.hit ? (A.hit ? A.name : B.name) : null };
}

/* Size adjusted strength, so a 190 lb man and a 145 lb woman can appear in the
 * same sentence without it being either meaningless or cruel. research/01 and 08.
 * This is a handicap for presentation. It is not a claim about who is stronger,
 * and the formulas behind it were fitted on competitive lifters, not beginners.
 */
export function relativeScore({ liftedLb, bodyWeightLb, sex }) {
  if (!liftedLb || !bodyWeightLb) return null;
  /* Sex coefficient from the reference standards in load.mjs: a female beginner
     bench standard is roughly a third of the male one at reference weights. */
  const sexFactor = String(sex).toLowerCase().startsWith("f") ? 2.4 : 1;
  return +(liftedLb / Math.pow(bodyWeightLb, ALLOMETRIC_EXPONENT) * sexFactor).toFixed(1);
}

/* The comparison ladder from research/08, fairest rung first. The app should
 * prefer the fairest one available rather than always reaching for the formula,
 * and the design rule is absolute: never show a comparison a reasonable person
 * would find humiliating. If the only available comparison is humiliating, show
 * progress instead.
 */
export function chooseComparison({ a, b }) {
  const own = (p) => (p.baselineLb && p.currentLb)
    ? +(((p.currentLb - p.baselineLb) / p.baselineLb) * 100).toFixed(1) : null;
  const aPct = own(a), bPct = own(b);

  if (aPct != null && bPct != null) {
    return {
      kind: "own-progress",
      fairness: "perfect",
      line: `${a.name} is up ${aPct}% on their own numbers, ${b.name} up ${bPct}%.`,
      why: "Progress against your own past is fair by construction, needs no formula, works "
         + "for any activity, and is available from the second session. It is the default.",
    };
  }

  const aScore = relativeScore(a), bScore = relativeScore(b);
  if (aScore && bScore) {
    const gap = Math.max(aScore, bScore) / Math.min(aScore, bScore);
    if (gap <= PRODUCTIVE_GAP.tooFar) {
      return {
        kind: "size-adjusted",
        fairness: "handicapped",
        gap: +gap.toFixed(2),
        line: `Adjusted for size, ${a.name} ${aScore} and ${b.name} ${bScore}. Closer than the raw numbers.`,
        why: "Powerlifting solved this a century ago and no consumer app uses it. Presented "
           + "as a handicap, never as a claim about who is stronger.",
      };
    }
    return {
      kind: "effort",
      fairness: "safe",
      gap: +gap.toFixed(2),
      line: `${a.name} and ${b.name} both showed up. That is the comparison worth making.`,
      why: `The size adjusted gap is ${gap.toFixed(2)}x, past the ${PRODUCTIVE_GAP.tooFar}x where a `
         + `head to head stops motivating the weaker person and starts embarrassing them. Falling `
         + `back to effort, which is fair across any gap and is the behaviour we want anyway. `
         + `That threshold is a guess: see open-questions #7.`,
    };
  }

  return {
    kind: "effort", fairness: "safe",
    line: `${a.name} and ${b.name} both showed up.`,
    why: "Not enough logged to compare anything else, and showing up is the thing that matters.",
  };
}

/* Everything at once, for two already built plans. */
export function pairPlan({ a, b }) {
  return {
    schedule: sharedSchedule({
      aDays: a.plan.days, bDays: b.plan.days, aLogs: a.logs || [], bLogs: b.logs || [],
    }),
    week: conjunctiveWeek({
      a: { name: a.name, target: a.plan.days, done: a.doneThisWeek ?? 0 },
      b: { name: b.name, target: b.plan.days, done: b.doneThisWeek ?? 0 },
    }),
    comparison: chooseComparison({
      a: { name: a.name, ...a.compare }, b: { name: b.name, ...b.compare },
    }),
  };
}
