import assert from "node:assert/strict";
import test from "node:test";

import { rateLimit } from "../lib/rate-limit.ts";

class FakeRateLimiter {
  readonly keys: string[] = [];
  private readonly success: boolean;

  constructor(success: boolean) {
    this.success = success;
  }

  async limit({ key }: { key: string }) {
    this.keys.push(key);
    return { success: this.success };
  }
}

test("rejects an exhausted request without writing to Workers KV", async () => {
  const limiter = new FakeRateLimiter(false);
  const env = {
    RATE_LIMITER_20: limiter,
    KV: {
      get() {
        throw new Error("KV reads must not be used for request rate limiting");
      },
      put() {
        throw new Error("KV writes must not be used for request rate limiting");
      },
    },
  };

  const result = await rateLimit(env, "user-123", {
    key: "monitor",
    limit: 20,
    windowSeconds: 60,
  });

  assert.equal(result.ok, false);
  assert.equal(result.remaining, 0);
  assert.deepEqual(limiter.keys, ["monitor:user-123"]);
});

test("routes every supported policy to its matching native binding", async () => {
  const supportedLimits = [8, 10, 12, 20, 30, 60] as const;
  const env: Record<string, FakeRateLimiter> = {};

  for (const limit of supportedLimits) {
    env[`RATE_LIMITER_${limit}`] = new FakeRateLimiter(true);
  }

  for (const limit of supportedLimits) {
    const result = await rateLimit(env, "actor", {
      key: `policy-${limit}`,
      limit,
      windowSeconds: 60,
    });

    assert.equal(result.ok, true);
    assert.deepEqual(env[`RATE_LIMITER_${limit}`].keys, [`policy-${limit}:actor`]);
  }
});

test("fails open when a native rate-limit binding is unavailable", async () => {
  const result = await rateLimit({}, "actor", {
    key: "auth",
    limit: 30,
    windowSeconds: 60,
  });

  assert.deepEqual(result, {
    ok: true,
    remaining: 30,
    limit: 30,
    resetSeconds: 60,
  });
});
