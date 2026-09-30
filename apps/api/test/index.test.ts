import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("api worker", () => {
  it("responds on /health", async () => {
    const response = await exports.default.fetch("http://example.com/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, app: "bismillah" });
  });

  it("returns 404 for unknown routes", async () => {
    const response = await exports.default.fetch("http://example.com/nope");
    expect(response.status).toBe(404);
  });
});
