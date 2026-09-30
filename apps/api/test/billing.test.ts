import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.ts";
import { requireSubscription } from "../src/billing/subscription.ts";
import { verifyWebhook, type WhopMembership } from "../src/billing/whop.ts";
import type { AuthedEnv } from "../src/env.ts";
import { loadSession, requireAuth } from "../src/middleware/auth.ts";
import type { UserEvent } from "../src/realtime/events.ts";
import { request, signUp } from "./helpers.ts";

const SECRET = "ws_test_webhook_secret";

afterEach(() => {
  vi.restoreAllMocks();
});

/** Signs `body` the way Whop does (Standard Webhooks, keyed with the secret's raw bytes). */
async function sign(body: string, { secret = SECRET, at = Date.now(), id = "msg_1" } = {}) {
  const timestamp = String(Math.floor(at / 1000));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return new Headers({
    "content-type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${signature}`,
  });
}

/**
 * Answers requests to Whop's API with `status` and `body`; everything else goes through.
 * The answer is a stand-in rather than a real Response, whose body stream would belong to
 * the test's request context instead of the Worker's.
 */
function stubWhop(status: number, body: unknown = null) {
  const calls: [string, RequestInit | undefined][] = [];
  const real = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith("https://api.whop.com/")) return real(input, init);
    calls.push([url, init]);
    return {
      ok: status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  });
  return { calls };
}

function membership(userId: string, overrides: Partial<WhopMembership> = {}): WhopMembership {
  return {
    id: `mem_${crypto.randomUUID()}`,
    status: "active",
    plan_id: "plan_test",
    product_id: "prod_test",
    user_id: "user_whop",
    cancel_at_period_end: false,
    current_period_end: "2026-11-01T00:00:00.000Z",
    manage_url: null,
    metadata: { user_id: userId },
    updated_at: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

async function deliver(type: string, data: unknown, options?: Parameters<typeof sign>[1]) {
  const body = JSON.stringify({ id: "msg_1", type, timestamp: new Date().toISOString(), data });
  return request("/webhooks/whop", { method: "POST", headers: await sign(body, options), body });
}

async function billingOf(cookie: string) {
  const response = await request("/v1/billing", { headers: { cookie } });
  expect(response.status).toBe(200);
  return (await response.json()) as {
    enabled: boolean;
    active: boolean;
    subscription: { id: string; status: string; active: boolean } | null;
  };
}

describe("POST /v1/billing/checkout", () => {
  it("creates a Whop checkout tagged with the user's ID", async () => {
    const { cookie, body: signedUp } = await signUp();
    const whop = stubWhop(200, { id: "ch_1", purchase_url: "https://whop.com/checkout/ch_1" });

    const response = await request("/v1/billing/checkout", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ returnUrl: "http://localhost:3000/dashboard" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "https://whop.com/checkout/ch_1" });

    const [url, init] = whop.calls[0] ?? [];
    expect(url).toBe("https://api.whop.com/api/v1/checkout_configurations");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-whop-api-key");
    expect(JSON.parse(String(init?.body))).toEqual({
      plan_id: "plan_test",
      metadata: { user_id: signedUp.user.id },
      redirect_url: "http://localhost:3000/dashboard",
    });
  });

  it("only redirects back to trusted origins", async () => {
    const { cookie } = await signUp();
    const whop = stubWhop(500);
    for (const returnUrl of ["https://evil.example/", "http://localhost:3000.evil.example/"]) {
      const response = await request("/v1/billing/checkout", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ returnUrl }),
      });
      expect(response.status).toBe(400);
    }
    expect(whop.calls).toHaveLength(0);
  });

  it("requires a session", async () => {
    const response = await request("/v1/billing/checkout", { method: "POST" });
    expect(response.status).toBe(401);
  });
});

