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

## Don't (SaaS additions)

- Don't add Stripe/Clerk/Auth.js/Resend. Don't add subscription/instalment/interest framing.
- Don't rate-limit with `VINEXT_KV_CACHE` — use `env.KV`.
- Don't ship a webhook path without the `webhook_events` idempotency check.

See `AGENTS.md` and `README.md` for bindings, secrets, and deploy steps.
