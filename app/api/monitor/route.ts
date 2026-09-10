import { env } from "cloudflare:workers";
import { captureMessage } from "@/lib/monitoring";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/monitor — best-effort client error sink. `app/error.tsx` posts here
 * so browser exceptions reach `lib/monitoring.ts` (Sentry envelope when
 * `SENTRY_DSN` is set, structured console.error otherwise).
 */
export async function POST(request: Request) {
  const rl = await rateLimit(env, clientId(request), {
    key: "monitor",
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    digest?: string;
    url?: string;
  };
  await captureMessage(env, `client error: ${body.message ?? "unknown"}`, {
    digest: body.digest,
    url: body.url,
    source: "app/error.tsx",
  });
  return Response.json({ received: true });
}
