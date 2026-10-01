# Payments with Whop

The starter sells one plan through [Whop](https://whop.com): a signed-in user presses
**Upgrade**, pays on Whop's hosted checkout, and comes back to the app with their plan active.
Whop handles cards, taxes, receipts, renewals and cancellations; the API keeps a copy of each
user's membership in D1, updated by Whop's webhook, so checking whether someone has paid is one
indexed D1 read and never a call to Whop.

Payments are off until you set them up. Without the settings below, the plan card doesn't show
and `POST /v1/billing/checkout` answers 503.

## How it works

```
Web / mobile                API Worker                           Whop
------------                ----------                           ----
Upgrade  ─────────────────▶ POST /v1/billing/checkout
                            creates a checkout, metadata
                            { user_id } ───────────────────────▶ checkout_configurations
         ◀───────────────── { url }  ◀──────────────────────────  purchase_url
opens url ─────────────────────────────────────────────────────▶ buyer pays
                            POST /webhooks/whop ◀──────────────  membership.activated
                            verify signature, upsert the
                            `subscription` row, publish
         ◀───────────────── billing.updated (WebSocket)
```

- **Checkout** (`apps/api/src/routes/billing.ts`): creates a Whop checkout configuration for
  `WHOP_PLAN_ID` with `metadata: { user_id }`. Whop copies that metadata onto the membership,
  which is how the webhook knows which user paid. `returnUrl` sends the buyer back to the app
  and must be on an origin in `TRUSTED_ORIGINS` (the web app, or the mobile app's scheme).
- **Webhook** (`apps/api/src/routes/webhooks.ts`): checks the
  [Standard Webhooks](https://www.standardwebhooks.com) signature with WebCrypto (no SDK in the
  bundle), rejects anything older than 5 minutes, and upserts the membership into the
  `subscription` table. Whop's `updated_at` decides which delivery wins, so retries and
  out-of-order deliveries are safe. It handles `membership.activated`,
  `membership.deactivated` and `membership.cancel_at_period_end_changed`, and answers 200 to
  everything else. Memberships bought outside the app's checkout have no `user_id` and are
  ignored.
- **Status** (`GET /v1/billing`): `{ enabled, active, subscription }`. The web dashboard shows
  it in a plan card and refreshes it when the `billing.updated` event arrives over the
  realtime socket; the mobile app shows the same card and refreshes after checkout closes.

## Gating a feature

`requireSubscription` (`apps/api/src/billing/subscription.ts`) answers 402 unless the user's
membership grants access. Put it after `requireAuth`:

```ts
import { requireSubscription } from "../billing/subscription.ts";

export const reports = new Hono<AuthedEnv>().use(requireSubscription).get("/", (c) => ...);
```

These Whop statuses grant access: `active`, `trialing`, `past_due` (Whop's grace period after a
failed renewal), `canceling` (canceled, but paid until the period ends) and `completed` (a
finished one-time purchase). `canceled`, `expired` and the rest don't. Change `ENTITLED` in the
same file if your rules differ; in the clients, `data.active` from `GET /v1/billing` follows
the same rule.

## Setting it up

1. **Create the product and plan.** In the Whop dashboard, create a product, then a plan for it
   (monthly, yearly or one-time). Copy the plan ID, `plan_…`.
2. **Create an API key.** In your business dashboard's developer settings, create a company API
   key that can create checkout configurations and read memberships.
3. **Add the webhook.** In the same settings, add a webhook for
   `https://api.<your-domain>/webhooks/whop` (the deploy prints it) that sends `v1` payloads
   and at least the `membership.activated`, `membership.deactivated` and
   `membership.cancel_at_period_end_changed` events. Copy its secret, `ws_…`.
4. **Deploy with them** (`WHOP_PLAN_ID` is a plain variable, the other two are secrets):

   ```sh
   WHOP_PLAN_ID=plan_… WHOP_API_KEY=… WHOP_WEBHOOK_SECRET=ws_… pnpm run deploy
   ```

   Or put `WHOP_PLAN_ID` in `apps/api/wrangler.jsonc` and set the secrets once with
   `pnpm --filter @bismillah/api exec wrangler secret put WHOP_API_KEY` (and
   `WHOP_WEBHOOK_SECRET`).

To try it without real money, use Whop's sandbox: create the plan, key and webhook there and set
`WHOP_API_URL` to `https://sandbox-api.whop.com/api/v1` in `apps/api/wrangler.jsonc`.

### Locally

Put the three values in `apps/api/.dev.vars` (see `.dev.vars.example`) and run `pnpm dev`.
Wrangler only reads the secrets listed in `secrets.required` from `.dev.vars`, so the API's
dev script (`apps/api/scripts/dev.ts`) passes the two optional Whop secrets along itself.
For webhooks to reach `localhost:8787`, expose it with a tunnel, for example
`cloudflared tunnel --url http://localhost:8787`, and register the tunnel's URL plus
`/webhooks/whop` as a webhook in your sandbox.

## Managing a subscription

Whop owns cancellations, card changes and refunds. When the webhook includes the membership's
`manage_url`, the plan card links to it as **Manage billing**; otherwise buyers manage their
membership from their Whop account, and Whop emails them links with each receipt. Every change
there comes back through the webhook.

## Mobile app stores

Apple and Google restrict selling digital content or subscriptions in an app through an
external checkout, and the rules differ by country. The mobile app shows the plan everywhere,
but check the current App Store and Google Play rules for your markets before shipping its
**Upgrade** button; removing it leaves the plan status in place, and users can still subscribe
on the web.

## What it costs

A checkout is one API request and one outbound `fetch` to Whop. A webhook delivery is one
request, one or two indexed D1 reads and one row written, plus one Durable Object request for
the realtime event. At 3,000 daily users that's a few thousand of each a month, well under 1%
of every allowance in [budget.md](budget.md). Whop's own fees are separate and come out of each
payment.
