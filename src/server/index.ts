import { routePartykitRequest, Server } from "partyserver";

import type { OutgoingMessage, Position } from "../shared";
import type { Connection, ConnectionContext } from "partyserver";

// This is the state that we'll store on each connection
type ConnectionState = {
  position: Position;
};

export class Globe extends Server {
  onConnect(conn: Connection<ConnectionState>, ctx: ConnectionContext) {
    // Whenever a fresh connection is made, we'll
    // send the entire state to the new connection

    // First, let's extract the position from the Cloudflare headers
    const latitude = ctx.request.cf?.latitude as string | undefined;
    const longitude = ctx.request.cf?.longitude as string | undefined;
    if (!latitude || !longitude) {
      console.warn(`Missing position information for connection ${conn.id}`);
      return;
    }
    const position = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
      id: conn.id,
    };
    // And save this on the connection's state
    conn.setState({
      position,
    });

    // Now, let's send the entire state to the new connection
    for (const connection of this.getConnections<ConnectionState>()) {
      try {
        conn.send(
          JSON.stringify({
            type: "add-marker",
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            position: connection.state!.position,
          } satisfies OutgoingMessage),
        );

        // And let's send the new connection's position to all other connections
        if (connection.id !== conn.id) {
          connection.send(
            JSON.stringify({
              type: "add-marker",
              position,
            } satisfies OutgoingMessage),
          );
        }
      } catch {
        this.onCloseOrError(conn);
      }
    }
  }

  // Whenever a connection closes (or errors), we'll broadcast a message to all
  // other connections to remove the marker.
  onCloseOrError(connection: Connection) {
    this.broadcast(
      JSON.stringify({
        type: "remove-marker",
        id: connection.id,
      } satisfies OutgoingMessage),
      [connection.id],
    );
  }

  onClose(connection: Connection): void | Promise<void> {
    this.onCloseOrError(connection);
  }

  onError(connection: Connection): void | Promise<void> {
    this.onCloseOrError(connection);
  }
}

// Extra bindings the contact endpoint expects. These are set as secrets/vars
// (RESEND_API_KEY via `wrangler secret put`); CONTACT_TO / CONTACT_FROM are
// optional overrides with sensible defaults below.
type ContactEnv = Env & {
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
};

const JSON_HEADERS = { "content-type": "application/json" };

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}

async function handleContact(
  request: Request,
  env: ContactEnv,
): Promise<Response> {
  let body: { name?: string; email?: string; message?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!name || !email || !message) {
    return Response.json(
      { error: "Please fill in every field." },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json(
      { error: "That email address looks off." },
      { status: 400 },
    );
  }
  if (message.length > 5000) {
    return Response.json({ error: "That message is too long." }, { status: 400 });
  }

  if (!env.RESEND_API_KEY) {
    console.error("Contact form: RESEND_API_KEY is not set");
    return Response.json(
      { error: "Email isn't configured yet — please reach out directly." },
      { status: 500 },
    );
  }

  const to = env.CONTACT_TO ?? "amgmpro@gmail.com";
  const from = env.CONTACT_FROM ?? "Cannappy Contact <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `[cannappy.org contact form] New message from ${name}`,
      text: `This message was submitted through the contact form on cannappy.org.

Name: ${name}
Email: ${email}

${message}`,
      html: `<p style="color:#5f625f;font-size:13px;margin:0 0 16px">This message was submitted through the contact form on <strong>cannappy.org</strong>.</p>
<p><strong>Name:</strong> ${escapeHtml(name)}</p>
<p><strong>Email:</strong> ${escapeHtml(email)}</p>
<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    }),
  });

  if (!res.ok) {
    console.error("Contact form: Resend error", res.status, await res.text());
    return Response.json(
      { error: "Something went wrong sending your message." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/contact") {
      return handleContact(request, env as ContactEnv);
    }
    return (
      (await routePartykitRequest(request, { ...env })) ||
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
