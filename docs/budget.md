# Staying within the $5 plan

Everything in this repo runs on one Cloudflare account on the
[Workers Paid plan](https://developers.cloudflare.com/workers/platform/pricing/): $5/month, with a
monthly allowance for each service. Past an allowance you pay per unit; nothing stops working.
This page shows what each part of the app spends, and a worked example of an app with
**3,000 daily active users** that stays inside the allowances.

Prices and allowances are from Cloudflare's pricing pages as of September 2026. Check them before
you rely on the numbers.

## What the plan includes

| Service | Included each month | Past that | Used for |
| ------- | ------------------- | --------- | -------- |
| Workers requests | 10M | $0.30 / million | Both Workers: every API call, page render, WebSocket connect, queue batch and cron run |
| Workers CPU time | 30M ms | $0.02 / million ms | Same |
| Static assets | Unlimited, free | – | The web app's JS, CSS, images and fonts |
| Workers Logs | 20M events | $0.60 / million | `observability` in both `wrangler.jsonc` files |
| KV reads | 10M | $0.50 / million | Session lookup on each authenticated API call |
| KV writes | 1M | $5.00 / million | Sign-in, session refresh, sign-out, cache misses |
| KV storage | 1 GB | $0.50 / GB-month | Sessions |
| D1 rows read | 25 billion | $0.001 / million | Users, accounts, upload metadata |
| D1 rows written | 50M | $1.00 / million | Same |
| D1 storage | 5 GB | $0.75 / GB-month | Same |
| R2 storage | 10 GB | $0.015 / GB-month | Uploaded files |
| R2 Class A (writes) | 1M | $4.50 / million | One per upload |
| R2 Class B (reads) | 10M | $0.36 / million | Checksum job, downloads |
| R2 egress | Free | – | Downloads |
| Queues | 1M operations | $0.40 / million | One message per upload; each costs 3 operations (write, read, delete) |
| Durable Objects requests | 1M | $0.15 / million | WebSocket connects and published events |
| Durable Objects duration | 400K GB-s | $12.50 / million GB-s | Only while handling a request; idle sockets hibernate |
| Cron Triggers | Free | – | The hourly cleanup |
| Rate limiting binding | Free | – | Sign-in and sign-up throttling |
| Email Sending | 3,000 emails | $0.35 / 1,000 | Verification, password reset and password-changed emails |
| Custom domains, TLS | Free | – | `api.` and `app.` |

R2 is billed on the same account but has its own [free tier](https://developers.cloudflare.com/r2/pricing/),
which is what the R2 rows show.

## What each action costs

| Action | Workers | KV | D1 | R2 | Queues | Durable Objects |
| ------ | ------- | -- | -- | -- | ------ | --------------- |
| Sign up | 1 request + a share of a queue batch, password hashing | 1–2 writes | a few rows | – | 3 operations (+ 1 email) | – |
| Password reset | 2 requests + a share of 2 queue batches | 1–2 writes | a few rows | – | 6 operations (+ 2 emails) | – |
| Web page load | 1 request (assets free) | – | – | – | – | – |
| Authenticated API call | 1 request | 1 read | a few indexed rows | – | – | – |
| Sign in | 1 request, most CPU of any call (password hashing) | 1–2 writes | a few rows | – | – | – |
| Upload a file | 1 request + a share of a queue batch | 1 read | ~3 rows written | 1 Class A + 1 Class B | 3 operations | 2 requests (created, processed) |
| Open the realtime socket | 1 request | 1 read | – | – | – | 1 request |
| Create or switch organization | 1 request | 1 read, 1 write | a few rows | – | – | – |
| Invite to an organization | 1 request + a share of a queue batch | 1 read | a few rows | – | 3 operations (+ 1 email) | – |
| Whop checkout | 1 request + 1 outbound fetch | 1 read | – | – | – | – |
| Whop webhook | 1 request | – | 1–2 rows read, 1 written | – | – | 1 request |
| Hourly cron | 1 request | – | 4 indexed queries | – | up to 100 retries | – |

Every Worker invocation writes one log event, plus one per `console.log`.

## Worked example: 3,000 daily active users

Assumptions, per user per day: 5 page loads, 30 API calls, 3 app opens (each opening a
WebSocket), 2 file uploads averaging 100 KB, 1 download. Sessions last 7 days and refresh daily. Each day
40 people sign up and 10 reset their password.
CPU time is an estimate: 5 ms per API call, 15 ms per page render, 100 ms per sign-in. Months are
30 days.

| Service | Monthly use | Included | Share |
| ------- | ----------- | -------- | ----- |
| Workers requests | 2.7M API + 0.27M sockets + 0.45M pages + ~0.02M queue/cron ≈ **3.4M** | 10M | 34% |
| Workers CPU time | 13.5M + 6.75M + 1.3M (sign-ins) + jobs ≈ **22M ms** | 30M ms | 73% |
| Workers Logs | ≈ **3.5M** events | 20M | 18% |
| KV reads | ≈ **3.0M** | 10M | 30% |
| KV writes | 90K refreshes + 13K sign-ins ≈ **0.1M** | 1M | 10% |
| D1 rows read | ≈ **20M** (paged, indexed lists) | 25B | <1% |
| D1 rows written | ≈ **1M** | 50M | 2% |
| R2 Class A | **180K** | 1M | 18% |
| R2 Class B | 180K checksums + 90K downloads ≈ **270K** | 10M | 3% |
| R2 storage | grows by **18 GB** a month | 10 GB | see below |
| Queues | (180K uploads + 1.8K emails) × 3 ≈ **545K** operations | 1M | 55% |
| Durable Objects requests | 270K connects + 360K events ≈ **630K** | 1M | 63% |
| Durable Objects duration | a few thousand GB-s | 400K GB-s | ~1% |
| Email Sending | 1,200 verifications + 600 reset and password-changed ≈ **1,800** emails | 3,000 | 60% |

Everything but R2 storage fits in the $5. R2 storage is the one number that only goes up: at
18 GB a month, the second month costs about $0.25 extra and the sixth about $1.35. Delete files
you don't need, or cap `MAX_UPLOAD_BYTES` in `apps/api/wrangler.jsonc`.

**What runs out first**: CPU time, then Durable Object requests, then Email Sending, then Queue
operations. Doubling this example to 6,000 daily users goes over on those four, and costs about
$1 on top of the $5 (about $0.30 of it CPU time, $0.21 of it email). Email scales with sign-ups,
not with daily users, so a launch day is what to watch.

## Why it stays cheap

These choices in the code keep the numbers above low. Keep them in mind when you add features.

- **Static assets never invoke the web Worker** (`apps/web`). Only the HTML render counts as a
  request; data loads from the browser straight to the API, so the web Worker never proxies.
- **Sessions live in KV, not D1** (`apps/api/src/auth.ts`). KV includes 10M reads, and a session
  lookup is one read. The trade-off: a sign-out can take up to ~60 s to reach other locations.
- **Throttling uses the free rate limiting binding** (`AUTH_RATE_LIMITER`), not Better Auth's
  own limiter, which would cost a KV or D1 write per request.
- **Uploads stream to R2** and are never buffered or re-read by the API route. R2 egress is free.
- **One queue message per upload, in batches of 10** (`apps/api/wrangler.jsonc`). A batch is
  one Worker invocation, not ten.
- **Emails go through the queue** (`apps/api/src/email/`), in the same batches as other jobs,
  and only the three auth emails are sent. Sends to addresses you've verified in Email
  Routing are free and don't count toward the 3,000.
- **Retries are bounded**: a message is retried 3 times, and the hourly sweep re-enqueues at most
  100 stuck uploads, so a bug can't loop through your Queues allowance.
- **WebSockets hibernate** (`apps/api/src/realtime/`). An idle connection costs no Durable Object
  duration, and one object per user means no fan-out across users.
- **Every D1 query is indexed**, and lists are paged with a cursor, so rows read stay near rows
  returned.
- **Paid status is a D1 row, not a call to Whop** (`apps/api/src/billing/`). Whop's webhook
  writes it once per change, and checking it is one indexed read.
- **Cron Triggers, rate limiting, custom domains and TLS are free.**

## Keeping an eye on it

- **Billing → Billable Usage** in the Cloudflare dashboard shows each service against its
  allowance for the current month.
- Set a **usage notification** under Notifications → "Usage Based Billing" so you get an email
  before a service crosses its allowance.
- **Workers Logs** can be sampled if logs ever become the cost: lower `head_sampling_rate` in
  a Worker's `wrangler.jsonc`. It is `1` (log everything) by default, which the example above
  fits comfortably.
- For D1, `pnpm --filter @bismillah/api exec wrangler d1 insights bismillah --sort-by reads` lists
  the queries reading the most rows.

## Adding to it

When you add a feature, add its row to "What each action costs". The expensive surprises are
usually:

- **KV writes** ($5 per million past 1M): don't write on every request; cache only data read far
  more often than it changes (`apps/api/src/lib/cache.ts`).
- **Unindexed D1 queries**: a full scan counts every row it reads.
- **Chatty Durable Objects**: incoming WebSocket messages count as requests (20 messages bill
  as 1), and anything that keeps an object from hibernating bills duration.
- **Server-side fetches from the web Worker** to the API: each is a second billed request plus
  CPU in both Workers. Fetch from the browser, or use a service binding.
