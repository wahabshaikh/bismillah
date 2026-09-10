import { env } from "cloudflare:workers";
import { getSession } from "@/lib/session";
import { isOrgsEnabled, listUserOrgs, createOrganization } from "@/lib/orgs";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET  /api/orgs        → { orgs } for the signed-in user
 * POST /api/orgs { name, slug? } → creates an org, caller becomes `owner`
 *
 * Both 404 when `ENABLE_ORGS` is not "true" — the feature is off by default.
 */
function disabled() {
  return Response.json({ error: "orgs disabled" }, { status: 404 });
}

export async function GET() {
  if (!isOrgsEnabled(env)) return disabled();
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const orgs = await listUserOrgs(env, session.user.id);
  return Response.json({ orgs });
}

export async function POST(request: Request) {
  if (!isOrgsEnabled(env)) return disabled();
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(env, clientId(request), {
    key: "orgs",
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    slug?: string;
  };
  if (typeof body.name !== "string" || !body.name.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  const result = await createOrganization(env, {
    name: body.name,
    slug: body.slug,
    userId: session.user.id,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({ org: result.org });
}
