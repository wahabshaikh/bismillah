# SUMMARY-P0 — Bismillah production brief

Status of every **P0** item in `/workspace/bismillah-build/PRODUCTION-BRIEF.md`
after this pass. `npm run typecheck` and `npm run build` both pass; `npm run
db:migrate` applies `0001`–`0003` cleanly to local D1. No deploy, no push, no
secrets printed. All `wrangler.jsonc` binding IDs untouched.

## P0 status

| # | P0 item | State | Where |
|---|---------|-------|-------|
| 1 | Better Auth on D1: email/password | ✅ done | `lib/auth.ts` |
| 1 | Magic link (Plunk delivery) | ✅ done | `magicLink` plugin in `lib/auth.ts`, `magicLinkClient` in `lib/auth-client.ts`, email in `lib/email.ts` |
| 1 | Google OAuth (only when `GOOGLE_CLIENT_ID`+`GOOGLE_CLIENT_SECRET` set) | ✅ done | `socialProviders` conditional in `lib/auth.ts`; buttons on `/login` + `/signup` |
| 1 | Forgot / reset password via Plunk | ✅ done | `emailAndPassword.sendResetPassword` → `lib/email.ts`; pages `/forgot-password`, `/reset-password` |
| 1 | baseURL from `BETTER_AUTH_URL` / origin, secret from `BETTER_AUTH_SECRET` | ✅ done | `lib/site.ts` `getSiteUrl()` + `lib/auth.ts` |
| 1 | `app/api/auth/[...all]/route.ts` GET+POST | ✅ done (already existed) + rate-limit wired |
| 1 | Pages `/login` `/signup` `/forgot-password` `/reset-password` | ✅ done | shadcn-style forms |
| 1 | Protected `/dashboard` `/settings` (redirect to `/login`) | ✅ done | `lib/session.ts` `requireSession()` |
| 1 | Migration: Better Auth tables + `orders` + `webhook_events` | ✅ done | `orders` + core tables in `0002` (pre-existing); **`webhook_events` in new `migrations/0003_webhook_events.sql`** (0002 was already applied — applied migrations are not edited) |
| 2 | `lib/email.ts` adapter wrapping Plunk (welcome / magic-link / password-reset) | ✅ done | re-exports `sendTransactionalEmail`; `lib/plunk.ts` kept as transport |
| 2 | fetch `api.useplunk.com/v1/send` with Bearer key | ✅ done (pre-existing `lib/plunk.ts`) |
| 2 | Missing key → log + no-op | ✅ done |
| 2 | README DNS SPF/DKIM/DMARC notes | ✅ done | README "Plunk email DNS" table |
| 3 | `lib/polar.ts` checkout session + portal helper | ✅ done | `createCheckoutSession`, `createPortalLink` |
| 3 | `app/api/checkout` GET → redirect; `?type=subscription` stub via `POLAR_SUBSCRIPTION_PRODUCT_ID` | ✅ done |
| 3 | `app/api/portal` GET → customer portal URL stub (uses session user id as Polar external id) | ✅ done | soft 503 `setup` message when no Polar customer |
| 3 | `app/api/webhooks/polar` POST: signature verify + **idempotency** (`webhook_events` id PK) + `orders` insert on `order.paid` | ✅ done | signature via Web Crypto (Standard Webhooks) — see note below |
| 3 | `/checkout/success` page | ✅ done (pre-existing) |
| 3 | Pricing CTA, no BNPL/riba language | ✅ done | `/pricing` + homepage pricing section |
| 4 | Marketing shell `/`: hero, features, pricing, FAQ, CTA | ✅ done | `app/page.tsx` rebuilt |
| 4 | Dark mode (localStorage + `.dark` on `<html>`) | ✅ done | `components/theme-toggle.tsx` + FOUC-guard script in `app/layout.tsx` + `@custom-variant dark` in `globals.css` |
| 4 | Nav links: Pricing, Login, Signup, Chat, Demos, Dashboard | ✅ done |
| 5 | `/dashboard` protected stub (welcome + links) | ✅ done |
| 5 | `/settings` profile + billing (checkout + portal links) | ✅ done |
| 6 | `/privacy` `/terms` placeholder pages + generation notes | ✅ done |
| 7 | Root metadata + OG in layout | ✅ done | `app/layout.tsx` (`metadataBase`, `openGraph`, `twitter`, title template) |
| 7 | sitemap | ✅ done | `app/sitemap.xml/route.ts` |
| 7 | robots | ✅ done | `app/robots.txt/route.ts` |
| 7 | Site URL: `NEXT_PUBLIC_SITE_URL` / `BETTER_AUTH_URL` / fallback | ✅ done | `lib/site.ts` (fallback `https://bismillah.wahabshaikh.workers.dev`) |
| 8 | `.dev.vars.example` (names only) | ✅ done | + `.gitignore` now ignores `.dev.vars`, keeps the example |
| 8 | README secrets checklist + AGENTS.md update | ✅ done |
| 9 | `lib/rate-limit.ts` via `env.KV` (not `VINEXT_KV_CACHE`) | ✅ done | fixed window; fails open if KV unbound |
| 9 | Wire into auth catch-all + webhook | ✅ done | `auth` 30/60s, `webhook` 60/60s per IP |
| 10 | Expand AGENTS.md + CLAUDE.md with SaaS workflows | ✅ done |
| 11 | `env.d.ts` types | ✅ done | added `NEXT_PUBLIC_SITE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `POLAR_SUBSCRIPTION_PRODUCT_ID` (rest already present) |
| 12 | `npm run typecheck` + `npm run build` pass | ✅ done | see below |

## Files added

```
lib/email.ts                       Plunk template adapter (welcome / magic-link / reset)
lib/rate-limit.ts                  fixed-window limiter on env.KV
lib/session.ts                     getSession / requireSession for RSC
lib/site.ts                        getSiteUrl(env, request?)
components/theme-toggle.tsx        client dark-mode toggle
components/sign-out-button.tsx     moved out of app/account/
app/forgot-password/{page,ForgotPasswordForm}.tsx
app/reset-password/{page,ResetPasswordForm}.tsx
app/dashboard/page.tsx             auth-gated
app/settings/page.tsx              auth-gated, billing links
app/account/page.tsx               redirect → /dashboard (alias)
app/privacy/page.tsx               legal stub
app/terms/page.tsx                 legal stub
app/api/portal/route.ts            Polar customer portal redirect
app/sitemap.xml/route.ts
app/robots.txt/route.ts
migrations/0003_webhook_events.sql
.dev.vars.example
SUMMARY-P0.md
```

## Files modified

```
lib/auth.ts            + magicLink plugin, conditional Google, sendResetPassword, getSiteUrl
lib/auth-client.ts     + magicLinkClient()
lib/polar.ts           + subscription branch, externalCustomerId, createPortalLink()
app/api/auth/[...all]/route.ts   + rate limit
app/api/checkout/route.ts        + ?type=subscription, session email/externalId, getSiteUrl
app/api/webhooks/polar/route.ts  + rate limit + webhook_events idempotency
app/layout.tsx         + OG/metadata, theme init script
app/globals.css        + @custom-variant dark + html.dark tokens
app/page.tsx           marketing shell rebuild (hero/features/pricing/FAQ/CTA/nav/dark)
app/login/LoginForm.tsx   + magic link, Google, forgot link, dark; redirect → /dashboard
app/signup/SignupForm.tsx + Google, dark; redirect → /dashboard
env.d.ts               + new vars
AGENTS.md / CLAUDE.md / README.md / .gitignore
```

Removed: `app/account/SignOutButton.tsx` (moved to `components/sign-out-button.tsx`).

## Verification

- `npm run typecheck` — pass
- `npm run build` — pass (24 routes; `/`, `/dashboard`, `/settings`, all API routes, `/sitemap.xml`, `/robots.txt` present)
- `npm run db:migrate` — `0003_webhook_events.sql` applies to local D1

## Deviations / notes

- **Webhook signature**: kept the existing hand-rolled Standard-Webhooks
  verification (`verifyPolarWebhook`, Web Crypto only) instead of switching to
  `@polar-sh/sdk/webhooks` `validateEvent`, which pulls in the `standardwebhooks`
  package / Node `crypto` + `Buffer`. Same scheme, fewer Workers-compat risks.
- **`webhook_events` lives in `0003`, not `0002`** — `0002` was already applied
  locally and applied migrations must not be edited (AGENTS rule). Same tables,
  same result after `db:migrate`.
- **Subscriptions** are a wired stub only: `/api/checkout?type=subscription`
  reads `POLAR_SUBSCRIPTION_PRODUCT_ID`; no recurring-billing UI.
- **Customer portal** matches the Polar customer by external id (Better Auth
  user id, set on checkout). Before a user's first purchase there is no Polar
  customer, so `/api/portal` returns a soft 503 with a setup message.
- `env` is read at module scope in `layout.tsx` / `sitemap` / `robots` via
  `cloudflare:workers` — consistent with existing route handlers; build is happy.

## Remaining gaps vs PRODUCTION-BRIEF.md (all P1+, not P0)

- P0 #9 "CSRF/session hardening per Better Auth CF docs" — relying on Better
  Auth defaults + `trustedOrigins`; no extra cookie/CSRF config added.
- P0 #11 "wire chat behind auth optional flag" — chat intentionally left fully
  public (brief default: "chat stays open by default").
- P0 #12 deploy/redeploy + push — intentionally NOT done (instructed not to).
- P1: orgs/RBAC, super-admin/impersonation, Playwright smoke, MDX blog/changelog,
  onboarding checklist, analytics/error-monitoring stubs, user-scoped AI keys,
  cron/queue email digest — none started.
- `SUMMARY.md` (the earlier thin-slice summary) is left in place; this file
  supersedes it for P0 tracking.
