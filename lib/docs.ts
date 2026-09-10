/**
 * Help center / docs content — hardcoded arrays like `lib/blog.ts`. No MDX, no
 * i18n, no extra deps. Swap the bodies for a real content pipeline when you
 * outgrow this.
 */

export type DocPage = {
  slug: string;
  title: string;
  description: string;
  /** simple paragraphs; rendered as <p>. Lines starting with "- " render as list items. */
  body: string[];
};

export const DOCS: DocPage[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Clone, install, migrate the D1 database, and run the dev server.",
    body: [
      "Bismillah is a Cloudflare-native vinext template. You need Node 22+ and a Cloudflare account for deploys, but the stock demos (Workers AI, D1, R2, KV) run locally with no secrets.",
      "1. Clone the repo and install dependencies: `npm install --legacy-peer-deps` (the legacy flag works around a pre-existing wrangler / workers-types peer range).",
      "2. Apply the local D1 schema: `npm run db:migrate` (this runs `wrangler d1 migrations apply bismillah --local`). Re-run it whenever you pull new files under `migrations/`.",
      "3. Start the dev server: `npm run dev`. The home page, `/chat`, and `/demos` should all work immediately.",
      "4. Copy `.dev.vars.example` to `.dev.vars` and fill in only the secrets you need. Every integration degrades to a safe demo mode when its secret is unset — email is logged instead of sent, checkout returns a 503 hint, the Google button hides itself.",
      "5. Before committing structural TypeScript changes, run `npm run typecheck` and `npm run build`.",
      "Key secret groups: Better Auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`), Plunk email (`PLUNK_API_KEY`), Polar payments (`POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`), and the optional product API key (`PRODUCT_API_KEY`). See the `bindings` doc for the resource IDs you must not change.",
    ],
  },
  {
    slug: "auth",
    title: "Authentication",
    description: "Better Auth flows: email/password, magic link, Google OAuth, reset.",
    body: [
      "Auth is Better Auth only, backed directly by D1. The factory is `createAuth(env, request?)` in `lib/auth.ts`; server components use `getSession()` / `requireSession()` from `lib/session.ts`.",
      "Email and password work out of the box. Set `BETTER_AUTH_SECRET` (32+ chars) and `BETTER_AUTH_URL` for production.",
      "Magic links use the `magicLink` plugin and send through Plunk (`sendMagicLinkEmail`). With `PLUNK_API_KEY` unset the link is logged to the console so local sign-in still works.",
      "Google OAuth auto-registers only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set — otherwise the Google button hides itself. Register `<origin>/api/auth/callback/google` as the redirect URL.",
      "Password reset (`/forgot-password`, `/reset-password`) calls `sendResetPassword` → `sendPasswordResetEmail` via Plunk, also demo-safe.",
      "The `/api/auth/[...all]` route is rate-limited via `lib/rate-limit.ts` on `env.KV`. Add an auth-gated page by calling `const { user } = await requireSession()` at the top of the RSC and `export const dynamic = \"force-dynamic\"`.",
    ],
  },
  {
    slug: "email-and-payments",
    title: "Email & payments",
    description: "Plunk transactional email and Polar halal one-time checkout.",
    body: [
      "Email is Plunk only. The transport is `sendTransactionalEmail(env, ...)` in `lib/plunk.ts`; templates live in `lib/email.ts` (`sendWelcomeEmail`, `sendMagicLinkEmail`, `sendPasswordResetEmail`, `sendWaitlistConfirmEmail`). Every send is a no-op that logs when `PLUNK_API_KEY` is unset — auth flows never break.",
      "To add a transactional email: write a helper in `lib/email.ts` that calls `sendTransactionalEmail`, then call it from the relevant hook or route.",
      "Payments are Polar only, and halal by construction: one-time fair pricing. No riba, no interest, no BNPL or instalment framing anywhere in the template. Do not add Stripe.",
      "`createCheckoutSession` (`lib/polar.ts`) + `/api/checkout` create a one-time checkout; `?type=subscription` reads `POLAR_SUBSCRIPTION_PRODUCT_ID` as an optional stub. `/api/portal` opens the Polar customer portal, matching the customer by external id (= Better Auth user id).",
      "The webhook at `/api/webhooks/polar` verifies the signature with Web Crypto and is idempotent: every delivery id is recorded in the D1 `webhook_events` table before any side effect, so replays are safe.",
      "Usage metering (`/settings` \"Usage this month\") is a display-only stub over local D1 counts. `ingestPolarUsage` in `lib/usage.ts` documents where to forward events to Polar Events/Meters for prepaid metered credits later — it does not call Polar in this template.",
    ],
  },
  {
    slug: "agents-and-api",
    title: "Agents & the product API",
    description: "The ChatAgent Durable Object and the REST /api/v1 surface.",
    body: [
      "Chat is a Durable Object named `ChatAgent` (`worker/chat-agent.ts`), routed by `routeAgentRequest` in `worker/index.ts` under `/agents/*`. The client uses `useAgent({ agent: \"ChatAgent\" })`. Keep that name consistent across wrangler, the worker, and the client.",
      "The default model is Workers AI (`@cf/zai-org/glm-4.7-flash`) via the `env.AI` binding. A signed-in user with a stored OpenAI or Anthropic key (Settings → Bring your own AI key) gets that provider instead, with a one-token pre-flight check; any failure falls back to Workers AI. Keys are AES-GCM encrypted at rest and never logged.",
      "The REST product API lives at `/api/v1`. It is the agent-facing surface — any agent can call plain HTTP without an MCP SDK. A Model Context Protocol server can wrap these same routes later.",
      "`GET /api/v1/health` → `{ ok: true, name, version }`. `GET /api/v1/notes` → `{ notes }`. `POST /api/v1/notes` with `{ title, body? }` creates a note.",
      "When `PRODUCT_API_KEY` is set, `/api/v1/notes` requires `Authorization: Bearer <key>` (health stays open). When it is unset the whole surface is open for local demos. Writes are rate-limited via `env.KV`. All routes send permissive CORS headers and answer `OPTIONS` preflight.",
      "Example: `curl https://your.workers.dev/api/v1/health` and `curl -H 'Authorization: Bearer $PRODUCT_API_KEY' https://your.workers.dev/api/v1/notes`.",
    ],
  },
  {
    slug: "bindings",
    title: "Bindings & resource IDs",
    description: "The wrangler bindings you must never rename or merge.",
    body: [
      "The wrangler binding IDs are load-bearing. Never overwrite them, and never merge the two KV namespaces — `KV` is app data (counters, rate limits), `VINEXT_KV_CACHE` is reserved for vinext's ISR/data cache.",
      "- DB — D1 `bismillah` — 36a267af-1bd7-4da0-af68-95654c6d46c3",
      "- ARTIFACTS — R2 bucket `bismillah-artifacts`",
      "- KV — 2423ae5f6f90406d8a2233680c5d1c26 (app data + rate limiting)",
      "- VINEXT_KV_CACHE — 02cf4b23eb084760b4fd0e755bbd6e96 (vinext cache only — do not reuse)",
      "- AI — Workers AI binding",
      "- ChatAgent — Durable Object (SQLite-backed)",
      "Add D1 schema changes as new files under `migrations/` (never edit an applied one) and run `npm run db:migrate`. Route handlers should `import { env } from \"cloudflare:workers\"`.",
    ],
  },
];

export function getDoc(slug: string): DocPage | undefined {
  return DOCS.find((d) => d.slug === slug);
}
