// StrainGuide video-review submissions.
//
// The phone never uploads through this Worker. The flow is:
//
//   1. POST /api/strainguide/submissions   (Bearer = the user's Supabase JWT)
//        - verify the JWT against Supabase Auth (rejects anonymous sessions)
//        - open a Cloudflare Stream *direct creator upload* (TUS, resumable)
//        - insert a `video_submissions` row AS THE USER (RLS is the auth check;
//          no service-role key lives here)
//        → { id, uid, uploadUrl }
//   2. the browser PATCHes the file straight to upload.cloudflarestream.com
//   3. POST /api/strainguide/submissions/:id/complete  → status 'pending'
//
// Curation (approve / reject / feature) is not here; it's a service-role job.

export type SubmissionsEnv = {
  CF_ACCOUNT_ID?: string;
  CLOUDFLARE_STREAM_API_TOKEN?: string; // secret, needs Stream:Edit
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string; // secret (publishable, but keep it out of git)
  // The new-submission email reuses the contact form's Resend setup. Optional:
  // without a key the upload still completes, you just don't hear about it.
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
};

type CompletedSubmission = {
  id: string;
  strain_name: string;
  strain_slug: string | null;
  handle: string;
  platform: string | null;
  stream_uid: string;
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/**
 * Emails CONTACT_TO that a review finished uploading, so new submissions don't
 * sit unseen in Supabase. Called only when the row actually moved from
 * 'uploading' to 'pending', so a retried /complete doesn't email twice.
 *
 * Never throws and never fails the request: the user's upload is done either
 * way, and a mail outage shouldn't tell them otherwise.
 */
async function notifyNewSubmission(env: SubmissionsEnv, row: CompletedSubmission): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.error("video submission email skipped: RESEND_API_KEY is not set");
    return;
  }
  const streamUrl = `https://dash.cloudflare.com/${env.CF_ACCOUNT_ID}/stream/videos/${row.stream_uid}`;
  const lines = [
    `Strain: ${row.strain_name}${row.strain_slug ? ` (${row.strain_slug})` : ""}`,
    `Credit: @${row.handle}`,
    `Platform: ${row.platform ?? "unknown"}`,
    `Submission id: ${row.id}`,
    `Watch: ${streamUrl}`,
  ];
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM ?? "Cannappy Contact <onboarding@resend.dev>",
        to: [env.CONTACT_TO ?? "amgmpro@gmail.com"],
        subject: `[StrainGuide] New video review: ${row.strain_name} by @${row.handle}`,
        text: `A strain review video finished uploading and is pending review.\n\n${lines.join("\n")}\n\nApprove or reject it in Supabase: video_submissions.`,
        html: `<p>A strain review video finished uploading and is <strong>pending review</strong>.</p>
<p><strong>Strain:</strong> ${escapeHtml(row.strain_name)}${row.strain_slug ? ` (${escapeHtml(row.strain_slug)})` : ""}<br>
<strong>Credit:</strong> @${escapeHtml(row.handle)}<br>
<strong>Platform:</strong> ${escapeHtml(row.platform ?? "unknown")}<br>
<strong>Submission id:</strong> ${escapeHtml(row.id)}</p>
<p><a href="${escapeHtml(streamUrl)}">Watch it in Cloudflare Stream</a></p>
<p style="color:#5f625f;font-size:13px">Approve or reject it in Supabase: <code>video_submissions</code>.</p>`,
      }),
    });
    if (!res.ok) console.error("video submission email failed", res.status, await res.text());
  } catch (e) {
    console.error("video submission email threw", e);
  }
}

const MAX_DURATION_SECONDS = 200; // 3 minutes + slack
const MAX_BYTES = 1_500_000_000; // 1.5 GB — a 3-minute 4K phone clip fits
const PLATFORMS = new Set(["ios", "android", "web"]);

type SupabaseUser = { id: string; is_anonymous?: boolean };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function bearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

function configError(env: SubmissionsEnv): string | null {
  const missing = (
    [
      "CF_ACCOUNT_ID",
      "CLOUDFLARE_STREAM_API_TOKEN",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
    ] as const
  ).filter((k) => !env[k]);
  return missing.length ? `Missing config: ${missing.join(", ")}` : null;
}

async function verifyUser(
  env: SubmissionsEnv,
  token: string,
): Promise<SupabaseUser | null> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY!,
      authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as SupabaseUser;
  return user?.id ? user : null;
}

/** PostgREST call as the user: the JWT rides along so RLS applies. */
async function rest(
  env: SubmissionsEnv,
  token: string,
  path: string,
  init: RequestInit & { prefer?: string },
): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_ANON_KEY!,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.prefer ? { prefer: init.prefer } : {}),
      ...(init.headers ?? {}),
    },
  });
}

function b64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

