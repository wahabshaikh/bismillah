import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { parseOrigins } from "../auth.ts";
import type { AuthedEnv } from "../env.ts";

/**
 * `GET /v1/events` upgrades to a WebSocket that streams the signed-in user's
 * `UserEvent`s as JSON text frames (see src/realtime/events.ts).
 *
 * Browsers send the session cookie with the handshake, but CORS doesn't apply to
 * WebSockets, so the Origin is checked here to stop other sites from opening one
 * with the user's cookie. Native clients either send no Origin or the API's own.
 */
export const events = new Hono<AuthedEnv>().get("/", (c) => {
  if (c.req.header("upgrade")?.toLowerCase() !== "websocket") {
    throw new HTTPException(426, { message: "Expected a WebSocket upgrade" });
  }
  const origin = c.req.header("origin");
  if (
    origin &&
    origin !== new URL(c.req.url).origin &&
    !parseOrigins(c.env.TRUSTED_ORIGINS).includes(origin)
  ) {
    throw new HTTPException(403, { message: "Origin not allowed" });
  }
  return c.env.USER_EVENTS.getByName(c.var.user.id).fetch(c.req.raw);
});
