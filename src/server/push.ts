// Operator pushes to the owner's phone. They land in ntfy through push-relay
// (cannappy/push-relay), an AWS Lambda that takes a Pushover-shaped request:
// ntfy.sh drops every request from Cloudflare Workers (verified 2026-09-29) but
// answers from AWS. The relay checks the PUSHOVER_USER / PUSHOVER_TOKEN secrets
// before it publishes. Never put contact addresses or other private user data
// in a push — pushPhone redacts email addresses as a backstop. Twin of
// email-ops src/push.ts and growguide-web src/lib/push.js.

const API = "https://7ag3vsvr6orbopz4vy5wx4nqi40aduim.lambda-url.us-east-1.on.aws/";

/** Pushover priority: -1 quiet (no sound), 0 normal, 1 high (bypasses quiet
 * hours). 2 (emergency) is never used: it needs retry/expire acknowledgement. */
const PRIORITY = { min: -1, low: -1, default: 0, high: 1, urgent: 1 } as const;

export type PushEnv = { PUSHOVER_USER?: string; PUSHOVER_TOKEN?: string };

export type PhoneMessage = {
  title: string;
  message: string;
  priority?: keyof typeof PRIORITY;
  /** Opened when the notification is tapped. */
  click?: string;
};

/** Anything email-shaped becomes "[email]": a push must never carry a contact
 * address, whatever text a caller passes in. */
export function redactEmails(text: string): string {
  return text.replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, "[email]");
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Never throws; false when there are no credentials or the push fails, so the
 * caller can fall back to email. */
export async function pushPhone(
  env: PushEnv,
  m: PhoneMessage,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  if (!env.PUSHOVER_USER || !env.PUSHOVER_TOKEN) return false;
  const body = new URLSearchParams({
    token: env.PUSHOVER_TOKEN,
    user: env.PUSHOVER_USER,
    title: clip(redactEmails(m.title), 250),
    message: clip(redactEmails(m.message || m.title), 1024),
    priority: String(PRIORITY[m.priority ?? "default"]),
  });
  if (m.click) body.set("url", m.click);
  try {
    const res = await fetchFn(API, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("pushover failed", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error("pushover failed", String(e).slice(0, 200));
    return false;
  }
}