/** Opens a TUS direct-creator upload. Returns the upload URL + video uid. */
async function createStreamUpload(
  env: SubmissionsEnv,
  opts: { size: number; name: string; creator: string; meta: Record<string, string> },
): Promise<{ uploadUrl: string; uid: string } | { error: string }> {
  // Upload-Metadata is a comma list of `key base64(value)` pairs; bare keys
  // are flags. requiresignedurls keeps the video unplayable until curation
  // decides to expose it (or the embed uses a signed token).
  const metadata = [
    `name ${b64(opts.name)}`,
    `maxDurationSeconds ${b64(String(MAX_DURATION_SECONDS))}`,
    "requiresignedurls",
  ].join(",");

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/stream?direct_user=true`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.CLOUDFLARE_STREAM_API_TOKEN}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(opts.size),
        "Upload-Metadata": metadata,
        "Upload-Creator": opts.creator,
      },
    },
  );

  const uploadUrl = res.headers.get("location");
  const uid = res.headers.get("stream-media-id");
  if (res.status !== 201 || !uploadUrl || !uid) {
    console.error("Stream direct upload failed", res.status, await res.text());
    return { error: "Couldn't open an upload. Try again in a minute." };
  }
  return { uploadUrl, uid };
}

type CreateBody = {
  strainName?: string;
  strainSlug?: string | null;
  handle?: string;
  platform?: string;
  fileSize?: number;
  attested?: boolean;
};

export async function handleCreateSubmission(
  request: Request,
  env: SubmissionsEnv,
): Promise<Response> {
  const cfg = configError(env);
  if (cfg) {
    console.error(cfg);
    return json({ error: "Submissions aren't configured yet." }, 500);
  }

  const token = bearer(request);
  if (!token) return json({ error: "Sign in to the app first." }, 401);

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const strainName = (body.strainName ?? "").trim();
  const strainSlug = (body.strainSlug ?? "").trim() || null;
  const handle = (body.handle ?? "").trim().replace(/^@/, "");
  const platform = PLATFORMS.has(body.platform ?? "") ? body.platform! : null;
  const size = Number(body.fileSize);

  if (body.attested !== true) return json({ error: "Please accept the terms." }, 400);
  if (!strainName || strainName.length > 120) return json({ error: "Which strain is this?" }, 400);
  if (!handle || handle.length > 40 || !/^[\w.\-]+$/.test(handle)) {
    return json({ error: "Give us a handle to credit (letters, numbers, . _ -)." }, 400);
  }
  if (!Number.isFinite(size) || size <= 0) return json({ error: "Pick a video first." }, 400);
  if (size > MAX_BYTES) return json({ error: "That file is too big. Keep it under 1.5 GB." }, 400);

  const user = await verifyUser(env, token);
  if (!user) return json({ error: "Your session expired. Reopen this from the app." }, 401);
  if (user.is_anonymous) return json({ error: "Create an account in the app so we can credit you." }, 403);

  const upload = await createStreamUpload(env, {
    size,
    name: `${strainName} — @${handle}`,
    creator: user.id,
    meta: { strainSlug: strainSlug ?? "", userId: user.id },
  });
  if ("error" in upload) return json({ error: upload.error }, 502);

  const insert = await rest(env, token, "video_submissions?select=id", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      user_id: user.id,
      strain_name: strainName,
      strain_slug: strainSlug,
      handle,
      platform,
      stream_uid: upload.uid,
      status: "uploading",
    }),
  });
  if (!insert.ok) {
    console.error("video_submissions insert failed", insert.status, await insert.text());
    return json({ error: "Couldn't record your submission. Try again." }, 502);
  }
  const rows = (await insert.json()) as Array<{ id: string }>;
  const id = rows[0]?.id;
  if (!id) return json({ error: "Couldn't record your submission. Try again." }, 502);

  return json({ id, uid: upload.uid, uploadUrl: upload.uploadUrl });
}

export async function handleCompleteSubmission(
  request: Request,
  env: SubmissionsEnv,
  id: string,
): Promise<Response> {
  const cfg = configError(env);
  if (cfg) return json({ error: "Submissions aren't configured yet." }, 500);

  const token = bearer(request);
  if (!token) return json({ error: "Sign in to the app first." }, 401);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Unknown submission." }, 404);

  // RLS only lets the owner move their own row from 'uploading' to 'pending';
  // the status filter here makes the call idempotent.
  const res = await rest(
    env,
    token,
    `video_submissions?id=eq.${id}&status=eq.uploading&select=id,strain_name,strain_slug,handle,platform,stream_uid`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify({
        status: "pending",
        uploaded_at: new Date().toISOString(),
      }),
    },
  );
  if (!res.ok) {
    console.error("video_submissions complete failed", res.status, await res.text());
    return json({ error: "Couldn't finish your submission." }, 502);
  }
  const rows = (await res.json()) as CompletedSubmission[];
  // Zero rows means this was a retry of an already-completed submission.
  if (rows.length === 1) await notifyNewSubmission(env, rows[0]);
  return json({ ok: true, updated: rows.length });
}

/** Route table for /api/strainguide/*. Returns null when the path isn't ours. */
export function routeSubmissions(
  request: Request,
  env: SubmissionsEnv,
  url: URL,
): Promise<Response> | null {
  if (request.method !== "POST") return null;
  if (url.pathname === "/api/strainguide/submissions") {
    return handleCreateSubmission(request, env);
  }
  const m = /^\/api\/strainguide\/submissions\/([^/]+)\/complete$/.exec(url.pathname);
  if (m) return handleCompleteSubmission(request, env, m[1]);
  return null;
}
