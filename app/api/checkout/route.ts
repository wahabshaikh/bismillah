import { headers } from "next/headers";
import { env } from "cloudflare:workers";
import { createAuth } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/polar";
import { getSiteUrl } from "@/lib/site";

/**
 * GET /api/checkout — create a Polar checkout and redirect to hosted checkout.
 *
 * - default: one-time halal fair-price product (`POLAR_PRODUCT_ID`)
 * - `?type=subscription`: stub using `POLAR_SUBSCRIPTION_PRODUCT_ID` when set
 *
 * When signed in, the buyer's email + user id are attached so the Polar
 * customer links up for later customer-portal access.
 * Graceful 503 JSON when the relevant `POLAR_*` secrets are missing.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "subscription"
    ? "subscription"
    : "one-time";

  let customerEmail: string | null = null;
  let customerExternalId: string | null = null;
  try {
    const session = await createAuth(env, request).api.getSession({
      headers: await headers(),
    });
    if (session) {
      customerEmail = session.user.email;
      customerExternalId = session.user.id;
    }
  } catch {
    // not signed in — anonymous checkout is fine
  }

  const origin = getSiteUrl(env, request);
  const result = await createCheckoutSession(env, {
    successUrl: `${origin}/checkout/success`,
    customerIpAddress: request.headers.get("cf-connecting-ip"),
    customerEmail,
    customerExternalId,
    type,
  });

  if (!result.ok) {
    return Response.json(
      {
        error: result.error,
        hint: "Set POLAR_ACCESS_TOKEN and the product id via `wrangler secret put`.",
      },
      { status: result.status }
    );
  }

  return Response.redirect(result.url, 302);
}
