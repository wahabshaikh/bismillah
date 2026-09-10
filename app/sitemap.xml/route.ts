import { env } from "cloudflare:workers";
import { getSiteUrl } from "@/lib/site";
import { BLOG_POSTS } from "@/lib/blog";

/** GET /sitemap.xml — static list of public routes. */
export function GET(request: Request) {
  const base = getSiteUrl(env, request);
  const paths = [
    "/",
    "/pricing",
    "/login",
    "/signup",
    "/forgot-password",
    "/chat",
    "/demos",
    "/privacy",
    "/terms",
    "/blog",
    "/changelog",
    ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
  ];
  const now = new Date().toISOString();
  const urls = paths
    .map(
      (p) =>
        `  <url><loc>${base}${p}</loc><lastmod>${now}</lastmod></url>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
