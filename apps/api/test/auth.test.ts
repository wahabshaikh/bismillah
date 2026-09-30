import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { request, signUp } from "./helpers.ts";

describe("auth", () => {
  it("rejects /v1 routes without a session", async () => {
    const response = await request("/v1/me");
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("signs up, reads the session from KV and signs out", async () => {
    const { email, cookie } = await signUp();

    const me = await request("/v1/me", { headers: { cookie } });
    expect(me.status).toBe(200);
    const body = (await me.json()) as { user: { email: string }; session: { token: string } };
    expect(body.user.email).toBe(email);

    // The session lives in KV, not in the D1 session table.
    expect(await env.KV.get(`auth:${body.session.token}`)).not.toBeNull();
    const rows = await env.DB.prepare("select count(*) as n from session").first<{ n: number }>();
    expect(rows?.n).toBe(0);

    const signOut = await request("/api/auth/sign-out", {
      method: "POST",
      headers: { cookie, origin: "http://localhost:8787" },
    });
    expect(signOut.status).toBe(200);
    expect(await env.KV.get(`auth:${body.session.token}`)).toBeNull();
    expect((await request("/v1/me", { headers: { cookie } })).status).toBe(401);
  });

  it("accepts the mobile app's scheme as its origin", async () => {
    const { cookie } = await signUp();
    const signOut = (expoOrigin: string) =>
      request("/api/auth/sign-out", {
        method: "POST",
        headers: { cookie, "expo-origin": expoOrigin },
      });

    expect((await signOut("evil://")).status).toBe(403);
    expect((await signOut("bismillah://")).status).toBe(200);
    expect((await request("/v1/me", { headers: { cookie } })).status).toBe(401);
  });

  it("signs in with email and password", async () => {
    const { email } = await signUp();
    const response = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "10.1.0.1" },
      body: JSON.stringify({ email, password: "correct horse battery" }),
    });
    expect(response.status).toBe(200);

    const wrong = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "10.1.0.1" },
      body: JSON.stringify({ email, password: "wrong password!" }),
    });
    expect(wrong.status).toBe(401);
  });

  it("stores users in D1 with hashed passwords", async () => {
    const { email } = await signUp();
    const row = await env.DB.prepare(
      "select a.password from account a join user u on u.id = a.user_id where u.email = ?",
    )
      .bind(email)
      .first<{ password: string }>();
    expect(row?.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(row?.password).not.toContain("correct horse");
  });

  it("rate limits auth writes per IP", async () => {
    const attempt = () =>
      request("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "10.9.9.9" },
        body: JSON.stringify({ email: "nobody@example.com", password: "whatever-password" }),
      });

    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) statuses.push((await attempt()).status);
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
