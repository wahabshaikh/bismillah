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

See `AGENTS.md` and `README.md` for bindings and deploy steps.
