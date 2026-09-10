import { env } from "cloudflare:workers";
import { getSession } from "@/lib/session";
import {
  recordUsage,
  getUsageSummary,
  DEFAULT_METER,
} from "@/lib/usage";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET  /api/usage → current-month summary for the signed-in user.
 * POST /api/usage → record a small demo unit (session-gated, rate-limited).
 *
 * Display-only metering stub — this does not bill through Polar. See
 * `lib/usage.ts` `ingestPolarUsage` for the real hook.
 */

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const summary = await getUsageSummary(env, session.user.id);
  return Response.json({ summary });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(env, clientId(request), {
    key: "usage",
    limit: 12,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await request.json().catch(() => ({}))) as { units?: number };
  const units = Number.isFinite(body.units)
    ? Math.max(1, Math.min(100, Math.floor(body.units as number)))
    : 1;

  await recordUsage(env, {
    userId: session.user.id,
    meter: DEFAULT_METER,
    units,
  });
  const summary = await getUsageSummary(env, session.user.id);
  return Response.json({ summary });
}
