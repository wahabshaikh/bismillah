import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { AppEnv, AuthedEnv } from "../env.ts";

/**
 * Loads the Better Auth session (one KV read) into `c.var.user` / `c.var.session`.
 * Mounted only on routes that care, so /health and friends cost nothing.
 */
export const loadSession = createMiddleware<AppEnv>(async (c, next) => {
  const result = await c.var.auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", result?.user ?? null);
  c.set("session", result?.session ?? null);
  await next();
});

/** Rejects the request with 401 unless `loadSession` found a session. */
export const requireAuth = createMiddleware<AuthedEnv>(async (c, next) => {
  if (!c.var.user || !c.var.session) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  await next();
});
