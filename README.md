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
- Tailwind + shadcn-style UI primitives
- Typed `Env` (`env.d.ts`)

## Quick start

```bash
# Use Node 22+
npm install
npm run db:migrate   # apply D1 migrations locally
npm run dev          # vinext + wrangler local
```

Open the app, then try `/chat` and `/demos`.

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
- Webhook signing secrets for production auth

Never commit `.env` or secret values.

## Local verify

1. `npm install && npm run db:migrate && npm run dev`
2. Home page loads with Bismillah branding
3. `/api/hello` returns JSON
4. `/demos` — add a note, upload a file, increment counter
5. `/chat` — connect WebSocket, ask for weather/calc/timezone
6. `npm run typecheck` passes

## License

MIT · Halal only
