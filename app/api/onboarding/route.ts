import { env } from "cloudflare:workers";
import { getSession } from "@/lib/session";
import {
  getOnboarding,
  markStep,
  dismissOnboarding,
  ONBOARDING_STEPS,
} from "@/lib/onboarding";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET  /api/onboarding            → { steps, state } for the signed-in user
 * POST /api/onboarding            → { action: "complete_step", stepId } | { action: "dismiss" }
 *
 * Session-gated. Lightly rate-limited via `env.KV`.
 */

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const state = await getOnboarding(env, session.user.id);
  return Response.json({ steps: ONBOARDING_STEPS, state });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(env, clientId(request), {
    key: "onboarding",
    limit: 30,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    stepId?: string;
  };

  if (body.action === "dismiss") {
    const state = await dismissOnboarding(env, session.user.id);
    return Response.json({ state });
  }

  if (body.action === "complete_step") {
    if (!body.stepId) {
      return Response.json({ error: "stepId is required" }, { status: 400 });
    }
    const state = await markStep(env, session.user.id, body.stepId);
    return Response.json({ state });
  }

  return Response.json({ error: "unknown action" }, { status: 400 });
}
