/**
 * Request rate limiter backed by Cloudflare's native Rate Limiting binding.
 *
 * This deliberately does not use Workers KV: KV's free tier permits only
 * 1,000 writes/day, while a KV counter consumes one write for every request
 * (including rejected traffic). Native counters are local, asynchronous, and
 * do not consume the account's KV write quota.
 *
 * Demo-safe: if a binding is unavailable the limiter fails open rather than
 * crashing the route. Wrangler provides the bindings in deployed environments.
 */

export type RateLimitEnv = {
  RATE_LIMITER_8?: RateLimit;
  RATE_LIMITER_10?: RateLimit;
  RATE_LIMITER_12?: RateLimit;
  RATE_LIMITER_20?: RateLimit;
  RATE_LIMITER_30?: RateLimit;
  RATE_LIMITER_60?: RateLimit;
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

type SupportedLimit = 8 | 10 | 12 | 20 | 30 | 60;

function bindingFor(env: RateLimitEnv, limit: number): RateLimit | undefined {
  const bindings: Partial<Record<SupportedLimit, RateLimit | undefined>> = {
    8: env.RATE_LIMITER_8,
    10: env.RATE_LIMITER_10,
    12: env.RATE_LIMITER_12,
    20: env.RATE_LIMITER_20,
    30: env.RATE_LIMITER_30,
    60: env.RATE_LIMITER_60,
  };
  return bindings[limit as SupportedLimit];
}

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
  const limiter = windowSeconds === 60 ? bindingFor(env, limit) : undefined;
  if (!limiter) return fallback;

  try {
    const { success } = await limiter.limit({ key: `${key}:${identifier}` });
    return {
      ok: success,
      // Native rate limiting intentionally exposes only success/failure.
      remaining: success ? limit : 0,
      limit,
      resetSeconds: windowSeconds - ((Date.now() / 1000) % windowSeconds),
    };
  } catch (err) {
    console.error("[rate-limit] native binding error — failing open", err);
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
