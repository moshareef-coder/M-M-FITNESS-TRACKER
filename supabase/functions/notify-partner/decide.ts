// What a partner event turns into on the other phone, or why it turns into
// nothing. Pure, so scripts/notify-plan-test.mjs can run it under node.
//
// Two events, both things the partner just DID, so neither is capped the way
// the scheduled kinds are: a cheer and a train together invite are messages
// from a person, and holding one back to protect a daily budget would be the
// app deciding a partner has talked enough. What limits them instead is the
// trigger (one push per burst) and each person's own switch in Setup.

export type EventIn = {
  kind: string;                 // "cheer" | "invite"
  fromName: string;
  message?: string;
  request?: boolean;            // an invite that asks to join THEIR workout
  sessionId?: string;
  off: Set<string>;
  localHour: number;            // the recipient's
  nowSec: number;
};

export type EventOut =
  | { send: false; why: string }
  | {
    send: true;
    title: string; body: string; subtitle?: string;
    url: string; category?: string; threadId: string;
    interruptionLevel: "active" | "passive";
    expiresAt?: number;
  };

/* Quiet hours, the one place they exist. A cheer at 23:30 is somebody being
   kind, and the right answer is to have it waiting in the morning rather than
   to light up a bedside table with it. It is still delivered, just passively:
   no sound, no screen. Invites are NOT quietened, because an invite is "train
   now", it expires in half an hour, and a silent one is a missed one. */
export const QUIET_FROM = 22;
export const QUIET_TO = 7;
export const isQuiet = (h: number) => h >= QUIET_FROM || h < QUIET_TO;

/* tgStale in the app: an invite nobody answered for half an hour is not on. */
export const INVITE_TTL_SEC = 30 * 60;

export function decideEvent(e: EventIn): EventOut {
  const from = (e.fromName || "").trim().slice(0, 60) || "Your partner";
  if (e.kind === "cheer") {
    if (e.off.has("cheer")) return { send: false, why: "cheer switched off" };
    const said = String(e.message ?? "").trim().slice(0, 140);
    // The app's own banner refuses an empty message, so the push does too.
    if (!said) return { send: false, why: "empty cheer" };
    return {
      send: true,
      title: `${from} cheered you on`,
      body: `“${said}”`,
      url: "/cheer",
      threadId: "partner",
      interruptionLevel: isQuiet(e.localHour) ? "passive" : "active",
    };
  }
  if (e.kind === "invite") {
    if (e.off.has("invite")) return { send: false, why: "invite switched off" };
    return {
      send: true,
      /* Asking to join a workout they already have going is a different
         question from "train with me", and the banner should say which. */
      title: e.request ? `${from} wants to join your workout` : `${from} wants to train together`,
      body: "Same workout, 1.5x XP if you both finish.",
      url: e.sessionId ? `/together?id=${encodeURIComponent(e.sessionId)}` : "/together",
      category: "TOGETHER_INVITE",
      threadId: "partner",
      interruptionLevel: "active",
      expiresAt: e.nowSec + INVITE_TTL_SEC,
    };
  }
  return { send: false, why: `unknown kind ${e.kind}` };
}
