// Operator heads-ups go through ops-notify (~/GitHub/cannappy/ops-notify): one
// phone push with a "Stop these" link, so Chris can switch a kind off from the
// push itself. A heads-up sits beside the real email, never replaces it.

const OPS_NOTIFY_URL = "https://ops-notify.cannappy.workers.dev/report";

export type OpsNotifyEnv = { OPS_NOTIFY_TOKEN?: string };

export type OpsReport = {
  /** Stable id of the kind, lowercase-dashes. */
  key: string;
  /** Shown on the stop page. */
  label: string;
  title: string;
  /** The push line itself. Never a person's name, address or message. */
  summary: string;
  html?: string;
  priority?: "low" | "default" | "high";
};

/** The contact-form heads-up. Fixed text: nothing the sender typed. */
export const CONTACT_HEADS_UP: OpsReport = {
  key: "cannappy-contact-form",
  label: "cannappy.org contact form",
  title: "New message — cannappy.org",
  summary: "Someone used the contact form. Reply from your email.",
  priority: "default",
};

/** 'sent' or 'muted' (Chris stopped this kind) are done; 'failed' otherwise.
 * Never throws. */
export async function opsNotify(
  env: OpsNotifyEnv,
  report: OpsReport,
  fetchFn: typeof fetch = fetch,
): Promise<"sent" | "muted" | "failed"> {
  if (!env.OPS_NOTIFY_TOKEN) return "failed";
  try {
    const res = await fetchFn(OPS_NOTIFY_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPS_NOTIFY_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text().catch(() => "");
    if (res.status === 200) {
      const body = JSON.parse(text) as { sent?: unknown; muted?: unknown };
      if (body.sent === true) return "sent";
      if (body.muted === true) return "muted";
    }
    console.error("ops-notify failed", res.status, text.slice(0, 200));
    return "failed";
  } catch (e) {
    console.error("ops-notify failed", String(e).slice(0, 200));
    return "failed";
  }
}
