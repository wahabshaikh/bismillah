# AGENTS.md — Bismillah

Guidance for coding agents working in this repo.

## Brand & ethics

- Brand: **Bismillah** — start every build in the Name — ship on Cloudflare.
- Halal only: no haram features, content, gambling, interest-based finance helpers, or adult material.
- MIT license. Keep the public GitHub template usable as a fork-and-deploy starter.

## Stack

- vinext (Next.js-style App Router on Vite) → Cloudflare Workers
- Custom worker: `worker/index.ts` routes `/agents/*` then vinext `fetch-handler`
- Durable Object: `ChatAgent` (`worker/chat-agent.ts`) via `@cloudflare/ai-chat` + `agents`
- Workers AI via `workers-ai-provider`
- D1 (`DB`), R2 (`ARTIFACTS`), KV (`KV`), separate vinext cache KV (`VINEXT_KV_CACHE`)
- Auth: **Better Auth** only — `lib/auth.ts` `createAuth(env, request?)`, D1 native. email/password + `magicLink` plugin + `admin` plugin (impersonation; authority = `ADMIN_EMAILS`) + Google OAuth (only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` set) + forgot/reset. Client: `lib/auth-client.ts`. Server session helpers: `lib/session.ts`.
- Email: **Plunk** only — transport `lib/plunk.ts` `sendTransactionalEmail` (fetch to `api.useplunk.com/v1/send`); templates in `lib/email.ts` (`sendWelcomeEmail` / `sendMagicLinkEmail` / `sendPasswordResetEmail`).
- Payments: **Polar** only (`@polar-sh/sdk`) — `lib/polar.ts`: `createCheckoutSession` (one-time + `?type=subscription` stub), `createPortalLink`, `verifyPolarWebhook`. Halal one-time price, no riba/BNPL.
- Rate limiting: `lib/rate-limit.ts` — fixed window on `env.KV` (never `VINEXT_KV_CACHE`); wired into `/api/auth/*` and `/api/webhooks/polar`.
- Webhook idempotency: D1 `webhook_events(id PRIMARY KEY)` — `migrations/0003_webhook_events.sql`.
- Site URL: `lib/site.ts` `getSiteUrl(env, request?)` — `NEXT_PUBLIC_SITE_URL` → `BETTER_AUTH_URL` → origin → `https://bismillah.wahabshaikh.workers.dev`.

## P1 features

- Onboarding checklist: `lib/onboarding.ts` (D1 `user_onboarding`) + `app/api/onboarding/route.ts` + `components/onboarding-checklist.tsx` on `/dashboard`. Steps: `profile`, `ai_key`, `chat`, `billing`.
- Bring-your-own AI key: `lib/user-ai-keys.ts` — AES-GCM (Web Crypto, PBKDF2 from `AI_KEYS_ENCRYPTION_SECRET` ?? `BETTER_AUTH_SECRET`); D1 `user_ai_keys` stores ciphertext + last-4 hint only. `app/api/settings/ai-keys/route.ts` GET/PUT/DELETE. `components/settings-ai-keys.tsx` on `/settings`. **Wired into `worker/chat-agent.ts`**: `onConnect` reads the Better Auth session from the WS upgrade cookies → `userId` on connection state; `onChatMessage` prefers the user's OpenAI/Anthropic key (`@ai-sdk/openai` / `@ai-sdk/anthropic`), 1-token pre-flight, falls back to `createWorkersAI` on anything (anon, no key, decrypt fail, provider reject). **Workers AI is the default.** Never log the key or a provider error body.
- Analytics: `lib/analytics.ts` `getAnalyticsConfig` / `track`; `components/analytics.tsx` in `app/layout.tsx` `<head>`. No-op unless `NEXT_PUBLIC_ANALYTICS_PROVIDER` (`plausible` | `datafast`) + id set.
- Monitoring: `lib/monitoring.ts` `captureException` / `captureMessage` — Sentry `fetch` envelope when `SENTRY_DSN` set, else structured `console.error`. `app/error.tsx` → `app/api/monitor/route.ts`.
- Cron: `wrangler.jsonc` `triggers.crons` + `scheduled()` in `worker/index.ts` → `lib/jobs/digest.ts` `runDailyDigest(env)`. Emails `DIGEST_TO` via Plunk when set, else logs.
- Orgs (lite, `ENABLE_ORGS="true"`): `migrations/0005_orgs.sql`, `lib/orgs.ts` (D1 helpers), `app/orgs/*`, `app/api/orgs/*`. Flag off → pages redirect `/dashboard`, API 404. Roles owner/admin/member; invites are D1 stubs (no email).
- Super-admin (`ADMIN_EMAILS`): `lib/admin.ts` (`parseAdminEmails` / `isSuperAdmin` / `requireSuperAdmin` / `ensureAdminRole`), `app/admin/page.tsx`, `app/api/admin/impersonate` + `/stop-impersonate`. Better Auth `admin` plugin (`migrations/0006_admin.sql`). ⚠️ impersonation = full account access; block on impersonating another admin; MFA + audit log are a prod TODO.
- Blog/changelog: `lib/blog.ts` content arrays → `app/blog/*`, `app/changelog/page.tsx`; slugs added to `app/sitemap.xml`.
- E2E: `playwright.config.ts` + `e2e/smoke.spec.ts` + `e2e/polar-webhook.spec.ts` (mock `order.paid` + dedupe replay; `signPolarWebhookForTest` in `lib/polar.ts`), `npm run test:e2e`. Tests skip without a server; never gate the build.

## Hard rules

1. **Never overwrite binding IDs** in `wrangler.jsonc` (D1, KV ×2, R2 bucket name).
2. **Never merge** `KV` and `VINEXT_KV_CACHE`.
3. Prefer `import { env } from "cloudflare:workers"` in route handlers.
4. Match peer patterns under `/workspace/refs/vinext-agents-example` when changing agent routing.
5. Keep UI Tailwind + local shadcn-style primitives (`components/ui/*`).
6. Do not invent live demo URLs or paste API keys.
7. Auth/email/payments helpers must never crash the site when their secret is unset (demo mode).
8. No Stripe/Clerk/Resend. No riba / BNPL / interest framing anywhere.
9. Add D1 schema changes as new files under `migrations/` (never edit applied migrations).

## Key paths

- `worker/index.ts`, `worker/chat-agent.ts`
- `app/chat/*`, `app/demos/*`, `app/api/*`
- `lib/auth.ts`, `lib/auth-client.ts`, `lib/session.ts`, `lib/email.ts`, `lib/plunk.ts`, `lib/polar.ts`, `lib/rate-limit.ts`, `lib/site.ts`
- Public auth: `app/login/*`, `app/signup/*`, `app/forgot-password/*`, `app/reset-password/*`
- Gated: `app/dashboard/*`, `app/settings/*` (`requireSession`); `app/admin/*` (`requireSuperAdmin`); `app/orgs/*` (`requireSession` + `ENABLE_ORGS`); `app/account/*` → redirects to `/dashboard`
- Marketing/legal: `app/page.tsx`, `app/pricing/*`, `app/checkout/*`, `app/privacy/*`, `app/terms/*`
- SEO: `app/layout.tsx` (OG), `app/sitemap.xml/route.ts`, `app/robots.txt/route.ts`
- API: `app/api/auth/[...all]/route.ts`, `app/api/checkout/route.ts`, `app/api/portal/route.ts`, `app/api/webhooks/polar/route.ts`, `app/api/admin/{impersonate,stop-impersonate}/route.ts`, `app/api/orgs/route.ts`, `app/api/orgs/[id]/invite/route.ts`
- `migrations/0001_init.sql` … `0006_admin.sql` (0004 = onboarding + user AI keys, 0005 = orgs, 0006 = Better Auth `admin` plugin columns)
- P1: `lib/onboarding.ts`, `lib/user-ai-keys.ts`, `lib/admin.ts`, `lib/analytics.ts`, `lib/monitoring.ts`, `lib/orgs.ts`, `lib/blog.ts`, `lib/jobs/digest.ts`
- P1 components: `components/onboarding-checklist.tsx`, `components/settings-ai-keys.tsx`, `components/analytics.tsx`; `app/error.tsx`; `app/blog/*`, `app/changelog/*`; `e2e/smoke.spec.ts`
- `components/theme-toggle.tsx`, `components/sign-out-button.tsx`
- `env.d.ts`, `wrangler.jsonc`, `.dev.vars.example`

## SaaS workflows

- **Auth-gated page:** `const { user } = await requireSession()` (from `lib/session.ts`) + `export const dynamic = "force-dynamic"`.
- **New transactional email:** add a helper in `lib/email.ts` calling `sendTransactionalEmail`; it is demo-safe when `PLUNK_API_KEY` is unset.
- **New D1 table:** new `migrations/000N_*.sql` (never edit an applied migration) → `npm run db:migrate`.
- **New webhook:** always dedupe on the provider's delivery id via `webhook_events` before side effects; rate-limit with `lib/rate-limit.ts`.
- **Enable Google OAuth:** set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`; the provider auto-registers and the buttons start working.
- **Enable subscriptions:** set `POLAR_SUBSCRIPTION_PRODUCT_ID`; hit `/api/checkout?type=subscription`.

## Secrets (names only — set via `wrangler secret put`; see `.dev.vars.example`)

`NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PLUNK_API_KEY`, `PLUNK_FROM_EMAIL`,
`POLAR_ACCESS_TOKEN`, `POLAR_PRODUCT_ID`, `POLAR_SUBSCRIPTION_PRODUCT_ID`,
`POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`
(all optional — features degrade to demo mode when unset).

## Commands

```bash
npm run dev
npm run build && npm run deploy
npm run db:migrate
npm run typecheck
```
