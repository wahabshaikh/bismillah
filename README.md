# Bismillah

**Start every build in the Name — ship on Cloudflare.**

Public GitHub template: [vinext](https://github.com/cloudflare/vinext) App Router + Cloudflare Workers AI agents, D1, R2, and KV. Halal only. MIT licensed.

[![Typecheck](https://github.com/wahabshaikh/bismillah/actions/workflows/typecheck.yml/badge.svg)](https://github.com/wahabshaikh/bismillah/actions/workflows/typecheck.yml)

## Features

- Custom Worker entry with `ChatAgent` Durable Object (`/agents/*`)
- Workers AI chat UI with demo tools (weather, calculate, timezone)
- D1 notes API + demo UI
- R2 artifact upload/download demo
- KV visit counter (separate from vinext cache KV)
- **Better Auth** — email/password, magic link, Google OAuth, forgot/reset (`/login`, `/signup`, `/forgot-password`, `/reset-password`)
- Auth-gated `/dashboard` + `/settings` (profile + billing); `/account` redirects to `/dashboard`
- **Plunk** transactional email — welcome, magic-link, password-reset templates (`lib/email.ts`)
- **Polar** halal one-time checkout (`/pricing`, `/api/checkout`) + customer portal (`/api/portal`) + idempotent webhook receiver
- Marketing shell: hero, features, pricing, FAQ, CTA, dark mode toggle (localStorage + `.dark` on `<html>`)
- Legal stubs (`/privacy`, `/terms`); SEO metadata + OG, `sitemap.xml`, `robots.txt`
- Fixed-window rate limiting on `/api/auth/*` and `/api/webhooks/polar` via `env.KV`
- Tailwind + shadcn-style UI primitives
- Typed `Env` (`env.d.ts`)

## Quick start

```bash
# Use Node 22+
npm install
npm run db:migrate   # apply D1 migrations locally
npm run dev          # vinext + wrangler local
```

Open the app, then try `/chat`, `/demos`, `/signup`, and `/pricing`.

## Auth, email & payments

| Concern | Library | Where |
|---------|---------|-------|
| Auth | [Better Auth](https://better-auth.com) — email/password, magic link, Google OAuth | `lib/auth.ts` `createAuth(env, request?)`, client `lib/auth-client.ts`, server `lib/session.ts`, handler `app/api/auth/[...all]/route.ts` |
| Email | [Plunk](https://useplunk.com) (`POST https://api.useplunk.com/v1/send`) | transport `lib/plunk.ts`; templates `lib/email.ts` — `sendWelcomeEmail` / `sendMagicLinkEmail` / `sendPasswordResetEmail` |
| Payments | [Polar](https://polar.sh) (`@polar-sh/sdk`) | `lib/polar.ts` — `createCheckoutSession()`, `createPortalLink()`, `verifyPolarWebhook()`; routes `app/api/checkout`, `app/api/portal`, `app/api/webhooks/polar` |

- **Halal only:** Polar one-time payments, fair fixed price. No interest, no BNPL/instalment framing. `?type=subscription` is a wired-but-optional stub (`POLAR_SUBSCRIPTION_PRODUCT_ID`).
- Better Auth uses the D1 `DB` binding directly (native auto-detect). Run `npm run db:migrate` to create `user` / `session` / `account` / `verification` / `orders` (`migrations/0002_better_auth.sql`) and `webhook_events` (`migrations/0003_webhook_events.sql`).
- **Google OAuth** only registers when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set — otherwise the provider is omitted and the button reports it's unavailable.
- Every helper degrades gracefully when its secret is unset — the site never crashes in demo mode (email is logged and skipped; checkout/portal return a `503` JSON hint).
- On `order.paid` the Polar webhook records a row in D1 `orders`. Signature is verified with the Standard Webhooks scheme (Web Crypto) when `POLAR_WEBHOOK_SECRET` is set, and every delivery id is recorded in `webhook_events` so **retries are idempotent**.
- `/api/auth/*` and `/api/webhooks/polar` are rate-limited (fixed window) using the app `KV` namespace — never `VINEXT_KV_CACHE`.

Demo paths: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/dashboard` (protected), `/settings` (protected), `/pricing`, `/api/checkout`, `/api/portal`, `/checkout/success`, `/api/webhooks/polar`, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`.

### Plunk email DNS (SPF / DKIM / DMARC)

Real delivery requires authenticating your sending domain in the Plunk dashboard (Settings → Domains), then adding the records it shows at your DNS host:

| Type | Host | Value (example — use the exact values Plunk gives you) |
|------|------|--------|
| TXT (SPF) | `@` or subdomain | `v=spf1 include:_spf.useplunk.com ~all` (merge into one existing SPF record if you already have one) |
| CNAME/TXT (DKIM) | selector shown by Plunk, e.g. `plunk._domainkey` | the DKIM key Plunk provides |
| TXT (DMARC) | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com` — start with `p=none`, tighten to `quarantine`/`reject` once aligned |

Set `PLUNK_FROM_EMAIL` to an address on the authenticated domain. Verify in Plunk before sending; unauthenticated sends land in spam or bounce.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local vinext dev server |
| `npm run build` | Production Worker build |
| `npm run start` | Run built Worker with Wrangler |
| `npm run deploy` | Build + deploy via vinext-cloudflare |
| `npm run db:migrate` | Apply D1 migrations locally |
| `npm run db:migrate:remote` | Apply D1 migrations to remote |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run types` | Regenerate types with `wrangler types` |

## Bindings (do not overwrite IDs)

| Binding | Resource |
|---------|----------|
| `DB` | D1 `bismillah` · `36a267af-1bd7-4da0-af68-95654c6d46c3` |
| `ARTIFACTS` | R2 `bismillah-artifacts` |
| `KV` | App KV · `2423ae5f6f90406d8a2233680c5d1c26` |
| `VINEXT_KV_CACHE` | vinext ISR/cache · `02cf4b23eb084760b4fd0e755bbd6e96` |
| `AI` | Workers AI |
| `ChatAgent` | Durable Object (SQLite class) |
| `ASSETS` | Static assets |

**Keep the two KV namespaces separate.** App counters/rate-limits use `KV`. vinext cache uses `VINEXT_KV_CACHE`.

## Deploy

```bash
npx wrangler login          # if not authenticated
npm run db:migrate:remote   # once
npm run build
npm run deploy
```

Or: `npm run build && npx vinext-cloudflare deploy --config dist/server/wrangler.json`

After deploy, confirm the Worker URL in the Cloudflare dashboard / wrangler output. Do not invent a demo URL.

## Secrets checklist

This template’s demos use **Workers AI**, **D1**, **R2**, and **KV** via bindings — no API keys required for the stock demos.

If you extend the agent with third-party models or webhooks, set secrets via:

```bash
npx wrangler secret put YOUR_SECRET_NAME
```

Or in the Cloudflare dashboard → Workers → **bismillah** → Settings → Variables and Secrets.

Common optional secrets (only if you add them):

- `OPENAI_API_KEY` / other model keys (not used by default — Workers AI binding is enough)

### Auth / email / payments secrets (names only — never commit values)

Copy `.dev.vars.example` → `.dev.vars` for local dev. All are optional; features degrade to demo mode when unset.

| Secret | Purpose | Required for |
|--------|---------|--------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin (used for OG, sitemap, robots, checkout URLs) | Correct absolute URLs in production |
| `BETTER_AUTH_SECRET` | Session signing key (32+ chars) | Production auth |
| `BETTER_AUTH_URL` | Canonical origin, e.g. `https://your.workers.dev` | Auth behind a proxy / custom domain |
| `GOOGLE_CLIENT_ID` | Google OAuth client id | Google sign-in (needs both id + secret) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Google sign-in |
| `PLUNK_API_KEY` | Plunk secret key (`sk_...`) | Sending real emails (welcome / magic link / reset) |
| `PLUNK_FROM_EMAIL` | Verified Plunk sender address on an authenticated domain | Overriding the default `from` |
| `POLAR_ACCESS_TOKEN` | Polar organization access token | Creating checkouts / portal sessions |
| `POLAR_PRODUCT_ID` | Polar one-time product id to sell | `/api/checkout` |
| `POLAR_SUBSCRIPTION_PRODUCT_ID` | Polar recurring product id (optional stub) | `/api/checkout?type=subscription` |
| `POLAR_WEBHOOK_SECRET` | Polar webhook signing secret (`whsec_...`) | Verifying `/api/webhooks/polar` |
| `POLAR_SERVER` | `sandbox` or `production` (defaults to `production`) | Using the Polar sandbox |

Set each with `npx wrangler secret put <NAME>`. Never commit `.env`, `.dev.vars`, or secret values. The Google OAuth redirect URL to register is `<origin>/api/auth/callback/google`.

## Local verify

1. `npm install && npm run db:migrate && npm run dev`
2. Home page loads with Bismillah branding
3. `/api/hello` returns JSON
4. `/demos` — add a note, upload a file, increment counter
5. `/chat` — connect WebSocket, ask for weather/calc/timezone
6. `/signup` — create an account, land on `/dashboard`; welcome email is logged in demo mode
7. `/login` → **Email me a magic link** / **Forgot your password?** — links are logged in demo mode
8. `/settings` — profile from session; **Buy the template** / **Open customer portal** links
9. `/pricing` → **Buy once** — returns a `503` hint until `POLAR_*` secrets are set
10. `/sitemap.xml` and `/robots.txt` return content
11. `npm run typecheck` and `npm run build` pass

## License

MIT · Halal only
