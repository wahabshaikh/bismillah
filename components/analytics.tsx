import { env } from "cloudflare:workers";
import { getAnalyticsConfig } from "@/lib/analytics";

/**
 * Injects the Plausible / DataFast script — and nothing at all unless
 * `NEXT_PUBLIC_ANALYTICS_PROVIDER` plus the matching id env var are set.
 * Server component: the config is read once at render time.
 */
export function Analytics() {
  const config = getAnalyticsConfig(env);
  if (!config) return null;

  if (config.provider === "plausible") {
    return (
      <script defer data-domain={config.domain} src={config.src} />
    );
  }

  // datafast
  return (
    <script
      defer
      data-website-id={config.websiteId}
      data-domain={config.domain || undefined}
      src={config.src}
    />
  );
}
