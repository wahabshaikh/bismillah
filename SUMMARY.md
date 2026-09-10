# SUMMARY — Better Auth + Plunk + Polar

Added email/password auth (Better Auth), transactional email (Plunk), and halal
one-time payments (Polar) to the Bismillah template. Existing agent/chat/demos
and all `wrangler.jsonc` binding IDs are untouched.

## Dependencies

- `better-auth@^1.7.4`
- `@polar-sh/sdk@^0.49.0`
- (installed with `--legacy-peer-deps`; no Stripe/Clerk/Resend)

## New files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | `createAuth(env, request?)` factory — Better Auth, D1 native (`env.DB`), email/password, welcome-email `user.create` hook |
| `lib/auth-client.ts` | `authClient` — `better-auth/react` browser client |
| `lib/plunk.ts` | `sendTransactionalEmail(env, opts)` — fetch to `https://api.useplunk.com/v1/send`; demo-safe when `PLUNK_API_KEY` unset |
| `lib/polar.ts` | `createPolarClient`, `createCheckoutSession`, `verifyPolarWebhook` (Standard Webhooks via Web Crypto) |
| `app/api/auth/[...all]/route.ts` | GET/POST catch-all → `createAuth(env, request).handler(request)` |
| `app/api/checkout/route.ts` | GET → creates Polar checkout, 302 redirect to `checkout.url`; graceful `503` JSON when secrets missing |
| `app/api/webhooks/polar/route.ts` | POST stub — verifies signature when `POLAR_WEBHOOK_SECRET` set; on `order.paid`/`order.created` inserts into D1 `orders` |
| `app/login/page.tsx`, `app/login/LoginForm.tsx` | Email/password sign-in |
| `app/signup/page.tsx`, `app/signup/SignupForm.tsx` | Name/email/password sign-up |
| `app/account/page.tsx`, `app/account/SignOutButton.tsx` | Protected page — `getSession`, redirect to `/login` if none |
| `app/pricing/page.tsx` | One-time fair-price CTA → `/api/checkout` (no BNPL/riba/interest language) |
| `app/checkout/success/page.tsx` | Post-payment thank-you page |
| `migrations/0002_better_auth.sql` | Better Auth core schema (`user`, `session`, `account`, `verification`) + `orders` + indexes |

## Modified files

| File | Change |
|------|--------|
| `env.d.ts` | Added optional `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `PLUNK_API_KEY`, `PLUNK_FROM_EMAIL`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_PRODUCT_ID`, `POLAR_SERVER` |
| `app/page.tsx` | Added Sign in / Create account / Pricing nav + an "Accounts & pricing" feature card (chat/demos untouched) |
| `README.md` | Auth/email/payments section, demo paths, secrets checklist (names only), verify steps |
| `AGENTS.md` | Locked stack, hard rules, key paths, secrets list |
| `package.json` / `package-lock.json` | New deps |

## Not changed

- `wrangler.jsonc` — no binding IDs touched (D1/R2/KV/AI/DO)
- `worker/*`, `app/chat/*`, `app/demos/*`, existing `app/api/*`

## Verification

- `npm run typecheck` — passes
- `npm run build` — passes (all 15 routes build)
- `npm run db:migrate` — `0001` + `0002` apply cleanly to local D1

Notes: `npm run dev` requires `CLOUDFLARE_API_TOKEN` in this sandbox because the
`AI` binding is `remote: true` — a pre-existing environment constraint, unrelated
to these changes. No deploy performed. No secrets printed or committed.
