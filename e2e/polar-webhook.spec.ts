import { test, expect } from "@playwright/test";

/**
 * Polar webhook smoke — POSTs a mock `order.paid` to `/api/webhooks/polar`.
 *
 * - Unsigned path: works when the server has no `POLAR_WEBHOOK_SECRET`
 *   (signature verification is skipped). If the server *does* set the secret,
 *   the first POST returns 401 and the test skips rather than fails.
 * - Idempotency: replaying the same `webhook-id` returns `{ deduped: true }`.
 *
 * Skips entirely when no server is reachable at `baseURL`, so CI without a
 * server never fails and the build is never gated on this.
 */

async function serverUp(
  request: import("@playwright/test").APIRequestContext,
  baseURL?: string
) {
  if (!baseURL) return false;
  try {
    const res = await request.get("/", { timeout: 3000 });
    return res.ok();
  } catch {
    return false;
  }
}

function mockOrderPaid(id: string) {
  return JSON.stringify({
    type: "order.paid",
    data: {
      id,
      customer_email: "buyer@example.com",
      amount: 4200,
      currency: "usd",
    },
  });
}

test.describe("polar webhook", () => {
  test("accepts an order.paid event and dedupes a replay", async ({
    request,
    baseURL,
  }) => {
    test.skip(!(await serverUp(request, baseURL)), "no server at baseURL");

    const webhookId = `evt_smoke_${Date.now()}`;
    const body = mockOrderPaid(`ord_smoke_${Date.now()}`);
    const headers = {
      "content-type": "application/json",
      "webhook-id": webhookId,
      "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
    };

    const first = await request.post("/api/webhooks/polar", { headers, data: body });
    test.skip(
      first.status() === 401,
      "server has POLAR_WEBHOOK_SECRET set — unsigned smoke path disabled"
    );
    expect(first.ok()).toBeTruthy();
    expect(await first.json()).toMatchObject({ received: true });

    // Replay the same webhook-id — the D1 `webhook_events` ledger should dedupe.
    const replay = await request.post("/api/webhooks/polar", { headers, data: body });
    expect(replay.ok()).toBeTruthy();
    expect(await replay.json()).toMatchObject({ received: true, deduped: true });
  });
});
