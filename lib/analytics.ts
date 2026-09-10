/**
 * Privacy-friendly analytics — Plausible or DataFast, script-only, no cookies.
 *
 * Everything is a no-op unless `NEXT_PUBLIC_ANALYTICS_PROVIDER` is `plausible`
 * or `datafast` AND the matching site id / domain env var is set. There is no
 * network call from the server; the client `<Analytics />` component injects the
 * vendor script, and `track()` forwards custom events to whatever the vendor
 * exposed on `window`.
 */

export type AnalyticsProvider = "plausible" | "datafast";

type AnalyticsEnv = {
  NEXT_PUBLIC_ANALYTICS_PROVIDER?: string;
  NEXT_PUBLIC_PLAUSIBLE_DOMAIN?: string;
  NEXT_PUBLIC_DATAFAST_WEBSITE_ID?: string;
  NEXT_PUBLIC_DATAFAST_DOMAIN?: string;
};

export type AnalyticsConfig =
  | { provider: "plausible"; domain: string; src: string }
  | { provider: "datafast"; websiteId: string; domain: string; src: string }
  | null;

/**
 * Resolve analytics config from env. Returns `null` (disabled) unless the
 * provider and its required id are both present.
 */
export function getAnalyticsConfig(env: AnalyticsEnv): AnalyticsConfig {
  const provider = env.NEXT_PUBLIC_ANALYTICS_PROVIDER?.toLowerCase();

  if (provider === "plausible" && env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) {
    return {
      provider: "plausible",
      domain: env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
      src: "https://plausible.io/js/script.js",
    };
  }

  if (provider === "datafast" && env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID) {
    return {
      provider: "datafast",
      websiteId: env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID,
      domain: env.NEXT_PUBLIC_DATAFAST_DOMAIN ?? "",
      src: "https://datafa.st/js/script.js",
    };
  }

  return null;
}

type EventProps = Record<string, string | number | boolean>;

/**
 * Fire a custom analytics event. Safe to call anywhere: on the server, or when
 * analytics is disabled, it just no-ops.
 */
export function track(event: string, props?: EventProps): void {
  if (typeof window === "undefined") return;
  const w = window as typeof window & {
    plausible?: (e: string, opts?: { props?: EventProps }) => void;
    datafast?: (e: string, opts?: EventProps) => void;
  };
  try {
    if (typeof w.plausible === "function") {
      w.plausible(event, props ? { props } : undefined);
    } else if (typeof w.datafast === "function") {
      w.datafast(event, props);
    }
  } catch {
    /* never let analytics throw into product code */
  }
}
