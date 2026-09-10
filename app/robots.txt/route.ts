import { env } from "cloudflare:workers";
import { getSiteUrl } from "@/lib/site";

/** GET /robots.txt — allow crawling, disallow app/auth internals. */
export function GET(request: Request) {
  const base = getSiteUrl(env, request);
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard
Disallow: /settings
Disallow: /account
Disallow: /reset-password

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
