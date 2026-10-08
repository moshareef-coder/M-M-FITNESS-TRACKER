// APNs, token-based auth, for the native iOS build.
//
// push_subscriptions and web-push cover browsers. Neither reaches a Capacitor
// app: Web Push does not exist inside a WKWebView, so the wrapped app could
// offer reminders and never deliver one. This is the other transport, talking
// to Apple directly over HTTP/2 with a JWT signed by a .p8 key.

const KEY_P8 = Deno.env.get("APNS_KEY_P8") ?? "";
const KEY_ID = Deno.env.get("APNS_KEY_ID") ?? "";
const TEAM_ID = Deno.env.get("APNS_TEAM_ID") ?? "";
const TOPIC = Deno.env.get("APNS_TOPIC") ?? "com.creativelab1.fittogether";

// Nothing here throws when unset, so a project without the key keeps sending
// web push exactly as before instead of failing the whole run.
export const apnsConfigured = () => Boolean(KEY_P8 && KEY_ID && TEAM_ID);

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToBytes(pem: string): Uint8Array {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
}

// Apple reject a JWT older than an hour and rate-limit how often you may mint
// one, so the same token is reused until it is nearly stale.
let cached: { jwt: string; at: number } | null = null;

async function apnsJwt(): Promise<string> {
  if (cached && Date.now() - cached.at < 45 * 60 * 1000) return cached.jwt;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(KEY_P8),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: "ES256", kid: KEY_ID })));
  const claims = b64url(enc.encode(JSON.stringify({ iss: TEAM_ID, iat: Math.floor(Date.now() / 1000) })));
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(`${header}.${claims}`),
  ));
  const jwt = `${header}.${claims}.${b64url(sig)}`;
  cached = { jwt, at: Date.now() };
  return jwt;
}

export type ApnsError = Error & { status?: number; reason?: string };

export type ApnsPayload = {
  title: string;
  body: string;
  url?: string;
  // iOS draws this between the title and the body in a lighter weight. Without
  // it everything competes at two sizes.
  subtitle?: string;
  // Registered in the app with its action buttons. An unknown one degrades to
  // a plain notification rather than failing.
  category?: string;
  // Notifications sharing a thread stack together instead of forming a pile of
  // separate rows.
  threadId?: string;
};

const HOSTS: Record<string, string> = {
  production: "api.push.apple.com",
  development: "api.sandbox.push.apple.com",
};

const otherEnvironment = (env: string) => env === "production" ? "development" : "production";

async function postTo(environment: string, deviceToken: string, payload: ApnsPayload): Promise<void> {
  const host = HOSTS[environment] ?? HOSTS.production;
  const res = await fetch(`https://${host}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${await apnsJwt()}`,
      "apns-topic": TOPIC,
      "apns-push-type": "alert",
      "apns-priority": "10",
    },
    body: JSON.stringify({
      aps: {
        alert: {
          title: payload.title,
          subtitle: payload.subtitle,
          body: payload.body,
        },
        sound: "default",
        category: payload.category,
        "thread-id": payload.threadId,
        // Nudges are worth a look, not worth breaking a Focus for.
        "interruption-level": "active",
        "relevance-score": 0.7,
      },
      url: payload.url ?? "/",
    }),
  });
  if (res.ok) return;
  const text = await res.text();
  const err = new Error(`apns ${res.status}: ${text}`) as ApnsError;
  err.status = res.status;
  try { err.reason = JSON.parse(text).reason; } catch { err.reason = ""; }
  throw err;
}

/// Sends, and returns the environment that actually worked.
///
/// A sandbox token is rejected outright by the production gateway and the other
/// way round, both with BadDeviceToken, which is the same answer Apple give for
/// a token that has genuinely gone. That ambiguity is what made this worth
/// fixing here rather than only at the device: every token registered by the
/// TestFlight build is sitting in the table marked "development" and pointed at
/// a gateway that will never accept it, and deleting those rows on the first
/// failure would quietly unsubscribe every real user.
///
/// So BadDeviceToken is treated as "possibly the wrong gateway" and tried once
/// against the other one. A token that is genuinely dead fails both and throws
/// as before. A token that is merely mislabelled goes through, and the caller
/// writes the corrected environment back, which repairs the row for good.
export async function sendApns(
  deviceToken: string,
  environment: string,
  payload: ApnsPayload,
): Promise<string> {
  const first = environment === "production" ? "production" : "development";
  try {
    await postTo(first, deviceToken, payload);
    return first;
  } catch (e) {
    const err = e as ApnsError;
    if (err.reason !== "BadDeviceToken") throw err;
    const second = otherEnvironment(first);
    await postTo(second, deviceToken, payload);
    return second;
  }
}
