import { env } from "cloudflare:workers";
import { createAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import {
  isSuperAdmin,
  ensureAdminRole,
  findTargetUser,
} from "@/lib/admin";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/admin/impersonate  { target: "<email or user id>" }
 *
 * ⚠️ RISK: on success the caller's session cookie is swapped for a full session
 * as the target user — complete account access. Guarded by the `ADMIN_EMAILS`
 * allowlist and a block on impersonating other admins. Production should also
 * require MFA and write an audit-log row here.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!isSuperAdmin(env, session.user.email)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const rl = await rateLimit(env, clientId(request), {
    key: "admin-impersonate",
    limit: 10,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await request.json().catch(() => ({}))) as { target?: string };
  const target = (body.target ?? "").trim();
  if (!target) {
    return Response.json({ error: "target is required" }, { status: 400 });
  }

  const targetUser = await findTargetUser(env, target);
  if (!targetUser) {
    return Response.json({ error: "user not found" }, { status: 404 });
  }
  if (targetUser.id === session.user.id) {
    return Response.json({ error: "that is you" }, { status: 400 });
  }
  if (isSuperAdmin(env, targetUser.email) || targetUser.role === "admin") {
    return Response.json(
      { error: "cannot impersonate another admin" },
      { status: 403 }
    );
  }

  // Let Better Auth's own permission check pass for an allowlisted caller.
  await ensureAdminRole(env, session.user.id);

  const auth = createAuth(env, request);
  try {
    // Returns a Response whose Set-Cookie swaps the session to the target user
    // and stores an `admin_session` cookie so /stop-impersonate can restore.
    return await auth.api.impersonateUser({
      body: { userId: targetUser.id },
      headers: request.headers,
      asResponse: true,
    });
  } catch (err) {
    console.error("[admin] impersonate failed", err);
    return Response.json({ error: "impersonation failed" }, { status: 500 });
  }
}
