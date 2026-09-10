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

## Hard rules

1. **Never overwrite binding IDs** in `wrangler.jsonc` (D1, KV ×2, R2 bucket name).
2. **Never merge** `KV` and `VINEXT_KV_CACHE`.
3. Prefer `import { env } from "cloudflare:workers"` in route handlers.
4. Match peer patterns under `/workspace/refs/vinext-agents-example` when changing agent routing.
5. Keep UI Tailwind + local shadcn-style primitives (`components/ui/*`).
6. Do not invent live demo URLs or paste API keys.

## Key paths

- `worker/index.ts`, `worker/chat-agent.ts`
- `app/chat/*`, `app/demos/*`, `app/api/*`
- `migrations/0001_init.sql`
- `env.d.ts`, `wrangler.jsonc`

## Commands

```bash
npm run dev
npm run build && npm run deploy
npm run db:migrate
npm run typecheck
```
