# bismillah

An open-source, multi-platform starter kit built entirely on Cloudflare, sized to
run on the [$5/mo Workers Paid plan](https://developers.cloudflare.com/workers/platform/pricing/).

> **Status:** the monorepo, tooling, CI and the API Worker are in place; the web and
> mobile apps are being built on top of it.

## Stack

| Concern         | Choice                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| Package manager | [pnpm](https://pnpm.io) workspaces with a shared version catalog         |
| Task runner     | [Turborepo](https://turborepo.com)                                       |
| Language        | TypeScript 7, strict everywhere                                          |
| Lint + format   | [Biome](https://biomejs.dev)                                             |
| Tests           | [Vitest](https://vitest.dev), Workers run in `workerd` via `@cloudflare/vitest-pool-workers` |
| Runtime         | [Cloudflare Workers](https://developers.cloudflare.com/workers/)         |
| API             | [Hono](https://hono.dev)                                                 |
| Database        | [D1](https://developers.cloudflare.com/d1/) + [Drizzle ORM](https://orm.drizzle.team) migrations |
| Auth            | [Better Auth](https://www.better-auth.com), sessions in Workers KV       |
| Files           | [R2](https://developers.cloudflare.com/r2/)                              |
| CI              | GitHub Actions: lint, typecheck, test                                    |

## Layout

```
apps/
  api/                API Worker: Hono, D1 + Drizzle, Better Auth, KV, R2 (see apps/api/README.md)
packages/
  core/               Runtime-agnostic helpers shared by every app
tooling/
  tsconfig/           Shared strict tsconfigs: base, library, worker
  wrangler/           Shared Wrangler defaults + the checker that enforces them
```

Internal packages export their TypeScript source directly (`"exports": "./src/index.ts"`),
so there is no build step between packages: Wrangler and Vitest bundle them as-is.

## Getting started

Requires Node.js 22.18+ (see `.nvmrc`) and pnpm 10 (`corepack enable`).

```sh
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm dev          # run every app locally
```

| Command               | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `pnpm dev`            | Runs all apps in dev mode (`wrangler dev` for Workers)             |
| `pnpm typecheck`      | Type-checks every package                                          |
| `pnpm lint`           | Biome lint + format check, then the Wrangler config check          |
| `pnpm format`         | Applies Biome formatting and safe fixes                            |
| `pnpm test`           | Runs every test suite; Worker tests run inside `workerd`           |
| `pnpm typegen`        | Regenerates `worker-configuration.d.ts` from each `wrangler.jsonc` |
| `pnpm check:wrangler` | Verifies every Worker matches `tooling/wrangler/base.jsonc`        |
| `pnpm fix:wrangler`   | Writes the shared Wrangler defaults into every Worker config       |

Turborepo runs `typegen` before `dev`, `typecheck` and `test`, so generated
Worker types are never stale.

## Wrangler config layout

Every Worker lives in its own package with its own `wrangler.jsonc` (JSONC only,
no TOML). Wrangler has no `extends`, so the settings every Worker must share live in
[`tooling/wrangler/base.jsonc`](tooling/wrangler/base.jsonc):

- `compatibility_date` and `compatibility_flags` (`nodejs_compat`)
- Workers Logs (`observability`) and source map uploads

`pnpm lint` fails when a Worker drifts from those values. To bump the
compatibility date, change it once in `base.jsonc`, then run `pnpm fix:wrangler`
and `pnpm typegen`. Everything else (bindings, routes, vars, `env` blocks) stays in
the Worker's own `wrangler.jsonc`.

Binding types are generated with `wrangler types` into a gitignored
`worker-configuration.d.ts`, which also carries the runtime types for the pinned
compatibility date, so there is no `@cloudflare/workers-types` dependency.

## Adding a package

1. Create `apps/<name>` (deployable) or `packages/<name>` (shared code).
2. Add a `package.json` named `@bismillah/<name>` and a `tsconfig.json` extending
   `@bismillah/tsconfig/worker.json` or `@bismillah/tsconfig/library.json`.
3. For a Worker, copy `apps/api/wrangler.jsonc`, change `name`, then run
   `pnpm install && pnpm check:wrangler`.
4. Reference shared dependency versions with `"catalog:"` (see `pnpm-workspace.yaml`).

## License

[MIT](LICENSE)
