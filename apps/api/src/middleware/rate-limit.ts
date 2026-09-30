import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env.ts";

/**
 * Throttles by client IP with the Workers Rate Limiting API. Counters are kept per
 * Cloudflare location and cost nothing, so brute-force traffic never reaches D1.
 */
export function rateLimit(binding: (env: Env) => RateLimit) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") ?? "unknown";
    const { success } = await binding(c.env).limit({ key: `${ip}:${c.req.path}` });
    if (!success) {
      return c.json({ error: "Too many requests" }, 429, { "Retry-After": "60" });
    }
    return next();
  });
}
