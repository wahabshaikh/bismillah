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

  /* --- Site --- */
  NEXT_PUBLIC_SITE_URL?: string;

  /* --- Better Auth (email/password + magic link + Google OAuth) --- */
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  /* --- Plunk (transactional email) --- */
  PLUNK_API_KEY?: string;
  PLUNK_FROM_EMAIL?: string;

  /* --- Polar (halal one-time payments; subscription id is an optional stub) --- */
  POLAR_ACCESS_TOKEN?: string;
  POLAR_WEBHOOK_SECRET?: string;
  POLAR_PRODUCT_ID?: string;
  POLAR_SUBSCRIPTION_PRODUCT_ID?: string;
  POLAR_SERVER?: "sandbox" | "production";
}

declare namespace Cloudflare {
  interface Env extends globalThis.Env {}
}
