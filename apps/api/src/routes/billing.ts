import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { parseOrigins } from "../auth.ts";
import { currentSubscription, isEntitled, subscriptionJson } from "../billing/subscription.ts";
import { billingEnabled, createCheckout } from "../billing/whop.ts";
import type { AuthedEnv } from "../env.ts";
import { validate } from "../lib/validation.ts";

const checkoutBody = z.object({
  // Where Whop sends the buyer after paying. Must be on an origin in TRUSTED_ORIGINS.
  returnUrl: z.string().max(2048).optional(),
});

/**
 * Payments through Whop. The browser (or app) asks for a checkout link, the buyer pays on
 * Whop, and Whop's webhook (src/routes/webhooks.ts) records the membership in D1 and
 * pushes a `billing.updated` event, so no one ever polls Whop.
 */
export const billing = new Hono<AuthedEnv>()
  .get("/", async (c) => {
    const row = await currentSubscription(c.var.db, c.var.user.id);
    return c.json({
      enabled: billingEnabled(c.env),
      active: isEntitled(row),
      subscription: row ? subscriptionJson(row) : null,
    });
  })
  .post("/checkout", validate("json", checkoutBody), async (c) => {
    if (!billingEnabled(c.env)) {
      throw new HTTPException(503, { message: "Payments are not set up" });
    }
    const { returnUrl } = c.req.valid("json");
    if (returnUrl && !isTrustedUrl(returnUrl, c.env.TRUSTED_ORIGINS)) {
      throw new HTTPException(400, { message: "returnUrl must be on a trusted origin" });
    }
    const url = await createCheckout(c.env, {
      metadata: { user_id: c.var.user.id },
      redirectUrl: returnUrl,
    });
    return c.json({ url });
  });

/** `https://app.example.com/…` or `bismillah://…` when that origin is trusted. */
function isTrustedUrl(url: string, trusted: string): boolean {
  return parseOrigins(trusted).some((origin) =>
    origin.endsWith("://")
      ? url.startsWith(origin)
      : url === origin || url.startsWith(`${origin}/`),
  );
}