describe("POST /webhooks/whop", () => {
  it("records the membership and pushes billing.updated", async () => {
    const { cookie, body: signedUp } = await signUp();
    expect(await billingOf(cookie)).toEqual({ enabled: true, active: false, subscription: null });

    const published: UserEvent[] = [];
    const stub = env.USER_EVENTS.getByName(signedUp.user.id);
    vi.spyOn(env.USER_EVENTS, "getByName").mockReturnValue({
      ...stub,
      publish: async (event: UserEvent) => {
        published.push(event);
        return 1;
      },
    } as unknown as ReturnType<typeof env.USER_EVENTS.getByName>);

    const member = membership(signedUp.user.id);
    expect((await deliver("membership.activated", member)).status).toBe(200);

    expect(await billingOf(cookie)).toMatchObject({
      active: true,
      subscription: { id: member.id, status: "active", active: true },
    });
    await vi.waitFor(() => expect(published).toHaveLength(1));
    expect(published[0]).toMatchObject({
      type: "billing.updated",
      subscription: { id: member.id, active: true },
    });

    const ended = { ...member, status: "canceled", updated_at: "2026-10-02T00:00:00.000Z" };
    expect((await deliver("membership.deactivated", ended)).status).toBe(200);
    expect(await billingOf(cookie)).toMatchObject({
      active: false,
      subscription: { status: "canceled", active: false },
    });
  });

  it("ignores redeliveries older than what it has", async () => {
    const { cookie, body: signedUp } = await signUp();
    const member = membership(signedUp.user.id, { updated_at: "2026-10-05T00:00:00.000Z" });
    await deliver("membership.activated", member);

    const stale = { ...member, status: "expired", updated_at: "2026-10-04T00:00:00.000Z" };
    expect((await deliver("membership.deactivated", stale)).status).toBe(200);
    expect((await billingOf(cookie)).subscription?.status).toBe("active");
  });

  it("rejects bad signatures and stale timestamps", async () => {
    const { body: signedUp } = await signUp();
    const data = membership(signedUp.user.id);
    expect((await deliver("membership.activated", data, { secret: "ws_wrong" })).status).toBe(401);
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    expect((await deliver("membership.activated", data, { at: tenMinutesAgo })).status).toBe(401);
    const unsigned = await request("/webhooks/whop", { method: "POST", body: "{}" });
    expect(unsigned.status).toBe(401);
  });

  it("acknowledges events it doesn't act on", async () => {
    const orphan = membership("nobody", { metadata: {} });
    expect(await (await deliver("membership.activated", orphan)).json()).toEqual({
      ok: true,
      ignored: "no user_id",
    });
    expect(await (await deliver("payment.succeeded", { id: "pay_1" })).json()).toEqual({
      ok: true,
      ignored: "payment.succeeded",
    });
  });
});

describe("verifyWebhook", () => {
  it("accepts any one of several signatures", async () => {
    const body = '{"type":"membership.activated"}';
    const headers = await sign(body);
    headers.set("webhook-signature", `v1,bm90LWl0 ${headers.get("webhook-signature")}`);
    expect(await verifyWebhook(body, headers, SECRET)).toEqual({ type: "membership.activated" });
    expect(await verifyWebhook(`${body} `, headers, SECRET)).toBeNull();
  });
});

describe("requireSubscription", () => {
  const paid = new Hono<AuthedEnv>()
    .use(loadSession, requireAuth, requireSubscription)
    .get("/", (c) => c.text("pro"));
  const testApp = new Hono().route("/", app).route("/pro", paid as unknown as Hono);

  it("answers 402 until the user has an active subscription", async () => {
    const { cookie, body: signedUp } = await signUp();
    const call = () =>
      testApp.request("/pro", { headers: { cookie } }, env, {
        waitUntil: () => {},
        passThroughOnException: () => {},
        props: {},
      } as unknown as ExecutionContext);
    expect((await call()).status).toBe(402);

    await deliver("membership.activated", membership(signedUp.user.id));
    expect((await call()).status).toBe(200);
  });
});
