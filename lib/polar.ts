/**
 * Thin Polar helper. Halal framing: one-time fair paid product — no BNPL/riba.
 */
import { Polar } from "@polar-sh/sdk";

export type PolarEnv = {
  POLAR_ACCESS_TOKEN?: string;
  POLAR_PRODUCT_ID?: string;
  POLAR_SUBSCRIPTION_PRODUCT_ID?: string;
  POLAR_SERVER?: string;
  POLAR_WEBHOOK_SECRET?: string;
};

export function createPolarClient(env: PolarEnv) {
  if (!env.POLAR_ACCESS_TOKEN) return null;
  const server: "sandbox" | "production" =
    env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";
  return new Polar({
    accessToken: env.POLAR_ACCESS_TOKEN,
    server,
  });
}

export type CheckoutSessionResult =
  | { ok: true; url: string; id: string }
  | { ok: false; error: string; status: 503 };

export async function createCheckoutSession(
  env: PolarEnv,
  opts: {
    successUrl: string;
    customerIpAddress?: string | null;
    customerEmail?: string | null;
    /** Better Auth user id — links the Polar customer for later portal access */
    customerExternalId?: string | null;
    /** "one-time" (default, halal fair price) or "subscription" (stub) */
    type?: "one-time" | "subscription";
  }
): Promise<CheckoutSessionResult> {
  const polar = createPolarClient(env);
  if (!polar) {
    return { ok: false, error: "POLAR_ACCESS_TOKEN not set", status: 503 };
  }

  const isSubscription = opts.type === "subscription";
  const productId = isSubscription
    ? env.POLAR_SUBSCRIPTION_PRODUCT_ID
    : env.POLAR_PRODUCT_ID;
  const envName = isSubscription
    ? "POLAR_SUBSCRIPTION_PRODUCT_ID"
    : "POLAR_PRODUCT_ID";

  if (!productId || productId === "replace-me") {
    return {
      ok: false,
      error: `${envName} not set (use your Polar product id)`,
      status: 503,
    };
  }

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: opts.successUrl,
      customerIpAddress: opts.customerIpAddress ?? undefined,
      customerEmail: opts.customerEmail ?? undefined,
      externalCustomerId: opts.customerExternalId ?? undefined,
    });
    return { ok: true, url: checkout.url, id: checkout.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "checkout failed",
      status: 503,
    };
  }
}

export type PortalLinkResult =
  | { ok: true; url: string }
  | { ok: false; error: string; status: 503; setup?: boolean };

/**
 * Customer portal link. Polar identifies the customer by the external id we
 * pass when a checkout is created — here we use the Better Auth user id.
 * When Polar has no matching customer yet (nothing bought), this returns a
 * soft `setup` result so the UI can show a "make a purchase first" message
 * rather than erroring.
 */
export async function createPortalLink(
  env: PolarEnv,
  opts: { customerExternalId?: string | null }
): Promise<PortalLinkResult> {
  const polar = createPolarClient(env);
  if (!polar) {
    return { ok: false, error: "POLAR_ACCESS_TOKEN not set", status: 503 };
  }
  if (!opts.customerExternalId) {
    return {
      ok: false,
      error: "No Polar customer on file yet — complete a purchase first.",
      status: 503,
      setup: true,
    };
  }

  try {
    const session = await polar.customerSessions.create({
      externalCustomerId: opts.customerExternalId,
    });
    return { ok: true, url: session.customerPortalUrl };
  } catch {
    return {
      ok: false,
      error: "No Polar customer on file yet — complete a purchase first.",
      status: 503,
      setup: true,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Standard Webhooks signature verification — Web Crypto only, so it   */
/* runs on Workers without Node `crypto` / `Buffer`.                   */
/* ------------------------------------------------------------------ */

function textToBuffer(input: string): ArrayBuffer {
  const u = new TextEncoder().encode(input);
  const buf = new ArrayBuffer(u.byteLength);
  new Uint8Array(buf).set(u);
  return buf;
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return buf;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verify a Polar webhook using the Standard Webhooks scheme.
 * `secret` may be prefixed with `whsec_` (base64-encoded key).
 */
export async function verifyPolarWebhook(
  secret: string,
  payload: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  }
): Promise<boolean> {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;

  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let keyBuffer: ArrayBuffer;
  try {
    keyBuffer = base64ToBuffer(raw);
  } catch {
    keyBuffer = textToBuffer(raw);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedContent = `${headers.id}.${headers.timestamp}.${payload}`;
  const mac = await crypto.subtle.sign("HMAC", key, textToBuffer(signedContent));
  const expected = bytesToBase64(new Uint8Array(mac));

  // header is a space-delimited list of `v1,<base64sig>` entries
  return headers.signature.split(" ").some((part) => {
    const comma = part.indexOf(",");
    const value = comma === -1 ? part : part.slice(comma + 1);
    return value.length > 0 && timingSafeEqual(value, expected);
  });
}
