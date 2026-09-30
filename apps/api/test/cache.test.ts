import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { cached, invalidate } from "../src/lib/cache.ts";
import { kvSecondaryStorage } from "../src/lib/kv-storage.ts";

describe("cached", () => {
  it("loads once, then serves from KV until invalidated", async () => {
    const load = vi.fn(async () => ({ n: 1 }));
    expect(await cached(env.KV, "k", 300, load)).toEqual({ n: 1 });
    expect(await cached(env.KV, "k", 300, load)).toEqual({ n: 1 });
    expect(load).toHaveBeenCalledTimes(1);

    await invalidate(env.KV, "k");
    await cached(env.KV, "k", 300, load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("kvSecondaryStorage", () => {
  it("round-trips values under a prefix and clamps TTLs to KV's minimum", async () => {
    const storage = kvSecondaryStorage(env.KV);
    // A 5s TTL would be rejected by KV; it is raised to 60s.
    await storage.set("a", "1", 5);
    expect(await env.KV.get("auth:a")).toBe("1");
    expect(await storage.getAndDelete("a")).toBe("1");
    expect(await storage.get("a")).toBeNull();
    expect(await storage.increment("n", 60)).toBe(1);
    expect(await storage.increment("n", 60)).toBe(2);
  });
});
