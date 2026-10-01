import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { subscriptionJson } from "../billing/subscription.ts";
import { verifyWebhook, type WhopMembership } from "../billing/whop.ts";
import { schema } from "../db/index.ts";
import type { AppEnv } from "../env.ts";
import { publish } from "../realtime/events.ts";

const { subscription, user } = schema;

/** Every one of these carries the full membership, so each is handled the same way. */
const MEMBERSHIP_EVENTS = new Set([
  "membership.activated",
  "membership.deactivated",
  "membership.cancel_at_period_end_changed",
]);

/**
 * `POST /webhooks/whop`, the endpoint you register in Whop's dashboard. Whop retries any
 * non-2xx answer, and deliveries can repeat or arrive out of order, so the write below is
 * an upsert that only moves forward in Whop's `updated_at`.
 */
export const webhooks = new Hono<AppEnv>().post("/whop", async (c) => {
  const secret = c.env.WHOP_WEBHOOK_SECRET;
  if (!secret) throw new HTTPException(503, { message: "Whop webhooks are not set up" });

  const event = await verifyWebhook(await c.req.text(), c.req.raw.headers, secret);
  if (!event) throw new HTTPException(401, { message: "Invalid signature" });
  if (!MEMBERSHIP_EVENTS.has(event.type)) return c.json({ ok: true, ignored: event.type });

  const membership = event.data as WhopMembership;
  const userId = membership.metadata?.["user_id"];
  if (typeof userId !== "string") {
    // Bought outside this app's checkout (e.g. straight from your Whop store page).
    console.warn("Whop membership without a user_id", { membership: membership.id });
    return c.json({ ok: true, ignored: "no user_id" });
  }
  const [owner] = await c.var.db.select({ id: user.id }).from(user).where(eq(user.id, userId));
  if (!owner) return c.json({ ok: true, ignored: "unknown user" });

  const values = {
    planId: membership.plan_id,
    productId: membership.product_id,
    status: membership.status,
    cancelAtPeriodEnd: membership.cancel_at_period_end,
    currentPeriodEnd: membership.current_period_end
      ? new Date(membership.current_period_end)
      : null,
    manageUrl: membership.manage_url,
    whopUpdatedAt: new Date(membership.updated_at),
  };
  const [row] = await c.var.db
    .insert(subscription)
    .values({ id: membership.id, userId, ...values })
    .onConflictDoUpdate({
      target: subscription.id,
      set: { ...values, updatedAt: new Date() },
      // A stale redelivery changes nothing and returns no row.
      setWhere: sql`excluded.whop_updated_at >= ${subscription.whopUpdatedAt}`,
    })
    .returning();

  if (row) {
    c.executionCtx.waitUntil(
      publish(c.env, userId, {
        type: "billing.updated",
        subscription: subscriptionJson(row),
      }).catch((error: unknown) => console.error("billing.updated publish failed", error)),
    );
  }
  return c.json({ ok: true });
});
