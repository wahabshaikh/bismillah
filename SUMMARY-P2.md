# SUMMARY — P2 polish slice

Fifth slice on top of `54568e7` (P0 + P1 + P1b). Halal only. **No wrangler
binding IDs changed. No new dependencies. No Turborepo / Stripe / Resend / Clerk /
NextAuth / i18n / MCP SDK. No secrets committed. No deploy.**

Claude model used: **Sonnet 5** (`claude-sonnet-5`).

Feature commit + push: `ec1a6f6` → `origin/main` (`wahabshaikh/bismillah`).
(This file lands in a follow-up `docs: SUMMARY-P2` commit.)

---

## Done — all 5 items

### 1) Waitlist plugin stub
- `migrations/0007_p2.sql` — `waitlist(id, email UNIQUE, name, source, created_at)` + `idx_waitlist_created_at`.
- `lib/waitlist.ts` — `joinWaitlist(env, { email, name?, source? })`: lowercase+trim, loose email shape check, insert. UNIQUE conflict → `{ ok: true, already: true }` (response never leaks new-vs-existing). D1 errors → `{ ok: false, error }`. Plus `looksLikeEmail`, `normalizeEmail`, `getWaitlistCount`.
- `app/api/waitlist/route.ts` — `POST { email, name? }`. Rate-limited via `env.KV` (`key: "waitlist"`, 8/min per IP). Validates email → `joinWaitlist`. Always attempts `sendWaitlistConfirmEmail` (joiner); if `WAITLIST_NOTIFY_EMAIL` set, also `sendWaitlistOwnerEmail` (owner ping with list total). Email sends wrapped in try/catch — a failure never fails the join.
- `lib/email.ts` — new `sendWaitlistConfirmEmail` + `sendWaitlistOwnerEmail`, both via `sendTransactionalEmail` (no-op + log when `PLUNK_API_KEY` unset).
- `app/waitlist/page.tsx` + `components/waitlist-form.tsx` — email (+ optional name), success state, "already have an invite? sign up" → `/signup`. Existing Card / Input / Button + emerald / dark-mode styling.
- `/waitlist` added to `app/sitemap.xml/route.ts`, home `navLinks`, and home footer.

### 2) Docs / help center stub (no i18n, no MDX, no deps)
- `lib/docs.ts` — `DOCS: { slug, title, description, body: string[] }[]` + `getDoc`. Pages: `getting-started`, `auth`, `email-and-payments`, `agents-and-api`, `bindings` (includes the binding-ID table + "don't merge KV" note).
- `app/docs/page.tsx` (index) + `app/docs/[slug]/page.tsx` (`generateStaticParams` + `generateMetadata`, groups `- ` lines into `<ul>`). Mirrors `app/blog/*` layout.
- `/docs` + every doc slug added to `app/sitemap.xml/route.ts`. Linked from home nav + footer and from README ("P2 additions" / Docs).

### 3) Polar usage-metering UI stub (display-only)
- `migrations/0007_p2.sql` — `usage_events(id, user_id, meter, units, created_at)` + `idx_usage_user_meter`.
- `lib/usage.ts`:
  - `recordUsage(env, { userId?, meter?, units? })` — inserts a D1 row, then calls `ingestPolarUsage(...)`.
  - `ingestPolarUsage(...)` — **documented no-op**: logs only, and only when `POLAR_ACCESS_TOKEN` **and** `POLAR_METER_ID` are both set. A comment block spells out the exact Polar Events ingest payload / meter wiring to add later. Does **not** hit Polar's API in this slice.
  - `getUsageSummary(env, userId)` — `SUM(units)` for `meter = "agent_tokens"` in the current calendar month (`strftime('%Y-%m')`), plus `allowance = MONTHLY_ALLOWANCE` (10000) constant for the bar. Halal framing: prepaid / fair metered credits, never interest / BNPL / subscription pressure.
- `components/settings-usage.tsx` — display-only card: `used / allowance` + progress bar; "No metered usage yet — this is a display stub." when zero; **"Record demo unit"** button → `POST /api/usage`.
- `app/settings/page.tsx` — new "Usage this month" Card (auth-gated page already has `requireSession`), server-renders `getUsageSummary` as the initial value.
- `app/api/usage/route.ts` — `GET` (summary) + `POST` (record 1–100 units, default 1). Session-gated (401 without), rate-limited via `env.KV` (`key: "usage"`, 12/min).
- `POLAR_METER_ID` added to `env.d.ts` + `.dev.vars.example`.
- Chat-agent left untouched (recording from the DO stays optional; the Settings button is the demonstrable path).

