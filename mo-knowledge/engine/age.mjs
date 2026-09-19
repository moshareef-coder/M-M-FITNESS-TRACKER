/* Age, as one dial, in one place.
 *
 * research/02 is the file with the widest gap between what apps do and what the
 * evidence says, and its headline is the opposite of the instinct: older adults
 * respond to resistance training substantially, into their seventies and
 * eighties, and handing a 55 year old a lighter, easier, higher-rep week is not
 * a safety measure, it is a worse program justified by an assumption. So
 * nothing in this file touches weekly sets, rep ranges, movement selection or
 * the ceiling. research/02's own summary of what age is allowed to change:
 *
 *   "Age modifies the RATE at which we advance someone and the SELECTION we
 *    start them on. It does not set the destination."
 *
 * Three things it asks for that this engine can express, and what they became:
 *
 *   slower ramp             the returning restart in load.mjs starts further
 *                           back, because tendon and ligament adapt more slowly
 *                           than muscle and week one of any new program is the
 *                           unaccustomed, eccentric work that costs an older
 *                           person the most recovery
 *   smaller increments      calibrate.mjs adds less per step, so the same
 *                           destination is reached over more sessions
 *   longer warm-up          mobility.mjs spends more of the session's spare
 *                           minutes on the block before the first set
 *
 * WHY A DIAL AND NOT A THRESHOLD. Nobody becomes a different trainee on their
 * fiftieth birthday, and any age branch in a program is a cliff somebody falls
 * off on a Tuesday for no physiological reason. So this returns a number
 * between 0 and 1 that every caller multiplies by, and the callers have no age
 * branch in them at all.
 *
 * WHERE THE CURVE COMES FROM, said plainly: nowhere. research/02 rates the
 * direction high confidence and the magnitude low, and is explicit that "any
 * specific multiplier in a program is invented". This one is invented. It is a
 * straight line from 30 to 65 because those are the conventional bounds of the
 * gradual decline it describes, and it SATURATES rather than continuing, for a
 * reason that is the whole point of the research: a 75 year old must not end up
 * with a smaller program than a 60 year old. Past the top of the line the
 * engine is already being as careful as it knows how to be, and being more
 * careful would start costing training rather than buying safety.
 *
 * THE BOTTOM END. The app's stated minimum age is 13, and research/02 says
 * NOTHING about adolescents: not that they need a different ramp, not that they
 * need the same one. So this file says nothing either. A 16 year old gets
 * exactly what a 25 year old gets, and inventing a youth branch to fill the
 * silence would be the same mistake in the other direction. If somebody wants
 * one, it needs its own research file first.
 *
 * MISSING AGE. See ageCaution below. It is optional and post-onboarding, so
 * most plans are built without it, and what an absent field defaults to is not
 * a detail: the engine has just been through a bug where an unset `sex` read as
 * male and gave women a man's starting weights. The answer here is the opposite
 * shape and research/02 states it outright.
 */

/* The same window supabase/functions/generate-workout/index.ts bounds the
   payload's `age` to, mirrored rather than imported because the function is
   Deno and this is the engine, and the two must not disagree about what counts
   as a person's age. Outside it is not an old person or a young one, it is a
   bad row, and a bad row is treated as "never told us". */
export const AGE_RANGE = Object.freeze([10, 120]);

/* Where the line starts and where it saturates. Conventional, not measured. */
export const CAUTION_FROM = 30;
export const CAUTION_TO = 65;

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

/* The raw position on the line, for an age we believe. Null for one we do not,
   so each caller below decides what an absence means rather than inheriting a
   number somebody picked once. */
export function agePosition(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n < AGE_RANGE[0] || n > AGE_RANGE[1]) return null;
  return clamp01((n - CAUTION_FROM) / (CAUTION_TO - CAUTION_FROM));
}

/**
 * How careful the RATE of advance should be, 0 to 1.
 *
 *   25  0      45  0.43     60  0.86     75  1      not given  1
 *
 * Not given is 1, which is the whole of research/02's closing argument and the
 * one line in it that reads like an instruction:
 *
 *   "A plan built for an unknown age should use the cautious ramp by default,
 *    which costs a young beginner very little (a slightly slower first three
 *    weeks) and protects an older one. The age-unknown default should look like
 *    the older-adult default, not the young-adult one."
 *
 * The asymmetry is the argument. What the cautious end actually costs a 25 year
 * old who never filled the field in is a smaller step on squats and hinges and
 * a lower first week back after a layoff. What the confident end costs a 62
 * year old is the session that hurts them. Those are not the same price, so
 * they do not get the same default.
 *
 * This is deliberately NOT the shape the `sex` bug had. There, an unset field
 * was read as a specific claim about the person (male), and the claim was
 * wrong for half the people it was applied to and made their weights too heavy.
 * Here an unset field is read as no claim at all, and what follows from no
 * claim is the answer that is survivable in both directions.
 */
export function ageCaution(age) {
  const pos = agePosition(age);
  return pos == null ? 1 : pos;
}

/**
 * How much longer the warm-up block gets, 0 to 1, and this one is 0 when age is
 * not given rather than 1.
 *
 * Not an oversight and not an inconsistency with ageCaution above. The two ask
 * different questions and research/02's unknown-age argument only answers one
 * of them: it prices the cautious default as "a slightly slower first three
 * weeks", which is a claim about ramp rate and nothing else. Minutes are a
 * different currency. research/13 is the file that owns this block and it is
 * against length on its own evidence (McGowan 2015 on fatigue, Behm 2016 on how
 * fast the benefit expires, Oliva 2026 measuring 3.8% off peak squat force
 * after a general warm-up), and research/02 rates its own warm-up
 * recommendation medium, the weakest of the four.
 *
 * So the block grows for somebody who TOLD us they are older, where the two
 * files disagree and research/02 is the one describing that person. It does not
 * grow for everybody who left a field blank, where research/13 is unopposed.
 */
export function ageWarmupCaution(age) {
  const pos = agePosition(age);
  return pos == null ? 0 : pos;
}

/* One sentence for a caller that has to say what the age did, because a plan
   that quietly advances somebody more slowly than it advances somebody else is
   the kind of change this codebase writes down rather than performs. Null when
   there is nothing worth saying, which is the young end of the dial. */
export function ageNote(age) {
  const pos = agePosition(age);
  if (pos == null) {
    return "No age on the profile, so the loads climb at the careful rate: smaller steps, "
      + "and a lower restart after a layoff. Everything else about the week is the same. "
      + "Add your age in Setup if you want the faster ramp.";
  }
  if (pos <= 0) return null;
  return "The weights climb in smaller steps than they would for a younger lifter, and a "
    + "restart after time off begins further back. Same sets, same rep ranges, same "
    + "movements: tendon and ligament take longer to catch muscle up, so this is the "
    + "approach to the same place rather than a smaller destination.";
}
