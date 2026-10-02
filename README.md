# bismillah

An open-source, multi-platform starter kit built entirely on Cloudflare, sized to
run on the [$5/mo Workers Paid plan](https://developers.cloudflare.com/workers/platform/pricing/).

API, web app and mobile app on one typed API, with auth, a database, file uploads, background
jobs, realtime events, transactional email and payments, all on Cloudflare.

## Quickstart

```sh
git clone https://github.com/wahabshaikh/bismillah my-app && cd my-app
corepack enable && pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars   # then set BETTER_AUTH_SECRET
pnpm dev                                           # everything runs locally, no account needed
```

When you're ready to ship:

```sh
pnpm run deploy
```

That signs you in to Cloudflare, creates the database, bucket, queue and KV namespace, applies
migrations, sets secrets, and deploys the API and web app to your domain. See
[docs/deploy.md](docs/deploy.md), and [docs/budget.md](docs/budget.md) for what it all costs
on the $5 plan (a worked example of 3,000 daily users fits).

## Stack

| Concern         | Choice                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| Package manager | [pnpm](https://pnpm.io) workspaces with a shared version catalog         |
| Task runner     | [Turborepo](https://turborepo.com)                                       |
| Language        | TypeScript 7, strict everywhere                                          |
| Lint + format   | [Biome](https://biomejs.dev)                                             |
| Tests           | [Vitest](https://vitest.dev), Workers run in `workerd` via `@cloudflare/vitest-pool-workers` |
| Runtime         | [Cloudflare Workers](https://developers.cloudflare.com/workers/)         |
| Web             | [TanStack Start](https://tanstack.com/start) (React 19, SSR in a Worker) + [TanStack Query](https://tanstack.com/query), [Tailwind CSS v4](https://tailwindcss.com) |
| Mobile          | [Expo](https://expo.dev) SDK 57 + [Expo Router](https://docs.expo.dev/router/introduction/) (iOS and Android) + TanStack Query |
| API             | [Hono](https://hono.dev), typed end to end with [Hono RPC](https://hono.dev/docs/guides/rpc) |
| Database        | [D1](https://developers.cloudflare.com/d1/) + [Drizzle ORM](https://orm.drizzle.team) migrations |
| Auth            | [Better Auth](https://www.better-auth.com), sessions in Workers KV       |
| Organizations   | Better Auth organizations: roles, email invitations, teams and an org switcher on web and mobile ([docs/organizations.md](docs/organizations.md)) |
| Files           | [R2](https://developers.cloudflare.com/r2/)                              |
| Background jobs | [Queues](https://developers.cloudflare.com/queues/) + [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) |
| Realtime        | [Durable Objects](https://developers.cloudflare.com/durable-objects/) with hibernatable WebSockets |
| Email           | [Cloudflare Email Service](https://developers.cloudflare.com/email-service/): verification, password reset and password-changed emails, sent from the queue |
| Payments        | [Whop](https://whop.com) hosted checkout, with memberships synced to D1 by a signed webhook (optional, [docs/payments.md](docs/payments.md)) |
| CI              | GitHub Actions: lint, typecheck, test, build, deploy dry run             |
| Deploy          | `pnpm run deploy`: one command, idempotent, CI-friendly                  |

## Layout

```
apps/
  api/                API Worker: Hono, D1 + Drizzle, Better Auth, KV, R2, Queues, Cron,
                      Durable Objects, Email Service (see apps/api/README.md)
  web/                Web Worker: TanStack Start + static assets (see apps/web/README.md)
  mobile/             Expo app for iOS and Android (see apps/mobile/README.md)
packages/
  api-client/         Typed Hono RPC client for the API, shared by web and mobile
  core/               Runtime-agnostic helpers shared by every app
  ui/                 Shared React components and Tailwind design tokens
tooling/
  tsconfig/           Shared strict tsconfigs: base, library, worker, react
  wrangler/           Shared Wrangler defaults + the checker that enforces them
  deploy/             The one-command deploy behind `pnpm run deploy`
docs/
  deploy.md           Deploying, from CI too
  budget.md           What each service costs against the $5 plan
  payments.md         Selling a plan with Whop
  organizations.md    Organizations, roles, invitations and teams
```

Internal packages export their TypeScript source directly (`"exports": "./src/index.ts"`),
so there is no build step between packages: Wrangler and Vitest bundle them as-is.

## Local development

Requires Node.js 22.18+ (see `.nvmrc`) and pnpm 10 (`corepack enable`).

```sh
pnpm install
cp apps/api/.dev.vars.example apps/api/.dev.vars   # then set BETTER_AUTH_SECRET
pnpm dev          # API on http://localhost:8787, web app on http://localhost:3000
```

Open http://localhost:3000, create an account and upload a file. It shows as processing until
a queued job checksums it, and the change is pushed to every open tab over a WebSocket. The whole
stack (D1, KV, R2, Queues, Durable Objects, rate limiting) runs locally in `workerd`, with no
Cloudflare account needed until you deploy. Emails aren't sent locally: the API prints them,
links included, in its terminal.

For the mobile app, run the API on your network and start Metro in another terminal, then open
the app in Expo Go or a simulator (details in [apps/mobile/README.md](apps/mobile/README.md)):

```sh
pnpm --filter @bismillah/api dev --ip 0.0.0.0
pnpm --filter @bismillah/mobile start
```

| Command               | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `pnpm dev`            | Runs all apps in dev mode (`wrangler dev` / Vite + `workerd`)      |
| `pnpm build`          | Builds every app (the web Worker and assets, the mobile JS bundles) |
| `pnpm typecheck`      | Type-checks every package                                          |
| `pnpm lint`           | Biome lint + format check, then the Wrangler config check          |
| `pnpm format`         | Applies Biome formatting and safe fixes                            |
| `pnpm test`           | Runs every test suite; Worker tests run inside `workerd`           |
| `pnpm typegen`        | Regenerates Worker types and the API's RPC types (`dist/types`)    |
| `pnpm check:wrangler` | Verifies every Worker matches `tooling/wrangler/base.jsonc`        |
| `pnpm fix:wrangler`   | Writes the shared Wrangler defaults into every Worker config       |
| `pnpm run deploy`     | Provisions, migrates and deploys everything ([docs/deploy.md](docs/deploy.md)) |
| `pnpm deploy:dry-run` | Builds and bundles every Worker for deploy without uploading       |

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
