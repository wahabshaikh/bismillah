import { env } from "cloudflare:workers";
import { getSession } from "@/lib/session";
import {
  isOrgsEnabled,
  getUserOrgRole,
  createInvitation,
  isOrgRole,
} from "@/lib/orgs";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/orgs/:id/invite { email, role? }
 *
 * Stub: records a `pending` row in `invitation`. No email is sent in this
 * slice. 404 when orgs are disabled; 403 unless the caller is an owner/admin
 * of the org.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isOrgsEnabled(env)) {
    return Response.json({ error: "orgs disabled" }, { status: 404 });
  }
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(env, clientId(request), {
    key: "orgs-invite",
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const { id: orgId } = await params;
  const role = await getUserOrgRole(env, orgId, session.user.id);
  if (role !== "owner" && role !== "admin") {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    role?: string;
  };
  if (typeof body.email !== "string" || !body.email.trim()) {
    return Response.json({ error: "email is required" }, { status: 400 });
  }
  const inviteRole =
    typeof body.role === "string" && isOrgRole(body.role) ? body.role : "member";

  const result = await createInvitation(env, {
    orgId,
    email: body.email,
    role: inviteRole,
    inviterId: session.user.id,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ id: result.id });
}
