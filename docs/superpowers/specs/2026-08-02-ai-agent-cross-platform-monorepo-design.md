# AI-Agent Cross-Platform Monorepo Starter — Design

**Date:** 2026-08-02  
**Status:** Draft for user review  
**Audience:** Solopreneur who manages AI agents (Cursor, Claude Code, Codex, etc.) to ship production apps

## Goal

A **clone-per-product** monorepo template that lets AI agents build production-grade apps (web-only or iOS + Android + web) with minimal human micromanagement. The human provides high-level direction; agents brainstorm, plan, scaffold, deploy previews, and implement behind hard gates.

Marketing (SEO / GEO / AEO) and product virality (time-to-wow + share) are first-class, not afterthoughts.

## Success criteria

1. Clone → day-0 pipeline produces approved design + plan + configured repo + preview deploy without the human writing code.
2. Local-first product works with **zero** cloud keys.
3. Web-only and cross-platform modes use the same boilerplate; agents flip flags, not rewrite architecture.
4. Agents are not blocked: trusted skills + MCPs cover Expo/EAS, Next/Vercel, Neon, Better Auth, R2, Plunk, RevenueCat, marketing.
5. Free-tier friendly for **many parallel ideas** (no hard “2 projects / 1 domain” traps as defaults).

---

## Product decisions (settled)

| Decision | Choice |
|---|---|
| Repo shape | Clone-per-product template |
| Apps layout | `apps/web` + `apps/native` |
| Web surface | Next.js owns **marketing + web product** via `(marketing)` / `(app)` / `(auth)` route groups |
| Native surface | Expo Router (iOS/Android); Expo web opt-in only if brainstorm picks it |
| Hosting URLs | Path-only: `/` marketing, `/app` product — **no subdomain split in v1** |
| Data default | Local SQLite (native) + shared schema; web persistence behind same `packages/db` API |
| Sync | `SyncPort` + `NoopSync` default; **Neon** adapter when `sync.enabled` |
| Auth | Soft account: anonymous → optional Better Auth link |
| Cloud DB | **Neon** only (no Supabase / Turso in v1) |
| Storage | **Cloudflare R2** when `storage.enabled` (no UploadThing / Supabase Storage in v1) |
| Email | **Plunk** when email needed (no Resend / SES / SMTP2GO stubs in v1) |
| Billing | **RevenueCat** everywhere (mobile IAP + RC Web Billing); no Polar in v1 |
| Analytics | **PostHog** (no-op without key) |
| Web host | **Vercel** |
| Native ship | **EAS** Build / Update / Submit |
| Template fatness | Reference vertical (Notes) proving the spine |
| Day-0 | Full pipeline: brainstorm → plan → scaffold → deploy preview → implement |
| Activation | ≤90s aha; signup after value; share after emotion |
| Skills policy | Prefer trusted/popular public skills; custom only for repo-specific knowledge gaps |

---

## Architecture

### Repo layout

```text
apps/
  web/                 # Next.js App Router → Vercel
    app/
      (marketing)/     # landing, blog, legal, free tools, share previews
      (app)/           # product UI at /app/*
      (auth)/          # soft-account upgrade
  native/              # Expo Router → iOS/Android (+ optional web)

packages/
  db/                  # Drizzle schema + local persistence API
  sync/                # SyncPort, NoopSync, NeonSync only
  auth/                # anonymous device id + Better Auth client/server helpers
  billing/             # RevenueCat wrapper + stub mode
  analytics/           # PostHog wrapper (no-op without key)
  storage/             # R2 / S3-compatible presign helpers (off by default)
  email/               # Plunk transport (off by default)
  share/               # share sheet + link builders + copy templates
  activation/          # aha / milestone config types (no UI)
  ui-web/              # shadcn for apps/web
  ui-native/           # NativeWind primitives for apps/native
  tokens/              # shared design tokens (no React)
  config/              # zod env + feature flags

tooling/               # eslint, tsconfig, prettier, tailwind presets
skills/                # install manifest + thin repo-specific skills only
docs/superpowers/      # specs + plans from agent workflow
AGENTS.md              # cross-harness agent OS
.mcp.json.example      # approved MCP allowlist
.eas/                  # EAS workflow stubs
```

**Dependency rule:** `apps → packages`; never `web ↔ native` direct imports.

### Feature flags (`packages/config`)

| Flag | Default | Meaning |
|---|---|---|
| `native.enabled` | `true` in template; set `false` for web-only | Skip native deploy/work |
| `sync.enabled` | `false` | Neon sync |
| `auth.cloud.enabled` | `false` until soft-account upgrade path needed | Better Auth + Neon |
| `storage.enabled` | `false` | R2 |
| `email.enabled` | `false` | Plunk (usually with cloud auth) |
| `billing.enabled` | stub/off until keys | RevenueCat |
| `analytics.enabled` | no-op without key | PostHog |

