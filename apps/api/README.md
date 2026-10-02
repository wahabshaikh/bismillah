# @bismillah/api

The API Worker: [Hono](https://hono.dev) on Cloudflare Workers, with
[D1](https://developers.cloudflare.com/d1/) + [Drizzle](https://orm.drizzle.team) for data,
[Better Auth](https://www.better-auth.com) for accounts, KV for sessions and caching, R2
for file uploads, [Queues](https://developers.cloudflare.com/queues/) and
[Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) for
background work, a [Durable Object](https://developers.cloudflare.com/durable-objects/)
for realtime events over WebSockets, and
[Cloudflare Email Service](https://developers.cloudflare.com/email-service/) for transactional
email.

## Local development

```sh
cp .dev.vars.example .dev.vars   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm dev                         # applies migrations to the local D1, then wrangler dev on :8787
```

Everything runs locally in `workerd`: D1, KV, R2, the queue, the Durable Object and the rate
limiter are simulated under
`.wrangler/state`, so no Cloudflare account is needed until you deploy.

```sh
curl -c jar -X POST localhost:8787/api/auth/sign-up/email \
  -H 'content-type: application/json' \
  -d '{"email":"me@example.com","password":"a-long-password","name":"Me"}'
curl -b jar localhost:8787/v1/me
curl -b jar -X POST 'localhost:8787/v1/uploads?filename=notes.txt' \
  -H 'content-type: text/plain' --data-binary @notes.txt
```

## Routes

| Route                          | Auth | What it does                                                 |
| ------------------------------ | ---- | ------------------------------------------------------------ |
| `GET /health`                  | no   | Liveness check                                               |
| `/api/auth/*`                  | -    | Better Auth: `sign-up/email`, `sign-in/email`, `sign-out`, `get-session`, `verify-email`, `request-password-reset`, `reset-password`, ... |
| `GET /v1/me`                   | yes  | The signed-in user and session                               |
| `POST /v1/uploads?filename=`   | yes  | Streams the raw request body into R2 (needs `Content-Length`) |
| `GET /v1/uploads`              | yes  | Your uploads, newest first (`?limit=` and `?before=` cursor) |
| `GET /v1/uploads/:id`          | yes  | Upload metadata                                              |
| `GET /v1/uploads/:id/content`  | yes  | Downloads the file (always as an attachment)                 |
| `DELETE /v1/uploads/:id`       | yes  | Deletes the file and its metadata                            |
| `GET /v1/events`               | yes  | WebSocket upgrade: streams your realtime events as JSON      |
| `GET /v1/billing`              | yes  | Your plan: `{ enabled, active, subscription }`               |
| `POST /v1/billing/checkout`    | yes  | A Whop checkout URL for `WHOP_PLAN_ID` (`{ returnUrl? }`)    |
| `GET /v1/organization`         | yes  | The active organization and your roles in it                 |
| `POST /webhooks/whop`          | signed | Whop membership webhooks, verified with `WHOP_WEBHOOK_SECRET` |

Sessions are cookies, so browser clients call the API with `credentials: "include"` from an
origin listed in `TRUSTED_ORIGINS`. The mobile app uses Better Auth's
[Expo client](https://www.better-auth.com/docs/integrations/expo), which keeps the session
cookie in the device's secure storage, sends it as a `Cookie` header, and names the app's URL
scheme (`bismillah://`) in an `expo-origin` header. `src/lib/expo-origin.ts` checks that
scheme against `TRUSTED_ORIGINS` like a browser origin. `AppType` from `src/app.ts` types the `/v1` routes for
Hono's RPC client: `pnpm types` emits it as declarations to `dist/types` (exported as
`@bismillah/api/app`), and [`@bismillah/api-client`](../../packages/api-client) wraps it for the
web and mobile apps. Turborepo runs `types` before any dependent package type-checks.

## Layout

```
src/
  index.ts              Worker entry
  app.ts                Hono app: middleware, CORS, error handling, route mounting
  auth.ts               Better Auth config (D1 via Drizzle, sessions in KV)
  lib/expo-origin.ts    Lets the mobile app's URL scheme pass Better Auth's origin check
  db/schema.ts          Drizzle schema: Better Auth and organization tables, uploads, subscriptions
  lib/kv-storage.ts     Better Auth secondary storage on KV
  lib/cache.ts          `cached()` read-through KV cache helper
  middleware/           Session loading, requireAuth, requireOrganization, per-IP rate limiting
  routes/uploads.ts     R2 uploads
  routes/events.ts      WebSocket endpoint for realtime events
  routes/billing.ts     Plan status and Whop checkout
  routes/organization.ts  The active organization (example of an org-scoped route)
  routes/webhooks.ts    Whop webhook: keeps the `subscription` table in sync
  billing/              Whop API calls and signature checks, `requireSubscription`
  jobs/index.ts         Job types, `enqueue()` and the queue consumer
  jobs/process-upload.ts  Post-upload job: checksums the file, marks it ready
  jobs/scheduled.ts     Hourly cron: cleans up expired rows, retries lost jobs
  realtime/             `UserEvents` Durable Object and `publish()`
  email/send.ts         `sendEmail()`: Email Service binding, or a log line when EMAIL_FROM is empty
  email/templates.ts    The emails, as plain functions returning HTML and text
migrations/             SQL generated by drizzle-kit, applied by wrangler
test/                   Vitest suites running inside workerd with real bindings
```

## Background jobs and realtime

An upload returns as soon as the file is in R2, with `status: "processing"`. Then:

1. The route enqueues an `upload.process` job on the `JOBS` queue and publishes
   `upload.created` to the user's `UserEvents` Durable Object.
2. The queue consumer (`queue()` in `src/index.ts`, same Worker) streams the file back out of R2,
   stores its SHA-256 and `processedAt` in D1, and publishes `upload.processed`.
3. `UserEvents` sends each event to every WebSocket the user has open on `GET /v1/events`, so
   every tab and device updates without polling. Deleting an upload publishes `upload.deleted`.

**Adding a job:** add a variant to `Job` in `src/jobs/index.ts` and a case to `run()`, then call
`enqueue(env, { type: ..., ... })`. Messages are delivered at least once, so make jobs safe to run
twice (`processUpload` checks `processedAt` first). A job that throws is retried after
30s, 60s and 90s, then dropped.

**Scheduled work:** the Cron Trigger in `wrangler.jsonc` runs `src/jobs/scheduled.ts` hourly. It
deletes expired verification tokens (Better Auth never does), deletes expired D1 sessions if you
store them there, and re-enqueues uploads still unprocessed after 15 minutes, which covers a
failed `send()` or a job that ran out of retries. Locally, trigger it with
`curl localhost:8787/cdn-cgi/local/scheduled`.

**Realtime:** there is one `UserEvents` object per user, and anything on the server can call
`publish(env, userId, event)`; add event types to `UserEvent` in `src/realtime/events.ts`. The
object uses the [WebSocket Hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/),
so it is evicted from memory between events while sockets stay open. Clients send `ping`
every 45 seconds, which the runtime answers with `pong` without waking the object. CORS doesn't
cover WebSockets, so `src/routes/events.ts` checks the `Origin` against `TRUSTED_ORIGINS`
itself. [`subscribeToEvents`](../../packages/api-client/src/events.ts) in the API client handles
the URL, keepalive and reconnects for the web and mobile apps.

## Transactional email

Better Auth sends three emails, all rendered in `src/email/templates.ts`:

| Email | When |
| ----- | ---- |
| Confirm your email | On sign-up. The link hits `/api/auth/verify-email`, marks the address verified and redirects to the `callbackURL` the client passed (the web app sends its dashboard). |
| Reset your password | `POST /api/auth/request-password-reset` with `{ email, redirectTo }`. The link checks the token, then redirects to `redirectTo?token=...`, where the client calls `reset-password`. The web app's pages are `/forgot-password` and `/reset-password`. |
| Your password was changed | After a reset. Resetting also signs the user out everywhere else. |

Nothing is sent from the request itself: the auth callback enqueues an `email.send` job, and
the queue consumer calls `sendEmail()`, so a slow or failing send never delays the response
and is retried like any job. Sign-up still signs the user in straight away; set
`requireEmailVerification: true` in `src/auth.ts` to block sign-in until the address is
confirmed.

**Locally**, `EMAIL_FROM` is empty, so `sendEmail()` prints each email to the `wrangler dev`
terminal instead of sending it. Copy the link from there to verify an address or reset a
password. To send real email while developing, set `EMAIL_FROM` in `.dev.vars` to an address
on a domain onboarded to Email Service and add `"remote": true` to the `send_email` binding
in `wrangler.jsonc`.

**In production**, `pnpm run deploy --domain example.com` turns on Email Sending for the
domain and sets `EMAIL_FROM` to `noreply@example.com` (override it with the `EMAIL_FROM`
environment variable). On `workers.dev` there's no domain to send from, so emails stay logged.
Sending needs the domain's SPF, DKIM and DMARC records, which you can check under
**Email Service → Email Sending** in the dashboard or with
`pnpm exec wrangler email sending dns get example.com`.

**Adding an email:** add a function to `src/email/templates.ts` and call
`enqueue(env, { type: "email.send", email: yourEmail(...) })`.

## Organizations

Better Auth's organization plugin serves `/api/auth/organization/*`: create organizations,
invite by email, manage roles and teams. Put `requireOrganization()` from
`src/middleware/organization.ts` after `requireAuth` to scope a route to the session's active
organization, optionally to some roles. Details: [docs/organizations.md](../../docs/organizations.md).

## Payments

Optional, with [Whop](https://whop.com): set `WHOP_PLAN_ID`, `WHOP_API_KEY` and
`WHOP_WEBHOOK_SECRET` and users can buy a plan from the web and mobile apps. Put
`requireSubscription` from `src/billing/subscription.ts` after `requireAuth` to make a route
paid-only. Setup and details: [docs/payments.md](../../docs/payments.md).

## Database changes

1. Edit `src/db/schema.ts`.
2. `pnpm db:generate` writes a new SQL file to `migrations/`.
3. `pnpm db:migrate:local` applies it locally (`pnpm dev` and the tests do this for you).

Adding Better Auth plugins that need tables? Add their tables to `src/db/schema.ts` the same way.

## Deploying

Run `pnpm run deploy` from the repo root. It creates the D1 database, applies migrations, turns
on Email Sending for your domain, sets `BETTER_AUTH_SECRET`, points `BETTER_AUTH_URL`,
`TRUSTED_ORIGINS` and `EMAIL_FROM` at production and deploys this Worker, then the web app. See [docs/deploy.md](../../docs/deploy.md).

Bindings in `wrangler.jsonc` have no resource IDs: Wrangler finds the D1 database, R2 bucket and
queue by name, creates any that are missing on deploy (the KV namespace too), and remembers them
on the deployed Worker. The Durable Object class is created by the `migrations` block, and the
Cron Trigger is registered on every deploy.

To deploy only this Worker after the first full deploy, `pnpm run deploy` here applies new
migrations and runs `wrangler deploy`. It uses the `vars` in `wrangler.jsonc`, so pass
`--var BETTER_AUTH_URL:… --var TRUSTED_ORIGINS:…` or use the root command, which sets them.

## Staying inside the $5/month plan

[docs/budget.md](../../docs/budget.md) has the whole-app picture with a worked example. The design choices here exist to keep a typical app within what the
[Workers Paid plan](https://developers.cloudflare.com/workers/platform/pricing/) includes:

| Resource | Included monthly                                          | How this app uses it                                           |
| -------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Workers  | 10M requests, 30M CPU ms                                  | One Worker; Better Auth is built once per isolate, not per request |
| KV       | 10M reads, 1M writes                                      | One read per authenticated request (the session); writes only on sign-in, refresh and sign-out |
| D1       | 25B rows read, 50M rows written, 5 GB                     | Users, accounts, verification tokens, upload metadata; every query is indexed |
| R2       | 10 GB, 1M Class A, 10M Class B ops, free egress ([R2 free tier](https://developers.cloudflare.com/r2/pricing/)) | Uploads stream straight through; one write per upload, one read per download |
| Queues   | 1M operations (about 333K messages: write, read, delete)  | One message per upload, plus hourly retries of stuck uploads (at most 100) |
| Durable Objects | 1M requests, 400K GB-s                             | One request per WebSocket connection and per event published; hibernation means idle sockets cost no duration |
| Cron Triggers | Free                                                  | One hourly run: three indexed D1 deletes/selects               |
| Rate limiting | Free                                                  | 10 auth writes per IP per minute, before anything touches D1   |

Trade-offs worth knowing:

- **KV is eventually consistent.** A sign-out is immediate where it happened, but another
  Cloudflare location can keep accepting that session for up to about 60 seconds. If you need
  instant global revocation, set `session.storeSessionInDatabase` in `src/auth.ts` and read from D1.
- **Verification tokens live in D1**, because KV cannot atomically read-and-delete them.
- **Better Auth's own rate limiter is off**, since it would cost a KV or D1 write per request;
  the `AUTH_RATE_LIMITER` binding does the job for free. Its counters are per location.
- **Each upload costs 3 queue operations and 2 Durable Object requests** (`upload.created`,
  `upload.processed`), plus one Worker invocation for the consumer batch. That is roughly 300K
  uploads a month before Queues bills anything, and the Durable Object budget covers about 500K.
  Publishing wakes the object even when nobody is connected; if that matters at your scale, skip
  `publish()` for events nobody needs live.
- **Realtime events are fire-and-forget.** Clients that were offline miss them, which is why the
  web app refetches its list after reconnecting. Keepalive pings go to the runtime's auto-response,
  so an idle tab costs neither duration nor wake-ups, and each user is capped at 20 open sockets.
- **Uploads go through the Worker**, capped by `MAX_UPLOAD_BYTES` (10 MiB by default; Workers
  accept request bodies up to 100 MB). For bigger files, switch to presigned R2 URLs, which need
  R2 API tokens.
