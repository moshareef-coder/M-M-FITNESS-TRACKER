// Who gets which scheduled notification, and when. Pure: no network, no Deno,
// no clock it did not take as an argument, so scripts/notify-plan-test.mjs can
// feed it rows and print the decisions under plain node.
//
// The rule that shapes all of it (Mo, 2026-10-08): at most ONE scheduled
// notification per person per local day. Four kinds compete for that slot:
//
//   streak    20:00  your together streak (3+) breaks tonight unless you train
//   recap     Sun 19:00 (20:00 if the streak warning needed 19:00's slot)
//   progress  Mon 08:00 (Tue 08:00 if a 3+ streak was alive on Monday morning)
//   evening   18:00  your partner trained today and you have not
//
// That list is the priority order, highest first. The catch is that it runs
// against the clock: the lowest kind fires earliest, and once it has spent the
// day's slot nothing later can use it. So a lower kind STEPS ASIDE when a higher
// one will plausibly want the slot later the same day, rather than the higher
// one being blocked:
//
//   - evening at 18:00 steps aside when a 3+ together streak is at risk for you
//     (the 20:00 streak warning says the same thing with more at stake), and on
//     Sundays for the recap.
//   - recap at 19:00 steps aside when the streak is at risk for you, and comes
//     back at 20:00 if by then the streak no longer needs saying.
//   - progress on Monday morning steps aside to Tuesday when a 3+ streak is
//     alive, so the most consistent couples do not lose their Monday streak
//     warning to a weigh-in reminder every single week.
//
// The slot itself is enforced by the database, not by this file: a partial
// unique index on nudge_log (20261009_notify_prefs_and_cheer.sql) refuses a
// second scheduled row for the same person and local date, so an overlapping
// run, a retry, or a mistake in this planner still cannot double up.

export const SCHEDULED_KINDS = ["streak", "recap", "progress", "evening"] as const;

/* Every kind a person can switch off in Setup. The event kinds are here too so
   that the app, this file and the notify functions spell them the same way. */
export const ALL_KINDS = [
  "evening", "started", "finish", "video", "cheer", "invite", "streak", "recap", "progress",
] as const;

export const STREAK_MIN = 3;
export const WEIGHT_DUE_DAYS = 7;
export const PHOTO_DUE_DAYS = 14;
/* "Start your chart" is a fine thing to say for a few weeks. Said every Monday
   for a year to somebody who has never once weighed in, it is a nag about a
   thing they have quietly decided not to do. */
export const NEVER_LOGGED_GRACE_DAYS = 28;

export type Planned = {
  email: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  subtitle?: string;
  category?: string;
  threadId?: string;
  sentOn: string;           // the recipient's local date, which the cap is keyed on
};

export type Day = { gym: boolean; rest: boolean };

/* The local date, hour and weekday for a person. An unknown or bad zone falls
   back to UTC rather than throwing and taking the entire run down with it.
   weekday is 0 for Monday through 6 for Sunday, matching weekStartOf in the
   app, where weeks run Monday to Sunday. */
export function localParts(tz: string | null | undefined, now: Date) {
  let date: string, hour: number;
  try {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
    });
    const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
    date = `${p.year}-${p.month}-${p.day}`;
    hour = Number(p.hour) % 24;
  } catch {
    date = now.toISOString().slice(0, 10);
    hour = now.getUTCHours();
  }
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return { date, hour, weekday };
}

export const shift = (d: string, days: number) =>
  new Date(new Date(`${d}T00:00:00Z`).getTime() + days * 86400_000).toISOString().slice(0, 10);

export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86400_000);

