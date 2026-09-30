import type { Auth, AuthSession } from "./auth.ts";
import type { Db } from "./db/index.ts";

/** Hono generics shared by every route. */
export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Db;
    auth: Auth;
    user: AuthSession["user"] | null;
    session: AuthSession["session"] | null;
  };
};

/** Variables after `requireAuth` has run. */
export type AuthedEnv = AppEnv & {
  Variables: {
    user: AuthSession["user"];
    session: AuthSession["session"];
  };
};

// Optional secrets aren't in wrangler.jsonc's `secrets.required`, so `wrangler types` doesn't
// know them. Payments stay off until they're set (see docs/payments.md).
declare global {
  interface Env {
    /** Whop company API key, for creating checkouts. */
    WHOP_API_KEY?: string;
    /** Signing secret of the Whop webhook pointed at `/webhooks/whop` (`ws_…`). */
    WHOP_WEBHOOK_SECRET?: string;
  }
}
