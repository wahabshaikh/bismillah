/**
 * Fixed-window rate limiter backed by the app `KV` namespace.
 *
 * IMPORTANT: uses `env.KV` (app namespace) — never `VINEXT_KV_CACHE`, which is
 * reserved for vinext's ISR/data cache.
 *
 * Demo-safe: if `KV` is somehow unbound the limiter fails open (allows the
 * request) rather than crashing the route.
 */

export type RateLimitEnv = {
  KV?: KVNamespace;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
};

export type RateLimitOptions = {
  /** logical bucket name, e.g. "auth" or "webhook" */
  key: string;
  /** max requests allowed per window */
  limit: number;
  /** window length in seconds */
  windowSeconds: number;
};

export async function rateLimit(
  env: RateLimitEnv,
  identifier: string,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = opts;
  const fallback: RateLimitResult = {
    ok: true,
    remaining: limit,
    limit,
    resetSeconds: windowSeconds,
  };
  if (!env.KV) return fallback;

  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const kvKey = `rl:${key}:${identifier}:${window}`;

  try {
    const current = Number((await env.KV.get(kvKey)) ?? "0");
    const next = current + 1;
    // TTL a little past the window so counters self-expire.
    await env.KV.put(kvKey, String(next), { expirationTtl: windowSeconds + 60 });
    return {
      ok: next <= limit,
      remaining: Math.max(0, limit - next),
      limit,
      resetSeconds: windowSeconds - ((Date.now() / 1000) % windowSeconds),
    };
  } catch (err) {
    console.error("[rate-limit] KV error — failing open", err);
    return fallback;
  }
}

/** Best-effort client identifier from Cloudflare headers. */
export function clientId(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: "Too many requests", retryAfterSeconds: Math.ceil(result.resetSeconds) },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(result.resetSeconds)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}