### Modes (day-0 skill picks one)

| Mode | Web product | Native |
|---|---|---|
| Web-only | Next `(app)` | `native.enabled=false` |
| Cross-platform (default) | Next `(app)` | Expo iOS/Android |
| Native-first / offline-heavy | Thin marketing + product mostly native | Expo; Expo web only if explicitly chosen |

### Why not X (research-backed challenges)

| Rejected / deferred | Why |
|---|---|
| Supabase as default | 2 active free projects + idle pause — blocks rapid ideation |
| Turso as default | Neon preferred (Postgres ecosystem, 100 free projects, Better Auth affinity) |
| Polar | RevenueCat Web Billing covers web entitlements without dual stacks |
| PowerSync | Paid floor; DIY `SyncPort` + Neon is enough for v1 |
| Expo web as default `app.` host | Next is better for SEO tools + web-only products; Expo web remains opt-in |
| Subdomains | Extra DNS/agent complexity; path routing is enough for v1 |
| Resend | 1 free domain — same class of trap; Plunk chosen instead |
| Shared universal UI package | High agent failure rate; share **logic + tokens**, not screens |
| Nx | Overkill for solo &lt;10 packages; Turborepo + pnpm |

### Monorepo tooling

- **pnpm** workspaces + **Turborepo**
- Package namespace: `@repo/*` (renamed in scaffold)
- Inspired by create-t3-turbo layout, **inverted**: Next = marketing + web product; Expo = native product — not a shared tRPC SaaS core as the center of gravity

---

## Data, auth, sync, billing, email, storage

### Local-first data

- Source of truth: device/local DB via `packages/db`
- Native: expo-sqlite + Drizzle
- Web: same schema/API; platform adapter for persistence (implementation detail for planning)
- Cloud Postgres (Neon) only when sync/auth cloud flags are on

### Sync

```text
SyncPort { pull, push, status }
NoopSync          ← default
NeonSync          ← only cloud implementation in v1
```

No Supabase/Turso/PowerSync adapters in the repo for v1.

### Soft account

1. Anonymous device identity (SecureStore / localStorage)
2. Full product use locally
3. Prompt after aha: create account to sync/backup/restore purchases
4. Better Auth (email magic link first; OAuth later as needed) on Neon
5. Link merges anonymous local data → account

### Billing

- RevenueCat entitlements API as single source of truth
- Native: StoreKit / Play
- Web: RevenueCat Billing (Stripe)
- Paywall after aha or explicit Premium CTA
- Stub mode without API keys so UI can be built in dev

### Storage & email (modular)

- R2: presigned uploads/downloads; off by default
- Plunk: transactional (magic links, receipts); off by default
- No alternate provider stubs in v1

---

## Activation & virality (baked into code)

| Piece | Location | Behavior |
|---|---|---|
| Activation shell | `apps/web` + `apps/native` | Configurable short path → first win → celebrate; skip always available |
| Empty state | Notes vertical | Seeded demo or one-tap create — no empty desert |
| Soft-account prompt | After first win | Never a gate before aha |
| Share kit | `packages/share` | Native share sheet + Web Share + clipboard; prefilled copy + URL |
| Share trigger | After milestone | e.g. first note share |
| Share preview | `(marketing)` | Public preview page for recipients (content loop) |
| Analytics events | PostHog | `activation_*`, `aha_reached`, `share_*`, `account_linked`, `paywall_shown` |

**Hard rule:** No multi-screen tutorial onboarding. Permissions just-in-time. Paywall after value.

Deferred (skill may design later, not v1 code): Branch-style deferred deep links, paid referral rewards, contact-import invites.

---

## Reference vertical: Notes

Proves offline CRUD, activation, soft account, share, paywall stub, sync toggle, marketing SEO/share-preview patterns. Domain logic in packages; UI per app. Agents replace Notes with the real product after intake.

---

## Agent OS

### Entry files

- `AGENTS.md` — single source of truth (gates, layout, flags, skill policy, MCP allowlist)
- `CLAUDE.md` — pointer to `AGENTS.md`
- `.cursor/rules/` — short always-on pointers (no duplicated novels)
- `docs/superpowers/specs/` and `plans/` — design + implementation artifacts

### Day-0 pipeline (gated)

1. **Brainstorm** (Superpowers) — clarify idea; force aha + share loop + mode (web-only vs cross-platform)
2. **Writing-plans** (Superpowers)
3. **Scaffold** — rename `@repo`, env, flags, trim vertical
4. **Deploy preview** — Vercel web; EAS preview if native enabled
5. **Implement** — TDD / subagent execution per plan

Hard gates in `AGENTS.md`:

- No product code before approved design
- No cloud provision until a flag requires it
- No tutorial-wall onboarding
- Signup after aha; share after emotion
- Paywall after value
- **Skills policy:** search trusted public skills before writing custom ones

