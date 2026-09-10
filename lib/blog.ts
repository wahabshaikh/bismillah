/**
 * Tiny content module for the blog + changelog stubs. Hardcoded arrays — no
 * MDX toolchain so the Worker build stays lean. Swap the bodies for real
 * content modules (or wire an MDX loader) when you're ready.
 */

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  author: string;
  /** simple paragraphs; rendered as <p> */
  body: string[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "hello-bismillah",
    title: "Hello, Bismillah",
    description:
      "Why we built a Cloudflare-native, halal-only SaaS starter around Better Auth, Plunk and Polar.",
    date: "2026-09-01",
    author: "wahabshaikh",
    body: [
      "Bismillah is a production-ready vinext + Cloudflare Workers template: Workers AI agents, D1, R2, KV, Better Auth, Plunk email and Polar payments.",
      "Every vendor is locked and halal-friendly — one-time fair pricing, no riba, no BNPL. Every integration degrades to a safe demo mode when its secret is unset.",
      "This blog is a stub. Replace these posts in lib/blog.ts, or wire an MDX loader if you want richer content.",
    ],
  },
  {
    slug: "byok-ai-keys",
    title: "Bring your own AI key",
    description:
      "Users can store an encrypted provider key in settings while Workers AI stays the default.",
    date: "2026-09-10",
    author: "wahabshaikh",
    body: [
      "Settings now has a 'Bring your own AI key' section. Keys are encrypted at rest with AES-GCM via Web Crypto and only a last-4 hint is ever shown back.",
      "Workers AI remains the default model for the ChatAgent. Wiring a stored key into the agent is left as an intentional next step.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export type ChangelogEntry = {
  version: string;
  date: string; // ISO
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "P1",
    date: "2026-09-10",
    changes: [
      "Onboarding checklist on the dashboard after first login.",
      "Bring-your-own AI key in settings (AES-GCM encrypted at rest).",
      "Privacy-friendly analytics stub (Plausible / DataFast), env-gated.",
      "Error monitoring stub (Sentry-compatible fetch envelope), env-gated.",
      "Daily digest cron trigger (0 9 * * *) with a demo-safe job.",
      "Organizations schema (behind ENABLE_ORGS) — tables only, UI later.",
      "Playwright smoke skeleton + blog / changelog stubs.",
    ],
  },
  {
    version: "P0",
    date: "2026-09-10",
    changes: [
      "Better Auth on D1: email/password, magic link, Google OAuth, forgot/reset.",
      "Plunk transactional email adapter (welcome / magic-link / reset).",
      "Polar halal one-time checkout, customer portal, idempotent webhook.",
      "Marketing shell, dark mode, legal stubs, SEO (OG / sitemap / robots).",
      "Rate limiting on auth + webhooks via env.KV.",
    ],
  },
];
