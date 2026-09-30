/**
 * The two pieces of Whop's API the starter needs, on plain `fetch` and WebCrypto so no
 * SDK ships in the Worker bundle: creating a checkout link, and verifying webhooks.
 */

/** Whop's membership object, as sent in `membership.*` webhooks (fields we read). */
export interface WhopMembership {
  id: string;
  status: string;
  plan_id: string;
  product_id: string;
  user_id: string | null;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  manage_url: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
}

export interface WhopWebhook {
  id: string;
  type: string;
  timestamp: string;
  data: unknown;
}

/** Payments are on when the API key and the plan to sell are both set. */
export function billingEnabled(env: Env): boolean {
  return Boolean(env.WHOP_API_KEY && env.WHOP_PLAN_ID);
}

/**
 * Creates a hosted checkout for `WHOP_PLAN_ID` and returns its URL. `metadata` is copied
 * onto the membership Whop creates, which is how the webhook knows which user paid.
 */
export async function createCheckout(
  env: Env,
  input: { metadata: Record<string, string>; redirectUrl?: string | undefined },
): Promise<string> {
  const response = await fetch(`${env.WHOP_API_URL}/checkout_configurations`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.WHOP_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      plan_id: env.WHOP_PLAN_ID,
      metadata: input.metadata,
      ...(input.redirectUrl && { redirect_url: input.redirectUrl }),
    }),
  });
  if (!response.ok) {
    throw new Error(`Whop checkout failed: ${response.status} ${await response.text()}`);
  }
  const body = (await response.json()) as { purchase_url?: string | null };
  if (!body.purchase_url) throw new Error("Whop returned no purchase_url");
  return body.purchase_url;
}

/** Webhooks older than this are rejected, so a captured request can't be replayed later. */
const TOLERANCE_SECONDS = 5 * 60;

/**
 * Verifies a Whop webhook (the Standard Webhooks scheme) and returns the parsed body, or
 * `null` if the signature doesn't check out. `payload` must be the raw request body.
 *
 * Whop signs `${webhook-id}.${webhook-timestamp}.${body}` with HMAC-SHA256, keyed with the
 * UTF-8 bytes of the secret exactly as the dashboard shows it (`ws_…`, prefix included).
 * `webhook-signature` holds one or more space-separated `v1,<base64>` signatures.
 */
export async function verifyWebhook(
  payload: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
): Promise<WhopWebhook | null> {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return null;

  const seconds = Number(timestamp);
  if (!Number.isInteger(seconds) || Math.abs(now / 1000 - seconds) > TOLERANCE_SECONDS) {
    return null;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signed = encoder.encode(`${id}.${timestamp}.${payload}`);

  for (const candidate of signatures.split(" ")) {
    const [version, value] = candidate.split(",", 2);
    if (version !== "v1" || !value) continue;
    const signature = decodeBase64(value);
    // `verify` compares in constant time.
    if (signature && (await crypto.subtle.verify("HMAC", key, signature, signed))) {
      return JSON.parse(payload) as WhopWebhook;
    }
  }
  return null;
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}
