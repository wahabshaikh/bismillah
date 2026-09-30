import { describe, expect, it } from "vitest";
import { request } from "./helpers.ts";

describe("api worker", () => {
  it("responds on /health", async () => {
    const response = await request("/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, app: "bismillah" });
  });

  it("returns JSON 404 for unknown routes", async () => {
    const response = await request("/nope");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("sets security headers", async () => {
    const response = await request("/health");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("allows credentialed CORS from trusted origins only", async () => {
    const preflight = (origin: string) =>
      request("/v1/me", {
        method: "OPTIONS",
        headers: { origin, "access-control-request-method": "GET" },
      });

    const trusted = await preflight("http://localhost:3000");
    expect(trusted.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(trusted.headers.get("access-control-allow-credentials")).toBe("true");

    const untrusted = await preflight("https://evil.example");
    expect(untrusted.headers.get("access-control-allow-origin")).toBeNull();
  });
});
