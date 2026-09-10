/* Bismillah Cloudflare Env bindings — keep in sync with wrangler.jsonc */

interface Env {
  AI: Ai;
  ASSETS: Fetcher;
  DB: D1Database;
  ARTIFACTS: R2Bucket;
  /** App KV (counters, rate limits) — id 2423ae5f6f90406d8a2233680c5d1c26 */
  KV: KVNamespace;
  /** vinext ISR/data cache — id 02cf4b23eb084760b4fd0e755bbd6e96 (do not reuse for app data) */
  VINEXT_KV_CACHE: KVNamespace;
  ChatAgent: DurableObjectNamespace;
}

declare namespace Cloudflare {
  interface Env extends globalThis.Env {}
}
