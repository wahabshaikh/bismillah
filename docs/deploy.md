# Deploying

One command takes a fresh clone to a running API, web app and database on your Cloudflare
account:

```sh
pnpm run deploy
```

(`pnpm deploy` without `run` is a different, built-in pnpm command.)

## Before you start

- A Cloudflare account on the [Workers Paid plan](https://developers.cloudflare.com/workers/platform/pricing/)
  ($5/month). See [budget.md](budget.md) for what that covers.
- A domain on that account, for example `example.com`, if you want sign-in to work in the web
  app. The script puts the API on `api.example.com` and the web app on `app.example.com`. They
  need to share a site because the browser only sends the API's session cookie to pages on the
  same site. Without a domain, everything deploys to `*.workers.dev`: the API and mobile app
  work, but the web app can't keep you signed in there.

You don't need to create anything in the dashboard first.

## What it does

| Step | What happens | Re-runs |
| ---- | ------------ | ------- |
| 1. Sign in | Runs `wrangler login` if you aren't signed in, and asks which account to use if you have several. | Skipped once signed in |
| 2. Domain | Asks for your domain, or uses `--domain`, `--workers-dev` or `DEPLOY_DOMAIN`. Your answer is saved in `.deploy.json` (gitignored). | Uses the saved answer |
| 3. Database | Creates the D1 database named in `apps/api/wrangler.jsonc` if it doesn't exist. | No-op |
| 4. Migrations | `wrangler d1 migrations apply DB --remote`, before any new code ships. Wrangler shows the pending migrations and asks you to confirm. | Applies only new ones |
| 5. Secrets | Checks every name under `secrets.required` in `apps/api/wrangler.jsonc`. For each missing one, it uses the environment variable of the same name, or asks you to paste a value (Enter generates a random one, which is right for `BETTER_AUTH_SECRET`). | Skipped once set |
| 6. API | `wrangler deploy` with `BETTER_AUTH_URL` and `TRUSTED_ORIGINS` set for production and the `api.` custom domain attached. On the first deploy Wrangler creates the KV namespace, R2 bucket and queue, registers the Durable Object class and the hourly Cron Trigger. | Updates in place |
| 7. Web app | Builds with `VITE_API_URL` pointing at the API, then deploys with the `app.` custom domain. | Updates in place |

It prints the URLs at the end, plus the `EXPO_PUBLIC_API_URL` to build the mobile app with.

`TRUSTED_ORIGINS` in production is the web app's origin plus the mobile app's scheme from
`apps/mobile/app.json` (`bismillah://`). `exp://`, which only Expo Go uses, stays local.

Secrets never touch disk in the repo: they are written to a temporary file readable only by you,
passed to `wrangler deploy --secrets-file`, and deleted right after.

## Options

```sh
pnpm run deploy --domain example.com   # use (and remember) this domain
pnpm run deploy --workers-dev          # use *.workers.dev instead
pnpm run deploy --dry-run              # build and bundle everything, upload nothing
pnpm run deploy --help
```

CI runs `pnpm deploy:dry-run` on every pull request, so a change that breaks bundling fails
before it reaches your account.

## Deploying from CI

The script never prompts when it isn't attached to a terminal. Give it everything up front:

| Variable | Needed |
| -------- | ------ |
| `CLOUDFLARE_API_TOKEN` | Always. Give it Edit on Workers Scripts, Workers KV, Workers R2, D1 and Queues for the account, and Workers Routes plus DNS on your domain's zone. |
| `CLOUDFLARE_ACCOUNT_ID` | Always |
| `DEPLOY_DOMAIN` | Unless you want `*.workers.dev` |
| `BETTER_AUTH_SECRET` | First deploy only (or whenever a required secret is missing) |

```yaml
# .github/workflows/deploy.yml (example)
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/action-setup@v6
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          DEPLOY_DOMAIN: example.com
```

## The mobile app

The app ships through the app stores, not Cloudflare, so the script doesn't build it. Build it
with the API URL the script printed:

```sh
EXPO_PUBLIC_API_URL=https://api.example.com npx eas-cli build
```

See [apps/mobile/README.md](../apps/mobile/README.md#shipping-to-the-stores) for the rest of the release checklist.

## Resource names

| Resource | Name | Defined in |
| -------- | ---- | ---------- |
| API Worker | `bismillah-api` | `apps/api/wrangler.jsonc` → `name` |
| Web Worker | `bismillah-web` | `apps/web/wrangler.jsonc` → `name` |
| D1 database | `bismillah` | `d1_databases[0].database_name` |
| R2 bucket | `bismillah-uploads` | `r2_buckets[0].bucket_name` |
| Queue | `bismillah-jobs` | `queues` |
| KV namespace | `bismillah-api-kv` | created by Wrangler from the Worker and binding names |
| Durable Object | `UserEvents` | `durable_objects`, `migrations` |

Rename them before your first deploy if you want your own names. After that, renaming creates a
new, empty resource.

## Troubleshooting

- **"Couldn't find … workers.dev URL"**: workers.dev is turned off for the Worker. Deploy with
  `--domain`, or turn it on under the Worker's Settings → Domains & Routes.
- **Custom domain errors**: the domain has to be an active zone on the same Cloudflare account.
  `api.` and `app.` must not already have DNS records pointing elsewhere.
- **A step fails halfway**: fix the cause and run the command again. Every step checks what
  already exists, so re-running is safe.
- **Starting over**: delete the Workers, database, bucket, queue and KV namespace in the
  dashboard, then delete `.deploy.json`.
