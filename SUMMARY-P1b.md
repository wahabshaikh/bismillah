# SUMMARY — P1b

Fourth slice on top of `e67229e` (P0 + P1). Halal only. No wrangler binding IDs
changed. No Turborepo / Stripe / Resend / Clerk / NextAuth. No secrets committed.

Claude model used: **Sonnet 5** (`claude-sonnet-5`).

---

## 1) BYOK → ChatAgent wiring — DONE

- `worker/chat-agent.ts`
  - New deps: `@ai-sdk/openai@^3.0.112`, `@ai-sdk/anthropic@^3.0.117` (provider
    major matches the installed `@ai-sdk/provider@3` / `ai@6`; `@ai-sdk/openai@3.0.112`
    was already in the tree via `agents`).
  - `onConnect(connection, ctx)` resolves the Better Auth session from the
    WebSocket **upgrade request cookies** (`ctx.request.headers`) and stores
    `userId` on connection state (survives DO hibernation) + an instance field
    for the fast path. No session → anonymous chat stays open.
  - `onChatMessage` → `resolveModel()`:
    - signed-in + `getDecryptedUserAiKey` returns `openai` → `createOpenAI({ apiKey })("gpt-4o-mini")`
    - `anthropic` → `createAnthropic({ apiKey })("claude-3-5-haiku-20241022")`
    - `workers_ai` / no key / decrypt fail → `createWorkersAI` + `@cf/zai-org/glm-4.7-flash`
    - a **1-token pre-flight `generateText`** validates the BYOK key; any failure
      → fall back to Workers AI.
  - Never logs key material: the pre-flight `catch` and `streamText` `onError`
    log the **provider name / a generic string only** — no error body (some
    providers echo a partially-masked key in 401 messages).
  - Tools + halal system prompt unchanged.
- Copy updated: `app/settings/page.tsx` + `components/settings-ai-keys.tsx` now
  say the key is used at `/chat` when signed in, Workers AI is the fallback.

## 2) Thin super-admin + impersonation — DONE

- `migrations/0006_admin.sql` — Better Auth `admin` plugin columns (all
  nullable / defaulted): `user.role`, `user.banned`, `user.banReason`,
  `user.banExpires`, `session.impersonatedBy`.
