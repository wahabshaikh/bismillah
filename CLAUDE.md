# CLAUDE.md — Bismillah

You are working on the **Bismillah** Cloudflare/vinext public template.

## Do

- Preserve wrangler binding IDs for DB, ARTIFACTS, KV, VINEXT_KV_CACHE.
- Keep `ChatAgent` naming consistent in wrangler + `worker/*` + client `useAgent({ agent: "ChatAgent" })`.
- Use Workers AI binding (`env.AI`); default model from peer (`@cf/zai-org/glm-4.7-flash`) unless updated intentionally.
- Add D1 changes as new SQL files under `migrations/`.
- Run `npm run typecheck` after structural TS changes.

## Don’t

- Don’t collapse the two KV namespaces.
- Don’t switch `main` away from `./worker/index.ts` without keeping `routeAgentRequest`.
- Don’t add haram-oriented tools or demos.
- Don’t commit secrets.

## Architecture sketch

```
Request → worker/index.ts
        ├─ /agents/* → routeAgentRequest → ChatAgent DO
        └─ else → vinext/server/fetch-handler → App Router
```

## SaaS layer (P0)

Locked vendors: **Better Auth** (auth) · **Plunk** (email) · **Polar** (payments). Halal only — one-time fair pricing, no riba/BNPL.

