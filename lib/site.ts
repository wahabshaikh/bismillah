/**
 * Canonical site URL resolution.
 * Priority: NEXT_PUBLIC_SITE_URL → BETTER_AUTH_URL → request origin → hosted fallback.
 */

export const FALLBACK_SITE_URL = "https://bismillah.wahabshaikh.workers.dev";

type SiteEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  BETTER_AUTH_URL?: string;
};

export function getSiteUrl(env: SiteEnv, request?: Request): string {
  const raw =
    env.NEXT_PUBLIC_SITE_URL ||
    env.BETTER_AUTH_URL ||
    (request ? new URL(request.url).origin : undefined) ||
    FALLBACK_SITE_URL;
  return raw.replace(/\/$/, "");
}