### 4) Product API for agents — REST `/api/v1` (no MCP SDK)
- `lib/product-api.ts` — `APP_NAME` / `APP_VERSION` ("0.1.0"), `jsonWithCors`, `corsPreflight`, `requireProductApiKey(env, request)` (returns `null` when open/authorised, else a 401 `Response`).
- `app/api/v1/health/route.ts` — `GET` → `{ ok: true, name: "bismillah", version: "0.1.0" }` (always open) + `OPTIONS`.
- `app/api/v1/notes/route.ts` — `GET` → `{ notes }`, `POST { title, body? }` → `{ note }` (201), `OPTIONS` preflight. Optional `Authorization: Bearer <PRODUCT_API_KEY>` gate (open/demo when unset). `POST` rate-limited via `env.KV` (`key: "product-api-notes"`, 20/min). Same D1 `notes` shape as `/api/notes`.
- CORS: `Access-Control-Allow-Origin: *`, `GET, POST, OPTIONS`, `Content-Type, Authorization`.
- `AGENTS.md` → new "Product API (agents)" section: base path, endpoints, auth header, demo-open note, `curl` examples for health + list + create, and the "an MCP server can wrap these REST tools later" note.
- `PRODUCT_API_KEY` added to `env.d.ts` + `.dev.vars.example` + README secrets table.

### 5) README wedge + secrets checklist sync
- README: **"Why Bismillah wins"** section right after the badge — Cloudflare-native full stack (vinext Workers + D1/R2/KV + DO agents + Workers AI) *and* Better Auth + Plunk + Polar; ShipFast-speed surface + Supastarter/Makerkit production guts + ZTS agentic AI without Vercel/Postgres; halal only.
- README: **"P2 additions"** feature list (waitlist, docs, usage stub, `/api/v1`); secrets checklist table gains `WAITLIST_NOTIFY_EMAIL`, `POLAR_METER_ID`, `PRODUCT_API_KEY` (all optional); migrations line now `… 0007_p2.sql`.
- `AGENTS.md`: "P2 features" block, "Product API (agents)" section, key-paths entries, secrets list, hard rules 10–11 (no i18n / no MCP SDK; `ingestPolarUsage` stays a no-op).
- `CLAUDE.md`: "P2 layer" table + "Don't (P2)" list; migration range bumped to `0001`–`0007`.
- Home page: Docs + Waitlist added to `navLinks` and footer (also Blog in footer).

---

## Migration applied
- `npm run db:migrate` (local only) → `0007_p2.sql` applied, 5 commands OK.
- Remote migrate **not** run (no deploy this slice). Run `npm run db:migrate:remote` when deploying.

## Verification
- `npm run typecheck` → **pass** (clean).
- `npm run build` → **pass**. New routes listed: `/waitlist`, `/docs`, `/docs/:slug`, `/api/waitlist`, `/api/usage`, `/api/v1/health`, `/api/v1/notes`.
- `npm run test:e2e` — not part of this slice; unchanged, never gates the build.

## Secrets (names only — never committed; all optional, demo-safe when unset)
- **New this slice:** `WAITLIST_NOTIFY_EMAIL` (owner ping target for `/api/waitlist`), `POLAR_METER_ID` (for the documented `ingestPolarUsage` hook; no-op unless set with `POLAR_ACCESS_TOKEN`), `PRODUCT_API_KEY` (bearer gate for `/api/v1/notes`; surface open/demo when unset).
- Unchanged: all P0/P1/P1b names (`BETTER_AUTH_SECRET`, `PLUNK_API_KEY`, `POLAR_*`, `AI_KEYS_ENCRYPTION_SECRET`, `ADMIN_EMAILS`, `ENABLE_ORGS`, …).

## Paths touched
```
migrations/0007_p2.sql                         (new — waitlist + usage_events)
lib/waitlist.ts                                (new)
lib/docs.ts                                    (new)
lib/usage.ts                                   (new)
lib/product-api.ts                             (new)
lib/email.ts                                   (+ waitlist confirm / owner helpers)
app/api/waitlist/route.ts                      (new)
app/api/usage/route.ts                         (new)
app/api/v1/health/route.ts                     (new)
app/api/v1/notes/route.ts                      (new)
app/waitlist/page.tsx                          (new)
app/docs/page.tsx                              (new)
app/docs/[slug]/page.tsx                       (new)
components/waitlist-form.tsx                   (new)
components/settings-usage.tsx                  (new)
app/settings/page.tsx                          (+ Usage card)
app/sitemap.xml/route.ts                       (+ /waitlist, /docs, doc slugs)
app/page.tsx                                   (nav + footer: Docs, Waitlist)
env.d.ts / .dev.vars.example                   (WAITLIST_NOTIFY_EMAIL, POLAR_METER_ID, PRODUCT_API_KEY)
README.md / AGENTS.md / CLAUDE.md              (wedge, secrets sync, P2 docs)
```

## Remaining / out of scope (intentionally)
- Full i18n — skipped per brief.
- Live Polar Events/Meters ingestion — only the `ingestPolarUsage` hook + comments ship; no real call.
- An actual MCP server — the REST `/api/v1` surface ships; an MCP wrapper is documented as a later add.
- Recording usage from `worker/chat-agent.ts` — left as a documented optional; the Settings "Record demo unit" button is the demonstrable path so chat is untouched.
- E2E specs for the new routes — not in scope for this slice.

## Deploy
**Skipped** as instructed (`CLOUDFLARE_API_TOKEN` empty). No `wrangler deploy` /
`vinext-cloudflare deploy` / remote D1 migrate run. Cron trigger (`0 9 * * *`),
`ChatAgent` name, and `worker` main left as-is.

## Push
- Feature commit: `ec1a6f6` → `origin/main`.
- Docs commit (`docs: SUMMARY-P2`): see `git log` — pushed to `origin/main` immediately after.
