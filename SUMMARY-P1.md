# SUMMARY-P1 — Bismillah “best in class” slice

Status after Claude Code P1 pass (`claude -p --permission-mode bypassPermissions --model sonnet`).
`npm run typecheck` + `npm run build` green. Local D1 migrations `0004` + `0005` applied.
Wrangler binding IDs untouched (only added `triggers.crons`). Deploy skipped (`CLOUDFLARE_API_TOKEN` token_len=0).

## Done

| # | P1 item | State | Where |
|---|---------|-------|-------|
| 1 | Onboarding checklist after first login | ✅ | `migrations/0004_onboarding.sql` (`user_onboarding`), `lib/onboarding.ts`, `app/api/onboarding/route.ts`, `components/onboarding-checklist.tsx` on `/dashboard` |
| 2 | User AI keys (BYOK, ZTS pattern) | ✅ | `user_ai_keys` in `0004`, `lib/user-ai-keys.ts` (AES-GCM + PBKDF2), `app/api/settings/ai-keys/route.ts`, `components/settings-ai-keys.tsx` on `/settings`; Workers AI stays default |
| 3 | Analytics hook stub (Plausible/DataFast) | ✅ | `lib/analytics.ts`, `components/analytics.tsx` in `app/layout.tsx`; env-gated |
| 4 | Error monitoring stub (Sentry optional) | ✅ | `lib/monitoring.ts` (fetch-to-envelope or console), `app/error.tsx`, `app/api/monitor/route.ts` |
| 5 | Cron / digest job sketch | ✅ | `wrangler.jsonc` `triggers.crons: ["0 9 * * *"]`, `worker/index.ts` `scheduled()`, `lib/jobs/digest.ts`; README cron section |
| 6 | Orgs/invites/RBAC thin schema | ✅ thin | `migrations/0005_orgs.sql` + `lib/orgs.ts` `isOrgsEnabled`; `ENABLE_ORGS=false` default; **no multi-tenant UI** |
| 7 | Playwright smoke skeleton | ✅ | `playwright.config.ts`, `e2e/smoke.spec.ts`, `npm run test:e2e`; CI e2e job `continue-on-error` |
| 8 | MDX/blog + changelog stubs | ✅ | `lib/blog.ts` (TS content modules — no heavy MDX dep), `app/blog/*`, `app/changelog/page.tsx`, sitemap entries |

## Remaining P1 / deferred

- **Super-admin + impersonation** (Makerkit) — deferred intentionally (bloating risk).
- **Orgs UI / invites / RBAC flows** — schema + flag only; full multi-tenant UI later.
- **BYOK → ChatAgent wiring** — key encrypted in D1; Workers AI remains default (comment in `worker/chat-agent.ts`).
- **Playwright browsers** — npm packages present; browsers not pre-downloaded locally (`npx playwright install` in CI).
- **Polar webhook e2e mock** — TODO comment in smoke spec only.

## Secret / env names added (all optional)

`AI_KEYS_ENCRYPTION_SECRET`, `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_DATAFAST_WEBSITE_ID`, `NEXT_PUBLIC_DATAFAST_DOMAIN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `DIGEST_TO`, `ENABLE_ORGS`

(Documented in `.dev.vars.example`, `env.d.ts`, README / AGENTS.md.)

## Demo / feature paths

| Path | Notes |
|------|-------|
| `/dashboard` | Onboarding checklist banner |
| `/settings` | Profile + billing + BYOK AI keys card |
| `/api/onboarding` | GET/POST checklist |
| `/api/settings/ai-keys` | GET meta / PUT / DELETE |
| `/api/monitor` | Client error reports → monitoring stub |
| `/blog`, `/blog/[slug]`, `/changelog` | Stub content |
| Cron `0 9 * * *` | `runDailyDigest` sketch |

## Verification

- `npm run db:migrate` — no pending (0004/0005 already applied locally)
- `npm run typecheck` — pass
- `npm run build` — pass (routes include onboarding, ai-keys, monitor, blog, changelog)

## Process notes

- Implementation: **Claude Code only** (`sonnet`, bypassPermissions). No Cursor CloudAgent, no Codex.
- Push: see git history on `wahabshaikh/bismillah` main.
- Deploy: **skipped** — `CLOUDFLARE_API_TOKEN` empty in box-secrets (`token_len=0`).