- `lib/auth.ts` — registers `admin({ impersonationSessionDuration: 3600 })`.
- `lib/admin.ts` — `parseAdminEmails`, `isSuperAdmin(env, email)` (case-insensitive
  trim), `requireSuperAdmin(env, session)` (redirects non-admins to `/dashboard`),
  plus `resolveAdminUserIds`, `ensureAdminRole` (sets `role='admin'` for an
  already-allowlisted caller so the plugin's permission check passes),
  `getAdminStats`, `findTargetUser`.
- `app/admin/page.tsx` — auth-gated + allowlist; warning banner about
  impersonation risk; stub stats (user + order counts from D1); impersonate form.
- `app/api/admin/impersonate/route.ts` — `POST { target: email|id }`. Requires a
  session + `isSuperAdmin`; rate-limited via `env.KV`; 404 on unknown user; 403
  on impersonating **another admin** (allowlist email or `role='admin'`); then
  `ensureAdminRole(caller)` and `auth.api.impersonateUser({ ..., asResponse: true })`
  so the Set-Cookie session swap + `admin_session` restore cookie flow through.
- `app/api/admin/stop-impersonate/route.ts` — `auth.api.stopImpersonating(...)`.
- No role column is forced on existing users; identity stays the `ADMIN_EMAILS`
  allowlist. RISK documented in code comments + README + AGENTS.md (full account
  access; prod needs MFA + audit log + user notice).
- Env: `ADMIN_EMAILS` added to `env.d.ts` + `.dev.vars.example`.

## 3) Orgs UI lite (flag-gated) — DONE

- `lib/orgs.ts` — kept `isOrgsEnabled`; added `slugify`, `createOrganization`
  (org + `owner` member in a D1 `batch`), `listUserOrgs`, `getOrganization`,
  `getUserOrgRole`, `listOrgMembers`, `listOrgInvitations`, `createInvitation`
  (pending row, 7-day expiry, **no email sent**). Roles: owner / admin / member.
  All helpers swallow D1 errors.
- `app/orgs/page.tsx` + `app/orgs/[id]/page.tsx` — `requireSession`; redirect to
  `/dashboard` when `ENABLE_ORGS !== "true"`. Create form, members list, invite
  form (owner/admin only).
- `app/api/orgs/route.ts` (GET list / POST create) + `app/api/orgs/[id]/invite/route.ts`
  (POST) — **404 when the flag is off**, 401 without a session, 403 for invite
  unless caller is owner/admin. Rate-limited via `env.KV`.
- `components/orgs-create-form.tsx`, `components/org-invite-form.tsx`.
- `/dashboard` shows an "Organizations" card only when the flag is on (and an
  "Admin" card only for allowlisted admins) — server-checked `env`.

## 4) Polar webhook e2e mock — DONE

- `e2e/polar-webhook.spec.ts` — POSTs a mock `order.paid` to
  `/api/webhooks/polar`, asserts `{ received: true }`, replays the same
  `webhook-id`, asserts `{ received: true, deduped: true }`. Uses the existing
  `serverUp` skip pattern (skips with no server). If the server has
  `POLAR_WEBHOOK_SECRET` set the unsigned POST 401s → the test `skip`s.
- `lib/polar.ts` — added test-only `signPolarWebhookForTest(secret, payload, { id, timestamp })`
  that returns the `webhook-id` / `-timestamp` / `-signature` headers using the
  same HMAC scheme as `verifyPolarWebhook` (available for a signed-path test).
- `e2e/smoke.spec.ts` — removed the stale `TODO(polar-webhook)` note.
- `.gitignore` — added `test-results/`, `playwright-report/`.

## Docs

- `README.md` — P1 additions list, migrations line, e2e section, new
  "Organizations (lite, flag-gated)" + "Super-admin & impersonation" sections,
  secrets table (`ADMIN_EMAILS`, `ENABLE_ORGS` reworded).
- `CLAUDE.md` — P1 table rows for BYOK→chat, Orgs (lite), Super-admin; new
  Don'ts; migration range `0001`–`0006`.
- `AGENTS.md` — auth line (`admin` plugin), P1 features, key paths, migrations.

---

## Verification

- `npm run typecheck` → **pass** (clean).
- `npm run build` → **pass** (all new routes listed: `/admin`,
  `/api/admin/impersonate`, `/api/admin/stop-impersonate`, `/orgs`, `/orgs/:id`,
  `/api/orgs`, `/api/orgs/:id/invite`).
- `npm run test:e2e` → the new `polar-webhook` spec **skips** cleanly (no server).
  The pre-existing browser-based smoke tests fail only because the Chromium
  binary isn't installed in this sandbox (`npx playwright install`); e2e never
  gates `npm run build`.

## Required after pulling this

- **Run `npm run db:migrate`** (and `db:migrate:remote` for prod) to apply
  `migrations/0006_admin.sql`. The `admin` plugin selects the new `user.role` /
  `banned` columns on every `getSession()`, so RSC pages 500 until it's applied.
- `npm install` uses `--legacy-peer-deps` (pre-existing: `wrangler` wants
  `@cloudflare/workers-types@^5`, the project pins `4.x`).

## Secrets (names only — never committed)

- New: `ADMIN_EMAILS` (comma-separated super-admin allowlist; empty = admin area
  off). Existing and unchanged: `ENABLE_ORGS` ("true" now also turns on the
  `/orgs` UI + API), `AI_KEYS_ENCRYPTION_SECRET`, `BETTER_AUTH_SECRET`,
  `POLAR_WEBHOOK_SECRET`, etc. BYOK provider keys are per-user, encrypted in D1
  (`user_ai_keys`) — not env vars.

## Deploy

**Skipped** as instructed. No `wrangler deploy` / `vinext-cloudflare deploy` run.
Cron trigger (`0 9 * * *`) left as-is.

## Paths touched

```
worker/chat-agent.ts                         (BYOK wiring)
lib/auth.ts                                   (admin plugin)
lib/admin.ts                                  (new)
lib/orgs.ts                                   (expanded)
lib/polar.ts                                  (signPolarWebhookForTest)
migrations/0006_admin.sql                     (new)
app/admin/page.tsx                            (new)
app/api/admin/impersonate/route.ts           (new)
app/api/admin/stop-impersonate/route.ts      (new)
app/orgs/page.tsx                             (new)
app/orgs/[id]/page.tsx                        (new)
app/api/orgs/route.ts                         (new)
app/api/orgs/[id]/invite/route.ts            (new)
app/dashboard/page.tsx                        (conditional org/admin links)
app/settings/page.tsx                         (BYOK copy)
components/admin-impersonate-form.tsx         (new)
components/orgs-create-form.tsx               (new)
components/org-invite-form.tsx                (new)
components/settings-ai-keys.tsx               (BYOK copy)
e2e/polar-webhook.spec.ts                     (new)
e2e/smoke.spec.ts                             (stale TODO removed)
env.d.ts / .dev.vars.example                  (ADMIN_EMAILS)
.gitignore                                    (test-results/, playwright-report/)
package.json / package-lock.json             (@ai-sdk/openai, @ai-sdk/anthropic)
README.md / CLAUDE.md / AGENTS.md             (docs)
```

## Push

Commit + push to `origin/main` (`wahabshaikh/bismillah`) — see the push SHA
printed after `git push` (`SUMMARY-P1b.md` is part of that commit).
