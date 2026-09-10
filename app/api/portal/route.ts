import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { createAuth } from "@/lib/auth";
import { createPortalLink } from "@/lib/polar";

/**
 * GET /api/portal — redirect a signed-in user to their Polar customer portal.
 *
 * The Polar customer is matched by external id (= Better Auth user id), which
 * is set on the checkout session. If the user hasn't bought anything yet there
 * is no Polar customer, so we return a soft 503 with a setup message rather
 * than an error.
 */
export async function GET(request: Request) {
  const session = await createAuth(env, request).api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return Response.redirect(new URL("/login", request.url).toString(), 302);
  }

  const result = await createPortalLink(env, {
    customerExternalId: session.user.id,
  });

  if (!result.ok) {
    return Response.json(
      {
        error: result.error,
        setup: result.setup ?? false,
        hint: "Complete a checkout first, or set POLAR_ACCESS_TOKEN.",
      },
      { status: result.status }
    );
  }

  return Response.redirect(result.url, 302);
}