export const weekStartOf = (d: string) =>
  shift(d, -((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7));

/* profiles.notify_off, read the way every function reads it. It arrives as an
   array, as null on a row that predates the column, and not at all on a
   database that does not have the column yet; all three mean nothing is off. */
export function offSet(raw: unknown): Set<string> {
  let v = raw;
  if (typeof v === "string") {
    // PostgREST hands a text[] back as an array, but a hand-run query or an
    // older client can produce the Postgres literal {a,b}.
    v = v.replace(/^\{|\}$/g, "").split(",").map((s) => s.replace(/"/g, "").trim()).filter(Boolean);
  }
  return new Set(Array.isArray(v) ? v.map((s) => String(s).toLowerCase()) : []);
}

/* A port of sharedDayStreak in index.html, for the part that matters at night.

   The app's rule: a day COUNTS when both of you trained. The chain HOLDS,
   without counting, when each of you either trained or logged a rest day. It
   BREAKS only when somebody simply did not show up. Today is still open, so
   nothing about today can break it yet.

   chainBefore(date) is that chain for the days strictly before `date`, which is
   the whole of sharedDayStreak() whenever today has not been done by both of
   you: sharedDayStreak() = chainBefore(today) + (both trained today ? 1 : 0).
   The same 365 day horizon as the app. */
export function chainBefore(
  dayOf: (email: string, date: string) => Day,
  me: string, partner: string, date: string,
): number {
  let streak = 0;
  for (let i = 1; i <= 365; i++) {
    const ds = shift(date, -i);
    const a = dayOf(me, ds), b = dayOf(partner, ds);
    if (a.gym && b.gym) streak++;
    else if ((a.gym || a.rest) && (b.gym || b.rest)) { /* held, not counted */ }
    else break;
  }
  return streak;
}

export function sharedDayStreak(
  dayOf: (email: string, date: string) => Day,
  me: string, partner: string, today: string,
): number {
  const a = dayOf(me, today), b = dayOf(partner, today);
  return chainBefore(dayOf, me, partner, today) + (a.gym && b.gym ? 1 : 0);
}

/* The streak warning for one person, or null. It breaks tonight when, at the
   end of today, the chain would not HOLD: one of you has neither trained nor
   rested. Only the person who has not shown up is told, because "one workout
   keeps it" is not true for somebody who already did theirs; the one who
   trained has the cheer button for that. */
export function streakAtRisk(
  dayOf: (email: string, date: string) => Day,
  me: string, partner: string, today: string,
): { n: number; bothMissing: boolean } | null {
  const a = dayOf(me, today), b = dayOf(partner, today);
  const mineOk = a.gym || a.rest, theirsOk = b.gym || b.rest;
  if (mineOk && theirsOk) return null;     // it holds, whatever happens next
  if (mineOk) return null;                 // it is theirs to save, not mine
  const n = chainBefore(dayOf, me, partner, today);
  if (n < STREAK_MIN) return null;
  return { n, bothMissing: !theirsOk };
}

/* The app's TRACK_DEFAULTS, copied because the function cannot import the
   page. Only weight and photos are read here, so a drift in the tape keys
   elsewhere cannot change what this decides. Keep in step with index.html. */
export const TRACK_DEFAULTS: Record<string, string[]> = {
  "lose-weight": ["weight", "waist_in", "photos"],
  "tone-lean-abs": ["waist_in", "hips_in", "photos"],
  "build-muscle": ["weight", "chest_in", "arm_in"],
  "get-stronger": ["lifts", "volume", "workouts_wk"],
  "build-endurance": ["cardio_wk", "cardio_min"],
  "move-better": ["mobility_wk", "walk_wk"],
  "consistent": ["workouts_wk", "weight"],
};
/* RETIRED_GOALS[x].to[0] in the app: a stored retired goal reads as the goal
   that replaced it. */
const RETIRED_TO: Record<string, string> = {
  "do-a-thing": "get-stronger",
  "event": "build-endurance",
  "get-back": "consistent",
  "feel-better": "consistent",
};
const liveGoal = (g: unknown) => {
  const s = typeof g === "string" ? g : "";
  return RETIRED_TO[s] || s;
};

/* isTracked(key) from the app, asked of every goal the person holds rather
   than the one Progress happens to be showing: a reminder about the scale is
   right for anybody who asked to see the scale on any of their goals.

   Per goal: tracked_by_goal[goal] when it is a list (an empty list is a real
   answer and means nothing), else the old flat tracked_metrics for the main
   goal only, else the goal's default. */
export function trackedKeys(prof: any): Set<string> {
  const main = liveGoal(prof?.goal_bubble) || "consistent";
  let sec: unknown = prof?.goal_secondary;
  if (typeof sec === "string") { try { sec = JSON.parse(sec); } catch { sec = []; } }
  const goals = [main, ...(Array.isArray(sec) ? sec.map((e: any) => liveGoal(e?.bubble)).filter(Boolean) : [])];
  let byGoal: unknown = prof?.tracked_by_goal;
  if (typeof byGoal === "string") { try { byGoal = JSON.parse(byGoal); } catch { byGoal = null; } }
  const out = new Set<string>();
  for (const g of new Set(goals)) {
    const map = byGoal && typeof byGoal === "object" ? (byGoal as Record<string, unknown>) : null;
    let keys: unknown;
    if (map && Array.isArray(map[g])) keys = map[g];
    else if (Array.isArray(prof?.tracked_metrics) && g === main) keys = prof.tracked_metrics;
    else keys = TRACK_DEFAULTS[g] || ["weight"];
    for (const k of keys as string[]) out.add(k);
  }
  return out;
}

const fmtLb = (w: number) => {
  const r = Math.round(w * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

/* The progress reminder's words, or null when nothing is due. */
export function progressCopy(o: {
  today: string; accountCreated: string | null;
  tracksWeight: boolean; tracksPhotos: boolean;
  lastWeight: { date: string; weight: number } | null;
  lastPhoto: string | null;
}): { title: string; body: string } | null {
  const age = o.accountCreated ? daysBetween(o.accountCreated.slice(0, 10), o.today) : 0;
  const fresh = age < NEVER_LOGGED_GRACE_DAYS;
  const wDays = o.lastWeight ? daysBetween(o.lastWeight.date, o.today) : null;
  const pDays = o.lastPhoto ? daysBetween(o.lastPhoto, o.today) : null;
  const weightDue = o.tracksWeight && (wDays === null ? fresh : wDays >= WEIGHT_DUE_DAYS);
  const photoDue = o.tracksPhotos && (pDays === null ? fresh : pDays >= PHOTO_DUE_DAYS);
  if (weightDue && photoDue) {
    // The more recent of the two, so the number is true of at least one of them.
    const known = [wDays, pDays].filter((d): d is number => d !== null);
    const n = known.length ? Math.min(...known) : null;
    return { title: "Progress day", body: n === null ? "Weigh in and snap a photo." : `Weigh in and snap a photo. It's been ${n} days.` };
  }
  if (weightDue) {
    return {
      title: "Weigh-in day",
      body: o.lastWeight
        ? `Last one: ${fmtLb(o.lastWeight.weight)} lb, ${wDays} days ago.`
        : "Start your chart with today's weight.",
    };
  }
  if (photoDue) {
    return {
      title: "Progress photo day",
      body: pDays === null ? "Take your first one today." : `It's been ${Math.floor(pDays / 7)} weeks.`,
    };
  }
  return null;
}

/* The Sunday line. Two numbers and one short thing worth saying about them,
   never a lecture. Null when there is nothing kind to say: a week where
   neither of you trained does not need a notification reading 0 and 0. */
export function recapCopy(o: {
  weekNo: number; partnerName: string;
  mine: number; myTarget: number; theirs: number; theirTarget: number;
}): { title: string; body: string } | null {
  if (o.mine === 0 && o.theirs === 0) return null;
  const p = o.partnerName;
  const iMet = o.mine >= o.myTarget, theyMet = o.theirs >= o.theirTarget;
  let line: string;
  if (iMet && theyMet) line = "You both hit it.";
  // Sunday evening is still Sunday: one short is a workout that can happen.
  else if (iMet && o.theirTarget - o.theirs === 1) line = `One more for ${p}.`;
  else if (theyMet && o.myTarget - o.mine === 1) line = "One more for you tonight.";
  else line = "New week tomorrow.";
  return {
    title: `Week ${o.weekNo} together`,
    body: `You ${o.mine} of ${o.myTarget}, ${p} ${o.theirs} of ${o.theirTarget}. ${line}`,
  };
}

export type PersonCtx = {
  email: string;
  date: string; hour: number; weekday: number;
  off: Set<string>;
  partner: string | null;
  partnerName: string;
  partnerSince: string | null;           // partnerships.responded_at or created_at
  dayOf: (email: string, date: string) => Day;
  targetOf: (email: string) => number;
  accountCreated: string | null;
  tracked: Set<string>;
  lastWeight: { date: string; weight: number } | null;
  lastPhoto: string | null;
  progressSentSince: (date: string) => boolean;   // a progress row on or after date
};

/* The one scheduled notification this run should try for this person, or null
   with the reason, which the test prints. Exactly one candidate per run: each
   kind has its own hour, so two can never be due in the same hourly pass. */
export function planFor(c: PersonCtx): { planned: Planned | null; why: string } {
  const none = (why: string) => ({ planned: null, why });
  const on = (k: string) => !c.off.has(k);
  const sunday = c.weekday === 6;
  const risk = c.partner ? streakAtRisk(c.dayOf, c.email, c.partner, c.date) : null;
  const streakWants = !!risk && on("streak");

  const recap = (): Planned | null => {
    if (!c.partner || !on("recap")) return null;
    const ws = weekStartOf(c.date);
    const count = (e: string) => {
      let n = 0;
      for (let i = 0; i < 7; i++) if (c.dayOf(e, shift(ws, i)).gym) n++;
      return n;
    };
    const since = (c.partnerSince || c.date).slice(0, 10);
    const weekNo = Math.max(1, Math.floor(daysBetween(weekStartOf(since), ws) / 7) + 1);
    const copy = recapCopy({
      weekNo, partnerName: c.partnerName,
      mine: count(c.email), myTarget: c.targetOf(c.email),
      theirs: count(c.partner), theirTarget: c.targetOf(c.partner),
    });
    return copy ? {
      email: c.email, kind: "recap", ...copy, url: "/progress",
      threadId: "partner", sentOn: c.date,
    } : null;
  };

  if (c.hour === 20) {
    if (streakWants) {
      return {
        planned: {
          email: c.email, kind: "streak",
          title: "Your together streak ends tonight",
          // Both still out: one workout from each of you, said honestly.
          body: `${risk!.n} days. ${risk!.bothMissing ? "One workout each keeps it." : "One workout keeps it."}`,
          // Same buttons as the evening nudge: Start workout, Not today.
          category: "EVENING_NUDGE", threadId: "partner", url: "/", sentOn: c.date,
        },
        why: `streak ${risk!.n} at risk`,
      };
    }
    // The recap that stepped aside at 19:00 for a streak that has since been
    // saved. If 19:00 already sent it, the cap index refuses this one.
    if (sunday) {
      const r = recap();
      return r ? { planned: r, why: "recap (20:00 fallback)" } : none("nothing at 20:00");
    }
    return none(risk ? "streak switched off" : "streak not at risk");
  }

  if (c.hour === 19 && sunday) {
    if (streakWants) return none("recap steps aside: streak warning at 20:00");
    const r = recap();
    return r ? { planned: r, why: "recap" } : none(on("recap") ? "recap: nothing to say" : "recap switched off");
  }

  if (c.hour === 18) {
    if (!on("evening")) return none("evening switched off");
    if (!c.partner) return none("no partner");
    const me = c.dayOf(c.email, c.date), them = c.dayOf(c.partner, c.date);
    if (me.gym || !them.gym) return none("evening: not the you-have-not, they-have case");
    if (streakWants) return none("evening steps aside: streak warning at 20:00");
    if (sunday && on("recap")) return none("evening steps aside: Sunday recap");
    return {
      planned: {
        email: c.email, kind: "evening",
        title: `${c.partnerName} trained today`, subtitle: "Your turn", body: "There is still time.",
        category: "EVENING_NUDGE", threadId: "partner", url: "/", sentOn: c.date,
      },
      why: "evening",
    };
  }

  if (c.hour === 8 && (c.weekday === 0 || c.weekday === 1)) {
    if (!on("progress")) return none("progress switched off");
    const monday = c.weekday === 0 ? c.date : shift(c.date, -1);
    if (c.progressSentSince(shift(monday, -6))) return none("progress already sent this week");
    const aliveMonday = !!c.partner && on("streak")
      && chainBefore(c.dayOf, c.email, c.partner, monday) >= STREAK_MIN;
    if (c.weekday === 0 && aliveMonday) return none("progress slips to Tuesday: 3+ streak alive");
    // Tuesday is only the slipped Monday, never a second weekly chance.
    if (c.weekday === 1 && !aliveMonday) return none("progress: Tuesday is only for a slipped Monday");
    const copy = progressCopy({
      today: c.date, accountCreated: c.accountCreated,
      tracksWeight: c.tracked.has("weight"), tracksPhotos: c.tracked.has("photos"),
      lastWeight: c.lastWeight, lastPhoto: c.lastPhoto,
    });
    if (!copy) return none("progress: nothing due");
    return {
      planned: {
        email: c.email, kind: "progress", ...copy,
        // The app opens Progress with the Log progress sheet for this one.
        url: "/progress/log", threadId: "progress", sentOn: c.date,
      },
      why: "progress",
    };
  }

  return none("no scheduled kind at this hour");
}
