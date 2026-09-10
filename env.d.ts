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

  /* --- P1: bring-your-own AI key encryption (falls back to BETTER_AUTH_SECRET) --- */
  AI_KEYS_ENCRYPTION_SECRET?: string;

  /* --- P1: privacy-friendly analytics (all no-op unless provider + id set) --- */
  NEXT_PUBLIC_ANALYTICS_PROVIDER?: "plausible" | "datafast";
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN?: string;
  NEXT_PUBLIC_DATAFAST_WEBSITE_ID?: string;
  NEXT_PUBLIC_DATAFAST_DOMAIN?: string;

  /* --- P1: error monitoring (Sentry-compatible; console fallback when unset) --- */
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;

  /* --- P1: daily digest cron (comma-separated recipients; logs only when unset) --- */
  DIGEST_TO?: string;

  /* --- P1: organizations flag ("true" to enable the /orgs UI + API) --- */
  ENABLE_ORGS?: string;

  /* --- P1b: super-admin allowlist (comma-separated emails; case-insensitive) --- */
  ADMIN_EMAILS?: string;

  /* --- P2: waitlist owner ping (optional; joiner confirm always attempts) --- */
  WAITLIST_NOTIFY_EMAIL?: string;

  /* --- P2: Polar meter id for the documented usage-ingest hook (stub; no-op unless set with POLAR_ACCESS_TOKEN) --- */
  POLAR_METER_ID?: string;

  /* --- P2: bearer key for the REST product API (/api/v1); open/demo when unset --- */
  PRODUCT_API_KEY?: string;
}

declare namespace Cloudflare {
  interface Env extends globalThis.Env {}
}
