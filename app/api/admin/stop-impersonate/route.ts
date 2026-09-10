import { env } from "cloudflare:workers";
import { createAuth } from "@/lib/auth";

/**
 * POST /api/admin/stop-impersonate
 *
 * Restores the original admin session from the `admin_session` cookie that
 * `impersonateUser` set. If that cookie is gone, the caller should just sign
 * out. Safe to call by anyone — Better Auth 400s when there is nothing to stop.
 */
export async function POST(request: Request) {
  const auth = createAuth(env, request);
  try {
    return await auth.api.stopImpersonating({
      headers: request.headers,
      asResponse: true,
    });
  } catch {
    return Response.json(
      { error: "not impersonating — sign out instead" },
      { status: 400 }
    );
  }
}
