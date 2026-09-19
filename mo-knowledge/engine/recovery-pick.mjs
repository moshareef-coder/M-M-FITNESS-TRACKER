/* What the robot should suggest on the Recovery screen, right now.
 *
 * Mo, 2026-09-18: "Recommend yoga. It could be evening yoga. Trying to get
 * the best recommendation for them. If they did a workout, let's do a stretch
 * around that workout in the evening. Or if they're getting ready to do a
 * workout for tomorrow, if they have it planned, we can prepare that in the
 * morning."
 *
 * So the suggestion is not one thing with a time-of-day label stuck on the
 * front. It is a decision with three parts, and the time of day is only one
 * of them:
 *
 *   WHAT   a stretch, a mobility warm up, or a yoga session
 *   WHEN   named off the person's own clock
 *   WHY    said out loud, because a recommendation nobody understands is a
 *          recommendation nobody follows
 *
 * Pure on purpose: it takes a plain object and returns a plain object, no
 * dates fetched, no profile read, no library touched. That is what lets the
 * test file below it and the tuning artifact both run the real rules rather
 * than a description of them.
 */

/* The ordinary English bands, not four equal blocks: five in the morning is
   not morning to anybody, and eleven at night is not evening. `hour` is a
   local hour, 0 to 23, read off the device, which is the person's own clock. */
export function timeBand(hour) {
  const h = Number.isFinite(hour) ? Math.floor(hour) : 12;
  if (h < 5) return "late";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 22) return "evening";
  return "late";
}

const BAND_WORD = { morning: "Morning", afternoon: "Afternoon", evening: "Evening", late: "Late night" };
const BAND_GREET = { morning: "Morning.", afternoon: "Afternoon.", evening: "Evening.", late: "Still up." };

/* Yoga is a session somebody chooses to do, not a cool-down: it is offered
   only to a person who said they do it, and only in a slot where twenty
   minutes is plausible. After a lift you want the holds for what you just
   trained, and before a lift you want to be warm, so neither of those is a
   yoga slot. That leaves the evening of a day with no training in it, and a
   rest day, which is exactly when people actually roll a mat out. */
function yogaFits({ band, trainedToday, planToday }) {
  if (trainedToday || planToday) return false;
  return band === "evening" || band === "afternoon";
}

/**
 * ctx:
 *   hour           0-23, local
 *   trainedToday   did they finish a session today
 *   groupsToday    muscle groups today's session actually worked, hardest first
 *   planToday      a workout sitting on today, not yet done: { focus, groups }
 *   planTomorrow   a workout sitting on tomorrow: { focus, groups }
 *   doesYoga       yoga is in their train_styles
 *   restDay        they marked today a rest day on purpose
 *
 * returns:
 *   kind     "stretch" | "prep" | "yoga"
 *   block    "static" | "dynamic" | null   what to ask the mobility engine for
 *   label    the session's name, for the heading and the button
 *   why      one line, the robot's voice
 *   greet    his opener for the time of day
 *   groups   which muscle groups to aim the block at, hardest first
 */
export function recoveryPick(ctx = {}) {
  const band = timeBand(ctx.hour);
  const word = BAND_WORD[band];
  const greet = BAND_GREET[band];
  const trainedToday = !!ctx.trainedToday;
  const groupsToday = Array.isArray(ctx.groupsToday) ? ctx.groupsToday.filter(Boolean) : [];
  const planToday = ctx.planToday || null;
  const planTomorrow = ctx.planTomorrow || null;
  const out = (o) => ({ band, greet, ...o });

  /* 1. They trained. The holds are for what they just did, whatever the hour:
        a session finished at six in the morning still wants its cool-down,
        and the label follows the clock rather than the rule. */
  if (trainedToday) {
    return out({
      kind: "stretch", block: "static", groups: groupsToday,
      label: `${word} stretch`,
      why: groupsToday.length
        ? "For what you trained today."
        : "For what you trained today, as best I can read it.",
    });
  }

  /* 2. Training is still ahead of them TODAY. Mo's "prepare that in the
        morning": the prep belongs to the morning OF the session, not the
        evening before, so this fires on the day itself and asks the engine
        for the dynamic pool rather than the holds. Holds before lifting are
        the thing every warm up article tells people to stop doing. */
  if (planToday) {
    return out({
      kind: "prep", block: "dynamic", groups: planToday.groups || [],
      label: `${word} mobility`,
      why: planToday.focus
        ? `Before your ${String(planToday.focus).toLowerCase()}. Get warm, not stretched.`
        : "Before you train today. Get warm, not stretched.",
    });
  }

  /* 3. Nothing today either way. This is the slot yoga was asked for, for
        somebody who actually does it. */
  if (ctx.doesYoga && yogaFits({ band, trainedToday, planToday })) {
    return out({
      kind: "yoga", block: null, groups: [],
      label: `${word} yoga`,
      why: planTomorrow
        ? `Nothing on today, and ${String(planTomorrow.focus || "a session").toLowerCase()} tomorrow. This is the day for it.`
        : "Nothing on today. This is the day for it.",
    });
  }

  /* 4. An ordinary open day. A general block, and if there is something on
        tomorrow it is worth saying so: it turns a stretch nobody asked for
        into the reason they will not be stiff for it. */
  return out({
    kind: "stretch", block: "static", groups: [],
    label: `${word} stretch`,
    /* Not "tonight": this branch runs at three in the afternoon as often as
       it runs at nine, and a sentence that tells somebody to do it later is a
       sentence that gets it done later. */
    why: planTomorrow
      ? `${String(planTomorrow.focus || "A session").charAt(0).toUpperCase() + String(planTomorrow.focus || "A session").slice(1).toLowerCase()} tomorrow. Loosen up now and it will go better.`
      : ctx.restDay
        ? "A rest day is the training. These keep you loose."
        : "Nothing logged today, so these are the ones worth doing on any day.",
  });
}
