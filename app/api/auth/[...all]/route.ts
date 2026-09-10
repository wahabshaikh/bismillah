import { env } from "cloudflare:workers";
import { createAuth } from "@/lib/auth";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * Better Auth catch-all handler. Handles sign-in / sign-up / magic-link /
 * OAuth / session / sign-out under `/api/auth/*`.
 *
 * Rate-limited per IP via `env.KV` (fixed window) — protects the credential
 * and magic-link endpoints from brute force / email flooding.
 */
async function handler(request: Request) {
  const rl = await rateLimit(env, clientId(request), {
    key: "auth",
    limit: 30,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  return createAuth(env, request).handler(request);
}

export { handler as GET, handler as POST };