| Concern | Entry point | Notes |
|---------|-------------|-------|
| Auth factory | `lib/auth.ts` `createAuth(env, request?)` | email/password + `magicLink` plugin + Google OAuth (only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` set); `sendResetPassword` → Plunk |
| Auth client | `lib/auth-client.ts` | `authClient` + `magicLinkClient()` |
| Server session | `lib/session.ts` | `getSession()`, `requireSession(redirectTo?)` for RSC pages |
| Auth route | `app/api/auth/[...all]/route.ts` | rate-limited via `lib/rate-limit.ts` (`env.KV`) |
| Email adapter | `lib/email.ts` | `sendWelcomeEmail` / `sendMagicLinkEmail` / `sendPasswordResetEmail` — wrap `lib/plunk.ts`; no-op when `PLUNK_API_KEY` unset |
| Checkout | `lib/polar.ts` `createCheckoutSession` + `app/api/checkout/route.ts` | `?type=subscription` reads `POLAR_SUBSCRIPTION_PRODUCT_ID` (stub); attaches session email + `externalCustomerId` |
| Portal | `lib/polar.ts` `createPortalLink` + `app/api/portal/route.ts` | matches Polar customer by external id (= user id); soft 503 `setup` message if none |
| Webhook | `app/api/webhooks/polar/route.ts` | signature verify (Web Crypto) + **idempotency** via D1 `webhook_events(id PK)`; rate-limited |
| Site URL | `lib/site.ts` `getSiteUrl(env, request?)` | `NEXT_PUBLIC_SITE_URL` → `BETTER_AUTH_URL` → origin → hosted fallback |

Pages: `/login` `/signup` `/forgot-password` `/reset-password` (public), `/dashboard` `/settings` (`requireSession`), `/account` → redirects to `/dashboard`, `/privacy` `/terms`, `/pricing`, `/checkout/success`.
SEO: OG/metadata in `app/layout.tsx`; `app/sitemap.xml/route.ts`; `app/robots.txt/route.ts`.

### Workflow: add an auth-gated page
1. `const { user } = await requireSession()` at the top of the RSC.
2. `export const dynamic = "force-dynamic"`.

### Workflow: send a new transactional email
1. Add a helper in `lib/email.ts` that calls `sendTransactionalEmail(env, {...})`.
2. Call it from the relevant hook/route — it is already demo-safe.

### Workflow: new D1 table
Add `migrations/000N_*.sql` (never edit an applied migration). Run `npm run db:migrate`.

## P1 layer

| Concern | Entry point | Notes |
|---------|-------------|-------|
| Onboarding | `lib/onboarding.ts` + `app/api/onboarding/route.ts` | D1 `user_onboarding`; `components/onboarding-checklist.tsx` on `/dashboard`; steps `profile`/`ai_key`/`chat`/`billing` |
| BYOK AI keys | `lib/user-ai-keys.ts` + `app/api/settings/ai-keys/route.ts` | D1 `user_ai_keys`; AES-GCM at rest (key from `AI_KEYS_ENCRYPTION_SECRET` ?? `BETTER_AUTH_SECRET`); stores ciphertext + last-4 only. **Wired into `worker/chat-agent.ts`**: `onConnect` resolves the Better Auth session from the WS upgrade cookies → `userId` on connection state; `onChatMessage` prefers the user's OpenAI (`@ai-sdk/openai`) / Anthropic (`@ai-sdk/anthropic`) key, with a 1-token pre-flight that falls back to `createWorkersAI` on any failure. **Workers AI stays the default** for anon users / no key / decrypt fail / provider reject. Key is never logged |
| Analytics | `lib/analytics.ts` + `components/analytics.tsx` | mounted in `app/layout.tsx`; no-op unless `NEXT_PUBLIC_ANALYTICS_PROVIDER` + id set; `track(event, props?)` |
| Monitoring | `lib/monitoring.ts` + `app/error.tsx` + `app/api/monitor/route.ts` | Sentry `fetch` envelope when `SENTRY_DSN` set, else `console.error`; no `@sentry/*` dep |
| Cron | `wrangler.jsonc` `triggers.crons` + `worker/index.ts` `scheduled()` | → `lib/jobs/digest.ts` `runDailyDigest(env)`; emails `DIGEST_TO` via Plunk or logs |
| Orgs (lite) | `migrations/0005_orgs.sql` + `lib/orgs.ts` + `app/orgs/*` + `app/api/orgs/*` | Flag-gated by `ENABLE_ORGS="true"`. Helpers: `createOrganization`/`listUserOrgs`/`getUserOrgRole`/`listOrgMembers`/`createInvitation` (roles owner/admin/member). Flag off → pages redirect `/dashboard`, API 404. Invites are D1-only stubs (no email) |
| Super-admin | `lib/admin.ts` + `app/admin/page.tsx` + `app/api/admin/impersonate` + `/stop-impersonate` | `ADMIN_EMAILS` allowlist (case-insensitive). Better Auth `admin` plugin (`migrations/0006_admin.sql`); routes call `ensureAdminRole` so the plugin permission check passes. ⚠️ impersonation = full account access; cannot impersonate another admin; add MFA + audit log for prod |
| Blog/changelog | `lib/blog.ts` → `app/blog/*`, `app/changelog/page.tsx` | hardcoded content, no MDX dep; slugs in sitemap |
| E2E | `playwright.config.ts` + `e2e/smoke.spec.ts` | `npm run test:e2e`; skips without a server; never gates build |

### Don't (P1)

- Don't wire a user AI key into `worker/chat-agent.ts` without keeping Workers AI as the default fallback. Don't log key material (plaintext, ciphertext, or provider error bodies — some 401s echo a masked key).
- Don't add `@sentry/*` or a heavy MDX pipeline.
- Don't make `npm run build` depend on Playwright.
- Don't render orgs UI or accept `/api/orgs*` writes when `ENABLE_ORGS !== "true"`.
- Don't add an impersonation path without the `ADMIN_EMAILS` check + the "can't impersonate an admin" block.
- New D1 tables/columns → new `migrations/000N_*.sql`; never edit `0001`–`0007`.

## P2 layer

| Concern | Entry point | Notes |
|---------|-------------|-------|
| Waitlist | `lib/waitlist.ts` + `app/api/waitlist/route.ts` + `/waitlist` + `components/waitlist-form.tsx` | D1 `waitlist` (`migrations/0007_p2.sql`). `joinWaitlist` lowercases/trims, shape-checks, UNIQUE conflict → `{ ok: true, already: true }` (never leaks new-vs-existing), swallows D1 errors. POST rate-limited via `env.KV` (8/min). Always attempts `sendWaitlistConfirmEmail`; owner ping via `sendWaitlistOwnerEmail` when `WAITLIST_NOTIFY_EMAIL` set. Email failure never fails the join |
| Docs / help center | `lib/docs.ts` → `app/docs/*` | Hardcoded arrays like `lib/blog.ts`. No MDX, no i18n. Pages: getting-started, auth, email-and-payments, agents-and-api, bindings. Slugs in `app/sitemap.xml` |
| Usage metering (display-only) | `lib/usage.ts` + `app/api/usage/route.ts` + `components/settings-usage.tsx` on `/settings` | D1 `usage_events`. `recordUsage` / `getUsageSummary` (units this month for `agent_tokens`, `MONTHLY_ALLOWANCE` = 10000). `ingestPolarUsage` is a **documented no-op** — never hits Polar's events API here. "Record demo unit" button POSTs `/api/usage` (session-gated, rate-limited). Halal: prepaid/fair metered credits, no riba/BNPL |
| Product API (agents) | `lib/product-api.ts` + `app/api/v1/{health,notes}/route.ts` | REST is the agent surface (no MCP SDK dep). `GET /api/v1/health` open; `GET|POST /api/v1/notes` gated by `Authorization: Bearer <PRODUCT_API_KEY>` when set, open/demo when unset. CORS `*` + `OPTIONS` preflight. Writes rate-limited via `env.KV`. See AGENTS.md "Product API (agents)" |

### Don't (P2)

- Don't add an i18n library or an MCP SDK dependency. Docs stay hardcoded in `lib/docs.ts`; the agent surface stays REST `/api/v1`.
- Don't make `ingestPolarUsage` actually call Polar — it's a logging no-op with the wiring documented in comments.
- Don't let `/api/waitlist` fail the join when an email send fails, and don't reveal whether an address was already on the list.
- Don't skip the `PRODUCT_API_KEY` bearer check on `/api/v1/notes` when the key is set.
- New D1 tables/columns → new `migrations/000N_*.sql`; never edit `0001`–`0007`.

## Don't (SaaS additions)

- Don't add Stripe/Clerk/Auth.js/Resend. Don't add subscription/instalment/interest framing.
- Don't rate-limit with `VINEXT_KV_CACHE` — use `env.KV`.
- Don't ship a webhook path without the `webhook_events` idempotency check.

See `AGENTS.md` and `README.md` for bindings, secrets, and deploy steps.
