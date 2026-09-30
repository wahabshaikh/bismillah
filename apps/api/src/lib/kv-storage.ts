import type { SecondaryStorage } from "better-auth";

// KV rejects expirations shorter than 60 seconds.
const MIN_TTL_SECONDS = 60;

function ttlOptions(ttl: number | undefined): KVNamespacePutOptions | undefined {
  return ttl ? { expirationTtl: Math.max(Math.ceil(ttl), MIN_TTL_SECONDS) } : undefined;
}

/**
 * Better Auth secondary storage on Workers KV, used for sessions.
 *
 * KV is eventually consistent and has no atomic operations, so `getAndDelete` and
 * `increment` are best-effort. src/auth.ts keeps the paths that need atomicity off
 * KV: verification tokens stay in D1 and rate limiting uses the Workers Rate
 * Limiting binding instead.
 */
export function kvSecondaryStorage(kv: KVNamespace, prefix = "auth:"): SecondaryStorage {
  const k = (key: string) => `${prefix}${key}`;
  return {
    get: (key) => kv.get(k(key)),
    set: (key, value, ttl) => kv.put(k(key), value, ttlOptions(ttl)),
    delete: (key) => kv.delete(k(key)),
    async getAndDelete(key) {
      const value = await kv.get(k(key));
      if (value !== null) await kv.delete(k(key));
      return value;
    },
    async increment(key, ttl) {
      const next = Number((await kv.get(k(key))) ?? 0) + 1;
      await kv.put(k(key), String(next), ttlOptions(ttl));
      return next;
    },
  };
}
