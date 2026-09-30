import { desc, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Db } from "../db/index.ts";
import { type Subscription, subscription } from "../db/schema.ts";
import type { AuthedEnv } from "../env.ts";

/**
 * Whop membership statuses that grant access. `past_due` is Whop's grace period after a
 * failed renewal, `canceling` keeps access until the period ends, and `completed` is a
 * finished one-time purchase, which keeps access.
 */
const ENTITLED = new Set(["active", "trialing", "past_due", "canceling", "completed"]);

export function isEntitled(row: Pick<Subscription, "status"> | null | undefined): boolean {
  return row ? ENTITLED.has(row.status) : false;
}

/**
 * The user's subscription that matters: one that grants access if there is one, else the
 * most recently changed. One indexed D1 read.
 */
export async function currentSubscription(db: Db, userId: string): Promise<Subscription | null> {
  const rows = await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .orderBy(desc(subscription.whopUpdatedAt));
  return rows.find(isEntitled) ?? rows[0] ?? null;
}

/** The public shape of a subscription, shared by `GET /v1/billing` and realtime events. */
export function subscriptionJson(row: Subscription) {
  return {
    id: row.id,
    planId: row.planId,
    status: row.status,
    active: isEntitled(row),
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    manageUrl: row.manageUrl,
  };
}

export type SubscriptionJson = ReturnType<typeof subscriptionJson>;

/**
 * Put after `requireAuth` to make routes paid-only: answers 402 unless the user has a
 * subscription that grants access. Costs one D1 read per request.
 *
 * @example new Hono<AuthedEnv>().use(requireSubscription).get("/pro", ...)
 */
export const requireSubscription = createMiddleware<AuthedEnv>(async (c, next) => {
  if (!isEntitled(await currentSubscription(c.var.db, c.var.user.id))) {
    throw new HTTPException(402, { message: "A subscription is required" });
  }
  await next();
});
