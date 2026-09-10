import { env } from "cloudflare:workers";
import { verifyPolarWebhook } from "@/lib/polar";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/webhooks/polar — Polar webhook receiver.
 * - Rate-limited per IP via `env.KV`.
 * - Verifies the Standard Webhooks signature when POLAR_WEBHOOK_SECRET is set.
 * - Idempotent: each `webhook-id` is recorded in D1 `webhook_events`; a repeat
 *   delivery is acknowledged with 200 and does nothing.
 * - On `order.paid` / `order.created` records the order in D1 `orders`.
 * - Always 200s for events it doesn't handle so Polar stops retrying.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(env, clientId(request), {
    key: "webhook",
    limit: 60,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const body = await request.text();
  const webhookId = request.headers.get("webhook-id");

  if (env.POLAR_WEBHOOK_SECRET) {
    const ok = await verifyPolarWebhook(env.POLAR_WEBHOOK_SECRET, body, {
      id: webhookId,
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    });
    if (!ok) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  // --- Idempotency: skip if this webhook id was already processed ---
  if (webhookId) {
    try {
      const seen = await env.DB.prepare(
        "SELECT id FROM webhook_events WHERE id = ?"
      )
        .bind(webhookId)
        .first<{ id: string }>();
      if (seen) {
        return Response.json({ received: true, deduped: true });
      }
      await env.DB.prepare(
        "INSERT OR IGNORE INTO webhook_events (id, type) VALUES (?, ?)"
      )
        .bind(webhookId, event.type ?? null)
        .run();
    } catch (err) {
      console.error("[polar webhook] idempotency check failed", err);
    }
  }

  if (event.type === "order.paid" || event.type === "order.created") {
    const order = (event.data ?? {}) as Record<string, unknown>;
    const polarOrderId = typeof order.id === "string" ? order.id : null;
    const email =
      (typeof order.customer_email === "string" && order.customer_email) ||
      (typeof order.customerEmail === "string" && order.customerEmail) ||
      null;
    const amount =
      typeof order.amount === "number"
        ? order.amount
        : typeof order.total_amount === "number"
          ? order.total_amount
          : null;
    const currency = typeof order.currency === "string" ? order.currency : null;

    try {
      const existing = polarOrderId
        ? await env.DB.prepare("SELECT id FROM orders WHERE polar_order_id = ?")
            .bind(polarOrderId)
            .first<{ id: string }>()
        : null;

      if (!existing) {
        await env.DB.prepare(
          `INSERT INTO orders (id, polar_order_id, email, amount, currency, status)
           VALUES (?, ?, ?, ?, ?, 'paid')`
        )
          .bind(crypto.randomUUID(), polarOrderId, email, amount, currency)
          .run();
      }
    } catch (err) {
      console.error("[polar webhook] failed to store order", err);
    }
  } else {
    console.log("[polar webhook] ignored event", event.type);
  }

  return Response.json({ received: true });
}