### Skills policy (user directive)

**Prefer the most trusted and popular skill for a task.**  
Install from official vendors or high-install registry entries (`skills.sh` / `npx skills find`).  
**Create a custom skill only if:**

1. The knowledge is specific to this monorepo’s conventions, or  
2. No trusted/popular skill adequately covers the task.

Ship `vercel-labs/skills` **find-skills** (or equivalent) so agents discover packages instead of inventing workflows.

### Recommended public skills (v1 install set)

Re-verify install counts on `skills.sh` at implementation time; pin versions in a manifest.

| Domain | Preferred source (examples) | Notes |
|---|---|---|
| SDLC / brainstorm / plans / TDD | **obra/superpowers** | Required methodology |
| Expo / EAS | **expo/skills** (official) | Router, EAS build/submit/update/hosting, NativeWind setup |
| Next / React / web | **vercel-labs/agent-skills** (official) | Prefer first-party |
| Better Auth | **better-auth/skills** (official, if present) | Else Context7 + docs MCP |
| Neon | **neondatabase** skills (e.g. neon-postgres) | Official preferred |
| Marketing SEO/GEO/AEO/copy | High-install sets e.g. **coreyhaines31/marketingskills**, **superamped/ai-marketing-skills**, or leaderboard SEO/AEO skills | Prefer MIT + high installs; do not invent parallel SEO skills |
| Virality / growth loops | Popular PLG/viral skills (e.g. make-product-viral / viral-loops) if reputation checks out | Custom only if none fit soft-account + share-kit wiring |
| Skill discovery | **vercel-labs find-skills** | Mandatory habit for agents |
| React Email / OG | Popular Resend/react-email or Next OG skills if trusted | Transport remains Plunk |

### Custom skills (only these expected in-repo)

Keep thin; point to public skills for depth.

| Custom skill | Why custom |
|---|---|
| `product-intake` | Orchestrates *this* template’s flags, modes, Notes vertical, and day-0 order |
| `repo-scaffold` | Renames `@repo`, wires env for Neon/R2/Plunk/RC/PostHog for *this* layout |
| `deploy-preview` | Exact Vercel root `apps/web` + EAS paths for *this* monorepo |
| `activation-wireup` | Maps activation/share packages into web + native route shells (repo-specific) |

Everything else: install public skills. Refresh the install manifest during implementation planning via `npx skills find`.

### MCPs (allowlist example)

Document in `.mcp.json.example`. Prefer Runlayer-managed servers. No shadow MCPs.

Suggested: Expo · Vercel · Context7 · Exa · RevenueCat · Neon/Postgres (if available) · others only with approval.

### Deploy & CI

| Target | Tool |
|---|---|
| Web | Vercel (`apps/web`) |
| Native | EAS Build / Update / Submit |
| CI | GitHub Actions: lint, typecheck, test, web build via Turborepo affected |

EAS Workflow stub for native preview when enabled. No kitchen-sink mobile CI in v1.

---

## Production free-tier posture (multi-idea)

| Concern | Choice | Freedom |
|---|---|---|
| Many product clones needing DB | Neon | ~100 free projects, scale-to-zero |
| File storage | R2 | Account quota, many buckets |
| Email domains | Plunk | Avoid Resend’s 1-domain free wall |
| Analytics | PostHog | Generous event free tier |
| Native builds | EAS Free | Limited builds; Update reduces rebuilds |
| Web host | Vercel Hobby | Fine for early marketing/web |

Local-only clones consume **zero** Neon/R2/Plunk projects.

---

## Non-goals (v1)

- Subdomain routing (`app.domain.com`)
- Supabase, Turso, Polar, Resend, PowerSync, UploadThing adapters
- Kitchen-sink CMS, push, email lifecycle builders, paid referral infra
- Universal shared screen component library
- Nx generators / multi-product studio monorepo

---

## Implementation phases (for later planning skill)

1. Monorepo skeleton (pnpm/turbo, tooling, AGENTS.md, flags)
2. `packages/db` + Notes domain model
3. `apps/web` marketing + `/app` Notes + activation/share shells
4. `apps/native` Notes parity
5. Auth/sync/storage/email/billing modules behind flags
6. Skills manifest install + thin custom orchestrators
7. Vercel + EAS + CI wiring
8. Docs: day-0 runbook for the human manager

---

## Open items for planning (not blockers)

- Exact web SQLite/IndexedDB adapter library choice behind `packages/db`
- Neon Auth vs self-hosted Better Auth on Vercel routes
- Plunk cloud domain limits confirmation at wire-up time
- Pin exact skill package versions from `skills.sh` leaderboard at implement time

---

## Approval

User approved sectional design through architecture, data/cloud stack, agent OS, activation/virality, reference vertical, and deploy/CI, with skills policy: **trusted/popular first, custom only when necessary.**
